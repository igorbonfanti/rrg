// Collegamento vista 6 → vista 8: presente per i 7 emergenti, assente per gli altri indici; porta all'indice giusto
const { chromium, BASE, check, summary, open, waitEmg } = require('./lib.cjs');
(async () => {
  const browser = await chromium.launch();
  const { ctx, page, errors } = await open(browser, { hash: 'idx' });
  await page.waitForFunction(() => document.querySelector('#ixTable tbody tr'), null, { timeout: 30000 });
  for (const k of ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM', 'DAX', 'NDX', 'N225']) {
    await page.fill('#cmd', k); await page.press('#cmd', 'Enter'); await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({ title: document.getElementById('ixTitle').textContent, links: [...document.querySelectorAll('#v-idx a')].filter((a) => a.offsetParent && /vista 8|Emergenti/i.test(a.textContent)).map((a) => a.getAttribute('href')) }));
    const emg = ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM'].includes(k);
    if (!r.title.startsWith(k)) { check(`vista 6: ${k} aperto`, false, r.title); continue; }
    check(`vista 6 ${k}: collegamento alla vista 8 ${emg ? 'presente e giusto' : 'assente'}`, emg ? r.links.length === 1 && r.links[0] === '#emg-' + k : r.links.length === 0, r);
  }
  // il collegamento porta alla vista 8 sull'indice
  await page.fill('#cmd', 'TWN'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(700);
  await page.locator('#v-idx a', { hasText: /vista 8/ }).click();
  await waitEmg(page); await page.waitForTimeout(300);
  check('il collegamento di TWN apre la vista 8 su TWN', /^TWN/.test(await page.textContent('#emTitle')) && page.url().endsWith('#emg-TWN'), [page.url(), await page.textContent('#emTitle')]);
  check('console pulita', errors.length === 0, errors);
  await ctx.close(); await browser.close();
  summary('j-vista6');
})().catch((e) => { console.error(e); process.exit(1); });
