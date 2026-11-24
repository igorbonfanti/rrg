// Ricalcolo indipendente della breadth a 20/50/200 sedute dai prezzi dei membri (Yahoo, endpoint chart) e confronto con i
// file dell'app, seduta per seduta:
//   - DAX, CAC 40, SMI (membri di oggi, data/index_members/) su tutta la storia;
//   - Dow Jones (composizione d'epoca, config/index_history.json) su tutta la storia;
//   - S&P 500 (data/breadth.json) dal 03/06/2024 con la composizione ricostruita dai cambi di data/sp500_history.json
//     (Wikipedia, dal 2024-06-01) e i membri di oggi di data/sp500_members.json; regola della pipeline serale
//     (scripts/fetch_breadth.js): in n solo i titoli con la barra proprio quel giorno.
// La regola è quella di scripts/backfill_indices.py, riscritta in lib.mjs (breadthFor). I prezzi si riscaricano oggi: le
// differenze possono venire da revisioni di Yahoo dopo la ricostruzione dell'app (ottobre 2026).
// Uso: node ricerca/indici-breadth50/script/ricalcolo.mjs CARTELLA_CACHE    (scrive la sezione «ricalcolo» di dati.json)
import path from 'node:path';
import { loadAll, loadSectors, read, prices, breadthFor, djiIntervals, saveSection, r1, r2, mean, median, quantile } from './lib.mjs';
import { yahooSymbol } from '../../../scripts/lib/yahoo.js';

const CACHE = path.resolve(process.argv[2] || path.join(process.cwd(), '..', 'ib50-cache'));
const { cfg, S } = loadAll();

function compare(app, mine, idxs, label) {
  // app: serie dell'app (indexSeries o breadthSeries); mine: conteggi ricalcolati allineati a idxs
  const rows = idxs.map((i, k) => {
    const n = app.n[i];
    const a = { n, a20: Math.round((app.pct20[i] * n) / 100), a50: Math.round((app.pct50[i] * n) / 100), a200: app.above200[i] };
    const m = { n: mine.n[k], a20: mine.a20[k], a50: mine.a50[k], a200: mine.a200[k] };
    const p = (x, w) => (x.n ? (100 * x['a' + w]) / x.n : null);
    return { date: app.dates[i], a, m, d20: p(m, 20) - p(a, 20), d50: p(m, 50) - p(a, 50), d200: p(m, 200) - p(a, 200), app50: p(a, 50) };
  });
  const stat = (key) => { const v = rows.map((r) => r[key]); const ab = v.map(Math.abs); return { mediaAss: r2(mean(ab)), p95Ass: r1(quantile(ab, 0.95)), maxAss: r1(Math.max(...ab)), media: r2(mean(v)), sedutaMax: rows[ab.indexOf(Math.max(...ab))].date }; };
  const eq = (f) => rows.filter(f).length;
  const low = rows.filter((r) => r.app50 != null && r.app50 <= 15);
  const byYear = {};
  for (const r of rows) { const y = r.date.slice(0, 4); (byYear[y] ||= []).push(Math.abs(r.d50)); }
  const out = {
    sedute: rows.length, dal: rows[0].date, al: rows.at(-1).date,
    nUguale: eq((r) => r.a.n === r.m.n), a50Uguale: eq((r) => r.a.a50 === r.m.a50), a20Uguale: eq((r) => r.a.a20 === r.m.a20), a200Uguale: eq((r) => r.a.a200 === r.m.a200),
    tuttoUguale: eq((r) => r.a.n === r.m.n && r.a.a20 === r.m.a20 && r.a.a50 === r.m.a50 && r.a.a200 === r.m.a200),
    pct20: stat('d20'), pct50: stat('d50'), pct200: stat('d200'),
    vicinoAiMinimi: { sedute: low.length, pct50MediaAss: r2(mean(low.map((r) => Math.abs(r.d50)))), pct20MediaAss: r2(mean(low.map((r) => Math.abs(r.d20)))), a50Uguale: low.filter((r) => r.a.a50 === r.m.a50).length },
    pct50MediaAssPerAnno: Object.fromEntries(Object.entries(byYear).map(([y, v]) => [y, r2(mean(v))])),
    peggiori: [...rows].sort((x, y) => Math.abs(y.d50) - Math.abs(x.d50)).slice(0, 8).map((r) => ({ data: r.date, app: r.a, ricalcolo: r.m, dPct50: r1(r.d50) })),
  };
  console.log(`${label}: ${out.sedute} sedute ${out.dal}→${out.al}; n uguale ${out.nUguale}, a50 uguale ${out.a50Uguale}, a20 ${out.a20Uguale}, a200 ${out.a200Uguale}, tutto ${out.tuttoUguale}; |Δpct50| media ${out.pct50.mediaAss} p95 ${out.pct50.p95Ass} max ${out.pct50.maxAss} (${out.pct50.sedutaMax}); |Δpct20| media ${out.pct20.mediaAss} max ${out.pct20.maxAss}; vicino ai minimi ${JSON.stringify(out.vicinoAiMinimi)}`);
  return out;
}

const res = {};
// ---------- indici con i membri di oggi ----------
for (const k of ['DAX', 'CAC', 'SMI']) {
  const tick = read(`data/index_members/${k}.json`).tickers;
  const { px, missing } = await prices(tick, path.join(CACHE, '1990'));
  const s = S[k], idxs = s.dates.map((d, i) => (s.pct50[i] != null ? i : -1)).filter((i) => i >= 0);
  const cal = idxs.map((i) => s.dates[i]);
  const acc = breadthFor(Object.fromEntries(tick.map((t) => [t, [[cal[0], null]]])), px, cal, { calStart: cfg[k].from });
  res[k] = { membri: tick.length, senzaPrezzi: missing, ...compare(s, acc, idxs, k) };
}

// ---------- Dow Jones, composizione d'epoca ----------
{
  const iv = djiIntervals(read('config/index_history.json').DJI);
  const syms = Object.keys(iv).filter((t) => !t.startsWith('!'));
  const { px, missing } = await prices(syms, path.join(CACHE, '1990'));
  const s = S.DJI, idxs = s.dates.map((d, i) => (s.pct50[i] != null ? i : -1)).filter((i) => i >= 0);
  const cal = idxs.map((i) => s.dates[i]);
  const acc = breadthFor(iv, px, cal, { pit: true, calStart: cfg.DJI.from });
  res.DJI = { simboli: syms.length, senzaPrezzi: missing, scartati: acc.dropped, ...compare(s, acc, idxs, 'DJI') };
}

// ---------- S&P 500 dal giugno 2024 ----------
{
  const mem = read('data/sp500_members.json').members.map((m) => m.s);
  const ch = [...read('data/sp500_history.json').changes].sort((a, b) => (a.date < b.date ? -1 : 1));
  const START = '2024-06-03';
  // composizione al 2024-06-03: si parte da oggi e si disfano i cambi all'indietro
  const set = new Set(mem);
  for (const c of [...ch].reverse()) { if (c.add) set.delete(c.add); if (c.rem) set.add(c.rem); }
  const iv = {};
  for (const t of set) iv[t] = [[START, null]];
  for (const c of ch) {
    if (c.rem && iv[c.rem]) iv[c.rem].at(-1)[1] = c.date;
    if (c.add) (iv[c.add] ||= []).push([c.date, null]);
  }
  const syms = Object.keys(iv);
  const { px: raw, missing } = await prices(syms.map(yahooSymbol), path.join(CACHE, '2003'), { period1: 1041379200 });
  const px = Object.fromEntries(syms.filter((t) => raw[yahooSymbol(t)]).map((t) => [t, raw[yahooSymbol(t)]]));
  const { S: SS } = loadSectors();
  const s = SS.SPX, idxs = s.dates.map((d, i) => (d >= START && s.pct50[i] != null ? i : -1)).filter((i) => i >= 0);
  const cal = idxs.map((i) => s.dates[i]);
  // regola della pipeline serale: titolo in n solo con la barra del giorno
  const acc = { n: [], a20: [], a50: [], a200: [] };
  for (const d of cal) {
    const r = { n: 0, a20: 0, a50: 0, a200: 0 };
    for (const [t, ivs] of Object.entries(iv)) {
      if (!ivs.some((x) => x[0] <= d && (x[1] == null || d < x[1]))) continue;
      const p = px[t]; if (!p) continue;
      const j = p.dates.indexOf(d); if (j < 0) continue;
      r.n++;
      for (const w of [20, 50, 200]) { if (j < w - 1) continue; let sm = 0; for (let q = j - w + 1; q <= j; q++) sm += p.close[q]; if (p.close[j] > sm / w) r['a' + w]++; }
    }
    for (const key of Object.keys(r)) acc[key].push(r[key]);
  }
  res.SPX = { simboli: syms.length, senzaPrezzi: missing, nota: 'composizione da data/sp500_history.json (Wikipedia, date di efficacia); i titoli usciti senza prezzi su Yahoo mancano nel ricalcolo', ...compare(s, acc, idxs, 'SPX dal 2024-06') };
}

saveSection('ricalcolo', res);
