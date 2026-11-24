/*
 * lib.mjs — funzioni del backtest «crack spread 3-2-1» (ricerca/crack-spread). Usate da backtest.mjs (dati reali) e da
 * potenza.mjs (serie sintetiche). Regole in ../sintesi.md, sezione «Interpretazioni decise prima dei risultati».
 * I massimi di ciclo vengono da js/peaks.js dell'app (import diretto, nessuna copia).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cyclePeaks, clean, addDays, dayDiff, eligibleFrom, HALF, TOGETHER } from '../../../js/peaks.js';
import { parse } from '../../../scripts/lib/yahoo.js';

export { cyclePeaks, clean, addDays, dayDiff, eligibleFrom, HALF, TOGETHER };
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CACHE = path.join(HERE, '..', 'cache');
const DAY = 86400000;
export const t = (d) => Date.parse(d) / DAY; // giorni dal 1970
export const HALVES = { '1986-2005': ['1900-01-01', '2005-12-31'], '2006-oggi': ['2006-01-01', '2100-01-01'] };
export const halfOf = (d) => (d <= '2005-12-31' ? '1986-2005' : '2006-oggi');
export const r = (x, k = 1) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** k) / 10 ** k);

/** FRED fredgraph.csv → Map data → numero (i vuoti e i «.» restano fuori) */
export function readFred(id) {
  const m = new Map();
  const lines = fs.readFileSync(path.join(CACHE, `fred_${id}.csv`), 'utf8').trim().split(/\r?\n/).slice(1);
  for (const l of lines) {
    const [d, v] = l.split(',');
    if (v !== undefined && v !== '' && v !== '.' && Number.isFinite(+v)) m.set(d, +v);
  }
  return m;
}

/** Yahoo chart v8 salvato da scarica.mjs → {dates, close, adjclose}, solo barre chiuse (parse dell'app) */
export function readYahoo(sym) {
  const res = JSON.parse(fs.readFileSync(path.join(CACHE, `yahoo_${sym.replace('^', '').replace('=', '')}.json`), 'utf8'));
  const p = parse(res, { nowSec: Date.parse('2026-11-24T23:59:00Z') / 1000 });
  return { dates: p.dates, close: p.close, adjclose: p.adjclose };
}

const EXCLUDE = new Set(['2020-04-20']); // WTI spot negativo: tolto da tutte le serie

/** WTI spot senza il 20/04/2020 → {dates, close} */
export function wtiSeries() {
  const w = readFred('DCOILWTICO'), dates = [], close = [];
  for (const [d, v] of [...w].sort((a, b) => (a[0] < b[0] ? -1 : 1))) if (!EXCLUDE.has(d) && v > 0) { dates.push(d); close.push(v); }
  return { dates, close };
}

// riempimento con l'ultimo valore per al massimo `n` righe consecutive del calendario FRED (solo variante di controllo)
function ffill(m, calendar, n) {
  if (!n) return m;
  const out = new Map(m);
  let last = null, age = 0;
  for (const d of calendar) {
    if (m.has(d)) { last = m.get(d); age = 0; continue; }
    age++;
    if (last != null && age <= n) out.set(d, last);
  }
  return out;
}

/**
 * Crack 3-2-1 giornaliero = 14 × (2 × benzina + gasolio) − WTI, solo nei giorni con le tre serie.
 * @param {{gas?: string, ho?: string, ulsdFrom?: string|null, fill?: number}} o
 * @returns {{dates: string[], close: number[], wti: number[], gas: number[], ho: number[]}}
 */
export function crackSeries({ gas = 'DGASNYH', ho = 'DHOILNYH', ulsdFrom = null, fill = 0 } = {}) {
  const W0 = readFred('DCOILWTICO'), G0 = readFred(gas), H0 = readFred(ho);
  const U0 = ulsdFrom ? readFred('DDFUELNYH') : null;
  const cal = [...new Set([...W0.keys(), ...G0.keys(), ...H0.keys(), ...fs.readFileSync(path.join(CACHE, 'fred_DCOILWTICO.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(',')[0])])].sort();
  const W = ffill(W0, cal, fill), G = ffill(G0, cal, fill), H = ffill(H0, cal, fill), U = U0 ? ffill(U0, cal, fill) : null;
  const out = { dates: [], close: [], wti: [], gas: [], ho: [] };
  for (const d of cal) {
    if (EXCLUDE.has(d)) continue;
    const w = W.get(d), g = G.get(d), h = ulsdFrom && d >= ulsdFrom ? U.get(d) : H.get(d);
    if (w == null || g == null || h == null || !(w > 0)) continue;
    out.dates.push(d); out.close.push(14 * (2 * g + h) - w); out.wti.push(w); out.gas.push(g); out.ho.push(h);
  }
  return out;
}

/** indice dell'ultima data ≤ d (−1 se nessuna); dates ordinate */
export function idxLE(dates, d) {
  let lo = 0, hi = dates.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (dates[m] <= d) { ans = m; lo = m + 1; } else hi = m - 1; }
  return ans;
}

/** indice di partenza «3 mesi prima»: ultima data ≤ d − 91, non prima di d − 122; −1 se manca */
export function lag3m(dates, i, days = 91, tol = 31) {
  const j = idxLE(dates, addDays(dates[i], -days));
  return j >= 0 && dayDiff(dates[j], dates[i]) <= days + tol ? j : -1;
}

// ---------------------------------------------------------------- criterio 1

/**
 * Casi del criterio 1: per ogni massimo di ciclo X del WTI con la finestra ±365 giorni dentro i dati del crack, il
 * massimo di ciclo X più alto del crack nella finestra (pick di peaks.js) e lo scarto in giorni.
 * @param {{date: string, close: number}[]} wP massimi del WTI
 * @param {{date: string, close: number}[]} cP massimi del crack
 * @param {{first: string, last: string}} span date del crack (prima, ultima)
 */
export function matchCases(wP, cP, span) {
  const el = addDays(span.first, 365);
  return wP.filter((p) => el <= addDays(p.date, -HALF) && addDays(p.date, HALF) <= span.last).map((p) => {
    const lo = addDays(p.date, -HALF), hi = addDays(p.date, HALF);
    const c = cP.filter((q) => q.date >= lo && q.date <= hi);
    if (!c.length) return { wti: p.date, crack: null, offset: null, cls: 'nessuno' };
    const best = c.reduce((a, b) => (b.close > a.close ? b : a));
    const o = dayDiff(p.date, best.date);
    return { wti: p.date, crack: best.date, offset: o, cls: o < -TOGETHER ? 'prima' : o > TOGETHER ? 'dopo' : 'insieme' };
  });
}

export const shareBefore = (cases) => (cases.length ? cases.filter((c) => c.cls === 'prima').length / cases.length : null);

/** mulberry32: generatore pseudo-casuale con seme */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Criterio 1 per una soglia: casi, quota «prima» per metà e p contro spostamenti circolari delle date dei massimi del crack.
 * @returns {object}
 */
export function test1(wti, crack, X, { nNull = 10000, seed = 1 } = {}) {
  const wP = cyclePeaks(wti, X), cP = cyclePeaks(crack, X);
  const span = { first: crack.dates[0], last: crack.dates.at(-1) };
  const cases = matchCases(wP, cP, span);
  const byHalf = (cs) => Object.fromEntries(Object.keys(HALVES).map((h) => [h, cs.filter((c) => halfOf(c.wti) === h)]));
  const obs = byHalf(cases);
  const L = dayDiff(span.first, span.last) + 1;
  const R = rng(seed), ge = { tutto: 0, '1986-2005': 0, '2006-oggi': 0 };
  const obsShare = { tutto: shareBefore(cases), '1986-2005': shareBefore(obs['1986-2005']), '2006-oggi': shareBefore(obs['2006-oggi']) };
  const nullMean = { tutto: 0, '1986-2005': 0, '2006-oggi': 0 };
  for (let s = 0; s < nNull; s++) {
    const k = 1 + Math.floor(R() * (L - 1));
    const sh = cP.map((q) => ({ date: addDays(span.first, (dayDiff(span.first, q.date) + k) % L), close: q.close }));
    const cs = matchCases(wP, sh, span), bh = byHalf(cs);
    for (const [key, v] of [['tutto', cs], ['1986-2005', bh['1986-2005']], ['2006-oggi', bh['2006-oggi']]]) {
      const x = shareBefore(v);
      if (x == null) continue;
      nullMean[key] += x / nNull;
      if (x >= obsShare[key] - 1e-12) ge[key]++;
    }
  }
  const summ = (cs, key) => ({
    casi: cs.length, prima: cs.filter((c) => c.cls === 'prima').length, insieme: cs.filter((c) => c.cls === 'insieme').length,
    dopo: cs.filter((c) => c.cls === 'dopo').length, nessuno: cs.filter((c) => c.cls === 'nessuno').length,
    quota_prima: r(obsShare[key] == null ? null : obsShare[key] * 100), quota_prima_nullo_media: r(nullMean[key] * 100),
    p: r((1 + ge[key]) / (1 + nNull), 4),
    scarto_mediano: (() => { const o = cs.filter((c) => c.offset != null).map((c) => c.offset).sort((a, b) => a - b); return o.length ? (o.length % 2 ? o[(o.length - 1) / 2] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2) : null; })(),
  });
  const res = { X, massimi_wti: wP.length, massimi_crack: cP.length, tutto: summ(cases, 'tutto'), '1986-2005': summ(obs['1986-2005'], '1986-2005'), '2006-oggi': summ(obs['2006-oggi'], '2006-oggi'), casi: cases };
  res.passa_meta = Object.fromEntries(Object.keys(HALVES).map((h) => [h, res[h].casi >= 8 && res[h].quota_prima >= 70 && res[h].p < 0.05]));
  res.passa = Object.values(res.passa_meta).every(Boolean);
  return res;
}

// ---------------------------------------------------------------- criterio 2

/** Episodi zigzag dell'S&P al X%: {peak, confirm, trough, end|null} (end = giorno del rialzo del X% dal minimo) */
export function zigzag(s, X = 10) {
  const { dates, close } = s, ev = [];
  let mode = 'up', pk = 0, tr = 0, conf = null;
  for (let i = 1; i < close.length; i++) {
    if (mode === 'up') {
      if (close[i] > close[pk]) pk = i;
      else if (close[i] <= close[pk] * (1 - X / 100)) { mode = 'down'; tr = i; conf = i; }
    } else if (close[i] < close[tr]) tr = i;
    else if (close[i] >= close[tr] * (1 + X / 100)) {
      ev.push({ peak: dates[pk], confirm: dates[conf], trough: dates[tr], end: dates[i], calo: r((close[tr] / close[pk] - 1) * 100) });
      mode = 'up'; pk = i;
    }
  }
  if (mode === 'down') ev.push({ peak: dates[pk], confirm: dates[conf], trough: dates[tr], end: null, calo: r((close[tr] / close[pk] - 1) * 100) });
  return ev;
}

/** true se il giorno d è dentro un episodio già confermato e non ancora chiuso (confirm ≤ d < end) */
export const inOpen = (ev, d) => ev.some((e) => e.confirm <= d && (e.end == null || d < e.end));
/** prima conferma di un episodio in (d, d + 365] (data o null) */
export function hitWithin(ev, d, days = 365) {
  const hi = addDays(d, days);
  const e = ev.find((x) => x.confirm > d && x.confirm <= hi);
  return e ? e.confirm : null;
}

/**
 * Giorni di segnale della regola «estremo»: sopra il percentile p dei valori prima di t (almeno minHist valori) oppure
 * calo di oltre drop% in 3 mesi (partenza positiva). Restituisce due vettori booleani (pct, drop).
 */
export function extremeDays(s, { p = 90, minHist = 250, drop = 40 } = {}) {
  const n = s.close.length, pct = new Array(n).fill(false), dr = new Array(n).fill(false);
  const sorted = [];
  for (let i = 0; i < n; i++) {
    if (sorted.length >= minHist) {
      const h = (sorted.length - 1) * (p / 100), lo = Math.floor(h), q = sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]);
      pct[i] = s.close[i] > q;
    }
    const j = lag3m(s.dates, i);
    if (j >= 0 && s.close[j] > 0) dr[i] = s.close[i] / s.close[j] - 1 < -drop / 100;
    // inserimento ordinato del valore di oggi (servirà da domani)
    let a = 0, b = sorted.length;
    while (a < b) { const m = (a + b) >> 1; if (sorted[m] < s.close[i]) a = m + 1; else b = m; }
    sorted.splice(a, 0, s.close[i]);
  }
  return { pct, drop: dr, firstEligible: s.dates[Math.min(minHist, n - 1)] };
}

/**
 * Episodi indipendenti di una regola: giorni di segnale (dates[i] con sig[i]) dal giorno `from`, fuori dagli episodi aperti
 * dell'S&P, con 365 giorni successivi osservati (≤ lastObs); il primo apre l'episodio, i successivi entro 365 giorni no.
 */
export function episodes(dates, sig, ev, { from, lastObs }) {
  const out = [];
  let lastStart = null;
  const lastStartOk = addDays(lastObs, -365);
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (!sig[i] || d < from || d > lastStartOk) continue;
    if (inOpen(ev, d)) continue;
    if (lastStart && dayDiff(lastStart, d) <= 365) continue;
    lastStart = d;
    out.push({ date: d, hit: hitWithin(ev, d) });
  }
  return out;
}

/** Frequenza di base: sedute dell'S&P dal giorno `from`, fuori dagli episodi aperti, con finestra completa */
export function baseRate(spx, ev, { from, lastObs }) {
  const res = {};
  const lastOk = addDays(lastObs, -365);
  for (const h of ['tutto', ...Object.keys(HALVES)]) res[h] = { sedute: 0, seguite: 0 };
  for (const d of spx.dates) {
    if (d < from || d > lastOk || inOpen(ev, d)) continue;
    const hit = hitWithin(ev, d) != null;
    for (const h of ['tutto', halfOf(d)]) { res[h].sedute++; if (hit) res[h].seguite++; }
  }
  for (const v of Object.values(res)) v.quota = r((100 * v.seguite) / v.sedute);
  return res;
}

export function summEp(eps) {
  const o = {};
  for (const h of ['tutto', ...Object.keys(HALVES)]) {
    const e = h === 'tutto' ? eps : eps.filter((x) => halfOf(x.date) === h);
    o[h] = { episodi: e.length, seguiti: e.filter((x) => x.hit).length, quota: e.length ? r((100 * e.filter((x) => x.hit).length) / e.length) : null };
  }
  return o;
}

/** p (solo informazione): spostamenti circolari del vettore dei segnali sulle date della serie */
export function shiftP(dates, sig, ev, opt, obs, { nNull = 2000, seed = 7 } = {}) {
  const n = sig.length, R = rng(seed), ge = { tutto: 0, '1986-2005': 0, '2006-oggi': 0 }, cnt = { tutto: 0, '1986-2005': 0, '2006-oggi': 0 };
  for (let s = 0; s < nNull; s++) {
    const k = 1 + Math.floor(R() * (n - 1));
    const sh = new Array(n);
    for (let i = 0; i < n; i++) sh[(i + k) % n] = sig[i];
    const S = summEp(episodes(dates, sh, ev, opt));
    for (const h of Object.keys(ge)) { if (S[h].quota == null || obs[h].quota == null) continue; cnt[h]++; if (S[h].quota >= obs[h].quota - 1e-9) ge[h]++; }
  }
  return Object.fromEntries(Object.keys(ge).map((h) => [h, cnt[h] ? r((1 + ge[h]) / (1 + cnt[h]), 4) : null]));
}

// ---------------------------------------------------------------- criterio 3

/** OLS con intercetta: X è un array di righe (senza la colonna 1) → coefficienti [a, b...] */
export function ols(X, y) {
  const k = X[0].length + 1, A = Array.from({ length: k }, () => new Array(k).fill(0)), v = new Array(k).fill(0);
  for (let i = 0; i < y.length; i++) {
    const row = [1, ...X[i]];
    for (let a = 0; a < k; a++) { v[a] += row[a] * y[i]; for (let b = 0; b < k; b++) A[a][b] += row[a] * row[b]; }
  }
  // eliminazione di Gauss con pivot parziale
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let rr = c + 1; rr < k; rr++) if (Math.abs(A[rr][c]) > Math.abs(A[p][c])) p = rr;
    [A[c], A[p]] = [A[p], A[c]]; [v[c], v[p]] = [v[p], v[c]];
    for (let rr = c + 1; rr < k; rr++) { const f = A[rr][c] / A[c][c]; for (let b = c; b < k; b++) A[rr][b] -= f * A[c][b]; v[rr] -= f * v[c]; }
  }
  const beta = new Array(k).fill(0);
  for (let c = k - 1; c >= 0; c--) { let s = v[c]; for (let b = c + 1; b < k; b++) s -= A[c][b] * beta[b]; beta[c] = s / A[c][c]; }
  return beta;
}
export const predict = (beta, X) => X.map((row) => beta[0] + row.reduce((s, x, j) => s + beta[j + 1] * x, 0));
export function r2(y, yhat) {
  const m = y.reduce((a, b) => a + b, 0) / y.length;
  let sse = 0, sst = 0;
  for (let i = 0; i < y.length; i++) { sse += (y[i] - yhat[i]) ** 2; sst += (y[i] - m) ** 2; }
  return 1 - sse / sst;
}

/**
 * Pannello a 3 mesi: date comuni di target (num/den), WTI e crack; per ogni data t la partenza è la stessa per tutte le
 * variabili (lag3m sulle date comuni). Le finestre a cavallo del 01/01/2006 si tolgono.
 * @param {{dates: string[], v: number[]}} num numeratore (prezzi), den denominatore
 * @param {{dates: string[], close: number[], wti: number[]}} crack
 * @param {{from?: string, to?: string, crackUsd?: boolean, quarterly?: boolean, skip?: string|null}} o
 */
export function panel(num, den, crack, { from = '1900-01-01', to = '2100-01-01', crackUsd = false, quarterly = false, skip = null } = {}) {
  const N = new Map(num.dates.map((d, i) => [d, num.v[i]])), D = new Map(den.dates.map((d, i) => [d, den.v[i]]));
  const dates = [], y0 = [], w0 = [], c0 = [];
  for (let i = 0; i < crack.dates.length; i++) {
    const d = crack.dates[i];
    if (d < from || d > to || !N.has(d) || !D.has(d)) continue;
    dates.push(d); y0.push(Math.log(N.get(d) / D.get(d))); w0.push(crack.wti[i]); c0.push(crack.close[i]);
  }
  const rows = [];
  if (quarterly) {
    // ultima data comune di ogni trimestre; partenza = quella del trimestre prima (se il trimestre prima c'è)
    const qEnd = [];
    for (let i = 0; i < dates.length; i++) { const q = dates[i].slice(0, 4) + Math.ceil(+dates[i].slice(5, 7) / 3); if (i === dates.length - 1 || (dates[i + 1].slice(0, 4) + Math.ceil(+dates[i + 1].slice(5, 7) / 3)) !== q) qEnd.push([i, q]); }
    for (let k = 1; k < qEnd.length; k++) {
      const [i, q] = qEnd[k], [j, qp] = qEnd[k - 1];
      const yq = +q.slice(0, 4) * 4 + +q[4], yp = +qp.slice(0, 4) * 4 + +qp[4];
      if (yq - yp !== 1) continue;
      rows.push(mk(i, j));
    }
  } else for (let i = 0; i < dates.length; i++) { const j = lag3m(dates, i); if (j >= 0) rows.push(mk(i, j)); }
  function mk(i, j) {
    return { date: dates[i], start: dates[j], y: y0[i] - y0[j], wti: Math.log(w0[i] / w0[j]), crack: crackUsd ? c0[i] - c0[j] : (c0[i] - c0[j]) / w0[j] };
  }
  // skip: data di una discontinuità della serie (si tolgono le finestre che la contengono: start < skip ≤ date)
  return rows.filter((x) => halfOf(x.date) === halfOf(x.start) && !(skip && x.start < skip && skip <= x.date));
}

/** Criterio 3 su un pannello: R² nel campione per metà e fuori campione nelle due direzioni */
export function test3(rows) {
  const H = Object.fromEntries(Object.keys(HALVES).map((h) => [h, rows.filter((x) => halfOf(x.date) === h)]));
  const XA = (rs) => rs.map((x) => [x.wti]), XB = (rs) => rs.map((x) => [x.wti, x.crack]), XC = (rs) => rs.map((x) => [x.crack]);
  const Y = (rs) => rs.map((x) => x.y);
  const ins = {};
  for (const [h, rs] of [['tutto', rows], ...Object.entries(H)]) {
    if (rs.length < 20) { ins[h] = { n: rs.length }; continue; }
    const y = Y(rs), a = ols(XA(rs), y), b = ols(XB(rs), y), c = ols(XC(rs), y);
    ins[h] = { n: rs.length, da: rs[0].date, a: rs.at(-1).date, r2_wti: r(r2(y, predict(a, XA(rs))), 4), r2_wti_crack: r(r2(y, predict(b, XB(rs))), 4), r2_crack: r(r2(y, predict(c, XC(rs))), 4), coef_wti_crack: b.map((x) => r(x, 4)) };
    ins[h].aumento = r(ins[h].r2_wti_crack - ins[h].r2_wti, 4);
  }
  const oos = {};
  for (const [tr, te] of [['1986-2005', '2006-oggi'], ['2006-oggi', '1986-2005']]) {
    const A = H[tr], B = H[te];
    if (A.length < 20 || B.length < 20) { oos[`${tr}→${te}`] = null; continue; }
    const a = ols(XA(A), Y(A)), b = ols(XB(A), Y(A)), c = ols(XC(A), Y(A)), y = Y(B);
    const rA = r2(y, predict(a, XA(B))), rB = r2(y, predict(b, XB(B))), rC = r2(y, predict(c, XC(B)));
    oos[`${tr}→${te}`] = { r2_wti: r(rA, 4), r2_wti_crack: r(rB, 4), r2_crack: r(rC, 4), aumento: r(rB - rA, 4), crack_solo_meno_wti: r(rC - rA, 4) };
  }
  const passa = Object.values(oos).every((v) => v && v.aumento >= 0.05);
  return { nel_campione: ins, fuori_campione: oos, passa };
}
