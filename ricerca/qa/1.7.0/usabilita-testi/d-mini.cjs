// Mini-grafici ingranditi: episodio di una seduta, episodio in corso, episodio lungo anni, a 1440 e 390, chiaro e scuro.
const { chromium } = require('playwright'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8808/'; const OUT = path.join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['1440-chiaro', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, 'dark']]) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxEps tbody tr'); await p.waitForTimeout(400);
    for (const [X, d] of [[40, '24/08/2015'], [40, '28/10/2020'], [40, '04/04/2025'], [40, '29/09/2008'], [20, '02/11/2026'], [20, '12/12/1996'], [20, '02/08/2024'], [25, '05/11/2026']]) {
      await p.locator(`#vxTable tr[data-x="${X}"]`).click(); await p.waitForTimeout(200);
      const row = p.locator('#vxEps tbody tr', { hasText: d }).first();
      await row.scrollIntoViewIfNeeded(); await p.evaluate(() => { document.querySelector('#vxEps').closest('.tscroll').scrollLeft = 150; });
      const sv = row.locator('svg.vxsp');
      await sv.screenshot({ path: path.join(OUT, `mini-${name}-${X}-${d.replace(/\//g, '')}.png`) });
      console.log(name, X, d, await sv.locator('title').textContent());
    }
    await c.close();
  }
  await b.close();
})();
