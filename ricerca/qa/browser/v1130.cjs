// 1.13.0: note più corte (parte A di ricerca/semplificazione/piano.md). Controlla, a 1440, 1280, 390 e 360 px, tema chiaro e scuro:
// - in ogni vista una sola riga di fonti in fondo, con le citazioni obbligatorie (Massimo Rea e quant-rea sempre; Serafini e
//   «VIX e VIX3M © Cboe, da FRED» nel VIX; Federal Reserve e FRED negli Emergenti; Francesco Caruso nella vista 0) e il link
//   alla sua sezione della guida (guida.html#fonti-…);
// - ogni bottone «i» visibile della vista si apre (clic sul computer, tocco sul telefono) con un testo, dentro lo schermo, e si
//   chiude toccando o cliccando fuori;
// - nessuno dei testi tolti dalla pagina è ancora visibile; nessuno scorrimento orizzontale; console senza errori;
// - a 1440 (scuro): passaggio del mouse, tastiera (Tab, Invio, Spazio, Esc con il focus che torna sul bottone), Esc con lo
//   zoom (il primo chiude il riquadro, il secondo toglie lo zoom), «i» in un <summary> che non apre il riquadro, «i» del
//   portafoglio e degli asset reali nella Rotazione;
// - guida rapida con viste, stati, glossario e comandi soltanto; guida con la sezione Fonti e note e i testi spostati; versione.
// Deve fallire sulla 1.12.0 (nessuna riga di fonti per vista, nessun bottone «i» nelle viste, testi lunghi ancora visibili).
// Uso: BASE=http://127.0.0.1:8795/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v1130.cjs   (SHOTS=0 senza immagini,
// ONLY=1440,390 solo quelle larghezze). Immagini in ricerca/qa/1.13.0/shots/.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8795/';
const SHOTS = process.env.SHOTS !== '0' ? path.join(__dirname, '..', '1.13.0', 'shots') : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, okn = 0;
const ok = (c, m) => { if (!c) { console.log(`FAIL ${m}`); fail++; } else { okn++; if (process.env.VERBOSE) console.log(`OK   ${m}`); } };

const REA = [/Massimo Rea/, /quant-rea\.com/];
const VIEWS = [
  ['mon', 'v-mon', '#boardTable tbody tr', 'fonti-mon', REA],
  ['rrg', 'v-rrg', '#rotTable tbody tr', 'fonti-rrg', REA],
  ['btm', 'v-btm', '#bm circle', 'fonti-btm', REA],
  ['XLK', 'v-sec', '#memTable tbody tr', 'fonti-sec', [...REA, /Drop giornaliero cumulato/]],
  ['tit', 'v-tit', '#titPain tbody tr', 'fonti-tit', REA],
  ['idx', 'v-idx', '#ixTable tbody tr', 'fonti-idx', REA],
  ['emg', 'v-emg', '#emTable tbody tr', 'fonti-emg', [...REA, /Federal Reserve/, /FRED/]],
  ['vix', 'v-vix', '#vxTable tbody tr', 'fonti-vix', [...REA, /VIX e VIX3M © Cboe, da FRED/, /Stefano Serafini/]],
  ['alr', 'v-alr', '#alertLog li', 'fonti-alr', REA],
  ['ath', 'v-ath', '#athTable tr.athr', 'fonti-ath', [...REA, /Francesco Caruso/]],
];
// testi tolti dalla pagina (inizio del testo di oggi nella 1.12.0): non devono più essere visibili
const GONE = [
  'Ogni riga conta gli episodi: un episodio inizia', 'Come leggere il VIX', 'Lo scatter conta i giorni', 'Fonti: VIX di chiusura',
  'Come leggere il contesto', 'Fonti: cambi in valuta locale', 'Lo stato e la breadth sono quelli della vista',
  'formula «Nuova» della rotazione (vista 2); scia di 10 settimane', 'Ogni serie ha il suo calendario',
  'Perché non coincide con il grafico di Rea', 'Calcolati da noi sui costituenti', 'Ogni punto è la divergenza del dumbbell',
  'Ordine: media della posizione', 'Ultima colonna: come è cambiata la divergenza',
  'Il drawdown conta i dividendi come reinvestiti', 'con l\'Attenzione avvisa 50 tocchi', 'in avvicinamento, attenzione, zona blu o dopo un trigger',
  'Direzione: ultimo spostamento in gradi bussola', 'Drawdown con i dividendi reinvestiti, in rosso', 'Come si calcolano le due formule',
  'come adattare i pesi e cosa cambia', 'dati, limiti e come usare questo universo', 'Composizione e cursori sotto il grafico',
  'Differenza tra la % di titoli sopra la media 200', 'il percorso di un bottom scende a sinistra', 'in zona blu si entra dopo',
  'Rendimenti del settore (ETF, dividendi inclusi)', 'Rendimenti dell\'indice (solo prezzo', 'Quanti titoli con un calo di almeno',
  'Informativo: non fa parte delle regole del semaforo', 'rendimenti a confronto sotto la tabella', 'Le modifiche valgono solo in questo browser',
  'Le regole di zona blu, trigger e cooldown sono', 'Stessa analisi dei settori sugli indici', 'Fonte della composizione:',
  'Calcolato nel browser con i livelli blu attuali', 'la GitHub Action invia solo i nuovi cambi',
  'Quanto ogni mercato è sotto il suo massimo di chiusura', 'Accanto al grafico, a destra, il profilo dei volumi',
  'Idee ispirate al lavoro di Massimo Rea', 'Dati di fine giornata: Yahoo Finance · breadth',
];
const SIZES = [['1440', { viewport: { width: 1440, height: 900 } }], ['1280', { viewport: { width: 1280, height: 900 } }],
  ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['360', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }]];
const pop = (p) => p.evaluate(() => { const x = document.getElementById('infopop'); if (!x || x.hidden) return null; const r = x.getBoundingClientRect(); return { t: x.textContent, l: r.left, r: r.right, top: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, link: (x.querySelector('.infopop-g a') || {}).href || '' }; });

(async () => {
  const b = await chromium.launch();
  for (const [vw, opt] of SIZES.filter(([v]) => !process.env.ONLY || process.env.ONLY.split(',').includes(v))) for (const theme of ['dark', 'light']) {
    const name = `${vw}-${theme === 'dark' ? 'scuro' : 'chiaro'}`, phone = !!opt.hasTouch;
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const press = async (l) => (phone ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })).catch(() => ok(false, `${name}: elemento da premere assente`));
    const outside = async () => { if (phone) await p.touchscreen.tap(4, 4); else await p.mouse.click(4, 4); await p.waitForTimeout(120); };
    await p.goto(BASE + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 }).catch(() => {});
    for (const [hash, vid, wait, anchor, cites] of VIEWS) {
      await p.evaluate((h) => { location.hash = '#' + h; }, hash);
      await p.waitForSelector(wait, { timeout: 40000, state: 'attached' }).catch(() => ok(false, `${name} ${hash}: vista non disegnata (${wait})`));
      await p.waitForTimeout(700);
      // riga di fonti: una sola, visibile, con le citazioni e il link alla sua sezione
      const src = await p.evaluate((vid) => [...document.querySelectorAll(`#${vid} .srcline`)].filter((x) => x.getClientRects().length).map((x) => ({ t: x.textContent, a: [...x.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.target]) })), vid);
      ok(src.length === 1, `${name} ${hash}: una riga di fonti visibile (${src.length})`);
      if (src.length) {
        ok(cites.every((r) => r.test(src[0].t)), `${name} ${hash}: citazioni nella riga di fonti («${src[0].t.slice(0, 80)}…»)`);
        ok(src[0].a.some(([h, t]) => h === `guida.html#${anchor}` && t === '_blank'), `${name} ${hash}: link a guida.html#${anchor}`);
      }
      // testi tolti: non visibili
      const shown = await p.evaluate(({ vid, GONE }) => { const t = document.getElementById(vid).innerText + '\n' + document.querySelector('footer.statusline').innerText; return GONE.filter((g) => t.includes(g)); }, { vid, GONE });
      ok(!shown.length, `${name} ${hash}: testi tolti ancora visibili: ${shown.join(' | ')}`);
      // bottoni «i» visibili della vista
      const n = await p.locator(`#${vid} button.info`).count();
      let seen = 0;
      for (let i = 0; i < n; i++) {
        const bt = p.locator(`#${vid} button.info`).nth(i);
        if (!(await bt.isVisible())) continue;
        seen++;
        const label = await bt.getAttribute('aria-label');
        await bt.scrollIntoViewIfNeeded().catch(() => {});
        await press(bt); await p.waitForTimeout(150);
        const q = await pop(p);
        ok(q && q.t.length > 20 && (await bt.getAttribute('aria-expanded')) === 'true', `${name} ${hash}: «${label}» si apre`);
        if (q) {
          ok(q.l >= 0 && q.r <= q.vw + 0.5 && q.top >= 0 && q.b <= q.vh + 0.5, `${name} ${hash}: «${label}» dentro lo schermo (${Math.round(q.l)}–${Math.round(q.r)} di ${q.vw}, ${Math.round(q.top)}–${Math.round(q.b)} di ${q.vh})`);
          const g = await bt.getAttribute('data-guide');
          ok(!g || q.link.endsWith(`guida.html#${g}`), `${name} ${hash}: «${label}» con il link alla guida (${q.link})`);
        }
        if (SHOTS && i === 0 && (vw === '1440' || vw === '390')) await p.screenshot({ path: path.join(SHOTS, `${hash}-i-${name}.png`) });
        await outside();
        ok(!(await pop(p)), `${name} ${hash}: «${label}» si chiude toccando fuori`);
      }
      ok(seen >= 1, `${name} ${hash}: almeno un bottone «i» visibile (${seen} di ${n})`);
      const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      ok(sw[0] <= sw[1], `${name} ${hash}: nessuno scorrimento orizzontale (${sw})`);
      if (SHOTS && (vw === '1440' || vw === '390')) await p.screenshot({ path: path.join(SHOTS, `${hash}-${name}.png`), fullPage: true });
    }

    // Monitor: una riga per stato (al massimo 15 parole), regola completa e statistiche nel riquadro
    await p.evaluate(() => { location.hash = '#mon'; }); await p.waitForTimeout(500);
    const lines = await p.$$eval('#stateLegend > div', (d) => d.map((x) => x.textContent.trim()));
    ok(lines.length === 6 && lines.every((t) => t.split(/\s+/).length <= 15), `${name}: legenda degli stati, 6 righe corte (${lines.map((t) => t.split(/\s+/).length).join(', ')} parole)`);
    await press(p.locator('button[data-src="stateHelp"]')); await p.waitForTimeout(150);
    const sh = (await pop(p)) || { t: '' };
    ok(/50 tocchi del livello su 63/.test(sh.t) && /max\(40%, livello \+ 25\)/.test(sh.t) && /escursione media giornaliera/.test(sh.t), `${name}: regola completa nel riquadro degli stati`);
    await outside();

    if (vw === '1440' && theme === 'dark') {
      // passaggio del mouse: si apre, si chiude uscendo
      await p.evaluate(() => { location.hash = '#vix'; }); await p.waitForSelector('#vxTable tbody tr'); await p.waitForTimeout(500);
      const bi = p.locator('button[data-src="vxTabHelp"]');
      await bi.scrollIntoViewIfNeeded(); await bi.hover(); await p.waitForTimeout(350);
      ok(/un episodio inizia con la prima chiusura del VIX/.test(((await pop(p)) || { t: '' }).t), `${name}: al passaggio del mouse il riquadro si apre`);
      await p.mouse.move(700, 880); await p.waitForTimeout(500);
      ok(!(await pop(p)), `${name}: uscendo con il mouse il riquadro si chiude`);
      // tastiera: Tab fino al bottone, Invio apre, Esc chiude e il focus torna sul bottone, Spazio apre
      await p.focus('#vxIx button[data-ix="NDX"]');
      let found = false;
      for (let k = 0; k < 12 && !found; k++) { await p.keyboard.press('Tab'); found = await p.evaluate(() => document.activeElement && document.activeElement.dataset.src === 'vxTabHelp'); }
      ok(found, `${name}: il bottone «i» si raggiunge con Tab`);
      await p.keyboard.press('Enter'); await p.waitForTimeout(150);
      ok(!!(await pop(p)) && (await bi.getAttribute('aria-expanded')) === 'true', `${name}: Invio apre il riquadro`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(120);
      ok(!(await pop(p)) && (await p.evaluate(() => document.activeElement.dataset.src)) === 'vxTabHelp', `${name}: Esc chiude e il focus torna sul bottone`);
      await p.keyboard.press(' '); await p.waitForTimeout(150);
      ok(!!(await pop(p)), `${name}: Spazio apre il riquadro`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(100);
      // Esc con lo zoom: il primo chiude il riquadro, il secondo toglie lo zoom
      const box = await p.locator('#vxChart').boundingBox(); await p.locator('#vxChart').scrollIntoViewIfNeeded();
      const bb = await p.locator('#vxChart').boundingBox();
      await p.mouse.move(bb.x + bb.width * 0.4, bb.y + 60); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.6, bb.y + 60, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
      const z0 = await p.evaluate(() => !document.getElementById('vxZoom').hidden);
      await p.locator('button[data-src="vxScHelp"]').click(); await p.waitForTimeout(150);
      await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      const z1 = await p.evaluate(() => !document.getElementById('vxZoom').hidden), p1 = !!(await pop(p));
      await p.keyboard.press('Escape'); await p.waitForTimeout(250);
      const z2 = await p.evaluate(() => !document.getElementById('vxZoom').hidden);
      ok(box && z0 && !p1 && z1 && !z2, `${name}: Esc con lo zoom (zoom ${z0}, dopo il primo Esc riquadro ${p1} e zoom ${z1}, dopo il secondo zoom ${z2})`);
      // «i» in un <summary>: non apre né chiude il riquadro piegato
      await p.evaluate(() => { location.hash = '#XLK'; }); await p.waitForSelector('#memTable tbody tr'); await p.waitForTimeout(500);
      const o0 = await p.evaluate(() => [document.getElementById('secEpiBox').open, document.getElementById('secCap').open]);
      await p.locator('#secEpiBox summary button.info').click(); await p.waitForTimeout(120); await p.keyboard.press('Escape');
      await p.locator('#secCap summary button.info').click(); await p.waitForTimeout(120);
      ok(/Drop giornaliero cumulato/.test(((await pop(p)) || { t: '' }).t), `${name}: riquadro dei cali forti con il testo completo`);
      await p.keyboard.press('Escape');
      const o1 = await p.evaluate(() => [document.getElementById('secEpiBox').open, document.getElementById('secCap').open]);
      ok(JSON.stringify(o0) === JSON.stringify(o1), `${name}: il «i» nel titolo dei riquadri piegati non li apre (${o0} → ${o1})`);
      // Rotazione: portafoglio e asset reali
      await p.evaluate(() => { location.hash = '#rrg'; }); await p.waitForSelector('#rotTable tbody tr'); await p.waitForTimeout(400);
      for (const [g, sel, re] of [['1 · Asset class', '#ptfPanel button.info', /Pagina su\/giù/], ['5 · Asset reali', '#mxPanel button.info', /Ottobre 2025 non è mai uscito/]]) {
        await p.selectOption('#groupSel', g); await p.waitForTimeout(800);
        await p.locator(sel).scrollIntoViewIfNeeded(); await p.locator(sel).click(); await p.waitForTimeout(150);
        ok(re.test(((await pop(p)) || { t: '' }).t), `${name}: «i» di ${g}`);
        await p.keyboard.press('Escape');
      }
      // tabella Prezzi: il «i» spiega la tabella mostrata, la riga dell'asterisco resta visibile
      await p.locator('#tableSeg button[data-mode="px"]').click(); await p.waitForTimeout(400);
      await p.selectOption('#groupSel', '1 · Asset class'); await p.waitForTimeout(800);
      await p.locator('#tableInfo').click(); await p.waitForTimeout(150);
      ok(/in rosso se più profondo dell'80% delle sedute degli ultimi 5 anni/.test(((await pop(p)) || { t: '' }).t) && /ultimo prezzo noto/.test(await p.$eval('#pxNote', (x) => (x.hidden ? '' : x.textContent))), `${name}: tabella Prezzi con il suo riquadro e l'asterisco`);
      await p.keyboard.press('Escape');
      await p.locator('#tableSeg button[data-mode="rot"]').click(); await p.selectOption('#groupSel', 'Settori S&P 500'); await p.waitForTimeout(300);
      // guida rapida: solo viste, stati, glossario e comandi
      await p.keyboard.press('?'); await p.waitForTimeout(300);
      const h = await p.evaluate(() => ({ h3: [...document.querySelectorAll('#helpModal h3')].map((x) => x.textContent), t: document.getElementById('helpModal').textContent }));
      ok(JSON.stringify(h.h3) === JSON.stringify(['Le viste', 'Stati dei settori', 'Glossario', 'Comandi e tasti']) && !/Universi globali/.test(h.t) && !/Chiusure di Yahoo Finance, aggiornate/.test(h.t) && /1–9 e 0 viste/.test(h.t), `${name}: guida rapida (${h.h3.join(', ')})`);
      await p.keyboard.press('Escape');
    }
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();

  // guida: sezione Fonti e note e testi spostati
  const g = await (await fetch(BASE + 'guida.html?x=' + Date.now())).text();
  const sec = (id) => { const i = g.indexOf(`id="${id}"`); if (i < 0) return ''; const j = g.slice(i + 5).search(/<h[23] |<section /); return g.slice(i, j < 0 ? undefined : i + 5 + j); };
  ok(/<section id="fonti">/.test(g) && VIEWS.every(([, , , a]) => g.includes(`id="${a}"`)), 'guida: sezione #fonti con una sottosezione per vista');
  ok(/con il permesso di Cboe/.test(sec('fonti-vix')) && /Stefano Serafini/.test(sec('fonti-vix')), 'guida: fonti del VIX complete');
  ok(/mezzogiorno di New York/.test(sec('fonti-emg')) && /DTWEXEMEGS/.test(sec('fonti-emg')) && /0,6%/.test(sec('fonti-emg')), 'guida: fonti degli Emergenti complete');
  ok(/0,47 punti su 60 confronti/.test(sec('fonti-tit')) && /1,6-1,7 punti/.test(sec('fonti-tit')) && /confronto_etf\.mjs/.test(sec('fonti-tit')), 'guida: dati dei Titoli con RSP e SPDR');
  ok(/11 letture del 25\/09\/2026/.test(g) && /circa 0,2 più basso/.test(g) && /emivita 26 barre/.test(sec('formule')), 'guida: formule con la verifica su StockCharts');
  ok(/8,2%/.test(sec('faq-rea')) && /5,7% sulle nostre 63 sedute/.test(sec('faq-rea')), 'guida: perché non coincide con il grafico di Rea');
  ok(/Ottobre 2025 non è mai uscito/.test(sec('asset-reali')) && /SGLD/.test(sec('asset-reali')) && /inverso/.test(sec('asset-reali')), 'guida: asset reali');
  ok(/in 15/.test(sec('emg-leggere')) && /26\/10\/2026/.test(sec('emg-leggere')) && /ricerca\/emergenti\/backtest\//.test(sec('emg-leggere')), 'guida: valuta 15 su 17 con il ricalcolo');
  ok(/89 tocchi del livello su 132/.test(g) && /ricerca\/avvicinamento-uso\//.test(g.slice(g.indexOf('id="idx-avvicinamento"'))), 'guida: 89 tocchi su 132 con lo script');
  ok(/ricerca\/vix\/.*regimi\//s.test(sec('vix-struttura')), 'guida: percorsi di ricalcolo del VIX');
  const v = await (await fetch(BASE + 'version.json?x=' + Date.now())).json();
  const js = await (await fetch(BASE + 'js/version.js?x=' + Date.now())).text();
  ok(v.version === '1.13.0' && js.includes("VERSION = '1.13.0'"), `versione ${v.version}`);
  console.log(`${okn} ok, ${fail} falliti`);
  process.exit(fail ? 1 : 0);
})();
