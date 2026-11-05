#!/usr/bin/env node
/*
 * fetch_emerging.js — dati della vista 8 «Emergenti» (solo contesto): cambi in valuta locale per un dollaro (Yahoo),
 * ETF in dollari per la forza relativa contro ACWI (Yahoo, chiusure rettificate per i dividendi) e il dollaro contro le
 * valute emergenti (FRED DTWEXEMEGS, pubblicato una volta alla settimana). Scrive data/emerging.json.
 *
 * Regole (le stesse degli altri file): niente barre aperte (parse di yahoo.js), niente barre segnaposto per gli ETF; una
 * serie che non arriva o arriva più vecchia di quella pubblicata resta quella pubblicata; con meno dell'80% delle serie
 * arrivate il file non si scrive. Nessun campo che cambia a ogni corsa oltre a `generated` (keep_unchanged.js).
 * La storia di Yahoo dei cambi ha buchi di mesi fino al 2006: si tiene quella dopo l'ultimo buco oltre 35 giorni.
 * Gli errori di stampa dei cambi NON si correggono qui: li toglie js/emerging.js (cleanFx) al momento del calcolo, come il
 * backtest, così il file resta la serie di Yahoo.
 * Uso: node scripts/fetch_emerging.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { fetchFred, parseFredDaily } from './fetch_data.js';
import { encodeDates, deltaEncode } from '../js/indexdata.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/emerging.json');
const P1_YAHOO = Math.floor(Date.parse('2003-01-01') / 1000);
const FRED_SINCE = '2006-01-01';

/** Serie compatta: date come negli altri file, valori a 4 decimali (2 sopra 1.000, per KRW) */
export function pack(dates, val) {
  const ps = Math.max(...val) < 1000 ? 10000 : 100;
  return { ...encodeDates(dates), cd: deltaEncode(val, ps), ps };
}

/** Sceglie tra la serie nuova e quella pubblicata: tiene la pubblicata se la nuova manca o finisce prima */
export function pickSeries(fresh, prev) {
  if (!fresh) return prev ? { s: prev, kept: true } : null;
  if (prev && prev.last && fresh.last < prev.last) return { s: prev, kept: true };
  return { s: fresh, kept: false };
}

const lastDate = (x) => (x ? x.last : null);

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
  const etf = [...new Set([...Object.values(cfg.indices).map((x) => x.etf), cfg.benchmark])];
  const fresh = {}, errors = [];
  await mapLimit([...fx.map((s) => [s, 'fx']), ...etf.map((s) => [s, 'etf'])], 2, async ([sym, kind]) => {
    try {
      const d = await fetchDaily(sym, { period1: P1_YAHOO, raw: kind === 'fx', dropStale: kind === 'etf' });
      const val = kind === 'etf' ? d.adjclose : d.close;
      let dates = [], v = [];
      d.dates.forEach((x, i) => { if (val[i] != null && val[i] > 0) { dates.push(x); v.push(val[i]); } });
      // i cambi di Yahoo hanno buchi di mesi fino al 2006: si tiene la storia dopo l'ultimo buco oltre 35 giorni
      const cut = lastLongGap(dates);
      if (cut > 0) { dates = dates.slice(cut); v = v.slice(cut); }
      if (dates.length < 250) throw new Error(`solo ${dates.length} sedute`);
      fresh[sym] = { ...pack(dates, v), last: dates[dates.length - 1], ...(kind === 'etf' ? { adj: true } : {}) };
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
  }
  const minLast = (list) => { const d = list.map((s) => lastDate(series[s])).filter(Boolean).sort(); return d[0] || null; };
  const out = {
    generated: new Date().toISOString(),
    asOf: { fx: minLast(fx), etf: minLast(etf), fred: lastDate(series[cfg.fred]) },
    source: { fx: 'Yahoo Finance (unità di valuta locale per un dollaro, chiusura di Londra)', etf: 'Yahoo Finance (chiusure rettificate per i dividendi)', fred: `FRED ${cfg.fred} (Federal Reserve H.10, settimanale)` },
    missing: all.filter((s) => !series[s]),
    series,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  for (const s of all) console.log(s.padEnd(11), series[s] ? `fino al ${series[s].last}${kept.includes(s) ? ' (tenuta la serie pubblicata)' : ''}` : 'mancante');
  if (errors.length) console.warn(`Errori:\n${errors.join('\n')}`);
  console.log(`Scritto data/emerging.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB): cambi al ${out.asOf.fx}, ETF al ${out.asOf.etf}, FRED al ${out.asOf.fred}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
