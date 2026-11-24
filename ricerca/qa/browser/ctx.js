const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/v080/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await ctx.newPage(); const log = [];
    p.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); }); p.on('pageerror', (e) => log.push(e.message));
    await p.goto('http://127.0.0.1:8780/#XLU'); await p.waitForTimeout(1500);
    console.log(w, 'meta:', await p.textContent('#epiMeta'));
    console.log(' ctx:', (await p.$$eval('#epiCtx tr', (r) => r.map((x) => x.innerText.replace(/\s+/g, ' ')))).join(' | '));
    const el = await p.$('#epiCtx'); await el.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}ctx-${w}.png` });
    await p.goto('http://127.0.0.1:8780/#alr'); await p.waitForTimeout(1000);
    console.log(' alert:', (await p.textContent('#alertStats')).replace(/\s+/g, ' ').slice(0, 400));
    await p.screenshot({ path: `${OUT}alr-${w}.png` });
    await p.goto('http://127.0.0.1:8780/#idx'); await p.waitForTimeout(3000);
    await p.evaluate(() => { const r = document.querySelector('#ixTable tbody tr'); r && r.click(); }); await p.waitForTimeout(1000);
    console.log(' ix:', (await p.$$eval('#ixEpiCtx tr', (r) => r.map((x) => x.innerText.replace(/\s+/g, ' ')))).join(' | '));
    const ov = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
    console.log(' overflow', ov, 'errori', log.join(' ; ') || 'nessuno');
    await ctx.close();
  }
  await b.close();
})();
