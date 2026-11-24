// Numeri dei testi nuovi della 1.6.0, ricalcolati dalle fonti in src/ (senza js/ dell'app). Uso: node testi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { HERE, SRC, fredCsv, cboeCsv, yahoo } from './lib.mjs';
const RC = JSON.parse(fs.readFileSync(path.join(HERE, 'ricalcolo.json'), 'utf8')).series;
const gspc = [...yahoo('y_%5EGSPC.json').keys()].sort();
const fr = fredCsv('VIXCLS.csv'), cb = cboeCsv('VIX_History.csv'), f3 = fredCsv('VXVCLS.csv'), c3 = cboeCsv('VIX3M_History.csv');

// 1) «dal 2008 tutti gli episodi sopra 30 erano già in backwardation» (episodio: prima chiusura ≥ X dopo 63 sedute < X)
const vix = gspc.map((d) => (fr.has(d) ? fr.get(d) : d > [...fr.keys()].at(-1) ? cb.get(d) ?? null : null));
for (const X of [20, 25, 30, 40, 50]) {
  const pos = vix.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0), v = pos.map((i) => vix[i]), eps = [];
  for (let j = 63; j < v.length; j++) { if (v[j] < X) continue; if (v.slice(j - 63, j).every((x) => x < X)) eps.push(gspc[pos[j]]); }
  const since = eps.filter((d) => d >= '2008-01-01'), back = since.filter((d) => RC[d].r >= 1);
  const since07 = eps.filter((d) => d >= '2007-12-04');
  console.log(`VIX ≥ ${X}: episodi dal 2008 ${since.length}, in backwardation al segnale ${back.length}; senza: ${since.filter((d) => !(RC[d].r >= 1)).map((d) => `${d} (R ${RC[d].r.toFixed(3)})`).join(', ') || '—'}; dal 04/12/2007: ${since07.length}`);
}
// sedute (non episodi) con VIX ≥ 30 e R < 1 dal 2008
const s30 = gspc.filter((d, i) => d >= '2008-01-01' && vix[i] != null && vix[i] >= 30);
const s30c = s30.filter((d) => RC[d].r < 1);
console.log(`sedute con VIX ≥ 30 dal 2008: ${s30.length}, di cui in contango ${s30c.length} (${(100 * s30c.length / s30.length).toFixed(1)}%)`);
const s30x = gspc.filter((d, i) => d >= '2008-01-01' && vix[i] != null && vix[i] > 30);
console.log(`episodi con VIX > 30 stretto (prima chiusura > 30 dopo 63 sedute ≤ 30):`);
{
  const pos = vix.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0), v = pos.map((i) => vix[i]), eps = [];
  for (let j = 63; j < v.length; j++) { if (!(v[j] > 30)) continue; if (v.slice(j - 63, j).every((x) => x <= 30)) eps.push(gspc[pos[j]]); }
  const since = eps.filter((d) => d >= '2008-01-01');
  console.log(`  ${since.length} episodi, in backwardation ${since.filter((d) => RC[d].r >= 1).length}`);
}

// 2) «2008: −41%, 2020: −29%»: minimo della distanza dal massimo di 12 mesi per anno
for (const y of ['2008', '2009', '2011', '2015', '2016', '2018', '2020', '2022', '2025']) {
  const e = Object.entries(RC).filter(([d, x]) => d.startsWith(y) && x.dd != null).sort((a, b) => a[1].dd - b[1].dd)[0];
  console.log(`credito ${y}: minimo ${e[1].dd.toFixed(2)}% il ${e[0]}`);
}

// 3) «FRED e Cboe coincidono in 4.310 date su 4.310» (VIX3M) e «0 differenze su 9.309 sedute» (VIX)
const cmp = (a, b) => { let n = 0, d = 0; for (const [k, v] of a) if (b.has(k)) { n++; if (Math.abs(v - b.get(k)) > 0.005) d++; } return [n, d]; };
console.log('VIX3M FRED/Cboe date comuni, differenze:', cmp(f3, c3), '— fino al 05/11/2026 (ultima di FRED)');
console.log('VIX FRED/Cboe date comuni, differenze:', cmp(fr, cb));
const frS = new Map([...fr].filter(([d]) => d <= '2026-11-05')), cbS = new Map([...cb].filter(([d]) => d <= '2026-11-05'));
console.log('VIX FRED/Cboe solo nelle sedute (date comuni, differenze):', cmp(new Map([...frS].filter(([d]) => gspc.includes(d) || d < gspc[0])), cbS));

// 4) «Yahoo da solo ha errori (06/02/2026: VIX 20,37 contro 17,76 di Cboe)»
const yv = yahoo('y_%5EVIX.json');
console.log('06/02/2026: Yahoo ^VIX', yv.get('2026-02-06'), 'Cboe', cb.get('2026-02-06'), 'FRED', fr.get('2026-02-06'));
let yd = 0, yn = 0; for (const [d, v] of yv) if (cb.has(d) && d >= '2016-01-01') { yn++; if (Math.abs(v - cb.get(d)) > 0.011) yd++; }
console.log(`Yahoo ^VIX contro Cboe dal 2016: ${yd} differenze oltre 0,01 su ${yn}`);
const y3 = yahoo('y_%5EVIX3M.json'); let z = 0, zn = 0; for (const [d, v] of y3) if (c3.has(d) && d >= '2016-01-01') { zn++; if (Math.abs(v - c3.get(d)) > 0.011) z++; }
console.log(`Yahoo ^VIX3M contro Cboe dal 2016: ${z} differenze oltre 0,01 su ${zn}`);

// 5) HY OAS su FRED «solo 3 anni» (scarico a parte in src/BAMLH0A0HYM2.csv se c'è)
const oas = path.join(SRC, 'BAMLH0A0HYM2.csv');
if (fs.existsSync(oas)) { const m = fredCsv('BAMLH0A0HYM2.csv'); const k = [...m.keys()].sort(); console.log('HY OAS FRED:', k[0], '→', k.at(-1), m.size, 'valori'); }
