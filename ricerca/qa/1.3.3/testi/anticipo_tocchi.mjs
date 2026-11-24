// Variante descrittiva: anticipo misurato sui tocchi avvisati (dal primo e dall'ultimo allarme nella finestra 5–126 sedute),
// per confrontarlo con l'«anticipo mediano» dei testi (allarmi che arrivano: dall'allarme al primo tocco).
// Uso: node ricerca/qa/1.3.3/testi/anticipo_tocchi.mjs
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachSeries, DEFAULT_PARAMS } from '../../../../js/signals.js';
const J = (p) => JSON.parse(fs.readFileSync(new URL('../../../../' + p, import.meta.url), 'utf8'));
const th = J('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params }, sec = J('data/sectors.json'), br = J('data/breadth.json');
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[(s.length - 1) >> 1]; };
const out = { C: [[], []], D: [[], []], E: [[], []] };
for (const k of Object.keys(th.blue)) {
  const B = breadthSeries(br, k, sec.dates), b = B.pct200, L = th.blue[k], m = runMachine(priceSeries(sec.adjclose[k]), B, L, P);
  const s0 = m.days.findIndex((d) => d != null), A = approachSeries(b, L), st = []; let c = 'normal';
  for (let t = 0; t < b.length; t++) { if (m.days[t] != null) c = m.days[t]; st.push(c); }
  const av = (t) => A[t] != null && b[t] != null && st[t] === 'normal' && b[t] <= A[t];
  const R = { C: av, D: (t) => av(t) || st[t] === 'watch', E: (t) => st[t] === 'watch' };
  const tc = []; let up = 0; for (let t = s0; t < b.length; t++) { if (b[t] == null) continue; if (b[t] <= L) { if (up >= 60) tc.push(t); up = 0; } else up++; }
  for (const r of 'CDE') {
    const on = []; let q = 0; for (let t = s0; t < b.length; t++) { if (b[t] == null) continue; if (R[r](t)) { if (q >= 20) on.push(t); q = 0; } else q++; }
    for (const u of tc) { const w = on.filter((s) => u - s >= 5 && u - s <= 126); if (w.length) { out[r][0].push(u - w[0]); out[r][1].push(u - w.at(-1)); } }
  }
}
for (const r of 'CDE') console.log(r, 'tocchi avvisati', out[r][0].length, '· anticipo mediano dal primo allarme', med(out[r][0]), '· dall\'ultimo allarme', med(out[r][1]));
