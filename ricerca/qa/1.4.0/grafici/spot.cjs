// Prove puntuali dei difetti: banda «in calo forte» con riquadro «—» (KOSPI200 MAX), stampa del TWD nel riquadro e nella
// scala (TWN MAX), triangoli dei trigger fuori dal pannello, base 100 in dollari in MAX.
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/grafici/spot.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/', OUT = path.join(__dirname, 'shots');
const DAY = 86400000;
(async () => {
  const br = await chromium.launch(), ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
  const p = await ctx.newPage();
  const tipAt = (d) => p.evaluate((d) => {
    const svg = document.getElementById('emChart'), fr = svg.querySelector('rect.frame'), L = +fr.getAttribute('x'), PW = +fr.getAttribute('width');
    const xs = window.__x(d), hit = svg.querySelector('rect[fill="transparent"]'), m = svg.getScreenCTM();
    hit.dispatchEvent(new PointerEvent('pointermove', { clientX: m.a * xs + m.e, clientY: m.d * (+hit.getAttribute('y') + 20) + m.f, bubbles: true, pointerType: 'mouse' }));
    const cover = (cls) => [...svg.querySelectorAll('rect.' + cls)].some((r) => +r.getAttribute('x') <= window.__x(d, true) + 1e-6 && +r.getAttribute('x') + +r.getAttribute('width') >= window.__x(d, true) - 1e-6);
    return { tip: [...document.querySelectorAll('#emTip .row')].map((r) => r.innerText.replace(/\s+/g, ' ')).join(' / '), calo: cover('fxcalo'), ferma: cover('fxferma') };
  }, d);
  const setX = (t0, t1) => p.evaluate(({ t0, t1, DAY }) => { const fr = document.querySelector('#emChart rect.frame'), L = +fr.getAttribute('x'), PW = +fr.getAttribute('width'); window.__x = (d, exact) => L + ((Date.parse(d) + (exact ? 0 : DAY / 2) - t0) / (t1 - t0)) * PW; }, { t0, t1, DAY });
  // 1. KOSPI200 MAX
  await p.goto(BASE + '#emg-KOSPI200'); await p.waitForSelector('#emChart path.emloc'); await p.click('#emRange button[data-range="MAX"]'); await p.waitForTimeout(300);
  await setX(Date.parse('2000-01-04'), Date.parse('2026-11-04'));
  for (const d of ['2007-03-14', '2009-03-31', '2008-11-21']) console.log('KOSPI200 MAX', d, JSON.stringify(await tipAt(d)));
  // 2. NIFTY50 MAX
  await p.goto(BASE + '#emg-NIFTY50'); await p.waitForTimeout(500); await p.click('#emRange button[data-range="MAX"]'); await p.waitForTimeout(300);
  await setX(Date.parse('2007-09-17'), Date.parse('2026-11-04'));
  for (const d of ['2008-11-21', '2009-04-01']) console.log('NIFTY50 MAX', d, JSON.stringify(await tipAt(d)));
  // 3. TWN MAX: stampa del 25/10/2011
  await p.goto(BASE + '#emg-TWN'); await p.waitForTimeout(500); await p.click('#emRange button[data-range="MAX"]'); await p.waitForTimeout(300);
  await setX(Date.parse('2000-01-04'), Date.parse('2026-11-04'));
  for (const d of ['2011-10-24', '2011-10-25', '2011-10-26', '2014-12-31']) console.log('TWN MAX', d, JSON.stringify(await tipAt(d)));
  const ax = await p.evaluate(() => [...document.querySelectorAll('#emChart text.axt')].map((t) => t.textContent).join(' '));
  console.log('TWN MAX etichette degli assi:', ax);
  await p.locator('#emChart').screenshot({ path: path.join(OUT, 'spot-TWN-MAX-stampe.png') });
  // 4. triangoli dei trigger e pannello
  for (const k of ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM']) for (const r of ['3A', '10A', 'MAX']) {
    await p.goto(BASE + '#emg-' + k); await p.waitForTimeout(350); await p.click(`#emRange button[data-range="${r}"]`); await p.waitForTimeout(150);
    const o = await p.evaluate(() => { const f = document.querySelector('#emChart rect.frame'), y1 = +f.getAttribute('y') + +f.getAttribute('height'); return [...document.querySelectorAll('#emChart path.trigmark')].map((e) => +e.getAttribute('d').match(/M[-\d.]+ ([-\d.]+)/)[1] + 9 - y1).filter((v) => v > 0); });
    if (o.length) console.log(`trigger fuori dal pannello del prezzo: ${k} ${r}: ${o.length} triangoli, fino a ${Math.max(...o).toFixed(1)} unità sotto il bordo`);
  }
  await br.close();
})();
