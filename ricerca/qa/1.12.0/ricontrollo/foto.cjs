// Screenshot del pannello #pkPanel (linea del tempo dei massimi), tema scuro, deviceScaleFactor 1
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/ricontrollo/foto.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
const TAG = process.env.TAG || '';
(async () => {
  const b = await chromium.launch();
  for (const vw of (process.env.WIDTHS || '1440,860,760,390').split(',').map(Number)) {
    const mob = vw < 500;
    const c = await b.newContext({ viewport: { width: vw, height: 4200 }, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', 'dark'); } catch {} });
    const p = await c.newPage();
    await p.goto(BASE + '#ath'); await p.waitForSelector('#pkBody .pkep svg .pkdot', { timeout: 30000 }); await p.waitForTimeout(500);
    const f = path.join(__dirname, `pk-${vw}-scuro${TAG}.png`);
    // finestra alta 4200 px: con isMobile lo screenshot di un elemento più lungo della finestra usciva spostato
    // in verticale (artefatto di Playwright, la posizione del pannello nella pagina resta la stessa)
    const r = await p.evaluate(() => { const b = document.querySelector('#pkPanel').getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; });
    await p.screenshot({ path: f, fullPage: true, clip: r });
    console.log(f);
    await c.close();
  }
  await b.close();
})();
