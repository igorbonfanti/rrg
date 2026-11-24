// Ricontrollo separato (22/11/2026) della coppia rame → petrolio ai massimi di ricerca/cicli/lead-lag/: massimi di ciclo
// con js/peaks.js (cyclePeaks), petrolio senza la chiusura negativa del 20/04/2020, casi di A dal 2000 al 20/11/2025 con B
// osservabile da 365 giorni prima, B più vicino entro ±365 giorni (a pari distanza quello prima), «dopo» = almeno 1 giorno.
// Uso: node ricerca/cicli/ricontrollo/rame-petrolio.mjs
import fs from 'node:fs';
import { cyclePeaks, clean, addDays, dayDiff } from '../../../js/peaks.js';
const S0 = JSON.parse(fs.readFileSync(new URL('../../rotazione-bolle/cache/serie.json', import.meta.url)));
const ser = (id) => { const s = clean(S0[id].dates, S0[id].close); if (id === 'WTI') { const k = s.close.map((c, i) => c > 0 ? i : -1).filter((i) => i >= 0); return { dates: k.map((i) => s.dates[i]), close: k.map((i) => s.close[i]) }; } return s; };
for (const [A, B] of [['COPPER', 'WTI'], ['WTI', 'COPPER']]) for (const X of [15, 20, 30]) {
  const a = cyclePeaks(ser(A), X), sb = ser(B), b = cyclePeaks(sb, X), b0 = addDays(sb.dates[0], 365);
  const cases = [];
  for (const p of a) {
    if (p.date < '2000-01-01' || p.date > '2025-11-20' || addDays(p.date, -365) < b0) continue;
    let best = null;
    for (const q of b) { const d = dayDiff(p.date, q.date); if (Math.abs(d) <= 365 && (!best || Math.abs(d) < Math.abs(best.d) || (Math.abs(d) === Math.abs(best.d) && d < best.d))) best = { d, q: q.date }; }
    if (best) cases.push({ a: p.date, b: best.q, d: best.d });
  }
  const after = cases.filter((c) => c.d >= 1).length, ds = cases.map((c) => c.d).sort((x, y) => x - y), n = ds.length;
  const med = n ? (n % 2 ? ds[(n - 1) / 2] : (ds[n / 2 - 1] + ds[n / 2]) / 2) : null;
  const h1 = cases.filter((c) => c.a <= '2012-12-31'), h2 = cases.filter((c) => c.a >= '2013-01-01');
  console.log(`${A}→${B} ${X}%: dopo ${after} su ${n}, mediana ${med} g; 2000-2012 ${h1.filter((c) => c.d >= 1).length}/${h1.length}, 2013- ${h2.filter((c) => c.d >= 1).length}/${h2.length}`);
  if (X === 15 && A === 'COPPER') console.log('  ' + cases.map((c) => `${c.a}→${c.b} (${c.d > 0 ? '+' : ''}${c.d})`).join(', '));
}
