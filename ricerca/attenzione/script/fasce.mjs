// Fascia di attenzione sopra il livello blu: quale regola avvisa prima dei bottom con pochi falsi allarmi?
// Per ogni settore (dal 2005) e regola: episodi di attenzione (breadth che scende sotto la soglia dopo almeno
// 20 sedute sopra), quanti arrivano al livello blu entro 6 mesi, con quanto anticipo, e quanti tocchi del livello
// blu erano stati preceduti da un'attenzione iniziata almeno 5 sedute prima.
import fs from 'node:fs';
import { breadthSeries, priceSeries, forward } from '/home/user/rrg/js/signals.js';
const R = (f) => JSON.parse(fs.readFileSync('/home/user/rrg/' + f));
const th = R('config/thresholds.json'), sec = R('data/sectors.json'), br = R('data/breadth.json');
const SECT = Object.keys(th.blue);
const pctl = (a, q) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))]; };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
// di quanti punti scende la breadth in h sedute, quantile q dei cali
function drop(b, h, q) { const d = []; for (let t = h; t < b.length; t++) if (b[t] != null && b[t - h] != null && b[t] < b[t - h]) d.push(b[t - h] - b[t]); return pctl(d, q); }
const RULES = {
  'fisso +10 punti (oggi)': (b, L) => L + 10,
  'fisso +15 punti': (b, L) => L + 15,
  '3 titoli sopra il livello': (b, L, n) => L + 300 / n,
  '10° percentile della storia': (b) => pctl(b, 0.10),
  '15° percentile della storia': (b) => pctl(b, 0.15),
  'velocità: calo tipico in 10 sedute': (b, L) => L + drop(b, 10, 0.75),
  'velocità: calo forte in 10 sedute': (b, L) => L + drop(b, 10, 0.90),
  'velocità: calo forte in 20 sedute': (b, L) => L + drop(b, 20, 0.90),
  'veloc. 10 sedute + DD oltre 50° pct': (b, L) => L + drop(b, 10, 0.90),
  'veloc. 10 sedute + DD oltre 70° pct': (b, L) => L + drop(b, 10, 0.90),
  '+10 punti + DD oltre 50° pct': (b, L) => L + 10,
};
const DDMIN = { 'veloc. 10 sedute + DD oltre 50° pct': 50, 'veloc. 10 sedute + DD oltre 70° pct': 70, '+10 punti + DD oltre 50° pct': 50 };
const H = 126;
const tot = {}, per = {}, det = {};
for (const k of SECT) {
  const B = breadthSeries(br, k, sec.dates), b = B.pct200, L = th.blue[k];
  const nNow = B.n.filter((v) => v).at(-1), dp = priceSeries(sec.adjclose[k]).dp;
  const touches = []; let above = 0;
  b.forEach((v, t) => { if (v == null) return; if (v <= L) { if (above >= 60) touches.push(t); above = 0; } else above++; });
  for (const [name, f] of Object.entries(RULES)) {
    const A = f(b, L, nNow);
    const eps = []; let up = 0;
    const dmin = DDMIN[name] ?? -1;
    const inBand = (v, t) => v <= A && (dp[t] ?? -1) >= dmin;
    b.forEach((v, t) => { if (v == null) return; if (inBand(v, t)) { if (up >= 20) eps.push(t); up = 0; } else up++; });
    let hit = 0; const leads = [], ret = [];
    for (const t of eps) {
      let u = -1; for (let j = t; j < Math.min(b.length, t + H); j++) if (b[j] != null && b[j] <= L) { u = j; break; }
      if (u >= 0) { hit++; leads.push(u - t); }
      const r = forward(sec.adjclose[k], t, 63); if (r != null) ret.push(r);
    }
    const warned = touches.filter((u) => eps.some((t) => t <= u - 5 && u - t <= H)).length;
    const days = b.filter((v, t) => v != null && inBand(v, t) && v > L).length / b.filter((v) => v != null).length;
    const T = (tot[name] = tot[name] || { eps: 0, hit: 0, leads: [], touches: 0, warned: 0, days: [], ret: [] });
    T.eps += eps.length; T.hit += hit; T.leads.push(...leads); T.touches += touches.length; T.warned += warned; T.days.push(days); T.ret.push(...ret);
    (per[name] = per[name] || []).push(`${k} ${A.toFixed(0)}`);
    (det[name] = det[name] || []).push(`${k.padEnd(4)} soglia ${A.toFixed(0).padStart(2)} · allarmi arrivati ${hit}/${eps.length} · anticipo ${med(leads) ?? '-'} · tocchi avvisati ${warned}/${touches.length}`);
  }
}
console.log('regola'.padEnd(36), 'allarmi', ' arrivano al livello', ' anticipo mediano', ' tocchi avvisati', ' sedute in fascia', ' ETF a 3 mesi');
for (const [name, T] of Object.entries(tot)) {
  console.log(name.padEnd(36), String(T.eps).padStart(6), `${T.hit} (${Math.round((100 * T.hit) / T.eps)}%)`.padStart(18), `${med(T.leads)} sedute`.padStart(16), `${T.warned}/${T.touches}`.padStart(15), `${((100 * T.days.reduce((a, b) => a + b, 0)) / T.days.length).toFixed(1)}%`.padStart(16), `${med(T.ret).toFixed(1)}%`.padStart(12));
}
console.log('\nsoglie per settore:');
for (const n of ['fisso +10 punti (oggi)', '10° percentile della storia', 'velocità: calo forte in 10 sedute', 'velocità: calo forte in 20 sedute']) console.log(n.padEnd(36), per[n].join('  '));
for (const n of ['fisso +10 punti (oggi)', 'velocità: calo forte in 20 sedute']) { console.log('\n' + n); console.log('  ' + det[n].join('\n  ')); }
