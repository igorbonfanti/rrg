// Telefono: cosa si vede della tabella degli episodi senza scorrere di lato, e dopo lo scorrimento; grafico in fondo.
const { chromium } = require('playwright'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8808/'; const OUT = path.join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch();
  for (const [w, h, theme] of [[390, 844, 'light'], [360, 740, 'dark']]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxEps tbody tr'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const sc = document.querySelector('#vxEps').closest('.tscroll'); const q = sc.getBoundingClientRect(); const sp = document.querySelector('#vxEps tbody svg.vxsp').getBoundingClientRect(); return { sc: [q.left, q.right], sp: [sp.left, sp.right], sticky: getComputedStyle(document.querySelector('#vxEps tbody td')).position }; });
    console.log(w, 'contenitore', r.sc, 'mini-grafico', r.sp, 'quota visibile', ((Math.min(r.sc[1], r.sp[1]) - r.sp[0]) / (r.sp[1] - r.sp[0])).toFixed(2), 'prima colonna', r.sticky);
    await p.evaluate(() => document.querySelector('#vxEpsTitle').scrollIntoView({ block: 'start' })); await p.evaluate(() => scrollBy(0, -60)); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, `tel-${w}-${theme}-episodi-vista.png`) });
    await p.evaluate(() => { document.querySelector('#vxEps').closest('.tscroll').scrollLeft = 9999; }); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, `tel-${w}-${theme}-episodi-scorsa.png`) });
    await p.evaluate(() => { document.querySelector('#vxEps').closest('.tscroll').scrollLeft = 0; });
    await p.evaluate(() => document.querySelector('#vxChart').scrollIntoView({ block: 'start' })); await p.evaluate(() => scrollBy(0, -50)); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, `tel-${w}-${theme}-grafico-vista.png`) });
    await c.close();
  }
  await b.close();
})();
