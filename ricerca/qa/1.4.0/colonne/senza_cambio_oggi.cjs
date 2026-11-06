// 1.4.0: senza il cambio di oggi «3 mesi locale» e «3 mesi in $» alla stessa seduta, con asterisco. Uso: NODE_PATH=$(npm root -g) node senza_cambio_oggi.cjs <emerging.json senza l ultimo giorno dei cambi>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem('sm.introSeen', 'true'); });
  await ctx.route('**/data/emerging.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(process.argv[2]) }));
  const p = await ctx.newPage(); await p.goto('http://127.0.0.1:8791/#emg'); await p.waitForSelector('#emTable tbody tr');
  const rows = await p.evaluate(() => [...document.querySelectorAll('#emTable tbody tr')].map((tr) => [tr.dataset.em, tr.querySelector('.c-m3').textContent, tr.querySelector('.c-m3u').textContent, tr.querySelector('.c-m3u').title.slice(-90)]));
  console.log(rows.map((r) => r.join(' | ')).join('\n'));
  console.log(await p.locator('#emKpis').innerText());
  await b.close();
})();
