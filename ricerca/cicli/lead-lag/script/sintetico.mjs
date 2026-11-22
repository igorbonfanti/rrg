#!/usr/bin/env node
/*
 * sintetico.mjs — il metodo di leadlag.mjs sa trovare un ritardo vero e sa rifiutare quando non c'è? (ricerca)
 *
 * Stesse funzioni (lib.mjs), stesse regole e stesse date dei 9 mercati veri (ogni serie sintetica ha le date di Yahoo del
 * mercato corrispondente, quindi gli stessi buchi e la stessa lunghezza). Prezzi sintetici, non dati di mercato.
 *
 *  A. RITARDO NOTO: fattore comune F (passeggiata casuale, volatilità 25% annua su giorni di calendario); il mercato k
 *     (k = 0..8 nell'ordine BTC, GOLD, …, KOSPI) è F spostato di 30·k giorni più un rumore proprio (passeggiata casuale,
 *     10% annuo). L'ordine vero è quindi BTC, GOLD, SILVER, …, KOSPI, e B gira dopo A di 30·(kB − kA) giorni.
 *     Si attende: concordanza e fuori campione con p piccoli, coppie con scarto mediano vicino al ritardo vero.
 *  B. COPPIA A 60 GIORNI DENTRO MERCATI INDIPENDENTI: 9 passeggiate indipendenti, ma «SILVER» = «GOLD» spostato di 60
 *     giorni più rumore. Si attende: GOLD → SILVER trovata, le altre coppie no.
 *  C. INDIPENDENTI: 9 passeggiate indipendenti (25% annuo), 20 semi diversi (C2: 100 semi, solo concordanza e fuori
 *     campione, soglie 15 e 20%, per misurare quante volte il nullo dà p < 0,05 quando non c'è nulla). Si attende: p della concordanza e del fuori
 *     campione sparsi tra 0 e 1 (circa 1 su 20 sotto 0,05), nessuna coppia che passa il criterio 2.
 *
 * Uso: node ricerca/cicli/lead-lag/script/sintetico.mjs [--reps 1000] [--pair-reps 10000] [--seeds 20]
 * Scrive ricerca/cicli/lead-lag/sintetico.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { D0, rng, turningPoints, cluster, cyclesFrom, concordance, oos, shiftPts, pairCases, median, bh, drawShift } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '..');
const ROOT = path.resolve(BASE, '..', '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const REPS = arg('--reps', 1000), PREPS = arg('--pair-reps', 10000), SEEDS = arg('--seeds', 20);
const IDS = ['BTC', 'GOLD', 'SILVER', 'COPPER', 'WTI', 'NDX', 'SPX', 'SOXX', 'KOSPI'];
const START = D0('1999-01-01'), PAIR_START = D0('2000-01-01'), SPLIT = D0('2012-12-31');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'ricerca', 'rotazione-bolle', 'cache', 'serie.json'), 'utf8'));
const DATES = Object.fromEntries(IDS.map((id) => [id, raw[id].dates.filter((d, i) => raw[id].close[i] > 0)]));
const END = Math.min(...IDS.map((id) => D0(DATES[id].at(-1))));
const T0 = Math.min(...IDS.map((id) => D0(DATES[id][0]))) - 400;

function gauss(R) { let u = 0; while (u === 0) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); }
function walk(R, n, volYear) { const s = volYear / Math.sqrt(365), w = new Float64Array(n); for (let i = 1; i < n; i++) w[i] = w[i - 1] + s * gauss(R); return w; }
const N = END - T0 + 1;
// serie di mercato: log-prezzo per giorno di calendario → chiusure nelle date vere del mercato
function toSeries(id, logp) { const d = DATES[id]; return { dates: d, close: d.map((x) => Math.exp(logp[D0(x) - T0] + 4)) }; }

function scenario(kind, seed) {
  const R = rng(seed), S = {};
  if (kind === 'A') {
    const F = walk(R, N + 300, 0.25);
    IDS.forEach((id, k) => { const e = walk(R, N, 0.10), lp = new Float64Array(N); for (let i = 0; i < N; i++) lp[i] = F[i + 300 - 30 * k] + e[i]; S[id] = toSeries(id, lp); });
  } else if (kind === 'B') {
    const W = {};
    for (const id of IDS) W[id] = walk(R, N + 300, 0.25);
    for (const id of IDS) {
      const lp = new Float64Array(N);
      if (id === 'SILVER') { const e = walk(R, N, 0.10); for (let i = 0; i < N; i++) lp[i] = W.GOLD[i + 300 - 60] + e[i]; }
      else for (let i = 0; i < N; i++) lp[i] = W[id][i + 300];
      S[id] = toSeries(id, lp);
    }
  } else {
    for (const id of IDS) { const w = walk(R, N, 0.25); S[id] = toSeries(id, w); }
  }
  return S;
}

function run(S, Xs, seed, withPairs = true) {
  const WIN = Object.fromEntries(IDS.map((id) => [id, { lo: Math.max(D0(S[id].dates[0]) + 365, START), hi: END }]));
  const res = {};
  let sd = seed;
  const allPairs = [];
  for (const ty of ['peak', 'trough']) for (const X of Xs) {
    const TP = Object.fromEntries(IDS.map((id) => [id, turningPoints(S[id], X, ty).filter((p) => p.t >= WIN[id].lo && p.t <= END).map((p) => p.t)]));
    const pts = IDS.flatMap((id) => TP[id].map((t) => ({ m: id, t })));
    const an = (P) => { const c = cyclesFrom(P, cluster(P, 365), 3); return { c, conc: concordance(c).rho, oo: oos(c, SPLIT).rho }; };
    const a = an(pts), R = rng(sd++);
    let gc = 0, go = 0;
    for (let r = 0; r < REPS; r++) { const b = an(shiftPts(pts, WIN, R)); if (b.conc == null || b.conc >= a.conc) gc++; if (b.oo == null || b.oo >= a.oo) go++; }
    res[`${ty}${X}`] = { points: pts.length, cycles: a.c.length, rho: a.conc, p: (1 + gc) / (1 + REPS), oos: a.oo, pOos: (1 + go) / (1 + REPS) };
    if (!withPairs) continue;
    for (const A of IDS) for (const B of IDS) {
      if (A === B) continue;
      const aLo = Math.max(PAIR_START, WIN[A].lo, WIN[B].lo + 365), aHi = END - 365;
      const cs = pairCases(TP[A], TP[B], aLo, aHi);
      if (!cs.length) continue;
      const share = cs.filter((c) => c.off >= 1).length / cs.length;
      const Rq = rng(sd++), L = WIN[B].hi - WIN[B].lo + 1, lo = WIN[B].lo;
      let ge = 0;
      for (let r = 0; r < PREPS; r++) {
        const u = drawShift(Rq, L, 730), sh = TP[B].map((t) => lo + ((t - lo + u) % L)).sort((x, y) => x - y);
        const c2 = pairCases(TP[A], sh, aLo, aHi);
        if (!c2.length || c2.filter((c) => c.off >= 1).length / c2.length >= share) ge++;
      }
      const half = (l, h) => { const x = cs.filter((c) => c.a >= l && c.a <= h); return { n: x.length, s: x.length ? x.filter((c) => c.off >= 1).length / x.length : null }; };
      allPairs.push({ type: ty, X, A, B, cases: cs.length, share, medianOff: median(cs.map((c) => c.off)), pNull: (1 + ge) / (1 + PREPS), h1: half(PAIR_START, SPLIT), h2: half(SPLIT + 1, aHi) });
    }
  }
  if (withPairs) {
    const q = bh(allPairs.map((p) => p.pNull));
    allPairs.forEach((p, i) => { p.qBH = q[i]; p.pass2 = p.share >= 0.75 && p.cases >= 8 && p.qBH < 0.05 && p.A !== 'BTC' && p.B !== 'BTC' && [p.h1, p.h2].every((h) => h.n >= 3 && h.s >= 0.75); });
  }
  return { res, pairs: allPairs };
}

const out = { note: 'Prezzi sintetici (non dati di mercato), con le date dei mercati veri. Vedi testa dello script.', reps: REPS, pairReps: PREPS };

// A. ritardo noto
{
  const r = run(scenario('A', 101), [15, 20, 30], 1000);
  const trueLag = (A, B) => 30 * (IDS.indexOf(B) - IDS.indexOf(A));
  const fwd = r.pairs.filter((p) => trueLag(p.A, p.B) > 0 && trueLag(p.A, p.B) <= 120);
  out.A = {
    order: r.res,
    pairsLag60: r.pairs.filter((p) => trueLag(p.A, p.B) === 60).map((p) => ({ type: p.type, X: p.X, pair: `${p.A}→${p.B}`, cases: p.cases, share: p.share, medianOff: p.medianOff, qBH: p.qBH, pass2: p.pass2 })),
    summary: { forwardPairsUpTo120: fwd.length, forwardPass2: fwd.filter((p) => p.pass2).length, reversePass2: r.pairs.filter((p) => trueLag(p.A, p.B) < 0 && p.pass2).length,
      medianOffByLag: Object.fromEntries([30, 60, 90, 120].map((L) => [L, median(r.pairs.filter((p) => trueLag(p.A, p.B) === L && p.cases).map((p) => p.medianOff))])) },
  };
  console.error('A fatto', JSON.stringify(out.A.summary));
}
// B. una coppia a 60 giorni tra mercati indipendenti
{
  const r = run(scenario('B', 202), [15, 20, 30], 2000);
  out.B = {
    order: r.res,
    goldSilver: r.pairs.filter((p) => p.A === 'GOLD' && p.B === 'SILVER').map((p) => ({ type: p.type, X: p.X, cases: p.cases, share: p.share, medianOff: p.medianOff, pNull: p.pNull, qBH: p.qBH, pass2: p.pass2 })),
    otherPass2: r.pairs.filter((p) => p.pass2 && !(p.A === 'GOLD' && p.B === 'SILVER')).map((p) => `${p.type}${p.X} ${p.A}→${p.B}`),
  };
  console.error('B fatto', JSON.stringify(out.B.goldSilver.map((g) => [g.type + g.X, g.share, g.medianOff, g.pass2])), out.B.otherPass2);
}
// C. indipendenti, più semi
{
  const rows = [];
  for (let s = 0; s < SEEDS; s++) {
    const r = run(scenario('C', 3000 + s), [20], 5000 + 100 * s);
    rows.push({ seed: 3000 + s, peak: r.res.peak20, trough: r.res.trough20, pass2: r.pairs.filter((p) => p.pass2).length,
      raw75: r.pairs.filter((p) => p.share >= 0.75 && p.cases >= 8).length, pairsTested: r.pairs.length, pNullBelow05: r.pairs.filter((p) => p.pNull < 0.05).length });
    console.error('C seme', s, rows.at(-1).peak.p.toFixed(3), rows.at(-1).trough.p.toFixed(3), rows.at(-1).pass2);
  }
  const ps = rows.flatMap((r) => [r.peak.p, r.trough.p]), po = rows.flatMap((r) => [r.peak.pOos, r.trough.pOos]);
  out.C = { rows, summary: { tests: ps.length, concBelow05: ps.filter((p) => p < 0.05).length, oosBelow05: po.filter((p) => p < 0.05).length,
    seedsWithPass2: rows.filter((r) => r.pass2 > 0).length, totalPass2: rows.reduce((s, r) => s + r.pass2, 0), totalRaw75: rows.reduce((s, r) => s + r.raw75, 0),
    pairTests: rows.reduce((s, r) => s + r.pairsTested, 0), pairPNullBelow05: rows.reduce((s, r) => s + r.pNullBelow05, 0) } };
  console.error('C', JSON.stringify(out.C.summary));
}
// C2. indipendenti, 100 semi, solo concordanza e fuori campione (taratura del modello nullo a 15 e 20%)
{
  const C2 = arg('--seeds2', 100), rows = [];
  const save = REPS;
  for (let s = 0; s < C2; s++) {
    const r = run(scenario('C', 9000 + s), [15, 20], 20000 + 10 * s, false);
    rows.push(Object.fromEntries(Object.entries(r.res).map(([k, v]) => [k, { p: v.p, pOos: v.pOos }])));
  }
  const ps = rows.flatMap((r) => Object.values(r).map((v) => v.p)), po = rows.flatMap((r) => Object.values(r).map((v) => v.pOos));
  out.C2 = { seeds: C2, reps: save, tests: ps.length, concBelow05: ps.filter((p) => p < 0.05).length, concBelow01: ps.filter((p) => p < 0.01).length,
    oosBelow05: po.filter((p) => p < 0.05).length, oosBelow01: po.filter((p) => p < 0.01).length, rows };
  console.error('C2', JSON.stringify({ ...out.C2, rows: undefined }));
}
fs.writeFileSync(path.join(BASE, 'sintetico.json'), JSON.stringify(out, null, 1));
