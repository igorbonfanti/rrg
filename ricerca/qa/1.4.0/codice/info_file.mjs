// Riassunto di data/emerging.json nella cartella corrente: asOf, serie mancanti, righe e F di KRW=X.
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('data/emerging.json'));
const { emSeries, cleanFx, fxSignals } = await import(process.cwd() + '/js/emerging.js');
const k = d.series['KRW=X']; let s = '';
if (k) { const x = emSeries(k), g = fxSignals(cleanFx('KRW=X', x)); s = ` · KRW=X ${x.dates.length} righe dal ${x.dates[0]}, F ultimo ${g.F.at(-1)}, z ultimo ${g.z.at(-1)?.toFixed(3)}`; }
console.log(`   file: asOf ${JSON.stringify(d.asOf)} · missing ${JSON.stringify(d.missing)}${s}`);
