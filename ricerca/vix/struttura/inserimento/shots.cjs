// Screenshot del prototipo (fase 1). Serve il repository: node ricerca/qa/server/gzserve.mjs . 8797
// Uso: node ricerca/vix/struttura/inserimento/shots.cjs   (BASE=http://127.0.0.1:8797/)
// Le varianti con l'HY OAS (dati ICE, ripubblicazione vietata) vanno in cache/shots_hy/, ignorata da git.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = (process.env.BASE || 'http://127.0.0.1:8797/') + 'ricerca/vix/struttura/inserimento/prototipo.html';
const OUT = path.join(__dirname, 'shots'), OUT_HY = path.join(__dirname, 'cache/shots_hy');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(OUT_HY, { recursive: true });
const cases = [
  ['1440', { width: 1440, height: 900 }, false, ''],
  ['390', { width: 390, height: 844 }, true, ''],
  ['1024', { width: 1024, height: 900 }, false, ''],
  ['360', { width: 360, height: 780 }, true, ''],
];
const extra = [ // casi limite, solo tema scuro
  ['1440-max', { width: 1440, height: 900 }, false, 'range=MAX'],
  ['390-max', { width: 390, height: 844 }, true, 'range=MAX'],
  ['1440-3a', { width: 1440, height: 900 }, false, 'range=3A'],
  ['1440-miss3m', { width: 1440, height: 900 }, false, 'miss3m=1'],
  ['1440-old', { width: 1440, height: 900 }, false, 'old=1'],
  ['390-stat', { width: 390, height: 844 }, true, 'stat=1'],
];
(async () => {
  const b = await chromium.launch();
  const shoot = async (name, vp, mob, q, theme, dir, full = true) => {
    const c = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mob, hasTouch: mob });
    const p = await c.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(`${BASE}?theme=${theme}${q ? '&' + q : ''}`); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 }); await p.waitForTimeout(400);
    // riquadro dei valori aperto a metà del grafico (sul pannello della struttura a termine se c'è)
    // finestra alta quanto la pagina: lo screenshot non la ridimensiona (il riquadro dei valori resta aperto) e il tocco cade dentro
    await p.setViewportSize({ width: vp.width, height: await p.evaluate(() => document.documentElement.scrollHeight) }); await p.waitForTimeout(200);
    const bb = await p.locator('#vxChart').boundingBox();
    if (mob) await p.touchscreen.tap(bb.x + bb.width * 0.62, bb.y + bb.height * 0.68); else await p.mouse.move(bb.x + bb.width * 0.62, bb.y + bb.height * 0.68, { steps: 5 });
    await p.waitForTimeout(250);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, kpis: [...document.querySelectorAll('#vxKpis .kpi')].map((k) => { const r = k.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }), h: Math.round(document.querySelector('#vxChart').getBoundingClientRect().height) }));
    const f = path.join(dir, `prototipo-${name}-${theme === 'light' ? 'chiaro' : 'scuro'}.png`);
    await p.screenshot({ path: f, fullPage: full });
    const tip = await p.locator('#vxTip').isVisible();
    console.log(path.basename(f), `scroll ${m.sw}/${m.cw}`, `grafico ${m.h}px`, `riquadri ${JSON.stringify(m.kpis)}`, `riquadro dei valori ${tip ? 'aperto' : 'CHIUSO'}`, errs.length ? `ERRORI ${errs.join(' | ')}` : 'console pulita');
    await c.close();
  };
  for (const [name, vp, mob, q] of cases) for (const theme of ['dark', 'light']) await shoot(name, vp, mob, q, theme, OUT);
  for (const [name, vp, mob, q] of extra) await shoot(name, vp, mob, q, 'dark', OUT);
  for (const theme of ['dark', 'light']) await shoot('1440-hy-3a', { width: 1440, height: 900 }, false, 'hy=1&range=3A', theme, OUT_HY);
  await b.close();
})();
