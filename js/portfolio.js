/*
 * portfolio.js — portafoglio sintetico usato come benchmark del livello 1.
 * Indice base 100 dal primo giorno in cui tutte le componenti hanno un prezzo; i pesi si
 * riportano ai valori obiettivo alla chiusura dell'ultima seduta di ogni mese e nel
 * frattempo derivano con i prezzi. Le componenti senza dati vengono escluse e i pesi
 * delle altre riproporzionati.
 */

/**
 * @param {string[]} dates date delle sedute (ISO)
 * @param {Record<string, (number|null)[]>} closes prezzi allineati alle date
 * @param {Record<string, number>} weights pesi obiettivo (anche non normalizzati)
 * @returns {{index: (number|null)[], used: string[], missing: string[]}}
 */
export function portfolioIndex(dates, closes, weights) {
  const used = Object.keys(weights).filter((s) => closes[s] && weights[s] > 0);
  const missing = Object.keys(weights).filter((s) => !used.includes(s));
  const n = dates.length;
  const index = new Array(n).fill(null);
  const tot = used.reduce((t, s) => t + weights[s], 0);
  let i0 = 0;
  while (i0 < n && !used.every((s) => closes[s][i0] != null)) i0++;
  if (!used.length || !tot || i0 >= n) return { index, used, missing };
  const units = {}, last = {};
  // un prezzo mancante vale l'ultimo noto
  const px = (s, i) => (closes[s][i] != null ? (last[s] = closes[s][i]) : last[s]);
  const rebalance = (value) => { for (const s of used) units[s] = (value * weights[s]) / tot / last[s]; };
  for (const s of used) px(s, i0);
  index[i0] = 100;
  rebalance(100);
  for (let i = i0 + 1; i < n; i++) {
    let v = 0;
    for (const s of used) v += units[s] * px(s, i);
    index[i] = v;
    if (i + 1 < n && dates[i + 1].slice(0, 7) !== dates[i].slice(0, 7)) rebalance(v);
  }
  return { index, used, missing };
}
