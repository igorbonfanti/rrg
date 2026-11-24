// Titoli di pannello visibili senza un «i» (1440 scuro), per vista.
const { chromium, NEW, VIEWS, ctx, go } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch(); const c = await ctx(b, 1440, 'dark'); const p = await c.newPage();
  await p.goto(NEW + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 });
  for (const [h, vid, w] of VIEWS) {
    await go(p, NEW, h, w);
    const r = await p.evaluate((vid) => [...document.querySelectorAll(`#${vid} .ph`)].filter((x) => x.getClientRects().length).map((x) => { const t = x.querySelector('h2, h3, .h2'); return (t ? t.textContent.trim().slice(0, 60) : '(senza titolo)') + (x.querySelector('button.info') ? ' [i]' : ' [—]'); }), vid);
    console.log(`#${h}: ${r.join(' · ')}`);
  }
  await b.close();
})();
