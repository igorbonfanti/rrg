// Controllo testi 1.4.0: inizio di ogni serie di data/emerging.json, errori di stampa tolti, stato attuale (calcolo dell'app).
// Uso: node ricerca/qa/1.4.0/testi/serie.mjs [percorso di emerging.json]
import fs from 'node:fs';
const W = new URL('../../../../', import.meta.url).pathname;
const E = await import(W + 'js/emerging.js');
const file = process.argv[2] || W + 'data/emerging.json';
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const cfg = JSON.parse(fs.readFileSync(W + 'config/emerging.json', 'utf8'));
console.log('asOf', JSON.stringify(d.asOf));
for (const [sym, x] of Object.entries(d.series)) {
  const s = E.emSeries(x);
  let maxGap = 0, at = null;
  for (let i = 1; i < s.dates.length; i++) { const g = (Date.parse(s.dates[i]) - Date.parse(s.dates[i - 1])) / 864e5; if (g > maxGap) { maxGap = g; at = s.dates[i]; } }
  const line = [sym.padEnd(11), s.dates[0], '→', s.dates.at(-1), 'righe', s.dates.length, 'buco max', maxGap, 'gg al', at];
  if (/=X/.test(sym)) { const C = E.cleanFx(sym, s); line.push('| tolti', C.removed.length, C.removed.map((r) => r.date).join(',')); }
  console.log(line.join(' '));
}
// stato attuale della valuta e del dollaro, prima data con z e con F
for (const k of cfg.order) {
  const c = cfg.indices[k]; if (!c.fx || c.peg) continue;
  const C = E.cleanFx(c.fx, E.emSeries(d.series[c.fx])), f = E.fxSignals(C), j = C.dates.length - 1;
  const fz = f.z.findIndex((v) => v != null), fF = f.F.findIndex((v) => v != null);
  const onF = f.F.reduce((a, v) => a + (v === 1), 0), onC = f.z.reduce((a, v, i) => a + (v != null && v >= 1 && f.F[i] === 0), 0), def = f.F.filter((v) => v != null).length;
  console.log(k, c.fx, 'z', f.z[j]?.toFixed(3), 'F', f.F[j], 'stato', E.fxState(f.F[j], f.z[j]), 'al', C.dates[j], '| primo z', C.dates[fz], 'primo F', C.dates[fF], `| F acceso ${onF}/${def}, calo forte ${onC}/${def}`);
}
const D = E.plain('DTWEXEMEGS', E.emSeries(d.series.DTWEXEMEGS)), ds = E.dollarSignals(D), j = D.dates.length - 1;
console.log('DTWEXEMEGS', D.val[j], 'sma', ds.sma[j]?.toFixed(3), 'ch63', ds.ch[j]?.toFixed(2), 'D', ds.D[j], 'al', D.dates[j], '| primo D', D.dates[ds.D.findIndex((v) => v != null)]);
