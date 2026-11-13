const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', 'light'); });
  const p = await c.newPage(); await p.goto('' + (process.env.BASE || 'http://127.0.0.1:8836/') + '#vix'); await p.waitForSelector('#athTable tr.athr');
  for (const [id, f0, f1] of [['SPX', 0.93, 0.999], ['NDX', 0.95, 0.999], ['COPPER', 0.9, 0.999], ['GOLD', 0.97, 0.999]]) {
    await p.click(`#athTable tr.athr[data-id="${id}"]`); await p.waitForSelector('#athChart path.athpx'); await p.click('#athRange button[data-range="10A"]'); await p.waitForTimeout(200);
    const bx = await p.locator('#athChart').boundingBox(); await p.locator('#athChart').scrollIntoViewIfNeeded();
    const bx2 = await p.locator('#athChart').boundingBox();
    const W = await p.$eval('#athChart', (s) => s.viewBox.baseVal.width), sc = bx2.width / W, L = 8, PW = W - 60;
    await p.mouse.move(bx2.x + (L + f0 * PW) * sc, bx2.y + 100); await p.mouse.down(); await p.mouse.move(bx2.x + (L + f1 * PW) * sc, bx2.y + 100, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    const ticks = await p.$$eval('#athChart text.axt', (t) => t.map((x) => x.textContent));
    console.log(id, await p.$eval('#athZoom', (x) => x.textContent), ticks.join(' | '));
    await p.locator('#athPanel').screenshot({ path: `/home/user/rrg/ricerca/qa/1.10.0/uso/shots/rilievo-zoom-asse-${id}.png` });
    await p.keyboard.press('Escape');
  }
  await b.close();
})();
