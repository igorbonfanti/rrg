// Controllo numeri 1.4.0 · lettura dal DOM della vista 8 (e della vista 6) nel browser. Nessun import dell'app.
// Uso: NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/numeri/dom.mjs [url] > dom.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://127.0.0.1:8794/';
const OUT = new URL('./', import.meta.url).pathname;
const KEYS = ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM'];
// date da provare nel riquadro del grafico (per ogni indice si cercano quelle presenti nella finestra 3A, più quelle in MAX)
const PROBE = JSON.parse(fs.readFileSync(OUT + 'probe_dates.json', 'utf8'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } } catch {} });
await page.goto(URL0 + '#emg', { waitUntil: 'networkidle' });
await page.waitForSelector('#emTable tbody tr', { timeout: 60000 });
await page.waitForTimeout(500);

const txt = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
const out = { errors };
out.kpis = await page.$$eval('#emKpis .kpi', (a) => a.map((d) => ({ k: d.querySelector('.k').textContent, v: d.querySelector('.v').textContent, s: d.querySelector('.s').textContent, title: d.title })));
out.meta = await txt('#emMeta');
out.miss = await page.$eval('#emMiss', (e) => (e.hidden ? null : e.textContent));
out.table = await page.$$eval('#emTable tbody tr', (rows) => rows.map((tr) => {
  const q = (c) => tr.querySelector(c);
  return {
    k: tr.dataset.em,
    state: q('.c-state').textContent.trim(),
    breadth: q('.c-br .cellv').textContent.trim(),
    blue: q('.c-blue').textContent.trim(),
    dd: q('.c-dd').textContent.trim(),
    fx: q('.c-fx .fxp') ? q('.c-fx .fxp').textContent.trim() : q('.c-fx').textContent.trim(),
    fxTitle: q('.c-fx .zbar') ? q('.c-fx .zbar').title : null,
    m3: q('.c-m3').textContent.trim(), m3u: q('.c-m3u').textContent.trim(), m3uTitle: q('.c-m3u').title,
    rs: q('.c-rs').textContent.trim(), rsTitle: q('.c-rs').title,
  };
}));
out.rsDots = await page.$$eval('#emRS g.emdot', (a) => a.map((g) => g.querySelector('title').textContent));
out.detail = {};
for (const k of KEYS) {
  const tr = await page.$(`#emTable tr[data-em="${k}"]`);
  if (!tr) { out.detail[k] = null; continue; }
  await tr.click();
  await page.waitForTimeout(250);
  const d = {
    hash: await page.evaluate(() => location.hash),
    title: await txt('#emTitle'), state: await txt('#emState'), dmeta: await txt('#emDMeta'),
    notes: await page.$$eval('#emNotes li', (a) => a.map((x) => x.textContent)), chartMeta: await txt('#emChartMeta'),
    legend: await txt('#emLegend'), rsMeta: await txt('#emRSMeta'),
    trail: await page.$eval('#emRS path.emtrail', (p) => p.getAttribute('d')).catch(() => null),
    tips: {},
  };
  for (const range of ['3A', 'MAX']) {
    await page.click(`#emRange button[data-range="${range}"]`);
    await page.waitForTimeout(200);
    // geometria del grafico: x della data come in drawChart (L=8, R=56, viewBox)
    for (const want of PROBE[k] || []) {
      const got = await page.evaluate(async (want) => {
        const svg = document.getElementById('emChart'), hit = svg.querySelector('rect[fill="transparent"]');
        const vb = svg.viewBox.baseVal, ctm = svg.getScreenCTM();
        const L = 8, R = 56, PW = vb.width - L - R;
        return { vbw: vb.width, a: ctm.a, e: ctm.e, f: ctm.f, d: ctm.d, PW, L, hy: Number(hit.getAttribute('y')) + 30 };
      }, want);
      // si scorre di un pixel alla volta finché il riquadro mostra la data voluta
      let found = null;
      const box = await page.$eval('#emChart', (s) => { const r = s.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; });
      for (let px = 0; px < box.w && !found; px += 1) { /* placeholder per la ricerca binaria sotto */ break; }
      // ricerca binaria sulla x dello schermo
      let lo = box.x + got.e + got.L * got.a, hi = box.x + got.e + (got.L + got.PW) * got.a;
      lo = got.e + got.L * got.a; hi = got.e + (got.L + got.PW) * got.a;
      const y = got.f + got.hy * got.d;
      const dateAt = async (cx) => { await page.mouse.move(cx, y); await page.waitForTimeout(15); return page.$eval('#emTip .row b', (b) => b.textContent).catch(() => null); };
      const iso = (s) => (s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : null);
      for (let it = 0; it < 30 && hi - lo > 0.3; it++) {
        const mid = (lo + hi) / 2, dd = iso(await dateAt(mid));
        if (dd == null) break;
        if (dd < want) lo = mid; else hi = mid;
      }
      for (const cx of [hi, hi + 0.5, hi + 1, lo]) {
        const dd = iso(await dateAt(cx));
        if (dd === want) { found = await page.$$eval('#emTip .row', (a) => a.map((r) => r.textContent.replace(/\s+/g, ' ').trim())); break; }
      }
      d.tips[`${range}:${want}`] = found;
    }
  }
  await page.click('#emRange button[data-range="3A"]');
  out.detail[k] = d;
}
await page.screenshot({ path: OUT + 'shots/emg-desktop.png', fullPage: true });

// vista 6: tutti gli indici emergenti mostrati, stato e breadth
async function view6() {
  await page.evaluate(() => { location.hash = '#idx'; });
  await page.waitForSelector('#ixTable tbody tr', { timeout: 60000 });
  await page.waitForTimeout(400);
  return page.$$eval('#ixTable tbody tr', (rows) => rows.map((tr) => ({
    k: tr.dataset.ix, state: tr.querySelector('.c-state').textContent.trim(),
    breadth: tr.querySelector('.c-br .cellv').firstChild.textContent.trim(), blue: tr.querySelector('.c-blue').textContent.trim(),
    dd: tr.querySelector('.c-dd .cellv').textContent.trim(), lastTitle: tr.querySelector('.c-last').title,
  })));
}
// mostra tutti gli indici nella vista 6 (scelta salvata nel browser)
await page.evaluate((keys) => { localStorage.setItem('sm.ixShown', JSON.stringify(keys)); }, KEYS);
out.storeKeys = await page.evaluate(() => Object.keys(localStorage));
await page.reload({ waitUntil: 'networkidle' });
out.view6 = await view6();

// cambio del livello blu nella vista 6 (KOSPI200 +5) e rilettura della vista 8
// percorso dell'utente: vista 8 su KOSPI200, pulsante «Apri KOSPI200 nella vista 6», + cinque volte
await page.evaluate(() => { location.hash = '#emg-KOSPI200'; });
await page.waitForTimeout(600);
out.beforeBlue = await page.$$eval('#emTable tbody tr', (rows) => rows.map((tr) => [tr.dataset.em, tr.querySelector('.c-state').textContent.trim(), tr.querySelector('.c-blue').textContent.trim()]));
await page.click('#emOpenIx');
await page.waitForTimeout(600);
out.ixSelTitle = await txt('#ixTitle');
for (let i = 0; i < 5; i++) { await page.click('#ixBluePlus'); await page.waitForTimeout(80); }
out.view6after = await view6();
await page.evaluate(() => { location.hash = '#emg-KOSPI200'; });
await page.waitForTimeout(800);
out.after = {
  kpis: await page.$$eval('#emKpis .kpi', (a) => a.map((d) => [d.querySelector('.k').textContent, d.querySelector('.v').textContent, d.querySelector('.s').textContent])),
  table: await page.$$eval('#emTable tbody tr', (rows) => rows.map((tr) => [tr.dataset.em, tr.querySelector('.c-state').textContent.trim(), tr.querySelector('.c-br .cellv').textContent.trim(), tr.querySelector('.c-blue').textContent.trim()])),
  dmeta: await txt('#emDMeta'), title: await txt('#emTitle'),
  blueLineY: await page.$eval('#emChart line.blue', (l) => l.getAttribute('y1')).catch(() => null),
  paneTitles: await page.$$eval('#emChart text.pane-t', (a) => a.map((t) => t.textContent)),
};
await page.screenshot({ path: OUT + 'shots/emg-dopo-blu.png', fullPage: false });
// con la vista 8 aperta: abbassa di nuovo dalla vista 6 e torna (secondo percorso)
await page.click('#emOpenIx');
await page.waitForTimeout(400);
for (let i = 0; i < 5; i++) { await page.click('#ixBlueMinus'); await page.waitForTimeout(80); }
await page.click('#tab-emg');
await page.waitForTimeout(600);
out.reset = await page.$$eval('#emTable tbody tr', (rows) => rows.map((tr) => [tr.dataset.em, tr.querySelector('.c-state').textContent.trim(), tr.querySelector('.c-blue').textContent.trim()]));
out.errors = errors;
fs.writeFileSync(OUT + 'dom.json', JSON.stringify(out, null, 1));
await browser.close();
console.log('ok', errors.length, 'errori');
