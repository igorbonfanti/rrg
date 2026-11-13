// Controllo dei testi della vista 8 VIX nella pagina: testi tagliati, sovrapposti, fuori dal riquadro; screenshot.
// Uso: BASE=http://127.0.0.1:8798/ NODE_PATH=/opt/node-tools/node_modules node ricerca/qa/1.5.0/testi/shots_testi.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8798/';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const res = {};
(async () => {
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1440-chiaro', { viewport: { width: 1440, height: 900 } }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'dark'], ['390-chiaro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light']]) {
    const ctx = await b.newContext(opt);
    await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxTable tbody tr', { timeout: 30000 }); await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const out = { clipped: [], svgOverlap: [], outside: [] };
      const vis = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getClientRects().length; };
      // testi HTML tagliati (overflow nascosto o ellipsis) dentro la vista
      for (const e of document.querySelectorAll('#v-vix *')) {
        if (!vis(e) || e.closest('svg')) continue;
        const s = getComputedStyle(e);
        if ((s.overflowX === 'hidden' || s.textOverflow === 'ellipsis' || s.overflow === 'hidden') && e.scrollWidth > e.clientWidth + 1 && e.textContent.trim()) out.clipped.push([e.id || e.className || e.tagName, e.textContent.trim().slice(0, 80), e.scrollWidth, e.clientWidth]);
      }
      // tabelle: colonne che escono dal riquadro senza scorrimento
      for (const t of document.querySelectorAll('#v-vix .tscroll')) out.outside.push([t.querySelector('table').id, t.scrollWidth, t.clientWidth]);
      // testi SVG sovrapposti
      for (const svg of document.querySelectorAll('#v-vix svg')) {
        const ts = [...svg.querySelectorAll('text')].filter((x) => x.textContent.trim()).map((x) => ({ t: x.textContent, r: x.getBoundingClientRect() }));
        const sr = svg.getBoundingClientRect();
        for (let i = 0; i < ts.length; i++) {
          const a = ts[i].r;
          if (a.left < sr.left - 1 || a.right > sr.right + 1) out.svgOverlap.push([svg.id, 'fuori', ts[i].t]);
          for (let j = i + 1; j < ts.length; j++) { const c = ts[j].r; const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (ix > 1 && iy > 1) out.svgOverlap.push([svg.id, ts[i].t, ts[j].t]); }
        }
      }
      out.kpis = [...document.querySelectorAll('#vxKpis .kpi')].map((k) => k.innerText.replace(/\n/g, ' | '));
      out.meta = document.getElementById('vxMeta').innerText; out.tableMeta = document.getElementById('vxTableMeta').innerText;
      out.scMeta = document.getElementById('vxScMeta').innerText; out.scNote = document.getElementById('vxScNote').innerText;
      out.table = [...document.querySelectorAll('#vxTable tr')].map((tr) => tr.innerText.replace(/\s+/g, ' '));
      out.sw = [document.documentElement.scrollWidth, document.documentElement.clientWidth];
      return out;
    });
    res[name] = { ...r, errs };
    await p.locator('#v-vix').screenshot({ path: path.join(OUT, `vix-${name}.png`) });
    // tooltip dello scatter e del grafico
    const sc = await p.locator('#vxScatter').boundingBox();
    if (sc) { await p.mouse.move(sc.x + sc.width * 0.3, sc.y + sc.height * 0.3); await p.waitForTimeout(200); }
    const pts = await p.$$eval('#vxScatter circle.vxpt.start', (cs) => cs.map((c) => { const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
    if (pts.length) { if (opt.hasTouch) await p.touchscreen.tap(pts[0][0], pts[0][1]); else await p.mouse.move(pts[0][0], pts[0][1]); await p.waitForTimeout(300); await p.locator('#vxScWrap').screenshot({ path: path.join(OUT, `scatter-tip-${name}.png`) }); res[name].scTip = await p.evaluate(() => { const t = document.getElementById('vxScTip'); return t.hidden ? null : t.innerText; }); }
    const ch = await p.locator('#vxChart').boundingBox();
    if (ch) { const x = ch.x + ch.width * 0.97, y = ch.y + ch.height * 0.4; if (opt.hasTouch) await p.touchscreen.tap(x, y); else await p.mouse.move(x, y); await p.waitForTimeout(300); await p.locator('#vxWrap').screenshot({ path: path.join(OUT, `chart-tip-${name}.png`) }); res[name].chTip = await p.evaluate(() => { const t = document.getElementById('vxTip'); if (t.hidden) return null; const r = t.getBoundingClientRect(), w = document.getElementById('vxWrap').getBoundingClientRect(); return { txt: t.innerText, inside: r.left >= w.left - 1 && r.right <= w.right + 1 }; }); }
    // Nasdaq-100 e soglia 50
    await p.locator('#vxIx button[data-ix="NDX"]').click(); await p.waitForTimeout(300);
    await p.locator('#vxTable tr[data-x="50"]').click(); await p.waitForTimeout(300);
    res[name].ndx = await p.evaluate(() => ({ table: [...document.querySelectorAll('#vxTable tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ')), eps: [...document.querySelectorAll('#vxEps tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ')), scNote: document.getElementById('vxScNote').innerText, robust: [...document.querySelectorAll('#vxTable .vxrob')].map((x) => x.closest('tr').dataset.x) }));
    await p.locator('#v-vix .vix-grid').screenshot({ path: path.join(OUT, `ndx50-${name}.png`) });
    // aiuto (guida rapida)
    await p.goto(BASE + '#mon'); await p.waitForTimeout(800);
    await p.evaluate(() => { const b = document.querySelector('[aria-controls="help"], #helpBtn, button[data-help]'); if (b) b.click(); });
    await p.keyboard.press('?'); await p.waitForTimeout(400);
    res[name].help = await p.evaluate(() => { const h = [...document.querySelectorAll('dialog, .modal, #help')].find((x) => x.offsetParent || x.open); return h ? h.innerText.match(/Tasti:[^\n]*/)?.[0] : null; });
    await ctx.close();
  }
  // guida, sezione VIX e comandi
  for (const [name, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 }]]) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage();
    await p.goto(BASE + 'guida.html#vix'); await p.waitForTimeout(600);
    await p.locator('#vix').screenshot({ path: path.join(OUT, `guida-vix-${name}.png`) });
    await p.locator('#comandi').screenshot({ path: path.join(OUT, `guida-comandi-${name}.png`) });
    res['guida-' + name] = await p.evaluate(() => ({ sw: [document.documentElement.scrollWidth, document.documentElement.clientWidth], indirizzi: [...document.querySelectorAll('#comandi p')].map((x) => x.innerText).find((t) => t.startsWith('Indirizzi')) }));
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, 'shots_testi.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
})();
