// 820 px (tablet, tocco): colonna, niente scorrimento orizzontale, riquadro su una barra, schermata. Uso come profilo.cjs.
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8917/';
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const theme of ['dark', 'light']) {
    const c = await b.newContext({ viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true });
    await c.addInitScript((t) => { localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); }, theme);
    const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tbody tr.athr');
    for (const id of ['SPX', 'GOLD', 'COPPER']) {
      await p.locator(`#athTable tr.athr[data-id="${id}"]`).tap(); await p.waitForTimeout(400);
      const g = await p.evaluate(() => { const s = document.getElementById('athChart'), col = s.querySelector('.vpcol'), px = s.querySelector('.athpx').getBBox(); const bars = [...s.querySelectorAll('.vpbar')]; const big = bars.reduce((a, e) => (+e.getAttribute('width') > +a.getAttribute('width') ? e : a)); const r = big.getBoundingClientRect(); return { col: col ? +col.getAttribute('width') : 0, colx: col ? +col.getAttribute('x') : 0, pxr: px.x + px.width, n: bars.length, sx: document.documentElement.scrollWidth - document.documentElement.clientWidth, tx: r.left + Math.max(2, r.width / 2), ty: r.top + r.height / 2 }; });
      await p.touchscreen.tap(g.tx, g.ty); await p.waitForTimeout(150);
      const t = await p.evaluate(() => { const e = document.getElementById('athTip'), r = e.getBoundingClientRect(); return { h: e.hidden, txt: e.textContent.slice(0, 60), ok: r.left >= 0 && r.right <= innerWidth }; });
      const good = g.col >= 44 && g.pxr < g.colx && g.sx <= 0 && !t.h && t.ok && /Volume degli ultimi 12 mesi/.test(t.txt);
      if (!good) fail++;
      console.log(`${good ? 'OK  ' : 'FAIL'} 820-${theme} ${id}: colonna ${g.col}, barre ${g.n}, scorrimento ${g.sx}, riquadro «${t.txt}»`);
      await p.locator('#athChartBox').screenshot({ path: path.join(__dirname, 'shots', `tablet-820-${theme}-${id}.png`) });
      await p.locator(`#athTable tr.athr[data-id="${id}"]`).tap(); await p.waitForTimeout(100);
    }
    if (errs.length) { fail++; console.log('FAIL errori', errs); }
    await c.close();
  }
  await b.close(); console.log(fail ? `${fail} FAIL` : '0 FAIL'); process.exit(fail ? 1 : 0);
})();
