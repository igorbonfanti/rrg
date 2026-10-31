const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/v080/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h, light] of [[1440, 900, false], [390, 844, false], [1440, 900, true], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    await ctx.addInitScript((light) => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); } catch {} }, light);
    const p = await ctx.newPage(); const log = [];
    p.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); }); p.on('pageerror', (e) => log.push(e.message));
    await p.goto('http://127.0.0.1:8790/#tit-XLK'); await p.waitForTimeout(2500);
    const note = await p.textContent('#titHistNote');
    const el = await p.$('#titHistPanel'); await el.scrollIntoViewIfNeeded();
    const bb = await (await p.$('#titHist')).boundingBox();
    if (w > 500) await p.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5); else await p.touchscreen.tap(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5);
    await p.waitForTimeout(300);
    const tip = await p.evaluate(() => { const t = document.querySelector('#titHistTip'); return t.hidden ? 'nascosto' : t.innerText.replace(/\s+/g, ' '); });
    const ov = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
    await el.screenshot({ path: `${OUT}hist-${light ? 'l' : 'd'}-${w}.png` });
    // cambio periodo e settore
    await p.click('#titPerSeg button[data-per="1A"]'); await p.waitForTimeout(300);
    const n1 = await p.textContent('#titHistNote');
    console.log(w, light ? 'chiaro' : 'scuro', '|', note, '| tip:', tip, '| 1A:', n1.slice(0, 80), '| overflow', ov, '| errori', log.join(';') || 'nessuno');
    await ctx.close();
  }
  await b.close();
})();
