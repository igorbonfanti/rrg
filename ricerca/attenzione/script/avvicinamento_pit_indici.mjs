// Come avvicinamento_pit.mjs, sui 22 indici della vista 6 (storia di ciascuno, la più lunga dal 2000): soglia su tutta la
// storia (A, la prova di indici.mjs), soglia fino a quel giorno (B), B solo in stato Normale come la mostra l'app (C),
// C oppure Attenzione (D), solo Attenzione (E). Prezzo: chiusura dell'indice (solo prezzo).
// Uso: node ricerca/attenzione/script/avvicinamento_pit_indici.mjs   → scrive ricerca/attenzione/avvicinamento_pit_indici.json
import fs from 'node:fs';
import { priceSeries, runMachine, approachLevel, approachSeries, DEFAULT_PARAMS } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params };
const cfg = R('config/indices.json').indices, IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const H = 126, tot = {};
for (const k of Object.keys(cfg)) {
  const X = indexSeries(IX[k]), b = X.pct200, L = cfg[k].blue;
  const m = runMachine(priceSeries(X.close), X, L, P);
  const Aall = approachLevel(b, L), Apit = approachSeries(b, L);
  let code = null;
  const state = b.map((_, t) => { if (m.days[t] != null || t === 0) code = m.days[t] || 'normal'; return code; });
  const pit = (v, t) => Apit[t] != null && v <= Apit[t];
  const rules = {
    'A. soglia su tutta la storia': (v) => Aall != null && v <= Aall,
    'B. soglia fino a quel giorno': pit,
    'C. B + stato Normale (app)': (v, t) => pit(v, t) && state[t] === 'normal',
    'D. C oppure Attenzione': (v, t) => (pit(v, t) && state[t] === 'normal') || state[t] === 'watch',
    'E. solo Attenzione': (v, t) => state[t] === 'watch',
  };
  const touches = []; let above = 0;
  b.forEach((v, t) => { if (v == null) return; if (v <= L) { if (above >= 60) touches.push(t); above = 0; } else above++; });
  for (const [name, on] of Object.entries(rules)) {
    const eps = []; let up = 0;
    b.forEach((v, t) => { if (v == null) return; if (on(v, t)) { if (up >= 20) eps.push(t); up = 0; } else up++; });
    let hit = 0; const leads = [];
    for (const t of eps) { let u = -1; for (let j = t; j < Math.min(b.length, t + H); j++) if (b[j] != null && b[j] <= L) { u = j; break; } if (u >= 0) { hit++; leads.push(u - t); } }
    const warned = touches.filter((u) => eps.some((t) => t <= u - 5 && u - t <= H)).length;
    const T = (tot[name] = tot[name] || { eps: 0, hit: 0, leads: [], touches: 0, warned: 0 });
    T.eps += eps.length; T.hit += hit; T.leads.push(...leads); T.touches += touches.length; T.warned += warned;
  }
}
const out = Object.fromEntries(Object.entries(tot).map(([n, T]) => [n, { allarmi: T.eps, quotaArrivano: Math.round((100 * T.hit) / T.eps), anticipoMediano: med(T.leads), tocchiAvvisati: `${T.warned}/${T.touches}` }]));
for (const [n, o] of Object.entries(out)) console.log(n.padEnd(32), JSON.stringify(o));
fs.writeFileSync(new URL('../avvicinamento_pit_indici.json', import.meta.url), JSON.stringify({ regole: out }, null, 1) + '\n');
