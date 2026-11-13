// Valori attesi per il controllo dei grafici 1.6.0, calcolati qui senza le funzioni di calcolo dell'app
// (si usa solo vxSeries per decodificare il formato compatto di data/vix.json).
// Uso: node ricerca/qa/1.6.0/grafici/attesi.mjs   (dalla radice del repository)  -> stampa JSON
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { vxSeries } = await import(path.join(ROOT, 'js/vix.js'));
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vix.json')));
const S = Object.fromEntries(Object.keys(d.series).map((k) => [k, vxSeries(d.series[k])]));
const map = (s) => new Map(s.dates.map((x, i) => [x, s.val[i]]));
const mV = map(S.VIX), m3 = map(S.VIX3M), mC = map(S.HYGIEF);
const dates = S.SPX.dates, close = S.SPX.val;
const vix = dates.map((x) => (mV.has(x) ? mV.get(x) : null));
const v3 = dates.map((x) => (m3.has(x) ? m3.get(x) : null));
const r = dates.map((x, i) => (vix[i] != null && v3[i] != null ? vix[i] / v3[i] : null));
const cr = dates.map((x) => (mC.has(x) ? mC.get(x) : null));
// distanza dal massimo delle ultime 252 osservazioni valide (oggi compreso)
const dd = dates.map(() => null); const obs = [];
cr.forEach((v, i) => { if (v == null) return; obs.push(v); if (obs.length >= 252) { const w = obs.slice(-252); dd[i] = (v / Math.max(...w) - 1) * 100; } });
// realizzata 21 sedute
const rv = dates.map((_, t) => { if (t < 21) return null; const rs = []; for (let k = t - 20; k <= t; k++) rs.push(Math.log(close[k] / close[k - 1])); const m = rs.reduce((a, b) => a + b) / 21; return Math.sqrt(rs.reduce((a, b) => a + (b - m) ** 2, 0) / 20) * Math.sqrt(252) * 100; });
// sedute in backwardation e fasce (sedute consecutive del calendario dell'S&P 500 con R >= 1)
const runs = []; let s = null;
r.forEach((v, i) => { if (v != null && v >= 1) { if (s == null) s = i; } else if (s != null) { runs.push([dates[s], dates[i - 1], i - s]); s = null; } });
if (s != null) runs.push([dates[s], dates.at(-1), dates.length - s]);
const at = (x) => { const i = dates.indexOf(x); return { date: x, i, spx: close[i], vix: vix[i], v3: v3[i], r: r[i], dd: dd[i], rv: rv[i], prem: vix[i] != null && rv[i] != null ? vix[i] - rv[i] : null }; };
const probe = ['2008-10-24', '2020-03-16', '2025-04-08', '2007-12-03', '2007-12-04', dates.at(-1), dates.at(-2)].map(at);
const backDays = r.filter((v) => v != null && v >= 1).length;
// sedute con VIX ma senza VIX3M (dopo il 2007-12-04) e viceversa
const gaps = dates.map((x, i) => [x, vix[i], v3[i]]).filter(([x, a, b]) => x >= '2007-12-04' && ((a == null) !== (b == null)));
const firstDd = dates[dd.findIndex((v) => v != null)];
const nullsAfter = (a, from) => dates.filter((x, i) => x >= from && a[i] == null).length;
console.log(JSON.stringify({ last: dates.at(-1), n: dates.length, backDays, runs: runs.length, runsList: runs, probe, gaps, firstDd, firstR: dates[r.findIndex((v) => v != null)], ddNullAfterFirst: nullsAfter(dd, firstDd), rNullAfter: nullsAfter(r, '2007-12-04'),
  rMax: Math.max(...r.filter((v) => v != null)), rMin: Math.min(...r.filter((v) => v != null)), ddMin: Math.min(...dd.filter((v) => v != null)) }, null, 1));
