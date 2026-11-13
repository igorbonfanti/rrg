// 1.6.1: quanto si sposta sullo schermo l'elenco delle crisi quando compare o sparisce la scritta «nessun episodio sopra X»
// (che sta sopra lo scatter). Uso: BASE=http://127.0.0.1:8802/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/usabilita/salto.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const c = await b.newContext(opt); await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxCrises button'); await p.waitForTimeout(300);
    const y = (t) => p.locator('#vxCrises button', { hasText: t }).evaluate((e) => Math.round(e.getBoundingClientRect().top));
    await p.locator('#vxCrises button', { hasText: '2020 Covid' }).scrollIntoViewIfNeeded();
    const seq = [];
    for (const t of ['2020 Covid', '1990 Golfo', '1997 Asia', '2025 dazi', '2024 carry yen']) {
      const before = await y(t); await (opt.hasTouch ? p.locator('#vxCrises button', { hasText: t }).tap() : p.locator('#vxCrises button', { hasText: t }).click()); await p.waitForTimeout(150);
      const after = await y(t), none = await p.$eval('#vxEpsNone', (e) => !e.hidden);
      seq.push(`${t}: pulsante da y ${before} a ${after} (${after - before >= 0 ? '+' : ''}${after - before} px), scritta ${none ? 'sì' : 'no'}`);
    }
    console.log(n + '\n  ' + seq.join('\n  '));
    await c.close();
  }
  await b.close();
})();
