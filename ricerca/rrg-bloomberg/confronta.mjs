// Confronto della nostra rotazione (js/engine.js) con una RRG di riferimento letta a parte.
// I valori di riferimento (Bloomberg, dati licenziati) NON stanno nel repository: si passano come file esterno.
// Uso: node ricerca/rrg-bloomberg/confronta.mjs <rif.json> [--json uscita.json]
//   rif.json: { head: {XLK:[x,y],...}, tail: {XLK:[[x,y] più vecchio, ..., [x,y] più recente prima della testa]} }
// Dati: ricerca/rrg-bloomberg/cache/yahoo.json (scarica.mjs). Stampa, per ogni combinazione di formula, prezzi,
// benchmark e ultima data: quadranti uguali, correlazioni di rango (Spearman) sui due assi, fattore di scala
// (pendenza della retta per (100,100)), direzione della coda (ultime 3 settimane) e i nostri valori.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, quadrant } from '../../js/engine.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ETF = ['XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU'];
const Y = JSON.parse(fs.readFileSync(path.join(DIR, 'cache', 'yahoo.json'), 'utf-8')).series;
const ref = process.argv[2] && process.argv[2] !== '--json' ? JSON.parse(fs.readFileSync(process.argv[2], 'utf-8')) : null;
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

// calendario comune (stesse sedute per tutti: si controlla)
const dates = Y.SPY.dates;
for (const s of [...ETF, '^GSPC']) if (Y[s].dates.join() !== dates.join()) throw new Error(`date diverse per ${s}`);

// prezzi: chiave → [campo ETF, simbolo benchmark, campo benchmark]
export const PRICES = {
  'adj/SPY': ['adjclose', 'SPY', 'adjclose'], // come l'app
  'prezzo/SPY': ['close', 'SPY', 'close'],
  'prezzo/^GSPC': ['close', '^GSPC', 'close'], // ETF solo prezzo contro indice di prezzo: il più vicino a S5xxxx/SPX
  'adj/^GSPC': ['adjclose', '^GSPC', 'close'], // ETF con dividendi contro indice di prezzo (benchmark come StockCharts)
};
function dataset(key, cutoff) {
  const [fe, b, fb] = PRICES[key];
  const n = dates.filter((d) => d <= cutoff).length;
  const tickers = { BENCH: { close: Y[b][fb].slice(0, n) } };
  for (const s of ETF) tickers[s] = { close: Y[s][fe].slice(0, n) };
  return { dates: dates.slice(0, n), tickers };
}

const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(a.length); o.forEach(([, i], k) => { r[i] = k + 1; }); return r; };
const pearson = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return c / Math.sqrt(va * vb); };
const spearman = (a, b) => pearson(rank(a), rank(b));
const slope0 = (ours, theirs) => { let num = 0, den = 0; for (let i = 0; i < ours.length; i++) { num += (ours[i] - 100) * (theirs[i] - 100); den += (ours[i] - 100) ** 2; } return num / den; };
const ang = (dx, dy) => Math.atan2(dy, dx) * 180 / Math.PI;
const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const CUTOFFS = { '10/11 in corso (lun-mar)': '2026-11-10', '09/11 in corso (lun)': '2026-11-09', '06/11 settimana chiusa': '2026-11-06' };
const rows = [];
for (const formula of ['nuova', 'semplice', 'classica']) for (const pk of Object.keys(PRICES)) for (const [ck, cut] of Object.entries(CUTOFFS)) {
  const m = build(dataset(pk, cut), { symbols: ETF, benchmark: 'BENCH', timeframe: 'weekly', formula });
  const L = m.dates.length - 1;
  const ours = Object.fromEntries(ETF.map((s) => [s, { x: m.series[s].x[L], y: m.series[s].y[L], x3: m.series[s].x[L - 3], y3: m.series[s].y[L - 3] }]));
  const row = { formula, prezzi: pk, fine: ck, ultimaBarra: m.dates[L], ours };
  if (ref) {
    const xo = ETF.map((s) => ours[s].x), yo = ETF.map((s) => ours[s].y), xb = ETF.map((s) => ref.head[s][0]), yb = ETF.map((s) => ref.head[s][1]);
    row.quadrantiUguali = ETF.filter((s) => quadrant(ours[s].x, ours[s].y) === quadrant(...ref.head[s])).length;
    row.diversi = ETF.filter((s) => quadrant(ours[s].x, ours[s].y) !== quadrant(...ref.head[s]));
    row.spearmanX = spearman(xo, xb); row.spearmanY = spearman(yo, yb);
    row.pearsonX = pearson(xo, xb); row.pearsonY = pearson(yo, yb);
    row.scalaX = slope0(xo, xb); row.scalaY = slope0(yo, yb); // quanto va moltiplicata la nostra distanza da 100
    // direzione della coda: dalla barra di 3 settimane prima alla testa
    const d = ETF.map((s) => { const t = ref.tail[s][0]; return angDiff(ang(ours[s].x - ours[s].x3, ours[s].y - ours[s].y3), ang(ref.head[s][0] - t[0], ref.head[s][1] - t[1])); });
    row.codaEntro45 = d.filter((v) => v <= 45).length; row.codaEntro90 = d.filter((v) => v <= 90).length; row.codaScarti = d.map((v) => Math.round(v));
    row.siParlano = row.quadrantiUguali >= 9 && row.spearmanX >= 0.8 && row.spearmanY >= 0.8;
  }
  rows.push(row);
}
const f2 = (v) => (v == null ? '—' : v.toFixed(2));
for (const r of rows) {
  const head = `${r.formula.padEnd(8)} ${r.prezzi.padEnd(13)} ${r.fine.padEnd(26)}`;
  if (ref) console.log(`${head} quadr ${r.quadrantiUguali}/11  ρx ${f2(r.spearmanX)} ρy ${f2(r.spearmanY)}  rx ${f2(r.pearsonX)} ry ${f2(r.pearsonY)}  scala ×${f2(r.scalaX)} ×${f2(r.scalaY)}  coda ≤45° ${r.codaEntro45} ≤90° ${r.codaEntro90}  ${r.siParlano ? 'SI' : 'no'}  diversi: ${r.diversi.join(' ')}`);
  else console.log(`${head} ${ETF.map((s) => `${s} ${f2(r.ours[s].x)}/${f2(r.ours[s].y)}`).join('; ')}`);
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
