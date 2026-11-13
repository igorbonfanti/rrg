// 1.10.1: oro e argento con i future GC=F e SI=F nel pannello dei massimi (vista 8 VIX). Deve fallire sulla 1.10.0 (GLD, SLV).
// Uso: BASE=http://127.0.0.1:8791/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v1101.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const sg = (v) => (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + '%';
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
(async () => {
  const A = await (await fetch(BASE + 'data/ath.json?x=' + Date.now())).json().catch(() => null);
  const g = A && A.markets.find((m) => m.id === 'GOLD'), s = A && A.markets.find((m) => m.id === 'SILVER');
  ok(g && g.symbol === 'GC=F' && s && s.symbol === 'SI=F' && g.stats && s.stats, `dati: oro ${g && g.symbol}, argento ${s && s.symbol}`);
  const b = await chromium.launch();
  for (const [name, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const c = await b.newContext(opt); await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(500);
    for (const [id, m] of [['GOLD', g], ['SILVER', s]]) {
      const row = await p.$eval(`#athTable tr.athr[data-id="${id}"]`, (t) => t.textContent).catch(() => '');
      ok(m && row.includes(m.symbol) && row.includes('future continuo') && row.includes(sg(m.stats.distPct)), `${name} ${id}: riga «${row.slice(0, 70)}»`);
      const l = p.locator(`#athTable tr.athr[data-id="${id}"]`);
      await (opt.hasTouch ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })).catch(() => {}); await p.waitForTimeout(250);
      const det = await p.$eval('#athTable tr.athdet', (t) => t.textContent).catch(() => '');
      ok(/13:30/.test(det) && m && det.includes(dIT(m.stats.refDate)), `${name} ${id}: dettaglio con il regolamento delle 13:30 e il massimo del ${m && dIT(m.stats.refDate)}`);
      await (opt.hasTouch ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })).catch(() => {}); await p.waitForTimeout(150);
    }
    ok(/Oro, argento, rame e petrolio con il future continuo/.test(await p.$eval('#athNote', (x) => x.textContent).catch(() => '')), `${name}: nota del pannello`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  const gd = await (await fetch(BASE + 'guida.html?x=' + Date.now())).text();
  ok(/GC=F, SI=F, HG=F, CL=F/.test(gd) && /13:30/.test(gd), 'guida: future e regolamento delle 13:30');
  const v = await (await fetch(BASE + 'version.json?x=' + Date.now())).json();
  ok(/^1\.(1[0-9])\./.test(v.version) && v.version !== '1.10.0', `version.json ${v.version}`);
  await b.close(); console.log(`${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
