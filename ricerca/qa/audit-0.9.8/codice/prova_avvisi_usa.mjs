// L10 (audit 0.9.0): gli avvisi sui prezzi USA sospetti non scattano a vuoto sui dati di oggi (5 anni di storia).
// Uso: node ricerca/qa/audit-0.9.8/codice/prova_avvisi_usa.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { marketIndex, repairSpikes } = await import(path.join(ROOT, 'scripts/fetch_data.js'));
for (const f of ['prices.json', 'prices_global.json', 'prices_macro.json']) {
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f)));
  const closes = Object.fromEntries(Object.entries(p.tickers).filter(([, t]) => !t.synthetic).map(([s, t]) => [s, t.close]));
  const mkt = marketIndex(Object.values(closes), p.dates.length);
  let n = 0;
  for (const [s, c] of Object.entries(closes)) for (const x of repairSpikes(c, mkt).fixes) { n++; console.log(f, s, p.dates[x.i], x.from, '→', x.to); }
  console.log(`${f}: ${n} prezzi segnalati`);
}
