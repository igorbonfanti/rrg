// Controllo finale 1.6.0 (commit 77b4d97), vista 8 VIX nel browser. Il JSON servito si modifica con page.route.
// 1) rapporto appena sotto 1 all'ultima seduta: riquadro e riquadro dei valori «0,999 contango», mai «1,000 contango»;
//    appena sopra 1: «1,000 backwardation»; il numero è il troncamento esatto del rapporto vero.
// 2) MAX a 320, 360, 390, 1440 px, chiaro e scuro: ogni fascia grigia ha la sua scritta, dentro la fascia; sul telefono
//    la versione corta («dal AAAA»), sul computer quella lunga.
// 3) file senza vixSrc/vix3mSrc (1.5.0): riga delle date «Cboe o Yahoo». 4) console senza errori né avvisi.
// Uso: BASE=http://127.0.0.1:8799/ SITE=/home/user/rrg NODE_PATH=$(npm root -g) node vista_finale.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8799/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../../..');
const OUTD = path.join(__dirname, 'shots');
let fail = 0, n = 0;
const ok = (c, m) => { n++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  const { decodeDates, deltaDecode } = await import(path.join(SITE, 'js/indexdata.js'));
  const { pack } = await import(path.join(SITE, 'scripts/fetch_emerging.js'));
  const raw = await (await fetch(BASE + 'data/vix.json')).text(), D0 = JSON.parse(raw);
  const clone = () => JSON.parse(raw), LAST = D0.asOf.vix;
  const dec = (s) => ({ d: decodeDates(s.d0, s.gaps), v: deltaDecode(s.cd, s.ps || 1) });
  const vixLast = (() => { const s = dec(D0.series.VIX); return s.v[s.d.indexOf(LAST)]; })();
  // VIX3M all'ultima seduta scelto (in centesimi, come nel file) per avere il rapporto voluto
  const withV3 = (v3) => { const D = clone(), s = D.series.VIX3M, x = dec(s); x.v[x.d.indexOf(LAST)] = v3; D.series.VIX3M = { ...pack(x.d, x.v, s.ps), last: s.last, fred: s.fred }; return D; };
  const pick = (target, below) => { const c = Math.round(vixLast / target * 100); for (let k = c - 3; k <= c + 3; k++) { const r = vixLast / (k / 100); if ((below ? r < 1 : r >= 1) && Math.abs(r - target) < 0.0004) return k / 100; } return Math.round(vixLast / target * 100) / 100; };
  const trunc = (r) => (r < 1 ? (Math.floor(Math.round(r * 1e9) / 1e6) / 1000) : Math.round(r * 1000) / 1000).toFixed(3).replace('.', ',');
  const b = await chromium.launch();
  const desk = (w) => ({ viewport: { width: w, height: 900 } }), phone = (w) => ({ viewport: { width: w, height: w < 380 ? 740 : 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const ctxOf = async (opt, theme, body) => {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    if (body) await c.route('**/data/vix.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));
    return c;
  };
  const open = async (ctx, range) => {
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }); await p.waitForTimeout(600);
    if (range) { await p.locator(`#vxRange button[data-range="${range}"]`).click(); await p.waitForTimeout(400); }
    return { p, errs };
  };
  const kpi = (p) => p.$$eval('#vxKpis .kpi', (k) => k.map((x) => ({ k: x.querySelector('.k').innerText, v: x.querySelector('.v').innerText, s: x.querySelector('.s').innerText })).find((x) => /VIX \/ VIX3M/.test(x.k)));
  const tipLast = async (p, touch) => {
    await p.locator('#vxChart').scrollIntoViewIfNeeded(); await p.waitForTimeout(100);
    const bb = await p.$eval('#vxChart', (s) => { const r = [...s.querySelectorAll('rect')].find((x) => x.getAttribute('fill') === 'transparent').getBoundingClientRect(); return { x: r.right - 3, y: r.top + 40 }; });
    if (touch) await p.touchscreen.tap(bb.x, bb.y); else await p.mouse.move(bb.x, bb.y);
    await p.waitForTimeout(150);
    return p.$$eval('#vxTip .row', (rs) => Object.fromEntries(rs.map((r) => [r.children[0].innerText, r.children[1] ? r.children[1].innerText : ''])));
  };
  // ---------- 1. rapporto vicino a 1 ----------
  const rcases = [['0.9997', 0.9997, true], ['0.99951', 0.99951, true], ['0.9992', 0.9992, true], ['0.9969', 0.9969, true], ['1.0003', 1.0003, false]];
  for (const [name, target, below] of rcases) {
    const v3 = pick(target, below), r = vixLast / v3, want = trunc(r), state = r >= 1 ? 'backwardation' : 'contango';
    for (const [w, touch] of [[1440, false], [390, true]]) {
      const ctx = await ctxOf(touch ? phone(w) : desk(w), 'dark', withV3(v3)); const { p, errs } = await open(ctx, null);
      const K = await kpi(p), T = await tipLast(p, touch), row = T['VIX / VIX3M'] || '';
      const kv = K.v.replace(/\s+/g, ' ').trim();
      ok(kv === `${want} ${state}` && row === `${want} ${state}` && !/1,000 contango/.test(kv + row) && !errs.length,
        `${w} R ${r.toFixed(6)} (VIX ${vixLast} / VIX3M ${v3}): riquadro «${kv}», riquadro dei valori «${row}», atteso «${want} ${state}»; console ${errs.length ? errs.join(' | ') : 'pulita'}`);
      if (name === '0.9997') await p.locator('#vxKpis').screenshot({ path: path.join(OUTD, `kpi-r09997-${w}.png`) });
      await ctx.close();
    }
  }
  // ---------- 2. scritte delle fasce grigie a MAX ----------
  const noData = (p) => p.evaluate(() => {
    const s = document.getElementById('vxChart'), W = +s.getAttribute('viewBox').split(' ')[2];
    const rs = [...s.querySelectorAll('rect.vxnodata')].map((r) => {
      const x = +r.getAttribute('x'), w = +r.getAttribute('width'), cy = +r.getAttribute('y') + +r.getAttribute('height') / 2 + 3;
      const t = [...s.querySelectorAll('text')].find((q) => /dal \d/.test(q.textContent) && Math.abs(+q.getAttribute('y') - cy) < 1);
      if (!t) return { w: +w.toFixed(1), label: null };
      const bb = t.getBBox(); return { w: +w.toFixed(1), label: t.textContent, x0: +bb.x.toFixed(1), x1: +(bb.x + bb.width).toFixed(1), inside: bb.x >= x + 0.5 && bb.x + bb.width <= x + w - 0.5 };
    });
    const out = [...s.querySelectorAll('text')].filter((t) => { const bb = t.getBBox(); return bb.width && (bb.x < -0.5 || bb.x + bb.width > W + 0.5); }).map((t) => t.textContent);
    return { rs, out };
  });
  for (const w of [320, 360, 390, 1440]) for (const th of ['light', 'dark']) {
    const ctx = await ctxOf(w < 1000 ? phone(w) : desk(w), th, null); const { p, errs } = await open(ctx, 'MAX');
    const N = await noData(p);
    const allLab = N.rs.length === 2 && N.rs.every((r) => r.label && r.inside);
    const form = w < 1000 ? N.rs.every((r) => r.label && /^(VIX3M dal \d\d\/\d\d\/\d{4}|HYG\/IEF dal \d\d\/\d\d\/\d{4}|dal \d{4})$/.test(r.label)) && N.rs.some((r) => /^dal \d{4}$/.test(r.label))
      : N.rs.every((r) => r.label && /^(VIX3M|HYG\/IEF) dal \d\d\/\d\d\/\d{4}$/.test(r.label));
    ok(allLab && form && !N.out.length && !errs.length, `${w} ${th} MAX: ${JSON.stringify(N.rs)}; testi oltre il bordo ${N.out.length}; console ${errs.length ? errs.join(' | ') : 'pulita'}`);
    await p.locator('#vxChart').screenshot({ path: path.join(OUTD, `chart-${w}-${th}-MAX.png`) });
    await ctx.close();
  }
  // ---------- 3. file senza src ----------
  {
    const D = clone(); delete D.asOf.vixSrc; delete D.asOf.vix3mSrc; D.asOf.vixSrc = null;
    const ctx = await ctxOf(desk(1440), 'light', D); const { p, errs } = await open(ctx);
    const m = await p.$eval('#vxMeta', (e) => e.textContent);
    ok(/VIX al \d\d\/\d\d\/\d{4} \(FRED al [^,]+, poi Cboe o Yahoo, provvisorio\)/.test(m) && !/poi Cboe,|poi Yahoo,/.test(m) && !errs.length, `vixSrc null: «${m}»`);
    await ctx.close();
  }
  // ---------- 4. console su tutte le viste, chiaro e scuro ----------
  for (const [opt, th] of [[desk(1440), 'light'], [phone(390), 'dark']]) {
    const ctx = await ctxOf(opt, th, null); const { p, errs } = await open(ctx);
    for (const r of ['10A', 'MAX', '3A']) { await p.locator(`#vxRange button[data-range="${r}"]`).click(); await p.waitForTimeout(250); }
    ok(!errs.length, `${opt.viewport.width} ${th}: console senza errori cambiando periodo (${errs.join(' | ')})`);
    await ctx.close();
  }
  await b.close();
  console.log(`\n${n} controlli, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
