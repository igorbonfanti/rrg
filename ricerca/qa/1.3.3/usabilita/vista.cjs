// screenshot della finestra su un elemento (per vedere sovrapposizioni con intestazioni o piè di pagina fissi)
// Uso: BASE=... W=360 H=740 TOUCH=1 LIGHT=1 HASH='#mon' SEL='#stateLegend' OUT=file.png [OFF=0] NODE_PATH=$(npm root -g) node vista.cjs
const { chromium } = require('playwright');
(async () => {
  const E = process.env, touch = !!+E.TOUCH, w = +E.W, h = +E.H;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 });
  await ctx.addInitScript((light) => { try { localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); } catch {} }, !!+E.LIGHT);
  const p = await ctx.newPage();
  await p.goto(E.BASE + E.HASH); await p.waitForTimeout(2200);
  if (E.CLICK) { await p.locator(E.CLICK).click(); await p.waitForTimeout(400); }
  if (E.SEL) await p.evaluate(([s, off]) => { const el = document.querySelector(s); el.scrollIntoView({ block: 'start' }); window.scrollBy(0, +off || 0); }, [E.SEL, E.OFF || 0]);
  await p.waitForTimeout(300);
  const fixed = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position) && e.getClientRects().length).map((e) => `${e.tagName}#${e.id}.${e.className} ${Math.round(e.getBoundingClientRect().top)}..${Math.round(e.getBoundingClientRect().bottom)}`));
  console.log(fixed.join('\n'));
  await p.screenshot({ path: E.OUT });
  await b.close();
})();
