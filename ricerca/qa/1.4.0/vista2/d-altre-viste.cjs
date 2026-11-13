// D. Le altre 7 viste con la barra delle 8 schede, contro la 1.3.5 (origin/main, servita su BASE135): righe della barra,
// altezza della barra, posizione del contenuto, scorrimento orizzontale, errori in console. Larghezze 1440, 1280, 820, 768, 390, 360.
const fs = require('fs');
const { chromium, SHOTS, openPage } = require('./lib.cjs');
const B140 = process.env.BASE || 'http://127.0.0.1:8794/', B135 = process.env.BASE135 || 'http://127.0.0.1:8795/';
const out = { problemi: [], controlli: 0, misure: [] };
const bad = (m) => { out.problemi.push(m); console.log('PROBLEMA', m); };
const ok = (c, m) => { out.controlli++; if (!c) bad(m); return c; };
(async () => {
  const browser = await chromium.launch();
  for (const w of [1440, 1280, 820, 768, 390, 360]) for (const theme of ['light', 'dark']) {
    const touch = w < 900, h = w < 600 ? 800 : 1000;
    for (const v of ['mon', 'rrg', 'btm', 'XLK', 'alr', 'idx', 'tit-XLK', 'emg']) {
      const res = {};
      for (const [ver, url] of [['1.4.0', B140], ['1.3.5', B135]]) {
        if (ver === '1.3.5' && v === 'emg') continue;
        const { ctx, page, errs } = await openPage(browser, { width: w, height: h, theme, touch, hash: '#' + v, url });
        await page.waitForTimeout(2500);
        res[ver] = await page.evaluate(() => {
          const bs = [...document.querySelectorAll('.fnkeys button')].filter((b) => !b.hidden);
          const nav = document.querySelector('.fnkeys').getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
          return { rows: new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top))).size, n: bs.length, navH: Math.round(nav.height), mainTop: Math.round(main.top), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
            sel: (document.querySelector('.fnkeys [aria-selected="true"]') || {}).textContent, clipped: bs.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent) };
        });
        res[ver].errs = errs;
        if (ver === '1.4.0' && (v === 'mon' || v === 'emg')) await page.screenshot({ path: `${SHOTS}d-${w}-${theme}-${v}-alto.png` });
        await ctx.close();
      }
      const a = res['1.4.0'], b = res['1.3.5'], tag = `${w} ${theme} #${v}`;
      out.misure.push([tag, a, b]);
      ok(a.sw <= a.cw, `${tag}: scorrimento orizzontale ${a.sw} > ${a.cw}${b && b.sw > b.cw ? ' (anche nella 1.3.5)' : ''}`);
      ok(a.rows === (w > 860 ? 1 : 2), `${tag}: barra su ${a.rows} righe`);
      ok(!a.clipped.length, `${tag}: schede tagliate ${a.clipped}`);
      ok(!a.errs.length, `${tag}: errori ${a.errs}`);
      if (b) ok(a.mainTop - b.mainTop <= 40, `${tag}: il contenuto scende di ${a.mainTop - b.mainTop}px rispetto alla 1.3.5 (barra ${b.navH}→${a.navH})`);
      if (b && a.mainTop - b.mainTop) out.misure.push([tag, `contenuto più in basso di ${a.mainTop - b.mainTop}px (barra ${b.navH}→${a.navH}px, righe ${b.rows}→${a.rows})`]);
    }
  }
  fs.writeFileSync(__dirname + '/esito-d-altre-viste.json', JSON.stringify(out, null, 1));
  console.log('controlli', out.controlli, 'problemi', out.problemi.length);
  for (const m of out.misure) if (typeof m[1] === 'string') console.log(m.join(' · '));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
