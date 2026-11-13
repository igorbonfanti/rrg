// Controllo indipendente 1.11.0 (uso e testi): profilo dei volumi degli ultimi 12 mesi nel pannello dei massimi (vista 8 VIX).
// Scritto senza guardare ricerca/qa/browser/v1110.cjs per i calcoli: quote ricalcolate qui dai bp del file, posizione delle
// barre ricalcolata dai valori dell'asse (scala logaritmica ricavata da due etichette), unione delle fasce ricalcolata dalla
// scala, larghezze proporzionali alla quota, riquadro su TUTTE le barre (1440 scuro, 3A) e su un campione altrove.
// Uso: BASE=http://127.0.0.1:8917/ NODE_PATH=$(npm root -g) node ricerca/qa/1.11.0/uso-testi/profilo.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8917/';
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, okn = 0; const fails = [];
const ok = (c, m) => { if (!c) { console.log(`FAIL ${m}`); fail++; fails.push(m); } else { okn++; if (process.env.VERBOSE) console.log(`OK   ${m}`); } };
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const UNSTABLE = ['GOLD', 'NDX', 'KOSPI'];
const num = (t) => parseFloat(t.replace(/\./g, '').replace(',', '.'));
const labVal = (t) => { const k = /k$/.test(t); const v = num(t.replace(/k$/, '')); return k ? v * 1000 : v; };
const fmtIt = (x, d) => { const t = x.toFixed(d), [a, b] = t.split('.'); return a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b ? ',' + b : ''); };

async function geo(p) {
  return p.evaluate(() => {
    const svg = document.getElementById('athChart'), vb = svg.viewBox.baseVal, col = svg.querySelector('.vpcol'), px = svg.querySelector('.athpx');
    const R = (e) => ({ x: +e.getAttribute('x'), y: +e.getAttribute('y'), w: +e.getAttribute('width'), h: +e.getAttribute('height') });
    const frame = svg.querySelector('rect.frame');
    const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim() && getComputedStyle(t).visibility !== 'hidden').map((t) => { const b = t.getBBox(); return { t: t.textContent, c: t.getAttribute('class') || '', x: b.x, y: b.y, w: b.width, h: b.height }; });
    const last = svg.querySelector('.athlast');
    return {
      W: vb.width, H: vb.height, frame: frame ? R(frame) : null, col: col ? R(col) : null, bars: [...svg.querySelectorAll('.vpbar')].map(R), merge: +svg.dataset.vpMerge || 0,
      win: svg.querySelector('.vpwin') ? +svg.querySelector('.vpwin').getAttribute('x1') : null,
      px: px ? (() => { const b = px.getBBox(); return { x: b.x, y: b.y, r: b.x + b.width, b: b.y + b.height }; })() : null,
      last: last ? { cx: +last.getAttribute('cx'), r: +last.getAttribute('r') } : null,
      axis: [...svg.querySelectorAll('text.axt')].filter((t) => +t.getAttribute('x') > vb.width - 52).map((t) => ({ t: t.textContent, y: +t.getAttribute('y') - 3 })),
      texts, legend: document.getElementById('athLegend').textContent, legendHTML: document.getElementById('athLegend').innerHTML,
      aria: svg.getAttribute('aria-label') || '', scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      svgW: svg.getBoundingClientRect().width, boxR: document.getElementById('athChartBox').getBoundingClientRect().right, vw: window.innerWidth,
    };
  });
}
const toScreen = (p, x, y) => p.evaluate(({ x, y }) => { const svg = document.getElementById('athChart'), q = svg.createSVGPoint(); q.x = x; q.y = y; const s = q.matrixTransform(svg.getScreenCTM()); return { x: s.x, y: s.y }; }, { x, y });
const tipState = (p) => p.evaluate(() => { const t = document.getElementById('athTip'), r = t.getBoundingClientRect(), on = [...document.querySelectorAll('#athChart .vpbar')].findIndex((e) => e.classList.contains('on')); return { hidden: t.hidden, text: t.textContent, html: t.innerHTML, l: r.left, r: r.right, t: r.top, b: r.bottom, vw: window.innerWidth, vh: window.innerHeight, on, nOn: document.querySelectorAll('#athChart .vpbar.on').length, sw: t.scrollWidth, cw: t.clientWidth }; });

(async () => {
  const H = await (await fetch(BASE + 'data/ath_history.json?x=' + Date.now())).json();
  const A = await (await fetch(BASE + 'data/ath.json?x=' + Date.now())).json();
  const P = H.profiles, ids = A.markets.map((m) => m.id);
  ok(ids.length === 9, `dati: 9 mercati (${ids.join(',')})`);
  const b = await chromium.launch();
  const VIEWS = [['1440', { viewport: { width: 1440, height: 900 } }], ['1280', { viewport: { width: 1280, height: 800 } }],
    ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ['360', { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]];
  let hovered = 0;
  for (const [vw, opt] of VIEWS.filter(([v]) => !process.env.ONLY || process.env.ONLY.split(',').includes(v))) for (const theme of ['dark', 'light']) {
    const name = `${vw}-${theme === 'dark' ? 'scuro' : 'chiaro'}`, phone = !!opt.hasTouch;
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const act = async (l) => { try { await (phone ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })); return true; } catch { return false; } };
    await p.goto(BASE + '#vix');
    await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 });
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === theme, `${name}: tema ${theme}`);
    for (const id of ids) {
      const vp = P[id];
      ok(await act(p.locator(`#athTable tr.athr[data-id="${id}"]`)), `${name} ${id}: riga cliccabile`);
      await p.waitForSelector('#athChart .athpx', { timeout: 10000 });
      for (const r of ['3A', '10A', 'MAX']) {
        await act(p.locator(`#athRange button[data-range="${r}"]`)); await p.waitForTimeout(120);
        const g = await geo(p), tag = `${name} ${id} ${r}`;
        ok(!!g.col, `${tag}: colonna presente`);
        if (!g.col) continue;
        // scala dell'asse (logaritmica) da due etichette lontane
        const a0 = g.axis[0], a1 = g.axis[g.axis.length - 1];
        ok(g.axis.length >= 2, `${tag}: almeno 2 valori sull'asse (${g.axis.length})`);
        const l0 = Math.log(labVal(a0.t)), l1 = Math.log(labVal(a1.t)), pxPerLog = (a0.y - a1.y) / (l1 - l0);
        const fy = (v) => a0.y - (Math.log(v) - l0) * pxPerLog;
        // controllo delle etichette intermedie: tutte sulla stessa scala (entro 1 px)
        ok(g.axis.every((a) => Math.abs(fy(labVal(a.t)) - a.y) < 1), `${tag}: valori dell'asse coerenti tra loro`);
        // unione delle fasce ricalcolata: il più piccolo divisore di 100 con altezza >= 3 px
        const pxBin = (Math.log(vp.hi / vp.lo) / vp.n) * pxPerLog;
        const k = [...Array(100).keys()].map((i) => i + 1).find((x) => 100 % x === 0 && x * pxBin >= 3 - 0.02);
        ok(k === g.merge || (Math.abs(k * pxBin - 3) < 0.05), `${tag}: fasce unite ${g.merge} (ricalcolo ${k}, ${(k * pxBin).toFixed(2)} px)`);
        const kk = g.merge, nb = 100 / kk, tot = vp.bp.reduce((s, x) => s + x, 0);
        ok(g.bars.length === nb, `${tag}: ${g.bars.length} barre (attese ${nb})`);
        const sums = []; for (let j = 0; j < nb; j++) sums.push(vp.bp.slice(j * kk, (j + 1) * kk).reduce((s, x) => s + x, 0) / tot * 100);
        const mx = Math.max(...sums), edge = (j) => vp.lo * Math.exp(Math.log(vp.hi / vp.lo) * j * kk / 100);
        let badY = 0, badW = 0;
        for (let j = 0; j < nb; j++) {
          const bar = g.bars[j];
          if (Math.abs(bar.y - fy(edge(j + 1))) > 0.8) badY++;
          if (Math.abs(bar.w - (sums[j] / mx) * (g.col.w - 4)) > 0.15) badW++;
        }
        ok(!badY, `${tag}: barre all'altezza dei loro prezzi sulla scala dell'asse (${badY} su ${nb} fuori di oltre 0,8 px)`);
        ok(!badW, `${tag}: lunghezze proporzionali alla quota (${badW} su ${nb} diverse)`);
        const lowBot = g.bars[0].y + g.bars[0].h, topY = g.bars[nb - 1].y;
        ok(topY >= g.col.y - 0.1 && lowBot <= g.col.y + g.col.h + 0.1 && g.bars.every((x) => x.x >= g.col.x && x.x + x.w <= g.col.x + g.col.w + 0.05), `${tag}: barre dentro la colonna`);
        ok(Math.abs(fy(vp.lo) - (g.bars[0].y + g.bars[0].h)) < 1.2 && Math.abs(fy(vp.hi) - topY) < 0.8, `${tag}: estremi lo/hi del file alla quota giusta`);
        ok(g.bars.every((x) => x.h >= 2.2), `${tag}: barre visibili (min ${Math.min(...g.bars.map((x) => x.h)).toFixed(2)} px)`);
        // niente sovrapposizioni: linea del prezzo e punto dell'ultima chiusura a sinistra della colonna
        ok(g.px && g.px.r < g.col.x - 1, `${tag}: linea del prezzo fuori dalla colonna (${g.px && g.px.r.toFixed(1)} < ${g.col.x})`);
        ok(!g.last || g.last.cx + g.last.r < g.col.x, `${tag}: punto dell'ultima chiusura fuori dalla colonna`);
        ok(g.win == null || (g.win >= g.frame.x && g.win <= g.frame.x + g.frame.w), `${tag}: linea dei 12 mesi dentro il riquadro del prezzo`);
        ok(r === '3A' ? g.win != null : true, `${tag}: linea dell'inizio dei 12 mesi con 3A`);
        // testi: dentro il disegno e senza sovrapporsi tra loro
        const tin = g.texts.filter((t) => t.x < -0.5 || t.x + t.w > g.W + 0.5 || t.y < -0.5 || t.y + t.h > g.H + 0.5);
        ok(!tin.length, `${tag}: testi dentro il disegno (${tin.map((t) => t.t).join(' | ')})`);
        const ov = []; for (let i = 0; i < g.texts.length; i++) for (let j = i + 1; j < g.texts.length; j++) { const A1 = g.texts[i], B1 = g.texts[j]; if (A1.x < B1.x + B1.w - 0.5 && B1.x < A1.x + A1.w - 0.5 && A1.y < B1.y + B1.h - 0.5 && B1.y < A1.y + A1.h - 0.5) ov.push(`${A1.t}/${B1.t}`); }
        ok(!ov.length, `${tag}: testi senza sovrapposizioni (${ov.join(' ; ')})`);
        const head = g.texts.find((t) => /^vol/.test(t.t));
        ok(head && head.x >= g.col.x && head.x + head.w <= g.W, `${tag}: intestazione «${head && head.t}» sopra la colonna`);
        // legenda
        const leg = `a destra: volume per fascia di prezzo, dal ${dIT(vp.from)} al ${dIT(vp.to)} (${vp.text})`;
        ok(g.legend.includes(leg), `${tag}: legenda «${leg}»`);
        ok(/profilo poco stabile/.test(g.legend) === UNSTABLE.includes(id), `${tag}: avvertenza in legenda solo per oro, Nasdaq-100, KOSPI`);
        ok(g.scrollX <= 0 && g.boxR <= g.vw + 0.5, `${tag}: niente scorrimento orizzontale (${g.scrollX})`);
        // riquadro: tutte le barre (1440 scuro 3A), altrimenti un campione (più bassa, più alta, più lunga, una a caso)
        const all = vw === '1440' && theme === 'dark' && r === '3A';
        const iMax = sums.indexOf(mx), pick = all ? [...Array(nb).keys()] : [...new Set([0, nb - 1, iMax, Math.floor(nb * 0.37)])];
        if (r === '3A' || (r === '10A' && (vw === '1440' || vw === '390'))) {
          await p.evaluate(() => document.getElementById('athWrap').scrollIntoView({ block: 'center' })); await p.waitForTimeout(60);
          let bad = [];
          for (const j of pick) {
            const bar = g.bars[j];
            // punto verso il fondo della barra (non al centro) e a metà della larghezza o almeno 2 px
            const s = await toScreen(p, bar.x + Math.max(2, bar.w / 2), bar.y + bar.h * 0.75);
            if (phone) await p.touchscreen.tap(s.x, s.y); else await p.mouse.move(s.x, s.y);
            await p.waitForTimeout(phone ? 90 : 40); hovered++;
            const t = await tipState(p);
            const m = /Prezzi da ([\d.,]+) a ([\d.,]+)<\/span><b>([\d.,]+)%<\/b>/.exec(t.html);
            const want = fmtIt(sums[j], 1);
            const d = edge(j) < 10 ? 3 : 2, d2 = edge(j + 1) < 10 ? 3 : 2;
            const good = !t.hidden && m && m[3] === want && m[1] === fmtIt(edge(j), d) && m[2] === fmtIt(edge(j + 1), d2) && t.on === j && t.nOn === 1 &&
              t.text.includes(`del volume scambiato dal ${dIT(vp.from)} al ${dIT(vp.to)} (${vp.text})`) && /Profilo poco stabile/.test(t.text) === UNSTABLE.includes(id) &&
              t.l >= 0 && t.r <= t.vw + 0.5 && t.sw <= t.cw + 1;
            if (!good) bad.push(`#${j} tip=«${t.text.slice(0, 70)}» atteso ${fmtIt(edge(j), d)}-${fmtIt(edge(j + 1), d2)} ${want}% on=${t.on}`);
            if (j === iMax && (id === 'SPX' || id === 'GOLD') && r === '3A') await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `tip-${id}-${name}.png`) });
          }
          ok(!bad.length, `${tag}: riquadro su ${pick.length} barre: fascia, quota (dai bp) e barra accesa (${bad.slice(0, 3).join(' || ')})`);
          // fuori dalle barre ma nella colonna (sopra la più alta): nessun riquadro e nessuna barra accesa
          if (topY - g.col.y > 6) {
            const s = await toScreen(p, g.col.x + g.col.w / 2, g.col.y + 2);
            if (phone) await p.touchscreen.tap(s.x, s.y); else await p.mouse.move(s.x, s.y);
            await p.waitForTimeout(60);
            const t = await tipState(p);
            ok(t.hidden && t.nOn === 0, `${tag}: colonna vuota sopra le barre: niente riquadro`);
          }
          // di nuovo sul prezzo: riquadro della seduta, nessuna barra accesa
          const s2 = await toScreen(p, g.frame.x + g.frame.w * 0.9, g.frame.y + g.frame.h / 2);
          if (phone) await p.touchscreen.tap(s2.x, s2.y); else await p.mouse.move(s2.x, s2.y);
          await p.waitForTimeout(60);
          const t2 = await tipState(p);
          ok(!t2.hidden && !/Volume degli ultimi 12 mesi/.test(t2.text) && t2.nOn === 0, `${tag}: sul prezzo il riquadro della seduta e nessuna barra accesa`);
          if (phone) await p.touchscreen.tap(3, 3); else await p.mouse.move(2, 2);
          await p.waitForTimeout(60);
          ok((await tipState(p)).hidden && (await tipState(p)).nOn === 0, `${tag}: fuori dal grafico il riquadro si chiude`);
        }
        if (['SPX', 'GOLD', 'SILVER', 'WTI', 'KOSPI', 'BTC'].includes(id) && (r !== 'MAX' || id === 'WTI')) await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `${id}-${name}-${r}.png`) });
      }
      // zoom: a metà (colonna tolta), fino all'ultima seduta (colonna) e scala
      if (['SPX', 'WTI', 'KOSPI'].includes(id) && (!phone || id === 'SPX')) {
        await act(p.locator('#athRange button[data-range="3A"]')); await p.waitForTimeout(100);
        const drag = async (f0, f1) => {
          await p.evaluate(() => document.getElementById('athWrap').scrollIntoView({ block: 'center' })); await p.waitForTimeout(60);
          const g = await geo(p);
          const s0 = await toScreen(p, g.frame.x + g.frame.w * f0, g.frame.y + g.frame.h * 0.5), s1 = await toScreen(p, g.frame.x + g.frame.w * f1, g.frame.y + g.frame.h * 0.5);
          if (phone) {
            await act(p.locator('#athLens'));
            const cdp = await c.newCDPSession(p);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s0.x, y: s0.y }] });
            for (let q = 1; q <= 8; q++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: s0.x + ((s1.x - s0.x) * q) / 8, y: s0.y }] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          } else { await p.mouse.move(s0.x, s0.y); await p.mouse.down(); await p.mouse.move(s1.x, s1.y, { steps: 8 }); await p.mouse.up(); }
          await p.waitForTimeout(200);
          return geo(p);
        };
        const z1 = await drag(0.2, 0.5);
        ok(!z1.col && !z1.bars.length && /profilo dei volumi nascosto: lo zoom non arriva all'ultima seduta/.test(z1.legend) && !/profilo dei volumi degli/.test(z1.aria) && z1.px.r > z1.frame.x + z1.frame.w - 2, `${name} ${id} zoom a metà: colonna tolta, riquadro del prezzo di nuovo largo, legenda`);
        if (id === 'SPX') await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `zoom-meta-${id}-${name}.png`) });
        await p.keyboard.press('Escape'); await p.waitForTimeout(150);
        const ze = await geo(p); ok(!!ze.col, `${name} ${id}: Esc toglie lo zoom e la colonna torna`);
        const z2 = await drag(0.8, 1.0);
        ok(!!z2.col && /a destra: volume per fascia/.test(z2.legend), `${name} ${id} zoom fino all'ultima seduta: colonna`);
        if (z2.col) { // la scala si allarga ai 12 mesi del profilo (limite dichiarato in sviluppo.md): lo misuro
          const a0 = z2.axis[0], a1 = z2.axis[z2.axis.length - 1];
          console.log(`INFO ${name} ${id} zoom finale: linea del prezzo alta ${(z2.px.b - z2.px.y).toFixed(0)} px su ${z2.frame.h} px del riquadro (asse ${a1.t}–${a0.t})`);
          if (id === 'SPX') await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `zoom-fine-${id}-${name}.png`) });
        }
        await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      }
      await act(p.locator(`#athTable tr.athr[data-id="${id}"]`)); await p.waitForTimeout(80);
    }
    ok(!errs.length, `${name}: console senza errori (${errs.join(' | ')})`);
    await c.close();
  }
  console.log(`riquadri provati: ${hovered}`);

  // tastiera (1440 scuro): Tab fino a una riga, Invio apre il grafico, Tab ai periodi, Invio cambia periodo
  {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('antigravity-theme', 'dark'); localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tbody tr.athr');
    await p.locator('#athTable tr.athr[data-id="SILVER"]').focus();
    await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    let g = await geo(p).catch(() => null);
    ok(g && g.col && /SI=F, dalle barre orarie/.test(g.legend), 'tastiera: Invio sulla riga dell\'argento apre il grafico con il profilo');
    let steps = 0, f = '';
    for (; steps < 40; steps++) { await p.keyboard.press('Tab'); f = await p.evaluate(() => (document.activeElement && document.activeElement.closest('#athRange') ? document.activeElement.dataset.range : '')); if (f) break; }
    ok(!!f, `tastiera: periodi raggiungibili con Tab (${steps + 1} Tab, ${f})`);
    await p.evaluate(() => document.querySelector('#athRange button[data-range="MAX"]').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    g = await geo(p);
    ok(g.col && await p.evaluate(() => document.querySelector('#athRange button[data-range="MAX"]').getAttribute('aria-pressed') === 'true' || document.querySelector('#athRange button[data-range="MAX"]').classList.contains('on')), 'tastiera: Invio su MAX cambia periodo e la colonna resta');
    const tabStops = await p.evaluate(() => [...document.querySelectorAll('#athChart [tabindex], #athChart a')].length);
    console.log(`INFO tastiera: elementi del grafico raggiungibili con Tab: ${tabStops} (il riquadro delle barre si apre solo con mouse o tocco; aria-label: «${g.aria}»)`);
    ok(!errs.length, `tastiera: console (${errs.join(' | ')})`);
    await c.close();
  }

  // dati mancanti o rovinati (page.route), 1440 scuro e 390 chiaro
  const variants = [
    ['senza-profiles', (h) => { delete h.profiles; }, { SPX: 'non', SILVER: 'non' }],
    ['SPX-null', (h) => { h.profiles.SPX = null; }, { SPX: 'non', SILVER: 'si' }],
    ['SPX-bp-99', (h) => { h.profiles.SPX.bp = h.profiles.SPX.bp.slice(1); }, { SPX: 'non' }],
    ['SPX-bp-zero', (h) => { h.profiles.SPX.bp = h.profiles.SPX.bp.map(() => 0); }, { SPX: 'non' }],
    ['SPX-bp-NaN', (h) => { h.profiles.SPX.bp[5] = null; }, { SPX: 'non' }],
    ['SPX-lo-0', (h) => { h.profiles.SPX.lo = 0; }, { SPX: 'non' }],
    ['SPX-senza-text-stable', (h) => { delete h.profiles.SPX.text; delete h.profiles.SPX.stable; delete h.profiles.GOLD.stableNote; }, { SPX: 'si', GOLD: 'si' }],
    ['SPX-to-futuro', (h) => { h.profiles.SPX.to = '2099-01-01'; }, { SPX: 'futuro' }],
    ['SPX-from-vecchio', (h) => { h.profiles.SPX.from = '1990-01-01'; }, { SPX: 'si' }],
    ['profiles-stringa', (h) => { h.profiles = 'x'; }, { SPX: 'non' }],
    ['history-404', null, { SPX: 'miss' }],
  ];
  for (const [vname, mod, exp] of variants) for (const [vw, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const c = await b.newContext(opt), phone = !!opt.hasTouch;
    await c.addInitScript(() => { try { localStorage.setItem('antigravity-theme', 'light'); localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    await c.route('**/data/ath_history.json*', async (route) => {
      if (!mod) return route.fulfill({ status: 404, body: 'no' });
      const resp = await route.fetch(); const h = await resp.json(); mod(h);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(h) });
    });
    const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tbody tr.athr');
    for (const [id, want] of Object.entries(exp)) {
      const row = p.locator(`#athTable tr.athr[data-id="${id}"]`);
      await (phone ? row.tap() : row.click()); await p.waitForTimeout(500);
      const st = await p.evaluate(() => ({ col: !!document.querySelector('#athChart .vpcol'), bars: document.querySelectorAll('#athChart .vpbar').length, legend: document.getElementById('athLegend').textContent, miss: !document.getElementById('athChartMiss').hidden && document.getElementById('athChartMiss').textContent, sx: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
      const tag = `dati ${vname} ${vw} ${id}`;
      if (want === 'non') ok(!st.col && !st.bars && /profilo dei volumi non disponibile/.test(st.legend), `${tag}: colonna tolta e «non disponibile» (${st.legend.slice(-60)})`);
      else if (want === 'si') ok(st.col && st.bars > 0, `${tag}: colonna presente`);
      else if (want === 'miss') ok(!!st.miss && !st.col, `${tag}: messaggio dello storico mancante («${st.miss}»)`);
      else if (want === 'futuro') { console.log(`INFO ${tag}: colonna ${st.col}, legenda «${st.legend.slice(-90)}»`); ok(!/zoom non arriva/.test(st.legend), `${tag}: profilo con fine dopo l'ultima seduta del grafico, senza zoom la legenda non parla di zoom`); }
      if (vname === 'SPX-senza-text-stable' && id === 'SPX') ok(/\(SPY\)/.test(st.legend) && !/poco stabile/.test(st.legend), `${tag}: senza text si usa il simbolo, senza stable nessuna avvertenza`);
      if (vname === 'SPX-senza-text-stable' && id === 'GOLD') ok(/profilo poco stabile/.test(st.legend), `${tag}: senza stableNote resta l'avvertenza predefinita`);
      if (vname === 'SPX-from-vecchio' && id === 'SPX') { const g = await geo(p); ok(g.win == null || g.win >= g.frame.x, `${tag}: inizio dei 12 mesi fuori dal tratto: niente linea sul bordo`); }
      ok(st.sx <= 0, `${tag}: niente scorrimento orizzontale`);
      if (vname === 'senza-profiles' || vname === 'history-404') await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `dati-${vname}-${vw}-${id}.png`) }).catch(() => {});
      await (phone ? row.tap() : row.click()); await p.waitForTimeout(100);
    }
    ok(!errs.length, `dati ${vname} ${vw}: console (${errs.join(' | ')})`);
    await c.close();
  }
  await b.close();
  console.log(`${okn} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
