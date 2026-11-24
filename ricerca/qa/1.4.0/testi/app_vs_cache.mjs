// Controllo testi 1.4.0: il README dice che il porting dà «gli stessi valori del backtest». La verifica è sui dati della
// cache del backtest (storia Yahoo dal 2000-2001); l'app usa data/emerging.json (storia dopo l'ultimo buco oltre 35 giorni).
// Qui: F e stato della valuta calcolati dall'app sui due insiemi di dati, sulle date comuni.
// Uso: node ricerca/qa/1.4.0/testi/app_vs_cache.mjs <cartella della cache di scarica.mjs>
import fs from 'node:fs';
const W = new URL('../../../../', import.meta.url).pathname, CACHE = process.argv[2];
const E = await import(W + 'js/emerging.js');
const d = JSON.parse(fs.readFileSync(W + 'data/emerging.json', 'utf8'));
for (const s of ['CNY=X', 'INR=X', 'BRL=X', 'KRW=X', 'TWD=X']) {
  const rows = JSON.parse(fs.readFileSync(`${CACHE}/${s.replace(/[^A-Za-z0-9]/g, '_')}.json`)).rows;
  const A = E.cleanFx(s, E.emSeries(d.series[s])), B = E.cleanFx(s, { dates: rows.map((r) => r[0]), val: rows.map((r) => r[1]) });
  const fa = E.fxSignals(A), fb = E.fxSignals(B), mb = new Map(B.dates.map((x, i) => [x, i]));
  let n = 0, diff = 0, nullA = 0, first = null, last = null, valDiff = 0;
  A.dates.forEach((x, i) => {
    const j = mb.get(x); if (j == null) return;
    if (Math.abs(A.val[i] / B.val[j] - 1) > 1e-4) valDiff++;
    const sa = E.fxState(fa.F[i], fa.z[i]), sb = E.fxState(fb.F[j], fb.z[j]);
    if (sb == null) return; n++;
    if (sa == null) { nullA++; return; }
    if (sa !== sb) { diff++; first = first || x; last = x; }
  });
  console.log(`${s}: date comuni con stato nella cache ${n}; nell'app «—» ${nullA}; stato diverso ${diff}${diff ? ` (dal ${first} al ${last})` : ''}; valori del cambio diversi ${valDiff}`);
}
