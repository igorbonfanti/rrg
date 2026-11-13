const { chromium } = require('playwright');
const fs = require('fs');
const B = JSON.parse(fs.readFileSync('/home/user/rrg/ricerca/soxx/dati/breadth_soxx.json', 'utf8'));
const n = B.dates.length, k0 = n - 252;
const pts = B.dates.slice(k0).map((d, i) => [d, (100 * B.a200[k0 + i]) / B.n[k0 + i]]);
(async () => {
  const b = await chromium.launch();
  for (const [tag, vp, theme, dpr] of [['1440-scuro', { width: 1440, height: 900 }, 'dark', 2], ['1280-chiaro', { width: 1280, height: 900 }, 'light', 2], ['390-scuro', { width: 390, height: 844 }, 'dark', 3]]) {
    const c = await b.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: tag.startsWith('390'), hasTouch: tag.startsWith('390') });
    await c.addInitScript((t) => { try { localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('sm.sector', '"XLK"'); } catch {} }, theme);
    const p = await c.newPage();
    await p.goto('http://127.0.0.1:8791/#sec'); await p.waitForTimeout(3000);
    await p.evaluate((pts) => {
      const W = 300, H = 64, L = 2, R = 34, PW = W - L - R;
      const x = (i) => L + (i / (pts.length - 1)) * PW, y = (v) => 4 + (1 - v / 100) * (H - 8);
      const d = pts.map((q, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(q[1]).toFixed(1)).join('');
      const last = pts.at(-1);
      const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" aria-hidden="true">
        <rect x="${L}" y="4" width="${PW}" height="${H - 8}" class="frame" style="fill:none;stroke:var(--rule)"/>
        <line x1="${L}" x2="${L + PW}" y1="${y(3.3)}" y2="${y(3.3)}" style="stroke:var(--blue);stroke-width:1.5"/>
        <path d="${d}" style="fill:none;stroke:var(--ink);stroke-width:1.3"/>
        <circle cx="${x(pts.length - 1)}" cy="${y(last[1])}" r="2.6" style="fill:var(--amber)"/>
        <text x="${L + PW + 4}" y="${y(last[1]) + 3}" style="fill:var(--amber);font:600 9.5px var(--f-mono)">${last[1].toFixed(1).replace('.', ',')}%</text>
        <text x="${L + PW + 4}" y="${y(3.3) + 3}" style="fill:var(--blue);font:9px var(--f-mono)">3%</text>
        <text x="${L + 3}" y="${H - 1}" style="fill:var(--ink-3);font:9px var(--f-mono)">nov 25</text>
        <text x="${L + PW}" y="${H - 1}" text-anchor="end" style="fill:var(--ink-3);font:9px var(--f-mono)">nov 26</text></svg>`;
      const facts = document.getElementById('secFacts').closest('.panel');
      const box = document.createElement('div'); box.className = 'panel'; box.style.outline = '2px dashed var(--amber)';
      box.innerHTML = `<div class="ph"><h2>Industria nel settore</h2><span class="meta">ANTEPRIMA</span></div>
        <div class="pb"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px"><b>SOXX · semiconduttori</b><span class="st st-watch">attenzione</span></div>
        <dl class="facts"><dt>Titoli sopra media 200</dt><dd>7/30 · 23,3%</dd><dt>Distanza dal livello blu</dt><dd>+20,3 pt</dd><dt>Drawdown da max 52s</dt><dd>−32,8% · 91° perc.</dd></dl>
        <p class="note" style="margin:8px 0 4px">Breadth dell'ultimo anno; linea blu: livello 3% (Massimo Rea, quant-rea), cioè nessun titolo sopra la media 200.</p>
        ${svg}
        <p class="note" style="margin-top:6px">Storia ricostruita con i 30 membri di oggi (iShares). <a href="#">Apri SOXX nella vista 6 →</a></p></div>`;
      facts.parentNode.insertBefore(box, facts.nextSibling);
      box.scrollIntoView({ block: 'center' });
    }, pts);
    await p.waitForTimeout(400);
    const el = await p.$('.panel[style*="dashed"]');
    await el.screenshot({ path: `/home/user/rrg/ricerca/soxx/anteprima-xlk-${tag}.png` });
    await c.close();
  }
  await b.close();
})();
