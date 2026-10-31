// Audit 0.9.8: righe tratteggiate «sotto il livello, fuori dalla zona blu» (XLRE, XLE MAX) e linea del cursore condivisa (1440).
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
const OUT = process.env.OUT || '/tmp/a098/';
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((theme) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', theme); localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('sm.opened', JSON.stringify({ secCap: true })); localStorage.setItem('sm.range', '"10A"'); } } catch {} }, theme);
    const page = await ctx.newPage();
    for (const s of ['XLRE', 'XLE']) {
      await page.goto(BASE + '#' + s); await page.waitForTimeout(2500);
      const n = await page.evaluate(() => document.querySelectorAll('#ts .band-off').length);
      console.log(theme, s, 'righe fuori zona blu:', n);
      const box = await page.evaluate(() => { const r = document.getElementById('ts').getBoundingClientRect(); return [r.left, r.top + scrollY, r.width, r.height]; });
      await page.screenshot({ path: `${OUT}int/off-${theme}-${s}.png`, fullPage: true, clip: { x: box[0], y: box[1] + box[3] * 0.62, width: box[2], height: box[3] * 0.4 + 50 } });
    }
    // cursore sul grafico principale: linea anche nei cali forti
    await page.evaluate(() => document.getElementById('ts').scrollIntoView({ block: 'start' }));
    const r = await page.evaluate(() => { const x = document.getElementById('ts').getBoundingClientRect(); return [x.left + x.width * 0.45, x.top + 120]; });
    await page.mouse.move(r[0], r[1]); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}int/cursore-${theme}.png`, fullPage: false });
    await ctx.close();
  }
  await b.close();
})();
