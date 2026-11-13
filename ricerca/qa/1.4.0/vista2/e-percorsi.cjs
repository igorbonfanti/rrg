// E. Percorsi d'uso: tasto 8, frecce sulle schede, comandi, Indietro, ricarica, tastiera sul tabellone e sul quadrante,
// link tra vista 6 e vista 8, link della guida, file data/emerging.json mancante, troncato o vuoto, errori in console.
const fs = require('fs');
const { chromium, SHOTS, openPage, waitEmg, BASE } = require('./lib.cjs');
const out = { problemi: [], controlli: 0, misure: [] };
const bad = (m) => { out.problemi.push(m); console.log('PROBLEMA', m); };
const ok = (c, m) => { out.controlli++; if (!c) bad(m); return c; };
const st = (page) => page.evaluate(() => ({ view: [...document.querySelectorAll('.view')].filter((v) => !v.hidden).map((v) => v.id).join(), hash: location.hash, title: (document.getElementById('emTitle') || {}).textContent, sel: [...document.querySelectorAll('#emTable tr.sel')].map((r) => r.dataset.em).join(), range: [...document.querySelectorAll('#emRange button[aria-pressed="true"]')].map((b) => b.dataset.range).join(), focus: document.activeElement && (document.activeElement.id || document.activeElement.dataset.em || document.activeElement.tagName) }));
(async () => {
  const browser = await chromium.launch();
  const { ctx, page, errs } = await openPage(browser, { width: 1440, theme: 'light', hash: '#mon' });
  await page.waitForTimeout(2500);
  // tasto 8
  await page.keyboard.press('8'); await waitEmg(page);
  let s = await st(page); ok(s.view === 'v-emg' && /^#emg-/.test(s.hash), `tasto 8 → ${JSON.stringify(s)}`);
  // frecce sulle schede: da 7 Titoli a destra arriva a 8, da 8 a destra torna a 1?
  await page.focus('#tab-tit'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
  s = await st(page); ok(s.view === 'v-emg' && s.focus === 'tab-emg', `freccia destra da 7 → ${JSON.stringify(s)}`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); s = await st(page); out.misure.push(['freccia destra da 8', s]);
  await page.keyboard.press('End'); await page.waitForTimeout(400); s = await st(page); out.misure.push(['End sulle schede', s]);
  // comandi
  for (const [cmd, k] of [['EMG', null], ['KOSPI200 EMG', 'KOSPI200'], ['KOSPI EMG', 'KOSPI200'], ['EMG KOSPI200', 'KOSPI200'], ['ibov emg', 'IBOV'], ['EMERGENTI', null], ['NIFTY EMG', 'NIFTY50'], ['HANGSENG EMG', 'HSI'], ['TAIWAN EMG', 'TWN'], ['CSI EMG', 'CSI300'], ['EEM EMG', 'EEM'], ['DAX EMG', 'X']]) {
    await page.click('#tab-mon'); await page.waitForTimeout(300);
    await page.fill('#cmd', cmd); await page.press('#cmd', 'Enter'); await page.waitForTimeout(600);
    s = await st(page);
    if (k === 'X') { out.misure.push([cmd, s]); ok(s.view !== 'v-emg' || true, ''); continue; }
    ok(s.view === 'v-emg' && (!k || (s.sel === k && s.hash === '#emg-' + k && s.title.startsWith(k + ' ·'))), `comando ${cmd} → ${JSON.stringify(s)}`);
  }
  // comando con la vista 8 già aperta su un altro indice
  await page.fill('#cmd', 'TWN EMG'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(600);
  s = await st(page); ok(s.sel === 'TWN' && s.title.startsWith('TWN'), `comando TWN EMG con la vista aperta → ${JSON.stringify(s)}`);
  // Indietro: TWN ← CSI300 (comando prima) ← …
  await page.click('#emTable tr[data-em="HSI"]'); await page.waitForTimeout(300);
  await page.click('#emTable tr[data-em="EEM"]'); await page.waitForTimeout(300);
  await page.goBack(); await page.waitForTimeout(500); s = await st(page); ok(s.sel === 'HSI' && s.hash === '#emg-HSI' && s.title.startsWith('HSI'), `Indietro da EEM → ${JSON.stringify(s)}`);
  await page.goBack(); await page.waitForTimeout(500); s = await st(page); ok(s.sel === 'TWN' && s.title.startsWith('TWN'), `Indietro da HSI → ${JSON.stringify(s)}`);
  await page.goForward(); await page.waitForTimeout(500); s = await st(page); ok(s.sel === 'HSI', `Avanti → ${JSON.stringify(s)}`);
  // clic sulla riga già scelta: non deve aggiungere passi alla storia
  const hl = await page.evaluate(() => history.length); await page.click('#emTable tr[data-em="HSI"]'); await page.waitForTimeout(300);
  out.misure.push(['clic sulla riga già scelta: voci di storia in più', (await page.evaluate(() => history.length)) - hl]);
  // ricarica: indice e periodo restano
  await page.click('#emRange button[data-range="10A"]'); await page.waitForTimeout(200);
  await page.reload(); await waitEmg(page); s = await st(page);
  ok(s.sel === 'HSI' && s.range === '10A' && s.hash === '#emg-HSI', `ricarica → ${JSON.stringify(s)}`);
  // indirizzo diretto e indirizzo sbagliato
  await page.goto(BASE + '#emg-IBOV'); await waitEmg(page); s = await st(page); ok(s.sel === 'IBOV' && s.title.startsWith('IBOV'), `#emg-IBOV → ${JSON.stringify(s)}`);
  await page.goto(BASE + '#emg-DAX'); await page.waitForTimeout(2000); s = await st(page); out.misure.push(['#emg-DAX', s]); ok(s.view === 'v-emg' && s.hash !== '#emg-DAX', `#emg-DAX → ${JSON.stringify(s)}`);
  await page.goto(BASE + '#emg-kospi200'); await page.waitForTimeout(2000); s = await st(page); out.misure.push(['#emg-kospi200', s]);
  // tastiera nel tabellone: Tab fino a una riga, Invio
  await page.goto(BASE + '#emg-CSI300'); await waitEmg(page);
  await page.focus('#emTable tr[data-em="TWN"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  s = await st(page); ok(s.sel === 'TWN' && s.focus === 'TWN', `Invio sulla riga TWN → ${JSON.stringify(s)} (il focus deve restare sulla riga)`);
  await page.keyboard.press('Space'); await page.waitForTimeout(200); out.misure.push(['Spazio sulla riga', await st(page)]);
  // tastiera sul quadrante
  await page.focus('#emRS g.emdot[data-em="EWZ"], #emRS g.emdot[data-em="IBOV"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  s = await st(page); ok(s.sel === 'IBOV' && s.focus === 'IBOV', `Invio sul punto IBOV → ${JSON.stringify(s)}`);
  // focus visibile sui punti del quadrante
  const fv = await page.evaluate(() => { const g = document.querySelector('#emRS g.emdot[data-em="IBOV"]'); const c = getComputedStyle(g); return { outline: c.outlineStyle + ' ' + c.outlineWidth + ' ' + c.outlineColor }; });
  out.misure.push(['focus sul punto del quadrante', fv]);
  // tasti numerici mentre si scrive nella barra dei comandi
  await page.focus('#cmd'); await page.keyboard.type('8'); await page.waitForTimeout(200); s = await st(page);
  ok((await page.inputValue('#cmd')) === '8', `il tasto 8 nella barra dei comandi non resta come testo`); await page.fill('#cmd', '');
  // link «Apri nella vista 6» e ritorno dalla vista 6
  await page.click('#emOpenIx'); await page.waitForTimeout(800); s = await st(page); out.misure.push(['Apri nella vista 6', s]);
  ok(s.view === 'v-idx' && /IBOV/.test(s.hash + (await page.textContent('#ixTitle').catch(() => ''))), `Apri IBOV nella vista 6 → ${JSON.stringify(s)}`);
  const link8 = await page.$$eval('#v-idx a[href*="emg"], #v-idx button', (a) => a.filter((e) => /emergenti|vista 8/i.test(e.textContent)).map((e) => [e.id, e.textContent, e.hidden]));
  out.misure.push(['link alla vista 8 nel dettaglio della vista 6', link8]);
  await page.goBack(); await page.waitForTimeout(600); s = await st(page); ok(s.view === 'v-emg' && s.sel === 'IBOV', `Indietro dalla vista 6 → ${JSON.stringify(s)}`);
  out.erroriPercorsi = errs.slice();
  ok(!errs.length, `errori in console nei percorsi: ${errs}`);
  await ctx.close();
  // guida: link «Apri gli Emergenti» e sezione
  { const { ctx, page, errs } = await openPage(browser, { width: 1280, hash: '#emg', url: BASE + 'guida.html' });
    await page.waitForTimeout(800);
    const href = await page.getAttribute('#emg a.open', 'href'); ok(href === './#emg', `link della guida ${href}`);
    await page.click('#emg a.open'); await page.waitForTimeout(2500); ok(/#emg/.test(page.url()) && await page.isVisible('#v-emg'), `dalla guida → ${page.url()}`);
    ok(!errs.length, `errori nella guida: ${errs}`); await ctx.close(); }
  // file mancante, troncato, vuoto, con una serie mancante
  const raw = fs.readFileSync(process.env.SITE + '/data/emerging.json', 'utf8');
  const j = JSON.parse(raw); const noKRW = JSON.parse(raw); delete noKRW.series['KRW=X']; noKRW.missing = ['KRW=X'];
  const noFred = JSON.parse(raw); delete noFred.series.DTWEXEMEGS;
  const noAcwi = JSON.parse(raw); delete noAcwi.series.ACWI;
  for (const [nm, route] of [['mancante (404)', { status: 404, body: '' }], ['troncato', { status: 200, body: raw.slice(0, 100000) }], ['vuoto', { status: 200, body: '' }], ['oggetto vuoto', { status: 200, body: '{}' }],
    ['senza KRW=X', { status: 200, body: JSON.stringify(noKRW) }], ['senza DTWEXEMEGS', { status: 200, body: JSON.stringify(noFred) }], ['senza ACWI', { status: 200, body: JSON.stringify(noAcwi) }]]) {
    const { ctx, page, errs } = await openPage(browser, { width: 1280, hash: '#mon' });
    await page.route('**/data/emerging.json*', (r) => r.fulfill({ status: route.status, contentType: 'application/json', body: route.body }));
    await page.waitForTimeout(1500);
    await page.keyboard.press('8'); await page.waitForTimeout(4000);
    const r = await page.evaluate(() => ({ loading: !document.getElementById('emLoading').hidden && document.getElementById('emLoading').textContent, body: !document.getElementById('emBody').hidden, rows: document.querySelectorAll('#emTable tbody tr').length,
      kpi: [...document.querySelectorAll('#emKpis .kpi')].map((k) => k.innerText.replace(/\s+/g, ' ')).slice(0, 1).join(), krw: (document.querySelector('#emTable tr[data-em="KOSPI200"] .c-fx') || {}).innerText, m3u: (document.querySelector('#emTable tr[data-em="KOSPI200"] .c-m3u') || {}).innerText,
      rs: (document.querySelector('#emTable tr[data-em="KOSPI200"] .c-rs') || {}).innerText, dots: document.querySelectorAll('#emRS g.emdot').length, meta: (document.getElementById('emMeta') || {}).textContent }));
    // le altre viste restano utilizzabili
    await page.keyboard.press('6'); await page.waitForTimeout(1500);
    const six = await page.evaluate(() => document.querySelectorAll('#ixTable tbody tr').length);
    out.misure.push(['dati ' + nm, r, 'vista 6 righe ' + six, errs]);
    await page.screenshot({ path: `${SHOTS}e-dati-${nm.replace(/[^a-z0-9]+/gi, '-')}.png` });
    ok(six > 0, `dati ${nm}: la vista 6 non si apre`);
    ok(!errs.some((e) => /pageerror/.test(e)), `dati ${nm}: eccezione ${errs.filter((e) => /pageerror/.test(e))}`);
    if (/mancante|troncato|vuoto/.test(nm)) ok(r.loading && /non disponibili/.test(r.loading) && !r.body, `dati ${nm}: ${JSON.stringify(r)}`);
    await ctx.close();
  }
  fs.writeFileSync(__dirname + '/esito-e-percorsi.json', JSON.stringify(out, null, 1));
  console.log('controlli', out.controlli, 'problemi', out.problemi.length);
  for (const m of out.misure) console.log(JSON.stringify(m).slice(0, 600));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
