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
 *  - Fallito: il prezzo chiude sotto il minimo della zona blu meno un'escursione media giornaliera
 *    entro `failWindow` sedute dal trigger, oppure più tardi, finché la breadth non è tornata al
 *    livello di riarmo, con la breadth di nuovo sotto il livello blu: si torna in zona blu, con
 *    regole più severe. Senza il controllo tardivo, nei mercati orso lunghi un rimbalzo fallito
 *    nasconderebbe le capitolazioni successive (ottobre 2008 – marzo 2009, fine 2002).
 *  - Cooldown: dopo le prime `failWindow` sedute dal trigger, fino a `cooldown` sedute nessun nuovo
 *    segnale; una nuova zona blu richiede prima che la breadth torni sopra max(`resetFloor`,
 *    livello + `resetAbove`).
 * La macchina restituisce anche, per le sedute con la breadth sotto il livello blu fuori dalla zona
 * blu, il motivo (`off`): 'cool' dopo un trigger, 'rearm' in attesa del riarmo, 'closes' prima
 * chiusura sotto il livello, 'dd' drawdown non abbastanza profondo.
 */
import { drawdown, depthPercentile } from './metrics.js';

export const DEFAULT_PARAMS = {
  watchBand: 10, ddSetup: 70, ddWatch: 85, setupCloses: 2, minRecoveryPoints: 5, minRecoveryStocks: 2,
  slowSetupSessions: 60, failWindow: 20, cooldown: 63, resetFloor: 40, resetAbove: 25,
};
export const STATES = {
  normal: 'Normale', watch: 'Attenzione', setup: 'Zona blu', trig: 'Trigger', fail: 'Fallito', cool: 'Cooldown',
};
// Perché una seduta con la breadth sotto il livello blu non è in zona blu (runMachine().off)
export const offReasons = (P = DEFAULT_PARAMS) => ({
  cool: 'zona blu sospesa: siamo nelle sedute dopo un trigger',
  rearm: `zona blu sospesa: dopo l'ultimo trigger la breadth non è ancora tornata sopra il livello di riarmo (almeno ${P.resetFloor}%)`,
  closes: `prima chiusura sotto il livello: per la zona blu ne servono ${P.setupCloses}`,
  dd: `drawdown non abbastanza profondo: per la zona blu serve oltre il ${P.ddSetup}° percentile`,
});
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

/**
 * Soglia di avvicinamento al livello blu: livello + il calo forte della breadth in `h` sedute (quantile `q` dei
 * cali di tutta la storia del settore). Da qui, in un calo deciso, il livello blu è a circa due settimane.
 * Calibrata nel campione sui settori dal 2005 (ricerca/attenzione/fasce.md): anticipo mediano circa un mese, avvisati 59 tocchi
 * del livello su 73, ma meno della metà degli avvicinamenti arriva davvero al livello. Serve per la watchlist,
 * non cambia gli stati né gli alert.
 */
export function approachLevel(b, L, h = 10, q = 0.9) {
  const d = [];
  for (let t = h; t < b.length; t++) if (b[t] != null && b[t - h] != null && b[t] < b[t - h]) d.push(b[t - h] - b[t]);
  if (!d.length) return null;
  d.sort((x, y) => x - y);
  return L + d[Math.floor(q * (d.length - 1))];
}

/**
 * Soglia di avvicinamento seduta per seduta, ognuna con la sola storia fino a quella seduta (nessun dato del futuro):
 * out[t] === approachLevel(b.slice(0, t + 1), L, h, q). Tiene i cali ordinati man mano, così la serie intera costa poco.
 */
export function approachSeries(b, L, h = 10, q = 0.9) {
  const out = new Array(b.length).fill(null), d = [];
  for (let t = 0; t < b.length; t++) {
    if (t >= h && b[t] != null && b[t - h] != null && b[t] < b[t - h]) {
      const v = b[t - h] - b[t];
      let lo = 0, hi = d.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (d[mid] <= v) lo = mid + 1; else hi = mid; }
      d.splice(lo, 0, v);
    }
    if (d.length) out[t] = L + d[Math.floor(q * (d.length - 1))];
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

// Conferme del trigger alla seduta t, le stesse per la macchina e per la spiegazione dello stato
function confirmationsAt(c, br, t, setup, stock, reset) {
  const H = br.pct200;
  const thrust20 = br.pct20[t] != null && br.pct20[t] >= 70 && minOver(br.pct20, t, 15) <= 15;
  const thrust50 = !thrust20 && br.pct50[t] != null && br.pct50[t] >= 50 && minOver(br.pct50, t, 20) <= 10;
  const m20 = sma(c, t, 20), m20p = sma(c, t - 5, 20);
  return {
    thrust20, thrust50, m20, m20p,
    ma: m20 != null && m20p != null && c[t] > m20 && m20 > m20p,
    div: setup.tp > setup.tb + 5 && H[setup.tp] != null && H[setup.tp] >= setup.bmin + stock,
    v: H[t] >= reset,
  };
}

/**
 * Esegue la macchina a stati su tutta la storia.
 * @param {{close: number[], dd: number[], dp: number[]}} px serie di prezzo (priceSeries)
 * @param {{pct200: number[], pct50: number[], pct20: number[], n: number[]}} br serie di breadth (breadthSeries)
 * @param {number} L livello blu
 * @param {Partial<typeof DEFAULT_PARAMS>} [params]
 * @returns {{days: (string|null)[], off: (string|null)[], events: {t: number, code: string, text: string, setup?: object}[], setups: object[],
 *           below: number, armed: boolean, reset: number}}  below, armed e reset valgono all'ultima seduta calcolata:
 *           chiusure consecutive ≤ livello blu, riarmo avvenuto, livello di riarmo
 */
export function runMachine(px, br, L, params = {}) {
  const P = { ...DEFAULT_PARAMS, ...params };
  const { close: c, dd, dp } = px, H = br.pct200;
  const n = c.length, days = new Array(n).fill(null), off = new Array(n).fill(null), events = [], setups = [];
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

    // segnale fallito: prezzo sotto il minimo della zona blu dopo il trigger, finché non c'è il riarmo;
    // passate le prime `failWindow` sedute serve anche la breadth di nuovo sotto il livello blu
    if (trig && (st === 'trig' || st === 'cool' || !armed)) {
      if (c[t] < setup.pmin - avgRange(c, t) && (t - trig.t <= P.failWindow || b <= L)) {
        events.push({ t, code: 'fail', text: 'il prezzo chiude sotto il minimo della zona blu meno un\'escursione media: segnale fallito, si torna in zona blu con regole più severe', setup });
        setup.fails++; setup.trig = null; setup.strict = true; trig = null; st = 'setup';
        // il fallimento avviene su un nuovo minimo: conta per la soglia del fallimento successivo e per la divergenza
        if (c[t] < setup.pmin) { setup.pmin = c[t]; setup.tp = t; }
        if (b < setup.bmin) { setup.bmin = b; setup.tb = t; }
        days[t] = 'fail';
        continue;
      }
    }
    if (st === 'trig' || st === 'cool') {
      const since = t - trig.t;
      if (since >= P.cooldown) st = 'normal';
      else if (since > P.failWindow) st = 'cool';
    }

    if (st === 'setup') {
      if (b < setup.bmin) { setup.bmin = b; setup.tb = t; }
      if (c[t] < setup.pmin) { setup.pmin = c[t]; setup.tp = t; }
      const k = confirmationsAt(c, br, t, setup, stock, reset), conf = [];
      if (k.thrust20) conf.push('spinta di breadth a 20 giorni');
      else if (k.thrust50) conf.push('spinta di breadth a 50 giorni');
      if (k.ma) conf.push('prezzo sopra la media 20g crescente');
      if (k.div) conf.push('divergenza prezzo/breadth');
      const vShape = k.v;
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
    // breadth sotto il livello blu ma fuori dalla zona blu: perché
    if (b <= L && st !== 'setup') off[t] = st === 'trig' || st === 'cool' ? 'cool' : !armed ? 'rearm' : below < P.setupCloses ? 'closes' : 'dd';
  }
  return { days, off, events, setups, below, armed, reset: lastReset };
}

// Rendimento % da t a t+k sedute (null se il futuro non è ancora disponibile)
/** Mediana dei valori non nulli; con un numero pari di valori, la media dei due centrali (come numpy e i fogli di calcolo). */
export function median(a) {
  const v = a.filter((x) => x != null && !Number.isNaN(x)).sort((x, y) => x - y), m = v.length >> 1;
  if (!v.length) return null;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
export function forward(close, t, k) {
  return t != null && t + k < close.length && close[t] && close[t + k] != null ? (close[t + k] / close[t] - 1) * 100 : null;
}
/**
 * Termine di paragone per gli episodi: rendimenti dopo i trigger e dall'ingresso in zona blu, contro una seduta qualsiasi
 * della stessa storia e, se c'è, contro un benchmark negli stessi giorni dei trigger. Mediane per ogni orizzonte e
 * quante volte positivo all'orizzonte `key` (per «meno il benchmark»: quante volte meglio del benchmark).
 * @param {(number|null)[]} close prezzi
 * @param {{trig: number[], setup: number[]}} at sedute dei trigger e degli ingressi in zona blu
 * @param {number} from prima seduta della storia (la breadth comincia lì)
 * @param {number[]} horizons orizzonti in sedute, es. [21, 63, 126]
 * @param {(number|null)[]|null} [bench] prezzi del benchmark sulle stesse date
 * @returns {{key: string, n: number, med: (number|null)[], pos: [number, number]}[]}
 */
export function signalContext(close, at, from, horizons, bench = null, key = 1) {
  const med = median;
  const row = (k, days, f) => {
    const vals = horizons.map((h) => days.map((t) => f(t, h)));
    const at2 = vals[Math.min(key, horizons.length - 1)].filter((x) => x != null);
    const n = days.reduce((c, _, j) => c + (vals.some((v) => v[j] != null) ? 1 : 0), 0);
    return { key: k, n, med: vals.map(med), pos: [at2.filter((x) => x > 0).length, at2.length] };
  };
  const ret = (t, h) => forward(close, t, h);
  const all = [];
  for (let t = Math.max(0, from); t < close.length; t++) if (close[t] != null) all.push(t);
  const rows = [row('trig', at.trig, ret), row('setup', at.setup, ret), row('any', all, ret)];
  if (bench) {
    rows.push(row('bench', at.trig, (t, h) => forward(bench, t, h)));
    rows.push(row('excess', at.trig, (t, h) => { const a = ret(t, h), b = forward(bench, t, h); return a == null || b == null ? null : a - b; }));
  }
  return rows;
}

// Peggior calo % entro k sedute da t
export function worstWithin(close, t, k) {
  if (t == null) return null;
  let m = close[t];
  for (let i = t; i <= Math.min(close.length - 1, t + k); i++) if (close[i] != null) m = Math.min(m, close[i]);
  return (m / close[t] - 1) * 100;
}

// ---------- perché questo stato e cosa manca ----------
const f1 = (v) => (v < 0 && v.toFixed(1) !== '-0.0' ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',');
const f0 = (v) => String(Math.round(v));
const titoli = (k) => (k === 1 ? '1 titolo' : `${k} titoli`);
const sedute = (k) => (k === 1 ? '1 seduta' : `${k} sedute`);
const dIt = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// data di calendario circa k sedute dopo `iso` (solo i fine settimana, senza le feste: è un'indicazione)
export function sessionsAfter(iso, k) {
  const d = new Date(iso + 'T12:00:00Z');
  for (let i = 0; i < k;) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() % 6) i++; }
  return d.toISOString().slice(0, 10);
}

/**
 * Le condizioni della macchina a stati all'ultima seduta calcolata `t`, per spiegare lo stato e cosa manca al prossimo.
 * Usa le stesse regole e le stesse soglie di runMachine (m = suo risultato con gli stessi dati).
 * @returns {{code: string, goal: string, why: string, items: {ok: boolean|null, text: string, miss?: string}[], summary: string}}
 *   items: ok = condizione soddisfatta, false = manca, null = informazione; summary: cosa manca in breve
 */
export function explainState(px, br, L, params, m, dates, t) {
  const P = { ...DEFAULT_PARAMS, ...params };
  const c = px.close, b = br.pct200[t], dp = px.dp[t], n = br.n[t];
  const code = m.days[t] || 'normal', stock = 100 / n;
  const reset = Math.max(P.resetFloor, L + P.resetAbove);
  // titoli che devono passare sotto (o sopra) la media 200 perché la breadth arrivi al valore v
  const toBelow = (v) => Math.max(1, Math.ceil((b - v) / stock - 1e-9));
  const toAbove = (v) => Math.max(1, Math.ceil((v - b) / stock - 1e-9));
  const items = [];
  let goal, why;
  const setup = m.setups[m.setups.length - 1];
  if (code === 'normal' || code === 'watch') {
    goal = 'zona blu';
    const near = b <= L + P.watchBand, deep = dp >= P.ddWatch;
    why = code === 'normal'
      ? `Normale: breadth oltre ${P.watchBand} punti sopra il livello blu e drawdown meno profondo dell'${P.ddWatch}° percentile.`
      : `Attenzione: ${[near ? `breadth entro ${P.watchBand} punti dal livello blu` : null, deep ? `drawdown oltre l'${P.ddWatch}° percentile` : null].filter(Boolean).join(' e ')}.`;
    if (b <= L) items.push({ ok: true, text: `breadth ${f1(b)}%, al livello blu (${L}%) o sotto` });
    else items.push({ ok: false, text: `breadth ${f1(b)}%: ${f1(b - L)} punti sopra il livello blu (${L}%), cioè ${titoli(toBelow(L))} da portare sotto la media 200`, miss: `−${titoli(toBelow(L))}` });
    const k = P.setupCloses - m.below;
    items.push(k <= 0 ? { ok: true, text: `${P.setupCloses} chiusure di fila al livello o sotto` }
      : { ok: false, text: `${m.below} di ${P.setupCloses} chiusure di fila al livello o sotto`, miss: k === 1 ? '1 chiusura' : `${k} chiusure` });
    items.push(dp >= P.ddSetup ? { ok: true, text: `drawdown al ${dp}° percentile della storia, oltre il ${P.ddSetup}°` }
      : { ok: false, text: `drawdown al ${dp}° percentile: serve oltre il ${P.ddSetup}°`, miss: `drawdown oltre il ${P.ddSetup}°` });
    if (!m.armed) items.push({ ok: false, text: `riarmo: dopo l'ultimo trigger la breadth deve tornare sopra ${f0(reset)}% prima di una nuova zona blu`, miss: `riarmo sopra ${f0(reset)}%` });
  } else if (code === 'setup' || code === 'fail') {
    goal = 'trigger';
    const h = Math.max(P.minRecoveryPoints, P.minRecoveryStocks * stock);
    const thr = Math.max(L + h, setup.bmin + P.minRecoveryStocks * stock);
    const k = confirmationsAt(c, br, t, setup, stock, reset);
    const need = setup.strict || t - setup.t > P.slowSetupSessions ? 2 : 1;
    const got = [k.thrust20 || k.thrust50, k.ma, k.div].filter(Boolean).length + (k.v ? 1 : 0);
    why = `Zona blu dal ${dIt(dates[setup.t])} (${sedute(t - setup.t)}): minimo della breadth ${f1(setup.bmin)}% il ${dIt(dates[setup.tb])}, minimo del prezzo ${f1(setup.pmin)} il ${dIt(dates[setup.tp])}.`;
    items.push(b >= thr ? { ok: true, text: `breadth ${f1(b)}%, almeno ${f1(thr)}% (livello + ${f0(h)} punti e 2 titoli sopra il minimo)` }
      : { ok: false, text: `breadth ${f1(b)}%: serve almeno ${f1(thr)}%, cioè ${titoli(toAbove(thr))} in più sopra la media 200`, miss: `+${titoli(toAbove(thr))}` });
    const reason = setup.strict ? 'dopo un segnale fallito' : `zona blu da più di ${P.slowSetupSessions} sedute`;
    const confText = `conferme: ${got} su ${need} ${need === 1 ? 'richiesta' : `richieste (${reason})`}`;
    items.push(got >= need || k.v ? { ok: true, text: confText } : { ok: false, text: confText, miss: need - got === 1 ? '1 conferma' : `${need - got} conferme` });
    const p20 = br.pct20[t], p50 = br.pct50[t];
    items.push({ ok: k.thrust20 || k.thrust50, sub: true, text: k.thrust20 ? 'spinta di breadth a 20 giorni' : k.thrust50 ? 'spinta di breadth a 50 giorni'
      : `spinta di breadth: a 20 giorni da ≤15% a ≥70% in 15 sedute, o a 50 giorni da ≤10% a ≥50% in 20 (ora ${p20 == null ? '—' : f0(p20)}% e ${p50 == null ? '—' : f0(p50)}%)` });
    items.push({ ok: k.ma, sub: true, text: k.m20 == null ? 'prezzo sopra la media 20 crescente' : `prezzo sopra la media 20 crescente (prezzo ${f1(c[t])}, media ${f1(k.m20)}, ${k.m20 > k.m20p ? 'in salita' : 'in calo'})` });
    items.push({ ok: k.div, sub: true, text: 'divergenza: il prezzo fa un nuovo minimo con la breadth più alta del suo minimo' });
    items.push({ ok: k.v, sub: true, text: `rimbalzo a V: breadth sopra ${f0(reset)}%, basta da solo` });
  } else {
    goal = 'tenuta del segnale';
    const trig = setup && setup.trig, since = trig ? t - trig.t : 0;
    const stop = setup ? setup.pmin - avgRange(c, t) : null;
    why = trig ? `Trigger del ${dIt(dates[trig.t])}: ${trig.conf.join(' + ') || 'rimbalzo'}.` : 'Trigger recente.';
    if (stop != null && since <= P.failWindow) {
      const left = P.failWindow - since;
      items.push({ ok: c[t] >= stop, text: `per la regola dell'app fallisce se il prezzo chiude sotto ${f1(stop)} (minimo della zona blu ${f1(setup.pmin)} meno un'escursione media) entro ${sedute(left)}, fino a circa il ${dIt(sessionsAfter(dates[t], left))}; ora ${f1(c[t])}` });
    } else if (stop != null && !m.armed) {
      items.push({ ok: c[t] >= stop || b > L, text: `per la regola dell'app fallisce se il prezzo chiude sotto ${f1(stop)} con la breadth di nuovo sotto il livello blu (${L}%), finché la breadth non torna sopra ${f0(reset)}%` });
    }
    items.push(m.armed ? { ok: true, text: `riarmo: la breadth è tornata sopra ${f0(reset)}%` }
      : { ok: null, text: `riarmo: breadth ${f1(b)}%, deve tornare sopra ${f0(reset)}% (${titoli(toAbove(reset))}) prima di una nuova zona blu` });
    if (trig && since < P.cooldown) items.push({ ok: null, text: `nuovi segnali sospesi ancora ${sedute(P.cooldown - since)}, fino a circa il ${dIt(sessionsAfter(dates[t], P.cooldown - since))}` });
  }
  const miss = items.filter((x) => x.ok === false && x.miss).map((x) => x.miss);
  const summary = goal === 'tenuta del segnale' ? '' : miss.length ? `per ${goal === 'zona blu' ? 'la zona blu' : 'il trigger'}: ${miss.join(', ')}` : '';
  return { code, goal, why, items, summary };
}
