// Barra delle schede tra 601 e 900 px (tablet in verticale, finestra stretta): sporgenza, scroll orizzontale, 1.4.0 contro 1.3.5
const { chromium, BASE, OLD, SHOTS, open } = require('./lib.cjs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const w of [601, 640, 700, 744, 768, 800, 820, 834, 850, 900]) for (const [lab, base] of [['1.4.0', BASE], ['1.3.5', OLD]]) {
    const { ctx, page } = await open(browser, { width: w, height: 1000, mobile: true, base });
    const m = await page.evaluate(() => {
      const f = document.querySelector('.fnkeys'), fr = f.getBoundingClientRect();
      const frame = document.querySelector('.fnkeys').parentElement.getBoundingClientRect();
      const last = [...f.querySelectorAll('[role=tab]')].filter((e) => !e.hidden).at(-1).getBoundingClientRect();
      return { pageSW: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, barRight: Math.round(fr.right), lastRight: Math.round(last.right), frameRight: Math.round(frame.right) };
    });
    rows.push({ w, lab, ...m, sporge: Math.max(0, m.lastRight - m.frameRight), scrollOrizz: Math.max(0, m.pageSW - m.cw) });
    if (lab === '1.4.0' && (w === 768 || w === 744 || w === 820)) await page.screenshot({ path: path.join(SHOTS, `tab-${w}-1.4.0.png`), clip: { x: 0, y: 0, width: w, height: 320 } });
    if (lab === '1.3.5' && w === 768) await page.screenshot({ path: path.join(SHOTS, `tab-${w}-1.3.5.png`), clip: { x: 0, y: 0, width: w, height: 320 } });
    await ctx.close();
  }
  console.table(rows);
  require('fs').writeFileSync(path.join(__dirname, 'esito-f-tablet.json'), JSON.stringify(rows, null, 1));
  await browser.close();
})();
