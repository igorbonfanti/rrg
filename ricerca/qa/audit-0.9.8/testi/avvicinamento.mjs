// Ricalcolo indipendente delle statistiche dell'Avvicinamento (settori dal 2005, indici)
// Copia di ricerca/qa/audit-0.9.0/testi/avvicinamento.mjs; in più stampa la mediana come la calcola l'app dalla 0.9.1 (media dei due centrali).
import fs from 'node:fs';
import { breadthSeries, approachLevel } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), sec = R('data/sectors.json'), br = R('data/breadth.json');
const cfg = R('config/indices.json').indices;
const IX = { ...R('data/indices.json').series, ...R('data/indices_more.json').series };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const medT = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; }; // mediana dell'app (0.9.1)
const H = 126;
function stats(b, L, A) {
  const touches = []; let above = 0;
  b.forEach((v, t) => { if (v == null) return; if (v <= L) { if (above >= 60) touches.push(t); above = 0; } else above++; });
  const eps = []; let up = 0;
  b.forEach((v, t) => { if (v == null) return; if (v <= A) { if (up >= 20) eps.push(t); up = 0; } else up++; });
  let hit = 0; const leads = [];
  for (const t of eps) { let u = -1; for (let j = t; j < Math.min(b.length, t + H); j++) if (b[j] != null && b[j] <= L) { u = j; break; } if (u >= 0) { hit++; leads.push(u - t); } }
  // anticipo dei tocchi avvisati: dal primo allarme valido prima del tocco
  const warnLeads = [];
  const warned = touches.filter((u) => { const e = eps.filter((t) => t <= u - 5 && u - t <= H); if (e.length) warnLeads.push(u - e[e.length - 1]); return e.length > 0; }).length;
  return { eps: eps.length, hit, leads, touches: touches.length, warned, warnLeads };
}
function run(label, list) {
  for (const rule of ['fisso+10', 'velocita']) {
    const T = { eps: 0, hit: 0, leads: [], touches: 0, warned: 0, warnLeads: [] };
    for (const { b, L } of list) {
      const A = rule === 'fisso+10' ? L + 10 : approachLevel(b, L);
      if (A == null) continue;
      const s = stats(b, L, A);
      T.eps += s.eps; T.hit += s.hit; T.leads.push(...s.leads); T.touches += s.touches; T.warned += s.warned; T.warnLeads.push(...s.warnLeads);
    }
    console.log(`${label} ${rule}: allarmi ${T.eps}, arrivano ${T.hit} (${(100 * T.hit / T.eps).toFixed(1)}%), anticipo mediano allarmi arrivati ${med(T.leads)} sedute (mediana dell'app ${medT(T.leads)}), tocchi avvisati ${T.warned}/${T.touches}, anticipo mediano dei tocchi avvisati (ultimo allarme) ${med(T.warnLeads)}`);
  }
}
const S = Object.keys(th.blue).map((k) => { const B = breadthSeries(br, k, sec.dates); return { k, b: B.pct200, L: th.blue[k] }; });
const first = S.map(({ k, b }) => sec.dates[b.findIndex((v) => v != null)]);
console.log('settori: prima breadth', [...new Set(first)].join(','), 'ultima', sec.dates.at(-1));
run('SETTORI (11, dal 2005)', S);
const I = Object.keys(cfg).map((k) => { const X = indexSeries(IX[k]); return { k, b: X.pct200, L: cfg[k].blue, d: X.dates[X.pct200.findIndex((v) => v != null)] }; });
run('INDICI (22)', I);
run('INDICI solo main (data/indices.json, 10)', I.filter((x) => cfg[x.k].main));
console.log('prima breadth degli indici:', I.map((x) => `${x.k} ${x.d}`).join(' · '));
console.log('min prima data indici', I.map((x) => x.d).sort()[0]);
