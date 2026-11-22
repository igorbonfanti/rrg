/*
 * peaks.js — linea del tempo dei massimi (1.12.0, vista 0 Massimi, solo descrizione): per gli ultimi cali dell'S&P 500 di
 * almeno il 15% e per quello in corso, il giorno del massimo di ciclo di ognuno dei 9 mercati di config/ath.json rispetto
 * al massimo dell'S&P 500. Nessun segnale: nel backtest nessun mercato anticipa i cali in modo affidabile.
 *
 * Stesso metodo di ricerca/rotazione-bolle/script/backtest.mjs (sezione 1 di ricerca/rotazione-bolle/backtest.md):
 *  - massimo di ciclo con soglia X: una chiusura più alta di tutte quelle dei 365 giorni di calendario prima (massimo di
 *    52 settimane, con almeno 365 giorni di storia alle spalle), dopo la quale il prezzo scende di almeno X% prima di
 *    tornare sopra. Calo massimo: la chiusura più bassa dopo il massimo, fino al ritorno sopra il massimo o al massimo di
 *    ciclo successivo (se viene prima), o fino all'ultima seduta (in corso: il calo è «finora»);
 *  - finestra: ±365 giorni dal massimo P dell'S&P 500; per ogni mercato il massimo di ciclo ≥ 20% più alto nella
 *    finestra (punto pieno) e gli altri (cerchi vuoti); scarto in giorni di calendario da P; «insieme» = entro 31 giorni;
 *  - calo in corso: i massimi di ciclo ≥ 15% dell'S&P 500 non ancora recuperati, se ci sono (decisione dell'utente del
 *    22/11/2026: altrimenti, con un nuovo massimo di 52 settimane più basso, il calo grande sparirebbe, come al 31/07/2023
 *    con quello del 2022). Di solito uno; due quando un calo nuovo parte sotto un massimo più vecchio non ancora
 *    recuperato (dal 30/06/2010 al 03/11/2010: 2007 e aprile 2010; dall'08/08/2011 al 23/02/2012: 2007 e aprile 2011). Se non ce ne sono, l'ultimo massimo di 52 settimane non
 *    ancora superato. Calo fino all'ultima seduta.
 * Calcolato nel browser dalle chiusure di data/ath_history.json (dal 2000). Il test test/peaks.test.js confronta i
 * risultati, episodio per episodio, con ricerca/rotazione-bolle/risultati.json (fixture test/fixtures/peaks_20261120.json.gz).
 *
 * L'ordine tipico (ORDER) non si ricalcola: il calo del 2000 richiede chiusure del 1999, che il file dell'app non ha.
 * Sono i ranghi medi della tabella T3 della ricerca (8 cali ≥ 15% dell'S&P 500, 2000-2025), controllati dal test.
 */

const DAY = 86400000;
export const HALF = 365; // metà finestra, giorni di calendario
export const TOGETHER = 31; // «insieme»: entro 31 giorni
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
export const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
export const addDays = (d, n) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10);

/** Solo le sedute con una chiusura numerica */
export function clean(dates, close) {
  const d = [], c = [];
  const n = Math.min(dates.length, close.length);
  for (let i = 0; i < n; i++) if (close[i] != null && Number.isFinite(close[i])) { d.push(dates[i]); c.push(close[i]); }
  return { dates: d, close: c };
}

/** Primo giorno in cui un massimo di 52 settimane è valido: un anno dopo l'inizio della serie */
export const eligibleFrom = (s) => (s.dates.length ? addDays(s.dates[0], 365) : null);

// massimi di 52 settimane (indici) e, per ognuno, la prossima chiusura strettamente più alta (n se non c'è)
function highs(s) {
  const { dates, close } = s, n = close.length, el = eligibleFrom(s);
  const next = new Array(n).fill(n), st = [];
  for (let i = 0; i < n; i++) { while (st.length && close[i] > close[st.at(-1)]) next[st.pop()] = i; st.push(i); }
  const out = [], dq = [];
  let lo = 0;
  for (let i = 0; i < n; i++) {
    const tFrom = Date.parse(dates[i]) - 365 * DAY;
    while (lo < i && Date.parse(dates[lo]) < tFrom) lo++;
    while (dq.length && dq[0] < lo) dq.shift();
    const prevMax = dq.length ? close[dq[0]] : null;
    if (dates[i] >= el && prevMax != null && close[i] > prevMax) out.push(i);
    while (dq.length && close[dq.at(-1)] <= close[i]) dq.pop();
    dq.push(i);
  }
  return { idx: out, next };
}

/**
 * Massimi di ciclo con soglia X (%) su una serie {dates, close} già pulita.
 * @returns {{date: string, close: number, troughDate: string, ddPct: number, belowZero?: true, confirmDate: string, recoveryDate: string|null, ongoing?: true}[]}
 */
export function cyclePeaks(s, X, H = highs(s)) {
  const { dates, close } = s, n = close.length, raw = [];
  for (const i of H.idx) {
    const j = H.next[i];
    let iConf = -1;
    for (let k = i + 1; k < j; k++) if (close[k] <= close[i] * (1 - X / 100)) { iConf = k; break; }
    if (iConf >= 0) raw.push({ i, j, iConf });
  }
  return raw.map(({ i, j, iConf }, t) => {
    const nx = raw.find((q, u) => u > t && q.i > iConf);
    const end = Math.min(j, nx ? nx.i : n);
    let iMin = i + 1;
    for (let k = i + 1; k < end; k++) if (close[k] < close[iMin]) iMin = k;
    const p = { date: dates[i], close: close[i], troughDate: dates[iMin], ddPct: r1((close[iMin] / close[i] - 1) * 100), confirmDate: dates[iConf], recoveryDate: j < n ? dates[j] : null };
    if (close[iMin] <= 0) p.belowZero = true;
    if (end >= n) p.ongoing = true;
    return p;
  });
}

// calo in corso dalla seduta i: chiusura più bassa dopo i fino all'ultima seduta (null se i è l'ultima)
function openFrom(s, i) {
  const { dates, close } = s, n = close.length;
  let iMin = -1;
  for (let k = i + 1; k < n; k++) if (iMin < 0 || close[k] < close[iMin]) iMin = k;
  return { date: dates[i], close: close[i], troughDate: iMin < 0 ? null : dates[iMin], ddPct: iMin < 0 ? null : r1((close[iMin] / close[i] - 1) * 100), belowZero: iMin >= 0 && close[iMin] <= 0 ? true : undefined, ongoing: true };
}

/** Ultimo massimo di 52 settimane non ancora superato, con il calo fino all'ultima seduta */
export function runningPeak(s, H = highs(s)) {
  const n = s.close.length;
  for (let t = H.idx.length - 1; t >= 0; t--) if (H.next[H.idx[t]] >= n) return openFrom(s, H.idx[t]);
  return null;
}

/**
 * Massimi dei cali in corso: i massimi di ciclo ≥ X% non ancora recuperati, in ordine di data; se non ce ne sono, l'ultimo
 * massimo di 52 settimane non ancora superato. Per ognuno il calo fino all'ultima seduta.
 */
export function currentPeaks(s, X, H = highs(s), peaks = cyclePeaks(s, X, H)) {
  const open = peaks.filter((p) => p.recoveryDate == null).map((p) => openFrom(s, s.dates.indexOf(p.date)));
  if (open.length) return open;
  const r = runningPeak(s, H);
  return r ? [r] : [];
}

/**
 * Linea del tempo: gli ultimi `last` cali conclusi dell'S&P 500 ≥ anchorX% e quello in corso.
 * @param {Record<string, {dates: string[], close: number[]}>} series chiusure per mercato (id di config/ath.json)
 * @param {string[]} ids mercati nell'ordine delle righe
 * @returns {{asOf: string, episodes: object[]}|null}
 */
export function timeline(series, ids, { anchor = 'SPX', anchorX = 15, X = 20, alt = 15, last = 4 } = {}) {
  const S = {}, P = {};
  for (const id of ids) {
    const x = series[id];
    if (!x || !x.dates || !x.close) continue;
    S[id] = clean(x.dates, x.close);
    if (!S[id].dates.length) { delete S[id]; continue; }
    const H = highs(S[id]);
    P[id] = { [X]: cyclePeaks(S[id], X, H), [alt]: cyclePeaks(S[id], alt, H), H };
  }
  const A = S[anchor];
  if (!A) return null;
  const hasData = (id, P0) => !!S[id] && eligibleFrom(S[id]) <= addDays(P0, -HALF);
  const pick = (id, P0, x) => {
    if (!hasData(id, P0)) return { status: 'nodata' };
    const lo = addDays(P0, -HALF), hi = addDays(P0, HALF);
    const c = P[id][x].filter((p) => p.date >= lo && p.date <= hi);
    if (!c.length) return { status: 'none' };
    const best = c.reduce((a, b) => (b.close > a.close ? b : a));
    return { status: 'peak', date: best.date, offset: dayDiff(P0, best.date), ddPct: best.ddPct, belowZero: best.belowZero || false, troughDate: best.troughDate, ongoing: best.ongoing || false,
      others: c.filter((p) => p !== best).map((p) => ({ date: p.date, offset: dayDiff(P0, p.date), ddPct: p.ddPct, belowZero: p.belowZero || false, ongoing: p.ongoing || false })) };
  };
  const row = (ep, ongoing) => {
    const markets = {};
    for (const id of ids) {
      if (id === anchor) { markets[id] = { status: 'anchor', date: ep.date, offset: 0, ddPct: ep.ddPct, belowZero: ep.belowZero || false, ongoing }; continue; }
      const m = pick(id, ep.date, X);
      if (m.status === 'none') { const m2 = pick(id, ep.date, alt); if (m2.status === 'peak') m.alt = { X: alt, date: m2.date, offset: m2.offset, ddPct: m2.ddPct }; }
      markets[id] = m;
    }
    return { peak: ep.date, ddPct: ep.ddPct, troughDate: ep.troughDate, ongoing, markets };
  };
  const HA = P[anchor] ? P[anchor].H : highs(A), PA = cyclePeaks(A, anchorX, HA);
  // conclusi: solo i cali recuperati (un calo non recuperato è quello in corso)
  const done = PA.filter((p) => p.recoveryDate != null).slice(-last);
  const episodes = done.map((ep) => row(ep, false));
  for (const cur of currentPeaks(A, anchorX, HA, PA)) episodes.push(row(cur, true));
  return { asOf: A.dates.at(-1), episodes };
}

/** Rango normalizzato (0 = primo, 1 = ultimo; a parità rango medio) dei mercati con un massimo in un episodio */
export function ranks(ep) {
  const pts = Object.entries(ep.markets).filter(([, v]) => v.offset != null).map(([id, v]) => ({ id, o: v.offset })).sort((a, b) => a.o - b.o);
  const k = pts.length, out = {};
  for (let i = 0; i < k;) {
    let j = i;
    while (j + 1 < k && pts[j + 1].o === pts[i].o) j++;
    const rank = (i + j) / 2 + 1;
    for (let t = i; t <= j; t++) out[pts[t].id] = k > 1 ? Math.round(((rank - 1) / (k - 1)) * 10000) / 10000 : null;
    i = j + 1;
  }
  return out;
}

/**
 * Ordine tipico: rango medio (0 = primo, 1 = ultimo) negli 8 cali ≥ 15% dell'S&P 500 dal 2000 al 2025, dalla tabella T3
 * di ricerca/rotazione-bolle/backtest.md (risultati.json, order.SPX15): cali con un massimo del mercato nella
 * finestra (withPeak), senza un calo ≥ 20% (none), con la serie troppo corta (nodata); prima, insieme (±31 giorni), dopo;
 * scarto mediano in giorni (medianOffset). Stessi nomi di risultati.json.
 */
export const ORDER = {
  episodes: 8, from: 2000, to: 2025,
  markets: {
    BTC: { meanRankNorm: 0.4494, withPeak: 4, none: 0, nodata: 4, before: 2, together: 0, after: 2, medianOffset: 86.5 },
    GOLD: { meanRankNorm: 0.8637, withPeak: 5, none: 2, nodata: 1, before: 0, together: 0, after: 5, medianOffset: 161 },
    SILVER: { meanRankNorm: 0.5612, withPeak: 7, none: 0, nodata: 1, before: 2, together: 1, after: 4, medianOffset: 148 },
    COPPER: { meanRankNorm: 0.5595, withPeak: 6, none: 1, nodata: 1, before: 2, together: 0, after: 4, medianOffset: 107 },
    WTI: { meanRankNorm: 0.7089, withPeak: 5, none: 2, nodata: 1, before: 0, together: 3, after: 2, medianOffset: 13 },
    NDX: { meanRankNorm: 0.499, withPeak: 6, none: 2, nodata: 0, before: 1, together: 5, after: 0, medianOffset: 0 },
    SPX: { meanRankNorm: 0.4591, withPeak: 8, none: 0, nodata: 0, before: 0, together: 8, after: 0, medianOffset: 0 },
    SOXX: { meanRankNorm: 0.3265, withPeak: 7, none: 0, nodata: 1, before: 4, together: 2, after: 1, medianOffset: -71 },
    KOSPI: { meanRankNorm: 0.2287, withPeak: 7, none: 1, nodata: 0, before: 4, together: 3, after: 0, medianOffset: -80 },
  },
};
