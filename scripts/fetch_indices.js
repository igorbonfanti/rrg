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
 *  5. data/capitulation.json: membri con un calo giornaliero di almeno il 5/7/10% nelle sedute pubblicate (metodo in
 *     js/capitulation.js; l'S&P 500 lo aggiorna fetch_breadth.js; fuori gli indici con "noCap" in config).
 * Va eseguito dopo fetch_breadth.js. Lo storico iniziale viene da scripts/backfill_indices.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, parse, mapLimit } from './lib/yahoo.js';
import { SOURCES, PARSERS, parseNikkei, parseExsa, parseNasdaq, parseIShares, parseB3 } from './lib/members.js';
import { parseCSV } from './fetch_breadth.js';
import { encodeRLE, expandRLE } from '../js/signals.js';
import { decodeDates, encodeDates, unpackIndex, packIndex } from '../js/indexdata.js';
import { countsOn, mergeCap } from '../js/capitulation.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
// RECOMPUTE: sedute ricalcolate a ogni corsa; a mano fino a 40 dopo una correzione (input del workflow). Con un anno
// di prezzi la media a 200 sedute c'è per circa 45 sedute, meno nelle borse con più feste: le sedute più vecchie si
// saltano comunque se troppi titoli non hanno ancora 200 chiusure (countDay, short); il 20/10/2026 un ricalcolo di 50
// sedute senza questo controllo aveva abbassato di decine di punti le sedute di inizio agosto
const RECOMPUTE = Math.max(5, Math.min(40, +process.env.RECOMPUTE || 5)), STALE_DAYS = 5, MIN_FRESH = 0.75, MIN_OVERLAP = 0.8;
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
  if (src.kind === 'ishares') return parseIShares(await get(src.url), parseCSV, !!src.foreign);
  if (src.kind === 'b3') return parseB3(JSON.parse(await get(src.url)));
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
    if (problems.length) console.log(`::warning::${k}: lista scartata (${problems.join('; ')}), tengo l'ultima buona`);
    else fresh = [...list].sort();
  } catch (e) {
    console.log(`::warning::${k}: lista non disponibile (${e.message}), tengo l'ultima buona`);
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

// Simboli da riscaricare: assenti, più indietro della maggior parte dei titoli della stessa borsa (suffisso del
// simbolo), o senza una seduta che ha la maggior parte di quei titoli. Spark perde sempre le stesse sedute di alcuni
// titoli (circa metà del Nikkei e due terzi del FTSE 100 in un anno, ottobre 2026) e chart le ha: un buco sposta
// le medie e fa coprire due sedute al rendimento dei cali forti.
export function needsChart(px, symbols) {
  const suffix = (s) => (s.includes('.') ? s.slice(s.lastIndexOf('.')) : '');
  const by = {};
  for (const s of symbols) if (px[s] && px[s].dates.length) (by[suffix(s)] ||= []).push(s);
  const ref = {}, peer = {};
  for (const [k, syms] of Object.entries(by)) {
    const a = syms.map((s) => px[s].dates.at(-1)).sort();
    ref[k] = a[Math.floor(a.length / 2)];
    const cnt = new Map();
    for (const s of syms) for (const d of px[s].dates) cnt.set(d, (cnt.get(d) || 0) + 1);
    peer[k] = [...cnt].filter(([, c]) => c >= syms.length / 2).map(([d]) => d);
  }
  return symbols.filter((s) => {
    const p = px[s];
    if (!p || !p.dates.length) return true;
    const d = p.dates, k = suffix(s);
    if (d.at(-1) < ref[k]) return true;
    const own = new Set(d);
    return peer[k].some((x) => x > d[0] && x <= d.at(-1) && !own.has(x));
  });
}

// Errori di scala di Yahoo, come clean() in backfill_indices.py. Un salto dopo almeno SUSPENDED chiusure identiche è
// la riapertura di un titolo sospeso (CTD.AX: fermo a 16,07 per 261 sedute, poi −86% il 03/09/2026) e resta com'è.
const SUSPENDED = 20;
const flatBefore = (c, i) => i > SUSPENDED && c.slice(i - SUSPENDED, i).every((x) => x === c[i - 1]);
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
    if (!big(r) || flatBefore(c, i)) { i++; continue; }
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
// fresh = con la chiusura proprio di quel giorno, short = titoli con un anno di prezzi scaricati che a quella data non
// hanno ancora 200 chiusure: la seduta è troppo vicina all'inizio dei prezzi scaricati e non si può ricalcolare
export function countDay(members, px, d) {
  const r = { members: members.length, n: 0, fresh: 0, short: 0, a20: 0, a50: 0, a200: 0 };
  for (const s of members) {
    const p = px[s];
    if (!p) continue;
    let lo = 0, hi = p.dates.length - 1, j = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (p.dates[m] <= d) { j = m; lo = m + 1; } else hi = m - 1; }
    if (j < 0 || days(p.dates[j], d) > STALE_DAYS) continue;
    r.n++;
    if (p.dates[j] === d) r.fresh++;
    if (j < 199 && p.dates.length >= 230) r.short++;
    for (const w of [20, 50, 200]) { const v = sma(p.close, j, w); if (v != null && p.close[j] > v) r['a' + w]++; }
  }
  return r;
}

// ---------- file ----------
// Serie dell'indice in forma estesa (date, chiusure, conteggi allineati alle date dal b0)
export function expand(x) {
  x = unpackIndex(x);
  const dates = decodeDates(x.d0, x.gaps), m = x.a200.length;
  return { symbol: x.symbol, dates, close: x.close.slice(), b0: x.b0, members: expandRLE(x.members, m), n: expandRLE(x.n, m), a20: x.a20.slice(), a50: x.a50.slice(), a200: x.a200.slice() };
}
export function pack(e) {
  let L = e.a200.length;
  while (L && e.a200[L - 1] == null) L--;
  return packIndex({ symbol: e.symbol, ...encodeDates(e.dates), close: e.close, b0: e.b0,
    members: encodeRLE(e.members.slice(0, L)), n: encodeRLE(e.n.slice(0, L)), a20: e.a20.slice(0, L), a50: e.a50.slice(0, L), a200: e.a200.slice(0, L) });
}
// Inserisce o sostituisce le chiusure dell'indice (le date nuove vanno in ordine; i conteggi seguono)
export function mergePrices(e, dates, close) {
  for (let k = 0; k < dates.length; k++) {
    const d = dates[k], c = Math.round(close[k] * 10000) / 10000; // packIndex tiene 2 o 4 decimali
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

// File della pagina: i principali ("main" in config) si scaricano subito, gli altri subito dopo
export function splitIndices(data, cfg) {
  const pick = (f) => Object.fromEntries(Object.entries(data.series).filter(([k]) => cfg[k] && f(!!cfg[k].main)).map(([k, x]) => [k, packIndex(x)]));
  const { series, ...meta } = data;
  return [{ ...meta, series: pick((m) => m) }, { generated: data.generated, asOf: data.asOf, series: pick((m) => !m) }];
}

async function main() {
  const cfg = readJSON(path.join(ROOT, 'config', 'indices.json')).indices;
  const file = path.join(DATA, 'indices.json'), fileMore = path.join(DATA, 'indices_more.json');
  const data = readJSON(file, null);
  if (!data) throw new Error('manca data/indices.json: esegui prima scripts/backfill_indices.py');
  // gli indici non principali stanno in indices_more.json; se un indice è in tutti e due vale indices.json
  data.series = { ...(readJSON(fileMore, { series: {} }).series), ...data.series };
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
    try { return await fetchDaily(cfg[k].price, { range: '1mo', raw: true }); } catch (e) { console.log(`::warning::${k}: prezzo ${cfg[k].price} non disponibile (${e.message}): indice non aggiornato`); return null; }
  }, 200);

  // 3. conteggi
  const breadth = readJSON(path.join(DATA, 'breadth.json'), null);
  const capFile = path.join(DATA, 'capitulation.json'), cap = readJSON(capFile, null);
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
        if (r.short > r.n * 0.02) console.log(`${k} ${d}: troppo vicina all'inizio dei prezzi scaricati (${r.short} titoli senza 200 chiusure): tengo i valori pubblicati`);
        else if (r.n && r.fresh >= r.n * MIN_FRESH) { setCounts(e, d, r); done.push(d); }
        else console.log(`${k} ${d}: non ancora pubblicabile (chiusure del giorno per ${r.fresh}/${r.n} titoli)`);
      }
      if (cap && !cfg[k].noCap && done.length) cap.series[k] = mergeCap(cap.series[k] || null, Object.fromEntries(done.map((d) => [d, countsOn(lists[k], px, d)])));
    }
    data.series[k] = pack(e);
    console.log(`${k}: prezzo al ${e.dates.at(-1)}, breadth ricalcolata/aggiunta per ${done.length} sedute${done.length ? ` (fino al ${done.at(-1)})` : ''}`);
  });

  data.generated = new Date().toISOString();
  data.asOf = Object.values(data.series).map((x) => { const u = unpackIndex(x); return decodeDates(u.d0, u.gaps)[u.b0 + u.a200.length - 1]; }).sort().at(-1);
  const [main, more] = splitIndices(data, cfg);
  writeJSON(file, main);
  writeJSON(fileMore, more);
  for (const [f, o] of writes) writeJSON(f, o);
  if (cap) {
    cap.generated = new Date().toISOString();
    writeJSON(capFile, cap);
  } else console.log('::warning::manca data/capitulation.json: esegui scripts/backfill_capitulation.py');
  console.log(`indices.json al ${data.asOf}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
