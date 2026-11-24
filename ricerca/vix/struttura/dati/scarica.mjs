#!/usr/bin/env node
/*
 * scarica.mjs — download grezzi per la verifica dei dati di «struttura a termine» e «credito» della vista VIX
 * (fase 1, verifica preliminare: nessuna modifica all'app).
 *
 * Salva le risposte così come arrivano in ricerca/vix/struttura/dati/cache/ (ignorata da git: ricerca/vix/.gitignore).
 * Un file già presente non si riscarica, salvo --refresh. In cache/_scaricato.json: ora del download, stato HTTP e
 * intestazione Last-Modified (serve per capire quando Cboe aggiorna i file).
 *
 * Fonti:
 *  - FRED fredgraph.csv: VXVCLS (VIX3M), VIXCLS, BAMLH0A0HYM2 (HY OAS ICE), BAMLC0A0CM (IG OAS ICE), BAA10Y, AAA10Y,
 *    DBAA, DAAA, DGS10, NFCI, NFCICREDIT; pagina HTML della serie (note, licenza, «Updated:»).
 *  - Cboe, file ufficiali dell'emittente: VIX, VIX3M, VIX9D, VIX6M (daily_prices/*_History.csv).
 *  - Cboe futures VX: elenco ufficiale dei contratti (product/list/VX: data di scadenza e tipo M = mensile, W = settimanale);
 *    file per contratto sul CDN (VX_AAAA-MM-GG.csv, solo i mensili); archivio vecchio CFE_<mese><aa>_VX.csv (2004-2012).
 *  - Yahoo chart v8 (JSON intero): ^VIX3M, ^VIX, ^GSPC dal 1990 (sedute), HYG, JNK, IEF, LQD (solo per un confronto).
 * Uso: node ricerca/vix/struttura/dati/scarica.mjs [--refresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'cache');
fs.mkdirSync(OUT, { recursive: true });
const REFRESH = process.argv.includes('--refresh');
const UA = { 'User-Agent': 'Mozilla/5.0 (sector-monitor research)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOG_F = path.join(OUT, '_scaricato.json');
const log = fs.existsSync(LOG_F) ? JSON.parse(fs.readFileSync(LOG_F, 'utf8')) : {};

async function get(url, file, { optional = false } = {}) {
  const f = path.join(OUT, file);
  if (!REFRESH && fs.existsSync(f) && fs.statSync(f).size > 0) return 'cache';
  let err;
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000) });
      if (r.status === 404 || r.status === 403) { log[file] = { url, at: new Date().toISOString(), status: r.status }; return `assente (${r.status})`; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      fs.writeFileSync(f, t);
      log[file] = { url, at: new Date().toISOString(), status: r.status, lastModified: r.headers.get('last-modified') };
      return `${(t.length / 1024).toFixed(0)} KB`;
    } catch (e) { err = e; await sleep(1500 * 2 ** a); }
  }
  if (optional) return `assente (${err.message})`;
  return `ERRORE ${err.message}`;
}

const FRED = ['VXVCLS', 'VIXCLS', 'BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAA10Y', 'AAA10Y', 'DBAA', 'DAAA', 'DGS10', 'NFCI', 'NFCICREDIT'];
const jobs = [];
for (const id of FRED) {
  jobs.push([`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, `fred_${id}.csv`]);
  jobs.push([`https://fred.stlouisfed.org/series/${id}`, `page_${id}.html`]);
}
for (const s of ['VIX', 'VIX3M', 'VIX9D', 'VIX6M']) jobs.push([`https://cdn.cboe.com/api/global/us_indices/daily_prices/${s}_History.csv`, `cboe_${s}.csv`]);
jobs.push(['https://www.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/', 'vx_product_list.json']);
const now = Math.floor(Date.now() / 1000);
for (const s of ['^VIX3M', '^VIX', '^GSPC', 'HYG', 'JNK', 'IEF', 'LQD']) {
  jobs.push([`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=631152000&period2=${now}&interval=1d&includeAdjustedClose=true`, `yahoo_${s.replace('^', '')}_1d.json`]);
}

for (const [u, f] of jobs) console.log(f.padEnd(34), await get(u, f));

// futures VX: mensili dall'elenco ufficiale (CDN)
const list = JSON.parse(fs.readFileSync(path.join(OUT, 'vx_product_list.json'), 'utf8'));
const monthly = Object.values(list).flat().filter((r) => r.duration_type === 'M');
fs.mkdirSync(path.join(OUT, 'vx'), { recursive: true });
let n = 0;
for (const r of monthly) {
  const res = await get(`https://cdn.cboe.com/${r.path}`, `vx/VX_${r.expire_date}.csv`);
  if (res !== 'cache') n++;
  if (res.startsWith('ERRORE')) console.log(r.expire_date, res);
}
console.log(`futures VX mensili (CDN): ${monthly.length} contratti, ${n} scaricati ora`);

// archivio vecchio: CFE_<codice mese><aa>_VX.csv, 2004-2012 (i file 2013 servono per confrontarli con il CDN)
const CODES = 'FGHJKMNQUVXZ';
fs.mkdirSync(path.join(OUT, 'vx_old'), { recursive: true });
const old = [];
for (let y = 2004; y <= 2013; y++) for (const c of CODES) {
  const f = `vx_old/CFE_${c}${String(y).slice(2)}_VX.csv`;
  const res = await get(`https://cdn.cboe.com/resources/futures/archive/volume-and-price/CFE_${c}${String(y).slice(2)}_VX.csv`, f, { optional: true });
  if (!res.startsWith('assente')) old.push(f);
}
console.log(`archivio vecchio: ${old.length} file`);
fs.writeFileSync(LOG_F, JSON.stringify(log, null, 1));
