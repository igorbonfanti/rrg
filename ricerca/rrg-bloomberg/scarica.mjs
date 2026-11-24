// Scarica da Yahoo (stesso modulo della pipeline, scripts/lib/yahoo.js) le serie giornaliere
// degli 11 ETF SPDR, di SPY, dell'indice S&P 500 (^GSPC) e degli 11 indici settoriali S&P 500 (^SP500-xx),
// con la chiusura solo prezzo (rettificata per gli split) e quella rettificata per i dividendi.
// Uso: node ricerca/rrg-bloomberg/scarica.mjs   → ricerca/rrg-bloomberg/cache/yahoo.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from '../../scripts/lib/yahoo.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const ETF = ['XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU'];
// codici GICS dei settori: indice S&P 500 di settore su Yahoo (^SP500-xx), ETF corrispondente
export const INDEX = { '^SP500-45': 'XLK', '^SP500-50': 'XLC', '^SP500-25': 'XLY', '^SP500-30': 'XLP', '^SP500-10': 'XLE',
  '^SP500-40': 'XLF', '^SP500-35': 'XLV', '^SP500-20': 'XLI', '^SP500-15': 'XLB', '^SP500-60': 'XLRE', '^SP500-55': 'XLU' };
const SYMS = [...ETF, 'SPY', '^GSPC', ...Object.keys(INDEX)];

const out = { fetched: new Date().toISOString(), series: {} };
await mapLimit(SYMS, 4, async (s) => {
  try {
    const r = await fetchDaily(s, { range: '5y', raw: true });
    // gli indici di settore su Yahoo hanno di solito una sola barra (11/11/2026): si tengono solo se c'è la storia
    if (r.dates.length < 200) { console.log(s, 'storia assente su Yahoo:', r.dates.length, 'barre'); return; }
    out.series[s] = { dates: r.dates, close: r.close, adjclose: r.adjclose };
    console.log(s, r.dates.length, r.dates.at(-1));
  } catch (e) { console.log(s, 'non disponibile:', e.message); }
});
fs.writeFileSync(path.join(DIR, 'cache', 'yahoo.json'), JSON.stringify(out));
