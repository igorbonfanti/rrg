// Scarica le serie per la ricerca «VIX: volatilità implicita, realizzata e GARCH» in ricerca/vix/cache/
// (non versionata, vedi ricerca/vix/.gitignore). La cache è condivisa con ricerca/vix/regimi/: questo script
// NON cancella e NON riscrive i file che ci sono già, a meno di passare --aggiorna.
//
// Serie usate (stesso formato di ricerca/vix/regimi/script/scarica.mjs: {symbol, source, fetched, rows: [[data, valore]]}):
// - FRED (dati CBOE): VIXCLS (VIX, dal 1990), VXNCLS (VXN, dal 2001). I giorni con «.» restano mancanti.
// - Yahoo chart v8 (fetchDaily di scripts/lib/yahoo.js, solo barre chiuse): ^GSPC (S&P 500), ^NDX (Nasdaq-100),
//   ^VIX e ^VXN (seconda fonte delle implicite).
// - FRED SP500 e NASDAQ100 (livelli degli indici): seconda fonte per i rendimenti (SP500 su FRED copre solo 10 anni).
// Nessun riempimento: una data senza valore non entra nel file.
//
// Uso: node ricerca/vix/volatilita/script/scarica.mjs [--aggiorna]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fetchDaily } from '../../../../scripts/lib/yahoo.js';

const CACHE = new URL('../../cache/', import.meta.url);
fs.mkdirSync(CACHE, { recursive: true });
const AGG = process.argv.includes('--aggiorna');
const file = (name) => new URL(name.replace(/[^A-Za-z0-9]/g, '_') + '.json', CACHE);
const save = (name, obj) => fs.writeFileSync(file(name), JSON.stringify(obj));
const have = (name) => !AGG && fs.existsSync(file(name)) && (JSON.parse(fs.readFileSync(file(name), 'utf8')).rows || []).length > 0;

for (const id of ['VIXCLS', 'VXNCLS', 'SP500', 'NASDAQ100']) {
  if (have(id)) { console.log(id, 'già in cache'); continue; }
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
for (const s of ['^GSPC', '^NDX', '^VIX', '^VXN']) {
  if (have(s)) { console.log(s, 'già in cache'); continue; }
  const x = await fetchDaily(s, { period1: P1, raw: true });
  const rows = x.dates.map((d, i) => [d, x.close[i]]).filter((r) => r[1] > 0);
  save(s, { symbol: s, source: 'Yahoo chart v8 (scripts/lib/yahoo.js fetchDaily)', fetched: new Date().toISOString(), rows });
  console.log(s, rows.length, rows[0], rows.at(-1));
}
