// Larghezze a cui le etichette dei mesi della linea del tempo si sovrappongono (vista 0, 1.12.0)
// Uso: BASE=http://127.0.0.1:8811/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/uso-testi/assi.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8811/';
(async () => {
  const b = await chromium.launch();
  for (const vw of [600, 620, 640, 660, 680, 700, 740, 768, 800, 820, 844, 861, 900, 940, 1000, 1024, 1100, 1280, 1440]) {
    const c = await b.newContext({ viewport: { width: vw, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage();
    await p.goto(BASE + '#ath'); await p.waitForSelector('#pkBody .pkep svg .pkdot', { timeout: 30000 }); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const svg = document.querySelector('#pkBody svg'); const vb = svg.viewBox.baseVal; const sc = svg.getBoundingClientRect().width / vb.width; const ax = [...svg.querySelectorAll('text.axt')].map((t) => { const b = t.getBBox(); return { t: t.textContent, l: b.x, r: b.x + b.width }; }).sort((a, b) => a.l - b.l); const ov = []; for (let i = 1; i < ax.length; i++) if (ax[i].l < ax[i - 1].r) ov.push(`${ax[i - 1].t}/${ax[i].t}`); return { nar: svg.classList.contains('nar'), W: vb.width, PW: +svg.dataset.x1 - +svg.dataset.x0, sc, ov, fs: parseFloat(getComputedStyle(svg.querySelector('text.pknote')).fontSize) * sc, fl: parseFloat(getComputedStyle(svg.querySelector('text.pklab')).fontSize) * sc }; });
    console.log(`${vw}px: grafico ${r.W} (${r.nar ? 'telefono' : 'largo'}), 24 mesi = ${Math.round(r.PW * r.sc)} px sullo schermo, testi ${r.fs.toFixed(1)}/${r.fl.toFixed(1)} px, etichette sovrapposte: ${r.ov.join(' ') || 'nessuna'}`);
    await c.close();
  }
  await b.close();
})();
