import fs from 'node:fs';
const [wt, f] = process.argv.slice(2);
const V = await import(wt + '/js/vix.js');
const X = JSON.parse(fs.readFileSync(f));
for (let r = 0; r < 3; r++) {
  const t0 = performance.now();
  const vix = V.vxSeries(X.series.VIX); const o = {};
  for (const k of ['SPX', 'NDX']) { const A = V.align(V.vxSeries(X.series[k]), vix); o[k] = { R: V.regimes(A), S: V.scatter(A) }; }
  const t1 = performance.now(); const A = V.align(V.vxSeries(X.series.SPX), vix); V.today(A); const t2 = performance.now();
  console.log(`build regimes+scatter ${(t1 - t0).toFixed(0)} ms, today ${(t2 - t1).toFixed(0)} ms`);
}
