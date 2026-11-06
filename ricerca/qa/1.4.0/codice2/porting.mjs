// porting.mjs — le definizioni dell'app (js/emerging.js) contro quelle del backtest (ricerca/emergenti/backtest/script/backtest.mjs)
// sulle stesse serie del file data/emerging.json: F e z dei cambi (parte Fed + coda di Yahoo, pulita come nell'app) e D del
// dollaro emergente. Tutto dalla copia del repository passata come argomento (serve ricerca/emergenti/cache nella copia).
// Uso: node porting.mjs <copia> <emerging.json>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const [DIR, F] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(`${DIR}/${p}`).href);
const app = await imp('js/emerging.js');
const bt = await imp('ricerca/emergenti/backtest/script/backtest.mjs');
const em = JSON.parse(fs.readFileSync(F, 'utf8'));
let checks = 0, diff = 0;
for (const sym of ['CNY=X', 'INR=X', 'BRL=X', 'KRW=X', 'TWD=X', 'HKD=X']) {
  const S = app.cleanFx(sym, app.emSeries(em.series[sym]));
  const a = app.fxSignals(S).F, b = bt.computeF(S);
  let d = 0; a.forEach((v, i) => { checks++; if (v !== b[i]) d++; });
  diff += d;
  console.log(`${sym}: F su ${a.length} sedute, ${d} diverse; F=1 ${a.filter((x) => x === 1).length}, F=0 ${a.filter((x) => x === 0).length}`);
}
const DS = app.plain('DTWEXEMEGS', app.emSeries(em.series.DTWEXEMEGS));
const a = app.dollarSignals(DS).D, b = bt.computeD(DS);
let d = 0; a.forEach((v, i) => { checks++; if (v !== b[i]) d++; });
diff += d;
console.log(`DTWEXEMEGS: D su ${a.length} sedute, ${d} diverse`);
console.log(`${checks} confronti, ${diff} diversi`);
process.exit(0);
