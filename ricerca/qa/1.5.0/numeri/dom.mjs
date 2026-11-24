// Legge dal browser i numeri della vista «8 VIX» e li scrive in un JSON (per confronta.py).
// Uso: NODE_PATH=$(npm root -g) node dom.mjs http://127.0.0.1:8798/ OUT.json SHOTS_DIR
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';

const [, , URL = 'http://127.0.0.1:8798/', OUT = 'dom.json', SHOTS = 'shots'] = process.argv;
fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const out = { errors: [] };

async function readView(page, tag) {
  const r = {};
  r.kpis = await page.$$eval('#vxKpis .kpi', (ks) => ks.map((k) => ({ k: k.querySelector('.k').textContent, v: k.querySelector('.v').textContent, s: k.querySelector('.s').textContent })));
  r.meta = await page.textContent('#vxMeta');
  r.tables = {};
  for (const ix of ['SPX', 'NDX']) {
    await page.click(`#vxIx button[data-ix="${ix}"]`);
    await page.waitForTimeout(150);
    const t = {};
    t.meta = await page.textContent('#vxTableMeta');
    t.head = await page.$$eval('#vxTable thead th', (a) => a.map((x) => x.textContent));
    t.rows = await page.$$eval('#vxTable tbody tr', (a) => a.map((tr) => [...tr.children].map((td) => td.textContent.trim())));
    t.eps = {};
    for (const X of [20, 25, 30, 40, 50]) {
      await page.click(`#vxTable tr[data-x="${X}"]`);
      await page.waitForTimeout(80);
      t.eps[X] = { title: await page.textContent('#vxEpsTitle'), rows: await page.$$eval('#vxEps tbody tr', (a) => a.map((tr) => [...tr.children].map((td) => td.textContent.trim()))) };
    }
    t.scMeta = await page.textContent('#vxScMeta');
    t.scNote = await page.textContent('#vxScNote');
    // riquadro dello scatter: alcuni punti
    t.scTips = [];
    const circles = await page.$$('#vxScatter circle.vxpt');
    const pick = [0, 7, Math.floor(circles.length / 3), Math.floor(circles.length / 2), circles.length - 1];
    for (const i of pick) {
      const c = circles[i]; if (!c) continue;
      const b = await c.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(60);
      t.scTips.push(await page.$eval('#vxScTip', (e) => (e.hidden ? null : e.innerText)));
    }
    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${SHOTS}/${tag}-${ix}.png`, fullPage: true });
    r.tables[ix] = t;
  }
  // riquadro del grafico in varie posizioni, per ogni periodo
  r.chartTips = {};
  for (const rg of ['MAX', '10A', '3A']) {
    await page.click(`#vxRange button[data-range="${rg}"]`);
    await page.waitForTimeout(150);
    const svg = await page.$('#vxChart');
    await svg.scrollIntoViewIfNeeded();
    const b = await svg.boundingBox();
    const tips = [];
    for (const f of [0.002, 0.05, 0.13, 0.27, 0.41, 0.5, 0.63, 0.77, 0.9, 0.97, 0.999]) {
      await page.mouse.move(b.x + 8 + f * (b.width - 54), b.y + b.height * 0.4);
      await page.waitForTimeout(50);
      tips.push(await page.$eval('#vxTip', (e) => (e.hidden ? null : e.innerText)));
    }
    r.chartTips[rg] = tips;
  }
  return r;
}

for (const [tag, vp, scheme] of [['desk-light', { width: 1440, height: 1000 }, 'light'], ['phone-dark', { width: 390, height: 844 }, 'dark']]) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push(`${tag} console: ${m.text()}`); });
  await page.goto(URL + '#vix', { waitUntil: 'networkidle' });
  await page.waitForSelector('#vxKpis .kpi', { timeout: 20000 });
  out[tag] = await readView(page, tag);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('scritto', OUT, 'errori', out.errors.length);
