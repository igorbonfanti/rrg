// Valori attesi per il confronto con il disegno (attese.json). Stati della macchina e F/z della valuta presi dal codice
// dell'app (js/signals.js, js/emerging.js: calcoli controllati a parte); tutto il resto ricalcolato qui da dati.mjs.
// Uso: node ricerca/qa/1.4.0/grafici/dati.mjs && node ricerca/qa/1.4.0/grafici/attese.mjs
import fs from 'node:fs';
// codice dell'app da usare: APP=/percorso/della/copia/ (con la barra finale; di partenza il repository). Per la 1.4.0 controllata
// serve il codice del commit afc06f3 (la copia servita), non quello in lavorazione.
const APP = process.env.APP ? 'file://' + process.env.APP : new URL('../../../../', import.meta.url).href;
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { indexSeries } = await import(APP + 'js/indexdata.js');
const { priceSeries, runMachine, DEFAULT_PARAMS } = await import(APP + 'js/signals.js');
const { emSeries, cleanFx, fxSignals, relStrength } = await import(APP + 'js/emerging.js');
const { STATES } = await import(APP + 'js/signals.js');
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const A = JSON.parse(fs.readFileSync(path.join(here, 'atteso.json'), 'utf8'));
const CFG = J('config/emerging.json'), IC = J('config/indices.json').indices, TH = J('config/thresholds.json');
const IX = { ...J('data/indices.json').series, ...J('data/indices_more.json').series }, E = J('data/emerging.json');
const P = { ...DEFAULT_PARAMS, ...TH.params };
const out = { dl: A.dl, idx: {}, STATES };
const acwi = emSeries(E.series[CFG.benchmark]);
for (const k of CFG.order) {
  const S = indexSeries(IX[k]), m = runMachine(priceSeries(S.close), S, IC[k].blue, P), a = A.idx[k];
  // controllo incrociato: decodifica dell'app = decodifica indipendente
  const diff = S.close.filter((v, i) => Math.abs(v - a.close[i]) > 1e-9).length + S.pct200.filter((v, i) => (v == null) !== (a.pct[i] == null) || (v != null && Math.abs(v - a.pct[i]) > 1e-9)).length;
  const c = CFG.indices[k];
  let fx = null;
  if (c.fx) { const C = cleanFx(c.fx, emSeries(E.series[c.fx])); const s = fxSignals(C); fx = { dates: C.dates, val: C.val, z: s.z, F: s.F, removed: C.removed, rawDates: A.fx[k].dates, rawVal: A.fx[k].val }; }
  out.idx[k] = { dates: a.dates, close: a.close, pct: a.pct, days: m.days, trig: m.events.filter((e) => e.code === 'trig').map((e) => e.t), blue: IC[k].blue, fx, rs: relStrength(emSeries(E.series[c.etf]), acwi) };
  console.log(k, 'differenze decodifica app/indipendente:', diff, '· trigger', out.idx[k].trig.length, '· sedute del cambio tolte', fx ? fx.removed.length : '-');
}
fs.writeFileSync(path.join(here, 'attese.json'), JSON.stringify(out));
