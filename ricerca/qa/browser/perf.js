// tempi di caricamento su telefono simulato: node perf.js <porta> [ripetizioni]
const { chromium } = require('playwright');
const port = process.argv[2] || 8790, reps = +(process.argv[3] || 3);
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)];
(async () => {
  const b = await chromium.launch();
  const out = { mon: [], rrg: [], idx: [], tit: [], bytes: [], cpuInit: [] };
  for (let r = 0; r < reps; r++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('sm.group', JSON.stringify('1 · Asset class')); } catch {} });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 6e6 / 8, uploadThroughput: 1.5e6 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let bytes = 0; cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
    const t0 = Date.now();
    await p.goto(`http://127.0.0.1:${port}/#mon`, { waitUntil: 'commit' });
    await p.waitForFunction(() => document.querySelectorAll('#boardTable tbody tr').length >= 11, null, { timeout: 60000, polling: 50 });
    out.mon.push(Date.now() - t0);
    // rotazione: grafico disegnato con le etichette dell'universo salvato
    const t1 = Date.now();
    await p.click('#tab-rrg');
    await p.waitForFunction(() => document.querySelectorAll('#rrg text').length > 20 && document.querySelectorAll('#rotTable tbody tr').length > 3, null, { timeout: 60000, polling: 50 });
    out.rrg.push(Date.now() - t0);
    await p.click('#tab-idx');
    await p.waitForFunction(() => document.querySelectorAll('#ixTable tbody tr').length >= 5, null, { timeout: 90000, polling: 50 });
    out.idx.push(Date.now() - t1);
    const t2 = Date.now();
    await p.click('#tab-tit');
    await p.waitForFunction(() => document.querySelectorAll('#titSpread g').length > 5, null, { timeout: 90000, polling: 50 });
    out.tit.push(Date.now() - t2);
    out.bytes.push(bytes);
    await ctx.close();
  }
  console.log(`Monitor pronto ${med(out.mon)} ms · Rotazione pronta (dall'avvio) ${med(out.rrg)} ms · Indici dopo il clic ${med(out.idx)} ms · Titoli dopo il clic ${med(out.tit)} ms · byte ${Math.round(med(out.bytes) / 1024)} KB`);
  await b.close();
})();
