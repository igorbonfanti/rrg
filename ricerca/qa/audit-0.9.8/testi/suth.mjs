import fs from 'node:fs';
import { breadthSeries } from '../../../../js/signals.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const sec = R('data/sectors.json'), br = R('data/breadth.json');
console.log(Object.keys(br), Object.keys(br.series), Object.keys(sec));
const B = breadthSeries(br, 'XLU', sec.dates);
for (const d of ['2018-04-27', '2018-07-27', '2020-05-22']) { const i = sec.dates.indexOf(d); console.log(d, B.pct200[i]?.toFixed(2), B.above200[i], B.n[i]); }
// copertura dei membri per anno
const S = br.series.SPX; console.log(Object.keys(S));
