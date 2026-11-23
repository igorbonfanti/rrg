// Controllo 3: pagina a 1440, 1280, 1024, 768, 390, 360 px, tema scuro e chiaro, tutte le viste:
// scorrimento orizzontale, elementi fuori dallo schermo, testi tagliati, «i» sovrapposti o tagliati, console.
// Immagini a pagina intera in shots/pagina/. Esito in pagina.txt.
const fs = require('fs'), path = require('path');
const { chromium, NEW, VIEWS, ctx, watch, go } = require('./lib.cjs');
const SH = path.join(__dirname, 'shots', 'pagina'); fs.mkdirSync(SH, { recursive: true });
const lines = []; let fail = 0, okn = 0;
const ok = (c, m) => { if (c) okn++; else { fail++; lines.push('FAIL ' + m); console.log('FAIL ' + m); } };
const note = (m) => { lines.push('INFO ' + m); };
const FULL = new Set(['1440-scuro', '1440-chiaro', '390-chiaro', '390-scuro', '1024-chiaro', '768-scuro', '360-chiaro', '1280-scuro']);
(async () => {
  const b = await chromium.launch();
  for (const w of (process.env.ONLY || '1440,1280,1024,768,390,360').split(',').map(Number)) for (const theme of ['dark', 'light']) {
    const tag = `${w}-${theme === 'dark' ? 'scuro' : 'chiaro'}`;
    const c = await ctx(b, w, theme); const p = await c.newPage(); const errs = watch(p);
    await p.goto(NEW + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 });
    for (const [h, vid, wait] of VIEWS) {
      await go(p, NEW, h, wait); await p.waitForTimeout(500);
      const r = await p.evaluate((vid) => {
        const vw = document.documentElement.clientWidth, out = { sw: document.documentElement.scrollWidth, vw, off: [], cut: [], iover: [], iclip: [] };
        const scope = [document.getElementById(vid), document.querySelector('header'), document.querySelector('nav'), document.getElementById('filters'), document.querySelector('footer')].filter(Boolean);
        const inScroller = (e) => { for (let x = e.parentElement; x; x = x.parentElement) { const s = getComputedStyle(x); if (/(auto|scroll)/.test(s.overflowX)) return true; } return false; };
        const visible = (e) => { const s = getComputedStyle(e); return e.getClientRects().length && s.visibility !== 'hidden' && s.display !== 'none'; };
        const desc = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) + ' «' + (e.textContent || '').trim().slice(0, 30) + '»';
        for (const root of scope) for (const e of root.querySelectorAll('*')) {
          if (!visible(e) || e.closest('svg') && e.tagName !== 'svg') continue;
          const rc = e.getBoundingClientRect(); if (!rc.width) continue;
          if ((rc.right > vw + 1 || rc.left < -1) && !inScroller(e)) out.off.push(desc(e) + ` ${Math.round(rc.left)}–${Math.round(rc.right)}`);
          const s = getComputedStyle(e);
          if (e.children.length === 0 && e.textContent.trim() && /(hidden|clip)/.test(s.overflowX + s.overflow) && e.scrollWidth > e.clientWidth + 1 && !inScroller(e)) out.cut.push(desc(e) + ` ${e.scrollWidth}>${e.clientWidth}${s.textOverflow === 'ellipsis' ? ' (…)' : ''}`);
        }
        // «i»: sovrapposto ad altro testo o ad altri controlli della stessa riga? tagliato dal contenitore?
        for (const bt of document.querySelectorAll(`#${vid} button.info, #filters button.info`)) {
          if (!visible(bt)) continue;
          const a = bt.getBoundingClientRect();
          const row = bt.parentElement;
          const others = [];
          const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
          for (let n; (n = walker.nextNode());) { if (bt.contains(n) || !n.textContent.trim()) continue; const pe = n.parentElement; if (!visible(pe)) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) others.push([q, pe]); }
          for (const x of row.querySelectorAll('button, select, input, a, svg')) if (x !== bt && !bt.contains(x) && visible(x)) others.push([x.getBoundingClientRect(), x]);
          for (const [q, el] of others) {
            const ix = Math.min(a.right, q.right) - Math.max(a.left, q.left), iy = Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top);
            if (ix > 1 && iy > 1) out.iover.push(`${bt.getAttribute('aria-label')} su ${desc(el)} (${Math.round(ix)}×${Math.round(iy)})`);
          }
          for (let x = bt.parentElement; x && x !== document.body; x = x.parentElement) {
            const s = getComputedStyle(x); if (!/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) continue;
            const r = x.getBoundingClientRect(); if (a.left < r.left - 0.5 || a.right > r.right + 0.5 || a.top < r.top - 0.5 || a.bottom > r.bottom + 0.5) out.iclip.push(`${bt.getAttribute('aria-label')} tagliato da ${desc(x)}`);
            break;
          }
          // il «i» sta sulla stessa riga del suo titolo? (non va a capo da solo)
          const prev = bt.previousElementSibling;
          if (prev && /^H[23]$|h2/.test(prev.tagName + ' ' + prev.className)) { const pr = prev.getBoundingClientRect(); if (a.top > pr.bottom - 2) out.iover.push(`${bt.getAttribute('aria-label')}: va a capo sotto il titolo`); }
        }
        return out;
      }, vid);
      ok(r.sw <= r.vw, `${tag} #${h}: nessuno scorrimento orizzontale (${r.sw}/${r.vw})`);
      ok(!r.off.length, `${tag} #${h}: elementi fuori dallo schermo: ${r.off.slice(0, 6).join(' | ')}`);
      if (r.cut.length) note(`${tag} #${h}: testi tagliati dal contenitore: ${r.cut.slice(0, 8).join(' | ')}`);
      ok(!r.iover.length, `${tag} #${h}: «i» sovrapposti: ${r.iover.join(' | ')}`);
      ok(!r.iclip.length, `${tag} #${h}: «i» tagliati: ${r.iclip.join(' | ')}`);
      if (FULL.has(tag)) await p.screenshot({ path: path.join(SH, `${h}-${tag}.png`), fullPage: true });
    }
    ok(!errs.length, `${tag}: console senza errori ${errs.join(' | ').slice(0, 300)}`);
    await c.close();
  }
  await b.close();
  lines.push(`${okn} ok, ${fail} falliti`); console.log(`${okn} ok, ${fail} falliti`);
  fs.writeFileSync(path.join(__dirname, process.env.OUT || 'pagina.txt'), lines.join('\n') + '\n');
})();
