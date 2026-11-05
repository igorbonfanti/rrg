// F. Focus da tastiera sui punti del quadrante (visibile? resta dopo Invio?) e riquadro dei valori vicino al fondo della finestra su computer.
const fs = require('fs');
const { chromium, SHOTS, openPage, waitEmg } = require('./lib.cjs');
const out = {};
(async () => {
  const b = await chromium.launch();
  const { page, errs } = await openPage(b, { width: 1440, height: 900, theme: 'dark', hash: '#emg-CSI300' });
  await waitEmg(page);
  // Tab dal pulsante «Apri nella vista 6» in avanti fino al primo punto del quadrante
  await page.focus('#emOpenIx'); const seq = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); seq.push(await page.evaluate(() => { const a = document.activeElement; return a.id || a.dataset.em || a.tagName + '.' + (a.className.baseVal ?? a.className); })); }
  out.ordineTab = seq;
  await page.focus('#emRS g.emdot[data-em="IBOV"]'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  out.focusPunto = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { el: a.dataset.em, outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`, fv: a.matches(':focus-visible') }; });
  await page.locator('#emRS').screenshot({ path: `${SHOTS}f-focus-punto-dark.png` });
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  out.dopoInvio = await page.evaluate(() => ({ active: document.activeElement.tagName, em: document.activeElement.dataset && document.activeElement.dataset.em, sel: document.querySelector('#emTable tr.sel').dataset.em }));
  await page.keyboard.press('Tab'); out.tabDopoInvio = await page.evaluate(() => { const a = document.activeElement; return a.id || a.dataset.em || a.tagName; });
  // riquadro dei valori: pannello del dollaro con il grafico in fondo alla finestra
  await page.focus('#emOpenIx');
  const box0 = await page.locator('#emChart').boundingBox();
  await page.evaluate((y) => window.scrollTo(0, y), box0.y + window.scrollY + box0.height - 880 + 0);
  await page.waitForTimeout(200);
  const bx = await page.locator('#emChart').boundingBox();
  const res = [];
  for (const fy of [0.05, 0.5, 0.85, 0.97]) {
    const y = bx.y + bx.height * fy; if (y > 895 || y < 0) { res.push([fy, 'fuori schermo', y]); continue; }
    for (const fx of [0.02, 0.5, 0.98]) {
      await page.mouse.move(bx.x + bx.width * fx, y); await page.waitForTimeout(60);
      const t = await page.evaluate(() => { const r = document.getElementById('emTip').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), document.getElementById('emTip').hidden]; });
      const px = bx.x + bx.width * fx;
      res.push([fy, fx, Math.round(y), t, t[1] >= 0 && t[3] <= 900 && t[0] >= 0 && t[2] <= 1440 ? 'dentro' : 'FUORI', t[0] < px && t[2] > px && t[1] < y && t[3] > y ? 'COPRE IL PUNTATORE' : '']);
    }
    if (fy === 0.97) await page.screenshot({ path: `${SHOTS}f-riquadro-fondo-1440-dark.png` });
  }
  out.riquadro = res; out.errori = errs;
  fs.writeFileSync(__dirname + '/esito-f-fuoco-riquadro.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
