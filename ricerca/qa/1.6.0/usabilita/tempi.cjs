// Tempi di apertura della vista VIX con rete e processore rallentati (telefono su 4G lento), 1.6.0 contro lo stesso codice
// con il data/vix.json della 1.5.0. Uso: BASE16=http://127.0.0.1:8795/ BASE15=<copia del sito con il file della 1.5.0> NODE_PATH=$(npm root -g) node tempi.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const runs = { };
  for (const [lab, base] of [['1.6.0', process.env.BASE16], ['file 1.5.0', process.env.BASE15]]) for (let k = 0; k < 3; k++) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage(); const cdp = await c.newCDPSession(p); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(base + '#mon'); await p.waitForTimeout(2500);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = Date.now(); await p.locator('#tab-vix').tap();
    await p.waitForSelector('#vxKpis .kpi', { timeout: 60000 }); const tk = Date.now() - t0;
    await p.waitForSelector('#vxChart path.vxvix', { timeout: 60000 }); const tc = Date.now() - t0;
    // cambio di periodo con il processore rallentato
    const t1 = Date.now(); await p.locator('#vxRange button[data-range="MAX"]').tap(); await p.waitForFunction(() => document.querySelector('#vxRange button[data-range="MAX"]').getAttribute('aria-pressed') === 'true'); const tm = Date.now() - t1;
    (runs[lab] = runs[lab] || []).push([tk, tc, tm]);
    console.log(lab, `riquadri ${tk} ms, grafico ${tc} ms, MAX ${tm} ms`, errs.length ? errs : '');
    await c.close();
  }
  for (const [lab, r] of Object.entries(runs)) console.log(lab, 'mediana grafico', r.map((x) => x[1]).sort((a, b) => a - b)[1], 'ms; mediana MAX', r.map((x) => x[2]).sort((a, b) => a - b)[1], 'ms');
  await b.close();
})();
