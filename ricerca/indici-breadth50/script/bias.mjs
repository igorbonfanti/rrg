// Bias dei membri di oggi sulla breadth a 20, 50 e 200 sedute. Per i tre indici con la composizione d'epoca nell'app
// (Nasdaq-100, S&P 500, Dow Jones) si ricalcola la breadth con i soli membri di oggi, con la regola dell'app per gli indici
// «oggi» (scripts/backfill_indices.py: in n chi è quotato quel giorno, ultima seduta entro 5 giorni), e la si confronta
// seduta per seduta con la serie d'epoca dell'app (data/indices.json; per l'S&P 500 data/breadth.json, la stessa).
// Scarto = oggi − epoca, in punti. Si misura: in media e per anno, per livello della breadth, ai minimi locali del prezzo
// (chiusura più bassa nelle 40 sedute prima e dopo, almeno −10% dal massimo di 252 sedute), sul minimo della breadth
// intorno a quei minimi, e sugli attraversamenti di soglia (pct50 ≤ 10 e ≤ 20, pct20 ≤ 10) usati dai pattern.
// Uso: node ricerca/indici-breadth50/script/bias.mjs CARTELLA_CACHE     (scrive la sezione «bias» di dati.json)
import path from 'node:path';
import { loadAll, read, prices, breadthFor, saveSection, r1, r2, mean, median, quantile, corr } from './lib.mjs';
import { yahooSymbol } from '../../../scripts/lib/yahoo.js';

const CACHE = path.resolve(process.argv[2] || path.join(process.cwd(), '..', 'ib50-cache'));
const { cfg, S } = loadAll();
const W = [20, 50, 200];

function localMinima(close, from) {
  const out = [];
  for (let i = Math.max(from, 252); i < close.length - 40; i++) {
    let ok = true;
    for (let k = i - 40; k <= i + 40 && ok; k++) if (close[k] < close[i]) ok = false;
    if (!ok) continue;
    let hi = 0; for (let k = i - 252; k <= i; k++) hi = Math.max(hi, close[k]);
    if (close[i] / hi - 1 <= -0.10) out.push(i);
  }
  return out;
}
function entries(v, X, gap = 20) {
  const e = [];
  for (let i = 1; i < v.length; i++) if (v[i] != null && v[i - 1] != null && v[i] <= X && v[i - 1] > X && (!e.length || i - e.at(-1) > gap)) e.push(i);
  return e;
}
function matchEvents(a, b, tol = 5) {
  const used = new Set(); let m = 0; const lags = [];
  for (const i of a) { const j = b.find((x) => !used.has(x) && Math.abs(x - i) <= tol); if (j != null) { used.add(j); m++; lags.push(j - i); } }
  return { epoca: a.length, oggi: b.length, comuni: m, ritardoMediano: median(lags) };
}

async function run(k, tickers, cacheDir, period1) {
  const s = S[k];
  const idxs = s.dates.map((d, i) => (s.pct50[i] != null ? i : -1)).filter((i) => i >= 0);
  const cal = idxs.map((i) => s.dates[i]);
  const { px, missing } = await prices(tickers, path.join(CACHE, cacheDir), { period1 });
  const acc = breadthFor(Object.fromEntries(tickers.map((t) => [t, [[cal[0], null]]])), px, cal, { calStart: cal[0] });
  const T = {}, E = {};
  for (const w of W) { T[w] = idxs.map((i, q) => (acc.n[q] ? (100 * acc['a' + w][q]) / acc.n[q] : null)); E[w] = idxs.map((i) => s['pct' + w][i]); }
  const D = Object.fromEntries(W.map((w) => [w, T[w].map((x, q) => (x == null || E[w][q] == null ? null : x - E[w][q]))]));
  const st = (a) => ({ media: r1(mean(a)), mediana: r1(median(a)), p5: r1(quantile(a, 0.05)), p95: r1(quantile(a, 0.95)) });
  const byLevel = {};
  for (const w of W) {
    const b = { 'sotto10': [], '10-20': [], '20-50': [], '50-80': [], 'sopra80': [] };
    E[w].forEach((e, q) => { if (D[w][q] == null) return; const key = e < 10 ? 'sotto10' : e < 20 ? '10-20' : e < 50 ? '20-50' : e < 80 ? '50-80' : 'sopra80'; b[key].push(D[w][q]); });
    byLevel['pct' + w] = Object.fromEntries(Object.entries(b).map(([kk, v]) => [kk, { sedute: v.length, media: r1(mean(v)), mediana: r1(median(v)) }]));
  }
  const byYear = {};
  cal.forEach((d, q) => { const y = d.slice(0, 4); (byYear[y] ||= { 20: [], 50: [], 200: [], cop: [] }); for (const w of W) byYear[y][w].push(D[w][q]); byYear[y].cop.push(acc.n[q] / acc.members[q]); });
  const perAnno = Object.fromEntries(Object.entries(byYear).map(([y, v]) => [y, { pct20: r1(mean(v[20])), pct50: r1(mean(v[50])), pct200: r1(mean(v[200])), coperturaOggi: r2(mean(v.cop)) }]));
  // minimi locali del prezzo (sul calendario della breadth)
  const close = idxs.map((i) => s.close[i]);
  const mins = localMinima(close, 0);
  const atMin = mins.map((q) => {
    const row = { data: cal[q], calo: r1(100 * (close[q] / Math.max(...close.slice(q - 252, q + 1)) - 1)) };
    for (const w of W) {
      row['epoca' + w] = r1(E[w][q]); row['oggi' + w] = r1(T[w][q]); row['scarto' + w] = r1(D[w][q]);
      // minimo della breadth nelle 15 sedute prima e 5 dopo il minimo del prezzo
      let qe = q, qt = q;
      for (let z = q - 15; z <= q + 5; z++) { if (E[w][z] != null && E[w][z] < E[w][qe]) qe = z; if (T[w][z] != null && T[w][z] < T[w][qt]) qt = z; }
      row['minEpoca' + w] = r1(E[w][qe]); row['minOggi' + w] = r1(T[w][qt]); row['sfasamento' + w] = qt - qe;
    }
    return row;
  });
  const sumMin = Object.fromEntries(W.map((w) => [`pct${w}`, { scartoAlMinimo: st(atMin.map((r) => r['scarto' + w])), scartoDelMinimoBreadth: st(atMin.map((r) => r['minOggi' + w] - r['minEpoca' + w])), stessaSeduta: atMin.filter((r) => r['sfasamento' + w] === 0).length }]));
  const eventi = {
    pct50sotto10: matchEvents(entries(E[50], 10), entries(T[50], 10)), pct50sotto20: matchEvents(entries(E[50], 20), entries(T[50], 20)),
    pct20sotto10: matchEvents(entries(E[20], 10), entries(T[20], 10)), pct200sotto15: matchEvents(entries(E[200], 15), entries(T[200], 15)),
  };
  const dchg = (a) => a.map((x, q) => (q && x != null && a[q - 1] != null ? x - a[q - 1] : null));
  const out = {
    membriOggi: tickers.length, senzaPrezzi: missing, sedute: cal.length, dal: cal[0], al: cal.at(-1),
    coperturaOggiInizio: r2(acc.n[0] / acc.members[0]),
    scarto: Object.fromEntries(W.map((w) => [`pct${w}`, st(D[w])])),
    perLivello: byLevel, perAnno,
    minimi: { numero: mins.length, riassunto: sumMin, elenco: atMin },
    eventi,
    _righe: cal.map((d, q) => ({ data: d, d20: D[20][q], d50: D[50][q], d200: D[200][q] })),
    correlazioneVariazioni: Object.fromEntries(W.map((w) => [`pct${w}`, r2(corr(dchg(E[w]), dchg(T[w])))])),
  };
  console.log(`\n${k}: ${cal.length} sedute ${cal[0]}→${cal.at(-1)}, membri di oggi ${tickers.length} (senza prezzi: ${missing.join(' ') || 'nessuno'})`);
  for (const w of W) console.log(`  pct${w}: scarto ${JSON.stringify(out.scarto['pct' + w])}; per livello ${JSON.stringify(byLevel['pct' + w])}`);
  console.log(`  minimi locali ${mins.length}: ${JSON.stringify(sumMin)}`);
  console.log(`  eventi ${JSON.stringify(eventi)}; corr variazioni ${JSON.stringify(out.correlazioneVariazioni)}`);
  return out;
}

const res = {
  metodo: 'scarto = breadth con i membri di oggi (regola dell\'app per gli indici «oggi») − breadth d\'epoca dell\'app, in punti',
  NDX: await run('NDX', read('data/index_members/NDX.json').tickers, '2003', 1041379200),
  SPX: await run('SPX', read('data/sp500_members.json').members.map((m) => yahooSymbol(m.s)), '2003', 1041379200),
  DJI: await run('DJI', read('data/index_members/DJI.json').tickers, '1990', 631152000),
};
// confronto con la prova trimestrale del README (pct200, 76 date, regola diversa: senza i titoli con meno di 200 sedute)
const q = read('ricerca/indici/membri_oggi_ndx.json');
const qd = new Set(q.rows.map((r) => r.date)), sel = res.NDX._righe.filter((r) => qd.has(r.data));
res.NDX.provaTrimestrale = { readme: q.summary, stesseDate: { date: sel.length, mediaPct200: r1(mean(sel.map((r) => r.d200))), mediaPct50: r1(mean(sel.map((r) => r.d50))), mediaPct20: r1(mean(sel.map((r) => r.d20))) }, nota: 'ricerca/indici/script/membri_oggi_ndx.mjs esclude dal denominatore i titoli con meno di 200 sedute; qui contano (regola dell\'app)' };
for (const k of ['NDX', 'SPX', 'DJI']) delete res[k]._righe;
console.log('prova trimestrale NDX', res.NDX.provaTrimestrale);
saveSection('bias', res);
