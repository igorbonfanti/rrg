// Tempi di apertura della vista VIX: telefono simulato (CPU 4× più lenta, rete 4G lenta: 1,6 Mb/s, 150 ms), a freddo e a caldo.
// Uso: NODE_PATH=$(npm root -g) node u150-tempi.cjs [base]
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8798/';
(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const [name, cpu, net] of [['computer', 1, null], ['telefono 4G lento, CPU 4×', 4, { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 }]]) {
    for (let rep = 0; rep < 3; rep++) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      await ctx.addInitScript(() => localStorage.setItem('sm.introSeen', 'true'));
      const p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p);
      if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      if (net) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, ...net }); }
      await p.goto(BASE); await p.waitForFunction(() => document.getElementById('loadingNote').hidden, null, { timeout: 120000 });
      await p.waitForTimeout(1500);
      let t = Date.now();
      await p.tap('#tab-vix');
      await p.waitForFunction(() => !document.getElementById('vxBody').hidden, null, { timeout: 120000 });
      const cold = Date.now() - t;
      await p.tap('#tab-mon'); await p.waitForTimeout(300);
      t = Date.now();
      await p.tap('#tab-vix'); await p.waitForFunction(() => !document.getElementById('v-vix').hidden && !document.getElementById('vxBody').hidden);
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      const warm = Date.now() - t;
      t = Date.now();
      await p.tap('#vxIx button[data-ix="NDX"]'); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      const sw = Date.now() - t;
      out.push({ name, rep, primaAperturaMs: cold, secondaAperturaMs: warm, cambioIndiceMs: sw });
      await ctx.close();
    }
  }
  console.table(out);
  await b.close();
})();
