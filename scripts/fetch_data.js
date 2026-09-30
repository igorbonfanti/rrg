#!/usr/bin/env node
/*
 * fetch_data.js — scarica i prezzi giornalieri (adjusted close) da Yahoo Finance per
 * i ticker di universe.json e scrive tre file indipendenti:
 *  - data/prices.json: universi USA (calendario NYSE, dollari);
 *  - data/prices_global.json: universi globali (ETF UCITS in euro, calendario di Borsa Italiana);
 *  - data/prices_macro.json: asset reali in dollari contro grandezze macro (ETF USA, bitcoin,
 *    dollar index e CPI da FRED; calendario NYSE).
 * Un ritardo di Yahoo su una borsa (o di FRED) non blocca gli altri file.
 * Uso: node scripts/fetch_data.js [us|global|macro …] (senza argomenti: tutti).
 *
 * Regole per non pubblicare dati incoerenti:
 *  - si scartano le barre della seduta in corso e le chiusure nulle;
 *  - le date si tagliano all'ultima seduta presente per TUTTI i ticker aggiornati
 *    (niente prezzi ricopiati in coda: un ticker in ritardo fa aspettare tutti);
 *  - un ticker indietro di più di 5 sedute rispetto agli altri viene escluso con un avviso;
 *  - non si sovrascrive mai un file con dati più vecchi di quelli già presenti.
 * Il file riporta asOf (ultima seduta), la seduta attesa e il ritardo in sedute. Per ogni ticker
 * max52 serve al drawdown sul solo prezzo: chiusura più alta delle ultime 252 sedute e ultima chiusura,
 * senza la rettifica per i dividendi (stesse date del drawdown rettificato, così i due valori
 * differiscono solo per le cedole), più il massimo intraday, il «52 week high» di TradingView.
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
import { expectedSession, sessionsBetween, isTradingDay, MILAN, NYSE } from '../js/calendar.js';
import { closeHigh, intradayHigh } from '../js/metrics.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UNIVERSE = JSON.parse(fs.readFileSync(path.join(ROOT, 'universe.json'), 'utf-8'));
const OUT = path.join(ROOT, 'data', 'prices.json');
const OUT_GLOBAL = path.join(ROOT, 'data', 'prices_global.json');
const OUT_MACRO = path.join(ROOT, 'data', 'prices_macro.json');
const CPI_SEED = path.join(ROOT, 'config', 'cpi_releases.json');
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

// Scarta le barre successive all'ultima seduta chiusa attesa: una corsa a borsa aperta non deve
// pubblicare prezzi della seduta in corso anche se Yahoo non la segnala come tale.
export function dropAfter(series, expected, keep = () => false) {
  let n = 0;
  for (const [sym, s] of Object.entries(series)) {
    if (keep(sym)) continue;
    while (s.dates.length && s.dates[s.dates.length - 1] > expected) {
      s.dates.pop(); s.close.pop(); s.adjclose.pop(); if (s.high) s.high.pop(); n++;
    }
  }
  return n;
}

// Una lacuna della fonte non cancella un prezzo già pubblicato: per le date senza barra nel nuovo
// scaricamento si tiene il valore del file precedente, riportato alla scala attuale (le rettifiche
// per dividendi riscalano la storia) con il rapporto sull'ultima data con barra in entrambi i file.
export function keepPublished(dates, closes, real, prev) {
  if (!prev || !prev.tickers) return 0;
  const pIdx = new Map(prev.dates.map((d, i) => [d, i]));
  let kept = 0;
  for (const [sym, arr] of Object.entries(closes)) {
    const p = prev.tickers[sym], r = real[sym];
    if (!p || !r) continue;
    let scale = null;
    for (let i = 0; i < dates.length; i++) {
      const j = pIdx.get(dates[i]);
      if (r.has(dates[i])) {
        if (j != null && p.close[j] && arr[i] != null) scale = arr[i] / p.close[j];
        continue;
      }
      if (j == null || p.close[j] == null || scale == null || arr[i] == null) continue;
      const v = Math.round(p.close[j] * scale * 10000) / 10000;
      if (Math.abs(v / arr[i] - 1) > 1e-6) { arr[i] = v; kept++; }
    }
  }
  return kept;
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

// Date con una barra vera (non riempita) per ogni ticker
const realDates = (series) => Object.fromEntries(Object.entries(series).map(([s, v]) => [s, new Set(v.dates)]));

// Chiusure senza la rettifica per i dividendi sulle date del file: la chiusura pubblicata (rettificata)
// divisa per il fattore di rettifica di Yahoo in vigore quel giorno. Il fattore vale 1 dopo l'ultimo
// stacco e sempre 1 per chi non paga cedole: lì le due serie sono identiche.
export function unadjusted(s, dates, adj) {
  const out = new Array(dates.length).fill(null);
  let j = 0, f = null;
  for (let i = 0; i < dates.length; i++) {
    while (j < s.dates.length && s.dates[j] <= dates[i]) {
      const r = s.close[j] ? s.adjclose[j] / s.close[j] : null;
      if (r) f = Math.abs(r - 1) < 1e-9 ? 1 : r;
      j++;
    }
    out[i] = adj[i] == null || f == null ? null : f === 1 ? adj[i] : round4(adj[i] / f);
  }
  return out;
}

/**
 * Massimo a 52 settimane per il drawdown sul solo prezzo: {hi, d, c, ih, id, all?}.
 *  - hi, d, c: chiusura più alta, sua data e ultima chiusura senza rettifica, nelle stesse 252 sedute del
 *    drawdown rettificato (date del file): i due drawdown differiscono solo per le cedole;
 *  - le criptovalute quotano tutti i giorni: si contano anche i fine settimana (all), per tutte e due;
 *  - ih, id: massimo intraday, il «52 week high» di TradingView e dei broker, solo per la nota.
 * @param {{dates: string[], close: number[], adjclose: number[], high?: number[]}} s serie Yahoo del ticker
 * @param {string[]} dates date del file; adj: chiusure rettificate pubblicate per quelle date
 */
export function high52(s, dates, adj, crypto = false) {
  if (!s || !dates.length || !adj) return null;
  const from = dates[Math.max(0, dates.length - 252)], to = dates[dates.length - 1];
  const p = crypto ? closeHigh(s.dates, s.close, from, to) : closeHigh(dates, unadjusted(s, dates, adj), from, to);
  if (!p) return null;
  return { ...p, ...intradayHigh(s, from, to), ...(crypto ? { all: true } : {}) };
}

// Prezzi tenuti ma universe.json cambiato (nomi, etichette, gruppi): si aggiornano solo i metadati,
// così un nome nuovo compare subito invece che alla seduta successiva. I prezzi restano quelli pubblicati.
export function withMeta(prev, groups, meta, extra = {}) {
  const tickers = {};
  for (const [sym, t] of Object.entries(prev.tickers)) {
    const m = meta[sym];
    tickers[sym] = m ? { ...t, name: m.name, ...(m.label != null ? { label: m.label } : {}), groups: m.groups, isBenchmark: !!m.isBenchmark } : t;
  }
  return { ...prev, ...extra, groups, tickers };
}
function writeMetaOnly(file, prev, next) {
  if (JSON.stringify(next) === JSON.stringify(prev)) return;
  fs.writeFileSync(file, JSON.stringify(next));
  console.log(`  ${path.relative(ROOT, file)}: prezzi invariati, nomi e gruppi aggiornati da universe.json`);
}
const usGroups = () => Object.fromEntries(Object.entries(UNIVERSE.groups).map(([g, v]) => [g, { defaultBenchmark: v.defaultBenchmark, tickers: Object.keys(v.tickers) }]));
const globalGroups = (G) => Object.fromEntries(Object.entries(G.groups).map(([g, v]) => [g, {
  defaultBenchmark: v.defaultBenchmark,
  benchmarks: v.benchmarks || [v.defaultBenchmark],
  ...(v.portfolio ? { portfolio: { label: v.portfolio.label || 'Portafoglio', weights: v.portfolio.weights, ...(v.portfolio.classes ? { classes: v.portfolio.classes } : {}) } } : {}),
  tickers: Object.keys(v.tickers),
}]));

// Alla stessa data, un file con meno ticker di quello pubblicato (download fallito) non lo sostituisce
function moreComplete(prev, asOf, have, wanted) {
  if (asOf !== prev.asOf) return true;
  const lost = wanted.filter((s) => prev.tickers[s] && !have.includes(s));
  if (!lost.length) return true;
  console.log(`Stessa data del file pubblicato (${asOf}) ma senza ${lost.join(', ')}: tengo il file pubblicato.`);
  return false;
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
  const expected = expectedSession();
  const cut = dropAfter(series, expected);
  if (cut) console.log(`  Scartate ${cut} barre successive alla seduta attesa ${expected}`);

  const lastDates = Object.fromEntries(Object.entries(series).map(([s, v]) => [s, v.dates.at(-1)]));
  const { asOf, maxDate, stale } = pickAsOf(lastDates);
  if (stale.length > symbols.length * 0.2) throw new Error(`troppi ticker fermi (${stale.join(', ')}): non aggiorno i dati`);
  for (const s of stale) { console.warn(`  ESCLUSO ${s}: ultima barra ${lastDates[s]}, troppo indietro`); delete series[s]; }
  const behind = Object.entries(lastDates).filter(([s, d]) => !stale.includes(s) && d < maxDate).map(([s]) => s);
  if (behind.length) console.log(`  In ritardo su ${maxDate}: ${behind.join(', ')} → pubblico al ${asOf}`);

  // mai tornare indietro rispetto al file esistente
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf-8')) : null;
  if (prev) {
    const prevAsOf = prev.asOf || prev.dates.at(-1);
    const keepPrices = asOf < prevAsOf || !moreComplete(prev, asOf, Object.keys(series), symbols);
    if (asOf < prevAsOf) console.log(`Dati scaricati al ${asOf}, più vecchi di quelli pubblicati (${prevAsOf}): non aggiorno i prezzi.`);
    if (keepPrices) { writeMetaOnly(OUT, prev, withMeta(prev, usGroups(), meta, { benchmarks: UNIVERSE.benchmarks })); return; }
  }

  const { dates, closes } = alignSeries(series, asOf);
  const kept = keepPublished(dates, closes, realDates(series), prev);
  if (kept) console.log(`  Tenuti ${kept} prezzi già pubblicati dove Yahoo ora ha una lacuna`);
  const lag = sessionsBetween(asOf, expected);
  const tickers = {};
  for (const sym of symbols) {
    if (!closes[sym]) continue;
    const max52 = high52(series[sym], dates, closes[sym], series[sym].meta.instrumentType === 'CRYPTOCURRENCY');
    tickers[sym] = { name: meta[sym].name, groups: meta[sym].groups, isBenchmark: !!meta[sym].isBenchmark, ...(max52 ? { max52 } : {}), close: closes[sym] };
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
    groups: usGroups(),
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
      // classi (facoltative): raggruppano le componenti nella spiegazione del portafoglio, ognuna in una sola classe
      if (v.portfolio.classes) {
        const seen = new Set();
        for (const c of v.portfolio.classes) {
          if (!c.name || !Array.isArray(c.tickers) || !c.tickers.length) { err.push(`${g}: una classe del portafoglio non ha nome o ticker`); continue; }
          for (const s of c.tickers) {
            if (!(s in w)) err.push(`${g}: la classe ${c.name} contiene ${s}, che non ha un peso`);
            if (seen.has(s)) err.push(`${g}: ${s} è in più di una classe`);
            seen.add(s);
          }
        }
        for (const s of Object.keys(w)) if (!seen.has(s)) err.push(`${g}: ${s} ha un peso ma non è in nessuna classe`);
      }
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

// Calendario: sedute di Borsa Italiana in cui almeno metà dei ticker già quotati ha una barra.
// Se Yahoo non ha la seduta per la maggior parte degli ETF (es. 24/10/2025) la data si toglie per
// tutti, invece di mescolare prezzi del giorno con prezzi ricopiati dal giorno prima.
export function globalCalendar(series, asOf, isTradingDay = MILAN.isTradingDay, minShare = 0.5) {
  const count = new Map();
  for (const s of Object.values(series)) for (const d of s.dates) if (d <= asOf && isTradingDay(d)) count.set(d, (count.get(d) || 0) + 1);
  const spans = Object.values(series).filter((s) => s.dates.length).map((s) => [s.dates[0], s.dates[s.dates.length - 1]]);
  return [...count.keys()].sort().filter((d) => {
    const active = spans.filter(([a, b]) => a <= d && d <= b).length;
    return count.get(d) >= minShare * active;
  });
}

// Indice di mercato robusto: mediana dei rendimenti giornalieri di tutti gli ETF. È il riferimento per
// riconoscere i prezzi anomali: un vero movimento di mercato sposta la mediana, un errore isolato no.
export function marketIndex(closes, n) {
  const out = new Array(n).fill(null);
  if (!n) return out;
  let v = 1;
  out[0] = v;
  for (let i = 1; i < n; i++) {
    const r = [];
    for (const c of closes) if (c[i] != null && c[i - 1] != null) r.push(Math.log(c[i] / c[i - 1]));
    r.sort((a, b) => a - b);
    const m = !r.length ? 0 : r.length % 2 ? r[(r.length - 1) / 2] : (r[r.length / 2 - 1] + r[r.length / 2]) / 2;
    out[i] = v *= Math.exp(m);
  }
  return out;
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
 * rispetto al riferimento (l'indice di mercato) supera max(minJump, k × oscillazione relativa tipica
 * delle `win` sedute precedenti) e rientra quasi del tutto la seduta successiva. Il valore corretto
 * è la media geometrica dei due prezzi vicini. Senza riferimento si usa il rendimento semplice.
 * @returns {{close: (number|null)[], fixes: {i: number, from: number, to: number}[]}}
 */
export function repairSpikes(close, ref, { minJump = 0.06, k = 10, win = 60, minObs = 20 } = {}) {
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
    const dates = [], close = [], adjclose = [], high = [];
    for (let i = 0; i < s.dates.length; i++) {
      while (j < f.dates.length && f.dates[j] <= s.dates[i]) rate = f.close[j++];
      if (rate == null) continue;
      dates.push(s.dates[i]); close.push(conv(s.close[i])); adjclose.push(conv(s.adjclose[i])); high.push(conv((s.high && s.high[i]) ?? s.close[i]));
    }
    series[sym] = { ...s, dates, close, adjclose, high };
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
  const expected = MILAN.expectedSession();
  const cut = dropAfter(series, expected, isCrypto);
  if (cut) console.log(`  Scartate ${cut} barre successive alla seduta attesa ${expected}`);
  const exchangeSyms = Object.keys(series).filter((s) => !isCrypto(s));
  const lastDates = Object.fromEntries(exchangeSyms.map((s) => [s, series[s].dates.at(-1)]));
  const { asOf, maxDate, stale } = pickAsOf(lastDates, MILAN.sessionsBetween);
  if (stale.length > exchangeSyms.length * 0.2) throw new Error(`troppi ticker fermi (${stale.join(', ')}): non aggiorno i dati`);
  for (const s of stale) { console.warn(`  ESCLUSO ${s}: ultima barra ${lastDates[s]}, troppo indietro`); delete series[s]; }
  // una criptovaluta ferma da più di 4 giorni rispetto alla data di pubblicazione è un dato rotto
  const fourDaysBefore = new Date(Date.parse(asOf + 'T00:00:00Z') - 4 * 86400000).toISOString().slice(0, 10);
  for (const s of Object.keys(series).filter(isCrypto)) {
    if (series[s].dates.at(-1) < fourDaysBefore) { console.warn(`  ESCLUSO ${s}: ultimo prezzo ${series[s].dates.at(-1)}, fermo`); stale.push(s); delete series[s]; }
  }
  const behind = Object.entries(lastDates).filter(([s, d]) => !stale.includes(s) && d < maxDate).map(([s]) => s);
  if (behind.length) console.log(`  In ritardo su ${maxDate}: ${behind.join(', ')} → pubblico al ${asOf}`);

  const prev = fs.existsSync(OUT_GLOBAL) ? JSON.parse(fs.readFileSync(OUT_GLOBAL, 'utf-8')) : null;
  if (prev) {
    const keepPrices = asOf < prev.asOf || !moreComplete(prev, asOf, Object.keys(series), symbols);
    if (asOf < prev.asOf) console.log(`Globali: dati scaricati al ${asOf}, più vecchi di quelli pubblicati (${prev.asOf}): non aggiorno i prezzi.`);
    if (keepPrices) { writeMetaOnly(OUT_GLOBAL, prev, withMeta(prev, globalGroups(G), meta)); return; }
  }

  const exchange = Object.fromEntries(Object.entries(series).filter(([s]) => !isCrypto(s)));
  const dates = globalCalendar(exchange, asOf);
  const closes = alignToCalendar(series, dates);
  const kept = keepPublished(dates, closes, realDates(series), prev);
  if (kept) console.log(`  Tenuti ${kept} prezzi già pubblicati dove Yahoo ora ha una lacuna`);

  // prezzi anomali, rispetto all'indice di mercato (mediana dei rendimenti di tutti gli ETF)
  const repaired = [];
  const mkt = marketIndex(Object.keys(exchange).map((s) => closes[s]), dates.length);
  for (const sym of Object.keys(exchange)) {
    const r = repairSpikes(closes[sym], mkt);
    closes[sym] = r.close;
    for (const f of r.fixes) {
      repaired.push({ sym, date: dates[f.i], from: f.from, to: f.to });
      console.log(`  CORRETTO ${sym} al ${dates[f.i]}: ${f.from} → ${f.to}`);
    }
  }

  const lag = MILAN.sessionsBetween(asOf, expected);
  const tickers = {};
  for (const sym of symbols) {
    if (!closes[sym]) continue;
    const max52 = high52(series[sym], dates, closes[sym], isCrypto(sym));
    tickers[sym] = { name: meta[sym].name, label: meta[sym].label, groups: meta[sym].groups, isBenchmark: !!meta[sym].isBenchmark, quoteCurrency: series[sym].meta.currency, ...(max52 ? { max52 } : {}), close: closes[sym] };
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
    groups: globalGroups(G),
    dates,
    tickers,
  };
  fs.writeFileSync(OUT_GLOBAL, JSON.stringify(payload));
  const kb = (fs.statSync(OUT_GLOBAL).size / 1024).toFixed(0);
  console.log(`Scritto ${path.relative(ROOT, OUT_GLOBAL)} (${kb} KB): ${dates.length} date, ${Object.keys(tickers).length} ticker, dati al ${asOf}, seduta attesa ${expected}, ritardo ${lag}, prezzi corretti: ${repaired.length}.`);
}

// ---------- asset reali contro grandezze macro (ETF USA, bitcoin, dollar index e CPI; calendario NYSE) ----------
const SYNTH_KINDS = ['cpi', 'inverse'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Controlla la sezione "macro" di universe.json; restituisce l'elenco degli errori
export function validateMacro(M) {
  const err = [];
  if (!M || !M.groups) return ['manca la sezione macro.groups'];
  const B = M.benchmarks || {};
  for (const [s, b] of Object.entries(B)) {
    if (b.synthetic && !SYNTH_KINDS.includes(b.synthetic)) err.push(`benchmark ${s}: tipo sintetico «${b.synthetic}» sconosciuto`);
    if (b.synthetic && !b.source) err.push(`benchmark ${s}: manca la serie di partenza (source)`);
  }
  for (const [g, v] of Object.entries(M.groups)) {
    const tick = v.tickers || {};
    if (!Object.keys(tick).length) err.push(`${g}: nessun ticker`);
    const benches = v.benchmarks || [v.defaultBenchmark];
    if (!benches.includes(v.defaultBenchmark)) err.push(`${g}: il benchmark di default non è tra i benchmark`);
    for (const b of benches) if (!B[b] && !tick[b]) err.push(`${g}: benchmark ${b} non definito`);
  }
  return err;
}

// CSV di FRED (fredgraph.csv): valori mensili per «AAAA-MM»; i mesi senza dato (vuoti o «.») si saltano
export function parseFredCsv(text) {
  const out = {};
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const [d, v] = line.split(',');
    const x = Number(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v !== '' && v !== '.' && Number.isFinite(x)) out[d.slice(0, 7)] = x;
  }
  return out;
}

async function fetchFred(id, since) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}&cosd=${since}`;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor data fetch)' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`); // FRED risponde a volte 503: si riprova
      const months = parseFredCsv(await r.text());
      if (!Object.keys(months).length) throw new Error('nessun dato');
      return months;
    } catch (e) {
      lastErr = e;
      await sleep(1500 * 2 ** attempt);
    }
  }
  throw lastErr;
}

// Date di uscita del CPI: quelle note (seme ALFRED e file pubblicato) più quelle dei mesi visti oggi per la prima volta
export function cpiReleases(months, known, today) {
  const releases = { ...known };
  const added = [];
  for (const m of Object.keys(months).sort()) if (!releases[m]) { releases[m] = today; added.push(m); }
  return { releases, added };
}

// CPI «a quanto noto»: a ogni data vale l'ultimo mese già pubblicato (un mese mai uscito resta scoperto)
export function cpiSteps(dates, months, releases) {
  const known = Object.keys(months).filter((m) => releases[m]).sort((a, b) => releases[a].localeCompare(releases[b]) || a.localeCompare(b));
  const out = new Array(dates.length).fill(null);
  let j = 0, month = null;
  for (let i = 0; i < dates.length; i++) {
    for (; j < known.length && releases[known[j]] <= dates[i]; j++) if (!month || known[j] > month) month = known[j];
    out[i] = month ? round4(months[month]) : null;
  }
  return out;
}

// Inverso di una serie (1/DXY), riportato a una scala leggibile
export const inverse = (arr, k = 10000) => arr.map((v) => (v ? round4(k / v) : null));

async function updateMacro() {
  const M = UNIVERSE.macro;
  if (!M) return;
  const errors = validateMacro(M);
  if (errors.length) throw new Error('universe.json, sezione macro: ' + errors.join('; '));
  const meta = collectGlobalTickers(M);
  const synth = Object.fromEntries(Object.entries(M.benchmarks || {}).filter(([, b]) => b.synthetic));
  const symbols = Object.keys(meta).filter((s) => !synth[s]);
  const sources = Object.values(synth).filter((b) => b.synthetic === 'inverse').map((b) => b.source).filter((s) => !symbols.includes(s));
  const toFetch = [...symbols, ...new Set(sources)];
  console.log(`Asset reali: scarico ${toFetch.length} serie da Yahoo...`);

  const results = await mapLimit(toFetch, 2, async (sym) => {
    try {
      const s = await fetchDaily(sym, { range: RANGE, raw: true, keepOpenCrypto: true });
      console.log(`  ok ${sym}: ${s.dates.length} barre, ultima ${s.dates.at(-1)} (${s.meta.instrumentType})`);
      return s;
    } catch (e) {
      console.warn(`  FALLITO ${sym}: ${e.message}`);
      return null;
    }
  }, 150);
  const series = {};
  toFetch.forEach((sym, i) => { if (results[i] && results[i].dates.length) series[sym] = results[i]; });
  const failed = toFetch.filter((s) => !series[s]);
  if (Object.keys(series).length < toFetch.length * 0.8) {
    throw new Error(`troppi ticker falliti (${failed.length}/${toFetch.length}): non aggiorno i dati`);
  }

  // bitcoin (sempre) e dollar index (quasi 24 ore) quotano fuori dall'orario NYSE: ultimo prezzo a ogni seduta,
  // e non contano per la data di pubblicazione (la barra del giorno del DXY resta aperta fino a notte)
  const offHours = (sym) => ['CRYPTOCURRENCY', 'INDEX'].includes(series[sym].meta.instrumentType);
  const expected = expectedSession();
  const cut = dropAfter(series, expected, offHours);
  if (cut) console.log(`  Scartate ${cut} barre successive alla seduta attesa ${expected}`);
  const exchangeSyms = Object.keys(series).filter((s) => !offHours(s));
  const lastDates = Object.fromEntries(exchangeSyms.map((s) => [s, series[s].dates.at(-1)]));
  const { asOf, maxDate, stale } = pickAsOf(lastDates);
  if (stale.length > exchangeSyms.length * 0.2) throw new Error(`troppi ticker fermi (${stale.join(', ')}): non aggiorno i dati`);
  for (const s of stale) { console.warn(`  ESCLUSO ${s}: ultima barra ${lastDates[s]}, troppo indietro`); delete series[s]; }
  const fourDaysBefore = new Date(Date.parse(asOf + 'T00:00:00Z') - 4 * 86400000).toISOString().slice(0, 10);
  for (const s of Object.keys(series).filter(offHours)) {
    if (series[s].dates.at(-1) < fourDaysBefore) { console.warn(`  ESCLUSO ${s}: ultimo prezzo ${series[s].dates.at(-1)}, fermo`); stale.push(s); delete series[s]; }
  }
  const behind = Object.entries(lastDates).filter(([s, d]) => !stale.includes(s) && d < maxDate).map(([s]) => s);
  if (behind.length) console.log(`  In ritardo su ${maxDate}: ${behind.join(', ')} → pubblico al ${asOf}`);

  const prev = fs.existsSync(OUT_MACRO) ? JSON.parse(fs.readFileSync(OUT_MACRO, 'utf-8')) : null;
  if (prev) {
    const keepPrices = asOf < prev.asOf || !moreComplete(prev, asOf, Object.keys(series), symbols);
    if (asOf < prev.asOf) console.log(`Asset reali: dati scaricati al ${asOf}, più vecchi di quelli pubblicati (${prev.asOf}): non aggiorno i prezzi.`);
    if (keepPrices) { writeMetaOnly(OUT_MACRO, prev, withMeta(prev, globalGroups(M), meta)); return; }
  }

  const exchange = Object.fromEntries(Object.entries(series).filter(([s]) => !offHours(s)));
  const dates = globalCalendar(exchange, asOf, isTradingDay);
  const closes = alignToCalendar(series, dates);
  const kept = keepPublished(dates, closes, realDates(series), prev);
  if (kept) console.log(`  Tenuti ${kept} prezzi già pubblicati dove Yahoo ora ha una lacuna`);

  const repaired = [];
  const mkt = marketIndex(Object.keys(exchange).map((s) => closes[s]), dates.length);
  for (const sym of Object.keys(exchange)) {
    const r = repairSpikes(closes[sym], mkt);
    closes[sym] = r.close;
    for (const f of r.fixes) {
      repaired.push({ sym, date: dates[f.i], from: f.from, to: f.to });
      console.log(`  CORRETTO ${sym} al ${dates[f.i]}: ${f.from} → ${f.to}`);
    }
  }

  // benchmark sintetici: inverso di una serie Yahoo e CPI dal giorno di pubblicazione
  let cpi = prev && prev.cpi ? prev.cpi : null;
  for (const [s, b] of Object.entries(synth)) {
    if (b.synthetic === 'inverse') {
      if (closes[b.source]) closes[s] = inverse(closes[b.source]);
      else console.warn(`  ${s}: manca ${b.source}`);
      continue;
    }
    const seed = JSON.parse(fs.readFileSync(CPI_SEED, 'utf-8'));
    let months;
    try {
      months = await fetchFred(b.source, '2019-01-01');
      console.log(`  ok FRED ${b.source}: ${Object.keys(months).length} mesi, ultimo ${Object.keys(months).sort().at(-1)}`);
    } catch (e) {
      console.warn(`  FRED ${b.source}: ${e.message}${cpi ? ': tengo i valori già pubblicati' : ''}`);
      months = cpi ? cpi.months : null;
    }
    if (!months) { failed.push(s); continue; }
    const today = NYSE.localNow().date;
    const { releases, added } = cpiReleases(months, { ...seed.releases, ...(cpi ? cpi.releases : {}) }, today);
    if (added.length) console.log(`  ${b.source}: nuovi mesi ${added.join(', ')}, pubblicati entro il ${today}`);
    cpi = { series: b.source, source: 'U.S. Bureau of Labor Statistics via FRED (fred.stlouisfed.org)', months, releases };
    closes[s] = cpiSteps(dates, months, releases);
  }

  // alla stessa data, un file senza un benchmark sintetico già pubblicato (fonte mancata) non lo sostituisce
  const lostSynth = prev && asOf === prev.asOf ? Object.keys(synth).filter((s) => prev.tickers[s] && !closes[s]) : [];
  if (lostSynth.length) {
    console.log(`Stessa data del file pubblicato (${asOf}) ma senza ${lostSynth.join(', ')}: tengo il file pubblicato.`);
    writeMetaOnly(OUT_MACRO, prev, withMeta(prev, globalGroups(M), meta));
    return;
  }

  const lag = sessionsBetween(asOf, expected);
  const tickers = {};
  for (const sym of Object.keys(meta)) {
    if (!closes[sym]) continue;
    const t = { name: meta[sym].name, label: meta[sym].label, groups: meta[sym].groups, isBenchmark: !!meta[sym].isBenchmark };
    if (synth[sym]) t.synthetic = true;
    else {
      t.quoteCurrency = series[sym].meta.currency;
      const max52 = high52(series[sym], dates, closes[sym], series[sym].meta.instrumentType === 'CRYPTOCURRENCY');
      if (max52) t.max52 = max52;
    }
    tickers[sym] = { ...t, close: closes[sym] };
  }
  const payload = {
    generated: new Date().toISOString(),
    market: 'macro',
    calendar: 'NYSE',
    currency: M.currency || 'USD',
    asOf,
    expectedSession: expected,
    lagSessions: lag,
    missing: failed.concat(stale),
    repaired,
    cpi,
    range: RANGE,
    interval: '1d',
    groups: globalGroups(M),
    dates,
    tickers,
  };
  fs.writeFileSync(OUT_MACRO, JSON.stringify(payload));
  const kb = (fs.statSync(OUT_MACRO).size / 1024).toFixed(0);
  console.log(`Scritto ${path.relative(ROOT, OUT_MACRO)} (${kb} KB): ${dates.length} date, ${Object.keys(tickers).length} serie, dati al ${asOf}, seduta attesa ${expected}, ritardo ${lag}, prezzi corretti: ${repaired.length}.`);
}

async function main() {
  const jobs = { us: ['USA', updateUS], global: ['Globali', updateGlobal], macro: ['Asset reali', updateMacro] };
  const pick = process.argv.slice(2).filter((a) => jobs[a]);
  let ok = true;
  for (const [name, fn] of (pick.length ? pick : Object.keys(jobs)).map((k) => jobs[k])) {
    try { await fn(); } catch (e) { console.error(`${name}: ${e.message}`); ok = false; }
  }
  if (!ok) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
