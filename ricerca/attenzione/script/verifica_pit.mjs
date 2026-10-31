// Ricalcolo separato dei numeri C, D, E di avvicinamento_pit.mjs e avvicinamento_pit_indici.mjs: soglia con approachLevel
// sulla storia tagliata seduta per seduta (non approachSeries) e conteggi riscritti da capo. Circa un minuto.
// Uso: node ricerca/attenzione/script/verifica_pit.mjs
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachLevel, DEFAULT_PARAMS } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params };
function count(list) {
  const res = { C: [0, 0, []], D: [0, 0, []], E: [0, 0, []] }; let arr = { C: [0, 0], D: [0, 0], E: [0, 0] };
  for (const { b, L, days } of list) {
    const A = b.map((_, t) => approachLevel(b.slice(0, t + 1), L));
    const st = []; let last = 'normal'; for (let t = 0; t < b.length; t++) { if (days[t]) last = days[t]; st.push(last); }
    const flag = { C: (t) => A[t] != null && b[t] <= A[t] && st[t] === 'normal', E: (t) => st[t] === 'watch' };
    flag.D = (t) => flag.C(t) || flag.E(t);
    // tocchi: prima seduta <= L dopo >= 60 sedute valide sopra
    const touch = []; let run = 0;
    for (let t = 0; t < b.length; t++) { if (b[t] == null) continue; if (b[t] <= L) { if (run >= 60) touch.push(t); run = 0; } else run++; }
    for (const r of ['C', 'D', 'E']) {
      const starts = []; let off = 0;
      for (let t = 0; t < b.length; t++) { if (b[t] == null) continue; if (flag[r](t)) { if (off >= 20) starts.push(t); off = 0; } else off++; }
      res[r][0] += touch.filter((u) => starts.some((s) => u - s >= 5 && u - s <= 126)).length; res[r][1] += touch.length;
      for (const s of starts) { const j = b.findIndex((v, k) => k >= s && k < s + 126 && v != null && v <= L); arr[r][1]++; if (j >= 0) { arr[r][0]++; res[r][2].push(j - s); } }
    }
  }
  const med = (a) => a.sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)];
  for (const r of ['C', 'D', 'E']) console.log(r, `tocchi ${res[r][0]}/${res[r][1]}`, `arrivano ${Math.round(100 * arr[r][0] / arr[r][1])}% di ${arr[r][1]}`, `anticipo ${med(res[r][2])}`);
}
const sec = R('data/sectors.json'), br = R('data/breadth.json');
console.log('settori'); count(Object.keys(th.blue).map((k) => { const B = breadthSeries(br, k, sec.dates); return { b: B.pct200, L: th.blue[k], days: runMachine(priceSeries(sec.adjclose[k]), B, th.blue[k], P).days }; }));
const cfg = R('config/indices.json').indices, IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
console.log('indici'); count(Object.keys(cfg).map((k) => { const X = indexSeries(IX[k]); return { b: X.pct200, L: cfg[k].blue, days: runMachine(priceSeries(X.close), X, cfg[k].blue, P).days }; }));
