// Le chiusure pubblicate (data/prices.json di main) dei 22 ticker USA rifatte con parse() nuovo: stessa data, stesso valore?
// Uso: node confronto_prices.mjs <repoRoot> <cacheDir> <prices.json>
import fs from 'node:fs'; import path from 'node:path';
const [root, cache, file] = process.argv.slice(2);
const NEW = await import(path.join(root, 'scripts/lib/yahoo.js'));
const P = JSON.parse(fs.readFileSync(file, 'utf-8'));
let n = 0, eq = 0, miss = 0; const bad = [];
for (const [s, t] of Object.entries(P.tickers)) {
  const res = JSON.parse(fs.readFileSync(path.join(cache, 'inv', `${s}_5y.json`), 'utf-8'));
  const p = NEW.parse(res); const m = new Map(p.dates.map((d, i) => [d, p.adjclose[i]]));
  P.dates.forEach((d, i) => { if (t.close[i] == null) return; if (!m.has(d)) { miss++; return; } n++; if (Math.abs(m.get(d) / t.close[i] - 1) < 1e-4) eq++; else bad.push([s, d, t.close[i], m.get(d)]); });
}
console.log(JSON.stringify({ file, confrontati: n, uguali: eq, dataNonTrovata: miss, diversi: bad.length, esempi: bad.slice(0, 8) }));
