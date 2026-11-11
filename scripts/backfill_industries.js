#!/usr/bin/env node
/*
 * backfill_industries.js — ricostruzione una tantum della storia delle industrie (config/industries.json, oggi il SOXX).
 * Poi le aggiorna ogni sera scripts/fetch_industries.js, con le stesse funzioni.
 *
 * Scrive SOLO data/industries.json, data/industry_members.json e la serie di ogni industria in data/capitulation.json;
 * alla fine controlla che tutti gli altri file di data/ siano identici byte per byte e che in capitulation.json non sia
 * cambiato nient'altro (altrimenti rimette i file di prima ed esce con errore).
 *
 *  1. Lista di oggi dalle holdings iShares (nomi, pesi, azioni), con i limiti min/max di config/industries.json.
 *  2. Prezzi da Yahoo (fetchDaily di scripts/lib/yahoo.js): ETF dal 2001 (rettificato per i dividendi), membri dal
 *     1990 (rettificati per gli split, ripuliti con clean() di scripts/fetch_indices.js).
 *  3. Breadth dei membri di oggi su tutte le sedute dell'ETF da `from` (config), con countDay() di
 *     scripts/fetch_indices.js: la stessa regola della ricerca (ricerca/soxx/dati/script/analisi.mjs, controllo in
 *     ricerca/soxx/verifica_app.mjs). Le ultime RECOMPUTE sedute seguono la regola di pubblicazione della sera
 *     (seduta NYSE, al massimo un titolo quotato senza la chiusura del giorno).
 *  4. Cali forti (countsOn di js/capitulation.js) sulle sedute con la breadth; fotografia dei titoli; vista 5.
 *
 * Uso: node scripts/backfill_industries.js [--force] [--cache DIR]
 *   --force: sovrascrive data/industries.json se esiste già
 *   --cache DIR: tiene le risposte di Yahoo in DIR (fuori dal repository) e le riusa a una seconda esecuzione
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { nextList } from './lib/members.js';
import { clean, countDay } from './fetch_indices.js';
import { expectedSession, isTradingDay } from '../js/calendar.js';
import { mergeCap } from '../js/capitulation.js';
import { DATA, FILES, RECOMPUTE, ETF_FROM, readJSON, writeJSON, etfSeries, publishableDays, latestRows, capRows, industryMembers,
  mergeMembers, packSeries, packFile, listOut, fetchHoldings, setRows, lastBreadth } from './fetch_industries.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEMBERS_FROM = 631152000; // 01/01/1990, come la ricerca
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

const sha = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
function snapshot() {
  const out = {};
  const walk = (dir) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p); else out[path.relative(DATA, p)] = sha(p); } };
  walk(DATA);
  return out;
}

async function yahoo(symbol, opt, cache) {
  const f = cache && path.join(cache, encodeURIComponent(symbol) + '.json');
  if (f && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  const r = await fetchDaily(symbol, { ...opt, retries: 4 });
  const out = { dates: r.dates, close: r.close, adjclose: r.adjclose, high: r.high };
  if (f) fs.writeFileSync(f, JSON.stringify(out));
  return out;
}

async function industry(key, conf, today, expected, cache) {
  // 1. lista
  const h = await fetchHoldings(conf.holdings);
  const r = nextList(h.rows.map((x) => x.s), null, conf, today);
  if (r.problems.length) throw new Error(`${key}: lista iShares scartata (${r.problems.join('; ')})`);
  const info = h.rows.map((x) => ({ s: x.s, name: x.name, w: x.w }));
  const qty = Object.fromEntries(h.rows.filter((x) => x.q > 0).map((x) => [x.s, x.q]));
  const tickers = info.map((x) => x.s);
  console.log(`${key}: ${tickers.length} titoli nelle holdings del ${h.asOf}`);

  // 2. prezzi
  const res = await yahoo(conf.etf, { period1: Math.floor(Date.parse(ETF_FROM + 'T00:00:00Z') / 1000) }, cache);
  const got = await mapLimit(tickers, 3, async (s) => { try { return await yahoo(s, { period1: MEMBERS_FROM }, cache); } catch (e) { console.warn(`  ${s}: ${e.message}`); return null; } }, 200);
  const px = {};
  tickers.forEach((s, i) => { if (got[i] && got[i].dates.length) px[s] = clean(got[i].dates, got[i].close); });
  const miss = tickers.filter((s) => !px[s]);
  if (miss.length) throw new Error(`${key}: senza prezzi ${miss.join(' ')}`);
  const dates = res.dates;
  console.log(`${key}: ETF ${conf.etf} dal ${dates[0]} al ${dates.at(-1)} (${dates.length} sedute); prezzi di tutti i membri`);

  // 3. breadth: storia con countDay, ultime sedute con la regola della sera
  const L = dates.length;
  const e = { members: new Array(L).fill(null), n: new Array(L).fill(null), a20: new Array(L).fill(null), a50: new Array(L).fill(null), a200: new Array(L).fill(null) };
  const all = dates.filter((d) => d >= conf.from && d <= expected);
  const tail = all.slice(-RECOMPUTE), hist = all.slice(0, all.length - tail.length);
  const rows = {};
  for (const d of hist) { const c = countDay(tickers, px, d); rows[d] = { members: c.members, n: c.n, a20: c.a20, a50: c.a50, a200: c.a200 }; }
  const pub = publishableDays(tickers, px, tail.filter(isTradingDay));
  for (const n of pub.notes) console.log(`${key}: ${n}`);
  for (const d of pub.ok) { const c = countDay(tickers, px, d); rows[d] = { members: c.members, n: c.n, a20: c.a20, a50: c.a50, a200: c.a200 }; }
  setRows(e, dates, rows);
  const asOf = lastBreadth(e, dates);
  const done = Object.keys(rows).sort();
  console.log(`${key}: breadth dal ${done[0]} al ${asOf} (${done.length} sedute)`);

  // 4. prezzo, fotografia, cali forti, vista 5
  const etf = etfSeries(res, asOf);
  const im = industryMembers({ key, cal: dates.filter((d) => d <= asOf), info, px, qty, weightsAsOf: h.asOf });
  if (!im.out) throw new Error(`${key}: senza la chiusura del ${asOf}: ${im.noClose.join(' ')}`);
  return { dates, series: packSeries(etf, e), latest: { asOf, members: latestRows(info, px, asOf) }, list: listOut(r.out, conf.holdings), cap: capRows(tickers, px, done), members: im.out };
}

async function main() {
  const t0 = Date.now();
  const cfg = readJSON(path.join(ROOT, 'config', 'industries.json')).industries;
  if (fs.existsSync(FILES.industries) && !process.argv.includes('--force')) throw new Error('data/industries.json esiste già: usa --force per ricostruirlo');
  const cache = arg('--cache');
  if (cache) fs.mkdirSync(cache, { recursive: true });
  const before = snapshot();
  const capText = fs.readFileSync(FILES.cap, 'utf-8'), cap = JSON.parse(capText);
  if (JSON.stringify(cap) !== capText) throw new Error('data/capitulation.json non è nel formato di JSON.stringify: riscriverlo cambierebbe anche le altre serie');
  const expected = expectedSession(), today = new Date().toISOString().slice(0, 10);

  const keys = Object.keys(cfg), out = {};
  for (const k of keys) out[k] = await industry(k, cfg[k], today, expected, cache);
  const dates = out[keys[0]].dates;
  for (const k of keys.slice(1)) if (JSON.stringify(out[k].dates) !== JSON.stringify(dates)) throw new Error(`${k}: calendario diverso da ${keys[0]}`);

  const file = packFile({
    dates, series: Object.fromEntries(keys.map((k) => [k, out[k].series])),
    latest: Object.fromEntries(keys.map((k) => [k, out[k].latest])), lists: Object.fromEntries(keys.map((k) => [k, out[k].list])),
  });
  const members = mergeMembers(keys.map((k) => out[k].members));
  // capitulation.json: solo le serie delle industrie, nessun altro campo
  const capNew = JSON.parse(capText);
  for (const k of keys) capNew.series[k] = mergeCap(null, out[k].cap);

  const touched = ['industries.json', 'industry_members.json', 'capitulation.json'];
  const backup = Object.fromEntries(touched.map((f) => [f, fs.existsSync(path.join(DATA, f)) ? fs.readFileSync(path.join(DATA, f)) : null]));
  writeJSON(FILES.industries, file);
  writeJSON(FILES.members, members);
  writeJSON(FILES.cap, capNew);

  // controlli: gli altri file identici, in capitulation.json cambiano solo le serie delle industrie
  const after = snapshot(), problems = [];
  for (const f of new Set([...Object.keys(before), ...Object.keys(after)])) if (!touched.includes(f) && before[f] !== after[f]) problems.push(`${f} cambiato`);
  const c2 = JSON.parse(fs.readFileSync(FILES.cap, 'utf-8'));
  for (const [k, v] of Object.entries(cap)) if (k !== 'series' && JSON.stringify(c2[k]) !== JSON.stringify(v)) problems.push(`capitulation.json: campo ${k} cambiato`);
  for (const [k, v] of Object.entries(cap.series)) if (!keys.includes(k) && JSON.stringify(c2.series[k]) !== JSON.stringify(v)) problems.push(`capitulation.json: serie ${k} cambiata`);
  if (Object.keys(c2.series).length !== new Set([...Object.keys(cap.series), ...keys]).size) problems.push('capitulation.json: serie in più o in meno');
  if (problems.length) {
    for (const [f, b] of Object.entries(backup)) { const p = path.join(DATA, f); if (b) fs.writeFileSync(p, b); else fs.rmSync(p, { force: true }); }
    throw new Error(`controllo dei file non superato, file rimessi com'erano: ${problems.join('; ')}`);
  }
  const kb = (f) => (fs.statSync(f).size / 1024).toFixed(1);
  console.log(`Scritti: industries.json ${kb(FILES.industries)} KB (al ${file.asOf}), industry_members.json ${kb(FILES.members)} KB, capitulation.json ${kb(FILES.cap)} KB (+ ${keys.join(', ')})`);
  console.log(`Altri file di data/ identici (${Object.keys(before).length - touched.filter((f) => before[f]).length} controllati). Tempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
