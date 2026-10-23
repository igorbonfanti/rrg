const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/v080/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h, light] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    await ctx.addInitScript((light) => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); } catch {} }, light);
    const p = await ctx.newPage(); const log = [];
    p.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); }); p.on('pageerror', (e) => log.push(e.message));
    await p.goto('http://127.0.0.1:8790/#idx'); await p.waitForTimeout(3500);
    const info = async () => p.evaluate(() => ({ date: document.querySelector('#ixDateVal').textContent, meta: document.querySelector('#ixMapMeta').textContent.slice(50, 160), heads: document.querySelectorAll('#ixMap circle.head').length, blu: [...document.querySelectorAll('#ixMap circle.head')].filter((c) => /headz-setup/.test(c.getAttribute('class'))).length, dist: document.querySelectorAll('#ixDist .r').length }));
    console.log(w, 'oggi', JSON.stringify(await info()));
    await p.click('#ixJumps button[data-d="2008-11-20"]'); await p.waitForTimeout(300);
    console.log(w, 'nov 2008', JSON.stringify(await info()));
    await p.click('#ixJumps button[data-d="2020-03-23"]'); await p.waitForTimeout(300);
    console.log(w, 'mar 2020', JSON.stringify(await info()));
    const el = await p.$('#ixMapWrap'); await el.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}ixbm-2020-${w}.png` });
    if (w > 500) { const c = await p.$('#ixMap circle.head'); const bb = await c.boundingBox(); await p.mouse.move(bb.x + 3, bb.y + 3); await p.waitForTimeout(200); console.log('  tip', (await p.textContent('#ixMapTip')).replace(/\s+/g, ' ').slice(0, 140)); }
    await p.click('#ixPlay'); await p.waitForTimeout(1200); const mid = (await info()).date; await p.click('#ixPlay');
    console.log(w, 'replay:', mid);
    await p.click('#ixToday'); await p.waitForTimeout(300);
    console.log(w, 'oggi', JSON.stringify(await info()), 'overflow', await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth), 'errori', log.join(' ; ') || 'nessuno');
    await ctx.close();
  }
  await b.close();
})();
