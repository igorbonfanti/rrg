// Controllo numeri 1.4.0 · stato e breadth della vista 8 uguali alla vista 6 dopo un cambio del livello blu che cambia lo stato.
// Uso: NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/numeri/blu.mjs [url]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://127.0.0.1:8794/';
const KEYS = ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript((keys) => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); localStorage.setItem('sm.ixShown', JSON.stringify(keys)); sessionStorage.setItem('qa', '1'); } } catch {} }, KEYS);
const v8 = () => page.$$eval('#emTable tbody tr', (rows) => Object.fromEntries(rows.map((tr) => [tr.dataset.em, [tr.querySelector('.c-state').textContent.trim(), tr.querySelector('.c-br .cellv').textContent.trim(), tr.querySelector('.c-blue').textContent.trim()]])));
const v6 = () => page.$$eval('#ixTable tbody tr', (rows) => Object.fromEntries(rows.map((tr) => [tr.dataset.ix, [tr.querySelector('.c-state').textContent.trim(), tr.querySelector('.c-br .cellv').firstChild.textContent.trim(), tr.querySelector('.c-blue').textContent.trim()]])));
const kp = () => page.$$eval('#emKpis .kpi', (a) => a.slice(1, 3).map((d) => d.querySelector('.v').textContent + ' ' + d.querySelector('.s').textContent));
const out = { steps: [] };
await page.goto(URL0 + '#emg-KOSPI200', { waitUntil: 'networkidle' });
await page.waitForSelector('#emTable tbody tr');
const step = async (label, k, delta) => {
  await page.click(`#emTable tr[data-em="${k}"]`); await page.waitForTimeout(200);
  await page.click('#emOpenIx'); await page.waitForTimeout(500);
  const btn = delta > 0 ? '#ixBluePlus' : '#ixBlueMinus';
  for (let i = 0; i < Math.abs(delta); i++) { await page.click(btn); await page.waitForTimeout(60); }
  const six = await v6();
  await page.click('#tab-emg'); await page.waitForTimeout(500);
  const eight = await v8();
  const diff = KEYS.filter((x) => JSON.stringify(six[x]) !== JSON.stringify(eight[x]));
  out.steps.push({ label, six, eight, kpis: await kp(), dmeta: await page.$eval('#emDMeta', (e) => e.textContent), diff });
  console.log(label, '| vista 6:', JSON.stringify(six[k]), '| vista 8:', JSON.stringify(eight[k]), '| diversi:', diff.join(',') || 'nessuno', '|', (await kp()).join(' / '));
};
await step('KOSPI200 blu 15 → 7', 'KOSPI200', -8);
await step('NIFTY50 blu 10 → 50', 'NIFTY50', +40);
await step('CSI300 blu 14 → 25', 'CSI300', +11);
// ricarica: le scelte restano salvate, le due viste coincidono ancora?
await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('#emTable tbody tr'); await page.waitForTimeout(400);
const eightR = await v8();
await page.click('#tab-idx'); await page.waitForSelector('#ixTable tbody tr'); await page.waitForTimeout(500);
const sixR = await v6();
out.reload = { six: sixR, eight: eightR, diff: KEYS.filter((x) => JSON.stringify(sixR[x]) !== JSON.stringify(eightR[x])) };
console.log('dopo la ricarica, diversi:', out.reload.diff.join(',') || 'nessuno', JSON.stringify(eightR));
await page.click('#tab-emg'); await page.waitForTimeout(500);
await page.screenshot({ path: new URL('./shots/emg-blu-cambiati.png', import.meta.url).pathname });
out.errors = errors;
fs.writeFileSync(new URL('./blu.json', import.meta.url), JSON.stringify(out, null, 1));
await browser.close();
