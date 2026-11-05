// Scarica le serie macro per il backtest «Emergenti» in ricerca/emergenti/cache/ (non versionata).
// Yahoo (chart v8, chiusure giornaliere, senza riempire i giorni mancanti): CNY=X, INR=X, BRL=X, KRW=X, TWD=X, HKD=X, DX-Y.NYB.
// FRED: DTWEXEMEGS (dollaro ampio contro le valute emergenti, giornaliero; i giorni con «.» restano mancanti) e i cambi H.10 per confronto.
// Ogni file salva le coppie [data, valore] così come arrivano; un valore nullo di Yahoo si scarta (giorno mancante).
// Uso: node ricerca/emergenti/backtest/script/scarica.mjs
import fs from 'node:fs';
const CACHE = new URL('../../cache/', import.meta.url);
fs.mkdirSync(CACHE, { recursive: true });
const YH = ['CNY=X', 'INR=X', 'BRL=X', 'KRW=X', 'TWD=X', 'HKD=X', 'DX-Y.NYB']; // HKD=X solo per i rendimenti in dollari dell'HSI
for (const s of YH) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=946684800&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`${s}: HTTP ${r.status}`);
  const j = (await r.json()).chart.result[0];
  const tzName = j.meta.exchangeTimezoneName || 'UTC', q = j.indicators.quote[0].close;
  // data nel fuso della borsa (Europe/London per i cambi: mezzanotte di Londra, che d'estate è alle 23 UTC del giorno prima)
  const day = (t) => new Date(t * 1000).toLocaleDateString('en-CA', { timeZone: tzName });
  const rows = [];
  j.timestamp.forEach((t, i) => { if (q[i] != null && q[i] > 0) rows.push([day(t), q[i]]); });
  // stessa data ripetuta (barra del giorno in corso): si tiene l'ultima
  const m = new Map(rows); const out = [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  fs.writeFileSync(new URL(s.replace(/[^A-Za-z0-9]/g, '_') + '.json', CACHE), JSON.stringify({ symbol: s, source: 'Yahoo chart v8', fetched: new Date().toISOString(), rows: out }));
  console.log(s, out.length, out[0][0], out.at(-1));
}
// FRED: DTWEXEMEGS (scelto prima) e, solo per un confronto di sensibilità, i cambi H.10 (mezzogiorno di New York):
// DEXCHUS (CNY), DEXINUS (INR), DEXBZUS (BRL), DEXKOUS (KRW), DEXTAUS (TWD), unità di valuta locale per dollaro.
const { execFileSync } = await import('node:child_process');
for (const id of ['DTWEXEMEGS', 'DEXCHUS', 'DEXINUS', 'DEXBZUS', 'DEXKOUS', 'DEXTAUS']) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
  let txt = null;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/csv' } }).catch(() => null);
  if (r && r.ok) txt = await r.text();
  // fetch di Node a volte riceve 503 da FRED attraverso il proxy: ripiego su curl, stessa URL
  if (txt == null) txt = execFileSync('curl', ['-sSf', '--retry', '3', url], { encoding: 'utf8' });
  const rows = txt.trim().split('\n').slice(1).map((l) => l.trim().split(',')).filter(([d, v]) => v && v !== '.' && !isNaN(+v)).map(([d, v]) => [d, +v]);
  fs.writeFileSync(new URL(id + '.json', CACHE), JSON.stringify({ symbol: id, source: 'FRED', fetched: new Date().toISOString(), rows }));
  console.log(id, rows.length, rows[0], rows.at(-1));
}
