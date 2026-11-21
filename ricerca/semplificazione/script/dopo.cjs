// Screenshot del prototipo «dopo» (ricerca/semplificazione/prototipo/index.html): viste 5 Titoli, 8 VIX e 0 Massimi a 1440 px,
// tema scuro, con un riquadro «i» aperto; barra delle schede con 10 schede a 390, 360 e 861 px; riquadro aperto al tocco.
// Uso: BASE=http://127.0.0.1:8871/ NODE_PATH=$(npm root -g) node ricerca/semplificazione/script/dopo.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8871/';
const URL = BASE + 'ricerca/semplificazione/prototipo/index.html';
const OUT = path.join(__dirname, '..', 'dopo');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = async (opt) => { const c = await b.newContext(opt); await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }); return c; };
  const errs = [];
  const c = await ctx({ viewport: { width: 1440, height: 900 } });
  const p = await c.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const shot = (n, o = {}) => p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: true, ...o });
  await p.goto(URL + '#tit-XLK'); await p.waitForSelector('#titPain tbody tr', { timeout: 30000 }); await p.waitForTimeout(1200);
  await shot('5-tit');
  await p.hover('#v-tit .ph h2 + .info'); await p.waitForTimeout(400);
  await shot('5-tit-info-aperta', { fullPage: false });
  await p.mouse.move(5, 5); await p.waitForTimeout(400);
  await p.evaluate(() => { location.hash = '#vix'; });
  await p.waitForSelector('#vxTable tbody tr', { timeout: 30000 }); await p.waitForSelector('#athTable tr.athr', { timeout: 30000, state: 'attached' }); await p.waitForTimeout(1200);
  await shot('8-vix');
  await p.click('#v-vix .vix-grid .panel:nth-child(2) .info'); await p.waitForTimeout(300);
  const box = await p.$eval('#infopop', (x) => { const r = x.getBoundingClientRect(); return { y: r.top, h: r.height, hidden: x.hidden }; });
  await p.screenshot({ path: path.join(OUT, '8-vix-info-scatter.png'), clip: { x: 0, y: Math.max(0, box.y - 140), width: 1440, height: Math.min(900, box.h + 260) } });
  await p.keyboard.press('Escape');
  // vista 0 Massimi: si apre una riga per il grafico, poi si passa alla vista
  await p.evaluate(() => document.querySelector('#athTable tr.athr[data-id="SPX"], #athTable tr.athr').click());
  await p.waitForSelector('#athChart .athpx', { timeout: 20000 }).catch(() => {});
  await p.click('#tab-ath'); await p.waitForTimeout(1500);
  await shot('0-massimi');
  // telefono: barra con 10 schede e riquadro al tocco
  for (const [w, h] of [[390, 844], [360, 780]]) {
    const cp = await ctx({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    const q = await cp.newPage(); q.on('pageerror', (e) => errs.push(e.message));
    await q.goto(URL + '#vix'); await q.waitForSelector('#vxTable tbody tr', { timeout: 30000 }); await q.waitForTimeout(800);
    await q.screenshot({ path: path.join(OUT, `telefono-${w}-schede.png`), clip: { x: 0, y: 0, width: w, height: 260 } });
    if (w === 390) {
      const i = q.locator('#v-vix .vix-grid .panel:first-child .info');
      await i.scrollIntoViewIfNeeded(); await i.tap(); await q.waitForTimeout(400);
      await q.screenshot({ path: path.join(OUT, 'telefono-390-info-tocco.png') });
      const tw = await q.evaluate(() => document.documentElement.scrollWidth);
      if (tw > 390) errs.push('scorrimento orizzontale a 390: ' + tw);
    }
    await cp.close();
  }
  for (const w of [861, 1100]) {
    const cp = await ctx({ viewport: { width: w, height: 700 } });
    const q = await cp.newPage();
    await q.goto(URL + '#mon'); await q.waitForSelector('#boardTable tbody tr', { timeout: 30000, state: 'attached' }); await q.waitForTimeout(500);
    const fit = await q.evaluate(() => { const f = document.querySelector('.fnkeys'); return { sw: f.scrollWidth, cw: f.clientWidth, last: document.getElementById('tab-ath').getBoundingClientRect().right }; });
    console.log('schede a', w, 'px', JSON.stringify(fit));
    await q.screenshot({ path: path.join(OUT, `schede-${w}.png`), clip: { x: 0, y: 0, width: w, height: 120 } });
    await cp.close();
  }
  console.log('errori', errs.length, errs.slice(0, 5));
  await b.close();
})();
