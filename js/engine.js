/*
 * engine.js — calcolo della rotazione relativa (approssimazione in stile RRG).
 *
 * Due formule, entrambe su dati passati soltanto (niente sguardo al futuro):
 *
 * "nuova" (default)
 *   lr  = ln(prezzo / benchmark)
 *   σ   = volatilità settimanale di lr (media esponenziale dei quadrati, emivita 26)
 *   X   = (EMA10(lr) − EMA30(lr)) / (σ·√10)
 *   RS-Ratio    = 100 + 2,5·X
 *   RS-Momentum = 100 + 2,5·√8·(X − EMA8(X))
 *   Un trend relativo più forte finisce più a destra; niente salti quando un vecchio
 *   dato esce da una finestra mobile.
 *
 * "classica" (quella della prima versione dell'app)
 *   rsRatio    = 100 + zscore(SMA(prezzo/benchmark, 10), 26)
 *   rsMomentum = 100 + zscore(rsRatio − rsRatio[−4], 26)
 *
 * Le stesse lunghezze (in barre) valgono per il settimanale e per il giornaliero.
 * Metriche della tabella con le convenzioni JdK: direzione in gradi bussola
 * (0° = nord, 90° = est) calcolata sull'ultimo spostamento.
 */
import { weekHasMoreSessions } from './calendar.js';

export const CENTER = 100;

// ---------- statistiche di base ----------
export function sma(arr, w) {
  const out = new Array(arr.length).fill(null);
  let sum = 0, count = 0;
  const q = [];
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    q.push(v);
    if (v != null) { sum += v; count++; }
    if (q.length > w) { const old = q.shift(); if (old != null) { sum -= old; count--; } }
    out[i] = q.length === w && count === w ? sum / w : null;
  }
  return out;
}

export function ema(arr, n) {
  const k = 2 / (n + 1);
  const out = new Array(arr.length).fill(null);
  let prev = null;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v == null) continue;
    prev = prev == null ? v : prev + k * (v - prev);
    out[i] = prev;
  }
  return out;
}

function rollingZ(arr, w) {
  const out = new Array(arr.length).fill(null);
  for (let i = w - 1; i < arr.length; i++) {
    let sum = 0, ok = true;
    for (let j = i - w + 1; j <= i; j++) { if (arr[j] == null) { ok = false; break; } sum += arr[j]; }
    if (!ok) continue;
    const mean = sum / w;
    let v = 0;
    for (let j = i - w + 1; j <= i; j++) v += (arr[j] - mean) ** 2;
    const sd = Math.sqrt(v / w);
    out[i] = sd === 0 ? 0 : (arr[i] - mean) / sd;
  }
  return out;
}

// ---------- campionamento ----------
// Ultimo giorno di contrattazione di ogni settimana (domenica–sabato)
export function weeklyIndices(dates) {
  const buckets = new Map();
  for (let i = 0; i < dates.length; i++) {
    const b = Math.floor((Date.parse(dates[i] + 'T00:00:00Z') / 86400000 + 4) / 7);
    buckets.set(b, i);
  }
  return [...buckets.values()].sort((a, b) => a - b);
}

export function sampleIndices(dates, timeframe) {
  return timeframe === 'weekly' ? weeklyIndices(dates) : dates.map((_, i) => i);
}

// ---------- formule ----------
export const FORMULAS = {
  nuova: { label: 'Nuova', defaults: { short: 10, long: 30, mom: 8, halfLife: 26, scale: 2.5 } },
  classica: { label: 'Classica', defaults: { smoothRS: 10, momWin: 4, zWin: 26 } },
};

export function rrgNew(sym, bench, p = {}) {
  const { short = 10, long = 30, mom = 8, halfLife = 26, scale = 2.5 } = p;
  const n = sym.length;
  const lr = sym.map((v, i) => (v != null && bench[i] ? Math.log(v / bench[i]) : null));
  const first = lr.findIndex((v) => v != null);
  const lam = Math.pow(0.5, 1 / halfLife);
  const sig = new Array(n).fill(null);
  let v2 = null, cnt = 0;
  for (let i = 1; i < n; i++) {
    if (lr[i] == null || lr[i - 1] == null) continue;
    const r = lr[i] - lr[i - 1];
    v2 = v2 == null ? r * r : lam * v2 + (1 - lam) * r * r;
    if (++cnt >= halfLife) sig[i] = Math.sqrt(v2);
  }
  const es = ema(lr, short), el = ema(lr, long), k = Math.sqrt((long - short) / 2);
  const X = lr.map((v, i) => (v == null || first < 0 || i < first + long || !sig[i] ? null : (es[i] - el[i]) / (sig[i] * k)));
  const eX = ema(X, mom);
  return {
    rsRatio: X.map((x) => (x == null ? null : CENTER + scale * x)),
    rsMomentum: X.map((x, i) => (x == null || eX[i] == null ? null : CENTER + scale * Math.sqrt(mom) * (x - eX[i]))),
  };
}

export function rrgClassic(sym, bench, p = {}) {
  const { smoothRS = 10, momWin = 4, zWin = 26 } = p;
  const n = sym.length;
  const rs = sym.map((v, i) => (v != null && bench[i] ? v / bench[i] : null));
  const rsRatio = rollingZ(sma(rs, smoothRS), zWin).map((z) => (z == null ? null : CENTER + z));
  const momRaw = new Array(n).fill(null);
  for (let i = momWin; i < n; i++) if (rsRatio[i] != null && rsRatio[i - momWin] != null) momRaw[i] = rsRatio[i] - rsRatio[i - momWin];
  const rsMomentum = rollingZ(momRaw, zWin).map((z) => (z == null ? null : CENTER + z));
  return { rsRatio, rsMomentum };
}

export function quadrant(x, y) {
  if (x >= CENTER) return y >= CENTER ? 'Leading' : 'Weakening';
  return y >= CENTER ? 'Improving' : 'Lagging';
}

// Metriche al punto f di una serie {x, y}
export function stats(ser, f, tail) {
  const { x, y } = ser;
  if (x[f] == null || y[f] == null) return null;
  const q = quadrant(x[f], y[f]);
  let weeks = 0, i = f;
  for (; i >= 0 && x[i] != null && quadrant(x[i], y[i]) === q; i--) weeks++;
  const prev = i >= 0 && x[i] != null ? quadrant(x[i], y[i]) : null;
  const has = f > 0 && x[f - 1] != null;
  const dx = has ? x[f] - x[f - 1] : 0, dy = has ? y[f] - y[f - 1] : 0;
  const heading = has ? ((((90 - (Math.atan2(dy, dx) * 180) / Math.PI) % 360) + 360) % 360) : null;
  let tot = 0, n = 0;
  for (let k = Math.max(1, f - tail + 2); k <= f; k++) if (x[k - 1] != null) { tot += Math.hypot(x[k] - x[k - 1], y[k] - y[k - 1]); n++; }
  return {
    q, prev, weeks, heading, dx, dy, x: x[f], y: y[f],
    speed: Math.hypot(dx, dy), avgSpeed: n ? tot / n : 0,
    dist: Math.hypot(x[f] - CENTER, y[f] - CENTER),
  };
}

/**
 * Calcola la rotazione di tutti i simboli rispetto al benchmark.
 * @param {{dates: string[], tickers: Record<string, {close: number[]}>}} dataset
 * @param {{symbols: string[], benchmark: string, timeframe: 'weekly'|'daily', formula?: 'nuova'|'classica', params?: object,
 *          weekHasMoreSessions?: (iso: string) => boolean}} cfg  calendario della borsa (default NYSE) per la settimana provvisoria
 */
export function build(dataset, cfg) {
  const { symbols, benchmark, timeframe, formula = 'nuova', params, weekHasMoreSessions: moreSessions = weekHasMoreSessions } = cfg;
  const idx = sampleIndices(dataset.dates, timeframe);
  const dates = idx.map((i) => dataset.dates[i]);
  const bench = idx.map((i) => dataset.tickers[benchmark].close[i]);
  const fn = formula === 'classica' ? rrgClassic : rrgNew;
  const series = {};
  for (const s of symbols) {
    if (!dataset.tickers[s] || s === benchmark) continue;
    const r = fn(idx.map((i) => dataset.tickers[s].close[i]), bench, params);
    // un punto esiste solo con entrambe le coordinate (con la formula classica RS-Ratio arriva prima di RS-Momentum)
    series[s] = { x: r.rsRatio.map((v, i) => (v == null || r.rsMomentum[i] == null ? null : v)), y: r.rsMomentum };
  }
  // primo punto in cui almeno metà dei simboli ha un valore: un ETF quotato da poco non accorcia
  // la storia degli altri (compare quando ha abbastanza dati)
  const syms = Object.keys(series);
  const need = Math.max(1, Math.ceil(syms.length / 2));
  const valid = (i) => syms.filter((s) => series[s].x[i] != null && series[s].y[i] != null).length;
  let start = 0;
  while (start < dates.length && valid(start) < need) start++;
  const last = dates.length - 1;
  const provisional = timeframe === 'weekly' && dates[last] === dataset.dates[dataset.dates.length - 1] && moreSessions(dates[last]);
  return { dates, series, start, provisional };
}
