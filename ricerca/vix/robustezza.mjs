// «Robusto» nella vista VIX: una soglia supera il criterio della ricerca (ricerca/vix/regimi/regimi.md) in TUTTE le
// varianti provate: quiete di 21, 63 o 126 sedute e ingresso alla chiusura del giorno del segnale o del giorno dopo.
// Criterio: almeno 8 episodi con 12 mesi; mediana a 252 sedute ≥ base + 5 punti oppure quota di positivi ≥ base + 15
// punti; nella stessa direzione in almeno 2 dei sottoperiodi 1990-2007, 2008-2015, 2016-oggi che hanno episodi.
// Calcoli con js/vix.js (le stesse funzioni dell'app) su data/vix.json. Uso: node ricerca/vix/robustezza.mjs
import fs from 'node:fs';
const W = new URL('../../', import.meta.url).pathname;
const V = await import(W + 'js/vix.js');
const d = JSON.parse(fs.readFileSync(W + (process.argv[2] || 'data/vix.json')));
const SUB = [['1990-01-01', '2007-12-31'], ['2008-01-01', '2015-12-31'], ['2016-01-01', '2099-12-31']];
const vix = V.vxSeries(d.series.VIX);
const out = {};
for (const k of ['SPX', 'NDX']) {
  const A = V.align(V.vxSeries(d.series[k]), vix);
  const from = A.dates[A.vix.findIndex((v) => v != null)];
  const baseOf = (entry, a, b) => V.dist(A.dates.map((dd, p) => (dd >= from && dd >= a && dd <= b && p + entry + 252 < A.close.length ? (A.close[p + entry + 252] / A.close[p + entry] - 1) * 100 : null)));
  out[k] = {};
  for (const X of V.XS) {
    const vars = [];
    for (const Q of [21, 63, 126]) for (const entry of [0, 1]) {
      const eps = V.episodes(A, X, Q, entry), r = V.dist(eps.map((e) => e.ret[252])), base = baseOf(entry, '0000', '9999');
      const passMed = r.median != null && r.median - base.median >= 5, passPos = r.pos != null && r.pos - base.pos >= 15;
      const subs = SUB.map(([a, b]) => { const s = V.dist(eps.filter((e) => e.date >= a && e.date <= b).map((e) => e.ret[252])); const bb = baseOf(entry, a, b); return s.n ? { dMed: s.median - bb.median, dPos: s.pos - bb.pos } : null; }).filter(Boolean);
      const agree = (passMed && subs.filter((s) => s.dMed > 0).length >= 2) || (passPos && subs.filter((s) => s.dPos > 0).length >= 2);
      const pass = r.n >= 8 && (passMed || passPos) && subs.length >= 2 && agree;
      vars.push({ Q, entry, n: r.n, dMed: r.median == null ? null : +(r.median - base.median).toFixed(1), dPos: r.pos == null ? null : +(r.pos - base.pos).toFixed(1), pass });
    }
    out[k][X] = { robust: vars.every((v) => v.pass), app: vars.find((v) => v.Q === 63 && v.entry === 1).pass, passed: vars.filter((v) => v.pass).length, of: vars.length, vars };
    console.log(k, X, 'robusto', out[k][X].robust, '| regola dell\'app (63, giorno dopo)', out[k][X].app, `| varianti superate ${out[k][X].passed}/${out[k][X].of}`, vars.map((v) => `${v.Q}/${v.entry}:${v.pass ? 'sì' : 'no'}`).join(' '));
  }
}
fs.writeFileSync(new URL('robustezza.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
