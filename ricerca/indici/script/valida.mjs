// Validazione F1: breadth degli indici contro i livelli di Rea, regola del 3° percentile,
// macchina a stati dei settori (js/signals.js, parametri di default) ed episodi con i rendimenti.
// uso: node ricerca/indici/script/valida.mjs BREADTH_SPX.json GSPC_CACHE.json OUT.json
// LEVELS='{"SXXP":10}' prova livelli diversi da quelli di config/indices.json
import { readFileSync, writeFileSync } from 'node:fs';
import { expandRLE, priceSeries, runMachine, forward, worstWithin } from '../../../js/signals.js';

const [spxFile, gspcFile, outFile] = process.argv.slice(2);
const root = new URL('../../../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const cfg = read('config/indices.json').indices;
const IB = read('data/index_breadth.json').series;
const IP = read('data/indices.json').series;

// SPX: serie esistente di breadth.json e ^GSPC dalla cache dei prezzi
const sb = JSON.parse(readFileSync(spxFile, 'utf8'));
const g = JSON.parse(readFileSync(gspcFile, 'utf8'));
IB.SPX = { dates: sb.dates, ...sb.series.SPX };
const g0 = g.dates.findIndex((d) => d >= '2000-01-01');
IP.SPX = { dates: g.dates.slice(g0), close: g.close.slice(g0) };

const WINDOWS = [
  ['2002', '2002-06-01', '2003-03-31'], ['2008-09', '2008-09-01', '2009-04-30'], ['2011', '2011-07-15', '2011-12-31'],
  ['2015-16', '2015-08-01', '2016-03-31'], ['2018', '2018-10-01', '2019-01-31'], ['2020', '2020-02-20', '2020-04-30'],
  ['2022', '2022-05-01', '2022-10-31'], ['2025', '2025-03-15', '2025-05-15'],
];
const pct = (a, q) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

const out = {};
for (const k of Object.keys(cfg)) {
  const B = IB[k], P = IP[k];
  const nb = B.dates.length;
  const n = expandRLE(B.n, nb), mem = expandRLE(B.members, nb);
  // serie allineate al calendario del prezzo (dal 2000); breadth nulla prima del suo inizio
  const pos = new Map(P.dates.map((d, i) => [d, i]));
  const L = P.dates.length;
  const br = { pct200: Array(L).fill(null), pct50: Array(L).fill(null), pct20: Array(L).fill(null), n: Array(L).fill(null), cov: Array(L).fill(null) };
  for (let i = 0; i < nb; i++) {
    const j = pos.get(B.dates[i]);
    if (j == null || !n[i]) continue;
    br.n[j] = n[i]; br.cov[j] = n[i] / mem[i];
    br.pct200[j] = (100 * B.a200[i]) / n[i]; br.pct50[j] = (100 * B.a50[i]) / n[i]; br.pct20[j] = (100 * B.a20[i]) / n[i];
  }
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
    belowPct: r1(below), sessions: vals.length, from: B.dates[0], lows, episodes: ep,
    last: { date: P.dates[L - 1], b: r1(br.pct200[L - 1]), state: run.days[L - 1], dd: r1(px.dd[L - 1]), dp: px.dp[L - 1] },
    series: { dates: P.dates, close: P.close, pct200: br.pct200.map(r1), cov: br.cov.map((v) => (v == null ? null : Math.round(v * 100))), days: run.days },
  };
}
writeFileSync(outFile, JSON.stringify(out));
for (const [k, o] of Object.entries(out)) {
  console.log(`${k.padEnd(5)} ${o.composition.padEnd(5)} Rea ${String(o.rea ?? '-').padStart(3)} p3 ${String(o.p3).padStart(5)} sotto liv. ${String(o.belowPct).padStart(4)}%  ` +
    o.lows.map((l) => `${l.name}:${l.min ?? '-'}`).join(' '));
}
