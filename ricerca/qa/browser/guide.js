const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/v080/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h, light] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    await ctx.addInitScript((light) => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); } catch {} }, light);
    const p = await ctx.newPage(); const log = [];
    p.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); }); p.on('pageerror', (e) => log.push(e.message));
    // dalla vista 3 la guida rapida porta alla sezione Bottom Map
    await p.goto('http://127.0.0.1:8790/#btm'); await p.waitForTimeout(1500);
    await p.keyboard.press('?'); await p.waitForTimeout(300);
    const href = await p.getAttribute('#guideLink', 'href');
    await p.goto('http://127.0.0.1:8790/' + href); await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ ver: document.getElementById('gVer').textContent, top: Math.round(document.getElementById('btm').getBoundingClientRect().top), sections: document.querySelectorAll('.g-main section').length, words: document.querySelector('.g-main').innerText.split(/\s+/).length, ov: document.scrollingElement.scrollWidth - innerWidth, dead: [...document.querySelectorAll('.g-toc a, .g-main a[href^="#"]')].filter((a) => !document.querySelector(a.getAttribute('href'))).map((a) => a.getAttribute('href')) }));
    console.log(w, light ? 'chiaro' : 'scuro', 'link', href, JSON.stringify(r), 'errori', log.join(';') || 'nessuno');
    await p.screenshot({ path: `${OUT}guide-${w}.png` });
    await ctx.close();
  }
  await b.close();
})();
