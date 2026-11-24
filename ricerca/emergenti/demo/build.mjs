// Demo della vista «Emergenti» (prototipo, NON è l'app): prepara demo-data.json con dati reali.
// Fonti: dati dell'app (data/indices*.json, macchina a stati di js/signals.js con config/thresholds.json e config/indices.json),
// cambi Yahoo e DTWEXEMEGS di FRED dalla cache del backtest (node ricerca/emergenti/backtest/script/scarica.mjs),
// ETF in dollari da Yahoo (scaricati qui in cache/demo/). Definizioni di F e D: quelle di backtest/script/backtest.mjs.
// Forza relativa: rrgNew di js/engine.js (formula «Nuova» della rotazione) su chiusure settimanali dell'ETF contro ACWI.
// Uso: node ricerca/emergenti/demo/build.mjs → ricerca/emergenti/demo/demo-data.json
import fs from 'node:fs';
import { priceSeries, runMachine, DEFAULT_PARAMS } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';
import { rrgNew, weeklyIndices, quadrant } from '../../../js/engine.js';
import { computeF, computeD, INDICES, CCY, USD } from '../backtest/script/backtest.mjs';

const ROOT = new URL('../../../', import.meta.url);
const R = (f) => JSON.parse(fs.readFileSync(new URL(f, ROOT)));
const P = { ...DEFAULT_PARAMS, ...R('config/thresholds.json').params };
const CFG = R('config/indices.json').indices;
const IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
const cache = (s) => R('ricerca/emergenti/cache/' + s.replace(/[^A-Za-z0-9]/g, '_') + '.json');
const DAY = 86400000;
const ETF = { CSI300: 'ASHR', NIFTY50: 'INDA', IBOV: 'EWZ', KOSPI200: 'EWY', TWN: 'EWT', HSI: 'EWH', EEM: 'EEM' };
const WIN = 756; // sedute mostrate nei grafici (circa 3 anni)

// ---- ETF in dollari (Yahoo, data nel fuso della borsa) ----
const DC = new URL('ricerca/emergenti/cache/demo/', ROOT); fs.mkdirSync(DC, { recursive: true });
async function etf(sym) {
  const f = new URL(sym + '.json', DC);
  if (!fs.existsSync(f)) {
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=10y&interval=1d`;
    const j = (await (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })).json()).chart.result[0];
    const tz = j.meta.exchangeTimezoneName, ac = j.indicators.adjclose[0].adjclose;
    const rows = []; j.timestamp.forEach((t, i) => { if (ac[i] != null) rows.push([new Date(t * 1000).toLocaleDateString('en-CA', { timeZone: tz }), ac[i]]); });
    fs.writeFileSync(f, JSON.stringify(rows));
  }
  return new Map(JSON.parse(fs.readFileSync(f)));
}
const acwi = await etf('ACWI');

// ---- cambi e dollaro (stessa pulizia minima del backtest non serve qui: si usa la serie della cache così com'è) ----
const AS_OF = R('data/indices.json').asOf; // tutto si ferma alla data dei dati dell'app, per coerenza
function series(sym) { const rows = cache(sym).rows.filter((r) => r[0] <= AS_OF); const dates = rows.map((r) => r[0]), val = rows.map((r) => r[1]); const brk = new Array(dates.length).fill(0); for (let i = 1; i < dates.length; i++) brk[i] = brk[i - 1] + ((Date.parse(dates[i]) - Date.parse(dates[i - 1])) / DAY > 10 ? 1 : 0); return { sym, dates, val, brk }; }
function zSeries(S, w = 63, sdN = 756) { // stessa z del backtest (variazione a 63 sedute / dev. std. sulle 756 precedenti)
  const n = S.val.length, lr = S.val.map((v, i) => (i >= w && S.brk[i] === S.brk[i - w] ? Math.log(v / S.val[i - w]) : null)), z = new Array(n).fill(null);
  for (let i = sdN; i < n; i++) { const a = lr.slice(i - sdN + 1, i + 1).filter((x) => x != null); if (a.length < 0.9 * sdN || lr[i] == null) continue; const m = a.reduce((s, x) => s + x, 0) / a.length; const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); z[i] = lr[i] / sd; }
  return z;
}
const DTW = series('DTWEXEMEGS'), Darr = computeD(DTW);
const sma200 = DTW.val.map((_, i) => (i >= 199 ? DTW.val.slice(i - 199, i + 1).reduce((s, x) => s + x, 0) / 200 : null));
const nD = DTW.val.length, dLast = nD - 1;
const dollar = {
  last: DTW.dates[dLast], value: DTW.val[dLast], sma200: sma200[dLast], ch63: (DTW.val[dLast] / DTW.val[dLast - 63] - 1) * 100, D: Darr[dLast],
  dates: DTW.dates.slice(-WIN), val: DTW.val.slice(-WIN), sma: sma200.slice(-WIN), Dser: Darr.slice(-WIN),
};

const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const out = { generated: new Date().toISOString(), asOf: R('data/indices.json').asOf, dollar, indices: {} };
for (const k of INDICES) {
  const X = indexSeries(IX[k]), px = priceSeries(X.close), m = runMachine(px, X, CFG[k].blue, P);
  const n = X.dates.length, t = n - 1, from = Math.max(0, n - WIN);
  const o = { name: CFG[k].name, blue: CFG[k].blue, state: m.days[t], breadth: X.pct200[t], members: X.n[t], dd: px.dd[t], close: X.close[t], date: X.dates[t] };
  o.ch21 = (X.close[t] / X.close[t - 21] - 1) * 100; o.ch63 = (X.close[t] / X.close[t - 63] - 1) * 100;
  o.dates = X.dates.slice(from); o.closeSer = X.close.slice(from).map(r2); o.breadthSer = X.pct200.slice(from); o.days = m.days.slice(from);
  o.events = m.events.filter((e) => e.t >= from && (e.code === 'setup' || e.code === 'trig' || e.code === 'fail')).map((e) => ({ d: X.dates[e.t], code: e.code }));
  if (USD[k]) { // indice in dollari (stessa data del cambio, altrimenti nullo)
    const S = series(USD[k]), mp = new Map(S.dates.map((d, i) => [d, S.val[i]]));
    o.usdSer = o.dates.map((d, i) => (o.closeSer[i] != null && mp.has(d) ? r2(o.closeSer[i] / mp.get(d)) : null));
    const lastU = o.usdSer.findLast((x) => x != null), i63 = o.usdSer.length - 1 - 63; o.ch63usd = lastU && o.usdSer[i63] ? (lastU / o.usdSer[i63] - 1) * 100 : null;
  } else { o.usdSer = o.closeSer; o.ch63usd = o.ch63; }
  if (CCY[k]) {
    const S = series(CCY[k]), F = computeF(S), z = zSeries(S), j = S.val.length - 1;
    const st = F[j] == null || z[j] == null ? null : F[j] ? 'ferma' : z[j] >= 1 ? 'calo' : 'normale';
    o.fx = { sym: CCY[k], last: S.dates[j], value: S.val[j], z: z[j], F: F[j], state: st, dates: S.dates.slice(-WIN), val: S.val.slice(-WIN), zSer: z.slice(-WIN).map(r2), Fser: F.slice(-WIN) };
  } else o.fx = { state: k === 'HSI' ? 'agganciato' : 'dollari' };
  // forza relativa: ETF contro ACWI, settimanale, formula Nuova
  const e = await etf(ETF[k]), dd = [...e.keys()].filter((d) => acwi.has(d) && d <= AS_OF).sort();
  const wi = weeklyIndices(dd), ws = wi.map((i) => e.get(dd[i])), wb = wi.map((i) => acwi.get(dd[i]));
  const rr = rrgNew(ws, wb), L = wi.length - 1;
  o.rs = { etf: ETF[k], last: dd[wi[L]], ratio: rr.rsRatio[L], mom: rr.rsMomentum[L], quad: rr.rsRatio[L] == null ? null : quadrant(rr.rsRatio[L], rr.rsMomentum[L]), trail: Array.from({ length: 10 }, (_, q) => L - 9 + q).map((i) => [r2(rr.rsRatio[i]), r2(rr.rsMomentum[i])]) };
  out.indices[k] = o;
}
fs.writeFileSync(new URL('demo-data.json', import.meta.url), JSON.stringify(out));
for (const [k, o] of Object.entries(out.indices)) console.log(k, o.date, o.state, o.breadth?.toFixed(1), 'fx', o.fx.state, o.fx.z?.toFixed(2), 'rs', o.rs.quad, o.rs.ratio?.toFixed(1), o.rs.mom?.toFixed(1));
console.log('dollaro EM', dollar.last, dollar.value.toFixed(2), 'sma200', dollar.sma200.toFixed(2), 'ch63', dollar.ch63.toFixed(2), 'D', dollar.D);
