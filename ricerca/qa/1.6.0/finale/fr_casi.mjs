// Controllo finale 1.6.0: la funzione fr di js/vix-view.js (estratta dal sorgente, non riscritta) su tutte le sedute
// vere con VIX/VIX3M vicino a 1, più casi costruiti. Attese: sotto 1 mai «1,000», e il numero scritto è il troncamento
// esatto a 3 decimali (calcolato in decimale sulle stringhe dei valori, non in virgola mobile).
// Uso: node ricerca/qa/1.6.0/finale/fr_casi.mjs [radice del sito]
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.argv[2] || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const { fmt } = await import(path.join(ROOT, 'js/format.js'));
const { decodeDates, deltaDecode } = await import(path.join(ROOT, 'js/indexdata.js'));
const src = fs.readFileSync(path.join(ROOT, 'js/vix-view.js'), 'utf8');
const line = src.split('\n').find((l) => /const fr = \(r\) =>/.test(l));
const fr = new Function('fmt', line.replace(/\/\/.*$/, '').replace('const fr =', 'return'))(fmt);
console.log('fr:', line.trim());
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vix.json'), 'utf8'));
const ser = (k) => { const s = D.series[k]; const d = decodeDates(s.d0, s.gaps), v = deltaDecode(s.cd, s.ps || 1); return new Map(d.map((x, i) => [x, v[i]])); };
const V = ser('VIX'), V3 = ser('VIX3M');
// troncamento esatto: r = a/b con a, b a 2 decimali -> interi in centesimi
const trunc3 = (a, b) => { const A = BigInt(Math.round(a * 100)), B = BigInt(Math.round(b * 100)); const q = (A * 1000n) / B; return (Number(q) / 1000).toFixed(3).replace('.', ','); };
let n = 0, bad = [], below = 0, wrote1000 = 0;
for (const [d, a] of V) {
  const b = V3.get(d); if (!(b > 0)) continue;
  const r = a / b; if (Math.abs(r - 1) >= 0.005) continue;
  n++; const s = fr(r);
  if (r < 1) { below++; if (s === '1,000') wrote1000++; const t = trunc3(a, b); if (s !== t) bad.push({ d, a, b, r, scritto: s, atteso: t }); }
  else if (r >= 1 && !s.startsWith('1,00')) bad.push({ d, r, scritto: s });
}
console.log(`sedute vere con |R-1| < 0,005: ${n}; sotto 1: ${below}; sotto 1 scritte «1,000»: ${wrote1000}; diverse dal troncamento esatto: ${bad.length}`);
for (const x of bad.slice(0, 20)) console.log('  ', JSON.stringify(x));
for (const d of ['2009-02-06', '2018-02-21', '2018-12-04', '2015-09-17']) console.log(`  ${d}: R ${(V.get(d) / V3.get(d)).toFixed(6)} -> «${fr(V.get(d) / V3.get(d))}»`);
// casi costruiti: [vix, vix3m]
const cases = [[24.95, 25], [19.98, 20], [29.97, 30], [9.99, 10], [25.63, 25.64], [25.64, 25.65], [17.99, 18], [25, 25], [25.01, 25], [24.87, 25], [24.88, 25]];
let cbad = 0;
for (const [a, b] of cases) { const r = a / b, s = fr(r), t = Math.abs(r - 1) < 0.005 ? (r < 1 ? trunc3(a, b) : null) : null; const okk = t == null || s === t; if (!okk) cbad++; console.log(`  ${a}/${b} = ${r} -> «${s}»${t ? ` (atteso ${t})` : ''}${okk ? '' : '  <-- DIVERSO'}`); }
console.log(`casi costruiti diversi dall'atteso: ${cbad}`);
