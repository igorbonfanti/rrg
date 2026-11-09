// 1.6.2: i punti grandi dello scatter della vista VIX coincidono con la colonna «Sopra X dal» della tabella degli episodi
// (soglia della tabella; 30 se la soglia è 20 o 25). Deve fallire sulla 1.6.1 (punti grandi sempre sopra 30).
// Uso: BASE=http://127.0.0.1:8791/ SITE=<cartella del sito> NODE_PATH=$(npm root -g) node ricerca/qa/browser/v162.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../..');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const iso = (s) => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`;
(async () => {
  const V = await import(path.join(SITE, 'js/vix.js'));
  const D = await (await fetch(BASE + 'data/vix.json')).json();
  const b = await chromium.launch();
  for (const [name, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const c = await b.newContext(opt);
    await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(400);
    for (const ix of ['SPX', 'NDX']) {
      const ib = p.locator(`#vxIx button[data-ix="${ix}"]`); if (opt.hasTouch) await ib.tap(); else await ib.click(); await p.waitForTimeout(400);
      const A = V.align(V.vxSeries(D.series[ix]), V.vxSeries(D.series.VIX)), S = V.scatter(A), have = new Set(S.pts.map((q) => q.date));
      for (const X of V.XS) {
        const row = p.locator(`#vxTable tr[data-x="${X}"]`); if (opt.hasTouch) await row.tap(); else await row.click(); await p.waitForTimeout(250);
        const XB = Math.max(30, X), want = (XB === 30 ? S.eps : V.episodes(A, XB)).map((e) => e.date).filter((d) => have.has(d)).sort();
        const bigs = (await p.$$eval('#vxScatter circle.vxpt.start', (cs) => cs.map((x) => x.dataset.d))).sort();
        ok(bigs.join() === want.join() && bigs.length > 0, `${name} ${ix} soglia ${X}: ${bigs.length} punti grandi = primi giorni sopra ${XB} (attesi ${want.length})`);
        if (X >= 30) {
          const col = (await p.$$eval('#vxEps tbody tr', (rs) => rs.map((r) => r.children[0].textContent))).map(iso).filter((d) => have.has(d)).sort();
          ok(col.join() === bigs.join(), `${name} ${ix} soglia ${X}: punti grandi uguali alla colonna «Primo giorno a ${X} o più» (${col.length})`);
        }
        const head = await p.$$eval('#vxEps thead th', (t) => t.map((x) => x.textContent));
        ok(head[0] === `Primo giorno a ${X} o più` && head.includes('VIX quel giorno'), `${name} ${ix} soglia ${X}: intestazioni chiare (${head.slice(0, 4).join(' | ')})`);
      }
    }
    ok(/etichette di periodo/.test(await p.locator('#v-vix').innerText()), `${name}: detto che i nomi delle crisi sono etichette`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
