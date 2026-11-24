// Dettagli dei bordi e delle scritte della fascia grigia (1.6.0). Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.0/grafici/bordi.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
const OUT = path.join(__dirname, 'shots');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  const mk = async (w, theme, dpr = 1) => {
    const c = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: dpr, isMobile: w < 600, hasTouch: w < 600 });
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxChart path.vxvix', { timeout: 30000 }); await p.waitForTimeout(300);
    return { c, p };
  };
  const range = async (p, r) => { await p.evaluate((r) => document.querySelector(`#vxRange button[data-range="${r}"]`).click(), r); await p.waitForTimeout(300); };
  // 1. scritte della fascia grigia (MAX) a molte larghezze: dentro la fascia e lontane dalla linea dei dati
  const widths = [320, 340, 360, 375, 390, 412, 430, 480, 540, 600, 700, 820, 1024, 1280, 1440];
  for (const w of widths) {
    const { c, p } = await mk(w, 'light'); await range(p, 'MAX');
    const r = await p.evaluate(() => {
      const svg = document.getElementById('vxChart');
      const nd = [...svg.querySelectorAll('rect.vxnodata')].map((e) => ({ x: +e.getAttribute('x'), w: +e.getAttribute('width'), y: +e.getAttribute('y'), h: +e.getAttribute('height') }));
      const tx = [...svg.querySelectorAll('text')].filter((t) => / dal \d/.test(t.textContent)).map((t) => { const bb = t.getBBox(); return { t: t.textContent, x0: bb.x, x1: bb.x + bb.width, y: bb.y, fs: getComputedStyle(t).fontSize }; });
      return { nd, tx, frame: +svg.querySelector('rect.frame').getAttribute('x') };
    });
    if (!r.nd.length) { console.log(`     ${w}: nessuna fascia grigia`); await c.close(); continue; }
    for (const t of r.tx) {
      const band = r.nd.find((n) => t.y >= n.y && t.y <= n.y + n.h);
      const inside = band && t.x0 >= band.x - 0.5 && t.x1 <= band.x + band.w + 0.5;
      ok(inside, `${w} px: «${t.t}» ${t.x0.toFixed(0)}-${t.x1.toFixed(0)} nella fascia grigia ${band ? band.x.toFixed(0) + '-' + (band.x + band.w).toFixed(0) : '?'} (font ${t.fs})`);
    }
    if (r.tx.length < r.nd.length) console.log(`     ${w}: ${r.nd.length - r.tx.length} fasce grigie senza scritta (troppo strette)`);
    await c.close();
  }
  // 2. bordi del periodo: ingrandimenti del pannello VIX/VIX3M a destra (ultima fascia di 2 sedute) e a sinistra (10A)
  for (const theme of ['light', 'dark']) for (const rg of ['3A', '10A']) {
    const { c, p } = await mk(1440, theme, 4); await range(p, rg);
    const g = await p.evaluate(() => { const svg = document.getElementById('vxChart'); const f = [...svg.querySelectorAll('rect.frame')][2]; const sb = svg.getBoundingClientRect(); const k = sb.width / svg.viewBox.baseVal.width; return { x: sb.left + window.scrollX, y: sb.top + window.scrollY, k, fx: +f.getAttribute('x'), fy: +f.getAttribute('y'), fw: +f.getAttribute('width'), fh: +f.getAttribute('height') }; });
    const clipR = { x: g.x + (g.fx + g.fw - 70) * g.k, y: g.y + (g.fy - 14) * g.k, width: 110 * g.k, height: (g.fh + 20) * g.k };
    const clipL = { x: g.x + (g.fx - 6) * g.k, y: g.y + (g.fy - 14) * g.k, width: 90 * g.k, height: (g.fh + 20) * g.k };
    await p.screenshot({ path: path.join(OUT, `bordo-destro-${theme}-${rg}.png`), clip: clipR, fullPage: true });
    if (rg === '10A') await p.screenshot({ path: path.join(OUT, `bordo-sinistro-${theme}-${rg}.png`), clip: clipL, fullPage: true });
    // punto finale contro l'etichetta dell'asse più vicina
    const o = await p.evaluate(() => { const svg = document.getElementById('vxChart'); const d = svg.querySelector('circle.vxrdot').getBBox(); return [...svg.querySelectorAll('text.axt')].map((t) => ({ t: t.textContent, b: t.getBBox() })).filter(({ b }) => b.x < d.x + d.width && d.x < b.x + b.width && b.y < d.y + d.height && d.y < b.y + b.height).map((x) => x.t); });
    ok(o.length === 0, `1440 ${theme} ${rg}: punto finale non tocca le etichette dell'asse ${o.join(',')}`);
    await c.close();
  }
  await b.close();
  console.log(`\nFAIL: ${fail}`);
})();
