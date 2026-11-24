// Fase 3 · 1.6.2 · riquadro dei valori su sedute dentro un episodio con il VIX del giorno sotto la soglia o sceso nel mezzo.
// Uso: BASE=http://127.0.0.1:8805/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.2/riquadro_contraddizione.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8805/';
(async () => {
  const b = await chromium.launch(), c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
  const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(400);
  for (const [X, d] of [[40, '1998-09-01'], [50, '2008-11-04'], [30, '2021-01-27']]) {
    await p.click(`#vxTable tr[data-x="${X}"]`); await p.waitForTimeout(250);
    await p.evaluate(() => document.getElementById('vxScatter').scrollIntoView({ block: 'center' }));
    const q = await p.$eval(`#vxScatter circle[data-d="${d}"]`, (x) => [+x.getAttribute('cx'), +x.getAttribute('cy')]);
    const s = await p.evaluate(([cx, cy]) => { const v = document.getElementById('vxScatter'); const pt = v.createSVGPoint(); pt.x = cx; pt.y = cy; const r = pt.matrixTransform(v.getScreenCTM()); return [r.x, r.y]; }, q);
    await p.mouse.move(s[0], s[1]); await p.waitForTimeout(100);
    console.log(X, d, '→', (await p.textContent('#vxScTip')).replace(/\s+/g, ' '));
    await p.locator('#vxScWrap').screenshot({ path: `ricerca/qa/1.6.2/riquadro-${X}-${d}.png` });
  }
  await b.close();
})();
