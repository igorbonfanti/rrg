// 1.5.0: vista 8 VIX (solo contesto) e barra a 9 schede. Deve fallire sulla 1.4.x (manca la scheda) e passare sulla 1.5.0.
// Uso: BASE=http://127.0.0.1:8791/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v150.cjs   (dalla cartella del sito servito)
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../..');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  // valori attesi dai moduli dell'app sui dati del sito (controlla il disegno, non il calcolo)
  const V = await import(path.join(SITE, 'js/vix.js'));
  let want = null;
  try {
    const d = JSON.parse(require('fs').readFileSync(path.join(SITE, 'data/vix.json')));
    const vix = V.vxSeries(d.series.VIX); want = {};
    for (const k of ['SPX', 'NDX']) { const R = V.regimes(V.align(V.vxSeries(d.series[k]), vix)); want[k] = Object.fromEntries(V.XS.map((X) => [X, `${R.thr[X].stats[252].posN}/${R.thr[X].stats[252].n}`])); }
  } catch { want = null; }
  const b = await chromium.launch();
  const ctxOf = async (opt, theme = 'dark') => { const c = await b.newContext(opt); await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme); return c; };
  // 1. barra delle schede: ordine e nessuno scorrimento orizzontale
  for (const w of [360, 390, 600, 601, 768, 820, 860, 861, 1024, 1100, 1280, 1440]) {
    const ctx = await ctxOf({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600 });
    const p = await ctx.newPage(); await p.goto(BASE + '#mon'); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.fnkeys button[data-view]')].map((x) => x.textContent.trim().toUpperCase()), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, rows: new Set([...document.querySelectorAll('.fnkeys button[data-view]')].map((x) => Math.round(x.getBoundingClientRect().top))).size }));
    ok(r.tabs.join('|') === '1 MONITOR|2 ROTAZIONE|3 BOTTOM MAP|4 SETTORE|5 TITOLI|6 INDICI|7 EMERGENTI|8 VIX|9 ALERT', `${w}: ordine delle schede`);
    ok(r.sw <= r.cw, `${w}: nessuno scorrimento orizzontale (${r.sw}/${r.cw})`);
    ok(r.rows <= (w <= 600 ? 3 : w <= 860 ? 2 : 1), `${w}: righe di schede ${r.rows}`);
    await ctx.close();
  }
  // 2. vista VIX su computer e telefono, chiaro e scuro
  for (const [name, opt, theme] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark'], ['360-chiaro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }, 'light']]) {
    const ctx = await ctxOf(opt, theme); const p = await ctx.newPage(); const errs = []; const req = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('request', (r) => req.push(r.url()));
    await p.goto(BASE + '#mon'); await p.waitForTimeout(1200);
    ok(!req.some((u) => /data\/vix\.json/.test(u)), `${name}: data/vix.json non scaricato prima di aprire la vista`);
    if (opt.hasTouch) await p.locator('#tab-vix').tap(); else await p.keyboard.press('8');
    await p.waitForSelector('#vxTable tbody tr', { timeout: 30000 }); await p.waitForTimeout(600);
    ok(await p.evaluate(() => location.hash) === '#vix', `${name}: indirizzo #vix`);
    ok(await p.locator('#vxKpis .kpi').count() >= 4, `${name}: almeno 4 riquadri`); // dalla 1.6.0 sono 6: li controlla v160.cjs
    const rows = await p.$$eval('#vxTable tbody tr', (t) => t.map((r) => [r.dataset.x || 'base', r.textContent]));
    ok(rows.length === 6 && rows[0][0] === 'base', `${name}: tabella con la base e 5 soglie`);
    ok(rows.filter((r) => /robusto/i.test(r[1])).map((r) => r[0]).join() === '40', `${name}: solo il 40 «robusto»`);
    if (want) ok(['20', '25', '30', '40', '50'].every((X) => rows.find((r) => r[0] === X)[1].includes(want.SPX[X])), `${name}: positivi a 12 mesi come i calcoli (S&P 500)`);
    const r30 = p.locator('#vxTable tr[data-x="30"]'); if (opt.hasTouch) await r30.tap(); else await r30.click(); await p.waitForTimeout(300);
    ok(/(sopra 30|a 30 o più)/i.test(await p.locator('#vxEpsTitle').innerText()), `${name}: clic sulla soglia 30 mostra i suoi episodi`);
    ok(await p.locator('#vxEps tbody tr').count() >= 15, `${name}: episodi della soglia 30`);
    const nb = p.locator('#vxIx button[data-ix="NDX"]'); if (opt.hasTouch) await nb.tap(); else await nb.click(); await p.waitForTimeout(500);
    ok(/Nasdaq-100/.test(await p.locator('#vxTableMeta').innerText()), `${name}: Nasdaq-100`);
    if (want) { const r2 = await p.$$eval('#vxTable tbody tr', (t) => t.map((r) => [r.dataset.x || 'base', r.textContent])); ok(['20', '25', '30', '40', '50'].every((X) => r2.find((r) => r[0] === X)[1].includes(want.NDX[X])), `${name}: positivi a 12 mesi come i calcoli (Nasdaq-100)`); }
    const pts = await p.locator('#vxScatter circle.vxpt').count(), starts = await p.locator('#vxScatter circle.vxpt.start').count();
    ok(pts > 500 && starts >= 15, `${name}: scatter con ${pts} sedute e ${starts} inizi di episodio`);
    ok(/Giorni contro episodi/.test(await p.locator('#vxScNote').innerText()), `${name}: didascalia giorni contro episodi`);
    ok(await p.locator('#vxChart path.vxvix').count() === 1 && await p.locator('#vxChart path.vxrv').count() === 1 && await p.locator('#vxChart path.vxprem').count() === 1, `${name}: grafico VIX, realizzata e premio`);
    // riquadro dei valori sul grafico
    const box = await p.locator('#vxChart').boundingBox(); await p.locator('#vxChart').scrollIntoViewIfNeeded();
    const bb = await p.locator('#vxChart').boundingBox();
    if (opt.hasTouch) await p.touchscreen.tap(bb.x + bb.width * 0.7, bb.y + 80); else await p.mouse.move(bb.x + bb.width * 0.7, bb.y + 80);
    await p.waitForTimeout(300);
    ok(!(await p.locator('#vxTip').isHidden()) && /VIX/.test(await p.locator('#vxTip').innerText()), `${name}: riquadro dei valori`);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale nella vista`);
    ok(/Massimo Rea/.test(await p.locator('#v-vix').innerText()), `${name}: idea citata`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await ctx.close();
  }
  // 3. tasti, comando e file mancante
  {
    const ctx = await ctxOf({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
    await p.goto(BASE + '#mon'); await p.waitForTimeout(1200);
    await p.keyboard.press('9'); await p.waitForTimeout(400);
    ok(!(await p.locator('#v-alr').isHidden()), 'tasto 9: Alert');
    await p.keyboard.press('/'); await p.keyboard.type('VIX'); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
    ok(!(await p.locator('#v-vix').isHidden()), 'comando VIX');
    await ctx.close();
    const c2 = await ctxOf({ viewport: { width: 1440, height: 900 } }); await c2.route('**/data/vix.json*', (r) => r.fulfill({ status: 404, body: '' }));
    const p2 = await c2.newPage(); const errs = []; p2.on('pageerror', (e) => errs.push(e.message));
    await p2.goto(BASE + '#vix'); await p2.waitForTimeout(2500);
    ok(/non disponibili/.test(await p2.locator('#vxMiss').innerText()) && !errs.length, 'file mancante: messaggio e nessun errore');
    await p2.keyboard.press('6'); await p2.waitForTimeout(1500);
    ok(!(await p2.locator('#v-idx').isHidden()), 'file mancante: le altre viste funzionano');
    await c2.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
