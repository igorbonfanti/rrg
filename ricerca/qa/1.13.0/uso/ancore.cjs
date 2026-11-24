// Le ancore della guida usate dai «i» (data-guide), dai link dentro i riquadri e dalle righe «Fonti e note»: esistono,
// sono visibili e la pagina ci arriva (titolo in alto nello schermo), a 1440 e a 390 px.
const fs = require('fs'), path = require('path');
const { chromium, NEW, ctx } = require('./lib.cjs');
const SH = path.join(__dirname, 'shots', 'guida'); fs.mkdirSync(SH, { recursive: true });
(async () => {
  const idx = await (await fetch(NEW + 'index.html')).text();
  const js = fs.readdirSync('/tmp/qa-u-new/js').map((f) => fs.readFileSync('/tmp/qa-u-new/js/' + f, 'utf8')).join('\n');
  const set = new Map();
  for (const m of (idx + js).matchAll(/data-guide="([a-z0-9-]+)"/g)) set.set(m[1], 'data-guide');
  for (const m of (idx + js).matchAll(/guida\.html#([a-z0-9-]+)/g)) if (!set.has(m[1])) set.set(m[1], 'link');
  const lines = [];
  const b = await chromium.launch();
  for (const w of [1440, 390]) {
    const c = await ctx(b, w, 'light'); const p = await c.newPage();
    for (const [a, kind] of set) {
      await p.goto(NEW + 'guida.html#' + a); await p.waitForTimeout(250);
      const r = await p.evaluate((a) => { const e = document.getElementById(a); if (!e) return { ex: false }; const rc = e.getBoundingClientRect(); const d = e.closest('details'); return { ex: true, vis: !!e.getClientRects().length, top: Math.round(rc.top), vh: innerHeight, closed: d ? !d.open : false, tag: e.tagName, text: e.textContent.trim().slice(0, 50), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; }, a);
      const good = r.ex && r.vis && !r.closed && r.top >= -2 && r.top < r.vh * 0.5;
      lines.push(`${good ? 'OK  ' : 'FAIL'} ${w} #${a} (${kind}): ${r.ex ? `${r.tag} «${r.text}», top ${r.top}/${r.vh}${r.closed ? ', dentro un <details> chiuso' : ''}` : 'ANCORA ASSENTE'}`);
      if (w === 390 && ['stati', 'vix-scatter', 'fonti-vix', 'asset-reali'].includes(a)) await p.screenshot({ path: path.join(SH, `${a}-${w}.png`) });
    }
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    lines.push(`${w}: guida senza scorrimento orizzontale ${sw[0] <= sw[1]} (${sw})`);
    await c.close();
  }
  await b.close();
  console.log(lines.join('\n')); fs.writeFileSync(path.join(__dirname, 'ancore.txt'), lines.join('\n') + '\n');
})();
