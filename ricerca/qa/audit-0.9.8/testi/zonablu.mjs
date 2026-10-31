import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, forward } from '../../../../js/signals.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const s = R('data/sectors.json'), b = R('data/breadth.json'), th = R('config/thresholds.json');
let n = 0, lower = 0, nearLow = 0, trig = 0, trigPos = 0, z = [];
for (const k of Object.keys(th.blue)) {
  const px = priceSeries(s.adjclose[k]), br = breadthSeries(b, k, s.dates), m = runMachine(px, br, th.blue[k], th.params);
  const c = s.adjclose[k];
  for (const u of m.setups) {
    if (u.t + 126 >= c.length) continue;
    n++;
    let lo = Infinity, loT = -1; for (let i = Math.max(0, u.t - 126); i <= u.t + 126; i++) if (c[i] != null && c[i] < lo) { lo = c[i]; loT = i; }
    // il minimo dei ±6 mesi cade entro la zona blu (dall'ingresso a 63 sedute dopo)?
    if (loT >= u.t && loT <= u.t + 63) nearLow++;
    let lo2 = Infinity; for (let i = u.t + 1; i <= u.t + 126; i++) lo2 = Math.min(lo2, c[i]);
    if (lo2 < c[u.t]) lower++;
  }
  for (const e of m.events.filter((e) => e.code === 'trig')) { const r = forward(c, e.t, 63); if (r != null) { trig++; if (r > 0) trigPos++; } }
}
console.log(`zone blu con 6 mesi dopo: ${n}; prezzo più basso nei 6 mesi dopo l'ingresso: ${lower}/${n}; minimo dei ±6 mesi entro 3 mesi dall'ingresso: ${nearLow}/${n}; trigger positivi a 3M ${trigPos}/${trig}`);
