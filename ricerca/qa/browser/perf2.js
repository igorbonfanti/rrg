const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 6e6 / 8, uploadThroughput: 1.5e6 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto('http://127.0.0.1:8790/#mon', { waitUntil: 'commit' });
  await p.waitForFunction(() => document.querySelectorAll('#boardTable tbody tr').length >= 11, null, { timeout: 60000, polling: 20 });
  const t = await p.evaluate(() => ({ ready: performance.now(), res: performance.getEntriesByType('resource').map((e) => [e.name.split('/').slice(-2).join('/'), Math.round(e.startTime), Math.round(e.responseEnd), e.encodedBodySize]) }));
  console.log('Monitor pronto a', Math.round(t.ready), 'ms'); for (const r of t.res) console.log(' ', r.join('  '));
  await b.close();
})();
