// Controlli sull'implementazione della rotazione (js/engine.js), senza dati di terzi.
// Uso: node ricerca/rrg-bloomberg/verifica.mjs   (serve cache/yahoo.json di scarica.mjs e la storia git di main)
// 1. i numeri dell'app del 10/11/2026 si riproducono dai dati pubblicati (commit 0c68f51 di main, dati al 10/11);
// 2. gli stessi numeri escono dalle serie scaricate ora da Yahoo (allineamento e arrotondamenti dei prezzi);
// 3. le settimane: ogni barra settimanale è l'ultima seduta della settimana domenica-sabato, nessuna settimana spezzata,
//    nelle settimane con il venerdì festivo la barra cade di giovedì; la settimana in corso è una barra sola e provvisoria;
// 4. la formula a medie semplici ricalcolata a mano, con un codice indipendente, coincide con engine.js;
// 5. con le medie semplici, la differenza tra benchmark SPY (con dividendi) e indice S&P 500 è uniforme (circa −0,2 sull'RS-Ratio).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build, weeklyIndices } from '../../js/engine.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '../..');
const ETF = ['XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU'];
const Y = JSON.parse(fs.readFileSync(path.join(DIR, 'cache', 'yahoo.json'), 'utf-8')).series;
let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'ERR '} ${msg}`); if (!cond) fail++; };

// 1. app del 10/11 (lettura dell'utente, settimanale, nuova, SPY, settimana in corso)
const USER = { XLY: [99.31, 102.50], XLC: [98.49, 101.33], XLU: [99.21, 101.27], XLRE: [99.51, 101.17], XLB: [99.86, 101.22], XLV: [101.41, 101.74],
  XLP: [100.32, 101.95], XLF: [100.23, 101.34], XLE: [100.84, 100.03], XLK: [100.16, 97.76], XLI: [98.42, 99.85] };
const pub = JSON.parse(execSync('git show 0c68f51:data/prices.json', { cwd: ROOT, maxBuffer: 1 << 26 }).toString());
const mPub = build(pub, { symbols: ETF, benchmark: 'SPY', timeframe: 'weekly', formula: 'nuova' });
const Lp = mPub.dates.length - 1;
ok(mPub.dates[Lp] === '2026-11-10' && mPub.provisional, `dati pubblicati: ultima barra ${mPub.dates[Lp]}, provvisoria ${mPub.provisional}`);
ok(ETF.every((s) => mPub.series[s].x[Lp].toFixed(2) === USER[s][0].toFixed(2) && mPub.series[s].y[Lp].toFixed(2) === USER[s][1].toFixed(2)), 'i numeri dell\'app letti dall\'utente si riproducono al centesimo');

// 2. stesse serie da Yahoo, scaricate a parte
const n = Y.SPY.dates.filter((d) => d <= '2026-11-10').length;
const dsY = { dates: Y.SPY.dates.slice(0, n), tickers: Object.fromEntries(['SPY', ...ETF].map((s) => [s, { close: Y[s].adjclose.slice(0, n) }])) };
const mY = build(dsY, { symbols: ETF, benchmark: 'SPY', timeframe: 'weekly', formula: 'nuova' });
const Ly = mY.dates.length - 1;
const dmax = Math.max(...ETF.flatMap((s) => [Math.abs(mY.series[s].x[Ly] - mPub.series[s].x[Lp]), Math.abs(mY.series[s].y[Ly] - mPub.series[s].y[Lp])]));
ok(dmax < 0.01, `Yahoo scaricato ora contro dati pubblicati: scarto massimo ${dmax.toFixed(4)}`);

// 3. settimane
const dates = dsY.dates;
const wi = weeklyIndices(dates);
const dow = (d) => new Date(d + 'T00:00:00Z').getUTCDay();
const weekKey = (d) => { const t = Date.parse(d + 'T00:00:00Z') / 86400000; return Math.floor((t + 4) / 7); }; // 1970-01-04 domenica
let split = 0, notLast = 0, thu = [];
for (let k = 0; k < wi.length; k++) {
  const i = wi[k];
  if (i + 1 < dates.length && weekKey(dates[i + 1]) === weekKey(dates[i])) notLast++;
  if (k > 0 && weekKey(dates[wi[k - 1]]) === weekKey(dates[i])) split++;
  if (dow(dates[i]) !== 5 && i < dates.length - 1) thu.push(dates[i]);
}
ok(split === 0 && notLast === 0, `${wi.length} barre settimanali, nessuna settimana spezzata o con una seduta dopo la barra`);
console.log('     barre non di venerdì (settimane con il venerdì festivo):', thu.join(', '));
ok(dates[wi.at(-1)] === '2026-11-10' && dates[wi.at(-2)] === '2026-11-06', `ultime due barre: ${dates[wi.at(-2)]} (chiusa) e ${dates[wi.at(-1)]} (in corso)`);

// 4. medie semplici ricalcolate a mano (codice indipendente)
function semplice(px, bx) {
  const rs = px.map((v, i) => v / bx[i]);
  const avg = (a, end, w) => { if (end + 1 < w) return null; let s = 0; for (let j = end - w + 1; j <= end; j++) { if (a[j] == null) return null; s += a[j]; } return s / w; };
  const ratio = rs.map((_, i) => { const a = avg(rs, i, 10), b = avg(rs, i, 30); return a == null || b == null ? null : 100 * a / b; });
  const mom = ratio.map((v, i) => { const a = avg(ratio, i, 9); return v == null || a == null ? null : 100 * v / a; });
  return { ratio, mom };
}
const mS = build(dsY, { symbols: ETF, benchmark: 'SPY', timeframe: 'weekly', formula: 'semplice' });
let d4 = 0;
for (const s of ETF) {
  const r = semplice(wi.map((i) => dsY.tickers[s].close[i]), wi.map((i) => dsY.tickers.SPY.close[i]));
  for (let k = 40; k < wi.length; k++) d4 = Math.max(d4, Math.abs(r.ratio[k] - mS.series[s].x[k]), Math.abs(r.mom[k] - mS.series[s].y[k]));
}
ok(d4 < 1e-9, `medie semplici: engine.js e ricalcolo indipendente coincidono (scarto massimo ${d4.toExponential(1)})`);

// 5. SPY con dividendi contro ^GSPC (medie semplici, ETF con dividendi)
const dsG = { dates: dsY.dates, tickers: { ...dsY.tickers, G: { close: Y['^GSPC'].close.slice(0, n) } } };
const mG = build(dsG, { symbols: ETF, benchmark: 'G', timeframe: 'weekly', formula: 'semplice' });
const off = ETF.map((s) => mS.series[s].x.at(-1) - mG.series[s].x.at(-1));
ok(Math.max(...off) - Math.min(...off) < 0.05, `RS-Ratio con SPY meno RS-Ratio con ^GSPC: da ${Math.min(...off).toFixed(2)} a ${Math.max(...off).toFixed(2)}`);
process.exit(fail ? 1 : 0);
