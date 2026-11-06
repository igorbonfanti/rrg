// Accessibilità di base: ordine di tabulazione, focus visibile, nomi accessibili, aria-pressed, id duplicati
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const R = new L.Rec('s10_a11y_' + prof + '_' + (process.argv[3] || 'dark'));
(async () => {
  const b = await L.launch();
  const tag = prof;
  const { ctx, page, log } = await L.open(b, prof, { theme: process.argv[3] || 'dark' });
  const ev = (f, a) => page.evaluate(f, a);
  for (const v of ['mon', 'rrg', 'btm', 'XLU', 'alr', 'idx', 'tit']) {
    await L.goto(page, v, v === 'idx' || v === 'tit' ? 3500 : 1500);
    // id duplicati e nomi accessibili
    const a = await ev(() => {
      const ids = {}; document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
      const dup = Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k);
      const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]'); };
      const noName = [...document.querySelectorAll('button, a, input, select, [role=tab]')].filter(visible).filter((e) => {
        const n = (e.getAttribute('aria-label') || e.textContent || e.value || e.title || '').trim();
        const lab = e.id && document.querySelector(`label[for="${e.id}"]`);
        return !n && !lab && !e.closest('label');
      }).map((e) => e.outerHTML.slice(0, 80));
      const segNoPressed = [...document.querySelectorAll('.seg button, .chips button.chip, #ixPick button')].filter(visible).filter((e) => !e.hasAttribute('aria-pressed')).map((e) => e.textContent.trim() + '@' + (e.closest('[id]') || {}).id);
      const svgNoLabel = [...document.querySelectorAll('main svg[role=img]')].filter(visible).filter((s) => !s.getAttribute('aria-label')).map((s) => s.id);
      const rowsNoKey = [...document.querySelectorAll('main tr[tabindex], main .acard, main .r[tabindex]')].filter(visible).filter((e) => !e.onkeydown).length;
      const clickNoFocus = [...document.querySelectorAll('main tr[data-sym], main tr[data-ix], main .acard, main .dist .r')].filter(visible).filter((e) => e.tabIndex < 0).length;
      return { dup, noName, segNoPressed, svgNoLabel, rowsNoKey, clickNoFocus };
    });
    R.add('A1', 'accessibilità', `${tag} #${v}: id unici`, !a.dup.length, a.dup.join(','));
    R.add('A2', 'accessibilità', `${tag} #${v}: controlli con nome accessibile`, !a.noName.length, a.noName.join(' | '));
    R.add('A3', 'accessibilità', `${tag} #${v}: bottoni a scelta con aria-pressed`, !a.segNoPressed.length, a.segNoPressed.join(', '));
    R.add('A4', 'accessibilità', `${tag} #${v}: grafici con aria-label`, !a.svgNoLabel.length, a.svgNoLabel.join(','));
    R.add('A5', 'accessibilità', `${tag} #${v}: righe cliccabili raggiungibili e attivabili da tastiera`, !a.rowsNoKey && !a.clickNoFocus, JSON.stringify({ rowsNoKey: a.rowsNoKey, clickNoFocus: a.clickNoFocus }));
    // ordine di tabulazione e focus visibile
    await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.mouse.click(2, 2).catch(() => {});
    const order = [], invisible = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const f = await ev(() => {
        const e = document.activeElement; if (!e || e === document.body) return null;
        const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' || /focus/.test(e.className);
        return { d: (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.dataset.sym ? '[' + e.dataset.sym + ']' : e.dataset.view ? '[' + e.dataset.view + ']' : '')) + ' ' + (e.textContent || '').trim().slice(0, 14), ring, off: r.width === 0 || r.height === 0, y: Math.round(r.top + scrollY) };
      });
      if (!f) break;
      order.push(f.d);
      if (!f.ring || f.off) invisible.push(f.d + (f.off ? ' (fuori vista)' : ' (senza anello)'));
    }
    R.add('A6', 'accessibilità', `${tag} #${v}: focus visibile sui primi ${order.length} elementi`, invisible.length === 0, `ordine: ${order.slice(0, 18).join(' → ')} ·· senza anello: ${invisible.slice(0, 8).join(', ')}`);
  }
  // modale: aria
  const m = await ev(() => ({ lab: document.getElementById('helpModal').getAttribute('aria-labelledby'), role: document.getElementById('helpModal').tagName }));
  R.add('A7', 'accessibilità', `${tag} guida: <dialog> con aria-labelledby`, m.role === 'DIALOG' && !!m.lab, JSON.stringify(m));
  // lingua e titolo
  const l = await ev(() => ({ lang: document.documentElement.lang, title: document.title, h1: document.querySelectorAll('h1').length }));
  R.add('A8', 'accessibilità', `${tag} lang="it", titolo, un h1`, l.lang === 'it' && l.title && l.h1 === 1, JSON.stringify(l));
  // details con titolo nel summary: h2 dentro summary
  const sh = await ev(() => [...document.querySelectorAll('summary h2, summary h3')].length);
  R.add('A9', 'accessibilità', `${tag} intestazioni dentro <summary> (perdono il ruolo di heading in alcuni lettori)`, sh === 0, `${sh} h2/h3 dentro summary (#secCap, #ixCap)`);
  R.add('Z', 'console', `${tag} nessun errore`, !log.length, log.join(' | '));
  R.save();
  await ctx.close(); await b.close();
})();
