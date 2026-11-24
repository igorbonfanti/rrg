/*
 * prestazioni.mjs — tempo e memoria di parse (vecchio e nuovo) su un carico come quello di fetch_breadth (~4.000 titoli).
 * Caso realistico: stessi timestamp per tutti i titoli (barre alle 9:30 di New York), ultima barra diversa per titolo.
 * Caso peggiore: timestamp tutti diversi tra titoli (la cache per timestamp non serve e cresce).
 * Uso: node --expose-gc prestazioni.mjs <file grezzo chart v8 (es. p2001_SPY.json)> [titoli]
 */
import fs from 'node:fs';
import * as NEW from '../../../../scripts/lib/yahoo.js';
import * as OLD from '../../date-barre/yahoo_prima.js';

const res = JSON.parse(fs.readFileSync(process.argv[2])).chart.result[0];
const N = +process.argv[3] || 4000;
const nowSec = Date.now() / 1000;
const variant = (k, worst) => ({ ...res, timestamp: res.timestamp.map((t, i) => (worst ? t + k : i === res.timestamp.length - 1 ? t + k : t)) });

function bench(M, worst) {
  global.gc();
  const h0 = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  let bars = 0;
  for (let k = 0; k < N; k++) bars += M.parse(variant(k, worst), { nowSec }).dates.length;
  const ms = performance.now() - t0;
  global.gc();
  return { ms: Math.round(ms), bars, heapMB: +((process.memoryUsage().heapUsed - h0) / 1e6).toFixed(1) };
}
console.log(`${res.timestamp.length} barre per titolo, ${N} titoli`);
console.log('vecchio, realistico', bench(OLD, false));
console.log('nuovo,   realistico', bench(NEW, false));
console.log('vecchio, peggiore  ', bench(OLD, true));
console.log('nuovo,   peggiore  ', bench(NEW, true), '(heap = crescita della cache rimasta dopo il gc)');
