// Cosa mostra l'app nel browser (commit 9a81dd8 servito in locale): tabellone del Monitor, tabella Prezzi della
// rotazione (settori S&P 500, MAG7, asset class in euro, asset reali), tabellone degli indici (tutti i 22), scheda dei
// cali forti dell'S&P 500. Scrive $QA98/b1_app.json; il confronto con i ricalcoli è in b2_compare.py.
// Uso: node ricerca/qa/server/gzserve.mjs <albero 9a81dd8> 8831 &  poi  NODE_PATH=$(npm root -g) node b1_app.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8831/';
const W = process.env.QA98 || '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa98';
const cells = (id) => (document.getElementById(id) ? [...document.getElementById(id).tBodies[0].rows].map((r) => [...r.cells].map((c) => c.innerText.replace(/\s+/g, ' ').trim())) : null);
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  const out = {};
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'it-IT', timezoneId: 'Europe/Rome' });
    await ctx.addInitScript((theme) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', theme); } } catch {} }, theme);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    const o = (out[theme] = { errors: errs });
    await page.goto(BASE + '#mon'); await page.waitForTimeout(3000);
    o.monitor = await page.evaluate(cells, 'boardTable');
    o.monitorMeta = await page.evaluate(() => [...document.querySelectorAll('#view-mon .meta, #view-mon .kpi, #asOf, #dataBadge, header')].map((x) => x.innerText.replace(/\s+/g, ' ')).slice(0, 6));
    // rotazione, tabella Prezzi, per alcuni universi
    await page.goto(BASE + '#rrg'); await page.waitForTimeout(3000);
    const sel = await page.evaluate(() => [...document.querySelectorAll('select')].filter((s) => s.offsetParent).map((s) => ({ id: s.id, opts: [...s.options].map((x) => x.value + '=' + x.text) })));
    o.selects = sel;
    await page.click('button:text-is("Prezzi")'); await page.waitForTimeout(800);
    o.prices = {};
    const uni = sel.find((s) => s.opts.some((x) => /Settori/.test(x)));
    for (const opt of uni ? uni.opts : []) {
      const v = opt.split('=')[0];
      await page.selectOption('#' + uni.id, v); await page.waitForTimeout(1500);
      const pr = await page.$('button:text-is("Prezzi")'); if (pr) { await pr.click(); await page.waitForTimeout(600); }
      o.prices[opt] = { head: await page.evaluate(() => document.getElementById('monTable').tHead.innerText.replace(/\s+/g, ' ')), rows: await page.evaluate(cells, 'monTable'),
        note: await page.evaluate(() => (document.getElementById('pxCopied') || {}).textContent || '') };
    }
    // indici: tutti i 22
    await page.goto(BASE + '#idx'); await page.waitForTimeout(4000);
    await page.click('#ixPickAll'); await page.waitForTimeout(2500);
    o.indices = await page.evaluate(cells, 'ixTable');
    o.indicesTitles = await page.evaluate(() => [...document.getElementById('ixTable').tBodies[0].rows].map((r) => [r.dataset.ix, (r.querySelector('.c-last') || {}).title || '']));
    o.ixMeta = await page.evaluate(() => (document.getElementById('ixMeta') || {}).textContent);
    await ctx.close();
  }
  fs.writeFileSync(W + '/b1_app.json', JSON.stringify(out, null, 1));
  console.log('errori console:', JSON.stringify(out.dark.errors), JSON.stringify(out.light.errors));
  console.log('monitor', out.dark.monitor.length, 'righe; indici', out.dark.indices.length, 'righe; universi prezzi', Object.keys(out.dark.prices));
  await b.close();
})();
