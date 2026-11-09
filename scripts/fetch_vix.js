#!/usr/bin/env node
/*
 * fetch_vix.js — dati della vista «VIX» (solo contesto): VIX di chiusura e S&P 500 e Nasdaq-100 dal 1990, VIX3M dal 2007
 * (struttura a termine) e rapporto HYG/IEF dal 2007 (credito high yield). Scrive data/vix.json.
 *
 * Fonti (ricerca/vix/inserimento/inserimento.md, ricerca/vix/struttura/dati/dati.md):
 * - VIX e VIX3M: FRED VIXCLS e VXVCLS, identiche ai file ufficiali di Cboe (VIX: 0 differenze su 9.309 date; VIX3M:
 *   4.310 date uguali su 4.310), aggiornate la mattina dopo. Per le sedute dopo l'ultimo valore di FRED (di solito una)
 *   il file ufficiale di Cboe (VIX_History.csv, VIX3M_History.csv, aggiornato la sera o la notte dopo la seduta), e per una
 *   seduta che Cboe non ha ancora Yahoo (^VIX, ^VIX3M): valori provvisori (campo `fred` = ultima data di FRED, `src` = fonte
 *   dell'ultima seduta, FRED, Cboe o Yahoo), scartati se valgono più del triplo o meno di un terzo della seduta prima. Yahoo da solo ha
 *   errori (06/02/2026: VIX 20,37 contro 17,76 di Cboe), quindi è solo l'ultima riserva.
 * - Indici: Yahoo ^GSPC e ^NDX (solo prezzo), le stesse chiusure della vista Indici (coincidono al centesimo dal 2000).
 * - Credito: rapporto tra le chiusure rettificate per i dividendi degli ETF HYG (obbligazioni high yield) e IEF (titoli
 *   di Stato a 7-10 anni) di Yahoo. Non è uno spread ufficiale: l'HY OAS di ICE su FRED ha solo 3 anni e la licenza ne
 *   vieta la ripubblicazione (scelta dell'utente del 09/11/2026). Yahoo riscrive le chiusure rettificate a ogni dividendo:
 *   cambia il livello del rapporto, non le sue variazioni né la distanza dal massimo che mostra l'app.
 * - Si tengono solo le sedute dell'S&P 500: FRED pubblica il VIX anche in alcuni giorni di borsa chiusa (dal 2022).
 * Idea della struttura a termine e del credito: Stefano Serafini (Swiss Capital School), Morning Trading Show di BNP Paribas.
 *
 * Regole come fetch_emerging.js: niente barre aperte (parse di yahoo.js); una serie che non arriva, arriva più vecchia o
 * con la storia accorciata resta quella pubblicata; serie con gli stessi valori entro l'ultima cifra: resta la pubblicata
 * (keep_unchanged.js). VIX, SPX e NDX sono obbligatorie: se ne manca una e non c'è quella pubblicata, il file non si scrive.
 * VIX3M e HYGIEF sono facoltative: se mancano il file si scrive senza, con il loro nome in `missing`.
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
export const REQUIRED = ['VIX', 'SPX', 'NDX'];
export const OPTIONAL = ['VIX3M', 'HYGIEF'];

/** VIX solo nelle date dell'indice (sedute NYSE) */
export function onSessions(s, sessions) {
  const ok = new Set(sessions), dates = [], val = [];
  s.dates.forEach((d, i) => { if (ok.has(d) && s.val[i] > 0) { dates.push(d); val.push(s.val[i]); } });
  return { dates, val };
}

/** File storico di Cboe (DATE in MM/DD/YYYY, CLOSE) → { dates, val } in ordine di data */
export function parseCboe(text) {
  const lines = text.trim().split(/\r?\n/), head = lines[0].split(',').map((x) => x.trim().toUpperCase());
  const iD = head.indexOf('DATE'), iC = head.indexOf('CLOSE');
  if (iD < 0 || iC < 0) throw new Error('intestazione inattesa');
  const rows = [];
  for (const l of lines.slice(1)) {
    const a = l.split(','), m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((a[iD] || '').trim()), v = +a[iC];
    if (m && v > 0) rows.push([`${m[3]}-${m[1]}-${m[2]}`, v]);
  }
  const m = new Map(rows); // una data ripetuta: vale l'ultima riga (encodeDates non accetta date doppie)
  const dates = [...m.keys()].sort();
  return { dates, val: dates.map((d) => m.get(d)) };
}

/** Coda provvisoria: Cboe, più le sedute di Yahoo dopo l'ultima di Cboe (null = fonte non arrivata). yFrom = prima data
 *  presa da Yahoo (null se tutta da Cboe) */
export function mergeTail(cboe, yahoo) {
  if (cboe && !cboe.dates.length) cboe = null;
  if (!cboe) return yahoo ? { ...yahoo, yFrom: yahoo.dates[0] || null } : null;
  if (!yahoo) return { ...cboe, yFrom: null };
  const last = cboe.dates.at(-1), dates = [...cboe.dates], val = [...cboe.val];
  let yFrom = null;
  yahoo.dates.forEach((d, i) => { if (d > last) { dates.push(d); val.push(yahoo.val[i]); if (!yFrom) yFrom = d; } });
  return { dates, val, yFrom };
}

/** Fonte dell'ultima seduta: 'FRED', 'Cboe' o 'Yahoo' */
export function lastSource(dates, fredLast, yFrom) {
  const last = dates.at(-1);
  if (!last || last <= fredLast) return 'FRED';
  return yFrom && last >= yFrom ? 'Yahoo' : 'Cboe';
}

/** Coda plausibile: si scartano le sedute dopo FRED che valgono più del triplo o meno di un terzo della seduta prima
 *  (il salto più grande del VIX, il 05/02/2018, è stato ×2,16). Restituisce { dates, val, dropped } */
export function plausible(base, tail, fredLast) {
  const dates = [], val = [], dropped = [];
  let prev = base;
  tail.dates.forEach((d, i) => {
    const v = tail.val[i];
    if (d > fredLast && prev && (v > prev * 3 || v < prev / 3)) { dropped.push(`${d} ${v}`); return; }
    dates.push(d); val.push(v);
    if (d >= fredLast) prev = v;
  });
  return { dates, val, dropped };
}

/** Rapporto tra due serie di chiusure sulle date comuni */
export function ratioSeries(a, b) {
  const m = new Map(b.dates.map((d, i) => [d, b.val[i]])), dates = [], val = [];
  a.dates.forEach((d, i) => { const y = m.get(d); if (a.val[i] > 0 && y > 0) { dates.push(d); val.push(a.val[i] / y); } });
  return { dates, val };
}

/**
 * Scelta tra serie nuove e pubblicate e file in uscita. fresh/prev: serie compatte per chiave. Restituisce
 * { out: null se manca una serie obbligatoria, missing, kept, errors } (funzione pura: la provano i test).
 */
export function assemble(fresh, prev, now = new Date()) {
  const series = {}, kept = [], errors = [];
  for (const k of [...REQUIRED, ...OPTIONAL]) {
    const r = pickSeries(fresh[k], prev && prev.series && prev.series[k]);
    if (!r) continue;
    series[k] = r.same && fresh[k] && fresh[k].src !== r.s.src ? fresh[k] : r.s; // stessi valori, fonte dell'ultima seduta cambiata
    if (r.kept) kept.push(k);
    if (r.short) errors.push(`${k}: la serie nuova ha la storia accorciata: tenuta la pubblicata`);
  }
  const missingReq = REQUIRED.filter((k) => !series[k]), missing = OPTIONAL.filter((k) => !series[k]);
  if (missingReq.length) return { out: null, missing: missingReq, kept, errors };
  const out = {
    generated: now.toISOString(),
    asOf: { vix: series.VIX.last, fred: series.VIX.fred || null, vixSrc: series.VIX.src || null, vix3mSrc: series.VIX3M ? series.VIX3M.src || null : null, spx: series.SPX.last, ndx: series.NDX.last, vix3m: series.VIX3M ? series.VIX3M.last : null, fred3m: (series.VIX3M && series.VIX3M.fred) || null, credit: series.HYGIEF ? series.HYGIEF.last : null },
    source: {
      vix: 'FRED VIXCLS (Cboe; © Cboe, reprinted with permission); dopo l\'ultimo valore di FRED (campo fred) il file ufficiale di Cboe, o Yahoo ^VIX per una seduta che Cboe non ha ancora: provvisorio',
      vix3m: 'FRED VXVCLS (Cboe; © Cboe, reprinted with permission) dal 04/12/2007; dopo l\'ultimo valore di FRED (campo fred) il file ufficiale di Cboe, o Yahoo ^VIX3M: provvisorio',
      credit: 'Yahoo Finance HYG e IEF, chiusure rettificate per i dividendi: rapporto HYG/IEF (non è uno spread ufficiale)',
      index: 'Yahoo Finance ^GSPC e ^NDX (solo prezzo)',
    },
    missing,
    series,
  };
  return { out, missing, kept, errors };
}

let yahooDown = null; // dopo il primo errore di Yahoo gli altri simboli non lo richiedono (con Yahoo appeso ognuno costa 2 minuti)
async function yahoo(sym, opt) {
  if (yahooDown) throw new Error(`non richiesto, Yahoo già giù (${yahooDown})`);
  // un errore 4xx (simbolo sconosciuto) riguarda solo quel simbolo: gli altri si chiedono lo stesso
  try { return await fetchDaily(sym, opt); } catch (e) { if (!/HTTP 4\d\d/.test(e.message) || /HTTP 429/.test(e.message)) yahooDown = e.message; throw e; }
}
let fredDown = null; // lo stesso per FRED (4 tentativi da 30 secondi per serie)
async function fred(id, since) {
  if (fredDown) throw new Error(`non richiesto, FRED già giù (${fredDown})`);
  try { return await fetchFred(id, since, parseFredDaily); } catch (e) { fredDown = e.message; throw e; }
}
let cboeDown = null; // come per Yahoo e FRED: dopo un errore di rete o del server il secondo file non si chiede
async function cboeFile(sym) {
  if (cboeDown) throw new Error(`non richiesto, Cboe già giù (${cboeDown})`);
  let err;
  for (let k = 0; k < 3; k++) {
    if (k) await new Promise((ok) => setTimeout(ok, 1500 * 2 ** (k - 1)));
    try {
      const r = await fetch(`https://cdn.cboe.com/api/global/us_indices/daily_prices/${sym}_History.csv`, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor data fetch)' }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const s = parseCboe(await r.text());
      if (!s.dates.length) throw new Error('nessun dato');
      return s;
    } catch (e) { err = e; if (/HTTP 4\d\d/.test(e.message) && !/HTTP 429/.test(e.message)) break; }
  }
  if (!/HTTP 4\d\d/.test(err.message) || /HTTP 429/.test(err.message)) cboeDown = err.message;
  throw err;
}

async function index(sym) {
  const d = await yahoo(sym, { period1: P1, raw: true });
  const dates = [], val = [];
  d.dates.forEach((x, i) => { if (d.close[i] != null && d.close[i] > 0) { dates.push(x); val.push(d.close[i]); } });
  if (dates.length < 5000) throw new Error(`solo ${dates.length} sedute`);
  return { dates, val };
}

/** VIX o VIX3M: FRED fino al suo ultimo valore, poi Cboe (e Yahoo per una seduta che Cboe non ha ancora) */
async function volSeries({ key, id, since, cboe, ysym, ps }, p, spx, errors, notes) {
  let fed = null;
  try { fed = await fred(id, since); } catch (e) {
    errors.push(`${id} (FRED): ${e.message}`);
    if (p && p.x.fred) { const n = p.dates.filter((d) => d <= p.x.fred).length; fed = { dates: p.dates.slice(0, n), val: p.val.slice(0, n) }; notes.push(`${key}: tenuta la parte FRED pubblicata`); }
  }
  if (!fed || !fed.dates.length) throw new Error('nessun dato di FRED');
  fed = onSessions(fed, spx);
  let cb = null, yh = null;
  try { cb = onSessions(await cboeFile(cboe), spx); } catch (e) { errors.push(`${cboe} (Cboe): ${e.message}`); }
  if (!cb || !cb.dates.length || cb.dates.at(-1) < spx.at(-1)) {
    try {
      const d = await yahoo(ysym, { period1: Math.floor(Date.now() / 1000) - TAIL_DAYS * 86400, raw: true });
      yh = { dates: [], val: [] };
      d.dates.forEach((x, i) => { if (d.close[i] != null && d.close[i] > 0) { yh.dates.push(x); yh.val.push(d.close[i]); } });
      yh = onSessions(yh, spx);
    } catch (e) { errors.push(`${ysym} (Yahoo): ${e.message}`); }
  }
  let tail = mergeTail(cb, yh), yFrom = tail ? tail.yFrom : null, fromPrev = false;
  if (!tail && p) { tail = { dates: p.dates, val: p.val }; fromPrev = true; } // nessuna coda nuova: resta quella pubblicata
  if (tail) {
    const q = plausible(fed.val.at(-1), tail, fed.dates.at(-1));
    if (q.dropped.length) errors.push(`${key}: sedute provvisorie non plausibili scartate (${q.dropped.join(', ')})`);
    tail = { dates: q.dates, val: q.val };
  }
  const s = splice(fed, tail);
  if (s.devMed != null && s.devMed > 0.02) notes.push(`${key}: la coda (Cboe/Yahoo) si scosta da FRED in mediana del ${(100 * s.devMed).toFixed(2)}% negli ultimi 60 giorni`);
  // FRED non torna indietro: se risponde con dati più vecchi di quelli pubblicati si tiene la serie pubblicata
  if (p && p.x.fred && s.fredLast < p.x.fred) throw new Error(`FRED arriva al ${s.fredLast}, prima del ${p.x.fred} pubblicato`);
  // coda tenuta dal file pubblicato: la sua fonte (null se il file è della 1.5.0 e non la dice)
  const src = fromPrev && s.dates.at(-1) > s.fredLast ? p.x.src || null : lastSource(s.dates, s.fredLast, yFrom);
  return { ...pack(s.dates, s.val, ps), last: s.dates.at(-1), fred: s.fredLast, src };
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
  const spxS = fresh.SPX ? { dates: decodeDates(fresh.SPX.d0, fresh.SPX.gaps) } : prevSer('SPX');
  const spx = spxS && spxS.dates;
  // VIX: ps 10000 come nella 1.5.0 (fisso: un valore anomalo non deve cambiare la scala), VIX3M a 2 decimali come i valori
  for (const c of [{ key: 'VIX', id: 'VIXCLS', since: SINCE, cboe: 'VIX', ysym: '^VIX', ps: 10000 }, { key: 'VIX3M', id: 'VXVCLS', since: '2007-01-01', cboe: 'VIX3M', ysym: '^VIX3M', ps: 100 }]) {
    try {
      if (!spx) throw new Error('senza le sedute dell\'S&P 500');
      fresh[c.key] = await volSeries(c, prevSer(c.key), spx, errors, notes);
    } catch (e) { errors.push(`${c.key}: ${e.message}`); }
  }
  // credito: HYG/IEF con le chiusure rettificate per i dividendi, solo nelle sedute dell'S&P 500
  try {
    if (!spx) throw new Error('senza le sedute dell\'S&P 500');
    const adj = async (sym) => { const d = await yahoo(sym, { period1: Math.floor(Date.parse('2007-01-01') / 1000), raw: true }); const dates = [], val = []; d.dates.forEach((x, i) => { if (d.adjclose[i] > 0) { dates.push(x); val.push(d.adjclose[i]); } }); return { dates, val }; };
    const r = onSessions(ratioSeries(await adj('HYG'), await adj('IEF')), spx);
    if (r.dates.length < 4000) throw new Error(`solo ${r.dates.length} sedute`);
    fresh.HYGIEF = { ...pack(r.dates, r.val, 100000), last: r.dates.at(-1) };
  } catch (e) { errors.push(`HYG/IEF: ${e.message}`); }

  const { out, missing, kept, errors: e2 } = assemble(fresh, prev);
  errors.push(...e2);
  if (!out) {
    console.error(`Mancano ${missing.join(', ')}: data/vix.json non si aggiorna.\n${errors.join('\n')}`);
    process.exit(1);
  }
  fs.writeFileSync(OUT, JSON.stringify(out));
  for (const k of Object.keys(out.series)) { const x = out.series[k]; console.log(k.padEnd(6), `dal ${decodeDates(x.d0, '').at(0)} al ${x.last}${x.fred ? ` (FRED fino al ${x.fred})` : ''}${kept.includes(k) ? ' (tenuta la serie pubblicata)' : ''}`); }
  if (missing.length) notes.push(`Serie facoltative mancanti: ${missing.join(', ')}`);
  if (notes.length) console.warn(`Note:\n${notes.join('\n')}`);
  if (errors.length) console.warn(`Errori:\n${errors.join('\n')}`);
  if (process.env.GITHUB_ACTIONS) for (const m of [...errors, ...notes]) console.log(`::warning title=VIX::${m.replace(/\n/g, ' ')}`);
  const a = out.asOf;
  console.log(`Scritto data/vix.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB): VIX al ${a.vix} (FRED al ${a.fred}), VIX3M al ${a.vix3m || '—'} (FRED al ${a.fred3m || '—'}), HYG/IEF al ${a.credit || '—'}, S&P 500 al ${a.spx}, Nasdaq-100 al ${a.ndx}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
