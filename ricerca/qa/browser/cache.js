const { chromium } = require('playwright'); const fs = require('fs');
const P = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/perf';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const p = await ctx.newPage();
  const state = async () => p.evaluate(() => ({ panel: !document.querySelector('#titHistPanel').hidden, paths: document.querySelectorAll('#titHist path').length, note: document.querySelector('#titHistNote').textContent.slice(0, 70) }));
  await p.goto('http://127.0.0.1:8795/#tit-XLK'); await p.waitForTimeout(2500);
  console.log('1. file vecchio:', JSON.stringify(await state()));
  fs.writeFileSync(P + '/which.txt', 'sm_new.json');
  await p.reload(); await p.waitForTimeout(2500);
  console.log('2. dopo la pubblicazione, ricarica normale:', JSON.stringify(await state()));
  await b.close();
})();
