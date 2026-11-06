#!/usr/bin/env node
/*
 * scarica.mjs — download grezzi per la verifica dei dati del VIX (fase di verifica, nessuna modifica all'app).
 * Salva le risposte così come arrivano in ricerca/vix/cache/inserimento/ (cartella ignorata da git, condivisa con gli altri
 * agenti: qui si scrive solo nella sottocartella inserimento/). Un file già presente non si riscarica, salvo --refresh.
 *
 * Fonti:
 *  - FRED (fredgraph.csv): VIXCLS, VXNCLS, NASDAQ100, SP500 — CSV con "." o vuoto per i giorni senza valore;
 *  - Cboe (cdn.cboe.com, file ufficiali dell'emittente): VIX_History.csv, VXN_History.csv;
 *  - Yahoo chart v8 (risposta JSON intera, con meta): ^VIX, ^VXN, ^GSPC, ^NDX giornalieri dal 1985; ^VIX, ^VXN e ^GSPC a
 *    5 minuti sugli ultimi 5 giorni (orari delle barre) e sugli ultimi 60 (VIX alle 16:00 contro le 16:15);
 *  - ALFRED (vintage di VIXCLS e VXNCLS a date scelte): ritardo di pubblicazione e revisioni.
 * Uso: node ricerca/vix/inserimento/scarica.mjs [--refresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../cache/inserimento');
fs.mkdirSync(OUT, { recursive: true });
const REFRESH = process.argv.includes('--refresh');
const UA = { 'User-Agent': 'Mozilla/5.0 (sector-monitor research)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, file) {
  const f = path.join(OUT, file);
  if (!REFRESH && fs.existsSync(f) && fs.statSync(f).size > 0) return 'cache';
  let err;
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      fs.writeFileSync(f, t);
      return `${(t.length / 1024).toFixed(0)} KB`;
    } catch (e) { err = e; await sleep(1500 * 2 ** a); }
  }
  return `ERRORE ${err.message}`;
}

const now = Math.floor(Date.now() / 1000);
const jobs = [
  ['https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS', 'fred_VIXCLS.csv'],
  ['https://fred.stlouisfed.org/graph/fredgraph.csv?id=VXNCLS', 'fred_VXNCLS.csv'],
  ['https://fred.stlouisfed.org/graph/fredgraph.csv?id=NASDAQ100', 'fred_NASDAQ100.csv'],
  ['https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500', 'fred_SP500.csv'],
  ['https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv', 'cboe_VIX.csv'],
  ['https://cdn.cboe.com/api/global/us_indices/daily_prices/VXN_History.csv', 'cboe_VXN.csv'],
];
for (const s of ['^VIX', '^VXN', '^GSPC', '^NDX']) {
  jobs.push([`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=473385600&period2=${now}&interval=1d&includeAdjustedClose=true`, `yahoo_${s.slice(1)}_1d.json`]);
}
// QQQ e SPY (chiusure solo per gli split): terzo termine di paragone per i giorni in cui ^NDX/^GSPC di Yahoo e FRED differiscono
for (const s of ['QQQ', 'SPY']) jobs.push([`https://query1.finance.yahoo.com/v8/finance/chart/${s}?period1=473385600&period2=${now}&interval=1d&includeAdjustedClose=true`, `yahoo_${s}_1d.json`]);
for (const s of ['^VIX', '^GSPC', '^VXN']) {
  jobs.push([`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=5m&includePrePost=true`, `yahoo_${s.slice(1)}_5m.json`]);
  // 60 giorni a 5 minuti (il massimo di Yahoo per questo intervallo): VIX alle 16:00 contro la chiusura delle 16:15
  jobs.push([`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=60d&interval=5m`, `yahoo_${s.slice(1)}_5m_60d.json`]);
}
// vintage ALFRED: ogni giorno di calendario di quattro finestre (ritardo di pubblicazione: ultima osservazione presente in
// ogni vintage) più vintage annuali (revisioni della storia)
const days = [];
const span = (a, b) => { for (let t = Date.parse(a); t <= Date.parse(b); t += 864e5) days.push(new Date(t).toISOString().slice(0, 10)); };
span('2024-03-01', '2024-03-31'); span('2025-04-01', '2025-04-30'); span('2025-12-15', '2026-01-10'); span('2026-10-01', '2026-11-06');
const yearly = ['2012-01-03', '2015-01-05', '2018-01-02', '2020-01-02', '2022-01-03', '2024-01-02', '2025-01-02', '2026-01-02'];
for (const id of ['VIXCLS']) for (const v of [...new Set([...days, ...yearly])]) jobs.push([`https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=${id}&vintage_date=${v}`, `alfred_${id}_${v}.csv`]);
for (const v of yearly) jobs.push([`https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=VXNCLS&vintage_date=${v}`, `alfred_VXNCLS_${v}.csv`]);

let i = 0;
const log = [];
async function worker() {
  while (i < jobs.length) {
    const [u, f] = jobs[i++];
    const r = await get(u, f);
    log.push(`${f}: ${r}`);
    if (r !== 'cache') await sleep(200);
  }
}
await Promise.all([worker(), worker(), worker()]);
const bad = log.filter((x) => /ERRORE/.test(x));
console.log(`${jobs.length} file, ${bad.length} errori`);
for (const x of bad) console.log(x);
fs.writeFileSync(path.join(OUT, '_scaricato.json'), JSON.stringify({ at: new Date().toISOString(), log }, null, 1));
