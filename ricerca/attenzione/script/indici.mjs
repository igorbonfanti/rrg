// Stessa prova della fascia di avvicinamento sugli indici della pagina 6
import fs from 'node:fs';
import { approachLevel, forward } from '/home/user/rrg/js/signals.js';
import { indexSeries } from '/home/user/rrg/js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync('/home/user/rrg/' + f));
const cfg = R('config/indices.json').indices, IX = R('data/indices.json').series;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const H = 126, tot = {};
const rows = [];
for (const k of Object.keys(cfg)) {
  const X = indexSeries(IX[k]), b = X.pct200, L = cfg[k].blue;
  const touches = []; let above = 0;
  b.forEach((v, t) => { if (v == null) return; if (v <= L) { if (above >= 60) touches.push(t); above = 0; } else above++; });
  for (const [name, A] of [['fisso +10', L + 10], ['velocità 10 sedute', approachLevel(b, L)]]) {
    const eps = []; let up = 0;
    b.forEach((v, t) => { if (v == null) return; if (v <= A) { if (up >= 20) eps.push(t); up = 0; } else up++; });
    let hit = 0; const leads = [];
    for (const t of eps) { let u = -1; for (let j = t; j < Math.min(b.length, t + H); j++) if (b[j] != null && b[j] <= L) { u = j; break; } if (u >= 0) { hit++; leads.push(u - t); } }
    const warned = touches.filter((u) => eps.some((t) => t <= u - 5 && u - t <= H)).length;
    const T = (tot[name] = tot[name] || { eps: 0, hit: 0, leads: [], touches: 0, warned: 0 });
    T.eps += eps.length; T.hit += hit; T.leads.push(...leads); T.touches += touches.length; T.warned += warned;
    if (name.startsWith('vel')) { const now = b.filter((v) => v != null).at(-1); rows.push(`${k.padEnd(8)} blu ${String(L).padStart(2)} · soglia ${A.toFixed(0).padStart(2)} · oggi ${now.toFixed(0).padStart(2)}${now <= A && now > L + 10 ? '  ← avvicinamento' : now <= L + 10 && now > L ? '  ← attenzione' : now <= L ? '  ← sotto il livello' : ''}`); }
  }
}
for (const [n, T] of Object.entries(tot)) console.log(n.padEnd(20), `allarmi ${T.eps}`, `arrivano ${Math.round((100 * T.hit) / T.eps)}%`, `anticipo ${med(T.leads)} sedute`, `tocchi avvisati ${T.warned}/${T.touches}`);
console.log(rows.join('\n'));
