// Audit dei testi 0.9.8: ricalcolo delle affermazioni non coperte dagli script dell'audit 0.9.0.
// Uso: node ricerca/qa/audit-0.9.8/testi/verifica_098.mjs   (legge data/ e config/, importa i moduli di js/)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { priceSeries, runMachine, breadthSeries, forward, expandRLE } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';
import { capSeries, capAnalysis, capOutcomes } from '../../../../js/capitulation.js';

const ROOT = new URL('../../../../', import.meta.url);
const R = (f) => JSON.parse(fs.readFileSync(new URL(f, ROOT)));
const cfg = R('config/indices.json').indices, th = R('config/thresholds.json');
const IX = { ...R('data/indices.json').series, ...R('data/indices_more.json').series };
const CAP = R('data/capitulation.json');
const br = R('data/breadth.json'), sec = R('data/sectors.json');
const out = (id, ...a) => console.log(`[${id}]`, ...a);
const f2 = (v) => (v == null ? '—' : v.toFixed(2));

// ---------- T1. Livelli di Rea contro il 3° percentile (indices.js: «entro un punto in 6 casi su 13») ----------
{
  const rea = Object.keys(cfg).filter((k) => cfg[k].blueSource === 'Rea');
  const p3 = Object.keys(cfg).filter((k) => cfg[k].blueSource !== 'Rea');
  const q = (a, p) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
  const rows = rea.map((k) => { const X = indexSeries(IX[k]); const v = q(X.pct200, 0.03); return [k, cfg[k].blue, Math.round(v), Math.abs(Math.round(v) - cfg[k].blue)]; });
  out('T1', `indici con livello di Rea: ${rea.length}; con il 3° percentile: ${p3.length}`);
  out('T1', rows.map(([k, b, r, d]) => `${k} Rea ${b} p3 ${r} (scarto ${d})`).join(' · '));
  out('T1', `entro 1 punto: ${rows.filter((r) => r[3] <= 1).length} su ${rows.length}; uguali: ${rows.filter((r) => r[3] === 0).length}`);
  // nota: livelli.mjs usa la stessa definizione del 3° percentile (indice floor(0,03·(n−1)))
}

// ---------- T2. Titoli unici degli indici («circa 4.600 titoli») e borse dello STOXX 600 («17 borse») ----------
{
  const dir = new URL('data/index_members/', ROOT);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const all = new Set(); let tot = 0; const sx = new Set();
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(new URL(f, dir)));
    const list = (j.members || j.tickers || j.symbols || []).map((m) => (typeof m === 'string' ? m : m.y || m.yahoo || m.s || m.symbol || m.ticker));
    tot += list.length; list.forEach((s) => all.add(s));
    if (f.startsWith('SXXP')) list.forEach((s) => sx.add(String(s).includes('.') ? String(s).split('.').pop() : 'senza suffisso'));
  }
  out('T2', `liste ${files.length}, titoli con ripetizioni ${tot}, titoli unici ${all.size}`);
  out('T2', `STOXX 600: suffissi di borsa diversi ${sx.size} (${[...sx].sort().join(' ')})`);
  for (const f of ['data/indices.json', 'data/indices_more.json']) {
    const b = fs.readFileSync(new URL(f, ROOT));
    out('T2', `${f}: ${(b.length / 1024).toFixed(0)} KB, gzip ${(zlib.gzipSync(b, { level: 9 }).length / 1024).toFixed(0)} KB`);
  }
}

// ---------- T3. Scala tagliata dei cali forti (README 0.9.5: SPX MAX «circa 500 invece di 1.170», 2022 = 106 titoli,
// «un quinto del pannello invece di un undicesimo», etichetta «▲557 (ott 2008)») ----------
// Riproduce cap-view.js card() e cap-chart.js drawCap() senza il DOM.
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
function scale(k, oDates, fromDate) {
  const s = capSeries(CAP.series[k]), a = capAnalysis(s, {});
  const ci = new Map(s.dates.map((d, i) => [d, i]));
  let i0 = oDates.indexOf(fromDate); if (i0 < 0) i0 = 0;
  const days = oDates.slice(i0), pick = (arr, none) => days.map((d) => (ci.has(d) ? arr[ci.get(d)] : none));
  const sum = pick(a.sum, null), alert = pick(a.alert, null);
  const vals = (x) => x.filter((v) => v != null);
  const aMax = Math.max(0, ...vals(alert)), sMax = Math.max(1, ...vals(sum));
  const cut = aMax > 0 && sMax > aMax * 1.3 ? aMax * 1.3 : null;
  const top = cut ?? Math.max(sMax, aMax), hi = top * 1.08, hiNoCut = Math.max(sMax, aMax) * 1.08;
  const labels = [];
  if (cut != null) for (let i = 0; i < days.length; i++) {
    if (sum[i] == null || sum[i] <= hi) continue;
    let j = i, im = i;
    while (j + 1 < days.length && sum[j + 1] != null && sum[j + 1] > hi) { j++; if (sum[j] > sum[im]) im = j; }
    labels.push(`▲${sum[im]} (${MESI[+days[im].slice(5, 7) - 1]} ${days[im].slice(0, 4)})`); i = j;
  }
  return { days, sum, aMax, sMax, cut, hi, hiNoCut, labels, s, a };
}
{
  // vista 6, SPX, periodo MAX: from = max(prima breadth, primo percentile)
  const X = indexSeries(IX.SPX), px = priceSeries(X.close);
  const first = Math.max(X.pct200.findIndex((v) => v != null), px.dp.findIndex((v) => v != null));
  const r = scale('SPX', X.dates, X.dates[first]);
  const p22 = Math.max(...r.sum.filter((v, i) => v != null && r.days[i].startsWith('2022')));
  out('T3', `SPX vista 6 MAX dal ${X.dates[first]}: soglia più alta ${r.aMax}, somma massima ${r.sMax}, taglio ${f2(r.cut)}, cima della scala ${f2(r.hi)} (senza taglio ${f2(r.hiNoCut)})`);
  out('T3', `picco 2022: ${p22} titoli = ${(p22 / r.hi).toFixed(3)} del pannello con il taglio, ${(p22 / r.hiNoCut).toFixed(3)} senza`);
  out('T3', `etichette: ${r.labels.join(', ')}`);
  // vista 4 (settori) e vista 6 (indici) in MAX: dove compare un'etichetta con 557?
  const hits = [];
  for (const k of Object.keys(CAP.series)) {
    let dates, from;
    if (IX[k]) { const Y = indexSeries(IX[k]), p = priceSeries(Y.close); dates = Y.dates; from = Y.dates[Math.max(Y.pct200.findIndex((v) => v != null), p.dp.findIndex((v) => v != null))]; }
    else if (sec.adjclose[k]) { const p = priceSeries(sec.adjclose[k]), b = breadthSeries(br, k, sec.dates); dates = sec.dates; from = sec.dates[Math.max(b.pct200.findIndex((v) => v != null), p.dp.findIndex((v) => v != null))]; }
    else continue;
    const q = scale(k, dates, from);
    if (q.labels.some((l) => l.startsWith('▲557'))) hits.push(`${k}: ${q.labels.join(', ')}`);
  }
  out('T3', `serie con l'etichetta ▲557 in MAX: ${hits.join(' | ') || 'nessuna'}`);
}

// ---------- T4. Numeri delle note di versione 0.9.1 ----------
{
  const s = capSeries(CAP.series.SPX), i = s.dates.indexOf('2008-10-10');
  out('T4', `SPX 10/10/2008: cali di almeno il 7% = ${s.x7[i]} (README: 46)`);
  const U = indexSeries(IX.UKX), j = U.dates.indexOf('2026-10-16');
  const keys = Object.keys(U);
  out('T4', `UKX 16/10/2026: campi ${keys.join(',')}`);
  const a20 = U.above20 ? U.above20[j] : U.pct20 ? Math.round(U.pct20[j] * U.n[j] / 100) : null;
  out('T4', `UKX 16/10/2026: titoli sopra la media a 20 = ${a20} su ${U.n[j]} (README: 67)`);
  const C = indexSeries(IX.CSI300), c = C.dates.indexOf('2026-10-16');
  out('T4', `CSI 300 16/10/2026: chiusura ${C.close[c]} contro ${C.close[c - 1]} del ${C.dates[c - 1]}: 1G ${((C.close[c] / C.close[c - 1] - 1) * 100).toFixed(2)}% (README: −0,14%)`);
}

// ---------- T5. Prezzi ricopiati e sedute mancanti negli universi in euro (README 263-265, 0.9.1) ----------
{
  const g = R('data/prices_global.json'), D = g.dates;
  const miss = ['2022-09-13', '2022-09-14', '2022-09-15', '2022-09-16', '2022-09-19', '2022-09-20'].filter((d) => !D.includes(d));
  const k21 = D.indexOf('2022-09-21');
  out('T5', `sedute di Milano 13-20/09/2022 assenti dal calendario: ${miss.length} su 6; la seduta prima del 21/09 è il ${D[k21 - 1]}`);
  const dec = ['2023-12-04', '2023-12-05', '2023-12-06'].map((d) => D.indexOf(d));
  const xetra = Object.entries(g.tickers).filter(([s, t]) => t.copied && dec.every((x) => t.copied.includes(x))).map(([s]) => s);
  const xetraAll = Object.keys(g.tickers).filter((s) => s.endsWith('.DE'));
  out('T5', `04-06/12/2023 (indici ${dec.join(',')}): ricopiati per ${xetra.length} ETF (${xetra.join(' ')}); ETF di Xetra nell'universo ${xetraAll.length}; seduta prima ${D[dec[0] - 1]}`);
  const cs = g.tickers['CSNDX.MI'], i30 = D.indexOf('2025-12-30');
  // ultimo indice non ricopiato prima del 30/12
  let src = i30; while (cs.copied.includes(src)) src--;
  out('T5', `CSNDX.MI 30/12/2025 (indice ${i30}) ricopiato: ${cs.copied.includes(i30)}; prezzo preso dal ${D[src]}`);
  const mw = g.tickers['MWEQ.MI'].close.findIndex((v) => v != null);
  out('T5', `MWEQ.MI primo prezzo ${D[mw]} (README: «dal 2024»); primo giorno del calendario ${D[0]}`);
  const firstDB = g.tickers['DBMFE.PA'];
  out('T5', `DBMFE.PA nome: ${firstDB.name}`);
}

// ---------- T6. Drawdown citati (README 19-20, guida rapida: GLD 29/01/2026 509,70 contro 495,90) ----------
{
  const m = R('data/prices_macro.json');
  const gi = m.dates.indexOf('2026-09-29');
  const gld = priceSeries(m.tickers.GLD.close);
  out('T6', `GLD 29/09/2026 drawdown ${gld.dd[gi]?.toFixed(2)}% · max52 ${JSON.stringify(m.tickers.GLD.max52)}`);
  const si = sec.dates.indexOf('2026-09-29'), xlu = priceSeries(sec.adjclose.XLU);
  out('T6', `XLU 29/09/2026 drawdown con i dividendi ${xlu.dd[si]?.toFixed(2)}% (il solo prezzo a quella data non è nei dati: max52 vale solo per ${sec.max52At})`);
}

// ---------- T7. Crisi passate (bottom.js JUMPS) contro i minimi ----------
{
  const spy = R('data/prices.json');
  const close = spy.tickers.SPY.close, D = spy.dates;
  out('T7', `prices.json parte dal ${D[0]}: per le crisi prima uso sectors.json (SPY rettificato)`);
  const S = sec.adjclose.SPY, SD = sec.dates;
  const minIn = (a, b) => { let best = null; for (let i = 0; i < SD.length; i++) if (SD[i] >= a && SD[i] <= b && S[i] != null && (best == null || S[i] < S[best])) best = i; return best; };
  for (const [a, b, lab] of [['2008-09-01', '2009-06-30', '2008-09'], ['2011-07-01', '2011-12-31', '2011'], ['2015-12-01', '2016-03-31', '2016'], ['2018-10-01', '2019-01-31', '2018'], ['2020-02-01', '2020-04-30', '2020'], ['2022-01-01', '2022-12-31', '2022'], ['2025-02-01', '2025-05-31', '2025']]) {
    const i = minIn(a, b); out('T7', `${lab}: minimo di chiusura di SPY ${SD[i]}`);
  }
  const b = breadthSeries(br, 'SPX', sec.dates);
  let bi = null; for (let i = 0; i < SD.length; i++) if (SD[i] >= '2008-09-01' && SD[i] <= '2009-06-30' && b.pct200[i] != null && (bi == null || b.pct200[i] < b.pct200[bi])) bi = i;
  const ties = SD.filter((d, i) => d >= '2008-09-01' && d <= '2009-06-30' && b.pct200[i] === b.pct200[bi]);
  out('T7', `breadth S&P 500 minima 2008-09: ${b.pct200[bi]}% il ${SD[bi]} (sedute con lo stesso valore: ${ties.join(', ')})`);
  const i20 = SD.indexOf('2008-11-20');
  out('T7', `breadth S&P 500 il 20/11/2008: ${b.pct200[i20]}%`);
}

// ---------- T8. Note della 0.9.4 (XLY 2008, SPX ott 2011, UKX apr 2008) ----------
{
  const m = runMachine(priceSeries(sec.adjclose.XLY), breadthSeries(br, 'XLY', sec.dates), th.blue.XLY, th.params);
  out('T8', 'XLY eventi 2008-2009: ' + m.events.filter((e) => sec.dates[e.t] >= '2008-01-01' && sec.dates[e.t] <= '2009-06-30').map((e) => `${sec.dates[e.t]} ${e.code}`).join(', '));
  for (const [k, a, b] of [['SPX', '2011-08-01', '2011-12-31'], ['UKX', '2008-01-01', '2008-06-30']]) {
    const X = indexSeries(IX[k]), mm = runMachine(priceSeries(X.close), X, cfg[k].blue, th.params);
    out('T8', `${k} eventi ${a}..${b}: ` + mm.events.filter((e) => X.dates[e.t] >= a && X.dates[e.t] <= b).map((e) => `${X.dates[e.t]} ${e.code}`).join(', '));
  }
}

// ---------- T9. Cali forti: frequenza dei −7% (Corea contro Svizzera), episodi ago 2007 – set 2008, prova su quanti indici ----------
{
  const freq = (k) => { const s = capSeries(CAP.series[k]); let x = 0, n = 0; s.x7.forEach((v, i) => { if (v != null && s.n[i]) { x += v; n += s.n[i]; } }); return (1e4 * x) / n; };
  out('T9', `cali −7% ogni 10.000 titoli-seduta: KOSPI200 ${freq('KOSPI200').toFixed(1)}, SMI ${freq('SMI').toFixed(1)}`);
  const idx = Object.keys(CAP.series).filter((k) => cfg[k]);
  out('T9', `serie dei cali forti degli indici: ${idx.length} (manca: ${Object.keys(cfg).filter((k) => !CAP.series[k]).join(', ') || 'nessuno'})`);
  const rows = [];
  for (const k of idx) {
    const s = capSeries(CAP.series[k]), a = capAnalysis(s, {}), X = indexSeries(IX[k]);
    const { rows: rr } = capOutcomes(a.episodes, s.dates, X.dates, X.close, a.from);
    for (const r of rr) if (r.date >= '2007-08-01' && r.date <= '2008-09-30') rows.push(`${k} ${r.date} ${r.r252 == null ? '—' : (r.r252 * 100).toFixed(2) + '%'}`);
  }
  out('T9', `episodi ago 2007 – set 2008 (rendimento a 12 mesi): ${rows.length}: ${rows.join(' · ')}`);
}

// ---------- T10. Persistenza dell'allerta 2020: quante serie in un solo episodio ----------
{
  let one = 0, more = 0;
  for (const k of Object.keys(CAP.series)) {
    const s = capSeries(CAP.series[k]), a = capAnalysis(s, {});
    const eps = a.episodes.filter((e) => s.dates[e.start] >= '2020-02-15' && s.dates[e.start] <= '2020-12-31');
    if (!eps.length) continue;
    const i0 = eps[0].start, i1 = i0 + 252;
    const n = a.episodes.filter((e) => e.start >= i0 && e.start < i1).length;
    if (n === 1) one++; else more++;
  }
  out('T10', `2020: serie con un solo episodio nei 12 mesi ${one}, con più episodi ${more}`);
}

// ---------- T11. Universo e portafoglio (README 39, 47; guida 230, 238, 242) ----------
{
  const U = R('universe.json');
  const g = Object.values(U.global || {}).find((x) => x.portfolio) || (U.global && U.global.groups && Object.values(U.global.groups).find((x) => x.portfolio));
  const find = (o, key, path = []) => { if (!o || typeof o !== 'object') return null; if (key in o) return o[key]; for (const [k, v] of Object.entries(o)) { const r = find(v, key, path.concat(k)); if (r) return r; } return null; };
  const P = find(U, 'portfolio');
  out('T11', `pesi: ${JSON.stringify(P && P.weights)}`);
  out('T11', `classi: ${JSON.stringify(P && P.classes && P.classes.map((c) => [c.name, c.tickers.reduce((s, t) => s + (P.weights[t] || 0), 0)]))}`);
  const proxy = find(U, 'proxy');
  out('T11', `storia ricostruita (history.proxy): ${JSON.stringify(proxy)}`);
  const txt = fs.readFileSync(new URL('universe.json', ROOT), 'utf8');
  out('T11', `ISIN LU2951555403 in universe.json: ${txt.includes('LU2951555403')}`);
}

// ---------- T12. CPI (README 273, index.html 255) ----------
{
  const c = R('config/cpi_releases.json'), m = R('data/prices_macro.json').cpi;
  const ks = Object.keys(c.releases).sort();
  out('T12', `config/cpi_releases.json: da ${ks[0]} a ${ks.at(-1)} (${ks.length} mesi); 2025-10 presente: ${'2025-10' in c.releases}; in prices_macro: ${'2025-10' in m.months}`);
  out('T12', `prices_macro.cpi: ultimo mese ${Object.keys(m.months).sort().at(-1)}, uscito il ${m.releases[Object.keys(m.months).sort().at(-1)]}`);
}

// ---------- T13. Settori piccoli e punti per titolo (index.html 323, guida 134) ----------
{
  const L = br.dates.length, last = L - 1;
  const rows = Object.keys(th.blue).map((k) => { const n = expandRLE(br.series[k].n, L)[last]; return [k, n, 100 / n]; }).sort((a, b) => a[1] - b[1]);
  out('T13', rows.map(([k, n, p]) => `${k} ${n} (${p.toFixed(2)})`).join(' · '));
}

// ---------- T14. Copertura iniziale degli indici «con limiti» (README 197: almeno il 60% dei membri di oggi) ----------
{
  const rows = Object.keys(cfg).filter((k) => cfg[k].limits).map((k) => { const X = indexSeries(IX[k]), f = X.pct200.findIndex((v) => v != null); return `${k} ${X.dates[f]} ${Math.round((100 * X.n[f]) / X.members[f])}%`; });
  out('T14', rows.join(' · '));
  const pxStart = Object.keys(cfg).map((k) => `${k} ${indexSeries(IX[k]).dates[0]}`);
  out('T14', `prima seduta del prezzo (percentile del drawdown): ${pxStart.join(' · ')}`);
}

// ---------- T15. «nov 2008, minimo della breadth»: minimo della breadth di ogni settore tra set 2008 e giu 2009 ----------
{
  const SD = sec.dates, rows = [];
  for (const k of ['SPX', ...Object.keys(th.blue)]) {
    const b = breadthSeries(br, k, SD).pct200;
    let bi = null; for (let i = 0; i < SD.length; i++) if (SD[i] >= '2008-09-01' && SD[i] <= '2009-06-30' && b[i] != null && (bi == null || b[i] < b[bi])) bi = i;
    const nov = SD.map((d, i) => [d, b[i]]).filter(([d]) => d >= '2008-11-01' && d <= '2008-11-30').reduce((m, x) => (m == null || x[1] < m[1] ? x : m), null);
    rows.push(`${k} min ${b[bi].toFixed(1)}% il ${SD[bi]} (nov 2008: ${nov[1].toFixed(1)}% il ${nov[0]})`);
  }
  out('T15', rows.join(' · '));
  // media della breadth degli 11 settori: settimana con il minimo
  const L = Object.keys(th.blue).map((k) => breadthSeries(br, k, SD).pct200);
  let mi = null; for (let i = 0; i < SD.length; i++) if (SD[i] >= '2008-09-01' && SD[i] <= '2009-06-30') { const v = L.reduce((s, a) => s + a[i], 0) / L.length; if (mi == null || v < mi[1]) mi = [SD[i], v]; }
  out('T15', `media delle breadth degli 11 settori: minimo ${mi[1].toFixed(1)}% il ${mi[0]}`);
  const i20 = SD.indexOf('2008-11-20'), i09 = SD.indexOf('2009-03-09');
  out('T15', `media il 20/11/2008: ${(L.reduce((s, a) => s + a[i20], 0) / L.length).toFixed(1)}%; il 09/03/2009: ${(L.reduce((s, a) => s + a[i09], 0) / L.length).toFixed(1)}%`);
}

// ---------- T16. tolto il 20/10/2026: confrontava con letture del grafico di Rea, che non stanno nel repository ----------

// ---------- T17. «Nuova: di solito entro 3 punti da 100» anche fuori dai settori (universi in euro e asset reali) ----------
{
  const { build } = await import('../../../../js/engine.js');
  for (const [file, bench] of [['data/prices_global.json', null], ['data/prices_macro.json', null]]) {
    const ds = R(file);
    for (const [name, g] of Object.entries(ds.groups)) {
      const b = g.benchmarks.find((x) => x !== 'PTF' && ds.tickers[x]);
      const syms = (g.tickers || Object.keys(ds.tickers).filter((s) => (ds.tickers[s].groups || []).includes(name))).filter((s) => s !== b);
      const r = build(ds, { symbols: syms, benchmark: b, timeframe: 'weekly', formula: 'nuova' });
      let n = 0, in3 = 0;
      for (const s of Object.keys(r.series)) for (let i = r.start; i < r.dates.length; i++) { const x = r.series[s].x[i]; if (x != null) { n++; if (Math.abs(x - 100) <= 3) in3++; } }
      out('T17', `${name} contro ${b}: |RS-Ratio − 100| ≤ 3 nel ${((100 * in3) / n).toFixed(1)}% dei punti settimanali (${n})`);
    }
  }
}
