/*
 * effetto.mjs — effetto della correzione delle date sui file pubblicati (prices_global.json, prices_macro.json).
 * Stesse risposte grezze di Yahoo (raw/, scaricate da misura.mjs), lette con il parse di prima (yahoo_prima.js, copia di
 * scripts/lib/yahoo.js prima della correzione) e con quello corretto. Ricostruisce i due punti toccati:
 *  - DBMFE.PA: storia prima del 28/04/2025 = DBMF in dollari convertito con EURUSD=X (come toCurrency) e raccordato;
 *  - DXY_INV: inverso di DX-Y.NYB sul calendario NYSE pubblicato.
 * Confronta anche con i file su main (raw/main_prices_*.json) per controllare che la ricostruzione «prima» li riproduca.
 * Uso: node ricerca/qa/date-barre/effetto.mjs > ricerca/qa/date-barre/effetto.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OLD from './yahoo_prima.js';
import * as NEW from '../../../scripts/lib/yahoo.js';
import { spliceHistory, inverse } from '../../../scripts/fetch_data.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = (f) => JSON.parse(fs.readFileSync(path.join(HERE, 'raw', f)));
const raw = (s) => R(`5y_${s}.json`);
const now = Date.parse('2026-11-05T12:00:00Z') / 1000;

// conversione come toCurrency in scripts/fetch_data.js (cambio dell'ultima data <= data del prezzo)
function toEur(s, f) {
  let j = 0, rate = null;
  const out = { ...s, dates: [], close: [], adjclose: [], high: [] };
  for (let i = 0; i < s.dates.length; i++) {
    while (j < f.dates.length && f.dates[j] <= s.dates[i]) rate = f.close[j++];
    if (rate == null) continue;
    out.dates.push(s.dates[i]); out.close.push(s.close[i] / rate); out.adjclose.push(s.adjclose[i] / rate); out.high.push(s.high[i] / rate);
  }
  return out;
}
const pct = (a, b) => (a / b - 1) * 100;
function stats(dates, a, b, from, to) {
  const d = [];
  const r = [];
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] < from || dates[i] > to || a[i] == null || b[i] == null) continue;
    d.push({ date: dates[i], p: pct(a[i], b[i]) });
    if (i && a[i - 1] != null && b[i - 1] != null) r.push((a[i] / a[i - 1] - b[i] / b[i - 1]) * 100);
  }
  const abs = d.map((x) => Math.abs(x.p)).sort((x, y) => x - y);
  const absr = r.map(Math.abs).sort((x, y) => x - y);
  const q = (v, k) => (v.length ? +v[Math.min(v.length - 1, Math.floor(k * v.length))].toFixed(4) : null);
  const worst = d.reduce((m, x) => (Math.abs(x.p) > Math.abs(m.p) ? x : m), { p: 0 });
  return { sessions: d.length, differ: d.filter((x) => Math.abs(x.p) > 1e-9).length, levelPct: { median: q(abs, 0.5), p95: q(abs, 0.95), max: q(abs, 1) },
    dailyReturnPctPts: { median: q(absr, 0.5), p95: q(absr, 0.95), max: q(absr, 1) }, worst: { date: worst.date, pct: +worst.p.toFixed(4) } };
}
const align = (s, dates) => {
  const out = []; let j = 0, last = null;
  for (const d of dates) { while (j < s.dates.length && s.dates[j] <= d) last = s.adjclose[j++]; out.push(last); }
  return out;
};

const res = {};
// --- prices_global.json: DBMFE.PA con la storia del DBMF in euro ---
const G = R('main_prices_global.json');
{
  const run = (M) => {
    const fx = M.parse(raw('EURUSD=X'), { fillLast: true, nowSec: now });
    const live = M.parse(raw('DBMFE.PA'), { fillLast: true, keepOpenCrypto: true, dropStale: true, nowSec: now });
    const px = toEur(M.parse(raw('DBMF'), { nowSec: now }), fx);
    const sp = spliceHistory(live, px);
    return { fx, sp, a: align({ dates: sp.dates, adjclose: sp.adjclose }, G.dates) };
  };
  const o = run(OLD), n = run(NEW);
  const pub = G.tickers['DBMFE.PA'].close;
  const until = G.tickers['DBMFE.PA'].spliced.until;
  // per confrontare livelli serve la stessa base: il raccordo scala il proxy sul primo prezzo dell'ETF, quindi i livelli
  // dopo il raccordo coincidono e le differenze stanno tutte prima
  res.global_DBMFE = {
    splicedUntil: until, factorOld: o.sp.factor, factorNew: n.sp.factor,
    fxShiftedBars: o.fx.dates.filter((d, i) => d !== n.fx.dates[i]).length, fxBars: n.fx.dates.length,
    fxSundayOld: o.fx.dates.filter((d) => new Date(d).getUTCDay() === 0).length, fxSundayNew: n.fx.dates.filter((d) => new Date(d).getUTCDay() === 0).length,
    newVsOld: stats(G.dates, n.a, o.a, G.dates[0], until),
    oldVsPublished: stats(G.dates, o.a, pub, G.dates[0], until),
    newVsPublished: stats(G.dates, n.a, pub, G.dates[0], until),
    afterSplice_newVsPublished: stats(G.dates, n.a, pub, until + '~', '9999'),
  };
}
// --- prices_macro.json: DXY_INV = 10000 / DX-Y.NYB sul calendario NYSE ---
const M = R('main_prices_macro.json');
{
  const run = (Y) => inverse(align(Y.parse(raw('DX-Y.NYB'), { keepOpenCrypto: true, nowSec: now }), M.dates));
  const o = run(OLD), n = run(NEW);
  const pub = M.tickers.DXY_INV.close;
  const last = M.dates.at(-1);
  res.macro_DXY_INV = {
    newVsOld: stats(M.dates, n, o, M.dates[0], last),
    oldVsPublished: stats(M.dates, o, pub, M.dates[0], last),
    newVsPublished: stats(M.dates, n, pub, M.dates[0], last),
    // lettura: con la data vecchia il valore del giorno d è la chiusura del giorno dopo? quota di sedute in cui il
    // valore vecchio coincide con quello nuovo della seduta successiva
    oldEqualsNextNew: o.filter((v, i) => i + 1 < n.length && v != null && v === n[i + 1] && v !== n[i]).length,
  };
}
console.log(JSON.stringify(res, null, 1));
