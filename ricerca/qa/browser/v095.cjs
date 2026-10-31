// Prova della 0.9.5: pannelli richiudibili (episodi, cali forti), grafico dei cali forti sulle stesse date del grafico
// principale, linea verticale condivisa, scala tagliata sui picchi. Uso come v091.cjs.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const OUT = process.env.OUT || '/tmp/v095/';
require('fs').mkdirSync(OUT, { recursive: true });
const res = [];
const ok = (name, cond, extra = '') => res.push(`${cond ? 'OK  ' : 'FAIL'} ${name} ${extra}`);
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  for (const light of [false, true]) for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    await ctx.addInitScript(({ light }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('sm.ixRange', '"MAX"'); localStorage.setItem('sm.range', '"MAX"'); } } catch {} }, { light });
    const page = await ctx.newPage(); const log = [];
    page.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); });
    page.on('pageerror', (e) => log.push('pageerror ' + e.message));
    const tag = `${light ? 'l' : 'd'}-${w}`;
    for (const [view, p, main, epi] of [['idx', 'ix', 'ixTs', 'ixEpiBox'], ['XLF', 'sec', 'ts', 'secEpiBox']]) {
      await page.goto(BASE + '#' + view); await page.waitForTimeout(view === 'idx' ? 3500 : 2000);
      if (view === 'idx') { await page.fill('#cmd', 'SPX'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(1500); }
      const closed = await page.evaluate(([e, c]) => [document.getElementById(e).open, document.getElementById(c).open], [epi, p + 'Cap']);
      ok(`${tag} ${view} episodi e cali forti chiusi di default`, !closed[0] && !closed[1], JSON.stringify(closed));
      await page.click(`#${epi} > summary`); await page.click(`#${p}Cap > summary`); await page.waitForTimeout(700);
      // stessa larghezza e stesse etichette dell'asse del tempo agli stessi pixel
      const ax = await page.evaluate(([m, c]) => {
        const lab = (id) => { const s = document.getElementById(id), r = s.getBoundingClientRect(), k = r.width / s.viewBox.baseVal.width;
          const H = s.viewBox.baseVal.height;
          return { w: r.width, left: r.left, t: [...s.querySelectorAll('text.axt')].filter((t) => +t.getAttribute('y') > H - 12 && /^\d{4}$|^[a-z]{3} \d\d$/.test(t.textContent)).map((t) => [t.textContent, Math.round(r.left + k * +t.getAttribute('x'))]) }; };
        return [lab(m), lab(c)];
      }, [main, p + 'CapSvg']);
      const same = JSON.stringify(ax[0].t) === JSON.stringify(ax[1].t);
      ok(`${tag} ${view} stessa larghezza`, Math.abs(ax[0].w - ax[1].w) < 1 && Math.abs(ax[0].left - ax[1].left) < 1, `${ax[0].w}/${ax[1].w}`);
      ok(`${tag} ${view} stesse date agli stessi pixel`, same && ax[0].t.length > 2, JSON.stringify(ax[1].t.slice(0, 4)));
      // linea condivisa: puntatore sul grafico principale → linea anche nei cali forti, e viceversa
      if (!touch) {
        const hov = async (src, dst) => {
          const r = await page.evaluate((id) => { document.getElementById(id).scrollIntoView({ block: 'center' }); const x = document.getElementById(id).getBoundingClientRect(); return [x.left + x.width * 0.6, x.top + 60]; }, src);
          await page.mouse.move(r[0], r[1]); await page.waitForTimeout(150);
          const v = await page.evaluate(([a, z]) => { const xa = document.querySelector(`#${a} line.xhair`), xz = document.querySelector(`#${z} line.xhair`);
            const px = (s, l) => { const e = document.getElementById(s), r = e.getBoundingClientRect(); return r.left + (r.width / e.viewBox.baseVal.width) * +l.getAttribute('x1'); };
            return { vis: xz.getAttribute('visibility'), dx: Math.abs(px(a, xa) - px(z, xz)) }; }, [src, dst]);
          await page.mouse.move(5, 5); await page.waitForTimeout(150);
          const gone = await page.evaluate((z) => document.querySelector(`#${z} line.xhair`).getAttribute('visibility'), dst);
          return { ...v, gone };
        };
        const a1 = await hov(main, p + 'CapSvg'), a2 = await hov(p + 'CapSvg', main);
        ok(`${tag} ${view} linea dal principale ai cali forti`, a1.vis === 'visible' && a1.dx < 1.5 && a1.gone === 'hidden', JSON.stringify(a1));
        ok(`${tag} ${view} linea dai cali forti al principale`, a2.vis === 'visible' && a2.dx < 1.5 && a2.gone === 'hidden', JSON.stringify(a2));
      }
      if (view === 'idx') {
        const cut = await page.evaluate(() => [...document.querySelectorAll('#ixCapSvg text.capcut')].map((t) => t.textContent));
        ok(`${tag} SPX MAX picchi tagliati scritti`, cut.length >= 1 && cut.every((t) => /^▲\d/.test(t)), cut.join(' | '));
      }
      await page.evaluate((id) => document.getElementById(id).scrollIntoView(), p + 'Cap');
      await page.screenshot({ path: `${OUT}${tag}-${view}.png`, fullPage: false });
      // stato ricordato dopo il ricaricamento
      await page.reload(); await page.waitForTimeout(view === 'idx' ? 3500 : 2000);
      const kept = await page.evaluate(([e, c]) => [document.getElementById(e).open, document.getElementById(c).open], [epi, p + 'Cap']);
      ok(`${tag} ${view} aperti dopo il ricaricamento`, kept[0] && kept[1], JSON.stringify(kept));
      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
      ok(`${tag} ${view} niente scroll orizzontale`, ov <= 0, ov);
      const t = await page.evaluate(() => document.querySelector('main, body').innerText);
      ok(`${tag} ${view} senza NaN/undefined`, !/NaN|undefined|Infinity/.test(t));
    }
    ok(`${tag} errori console`, log.length === 0, log.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(res.join('\n'));
  console.log(res.filter((r) => r.startsWith('FAIL')).length + ' FAIL su ' + res.length);
})();
