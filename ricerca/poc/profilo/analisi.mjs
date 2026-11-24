#!/usr/bin/env node
/*
 * analisi.mjs — profilo dei volumi degli ultimi 12 mesi accanto al grafico del pannello «Distanza dal massimo degli
 * ultimi 3 anni» (vista 8 VIX). Fase 1: non tocca l'app. Legge solo ricerca/poc/cache/ (scritta da ricerca/poc/dati.mjs,
 * risposte grezze di Yahoo) e scrive in ricerca/poc/profilo/: risultati.json e profilo_app.json (il file che la pipeline
 * notturna pubblicherebbe, per misurarne la dimensione e disegnare il prototipo).
 *
 * Uso: node ricerca/poc/profilo/analisi.mjs && python3 -I ricerca/poc/profilo/verifica.py
 *
 * CRITERIO (deciso prima di guardare i risultati, in testa a sintesi.md): un profilo è mostrabile se
 *  (a) la value area del 70% dei 6 profili (giornaliero spalmato e orario spalmato × 50, 100, 200 fasce) ha il bordo basso
 *      entro il 2% (massimo / minimo − 1) e il bordo alto entro il 2%;
 *  (b) la sovrapposizione tra il profilo scelto (giornaliero spalmato, 100 fasce) e ognuna delle 5 alternative è ≥ 0,85;
 *  (c) alla fine di ognuna delle ultime 60 sedute (finestra mobile di 12 mesi) il profilo scelto ha sovrapposizione ≥ 0,90
 *      con quello della seduta prima (tutte le 60 coppie).
 *
 * METODO
 *  - Finestra: sedute da windowStart(ultima seduta, 1) (js/ath.js, stessa data di un anno prima) all'ultima seduta chiusa
 *    del mercato del grafico (parse di scripts/lib/yahoo.js, come scripts/fetch_ath.js).
 *  - Strumento dei volumi: SPY (S&P 500), QQQ (Nasdaq-100), 069500.KS (KOSPI), lo stesso simbolo per gli altri (BTC-USD,
 *    GC=F, SI=F, HG=F, CL=F, SOXX). Prezzi portati sulla scala del grafico moltiplicando per il rapporto delle chiusure
 *    giornaliere della stessa seduta (grafico / strumento: 1 quando sono lo stesso simbolo); sedute senza le due chiusure
 *    scartate. Future: prezzi del continuo di Yahoo così come sono (la stessa linea del grafico); la scala del contratto
 *    attuale è solo un confronto.
 *  - Barre giornaliere: se il volume giornaliero di Yahoo è meno della metà della somma oraria della stessa seduta
 *    (mediana sui 12 mesi: SI=F e HG=F, il cui storico giornaliero è il contratto del mese più vicino) la barra del giorno
 *    si costruisce dalle barre orarie (contratto attivo): massimo, minimo, somma dei volumi. Un volume giornaliero uguale a
 *    quello della seduta prima (Yahoo ricopia il volume del giorno prima sull'ultima seduta dei future) si scarta.
 *  - Barre orarie (solo alternativa): ore assegnate alla seduta (future: dalle 18 di New York alla seduta dopo; bitcoin il
 *    giorno UTC; ETF e indici il giorno di borsa). Se il giornaliero è buono, i volumi orari si riportano al volume del
 *    giorno (servono solo a distribuirlo nelle ore: SOXX ha i volumi orari non rettificati per lo split del 05/11/2026,
 *    BTC-USD ha metà delle ore a volume 0, le ore degli ETF non hanno l'asta di chiusura).
 *  - Spalmato: il volume di una barra si divide in modo uniforme sulla scala logaritmica tra minimo e massimo; barra senza
 *    escursione: tutto nella fascia della chiusura. Fasce: n fasce uguali sulla scala logaritmica tra il minimo e il
 *    massimo (prove a e b: delle barre giornaliere e orarie insieme; prova c e file dell'app: delle sole giornaliere).
 *  - Value area 70%: dalla fascia più piena (parità: la più bassa) si aggiunge ogni volta la vicina più piena (parità:
 *    sopra) finché la somma arriva al 70% del totale.
 *  - Solo informativi: orario con il volume alla chiusura dell'ora; altri strumenti (ES=F, volume di ^GSPC, NQ=F, EWY,
 *    volume di ^KS11) e scala del contratto attuale per i future (GCZ26, SIZ26, HGZ26, CLZ26), confrontati con il profilo
 *    scelto su 100 fasce tra il minimo e il massimo dei due.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { parse } from '../../../scripts/lib/yahoo.js';
import { windowStart } from '../../../js/ath.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// POC_CACHE: un'altra cartella con le risposte grezze nello stesso formato (confronto_app.mjs, 1.11.0)
const CACHE = process.env.POC_CACHE ? path.resolve(process.env.POC_CACHE) : path.join(HERE, '..', 'cache');
const r4 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10000) / 10000);
const r6 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 1e6) / 1e6);
const median = (a) => { const s = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

// ------------------------------------------------------------------ dati grezzi
const RAW = new Map();
function raw(kind, sym) {
  const k = `${kind}_${sym}`;
  if (RAW.has(k)) return RAW.get(k);
  const f = path.join(CACHE, `${kind}_${sym.replace(/[^A-Za-z0-9.-]/g, '_')}.json`);
  let v = null;
  if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, 'utf-8')); if (j.res && !j.res.error) v = { res: j.res, fetchedSec: Date.parse(j.fetched) / 1000 }; }
  RAW.set(k, v);
  return v;
}
export const chartDaily = (sym) => { const r = raw('d', sym); return parse(r.res, { nowSec: r.fetchedSec }); };
const FMT = {};
function localDate(ts, tz) {
  const f = FMT[tz] || (FMT[tz] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }));
  const p = Object.fromEntries(f.formatToParts(ts * 1000).map((x) => [x.type, x.value]));
  return { d: `${p.year}-${p.month}-${p.day}`, h: +p.hour };
}
const nextDay = (d) => new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10);
const BARS = new Map();
/** barre OHLCV con la seduta (s); scarta le barre senza chiusura; massimo e minimo comprendono la chiusura */
function bars(kind, sym) {
  const k = `${kind}_${sym}`;
  if (BARS.has(k)) return BARS.get(k);
  const r = raw(kind, sym);
  if (!r) { BARS.set(k, null); return null; }
  const { res } = r, q = res.indicators.quote[0], tz = res.meta.exchangeTimezoneName;
  const fut = res.meta.instrumentType === 'FUTURE', hourly = res.meta.dataGranularity !== '1d';
  const out = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    const c = q.close[i];
    if (c == null) continue;
    const t = res.timestamp[i], ld = localDate(t, tz);
    const s = fut && hourly && ld.h >= 18 ? nextDay(ld.d) : ld.d;
    const h = q.high[i] != null ? Math.max(q.high[i], c) : c, l = q.low[i] != null ? Math.min(q.low[i], c) : c;
    out.push({ t, s, h, l, c, v: q.volume[i] || 0 });
  }
  BARS.set(k, out);
  return out;
}
const closeMap = (b) => { const m = new Map(); for (const x of b) m.set(x.s, x.c); return m; };

// ------------------------------------------------------------------ barre dello strumento dei volumi sulla scala del grafico
/**
 * @param {{chart:string, vol:string, scale?:string, contract?:string}} o
 * @returns {{daily: object[], hourly: object[], info: object}}
 */
export function mapped(o, from, to, withHourly = true) {
  const volD = bars('d', o.vol), volH = bars('h', o.vol) || []; // senza barre orarie (confronto_app.mjs): regola giornaliero/orario non applicata
  const target = o.scale === 'contract' ? closeMap(bars('c', o.contract)) : closeMap(bars('d', o.chart));
  const vm = closeMap(volD);
  const factor = (s) => (target.has(s) && vm.has(s) ? target.get(s) / vm.get(s) : null);
  const hsum = new Map();
  for (const x of volH) if (x.s >= from && x.s <= to) hsum.set(x.s, (hsum.get(x.s) || 0) + x.v);
  const dIn = volD.filter((x) => x.s >= from && x.s <= to);
  const dailyVsHourly = median(dIn.filter((x) => hsum.get(x.s) > 0).map((x) => x.v / hsum.get(x.s)));
  const fromHourly = dailyVsHourly != null && dailyVsHourly < 0.5;
  const info = { dailyVsHourly: r4(dailyVsHourly), dailyFromHourly: fromHourly, skippedDaily: 0, skippedHourly: 0, staleDaily: [], hourlyVolumeShare: null };
  const daily = [], dv = new Map(), stale = new Set();
  if (fromHourly) {
    const agg = new Map();
    for (const x of volH) {
      if (x.s < from || x.s > to) continue;
      const a = agg.get(x.s);
      if (!a) agg.set(x.s, { s: x.s, h: x.h, l: x.l, c: x.c, v: x.v });
      else { a.h = Math.max(a.h, x.h); a.l = Math.min(a.l, x.l); a.c = x.c; a.v += x.v; }
    }
    for (const a of [...agg.values()].sort((p, q) => (p.s < q.s ? -1 : 1))) {
      const f = factor(a.s); if (f == null) { info.skippedDaily++; continue; }
      daily.push({ s: a.s, h: a.h * f, l: a.l * f, c: a.c * f, v: a.v }); dv.set(a.s, a.v);
    }
  } else {
    const prevV = new Map(volD.map((x, i) => [x.s, i ? volD[i - 1].v : null]));
    for (const x of dIn) {
      const f = factor(x.s); if (f == null) { info.skippedDaily++; continue; }
      let v = x.v;
      if (v > 0 && prevV.get(x.s) === v) { info.staleDaily.push(x.s); stale.add(x.s); v = 0; }
      daily.push({ s: x.s, h: x.h * f, l: x.l * f, c: x.c * f, v }); dv.set(x.s, v);
    }
  }
  const hourly = [];
  if (withHourly) {
    let got = 0;
    const tot = daily.reduce((a, x) => a + x.v, 0);
    for (const x of volH) {
      if (x.s < from || x.s > to) continue;
      const f = factor(x.s); if (f == null) { info.skippedHourly++; continue; }
      let k;
      if (fromHourly || stale.has(x.s)) k = 1;
      else k = hsum.get(x.s) > 0 && dv.has(x.s) ? dv.get(x.s) / hsum.get(x.s) : 0;
      const v = x.v * k;
      got += stale.has(x.s) ? 0 : v;
      hourly.push({ s: x.s, h: x.h * f, l: x.l * f, c: x.c * f, v });
    }
    info.hourlyVolumeShare = r4(got / tot); // quota del volume giornaliero che le ore riescono a distribuire
  }
  info.sessions = daily.length;
  return { daily, hourly, info };
}

// ------------------------------------------------------------------ profili
export const logEdges = (lo, hi, n) => Array.from({ length: n + 1 }, (_, i) => Math.exp(Math.log(lo) + ((Math.log(hi) - Math.log(lo)) * i) / n));
function binOf(e, p) {
  if (p <= e[0]) return 0;
  if (p >= e[e.length - 1]) return e.length - 2;
  let a = 0, b = e.length - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (e[m] <= p) a = m; else b = m; }
  return a;
}
export function profile(items, mode, e) {
  const v = new Float64Array(e.length - 1);
  for (const x of items) {
    if (!(x.v > 0)) continue;
    if (mode === 'close' || x.h <= x.l) { v[binOf(e, x.c)] += x.v; continue; }
    const i0 = binOf(e, x.l), i1 = binOf(e, x.h), w = Math.log(x.h) - Math.log(x.l);
    for (let i = i0; i <= i1; i++) v[i] += (x.v * (Math.log(Math.min(x.h, e[i + 1])) - Math.log(Math.max(x.l, e[i])))) / w;
  }
  return v;
}
const shares = (v) => { const t = v.reduce((a, b) => a + b, 0); return Array.from(v, (x) => x / t); };
function valueArea(v, e) {
  let p = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[p]) p = i;
  const tot = v.reduce((a, b) => a + b, 0);
  let lo = p, hi = p, s = v[p];
  while (s < 0.7 * tot) {
    const up = hi + 1 < v.length ? v[hi + 1] : -1, dn = lo - 1 >= 0 ? v[lo - 1] : -1;
    if (up < 0 && dn < 0) break;
    if (up >= dn) { hi++; s += up; } else { lo--; s += dn; }
  }
  return { peak: Math.sqrt(e[p] * e[p + 1]), val: e[lo], vah: e[hi + 1], vaShare: s / tot };
}
const coarsen = (q, n) => { const k = q.length / n, o = new Array(n).fill(0); for (let i = 0; i < q.length; i++) o[Math.floor(i / k)] += q[i]; return o; };
function overlap(p, q) {
  const n = Math.min(p.length, q.length), a = p.length === n ? p : coarsen(p, n), b = q.length === n ? q : coarsen(q, n);
  let s = 0; for (let i = 0; i < n; i++) s += Math.min(a[i], b[i]);
  return s;
}
export const rangeOf = (items) => [Math.min(...items.map((x) => x.l)), Math.max(...items.map((x) => x.h))];
// secondo picco: la fascia più piena ad almeno il 3% dalla più piena, in quota della più piena (informativo)
function secondPeak(v, e) {
  let p = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[p]) p = i;
  const c = (i) => Math.sqrt(e[i] * e[i + 1]);
  let q = -1; for (let i = 0; i < v.length; i++) if (Math.abs(c(i) / c(p) - 1) >= 0.03 && (q < 0 || v[i] > v[q])) q = i;
  return q < 0 ? null : { level: c(q), share: v[q] / v[p] };
}

// ------------------------------------------------------------------ mercati
const MARKETS = [
  { id: 'BTC', label: 'Bitcoin', chart: 'BTC-USD', vol: 'BTC-USD', alts: [] },
  { id: 'GOLD', label: 'Oro', chart: 'GC=F', vol: 'GC=F', contract: 'GCZ26.CMX', alts: [{ vol: 'GC=F', scale: 'contract' }] },
  { id: 'SILVER', label: 'Argento', chart: 'SI=F', vol: 'SI=F', contract: 'SIZ26.CMX', alts: [{ vol: 'SI=F', scale: 'contract' }] },
  { id: 'COPPER', label: 'Rame', chart: 'HG=F', vol: 'HG=F', contract: 'HGZ26.CMX', alts: [{ vol: 'HG=F', scale: 'contract' }] },
  { id: 'WTI', label: 'Petrolio WTI', chart: 'CL=F', vol: 'CL=F', contract: 'CLZ26.NYM', alts: [{ vol: 'CL=F', scale: 'contract' }] },
  { id: 'NDX', label: 'Nasdaq-100', chart: '^NDX', vol: 'QQQ', alts: [{ vol: 'NQ=F' }] },
  { id: 'SPX', label: 'S&P 500', chart: '^GSPC', vol: 'SPY', alts: [{ vol: 'ES=F' }, { vol: '^GSPC' }] },
  { id: 'SOXX', label: 'Semiconduttori', chart: 'SOXX', vol: 'SOXX', alts: [] },
  { id: 'KOSPI', label: 'KOSPI', chart: '^KS11', vol: '069500.KS', alts: [{ vol: 'EWY' }, { vol: '^KS11' }] },
];
const NS = [50, 100, 200];
const MAIN = { method: 'b', n: 100 };

function analyse(M) {
  const ch = chartDaily(M.chart), to = ch.dates[ch.dates.length - 1], from = windowStart(to, 1);
  const o = { chart: M.chart, vol: M.vol, contract: M.contract };
  const m = mapped(o, from, to);
  const [lo, hi] = rangeOf([...m.daily, ...m.hourly]);
  const prof = {}, va = {};
  for (const [k, items, mode] of [['b', m.daily, 'spread'], ['c2', m.hourly, 'spread'], ['c', m.hourly, 'close']]) {
    for (const n of NS) {
      if (k === 'c' && n !== 100) continue;
      const e = logEdges(lo, hi, n), v = profile(items, mode, e);
      prof[`${k}${n}`] = shares(v);
      const a = valueArea(v, e);
      va[`${k}${n}`] = { val: r6(a.val), vah: r6(a.vah), peak: r6(a.peak), vaShare: r4(a.vaShare) };
    }
  }
  const main = `${MAIN.method}${MAIN.n}`, set = ['b50', 'b100', 'b200', 'c250', 'c2100', 'c2200'];
  const vals = set.map((k) => va[k].val), vahs = set.map((k) => va[k].vah);
  const valSpread = Math.max(...vals) / Math.min(...vals) - 1, vahSpread = Math.max(...vahs) / Math.min(...vahs) - 1;
  const ov = {}; for (const k of set) if (k !== main) ov[k] = r4(overlap(prof[main], prof[k]));
  const minOv = Math.min(...Object.values(ov));
  const testA = valSpread <= 0.02 && vahSpread <= 0.02, testB = minOv >= 0.85;
  const e100 = logEdges(lo, hi, 100), sp = secondPeak(profile(m.daily, 'spread', e100), e100);

  // (c) da un giorno all'altro: ultime 60 sedute, finestra mobile, solo il metodo scelto (barre giornaliere)
  const ends = ch.dates.slice(-61), days = [];
  for (const t of ends) { const mm = mapped(o, windowStart(t, 1), t, false); days.push({ t, d: mm.daily }); }
  const pairs = [];
  for (let i = 1; i < days.length; i++) {
    const [l0, h0] = rangeOf([...days[i - 1].d, ...days[i].d]), e = logEdges(l0, h0, 100);
    const p = profile(days[i - 1].d, 'spread', e), q = profile(days[i].d, 'spread', e);
    const a0 = valueArea(p, e), a1 = valueArea(q, e);
    pairs.push({ d: days[i].t, overlap: r4(overlap(shares(p), shares(q))), valChangePct: r4((a1.val / a0.val - 1) * 100), vahChangePct: r4((a1.vah / a0.vah - 1) * 100) });
  }
  const pOv = pairs.map((x) => x.overlap), minPair = Math.min(...pOv);
  const testC = minPair >= 0.9;

  // informativi: orario alla chiusura, altri strumenti, scala del contratto
  // da dove vengono gli scarti della value area: solo giornaliero, solo orario, senza le 50 fasce (informativo)
  const spr = (ks) => { const a = ks.map((k) => va[k].val), b = ks.map((k) => va[k].vah); return { valPct: r4((Math.max(...a) / Math.min(...a) - 1) * 100), vahPct: r4((Math.max(...b) / Math.min(...b) - 1) * 100) }; };
  const info = { hourlyAtClose: r4(overlap(prof[main], prof.c100)), vaSpreadSubsets: { dailyOnly: spr(['b50', 'b100', 'b200']), hourlyOnly: spr(['c250', 'c2100', 'c2200']), no50: spr(['b100', 'b200', 'c2100', 'c2200']), n100: spr(['b100', 'c2100']) }, alternatives: [] };
  for (const A of M.alts) {
    const oa = { chart: M.chart, vol: A.vol, scale: A.scale, contract: M.contract };
    const ma = mapped(oa, from, to, false);
    const [l1, h1] = rangeOf([...m.daily, ...ma.daily]), e = logEdges(l1, h1, 100);
    const p = profile(m.daily, 'spread', e), q = profile(ma.daily, 'spread', e), a = valueArea(q, e), a0 = valueArea(p, e);
    info.alternatives.push({ vol: A.vol, scale: A.scale === 'contract' ? `contratto ${M.contract}` : `grafico ${M.chart}`, sessions: ma.info.sessions, dailyFromHourly: ma.info.dailyFromHourly,
      overlapWithMain: r4(overlap(shares(p), shares(q))), val: r6(a.val), vah: r6(a.vah), mainValSameGrid: r6(a0.val), mainVahSameGrid: r6(a0.vah) });
  }

  // profilo come lo pubblicherebbe la pipeline: sole barre giornaliere, 100 fasce logaritmiche, quote in centesimi di
  // punto percentuale (interi che sommano a circa 10.000)
  const [la, ha] = rangeOf(m.daily), ea = logEdges(la, ha, 100), va0 = profile(m.daily, 'spread', ea), tot = va0.reduce((a, b) => a + b, 0);
  const app = { vol: M.vol, from, to, sessions: m.daily.length, lo: +la.toPrecision(6), hi: +ha.toPrecision(6), n: 100, scale: 'log', bp: Array.from(va0, (x) => Math.round((x / tot) * 10000)) };

  return {
    row: { id: M.id, label: M.label, chart: M.chart, vol: M.vol, from, to, range: [r6(lo), r6(hi)], data: m.info, va, overlaps: ov,
      valSpreadPct: r4(valSpread * 100), vahSpreadPct: r4(vahSpread * 100), minOverlap: r4(minOv),
      day2day: { pairs: pairs.length, minOverlap: r4(minPair), medianOverlap: r4(median(pOv)), below090: pOv.filter((x) => x < 0.9).length, worst: pairs.reduce((a, x) => (x.overlap < a.overlap ? x : a)),
        maxAbsValChangePct: r4(Math.max(...pairs.map((x) => Math.abs(x.valChangePct)))), maxAbsVahChangePct: r4(Math.max(...pairs.map((x) => Math.abs(x.vahChangePct)))),
        vaJumpsOver2pct: pairs.filter((x) => Math.abs(x.valChangePct) > 2 || Math.abs(x.vahChangePct) > 2).map((x) => x.d), list: pairs },
      testA, testB, testC, pass: testA && testB && testC,
      secondPeak: sp ? { level: r6(sp.level), share: r4(sp.share) } : null,
      profileMain: prof[main].map(r6), info },
    app,
  };
}

/** profilo come lo pubblicherebbe la pipeline, senza le prove (confronto_app.mjs) */
export function appProfile(chart, vol) {
  const ch = chartDaily(chart), to = ch.dates[ch.dates.length - 1], from = windowStart(to, 1);
  const m = mapped({ chart, vol }, from, to, false);
  const [la, ha] = rangeOf(m.daily), ea = logEdges(la, ha, 100), va0 = profile(m.daily, 'spread', ea), tot = va0.reduce((a, b) => a + b, 0);
  return { vol, from, to, sessions: m.daily.length, lo: la, hi: ha, n: 100, bp: Array.from(va0, (x) => Math.round((x / tot) * 10000)), info: m.info };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

function main() {
const rows = [], app = {};
for (const M of MARKETS) { const r = analyse(M); rows.push(r.row); app[M.id] = r.app; }
const out = { generated: new Date().toISOString(), note: 'Scritto da ricerca/poc/profilo/analisi.mjs dai dati in ricerca/poc/cache/ (Yahoo Finance). Criterio e metodo in testa allo script e in sintesi.md.', criterion: { vaSpreadMaxPct: 2, minOverlap: 0.85, minDay2Day: 0.9, main: 'b100 (giornaliero spalmato, 100 fasce logaritmiche)', set: ['b50', 'b100', 'b200', 'c250', 'c2100', 'c2200'] }, markets: rows };
fs.writeFileSync(path.join(HERE, 'risultati.json'), JSON.stringify(out, null, 1) + '\n');
const appTxt = JSON.stringify({ note: 'Prova del file che la pipeline pubblicherebbe: profilo dei volumi degli ultimi 12 mesi, 100 fasce uguali sulla scala logaritmica tra lo e hi, quote in centesimi di punto percentuale (bp).', profiles: app });
fs.writeFileSync(path.join(HERE, 'profilo_app.json'), appTxt + '\n');
const size = { bytes: Buffer.byteLength(appTxt) + 1, gzip: zlib.gzipSync(appTxt + '\n').length };
fs.writeFileSync(path.join(HERE, 'dimensione.json'), JSON.stringify(size) + '\n');

for (const r of rows) {
  console.log(`${r.id.padEnd(7)} ${r.vol.padEnd(10)} ${r.from}→${r.to} sedute ${r.data.sessions} | VAL ±${r.valSpreadPct}% VAH ±${r.vahSpreadPct}% ${r.testA ? 'a✓' : 'a✗'} | min sovr. ${r.minOverlap} ${r.testB ? 'b✓' : 'b✗'} ${JSON.stringify(r.overlaps)} | giorno/giorno min ${r.day2day.minOverlap} med ${r.day2day.medianOverlap} <0,9: ${r.day2day.below090} ${r.testC ? 'c✓' : 'c✗'} | ${r.pass ? 'MOSTRABILE' : 'no'}`);
  console.log(`        VA b100 ${r.va.b100.val}–${r.va.b100.vah}  picco ${r.va.b100.peak}  2° picco ${JSON.stringify(r.secondPeak)}  dati ${JSON.stringify(r.data)}  info ${JSON.stringify(r.info)}`);
}
console.log('profilo_app.json', size);
}
