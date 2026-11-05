/*
 * emerging.js — calcoli della vista 8 «Emergenti» (solo contesto: nessuna regola, nessun alert). Nessun accesso al DOM:
 * lo usano l'app, i test e gli script di ricerca.
 *
 * Definizioni (le stesse di ricerca/emergenti/backtest/script/backtest.mjs, fissate prima del backtest):
 * - pulizia dei cambi: un errore di stampa isolato (salto oltre il 3% che si annulla il giorno dopo entro l'1%; 1% e 0,3%
 *   per CNY e HKD) diventa un giorno mancante; una finestra che scavalca un buco di oltre 10 giorni di calendario è nulla;
 * - z della valuta: variazione logaritmica del cambio a 63 sedute (13 settimane) divisa per la deviazione standard delle
 *   variazioni delle ultime 756 sedute (almeno il 90% presenti, al massimo 3,5 anni di calendario);
 * - F «ha smesso di scendere»: z ≥ 1 in almeno una delle ultime 126 sedute E il cambio sotto il massimo delle ultime 63
 *   sedute di almeno 0,5 deviazioni standard; «in calo forte»: z ≥ 1 e F spento;
 * - D «dollaro emergente favorevole»: DTWEXEMEGS (FRED) sotto la media a 200 sedute e in calo a 63 sedute.
 * Ogni valore alla seduta t usa solo dati fino a t. Un dato mancante resta null («—»), mai riempito.
 */
import { decodeDates, deltaDecode } from './indexdata.js';
import { rrgNew, weeklyIndices, quadrant } from './engine.js';

const DAY = 86400000;

/** Serie del file data/emerging.json: { d0, gaps, cd, ps } → { dates, val } */
export function emSeries(x) {
  if (!x || !x.cd) return null;
  const dates = decodeDates(x.d0, x.gaps), val = deltaDecode(x.cd, x.ps || 1);
  return { dates, val };
}

/** brk[i] = numero di buchi oltre 10 giorni di calendario fino alla riga i (una finestra che scavalca un buco è nulla) */
export function breaks(dates) {
  const brk = new Array(dates.length).fill(0);
  for (let i = 1; i < dates.length; i++) brk[i] = brk[i - 1] + ((Date.parse(dates[i]) - Date.parse(dates[i - 1])) / DAY > 10 ? 1 : 0);
  return brk;
}
const okWin = (S, i, k) => i - k >= 0 && S.brk[i] === S.brk[i - k];

/** Pulizia degli errori di stampa isolati di Yahoo (come loadFx del backtest): il giorno sbagliato diventa mancante. */
export function cleanFx(sym, s) {
  const tight = /CNY|HKD/.test(sym), thr = tight ? 0.01 : 0.03, back = tight ? 0.003 : 0.01;
  const v = s.val, bad = new Set();
  for (let i = 1; i + 1 < v.length; i++) {
    const r1 = Math.log(v[i] / v[i - 1]), r2 = Math.log(v[i + 1] / v[i]);
    if (Math.abs(r1) > thr && Math.abs(r2) > thr && Math.sign(r1) !== Math.sign(r2) && Math.abs(r1 + r2) < back) bad.add(i);
  }
  const dates = [], val = [], removed = [];
  s.dates.forEach((d, i) => { if (bad.has(i)) removed.push({ date: d, value: v[i] }); else { dates.push(d); val.push(v[i]); } });
  return { sym, dates, val, brk: breaks(dates), removed };
}

/** Serie senza pulizia (DTWEXEMEGS, ETF), con i buchi segnati */
export const plain = (sym, s) => ({ sym, dates: s.dates, val: s.val, brk: breaks(s.dates), removed: [] });

/**
 * Indicatori della valuta sul calendario del cambio: z e F (definizioni in testa). Stesso calcolo di computeF del backtest.
 * @returns {{z: (number|null)[], F: (0|1|null)[], sd: (number|null)[]}}
 */
export function fxSignals(S, { w = 63, z = 1, look = 126, sdN = 756, back = 0.5 } = {}) {
  const n = S.val.length, lr = new Array(n).fill(null), sd = new Array(n).fill(null), zz = new Array(n).fill(null), F = new Array(n).fill(null);
  for (let i = 0; i < n; i++) if (okWin(S, i, w)) lr[i] = Math.log(S.val[i] / S.val[i - w]);
  let s1 = 0, s2 = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    if (lr[i] != null) { s1 += lr[i]; s2 += lr[i] * lr[i]; cnt++; }
    const j = i - sdN;
    if (j >= 0 && lr[j] != null) { s1 -= lr[j]; s2 -= lr[j] * lr[j]; cnt--; }
    if (cnt >= 0.9 * sdN && (Date.parse(S.dates[i]) - Date.parse(S.dates[Math.max(0, i - sdN + 1)])) / DAY <= 1278) {
      const m = s1 / cnt; sd[i] = Math.sqrt(Math.max(0, (s2 - cnt * m * m) / (cnt - 1)));
    }
    if (sd[i] && lr[i] != null) zz[i] = lr[i] / sd[i];
  }
  for (let i = 0; i < n; i++) {
    if (sd[i] == null || i - look + 1 < 0 || !okWin(S, i, w - 1)) continue;
    let hit = false, got = 0;
    for (let k = i - look + 1; k <= i; k++) { if (zz[k] == null) continue; got++; if (zz[k] >= z) hit = true; }
    if (got < 0.9 * look) continue;
    let mx = -Infinity; for (let k = i - w + 1; k <= i; k++) mx = Math.max(mx, S.val[k]);
    F[i] = hit && Math.log(mx / S.val[i]) >= back * sd[i] ? 1 : 0;
  }
  return { z: zz, F, sd };
}

/** Stato della valuta in parole: 'ferma' (ha smesso di scendere), 'calo' (in calo forte), 'normale', null se manca */
export const fxState = (F, z) => (F == null || z == null ? null : F ? 'ferma' : z >= 1 ? 'calo' : 'normale');

/** D sul calendario del dollaro emergente, come computeD del backtest; con la media a 200 sedute */
export function dollarSignals(S, { ma = 200, w = 63 } = {}) {
  const n = S.val.length, D = new Array(n).fill(null), sma = new Array(n).fill(null), ch = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (okWin(S, i, w)) ch[i] = (S.val[i] / S.val[i - w] - 1) * 100;
    if (!okWin(S, i, ma - 1)) continue;
    let s = 0; for (let k = i - ma + 1; k <= i; k++) s += S.val[k];
    sma[i] = s / ma;
    if (okWin(S, i, Math.max(ma - 1, w))) D[i] = S.val[i] < sma[i] && S.val[i] < S.val[i - w] ? 1 : 0;
  }
  return { D, sma, ch };
}

/** Valori di una serie sulle date dell'indice: solo la stessa data, altrimenti null (nessun riempimento) */
export function onDates(srcDates, srcVals, dates) {
  const m = new Map(); srcDates.forEach((d, i) => m.set(d, srcVals[i]));
  return dates.map((d) => (m.has(d) ? m.get(d) : null));
}

/** Indice in dollari: chiusura in valuta locale / cambio dello stesso giorno (null se manca uno dei due) */
export const inUsd = (close, fx) => close.map((c, t) => (c != null && fx[t] != null && fx[t] > 0 ? c / fx[t] : null));

/** Variazione percentuale a h sedute all'ultima seduta con un valore (null se manca l'inizio o la fine) */
export function change(a, h, t = a.length - 1) {
  while (t >= 0 && a[t] == null) t--;
  return t - h >= 0 && a[t] != null && a[t - h] != null ? (a[t] / a[t - h] - 1) * 100 : null;
}

/**
 * Forza relativa dell'ETF contro il benchmark, settimanale, con la formula «Nuova» della rotazione (rrgNew di engine.js):
 * sulle date comuni ai due, ultima seduta di ogni settimana.
 */
export function relStrength(etf, bench, trailN = 10) {
  if (!etf || !bench) return null;
  const bm = new Map(bench.dates.map((d, i) => [d, bench.val[i]]));
  const dates = [], a = [], b = [];
  etf.dates.forEach((d, i) => { if (bm.has(d) && etf.val[i] != null && bm.get(d) != null) { dates.push(d); a.push(etf.val[i]); b.push(bm.get(d)); } });
  if (dates.length < 60) return null;
  const wi = weeklyIndices(dates), ws = wi.map((i) => a[i]), wb = wi.map((i) => b[i]);
  const rr = rrgNew(ws, wb), L = wi.length - 1;
  const ratio = rr.rsRatio[L], mom = rr.rsMomentum[L];
  const trail = [];
  for (let q = Math.max(0, L - trailN + 1); q <= L; q++) if (rr.rsRatio[q] != null && rr.rsMomentum[q] != null) trail.push([rr.rsRatio[q], rr.rsMomentum[q], dates[wi[q]]]);
  return { last: dates[wi[L]], ratio, mom, quad: ratio == null || mom == null ? null : quadrant(ratio, mom), trail };
}
