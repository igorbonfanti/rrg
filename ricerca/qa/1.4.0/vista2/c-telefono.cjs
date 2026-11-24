// C. Vista 8 sul telefono (390 e 360 px, tocco) e sul tablet (820, 768): barra delle schede, tabellone a schede,
// tocco su una riga (scorrimento al dettaglio), tocco sul grafico (riquadro dentro lo schermo, sopra il dito vicino al fondo),
// tocco fuori, quadrante stretto, Indietro, nessuno scorrimento orizzontale.
const fs = require('fs');
const { chromium, SHOTS, openPage, waitEmg } = require('./lib.cjs');
const out = { problemi: [], controlli: 0, misure: [] };
const bad = (m) => { out.problemi.push(m); console.log('PROBLEMA', m); };
const ok = (c, m) => { out.controlli++; if (!c) bad(m); return c; };
(async () => {
  const browser = await chromium.launch();
  for (const [w, h, touch] of [[390, 844, true], [360, 740, true], [820, 1180, true], [768, 1024, true]]) for (const theme of ['light', 'dark']) {
    const tag = `${w} ${theme}`;
    const { ctx, page, errs } = await openPage(browser, { width: w, height: h, theme, touch });
    await waitEmg(page);
    const m0 = await page.evaluate(() => ({ tops: [...new Set([...document.querySelectorAll('.fnkeys button')].map((b) => Math.round(b.getBoundingClientRect().top)))].length,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      btnH: Math.min(...[...document.querySelectorAll('.fnkeys button')].map((b) => b.getBoundingClientRect().height)),
      tabsText: [...document.querySelectorAll('.fnkeys button')].map((b) => { const r = b.getBoundingClientRect(); return b.scrollWidth > b.clientWidth + 1 ? b.textContent + ' tagliato' : null; }).filter(Boolean),
      rangeH: Math.min(...[...document.querySelectorAll('#emRange button')].map((b) => b.getBoundingClientRect().height)),
      rowH: Math.min(...[...document.querySelectorAll('#emTable tbody tr')].map((b) => b.getBoundingClientRect().height)),
      tableOverflow: (() => { const t = document.querySelector('#emTable').closest('.tscroll'); return t.scrollWidth - t.clientWidth; })(),
      overflowEls: [...document.querySelectorAll('#v-emg *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > document.documentElement.clientWidth + 1 && !e.closest('.tscroll'); }).slice(0, 5).map((e) => e.id || e.className.baseVal || e.className),
      titles: [...document.querySelectorAll('#emChart text.pane-t')].map((t) => { const b = t.getBBox(); return [t.textContent, b.x + b.width]; }), W: document.getElementById('emChart').viewBox.baseVal.width,
      ticks: [...document.querySelectorAll('#emChart text.axt')].filter((t) => { const b = t.getBBox(); return b.x + b.width > document.getElementById('emChart').viewBox.baseVal.width + 0.5; }).map((t) => t.textContent) }));
    out.misure.push([tag, m0]);
    ok(m0.tops === (w > 860 ? 1 : 2), `${tag}: barra delle schede su ${m0.tops} righe`);
    ok(m0.sw <= m0.cw, `${tag}: scorrimento orizzontale della pagina ${m0.sw} > ${m0.cw}`);
    ok(!m0.overflowEls.length, `${tag}: elementi oltre il bordo destro ${m0.overflowEls}`);
    ok(!m0.tabsText.length, `${tag}: testo delle schede tagliato ${m0.tabsText}`);
    ok(m0.tableOverflow <= 1, `${tag}: il tabellone scorre di lato di ${m0.tableOverflow}px`);
    ok(m0.titles.every(([, r]) => r <= m0.W - 56 + 1), `${tag}: titolo di un pannello oltre la cornice ${JSON.stringify(m0.titles)}`);
    ok(!m0.ticks.length, `${tag}: etichette dell'asse tagliate a destra ${m0.ticks}`);
    if (touch) ok(m0.rangeH >= 24 && m0.btnH >= 24, `${tag}: bersagli piccoli (periodo ${m0.rangeH}px, schede ${m0.btnH}px)`);
    await page.screenshot({ path: `${SHOTS}c-${w}-${theme}-pagina.png`, fullPage: true });
    // tocco su una riga: si va al dettaglio
    await page.tap('#emTable tr[data-em="KOSPI200"] .c-name');
    await page.waitForTimeout(900);
    const d = await page.evaluate(() => ({ top: document.getElementById('emTitle').closest('.panel').getBoundingClientRect().top, title: document.getElementById('emTitle').textContent, hash: location.hash }));
    ok(d.title.startsWith('KOSPI200') && d.hash === '#emg-KOSPI200', `${tag}: tocco su KOSPI200 → ${d.title} ${d.hash}`);
    if (w <= 1100) ok(Math.abs(d.top) < 80, `${tag}: dopo il tocco il dettaglio è a ${Math.round(d.top)}px dall'alto (atteso in cima)`);
    // tocco sul grafico, in alto e in basso
    const box = await page.locator('#emChart').boundingBox();
    for (const [lab, fy] of [['pannello del prezzo', 0.15], ['pannello del dollaro', 0.9]]) {
      await page.evaluate((y) => window.scrollTo(0, y), await page.evaluate(() => window.scrollY));
      const b = await page.locator('#emChart').boundingBox();
      // il punto toccato deve essere dentro lo schermo
      let ty = b.y + b.height * fy;
      if (ty > h - 30 || ty < 30) { await page.evaluate((dy) => window.scrollBy(0, dy), ty - (fy > 0.5 ? h - 60 : 120)); await page.waitForTimeout(200); }
      const b2 = await page.locator('#emChart').boundingBox(); ty = b2.y + b2.height * fy;
      await page.touchscreen.tap(b2.x + b2.width * 0.6, ty); await page.waitForTimeout(200);
      const t = await page.evaluate(() => { const e = document.getElementById('emTip'); const r = e.getBoundingClientRect(); return { hidden: e.hidden, top: r.top, bottom: r.bottom, left: r.left, right: r.right, text: e.innerText.replace(/\s+/g, ' ').slice(0, 200) }; });
      out.misure.push([tag, lab, t, ty]);
      ok(!t.hidden, `${tag}: tocco sul ${lab}, nessun riquadro`);
      ok(t.top >= 0 && t.bottom <= h && t.left >= 0 && t.right <= w, `${tag}: riquadro fuori dallo schermo (${Math.round(t.left)},${Math.round(t.top)})-(${Math.round(t.right)},${Math.round(t.bottom)}) toccando il ${lab}`);
      ok(!(t.top < ty && t.bottom > ty && t.left < b2.x + b2.width * 0.6 && t.right > b2.x + b2.width * 0.6), `${tag}: il riquadro copre il dito sul ${lab}`);
      if (fy > 0.5) await page.screenshot({ path: `${SHOTS}c-${w}-${theme}-riquadro-basso.png` });
    }
    // tocco fuori dal grafico: il riquadro si chiude
    await page.tap('#emLegend'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.getElementById('emTip').hidden), `${tag}: il riquadro resta aperto dopo un tocco fuori`);
    // quadrante stretto: etichette che non si toccano, dentro il riquadro
    const q = await page.evaluate(() => { const s = document.getElementById('emRS'), W = s.viewBox.baseVal.width; const bx = [...s.querySelectorAll('g.emdot')].map((g) => { const b = g.querySelector('text').getBBox(); return [g.dataset.em, b.x, b.y, b.x + b.width, b.y + b.height]; });
      const o = []; for (let i = 0; i < bx.length; i++) { if (bx[i][1] < -0.5 || bx[i][3] > W + 0.5) o.push(bx[i][0] + ' fuori'); for (let j = i + 1; j < bx.length; j++) { const A = bx[i], B = bx[j]; if (A[1] < B[3] && A[3] > B[1] && A[2] < B[4] && A[4] > B[2]) o.push(A[0] + '/' + B[0]); } } return { W, o, cw: s.getBoundingClientRect().width }; });
    ok(!q.o.length, `${tag}: quadrante (${q.W}) etichette ${q.o}`);
    out.misure.push([tag, 'quadrante', q]);
    await page.locator('#emRS').screenshot({ path: `${SHOTS}c-${w}-${theme}-quadrante.png` });
    await page.locator('#emChart').screenshot({ path: `${SHOTS}c-${w}-${theme}-grafico.png` });
    // tocco su un punto del quadrante e Indietro
    await page.locator('#emRS g.emdot[data-em="EEM"] circle').tap({ force: true }); await page.waitForTimeout(700);
    const e1 = await page.evaluate(() => ({ t: document.getElementById('emTitle').textContent, h: location.hash, top: document.getElementById('emTitle').closest('.panel').getBoundingClientRect().top }));
    ok(e1.h === '#emg-EEM' && e1.t.startsWith('EEM'), `${tag}: tocco sul punto EEM → ${e1.h}`);
    if (w <= 1100) ok(Math.abs(e1.top) < 80, `${tag}: tocco sul punto EEM: dettaglio a ${Math.round(e1.top)}px dall'alto`);
    await page.goBack(); await page.waitForTimeout(500);
    const e2 = await page.evaluate(() => ({ t: document.getElementById('emTitle').textContent, h: location.hash, sel: [...document.querySelectorAll('#emTable tr.sel')].map((r) => r.dataset.em).join() }));
    ok(e2.h === '#emg-KOSPI200' && e2.t.startsWith('KOSPI200') && e2.sel === 'KOSPI200', `${tag}: Indietro dopo EEM → ${JSON.stringify(e2)}`);
    out.misure.push([tag, 'errori', errs]);
    ok(!errs.length, `${tag}: errori in console ${errs}`);
    await ctx.close();
  }
  fs.writeFileSync(__dirname + '/esito-c-telefono.json', JSON.stringify(out, null, 1));
  console.log('controlli', out.controlli, 'problemi', out.problemi.length);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
