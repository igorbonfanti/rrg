// Sonda: quali tabelle mostra ogni vista (per scrivere b1_app.cjs). Uso: NODE_PATH=$(npm root -g) BASE=http://127.0.0.1:8831/ node b0_probe.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8831/';
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'it-IT', timezoneId: 'Europe/Rome' });
  await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const page = await ctx.newPage();
  for (const v of ['mon', 'rrg', 'btm', 'idx']) {
    await page.goto(BASE + '#' + v); await page.waitForTimeout(3500);
    const t = await page.evaluate(() => [...document.querySelectorAll('table')].filter((x) => x.offsetParent).map((x) => ({ id: x.id, head: x.tHead ? x.tHead.innerText.replace(/\s+/g, ' ') : '', rows: [...x.tBodies[0]?.rows || []].slice(0, 2).map((r) => r.innerText.replace(/\s+/g, ' ')) })));
    const tabs = await page.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => (x.id || '') + ':' + x.innerText.trim()).slice(0, 60));
    console.log('VIEW', v, JSON.stringify(t, null, 1).slice(0, 2500)); console.log('buttons', tabs.join(' | '));
  }
  await b.close();
})();
