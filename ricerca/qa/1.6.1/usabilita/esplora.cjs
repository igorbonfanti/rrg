// Controllo di usabilità 1.6.1 (vista 8 VIX, scatter con le crisi): percorsi da utente su computer, tablet e telefono.
// Misura, non giudica: stampa i valori e salva screenshot in shots/. Le righe «OSS» sono osservazioni da leggere.
// Uso: BASE=http://127.0.0.1:8802/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/usabilita/esplora.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
const OUT = path.join(__dirname, 'shots');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const oss = (m) => console.log(`OSS  ${m}`);
const COVID = '2020 Covid';
const CONF = [
  ['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'],
  ['1440-chiaro', { viewport: { width: 1440, height: 900 } }, 'light'],
  ['1280-chiaro', { viewport: { width: 1280, height: 800 } }, 'light'],
  ['1280-scuro', { viewport: { width: 1280, height: 800 } }, 'dark'],
  ['1024-chiaro-tocco', { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true }, 'light'],
  ['820-scuro-tocco', { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }, 'dark'],
  ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'dark'],
  ['390-chiaro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light'],
  ['360-chiaro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light'],
  ['360-scuro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'dark'],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

(async () => {
  const b = await chromium.launch();
  for (const [name, opt, theme] of CONF) {
    if (ONLY && !ONLY.includes(name)) continue;
    const touch = !!opt.hasTouch;
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    console.log(`\n===== ${name}`);
    const t0 = Date.now();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 });
    oss(`${name}: vista VIX pronta (scatter disegnato) in ${Date.now() - t0} ms dall'apertura`);
    await p.waitForTimeout(400);
    const tap = async (loc) => (touch ? loc.tap() : loc.click());
    const tapXY = async (x, y) => (touch ? p.touchscreen.tap(x, y) : p.mouse.click(x, y));
    const state = () => p.evaluate(() => ({
      sel: document.getElementById('vxScatter').classList.contains('vxsel'),
      pressed: (document.querySelector('#vxCrises button[aria-pressed="true"]') || {}).dataset?.g || null,
      halo: document.querySelectorAll('#vxScatter .vxhalo circle').length,
      on: document.querySelectorAll('#vxScatter circle.vxpt.on').length,
      rows: document.querySelectorAll('#vxEps tr.sel').length,
      none: document.getElementById('vxEpsNone').hidden ? null : document.getElementById('vxEpsNone').textContent,
      tip: document.getElementById('vxScTip').hidden ? null : document.getElementById('vxScTip').innerText.replace(/\n+/g, ' | '),
    }));
    const pointXY = (g, start) => p.$eval(`#vxScatter circle.vxpt${start ? '.start' : ':not(.start)'}[data-g="${g}"]`, (c) => { c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    const pointsXY = (g) => p.$$eval(`#vxScatter circle.vxpt[data-g="${g}"]`, (cs) => cs.map((c) => { const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));

    // --- scoperta: cursore, suggerimenti, dimensioni dei bersagli
    const disc = await p.evaluate(() => {
      const hit = [...document.querySelectorAll('#vxScatter rect')].find((r) => r.getAttribute('fill') === 'transparent');
      const bs = [...document.querySelectorAll('#vxCrises button')].map((x) => x.getBoundingClientRect());
      const row = document.querySelector('#vxEps tr[data-g]');
      return { cursorHit: getComputedStyle(hit).cursor, cursorBtn: getComputedStyle(document.querySelector('#vxCrises button')).cursor, cursorRow: row ? getComputedStyle(row).cursor : null,
        btnH: [Math.min(...bs.map((r) => r.height)), Math.max(...bs.map((r) => r.height))], btnW: Math.min(...bs.map((r) => r.width)), nBtn: bs.length,
        labels: [...document.querySelectorAll('#vxCrises button')].map((x) => x.textContent) };
    });
    oss(`${name}: cursore sullo scatter «${disc.cursorHit}», sui pulsanti delle crisi «${disc.cursorBtn}», sulle righe degli episodi «${disc.cursorRow}»`);
    oss(`${name}: ${disc.nBtn} pulsanti delle crisi, altezza ${disc.btnH.map((x) => x.toFixed(1)).join('-')} px, larghezza minima ${disc.btnW.toFixed(1)} px`);
    if (name === '1440-scuro') oss(`etichette dell'elenco: ${disc.labels.join(' ; ')}`);

    // --- percorso «Covid»: dall'apertura, quanti passi; posizione dello scatter rispetto alla tabella
    const pos = await p.evaluate(() => { const r = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return [Math.round(b.top + scrollY), Math.round(b.bottom + scrollY)]; }; return { eps: r('vxEps'), sc: r('vxScatter'), list: r('vxCrises'), vh: innerHeight }; });
    oss(`${name}: tabella episodi y ${pos.eps.join('-')}, scatter y ${pos.sc.join('-')}, elenco crisi y ${pos.list.join('-')}, altezza finestra ${pos.vh}`);
    await p.screenshot({ path: path.join(OUT, `${name}-01-apertura.png`) });

    // 1) clic sulla riga Covid della tabella (soglia 40): si vede lo scatter?
    const covRow = p.locator('#vxEps tr[data-g="2020 Covid"]').first();
    await covRow.scrollIntoViewIfNeeded(); await tap(covRow); await p.waitForTimeout(200);
    let s = await state();
    ok(s.pressed === COVID && s.rows >= 1, `${name}: riga Covid → crisi selezionata (${s.pressed}, ${s.rows} righe, alone ${s.halo})`);
    const vis = await p.evaluate(() => { const b = document.getElementById('vxScatter').getBoundingClientRect(); const v = Math.max(0, Math.min(innerHeight, b.bottom) - Math.max(0, b.top)); return Math.round((100 * v) / b.height); });
    oss(`${name}: dopo il clic sulla riga si vede il ${vis}% dello scatter senza scorrere`);
    await p.screenshot({ path: path.join(OUT, `${name}-02-riga-covid.png`) });
    // stessa riga di nuovo: toglie
    await tap(covRow); await p.waitForTimeout(150); s = await state();
    ok(!s.sel && !s.pressed && !s.rows, `${name}: secondo clic sulla stessa riga toglie la selezione`);

    // 2) elenco: Covid
    const covBtn = p.locator('#vxCrises button', { hasText: COVID });
    await covBtn.scrollIntoViewIfNeeded(); await tap(covBtn); await p.waitForTimeout(200); s = await state();
    ok(s.sel && s.pressed === COVID && s.halo === s.on && s.halo > 0, `${name}: elenco → Covid (alone ${s.halo}, accesi ${s.on})`);
    await p.locator('#vxScWrap').screenshot({ path: path.join(OUT, `${name}-03-covid-scatter.png`) });

    // 3) spostamento della pagina: selezionare una crisi senza episodi sopra 40 fa comparire la scritta sopra lo scatter
    const y0 = await p.$eval('#vxScatter', (e) => e.getBoundingClientRect().top + scrollY);
    const golfo = await pointXY('1990 Golfo', true);
    const yv0 = await p.$eval('#vxScatter', (e) => e.getBoundingClientRect().top);
    await tapXY(golfo[0], golfo[1]); await p.waitForTimeout(200); s = await state();
    const y1 = await p.$eval('#vxScatter', (e) => e.getBoundingClientRect().top + scrollY), yv1 = await p.$eval('#vxScatter', (e) => e.getBoundingClientRect().top);
    oss(`${name}: clic sul pallino «1990 Golfo» → selezione ${s.pressed}; scritta: «${s.none}»; lo scatter si sposta di ${Math.round(y1 - y0)} px nella pagina (${Math.round(yv1 - yv0)} px sullo schermo)`);
    const under = await p.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? el.tagName + (el.getAttribute('class') ? '.' + el.getAttribute('class') : '') : null; }, golfo);
    oss(`${name}: sotto il dito/puntatore, dopo il clic, ora c'è ${under}`);
    await p.screenshot({ path: path.join(OUT, `${name}-04-golfo-scritta.png`) });

    // 4) tocco/clic su due punti della stessa crisi (lettura dei valori): la selezione si accende e si spegne?
    await p.keyboard.press('Escape'); if ((await state()).sel) { await tap(covBtn); await tap(covBtn); }
    const cov = (await pointsXY(COVID)).filter((q, i, a) => a.findIndex((r) => Math.hypot(r[0] - q[0], r[1] - q[1]) < 12) === i);
    const seq = [];
    for (const q of cov.slice(0, 3)) { await tapXY(q[0], q[1]); await p.waitForTimeout(150); const z = await state(); seq.push(`${z.pressed || 'nessuna'}${z.tip ? ' (riquadro sì)' : ' (riquadro no)'}`); }
    oss(`${name}: tre ${touch ? 'tocchi' : 'clic'} di fila su punti del Covid → ${seq.join(' → ')}`);
    const tipNow = (await state()).tip; if (tipNow) oss(`${name}: riquadro: «${tipNow}»`);
    if (touch) await p.screenshot({ path: path.join(OUT, `${name}-05-tocchi-covid.png`) });

    // 5) area «vuota» per togliere la selezione: quota del grafico dove il clic non prende un punto
    const empty = await p.evaluate(() => {
      const svg = document.getElementById('vxScatter'), fr = svg.querySelector('rect.frame').getBoundingClientRect();
      const cs = [...svg.querySelectorAll('circle.vxpt')].map((c) => [+c.getAttribute('cx'), +c.getAttribute('cy')]);
      const inv = svg.getScreenCTM().inverse(); let n = 0, e = 0;
      for (let x = fr.left + 2; x < fr.right; x += 6) for (let y = fr.top + 2; y < fr.bottom; y += 6) { const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const q = pt.matrixTransform(inv); let bd = Infinity; for (const [cx, cy] of cs) { const d = (cx - q.x) ** 2 + (cy - q.y) ** 2; if (d < bd) bd = d; } n++; if (bd > 400) e++; }
      return Math.round((100 * e) / n);
    });
    oss(`${name}: il ${empty}% dell'area del grafico è «vuoto» (un clic lì toglie la selezione)`);

    // 6) tastiera (solo computer): Tab sulle righe e sui pulsanti, Invio e Spazio, contorno del focus
    if (!touch) {
      await p.keyboard.press('Escape');
      await p.$eval('#vxTable tbody tr[data-x="50"]', (e) => e.focus());
      await p.keyboard.press('Tab');
      const f1 = await p.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, g: a.dataset.g || null, outline: getComputedStyle(a).outlineStyle + ' ' + getComputedStyle(a).outlineWidth }; });
      oss(`${name}: Tab dopo l'ultima riga delle soglie → ${f1.tag} ${f1.g} (contorno ${f1.outline})`);
      await p.keyboard.press('Enter'); await p.waitForTimeout(100); let k = await state();
      ok(f1.g && k.pressed === f1.g, `${name}: Invio sulla riga evidenzia ${k.pressed}`);
      await p.keyboard.press(' '); await p.waitForTimeout(100); k = await state();
      ok(!k.sel, `${name}: Spazio sulla stessa riga toglie la selezione`);
      const sy0 = await p.evaluate(() => scrollY);
      await p.locator('#vxCrises button').nth(2).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(100); k = await state();
      const g2 = await p.locator('#vxCrises button').nth(2).getAttribute('data-g');
      ok(k.pressed === g2, `${name}: Invio sul pulsante «${g2}» lo evidenzia`);
      await p.keyboard.press('Tab'); await p.keyboard.press(' '); await p.waitForTimeout(100); k = await state();
      const g3 = await p.locator('#vxCrises button').nth(3).getAttribute('data-g');
      ok(k.pressed === g3, `${name}: Tab + Spazio passa a «${g3}»`);
      const fo = await p.evaluate(() => { const a = document.activeElement; return getComputedStyle(a).outlineStyle; });
      oss(`${name}: contorno del focus sul pulsante: ${fo}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(100); k = await state();
      ok(!k.sel, `${name}: Esc toglie la selezione`);
      // Esc per chiudere la guida (?) mentre una crisi è selezionata
      await tap(covBtn); await p.keyboard.press('?'); await p.waitForTimeout(300);
      const helpOpen = await p.$eval('#helpModal', (d) => d.open);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200); k = await state();
      oss(`${name}: guida aperta con «?» (${helpOpen}), Esc la chiude → la crisi selezionata ${k.sel ? 'resta' : 'viene tolta anche lei'}`);
      await p.$eval('#helpModal', (d) => d.open && d.close()).catch(() => {});
    }

    // 7) cambio soglia con il Covid selezionato
    if (!(await state()).sel || (await state()).pressed !== COVID) { await p.keyboard.press('Escape'); await tap(covBtn); }
    for (const X of [30, 50, 20, 40]) {
      const r = p.locator(`#vxTable tbody tr[data-x="${X}"]`); await r.scrollIntoViewIfNeeded(); await tap(r); await p.waitForTimeout(150);
      const k = await state(); const cr = await p.$$eval('#vxEps tr.sel', (rs) => rs.map((x) => x.children[0].textContent + ' ' + x.children[1].textContent));
      oss(`${name}: soglia ${X} con Covid selezionato → selezione ${k.pressed}, righe evidenziate ${cr.join('; ') || 'nessuna'}${k.none ? `, scritta «${k.none}»` : ''}`);
    }
    // 8) soglia 30: la prima riga (episodio più recente) — cosa succede nello scatter
    { const r = p.locator('#vxTable tbody tr[data-x="30"]'); await tap(r); await p.waitForTimeout(150);
      const first = p.locator('#vxEps tbody tr').first(); const txt = (await first.innerText()).replace(/\s+/g, ' ');
      await first.scrollIntoViewIfNeeded(); await tap(first); await p.waitForTimeout(150); const k = await state();
      oss(`${name}: soglia 30, clic sulla prima riga «${txt}» → data-g ${await first.getAttribute('data-g')}, scatter spento ${k.sel}, punti accesi ${k.on}, alone ${k.halo}, pulsante premuto ${k.pressed}, scritta ${k.none}`);
      await p.locator('#vxScWrap').scrollIntoViewIfNeeded(); await p.locator('#vxScWrap').screenshot({ path: path.join(OUT, `${name}-06-soglia30-riga-recente.png`) });
      await tap(first); await tap(p.locator('#vxTable tbody tr[data-x="40"]'));
    }
    // 9) righe non cliccabili alla soglia 20
    { await tap(p.locator('#vxTable tbody tr[data-x="20"]')); await p.waitForTimeout(150);
      const nr = await p.$$eval('#vxEps tbody tr', (rs) => [rs.length, rs.filter((r) => r.dataset.g).length]);
      oss(`${name}: soglia 20 → ${nr[0]} righe, cliccabili ${nr[1]}`);
      await tap(p.locator('#vxTable tbody tr[data-x="40"]')); await p.waitForTimeout(150); }

    // 10) indice, periodo, cambio vista e ritorno, ridimensionamento, ricarica
    if ((await state()).pressed !== COVID) await tap(covBtn);
    await tap(p.locator('#vxIx button[data-ix="NDX"]')); await p.waitForTimeout(300); s = await state();
    oss(`${name}: Nasdaq-100 → selezione ${s.pressed}, alone ${s.halo}, righe ${s.rows}`);
    await tap(p.locator('#vxRange button[data-range="MAX"]')); await p.waitForTimeout(300); s = await state();
    oss(`${name}: periodo MAX → selezione ${s.pressed}, alone ${s.halo}`);
    await tap(p.locator('#vxIx button[data-ix="SPX"]')); await p.waitForTimeout(300);
    await tap(p.locator('#tab-mon')); await p.waitForTimeout(400); await tap(p.locator('#tab-vix')); await p.waitForTimeout(500); s = await state();
    oss(`${name}: Monitor e ritorno a VIX → selezione ${s.pressed}, alone ${s.halo}, righe ${s.rows}`);
    await p.goBack(); await p.waitForTimeout(400); const h1 = await p.evaluate(() => location.hash);
    oss(`${name}: tasto Indietro dopo il ritorno → ${h1}`);
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(300);
    if (!touch) {
      if ((await state()).pressed !== COVID) await tap(covBtn);
      const w = opt.viewport.width; await p.setViewportSize({ width: w - 300, height: opt.viewport.height }); await p.waitForTimeout(800); s = await state();
      oss(`${name}: finestra da ${w} a ${w - 300} px → selezione ${s.pressed}, alone ${s.halo}`);
      await p.setViewportSize(opt.viewport); await p.waitForTimeout(800);
    }
    await p.reload(); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(300); s = await state();
    oss(`${name}: dopo la ricarica → selezione ${s.pressed || 'nessuna'}`);

    // 11) tempi: selezione e ridisegno
    const tm = await p.evaluate(async () => {
      const bs = [...document.querySelectorAll('#vxCrises button')]; const t = [];
      for (const x of bs) { const a = performance.now(); x.click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); t.push(performance.now() - a); }
      bs.at(-1).click();
      const a = performance.now(); document.querySelector('#vxIx button[data-ix="NDX"]').click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const ri = performance.now() - a;
      document.querySelector('#vxIx button[data-ix="SPX"]').click();
      return [Math.max(...t), t.reduce((s, x) => s + x, 0) / t.length, ri];
    });
    oss(`${name}: selezione di una crisi fino al disegno: media ${tm[1].toFixed(0)} ms, massimo ${tm[0].toFixed(0)} ms; cambio indice ${tm[2].toFixed(0)} ms`);

    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale (${sw.join('/')})`);
    ok(!errs.length, `${name}: console senza errori ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();
  console.log(`\n${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
