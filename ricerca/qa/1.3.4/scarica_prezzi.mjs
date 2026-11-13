// Revisione 1.3.4: scarica da Yahoo (scripts/lib/yahoo.js fetchDaily) le chiusure dei membri di oggi del Nasdaq-100
// dal 2003, in ricerca/qa/1.3.4/prezzi/<ticker>.json (dates, close). Lanciare con NODE_USE_ENV_PROXY=1 dietro proxy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { fetchDaily } = await import(path.join(ROOT, 'scripts/lib/yahoo.js'));
const OUT = path.join(ROOT, 'ricerca/qa/1.3.4/prezzi');
const tickers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/index_members/NDX.json'), 'utf8')).tickers;
const p1 = Date.parse('2003-01-01') / 1000, p2 = Date.parse('2026-10-31') / 1000;
let ok = 0;
for (const t of tickers) {
  const f = path.join(OUT, t + '.json');
  if (fs.existsSync(f)) { ok++; continue; }
  try {
    const r = await fetchDaily(t, { period1: p1, period2: p2 });
    fs.writeFileSync(f, JSON.stringify({ dates: r.dates, close: r.close }));
    ok++;
  } catch (e) { console.log(t, 'errore', e.message); }
  await new Promise((r) => setTimeout(r, 250));
}
console.log(`scaricati ${ok}/${tickers.length}`);
