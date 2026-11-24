// js/vix.js (app) contro lo script di ricerca: stessi episodi e stesse statistiche della variante «ingresso il giorno
// dopo» (ricerca/vix/regimi/risultati.json, sensitivity.SPX_VIX_nextDay), sugli stessi dati della cache della ricerca.
// Tolleranza 0,01: la ricerca arrotonda ogni rendimento a 2 decimali prima della mediana, l'app no.
// Uso: node ricerca/vix/verifica_app.mjs   (dopo ricerca/vix/regimi/script/scarica.mjs e regimi.mjs)
import fs from 'node:fs';
const W = new URL('../../', import.meta.url).pathname;
const V = await import(W + 'js/vix.js');
const rows = (f) => JSON.parse(fs.readFileSync(W + 'ricerca/vix/cache/' + f)).rows.filter((r) => r[1] != null);
const ser = (r) => ({ dates: r.map((x) => x[0]), val: r.map((x) => x[1]) });
const R = JSON.parse(fs.readFileSync(W + 'ricerca/vix/regimi/risultati.json'));
const ref = R.sensitivity.SPX_VIX_nextDay;
const A = V.align(ser(rows('_GSPC.json')), ser(rows('VIXCLS.json')));
const app = V.regimes(A);
let n = 0, bad = 0;
const near = (a, b, what) => { n++; const ok = a == null ? b == null : b != null && Math.abs(a - b) < 0.0101; if (!ok) { bad++; console.log('DIVERSO', what, a, b); } };
for (const X of V.XS) {
  const t = ref.thresholds[X], s = t.stats || t, a = app.thr[X].stats;
  near(app.thr[X].episodes.length, t.nEpisodes, `${X} episodi`);
  for (const h of V.HS) { near(a[h].n, s[h].n, `${X} n${h}`); near(a[h].posN, s[h].posN, `${X} positivi ${h}`); near(a[h].median, s[h].median, `${X} mediana ${h}`); }
  near(a.dd.median, s.dd.median, `${X} calo mediano`); near(a.dd.worst, s.dd.worst, `${X} calo peggiore`);
}
for (const h of V.HS) { near(app.base[h].median, ref.base[h].median, `base mediana ${h}`); near(app.base[h].posN, ref.base[h].posN, `base positivi ${h}`); }
console.log(`${n} confronti, ${bad} diversi`);
process.exit(bad ? 1 : 0);
