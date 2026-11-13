// data/ath_history.json decodificato con le funzioni dell'app (decodeDates, deltaDecode di js/indexdata.js), confrontato
// con il ricalcolo indipendente (ricalcolo.json) e con le chiusure di Yahoo salvate da verifica_ath.py (cache/Y_*.json).
// Uso: node ricerca/qa/1.10.0/numeri/storico_js.mjs (dalla radice del repository)
import fs from 'node:fs';
import { decodeDates, deltaDecode } from '../../../../js/indexdata.js';
const Q = new URL('.', import.meta.url).pathname, ROOT = new URL('../../../../', import.meta.url).pathname;
const H = JSON.parse(fs.readFileSync(ROOT + 'data/ath_history.json')), R = JSON.parse(fs.readFileSync(Q + 'ricalcolo.json'));
const C = JSON.parse(fs.readFileSync(ROOT + 'config/ath.json')).markets;
let bad = 0, n = 0;
for (const c of C) {
  const x = H.series[c.id], d = decodeDates(x.d0, x.gaps), v = deltaDecode(x.cd, x.ps), s = R[c.id];
  const y = JSON.parse(fs.readFileSync(`${Q}cache/Y_${c.symbol.replace('^', '_').replace('=', '_')}.json`)).chart.result[0];
  const tz = y.meta.exchangeTimezoneName, f = new Intl.DateTimeFormat('en-CA', { timeZone: tz });
  const yc = new Map(); y.timestamp.forEach((t, i) => { const c2 = y.indicators.quote[0].close[i]; if (c2 != null) yc.set(f.format(t * 1000), c2); });
  let worst = 0, absent = 0;
  d.forEach((dd, i) => { n++; if (!yc.has(dd)) { absent++; return; } worst = Math.max(worst, Math.abs(yc.get(dd) - v[i])); });
  const w = d.map((dd, i) => [dd, v[i]]).filter(([dd]) => dd >= s.from), mx = w.reduce((a, b) => (b[1] > a[1] ? b : a));
  const okk = d.length === v.length && absent === 0 && worst <= 0.5 / x.ps + 1e-4 && d.at(-1) === s.lastDate && Math.abs(v.at(-1) - s.last) <= 0.5 / x.ps + 1e-9 && mx[0] === s.refDate && Math.abs(mx[1] - s.ref) <= 0.5 / x.ps + 1e-9;
  bad += !okk;
  console.log(`${okk ? 'OK' : 'NO'} ${c.id}: ${d.length} sedute ${d[0]}→${d.at(-1)}, assenti in Yahoo ${absent}, scarto massimo ${worst.toFixed(5)} (ps ${x.ps}), ultima ${v.at(-1)}, massimo 3 anni ${mx[1]} il ${mx[0]}`);
}
console.log(`storico decodificato con js/indexdata.js: ${n} valori, mercati non coerenti ${bad}`);
