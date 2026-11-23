// Controllo 2: «i» con il resto della pagina (riquadri piegati, ordinamento, zoom ed Esc, scorrimento, cambio vista,
// guida rapida, tastiera dentro il riquadro). 1440 scuro e 390 chiaro (tocco). Esito in interazioni.txt, immagini in shots/int/.
const fs = require('fs'), path = require('path');
const { chromium, NEW, ctx, watch, go, pop, neutral } = require('./lib.cjs');
const SH = path.join(__dirname, 'shots', 'int'); fs.mkdirSync(SH, { recursive: true });
const lines = []; let fail = 0, okn = 0;
const ok = (c, m) => { if (c) okn++; else { fail++; } lines.push((c ? 'OK   ' : 'FAIL ') + m); console.log((c ? 'OK   ' : 'FAIL ') + m); };
const note = (m) => { lines.push('INFO ' + m); console.log('INFO ' + m); };
async function drag(p, sel) {
  const el = p.locator(sel); await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox();
  await p.mouse.move(bb.x + bb.width * 0.35, bb.y + bb.height * 0.4); await p.mouse.down();
  await p.mouse.move(bb.x + bb.width * 0.6, bb.y + bb.height * 0.4, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(400);
}
(async () => {
  const b = await chromium.launch();
  // ---------- computer ----------
  {
    const c = await ctx(b, 1440, 'dark'); const p = await c.newPage(); const errs = watch(p);
    await p.goto(NEW + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 });
    // a) «i» nelle intestazioni di tabella: quanti sono, in tutte le viste
    let th = 0;
    for (const [h, w] of [['mon', '#boardTable tbody tr'], ['rrg', '#rotTable tbody tr'], ['btm', '#bm circle'], ['XLK', '#memTable tbody tr'], ['tit', '#titPain tbody tr'], ['idx', '#ixTable tbody tr'], ['emg', '#emTable tbody tr'], ['vix', '#vxTable tbody tr'], ['alr', '#alertLog li'], ['ath', '#athTable tr.athr']]) {
      await go(p, NEW, h, w); th += await p.evaluate(() => document.querySelectorAll('th button.info, thead button.info').length);
    }
    note(`«i» dentro intestazioni di tabella (th/thead), tutte le viste: ${th}`);
    // «i» accanto a controlli di ordinamento: Massimi (per distanza / per data) e tabella della Rotazione
    await go(p, NEW, 'ath', '#athTable tr.athr');
    const o0 = await p.evaluate(() => [[...document.querySelectorAll('#athSort button')].map((x) => x.getAttribute('aria-pressed')).join(), [...document.querySelectorAll('#athTable tr.athr')].map((r) => r.textContent.slice(0, 12)).join('|')]);
    await p.locator('#athPanel > .ph button.info').click(); await p.waitForTimeout(200);
    const o1 = await p.evaluate(() => [[...document.querySelectorAll('#athSort button')].map((x) => x.getAttribute('aria-pressed')).join(), [...document.querySelectorAll('#athTable tr.athr')].map((r) => r.textContent.slice(0, 12)).join('|')]);
    ok(JSON.stringify(o0) === JSON.stringify(o1) && !!(await pop(p)), 'Massimi: il «i» nel titolo non cambia ordinamento né righe');
    await p.keyboard.press('Escape');
    // ordinamento con clic sull'intestazione della tabella dei membri (vista 4): funziona ancora
    await go(p, NEW, 'XLK', '#memTable tbody tr');
    const thSort = p.locator('#memTable th').nth(2);
    const r0 = await p.$$eval('#memTable tbody tr', (r) => r.slice(0, 3).map((x) => x.textContent.slice(0, 8)).join());
    await thSort.click(); await p.waitForTimeout(300);
    const r1 = await p.$$eval('#memTable tbody tr', (r) => r.slice(0, 3).map((x) => x.textContent.slice(0, 8)).join());
    note(`vista 4: clic sull'intestazione «${(await thSort.textContent()).trim()}» cambia ordine: ${r0 !== r1}`);
    // b) «i» dentro <summary>: non apre né chiude il riquadro piegato (chiuso e aperto), clic e Invio
    for (const [h, w, ids] of [['XLK', '#memTable tbody tr', ['secEpiBox', 'secCap']], ['SOXX', '#memTable tbody tr', ['secEpiBox', 'secCap']], ['idx', '#ixTable tbody tr', null]]) {
      await go(p, NEW, h, w);
      const sums = await p.evaluate((vid) => [...document.querySelectorAll(`#${vid} summary button.info`)].map((x) => x.closest('details').id), h === 'idx' ? 'v-idx' : 'v-sec');
      for (const id of sums) {
        for (const start of [false, true]) {
          await p.evaluate(([id, s]) => { document.getElementById(id).open = s; }, [id, start]);
          const btn = p.locator(`#${id} > summary button.info`);
          await btn.scrollIntoViewIfNeeded(); await btn.click(); await p.waitForTimeout(150);
          const a = await p.evaluate((id) => document.getElementById(id).open, id); const q = await pop(p);
          await p.keyboard.press('Escape'); await btn.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
          const k = await p.evaluate((id) => document.getElementById(id).open, id); const qk = await pop(p);
          await p.keyboard.press('Escape'); await p.keyboard.press(' '); await p.waitForTimeout(150);
          const s = await p.evaluate((id) => document.getElementById(id).open, id);
          await p.keyboard.press('Escape');
          ok(a === start && k === start && s === start && q && qk, `#${h} ${id} (${start ? 'aperto' : 'chiuso'}): clic, Invio e Spazio sul «i» aprono il riquadro e non toccano il <summary>`);
        }
        // clic sul titolo (fuori dal «i") apre ancora il riquadro piegato
        await p.evaluate((id) => { document.getElementById(id).open = false; }, id);
        await p.locator(`#${id} > summary .h2`).click(); await p.waitForTimeout(150);
        ok(await p.evaluate((id) => document.getElementById(id).open, id), `#${h} ${id}: il clic sul titolo apre ancora il riquadro piegato`);
      }
    }
    // c) Esc con lo zoom: primo Esc chiude il riquadro, secondo toglie lo zoom
    for (const [h, w, svg, chip, info] of [
      ['vix', '#vxTable tbody tr', '#vxChart', '#vxZoom', 'button[data-src="vxScHelp"]'],
      ['XLK', '#memTable tbody tr', '#ts', null, '#secEpiBox summary button.info'],
      ['idx', '#ixTable tbody tr', '#ixTs', null, '#v-idx .ph button.info'],
      ['emg', '#emTable tbody tr', '#emChart', '#emZoom', 'button[data-src="emChartHelp"]'],
      ['ath', '#athTable tr.athr', '#athChart', '#athZoom', 'button[data-src="athVpHelp"]']]) {
      await go(p, NEW, h, w);
      if (h === 'ath') { await p.locator('#athTable tr.athr').first().click(); await p.waitForTimeout(800); }
      const zstate = () => p.evaluate(() => [...document.querySelectorAll('.zchip')].some((z) => !z.hidden && z.getClientRects().length));
      await drag(p, svg);
      const z0 = await zstate();
      await p.locator(info).first().scrollIntoViewIfNeeded(); await p.locator(info).first().click(); await p.waitForTimeout(200);
      const p0 = !!(await pop(p));
      if (h === 'vix') await p.screenshot({ path: path.join(SH, 'zoom-e-riquadro-vix-1440.png') });
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      const z1 = await zstate(), p1 = !!(await pop(p));
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      const z2 = await zstate();
      ok(z0 && p0 && !p1 && z1 && !z2, `#${h} ${svg}: zoom ${z0}, riquadro ${p0} → 1° Esc: riquadro ${p1}, zoom ${z1} → 2° Esc: zoom ${z2}`);
    }
    // d) scorrimento con un riquadro aperto (clic): segue il bottone
    await go(p, NEW, 'tit', '#titPain tbody tr');
    const bt = p.locator('button[data-src="titHistHelp"]');
    await bt.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -200)); await bt.click(); await p.waitForTimeout(200);
    const rel = async () => p.evaluate(() => { const b = document.querySelector('button[data-src="titHistHelp"]').getBoundingClientRect(), x = document.getElementById('infopop'); return x.hidden ? null : { d: Math.round(x.getBoundingClientRect().top - b.bottom), bt: Math.round(b.top), pt: Math.round(x.getBoundingClientRect().top) }; });
    const s0 = await rel(); const [nx, ny] = await neutral(p);
    await p.mouse.move(nx, ny); await p.mouse.wheel(0, 250); await p.waitForTimeout(400);
    const s1 = await rel();
    ok(s0 && s1 && Math.abs(s0.d - s1.d) <= 2, `scorrendo di 250 px il riquadro segue il bottone (prima ${JSON.stringify(s0)}, dopo ${JSON.stringify(s1)})`);
    await p.mouse.wheel(0, 1500); await p.waitForTimeout(400);
    const s2 = await rel();
    note(`scorrendo finché il bottone esce dallo schermo: ${JSON.stringify(s2)}`);
    await p.screenshot({ path: path.join(SH, 'scroll-bottone-fuori-1440.png') });
    await p.mouse.wheel(0, -1750); await p.waitForTimeout(400);
    ok(JSON.stringify(await rel()) !== 'null', 'tornando su il riquadro è ancora accanto al bottone');
    await p.keyboard.press('Escape');
    // passaggio del mouse e poi rotella: cosa succede
    const bb = await bt.boundingBox(); await p.mouse.move(bb.x + 8, bb.y + 8); await p.waitForTimeout(350);
    const hv0 = !!(await pop(p)); await p.mouse.wheel(0, 300); await p.waitForTimeout(700);
    note(`aperto col passaggio del mouse, poi rotella di 300 px: aperto prima ${hv0}, dopo ${!!(await pop(p))}`);
    await p.mouse.move(nx, ny); await p.waitForTimeout(500);
    // e) cambio vista con un riquadro aperto
    const viewChanges = [
      ['clic su una scheda (3 Bottom Map)', async () => p.locator('#tab-btm').click()],
      ['tasto 3', async () => { await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('3'); }],
      ['comando VIX nella barra', async () => { await p.fill('#cmd', 'VIX'); await p.press('#cmd', 'Enter'); }],
      ['tasto Indietro del browser', async () => p.goBack()],
    ];
    for (const [what, act] of viewChanges) {
      await go(p, NEW, 'mon', '#boardTable tbody tr'); await p.waitForTimeout(300);
      if (what.includes('Indietro')) { await go(p, NEW, 'tit', '#titPain tbody tr'); }
      const i0 = p.locator(what.includes('Indietro') ? 'button[data-src="titGrandiHelp"]' : 'button[data-src="stateHelp"]');
      await i0.scrollIntoViewIfNeeded(); await i0.click(); await p.waitForTimeout(200);
      if (what === 'tasto 3') await p.evaluate(() => document.activeElement && document.activeElement.blur());
      const before = !!(await pop(p));
      await act(); await p.waitForTimeout(700);
      const q = await pop(p);
      const view = await p.evaluate(() => [...document.querySelectorAll('section.view')].find((s) => !s.hidden).id);
      if (q) await p.screenshot({ path: path.join(SH, `cambio-vista-${what.replace(/[^a-z0-9]+/gi, '-')}.png`) });
      ok(before && !q, `cambio vista con ${what} (→ ${view}): riquadro aperto prima ${before}, dopo ${q ? 'ANCORA APERTO: «' + q.t.slice(0, 50) + '…»' : 'chiuso'}`);
      if (q) { const exp = await p.evaluate(() => [...document.querySelectorAll('button.info[aria-expanded="true"]')].map((x) => x.getAttribute('aria-label') + (x.getClientRects().length ? '' : ' (nascosto)'))); note(`   bottone ancora aria-expanded=true: ${exp}`); await p.keyboard.press('Escape'); }
    }
    // f) tastiera dentro il riquadro: dopo Invio, Tab porta al link «Nella guida»?
    await go(p, NEW, 'vix', '#vxTable tbody tr');
    const vb = p.locator('button[data-src="vxTabHelp"]'); await vb.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    await p.keyboard.press('Tab'); await p.waitForTimeout(150);
    const fin = await p.evaluate(() => ({ inPop: document.getElementById('infopop').contains(document.activeElement), open: !document.getElementById('infopop').hidden, el: document.activeElement.outerHTML.slice(0, 80) }));
    note(`tastiera: Invio sul «i», poi Tab → focus nel riquadro ${fin.inPop}, riquadro aperto ${fin.open}, focus su ${fin.el}`);
    ok(fin.inPop, 'il link «Nella guida ↗» del riquadro si raggiunge con la tastiera');
    await p.keyboard.press('Escape');
    // g) guida rapida (?) con un riquadro aperto
    await vb.click(); await p.waitForTimeout(150);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.keyboard.press('?'); await p.waitForTimeout(400);
    const hm = await p.evaluate(() => document.getElementById('helpModal').open); const qh = await pop(p);
    await p.screenshot({ path: path.join(SH, 'guida-rapida-con-riquadro-1440.png') });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const hm1 = await p.evaluate(() => document.getElementById('helpModal').open);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const hm2 = await p.evaluate(() => document.getElementById('helpModal').open);
    note(`guida rapida aperta con «?» mentre un riquadro è aperto: guida ${hm}, riquadro ancora visibile ${!!qh}; 1° Esc → guida aperta ${hm1}; 2° Esc → guida aperta ${hm2}`);
    ok(!qh && hm && !hm1, 'aprendo la guida rapida il riquadro si chiude e il primo Esc chiude la guida');
    // guida rapida: contenuto e link
    await p.keyboard.press('?'); await p.waitForTimeout(400);
    const hq = await p.evaluate(() => ({ h3: [...document.querySelectorAll('#helpModal h3')].map((x) => x.textContent), words: document.getElementById('helpModal').innerText.split(/\s+/).length, i: document.querySelectorAll('#helpModal button.info').length, links: [...document.querySelectorAll('#helpModal a')].map((a) => a.getAttribute('href')), mentionsI: /«i»/.test(document.getElementById('helpModal').innerText) }));
    note(`guida rapida: sezioni ${hq.h3.join(', ')}; ${hq.words} parole; bottoni «i» ${hq.i}; link ${hq.links.join(', ')}; parla dei «i» ${hq.mentionsI}`);
    await p.screenshot({ path: path.join(SH, 'guida-rapida-1440-scuro.png'), fullPage: false });
    await p.keyboard.press('Escape');
    // h) ridimensionando la finestra con un riquadro aperto
    await vb.scrollIntoViewIfNeeded(); await vb.click(); await p.waitForTimeout(150);
    await p.setViewportSize({ width: 900, height: 700 }); await p.waitForTimeout(500);
    const qr = await pop(p);
    ok(!qr || (qr.l >= 0 && qr.r <= qr.vw && qr.top >= 0 && qr.b <= qr.vh), `ridimensionando a 900×700 il riquadro resta nello schermo (${qr ? Math.round(qr.l) + '–' + Math.round(qr.r) + '/' + qr.vw : 'chiuso'})`);
    await p.setViewportSize({ width: 1440, height: 900 });
    ok(!errs.length, `computer: console senza errori ${errs.join(' | ').slice(0, 300)}`);
    await c.close();
  }
  // ---------- telefono ----------
  for (const w of [390, 360]) {
    const c = await ctx(b, w, 'light'); const p = await c.newPage(); const errs = watch(p);
    await p.goto(NEW + '#XLK'); await p.waitForSelector('#memTable tbody tr', { timeout: 40000 }); await p.waitForTimeout(600);
    for (const id of ['secEpiBox', 'secCap']) {
      for (const start of [false, true]) {
        await p.evaluate(([id, s]) => { document.getElementById(id).open = s; }, [id, start]);
        const btn = p.locator(`#${id} > summary button.info`); await btn.scrollIntoViewIfNeeded(); await btn.tap(); await p.waitForTimeout(200);
        const a = await p.evaluate((id) => document.getElementById(id).open, id); const q = await pop(p);
        const [nx, ny] = await neutral(p); await p.touchscreen.tap(nx, ny); await p.waitForTimeout(200);
        ok(a === start && !!q, `${w} ${id} (${start ? 'aperto' : 'chiuso'}): il tocco sul «i» apre il riquadro e non tocca il <summary>`);
      }
      // tocco vicino al «i» (12 px a sinistra, sul titolo): apre/chiude il <summary> e non il riquadro?
      await p.evaluate((id) => { document.getElementById(id).open = false; }, id);
      const bb = await p.locator(`#${id} > summary button.info`).boundingBox();
      await p.touchscreen.tap(bb.x - 14, bb.y + bb.height / 2); await p.waitForTimeout(200);
      note(`${w} ${id}: tocco 14 px a sinistra del «i» → riquadro «i» ${!!(await pop(p))}, piegato aperto ${await p.evaluate((id) => document.getElementById(id).open, id)}`);
      const [nx, ny] = await neutral(p); await p.touchscreen.tap(nx, ny); await p.waitForTimeout(150);
    }
    // scorrimento al telefono con un riquadro aperto
    const ib = p.locator('#secCap > summary button.info'); await ib.scrollIntoViewIfNeeded(); await ib.tap(); await p.waitForTimeout(200);
    const r0 = await pop(p); await p.evaluate(() => scrollBy(0, 200)); await p.waitForTimeout(300); const r1 = await pop(p);
    note(`${w}: scorrendo di 200 px con il riquadro aperto: prima top ${r0 && Math.round(r0.top)}, dopo ${r1 ? Math.round(r1.top) : 'chiuso'}`);
    await p.screenshot({ path: path.join(SH, `scroll-telefono-${w}.png`) });
    await p.touchscreen.tap(...(await neutral(p))); await p.waitForTimeout(150);
    // zoom al telefono (lente) e Esc non applicabile; cambio vista con il tocco su una scheda
    const i2 = p.locator('#secEpiBox > summary button.info'); await i2.scrollIntoViewIfNeeded(); await i2.tap(); await p.waitForTimeout(200);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200);
    const tab = p.locator('#tab-mon'); await tab.scrollIntoViewIfNeeded().catch(() => {}); await tab.tap(); await p.waitForTimeout(600);
    ok(!(await pop(p)), `${w}: toccando una scheda il riquadro si chiude`);
    ok(!errs.length, `${w}: console senza errori ${errs.join(' | ').slice(0, 300)}`);
    await c.close();
  }
  await b.close();
  lines.push(`${okn} ok, ${fail} falliti`); console.log(`${okn} ok, ${fail} falliti`);
  fs.writeFileSync(path.join(__dirname, 'interazioni.txt'), lines.join('\n') + '\n');
})();
