/*
 * bozza_vix_ctx.js — BOZZA delle funzioni da aggiungere a js/vix.js (fase 1: non è codice dell'app).
 * La usa prototipo.html; nella fase 2 il contenuto va in js/vix.js con i test in test/vix.test.js.
 *
 * Definizioni proposte (da confermare con l'utente e con l'agente del backtest):
 * - R = VIX / VIX3M alla stessa seduta dell'S&P 500; null se manca uno dei due (mai riempito);
 * - stato: R ≥ 1 «backwardation» (la paura a 30 giorni supera quella a 3 mesi), R < 1 «contango» (normale);
 * - percentile di R: quota dei valori fino a quel giorno ≤ R di quel giorno (expandingPct di js/vix.js, almeno 252 valori);
 * - credito: spread in punti percentuali; variazione = valore di oggi − valore di 21 osservazioni del credito prima
 *   (sulla serie del credito, non sulle sedute: le feste del mercato obbligazionario non creano buchi nella variazione);
 *   percentile sulla storia fino a quel giorno, almeno 252 osservazioni.
 * - seduta provvisoria: R è provvisorio se la data è dopo l'ultimo valore di FRED del VIX O del VIX3M.
 */
import { expandingPct } from '../../../../js/vix.js';

/** Valori di una serie {dates, val} sulle date date (null dove manca) */
export function onDates(dates, s) {
  if (!s) return dates.map(() => null);
  const m = new Map(s.dates.map((d, i) => [d, s.val[i]]));
  return dates.map((d) => (m.has(d) ? m.get(d) : null));
}

/** R = a / b seduta per seduta, null se manca uno dei due */
export const ratio = (a, b) => a.map((x, i) => (x != null && b[i] != null && b[i] > 0 ? x / b[i] : null));

export const termState = (r) => (r == null ? null : r >= 1 ? 'backwardation' : 'contango');

/** Variazione su h osservazioni valide (salta i null: non riempie, conta solo i valori veri) */
export function obsChange(a, h = 21) {
  const out = new Array(a.length).fill(null), pos = [];
  a.forEach((x, i) => { if (x == null) return; pos.push(i); const k = pos.length - 1 - h; if (k >= 0) out[i] = x - a[pos[k]]; });
  return out;
}

/** Ultimo indice con valore (fino a t compreso) */
const lastAt = (a, t = a.length - 1) => { while (t >= 0 && a[t] == null) t--; return t; };

/**
 * Contesto della struttura a termine e del credito sulle sedute di A (serie allineata di js/vix.js).
 * v3, cr: serie {dates, val, fred} oppure null se il file non le ha (file vecchio o fonte mai arrivata).
 */
export function context(A, v3, cr) {
  const V3 = onDates(A.dates, v3), R = ratio(A.vix, V3), C = onDates(A.dates, cr);
  const rPct = expandingPct(R, 252), cPct = expandingPct(C, 252), cCh = obsChange(C, 21);
  const t = A.vix.length - 1;
  // oggi: la seduta dell'ultimo VIX; se lì manca il VIX3M si dice (R null) e si mostra l'ultimo R con la sua data
  let tv = lastAt(A.vix);
  const tr = lastAt(R), tc = lastAt(C);
  const prov = (i) => i >= 0 && ((A.fred && A.dates[i] > A.fred) || (v3 && v3.fred && A.dates[i] > v3.fred));
  return {
    has3m: !!v3, hasCredit: !!cr,
    v3: V3, r: R, rPct, credit: C, creditCh: cCh, creditPct: cPct,
    from3m: v3 ? v3.dates[0] : null, fromCredit: cr ? cr.dates[0] : null,
    now: {
      vixDate: tv >= 0 ? A.dates[tv] : null,
      r: tr >= 0 ? { date: A.dates[tr], vix: A.vix[tr], v3: V3[tr], r: R[tr], state: termState(R[tr]), pct: rPct[tr], provisional: prov(tr), sameDay: tr === tv } : null,
      credit: tc >= 0 ? { date: A.dates[tc], v: C[tc], ch: cCh[tc], pct: cPct[tc], lag: t - tc } : null,
    },
    provisional: prov,
  };
}
