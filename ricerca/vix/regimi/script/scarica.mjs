// Scarica le serie per la ricerca «VIX: regimi» in ricerca/vix/cache/ (non versionata, vedi ricerca/vix/.gitignore).
// - FRED (CBOE via FRED): VIXCLS (VIX, dal 1990), VXNCLS (VXN, dal 2001). I giorni con «.» restano mancanti.
// - Yahoo (chart v8, fetchDaily di scripts/lib/yahoo.js, solo barre chiuse): ^VIX, ^VXN (seconda fonte),
//   ^GSPC (S&P 500, solo prezzo), ^NDX (Nasdaq-100, solo prezzo), ^SP500TR e ^XNDX (total return, sensibilità).
// Ogni file salva le coppie [data, chiusura] così come arrivano (chiusura non rettificata per i dividendi: per gli indici
// è il livello dell'indice). Nessun riempimento.
// Uso: node ricerca/vix/regimi/script/scarica.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fetchDaily } from '../../../../scripts/lib/yahoo.js';

const CACHE = new URL('../../cache/', import.meta.url);
fs.mkdirSync(CACHE, { recursive: true });
const save = (name, obj) => fs.writeFileSync(new URL(name.replace(/[^A-Za-z0-9]/g, '_') + '.json', CACHE), JSON.stringify(obj));

for (const id of ['VIXCLS', 'VXNCLS']) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
  let txt = null;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/csv' } }).catch(() => null);
  if (r && r.ok) txt = await r.text();
  if (txt == null) txt = execFileSync('curl', ['-sSf', '--retry', '3', url], { encoding: 'utf8' }); // ripiego, stessa URL
  const rows = txt.trim().split('\n').slice(1).map((l) => l.trim().split(',')).filter(([, v]) => v && v !== '.' && !isNaN(+v)).map(([d, v]) => [d, +v]);
  save(id, { symbol: id, source: 'FRED ' + url, fetched: new Date().toISOString(), rows });
  console.log(id, rows.length, rows[0], rows.at(-1));
}
const P1 = Date.UTC(1985, 0, 1) / 1000;
for (const s of ['^VIX', '^VXN', '^GSPC', '^NDX', '^SP500TR', '^XNDX']) {
  const x = await fetchDaily(s, { period1: P1, raw: true });
  const rows = x.dates.map((d, i) => [d, x.close[i]]).filter((r) => r[1] > 0);
  save(s, { symbol: s, source: 'Yahoo chart v8 (scripts/lib/yahoo.js fetchDaily)', fetched: new Date().toISOString(), rows });
  console.log(s, rows.length, rows[0], rows.at(-1));
}
