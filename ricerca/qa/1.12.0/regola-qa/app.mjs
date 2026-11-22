// QA 1.12.0 (regola del calo in corso): uscita di timeline() di js/peaks.js sugli stessi tagli di ricalcolo.py.
// Le serie si costruiscono come buildTimeline() di js/ath-view.js (decodeDates, deltaDecode con ps, ordine di config/ath.json),
// poi si tagliano alle sedute <= data del taglio.
// Uso: node ricerca/qa/1.12.0/regola-qa/app.mjs <radice del repository> <tagli.json> > app.json
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2] || '.');
const cuts = Object.keys(JSON.parse(fs.readFileSync(process.argv[3], 'utf8')));
const { timeline } = await import(pathToFileURL(path.join(root, 'js/peaks.js')));
const { decodeDates, deltaDecode } = await import(pathToFileURL(path.join(root, 'js/indexdata.js')));
const H = JSON.parse(fs.readFileSync(process.env.HIST || path.join(root, 'data/ath_history.json'), 'utf8'));
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config/ath.json'), 'utf8'));
const ids = (cfg.markets || cfg).map((m) => m.id).filter((id) => H.series[id]);
const full = {};
for (const id of ids) { const h = H.series[id]; full[id] = { dates: decodeDates(h.d0, h.gaps), close: deltaDecode(h.cd, h.ps || 1) }; }
const out = {};
for (const c of cuts) {
  const ser = {};
  for (const id of ids) { const k = full[id].dates.filter((d) => d <= c).length; if (k) ser[id] = { dates: full[id].dates.slice(0, k), close: full[id].close.slice(0, k) }; }
  const T = timeline(ser, ids);
  out[c] = T ? { asOf: T.asOf, done: T.episodes.filter((e) => !e.ongoing).map((e) => [e.peak, e.ddPct]), open: T.episodes.filter((e) => e.ongoing).map((e) => [e.peak, e.ddPct]), order: T.episodes.map((e) => e.ongoing) } : null;
}
process.stdout.write(JSON.stringify(out));
