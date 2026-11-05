// Controllo delle due fonti esterne tra loro (BCE 14:15 CET contro FRED mezzogiorno NY): stessa data e data spostata.
// Uso: node sanita_fonti.mjs <cacheDir>
import fs from 'node:fs'; import path from 'node:path';
const cache = process.argv[2];
function fred(id) { const m = new Map(); for (const l of fs.readFileSync(path.join(cache, 'ext', id + '.csv'), 'utf-8').trim().split('\n').slice(1)) { const [d, v] = l.split(','); if (v && v !== '.' && !isNaN(+v)) m.set(d, +v); } return m; }
function ecb(c) { const L = fs.readFileSync(path.join(cache, 'ext', `ECB_${c}.csv`), 'utf-8').trim().split('\n'); const h = L[0].split(','); const iD = h.indexOf('TIME_PERIOD'), iV = h.indexOf('OBS_VALUE'); const m = new Map(); for (const l of L.slice(1)) { const p = l.split(','); if (p[iV] !== '' && !isNaN(+p[iV])) m.set(p[iD], +p[iV]); } return m; }
const a = ecb('USD'), b = fred('DEXUSEU');
const ds = [...a.keys()].filter((d) => b.has(d) && d >= '2021-11-05').sort();
function corr(lag) { const xs = [], ys = []; for (let i = 2; i < ds.length - 2; i++) { const j = i + lag; xs.push(Math.log(a.get(ds[i]) / a.get(ds[i - 1]))); ys.push(Math.log(b.get(ds[j]) / b.get(ds[j - 1]))); } const n = xs.length, mx = xs.reduce((s, v) => s + v) / n, my = ys.reduce((s, v) => s + v) / n; let p = 0, q = 0, r = 0; for (let i = 0; i < n; i++) { p += (xs[i] - mx) * (ys[i] - my); q += (xs[i] - mx) ** 2; r += (ys[i] - my) ** 2; } return +(p / Math.sqrt(q * r)).toFixed(3); }
console.log(JSON.stringify({ n: ds.length, 'BCE(d) vs FRED(d-1)': corr(-1), 'BCE(d) vs FRED(d)': corr(0), 'BCE(d) vs FRED(d+1)': corr(1) }));
