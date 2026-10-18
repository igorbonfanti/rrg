/*
 * indexdata.js — formato di data/indices.json (pagina Indici). Lo usano l'app e la pipeline.
 *
 * Per ogni indice: d0 (prima data) e gaps (giorni di calendario tra una seduta e la successiva, un
 * carattere in base 36 per seduta), close (chiusure dell'indice, solo prezzo, valuta locale) e, dalla
 * seduta b0 in poi, i conteggi della breadth come in breadth.json: members e n in RLE, a20/a50/a200
 * numero di titoli sopra la media a 20/50/200 sedute (null dove la breadth manca).
 *
 * Nel file le chiusure sono in centesimi come differenze dalla seduta prima ("cd") e i conteggi come differenze
 * ("d20", "d50", "d200"; dopo un null si riparte dal valore intero): stessi numeri, file più piccolo di un quarto.
 * I file nel formato precedente (close, a20, a50, a200 per esteso) si leggono uguale.
 * Gli indici "main" di config/indices.json stanno in data/indices.json, gli altri in data/indices_more.json.
 */
import { expandRLE } from './signals.js';

const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

export function encodeDates(dates) {
  let g = '';
  for (let i = 1; i < dates.length; i++) {
    const k = Math.round((Date.parse(dates[i]) - Date.parse(dates[i - 1])) / DAY);
    if (k < 1 || k > 35) throw new Error(`intervallo di ${k} giorni tra ${dates[i - 1]} e ${dates[i]}`);
    g += k.toString(36);
  }
  return { d0: dates[0], gaps: g };
}
export function decodeDates(d0, gaps) {
  const out = [d0];
  let t = Date.parse(d0);
  for (const ch of gaps) { t += parseInt(ch, 36) * DAY; out.push(iso(t)); }
  return out;
}

// Differenze successive di valori interi (dopo un null si riparte dal valore intero) e il loro inverso
export function deltaEncode(a, scale = 1) {
  let p = null;
  return a.map((v) => { if (v == null) { p = null; return null; } const x = Math.round(v * scale), r = p == null ? x : x - p; p = x; return r; });
}
export function deltaDecode(a, scale = 1) {
  let p = null;
  return a.map((r) => { if (r == null) { p = null; return null; } p = p == null ? r : p + r; return p / scale; });
}
// Serie di un indice dal formato del file (compatto o esteso) a quello esteso, e ritorno. Chiusure con 2 decimali;
// sotto 100 con 4 (ps: 10000), come l'ETF del CSI 300 a circa 4 yuan
export function unpackIndex(x) {
  if (!x.cd) return x;
  const { cd, d20, d50, d200, ps, ...rest } = x;
  return { ...rest, close: deltaDecode(cd, ps || 100), a20: deltaDecode(d20), a50: deltaDecode(d50), a200: deltaDecode(d200) };
}
export function packIndex(x) {
  if (x.cd) return x;
  const { close, a20, a50, a200, ps: _, ...rest } = x;
  const last = close.filter((v) => v != null).at(-1), ps = last != null && last < 100 ? 10000 : 100;
  return { ...rest, ...(ps !== 100 ? { ps } : {}), cd: deltaEncode(close, ps), d20: deltaEncode(a20), d50: deltaEncode(a50), d200: deltaEncode(a200) };
}

/**
 * Serie di un indice sul calendario del suo prezzo.
 * @returns {{dates: string[], close: number[], pct200: (number|null)[], pct50: (number|null)[], pct20: (number|null)[],
 *            n: (number|null)[], members: (number|null)[], above200: (number|null)[]}}
 */
export function indexSeries(x) {
  x = unpackIndex(x);
  const dates = decodeDates(x.d0, x.gaps), L = dates.length;
  const out = { dates, close: x.close };
  for (const k of ['pct200', 'pct50', 'pct20', 'n', 'members', 'above200']) out[k] = new Array(L).fill(null);
  const m = x.a200.length, n = expandRLE(x.n, m), mem = expandRLE(x.members, m);
  for (let i = 0; i < m; i++) {
    const j = x.b0 + i;
    if (j >= L || x.a200[i] == null) continue;
    out.n[j] = n[i]; out.members[j] = mem[i]; out.above200[j] = x.a200[i];
    if (n[i]) { out.pct200[j] = (100 * x.a200[i]) / n[i]; out.pct50[j] = (100 * x.a50[i]) / n[i]; out.pct20[j] = (100 * x.a20[i]) / n[i]; }
  }
  return out;
}
