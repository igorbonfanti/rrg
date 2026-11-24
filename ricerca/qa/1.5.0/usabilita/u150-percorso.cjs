// Percorso «il VIX è alto, cosa è successo di solito dopo?» e controlli vari (guida dalla vista, testi coerenti, ruoli, larghezze frazionarie).
// Uso: NODE_PATH=$(npm root -g) node u150-percorso.cjs [base]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.argv[2] || 'http://127.0.0.1:8798/';
const OUT = __dirname, SHOTS = path.join(OUT, 'shots');
const R = [];
const check = (id, ok, what, detail) => { R.push({ id, ok: !!ok, what, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${id} ${what}${detail != null ? ' · ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(BASE + '#vix');
  await page.waitForFunction(() => !document.getElementById('vxBody').hidden, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  // 1. cosa vede chi arriva: VIX di oggi e fascia, riga di default
  const s = await page.evaluate(() => ({
    kpis: [...document.querySelectorAll('#vxKpis .kpi')].map((k) => k.innerText.replace(/\n/g, ' | ')),
    defaultRow: document.querySelector('#vxTable tr.sel')?.dataset.x,
    meta: document.getElementById('vxMeta').textContent,
    rows: [...document.querySelectorAll('#vxTable tbody tr')].map((r) => r.innerText.replace(/\s+/g, ' ')),
    robust: [...document.querySelectorAll('#vxTable .vxrob')].map((p) => p.closest('tr').dataset.x),
    kpiTitles: [...document.querySelectorAll('#vxKpis .kpi')].map((k) => !!k.title),
    tableTop: Math.round(document.getElementById('vxTable').getBoundingClientRect().top), vh: innerHeight,
  }));
  console.log(JSON.stringify(s, null, 1));
  const vix = parseFloat(s.kpis[0].split('|')[1].replace(',', '.'));
  const applicable = [20, 25, 30, 40, 50].filter((x) => vix >= x).pop();
  check('path.today', !isNaN(vix), 'riquadro VIX leggibile', { vix, applicable: applicable || 'nessuna soglia superata', defaultRow: s.defaultRow });
  check('path.tablefold', s.tableTop < s.vh, 'la tabella «Dopo i picchi» si vede senza scorrere a 1440×900', { top: s.tableTop, vh: s.vh });
  check('path.robust40', s.robust.join() === '40', 'solo la soglia 40 segnata «robusto»', s.robust);
  const n40 = await page.evaluate(() => +document.querySelector('#vxTable tr[data-x="40"] td:nth-child(2)').textContent);
  check('path.guide10', n40 === 10, 'la guida dice «Sono 10 episodi» per la soglia 40: la tabella (S&P 500) ne conta lo stesso numero', n40);
  await page.click('#vxIx button[data-ix="NDX"]'); await page.waitForTimeout(200);
  const n40n = await page.evaluate(() => +document.querySelector('#vxTable tr[data-x="40"] td:nth-child(2)').textContent);
  check('path.guide10ndx', true, 'episodi sopra 40 con il Nasdaq-100 (informativo)', n40n);
  await page.click('#vxIx button[data-ix="SPX"]'); await page.waitForTimeout(200);
  // 2. «in corso» e asterisco: spiegati?
  await page.click('#vxTable tr[data-x="20"]'); await page.waitForTimeout(200);
  const eps = await page.evaluate(() => ({ inCorso: document.querySelectorAll('#vxEps td').length && [...document.querySelectorAll('#vxEps td')].filter((t) => t.textContent === 'in corso').length, star: [...document.querySelectorAll('#vxEps .loc')].map((x) => x.title), first: document.querySelector('#vxEps tbody tr')?.innerText.replace(/\s+/g, ' ') }));
  check('path.inCorso', true, 'episodi recenti: «in corso» e asterisco con spiegazione al passaggio del mouse (informativo)', eps);
  // 3. guida dalla vista VIX
  await page.keyboard.press('?'); await page.waitForTimeout(200);
  const href = await page.evaluate(() => document.getElementById('guideLink').getAttribute('href'));
  check('path.guidelink', href === 'guida.html#vix', 'dalla vista VIX la guida completa si apre alla sezione VIX', href);
  await page.keyboard.press('Escape');
  const g = await ctx.newPage();
  await g.goto(BASE + 'guida.html#vix'); await g.waitForTimeout(400);
  const gv = await g.evaluate(() => ({ top: Math.round(document.getElementById('vix').getBoundingClientRect().top), open: document.querySelector('#vix a.open')?.getAttribute('href'), addr: [...document.querySelectorAll('#comandi p')].map((p) => p.innerText).find((t) => /Indirizzi/.test(t)) }));
  check('path.guideanchor', gv.top < 200 && gv.open === './#vix', 'guida.html#vix si apre sulla sezione, con il link «Apri il VIX»', gv);
  check('path.guideaddr', /#vix/.test(gv.addr || ''), 'guida, «Indirizzi»: elenca #vix', gv.addr);
  await g.click('#vix a.open'); await g.waitForFunction(() => document.getElementById('vxBody') && !document.getElementById('vxBody').hidden, null, { timeout: 30000 });
  check('path.guideopen', /#vix$/.test(g.url()), '«Apri il VIX →» dalla guida apre la vista', g.url());
  // 4. ruoli ARIA della vista
  const a11y = await page.evaluate(() => ({
    panel: document.getElementById('v-vix').getAttribute('role') + ' ' + document.getElementById('v-vix').getAttribute('aria-labelledby'),
    tab: document.getElementById('tab-vix').getAttribute('aria-controls'),
    svg: [...document.querySelectorAll('#v-vix svg')].map((s) => s.getAttribute('role') + ':' + !!s.getAttribute('aria-label')),
    seg: [...document.querySelectorAll('#v-vix .seg')].map((s) => s.getAttribute('role') + ':' + s.getAttribute('aria-label')),
    loading: document.getElementById('vxLoading').getAttribute('role') || document.getElementById('vxLoading').getAttribute('aria-live'),
    miss: document.getElementById('vxMiss').getAttribute('role') || document.getElementById('vxMiss').getAttribute('aria-live'),
    th: [...document.querySelectorAll('#vxTable thead th')].length, caption: !!document.querySelector('#vxTable caption') || document.getElementById('vxTable').getAttribute('aria-label') || document.getElementById('vxTable').getAttribute('aria-labelledby'),
    eps: !!document.querySelector('#vxEps caption') || document.getElementById('vxEps').getAttribute('aria-label') || document.getElementById('vxEps').getAttribute('aria-labelledby'),
  }));
  check('a11y.panel', a11y.panel === 'tabpanel tab-vix' && a11y.tab === 'v-vix', 'scheda e pannello collegati (role=tab/tabpanel)', a11y);
  check('a11y.svg', a11y.svg.every((x) => x === 'img:true'), 'grafici con role=img e descrizione', a11y.svg);
  check('a11y.seg', a11y.seg.every((x) => /^group:/.test(x)), 'gruppi di pulsanti con nome', a11y.seg);
  // tabelle delle altre viste: le righe hanno un ruolo? (per capire se la vista VIX è coerente con il resto)
  await page.keyboard.press('1'); await page.waitForTimeout(400);
  const monRow = await page.evaluate(() => { const r = document.querySelector('#v-mon tr[tabindex="0"]'); return r ? { role: r.getAttribute('role'), aria: [...r.attributes].map((a) => a.name).filter((n) => n.startsWith('aria')) } : null; });
  check('a11y.consistency', true, 'righe attivabili del Monitor (per confronto): ruolo e attributi ARIA', monRow);
  // 5. larghezze frazionarie (zoom del browser): iframe 600.5 e 860.5 px
  for (const fw of [600.5, 860.5]) {
    await page.setContent(`<iframe src="${BASE}#vix" style="width:${fw}px;height:800px;border:0"></iframe>`);
    const fr = page.frames()[1];
    await fr.waitForFunction(() => document.getElementById('loadingNote') && document.getElementById('loadingNote').hidden, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const r = await fr.evaluate(() => { const bs = [...document.querySelectorAll('.fnkeys button')]; return { iw: innerWidth, vw: document.documentElement.getBoundingClientRect().width, rows: [...new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top)))].length, hs: document.scrollingElement.scrollWidth - document.documentElement.clientWidth, clipped: bs.filter((b) => b.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).map((b) => b.textContent) }; });
    check(`frac.${fw}`, !r.clipped.length && r.hs <= 0, `larghezza frazionaria ${fw}px (zoom): nessuna scheda fuori schermo`, r);
    await page.screenshot({ path: path.join(SHOTS, `frac-${fw}.png`), clip: { x: 0, y: 0, width: 880, height: 260 } });
  }
  check('console', !errs.length, 'console senza errori', errs);
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'risultati-percorso.json'), JSON.stringify(R, null, 1));
  console.log(`\n${R.filter((r) => r.ok).length}/${R.length} passano`);
})().catch((e) => { console.error(e); process.exit(1); });
