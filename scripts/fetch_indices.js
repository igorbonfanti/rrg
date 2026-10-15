#!/usr/bin/env node
/*
 * fetch_indices.js — aggiornamento serale della pagina Indici (data/indices.json, formato in js/indexdata.js).
 *
 *  1. Liste dei membri (scripts/lib/members.js). Una lista nuova si accetta solo se il numero di
 *     titoli è plausibile e almeno l'80% coincide con l'ultima lista buona; altrimenti si tiene
 *     quella. I cambi si registrano in data/index_members/<indice>.json: da qui in avanti ogni
 *     indice accumula la sua composizione storica.
 *  2. Chiusure dei membri dall'endpoint spark di Yahoo (20 simboli a richiesta, un anno di storia,
 *     rettificate per gli split e non per i dividendi) e degli indici dall'endpoint chart.
 *  3. Conteggi dei titoli sopra la media a 20/50/200 sedute, con lo stesso metodo della ricostruzione
 *     (scripts/backfill_indices.py): medie sulle sedute del titolo, ultima seduta entro 5 giorni.
 *     Una seduta si pubblica se almeno il 75% dei titoli quotati ha la chiusura di quel giorno
 *     (nello STOXX 600 le borse hanno festività diverse); le ultime 5 si ricalcolano.
 *  4. S&P 500: la breadth è la serie SPX di data/breadth.json (scripts/fetch_breadth.js), il prezzo ^GSPC.
 * Va eseguito dopo fetch_breadth.js. Lo storico iniziale viene da scripts/backfill_indices.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, parse, mapLimit } from './lib/yahoo.js';
import { SOURCES, PARSERS, parseNikkei, parseExsa, parseNasdaq } from './lib/members.js';
import { parseCSV } from './fetch_breadth.js';
import { encodeRLE, expandRLE } from '../js/signals.js';
import { decodeDates, encodeDates } from '../js/indexdata.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const RECOMPUTE = 5, STALE_DAYS = 5, MIN_FRESH = 0.75, MIN_OVERLAP = 0.8;
const UA = 'Mozilla/5.0 (sector-monitor data fetch)';
const DAY = 86400000;
const readJSON = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : d);
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// ---------- membri ----------
async function get(url, headers = {}, binary = false) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return binary ? Buffer.from(await r.arrayBuffer()) : r.text();
}
async function fetchList(k) {
  const src = SOURCES[k];
  if (src.wiki) return PARSERS[k](await get(`https://en.wikipedia.org/w/index.php?title=${src.wiki}&action=raw`));
  if (src.kind === 'nikkei') return parseNikkei(await get(src.url, {}, true));
  if (src.kind === 'exsa') return parseExsa(await get(src.url), parseCSV);
  if (src.kind === 'nasdaq') return parseNasdaq(JSON.parse(await get(src.url, src.headers)));
  return null;
}
// Lista nuova accettabile? `prev` = ultima lista buona
export function checkList(list, prev, { min, max }) {
  const problems = [];
  if (!Array.isArray(list) || !list.length) return ['lista vuota o illeggibile'];
  if (new Set(list).size !== list.length) problems.push('simboli doppi');
  if (list.length < min || list.length > max) problems.push(`${list.length} titoli (attesi ${min}-${max})`);
  if (prev && prev.length) {
    const s = new Set(list), same = prev.filter((t) => s.has(t)).length;
    if (same < prev.length * MIN_OVERLAP) problems.push(`solo ${same} titoli su ${prev.length} in comune con l'ultima lista`);
  }
  return problems;
}
async function loadMembers(k, today) {
  const file = path.join(DATA, 'index_members', k + '.json');
  const prev = readJSON(file, null);
  let fresh = null;
  try {
    const list = await fetchList(k);
    const problems = checkList(list, prev && prev.tickers, SOURCES[k]);
    if (problems.length) console.warn(`${k}: lista scartata (${problems.join('; ')}), tengo l'ultima buona`);
    else fresh = [...list].sort();
  } catch (e) {
    console.warn(`${k}: lista non disponibile (${e.message}), tengo l'ultima buona`);
  }
  if (!fresh) {
    if (!prev) throw new Error(`${k}: nessuna lista dei membri`);
    return { tickers: prev.tickers, write: null };
  }
  const out = prev ? { ...prev } : { index: k, changes: [] };
  const before = new Set(prev ? prev.tickers : []), after = new Set(fresh);
  const added = fresh.filter((t) => !before.has(t)), removed = [...before].filter((t) => !after.has(t));
  if (prev && (added.length || removed.length)) {
    out.changes = [...(prev.changes || []), { date: today, added, removed }];
    console.log(`${k}: +${added.join(' +') || '—'} / -${removed.join(' -') || '—'}`);
  }
  out.asOf = today; out.count = fresh.length; out.tickers = fresh;
  return { tickers: fresh, write: [file, out] };
}

// ---------- prezzi ----------
// Chiusure di un anno per tutti i simboli, 20 per richiesta: {simbolo: {dates, close}}
async function spark(symbols) {
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 20) chunks.push(symbols.slice(i, i + 20));
  const out = {};
  await mapLimit(chunks, 2, async (chunk) => {
    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${chunk.map(encodeURIComponent).join(',')}&range=1y&interval=1d`;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
        if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
        if (!r.ok) { console.warn(`  spark HTTP ${r.status}: ${chunk.join(',')}`); return; }
        const j = await r.json();
        for (const x of (j.spark && j.spark.result) || []) {
          const res = x.response && x.response[0];
          if (!res || !res.timestamp) continue;
          const p = parse(res);
          if (p.dates.length) out[x.symbol] = { dates: p.dates, close: p.close };
        }
        return;
      } catch (e) {
        await sleep(1000 * 2 ** attempt);
      }
    }
    console.warn(`  spark non risponde: ${chunk.join(',')}`);
  }, 300);
  return out;
}

// Simboli da riscaricare: assenti, con un buco di più di 5 giorni negli ultimi 60, o con l'ultima seduta
// più vecchia di quella della maggior parte dei titoli della stessa borsa (suffisso del simbolo)
export function needsChart(px, symbols) {
  const suffix = (s) => (s.includes('.') ? s.slice(s.lastIndexOf('.')) : '');
  const lasts = {};
  for (const s of symbols) if (px[s]) (lasts[suffix(s)] ||= []).push(px[s].dates.at(-1));
  const ref = Object.fromEntries(Object.entries(lasts).map(([k, a]) => [k, a.sort()[Math.floor(a.length / 2)]]));
  return symbols.filter((s) => {
    const p = px[s];
    if (!p || !p.dates.length) return true;
    const d = p.dates, end = d.at(-1);
    if (end < ref[suffix(s)]) return true;
    for (let i = d.length - 1; i > 0 && days(d[i], end) <= 60; i--) if (days(d[i - 1], d[i]) > STALE_DAYS) return true;
    return false;
  });
}

// Errori di scala di Yahoo, come clean() in backfill_indices.py
export function clean(dates, close) {
  let d = [], c = [];
  for (let i = 0; i < close.length; i++) {
    const a = close[i - 1], b = close[i], n = close[i + 1];
    if (i > 0 && i < close.length - 1 && ((b > 3 * a && b > 3 * n) || (3 * b < a && 3 * b < n))) continue;
    d.push(dates[i]); c.push(b);
  }
  const big = (r) => r >= 4 || r <= 0.25;
  for (let i = 1; i < c.length;) {
    const r = c[i] / c[i - 1];
    if (!big(r)) { i++; continue; }
    let back = -1;
    for (let j = i + 1; j < Math.min(c.length, i + 61); j++) {
      const q = c[j] / c[j - 1];
      if (big(q) && r * q > 0.5 && r * q < 2) { back = j; break; }
    }
    if (back >= 0) { d.splice(i, back - i); c.splice(i, back - i); }
    else { for (let j = 0; j < i; j++) c[j] *= r; i++; }
  }
  return { dates: d, close: c };
}

function sma(c, i, w) {
  if (i < w - 1) return null;
  let s = 0;
  for (let k = i - w + 1; k <= i; k++) s += c[k];
  return s / w;
}
// Conteggi di una seduta: members = membri della lista, n = quotati (ultima seduta entro 5 giorni),
// fresh = con la chiusura proprio di quel giorno
export function countDay(members, px, d) {
  const r = { members: members.length, n: 0, fresh: 0, a20: 0, a50: 0, a200: 0 };
  for (const s of members) {
    const p = px[s];
    if (!p) continue;
    let lo = 0, hi = p.dates.length - 1, j = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (p.dates[m] <= d) { j = m; lo = m + 1; } else hi = m - 1; }
    if (j < 0 || days(p.dates[j], d) > STALE_DAYS) continue;
    r.n++;
    if (p.dates[j] === d) r.fresh++;
    for (const w of [20, 50, 200]) { const v = sma(p.close, j, w); if (v != null && p.close[j] > v) r['a' + w]++; }
  }
  return r;
}

// ---------- file ----------
// Serie dell'indice in forma estesa (date, chiusure, conteggi allineati alle date dal b0)
export function expand(x) {
  const dates = decodeDates(x.d0, x.gaps), m = x.a200.length;
  return { symbol: x.symbol, dates, close: x.close.slice(), b0: x.b0, members: expandRLE(x.members, m), n: expandRLE(x.n, m), a20: x.a20.slice(), a50: x.a50.slice(), a200: x.a200.slice() };
}
export function pack(e) {
  let L = e.a200.length;
  while (L && e.a200[L - 1] == null) L--;
  return { symbol: e.symbol, ...encodeDates(e.dates), close: e.close, b0: e.b0,
    members: encodeRLE(e.members.slice(0, L)), n: encodeRLE(e.n.slice(0, L)), a20: e.a20.slice(0, L), a50: e.a50.slice(0, L), a200: e.a200.slice(0, L) };
}
// Inserisce o sostituisce le chiusure dell'indice (le date nuove vanno in ordine; i conteggi seguono)
export function mergePrices(e, dates, close) {
  for (let k = 0; k < dates.length; k++) {
    const d = dates[k], c = Math.round(close[k] * 100) / 100;
    let i = e.dates.indexOf(d);
    if (i >= 0) { e.close[i] = c; continue; }
    if (d < e.dates[0]) continue;
    i = e.dates.findIndex((x) => x > d);
    if (i < 0) i = e.dates.length;
    e.dates.splice(i, 0, d); e.close.splice(i, 0, c);
    const j = i - e.b0;
    if (j >= 0 && j <= e.a200.length) for (const key of ['members', 'n', 'a20', 'a50', 'a200']) e[key].splice(j, 0, null);
  }
}
export function setCounts(e, d, r) {
  const i = e.dates.indexOf(d);
  if (i < e.b0) return false;
  const j = i - e.b0;
  for (const key of ['members', 'n', 'a20', 'a50', 'a200']) {
    while (e[key].length <= j) e[key].push(null);
    e[key][j] = r[key];
  }
  return true;
}

async function main() {
  const cfg = readJSON(path.join(ROOT, 'config', 'indices.json')).indices;
  const file = path.join(DATA, 'indices.json');
  const data = readJSON(file, null);
  if (!data) throw new Error('manca data/indices.json: esegui prima scripts/backfill_indices.py');
  const today = new Date().toISOString().slice(0, 10);
  const keys = Object.keys(cfg).filter((k) => k !== 'SPX');

  // 1. membri (Wikipedia: una richiesta alla volta, con una pausa)
  const lists = {}, writes = [];
  for (const k of keys) {
    const { tickers, write } = await loadMembers(k, today);
    lists[k] = tickers;
    if (write) writes.push(write);
    if (SOURCES[k].wiki) await sleep(3000);
  }

  // 2. prezzi
  const symbols = [...new Set(keys.flatMap((k) => lists[k]))].sort();
  const raw = await spark(symbols);
  // spark a volte perde sedute (successo con le azioni di Varsavia): chi ha buchi recenti o è indietro
  // rispetto agli altri titoli della stessa borsa si riscarica dall'endpoint chart
  const retry = needsChart(raw, symbols);
  if (retry.length) {
    console.log(`Riscarico da chart ${retry.length} titoli con sedute mancanti in spark`);
    const res = await mapLimit(retry, 3, async (s) => { try { return await fetchDaily(s, { range: '1y', raw: true }); } catch { return null; } }, 150);
    retry.forEach((s, i) => { if (res[i] && res[i].dates.length) raw[s] = { dates: res[i].dates, close: res[i].close }; });
  }
  const px = {};
  for (const [s, p] of Object.entries(raw)) px[s] = clean(p.dates, p.close);
  console.log(`Prezzi dei membri: ${Object.keys(px).length}/${symbols.length}`);
  if (Object.keys(px).length < symbols.length * 0.8) throw new Error('troppi titoli senza prezzi: non aggiorno');
  const idx = await mapLimit(Object.keys(cfg), 2, async (k) => {
    try { return await fetchDaily(cfg[k].price, { range: '1mo', raw: true }); } catch (e) { console.warn(`  ${cfg[k].price}: ${e.message}`); return null; }
  }, 200);

  // 3. conteggi
  const breadth = readJSON(path.join(DATA, 'breadth.json'), null);
  Object.keys(cfg).forEach((k, n) => {
    if (!data.series[k] || !idx[n]) return;
    const e = expand(data.series[k]);
    mergePrices(e, idx[n].dates, idx[n].close);
    const done = [];
    if (k === 'SPX') {
      // breadth della pagina dei settori, sulle stesse sedute
      if (breadth) {
        const L = breadth.dates.length, s = breadth.series.SPX, mem = expandRLE(s.members, L), nn = expandRLE(s.n, L);
        const from = e.dates[Math.max(e.b0, e.b0 + e.a200.length - RECOMPUTE)];
        breadth.dates.forEach((d, i) => { if (d >= from && setCounts(e, d, { members: mem[i], n: nn[i], a20: s.a20[i], a50: s.a50[i], a200: s.a200[i] })) done.push(d); });
      }
    } else {
      const first = e.b0 + Math.max(0, e.a200.length - RECOMPUTE);
      for (const d of e.dates.slice(first)) {
        const r = countDay(lists[k], px, d);
        if (r.n && r.fresh >= r.n * MIN_FRESH) { setCounts(e, d, r); done.push(d); }
        else console.log(`${k} ${d}: non ancora pubblicabile (chiusure del giorno per ${r.fresh}/${r.n} titoli)`);
      }
    }
    data.series[k] = pack(e);
    console.log(`${k}: prezzo al ${e.dates.at(-1)}, breadth ricalcolata/aggiunta per ${done.length} sedute${done.length ? ` (fino al ${done.at(-1)})` : ''}`);
  });

  data.generated = new Date().toISOString();
  data.asOf = Object.values(data.series).map((x) => decodeDates(x.d0, x.gaps)[x.b0 + x.a200.length - 1]).sort().at(-1);
  writeJSON(file, data);
  for (const [f, o] of writes) writeJSON(f, o);
  console.log(`indices.json al ${data.asOf}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
