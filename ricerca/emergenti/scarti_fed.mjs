// Scarto tra i cambi di Yahoo usati dall'app (data/emerging.json dopo cleanFx) e i cambi H.10 della Federal Reserve
// (FRED, cache del backtest in ricerca/emergenti/cache/), alla stessa data: sedute con scarto oltre il 3%, per anno.
// Serve alla nota «Fonti» della vista 8. Uso: node ricerca/emergenti/scarti_fed.mjs (dopo backtest/script/scarica.mjs)
import fs from 'node:fs';
import { emSeries, cleanFx } from '../../js/emerging.js';

const R = (f) => JSON.parse(fs.readFileSync(new URL('../../' + f, import.meta.url)));
const E = R('data/emerging.json').series;
const FED = { 'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS', 'HKD=X': 'DEXHKUS' };
for (const [sym, id] of Object.entries(FED)) {
  const file = new URL(`cache/${id}.json`, import.meta.url);
  if (!fs.existsSync(file)) { console.log(sym, `manca la cache ${id}`); continue; }
  const fed = new Map(JSON.parse(fs.readFileSync(file)).rows.filter((r) => r[1] > 0));
  const s = cleanFx(sym, emSeries(E[sym]));
  const byYear = {};
  let n = 0, common = 0;
  s.dates.forEach((d, i) => {
    if (!fed.has(d)) return;
    common++;
    if (Math.abs(Math.log(s.val[i] / fed.get(d))) > 0.03) { n++; byYear[d.slice(0, 4)] = (byYear[d.slice(0, 4)] || 0) + 1; }
  });
  console.log(sym.padEnd(6), `date in comune ${common}, oltre il 3%: ${n}`, JSON.stringify(byYear));
}
