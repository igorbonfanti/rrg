// Screenshot della tabella degli episodi e del grafico #vxChart (1.7.0) a 1440, 1280, 1024, 390, 360 px, chiaro e scuro.
// Uso: BASE=http://127.0.0.1:8807/ OUT=<cartella shots> NODE_PATH=$(npm root -g) node screenshot.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8807/', OUT = process.env.OUT || 'shots';
(async () => {
  const b = await chromium.launch();
  const meas = [];
  for (const w of [1440, 1280, 1024, 390, 360]) for (const theme of ['light', 'dark']) {
    const mob = w < 500;
    const c = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxEps tbody tr', { timeout: 30000 }); await p.waitForTimeout(500);
    const tap = (s) => (mob ? p.tap(s) : p.click(s));
    const tn = theme === 'light' ? 'chiaro' : 'scuro';
    for (const [ix, X, rg] of [['SPX', 20, 'MAX'], ['SPX', 40, '10A'], ['NDX', 25, '3A']]) {
      if (mob && ix === 'NDX' && w === 360) continue;
      await tap(`#vxIx button[data-ix="${ix}"]`); await p.waitForTimeout(250);
      await tap(`#vxTable tr[data-x="${X}"]`); await p.waitForTimeout(250);
      await tap(`#vxRange button[data-range="${rg}"]`); await p.waitForTimeout(250);
      const tb = await p.$('#vxEps');
      await tb.scrollIntoViewIfNeeded();
      await tb.screenshot({ path: `${OUT}/episodi-${ix}-${X}-${w}-${tn}.png` });
      const ch = await p.$('#vxWrap'); await ch.scrollIntoViewIfNeeded();
      await ch.screenshot({ path: `${OUT}/grafico-${ix}-${X}-${rg}-${w}-${tn}.png` });
      // misure: dimensione reale di un mini-grafico e larghezza della tabella contro il contenitore
      meas.push(await p.evaluate(([w, tn, ix, X]) => {
        const s = document.querySelector('#vxEps svg.vxsp'), r = s.getBoundingClientRect(), t = document.getElementById('vxEps'), pr = t.parentElement.getBoundingClientRect();
        return { w, tn, ix, X, spark: [Math.round(r.width), Math.round(r.height)], table: Math.round(t.getBoundingClientRect().width), wrap: Math.round(pr.width), scroll: t.parentElement.scrollWidth > t.parentElement.clientWidth, page: document.documentElement.scrollWidth > document.documentElement.clientWidth, hiddenCols: [...document.querySelectorAll('#vxEps thead th')].filter((x) => getComputedStyle(x).display === 'none').map((x) => x.textContent) };
      }, [w, tn, ix, X]));
    }
    // riquadro dei valori su una seduta dentro un episodio (SPX 40, 10A, 16/03/2020)
    await tap('#vxIx button[data-ix="SPX"]'); await tap('#vxTable tr[data-x="40"]'); await tap('#vxRange button[data-range="10A"]'); await p.waitForTimeout(250);
    const ch = await p.$('#vxChart'); await ch.scrollIntoViewIfNeeded(); const bb = await ch.boundingBox();
    const xr = await p.evaluate(() => { const s = document.getElementById('vxChart'); const vb = s.getAttribute('viewBox').split(' ').map(Number); const fr = [...s.querySelectorAll('rect.frame')][1]; return { W: vb[2], H: vb[3], y: +fr.getAttribute('y') + 40 }; });
    const t1 = Date.parse('2026-11-06'), t0 = t1 - 10 * 365.25 * 86400000, tx = Date.parse('2020-03-16');
    const px = bb.x + ((8 + ((tx - t0) / (t1 - t0)) * (xr.W - 54)) / xr.W) * bb.width, py = bb.y + (xr.y / xr.H) * bb.height;
    if (mob) await p.touchscreen.tap(px, py); else await p.mouse.move(px, py);
    await p.waitForTimeout(200);
    await p.locator('#vxWrap').screenshot({ path: `${OUT}/riquadro-SPX-40-${w}-${tn}.png` });
    await c.close();
  }
  console.log(JSON.stringify(meas, null, 0));
  await b.close();
})();
