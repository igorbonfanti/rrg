// 1.10.0: pannello «Distanza dal massimo degli ultimi 3 anni» nella vista 8 VIX (solo contesto), con il grafico al clic, paragrafo della guida su spread a
// 350 pb e petrolio. Deve fallire sulla 1.9.1 (niente pannello, niente data/ath.json).
// Uso: BASE=http://127.0.0.1:8791/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v1100.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const sg = (v) => (v === 0 ? '0,00%' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + '%');
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
(async () => {
  // valori attesi letti dal file dei dati, senza le funzioni dell'app
  const A = await (await fetch(BASE + 'data/ath.json')).json().catch(() => null);
  const ms = A && Array.isArray(A.markets) ? A.markets : [];
  ok(ms.length === 9 && ms.every((m) => m.stats), `data/ath.json con 9 mercati (${ms.length})`);
  ok(!ms.some((m) => m.symbol === 'USO'), 'niente USO tra i mercati');
  const byDist = ms.filter((m) => m.stats).slice().sort((a, b) => a.stats.distPct - b.stats.distPct).map((m) => m.id);
  const byDate = ms.filter((m) => m.stats).slice().sort((a, b) => (a.stats.refDate < b.stats.refDate ? -1 : a.stats.refDate > b.stats.refDate ? 1 : 0)).map((m) => m.id);
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark'], ['360-chiaro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }, 'light']]) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const tap = async (l) => (opt.hasTouch ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })).catch(() => ok(false, `${name}: elemento da toccare assente`));
    await p.goto(BASE + '#vix');
    await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(500);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#athTable tbody tr.athr')].map((t) => ({ id: t.dataset.id, d: (t.querySelector('.dv') || {}).textContent, max: (t.querySelector('.c-max') || {}).textContent, mob: (t.querySelector('.athmob') || {}).textContent, w: parseFloat((t.querySelector('.athbar i') || { style: {} }).style.width), mark: !!t.querySelector('.athbar .mark') })));
    ok(rows.length === 9, `${name}: 9 righe (${rows.length})`);
    ok(JSON.stringify(rows.map((r) => r.id)) === JSON.stringify(byDist), `${name}: ordine per distanza ${rows.map((r) => r.id).join(' ')}`);
    let bad = [];
    for (const r of rows) {
      const m = ms.find((x) => x.id === r.id); if (!m) { bad.push(r.id); continue; }
      const s = m.stats;
      if (r.d !== sg(s.distPct)) bad.push(`${r.id} ${r.d}≠${sg(s.distPct)}`);
      const want = Math.min(100, (-s.distPct / 60) * 100);
      if (Math.abs(r.w - want) > 0.01) bad.push(`${r.id} barra ${r.w}≠${want.toFixed(2)}`);
      if (!(opt.hasTouch ? r.mob : r.max).includes(dIT(s.refDate))) bad.push(`${r.id} data del massimo`);
      if (r.mark !== (s.cycleLowPct != null && s.cycleLowPct < 0)) bad.push(`${r.id} tacca`);
    }
    ok(!bad.length, `${name}: distanza, barra, data del massimo e tacca uguali al file ${bad.join(' | ')}`);
    // ordine per data del massimo, salvato
    await tap(p.locator('#athSort button[data-sort="date"]')); await p.waitForTimeout(200);
    const ids = await p.$$eval('#athTable tbody tr.athr', (t) => t.map((x) => x.dataset.id));
    ok(JSON.stringify(ids) === JSON.stringify(byDate), `${name}: ordine per data del massimo ${ids.join(' ')}`);
    await p.reload(); await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300);
    ok((await p.getAttribute('#athSort button[data-sort="date"]', 'aria-pressed', { timeout: 5000 }).catch(() => null)) === 'true', `${name}: ordine ricordato dopo il ricaricamento`);
    await tap(p.locator('#athSort button[data-sort="dist"]')); await p.waitForTimeout(200);
    // dettaglio al clic: «dal …», massimo durante la seduta; WTI sotto zero
    await tap(p.locator('#athTable tr.athr[data-id="SPX"]')); await p.waitForTimeout(200);
    const det = await p.$eval('#athTable tr.athdet', (t) => t.textContent).catch(() => '');
    const spx = (ms.find((m) => m.id === 'SPX') || {}).stats || { start: '1900-01-01', refDate: '1900-01-01', from: '1900-01-01' };
    ok(det.includes(`degli ultimi 3 anni (dal ${dIT(spx.from)})`) && det.includes(`serie dal ${dIT(spx.start)}`) && det.includes('durante la seduta') && det.includes(dIT(spx.refDate)), `${name}: dettaglio S&P 500 «${det.slice(0, 90)}…»`);
    // grafico del prezzo sotto la tabella: linea, finestra dei 3 anni, massimo di riferimento; periodi
    await p.waitForSelector('#athChart path.athpx', { timeout: 15000 }).catch(() => {});
    const ch = await p.evaluate(() => ({ box: !!document.getElementById('athChartBox') && !document.getElementById('athChartBox').hidden, t: (document.getElementById('athChartTitle') || {}).textContent || '', px: !!document.querySelector('#athChart path.athpx'), win: !!document.querySelector('#athChart .athwin'), ref: !!document.querySelector('#athChart .athref'), lbl: [...document.querySelectorAll('#athChart .athreft')].map((x) => x.textContent).join(' ') }));
    ok(ch.box && /^S&P 500: prezzo dal \d{4}/.test(ch.t) && ch.px && ch.win && ch.ref && /massimo/.test(ch.lbl), `${name}: grafico dello S&P 500 «${ch.t}» con finestra e massimo (${ch.lbl})`);
    await tap(p.locator('#athRange button[data-range="MAX"]')); await p.waitForTimeout(300);
    ok((await p.getAttribute('#athRange button[data-range="MAX"]', 'aria-pressed', { timeout: 5000 }).catch(() => null)) === 'true' && !!(await p.$('#athChart path.athpx')), `${name}: periodo MAX del grafico`);
    await tap(p.locator('#athTable tr.athr[data-id="WTI"]')); await p.waitForTimeout(200);
    const wti = await p.$eval('#athTable tr.athdet', (t) => t.textContent).catch(() => '');
    const wtiS = (ms.find((m) => m.id === 'WTI') || {}).stats || { athDate: '1900-01-01', refDate: '1900-01-01', from: '1800-01-01' };
    ok(wti.includes('massimo di sempre') && wti.includes(dIT(wtiS.athDate)) && wti.includes(dIT(wtiS.refDate)) && /USO/.test(wti) && wtiS.athDate < wtiS.from, `${name}: dettaglio WTI con il massimo dei 3 anni, quello di sempre (${wtiS.athDate}) e la nota su USO`);
    ok(/^Petrolio WTI: prezzo dal/.test(await p.$eval('#athChartTitle', (x) => x.textContent).catch(() => '')), `${name}: il grafico passa al petrolio`);
    ok((await p.$$('#athTable tr.athdet')).length === 1, `${name}: un solo dettaglio aperto`);
    await tap(p.locator('#athTable tr.athr[data-id="WTI"]')); await p.waitForTimeout(200);
    ok((await p.$$('#athTable tr.athdet')).length === 0 && (await p.$eval('#athChartBox', (x) => x.hidden).catch(() => false)), `${name}: secondo clic chiude dettaglio e grafico`);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale (${sw})`);
    ok(/Francesco Caruso/.test(await p.$eval('#athNote', (x) => x.textContent).catch(() => '')), `${name}: idea citata nella nota`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  // file mancante: il pannello lo dice e il resto della vista funziona
  {
    const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    await c.route('**/data/ath.json', (r) => r.fulfill({ status: 404, body: '' }));
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(600);
    const st = await p.evaluate(() => ({ miss: !!document.getElementById('athMiss') && !document.getElementById('athMiss').hidden && document.getElementById('athMiss').textContent, rows: document.querySelectorAll('#athTable tr').length, kpis: document.querySelectorAll('#vxKpis .kpi').length }));
    ok(st.miss && /non disponibili/.test(st.miss) && st.rows === 0 && st.kpis > 0, `senza data/ath.json: messaggio nel pannello, vista VIX funzionante (${st.kpis} riquadri)`);
    ok(!errs.length, `senza data/ath.json: nessun errore ${errs.join(' | ')}`);
    await c.close();
  }
  // guida: sezione del pannello e paragrafo su spread e petrolio
  const g = await (await fetch(BASE + 'guida.html')).text();
  ok(/id="massimi"/.test(g) && /massimo di chiusura degli ultimi 3 anni/.test(g) && /id="credito-petrolio"/.test(g) && /350 punti base/.test(g) && /280 mesi su 910/.test(g), 'guida: distanza dal massimo dei 3 anni, spread a 350 pb e petrolio');
  const v = await (await fetch(BASE + 'version.json')).json();
  ok(v.version === '1.10.0', `version.json ${v.version}`);
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
