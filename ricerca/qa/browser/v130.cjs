// 1.3.0: vista 4 Settore, avvicinamento nel grafico della breadth (tratti gialli e pallino all'ingresso, niente linea tratteggiata).
// Uso: BASE=http://127.0.0.1:8791/ OUT=cartella_screenshot NODE_PATH=$(npm root -g) node ricerca/qa/browser/v130.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/', OUT = process.env.OUT;
let fail = 0;
const ok = (c, msg) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${msg}`); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, light, touch, sym, range] of [['d-XLV-3A', 1280, 900, false, false, 'XLV', '3Y'], ['l-XLF-max', 1280, 900, true, false, 'XLF', 'MAX'], ['d-390-XLE', 390, 844, false, true, 'XLE', '3Y'], ['l-390-XLV', 390, 844, true, true, 'XLV', '3Y']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    await ctx.addInitScript(({ light, range }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('sm.range', JSON.stringify(range)); } } catch {} }, { light, range });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await page.goto(BASE + '#' + sym); await page.waitForTimeout(2500);
    const i = await page.evaluate(() => ({ segs: document.querySelectorAll('#ts .brappr').length, dots: document.querySelectorAll('#ts .apprin').length, old: document.querySelectorAll('#ts .apprline, #ts .apprline-t').length, legend: [...document.querySelectorAll('.legend span')].map((s) => s.textContent).join('|') }));
    ok(i.old === 0, `${name} niente linea tratteggiata`);
    ok(i.dots > 0, `${name} pallini d'ingresso ${i.dots}, tratti ${i.segs}`);
    ok(i.legend.includes('breadth in avvicinamento') && !i.legend.includes('soglia di avvicinamento di oggi'), `${name} legenda`);
    const d = page.locator('#ts .apprin').last();
    await d.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    const bb = await d.boundingBox();
    if (touch) await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); else await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.waitForTimeout(300);
    const tip = await page.locator('#tsTip').innerText();
    ok(/avvicinamento/.test(tip) && /Soglia avvicinamento\s+\d+%/.test(tip), `${name} riquadro sul pallino: ${tip.replace(/\n/g, ' / ').slice(0, 90)}`);
    if (OUT) await page.locator('#tsWrap').screenshot({ path: `${OUT}/${name}.png` });
    ok(!errs.length, `${name} errori console ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
