/*
 * ath.js — distanza dal massimo storico (1.10.0, vista 8 VIX, solo contesto): per ogni mercato dell'elenco in
 * config/ath.json quanto l'ultima chiusura è sotto il massimo di chiusura dall'inizio della serie, con la data del
 * massimo, i giorni passati, il calo più profondo dopo il massimo e la risalita da lì.
 *
 * Calcolato ogni notte da scripts/fetch_ath.js su tutta la storia di Yahoo (data/ath.json); il browser mostra i valori
 * del file e non ricalcola. Idea da una slide di Francesco Caruso (Cicli&Mercati): «le bolle si sgonfiano a rotazione».
 * Metodo, scelte delle serie e confronto con seconde fonti: ricerca/bolle-rotazione/sintesi.md (ramo di sviluppo).
 */

const DAY = 86400000;
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const pctOf = (v, ref) => r2((v / ref - 1) * 100);

/**
 * Statistiche del massimo di chiusura su una serie giornaliera.
 * - Parità con il massimo: vale la prima data (il massimo è il primo giorno che ha raggiunto quel valore).
 * - Nuovo massimo all'ultima seduta: distanza 0, 0 giorni, nessun calo dopo il massimo (cycleLow null).
 * - Una chiusura ≤ 0 dopo il massimo (petrolio WTI il 20/04/2020): calo massimo e risalita non si calcolano
 *   (null) e la data della prima chiusura ≤ 0 va in belowZero.
 * - Massimo a 52 settimane: le chiusure degli ultimi 365 giorni di calendario fino all'ultima.
 * @param {string[]} dates date ISO crescenti
 * @param {number[]} close chiusure (solo prezzo)
 * @param {number[]} [high] massimi della seduta (per il massimo durante la seduta, solo informativo)
 */
export function athStats(dates, close, high) {
  const n = Math.min(dates.length, close.length);
  if (!n) return null;
  let iAth = -1;
  for (let i = 0; i < n; i++) if (close[i] != null && (iAth < 0 || close[i] > close[iAth])) iAth = i;
  if (iAth < 0) return null;
  let iLast = n - 1;
  while (iLast > 0 && close[iLast] == null) iLast--;
  const ath = close[iAth], last = close[iLast];
  // minimo di chiusura dopo il massimo (escluso il giorno del massimo)
  let iLow = -1, below = null;
  for (let i = iAth + 1; i <= iLast; i++) {
    const c = close[i];
    if (c == null) continue;
    if (c <= 0 && below == null) below = dates[i];
    if (iLow < 0 || c < close[iLow]) iLow = i;
  }
  const lowOk = iLow >= 0 && below == null;
  // massimo durante la seduta (massimo dei massimi; parità: prima data)
  let iHi = -1;
  if (high) for (let i = 0; i < n; i++) { const h = high[i] != null ? high[i] : close[i]; if (h != null && (iHi < 0 || h > (high[iHi] != null ? high[iHi] : close[iHi]))) iHi = i; }
  const hiOf = (i) => (high[i] != null ? high[i] : close[i]);
  // massimo delle ultime 52 settimane
  const from52 = new Date(Date.parse(dates[iLast]) - 365 * DAY).toISOString().slice(0, 10);
  let i52 = -1;
  for (let i = 0; i <= iLast; i++) if (dates[i] > from52 && close[i] != null && (i52 < 0 || close[i] > close[i52])) i52 = i;
  return {
    start: dates[0], last: r4(last), lastDate: dates[iLast],
    ath: r4(ath), athDate: dates[iAth], distPct: pctOf(last, ath), days: daysBetween(dates[iAth], dates[iLast]),
    cycleLow: lowOk ? r4(close[iLow]) : null, cycleLowDate: lowOk ? dates[iLow] : null, cycleLowPct: lowOk ? pctOf(close[iLow], ath) : null,
    fromLowPct: lowOk ? pctOf(last, close[iLow]) : null, belowZero: below,
    intradayAth: iHi >= 0 ? r4(hiOf(iHi)) : null, intradayAthDate: iHi >= 0 ? dates[iHi] : null,
    max52w: i52 >= 0 ? r4(close[i52]) : null, max52wDate: i52 >= 0 ? dates[i52] : null, dist52wPct: i52 >= 0 ? pctOf(last, close[i52]) : null,
  };
}

/**
 * Righe del pannello nell'ordine scelto: «dist» dalla più lontana dal massimo alla più vicina, «date» dal massimo più
 * vecchio al più recente (l'ordine in cui si sono sgonfiati). A parità, l'ordine del file (quello di config/ath.json).
 * I mercati senza dati (stats null) vanno in fondo.
 * @param {{id: string, stats: object|null}[]} markets righe di data/ath.json
 * @param {'dist'|'date'} mode
 */
export function athRows(markets, mode) {
  const rows = (markets || []).map((m, k) => ({ m, k }));
  const key = mode === 'date' ? (r) => r.m.stats.athDate : (r) => r.m.stats.distPct;
  return rows.sort((a, b) => {
    if (!a.m.stats || !b.m.stats) return (a.m.stats ? 0 : 1) - (b.m.stats ? 0 : 1) || a.k - b.k;
    const x = key(a), y = key(b);
    return (x < y ? -1 : x > y ? 1 : 0) || a.k - b.k;
  }).map((r) => r.m);
}
