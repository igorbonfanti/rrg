// Testi «di nota» che non sono in p.note: legenda degli stati (Monitor), regole (Alert), nota della storia del SOXX (Settore).
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8871/';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const w = (t) => (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%\/-]*/gu) || []).length;
  const get = (sel) => p.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, ' ').trim()), sel);
  await p.goto(BASE + '#mon'); await p.waitForSelector('#stateLegend > div'); await p.waitForTimeout(500);
  const out = { stateLegend: await get('#stateLegend > div'), changes: await get('#changes') };
  await p.evaluate(() => { location.hash = '#alr'; }); await p.waitForSelector('#rulesList li'); out.rules = await get('#rulesList li');
  await p.evaluate(() => { location.hash = '#SOXX'; }); await p.waitForTimeout(2500); out.soxx = await get('#secQuality');
  for (const k in out) out[k] = out[k].map((t) => ({ words: w(t), text: t }));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
