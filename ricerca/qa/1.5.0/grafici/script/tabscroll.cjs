// Le tabelle della vista 8 VIX entrano nel loro riquadro o scorrono? (larghezza contenuto contro larghezza visibile)
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8798/';
(async () => {
  const b = await chromium.launch();
  for (const w of [1920, 1800, 1700, 1600, 1500, 1440, 1280, 1024, 820, 390, 360]) {
    const mob = w < 600;
    const c = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxTable tbody tr'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ['vxTable', 'vxEps'].map((id) => { const s = document.getElementById(id).closest('.tscroll'); const cols = getComputedStyle(document.querySelector('.vix-grid')).gridTemplateColumns; return `${id} ${s.scrollWidth}/${s.clientWidth}${s.scrollWidth > s.clientWidth + 1 ? ' SCORRE' : ''} [griglia ${cols}]`; }));
    console.log(w, r.join(' ; '));
    await c.close();
  }
  await b.close();
})();
