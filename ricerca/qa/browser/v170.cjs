// 1.7.0: vista 8 VIX, mini-grafico dell'andamento del VIX nella tabella degli episodi, ultimo giorno e sedute, pannello
// dell'indice scelto con le fasce degli episodi. Deve fallire sulla 1.6.2.
// Uso: BASE=http://127.0.0.1:8791/ SITE=<cartella del sito> NODE_PATH=$(npm root -g) node ricerca/qa/browser/v170.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../..');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const it = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
(async () => {
  const V = await import(path.join(SITE, 'js/vix.js'));
  const D = await (await fetch(BASE + 'data/vix.json')).json();
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light'], ['1024-chiaro', { viewport: { width: 1024, height: 800 } }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark']]) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxEps tbody tr', { timeout: 30000 }); await p.waitForTimeout(400);
    const tap = async (l) => (opt.hasTouch ? l.tap() : l.click());
    for (const ix of ['SPX', 'NDX']) {
      await tap(p.locator(`#vxIx button[data-ix="${ix}"]`)); await p.waitForTimeout(300);
      const A = V.align(V.vxSeries(D.series[ix]), V.vxSeries(D.series.VIX));
      for (const X of [20, 40]) {
        await tap(p.locator(`#vxTable tr[data-x="${X}"]`)); await p.waitForTimeout(300);
        const eps = V.episodes(A, X).slice().reverse();
        const rows = await p.$$eval('#vxEps tbody tr', (rs) => rs.map((r) => ({ cells: [...r.children].map((td) => td.textContent.trim()), title: (r.querySelector('svg.vxsp title') || {}).textContent || '' })));
        ok(rows.length === eps.length && rows.every((r) => r.title), `${name} ${ix} ${X}: un mini-grafico per episodio (${rows.length})`);
        const bad = eps.filter((e, k) => { const r = rows[k]; return !r || !r.title.includes(`primo giorno a ${X} o più il ${it(e.date)}`) || !r.title.includes(`il ${it(e.maxDate)}`) || !(r.title.includes(`ultimo giorno a ${X} o più il ${it(e.end)}`) || r.title.includes(`ultimo giorno a ${X} o più finora il ${it(e.end)}`)); });
        ok(!bad.length, `${name} ${ix} ${X}: date del mini-grafico giuste (${bad.length} sbagliate)`);
        if (!opt.hasTouch) {
          const bad2 = eps.filter((e, k) => { const cs = rows[k].cells; return !cs.some((x) => x.replace(' provv.', '').replace('*', '') === it(e.end)) || !cs.includes(String(e.sessions)); });
          ok(!bad2.length, `${name} ${ix} ${X}: colonne «Ultimo giorno» e «Sedute» giuste (${bad2.length} sbagliate)`);
        }
        // pannello dell'indice: titolo con l'indice e la soglia, una fascia per episodio visibile a MAX
        await tap(p.locator('#vxRange button[data-range="MAX"]')); await p.waitForTimeout(300);
        const t = await p.$$eval('#vxChart text.pane-t', (x) => x.map((y) => y.textContent));
        ok(t.some((s) => s.startsWith(ix === 'SPX' ? 'S&P 500' : 'NASDAQ-100') && s.includes(`${X} O PIÙ`)), `${name} ${ix} ${X}: pannello dell'indice nel grafico (${t[1]})`);
        ok(await p.locator('#vxChart path.vxix').count() === 1 && await p.locator('#vxChart rect.vxepb').count() === eps.length, `${name} ${ix} ${X}: ${await p.locator('#vxChart rect.vxepb').count()} fasce degli episodi (attese ${eps.length})`);
        await tap(p.locator('#vxRange button[data-range="10A"]')); await p.waitForTimeout(200);
      }
    }
    // la tabella degli episodi sta nel suo riquadro (nessuna colonna tagliata) sopra 1000 px
    if (!opt.hasTouch) { const tw = await p.$eval('#vxEps', (t) => [t.scrollWidth, t.parentElement.clientWidth]); ok(tw[0] <= tw[1] + 1, `${name}: tabella degli episodi intera (${tw[0]}/${tw[1]})`); }
    // telefono: massimo, fine e sedute nella colonna della crisi
    if (opt.hasTouch) ok(await p.$$eval('#vxEps .vxmob', (x) => x.length > 0 && x.every((y) => getComputedStyle(y).display !== 'none' && /sedut[ae]/.test(y.textContent))), `${name}: massimo, fine e sedute visibili sul telefono`);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale della pagina`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
