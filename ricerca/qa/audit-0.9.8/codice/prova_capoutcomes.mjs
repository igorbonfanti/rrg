// M4: capOutcomes con prezzi null prima della quotazione dell'ETF (XLC dal 2018, XLRE dal 2015) dà fall63 = NaN.
// Uso: node ricerca/qa/audit-0.9.8/codice/prova_capoutcomes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { capSeries, capAnalysis, capOutcomes } = await import(path.join(ROOT, 'js/capitulation.js'));
const { pct } = await import(path.join(ROOT, 'js/format.js'));
const cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/capitulation.json'))), S = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sectors.json')));
for (const k of ['XLC', 'XLRE']) {
  const s = capSeries(cap.series[k]), a = capAnalysis(s), { rows } = capOutcomes(a.episodes, s.dates, S.dates, S.adjclose[k], a.from);
  for (const r of rows.filter((x) => Number.isNaN(x.fall63))) console.log(`${k} ${r.date}: fall63=${r.fall63}, dd52=${r.dd52}, r63=${r.r63} → in tabella ${pct(r.fall63 * 100)}`);
}
