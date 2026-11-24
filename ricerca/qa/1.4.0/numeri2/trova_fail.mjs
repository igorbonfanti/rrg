// Trova le ultime sedute in cui un indice emergente era «fail» (Fallito) o «trig»/«cool», con i moduli dell'app (solo per scegliere le date da simulare)
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const SITE = process.argv[2];
const imp = (f) => import(pathToFileURL(path.join(SITE, f)).href);
const { indexSeries } = await imp('js/indexdata.js'); const { runMachine, priceSeries, DEFAULT_PARAMS } = await imp('js/signals.js');
const R = (f) => JSON.parse(fs.readFileSync(path.join(SITE, f), 'utf8'));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params }, CFG = R('config/indices.json').indices;
const IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
for (const k of ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM']) {
  const X = indexSeries(IX[k]), m = runMachine(priceSeries(X.close), X, CFG[k].blue, P);
  const last = (code) => { for (let t = m.days.length - 1; t >= 0; t--) if (m.days[t] === code) return X.dates[t]; return null; };
  console.log(k, 'fail', last('fail'), 'trig', last('trig'), 'cool', last('cool'), 'setup', last('setup'));
}
