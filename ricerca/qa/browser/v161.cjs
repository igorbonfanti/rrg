// 1.6.1: scatter della vista VIX a tutta larghezza, un colore per crisi, alone e tabella degli episodi collegata.
// Deve fallire sulla 1.6.0 (niente elenco delle crisi né alone) e passare sulla 1.6.1.
// Uso: BASE=http://127.0.0.1:8791/ SITE=<cartella del sito> NODE_PATH=$(npm root -g) node ricerca/qa/browser/v161.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../..');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  // gruppi attesi, ricavati dai moduli sui dati del sito: crisi della data della seduta, altrimenti quella del suo episodio,
  // altrimenti l'episodio da solo
  const V = await import(path.join(SITE, 'js/vix.js'));
  const D = await (await fetch(BASE + 'data/vix.json')).json();
  const A = V.align(V.vxSeries(D.series.SPX), V.vxSeries(D.series.VIX)), S = V.scatter(A);
  const keyOf = new Map(S.eps.map((e) => [e.date, e.crisis || `ep:${e.date}`])), kp = (p) => p.crisis || keyOf.get(p.ep);
  const nPts = new Map(); for (const p of S.pts) { const k = kp(p); nPts.set(k, (nPts.get(k) || 0) + 1); }
  const n2022 = S.pts.filter((p) => p.date >= '2022-01-01' && p.date <= '2022-12-31').length;
  const covid = '2020 Covid', thr40 = V.regimes(A).thr[40].episodes.filter((e) => e.crisis === covid).length;
  console.log('atteso', nPts.size, 'gruppi;', covid, nPts.get(covid), 'punti,', thr40, 'righe sopra 40');
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark'], ['360-chiaro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }, 'light']]) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(500);
    const tap = async (loc) => (opt.hasTouch ? loc.tap() : loc.click());
    // 1. larghezza piena
    const wr = await p.evaluate(() => [document.getElementById('vxScatter').getBoundingClientRect().width, document.getElementById('vxScWrap').closest('.panel').getBoundingClientRect().width]);
    ok(wr[0] >= 0.9 * wr[1], `${name}: scatter largo quanto il pannello (${Math.round(wr[0])}/${Math.round(wr[1])})`);
    // 2. elenco delle crisi e colori distinti
    const btns = await p.$$eval('#vxCrises button', (bs) => bs.map((x) => ({ g: x.dataset.g, fill: getComputedStyle(x.querySelector('.kd')).backgroundColor })));
    ok(btns.length === nPts.size, `${name}: ${btns.length} crisi nell'elenco (attese ${nPts.size})`);
    ok(btns.length > 0 && new Set(btns.map((x) => x.fill)).size === btns.length, `${name}: un colore diverso per ogni crisi`);
    // le sedute del 2022 vanno tutte con «2022 inflazione/tassi» (non con l'episodio iniziato a dicembre 2021)
    const g22 = await p.$$eval('#vxScatter circle.vxpt', (cs) => cs.filter((c) => c.dataset.g === '2022 inflazione/tassi').length);
    ok(g22 === n2022 && g22 === nPts.get('2022 inflazione/tassi'), `${name}: ${g22} sedute del 2022 con «2022 inflazione/tassi» (attese ${n2022})`);
    const fills = await p.$$eval('#vxScatter circle.vxpt', (cs) => { const m = {}; for (const c of cs) { const f = getComputedStyle(c).fill; (m[c.dataset.g] = m[c.dataset.g] || new Set()).add(f); } return Object.values(m).map((s) => s.size); });
    ok(fills.every((n) => n === 1), `${name}: tutti i punti di una crisi hanno lo stesso colore`);
    const big = await p.$$eval('#vxScatter circle.vxpt.start', (cs) => cs.map((c) => +c.getAttribute('r')));
    ok(big.length >= 15 && big.every((r) => r >= 5), `${name}: pallini d'inizio grandi (${big.length})`);
    // 3. clic sulla crisi nell'elenco: alone con un cerchio per punto, altre spente, righe della tabella
    await tap(p.locator('#vxCrises button', { hasText: covid })); await p.waitForTimeout(200);
    const halo = await p.locator('#vxScatter .vxhalo circle').count();
    ok(halo === nPts.get(covid), `${name}: alone attorno a ${halo} punti (attesi ${nPts.get(covid)})`);
    ok(await p.$eval('#vxScatter', (s) => s.classList.contains('vxsel')), `${name}: le altre crisi si spengono`);
    const rows = await p.$$eval('#vxEps tr.sel', (rs) => rs.map((r) => r.children[1].textContent));
    ok(rows.length === thr40 && rows.every((x) => x === covid), `${name}: ${rows.length} righe della tabella evidenziate (attese ${thr40})`);
    const rowColor = await p.$eval('#vxEps tr.sel td', (td) => getComputedStyle(td).backgroundColor).catch(() => '');
    ok(/(rgba?|color)\(/.test(rowColor) && !/rgba\(0, 0, 0, 0\)/.test(rowColor), `${name}: riga colorata (${rowColor})`);
    // 4. crisi senza episodi sopra 40: lo dice
    await tap(p.locator('#vxCrises button', { hasText: '1990 Golfo' })); await p.waitForTimeout(200);
    ok(!(await p.locator('#vxEpsNone').isHidden()) && /episodi del VIX sopra 40/.test(await p.locator('#vxEpsNone').innerText()), `${name}: crisi senza episodi sopra 40 segnalata`);
    // la scritta sta sotto l'elenco delle crisi: lo scatter non si sposta
    ok(await p.evaluate(() => { const a = document.getElementById('vxEpsNone'), b = document.getElementById('vxScatter'); return a.getBoundingClientRect().top > b.getBoundingClientRect().bottom; }), `${name}: la scritta sta sotto lo scatter`);
    // 5. clic su una riga della tabella → stessa crisi nello scatter
    const row = p.locator('#vxEps tr[data-g]').first(), rg = await row.getAttribute('data-g');
    await tap(row); await p.waitForTimeout(900); // lo scatter scorre in vista con un'animazione
    ok(await p.$eval('#vxCrises button[aria-pressed="true"]', (x) => x.dataset.g).catch(() => null) === rg, `${name}: clic sulla riga evidenzia la crisi ${rg}`);
    // 6. clic su un pallino d'inizio → la sua crisi
    const dot = await p.$eval('#vxScatter circle.vxpt.start[data-g="2007-09 crisi finanziaria"]', (c) => { c.scrollIntoView({ block: 'center' }); const b = c.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
    if (opt.hasTouch) await p.touchscreen.tap(dot[0], dot[1]); else await p.mouse.click(dot[0], dot[1]);
    await p.waitForTimeout(200);
    ok(await p.$eval('#vxCrises button[aria-pressed="true"]', (x) => x.dataset.g).catch(() => null) === '2007-09 crisi finanziaria', `${name}: clic sul pallino d'inizio evidenzia la sua crisi`);
    // 7. togliere: Esc (computer) o clic su un punto vuoto
    if (opt.hasTouch) { const fb = await p.$eval('#vxScatter rect.frame', (r) => { const b = r.getBoundingClientRect(); return [b.x + b.width - 6, b.y + b.height - 6]; }); await p.touchscreen.tap(fb[0], fb[1]); } else await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    ok(!(await p.$eval('#vxScatter', (s) => s.classList.contains('vxsel'))) && (await p.locator('#vxEps tr.sel').count()) === 0, `${name}: selezione tolta`);
    // riga di un episodio senza punti nello scatter (soglia 30, inizio 27/03/2026): non cliccabile
    await tap(p.locator('#vxTable tr[data-x="30"]')); await p.waitForTimeout(300);
    const r26 = await p.$$eval('#vxEps tbody tr', (rs) => rs.filter((r) => r.children[0].textContent === '27/03/2026').map((r) => r.hasAttribute('data-g')));
    ok(r26.length === 0 || r26.every((x) => !x), `${name}: riga del 27/03/2026 non cliccabile (${r26.length ? 'presente' : 'assente'})`);
    // un secondo tocco su un punto della crisi già evidenziata la lascia accesa
    await tap(p.locator('#vxCrises button', { hasText: covid })); await p.waitForTimeout(200);
    const cd = await p.$eval(`#vxScatter circle.vxpt[data-g="${covid}"]:not(.start)`, (c) => { c.scrollIntoView({ block: 'center' }); const b = c.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
    if (opt.hasTouch) await p.touchscreen.tap(cd[0], cd[1]); else await p.mouse.click(cd[0], cd[1]);
    await p.waitForTimeout(200);
    ok(await p.$eval('#vxCrises button[aria-pressed="true"]', (x) => x.dataset.g).catch(() => null) === covid, `${name}: un altro tocco sulla crisi la lascia accesa`);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
