// 1.9.1: bandiere del paese per i titoli esteri del SOXX nella vista 5 e spiegazione della dimensione delle bolle.
// Deve fallire sulla 1.9.0. Uso: BASE=http://127.0.0.1:8791/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v191.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  // paesi attesi dal file dei dati (campo c), letti senza le funzioni della vista
  const M = await (await fetch(BASE + 'data/industry_members.json')).json();
  const ext = M.stocks.filter((s) => s.sec === 'SOXX' && s.c && s.c !== 'US');
  ok(ext.length >= 5 && M.stocks.filter((s) => s.sec === 'SOXX').every((s) => s.c), `paese per tutti i titoli del SOXX, ${ext.length} esteri (${ext.map((s) => s.s + ' ' + s.c).join(', ')})`);
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark']]) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#tit-SOXX'); await p.waitForSelector('#titBubble circle.dot', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({
      rings: [...document.querySelectorAll('#titBubble circle.dot.ext')].map((x) => x.dataset.s),
      flags: document.querySelectorAll('#titBubble svg.flag').length,
      listFlags: [...document.querySelectorAll('#titPain tbody tr')].filter((tr) => tr.querySelector('svg.flag')).map((tr) => tr.dataset.s),
      leg: !document.getElementById('titFlagLeg')?.hidden, size: document.getElementById('titSizeLeg') && !document.getElementById('titSizeLeg').hidden ? document.getElementById('titSizeLeg').textContent : '',
    }));
    const extIn = ext.filter((s) => s.d200 != null).map((s) => s.s);
    ok(extIn.every((s) => r.rings.includes(s)) && r.rings.every((s) => ext.some((x) => x.s === s)), `${name}: anello sui titoli esteri (${r.rings.join(', ')})`);
    ok(r.flags >= 3, `${name}: ${r.flags} bandiere accanto alle etichette`);
    ok(r.leg && /peso nell'ETF SOXX/.test(r.size) && /non è la capitalizzazione/.test(r.size), `${name}: legenda con bandiera e dimensione delle bolle`);
    ok(r.listFlags.every((s) => ext.some((x) => x.s === s)), `${name}: bandiere nella lista solo per gli esteri (${r.listFlags.join(', ')})`);
    if (!opt.hasTouch) {
      const tsm = await p.$eval('#titBubble circle.dot[data-s="TSM"]', (x) => { x.scrollIntoView({ block: 'center' }); const q = x.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }).catch(() => null);
      if (tsm) { await p.mouse.move(tsm[0], tsm[1]); await p.waitForTimeout(200); }
      const tip = await p.$eval('#titBubbleTip', (t) => (t.hidden ? '' : t.textContent)).catch(() => '');
      ok(/paese \(iShares\)\s*Taiwan/.test(tip) && /non è la capitalizzazione/.test(tip) && !/·\s*$/.test(tip.split('\n')[0]), `${name}: riquadro di TSM con il paese e la nota sul peso`);
      // i settori non cambiano: niente anelli, bandiere né nota sulla dimensione
      await p.goto(BASE + '#tit-XLK'); await p.waitForTimeout(1500);
      ok(await p.locator('#titBubble circle.ext, #titBubble svg.flag').count() === 0 && await p.locator('#titSizeLeg').isHidden(), `${name}: XLK senza bandiere né nota`);
    }
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
