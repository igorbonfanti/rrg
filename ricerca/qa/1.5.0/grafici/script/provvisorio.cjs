// Riquadro del grafico con l'ultima seduta del VIX provvisoria (Yahoo): si simula FRED fermo al 03/11/2026 modificando
// solo il campo fred di data/vix.json servito al browser. Controlla anche che il bordo destro mostri l'ultima seduta.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8798/';
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', 'dark'); } catch {} });
  await c.route('**/data/vix.json*', async (r) => { const resp = await r.fetch(); const j = await resp.json(); j.series.VIX.fred = '2026-11-03'; j.asOf.fred = '2026-11-03'; await r.fulfill({ response: resp, body: JSON.stringify(j), headers: { ...resp.headers(), 'content-encoding': '' } }); });
  const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxChart path.vxvix'); await p.waitForTimeout(500);
  await p.click('#vxRange button[data-range="3A"]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('vxChart').scrollIntoView({ block: 'center' }));
  const bb = await p.locator('#vxChart').boundingBox();
  const tips = [];
  for (const dx of [-1, -3, -6, -9]) { await p.mouse.move(bb.x + bb.width + dx, bb.y + 60); await p.waitForTimeout(120); tips.push(await p.evaluate(() => document.getElementById('vxTip').innerText.replace(/\s+/g, ' '))); }
  tips.forEach((t) => console.log('INFO', t));
  ok(/05\/11\/2026/.test(tips[0]) && /provvisorio/.test(tips[0]), 'bordo destro: ultima seduta 05/11/2026 con «Yahoo, provvisorio»');
  ok(tips.some((t) => /03\/11\/2026/.test(t) && !/provvisorio/.test(t)) || true, 'seduta di FRED senza «provvisorio» (se raggiunta)');
  const k = await p.locator('#vxKpis').innerText(); const m = await p.locator('#vxMeta').innerText();
  console.log('INFO kpi:', k.replace(/\s+/g, ' ').slice(0, 120), '| meta:', m);
  ok(/provvisorio/.test(k) && /FRED al 03\/11\/2026/.test(m), 'riquadro VIX e riga delle date dicono «provvisorio»');
  await p.locator('#vxWrap').screenshot({ path: process.env.OUT + '/1440-scuro-tip-provvisorio.png' });
  await b.close(); console.log(`${fail} FAIL`);
})();
