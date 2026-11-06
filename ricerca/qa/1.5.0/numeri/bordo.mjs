// Riquadro del grafico VIX/realizzata al bordo destro e sinistro (ultima e prima seduta della finestra).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8798/';
const b = await chromium.launch();
for (const vp of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  const p = await (await b.newContext({ viewport: vp })).newPage();
  await p.goto(URL + '#vix', { waitUntil: 'networkidle' });
  await p.waitForSelector('#vxKpis .kpi');
  for (const rg of ['3A', '10A', 'MAX']) {
    await p.click(`#vxRange button[data-range="${rg}"]`); await p.waitForTimeout(100);
    const svg = await p.$('#vxChart'); await svg.scrollIntoViewIfNeeded(); const bb = await svg.boundingBox();
    const vb = await p.$eval('#vxChart', (s) => s.getAttribute('viewBox'));
    const r = [];
    for (const x of [bb.x + 9, bb.x + bb.width - 47, bb.x + bb.width - 3]) {
      await p.mouse.move(x, bb.y + bb.height * 0.4); await p.waitForTimeout(60);
      r.push(await p.$eval('#vxTip', (e) => (e.hidden ? null : e.innerText.replace(/\n/g, ' | '))));
    }
    console.log(vp.width, rg, 'box', Math.round(bb.width), 'viewBox', vb, '\n  ', r.join('\n   '));
  }
}
await b.close();
