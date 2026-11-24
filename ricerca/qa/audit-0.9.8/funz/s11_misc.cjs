// Varie: localStorage corrotto, appunti consentiti, settore salvato non valido
const L = require('./lib.cjs');
const R = new L.Rec('s11_misc');
(async () => {
  const b = await L.launch();
  // localStorage corrotto
  {
    const ls = { 'sm.group': '"pippo"', 'sm.tail': '999', 'sm.formula': '"classica"', 'sm.timeframe': '{}', 'sm.cap': '{"thr":3,"win":"x"}', 'sm.ixShown': '"abc"', 'sm.ixSel': '42', 'sm.titPer': '"9M"', 'sm.titAx': '"zz"',
      'sm.ptf.1 · Asset class': '{"SWDA.MI":"x","FOO":50}', 'sm.blue': '[1,2]', 'sm.ixBlue': '"x"', 'sm.sector': '"FOO"', 'sm.range': '"7A"', 'sm.visit': '{"cur":5}', 'sm.cvd': '"yes"', 'sm.shortcuts': 'nonjson', 'sm.perfDays': '5' };
    const { ctx, page, log } = await L.open(b, 'desktop', { ls });
    const bad = [];
    for (const v of ['mon', 'rrg', 'btm', 'sec', 'alr', 'idx', 'tit']) {
      await L.goto(page, v, v === 'idx' || v === 'tit' ? 3500 : 1500);
      const t = await L.badText(page, '#v-' + v);
      const shown = await page.evaluate((v) => !document.getElementById('v-' + v).hidden && document.getElementById('v-' + v).innerText.length > 100, v);
      if (t.length || !shown) bad.push(`${v}: ${shown ? '' : 'vuota '}${t.join('|')}`);
    }
    await page.selectOption('#groupSel', '1 · Asset class').catch(() => {});
    await page.goto(L.BASE + '#rrg'); await page.waitForTimeout(1500);
    await page.selectOption('#groupSel', '1 · Asset class'); await page.waitForTimeout(800);
    const pt = await page.evaluate(() => ({ tot: (document.getElementById('ptfTot') || {}).textContent, bad: /NaN/.test(document.getElementById('ptfPanel').innerText) }));
    R.add('L1', 'localStorage', 'valori corrotti in localStorage: tutte le viste funzionano senza NaN né errori', !bad.length && !log.length && !pt.bad, `${bad.join(' || ')} · ptf ${JSON.stringify(pt)} · ${log.join(' | ')}`, await L.shot(page, 'l-corrupt-rrg', true));
    const sec = await page.evaluate(() => { location.hash = '#sec'; return new Promise((r) => setTimeout(() => r({ h: location.hash, t: document.getElementById('secTitle').textContent }), 800)); });
    R.add('L2', 'localStorage', 'settore salvato non valido: #sec apre un settore valido', /^#XL/.test(sec.h) && /^XL/.test(sec.t), JSON.stringify(sec));
    await ctx.close();
  }
  // localStorage non disponibile (getItem lancia)
  {
    const { ctx, page, log } = await L.open(b, 'desktop');
    await ctx.addInitScript(() => { const thrower = () => { throw new Error('SecurityError'); }; try { Object.defineProperty(window, 'localStorage', { get: thrower, configurable: true }); } catch {} });
    await L.goto(page, 'mon', 1500);
    const ok = await page.evaluate(() => document.querySelectorAll('#boardTable tbody tr').length);
    await page.click('#themeBtn'); await page.click('#tab-rrg'); await page.waitForTimeout(800); await page.click('#tab-idx'); await page.waitForTimeout(3000); await page.click('#tab-tit'); await page.waitForTimeout(3000);
    const errs = log.filter((l) => /pageerror|UNHANDLED/.test(l));
    R.add('L3', 'localStorage', 'localStorage bloccato (navigazione privata rigida): app funziona', ok > 10 && !errs.length, `righe=${ok} ${errs.join(' | ')}`, await L.shot(page, 'l-nols'));
    await ctx.close();
  }
  // appunti consentiti
  {
    const { ctx, page, log } = await L.open(b, 'desktop', { ctx: { permissions: ['clipboard-read', 'clipboard-write'] } });
    await L.goto(page, 'XLE', 1500);
    await page.click('#bluePlus'); await page.waitForTimeout(300);
    await page.click('#secChips button[data-sym="XLK"]'); await page.waitForTimeout(300);
    await page.click('#blueMinus'); await page.waitForTimeout(300);
    await page.click('.blue-box details.owner summary'); await page.click('#copyCfg'); await page.waitForTimeout(500);
    const msg = await page.textContent('#copyMsg');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    let j = null; try { j = JSON.parse(clip); } catch {}
    R.add('L4', 'livello blu', '«Copia configurazione» con appunti consentiti: JSON con i due livelli cambiati', /Copiata/.test(msg) && j && j.blue && j.blue.XLE === 2 && j.blue.XLK === 5, `${msg} · blue=${j && JSON.stringify(j.blue)}`);
    // cambiando livello il messaggio sparisce
    await page.click('#bluePlus'); await page.waitForTimeout(300);
    R.add('L5', 'livello blu', 'dopo un nuovo cambio il messaggio «Copiata» sparisce', (await page.textContent('#copyMsg')) === '');
    await ctx.close();
  }
  R.save();
  await b.close();
})();
