// Statistiche degli episodi per soglia (durata, episodi di una seduta, in corso) dai moduli dell'app e da data/vix.json
import fs from 'fs'; import path from 'path';
const SITE = process.env.SITE || path.resolve(import.meta.dirname, '../../../..');
const V = await import(path.join(SITE, 'js/vix.js'));
const D = JSON.parse(fs.readFileSync(path.join(SITE, 'data/vix.json')));
for (const ix of ['SPX', 'NDX']) {
  const A = V.align(V.vxSeries(D.series[ix]), V.vxSeries(D.series.VIX)), n = A.vix.length;
  for (const X of V.XS) {
    const E = V.episodes(A, X);
    const s = E.map((e) => e.sessions).sort((a, b) => a - b);
    const one = E.filter((e) => e.sessions === 1).length, open = E.filter((e) => e.endP + 63 > n - 1);
    const win = E.map((e) => Math.min(n - 1, e.endP + 21) - Math.max(0, e.p - 63) + 1);
    console.log(ix, X, `episodi ${E.length}`, `sedute min ${s[0]} mediana ${s[s.length >> 1]} max ${s[s.length - 1]}`, `una seduta ${one}`, `finestra mini-grafico max ${Math.max(...win)} sedute (${(150 / Math.max(...win)).toFixed(3)} px/seduta)`, open.length ? `in corso: ${open.map((e) => e.date + '→' + e.end).join(', ')}` : '', `ultima seduta ${A.dates[n - 1]}`);
    if (X <= 25) console.log('   lunghi:', E.filter((e) => e.sessions > 500).map((e) => `${e.date}→${e.end} (${e.sessions}, max ${e.vixMax} il ${e.maxDate}, crisi ${e.crisis})`).join('; '));
  }
}
