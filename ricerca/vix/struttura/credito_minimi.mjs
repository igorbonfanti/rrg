// Calo più profondo del credito high yield (HYG contro IEF, distanza dal massimo di 252 sedute, la misura della vista VIX)
// nelle crisi: i numeri «−41% nel 2008» e «−29% nel 2020» della guida. Usa le funzioni dell'app su data/vix.json.
// Uso: node ricerca/vix/struttura/credito_minimi.mjs [data/vix.json]
import fs from 'node:fs';
const W = new URL('../../../', import.meta.url).pathname;
const V = await import(W + 'js/vix.js');
const d = JSON.parse(fs.readFileSync(W + (process.argv[2] || 'data/vix.json')));
const A = V.align(V.vxSeries(d.series.SPX), V.vxSeries(d.series.VIX)), C = V.context(A, V.vxSeries(d.series.VIX3M), V.vxSeries(d.series.HYGIEF));
const out = {};
for (const [k, a, b] of [['2008', '2008-01-01', '2009-12-31'], ['2020', '2020-01-01', '2020-12-31'], ['2022', '2022-01-01', '2022-12-31'], ['2025', '2025-01-01', '2025-12-31']]) {
  let m = null;
  A.dates.forEach((x, i) => { if (x >= a && x <= b && C.dd[i] != null && (m == null || C.dd[i] < C.dd[m])) m = i; });
  out[k] = { data: A.dates[m], calo: +C.dd[m].toFixed(2) };
}
console.log(JSON.stringify(out));
