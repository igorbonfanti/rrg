// Controllo testi 1.6.0 (agente indipendente): legge nel browser i testi della vista 8 come li vede l'utente
// (riquadri con title, riga delle date, legenda, titoli dei pannelli, riquadro dei valori su ogni pannello) e la guida #vix.
// Uso: node ricerca/qa/server/gzserve.mjs . 8793 &  poi  NODE_PATH=$(npm root -g) node ricerca/qa/1.6.0/testi/testi_browser.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8793/';
const OUT = __dirname;
(async () => {
  const b = await chromium.launch();
  const res = {};
  for (const [name, vp] of [['1440', { width: 1440, height: 1000 }], ['390', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp });
    const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(BASE + '#vix', { waitUntil: 'networkidle' });
    await p.waitForSelector('#vxKpis .kpi', { timeout: 20000 });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({
      kpis: [...document.querySelectorAll('#vxKpis .kpi')].map((k) => ({ text: k.innerText.replace(/\s+/g, ' ').trim(), title: k.getAttribute('title') })),
      meta: document.getElementById('vxMeta') && document.getElementById('vxMeta').textContent,
      legend: document.getElementById('vxLegend').innerText.replace(/\s+/g, ' '),
      panelTitles: [...document.querySelectorAll('#vxChart text')].map((t) => t.textContent).filter((t) => /[A-Z]{4,}/.test(t)),
      nodata: [...document.querySelectorAll('#vxChart text')].map((t) => t.textContent).filter((t) => / dal /.test(t)),
      h2: [...document.querySelectorAll('#v-vix h2')].map((h) => h.textContent),
    }));
    // riquadro dei valori su ogni pannello, al bordo destro e a metà
    await p.locator('#vxChart').scrollIntoViewIfNeeded();
    let box = await p.locator('#vxChart').boundingBox();
    r.tips = [];
    for (const fx of [0.5, 0.97]) {
      for (const fy of [0.2, 0.5, 0.7, 0.9]) {
        await p.evaluate((f) => { const c = document.getElementById('vxChart').getBoundingClientRect(); window.scrollBy(0, c.top + c.height * f - innerHeight / 2); }, fy);
        box = await p.locator('#vxChart').boundingBox();
        await p.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
        await p.waitForTimeout(150);
        const t = await p.evaluate(() => { const e = document.getElementById('vxTip'); return e.hidden ? null : e.innerText.replace(/\s+/g, ' '); });
        if (t) r.tips.push(t);
      }
    }
    // MAX: fascia senza dati
    await p.click('#vxRange button[data-range="MAX"]'); await p.waitForTimeout(400);
    await p.evaluate(() => { const c = document.getElementById('vxChart').getBoundingClientRect(); window.scrollBy(0, c.top + c.height * 0.8 - innerHeight / 2); });
    box = await p.locator('#vxChart').boundingBox();
    r.nodataMax = await p.evaluate(() => [...document.querySelectorAll('#vxChart text')].map((t) => t.textContent).filter((t) => / dal /.test(t)));
    await p.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.8); await p.waitForTimeout(150);
    r.tipMax1990 = await p.evaluate(() => { const e = document.getElementById('vxTip'); return e.hidden ? null : e.innerText.replace(/\s+/g, ' '); });
    await p.click('#vxRange button[data-range="10A"]');
    await p.screenshot({ path: path.join(OUT, `vix-${name}.png`), fullPage: false });
    r.errors = errs;
    res[name] = r;
    await p.close();
  }
  const g = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await g.goto(BASE + 'guida.html#vix', { waitUntil: 'networkidle' });
  res.guida = await g.evaluate(() => document.getElementById('vix').innerText);
  res.guidaDati = await g.evaluate(() => document.getElementById('dati').innerText);
  res.version = await g.evaluate(async () => (await import('./js/version.js')).NOTES[0]).catch((e) => String(e));
  await b.close();
  fs.writeFileSync(path.join(OUT, 'testi_browser.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
})();
