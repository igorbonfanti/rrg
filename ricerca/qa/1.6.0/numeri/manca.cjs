// Riquadro VIX / VIX3M quando all'ultima seduta del VIX manca il VIX3M (file mut/v3_manca_ultima.json)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8792/';
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const body = fs.readFileSync(path.join(__dirname, 'mut/v3_manca_ultima.json'), 'utf8');
  await c.route('**/data/vix.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body }));
  const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi'); await p.waitForTimeout(800);
  const k = await p.$$eval('#vxKpis .kpi', (a) => a.map((x) => x.textContent));
  console.log(k.slice(4).join('\n')); console.log(await p.textContent('#vxMeta'));
  await p.click('#vxRange button[data-range="3A"]'); await p.waitForTimeout(300);
  const hb = await p.$$eval('#vxChart rect[fill="transparent"]', (a) => { const r = a.at(-1).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.mouse.move(hb.x + hb.w - 3, hb.y + hb.h * 0.85); await p.waitForTimeout(150);
  console.log(await p.$$eval('#vxTip .row', (a) => a.map((r) => r.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
  await p.screenshot({ path: path.join(__dirname, 'vix-manca-v3.png') });
  await b.close();
})();
