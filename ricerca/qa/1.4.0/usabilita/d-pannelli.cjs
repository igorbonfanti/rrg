// Schermate dei pannelli della vista 8 (telefono 390/360 e tablet 820, chiaro e scuro) per l'esame a vista
const { chromium, open, waitEmg } = require('./lib.cjs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  for (const [width, mobile] of [[390, true], [360, true], [820, true]]) for (const theme of ['dark', 'light']) {
    const { ctx, page } = await open(browser, { width, height: width === 820 ? 1180 : 844, mobile, theme, hash: 'emg-KOSPI200' });
    await waitEmg(page); await page.waitForTimeout(400);
    const panels = await page.$$('#v-emg .panel');
    for (let i = 0; i < panels.length; i++) await panels[i].screenshot({ path: path.join(__dirname, 'shots', `p-${width}-${theme}-${i}.png`) });
    await ctx.close();
  }
  await browser.close();
})();
