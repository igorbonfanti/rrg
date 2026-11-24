// mutate.mjs — mutazioni mirate in una copia del repository (argomento: cartella della copia): per ognuna sostituisce un
// pezzo di codice, lancia `node --test` e dice se i test se ne accorgono; poi rimette il file com'era.
// Uso: node mutate.mjs <copia>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DIR = process.argv[2];
const M = [
  ['scripts/fetch_emerging.js', 'pickSeries senza il controllo della storia accorciata', "if (prev && prev.d0 && prev.cd && fresh.d0 &&", 'if (false && prev && prev.d0 && prev.cd && fresh.d0 &&'],
  ['scripts/fetch_emerging.js', 'pickSeries: tiene la nuova anche se finisce prima', 'fresh.last < prev.last) return', 'fresh.last < "0") return'],
  ['scripts/fetch_emerging.js', 'splice: data della giunzione duplicata (>= invece di >)', 'if (d > fredLast) {', 'if (d >= fredLast) {'],
  ['scripts/fetch_emerging.js', 'splice: la coda di Yahoo sostituisce anche la parte Fed', 'if (d > fredLast) { dates.push(d); val.push(tail.val[i]); }', 'if (d > "2026-01-01") { const q = dates.indexOf(d); if (q >= 0) val[q] = tail.val[i]; else if (d > fredLast) { dates.push(d); val.push(tail.val[i]); } }'],
  ['scripts/fetch_emerging.js', 'pack: 2 decimali anche sotto 1.000', '< 1000 ? 10000 : 100', '< 1000 ? 100 : 100'],
  ['scripts/fetch_emerging.js', 'soglia dell\'80% portata al 10%', 'got < 0.8 * all.length', 'got < 0.1 * all.length'],
  ['scripts/fetch_emerging.js', 'Yahoo giù: niente coda pubblicata', 'if (p) tail = { dates: p.dates, val: p.val };', ''],
  ['scripts/fetch_emerging.js', 'lastLongGap a 10 giorni', 'export function lastLongGap(dates, maxDays = 35)', 'export function lastLongGap(dates, maxDays = 10)'],
  ['scripts/fetch_emerging.js', 'campo fred non scritto', 'fred: s.fredLast };', '};'],
  ['js/emerging.js', 'cleanFx pulisce anche la parte Fed', 'if (s.fred && s.dates[i] <= s.fred) continue;', ''],
  ['js/emerging.js', 'cleanFx: soglia 3% → 5%', 'thr = tight ? 0.01 : 0.03', 'thr = tight ? 0.01 : 0.05'],
  ['js/emerging.js', 'cleanFx: senza la regola del salto enorme', '(Math.abs(r1 + r2) < back || (m > 5 * thr', '(Math.abs(r1 + r2) < back || (false && m > 5 * thr'],
  ['js/emerging.js', 'z: finestra 63 → 64', '{ w = 63, z = 1, look = 126, sdN = 756, back = 0.5 }', '{ w = 64, z = 1, look = 126, sdN = 756, back = 0.5 }'],
  ['js/emerging.js', 'F: arretramento 0,5 → 0,4 deviazioni', 'back = 0.5 }', 'back = 0.4 }'],
  ['js/emerging.js', 'sd: limite di 3,5 anni tolto', '/ DAY <= 1278', '/ DAY <= 99999'],
  ['js/emerging.js', 'finestre: buco oltre 10 giorni → 20', '/ DAY > 10 ? 1 : 0', '/ DAY > 20 ? 1 : 0'],
  ['js/emerging.js', 'D: media 200 → 150', '{ ma = 200, w = 63 }', '{ ma = 150, w = 63 }'],
  ['js/emerging.js', 'D: senza la condizione «in calo a 63 sedute»', 'S.val[i] < sma[i] && S.val[i] < S.val[i - w]', 'S.val[i] < sma[i]'],
  ['js/emerging.js', 'onDates riempie col giorno prima', 'return dates.map((d) => (m.has(d) ? m.get(d) : null));', 'let p = null; return dates.map((d) => (m.has(d) ? (p = m.get(d)) : p));'],
  ['js/emerging.js', 'inUsd moltiplica', 'c / fx[t]', 'c * fx[t]'],
  ['js/emerging.js', 'change: dall\'ultima riga anche se nulla', 'while (t >= 0 && a[t] == null) t--;\n  return', 'return'],
  ['js/emerging.js', 'relStrength: quadrante con RS-Momentum e RS-Ratio scambiati', 'quadrant(ratio, mom)', 'quadrant(mom, ratio)'],
  ['js/emerging.js', 'fxState: «calo» con z ≥ 0,5', "z >= 1 ? 'calo'", "z >= 0.5 ? 'calo'"],
  ['scripts/check_fresh.js', 'check_fresh: parte Fed fino a 60 giorni', "(Fed)`, at, today, 14]", "(Fed)`, at, today, 60]"],
  ['scripts/check_fresh.js', 'check_fresh: FRED DTWEXEMEGS fino a 7 giorni', "d.emerging.asOf.fred, today, 14]", "d.emerging.asOf.fred, today, 7]"],
  ['scripts/check_fresh.js', 'check_fresh: serie mancanti ignorate', "for (const k of (d.emerging && d.emerging.missing) || [])", 'for (const k of [])'],
  ['scripts/check_fresh.js', 'check_fresh: cambi controllati a 30 giorni', "d.emerging.asOf.fx, B, 4]", "d.emerging.asOf.fx, B, 30]"],
  ['scripts/fetch_data.js', 'parseFredDaily tiene i «.» come 0', "v !== '' && v !== '.' && Number.isFinite(x)", "v !== '' && Number.isFinite(x)"],
];
const rows = [];
for (const [file, what, from, to] of M) {
  const p = path.join(DIR, file), orig = fs.readFileSync(p, 'utf8');
  if (!orig.includes(from)) { rows.push([what, 'testo non trovato']); continue; }
  fs.writeFileSync(p, orig.replace(from, to));
  try {
    const r = spawnSync('node', ['--test'], { cwd: DIR, encoding: 'utf8', timeout: 300000 });
    const fail = /# fail (\d+)/.exec(r.stdout);
    rows.push([what, fail && Number(fail[1]) > 0 ? `presa (${fail[1]} test falliti)` : r.status !== 0 ? `presa (uscita ${r.status})` : 'NON presa']);
  } finally { fs.writeFileSync(p, orig); }
  console.log(rows.at(-1).join(' → '));
}
const caught = rows.filter((r) => r[1].startsWith('presa')).length;
console.log(`\n${caught} mutazioni prese su ${rows.length}`);
