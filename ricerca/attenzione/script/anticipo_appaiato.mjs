// Anticipo appaiato: sui tocchi del livello blu avvisati sia da «avvicinamento oppure Attenzione» (D) sia dalla sola
// Attenzione (E), di quante sedute il primo avviso di D arriva prima di quello di E; e il preavviso dei tocchi avvisati solo
// da D. Stesse definizioni di anticipo_tocchi.mjs (dalla prima seduta con uno stato; allarme da 5 a 126 sedute prima).
// Uso: node ricerca/attenzione/script/anticipo_appaiato.mjs
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachSeries, DEFAULT_PARAMS } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params };
const med = (a) => { const v = [...a].sort((x, y) => x - y), n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
function run(list, label) {
  const both = [], onlyD = [];
  for (const { b, L, days } of list) {
    const start = days.findIndex((d) => d != null), A = approachSeries(b, L);
    const st = []; let c = 'normal'; for (let t = 0; t < b.length; t++) { if (days[t] != null) c = days[t]; st.push(c); }
    const fE = (t) => st[t] === 'watch', fD = (t) => fE(t) || (A[t] != null && b[t] <= A[t] && st[t] === 'normal');
    const starts = (f) => { const s0 = []; let off = 0; for (let t = start; t < b.length; t++) { if (b[t] == null) continue; if (f(t)) { if (off >= 20) s0.push(t); off = 0; } else off++; } return s0; };
    const sD = starts(fD), sE = starts(fE);
    const touch = []; let run = 0;
    for (let t = start; t < b.length; t++) { if (b[t] == null) continue; if (b[t] <= L) { if (run >= 60) touch.push(t); run = 0; } else run++; }
    for (const u of touch) {
      const d = sD.find((s) => u - s >= 5 && u - s <= 126), e = sE.find((s) => u - s >= 5 && u - s <= 126);
      if (d != null && e != null) both.push(e - d); else if (d != null) onlyD.push(u - d);
    }
  }
  const earlier = both.filter((x) => x > 0);
  console.log(`${label}: tocchi avvisati da tutte e due ${both.length}; differenza mediana ${med(both)}; prima con l'avvicinamento ${earlier.length} (mediana ${med(earlier)} sedute); dopo ${both.filter((x) => x < 0).length}; solo con l'avvicinamento ${onlyD.length} tocchi, preavviso mediano ${med(onlyD)} sedute`);
}
const sec = R('data/sectors.json'), br = R('data/breadth.json');
run(Object.keys(th.blue).map((k) => { const B = breadthSeries(br, k, sec.dates); return { b: B.pct200, L: th.blue[k], days: runMachine(priceSeries(sec.adjclose[k]), B, th.blue[k], P).days }; }), 'settori');
const cfg = R('config/indices.json').indices, IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
run(Object.keys(cfg).map((k) => { const X = indexSeries(IX[k]); return { b: X.pct200, L: cfg[k].blue, days: runMachine(priceSeries(X.close), X, cfg[k].blue, P).days }; }), 'indici');
