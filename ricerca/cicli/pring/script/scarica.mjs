#!/usr/bin/env node
/*
 * scarica.mjs — dati per lo studio «Pring/Murphy: obbligazioni, poi azioni, poi materie prime» (ricerca, non tocca l'app).
 *
 * Scarica in ricerca/cicli/pring/cache/ (esclusa da git):
 *  - FRED (fredgraph.csv?id=..., dati pubblici della Federal Reserve Bank of St. Louis e delle agenzie che li producono;
 *    le serie della Fed, del BLS, dell'EIA e del NBER sono di pubblico dominio o liberamente riutilizzabili; le serie
 *    IMF (PCOPPUSDM) sono di libero uso con citazione): elenco in FRED_IDS;
 *  - Yahoo Finance (scripts/lib/yahoo.js, endpoint chart): ^GSPC giornaliero dal 1927 e ^TNX giornaliero dal 1962 (solo
 *    controllo incrociato del decennale);
 *  - World Bank, Commodity Price Data «Pink Sheet» (CC BY 4.0): file mensile xlsx, solo per una serie di controllo
 *    (indice delle materie prime non energetiche dal 1960) e per l'oro (dal 1960; prezzo fisso fino al 1971).
 *
 * Uso: node ricerca/cicli/pring/script/scarica.mjs [--refresh]
 *   Senza --refresh non riscarica i file già presenti.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily } from '../../../../scripts/lib/yahoo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.resolve(HERE, '..', 'cache');
const REFRESH = process.argv.includes('--refresh');
fs.mkdirSync(CACHE, { recursive: true });

export const FRED_IDS = [
  'GS10', 'DGS10', // decennale USA, media mensile (dal 1953) e giornaliero (dal 1962)
  'WPUID62', 'WPUSOP1000', // PPI materie prime grezze (unprocessed goods for intermediate demand, ex crude materials)
  'PPIACO', 'WPU102', 'WPUID621', 'WPUID622', // PPI tutte le merci; metalli non ferrosi; grezzi alimentari; grezzi non alimentari (dal 1967)
  'WTISPLC', 'PCOPPUSDM', 'PALLFNFINDEXM', // petrolio WTI; rame (IMF, dal 1992); indice IMF di tutte le materie prime (dal 1992)
  'TWEXMMTH', 'TWEXBMTH', 'DTWEXAFEGS', 'DTWEXBGS', // dollaro: valute principali e ampio (1973-2019), AFE e ampio (dal 2006)
  'USREC', 'USRECM', // recessioni NBER
  'M1109BUSM293NNBR', // Dow Jones industriale 1914-1968 (NBER Macrohistory), controllo dell'S&P 500
  'INDPRO', // produzione industriale (Fed): solo prova di Bry-Boschan contro le date NBER (prove.py)
];

// FRED risponde 503 allo User-Agent predefinito di Node: si usa un nome generico
const UA = { 'User-Agent': 'ricerca-dati/1.0', Accept: '*/*' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fred(id) {
  const f = path.join(CACHE, `fred_${id}.csv`);
  if (!REFRESH && fs.existsSync(f)) return;
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      if (!t.startsWith('observation_date')) throw new Error('risposta non CSV');
      fs.writeFileSync(f, t);
      console.log(`FRED ${id}: ${t.trim().split('\n').length - 1} righe`);
      return;
    } catch (e) {
      if (a === 3) throw new Error(`FRED ${id}: ${e.message}`);
      await sleep(1000 * 2 ** a);
    }
  }
}

async function yahoo(sym, from) {
  const f = path.join(CACHE, `yahoo_${sym.replace(/[^A-Za-z0-9]/g, '_')}.json`);
  if (!REFRESH && fs.existsSync(f)) return;
  const d = await fetchDaily(sym, { period1: Math.floor(Date.parse(from) / 1000), raw: true });
  fs.writeFileSync(f, JSON.stringify({ symbol: sym, scaricato: new Date().toISOString(), dates: d.dates, close: d.close }));
  console.log(`Yahoo ${sym}: ${d.dates.length} sedute, ${d.dates[0]} .. ${d.dates[d.dates.length - 1]}`);
}

async function worldBank() {
  const f = path.join(CACHE, 'wb_CMO-Historical-Data-Monthly.xlsx');
  if (!REFRESH && fs.existsSync(f)) return;
  const page = await (await fetch('https://www.worldbank.org/en/research/commodity-markets', { headers: UA, signal: AbortSignal.timeout(60000) })).text();
  const m = page.match(/https:\/\/thedocs\.worldbank\.org[^"']*CMO-Historical-Data-Monthly\.xlsx/);
  if (!m) { console.log('World Bank: link non trovato, salto'); return; }
  const r = await fetch(m[0], { headers: UA, signal: AbortSignal.timeout(120000) });
  if (!r.ok) { console.log(`World Bank: HTTP ${r.status}, salto`); return; }
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  fs.writeFileSync(path.join(CACHE, 'wb_url.txt'), m[0] + '\n');
  console.log(`World Bank: ${m[0]}`);
}

for (const id of FRED_IDS) await fred(id);
await yahoo('^GSPC', '1927-01-01');
await yahoo('^TNX', '1962-01-01');
await worldBank();
fs.writeFileSync(path.join(CACHE, 'scaricato.txt'), new Date().toISOString() + '\n');
