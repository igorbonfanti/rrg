// Mutazioni mirate del codice nuovo: per ognuna una copia del commit, una sostituzione esatta, `npm test`.
// «colta» = almeno un test fallisce. Uso: node mutazioni.mjs <worktree> <cartella di lavoro>
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
const [W, TMP] = process.argv.slice(2);
const M = [
  ['js/emerging.js', "F ? 'ferma' : z >= 1 ? 'calo'", "F ? 'ferma' : z >= 1.5 ? 'calo'", 'soglia di «in calo forte» 1 → 1,5'],
  ['js/emerging.js', "sdN = 756, back = 0.5 } = {}) {\n  const n", "sdN = 756, back = 0.3 } = {}) {\n  const n", 'F: distanza dal massimo 0,5 → 0,3 sd'],
  ['js/emerging.js', "{ w = 63, z = 1, look = 126", "{ w = 63, z = 1.5, look = 126", 'F: soglia z 1 → 1,5'],
  ['js/emerging.js', "{ w = 63, z = 1, look = 126, sdN = 756", "{ w = 63, z = 1, look = 63, sdN = 756", 'F: ultime 126 → 63 sedute'],
  ['js/emerging.js', "look = 126, sdN = 756,", "look = 126, sdN = 500,", 'deviazione standard su 756 → 500 sedute'],
  ['js/emerging.js', "{ w = 63, z = 1, look", "{ w = 42, z = 1, look", 'variazione del cambio a 63 → 42 sedute'],
  ['js/emerging.js', "S.val[i] < sma[i] && S.val[i] < S.val[i - w]", "S.val[i] > sma[i] && S.val[i] < S.val[i - w]", 'D: sotto la media → sopra'],
  ['js/emerging.js', "S.val[i] < sma[i] && S.val[i] < S.val[i - w]", "S.val[i] < sma[i]", 'D: senza la condizione «in calo a 63 sedute»'],
  ['js/emerging.js', "{ ma = 200, w = 63 }", "{ ma = 100, w = 63 }", 'D: media 200 → 100'],
  ['js/emerging.js', "thr = tight ? 0.01 : 0.03", "thr = tight ? 0.01 : 0.05", 'pulizia: soglia 3% → 5%'],
  ['js/emerging.js', "back = tight ? 0.003 : 0.01", "back = tight ? 0.01 : 0.01", 'pulizia CNY/HKD: rientro 0,3% → 1%'],
  ['js/emerging.js', "/ DAY > 10 ? 1 : 0", "/ DAY > 30 ? 1 : 0", 'buchi: 10 → 30 giorni'],
  ['js/emerging.js', "(m.has(d) ? m.get(d) : null)", "(m.has(d) ? m.get(d) : (m.size ? [...m.values()].at(-1) : null))", 'onDates riempie i giorni mancanti'],
  ['js/emerging.js', "? c / fx[t] : null", "? c * fx[t] : null", 'inUsd moltiplica invece di dividere'],
  ['js/emerging.js', "(a[t] / a[t - h] - 1) * 100", "(a[t] / a[t - h + 1] - 1) * 100", 'change: h-1 sedute'],
  ['js/emerging.js', "Math.log(mx / S.val[i]) >= back * sd[i]", "Math.log(mx / S.val[i]) >= 0", 'F: senza la distanza dal massimo'],
  ['js/emerging.js', "for (let k = i - w + 1; k <= i; k++) mx", "for (let k = i - w + 1; k <= Math.min(n - 1, i + 5); k++) mx", 'F guarda 5 sedute avanti (dato futuro)'],
  ['js/emerging.js', "const j = i - sdN;", "const j = i - sdN - 1;", 'sd: finestra di 757 sedute'],
  ['js/emerging.js', "const rr = rrgNew(ws, wb), L", "const rr = rrgNew(wb, ws), L", 'forza relativa: ETF e ACWI scambiati'],
  ['js/emerging.js', "if (dates.length < 60) return null;", "if (dates.length < 60) return null; dates.reverse();", 'forza relativa: date al contrario'],
  ['scripts/fetch_emerging.js', "fresh.last < prev.last", "fresh.last > prev.last", 'pickSeries: confronto invertito'],
  ['scripts/fetch_emerging.js', "Math.max(...val) < 1000 ? 10000 : 100", "Math.max(...val) < 50 ? 10000 : 100", 'pack: 2 decimali già sopra 50 (INR a circa 90)'],
  ['scripts/fetch_emerging.js', "maxDays = 35", "maxDays = 10", 'lastLongGap 35 → 10 giorni'],
  ['scripts/check_fresh.js', "d.emerging.asOf.fred, today, 14]", "d.emerging.asOf.fred, today, 7]", 'freschezza FRED 14 → 7 giorni'],
  ['scripts/check_fresh.js', "d.emerging.asOf.fx, B, 4]", "d.emerging.asOf.fx, B, 40]", 'freschezza cambi 4 → 40 giorni'],
  ['scripts/fetch_data.js', "test(d) && v !== '' && v !== '.' && Number.isFinite(x)) { dates.push", "test(d) && v !== '' && Number.isFinite(x)) { dates.push", 'parseFredDaily accetta «.»'],
];
const out = [];
for (const [i, [file, from, to, what]] of M.entries()) {
  const dir = `${TMP}/m${i}`;
  fs.rmSync(dir, { recursive: true, force: true });
  execFileSync('cp', ['-r', W, dir]);
  const p = `${dir}/${file}`, src = fs.readFileSync(p, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { out.push(`${i}\t${what}\tTESTO NON TROVATO (${n})`); continue; }
  fs.writeFileSync(p, src.replace(from, to));
  const r = spawnSync('node', ['--test'], { cwd: dir, encoding: 'utf8' });
  const failed = (r.stdout.match(/^# fail (\d+)/m) || [])[1];
  const names = [...r.stdout.matchAll(/^not ok \d+ - (.*)$/gm)].map((x) => x[1]).join(' | ');
  out.push(`${i}\t${what}\t${failed > 0 ? 'COLTA' : 'NON COLTA'}\t${names}`);
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(out.join('\n'));
console.log(`colte ${out.filter((x) => x.includes('\tCOLTA')).length} su ${M.length}`);
