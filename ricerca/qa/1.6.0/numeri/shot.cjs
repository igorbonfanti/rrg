const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const p = await c.newPage(); await p.goto('http://127.0.0.1:8792/#vix'); await p.waitForSelector('#vxKpis .kpi'); await p.waitForTimeout(800);
  await (await p.$('#vxKpis')).screenshot({ path: path.join(__dirname, 'vix-riquadri.png') });
  await (await p.$('#vxWrap')).screenshot({ path: path.join(__dirname, 'vix-grafico.png') }); await b.close(); })();
