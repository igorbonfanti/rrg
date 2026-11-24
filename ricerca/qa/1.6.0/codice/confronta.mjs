// Confronta due data/vix.json: serie per serie, date, valori, campi; uso: node confronta.mjs A.json B.json
import fs from 'node:fs';
import { decodeDates, deltaDecode } from '../../../../js/indexdata.js';
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const dec = (x) => (x && x.cd ? { dates: decodeDates(x.d0, x.gaps), val: deltaDecode(x.cd, x.ps || 1) } : null);
console.log('asOf A', JSON.stringify(a.asOf)); console.log('asOf B', JSON.stringify(b.asOf));
console.log('missing A', a.missing, 'B', b.missing);
for (const k of new Set([...Object.keys(a.series), ...Object.keys(b.series)])) {
  const x = a.series[k], y = b.series[k];
  if (!x || !y) { console.log(k, 'solo in', x ? 'A' : 'B'); continue; }
  const same = JSON.stringify(x) === JSON.stringify(y);
  const X = dec(x), Y = dec(y), m = new Map(Y.dates.map((d, i) => [d, Y.val[i]]));
  let diff = [], onlyA = X.dates.filter((d) => !m.has(d)), onlyB = Y.dates.filter((d) => !X.dates.includes(d));
  X.dates.forEach((d, i) => { if (m.has(d) && Math.abs(m.get(d) - X.val[i]) > 1e-9) diff.push([d, X.val[i], m.get(d)]); });
  console.log(`${k}: identica=${same} ps ${x.ps}/${y.ps} righe ${X.dates.length}/${Y.dates.length} fred ${x.fred}/${y.fred} last ${x.last}/${y.last} soloA ${onlyA.slice(-3)} soloB ${onlyB.slice(-3)} valori diversi ${diff.length}`, diff.slice(0, 3), diff.slice(-3));
}
