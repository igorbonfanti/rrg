// Screenshot dei casi del rapporto: riquadro dei valori di una data (tema chiaro e scuro, computer e telefono).
// Uso: NODE_PATH=$(npm root -g) node shots2.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://127.0.0.1:8794/';
const DIR = new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch();
async function shot(k, date, { width = 1600, light = false, name }) {
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 900 : 1100 } });
  await page.addInitScript((l) => { try { localStorage.clear(); if (l) localStorage.setItem('antigravity-theme', 'light'); } catch {} }, light);
  await page.goto(URL0 + '#emg-' + k, { waitUntil: 'networkidle' });
  await page.waitForSelector('#emTable tbody tr');
  await page.click(`#emTable tr[data-em="${k}"]`); await page.waitForTimeout(300);
  const ok = await page.evaluate((date) => {
    const svg = document.getElementById('emChart'), tip = document.getElementById('emTip');
    const hit = [...svg.querySelectorAll('rect')].filter((r) => r.getAttribute('fill') === 'transparent').at(-1);
    const b = hit.getBoundingClientRect(), y = b.top + 40;
    for (let x = b.right; x >= b.left; x -= 0.1) {
      hit.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType: 'mouse', bubbles: true }));
      if (tip.querySelector('.row b') && tip.querySelector('.row b').textContent === date) return x;
    }
    return null;
  }, date);
  await page.$eval('#emWrap', (e) => e.scrollIntoView({ block: 'center' }));
  await page.locator('#emWrap').screenshot({ path: DIR + name });
  await page.close();
  return ok;
}
console.log(await shot('KOSPI200', '02/11/2026', { name: 'tip-KOSPI200-2026-11-02-scuro.png' }));
console.log(await shot('KOSPI200', '02/11/2026', { light: true, name: 'tip-KOSPI200-2026-11-02-chiaro.png' }));
console.log(await shot('KOSPI200', '07/09/2026', { light: true, width: 390, name: 'tip-KOSPI200-2026-09-07-telefono-chiaro.png' }));
await browser.close();
