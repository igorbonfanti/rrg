const { chromium } = require('playwright');
const BASE = process.env.BASE || "http://127.0.0.1:8780/";
const OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/v080/';
require('fs').mkdirSync(OUT, { recursive: true });
const res = [];
const ok = (name, cond, extra = '') => res.push(`${cond ? 'OK  ' : 'FAIL'} ${name} ${extra}`);
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  for (const light of [false, true]) for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    // visita precedente con i dati di qualche giorno fa: XLU era in zona blu, XLRE normale con breadth 25
    await ctx.addInitScript(({ light }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true');
      localStorage.setItem('sm.visit', JSON.stringify({ cur: { date: '2026-10-09', blue: {}, s: { XLU: ['setup', 9], XLRE: ['normal', 25], XLK: ['normal', 60] } }, prev: null })); } } catch {} }, { light });
    const page = await ctx.newPage(); const log = [];
    page.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); });
    page.on('pageerror', (e) => log.push('pageerror ' + e.message));
    const tag = `${light ? 'l' : 'd'}-${w}`;
    await page.goto(BASE + '#mon'); await page.waitForTimeout(1500);
    const chg = await page.textContent('#changes').catch(() => '');
    ok(`${tag} striscia cambi`, /09\/10/.test(chg) && /XLU/.test(chg), chg.slice(0, 160));
    await page.screenshot({ path: `${OUT}${tag}-mon.png`, fullPage: true });
    // ricarica: la striscia resta (stesso giorno di dati)
    await page.reload(); await page.waitForTimeout(1500);
    ok(`${tag} striscia dopo ricarica`, /09\/10/.test(await page.textContent('#changes')));
    const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
    ok(`${tag} niente scroll orizzontale`, ov <= 0, ov);
    if (w < 500) {
      const order = await page.evaluate(() => { const a = document.querySelector('.watch-panel').getBoundingClientRect().top, t = document.querySelector('#boardTable').getBoundingClientRect().top; return a < t; });
      ok(`${tag} da osservare prima della tabella`, order);
      const tw = await page.evaluate(() => document.querySelector('#boardTable').scrollWidth - document.querySelector('#boardTable').parentElement.clientWidth);
      ok(`${tag} schede senza scorrimento laterale`, tw <= 1, tw);
    }
    await page.goto(BASE + '#XLRE'); await page.waitForTimeout(1200);
    const ck = await page.textContent('#secCheck');
    ok(`${tag} checklist XLRE`, /zona blu|trigger/i.test(ck) && /✓|✗/.test(ck), ck.slice(0, 120));
    await page.screenshot({ path: `${OUT}${tag}-xlre.png`, fullPage: true });
    await page.goto(BASE + '#XLU'); await page.waitForTimeout(1200);
    ok(`${tag} checklist XLU (trigger)`, /Dopo il trigger/.test(await page.textContent('#secCheck')));
    await page.goto(BASE + '#idx'); await page.waitForTimeout(3000);
    await page.evaluate(() => { const r = document.querySelector('#ixTable tbody tr[data-sym], #ixTable tbody tr[data-k], #ixTable tbody tr'); r && r.click(); });
    await page.waitForTimeout(1200);
    ok(`${tag} checklist indici`, /✓|✗/.test(await page.textContent('#ixCheck').catch(() => '')));
    if (touch) {
      await page.goto(BASE + '#XLU'); await page.waitForTimeout(1200);
      const dt = await page.$('#secFacts dt[title]');
      if (dt) { await dt.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); const bb = await dt.boundingBox(); await page.touchscreen.tap(bb.x + 5, bb.y + 5); await page.waitForTimeout(300); }
      const tt = await page.evaluate(() => { const t = document.querySelector('.taptip'); return t ? (t.hidden ? 'nascosto' : t.textContent) : 'assente ' + matchMedia('(hover: none)').matches; });
      ok(`${tag} spiegazione al tocco`, dt && !/^(nascosto|assente)/.test(tt), tt.slice(0, 100));
      await page.screenshot({ path: `${OUT}${tag}-taptip.png` });
    }
    ok(`${tag} nessun errore`, !log.length, log.join(' | '));
    await ctx.close();
  }
  // primo accesso: nessuna striscia
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); await p.goto(BASE + '#mon'); await p.waitForTimeout(1500);
  ok('prima visita: niente striscia', await p.isHidden('#changes'));
  await p.goto(BASE + '#rrg'); await p.waitForTimeout(1500);
  const ax = await p.evaluate(() => [...document.querySelectorAll('#rrg text.axlabel')].map((t) => t.textContent).join(' | '));
  ok('assi con i nomi nuovi', /FORZA RELATIVA/.test(ax) && /MOMENTUM RELATIVO/.test(ax) && !/RS-/.test(await p.content()), ax);
  console.log(res.join('\n'));
  await b.close();
})();
