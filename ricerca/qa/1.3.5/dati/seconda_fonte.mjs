// Seconda fonte per le date: EURUSD=X e DX-Y.NYB di Yahoo, datati alla vecchia (ts + gmtoffset di oggi) e alla nuova
// (giorno locale con l'ora legale), contro i tassi di riferimento BCE (14:15 CET) e i cambi di mezzogiorno di New York
// della Fed (FRED H.10). Il DXY si ricostruisce con la formula ICE dai sei cambi (BCE e FRED); DTWEXBGS solo per il segno.
// Uso: node seconda_fonte.mjs <cacheDir>   (cacheDir con i JSON di Yahoo e la cartella ext/ con i CSV di BCE e FRED)
import fs from 'node:fs';
import path from 'node:path';
const cache = process.argv[2];
const load = (s) => JSON.parse(fs.readFileSync(path.join(cache, `${s}_5y.json`), 'utf-8'));
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const tzDate = (tz) => { const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return (t) => f.format(t * 1000); };
function yahoo(sym) {
  const r = load(sym), q = r.indicators.quote[0];
  const local = tzDate(r.meta.exchangeTimezoneName);
  const rows = [];
  r.timestamp.forEach((t, i) => { if (q.close[i] != null) rows.push({ t, c: q.close[i], old: iso((t + r.meta.gmtoffset) * 1000), neu: local(t) }); });
  return rows;
}
const series = (rows, key) => { const m = new Map(); for (const x of rows) m.set(x[key], x.c); return m; }; // data doppia: l'ultima
function fred(id) { const m = new Map(); for (const l of fs.readFileSync(path.join(cache, 'ext', id + '.csv'), 'utf-8').trim().split('\n').slice(1)) { const [d, v] = l.split(','); if (v && v !== '.' && !isNaN(+v)) m.set(d, +v); } return m; }
function ecb(c) { const L = fs.readFileSync(path.join(cache, 'ext', `ECB_${c}.csv`), 'utf-8').trim().split('\n'); const h = L[0].split(','); const iD = h.indexOf('TIME_PERIOD'), iV = h.indexOf('OBS_VALUE'); const m = new Map(); for (const l of L.slice(1)) { const p = l.split(','); if (p[iV] !== '' && !isNaN(+p[iV])) m.set(p[iD], +p[iV]); } return m; }
// rendimenti sulle date comuni consecutive (stessa coppia di date nelle due serie)
function compare(a, b, dates) {
  const ds = dates.filter((d) => a.has(d) && b.has(d)).sort();
  const xs = [], ys = [];
  for (let i = 1; i < ds.length; i++) { xs.push(Math.log(a.get(ds[i]) / a.get(ds[i - 1]))); ys.push(Math.log(b.get(ds[i]) / b.get(ds[i - 1]))); }
  const n = xs.length; if (n < 5) return { n };
  const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0, sign = 0, nz = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; if (xs[i] && ys[i]) { nz++; if (Math.sign(xs[i]) === Math.sign(ys[i])) sign++; } }
  const lv = ds.map((d) => Math.abs(Math.log(a.get(d) / b.get(d)))).sort((p, q) => p - q);
  return { n, corr: +(sxy / Math.sqrt(sxx * syy)).toFixed(3), segnoUguale: `${sign}/${nz}`, segnoPct: +(100 * sign / nz).toFixed(1), scartoLivelloMedianoPct: +(100 * lv[Math.floor(lv.length / 2)]).toFixed(3) };
}
// solo le date di un insieme (barre spostate = estive, barre non spostate = invernali), dal 2021-11-05
function split(rows) { const s = new Set(), w = new Set(); for (const x of rows) if (x.neu >= '2021-11-05') (x.old !== x.neu ? s : w).add(x.neu); return { estate: s, inverno: w }; }
// per il confronto «vecchio» la data vecchia di quelle stesse barre
const out = {};

// ---------- EURUSD ----------
const eu = yahoo('EURUSD=X'), euOld = series(eu, 'old'), euNew = series(eu, 'neu');
const { estate: euS, inverno: euW } = split(eu);
const euOldDatesS = new Set(eu.filter((x) => euS.has(x.neu)).map((x) => x.old));
const ecbUSD = ecb('USD'), fredEU = fred('DEXUSEU');
out.EURUSD = {
  barreEstive: euS.size, barreInvernali: euW.size,
  estate: {
    nuova_vs_BCE: compare(euNew, ecbUSD, [...euS]), vecchia_vs_BCE: compare(euOld, ecbUSD, [...euOldDatesS]),
    nuova_vs_FRED: compare(euNew, fredEU, [...euS]), vecchia_vs_FRED: compare(euOld, fredEU, [...euOldDatesS]),
  },
  inverno: { nuova_vs_BCE: compare(euNew, ecbUSD, [...euW]), nuova_vs_FRED: compare(euNew, fredEU, [...euW]) },
};
// ipotesi «la chiusura della barra d è la sera prima»: barra d contro BCE d-1 (giorno lavorativo precedente)
const shift = (m) => { const ds = [...m.keys()].sort(); const o = new Map(); for (let i = 1; i < ds.length; i++) o.set(ds[i], m.get(ds[i - 1])); return o; };
out.EURUSD.inverno.nuova_vs_BCE_giornoPrima = compare(euNew, shift(ecbUSD), [...euW]);
out.EURUSD.estate.nuova_vs_BCE_giornoPrima = compare(euNew, shift(ecbUSD), [...euS]);
out.EURUSD.inverno.nuova_vs_FRED_giornoPrima = compare(euNew, shift(fredEU), [...euW]);
out.EURUSD.estate.nuova_vs_FRED_giornoPrima = compare(euNew, shift(fredEU), [...euS]);

// ---------- DXY ----------
const dx = yahoo('DX-Y.NYB'), dxOld = series(dx, 'old'), dxNew = series(dx, 'neu');
const { estate: dxS, inverno: dxW } = split(dx);
const dxOldDatesS = new Set(dx.filter((x) => dxS.has(x.neu)).map((x) => x.old));
const dxyFrom = (eurusd, usdjpy, gbpusd, usdcad, usdsek, usdchf) => 50.14348112 * eurusd ** -0.576 * usdjpy ** 0.136 * gbpusd ** -0.119 * usdcad ** 0.091 * usdsek ** 0.042 * usdchf ** 0.036;
function build(get, ids) { const m = new Map(); for (const d of get[0].keys()) { const v = get.map((g) => g.get(d)); if (v.every((x) => x != null)) m.set(d, ids(...v)); } return m; }
const F = ['DEXUSEU', 'DEXJPUS', 'DEXUSUK', 'DEXCAUS', 'DEXSDUS', 'DEXSZUS'].map(fred);
const dxFred = build(F, (eu, jp, uk, ca, sd, sz) => dxyFrom(eu, jp, uk, ca, sd, sz));
const E = ['USD', 'JPY', 'GBP', 'CAD', 'SEK', 'CHF'].map(ecb);
const dxEcb = build(E, (usd, jpy, gbp, cad, sek, chf) => dxyFrom(usd, jpy / usd, usd / gbp, cad / usd, sek / usd, chf / usd));
const broad = fred('DTWEXBGS');
out.DXY = {
  barreEstive: dxS.size, barreInvernali: dxW.size,
  estate: {
    nuova_vs_DXYdaFRED: compare(dxNew, dxFred, [...dxS]), vecchia_vs_DXYdaFRED: compare(dxOld, dxFred, [...dxOldDatesS]),
    nuova_vs_DXYdaBCE: compare(dxNew, dxEcb, [...dxS]), vecchia_vs_DXYdaBCE: compare(dxOld, dxEcb, [...dxOldDatesS]),
    nuova_vs_DTWEXBGS: compare(dxNew, broad, [...dxS]), vecchia_vs_DTWEXBGS: compare(dxOld, broad, [...dxOldDatesS]),
  },
  inverno: { nuova_vs_DXYdaFRED: compare(dxNew, dxFred, [...dxW]), nuova_vs_DXYdaBCE: compare(dxNew, dxEcb, [...dxW]), nuova_vs_DTWEXBGS: compare(dxNew, broad, [...dxW]) },
};
// campione leggibile: alcune date estive e invernali
const sample = ['2022-07-14', '2023-06-15', '2024-08-05', '2025-04-09', '2025-04-10', '2025-04-11', '2025-07-02', '2026-06-17', '2022-12-14', '2024-01-11', '2025-02-03', '2026-01-21'];
out.campioneDXY = sample.map((d) => ({ d, yahooNuova: dxNew.get(d)?.toFixed(3), yahooVecchia: dxOld.get(d)?.toFixed(3), daFRED_mezzogiornoNY: dxFred.get(d)?.toFixed(3), daBCE_14_15CET: dxEcb.get(d)?.toFixed(3) }));
out.campioneEURUSD = sample.map((d) => ({ d, yahooNuova: euNew.get(d)?.toFixed(5), yahooVecchia: euOld.get(d)?.toFixed(5), BCE: ecbUSD.get(d), FRED: fredEU.get(d) }));
console.log(JSON.stringify(out, null, 1));
