#!/usr/bin/env node
/*
 * ricerca/oscillatori/dati.mjs — fase di ricerca (non tocca l'app). Quale storia dell'S&P 500 c'è per due oscillatori
 * lenti su chiusure MENSILI, e del VIX per la tabella «picco del VIX dopo il segnale».
 *
 * Serie usata: data/vix.json, chiave SPX (Yahoo ^GSPC, solo prezzo, giornaliera dal 02/01/1990; la scarica
 * scripts/fetch_vix.js) e chiave VIX (FRED VIXCLS = Cboe, chiusure dal 02/01/1990). data/indices.json ha l'S&P 500 solo
 * dal 03/01/2000: si controlla che coincida.
 *
 * Chiusura mensile = chiusura dell'ultima seduta presente nel mese. Il mese è «chiuso» se quella seduta è l'ultima seduta
 * NYSE del mese secondo js/calendar.js (che però tratta come festivi i Martin Luther King Day 1990-1997, quando la NYSE era
 * aperta: per i mesi storici conta solo se l'ultimo giorno di borsa del mese è passato).
 *
 * Confronti con fonti indipendenti (nessuno scraping vietato):
 *  - Cboe SPX_History.csv (file pubblico di Cboe, chiusure giornaliere dell'S&P 500 dal 1975), stesso host già usato da
 *    scripts/fetch_vix.js per il VIX; copia in ricerca/oscillatori/cache/;
 *  - FRED SP500 (solo gli ultimi 10 anni per licenza S&P): dal vivo o dalla copia ricerca/vix/cache/SP500.json;
 *  - Cboe VIX_History.csv (OHLC; 1990-1991 solo chiusura) per i massimi annui del VIX e per il massimo intraday.
 * Uso: node ricerca/oscillatori/dati.mjs [--offline]
 * Scrive ricerca/oscillatori/cache/spx_mensile.json (mesi, ultima seduta, chiusura, mese chiuso sì/no, massimo di chiusura
 * del VIX nel mese) per gli script di backtest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vxSeries } from '../../js/vix.js';
import { indexSeries } from '../../js/indexdata.js';
import { NYSE } from '../../js/calendar.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = path.join(ROOT, 'ricerca/oscillatori/cache');
const OFFLINE = process.argv.includes('--offline');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const f2 = (v, d = 2) => (v == null ? '—' : v.toFixed(d));
const DAY = 86400000;

// ---------- serie dell'app ----------
const VJ = read('data/vix.json');
const SPX = vxSeries(VJ.series.SPX), VIX = vxSeries(VJ.series.VIX);
console.log('== Fonti nell\'app');
console.log(`data/vix.json SPX: ${VJ.source.index}; ${SPX.dates.length} sedute dal ${SPX.dates[0]} al ${SPX.dates.at(-1)} (giornaliera, solo prezzo)`);
console.log(`data/vix.json VIX: ${VJ.series.VIX.src} fino al ${VJ.series.VIX.fred}; ${VIX.dates.length} sedute dal ${VIX.dates[0]} al ${VIX.dates.at(-1)}`);
const IX = indexSeries(read('data/indices.json').series.SPX);
{
  const m = new Map(SPX.dates.map((d, i) => [d, SPX.val[i]]));
  let common = 0, diff = 0, maxd = 0, onlyIx = 0;
  IX.dates.forEach((d, i) => { if (IX.close[i] == null) return; if (!m.has(d)) { onlyIx++; return; } common++; const x = Math.abs(m.get(d) - IX.close[i]); if (x > 0.005) diff++; maxd = Math.max(maxd, x); });
  console.log(`data/indices.json SPX: dal ${IX.dates[0]} al ${IX.dates.at(-1)}; sedute comuni con vix.json ${common}, diverse oltre 0,005 punti ${diff}, differenza massima ${f2(maxd, 4)}, sedute solo in indices.json ${onlyIx}`);
}

// ---------- buchi nelle sedute giornaliere ----------
console.log('\n== Buchi nella serie giornaliera dell\'S&P 500 (più di 4 giorni di calendario tra due sedute)');
for (let i = 1; i < SPX.dates.length; i++) {
  const g = (Date.parse(SPX.dates[i]) - Date.parse(SPX.dates[i - 1])) / DAY;
  if (g > 4) console.log(`  ${SPX.dates[i - 1]} → ${SPX.dates[i]}: ${g} giorni`);
}
const vixSet = new Set(VIX.dates);
const noVix = SPX.dates.filter((d) => !vixSet.has(d));
console.log(`Sedute dell'S&P 500 senza VIX: ${noVix.length} (${noVix.join(', ')})`);

// ---------- chiusure mensili ----------
const ym = (d) => d.slice(0, 7);
function lastSessionOfMonth(y, m) { // ultima seduta NYSE del mese secondo js/calendar.js
  let t = Date.UTC(y, m, 0); // ultimo giorno del mese (m 1-12)
  for (;;) { const iso = new Date(t).toISOString().slice(0, 10); if (NYSE.isTradingDay(iso)) return iso; t -= DAY; }
}
function monthly(dates, val) {
  const out = [];
  dates.forEach((d, i) => { if (val[i] == null) return; const k = ym(d); if (out.length && out.at(-1).m === k) { out.at(-1).date = d; out.at(-1).close = val[i]; out.at(-1).n++; } else out.push({ m: k, date: d, close: val[i], n: 1 }); });
  return out;
}
const M = monthly(SPX.dates, SPX.val);
const lastData = SPX.dates.at(-1);
for (const r of M) {
  const [y, m] = r.m.split('-').map(Number), exp = lastSessionOfMonth(y, m);
  r.expected = exp;
  r.closed = r.date >= exp || lastData > exp; // mese finito: l'ultima seduta attesa è passata (c'è o no nei dati)
  r.sameAsExpected = r.date === exp;
}
console.log('\n== Chiusure mensili (ultima seduta del mese nei dati)');
console.log(`Mesi: ${M.length}, dal ${M[0].m} (ultima seduta ${M[0].date}) al ${M.at(-1).m} (ultima seduta ${M.at(-1).date})`);
let holes = 0;
for (let i = 1; i < M.length; i++) { const [y0, m0] = M[i - 1].m.split('-').map(Number), [y1, m1] = M[i].m.split('-').map(Number); if ((y1 - y0) * 12 + (m1 - m0) !== 1) { holes++; console.log(`  mese mancante tra ${M[i - 1].m} e ${M[i].m}`); } }
console.log(`Mesi mancanti nella sequenza: ${holes}`);
const open = M.filter((r) => !r.closed);
console.log(`Mesi non ancora chiusi: ${open.map((r) => `${r.m} (ultima seduta nei dati ${r.date}, ultima attesa ${r.expected}, ${r.n} sedute finora)`).join('; ') || 'nessuno'}`);
const odd = M.filter((r) => r.closed && !r.sameAsExpected);
console.log(`Mesi chiusi la cui ultima seduta nei dati non è l'ultima seduta NYSE di js/calendar.js: ${odd.length}${odd.length ? ' → ' + odd.map((r) => `${r.m} (dati ${r.date}, calendario ${r.expected})`).join('; ') : ''}`);
const sessPerMonth = M.filter((r) => r.closed).map((r) => r.n);
console.log(`Sedute per mese chiuso: da ${Math.min(...sessPerMonth)} a ${Math.max(...sessPerMonth)}`);

// ---------- VIX: massimi di chiusura per anno 1998-2022 ----------
const vixAt = new Map(VIX.dates.map((d, i) => [d, VIX.val[i]]));
async function getText(url, file) {
  const p = path.join(CACHE, file);
  if (!OFFLINE) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (research script)' }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text(); fs.writeFileSync(p, t); return { text: t, from: `${url} (scaricato ora)` };
    } catch (e) { console.log(`  (${url}: ${e.message}; uso la copia locale se c'è)`); }
  }
  return fs.existsSync(p) ? { text: fs.readFileSync(p, 'utf8'), from: `${path.relative(ROOT, p)} (copia del ${fs.statSync(p).mtime.toISOString().slice(0, 10)})` } : null;
}
const mdy = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim()); return m ? `${m[3]}-${m[1]}-${m[2]}` : null; };
function parseCsv(text) {
  const L = text.trim().split(/\r?\n/), head = L[0].split(',').map((x) => x.trim().toUpperCase());
  return L.slice(1).map((l) => { const a = l.split(','), o = {}; head.forEach((h, i) => { o[h] = h === 'DATE' ? mdy(a[i] || '') : +a[i]; }); return o; }).filter((o) => o.DATE);
}
const cboeVix = await getText('https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv', 'VIX_History.csv');
const CV = cboeVix ? parseCsv(cboeVix.text) : [];
console.log(`\n== VIX: massimo di chiusura per anno (FRED VIXCLS in data/vix.json; confronto Cboe VIX_History.csv: ${cboeVix ? cboeVix.from : 'non disponibile'})`);
console.log('anno  max chiusura  data         Cboe chiusura max  Cboe massimo intraday (data)');
for (let y = 1998; y <= 2022; y++) {
  let mx = -1, at = null;
  VIX.dates.forEach((d, i) => { if (d.startsWith(String(y)) && VIX.val[i] > mx) { mx = VIX.val[i]; at = d; } });
  const cy = CV.filter((r) => r.DATE.startsWith(String(y)));
  const cmax = cy.length ? Math.max(...cy.map((r) => r.CLOSE)) : null;
  const hr = cy.length ? cy.reduce((a, r) => (r.HIGH > a.HIGH ? r : a)) : null;
  console.log(`${y}  ${f2(mx).padStart(12)}  ${at}  ${f2(cmax).padStart(17)}  ${hr ? `${f2(hr.HIGH)} (${hr.DATE})` : '—'}`);
}

// ---------- confronto delle chiusure mensili con Cboe SPX_History.csv ----------
const cboeSpx = await getText('https://cdn.cboe.com/api/global/us_indices/daily_prices/SPX_History.csv', 'SPX_History.csv');
console.log(`\n== Confronto delle chiusure mensili con Cboe SPX_History.csv (${cboeSpx ? cboeSpx.from : 'non disponibile'})`);
const SAMPLE = ['1990-01', '1994-12', '1998-06', '1998-07', '1998-08', '2000-03', '2000-08', '2001-09', '2007-10', '2008-12', '2011-07', '2015-07', '2018-09', '2020-01', '2020-02', '2021-12', '2022-01'];
function compare(label, other) { // other: Map data → chiusura (giornaliera)
  const byM = new Map(); for (const [d, v] of other) { const k = ym(d); const c = byM.get(k); if (!c || d > c.date) byM.set(k, { date: d, close: v }); }
  let n = 0, sameDate = 0, diff = 0, maxAbs = 0, maxRel = 0, worst = null; const list = [], otherDate = [];
  for (const r of M.filter((x) => x.closed)) {
    const o = byM.get(r.m); if (!o) continue;
    n++; if (o.date === r.date) sameDate++; else otherDate.push(`${r.m} (Yahoo ${r.date}, ${label} ${o.date})`);
    const v = other.get(r.date); if (v == null) continue;
    const a = Math.abs(v - r.close), rel = a / r.close;
    if (a > 0.005) { diff++; list.push(`${r.date} ${f2(r.close)}/${f2(v)} (${f2(100 * (v / r.close - 1), 3)}%)`); }
    if (rel > maxRel) { maxRel = rel; maxAbs = a; worst = `${r.m} (${r.date}: Yahoo ${f2(r.close)}, ${label} ${f2(v)})`; }
  }
  console.log(`${label}: mesi chiusi confrontati ${n}, stessa ultima seduta ${sameDate}, chiusure diverse oltre 0,005 punti ${diff}, scarto massimo ${f2(maxAbs, 4)} punti (${f2(100 * maxRel, 4)}%)${worst ? ' in ' + worst : ''}`);
  if (otherDate.length) console.log(`  ultima seduta diversa: ${otherDate.join('; ')}`);
  if (list.length) console.log(`  chiusure diverse (Yahoo/${label}): ${list.join('; ')}`);
  return byM;
}
if (cboeSpx) {
  const rows = parseCsv(cboeSpx.text), C = new Map(rows.map((r) => [r.DATE, r.SPX]));
  console.log(`Cboe SPX: ${rows.length} sedute dal ${rows[0].DATE} al ${rows.at(-1).DATE}`);
  const byM = compare('Cboe', C);
  console.log('campione   ultima seduta  Yahoo (vix.json)  Cboe');
  for (const k of [...SAMPLE, M.filter((x) => x.closed).at(-1).m]) { const r = M.find((x) => x.m === k), o = byM.get(k); if (r) console.log(`${k}    ${r.date}     ${f2(r.close).padStart(10)}  ${o ? `${f2(o.close).padStart(10)} (${o.date})` : '—'}`); }
  // sedute che mancano in una delle due fonti dal 1990
  const ys = new Set(SPX.dates), onlyC = rows.filter((r) => r.DATE >= SPX.dates[0] && r.DATE <= SPX.dates.at(-1) && !ys.has(r.DATE)).map((r) => r.DATE), onlyY = SPX.dates.filter((d) => !C.has(d));
  console.log(`Sedute solo in Cboe: ${onlyC.length}${onlyC.length ? ' (' + onlyC.slice(0, 10).join(', ') + (onlyC.length > 10 ? '…' : '') + ')' : ''}; solo in Yahoo: ${onlyY.length}${onlyY.length ? ' (' + onlyY.slice(0, 10).join(', ') + (onlyY.length > 10 ? '…' : '') + ')' : ''}`);
}

// ---------- confronto con FRED SP500 (10 anni) ----------
let fred = null;
if (!OFFLINE) {
  try {
    const r = await fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500&cosd=2016-01-01', { headers: { 'User-Agent': 'Mozilla/5.0 (research script)' }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = (await r.text()).trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).filter(([d, v]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && v && v !== '.').map(([d, v]) => [d, +v]);
    if (rows.length) fred = { rows, from: 'FRED SP500 (scaricato ora)' };
  } catch (e) { console.log(`  (FRED SP500: ${e.message}; uso la copia di ricerca/vix/cache/SP500.json)`); }
}
if (!fred && fs.existsSync(path.join(ROOT, 'ricerca/vix/cache/SP500.json'))) { const c = read('ricerca/vix/cache/SP500.json'); fred = { rows: c.rows, from: `ricerca/vix/cache/SP500.json (copia del ${c.fetched.slice(0, 10)})` }; }
if (fred) {
  console.log(`\n== Confronto con FRED SP500 (${fred.from}): dal ${fred.rows[0][0]} al ${fred.rows.at(-1)[0]}, solo 10 anni per la licenza S&P`);
  compare('FRED', new Map(fred.rows));
}

// ---------- storia più lunga: Yahoo ^GSPC dal 1985 (copia della ricerca VIX) ----------
if (fs.existsSync(path.join(ROOT, 'ricerca/vix/cache/_GSPC.json'))) {
  const g = read('ricerca/vix/cache/_GSPC.json');
  console.log(`\n== Yahoo ^GSPC nella copia ricerca/vix/cache/_GSPC.json: ${g.rows.length} sedute dal ${g.rows[0][0]} al ${g.rows.at(-1)[0]} (scripts/fetch_vix.js chiede solo dal 1990-01-01, costante SINCE)`);
}

// ---------- riscaldamento di oscillatori generici (solo stima di quanti mesi servono, NON le formule della pagina) ----------
console.log('\n== Primo mese con un valore, per oscillatori mensili generici (stima dei mesi di riscaldamento)');
const C = M.map((r) => r.close);
const roc = (a, n) => a.map((v, i) => (i >= n ? (v / a[i - n] - 1) * 100 : null));
const sma = (a, n) => a.map((_, i) => { if (i < n - 1) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) { if (a[k] == null) return null; s += a[k]; } return s / n; });
const wma = (a, n) => a.map((_, i) => { if (i < n - 1) return null; let s = 0, w = 0; for (let k = 0; k < n; k++) { const v = a[i - k]; if (v == null) return null; s += v * (n - k); w += n - k; } return s / w; });
const add = (...xs) => xs[0].map((_, i) => (xs.some((x) => x[i] == null) ? null : xs.reduce((s, x) => s + x[i], 0)));
const first = (a) => { const i = a.findIndex((v) => v != null); return i < 0 ? '—' : `${M[i].m} (dopo ${i + 1} mesi)`; };
const coppock = wma(add(roc(C, 14), roc(C, 11)), 10);
const kst = add(...[[9, 6, 1], [12, 6, 2], [18, 6, 3], [24, 9, 4]].map(([r, s, w]) => sma(roc(C, r), s).map((v) => (v == null ? null : v * w))));
const kstSig = sma(kst, 9);
console.log(`Coppock (ROC 14 + ROC 11, WMA 10): ${first(coppock)}`);
console.log(`KST mensile di Pring (ROC 9/12/18/24, medie 6/6/6/9): ${first(kst)}; segnale SMA 9: ${first(kstSig)}`);
console.log('MACD 12/26/9 e RSI 14 mensili: medie esponenziali, il primo valore esiste dopo 26 (+9) e 15 mesi, ma dipende dal seme per molti mesi in più: più storia prima del 1996 serve (Yahoo ha ^GSPC dal 1985, Cboe dal 1975).');

// ---------- file per gli script di backtest ----------
const vixMaxM = new Map(); VIX.dates.forEach((d, i) => { const k = ym(d), c = vixMaxM.get(k); if (!c || VIX.val[i] > c.v) vixMaxM.set(k, { v: VIX.val[i], d }); });
const out = { generated: new Date().toISOString(), source: 'data/vix.json (SPX: Yahoo ^GSPC solo prezzo; VIX: FRED VIXCLS = Cboe) via ricerca/oscillatori/dati.mjs', asOf: lastData, fred: VJ.series.VIX.fred,
  months: M.map((r) => ({ m: r.m, date: r.date, close: r.close, closed: r.closed, sessions: r.n, vixMax: vixMaxM.get(r.m) ? vixMaxM.get(r.m).v : null, vixMaxDate: vixMaxM.get(r.m) ? vixMaxM.get(r.m).d : null })) };
fs.writeFileSync(path.join(CACHE, 'spx_mensile.json'), JSON.stringify(out));
console.log(`\nScritto ricerca/oscillatori/cache/spx_mensile.json (${out.months.length} mesi)`);
