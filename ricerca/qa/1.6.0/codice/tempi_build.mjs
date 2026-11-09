// Tempo di build() della vista VIX (stessi passi di js/vix-view.js) e di context() da solo; uso: node tempi_build.mjs vix.json
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import * as V from '../../../../js/vix.js';
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const runs = 5, t = { build: [], context: [] };
for (let r = 0; r < runs; r++) {
  const t0 = performance.now();
  const vix = V.vxSeries(data.series.VIX), out = {};
  for (const k of ['SPX', 'NDX']) { const A = V.align(V.vxSeries(data.series[k]), vix); out[k] = { A, R: V.regimes(A), S: V.scatter(A) }; }
  out.today = V.today(out.SPX.A);
  const t1 = performance.now();
  out.ctx = V.context(out.SPX.A, V.vxSeries(data.series.VIX3M), V.vxSeries(data.series.HYGIEF));
  const t2 = performance.now();
  t.build.push(t2 - t0); t.context.push(t2 - t1);
  if (r === 0) console.log('now', JSON.stringify(out.ctx.now), 'has3m', out.ctx.has3m, 'hasCredit', out.ctx.hasCredit);
}
console.log('build ms', t.build.map((x) => x.toFixed(0)).join(' '), '| context ms', t.context.map((x) => x.toFixed(0)).join(' '));
