const { chromium } = require('playwright');
const BASE = process.env.BASE || "http://127.0.0.1:8780/";
const OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/v072/';
const res = [];
const ok = (name, cond, extra = '') => res.push(`${cond ? 'OK  ' : 'FAIL'} ${name} ${extra}`);
async function launch() { try { return await chromium.launch(); } catch { return chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } }
async function mk(b, { w = 1440, h = 900, light = false, touch = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
  await ctx.addInitScript(({ light }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, { light });
  const page = await ctx.newPage(); const log = [];
  page.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); });
  page.on('pageerror', (e) => log.push('pageerror ' + e.message));
  return { ctx, page, log };
}
const cmd = async (p, v) => { await p.fill('#cmd', v); await p.press('#cmd', 'Enter'); await p.waitForTimeout(500); };
(async () => {
  const b = await launch();
  // tutte le viste nei due temi e due larghezze
  for (const light of [false, true]) for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const { page, log, ctx } = await mk(b, { w, h, light, touch });
    for (const v of ['mon', 'rrg', 'btm', 'XLU', 'alr', 'idx', 'tit-XLE']) {
      await page.goto(BASE + '#' + v); await page.waitForTimeout(v === 'idx' || v.startsWith('tit') ? 2500 : 1200);
      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
      if (ov > 0) log.push(`overflow ${v} ${ov}`);
      await page.screenshot({ path: `${OUT}${light ? 'l' : 'd'}-${w}-${v}.png`, fullPage: false });
    }
    ok(`viste ${light ? 'chiaro' : 'scuro'} ${w}`, !log.length, log.slice(0, 3).join(' | '));
    await ctx.close();
  }
  const { page, log } = await mk(b);
  // #xlu minuscolo: Indietro torna alla vista di prima
  await page.goto(BASE + '#mon'); await page.waitForTimeout(1200);
  await page.evaluate(() => { location.hash = '#xlu'; }); await page.waitForTimeout(600);
  ok('#xlu → #XLU', (await page.evaluate(() => location.hash)) === '#XLU', await page.evaluate(() => location.hash));
  await page.goBack(); await page.waitForTimeout(600);
  ok('Indietro da #XLU', (await page.evaluate(() => location.hash)) === '#mon', await page.evaluate(() => location.hash));
  // vista 7 con il settore nell'indirizzo, scelta settore nella cronologia
  await page.goto(BASE + '#tit-XLE'); await page.waitForTimeout(2500);
  ok('#tit-XLE apre XLE', /XLE/.test(await page.textContent('#titBubbleTitle')));
  const rows = await page.$$('#titSpread g[class*="row"], #titSpread g');
  await page.evaluate(() => {
    const gs = [...document.querySelectorAll('#titSpread g')].filter((g) => /XLK/.test(g.textContent) && g.getBoundingClientRect().height < 40);
    gs[0] && gs[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  ok('clic XLK in vista 7 → #tit-XLK', (await page.evaluate(() => location.hash)) === '#tit-XLK', await page.evaluate(() => location.hash));
  await page.goBack(); await page.waitForTimeout(800);
  ok('Indietro → #tit-XLE', (await page.evaluate(() => location.hash)) === '#tit-XLE' && /XLE/.test(await page.textContent('#titBubbleTitle')), await page.evaluate(() => location.hash));
  // comandi
  await page.goto(BASE + '#mon'); await page.waitForTimeout(1200);
  await cmd(page, 'XLK TIT');
  ok('XLK TIT', (await page.evaluate(() => location.hash)) === '#tit-XLK', await page.evaluate(() => location.hash));
  await cmd(page, 'XLU SEC');
  ok('XLU SEC', (await page.evaluate(() => location.hash)) === '#XLU');
  await page.goto(BASE + '#rrg'); await page.waitForTimeout(1200);
  const g0 = await page.inputValue('#groupSel').catch(() => '?');
  await cmd(page, 'SPY');
  ok('SPY resta nei settori', (await page.inputValue('#groupSel').catch(() => '?')) === g0, `${g0} → ${await page.inputValue('#groupSel').catch(() => '?')}`);
  // Bottom Map: pallini fuori dal ritaglio, zona blu non coperta
  await page.goto(BASE + '#btm'); await page.waitForTimeout(1200);
  const clip = await page.evaluate(() => [...document.querySelectorAll('#v-btm svg circle.head')].filter((c) => c.closest('[clip-path]')).length + '/' + document.querySelectorAll('#v-btm svg circle.head').length);
  ok('pallini fuori dal clip', clip.startsWith('0/'), clip);
  const over = await page.evaluate(() => {
    const svg = document.querySelector('#v-btm .bz-setup').ownerSVGElement;
    const s = svg.querySelector('.bz-setup').getBBox();
    return [...svg.querySelectorAll('.bz-watch')].filter((r) => { const w = r.getBBox(); return w.x < s.x + s.width - 0.5 && w.x + w.width > s.x + 0.5 && w.y < s.y + s.height - 0.5 && w.y + w.height > s.y + 0.5; }).length;
  });
  ok('zona blu senza giallo sopra', over === 0, over);
  // legenda: icona dell'avvicinamento visibile
  await page.goto(BASE + '#mon'); await page.waitForTimeout(1200);
  const iw = await page.evaluate(() => [...document.querySelectorAll('.states .st-appr svg')].map((s) => s.getBoundingClientRect().width));
  ok('icona Avvicinamento in legenda', iw.length && iw.every((x) => x >= 10), JSON.stringify(iw));
  // livello blu spento ai limiti
  await page.goto(BASE + '#XLU'); await page.waitForTimeout(1200);
  for (let i = 0; i < 70 && !(await page.isDisabled('#blueMinus')); i++) await page.click('#blueMinus');
  ok('meno spento a 0%', (await page.textContent('#blueVal')) === '0%' && (await page.isDisabled('#blueMinus')));
  await page.evaluate(() => localStorage.removeItem('sm.blue'));
  ok('nessun errore console', !log.length, log.join(' | '));
  // tocco su una riga della vista 7: il riquadro resta aperto
  const t = await mk(b, { w: 390, h: 844, touch: true });
  await t.page.goto(BASE + '#tit-XLE'); await t.page.waitForTimeout(2500);
  const box = await t.page.evaluate(() => { const g = [...document.querySelectorAll('#titSpread g')].find((g) => /XLK/.test(g.textContent) && g.getBoundingClientRect().height < 40); const r = g.querySelector('circle').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await t.page.touchscreen.tap(box.x, box.y); await t.page.waitForTimeout(600);
  ok('tocco: riquadro aperto e settore scelto', !(await t.page.isHidden('#titSpreadTip')) && /XLK/.test(await t.page.textContent('#titBubbleTitle')));
  await t.page.screenshot({ path: OUT + 'tap-spread.png' });
  console.log(res.join('\n'));
  await b.close();
})();
