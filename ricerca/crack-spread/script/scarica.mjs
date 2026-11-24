#!/usr/bin/env node
/*
 * scarica.mjs — download dei dati per lo studio «crack spread 3-2-1 accanto al petrolio» (ricerca, nessuna modifica
 * all'app). Salva le risposte così come arrivano in ricerca/crack-spread/cache/ (ignorata da git). Un file già presente
 * non si riscarica, salvo --refresh. In cache/_scaricato.json: URL, ora del download e stato HTTP.
 * Fonti consentite:
 *  - FRED fredgraph.csv (prezzi spot EIA, dominio pubblico): DCOILWTICO (WTI Cushing), DGASUSGULF (benzina convenzionale
 *    Gulf Coast), DGASNYH (benzina convenzionale NY Harbor), DHOILNYH (gasolio da riscaldamento n. 2 NY Harbor),
 *    DDFUELNYH, DDFUELUSGULF (diesel ULSD NY Harbor e Gulf Coast), DRGASLA (RBOB Los Angeles, solo controllo).
 *  - Yahoo chart v8 (scripts/lib/yahoo.js dell'app): ^GSPC, SPY, XLE, VLO, MPC, PSX, e i future RB=F, HO=F, CL=F.
 * Uso: node ricerca/crack-spread/script/scarica.mjs [--refresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchChart } from '../../../scripts/lib/yahoo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'cache');
fs.mkdirSync(OUT, { recursive: true });
const REFRESH = process.argv.includes('--refresh');
const UA = { 'User-Agent': 'Mozilla/5.0 (research script)' }; // FRED risponde 503 allo User-Agent predefinito di Node
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOG_F = path.join(OUT, '_scaricato.json');
const log = fs.existsSync(LOG_F) ? JSON.parse(fs.readFileSync(LOG_F, 'utf8')) : {};
const fresh = (f) => REFRESH || !fs.existsSync(f) || fs.statSync(f).size === 0;

async function getText(url, file) {
  const f = path.join(OUT, file);
  if (!fresh(f)) return 'cache';
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

async function getYahoo(sym) {
  const file = `yahoo_${sym.replace('^', '').replace('=', '')}.json`, f = path.join(OUT, file);
  if (!fresh(f)) return [file, 'cache'];
  try {
    const res = await fetchChart(sym, { period1: 473385600 /* 1985-01-01 */, period2: Math.floor(Date.now() / 1000), raw: true });
    fs.writeFileSync(f, JSON.stringify(res));
    log[file] = { url: `yahoo chart v8 ${sym} 1d dal 1985-01-01`, at: new Date().toISOString(), status: 200 };
    return [file, `${res.timestamp.length} barre`];
  } catch (e) { return [file, `ERRORE ${e.message}`]; }
}

const FRED = ['DCOILWTICO', 'DGASUSGULF', 'DGASNYH', 'DHOILNYH', 'DDFUELNYH', 'DDFUELUSGULF', 'DRGASLA'];
for (const id of FRED) console.log(`fred_${id}.csv`.padEnd(26), await getText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, `fred_${id}.csv`));
for (const s of ['^GSPC', 'SPY', 'XLE', 'VLO', 'MPC', 'PSX', 'RB=F', 'HO=F', 'CL=F']) { const [f, m] = await getYahoo(s); console.log(f.padEnd(26), m); await sleep(400); }
fs.writeFileSync(LOG_F, JSON.stringify(log, null, 1));
