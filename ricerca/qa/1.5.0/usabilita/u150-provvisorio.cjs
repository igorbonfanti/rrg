// Ultima seduta del VIX da Yahoo (provvisoria): l'app lo dice nei riquadri, nella riga delle date e nel riquadro dei valori?
// Si simula un file in cui FRED si ferma al giorno prima (data/vix.json modificato solo in memoria, via route).
// Uso: NODE_PATH=$(npm root -g) node u150-provvisorio.cjs [base]
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:8798/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('sm.introSeen', 'true'));
  await ctx.route('**/data/vix.json', async (r) => {
    const res = await r.fetch(); const j = await res.json();
    j.asOf.fred = '2026-11-04'; j.series.VIX.fred = '2026-11-04';
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j) });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '#vix'); await p.waitForFunction(() => !document.getElementById('vxBody').hidden, null, { timeout: 30000 });
  await p.evaluate(() => { const r = document.querySelector('#vxRange button[data-range="3A"]'); r.click(); });
  await p.waitForTimeout(300);
  const k = await p.evaluate(() => ({ kpi: document.querySelector('#vxKpis .kpi').innerText.replace(/\n/g, ' | '), meta: document.getElementById('vxMeta').textContent }));
  await p.evaluate(() => document.getElementById('vxWrap').scrollIntoView({ block: 'center' }));
  const r = await p.evaluate(() => { const s = document.getElementById('vxChart').getBoundingClientRect(); return { x: s.right - 20, y: s.top + 100 }; });
  await p.mouse.move(r.x, r.y); await p.waitForTimeout(200);
  const tip = await p.evaluate(() => document.getElementById('vxTip').innerText.replace(/\n/g, ' | '));
  await p.screenshot({ path: path.join(__dirname, 'shots', 'provvisorio-1440.png') });
  console.log(JSON.stringify({ ...k, tip, errs }, null, 1));
  console.log(/provvisorio/.test(k.kpi) && /FRED al 04\/11\/2026/.test(k.meta) && /provvisorio/.test(tip) ? 'OK provvisorio segnalato in riquadro, date e tooltip' : 'FAIL provvisorio');
  await b.close();
})();
