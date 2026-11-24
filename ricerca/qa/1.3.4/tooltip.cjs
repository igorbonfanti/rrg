// Revisione 1.3.4: tooltip «membri di oggi» nella vista Indici, 1440 px (mouse) e 390 px (tocco), chiaro e scuro.
// Uso: NODE_PATH=$(npm root -g) node ricerca/qa/1.3.4/tooltip.cjs [porta]
const { chromium } = require('playwright');
const path = require('path');
const PORT = process.argv[2] || 8799, OUT = path.join(__dirname, 'screenshot');
const EXPECT = 'Storia ricostruita con i membri di oggi: nella prova sul Nasdaq-100 la breadth risulta in media 3,6 punti più alta (da −6 a +17 nelle singole date); vicino ai minimi lo scarto medio è piccolo (+1,1 con la breadth sotto il 20%, da −4 a +8 nelle singole date)';
(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) for (const light of [true, false]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
    await ctx.addInitScript((l) => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', l ? 'light' : 'dark'); } catch {} }, light);
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('requestfailed', (r) => errors.push('requestfailed ' + r.url()));
    await page.goto(`http://localhost:${PORT}/index.html#idx`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#ixTable tbody tr', { timeout: 20000 });
    const sel = '#ixTable span.muted[title^="Storia ricostruita con i membri di oggi"]';
    const els = page.locator(sel);
    const count = await els.count();
    const r = { w, touch, tema: light ? 'chiaro' : 'scuro', elementi: count, errori: errors };
    if (count) {
      const el = els.first();
      await el.scrollIntoViewIfNeeded();
      r.titleUguale = (await el.getAttribute('title')) === EXPECT;
      r.testo = await el.textContent();
      const box = await el.boundingBox();
      r.visibile = await el.isVisible();
      r.box = box && { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) };
      r.dentroLaPagina = !!box && box.x >= 0 && box.x + box.width <= w;
      // l'elemento sotto il centro è proprio lo span (nessun overlay che impedisca il passaggio del mouse o il tocco)
      r.raggiungibile = await el.evaluate((e) => { const b = e.getBoundingClientRect(); const t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return t === e || e.contains(t); });
      r.datiIndici = await page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.closest('tr')?.querySelector('.c-name, td')?.textContent.trim().slice(0, 30)), sel);
      if (touch) {
        await el.tap();
        await page.waitForTimeout(300);
        const tip = await page.evaluate(() => { const t = document.querySelector('.taptip'); if (!t || t.hidden) return null; const b = t.getBoundingClientRect(); const cs = getComputedStyle(t);
          return { text: t.textContent, x: b.x, y: b.y, w: b.width, h: b.height, vw: innerWidth, vh: innerHeight, sh: t.scrollHeight, ch: t.clientHeight, ov: cs.overflow, color: cs.color, bg: cs.backgroundColor }; });
        r.taptip = tip;
        r.taptipIntero = !!tip && tip.text.startsWith(EXPECT) && tip.x >= 0 && tip.x + tip.w <= tip.vw && tip.y >= 0 && tip.y + tip.h <= tip.vh && tip.sh <= tip.ch + 1;
        await page.screenshot({ path: path.join(OUT, `taptip_${w}_${r.tema}.png`) });
      } else {
        await el.hover();
        await page.screenshot({ path: path.join(OUT, `tabella_${w}_${r.tema}.png`), clip: { x: 0, y: Math.max(0, box.y - 250), width: w, height: 500 } });
      }
    }
    results.push(r);
    await ctx.close();
  }
  await browser.close();
  require('fs').writeFileSync(path.join(__dirname, 'tooltip_risultati.json'), JSON.stringify(results, null, 1));
  for (const r of results) console.log(JSON.stringify({ ...r, taptip: r.taptip && { ...r.taptip, text: r.taptip.text.length + ' caratteri' } }));
})();
