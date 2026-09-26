// Secondo giro (protocollo-2.md): C7, metà al primo giorno di zona blu e metà al trigger attuale.
import fs from 'node:fs';
import { EPIS, PERIODS, V_PERIODS, D, SEC, simulate, measures } from './motore.mjs';

const OUT = process.argv[2] || new URL('./risultati-2.json', import.meta.url).pathname;
const C0 = {}, C7 = { staged: { type: 'touch', w1: 0.5 } }, C4 = { staged: { type: 'two', w: 50 } }, T0 = { fixed: 0 };
const cache = new Map();
const run = (rule, opt = {}) => {
  const k = JSON.stringify([rule, opt]);
  if (!cache.has(k)) cache.set(k, EPIS.map((e) => ({ per: e.per, s: e.s, t0: e.t0, ...measures(e, simulate(e, rule, opt)) })));
  return cache.get(k);
};
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const b = [...a].sort((x, y) => x - y), k = b.length; return k % 2 ? b[(k - 1) / 2] : (b[k / 2 - 1] + b[k / 2]) / 2; };
const perMeans = (rows, f, keep = null) => PERIODS.filter((p) => !keep || keep.includes(p.k)).map((p) => mean(rows.filter((r) => r.per === p.k).map(f)));
const stat = (rows) => mean(perMeans(rows, (r) => r.main));
const diffs = (a, b, f = (r) => r.main) => PERIODS.map((p) => mean(a.map((r, i) => (r.per === p.k ? f(r) - f(b[i]) : null)).filter((x) => x != null)));
const ALL = PERIODS.map((p) => p.k), lab = (x) => PERIODS.find((p) => p.lab === x).k;
const HALF1 = [lab('2008–09'), lab('2011')], HALF2 = ALL.filter((k) => !HALF1.includes(k));
const meanOn = (d, keep) => mean(keep.map((k) => d[k]));
function coherence(d, thr) {
  const t = d.filter((x) => Math.abs(x) >= 0.001), k = t.length, up = t.filter((x) => x > 0).length;
  return { k, up, need: Math.ceil((thr * k) / 7), pass: k >= 4 && up >= Math.ceil((thr * k) / 7) };
}

// test con date casuali, corretto per 8 regole (7 del primo giro + C7)
const COST = 0.001;
const randRet = EPIS.map((e) => { const c = SEC[e.s].c, a = []; for (let d = e.t0; d <= e.we - 1; d++) a.push((c[e.we] / c[d + 1]) * (1 - COST) - 1); return a; });
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const DRAWS = 10000, NRULES = 8, randSingle = [], randMax = [];
for (let i = 0; i < DRAWS; i++) {
  let mx = -Infinity;
  for (let j = 0; j < NRULES; j++) {
    const sv = stat(EPIS.map((e, q) => ({ per: e.per, main: randRet[q][Math.floor(rnd() * randRet[q].length)] })));
    if (j === 0) randSingle.push(sv); mx = Math.max(mx, sv);
  }
  randMax.push(mx);
}

const r0 = run(C0), r7 = run(C7), d = diffs(r7, r0), S7 = stat(r7), S0 = stat(r0);
const vR = (rows) => rows.filter((x) => V_PERIODS.includes(x.per));
const coh = coherence(d, 6);
const robust = [
  ...ALL.map((k) => ({ lab: `senza ${PERIODS[k].lab}`, v: meanOn(d, ALL.filter((x) => x !== k)) })),
  { lab: 'senza 2008–09 e 2020', v: meanOn(d, ALL.filter((x) => x !== lab('2008–09') && x !== lab('2020'))) },
  { lab: '2008–2011', v: meanOn(d, HALF1) }, { lab: '2015–2025', v: meanOn(d, HALF2) },
];
for (const [l, rule, opt] of [['un giorno di ritardo', C7, { delay: 1 }], ['con stop', C7, { stop: true }],
  ['un terzo in zona blu, due terzi al trigger', { staged: { type: 'touch', w1: 1 / 3 } }], ['due terzi in zona blu, un terzo al trigger', { staged: { type: 'touch', w1: 2 / 3 } }]]) {
  robust.push({ lab: l, v: mean(diffs(run(rule, opt || {}), run(C0, opt || {}))) });
}
const info = (rows) => ({ S: stat(rows), median: median(rows.map((x) => x.main)), worst: Math.min(...rows.map((x) => x.main)),
  mae63: median(rows.map((x) => x.mae63)), falseShare: mean(rows.map((x) => (x.falseStart ? 1 : 0))), lost: median(rows.map((x) => x.lost)), lostV: median(vR(rows).map((x) => x.lost)),
  perMain: perMeans(rows, (x) => x.main), noEntry: rows.filter((x) => !x.entered).length });
const I = { C0: info(r0), C7: info(r7), C4: info(run(C4)), T0: info(run(T0)) };
const crit = {
  c1: coh.pass && mean(d) > 0,
  c2: randMax.filter((x) => x >= S7).length / DRAWS < 0.10,
  c3: I.C7.mae63 >= I.C0.mae63 - 0.02 && I.C7.falseShare <= I.C0.falseShare + 0.10,
  c4: I.C7.lost <= I.C0.lost + 0.10 && I.C7.lostV <= I.C0.lostV + 0.10,
  c5: robust.every((x) => x.v > 0),
};
crit.pass = Object.values(crit).every(Boolean);
const pRand = { p: randSingle.filter((x) => x >= S7).length / DRAWS, pAdj: randMax.filter((x) => x >= S7).length / DRAWS };
const better = r7.filter((x, i) => x.main > r0[i].main).length;
const fails = EPIS.reduce((a, e) => a + simulate(e, C7).log.fail.length, 0);
const perEpisode = r7.map((x, i) => ({ s: x.s, t0: D[x.t0], per: PERIODS[x.per].lab, C7: x.main, C0: r0[i].main, T0: run(T0)[i].main, mae63: x.mae63 }));
fs.writeFileSync(OUT, JSON.stringify({ PERIODS, perDiff: d, coh, pRand, crit, robust, info: I, better, fails, perEpisode }, null, 1));

const pc = (v) => (100 * v).toFixed(1);
console.log('regola | medio | mediano | peggiore | calo max 63 | false partenze | rimbalzo perso (V) | per periodo');
for (const [k, v] of Object.entries(I)) console.log(`${k} | ${pc(v.S)} | ${pc(v.median)} | ${pc(v.worst)} | ${pc(v.mae63)} | ${pc(v.falseShare)} | ${pc(v.lost)} (${pc(v.lostV)}) | ${v.perMain.map(pc).join(' · ')}`);
console.log(`\nC7 meno C0 per periodo: ${d.map(pc).join(' · ')} · media ${pc(mean(d))} · migliori ${coh.up}/${coh.k} (servono ${coh.need}) · episodi migliori ${better}/48 · fallimenti ${fails}`);
console.log(`test casuale: p ${pRand.p.toFixed(3)} · corretto per 8 regole ${pRand.pAdj.toFixed(3)}`);
console.log('robustezza:', robust.map((x) => `${x.lab} ${pc(x.v)}`).join(' · '));
console.log('criteri:', JSON.stringify(crit));
