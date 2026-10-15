/*
 * indexdata.js — formato di data/indices.json (pagina Indici). Lo usano l'app e la pipeline.
 *
 * Per ogni indice: d0 (prima data) e gaps (giorni di calendario tra una seduta e la successiva, un
 * carattere in base 36 per seduta), close (chiusure dell'indice, solo prezzo, valuta locale) e, dalla
 * seduta b0 in poi, i conteggi della breadth come in breadth.json: members e n in RLE, a20/a50/a200
 * numero di titoli sopra la media a 20/50/200 sedute (null dove la breadth manca).
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

/**
 * Serie di un indice sul calendario del suo prezzo.
 * @returns {{dates: string[], close: number[], pct200: (number|null)[], pct50: (number|null)[], pct20: (number|null)[],
 *            n: (number|null)[], members: (number|null)[], above200: (number|null)[]}}
 */
export function indexSeries(x) {
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
