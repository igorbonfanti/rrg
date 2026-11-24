// Vista 8 a larghezze di computer e tablet: scroll orizzontale della pagina e del tabellone, testo tagliato, schermate
const { chromium, SHOTS, check, summary, open, waitEmg, hscroll, clipped } = require('./lib.cjs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  for (const [w, h, mobile] of [[1920, 1080, false], [1440, 900, false], [1366, 768, false], [1280, 800, false], [1100, 800, false], [1024, 768, false], [900, 1000, false], [820, 1180, true]]) for (const theme of ['dark', 'light']) {
    const t = `[${w} ${theme}]`;
    const { ctx, page, errors } = await open(browser, { width: w, height: h, mobile, theme, hash: 'emg-KOSPI200' });
    await waitEmg(page); await page.waitForTimeout(300);
    const hs = await hscroll(page);
    check(`${t} pagina senza scroll orizzontale`, hs.sw <= hs.cw + 1, hs);
    const ts = await page.$eval('#emTable', (e) => { const s = e.closest('.tscroll'); return { sw: s.scrollWidth, cw: s.clientWidth }; });
    check(`${t} tabellone senza scroll orizzontale interno`, ts.sw <= ts.cw + 1, ts);
    const cl = await clipped(page, '#v-emg *');
    check(`${t} niente testo tagliato`, cl.length === 0, cl);
    // il dettaglio è visibile nella prima schermata? (computer)
    const det = await page.evaluate(() => Math.round(document.getElementById('emTitle').getBoundingClientRect().top));
    if (!mobile) check(`${t} [esplorativo] titolo del dettaglio nella prima schermata (${det} px su ${h})`, det < h, det);
    // etichette dei titoli dei pannelli del grafico contro l'asse destro
    const sx = await page.$eval('#emChart', (s) => s.getBoundingClientRect().width / s.viewBox.baseVal.width);
    const fs = await page.$$eval('#emChart text', (ts) => Math.min(...ts.map((e) => parseFloat(getComputedStyle(e).fontSize))));
    check(`${t} testo del grafico almeno 9 px reali`, fs * sx >= 9, { fs, sx: +sx.toFixed(2), px: +(fs * sx).toFixed(1) });
    if (theme === 'dark' || w === 1280) await page.screenshot({ path: path.join(SHOTS, `w-${w}-${theme}.png`) });
    check(`${t} console pulita`, errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close();
  summary('i-larghezze');
})().catch((e) => { console.error(e); process.exit(1); });
