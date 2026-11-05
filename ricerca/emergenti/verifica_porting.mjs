// Il porting in js/emerging.js dà gli stessi F e D del backtest sugli stessi dati (cache del backtest: node ricerca/emergenti/backtest/script/scarica.mjs).
// Uso: node ricerca/emergenti/verifica_porting.mjs (risultato del 05/11/2026: F diverse 0 su 29158, D diverse 0 su 5222)
import fs from 'node:fs';
const W = new URL('../../', import.meta.url).pathname;
const B = await import(W + 'ricerca/emergenti/backtest/script/backtest.mjs');
const E = await import(W + 'js/emerging.js');
const cache = (s) => JSON.parse(fs.readFileSync(W + 'ricerca/emergenti/cache/' + s.replace(/[^A-Za-z0-9]/g, '_') + '.json'));
let diff = 0, tot = 0;
for (const s of ['CNY=X', 'INR=X', 'BRL=X', 'KRW=X', 'TWD=X']) {
  const rows = cache(s).rows, S = E.cleanFx(s, { dates: rows.map((r) => r[0]), val: rows.map((r) => r[1]) });
  const Fb = B.computeF(S), Fe = E.fxSignals(S).F;
  for (let i = 0; i < Fb.length; i++) { tot++; if (Fb[i] !== Fe[i]) diff++; }
  console.log(s, 'righe tolte', S.removed.length, 'F ultimo', Fe.at(-1), S.dates.at(-1));
}
const rows = cache('DTWEXEMEGS').rows, S = E.plain('DTWEXEMEGS', { dates: rows.map((r) => r[0]), val: rows.map((r) => r[1]) });
const Db = B.computeD(S), De = E.dollarSignals(S).D; let dd = 0; Db.forEach((v, i) => { if (v !== De[i]) dd++; });
console.log('F diverse', diff, 'su', tot, '| D diverse', dd, 'su', Db.length);
