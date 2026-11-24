// 1.13.0, correzioni dal controllo d'uso: D1 (tasto di vista chiude il riquadro), D2 (× e altezza al telefono), M1 (Tab nel riquadro). Uso: server su 8794, NODE_PATH=$(npm root -g) node ricerca/qa/1.13.0/fix-info.cjs
const { chromium } = require('playwright');
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  // D1: tasto di vista con riquadro aperto
  { const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); await c.addInitScript(() => localStorage.setItem('sm.introSeen', 'true'));
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://127.0.0.1:8794/#vix'); await p.waitForSelector('#v-vix button.info', { timeout: 30000 }); await p.waitForTimeout(800);
    const btn = p.locator('#v-vix button.info').first(); await btn.click(); await p.waitForTimeout(200);
    ok(await p.isVisible('#infopop'), 'riquadro aperto');
    await p.mouse.click(5, 300); await p.waitForTimeout(100); await btn.click(); await p.waitForTimeout(150);
    await p.keyboard.press('3'); await p.waitForTimeout(400);
    ok(!(await p.isVisible('#infopop')) && (await btn.getAttribute('aria-expanded')) === 'false', 'tasto 3: riquadro chiuso, aria-expanded false');
    // M1: Tab entra nel riquadro, fino al link, poi torna al bottone
    await p.keyboard.press('8'); await p.waitForTimeout(500);
    await btn.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    await p.keyboard.press('Tab'); const f1 = await p.evaluate(() => document.activeElement.className);
    await p.keyboard.press('Tab'); const f2 = await p.evaluate(() => document.activeElement.textContent);
    await p.keyboard.press('Tab'); const f3 = await p.evaluate(() => document.activeElement.className);
    ok(f1 === 'infopop-x' && /Nella guida/.test(f2) && f3 === 'info' && !(await p.isVisible('#infopop')), `Tab: × (${f1}) → link (${f2}) → chiude e torna al bottone (${f3})`);
    ok(!errs.length, 'console ' + errs.join('|')); await c.close(); }
  // D2: telefono, riquadro lungo, chiusura con ×
  { const c = await b.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }); await c.addInitScript(() => localStorage.setItem('sm.introSeen', 'true'));
    const p = await c.newPage(); await p.goto('http://127.0.0.1:8794/#mon'); await p.waitForSelector('button.info[data-src="stateHelp"]', { timeout: 30000 }); await p.waitForTimeout(800);
    await p.locator('button.info[data-src="stateHelp"]').tap(); await p.waitForTimeout(300);
    const r = await p.$eval('#infopop', (x) => x.getBoundingClientRect().height);
    ok(r <= 780 * 0.7 + 1, `altezza del riquadro ${Math.round(r)} px su 780`);
    await p.screenshot({ path: '/home/user/rrg/ricerca/qa/1.13.0/fix-riquadro-360.png' });
    await p.locator('#infopop .infopop-x').tap(); await p.waitForTimeout(200);
    ok(!(await p.isVisible('#infopop')), '× chiude il riquadro al tocco'); await c.close(); }
  await b.close(); console.log(fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
