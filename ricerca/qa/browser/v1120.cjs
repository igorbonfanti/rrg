// 1.12.0: vista 0 «Massimi» (decima scheda, tasto 0, #ath, comandi) con il pannello della distanza dal massimo spostato dalla vista
// 8 VIX e la linea del tempo dei massimi. Controlla: scheda, tasto 0, comandi MASSIMI/MASSIMO/ATH/MAX/BOLLE, indirizzo e Indietro;
// barra delle schede 5 × 2 al telefono (390 e 360) e su una riga a 861 e 1100 px, senza scorrimento né testo tagliato; riga del
// VIX che rimanda alla vista nuova; file caricati solo alla prima apertura della vista (non con il VIX); linea del tempo con le
// chiusure della fixture (test/fixtures/peaks_20261120.json.gz, al 20/11/2026): episodi, testo di ogni riga, posizione dei punti
// e dei cerchi uguali ai valori di ricerca/rotazione-bolle/risultati.json copiati nella fixture; ordine tipico uguale a
// order.SPX15; la stessa vista con i dati di oggi; testo tagliato o fuori dal grafico; «i» con il motivo; console senza errori
// a 1440, 1280, 390 e 360 px, tema chiaro e scuro; guida, guida rapida, versione. Immagini in ricerca/qa/1.12.0/shots/.
// Deve fallire sulla 1.11.0 (nessuna scheda 0, nessuna linea del tempo).
// Uso: BASE=http://127.0.0.1:8873/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v1120.cjs  (SHOTS=0 senza immagini, ONLY=1440,390 solo
// quelle larghezze)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const BASE = process.env.BASE || 'http://127.0.0.1:8873/';
const SHOTS = process.env.SHOTS !== '0' ? path.join(__dirname, '..', '1.12.0', 'shots') : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, okn = 0;
const ok = (c, m) => { if (!c) { console.log(`FAIL ${m}`); fail++; } else { okn++; if (process.env.VERBOSE) console.log(`OK   ${m}`); } };
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const sg = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
const p1 = (x) => (x === 0 ? '0,0%' : (x > 0 ? '+' : '−') + Math.abs(x).toFixed(1).replace('.', ',') + '%');
const F = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'test', 'fixtures', 'peaks_20261120.json.gz'))));
const INFO = 'Solo descrizione: nel backtest nessun mercato anticipa i cali in modo affidabile. Dettagli nella guida.';

// testo atteso a destra (computer) o sotto (telefono) della riga, scritto qui dai valori della fixture
function want(m, narrow, ongoingEp) {
  if (m.status === 'anchor') return `${dIT(m.date)} · ${p1(m.ddPct)}${ongoingEp ? ' finora' : ''}`;
  if (m.status === 'nodata') return 'serie troppo corta';
  if (m.status === 'none') return `nessun calo ≥ 20%${m.alt15 != null ? ` (≥ 15%: ${sg(m.alt15)} g)` : ''}`;
  return `${dIT(m.date)} · ${sg(m.offset)} g · ${m.belowZero ? (narrow ? 'sotto zero' : 'sotto zero il ' + dIT(m.troughDate)) : p1(m.ddPct)}${m.ongoing ? ' finora' : ''}`;
}

(async () => {
  const live = await (await fetch(BASE + 'data/ath_history.json?x=' + Date.now())).json().catch(() => null);
  ok(live && live.series && live.series.SPX, 'dati: data/ath_history.json');
  // storico della fixture (chiusure al 20/11/2026) con i profili di oggi: la linea del tempo deve dare i valori della ricerca
  const fixHist = JSON.stringify({ ...(live || {}), series: F.series });
  const b = await chromium.launch();
  const VIEWS = [['1440', { viewport: { width: 1440, height: 900 } }], ['1280', { viewport: { width: 1280, height: 900 } }],
    ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['360', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }]];
  for (const [vw, opt] of VIEWS.filter(([v]) => !process.env.ONLY || process.env.ONLY.split(',').includes(v))) for (const theme of ['dark', 'light']) {
    const name = `${vw}-${theme === 'dark' ? 'scuro' : 'chiaro'}`, phone = !!opt.hasTouch;
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [], reqs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    p.on('request', (r) => { const u = r.url(); if (/data\/(ath|ath_history|vix)\.json/.test(u)) reqs.push(u.replace(/^.*data\//, '').replace(/\?.*$/, '')); });
    const tap = async (l) => (phone ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })).catch(() => ok(false, `${name}: elemento da toccare assente`));
    await c.route('**/data/ath_history.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fixHist }));
    await p.goto(BASE + '#mon');
    await p.waitForSelector('#tab-ath', { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(800);
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === theme, `${name}: tema`);
    // barra delle schede: 10, l'ultima «0 Massimi»; telefono 5 × 2, nessun testo tagliato, niente scorrimento
    const tabs = await p.evaluate(() => { const bar = document.querySelector('.fnkeys'); const bs = [...bar.querySelectorAll('button[data-view]')]; return { n: bs.length, last: bs.at(-1).textContent, lastView: bs.at(-1).dataset.view, cols: getComputedStyle(bar).gridTemplateColumns.split(' ').length, rows: [...new Set(bs.map((x) => Math.round(x.getBoundingClientRect().top)))].length, cut: bs.filter((x) => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1).map((x) => x.textContent), sw: bar.scrollWidth, cw: bar.clientWidth, doc: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
    ok(tabs.n === 10 && tabs.last === '0 Massimi' && tabs.lastView === 'ath', `${name}: 10 schede, l'ultima «${tabs.last}»`);
    if (phone) ok(tabs.cols === 5 && tabs.rows === 2, `${name}: schede 5 × 2 (${tabs.cols} colonne, ${tabs.rows} righe)`);
    else ok(tabs.rows === 1, `${name}: schede su una riga (${tabs.rows})`);
    ok(!tabs.cut.length && tabs.sw <= tabs.cw && tabs.doc <= tabs.vw, `${name}: schede senza testo tagliato né scorrimento (${tabs.cut.join(', ')}; ${tabs.sw}/${tabs.cw}; pagina ${tabs.doc}/${tabs.vw})`);
    if (SHOTS && phone) await p.locator('.fnkeys').screenshot({ path: path.join(SHOTS, `schede-${name}.png`) });
    ok(!reqs.includes('ath.json') && !reqs.includes('ath_history.json'), `${name}: all'avvio nessun file dei massimi (${reqs.join(', ')})`);
    // vista VIX: niente pannello, una riga che rimanda alla vista 0; nessun file dei massimi
    await tap(p.locator('#tab-vix')); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300);
    const vx = await p.evaluate(() => { const m = document.getElementById('vxAthMoved'); const a = m && m.querySelector('a'); return { vis: !!m && !m.hidden && m.getBoundingClientRect().height > 0, text: m ? m.textContent : '', href: a ? a.getAttribute('href') : '', panel: !!document.querySelector('#v-vix #athPanel, #v-vix #athTable') }; });
    ok(vx.vis && vx.text === 'Distanza dal massimo: ora nella scheda 0 Massimi →' && vx.href === '#ath' && !vx.panel, `${name}: VIX con il rimando «${vx.text}» e senza il pannello`);
    ok(!reqs.includes('ath.json') && !reqs.includes('ath_history.json'), `${name}: la vista VIX non scarica i file dei massimi (${reqs.join(', ')})`);
    if (SHOTS && vw === '1440') await p.locator('#vxAthMoved').screenshot({ path: path.join(SHOTS, `vix-rimando-${name}.png`) });
    await tap(p.locator('#vxAthMoved a'));
    await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 }).catch(() => {});
    ok(await p.evaluate(() => location.hash === '#ath' && !document.getElementById('v-ath').hidden && document.getElementById('tab-ath').getAttribute('aria-selected') === 'true'), `${name}: il rimando apre la vista 0`);
    ok(reqs.includes('ath.json') && reqs.includes('ath_history.json'), `${name}: la vista 0 scarica i suoi file (${reqs.join(', ')})`);
    await p.waitForSelector('#pkBody .pkep svg .pkdot', { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(300);
    ok((await p.$$('#athTable tbody tr.athr')).length === 9, `${name}: tabella della distanza con 9 righe`);
    // linea del tempo: episodi e righe uguali alla fixture
    const got = await p.evaluate(() => [...document.querySelectorAll('#pkBody .pkep')].map((box) => {
      const svg = box.querySelector('svg'), vb = svg.viewBox.baseVal;
      return { peak: box.dataset.peak, h3: box.querySelector('h3').textContent, narrow: svg.classList.contains('nar'), x0: +svg.dataset.x0, x1: +svg.dataset.x1, W: vb.width,
        notes: Object.fromEntries([...svg.querySelectorAll('text.pknote')].map((t) => { const bb = t.getBBox(); return [t.dataset.id, { t: t.textContent, l: bb.x, r: bb.x + bb.width }]; })),
        labels: [...svg.querySelectorAll('text.pklab')].map((t) => { const bb = t.getBBox(); return { t: t.textContent, l: bb.x }; }),
        dots: [...svg.querySelectorAll('circle.pkdot')].map((q) => ({ id: q.dataset.id, o: +q.dataset.o, cx: +q.getAttribute('cx') })),
        alts: [...svg.querySelectorAll('circle.pkalt')].map((q) => ({ id: q.dataset.id, o: +q.dataset.o, cx: +q.getAttribute('cx') })) };
    }));
    ok(JSON.stringify(got.map((g) => g.peak)) === JSON.stringify(F.timeline.map((e) => e.peak)), `${name}: episodi ${got.map((g) => g.peak).join(' ')}`);
    const bad = [];
    got.forEach((g, k) => {
      const e = F.timeline[k]; if (!e) return;
      const h = `Massimo S&P 500 ${dIT(e.peak)} · calo ${p1(e.ddPct)}${e.ongoing ? ' in corso' : ''}`;
      if (g.h3 !== h) bad.push(`titolo «${g.h3}» ≠ «${h}»`);
      for (const id of F.ids) {
        const m = e.markets[id], w = want(m, g.narrow, e.ongoing), n = g.notes[id];
        if (!n || n.t !== w) bad.push(`${e.peak} ${id}: «${n && n.t}» ≠ «${w}»`);
        if (n && (n.r > g.W + 0.5 || n.l < -0.5)) bad.push(`${e.peak} ${id}: testo fuori dal grafico (${n.l.toFixed(0)}-${n.r.toFixed(0)} su ${g.W})`);
        const dots = g.dots.filter((d) => d.id === id), alts = g.alts.filter((d) => d.id === id).map((d) => d.o).sort((a, b) => a - b);
        const wantDots = m.status === 'peak' || m.status === 'anchor' ? [m.offset] : [];
        if (JSON.stringify(dots.map((d) => d.o)) !== JSON.stringify(wantDots)) bad.push(`${e.peak} ${id}: punto ${dots.map((d) => d.o)} ≠ ${wantDots}`);
        if (JSON.stringify(alts) !== JSON.stringify([...m.others].sort((a, b) => a - b))) bad.push(`${e.peak} ${id}: cerchi ${alts} ≠ ${m.others}`);
        // posizione sul grafico: la x del punto riletta in giorni dalla scala (x di −365 e +365)
        for (const d of [...dots, ...g.alts.filter((q) => q.id === id)]) { const days = -365 + ((d.cx - g.x0) / (g.x1 - g.x0)) * 730; if (Math.abs(days - d.o) > 1) bad.push(`${e.peak} ${id}: punto a ${days.toFixed(1)} giorni invece di ${d.o}`); }
      }
      if (g.labels.some((l) => l.l < -0.5)) bad.push(`${e.peak}: etichetta tagliata a sinistra`);
    });
    ok(!bad.length, `${name}: linea del tempo uguale alla ricerca (5 episodi × 9 mercati: testo, punti, cerchi, posizione) ${bad.slice(0, 6).join(' | ')}${bad.length > 6 ? ` (+${bad.length - 6})` : ''}`);
    // ordine tipico
    const ord = await p.evaluate(() => [...document.querySelectorAll('#pkOrder .pkord')].map((s) => ({ t: s.textContent, title: s.getAttribute('title') })));
    const lab = { BTC: 'Bitcoin', GOLD: 'Oro', SILVER: 'Argento', COPPER: 'Rame', WTI: 'Petrolio WTI', NDX: 'Nasdaq-100', SPX: 'S&P 500', SOXX: 'Semiconduttori', KOSPI: 'KOSPI (Corea)' };
    const wantOrd = Object.entries(F.order).sort((a, b) => a[1].meanRankNorm - b[1].meanRankNorm).map(([id, o]) => `${lab[id]} ${o.meanRankNorm.toFixed(2).replace('.', ',')}`);
    ok(JSON.stringify(ord.map((o) => o.t)) === JSON.stringify(wantOrd), `${name}: ordine tipico ${ord.map((o) => o.t).join(' · ')}`);
    const k0 = ord.find((o) => o.t.startsWith('KOSPI')) || { title: '' }, ko = F.order.KOSPI;
    ok(k0.title.includes(`in ${ko.withPeak} cali su 8: ${ko.before} prima, ${ko.together} insieme, ${ko.after} dopo`) && k0.title.includes(`scarto mediano ${sg(ko.medianOffset)} giorni`), `${name}: dettaglio del KOSPI nell'ordine «${k0.title.slice(0, 80)}…»`);
    ok(/negli 8 cali dell'S&P 500 di almeno il 15% dal 2000 al 2025/.test(await p.$eval('#pkOrder .pkordh', (x) => x.title).catch(() => '')), `${name}: ordine tipico con il periodo nel suggerimento`);
    // intestazione: «i» con il motivo, riga dei dati
    const head = await p.evaluate(() => ({ h2: (document.querySelector('#pkPanel h2') || {}).textContent, i: (document.querySelector('#pkPanel .ihint') || {}).title, meta: (document.getElementById('pkMeta') || {}).textContent }));
    ok(head.h2 === 'Linea del tempo dei massimi' && head.i === INFO && head.meta === `ultimi 4 cali ≥ 15% dell'S&P 500 e quello in corso · chiusure al ${dIT(F.asOf)}`, `${name}: intestazione «${head.h2}», «i» e «${head.meta}»`);
    if (phone) {
      await tap(p.locator('#pkPanel .ihint')); await p.waitForTimeout(200);
      const tt = await p.evaluate(() => { const t = document.querySelector('.taptip'); return t && !t.hidden ? t.textContent : ''; });
      ok(tt === INFO, `${name}: al tocco la «i» mostra il motivo («${tt.slice(0, 40)}…»)`);
      await p.mouse.click(5, 5).catch(() => {}); await p.waitForTimeout(100);
    }
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale nella vista 0 (${sw})`);
    if (SHOTS) {
      await p.screenshot({ path: path.join(SHOTS, `vista0-${name}.png`), fullPage: true });
      await p.locator('#pkPanel').screenshot({ path: path.join(SHOTS, `linea-${name}.png`) });
    }
    // tasto 0 e comandi
    await tap(p.locator('#tab-mon')); await p.waitForTimeout(200);
    if (!phone) {
      await p.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => {});
      await p.keyboard.press('0'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => location.hash === '#ath' && !document.getElementById('v-ath').hidden), `${name}: il tasto 0 apre la vista 0`);
      await p.keyboard.press('8'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => location.hash === '#vix'), `${name}: il tasto 8 resta il VIX`);
      await p.keyboard.press('9'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => location.hash === '#alr'), `${name}: il tasto 9 resta Alert`);
      await p.goBack(); await p.waitForTimeout(300);
      ok(await p.evaluate(() => location.hash === '#vix'), `${name}: Indietro torna alla vista di prima`);
    }
    for (const cmd of ['MASSIMI', 'MASSIMO', 'ATH', 'MAX', 'BOLLE', 'massimi']) {
      await tap(p.locator('#tab-mon')); await p.waitForTimeout(100);
      await p.fill('#cmd', cmd); await p.press('#cmd', 'Enter'); await p.waitForTimeout(250);
      ok(await p.evaluate(() => location.hash === '#ath' && !document.getElementById('v-ath').hidden), `${name}: il comando ${cmd} apre la vista 0`);
    }
    await p.fill('#cmd', 'VIX'); await p.press('#cmd', 'Enter'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => location.hash === '#vix'), `${name}: il comando VIX resta la vista 8`);
    // guida rapida: la vista 0 e i tasti
    if (!phone) {
      await p.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => {});
      await p.keyboard.press('0'); await p.waitForTimeout(200);
      await p.keyboard.press('?'); await p.waitForTimeout(200);
      const help = await p.evaluate(() => ({ t: document.getElementById('helpModal').textContent, g: document.getElementById('guideLink').getAttribute('href') }));
      ok(/0 Massimi/.test(help.t) && /1–9 e 0 viste/.test(help.t) && /MASSIMI/.test(help.t) && help.g === 'guida.html#ath', `${name}: guida rapida con la vista 0, i tasti e il link alla sezione (${help.g})`);
      await p.keyboard.press('Escape');
    }
    ok(/massimi \(vista 0\): idea di Francesco Caruso/.test(await p.$eval('#srcLine', (x) => x.textContent).catch(() => '')), `${name}: piè di pagina`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  // con i dati di oggi (senza la fixture): 5 episodi, l'ultimo in corso, nessun errore; a 861 e 1100 px le schede su una riga
  for (const [vw, h] of [[1440, 900], [861, 900], [1100, 900]]) {
    const c = await b.newContext({ viewport: { width: vw, height: h } });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#ath'); await p.waitForSelector('#pkBody .pkep svg .pkdot', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300);
    const st = await p.evaluate(() => { const bar = document.querySelector('.fnkeys'); const bs = [...bar.querySelectorAll('button[data-view]')]; return { eps: [...document.querySelectorAll('#pkBody .pkep')].map((x) => x.querySelector('h3').textContent), rows: [...new Set(bs.map((x) => Math.round(x.getBoundingClientRect().top)))].length, sw: bar.scrollWidth, cw: bar.clientWidth, doc: document.documentElement.scrollWidth, dvw: document.documentElement.clientWidth }; });
    ok(st.eps.length === 5 && /in corso$/.test(st.eps[4]) && st.eps.slice(0, 4).every((t) => !/in corso/.test(t)), `dati di oggi ${vw}: 5 episodi, l'ultimo in corso (${st.eps.at(-1)})`);
    ok(st.rows === 1 && st.sw <= st.cw && st.doc <= st.dvw, `${vw} px: schede su una riga, senza scorrimento (${st.rows} righe, ${st.sw}/${st.cw})`);
    if (SHOTS && vw !== 1440) await p.locator('.fnkeys').screenshot({ path: path.join(SHOTS, `schede-${vw}.png`) });
    ok(!errs.length, `dati di oggi ${vw}: console ${errs.join(' | ')}`);
    await c.close();
  }
  // senza data/ath_history.json: la linea del tempo lo dice, la tabella c'è; senza data/ath.json la tabella lo dice
  for (const miss of ['ath_history', 'ath']) {
    const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    await c.route(`**/data/${miss}.json*`, (r) => r.fulfill({ status: 404, body: '' }));
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '#ath'); await p.waitForTimeout(2500);
    const st = await p.evaluate(() => { const t = (id) => { const e = document.getElementById(id); return e && !e.hidden ? e.textContent : ''; }; return { pk: t('pkMiss'), eps: document.querySelectorAll('#pkBody .pkep').length, rows: document.querySelectorAll('#athTable tr.athr').length, am: t('athMiss') }; });
    if (miss === 'ath_history') ok(/non disponibile/.test(st.pk) && st.eps === 0 && st.rows === 9, `senza ath_history.json: «${st.pk}», tabella con ${st.rows} righe`);
    else ok(/non disponibili/.test(st.am) && st.rows === 0 && st.eps === 5, `senza ath.json: «${st.am.slice(0, 50)}…», linea del tempo con ${st.eps} episodi`);
    ok(!errs.length, `senza ${miss}.json: nessun errore ${errs.join(' | ')}`);
    await c.close();
  }
  // guida, versione
  const gd = await (await fetch(BASE + 'guida.html?x=' + Date.now())).text();
  ok(/<section id="ath">/.test(gd) && /<h2>0 Massimi<\/h2>/.test(gd) && /id="massimi"/.test(gd) && /id="profilo-volumi"/.test(gd) && /id="linea-massimi"/.test(gd), 'guida: sezione #ath con #massimi, #profilo-volumi e #linea-massimi');
  const sec = gd.slice(gd.indexOf('<section id="ath">'), gd.indexOf('</section>', gd.indexOf('<section id="ath">')));
  ok(sec.includes('id="massimi"') && sec.includes('id="profilo-volumi"') && sec.includes('id="linea-massimi"'), 'guida: le tre parti stanno dentro la sezione #ath');
  const ordTxt = Object.values(F.order).map((o) => o.meanRankNorm.toFixed(2).replace('.', ','));
  ok(ordTxt.every((t) => sec.includes(t)) && /80 e 71 giorni prima/.test(sec) && /161 giorni dopo/.test(sec) && /79,3%/.test(sec) && /solo 3/.test(sec), 'guida: numeri dell\'ordine tipico e del backtest');
  const v = await (await fetch(BASE + 'version.json?x=' + Date.now())).json();
  const js = await (await fetch(BASE + 'js/version.js?x=' + Date.now())).text();
  ok(v.version === '1.12.0' && /VERSION = '1\.12\.0'/.test(js), `versione ${v.version}`);
  await b.close(); console.log(`${okn} OK, ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
