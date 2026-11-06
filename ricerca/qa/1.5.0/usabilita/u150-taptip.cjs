// Telefono: le spiegazioni (title) dei riquadri, della pillola «robusto» e dell'asterisco si aprono al tocco?
// Uso: NODE_PATH=$(npm root -g) node u150-taptip.cjs [base]
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:8798/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem('sm.introSeen', 'true'));
  const p = await ctx.newPage();
  const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '#vix'); await p.waitForFunction(() => !document.getElementById('vxBody').hidden, null, { timeout: 30000 });
  const tt = () => p.evaluate(() => { const t = document.querySelector('.taptip'); return t && !t.hidden ? t.textContent.slice(0, 90) : null; });
  await p.tap('#vxKpis .kpi:nth-child(4)'); await p.waitForTimeout(200);
  const kpi = await tt();
  await p.screenshot({ path: path.join(__dirname, 'shots', 'm390-taptip-kpi.png') });
  await p.evaluate(() => document.getElementById('vxTable').scrollIntoView({ block: 'center' }));
  await p.tap('#vxTable .vxrob'); await p.waitForTimeout(200);
  const rob = await tt();
  const sel = await p.evaluate(() => document.querySelector('#vxTable tr.sel')?.dataset.x);
  await p.tap('#vxTable tr[data-x="25"] td:first-child'); await p.waitForTimeout(200);
  await p.evaluate(() => document.getElementById('vxEps').scrollIntoView({ block: 'center' }));
  const star = await p.$('#vxEps .loc');
  let st = null;
  if (star) { await star.tap(); await p.waitForTimeout(200); st = await tt(); }
  console.log(JSON.stringify({ kpi, rob, selAfterPill: sel, star: st, errs }, null, 1));
  console.log(kpi && rob && (!star || st) ? 'OK spiegazioni al tocco' : 'FAIL spiegazioni al tocco');
  await b.close();
})();
