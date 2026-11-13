// VIX di data/vix.json contro il CSV di FRED scaricato a parte con curl
import fs from 'node:fs';
const W = process.argv[2]; const V = await import(W + '/js/vix.js');
const X = JSON.parse(fs.readFileSync(process.argv[3])); const v = V.vxSeries(X.series.VIX); const spx = new Set(V.vxSeries(X.series.SPX).dates);
const f = new Map(fs.readFileSync(process.argv[4], 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')).filter(([, x]) => x && x !== '.').map(([d, x]) => [d, +x]));
let n = 0, bad = 0; v.dates.forEach((d, i) => { if (d > v.fred) return; n++; if (Math.abs(f.get(d) - v.val[i]) > 1e-9) { bad++; if (bad < 5) console.log('diverso', d, f.get(d), v.val[i]); } });
const lost = [...f.keys()].filter((d) => spx.has(d) && !v.dates.includes(d)).length, holi = [...f.keys()].filter((d) => !spx.has(d) && d <= X.asOf.spx);
console.log(`sedute confrontate ${n}, diverse ${bad}, valori FRED in sedute dell'S&P 500 persi ${lost}, valori FRED in giorni senza seduta (scartati) ${holi.length}: ${holi.join(' ')}`);
