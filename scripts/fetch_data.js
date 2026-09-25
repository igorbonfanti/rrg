#!/usr/bin/env node
/*
 * fetch_data.js — scarica i prezzi giornalieri (adjusted close) da Yahoo Finance per
 * i ticker di universe.json e scrive due file indipendenti:
 *  - data/prices.json: universi USA (calendario NYSE, dollari);
 *  - data/prices_global.json: universi globali (ETF UCITS in euro, calendario di Borsa Italiana).
 * Un ritardo di Yahoo su una borsa non blocca l'altro file.
 *
 * Regole per non pubblicare dati incoerenti:
 *  - si scartano le barre della seduta in corso e le chiusure nulle;
 *  - le date si tagliano all'ultima seduta presente per TUTTI i ticker aggiornati
 *    (niente prezzi ricopiati in coda: un ticker in ritardo fa aspettare tutti);
 *  - un ticker indietro di più di 5 sedute rispetto agli altri viene escluso con un avviso;
 *  - non si sovrascrive mai un file con dati più vecchi di quelli già presenti.
 * Il file riporta asOf (ultima seduta), la seduta attesa e il ritardo in sedute.
 *
 * In più, per gli universi globali:
 *  - Yahoo inserisce la chiusura europea nella serie solo il giorno dopo: per l'ultima
 *    seduta, finita ma ancora vuota, si usa il prezzo finale della quotazione;
 *  - il bitcoin quota sempre: si prende il suo ultimo prezzo a ogni seduta di Milano e
 *    non conta per la data di pubblicazione;
 *  - i ticker non in euro si convertono con il cambio di Yahoo (EURUSD=X, ...);
 *  - un prezzo isolato palesemente sbagliato (salto rispetto al riferimento che rientra
 *    la seduta dopo, molto oltre la normale oscillazione relativa) si corregge e si registra.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { expectedSession, sessionsBetween, MILAN } from '../js/calendar.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UNIVERSE = JSON.parse(fs.readFileSync(path.join(ROOT, 'universe.json'), 'utf-8'));
const OUT = path.join(ROOT, 'data', 'prices.json');
const OUT_GLOBAL = path.join(ROOT, 'data', 'prices_global.json');
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
export function pickAsOf(lastDates, between = sessionsBetween) {
  const maxDate = Object.values(lastDates).sort().at(-1);
  const current = {}, stale = [];
  for (const [sym, d] of Object.entries(lastDates)) {
    if (between(d, maxDate) > MAX_LAG_SESSIONS) stale.push(sym);
    else current[sym] = d;
  }
  const asOf = Object.values(current).sort()[0];
  return { asOf, maxDate, stale };
}

async function updateUS() {
  const meta = collectTickers();
  const symbols = Object.keys(meta);
  console.log(`USA: scarico ${symbols.length} ticker...`);

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
    throw new Error(`troppi ticker falliti (${failed.length}/${symbols.length}): non aggiorno i dati`);
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

// ---------- universi globali (ETF UCITS in euro, calendario di Borsa Italiana) ----------
const round4 = (v) => Math.round(v * 10000) / 10000;
export const SYNTHETIC = 'PTF';

// Controlla la sezione "global" di universe.json; restituisce l'elenco degli errori
export function validateGlobal(G) {
  const err = [];
  if (!G || !G.groups) return ['manca la sezione global.groups'];
  for (const [g, v] of Object.entries(G.groups)) {
    const tick = v.tickers || {};
    if (!Object.keys(tick).length) err.push(`${g}: nessun ticker`);
    const benches = v.benchmarks || [v.defaultBenchmark];
    if (!benches.includes(v.defaultBenchmark)) err.push(`${g}: il benchmark di default non è tra i benchmark`);
    for (const b of benches) {
      if (b === SYNTHETIC) { if (!v.portfolio) err.push(`${g}: benchmark ${SYNTHETIC} senza "portfolio"`); continue; }
      if (!(G.benchmarks || {})[b] && !tick[b]) err.push(`${g}: benchmark ${b} non definito`);
    }
    if (v.portfolio) {
      const w = v.portfolio.weights || {};
      for (const s of Object.keys(w)) if (!tick[s]) err.push(`${g}: peso su ${s}, che non è nel gruppo`);
      const tot = Object.values(w).reduce((t, x) => t + x, 0);
      if (Math.abs(tot - 100) > 1e-9) err.push(`${g}: i pesi sommano a ${tot}, non a 100`);
    }
  }
  return err;
}

// Elenco unico dei ticker globali con nome breve, nome esteso e gruppi
export function collectGlobalTickers(G) {
  const meta = {};
  const put = (sym, info, group) => {
    const m = meta[sym] || (meta[sym] = { label: sym.replace(/\..*$/, ''), name: sym, groups: [] });
    if (info.label) m.label = info.label;
    if (info.name) m.name = info.name;
    if (group && !m.groups.includes(group)) m.groups.push(group);
  };
  for (const [sym, info] of Object.entries(G.benchmarks || {})) { put(sym, info); meta[sym].isBenchmark = true; }
  for (const [g, v] of Object.entries(G.groups || {})) for (const [sym, info] of Object.entries(v.tickers || {})) put(sym, info, g);
  return meta;
}

// Calendario: date di almeno un ticker (escluse le criptovalute) che sono sedute di Borsa Italiana
export function globalCalendar(series, asOf, isTradingDay = MILAN.isTradingDay) {
  const set = new Set();
  for (const s of Object.values(series)) for (const d of s.dates) if (d <= asOf && isTradingDay(d)) set.add(d);
  return [...set].sort();
}

// Ultimo prezzo disponibile a ogni data del calendario (le lacune prendono il prezzo precedente)
export function alignToCalendar(series, dates) {
  const out = {};
  for (const [sym, s] of Object.entries(series)) {
    const arr = new Array(dates.length).fill(null);
    let j = 0, last = null;
    for (let i = 0; i < dates.length; i++) {
      while (j < s.dates.length && s.dates[j] <= dates[i]) last = s.adjclose[j++];
      arr[i] = last == null ? null : round4(last);
    }
    out[sym] = arr;
  }
  return out;
}

/**
 * Corregge i prezzi isolati palesemente sbagliati. Un prezzo si corregge se il suo rendimento
 * rispetto al riferimento supera max(minJump, k × oscillazione relativa tipica delle `win`
 * sedute precedenti) e rientra quasi del tutto la seduta successiva. Il valore corretto è la
 * media geometrica dei due prezzi vicini. Senza riferimento si usa il rendimento semplice.
 * @returns {{close: (number|null)[], fixes: {i: number, from: number, to: number}[]}}
 */
export function repairSpikes(close, ref, { minJump = 0.04, k = 8, win = 60, minObs = 20 } = {}) {
  const out = close.slice();
  const fixes = [];
  const ex = (i) => {
    if (out[i] == null || out[i - 1] == null) return null;
    let r = Math.log(out[i] / out[i - 1]);
    if (ref) {
      if (ref[i] == null || ref[i - 1] == null) return null;
      r -= Math.log(ref[i] / ref[i - 1]);
    }
    return r;
  };
  for (let i = 1; i + 1 < out.length; i++) {
    const e1 = ex(i), e2 = ex(i + 1);
    if (e1 == null || e2 == null) continue;
    let ss = 0, m = 0;
    for (let j = Math.max(1, i - win); j < i; j++) { const e = ex(j); if (e != null) { ss += e * e; m++; } }
    if (m < minObs) continue;
    const thr = Math.max(minJump, k * Math.sqrt(ss / m));
    if (Math.abs(e1) > thr && e1 * e2 < 0 && Math.abs(e1 + e2) < 0.3 * Math.abs(e1)) {
      const to = round4(Math.sqrt(out[i - 1] * out[i + 1]));
      fixes.push({ i, from: out[i], to });
      out[i] = to;
    }
  }
  return { close: out, fixes };
}

// Porta nella valuta del gruppo le serie quotate in altre valute (pence inglesi compresi)
async function toCurrency(series, currency) {
  const need = new Set();
  for (const s of Object.values(series)) {
    const cur = (s.meta.currency || currency) === 'GBp' ? 'GBP' : s.meta.currency || currency;
    if (cur !== currency) need.add(cur);
  }
  const fx = {};
  for (const cur of need) {
    const sym = `${currency}${cur}=X`;
    try { fx[cur] = await fetchDaily(sym, { range: RANGE, raw: true, fillLast: true }); } catch (e) { console.warn(`  cambio ${sym}: ${e.message}`); }
  }
  for (const [sym, s] of Object.entries(series)) {
    const pence = s.meta.currency === 'GBp';
    const cur = pence ? 'GBP' : s.meta.currency || currency;
    if (cur === currency) continue;
    const f = fx[cur];
    if (!f) { console.warn(`  ESCLUSO ${sym}: nessun cambio ${currency}${cur}`); delete series[sym]; continue; }
    let j = 0, rate = null;
    const conv = (v) => (pence ? v / 100 : v) / rate;
    const dates = [], close = [], adjclose = [];
    for (let i = 0; i < s.dates.length; i++) {
      while (j < f.dates.length && f.dates[j] <= s.dates[i]) rate = f.close[j++];
      if (rate == null) continue;
      dates.push(s.dates[i]); close.push(conv(s.close[i])); adjclose.push(conv(s.adjclose[i]));
    }
    series[sym] = { ...s, dates, close, adjclose };
    console.log(`  ${sym}: convertito da ${s.meta.currency} in ${currency}`);
  }
}

async function updateGlobal() {
  const G = UNIVERSE.global;
  if (!G) return;
  const errors = validateGlobal(G);
  if (errors.length) throw new Error('universe.json, sezione global: ' + errors.join('; '));
  const currency = G.currency || 'EUR';
  const meta = collectGlobalTickers(G);
  const symbols = Object.keys(meta);
  console.log(`Globali: scarico ${symbols.length} ticker...`);

  const results = await mapLimit(symbols, 2, async (sym) => {
    try {
      const s = await fetchDaily(sym, { range: RANGE, raw: true, fillLast: true, keepOpenCrypto: true });
      console.log(`  ok ${sym}: ${s.dates.length} barre, ultima ${s.dates.at(-1)} (${s.meta.currency})`);
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
    throw new Error(`troppi ticker falliti (${failed.length}/${symbols.length}): non aggiorno i dati`);
  }
  await toCurrency(series, currency);

  const isCrypto = (sym) => series[sym].meta.instrumentType === 'CRYPTOCURRENCY';
  const lastDates = Object.fromEntries(Object.keys(series).filter((s) => !isCrypto(s)).map((s) => [s, series[s].dates.at(-1)]));
  const { asOf, maxDate, stale } = pickAsOf(lastDates, MILAN.sessionsBetween);
  for (const s of stale) { console.warn(`  ESCLUSO ${s}: ultima barra ${lastDates[s]}, troppo indietro`); delete series[s]; }
  const behind = Object.entries(lastDates).filter(([s, d]) => !stale.includes(s) && d < maxDate).map(([s]) => s);
  if (behind.length) console.log(`  In ritardo su ${maxDate}: ${behind.join(', ')} → pubblico al ${asOf}`);

  if (fs.existsSync(OUT_GLOBAL)) {
    const prev = JSON.parse(fs.readFileSync(OUT_GLOBAL, 'utf-8'));
    if (asOf < prev.asOf) {
      console.log(`Globali: dati scaricati al ${asOf}, più vecchi di quelli pubblicati (${prev.asOf}): non aggiorno.`);
      return;
    }
  }

  const exchange = Object.fromEntries(Object.entries(series).filter(([s]) => !isCrypto(s)));
  const dates = globalCalendar(exchange, asOf);
  const closes = alignToCalendar(series, dates);

  // prezzi anomali: prima il riferimento (da solo), poi gli altri rispetto al riferimento
  const repaired = [];
  const ref = G.reference && closes[G.reference] ? G.reference : null;
  const order = Object.keys(exchange).sort((a, b) => (a === ref ? -1 : b === ref ? 1 : 0));
  for (const sym of order) {
    const r = repairSpikes(closes[sym], sym === ref ? null : ref && closes[ref]);
    closes[sym] = r.close;
    for (const f of r.fixes) {
      repaired.push({ sym, date: dates[f.i], from: f.from, to: f.to });
      console.log(`  CORRETTO ${sym} al ${dates[f.i]}: ${f.from} → ${f.to}`);
    }
  }

  const expected = MILAN.expectedSession();
  const lag = MILAN.sessionsBetween(asOf, expected);
  const tickers = {};
  for (const sym of symbols) {
    if (!closes[sym]) continue;
    tickers[sym] = { name: meta[sym].name, label: meta[sym].label, groups: meta[sym].groups, isBenchmark: !!meta[sym].isBenchmark, quoteCurrency: series[sym].meta.currency, close: closes[sym] };
  }
  const payload = {
    generated: new Date().toISOString(),
    market: 'global',
    calendar: 'Borsa Italiana',
    currency,
    asOf,
    expectedSession: expected,
    lagSessions: lag,
    missing: failed.concat(stale),
    repaired,
    range: RANGE,
    interval: '1d',
    reference: ref,
    groups: Object.fromEntries(Object.entries(G.groups).map(([g, v]) => [g, {
      defaultBenchmark: v.defaultBenchmark,
      benchmarks: v.benchmarks || [v.defaultBenchmark],
      ...(v.portfolio ? { portfolio: { label: v.portfolio.label || 'Portafoglio', weights: v.portfolio.weights } } : {}),
      tickers: Object.keys(v.tickers),
    }])),
    dates,
    tickers,
  };
  fs.writeFileSync(OUT_GLOBAL, JSON.stringify(payload));
  const kb = (fs.statSync(OUT_GLOBAL).size / 1024).toFixed(0);
  console.log(`Scritto ${path.relative(ROOT, OUT_GLOBAL)} (${kb} KB): ${dates.length} date, ${Object.keys(tickers).length} ticker, dati al ${asOf}, seduta attesa ${expected}, ritardo ${lag}, ${repaired.length} prezzi corretti.`);
}

async function main() {
  let ok = true;
  for (const [name, fn] of [['USA', updateUS], ['Globali', updateGlobal]]) {
    try { await fn(); } catch (e) { console.error(`${name}: ${e.message}`); ok = false; }
  }
  if (!ok) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
