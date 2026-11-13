// fedcache.mjs — parte Fed dei cambi in data/emerging.json contro la cache FRED del backtest (ricerca/emergenti/cache):
// stesse date e stessi valori fino all'ultima data comune; e DTWEXEMEGS: quante date e quanto differiscono (revisioni).
// Uso: node fedcache.mjs <copia> <emerging.json>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const [DIR, F] = process.argv.slice(2);
const { emSeries } = await import(pathToFileURL(`${DIR}/js/emerging.js`).href);
const em = JSON.parse(fs.readFileSync(F, 'utf8'));
const cache = (s) => JSON.parse(fs.readFileSync(`${DIR}/ricerca/emergenti/cache/${s}.json`, 'utf8')).rows;
const MAP = { 'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS', 'HKD=X': 'DEXHKUS', DTWEXEMEGS: 'DTWEXEMEGS' };
for (const [sym, id] of Object.entries(MAP)) {
  const s = emSeries(em.series[sym]), upto = s.fred || s.dates.at(-1);
  const rows = cache(id).filter((r) => r[0] >= s.dates[0] && r[1] > 0);
  const last = rows.at(-1)[0], to = upto < last ? upto : last;
  const a = new Map(s.dates.map((d, i) => [d, s.val[i]]).filter(([d]) => d <= to)), b = new Map(rows.filter((r) => r[0] <= to));
  let onlyA = 0, onlyB = 0, dv = 0, maxRel = 0;
  for (const [d, v] of a) { if (!b.has(d)) onlyA++; else if (Math.abs(b.get(d) - v) > 1e-9) { dv++; maxRel = Math.max(maxRel, Math.abs(b.get(d) / v - 1)); } }
  for (const d of b.keys()) if (!a.has(d)) onlyB++;
  console.log(`${sym.padEnd(11)} fino al ${to}: ${a.size} date app, ${b.size} cache; solo app ${onlyA}, solo cache ${onlyB}, valori diversi ${dv}${dv ? ` (max ${(100 * maxRel).toFixed(3)}%)` : ''}`);
}
