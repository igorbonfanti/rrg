// Controllo testi 1.4.0: (1) il tooltip di «Normale» dice «Nessun calo forte della valuta nelle ultime 13 settimane»:
// quante sedute «Normale» hanno avuto z ≥ 1 nelle 63 sedute prima? (2) HKD=X resta tra 7,75 e 7,85 dal 18/05/2005?
// Uso: node ricerca/qa/1.4.0/testi/normale_hkd.mjs
import fs from 'node:fs';
const W = new URL('../../../../', import.meta.url).pathname;
const E = await import(W + 'js/emerging.js');
const d = JSON.parse(fs.readFileSync(W + 'data/emerging.json', 'utf8')), cfg = JSON.parse(fs.readFileSync(W + 'config/emerging.json', 'utf8'));
for (const k of cfg.order) {
  const c = cfg.indices[k]; if (!c.fx || c.peg) continue;
  const S = E.cleanFx(c.fx, E.emSeries(d.series[c.fx])), f = E.fxSignals(S);
  let norm = 0, conCalo = 0, es = null;
  for (let i = 0; i < S.dates.length; i++) {
    if (E.fxState(f.F[i], f.z[i]) !== 'normale') continue; norm++;
    let hit = false; for (let j = Math.max(0, i - 62); j < i; j++) if (f.z[j] != null && f.z[j] >= 1) hit = true;
    if (hit) { conCalo++; es = es || S.dates[i]; }
  }
  const j = S.dates.length - 1; let mx = -Infinity; for (let i = j - 62; i <= j; i++) if (f.z[i] != null) mx = Math.max(mx, f.z[i]);
  console.log(`${k}: sedute «Normale» ${norm}, di cui con z ≥ 1 nelle 13 settimane prima ${conCalo} (${(100 * conCalo / norm).toFixed(1)}%), prima ${es}; z massimo delle ultime 63 sedute ${mx.toFixed(2)}`);
}
const H = E.cleanFx('HKD=X', E.emSeries(d.series['HKD=X']));
let lo = Infinity, hi = -Infinity, out = 0;
H.dates.forEach((x, i) => { if (x >= '2005-05-18') { lo = Math.min(lo, H.val[i]); hi = Math.max(hi, H.val[i]); if (H.val[i] < 7.75 || H.val[i] > 7.85) out++; } });
console.log(`HKD=X dal 18/05/2005: minimo ${lo}, massimo ${hi}, sedute fuori da 7,75-7,85: ${out}`);
