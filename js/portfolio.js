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
 * @returns {{index: (number|null)[], used: string[], missing: string[], now: Record<string, number>, rebalanced: string|null}}
 *   now: pesi in % all'ultima data, cioè gli obiettivi spostati dai prezzi dopo l'ultimo ribilanciamento
 *   rebalanced: data (chiusura) dell'ultimo ribilanciamento
 */
export function portfolioIndex(dates, closes, weights) {
  const used = Object.keys(weights).filter((s) => closes[s] && weights[s] > 0);
  // mancanti: le componenti con un peso ma senza prezzi (un peso a zero la esclude di proposito)
  const missing = Object.keys(weights).filter((s) => weights[s] > 0 && !closes[s]);
  const n = dates.length;
  const index = new Array(n).fill(null);
  const tot = used.reduce((t, s) => t + weights[s], 0);
  let i0 = 0;
  while (i0 < n && !used.every((s) => closes[s][i0] != null)) i0++;
  if (!used.length || !tot || i0 >= n) return { index, used, missing, now: {}, rebalanced: null };
  const units = {}, last = {};
  // un prezzo mancante vale l'ultimo noto
  const px = (s, i) => (closes[s][i] != null ? (last[s] = closes[s][i]) : last[s]);
  const rebalance = (value) => { for (const s of used) units[s] = (value * weights[s]) / tot / last[s]; };
  for (const s of used) px(s, i0);
  index[i0] = 100;
  rebalance(100);
  let rb = i0;
  for (let i = i0 + 1; i < n; i++) {
    let v = 0;
    for (const s of used) v += units[s] * px(s, i);
    index[i] = v;
    if (i + 1 < n && dates[i + 1].slice(0, 7) !== dates[i].slice(0, 7)) { rebalance(v); rb = i; }
  }
  const end = index[n - 1];
  const now = Object.fromEntries(used.map((s) => [s, (100 * units[s] * last[s]) / end]));
  return { index, used, missing, now, rebalanced: dates[rb] };
}

/**
 * Pesi scelti nel browser (dallo storage): solo le componenti del portafoglio di partenza,
 * valori interi tra 0 e 100. null se non sono utilizzabili (non un oggetto, nessun peso sopra zero).
 * @param {unknown} saved
 * @param {Record<string, number>} defaults
 * @returns {Record<string, number>|null}
 */
export function cleanWeights(saved, defaults) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
  const out = {};
  for (const s of Object.keys(defaults)) {
    const v = Number(saved[s]);
    out[s] = Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0;
  }
  return Object.values(out).some((v) => v > 0) ? out : null;
}

/**
 * Riporta i pesi a un totale di 100 in numeri interi, mantenendo le proporzioni
 * (metodo dei resti maggiori: i punti avanzati vanno ai resti più alti).
 * @param {Record<string, number>} weights
 * @returns {Record<string, number>}
 */
export function toHundred(weights) {
  const keys = Object.keys(weights), tot = keys.reduce((t, s) => t + weights[s], 0);
  if (!tot) return { ...weights };
  const raw = Object.fromEntries(keys.map((s) => [s, (100 * weights[s]) / tot]));
  const out = Object.fromEntries(keys.map((s) => [s, Math.floor(raw[s])]));
  let left = 100 - keys.reduce((t, s) => t + out[s], 0);
  for (const s of keys.slice().sort((a, b) => (raw[b] - out[b]) - (raw[a] - out[a]))) if (left-- > 0) out[s]++;
  return out;
}
