// Controllo indipendente dei dati dei grafici della vista 8 (1.4.0): decodifica i file senza il codice dell'app (tranne F/z
// e la forza relativa, presi da js/emerging.js e confrontati solo come segni), calcola le date attese e scrive atteso.json.
// Uso: node ricerca/qa/1.4.0/grafici/dati.mjs [cartella_dati]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../..');
const D = process.argv[2] || path.join(root, 'data');
const J = (f) => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const CFG = JSON.parse(fs.readFileSync(path.join(root, 'config/emerging.json'), 'utf8'));
const DAY = 86400000;
const dec = (d0, gaps) => { const o = [d0]; let t = Date.parse(d0); for (const c of gaps) { t += parseInt(c, 36) * DAY; o.push(new Date(t).toISOString().slice(0, 10)); } return o; };
const dd = (a, s) => { let p = null; return a.map((r) => (r == null ? (p = null) : ((p = p == null ? r : p + r), p / s))); };
const rle = (r, n) => { const o = new Array(n).fill(null); r.forEach(([i0, v], k) => { const i1 = k + 1 < r.length ? r[k + 1][0] : n; for (let i = i0; i < i1 && i < n; i++) o[i] = v; }); return o; };
const E = J('emerging.json'), IX = { ...J('indices.json').series, ...J('indices_more.json').series };
const ser = (x) => ({ dates: dec(x.d0, x.gaps), val: dd(x.cd, x.ps || 1) });
const out = { asOf: E.asOf, idx: {}, fx: {}, dl: null };
// buchi nelle serie
const gaps = (dates, lim) => { const g = []; for (let i = 1; i < dates.length; i++) { const k = (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / DAY; if (k > lim) g.push([dates[i - 1], dates[i], k]); } return g; };
for (const k of CFG.order) {
  const x = IX[k]; const dates = dec(x.d0, x.gaps), close = dd(x.cd, x.ps || 100);
  const a200 = dd(x.d200, 1), n = rle(x.n, a200.length);
  const pct = new Array(dates.length).fill(null);
  a200.forEach((v, i) => { const j = x.b0 + i; if (j < dates.length && v != null && n[i]) pct[j] = (100 * v) / n[i]; });
  out.idx[k] = { dates, close, pct, nullClose: close.filter((v) => v == null).length, gaps: gaps(dates, 10) };
}
for (const [k, c] of Object.entries(CFG.indices)) if (c.fx) { const s = ser(E.series[c.fx]); out.fx[k] = { ...s, gaps: gaps(s.dates, 10) }; }
const dl = ser(E.series[CFG.fred]);
// D indipendente: sotto la media semplice a 200 sedute e sotto il valore di 63 sedute prima (finestre senza buchi > 10 giorni)
const brk = [0]; for (let i = 1; i < dl.dates.length; i++) brk.push(brk[i - 1] + ((Date.parse(dl.dates[i]) - Date.parse(dl.dates[i - 1])) / DAY > 10 ? 1 : 0));
const sma = dl.val.map((_, i) => { if (i < 199 || brk[i] !== brk[i - 199]) return null; let s = 0; for (let k = i - 199; k <= i; k++) s += dl.val[k]; return s / 200; });
const Dv = dl.val.map((v, i) => (sma[i] == null || i < 63 || brk[i] !== brk[i - 63] ? null : v < sma[i] && v < dl.val[i - 63] ? 1 : 0));
out.dl = { ...dl, sma, D: Dv, gaps: gaps(dl.dates, 10) };
fs.writeFileSync(path.join(here, 'atteso.json'), JSON.stringify(out));
// riassunto
for (const [k, v] of Object.entries(out.idx)) console.log(k, v.dates[0], '→', v.dates.at(-1), 'chiusure null', v.nullClose, 'buchi>10g', v.gaps.length, v.gaps.slice(0, 3).map((g) => g.join(' ')).join(' | '));
for (const [k, v] of Object.entries(out.fx)) console.log('fx', k, v.dates[0], '→', v.dates.at(-1), 'buchi>10g', v.gaps.length, v.gaps.map((g) => g.join(' ')).join(' | '));
console.log('DTWEXEMEGS', dl.dates[0], '→', dl.dates.at(-1), 'buchi>10g', out.dl.gaps.length, out.dl.gaps.map((g) => g.join(' ')).join(' | '));
