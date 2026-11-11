#!/usr/bin/env node
/*
 * fetch_industries.js — aggiornamento serale delle industrie seguite accanto agli 11 settori (config/industries.json:
 * oggi il SOXX, iShares Semiconductor ETF). Passo a parte del workflow: un problema qui non ferma mai i settori.
 *
 *  1. Lista dei membri dalle holdings iShares (CSV `holdings` in config): nomi, pesi e azioni detenute
 *     (parseISharesHoldings in scripts/lib/members.js). Una lista nuova si accetta con le regole degli indici (checkList:
 *     numero di titoli tra `min` e `max`, almeno l'80% in comune con l'ultima buona); altrimenti si tiene l'ultima buona
 *     con i suoi nomi, pesi e azioni. I cambi si registrano in lists.<chiave>.changes.
 *  2. Prezzi da Yahoo (endpoint chart, scripts/lib/yahoo.js): l'ETF dal 2001 (chiusure rettificate per i dividendi come gli
 *     ETF dei settori, più chiusure senza rettifica e massimi per max52) e i membri per 2 anni e un mese (chiusure
 *     rettificate per gli split e non per i dividendi, ripulite con clean() di scripts/fetch_indices.js).
 *  3. Breadth con la regola della ricostruzione (scripts/backfill_industries.js e ricerca/soxx/dati/): countDay() di
 *     scripts/fetch_indices.js (membri di oggi; «sopra» = almeno 200 sedute e chiusura sopra la media a 200; il
 *     denominatore conta i titoli con l'ultima seduta entro 5 giorni, anche quelli con meno di 200 sedute, che contano
 *     «sotto»). Si ricalcolano le ultime RECOMPUTE sedute pubblicate. Una seduta si pubblica se è una seduta NYSE e se al
 *     massimo un titolo quotato non ha la chiusura di quel giorno (la tolleranza dei settori, «≤1 mancante»); una seduta
 *     incompleta in coda si aspetta, una incompleta prima di una completa è un buco della fonte e si salta.
 *  4. latest: fotografia titolo per titolo dell'ultima seduta pubblicata (stessi campi di data/breadth_latest.json, senza
 *     sector, con w = peso nell'ETF in % dal CSV iShares).
 *  5. data/capitulation.json, serie <chiave>: cali forti delle sedute pubblicate (countsOn di js/capitulation.js, come
 *     gli indici di fetch_indices.js).
 *  6. data/industry_members.json (vista 5 Titoli): buildSectorMembers di scripts/lib/capeq.js senza la riga SPX
 *     (total: false), membri di oggi su tutto il periodo, linea «cap» con le azioni detenute dall'ETF (pesi veri dell'ETF).
 *     Se manca la chiusura dell'ultima seduta di un titolo resta il file della sera prima.
 * Se l'ETF o i prezzi dei membri non arrivano, o arrivano più vecchi di quelli pubblicati, i file restano com'erano e il
 * riepilogo della corsa lo segnala (::warning::). Lo storico iniziale viene da scripts/backfill_industries.js.
 *
 * Uso: node scripts/fetch_industries.js [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { parseISharesHoldings, nextList } from './lib/members.js';
import { buildSectorMembers, align, HISTORY } from './lib/capeq.js';
import { parseCSV } from './fetch_breadth.js';
import { clean, countDay } from './fetch_indices.js';
import { expandRLE, encodeRLE } from '../js/signals.js';
import { encodeDates, decodeDates } from '../js/indexdata.js';
import { closeHigh, intradayHigh, exDates } from '../js/metrics.js';
import { countsOn, mergeCap } from '../js/capitulation.js';
import { expectedSession, isTradingDay } from '../js/calendar.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(ROOT, 'data');
export const FILES = { industries: path.join(DATA, 'industries.json'), members: path.join(DATA, 'industry_members.json'), cap: path.join(DATA, 'capitulation.json') };
export const RECOMPUTE = 5; // ultime sedute pubblicate da ricalcolare (come fetch_breadth.js)
export const ETF_FROM = '2001-01-01'; // prima della prima seduta del SOXX (13/07/2001)
const MEMBERS_DAYS = 790; // circa 540 sedute: media a 200, massimo a 52 settimane e vista 5 (HISTORY in capeq.js)
const STALE_DAYS = 5; // come countDay
const DAY = 864e5;
const UA = 'Mozilla/5.0 (sector-monitor data fetch)';
export const SOURCE = 'Holdings iShares (lista, nomi, pesi e azioni); prezzi Yahoo Finance (ETF rettificato per i dividendi, membri rettificati per gli split); breadth con i membri di oggi';
export const readJSON = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : d);
export const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o));
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// ---------- funzioni pure ----------

/**
 * Prezzo dell'ETF come una serie di data/sectors.json: chiusure rettificate per i dividendi a 2 decimali e max52 (stesso
 * calcolo di updateSectors in fetch_breadth.js) alla seduta `at` (quella della breadth) o alla precedente presente.
 * @param {{dates: string[], close: number[], adjclose: number[], high: number[]}} res serie di fetchDaily
 */
export function etfSeries(res, at) {
  const { dates } = res;
  let iTo = dates.length - 1;
  while (at && iTo > 0 && dates[iTo] > at) iTo--;
  const from = dates[Math.max(0, iTo - 251)], to = dates[iTo];
  const p = closeHigh(dates, res.close.map(r2), from, to), ex = exDates(res, from, to);
  return { dates, adjclose: res.adjclose.map(r2), max52At: to, max52: { ...p, dv: ex.length, da: p ? ex.filter((x) => x > p.d).length : 0, ...intradayHigh(res, from, to) } };
}

// indice dell'ultima seduta del titolo fino a `d` compreso (-1 se nessuna)
function upTo(p, d) {
  let lo = 0, hi = p.dates.length - 1, j = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (p.dates[m] <= d) { j = m; lo = m + 1; } else hi = m - 1; }
  return j;
}

/**
 * Sedute pubblicabili tra le candidate: per ognuna i titoli attivi (quotati da prima di quel giorno e con un prezzo nei 7
 * giorni prima) senza la chiusura del giorno devono essere al massimo `maxMissing`. Un titolo fermo da più di una
 * settimana (sospeso, tolto dal listino) non blocca. Incompleta in coda: si aspetta (le chiusure arrivano in ritardo);
 * incompleta prima di una completa: buco della fonte, si salta.
 * @returns {{ok: string[], notes: string[]}}
 */
export function publishableDays(members, px, candidates, maxMissing = 1) {
  const info = candidates.map((d) => {
    const weekBefore = new Date(Date.parse(d + 'T00:00:00Z') - 7 * DAY).toISOString().slice(0, 10);
    const missing = [];
    let priced = 0;
    for (const s of members) {
      const p = px[s];
      if (!p || !p.dates.length || p.dates[0] > d) continue;
      const j = upTo(p, d);
      if (p.dates[j] === d) priced++;
      else if (p.dates.at(-1) >= weekBefore) missing.push(s);
    }
    return { d, priced, missing, ok: missing.length <= maxMissing };
  });
  const lastOk = info.map((x) => x.ok).lastIndexOf(true), ok = [], notes = [];
  info.forEach((x, i) => {
    if (x.ok) ok.push(x.d);
    else if (i < lastOk) notes.push(`seduta ${x.d} saltata: senza la chiusura del giorno ${x.missing.join(' ')}, ma le sedute dopo sono complete (buco nei dati della fonte)`);
    else notes.push(`seduta ${x.d} non ancora pubblicabile: senza la chiusura del giorno ${x.missing.join(' ')}`);
  });
  return { ok, notes };
}

/** Breadth del file (members e n in RLE, a20/a50/a200 per esteso) allineata alle date `dates` in forma estesa. */
export function expandBreadth(b, len) {
  const pad = (a) => Array.from({ length: len }, (_, i) => (a && i < a.length ? a[i] : null));
  return { members: expandRLE(b ? b.members : [], len), n: expandRLE(b ? b.n : [], len), a20: pad(b && b.a20), a50: pad(b && b.a50), a200: pad(b && b.a200) };
}
export function packBreadth(e) {
  return { members: encodeRLE(e.members), n: encodeRLE(e.n), a20: e.a20, a50: e.a50, a200: e.a200 };
}
const KEYS = ['members', 'n', 'a20', 'a50', 'a200'];
/** Breadth estesa sulle date `oldDates` riportata sulle date `newDates` (per data; le date nuove restano vuote). */
export function realign(e, oldDates, newDates) {
  const at = new Map(oldDates.map((d, i) => [d, i]));
  const out = {};
  for (const k of KEYS) out[k] = newDates.map((d) => (at.has(d) ? e[k][at.get(d)] : null));
  return out;
}
/** Scrive i conteggi `rows` ({data: countDay}) nella breadth estesa sulle date `dates`. */
export function setRows(e, dates, rows) {
  const at = new Map(dates.map((d, i) => [d, i]));
  for (const [d, r] of Object.entries(rows)) { const i = at.get(d); if (i != null) for (const k of KEYS) e[k][i] = r[k]; }
  return e;
}
/** Ultima seduta con la breadth pubblicata (null se nessuna). */
export function lastBreadth(e, dates) {
  for (let i = e.a200.length - 1; i >= 0; i--) if (e.a200[i] != null) return dates[i];
  return null;
}

/**
 * Conteggi delle sedute `dates` con countDay. Una seduta con titoli senza 200 chiusure scaricate pur avendone la storia
 * (short: prezzi scaricati troppo corti) non si pubblica, come in fetch_indices.js.
 * @returns {{rows: Object<string, object>, short: string[]}}
 */
export function breadthRows(members, px, dates) {
  const rows = {}, short = [];
  for (const d of dates) {
    const r = countDay(members, px, d);
    if (r.short) { short.push(d); continue; }
    rows[d] = { members: r.members, n: r.n, a20: r.a20, a50: r.a50, a200: r.a200 };
  }
  return { rows, short };
}

function smaAt(c, i, w) {
  if (i < w - 1) return null;
  let s = 0;
  for (let k = i - w + 1; k <= i; k++) s += c[k];
  return s / w;
}
/**
 * Fotografia dei membri alla seduta d, con la regola di countDay: l'ultima chiusura entro 5 giorni (se non è del giorno
 * d, `at` dice di quale seduta è). Così le righe con la chiusura sono `n` e la somma di up200 è a200.
 * @param {{s: string, name: string, w: number|null}[]} info membri nell'ordine dell'ETF (peso decrescente)
 */
export function latestRows(info, px, d) {
  return info.map(({ s, name, w }) => {
    const p = px[s], j = p ? upTo(p, d) : -1;
    if (j < 0 || days(p.dates[j], d) > STALE_DAYS) return { s, name, w };
    const c = p.close, hi = Math.max(...c.slice(Math.max(0, j - 251), j + 1));
    const dist = (n) => { const v = smaAt(c, j, n); return v == null ? null : Math.round((c[j] / v - 1) * 1000) / 10; };
    const m200 = smaAt(c, j, 200);
    return { s, name, close: r2(c[j]), d20: dist(20), d50: dist(50), d200: dist(200), up200: m200 != null && c[j] > m200,
      dd: Math.round((c[j] / hi - 1) * 1000) / 10, w, ...(p.dates[j] !== d ? { at: p.dates[j] } : {}) };
  });
}

/** Cali forti delle sedute `dates` ({data: {n, x5, x7, x10}}), come gli indici. */
export function capRows(members, px, dates) {
  return Object.fromEntries(dates.map((d) => [d, countsOn(members, px, d)]));
}

/**
 * data/industry_members.json di un'industria: buildSectorMembers senza la riga SPX, membri di oggi su tutto il periodo.
 * @param {string[]} cal sedute dell'ETF fino all'ultima con la breadth
 * @param {{s: string, name: string}[]} info membri; qty {s: azioni detenute dall'ETF}
 * @returns {{out: object|null, noClose: string[]}} out null se qualche membro non ha la chiusura dell'ultima seduta
 */
export function industryMembers({ key, cal, info, px, qty, weightsAsOf }) {
  const c = cal.slice(Math.max(0, cal.length - 1 - HISTORY));
  const N = c.length - 1, apx = {}, life = {};
  for (const m of info) {
    life[m.s] = { sector: key, spans: [['0000', '9999']] };
    if (px[m.s]) apx[m.s] = align(c, px[m.s].dates, px[m.s].close);
  }
  // senza la chiusura dell'ultima seduta pesi e rendimenti sarebbero falsati: resta il file di ieri
  const noClose = info.filter((m) => !apx[m.s] || apx[m.s][N] == null).map((m) => m.s);
  if (noClose.length) return { out: null, noClose };
  const out = buildSectorMembers({ cal: c, members: info.map((m) => ({ s: m.s, name: m.name, sector: key, sub: '' })), life, px: apx, qty, sectors: [key], total: false });
  out.weightsAsOf = weightsAsOf || null;
  out.missing = info.filter((m) => !apx[m.s] || !apx[m.s].some((v) => v != null)).map((m) => m.s);
  return { out, noClose };
}

/** Più industrie nello stesso file della vista 5: si uniscono solo con le stesse date (altrimenti vince la prima). */
export function mergeMembers(parts) {
  const ok = parts.filter(Boolean);
  if (!ok.length) return null;
  const [a, ...rest] = ok, out = JSON.parse(JSON.stringify(a));
  for (const b of rest) {
    if (b.asOf !== a.asOf || JSON.stringify(b.dates) !== JSON.stringify(a.dates) || JSON.stringify(b.starts) !== JSON.stringify(a.starts)) continue;
    Object.assign(out.sectors, b.sectors); Object.assign(out.hist.sectors, b.hist.sectors);
    out.stocks.push(...b.stocks); out.missing.push(...b.missing);
    if (b.weightsAsOf && (!out.weightsAsOf || b.weightsAsOf < out.weightsAsOf)) out.weightsAsOf = b.weightsAsOf;
  }
  return out;
}

/** Serie di un'industria nel formato del file. */
export function packSeries(etf, breadth) {
  return { adjclose: etf.adjclose, max52: etf.max52, max52At: etf.max52At, breadth: packBreadth(breadth) };
}
/** data/industries.json: calendario della prima industria (oggi una sola; più industrie richiedono lo stesso calendario). */
export function packFile({ dates, series, latest, lists, generated = new Date().toISOString() }) {
  const asOf = Object.values(latest).map((x) => x.asOf).sort()[0] || null;
  return { generated, asOf, source: SOURCE, dates: encodeDates(dates), series, latest, lists };
}

/** Lista nel formato del file (come data/index_members/*.json). */
export function listOut(r, source) {
  return { asOf: r.asOf, source, count: r.count, tickers: r.tickers, changes: r.changes || [] };
}

// ---------- rete ----------

export async function fetchHoldings(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const h = parseISharesHoldings(await r.text(), parseCSV);
  if (!h) throw new Error('tabella delle holdings non trovata');
  return h;
}
/** Prezzi dei membri: {s: clean(dates, close)} per chi risponde. */
export async function fetchMembers(tickers, period1) {
  const res = await mapLimit(tickers, 3, async (s) => { try { return await fetchDaily(s, { period1 }); } catch (e) { console.warn(`  ${s}: ${e.message}`); return null; } }, 150);
  const px = {};
  tickers.forEach((s, i) => { if (res[i] && res[i].dates.length) px[s] = clean(res[i].dates, res[i].close); });
  return px;
}

// ---------- aggiornamento serale ----------

/**
 * Un'industria: restituisce i pezzi nuovi dei file, o null (con l'avviso già scritto) se qualcosa non è arrivato.
 * prev = {file: industries.json, members: industry_members.json} pubblicati.
 */
async function updateIndustry(key, conf, prev, today, expected) {
  const pf = prev.file, prevDates = decodeDates(pf.dates.d0, pf.dates.gaps), ps = pf.series && pf.series[key];
  if (!ps) { console.log(`::warning::${key}: manca la storia in data/industries.json, esegui scripts/backfill_industries.js`); return null; }
  const prevList = pf.lists && pf.lists[key], prevLatest = (pf.latest && pf.latest[key]) || { members: [] };
  const prevQ = new Map(((prev.members && prev.members.stocks) || []).filter((x) => x.sec === key && x.q).map((x) => [x.s, x.q]));

  // 1. lista, nomi, pesi e azioni
  let holdings = null, list = null;
  try {
    holdings = await fetchHoldings(conf.holdings);
    const r = nextList(holdings.rows.map((x) => x.s), prevList, conf, today);
    if (r.problems.length) console.log(`::warning::${key}: lista iShares scartata (${r.problems.join('; ')}), tengo l'ultima buona`);
    else {
      list = r.out;
      if (r.added.length || r.removed.length) console.log(`${key}: +${r.added.join(' +') || '—'} / -${r.removed.join(' -') || '—'}`);
    }
  } catch (e) {
    console.log(`::warning::${key}: holdings iShares non disponibili (${e.message}), tengo l'ultima lista buona`);
  }
  let info, qty, weightsAsOf;
  if (list) {
    const by = new Map(holdings.rows.map((x) => [x.s, x]));
    info = holdings.rows.filter((x) => list.tickers.includes(x.s)).map((x) => ({ s: x.s, name: x.name, w: x.w }));
    qty = Object.fromEntries(holdings.rows.filter((x) => x.q > 0).map((x) => [x.s, x.q]));
    weightsAsOf = holdings.asOf;
    if (!info.length || info.length !== list.tickers.length || !by.size) throw new Error(`${key}: holdings incoerenti`);
  } else {
    if (!prevList) { console.log(`::warning::${key}: nessuna lista dei membri`); return null; }
    list = prevList;
    const old = new Map(prevLatest.members.map((x) => [x.s, x]));
    info = list.tickers.map((s) => ({ s, name: (old.get(s) || {}).name || s, w: (old.get(s) || {}).w ?? null })).sort((a, b) => (b.w ?? -1) - (a.w ?? -1));
    qty = Object.fromEntries(prevQ);
    weightsAsOf = prev.members && prev.members.weightsAsOf;
  }
  const tickers = info.map((x) => x.s);

  // 2. prezzi
  let res;
  try { res = await fetchDaily(conf.etf, { period1: Math.floor(Date.parse(ETF_FROM + 'T00:00:00Z') / 1000) }); } catch (e) { console.log(`::warning::${key}: prezzo dell'ETF ${conf.etf} non disponibile (${e.message}): file non aggiornati`); return null; }
  const dates = res.dates, lastPrev = prevDates.at(-1);
  if (dates.at(-1) < lastPrev) { console.log(`::warning::${key}: ETF al ${dates.at(-1)}, più vecchio di quello pubblicato (${lastPrev}): file non aggiornati`); return null; }
  const have = new Set(dates), lost = prevDates.filter((d) => !have.has(d));
  if (lost.length) { console.log(`::warning::${key}: la storia dell'ETF di Yahoo non ha ${lost.length} sedute pubblicate (${lost.slice(0, 5).join(' ')}): file non aggiornati`); return null; }
  const px = await fetchMembers(tickers, Math.floor(Date.now() / 1000) - MEMBERS_DAYS * 86400);
  const got = Object.keys(px).length;
  console.log(`${key}: ETF al ${dates.at(-1)} (${dates.length} sedute), prezzi per ${got}/${tickers.length} membri`);
  if (got < tickers.length * 0.9) { console.log(`::warning::${key}: troppi titoli senza prezzi (${got}/${tickers.length}): file non aggiornati`); return null; }

  // 3. breadth: ultime sedute ricalcolate
  const e = realign(expandBreadth(ps.breadth, prevDates.length), prevDates, dates);
  const last = lastBreadth(e, dates);
  if (!last) { console.log(`::warning::${key}: breadth pubblicata vuota, esegui scripts/backfill_industries.js`); return null; }
  const iLast = dates.indexOf(last), from = dates[Math.max(0, iLast - RECOMPUTE + 1)];
  const candidates = dates.filter((d) => d >= from && d >= conf.from && d <= expected && isTradingDay(d));
  const pub = publishableDays(tickers, px, candidates);
  for (const n of pub.notes) console.log(`${key}: ${n}`);
  const { rows, short } = breadthRows(tickers, px, pub.ok);
  if (short.length) console.log(`::warning::${key}: sedute ${short.join(' ')} troppo vicine all'inizio dei prezzi scaricati: tengo i valori pubblicati`);
  setRows(e, dates, rows);
  const asOf = lastBreadth(e, dates);
  const done = Object.keys(rows).sort();
  console.log(`${key}: breadth ricalcolata/aggiunta per ${done.length} sedute, al ${asOf}`);

  // 4-6. fotografia, cali forti, vista 5
  const etf = etfSeries(res, asOf);
  const latest = { asOf, members: latestRows(info, px, asOf) };
  const cap = capRows(tickers, px, done);
  const cal = dates.filter((d) => d <= asOf);
  const im = industryMembers({ key, cal, info, px, qty, weightsAsOf });
  if (!im.out) console.log(`::warning::${key}: industry_members.json non aggiornato, senza la chiusura del ${asOf}: ${im.noClose.join(' ')}`);
  return { dates, series: packSeries(etf, e), latest, list: listOut(list, conf.holdings), cap, members: im.out };
}

async function main() {
  const cfg = readJSON(path.join(ROOT, 'config', 'industries.json')).industries;
  const keys = Object.keys(cfg);
  const prevFile = readJSON(FILES.industries, null), prevMembers = readJSON(FILES.members, null);
  if (!prevFile) throw new Error('manca data/industries.json: esegui prima scripts/backfill_industries.js');
  const expected = expectedSession(), today = new Date().toISOString().slice(0, 10);
  if (prevFile.asOf >= expected && prevMembers && prevMembers.asOf >= prevFile.asOf && keys.every((k) => prevFile.series[k]) && !process.argv.includes('--force')) {
    console.log(`Industrie già aggiornate al ${prevFile.asOf} (seduta attesa ${expected}): niente da fare.`);
    return;
  }
  const out = {};
  for (const k of keys) {
    try { out[k] = await updateIndustry(k, cfg[k], { file: prevFile, members: prevMembers }, today, expected); } catch (e) { console.log(`::warning::${k}: ${e.message}: file non aggiornati`); out[k] = null; }
  }
  const okKeys = keys.filter((k) => out[k]);
  if (!okKeys.length) { console.log('::warning::Industrie non aggiornate: restano i file pubblicati'); process.exitCode = 1; return; }
  // calendario: quello dell'ETF della prima industria aggiornata; le industrie non aggiornate tengono la serie pubblicata
  // solo se il calendario non è cambiato (con una sola industria non succede)
  const dates = out[okKeys[0]].dates, prevDates = decodeDates(prevFile.dates.d0, prevFile.dates.gaps);
  const same = dates.length === prevDates.length && dates.at(-1) === prevDates.at(-1);
  const pick = (k, f) => (out[k] ? out[k][f] : same && prevFile[f === 'list' ? 'lists' : f] ? prevFile[f === 'list' ? 'lists' : f][k] : undefined);
  const series = {}, latest = {}, lists = {};
  for (const k of keys) {
    const s = pick(k, 'series'), l = pick(k, 'latest'), li = out[k] ? out[k].list : prevFile.lists && prevFile.lists[k];
    if (s && l) { series[k] = s; latest[k] = l; }
    if (li) lists[k] = li;
  }
  const file = packFile({ dates, series, latest, lists });
  writeJSON(FILES.industries, file);
  console.log(`industries.json: ${dates.length} sedute, breadth al ${file.asOf}`);

  const cap = readJSON(FILES.cap, null);
  if (cap) {
    for (const k of okKeys) if (Object.keys(out[k].cap).length) cap.series[k] = mergeCap(cap.series[k] || null, out[k].cap);
    cap.generated = new Date().toISOString();
    writeJSON(FILES.cap, cap);
    console.log(`capitulation.json: ${okKeys.join(', ')} ricalcolati`);
  } else console.log('::warning::manca data/capitulation.json: esegui scripts/backfill_capitulation.py');

  const parts = keys.map((k) => (out[k] && out[k].members) || null);
  if (parts.every(Boolean)) {
    const m = mergeMembers(parts);
    writeJSON(FILES.members, m);
    console.log(`industry_members.json: ${m.stocks.length} titoli al ${m.asOf}, pesi iShares ${m.weightsAsOf || '—'}`);
  } else console.log('::warning::industry_members.json non aggiornato: resta il file della sera prima');
  if (okKeys.length < keys.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
