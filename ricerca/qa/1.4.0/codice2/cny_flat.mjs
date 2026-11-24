// cny_flat.mjs — barre della coda di Yahoo uguali alla precedente (chiusura ripetuta), con il valore della Fed della stessa data.
// Uso: node cny_flat.mjs <cartella cache di mock_fetch.mjs> [simbolo, es. CNY_X] [serie FRED, es. DEXCHUS]
import fs from 'node:fs';
import { parse } from '../../../../scripts/lib/yahoo.js';
const [cache, sym = 'CNY_X', fred = 'DEXCHUS'] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(`${cache}/yahoo_${sym}_tail.txt`, 'utf8')).chart.result[0], p = parse(r, {});
const fed = new Map(fs.readFileSync(`${cache}/fred_${fred}.txt`, 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')).map(([d, v]) => [d, +v]));
let n = 0;
for (let i = 1; i < p.close.length; i++) if (p.close[i] === p.close[i - 1]) { n++; console.log(p.dates[i], p.close[i].toFixed(4), 'Fed', fed.get(p.dates[i]) ?? '—'); }
console.log(`${n} barre ripetute su ${p.dates.length}`);
