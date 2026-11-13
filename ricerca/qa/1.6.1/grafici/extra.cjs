// Controlli in più (1.6.1): selezione che resta cambiando soglia, indice e periodo; tastiera; riquadro al bordo destro sul telefono.
// Uso: BASE=http://127.0.0.1:8801/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/grafici/extra.cjs
const { chromium } = require('playwright'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8801/';
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const st = (p) => p.evaluate(() => ({ halo: document.querySelectorAll('#vxScatter g.vxhalos circle').length, pressed: [...document.querySelectorAll('#vxCrises button[aria-pressed="true"]')].map((b) => b.dataset.g), sel: [...document.querySelectorAll('#vxEps tr.sel')].map((r) => r.cells[0].textContent) }));
(async () => {
  const b = await chromium.launch();
  {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(400);
    await p.click('#vxCrises button[data-g="2020 Covid"]'); await p.waitForTimeout(100);
    let s = await st(p); ok(s.halo === 84 && s.sel.length >= 1, `Covid: alone ${s.halo}, righe ${s.sel.join(' ')}`);
    await p.click('#vxTable tr[data-x="50"]'); await p.waitForTimeout(150); s = await st(p); ok(s.halo === 84 && s.sel.join() === '09/03/2020', `soglia 50: selezione resta, righe ${s.sel.join(' ')}`);
    await p.click('#vxIx button[data-ix="NDX"]'); await p.waitForTimeout(300); s = await st(p); ok(s.halo === 84 && s.pressed.join() === '2020 Covid', `Nasdaq-100: selezione resta (alone ${s.halo}, righe ${s.sel.join(' ')})`);
    const rb = await p.$$('#vxRange button'); if (rb.length) { await rb[0].click(); await p.waitForTimeout(300); s = await st(p); ok(s.halo === 84, `periodo ${await rb[0].textContent()}: selezione resta`); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    const r = p.locator('#vxEps tbody tr[data-g]').first(); await r.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(100); s = await st(p);
    ok(s.halo > 0, `Invio su una riga: alone ${s.halo}`);
    await c.close();
  }
  for (const [w, theme] of [[360, 'light'], [390, 'dark']]) {
    const c = await b.newContext({ viewport: { width: w, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(400);
    await p.locator('#vxScatter').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const xy = await p.evaluate(() => { const cs = [...document.querySelectorAll('#vxScatter g.vxdots circle')]; const m = cs.reduce((a, x) => (+x.getAttribute('cx') > +a.getAttribute('cx') ? x : a)); const r = m.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await p.touchscreen.tap(xy[0], xy[1]); await p.waitForTimeout(200);
    const tb = await p.locator('#vxScTip').boundingBox();
    ok(tb && tb.x >= 0 && tb.x + tb.width <= w, `${w}: riquadro al bordo destro dentro lo schermo (${tb && Math.round(tb.x)}–${tb && Math.round(tb.x + tb.width)} su ${w})`);
    console.log('     ', JSON.stringify(await p.locator('#vxScTip').innerText()));
    await p.locator('#vxScWrap').screenshot({ path: path.join(__dirname, `shots/${w}-${theme === 'light' ? 'chiaro' : 'scuro'}-tocco-bordo.png`) });
    const lg = await p.locator('#vxCrises').boundingBox(), sc = await p.locator('#vxScatter').boundingBox();
    console.log(`     ${w}: altezza dell'elenco delle crisi ${Math.round(lg.height)} px, del grafico ${Math.round(sc.height)} px`);
    await c.close();
  }
  await b.close(); console.log(fail ? `${fail} FAIL` : 'tutto OK'); process.exit(fail ? 1 : 0);
})();
