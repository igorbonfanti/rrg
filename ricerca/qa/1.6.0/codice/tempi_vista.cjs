// Tempi della vista VIX nel browser: apertura (#vix fino ai riquadri), cambio di periodo (renderChart), con e senza
// rallentamento della CPU (x4, telefono). Uso: BASE=http://127.0.0.1:8796/ NODE_PATH=/opt/node-tools/node_modules node tempi_vista.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8796/';
(async () => {
  const b = await chromium.launch();
  for (const [name, opt, cpu] of [['1440', { viewport: { width: 1440, height: 900 } }, 1], ['390 cpu x4', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 4]]) {
    const c = await b.newContext(opt);
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    const t0 = Date.now();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 60000 });
    const open = Date.now() - t0;
    const r = [];
    for (const rg of ['MAX', '3A', '10A', 'MAX']) {
      const ms = await p.evaluate(async (rg) => { const btn = document.querySelector(`#vxRange button[data-range="${rg}"]`); const t = performance.now(); btn.click(); await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 0))); return performance.now() - t; }, rg);
      r.push(`${rg} ${ms.toFixed(0)} ms`);
    }
    const lt = await p.evaluate(() => performance.getEntriesByType('longtask') ? 0 : 0);
    console.log(`${name}: apertura ${open} ms; cambio periodo: ${r.join(', ')}; kpi ${await p.locator('#vxKpis .kpi').count()}; errori ${errs.length} ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();
})();
