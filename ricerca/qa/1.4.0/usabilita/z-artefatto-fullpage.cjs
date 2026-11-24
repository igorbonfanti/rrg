// Nota di metodo: in Playwright uno screenshot fullPage spegne l'emulazione di (pointer: coarse), quindi le regole CSS
// per il dito (min-height 34 px) smettono di valere. Le misure dei bersagli del tocco vanno prese prima di quegli screenshot.
const { chromium, open, waitEmg } = require('./lib.cjs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const { page } = await open(browser, { width: 390, height: 844, mobile: true });
  const m = async (l) => console.log(l, await page.evaluate(() => [matchMedia('(pointer: coarse)').matches, [...document.querySelectorAll('#emRange button')].map((e) => Math.round(e.getBoundingClientRect().height))]));
  await page.tap('#tab-emg'); await waitEmg(page); await m('dopo il tocco sulla scheda 8:');
  await page.screenshot({ path: path.join(__dirname, 'shots', 'artefatto-fullpage.png'), fullPage: true });
  await m('dopo uno screenshot fullPage:');
  await browser.close();
})();
