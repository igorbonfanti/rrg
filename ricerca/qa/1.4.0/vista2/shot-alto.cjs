// screenshot della parte alta (barra delle schede) a 360 e 768
const { chromium, SHOTS, openPage } = require('./lib.cjs');
(async () => { const b = await chromium.launch();
  for (const [w, t] of [[360, 'light'], [768, 'dark'], [820, 'light']]) { const { ctx, page } = await openPage(b, { width: w, height: 700, theme: t, touch: true, hash: '#emg' }); await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}e-${w}-${t}-barra.png`, clip: { x: 0, y: 0, width: w, height: 200 } }); await ctx.close(); }
  await b.close(); })();
