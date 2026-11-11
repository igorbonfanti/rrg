// 1.9.0: semiconduttori (SOXX) come industria accanto agli 11 settori nelle viste 1-5, con alert; nota RRG/Bloomberg in guida.
// Deve fallire sulla 1.8.0 (niente SOXX). Uso: BASE=http://127.0.0.1:8791/ SITE=<cartella del sito> NODE_PATH=$(npm root -g) node ricerca/qa/browser/v190.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../..');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const f1 = (v) => v.toFixed(1).replace('.', ',');
(async () => {
  // valori attesi letti dal file dei dati, senza le funzioni delle viste
  const IX = await import(path.join(SITE, 'js/indexdata.js'));
  const SG = await import(path.join(SITE, 'js/signals.js'));
  const F = await (await fetch(BASE + 'data/industries.json')).json().catch(() => null);
  const SEC = await (await fetch(BASE + 'data/sectors.json')).json();
  let want = null;
  if (F && F.series && F.series.SOXX) {
    const d = IX.decodeDates(F.dates.d0, F.dates.gaps), b = F.series.SOXX.breadth, L = d.length;
    const n = SG.expandRLE(b.n, L);
    let i = L - 1; while (i > 0 && (d[i] > SEC.dates.at(-1) || b.a200[i] == null)) i--;
    want = { date: d[i], a: b.a200[i], n: n[i], pct: (100 * b.a200[i]) / n[i], rows: F.latest.SOXX.members.length };
  }
  ok(!!want, `file data/industries.json con la serie SOXX${want ? ` (al ${want.date}: ${want.a}/${want.n} = ${f1(want.pct)}%)` : ''}`);
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark']]) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const go = async (h, sel) => { await p.goto(BASE + h); await p.waitForSelector(sel, { timeout: 30000, state: 'attached' }).catch(() => {}); await p.waitForTimeout(600); };
    const tap = async (l) => (opt.hasTouch ? l.tap() : l.click());
    // 1 Monitor: gruppo «Industria» sotto gli 11 settori, valori del file, riquadri ancora «/ 11»
    await go('#mon', '#boardTable tbody tr');
    const mon = await p.evaluate(() => {
      const trs = [...document.querySelectorAll('#boardTable tbody tr')];
      const iG = trs.findIndex((t) => t.classList.contains('grp')), iS = trs.findIndex((t) => t.dataset.sym === 'SOXX');
      const sectors = trs.filter((t) => t.dataset.sym && t.dataset.sym !== 'SOXX').length;
      const r = trs[iS];
      return { iG, iS, sectors, br: r ? r.querySelector('.c-br .cellv').textContent : '', kpis: [...document.querySelectorAll('#boardKpis .kpi .v')].map((x) => x.textContent) };
    });
    ok(mon.iG >= 11 && mon.iS === mon.iG + 1 && mon.sectors === 11, `${name} Monitor: gruppo industria dopo gli 11 settori (riga ${mon.iG}, SOXX ${mon.iS})`);
    ok(want && mon.br.startsWith(`${f1(want.pct)}%`) && mon.br.includes(`${want.a}/${want.n}`), `${name} Monitor: SOXX ${mon.br} (dal file ${want && f1(want.pct)}% ${want && want.a}/${want && want.n})`);
    ok(mon.kpis.filter((k) => k.includes('/ 11')).length === 3, `${name} Monitor: riquadri ancora «/ 11»`);
    // 3 Bottom Map: rombo, legenda, distanza
    await go('#btm', '#bm .head');
    const bm = await p.evaluate(() => ({ dia: document.querySelectorAll('#bm path.head.diamond[data-sym="SOXX"]').length, lab: [...document.querySelectorAll('#bm text.tlabel')].some((t) => t.textContent === 'SOXX'), leg: !document.getElementById('bmIndLeg').hidden, dist: !!document.querySelector('#distList .r[data-sym="SOXX"] .dia') }));
    ok(bm.dia === 1 && bm.lab && bm.leg && bm.dist, `${name} Bottom Map: rombo ${bm.dia}, etichetta ${bm.lab}, legenda ${bm.leg}, distanza ${bm.dist}`);
    // 4 Settore: dettaglio del SOXX
    await go('#SOXX', '#ts .frame');
    const sx = await p.evaluate(() => ({
      title: document.getElementById('secTitle').textContent, chip: !!document.querySelector('#secChips .chipgrp button[data-sym="SOXX"][aria-pressed="true"]'),
      blue: document.getElementById('blueVal').textContent, src: document.getElementById('blueSrc').textContent, q: document.getElementById('secQuality').hidden ? '' : document.getElementById('secQuality').textContent,
      facts: document.getElementById('secFacts').textContent, rows: document.querySelectorAll('#memTable tbody tr').length, head: [...document.querySelectorAll('#memTable thead th')].map((t) => t.textContent),
      tv: [...document.querySelectorAll('#tvLinks a')].map((a) => a.href + ' ' + a.textContent), epi: document.getElementById('epiMeta').textContent, mt: document.getElementById('memTitle').textContent,
    }));
    ok(sx.title.startsWith('SOXX') && sx.title.includes('industria') && sx.chip, `${name} Settore: titolo «${sx.title}» e bottone dopo i settori`);
    ok(sx.blue === '3%' && /Massimo Rea/.test(sx.src) && /nessun titolo sopra la media/.test(sx.src), `${name} Settore: livello 3% di Rea, «nessun titolo sopra la media»`);
    ok(/titoli di oggi/.test(sx.q) && /fonti secondarie/.test(sx.q) && /vale 3,3 punti/.test(sx.q), `${name} Settore: nota su come è costruita la storia`);
    ok(want && sx.facts.includes(`${want.a}/${want.n} · ${f1(want.pct)}%`), `${name} Settore: titoli sopra la media 200 uguali al file`);
    ok(want && sx.rows === want.rows && sx.head.includes('Peso') && sx.mt === "Titoli dell'industria", `${name} Settore: ${sx.rows} titoli con il peso`);
    ok(sx.tv.some((x) => x.includes('NASDAQ%3ASOXX')) && sx.tv.some((x) => x.includes('#XLK')), `${name} Settore: link TradingView NASDAQ:SOXX e al settore XLK`);
    ok(/^7 zone blu dal \d\d\/\d\d\/2002 con livello 3% · 7 trigger/.test(sx.epi), `${name} Settore: episodi «${sx.epi.slice(0, 60)}»`);
    // collegamento SOXX → XLK → SOXX
    await tap(p.locator('#tvLinks a.rel')); await p.waitForTimeout(800);
    ok((await p.$eval('#secTitle', (h) => h.textContent)).startsWith('XLK') && /#XLK$/.test(p.url()), `${name} Settore: dal SOXX al suo settore XLK`);
    const back = p.locator('#tvLinks a.rel', { hasText: 'SOXX' });
    ok(await back.count() === 1 && !(await p.$eval('#secQuality', (x) => !x.hidden)), `${name} Settore: XLK rimanda al SOXX e non ha la nota delle industrie`);
    await tap(back); await p.waitForTimeout(800);
    ok((await p.$eval('#secTitle', (h) => h.textContent)).startsWith('SOXX'), `${name} Settore: da XLK al SOXX`);
    // 5 Titoli: riga SOXX sotto l'S&P 500
    await go('#tit-SOXX', '#titSpread g.row');
    const ti = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('#titSpread g.row')].map((g) => g.dataset.k);
      return { rows, lab: [...document.querySelectorAll('#titSpread text.grplab')].map((t) => t.textContent), bub: document.getElementById('titBubbleTitle').textContent, chip: !!document.querySelector('#titChips button[data-sym="SOXX"][aria-pressed="true"]') };
    });
    ok(ti.rows.length === 13 && ti.rows[11] === 'SPX' && ti.rows[12] === 'SOXX' && ti.lab.includes('INDUSTRIA'), `${name} Titoli: righe ${ti.rows.slice(10).join(', ')} con «INDUSTRIA»`);
    ok(ti.chip && /SOXX/.test(ti.bub), `${name} Titoli: bottone e bubble del SOXX («${ti.bub}»)`);
    // barra dei comandi: SEMI apre il SOXX
    if (!opt.hasTouch) {
      await go('#mon', '#boardTable tbody tr');
      await p.fill('#cmd', 'SEMI'); await p.press('#cmd', 'Enter'); await p.waitForTimeout(800);
      ok(/#SOXX$/.test(p.url()), `${name} comandi: SEMI apre il SOXX (${p.url().split('#')[1]})`);
    }
    // 9 Alert: regole con la riga delle industrie
    await go('#alr', '#rulesList li');
    ok(/Industrie \(SOXX\)/.test(await p.$eval('#rulesList', (x) => x.textContent)), `${name} Alert: riga sulle industrie`);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  // guida: nota sul confronto con Bloomberg e sezione delle industrie
  const g = await (await fetch(BASE + 'guida.html')).text();
  ok(/id="rrg-bloomberg"/.test(g) && /Medie semplici/.test(g) && /id="industrie"/.test(g), 'guida: confronto con Bloomberg e sezione industrie');
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
