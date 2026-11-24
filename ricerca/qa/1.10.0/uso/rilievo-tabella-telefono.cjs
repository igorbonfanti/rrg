const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await c.addInitScript(() => { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', 'light'); });
  const p = await c.newPage(); await p.goto('' + (process.env.BASE || 'http://127.0.0.1:8836/') + '#vix'); await p.waitForSelector('#athTable tr.athr');
  const r = await p.evaluate(() => {
    const ts = document.querySelector('#athPanel .tscroll'), tr = ts.getBoundingClientRect();
    const out = [];
    for (const e of ts.querySelectorAll('*')) { const q = e.getBoundingClientRect(); if (q.right > tr.right + 0.5) out.push([e.tagName, e.className, q.left.toFixed(1), q.right.toFixed(1), getComputedStyle(e).boxSizing, getComputedStyle(e).paddingLeft, getComputedStyle(e).width]); }
    return { ts: [tr.left, tr.right, ts.scrollWidth, ts.clientWidth], out: out.slice(0, 12), other: [...document.querySelectorAll('.tscroll')].filter((x) => x.scrollWidth > x.clientWidth + 1 && x.offsetParent).map((x) => x.querySelector('table') && x.querySelector('table').id + ' ' + x.scrollWidth + '/' + x.clientWidth) };
  });
  console.log(JSON.stringify(r, null, 1));
  await p.locator('#athTable').scrollIntoViewIfNeeded();
  await p.evaluate(() => { document.querySelector('#athPanel .tscroll').scrollLeft = 50; });
  await p.locator('#athPanel').screenshot({ path: '/home/user/rrg/ricerca/qa/1.10.0/uso/shots/rilievo-360-tabella-scorre.png' });
  await b.close();
})();
