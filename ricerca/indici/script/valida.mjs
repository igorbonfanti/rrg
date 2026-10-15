// Validazione F1: breadth degli indici contro i livelli di Rea, regola del 3° percentile,
// macchina a stati dei settori (js/signals.js, parametri di default) ed episodi con i rendimenti.
// uso: node ricerca/indici/script/valida.mjs OUT.json
// LEVELS='{"SXXP":10}' prova livelli diversi da quelli di config/indices.json
import { readFileSync, writeFileSync } from 'node:fs';
import { priceSeries, runMachine, forward, worstWithin } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';

const [outFile] = process.argv.slice(2);
const root = new URL('../../../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const cfg = read('config/indices.json').indices;
const IX = read('data/indices.json').series;
const WINDOWS = [
  ['2002', '2002-06-01', '2003-03-31'], ['2008-09', '2008-09-01', '2009-04-30'], ['2011', '2011-07-15', '2011-12-31'],
  ['2015-16', '2015-08-01', '2016-03-31'], ['2018', '2018-10-01', '2019-01-31'], ['2020', '2020-02-20', '2020-04-30'],
  ['2022', '2022-05-01', '2022-10-31'], ['2025', '2025-03-15', '2025-05-15'],
];
const pct = (a, q) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

const out = {};
for (const k of Object.keys(cfg)) {
  const X = indexSeries(IX[k]);
  const P = { dates: X.dates, close: X.close }, L = X.dates.length;
  const br = { pct200: X.pct200, pct50: X.pct50, pct20: X.pct20, n: X.n, cov: X.n.map((v, i) => (v == null ? null : v / X.members[i])) };
  const px = priceSeries(P.close);
  const p3 = pct(br.pct200, 0.03);
  const override = JSON.parse(process.env.LEVELS || '{}');
  const level = override[k] ?? cfg[k].blue ?? Math.round(p3);
  const vals = br.pct200.filter((v) => v != null);
  const below = (100 * vals.filter((v) => v <= level).length) / vals.length;
  const lows = WINDOWS.map(([name, a, b]) => {
    let m = null, md = null;
    P.dates.forEach((d, i) => { if (d >= a && d <= b && br.pct200[i] != null && (m == null || br.pct200[i] < m)) { m = br.pct200[i]; md = d; } });
    return { name, min: r1(m), date: md };
  });
  const run = runMachine(px, br, level);
  const ep = run.setups.map((s) => {
    const t = s.trig ? s.trig.t : null;
    return {
      setup: P.dates[s.t], bmin: r1(s.bmin), dd: r1(s.dd), dp: s.dp, fails: s.fails,
      trig: t != null ? P.dates[t] : null, conf: s.trig ? s.trig.conf : null,
      f1m: r1(forward(P.close, t, 21)), f3m: r1(forward(P.close, t, 63)), f6m: r1(forward(P.close, t, 126)), f12m: r1(forward(P.close, t, 252)),
      worst3m: r1(worstWithin(P.close, t, 63)),
      fromSetup12m: r1(forward(P.close, s.t, 252)),
      sessionsToTrig: t != null ? t - s.t : null,
    };
  });
  out[k] = {
    name: cfg[k].name, composition: cfg[k].composition, rea: cfg[k].blue, level, p3: r1(p3), p2: r1(pct(br.pct200, 0.02)), p5: r1(pct(br.pct200, 0.05)),
    belowPct: r1(below), sessions: vals.length, from: X.dates[IX[k].b0], lows, episodes: ep,
    last: { date: P.dates[L - 1], b: r1(br.pct200[L - 1]), state: run.days[L - 1], dd: r1(px.dd[L - 1]), dp: px.dp[L - 1] },
    series: { dates: P.dates, close: P.close, pct200: br.pct200.map(r1), cov: br.cov.map((v) => (v == null ? null : Math.round(v * 100))), days: run.days },
  };
}
writeFileSync(outFile, JSON.stringify(out));
for (const [k, o] of Object.entries(out)) {
  console.log(`${k.padEnd(5)} ${o.composition.padEnd(5)} Rea ${String(o.rea ?? '-').padStart(3)} p3 ${String(o.p3).padStart(5)} sotto liv. ${String(o.belowPct).padStart(4)}%  ` +
    o.lows.map((l) => `${l.name}:${l.min ?? '-'}`).join(' '));
}
