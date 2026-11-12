// Stessa prova dell'asse dei prezzi sul grafico grande del VIX (pannello dell'indice), per capire se il difetto c'era già
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { localStorage.setItem('sm.introSeen', 'true'); });
  const p = await c.newPage(); await p.goto((process.env.BASE || 'http://127.0.0.1:8836/') + '#vix'); await p.waitForSelector('#vxChart path');
  await p.locator('#vxChart').scrollIntoViewIfNeeded();
  const bx = await p.locator('#vxChart').boundingBox();
  await p.mouse.move(bx.x + bx.width * 0.9, bx.y + 40); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * 0.95, bx.y + 40, { steps: 5 }); await p.mouse.move(bx.x + bx.width * 0.985, bx.y + 40, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(400);
  console.log(await p.$eval('#vxZoom', (x) => x.textContent));
  console.log((await p.$$eval('#vxChart text', (t) => t.map((x) => x.textContent))).join(' | '));
  await p.locator('#vxChart').screenshot({ path: __dirname + '/shots/rilievo-zoom-asse-vix.png' });
  await b.close();
})();
