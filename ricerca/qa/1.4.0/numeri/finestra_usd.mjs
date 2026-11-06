// Controllo numeri 1.4.0 · «3 mesi in $» quando il cambio manca all'ultima seduta dell'indice (es. Venerdì Santo a Londra,
// borsa coreana aperta). Usa le funzioni esportate dell'app (change, inUsd, onDates, cleanFx) su dati tagliati a quel giorno.
// Uso: node ricerca/qa/1.4.0/numeri/finestra_usd.mjs <cartella del sito>
import fs from 'node:fs'; import path from 'node:path';
const SITE = path.resolve(process.argv[2]);
const E = await import(path.join(SITE, 'js/emerging.js'));
const { indexSeries } = await import(path.join(SITE, 'js/indexdata.js'));
const data = JSON.parse(fs.readFileSync(path.join(SITE, 'data/emerging.json')));
const IX = { ...JSON.parse(fs.readFileSync(path.join(SITE, 'data/indices_more.json'))).series, ...JSON.parse(fs.readFileSync(path.join(SITE, 'data/indices.json'))).series };
const cases = [['KOSPI200', 'KRW=X'], ['TWN', 'TWD=X'], ['NIFTY50', 'INR=X'], ['IBOV', 'BRL=X'], ['CSI300', 'CNY=X'], ['HSI', 'HKD=X']];
let n = 0;
for (const [k, sym] of cases) {
  const X = indexSeries(IX[k]), C = E.cleanFx(sym, E.emSeries(data.series[sym]));
  const fxOn = E.onDates(C.dates, C.val, X.dates);
  for (let t = X.dates.length - 780; t < X.dates.length; t++) {
    if (fxOn[t] != null) continue;
    const close = X.close.slice(0, t + 1), usd = E.inUsd(close, fxOn.slice(0, t + 1));
    let u = t; while (u >= 0 && usd[u] == null) u--;
    const loc = E.change(close, 63), inus = E.change(usd, 63);
    if (n++ < 12) console.log(`${k} ${X.dates[t]}: 3 mesi locale ${loc.toFixed(2)}% (${X.dates[t - 63]}→${X.dates[t]}) · in $ ${inus == null ? '—' : inus.toFixed(2) + '%'} (${X.dates[u - 63]}→${X.dates[u]})`);
  }
}
console.log('giorni (ultimi 3 anni, 6 indici) in cui la colonna «in $» finirebbe a una seduta diversa da «locale»:', n);
