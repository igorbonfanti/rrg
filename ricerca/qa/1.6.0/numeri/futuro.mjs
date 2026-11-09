// Il controllo «nessun dato futuro» (passato.cjs) può fallire? Percentili delle date di prova calcolati con TUTTA la
// storia (anche futura) contro quelli con la storia fino a quel giorno: se diversi all'unità mostrata, passato.cjs li distingue.
import fs from 'node:fs'; import path from 'node:path'; import { HERE } from './lib.mjs';
const S = JSON.parse(fs.readFileSync(path.join(HERE, 'ricalcolo.json'), 'utf8')).series;
const all = (k) => Object.values(S).map((x) => x[k]).filter((x) => x != null);
const R = all('r'), ND = all('dd').map((x) => -x);
const full = (arr, x) => 100 * arr.filter((y) => y <= x).length / arr.length;
let distinti = 0, n = 0;
for (const D of ['2010-05-20', '2011-08-08', '2015-08-24', '2018-02-08', '2020-03-16', '2022-10-12', '2025-04-08']) {
  const e = S[D], a = full(R, e.r), b = full(ND, -e.dd);
  n += 2; if (Math.round(a) !== Math.round(e.rPct)) distinti++; if (Math.round(b) !== Math.round(e.ddPct)) distinti++;
  console.log(D, 'R pct allora', e.rPct.toFixed(1), 'con il futuro', a.toFixed(1), '· calo pct allora', e.ddPct.toFixed(1), 'con il futuro', b.toFixed(1));
}
console.log(`${distinti} su ${n} percentili diversi all'unità: passato.cjs fallirebbe con dati futuri`);
