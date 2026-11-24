// Controllo numeri2: KPI «Emergenti in zona blu» quando un indice è nello stato «Fallito» (fail), che la vista 6 conta in zona blu.
// Simulazione: page.route taglia la serie di un indice a una data passata in cui la macchina era in «fail».
// Uso: NODE_PATH=$(npm root -g) node fail_kpi.mjs [url] [indice] [data]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://127.0.0.1:8794/', K = process.argv[3] || 'KOSPI200', T = process.argv[4] || '2022-09-30';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
await page.addInitScript(() => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } } catch {} });
await page.route(/data\/indices(_more)?\.json/, async (route) => {
  const resp = await route.fetch(); const j = await resp.json();
  const x = j.series[K];
  if (x) {
    let t = Date.parse(x.d0), n = 1;
    for (const ch of x.gaps) { const nt = t + parseInt(ch, 36) * 86400000; if (new Date(nt).toISOString().slice(0, 10) > T) break; t = nt; n++; }
    x.gaps = x.gaps.slice(0, n - 1); x.cd = x.cd.slice(0, n);
    for (const f of ['d20', 'd50', 'd200']) x[f] = x[f].slice(0, Math.max(0, n - x.b0));
  }
  await route.fulfill({ response: resp, body: JSON.stringify(j), headers: { ...resp.headers(), 'content-type': 'application/json', 'content-encoding': '' } });
});
await page.goto(URL0 + '#emg', { waitUntil: 'networkidle' });
await page.waitForSelector('#emTable tbody tr', { timeout: 90000 });
await page.waitForTimeout(400);
const kp = await page.$$eval('#emKpis .kpi', (a) => a.map((d) => [d.querySelector('.k').textContent, d.querySelector('.v').textContent, d.querySelector('.s').textContent]));
const row = await page.$eval(`#emTable tr[data-em="${K}"]`, (tr) => [tr.querySelector('.c-state').textContent.trim(), tr.querySelector('.c-br .cellv').textContent.trim()]);
await page.screenshot({ path: new URL('./shots/kpi-fail-' + K + '.png', import.meta.url).pathname });
await page.goto(URL0 + '#idx', { waitUntil: 'networkidle' });
await page.waitForSelector('#ixTable tbody tr');
await page.click('#ixPickAll').catch(() => {});
await page.waitForTimeout(300);
const kp6 = await page.$$eval('#ixKpis .kpi', (a) => a.map((d) => [d.querySelector('.k').textContent, d.querySelector('.v').textContent, d.querySelector('.s').textContent]));
const row6 = await page.$eval(`#ixTable tr[data-ix="${K}"]`, (tr) => [tr.querySelector('.c-state').textContent.trim(), tr.querySelector('.c-br .cellv').firstChild.textContent.trim()]);
console.log(JSON.stringify({ K, T, vista8: { riga: row, kpi: kp.slice(1, 3) }, vista6: { riga: row6, kpi: kp6 } }, null, 1));
await browser.close();
