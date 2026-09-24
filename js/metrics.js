/*
 * metrics.js — metriche di prezzo per il Monitor: variazioni, drawdown dal massimo
 * a 52 settimane (252 sedute) e sua profondità rispetto alla storia disponibile.
 */

// Drawdown % dal massimo delle ultime `win` sedute (deque monotona, O(n))
export function drawdown(close, win = 252) {
  const n = close.length, dd = new Array(n).fill(null), q = [];
  for (let i = 0; i < n; i++) {
    if (close[i] == null) continue;
    while (q.length && close[q[q.length - 1]] <= close[i]) q.pop();
    q.push(i);
    while (q[0] <= i - win) q.shift();
    dd[i] = (close[i] / close[q[0]] - 1) * 100;
  }
  return dd;
}

// Profondità del drawdown in percentile: % di sedute precedenti con drawdown meno profondo.
// Solo storia passata (niente sguardo al futuro); null finché non ci sono `minHistory` sedute.
export function depthPercentile(dd, minHistory = 252) {
  const n = dd.length, out = new Array(n).fill(null);
  const BINS = 1001, fw = new Int32Array(BINS + 1);
  let tot = 0;
  for (let i = 0; i < n; i++) {
    if (dd[i] == null) continue;
    const b = Math.min(1000, Math.max(0, Math.round(-dd[i] * 10)));
    if (tot >= minHistory) { let s = 0; for (let x = b; x > 0; x -= x & -x) s += fw[x]; out[i] = Math.round((100 * s) / tot); }
    for (let x = b + 1; x <= BINS; x += x & -x) fw[x]++;
    tot++;
  }
  return out;
}

export function smaLast(close, w) {
  const n = close.length;
  if (n < w) return null;
  let s = 0;
  for (let i = n - w; i < n; i++) { if (close[i] == null) return null; s += close[i]; }
  return s / w;
}

// Metriche all'ultima data disponibile
export function priceMetrics(dates, close) {
  const L = close.length - 1;
  const ch = (k) => (L - k >= 0 && close[L - k] ? (close[L] / close[L - k] - 1) * 100 : null);
  const y0 = dates.findIndex((d) => d >= dates[L].slice(0, 4) + '-01-01') - 1;
  const dd = drawdown(close);
  const dp = depthPercentile(dd);
  let hi = L;
  for (let j = Math.max(0, L - 251); j <= L; j++) if (close[j] != null && close[j] >= close[hi]) hi = j;
  let worst = 0;
  for (const v of dd) if (v != null) worst = Math.min(worst, v);
  const m200 = smaLast(close, 200);
  return {
    last: close[L], d1: ch(1), w1: ch(5), m1: ch(21), m3: ch(63),
    ytd: y0 >= 0 && close[y0] ? (close[L] / close[y0] - 1) * 100 : null,
    dd52: dd[L], ddDepth: dp[L], ddWorst: worst, daysFromHigh: L - hi,
    vs200: m200 ? (close[L] / m200 - 1) * 100 : null,
  };
}
