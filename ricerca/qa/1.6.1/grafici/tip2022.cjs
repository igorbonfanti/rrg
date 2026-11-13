// Riquadro dei valori su una seduta del 2022 (dentro «2022 inflazione/tassi» nell'elenco CRISES) e righe della tabella del 2022.
// Uso: BASE=http://127.0.0.1:8801/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/grafici/tip2022.cjs
const { chromium } = require('playwright'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8801/';
const W = require('./atteso.json');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage();
  await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(400);
  await p.locator('#vxScatter').scrollIntoViewIfNeeded();
  const q = W.SPX.pts.find((x) => x.date === '2022-03-07');
  const r = await p.evaluate(() => { const t = [...document.querySelectorAll('#vxScatter text.axt')].map((t) => [t.textContent, +t.getAttribute('x'), +t.getAttribute('y'), t.getAttribute('text-anchor')]); return { t, vb: document.getElementById('vxScatter').getAttribute('viewBox').split(' ').map(Number) }; });
  const xs = r.t.filter((t) => t[3] === 'middle').map((t) => [+t[0], t[1]]), ys = r.t.filter((t) => t[3] === 'end').map((t) => [parseFloat(t[0].replace('+', '')), t[2] - 3]);
  const f = (a) => { const [v0, p0] = a[0], [v1, p1] = a.at(-1); const k = (p1 - p0) / (v1 - v0); return (v) => p0 + (v - v0) * k; }; const sx = f(xs), sy = f(ys);
  const box = await p.locator('#vxScatter').boundingBox(), k = box.width / r.vb[2];
  await p.mouse.move(box.x + sx(q.vix) * k, box.y + sy(q.ret) * k); await p.waitForTimeout(150);
  console.log('punto', q.date, q.vix, q.ret.toFixed(1), q.g); console.log('riquadro:', JSON.stringify(await p.locator('#vxScTip').innerText()));
  await p.locator('#vxScWrap').screenshot({ path: path.join(__dirname, 'shots/1440-scuro-tip-2022-03-07.png') });
  for (const X of [20, 25, 30]) {
    await p.click(`#vxTable tr[data-x="${X}"]`); await p.waitForTimeout(150);
    const rows = await p.$$eval('#vxEps tbody tr', (t) => t.map((r) => [r.cells[0].textContent, r.cells[1].textContent, r.dataset.g || '-']).filter((r) => /20(21|22)$/.test(r[0])));
    console.log(`soglia ${X}:`, JSON.stringify(rows));
  }
  await b.close();
})();
