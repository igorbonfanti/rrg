// Controllo indipendente di usabilità e funzioni della 1.6.0 (vista 8 VIX: struttura a termine e credito).
// Uso: BASE=http://127.0.0.1:8795/ SITE=/home/user/rrg NODE_PATH=$(npm root -g) node ricerca/qa/1.6.0/usabilita/percorsi.cjs
// Salva gli screenshot in shots/ accanto allo script e scrive i fatti osservati (OK/FAIL/INFO) sullo standard output.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8795/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../../..');
const SH = path.join(__dirname, 'shots');
fs.mkdirSync(SH, { recursive: true });
let fail = 0, checks = 0;
const ok = (c, m) => { checks++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const info = (m) => console.log(`INFO ${m}`);

(async () => {
  const { decodeDates, deltaDecode } = await import(path.join(SITE, 'js/indexdata.js'));
  const { pack } = await import(path.join(SITE, 'scripts/fetch_emerging.js'));
  const raw = fs.readFileSync(path.join(SITE, 'data/vix.json'), 'utf8');
  // (a) file della 1.5.0: senza VIX3M e HYGIEF
  const old = JSON.parse(raw); delete old.series.VIX3M; delete old.series.HYGIEF; for (const k of ['vix3m', 'fred3m', 'credit']) delete old.asOf[k];
  // (b) senza l'ultima data del VIX3M
  const miss = JSON.parse(raw);
  { const s = miss.series.VIX3M, d = decodeDates(s.d0, s.gaps), v = deltaDecode(s.cd, s.ps); miss.series.VIX3M = { ...pack(d.slice(0, -1), v.slice(0, -1), s.ps), last: d.at(-2), fred: s.fred < d.at(-2) ? s.fred : d.at(-2) }; miss.asOf.vix3m = d.at(-2); }
  // (d) credito fermo da 5 sedute (Yahoo non ha risposto per una settimana)
  const stale = JSON.parse(raw);
  { const s = stale.series.HYGIEF, d = decodeDates(s.d0, s.gaps), v = deltaDecode(s.cd, s.ps); stale.series.HYGIEF = { ...s, ...pack(d.slice(0, -5), v.slice(0, -5), s.ps) }; stale.asOf.credit = d.at(-6); }
  // (e) solo il VIX3M, niente credito
  const noCr = JSON.parse(raw); delete noCr.series.HYGIEF; delete noCr.asOf.credit;

  const b = await chromium.launch();
  const ctxOf = async (opt, theme = 'dark', body = null, status = 200) => {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    if (body || status !== 200) await c.route('**/data/vix.json*', (r) => r.fulfill({ status, contentType: 'application/json', body: body ? JSON.stringify(body) : '' }));
    return c;
  };
  const watch = (p) => { const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push('console ' + m.text())); p.on('requestfailed', (r) => errs.push('reqfail ' + r.url())); return errs; };
  const kpis = (p) => p.$$eval('#vxKpis .kpi', (k) => k.map((x) => { const r = x.getBoundingClientRect(); return { k: x.querySelector('.k').innerText, v: x.querySelector('.v').innerText.replace(/\n/g, ' '), s: x.querySelector('.s').innerText, t: x.getAttribute('title'), top: Math.round(r.top + scrollY), left: Math.round(r.left), h: Math.round(r.height) }; }));
  const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

  // ---------- 1. computer: percorso «paura solo in borsa o anche nel credito? backwardation?» ----------
  for (const [name, w, theme] of [['1440-scuro', 1440, 'dark'], ['1280-chiaro', 1280, 'light']]) {
    const ctx = await ctxOf({ viewport: { width: w, height: 900 } }, theme); const p = await ctx.newPage(); const errs = watch(p);
    await p.goto(BASE + '#mon'); await p.waitForSelector('.fnkeys button[data-view]'); await p.waitForTimeout(1500);
    const t0 = Date.now(); await p.keyboard.press('8');
    await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }); const tK = Date.now() - t0;
    await p.waitForSelector('#vxChart path.vxcr', { timeout: 30000 }); const tC = Date.now() - t0;
    info(`${name}: tasto 8 → riquadri in ${tK} ms, grafico completo in ${tC} ms`);
    ok(tC < 3000, `${name}: vista VIX pronta in meno di 3 s in locale (${tC} ms)`);
    ok(await p.evaluate(() => location.hash) === '#vix', `${name}: indirizzo #vix dopo il tasto 8`);
    const K = await kpis(p);
    for (const k of K) info(`${name}: riquadro «${k.k}» = «${k.v}» | «${k.s}»`);
    const kr = K.find((x) => /VIX \/ VIX3M/.test(x.k)), kc = K.find((x) => /Credito/i.test(x.k));
    ok(kr && kc && kr.top + kr.h < 900 && kc.top + kc.h < 900, `${name}: i due riquadri nuovi si vedono senza scorrere (fondo a ${kr && kr.top + kr.h}/${kc && kc.top + kc.h} px su 900)`);
    ok(kr && /backwardation|contango/.test(kr.t) && /percentile/i.test(kr.t), `${name}: title del VIX/VIX3M spiega backwardation, contango e percentile`);
    ok(kc && /HYG/.test(kc.t) && /IEF/.test(kc.t) && /percentile/i.test(kc.t), `${name}: title del credito spiega HYG, IEF e percentile`);
    ok(K.every((k) => k.t && k.t.length > 20), `${name}: ogni riquadro ha un title (${K.filter((k) => k.t).length}/${K.length})`);
    // «provvisorio» spiegato?
    const provK = K.filter((k) => /provvisorio/.test(k.s));
    // minore: «provvisorio» non è spiegato nel title (lo spiegano la riga sotto i riquadri, in breve, e le fonti in fondo)
    if (provK.length) info(`${name}: «provvisorio» spiegato nel title dei riquadri che lo mostrano: ${provK.map((k) => `${k.k} ${/provvisori/.test(k.t) ? 'sì' : 'no'}`).join(', ')}`);
    // indicazione visiva che c'è una spiegazione al passaggio del mouse (cursore help o sottolineatura)
    const cue = await p.$eval('#vxKpis .kpi', (e) => { const s = getComputedStyle(e); return s.cursor + '|' + getComputedStyle(e.querySelector('.k')).textDecorationLine; });
    info(`${name}: indicatore di spiegazione sul riquadro: cursor|decoration = ${cue}`);
    await p.screenshot({ path: path.join(SH, `${name}-01-apertura.png`) });
    // passaggio del mouse sul riquadro: il title c'è (il tooltip nativo non compare negli screenshot)
    // ---------- comandi: barra, Indietro ----------
    await p.keyboard.press('1'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => location.hash) === '#mon', `${name}: tasto 1 → #mon`);
    await p.goBack(); await p.waitForTimeout(800);
    ok(await p.evaluate(() => location.hash) === '#vix' && !(await p.locator('#v-vix').isHidden()), `${name}: Indietro torna alla vista VIX`);
    ok(await p.locator('#vxKpis .kpi').count() === 6, `${name}: dopo Indietro i 6 riquadri ci sono ancora`);
    await p.goBack(); await p.waitForTimeout(800);
    ok(await p.evaluate(() => location.hash) === '#mon' && !(await p.locator('#v-mon').isHidden()), `${name}: secondo Indietro torna al Monitor`);
    await p.goForward(); await p.waitForTimeout(800);
    ok(!(await p.locator('#v-vix').isHidden()), `${name}: Avanti torna al VIX`);
    await p.keyboard.press('2'); await p.waitForTimeout(300);
    await p.keyboard.press('/'); await p.waitForTimeout(150); await p.keyboard.type('vix'); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
    ok(!(await p.locator('#v-vix').isHidden()) && await p.evaluate(() => location.hash) === '#vix', `${name}: comando «vix» (minuscolo) nella barra apre la vista`);
    // ---------- cambio indice: il grafico resta dell'S&P 500 ----------
    const chartBefore = await p.$eval('#vxChart', (s) => s.innerHTML.length);
    await p.locator('#vxIx button[data-ix="NDX"]').click(); await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({ h2: [...document.querySelectorAll('#v-vix .ph h2')].map((h) => h.innerText), chart: document.querySelector('#vxChart').innerHTML.length, k: [...document.querySelectorAll('#vxKpis .kpi .s')].map((x) => x.innerText), tm: document.querySelector('#vxTableMeta').innerText, ctl: document.querySelector('.vxctl').innerText }));
    info(`${name}: dopo Nasdaq-100 titoli dei pannelli: ${after.h2.join(' | ')}; controllo «${after.ctl.replace(/\n/g, ' ')}»; meta tabella «${after.tm}»`);
    ok(after.chart === chartBefore, `${name}: con Nasdaq-100 il grafico in fondo non cambia (S&P 500)`);
    ok(after.h2.some((h) => /S&P 500/.test(h) && /struttura/i.test(h)), `${name}: il titolo del grafico dice «S&P 500»`);
    ok(/S&P 500/.test(after.k[2]), `${name}: il riquadro della realizzata dice S&P 500 anche con Nasdaq-100`);
    await p.screenshot({ path: path.join(SH, `${name}-02-nasdaq.png`) });
    await p.locator('#vxIx button[data-ix="SPX"]').click(); await p.waitForTimeout(300);
    // ---------- periodi ricordati ----------
    for (const R of ['3A', 'MAX', '10A']) {
      await p.locator(`#vxRange button[data-range="${R}"]`).click(); await p.waitForTimeout(400);
      await p.reload(); await p.waitForSelector('#vxChart path.vxvix', { timeout: 30000 }); await p.waitForTimeout(400);
      ok(await p.locator(`#vxRange button[data-range="${R}"]`).getAttribute('aria-pressed') === 'true', `${name}: periodo ${R} ricordato dopo il ricaricamento`);
      const lab = await p.$$eval('#vxChart text.axt', (t) => t.map((x) => x.textContent).filter((s) => /^(19|20)\d\d$/.test(s)));
      info(`${name}: ${R}: anni sull'asse ${lab[0]}…${lab.at(-1)} (${lab.length}); fascia senza dati: ${await p.locator('#vxChart rect.vxnodata').count()}`);
      if (R === 'MAX') await p.locator('#vxChart').screenshot({ path: path.join(SH, `${name}-03-grafico-MAX.png`) });
    }
    // tastiera sui periodi
    await p.locator('#vxRange button[data-range="3A"]').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    ok(await p.locator('#vxRange button[data-range="3A"]').getAttribute('aria-pressed') === 'true', `${name}: periodo 3A con la tastiera (Invio)`);
    await p.locator('#vxRange button[data-range="10A"]').click(); await p.waitForTimeout(400);
    // ---------- mirino e riquadro dei valori, pannello per pannello ----------
    await p.locator('#vxChart').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    const bb = await p.locator('#vxChart').boundingBox();
    const vb = await p.$eval('#vxChart', (e) => [e.viewBox.baseVal.width, e.viewBox.baseVal.height]); const sc = bb.width / vb[0];
    const pan = await p.$$eval('#vxChart path', (ps) => ps.filter((x) => /vx(vix|prem|r|cr)$/.test(x.getAttribute('class'))).map((x) => { const g = x.getBBox(); return [x.getAttribute('class'), g.y + g.height / 2]; }));
    info(`${name}: viewBox ${vb.join('×')}, altezza a schermo ${Math.round(bb.height)} px`);
    for (const [cls, yy] of pan) {
      for (const fx of [0.05, 0.5, 0.995]) {
        await p.mouse.move(bb.x + bb.width * fx, bb.y + yy * sc); await p.waitForTimeout(150);
        const tip = await p.evaluate(() => { const t = document.querySelector('#vxTip'); const r = t.getBoundingClientRect(); return { hid: t.hidden, txt: t.innerText, l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
        const inside = !tip.hid && tip.l >= 0 && tip.r <= tip.vw && tip.t >= 0 && tip.b <= tip.vh;
        ok(inside && /VIX3M/.test(tip.txt) && /HYG\/IEF/.test(tip.txt), `${name}: riquadro dei valori su ${cls} a ${Math.round(fx * 100)}% dentro lo schermo (${Math.round(tip.l)},${Math.round(tip.t)}–${Math.round(tip.r)},${Math.round(tip.b)})`);
        if (cls === 'vxcr' && fx === 0.995) { info(`${name}: riquadro all'ultima seduta: ${tip.txt.replace(/\n/g, ' / ')}`); await p.screenshot({ path: path.join(SH, `${name}-04-mirino-credito-fine.png`) }); }
      }
    }
    // mirino su tutta l'altezza dei 4 pannelli
    const xh = await p.$eval('#vxChart line.xhair', (l) => [+l.getAttribute('y1'), +l.getAttribute('y2'), l.getAttribute('visibility')]);
    ok(xh[1] > Math.max(...pan.map((x) => x[1])), `${name}: il mirino arriva fino al pannello del credito (y2 ${xh[1]})`);
    await p.mouse.move(5, 5); await p.waitForTimeout(200);
    ok(await p.locator('#vxTip').isHidden(), `${name}: il riquadro dei valori si chiude uscendo dal grafico`);
    // legenda
    const leg = await p.locator('#vxLegend').innerText(); info(`${name}: legenda «${leg.replace(/\n/g, ' · ')}»`);
    ok(/VIX \/ VIX3M/.test(leg) && /backwardation/.test(leg) && /HYG\/IEF/.test(leg), `${name}: legenda con le voci nuove`);
    await p.locator('#vxChart').screenshot({ path: path.join(SH, `${name}-05-grafico-10A.png`) });
    // Come leggere e fonti
    const how = await p.locator('#v-vix').innerText();
    ok(/contango/.test(how) && /backwardation/.test(how) && /HYG/.test(how) && /IEF/.test(how), `${name}: «Come leggere» spiega contango, backwardation, HYG e IEF`);
    ok(await noHScroll(p), `${name}: nessuno scorrimento orizzontale`);
    ok(!errs.length, `${name}: console senza errori ${errs.join(' | ')}`);
    await p.screenshot({ path: path.join(SH, `${name}-06-pagina-intera.png`), fullPage: true });
    await ctx.close();
  }

  // ---------- 2. tablet ----------
  for (const [name, w, theme] of [['820-chiaro', 820, 'light'], ['1024-scuro', 1024, 'dark'], ['1100-chiaro', 1100, 'light'], ['601-scuro', 601, 'dark'], ['600-scuro', 600, 'dark']]) {
    const ctx = await ctxOf({ viewport: { width: w, height: 1100 }, hasTouch: w <= 1024 }, theme); const p = await ctx.newPage(); const errs = watch(p);
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxChart path.vxvix', { timeout: 30000 }); await p.waitForTimeout(500);
    const K = await kpis(p);
    const cols = new Set(K.map((k) => k.left)).size, rows = new Set(K.map((k) => k.top)).size;
    const want = w > 1100 ? [6, 1] : w > 600 ? [3, 2] : [2, 3];
    ok(cols === want[0] && rows === want[1], `${name}: riquadri ${cols} colonne × ${rows} righe (atteso ${want.join('×')})`);
    const hs = new Set(K.map((k) => k.h)); info(`${name}: altezze dei riquadri ${[...hs].join(', ')}`);
    const over = await p.$$eval('#vxKpis .kpi .v, #vxKpis .kpi .s, #vxKpis .kpi .k', (e) => e.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.innerText));
    ok(!over.length, `${name}: nessun testo tagliato nei riquadri ${over.join(' | ')}`);
    ok(await noHScroll(p), `${name}: nessuno scorrimento orizzontale`);
    await p.screenshot({ path: path.join(SH, `${name}-01-apertura.png`) });
    await p.locator('#vxChart').scrollIntoViewIfNeeded(); await p.locator('#vxChart').screenshot({ path: path.join(SH, `${name}-02-grafico.png`) });
    ok(!errs.length, `${name}: console senza errori ${errs.join(' | ')}`);
    await ctx.close();
  }

  // ---------- 3. telefono, tocco ----------
  for (const [name, w, h, theme] of [['390-scuro', 390, 844, 'dark'], ['390-chiaro', 390, 844, 'light'], ['360-chiaro', 360, 780, 'light'], ['360-scuro', 360, 780, 'dark']]) {
    const ctx = await ctxOf({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, theme); const p = await ctx.newPage(); const errs = watch(p);
    await p.goto(BASE + '#mon'); await p.waitForTimeout(1500);
    const t0 = Date.now(); await p.locator('#tab-vix').tap();
    await p.waitForSelector('#vxChart path.vxcr', { timeout: 30000 }); info(`${name}: tocco su 8 VIX → grafico completo in ${Date.now() - t0} ms`);
    await p.waitForTimeout(400);
    const K = await kpis(p);
    const kr = K.find((x) => /VIX \/ VIX3M/.test(x.k)), kc = K.find((x) => /Credito/i.test(x.k));
    info(`${name}: riquadro VIX/VIX3M fondo a ${kr.top + kr.h} px, credito a ${kc.top + kc.h} px (schermo ${h})`);
    ok(kr.top + kr.h <= h && kc.top + kc.h <= h, `${name}: i due riquadri nuovi si vedono senza scorrere`);
    await p.screenshot({ path: path.join(SH, `${name}-01-apertura.png`) });
    // tocco sul riquadro: compare la spiegazione?
    for (const lab of ['VIX / VIX3M', 'Credito high yield']) {
      const loc = p.locator('#vxKpis .kpi', { hasText: lab });
      await loc.scrollIntoViewIfNeeded(); await loc.tap(); await p.waitForTimeout(300);
      const tt = await p.evaluate(() => { const t = document.querySelector('.taptip'); if (!t || t.hidden) return null; const r = t.getBoundingClientRect(); return { txt: t.textContent, l: r.left, r: r.right, t: r.top, b: r.bottom }; });
      ok(tt && tt.l >= 0 && tt.r <= w && tt.t >= 0 && tt.b <= h, `${name}: tocco su «${lab}» mostra la spiegazione dentro lo schermo ${tt ? `(${Math.round(tt.t)}–${Math.round(tt.b)})` : '(nessuna)'}`);
      if (lab === 'VIX / VIX3M') { ok(tt && /backwardation/.test(tt.txt) && /contango/.test(tt.txt), `${name}: la spiegazione al tocco dice cosa sono backwardation e contango`); await p.screenshot({ path: path.join(SH, `${name}-02-tocco-riquadro.png`) }); }
      await p.touchscreen.tap(w / 2, 5); await p.waitForTimeout(200);
    }
    // segnale visivo che il riquadro si può toccare
    const cue = await p.$eval('#vxKpis .kpi .k', (e) => getComputedStyle(e).textDecorationLine + '/' + getComputedStyle(e.parentElement).textDecorationLine);
    info(`${name}: segno di «tocca per la spiegazione» sui riquadri: ${cue}`);
    // grafico: scorrimento della pagina sopra il grafico con un gesto di tocco
    await p.locator('#vxChart').scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -100)); await p.waitForTimeout(300);
    const bb = await p.locator('#vxChart').boundingBox();
    const cdp = await ctx.newCDPSession(p);
    const y0 = await p.evaluate(() => scrollY);
    const gx = Math.round(bb.x + bb.width / 2), gy = Math.round(Math.min(h - 60, bb.y + bb.height / 2));
    // gesto con eventi di tocco grezzi (Input.synthesizeScrollGesture in headless non scorre nemmeno sul testo: non usarlo)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gx, y: gy }] });
    for (let k = 1; k <= 15; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: gx, y: gy - k * 20 }] }); await p.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(500);
    const y1 = await p.evaluate(() => scrollY);
    ok(y1 - y0 > 150, `${name}: trascinando il dito in verticale sul grafico la pagina scorre (${y0} → ${y1})`);
    const ta = await p.$eval('#vxChart', (s) => getComputedStyle(s).touchAction); info(`${name}: touch-action del grafico ${ta}`);
    // tocco sul grafico: riquadro dei valori dentro lo schermo, e si chiude toccando fuori
    await p.locator('#vxChart').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const bb2 = await p.locator('#vxChart').boundingBox(); const vb = await p.$eval('#vxChart', (e) => e.viewBox.baseVal.width); const sc = bb2.width / vb;
    const pan = await p.$$eval('#vxChart path', (ps) => ps.filter((x) => /vx(vix|r|cr)$/.test(x.getAttribute('class'))).map((x) => { const g = x.getBBox(); return [x.getAttribute('class'), g.y + g.height / 2]; }));
    for (const [cls, yy] of pan) for (const fx of [0.1, 0.97]) {
      const ty = bb2.y + yy * sc;
      if (ty < 0 || ty > h) { await p.evaluate((d) => scrollBy(0, d), ty - h / 2); await p.waitForTimeout(200); }
      const bb3 = await p.locator('#vxChart').boundingBox();
      await p.touchscreen.tap(bb3.x + bb3.width * fx, bb3.y + yy * sc); await p.waitForTimeout(250);
      const tip = await p.evaluate(() => { const t = document.querySelector('#vxTip'); const r = t.getBoundingClientRect(); return { hid: t.hidden, txt: t.innerText, l: r.left, r: r.right, t: r.top, b: r.bottom }; });
      ok(!tip.hid && tip.l >= 0 && tip.r <= w + 0.5 && tip.t >= 0 && tip.b <= h, `${name}: tocco su ${cls} a ${Math.round(fx * 100)}%: riquadro dei valori dentro lo schermo (${Math.round(tip.l)},${Math.round(tip.t)}–${Math.round(tip.r)},${Math.round(tip.b)})`);
      if (fx === 0.97) { const cov = await p.evaluate(() => { const t = document.querySelector('#vxTip').getBoundingClientRect(), s = document.querySelector('#vxChart').getBoundingClientRect(); return Math.round(100 * (t.width * t.height) / (s.width * s.height)); }); info(`${name}: il riquadro dei valori toccando ${cls} a destra copre il ${cov}% del grafico`); }
      if (cls === 'vxcr' && fx === 0.97) await p.screenshot({ path: path.join(SH, `${name}-03-tocco-grafico.png`) });
    }
    // tocco fuori dal grafico: sulla legenda (in alto allo schermo, a questo punto, c'è ancora il grafico)
    await p.locator('#vxLegend').scrollIntoViewIfNeeded(); const lg = await p.locator('#vxLegend').boundingBox();
    await p.touchscreen.tap(lg.x + 5, lg.y + lg.height - 2); await p.waitForTimeout(250);
    ok(await p.locator('#vxTip').isHidden(), `${name}: toccando fuori il riquadro dei valori si chiude`);
    // dopo un trascinamento verticale sul grafico (solo per scorrere la pagina) il riquadro dei valori resta aperto?
    { const c2 = await ctx.newCDPSession(p); await p.locator('#vxChart').scrollIntoViewIfNeeded(); const q = await p.locator('#vxChart').boundingBox(); const gx = Math.round(q.x + q.width / 2), gy = Math.round(Math.max(120, q.y + 120));
      await c2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gx, y: gy }] });
      for (let k = 1; k <= 5; k++) await c2.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: gx, y: gy - k * 20 }] });
      await c2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
      info(`${name}: dopo un trascinamento verticale sul grafico il riquadro dei valori è ${(await p.locator('#vxTip').isHidden()) ? 'chiuso' : 'aperto (minore)'}`);
      await p.locator('#vxLegend').tap(); await p.waitForTimeout(200); }
    info(`${name}: altezza del grafico ${Math.round((await p.locator('#vxChart').boundingBox()).height)} px su uno schermo di ${h}`);
    // periodi al tocco
    await p.locator('#vxRange button[data-range="MAX"]').tap(); await p.waitForTimeout(500);
    ok(await p.locator('#vxRange button[data-range="MAX"]').getAttribute('aria-pressed') === 'true', `${name}: MAX al tocco`);
    await p.locator('#vxChart').screenshot({ path: path.join(SH, `${name}-04-grafico-MAX.png`) });
    const bandLab = await p.$$eval('#vxChart text.axt', (t) => t.filter((x) => /dal/.test(x.textContent)).map((x) => { const g = x.getBBox(), r = x.previousElementSibling.getBBox(); return [x.textContent, Math.round(g.x), Math.round(g.x + g.width), Math.round(r.x), Math.round(r.x + r.width)]; }));
    for (const [tx, a, z, ra, rz] of bandLab) info(`${name}: MAX, etichetta «${tx}» ${a}–${z} sulla fascia ${ra}–${rz}: ${a >= ra && z <= rz ? 'dentro' : 'esce dalla fascia (minore)'}`);
    await p.locator('#vxRange button[data-range="10A"]').tap(); await p.waitForTimeout(300);
    // titoli dei pannelli tagliati?
    const ttl = await p.$$eval('#vxChart text', (t) => { const s = t[0].ownerSVGElement; const W = s.viewBox.baseVal.width; return t.filter((x) => /[A-Z]{4}/.test(x.textContent)).map((x) => { const g = x.getBBox(); return [x.textContent, Math.round(g.x), Math.round(g.x + g.width), W]; }); });
    for (const [tx, x0, x1, W] of ttl) ok(x0 >= 0 && x1 <= W, `${name}: titolo «${tx}» dentro il grafico (${x0}–${x1} su ${W})`);
    ok(await noHScroll(p), `${name}: nessuno scorrimento orizzontale`);
    await p.screenshot({ path: path.join(SH, `${name}-05-pagina-intera.png`), fullPage: true });
    ok(!errs.length, `${name}: console senza errori ${errs.join(' | ')}`);
    await ctx.close();
  }

  // ---------- 4. dati vecchi o mancanti ----------
  const cases = [['a-file-150', old], ['b-vix3m-ultima-mancante', miss], ['c-404', null, 404], ['d-credito-fermo-5-sedute', stale], ['e-senza-credito', noCr]];
  for (const [cname, body, status = 200] of cases) for (const [dev, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const name = `${cname}-${dev}`;
    const ctx = await ctxOf(opt, 'dark', body, status); const p = await ctx.newPage(); const errs = watch(p);
    await p.goto(BASE + '#vix'); await p.waitForTimeout(2500);
    if (status === 404) {
      const m = await p.locator('#vxMiss').innerText(); info(`${name}: messaggio «${m}»`);
      ok(!(await p.locator('#vxMiss').isHidden()) && /non disponibili/.test(m), `${name}: dice che i dati mancano`);
      // l'errore 404 della risorsa in console è del browser, non dell'app
      const appErr = errs.filter((e) => !/404|Failed to load resource|reqfail/.test(e));
      ok(!appErr.length, `${name}: nessun errore dell'app in console ${appErr.join(' | ')}`);
      info(`${name}: righe di console del browser: ${errs.join(' | ') || '(nessuna)'}`);
    } else {
      const K = await kpis(p);
      for (const k of K.slice(4)) info(`${name}: «${k.k}» = «${k.v}» | «${k.s}»`);
      info(`${name}: meta «${await p.locator('#vxMeta').innerText()}»`);
      ok(K.length === 6, `${name}: 6 riquadri`);
      ok(!errs.length, `${name}: console senza errori ${errs.join(' | ')}`);
      // riquadro dei valori sull'ultima seduta
      await p.locator('#vxChart').scrollIntoViewIfNeeded(); const bb = await p.locator('#vxChart').boundingBox();
      if (opt.hasTouch) await p.touchscreen.tap(bb.x + bb.width * 0.985, bb.y + 60); else await p.mouse.move(bb.x + bb.width * 0.995, bb.y + 60);
      await p.waitForTimeout(250);
      info(`${name}: riquadro dei valori all'ultima seduta: ${(await p.locator('#vxTip').innerText()).replace(/\n/g, ' / ')}`);
      info(`${name}: legenda «${(await p.locator('#vxLegend').innerText()).replace(/\n/g, ' · ')}»`);
      ok(await noHScroll(p), `${name}: nessuno scorrimento orizzontale`);
      await p.screenshot({ path: path.join(SH, `dati-${name}.png`), fullPage: dev === '1440' ? false : false });
      await p.locator('#vxChart').screenshot({ path: path.join(SH, `dati-${name}-grafico.png`) });
    }
    // le altre viste continuano a funzionare
    for (const [k, v] of [['1', 'mon'], ['6', 'idx'], ['7', 'emg'], ['9', 'alr']]) {
      if (opt.hasTouch) await p.locator(`#tab-${v}`).tap(); else await p.keyboard.press(k);
      await p.waitForTimeout(1200);
      ok(!(await p.locator(`#v-${v}`).isHidden()), `${name}: dopo, la vista ${k} si apre`);
    }
    const appErr = errs.filter((e) => !/404|Failed to load resource|reqfail/.test(e));
    ok(!appErr.length, `${name}: nessun errore dell'app dopo le altre viste ${appErr.join(' | ')}`);
    await ctx.close();
  }

  // ---------- 5. regressione: tutte le viste ----------
  for (const [name, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await ctxOf(opt, 'dark'); const p = await ctx.newPage(); const errs = watch(p);
    await p.goto(BASE); await p.waitForTimeout(2000);
    const ids = await p.$$eval('.fnkeys button[data-view]', (b) => b.map((x) => [x.id, x.dataset.view, x.textContent.trim()]));
    for (const [id, v, lab] of ids) {
      const t0 = Date.now();
      if (opt.hasTouch) await p.locator('#' + id).tap(); else await p.locator('#' + id).click();
      await p.waitForTimeout(1500);
      const vis = await p.evaluate((v) => { const s = document.querySelector(`section.view:not([hidden])`); return s ? s.id : null; });
      ok(vis && vis.endsWith(v) || vis === `v-${v}`, `${name}: «${lab}» apre ${vis}`);
      ok(await noHScroll(p), `${name}: «${lab}» senza scorrimento orizzontale`);
    }
    ok(!errs.length, `${name}: tutte le viste senza errori in console ${errs.join(' | ')}`);
    await ctx.close();
  }

  // ---------- 6. guida ----------
  {
    const ctx = await ctxOf({ viewport: { width: 1280, height: 900 } }, 'light'); const p = await ctx.newPage(); const errs = watch(p);
    await p.goto(BASE + 'guida.html'); await p.waitForTimeout(800);
    const g = await p.locator('body').innerText();
    ok(/VIX3M/.test(g) && /backwardation/.test(g) && /contango/.test(g) && /HYG/.test(g), 'guida: VIX3M, backwardation, contango e HYG spiegati');
    ok(/provvisori/.test(g), 'guida: «provvisorio» spiegato');
    ok(!errs.length, `guida: console senza errori ${errs.join(' | ')}`);
    await ctx.close();
  }

  await b.close();
  console.log(`${checks} controlli, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
