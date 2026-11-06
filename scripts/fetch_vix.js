#!/usr/bin/env node
/*
 * fetch_vix.js — dati della vista «VIX» (solo contesto): VIX di chiusura e S&P 500 e Nasdaq-100 dal 1990.
 * Scrive data/vix.json.
 *
 * Fonti (ricerca/vix/inserimento/inserimento.md):
 * - VIX: FRED VIXCLS, identico al file ufficiale di Cboe (0 differenze su 9.309 sedute), aggiornato la mattina dopo;
 *   per le sedute dopo l'ultimo valore di FRED (di solito una) il ^VIX di Yahoo, provvisorio (campo `fred` = ultima data
 *   di FRED). Yahoo da solo ha errori (06/02/2026: 20,37 contro 17,76 di Cboe), quindi non è la fonte principale.
 * - Indici: Yahoo ^GSPC e ^NDX (solo prezzo), le stesse chiusure della vista Indici (coincidono al centesimo dal 2000).
 * - Si tiene il VIX solo nelle sedute dell'S&P 500: FRED pubblica il VIX anche in alcuni giorni di borsa chiusa (dal 2022).
 *
 * Regole come fetch_emerging.js: niente barre aperte (parse di yahoo.js); una serie che non arriva, arriva più vecchia o
 * con la storia accorciata resta quella pubblicata; serie con gli stessi valori entro l'ultima cifra: resta la pubblicata
 * (keep_unchanged.js); se manca una delle tre serie e non c'è quella pubblicata, il file non si scrive.
 * Uso: node scripts/fetch_vix.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily } from './lib/yahoo.js';
import { fetchFred, parseFredDaily } from './fetch_data.js';
import { pack, pickSeries, splice } from './fetch_emerging.js';
import { decodeDates, deltaDecode } from '../js/indexdata.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/vix.json');
const SINCE = '1990-01-01';
const P1 = Math.floor(Date.parse(SINCE) / 1000);
const TAIL_DAYS = 60;

/** VIX solo nelle date dell'indice (sedute NYSE) */
export function onSessions(s, sessions) {
  const ok = new Set(sessions), dates = [], val = [];
  s.dates.forEach((d, i) => { if (ok.has(d) && s.val[i] > 0) { dates.push(d); val.push(s.val[i]); } });
  return { dates, val };
}

let yahooDown = null; // dopo il primo errore di Yahoo gli altri simboli non lo richiedono (con Yahoo appeso ognuno costa 2 minuti)
async function yahoo(sym, opt) {
  if (yahooDown) throw new Error(`non richiesto, Yahoo già giù (${yahooDown})`);
  try { return await fetchDaily(sym, opt); } catch (e) { yahooDown = e.message; throw e; }
}

async function index(sym) {
  const d = await yahoo(sym, { period1: P1, raw: true });
  const dates = [], val = [];
  d.dates.forEach((x, i) => { if (d.close[i] != null && d.close[i] > 0) { dates.push(x); val.push(d.close[i]); } });
  if (dates.length < 5000) throw new Error(`solo ${dates.length} sedute`);
  return { dates, val };
}

async function main() {
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const prevSer = (s) => { const x = prev && prev.series && prev.series[s]; if (!x || !x.cd) return null; return { x, dates: decodeDates(x.d0, x.gaps), val: deltaDecode(x.cd, x.ps || 1) }; };
  const fresh = {}, errors = [], notes = [];
  for (const [key, sym] of [['SPX', '^GSPC'], ['NDX', '^NDX']]) {
    // 4 decimali: nel 1990-93 il Nasdaq-100 è quotato in ottavi (204,625)
    try { const s = await index(sym); fresh[key] = { ...pack(s.dates, s.val, 10000), last: s.dates.at(-1) }; } catch (e) { errors.push(`${sym}: ${e.message}`); }
  }
  // sedute di riferimento: l'S&P 500 nuovo o quello pubblicato
  const spx = fresh.SPX ? { dates: decodeDates(fresh.SPX.d0, fresh.SPX.gaps) } : prevSer('SPX');
  try {
    if (!spx) throw new Error('senza le sedute dell\'S&P 500');
    const p = prevSer('VIX');
    let fed = null, tail = null;
    try { fed = await fetchFred('VIXCLS', SINCE, parseFredDaily); } catch (e) {
      errors.push(`VIXCLS (FRED): ${e.message}`);
      if (p && p.x.fred) { const n = p.dates.filter((d) => d <= p.x.fred).length; fed = { dates: p.dates.slice(0, n), val: p.val.slice(0, n) }; notes.push('VIX: tenuta la parte FRED pubblicata'); }
    }
    if (!fed || !fed.dates.length) throw new Error('nessun VIX di FRED');
    fed = onSessions(fed, spx.dates);
    try {
      const d = await yahoo('^VIX', { period1: Math.floor(Date.now() / 1000) - TAIL_DAYS * 86400, raw: true });
      tail = { dates: [], val: [] };
      d.dates.forEach((x, i) => { if (d.close[i] != null && d.close[i] > 0) { tail.dates.push(x); tail.val.push(d.close[i]); } });
      tail = onSessions(tail, spx.dates);
    } catch (e) { errors.push(`^VIX (Yahoo): ${e.message}`); if (p) tail = { dates: p.dates, val: p.val }; }
    const s = splice(fed, tail);
    if (s.devMed != null && s.devMed > 0.02) notes.push(`VIX: Yahoo si scosta da FRED in mediana del ${(100 * s.devMed).toFixed(2)}% negli ultimi 60 giorni`);
    // FRED non torna indietro: se risponde con dati più vecchi di quelli pubblicati si tiene la serie pubblicata
    if (p && p.x.fred && s.fredLast < p.x.fred) throw new Error(`FRED arriva al ${s.fredLast}, prima del ${p.x.fred} pubblicato`);
    fresh.VIX = { ...pack(s.dates, s.val), last: s.dates.at(-1), fred: s.fredLast };
  } catch (e) { errors.push(`VIX: ${e.message}`); }

  const all = ['VIX', 'SPX', 'NDX'];
  const series = {}, kept = [];
  for (const k of all) {
    const r = pickSeries(fresh[k], prev && prev.series && prev.series[k]);
    if (!r) continue;
    series[k] = r.s;
    if (r.kept) kept.push(k);
    if (r.short) errors.push(`${k}: la serie nuova ha la storia accorciata: tenuta la pubblicata`);
  }
  const missing = all.filter((k) => !series[k]);
  if (missing.length) {
    console.error(`Mancano ${missing.join(', ')}: data/vix.json non si aggiorna.\n${errors.join('\n')}`);
    process.exit(1);
  }
  const out = {
    generated: new Date().toISOString(),
    asOf: { vix: series.VIX.last, fred: series.VIX.fred || null, spx: series.SPX.last, ndx: series.NDX.last },
    source: { vix: 'FRED VIXCLS (Cboe; © Cboe, reprinted with permission); dopo l\'ultimo valore di FRED (campo fred) Yahoo ^VIX, provvisorio', index: 'Yahoo Finance ^GSPC e ^NDX (solo prezzo)' },
    series,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  for (const k of all) console.log(k.padEnd(4), `dal ${decodeDates(series[k].d0, '').at(0)} al ${series[k].last}${series[k].fred ? ` (FRED fino al ${series[k].fred})` : ''}${kept.includes(k) ? ' (tenuta la serie pubblicata)' : ''}`);
  if (notes.length) console.warn(`Note:\n${notes.join('\n')}`);
  if (errors.length) console.warn(`Errori:\n${errors.join('\n')}`);
  if (process.env.GITHUB_ACTIONS) for (const m of [...errors, ...notes]) console.log(`::warning title=VIX::${m.replace(/\n/g, ' ')}`);
  console.log(`Scritto data/vix.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB): VIX al ${out.asOf.vix} (FRED al ${out.asOf.fred}), S&P 500 al ${out.asOf.spx}, Nasdaq-100 al ${out.asOf.ndx}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
