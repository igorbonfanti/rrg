// H2. Tra 1101 e 1440 px: il tabellone della vista 8 scorre di lato dentro il suo riquadro? (larghezza nascosta, colonne tagliate)
const { chromium, SHOTS, openPage, waitEmg } = require('./lib.cjs');
(async () => { const b = await chromium.launch();
  for (const w of [1101, 1150, 1200, 1250, 1280, 1300, 1366, 1400, 1439]) { const { ctx, page } = await openPage(b, { width: w, height: 900, hash: '#emg' }); await waitEmg(page);
    const r = await page.evaluate(() => { const t = document.querySelector('#emTable').closest('.tscroll'); const hidden = [...document.querySelectorAll('#emTable thead th')].filter((th) => th.getBoundingClientRect().right > t.getBoundingClientRect().right + 1).map((th) => th.innerText.replace(/\n/g, ' ')); return { over: t.scrollWidth - t.clientWidth, hidden }; });
    console.log(w, JSON.stringify(r)); if (w === 1101 || w === 1200) await page.locator('#emTable').locator('..').screenshot({ path: `${SHOTS}h-tabellone-${w}.png` }); await ctx.close(); }
  await b.close(); })();
