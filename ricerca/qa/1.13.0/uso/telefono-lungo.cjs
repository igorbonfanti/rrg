// Riquadro più lungo (regole degli stati) a 360×740 e 390×844: quanto schermo copre, dove si può toccare per chiuderlo.
const path = require('path');
const { chromium, NEW, ctx, pop } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 390]) {
    const c = await ctx(b, w, 'dark'); const p = await c.newPage();
    await p.goto(NEW + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 }); await p.waitForTimeout(500);
    const bt = p.locator('button[data-src="stateHelp"]'); await bt.scrollIntoViewIfNeeded(); await bt.tap(); await p.waitForTimeout(250);
    const q = await pop(p);
    const ob = await p.evaluate(() => getComputedStyle(document.getElementById('infopop')).overscrollBehavior);
    console.log(`${w}: riquadro ${Math.round(q.l)}–${Math.round(q.r)} × ${Math.round(q.top)}–${Math.round(q.b)} su ${q.vw}×${q.vh}, contenuto ${q.sh} px visibile ${q.ch} (${Math.round(q.h / q.vh * 100)}% dell'altezza), overscroll-behavior ${ob}; × di chiusura: ${await p.evaluate(() => !!document.querySelector('#infopop button'))}`);
    await p.screenshot({ path: path.join(__dirname, 'shots', 'int', `riquadro-lungo-${w}.png`) });
    // tocco sul riquadro stesso: resta aperto; tocco nel margine laterale: si chiude
    await p.touchscreen.tap(q.vw / 2, (q.top + q.b) / 2); await p.waitForTimeout(200);
    const still = !!(await pop(p));
    await p.touchscreen.tap(5, q.vh / 2); await p.waitForTimeout(200);
    console.log(`${w}: tocco sul riquadro → aperto ${still}; tocco nel margine di 12 px a sinistra → aperto ${!!(await pop(p))}`);
    await c.close();
  }
  await b.close();
})();
