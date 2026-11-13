// Valutazione secondo il protocollo congelato (ricerca/verifica-trigger/protocollo.md, punti 6, 7, 8 e 11).
import fs from 'node:fs';
import { EPIS, PERIODS, V_PERIODS, D, SEC, simulate, measures } from './motore.mjs';

const OUT = process.argv[2] || new URL('./risultati.json', import.meta.url).pathname;
const A0 = { vs: 10, vl: 60, brk: 10 };
const BRAKE_A = { type: 'sma', w: 50 }, BRAKE_B = { type: 'dow', k: 3, tol: false };
const RULES = {
  C0: {},
  C1a: { brake: BRAKE_A },
  C1b: { brake: BRAKE_B },
  C2: { accel: A0 },
  C4: { staged: { type: 'two', w: 50 } },
  C5: { accel: A0, staged: { type: 'three', tol: 0.005, poc: null } },
  C6: { accel: A0, staged: { type: 'three', tol: 0.005, poc: { bin: 0.01 } } },
};
const registry = [];
const cache = new Map();
function run(rule, opt = {}) {
  const key = JSON.stringify([rule, opt]);
  if (!cache.has(key)) cache.set(key, EPIS.map((e) => ({ per: e.per, s: e.s, t0: e.t0, ...measures(e, simulate(e, rule, opt)) })));
  return cache.get(key);
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const b = [...a].sort((x, y) => x - y), k = b.length; return k % 2 ? b[(k - 1) / 2] : (b[k / 2 - 1] + b[k / 2]) / 2; };
const perMeans = (rows, f, keep = null) => PERIODS.filter((p) => !keep || keep.includes(p.k)).map((p) => mean(rows.filter((r) => r.per === p.k).map(f)));
const stat = (rows, keep = null) => mean(perMeans(rows, (r) => r.main, keep));
function diffs(a, b, f = (r) => r.main) { // differenze medie per periodo, a meno b, stesso ordine di episodi
  return PERIODS.map((p) => mean(a.map((r, i) => (r.per === p.k ? f(r) - f(b[i]) : null)).filter((x) => x != null)));
}
const ALL = PERIODS.map((p) => p.k);
const k0809 = PERIODS.find((p) => p.lab === '2008–09').k, k2020 = PERIODS.find((p) => p.lab === '2020').k;
const HALF1 = PERIODS.filter((p) => ['2008–09', '2011'].includes(p.lab)).map((p) => p.k);
const HALF2 = ALL.filter((k) => !HALF1.includes(k));
const subsets = [
  ...ALL.map((k) => ({ lab: `senza ${PERIODS[k].lab}`, keep: ALL.filter((x) => x !== k) })),
  { lab: 'senza 2008–09 e 2020', keep: ALL.filter((x) => x !== k0809 && x !== k2020) },
  { lab: '2008–2011', keep: HALF1 }, { lab: '2015–2025', keep: HALF2 },
];
const meanOn = (d, keep) => mean(keep.map((k) => d[k]));
function coherence(d, thr) { // periodi toccati e periodi migliorati (punto 11.1)
  const touched = d.filter((x) => Math.abs(x) >= 0.001), k = touched.length, up = touched.filter((x) => x > 0).length;
  return { k, up, need: Math.ceil((thr * k) / 7), pass: k >= 4 && up >= Math.ceil((thr * k) / 7) };
}

// ---------- test con date casuali (punto 11.3) ----------
const COST = 0.001;
const randRet = EPIS.map((e) => { const c = SEC[e.s].c, a = []; for (let d = e.t0; d <= e.we - 1; d++) a.push((c[e.we] / c[d + 1]) * (1 - COST) - 1); return a; });
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const DRAWS = 10000, NRULES = 7;
const randSingle = [], randMax = [];
for (let i = 0; i < DRAWS; i++) {
  let mx = -Infinity;
  for (let j = 0; j < NRULES; j++) {
    const rows = EPIS.map((e, q) => ({ per: e.per, main: randRet[q][Math.floor(rnd() * randRet[q].length)] }));
    const sv = stat(rows); if (j === 0) randSingle.push(sv); mx = Math.max(mx, sv);
  }
  randMax.push(mx);
}
const pRand = (sv) => ({ p: randSingle.filter((x) => x >= sv).length / DRAWS, pAdj: randMax.filter((x) => x >= sv).length / DRAWS });

// ---------- ritardi rimescolati (punto 11.4) ----------
function shuffled(rule) {
  const r = run(rule), c0 = run(RULES.C0);
  const dl = EPIS.map((e, i) => (r[i].entered && c0[i].entered ? r[i].firstSig - c0[i].firstSig : null));
  const own = stat(EPIS.map((e, i) => ({ per: e.per, main: r[i].entered ? r[i].hold : 0 })));
  const sims = [];
  for (let k = 0; k < 1000; k++) {
    const rows = EPIS.map((e, i) => {
      if (!c0[i].entered) return { per: e.per, main: 0 };
      const pool = dl.filter((x, j) => x != null && j !== i), dd = pool[Math.floor(rnd() * pool.length)];
      const exe = c0[i].firstSig + dd + 1, c = SEC[e.s].c;
      return { per: e.per, main: exe > e.we ? 0 : c[e.we] / c[exe] - 1 };
    });
    sims.push(stat(rows));
  }
  return { own, shuffledMean: mean(sims), pass: own > mean(sims) };
}

// ---------- sintesi per regola ----------
function summary(name, rule) {
  const r = run(rule), c0 = run(RULES.C0);
  const d = diffs(r, c0), S = stat(r);
  const vRows = r.filter((x) => V_PERIODS.includes(x.per)), vC0 = c0.filter((x) => V_PERIODS.includes(x.per));
  const o = {
    name, S, meanDiff: mean(d), perDiff: d, perMain: perMeans(r, (x) => x.main), coh: coherence(d, 6), rand: pRand(S),
    mae21: median(r.map((x) => x.mae21)), mae63: median(r.map((x) => x.mae63)), falseShare: mean(r.map((x) => (x.falseStart ? 1 : 0))),
    lost: median(r.map((x) => x.lost)), lostV: median(vRows.map((x) => x.lost)), beforeLow: r.filter((x) => x.beforeLow).length,
    noEntry: r.filter((x) => !x.entered).length, fails: null,
    r21: median(r.filter((x) => x.entered).map((x) => x.r21)), r63: median(r.filter((x) => x.entered).map((x) => x.r63)), r126: median(r.filter((x) => x.entered).map((x) => x.r126)),
    x126: median(r.filter((x) => x.entered).map((x) => x.x126)),
    maeDiff: diffs(r, c0, (x) => x.mae63),
    ref: { mae63: median(c0.map((x) => x.mae63)), falseShare: mean(c0.map((x) => (x.falseStart ? 1 : 0))), lost: median(c0.map((x) => x.lost)), lostV: median(vC0.map((x) => x.lost)) },
  };
  registry.push({ name, S: o.S, meanDiff: o.meanDiff });
  return o;
}
function robustSingle(name, rule, variants) {
  const c0 = run(RULES.C0), r = run(rule), d = diffs(r, c0), res = [];
  for (const sb of subsets) res.push({ lab: sb.lab, v: meanOn(d, sb.keep) });
  for (const [lab, rv, opt] of variants) {
    const rr = run(rv, opt || {}), cc = run(RULES.C0, opt || {}), dv = diffs(rr, cc);
    registry.push({ name: `${name} · ${lab}`, S: stat(rr), meanDiff: mean(dv) });
    res.push({ lab, v: mean(dv) });
  }
  return { res, pass: res.every((x) => x.v > 0) };
}
function robustStaged(name, rule, variants) {
  const c0 = run(RULES.C0), res = [];
  const chk = (rr, cc, keep) => ({ mae: meanOn(diffs(rr, cc, (x) => x.mae63), keep), cost: meanOn(diffs(rr, cc), keep) });
  const r = run(rule);
  for (const sb of subsets) res.push({ lab: sb.lab, ...chk(r, c0, sb.keep) });
  for (const [lab, rv, opt] of variants) {
    const rr = run(rv, opt || {}), cc = run(RULES.C0, opt || {});
    registry.push({ name: `${name} · ${lab}`, S: stat(rr), meanDiff: mean(diffs(rr, cc)) });
    res.push({ lab, ...chk(rr, cc, ALL) });
  }
  return { res, pass: res.every((x) => x.mae > 0 && x.cost >= -0.02) };
}
const accelVars = (base) => [
  ['volatilità 5/40', { ...base, accel: { vs: 5, vl: 40, brk: 10 } }], ['volatilità 20/60', { ...base, accel: { vs: 20, vl: 60, brk: 10 } }],
  ['rottura su 20 chiusure', { ...base, accel: { vs: 10, vl: 60, brk: 20 } }]];
const common = (base) => [['un giorno di ritardo', base, { delay: 1 }], ['con stop', base, { stop: true }]];

const SUM = {}, ROB = {}, CRIT = {};
for (const k of ['C0', 'C1a', 'C1b', 'C2', 'C4', 'C5', 'C6']) SUM[k] = summary(k, RULES[k]);

// scelta del freno per C3 (punto 7 e 11.1)
const dB = diffs(run(RULES.C1b), run(RULES.C1a)), cohB = coherence(dB, 5);
const brakeChosen = cohB.pass && mean(dB) > 0 ? 'C1b' : 'C1a';
RULES.C3 = { accel: A0, brake: brakeChosen === 'C1b' ? BRAKE_B : BRAKE_A };
SUM.C3 = summary('C3', RULES.C3);
const dP = diffs(run(RULES.C6), run(RULES.C5)), cohP = coherence(dP, 5);
const stagedPref = cohP.pass && mean(dP) > 0 ? 'C6' : 'C5';

// robustezza
const brakeVarsA = [['media a 40', { brake: { type: 'sma', w: 40 } }], ['media a 60', { brake: { type: 'sma', w: 60 } }]];
const brakeVarsB = [['h a 2 deviazioni', { brake: { type: 'dow', k: 2, tol: false } }], ['h a 4 deviazioni', { brake: { type: 'dow', k: 4, tol: false } }], ['tolleranza doppio minimo', { brake: { type: 'dow', k: 3, tol: true } }]];
ROB.C1a = robustSingle('C1a', RULES.C1a, [...brakeVarsA, ...common(RULES.C1a)]);
ROB.C1b = robustSingle('C1b', RULES.C1b, [...brakeVarsB, ...common(RULES.C1b)]);
ROB.C2 = robustSingle('C2', RULES.C2, [...accelVars(RULES.C2), ...common(RULES.C2)]);
ROB.C3 = robustSingle('C3', RULES.C3, [
  ...(brakeChosen === 'C1b' ? brakeVarsB : brakeVarsA).map(([l, v]) => [l, { ...RULES.C3, brake: v.brake }]),
  ...accelVars(RULES.C3), ...common(RULES.C3)]);
ROB.C4 = robustStaged('C4', RULES.C4, [['media a 40', { staged: { type: 'two', w: 40 } }], ['media a 60', { staged: { type: 'two', w: 60 } }], ...common(RULES.C4)]);
const tolVars = (base) => [['ritest a 0%', { ...base, staged: { ...base.staged, tol: 0 } }], ['ritest a 1%', { ...base, staged: { ...base.staged, tol: 0.01 } }]];
ROB.C5 = robustStaged('C5', RULES.C5, [...accelVars(RULES.C5), ...tolVars(RULES.C5), ...common(RULES.C5)]);
ROB.C6 = robustStaged('C6', RULES.C6, [...accelVars(RULES.C6), ...tolVars(RULES.C6),
  ['fasce POC 0,5%', { ...RULES.C6, staged: { ...RULES.C6.staged, poc: { bin: 0.005 } } }], ['fasce POC 2%', { ...RULES.C6, staged: { ...RULES.C6.staged, poc: { bin: 0.02 } } }], ...common(RULES.C6)]);

// criteri (punto 7)
const SHUF = { C1a: shuffled(RULES.C1a), C1b: shuffled(RULES.C1b) };
for (const k of ['C1a', 'C1b', 'C2', 'C3']) {
  const o = SUM[k];
  CRIT[k] = {
    c1: o.coh.pass && o.meanDiff > 0, c2: o.rand.pAdj < 0.10,
    c3: o.mae63 >= o.ref.mae63 - 0.02 && o.falseShare <= o.ref.falseShare + 0.10,
    c4: o.lost <= o.ref.lost + 0.10 && o.lostV <= o.ref.lostV + 0.10,
    c5: ROB[k].pass, c6: SHUF[k] ? SHUF[k].pass : null,
  };
  CRIT[k].pass = Object.values(CRIT[k]).every((v) => v !== false);
}
for (const k of ['C4', 'C5', 'C6']) {
  const o = SUM[k], cm = coherence(o.maeDiff, 6);
  CRIT[k] = { s1: cm.pass && mean(o.maeDiff) > 0, s1detail: cm, s2: o.S >= SUM.C0.S - 0.02, s3: ROB[k].pass };
  CRIT[k].pass = CRIT[k].s1 && CRIT[k].s2 && CRIT[k].s3;
}

// termini di paragone (punto 6 e 11.10)
const BASE = {};
for (const [lab, rule] of [['ingresso a T0', { fixed: 0 }], ['ingresso a T0 + 10', { fixed: 10 }], ['ingresso a T0 + 21', { fixed: 21 }], ['sola risalita della breadth', { needZero: true }]]) {
  const r = run(rule); BASE[lab] = { S: stat(r), meanDiff: mean(diffs(r, run(RULES.C0))), lost: median(r.map((x) => x.lost)), mae63: median(r.map((x) => x.mae63)), falseShare: mean(r.map((x) => (x.falseStart ? 1 : 0))) };
  registry.push({ name: 'paragone · ' + lab, S: BASE[lab].S, meanDiff: BASE[lab].meanDiff });
}
const bh = (sym) => stat(EPIS.map((e) => ({ per: e.per, main: SEC[sym === 'sector' ? e.s : 'SPY'].c[e.we] / SEC[sym === 'sector' ? e.s : 'SPY'].c[e.t0] - 1 })));
BASE['buy & hold del settore'] = { S: bh('sector') };
BASE['buy & hold di SPY'] = { S: bh('SPY') };
BASE['ingresso sul minimo (riferimento)'] = { S: stat(EPIS.map((e) => ({ per: e.per, main: e.tl <= e.we ? SEC[e.s].c[e.we] / SEC[e.s].c[e.tl] - 1 : 0 }))) };
BASE['date casuali (media)'] = { S: mean(randSingle) };

const fails = {}; // fallimenti per regola
for (const k of Object.keys(RULES)) fails[k] = EPIS.reduce((a, e) => a + simulate(e, RULES[k]).log.fail.length, 0);
const perEpisode = Object.fromEntries(Object.keys(RULES).map((k) => [k, run(RULES[k]).map((x) => ({ s: x.s, t0: D[x.t0], per: PERIODS[x.per].lab, main: x.main, entered: x.entered, firstExe: x.firstExe != null ? D[x.firstExe] : null, lost: x.lost, beforeLow: x.beforeLow, mae63: x.mae63, falseStart: x.falseStart }))]));
fs.writeFileSync(OUT, JSON.stringify({ PERIODS, SUM, ROB, CRIT, SHUF, BASE, brakeChosen, cohB, meanB: mean(dB), stagedPref, cohP, meanP: mean(dP), fails, registry, perEpisode }, null, 1));

// ---------- stampa ----------
const pc = (v) => (v == null ? '—' : (100 * v).toFixed(1));
console.log('periodi:', PERIODS.map((p) => `${p.lab} (${p.n})`).join(' · '));
console.log('\nregola | rendimento medio a 1 anno | diff. vs C0 | periodi migliori/toccati | p casuale (corretto) | calo max 63 mediano | false partenze | rimbalzo perso (V) | prima del minimo | senza ingresso | fallimenti');
for (const k of ['C0', 'C1a', 'C1b', 'C2', 'C3', 'C4', 'C5', 'C6']) {
  const o = SUM[k];
  console.log(`${k} | ${pc(o.S)} | ${pc(o.meanDiff)} | ${o.coh.up}/${o.coh.k} (serve ${o.coh.need}) | ${o.rand.p.toFixed(3)} (${o.rand.pAdj.toFixed(3)}) | ${pc(o.mae63)} | ${pc(o.falseShare)} | ${pc(o.lost)} (${pc(o.lostV)}) | ${o.beforeLow} | ${o.noEntry} | ${fails[k]}`);
}
console.log('\ndifferenze per periodo vs C0 (punti):');
for (const k of ['C1a', 'C1b', 'C2', 'C3', 'C4', 'C5', 'C6']) console.log(k, SUM[k].perDiff.map((x) => pc(x)).join(' | '), k >= 'C4' ? ' · calo max: ' + SUM[k].maeDiff.map((x) => pc(x)).join(' | ') : '');
console.log(`\nfreno scelto per C3: ${brakeChosen} (C1b-C1a: ${cohB.up}/${cohB.k}, media ${pc(mean(dB))}) · preferita tra C5 e C6: ${stagedPref} (C6-C5: ${cohP.up}/${cohP.k}, media ${pc(mean(dP))})`);
console.log('\ncriteri:'); for (const [k, v] of Object.entries(CRIT)) console.log(k, JSON.stringify(v));
console.log('\nritardi rimescolati:', JSON.stringify(SHUF));
console.log('\nrobustezza:'); for (const [k, v] of Object.entries(ROB)) console.log(k, v.pass, v.res.map((x) => `${x.lab}: ${x.v != null ? pc(x.v) : pc(x.mae) + '/' + pc(x.cost)}`).join(' · '));
console.log('\ntermini di paragone:'); for (const [k, v] of Object.entries(BASE)) console.log(`${k}: ${pc(v.S)}${v.meanDiff != null ? ` (diff. vs C0 ${pc(v.meanDiff)})` : ''}`);
console.log('\nregistro: varianti calcolate', registry.length);
