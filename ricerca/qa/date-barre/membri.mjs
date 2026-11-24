/*
 * membri.mjs — stesso confronto di misura.mjs sui titoli degli indici (breadth degli indici) e sugli ETF settoriali USA:
 * 4 titoli per indice (primo, due centrali, ultimo dell'elenco in data/index_members) e gli 11 Select Sector SPDR.
 * Conta le barre la cui data cambia tra il metodo vecchio (gmtoffset di oggi) e quello nuovo (fuso della borsa).
 * Uso: node ricerca/qa/date-barre/membri.mjs [range]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OLD from './yahoo_prima.js';
import * as NEW from '../../../scripts/lib/yahoo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '../../../data/index_members');
const range = process.argv[2] || '5y';
const syms = [];
for (const f of fs.readdirSync(DIR)) {
  const t = JSON.parse(fs.readFileSync(path.join(DIR, f))).tickers.filter((s) => !s.startsWith('!'));
  const pick = [...new Set([t[0], t[t.length >> 2], t[(3 * t.length) >> 2], t.at(-1)])].filter(Boolean);
  syms.push(...pick.map((s) => [f.replace('.json', ''), s]));
}
for (const s of ['XLB', 'XLC', 'XLE', 'XLF', 'XLI', 'XLK', 'XLP', 'XLRE', 'XLU', 'XLV', 'XLY']) syms.push(['settori', s]);
const tot = { symbols: 0, bars: 0, shifted: 0, failed: [] };
const rows = [];
for (const [idx, raw] of syms) {
  const s = idx === 'settori' || /^[A-Z.]+$/.test(raw) && !raw.includes('.') ? raw.replace(/\./g, '-') : raw;
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=1d&includeAdjustedClose=true`, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor qa)' } });
    const res = (await r.json()).chart.result[0];
    const a = OLD.parse(res), b = NEW.parse(res);
    const n = a.dates.length === b.dates.length ? a.dates.filter((d, i) => d !== b.dates[i]).length : `lunghezze ${a.dates.length}/${b.dates.length}`;
    rows.push(`${idx.padEnd(9)} ${s.padEnd(12)} ${res.meta.exchangeTimezoneName.padEnd(20)} barre ${String(b.dates.length).padStart(5)}  spostate ${n}`);
    tot.symbols++; tot.bars += b.dates.length; if (typeof n === 'number') tot.shifted += n; else tot.shifted = `${tot.shifted}+?`;
  } catch (e) { tot.failed.push(`${s} (${e.message})`); }
  await new Promise((r) => setTimeout(r, 150));
}
console.log(rows.join('\n'));
console.log(JSON.stringify(tot));
