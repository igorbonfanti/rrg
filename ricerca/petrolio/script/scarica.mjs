#!/usr/bin/env node
/*
 * scarica.mjs — download dei dati per il backtest «shock petroliferi e cali dell'S&P 500» (ricerca, nessuna modifica all'app).
 * Salva le risposte così come arrivano in ricerca/petrolio/cache/ (ignorata da git). Un file già presente non si riscarica,
 * salvo --refresh. In cache/_scaricato.json: ora del download e stato HTTP.
 * Fonti:
 *  - FRED fredgraph.csv: WTISPLC (WTI spot mensile dal 1946), MCOILWTICO, MCOILBRENTEU (medie mensili EIA),
 *    DCOILWTICO, DCOILBRENTEU (giornalieri EIA), CPIAUCSL (CPI), USREC (recessioni NBER), SP500 (solo ultimi 10 anni).
 *  - Yahoo chart v8: ^GSPC giornaliero e mensile dal 1927, CL=F e BZ=F giornalieri (seconda fonte del petrolio).
 * Uso: node ricerca/petrolio/script/scarica.mjs [--refresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'cache');
fs.mkdirSync(OUT, { recursive: true });
const REFRESH = process.argv.includes('--refresh');
const UA = { 'User-Agent': 'Mozilla/5.0 (research script)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOG_F = path.join(OUT, '_scaricato.json');
const log = fs.existsSync(LOG_F) ? JSON.parse(fs.readFileSync(LOG_F, 'utf8')) : {};

async function get(url, file) {
  const f = path.join(OUT, file);
  if (!REFRESH && fs.existsSync(f) && fs.statSync(f).size > 0) return 'cache';
  let err;
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(90000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      fs.writeFileSync(f, t);
      log[file] = { url, at: new Date().toISOString(), status: r.status };
      return `${(t.length / 1024).toFixed(0)} KB`;
    } catch (e) { err = e; await sleep(1500 * 2 ** a); }
  }
  return `ERRORE ${err.message}`;
}

const FRED = ['WTISPLC', 'MCOILWTICO', 'MCOILBRENTEU', 'DCOILWTICO', 'DCOILBRENTEU', 'CPIAUCSL', 'USREC', 'SP500'];
const jobs = FRED.map((id) => [`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, `fred_${id}.csv`]);
const now = Math.floor(Date.now() / 1000);
const y = (s, iv, p1) => [`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=${p1}&period2=${now}&interval=${iv}&includeAdjustedClose=true`, `yahoo_${s.replace('^', '').replace('=', '')}_${iv}.json`];
jobs.push(y('^GSPC', '1d', -1388534400), y('^GSPC', '1mo', -1388534400), y('CL=F', '1d', 946684800), y('BZ=F', '1d', 946684800));
for (const [u, f] of jobs) console.log(f.padEnd(28), await get(u, f));
fs.writeFileSync(LOG_F, JSON.stringify(log, null, 1));
