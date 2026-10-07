// Motore della verifica del trigger dopo la zona blu (protocollo: ricerca/verifica-trigger/protocollo.md).
// Simula, episodio per episodio, le regole C0–C6 e i termini di paragone sulle chiusure rettificate degli ETF.
// La logica della zona blu e del trigger ricalca js/signals.js; il controllo di coerenza con l'app è in verifica.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { breadthSeries, priceSeries, runMachine, SECTOR_KEYS } from '../../js/signals.js';

// Dati congelati: i file del repository al commit f743b04 (dati al 25/09/2026), letti con git show.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SNAP = process.env.VERIFICA_SNAP || 'f743b04'; // per il registro dal vivo: VERIFICA_SNAP=origin/main
const snap = (p) => JSON.parse(execFileSync('git', ['-C', HERE, 'show', SNAP + ':' + p], { maxBuffer: 1 << 28 }).toString());
export const S = snap('data/sectors.json');
const B = snap('data/breadth.json');
export const cfg = snap('config/thresholds.json');
const TV = JSON.parse(fs.readFileSync(path.join(HERE, 'volumi_settori.json'), 'utf8')).tv;
export const D = S.dates;
const n = D.length;
export const P = cfg.params;
const COST = 0.001; // 10 punti base per acquisto o vendita

// ---------- serie per settore ----------
const logret = (c, i) => (c[i] != null && c[i - 1] != null ? Math.log(c[i] / c[i - 1]) : null);
function stdRet(c, t, w) {
  if (t - w < 0) return null;
  let s = 0, s2 = 0;
  for (let i = t - w + 1; i <= t; i++) { const r = logret(c, i); if (r == null) return null; s += r; s2 += r * r; }
  const m = s / w;
  return Math.sqrt(Math.max(0, (s2 - w * m * m) / (w - 1)));
}
function smaAt(c, t, w) {
  if (t < w - 1) return null;
  let s = 0;
  for (let i = t - w + 1; i <= t; i++) { if (c[i] == null) return null; s += c[i]; }
  return s / w;
}
function avgRange(c, t, w = 20) { // come in js/signals.js
  let s = 0, m = 0;
  for (let i = Math.max(1, t - w + 1); i <= t; i++) if (c[i] != null && c[i - 1] != null) { s += Math.abs(c[i] - c[i - 1]); m++; }
  return m ? s / m : 0;
}
const minOver = (a, t, w) => { let m = Infinity; for (let i = Math.max(0, t - w + 1); i <= t; i++) if (a[i] != null) m = Math.min(m, a[i]); return m; };
const maxPrev = (c, t, k) => { let m = -Infinity; for (let i = t - k; i <= t - 1; i++) if (i >= 0 && c[i] != null) m = Math.max(m, c[i]); return m; };

export const SEC = {};
for (const s of [...SECTOR_KEYS, 'SPY']) {
  const c = S.adjclose[s];
  const o = { c };
  if (s !== 'SPY') {
    o.br = breadthSeries(B, s, D);
    o.px = priceSeries(c);
    o.m = runMachine(o.px, o.br, cfg.blue[s], P);
    o.L = cfg.blue[s];
    o.tv = TV[s];
  }
  SEC[s] = o;
}
const volCache = new Map();
export function vol(s, w, t) {
  const k = s + ':' + w;
  if (!volCache.has(k)) { const c = SEC[s].c, a = new Array(n).fill(null); for (let i = 0; i < n; i++) a[i] = stdRet(c, i, w); volCache.set(k, a); }
  return volCache.get(k)[t];
}
const smaCache = new Map();
export function sma(s, w, t) {
  const k = s + ':' + w;
  if (!smaCache.has(k)) { const c = SEC[s].c, a = new Array(n).fill(null); for (let i = 0; i < n; i++) a[i] = smaAt(c, i, w); smaCache.set(k, a); }
  return smaCache.get(k)[t];
}

// ---------- episodi e periodi (definiti dalla macchina dell'app, C0) ----------
export const EPIS = [];
for (const s of SECTOR_KEYS) {
  const { m } = SEC[s];
  const starts = m.setups.map((x) => x.t);
  m.setups.forEach((su, k) => {
    const tr = m.events.filter((e) => e.setup === su && e.code === 'trig');
    if (!tr.length) return; // episodio aperto (XLU dal 25/09/2026)
    const next = k + 1 < starts.length ? starts[k + 1] - 1 : Infinity;
    const we = Math.min(su.t + 252, next, n - 1);
    const lowEnd = Math.min(su.t + 252, n - 1);
    let tl = su.t; for (let i = su.t; i <= lowEnd; i++) if (SEC[s].c[i] < SEC[s].c[tl]) tl = i;
    let tm = tl; for (let i = tl + 1; i <= Math.min(n - 1, tl + 126); i++) if (SEC[s].c[i] > SEC[s].c[tm]) tm = i;
    EPIS.push({ s, t0: su.t, we, tl, tm, appEvents: m.events.filter((e) => e.setup === su && e.t <= we).map((e) => ({ t: e.t, code: e.code })) });
  });
}
EPIS.sort((a, b) => a.t0 - b.t0 || (a.s < b.s ? -1 : 1));
{ // periodi con finestre di un anno sovrapposte
  let k = -1, end = -1;
  for (const e of EPIS) { if (e.t0 > end) k++; e.per = k; end = Math.max(end, e.t0 + 252); }
}
export const PERIODS = [...new Set(EPIS.map((e) => e.per))].map((k) => {
  const g = EPIS.filter((e) => e.per === k), y0 = D[g[0].t0].slice(0, 4), y1 = D[g.at(-1).t0].slice(0, 4);
  const lab = { '2008': '2008–09', '2011': '2011', '2015': '2015–16', '2018': 'dicembre 2018', '2020': '2020', '2022': '2022–23', '2025': '2025' }[y0] || (y0 === y1 ? y0 : `${y0}–${y1}`);
  return { k, lab, n: g.length };
});
export const V_PERIODS = PERIODS.filter((p) => p.lab === 'dicembre 2018' || p.lab === '2020').map((p) => p.k);

// ---------- POC della discesa, per episodio ----------
function pocSeries(e, bin) {
  const { c, tv } = SEC[e.s];
  let p0 = e.t0; for (let i = Math.max(0, e.t0 - 252); i <= e.t0; i++) if (c[i] > c[p0]) p0 = i;
  const lb = Math.log(1 + bin), acc = new Map();
  let best = null, bestV = -1;
  const out = new Array(n).fill(null);
  for (let d = p0; d <= e.we; d++) {
    if (c[d] != null && tv[d] != null) {
      const b = Math.floor(Math.log(c[d]) / lb), v = (acc.get(b) || 0) + tv[d];
      acc.set(b, v);
      if (v > bestV) { bestV = v; best = b; }
    }
    if (best != null) out[d] = Math.exp((best + 0.5) * lb);
  }
  return out;
}

// ---------- struttura di Dow (C1b), per episodio ----------
function dowSeries(e, k, tol) {
  const { c } = SEC[e.s];
  const out = new Array(n).fill(false);
  let L1 = c[e.t0], phase = 'rise', hi = null, H1 = null, L2 = null, ok = false;
  for (let t = e.t0 + 1; t <= e.we; t++) {
    const sd = stdRet(c, t, 20), h = k * (sd || 0), ar = avgRange(c, t);
    const newLow = tol && phase === 'pullback' ? c[t] < L1 - ar : c[t] < L1;
    if (newLow) { L1 = c[t]; phase = 'rise'; hi = null; H1 = null; L2 = null; ok = false; out[t] = false; continue; }
    if (phase === 'rise') {
      hi = hi == null ? c[t] : Math.max(hi, c[t]);
      if (hi >= L1 * (1 + h) && c[t] <= hi * (1 - h)) { H1 = hi; phase = 'pullback'; L2 = c[t]; }
    } else if (phase === 'pullback') {
      L2 = Math.min(L2, c[t]);
      if (c[t] > H1 && (L2 > L1 || (tol && L2 >= L1 - ar))) { ok = true; phase = 'done'; }
    }
    out[t] = ok;
  }
  return out;
}

// ---------- simulatore ----------
// rule: { accel: {vs, vl, brk} | null, brake: {type: 'sma', w} | {type: 'dow', k, tol} | null,
//         staged: null | {type: 'two', w} | {type: 'three', tol, poc: null | {bin}} | {type: 'touch', w1}, needZero, fixed: null | offset }
// opt: { delay: 0 | 1, stop: bool }
export function simulate(e, rule, opt = {}) {
  const { c, br, L } = SEC[e.s];
  const H = br.pct200, delay = opt.delay || 0;
  const pocS = rule.staged && rule.staged.poc ? pocSeries(e, rule.staged.poc.bin) : null;
  const dowS = rule.brake && rule.brake.type === 'dow' ? dowSeries(e, rule.brake.k, rule.brake.tol) : null;
  let cash = 1, units = 0;
  const V = new Array(n).fill(null), orders = [], log = { trig: [], fail: [], buys: [] };
  let st = 'setup', trigT = null, failRef = null, pending = null, cyc = null, firstCycle = null;
  const setup = { t: e.t0, bmin: H[e.t0], tb: e.t0, pmin: c[e.t0], tp: e.t0, strict: false };
  const order = (t, kind, frac) => { const x = t + 1 + delay; if (x <= e.we) orders.push({ x, kind, amt: frac * (cyc ? cyc.cap : 1), sig: t }); };
  function startCycle(ts) {
    cyc = { ts, cap: cash, done2: false, done3: false, merged: false, B: maxPrev(c, ts, 10) };
    if (!firstCycle) firstCycle = { ts, buys: [] };
    failRef = ts;
    if (!rule.staged || rule.staged.type === 'touch') order(ts, 'buy', 1); // «touch»: al trigger entra tutta la liquidità rimasta
    else if (rule.staged.type === 'two') { order(ts, 'buy', 0.5); cyc.done2 = c[ts] > sma(e.s, rule.staged.w, ts); if (cyc.done2) order(ts, 'buy', 0.5); }
    else {
      order(ts, 'buy', 1 / 3);
      cyc.level = pocS ? Math.max(cyc.B, pocS[ts]) : cyc.B;
    }
  }
  function exitAll(t, final) { orders.length = 0; if (units > 0) orders.push({ x: t + 1 + delay, kind: 'sell', sig: t }); cyc = null; pending = null; if (final) st = 'done'; }

  // termini di paragone a data fissa: posizione intera tenuta fino alla fine, senza fallimento
  if (rule.fixed != null) {
    const ts = e.t0 + rule.fixed; if (ts + 1 <= e.we) { firstCycle = { ts, buys: [] }; orders.push({ x: ts + 1, kind: 'buy', amt: 1, sig: ts }); }
    st = 'hold';
  }
  if (rule.staged && rule.staged.type === 'touch') { // C7: prima quota al primo giorno di zona blu (secondo giro)
    firstCycle = { ts: e.t0, buys: [] };
    if (e.t0 + 1 + delay <= e.we) orders.push({ x: e.t0 + 1 + delay, kind: 'buy', amt: rule.staged.w1, sig: e.t0 });
  }
  V[e.t0] = 1;
  for (let t = e.t0 + 1; t <= e.we; t++) {
    // esecuzione degli ordini alla chiusura di oggi
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i]; if (o.x !== t) continue;
      if (o.kind === 'buy') {
        const amt = Math.min(cash, o.amt);
        if (amt > 1e-12) { units += (amt * (1 - COST)) / c[t]; cash -= amt; log.buys.push({ t, sig: o.sig, price: c[t], amt }); if (firstCycle && !firstCycle.closed) firstCycle.buys.push({ t, sig: o.sig, price: c[t], amt }); }
      } else if (units > 0) { cash += units * c[t] * (1 - COST); units = 0; if (firstCycle) firstCycle.closed = true; }
    }
    for (let i = orders.length - 1; i >= 0; i--) if (orders[i].x <= t) orders.splice(i, 1);
    V[t] = cash + units * c[t];
    if (st === 'hold' || st === 'done') continue;

    const b = H[t];
    if (b == null || c[t] == null || !br.n[t]) continue;
    const stock = 100 / br.n[t];
    const h = Math.max(P.minRecoveryPoints, P.minRecoveryStocks * stock);
    const reset = Math.max(P.resetFloor, L + P.resetAbove);

    if (st === 'trig') {
      const since = t - failRef;
      if (since >= 1 && since <= P.failWindow && c[t] < setup.pmin - avgRange(c, t)) {
        log.fail.push(t); exitAll(t, false); setup.strict = true; st = 'setup'; continue; // come in js/signals.js
      }
      if (opt.stop && (cyc || units > 0) && since > P.failWindow && c[t] < setup.pmin - avgRange(c, t)) { exitAll(t, true); continue; }
      if (pending) {
        const ok = pending === 'brake'
          ? (rule.brake.type === 'sma' ? c[t] > sma(e.s, rule.brake.w, t) : dowS[t])
          : c[t] > pocS[t];
        if (ok) { pending = null; startCycle(t); }
        continue;
      }
      if (cyc && rule.staged && rule.staged.type === 'two' && !cyc.done2 && c[t] > sma(e.s, rule.staged.w, t)) { cyc.done2 = true; order(t, 'buy', 0.5); }
      if (cyc && rule.staged && rule.staged.type === 'three') {
        const tol = rule.staged.tol;
        if (!cyc.done2 && !cyc.merged && t - cyc.ts <= 63 && c[t] <= cyc.level * (1 + tol)) { cyc.done2 = true; order(t, 'buy', 1 / 3); }
        if (!cyc.done3) {
          const v20 = vol(e.s, 20, t - 1), v120 = vol(e.s, 120, t - 1);
          if (v20 != null && v120 != null && v20 < v120 && c[t] > maxPrev(c, t, 50)) {
            cyc.done3 = true; order(t, 'buy', 1 / 3);
            if (cyc.merged && !cyc.done2) { cyc.done2 = true; order(t, 'buy', 1 / 3); }
          }
        }
        if (!cyc.done2 && !cyc.merged && t - cyc.ts === 63) {
          if (cyc.done3) { cyc.done2 = true; order(t, 'buy', 1 / 3); } else cyc.merged = true;
        }
      }
      continue;
    }

    // st === 'setup'
    if (b < setup.bmin) { setup.bmin = b; setup.tb = t; }
    if (c[t] < setup.pmin) { setup.pmin = c[t]; setup.tp = t; }
    const conf = [];
    if (br.pct20[t] != null && br.pct20[t] >= 70 && minOver(br.pct20, t, 15) <= 15) conf.push('t20');
    else if (br.pct50[t] != null && br.pct50[t] >= 50 && minOver(br.pct50, t, 20) <= 10) conf.push('t50');
    const m20 = smaAt(c, t, 20), m20p = smaAt(c, t - 5, 20);
    if (m20 != null && m20p != null && c[t] > m20 && m20 > m20p) conf.push('sma');
    if (setup.tp > setup.tb + 5 && H[setup.tp] != null && H[setup.tp] >= setup.bmin + stock) conf.push('div');
    if (rule.accel) {
      const vs = vol(e.s, rule.accel.vs, t - 1), vl = vol(e.s, rule.accel.vl, t - 1);
      if (vs != null && vl != null && vs < vl && c[t] > maxPrev(c, t, rule.accel.brk)) conf.push('comp');
    }
    const vShape = b >= reset;
    if (vShape) conf.push('v');
    const need = setup.strict || t - setup.t > P.slowSetupSessions ? 2 : 1;
    const breadthOk = b >= Math.max(L + h, setup.bmin + P.minRecoveryStocks * stock);
    const fire = rule.needZero ? breadthOk : breadthOk && (conf.length >= need || vShape);
    if (!fire) continue;
    st = 'trig'; trigT = t; failRef = t; log.trig.push({ t, conf: conf.slice() });
    const thrustOnly = conf.length === 1 && conf[0] === 't20';
    if (rule.brake && thrustOnly) {
      pending = 'brake';
      const ok = rule.brake.type === 'sma' ? c[t] > sma(e.s, rule.brake.w, t) : dowS[t];
      if (ok) { pending = null; startCycle(t); }
    } else if (pocS) {
      pending = 'poc';
      if (c[t] > pocS[t]) { pending = null; startCycle(t); }
    } else startCycle(t);
  }
  return { V, log, firstCycle, value: V[e.we] };
}

// ---------- misure per episodio ----------
export function measures(e, sim) {
  const { c } = SEC[e.s], spy = SEC.SPY.c;
  const fc = sim.firstCycle, buys = fc ? fc.buys : [];
  const out = { main: sim.value - 1, entered: buys.length > 0 };
  if (!out.entered) return { ...out, lost: 1, beforeLow: false, mae21: 0, mae63: 0, falseStart: false, hold: 0 };
  const te = buys[0].t, p1 = buys[0].price;
  const amt = buys.reduce((a, x) => a + x.amt, 0), avg = amt / buys.reduce((a, x) => a + x.amt / x.price, 0);
  const mstar = c[e.tl], M = c[e.tm];
  out.firstExe = te; out.firstSig = buys[0].sig; out.beforeLow = te < e.tl;
  out.lost = out.beforeLow ? 0 : Math.max(0, Math.log(avg / mstar) / Math.log(M / mstar));
  const mae = (k) => { let m = 0; for (let d = te; d <= Math.min(e.we, te + k); d++) m = Math.min(m, sim.V[d] / sim.V[te] - 1); return m; };
  out.mae21 = mae(21); out.mae63 = mae(63);
  let mn = Infinity; for (let d = te + 1; d <= Math.min(n - 1, te + 126); d++) mn = Math.min(mn, c[d]);
  out.falseStart = mn / p1 - 1 <= -0.10;
  out.hold = c[e.we] / p1 - 1;
  for (const k of [21, 63, 126]) {
    const d = Math.min(n - 1, te + k);
    out['r' + k] = c[d] / p1 - 1; out['x' + k] = c[d] / p1 - spy[d] / spy[te];
  }
  return out;
}
