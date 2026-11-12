// Controllo 1.10.0 (testi e codice): i test di test/ath.test.js devono fallire su un athStats/athRows/pickStats sbagliato.
// Copia il repository in una cartella temporanea (senza toccare i file dell'app), applica un mutante alla volta e lancia
// `node --test test/ath.test.js`. Uso: node ricerca/qa/1.10.0/testi-codice/mutanti.mjs [cartella temporanea]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// cartella temporanea: primo argomento, altrimenti quella di sistema
const TMP = fs.mkdtempSync(path.join(process.argv[2] || os.tmpdir(), 'ath-mut-'));
// tutto il repository tranne .git, ricerca e node_modules (scripts/fetch_data.js legge universe.json dalla radice)
for (const d of fs.readdirSync(ROOT)) if (!['.git', 'ricerca', 'node_modules'].includes(d)) fs.cpSync(path.join(ROOT, d), path.join(TMP, d), { recursive: true });

const M = [
  ['js/ath.js', 'parità: ultima data invece della prima', 'if (dates[i] >= from && (iRef < 0 || c > close[iRef])) iRef = i;', 'if (dates[i] >= from && (iRef < 0 || c >= close[iRef])) iRef = i;'],
  ['js/ath.js', 'finestra: il primo giorno escluso (> invece di >=)', 'if (dates[i] >= from && (iRef < 0', 'if (dates[i] > from && (iRef < 0'],
  ['js/ath.js', 'finestra ignorata (massimo di sempre come riferimento)', 'if (dates[i] >= from && (iRef < 0', 'if ((iRef < 0'],
  ['js/ath.js', 'finestra di 2 anni', 'export const YEARS = 3;', 'export const YEARS = 2;'],
  ['js/ath.js', 'finestra di 4 anni', 'export const YEARS = 3;', 'export const YEARS = 4;'],
  ['js/ath.js', 'sotto zero: < 0 invece di <= 0', 'if (c <= 0 && below == null)', 'if (c < 0 && below == null)'],
  ['js/ath.js', 'minimo che include il giorno del massimo', 'for (let i = iRef + 1; i <= iLast; i++) {', 'for (let i = iRef; i <= iLast; i++) {'],
  ['js/ath.js', 'calo calcolato anche con una chiusura sotto zero', 'const lowOk = iLow >= 0 && below == null;', 'const lowOk = iLow >= 0;'],
  ['js/ath.js', '29/02 non corretto', 'if (t.getUTCMonth() !== m - 1) t.setUTCDate(0);', ''],
  ['js/ath.js', 'giorni contati fino all\'ultima riga e non all\'ultima chiusura', 'days: daysBetween(dates[iRef], dates[iLast])', 'days: daysBetween(dates[iRef], dates[n - 1])'],
  ['js/ath.js', 'ultima chiusura nulla non saltata', 'while (iLast >= 0 && close[iLast] == null) iLast--;', ''],
  ['js/ath.js', 'massimo durante la seduta = chiusura', 'const hv = (i) => (high && high[i] != null ? high[i] : close[i]);', 'const hv = (i) => close[i];'],
  ['js/ath.js', 'massimo durante la seduta su tutta la storia', 'for (let i = 0; i <= iLast; i++) if (dates[i] >= from && hv(i) != null', 'for (let i = 0; i <= iLast; i++) if (hv(i) != null'],
  ['js/ath.js', 'massimo di sempre: parità sull\'ultima data', 'if (iAll < 0 || c > close[iAll]) iAll = i;', 'if (iAll < 0 || c >= close[iAll]) iAll = i;'],
  ['js/ath.js', 'risalita dal minimo calcolata rispetto al massimo', 'fromLowPct: lowOk ? pctOf(last, close[iLow]) : null', 'fromLowPct: lowOk ? pctOf(last, ref) : null'],
  ['js/ath.js', 'senza arrotondamento a 2 decimali', 'const pctOf = (v, ref) => r2((v / ref - 1) * 100);', 'const pctOf = (v, ref) => (v / ref - 1) * 100;'],
  ['js/ath.js', 'ordine: mercati senza dati in testa', "return (a.m.stats ? 0 : 1) - (b.m.stats ? 0 : 1) || a.k - b.k;", "return (a.m.stats ? 1 : 0) - (b.m.stats ? 1 : 0) || a.k - b.k;"],
  ['js/ath.js', 'ordine per data rovesciato', "const key = mode === 'date' ? (r) => r.m.stats.refDate : (r) => r.m.stats.distPct;", "const key = mode === 'date' ? (r) => -Date.parse(r.m.stats.refDate) : (r) => r.m.stats.distPct;"],
  ['js/ath.js', 'parità di ordine non stabile (ordine del file rovesciato)', 'return (x < y ? -1 : x > y ? 1 : 0) || a.k - b.k;', 'return (x < y ? -1 : x > y ? 1 : 0) || b.k - a.k;'],
  ['scripts/fetch_ath.js', 'storia accorciata non controllata', 'if (prev && daysBetween(prev.start, fresh.start) > 30)', 'if (prev && daysBetween(prev.start, fresh.start) > 30000)'],
  ['scripts/fetch_ath.js', 'riga più vecchia accettata', 'if (prev && fresh.lastDate < prev.lastDate)', 'if (false && prev && fresh.lastDate < prev.lastDate)'],
  ['scripts/check_fresh.js', 'limite del KOSPI ignorato', 'lim[m.id] || 4]', '4]'],
  ['scripts/check_fresh.js', 'mercato senza dati non segnalato', "m.stats ? m.stats.lastDate : null, B,", "m.stats ? m.stats.lastDate : B, B,"],
];

// controllo di base: senza mutanti i test devono passare, altrimenti ogni «preso» non vale niente
let base = true;
try { execFileSync(process.execPath, ['--test', 'test/ath.test.js'], { cwd: TMP, stdio: 'pipe' }); } catch { base = false; }
console.log(`Base senza mutanti: ${base ? 'passa' : 'FALLISCE'}`);
if (!base) { fs.rmSync(TMP, { recursive: true, force: true }); process.exit(1); }
let killed = 0;
const rows = [];
for (const [file, name, from, to] of M) {
  const f = path.join(TMP, file), orig = fs.readFileSync(path.join(ROOT, file), 'utf-8');
  if (!orig.includes(from)) { rows.push(`| ${name} | ${file} | **mutante non applicabile** |`); continue; }
  fs.writeFileSync(f, orig.replace(from, to));
  let ok = true;
  try { execFileSync(process.execPath, ['--test', 'test/ath.test.js'], { cwd: TMP, stdio: 'pipe' }); } catch { ok = false; }
  fs.writeFileSync(f, orig);
  if (!ok) killed++;
  rows.push(`| ${name} | ${file} | ${ok ? '**SOPRAVVIVE** (i test passano)' : 'preso (i test falliscono)'} |`);
}
console.log('| Mutante | File | Esito |\n|---|---|---|\n' + rows.join('\n'));
console.log(`\n${killed} presi su ${M.length}`);
fs.rmSync(TMP, { recursive: true, force: true });
