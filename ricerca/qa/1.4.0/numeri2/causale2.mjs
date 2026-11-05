// Controllo numeri2: nessun dato futuro. Usa i moduli dell'app (è l'oggetto della prova): per molte date T taglia le serie a T
// e confronta z, F, stato, D, media 200, variazione a 63 sedute e forza relativa con quelli calcolati sulla storia completa.
// Uso: node causale2.mjs <sito>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const SITE = process.argv[2];
const E = await import(pathToFileURL(path.join(SITE, 'js/emerging.js')).href);
const J = JSON.parse(fs.readFileSync(path.join(SITE, 'data/emerging.json'), 'utf8'));
const CFG = JSON.parse(fs.readFileSync(path.join(SITE, 'config/emerging.json'), 'utf8'));
const cut = (s, T) => { const n = s.dates.filter((d) => d <= T).length; return { dates: s.dates.slice(0, n), val: s.val.slice(0, n), fred: s.fred }; };
const same = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-9);
const res = { fx: {}, dollar: null, rs: {} };
// cambi: tutte le date degli ultimi 3 anni più tutte quelle della coda di Yahoo, e una ogni 5 prima
for (const k of CFG.order) {
  const c = CFG.indices[k]; if (!c.fx) continue;
  const raw = E.emSeries(J.series[c.fx]);
  const full = E.cleanFx(c.fx, raw), F = E.fxSignals(full);
  let n = 0, diff = [];
  full.dates.forEach((T, i) => {
    if (!(T >= '2023-11-01' || i % 5 === 0)) return;
    const C = E.cleanFx(c.fx, cut(raw, T)), G = E.fxSignals(C), j = C.dates.length - 1;
    n++;
    if (C.dates[j] !== T) { diff.push({ T, why: 'giorno tolto solo con il dato dopo', cut: C.dates[j] }); return; }
    if (!same(G.z[j], F.z[i]) || G.F[j] !== F.F[i]) diff.push({ T, zCut: G.z[j], zFull: F.z[i], Fcut: G.F[j], Ffull: F.F[i] });
  });
  res.fx[k] = { prove: n, diversi: diff.length, elenco: diff.slice(0, 10) };
}
// dollaro
{
  const raw = E.emSeries(J.series[CFG.fred]), full = E.plain(CFG.fred, raw), D = E.dollarSignals(full);
  let n = 0; const diff = [];
  full.dates.forEach((T, i) => {
    if (i % 3) return; n++;
    const C = E.plain(CFG.fred, cut(raw, T)), G = E.dollarSignals(C), j = C.dates.length - 1;
    if (G.D[j] !== D.D[i] || !same(G.sma[j], D.sma[i]) || !same(G.ch[j], D.ch[i])) diff.push({ T });
  });
  res.dollar = { prove: n, diversi: diff.length, elenco: diff.slice(0, 10) };
}
// forza relativa: per ogni settimana (ultima seduta comune) la scia completa contro il taglio a quella seduta
{
  const acwi = E.emSeries(J.series[CFG.benchmark]);
  for (const k of CFG.order) {
    const etf = E.emSeries(J.series[CFG.indices[k].etf]);
    const full = E.relStrength(etf, acwi, 100000);
    let n = 0; const diff = [];
    for (const [x, y, T] of full.trail.filter((_, q) => q % 2 === 0)) {
      const r = E.relStrength(cut(etf, T), cut(acwi, T));
      n++;
      if (!r || r.last !== T || !same(r.ratio, x) || !same(r.mom, y)) diff.push({ T, full: [x, y], cut: r && [r.ratio, r.mom, r.last] });
    }
    res.rs[k] = { prove: n, diversi: diff.length, elenco: diff.slice(0, 5) };
  }
}
console.log(JSON.stringify(res, null, 1));
