// Audit 0.9.8: Bottom Map dei settori e degli indici nelle crisi passate (mar 2020, nov 2008), con e senza «Zoom sulla zona».
const { chromium } = require('playwright');
const { __audit } = require('./misure.cjs');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
const OUT = process.env.OUT || '/tmp/a098/';
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  for (const [w, h, t] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: t, hasTouch: t });
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
    const page = await ctx.newPage();
    for (const [view, jumps, zoom, wrap] of [['btm', 'bmJumps', 'bmZoom', 'bmWrap'], ['idx', 'ixJumps', 'ixZoom', 'ixMapWrap']]) {
      await page.goto(BASE + '#' + view); await page.waitForTimeout(view === 'idx' ? 4500 : 2500);
      for (const crisi of ['mar 2020', 'nov 2008']) for (const z of [false, true]) {
        await page.evaluate(([j, c]) => { const b = [...document.querySelectorAll(`#${j} button`)].find((x) => x.textContent === c); b && b.click(); }, [jumps, crisi]);
        await page.waitForTimeout(500);
        const on = await page.evaluate((id) => document.getElementById(id).getAttribute('aria-pressed') === 'true', zoom);
        if (on !== z) { await page.click('#' + zoom); await page.waitForTimeout(500); }
        const a = await page.evaluate(`(${__audit.toString()})({ root: '#${wrap}' })`);
        const tag = `${w}-${view}-${crisi.replace(' ', '')}-${z ? 'zoom' : 'nozoom'}`;
        console.log(tag, 'sovrapposizioni:', a.svgOv.length, a.svgOv.slice(0, 6).join(' | '));
        await (await page.$('#' + wrap)).screenshot({ path: `${OUT}int/crisi-${tag}.png` });
      }
      if (await page.evaluate((id) => document.getElementById(id).getAttribute('aria-pressed') === 'true', zoom)) await page.click('#' + zoom);
    }
    await ctx.close();
  }
  await b.close();
})();
