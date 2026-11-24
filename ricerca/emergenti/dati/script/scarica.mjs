// Scarica le serie della verifica dati «Emergenti» in ricerca/emergenti/cache/ (cartella esclusa dal repository).
// Metodo: Yahoo Finance, endpoint chart v8 (lo stesso di scripts/lib/yahoo.js), storia intera (period1=0), barre
// giornaliere; si salva la risposta JSON grezza, comprese le barre con chiusura nulla, per poterle contare.
// FRED: fredgraph.csv senza chiave, storia intera; si salva il CSV così com'è (righe vuote = giorno senza dato).
// Nessun riempimento: i dati mancanti restano mancanti.
// Uso (dalla radice del repository): node ricerca/emergenti/dati/script/scarica.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YAHOO_FX, YAHOO_USD, YAHOO_ETF, YAHOO_APP, FRED, fileName } from './serie.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.resolve(HERE, '../../cache');
const FORCE = process.argv.includes('--force');
const UA = { 'User-Agent': 'Mozilla/5.0 (sector-monitor research)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(path.join(CACHE, 'yahoo'), { recursive: true });
fs.mkdirSync(path.join(CACHE, 'fred'), { recursive: true });

async function get(url, tries = 6) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { fatal: true });
      return await r.text();
    } catch (e) {
      last = e;
      if (e.fatal) break;
      await sleep(1500 * 2 ** i);
    }
  }
  throw last;
}

const now = Math.floor(Date.now() / 1000);
const log = { scaricato: new Date().toISOString(), yahoo: {}, fred: {} };
for (const sym of [...YAHOO_FX, ...YAHOO_USD, ...YAHOO_ETF, ...YAHOO_APP]) {
  const f = path.join(CACHE, 'yahoo', fileName(sym) + '.json');
  if (!FORCE && fs.existsSync(f)) { log.yahoo[sym] = 'cache'; continue; }
  const host = ['query1', 'query2'][Math.floor(Math.random() * 2)];
  const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=0&period2=${now}&interval=1d&includeAdjustedClose=true&events=div,split`;
  try {
    const t = await get(url);
    const j = JSON.parse(t);
    if (!j.chart?.result?.[0]?.timestamp) throw new Error('nessun dato');
    fs.writeFileSync(f, t);
    log.yahoo[sym] = `ok ${j.chart.result[0].timestamp.length} barre`;
  } catch (e) { log.yahoo[sym] = 'ERRORE ' + e.message; }
  console.log('Yahoo', sym, log.yahoo[sym]);
  await sleep(400);
}
// CNH=X: al 05/11/2026 Yahoo non ha storia giornaliera (una sola barra, quella di oggi, con qualsiasi range e
// intervallo 1d/1wk/1mo); c'è solo la serie oraria degli ultimi 730 giorni. La si scarica per misurare la storia
// disponibile e per confrontare CNH con CNY negli stessi giorni.
{
  const f = path.join(CACHE, 'yahoo', 'CNH_X_1h.json');
  if (FORCE || !fs.existsSync(f)) {
    try {
      const t = await get('https://query1.finance.yahoo.com/v8/finance/chart/CNH%3DX?range=730d&interval=1h');
      fs.writeFileSync(f, t);
      log.yahoo['CNH=X 1h'] = `ok ${JSON.parse(t).chart.result[0].timestamp.length} barre orarie`;
    } catch (e) { log.yahoo['CNH=X 1h'] = 'ERRORE ' + e.message; }
    console.log('Yahoo CNH=X 1h', log.yahoo['CNH=X 1h']);
  }
}
// Ora a cui corrisponde la «chiusura» giornaliera dei cambi su Yahoo: serie orarie e giornaliere degli ultimi 3 mesi
for (const sym of YAHOO_FX.filter((x) => x !== 'CNH=X')) {
  const f = path.join(CACHE, 'yahoo', fileName(sym) + '_1h3mo.json');
  if (!FORCE && fs.existsSync(f)) continue;
  try {
    const t = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1h`);
    const d = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1d`);
    fs.writeFileSync(f, t); fs.writeFileSync(f.replace('_1h3mo', '_1d3mo'), d);
    log.yahoo[sym + ' 1h3mo'] = 'ok';
  } catch (e) { log.yahoo[sym + ' 1h3mo'] = 'ERRORE ' + e.message; }
  await sleep(400);
}
for (const id of FRED) {
  const f = path.join(CACHE, 'fred', id + '.csv');
  if (!FORCE && fs.existsSync(f)) { log.fred[id] = 'cache'; continue; }
  try {
    const t = await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
    if (!/^observation_date|^DATE/i.test(t)) throw new Error('risposta non CSV');
    fs.writeFileSync(f, t);
    log.fred[id] = `ok ${t.trim().split('\n').length - 1} righe`;
  } catch (e) { log.fred[id] = 'ERRORE ' + e.message; }
  console.log('FRED', id, log.fred[id]);
  await sleep(800);
}
// Cadenza di pubblicazione di FRED: dalla pagina della serie si leggono «Updated», «Frequency» e «Release» (testo grezzo).
// Il parametro vintage_date di fredgraph.csv è stato provato il 05/11/2026 e viene ignorato (risponde con i dati di oggi):
// la cadenza si ricava quindi dalla data di aggiornamento e dal ritardo dell'ultima osservazione.
// FRED risponde spesso 503: i tentativi falliti si contano e restano nel file.
{
  const f = path.join(CACHE, 'fred', 'pagine.json');
  const old = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { pagine: {}, errori: [] };
  for (const id of FRED) {
    if (old.pagine[id]?.Frequency && !FORCE) continue;
    try {
      const h = await get(`https://fred.stlouisfed.org/series/${id}`, 4);
      const txt = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const pick = (k) => { const m = txt.match(new RegExp(k + ':?\\s*(.{0,70})')); return m ? m[1].trim() : null; };
      old.pagine[id] = { letto: new Date().toISOString(), Updated: pick('Updated'), Frequency: pick('Frequency'), Release: pick('Release') };
    } catch (e) { old.errori.push(`${new Date().toISOString()} ${id}: ${e.message}`); }
    await sleep(800);
  }
  fs.writeFileSync(f, JSON.stringify(old, null, 1));
  console.log('FRED pagine', JSON.stringify(old.pagine), 'errori', old.errori.length);
}
fs.writeFileSync(path.join(CACHE, 'scaricato.json'), JSON.stringify(log, null, 1));
