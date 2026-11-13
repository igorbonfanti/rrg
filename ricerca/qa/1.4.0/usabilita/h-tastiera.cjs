// Percorso 6: tastiera e accessibilità di base nella vista 8 (computer 1440, chiaro e scuro)
const { chromium, SHOTS, check, summary, open, waitEmg } = require('./lib.cjs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const t = `[tastiera ${theme}]`;
    const { ctx, page, errors } = await open(browser, { theme });
    // ruoli delle schede
    const roles = await page.evaluate(() => ({
      list: document.querySelector('.fnkeys').getAttribute('role'),
      tab: (() => { const b = document.getElementById('tab-emg'); return { role: b.getAttribute('role'), controls: b.getAttribute('aria-controls'), sel: b.getAttribute('aria-selected'), ti: b.tabIndex }; })(),
      panel: (() => { const s = document.getElementById('v-emg'); return { role: s.getAttribute('role'), by: s.getAttribute('aria-labelledby') }; })(),
    }));
    check(`${t} scheda 8: role=tab, aria-controls=v-emg, tabpanel etichettato`, roles.list === 'tablist' && roles.tab.role === 'tab' && roles.tab.controls === 'v-emg' && roles.panel.role === 'tabpanel' && roles.panel.by === 'tab-emg', roles);
    // frecce sulle schede: da 1 con Fine arriva a 8, Destra da 8 torna a 1
    await page.focus('#tab-mon');
    await page.keyboard.press('End'); await page.waitForTimeout(500);
    let a = await page.evaluate(() => ({ id: document.activeElement.id, sel: document.getElementById('tab-emg').getAttribute('aria-selected'), ti: document.getElementById('tab-emg').tabIndex, others: [...document.querySelectorAll('.fnkeys [role=tab]')].filter((b) => b.tabIndex === 0).length }));
    check(`${t} Fine sulle schede apre e mette il focus su «8 Emergenti» (un solo tabindex=0)`, a.id === 'tab-emg' && a.sel === 'true' && a.others === 1, a);
    await waitEmg(page);
    const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { style: cs.outlineStyle, w: cs.outlineWidth, c: cs.outlineColor, fv: document.activeElement.matches(':focus-visible') }; });
    check(`${t} focus visibile sulla scheda 8`, ring.fv && ring.style !== 'none' && parseFloat(ring.w) >= 2, ring);
    await page.screenshot({ path: path.join(SHOTS, `kb-${theme}-tab.png`), clip: { x: 0, y: 0, width: 1440, height: 120 } });
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
    a = await page.evaluate(() => document.activeElement.id);
    check(`${t} Destra da 8 torna a 1`, a === 'tab-mon', a);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(500);
    await waitEmg(page);
    // ordine di tabulazione dalla scheda 8 in avanti
    const order = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => { const e = document.activeElement; return (e.id ? '#' + e.id : '') + (e.dataset && e.dataset.em ? `[${e.tagName.toLowerCase()} ${e.dataset.em}]` : '') + (e.dataset && e.dataset.range ? `[range ${e.dataset.range}]` : '') + (!e.id && !(e.dataset && (e.dataset.em || e.dataset.range)) ? e.tagName.toLowerCase() + '.' + (e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) + ' ' + (e.textContent || '').trim().slice(0, 20) : ''); }));
    }
    console.log('ordine di tabulazione:', order.join(' → '));
    const firstRow = order.findIndex((x) => /\[tr /.test(x));
    check(`${t} dalla scheda 8 la prima riga del tabellone si raggiunge in pochi Tab`, firstRow >= 0 && firstRow < 6, { firstRow, primi: order.slice(0, 6) });
    const rowsInOrder = order.filter((x) => /\[tr /.test(x)).map((x) => x.match(/tr (\w+)/)[1]);
    check(`${t} le 7 righe nell'ordine del tabellone`, rowsInOrder.join() === 'CSI300,NIFTY50,IBOV,KOSPI200,TWN,HSI,EEM', rowsInOrder);
    const iRange = order.findIndex((x) => /range 3A/.test(x)), iOpen = order.indexOf('#emOpenIx'), iDot = order.findIndex((x) => /\[g /.test(x));
    check(`${t} poi periodo, «Apri nella vista 6», punti del quadrante (in quest'ordine)`, firstRow < iRange && iRange < iOpen && iOpen < iDot, { iRange, iOpen, iDot });
    // focus visibile sulle righe e sui punti
    await page.focus('#emTable tbody tr[data-em="IBOV"]');
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    const rf = await page.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return { em: e.dataset.em, fv: e.matches(':focus-visible'), style: cs.outlineStyle, w: cs.outlineWidth, c: cs.outlineColor }; });
    check(`${t} focus visibile su una riga del tabellone`, rf.fv && rf.style !== 'none' && parseFloat(rf.w) >= 1, rf);
    await page.locator('#emTable tbody tr[data-em="IBOV"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, `kb-${theme}-riga.png`), clip: { x: 0, y: 180, width: 1100, height: 320 } });
    // Invio su una riga: seleziona e il focus resta sulla riga
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    let f = await page.evaluate(() => ({ hash: location.hash, em: document.activeElement.dataset.em, tag: document.activeElement.tagName }));
    check(`${t} Invio sulla riga IBOV la seleziona e il focus resta lì`, f.hash === '#emg-IBOV' && f.em === 'IBOV', f);
    // Spazio su una riga (ruolo implicito di pulsante?)
    await page.keyboard.press('ArrowDown');
    await page.focus('#emTable tbody tr[data-em="TWN"]');
    await page.keyboard.press(' '); await page.waitForTimeout(400);
    f = await page.evaluate(() => ({ hash: location.hash, y: scrollY }));
    check(`${t} [esplorativo] Spazio sulla riga TWN la seleziona`, f.hash === '#emg-TWN', f);
    const rowRole = await page.$eval('#emTable tbody tr[data-em="TWN"]', (tr) => ({ role: tr.getAttribute('role'), sel: tr.getAttribute('aria-selected'), cur: tr.getAttribute('aria-current'), label: tr.getAttribute('aria-label') }));
    check(`${t} la riga selezionata è annunciata come tale (aria-selected/aria-current)`, !!(rowRole.sel || rowRole.cur), rowRole);
    // punti del quadrante: Invio seleziona; il focus resta sul punto?
    await page.focus('#emRS g.emdot[data-em="EEM"]');
    const df = await page.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return { em: e.dataset && e.dataset.em, fv: e.matches(':focus-visible'), style: cs.outlineStyle, w: cs.outlineWidth }; });
    check(`${t} focus visibile su un punto del quadrante`, df.em === 'EEM' && df.style !== 'none' && parseFloat(df.w) >= 1, df);
    await page.locator('#emRS').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, `kb-${theme}-punto.png`), clip: { x: 1060, y: 0, width: 380, height: 700 } });
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    f = await page.evaluate(() => ({ hash: location.hash, active: document.activeElement === document.body ? 'body' : (document.activeElement.dataset && document.activeElement.dataset.em) || document.activeElement.tagName }));
    check(`${t} Invio sul punto EEM lo seleziona`, f.hash === '#emg-EEM', f);
    check(`${t} dopo Invio sul punto il focus non si perde (non torna al body)`, f.active !== 'body', f);
    await page.focus('#emRS g.emdot[data-em="HSI"]');
    await page.keyboard.press(' '); await page.waitForTimeout(400);
    check(`${t} [esplorativo] Spazio sul punto HSI (role=button) lo seleziona`, (await page.evaluate(() => location.hash)) === '#emg-HSI', await page.evaluate(() => location.hash));
    // periodi: gruppo etichettato come nella vista 6
    const seg = await page.$eval('#emRange', (e) => ({ role: e.getAttribute('role'), label: e.getAttribute('aria-label') }));
    check(`${t} pulsanti del periodo in un gruppo etichettato (come #ixRange)`, seg.role === 'group' && !!seg.label, seg);
    // tabellone: intestazioni e didascalia
    const tb = await page.$eval('#emTable', (e) => ({ caption: !!e.querySelector('caption'), label: e.getAttribute('aria-label'), th: e.querySelectorAll('thead th').length }));
    check(`${t} tabellone con intestazioni di colonna`, tb.th === 9, tb);
    // grafico: alternativa testuale
    const ch = await page.$eval('#emChart', (e) => ({ role: e.getAttribute('role'), label: e.getAttribute('aria-label') }));
    check(`${t} grafico con role=img e descrizione`, ch.role === 'img' && !!ch.label, ch);
    // KPI con spiegazione solo nel title
    const kt = await page.$$eval('#emKpis .kpi', (k) => k.map((e) => !!e.title));
    check(`${t} riquadri con spiegazione (title)`, kt.every(Boolean), kt);
    // tasto ? dalla vista 8 con il focus su una riga
    await page.focus('#emTable tbody tr[data-em="CSI300"]');
    await page.keyboard.press('?'); await page.waitForTimeout(300);
    const h = await page.evaluate(() => ({ open: document.getElementById('helpModal').open, href: document.getElementById('guideLink').getAttribute('href') }));
    check(`${t} «?» apre la guida rapida anche con il focus su una riga`, h.open && h.href === 'guida.html#emg', h);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const back = await page.evaluate(() => document.activeElement.dataset && document.activeElement.dataset.em);
    check(`${t} chiusa la guida il focus torna alla riga`, back === 'CSI300', back);
    check(`${t} console pulita`, errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close();
  summary('h-tastiera');
})().catch((e) => { console.error(e); process.exit(1); });
