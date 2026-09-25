/*
 * signals.js — breadth, drawdown e macchina a stati per i possibili bottom settoriali.
 * Modulo condiviso: lo usano l'app nel browser e la GitHub Action che invia gli alert.
 *
 * Stati: NORMALE → ATTENZIONE → ZONA BLU → TRIGGER → (FALLITO) → COOLDOWN
 *  - Attenzione: breadth entro `watchBand` punti dal livello blu, oppure drawdown più
 *    profondo del `ddWatch`° percentile della storia del settore.
 *  - Zona blu: breadth (% titoli sopra la media 200) ≤ livello blu per `setupCloses`
 *    chiusure consecutive e drawdown oltre il `ddSetup`° percentile.
 *  - Trigger: la breadth risale di almeno max(`minRecoveryPoints`, `minRecoveryStocks` titoli)
 *    sopra il livello e sopra il minimo, con almeno una conferma (due se la zona blu dura
 *    da più di `slowSetupSessions` sedute o dopo un segnale fallito):
 *      spinta di breadth (a 20g da ≤15% a ≥70% in 15 sedute, o a 50g da ≤10% a ≥50% in 20),
 *      prezzo sopra una media 20g crescente, divergenza (prezzo più basso, breadth più alta),
 *      oppure la breadth torna sopra il livello di riarmo (rimbalzo a V).
 *  - Fallito: entro `failWindow` sedute dal trigger il prezzo chiude sotto il minimo della
 *    zona blu meno un'escursione media giornaliera: si torna in zona blu, con regole più severe.
 *  - Cooldown: per `cooldown` sedute dal trigger nessun nuovo segnale; una nuova zona blu
 *    richiede prima che la breadth torni sopra max(`resetFloor`, livello + `resetAbove`).
 */
import { drawdown, depthPercentile } from './metrics.js';

export const DEFAULT_PARAMS = {
  watchBand: 10, ddSetup: 70, ddWatch: 85, setupCloses: 2, minRecoveryPoints: 5, minRecoveryStocks: 2,
  slowSetupSessions: 60, failWindow: 20, cooldown: 63, resetFloor: 40, resetAbove: 25,
};
export const STATES = {
  normal: 'Normale', watch: 'Attenzione', setup: 'Zona blu', trig: 'Trigger', fail: 'Fallito', cool: 'Cooldown',
};
export const SECTOR_KEYS = ['XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU'];

// Serie run-length [[inizio, valore], ...] → array di lunghezza n
export function expandRLE(rle, n) {
  const out = new Array(n).fill(null);
  for (let k = 0; k < rle.length; k++) {
    const [i0, v] = rle[k], i1 = k + 1 < rle.length ? rle[k + 1][0] : n;
    for (let i = i0; i < i1 && i < n; i++) out[i] = v;
  }
  return out;
}
export function encodeRLE(arr) {
  const out = [];
  let last;
  arr.forEach((v, i) => { if (i === 0 || v !== last) { out.push([i, v]); last = v; } });
  return out;
}

/**
 * Serie di breadth di un indice/settore allineate alle date di `sectors.json`.
 * @returns {{pct200: (number|null)[], pct50: (number|null)[], pct20: (number|null)[], n: (number|null)[], members: (number|null)[], above200: (number|null)[]}}
 */
export function breadthSeries(breadth, key, dates) {
  const s = breadth.series[key];
  const len = breadth.dates.length;
  const n = expandRLE(s.n, len), members = expandRLE(s.members, len);
  const out = { pct200: [], pct50: [], pct20: [], n: [], members: [], above200: [] };
  for (const k of Object.keys(out)) out[k] = new Array(dates.length).fill(null);
  const pos = new Map(dates.map((d, i) => [d, i]));
  for (let i = 0; i < len; i++) {
    const j = pos.get(breadth.dates[i]), d = n[i];
    if (j == null) continue;
    out.n[j] = d; out.members[j] = members[i]; out.above200[j] = s.a200[i];
    if (d) { out.pct200[j] = (100 * s.a200[i]) / d; out.pct50[j] = (100 * s.a50[i]) / d; out.pct20[j] = (100 * s.a20[i]) / d; }
  }
  return out;
}

// Serie di prezzo derivate: drawdown dal massimo a 52 settimane e sua profondità storica
export function priceSeries(close) {
  const dd = drawdown(close);
  return { close, dd, dp: depthPercentile(dd) };
}

function sma(c, t, w) {
  if (t < w - 1) return null;
  let s = 0;
  for (let i = t - w + 1; i <= t; i++) { if (c[i] == null) return null; s += c[i]; }
  return s / w;
}
function avgRange(c, t, w = 20) {
  let s = 0, m = 0;
  for (let i = Math.max(1, t - w + 1); i <= t; i++) if (c[i] != null && c[i - 1] != null) { s += Math.abs(c[i] - c[i - 1]); m++; }
  return m ? s / m : 0;
}
const minOver = (a, t, w) => { let m = Infinity; for (let i = Math.max(0, t - w + 1); i <= t; i++) if (a[i] != null) m = Math.min(m, a[i]); return m; };

/**
 * Esegue la macchina a stati su tutta la storia.
 * @param {{close: number[], dd: number[], dp: number[]}} px serie di prezzo (priceSeries)
 * @param {{pct200: number[], pct50: number[], pct20: number[], n: number[]}} br serie di breadth (breadthSeries)
 * @param {number} L livello blu
 * @param {Partial<typeof DEFAULT_PARAMS>} [params]
 * @returns {{days: (string|null)[], events: {t: number, code: string, text: string, setup?: object}[], setups: object[],
 *           below: number, armed: boolean, reset: number}}  below, armed e reset valgono all'ultima seduta calcolata:
 *           chiusure consecutive ≤ livello blu, riarmo avvenuto, livello di riarmo
 */
export function runMachine(px, br, L, params = {}) {
  const P = { ...DEFAULT_PARAMS, ...params };
  const { close: c, dd, dp } = px, H = br.pct200;
  const n = c.length, days = new Array(n).fill(null), events = [], setups = [];
  let st = 'normal', armed = true, setup = null, trig = null, below = 0, lastReset = Math.max(P.resetFloor, L + P.resetAbove);
  const f1 = (v) => (v < 0 && v.toFixed(1) !== '-0.0' ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',');
  for (let t = 0; t < n; t++) {
    const b = H[t];
    if (b == null || c[t] == null || dp[t] == null || !br.n[t]) { days[t] = null; continue; }
    const stock = 100 / br.n[t];
    const h = Math.max(P.minRecoveryPoints, P.minRecoveryStocks * stock);
    const reset = Math.max(P.resetFloor, L + P.resetAbove);
    lastReset = reset;
    below = b <= L ? below + 1 : 0;
    if (!armed && b >= reset) armed = true;

    if (st === 'trig' || st === 'cool') {
      const since = t - trig.t;
      if (since <= P.failWindow && c[t] < setup.pmin - avgRange(c, t)) {
        events.push({ t, code: 'fail', text: 'il prezzo chiude sotto il minimo della zona blu: segnale fallito, si torna in zona blu con regole più severe', setup });
        setup.fails++; setup.trig = null; setup.strict = true; trig = null; st = 'setup';
        days[t] = 'fail';
        continue;
      }
      if (since >= P.cooldown) st = 'normal';
      else if (since > P.failWindow) st = 'cool';
    }

    if (st === 'setup') {
      if (b < setup.bmin) { setup.bmin = b; setup.tb = t; }
      if (c[t] < setup.pmin) { setup.pmin = c[t]; setup.tp = t; }
      const conf = [];
      if (br.pct20[t] != null && br.pct20[t] >= 70 && minOver(br.pct20, t, 15) <= 15) conf.push('spinta di breadth a 20 giorni');
      else if (br.pct50[t] != null && br.pct50[t] >= 50 && minOver(br.pct50, t, 20) <= 10) conf.push('spinta di breadth a 50 giorni');
      const m20 = sma(c, t, 20), m20p = sma(c, t - 5, 20);
      if (m20 != null && m20p != null && c[t] > m20 && m20 > m20p) conf.push('prezzo sopra la media 20g crescente');
      if (setup.tp > setup.tb + 5 && H[setup.tp] != null && H[setup.tp] >= setup.bmin + stock) conf.push('divergenza prezzo/breadth');
      const vShape = b >= reset;
      if (vShape) conf.push(`breadth oltre ${Math.round(reset)}%`);
      const need = setup.strict || t - setup.t > P.slowSetupSessions ? 2 : 1;
      if (b >= Math.max(L + h, setup.bmin + P.minRecoveryStocks * stock) && (conf.length >= need || vShape)) {
        st = 'trig'; armed = false; trig = { t, conf };
        setup.trig = trig;
        events.push({ t, code: 'trig', text: `breadth risale a ${f1(b)}% · ${conf.join(' + ')}`, setup });
      }
    }

    if (st === 'normal' || st === 'watch') {
      if (armed && below >= P.setupCloses && dp[t] >= P.ddSetup) {
        st = 'setup';
        setup = { t, bmin: b, tb: t, pmin: c[t], tp: t, dd: dd[t], dp: dp[t], strict: false, fails: 0, trig: null };
        setups.push(setup);
        events.push({ t, code: 'setup', text: `breadth ${f1(b)}% ≤ livello blu ${L}% · drawdown ${f1(dd[t])}% (${dp[t]}° percentile)`, setup });
      } else {
        st = b <= L + P.watchBand || dp[t] >= P.ddWatch ? 'watch' : 'normal';
      }
    }
    days[t] = st;
  }
  return { days, events, setups, below, armed, reset: lastReset };
}

// Rendimento % da t a t+k sedute (null se il futuro non è ancora disponibile)
export function forward(close, t, k) {
  return t != null && t + k < close.length && close[t] && close[t + k] != null ? (close[t + k] / close[t] - 1) * 100 : null;
}
// Peggior calo % entro k sedute da t
export function worstWithin(close, t, k) {
  if (t == null) return null;
  let m = close[t];
  for (let i = t; i <= Math.min(close.length - 1, t + k); i++) if (close[i] != null) m = Math.min(m, close[i]);
  return (m / close[t] - 1) * 100;
}
