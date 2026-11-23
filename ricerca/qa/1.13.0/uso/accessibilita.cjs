// Controllo 5: aria, contrasto del bottone e del riquadro nei due temi, area di tocco al telefono; prima apertura (intro).
const fs = require('fs'), path = require('path');
const { chromium, NEW, OLD, VIEWS, ctx, watch, go, pop } = require('./lib.cjs');
const SH = path.join(__dirname, 'shots', 'a11y'); fs.mkdirSync(SH, { recursive: true });
const lines = []; const log = (m) => { lines.push(m); console.log(m); };
const CONTRAST = () => {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let x = el; x; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  window.__cr = (fg, bg) => { const a = lum(fg), b = lum(bg); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
  window.__parse = parse; window.__bgOf = bgOf;
};
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const c = await ctx(b, 1440, theme); const p = await c.newPage(); await c.addInitScript(CONTRAST);
    await p.goto(NEW + '#vix'); await p.waitForSelector('#vxTable tbody tr', { timeout: 40000 }); await p.waitForTimeout(600);
    await p.evaluate(CONTRAST);
    const bt = p.locator('button[data-src="vxTabHelp"]');
    const rest = await bt.evaluate((el) => { const s = getComputedStyle(el); const bg = __bgOf(el.parentElement); return { fg: s.color, border: s.borderColor, bg: `rgb(${bg.r},${bg.g},${bg.b})`, text: __cr(__parse(s.color), bg), ring: __cr(__parse(s.borderColor), bg) }; });
    log(`${theme} bottone a riposo: testo ${rest.fg} su ${rest.bg} → ${rest.text}:1; bordo ${rest.ring}:1 (minimo 3:1 per un controllo, WCAG 1.4.11)`);
    await bt.click(); await p.waitForTimeout(200);
    const on = await bt.evaluate((el) => { const s = getComputedStyle(el); const bg = __parse(s.backgroundColor); return { fg: s.color, bg: s.backgroundColor, text: __cr(__parse(s.color), bg) }; });
    log(`${theme} bottone aperto: ${on.fg} su ${on.bg} → ${on.text}:1`);
    const pp = await p.evaluate(() => { const x = document.getElementById('infopop'); const s = getComputedStyle(x); const bg = __parse(s.backgroundColor); const a = x.querySelector('.infopop-g a'); const pageBg = __bgOf(document.querySelector('#v-vix .panel'));
      return { fg: s.color, bg: s.backgroundColor, text: __cr(__parse(s.color), bg), link: a ? __cr(__parse(getComputedStyle(a).color), bg) : null, border: __cr(__parse(s.borderColor), pageBg), size: s.fontSize, lh: s.lineHeight, b: x.querySelector('b') ? __cr(__parse(getComputedStyle(x.querySelector('b')).color), bg) : null }; });
    log(`${theme} riquadro: testo ${pp.fg} su ${pp.bg} → ${pp.text}:1, grassetto ${pp.b}:1, link «Nella guida» ${pp.link}:1, bordo sul pannello ${pp.border}:1, corpo ${pp.size}/${pp.lh}`);
    // attributi aria in tutte le viste
    await p.keyboard.press('Escape');
    let bad = [];
    for (const [h, vid, w] of VIEWS) { await go(p, NEW, h, w); bad.push(...await p.evaluate(() => [...document.querySelectorAll('button.info')].filter((x) => !x.getAttribute('aria-label') || !['true', 'false'].includes(x.getAttribute('aria-expanded')) || x.getAttribute('type') !== 'button').map((x) => x.outerHTML.slice(0, 80)))); }
    log(`${theme} bottoni senza aria-label, aria-expanded o type=button: ${bad.length}`);
    const roles = await p.evaluate(() => { const x = document.getElementById('infopop'); return { pop: x.getAttribute('role'), body: x.firstElementChild.getAttribute('role'), live: x.firstElementChild.getAttribute('aria-live'), controls: document.querySelector('button.info').getAttribute('aria-controls') }; });
    log(`${theme} riquadro: role ${roles.pop}, corpo role ${roles.body}; aria-controls sui bottoni ${roles.controls}`);
    await p.goto(NEW + '#vix'); await p.waitForSelector('#vxTable tbody tr'); await p.waitForTimeout(500);
    await p.locator('button[data-src="vxTabHelp"]').scrollIntoViewIfNeeded(); await p.locator('button[data-src="vxTabHelp"]').focus(); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
    await p.screenshot({ path: path.join(SH, `focus-${theme}.png`), clip: { x: 0, y: (await p.locator('button[data-src="vxTabHelp"]').boundingBox()).y - 30, width: 700, height: 70 } });
    await c.close();
  }
  // area di tocco al telefono: centro ±10/±14/±16 px colpisce il «i»? altri controlli toccati dentro l'area?
  for (const w of [390, 360]) {
    const c = await ctx(b, w, 'light'); const p = await c.newPage();
    await p.goto(NEW + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 });
    const res = [];
    for (const [h, vid, wt] of VIEWS) {
      await go(p, NEW, h, wt);
      if (h === 'XLK' || h === 'idx') await p.evaluate((vid) => document.querySelectorAll(`#${vid} details`).forEach((d) => { d.open = true; }), vid);
      const sc = h === 'rrg' ? `#${vid} button.info, #filters button.info` : `#${vid} button.info`;
      const n = await p.locator(sc).count();
      for (let i = 0; i < n; i++) {
        const bt = p.locator(sc).nth(i); if (!(await bt.isVisible())) continue;
        await bt.scrollIntoViewIfNeeded();
        const r = await bt.evaluate((el) => {
          const a = el.getBoundingClientRect(), cx = a.left + a.width / 2, cy = a.top + a.height / 2;
          const reach = {}; for (const d of [10, 14, 16, 20]) reach[d] = [[d, 0], [-d, 0], [0, d], [0, -d]].filter(([dx, dy]) => { const e = document.elementFromPoint(cx + dx, cy + dy); return e && e.closest('button.info') === el; }).length;
          // controlli vicini: distanza dal bordo del «i» al bordo del controllo più vicino
          let near = null;
          for (const x of document.querySelectorAll('a[href], button, select, input, summary, tr[tabindex], [role=button]')) {
            if (x === el || x.contains(el) || el.contains(x) || !x.getClientRects().length) continue;
            const q = x.getBoundingClientRect(); const dx = Math.max(0, q.left - a.right, a.left - q.right), dy = Math.max(0, q.top - a.bottom, a.top - q.bottom); const d = Math.hypot(dx, dy);
            if (!near || d < near.d) near = { d: Math.round(d), what: (x.tagName + ' ' + (x.textContent || '').trim().slice(0, 20)) };
          }
          return { size: `${Math.round(a.width)}×${Math.round(a.height)}`, reach, near, label: el.getAttribute('aria-label') };
        });
        res.push(r);
        log(`${w} #${h} «${r.label}»: disegno ${r.size}, punti colpiti a ±10/14/16/20 px: ${r.reach[10]}/${r.reach[14]}/${r.reach[16]}/${r.reach[20]} su 4; controllo più vicino ${r.near ? r.near.what + ' a ' + r.near.d + ' px' : '—'}`);
      }
    }
    await c.close();
  }
  // prima apertura: senza sm.introSeen, la presentazione parla dei «i»?
  for (const [ver, base] of [['1.13.0', NEW], ['1.12.0', OLD]]) for (const w of [1440, 390]) {
    const c = await b.newContext(w === 1440 ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await c.addInitScript(() => { try { localStorage.setItem('antigravity-theme', 'dark'); } catch {} });
    const p = await c.newPage(); await p.goto(base + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 }); await p.waitForTimeout(800);
    const intro = await p.evaluate(() => { const x = document.getElementById('intro'); return x && !x.hidden ? x.innerText : '(nessuna presentazione)'; });
    log(`${ver} ${w} presentazione alla prima apertura: «${intro.replace(/\s+/g, ' ').slice(0, 600)}»`);
    await p.screenshot({ path: path.join(SH, `prima-apertura-${ver}-${w}.png`) });
    await c.close();
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, 'accessibilita.txt'), lines.join('\n') + '\n');
})();
