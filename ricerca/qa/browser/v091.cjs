// Prova della 0.9.1: tutte le viste senza errori né NaN, più i punti corretti dopo l'audit della 0.9.0.
// Uso: node ricerca/qa/server/gzserve.mjs . 8791 &  poi  BASE=http://127.0.0.1:8791/ node ricerca/qa/browser/v091.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const OUT = process.env.OUT || '/tmp/v091/';
require('fs').mkdirSync(OUT, { recursive: true });
const res = [];
const ok = (name, cond, extra = '') => res.push(`${cond ? 'OK  ' : 'FAIL'} ${name} ${extra}`);
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  for (const light of [false, true]) for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    await ctx.addInitScript(({ light }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, { light });
    const page = await ctx.newPage(); const log = [];
    page.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); });
    page.on('pageerror', (e) => log.push('pageerror ' + e.message));
    const tag = `${light ? 'l' : 'd'}-${w}`;
    const text = () => page.evaluate(() => document.querySelector('main, body').innerText);
    for (const v of ['mon', 'rrg', 'btm', 'XLU', 'alr', 'idx', 'tit-XLK']) {
      await page.goto(BASE + '#' + v); await page.waitForTimeout(v === 'idx' ? 3500 : 1800);
      const t = await text();
      ok(`${tag} ${v} senza NaN/undefined`, !/NaN|undefined|Infinity/.test(t));
      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
      ok(`${tag} ${v} niente scroll orizzontale`, ov <= 0, ov);
      await page.screenshot({ path: `${OUT}${tag}-${v}.png`, fullPage: false });
    }
    // versione
    ok(`${tag} versione ${process.env.VER || '0.9.2'}`, new RegExp((process.env.VER || '0.9.2').replace(/\./g, '\\.')).test(await page.evaluate(() => document.getElementById('verTag').textContent)));
    // asterisco nella tabella Prezzi: universo 6 · Indici, CSNDX YTD
    await page.goto(BASE + '#rrg'); await page.waitForTimeout(1500);
    await page.evaluate(() => { const s = document.getElementById('groupSel'); s.value = '6 · Indici'; s.dispatchEvent(new Event('change')); });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Prezzi$/.test(x.textContent.trim())); b && b.click(); });
    await page.waitForTimeout(600);
    const cp = await page.evaluate(() => ({ n: document.querySelectorAll('#monTable sup.cp').length, note: document.getElementById('pxCopied').textContent }));
    ok(`${tag} asterisco prezzi ricopiati`, cp.n >= 1 && /CSNDX/.test(cp.note), JSON.stringify(cp).slice(0, 220));
    // comandi DAX e SMI: dettaglio dell'indice
    for (const c of ['DAX', 'SMI', 'NDX']) {
      await page.fill('#cmd', c); await page.press('#cmd', 'Enter'); await page.waitForTimeout(1500);
      const hidden = await page.evaluate(() => document.getElementById('v-idx').hidden);
      const title = await page.evaluate(() => (document.getElementById('ixTitle') || {}).textContent || '');
      ok(`${tag} comando ${c} apre il dettaglio`, !hidden, title.slice(0, 60));
    }
    // crisi passate: chip premuto e settimana che contiene il minimo
    await page.goto(BASE + '#btm'); await page.waitForTimeout(1500);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#bmJumps button')].find((x) => x.textContent === 'nov 2008'); b && b.click(); });
    await page.waitForTimeout(600);
    const j = await page.evaluate(() => ({ d: document.getElementById('bmDateVal').textContent, p: [...document.querySelectorAll('#bmJumps button')].filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.textContent) }));
    ok(`${tag} nov 2008`, /21\/11\/2008/.test(j.d) && j.p.includes('nov 2008'), JSON.stringify(j));
    // cali forti: percentile 0 con 0 cali non è più alto; cella non «…»
    await page.goto(BASE + '#idx'); await page.waitForTimeout(3500);
    const cells = await page.evaluate(() => [...document.querySelectorAll('#ixTable tbody tr')].map((r) => r.children[6] && r.children[6].textContent.trim()));
    ok(`${tag} cali forti nel tabellone`, cells.length && cells.every((c) => c && c !== '…'), cells.join('|'));
    // storia della divergenza: punti di venerdì (o prima di una festa)
    ok(`${tag} errori console`, log.length === 0, log.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(res.join('\n'));
  console.log(res.filter((r) => r.startsWith('FAIL')).length + ' FAIL su ' + res.length);
})();
