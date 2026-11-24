// A che ora corrisponde la «chiusura» giornaliera di Yahoo: per ogni barra giornaliera (data nuova) cerca la barra oraria
// con il prezzo più vicino nelle 48 ore intorno, e riporta lo scarto in ore dall'inizio della barra giornaliera.
// Uso: node ora_chiusura_fx.mjs <cacheDir> SIMBOLO [data...]  (serve <SIMBOLO>_1h.json e <SIMBOLO>_5y.json nella cache)
import fs from 'node:fs'; import path from 'node:path';
const [cache, sym, ...show] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(path.join(cache, `${sym}_5y.json`), 'utf-8'));
const H = JSON.parse(fs.readFileSync(path.join(cache, `${sym}_1h.json`), 'utf-8')).chart.result[0];
const tz = D.meta.exchangeTimezoneName, fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz });
const hts = H.timestamp, hc = H.indicators.quote[0].close;
const lag = {}; let n = 0, exact = 0;
const rows = [];
D.timestamp.forEach((t, i) => {
  const c = D.indicators.quote[0].close[i]; if (c == null || t < hts[0] + 86400 || t > hts.at(-1) - 86400) return;
  let best = null;
  for (let k = 0; k < hts.length; k++) { if (hts[k] < t - 30 * 3600 || hts[k] > t + 30 * 3600 || hc[k] == null) continue; const e = Math.abs(hc[k] / c - 1); if (!best || e < best.e) best = { e, h: (hts[k] - t) / 3600 }; }
  if (!best) return;
  n++; if (best.e < 2e-5) exact++;
  const b = Math.round(best.h); lag[b] = (lag[b] || 0) + 1;
  const d = fmt.format(t * 1000);
  if (show.includes(d)) rows.push({ d, close: c, oraPiuVicinaRispettoAllInizioBarra: best.h, scarto: best.e });
});
const top = Object.entries(lag).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(JSON.stringify({ sym, tz, barre: n, quasiEsatte: exact, oreDallInizioBarra_piuFrequenti: top, campione: rows }, null, 1));
