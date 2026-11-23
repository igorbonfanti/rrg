// Controllo 1: ogni bottone «i» di ogni vista, a 1440 e 1280 (mouse e tastiera) e a 390 e 360 (tocco), tema scuro e chiaro.
// Uso: NODE_PATH=$(npm root -g) node bottoni.cjs [ONLY=1440]   Esito in bottoni.txt, immagini in shots/pop/.
const fs = require('fs'), path = require('path');
const { chromium, NEW, VIEWS, ctx, watch, go, pop, neutral } = require('./lib.cjs');
const SH = path.join(__dirname, 'shots', 'pop'); fs.mkdirSync(SH, { recursive: true });
const lines = []; let fail = 0, okn = 0;
const ok = (c, m) => { if (c) okn++; else { fail++; lines.push('FAIL ' + m); console.log('FAIL ' + m); } };
const note = (m) => { lines.push('INFO ' + m); };
(async () => {
  const guide = await (await fetch(NEW + 'guida.html')).text();
  const b = await chromium.launch();
  const widths = (process.env.ONLY || '1440,1280,390,360').split(',').map(Number);
  for (const w of widths) for (const theme of ['dark', 'light']) {
    const phone = w < 600, tag = `${w}-${theme === 'dark' ? 'scuro' : 'chiaro'}`;
    const c = await ctx(b, w, theme); const p = await c.newPage(); const errs = watch(p);
    await p.goto(NEW + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 });
    const runs = [];
    for (const v of VIEWS) {
      if (v[0] === 'rrg') { for (const u of ['Settori S&P 500', 'MAG7', '1 · Asset class', '2 · Fattori', '3 · Regioni', '4 · Paesi', '6 · Indici', '5 · Asset reali']) runs.push([...v, u]); }
      else runs.push(v);
      // seconda passata con i riquadri piegati aperti (Per confronto) e, nei Massimi, con il grafico di una riga
      if (['XLK', 'SOXX', 'idx', 'ath'].includes(v[0])) runs.push([...v, null, true]);
    }
    let total = 0;
    for (const [h, vid, wait, uni, extra] of runs) {
      await go(p, NEW, h, wait);
      if (extra) {
        if (h === 'ath') { await p.locator('#athTable tr.athr').first().click(); await p.waitForTimeout(800); }
        else await p.evaluate((vid) => document.querySelectorAll(`#${vid} details`).forEach((d) => { d.open = true; }), vid);
        await p.waitForTimeout(500);
      }
      if (uni) { await p.selectOption('#groupSel', uni); await p.waitForTimeout(700); }
      const scope = h === 'rrg' ? `#${vid} button.info, #filters button.info` : `#${vid} button.info`;
      const n = await p.locator(scope).count();
      const where = `${tag} #${h}${uni ? ' [' + uni + ']' : ''}${extra ? ' (aperto)' : ''}`;
      let vis = 0;
      for (let i = 0; i < n; i++) {
        const bt = p.locator(scope).nth(i);
        if (!(await bt.isVisible())) continue;
        vis++; total++;
        const label = await bt.getAttribute('aria-label'), g = await bt.getAttribute('data-guide');
        const id = `${where} «${label}»`;
        ok(label && /^Spiegazione: /.test(label), `${id}: aria-label`);
        ok((await bt.getAttribute('aria-expanded')) === 'false', `${id}: aria-expanded=false a riposo`);
        await bt.scrollIntoViewIfNeeded();
        if (!phone) {
          // passaggio del mouse
          const bb = await bt.boundingBox();
          await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(350);
          const qh = await pop(p);
          ok(qh && qh.t.length > 15 && (await bt.getAttribute('aria-expanded')) === 'true', `${id}: si apre al passaggio del mouse`);
          // dal bottone al riquadro: resta aperto
          if (qh) { await p.mouse.move((qh.l + qh.r) / 2, (qh.top + qh.b) / 2, { steps: 4 }); await p.waitForTimeout(400); ok(!!(await pop(p)), `${id}: resta aperto passando dal bottone al riquadro`); }
          const [nx, ny] = await neutral(p);
          await p.mouse.move(nx, ny, { steps: 3 }); await p.waitForTimeout(500);
          ok(!(await pop(p)) && (await bt.getAttribute('aria-expanded')) === 'false', `${id}: si chiude uscendo col mouse`);
          // clic
          await bt.click(); await p.waitForTimeout(200);
        } else {
          await bt.tap(); await p.waitForTimeout(250);
        }
        const q = await pop(p);
        ok(q && q.t.length > 15, `${id}: si apre al ${phone ? 'tocco' : 'clic'}`);
        const nexp = await p.evaluate(() => document.querySelectorAll('button.info[aria-expanded="true"]').length);
        ok(nexp === 1 && (await bt.getAttribute('aria-expanded')) === 'true', `${id}: aria-expanded=true e uno solo aperto (${nexp})`);
        if (q) {
          ok(q.l >= 0 && q.r <= q.vw + 0.5 && q.top >= 0 && q.b <= q.vh + 0.5, `${id}: dentro lo schermo (x ${Math.round(q.l)}–${Math.round(q.r)}/${q.vw}, y ${Math.round(q.top)}–${Math.round(q.b)}/${q.vh})`);
          // il riquadro copre il bottone? (succede solo se non c'è posto né sopra né sotto)
          const br = await bt.boundingBox();
          const covers = br.x < q.r && br.x + br.width > q.l && br.y < q.b && br.y + br.height > q.top;
          if (covers) note(`${id}: il riquadro copre il bottone (alto ${Math.round(q.h)} px su ${q.vh})`);
          if (g) {
            ok(q.link.endsWith('guida.html#' + g), `${id}: link «Nella guida» a #${g} (${q.link.split('/').pop()})`);
            ok(guide.includes(`id="${g}"`), `${id}: ancora #${g} esiste in guida.html`);
          } else note(`${id}: senza link alla guida`);
          if (q.sh > q.ch + 2) {
            const before = await p.evaluate(() => document.getElementById('infopop').scrollTop);
            if (!phone) { await p.mouse.move((q.l + q.r) / 2, (q.top + q.b) / 2); await p.mouse.wheel(0, 120); await p.waitForTimeout(250); }
            else await p.evaluate(() => { document.getElementById('infopop').scrollTop = 120; });
            const after = await p.evaluate(() => document.getElementById('infopop').scrollTop);
            ok(after > before && !!(await pop(p)), `${id}: riquadro lungo (${q.sh}/${q.ch} px) scorre e resta aperto`);
            note(`${id}: riquadro lungo ${q.sh} px, visibile ${q.ch}`);
          }
          if (theme && (w === 1440 || w === 390)) {
            await p.evaluate(() => { const x = document.getElementById('infopop'); x.scrollTop = 0; });
            const r = await p.evaluate(() => document.getElementById('infopop').getBoundingClientRect().toJSON());
            const bb2 = await bt.boundingBox();
            const x0 = Math.max(0, Math.min(r.left, bb2.x) - 10), y0 = Math.max(0, Math.min(r.top, bb2.y) - 10);
            const x1 = Math.min(q.vw, Math.max(r.right, bb2.x + bb2.width) + 10), y1 = Math.min(q.vh, Math.max(r.bottom, bb2.y + bb2.height) + 10);
            const fn = `${tag}_${h}${uni ? '_' + uni.replace(/[^A-Za-z0-9]+/g, '') : ''}${extra ? '_aperto' : ''}_${i}.png`;
            await p.screenshot({ path: path.join(SH, fn), clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
          }
        }
        // fuori: clic o tocco su un punto neutro
        const [nx, ny] = await neutral(p);
        if (phone) await p.touchscreen.tap(nx, ny); else await p.mouse.click(nx, ny);
        await p.waitForTimeout(200);
        ok(!(await pop(p)) && (await bt.getAttribute('aria-expanded')) === 'false', `${id}: si chiude ${phone ? 'toccando' : 'cliccando'} fuori (${Math.round(nx)},${Math.round(ny)})`);
        // tastiera (solo computer): Tab dal precedente, Invio, Esc (focus torna), Spazio, Esc
        if (!phone) {
          const prevOk = await bt.evaluate((el) => {
            const all = [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter((x) => x.tabIndex >= 0 && !x.disabled && x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden');
            const k = all.indexOf(el); if (k < 1) return false; all[k - 1].focus(); return document.activeElement === all[k - 1];
          });
          await p.keyboard.press('Tab');
          ok(prevOk && (await bt.evaluate((el) => document.activeElement === el)), `${id}: si raggiunge con Tab`);
          await bt.focus();
          await p.keyboard.press('Enter'); await p.waitForTimeout(150);
          ok(!!(await pop(p)) && (await bt.getAttribute('aria-expanded')) === 'true', `${id}: Invio apre`);
          await p.keyboard.press('Escape'); await p.waitForTimeout(120);
          ok(!(await pop(p)) && (await bt.evaluate((el) => document.activeElement === el)), `${id}: Esc chiude e il focus torna sul bottone`);
          await p.keyboard.press(' '); await p.waitForTimeout(150);
          ok(!!(await pop(p)), `${id}: Spazio apre`);
          const sc = await p.evaluate(() => scrollY);
          await p.keyboard.press('Escape'); await p.waitForTimeout(120);
          ok(!(await pop(p)), `${id}: Esc chiude dopo Spazio`);
          await p.evaluate(() => document.activeElement && document.activeElement.blur());
        }
      }
      if (h !== 'alr') ok(vis >= 1, `${where}: almeno un bottone «i» visibile (${vis} di ${n})`);
      note(`${where}: ${vis} bottoni visibili su ${n}`);
    }
    note(`${tag}: ${total} aperture provate`);
    // uno solo alla volta: aprirne un altro chiude il primo (Monitor, due bottoni)
    await go(p, NEW, 'mon', '#boardTable tbody tr');
    const two = p.locator('#v-mon button.info');
    if (phone) { await two.nth(0).tap(); await p.waitForTimeout(200); await two.nth(1).tap(); } else { await two.nth(0).click(); await p.waitForTimeout(200); await two.nth(1).click(); }
    await p.waitForTimeout(200);
    const st = await p.evaluate(() => [...document.querySelectorAll('#v-mon button.info')].map((x) => x.getAttribute('aria-expanded')));
    const q2 = await pop(p);
    ok(st[0] === 'false' && st[1] === 'true' && q2 && /tocchi/.test(q2.t), `${tag}: aprirne un altro chiude il primo (${st})`);
    // stesso bottone di nuovo: si chiude
    // il riquadro può coprire il suo bottone (riquadro più alto dello spazio libero): allora il secondo tocco non lo raggiunge
    const covered = await two.nth(1).evaluate((el) => { const r = el.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(e && e.closest('button.info') === el); });
    ok(!covered, `${tag}: il bottone «regole degli stati» resta toccabile con il suo riquadro aperto`);
    if (!covered) { if (phone) await two.nth(1).tap(); else await two.nth(1).click(); await p.waitForTimeout(200); ok(!(await pop(p)), `${tag}: secondo ${phone ? 'tocco' : 'clic'} sullo stesso bottone chiude`); }
    ok(!errs.length, `${tag}: console senza errori ${errs.join(' | ').slice(0, 300)}`);
    await c.close();
  }
  await b.close();
  lines.push(`${okn} ok, ${fail} falliti`); console.log(`${okn} ok, ${fail} falliti`);
  fs.writeFileSync(path.join(__dirname, process.env.OUT || 'bottoni.txt'), lines.join('\n') + '\n');
})();
