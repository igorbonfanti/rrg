#!/usr/bin/env node
/*
 * backtest.mjs — «le bolle si sgonfiano a rotazione: chi per primo, chi dopo, chi assieme?» (ricerca, non tocca l'app).
 *
 * Mercati: i 9 del pannello «Distanza dal massimo degli ultimi 3 anni» (config/ath.json): BTC-USD, GC=F, SI=F, HG=F,
 * CL=F, ^NDX, ^GSPC, SOXX, ^KS11. Chiusure giornaliere di Yahoo (solo prezzo), tutta la storia, scaricate con
 * scripts/lib/yahoo.js (fetchDaily) in ricerca/rotazione-bolle/cache/ (esclusa da git). Controllo dei dati: confronto
 * con data/ath_history.json (file della pipeline, sola lettura) sulle sedute in comune.
 *
 * METODO (deciso prima di guardare i risultati; vedi ricerca/rotazione-bolle/backtest.md, sezione 1)
 *  - Massimo di ciclo con soglia X: una chiusura più alta di tutte le chiusure dei 365 giorni di calendario prima
 *    (massimo di 52 settimane, con almeno 365 giorni di storia alle spalle) dopo la quale il prezzo scende di almeno
 *    X% prima di tornare sopra quella chiusura. Calo massimo = chiusura minima dopo il massimo, fino al ritorno sopra
 *    il massimo o al massimo di ciclo successivo alla conferma, se viene prima (o fino all'ultima seduta: episodio in
 *    corso). Durata: giorni di calendario dal massimo al minimo (discesa) e dal
 *    massimo al ritorno sopra (recupero). Conferma: primo giorno in cui la chiusura è almeno X% sotto il massimo (il
 *    giorno in cui, dal vivo, si sarebbe saputo che quel massimo era un massimo di ciclo).
 *    Elenco degli episodi: picchi dal 01/01/2000 (bitcoin: dal 17/09/2015, un anno dopo l'inizio della serie di Yahoo);
 *    nelle finestre si usano anche i picchi del 1999 dei mercati con storia più lunga (S&P 500, Nasdaq-100, KOSPI).
 *    Soglie: 15, 20, 30% per tutti; 40% anche per bitcoin e argento; 10% per l'S&P 500 (falsi allarmi).
 *  - Finestra di rotazione: ±365 giorni dal massimo P di un calo dell'S&P 500 (≥ 15%, con il sottoinsieme ≥ 20%) o del
 *    Nasdaq-100 (≥ 20%). Per ogni mercato si prende, tra i suoi massimi di ciclo ≥ 20% nella finestra, quello con la
 *    chiusura più alta; scarto = giorni dal massimo P (negativo = prima). «Insieme»: |scarto| ≤ 31 giorni.
 *    «Dati mancanti» se il mercato non può avere un massimo valido a P − 365 (serie troppo corta).
 *  - Anticipatore utile (tutte e tre):
 *    (a) massimo di ciclo ≥ 20% tra 365 e 30 giorni prima di P in almeno il 70% dei cali ≥ 20% dell'S&P 500 in cui il
 *        mercato aveva dati, con almeno 4 casi;
 *    (b) falsi allarmi < 50%: un massimo di ciclo ≥ 20% del mercato è un falso allarme se nei 365 giorni dopo (dalla
 *        prima seduta dell'S&P 500 dal giorno del massimo) l'S&P 500 non ha un calo ≥ 10% (dal massimo al minimo,
 *        entrambi nella finestra). Massimi degli ultimi 365 giorni: in sospeso, fuori dal conto;
 *    (c) (a) e (b) valgono anche separatamente nel 2000-2012 e nel 2013-oggi (per (a) senza il minimo di 4 casi).
 *    Basi di confronto: per (a) la quota di sedute dell'S&P 500 con un massimo di ciclo ≥ 20% del mercato tra 365 e 30
 *    giorni prima; per (b) la quota di tutte le sedute dell'S&P 500 seguite da un calo ≥ 10% entro 365 giorni.
 *  - Gruppi: ciclo industriale (SOXX, KOSPI, rame), metalli preziosi (oro, argento), rischio speculativo (bitcoin).
 *    (a) un caso conta se almeno metà dei membri ha dati; è colto se almeno metà dei membri con dati ha un massimo di
 *    ciclo tra 365 e 30 giorni prima di P. (b) allarme del gruppo: un massimo di un membro a cui, nei 182 giorni fino a
 *    quel giorno, almeno metà dei membri con dati ha un massimo di ciclo; un allarme entro 365 giorni dal precedente non
 *    conta di nuovo.
 *  - Ordine tipico: per ogni calo ≥ 15% dell'S&P 500, rango del giorno del massimo dei mercati con un massimo nella
 *    finestra (S&P 500 compreso, a parità rango medio), rango normalizzato 0 = primo, 1 = ultimo; media per mercato.
 *  - Oggi: athStats di js/ath.js (la stessa funzione dell'app) sull'ultima seduta scaricata, più i massimi di ciclo in
 *    corso.
 *
 * Uso: node ricerca/rotazione-bolle/script/backtest.mjs [--refresh]
 *   Senza --refresh riusa la cache. Scrive ricerca/rotazione-bolle/risultati.json e ricerca/rotazione-bolle/serie.json
 *   (le chiusure usate, per il ricalcolo indipendente ricerca/rotazione-bolle/script/verifica.py).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily } from '../../../scripts/lib/yahoo.js';
import { decodeDates, deltaDecode } from '../../../js/indexdata.js';
import { athStats } from '../../../js/ath.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '..');
const ROOT = path.resolve(BASE, '..', '..');
const CACHE = path.join(BASE, 'cache');
const REFRESH = process.argv.includes('--refresh');
fs.mkdirSync(CACHE, { recursive: true });

const DAY = 86400000;
const START = '2000-01-01';
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const dd = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const addDays = (d, n) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'ath.json'), 'utf-8')).markets;
const IDS = CFG.map((m) => m.id);
const LABEL = Object.fromEntries(CFG.map((m) => [m.id, m.label]));

// ------------------------------------------------------------------ dati
async function yahoo(sym) {
  const f = path.join(CACHE, 'Y_' + sym.replace(/[^A-Za-z0-9_.-]/g, '_') + '.json');
  if (!REFRESH && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  const r = await fetchDaily(sym, { period1: -2208988800, raw: true });
  await sleep(400);
  const v = { src: 'Yahoo ' + sym, fetched: new Date().toISOString(), tz: r.meta.exchangeTimezoneName, currency: r.meta.currency, dates: r.dates, close: r.close };
  fs.writeFileSync(f, JSON.stringify(v));
  return v;
}

const S = {};
for (const m of CFG) {
  const y = await yahoo(m.symbol);
  const dates = [], close = [];
  for (let i = 0; i < y.dates.length; i++) if (y.close[i] != null && Number.isFinite(y.close[i])) { dates.push(y.dates[i]); close.push(y.close[i]); }
  S[m.id] = { dates, close, symbol: m.symbol, currency: y.currency, fetched: y.fetched };
}

// controllo con data/ath_history.json (stessa origine Yahoo, scaricata dalla pipeline in un altro momento)
const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ath_history.json'), 'utf-8'));
const dataCheck = {};
for (const id of IDS) {
  const h = H.series[id]; if (!h) continue;
  const hd = decodeDates(h.d0, h.gaps), hc = deltaDecode(h.cd, h.ps || 100);
  const map = new Map(S[id].dates.map((d, i) => [d, S[id].close[i]]));
  let n = 0, maxRel = 0, over01 = 0, onlyHist = 0, worst = null;
  for (let i = 0; i < hd.length; i++) {
    if (hc[i] == null) continue;
    const v = map.get(hd[i]);
    if (v == null) { onlyHist++; continue; }
    n++;
    const rel = Math.abs(v - hc[i]) / Math.max(Math.abs(hc[i]), 1e-9);
    if (rel > 0.001) over01++;
    if (rel > maxRel) { maxRel = rel; worst = { date: hd[i], yahoo: r4(v), file: r4(hc[i]) }; }
  }
  dataCheck[id] = { common: n, onlyInFile: onlyHist, over0_1pct: over01, maxRelPct: r4(maxRel * 100), worst, fileFrom: hd[0], fileTo: hd.at(-1), yahooFrom: S[id].dates[0], yahooTo: S[id].dates.at(-1) };
}

// ------------------------------------------------------------------ massimi di ciclo
function eligibleFrom(id) { return addDays(S[id].dates[0], 365); } // primo giorno in cui un massimo di 52 settimane è valido

function cyclePeaks(id, X) {
  const { dates, close } = S[id], n = close.length, el = eligibleFrom(id);
  // prossima chiusura strettamente più alta (pila monotona)
  const next = new Array(n).fill(n), st = [];
  for (let i = 0; i < n; i++) { while (st.length && close[i] > close[st.at(-1)]) next[st.pop()] = i; st.push(i); }
  // massimo dei 365 giorni precedenti (coda monotona su finestra di calendario)
  const out = [], dq = []; let lo = 0;
  for (let i = 0; i < n; i++) {
    const tFrom = Date.parse(dates[i]) - 365 * DAY;
    while (lo < i && Date.parse(dates[lo]) < tFrom) lo++;
    while (dq.length && dq[0] < lo) dq.shift();
    const prevMax = dq.length ? close[dq[0]] : null;
    if (dates[i] >= el && prevMax != null && close[i] > prevMax) {
      const j = next[i];
      let iConf = -1;
      for (let k = i + 1; k < j; k++) if (close[k] <= close[i] * (1 - X / 100)) { iConf = k; break; }
      if (iConf >= 0) out.push({ i, j, iConf });
    }
    while (dq.length && close[dq.at(-1)] <= close[i]) dq.pop();
    dq.push(i);
  }
  // minimo del ciclo: fino alla chiusura più alta (j) o al massimo di ciclo successivo alla conferma, se viene prima
  // (senza questo, nel petrolio i massimi del 2008, 2011 e 2013 avrebbero tutti il minimo del 20/04/2020)
  return out.map(({ i, j, iConf }, t) => {
    const nx = out.find((q, u) => u > t && q.i > iConf);
    const end = Math.min(j, nx ? nx.i : n);
    let iMin = i + 1;
    for (let k = i + 1; k < end; k++) if (close[k] < close[iMin]) iMin = k;
    const neg = close[iMin] <= 0;
    return { date: dates[i], close: r4(close[i]), troughDate: dates[iMin], trough: r4(close[iMin]),
      ddPct: r1((close[iMin] / close[i] - 1) * 100), belowZero: neg || undefined,
      daysDown: dd(dates[i], dates[iMin]), confirmDate: dates[iConf], daysToConfirm: dd(dates[i], dates[iConf]),
      troughEnd: end < j ? 'massimo di ciclo successivo' : j < n ? 'ritorno sopra il massimo' : 'ultima seduta',
      recoveryDate: j < n ? dates[j] : null, daysToRecovery: j < n ? dd(dates[i], dates[j]) : null, ongoing: end >= n || undefined };
  });
}

const TH = [10, 15, 20, 30, 40];
const P = {};
for (const id of IDS) { P[id] = {}; for (const X of TH) P[id][X] = cyclePeaks(id, X); }

// ------------------------------------------------------------------ S&P 500: calo massimo nei 365 giorni dopo ogni seduta
const SPX = S.SPX, LAST_SPX = SPX.dates.at(-1);
const fwd = new Array(SPX.dates.length).fill(null); // null = finestra incompleta
for (let i = 0; i < SPX.dates.length; i++) {
  const end = addDays(SPX.dates[i], 365);
  if (end > LAST_SPX) break;
  let hi = SPX.close[i], worst = 0;
  for (let k = i; k < SPX.dates.length && SPX.dates[k] <= end; k++) {
    if (SPX.close[k] > hi) hi = SPX.close[k];
    const x = 1 - SPX.close[k] / hi; if (x > worst) worst = x;
  }
  fwd[i] = worst;
}
const spxIdxFrom = (d) => { let lo = 0, hi = SPX.dates.length; while (lo < hi) { const m = (lo + hi) >> 1; if (SPX.dates[m] < d) lo = m + 1; else hi = m; } return lo; };
const spxFwdAt = (d) => { const i = spxIdxFrom(d); return i < fwd.length ? fwd[i] : null; };
const period = (d) => (d < '2013-01-01' ? 'p1' : 'p2');
const PERIODS = { all: 'tutto', p1: '2000-2012', p2: '2013-oggi' };

const baseB = {};
for (const k of Object.keys(PERIODS)) {
  let n = 0, hit = 0;
  for (let i = 0; i < SPX.dates.length; i++) {
    if (SPX.dates[i] < START || fwd[i] == null) continue;
    if (k !== 'all' && period(SPX.dates[i]) !== k) continue;
    n++; if (fwd[i] >= 0.10) hit++;
  }
  baseB[k] = { sessions: n, followedBy10: hit, pct: r1((100 * hit) / n) };
}

// ------------------------------------------------------------------ finestre di rotazione
const hasData = (id, P0) => eligibleFrom(id) <= addDays(P0, -365);
function pickInWindow(id, P0, X = 20) {
  if (!hasData(id, P0)) return { status: 'nodata' };
  const lo = addDays(P0, -365), hi = addDays(P0, 365);
  const c = P[id][X].filter((p) => p.date >= lo && p.date <= hi);
  if (!c.length) return { status: 'none' };
  const best = c.reduce((a, b) => (b.close > a.close ? b : a));
  return { status: 'peak', date: best.date, offset: dd(P0, best.date), ddPct: best.ddPct, belowZero: best.belowZero,
    confirmDate: best.confirmDate, confirmOffset: dd(P0, best.confirmDate), inWindow: c.length,
    all: c.map((p) => ({ date: p.date, offset: dd(P0, p.date), ddPct: p.ddPct, confirmOffset: dd(P0, p.confirmDate) })) };
}

function windows(anchorId, X) {
  return P[anchorId][X].filter((ep) => ep.date >= START).map((ep) => {
    const row = { anchor: anchorId, peak: ep.date, ddPct: ep.ddPct, ongoing: ep.ongoing || false, troughDate: ep.troughDate, markets: {} };
    for (const id of IDS) {
      if (id === anchorId) { row.markets[id] = { status: 'anchor', date: ep.date, offset: 0, ddPct: ep.ddPct, confirmDate: ep.confirmDate, confirmOffset: dd(ep.date, ep.confirmDate) }; continue; }
      const m = pickInWindow(id, ep.date, 20);
      if (m.status !== 'peak') { const m15 = pickInWindow(id, ep.date, 15); if (m15.status === 'peak') m.alt15 = { date: m15.date, offset: m15.offset, ddPct: m15.ddPct }; }
      row.markets[id] = m;
    }
    // rango
    const pts = Object.entries(row.markets).filter(([, v]) => v.offset != null).map(([id, v]) => ({ id, o: v.offset }));
    pts.sort((a, b) => a.o - b.o);
    const k = pts.length;
    for (let i = 0; i < k;) {
      let j = i; while (j + 1 < k && pts[j + 1].o === pts[i].o) j++;
      const rank = (i + j) / 2 + 1;
      for (let t = i; t <= j; t++) { row.markets[pts[t].id].rank = rank; row.markets[pts[t].id].rankNorm = k > 1 ? r4((rank - 1) / (k - 1)) : null; }
      i = j + 1;
    }
    row.participants = k;
    row.before = pts.filter((p) => p.o < -31).map((p) => p.id);
    row.together = pts.filter((p) => Math.abs(p.o) <= 31).map((p) => p.id);
    row.after = pts.filter((p) => p.o > 31).map((p) => p.id);
    return row;
  });
}

const W = { SPX15: windows('SPX', 15), SPX20: windows('SPX', 20), SPX10: windows('SPX', 10), NDX20: windows('NDX', 20) };

// ordine tipico (cali ≥ 15% dell'S&P 500)
function typicalOrder(rows) {
  const o = {};
  for (const id of IDS) {
    const offs = [], rn = [];
    let nodata = 0, none = 0, before = 0, together = 0, after = 0;
    for (const r of rows) {
      const m = r.markets[id];
      if (m.status === 'nodata') { nodata++; continue; }
      if (m.offset == null) { none++; continue; }
      offs.push(m.offset); if (m.rankNorm != null) rn.push(m.rankNorm);
      if (m.offset < -31) before++; else if (m.offset > 31) after++; else together++;
    }
    o[id] = { episodes: rows.length, withPeak: offs.length, none, nodata, before, together, after,
      medianOffset: median(offs), meanOffset: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null,
      meanRankNorm: rn.length ? r4(rn.reduce((a, b) => a + b, 0) / rn.length) : null };
  }
  return o;
}
const ORDER = { SPX15: typicalOrder(W.SPX15), SPX20: typicalOrder(W.SPX20), NDX20: typicalOrder(W.NDX20) };

// massimi arrivati prima (tra 365 e 30 giorni prima del massimo dell'S&P 500): la conferma del −20% era già arrivata?
function earlyConfirm(rows) {
  const list = [];
  for (const r of rows) for (const id of IDS) {
    if (id === r.anchor || !hasData(id, r.peak)) continue;
    for (const p of P[id][20]) {
      const o = dd(r.peak, p.date);
      if (o >= -365 && o <= -30) list.push({ anchor: r.peak, ongoing: r.ongoing, id, date: p.date, offset: o, confirmDate: p.confirmDate, confirmOffset: dd(r.peak, p.confirmDate) });
    }
  }
  const done = list.filter((x) => !x.ongoing);
  const byMarket = {};
  for (const x of done) { const b = (byMarket[x.id] ??= { closed: 0, confirmedBefore: 0 }); b.closed++; if (x.confirmOffset < 0) b.confirmedBefore++; }
  return { list, closed: done.length, confirmedBefore: done.filter((x) => x.confirmOffset < 0).length, byMarket };
}
const EARLY = earlyConfirm([...W.SPX15, ...W.SPX10.filter((r) => r.ongoing)]);

// ------------------------------------------------------------------ criteri dell'anticipatore
function leadHit(ids, P0, X) {
  const withData = ids.filter((id) => hasData(id, P0));
  if (withData.length < Math.ceil(ids.length / 2)) return null;
  const lo = addDays(P0, -365), hi = addDays(P0, -30);
  const hits = withData.filter((id) => P[id][X].some((p) => p.date >= lo && p.date <= hi));
  return { hit: hits.length >= Math.ceil(withData.length / 2), members: withData, hitMembers: hits };
}

function alarms(ids, X) {
  if (ids.length === 1) return P[ids[0]][X].filter((p) => p.date >= START).map((p) => ({ date: p.date, by: ids[0] }));
  const all = ids.flatMap((id) => P[id][X].filter((p) => p.date >= START).map((p) => ({ date: p.date, by: id }))).sort((a, b) => (a.date < b.date ? -1 : 1));
  const out = []; let lastAl = null;
  for (const a of all) {
    if (lastAl && dd(lastAl, a.date) <= 365) continue;
    const withData = ids.filter((id) => S[id].dates[0] <= a.date && eligibleFrom(id) <= a.date);
    const lo = addDays(a.date, -182);
    const n = withData.filter((id) => P[id][X].some((p) => p.date >= lo && p.date <= a.date)).length;
    if (n >= Math.ceil(withData.length / 2)) { out.push(a); lastAl = a.date; }
  }
  return out;
}

function baseA(ids, X, anchorDates) {
  // quota di sedute dell'S&P 500 (dal 2000, con i dati) in cui il gruppo «avrebbe colto» un massimo dell'S&P 500 in quel giorno
  const res = {};
  for (const k of Object.keys(PERIODS)) {
    let n = 0, h = 0;
    for (const d of SPX.dates) {
      if (d < START) continue;
      if (k !== 'all' && period(d) !== k) continue;
      const r = leadHit(ids, d, X); if (!r) continue;
      n++; if (r.hit) h++;
    }
    res[k] = { sessions: n, pct: n ? r1((100 * h) / n) : null };
  }
  return res;
}

function evaluate(name, ids, { anchorWin = W.SPX20, X = 20 } = {}) {
  const cases = [];
  for (const r of anchorWin) {
    if (ids.length === 1 && ids[0] === r.anchor) continue;
    const h = leadHit(ids, r.peak, X);
    cases.push({ peak: r.peak, period: period(r.peak), status: h == null ? 'nodata' : h.hit ? 'hit' : 'miss', hitMembers: h ? h.hitMembers : [] });
  }
  const al = alarms(ids, X).map((a) => {
    const f = spxFwdAt(a.date);
    return { ...a, period: period(a.date), spxFwdMaxDDPct: f == null ? null : r1(f * 100), status: f == null ? 'pending' : f >= 0.10 ? 'true' : 'false' };
  });
  const res = { name, members: ids, X, perPeriod: {} };
  for (const k of Object.keys(PERIODS)) {
    const c = cases.filter((x) => x.status !== 'nodata' && (k === 'all' || x.period === k));
    const a = al.filter((x) => x.status !== 'pending' && (k === 'all' || x.period === k));
    const hits = c.filter((x) => x.status === 'hit').length, fa = a.filter((x) => x.status === 'false').length;
    res.perPeriod[k] = { cases: c.length, hits, hitPct: c.length ? r1((100 * hits) / c.length) : null,
      alarms: a.length, falseAlarms: fa, falsePct: a.length ? r1((100 * fa) / a.length) : null };
  }
  const A = res.perPeriod.all;
  res.critA = A.cases >= 4 && A.hitPct >= 70;
  res.critB = A.alarms > 0 && A.falsePct < 50;
  res.critC = ['p1', 'p2'].every((k) => { const p = res.perPeriod[k]; return p.cases > 0 && p.hitPct >= 70 && p.alarms > 0 && p.falsePct < 50; });
  res.useful = res.critA && res.critB && res.critC;
  res.cases = cases; res.alarmList = al;
  res.pendingAlarms = al.filter((x) => x.status === 'pending').length;
  return res;
}

const GROUPS = { 'Ciclo industriale': ['SOXX', 'KOSPI', 'COPPER'], 'Metalli preziosi': ['GOLD', 'SILVER'], 'Rischio speculativo': ['BTC'] };
const evalSet = (opt) => {
  const out = {};
  for (const id of IDS) if (id !== 'SPX') out[id] = evaluate(LABEL[id], [id], opt);
  for (const [g, ids] of Object.entries(GROUPS)) if (ids.length > 1) out[g] = evaluate(g, ids, opt);
  return out;
};
const CRIT = evalSet({});
for (const k of Object.keys(CRIT)) CRIT[k].baseA = baseA(CRIT[k].members, 20);
const SENS = {
  'SPX≥15%, mercati ≥20%': evalSet({ anchorWin: W.SPX15, X: 20 }),
  'SPX≥20%, mercati ≥15%': evalSet({ anchorWin: W.SPX20, X: 15 }),
  'SPX≥20%, mercati ≥30%': evalSet({ anchorWin: W.SPX20, X: 30 }),
  'NDX≥20% come riferimento, mercati ≥20%': evalSet({ anchorWin: W.NDX20, X: 20 }),
};
const slim = (set) => Object.fromEntries(Object.entries(set).map(([k, v]) => [k, { perPeriod: v.perPeriod, critA: v.critA, critB: v.critB, critC: v.critC, useful: v.useful }]));

// ------------------------------------------------------------------ oggi
const TODAY = {};
for (const id of IDS) {
  const st = athStats(S[id].dates, S[id].close, null);
  const ongoing = {};
  for (const X of [10, 15, 20, 30]) { const o = P[id][X].filter((p) => p.ongoing); if (o.length) ongoing[X] = o.at(-1); }
  const last20 = P[id][20].at(-1) || null;
  TODAY[id] = { lastDate: st.lastDate, last: st.last, ref3y: st.ref, ref3yDate: st.refDate, distPct: st.distPct, daysSinceRef: st.days,
    cycleLowPct: st.cycleLowPct, cycleLowDate: st.cycleLowDate, belowZero: st.belowZero, ongoing, lastPeak20: last20 };
}
// massimo dell'S&P 500 più recente (52 settimane) e scarti dei massimi a 3 anni degli altri
const spxRef = TODAY.SPX.ref3yDate;
for (const id of IDS) TODAY[id].offsetVsSpxRef = dd(spxRef, TODAY[id].ref3yDate);

// ------------------------------------------------------------------ uscita
const episodes = {};
for (const id of IDS) {
  episodes[id] = {};
  for (const X of TH) if (X !== 10 || id === 'SPX') if (X !== 40 || id === 'BTC' || id === 'SILVER') episodes[id][X] = P[id][X].filter((p) => p.date >= START);
}
const out = {
  generated: new Date().toISOString(), method: 'vedi testa dello script e ricerca/rotazione-bolle/backtest.md',
  series: Object.fromEntries(IDS.map((id) => [id, { symbol: S[id].symbol, label: LABEL[id], currency: S[id].currency, from: S[id].dates[0], to: S[id].dates.at(-1), sessions: S[id].dates.length, eligibleFrom: eligibleFrom(id), fetched: S[id].fetched }])),
  dataCheck, episodes,
  counts: Object.fromEntries(IDS.map((id) => [id, Object.fromEntries(Object.entries(episodes[id]).map(([X, l]) => [X, l.length]))])),
  windows: W, order: ORDER, earlyConfirm: EARLY, baseB, criteria: CRIT, sensitivity: Object.fromEntries(Object.entries(SENS).map(([k, v]) => [k, slim(v)])),
  today: TODAY,
};
fs.writeFileSync(path.join(BASE, 'risultati.json'), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(BASE, 'cache', 'serie.json'), JSON.stringify(Object.fromEntries(IDS.map((id) => [id, { dates: S[id].dates, close: S[id].close }]))));

// riepilogo a video
console.log('Serie:', Object.entries(out.series).map(([k, v]) => `${k} ${v.from}→${v.to}`).join(' | '));
console.log('Controllo con data/ath_history.json:', Object.entries(dataCheck).map(([k, v]) => `${k} ${v.common} in comune, max ${v.maxRelPct}%`).join(' | '));
console.log('Episodi (15/20/30/40):', Object.entries(out.counts).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(' | '));
for (const r of W.SPX15) console.log('SPX', r.peak, r.ddPct, IDS.map((id) => `${id}:${r.markets[id].offset ?? r.markets[id].status}`).join(' '));
for (const [k, v] of Object.entries(CRIT)) console.log(k, JSON.stringify(v.perPeriod), 'A', v.critA, 'B', v.critB, 'C', v.critC);
