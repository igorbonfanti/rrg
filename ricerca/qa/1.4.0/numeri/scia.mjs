// Controllo numeri 1.4.0 · scia di 10 settimane e punti del quadrante della forza relativa: coordinate SVG riportate a
// RS-Ratio/RS-Momentum (W = H, centro 100, ±4) e confrontate con calc.json (ricalcolo indipendente).
// Uso: NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/numeri/scia.mjs [url]
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://127.0.0.1:8794/';
const calc = JSON.parse(fs.readFileSync(new URL('./calc.json', import.meta.url)));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(URL0 + '#emg', { waitUntil: 'networkidle' }); await p.waitForSelector('#emTable tbody tr');
let n = 0, bad = [];
const cl = (v) => Math.max(96, Math.min(104, v));
for (const k of Object.keys(calc.rs)) {
  await p.click(`#emTable tr[data-em="${k}"]`); await p.waitForTimeout(200);
  const g = await p.evaluate(() => { const s = document.getElementById('emRS'); return { W: s.viewBox.baseVal.width, H: s.viewBox.baseVal.height, d: s.querySelector('path.emtrail')?.getAttribute('d') }; });
  const pts = g.d.match(/[ML][^ML]+/g).map((s) => s.slice(1).trim().split(/\s+/).map(Number));
  const exp = calc.rs[k].trail;
  if (pts.length !== exp.length) bad.push([k, 'punti', pts.length, exp.length]);
  pts.forEach(([x, y], i) => {
    const ex = (cl(exp[i][0]) - 96) / 8 * g.W, ey = g.H - (cl(exp[i][1]) - 96) / 8 * g.H; n++;
    if (Math.abs(x - ex) > 0.06 || Math.abs(y - ey) > 0.06) bad.push([k, exp[i][2], x, ex.toFixed(1), y, ey.toFixed(1)]);
  });
  console.log(k, 'W', g.W, 'punti', pts.length, 'clip:', exp.filter((q) => q[0] < 96 || q[0] > 104 || q[1] < 96 || q[1] > 104).map((q) => q[2] + ' ' + q[0].toFixed(1) + '/' + q[1].toFixed(1)).join(', ') || 'nessuno');
}
console.log('coordinate controllate', n, '· diverse', bad.length, JSON.stringify(bad.slice(0, 10)));
fs.writeFileSync(new URL('./scia.json', import.meta.url), JSON.stringify({ n, bad }, null, 1));
await b.close();
