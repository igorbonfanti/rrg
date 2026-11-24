// Controllo usabilità e testi 1.7.0, vista 8 VIX: tabella degli episodi con mini-grafico, pannello dell'indice.
// Uso: BASE=http://127.0.0.1:8808/ NODE_PATH=$(npm root -g) node a-esplora.cjs
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8808/';
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const res = [];
const log = (k, v) => { res.push({ k, v }); console.log(k, typeof v === 'string' ? v : JSON.stringify(v)); };
const confs = [
  ['1440-chiaro', { viewport: { width: 1440, height: 900 } }, 'light'],
  ['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'],
  ['1280-chiaro', { viewport: { width: 1280, height: 800 } }, 'light'],
  ['1280-scuro', { viewport: { width: 1280, height: 800 } }, 'dark'],
  ['390-chiaro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light'],
  ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'dark'],
  ['360-chiaro', { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light'],
  ['360-scuro', { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'dark'],
];
(async () => {
  const b = await chromium.launch();
  for (const [name, opt, theme] of confs) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const tap = async (l) => (opt.hasTouch ? l.tap() : l.click());
    const t0 = Date.now();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxEps tbody tr', { timeout: 30000 });
    await p.waitForSelector('#vxChart path.vxix', { timeout: 30000 });
    log(`${name} apertura vista (ms, con caricamento dati)`, Date.now() - t0);
    await p.waitForTimeout(500);
    // tempi di disegno: soglia, indice, periodo
    const timeIt = async (sel) => p.evaluate(async (s) => { const t = performance.now(); document.querySelector(s).click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t); }, sel);
    log(`${name} clic soglia 20 (ms)`, await timeIt('#vxTable tr[data-x="20"]'));
    log(`${name} clic Nasdaq-100 (ms)`, await timeIt('#vxIx button[data-ix="NDX"]'));
    log(`${name} clic MAX (ms)`, await timeIt('#vxRange button[data-range="MAX"]'));
    log(`${name} clic S&P 500 (ms)`, await timeIt('#vxIx button[data-ix="SPX"]'));
    log(`${name} clic 10A (ms)`, await timeIt('#vxRange button[data-range="10A"]'));
    await tap(p.locator('#vxTable tr[data-x="40"]')); await p.waitForTimeout(300);
    // colonne visibili senza scorrere, intestazioni e title
    const cols = await p.evaluate(() => {
      const sc = document.querySelector('#vxEps').closest('.tscroll'), r = sc.getBoundingClientRect();
      return { scroll: [sc.scrollWidth, sc.clientWidth], th: [...document.querySelectorAll('#vxEps thead th')].map((th) => { const q = th.getBoundingClientRect(); return { t: th.textContent, vis: getComputedStyle(th).display !== 'none', dentro: q.right <= r.right + 1 && q.width > 0, title: th.title || '' }; }) };
    });
    log(`${name} tabella episodi scrollWidth/clientWidth`, cols.scroll);
    log(`${name} colonne visibili senza scorrere`, cols.th.filter((x) => x.vis && x.dentro).map((x) => x.t));
    log(`${name} colonne nascoste`, cols.th.filter((x) => !x.vis).map((x) => x.t));
    if (name === '1440-chiaro') log('title intestazioni', cols.th.map((x) => `${x.t} => ${x.title || '(nessun title)'}`));
    const pageSw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    log(`${name} scorrimento orizzontale pagina`, pageSw);
    // spiegazione visibile del mini-grafico (testo nella pagina, non title)
    const txt = await p.locator('#v-vix').innerText();
    log(`${name} testo visibile spiega il mini-grafico (tratteggiata/punto pieno/cerchio/tacca)`, ['tratteggiat', 'punto pieno', 'cerchio', 'tacca'].map((w) => `${w}:${txt.includes(w)}`).join(' '));
    log(`${name} testo visibile spiega «Sedute»/«Ultimo giorno»/asterisco`, ['Sedute', 'Ultimo giorno', 'asterisco'].map((w) => `${w}:${txt.includes(w)}`).join(' '));
    // screenshot: tabella episodi a 40 e a 20, chiaro/scuro
    const pan = p.locator('#vxEps').locator('xpath=ancestor::div[contains(@class,"panel")][1]');
    await p.locator('#vxEpsTitle').scrollIntoViewIfNeeded();
    await p.locator('#vxEps').screenshot({ path: path.join(OUT, `${name}-episodi-40.png`) });
    await tap(p.locator('#vxTable tr[data-x="20"]')); await p.waitForTimeout(300);
    await p.locator('#vxEps').screenshot({ path: path.join(OUT, `${name}-episodi-20.png`) });
    if (opt.hasTouch) {
      // tocco sull'intestazione del mini-grafico e sul mini-grafico: compare una spiegazione?
      await p.locator('#vxEps thead th.vxspc').tap(); await p.waitForTimeout(400);
      const vis = await p.evaluate(() => [...document.querySelectorAll('.tip, [role=tooltip]')].filter((t) => !t.hidden && t.offsetParent).map((t) => t.id || t.className));
      log(`${name} tocco su «Andamento del VIX»: tooltip visibili`, vis);
      // la colonna Sedute citata nel title è visibile?
      log(`${name} colonna «Sedute» visibile (citata nel title del mini-grafico)`, await p.evaluate(() => { const th = [...document.querySelectorAll('#vxEps thead th')].find((x) => x.textContent === 'Sedute'); return th ? getComputedStyle(th).display !== 'none' : null; }));
      // proporzioni dei cerchi nel mini-grafico (preserveAspectRatio none)
      log(`${name} mini-grafico: px per unità x/y`, await p.evaluate(() => { const s = document.querySelector('svg.vxsp'), r = s.getBoundingClientRect(); return [+(r.width / 150).toFixed(2), +(r.height / 38).toFixed(2)]; }));
    }
    // pannello dell'indice
    await tap(p.locator('#vxIx button[data-ix="NDX"]')); await p.waitForTimeout(400);
    await tap(p.locator('#vxTable tr[data-x="40"]')); await p.waitForTimeout(300);
    await tap(p.locator('#vxRange button[data-range="MAX"]')); await p.waitForTimeout(400);
    const titles = await p.$$eval('#vxChart text.pane-t', (x) => x.map((y) => y.textContent));
    log(`${name} titoli dei pannelli (NDX, 40, MAX)`, titles);
    log(`${name} titolo del riquadro`, await p.locator('#vxChart').locator('xpath=ancestor::div[contains(@class,"panel")][1]//h2').textContent());
    log(`${name} legenda`, await p.locator('#vxLegend').innerText());
    // le etichette dei pannelli sono tagliate? confronto lunghezza testo con larghezza svg
    log(`${name} titoli dei pannelli più larghi del grafico`, await p.evaluate(() => { const s = document.querySelector('#vxChart'), r = s.getBoundingClientRect(); return [...s.querySelectorAll('text.pane-t')].filter((t) => t.getBoundingClientRect().right > r.right + 1).map((t) => t.textContent); }));
    await p.locator('#vxChart').scrollIntoViewIfNeeded();
    await p.locator('#vxChart').locator('xpath=ancestor::div[contains(@class,"panel")][1]').screenshot({ path: path.join(OUT, `${name}-grafico-NDX-40-MAX.png`) });
    // riquadro dei valori su una data dentro un episodio (16/03/2020) e nell'episodio a 20 in corso
    const hover = async (iso) => {
      const pt = await p.evaluate((d) => { const s = document.querySelector('#vxChart'), vb = s.viewBox.baseVal, r = s.getBoundingClientRect(); const rects = [...s.querySelectorAll('rect.frame')]; const f = rects[1].getBBox(); return { r: { x: r.x, y: r.y, w: r.width, h: r.height }, vb: { w: vb.width, h: vb.height }, f: { x: f.x, y: f.y, w: f.width, h: f.height } }; }, iso);
      return pt;
    };
    const geo = await hover();
    // trova la x di una data: usa la proporzione lineare sul periodo dal primo all'ultimo giorno
    const span = await p.evaluate(() => { const s = document.querySelector('#vxChart'); return [...s.querySelectorAll('text.axt')].length; });
    const tipAt = async (frac) => {
      const x = geo.r.x + (geo.f.x + frac * geo.f.w) * (geo.r.w / geo.vb.w), y = geo.r.y + (geo.f.y + geo.f.h / 2) * (geo.r.h / geo.vb.h);
      if (opt.hasTouch) await p.touchscreen.tap(x, y); else await p.mouse.move(x, y);
      await p.waitForTimeout(250);
      return p.evaluate(() => { const t = document.querySelector('#vxTip'); return t.hidden ? null : t.innerText.replace(/\n+/g, ' | '); });
    };
    log(`${name} riquadro a destra (fine grafico, NDX 40)`, await tipAt(0.999));
    await tap(p.locator('#vxTable tr[data-x="20"]')); await p.waitForTimeout(300);
    log(`${name} riquadro a destra (fine grafico, NDX 20, episodio in corso)`, await tipAt(0.9995));
    await tap(p.locator('#vxRange button[data-range="3A"]')); await p.waitForTimeout(300);
    log(`${name} riquadro a destra (3A, NDX 20)`, await tipAt(0.9995));
    await p.locator('#vxChart').locator('xpath=ancestor::div[contains(@class,"panel")][1]').screenshot({ path: path.join(OUT, `${name}-grafico-NDX-20-3A.png`) });
    await tap(p.locator('#vxRange button[data-range="MAX"]')); await p.waitForTimeout(300);
    await p.locator('#vxChart').locator('xpath=ancestor::div[contains(@class,"panel")][1]').screenshot({ path: path.join(OUT, `${name}-grafico-NDX-20-MAX.png`) });
    // coerenza: titolo tabella episodi, scatter meta, pannello indice dopo il cambio
    log(`${name} dopo NDX/20: titolo episodi / meta tabella / meta scatter`, [await p.locator('#vxEpsTitle').textContent(), await p.locator('#vxTableMeta').textContent(), await p.locator('#vxScMeta').textContent()]);
    // ricaricando: scelte ricordate?
    await p.reload(); await p.waitForSelector('#vxChart path.vxix', { timeout: 30000 }); await p.waitForTimeout(400);
    log(`${name} dopo ricarica: indice/soglia/periodo`, [await p.locator('#vxIx button[aria-pressed=true]').textContent(), await p.locator('#vxEpsTitle').textContent(), await p.locator('#vxRange button[aria-pressed=true]').textContent(), (await p.$$eval('#vxChart text.pane-t', (x) => x.map((y) => y.textContent)))[1]]);
    const sw2 = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    log(`${name} scorrimento orizzontale pagina (fine)`, sw2);
    log(`${name} errori console`, errs);
    await c.close();
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, 'esito-a-esplora.json'), JSON.stringify(res, null, 1));
})();
