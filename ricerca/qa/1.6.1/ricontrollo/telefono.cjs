// Ricontrollo 1.6.1: sul telefono, toccando le voci in fondo all'elenco delle crisi (lungo 410 px), quanto dello scatter resta
// sullo schermo e dove finisce la scritta «nessun episodio». Uso: BASE=http://127.0.0.1:8804/ NODE_PATH=$(npm root -g) node …/telefono.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8804/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h, theme] of [[390, 844, 'dark'], [360, 780, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await ctx.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(400);
    await p.locator('#vxTable tr[data-x="40"]').tap(); await p.waitForTimeout(200);
    for (const key of ['1990 Golfo', '2018 volatilità/Fed', '2025 dazi']) {
      const btn = p.locator(`#vxCrises button[data-g="${key}"]`);
      await btn.evaluate((e) => e.scrollIntoView({ block: 'end' })); // chi scorre fino alla voce: la voce in basso sullo schermo
      await btn.tap(); await p.waitForTimeout(200);
      const r = await p.evaluate(() => { const s = document.getElementById('vxScatter').getBoundingClientRect(), n = document.getElementById('vxEpsNone'), nb = n.getBoundingClientRect();
        return { vis: Math.max(0, Math.min(s.bottom, innerHeight) - Math.max(s.top, 0)) / s.height, none: n.hidden ? null : (nb.top >= 0 && nb.bottom <= innerHeight ? 'visibile' : 'fuori schermo') }; });
      console.log(`${w}-${theme} voce «${key}» toccata in fondo allo schermo: scatter visibile ${(r.vis * 100).toFixed(0)}%, scritta ${r.none || 'assente'}`);
      if (key === '2025 dazi') await p.screenshot({ path: path.join(__dirname, 'shots', `${w}-${theme}-tocco-voce-dazi.png`) });
    }
    await ctx.close();
  }
  await b.close();
})();
