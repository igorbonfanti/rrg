import fs from 'node:fs';
import { priceSeries, runMachine, forward } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const cfg = R('config/indices.json').indices, th = R('config/thresholds.json');
const IX = { ...R('data/indices.json').series, ...R('data/indices_more.json').series };
const medL = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const medT = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const F1 = ['SPX', 'NDX', 'DJI', 'N225', 'SXXP', 'UKX', 'DAX', 'CAC', 'SMI'];
const LIM = Object.keys(cfg).filter((k) => cfg[k].limits);
function run(keys, from) {
  const all = [], last = [], allTrigEp = [];
  for (const k of keys) {
    const X = indexSeries(IX[k]), px = priceSeries(X.close), m = runMachine(px, X, cfg[k].blue, th.params);
    for (const e of m.events) if (e.code === 'trig' && X.dates[e.t] >= from) { const r = forward(X.close, e.t, 252); if (r != null) all.push(r); }
    for (const u of m.setups) if (u.trig && X.dates[u.trig.t] >= from) { const r = forward(X.close, u.trig.t, 252); if (r != null) last.push(r); }
  }
  const f = (a) => `${a.length}, mediana ${medL(a).toFixed(1)} (media dei due centrali ${medT(a).toFixed(1)}), positivi ${a.filter((x) => x > 0).length}`;
  return { all: f(all), last: f(last) };
}
console.log('9 indici F1, tutti i trigger dal 2001:', run(F1, '2001-01-01').all);
console.log('9 indici F1, ultimo trigger di ogni episodio dal 2005:', run(F1, '2005-01-01').last);
console.log('9 indici F1, ultimo trigger di ogni episodio dal 2001:', run(F1, '2001-01-01').last);
console.log(`${LIM.length} indici con limiti, ultimo trigger per episodio:`, run(LIM, '1990-01-01').last, '| tutti i trigger:', run(LIM, '1990-01-01').all);
