// Controllo indipendente di usabilità e funzioni, versione 1.5.0 (vista 8 VIX, Alert alla 9, barra a 9 schede): computer.
// Uso: NODE_PATH=$(npm root -g) node u150-desktop.cjs [base=http://127.0.0.1:8798/]
// Scrive risultati in risultati-desktop.json e screenshot in shots/.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.argv[2] || 'http://127.0.0.1:8798/';
const OUT = __dirname, SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const R = []; // {id, ok, what, detail}
const check = (id, ok, what, detail) => { R.push({ id, ok: !!ok, what, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${id} ${what}${detail != null ? ' · ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`); };

async function newPage(browser, { w, h, theme = 'dark', touch = false, mobile = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('__init')) { localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); sessionStorage.setItem('__init', '1'); } } catch {} }, theme);
  const page = await ctx.newPage();
  const errs = [], reqs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('request', (r) => reqs.push(r.url().replace(BASE, '')));
  return { ctx, page, errs, reqs };
}
const ready = (page) => page.waitForFunction(() => document.getElementById('loadingNote') && document.getElementById('loadingNote').hidden && document.querySelector('.fnkeys button[aria-selected="true"]'), null, { timeout: 30000 });
const vixReady = (page) => page.waitForFunction(() => !document.getElementById('vxBody').hidden || !document.getElementById('vxMiss').hidden, null, { timeout: 30000 });
const geo = (page) => page.evaluate(() => {
  const bs = [...document.querySelectorAll('.fnkeys button[data-view]')].filter((b) => !b.hidden);
  const rows = [...new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top)))];
  return {
    n: bs.length, rows: rows.length, perRow: rows.map((t) => bs.filter((b) => Math.round(b.getBoundingClientRect().top) === t).length),
    clipped: bs.filter((b) => b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().right > innerWidth + 0.5).map((b) => b.textContent),
    minH: Math.min(...bs.map((b) => b.getBoundingClientRect().height)), minW: Math.min(...bs.map((b) => b.getBoundingClientRect().width)),
    barH: Math.round(document.querySelector('.fnkeys').getBoundingClientRect().height),
    hscroll: document.scrollingElement.scrollWidth - innerWidth,
    labels: bs.map((b) => b.textContent.trim()), wrapped: bs.filter((b) => b.getBoundingClientRect().height > 40 && innerWidth > 600).map((b) => b.textContent),
  };
});
const badText = (page, sel) => page.evaluate((s) => { const t = document.querySelector(s).innerText; return (t.match(/NaN|undefined|Infinity|null|\[object/g) || []); }, sel);

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of [[1440, 900], [1280, 800]]) {
    for (const theme of ['dark', 'light']) {
      const tag = `d${w}-${theme}`;
      const { ctx, page, errs, reqs } = await newPage(browser, { w, h, theme });
      const t0 = Date.now();
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await ready(page);
      const tStart = Date.now() - t0;
      await page.waitForTimeout(800);
      const g = await geo(page);
      check(`${tag}.bar`, g.n === 9 && g.rows === 1 && !g.clipped.length && g.hscroll <= 0, 'barra: 9 schede su una riga, nessuna tagliata, nessuno scorrimento orizzontale', g);
      check(`${tag}.labels`, JSON.stringify(g.labels) === JSON.stringify(['1 Monitor', '2 Rotazione', '3 Bottom Map', '4 Settore', '5 Titoli', '6 Indici', '7 Emergenti', '8 VIX', '9 Alert']), 'etichette e ordine delle schede', g.labels);
      check(`${tag}.lazy`, !reqs.some((u) => u.includes('vix.json')), 'data/vix.json non scaricato all\'avvio', reqs.filter((u) => u.includes('data/')));
      check(`${tag}.theme`, (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === theme, 'tema dal localStorage', theme);
      // tasto 8
      const t8 = Date.now();
      await page.keyboard.press('8');
      await vixReady(page);
      const tVix = Date.now() - t8;
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => ({ hash: location.hash, vis: !document.getElementById('v-vix').hidden, sel: document.querySelector('.fnkeys [aria-selected=true]').id, body: !document.getElementById('vxBody').hidden, miss: !document.getElementById('vxMiss').hidden, loading: !document.getElementById('vxLoading').hidden }));
      check(`${tag}.key8`, st.hash === '#vix' && st.vis && st.sel === 'tab-vix' && st.body && !st.miss && !st.loading, 'tasto 8 apre la vista VIX (#vix, scheda selezionata, contenuto visibile)', { ...st, ms: tVix });
      const nVix = reqs.filter((u) => u.includes('vix.json')).length;
      check(`${tag}.fetch1`, nVix === 1, 'data/vix.json scaricato una volta alla prima apertura', nVix);
      check(`${tag}.kpis`, (await page.$$eval('#vxKpis .kpi', (k) => k.length)) === 4, '4 riquadri dei valori di oggi');
      const bad = await badText(page, '#v-vix');
      check(`${tag}.nobad`, !bad.length, 'nessun NaN/undefined/Infinity/null nel testo della vista', bad);
      const hs = await page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
      check(`${tag}.vixhscroll`, hs <= 0, 'vista VIX senza scorrimento orizzontale della pagina', hs);
      const tbl = await page.evaluate(() => ({ rows: [...document.querySelectorAll('#vxTable tbody tr')].map((r) => r.dataset.x || 'base'), sel: document.querySelector('#vxTable tr.sel')?.dataset.x, overflow: [...document.querySelectorAll('#v-vix .tscroll')].map((t) => t.scrollWidth - t.clientWidth) }));
      check(`${tag}.table`, JSON.stringify(tbl.rows) === JSON.stringify(['base', '20', '25', '30', '40', '50']), 'tabella: riga base + soglie 20/25/30/40/50', tbl);
      check(`${tag}.tablefit`, tbl.overflow.every((o) => o <= 0), 'tabelle senza scorrimento orizzontale interno sul computer', tbl.overflow);
      await page.screenshot({ path: path.join(SHOTS, `${tag}-vix.png`), fullPage: true });
      // clic su una riga
      await page.click('#vxTable tr[data-x="30"]');
      const r30 = await page.evaluate(() => ({ sel: document.querySelector('#vxTable tr.sel')?.dataset.x, title: document.getElementById('vxEpsTitle').textContent, n: document.querySelectorAll('#vxEps tbody tr').length, nTab: +document.querySelector('#vxTable tr[data-x="30"] td:nth-child(2)').textContent }));
      check(`${tag}.rowclick`, r30.sel === '30' && /sopra 30/.test(r30.title) && r30.n === r30.nTab && r30.n > 0, 'clic sulla riga 30: selezionata, titolo e numero di episodi coerenti con la colonna «episodi»', r30);
      // pulsante indice
      await page.click('#vxIx button[data-ix="NDX"]');
      await page.waitForTimeout(200);
      const ndx = await page.evaluate(() => ({ p: [...document.querySelectorAll('#vxIx button')].map((b) => b.getAttribute('aria-pressed')), meta: document.getElementById('vxTableMeta').textContent, sc: document.getElementById('vxScMeta').textContent, title: document.getElementById('vxEpsTitle').textContent, sel: document.querySelector('#vxTable tr.sel')?.dataset.x }));
      check(`${tag}.ndx`, ndx.p.join() === 'false,true' && /Nasdaq-100/.test(ndx.meta) && /Nasdaq-100/.test(ndx.sc) && /Nasdaq-100/.test(ndx.title) && ndx.sel === '30', 'Nasdaq-100: pulsante premuto, tabella, scatter ed episodi passano al Nasdaq-100, soglia 30 mantenuta', ndx);
      // periodo
      const yrs = () => page.$$eval('#vxChart text.axt', (t) => t.map((x) => x.textContent).filter((s) => /^\d{4}$/.test(s)));
      const y10 = await yrs();
      await page.click('#vxRange button[data-range="MAX"]');
      await page.waitForTimeout(200);
      const yM = await yrs();
      await page.click('#vxRange button[data-range="3A"]');
      await page.waitForTimeout(200);
      const y3 = await yrs();
      const rp = await page.$$eval('#vxRange button', (b) => b.map((x) => x.getAttribute('aria-pressed')).join());
      check(`${tag}.range`, rp === 'true,false,false' && +yM[0] < +y10[0] && +y3[0] > +y10[0], 'periodi 3A/10A/MAX: pulsante premuto e asse degli anni cambia', { y3: y3.join(' '), y10: y10.join(' '), yM: yM.join(' ') });
      // ricarica: scelte ricordate
      await page.reload(); await ready(page); await vixReady(page); await page.waitForTimeout(300);
      const rem = await page.evaluate(() => ({ hash: location.hash, vis: !document.getElementById('v-vix').hidden, ix: document.querySelector('#vxIx [aria-pressed=true]')?.dataset.ix, range: document.querySelector('#vxRange [aria-pressed=true]')?.dataset.range, thr: document.querySelector('#vxTable tr.sel')?.dataset.x, meta: document.getElementById('vxTableMeta').textContent }));
      check(`${tag}.reload`, rem.hash === '#vix' && rem.vis && rem.ix === 'NDX' && rem.range === '3A' && rem.thr === '30' && /Nasdaq/.test(rem.meta), 'ricarica su #vix: vista VIX, indice, periodo e soglia ricordati', rem);
      // riquadro dei valori: scatter (mouse)
      await page.evaluate(() => document.getElementById('vxScWrap').scrollIntoView({ block: 'center' }));
      const pt = await page.evaluate(() => { const c = document.querySelector('#vxScatter circle.vxpt.start'); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await page.mouse.move(pt.x, pt.y);
      await page.waitForTimeout(150);
      const tip = await page.evaluate(() => { const t = document.getElementById('vxScTip'), w = document.getElementById('vxScWrap').getBoundingClientRect(), r = t.getBoundingClientRect(); return { vis: !t.hidden, text: t.innerText.replace(/\n/g, ' | '), inside: r.left >= w.left - 1 && r.right <= w.right + 1 && r.bottom <= innerHeight, ring: document.querySelector('#vxScatter .vxring').getAttribute('visibility') }; });
      check(`${tag}.sctip`, tip.vis && tip.ring === 'visible' && /VIX/.test(tip.text) && /12 mesi/.test(tip.text) && /Primo giorno/.test(tip.text) && tip.inside, 'scatter: riquadro dei valori sul punto grande, anello, dentro il riquadro e lo schermo', tip);
      await page.screenshot({ path: path.join(SHOTS, `${tag}-scatter-tip.png`) });
      await page.mouse.move(5, 5);
      await page.waitForTimeout(100);
      check(`${tag}.sctiphide`, await page.evaluate(() => document.getElementById('vxScTip').hidden), 'scatter: il riquadro sparisce quando il mouse esce');
      // grafico VIX contro realizzata
      await page.evaluate(() => document.getElementById('vxWrap').scrollIntoView({ block: 'center' }));
      const cb = await page.evaluate(() => { const r = document.getElementById('vxChart').getBoundingClientRect(); return { x: r.x + r.width * 0.6, y: r.y + r.height * 0.3, right: r.x + r.width - 30 }; });
      await page.mouse.move(cb.x, cb.y);
      await page.waitForTimeout(150);
      const ct = await page.evaluate(() => { const t = document.getElementById('vxTip'), w = document.getElementById('vxWrap').getBoundingClientRect(), r = t.getBoundingClientRect(); return { vis: !t.hidden, text: t.innerText.replace(/\n/g, ' | '), inside: r.left >= w.left - 1 && r.right <= w.right + 1 && r.top >= 0 && r.bottom <= innerHeight, xh: document.querySelector('#vxChart .xhair').getAttribute('visibility') }; });
      check(`${tag}.chtip`, ct.vis && ct.xh === 'visible' && /VIX/.test(ct.text) && /Realizzata/.test(ct.text) && /Premio/.test(ct.text) && ct.inside && !/NaN|undefined/.test(ct.text), 'grafico VIX/realizzata: riquadro dei valori e linea verticale', ct);
      await page.mouse.move(cb.right, cb.y);
      await page.waitForTimeout(150);
      const ct2 = await page.evaluate(() => { const t = document.getElementById('vxTip'), w = document.getElementById('vxWrap').getBoundingClientRect(), r = t.getBoundingClientRect(); return { vis: !t.hidden, text: t.innerText.replace(/\n/g, ' | '), inside: r.left >= w.left - 1 && r.right <= w.right + 1 }; });
      check(`${tag}.chtipedge`, ct2.vis && ct2.inside, 'grafico: riquadro dei valori al bordo destro resta dentro', ct2);
      await page.screenshot({ path: path.join(SHOTS, `${tag}-chart-tip.png`) });
      await page.mouse.move(5, 5);
      // tastiera sulle righe
      await page.focus('#vxTable tr[data-x="40"]');
      await page.keyboard.press('Enter');
      const kE = await page.evaluate(() => ({ sel: document.querySelector('#vxTable tr.sel')?.dataset.x, focus: document.activeElement.dataset?.x, tag: document.activeElement.tagName }));
      await page.keyboard.press('Shift+Tab'); // riga 30
      const y0 = await page.evaluate(() => scrollY);
      await page.keyboard.press(' ');
      await page.waitForTimeout(100);
      const kS = await page.evaluate(() => ({ sel: document.querySelector('#vxTable tr.sel')?.dataset.x, focus: document.activeElement.dataset?.x, sy: scrollY }));
      check(`${tag}.kbrow`, kE.sel === '40' && kE.focus === '40' && kS.sel === '30' && kS.focus === '30' && kS.sy === y0, 'tastiera: Invio e Spazio sulle righe scelgono la soglia, il focus resta sulla riga, Spazio non scorre la pagina', { kE, kS, y0 });
      const roles = await page.evaluate(() => { const r = document.querySelector('#vxTable tr[data-x]'); return { role: r.getAttribute('role'), ariaSel: r.getAttribute('aria-selected'), ariaCur: r.getAttribute('aria-current'), ariaPressed: r.getAttribute('aria-pressed'), label: r.getAttribute('aria-label') }; });
      check(`${tag}.rowrole`, roles.role || roles.ariaSel || roles.ariaCur || roles.ariaPressed, 'righe attivabili: ruolo o stato ARIA che dica al lettore di schermo che sono selezionabili e quale è scelta', roles);
      const focusVis = await page.evaluate(() => { const r = document.querySelector('#vxTable tr[data-x="30"]'); r.focus(); const cs = getComputedStyle(r); const td = getComputedStyle(r.querySelector('td')); return { outline: cs.outlineStyle + ' ' + cs.outlineWidth, tdOutline: td.outlineStyle, boxShadow: cs.boxShadow }; });
      check(`${tag}.rowfocus`, !/none 0px/.test(focusVis.outline) || focusVis.boxShadow !== 'none', 'righe: focus della tastiera visibile', focusVis);
      // tab con le frecce e tasto 9
      await page.focus('#tab-vix');
      await page.keyboard.press('ArrowRight');
      const ar = await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement.id }));
      await page.keyboard.press('ArrowLeft');
      const al = await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement.id }));
      await page.keyboard.press('End');
      const en = await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement.id }));
      check(`${tag}.arrows`, ar.hash === '#alr' && ar.focus === 'tab-alr' && al.hash === '#vix' && al.focus === 'tab-vix' && en.hash === '#alr', 'schede: frecce e Fine tra VIX e Alert', { ar, al, en });
      // tasti 1-9 e Indietro/Avanti
      await page.evaluate(() => document.activeElement.blur());
      const seq = [];
      for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) { await page.keyboard.press(k); await page.waitForTimeout(k === '2' ? 1200 : 400); seq.push(await page.evaluate(() => ({ h: location.hash, v: [...document.querySelectorAll('.view')].filter((s) => !s.hidden).map((s) => s.id).join(), sel: document.querySelector('.fnkeys [aria-selected=true]').id }))); }
      const expV = ['mon', 'rrg', 'btm', 'sec', 'tit', 'idx', 'emg', 'vix', 'alr'];
      check(`${tag}.keys19`, seq.every((s, i) => s.v === 'v-' + expV[i] && s.sel === 'tab-' + expV[i]), 'tasti 1-9 aprono le nove viste nell\'ordine', seq.map((s) => s.h + ' ' + s.v));
      check(`${tag}.fetchonce`, reqs.filter((u) => u.includes('vix.json')).length === 2, 'vix.json non riscaricato tornando alla vista (1 per pagina caricata: avvio + ricarica)', reqs.filter((u) => u.includes('vix.json')).length);
      await page.goBack(); await page.waitForTimeout(400);
      const b1 = await page.evaluate(() => ({ h: location.hash, vix: !document.getElementById('v-vix').hidden }));
      await page.goBack(); await page.waitForTimeout(400);
      const b2 = await page.evaluate(() => ({ h: location.hash, emg: !document.getElementById('v-emg').hidden }));
      await page.goForward(); await page.waitForTimeout(400);
      const f1 = await page.evaluate(() => ({ h: location.hash, vix: !document.getElementById('v-vix').hidden, body: !document.getElementById('vxBody').hidden, sel: document.querySelector('.fnkeys [aria-selected=true]').id }));
      check(`${tag}.history`, b1.h === '#vix' && b1.vix && /^#emg/.test(b2.h) && b2.emg && f1.h === '#vix' && f1.vix && f1.body && f1.sel === 'tab-vix', 'Indietro da Alert torna a VIX, poi a Emergenti; Avanti torna a VIX', { b1, b2, f1 });
      // comando VIX
      await page.keyboard.press('1'); await page.waitForTimeout(300);
      for (const cmd of ['VIX', 'vix', 'volatilità', 'ALRT']) {
        await page.fill('#cmd', cmd); await page.press('#cmd', 'Enter'); await page.waitForTimeout(300);
        const h2 = await page.evaluate(() => location.hash);
        check(`${tag}.cmd-${cmd}`, h2 === (cmd === 'ALRT' ? '#alr' : '#vix'), `comando ${cmd}`, h2);
        await page.keyboard.press('Escape');
      }
      // guida rapida: aperta con ?, cosa dice dei tasti
      await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press('?'); await page.waitForTimeout(200);
      const help = await page.evaluate(() => { const t = document.getElementById('helpModal').innerText; return { keys: (t.match(/Tasti:.{0,20}/) || [''])[0].replace(/\s+/g, ' '), vixCmd: /\bVIX\b[^:]*vista|oppure[^.]*VIX/.test(t), guideHref: document.getElementById('guideLink').getAttribute('href') }; });
      check(`${tag}.help`, /1\s*–\s*9/.test(help.keys), 'guida rapida: tasti delle viste 1–9', help);
      check(`${tag}.helpcmd`, help.vixCmd, 'guida rapida: il comando VIX è elencato tra i comandi delle viste', help);
      await page.keyboard.press('Escape');
      // altre viste: niente scorrimento orizzontale, nessun errore
      for (const [k, v] of expV.map((v, i) => [String(i + 1), v])) {
        await page.keyboard.press(k); await page.waitForTimeout(v === 'rrg' || v === 'idx' || v === 'tit' || v === 'emg' ? 1200 : 400);
        const o = await page.evaluate((id) => ({ hs: document.scrollingElement.scrollWidth - innerWidth, vis: !document.getElementById('v-' + id).hidden, top: Math.round(document.getElementById('v-' + id).getBoundingClientRect().top + scrollY) }), v);
        check(`${tag}.view-${v}`, o.hs <= 0 && o.vis, `vista ${k} ${v}: visibile, senza scorrimento orizzontale`, o);
        if (w === 1440) await page.screenshot({ path: path.join(SHOTS, `${tag}-view${k}-${v}.png`) });
      }
      check(`${tag}.console`, !errs.length, 'console senza errori né avvisi', errs);
      check(`${tag}.tstart`, true, 'tempi', { avvioMs: tStart, primaAperturaVixMs: tVix });
      await ctx.close();
    }
  }
  // confronto con 1.4.1 pubblicata (barra e posizione del contenuto)
  const OLD = process.env.OLD || 'http://127.0.0.1:8799/';
  for (const w of [1440, 1280, 1100, 1024, 861, 860, 820, 768, 601, 600, 390, 360]) {
    const res = {};
    for (const [name, url] of [['1.5.0', BASE], ['1.4.1', OLD]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
      const p = await ctx.newPage();
      await p.goto(url); await p.waitForFunction(() => document.getElementById('loadingNote').hidden, null, { timeout: 30000 });
      await p.waitForTimeout(500);
      res[name] = await p.evaluate(() => ({ bar: Math.round(document.querySelector('.fnkeys').getBoundingClientRect().height), monTop: Math.round(document.getElementById('v-mon').getBoundingClientRect().top), hs: document.scrollingElement.scrollWidth - innerWidth }));
      await ctx.close();
    }
    check(`cmp.${w}`, res['1.5.0'].hs <= 0, `barra a ${w}px: altezza 1.5.0 ${res['1.5.0'].bar}px contro 1.4.1 ${res['1.4.1'].bar}px; inizio del Monitor ${res['1.5.0'].monTop} contro ${res['1.4.1'].monTop}`, res);
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'risultati-desktop.json'), JSON.stringify(R, null, 1));
  console.log(`\n${R.filter((r) => r.ok).length}/${R.length} passano`);
})().catch((e) => { console.error(e); process.exit(1); });
