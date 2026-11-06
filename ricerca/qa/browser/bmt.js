const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/v080/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h, light] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    await ctx.addInitScript((light) => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); } catch {} }, light);
    const p = await ctx.newPage(); const log = [];
    p.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); }); p.on('pageerror', (e) => log.push(e.message));
    await p.goto('http://127.0.0.1:8790/#btm'); await p.waitForTimeout(1500);
    const info = async () => p.evaluate(() => ({ date: document.querySelector('#bmDateVal').textContent, meta: document.querySelector('#bmMeta').textContent.slice(0, 50), heads: document.querySelectorAll('#bm circle.head').length, blu: [...document.querySelectorAll('#bm circle.head')].filter((c) => /headz-setup/.test(c.getAttribute('class'))).length, rings: document.querySelectorAll('#bm .appr-ring').length, today: !document.querySelector('#bmToday').hidden, dist: document.querySelectorAll('#distList .r').length }));
    console.log(w, 'oggi', JSON.stringify(await info()));
    await p.click('#bmJumps button[data-d="2020-03-23"]'); await p.waitForTimeout(300);
    console.log(w, 'mar 2020', JSON.stringify(await info()));
    await p.screenshot({ path: `${OUT}bm-2020-${w}.png`, fullPage: w < 500 });
    await p.click('#bmJumps button[data-d="2008-11-20"]'); await p.waitForTimeout(300);
    console.log(w, 'nov 2008', JSON.stringify(await info()));
    // tooltip storico
    if (w > 500) { const c = await p.$('#bm circle.head'); const bb = await c.boundingBox(); await p.mouse.move(bb.x + 3, bb.y + 3); await p.waitForTimeout(200); console.log('  tip', (await p.textContent('#bmTip')).replace(/\s+/g, ' ').slice(0, 140)); }
    await p.click('#bmPlay'); await p.waitForTimeout(1200);
    const mid = (await info()).date; await p.click('#bmPlay'); 
    console.log(w, 'replay si muove:', mid);
    await p.click('#bmToday'); await p.waitForTimeout(300);
    console.log(w, 'oggi di nuovo', JSON.stringify(await info()));
    const ov = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
    console.log(w, 'overflow', ov, 'errori', log.join(' ; ') || 'nessuno');
    await ctx.close();
  }
  await b.close();
})();
