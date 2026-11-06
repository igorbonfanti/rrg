// Ricalcolo separato dei numeri chiave di risalita.mjs (scritto a parte): ingressi in avvicinamento in «risalita dopo
// l'Attenzione» (K=20 sedute prima con almeno uno stato non Normale, breadth ≥ minimo di quelle K sedute + 10 punti)
// contro gli altri, P(tocco del livello entro 126 sedute); variante che spegne l'avvicinamento in risalita: tocchi
// avvisati, ingressi che arrivano, sedute accese. Settori, dalla prima seduta con uno stato.
// Uso: node ricerca/avvicinamento-uso/script/verifica_risalita.mjs
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachLevel, DEFAULT_PARAMS } from '../../../js/signals.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params }, sec = R('data/sectors.json'), br = R('data/breadth.json');
const K = 20, X = 10, H = 126;
const g = { ris: [0, 0], alt: [0, 0] }, rule = { att: { w: 0, n: 0, hit: 0, ne: 0, on: 0, days: 0 }, var: { w: 0, n: 0, hit: 0, ne: 0, on: 0, days: 0 } };
for (const k of Object.keys(th.blue)) {
  const B = breadthSeries(br, k, sec.dates), b = B.pct200, L = th.blue[k], m = runMachine(priceSeries(sec.adjclose[k]), B, L, P), N = b.length;
  const start = m.days.findIndex((d) => d != null);
  const st = []; let c = 'normal'; for (let t = 0; t < N; t++) { if (m.days[t] != null) c = m.days[t]; st.push(c); }
  const appr = b.map((v, t) => { if (t < start || v == null || st[t] !== 'normal') return false; const A = approachLevel(b.slice(0, t + 1), L); return A != null && v <= A; });
  const ris = b.map((v, t) => {
    if (!appr[t]) return false;
    let notNormal = false, mn = Infinity;
    for (let j = Math.max(0, t - K); j < t; j++) { if (st[j] !== 'normal') notNormal = true; if (b[j] != null) mn = Math.min(mn, b[j]); }
    return notNormal && v >= mn + X - 1e-9;
  });
  const touches = []; let run = 0;
  for (let t = start; t < N; t++) { if (b[t] == null) continue; if (b[t] <= L) { if (run >= 60) touches.push(t); run = 0; } else run++; }
  const hit = (t) => { for (let j = t; j < Math.min(N, t + H); j++) if (b[j] != null && b[j] <= L) return true; return false; };
  for (const [name, on] of [['att', appr], ['var', appr.map((x, t) => x && !ris[t])]]) {
    const ent = []; let off = 0;
    for (let t = start; t < N; t++) { if (b[t] == null) continue; rule[name].days++; if (on[t]) { rule[name].on++; if (off >= 20) ent.push(t); off = 0; } else off++; }
    for (const t of ent) {
      if (t + H >= N) continue;
      rule[name].ne++; if (hit(t)) rule[name].hit++;
      if (name === 'att') { const grp = ris[t] ? g.ris : g.alt; grp[1]++; if (hit(t)) grp[0]++; }
    }
    rule[name].w += touches.filter((u) => ent.some((s) => u - s >= 5 && u - s <= H)).length; rule[name].n += touches.length;
  }
}
const pc = (a, n) => `${a}/${n} = ${(100 * a / n).toFixed(1)}%`;
console.log('ingressi in risalita, toccano entro 126:', pc(...g.ris), '| altri:', pc(...g.alt), '| rapporto', ((g.ris[0] / g.ris[1]) / (g.alt[0] / g.alt[1])).toFixed(2));
for (const [n, r] of Object.entries(rule)) console.log(n === 'att' ? 'regola attuale' : 'variante      ', '| tocchi avvisati', `${r.w}/${r.n}`, '| ingressi che arrivano', pc(r.hit, r.ne), '| sedute accese', (100 * r.on / r.days).toFixed(1) + '%');
