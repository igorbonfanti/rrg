// Il porting in js/emerging.js dà gli stessi F e D del backtest. Dalla 1.4.0 i cambi sono quelli della Fed (FRED H.10):
// F dell'app, calcolato su data/emerging.json (Fed fino al campo `fred`, poi la coda di Yahoo), contro F del backtest sui
// cambi della Fed della cache (node ricerca/emergenti/backtest/script/scarica.mjs), alle stesse date fino a `fred`.
// D: stesso calcolo sulla stessa serie DTWEXEMEGS.
// Uso: node ricerca/emergenti/verifica_porting.mjs
import fs from 'node:fs';
const W = new URL('../../', import.meta.url).pathname;
const B = await import(W + 'ricerca/emergenti/backtest/script/backtest.mjs');
const E = await import(W + 'js/emerging.js');
const cache = (s) => JSON.parse(fs.readFileSync(W + 'ricerca/emergenti/cache/' + s.replace(/[^A-Za-z0-9]/g, '_') + '.json'));
const EM = JSON.parse(fs.readFileSync(W + 'data/emerging.json'));
let diff = 0, tot = 0;
for (const s of ['CNY=X', 'INR=X', 'BRL=X', 'KRW=X', 'TWD=X']) {
  const A = E.cleanFx(s, E.emSeries(EM.series[s])), Fa = E.fxSignals(A).F, at = new Map(A.dates.map((d, i) => [d, Fa[i]]));
  const rows = cache(B.FRED_CCY[s]).rows.filter((r) => r[0] >= '2000-01-01' && r[1] > 0);
  const Sb = E.plain(s, { dates: rows.map((r) => r[0]), val: rows.map((r) => r[1]) }), Fb = B.computeF(Sb);
  let n = 0, d = 0;
  Sb.dates.forEach((x, i) => { if (x > A.fred || !at.has(x)) return; n++; if (at.get(x) !== Fb[i]) d++; });
  tot += n; diff += d;
  console.log(s, `date confrontate ${n}, F diverse ${d}; Fed fino al ${A.fred}, coda di Yahoo ${A.dates.filter((x) => x > A.fred).length} sedute (tolte ${A.removed.length}); F oggi ${Fa.at(-1)}`);
}
const rows = cache('DTWEXEMEGS').rows, S = E.plain('DTWEXEMEGS', { dates: rows.map((r) => r[0]), val: rows.map((r) => r[1]) });
const Db = B.computeD(S), De = E.dollarSignals(S).D; let dd = 0; Db.forEach((v, i) => { if (v !== De[i]) dd++; });
console.log('F diverse', diff, 'su', tot, '| D diverse', dd, 'su', Db.length);
