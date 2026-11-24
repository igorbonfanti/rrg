// Ricerca «VIX: regimi». Come vanno S&P 500 e Nasdaq-100 dopo che il VIX (o il VXN) raggiunge certi livelli?
// Versione per EPISODI INDIPENDENTI dello scatter di Massimo Rea (quant-rea: ogni seduta con il VIX sopra 30 contro il
// rendimento dell'S&P 500 a un anno). Nessun dato preso dalla piattaforma quant-rea: solo l'idea, citata.
//
// METODO (criteri fissati prima di guardare i risultati; le varianti sono solo sensibilità)
// - Dati (cache in ricerca/vix/cache/, scaricata da scarica.mjs): VIX = FRED VIXCLS (fonte principale, dal 1990),
//   VXN = FRED VXNCLS (dal 2001); seconda fonte Yahoo ^VIX, ^VXN. Indici Yahoo ^GSPC e ^NDX (solo prezzo), ^SP500TR
//   (total return, sensibilità). ^XNDX su Yahoo non ha storia (una sola barra): niente total return per il Nasdaq-100.
// - Calendario: le sedute dell'indice. Il VIX si prende alla stessa data; i giorni in cui il VIX c'è ma la borsa è chiusa
//   (FRED pubblica il VIX anche in alcune feste, dal 2022) si scartano; una seduta dell'indice senza VIX è una seduta senza
//   VIX (non si riempie): per il conteggio delle sedute tranquille contano solo le sedute con il VIX.
// - Episodio (soglia X ∈ {20, 25, 30, 40, 50}, quiete Q = 63 sedute; sensibilità Q = 21 e 126): inizia alla prima
//   chiusura con VIX ≥ X preceduta da almeno Q sedute (con il VIX) tutte < X. Finisce all'ultima chiusura ≥ X prima della
//   ripartenza successiva (o dei dati). VIX massimo = massimo delle chiusure tra inizio e fine.
// - Rendimenti dell'indice dalla chiusura del giorno del segnale t a t+h sedute, h ∈ {21, 63, 126, 252}
//   (sensibilità: dalla chiusura di t+1 a t+1+h). Nullo se t+h non c'è ancora (episodio «in corso»).
// - Calo successivo = min(0, min_{t<k≤t+252} close_k / close_t − 1): quanto scende l'indice sotto il prezzo del segnale
//   entro 252 sedute. Sedute al minimo = posizione della chiusura più bassa in [t, t+252] meno t (0 = il segnale era il
//   minimo). Solo con la finestra completa; con la finestra incompleta si riporta il valore parziale, marcato.
// - Base: tutte le sedute dell'indice dalla prima data del VIX (1990-01-02; per il VXN 2001-02-02) con t+h disponibile:
//   mediana, quota di positivi, 10° percentile (quantile lineare, tipo 7 come numpy). Stessa cosa per i GIORNI con
//   VIX ≥ X (come lo scatter di Rea).
// - Criterio «significativo» (per mostrare una soglia): almeno 8 episodi con 252 sedute complete; mediana a 252 sedute
//   ≥ base + 5 punti OPPURE quota di positivi a 252 ≥ base + 15 punti; e la differenza (episodi − base dello stesso
//   sottoperiodo) va nella stessa direzione in almeno 2 dei sottoperiodi 1990-2007, 2008-2015, 2016-oggi che hanno
//   episodi (con meno di 2 sottoperiodi con episodi il controllo non si può fare: non passa).
//   Verdetto: passa e ≥ 30 episodi → «mostrare»; passa con 8-29 episodi → «mostrare con avvertenza» (numeri indicativi);
//   non passa → «non mostrare».
// - Nasdaq-100 separato se, alla stessa soglia, la mediana a 126 o 252 sedute differisce da quella dell'S&P 500 di almeno
//   5 punti, o il calo successivo mediano è più profondo di almeno 5 punti.
// - Oggi: ultimo VIX disponibile, percentile nella storia fino a quel giorno (quota delle chiusure ≤ valore, finestra
//   crescente dal 1990), fascia.
// - Esplorazione (descrittiva): VIX agli ingressi in zona blu e ai trigger di SPX e NDX nella vista Indici dell'app
//   (data/indices.json, runMachine di js/signals.js con config/indices.json e config/thresholds.json); rendimenti dal
//   trigger con forward() dell'app (chiusura del trigger → t+h), divisi per VIX al trigger ≥ 30 o < 30.
//
// Uso: node ricerca/vix/regimi/script/scarica.mjs   (una volta)
//      node ricerca/vix/regimi/script/regimi.mjs    → ricerca/vix/regimi/risultati.json (+ tabelle a schermo)
//      python3 -I ricerca/vix/regimi/script/verifica.py   (ricalcolo indipendente di S&P 500 / VIX, soglie 30-40-50)
import fs from 'node:fs';
import { priceSeries, runMachine, forward, DEFAULT_PARAMS } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';

const ROOT = new URL('../../../../', import.meta.url);
const R = (f) => JSON.parse(fs.readFileSync(new URL(f, ROOT)));
const cache = (s) => R('ricerca/vix/cache/' + s.replace(/[^A-Za-z0-9]/g, '_') + '.json');

export const XS = [20, 25, 30, 40, 50];
export const HS = [21, 63, 126, 252];
export const SUB = [['1990-2007', '1990-01-01', '2007-12-31'], ['2008-2015', '2008-01-01', '2015-12-31'], ['2016-oggi', '2016-01-01', '2099-12-31']];
// Crisi (finestre decise prima di guardare gli episodi; solo etichette descrittive)
export const CRISES = [
  ['1990 Golfo', '1990-07-01', '1991-03-31'], ['1997 Asia', '1997-10-01', '1997-12-31'], ['1998 Russia/LTCM', '1998-08-01', '1998-12-31'],
  ['2000-03 bolla internet', '2000-03-01', '2003-04-30'], ['2007-09 crisi finanziaria', '2007-07-01', '2009-06-30'],
  ['2010 euro/flash crash', '2010-05-01', '2010-09-30'], ['2011-12 debito USA/euro', '2011-07-01', '2012-06-30'],
  ['2014 ottobre', '2014-10-01', '2014-12-31'], ['2015-16 Cina/petrolio', '2015-08-01', '2016-03-31'],
  ['2018 volatilità/Fed', '2018-02-01', '2018-12-31'], ['2020 Covid', '2020-02-01', '2020-12-31'],
  ['2022 inflazione/tassi', '2022-01-01', '2022-12-31'], ['2024 carry yen', '2024-07-15', '2024-09-30'],
  ['2025 dazi', '2025-03-01', '2025-05-31'],
];
const crisisOf = (d) => (CRISES.find(([, a, b]) => d >= a && d <= b) || ['altro (' + d.slice(0, 7) + ')'])[0];
const subOf = (d) => SUB.find(([, a, b]) => d >= a && d <= b)[0];

// ---------- statistiche ----------
export function quantile(a, q) { // tipo 7 (numpy, Excel PERCENTILE.INC)
  const v = a.filter((x) => x != null).sort((x, y) => x - y);
  if (!v.length) return null;
  const h = (v.length - 1) * q, lo = Math.floor(h);
  return lo + 1 < v.length ? v[lo] + (h - lo) * (v[lo + 1] - v[lo]) : v[lo];
}
const med = (a) => quantile(a, 0.5);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
function dist(a) {
  const v = a.filter((x) => x != null);
  if (!v.length) return { n: 0, median: null, pos: null, posN: 0, p10: null };
  const posN = v.filter((x) => x > 0).length;
  return { n: v.length, median: r2(med(v)), pos: r2((100 * posN) / v.length), posN, p10: r2(quantile(v, 0.1)), min: r2(Math.min(...v)), max: r2(Math.max(...v)) };
}

// ---------- serie ----------
const rowsMap = (rows) => new Map(rows);
function loadIndex(sym) { const rows = cache(sym).rows; return { sym, dates: rows.map((r) => r[0]), close: rows.map((r) => r[1]) }; }
function align(ix, volRows) { const m = rowsMap(volRows); return ix.dates.map((d) => (m.has(d) ? m.get(d) : null)); }

// Rendimenti e calo successivo dalla posizione p (entry = 0: chiusura del segnale; 1: seduta dopo)
function outcomes(ix, p, entry = 0) {
  const c = ix.close, n = c.length, e = p + entry, o = { ret: {}, partial: false };
  for (const h of HS) o.ret[h] = e + h < n ? r2((c[e + h] / c[e] - 1) * 100) : null;
  const end = Math.min(n - 1, e + 252);
  let mn = c[e], at = e;
  for (let k = e + 1; k <= end; k++) if (c[k] < mn) { mn = c[k]; at = k; }
  o.dd = r2(Math.min(0, (mn / c[e] - 1) * 100));
  o.toMin = at - e;
  o.partial = e + 252 >= n;
  return o;
}

// Episodi sulla serie vol allineata al calendario dell'indice
export function episodes(ix, vol, X, Q = 63, entry = 0) {
  const pos = []; // posizioni dell'indice con il VIX
  vol.forEach((v, i) => { if (v != null) pos.push(i); });
  const v = pos.map((i) => vol[i]);
  const starts = [];
  for (let j = Q; j < v.length; j++) {
    if (v[j] < X) continue;
    let quiet = true;
    for (let k = j - Q; k < j; k++) if (v[k] >= X) { quiet = false; break; }
    if (quiet) starts.push(j);
  }
  return starts.map((j, e) => {
    const stop = e + 1 < starts.length ? starts[e + 1] : v.length;
    let last = j, mx = v[j], at = j;
    for (let k = j; k < stop; k++) if (v[k] >= X) { last = k; if (v[k] > mx) { mx = v[k]; at = k; } }
    const p = pos[j], d = ix.dates[p];
    return { date: d, crisis: crisisOf(d), sub: subOf(d), vix: r2(v[j]), vixMax: r2(mx), vixMaxDate: ix.dates[pos[at]], end: ix.dates[pos[last]],
      sessionsAbove: v.slice(j, last + 1).filter((x) => x >= X).length, p, ...outcomes(ix, p, entry) };
  });
}

// Base: tutte le sedute dalla prima data della vol
function baseStats(ix, from, to = '2099-12-31', entry = 0) {
  const out = {};
  const ps = []; ix.dates.forEach((d, i) => { if (d >= from && d <= to) ps.push(i); });
  for (const h of HS) out[h] = dist(ps.map((p) => (p + entry + h < ix.close.length ? (ix.close[p + entry + h] / ix.close[p + entry] - 1) * 100 : null)));
  const dds = ps.filter((p) => p + entry + 252 < ix.close.length).map((p) => outcomes(ix, p, entry).dd);
  out.dd = { n: dds.length, median: r2(med(dds)), p10: r2(quantile(dds, 0.1)) };
  return out;
}
function dayStats(ix, vol, X, eps, entry = 0) {
  const ps = []; vol.forEach((v, i) => { if (v != null && v >= X) ps.push(i); });
  const out = { days: ps.length };
  for (const h of HS) out[h] = dist(ps.map((p) => (p + entry + h < ix.close.length ? (ix.close[p + entry + h] / ix.close[p + entry] - 1) * 100 : null)));
  // a quale episodio appartiene ogni giorno: l'ultimo iniziato prima (o quel giorno)
  const byEp = new Map();
  for (const p of ps) { let e = null; for (const x of eps) if (x.p <= p) e = x.date; if (e) byEp.set(e, (byEp.get(e) || 0) + 1); }
  const counts = [...byEp.entries()].sort((a, b) => b[1] - a[1]);
  out.episodesSpanned = byEp.size;
  out.top2share = ps.length ? r2((100 * counts.slice(0, 2).reduce((s, x) => s + x[1], 0)) / ps.length) : null;
  out.top2 = counts.slice(0, 2).map(([d, n]) => ({ episode: d, crisis: crisisOf(d), days: n }));
  return out;
}

function evaluate(eps, base, baseSub) {
  const s = {};
  for (const h of HS) s[h] = dist(eps.map((e) => e.ret[h]));
  const full = eps.filter((e) => !e.partial);
  s.dd = { n: full.length, median: r2(med(full.map((e) => e.dd))), worst: full.length ? r2(Math.min(...full.map((e) => e.dd))) : null };
  s.toMin = { median: med(full.map((e) => e.toMin)) };
  const diff = {};
  for (const h of HS) diff[h] = { median: s[h].median == null ? null : r2(s[h].median - base[h].median), pos: s[h].pos == null ? null : r2(s[h].pos - base[h].pos) };
  diff.dd = s.dd.median == null ? null : r2(s.dd.median - base.dd.median);
  const n252 = s[252].n;
  const passMed = diff[252].median != null && diff[252].median >= 5, passPos = diff[252].pos != null && diff[252].pos >= 15;
  const subs = SUB.map(([name]) => {
    const r = eps.filter((e) => e.sub === name).map((e) => e.ret[252]).filter((x) => x != null);
    if (!r.length) return { sub: name, n: 0 };
    const d = dist(r), b = baseSub[name][252];
    return { sub: name, n: r.length, posN: d.posN, median: d.median, pos: d.pos, baseMedian: b.median, basePos: b.pos, dMedian: r2(d.median - b.median), dPos: r2(d.pos - b.pos) };
  });
  const withEp = subs.filter((x) => x.n > 0);
  const agreeMed = withEp.filter((x) => x.dMedian > 0).length, agreePos = withEp.filter((x) => x.dPos > 0).length;
  const robust = withEp.length >= 2 && ((passMed && agreeMed >= 2) || (passPos && agreePos >= 2));
  const pass = n252 >= 8 && (passMed || passPos) && robust;
  const verdict = !pass ? 'non mostrare' : n252 >= 30 ? 'mostrare' : 'mostrare con avvertenza';
  // casi contrari: orizzonti con rendimento mediano o quota di positivi sotto la base
  const worse = HS.filter((h) => diff[h].median != null && (diff[h].median < 0 || diff[h].pos < 0)).map((h) => ({ h, dMedian: diff[h].median, dPos: diff[h].pos }));
  return { stats: s, diff, subperiods: subs, check: { n252, passMed, passPos, subWithEpisodes: withEp.length, agreeMed, agreePos, robust, pass }, verdict, worse };
}

function study(ix, volRows, from, opt = {}) {
  const { Q = 63, entry = 0, withEpisodes = true } = opt;
  const vol = align(ix, volRows).map((v, i) => (ix.dates[i] >= from ? v : null));
  const base = baseStats(ix, from, undefined, entry);
  const baseSub = Object.fromEntries(SUB.map(([n, a, b]) => [n, baseStats(ix, a < from ? from : a, b, entry)]));
  const out = { from, to: ix.dates.at(-1), base, baseSub: Object.fromEntries(Object.entries(baseSub).map(([k, v]) => [k, { 252: v[252] }])), thresholds: {} };
  for (const X of XS) {
    const eps = episodes(ix, vol, X, Q, entry);
    const ev = evaluate(eps, base, baseSub);
    out.thresholds[X] = { nEpisodes: eps.length, ...ev, days: dayStats(ix, vol, X, eps, entry), ...(withEpisodes ? { episodes: eps.map(({ p, ...e }) => e) } : {}) };
  }
  return out;
}

// ---------- esecuzione ----------
const SPX = loadIndex('^GSPC'), NDX = loadIndex('^NDX'), SPTR = loadIndex('^SP500TR');
const VIX = cache('VIXCLS').rows, VXN = cache('VXNCLS').rows, VIXY = cache('^VIX').rows, VXNY = cache('^VXN').rows;
const F0 = VIX[0][0], FN0 = VXN[0][0];

const res = {
  generated: new Date().toISOString(),
  sources: {
    VIX: `FRED VIXCLS ${F0} → ${VIX.at(-1)[0]}`, VXN: `FRED VXNCLS ${FN0} → ${VXN.at(-1)[0]}`,
    VIXyahoo: `Yahoo ^VIX ${VIXY[0][0]} → ${VIXY.at(-1)[0]}`, VXNyahoo: `Yahoo ^VXN ${VXNY[0][0]} → ${VXNY.at(-1)[0]}`,
    SPX: `Yahoo ^GSPC ${SPX.dates[0]} → ${SPX.dates.at(-1)}`, NDX: `Yahoo ^NDX ${NDX.dates[0]} → ${NDX.dates.at(-1)}`, SPTR: `Yahoo ^SP500TR ${SPTR.dates[0]} → ${SPTR.dates.at(-1)}`,
    XNDX: 'Yahoo ^XNDX: nessuna storia (una sola barra), total return del Nasdaq-100 non disponibile',
  },
  params: { XS, HS, Q: 63, sensQ: [21, 126], subperiods: SUB, crises: CRISES },
};

// controllo delle fonti: FRED contro Yahoo
function cmp(a, b, tol = 0.015) {
  const m = new Map(b); let n = 0; const diff = [];
  for (const [d, v] of a) if (m.has(d)) { n++; if (Math.abs(v - m.get(d)) > tol) diff.push([d, r2(v), r2(m.get(d))]); }
  const byYear = {}; for (const [d] of diff) byYear[d.slice(0, 4)] = (byYear[d.slice(0, 4)] || 0) + 1;
  const sd = new Set(SPX.dates);
  return { common: n, differ: diff.length, byYear, first: diff.slice(0, 12), onlyFirst: a.filter(([d]) => !m.has(d)).map(([d]) => d).filter((d) => sd.has(d)), onlyFirstNonSession: a.filter(([d]) => !sd.has(d) && d >= '1990').length };
}
res.sourceCheck = { VIX_fred_vs_yahoo: cmp(VIX, VIXY), VXN_fred_vs_yahoo: cmp(VXN, VXNY) };

res.main = {
  SPX_VIX: study(SPX, VIX, F0),
  NDX_VIX: study(NDX, VIX, F0),
  NDX_VXN: study(NDX, VXN, FN0),
  SPX_VIX_from2001: study(SPX, VIX, FN0), // stesso periodo del VXN, per il confronto
};
const slim = (s) => ({ base: s.base, thresholds: Object.fromEntries(Object.entries(s.thresholds).map(([X, t]) => [X, { nEpisodes: t.nEpisodes, stats: t.stats, diff: t.diff, check: t.check, verdict: t.verdict, dates: (t.episodes || []).map((e) => e.date) }])) });
res.sensitivity = {
  SPX_VIX_Q21: slim(study(SPX, VIX, F0, { Q: 21 })),
  SPX_VIX_Q126: slim(study(SPX, VIX, F0, { Q: 126 })),
  SPX_VIX_nextDay: slim(study(SPX, VIX, F0, { entry: 1 })),
  SPTR_VIX: slim(study(SPTR, VIX, F0)),
  SPX_VIXyahoo: slim(study(SPX, VIXY, F0)),
  NDX_VIX_Q21: slim(study(NDX, VIX, F0, { Q: 21 })),
  NDX_VIX_Q126: slim(study(NDX, VIX, F0, { Q: 126 })),
  NDX_VXNyahoo: slim(study(NDX, VXNY, FN0)),
  NDX_VXN_Q126: slim(study(NDX, VXN, FN0, { Q: 126 })),
};

// Nasdaq-100 contro S&P 500
const cmpIdx = (a, b) => Object.fromEntries(XS.map((X) => {
  const A = a.thresholds[X].stats, B = b.thresholds[X].stats;
  const d = { n: [A[252].n, B[252].n] };
  for (const h of HS) d[h] = { dMedian: A[h].median == null || B[h].median == null ? null : r2(B[h].median - A[h].median), dPos: A[h].pos == null || B[h].pos == null ? null : r2(B[h].pos - A[h].pos) };
  d.dd = A.dd.median == null || B.dd.median == null ? null : r2(B.dd.median - A.dd.median);
  d.worstDd = [A.dd.worst, B.dd.worst];
  // stessa lettura rispetto alla propria base? (eccesso sulla base a 252 sedute e verdetto di ciascuno)
  d.excess252 = [a.thresholds[X].diff[252], b.thresholds[X].diff[252]];
  d.verdicts = [a.thresholds[X].verdict, b.thresholds[X].verdict];
  d.separate = [126, 252].some((h) => d[h].dMedian != null && Math.abs(d[h].dMedian) >= 5) || (d.dd != null && d.dd <= -5);
  return [X, d];
}));
res.ndxVsSpx = {
  note: 'differenze Nasdaq-100 − S&P 500 alla stessa soglia (punti); separate = |Δ mediana 126 o 252| ≥ 5 o calo mediano più profondo di ≥ 5',
  NDX_VIX_vs_SPX_VIX: cmpIdx(res.main.SPX_VIX, res.main.NDX_VIX),
  NDX_VXN_vs_SPX_VIX_from2001: cmpIdx(res.main.SPX_VIX_from2001, res.main.NDX_VXN),
  base: { SPX: res.main.SPX_VIX.base, NDX: res.main.NDX_VIX.base },
};

// ---------- oggi ----------
const band = (v) => (v < 20 ? '< 20' : v < 25 ? '20-25' : v < 30 ? '25-30' : v < 40 ? '30-40' : v < 50 ? '40-50' : '≥ 50');
function today(rows, extra) {
  const all = extra && extra[0] > rows.at(-1)[0] ? [...rows, extra] : rows;
  const [d, v] = all.at(-1);
  const hist = all.map((r) => r[1]);
  const pct = (100 * hist.filter((x) => x <= v).length) / hist.length;
  // episodio in corso? ultima ripartenza per ogni soglia
  return { date: d, value: r2(v), source: extra && all.at(-1) === extra ? 'Yahoo (FRED non ancora pubblicato)' : 'FRED', percentile: r2(pct), n: hist.length, band: band(v) };
}
const lastY = (rows) => [rows.at(-1)[0], rows.at(-1)[1]];
res.today = {
  VIX_fred: today(VIX), VIX_last: today(VIX, lastY(VIXY)),
  VXN_fred: today(VXN), VXN_last: today(VXN, lastY(VXNY)),
  SPX_last: { date: SPX.dates.at(-1), close: r2(SPX.close.at(-1)) }, NDX_last: { date: NDX.dates.at(-1), close: r2(NDX.close.at(-1)) },
};
// stato di oggi per ogni soglia, con il VIX FRED più l'ultima chiusura Yahoo se FRED non l'ha ancora pubblicata
{
  const ext = VIXY.at(-1)[0] > VIX.at(-1)[0] ? [...VIX, ...VIXY.filter(([d]) => d > VIX.at(-1)[0])] : VIX;
  const vol = align(SPX, ext).map((v, i) => (SPX.dates[i] >= F0 ? v : null));
  const last = SPX.dates.length - 1, vNow = vol[last];
  res.today.status = { date: SPX.dates[last], vix: r2(vNow), note: 'VIX FRED fino a ' + VIX.at(-1)[0] + (ext !== VIX ? ', poi Yahoo' : ''), byX: {} };
  for (const X of XS) {
    const eps = episodes(SPX, vol, X, 63);
    const e = eps.at(-1);
    const age = e ? last - e.p : null; // sedute dall'inizio dell'ultimo episodio
    const st = vNow >= X ? (e && e.p === last ? 'nuovo episodio oggi' : 'dentro un episodio iniziato il ' + e.date) : e && age < 252 ? `sotto la soglia; ultimo episodio iniziato il ${e.date} (${age} sedute fa)` : 'sotto la soglia, nessun episodio nelle ultime 252 sedute';
    res.today.status.byX[X] = { status: st, last: e ? { date: e.date, vixMax: e.vixMax, end: e.end, ret: e.ret, ddSoFar: e.dd, partial: e.partial } : null };
  }
}
// episodi aperti: l'ultimo episodio di ogni soglia, se iniziato da meno di 252 sedute (calcolato con il solo FRED)
res.today.openEpisodes = Object.fromEntries(XS.map((X) => { const e = res.main.SPX_VIX.thresholds[X].episodes.at(-1); return [X, e && e.partial ? { date: e.date, vixMax: e.vixMax, ret: e.ret, ddSoFar: e.dd } : null]; }));

// ---------- esplorazione: VIX ai segnali della vista Indici ----------
{
  const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params };
  const CFG = R('config/indices.json').indices, IX = R('data/indices.json').series;
  const vm = rowsMap(VIX);
  const ex = {};
  for (const k of ['SPX', 'NDX']) {
    const X = indexSeries(IX[k]), m = runMachine(priceSeries(X.close), X, CFG[k].blue, P);
    const sig = (t) => ({ date: X.dates[t], vix: vm.has(X.dates[t]) ? r2(vm.get(X.dates[t])) : null, r63: r2(forward(X.close, t, 63)), r126: r2(forward(X.close, t, 126)), r252: r2(forward(X.close, t, 252)) });
    const setups = m.setups.map((s) => ({ ...sig(s.t), failed: s.fails > 0 }));
    const trig = [];
    m.events.forEach((e, i) => {
      if (e.code !== 'trig') return;
      let failed = false;
      for (let j = i + 1; j < m.events.length && m.events[j].code !== 'trig'; j++) if (m.events[j].code === 'fail') { failed = true; break; }
      trig.push({ ...sig(e.t), failed, vixAtSetup: vm.has(X.dates[e.setup.t]) ? r2(vm.get(X.dates[e.setup.t])) : null });
    });
    const grp = (a) => ({ n: a.length, r63: dist(a.map((x) => x.r63)), r126: dist(a.map((x) => x.r126)), r252: dist(a.map((x) => x.r252)), failed: a.filter((x) => x.failed).length });
    ex[k] = {
      blue: CFG[k].blue, from: X.dates.find((_, i) => X.pct200[i] != null), setups, triggers: trig,
      vixAtSetup: dist(setups.map((s) => s.vix)), vixAtTrigger: dist(trig.map((s) => s.vix)),
      trigVixHigh: grp(trig.filter((x) => x.vix != null && x.vix >= 30)), trigVixLow: grp(trig.filter((x) => x.vix != null && x.vix < 30)),
    };
  }
  res.explore = ex;
}

fs.writeFileSync(new URL('../risultati.json', import.meta.url), JSON.stringify(res, null, 1));

// ---------- tabelle a schermo ----------
const f = (x, d = 1) => (x == null ? '—' : x.toFixed(d));
for (const [name, s] of Object.entries(res.main)) {
  console.log(`\n=== ${name} (dal ${s.from}) — base: ` + HS.map((h) => `${h}: med ${f(s.base[h].median)} pos ${f(s.base[h].pos, 0)}% p10 ${f(s.base[h].p10)}`).join(' | ') + ` | calo med ${f(s.base.dd.median)}`);
  for (const X of XS) {
    const t = s.thresholds[X], st = t.stats;
    console.log(`X=${X} ep ${t.nEpisodes} (252 compl. ${st[252].n}) ` + HS.map((h) => `${h}: ${f(st[h].median)} ${st[h].posN}/${st[h].n}`).join(' | ') + ` | calo med ${f(st.dd.median)} peggiore ${f(st.dd.worst)} | sedute al min ${st.toMin.median} | Δ252 med ${f(t.diff[252].median)} pos ${f(t.diff[252].pos)} | sub ${t.subperiods.map((x) => x.n ? `${x.sub}:${x.posN}/${x.n} Δm${f(x.dMedian)}` : `${x.sub}:0`).join(' ')} → ${t.verdict}`);
    console.log(`     giorni ${t.days.days} (${t.days.episodesSpanned} ep., top2 ${f(t.days.top2share, 0)}%): 252 med ${f(t.days[252].median)} pos ${f(t.days[252].pos, 0)}% p10 ${f(t.days[252].p10)}`);
  }
}
for (const [name, s] of Object.entries(res.sensitivity)) console.log(`sens ${name}: ` + XS.map((X) => `${X}: ${s.thresholds[X].nEpisodes} ep 252 ${f(s.thresholds[X].stats[252].median)} ${s.thresholds[X].stats[252].posN}/${s.thresholds[X].stats[252].n} → ${s.thresholds[X].verdict}`).join(' | '));
console.log('\nNDX vs SPX', JSON.stringify(res.ndxVsSpx.NDX_VIX_vs_SPX_VIX));
console.log('NDX(VXN) vs SPX(VIX) dal 2001', JSON.stringify(res.ndxVsSpx.NDX_VXN_vs_SPX_VIX_from2001));
console.log('\noggi', JSON.stringify(res.today));
console.log('fonti', JSON.stringify(res.sourceCheck));
for (const [name, s] of Object.entries(res.main)) for (const X of XS) { const w = s.thresholds[X].worse; if (w.length) console.log(`peggio della base ${name} X=${X}: ` + w.map((x) => `${x.h}: Δmed ${f(x.dMedian)} Δpos ${f(x.dPos)}`).join(' | ')); }
for (const X of XS) { console.log(`\nepisodi SPX_VIX X=${X}`); for (const e of res.main.SPX_VIX.thresholds[X].episodes) console.log(`  ${e.date} ${e.crisis.padEnd(26)} VIX ${f(e.vix)} max ${f(e.vixMax)} (${e.vixMaxDate}) fine ${e.end} | ` + HS.map((h) => f(e.ret[h])).join(' ') + ` | calo ${f(e.dd)} min a ${e.toMin}${e.partial ? ' (parziale)' : ''}`); }
console.log('\nstato oggi', JSON.stringify(res.today.status, null, 1));
for (const k of ['SPX', 'NDX']) { const e = res.explore[k]; console.log(`\nesplora ${k}: VIX setup ${JSON.stringify(e.vixAtSetup)} trigger ${JSON.stringify(e.vixAtTrigger)}\n alto ${JSON.stringify(e.trigVixHigh)}\n basso ${JSON.stringify(e.trigVixLow)}`); }
