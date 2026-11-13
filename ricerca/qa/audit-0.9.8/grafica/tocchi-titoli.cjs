// Audit 0.9.8: tocchi sui grafici della vista Titoli al telefono (390×844): storia della divergenza e bolle.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
const OUT = process.env.OUT || '/tmp/a098/';
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
  const page = await ctx.newPage();
  await page.goto(BASE + '#tit-XLK'); await page.waitForTimeout(4500);
  for (const [svg, tip] of [['titHist', 'titHistTip'], ['titBubble', 'titBubbleTip'], ['titSpread', 'titSpreadTip']]) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), svg); await page.waitForTimeout(300);
    const r = await page.evaluate((id) => { const x = document.getElementById(id).getBoundingClientRect(); return [x.left, x.top, x.width, x.height]; }, svg);
    for (const fx of [0.3, 0.6, 0.8]) {
      await page.touchscreen.tap(r[0] + r[2] * fx, r[1] + r[3] * 0.45); await page.waitForTimeout(350);
      const s = await page.evaluate((t) => { const e = document.getElementById(t); return { shown: !e.hidden, txt: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) }; }, tip);
      console.log(svg, fx, JSON.stringify(s));
      if (s.shown && fx === 0.6) await page.screenshot({ path: `${OUT}int/tap-tit-${svg}.png` });
    }
  }
  await b.close();
})();
