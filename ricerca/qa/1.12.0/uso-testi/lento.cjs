// Vista 0 con data/ath_history.json lento (4 s): messaggio di caricamento, cambio di vista durante il caricamento, ritorno
// Uso: BASE=http://127.0.0.1:8811/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/uso-testi/lento.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8811/';
(async () => {
  const b = await chromium.launch(); let fail = 0;
  const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fail++; };
  for (const [slow, leave] of [['ath_history', false], ['ath_history', true], ['ath', false], ['ath', true]]) {
    const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    await c.route(new RegExp(`/data/${slow}\\.json`), async (r) => { await new Promise((res) => setTimeout(res, 4000)); await r.continue(); });
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#ath'); await p.waitForTimeout(1500);
    const s1 = await p.evaluate(() => ({ pk: document.getElementById('pkMiss').hidden ? '' : document.getElementById('pkMiss').textContent, load: !document.getElementById('athLoading').hidden }));
    ok(/Caricamento/.test(s1.pk), `${slow} lento: durante il caricamento «${s1.pk}» (riga di caricamento della tabella ${s1.load})`);
    if (leave) { await p.click('#tab-vix'); await p.waitForTimeout(4000); await p.click('#tab-ath'); }
    await p.waitForTimeout(leave ? 1000 : 4500);
    const s2 = await p.evaluate(() => ({ eps: document.querySelectorAll('#pkBody .pkep').length, rows: document.querySelectorAll('#athTable tr.athr').length, pk: document.getElementById('pkMiss').hidden, load: document.getElementById('athLoading').hidden }));
    ok(s2.eps === 5 && s2.rows === 9 && s2.pk && s2.load, `${slow} lento${leave ? ', con un giro nel VIX' : ''}: alla fine 5 episodi e 9 righe`);
    ok(!errs.length, `${slow} lento: console ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close(); console.log(fail ? `${fail} FAIL` : '0 FAIL');
})();
