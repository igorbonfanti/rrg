// Ricontrollo 1.10.0: con data/vix.json mancante, il pannello dei massimi c'è ancora? (rilievo M9, ultima parte)
// Uso: BASE=http://127.0.0.1:8851/ NODE_PATH=/opt/node-tools/node_modules node ricerca/qa/1.10.0/ricontrollo/senza-vix.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { localStorage.setItem('sm.introSeen', 'true'); });
  await c.route('**/data/vix.json*', (r) => r.fulfill({ status: 404, body: 'no' }));
  const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto((process.env.BASE || 'http://127.0.0.1:8851/') + '#vix'); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => ({ rows: document.querySelectorAll('#athTable tr.athr').length, visible: !!(document.querySelector('#athTable') || {}).offsetParent, body: (document.querySelector('#vxBody') || {}).hidden, msg: [...document.querySelectorAll('#v-vix .note, #v-vix .miss, #v-vix p')].filter((x) => x.offsetParent).map((x) => x.textContent.slice(0, 90)).slice(0, 3) }));
  console.log(JSON.stringify(r), errs.join(' | '));
  await b.close();
})();
