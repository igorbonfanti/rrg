/*
 * ath.js — distanza dal massimo dell'ultimo ciclo (1.10.0, vista 8 VIX, solo contesto): per ogni mercato dell'elenco in
 * config/ath.json quanto l'ultima chiusura è sotto il massimo di chiusura degli ultimi 3 anni, con la data del massimo,
 * i giorni passati, il calo più profondo dopo il massimo e la risalita da lì; nel dettaglio anche il massimo di sempre.
 *
 * Riferimento: il massimo degli ultimi 3 anni, non quello di sempre (scelta dell'utente del 12/11/2026: «il riferimento
 * deve essere il massimo dell'ultima bull run»; il petrolio ha il massimo di sempre nel 2008). Confronto con la regola
 * del 20% e con le 52 settimane in ricerca/bolle-rotazione/riferimento/confronto.mjs.
 * Calcolato ogni notte da scripts/fetch_ath.js su tutta la storia di Yahoo (data/ath.json); il browser mostra i valori
 * del file e non ricalcola. Idea da una slide di Francesco Caruso (Cicli&Mercati): «le bolle si sgonfiano a rotazione».
 * Metodo, scelte delle serie e confronto con seconde fonti: ricerca/bolle-rotazione/sintesi.md (ramo di sviluppo).
 */

const DAY = 86400000;
export const YEARS = 3;
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const pctOf = (v, ref) => r2((v / ref - 1) * 100);

/** Primo giorno della finestra: la stessa data di `years` anni prima dell'ultima seduta (dal 29/02 si va al 28/02) */
export function windowStart(lastDate, years = YEARS) {
  const [y, m, d] = lastDate.split('-').map(Number);
  const t = new Date(Date.UTC(y - years, m - 1, d));
  if (t.getUTCMonth() !== m - 1) t.setUTCDate(0); // 29/02 di un anno non bisestile
  return t.toISOString().slice(0, 10);
}

/**
 * Statistiche del massimo di chiusura su una serie giornaliera.
 * - Riferimento: il massimo di chiusura dalle sedute da windowStart(ultima seduta) in poi (3 anni); parità: prima data.
 * - Nuovo massimo all'ultima seduta: distanza 0, 0 giorni, nessun calo dopo il massimo (cycleLow null).
 * - Una chiusura ≤ 0 dopo il massimo: calo massimo e risalita non si calcolano (null), la data va in belowZero.
 * - Massimo di sempre (dall'inizio della serie) e massimo durante la seduta nella finestra: solo informativi.
 * @param {string[]} dates date ISO crescenti
 * @param {number[]} close chiusure (solo prezzo)
 * @param {number[]} [high] massimi della seduta
 * @param {number} [years] anni della finestra
 */
export function athStats(dates, close, high, years = YEARS) {
  const n = Math.min(dates.length, close.length);
  if (!n) return null;
  let iLast = n - 1;
  while (iLast >= 0 && close[iLast] == null) iLast--;
  if (iLast < 0) return null;
  const from = windowStart(dates[iLast], years);
  let iAll = -1, iRef = -1;
  for (let i = 0; i <= iLast; i++) {
    const c = close[i];
    if (c == null) continue;
    if (iAll < 0 || c > close[iAll]) iAll = i;
    if (dates[i] >= from && (iRef < 0 || c > close[iRef])) iRef = i;
  }
  const ref = close[iRef], last = close[iLast];
  // minimo di chiusura dopo il massimo di riferimento (escluso il giorno del massimo)
  let iLow = -1, below = null;
  for (let i = iRef + 1; i <= iLast; i++) {
    const c = close[i];
    if (c == null) continue;
    if (c <= 0 && below == null) below = dates[i];
    if (iLow < 0 || c < close[iLow]) iLow = i;
  }
  const lowOk = iLow >= 0 && below == null;
  // massimo durante la seduta nella finestra (parità: prima data)
  const hv = (i) => (close[i] == null ? null : high && high[i] != null ? high[i] : close[i]); // solo sedute con la chiusura
  let iHi = -1;
  for (let i = 0; i <= iLast; i++) if (dates[i] >= from && hv(i) != null && (iHi < 0 || hv(i) > hv(iHi))) iHi = i;
  return {
    start: dates[close.findIndex((c) => c != null)], from, last: r4(last), lastDate: dates[iLast],
    ref: r4(ref), refDate: dates[iRef], distPct: pctOf(last, ref), days: daysBetween(dates[iRef], dates[iLast]),
    cycleLow: lowOk ? r4(close[iLow]) : null, cycleLowDate: lowOk ? dates[iLow] : null, cycleLowPct: lowOk ? pctOf(close[iLow], ref) : null,
    fromLowPct: lowOk ? pctOf(last, close[iLow]) : null, belowZero: below,
    intradayRef: r4(hv(iHi)), intradayRefDate: dates[iHi],
    ath: r4(close[iAll]), athDate: dates[iAll], athDistPct: pctOf(last, close[iAll]),
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
  const key = mode === 'date' ? (r) => r.m.stats.refDate : (r) => r.m.stats.distPct;
  return rows.sort((a, b) => {
    if (!a.m.stats || !b.m.stats) return (a.m.stats ? 0 : 1) - (b.m.stats ? 0 : 1) || a.k - b.k;
    const x = key(a), y = key(b);
    return (x < y ? -1 : x > y ? 1 : 0) || a.k - b.k;
  }).map((r) => r.m);
}
