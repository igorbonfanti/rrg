// Percorso 2: telefono (390 e 360, tocco), chiaro e scuro. Schede su due righe, tabellone a schede, tocchi su righe,
// punti del quadrante e grafico, niente scroll orizzontale, niente testo tagliato, dimensione dei bersagli
const { chromium, SHOTS, check, summary, open, waitEmg, hscroll, clipped } = require('./lib.cjs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 360]) for (const theme of ['dark', 'light']) {
    const t = `[${width} ${theme}]`;
    const { ctx, page, errors } = await open(browser, { width, height: 844, mobile: true, theme });
    // barra delle schede
    const tabs = await page.$$eval('.fnkeys [role=tab]', (b) => b.map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }; }));
    const rows = [...new Set(tabs.map((x) => x.y))];
    check(`${t} 8 schede su due righe`, tabs.length === 8 && rows.length === 2, rows);
    check(`${t} quattro schede per riga`, rows.every((y) => tabs.filter((x) => x.y === y).length === 4), tabs.map((x) => x.t + '@' + x.y));
    check(`${t} testo delle schede non tagliato`, tabs.every((x) => x.sw <= x.cw + 1 && x.sh <= x.ch + 1), tabs.filter((x) => x.sw > x.cw + 1 || x.sh > x.ch + 1));
    const lines = await page.$$eval('.fnkeys [role=tab]', (b) => b.map((e) => { const lh = parseFloat(getComputedStyle(e).lineHeight) || 13; const pt = parseFloat(getComputedStyle(e).paddingTop) + parseFloat(getComputedStyle(e).paddingBottom); return { t: e.textContent, lines: Math.round((e.getBoundingClientRect().height - pt) / lh) }; }));
    check(`${t} ogni scheda su una riga di testo`, lines.every((l) => l.lines <= 1), lines);
    check(`${t} schede alte almeno 32 px`, tabs.every((x) => x.h >= 32), tabs.map((x) => x.h));
    const head = await page.$eval('header, .topbar, nav', (e) => Math.round(e.getBoundingClientRect().height)).catch(() => null);
    const navBottom = await page.$eval('.fnkeys', (e) => Math.round(e.getBoundingClientRect().bottom));
    check(`${t} intestazione + schede entro il 30% dello schermo`, navBottom < 844 * 0.3, { navBottom, head });
    await page.screenshot({ path: path.join(SHOTS, `${width}-${theme}-mon.png`) });

    // apre la vista 8 con un tocco
    await page.tap('#tab-emg');
    await waitEmg(page);
    await page.waitForTimeout(300);
    let hs = await hscroll(page);
    check(`${t} vista 8 senza scroll orizzontale`, hs.sw <= hs.cw + 1, hs);
    const tsc = await page.$eval('#emTable', (e) => { const w = e.closest('.tscroll'); return { sw: w.scrollWidth, cw: w.clientWidth }; });
    check(`${t} tabellone senza scroll orizzontale interno`, tsc.sw <= tsc.cw + 1, tsc);
    const thead = await page.$eval('#emTable thead', (e) => getComputedStyle(e).display);
    check(`${t} tabellone a schede (intestazione nascosta)`, thead === 'none', thead);
    const cards = await page.$$eval('#emTable tbody tr', (trs) => trs.map((tr) => {
      const r = tr.getBoundingClientRect();
      const cells = [...tr.querySelectorAll('td')].map((td) => { const c = td.getBoundingClientRect(); return { cls: td.className, l: Math.round(c.left), r: Math.round(c.right), h: Math.round(c.height), sw: td.scrollWidth, cw: td.clientWidth }; });
      return { k: tr.dataset.em, h: Math.round(r.height), w: Math.round(r.width), cells };
    }));
    const outCells = cards.flatMap((c) => c.cells.filter((x) => x.r > width + 1 || x.l < -1 || x.sw > x.cw + 2).map((x) => c.k + ' ' + x.cls + ' ' + JSON.stringify(x)));
    check(`${t} celle delle schede dentro lo schermo`, outCells.length === 0, outCells);
    check(`${t} schede alte almeno 44 px (bersaglio del tocco)`, cards.every((c) => c.h >= 44), cards.map((c) => c.k + ':' + c.h));
    const cl = await clipped(page, '#v-emg *');
    check(`${t} nessun testo tagliato nella vista 8`, cl.length === 0, cl);
    // etichette delle celle
    const labels = await page.$$eval('#emTable tbody tr[data-em="KOSPI200"] td', (tds) => tds.map((td) => (getComputedStyle(td, '::before').content || '').replace(/"/g, '') + ' ' + td.innerText.replace(/\s+/g, ' ')));
    check(`${t} scheda KOSPI200 con le etichette dei valori`, labels.filter((l) => /^(breadth|blu|drawdown|valuta|3 mesi|in \$|vs ACWI)/.test(l.trim())).length >= 6, labels);
    await page.screenshot({ path: path.join(SHOTS, `${width}-${theme}-emg-top.png`) });
    // kpi
    const kp = await page.$$eval('#emKpis .kpi', (k) => k.map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), x: Math.round(r.x), sw: e.scrollWidth, cw: e.clientWidth }; }));
    check(`${t} riquadri dentro lo schermo`, kp.every((k) => k.x >= 0 && k.x + k.w <= width + 1 && k.sw <= k.cw + 1), kp);

    // tocco su una riga: dov'è il dettaglio?
    const y0 = await page.evaluate(() => scrollY);
    await page.tap('#emTable tbody tr[data-em="KOSPI200"]');
    await page.waitForFunction(() => /KOSPI200/.test(document.getElementById('emTitle').textContent));
    await page.waitForTimeout(700);
    const pos = await page.evaluate(() => ({ y: scrollY, titleTop: Math.round(document.getElementById('emTitle').getBoundingClientRect().top), vh: innerHeight, hash: location.hash }));
    check(`${t} tocco sulla riga KOSPI200 apre il dettaglio (#emg-KOSPI200)`, pos.hash === '#emg-KOSPI200', pos);
    check(`${t} dopo il tocco il titolo del dettaglio è visibile senza scorrere`, pos.titleTop >= 0 && pos.titleTop < pos.vh, { ...pos, y0 });
    await page.screenshot({ path: path.join(SHOTS, `${width}-${theme}-after-tap.png`) });

    // grafico: tocco mostra il riquadro dei valori
    await page.locator('#emChart').scrollIntoViewIfNeeded();
    const cb = await page.locator('#emChart').boundingBox();
    check(`${t} grafico largo quanto lo schermo`, cb.x >= 0 && cb.x + cb.width <= width + 1, cb);
    await page.touchscreen.tap(cb.x + cb.width * 0.5, cb.y + 60);
    await page.waitForTimeout(200);
    const tip = await page.$eval('#emTip', (e) => { const r = e.getBoundingClientRect(); return { hidden: e.hidden, l: Math.round(r.left), r: Math.round(r.right), txt: e.innerText.replace(/\s+/g, ' ').slice(0, 160) }; });
    check(`${t} tocco sul grafico mostra il riquadro dei valori`, !tip.hidden, tip);
    check(`${t} riquadro dei valori dentro lo schermo`, tip.l >= 0 && tip.r <= width, tip);
    // testi del grafico: sovrapposizioni dei titoli dei pannelli con le etichette dell'asse destro
    const svgTxt = await page.$$eval('#emChart text', (ts) => ts.map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, l: Math.round(r.left), r: Math.round(r.right), top: Math.round(r.top), b: Math.round(r.bottom), fs: parseFloat(getComputedStyle(e).fontSize) }; }));
    const sx = await page.$eval('#emChart', (s) => { const r = s.getBoundingClientRect(); const vb = s.viewBox.baseVal; return r.width / vb.width; });
    const small = svgTxt.filter((x) => x.fs * sx < 9);
    check(`${t} testo del grafico ≥ 9 px reali`, small.length === 0, { scale: sx, small: small.slice(0, 4) });
    const outTxt = svgTxt.filter((x) => x.r > cb.x + cb.width + 1);
    check(`${t} titoli dei pannelli dentro il grafico`, outTxt.length === 0, outTxt);
    await page.screenshot({ path: path.join(SHOTS, `${width}-${theme}-chart-tip.png`) });
    // tocco fuori: il riquadro si chiude
    await page.touchscreen.tap(10, 10);
    await page.waitForTimeout(200);
    check(`${t} tocco fuori chiude il riquadro`, await page.$eval('#emTip', (e) => e.hidden));

    // periodi: bersagli
    const rb = await page.$$eval('#emRange button, #emOpenIx', (b) => b.map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), sw: e.scrollWidth, cw: e.clientWidth }; }));
    check(`${t} pulsanti periodo e «Apri nella vista 6» alti almeno 32 px`, rb.every((b) => b.h >= 32), rb);
    check(`${t} «Apri nella vista 6» dentro lo schermo e non tagliato`, rb.every((b) => b.r <= width && b.sw <= b.cw + 1), rb);

    // quadrante: dimensione e tocco sui punti
    await page.locator('#emRS').scrollIntoViewIfNeeded();
    const rsb = await page.locator('#emRS').boundingBox();
    const dots = await page.$$eval('#emRS g.emdot', (g) => g.map((e) => { const r = e.getBoundingClientRect(); const c = e.querySelector('circle').getBoundingClientRect(); return { k: e.dataset.em, w: Math.round(r.width), h: Math.round(r.height), cx: c.x + c.width / 2, cy: c.y + c.height / 2 }; }));
    check(`${t} quadrante dentro lo schermo`, rsb.x >= 0 && rsb.x + rsb.width <= width + 1, rsb);
    check(`${t} [WCAG 2.5.8] bersagli dei punti del quadrante ≥ 24×24 px`, dots.every((d) => d.w >= 24 && d.h >= 24), dots.map((d) => `${d.k} ${d.w}×${d.h}`));
    // distanza minima tra i centri dei punti
    let mind = Infinity, pair = '';
    for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) { const d = Math.hypot(dots[i].cx - dots[j].cx, dots[i].cy - dots[j].cy); if (d < mind) { mind = d; pair = dots[i].k + '/' + dots[j].k; } }
    check(`${t} punti del quadrante distanti almeno 24 px tra loro`, mind >= 24, { min: Math.round(mind), pair });
    // tocco esattamente sul cerchio di NIFTY50
    const nd = dots.find((d) => d.k === 'NIFTY50');
    await page.touchscreen.tap(nd.cx, nd.cy);
    await page.waitForTimeout(500);
    check(`${t} tocco sul punto INDA seleziona NIFTY50`, (await page.evaluate(() => location.hash)) === '#emg-NIFTY50', await page.evaluate(() => location.hash));
    // tocco 6 px accanto al punto di TWN (dito impreciso)
    const tw = (await page.$$eval('#emRS g.emdot', (g) => g.map((e) => { const c = e.querySelector('circle').getBoundingClientRect(); return { k: e.dataset.em, cx: c.x + c.width / 2, cy: c.y + c.height / 2 }; }))).find((d) => d.k === 'TWN');
    await page.touchscreen.tap(tw.cx - 6, tw.cy + 6);
    await page.waitForTimeout(500);
    check(`${t} [esplorativo] tocco a 6 px dal punto EWT seleziona TWN`, (await page.evaluate(() => location.hash)) === '#emg-TWN', await page.evaluate(() => location.hash));
    const after = await page.evaluate(() => ({ titleTop: Math.round(document.getElementById('emTitle').getBoundingClientRect().top), vh: innerHeight }));
    check(`${t} dopo il tocco nel quadrante il dettaglio cambiato è visibile`, after.titleTop >= 0 && after.titleTop < after.vh, after);
    await page.screenshot({ path: path.join(SHOTS, `${width}-${theme}-quadrante.png`) });
    hs = await hscroll(page);
    check(`${t} ancora nessuno scroll orizzontale alla fine`, hs.sw <= hs.cw + 1, hs);
    // legenda: ogni voce sta nello schermo
    const leg = await page.$$eval('#emLegend > span', (s) => s.map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, r: Math.round(r.right) }; }));
    check(`${t} voci della legenda dentro lo schermo`, leg.every((l) => l.r <= width), leg.filter((l) => l.r > width));
    // vista 6 a confronto: il tocco su una riga porta al dettaglio?
    await page.evaluate(() => { location.hash = '#idx'; });
    await page.waitForFunction(() => document.querySelector('#ixTable tbody tr[data-ix]'), null, { timeout: 30000 });
    await page.tap('#ixTable tbody tr[data-ix="HSI"]').catch(() => page.tap('#ixTable tbody tr[data-ix]'));
    await page.waitForTimeout(900);
    const ixPos = await page.evaluate(() => ({ titleTop: Math.round(document.getElementById('ixTitle').getBoundingClientRect().top), vh: innerHeight }));
    check(`${t} [confronto] nella vista 6 il tocco su una riga porta al dettaglio`, ixPos.titleTop >= 0 && ixPos.titleTop < ixPos.vh, ixPos);
    // schermata intera alla fine: in Playwright lo screenshot fullPage spegne l'emulazione di (pointer: coarse)
    await page.evaluate(() => { location.hash = '#emg-KOSPI200'; }); await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOTS, `${width}-${theme}-emg-full.png`), fullPage: true });
    const errs = errors.filter((e) => !/favicon/.test(e));
    check(`${t} console senza errori`, errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close();
  summary('b-telefono');
})().catch((e) => { console.error(e); process.exit(1); });
