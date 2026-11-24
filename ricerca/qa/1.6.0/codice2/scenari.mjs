// Tutti gli scenari di mock_run.mjs con tre file pubblicati di partenza: nessuno, quello della 1.5.0 (origin/main),
// quello della 1.6.0 (prima corsa vera). Uso: WT=<copia> CACHE=<cartella> P150=<file> P160=<file> node scenari.mjs [scenari...]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { decodeDates, deltaDecode } from '../../../../js/indexdata.js';
const { WT, CACHE, P150, P160 } = process.env;
const OUT = path.join(WT, 'data/vix.json'), HERE = path.dirname(new URL(import.meta.url).pathname);
const all = ['ok', 'fredDown', 'fredHang', 'cboeDown', 'cboeHang', 'yahooDown', 'yahooHang', 'allDown', 'allHang', 'fredCboeDown', 'cboeYahooDown', 'cboeLate', 'cboeLateYahooDown', 'cboeExtra', 'cboeHtml', 'cboeDisclaimer', 'cboeIso', 'cboeZero', 'cboeNeg', 'cboeDup', 'cboeShort', 'cboeCols', 'cboeOldFred', 'cboeWild', 'fredBack', 'fredBack3m', 'vix3m404', 'hygShort', 'hygDiv'];
const scen = process.argv.slice(2).length ? process.argv.slice(2) : all;
const lastVal = (x) => (x && x.cd ? deltaDecode(x.cd, x.ps || 1).at(-1) : null);
const lastDates = (x, n = 2) => (x && x.cd ? decodeDates(x.d0, x.gaps).slice(-n) : null);
const rows = [];
for (const s of scen) for (const [pn, pf] of [['nessuno', null], ['1.5.0', P150], ['1.6.0', P160]]) {
  if (pf) fs.copyFileSync(pf, OUT); else if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  const before = pf ? fs.readFileSync(pf, 'utf8') : null;
  const r = spawnSync(process.execPath, [path.join(HERE, 'mock_run.mjs')], { env: { ...process.env, SCEN: s }, encoding: 'utf8' });
  const tag = /@@ .*exit=(\d+) attesa_virtuale_s=([\d.]+) richieste=(\d+) \[(.*)\]/.exec(r.stdout) || [];
  const after = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  let o = null; try { o = after && JSON.parse(after); } catch { o = 'JSON NON VALIDO'; }
  const b = before && JSON.parse(before);
  const written = after !== before;
  const same = {}; if (o && b) for (const k of Object.keys(o.series)) same[k] = JSON.stringify(o.series[k]) === JSON.stringify(b.series[k]) ? '=' : '≠';
  const errs = (r.stderr || '').split('\n').filter((x) => x && !/^(Note|Errori):$/.test(x));
  rows.push({ s, pn, exit: tag[1], wait: +tag[2], req: tag[3], written, asOf: o && o.asOf, missing: o && o.missing, same, vix: o && o.series ? [lastDates(o.series.VIX).join('/'), lastVal(o.series.VIX)] : null, v3: o && o.series && o.series.VIX3M ? [lastDates(o.series.VIX3M).join('/'), lastVal(o.series.VIX3M)] : null, errs });
  const R = rows.at(-1);
  console.log(`\n== ${s} | prev ${pn} | exit ${R.exit} | attesa ${R.wait}s | richieste ${R.req} | file ${written ? 'scritto' : 'invariato'}`);
  if (o && typeof o === 'object') console.log('   asOf', JSON.stringify(o.asOf), 'missing', JSON.stringify(o.missing), 'vs prev', JSON.stringify(same), 'VIX', JSON.stringify(R.vix), 'VIX3M', JSON.stringify(R.v3));
  for (const e of errs.slice(0, 8)) console.log('   !', e.slice(0, 200));
}
fs.writeFileSync(path.join(HERE, 'scenari.json'), JSON.stringify(rows, null, 1));
