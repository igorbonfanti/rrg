import fs from 'node:fs';
import { expandRLE } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const br = R('data/breadth.json');
const L = br.dates.length;
function cov(key) {
  const s = br.series[key]; const n = expandRLE(s.n, L), m = expandRLE(s.members, L);
  const by = {};
  br.dates.forEach((d, i) => { const y = d.slice(0, 4); if (!m[i]) return; (by[y] = by[y] || []).push(n[i] / m[i]); });
  return Object.entries(by).map(([y, a]) => `${y}:${(100 * Math.min(...a)).toFixed(0)}-${(100 * a.reduce((x, z) => x + z, 0) / a.length).toFixed(0)}`).join(' ');
}
console.log('SPX copertura per anno (min-media %):', cov('SPX'));
for (const k of ['XLRE', 'XLC', 'XLE']) console.log(k, cov(k));
const cfg = R('config/indices.json').indices;
const IX = { ...R('data/indices.json').series, ...R('data/indices_more.json').series };
for (const k of Object.keys(cfg)) {
  const X = indexSeries(IX[k]); const f = X.pct200.findIndex((v) => v != null);
  const c0 = X.n[f] / X.members[f]; const last = X.n.filter(Boolean).length;
  console.log(k.padEnd(9), cfg[k].composition, 'inizio', X.dates[f], 'copertura iniziale', (100 * c0).toFixed(0) + '%', 'oggi', (100 * X.n.at(-1) / X.members.at(-1)).toFixed(1) + '%', 'prezzo dal', X.dates[0]);
}
