/*
 * capitulation.js — cali forti cumulati («capitolazione»; da Quant Rea, «Drop giornaliero cumulato»).
 * Modulo condiviso: la pipeline conta ogni sera i membri in forte calo (scripts/fetch_breadth.js per l'S&P 500 e i
 * settori, scripts/fetch_indices.js per gli indici, ricostruzione in scripts/backfill_capitulation.py); l'app fa le
 * somme, la soglia di allerta e gli episodi.
 *
 * Conteggio di una seduta (dayCounts): membri con un rendimento giornaliero di −5%, −7%, −10% o peggio, chiusura su
 * chiusura rettificata per gli split. Un calo che la seduta dopo si riprende quasi tutto, quando quel giorno e il giorno
 * dopo sono tranquilli per gli altri membri (mediana entro ±2% in tutte e due), è un errore di stampa della fonte e non conta; un crollo oltre il 60% in
 * una giornata normale anche (frazionamento non registrato). Denominatore n: membri con il rendimento della seduta.
 *
 * Formato di data/capitulation.json: per ogni serie (SPX, settori XL*, indici di config/indices.json) d0 e gaps delle
 * sue sedute (come js/indexdata.js), n in RLE e i conteggi di ogni soglia in una stringa (encodeCounts).
 *
 * Lettura (preset di Rea: −7% su 5 sedute): somma dei conteggi, o delle percentuali, sulle ultime N sedute; allerta
 * quando la somma supera il 99° percentile delle sedute precedenti (almeno 3 anni di storia) con almeno 5 cali nella
 * somma. Conta se l'allerta si ripete: nei 12 mesi dal primo episodio, mediana di 31,5 sedute in allerta nel 2007-2009,
 * 12 nel 2020, 5 nell'aprile 2025 (ricerca/quant-rea/script/capitolazione_persistenza.mjs). È contesto: non entra
 * nelle regole del semaforo.
 */
import { decodeDates, encodeDates } from './indexdata.js';
import { expandRLE, encodeRLE } from './signals.js';

export const THRESHOLDS = [5, 7, 10];
export const CAP_DEFAULT = { thr: 7, win: 5, mode: 'count', q: 0.99, warm: 756, min: 5, gap: 10, look: 63 };

// Conteggi in una stringa: da 0 a 34 un carattere in base 36, da 35 in su 'z' e tre caratteri, seduta senza dato '-'
export function encodeCounts(a) {
  let s = '';
  for (const v of a) {
    if (v == null) s += '-';
    else if (v < 35) s += v.toString(36);
    else s += 'z' + Math.min(v, 46655).toString(36).padStart(3, '0');
  }
  return s;
}
export function decodeCounts(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '-') out.push(null);
    else if (ch === 'z') { out.push(parseInt(s.slice(i + 1, i + 4), 36)); i += 3; }
    else out.push(parseInt(ch, 36));
  }
  return out;
}

const EPS = 1e-9; // 90/100 − 1 vale −0,0999…: un −10% esatto conta come −10%

function median(v) {
  const s = v.slice().sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Conteggi di una seduta.
 * @param {(number|null)[]} r rendimenti dei membri nella seduta (0,05 = +5%; null = senza rendimento)
 * @param {(number|null)[]} [next] rendimenti degli stessi membri nella seduta dopo (null se non ancora nota)
 * @returns {{n: number, x5: number, x7: number, x10: number}}
 */
export function dayCounts(r, next) {
  const v = r.filter((x) => x != null && Number.isFinite(x));
  const out = { n: v.length, x5: 0, x7: 0, x10: 0 };
  if (!v.length) return out;
  // errore di stampa solo se la seduta e quella dopo sono tranquille per gli altri membri: dopo un giorno di panico
  // il rimbalzo è di tutto il mercato (13/10/2008, 9/4/2025) e i cali del giorno prima sono veri
  const nv = next ? next.filter((x) => x != null && Number.isFinite(x)) : [];
  const med = median(v), calm = Math.abs(med) < 0.02 && nv.length > 0 && Math.abs(median(nv)) < 0.02;
  r.forEach((x, i) => {
    if (x == null || !Number.isFinite(x) || x > -0.05 + EPS) return;
    const nx = next ? next[i] : null;
    if (calm && nx != null && nx >= (1 / (1 + x) - 1) * 0.9) return; // errore di stampa: il giorno dopo torna dov'era
    if (x <= -0.6 && med > -0.05) return;
    for (const t of THRESHOLDS) if (x <= -t / 100 + EPS) out['x' + t]++;
  });
  return out;
}

/** Serie di data/capitulation.json in forma estesa: {dates, n, x5, x7, x10}. */
export function capSeries(x) {
  const dates = decodeDates(x.d0, x.gaps), L = dates.length, out = { dates, n: expandRLE(x.n, L) };
  for (const t of THRESHOLDS) {
    const c = decodeCounts(x['x' + t] || '');
    out['x' + t] = dates.map((_, i) => (i < c.length ? c[i] : null));
  }
  return out;
}

/**
 * Somma su `win` sedute dei conteggi (mode 'count') o delle percentuali dei membri (mode 'pct').
 * @returns {{sum: (number|null)[], cnt: (number|null)[]}} cnt = somma dei conteggi (per il minimo di cali)
 */
export function windowSum(s, { thr = 7, win = 5, mode = 'count' } = {}) {
  const x = s['x' + thr], L = x.length, sum = new Array(L).fill(null), cnt = new Array(L).fill(null);
  for (let i = win - 1; i < L; i++) {
    let a = 0, c = 0, ok = true;
    for (let k = i - win + 1; k <= i; k++) {
      if (x[k] == null || !s.n[k]) { ok = false; break; }
      c += x[k];
      a += mode === 'pct' ? (100 * x[k]) / s.n[k] : x[k];
    }
    if (ok) { sum[i] = a; cnt[i] = c; }
  }
  return { sum, cnt };
}

/** Quantile `q` dei valori delle sedute precedenti (null finché non ce ne sono `warm`). */
export function alertLine(sum, { q = 0.99, warm = 756 } = {}) {
  const sorted = [], out = new Array(sum.length).fill(null);
  for (let i = 0; i < sum.length; i++) {
    if (sorted.length >= warm) {
      const pos = q * (sorted.length - 1), lo = Math.floor(pos), f = pos - lo;
      out[i] = sorted[lo] + (lo + 1 < sorted.length ? f * (sorted[lo + 1] - sorted[lo]) : 0);
    }
    const v = sum[i];
    if (v == null) continue;
    let a = 0, b = sorted.length;
    while (a < b) { const m = (a + b) >> 1; if (sorted[m] <= v) a = m + 1; else b = m; }
    sorted.splice(a, 0, v);
  }
  return out;
}

/**
 * Allerta, episodi e situazione di oggi.
 * Un episodio raccoglie le sedute in allerta distanti meno di `gap` sedute: inizio, fine, sedute in allerta, picco.
 * @returns {{on: boolean[], alert: (number|null)[], episodes: object[], today: object|null, from: number}}
 */
export function capAnalysis(s, opt = {}) {
  const o = { ...CAP_DEFAULT, ...opt };
  const { sum, cnt } = windowSum(s, o);
  const alert = alertLine(sum, o);
  const on = sum.map((v, i) => v != null && alert[i] != null && v > alert[i] && cnt[i] >= o.min);
  const episodes = [];
  let cur = null;
  on.forEach((x, i) => {
    if (!x) return;
    if (cur && i - cur.end < o.gap) { cur.end = i; cur.days++; if (sum[i] > cur.peak) { cur.peak = sum[i]; cur.peakI = i; } return; }
    cur = { start: i, end: i, days: 1, peak: sum[i], peakI: i };
    episodes.push(cur);
  });
  const from = alert.findIndex((v) => v != null);
  let today = null;
  let last = sum.length - 1;
  while (last >= 0 && sum[last] == null) last--;
  if (last >= 0) {
    const past = sum.slice(Math.max(0, from), last).filter((v) => v != null);
    const recent = on.slice(Math.max(0, last - o.look + 1), last + 1).filter(Boolean).length;
    today = { i: last, value: sum[last], cnt: cnt[last], alert: alert[last], on: on[last],
      // percentile: quota delle sedute precedenti con una somma più bassa (con 0 cali vale 0, anche se lo zero è frequente)
      pct: past.length ? (100 * past.filter((v) => v < sum[last]).length) / past.length : null, recent };
  }
  return { sum, cnt, alert, on, episodes, today, from };
}

/**
 * Cosa è successo dopo ogni episodio, sul prezzo (indice o ETF) allineato per data.
 * @param {object[]} episodes da capAnalysis; `dates` sono le sedute della serie della capitolazione
 * @returns {{rows: object[], base: object}} rows: data, sedute in allerta, picco, calo dal massimo a 52 settimane
 *   all'inizio (solo informativo), ulteriore calo nelle 63 sedute dopo, rendimenti a 63 e 252 sedute;
 *   base: rendimento medio di una seduta qualsiasi dello stesso periodo
 */
export function capOutcomes(episodes, dates, pDates, close, from = 0) {
  const at = new Map(pDates.map((d, i) => [d, i]));
  const idx = (d) => { if (at.has(d)) return at.get(d); let lo = 0, hi = pDates.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (pDates[m] <= d) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
  const fwd = (j, h) => (j >= 0 && j + h < close.length && close[j] && close[j + h] ? close[j + h] / close[j] - 1 : null);
  const rows = episodes.map((e) => {
    const j = idx(dates[e.start]);
    let hi = 0, lo = Infinity;
    for (let k = Math.max(0, j - 251); k <= j; k++) if (close[k] > hi) hi = close[k];
    for (let k = j + 1; k <= Math.min(close.length - 1, j + 63); k++) if (close[k] < lo) lo = close[k];
    return { date: dates[e.start], end: dates[e.end], days: e.days, peak: e.peak,
      // senza il prezzo quel giorno (settori prima della quotazione dell'ETF, come XLC e XLRE nel 2008): «—»
      dd52: j >= 0 && close[j] && hi ? close[j] / hi - 1 : null,
      fall63: j >= 0 && close[j] && lo < Infinity && j + 63 < close.length ? Math.min(0, lo / close[j] - 1) : null,
      r63: fwd(j, 63), r252: fwd(j, 252) };
  });
  const base = {};
  const j0 = from >= 0 && dates[from] ? idx(dates[from]) : 0;
  for (const h of [63, 252]) {
    let a = 0, n = 0;
    for (let j = Math.max(0, j0); j + h < close.length; j++) { const r = fwd(j, h); if (r != null) { a += r; n++; } }
    base['r' + h] = n ? a / n : null;
  }
  return { rows, base };
}

// ---------- pipeline: conteggi delle sedute nuove e aggiornamento del file ----------

const DAY = 86400000;
const gapDays = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
function find(p, d) {
  if (p.index) return p.index.has(d) ? p.index.get(d) : -1;
  let lo = 0, hi = p.dates.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (p.dates[m] === d) return m; if (p.dates[m] < d) lo = m + 1; else hi = m - 1; }
  return -1;
}
// Rendimento della seduta j del titolo (la seduta prima al massimo 7 giorni prima); con la chiusura rettificata per i
// dividendi (adj) vale quella quando le due differiscono di oltre 5 punti (spin-off e altri eventi straordinari)
function ret(p, j) {
  if (j < 1 || j >= p.close.length || gapDays(p.dates[j - 1], p.dates[j]) > 7) return null;
  const rc = p.close[j] / p.close[j - 1] - 1;
  if (p.adj && p.adj[j] && p.adj[j - 1]) { const ra = p.adj[j] / p.adj[j - 1] - 1; if (Math.abs(rc - ra) > 0.05) return ra; }
  return Number.isFinite(rc) ? rc : null;
}
/**
 * Conteggi di una seduta per una lista di titoli.
 * @param {string[]} symbols membri
 * @param {Object<string, {dates: string[], close: number[], adj?: number[], index?: Map}>} prices
 * @param {string} d seduta
 */
export function countsOn(symbols, prices, d) {
  const r = [], next = [];
  for (const s of symbols) {
    const p = prices[s];
    const j = p ? find(p, d) : -1;
    r.push(j < 0 ? null : ret(p, j));
    next.push(j < 0 ? null : ret(p, j + 1));
  }
  return dayCounts(r, next);
}

/** Serie estesa (capSeries) di nuovo nel formato del file. */
export function packCap(s) {
  const out = { ...encodeDates(s.dates), n: encodeRLE(s.n) };
  for (const t of THRESHOLDS) out['x' + t] = encodeCounts(s['x' + t]);
  return out;
}
/**
 * Inserisce o sostituisce i conteggi di alcune sedute in una serie del file (null = serie nuova).
 * @param {object|null} x serie del file
 * @param {Object<string, {n: number, x5: number, x7: number, x10: number}>} rows per seduta
 */
export function mergeCap(x, rows) {
  const s = x ? capSeries(x) : { dates: [], n: [], x5: [], x7: [], x10: [] };
  for (const d of Object.keys(rows).sort()) {
    let i = s.dates.indexOf(d);
    if (i < 0) {
      i = s.dates.findIndex((v) => v > d);
      if (i < 0) i = s.dates.length;
      s.dates.splice(i, 0, d);
      for (const k of ['n', 'x5', 'x7', 'x10']) s[k].splice(i, 0, null);
    }
    for (const k of ['n', 'x5', 'x7', 'x10']) s[k][i] = rows[d][k];
  }
  return packCap(s);
}
