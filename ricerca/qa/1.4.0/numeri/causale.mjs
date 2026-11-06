// Controllo numeri 1.4.0 · «nessun dato futuro»: stato della valuta, z, D e forza relativa a una seduta t calcolati
// dall'app (js/emerging.js) con la storia completa e con la storia tagliata a t devono coincidere.
// Qui si importa di proposito il modulo dell'app: si prova il suo codice, non si ricalcolano i numeri.
// Uso: node ricerca/qa/1.4.0/numeri/causale.mjs <cartella del sito>
import fs from 'node:fs';
import path from 'node:path';
const SITE = path.resolve(process.argv[2]);
const E = await import(path.join(SITE, 'js/emerging.js'));
const data = JSON.parse(fs.readFileSync(path.join(SITE, 'data/emerging.json')));
const cut = (s, n) => ({ dates: s.dates.slice(0, n), val: s.val.slice(0, n) });
const out = {};
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (const sym of ['CNY=X', 'INR=X', 'BRL=X', 'KRW=X', 'TWD=X']) {
  const raw = E.emSeries(data.series[sym]);
  const C = E.cleanFx(sym, raw), full = E.fxSignals(C);
  const at = new Map(C.dates.map((d, i) => [d, i]));
  let n = 0, diff = [], zdiff = 0;
  // tutte le sedute degli ultimi 3 anni più 150 a caso prima
  const idx = [];
  for (let i = raw.dates.length - 780; i < raw.dates.length; i++) idx.push(i);
  for (let q = 0; q < 150; q++) idx.push(800 + Math.floor(rnd() * (raw.dates.length - 1600)));
  for (const i of idx) {
    const d = raw.dates[i];
    const Ct = E.cleanFx(sym, cut(raw, i + 1)), part = E.fxSignals(Ct);
    const jt = Ct.dates.length - 1, jf = at.get(d);
    const sPart = Ct.dates[jt] === d ? E.fxState(part.F[jt], part.z[jt]) : 'riga diversa';
    const sFull = jf == null ? 'tolta (errore)' : E.fxState(full.F[jf], full.z[jf]);
    n++;
    if (sPart !== sFull) diff.push([d, 'tagliata a t:', sPart, 'completa:', sFull]);
    else if (jf != null && part.z[jt] != null && Math.abs(part.z[jt] - full.z[jf]) > 1e-9) zdiff++;
  }
  out[sym] = { prove: n, stati_diversi: diff.length, z_diversi: zdiff, esempi: diff.slice(0, 15) };
  console.log(sym, out[sym].prove, 'prove ·', diff.length, 'stati diversi ·', zdiff, 'z diversi', diff.slice(0, 6));
}
// D del dollaro
{
  const raw = E.emSeries(data.series.DTWEXEMEGS), S = E.plain('DTWEXEMEGS', raw), full = E.dollarSignals(S);
  let bad = 0, n = 0;
  for (let i = raw.dates.length - 800; i < raw.dates.length; i++) {
    const p = E.dollarSignals(E.plain('x', cut(raw, i + 1)));
    n++; if (p.D[i] !== full.D[i] || p.sma[i] !== full.sma[i] || p.ch[i] !== full.ch[i]) bad++;
  }
  out.DTWEXEMEGS = { prove: n, diversi: bad }; console.log('DTWEXEMEGS', n, 'prove ·', bad, 'diversi');
}
// forza relativa: punto della settimana chiusa a t con la storia tagliata a t contro la storia completa
{
  const A = E.emSeries(data.series.ACWI), res = {};
  for (const etf of ['ASHR', 'INDA', 'EWZ', 'EWY', 'EWT', 'EWH', 'EEM']) {
    const X = E.emSeries(data.series[etf]);
    const full = E.relStrength(X, A, 400);
    const byDate = new Map(full.trail.map((p) => [p[2], p]));
    let n = 0, bad = 0;
    for (const p of full.trail.slice(-200, -1)) {
      const d = p[2], k = X.dates.indexOf(d), m = A.dates.indexOf(d);
      const part = E.relStrength(cut(X, k + 1), cut(A, m + 1));
      n++; if (Math.abs(part.ratio - p[0]) > 1e-9 || Math.abs(part.mom - p[1]) > 1e-9) bad++;
    }
    res[etf] = { prove: n, diversi: bad };
  }
  out.rs = res; console.log('RS', JSON.stringify(res));
}
fs.writeFileSync(new URL('./causale.json', import.meta.url), JSON.stringify(out, null, 1));
