// Percorsi 1 e 3 su computer: vista 8, navigazione, comandi, indirizzi, cronologia, guida, help, tempi
const { chromium, BASE, SHOTS, check, summary, open, waitEmg, hscroll } = require('./lib.cjs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const { ctx, page, errors, reqs } = await open(browser, { theme });
    const t = `[1440 ${theme}]`;
    check(`${t} emerging.json non scaricato all'avvio`, !reqs.some((u) => u.includes('emerging.json') && u.includes('data/')), reqs.filter((u) => u.includes('emerging')));
    const tab = page.locator('#tab-emg');
    check(`${t} scheda «8 Emergenti» visibile`, await tab.isVisible(), await tab.textContent());
    const t0 = Date.now();
    await tab.click();
    await waitEmg(page);
    const dt = Date.now() - t0;
    check(`${t} vista aperta con il clic in < 3 s`, dt < 3000, dt + ' ms');
    check(`${t} emerging.json scaricato alla prima apertura`, reqs.some((u) => /data\/emerging\.json/.test(u)));
    check(`${t} indirizzo #emg-<indice>`, /#emg-[A-Z0-9]+$/.test(page.url()), page.url());
    const rows = await page.$$eval('#emTable tbody tr', (trs) => trs.map((tr) => tr.dataset.em));
    check(`${t} 7 righe nel tabellone nell'ordine atteso`, JSON.stringify(rows) === JSON.stringify(['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM']), rows);
    const kpis = await page.$$eval('#emKpis .kpi', (k) => k.map((e) => e.innerText.replace(/\s+/g, ' ')));
    check(`${t} 5 riquadri`, kpis.length === 5, kpis);
    const hs = await hscroll(page);
    check(`${t} nessuno scroll orizzontale della pagina`, hs.sw <= hs.cw + 1, hs);
    // il tabellone non scorre in orizzontale su computer
    const ts = await page.$eval('#emTable', (e) => { const w = e.closest('.tscroll'); return { sw: w.scrollWidth, cw: w.clientWidth }; });
    check(`${t} tabellone senza scroll interno a 1440`, ts.sw <= ts.cw + 1, ts);
    await page.screenshot({ path: path.join(SHOTS, `1440-${theme}-emg.png`), fullPage: true });

    // Percorso 1: KOSPI — clic sulla riga
    await page.click('#emTable tbody tr[data-em="KOSPI200"]');
    await page.waitForFunction(() => /KOSPI200/.test(document.getElementById('emTitle').textContent));
    check(`${t} clic sulla riga KOSPI200 apre il dettaglio`, true, await page.textContent('#emTitle'));
    check(`${t} indirizzo #emg-KOSPI200 dopo il clic`, page.url().endsWith('#emg-KOSPI200'), page.url());
    const krow = await page.$eval('#emTable tbody tr[data-em="KOSPI200"]', (tr) => ({ sel: tr.classList.contains('sel'), aria: tr.getAttribute('aria-selected'), txt: tr.innerText.replace(/\s+/g, ' ') }));
    check(`${t} riga KOSPI200 evidenziata`, krow.sel, krow);
    const fxTitle = await page.$eval('#emTable tbody tr[data-em="KOSPI200"] .c-fx .fxp', (e) => ({ txt: e.textContent, title: e.title })).catch(() => null);
    check(`${t} stato della valuta KRW con spiegazione al passaggio`, fxTitle && fxTitle.title.length > 20, fxTitle);
    const stateBadge = await page.$eval('#emTable tbody tr[data-em="KOSPI200"] .c-state', (e) => ({ txt: e.innerText, title: (e.querySelector('[title]') || {}).title || '' }));
    check(`${t} stato KOSPI ha una spiegazione al passaggio`, stateBadge.title.length > 0, stateBadge);
    await page.screenshot({ path: path.join(SHOTS, `1440-${theme}-kospi.png`), fullPage: true });

    // tooltip sul grafico
    await page.locator('#emChart').scrollIntoViewIfNeeded();
    const box = await page.locator('#emChart').boundingBox();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
    await page.waitForTimeout(150);
    const tip = await page.$eval('#emTip', (e) => ({ hidden: e.hidden, txt: e.innerText.replace(/\s+/g, ' ') }));
    check(`${t} riquadro dei valori sul grafico al passaggio`, !tip.hidden && /Prezzo/.test(tip.txt), tip);
    const tipBox = await page.locator('#emTip').boundingBox();
    check(`${t} riquadro dei valori dentro la finestra`, tipBox && tipBox.x >= 0 && tipBox.x + tipBox.width <= 1440, tipBox);
    await page.mouse.move(5, 5);

    // Periodi
    for (const r of ['10A', 'MAX', '3A']) {
      await page.click(`#emRange button[data-range="${r}"]`);
      const p = await page.$eval(`#emRange button[data-range="${r}"]`, (b) => b.getAttribute('aria-pressed'));
      check(`${t} periodo ${r} premuto`, p === 'true');
    }
    await page.click('#emRange button[data-range="10A"]');
    await page.reload(); await page.waitForFunction(() => document.getElementById('loadingNote').hidden); await waitEmg(page);
    check(`${t} ricarica su #emg-KOSPI200 riapre KOSPI200`, /KOSPI200/.test(await page.textContent('#emTitle')), page.url());
    check(`${t} periodo 10A ricordato dopo la ricarica`, (await page.$eval('#emRange button[data-range="10A"]', (b) => b.getAttribute('aria-pressed'))) === 'true');
    await page.click('#emRange button[data-range="3A"]');

    // Indietro / avanti tra le selezioni
    await page.click('#emTable tbody tr[data-em="IBOV"]');
    await page.waitForFunction(() => location.hash === '#emg-IBOV');
    await page.click('#emTable tbody tr[data-em="TWN"]');
    await page.waitForFunction(() => location.hash === '#emg-TWN');
    await page.goBack(); await page.waitForTimeout(400);
    check(`${t} Indietro torna a IBOV`, page.url().endsWith('#emg-IBOV') && /IBOV/.test(await page.textContent('#emTitle')), [page.url(), await page.textContent('#emTitle')]);
    await page.goBack(); await page.waitForTimeout(400);
    check(`${t} Indietro di nuovo torna a KOSPI200`, page.url().endsWith('#emg-KOSPI200') && /KOSPI200/.test(await page.textContent('#emTitle')), [page.url(), await page.textContent('#emTitle')]);
    const selRow = await page.$eval('#emTable tbody tr.sel', (tr) => tr.dataset.em);
    check(`${t} dopo Indietro la riga evidenziata coincide con il dettaglio`, selRow === 'KOSPI200', selRow);
    await page.goForward(); await page.waitForTimeout(400);
    check(`${t} Avanti torna a IBOV`, page.url().endsWith('#emg-IBOV'), page.url());

    // pulsante «Apri nella vista 6» e ritorno
    await page.click('#emOpenIx');
    await page.waitForFunction(() => !document.getElementById('v-idx').hidden);
    await page.waitForTimeout(500);
    const ixTitle = await page.evaluate(() => { const r = document.getElementById('ixDetail').getBoundingClientRect(); return { hash: location.hash, h: document.getElementById('ixTitle').textContent, detTop: Math.round(r.top) }; });
    check(`${t} «Apri nella vista 6» apre IBOV nella vista 6`, /IBOV|Ibovespa|Bovespa/i.test(ixTitle.h), { hash: ixTitle.hash, h: ixTitle.h });
    const back8 = await page.$$eval('#v-idx a, #v-idx button', (els) => els.filter((e) => e.offsetParent && /emergent|vista 8/i.test(e.textContent)).map((e) => ({ t: e.textContent.trim(), tag: e.tagName, href: e.getAttribute('href') })));
    check(`${t} nella vista 6 un collegamento alla vista 8`, back8.length > 0, back8);
    if (back8.length) {
      await page.locator('#v-idx a, #v-idx button').filter({ hasText: /emergent|vista 8/i }).first().click();
      await page.waitForFunction(() => !document.getElementById('v-emg').hidden);
      check(`${t} link della vista 6 riapre la vista 8 su IBOV`, page.url().endsWith('#emg-IBOV'), page.url());
    }
    await page.goBack(); await page.waitForTimeout(400);
    check(`${t} Indietro dalla vista 8 torna alla vista 6`, !(await page.$eval('#v-idx', (e) => e.hidden)), page.url());
    await page.goBack(); await page.waitForTimeout(400);
    check(`${t} Indietro ancora torna alla vista 8`, !(await page.$eval('#v-emg', (e) => e.hidden)), page.url());

    // quadrante: clic su un punto
    const dot = page.locator('#emRS g.emdot[data-em="HSI"]');
    await dot.click();
    await page.waitForFunction(() => /HSI/.test(document.getElementById('emTitle').textContent));
    check(`${t} clic sul punto HSI del quadrante seleziona HSI`, page.url().endsWith('#emg-HSI'), page.url());
    const dots = await page.$$eval('#emRS g.emdot', (g) => g.map((e) => ({ k: e.dataset.em, bb: (() => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(), lab: e.textContent })));
    check(`${t} 7 punti nel quadrante`, dots.length === 7, dots);
    // sovrapposizioni tra etichette del quadrante
    const ov = [];
    for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
      const a = dots[i].bb, b = dots[j].bb;
      if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) ov.push(dots[i].k + '/' + dots[j].k);
    }
    check(`${t} punti/etichette del quadrante non sovrapposti`, ov.length === 0, ov);

    // tasti 1–8
    await page.locator('body').click({ position: { x: 5, y: 300 } }).catch(() => {});
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    const views = ['mon', 'rrg', 'btm', 'sec', 'alr', 'idx', 'tit', 'emg'];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press(String(i + 1));
      await page.waitForTimeout(i === 7 ? 600 : 300);
      const vis = await page.$$eval('section.view', (s) => s.filter((e) => !e.hidden).map((e) => e.id));
      check(`${t} tasto ${i + 1} apre ${views[i]}`, vis.length === 1 && vis[0] === 'v-' + views[i], vis);
    }
    // comandi
    for (const [cmd, exp, hash] of [['EMG', 'emg', /#emg-/], ['emergenti', 'emg', /#emg-/], ['MON', 'mon', /#mon/], ['CSI300 EMG', 'emg', /#emg-CSI300$/], ['nifty50 emg', 'emg', /#emg-NIFTY50$/], ['KOSPI200 EMG', 'emg', /#emg-KOSPI200$/]]) {
      await page.fill('#cmd', cmd); await page.press('#cmd', 'Enter'); await page.waitForTimeout(500);
      const vis = await page.$$eval('section.view', (s) => s.filter((e) => !e.hidden).map((e) => e.id));
      check(`${t} comando «${cmd}»`, vis[0] === 'v-' + exp && hash.test(page.url()), [vis, page.url()]);
    }
    // comandi che un utente potrebbe provare
    for (const [cmd, exp] of [['KOSPI EMG', /#emg-KOSPI200$/], ['EMG KOSPI200', /#emg-KOSPI200$/], ['IBOVESPA EMG', /#emg-IBOV$/], ['NIFTY EMG', /#emg-NIFTY50$/]]) {
      await page.goto(BASE + '#mon'); await page.waitForTimeout(300);
      await page.fill('#cmd', cmd); await page.press('#cmd', 'Enter'); await page.waitForTimeout(500);
      const ph = await page.getAttribute('#cmd', 'placeholder');
      check(`${t} [esplorativo] comando «${cmd}»`, exp.test(page.url()), [page.url(), ph]);
    }

    // indirizzo diretto e indirizzo sbagliato
    for (const [h, exp] of [['emg-IBOV', /#emg-IBOV$/], ['emg-kospi200', /#emg-KOSPI200$/], ['emg', /#emg-[A-Z0-9]+$/], ['emg-FOO', /#emg-[A-Z0-9]+$/]]) {
      const p2 = await ctx.newPage();
      await p2.goto(BASE + '#' + h); await p2.waitForFunction(() => document.getElementById('loadingNote').hidden); await waitEmg(p2);
      await p2.waitForTimeout(300);
      check(`${t} indirizzo #${h}`, exp.test(p2.url()) && !(await p2.$eval('#v-emg', (e) => e.hidden)), [p2.url(), await p2.textContent('#emTitle')]);
      await p2.close();
    }

    // link della guida dal footer/help: guida.html#emg
    await page.goto(BASE + '#emg-IBOV'); await page.waitForFunction(() => document.getElementById('loadingNote').hidden); await waitEmg(page);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('?');
    await page.waitForTimeout(300);
    const help = await page.evaluate(() => ({ open: document.getElementById('helpModal').open, href: document.getElementById('guideLink').getAttribute('href'), txt: document.getElementById('helpModal').innerText }));
    check(`${t} tasto ? apre la guida rapida`, help.open);
    check(`${t} link «Guida completa» punta a guida.html#emg`, help.href === 'guida.html#emg', help.href);
    check(`${t} guida rapida cita la vista 8`, /8 Emergenti/.test(help.txt) && /1\s*–\s*8/.test(help.txt));
    await page.keyboard.press('Escape');
    const gp = await ctx.newPage();
    await gp.goto(BASE + 'guida.html#emg');
    const g = await gp.evaluate(() => { const s = document.getElementById('emg'); const r = s.getBoundingClientRect(); return { top: Math.round(r.top), h2: s.querySelector('h2').textContent, open: s.querySelector('a.open').getAttribute('href') }; });
    check(`${t} guida.html#emg scorre alla sezione`, Math.abs(g.top) < 120, g);
    await gp.click('#emg a.open');
    await gp.waitForFunction(() => document.getElementById('loadingNote') && document.getElementById('loadingNote').hidden);
    await waitEmg(gp);
    check(`${t} «Apri gli Emergenti» dalla guida apre la vista 8`, !(await gp.$eval('#v-emg', (e) => e.hidden)), gp.url());
    await gp.close();

    const errs = errors.filter((e) => !/favicon/.test(e));
    check(`${t} console senza errori né avvisi`, errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close();
  summary('a-computer');
})().catch((e) => { console.error(e); process.exit(1); });
