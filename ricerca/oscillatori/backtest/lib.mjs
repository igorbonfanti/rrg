/*
 * ricerca/oscillatori/backtest/lib.mjs — funzioni pure per il backtest degli oscillatori mensili (nessun DOM, nessun I/O).
 * Ogni serie è un array allineato ai mesi; null = valore non ancora calcolabile (manca storia). Un null non si riempie mai.
 *
 * Fonti delle formule:
 *  - Composite Momentum Oscillator (CMO) di Francesco Caruso (Cicli&Mercati, Market Risk Management srlu), formula
 *    ufficiale per ProRealTime pubblicata su https://www.cicliemercati.it/insights/composite-momentum-oscillator-come-funziona
 *    e nel PDF https://www.cicliemercati.it/wp-content/uploads/2021/11/CMO_Prt.pdf (trascritta in ../identificazione.md).
 *    Uso con il permesso dell'autore. Scelte di implementazione dichiarate in cmo().
 *  - Coppock curve (E. Coppock, Barron's 1962): WMA10(ROC14 + ROC11), ROC in %. https://en.wikipedia.org/wiki/Coppock_curve
 *  - KST di Martin Pring, versione lungo termine mensile: ROC 9/12/18/24, SMA 6/6/6/9, pesi 1/2/3/4, segnale SMA9.
 *    https://search.r-project.org/CRAN/refmans/TTR/html/KST.html (ROC in %, «discreto»).
 *  - MACD di Gerald Appel: EMA12 − EMA26, segnale EMA9. https://en.wikipedia.org/wiki/MACD
 */

// ---------- medie ----------
/** media ponderata lineare (peso n sull'ultimo valore, 1 sul più vecchio); null se manca un valore della finestra */
export function wma(x, n) {
  const out = new Array(x.length).fill(null), den = (n * (n + 1)) / 2;
  for (let t = n - 1; t < x.length; t++) {
    let s = 0, ok = true;
    for (let k = 0; k < n; k++) { const v = x[t - k]; if (v == null) { ok = false; break; } s += v * (n - k); }
    if (ok) out[t] = s / den;
  }
  return out;
}
/** media semplice */
export function sma(x, n) {
  const out = new Array(x.length).fill(null);
  for (let t = n - 1; t < x.length; t++) {
    let s = 0, ok = true;
    for (let k = 0; k < n; k++) { const v = x[t - k]; if (v == null) { ok = false; break; } s += v; }
    if (ok) out[t] = s / n;
  }
  return out;
}
/** somma degli ultimi n valori (summation[n] di ProRealTime) */
export function sum(x, n) {
  const a = sma(x, n);
  return a.map((v) => (v == null ? null : v * n));
}
/**
 * media esponenziale alfa = 2/(n+1). Inizializzazione: il primo valore disponibile della serie (seme = x[t0]),
 * come fa ProRealTime che parte dalla prima barra; con i dati dal 1985 il seme non pesa più dal 1993 (verificato
 * nello script con una partenza dal 1990). Un null dopo l'inizio non è previsto (le serie usate non ne hanno).
 */
export function ema(x, n) {
  const out = new Array(x.length).fill(null), a = 2 / (n + 1);
  let prev = null;
  for (let t = 0; t < x.length; t++) {
    const v = x[t];
    if (v == null) { if (prev != null) throw new Error('ema: buco nella serie'); continue; }
    prev = prev == null ? v : prev + a * (v - prev);
    out[t] = prev;
  }
  return out;
}
/** valore n periodi prima */
export const lag = (x, n = 1) => x.map((_, t) => (t >= n ? x[t - n] : null));
/** rate of change in % */
export const roc = (c, n) => c.map((v, t) => (t >= n && v != null && c[t - n] != null ? (v / c[t - n] - 1) * 100 : null));

const op = (f) => (...arrs) => arrs[0].map((_, t) => (arrs.some((a) => a[t] == null) ? null : f(...arrs.map((a) => a[t]))));

// ---------- stocastico ----------
/**
 * Stochastic[N,K] come lo usa il CMO: %K grezzo = 100·(C − minimo dei minimi N)/(massimo dei massimi N − minimo dei
 * minimi N), con massimi e minimi di ogni barra (non solo le chiusure).
 *  - mode 'sma' (principale): %K smussato con media semplice a K periodi (definizione «slow %K» classica; la pagina
 *    https://www.prorealcode.com/documentation/stochastic/ dice solo «K – The smoothing period for the %K line»).
 *  - mode 'somme' (variante): rapporto tra le somme a K periodi di (C − LL) e di (HH − LL), come Stoch(N,K) di MetaStock.
 * Se HH = LL il %K grezzo non è definito (null): con barre mensili vere non succede.
 */
export function stochastic(high, low, close, N, K, mode = 'sma') {
  const L = close.length, hh = new Array(L).fill(null), ll = new Array(L).fill(null);
  for (let t = N - 1; t < L; t++) {
    let h = -Infinity, l = Infinity;
    for (let k = 0; k < N; k++) { h = Math.max(h, high[t - k]); l = Math.min(l, low[t - k]); }
    hh[t] = h; ll[t] = l;
  }
  const num = close.map((c, t) => (hh[t] == null ? null : c - ll[t]));
  const den = close.map((c, t) => (hh[t] == null ? null : hh[t] - ll[t]));
  if (mode === 'somme') {
    const sn = sum(num, K), sd = sum(den, K);
    return sn.map((v, t) => (v == null || !sd[t] ? null : (100 * v) / sd[t]));
  }
  const raw = num.map((v, t) => (v == null || !den[t] ? null : (100 * v) / den[t]));
  return sma(raw, K);
}

// ---------- Composite Momentum Oscillator ----------
/**
 * CMO ufficiale (ProRealTime), parametro k (default 4):
 *   media1=WMA_k(C); media2=WMA_3k(C); MOM=(media1−media2)/media1·100   [average[1] = valore stesso]
 *   diffMOM=MOM−MOM[1]; temp1=diffMOM se MOM>MOM[1] altrimenti 0; temp2=diffMOM se MOM<MOM[1] altrimenti 0
 *   sumtemp1=Σ5 temp1; sumtemp2=Σ5 temp2; abssumdiff=Σ5 |diffMOM|
 *   aa=(sumtemp1[1]−sumtemp1[1]/5+temp1)/(abssumdiff[1]−abssumdiff[1]/5+|diffMOM|)·100; bb idem con sumtemp2/temp2
 *   cc=aa−|bb|; key=EMA3(cc); stoco=Stochastic[5,3]; xtl=WMA3(stoco)·2−100; CMO=WMA2((2·key+xtl)/3)
 * Restituisce anche i pezzi intermedi (per il ricalcolo indipendente).
 */
export function cmo(bars, k = 4, stochMode = 'sma') {
  const C = bars.map((b) => b.close), H = bars.map((b) => b.high), Lo = bars.map((b) => b.low);
  const m1 = wma(C, k), m2 = wma(C, 3 * k);
  const MOM = op((a, b) => ((a - b) / a) * 100)(m1, m2);
  const M1 = lag(MOM);
  const diff = op((a, b) => a - b)(MOM, M1);
  const temp1 = op((a, b, d) => (a > b ? d : 0))(MOM, M1, diff);
  const temp2 = op((a, b, d) => (a < b ? d : 0))(MOM, M1, diff);
  const absd = diff.map((v) => (v == null ? null : Math.abs(v)));
  const s1 = lag(sum(temp1, 5)), s2 = lag(sum(temp2, 5)), sa = lag(sum(absd, 5));
  const aa = op((s, tp, a, d) => ((s - s / 5 + tp) / (a - a / 5 + d)) * 100)(s1, temp1, sa, absd);
  const bb = op((s, tp, a, d) => ((s - s / 5 + tp) / (a - a / 5 + d)) * 100)(s2, temp2, sa, absd);
  const cc = op((a, b) => a - Math.abs(b))(aa, bb);
  const key = ema(cc, 3);
  const stoco = stochastic(H, Lo, C, 5, 3, stochMode);
  const xtl = wma(stoco, 3).map((v) => (v == null ? null : v * 2 - 100));
  const comp = op((a, b) => (2 * a + b) / 3)(key, xtl);
  return { cmo: wma(comp, 2), key, xtl, stoco, MOM };
}

// ---------- oscillatori pubblici ----------
export function coppock(C) { return wma(op((a, b) => a + b)(roc(C, 14), roc(C, 11)), 10); }
export function kst(C) {
  const parts = [[9, 6, 1], [12, 6, 2], [18, 6, 3], [24, 9, 4]].map(([r, n, w]) => sma(roc(C, r), n).map((v) => (v == null ? null : v * w)));
  const k = op((a, b, c, d) => a + b + c + d)(...parts);
  return { kst: k, sig: sma(k, 9) };
}
export function macd(C, f = 12, s = 26, g = 9) {
  const m = op((a, b) => a - b)(ema(C, f), ema(C, s));
  // la EMA a 26 parte dal primo mese come quella a 12: si scartano i primi s−1 mesi (riscaldamento), poi segnale EMA9
  const mm = m.map((v, t) => (t < s - 1 ? null : v));
  return { macd: mm, sig: ema(mm, g) };
}
/** PPO = MACD in % della EMA lenta (variante aggiunta: il MACD in punti cresce con il livello dell'indice) */
export function ppo(C, f = 12, s = 26, g = 9) {
  const es = ema(C, s);
  const m = op((a, b) => ((a - b) / b) * 100)(ema(C, f), es).map((v, t) => (t < s - 1 ? null : v));
  return { macd: m, sig: ema(m, g) };
}

// ---------- statistiche ----------
/** quantile tipo 7 (come quantile di js/vix.js) */
export function quantile(a, q) {
  const v = a.filter((x) => x != null).sort((x, y) => x - y);
  if (!v.length) return null;
  const h = (v.length - 1) * q, lo = Math.floor(h);
  return lo + 1 < v.length ? v[lo] + (h - lo) * (v[lo + 1] - v[lo]) : v[lo];
}
/** percentile a finestra crescente: soglia al mese t calcolata sui valori fino a t compreso; null con meno di minN valori */
export function expandingPct(x, q, minN = 60) {
  const out = new Array(x.length).fill(null), hist = [];
  for (let t = 0; t < x.length; t++) {
    if (x[t] == null) continue;
    // inserimento ordinato
    let i = hist.length; while (i > 0 && hist[i - 1] > x[t]) i--; hist.splice(i, 0, x[t]);
    if (hist.length >= minN) {
      const h = (hist.length - 1) * q, lo = Math.floor(h);
      out[t] = lo + 1 < hist.length ? hist[lo] + (h - lo) * (hist[lo + 1] - hist[lo]) : hist[lo];
    }
  }
  return out;
}
export const median = (a) => quantile(a, 0.5);
