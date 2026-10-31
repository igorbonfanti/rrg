// Quanto alza la breadth ricostruire il passato con i membri di oggi? Prova sul Nasdaq-100, l'unico indice con la
// composizione di ogni data e una lista dei membri di oggi: breadth dell'app (data/indices.json, membri d'epoca) contro la
// breadth degli stessi giorni calcolata con i membri di oggi (data/index_members/NDX.json), alle date trimestrali dal 2008.
// Stessa regola dell'app: chiusura rettificata per gli split sopra la media delle ultime 200 chiusure, con almeno 200
// chiusure e l'ultima entro 7 giorni.
// Uso: node ricerca/indici/script/membri_oggi_ndx.mjs [cartella cache]   (scarica i prezzi da Yahoo la prima volta)
// Scrive ricerca/indici/membri_oggi_ndx.json con la tabella delle date e il riassunto citato nel README e nell'app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from '../../../scripts/lib/yahoo.js';
import { indexSeries } from '../../../js/indexdata.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CACHE = path.resolve(process.argv[2] || path.join(ROOT, '..', 'ndx-cache'));
fs.mkdirSync(CACHE, { recursive: true });
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const ndx = indexSeries(read('data/indices.json').series.NDX);
const today = read('data/index_members/NDX.json');
const pos = new Map(ndx.dates.map((d, i) => [d, i]));
// 15 gennaio, aprile, luglio, ottobre (o la seduta prima) dal 2008, finché c'è la breadth d'epoca
const dates = [];
for (let y = 2008; y <= 2026; y++) for (const m of ['01', '04', '07', '10']) {
  let i = ndx.dates.findLastIndex((d) => d <= `${y}-${m}-15`);
  if (i >= 0 && ndx.pct200[i] != null && ndx.dates[i] >= `${y}-${m}-08`) dates.push(ndx.dates[i]);
}

const px = {};
await mapLimit(today.tickers, 4, async (s) => {
  const f = path.join(CACHE, s + '.json');
  if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(await fetchDaily(s, { period1: 1104537600 }).catch(() => null)));
  px[s] = JSON.parse(fs.readFileSync(f, 'utf8'));
});
const DAY = 864e5;
function above(s, date) {
  const p = px[s];
  if (!p || !p.dates.length) return null;
  const i = p.dates.findLastIndex((d) => d <= date);
  if (i < 199 || (Date.parse(date) - Date.parse(p.dates[i])) / DAY > 7) return null;
  let sum = 0;
  for (let k = i - 199; k <= i; k++) sum += p.close[k];
  return p.close[i] > sum / 200;
}
const rows = dates.map((d) => {
  const a = today.tickers.map((s) => above(s, d)).filter((x) => x != null);
  const oggi = (100 * a.filter(Boolean).length) / a.length;
  const epoca = ndx.pct200[pos.get(d)];
  return { date: d, epoca: +epoca.toFixed(1), oggi: +oggi.toFixed(1), coperti: a.length, scarto: +(oggi - epoca).toFixed(1) };
});
const sc = rows.map((r) => r.scarto).sort((a, b) => a - b);
const mid = sc.length >> 1;
const summary = {
  date: rows.length, membriOggi: today.tickers.length, listaAl: today.asOf,
  media: +(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1),
  mediana: +(sc.length % 2 ? sc[mid] : (sc[mid - 1] + sc[mid]) / 2).toFixed(1), min: sc[0], max: sc.at(-1),
};
// vicino ai minimi: le date con la breadth d'epoca sotto il 20%
const low = rows.filter((r) => r.epoca < 20);
summary.sotto20 = { date: low.length, media: low.length ? +(low.reduce((a, r) => a + r.scarto, 0) / low.length).toFixed(1) : null };
for (const r of rows) console.log(r.date, String(r.epoca).padStart(5), String(r.oggi).padStart(5), String(r.coperti).padStart(4), (r.scarto >= 0 ? '+' : '') + r.scarto);
console.log(summary);
fs.writeFileSync(path.join(ROOT, 'ricerca/indici/membri_oggi_ndx.json'), JSON.stringify({ metodo: 'vedi script/membri_oggi_ndx.mjs', summary, rows }, null, 1) + '\n');
