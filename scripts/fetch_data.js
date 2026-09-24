#!/usr/bin/env node
/*
 * fetch_data.js — scarica i prezzi giornalieri (adjusted close) da Yahoo Finance per
 * tutti i ticker di universe.json e scrive data/prices.json.
 *
 * Regole per non pubblicare dati incoerenti:
 *  - si scartano le barre della seduta in corso e le chiusure nulle;
 *  - le date si tagliano all'ultima seduta presente per TUTTI i ticker aggiornati
 *    (niente prezzi ricopiati in coda: un ticker in ritardo fa aspettare tutti);
 *  - un ticker indietro di più di 5 sedute rispetto agli altri viene escluso con un avviso;
 *  - non si sovrascrive mai un file con dati più vecchi di quelli già presenti.
 * Il file riporta asOf (ultima seduta), la seduta attesa e il ritardo in sedute.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { expectedSession, sessionsBetween } from '../js/calendar.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UNIVERSE = JSON.parse(fs.readFileSync(path.join(ROOT, 'universe.json'), 'utf-8'));
const OUT = path.join(ROOT, 'data', 'prices.json');
const RANGE = '5y';
const MAX_LAG_SESSIONS = 5;

// Elenco unico dei ticker (gruppi + benchmark) con metadati
function collectTickers() {
  const meta = {};
  for (const [sym, name] of Object.entries(UNIVERSE.benchmarks || {})) {
    meta[sym] = meta[sym] || { name, groups: [] };
    meta[sym].isBenchmark = true;
  }
  for (const [groupName, group] of Object.entries(UNIVERSE.groups || {})) {
    for (const [sym, name] of Object.entries(group.tickers || {})) {
      meta[sym] = meta[sym] || { name, groups: [] };
      meta[sym].name = name;
      meta[sym].groups.push(groupName);
    }
  }
  return meta;
}

// Allinea le serie su un calendario comune tagliato ad asOf. Le lacune interne si
// riempiono con l'ultimo prezzo noto; prima della prima quotazione resta null.
export function alignSeries(series, asOf) {
  const dateSet = new Set();
  for (const s of Object.values(series)) for (const d of s.dates) if (d <= asOf) dateSet.add(d);
  const dates = [...dateSet].sort();
  const out = {};
  for (const [sym, s] of Object.entries(series)) {
    const byDate = new Map(s.dates.map((d, i) => [d, s.adjclose[i]]));
    let last = null;
    out[sym] = dates.map((d) => {
      if (byDate.has(d)) last = Math.round(byDate.get(d) * 10000) / 10000;
      return last;
    });
  }
  return { dates, closes: out };
}

// Sceglie la data di pubblicazione: la più recente comune a tutti i ticker non in grave ritardo
export function pickAsOf(lastDates) {
  const maxDate = Object.values(lastDates).sort().at(-1);
  const current = {}, stale = [];
  for (const [sym, d] of Object.entries(lastDates)) {
    if (sessionsBetween(d, maxDate) > MAX_LAG_SESSIONS) stale.push(sym);
    else current[sym] = d;
  }
  const asOf = Object.values(current).sort()[0];
  return { asOf, maxDate, stale };
}

async function main() {
  const meta = collectTickers();
  const symbols = Object.keys(meta);
  console.log(`Scarico ${symbols.length} ticker...`);

  const results = await mapLimit(symbols, 2, async (sym) => {
    try {
      const s = await fetchDaily(sym, { range: RANGE });
      console.log(`  ok ${sym}: ${s.dates.length} barre, ultima ${s.dates.at(-1)}`);
      return s;
    } catch (e) {
      console.warn(`  FALLITO ${sym}: ${e.message}`);
      return null;
    }
  }, 150);

  const series = {};
  symbols.forEach((sym, i) => { if (results[i] && results[i].dates.length) series[sym] = results[i]; });
  const failed = symbols.filter((s) => !series[s]);
  if (Object.keys(series).length < symbols.length * 0.8) {
    console.error(`Troppi ticker falliti (${failed.length}/${symbols.length}): non aggiorno i dati.`);
    process.exit(1);
  }

  const lastDates = Object.fromEntries(Object.entries(series).map(([s, v]) => [s, v.dates.at(-1)]));
  const { asOf, maxDate, stale } = pickAsOf(lastDates);
  for (const s of stale) { console.warn(`  ESCLUSO ${s}: ultima barra ${lastDates[s]}, troppo indietro`); delete series[s]; }
  const behind = Object.entries(lastDates).filter(([s, d]) => !stale.includes(s) && d < maxDate).map(([s]) => s);
  if (behind.length) console.log(`  In ritardo su ${maxDate}: ${behind.join(', ')} → pubblico al ${asOf}`);

  // mai tornare indietro rispetto al file esistente
  if (fs.existsSync(OUT)) {
    const prev = JSON.parse(fs.readFileSync(OUT, 'utf-8'));
    const prevAsOf = prev.asOf || prev.dates.at(-1);
    if (asOf < prevAsOf) {
      console.log(`Dati scaricati al ${asOf}, più vecchi di quelli pubblicati (${prevAsOf}): non aggiorno.`);
      return;
    }
  }

  const { dates, closes } = alignSeries(series, asOf);
  const expected = expectedSession();
  const lag = sessionsBetween(asOf, expected);
  const tickers = {};
  for (const sym of symbols) {
    if (!closes[sym]) continue;
    tickers[sym] = { name: meta[sym].name, groups: meta[sym].groups, isBenchmark: !!meta[sym].isBenchmark, close: closes[sym] };
  }
  const payload = {
    generated: new Date().toISOString(),
    asOf,
    expectedSession: expected,
    lagSessions: lag,
    missing: failed.concat(stale),
    range: RANGE,
    interval: '1d',
    benchmarks: UNIVERSE.benchmarks,
    groups: Object.fromEntries(
      Object.entries(UNIVERSE.groups).map(([g, v]) => [g, { defaultBenchmark: v.defaultBenchmark, tickers: Object.keys(v.tickers) }]),
    ),
    dates,
    tickers,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`Scritto ${path.relative(ROOT, OUT)} (${kb} KB): ${dates.length} date, ${Object.keys(tickers).length} ticker, dati al ${asOf}, seduta attesa ${expected}, ritardo ${lag}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
