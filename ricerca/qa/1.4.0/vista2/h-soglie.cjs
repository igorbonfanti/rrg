// H. Larghezze ai bordi delle regole CSS (1440/1439, 1101/1100, 861/860, 601/600, 320): scorrimento orizzontale, righe della barra, colonne della vista 8.
const { chromium, openPage, waitEmg } = require('./lib.cjs');
(async () => { const b = await chromium.launch(); const res = [];
  for (const w of [1440, 1439, 1101, 1100, 861, 860, 601, 600, 320]) { const { ctx, page, errs } = await openPage(b, { width: w, height: 900, touch: w < 900, hash: '#emg' }); await waitEmg(page);
    res.push([w, await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, rows: new Set([...document.querySelectorAll('.fnkeys button')].map((x) => Math.round(x.getBoundingClientRect().top))).size,
      cols: getComputedStyle(document.querySelector('.emg-grid')).gridTemplateColumns, tableScroll: (() => { const t = document.querySelector('#emTable').closest('.tscroll'); return t.scrollWidth - t.clientWidth; })(), rsW: document.getElementById('emRS').viewBox.baseVal.width })), errs.length]); await ctx.close(); }
  for (const r of res) console.log(JSON.stringify(r)); await b.close(); })();
