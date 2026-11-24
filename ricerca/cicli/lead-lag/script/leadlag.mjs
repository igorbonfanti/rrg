#!/usr/bin/env node
/*
 * leadlag.mjs — c'è un ordine che si ripete nei cicli dei 9 mercati di config/ath.json? (ricerca, non tocca l'app)
 *
 * Domanda e criteri: ricerca/cicli/domanda.md. Metodo e interpretazioni (scritti prima dei risultati):
 * ricerca/cicli/lead-lag/sintesi.md, sezione 1. In breve:
 *  1. punti di svolta (massimi e minimi di ciclo, soglie 15/20/30%) dal 01/01/1999 al 20/11/2026;
 *  2. cicli comuni: raggruppamento gerarchico a legame completo, ampiezza ≤ 365 giorni, un punto per mercato, ≥ 3 mercati;
 *  3. concordanza: media delle Spearman tra coppie di cicli (≥ 3 mercati in comune), modello nullo con spostamenti circolari;
 *  4. coppie A → B: punto di B più vicino entro ±365 giorni, quota «dopo», binomiale, nullo, Benjamini-Hochberg, metà;
 *  5. fuori campione: rango medio sui cicli fino al 2012 contro l'ordine dei cicli dal 2013;
 *  6. utilità dal giorno di conferma; 7. oggi (descrittivo).
 *
 * Dati: ricerca/rotazione-bolle/cache/serie.json (chiusure di Yahoo, scritte da ricerca/rotazione-bolle/script/backtest.mjs).
 * Petrolio: la chiusura negativa del 20/04/2020 è tolta (seduta mancante).
 *
 * Uso: node ricerca/cicli/lead-lag/script/leadlag.mjs [--reps 5000] [--pair-reps 10000] [--sens-reps 2000]
 * Scrive ricerca/cicli/lead-lag/risultati.json e ricerca/cicli/lead-lag/tabelle.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cyclePeaks } from '../../../../js/peaks.js';
import {
  D0, ISO, rng, turningPoints, cluster, cyclesFrom, concordance, meanRanks, normRanks, oos, shiftPts, pairCases,
  median, binomUpper, bh, shuffle, drawShift,
} from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '..');
const ROOT = path.resolve(BASE, '..', '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const REPS = arg('--reps', 5000), PREPS = arg('--pair-reps', 10000), SREPS = arg('--sens-reps', 2000);
const SEED = 20261122;

const IDS = ['BTC', 'GOLD', 'SILVER', 'COPPER', 'WTI', 'NDX', 'SPX', 'SOXX', 'KOSPI'];
const LABEL = { BTC: 'Bitcoin', GOLD: 'Oro', SILVER: 'Argento', COPPER: 'Rame', WTI: 'Petrolio WTI', NDX: 'Nasdaq-100', SPX: 'S&P 500', SOXX: 'Semiconduttori', KOSPI: 'KOSPI' };
const XS = [15, 20, 30], TYPES = ['peak', 'trough'];
const START = D0('1999-01-01'), PAIR_START = D0('2000-01-01'), SPLIT = D0('2012-12-31');
const MIN_SHIFT = 730; // coppie: spostamento minimo del modello nullo (vedi sintesi.md, «Cambio dopo la prova sintetica»)

// ---------- dati ----------
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'ricerca', 'rotazione-bolle', 'cache', 'serie.json'), 'utf8'));
const S = {}, removed = [];
for (const id of IDS) {
  const d = [], c = [];
  raw[id].dates.forEach((x, i) => {
    const v = raw[id].close[i];
    if (v == null || !Number.isFinite(v)) return;
    if (v <= 0) { removed.push({ id, date: x, close: v }); return; }
    d.push(x); c.push(v);
  });
  S[id] = { dates: d, close: c };
}
const END = Math.min(...IDS.map((id) => D0(S[id].dates.at(-1))));
const WIN = Object.fromEntries(IDS.map((id) => [id, { lo: Math.max(D0(S[id].dates[0]) + 365, START), hi: END }]));

// ---------- 1. punti di svolta ----------
const TP = {};
for (const id of IDS) {
  TP[id] = {};
  for (const ty of TYPES) {
    TP[id][ty] = {};
    for (const X of XS) TP[id][ty][X] = turningPoints(S[id], X, ty).filter((p) => p.t >= WIN[id].lo && p.t <= END);
  }
}

// controllo: i massimi coincidono con cyclePeaks di js/peaks.js (tutta la storia); il petrolio con e senza il 20/04/2020
const checks = { peaksVsApp: [], wtiNegative: [] };
for (const id of IDS) for (const X of XS) {
  const mine = turningPoints(S[id], X, 'peak').map((p) => p.date + '|' + p.conf);
  const app = cyclePeaks(S[id], X).map((p) => p.date + '|' + p.confirmDate);
  checks.peaksVsApp.push({ id, X, n: mine.length, same: mine.length === app.length && mine.every((v, i) => v === app[i]) });
}
{
  const w = { dates: raw.WTI.dates, close: raw.WTI.close };
  for (const X of XS) {
    const withNeg = cyclePeaks(w, X).map((p) => p.date);
    const without = turningPoints(S.WTI, X, 'peak').map((p) => p.date);
    checks.wtiNegative.push({ X, same: withNeg.length === without.length && withNeg.every((v, i) => v === without[i]) });
  }
}

const counts = {};
for (const id of IDS) {
  counts[id] = { from: ISO(WIN[id].lo) };
  for (const ty of TYPES) for (const X of XS) counts[id][`${ty}${X}`] = TP[id][ty][X].length;
}

// ---------- 2-3-5. cicli comuni, concordanza, fuori campione ----------
function ptsOf(ty, X, ids = IDS) {
  const out = [];
  for (const id of ids) for (const p of TP[id][ty][X]) out.push({ m: id, t: p.t });
  return out;
}
function analyse(pts, D, minSize) {
  const cyc = cyclesFrom(pts, cluster(pts, D), minSize);
  return { cyc, conc: concordance(cyc), oo: oos(cyc, SPLIT) };
}
function nullDist(pts, win, D, minSize, reps, seed, minShift = 0) {
  const R = rng(seed), conc = [], oo = [];
  for (let r = 0; r < reps; r++) {
    const a = analyse(shiftPts(pts, win, R, minShift), D, minSize);
    conc.push(a.conc.rho); oo.push(a.oo.rho);
  }
  return { conc, oo };
}
const pval = (obs, arr) => (obs == null ? null : (1 + arr.filter((v) => v == null || v >= obs).length) / (1 + arr.length));
const summ = (arr) => { const a = arr.filter((v) => v != null).sort((x, y) => x - y); const q = (p) => a[Math.floor(p * (a.length - 1))]; return { mean: a.reduce((x, y) => x + y, 0) / a.length, q05: q(0.05), q50: q(0.5), q95: q(0.95), missing: arr.length - a.length }; };

const order = {};
let seed = SEED;
for (const ty of TYPES) for (const X of XS) {
  const key = `${ty}${X}`, pts = ptsOf(ty, X);
  const a = analyse(pts, 365, 3);
  const nd = nullDist(pts, WIN, 365, 3, REPS, seed++);
  // permutazione delle etichette della stima (controllo del fuori campione)
  const Rp = rng(seed++), perm = [];
  for (let r = 0; r < 10000; r++) perm.push(oos(a.cyc, SPLIT, 3, (keys) => shuffle(keys, Rp)).rho);
  const all = cyclesFrom(pts, cluster(pts, 365), 1);
  order[key] = {
    points: pts.length, groups: all.length, cycles: a.cyc.length,
    concordance: { rho: a.conc.rho, pairs: a.conc.pairs, p: pval(a.conc.rho, nd.conc), null: summ(nd.conc), reps: REPS },
    oos: { rho: a.oo.rho, cycles: a.oo.cycles, p: pval(a.oo.rho, nd.oo), pPerm: pval(a.oo.rho, perm), null: summ(nd.oo), per: a.oo.per.map((x) => ({ date: ISO(Math.round(x.t)), k: x.k, rho: x.rho })),
      est: Object.fromEntries(Object.entries(a.oo.est).map(([m, v]) => [m, { mean: v.mean, n: v.n }])) },
    meanRank: meanRanks(a.cyc),
    meanRankSecond: meanRanks(a.cyc.filter((c) => c.t > SPLIT)),
    list: a.cyc.map((c) => {
      const r = normRanks(c.pts);
      return { date: ISO(Math.round(c.t)), markets: Object.entries(c.pts).sort((x, y) => x[1] - y[1] || IDS.indexOf(x[0]) - IDS.indexOf(y[0])).map(([m, t]) => ({ m, date: ISO(t), rank: r[m] })) };
    }),
    small: all.filter((c) => Object.keys(c.pts).length < 3).map((c) => ({ date: ISO(Math.round(c.t)), markets: Object.entries(c.pts).map(([m, t]) => ({ m, date: ISO(t) })) })),
  };
  console.error(`${key}: cicli ${a.cyc.length}, rho ${a.conc.rho?.toFixed(3)} p ${order[key].concordance.p.toFixed(4)}; oos ${a.oo.rho?.toFixed(3)} p ${order[key].oos.p.toFixed(4)}`);
}

// sensibilità (solo descrittiva)
const sens = {};
const variants = [
  { name: 'D182', D: 182, min: 3, ids: IDS },
  { name: 'D548', D: 548, min: 3, ids: IDS },
  { name: 'senzaNDX', D: 365, min: 3, ids: IDS.filter((x) => x !== 'NDX') },
  { name: 'min4', D: 365, min: 4, ids: IDS },
  { name: 'spostamentoMin730', D: 365, min: 3, ids: IDS, minShift: 730 },
];
for (const v of variants) {
  sens[v.name] = {};
  const win = Object.fromEntries(v.ids.map((id) => [id, WIN[id]]));
  for (const ty of TYPES) for (const X of XS) {
    const pts = ptsOf(ty, X, v.ids), a = analyse(pts, v.D, v.min), nd = nullDist(pts, win, v.D, v.min, SREPS, seed++, v.minShift || 0);
    sens[v.name][`${ty}${X}`] = { cycles: a.cyc.length, rho: a.conc.rho, p: pval(a.conc.rho, nd.conc), oos: a.oo.rho, pOos: pval(a.oo.rho, nd.oo) };
  }
  console.error('sensibilità', v.name, 'fatta');
}

// ---------- 4. coppie ----------
const pairs = [];
for (const ty of TYPES) for (const X of XS) for (const A of IDS) for (const B of IDS) {
  if (A === B) continue;
  const aT = TP[A][ty][X].map((p) => p.t), bT = TP[B][ty][X].map((p) => p.t);
  const aLo = Math.max(PAIR_START, WIN[A].lo, WIN[B].lo + 365), aHi = END - 365;
  const cs = pairCases(aT, bT, aLo, aHi);
  const after = cs.filter((c) => c.off >= 1).length, same = cs.filter((c) => c.off === 0).length;
  const share = cs.length ? after / cs.length : null;
  const half = (lo, hi) => { const h = cs.filter((c) => c.a >= lo && c.a <= hi); const k = h.filter((c) => c.off >= 1).length; return { cases: h.length, after: k, share: h.length ? k / h.length : null, medianOff: median(h.map((c) => c.off)) }; };
  // nullo: punti di B spostati in modo circolare nel periodo di B (principale: spostamento ≥ MIN_SHIFT; anche senza minimo)
  const L = WIN[B].hi - WIN[B].lo + 1, lo = WIN[B].lo;
  const tmp = new Float64Array(bT.length);
  const nullGe = (R, minShift) => {
    let ge = 0;
    for (let r = 0; r < PREPS; r++) {
      const u = drawShift(R, L, minShift);
      for (let i = 0; i < bT.length; i++) tmp[i] = lo + ((bT[i] - lo + u) % L);
      const sh = Array.from(tmp).sort((x, y) => x - y);
      const c2 = pairCases(aT, sh, aLo, aHi);
      const s2 = c2.length ? c2.filter((c) => c.off >= 1).length / c2.length : null;
      if (share == null || s2 == null || s2 >= share) ge++;
    }
    return ge;
  };
  const ge = nullGe(rng(seed++), MIN_SHIFT), ge0 = nullGe(rng(seed++), 0);
  pairs.push({
    type: ty, X, A, B, aFrom: ISO(aLo), aTo: ISO(aHi), nA: aT.filter((t) => t >= aLo && t <= aHi).length,
    cases: cs.length, after, after31: cs.filter((c) => c.off > 31).length, same, before: cs.length - after - same, share, medianOff: median(cs.map((c) => c.off)),
    pBinom: cs.length ? binomUpper(after, cs.length) : null, pNull: share == null ? null : (1 + ge) / (1 + PREPS), pNull0: share == null ? null : (1 + ge0) / (1 + PREPS),
    h1: half(PAIR_START, SPLIT), h2: half(SPLIT + 1, aHi),
    list: cs.map((c) => ({ a: ISO(c.a), off: c.off })),
  });
}
const valid = pairs.filter((p) => p.pNull != null);
const q = bh(valid.map((p) => p.pNull));
valid.forEach((p, i) => { p.qBH = q[i]; });
const q0 = bh(valid.map((p) => p.pNull0));
valid.forEach((p, i) => { p.qBH0 = q0[i]; });
for (const p of pairs) {
  const halvesOk = p.A !== 'BTC' && p.B !== 'BTC' && [p.h1, p.h2].every((h) => h.cases >= 3 && h.share >= 0.75);
  p.c2 = { share: p.share != null && p.share >= 0.75, cases: p.cases >= 8, q: p.qBH != null && p.qBH < 0.05, halves: halvesOk };
  p.pass2 = Object.values(p.c2).every(Boolean);
}
console.error('coppie fatte:', pairs.length, 'test con p:', valid.length);

// ---------- criteri 1 e 3 ----------
const crit = {};
for (const [name, get] of [['c1', (k) => order[k].concordance.p], ['c3', (k) => order[k].oos.p]]) {
  const byType = {};
  for (const ty of TYPES) { const ok = XS.filter((X) => get(`${ty}${X}`) < 0.05); byType[ty] = { thresholds: ok, pass: ok.length >= 2 }; }
  crit[name] = { byType, pass: TYPES.every((ty) => byType[ty].pass) };
}
crit.c2 = { passing: pairs.filter((p) => p.pass2).map((p) => `${p.type}${p.X} ${p.A}→${p.B}`) };

// ---------- 6. utilità ----------
function utility(p) {
  const { A, B, type: ty, X } = p;
  const aLo = D0(p.aFrom), aHi = D0(p.aTo);
  const aP = TP[A][ty][X].filter((x) => x.t >= aLo && x.t <= aHi);
  const bP = TP[B][ty][X];
  const bT = bP.map((x) => x.t);
  const hasIn = (lo, hi) => bT.some((t) => t > lo && t <= hi);
  const cases = [];
  for (const a of aP) {
    const Lw = a.t + 365 - a.tConf;
    const hit = bP.find((b) => b.t > a.tConf && b.t <= a.t + 365);
    // base: giorni d presi in [aLo, aHi], quota con una svolta di B in (d, d + Lw]
    let base = 0;
    if (Lw > 0) { let k = 0; for (let d = aLo; d <= aHi; d++) if (hasIn(d, d + Lw)) k++; base = k / (aHi - aLo + 1); }
    cases.push({ a: a.date, conf: a.conf, window: Lw, hit: !!hit, b: hit ? hit.date : null, lead: hit ? hit.t - a.tConf : null, leadConf: hit ? hit.tConf - a.tConf : null, base });
  }
  const hits = cases.filter((c) => c.hit).length, expected = cases.reduce((s, c) => s + c.base, 0);
  // Poisson-binomiale: P(colpi ≥ hits)
  let dist = [1];
  for (const c of cases) { const nd = new Array(dist.length + 1).fill(0); dist.forEach((v, i) => { nd[i] += v * (1 - c.base); nd[i + 1] += v * c.base; }); dist = nd; }
  const pHit = dist.slice(hits).reduce((s, v) => s + v, 0);
  const leads = cases.filter((c) => c.hit).map((c) => c.lead);
  return { pair: `${A}→${B}`, type: ty, X, n: cases.length, hits, rate: cases.length ? hits / cases.length : null, baseRate: cases.length ? expected / cases.length : null, pHit,
    medianLead: median(leads), medianLeadConf: median(cases.filter((c) => c.hit).map((c) => c.leadConf)), useful: pHit < 0.05 && median(leads) >= 30, cases };
}
const qualifying = pairs.filter((p) => p.pass2 && crit.c1.byType[p.type].pass && crit.c3.byType[p.type].pass);
let utilMode, utilPairs;
if (qualifying.length) { utilMode = 'criteri 1-3 superati'; utilPairs = qualifying; }
else if (pairs.some((p) => p.pass2)) { utilMode = 'illustrativo: coppie che passano solo il criterio 2'; utilPairs = pairs.filter((p) => p.pass2); }
else {
  utilMode = 'illustrativo: nessuna coppia passa il criterio 2; le 3 con la quota «dopo» più alta (≥ 8 casi) per tipo, soglia 20%';
  utilPairs = [];
  for (const ty of TYPES) utilPairs.push(...pairs.filter((p) => p.type === ty && p.X === 20 && p.cases >= 8).sort((a, b) => b.share - a.share || b.cases - a.cases || a.pNull - b.pNull).slice(0, 3));
}
const util = { mode: utilMode, rows: utilPairs.map(utility) };

// ---------- 7. oggi ----------
const today = {};
for (const id of IDS) {
  const s = S[id], n = s.close.length, last = s.close[n - 1], tl = D0(s.dates[n - 1]);
  let hi = -Infinity, hiD = null, lo = Infinity, loD = null;
  for (let i = n - 1; i >= 0 && D0(s.dates[i]) >= tl - 365; i--) { if (s.close[i] > hi) { hi = s.close[i]; hiD = s.dates[i]; } if (s.close[i] < lo) { lo = s.close[i]; loD = s.dates[i]; } }
  const o = { lastDate: s.dates[n - 1], last, hi52: hi, hi52Date: hiD, fromHi: (last / hi - 1) * 100, lo52: lo, lo52Date: loD, fromLo: (last / lo - 1) * 100 };
  for (const X of XS) {
    const lp = TP[id].peak[X].at(-1), lt = TP[id].trough[X].at(-1);
    o[`peak${X}`] = lp ? { date: lp.date, conf: lp.conf, recovered: lp.end } : null;
    o[`trough${X}`] = lt ? { date: lt.date, conf: lt.conf, broken: lt.end } : null;
  }
  today[id] = o;
}

const out = {
  generated: new Date().toISOString(), asOf: ISO(END), seed: SEED, minShiftPairs: MIN_SHIFT, reps: { concordance: REPS, pairs: PREPS, sensitivity: SREPS, perm: 10000 },
  data: { source: 'ricerca/rotazione-bolle/cache/serie.json (Yahoo)', removed, windows: Object.fromEntries(IDS.map((id) => [id, { from: ISO(WIN[id].lo), to: ISO(WIN[id].hi), firstClose: S[id].dates[0] }])) },
  checks, counts,
  points: Object.fromEntries(IDS.map((id) => [id, Object.fromEntries(TYPES.flatMap((ty) => XS.map((X) => [`${ty}${X}`, TP[id][ty][X].map((p) => ({ date: p.date, conf: p.conf, close: p.close, end: p.end }))])))])),
  order, sens, criteria: crit, pairs, utility: util, today,
};
fs.writeFileSync(path.join(BASE, 'risultati.json'), JSON.stringify(out, null, 1));
console.error('scritto risultati.json');
