// Ricerca «credito: la soglia dei 350 pb» — scarico e controllo dell'HY OAS (ICE BofA US High Yield OAS, FRED BAMLH0A0HYM2).
//
// PERCHÉ COSÌ. Da aprile 2026 FRED pubblica solo gli ultimi 3 anni della serie (dal 07/11/2023) e anche le vecchie versioni
// su ALFRED sono tagliate (ricerca/vix/struttura/dati/dati.md). La storia dal 31/12/1996 si ricostruisce da copie del CSV
// di FRED salvate in passato in repository pubblici di GitHub (scaricate con raw.githubusercontent.com). Ogni copia è stata
// scaricata da FRED in date diverse da persone diverse: si confrontano tra loro e con FRED di oggi nelle date in comune.
// Composizione: FRED di oggi dove c'è (dal 07/11/2023), prima la copia più recente che arriva al 2023; le altre copie
// servono da controllo. Un valore che manca resta mancante.
//
// LICENZA. ICE vieta di ripubblicare la serie: tutto resta in cache/ (esclusa da git). Nei risultati del repository
// non si scrivono livelli dello spread, solo date, variazioni, correlazioni e statistiche dell'S&P 500.
//
// Uso: node ricerca/credito-soglia/script/scarica.mjs   → cache/hy_oas.csv, cache/_scaricato.json
import fs from 'node:fs';

const C = new URL('../cache/', import.meta.url).pathname;
fs.mkdirSync(C + 'copie', { recursive: true });

const MIRRORS = [ // repository pubblico | percorso del CSV
  ['PStoclet/BBA_TFG_CODE_PABLO_STOCLET', 'data/05_Credit_Spreads/HY_OAS_spread_daily_1990_2024.csv'],
  ['Vishnutejas-2005/DA_Project', 'BAMLH0A0HYM2.csv'],
  ['maaurocp/Trading_Protocol', 'data/raw/fred_BAMLH0A0HYM2.csv'],
  ['mhidper/talvi', 'data/indicadores/BAMLH0A0HYM2.csv'],
  ['DarshKodwani/stresstests', 'financial_data/fred-high-yield-credit-spreads.csv'],
  ['IE7374-MachineLearningOperations/StockPricePrediction', 'pipeline/airflow/dags/data/FRED_Variables/BAMLH0A0HYM2.csv'],
  ['csaladenes/eco-archive', 'BAMLH0A0HYM2.csv'],
  ['kuczmama/udacity-machine-learning-for-trading', 'data/indices/BAMLH0A0HYM2.csv'],
];
const FRED = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2&cosd=1996-12-31';

function parse(txt) {
  const m = new Map();
  for (const l of txt.trim().split(/\r?\n/).slice(1)) {
    const [d, v] = l.split(',');
    if (!/^\d{4}-\d\d-\d\d$/.test(d)) continue;
    const x = v == null || v.trim() === '' || v.trim() === '.' ? null : Number(v);
    if (x != null && !Number.isFinite(x)) continue;
    m.set(d, x);
  }
  return m;
}
async function get(url, file) {
  let err;
  for (let k = 0; k < 4; k++) { // 4 tentativi: il proxy a volte risponde 503
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (research script)' }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      const t = await r.text();
      fs.writeFileSync(file, t);
      return { url, status: r.status, at: new Date().toISOString() };
    } catch (e) { err = e; await new Promise((ok) => setTimeout(ok, 2000 * (k + 1))); }
  }
  if (fs.existsSync(file)) return { url, status: 'errore, uso la copia in cache: ' + err.message };
  throw err;
}

const log = { scaricato: new Date().toISOString(), copie: {}, fred: null };
const copies = [];
for (const [repo, path] of MIRRORS) {
  const file = C + 'copie/' + repo.replace('/', '__') + '.csv';
  log.copie[repo] = await get(`https://raw.githubusercontent.com/${repo}/HEAD/${path.split('/').map(encodeURIComponent).join('/')}`, file);
  const m = parse(fs.readFileSync(file, 'utf8'));
  const ds = [...m.keys()].sort();
  copies.push({ repo, m, first: ds[0], last: ds.at(-1), n: [...m.values()].filter((x) => x != null).length });
}
log.fred = await get(FRED, C + 'fred_BAMLH0A0HYM2.csv');
const fred = parse(fs.readFileSync(C + 'fred_BAMLH0A0HYM2.csv', 'utf8'));
const fredDates = [...fred.keys()].sort();

// confronti a coppie (date con valore in entrambe)
const cmp = (a, b) => {
  let n = 0, diff = 0, maxAbs = 0, firstDiff = null;
  for (const [d, x] of a) { const y = b.get(d); if (x == null || y == null) continue; n++; const e = Math.abs(x - y); if (e > 1e-9) { diff++; if (e > maxAbs) maxAbs = e; if (!firstDiff) firstDiff = d; } }
  return { n, diff, maxAbs: Math.round(maxAbs * 1000) / 1000, firstDiff };
};
const pairs = [];
for (let i = 0; i < copies.length; i++) {
  pairs.push({ a: copies[i].repo, b: 'FRED oggi', ...cmp(copies[i].m, fred) });
  for (let j = i + 1; j < copies.length; j++) pairs.push({ a: copies[i].repo, b: copies[j].repo, ...cmp(copies[i].m, copies[j].m) });
}

// composizione: FRED dove c'è; prima, la prima copia dell'elenco che ha la data (le copie sono in ordine di data finale)
const all = new Set([...fred.keys()]);
for (const c of copies) for (const d of c.m.keys()) if (d < fredDates[0]) all.add(d);
const out = [], fromCopy = {};
for (const d of [...all].sort()) {
  let v = null, src = null;
  if (d >= fredDates[0]) { v = fred.get(d) ?? null; src = 'FRED'; }
  else for (const c of copies) if (c.m.has(d) && c.m.get(d) != null) { v = c.m.get(d); src = c.repo; break; }
  if (src && src !== 'FRED') fromCopy[src] = (fromCopy[src] || 0) + 1;
  out.push(`${d},${v == null ? '' : v}`);
}
// quante date prima del 07/11/2023 hanno almeno 2 copie che concordano
let agree2 = 0, only1 = 0, none = 0, disagree = 0;
for (const d of [...all].sort()) {
  if (d >= fredDates[0]) continue;
  const vs = copies.map((c) => c.m.get(d)).filter((x) => x != null);
  if (!vs.length) none++; else if (vs.length < 2) only1++; else if (vs.every((x) => Math.abs(x - vs[0]) < 1e-9)) agree2++; else disagree++;
}
fs.writeFileSync(C + 'hy_oas.csv', 'date,hy_oas\n' + out.join('\n') + '\n');
log.copie_riassunto = copies.map(({ repo, first, last, n }) => ({ repo, first, last, n }));
log.fred_riassunto = { first: fredDates[0], last: fredDates.at(-1), n: [...fred.values()].filter((x) => x != null).length };
log.confronti = pairs;
log.composizione = { righe: out.length, prima: out[0].split(',')[0], ultima: out.at(-1).split(',')[0], date_da_copia: fromCopy, date_prima_di_FRED_con_almeno_2_copie_uguali: agree2, con_una_sola_copia: only1, senza_valore_in_nessuna_copia: none, con_copie_diverse: disagree };
fs.writeFileSync(C + '_scaricato.json', JSON.stringify(log, null, 1));
console.log(JSON.stringify({ copie: log.copie_riassunto, fred: log.fred_riassunto, composizione: log.composizione }, null, 1));
for (const p of pairs) if (p.diff) console.log('DIFF', p.a, '|', p.b, p.n, p.diff, p.maxAbs, p.firstDiff);
