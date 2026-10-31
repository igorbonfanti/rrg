// Ricalcolo separato dei casi C (avvicinamento come lo mostra l'app), D (C oppure Attenzione) ed E (solo Attenzione) di
// avvicinamento_pit.mjs e avvicinamento_pit_indici.mjs: soglia con approachLevel sulla storia tagliata seduta per seduta
// (non approachSeries) e conteggi scritti a parte. Conta dalla prima seduta con uno stato della macchina (il periodo che
// l'app mostra). Circa un minuto. Uso: node ricerca/attenzione/script/verifica_pit.mjs
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachLevel, DEFAULT_PARAMS } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params };
function count(list, runFromStart) {
  const tot = { C: [0, 0], D: [0, 0], E: [0, 0] }, ar = { C: [0, 0, []], D: [0, 0, []], E: [0, 0, []] }, pr = { C: [], D: [], E: [] };
  for (const { b, L, days } of list) {
    const start = days.findIndex((d) => d != null);
    const A = b.map((_, t) => (t < start ? null : approachLevel(b.slice(0, t + 1), L)));
    const st = []; let last = 'normal'; for (let t = 0; t < b.length; t++) { if (days[t]) last = days[t]; st.push(last); }
    const f = { C: (t) => A[t] != null && b[t] <= A[t] && st[t] === 'normal', E: (t) => st[t] === 'watch' }; f.D = (t) => f.C(t) || f.E(t);
    const touch = []; let run = 0;
    for (let t = runFromStart ? start : 0; t < b.length; t++) { if (b[t] == null) continue; if (b[t] <= L) { if (run >= 60 && t >= start) touch.push(t); run = 0; } else run++; }
    for (const r of ['C', 'D', 'E']) {
      const s0 = []; let off = 0;
      for (let t = start; t < b.length; t++) { if (b[t] == null) continue; if (f[r](t)) { if (off >= 20) s0.push(t); off = 0; } else off++; }
      for (const s of s0) { const j = b.findIndex((v, k) => k >= s && k < s + 126 && v != null && v <= L); ar[r][1]++; if (j >= 0) { ar[r][0]++; ar[r][2].push(j - s); } }
      for (const u of touch) { const w = s0.filter((s) => u - s >= 5 && u - s <= 126); if (w.length) pr[r].push(u - w[0]); }
      tot[r][0] += touch.filter((u) => s0.some((s) => u - s >= 5 && u - s <= 126)).length; tot[r][1] += touch.length;
    }
  }
  const med = (a) => a.sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)];
  const med2 = (a) => { const v = [...a].sort((x, y) => x - y), n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
  return Object.entries(tot).map(([r, [a, n]]) => `${r} tocchi ${a}/${n}, arrivano ${ar[r][0]}/${ar[r][1]} = ${Math.round(100 * ar[r][0] / ar[r][1])}%, anticipo ${med(ar[r][2])}, primo avviso prima del tocco ${med2(pr[r])}`).join('\n  ');
}
const sec = R('data/sectors.json'), br = R('data/breadth.json');
const S = Object.keys(th.blue).map((k) => { const B = breadthSeries(br, k, sec.dates); return { b: B.pct200, L: th.blue[k], days: runMachine(priceSeries(sec.adjclose[k]), B, th.blue[k], P).days }; });
console.log('settori, conteggio sopra dal primo stato :', count(S, true));
console.log('primo stato:', Object.keys(th.blue).map((k, i) => `${k} ${sec.dates[S[i].days.findIndex((d) => d != null)]}`).join(', '));
const cfg = R('config/indices.json').indices, IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
const I = Object.keys(cfg).map((k) => { const X = indexSeries(IX[k]); return { k, b: X.pct200, L: cfg[k].blue, days: runMachine(priceSeries(X.close), X, cfg[k].blue, P).days, d0: X.dates[X.pct200.findIndex((v) => v != null)], X }; });
console.log('indici con stato dopo l\'inizio della breadth:', I.filter((x) => x.days.findIndex((d) => d != null) > x.b.findIndex((v) => v != null) + 5).map((x) => `${x.k} breadth ${x.d0} stato ${x.X.dates[x.days.findIndex((d) => d != null)]}`).join('; ') || 'nessuno');
console.log('indici, dal primo stato:', count(I, true));
