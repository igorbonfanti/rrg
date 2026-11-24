// Controllo numeri2 (1.4.0 @249d245): lettura dal DOM della vista 8 e della vista 6, nessun import dell'app.
// Uso: NODE_PATH=$(npm root -g) node dom2.mjs [url] [uscita.json] [--drop-last-tail SYM] [--width 1600] [--theme dark]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const URL0 = pos[0] || 'http://127.0.0.1:8794/';
const OUTF = pos[1] || new URL('./dom2.json', import.meta.url).pathname;
const DROP = opt('--drop-last-tail', null); // es. "KRW=X" oppure "ALL": toglie l'ultimo giorno della coda di Yahoo
const W = +opt('--width', 1600), THEME = opt('--theme', null), SHOT = opt('--shot', null);
const SWEEP = !args.includes('--no-sweep');
const KEYS = ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: 1100 }, colorScheme: THEME === 'dark' ? 'dark' : 'light' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } } catch {} });
if (DROP) {
  // toglie l'ultima riga di una serie dei cambi (coda di Yahoo), riscrivendo d0/gaps/cd e last
  await page.route('**/data/emerging.json*', async (route) => {
    const resp = await route.fetch();
    const j = await resp.json();
    for (const [s, x] of Object.entries(j.series)) {
      if (!(DROP === 'ALL' ? /=X$/.test(s) : s === DROP)) continue;
      x.cd = x.cd.slice(0, -1);
      const k = parseInt(x.gaps.slice(-1), 36); x.gaps = x.gaps.slice(0, -1);
      const d = new Date(Date.parse(x.last) - k * 86400000).toISOString().slice(0, 10); x.last = d;
    }
    const fx = Object.entries(j.series).filter(([s]) => /=X$/.test(s)).map(([, x]) => x.last).sort();
    j.asOf.fx = fx[0];
    await route.fulfill({ response: resp, body: JSON.stringify(j), headers: { ...resp.headers(), 'content-type': 'application/json', 'content-encoding': '' } });
  });
}
await page.goto(URL0 + '#emg', { waitUntil: 'networkidle' });
await page.waitForSelector('#emTable tbody tr', { timeout: 90000 });
await page.waitForTimeout(500);
const txt = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
const out = { url: URL0, drop: DROP, width: W, errors };
out.kpis = await page.$$eval('#emKpis .kpi', (a) => a.map((d) => ({ k: d.querySelector('.k').textContent, v: d.querySelector('.v').textContent, s: d.querySelector('.s').textContent, title: d.title })));
out.meta = await txt('#emMeta');
out.table = await page.$$eval('#emTable tbody tr', (rows) => rows.map((tr) => {
  const q = (c) => tr.querySelector(c);
  return { k: tr.dataset.em, state: q('.c-state').textContent.trim(), breadth: q('.c-br .cellv').textContent.trim(), blue: q('.c-blue').textContent.trim(),
    dd: q('.c-dd').textContent.trim(), fx: q('.c-fx').textContent.trim(), fxTitle: q('.c-fx .fxp') ? q('.c-fx .fxp').title : null, zTitle: q('.c-fx .zbar') ? q('.c-fx .zbar').title : null,
    m3: q('.c-m3').textContent.trim(), m3u: q('.c-m3u').textContent.trim(), m3uTitle: q('.c-m3u').title, rs: q('.c-rs').textContent.trim(), rsTitle: q('.c-rs').title };
}));
out.rsDots = await page.$$eval('#emRS g.emdot', (a) => a.map((g) => ({ k: g.dataset.em, title: g.querySelector('title').textContent, cx: +g.querySelector('circle').getAttribute('cx'), cy: +g.querySelector('circle').getAttribute('cy') })));
out.rsW = await page.$eval('#emRS', (s) => s.viewBox.baseVal.width);
if (SHOT) await page.screenshot({ path: SHOT, fullPage: false });
out.detail = {};
for (const k of KEYS) {
  const tr = await page.$(`#emTable tr[data-em="${k}"]`);
  if (!tr) { out.detail[k] = null; continue; }
  await tr.click();
  await page.waitForTimeout(200);
  const d = { title: await txt('#emTitle'), state: await txt('#emState'), dmeta: await txt('#emDMeta'), notes: await page.$$eval('#emNotes li', (a) => a.map((x) => x.textContent)),
    chartMeta: await txt('#emChartMeta'), rsMeta: await txt('#emRSMeta'), trail: await page.$eval('#emRS path.emtrail', (p) => p.getAttribute('d')).catch(() => null), tips: {} };
  if (SWEEP) for (const range of ['3A', '10A', 'MAX']) {
    await page.click(`#emRange button[data-range="${range}"]`);
    await page.waitForTimeout(150);
    d.tips[range] = await page.evaluate(() => {
      const svg = document.getElementById('emChart'), tip = document.getElementById('emTip');
      const hit = [...svg.querySelectorAll('rect')].filter((r) => r.getAttribute('fill') === 'transparent').at(-1);
      const b = hit.getBoundingClientRect(), y = b.top + b.height / 2, res = {};
      let last = null;
      for (let x = b.left; x <= b.right; x += 0.1) {
        hit.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType: 'mouse', bubbles: true }));
        const h = tip.innerHTML;
        if (h === last) continue; last = h;
        const rows = [...tip.querySelectorAll('.row')].map((r) => [...r.children].map((c) => c.textContent.trim()).concat(r.classList.contains('note-row') ? ['NOTE:' + r.textContent.trim()] : []));
        const date = rows[0][0];
        res[date] = rows;
      }
      return res;
    });
  }
  out.detail[k] = d;
}
// vista 6: tutti gli indici
await page.goto(URL0 + '#idx', { waitUntil: 'networkidle' });
await page.waitForSelector('#ixTable tbody tr', { timeout: 90000 });
await page.click('#ixPickAll').catch(() => {});
await page.waitForTimeout(400);
out.v6 = await page.$$eval('#ixTable tbody tr', (rows) => rows.map((tr) => ({ k: tr.dataset.ix, state: tr.querySelector('.c-state').textContent.trim(), breadth: tr.querySelector('.c-br .cellv').firstChild.textContent.trim(),
  blue: tr.querySelector('.c-blue').textContent.trim(), dd: tr.querySelector('.c-dd .cellv').textContent.trim(), lastTitle: tr.querySelector('.c-last').title })));
fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
console.log('scritto', OUTF, 'errori console:', errors.length);
await browser.close();
