// Errori di stampa del cambio che la pulizia di js/emerging.js lascia passare (TWD 25/10/2011 e 31/12/2014, CNY 18/07/2011)
// e loro effetto su z, sulle bande della valuta e sulla scala del grafico. Uso: node ricerca/qa/1.4.0/grafici/stampe-cambio.mjs
import fs from 'node:fs';
// codice dell'app da usare: APP=/percorso/della/copia/ (con la barra finale; di partenza il repository). Per la 1.4.0 controllata
// serve il codice del commit afc06f3 (la copia servita), non quello in lavorazione.
const APP = process.env.APP ? 'file://' + process.env.APP : new URL('../../../../', import.meta.url).href;
const { emSeries, cleanFx, fxSignals, breaks } = await import(APP + 'js/emerging.js');
const E = JSON.parse(fs.readFileSync(new URL('../../../../data/emerging.json', import.meta.url)));
for (const [sym, bad] of [['TWD=X', ['2011-10-25', '2014-12-31']], ['CNY=X', ['2011-07-18']]]) {
  const C = cleanFx(sym, emSeries(E.series[sym])), A = fxSignals(C);
  const keep = C.dates.map((d) => !bad.includes(d));
  const C2 = { ...C, dates: C.dates.filter((_, i) => keep[i]), val: C.val.filter((_, i) => keep[i]) }; C2.brk = breaks(C2.dates);
  const B = fxSignals(C2), m = new Map(C2.dates.map((d, i) => [d, i]));
  let diffState = 0, firstD = null, lastD = null, sdr = [];
  const st = (F, z) => (F == null || z == null ? null : F ? 'ferma' : z >= 1 ? 'calo' : 'normale');
  C.dates.forEach((d, i) => { const j = m.get(d); if (j == null) return; if (st(A.F[i], A.z[i]) !== st(B.F[j], B.z[j])) { diffState++; firstD ??= d; lastD = d; } if (A.sd[i] && B.sd[j]) sdr.push(A.sd[i] / B.sd[j]); });
  console.log(`${sym}: stampe ${bad.map((d) => d + '=' + C.val[C.dates.indexOf(d)]).join(', ')} restano dopo la pulizia; sedute con lo stato della valuta diverso se tolte: ${diffState} (dal ${firstD} al ${lastD}); deviazione standard gonfiata fino a ${Math.max(...sdr).toFixed(1)} volte`);
}
// effetto nel periodo 10A di TWN (dal 04/11/2016)
{
  const C = cleanFx('TWD=X', emSeries(E.series['TWD=X'])), A = fxSignals(C);
  const bad = ['2011-10-25', '2014-12-31'], keep = C.dates.map((d) => !bad.includes(d));
  const C2 = { ...C, dates: C.dates.filter((_, i) => keep[i]), val: C.val.filter((_, i) => keep[i]) }; C2.brk = breaks(C2.dates);
  const B = fxSignals(C2), m = new Map(C2.dates.map((d, i) => [d, i]));
  const st = (F, z) => (F == null || z == null ? null : F ? 'ferma' : z >= 1 ? 'calo' : 'normale');
  const cnt = {};
  C.dates.forEach((d, i) => { if (d < '2016-11-04') return; const j = m.get(d); const a = st(A.F[i], A.z[i]), b = st(B.F[j], B.z[j]); if (a !== b) { const k = `${a}→${b}`; cnt[k] = (cnt[k] || 0) + 1; } });
  console.log('TWN 10A: sedute disegnate con uno stato diverso da quello senza le due stampe (app→corretto):', JSON.stringify(cnt));
}
