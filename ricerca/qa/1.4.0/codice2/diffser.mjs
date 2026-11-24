// diffser.mjs — differenze serie per serie tra due data/emerging.json (date e valori decodificati)
import fs from 'node:fs';
import { decodeDates, deltaDecode } from '../../../../js/indexdata.js';
const [a, b] = process.argv.slice(2).map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));
const dec = (x) => { const d = decodeDates(x.d0, x.gaps), v = deltaDecode(x.cd, x.ps || 1); return new Map(d.map((t, i) => [t, v[i]])); };
for (const k of new Set([...Object.keys(a.series), ...Object.keys(b.series)])) {
  const x = a.series[k], y = b.series[k];
  if (!x || !y) { console.log(k, 'solo in uno dei due'); continue; }
  if (JSON.stringify(x) === JSON.stringify(y)) continue;
  const mx = dec(x), my = dec(y), diff = [];
  for (const d of new Set([...mx.keys(), ...my.keys()])) {
    const u = mx.get(d), v = my.get(d);
    if (u !== v) diff.push([d, u, v]);
  }
  diff.sort((p, q) => (p[0] < q[0] ? -1 : 1));
  const meta = ['d0', 'last', 'fred', 'ps', 'adj'].filter((f) => x[f] !== y[f]).map((f) => `${f}: ${x[f]} → ${y[f]}`);
  console.log(`${k}: ${diff.length} date diverse${meta.length ? ' · ' + meta.join(', ') : ''}`);
  for (const r of diff.slice(0, 4)) console.log('   ', r.join('  '));
  if (diff.length > 8) { console.log('    …'); for (const r of diff.slice(-3)) console.log('   ', r.join('  ')); }
}
