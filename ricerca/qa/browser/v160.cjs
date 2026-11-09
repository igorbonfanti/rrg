// 1.6.0: vista 8 VIX con struttura a termine (VIX/VIX3M) e credito (HYG/IEF). Deve fallire sulla 1.5.0 (4 riquadri,
// nessun pannello nuovo) e passare sulla 1.6.0.
// Uso: BASE=http://127.0.0.1:8791/ SITE=<cartella del sito> NODE_PATH=$(npm root -g) node ricerca/qa/browser/v160.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../..');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const it = (v, d) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ',');
(async () => {
  // valori attesi dai moduli dell'app sui dati del sito (controlla il disegno, non il calcolo)
  const V = await import(path.join(SITE, 'js/vix.js'));
  const { decodeDates, deltaDecode } = await import(path.join(SITE, 'js/indexdata.js'));
  const { pack } = await import(path.join(__dirname, '../../../scripts/fetch_emerging.js'));
  const raw = await (await fetch(BASE + 'data/vix.json')).text(), D = JSON.parse(raw);
  const A = V.align(V.vxSeries(D.series.SPX), V.vxSeries(D.series.VIX)), C = V.context(A, V.vxSeries(D.series.VIX3M), V.vxSeries(D.series.HYGIEF));
  const want = { r: C.now.r && it(C.now.r.r, 2), st: C.now.r && C.now.r.state, dd: C.now.credit && it(C.now.credit.dd, 1) + '%' };
  console.log('atteso', JSON.stringify(want));
  // file della 1.5.0 (senza le serie nuove) e file senza il VIX3M dell'ultima seduta
  const old = JSON.parse(raw); delete old.series.VIX3M; delete old.series.HYGIEF; for (const k of ['vix3m', 'fred3m', 'credit']) delete old.asOf[k];
  const miss = JSON.parse(raw);
  if (miss.series.VIX3M) {
    const s = miss.series.VIX3M, d = decodeDates(s.d0, s.gaps), v = deltaDecode(s.cd, s.ps);
    miss.series.VIX3M = { ...pack(d.slice(0, -1), v.slice(0, -1), s.ps), last: d.at(-2), fred: s.fred < d.at(-2) ? s.fred : d.at(-2) };
  }
  const b = await chromium.launch();
  const ctxOf = async (opt, theme = 'dark', body = null) => {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    if (body) await c.route('**/data/vix.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));
    return c;
  };
  const open = async (ctx) => {
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }); await p.waitForTimeout(800);
    return { p, errs };
  };
  const kpis = (p) => p.$$eval('#vxKpis .kpi', (k) => k.map((x) => ({ k: x.querySelector('.k').innerText, v: x.querySelector('.v').innerText, s: x.querySelector('.s').innerText, over: [...x.querySelectorAll('.v,.s')].some((e) => e.scrollWidth > e.clientWidth + 1), left: Math.round(x.getBoundingClientRect().left) })));
  for (const [name, opt, theme, cols] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark', 6], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light', 6], ['1024-scuro', { viewport: { width: 1024, height: 900 } }, 'dark', 3], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark', 2], ['360-chiaro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }, 'light', 2]]) {
    const ctx = await ctxOf(opt, theme); const { p, errs } = await open(ctx);
    const K = await kpis(p);
    ok(K.length === 6, `${name}: 6 riquadri (${K.length})`);
    const kr = K.find((x) => /VIX \/ VIX3M/i.test(x.k)), kc = K.find((x) => /credito/i.test(x.k));
    ok(kr && want.r && kr.v.includes(want.r) && kr.v.includes(want.st), `${name}: VIX / VIX3M ${kr && kr.v.replace(/\n/g, ' ')}`);
    ok(kc && want.dd && kc.v.includes(want.dd) && /HYG\/IEF/.test(kc.s), `${name}: credito ${kc && kc.v}`);
    ok(K.every((x) => !x.over), `${name}: nessun testo tagliato nei riquadri`);
    ok(new Set(K.map((x) => x.left)).size === cols, `${name}: ${cols} colonne di riquadri (${new Set(K.map((x) => x.left)).size})`);
    ok(await p.locator('#vxChart path.vxr').count() === 1 && await p.locator('#vxChart path.vxcr').count() === 1 && await p.locator('#vxChart line.vxone').count() === 1 && await p.locator('#vxChart circle.vxrdot').count() === 1, `${name}: pannelli VIX/VIX3M e credito, linea a 1, punto sull'ultimo valore`);
    ok(await p.locator('#vxChart rect.vxnodata').count() === 0, `${name}: a 10A nessuna fascia «dati non ancora disponibili»`);
    // riquadro dei valori sul pannello della struttura a termine
    await p.locator('#vxChart').scrollIntoViewIfNeeded();
    const bb = await p.locator('#vxChart').boundingBox(), ry = await p.$eval('#vxChart path.vxr', (e) => e.getBBox().y + e.getBBox().height / 2).catch(() => 80), sc = bb.width / (await p.$eval('#vxChart', (e) => e.viewBox.baseVal.width));
    if (opt.hasTouch) await p.touchscreen.tap(bb.x + bb.width * 0.6, bb.y + ry * sc); else await p.mouse.move(bb.x + bb.width * 0.6, bb.y + ry * sc);
    await p.waitForTimeout(300);
    const tip = await p.locator('#vxTip').innerText();
    ok(/VIX3M/.test(tip) && /VIX \/ VIX3M/.test(tip) && /(backwardation|contango)/.test(tip) && /HYG\/IEF/.test(tip), `${name}: riquadro dei valori con VIX3M, rapporto e credito`);
    // MAX: fascia prima del 2007 e zone di backwardation
    const mx = p.locator('#vxRange button[data-range="MAX"]'); if (opt.hasTouch) await mx.tap(); else await mx.click(); await p.waitForTimeout(500);
    ok(await p.locator('#vxChart rect.vxnodata').count() >= 1 && /VIX3M dal 04\/12\/2007/.test(await p.locator('#vxChart').textContent()), `${name}: MAX, fascia «VIX3M dal 04/12/2007»`);
    ok(await p.locator('#vxChart rect.vxback').count() > 20, `${name}: MAX, zone di backwardation (${await p.locator('#vxChart rect.vxback').count()})`);
    const tens = p.locator('#vxRange button[data-range="10A"]'); if (opt.hasTouch) await tens.tap(); else await tens.click(); await p.waitForTimeout(300);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale`);
    const txt = await p.locator('#v-vix').innerText();
    ok(/Massimo Rea/.test(txt) && /Stefano Serafini/.test(txt), `${name}: Rea e Serafini citati`);
    ok(/VXVCLS/.test(txt) && /HYG/.test(txt) && /IEF/.test(txt), `${name}: fonti nuove`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await ctx.close();
  }
  // file della 1.5.0: 6 riquadri, due con «—», grafico a due pannelli, nessun errore
  {
    const ctx = await ctxOf({ viewport: { width: 1440, height: 900 } }, 'dark', old); const { p, errs } = await open(ctx);
    const K = await kpis(p);
    ok(K.length === 6 && K.filter((x) => x.v.trim() === '—' && /non disponibile/.test(x.s)).length === 2, 'file senza le serie nuove: due riquadri «—»');
    ok(await p.locator('#vxChart path.vxr').count() === 0 && await p.locator('#vxChart path.vxcr').count() === 0 && await p.locator('#vxChart path.vxvix').count() === 1, 'file senza le serie nuove: grafico della 1.5.0');
    ok(!errs.length, `file senza le serie nuove: console ${errs.join(' | ')}`);
    await ctx.close();
  }
  // VIX3M dell'ultima seduta non ancora arrivato
  {
    const ctx = await ctxOf({ viewport: { width: 1440, height: 900 } }, 'dark', miss); const { p, errs } = await open(ctx);
    const kr = (await kpis(p)).find((x) => /VIX \/ VIX3M/i.test(x.k));
    ok(kr && kr.v.trim() === '—' && /non ancora arrivato/.test(kr.s), `VIX3M mancante: ${kr && kr.s}`);
    ok(!errs.length, `VIX3M mancante: console ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
