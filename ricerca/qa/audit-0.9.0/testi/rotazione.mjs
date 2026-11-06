import fs from 'node:fs';
import { build, quadrant } from '../../../../js/engine.js';
const P = JSON.parse(fs.readFileSync(new URL('../../../../data/prices.json', import.meta.url)));
const SECT = ['XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU'];
console.log('gruppi', Object.keys(P.groups), 'benchmarks', P.benchmarks);
for (const tf of ['weekly', 'daily']) {
  const a = build(P, { symbols: SECT, benchmark: 'SPY', timeframe: tf, formula: 'nuova' });
  const b = build(P, { symbols: SECT, benchmark: 'SPY', timeframe: tf, formula: 'semplice' });
  let same = 0, tot = 0, in3 = 0, n3 = 0, in10 = 0, n10 = 0, both3 = 0, both10 = 0;
  for (const s of SECT) for (let i = 0; i < a.dates.length; i++) {
    if (a.dates[i] < '2022-01-01') continue;
    const xa = a.series[s].x[i], ya = a.series[s].y[i], xb = b.series[s].x[i], yb = b.series[s].y[i];
    if (xa != null && ya != null) { n3++; if (Math.abs(xa - 100) <= 3) in3++; if (Math.abs(xa - 100) <= 3 && Math.abs(ya - 100) <= 3) both3++; }
    if (xb != null && yb != null) { n10++; if (Math.abs(xb - 100) <= 10) in10++; if (Math.abs(xb - 100) <= 10 && Math.abs(yb - 100) <= 10) both10++; }
    if (xa != null && ya != null && xb != null && yb != null) { tot++; if (quadrant(xa, ya) === quadrant(xb, yb)) same++; }
  }
  console.log(tf, `stesso quadrante ${same}/${tot} = ${(100 * same / tot).toFixed(1)}%`, `nuova |RS-Ratio-100|<=3: ${(100 * in3 / n3).toFixed(1)}% (entrambi gli assi ${(100 * both3 / n3).toFixed(1)}%)`, `semplice |RS-Ratio-100|<=10: ${(100 * in10 / n10).toFixed(1)}% (entrambi ${(100 * both10 / n10).toFixed(1)}%)`);
}
