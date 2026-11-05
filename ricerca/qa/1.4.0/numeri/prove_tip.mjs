// Controllo numeri 1.4.0 · screenshot del riquadro dei valori in alcune date (prove del rapporto).
// Uso: NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/numeri/prove_tip.mjs [url]
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://127.0.0.1:8794/';
const CASES = [['NIFTY50', '2023-11-02'], ['NIFTY50', '2023-12-15'], ['IBOV', '2026-10-26'], ['KOSPI200', '2025-04-18']];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(URL0 + '#emg', { waitUntil: 'networkidle' }); await p.waitForSelector('#emTable tbody tr');
const iso = (s) => (s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : null);
const out = {};
for (const [k, want] of CASES) {
  await p.click(`#emTable tr[data-em="${k}"]`); await p.waitForTimeout(200);
  await p.click('#emRange button[data-range="3A"]'); await p.waitForTimeout(200);
  const g = await p.evaluate(() => { const s = document.getElementById('emChart'), c = s.getScreenCTM(), W = s.viewBox.baseVal.width; return { e: c.e, a: c.a, f: c.f, d: c.d, W }; });
  let lo = g.e + 8 * g.a, hi = g.e + (g.W - 56) * g.a; const y = g.f + 200 * g.d;
  const at = async (x) => { await p.mouse.move(x, y); await p.waitForTimeout(15); return iso(await p.$eval('#emTip .row b', (e) => e.textContent).catch(() => null)); };
  for (let i = 0; i < 30 && hi - lo > 0.3; i++) { const m = (lo + hi) / 2; if ((await at(m)) < want) lo = m; else hi = m; }
  for (const x of [hi, hi + 0.5, hi + 1]) if ((await at(x)) === want) break;
  out[`${k} ${want}`] = await p.$$eval('#emTip .row', (a) => a.map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
  await p.locator('#emWrap').screenshot({ path: new URL(`./shots/tip-${k}-${want}.png`, import.meta.url).pathname });
  console.log(k, want, out[`${k} ${want}`].join(' | '));
}
fs.writeFileSync(new URL('./prove_tip.json', import.meta.url), JSON.stringify(out, null, 1));
await b.close();
