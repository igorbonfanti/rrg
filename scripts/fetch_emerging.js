#!/usr/bin/env node
/*
 * fetch_emerging.js — dati della vista 8 «Emergenti» (solo contesto): cambi in valuta locale per un dollaro (storia dalla
 * Federal Reserve, FRED H.10; Yahoo solo per i giorni dopo l'ultimo valore pubblicato dalla Fed, campo `fred` della serie),
 * ETF in dollari per la forza relativa contro ACWI (Yahoo, chiusure rettificate per i dividendi) e il dollaro contro le
 * valute emergenti (FRED DTWEXEMEGS, pubblicato una volta alla settimana). Scrive data/emerging.json.
 *
 * Regole (le stesse degli altri file): niente barre aperte (parse di yahoo.js), niente barre segnaposto per gli ETF; una
 * serie che non arriva o arriva più vecchia di quella pubblicata resta quella pubblicata; con meno dell'80% delle serie
 * arrivate il file non si scrive. Nessun campo che cambia a ogni corsa oltre a `generated` (keep_unchanged.js).
 * Perché la Fed: la storia dei cambi di Yahoo ha errori di stampa che nessuna regola riconosce tutti (controlli della 1.4.0,
 * ricerca/qa/1.4.0/numeri/). La Fed pubblica una volta alla settimana, quindi gli ultimi giorni (circa una settimana) vengono
 * da Yahoo e sono provvisori: alla corsa dopo la pubblicazione della Fed li sostituisce il valore della Fed.
 * Se FRED non risponde si tiene la parte Fed della serie pubblicata; se Yahoo non risponde, la sua coda pubblicata.
 * Gli errori di stampa della coda di Yahoo NON si correggono qui: li toglie js/emerging.js (cleanFx, solo dopo `fred`).
 * Uso: node scripts/fetch_emerging.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { fetchFred, parseFredDaily } from './fetch_data.js';
import { encodeDates, deltaEncode, decodeDates, deltaDecode } from '../js/indexdata.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/emerging.json');
const P1_YAHOO = Math.floor(Date.parse('2003-01-01') / 1000);
const FRED_SINCE = '2006-01-01';
const FX_SINCE = '2000-01-01'; // cambi della Fed
const TAIL_DAYS = 120; // coda di Yahoo scaricata per i cambi (basta qualche settimana)

/** Serie compatta: date come negli altri file, valori a 4 decimali (2 sopra 1.000, per KRW) */
export function pack(dates, val) {
  const ps = Math.max(...val) < 1000 ? 10000 : 100;
  return { ...encodeDates(dates), cd: deltaEncode(val, ps), ps };
}

/** Sceglie tra la serie nuova e quella pubblicata: tiene la pubblicata se la nuova manca o finisce prima */
export function pickSeries(fresh, prev) {
  if (!fresh) return prev ? { s: prev, kept: true } : null;
  if (prev && prev.last && fresh.last < prev.last) return { s: prev, kept: true };
  // storia accorciata (inizio oltre 40 giorni dopo, o meno del 95% delle righe): si tiene la pubblicata e si segnala
  if (prev && prev.d0 && prev.cd && fresh.d0 && (Date.parse(fresh.d0) - Date.parse(prev.d0) > 40 * 86400000 || fresh.cd.length < 0.95 * prev.cd.length)) return { s: prev, kept: true, short: true };
  return { s: fresh, kept: false };
}

const lastDate = (x) => (x ? x.last : null);

/**
 * Cambio: parte della Fed fino al suo ultimo valore, poi la coda di Yahoo (solo date successive). Restituisce anche lo
 * scarto mediano tra Yahoo e la Fed sulle date comuni degli ultimi 60 giorni, come controllo.
 */
export function splice(fed, tail) {
  const fredLast = fed.dates[fed.dates.length - 1];
  const dates = [...fed.dates], val = [...fed.val];
  const m = new Map(fed.dates.map((d, i) => [d, fed.val[i]])), dev = [];
  const from = new Date(Date.parse(fredLast) - 60 * 86400000).toISOString().slice(0, 10);
  if (tail) tail.dates.forEach((d, i) => {
    if (d > fredLast) { dates.push(d); val.push(tail.val[i]); } else if (d >= from && m.has(d)) dev.push(Math.abs(Math.log(tail.val[i] / m.get(d))));
  });
  dev.sort((a, b) => a - b);
  return { dates, val, fredLast, devMed: dev.length ? dev[Math.floor(dev.length / 2)] : null };
}

/** Indice della prima seduta dopo l'ultimo buco di oltre 35 giorni (0 se non ce ne sono) */
export function lastLongGap(dates, maxDays = 35) {
  let cut = 0;
  for (let i = 1; i < dates.length; i++) if ((Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86400000 > maxDays) cut = i;
  return cut;
}

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/emerging.json'), 'utf8'));
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const fx = [...new Set(Object.values(cfg.indices).map((x) => x.fx).filter(Boolean))];
  const fedOf = Object.fromEntries(Object.values(cfg.indices).filter((x) => x.fx).map((x) => [x.fx, x.fxFred]));
  const prevSer = (s) => { const x = prev && prev.series && prev.series[s]; if (!x || !x.cd) return null; return { x, dates: decodeDates(x.d0, x.gaps), val: deltaDecode(x.cd, x.ps || 1) }; };
  const P1_TAIL = Math.floor(Date.now() / 1000) - TAIL_DAYS * 86400;
  const notes = [];
  const etf = [...new Set([...Object.values(cfg.indices).map((x) => x.etf), cfg.benchmark])];
  const fresh = {}, errors = [];
  // cambio: Fed (o la parte Fed pubblicata) + coda di Yahoo (o la coda pubblicata)
  async function fxSeries(sym) {
    const p = prevSer(sym);
    let fed = null, tail = null;
    try { fed = await fetchFred(fedOf[sym], FX_SINCE, parseFredDaily); } catch (e) {
      errors.push(`${fedOf[sym]} (Fed per ${sym}): ${e.message}`);
      if (p && p.x.fred) { const n = p.dates.filter((d) => d <= p.x.fred).length; fed = { dates: p.dates.slice(0, n), val: p.val.slice(0, n) }; notes.push(`${sym}: tenuta la parte Fed pubblicata`); }
    }
    if (!fed || !fed.dates.length) throw new Error('nessun cambio della Fed');
    try {
      const d = await fetchDaily(sym, { period1: P1_TAIL, raw: true });
      tail = { dates: [], val: [] };
      d.dates.forEach((x, i) => { if (d.close[i] != null && d.close[i] > 0) { tail.dates.push(x); tail.val.push(d.close[i]); } });
    } catch (e) {
      errors.push(`${sym} (Yahoo): ${e.message}`);
      if (p) tail = { dates: p.dates, val: p.val };
    }
    const s = splice(fed, tail);
    const cut = lastLongGap(s.dates);
    const dates = s.dates.slice(cut), val = s.val.slice(cut);
    if (dates.length < 250) throw new Error(`solo ${dates.length} sedute`);
    if (s.devMed != null && s.devMed > 0.01) notes.push(`${sym}: Yahoo si scosta dalla Fed in mediana del ${(100 * s.devMed).toFixed(2)}% negli ultimi 60 giorni`);
    return { ...pack(dates, val), last: dates[dates.length - 1], fred: s.fredLast };
  }
  await mapLimit([...fx.map((s) => [s, 'fx']), ...etf.map((s) => [s, 'etf'])], 2, async ([sym, kind]) => {
    try {
      if (kind === 'fx') { fresh[sym] = await fxSeries(sym); return; }
      const d = await fetchDaily(sym, { period1: P1_YAHOO, dropStale: true });
      let dates = [], v = [];
      d.dates.forEach((x, i) => { if (d.adjclose[i] != null && d.adjclose[i] > 0) { dates.push(x); v.push(d.adjclose[i]); } });
      const cut = lastLongGap(dates);
      if (cut > 0) { dates = dates.slice(cut); v = v.slice(cut); }
      if (dates.length < 250) throw new Error(`solo ${dates.length} sedute`);
      fresh[sym] = { ...pack(dates, v), last: dates[dates.length - 1], adj: true };
    } catch (e) { errors.push(`${sym}: ${e.message}`); }
  });
  try {
    const f = await fetchFred(cfg.fred, FRED_SINCE, parseFredDaily);
    fresh[cfg.fred] = { ...pack(f.dates, f.val), last: f.dates[f.dates.length - 1] };
  } catch (e) { errors.push(`${cfg.fred}: ${e.message}`); }

  const all = [...fx, ...etf, cfg.fred];
  const got = all.filter((s) => fresh[s]).length;
  if (got < 0.8 * all.length) {
    console.error(`Arrivate solo ${got} serie su ${all.length}: data/emerging.json non si aggiorna.\n${errors.join('\n')}`);
    process.exit(1);
  }
  const series = {}, kept = [];
  for (const s of all) {
    const r = pickSeries(fresh[s], prev && prev.series && prev.series[s]);
    if (!r) continue;
    series[s] = r.s;
    if (r.kept) kept.push(s);
    if (r.short) errors.push(`${s}: la serie nuova ha la storia accorciata (dal ${fresh[s].d0}, ${fresh[s].cd.length} righe): tenuta la pubblicata`);
  }
  const minLast = (list) => { const d = list.map((s) => lastDate(series[s])).filter(Boolean).sort(); return d[0] || null; };
  const out = {
    generated: new Date().toISOString(),
    asOf: { fx: minLast(fx), etf: minLast(etf), fred: lastDate(series[cfg.fred]) },
    source: { fx: 'Federal Reserve H.10 da FRED (unità di valuta locale per un dollaro, mezzogiorno di New York); dopo l\'ultimo valore della Fed (campo fred) Yahoo Finance, provvisorio', etf: 'Yahoo Finance (chiusure rettificate per i dividendi)', fred: `FRED ${cfg.fred} (Federal Reserve H.10, settimanale)` },
    missing: all.filter((s) => !series[s]),
    series,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  for (const s of all) console.log(s.padEnd(11), series[s] ? `fino al ${series[s].last}${series[s].fred ? ` (Fed fino al ${series[s].fred})` : ''}${kept.includes(s) ? ' (tenuta la serie pubblicata)' : ''}` : 'mancante');
  if (notes.length) console.warn(`Note:\n${notes.join('\n')}`);
  if (errors.length) console.warn(`Errori:\n${errors.join('\n')}`);
  console.log(`Scritto data/emerging.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB): cambi al ${out.asOf.fx}, ETF al ${out.asOf.etf}, FRED al ${out.asOf.fred}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
