// chiusure di S&P 500 e Nasdaq-100 in data/vix.json contro data/indices.json (vista Indici)
import fs from 'node:fs';
const W = process.argv[2];
const V = await import(W + '/js/vix.js'); const { indexSeries } = await import(W + '/js/indexdata.js');
const X = JSON.parse(fs.readFileSync(process.argv[3])), I = JSON.parse(fs.readFileSync(W + '/data/indices.json')).series;
for (const k of ['SPX', 'NDX']) {
  const a = V.vxSeries(X.series[k]), b = indexSeries(I[k]); const m = new Map(b.dates.map((d, i) => [d, b.close[i]]));
  let n = 0, diff = 0, miss = 0, max = 0;
  a.dates.forEach((d, i) => { if (d < '2000-01-01') return; if (!m.has(d)) { miss++; return; } n++; const e = Math.abs(a.val[i] - m.get(d)); if (e > 0.011) diff++; max = Math.max(max, e); });
  const extra = b.dates.filter((d) => d >= '2000-01-01' && !a.dates.includes(d)).length;
  console.log(k, `sedute comuni dal 2000: ${n}, diverse oltre 1 centesimo: ${diff}, scarto max ${max.toFixed(4)}, solo in vix.json: ${miss}, solo in indices.json: ${extra}`);
}
