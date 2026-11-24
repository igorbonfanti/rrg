// Ricontrollo 1.6.2: tabella degli episodi a 25 (S&P 500) e nota sotto lo scatter, 1440 px (tema predefinito).
// Uso: BASE=http://127.0.0.1:8806/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.2/ricontrollo/screenshot.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const p = await c.newPage(); await p.goto((process.env.BASE || 'http://127.0.0.1:8806/') + '#vix');
  await p.waitForSelector('#vxScatter circle.vxpt'); await p.click('#vxTable tr[data-x="25"]'); await p.waitForTimeout(400);
  await (await p.$('#vxEps')).screenshot({ path: 'ricerca/qa/1.6.2/ricontrollo/episodi25-1440.png' });
  await (await p.$('#vxScBig')).evaluate((e) => e.closest('p').scrollIntoView({ block: 'center' }));
  await (await p.$('#vxScBig')).evaluate((e) => e.closest('p').style.outline = '2px solid red');
  await p.screenshot({ path: 'ricerca/qa/1.6.2/ricontrollo/nota-scatter25-1440.png' });
  await b.close();
})();
