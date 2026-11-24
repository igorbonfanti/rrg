// Immagini del prototipo (Playwright): 1440 e 390 px, tema scuro e chiaro, periodo 3A e 10A (10A è quello predefinito
// dell'app), più due immagini con il riquadro aperto sulla colonna del profilo (S&P 500).
// Uso (dalla radice del repository): python3 -m http.server 8794 &  NODE_PATH=$(npm root -g) node ricerca/poc/profilo/prototipo/shot.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/ricerca/poc/profilo/prototipo/proto.html';
const OUT = path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const info = [];
  for (const w of [1440, 390]) for (const theme of ['dark', 'light']) for (const r of ['3A', '10A']) {
    const touch = w < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: touch ? 844 : 900 }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(`${BASE}?r=${r}`); await p.waitForSelector('body[data-ready="1"]');
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(300);
    const tag = `${w}-${theme === 'light' ? 'chiaro' : 'scuro'}-${r}`;
    await p.screenshot({ path: path.join(OUT, `profilo-${tag}.png`), fullPage: true });
    info.push({ tag, merge: await p.$$eval('.panel', (a) => a.map((x) => `${x.querySelector('h3').textContent.split(':')[0]} fasce unite ${x.dataset.merge}, ${x.dataset.pxbin} px`)) });
    // nessuna barra orizzontale di scorrimento della pagina
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w) console.warn(`${tag}: la pagina scorre in orizzontale (${sw} px)`);
    await ctx.close();
  }
  // riquadro aperto sulla fascia più lunga della colonna (S&P 500, 3A)
  for (const [w, theme] of [[1440, 'dark'], [390, 'light']]) {
    const touch = w < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: 700 }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(`${BASE}?r=3A&m=SPX`); await p.waitForSelector('body[data-ready="1"]');
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(300);
    const box = await p.evaluate(() => { const rs = [...document.querySelectorAll('rect.vpbar')]; const r = rs.reduce((a, x) => (+x.getAttribute('width') > +a.getAttribute('width') ? x : a)); const b = r.getBoundingClientRect(); return { x: b.left + 3, y: b.top + b.height / 2 }; });
    if (touch) await p.touchscreen.tap(box.x, box.y); else await p.mouse.move(box.x, box.y);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, `profilo-riquadro-${w}-${theme === 'light' ? 'chiaro' : 'scuro'}.png`), fullPage: true });
    await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify(info, null, 1));
})();
