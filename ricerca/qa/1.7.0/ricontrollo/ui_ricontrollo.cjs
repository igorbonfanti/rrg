// Ricontrollo 1.7.0 (commit e94ff75), vista 8 VIX: impaginazione della tabella degli episodi, telefono, mini-grafici,
// colori degli episodi senza crisi, riquadro dei valori, titoli stretti, legenda. Non importa js/vix.js: le attese sono
// scritte qui (date dal ricalcolo indipendente di ricalcolo.py, già confrontato a parte).
// Uso: BASE=http://127.0.0.1:8809/ OUT=<cartella> NODE_PATH=$(npm root -g) node ui_ricontrollo.cjs
// Deve fallire sulla 8796e55 (prima delle correzioni).
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8809/';
const OUT = process.env.OUT || '.';
const SHOTS = process.env.SHOTS !== '0';
let fail = 0, checks = 0; const res = {};
const ok = (c, m) => { checks++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; return c; };
const XS = [20, 25, 30, 40, 50];

// colori: rgb() -> Lab, ΔE 1976
const rgbOf = (s) => { const m = s.match(/[\d.]+/g).map(Number); return m.slice(0, 3); };
const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lab = ([r, g, b]) => { const [R, G, B] = [r, g, b].map(lin); const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883; const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const mix = (c, bg, a) => c.map((v, k) => v * a + bg[k] * (1 - a));
const lum = (c) => { const [R, G, B] = c.map(lin); return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

(async () => {
  const b = await chromium.launch();
  const open = async (opt, theme) => {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxEps tbody tr', { timeout: 30000 }); await p.waitForTimeout(400);
    const tap = async (l) => (opt.hasTouch ? l.tap() : l.click());
    return { c, p, errs, tap };
  };

  // 1. computer e tablet: tabella intera, mini-grafico non deformato, legenda del mini-grafico, intestazione «VIX massimo»
  res.desk = [];
  for (const w of [1440, 1410, 1366, 1280, 1100, 1024, 820]) for (const theme of ['light', 'dark']) {
    const name = `${w}-${theme === 'light' ? 'chiaro' : 'scuro'}`;
    const { c, p, errs, tap } = await open({ viewport: { width: w, height: 900 } }, theme);
    let worst = 0, n = 0, ar = [], sz = new Set();
    for (const ix of ['SPX', 'NDX']) {
      await tap(p.locator(`#vxIx button[data-ix="${ix}"]`)); await p.waitForTimeout(200);
      for (const X of XS) {
        await tap(p.locator(`#vxTable tr[data-x="${X}"]`)); await p.waitForTimeout(200);
        const m = await p.evaluate(() => {
          const t = document.getElementById('vxEps'), box = t.parentElement, th = [...t.querySelectorAll('thead th')];
          const last = th[th.length - 1].getBoundingClientRect(), br = box.getBoundingClientRect();
          const sp = [...t.querySelectorAll('svg.vxsp')].map((s) => { const r = s.getBoundingClientRect(); return [r.width, r.height]; });
          return { sw: t.scrollWidth, cw: box.clientWidth, lastRight: last.right, boxRight: br.right, lastTxt: th[th.length - 1].textContent, head: th.map((x) => x.textContent.trim()), sp };
        });
        n++; worst = Math.max(worst, m.sw - m.cw);
        // a 820 (tablet) la tabella scorreva già nella 1.6.2 (944-951 px in 760, misurato su 8151601): lì si chiede solo di non peggiorare
        if (w === 820) ok(m.sw <= 951, `${name} ${ix} ${X}: tablet, tabella larga ${m.sw} in ${m.cw} (1.6.2: 944-951 in 760; scorre nel suo riquadro)`);
        else ok(m.sw <= m.cw + 1 && m.lastRight <= m.boxRight + 1, `${name} ${ix} ${X}: tabella degli episodi intera (${m.sw}/${m.cw}), «${m.lastTxt}» visibile`);
        ok(m.head[4] === 'VIX massimo', `${name} ${ix} ${X}: intestazione «${m.head[4]}»`);
        m.sp.forEach(([a, h]) => { ar.push(a / h); sz.add(`${a.toFixed(0)}x${h.toFixed(1)}`); });
      }
    }
    ok(ar.length > 0 && ar.every((r) => Math.abs(r - 150 / 38) < 0.05), `${name}: ${ar.length} mini-grafici non deformati (rapporto ${Math.min(...ar).toFixed(3)}–${Math.max(...ar).toFixed(3)}, viewBox ${(150 / 38).toFixed(3)}; misure ${[...sz].join(', ')})`);
    const lg = await p.$eval('.vxsplegend', (x) => ({ t: x.textContent, vis: x.offsetParent !== null && x.getBoundingClientRect().height > 0 })).catch(() => null);
    ok(lg && lg.vis && /tratteggiata è la soglia/.test(lg.t) && /punto pieno il primo giorno/.test(lg.t) && /cerchio il massimo/.test(lg.t) && /tacca l'ultimo giorno/.test(lg.t) && /Asterisco/.test(lg.t), `${name}: riga di legenda del mini-grafico visibile`);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale della pagina (${sw[0]}/${sw[1]})`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    res.desk.push({ name, worst, n, sizes: [...sz] });
    if (SHOTS && [1440, 1366, 1280, 1024].includes(w)) {
      for (const X of [20, 40]) { await tap(p.locator('#vxIx button[data-ix="SPX"]')); await tap(p.locator(`#vxTable tr[data-x="${X}"]`)); await p.waitForTimeout(250); const el = await p.$('#vxEps'); await el.scrollIntoViewIfNeeded(); const pan = await p.$('#vxEps >> xpath=ancestor::div[contains(@class,"panel")]'); await pan.screenshot({ path: `${OUT}/shots/episodi-SPX-${X}-${name}.png` }); }
    }
    await c.close();
  }

  // 2. telefono: riassunto sotto la crisi, mini-grafico, prima colonna, quanto del mini-grafico si vede senza scorrere
  res.tel = [];
  for (const w of [390, 360]) for (const theme of ['light', 'dark']) {
    const name = `${w}-${theme === 'light' ? 'chiaro' : 'scuro'}`;
    const { c, p, errs, tap } = await open({ viewport: { width: w, height: w === 390 ? 844 : 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, theme);
    for (const ix of ['SPX', 'NDX']) {
      await tap(p.locator(`#vxIx button[data-ix="${ix}"]`)); await p.waitForTimeout(200);
      for (const X of XS) {
        await tap(p.locator(`#vxTable tr[data-x="${X}"]`)); await p.waitForTimeout(250);
        const m = await p.evaluate(() => {
          const t = document.getElementById('vxEps'), box = t.parentElement, br = box.getBoundingClientRect(), bg = getComputedStyle(document.body).backgroundColor;
          const rows = [...t.querySelectorAll('tbody tr')].map((r) => {
            const mob = r.querySelector('.vxmob'), cs = mob && getComputedStyle(mob), mr = mob && mob.getBoundingClientRect(), td = mob && mob.parentElement.getBoundingClientRect();
            const s = r.querySelector('svg.vxsp').getBoundingClientRect(), f = r.children[0].getBoundingClientRect();
            const hidden = [...r.children].filter((x) => getComputedStyle(x).display === 'none').length;
            return { txt: mob && mob.textContent, disp: cs && cs.display, fs: cs && parseFloat(cs.fontSize), col: cs && cs.color, inTd: mob && mr.left >= td.left - 0.5 && mr.right <= td.right + 0.5 && mr.bottom <= td.bottom + 0.5, crisisRight: td && td.right,
              first: f.width, spL: s.left, spR: s.right, spW: s.width, spH: s.height, hidden, open: /in corso/.test(mob ? mob.textContent : '') };
          });
          return { rows, boxL: br.left, boxR: br.right, sw: t.scrollWidth, cw: box.clientWidth, panelBg: getComputedStyle(box.closest('.panel')).backgroundColor, bg };
        });
        const R = m.rows;
        ok(R.length > 0 && R.every((r) => r.disp === 'block' && /^massimo \d+,\d il \d\d\/\d\d\/\d{4} · (fino al \d\d\/\d\d\/\d{4}|in corso) · [\d.]+ sedute$/.test(r.txt) && r.inTd), `${name} ${ix} ${X}: massimo, fine e sedute sotto la crisi in ${R.filter((r) => r.disp === 'block').length}/${R.length} righe`);
        ok(R.every((r) => r.fs >= 11), `${name} ${ix} ${X}: corpo del riassunto ${R[0].fs}px`);
        const cr = contrast(rgbOf(R[0].col), rgbOf(m.panelBg === 'rgba(0, 0, 0, 0)' ? m.bg : m.panelBg));
        ok(cr >= 4.5, `${name} ${ix} ${X}: contrasto del riassunto ${cr.toFixed(2)}:1`);
        ok(R.every((r) => Math.abs(r.spW / r.spH - 150 / 38) < 0.05), `${name} ${ix} ${X}: mini-grafici non deformati (${R[0].spW.toFixed(0)}×${R[0].spH.toFixed(1)} px)`);
        // in corso: solo le soglie 20 e 25 (episodi dal 02/11/2026 e dal 05/11/2026, ricalcolo.py)
        const nOpen = R.filter((r) => r.open).length;
        ok(nOpen === (X === 20 || X === 25 ? 1 : 0) && (!nOpen || R[0].open), `${name} ${ix} ${X}: episodi «in corso» ${nOpen}`);
        // quanto del mini-grafico si vede senza scorrere la tabella
        const vis = Math.max(0, Math.min(R[0].spR, m.boxR) - Math.max(R[0].spL, m.boxL)) / R[0].spW;
        if (ix === 'SPX' && X === 40) res.tel.push({ name, first: R[0].first, visSpark: +vis.toFixed(2), tableW: m.sw, boxW: m.cw, spark: `${R[0].spW.toFixed(0)}x${R[0].spH.toFixed(1)}`, hiddenCells: R[0].hidden });
      }
    }
    const pt = await p.$$eval('#vxChart text.pane-t', (ts) => ts.map((t) => ({ t: t.textContent, w: t.getBBox().width, x: t.getBBox().x })));
    const cw = await p.$eval('#vxChart', (s) => +s.getAttribute('viewBox').split(' ')[2]);
    ok(pt[0] && pt[0].t === 'VIX E REALIZZATA S&P 500 (21 SEDUTE)', `${name}: titolo stretto del primo pannello «${pt[0] && pt[0].t}»`);
    ok(pt.every((t) => t.x + t.w <= cw), `${name}: titoli dei pannelli dentro il grafico (${pt.map((t) => (t.x + t.w).toFixed(0)).join(', ')} su ${cw})`);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale della pagina`);
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    if (SHOTS) {
      for (const X of [20, 40]) { await tap(p.locator('#vxIx button[data-ix="SPX"]')); await tap(p.locator(`#vxTable tr[data-x="${X}"]`)); await p.waitForTimeout(250); const el = await p.$('#vxEps'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/shots/tel-episodi-SPX-${X}-${name}.png` }); }
      await tap(p.locator('#vxIx button[data-ix="NDX"]')); await p.waitForTimeout(250); const ch = await p.$('#vxWrap'); await ch.scrollIntoViewIfNeeded(); await ch.screenshot({ path: `${OUT}/shots/tel-grafico-NDX-20-${name}.png` });
    }
    await c.close();
  }

  // 3. colori: episodi senza crisi in grigio, distinti dalle crisi (righe e fasce), chiaro e scuro
  res.col = {};
  for (const theme of ['light', 'dark']) {
    const name = theme === 'light' ? 'chiaro' : 'scuro';
    const { c, p, errs, tap } = await open({ viewport: { width: 1440, height: 900 } }, theme);
    await tap(p.locator('#vxIx button[data-ix="SPX"]')); await tap(p.locator('#vxTable tr[data-x="25"]')); await tap(p.locator('#vxRange button[data-range="MAX"]')); await p.waitForTimeout(300);
    const m = await p.evaluate(() => {
      const st = getComputedStyle(document.documentElement), g = [...Array(16).keys()].map((k) => st.getPropertyValue(`--g${k}`).trim());
      const ink3 = st.getPropertyValue('--ink-3').trim(), amber = st.getPropertyValue('--amber').trim();
      const rows = [...document.querySelectorAll('#vxEps tbody tr')].map((r) => ({ cls: r.className, h: getComputedStyle(r.querySelector('.vxsp-h')).stroke, l: getComputedStyle(r.querySelector('.vxsp-l')).stroke, hw: getComputedStyle(r.querySelector('.vxsp-h')).strokeWidth, lw: getComputedStyle(r.querySelector('.vxsp-l')).strokeWidth }));
      const bands = [...document.querySelectorAll('#vxChart rect.vxepb')].map((r) => ({ cls: r.getAttribute('class'), fill: getComputedStyle(r).fill, op: +getComputedStyle(r).opacity }));
      const wrap = document.getElementById('vxWrap'); let e = wrap, bg = 'rgba(0, 0, 0, 0)'; while (e && (bg = getComputedStyle(e).backgroundColor) === 'rgba(0, 0, 0, 0)') e = e.parentElement;
      const key = getComputedStyle(document.querySelector('.kb.vxk-ep')).backgroundImage;
      const lgt = document.getElementById('vxLegend').textContent;
      return { g, ink3, amber, rows, bands, bg, key, lgt };
    });
    const G = m.g.map(hexRgb), gray = rgbOf(m.rows.find((r) => /gnone/.test(r.cls)).h);
    const nG = m.rows.filter((r) => /gnone/.test(r.cls));
    ok(nG.length > 0 && nG.every((r) => r.h === nG[0].h), `${name}: ${nG.length} righe senza crisi, tutte dello stesso colore ${nG[0] && nG[0].h}`);
    ok(dE(gray, hexRgb(m.ink3.length === 7 ? m.ink3 : '#000000')) < 1, `${name}: colore delle righe senza crisi = --ink-3 (${m.ink3})`);
    const dRow = G.map((x) => dE(gray, x)), minRow = Math.min(...dRow);
    ok(minRow >= 20, `${name}: grigio delle righe lontano da ogni crisi (ΔE minimo ${minRow.toFixed(1)} con g${dRow.indexOf(minRow)} ${m.g[dRow.indexOf(minRow)]})`);
    const amberD = Math.min(...G.map((x) => dE(hexRgb(m.amber), x)));
    console.log(`  per confronto, l'ambra di prima (${m.amber}) distava ΔE ${amberD.toFixed(1)} dalla crisi più vicina`);
    // fasce: colore composto sull'sfondo
    const bg = rgbOf(m.bg), bn = m.bands.filter((x) => /gnone/.test(x.cls)), bc = m.bands.filter((x) => /\bg\d+\b/.test(x.cls));
    ok(bn.length > 0 && bn.every((x) => dE(rgbOf(x.fill), gray) < 1), `${name}: ${bn.length} fasce senza crisi grigie (${bn[0] && bn[0].fill})`);
    const op = m.bands[0].op;
    ok(Math.abs(op - (theme === 'light' ? 0.28 : 0.34)) < 0.001, `${name}: opacità delle fasce ${op}`);
    const grayC = mix(gray, bg, op), dB = G.map((x) => dE(grayC, mix(x, bg, op))), minB = Math.min(...dB);
    const vis = G.map((x) => dE(mix(x, bg, op), bg)), minVis = Math.min(...vis);
    // per confronto: la distanza minima tra due fasce di crisi, e quella dell'ambra di prima
    let minCC = 1e9, pairCC = ''; G.forEach((x, i) => G.forEach((y, j) => { if (j > i) { const d = dE(mix(x, bg, op), mix(y, bg, op)); if (d < minCC) { minCC = d; pairCC = `g${i}-g${j}`; } } }));
    const ambB = Math.min(...G.map((x) => dE(mix(hexRgb(m.amber), bg, theme === 'light' ? 0.28 : 0.28), mix(x, bg, theme === 'light' ? 0.28 : 0.28))));
    // criterio: la fascia grigia non deve confondersi con una crisi più di quanto due crisi si confondano tra loro, e meno dell'ambra di prima
    ok(minB >= minCC && minB > ambB, `${name}: fascia grigia distinta dalle fasce di crisi sullo sfondo (ΔE minimo ${minB.toFixed(1)} con g${dB.indexOf(minB)}; tra due crisi ${minCC.toFixed(1)}; ambra di prima ${ambB.toFixed(1)})`);
    console.log(`  ${name}: fasce, ΔE minimo tra due crisi ${minCC.toFixed(1)} (${pairCC}); grigia contro crisi più vicina ${minB.toFixed(1)}; ambra di prima (opacità .28) contro crisi più vicina ${ambB.toFixed(1)}`);
    console.log(`  ${name}: fascia meno visibile sullo sfondo g${vis.indexOf(minVis)} ΔE ${minVis.toFixed(1)}; grigia ΔE ${dE(grayC, bg).toFixed(1)}`);
    ok(m.key && m.key !== 'none' && /gradient/.test(m.key), `${name}: campione della legenda delle fasce disegnato (${m.key.slice(0, 60)})`);
    ok(/grigi se la crisi non è nello scatter/.test(m.lgt), `${name}: la legenda spiega il grigio`);
    // nelle righe grigie i tratti a X o più hanno lo stesso colore della linea: si distinguono solo per lo spessore
    const same = nG.filter((r) => r.h === r.l).length;
    console.log(`  ${name}: righe grigie con tratti a X o più dello stesso colore della linea: ${same}/${nG.length} (spessore ${nG[0].hw} contro ${nG[0].lw})`);
    res.col[name] = { gray: nG[0].h, minRow: +minRow.toFixed(1), minCrisisPairBand: +minCC.toFixed(1), amberBandWas: +ambB.toFixed(1), minBand: +minB.toFixed(1), amberWas: +amberD.toFixed(1), op, sameAsLine: `${same}/${nG.length}`, minVis: +minVis.toFixed(1) };
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    if (SHOTS) { const ch = await p.$('#vxWrap'); await ch.screenshot({ path: `${OUT}/shots/grafico-SPX-25-MAX-1440-${name}.png` }); await tap(p.locator('#vxTable tr[data-x="20"]')); await p.waitForTimeout(250); await ch.screenshot({ path: `${OUT}/shots/grafico-SPX-20-MAX-1440-${name}.png` }); }
    await c.close();
  }

  // 4. riquadro dei valori: Nasdaq-100, episodio in corso e finito
  {
    const { c, p, errs, tap } = await open({ viewport: { width: 1440, height: 900 } }, 'light');
    await tap(p.locator('#vxIx button[data-ix="NDX"]')); await tap(p.locator('#vxTable tr[data-x="20"]')); await tap(p.locator('#vxRange button[data-range="3A"]')); await p.waitForTimeout(300);
    const box = await p.$('#vxChart').then((h) => h.boundingBox());
    // ultima seduta: bordo destro del grafico
    await p.mouse.move(box.x + box.width - 50, box.y + box.height * 0.4); await p.waitForTimeout(80);
    let tip = await p.$eval('#vxTip', (t) => t.innerText);
    for (let dx = 49; dx >= 1 && !/06\/11\/2026/.test(tip); dx--) { await p.mouse.move(box.x + box.width - dx, box.y + box.height * 0.4); await p.waitForTimeout(40); tip = await p.$eval('#vxTip', (t) => t.innerText); }
    console.log('  riquadro ultima seduta: ' + tip.replace(/\n/g, ' / '));
    ok(/06\/11\/2026/.test(tip) && tip.includes("Nell'episodio a 20 o più iniziato il 02/11/2026, ancora in corso") && !/al 06\/11\/2026/.test(tip), `NDX 20: riquadro dell'ultima seduta «ancora in corso»`);
    ok(/^06\/11\/2026\s+Nasdaq-100 /.test(tip) && tip.includes('Realizzata S&P 500, 21 sedute') && tip.includes('Premio per la paura (S&P 500)'), 'NDX: prima riga con il Nasdaq-100, realizzata e premio dichiarati dell\'S&P 500');
    ok(/provv/i.test(tip) || /\*/.test(tip), 'riquadro dell\'ultima seduta: VIX segnato provvisorio');
    await tap(p.locator('#vxRange button[data-range="MAX"]')); await p.waitForTimeout(300);
    const lg = await p.$eval('#vxLegend', (x) => x.textContent);
    console.log('  legenda: ' + lg);
    res.legend = lg;
    if (SHOTS) { await p.mouse.move(box.x + box.width - 45, box.y + box.height * 0.4); await p.waitForTimeout(100); await (await p.$('#vxWrap')).screenshot({ path: `${OUT}/shots/riquadro-NDX-20-MAX-1440-chiaro.png` }); }
    ok(!errs.length, `riquadro: console ${errs.join(' | ')}`);
    await c.close();
  }
  console.log(JSON.stringify(res, null, 1));
  console.log(`${checks} controlli, ${fail} FAIL`);
  fs.writeFileSync(OUT + '/ui_esito.json', JSON.stringify({ checks, fail, res }, null, 1));
  await b.close(); process.exit(fail ? 1 : 0);
})();
