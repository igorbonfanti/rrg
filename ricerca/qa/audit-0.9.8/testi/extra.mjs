// Controlli aggiuntivi: membri dei settori senza settore noto, allerte dei cali forti nel 2020/2025/2008,
// confronto 3M con le letture di Rea, frequenza dei −7%, profondità storica di XLC/XLRE
import fs from 'node:fs';
import { expandRLE, breadthSeries, priceSeries, runMachine } from '../../../../js/signals.js';
import { capSeries, capAnalysis } from '../../../../js/capitulation.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const br = R('data/breadth.json'), sec = R('data/sectors.json'), th = R('config/thresholds.json'), L = br.dates.length;
const S = Object.keys(th.blue), e = (k, f) => expandRLE(br.series[k][f], L);
const spm = e('SPX', 'members'), sm = S.map((k) => e(k, 'members')), sn = S.map((k) => e(k, 'n'));
for (const d of ['2005-01-03', '2009-03-09', '2012-12-03', '2016-06-01', '2026-10-16']) { const i = br.dates.indexOf(d); console.log(d, 'membri S&P', spm[i], 'somma membri settori', sm.reduce((s, x) => s + x[i], 0), 'con prezzi', sn.reduce((s, x) => s + x[i], 0)); }
const C = R('data/capitulation.json').series;
for (const [lab, a0, b0] of [['2008', '2008-09-01', '2008-11-30'], ['2020', '2020-02-15', '2020-05-15'], ['2025', '2025-03-15', '2025-06-15']]) {
  const v = Object.keys(C).map((k) => { const s = capSeries(C[k]), a = capAnalysis(s); return a.on.filter((x, i) => x && s.dates[i] >= a0 && s.dates[i] <= b0).length; }).sort((x, y) => x - y);
  console.log('cali forti', lab, 'sedute in allerta per serie in 3 mesi: mediana', v[Math.floor((v.length - 1) / 2)], 'max', v.at(-1));
}
for (const k of ['XLC', 'XLRE']) { const px = priceSeries(sec.adjclose[k]), b = breadthSeries(br, k, sec.dates), m = runMachine(px, b, th.blue[k], th.params); console.log(k, 'prezzo dal', sec.dates[sec.adjclose[k].findIndex((v) => v != null)], 'percentile dal', sec.dates[px.dp.findIndex((v) => v != null)], 'breadth dal', sec.dates[b.pct200.findIndex((v) => v != null)], 'prima zona blu', sec.dates[m.setups[0].t]); }
