// Controllo indipendente di usabilità, versione 1.5.0: telefono (390, 360 con tocco), tablet (820, 768), larghezze di confine,
// file del VIX mancante, incompleto o lento. Uso: NODE_PATH=$(npm root -g) node u150-mobile.cjs [base]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.argv[2] || 'http://127.0.0.1:8798/';
const OUT = __dirname, SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const R = [];
const check = (id, ok, what, detail) => { R.push({ id, ok: !!ok, what, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${id} ${what}${detail != null ? ' · ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`); };

async function newPage(browser, { w, h, theme = 'dark', touch = false, mobile = false, route }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('__init')) { localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); sessionStorage.setItem('__init', '1'); } } catch {} }, theme);
  if (route) await ctx.route('**/data/vix.json', route);
  const page = await ctx.newPage();
  const errs = [], reqs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('request', (r) => reqs.push(r.url().replace(BASE, '')));
  return { ctx, page, errs, reqs };
}
const ready = (page) => page.waitForFunction(() => document.getElementById('loadingNote').hidden && document.querySelector('.fnkeys button[aria-selected="true"]'), null, { timeout: 30000 });
const vixReady = (page) => page.waitForFunction(() => !document.getElementById('vxBody').hidden || !document.getElementById('vxMiss').hidden, null, { timeout: 30000 });
const geo = (page) => page.evaluate(() => {
  const bs = [...document.querySelectorAll('.fnkeys button[data-view]')].filter((b) => !b.hidden);
  const tops = [...new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top)))].sort((a, b) => a - b);
  return {
    perRow: tops.map((t) => bs.filter((b) => Math.round(b.getBoundingClientRect().top) === t).length),
    clipped: bs.filter((b) => b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().right > innerWidth + 0.5).map((b) => b.textContent),
    hs: bs.map((b) => Math.round(b.getBoundingClientRect().height)), ws: bs.map((b) => Math.round(b.getBoundingClientRect().width)),
    lines: bs.map((b) => Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight || 14))),
    barH: Math.round(document.querySelector('.fnkeys').getBoundingClientRect().height),
    hscroll: document.scrollingElement.scrollWidth - innerWidth,
  };
});
const expectRows = (w) => (w > 860 ? [9] : w > 600 ? [5, 4] : [3, 3, 3]);

(async () => {
  const browser = await chromium.launch();
  // ---------- telefono ----------
  for (const [w, h] of [[390, 844], [360, 780]]) {
    for (const theme of ['dark', 'light']) {
      const tag = `m${w}-${theme}`;
      const { ctx, page, errs, reqs } = await newPage(browser, { w, h, theme, touch: true, mobile: true });
      await page.goto(BASE); await ready(page); await page.waitForTimeout(600);
      const g = await geo(page);
      check(`${tag}.bar`, JSON.stringify(g.perRow) === '[3,3,3]' && !g.clipped.length && g.hscroll <= 0, 'barra 3×3, nessuna scheda tagliata, nessuno scorrimento orizzontale', g);
      check(`${tag}.target`, Math.min(...g.hs) >= 44, 'schede alte almeno 44 px (bersaglio del tocco)', { min: Math.min(...g.hs), barH: g.barH });
      check(`${tag}.lazy`, !reqs.some((u) => u.includes('vix.json')), 'vix.json non scaricato all\'avvio');
      await page.screenshot({ path: path.join(SHOTS, `${tag}-mon.png`) });
      const t0 = Date.now();
      await page.tap('#tab-vix');
      await vixReady(page);
      const tv = Date.now() - t0;
      await page.waitForTimeout(400);
      const st = await page.evaluate(() => ({ hash: location.hash, body: !document.getElementById('vxBody').hidden, hs: document.scrollingElement.scrollWidth - innerWidth, kpis: [...document.querySelectorAll('#vxKpis .kpi')].map((k) => { const r = k.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), k.scrollWidth > k.clientWidth + 1]; }) }));
      check(`${tag}.tap8`, st.hash === '#vix' && st.body && st.hs <= 0, 'tocco su 8 VIX apre la vista, nessuno scorrimento orizzontale della pagina', { ...st, ms: tv });
      check(`${tag}.kpis`, st.kpis.length === 4 && st.kpis.every((k) => k[1] <= w && !k[2]), '4 riquadri dei valori dentro lo schermo, testo non tagliato', st.kpis);
      await page.screenshot({ path: path.join(SHOTS, `${tag}-vix-top.png`) });
      await page.screenshot({ path: path.join(SHOTS, `${tag}-vix-full.png`), fullPage: true });
      const tb = await page.evaluate(() => ({ cols: [...document.querySelectorAll('#vxTable thead th')].filter((t) => getComputedStyle(t).display !== 'none').map((t) => t.innerText.replace(/\n/g, ' ')), ov: [...document.querySelectorAll('#v-vix .tscroll')].map((t) => t.scrollWidth - t.clientWidth) }));
      check(`${tag}.tablecols`, tb.cols.length >= 4 && tb.ov[0] <= 0, 'tabella dei regimi: colonne ridotte, entra senza scorrere', tb);
      check(`${tag}.epsfit`, tb.ov[1] <= 0, 'tabella degli episodi: entra senza scorrere di lato', tb.ov);
      // tocco su una riga
      await page.tap('#vxTable tr[data-x="25"]');
      await page.waitForTimeout(200);
      const r25 = await page.evaluate(() => { const t = document.getElementById('vxEpsTitle').getBoundingClientRect(); return { sel: document.querySelector('#vxTable tr.sel')?.dataset.x, title: document.getElementById('vxEpsTitle').textContent, n: document.querySelectorAll('#vxEps tbody tr').length, nTab: +document.querySelector('#vxTable tr[data-x="25"] td:nth-child(2)').textContent, titleTop: Math.round(t.top), vh: innerHeight }; });
      check(`${tag}.rowtap`, r25.sel === '25' && /sopra 25/.test(r25.title) && r25.n === r25.nTab, 'tocco sulla riga 25: episodi della soglia 25', r25);
      check(`${tag}.epsvisible`, r25.titleTop < r25.vh, 'dopo il tocco il titolo degli episodi è visibile senza scorrere', r25);
      // pulsanti indice e periodo al tocco
      await page.tap('#vxIx button[data-ix="NDX"]');
      await page.waitForTimeout(200);
      const ndx = await page.evaluate(() => ({ p: document.querySelector('#vxIx [aria-pressed=true]')?.dataset.ix, t: document.getElementById('vxEpsTitle').textContent, bh: Math.round(document.querySelector('#vxIx button').getBoundingClientRect().height) }));
      check(`${tag}.ndx`, ndx.p === 'NDX' && /Nasdaq/.test(ndx.t), 'tocco su Nasdaq-100', ndx);
      check(`${tag}.segtarget`, ndx.bh >= 32, 'pulsanti S&P 500 / Nasdaq-100 abbastanza alti per il dito (≥ 32 px)', ndx.bh);
      await page.tap('#vxIx button[data-ix="SPX"]');
      // scatter: tocco su un punto
      await page.evaluate(() => document.getElementById('vxScWrap').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(200);
      const pt = await page.evaluate(() => { const c = [...document.querySelectorAll('#vxScatter circle.vxpt.start')]; const r = c[c.length - 1].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await page.touchscreen.tap(pt.x, pt.y);
      await page.waitForTimeout(250);
      const tip = await page.evaluate(() => { const t = document.getElementById('vxScTip'), r = t.getBoundingClientRect(); return { vis: !t.hidden, text: t.innerText.replace(/\n/g, ' | '), l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), vh: innerHeight }; });
      check(`${tag}.sctap`, tip.vis && /VIX/.test(tip.text) && tip.l >= 0 && tip.r <= w && tip.b <= tip.vh, 'scatter: tocco su un punto mostra il riquadro dei valori dentro lo schermo', tip);
      await page.screenshot({ path: path.join(SHOTS, `${tag}-scatter-tap.png`) });
      await page.touchscreen.tap(10, 10);
      await page.waitForTimeout(200);
      check(`${tag}.sctaphide`, await page.evaluate(() => document.getElementById('vxScTip').hidden), 'scatter: tocco fuori chiude il riquadro');
      // grafico: tocco
      await page.evaluate(() => document.getElementById('vxWrap').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(200);
      const cb = await page.evaluate(() => { const r = document.getElementById('vxChart').getBoundingClientRect(); return { x: r.x + r.width * 0.85, y: r.y + r.height * 0.35, w: r.width }; });
      await page.touchscreen.tap(cb.x, cb.y);
      await page.waitForTimeout(250);
      const ct = await page.evaluate(() => { const t = document.getElementById('vxTip'), r = t.getBoundingClientRect(); return { vis: !t.hidden, text: t.innerText.replace(/\n/g, ' | '), l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), vh: innerHeight }; });
      check(`${tag}.chtap`, ct.vis && /Premio/.test(ct.text) && ct.l >= 0 && ct.r <= w && ct.b <= ct.vh, 'grafico: tocco mostra il riquadro dei valori dentro lo schermo', ct);
      await page.screenshot({ path: path.join(SHOTS, `${tag}-chart-tap.png`) });
      const fonts = await page.evaluate(() => { const svg = document.getElementById('vxChart'), k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width; const ax = svg.querySelector('text.axt'); const sc = document.getElementById('vxScatter'), k2 = sc.getBoundingClientRect().width / sc.viewBox.baseVal.width; return { chart: +(parseFloat(getComputedStyle(ax).fontSize) * k).toFixed(1), scatter: +(parseFloat(getComputedStyle(sc.querySelector('text.axt')).fontSize) * k2).toFixed(1), titles: [...svg.querySelectorAll('text.pane-t')].map((t) => t.textContent), titleOverflow: [...svg.querySelectorAll('text.pane-t')].map((t) => Math.round(t.getBBox().x + t.getBBox().width - svg.viewBox.baseVal.width)) }; });
      check(`${tag}.fonts`, fonts.chart >= 9 && fonts.scatter >= 9 && fonts.titleOverflow.every((o) => o <= 0), 'testo degli assi di almeno 9 px sullo schermo, titoli dei pannelli dentro il grafico', fonts);
      const legend = await page.evaluate(() => { const l = document.getElementById('vxLegend'); return { ov: l.scrollWidth - l.clientWidth }; });
      check(`${tag}.legend`, legend.ov <= 0, 'legenda del grafico senza scorrimento', legend);
      // rotazione in orizzontale
      await page.setViewportSize({ width: h, height: w });
      await page.waitForTimeout(900);
      const land = await page.evaluate(() => ({ hs: document.scrollingElement.scrollWidth - innerWidth, chartW: Math.round(document.getElementById('vxChart').getBoundingClientRect().width), vb: document.getElementById('vxChart').viewBox.baseVal.width, rows: [...new Set([...document.querySelectorAll('.fnkeys button')].map((b) => Math.round(b.getBoundingClientRect().top)))].length }));
      check(`${tag}.landscape`, land.hs <= 0 && Math.abs(land.vb - land.chartW) < 3, 'telefono girato: niente scorrimento, grafico ridisegnato alla nuova larghezza', land);
      await page.screenshot({ path: path.join(SHOTS, `${tag}-landscape.png`) });
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(700);
      // altre viste al tocco
      for (const [i, v] of ['mon', 'rrg', 'btm', 'sec', 'tit', 'idx', 'emg', 'vix', 'alr'].entries()) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.tap('#tab-' + v);
        await page.waitForTimeout(['rrg', 'idx', 'tit', 'emg'].includes(v) ? 1500 : 500);
        const o = await page.evaluate((id) => ({ hs: document.scrollingElement.scrollWidth - innerWidth, vis: !document.getElementById('v-' + id).hidden, sel: document.querySelector('.fnkeys [aria-selected=true]').id }), v);
        check(`${tag}.view-${v}`, o.hs <= 0 && o.vis && o.sel === 'tab-' + v, `vista ${i + 1} ${v} al tocco: visibile, senza scorrimento orizzontale`, o);
        await page.screenshot({ path: path.join(SHOTS, `${tag}-view${i + 1}-${v}.png`) });
      }
      // guida rapida dalla vista VIX: link alla guida completa
      await page.tap('#tab-vix'); await page.waitForTimeout(300);
      check(`${tag}.console`, !errs.length, 'console senza errori né avvisi', errs);
      await ctx.close();
    }
  }
  // ---------- tablet e larghezze di confine ----------
  for (const [w, touch] of [[820, true], [768, true], [600, false], [601, false], [860, false], [861, false], [1024, false], [1100, false]]) {
    for (const theme of ['dark', 'light']) {
      const tag = `w${w}-${theme}`;
      const { ctx, page, errs } = await newPage(browser, { w, h: touch ? 1100 : 900, theme, touch, mobile: touch });
      await page.goto(BASE + '#vix'); await ready(page); await vixReady(page); await page.waitForTimeout(600);
      const g = await geo(page);
      check(`${tag}.bar`, JSON.stringify(g.perRow) === JSON.stringify(expectRows(w)) && !g.clipped.length && g.hscroll <= 0, `barra a ${w}px: righe ${JSON.stringify(expectRows(w))}, nessuna scheda tagliata, nessuno scorrimento`, g);
      check(`${tag}.even`, new Set(g.hs).size === 1, 'schede della stessa altezza (nessuna etichetta che va a capo da sola)', g.hs);
      const v = await page.evaluate(() => ({ body: !document.getElementById('vxBody').hidden, hs: document.scrollingElement.scrollWidth - innerWidth, ov: [...document.querySelectorAll('#v-vix .tscroll')].map((t) => t.scrollWidth - t.clientWidth) }));
      check(`${tag}.vix`, v.body && v.hs <= 0, 'apertura diretta su #vix, nessuno scorrimento orizzontale', v);
      if (theme === 'dark' || touch) await page.screenshot({ path: path.join(SHOTS, `${tag}-vix.png`) });
      if (touch) {
        await page.tap('#vxTable tr[data-x="50"]'); await page.waitForTimeout(200);
        check(`${tag}.rowtap`, (await page.evaluate(() => document.querySelector('#vxTable tr.sel')?.dataset.x)) === '50', 'tablet: tocco sulla riga 50');
      }
      for (const k of ['1', '9', '8']) { await page.keyboard.press(k); await page.waitForTimeout(400); }
      check(`${tag}.console`, !errs.length, 'console senza errori', errs);
      await ctx.close();
    }
  }
  // ---------- file del VIX mancante, incompleto, illeggibile, lento ----------
  const cases = [
    ['404', (r) => r.fulfill({ status: 404, body: '' }), /non disponibili.*HTTP 404/],
    ['rete', (r) => r.abort('failed'), /non disponibili.*non raggiungibile/],
    ['incompleto', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"asOf":{"vix":"2026-11-05"}}' }), /non disponibili.*incompleto/],
    ['illeggibile', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"series": ' }), /non disponibili.*illeggibile/],
    ['serie-vuote', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"asOf":{"vix":"2026-11-05","spx":"2026-11-05","ndx":"2026-11-05"},"series":{"VIX":null,"SPX":null,"NDX":null}}' }), /./],
  ];
  for (const [name, route, re] of cases) {
    for (const [w, touch] of [[1440, false], [390, true]]) {
      const tag = `miss-${name}-${w}`;
      const { ctx, page, errs } = await newPage(browser, { w, h: 900, touch, mobile: touch, route });
      await page.goto(BASE); await ready(page);
      await page.keyboard.press('8').catch(() => {});
      await vixReady(page).catch(() => {});
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => ({ miss: !document.getElementById('vxMiss').hidden, text: document.getElementById('vxMiss').textContent, body: !document.getElementById('vxBody').hidden, loading: !document.getElementById('vxLoading').hidden, vis: document.getElementById('v-vix').innerText.slice(0, 200) }));
      check(`${tag}.msg`, (m.miss && re.test(m.text) && !m.body && !m.loading) || (name === 'serie-vuote' && !/NaN|undefined/.test(m.vis)), `file ${name}: messaggio chiaro, niente numeri finti`, m);
      if (w === 1440 || name === '404') await page.screenshot({ path: path.join(SHOTS, `${tag}.png`) });
      const ok = [];
      for (const [i, v] of ['mon', 'rrg', 'btm', 'sec', 'tit', 'idx', 'emg', 'alr'].entries()) {
        await page.evaluate((id) => document.getElementById('tab-' + id).click(), v);
        await page.waitForTimeout(['rrg', 'idx', 'tit', 'emg'].includes(v) ? 1200 : 300);
        ok.push(await page.evaluate((id) => { const s = document.getElementById('v-' + id); return !s.hidden && s.innerText.length > 200 && !/Impossibile caricare/.test(s.innerText); }, v));
      }
      check(`${tag}.others`, ok.every(Boolean), `file ${name}: le altre 8 viste funzionano`, ok);
      // tornando alla vista VIX: il messaggio resta, nessun errore non gestito
      await page.evaluate(() => document.getElementById('tab-vix').click()); await page.waitForTimeout(300);
      const m2 = await page.evaluate(() => ({ miss: !document.getElementById('vxMiss').hidden, loading: !document.getElementById('vxLoading').hidden }));
      const pageErr = errs.filter((e) => e.startsWith('pageerror') || /Uncaught/.test(e));
      check(`${tag}.noerr`, !pageErr.length && !m2.loading, `file ${name}: nessun errore JavaScript non gestito, «Caricamento» non resta acceso`, { pageErr, m2, consoleAll: errs });
      await ctx.close();
    }
  }
  // lento: messaggio di caricamento visibile, poi i dati
  {
    const { ctx, page, errs } = await newPage(browser, { w: 1440, h: 900, route: async (r) => { await new Promise((res) => setTimeout(res, 2500)); r.continue(); } });
    await page.goto(BASE); await ready(page);
    await page.keyboard.press('8'); await page.waitForTimeout(500);
    const l = await page.evaluate(() => ({ loading: !document.getElementById('vxLoading').hidden, text: document.getElementById('vxLoading').textContent, body: !document.getElementById('vxBody').hidden }));
    await page.screenshot({ path: path.join(SHOTS, 'slow-loading-1440.png') });
    // durante il caricamento si cambia vista e si torna, e si preme Nasdaq-100
    await page.keyboard.press('9'); await page.waitForTimeout(200); await page.keyboard.press('8'); await page.waitForTimeout(100);
    await page.click('#vxIx button[data-ix="NDX"]').catch(() => {});
    await vixReady(page); await page.waitForTimeout(300);
    const l2 = await page.evaluate(() => ({ loading: !document.getElementById('vxLoading').hidden, body: !document.getElementById('vxBody').hidden, ix: document.querySelector('#vxIx [aria-pressed=true]')?.dataset.ix, meta: document.getElementById('vxTableMeta').textContent, nKpi: document.querySelectorAll('#vxKpis .kpi').length }));
    check('slow.loading', l.loading && !l.body, 'file lento: «Caricamento dei dati del VIX…» visibile', l);
    check('slow.after', !l2.loading && l2.body && l2.ix === 'NDX' && /Nasdaq/.test(l2.meta) && l2.nKpi === 4, 'file lento: Nasdaq-100 scelto durante il caricamento viene applicato, nessun doppio disegno', l2);
    check('slow.console', !errs.length, 'console senza errori', errs);
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'risultati-mobile.json'), JSON.stringify(R, null, 1));
  console.log(`\n${R.filter((r) => r.ok).length}/${R.length} passano`);
})().catch((e) => { console.error(e); process.exit(1); });
