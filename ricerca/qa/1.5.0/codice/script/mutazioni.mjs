// Mutazioni mirate (una alla volta) su una copia: i test le colgono?
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const M = process.argv[2];
const muts = [
  ['js/vix.js', 'export const ENTRY = 1;', 'export const ENTRY = 0;', 'ingresso la stessa seduta'],
  ['js/vix.js', 'export const QUIET = 63;', 'export const QUIET = 62;', 'quiete 62'],
  ['js/vix.js', 'for (let k = j - Q; k < j; k++) if (v[k] >= X)', 'for (let k = j - Q; k < j; k++) if (v[k] > X)', 'quiete con > invece di >='],
  ['js/vix.js', 'if (v[j] < X) continue;', 'if (v[j] <= X) continue;', 'soglia stretta'],
  ['js/vix.js', 'o.dd = Math.min(0, (mn / close[e] - 1) * 100);', 'o.dd = (mn / close[e] - 1) * 100;', 'calo senza min(0)'],
  ['js/vix.js', 'const end = Math.min(n - 1, e + 252);', 'const end = Math.min(n - 1, e + 251);', 'finestra del calo 251'],
  ['js/vix.js', 'return lo + 1 < v.length ? v[lo] + (h - lo) * (v[lo + 1] - v[lo]) : v[lo];', 'return v[lo];', 'quantile senza interpolazione'],
  ['js/vix.js', 'const posN = v.filter((x) => x > 0).length;', 'const posN = v.filter((x) => x >= 0).length;', 'positivi con >='],
  ['js/vix.js', '(s2 - w * m * m) / (w - 1)', '(s2 - w * m * m) / w', 'deviazione standard di popolazione'],
  ['js/vix.js', 'Math.sqrt(252) * 100', 'Math.sqrt(250) * 100', 'annualizzazione 250'],
  ['js/vix.js', 'if (seen[m] <= x) lo = m + 1;', 'if (seen[m] < x) lo = m + 1;', 'percentile con < (pari esclusi)'],
  ['js/vix.js', 'provisional: !!(A.fred && A.dates[t] > A.fred)', 'provisional: !!(A.fred && A.dates[t] >= A.fred)', 'provvisorio con >='],
  ['js/vix.js', 'A.dates.forEach((d, i) => { if (d >= from) ps.push(i); });', 'A.dates.forEach((d, i) => { if (d > from) ps.push(i); });', 'base senza la prima seduta'],
  ['js/vix.js', 'if (v == null || v < X || p + entry + h >= A.close.length) return;', 'if (v == null || v < X || p + entry + h > A.close.length) return;', 'scatter fuori di uno'],
  ['js/vix.js', 'vix: ix.dates.map((d) => (m.has(d) ? m.get(d) : null))', 'vix: (() => { let l = null; return ix.dates.map((d) => (m.has(d) ? (l = m.get(d)) : l)); })()', 'VIX mancante riempito con il precedente'],
  ['js/vix.js', 'for (let k = j; k < stop; k++) if (v[k] >= X) { last = k; if (v[k] > mx) mx = v[k]; }', 'for (let k = j; k < stop; k++) if (v[k] >= X) { last = k; }', 'VIX massimo non calcolato'],
  ['js/vix.js', 'export const ROBUST = [40];', 'export const ROBUST = [30, 40];', 'robusto anche il 30'],
  ['js/vix.js', 'worst: full.length ? Math.min(...full.map((e) => e.dd)) : null', 'worst: full.length ? Math.max(...full.map((e) => e.dd)) : null', 'calo peggiore = massimo'],
  ['js/vix.js', "partial: e + 252 >= n", "partial: e + 252 > n", 'parziale fuori di uno'],
  ['js/vix.js', 's.toMin = quantile(full.map((e) => e.toMin), 0.5);', 's.toMin = quantile(full.map((e) => e.toMin), 0.6);', 'sedute al minimo non mediana'],
  ['js/vix.js', 'export const bandOf = (v) => (v == null ? null : BANDS.find(([a, b]) => v >= a && v < b));', 'export const bandOf = (v) => (v == null ? null : BANDS.find(([a, b]) => v > a && v <= b));', 'fasce chiuse a destra'],
  ['js/vix.js', "['2020 Covid', '2020-02-01', '2020-12-31']", "['2020 Covid', '2020-03-01', '2020-12-31']", 'crisi Covid spostata'],
  ['js/vix.js', 'for (const h of HS) o.ret[h] = e + h < n ? (close[e + h] / close[e] - 1) * 100 : null;', 'for (const h of HS) o.ret[h] = e + h < n ? (close[e + h] / close[p] - 1) * 100 : null;', 'rendimento dalla seduta del segnale'],
  ['js/vix.js', "const dds = ps.filter((p) => p + entry + 252 < A.close.length)", "const dds = ps.filter((p) => p + entry + 200 < A.close.length)", 'base del calo con finestre incomplete'],
  ['scripts/fetch_vix.js', 'if (ok.has(d) && s.val[i] > 0)', 'if (s.val[i] > 0)', 'VIX anche nei giorni di borsa chiusa'],
  ['scripts/fetch_vix.js', 'if (ok.has(d) && s.val[i] > 0)', 'if (ok.has(d))', 'VIX zero tenuto'],
  ['scripts/fetch_vix.js', "tail = onSessions(tail, spx.dates);", "", 'coda di Yahoo senza filtro delle sedute (main)'],
  ['scripts/fetch_vix.js', "if (p) tail = { dates: p.dates, val: p.val };", "", 'senza la coda pubblicata se Yahoo cade (main)'],
  ['scripts/fetch_vix.js', "if (dates.length < 5000)", "if (dates.length < 50)", 'controllo della storia dell\'indice (main)'],
  ['scripts/check_fresh.js', "d.vix.asOf.fred, today, 6]", "d.vix.asOf.fred, today, 60]", 'FRED 60 giorni'],
  ['scripts/check_fresh.js', "d.vix.asOf.vix, B, 4]", "d.vix.asOf.vix, B, 40]", 'VIX 40 giorni'],
  ['scripts/check_fresh.js', "d.vix.asOf.ndx, B, 4]", "d.vix.asOf.ndx, B, 40]", 'NDX 40 giorni'],
  ['scripts/check_fresh.js', "d.vix.asOf.spx, B, 4]", "d.vix.asOf.spx, B, 40]", 'SPX 40 giorni'],
  ['scripts/check_fresh.js', "if (d.vix !== undefined) {", "if (d.vix) {", 'file illeggibile non segnalato'],
  ['scripts/check_fresh.js', "vix: read('vix.json') || undefined,", "vix: undefined,", 'check_fresh non legge vix.json (main)'],
];
let caught = 0;
for (const [f, a, b, what] of muts) {
  const p = `${M}/${f}`, orig = fs.readFileSync(p, 'utf8');
  if (!orig.includes(a)) { console.log(`?? testo non trovato: ${what}`); continue; }
  fs.writeFileSync(p, orig.replace(a, b));
  let ok;
  try { execFileSync('node', ['--test', 'test/vix.test.js', 'test/pipeline.test.js'], { cwd: M, stdio: 'pipe' }); ok = false; } catch { ok = true; }
  fs.writeFileSync(p, orig);
  if (ok) caught++;
  console.log(`${ok ? 'COLTA   ' : 'NON COLTA'} ${f}: ${what}`);
}
console.log(`${caught} colte su ${muts.length}`);
