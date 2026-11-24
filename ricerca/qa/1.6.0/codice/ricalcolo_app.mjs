// Scrive le serie di context() di js/vix.js per ricalcolo.py. Uso: node ricalcolo_app.mjs <vix.json> <uscita.json>
import fs from 'node:fs';
import * as V from '../../../../js/vix.js';
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const A = V.align(V.vxSeries(D.series.SPX), V.vxSeries(D.series.VIX)), C = V.context(A, V.vxSeries(D.series.VIX3M), V.vxSeries(D.series.HYGIEF));
fs.writeFileSync(process.argv[3], JSON.stringify({ dates: A.dates, r: C.r, rPct: C.rPct, dd: C.dd, ch: C.ch, ddPct: C.ddPct }));
