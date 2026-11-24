// 1.6.1, usabilità: (a) sul telefono, passare il dito sullo scatter fa scorrere la pagina? (con controllo che deve fallire:
// touch-action:none forzato sullo scatter); un trascinamento non deve selezionare una crisi. (b) giro di tutte le viste a 1440 e 390:
// console, scorrimento orizzontale, tempi.
// Uso: BASE=http://127.0.0.1:8802/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/usabilita/scorri_e_viste.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  // (a) scorrimento con il dito
  for (const [w, h] of [[390, 844], [360, 780]]) {
    for (const neg of [false, true]) {
      const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
      await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
      const p = await c.newPage();
      await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(400);
      if (neg) await p.addStyleTag({ content: 'svg.ts { touch-action: none !important; }' });
      const cdp = await c.newCDPSession(p);
      const drag = async (x, y, dy) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - (dy * i) / 10 }] }); await p.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
      };
      // dito sullo scatter, in mezzo ai punti
      await p.$eval('#vxScatter', (e) => { const r = e.getBoundingClientRect(); scrollBy(0, r.top - innerHeight / 2 + r.height / 2); }); await p.waitForTimeout(200);
      const r = await p.$eval('#vxScatter rect.frame', (e) => { const b = e.getBoundingClientRect(); return [b.x + b.width * 0.15, b.y + b.height * 0.4]; });
      const s0 = await p.evaluate(() => scrollY); await drag(r[0], r[1], 250); const s1 = await p.evaluate(() => scrollY);
      const sel = await p.$eval('#vxScatter', (e) => e.classList.contains('vxsel'));
      const tip = await p.$eval('#vxScTip', (e) => !e.hidden);
      // controllo: dito su un paragrafo di testo
      const n = await p.$eval('#vxScNote', (e) => { e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return [b.x + 20, b.y + 10]; }); await p.waitForTimeout(200);
      const t0 = await p.evaluate(() => scrollY); await drag(n[0], n[1], 250); const t1 = await p.evaluate(() => scrollY);
      const tag = `${w}${neg ? ' (controllo negativo, touch-action:none forzato)' : ''}`;
      console.log(`     ${tag}: dito sullo scatter → la pagina scorre di ${Math.round(s1 - s0)} px; sul testo → ${Math.round(t1 - t0)} px; crisi selezionata dopo il trascinamento: ${sel}; riquadro aperto: ${tip}`);
      if (!neg) { ok(t1 - t0 > 100, `${tag}: il metodo di prova fa scorrere la pagina sul testo`); ok(s1 - s0 > 100, `${tag}: passando il dito sullo scatter la pagina scorre`); ok(!sel, `${tag}: il trascinamento non seleziona una crisi`); }
      else ok(s1 - s0 < 20, `${tag}: con touch-action:none la prova se ne accorge (non scorre)`);
      await c.close();
    }
  }
  // (b) giro delle viste
  for (const [name, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    for (const theme of ['dark', 'light']) {
      const c = await b.newContext(opt);
      await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
      const p = await c.newPage(), errs = [];
      p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      const t0 = Date.now(); await p.goto(BASE); await p.waitForLoadState('networkidle'); const tl = Date.now() - t0;
      const tabs = await p.$$eval('[role="tab"][data-view]', (ts) => ts.map((t) => t.id));
      const res = [];
      for (const id of tabs) {
        const a = Date.now(); await (opt.hasTouch ? p.tap('#' + id) : p.click('#' + id)); await p.waitForLoadState('networkidle'); await p.waitForTimeout(500);
        const view = await p.$eval('#' + id, (t) => t.getAttribute('aria-controls'));
        const v = await p.evaluate((vid) => { const s = document.getElementById(vid); return { shown: !s.hidden, h: Math.round(s.getBoundingClientRect().height), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; }, view);
        res.push(`${id.slice(4)} ${Date.now() - a}ms h${v.h}${v.sw > v.cw ? ' SCORRE-ORIZZ ' + v.sw : ''}`);
        ok(v.shown && v.h > 100 && v.sw <= v.cw, `${name}-${theme}: vista ${view} visibile (${v.h} px), nessuno scorrimento orizzontale`);
        await p.screenshot({ path: `${__dirname}/shots/viste-${name}-${theme}-${id.slice(4)}.png` });
      }
      console.log(`     ${name}-${theme}: apertura ${tl} ms; ${res.join(' · ')}`);
      ok(!errs.length, `${name}-${theme}: console senza errori ${errs.join(' | ')}`);
      await c.close();
    }
  }
  await b.close();
  console.log(`${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
