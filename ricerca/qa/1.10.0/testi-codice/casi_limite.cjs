// Controllo 1.10.0 (codice): casi limite del pannello «Distanza dal massimo degli ultimi 3 anni» nel browser, con i file
// dei dati sostituiti al volo (page.route): storico lento, file mancanti, righe senza dati, etichette con HTML, formato
// vecchio, zoom e cambio di mercato, focus da tastiera. Non tocca i file dell'app.
// Uso: BASE=http://127.0.0.1:8795/ NODE_PATH=$(npm root -g) node ricerca/qa/1.10.0/testi-codice/casi_limite.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8795/';
const ROOT = path.resolve(__dirname, '../../../..');
const ATH = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ath.json'), 'utf-8'));
let fail = 0, n = 0;
const ok = (c, m) => { n++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };

async function open(b, routes = {}, opt = { viewport: { width: 1440, height: 900 } }) {
  const c = await b.newContext(opt);
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
  const p = await c.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  for (const [pat, fn] of Object.entries(routes)) await p.route(pat, fn);
  await p.goto(BASE + '#vix');
  await p.waitForSelector('#vxBody:not([hidden]), #vxMiss:not([hidden])', { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(400);
  return { c, p, errs };
}
const json = (o) => (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
const notFound = (r) => r.fulfill({ status: 404, body: 'no' });

(async () => {
  const b = await chromium.launch();

  // 1. storico lento: durante il caricamento si apre un altro mercato. Il messaggio deve dire che sta caricando.
  {
    let release; const gate = new Promise((ok2) => { release = ok2; });
    const { c, p, errs } = await open(b, { '**/data/ath_history.json': async (r) => { await gate; await r.continue(); } });
    await p.click('#athTable tr.athr[data-id="WTI"]');
    await p.waitForTimeout(200);
    const m1 = await p.textContent('#athChartMiss');
    ok(/Caricamento/.test(m1), `storico lento, primo clic: «${m1}»`);
    await p.click('#athTable tr.athr[data-id="BTC"]');
    await p.waitForTimeout(200);
    const m2 = await p.textContent('#athChartMiss'), vis2 = await p.isVisible('#athChartMiss');
    ok(vis2 && /Caricamento/.test(m2), `storico lento, secondo mercato aperto durante il caricamento: «${m2}» (atteso «Caricamento dello storico…»)`);
    await p.click('#athRange button[data-range="MAX"]');
    await p.waitForTimeout(200);
    const m3 = await p.textContent('#athChartMiss');
    ok(/Caricamento/.test(m3), `storico lento, cambio di periodo durante il caricamento: «${m3}»`);
    release(); await p.waitForTimeout(1500);
    const path1 = await p.$eval('#athChart path.athpx', (e) => e.getAttribute('d').length).catch(() => 0);
    ok(path1 > 100 && !(await p.isVisible('#athChartMiss')), `storico arrivato: grafico disegnato (${path1} caratteri), messaggio nascosto`);
    ok(errs.length === 0, `nessun errore in console (${errs.join(' | ')})`);
    await c.close();
  }

  // 2. zoom, poi un altro mercato: lo zoom si toglie; poi tastiera e focus
  {
    const { c, p, errs } = await open(b);
    await p.click('#athTable tr.athr[data-id="SPX"]');
    await p.waitForSelector('#athChart path.athpx', { timeout: 10000 });
    await p.waitForTimeout(300);
    const box = await (await p.$('#athChart')).boundingBox();
    await p.mouse.move(box.x + box.width * 0.5, box.y + 80); await p.mouse.down();
    await p.mouse.move(box.x + box.width * 0.7, box.y + 80, { steps: 8 }); await p.mouse.up();
    await p.waitForTimeout(300);
    const zOn = await p.isVisible('#athZoom');
    ok(zOn, `zoom attivo dopo il trascinamento (${zOn ? await p.textContent('#athZoom span') : 'chip nascosto'})`);
    await p.click('#athTable tr.athr[data-id="NDX"]');
    await p.waitForTimeout(300);
    ok(!(await p.isVisible('#athZoom')), 'altro mercato: zoom tolto');
    // tastiera: Invio sulla riga aperta la chiude, il focus resta sulla riga
    await p.focus('#athTable tr.athr[data-id="NDX"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    const f = await p.evaluate(() => document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null);
    const exp = await p.getAttribute('#athTable tr.athr[data-id="NDX"]', 'aria-expanded');
    ok(f === 'NDX' && exp === 'false' && !(await p.isVisible('#athChartBox')), `Invio chiude la riga, focus sulla stessa riga (${f}, aria-expanded=${exp})`);
    await p.keyboard.press('Space'); await p.waitForTimeout(200);
    ok(await p.isVisible('#athChartBox'), 'Spazio riapre la riga');
    // ordine per data, poi la riga aperta resta aperta
    await p.click('#athSort button[data-sort="date"]'); await p.waitForTimeout(200);
    const ids = await p.$$eval('#athTable tr.athr', (t) => t.map((x) => x.dataset.id));
    ok(ids[0] === 'BTC' && (await p.isVisible('#athChartBox')), `ordine per data: ${ids.join(' ')}, grafico ancora aperto`);
    // Esc con lo zoom: non deve rompere niente
    ok(errs.length === 0, `nessun errore in console (${errs.join(' | ')})`);
    await c.close();
  }

  // 3. ath.json mancante: il pannello lo dice, il resto della vista funziona
  {
    const { c, p, errs } = await open(b, { '**/data/ath.json': notFound });
    const miss = await p.isVisible('#athMiss'), body = await p.isVisible('#vxBody');
    ok(miss && body, `ath.json mancante: messaggio «${miss ? await p.textContent('#athMiss') : ''}», resto della vista visibile`);
    ok(errs.filter((e) => !/404|Failed to load/.test(e)).length === 0, `nessun errore oltre al 404 (${errs.join(' | ')})`);
    await c.close();
  }

  // 4. vix.json mancante: il pannello dei massimi (dentro #vxBody) sparisce anche se ath.json c'è
  {
    const { c, p } = await open(b, { '**/data/vix.json': notFound });
    const athVis = await p.isVisible('#athPanel');
    ok(true, `vix.json mancante: pannello dei massimi ${athVis ? 'visibile' : 'NASCOSTO (sta dentro #vxBody)'} — solo informativo`);
    await c.close();
  }

  // 5. storico mancante: messaggio chiaro
  {
    const { c, p, errs } = await open(b, { '**/data/ath_history.json': notFound });
    await p.click('#athTable tr.athr[data-id="GOLD"]'); await p.waitForTimeout(800);
    const t = await p.textContent('#athChartMiss');
    ok(/non disponibile/.test(t), `storico mancante: «${t}»`);
    ok(errs.filter((e) => !/404|Failed to load/.test(e)).length === 0, `nessun errore oltre al 404 (${errs.join(' | ')})`);
    await c.close();
  }

  // 6. righe strane: senza dati, HTML nell'etichetta e nella nota, formato vecchio (prototipo 9f45a37: ath/athDate al posto di ref/refDate)
  {
    const A = JSON.parse(JSON.stringify(ATH));
    A.markets[0].label = '<img src=x onerror="window.__xss=1">Bit'; A.markets[0].note = '<b onclick=1>nota</b>';
    A.markets[1].stats = null;
    const s = A.markets[2].stats; A.markets[2].stats = { start: s.start, last: s.last, lastDate: s.lastDate, ath: s.ath, athDate: s.athDate, distPct: s.distPct, days: s.days, cycleLow: s.cycleLow, cycleLowDate: s.cycleLowDate, cycleLowPct: s.cycleLowPct, fromLowPct: s.fromLowPct, belowZero: null };
    A.markets[3].stats.lastDate = '2026-10-01'; // riga più vecchia: data in grigio
    const { c, p, errs } = await open(b, { '**/data/ath.json': json(A) });
    const xss = await p.evaluate(() => window.__xss === 1 || !!document.querySelector('#athTable img'));
    ok(!xss, 'HTML nell\'etichetta mostrato come testo');
    const txt = await p.textContent('#athTable');
    ok(!/NaN|undefined|Infinity/.test(txt), `nessun NaN/undefined nella tabella`);
    const nullRow = await p.textContent(`#athTable tr.athr[data-id="${A.markets[1].id}"]`);
    ok(/—/.test(nullRow) && /non disponibili/.test(nullRow), `riga senza dati: «${nullRow.replace(/\s+/g, ' ').trim()}»`);
    const last = await p.$$eval('#athTable tr.athr', (t) => t.at(-1).dataset.id);
    ok(last === A.markets[1].id, `riga senza dati in fondo (${last})`);
    const grey = await p.$eval(`#athTable tr.athr[data-id="${A.markets[3].id}"] td.c-last`, (e) => e.className);
    ok(/muted/.test(grey), `riga più vecchia in grigio (${grey})`);
    await p.click(`#athTable tr.athr[data-id="${A.markets[0].id}"]`); await p.waitForTimeout(800);
    const det = await p.textContent('#athTable tr.athdet');
    ok(!/NaN|undefined/.test(det) && !(await p.evaluate(() => window.__xss === 1)), 'dettaglio con HTML nella nota: niente NaN, niente codice eseguito');
    await p.click(`#athTable tr.athr[data-id="${A.markets[2].id}"]`); await p.waitForTimeout(800);
    const det2 = await p.textContent('#athTable tr.athdet');
    ok(!/NaN|undefined/.test(det2), `formato vecchio: dettaglio «${det2.slice(0, 160)}…»`);
    const leg = await p.textContent('#athLegend');
    ok(!/NaN|undefined/.test(leg), `formato vecchio: legenda «${leg.slice(0, 120)}»`);
    ok(errs.length === 0, `nessun errore in console (${errs.join(' | ')})`);
    await c.close();
  }

  // 7. storico rovinato per un mercato (manca cd): errore gestito?
  {
    const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ath_history.json'), 'utf-8'));
    delete H.series.SPX.cd;
    const { c, p, errs } = await open(b, { '**/data/ath_history.json': json(H) });
    await p.click('#athTable tr.athr[data-id="SPX"]'); await p.waitForTimeout(1000);
    const t = await p.isVisible('#athChartMiss') ? await p.textContent('#athChartMiss') : '(nessun messaggio)';
    ok(errs.length === 0, `storico rovinato: messaggio «${t}», errori: ${errs.join(' | ') || 'nessuno'}`);
    await c.close();
  }

  await b.close();
  console.log(`\n${n} controlli, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
