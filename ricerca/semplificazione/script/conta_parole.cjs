// Ricalcolo separato delle parole «di nota» visibili (p.note, testi .emread, legende, meta, riga delle fonti) nelle viste
// 5 Titoli e 8 VIX dell'app e del prototipo, più la vista 0 Massimi del prototipo: controllo indipendente di riepilogo.json.
// Uso: BASE=http://127.0.0.1:8871/ NODE_PATH=$(npm root -g) node ricerca/semplificazione/script/conta_parole.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8871/';
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
  const p = await c.newPage();
  const count = (id) => p.evaluate((id) => {
    const r = document.getElementById(id); const seen = new Set(); let n = 0;
    for (const el of r.querySelectorAll('p.note, .emread > p, .legend > span, .ph .meta, .vxmeta')) {
      if ([...seen].some((x) => x.contains(el))) continue;
      if (!(el.offsetParent || el.getClientRects().length)) continue;
      seen.add(el); n += (el.textContent.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%\/-]*/gu) || []).length;
    }
    return n;
  }, id);
  const out = {};
  for (const [name, url] of [['app', BASE + 'index.html'], ['prototipo', BASE + 'ricerca/semplificazione/prototipo/index.html']]) {
    await p.goto(url + '#tit-XLK'); await p.waitForSelector('#titPain tbody tr', { timeout: 30000 }); await p.waitForTimeout(1000);
    out[name + ' 5 Titoli'] = await count('v-tit');
    await p.evaluate(() => { location.hash = '#vix'; }); await p.waitForSelector('#vxTable tbody tr', { timeout: 30000 }); await p.waitForTimeout(1500);
    out[name + ' 8 VIX'] = await count('v-vix');
    if (name === 'prototipo') { await p.evaluate(() => window.protoShowAth()); await p.waitForTimeout(1500); out[name + ' 0 Massimi'] = await count('v-ath'); }
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
