// Guida rapida (dialog) e guida.html
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const R = new L.Rec('s7_help_' + prof + '_' + (process.argv[3] || 'dark'));
(async () => {
  const b = await L.launch();
  const tag = prof;
  for (const theme of ['dark', 'light']) {
    const { ctx, page, log } = await L.open(b, prof, { theme });
    const ev = (f, a) => page.evaluate(f, a);
    await L.goto(page, 'mon', 1000);
    // apertura dal pulsante, focus, Esc, ritorno del focus
    await page.click('#helpBtn'); await page.waitForTimeout(300);
    const h0 = await ev(() => ({ open: document.getElementById('helpModal').open, f: document.activeElement.id, inert: document.getElementById('term').matches(':modal') }));
    const sp = await L.shot(page, `h-${tag}-${theme}-modal`);
    // Tab resta dentro la modale
    const tabbed = [];
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); tabbed.push(await ev(() => (document.activeElement.closest('#helpModal') ? 'in' : 'OUT:' + document.activeElement.tagName + '#' + document.activeElement.id))); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const h1 = await ev(() => ({ open: document.getElementById('helpModal').open, f: document.activeElement.id }));
    R.add('H1', 'guida rapida', `${tag}/${theme} pulsante apre, focus su ×, Tab resta dentro, Esc chiude e torna al pulsante`, h0.open && h0.f === 'helpClose' && tabbed.every((t) => t === 'in') && !h1.open && h1.f === 'helpBtn', JSON.stringify({ h0, tabbed, h1 }), sp);
    // chiusura con × e clic fuori
    await page.click('#helpBtn'); await page.waitForTimeout(200); await page.click('#helpClose'); await page.waitForTimeout(200);
    const h2 = await ev(() => document.getElementById('helpModal').open);
    await page.click('#helpBtn'); await page.waitForTimeout(200);
    const vp = page.viewportSize();
    await page.mouse.click(4, vp.height - 4); await page.waitForTimeout(300);
    const h3 = await ev(() => document.getElementById('helpModal').open);
    if (h3) { await page.keyboard.press('Escape'); }
    R.add('H2', 'guida rapida', `${tag}/${theme} chiusura con × e con clic sullo sfondo`, !h2 && !h3, `dopo ×: ${h2}, dopo clic fuori: ${h3}`);
    // overflow interno della modale sul telefono
    await page.click('#helpBtn'); await page.waitForTimeout(200);
    const mo = await ev(() => { const d = document.getElementById('helpModal'); const r = d.getBoundingClientRect(); return { w: r.width, right: r.right, iw: innerWidth, sw: d.scrollWidth, cw: d.clientWidth, h: r.height, ih: innerHeight }; });
    R.add('H3', 'guida rapida', `${tag}/${theme} la modale sta nello schermo`, mo.right <= mo.iw + 1 && mo.sw <= mo.cw + 1 && mo.h <= mo.ih, JSON.stringify(mo));
    await page.keyboard.press('Escape');
    // link alla guida completa per ogni vista
    for (const v of ['mon', 'rrg', 'btm', 'sec', 'alr', 'idx', 'tit']) {
      await page.click('#tab-' + v); await page.waitForTimeout(v === 'idx' || v === 'tit' ? 2000 : 500);
      await page.click('#helpBtn'); await page.waitForTimeout(200);
      const href = await ev(() => document.getElementById('guideLink').getAttribute('href'));
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      R.add('H4', 'guida rapida', `${tag}/${theme} link «Guida completa» dalla vista ${v}`, href === 'guida.html#' + v, href);
    }
    // il link apre una nuova scheda alla sezione
    await page.click('#tab-btm'); await page.waitForTimeout(400);
    await page.click('#helpBtn'); await page.waitForTimeout(200);
    const [gp] = await Promise.all([ctx.waitForEvent('page'), page.click('#guideLink')]);
    await gp.waitForLoadState('load'); await gp.waitForTimeout(800);
    const g0 = await gp.evaluate(() => { const t = document.querySelector(location.hash); const r = t ? t.getBoundingClientRect() : null; return { hash: location.hash, top: r ? Math.round(r.top) : null, ih: innerHeight, sy: scrollY, toc: document.getElementById('tocBox').open, theme: document.documentElement.getAttribute('data-theme') }; });
    const gsp = L.SHOTS + `g-${tag}-${theme}-btm.png`; await gp.screenshot({ path: gsp });
    R.add('H5', 'guida', `${tag}/${theme} «Guida completa» dalla Bottom Map apre guida.html#btm alla sezione`, g0.hash === '#btm' && g0.top != null && g0.top >= -2 && g0.top < g0.ih / 2 && g0.theme === theme, JSON.stringify(g0), 'shots/' + `g-${tag}-${theme}-btm.png`);
    await gp.close();
    await page.keyboard.press('Escape');
    // guida.html: ancore, link «Apri…», overflow, versione
    const g = await ctx.newPage();
    const glog = [];
    g.on('console', (m) => { if (m.type() === 'error') glog.push(m.text()); }); g.on('pageerror', (e) => glog.push(e.message));
    await g.goto(L.BASE + 'guida.html'); await g.waitForTimeout(800);
    const an = await g.evaluate(() => {
      const hrefs = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'));
      const missing = hrefs.filter((h) => h.length > 1 && !document.getElementById(h.slice(1)));
      const app = [...document.querySelectorAll('a[href^="./"], a[href^="index.html"]')].map((a) => [a.textContent.trim(), a.getAttribute('href')]);
      return { n: hrefs.length, missing, app, ver: document.getElementById('gVer').textContent, ov: document.scrollingElement.scrollWidth - innerWidth };
    });
    R.add('G1', 'guida', `${tag}/${theme} tutte le ancore interne esistono`, !an.missing.length && an.n > 20, `ancore=${an.n} mancanti=${an.missing.join(',')}`);
    R.add('G2', 'guida', `${tag}/${theme} versione e niente scroll orizzontale`, an.ver.includes(L.VERSION) && an.ov <= 0, `${an.ver} ov=${an.ov}`, (await g.screenshot({ path: L.SHOTS + `g-${tag}-${theme}-top.png` }), `shots/g-${tag}-${theme}-top.png`));
    // clic su ogni voce dell'indice
    const toc = await g.evaluate(() => [...document.querySelectorAll('.g-toc a')].map((a) => a.getAttribute('href')));
    let tocBad = [];
    for (const h of toc) {
      if (await g.evaluate(() => !document.getElementById('tocBox').open)) await g.click('#tocBox summary');
      await g.click(`.g-toc a[href="${h}"]`); await g.waitForTimeout(250);
      const top = await g.evaluate((h) => Math.round(document.getElementById(h.slice(1)).getBoundingClientRect().top), h);
      const hh = await g.evaluate(() => innerHeight);
      if (top < -5 || top > hh * 0.5) tocBad.push(`${h}:${top}`);
    }
    R.add('G3', 'guida', `${tag}/${theme} voci dell'indice portano alla sezione (${toc.length})`, !tocBad.length && toc.length > 20, tocBad.join(' '));
    // link «Apri …» verso l'app
    for (const [t, h] of an.app) {
      await g.goto(L.BASE + 'guida.html'); await g.waitForTimeout(300);
      await g.evaluate((h) => { const a = [...document.querySelectorAll('a')].find((x) => x.getAttribute('href') === h); a.scrollIntoView(); }, h);
      if (await g.evaluate(() => !document.getElementById('tocBox').open)) {}
      await Promise.all([g.waitForNavigation({ timeout: 8000 }).catch(() => {}), g.click(`a[href="${h}"] >> nth=0`)]);
      await g.waitForTimeout(h.includes('idx') || h.includes('tit') ? 3000 : 1500);
      const s = await g.evaluate(() => { const v = [...document.querySelectorAll('section.view')].find((x) => !x.hidden); return { v: v ? v.id : null, hash: location.hash, sec: document.getElementById('secTitle') ? document.getElementById('secTitle').textContent : '' }; });
      const want = h.replace('./#', '');
      const ok = /^XL/.test(want) ? s.v === 'v-sec' && s.sec.startsWith(want) : s.v === 'v-' + want;
      R.add('G4', 'guida', `${tag}/${theme} link «${t}» (${h})`, ok, JSON.stringify(s));
    }
    // sul telefono: indice chiuso senza hash, e con hash?
    if (prof === 'phone') {
      await g.goto(L.BASE + 'guida.html'); await g.waitForTimeout(400);
      const t1 = await g.evaluate(() => document.getElementById('tocBox').open);
      await g.goto(L.BASE + 'guida.html#tit'); await g.waitForTimeout(800);
      const t2 = await g.evaluate(() => { const r = document.getElementById('tit').getBoundingClientRect(); const tb = document.getElementById('tocBox').getBoundingClientRect(); const st = getComputedStyle(document.getElementById('tocBox')).position; return { open: document.getElementById('tocBox').open, top: Math.round(r.top), tocBottom: Math.round(tb.bottom), tocH: Math.round(tb.height), pos: st }; });
      await g.screenshot({ path: L.SHOTS + `g-phone-${theme}-hash-tit.png` });
      R.add('G5', 'guida', `phone/${theme} indice: chiuso senza hash; con #tit la sezione è visibile e non coperta`, !t1 && t2.top >= 0 && !(t2.pos === 'sticky' && t2.open && t2.tocBottom > t2.top), JSON.stringify({ t1, t2 }), `shots/g-phone-${theme}-hash-tit.png`);
    }
    R.add('Z', 'console', `${tag}/${theme} nessun errore (app + guida)`, !log.length && !glog.length, [...log, ...glog].join(' | '));
    await ctx.close();
  }
  R.save();
  await b.close();
})();
