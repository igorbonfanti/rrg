// Script principale della prova funzionale della 0.9.8: lancia tutte le prove (computer 1440×900 e telefono 390×844,
// tema scuro e chiaro) e riassume gli esiti di res/*.json.
// Uso (dalla radice del repository, con il server già avviato):
//   node ricerca/qa/server/gzserve.mjs /home/user/rrg 8805 &
//   NODE_PATH=$(npm root -g) node ricerca/qa/audit-0.9.8/funz/run.cjs [filtro]
// Variabili: BASE (default http://127.0.0.1:8805/), SHOTS (cartella degli screenshot), JOBS (prove in parallelo, 3).
// Con «node run.cjs --sintesi» rifà solo il riassunto dagli esiti già salvati.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const RES = path.join(DIR, 'res');
const JOBS = +process.env.JOBS || 3;
const filter = process.argv[2] && process.argv[2] !== '--sintesi' ? process.argv[2] : '';
const both = (s) => [['desktop', 'dark'], ['desktop', 'light'], ['phone', 'dark'], ['phone', 'light']].map((a) => [s, ...a]);
const RUNS = [
  ['s1_matrix.cjs'],
  ...both('s2_rrg.cjs'), ...both('s3_btm_sec.cjs'), ...both('s4_alr_idx.cjs'), ...both('s5_tit.cjs'), ...both('s6_cmd_nav.cjs'),
  ['s7_help.cjs', 'desktop'], ['s7_help.cjs', 'phone'],
  ['s8_tips.cjs', 'desktop', 'dark'], ['s8_tips.cjs', 'phone', 'dark'], ['s8_tips.cjs', 'phone', 'light'],
  ['s9_errors.cjs', 'desktop', 'dark'], ['s9_errors.cjs', 'phone', 'light'],
  ['s10_a11y.cjs', 'desktop', 'dark'], ['s10_a11y.cjs', 'phone', 'light'],
  ['s11_misc.cjs'], ['s12_clock.cjs'],
  ...both('s14_new.cjs'),
  ['s15_missing.cjs', 'desktop', 'dark'], ['s15_missing.cjs', 'phone', 'light', 'capitulation'], ['s15_missing.cjs', 'phone', 'light', 'indices'],
].filter((r) => r.join(' ').includes(filter));

function sintesi() {
  const rows = [];
  for (const f of fs.readdirSync(RES).filter((f) => f.endsWith('.json') && f !== 'sintesi.json')) {
    for (const r of JSON.parse(fs.readFileSync(path.join(RES, f), 'utf8'))) rows.push({ file: f.replace('.json', ''), ...r });
  }
  const bug = rows.filter((r) => r.ok !== 'OK');
  fs.writeFileSync(path.join(RES, 'sintesi.json'), JSON.stringify({ verifiche: rows.length, fallite: bug.length, quando: new Date().toISOString(), fallite_elenco: bug }, null, 1));
  console.log(`\n${rows.length} verifiche, ${bug.length} fallite`);
  for (const b of bug) console.log(`BUG ${b.file} [${b.id}] ${b.test} → ${String(b.detail).slice(0, 220)}`);
}

if (process.argv[2] === '--sintesi') { sintesi(); process.exit(0); }
fs.mkdirSync(RES, { recursive: true });
let i = 0, running = 0;
const t0 = Date.now();
function next() {
  if (i >= RUNS.length && !running) { console.log(`fine in ${Math.round((Date.now() - t0) / 1000)} s`); sintesi(); return; }
  while (running < JOBS && i < RUNS.length) {
    const r = RUNS[i++]; running++;
    const t = Date.now();
    const p = spawn(process.execPath, r, { cwd: DIR, env: process.env });
    let out = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => {
      running--;
      const n = (out.match(/^OK /gm) || []).length, nb = (out.match(/^BUG/gm) || []).length;
      console.log(`${code === 0 ? 'fatto' : 'ERRORE ' + code} ${r.join(' ')}: ${n} OK, ${nb} BUG, ${Math.round((Date.now() - t) / 1000)} s`);
      if (code !== 0) console.log(out.split('\n').filter((l) => !/^OK /.test(l)).slice(-15).join('\n'));
      next();
    });
  }
}
next();
