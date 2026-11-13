// Livello blu cambiato nella vista 6: la vista 8 (già aperta prima) mostra il nuovo livello, l'asterisco e lo stato coerente
const { chromium, check, summary, open, waitEmg } = require('./lib.cjs');
(async () => {
  const browser = await chromium.launch();
  const { ctx, page, errors } = await open(browser, { hash: 'emg-IBOV' });
  await waitEmg(page); await page.waitForTimeout(300);
  const before = await page.$eval('#emTable tr[data-em="IBOV"]', (tr) => ({ blu: tr.querySelector('.c-blue').innerText, st: tr.querySelector('.c-state').innerText }));
  await page.click('#emOpenIx');
  await page.waitForFunction(() => /IBOV/.test(document.getElementById('ixTitle').textContent));
  for (let i = 0; i < 10; i++) { await page.click('#ixBluePlus'); await page.waitForTimeout(60); }
  const ix = await page.evaluate(() => ({ val: document.getElementById('ixBlueVal').textContent, badge: document.getElementById('ixBadge').innerText }));
  await page.keyboard.press('8'); await page.waitForTimeout(600);
  const after = await page.$eval('#emTable tr[data-em="IBOV"]', (tr) => ({ blu: tr.querySelector('.c-blue').innerText, st: tr.querySelector('.c-state').innerText }));
  const det = await page.evaluate(() => ({ meta: document.getElementById('emDMeta').textContent, state: document.getElementById('emState').innerText }));
  check('vista 8: livello blu di IBOV aggiornato con l\'asterisco', after.blu.replace('*', '').trim() === ix.val.trim() && after.blu.includes('*'), { before, ix, after });
  check('vista 8: stato di IBOV uguale a quello della vista 6', after.st.trim().toUpperCase() === ix.badge.trim().toUpperCase(), { ix: ix.badge, after: after.st });
  check('vista 8: dettaglio con il nuovo livello', det.meta.includes('livello blu ' + ix.val.trim()), det);
  // ripristino
  await page.click('#emOpenIx'); await page.waitForTimeout(500);
  if (await page.isVisible('#ixBlueReset')) await page.click('#ixBlueReset');
  check('console pulita', errors.length === 0, errors);
  await ctx.close(); await browser.close();
  summary('k-livello-blu');
})().catch((e) => { console.error(e); process.exit(1); });
