// 1.4.0: tabellone senza scorrimento interno tra 1101 e 1440 px; focus sul punto del quadrante dopo Invio; nota FRED prima del 2006
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  for (const w of [1101, 1200, 1250, 1279, 1280, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await ctx.addInitScript(() => localStorage.setItem('sm.introSeen', 'true'));
    const p = await ctx.newPage(); await p.goto(BASE + '#emg'); await p.waitForSelector('#emTable tbody tr');
    const r = await p.evaluate(() => { const s = document.querySelector('#emTable').closest('.tscroll'); return [s.scrollWidth, s.clientWidth]; });
    ok(r[0] <= r[1], `tabellone ${w}: ${r[0]}/${r[1]}`);
    await ctx.close();
  }
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(() => localStorage.setItem('sm.introSeen', 'true'));
  const p = await ctx.newPage(); await p.goto(BASE + '#emg-CSI300'); await p.waitForSelector('#emRS .emdot');
  await p.focus('#emRS [data-em="IBOV"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.dataset.em === 'IBOV' && location.hash === '#emg-IBOV'), 'Invio sul punto IBOV: indice scelto e focus sul punto');
  await p.click('#emRange button[data-range="MAX"]'); await p.waitForTimeout(400);
  const bb = await p.locator('#emChart').boundingBox(); await p.mouse.move(bb.x + bb.width * 0.08, bb.y + 60); await p.waitForTimeout(250);
  const tip = await p.locator('#emTip').innerText();
  ok(/inizia il 02\/01\/2006/.test(tip), `nota FRED prima del 2006: ${tip.replace(/\n/g, ' / ').slice(-90)}`);
  await b.close(); console.log(`${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
