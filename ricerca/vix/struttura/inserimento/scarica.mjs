#!/usr/bin/env node
/*
 * scarica.mjs — dati per il prototipo della struttura a termine e del credito (fase 1, nessuna modifica all'app).
 * Scarica da FRED (fredgraph.csv, con &cosd= come scripts/fetch_data.js: senza cosd FRED serve a volte una cache
 * di un giorno prima) VIXCLS, VXVCLS, BAA10Y, BAMLH0A0HYM2 e Yahoo ^GSPC (sedute di riferimento) in cache/.
 * Se FRED non risponde (succede: «Empty reply» il 09/11/2026), prende la copia scaricata dall'agente dei dati
 * (ricerca/vix/struttura/dati/cache/fred_<ID>.csv, stessa fonte, stesso giorno) e lo scrive in cache/_origine.json.
 * Uso: node ricerca/vix/struttura/inserimento/scarica.mjs [--refresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'cache');
const SIB = path.join(HERE, '../dati/cache');
fs.mkdirSync(OUT, { recursive: true });
const REFRESH = process.argv.includes('--refresh');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const origin = fs.existsSync(path.join(OUT, '_origine.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, '_origine.json'), 'utf8')) : {};

async function get(url, file) {
  let err;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor research)' }, signal: AbortSignal.timeout(45000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      if (t.length < 100) throw new Error('risposta vuota');
      fs.writeFileSync(path.join(OUT, file), t);
      return null;
    } catch (e) { err = e; await sleep(2000 * 2 ** a); }
  }
  return err.message;
}

for (const id of ['VIXCLS', 'VXVCLS', 'BAA10Y', 'BAMLH0A0HYM2']) {
  const f = `${id}.csv`;
  if (!REFRESH && fs.existsSync(path.join(OUT, f))) { console.log(id, 'già in cache', origin[f] || ''); continue; }
  const e = await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=1986-01-01`, f);
  if (!e) { origin[f] = { from: 'FRED', at: new Date().toISOString() }; console.log(id, 'FRED ok'); continue; }
  const s = path.join(SIB, `fred_${id}.csv`);
  if (fs.existsSync(s)) { fs.copyFileSync(s, path.join(OUT, f)); origin[f] = { from: `copia di ${path.relative(HERE, s)} (FRED giù: ${e})`, at: fs.statSync(s).mtime.toISOString() }; console.log(id, 'FRED giù, copiata la cache dell\'agente dei dati'); }
  else console.log(id, 'ERRORE', e);
}
// sedute dell'S&P 500 (Yahoo), le stesse di data/vix.json: si prendono dal file dell'app, che è già sul ramo
const vx = path.resolve(HERE, '../../../../data/vix.json');
if (fs.existsSync(vx)) { fs.copyFileSync(vx, path.join(OUT, 'app_vix.json')); origin['app_vix.json'] = { from: 'data/vix.json del ramo (S&P 500 e VIX della 1.5.0)', at: fs.statSync(vx).mtime.toISOString() }; }
fs.writeFileSync(path.join(OUT, '_origine.json'), JSON.stringify(origin, null, 1));
