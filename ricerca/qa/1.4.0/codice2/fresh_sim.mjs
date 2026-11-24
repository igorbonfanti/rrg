// fresh_sim.mjs — check_fresh.js (staleData) sui campi della vista Emergenti per ogni giorno di corsa degli ultimi 3 anni,
// in condizioni normali: nessuna fonte giù. Ipotesi (prudenti):
// - seduta USA (breadth, ETF): l'ultima seduta di ACWI prima del giorno della corsa (la corsa delle 22:40 UTC può non averla);
// - cambi di Yahoo: l'ultimo giorno feriale prima del giorno della corsa;
// - FRED (DTWEXEMEGS e parte Fed dei cambi): un valore del giorno d è disponibile dal martedì della settimana dopo (come
//   availFRED del backtest: la Fed pubblica il lunedì pomeriggio, il martedì con un lunedì festivo), con le date vere di FRED.
// Conta i giorni in cui l'esito fallirebbe per i soli dati degli emergenti.
// Uso: node fresh_sim.mjs <copia> <emerging.json>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const [DIR, F] = process.argv.slice(2);
const { staleData } = await import(pathToFileURL(`${DIR}/scripts/check_fresh.js`).href);
const { emSeries } = await import(pathToFileURL(`${DIR}/js/emerging.js`).href);
const em = JSON.parse(fs.readFileSync(F, 'utf8'));
const us = emSeries(em.series.ACWI).dates, dtw = emSeries(em.series.DTWEXEMEGS).dates, fed = emSeries(em.series['KRW=X']);
const fedDates = fed.dates.filter((d) => d <= fed.fred);
const avail = (d) => { const x = new Date(d + 'T12:00:00Z'), dow = x.getUTCDay(); x.setUTCDate(x.getUTCDate() + (((8 - dow) % 7) || 7) + 1); return x.toISOString().slice(0, 10); };
const lastBefore = (arr, d, f = (x) => x < d) => { let r = null; for (const x of arr) { if (f(x)) r = x; else break; } return r; };
const iso = (t) => new Date(t).toISOString().slice(0, 10);
let runs = 0, bad = 0, maxFred = 0; const ex = [];
for (let t = Date.parse('2023-11-01'); t <= Date.parse('2026-10-30'); t += 864e5) {
  const D = iso(t), dow = new Date(t).getUTCDay();
  if (dow === 0) continue; // nessuna corsa la domenica (cron 1-5 e 2-6)
  const B = lastBefore(us, D);
  let wd = t - 864e5; while ([0, 6].includes(new Date(wd).getUTCDay())) wd -= 864e5;
  const fx = iso(wd);
  const fr = lastBefore(dtw, D, (x) => avail(x) <= D), fd = lastBefore(fedDates, D, (x) => avail(x) <= D);
  maxFred = Math.max(maxFred, (Date.parse(D) - Date.parse(fr)) / 864e5);
  const p = staleData({ breadth: { asOf: B }, emerging: { asOf: { fx, etf: B, fred: fr }, missing: [] }, emergingLast: { 'KRW=X': fx, ASHR: B }, emergingFed: { 'KRW=X': fd } }, D)
    .filter((x) => !/^breadth/.test(x));
  runs++;
  if (p.length) { bad++; if (ex.length < 8) ex.push(`${D}: ${p.join(' | ')}`); }
}
console.log(`${runs} giorni di corsa simulati, ${bad} con un allarme degli emergenti; età massima di FRED ${maxFred} giorni`);
for (const x of ex) console.log('  ' + x);
