#!/usr/bin/env node
/*
 * dati.mjs — download dei dati per la ricerca sul POC (point of control) e sul passaggio di oro e argento ai future
 * (ricerca/poc/, fase 1: non tocca l'app).
 *
 * Scarica dall'endpoint chart v8 di Yahoo Finance (lo stesso di scripts/lib/yahoo.js) e salva in ricerca/poc/cache/
 * (esclusa da git) la risposta GREZZA di Yahoo (timestamp, apertura, massimo, minimo, chiusura, volume, meta), senza
 * nessuna elaborazione: così analisi.mjs (Node) e verifica.py (Python) leggono gli stessi byte e li interpretano ognuno
 * con il proprio codice.
 *
 * Cosa scarica:
 *  - d_<simbolo>: barre giornaliere di tutta la storia (dal 1900) per i mercati del pannello e per gli strumenti dei
 *    volumi (future, ETF);
 *  - h_<simbolo>: barre orarie (interval=60m) degli ultimi 729 giorni (Yahoo rifiuta oltre 730 giorni: verificato,
 *    risposta «The requested range must be within the last 730 days»);
 *  - c_<contratto>: barre giornaliere dei singoli contratti future ancora vivi (GCZ26.CMX, SIZ26.CMX, ...): Yahoo non ha
 *    i contratti scaduti; servono a misurare gli scalini del future continuo ai cambi di contratto;
 *  - ch_<contratto>: barre orarie dei contratti dell'argento, per controllare il 26/01/2026;
 *  - m_<titolo>: barre giornaliere dell'ultimo mese dei titoli di S&P 500 e Nasdaq-100 (elenchi di data/), per capire
 *    che cosa è il «volume» che Yahoo dà agli indici ^GSPC e ^NDX (somma dei volumi dei membri?).
 *
 *  - fonti.json: codice HTTP di LBMA (argento) e settlement ufficiali CME di argento, oro, rame e petrolio (primi 6
 *    contratti) del 26/01/2026 e delle ultime 4 sedute: seconda fonte pubblica dei prezzi dei future.
 *
 * Uso: node ricerca/poc/dati.mjs [--refresh] [--solo=d,h,c,ch,m,f]
 *   senza --refresh i file già in cache non si riscaricano.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CACHE = path.join(HERE, 'cache');
const REFRESH = process.argv.includes('--refresh');
const SOLO = (process.argv.find((a) => a.startsWith('--solo=')) || '').slice(7).split(',').filter(Boolean);
fs.mkdirSync(CACHE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// mercati del pannello (config/ath.json) più le alternative per oro e argento
export const PANEL = ['BTC-USD', 'GLD', 'SLV', 'GC=F', 'SI=F', 'HG=F', 'CL=F', '^NDX', '^GSPC', 'SOXX', '^KS11'];
// strumenti dei volumi
export const VOLUME = ['NQ=F', 'QQQ', 'ES=F', 'SPY', 'EWY', '069500.KS', 'SIL=F', '^NYA', '^IXIC'];
// contratti future vivi al 13/11/2026 (i mesi attivi di ciascun mercato); quelli non trovati si saltano
export const CONTRACTS = [
  'GCZ26.CMX', 'GCG27.CMX', 'GCJ27.CMX', 'GCM27.CMX',
  'SIZ26.CMX', 'SIF27.CMX', 'SIH27.CMX', 'SIK27.CMX', 'SIN27.CMX',
  'HGZ26.CMX', 'HGF27.CMX', 'HGH27.CMX', 'HGK27.CMX',
  'CLZ26.NYM', 'CLF27.NYM', 'CLG27.NYM', 'CLH27.NYM', 'CLM27.NYM', 'CLZ27.NYM',
  'ESZ26.CME', 'ESH27.CME', 'NQZ26.CME', 'NQH27.CME',
];
const CONTRACTS_H = ['SIZ26.CMX', 'SIH27.CMX', 'GCZ26.CMX'];

const fname = (kind, sym) => path.join(CACHE, `${kind}_${sym.replace(/[^A-Za-z0-9.-]/g, '_')}.json`);

async function yahooRaw(sym, q) {
  let last;
  for (let a = 0; a < 4; a++) {
    const host = a % 2 ? 'query2.finance.yahoo.com' : 'query1.finance.yahoo.com';
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(sym)}?${q}&includeAdjustedClose=true`;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor research)' }, signal: AbortSignal.timeout(30000) });
      if (r.status === 429 || r.status >= 500) throw Object.assign(new Error(`HTTP ${r.status}`), { retry: true });
      const j = await r.json();
      if (!r.ok) return { error: (j.chart && j.chart.error) || `HTTP ${r.status}` };
      const res = j.chart && j.chart.result && j.chart.result[0];
      if (!res || !res.timestamp) return { error: 'nessun dato' };
      return res;
    } catch (e) {
      last = e;
      if (!e.retry && !(e instanceof TypeError) && e.name !== 'TimeoutError') break;
      await sleep(800 * 2 ** a);
    }
  }
  return { error: String(last && last.message) };
}

async function get(kind, sym, q) {
  const f = fname(kind, sym);
  if (!REFRESH && fs.existsSync(f)) return 'cache';
  const res = await yahooRaw(sym, q);
  fs.writeFileSync(f, JSON.stringify({ symbol: sym, query: q, fetched: new Date().toISOString(), res }));
  await sleep(250);
  return res.error ? `errore: ${JSON.stringify(res.error)}` : `${res.timestamp.length} barre`;
}

async function pool(items, n, fn) {
  let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const i = k++; await fn(items[i]); } }));
}

async function main() {
  const now = Math.floor(Date.now() / 1000);
  const want = (k) => !SOLO.length || SOLO.includes(k);
  const jobs = [];
  if (want('d')) for (const s of [...PANEL, ...VOLUME]) jobs.push(['d', s, `period1=-2208988800&period2=${now}&interval=1d`]);
  if (want('h')) for (const s of [...PANEL, ...VOLUME.filter((s) => !['^NYA', '^IXIC'].includes(s))]) jobs.push(['h', s, `period1=${now - 729 * 86400}&period2=${now}&interval=60m`]);
  if (want('c')) for (const s of CONTRACTS) jobs.push(['c', s, `period1=${now - 3 * 365 * 86400}&period2=${now}&interval=1d`]);
  if (want('ch')) for (const s of CONTRACTS_H) jobs.push(['ch', s, `period1=${now - 729 * 86400}&period2=${now}&interval=60m`]);
  if (want('m')) {
    const spx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sp500_members.json'), 'utf-8')).members.map((m) => m.s);
    const ndx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/index_members/NDX.json'), 'utf-8')).tickers;
    fs.writeFileSync(path.join(CACHE, 'membri.json'), JSON.stringify({ spx, ndx }));
    for (const s of [...new Set([...spx, ...ndx])]) jobs.push(['m', s.replace(/\./g, '-'), `range=1mo&interval=1d`]);
  }
  // seconde fonti per l'argento: LBMA (risponde 403). La richiesta ai settlement CME fatta il 13/11/2026 è stata tolta:
  // l'indirizzo è interno al sito CME, le cui condizioni vietano l'accesso automatico (rilievo del controllo della 1.10.1).
  // Nei risultati resta solo la conclusione (chiusure di Yahoo = settlement nelle 4 sedute viste), non i valori.
  if (want('f')) {
    const probe = {}, cme = {};
    for (const [k, u] of [['LBMA silver', 'https://prices.lbma.org.uk/json/silver.json']]) {
      try { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor research)' }, signal: AbortSignal.timeout(20000) }); probe[k] = { url: u, status: r.status }; } catch (e) { probe[k] = { url: u, error: e.message }; }
    }
    // limite delle barre orarie di Yahoo: 729 giorni sì, 731 no
    const nowS = Math.floor(Date.now() / 1000), hourlyLimit = {};
    for (const d of [729, 731]) { const r = await yahooRaw('GLD', `period1=${nowS - d * 86400}&period2=${nowS}&interval=60m`); hourlyLimit[d] = r.error ? { error: r.error } : { bars: r.timestamp.length, first: new Date(r.timestamp[0] * 1000).toISOString() }; }
    fs.writeFileSync(path.join(CACHE, 'fonti.json'), JSON.stringify({ fetched: new Date().toISOString(), probe, cme, hourlyLimit }));
    console.log('barre orarie', JSON.stringify(hourlyLimit));
    console.log('fonti', JSON.stringify(probe), Object.keys(cme).map((k) => `${k}: ${Object.entries(cme[k]).map(([d, v]) => `${d} ${v.empty ? 'vuoto' : (v.settlements || []).length}`).join(', ')}`).join(' · '));
  }
  let done = 0;
  await pool(jobs, 3, async ([k, s, q]) => {
    const r = await get(k, s, q);
    done++;
    if (k !== 'm' || /errore/.test(r)) console.log(`${k} ${s}: ${r}`);
    else if (done % 100 === 0) console.log(`... ${done}/${jobs.length}`);
  });
  console.log(`fatto: ${jobs.length} richieste`);
}

main();
