import fs from 'fs'; import path from 'path';
const SITE = process.env.SITE || path.resolve(import.meta.dirname, '../../../..');
const V = await import(path.join(SITE, 'js/vix.js'));
const D = JSON.parse(fs.readFileSync(path.join(SITE, 'data/vix.json')));
const A = V.align(V.vxSeries(D.series.SPX), V.vxSeries(D.series.VIX));
for (const X of [20, 25, 40]) for (const e of V.episodes(A, X)) console.log(X, e.date, e.vix, e.vixMax, e.maxDate, e.end, e.sessions, e.crisis);
