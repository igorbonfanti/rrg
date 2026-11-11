#!/usr/bin/env node
/*
 * scarica.mjs — ricerca SOXX, passo 1: membri di oggi e prezzi.
 *
 *  - Holdings del SOXX dal CSV pubblico di iShares (https://www.ishares.com/us/products/239705/x/latest-holdings.csv,
 *    lo stesso tipo di file che l'app usa per IWM, EEM ed EWT): si tengono le righe "Equity" e si scrive
 *    ricerca/soxx/dati/membri_oggi.json (simbolo, nome, peso, paese, borsa).
 *  - Chiusure giornaliere da Yahoo (endpoint chart, la funzione fetchDaily dell'app in scripts/lib/yahoo.js) dal
 *    01/01/1990 per: membri di oggi, membri delle fotografie Wikipedia del SOX (composizioni.json), SOXX, ^SOX e
 *    000660.KS (SK Hynix a Seul, solo per confronto). close = rettificata per gli split, adjclose = anche per i dividendi.
 *    Le serie vanno nella cartella cache passata come argomento (fuori dal repository: sono dati di Yahoo).
 *
 * Uso: node ricerca/soxx/dati/script/scarica.mjs CACHE_DIR [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from '../../../../scripts/lib/yahoo.js';
import { parseIShares } from '../../../../scripts/lib/members.js';
import { parseCSV } from '../../../../scripts/fetch_breadth.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..');
const cache = process.argv[2];
if (!cache) { console.error('uso: node scarica.mjs CACHE_DIR [--force]'); process.exit(1); }
fs.mkdirSync(cache, { recursive: true });
const force = process.argv.includes('--force');
const URL = 'https://www.ishares.com/us/products/239705/x/latest-holdings.csv';

// 1. holdings
const r = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor research)' }, signal: AbortSignal.timeout(30000) });
if (!r.ok) throw new Error(`holdings HTTP ${r.status}`);
const text = await r.text();
const asOf = (text.match(/Fund Holdings as of,"([^"]+)"/) || [])[1];
const tickers = parseIShares(text, parseCSV); // stessa funzione dell'app (righe Equity, simboli con il trattino)
const lines = text.replace(/^﻿/, '').split(/\r?\n/);
const rows = parseCSV(lines.slice(lines.findIndex((l) => l.startsWith('Ticker,'))).join('\n')).filter((x) => x['Asset Class'] === 'Equity');
const membri = rows.map((x) => ({ ticker: x.Ticker.trim(), nome: x.Name, peso: +x['Weight (%)'], paese: x.Location, borsa: x.Exchange }));
fs.writeFileSync(path.join(OUT, 'membri_oggi.json'), JSON.stringify({ fonte: URL, asOf, scaricato: new Date().toISOString().slice(0, 10), count: tickers.length, tickers, membri }, null, 1));
console.log(`SOXX al ${asOf}: ${tickers.length} titoli`);

// 2. prezzi
const comp = JSON.parse(fs.readFileSync(path.join(OUT, 'composizioni.json'), 'utf-8'));
const wiki = new Set();
for (const w of comp.wikipedia) {
  if (w.membri) for (const m of w.membri) { if (m.yahoo) wiki.add(m.yahoo); }
  else for (const t of w.tickers) wiki.add((w.yahooAlias || {})[t] || t);
}
const symbols = [...new Set(['SOXX', '^SOX', '000660.KS', ...tickers, ...wiki])].sort();
const file = (s) => path.join(cache, encodeURIComponent(s) + '.json');
const res = await mapLimit(symbols, 3, async (s) => {
  if (!force && fs.existsSync(file(s))) return 'cache';
  try {
    const p = await fetchDaily(s, { period1: 631152000, raw: true, retries: 4 });
    fs.writeFileSync(file(s), JSON.stringify({ symbol: s, currency: p.meta.currency, tz: p.meta.exchangeTimezoneName, dates: p.dates, close: p.close, adjclose: p.adjclose }));
    return `${p.dates.length} sedute ${p.dates[0]} → ${p.dates.at(-1)}`;
  } catch (e) {
    fs.writeFileSync(file(s), JSON.stringify({ symbol: s, dates: [], close: [], adjclose: [], error: String(e.message || e) }));
    return `ERRORE ${e.message}`;
  }
}, 250);
symbols.forEach((s, i) => console.log(s.padEnd(10), res[i]));
