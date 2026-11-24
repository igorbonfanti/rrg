// Scritte delle fasce grigie quando il carattere IBM Plex Mono arriva dopo il disegno (font-display: swap):
// i font si servono con 4 s di ritardo, il grafico si disegna prima con il carattere di riserva.
// Uso: BASE=http://127.0.0.1:8798/ NODE_PATH=$(npm root -g) node font_race.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8798/';
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const w of [375, 390, 412]) {
    const c = await b.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('sm.vix.range', 'MAX'); } catch {} });
    let hits = 0; await c.route('**/fonts/*.woff2', async (r) => { hits++; await new Promise((ok) => setTimeout(ok, 4000)); await r.continue(); });
    const p = await c.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 });
    await p.locator('#vxRange button[data-range="MAX"]').click(); await p.waitForTimeout(200);
    const early = await p.evaluate(() => [...document.fonts].filter((f) => /Mono/.test(f.family)).map((f) => f.status).join(','));
    await p.waitForTimeout(5000);
    const late = await p.evaluate(() => [...document.fonts].filter((f) => /Mono/.test(f.family)).map((f) => f.status).join(','));
    const r = await p.$$eval('#vxChart rect.vxnodata', (rs) => rs.map((x) => { const s = x.ownerSVGElement, cy = +x.getAttribute('y') + +x.getAttribute('height') / 2 + 3; const t = [...s.querySelectorAll('text')].find((q) => /dal \d/.test(q.textContent) && Math.abs(+q.getAttribute('y') - cy) < 1); if (!t) return { label: null }; const bb = t.getBBox(); return { label: t.textContent, inside: bb.x >= +x.getAttribute('x') && bb.x + bb.width <= +x.getAttribute('x') + +x.getAttribute('width'), x0: +bb.x.toFixed(1), x1: +(bb.x + bb.width).toFixed(1), w: +(+x.getAttribute('width')).toFixed(1) }; }));
    const good = r.every((x) => !x.label || x.inside); if (!good) fail++;
    console.log(`${good ? 'OK  ' : 'FAIL'} ${w}: font ritardati ${hits}; Plex Mono pronto al disegno ${early}, dopo ${late}; ${JSON.stringify(r)}`);
    await c.close();
  }
  await b.close(); console.log(`${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
