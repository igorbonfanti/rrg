const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(); await p.goto('http://127.0.0.1:8807/#vix'); await p.waitForSelector('#vxEps tbody tr', { timeout: 30000 });
    await p.click('#vxTable tr[data-x="25"]'); await p.click('#vxRange button[data-range="MAX"]'); await p.waitForTimeout(300);
    const tn = theme === 'light' ? 'chiaro' : 'scuro';
    const ch = await p.$('#vxChart'); await ch.scrollIntoViewIfNeeded(); const bb = await ch.boundingBox();
    const fr = await p.evaluate(() => { const s = document.getElementById('vxChart'); const vb = s.getAttribute('viewBox').split(' ').map(Number); const f = [...s.querySelectorAll('rect.frame')][1]; return { W: vb[2], H: vb[3], y: +f.getAttribute('y'), h: +f.getAttribute('height') }; });
    const k = bb.width / fr.W;
    await p.screenshot({ path: `${OUT}/zoom-SPX-25-MAX-pannello-indice-1440-${tn}.png`, clip: { x: bb.x, y: bb.y + (fr.y - 20) * k, width: bb.width, height: (fr.h + 26) * k } });
    await p.click('#vxRange button[data-range="10A"]'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/zoom-SPX-25-10A-pannello-indice-1440-${tn}.png`, clip: { x: bb.x, y: bb.y + (fr.y - 20) * k, width: bb.width, height: (fr.h + 26) * k } });
    // legenda
    await (await p.$('#vxLegend')).screenshot({ path: `${OUT}/legenda-1440-${tn}.png` });
    await c.close();
  }
  await b.close();
})();
