// Controllo indipendente 1.6.0 (numeri): lettura delle fonti scaricate in src/ e calcoli scritti da zero.
// Non importa niente da js/ né da scripts/ dell'app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SRC = process.env.SRC || path.join(HERE, 'src');
const rd = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

export function fredCsv(f) { // observation_date,VALUE ; "." o vuoto = manca
  const m = new Map();
  for (const l of rd(f).trim().split('\n').slice(1)) { const [d, v] = l.split(','); const x = parseFloat(v); if (Number.isFinite(x)) m.set(d, x); }
  return m;
}
export function cboeCsv(f) { // DATE MM/DD/YYYY, ..., CLOSE
  const L = rd(f).trim().split(/\r?\n/), h = L[0].split(',').map((s) => s.trim().toUpperCase()), iD = h.indexOf('DATE'), iC = h.indexOf('CLOSE');
  const m = new Map();
  for (const l of L.slice(1)) { const a = l.split(','); const [mm, dd, yy] = a[iD].split('/'); const x = parseFloat(a[iC]); if (Number.isFinite(x)) m.set(`${yy}-${mm}-${dd}`, x); }
  return m;
}
const nyDate = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts * 1000));
export function yahoo(f, field = 'close') { // Map data NY -> valore
  const r = JSON.parse(rd(f)).chart.result[0];
  const arr = field === 'adjclose' ? r.indicators.adjclose[0].adjclose : r.indicators.quote[0][field];
  const m = new Map();
  r.timestamp.forEach((t, i) => { const v = arr[i]; if (v != null && v > 0) m.set(nyDate(t), v); });
  return m;
}
// formato del file dell'app: d0 + gaps (giorni in base 36) ; cd differenze intere / ps
export function decodeFile(x) {
  const dates = [x.d0]; let t = Date.parse(x.d0 + 'T00:00:00Z');
  for (const c of x.gaps) { t += parseInt(c, 36) * 86400000; dates.push(new Date(t).toISOString().slice(0, 10)); }
  let acc = null; const val = x.cd.map((r) => { if (r == null) { acc = null; return null; } acc = acc == null ? r : acc + r; return acc / (x.ps || 1); });
  return { dates, val };
}
// percentile: quota dei valori della storia fino a oggi (compreso) <= valore di oggi; null se meno di minN valori
export function pctAt(hist, minN) {
  const v = hist.filter((x) => x != null); if (v.length < minN) return null;
  const x = v[v.length - 1]; let c = 0; for (const y of v) if (y <= x) c++;
  return 100 * c / v.length;
}
// distanza % dal massimo delle ultime w osservazioni non nulle (oggi compreso)
export function ddAt(vals, w = 252) {
  const v = vals.filter((x) => x != null); if (v.length < w) return null;
  const win = v.slice(-w); return (win[w - 1] / Math.max(...win) - 1) * 100;
}
export function chAt(vals, h = 21) {
  const v = vals.filter((x) => x != null); if (v.length <= h) return null;
  return (v[v.length - 1] / v[v.length - 1 - h] - 1) * 100;
}
