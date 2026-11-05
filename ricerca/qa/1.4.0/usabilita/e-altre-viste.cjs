// Percorso 4: le altre 7 viste con la nuova barra delle schede, 1.4.0 contro 1.3.5 (pubblicata), a più larghezze e nei due temi.
// Misure: barra delle schede (righe, sporgenze), scroll orizzontale, inizio del contenuto, errori in console.
const { chromium, BASE, OLD, SHOTS, check, summary, open, hscroll } = require('./lib.cjs');
const path = require('path');
const VIEWS = ['mon', 'rrg', 'btm', 'sec', 'alr', 'idx', 'tit'];
const SIZES = [[1440, 900, false], [1280, 800, false], [1024, 768, false], [820, 1180, true], [768, 1024, true], [700, 900, false], [640, 900, false], [601, 900, false], [600, 900, true], [390, 844, true], [360, 780, true]];
(async () => {
  const browser = await chromium.launch();
  for (const [w, h, mobile] of SIZES) for (const theme of (w === 1440 || w === 390 ? ['dark', 'light'] : ['dark'])) {
    const t = `[${w} ${theme}]`;
    const res = {};
    for (const [lab, base] of [['new', BASE], ['old', OLD]]) {
      const { ctx, page, errors } = await open(browser, { width: w, height: h, mobile, theme, base });
      res[lab] = { errors, views: {} };
      const bar = await page.evaluate(() => {
        const f = document.querySelector('.fnkeys'), r = f.getBoundingClientRect();
        const tabs = [...f.querySelectorAll('[role=tab]')].filter((e) => !e.hidden).map((e) => { const b = e.getBoundingClientRect(); return { t: e.textContent, y: Math.round(b.y), r: Math.round(b.right), h: Math.round(b.height), clip: e.scrollWidth > e.clientWidth + 1 }; });
        return { bottom: Math.round(r.bottom), sw: f.scrollWidth, cw: f.clientWidth, rows: [...new Set(tabs.map((x) => x.y))].length, tabs };
      });
      res[lab].bar = bar;
      for (const v of VIEWS) {
        await page.evaluate((v) => { location.hash = '#' + v; }, v);
        await page.waitForTimeout(v === 'idx' || v === 'tit' ? 1500 : 500);
        const hs = await hscroll(page);
        const top = await page.evaluate((v) => { const s = document.getElementById('v-' + v); const c = [...s.children].find((e) => !e.hidden && e.getBoundingClientRect().height > 0); return c ? Math.round(c.getBoundingClientRect().top + scrollY) : null; }, v);
        res[lab].views[v] = { hs, top };
        if (lab === 'new' && (w === 1440 || w === 390 || w === 820 || w === 360)) await page.screenshot({ path: path.join(SHOTS, `alt-${w}-${theme}-${v}.png`) });
      }
      await ctx.close();
    }
    const n = res.new, o = res.old;
    check(`${t} barra delle schede senza sporgenze (8 schede)`, n.bar.sw <= n.bar.cw + 1 && n.bar.tabs.every((x) => x.r <= w + 1 && !x.clip), { rows: n.bar.rows, sw: n.bar.sw, cw: n.bar.cw, out: n.bar.tabs.filter((x) => x.r > w + 1 || x.clip).map((x) => x.t) });
    check(`${t} righe di schede: 1.4.0 ${n.bar.rows} · 1.3.5 ${o.bar.rows}`, w <= 600 ? n.bar.rows === 2 : n.bar.rows <= Math.max(1, o.bar.rows), { new: n.bar.rows, old: o.bar.rows, newBottom: n.bar.bottom, oldBottom: o.bar.bottom });
    check(`${t} altezza della testata non cresce più di 16 px`, n.bar.bottom - o.bar.bottom <= 16, { new: n.bar.bottom, old: o.bar.bottom });
    for (const v of VIEWS) {
      const a = n.views[v], b = o.views[v];
      check(`${t} vista ${v}: nessuno scroll orizzontale nuovo`, a.hs.sw <= a.hs.cw + 1 || a.hs.sw <= b.hs.sw, { new: a.hs, old: b.hs.sw });
      check(`${t} vista ${v}: il contenuto inizia dove prima (±16 px)`, a.top != null && Math.abs(a.top - b.top) <= 16, { new: a.top, old: b.top });
    }
    const ne = n.errors.filter((e) => !/favicon/.test(e));
    check(`${t} console senza errori (1.4.0)`, ne.length === 0, ne);
  }
  await browser.close();
  summary('e-altre-viste');
})().catch((e) => { console.error(e); process.exit(1); });
