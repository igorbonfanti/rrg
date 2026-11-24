// Percorso 5: dati mancanti, rotti o vecchi; tempi di apertura (anche con rete lenta); il resto dell'app continua a funzionare
const { chromium, BASE, SHOTS, check, summary, open, waitEmg } = require('./lib.cjs');
const path = require('path');
const fs = require('fs');
const REAL = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../data/emerging.json'), 'utf8'));
const VIEWS = ['mon', 'rrg', 'btm', 'sec', 'alr', 'idx', 'tit'];
// serie accorciata delle ultime n righe (stesso formato: d0, gaps, cd)
const cut = (s, n) => ({ ...s, cd: s.cd.slice(0, -n), gaps: s.gaps.slice(0, -n) });

async function others(page, t) {
  for (const v of VIEWS) {
    await page.evaluate((v) => { location.hash = '#' + v; }, v);
    await page.waitForTimeout(v === 'idx' || v === 'tit' ? 1200 : 400);
  }
  const vis = await page.$$eval('section.view', (s) => s.filter((e) => !e.hidden).map((e) => e.id));
  const idxRows = await page.$$eval('#ixTable tbody tr', (r) => r.length);
  check(`${t} il resto dell'app funziona (vista 6 con ${idxRows} righe, vista 7 aperta)`, vis[0] === 'v-tit' && idxRows > 0, { vis, idxRows });
}

(async () => {
  const browser = await chromium.launch();
  const cases = [
    ['404', (p) => p.route('**/data/emerging.json', (r) => r.fulfill({ status: 404, body: '' }))],
    ['troncato', (p) => p.route('**/data/emerging.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REAL).slice(0, 50000) }))],
    ['rete interrotta', (p) => p.route('**/data/emerging.json', (r) => r.abort('failed'))],
    ['senza series', (p) => p.route('**/data/emerging.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ asOf: REAL.asOf }) }))],
  ];
  for (const [name, route] of cases) {
    const t = `[emerging.json ${name}]`;
    const { ctx, page, errors } = await open(browser, { route });
    await page.click('#tab-emg');
    await waitEmg(page);
    const st = await page.evaluate(() => ({ msg: document.getElementById('emLoading').textContent, shown: !document.getElementById('emLoading').hidden, body: !document.getElementById('emBody').hidden }));
    check(`${t} la vista dice che i dati mancano`, st.shown && /non disponibil/.test(st.msg) && !st.body, st);
    await page.screenshot({ path: path.join(SHOTS, `dati-${name.replace(/ /g, '-')}.png`) });
    const pe = errors.filter((e) => /pageerror/.test(e));
    check(`${t} nessun errore JavaScript non gestito`, pe.length === 0, errors);
    // seconda apertura: riprova?
    await page.keyboard.press('1'); await page.waitForTimeout(200); await page.keyboard.press('8'); await page.waitForTimeout(600);
    const st2 = await page.evaluate(() => document.getElementById('emLoading').textContent);
    check(`${t} [esplorativo] riaprendo la vista il messaggio resta coerente`, /non disponibil/.test(st2), st2);
    await others(page, t);
    await ctx.close();
  }
  // dati parziali: manca il cambio KRW e la serie FRED
  {
    const t = '[serie KRW e FRED mancanti]';
    const body = JSON.parse(JSON.stringify(REAL)); delete body.series['KRW=X']; delete body.series.DTWEXEMEGS;
    const { ctx, page, errors } = await open(browser, { hash: 'emg-KOSPI200', route: (p) => p.route('**/data/emerging.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })) });
    await waitEmg(page); await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ fx: document.querySelector('#emTable tr[data-em="KOSPI200"] .c-fx').innerText, usd: document.querySelector('#emTable tr[data-em="KOSPI200"] .c-m3u').innerText, kpi: document.querySelector('#emKpis .kpi').innerText.replace(/\s+/g, ' '), chartMeta: document.getElementById('emChartMeta').textContent, svg: [...document.querySelectorAll('#emChart text')].map((e) => e.textContent).filter((x) => /non disponibile|FRED/.test(x)) }));
    check(`${t} cella valuta «—» e 3 mesi in $ «—»`, r.fx.trim() === '—' && r.usd.trim() === '—', r);
    check(`${t} riquadro del dollaro «FRED non disponibile»`, /FRED non disponibile/.test(r.kpi), r.kpi);
    check(`${t} il grafico dice cosa manca`, r.svg.some((x) => /FRED non disponibile/.test(x)) && r.svg.some((x) => /Cambio non disponibile/.test(x)), r.svg);
    await page.screenshot({ path: path.join(SHOTS, 'dati-parziali.png'), fullPage: true });
    check(`${t} nessun errore`, errors.filter((e) => /pageerror/.test(e)).length === 0, errors);
    await ctx.close();
  }
  // dati vecchi: cambi fermi 60 sedute prima, FRED fermo 30 righe prima
  {
    const t = '[cambi vecchi di ~3 mesi]';
    const body = JSON.parse(JSON.stringify(REAL));
    for (const k of Object.keys(body.series)) if (/=X$/.test(k)) body.series[k] = cut(body.series[k], 60);
    body.series.DTWEXEMEGS = cut(body.series.DTWEXEMEGS, 30);
    const { ctx, page } = await open(browser, { hash: 'emg-KOSPI200', route: (p) => p.route('**/data/emerging.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })) });
    await waitEmg(page); await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ meta: document.getElementById('emMeta').textContent, chartMeta: document.getElementById('emChartMeta').textContent, fxTitle: (document.querySelector('#emTable tr[data-em="KOSPI200"] .zbar') || {}).title, kpi: document.querySelector('#emKpis .kpi').innerText.replace(/\s+/g, ' '), stale: [...document.querySelectorAll('#v-emg .stale, #v-emg .fresh')].map((e) => e.textContent) }));
    // la data dichiarata in testa al tabellone (asOf del file) contro la data reale dell'ultimo cambio
    check(`${t} la data dei cambi in testa al tabellone è quella vera dell'ultimo dato`, !/cambi al 04\/11\/2026/.test(r.meta), r);
    check(`${t} un avviso visibile segnala i cambi vecchi`, r.stale.length > 0, r.stale);
    await page.screenshot({ path: path.join(SHOTS, 'dati-vecchi.png') });
    await ctx.close();
  }
  // config/emerging.json mancante: la scheda sparisce; tasto 8, comando EMG e indirizzo #emg
  {
    const t = '[config/emerging.json 404]';
    const { ctx, page, errors } = await open(browser, { route: (p) => p.route('**/config/emerging.json', (r) => r.fulfill({ status: 404, body: '' })) });
    check(`${t} scheda 8 nascosta`, await page.$eval('#tab-emg', (e) => e.hidden));
    await page.keyboard.press('8'); await page.waitForTimeout(400);
    const a = await page.evaluate(() => ({ vis: [...document.querySelectorAll('section.view')].filter((e) => !e.hidden).map((e) => e.id), hash: location.hash, txt: document.getElementById('v-emg').innerText.trim().slice(0, 80) }));
    check(`${t} il tasto 8 non apre una pagina vuota`, a.vis[0] !== 'v-emg', a);
    await page.screenshot({ path: path.join(SHOTS, 'config-404-tasto8.png') });
    await page.keyboard.press('1'); await page.waitForTimeout(200);
    await page.fill('#cmd', 'EMG'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(400);
    const b = await page.evaluate(() => ({ vis: [...document.querySelectorAll('section.view')].filter((e) => !e.hidden).map((e) => e.id), hash: location.hash }));
    check(`${t} il comando EMG non apre una pagina vuota`, b.vis[0] !== 'v-emg', b);
    await page.goto(BASE + '#emg-KOSPI200'); await page.reload(); await page.waitForFunction(() => document.getElementById('loadingNote').hidden);
    const c = await page.evaluate(() => ({ vis: [...document.querySelectorAll('section.view')].filter((e) => !e.hidden).map((e) => e.id), hash: location.hash }));
    check(`${t} l'indirizzo #emg-KOSPI200 ripiega sul Monitor`, c.vis[0] === 'v-mon', c);
    check(`${t} nessun errore`, errors.filter((e) => /pageerror/.test(e)).length === 0, errors);
    await ctx.close();
  }
  // dati della vista 6 mancanti
  {
    const t = '[data/indices.json 404]';
    const { ctx, page, errors } = await open(browser, { route: (p) => p.route('**/data/indices.json', (r) => r.fulfill({ status: 404, body: '' })) });
    await page.click('#tab-emg'); await waitEmg(page);
    const m = await page.evaluate(() => ({ msg: document.getElementById('emLoading').textContent, shown: !document.getElementById('emLoading').hidden }));
    check(`${t} la vista 8 dice che mancano gli stati della vista 6`, m.shown && /non disponibil/.test(m.msg), m);
    check(`${t} nessun errore`, errors.filter((e) => /pageerror/.test(e)).length === 0, errors);
    await ctx.close();
  }
  // tempi: rete normale (locale) e rete lenta (circa 4G lento: 1,6 Mbit/s, 150 ms)
  for (const [lab, cond] of [['locale', null], ['rete lenta 1,6 Mbit/s', { offline: false, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024, latency: 150 }]]) {
    const times = [];
    for (let i = 0; i < 3; i++) {
      const { ctx, page } = await open(browser, {});
      if (cond) { const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', cond); }
      const t0 = Date.now();
      await page.click('#tab-emg');
      const loadingShown = await page.evaluate(() => !document.getElementById('emLoading').hidden);
      await waitEmg(page, 60000);
      times.push({ ms: Date.now() - t0, loadingShown });
      await ctx.close();
    }
    const med = times.map((x) => x.ms).sort((a, b) => a - b)[1];
    check(`[tempi ${lab}] apertura della vista 8 (mediana di 3): ${med} ms`, cond ? med < 8000 : med < 1500, times);
    if (cond) check(`[tempi ${lab}] durante l'attesa compare «Caricamento…»`, times.every((x) => x.loadingShown), times);
  }
  await browser.close();
  summary('g-dati');
})().catch((e) => { console.error(e); process.exit(1); });
