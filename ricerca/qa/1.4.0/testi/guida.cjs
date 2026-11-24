// Controllo testi 1.4.0: guida (#emg, comandi), guida rapida (?) e riquadro dei valori al telefono; screenshot.
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/testi/guida.cjs
const { chromium } = require('playwright');
const path = require('path'), OUT = path.join(__dirname, 'shots'), BASE = process.env.BASE || 'http://127.0.0.1:8794/';
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, light, touch] of [['1440-chiaro', 1440, 900, true, false], ['390-scuro', 390, 844, false, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
    await ctx.addInitScript(({ light }) => { try { localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); } catch {} }, { light });
    const p = await ctx.newPage();
    await p.goto(BASE + 'guida.html#emg'); await p.waitForTimeout(1200);
    const sec = p.locator('#emg'); await sec.screenshot({ path: path.join(OUT, `guida-emg-${name}.png`) });
    console.log(name, 'guida #emg, larghezza', await sec.evaluate((e) => [e.scrollWidth, e.clientWidth, document.documentElement.scrollWidth > innerWidth]));
    await p.locator('#comandi').screenshot({ path: path.join(OUT, `guida-comandi-${name}.png`) });
    await p.goto(BASE + '#emg-NIFTY50'); await p.waitForTimeout(3500);
    await p.locator('.emg-side').screenshot({ path: path.join(OUT, `lato-${name}.png`) });
    const box = await p.locator('#emChart').boundingBox();
    await p.locator('#emChart').scrollIntoViewIfNeeded();
    const bx = await p.locator('#emChart').boundingBox();
    const x = bx.x + bx.width * 0.6, y = bx.y + 80;
    if (touch) await p.touchscreen.tap(x, y); else await p.mouse.move(x, y);
    await p.waitForTimeout(400);
    const tip = await p.evaluate(() => { const t = document.getElementById('emTip'); const r = t.getBoundingClientRect(); return { hidden: t.hidden, testo: t.innerText.replace(/\n/g, ' | '), l: r.left, r: r.right, w: innerWidth }; });
    console.log(name, 'riquadro dei valori', JSON.stringify(tip));
    await p.locator('#emWrap').screenshot({ path: path.join(OUT, `tip-${name}.png`) });
    await p.locator('#emKpis').screenshot({ path: path.join(OUT, `kpi-${name}.png`) });
    await p.locator('#emTable').screenshot({ path: path.join(OUT, `tabella-${name}.png`) });
    await ctx.close();
  }
  await b.close();
})();
