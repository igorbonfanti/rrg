// Legenda e note del grafico a 360 px (telefono, scuro). Uso: BASE=... NODE_PATH=$(npm root -g) node .../legenda-mobile.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
(async () => {
  const br = await chromium.launch(), ctx = await br.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('antigravity-theme', 'dark'); localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const p = await ctx.newPage(); await p.goto(BASE + '#emg-TWN'); await p.waitForSelector('#emChart path.emloc'); await p.waitForTimeout(800);
  const box = await p.locator('#emLegend').boundingBox(), nb = await p.locator('#emNotes').boundingBox();
  await p.screenshot({ path: path.join(__dirname, 'shots', '360-scuro-legenda-note-TWN.png'), fullPage: true, clip: { x: 0, y: box.y - 60, width: 360, height: nb.y + nb.height - box.y + 80 } });
  await br.close();
})();
