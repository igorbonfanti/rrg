// Etichetta della fascia grigia del pannello del credito a MAX. Uso: BASE=http://127.0.0.1:<porta>/ NODE_PATH=/opt/node-tools/node_modules node etichetta_credito.cjs
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
 await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('vxRange', JSON.stringify('MAX')); } catch {} });
 const p = await c.newPage(); await p.goto('' + (process.env.BASE || 'http://127.0.0.1:8796/') + '#vix'); await p.waitForSelector('#vxKpis .kpi'); await p.click('#vxRange button[data-range="MAX"]'); await p.waitForTimeout(500);
 console.log(await p.$$eval('#vxChart text.axt', (t) => t.map((x) => x.textContent).filter((s) => /dal/.test(s))));
 await b.close(); })();
