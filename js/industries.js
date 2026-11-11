/*
 * industries.js — industrie seguite accanto agli 11 settori (per ora il SOXX, semiconduttori: 1.9.0).
 *
 * Dati in data/industries.json (scripts/fetch_industries.js, storia da scripts/backfill_industries.js): un calendario
 * proprio (dates compatte), il prezzo dell'ETF rettificato per i dividendi, la breadth nello stesso formato di
 * breadth.json, la fotografia dei titoli e la lista dei membri. Configurazione in config/industries.json.
 *
 * Nel browser le viste dei settori lavorano su un solo calendario: quello dei settori (sectors.json, dal 2004),
 * allungato solo all'indietro con le sedute dell'industria che vengono prima (il SOXX parte dal 2001). Gli 11 settori
 * prendono davanti tanti valori vuoti quante sono le sedute aggiunte: i loro numeri non cambiano (test in
 * test/industries.test.js). Le sedute dell'industria dopo l'ultima dei settori non entrano.
 */
import { decodeDates } from './indexdata.js';

/** Chiavi delle industrie con i dati: quelle della configurazione presenti nel file, nell'ordine della configurazione */
export function industryKeys(cfg, data) {
  if (!cfg || !cfg.industries || !data || !data.series || !data.dates) return [];
  return Object.keys(cfg.industries).filter((k) => data.series[k] && Array.isArray(data.series[k].adjclose));
}

/** Calendario dell'industria dal file */
export const industryDates = (data) => decodeDates(data.dates.d0, data.dates.gaps);

/**
 * Calendario unico e prezzi allineati.
 * @param {{dates: string[], adjclose: Record<string, (number|null)[]>}} sectors
 * @param {object|null} data data/industries.json
 * @param {string[]} keys industrie da allineare
 * @returns {{dates: string[], pad: number, adjclose: Record<string, (number|null)[]>, indDates: string[]|null}}
 */
export function mergeCalendar(sectors, data, keys) {
  if (!data || !keys.length) return { dates: sectors.dates, pad: 0, adjclose: sectors.adjclose, indDates: null };
  const indDates = industryDates(data), d0 = sectors.dates[0];
  const before = indDates.filter((d) => d < d0);
  const dates = before.concat(sectors.dates), pad = before.length;
  const adjclose = {};
  for (const [k, a] of Object.entries(sectors.adjclose)) adjclose[k] = pad ? new Array(pad).fill(null).concat(a) : a;
  const pos = new Map(dates.map((d, i) => [d, i]));
  for (const k of keys) {
    const out = new Array(dates.length).fill(null), src = data.series[k].adjclose;
    indDates.forEach((d, i) => { const j = pos.get(d); if (j != null && src[i] != null) out[j] = src[i]; });
    adjclose[k] = out;
  }
  return { dates, pad, adjclose, indDates };
}

/** Breadth di un'industria nel formato di breadth.json, da passare a breadthSeries(…, key, dates) */
export const industryBreadth = (data, key, indDates) => ({ dates: indDates, series: { [key]: data.series[key].breadth } });
