/*
 * vix.js — calcoli della vista «VIX» (solo contesto: nessuna regola, nessun alert). Nessun accesso al DOM: lo usano l'app,
 * i test e gli script di ricerca. Idea di Massimo Rea (quant-rea): rendimenti dell'S&P 500 quando il VIX è alto. Metodo
 * e verifica in ricerca/vix/ (ramo di sviluppo): regimi/regimi.md, volatilita/volatilita.md, sintesi.md.
 *
 * Definizioni (le stesse di ricerca/vix/regimi/script/regimi.mjs, variante «ingresso il giorno dopo» scelta dall'utente):
 * - calendario: le sedute dell'indice; il VIX si prende alla stessa data, una seduta senza VIX resta senza (null);
 * - episodio alla soglia X: prima chiusura del VIX ≥ X preceduta da almeno 63 sedute con il VIX tutte < X;
 * - rendimenti dell'indice dalla chiusura della seduta DOPO il segnale (il VIX chiude alle 16:15, l'indice alle 16:00:
 *   partire dalla stessa chiusura userebbe un quarto d'ora di dato futuro) a 21, 63, 126 e 252 sedute dopo;
 * - calo successivo: il punto più basso dell'indice entro 252 sedute rispetto al prezzo d'ingresso (0 se non scende);
 * - base: tutte le sedute dalla prima data del VIX, con lo stesso ingresso;
 * - realizzata: deviazione standard dei rendimenti logaritmici delle ultime 21 sedute, annualizzata (×√252), in punti %;
 * - premio per la paura: VIX − realizzata; percentili sempre sulla sola storia fino a quel giorno, «—» finché ha meno di 252 valori;
 * - struttura a termine (dal 04/12/2007): R = VIX / VIX3M alla stessa seduta, da 1 in su «backwardation», sotto 1 «contango»;
 * - credito (dal 2007): rapporto tra le chiusure rettificate di HYG e IEF, distanza % dal massimo delle ultime 252 sedute e
 *   variazione % su 21 sedute. Struttura a termine e credito: idea da un grafico di Stefano Serafini (Swiss Capital School)
 *   al Morning Trading Show di BNP Paribas; solo contesto, il backtest non ha trovato statistiche robuste
 *   (ricerca/vix/struttura/backtest/backtest.md).
 * Un dato mancante resta null («—»), mai riempito.
 */
import { decodeDates, deltaDecode } from './indexdata.js';

export const XS = [20, 25, 30, 40, 50];
export const HS = [21, 63, 126, 252];
export const QUIET = 63;
export const ENTRY = 1;
/** Soglie che la verifica del 06/11/2026 ha trovato robuste (criterio deciso prima, ricerca/vix/regimi/regimi.md) */
export const ROBUST = [40];
/** Fasce del VIX per la lettura di oggi */
export const BANDS = [[0, 15, 'calmo'], [15, 20, 'normale'], [20, 25, 'nervoso'], [25, 30, 'paura'], [30, 40, 'paura forte'], [40, 50, 'panico'], [50, Infinity, 'panico estremo']];
/** Crisi (solo etichette, le stesse della ricerca) */
export const CRISES = [
  ['1990 Golfo', '1990-07-01', '1991-03-31'], ['1997 Asia', '1997-10-01', '1997-12-31'], ['1998 Russia/LTCM', '1998-08-01', '1998-12-31'],
  ['2000-03 bolla internet', '2000-03-01', '2003-04-30'], ['2007-09 crisi finanziaria', '2007-07-01', '2009-06-30'],
  ['2010 euro/flash crash', '2010-05-01', '2010-09-30'], ['2011-12 debito USA/euro', '2011-07-01', '2012-06-30'],
  ['2014 ottobre', '2014-10-01', '2014-12-31'], ['2015-16 Cina/petrolio', '2015-08-01', '2016-03-31'],
  ['2018 volatilità/Fed', '2018-02-01', '2018-12-31'], ['2020 Covid', '2020-02-01', '2020-12-31'],
  ['2022 inflazione/tassi', '2022-01-01', '2022-12-31'], ['2024 carry yen', '2024-07-15', '2024-09-30'],
  ['2025 dazi', '2025-03-01', '2025-05-31'],
];
export const crisisOf = (d) => (CRISES.find(([, a, b]) => d >= a && d <= b) || [null])[0];
export const bandOf = (v) => (v == null ? null : BANDS.find(([a, b]) => v >= a && v < b));

/** Serie compatta di data/vix.json → { dates, val, fred } */
export function vxSeries(x) {
  if (!x || !x.cd) return null;
  return { dates: decodeDates(x.d0, x.gaps), val: deltaDecode(x.cd, x.ps || 1), fred: x.fred || null };
}

/** Indice e VIX sulle sedute dell'indice (VIX null dove manca) */
export function align(ix, vix) {
  const m = new Map(vix.dates.map((d, i) => [d, vix.val[i]]));
  return { dates: ix.dates, close: ix.val, vix: ix.dates.map((d) => (m.has(d) ? m.get(d) : null)), fred: vix.fred };
}

// ---------- statistiche ----------
export function quantile(a, q) { // tipo 7 (numpy, Excel PERCENTILE.INC)
  const v = a.filter((x) => x != null).sort((x, y) => x - y);
  if (!v.length) return null;
  const h = (v.length - 1) * q, lo = Math.floor(h);
  return lo + 1 < v.length ? v[lo] + (h - lo) * (v[lo + 1] - v[lo]) : v[lo];
}
export function dist(a) {
  const v = a.filter((x) => x != null);
  if (!v.length) return { n: 0, median: null, posN: 0, pos: null, p10: null };
  const posN = v.filter((x) => x > 0).length;
  return { n: v.length, median: quantile(v, 0.5), posN, pos: (100 * posN) / v.length, p10: quantile(v, 0.1) };
}

/** Rendimenti a HS e calo successivo dall'ingresso p + entry */
export function outcomes(close, p, entry = ENTRY) {
  const n = close.length, e = p + entry, o = { ret: {}, dd: null, toMin: null, partial: e + 252 >= n };
  for (const h of HS) o.ret[h] = e + h < n ? (close[e + h] / close[e] - 1) * 100 : null;
  if (e >= n) return o;
  const end = Math.min(n - 1, e + 252);
  let mn = close[e], at = e;
  for (let k = e + 1; k <= end; k++) if (close[k] < mn) { mn = close[k]; at = k; }
  o.dd = Math.min(0, (mn / close[e] - 1) * 100);
  o.toMin = at - e;
  return o;
}

/** Episodi alla soglia X (A = serie allineata) */
export function episodes(A, X, Q = QUIET, entry = ENTRY) {
  const pos = [];
  A.vix.forEach((v, i) => { if (v != null) pos.push(i); });
  const v = pos.map((i) => A.vix[i]), starts = [];
  for (let j = Q; j < v.length; j++) {
    if (v[j] < X) continue;
    let quiet = true;
    for (let k = j - Q; k < j; k++) if (v[k] >= X) { quiet = false; break; }
    if (quiet) starts.push(j);
  }
  return starts.map((j, e) => {
    const stop = e + 1 < starts.length ? starts[e + 1] : v.length;
    let mx = v[j], last = j;
    for (let k = j; k < stop; k++) if (v[k] >= X) { last = k; if (v[k] > mx) mx = v[k]; }
    const p = pos[j];
    return { date: A.dates[p], p, vix: v[j], vixMax: mx, end: A.dates[pos[last]], crisis: crisisOf(A.dates[p]), ...outcomes(A.close, p, entry) };
  });
}

/** Tabella dei regimi: base e, per ogni soglia, episodi e statistiche */
export function regimes(A, { entry = ENTRY, Q = QUIET } = {}) {
  const from = A.dates[A.vix.findIndex((v) => v != null)];
  const ps = []; A.dates.forEach((d, i) => { if (d >= from) ps.push(i); });
  const base = {};
  for (const h of HS) base[h] = dist(ps.map((p) => (p + entry + h < A.close.length ? (A.close[p + entry + h] / A.close[p + entry] - 1) * 100 : null)));
  const dds = ps.filter((p) => p + entry + 252 < A.close.length).map((p) => outcomes(A.close, p, entry).dd);
  base.dd = { n: dds.length, median: quantile(dds, 0.5) };
  const thr = {};
  for (const X of XS) {
    const eps = episodes(A, X, Q, entry), full = eps.filter((e) => !e.partial), s = {};
    for (const h of HS) s[h] = dist(eps.map((e) => e.ret[h]));
    s.dd = { n: full.length, median: quantile(full.map((e) => e.dd), 0.5), worst: full.length ? Math.min(...full.map((e) => e.dd)) : null };
    s.toMin = quantile(full.map((e) => e.toMin), 0.5);
    thr[X] = { episodes: eps, stats: s, robust: ROBUST.includes(X) };
  }
  return { from, to: A.dates.at(-1), base, thr };
}

/** Punti dello scatter (giorni con VIX ≥ X): rendimento a h sedute dal giorno dopo; ep = inizio dell'episodio */
export function scatter(A, X = 30, h = 252, entry = ENTRY, Q = QUIET) {
  const eps = episodes(A, X, Q, entry), pts = [];
  A.vix.forEach((v, p) => {
    if (v == null || v < X || p + entry + h >= A.close.length) return;
    let ep = null; for (const e of eps) if (e.p <= p) ep = e;
    pts.push({ date: A.dates[p], vix: v, ret: (A.close[p + entry + h] / A.close[p + entry] - 1) * 100, ep: ep ? ep.date : null, start: !!ep && ep.p === p, crisis: crisisOf(A.dates[p]) });
  });
  const open = A.vix.filter((v, p) => v != null && v >= X && p + entry + h >= A.close.length).length; // giorni senza ancora 12 mesi
  return { pts, eps, open };
}

/** Volatilità realizzata delle ultime w sedute, annualizzata, in punti % (null se manca una chiusura) */
export function realized(close, w = 21) {
  const n = close.length, out = new Array(n).fill(null);
  for (let t = w; t < n; t++) {
    let s1 = 0, s2 = 0, ok = true;
    for (let k = t - w + 1; k <= t; k++) {
      if (close[k] == null || close[k - 1] == null) { ok = false; break; }
      const r = Math.log(close[k] / close[k - 1]); s1 += r; s2 += r * r;
    }
    if (!ok) continue;
    const m = s1 / w;
    out[t] = Math.sqrt(Math.max(0, (s2 - w * m * m) / (w - 1))) * Math.sqrt(252) * 100;
  }
  return out;
}

/** Percentile (quota dei valori ≤ x) di ogni valore sulla storia fino a quel giorno; null finché la storia ha meno di minN valori */
export function expandingPct(a, minN = 1) {
  const out = new Array(a.length).fill(null), seen = [];
  const ins = (x) => { let lo = 0, hi = seen.length; while (lo < hi) { const m = (lo + hi) >> 1; if (seen[m] <= x) lo = m + 1; else hi = m; } seen.splice(lo, 0, x); return lo; };
  a.forEach((x, i) => { if (x == null) return; const k = ins(x); if (seen.length >= minN) out[i] = (100 * (k + 1)) / seen.length; });
  return out;
}

// ---------- struttura a termine e credito (idea di Stefano Serafini, solo contesto) ----------
/** Valori di una serie {dates, val} sulle date date (null dove manca; tutto null se la serie non c'è) */
export function onDates(dates, s) {
  if (!s) return dates.map(() => null);
  const m = new Map(s.dates.map((d, i) => [d, s.val[i]]));
  return dates.map((d) => (m.has(d) ? m.get(d) : null));
}
/** a / b seduta per seduta, null se manca uno dei due (mai riempito) */
export const ratio = (a, b) => a.map((x, i) => (x != null && b[i] != null && b[i] > 0 ? x / b[i] : null));
/** Stato della struttura a termine: da 1 in su backwardation (soglia decisa con l'utente il 09/11/2026) */
export const termState = (r) => (r == null ? null : r >= 1 ? 'backwardation' : 'contango');
/** Distanza % dal massimo delle ultime w osservazioni valide (oggi compreso); null finché non ce ne sono w */
export function ddFromMax(a, w = 252) {
  const out = new Array(a.length).fill(null), pos = [];
  a.forEach((x, i) => {
    if (x == null) return;
    pos.push(i);
    if (pos.length < w) return;
    let mx = -Infinity;
    for (let k = pos.length - w; k < pos.length; k++) if (a[pos[k]] > mx) mx = a[pos[k]];
    out[i] = (x / mx - 1) * 100;
  });
  return out;
}
/** Variazione % rispetto a h osservazioni valide prima (salta i null senza riempirli) */
export function obsChange(a, h = 21) {
  const out = new Array(a.length).fill(null), pos = [];
  a.forEach((x, i) => { if (x == null) return; pos.push(i); const k = pos.length - 1 - h; if (k >= 0) out[i] = (x / a[pos[k]] - 1) * 100; });
  return out;
}
const lastAt = (a, t = a.length - 1) => { while (t >= 0 && a[t] == null) t--; return t; };

/**
 * Struttura a termine e credito sulle sedute di A (serie allineata). v3 = VIX3M, cr = rapporto HYG/IEF ({dates, val,
 * fred} o null se il file non le ha). R = VIX/VIX3M; credito = distanza del rapporto HYG/IEF dal massimo di 252 sedute;
 * percentili sulla sola storia fino a quel giorno (almeno 252 valori); per il credito il percentile è della profondità
 * del calo (alto = calo più profondo della storia). R è provvisorio se la seduta è dopo l'ultimo FRED del VIX o del VIX3M.
 */
export function context(A, v3, cr) {
  const V3 = onDates(A.dates, v3), R = ratio(A.vix, V3), C = onDates(A.dates, cr);
  const dd = ddFromMax(C, 252), ch = obsChange(C, 21);
  const rPct = expandingPct(R, 252), ddPct = expandingPct(dd.map((x) => (x == null ? null : -x)), 252);
  const provisional = (i) => i >= 0 && ((!!A.fred && A.dates[i] > A.fred) || (!!v3 && !!v3.fred && A.dates[i] > v3.fred));
  const tv = lastAt(A.vix), tr = lastAt(R), tc = lastAt(dd);
  return {
    has3m: !!v3, hasCredit: !!cr, from3m: v3 ? v3.dates[0] : null, fromCredit: cr ? cr.dates[0] : null,
    v3: V3, r: R, rPct, credit: C, dd, ddPct, ch, provisional,
    now: {
      r: tr >= 0 ? { date: A.dates[tr], vix: A.vix[tr], v3: V3[tr], r: R[tr], state: termState(R[tr]), pct: rPct[tr], provisional: provisional(tr), sameDay: tr === tv } : null,
      credit: tc >= 0 ? { date: A.dates[tc], dd: dd[tc], ch: ch[tc], pct: ddPct[tc] } : null,
    },
  };
}

/** Lettura di oggi: ultimo VIX, fascia, percentile, realizzata, premio e suo percentile (storia fino a oggi) */
export function today(A) {
  let t = A.vix.length - 1; while (t >= 0 && A.vix[t] == null) t--;
  if (t < 0) return null;
  const rv = realized(A.close), prem = A.vix.map((v, i) => (v != null && rv[i] != null ? v - rv[i] : null));
  const vp = expandingPct(A.vix, 252), pp = expandingPct(prem, 252); // almeno un anno di storia
  return { date: A.dates[t], vix: A.vix[t], provisional: !!(A.fred && A.dates[t] > A.fred), band: bandOf(A.vix[t]), pct: vp[t], rv: rv[t], prem: prem[t], premPct: pp[t], rvSeries: rv, premSeries: prem, premPctSeries: pp, vixPctSeries: vp };
}
