// summary.mjs — riassunto di un data/emerging.json e confronto con il file di prima (stesso criterio di keep_unchanged.js)
import fs from 'node:fs';
const [f, prevF] = process.argv.slice(2);
const read = (p) => (p && p !== 'none' && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const j = read(f), p = read(prevF);
if (!j) { console.log('   file non scritto/assente'); process.exit(0); }
console.log(`   asOf ${JSON.stringify(j.asOf)} missing ${JSON.stringify(j.missing)}`);
const line = (x) => (x ? `${x.d0}..${x.last}${x.fred ? ' fed ' + x.fred : ''} n=${x.cd.length}` : '—');
for (const [k, x] of Object.entries(j.series)) {
  const q = p && p.series[k];
  const same = q && JSON.stringify(q) === JSON.stringify(x);
  console.log(`   ${k.padEnd(11)} ${line(x)}${q ? (same ? '  = prima' : `  (prima ${line(q)})`) : '  (nuova)'}`);
}
if (p) {
  const a = { ...j }, b = { ...p }; delete a.generated; delete b.generated;
  console.log(`   uguale al file di prima a parte generated: ${JSON.stringify(a) === JSON.stringify(b)}`);
}
