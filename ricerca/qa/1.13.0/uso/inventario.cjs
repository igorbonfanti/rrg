// Inventario dei bottoni «i» per vista (1440 scuro): etichetta, data-guide, dove sta (th/summary/legenda), visibile.
const { chromium, NEW, VIEWS, ctx, watch, go } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch(); const c = await ctx(b, 1440, 'dark'); const p = await c.newPage(); const errs = watch(p);
  const out = {};
  for (const [h, vid, w] of VIEWS) {
    await go(p, NEW, h, w);
    out[h] = await p.evaluate((vid) => [...document.querySelectorAll(`#${vid} button.info`)].map((x) => ({
      label: x.getAttribute('aria-label'), exp: x.getAttribute('aria-expanded'), guide: x.dataset.guide || '', src: x.dataset.src || '',
      vis: !!x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden',
      inTh: !!x.closest('th'), inSum: !!x.closest('summary'), text: x.textContent })), vid);
  }
  // universi della rotazione
  await go(p, NEW, 'rrg', '#rotTable tbody tr');
  out.universi = await p.$$eval('#groupSel option', (o) => o.map((x) => x.value));
  out.help = await p.evaluate(() => [...document.querySelectorAll('#helpModal button.info')].length);
  out.thInfo = await p.evaluate(() => document.querySelectorAll('th button.info').length);
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
