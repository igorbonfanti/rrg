// Larghezza della tabella degli episodi a 1280 e 1366 (deve stare senza scorrere su computer); confronto con la 1.6.2.
const { chromium } = require('playwright'); const path = require('path');
const URLS = (process.env.URLS || 'http://127.0.0.1:8808/').split(',');
(async () => {
  const b = await chromium.launch();
  for (const u of URLS) for (const w of [1280, 1366, 1440]) for (const X of [20, 40]) {
    const c = await b.newContext({ viewport: { width: w, height: 800 } });
    await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
    const p = await c.newPage(); await p.goto(u + '#vix'); await p.waitForSelector('#vxEps tbody tr'); await p.waitForTimeout(300);
    await p.locator(`#vxTable tr[data-x="${X}"]`).click(); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const sc = document.querySelector('#vxEps').closest('.tscroll'); const q = sc.getBoundingClientRect(); return { sw: sc.scrollWidth, cw: sc.clientWidth, fuori: [...document.querySelectorAll('#vxEps thead th')].filter((th) => th.getBoundingClientRect().right > q.right + 1).map((th) => th.textContent) }; });
    console.log(u, w, X, JSON.stringify(r));
    if (w === 1280 && X === 40 && u.includes('8808')) await p.locator('#vxEps').locator('xpath=ancestor::div[contains(@class,"panel")][1]').screenshot({ path: path.join(__dirname, 'shots', 'tabella-1280.png') });
    await c.close();
  }
  await b.close();
})();
