// Ricostruzione indipendente di DXY_INV (prices_macro.json) e della storia di DBMFE.PA prima del raccordo
// (prices_global.json) con la data «vecchia» (ts + gmtoffset di oggi) e quella «nuova» (giorno locale nel fuso
// della borsa con l'ora legale di quel giorno). Non usa il codice dell'app: le regole dell'ora legale sono scritte qui.
// Uso: node ricostruisci.mjs <cacheDir> <prices_macro.json> <prices_global.json> [etichetta]
import fs from 'node:fs';
import path from 'node:path';
const [cache, fMacro, fGlobal, tag = ''] = process.argv.slice(2);
const load = (s) => JSON.parse(fs.readFileSync(path.join(cache, `${s}_5y.json`), 'utf-8'));
const r4 = (x) => Math.round(x * 10000) / 10000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// --- regole dell'ora legale scritte a mano ---
const sundays = (y, m) => { const out = []; for (let d = 1; d <= 31; d++) { const t = Date.UTC(y, m, d); if (new Date(t).getUTCMonth() !== m) break; if (new Date(t).getUTCDay() === 0) out.push(d); } return out; };
// USA dal 2007: dalla 2a domenica di marzo alle 2:00 locali (07:00 UTC) alla 1a domenica di novembre alle 2:00 EDT (06:00 UTC)
function nyOffset(tsSec) {
  const y = new Date(tsSec * 1000).getUTCFullYear();
  const a = Date.UTC(y, 2, sundays(y, 2)[1], 7) / 1000, b = Date.UTC(y, 10, sundays(y, 10)[0], 6) / 1000;
  return tsSec >= a && tsSec < b ? -4 * 3600 : -5 * 3600;
}
// UE/UK: dall'ultima domenica di marzo all'ultima di ottobre, alle 01:00 UTC
function euOffset(tsSec, base) {
  const y = new Date(tsSec * 1000).getUTCFullYear();
  const a = Date.UTC(y, 2, sundays(y, 2).at(-1), 1) / 1000, b = Date.UTC(y, 9, sundays(y, 9).at(-1), 1) / 1000;
  return base + (tsSec >= a && tsSec < b ? 3600 : 0);
}
const OFF = { 'America/New_York': nyOffset, 'Europe/London': (t) => euOffset(t, 0), 'Europe/Paris': (t) => euOffset(t, 3600) };

// barre: data vecchia o nuova; chiusure nulle saltate; data doppia → tiene l'ultima (come parse)
function bars(res, mode) {
  const tz = res.meta.exchangeTimezoneName;
  const q = res.indicators.quote[0], adj = res.indicators.adjclose?.[0]?.adjclose || q.close;
  const out = { dates: [], close: [], adj: [], ts: [], dup: 0 };
  res.timestamp.forEach((t, i) => {
    const c = q.close[i], a = adj[i];
    if (c == null || a == null) return;
    const off = mode === 'old' ? res.meta.gmtoffset : OFF[tz](t);
    const d = iso((t + off) * 1000);
    if (out.dates.at(-1) === d) { out.close[out.close.length - 1] = c; out.adj[out.adj.length - 1] = a; out.ts[out.ts.length - 1] = t; out.dup++; return; }
    out.dates.push(d); out.close.push(c); out.adj.push(a); out.ts.push(t);
  });
  return out;
}
// ultimo valore con data <= d
function asof(s, dates, key = 'close') {
  let j = 0, last = null;
  return dates.map((d) => { while (j < s.dates.length && s.dates[j] <= d) last = s[key][j++]; return last; });
}
const stats = (a) => { const s = a.slice().sort((x, y) => x - y); const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; return { n: s.length, med: q(0.5), p95: q(0.95), max: s.at(-1) }; };
const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

const out = { tag };
// ---------- DXY_INV ----------
const dx = load('DX-Y.NYB');
out.dxMeta = { tz: dx.meta.exchangeTimezoneName, gmtoffset: dx.meta.gmtoffset, barre: dx.timestamp.length };
// a che ora UTC cadono le barre
const hours = {}; dx.timestamp.forEach((t) => { const h = new Date(t * 1000).getUTCHours(); hours[h] = (hours[h] || 0) + 1; });
out.dxOreUTC = hours;
const M = JSON.parse(fs.readFileSync(fMacro, 'utf-8'));
const mdates = M.dates, pub = M.tickers.DXY_INV.close;
const dOld = bars(dx, 'old'), dNew = bars(dx, 'new');
out.dxDateDoppieVecchie = dOld.dup; out.dxDateDoppieNuove = dNew.dup;
// quante barre cambiano data
let moved = 0; { const mo = new Map(dx.timestamp.map((t) => [t, iso((t + dx.meta.gmtoffset) * 1000)])); for (const t of dx.timestamp) if (mo.get(t) !== iso((t + nyOffset(t)) * 1000)) moved++; }
out.dxBarreSpostate = moved;
// Intl come controllo delle regole scritte a mano
let intlDiff = 0; const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
for (const t of dx.timestamp) if (fmt.format(t * 1000) !== iso((t + nyOffset(t)) * 1000)) intlDiff++;
out.dxRegoleManoVsIntl = intlDiff;
const inv = (v) => (v ? r4(10000 / r4(v)) : null);
const oldInv = asof(dOld, mdates).map(inv), newInv = asof(dNew, mdates).map(inv);
let eqOld = 0, eqNew = 0, cmp = 0, diffOldNew = 0, nextDay = 0; const lvl = [], ret = [], mism = [];
for (let i = 0; i < mdates.length; i++) {
  if (pub[i] == null || oldInv[i] == null) continue;
  cmp++;
  if (Math.abs(pub[i] - oldInv[i]) < 1e-9) eqOld++; else mism.push([mdates[i], pub[i], oldInv[i], newInv[i]]);
  if (Math.abs(pub[i] - newInv[i]) < 1e-9) eqNew++;
  if (oldInv[i] !== newInv[i]) {
    diffOldNew++;
    lvl.push(Math.abs(oldInv[i] / newInv[i] - 1) * 100);
    if (i + 1 < mdates.length && oldInv[i] === newInv[i + 1]) nextDay++;
  }
}
for (let i = 1; i < mdates.length; i++) if (oldInv[i] && oldInv[i - 1] && newInv[i] && newInv[i - 1]) ret.push(Math.abs((oldInv[i] / oldInv[i - 1] - newInv[i] / newInv[i - 1]) * 100));
// scarto di livello su tutte le sedute (anche quelle uguali) e sulle sole sedute diverse
const lvlAll = []; for (let i = 0; i < mdates.length; i++) if (oldInv[i] && newInv[i]) lvlAll.push(Math.abs(oldInv[i] / newInv[i] - 1) * 100);
const iMax = lvlAll.indexOf(Math.max(...lvlAll)); const idxAll = []; for (let i = 0; i < mdates.length; i++) if (oldInv[i] && newInv[i]) idxAll.push(i);
out.DXY_INV = {
  file: fMacro, asOf: M.asOf, sedute: mdates.length, primaData: mdates[0],
  confrontate: cmp, fileUgualeVecchio: eqOld, fileUgualeNuovo: eqNew, primeDifferenzeFileVsVecchio: mism.slice(0, 5), ultimeDifferenzeFileVsVecchio: mism.slice(-16),
  seduteDiverseVecchioNuovo: diffOldNew, diverseDoveVecchio_eq_NuovoSedutaDopo: nextDay,
  scartoLivelloSuDiverse: stats(lvl), scartoLivelloSuTutte: { ...stats(lvlAll), medianaVera: median(lvlAll) }, medianaSuDiverse: median(lvl),
  massimo: { data: mdates[idxAll[lvlAll.indexOf(Math.max(...lvlAll))]], vecchio: oldInv[idxAll[lvlAll.indexOf(Math.max(...lvlAll))]], nuovo: newInv[idxAll[lvlAll.indexOf(Math.max(...lvlAll))]] },
  scartoRendimentiPunti: stats(ret),
};

// ---------- DBMFE.PA ----------
const fx = load('EURUSD=X'), dbmf = load('DBMF'), live = load('DBMFE.PA');
out.fxMeta = { tz: fx.meta.exchangeTimezoneName, gmtoffset: fx.meta.gmtoffset }; out.liveMeta = { tz: live.meta.exchangeTimezoneName, gmtoffset: live.meta.gmtoffset, cur: live.meta.currency };
const G = JSON.parse(fs.readFileSync(fGlobal, 'utf-8'));
const gd = G.dates, gp = G.tickers['DBMFE.PA'].close;
const L = bars(live, 'new'), Lold = bars(live, 'old');
out.liveDateUguali = JSON.stringify(L.dates) === JSON.stringify(Lold.dates);
const P = bars(dbmf, 'new'), Pold = bars(dbmf, 'old');
out.dbmfDateUguali = JSON.stringify(P.dates) === JSON.stringify(Pold.dates);
let fxMoved = 0; for (const t of fx.timestamp) if (iso((t + fx.meta.gmtoffset) * 1000) !== iso((t + OFF[fx.meta.exchangeTimezoneName](t)) * 1000)) fxMoved++;
out.fxBarreSpostate = fxMoved; out.fxBarre = fx.timestamp.length;
function build(mode) {
  const F = bars(fx, mode);
  const rate = asof(F, P.dates);
  const eur = P.adj.map((v, i) => (rate[i] ? v / rate[i] : null));
  const d0 = L.dates[0];
  let j = -1; while (j + 1 < P.dates.length && P.dates[j + 1] <= d0) j++;
  const k = L.adj[0] / eur[j];
  const n = P.dates.findIndex((d) => d >= d0);
  const ser = { dates: P.dates.slice(0, n).concat(L.dates), close: eur.slice(0, n).map((v) => v * k).concat(L.adj) };
  return { k, d0, rajDate: P.dates[j], rateAtRaccordo: rate[j], fxDateUsata: F.dates[F.dates.filter((d) => d <= P.dates[j]).length - 1], vals: asof(ser, gd).map((v) => (v == null ? null : r4(v))) };
}
const bo = build('old'), bn = build('new');
let gEqOld = 0, gEqNew = 0, gCmp = 0; const gmis = [], gl = [], gret = [];
const pre = gd.map((d) => d < bo.d0);
for (let i = 0; i < gd.length; i++) {
  if (gp[i] == null || bo.vals[i] == null) continue;
  gCmp++;
  const rel = Math.abs(gp[i] / bo.vals[i] - 1);
  if (rel < 2e-6) gEqOld++; else gmis.push([gd[i], gp[i], bo.vals[i], bn.vals[i]]);
  if (Math.abs(gp[i] / bn.vals[i] - 1) < 2e-6) gEqNew++;
  if (pre[i]) gl.push((bn.vals[i] / bo.vals[i] - 1) * 100);
}
for (let i = 1; i < gd.length; i++) if (pre[i] && bo.vals[i] && bo.vals[i - 1]) gret.push(Math.abs((bo.vals[i] / bo.vals[i - 1] - bn.vals[i] / bn.vals[i - 1]) * 100));
const glAbs = gl.map(Math.abs); const gi = glAbs.indexOf(Math.max(...glAbs));
const preDates = gd.filter((d, i) => pre[i] && bo.vals[i] != null);
out.DBMFE = {
  file: fGlobal, asOf: G.asOf, spliced: G.tickers['DBMFE.PA'].spliced,
  fattoreVecchio: bo.k, fattoreNuovo: bn.k, variazioneFattorePct: (bn.k / bo.k - 1) * 100, raccordo: bo.d0, ultimaBarraDBMF: bo.rajDate,
  cambioVecchio: { data: bo.fxDateUsata, valore: bo.rateAtRaccordo }, cambioNuovo: { data: bn.fxDateUsata, valore: bn.rateAtRaccordo },
  confrontate: gCmp, fileUgualeVecchio: gEqOld, fileUgualeNuovo: gEqNew, differenzeFileVsVecchio: gmis.slice(0, 10), nDifferenze: gmis.length,
  scartoPrimaDelRaccordoPct: { n: gl.length, mediana: median(gl), medianaAss: median(glAbs), p95Ass: stats(glAbs).p95, maxAss: glAbs[gi], dataMax: preDates[gi], minimo: Math.min(...gl), massimo: Math.max(...gl), seduteInSalita: gl.filter((x) => x > 0).length, seduteSoloFattore: gl.filter((x) => Math.abs(x - (bn.k / bo.k - 1) * 100) < 1e-3).length },
  scartoRendimentiPunti: { ...stats(gret), mediana: median(gret) },
  dopoRaccordoUguali: gd.every((d, i) => d < bo.d0 || bo.vals[i] === bn.vals[i]),
};
console.log(JSON.stringify(out, null, 1));
