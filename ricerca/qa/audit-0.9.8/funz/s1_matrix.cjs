// Matrice: 4 viewport × 2 temi × 7 viste. Clic sulle schede, overflow, errori, testo sospetto, aria-selected.
const L = require('./lib.cjs');
const R = new L.Rec('s1_matrix');
const VIEWS = ['mon', 'rrg', 'btm', 'sec', 'alr', 'idx', 'tit'];
(async () => {
  const b = await L.launch();
  for (const prof of ['desktop', 'laptop', 'tablet', 'phone']) for (const theme of ['dark', 'light']) {
    const { ctx, page, log } = await L.open(b, prof, { theme });
    const tag = `${prof}-${theme}`;
    const t0 = Date.now();
    await L.goto(page, '', 1200);
    R.add('M0', 'avvio', `${tag} caricamento Monitor`, await page.isVisible('#boardTable tbody tr'), `t=${Date.now() - t0}ms`);
    const th = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    R.add('M1', 'tema', `${tag} tema applicato da localStorage`, th === theme, th);
    for (const v of VIEWS) {
      const tab = `#tab-${v}`;
      await page.click(tab);
      await page.waitForTimeout(v === 'idx' || v === 'tit' ? 3500 : 1200);
      const st = await page.evaluate((v) => ({
        sel: document.getElementById('tab-' + v).getAttribute('aria-selected'),
        vis: !document.getElementById('v-' + v).hidden,
        others: [...document.querySelectorAll('section.view')].filter((s) => !s.hidden).map((s) => s.id),
        hash: location.hash,
        h: document.getElementById('v-' + v).getBoundingClientRect().height,
      }), v);
      const ov = await L.overflow(page);
      const bad = await L.badText(page, '#v-' + v);
      const sp = await L.shot(page, `m-${tag}-${v}`, true);
      R.add('M2', `vista ${v}`, `${tag} apertura con la scheda`, st.sel === 'true' && st.vis && st.others.length === 1 && st.h > 50, JSON.stringify(st), sp);
      R.add('M3', `vista ${v}`, `${tag} niente scroll orizzontale`, ov <= 0, ov > 0 ? `scrollWidth-innerWidth=${ov}; ${(await L.wideEls(page)).join(' | ')}` : '', sp);
      R.add('M4', `vista ${v}`, `${tag} nessun NaN/undefined nel testo`, !bad.length, bad.join(' || '), sp);
    }
    R.add('M5', 'console', `${tag} nessun errore in console`, !log.length, log.join(' | '));
    await ctx.close();
  }
  R.save();
  await b.close();
})();
