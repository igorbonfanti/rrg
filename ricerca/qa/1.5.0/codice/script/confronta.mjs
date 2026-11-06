// confronto app (js/vix.js) contro ricalcolo Python indipendente
import fs from 'node:fs';
const [wt, dataF, pyF] = process.argv.slice(2);
const V = await import(wt + '/js/vix.js');
const X = JSON.parse(fs.readFileSync(dataF)), P = JSON.parse(fs.readFileSync(pyF));
const vix = V.vxSeries(X.series.VIX);
let n = 0, bad = 0;
const eq = (a, b, w) => { n++; const ok = (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-6); if (!ok) { bad++; console.log('DIVERSO', w, a, b); } };
for (const k of ['SPX', 'NDX']) {
  const A = V.align(V.vxSeries(X.series[k]), vix), R = V.regimes(A), S = V.scatter(A), T = V.today(A), p = P[k];
  for (const x of V.XS) {
    const t = R.thr[x], q = p.thr[x];
    eq(t.episodes.length, q.n_eps, `${k} ${x} episodi`);
    if (JSON.stringify(t.episodes.map((e) => e.date)) !== JSON.stringify(q.dates)) { bad++; console.log('DIVERSO date episodi', k, x); } n++;
    for (const h of V.HS) { const s = t.stats[h]; eq(s.n, q[h][0], `${k} ${x} n ${h}`); eq(s.posN, q[h][1], `${k} ${x} pos ${h}`); eq(s.median, q[h][2], `${k} ${x} med ${h}`); eq(s.p10, q[h][3], `${k} ${x} p10 ${h}`); }
    t.episodes.forEach((e, i) => { const d = q.det[i]; if (!d) return; eq(e.vix, d[1], k+x+' vix'); eq(e.vixMax, d[2], k+x+' vixMax'); if (e.end !== d[3]) { bad++; console.log('DIVERSO fine', k, x, e.end, d[3]); } n++; eq(e.dd, d[4], k+x+' dd'); eq(e.toMin, d[5], k+x+' toMin'); if (e.partial !== d[6]) { bad++; console.log('DIVERSO parziale', k, x, e.date); } n++; V.HS.forEach((h, z) => eq(e.ret[h], d[7][z], k+x+' ret'+h)); });
    eq(t.stats.dd.n, q.dd[0], `${k} ${x} dd n`); eq(t.stats.dd.median, q.dd[1], `${k} ${x} dd med`); eq(t.stats.dd.worst, q.dd[2], `${k} ${x} dd worst`); eq(t.stats.toMin, q.toMin, `${k} ${x} toMin`);
  }
  for (const h of V.HS) { const b = R.base[h]; eq(b.n, p.base[h][0], `${k} base n ${h}`); eq(b.posN, p.base[h][1], `${k} base pos ${h}`); eq(b.median, p.base[h][2], `${k} base med ${h}`); eq(b.p10, p.base[h][3], `${k} base p10 ${h}`); }
  eq(R.base.dd.median, p.base.dd, `${k} base dd`);
  eq(S.pts.length, p.scatter[0], `${k} scatter n`); eq(S.pts.filter((q) => q.ret > 0).length, p.scatter[1], `${k} scatter pos`); eq(S.open, p.scatter[2], `${k} scatter open`);
  if (k === 'SPX') {
    if (T.date !== p.today[0]) { bad++; console.log('DIVERSO data oggi'); } n++;
    eq(T.vix, p.today[1], 'vix oggi'); eq(T.pct, p.today[2], 'pct oggi'); eq(T.rv, p.today[3], 'rv oggi'); eq(T.prem, p.today[4], 'prem oggi'); eq(T.premPct, p.today[5], 'premPct oggi');
    for (const [d, v] of Object.entries(p.rv_samples)) eq(T.rvSeries[A.dates.indexOf(d)], v, `rv ${d}`);
    for (const [d, v] of Object.entries(p.vp_samples)) eq(T.vixPctSeries[A.dates.indexOf(d)], v, `vp ${d}`);
    for (const [d, v] of Object.entries(p.pp_samples)) eq(T.premPctSeries[A.dates.indexOf(d)], v, `pp ${d}`);
  }
}
console.log(`${n} confronti, ${bad} diversi`);
process.exit(bad ? 1 : 0);
