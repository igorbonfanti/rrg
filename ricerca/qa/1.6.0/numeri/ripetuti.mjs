// Valori uguali consecutivi in data/vix.json: veri (fonte quasi uguale) o ricopiati? E effetto della precisione salvata
// del rapporto HYG/IEF (5 decimali) sulla distanza dal massimo. Uso: node ripetuti.mjs
import fs from 'node:fs'; import path from 'node:path';
import { HERE, yahoo, decodeFile, ddAt } from './lib.mjs';
const J = JSON.parse(fs.readFileSync(path.join(HERE, '../../../../data/vix.json'), 'utf8'));
const h = yahoo('y_HYG.json', 'adjclose'), i = yahoo('y_IEF.json', 'adjclose');
const FC = decodeFile(J.series.HYGIEF);
for (let k = 1; k < FC.val.length; k++) if (FC.val[k] === FC.val[k - 1]) { const a = FC.dates[k - 1], b = FC.dates[k]; console.log(`credito ${a}→${b}: file ${FC.val[k]} · fonte ${(h.get(a) / i.get(a)).toFixed(7)} → ${(h.get(b) / i.get(b)).toFixed(7)} · HYG ${h.get(a).toFixed(4)}→${h.get(b).toFixed(4)} IEF ${i.get(a).toFixed(4)}→${i.get(b).toFixed(4)}`); }
// distanza dal massimo dal file contro dalla fonte di oggi, tutte le sedute
const src = FC.dates.map((d) => h.get(d) / i.get(d));
let mx = 0; for (let k = 251; k < FC.val.length; k++) { const a = ddAt(FC.val.slice(0, k + 1)), b = ddAt(src.slice(0, k + 1)); mx = Math.max(mx, Math.abs(a - b)); }
console.log('massima differenza della distanza dal massimo, file contro fonte (punti %):', mx.toFixed(5));
// VIX3M: 3 o più valori uguali di fila?
const F3 = decodeFile(J.series.VIX3M); let run = 1, maxRun = 1; for (let k = 1; k < F3.val.length; k++) { run = F3.val[k] === F3.val[k - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
console.log('VIX3M: serie più lunga di valori uguali di fila:', maxRun);
