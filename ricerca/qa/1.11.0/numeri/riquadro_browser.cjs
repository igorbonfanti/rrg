// Controllo 1.11.0 (numeri): legge dal browser, per i 9 mercati, il riquadro di OGNI barra del profilo dei volumi (estremi
// della fascia e quota) e la legenda, e li scrive in un JSON per riquadro_confronto.py (ricalcolo indipendente).
// Uso: BASE=http://127.0.0.1:8871/ NODE_PATH=$(npm root -g) node riquadro_browser.cjs <uscita.json> [larghezza]
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8871/';
const OUT = process.argv[2], WIDTH = +(process.argv[3] || 1440);
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: WIDTH, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const p = await c.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '#vix');
  await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 });
  const ids = await p.$$eval('#athTable tr.athr', (r) => r.map((x) => x.dataset.id));
  const out = { width: WIDTH, markets: {}, errors: errs };
  for (const id of ids) {
    await p.click(`#athTable tr.athr[data-id="${id}"]`);
    await p.waitForSelector('#athChart .athpx', { timeout: 10000 });
    await p.click('#athRange button[data-range="3A"]'); await p.waitForTimeout(150);
    await p.evaluate(() => document.getElementById('athWrap').scrollIntoView({ block: 'center' })); await p.waitForTimeout(100);
    const g = await p.evaluate(() => {
      const svg = document.getElementById('athChart');
      return { merge: +svg.dataset.vpMerge || 0, legend: document.getElementById('athLegend').textContent,
        bars: [...svg.querySelectorAll('.vpbar')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + Math.max(2, r.width / 2), y: r.top + r.height / 2, w: r.width }; }) };
    });
    const tips = [];
    for (const bar of g.bars) {
      await p.mouse.move(bar.x, bar.y); await p.waitForTimeout(25);
      tips.push(await p.evaluate(() => { const t = document.getElementById('athTip'); return t.hidden ? null : t.innerHTML; }));
    }
    await p.mouse.move(2, 2);
    out.markets[id] = { merge: g.merge, legend: g.legend, n: g.bars.length, tips };
    console.log(`${id}: ${g.bars.length} barre, fasce unite ${g.merge}, riquadri letti ${tips.filter(Boolean).length}`);
  }
  out.errors = errs;
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`errori della console: ${errs.length}`);
  await b.close();
})();
