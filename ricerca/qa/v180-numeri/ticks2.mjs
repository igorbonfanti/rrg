// Prova esaustiva di timeTicks/sessionTicks (js/zoom.js) su finestre di 10–60 sedute dei calendari reali
import { sessionTicks, timeTicks } from '../../../js/zoom.js';
import fs from 'fs';
const DAY = 864e5;
const dec = (x) => { const o = [x.d0]; let t = Date.parse(x.d0); for (const c of x.gaps) { t += parseInt(c, 36) * DAY; o.push(new Date(t).toISOString().slice(0, 10)); } return o; };
const IX = JSON.parse(fs.readFileSync(new URL('../../../', import.meta.url).pathname + 'data/indices.json')).series;
const cals = { settori: JSON.parse(fs.readFileSync(new URL('../../../', import.meta.url).pathname + 'data/sectors.json')).dates, N225: dec(IX.N225), DAX: dec(IX.DAX) };
const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
let nWin = 0, bad = [], few = 0, wkT = 0;
for (const [name, D] of Object.entries(cals)) {
  const from = D.findIndex((d) => d >= '2015-01-01');
  for (let a = from; a < D.length - 10; a += 3) for (const len of [10, 12, 15, 20, 30, 45, 60]) {
    if (a + len > D.length) continue;
    const ds = D.slice(a, a + len);
    for (const maxN of [4, 12]) {
      nWin++;
      const tk = sessionTicks(ds, maxN);
      if (tk.length < 2 && maxN === 12) few++;
      for (let k = 0; k < tk.length; k++) {
        const { i, label } = tk[k], d = ds[i];
        let ok;
        if (/^\d\d\/\d\d$/.test(label)) ok = label === `${d.slice(8, 10)}/${d.slice(5, 7)}`;
        else if (/^\d{4}$/.test(label)) ok = d.slice(0, 4) === label && d.slice(5, 7) === '01';
        else { const m = label.match(/^([a-z]{3})(?: (\d\d))?$/); ok = !!m && MM.indexOf(m[1]) + 1 === +d.slice(5, 7) && (!m[2] || m[2] === d.slice(2, 4)); }
        if (!ok || (k && tk[k - 1].i >= i) || tk.length > maxN + 1) bad.push([name, ds[0], len, maxN, label, d]);
      }
      for (const t of timeTicks(Date.parse(ds[0]), Date.parse(ds.at(-1)), maxN)) if (/^\d\d\/\d\d$/.test(t.label) && [0, 6].includes(new Date(t.t).getUTCDay())) wkT++;
    }
  }
}
console.log(JSON.stringify({ finestre: nWin, etichette_sbagliate: bad.length, esempi: bad.slice(0, 5), finestre_con_meno_di_2_etichette_maxN12: few, etichette_di_sabato_domenica_timeTicks: wkT }));
