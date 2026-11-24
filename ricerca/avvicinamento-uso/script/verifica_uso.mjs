// Ricalcolo separato dei numeri chiave di backtest_uso.mjs (scritto a parte, senza copiarne il codice): ingressi in
// avvicinamento (dopo almeno 20 sedute senza), probabilità di zona blu entro 63/126 sedute contro le sedute Normali
// fuori dall'avvicinamento, calo massimo e rendimento a 63 sedute. Si parte dalla prima seduta calcolata dalla macchina.
// Uso: node ricerca/avvicinamento-uso/script/verifica_uso.mjs
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachLevel, DEFAULT_PARAMS } from '../../../js/signals.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params }, sec = R('data/sectors.json'), br = R('data/breadth.json');
// mediana: con un numero pari di valori prende il valore centrale più basso (backtest_uso.mjs fa la media dei due centrali)
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const PS = {};
const E = { n: 0, s63: 0, n63: 0, s126: 0, n126: 0, dd: [], r: [] }, B = { s63: 0, n63: 0, s126: 0, n126: 0, dd: [], r: [] };
for (const k of Object.keys(th.blue)) {
  const Bz = breadthSeries(br, k, sec.dates), b = Bz.pct200, L = th.blue[k], px = sec.adjclose[k];
  const m = runMachine(priceSeries(px), Bz, L, P), N = b.length;
  const start = m.days.findIndex((d) => d != null);
  const st = []; let cur = 'normal';
  for (let t = 0; t < N; t++) { if (m.days[t] != null) cur = m.days[t]; st.push(cur); }
  // soglia: approachLevel sulla storia tagliata, ma solo dove serve (stato normale e breadth presente)
  const on = new Array(N).fill(false);
  for (let t = start; t < N; t++) if (st[t] === 'normal' && b[t] != null) { const A = approachLevel(b.slice(0, t + 1), L); on[t] = A != null && b[t] <= A; }
  const setupWithin = (t, h) => { for (let j = t + 1; j <= t + h; j++) if (m.days[j] === 'setup') return true; return false; };
  const fwd = (t, h) => {
    if (t + h >= N || px[t] == null) return null;
    let lo = px[t]; for (let j = t + 1; j <= t + h; j++) if (px[j] != null) lo = Math.min(lo, px[j]);
    return px[t + h] == null ? null : { dd: 100 * (lo / px[t] - 1), r: 100 * (px[t + h] / px[t] - 1) };
  };
  const ps = (PS[k] = { e126: 0, n126: 0, b126: 0, nb126: 0, e63: 0, n63: 0, b63: 0, nb63: 0 });
  let off = 0;
  for (let t = start; t < N; t++) {
    if (b[t] == null) continue;
    if (on[t]) {
      if (off >= 20) {
        E.n++;
        if (t + 63 < N) { E.n63++; if (setupWithin(t, 63)) E.s63++; }
        if (t + 126 < N) { E.n126++; ps.n126++; if (setupWithin(t, 126)) { E.s126++; ps.e126++; } }
        if (t + 63 < N) { ps.n63++; if (setupWithin(t, 63)) ps.e63++; }
        const f = fwd(t, 63); if (f) { E.dd.push(f.dd); E.r.push(f.r); }
      }
      off = 0;
    } else {
      off++;
      if (st[t] === 'normal') {
        if (t + 63 < N) { B.n63++; if (setupWithin(t, 63)) B.s63++; }
        if (t + 126 < N) { B.n126++; ps.nb126++; if (setupWithin(t, 126)) { B.s126++; ps.b126++; } }
        if (t + 63 < N) { ps.nb63++; if (setupWithin(t, 63)) ps.b63++; }
        const f = fwd(t, 63); if (f) { B.dd.push(f.dd); B.r.push(f.r); }
      }
    }
  }
}
const p = (a, n) => `${a}/${n} = ${(100 * a / n).toFixed(1)}%`;
console.log('ingressi', E.n);
console.log('zona blu entro 63 :', p(E.s63, E.n63), '| base', p(B.s63, B.n63), '| rapporto', ((E.s63 / E.n63) / (B.s63 / B.n63)).toFixed(2));
console.log('zona blu entro 126:', p(E.s126, E.n126), '| base', p(B.s126, B.n126), '| rapporto', ((E.s126 / E.n126) / (B.s126 / B.n126)).toFixed(2));
console.log('calo max 63 mediano:', med(E.dd).toFixed(1), '| base', med(B.dd).toFixed(1));
console.log('rendimento 63 mediano:', med(E.r).toFixed(1), '| base', med(B.r).toFixed(1));
const s = [...E.r].sort((x, y) => x - y); console.log("rendimenti 63:", E.r.length, "valori centrali", s[E.r.length / 2 - 1]?.toFixed(2), s[E.r.length / 2]?.toFixed(2));
for (const [k, s] of Object.entries(PS)) console.log(k.padEnd(5), 'ingressi', String(s.n126).padStart(3), '| zona blu 63:', `${s.e63}/${s.n63}`, 'R', ((s.e63 / s.n63) / (s.b63 / s.nb63)).toFixed(2), '| zona blu 126:', `${s.e126}/${s.n126}`, 'base', (100 * s.b126 / s.nb126).toFixed(1) + '%', 'R', ((s.e126 / s.n126) / (s.b126 / s.nb126)).toFixed(2));
