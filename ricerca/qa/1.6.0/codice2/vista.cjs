// Secondo giro, vista 8 VIX (1.6.0, 6fc67a1): correzioni dei controlli codice, grafici e usabilità nel browser.
// Il JSON servito si modifica con page.route per forzare i casi (fonte Yahoo, VIX3M di FRED, rapporto 0,997, rapporto
// oltre 1,7, credito in ritardo). Uso:
// BASE=http://127.0.0.1:8798/ SITE=/home/user/rrg NODE_PATH=$(npm root -g) node vista.cjs [SHOTS=0]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8798/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../../..');
const SHOTS = process.env.SHOTS !== '0', OUTD = path.join(__dirname, 'shots');
let fail = 0, n = 0;
const ok = (c, m) => { n++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  const { decodeDates, deltaDecode } = await import(path.join(SITE, 'js/indexdata.js'));
  const { pack } = await import(path.join(SITE, 'scripts/fetch_emerging.js'));
  const raw = await (await fetch(BASE + 'data/vix.json')).text(), D0 = JSON.parse(raw);
  const clone = () => JSON.parse(raw);
  const LAST = D0.asOf.vix;
  // VIX3M con valori cambiati in alcune date
  const setV3 = (D, f) => { const s = D.series.VIX3M, d = decodeDates(s.d0, s.gaps), v = deltaDecode(s.cd, s.ps); const v2 = v.map((x, i) => f(d[i], x)); D.series.VIX3M = { ...pack(d, v2, s.ps), last: s.last, fred: s.fred }; return D; };
  const vixAt = (date) => { const s = D0.series.VIX, d = decodeDates(s.d0, s.gaps), v = deltaDecode(s.cd, s.ps); return v[d.indexOf(date)]; };
  const cases = {
    base: clone(),
    yahoo: (() => { const D = clone(); D.asOf.vixSrc = 'Yahoo'; D.asOf.vix3mSrc = 'Yahoo'; return D; })(),
    mixed: (() => { const D = clone(); D.asOf.vixSrc = 'Cboe'; D.asOf.vix3mSrc = 'Yahoo'; return D; })(),
    nosrc: (() => { const D = clone(); delete D.asOf.vixSrc; delete D.asOf.vix3mSrc; return D; })(),
    v3fred: (() => { const D = clone(); D.series.VIX3M.fred = LAST; D.asOf.fred3m = LAST; D.asOf.vix3mSrc = 'FRED'; return D; })(),
    vixfred: (() => { const D = clone(); D.series.VIX.fred = LAST; D.asOf.fred = LAST; D.asOf.vixSrc = 'FRED'; return D; })(),
    r0997: setV3(clone(), (d, x) => (d === LAST ? Math.round((vixAt(LAST) / 0.9969) * 100) / 100 : x)),
    r1000: setV3(clone(), (d, x) => (d === LAST ? Math.round((vixAt(LAST) / 0.9997) * 100) / 100 : x)),
    r19: setV3(clone(), (d, x) => (d === '2008-10-24' ? Math.round((vixAt('2008-10-24') / 1.9) * 100) / 100 : x)),
    r16: setV3(clone(), (d, x) => (d === '2008-10-24' ? Math.round((vixAt('2008-10-24') / 1.6) * 100) / 100 : x)),
    r175: setV3(clone(), (d, x) => (d === '2008-10-24' ? Math.round((vixAt('2008-10-24') / 1.75) * 100) / 100 : x)),
    r30: setV3(clone(), (d, x) => (d === '2008-10-24' ? Math.round((vixAt('2008-10-24') / 3.0) * 100) / 100 : x)),
    creditOld: (() => { const D = clone(), s = D.series.HYGIEF, d = decodeDates(s.d0, s.gaps), v = deltaDecode(s.cd, s.ps); D.series.HYGIEF = { ...pack(d.slice(0, -1), v.slice(0, -1), s.ps), last: d.at(-2) }; D.asOf.credit = d.at(-2); return D; })(),
  };
  const b = await chromium.launch();
  const desk = (w) => ({ viewport: { width: w, height: 900 } }), phone = (w) => ({ viewport: { width: w, height: w < 380 ? 740 : 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const ctxOf = async (opt, theme, body, range) => {
    const c = await b.newContext(opt);
    await c.addInitScript(([t, r]) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, [theme, range]);
    if (body) await c.route('**/data/vix.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));
    return c;
  };
  const open = async (ctx, range) => {
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }); await p.waitForTimeout(600);
    if (range) { const bt = p.locator(`#vxRange button[data-range="${range}"]`); await bt.click(); await p.waitForTimeout(400); }
    return { p, errs };
  };
  const hscroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const kpi = (p, re) => p.$$eval('#vxKpis .kpi', (k, src) => k.map((x) => ({ k: x.querySelector('.k').innerText, v: x.querySelector('.v').innerText, s: x.querySelector('.s').innerText, t: x.title })).find((x) => new RegExp(src, 'i').test(x.k)), re.source);
  const tipLast = async (p, touch) => {
    await p.locator('#vxChart').scrollIntoViewIfNeeded(); await p.waitForTimeout(100);
    const bb = await p.$eval('#vxChart', (s) => { const r = [...s.querySelectorAll('rect')].find((x) => x.getAttribute('fill') === 'transparent').getBoundingClientRect(); return { x: r.right - 3, y: r.top + 40 }; });
    if (touch) await p.touchscreen.tap(bb.x, bb.y); else await p.mouse.move(bb.x, bb.y);
    await p.waitForTimeout(150);
    return p.$$eval('#vxTip .row', (rs) => Object.fromEntries(rs.map((r) => [r.children[0].innerText, r.children[1] ? r.children[1].innerText : ''])));
  };
  // asse del rapporto: etichette a destra del pannello VIX / VIX3M
  const ratioAxis = (p) => p.evaluate(() => {
    const s = document.getElementById('vxChart'), one = s.querySelector('line.vxone'); if (!one) return null;
    const fr = [...s.querySelectorAll('rect.frame')], pane = fr.find((r) => +r.getAttribute('y') <= +one.getAttribute('y1') && +one.getAttribute('y1') <= +r.getAttribute('y') + +r.getAttribute('height'));
    const y0 = +pane.getAttribute('y'), y1 = y0 + +pane.getAttribute('height'), xr = +pane.getAttribute('x') + +pane.getAttribute('width');
    const labs = [...s.querySelectorAll('text.axt')].filter((t) => +t.getAttribute('x') > xr && +t.getAttribute('y') - 3 >= y0 - 0.5 && +t.getAttribute('y') - 3 <= y1 + 0.5).map((t) => ({ s: t.textContent, y: +t.getAttribute('y') - 3 }));
    return { labs, yOne: +one.getAttribute('y1'), y0, y1 };
  });
  const checkAxis = (A, name) => {
    if (!A) return ok(false, `${name}: asse del rapporto non trovato`);
    const v = A.labs.map((l) => +l.s.replace(',', '.')), d = v.slice(1).map((x, i) => +(v[i] - x).toFixed(6)), k = Math.abs(d[0]);
    const dec = A.labs.map((l) => (l.s.split(',')[1] || '').length), want = Math.abs(k * 10 - Math.round(k * 10)) > 1e-9 ? 2 : 1;
    const steady = d.every((x) => Math.abs(Math.abs(x) - k) < 1e-6), multiples = v.every((x) => Math.abs(x / k - Math.round(x / k)) < 1e-6);
    // posizione: le y delle etichette sono lineari nel valore e l'1 è sulla linea a 1
    const a = (A.labs[1].y - A.labs[0].y) / (v[1] - v[0]), lin = A.labs.every((l, i) => Math.abs(A.labs[0].y + a * (v[i] - v[0]) - l.y) < 0.05), oneOk = Math.abs(A.labs[0].y + a * (1 - v[0]) - A.yOne) < 0.05;
    ok(A.labs.length >= 2 && steady && multiples && dec.every((x) => x === want) && lin && oneOk, `${name}: asse del rapporto [${A.labs.map((l) => l.s).join(' ')}] passo ${k}, decimali ${[...new Set(dec)]}, posizioni lineari ${lin}, 1 sulla linea ${oneOk}`);
    return k;
  };
  // fasce grigie e scritte
  const noData = (p) => p.evaluate(() => {
    const s = document.getElementById('vxChart'), W = +s.getAttribute('viewBox').split(' ')[2];
    const rs = [...s.querySelectorAll('rect.vxnodata')].map((r) => {
      const x = +r.getAttribute('x'), w = +r.getAttribute('width'), cy = +r.getAttribute('y') + +r.getAttribute('height') / 2 + 3;
      const t = [...s.querySelectorAll('text')].find((q) => /dal \d/.test(q.textContent) && Math.abs(+q.getAttribute('y') - cy) < 1);
      if (!t) return { w: +w.toFixed(1), label: null };
      const bb = t.getBBox(); return { w: +w.toFixed(1), label: t.textContent, x0: +bb.x.toFixed(1), x1: +(bb.x + bb.width).toFixed(1), inside: bb.x >= x && bb.x + bb.width <= x + w };
    });
    const out = [...s.querySelectorAll('text')].filter((t) => { const bb = t.getBBox(); return bb.width && (bb.x < -0.5 || bb.x + bb.width > W + 0.5); }).map((t) => t.textContent);
    return { rs, out, W };
  });

  // ---------- 1. scritte delle fasce grigie a MAX, larghezze del telefono e del computer ----------
  const seen = {};
  for (const w of [320, 360, 375, 390, 412, 1280, 1440]) for (const th of ['light', 'dark']) {
    const ctx = await ctxOf(w < 1000 ? phone(w) : desk(w), th, null); const { p, errs } = await open(ctx, 'MAX');
    const N = await noData(p);
    ok(N.rs.length === 2 && N.rs.every((r) => !r.label || r.inside) && !N.out.length, `${w} ${th} MAX: ${N.rs.length} fasce grigie, scritte ${JSON.stringify(N.rs)}; testi oltre il bordo ${JSON.stringify(N.out)}`);
    seen[w] = N.rs.map((r) => (r.label ? 'sì' : 'no')).join('/');
    const A = await ratioAxis(p); checkAxis(A, `${w} ${th} MAX dati veri`);
    ok(!(await hscroll(p)) && !errs.length, `${w} ${th}: nessuno scorrimento orizzontale, console pulita ${errs.join(' | ')}`);
    if (SHOTS) await p.locator('#vxChart').screenshot({ path: path.join(OUTD, `chart-${w}-${th}-MAX.png`) });
    if (w === 390) {
      const h = await p.$eval('#vxChart', (s) => s.getBoundingClientRect().height); const vh = 844;
      ok(h < 600, `390 ${th}: grafico alto ${h.toFixed(0)} px (${((100 * h) / vh).toFixed(0)}% di uno schermo di ${vh}; nella 06a5360 648)`);
      // legenda: punto finale
      const L = await p.evaluate(() => { const k = document.querySelector('#vxLegend .kd.vxk-dot'); if (!k) return null; const cs = getComputedStyle(k), r = k.getBoundingClientRect(); const path = document.querySelector('#vxChart path.vxr'); return { bg: cs.backgroundColor, w: r.width, h: r.height, rad: cs.borderRadius, stroke: getComputedStyle(path).stroke, text: k.parentElement.innerText }; });
      ok(L && L.w >= 8 && L.bg === L.stroke && L.rad === '50%' && /ultimo valore/.test(L.text), `390 ${th}: legenda con il punto finale ${JSON.stringify(L)}`);
      if (SHOTS) await p.locator('#vxLegend').screenshot({ path: path.join(OUTD, `legenda-390-${th}.png`) });
    }
    await ctx.close();
  }
  console.log('   scritte presenti (VIX3M/credito):', JSON.stringify(seen));
  // altezza a 1440 (non cambia) e 3A/10A senza fasce
  {
    const ctx = await ctxOf(desk(1440), 'dark', null); const { p } = await open(ctx, '10A');
    const h = await p.$eval('#vxChart', (s) => s.getAttribute('height'));
    ok(+h === 648, `1440: altezza del grafico ${h} (invariata, 648)`);
    ok((await p.locator('#vxChart rect.vxnodata').count()) === 0, '1440 10A: nessuna fascia grigia');
    await ctx.close();
  }

  // ---------- 2. riga delle date: fonte dell'ultima seduta ----------
  for (const [c, re, desc] of [
    ['base', /VIX al 06\/11\/2026 \(FRED al 05\/11\/2026, poi Cboe, provvisorio\) · VIX3M al 06\/11\/2026 \(FRED al 05\/11\/2026, poi Cboe, provvisorio\)/, 'Cboe, Cboe'],
    ['yahoo', /VIX al 06\/11\/2026 \(FRED al 05\/11\/2026, poi Yahoo, provvisorio\) · VIX3M al 06\/11\/2026 \(FRED al 05\/11\/2026, poi Yahoo, provvisorio\)/, 'Yahoo, Yahoo'],
    ['mixed', /poi Cboe, provvisorio\) · VIX3M al 06\/11\/2026 \(FRED al 05\/11\/2026, poi Yahoo, provvisorio\)/, 'Cboe, Yahoo'],
    ['nosrc', /poi Cboe o Yahoo, provvisorio\) · VIX3M al 06\/11\/2026 \(FRED al 05\/11\/2026, poi Cboe o Yahoo, provvisorio\)/, 'senza src (file vecchio)'],
    ['v3fred', /VIX al 06\/11\/2026 \(FRED al 05\/11\/2026, poi Cboe, provvisorio\) · VIX3M al 06\/11\/2026 · HYG/, 'VIX3M già di FRED'],
    ['vixfred', /VIX al 06\/11\/2026 · VIX3M al 06\/11\/2026 \(FRED al 05\/11\/2026, poi Cboe, provvisorio\)/, 'VIX già di FRED'],
  ]) {
    const ctx = await ctxOf(desk(1440), 'light', cases[c]); const { p, errs } = await open(ctx);
    const meta = await p.locator('#vxMeta').innerText();
    ok(re.test(meta) && !errs.length, `riga delle date (${desc}): «${meta}»`);
    // riquadro dei valori all'ultima seduta: «provv.» sul VIX e sul VIX3M
    const T = await tipLast(p, false);
    const pv = /provv/.test(T.VIX || ''), p3 = /provv/.test(T.VIX3M || '');
    const want = { base: [true, true], yahoo: [true, true], mixed: [true, true], nosrc: [true, true], v3fred: [true, false], vixfred: [false, true] }[c];
    ok(pv === want[0] && p3 === want[1], `riquadro dei valori (${desc}) all'ultima seduta: VIX «${T.VIX}», VIX3M «${T.VIX3M}» (provv. atteso ${want})`);
    if (SHOTS && (c === 'v3fred' || c === 'vixfred')) await p.locator('#vxTip').screenshot({ path: path.join(OUTD, `tip-${c}-1440.png`) });
    if (c === 'base') {
      const K = await kpi(p, /^VIX$/), KR = await kpi(p, /VIX \/ VIX3M/);
      ok(/Provvisorio/.test(K.t) && /Provvisorio/.test(KR.t), `title dei riquadri VIX e VIX/VIX3M spiegano «provvisorio»`);
    }
    await ctx.close();
  }

  // ---------- 3. rapporto vicino a 1 ----------
  for (const [c, wantKpi] of [['r0997', '0,997'], ['r1000', '1,000']]) {
    for (const [w, touch] of [[1440, false], [390, true]]) {
      const ctx = await ctxOf(w > 1000 ? desk(w) : phone(w), 'dark', cases[c]); const { p, errs } = await open(ctx);
      const K = await kpi(p, /VIX \/ VIX3M/), T = await tipLast(p, touch);
      const kv = K.v.replace(/\s+/g, ' ');
      ok(kv.startsWith(wantKpi) && /contango/.test(kv) && (T['VIX / VIX3M'] || '').startsWith(wantKpi + ' contango') && !errs.length, `${c} ${w}: riquadro «${kv}», riquadro dei valori «${T['VIX / VIX3M']}»`);
      if (SHOTS) { await p.locator('#vxKpis').screenshot({ path: path.join(OUTD, `kpi-${c}-${w}.png`) }); }
      await ctx.close();
    }
  }

  // ---------- 4. asse del rapporto con il massimo oltre 1,7 (passo 0,25) ----------
  for (const c of ['r16', 'r175', 'r19', 'r30']) for (const [w, th] of [[1440, 'light'], [390, 'dark'], [320, 'light']]) {
    const ctx = await ctxOf(w > 1000 ? desk(w) : phone(w), th, cases[c]); const { p, errs } = await open(ctx, 'MAX');
    const k = checkAxis(await ratioAxis(p), `${c} ${w} ${th} MAX`);
    const N = await noData(p);
    ok(!errs.length && !(await hscroll(p)) && !N.out.length, `${c} ${w}: console pulita, nessuno scorrimento, nessun testo fuori (passo ${k})`);
    if (SHOTS && c !== 'r175' && !(c === 'r16' && w === 1440)) await p.locator('#vxChart').screenshot({ path: path.join(OUTD, `asse-${c}-${w}-${th}.png`) });
    await ctx.close();
  }

  // ---------- 5. credito più vecchio del VIX ----------
  for (const [w, th, touch] of [[1440, 'light', false], [390, 'dark', true], [360, 'light', true]]) {
    const ctx = await ctxOf(w > 1000 ? desk(w) : phone(w), th, cases.creditOld); const { p, errs } = await open(ctx);
    const K = await kpi(p, /credito/), T = await tipLast(p, touch);
    ok(K.v.trim() === '—' && /HYG\/IEF del 06\/11\/2026 non ancora arrivato · al 05\/11\/2026 era −\d+,\d% dal massimo/.test(K.s) && !errs.length && !(await hscroll(p)), `credito in ritardo ${w} ${th}: «${K.v}» «${K.s}»`);
    ok((T['HYG/IEF dal massimo 12 mesi'] || '') === '—', `credito in ritardo ${w}: riquadro dei valori all'ultima seduta «${T['HYG/IEF dal massimo 12 mesi']}»`);
    const over = await p.$$eval('#vxKpis .kpi .s', (e) => e.filter((x) => x.scrollWidth > x.clientWidth + 1).length);
    ok(over === 0, `credito in ritardo ${w}: nessun testo tagliato nei riquadri`);
    if (SHOTS) await p.locator('#vxKpis').screenshot({ path: path.join(OUTD, `kpi-credito-ritardo-${w}-${th}.png`) });
    await ctx.close();
  }
  // credito aggiornato: riquadro col valore e il sottotitolo nuovo
  {
    const ctx = await ctxOf(desk(1440), 'dark', null); const { p } = await open(ctx);
    const K = await kpi(p, /credito/);
    ok(/^−\d+,\d%$/.test(K.v.trim()) && /percentile del calo \(alto = più profondo\) · al 06\/11\/2026/.test(K.s), `credito aggiornato: «${K.v}» «${K.s}»`);
    if (SHOTS) await p.screenshot({ path: path.join(OUTD, 'vista-1440-dark.png'), fullPage: true });
    await ctx.close();
  }

  // ---------- 6. disegno con la vista nascosta (getComputedTextLength vale 0 su un SVG non visibile) ----------
  {
    const ctx = await ctxOf(phone(360), 'light', null); const { p, errs } = await open(ctx, 'MAX');
    await p.goto(BASE + '#mon'); await p.waitForTimeout(800);
    await p.setViewportSize({ width: 320, height: 740 }); await p.waitForTimeout(500);
    await p.evaluate(() => { const b = document.querySelector('[data-theme-toggle], #themeToggle'); if (b) b.click(); });
    await p.waitForTimeout(300);
    await p.goto(BASE + '#vix'); await p.waitForTimeout(900);
    const N = await noData(p);
    ok(N.rs.every((r) => !r.label || r.inside) && !N.out.length && !errs.length, `360 → altra vista → 320 → di nuovo VIX: scritte ${JSON.stringify(N.rs)}, W ${N.W}`);
    await ctx.close();
  }
  await b.close();
  console.log(`\n${n} controlli, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
