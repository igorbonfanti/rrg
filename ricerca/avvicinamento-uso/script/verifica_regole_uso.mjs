// Ricalcolo separato delle due regole d'uso di casi_varianti.mjs (scritto a parte): (1) alla terza seduta dall'ingresso in
// avvicinamento, dove si trova il settore (Attenzione / ancora in avvicinamento / tornato sopra la soglia) e quanti episodi
// toccano il livello blu entro 126 sedute dall'ingresso; (2) ingressi con o senza un tocco del livello nelle 126 sedute prima.
// Ingresso: prima seduta in avvicinamento dopo almeno 20 sedute senza, dalla prima seduta con uno stato. Episodi senza
// 126 sedute successive esclusi. Uso: node ricerca/avvicinamento-uso/script/verifica_regole_uso.mjs
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachLevel, DEFAULT_PARAMS } from '../../../js/signals.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params }, sec = R('data/sectors.json'), br = R('data/breadth.json');
const g = {}, add = (k, hit, half) => { for (const key of [k, `${k} ${half}`]) { g[key] = g[key] || [0, 0]; g[key][1]++; if (hit) g[key][0]++; } };
for (const k of Object.keys(th.blue)) {
  const Bz = breadthSeries(br, k, sec.dates), b = Bz.pct200, L = th.blue[k], m = runMachine(priceSeries(sec.adjclose[k]), Bz, L, P), N = b.length;
  const start = m.days.findIndex((d) => d != null);
  const st = []; let cur = 'normal'; for (let t = 0; t < N; t++) { if (m.days[t] != null) cur = m.days[t]; st.push(cur); }
  const on = b.map((v, t) => { if (t < start || v == null || st[t] !== 'normal') return false; const A = approachLevel(b.slice(0, t + 1), L); return A != null && v <= A; });
  let off = 0;
  for (let t = start; t < N; t++) {
    if (b[t] == null) continue;
    if (!on[t]) { off++; continue; }
    const entry = off >= 20; off = 0;
    if (!entry || t + 126 >= N) continue;
    let hit = false; for (let j = t; j < t + 126; j++) if (b[j] != null && b[j] <= L) { hit = true; break; }
    const half = sec.dates[t] < '2016' ? '2005-2015' : '2016-oggi';
    const t3 = t + 2, where = st[t3] === 'watch' ? 'terza seduta: Attenzione' : on[t3] ? 'terza seduta: ancora in avvicinamento' : st[t3] === 'normal' ? 'terza seduta: tornato sopra la soglia' : `terza seduta: ${st[t3]}`;
    add(where, hit, half);
    let recent = false; for (let j = Math.max(0, t - 126); j < t; j++) if (b[j] != null && b[j] <= L) { recent = true; break; }
    add(recent ? 'tocco nelle 126 sedute prima' : 'nessun tocco nelle 126 sedute prima', hit, half);
  }
}
for (const [k, [a, n]] of Object.entries(g).sort()) console.log(k.padEnd(52), `${a}/${n}`.padStart(7), `${Math.round(100 * a / n)}%`.padStart(5));
