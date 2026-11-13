// L'unico indice settoriale S&P 500 con la storia su Yahoo (11/11/2026) è il Real Estate (^SP500-60).
// Qui la nostra rotazione settimanale (medie semplici e nuova) dell'indice contro l'indice S&P 500 (^GSPC),
// accanto a XLRE, con la settimana in corso (fino al 10/11) e con la settimana chiusa al 06/11.
// Serve al confronto indice contro indice con la RRG di Bloomberg (S5RLST contro SPX): vedi README.md.
// Uso: node ricerca/rrg-bloomberg/indice_immobiliare.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../../js/engine.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const Y = JSON.parse(fs.readFileSync(path.join(DIR, 'cache', 'yahoo.json'), 'utf-8')).series;
const I = Y['^SP500-60'];
if (!I || I.dates.join() !== Y.SPY.dates.join()) throw new Error('serie ^SP500-60 assente o con date diverse');
for (const cut of ['2026-11-10', '2026-11-06']) {
  const n = Y.SPY.dates.filter((d) => d <= cut).length;
  const ds = { dates: Y.SPY.dates.slice(0, n), tickers: { B: { close: Y['^GSPC'].close.slice(0, n) }, 'S&P 500 Real Estate': { close: I.close.slice(0, n) }, 'XLRE (solo prezzo)': { close: Y.XLRE.close.slice(0, n) } } };
  for (const f of ['semplice', 'nuova']) {
    const m = build(ds, { symbols: Object.keys(ds.tickers).filter((s) => s !== 'B'), benchmark: 'B', timeframe: 'weekly', formula: f });
    const L = m.dates.length - 1;
    console.log(`fino al ${cut}, ${f}, ultime 4 barre ${m.dates.slice(-4).join(' ')}`);
    for (const [s, r] of Object.entries(m.series)) console.log(`  ${s.padEnd(20)} ${[3, 2, 1, 0].map((k) => `${r.x[L - k].toFixed(2)}/${r.y[L - k].toFixed(2)}`).join('  ')}`);
  }
}
