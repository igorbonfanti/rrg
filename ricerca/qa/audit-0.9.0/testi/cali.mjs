import fs from 'node:fs';
import { capSeries, capAnalysis, capOutcomes } from '../../../../js/capitulation.js';
import { indexSeries } from '../../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const C = R('data/capitulation.json').series, cfg = R('config/indices.json').indices;
const IX = { ...R('data/indices.json').series, ...R('data/indices_more.json').series };
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
for (const mode of ['count', 'pct']) {
  const all = []; let baseAll = [];
  for (const k of Object.keys(cfg)) {
    if (!C[k]) { console.log('manca', k); continue; }
    const s = capSeries(C[k]), a = capAnalysis(s, { mode }), X = indexSeries(IX[k]);
    const { rows, base } = capOutcomes(a.episodes, s.dates, X.dates, X.close, a.from);
    rows.forEach((r) => all.push({ k, ...r, ex: r.r252 == null || base.r252 == null ? null : r.r252 - base.r252 }));
    baseAll.push(base.r252);
  }
  const done = all.filter((r) => r.r252 != null);
  const fast = done.filter((r) => /^2020-0[23]|^2025-0[34]/.test(r.date));
  const rest = done.filter((r) => !/^2020-0[23]|^2025-0[34]/.test(r.date));
  const bear = done.filter((r) => r.date >= '2007-08-01' && r.date <= '2008-09-30');
  console.log(`\n${mode}: episodi ${all.length}, con 12M ${done.length}; eccesso medio 12M ${(100 * mean(done.map((r) => r.ex))).toFixed(1)} pt; senza mar2020/apr2025 ${(100 * mean(rest.map((r) => r.ex))).toFixed(1)} (${rest.length}); solo crolli rapidi ${(100 * mean(fast.map((r) => r.ex))).toFixed(1)} (${fast.length})`);
  console.log(`  ago2007-set2008: ${bear.length} episodi, r252<0: ${bear.filter((r) => r.r252 < 0).length}, eccesso medio ${(100 * mean(bear.map((r) => r.ex))).toFixed(1)}; ` + bear.map((r) => `${r.k} ${r.date} ${(100 * r.r252).toFixed(0)}%`).join(', '));
}
// settori e SPX in count: episodi e positivi
