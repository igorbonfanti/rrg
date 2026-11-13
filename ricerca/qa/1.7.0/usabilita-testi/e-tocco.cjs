// Telefono: tocco sulle intestazioni con spiegazione (riquadro .taptip) e sul mini-grafico; asterisco del calo.
const { chromium } = require('playwright'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8808/'; const OUT = path.join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 844], [360, 740]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxEps tbody tr'); await p.waitForTimeout(400);
    const tt = () => p.evaluate(() => { const t = document.querySelector('.taptip'); if (!t || t.hidden) return null; const r = t.getBoundingClientRect(); return { txt: t.textContent, in: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
    for (const sel of ['#vxEps thead th:nth-child(1)', '#vxEps thead th.vxspc', '#vxEps thead th:nth-child(4)']) {
      const l = p.locator(sel); await l.scrollIntoViewIfNeeded();
      const vis = await l.isVisible();
      if (!vis) { console.log(w, sel, 'non visibile'); continue; }
      // l'intestazione del mini-grafico può essere fuori dalla parte visibile della tabella: la porto in vista scorrendo il contenitore
      await p.evaluate((s) => { const th = document.querySelector(s), sc = th.closest('.tscroll'); const r = th.getBoundingClientRect(), q = sc.getBoundingClientRect(); if (r.right > q.right) sc.scrollLeft += r.right - q.right + 4; }, sel);
      await l.tap(); await p.waitForTimeout(250);
      const r = await tt(); console.log(w, sel, JSON.stringify(r));
      if (sel.includes('vxspc')) await p.screenshot({ path: path.join(OUT, `tocco-${w}-intestazione-minigrafico.png`) });
      await p.locator('#vxEpsTitle').tap(); await p.waitForTimeout(150);
    }
    // tocco sul mini-grafico: seleziona la crisi o spiega?
    await p.evaluate(() => { document.querySelector('#vxEps').closest('.tscroll').scrollLeft = 0; });
    const sp = p.locator('#vxEps tbody tr').nth(2).locator('svg.vxsp'); await sp.tap({ position: { x: 5, y: 20 } }); await p.waitForTimeout(250);
    console.log(w, 'tocco sul mini-grafico: taptip', JSON.stringify(await tt()), 'riga selezionata', await p.locator('#vxEps tr.sel').count());
    // l'asterisco del calo ha un title: si apre al tocco?
    await p.locator('#vxTable tr[data-x="20"]').tap(); await p.waitForTimeout(250);
    const star = p.locator('#vxEps tbody tr').first().locator('.loc');
    if (await star.count()) { await p.evaluate(() => { document.querySelector('#vxEps').closest('.tscroll').scrollLeft = 9999; }); await star.tap(); await p.waitForTimeout(200); console.log(w, 'asterisco calo', JSON.stringify(await tt())); }
    console.log(w, 'errori', errs);
    await c.close();
  }
  await b.close();
})();
