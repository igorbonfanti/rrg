import fs from 'node:fs';
import { breadthSeries } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), sec = R('data/sectors.json'), br = R('data/breadth.json');
const cfg = R('config/indices.json').indices;
const IX = { ...R('data/indices.json').series, ...R('data/indices_more.json').series };
const pctl = (a, q) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))]; };
const share = (b, L) => { const v = b.filter((x) => x != null); return 100 * v.filter((x) => x <= L).length / v.length; };
const shareLt = (b, L) => { const v = b.filter((x) => x != null); return 100 * v.filter((x) => x < L).length / v.length; };
console.log('SETTORI: livello, % sedute <= livello, p3, membri ultimi');
for (const k of Object.keys(th.blue)) { const B = breadthSeries(br, k, sec.dates); const n = B.n.filter(Boolean).at(-1); console.log(k, th.blue[k], share(B.pct200, th.blue[k]).toFixed(2), '<', shareLt(B.pct200, th.blue[k]).toFixed(2), 'p3', pctl(B.pct200, 0.03).toFixed(2), 'n', n, '1 titolo =', (100 / n).toFixed(2)); }
const B = breadthSeries(br, 'SPX', sec.dates); console.log('SPX (breadth.json) 13:', share(B.pct200, 13).toFixed(2));
console.log('\nINDICI: livello, fonte, % sedute <= livello, p3, n ultimo, membri ultimo');
let tot = 0, totM = 0;
for (const k of Object.keys(cfg)) { const X = indexSeries(IX[k]); const n = X.n.filter(Boolean).at(-1), m = X.members.filter(Boolean).at(-1); tot += n; totM += m; console.log(k.padEnd(9), cfg[k].blue, cfg[k].blueSource.padEnd(4), share(X.pct200, cfg[k].blue).toFixed(2).padStart(6), 'p3', pctl(X.pct200, 0.03).toFixed(2).padStart(6), 'round', Math.round(pctl(X.pct200, 0.03)), 'n', n, 'members', m, 'last', X.dates.at(-1)); }
console.log('totale n', tot, 'totale members', totM);
const ss = Object.keys(th.blue).map((k) => breadthSeries(br, k, sec.dates).n.filter(Boolean).at(-1)); console.log('somma membri settori', ss.reduce((a, b) => a + b, 0));
