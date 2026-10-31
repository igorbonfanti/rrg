// Avvicinamento: rifà la prova di fasce.mjs (regola «velocità: calo forte in 10 sedute») in tre modi, per vedere quanto
// cambiano i numeri citati nell'app (59 tocchi su 73, circa un mese di anticipo, 41% che arriva al livello):
//   A. soglia unica calcolata su tutta la storia (come fasce.mjs, guarda il futuro);
//   B. soglia seduta per seduta con la sola storia fino a lì (approachSeries, come l'app dalla 1.3.0);
//   C. come B, ma solo in stato Normale (la condizione che l'app colora: anello, badge, tratti gialli);
//   D. C oppure stato Attenzione: la scala di avvisi che l'app dà prima della zona blu;
//   E. solo stato Attenzione, per confronto.
// Stesse definizioni di fasce.mjs: allarme = breadth sotto la soglia dopo almeno 20 sedute sopra; arriva = tocca il
// livello blu entro 126 sedute; tocco = breadth al livello blu dopo almeno 60 sedute sopra; tocco avvisato = allarme
// iniziato da 5 a 126 sedute prima. In più: rendimento dell'ETF a 3 mesi (63 sedute) dopo l'allarme, confrontato con
// quello di tutte le sedute, e i tocchi persi.
// Uso: node ricerca/attenzione/script/avvicinamento_pit.mjs   → scrive ricerca/attenzione/avvicinamento_pit.json
import fs from 'node:fs';
import { breadthSeries, priceSeries, forward, runMachine, approachLevel, approachSeries, DEFAULT_PARAMS } from '../../../js/signals.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), sec = R('data/sectors.json'), br = R('data/breadth.json');
const P = { ...DEFAULT_PARAMS, ...th.params }, SECT = Object.keys(th.blue), H = 126;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const tot = {}, perSector = {};
for (const k of SECT) {
  const B = breadthSeries(br, k, sec.dates), b = B.pct200, L = th.blue[k], px = sec.adjclose[k];
  const m = runMachine(priceSeries(px), B, L, P);
  const Aall = approachLevel(b, L), Apit = approachSeries(b, L);
  let code = null;
  const state = b.map((_, t) => { if (m.days[t] != null || t === 0) code = m.days[t] || 'normal'; return code; });
  code = null;
  const normal = b.map((_, t) => { if (m.days[t] != null || t === 0) code = m.days[t] || 'normal'; return code === 'normal'; });
  const rules = {
    'A. soglia su tutta la storia': (v, t) => v <= Aall,
    'B. soglia fino a quel giorno': (v, t) => Apit[t] != null && v <= Apit[t],
    'C. B + stato Normale (app)': (v, t) => Apit[t] != null && v <= Apit[t] && normal[t],
    'D. C oppure Attenzione': (v, t) => (Apit[t] != null && v <= Apit[t] && normal[t]) || state[t] === 'watch',
    'E. solo Attenzione': (v, t) => state[t] === 'watch',
  };
  const touches = []; let above = 0;
  b.forEach((v, t) => { if (v == null) return; if (v <= L) { if (above >= 60) touches.push(t); above = 0; } else above++; });
  for (const [name, on] of Object.entries(rules)) {
    const eps = []; let up = 0;
    b.forEach((v, t) => { if (v == null) return; if (on(v, t)) { if (up >= 20) eps.push(t); up = 0; } else up++; });
    let hit = 0; const leads = [], ret = [];
    for (const t of eps) {
      let u = -1; for (let j = t; j < Math.min(b.length, t + H); j++) if (b[j] != null && b[j] <= L) { u = j; break; }
      if (u >= 0) { hit++; leads.push(u - t); }
      const r = forward(px, t, 63); if (r != null) ret.push(r);
    }
    const warnedT = touches.filter((u) => eps.some((t) => t <= u - 5 && u - t <= H));
    const T = (tot[name] = tot[name] || { eps: 0, hit: 0, leads: [], touches: 0, warned: 0, ret: [], missed: [] });
    T.eps += eps.length; T.hit += hit; T.leads.push(...leads); T.touches += touches.length; T.warned += warnedT.length; T.ret.push(...ret);
    T.missed.push(...touches.filter((u) => !warnedT.includes(u)).map((u) => `${k} ${sec.dates[u]} (5 sedute prima: ${state[u - 5]}, breadth ${b[u - 5]?.toFixed(0)}, soglia ${Apit[u - 5]?.toFixed(0)})`));
    (perSector[name] = perSector[name] || {})[k] = { allarmi: eps.length, arrivano: hit, tocchiAvvisati: `${warnedT.length}/${touches.length}` };
  }
  // base: rendimento a 3 mesi di tutte le sedute con la breadth
  const all = (tot.base = tot.base || { ret: [] });
  b.forEach((v, t) => { if (v != null) { const r = forward(px, t, 63); if (r != null) all.ret.push(r); } });
}
const out = {};
for (const [name, T] of Object.entries(tot)) {
  if (name === 'base') continue;
  out[name] = { allarmi: T.eps, arrivanoAlBlu: T.hit, quotaArrivano: +((100 * T.hit) / T.eps).toFixed(0), anticipoMediano: med(T.leads),
    tocchiAvvisati: `${T.warned}/${T.touches}`, etf3mMediano: +med(T.ret).toFixed(1), positivi3m: +((100 * T.ret.filter((r) => r > 0).length) / T.ret.length).toFixed(0), tocchiPersi: T.missed };
}
out.base = { sedute: tot.base.ret.length, etf3mMediano: +med(tot.base.ret).toFixed(1), positivi3m: +((100 * tot.base.ret.filter((r) => r > 0).length) / tot.base.ret.length).toFixed(0) };
for (const [n, o] of Object.entries(out)) console.log(n.padEnd(32), JSON.stringify({ ...o, tocchiPersi: o.tocchiPersi?.length }));
console.log('primo giorno con la breadth:', sec.dates[breadthSeries(br, 'XLK', sec.dates).pct200.findIndex((v) => v != null)]);
fs.writeFileSync(new URL('../avvicinamento_pit.json', import.meta.url), JSON.stringify({ asOf: br.asOf, regole: out, perSettore: perSector }, null, 1) + '\n');
