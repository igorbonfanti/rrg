import fs from 'node:fs';
const W = process.argv[2]; const V = await import(W + '/js/vix.js');
const a = V.vxSeries(JSON.parse(fs.readFileSync(process.argv[3])).series.VIX), b = V.vxSeries(JSON.parse(fs.readFileSync(process.argv[4])).series.VIX);
const m = new Map(a.dates.map((d, i) => [d, a.val[i]]));
b.dates.forEach((d, i) => { if (m.get(d) !== b.val[i]) console.log(d, m.get(d), '->', b.val[i]); });
console.log('fred', a.fred, '->', b.fred, 'righe', a.dates.length, b.dates.length);
