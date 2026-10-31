// Anticipo sui tocchi del livello blu avvisati: per ogni tocco avvisato (allarme iniziato da 5 a 126 sedute prima), sedute
// dal primo e dall'ultimo allarme; C avvicinamento come nell'app, D C oppure Attenzione, E solo Attenzione. Dalla prima seduta
// con uno stato. Mediana con la media dei due valori centrali. Uso: node ricerca/attenzione/script/anticipo_tocchi.mjs
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachSeries, DEFAULT_PARAMS } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
function run(list, label) {
  const out = { D: { first: [], last: [] }, E: { first: [], last: [] }, C: { first: [], last: [] } };
  for (const { b, L, days } of list) {
    const start = days.findIndex((d) => d != null), A = approachSeries(b, L);
    const st = []; let c = 'normal'; for (let t = 0; t < b.length; t++) { if (days[t] != null) c = days[t]; st.push(c); }
    const f = { C: (t) => A[t] != null && b[t] <= A[t] && st[t] === 'normal', E: (t) => st[t] === 'watch' }; f.D = (t) => f.C(t) || f.E(t);
    const touch = []; let run = 0;
    for (let t = start; t < b.length; t++) { if (b[t] == null) continue; if (b[t] <= L) { if (run >= 60) touch.push(t); run = 0; } else run++; }
    for (const r of ['C', 'D', 'E']) {
      const s0 = []; let off = 0;
      for (let t = start; t < b.length; t++) { if (b[t] == null) continue; if (f[r](t)) { if (off >= 20) s0.push(t); off = 0; } else off++; }
      for (const u of touch) { const w = s0.filter((s) => u - s >= 5 && u - s <= 126); if (w.length) { out[r].first.push(u - w[0]); out[r].last.push(u - w.at(-1)); } }
    }
  }
  for (const r of ['C', 'D', 'E']) console.log(label, r, 'tocchi avvisati', out[r].first.length, '| anticipo mediano dal primo allarme', med(out[r].first), '| dall\'ultimo', med(out[r].last));
}
const sec = R('data/sectors.json'), br = R('data/breadth.json');
run(Object.keys(th.blue).map((k) => { const B = breadthSeries(br, k, sec.dates); return { b: B.pct200, L: th.blue[k], days: runMachine(priceSeries(sec.adjclose[k]), B, th.blue[k], P).days }; }), 'settori');
const cfg = R('config/indices.json').indices, IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
const I = Object.keys(cfg).map((k) => { const X = indexSeries(IX[k]); return { k, X, b: X.pct200, L: cfg[k].blue, days: runMachine(priceSeries(X.close), X, cfg[k].blue, P).days }; });
run(I, 'indici');
console.log('primo stato indici:', I.map((x) => `${x.k} ${x.X.dates[x.days.findIndex((d) => d != null)]}`).sort((a, b) => a.split(' ')[1] < b.split(' ')[1] ? -1 : 1).slice(0, 4).join(', '));
