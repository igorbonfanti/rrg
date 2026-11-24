// Simula nel browser due casi del file data/vix.json (intercettando la richiesta, l'app non si tocca):
// A) FRED al 04/11 e 05/11 da Yahoo (campo fred anticipato): riquadro e meta devono dire «provvisorio».
// B) VIX senza l'ultima seduta (FRED in ritardo e Yahoo assente): il riquadro deve mostrare la seduta del 04/11.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8798/';
const J = JSON.parse(fs.readFileSync(process.argv[3] || '/home/user/rrg/data/vix.json', 'utf8'));
const cases = {
  A: (() => { const x = structuredClone(J); x.series.VIX.fred = '2026-11-04'; x.asOf.fred = '2026-11-04'; return x; })(),
  B: (() => { const x = structuredClone(J); const v = x.series.VIX; v.cd = v.cd.slice(0, -1); v.gaps = v.gaps.slice(0, -1); v.last = '2026-11-04'; v.fred = '2026-11-04'; x.asOf.vix = '2026-11-04'; x.asOf.fred = '2026-11-04'; return x; })(),
};
const b = await chromium.launch();
for (const [k, body] of Object.entries(cases)) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/data/vix.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));
  const p = await ctx.newPage();
  await p.goto(URL + '#vix', { waitUntil: 'networkidle' });
  await p.waitForSelector('#vxKpis .kpi');
  const kp = await p.$$eval('#vxKpis .kpi', (a) => a.map((x) => x.innerText.replace(/\n/g, ' | ')));
  const meta = await p.textContent('#vxMeta');
  await p.click('#vxRange button[data-range="3A"]');
  const svg = await p.$('#vxChart'); await svg.scrollIntoViewIfNeeded(); const bb = await svg.boundingBox();
  await p.mouse.move(bb.x + bb.width - 3, bb.y + bb.height * 0.4); await p.waitForTimeout(80);
  const tip = await p.$eval('#vxTip', (e) => e.innerText.replace(/\n/g, ' | '));
  console.log(k, '\n  ', kp.join('\n   '), '\n  meta:', meta, '\n  tip:', tip);
  await p.screenshot({ path: `shots/simulazione-${k}.png` });
  await ctx.close();
}
await b.close();
