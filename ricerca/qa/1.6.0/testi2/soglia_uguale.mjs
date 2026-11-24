// Controllo testi 1.6.0, secondo giro: i conteggi di backwardation della guida (478 contro 795, 91%) usano «> 1»
// (ricerca/vix/struttura/dati/dati.mjs, riga `sI = ... > 1`), l'app usa «da 1 in su» (≥ 1). Questo script copia
// dati.mjs in una cartella temporanea, cambia solo la soglia in ≥ 1 e stampa i conteggi con le due regole.
// Uso: node ricerca/qa/1.6.0/testi2/soglia_uguale.mjs <cartella-copia>
// dove <cartella-copia> contiene scripts/, js/, data/, *.json della radice e ricerca/vix/struttura/dati/ (con cache/).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const C = process.argv[2];
const src = path.join(C, 'ricerca/vix/struttura/dati/dati.mjs');
const orig = fs.readFileSync(src, 'utf8');
const hook = `\nconsole.log('CONTEGGI ' + JSON.stringify({ sedute: CAL.length, dal: CAL[0], al: CAL.at(-1), vix_vix3m: sI.filter(Boolean).length, vx1_vx2: sF.filter(Boolean).length, entrambi: CAL.filter((d, i) => sI[i] && sF[i]).length, uguali: agree, quota: +(agree / CAL.length).toFixed(4), R_uguale_1: CAL.filter((d) => RI.get(d) === 1).length, VX1_uguale_VX2: CAL.filter((d) => RF.get(d) === 1).length }));\nprocess.exit(0);\n`;
const anchor = 'const lvl = pearson(';
const run = (txt, tag) => {
  const f = path.join(C, 'ricerca/vix/struttura/dati/_controllo_' + tag + '.mjs');
  fs.writeFileSync(f, txt.replace(anchor, hook + anchor));
  const out = execFileSync('node', [f], { cwd: C, encoding: 'utf8', maxBuffer: 1e8 });
  fs.unlinkSync(f);
  return JSON.parse(out.split('\n').find((l) => l.startsWith('CONTEGGI ')).slice(9));
};
const a = run(orig, 'gt');
const b = run(orig.replace('const sI = CAL.map((d) => RI.get(d) > 1), sF = CAL.map((d) => RF.get(d) > 1);', 'const sI = CAL.map((d) => RI.get(d) >= 1), sF = CAL.map((d) => RF.get(d) >= 1);'), 'ge');
console.log(JSON.stringify({ 'regola della ricerca (> 1)': a, 'regola dell\'app (>= 1)': b }, null, 1));
