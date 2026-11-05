// Riproduce le colonne «3 mesi locale» e «3 mesi in $» del tabellone (row() di js/emerging-view.js) con i dati del commit
// e mostra a quale seduta finisce ciascuna. Uso: node righe_tabellone.mjs <worktree> [data massima delle chiusure] [data massima dei cambi: simula la corsa delle 11:40 UTC]
import fs from 'node:fs';
const W = process.argv[2].replace(/\/?$/, '/'), cutAt = process.argv[3], fxCut = process.argv[4];
const E = await import(W + 'js/emerging.js'); const { indexSeries } = await import(W + 'js/indexdata.js');
const R = (f) => JSON.parse(fs.readFileSync(W + f));
const CFG = R('config/emerging.json'), EM = R('data/emerging.json');
const IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
for (const k of CFG.order) {
  const c = CFG.indices[k]; let s = indexSeries(IX[k]);
  let n = s.dates.length; if (cutAt) { while (n > 0 && s.dates[n - 1] > cutAt) n--; }
  const dates = s.dates.slice(0, n), close = s.close.slice(0, n);
  let raw = c.fx ? E.emSeries(EM.series[c.fx]) : null;
  if (raw && fxCut) { const m = raw.dates.filter((d) => d <= fxCut).length; raw = { dates: raw.dates.slice(0, m), val: raw.val.slice(0, m) }; }
  const fxS = raw ? E.cleanFx(c.fx, raw) : null;
  const fxOn = fxS ? E.onDates(fxS.dates, fxS.val, dates) : null;
  const usd = c.fx === null ? close : E.inUsd(close, fxOn);
  const lastLoc = close.length - 1; let lastU = usd.length - 1; while (lastU >= 0 && usd[lastU] == null) lastU--;
  const ch = E.change(close, 63), chu = E.change(usd, 63);
  // stesso giorno per le due colonne
  const chLocSame = lastU >= 63 && close[lastU - 63] != null ? (close[lastU] / close[lastU - 63] - 1) * 100 : null;
  console.log(`${k.padEnd(9)} locale ${ch?.toFixed(2).padStart(6)}% (fino al ${dates[lastLoc]}) · in $ ${chu?.toFixed(2).padStart(6)}% (fino al ${dates[lastU]})${dates[lastU] !== dates[lastLoc] ? ` · DATE DIVERSE: locale alla stessa data del $ ${chLocSame?.toFixed(2)}%` : ''}`);
}
