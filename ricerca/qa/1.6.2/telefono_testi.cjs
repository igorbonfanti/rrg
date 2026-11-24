// Fase 3 · 1.6.2 · telefono (390, tocco): riquadro dei valori su un punto grande a ogni soglia, testo di #vxScBig, screenshot
// della tabella degli episodi a 20 (riga 2024 carry yen con il massimo del 2025). Uso: BASE=... NODE_PATH=$(npm root -g) node ...
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8805/', OUT = process.env.OUT || 'ricerca/qa/1.6.2';
(async () => {
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark'], ['1440-chiaro', { viewport: { width: 1440, height: 900 } }, 'light']]) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(500);
    for (const X of [20, 25, 30, 40, 50]) {
      const row = p.locator(`#vxTable tr[data-x="${X}"]`); if (opt.hasTouch) await row.tap(); else await row.click(); await p.waitForTimeout(250);
      console.log(name, X, 'vxScBig:', await p.textContent('#vxScBig'));
      const big = await p.$$eval('#vxScatter circle.vxpt.start', (cs) => cs.map((x) => [x.dataset.d, +x.getAttribute('cx'), +x.getAttribute('cy')]));
      const q = big[big.length - 1];
      await p.evaluate(() => document.getElementById('vxScatter').scrollIntoView({ block: 'center' }));
      const scr = await p.evaluate(([cx, cy]) => { const s = document.getElementById('vxScatter'); const pt = s.createSVGPoint(); pt.x = cx; pt.y = cy; const r = pt.matrixTransform(s.getScreenCTM()); return [r.x, r.y]; }, [q[1], q[2]]);
      if (opt.hasTouch) await p.touchscreen.tap(scr[0], scr[1]); else { await p.mouse.move(scr[0], scr[1]); await p.mouse.click(scr[0], scr[1]); }
      await p.waitForTimeout(200);
      console.log('   tocco su', q[0], '→', (await p.textContent('#vxScTip')).replace(/\s+/g, ' '), '| crisi accesa:', await p.$$eval('#vxCrises button[aria-pressed="true"]', (bs) => bs.map((x) => x.textContent).join()));
      if (X === 20) await p.locator('#vxEps').screenshot({ path: `${OUT}/episodi20-${name}.png` });
      if (X === 40) await p.locator('#vxScWrap').screenshot({ path: `${OUT}/scatter40-${name}.png` });
      if (opt.hasTouch) await p.touchscreen.tap(5, 5);
      await p.keyboard.press('Escape');
    }
    console.log(name, 'errori:', errs.join(' | ') || 'nessuno');
    await c.close();
  }
  await b.close();
})();
