// Controllo indipendente 1.10.1 nel browser: righe e dettagli di Oro e Argento contro ricalcolo.json (ricalcolo.py,
// non data/ath.json), console (errori e avvisi), richieste fallite, scorrimento orizzontale, screenshot.
// Uso: BASE=http://127.0.0.1:8823/ NODE_PATH=$(npm root -g) node ricerca/qa/1.10.1/browser.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8823/';
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'ricalcolo.json'), 'utf-8'));
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
let fail = 0, n = 0;
const ok = (c, m) => { n++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const it = (x, d) => { const [a, b] = Math.abs(x).toFixed(d).split('.'); return (x < 0 ? '−' : '') + a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b ? ',' + b : ''); };
const pv = (x) => it(x, Math.abs(x) < 10 ? 3 : 2);
const pc = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(2).replace('.', ',') + '%';
const dI = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
(async () => {
  const b = await chromium.launch();
  const cases = [['1440-chiaro', { viewport: { width: 1440, height: 900 } }, 'light'], ['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'],
    ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark'], ['390-chiaro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'light'],
    ['360-chiaro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }, 'light']];
  for (const [name, opt, theme] of cases) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } catch {} }, theme);
    const p = await c.newPage(), errs = [], bad = [];
    p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()} ${m.text()}`); });
    p.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    p.on('requestfailed', (r) => bad.push(`failed ${r.url()}`));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(600);
    const th = await p.evaluate(() => document.documentElement.getAttribute('data-theme') || getComputedStyle(document.body).backgroundColor);
    for (const [id, sym] of [['GOLD', 'GC=F'], ['SILVER', 'SI=F']]) {
      const r = R[sym];
      const l = p.locator(`#athTable tr.athr[data-id="${id}"]`);
      const row = (await l.textContent().catch(() => '')) || '';
      ok(row.includes(sym) && row.includes(pc(r.distPct)) && row.includes(dI(r.refDate)) && row.includes(pc(r.cycleLowPct)), `${name} ${id}: riga ${pc(r.distPct)}, massimo ${dI(r.refDate)}, calo ${pc(r.cycleLowPct)} — «${row.replace(/\s+/g, ' ').slice(0, 140)}»`);
      await l.scrollIntoViewIfNeeded().catch(() => {});
      await (opt.hasTouch ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })).catch(() => {}); await p.waitForTimeout(400);
      const det = ((await p.$eval('#athTable tr.athdet', (t) => t.textContent).catch(() => '')) || '').replace(/\s+/g, ' ');
      const want = [`ultima chiusura ${pv(r.last)} il ${dI(r.lastDate)}`, `(dal ${dI(r.frm)}) ${pv(r.ref)} il ${dI(r.refDate)}`, `durante la seduta ${pv(r.intradayRef)} il ${dI(r.intradayRefDate)}`,
        `calo più profondo dopo il massimo ${pc(r.cycleLowPct)} il ${dI(r.cycleLowDate)}, da lì ${pc(r.fromLowPct)}`, `serie dal ${dI(r.start)}`, '13:30'];
      const miss = want.filter((w) => !det.includes(w));
      ok(!miss.length, `${name} ${id}: dettaglio (${want.length} pezzi) ${miss.length ? 'mancano ' + JSON.stringify(miss) + ' in «' + det.slice(0, 400) + '»' : ''}`);
      const ch = await p.$eval('#athChartBox', (x) => !x.hidden && x.getBoundingClientRect().height > 50 && !!x.querySelector('svg, canvas')).catch(() => false);
      ok(ch, `${name} ${id}: grafico aperto`);
      const cap = ((await p.$eval('#athChartBox', (x) => x.textContent).catch(() => '')) || '').replace(/\s+/g, ' ');
      ok(cap.includes(pv(r.ref)) && cap.includes(dI(r.refDate)), `${name} ${id}: grafico con il massimo ${pv(r.ref)} del ${dI(r.refDate)}`);
      if (id === 'SILVER') await p.locator('#athTable').screenshot({ path: path.join(OUT, `${name}-tabella-argento.png`) }).catch(() => {});
      if (id === 'SILVER') await p.locator('#athChartBox').screenshot({ path: path.join(OUT, `${name}-grafico-argento.png`) }).catch(() => {});
      await (opt.hasTouch ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })).catch(() => {}); await p.waitForTimeout(200);
    }
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale ${sw}`);
    ok(!errs.length, `${name}: console senza errori né avvisi ${errs.join(' | ')}`);
    ok(!bad.length, `${name}: nessuna richiesta fallita ${bad.join(' | ')}`);
    console.log(`     tema: ${th}`);
    await c.close();
  }
  await b.close(); console.log(`${n} controlli, ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
