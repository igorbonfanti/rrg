// Riquadro dei valori del grafico in fondo su date scelte: episodio indicato, indice scelto, episodio in corso, crisi del periodo.
const { chromium } = require('playwright'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8808/'; const OUT = path.join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch();
  for (const [name, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const c = await b.newContext(opt);
    await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxChart path.vxix'); await p.waitForTimeout(400);
    const tap = async (l) => (opt.hasTouch ? l.tap() : l.click());
    const at = async (iso) => {
      const q = await p.evaluate((d) => {
        const s = document.querySelector('#vxChart'), fr = s.querySelector('rect.frame').getBBox(), vb = s.viewBox.baseVal, r = s.getBoundingClientRect();
        // date del grafico: prima e ultima dal testo degli assi non bastano; uso le x della linea del VIX
        const pth = s.querySelector('path.vxvix').getAttribute('d'); const xs = pth.match(/[ML]([\d.]+) /g).map((z) => +z.slice(1));
        return { fr: { x: fr.x, y: fr.y, w: fr.width, h: fr.height }, vb: [vb.width, vb.height], r: [r.x, r.y, r.width, r.height], x0: xs[0], x1: xs[xs.length - 1] };
      }, iso);
      return q;
    };
    const tipAt = async (iso, first, last) => {
      const g = await at(); const t = Date.parse(iso), a = Date.parse(first), z = Date.parse(last);
      const xv = g.x0 + (t - a) / (z - a) * (g.x1 - g.x0);
      const X = g.r[0] + xv * g.r[2] / g.vb[0], Y = g.r[1] + (g.fr.y + 20) * g.r[3] / g.vb[1];
      if (opt.hasTouch) { await p.evaluate(() => { document.querySelector('#vxTip').hidden = true; }); await p.touchscreen.tap(X, Y); } else { await p.mouse.move(X - 30, Y + 5); await p.mouse.move(X, Y); }
      await p.waitForTimeout(250);
      return p.evaluate(() => { const t = document.querySelector('#vxTip'); return t.hidden ? null : t.innerText.replace(/\n+/g, ' | '); });
    };
    await tap(p.locator('#vxRange button[data-range="3A"]')); await p.waitForTimeout(300);
    const rng = await p.evaluate(async () => { const d = await (await fetch('data/vix.json')).json(); const s = d.series.SPX; return s.dates ? [s.dates[0], s.dates[s.dates.length - 1]] : Object.keys(s).slice(0, 1); });
    // primo giorno visibile a 3A: ultima data meno 3 anni (prima seduta da lì in poi): ricavo la prima x dalla linea e la data dal riquadro
    for (const ix of ['SPX', 'NDX']) {
      await tap(p.locator(`#vxIx button[data-ix="${ix}"]`)); await p.waitForTimeout(300);
      for (const X of [20, 40]) {
        await tap(p.locator(`#vxTable tr[data-x="${X}"]`)); await p.waitForTimeout(300);
        await p.locator('#vxChart').scrollIntoViewIfNeeded();
        // calibro: riquadro sul primo e ultimo punto
        const g = await at();
        const pick = async (xv) => { const X2 = g.r[0] + xv * g.r[2] / g.vb[0], Y2 = g.r[1] + (g.fr.y + 20) * g.r[3] / g.vb[1]; if (opt.hasTouch) { await p.touchscreen.tap(X2, Y2); } else { await p.mouse.move(X2 - 3, Y2); await p.mouse.move(X2, Y2); } await p.waitForTimeout(200); return p.evaluate(() => document.querySelector('#vxTip').innerText.replace(/\n+/g, ' | ')); };
        const f = (await pick(g.x0 + 0.5)).slice(0, 10), l = (await pick(g.x1 - 0.2)).slice(0, 10);
        const iso = (s) => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`;
        console.log(name, ix, X, 'ultimo punto:', await pick(g.x1 - 0.2));
        for (const d of ['2025-04-08', '2025-06-20', '2024-08-05']) console.log(name, ix, X, d, '->', await tipAt(d, iso(f), iso(l)));
      }
    }
    await p.locator('#vxChart').locator('xpath=ancestor::div[contains(@class,"panel")][1]').screenshot({ path: path.join(OUT, `riquadro-${name}.png`) });
    console.log(name, 'errori', errs);
    await c.close();
  }
  await b.close();
})();
