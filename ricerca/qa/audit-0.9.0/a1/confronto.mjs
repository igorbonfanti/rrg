// A1: eventi della macchina a stati prima e dopo la correzione del minimo nel giorno del segnale fallito.
// Uso: node ricerca/qa/audit-0.9.0/a1/confronto.mjs   (signals_prima.js è la versione della 0.9.3)
import fs from 'node:fs';
import * as nuovo from '../../../../js/signals.js';
import * as prima from './signals_prima.js';
import { indexSeries } from '../../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const s = R('data/sectors.json'), b = R('data/breadth.json'), th = R('config/thresholds.json'), cfg = R('config/indices.json');
const ix = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
const ev = (lib, px, br, L, P, dates) => lib.runMachine(px, br, L, P).events.map((e) => `${dates[e.t]} ${e.code}`);
const out = [];
const cmp = (k, a, z) => { const A = new Set(a), Z = new Set(z); const tolti = a.filter((x) => !Z.has(x)), nuovi = z.filter((x) => !A.has(x)); if (tolti.length || nuovi.length) out.push(`${k}: tolti ${tolti.join(', ') || '—'} · nuovi ${nuovi.join(', ') || '—'}`); };
for (const k of Object.keys(th.blue)) {
  const px = nuovo.priceSeries(s.adjclose[k]), br = nuovo.breadthSeries(b, k, s.dates);
  cmp(k, ev(prima, px, br, th.blue[k], th.params, s.dates), ev(nuovo, px, br, th.blue[k], th.params, s.dates));
}
for (const [k, x] of Object.entries(ix)) {
  const S = indexSeries(x), px = nuovo.priceSeries(S.close), br = { pct200: S.pct200, pct50: S.pct50, pct20: S.pct20, n: S.n };
  cmp(k, ev(prima, px, br, cfg.indices[k].blue, th.params, S.dates), ev(nuovo, px, br, cfg.indices[k].blue, th.params, S.dates));
}
console.log(out.join('\n') || 'nessuna differenza');
