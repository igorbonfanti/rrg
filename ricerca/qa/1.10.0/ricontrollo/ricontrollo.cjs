// Ricontrollo indipendente 1.10.0 (commit 2c565ed): correzioni del grafico e della tabella del pannello «Distanza dal
// massimo degli ultimi 3 anni». Valori attesi letti da data/ath.json con un formattatore scritto qui, non quello dell'app.
// Uso: BASE=http://127.0.0.1:8851/ NODE_PATH=/opt/node-tools/node_modules node ricerca/qa/1.10.0/ricontrollo/ricontrollo.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8851/';
const ROOT = path.resolve(__dirname, '../../../..');
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const A = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ath.json'), 'utf-8'));
const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ath_history.json'), 'utf-8'));
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
// formato italiano scritto qui: 3 decimali sotto 10, altrimenti 2; punto delle migliaia
const it = (x, d) => { const [i, f] = Math.abs(x).toFixed(d).split('.'); return (x < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : ''); };
const pv = (x) => it(x, Math.abs(x) < 10 ? 3 : 2);
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

async function ctx(b, opt, theme = 'light', extra) {
  const c = await b.newContext(opt);
  await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
  if (extra) await extra(c);
  const p = await c.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.type() + ' ' + m.text()));
  return { c, p, errs };
}
const vis = (p, sel) => p.$eval(sel, (e) => !e.hidden && !!e.offsetParent && e.getBoundingClientRect().height > 0).catch(() => false);
const ctrls = async (p) => ({ wrap: await vis(p, '#athWrap'), range: await vis(p, '#athRange'), lens: await vis(p, '#athLens') });
const msg = (p) => p.$eval('#athChartMiss', (e) => (e.hidden ? '' : e.textContent));

(async () => {
  const b = await chromium.launch();
  const DESK = { viewport: { width: 1440, height: 900 } };

  // 1. storico lento: messaggio di caricamento, controlli nascosti, cambio di mercato durante il caricamento
  {
    let release; const gate = new Promise((r) => { release = r; });
    const { c, p, errs } = await ctx(b, DESK, 'dark', async (c) => c.route('**/data/ath_history.json*', async (r) => { await gate; await r.continue(); }));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tr.athr[data-id="SPX"]');
    await p.click('#athTable tr.athr[data-id="SPX"]'); await p.waitForTimeout(400);
    ok((await msg(p)) === 'Caricamento dello storico…', `lento: prima apertura «${await msg(p)}»`);
    let k = await ctrls(p); ok(!k.wrap && !k.range && !k.lens, `lento: grafico, periodi e lente nascosti ${JSON.stringify(k)}`);
    await p.click('#athTable tr.athr[data-id="WTI"]'); await p.waitForTimeout(400);
    ok((await msg(p)) === 'Caricamento dello storico…', `lento: altro mercato durante il caricamento «${await msg(p)}» (rilievo C3)`);
    await p.click('#athTable tr.athr[data-id="WTI"]'); await p.waitForTimeout(200); // chiude
    await p.click('#athTable tr.athr[data-id="GOLD"]'); await p.waitForTimeout(300);
    ok((await msg(p)) === 'Caricamento dello storico…', `lento: chiudi e riapri durante il caricamento «${await msg(p)}»`);
    await p.screenshot({ path: path.join(SHOTS, 'lento-caricamento.png') });
    release(); await p.waitForSelector('#athChart path.athpx', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(300);
    k = await ctrls(p);
    ok((await msg(p)) === '' && k.wrap && k.range && k.lens, `lento: dopo l'arrivo grafico e controlli visibili ${JSON.stringify(k)}`);
    ok((await p.$eval('#athChartTitle', (e) => e.textContent)).startsWith('Oro'), 'lento: grafico del mercato aperto per ultimo (oro)');
    ok(errs.length === 0, `lento: console ${errs.join(' | ')}`);
    await c.close();
  }

  // 2. storico assente (404): messaggio, controlli nascosti, nessun errore oltre al 404
  {
    const { c, p, errs } = await ctx(b, DESK, 'light', async (c) => c.route('**/data/ath_history.json*', (r) => r.fulfill({ status: 404, body: 'no' })));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tr.athr[data-id="BTC"]');
    await p.click('#athTable tr.athr[data-id="BTC"]'); await p.waitForTimeout(800);
    ok((await msg(p)).startsWith('Storico non disponibile (data/ath_history.json)'), `404: «${await msg(p)}»`);
    const k = await ctrls(p); ok(!k.wrap && !k.range && !k.lens, `404: grafico, periodi e lente nascosti ${JSON.stringify(k)}`);
    ok(await p.$eval('#athTable tr.athdet', (e) => e.textContent.includes('Bitcoin')).catch(() => false), '404: il dettaglio c\'è');
    await p.click('#athTable tr.athr[data-id="SPX"]'); await p.waitForTimeout(300);
    ok((await msg(p)).startsWith('Storico non disponibile'), '404: anche su un altro mercato');
    await p.screenshot({ path: path.join(SHOTS, 'storico-404.png') });
    ok(errs.every((e) => /404|ath_history/.test(e)), `404: console solo il file mancante (${errs.join(' | ')})`);
    await c.close();
  }

  // 3. serie rotte nello storico (senza cd, vuota): messaggio per quel mercato, nessun TypeError (rilievo M6)
  {
    const H2 = JSON.parse(JSON.stringify(H)); delete H2.series.SPX.cd; H2.series.BTC = {}; H2.series.NDX.cd = H2.series.NDX.cd.slice(0, 10);
    const { c, p, errs } = await ctx(b, DESK, 'light', async (c) => c.route('**/data/ath_history.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(H2) })));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tr.athr[data-id="SPX"]');
    for (const id of ['SPX', 'BTC', 'NDX']) {
      await p.click(`#athTable tr.athr[data-id="${id}"]`); await p.waitForTimeout(500);
      ok((await msg(p)) === 'Storico di questo mercato non disponibile.', `serie rotta ${id}: «${await msg(p)}»`);
      const k = await ctrls(p); ok(!k.wrap && !k.range, `serie rotta ${id}: controlli nascosti`);
    }
    await p.click('#athTable tr.athr[data-id="GOLD"]'); await p.waitForTimeout(500);
    ok(await p.$('#athChart path.athpx') && (await msg(p)) === '' && (await ctrls(p)).range, 'serie rotte: un mercato sano dopo si disegna con i controlli');
    ok(errs.length === 0, `serie rotte: console ${errs.join(' | ')}`);
    await c.close();
  }

  // 4. legenda (valori dal file) e «giorni fa» fino a oggi, 9 mercati, computer
  {
    const { c, p, errs } = await ctx(b, DESK, 'dark');
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tr.athr');
    const today = await p.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    for (const m of A.markets) {
      const s = m.stats, d = Math.max(s.days, days(s.refDate, today));
      const ago = d === 0 ? 'oggi' : d === 1 ? '1 giorno fa' : `${it(d, 0)} giorni fa`;
      const cm = await p.$eval(`#athTable tr.athr[data-id="${m.id}"] .c-max`, (e) => e.textContent.replace(/\s+/g, ' ').trim());
      ok(cm === `${dIT(s.refDate)} · ${ago}`, `giorni ${m.id}: «${cm}» atteso «${dIT(s.refDate)} · ${ago}» (oggi ${today}, ${d - s.days} in più dell'ultima chiusura)`);
      await p.click(`#athTable tr.athr[data-id="${m.id}"]`); await p.waitForSelector('#athChart path.athpx'); await p.waitForTimeout(150);
      const lg = await p.$eval('#athLegend', (e) => e.textContent.replace(/\s+/g, ' '));
      const want = [`ultimi 3 anni (dal ${dIT(s.from)})`, `massimo di chiusura dei 3 anni: ${pv(s.ref)} il ${dIT(s.refDate)}`, `ultima chiusura: ${pv(s.last)} il ${dIT(s.lastDate)}`];
      if (s.cycleLowDate) want.push(`minimo dopo il massimo: ${pv(s.cycleLow)} il ${dIT(s.cycleLowDate)}`);
      if (s.athDate !== s.refDate) want.push(`massimo di sempre: ${pv(s.ath)} il ${dIT(s.athDate)}`);
      const miss = want.filter((w) => !lg.includes(w));
      ok(!miss.length, `legenda ${m.id}: ${miss.length ? 'manca ' + miss.join(' | ') + ' in «' + lg + '»' : want.length + ' valori uguali al file'}`);
      // pallini in legenda con i colori del grafico
      const col = await p.evaluate(() => {
        const g = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor + '|' + getComputedStyle(e).fill : null; };
        const top = document.querySelector('#athChart circle.athtop'), last = [...document.querySelectorAll('#athChart circle')].map((x) => x.getAttribute('class'));
        return { kTop: g('#athLegend .athk-top'), kLast: g('#athLegend .athk-last'), top: top && getComputedStyle(top).fill, cls: last };
      });
      if (m.id === 'SPX') console.log('NOTA pallini', JSON.stringify(col));
      const tl = await p.$eval('#athChart', (s) => s.getAttribute('aria-label'));
      const H0 = H.series[m.id];
      ok(tl.includes(m.label) && tl.includes(dIT(H0.d0.length === 10 ? H0.d0 : H0.d0)), `aria-label ${m.id}: «${tl}»`);
    }
    // la data del computer fissata all'ultima chiusura: i giorni tornano quelli del file
    ok(errs.length === 0, `legenda: console ${errs.join(' | ')}`);
    await c.close();
  }
  {
    const { c, p } = await ctx(b, DESK, 'light', async (c) => c.addInitScript(() => { const T = Date.parse('2026-11-11T12:00:00'); const D = Date; class F extends D { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } } globalThis.Date = F; }));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tr.athr');
    const bad = [];
    for (const m of A.markets) { const cm = await p.$eval(`#athTable tr.athr[data-id="${m.id}"] .c-max`, (e) => e.textContent.replace(/\s+/g, ' ').trim()); if (!cm.endsWith(`${it(m.stats.days, 0)} giorni fa`)) bad.push(`${m.id} ${cm}`); }
    ok(!bad.length, `giorni con la data del computer = ultima chiusura (11/11): uguali a «days» del file ${bad.join(' | ')}`);
    await c.close();
  }

  // 5. data in grigio solo oltre 3 giorni (ath.json modificato al volo)
  {
    const A2 = JSON.parse(JSON.stringify(A)), set = (id, d) => { A2.markets.find((m) => m.id === id).stats.lastDate = d; };
    set('BTC', '2026-11-15'); // domenica, il più recente
    set('GOLD', '2026-11-13'); set('SPX', '2026-11-13'); set('NDX', '2026-11-13'); set('SOXX', '2026-11-13'); set('COPPER', '2026-11-13');
    set('SILVER', '2026-11-12'); // 3 giorni: non grigio
    set('WTI', '2026-11-11'); // 4 giorni: grigio
    set('KOSPI', '2026-11-13');
    const { c, p } = await ctx(b, DESK, 'light', async (c) => c.route('**/data/ath.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(A2) })));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tr.athr');
    const g = await p.$$eval('#athTable tr.athr', (t) => t.filter((r) => r.querySelector('.c-last.muted')).map((r) => r.dataset.id));
    ok(JSON.stringify(g) === '["WTI"]', `grigio con bitcoin alla domenica e gli altri al venerdì: solo WTI (4 giorni) ${JSON.stringify(g)}`);
    await c.close();
  }

  // 6. zoom stretto: almeno due valori sull'asse dei prezzi (computer e telefono con la lente)
  for (const [name, opt] of [['1440', DESK], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['360', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }]]) {
    const { c, p, errs } = await ctx(b, opt, name === '390' ? 'dark' : 'light');
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tr.athr');
    for (const [id, f0, f1] of [['SPX', 0.93, 0.999], ['NDX', 0.95, 0.999], ['COPPER', 0.9, 0.999], ['GOLD', 0.97, 0.999], ['BTC', 0.985, 0.999]]) {
      const row = p.locator(`#athTable tr.athr[data-id="${id}"]`);
      const isOpen = await row.getAttribute('aria-expanded'); if (isOpen !== 'true') { if (opt.hasTouch) await row.tap(); else await row.click(); }
      await p.waitForSelector('#athChart path.athpx'); await p.locator('#athRange button[data-range="10A"]').click(); await p.waitForTimeout(200);
      await p.locator('#athChart').scrollIntoViewIfNeeded();
      if (opt.hasTouch) await p.locator('#athLens').tap();
      const bx = await p.locator('#athChart').boundingBox(), W = await p.$eval('#athChart', (s) => s.viewBox.baseVal.width), sc = bx.width / W, L = 8, PW = W - 60;
      const g0 = opt.hasTouch ? Math.min(f0, 0.88) : f0; // sul telefono un tratto di pochi pixel non fa zoom (voluto)
      const x0 = bx.x + (L + g0 * PW) * sc, x1 = bx.x + (L + f1 * PW) * sc, y = bx.y + 80;
      if (opt.hasTouch) {
        const cdp = await c.newCDPSession(p);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
        for (let s = 1; s <= 8; s++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * s) / 8, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else { await p.mouse.move(x0, y); await p.mouse.down(); await p.mouse.move(x1, y, { steps: 8 }); await p.mouse.up(); }
      await p.waitForTimeout(300);
      const z = await p.$eval('#athZoom', (e) => (e.hidden ? '' : e.textContent));
      const t = await p.$$eval('#athChart text.axt', (ts) => { const s = ts[0] && ts[0].ownerSVGElement, W = s.viewBox.baseVal.width; return ts.filter((x) => +x.getAttribute('x') > W - 60 && /^[\d.,]+k?$/.test(x.textContent)).map((x) => ({ t: x.textContent, y: +x.getAttribute('y') })); });
      // valori in ordine (più alti in alto) e posizione coerente con la scala logaritmica
      const num = (s) => { const k = s.endsWith('k'); const v = parseFloat(s.replace('k', '').replace(/\./g, '').replace(',', '.')); return k ? v * 1000 : v; };
      const v = t.map((x) => ({ v: num(x.t), y: x.y })).sort((a, b) => a.y - b.y);
      let lin = true; if (v.length >= 3) { const r = (Math.log(v[0].v) - Math.log(v[1].v)) / (v[1].y - v[0].y); for (let i = 1; i < v.length - 1; i++) { const r2 = (Math.log(v[i].v) - Math.log(v[i + 1].v)) / (v[i + 1].y - v[i].y); if (Math.abs(r2 - r) / r > 0.02) lin = false; } }
      const desc = v.every((x, i) => i === 0 || x.v < v[i - 1].v);
      ok(!!z && t.length >= 2 && desc && lin, `${name} zoom stretto ${id} (${z}): ${t.length} valori sull'asse ${t.map((x) => x.t).join(' ')}${desc ? '' : ' NON in ordine'}${lin ? '' : ' NON logaritmici'}`);
      if (id === 'SPX' || id === 'COPPER') await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `zoom-${name}-${id}.png`) });
      await p.locator('#athRange button[data-range="10A"]').click();
    }
    ok(errs.length === 0, `${name} zoom: console ${errs.join(' | ')}`);
    await c.close();
  }

  // 7. telefono: tabella senza scorrimento orizzontale, chiusa e con una riga aperta, tema chiaro e scuro
  for (const [w, h] of [[390, 844], [360, 780]]) for (const theme of ['light', 'dark']) {
    const { c, p, errs } = await ctx(b, { viewport: { width: w, height: h }, isMobile: true, hasTouch: true }, theme);
    await p.goto(BASE + '#vix'); await p.waitForSelector('#athTable tr.athr');
    const sc = () => p.evaluate(() => { const t = document.querySelector('#athTable').closest('.tscroll') || document.querySelector('#athTable').parentElement; const tb = document.querySelector('#athTable').getBoundingClientRect(), pr = t.getBoundingClientRect(); const out = [...document.querySelectorAll('#athTable td, #athTable th')].filter((e) => e.offsetParent && (e.getBoundingClientRect().right > pr.right + 0.5 || e.getBoundingClientRect().left < pr.left - 0.5)).length; return { sw: t.scrollWidth, cw: t.clientWidth, doc: document.documentElement.scrollWidth, out, tb: [tb.left, tb.right], pr: [pr.left, pr.right] }; });
    let r = await sc(); ok(r.sw <= r.cw && r.out === 0 && r.doc <= w, `${w} ${theme}: tabella chiusa ${JSON.stringify(r)}`);
    await p.locator('#athTable tr.athr[data-id="WTI"]').tap(); await p.waitForSelector('#athChart path.athpx'); await p.waitForTimeout(200);
    r = await sc(); ok(r.sw <= r.cw && r.out === 0 && r.doc <= w, `${w} ${theme}: con il petrolio aperto ${JSON.stringify(r)}`);
    // trascinare la tabella in orizzontale non la sposta
    await p.evaluate(() => { const t = document.querySelector('#athTable').closest('.tscroll') || document.querySelector('#athTable').parentElement; t.scrollLeft = 50; });
    const sl = await p.evaluate(() => (document.querySelector('#athTable').closest('.tscroll') || document.querySelector('#athTable').parentElement).scrollLeft);
    ok(sl === 0, `${w} ${theme}: scrollLeft dopo il tentativo ${sl}`);
    // il nome del mercato resta del colore del testo (td.nm cambiata nel CSS)
    const nm = await p.$eval('#athTable tr.athr td.nm b', (e) => [getComputedStyle(e).color, getComputedStyle(document.body).color]);
    console.log(`NOTA ${w} ${theme}: colore del nome ${nm[0]}, testo ${nm[1]}`);
    await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `tel-${w}-${theme}.png`) });
    ok(errs.length === 0, `${w} ${theme}: console ${errs.join(' | ')}`);
    await c.close();
  }

  // 8. regressione: altre tabelle .t su telefono (la regola td.nm è globale per .t.ath)
  {
    const { c, p, errs } = await ctx(b, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'light');
    const bad = [];
    for (const v of ['#mon', '#rrg', '#btm', '#XLK', '#tit-XLK', '#idx', '#emg', '#vix', '#alr']) {
      await p.goto(BASE + v); await p.waitForTimeout(1500);
      const o = await p.evaluate(() => [document.documentElement.scrollWidth, [...document.querySelectorAll('.tscroll')].filter((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 1 && !x.querySelector('#athTable')).length]);
      if (o[0] > 390) bad.push(`${v || 'monitor'} pagina ${o[0]}`);
      console.log(`NOTA 390 ${v || 'monitor'}: larghezza ${o[0]}, tabelle che scorrono (attese per le tabelle larghe) ${o[1]}`);
    }
    ok(!bad.length, `390: nessuno scorrimento orizzontale della pagina nelle viste ${bad.join(' | ')}`);
    ok(errs.length === 0, `viste: console ${errs.join(' | ')}`);
    await c.close();
  }

  await b.close();
  console.log(`${fail} FAIL`);
  process.exitCode = fail ? 1 : 0;
})();
