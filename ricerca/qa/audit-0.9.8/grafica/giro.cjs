// Audit grafico della 0.9.8: tutte le viste e la guida, 4 dimensioni × 2 temi, con le misure di misure.cjs.
// Uso: node ricerca/qa/server/gzserve.mjs . 8802 &  poi
//      NODE_PATH=$(npm root -g) BASE=http://127.0.0.1:8802/ OUT=/percorso/ node ricerca/qa/audit-0.9.8/grafica/giro.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const { __audit } = require('./misure.cjs');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
const OUT = process.env.OUT || '/tmp/a098/';
fs.mkdirSync(OUT + 'shots', { recursive: true });
const VPS = (process.env.VPS || '1440x900,820x1180,390x844t,360x740t').split(',');
const THEMES = (process.env.THEMES || 'dark,light').split(',');
const AUD = `(${__audit.toString()})`;
const results = {};
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  for (const vp of VPS) for (const theme of THEMES) {
    const [w, h] = vp.replace('t', '').split('x').map(Number), touch = vp.endsWith('t');
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1 });
    await ctx.addInitScript(({ theme }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', theme); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, { theme });
    const page = await ctx.newPage(); const log = [];
    page.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); });
    page.on('pageerror', (e) => log.push('pageerror ' + e.message));
    const tag = `${vp}-${theme}`;
    const shot = async (name, full = true) => { await page.screenshot({ path: `${OUT}shots/${tag}__${name}.jpg`, fullPage: full, type: 'jpeg', quality: 70 }); };
    const audit = async (name, root) => { results[`${tag}__${name}`] = await page.evaluate(`${AUD}(${JSON.stringify({ root })})`); };
    const views = [['mon'], ['rrg'], ['btm'], ['XLU', true], ['alr'], ['idx'], ['tit-XLK']];
    for (const [v, open] of views) {
      await page.goto(BASE + '#' + v); await page.waitForTimeout(v === 'idx' || v.startsWith('tit') ? 4000 : 2200);
      if (open) {
        for (const id of ['secEpiBox', 'secCap']) await page.evaluate((id) => { const d = document.getElementById(id); if (d && !d.open) d.querySelector('summary').click(); }, id);
        await page.waitForTimeout(900);
      }
      await audit(v); await shot(v);
    }
    // dettaglio di più indici, con i pannelli aperti
    await page.goto(BASE + '#idx'); await page.waitForTimeout(4000);
    for (const id of ['ixEpiBox', 'ixCap']) await page.evaluate((id) => { const d = document.getElementById(id); if (d && !d.open) d.querySelector('summary').click(); }, id);
    for (const k of ['SPX', 'DAX', 'N225', 'KOSPI200', 'TWN', 'FTSEMIB']) {
      await page.fill('#cmd', k); await page.press('#cmd', 'Enter'); await page.waitForTimeout(1800);
      await audit('idx-' + k, '#ixDetail + .grid-side');
      const el = await page.$('#ixDetail + .grid-side');
      await el.screenshot({ path: `${OUT}shots/${tag}__idx-${k}.jpg`, type: 'jpeg', quality: 70 });
    }
    // periodo MAX su SPX per le etichette ▲
    await page.fill('#cmd', 'SPX'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(1500);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#ixRange button')].find((x) => /MAX/i.test(x.textContent)); b && b.click(); });
    await page.waitForTimeout(1200);
    await audit('idx-SPX-MAX', '#ixDetail + .grid-side');
    await (await page.$('#ixDetail + .grid-side')).screenshot({ path: `${OUT}shots/${tag}__idx-SPX-MAX.jpg`, type: 'jpeg', quality: 70 });
    // guida
    await page.goto(BASE + 'guida.html'); await page.waitForTimeout(1500);
    await audit('guida'); await shot('guida');
    results[`${tag}__console`] = log;
    await ctx.close();
    console.log('fatto', tag);
  }
  await b.close();
  fs.writeFileSync(OUT + 'audit.json', JSON.stringify(results, null, 1));
})();
