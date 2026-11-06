// Testi dei riquadri dei valori (scatter e grafico VIX contro realizzata), su computer e telefono.
// Uso: BASE=http://127.0.0.1:8798/ NODE_PATH=/opt/node-tools/node_modules node ricerca/qa/1.5.0/testi/tips_testi.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8798/';
const OUT = path.join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch(); const res = {};
  for (const [name, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const ctx = await b.newContext(opt);
    await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await ctx.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxTable tbody tr', { timeout: 30000 }); await p.waitForTimeout(600);
    await p.locator('#vxScatter').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const pt = await p.$$eval('#vxScatter circle.vxpt.start', (cs) => cs.map((c) => { const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
    const t = pt[pt.length - 3];
    if (opt.hasTouch) await p.touchscreen.tap(t[0], t[1]); else await p.mouse.move(t[0], t[1]);
    await p.waitForTimeout(300);
    res[name + '-scatter'] = await p.evaluate(() => { const x = document.getElementById('vxScTip'); return x.hidden ? null : x.innerText; });
    await p.locator('#vxScWrap').screenshot({ path: path.join(OUT, `scatter-tip-${name}.png`) });
    await p.locator('#vxChart').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const bb = await p.locator('#vxChart').boundingBox();
    const x = bb.x + bb.width * 0.95, y = bb.y + bb.height * 0.3;
    if (opt.hasTouch) await p.touchscreen.tap(x, y); else await p.mouse.move(x, y);
    await p.waitForTimeout(300);
    res[name + '-chart'] = await p.evaluate(() => { const t = document.getElementById('vxTip'); if (t.hidden) return null; const r = t.getBoundingClientRect(), w = document.getElementById('vxWrap').getBoundingClientRect(); return { txt: t.innerText, inside: r.left >= w.left - 1 && r.right <= w.right + 1 }; });
    await p.locator('#vxWrap').screenshot({ path: path.join(OUT, `chart-tip-${name}.png`) });
    res[name + '-legend'] = await p.evaluate(() => document.getElementById('vxLegend').innerText);
    res[name + '-kpiTitles'] = await p.$$eval('#vxKpis .kpi', (k) => k.map((x) => x.title));
    res[name + '-robTitle'] = await p.$eval('#vxTable .vxrob', (x) => x.title);
    await ctx.close();
  }
  await b.close(); console.log(JSON.stringify(res, null, 1));
})();
