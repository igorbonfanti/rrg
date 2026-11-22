// Controllo indipendente 1.12.0 (codice nel browser): richieste di rete per vista (caricamento pigro, niente vix.json in #ath,
// niente ath*.json nel VIX), tasto 0 (anche con il focus nel campo comandi e con le scorciatoie spente), hash e Indietro,
// file mancanti (ath.json, ath_history.json), riga del VIX che rimanda a #ath, console. Uso:
// BASE=http://127.0.0.1:8817/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/numeri-codice/codice.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8817/';
let fail = 0, n = 0;
const chk = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } else if (process.env.VERBOSE) console.log('OK  ', m); };
async function page(b, opt = {}) {
  const ctx = await b.newContext({ viewport: { width: opt.w || 1440, height: 900 } });
  const p = await ctx.newPage(), req = [], errs = [];
  p.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/data/')) req.push(u.pathname); });
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  for (const f of opt.block || []) await p.route('**/data/' + f + '*', (r) => r.abort());
  return { p, req, errs, ctx };
}
(async () => {
  const b = await chromium.launch();
  // 1. #ath diretto: carica ath.json e ath_history.json, non vix.json
  { const { p, req, errs, ctx } = await page(b); await p.goto(BASE + '#ath'); await p.waitForSelector('#pkBody .pkdot', { timeout: 30000 });
    chk(req.includes('/data/ath.json') && req.includes('/data/ath_history.json'), '#ath: scarica ath.json e ath_history.json');
    chk(!req.includes('/data/vix.json'), '#ath: non scarica vix.json ' + req.join(','));
    chk(await p.getAttribute('#tab-ath', 'aria-selected') === 'true', '#ath: scheda 0 selezionata');
    chk((await p.locator('#pkBody .pkep').count()) === 5, '#ath: 5 riquadri');
    chk(errs.length === 0, '#ath console: ' + errs.join(' | ')); await ctx.close(); }
  // 2. #mon poi VIX: nessun file dei massimi; poi tasto 0: li scarica; Indietro torna al VIX
  { const { p, req, errs, ctx } = await page(b); await p.goto(BASE + '#mon'); await p.waitForTimeout(1500);
    chk(!req.some((r) => r.startsWith('/data/ath')), '#mon: niente file dei massimi');
    await p.keyboard.press('8'); await p.waitForSelector('#vxBody:not([hidden])', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(500);
    chk(req.includes('/data/vix.json') && !req.some((r) => r.startsWith('/data/ath')), 'tasto 8: vix.json sì, file dei massimi no ' + req.join(','));
    chk(await p.isVisible('#vxAthMoved a[href="#ath"]'), 'VIX: riga che rimanda a #ath visibile');
    chk((await p.locator('#v-vix #athPanel, #v-vix #pkPanel').count()) === 0, 'VIX: niente pannelli dei massimi dentro la vista');
    chk((await p.locator('#vxKpis .kpi, #vxKpis > *').count()) > 0, 'VIX: riquadri presenti');
    await p.keyboard.press('0'); await p.waitForSelector('#pkBody .pkdot', { timeout: 30000 });
    chk(new URL(p.url()).hash === '#ath', 'tasto 0: indirizzo #ath (' + p.url() + ')');
    chk(req.includes('/data/ath_history.json'), 'tasto 0: scarica lo storico');
    const nh = req.filter((r) => r === '/data/ath_history.json').length;
    await p.keyboard.press('8'); await p.waitForTimeout(300); await p.keyboard.press('0'); await p.waitForTimeout(800);
    chk(req.filter((r) => r === '/data/ath_history.json').length === nh, 'seconda apertura: lo storico non si riscarica');
    await p.goBack(); await p.waitForTimeout(500);
    chk(new URL(p.url()).hash === '#vix' && await p.isVisible('#v-vix'), 'Indietro: torna al VIX (' + p.url() + ')');
    // clic sul collegamento della riga del VIX
    await p.click('#vxAthMoved a'); await p.waitForTimeout(500);
    chk(await p.isVisible('#v-ath'), 'clic su «0 Massimi →» apre la vista');
    // tasto 0 dentro il campo comandi: non cambia vista
    await p.keyboard.press('1'); await p.waitForTimeout(300); await p.click('#cmd'); await p.keyboard.type('0');
    chk(await p.isVisible('#v-mon') && !(await p.isVisible('#v-ath')), 'tasto 0 nel campo comandi: resta sul Monitor');
    await p.fill('#cmd', 'MASSIMI'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    chk(await p.isVisible('#v-ath'), 'comando MASSIMI'); await p.keyboard.press('1');
    for (const w of ['bolle', 'Ath', 'MAX', 'massimo']) { await p.fill('#cmd', w); await p.keyboard.press('Enter'); await p.waitForTimeout(300); chk(await p.isVisible('#v-ath'), 'comando ' + w); await p.keyboard.press('1'); await p.waitForTimeout(200); }
    chk(errs.length === 0, 'console: ' + errs.join(' | ')); await ctx.close(); }
  // 3. senza ath_history.json: messaggio, nessun errore
  { const { p, errs, ctx } = await page(b, { block: ['ath_history.json'] }); await p.goto(BASE + '#ath'); await p.waitForTimeout(3000);
    const t = await p.textContent('#pkMiss'); chk(await p.isVisible('#pkMiss') && /non disponibile/.test(t), 'senza storico: «' + t + '»');
    chk((await p.locator('#pkBody .pkep').count()) === 0, 'senza storico: nessun riquadro');
    chk(errs.length === 0, 'senza storico, console: ' + errs.join(' | ')); await ctx.close(); }
  // 4. senza ath.json: la linea del tempo si fa lo stesso (etichette = id)
  { const { p, errs, ctx } = await page(b, { block: ['ath.json'] }); await p.goto(BASE + '#ath'); await p.waitForTimeout(4000);
    const k = await p.locator('#pkBody .pkep').count(), lab = await p.locator('#pkBody .pkep:first-child .pklab').allTextContents();
    console.log('  senza ath.json: riquadri', k, 'etichette', lab.join(','), 'pkMiss', await p.isVisible('#pkMiss') ? await p.textContent('#pkMiss') : '(nascosto)', 'athMiss', await p.isVisible('#athMiss') ? await p.textContent('#athMiss') : '(nascosto)');
    chk(errs.length === 0, 'senza ath.json, console: ' + errs.join(' | ')); await ctx.close(); }
  // 5. scorciatoie spente: il tasto 0 non cambia vista
  { const { p, ctx } = await page(b); await p.goto(BASE + '#mon'); await p.waitForTimeout(1000);
    await p.keyboard.press('?'); await p.waitForTimeout(300); const cb = p.locator('#kbToggle');
    if (await cb.isVisible()) { await cb.uncheck(); await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.locator('body').click({ position: { x: 5, y: 400 } }).catch(() => {}); await p.keyboard.press('0'); await p.waitForTimeout(300); chk(!(await p.isVisible('#v-ath')), 'scorciatoie spente: il tasto 0 non apre la vista'); }
    else chk(false, 'interruttore delle scorciatoie non trovato'); await ctx.close(); }
  await b.close();
  console.log(`controlli: ${n}, falliti: ${fail}`);
  process.exit(fail ? 1 : 0);
})();
