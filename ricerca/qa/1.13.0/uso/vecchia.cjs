// Confronto con la 1.12.0 (0c253bb): immagini a pagina intera, parole visibili e altezza di ogni vista, nuova e vecchia.
const fs = require('fs'), path = require('path');
const { chromium, NEW, OLD, VIEWS, ctx, watch, go } = require('./lib.cjs');
const SH = path.join(__dirname, 'shots', 'confronto'); fs.mkdirSync(SH, { recursive: true });
(async () => {
  const b = await chromium.launch(); const rows = [];
  for (const w of [1440, 390]) {
    const res = {};
    for (const [ver, base] of [['1.12.0', OLD], ['1.13.0', NEW]]) {
      const c = await ctx(b, w, w === 1440 ? 'dark' : 'light'); const p = await c.newPage(); const errs = watch(p);
      await p.goto(base + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 });
      for (const [h, vid, wait] of VIEWS) {
        await go(p, base, h, wait); await p.waitForTimeout(500);
        const m = await p.evaluate((vid) => {
          const v = document.getElementById(vid);
          const txt = v.innerText;
          // parole in prosa: paragrafi .note, p, li, dd fuori dalle tabelle e dai grafici
          let prose = 0; for (const e of v.querySelectorAll('p, .note, .legend, dd, li')) { if (!e.getClientRects().length || e.closest('table, svg') || e.parentElement.closest('p, .note, li')) continue; prose += e.innerText.split(/\s+/).filter(Boolean).length; }
          return { words: txt.split(/\s+/).filter(Boolean).length, prose, h: Math.round(v.getBoundingClientRect().height), info: v.querySelectorAll('button.info').length };
        }, vid);
        res[h] = res[h] || {}; res[h][ver] = m;
        await p.screenshot({ path: path.join(SH, `${h}-${w}-${ver}.png`), fullPage: true });
      }
      if (errs.length) console.log(ver, w, 'errori', errs.slice(0, 3));
      await c.close();
    }
    for (const h of Object.keys(res)) { const o = res[h]['1.12.0'], n = res[h]['1.13.0']; rows.push(`| ${w} | #${h} | ${o.words} → ${n.words} | ${o.prose} → ${n.prose} (${Math.round((n.prose / o.prose - 1) * 100)}%) | ${o.h} → ${n.h} px | ${n.info} |`); }
  }
  const out = ['| larghezza | vista | parole visibili | parole di prosa (note, legende, paragrafi) | altezza | «i» |', '|---|---|---|---|---|---|', ...rows].join('\n');
  console.log(out); fs.writeFileSync(path.join(__dirname, 'confronto.md'), out + '\n');
  await b.close();
})();
