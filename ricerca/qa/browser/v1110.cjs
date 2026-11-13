// 1.11.0: profilo dei volumi degli ultimi 12 mesi accanto al grafico del pannello «Distanza dal massimo degli ultimi 3 anni»
// (vista 8 VIX). Per tutti e 9 i mercati, con 3A, 10A, MAX e lo zoom, a 1440, 1280, 390 e 360 px, tema scuro e chiaro:
// colonna, barre (alte almeno 3 px), linea dell'inizio dei 12 mesi, legenda con date e strumento, avvertenza per oro,
// Nasdaq-100 e KOSPI, riquadro sulla barra più lunga (quota ricalcolata qui dai bp del file, posizione controllata con i
// valori dell'asse), colonna tolta con uno zoom che non arriva all'ultima seduta, niente sovrapposizioni con la linea del
// prezzo, niente scorrimento orizzontale, console senza errori. Testi: nota del pannello, guida, versione.
// Deve fallire sulla 1.10.2 (nessun profilo).
// Uso: BASE=http://127.0.0.1:8862/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v1110.cjs  (SHOTS=0 senza immagini)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8862/';
const SHOTS = process.env.SHOTS !== '0' ? path.join(__dirname, '..', '1.11.0', 'shots') : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, okn = 0;
const ok = (c, m) => { if (!c) { console.log(`FAIL ${m}`); fail++; } else { okn++; if (process.env.VERBOSE) console.log(`OK   ${m}`); } };
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const UNSTABLE = ['GOLD', 'NDX', 'KOSPI'];
const WARN = 'profilo poco stabile: con metodi di calcolo diversi (barre giornaliere o orarie, 50, 100 o 200 fasce) le zone principali si spostano di oltre il 2% (due zone di volume quasi uguali); leggere con cautela';
// valore di un'etichetta dell'asse: «6,5k», «7.000», «2,5», «105k»
const labVal = (t) => { const k = /k$/.test(t); const v = parseFloat(t.replace(/k$/, '').replace(/\./g, '').replace(',', '.')); return k ? v * 1000 : v; };

(async () => {
  const H = await (await fetch(BASE + 'data/ath_history.json?x=' + Date.now())).json().catch(() => null);
  const A = await (await fetch(BASE + 'data/ath.json?x=' + Date.now())).json().catch(() => null);
  const P = (H && H.profiles) || {};
  const ids = A ? A.markets.map((m) => m.id) : [];
  ok(ids.length === 9 && ids.every((id) => P[id] && Array.isArray(P[id].bp) && P[id].bp.length === 100), `dati: profili per i 9 mercati (${Object.keys(P).filter((k) => P[k]).length})`);
  ok(UNSTABLE.every((id) => P[id] && P[id].stable === false) && ids.filter((id) => !UNSTABLE.includes(id)).every((id) => P[id] && P[id].stable === true), 'dati: stabilità (oro, Nasdaq-100, KOSPI con l\'avvertenza)');
  const b = await chromium.launch();
  const VIEWS = [['1440', { viewport: { width: 1440, height: 900 } }], ['1280', { viewport: { width: 1280, height: 900 } }],
    ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['360', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }]];
  for (const [vw, opt] of VIEWS.filter(([v]) => !process.env.ONLY || process.env.ONLY.split(',').includes(v))) for (const theme of ['dark', 'light']) {
    const name = `${vw}-${theme === 'dark' ? 'scuro' : 'chiaro'}`, phone = !!opt.hasTouch;
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const tap = async (l) => (phone ? l.tap({ timeout: 5000 }) : l.click({ timeout: 5000 })).catch(() => ok(false, `${name}: elemento da toccare assente`));
    await p.goto(BASE + '#vix');
    await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === theme, `${name}: tema`);
    for (const id of ids) {
      const vp = P[id] || {};
      await tap(p.locator(`#athTable tr.athr[data-id="${id}"]`));
      await p.waitForSelector('#athChart .athpx', { timeout: 10000 }).catch(() => {});
      for (const r of ['3A', '10A', 'MAX']) {
        await tap(p.locator(`#athRange button[data-range="${r}"]`)); await p.waitForTimeout(120);
        const g = await p.evaluate(() => {
          const svg = document.getElementById('athChart'), vb = svg.viewBox.baseVal, col = svg.querySelector('.vpcol'), px = svg.querySelector('.athpx');
          const bars = [...svg.querySelectorAll('.vpbar')].map((e) => ({ x: +e.getAttribute('x'), y: +e.getAttribute('y'), w: +e.getAttribute('width'), h: +e.getAttribute('height') }));
          const win = svg.querySelector('.vpwin'), pb = px ? px.getBBox() : null;
          const head = [...svg.querySelectorAll('text.axt')].find((t) => /^vol/.test(t.textContent));
          return { W: vb.width, col: col ? { x: +col.getAttribute('x'), y: +col.getAttribute('y'), w: +col.getAttribute('width'), h: +col.getAttribute('height') } : null, bars, merge: +svg.dataset.vpMerge || 0,
            win: win ? +win.getAttribute('x1') : null, pxRight: pb ? pb.x + pb.width : null, aria: svg.getAttribute('aria-label') || '', legend: document.getElementById('athLegend').textContent,
            head: head ? { t: head.textContent, x: head.getBBox().x, r: head.getBBox().x + head.getBBox().width } : null,
            scrollX: document.documentElement.scrollWidth - window.innerWidth };
        });
        const tag = `${name} ${id} ${r}`;
        ok(g.col && g.bars.length === 100 / g.merge, `${tag}: colonna e ${g.bars.length} barre (fasce unite ${g.merge})`);
        if (!g.col) continue;
        ok(phone ? g.col.w === 44 : g.col.w >= 44 && g.col.w <= 110, `${tag}: colonna larga ${g.col.w}`);
        const band = g.bars.length > 1 ? Math.abs(g.bars[0].y - g.bars[1].y) : 0; // passo tra una barra e la successiva (altezza della fascia unita)
        ok(band >= 2.99 && (g.merge === 1 || band / g.merge < 3), `${tag}: barre alte almeno 3 px (${band.toFixed(2)}, ${g.merge} fasce)`);
        ok(g.bars.every((x) => x.x >= g.col.x && x.x + x.w <= g.col.x + g.col.w && x.y >= g.col.y - 0.1 && x.y + x.h <= g.col.y + g.col.h + 0.1), `${tag}: barre dentro la colonna`);
        ok(g.pxRight != null && g.pxRight <= g.col.x - 5, `${tag}: linea del prezzo prima della colonna (${g.pxRight && g.pxRight.toFixed(1)} < ${g.col.x})`);
        ok(g.win != null && g.win < g.col.x, `${tag}: linea dell'inizio dei 12 mesi`);
        ok(g.head && g.head.t === (g.col.w >= 70 ? 'volumi 12 mesi' : 'vol. 12m') && g.head.r <= g.W, `${tag}: intestazione «${g.head && g.head.t}» dentro il disegno`);
        ok(/profilo dei volumi degli ultimi 12 mesi/.test(g.aria), `${tag}: aria-label`);
        ok(g.legend.includes(`a destra: volume per fascia di prezzo, dal ${dIT(vp.from)} al ${dIT(vp.to)} (${vp.text})`) && g.legend.includes('inizio dei 12 mesi'), `${tag}: legenda con date e strumento`);
        ok(g.legend.includes(WARN) === UNSTABLE.includes(id), `${tag}: avvertenza nella legenda ${UNSTABLE.includes(id) ? 'presente' : 'assente'}`);
        ok(g.scrollX <= 0, `${tag}: nessuno scorrimento orizzontale (${g.scrollX})`);
        // riquadro sulla barra più lunga: quota ricalcolata dai bp del file con le stesse fasce unite
        if (r === '3A' || (r === '10A' && vw === '1440')) {
          const sums = []; const tot = vp.bp.reduce((a, x) => a + x, 0);
          for (let k = 0; k < 100 / g.merge; k++) sums.push(vp.bp.slice(k * g.merge, (k + 1) * g.merge).reduce((a, x) => a + x, 0) / tot * 100);
          const iMax = sums.indexOf(Math.max(...sums)), want = sums[iMax].toFixed(1).replace('.', ',') + '%';
          const bar = g.bars.reduce((a, x) => (x.w > a.w ? x : a));
          await p.evaluate(() => document.getElementById('athWrap').scrollIntoView({ block: 'center' })); await p.waitForTimeout(80);
          const pt = await p.evaluate(({ x, y }) => { const svg = document.getElementById('athChart'), q = svg.createSVGPoint(); q.x = x; q.y = y; const s = q.matrixTransform(svg.getScreenCTM()); return { x: s.x, y: s.y }; }, { x: bar.x + Math.max(2, bar.w / 2), y: bar.y + bar.h / 2 });
          if (phone) await p.touchscreen.tap(pt.x, pt.y); else await p.mouse.move(pt.x, pt.y);
          await p.waitForTimeout(120);
          const tip = await p.evaluate(() => { const t = document.getElementById('athTip'); const r = t.getBoundingClientRect(); return { hidden: t.hidden, text: t.textContent, l: r.left, rr: r.right, vw: window.innerWidth, on: document.querySelectorAll('#athChart .vpbar.on').length }; });
          ok(!tip.hidden && tip.text.includes('Volume degli ultimi 12 mesi') && tip.text.includes(want) && tip.text.includes(`dal ${dIT(vp.from)} al ${dIT(vp.to)}`) && tip.text.includes(vp.text), `${tag}: riquadro sulla barra più lunga con ${want} («${tip.text.slice(0, 90)}…»)`);
          ok(tip.text.includes('Profilo poco stabile') === UNSTABLE.includes(id), `${tag}: avvertenza nel riquadro`);
          ok(tip.on === 1 && tip.l >= 0 && tip.rr <= tip.vw, `${tag}: una barra evidenziata, riquadro dentro lo schermo`);
          // posizione: gli estremi della barra (dal riquadro) sulla scala dei valori dell'asse
          const m = /Prezzi da ([\d.,]+) a ([\d.,]+)/.exec(tip.text);
          const ax = await p.evaluate(() => [...document.querySelectorAll('#athChart text.axt')].filter((t) => +t.getAttribute('x') > document.getElementById('athChart').viewBox.baseVal.width - 52).map((t) => ({ t: t.textContent, y: +t.getAttribute('y') - 3 })));
          if (m && ax.length >= 2) {
            const a0 = ax[0], a1 = ax[ax.length - 1], v0 = Math.log(labVal(a0.t)), v1 = Math.log(labVal(a1.t));
            const fy = (v) => a0.y + ((Math.log(v) - v0) / (v1 - v0)) * (a1.y - a0.y);
            const yb = fy(labVal(m[1])), yt = fy(labVal(m[2]));
            ok(Math.abs(yt - bar.y) < 1 && Math.abs(yb - (bar.y + bar.h)) < 1.5, `${tag}: barra all'altezza dei suoi prezzi (${yt.toFixed(1)}–${yb.toFixed(1)} contro ${bar.y.toFixed(1)}–${(bar.y + bar.h).toFixed(1)})`);
          } else ok(false, `${tag}: prezzi nel riquadro o valori dell'asse non trovati`);
          if (SHOTS && ((id === 'SPX' && r === '3A') || (id === 'KOSPI' && r === '3A' && vw === '390'))) await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `riquadro-${id}-${name}-${r}.png`) });
          if (phone) await p.touchscreen.tap(5, 5); else await p.mouse.move(2, 2);
          await p.waitForTimeout(80);
        }
        if (SHOTS && (['SPX', 'GOLD', 'SILVER'].includes(id) || (id === 'KOSPI' && r === '10A'))) await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `${id}-${name}-${r}.png`) });
      }
      // zoom su un tratto che non arriva all'ultima seduta: colonna tolta, scala del tratto; zoom fino alla fine: colonna di nuovo
      if (!phone || id === 'SPX') {
        await tap(p.locator('#athRange button[data-range="10A"]')); await p.waitForTimeout(100);
        const drag = async (f0, f1) => {
          await p.evaluate(() => document.getElementById('athWrap').scrollIntoView({ block: 'center' })); await p.waitForTimeout(80);
          const box = await p.evaluate(() => { const svg = document.getElementById('athChart'), col = svg.querySelector('.vpcol'), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; const pw = (col ? +col.getAttribute('x') - 6 : vb.width - 52) - 8; return { x: r.left + (8 / vb.width) * r.width, w: (pw / vb.width) * r.width, y: r.top + r.height * 0.4 }; });
          if (phone) await tap(p.locator('#athLens'));
          const x0 = box.x + box.w * f0, x1 = box.x + box.w * f1;
          if (phone) {
            const cdp = await c.newCDPSession(p);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: box.y }] });
            for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * k) / 8, y: box.y }] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          } else { await p.mouse.move(x0, box.y); await p.mouse.down(); await p.mouse.move(x1, box.y, { steps: 8 }); await p.mouse.up(); }
          await p.waitForTimeout(200);
          return p.evaluate(() => ({ col: !!document.querySelector('#athChart .vpcol'), bars: document.querySelectorAll('#athChart .vpbar').length, zoom: !document.getElementById('athZoom').hidden, legend: document.getElementById('athLegend').textContent, aria: document.getElementById('athChart').getAttribute('aria-label') }));
        };
        const z1 = await drag(0.3, 0.6);
        ok(z1.zoom && !z1.col && !z1.bars && /profilo dei volumi nascosto: lo zoom non arriva all'ultima seduta/.test(z1.legend) && !/profilo dei volumi/.test(z1.aria), `${name} ${id} zoom a metà: colonna tolta (zoom ${z1.zoom}, colonna ${z1.col})`);
        if (SHOTS && id === 'SPX') await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `zoom-meta-${id}-${name}.png`) });
        await tap(p.locator('#athZoom button')); await p.waitForTimeout(150);
        const z2 = await drag(0.85, 1.05);
        ok(z2.zoom && z2.col && z2.bars > 0 && /a destra: volume per fascia di prezzo/.test(z2.legend), `${name} ${id} zoom fino alla fine: colonna (zoom ${z2.zoom}, colonna ${z2.col})`);
        if (SHOTS && id === 'SPX') await p.locator('#athChartBox').screenshot({ path: path.join(SHOTS, `zoom-fine-${id}-${name}.png`) });
        await tap(p.locator('#athZoom button')); await p.waitForTimeout(150);
      }
      await tap(p.locator(`#athTable tr.athr[data-id="${id}"]`)); await p.waitForTimeout(100); // chiude
    }
    const note = await p.$eval('#athNoteVp', (x) => x.textContent).catch(() => '');
    ok(/profilo dei volumi degli ultimi 12 mesi/.test(note) && /poco stabile/.test(note) && /oro, Nasdaq-100 e KOSPI/.test(note) && /ricerca\/poc\/profilo\//.test(note), `${name}: nota del pannello`);
    if (SHOTS && vw === '1440') await p.locator('#athNote').screenshot({ path: path.join(SHOTS, `nota-${name}.png`) });
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  const gd = await (await fetch(BASE + 'guida.html?x=' + Date.now())).text();
  ok(/id="profilo-volumi"/.test(gd) && /6 mercati su 9/.test(gd) && /SPY/.test(gd) && /069500\.KS/.test(gd) && /KOSPI 200/.test(gd), 'guida: paragrafo «Profilo dei volumi»');
  const v = await (await fetch(BASE + 'version.json?x=' + Date.now())).json();
  ok(v.version === '1.11.0', `version.json ${v.version}`);
  const js = await (await fetch(BASE + 'js/version.js?x=' + Date.now())).text();
  ok(/VERSION = '1\.11\.0'/.test(js), 'js/version.js 1.11.0');
  await b.close(); console.log(`${okn} OK, ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
