// 1.8.0: zoom su un tratto in tutti i grafici con il tempo (Performance relativa, Settore e Indici con i Cali forti,
// Emergenti, VIX). Deve fallire sulla 1.7.0 (niente lente né etichetta dello zoom fuori dal VIX).
// Uso: BASE=http://127.0.0.1:8791/ SITE=<cartella del sito> NODE_PATH=$(npm root -g) node ricerca/qa/browser/v180.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const SITE = process.env.SITE || path.resolve(__dirname, '../../..');
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const iso = (s) => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`;
const days = (a, b) => Math.abs(Date.parse(iso(a)) - Date.parse(iso(b))) / 864e5;

// grafici: vista, svg, riquadro, etichetta, lente, pulsanti del periodo, scheda da aprire, per data (true) o per seduta
const CH = [
  { v: 'rrg', svg: 'perf', tip: 'perfTip', chip: 'perfZoom', lens: 'perfLens', seg: 'perfSeg' },
  { v: 'sec', svg: 'ts', tip: 'tsTip', chip: 'secZoom', lens: 'secLens', seg: 'rangeSeg' },
  { v: 'sec', svg: 'secCapSvg', tip: 'secCapTip', chip: 'secCapZoom', lens: 'secLens', seg: 'rangeSeg', open: 'secCap' },
  { v: 'idx', svg: 'ixTs', tip: 'ixTsTip', chip: 'ixTsZoom', lens: 'ixLens', seg: 'ixRange' },
  { v: 'idx', svg: 'ixCapSvg', tip: 'ixCapTip', chip: 'ixCapZoom', lens: 'ixLens', seg: 'ixRange', open: 'ixCap' },
  { v: 'emg', svg: 'emChart', tip: 'emTip', chip: 'emZoom', lens: 'emLens', seg: 'emRange', time: true },
  { v: 'vix', svg: 'vxChart', tip: 'vxTip', chip: 'vxZoom', lens: 'vxLens', seg: 'vxRange', time: true },
];

(async () => {
  const SEC = await (await fetch(BASE + 'data/sectors.json')).json();
  const PR = await (await fetch(BASE + 'data/prices.json')).json();
  const b = await chromium.launch();
  for (const [name, opt, theme] of [['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light'], ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dark']]) {
    const c = await b.newContext(opt);
    await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const cdp = opt.hasTouch ? await c.newCDPSession(p) : null;
    const open = async (ch) => {
      await p.goto(BASE + '#' + ch.v); await p.reload(); await p.waitForSelector(`#${ch.svg} rect.frame`, { timeout: 30000, state: 'attached' }); await p.waitForTimeout(700);
      if (ch.open) { await p.evaluate((id) => { document.getElementById(id).open = true; }, ch.open); await p.waitForSelector(`#${ch.svg} rect.frame`, { timeout: 30000 }); await p.waitForTimeout(500); }
      await p.locator('#' + ch.svg).scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    };
    // riquadro del primo pannello in coordinate della pagina
    const frame = (ch) => p.$eval(`#${ch.svg} rect.frame`, (r) => { const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
    const chip = (ch) => p.$eval('#' + ch.chip, (e) => (e.hidden ? null : e.querySelector('span').textContent)).catch(() => 'etichetta mancante');
    const tipDate = async (ch, x, y) => { await p.mouse.move(x, y); await p.waitForTimeout(80); return p.$eval('#' + ch.tip, (t) => (t.hidden ? null : (t.querySelector('b') || {}).textContent)); };
    const drag = async (x0, x1, y) => { await p.mouse.move(x0, y); await p.mouse.down(); await p.mouse.move((x0 + x1) / 2, y, { steps: 6 }); await p.mouse.move(x1, y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400); };
    const touch = async (pts) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
      for (const [x, y] of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
    };
    const line = (x0, y0, x1, y1, k = 12) => Array.from({ length: k + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / k, y0 + ((y1 - y0) * i) / k]);

    if (!opt.hasTouch) {
      for (const ch of CH) {
        await open(ch);
        const tag = `${name} ${ch.svg}`;
        ok(await p.$eval('#' + ch.lens, (l) => !!l.getAttribute('aria-label') && l.getAttribute('aria-pressed') === 'false').catch(() => false), `${tag}: lente con aria-label e aria-pressed`);
        const keys0 = await p.evaluate(() => Object.keys(localStorage).sort().join());
        let f = await frame(ch);
        const y = f.y + f.h * 0.5, xa = f.x + f.w * 0.3, xb = f.x + f.w * 0.6;
        const da = await tipDate(ch, xa, y), db = await tipDate(ch, xb, y);
        await drag(xa, xb, y);
        const t = await chip(ch);
        const m = t && t.match(/dal (\d\d\/\d\d\/\d{4}) al (\d\d\/\d\d\/\d{4})/);
        const tol = ch.time ? 5 : 0;
        ok(m && days(m[1], da) <= tol && days(m[2], db) <= tol, `${tag}: trascinamento → «${t}» (riquadro prima: ${da} – ${db})`);
        if (!m) continue;
        const X = m[1], Y = m[2];
        // dopo lo zoom i bordi del grafico sono le due date
        f = await frame(ch);
        const l = await tipDate(ch, f.x + 1, y), r = await tipDate(ch, f.x + f.w - 1, y);
        ok(days(l, X) <= tol && days(r, Y) <= tol, `${tag}: bordi del grafico ${l} – ${r}`);
        // nessuna chiave nuova nel browser
        ok(await p.evaluate(() => Object.keys(localStorage).sort().join()) === keys0, `${tag}: lo zoom non si salva nel browser`);
        // un clic senza trascinare apre il riquadro e non cambia lo zoom
        await p.mouse.click(f.x + f.w * 0.5, y); await p.waitForTimeout(150);
        ok((await chip(ch)) === t && !(await p.$eval('#' + ch.tip, (x) => x.hidden)), `${tag}: clic senza trascinare = riquadro, zoom invariato`);
        // tasto premuto nel grafico, uscita in verticale e rilascio fuori: nessuna selezione rimasta attaccata al mouse
        if (ch.svg === 'ts') {
          await p.mouse.move(f.x + f.w * 0.5, f.y + 20); await p.mouse.down(); await p.mouse.move(f.x + f.w * 0.5 + 2, f.y - 300, { steps: 5 }); await p.mouse.up();
          await p.mouse.move(f.x + f.w * 0.3, y, { steps: 5 }); await p.mouse.move(f.x + f.w * 0.4, y, { steps: 5 }); await p.waitForTimeout(150);
          ok((await p.locator('#ts rect.zoomband').count()) === 0 && !(await p.$eval('#tsTip', (x) => x.hidden)), `${tag}: rilascio fuori dal grafico: niente banda appiccicata, riquadro di nuovo visibile`);
        }
        // trascinamento sotto le 10 sedute: niente
        const fw = f.w;
        if (!ch.time) {
          const n = await p.$eval(`#${ch.svg} ${ch.svg === "perf" ? "path.ln.bench" : "path.px"}`, (q) => (q.getAttribute('d').match(/[ML]/g) || []).length).catch(() => 0);
          await drag(f.x + fw * 0.5, f.x + fw * 0.5 + (fw / Math.max(1, n - 1)) * 7, y);
          ok((await chip(ch)) === t, `${tag}: tratto di 8 sedute ignorato`);
        }
        // zoom dentro lo zoom fino a poche settimane: almeno due etichette sull'asse del tempo
        for (let k = 0; k < 3; k++) { f = await frame(ch); await drag(f.x + f.w * 0.3, f.x + f.w * 0.6, y); }
        const t2 = await chip(ch);
        const nt = await p.$$eval(`#${ch.svg} text.axt[text-anchor="middle"]`, (x) => x.filter((e) => e.textContent.trim()).length);
        ok(t2 && t2 !== t && nt >= 2, `${tag}: zoom nello zoom «${t2}», ${nt} etichette del tempo`);
        // modi di tornare al periodo
        const back = async (how) => {
          f = await frame(ch);
          if (!(await chip(ch))) await drag(f.x + f.w * 0.3, f.x + f.w * 0.6, y);
          const was = await p.$eval(`#${ch.seg} [aria-pressed="true"]`, (x) => x.textContent);
          if (how === 'doppio clic') await p.mouse.dblclick(f.x + f.w * 0.5, y);
          if (how === 'Esc') await p.keyboard.press('Escape');
          if (how === '×') await p.click(`#${ch.chip} button`);
          if (how === 'periodo') await p.click(`#${ch.seg} [aria-pressed="true"]`);
          await p.waitForTimeout(300);
          const now = await p.$eval(`#${ch.seg} [aria-pressed="true"]`, (x) => x.textContent);
          const foc = how === '×' ? await p.evaluate((s) => document.activeElement && document.activeElement.closest('#' + s) && document.activeElement.getAttribute('aria-pressed') === 'true', ch.seg) : true;
          ok((await chip(ch)) === null && now === was && foc, `${tag}: ${how} toglie lo zoom${how === '×' ? ' e porta il focus sul periodo' : ''}`);
        };
        for (const how of ['doppio clic', 'Esc', '×', 'periodo']) await back(how);
        // controlli propri di ogni grafico, con lo zoom attivo
        f = await frame(ch); await drag(f.x + f.w * 0.3, f.x + f.w * 0.6, y);
        const tz = await chip(ch), mz = tz && tz.match(/dal (\S+) al (\S+)/);
        if (ch.svg === 'ts') {
          // sedute disegnate contate dal file dei dati, valori a destra della fine del tratto, «peggiore nel tratto»
          const sym = (await p.$eval('#secTitle', (h) => h.textContent)).split(' ')[0];
          const want = SEC.dates.filter((d, i) => d >= iso(mz[1]) && d <= iso(mz[2]) && SEC.adjclose[sym][i] != null).length;
          const got = await p.$eval('#ts path.px', (q) => (q.getAttribute('d').match(/[ML]/g) || []).length);
          ok(got === want, `${tag}: ${got} sedute disegnate (dal file: ${want})`);
          ok(await p.locator('#ts rect.lasttag.zend').count() === 3 && (await p.$eval('#ts text.zendt', (x) => x.textContent)).includes(mz[2]), `${tag}: valori a destra alla fine del tratto, con la data`);
          ok(await p.locator('#ts text', { hasText: 'peggiore nel tratto' }).count() === 1, `${tag}: «peggiore nel tratto»`);
          // scala sui valori visibili: la linea del prezzo tocca quasi il bordo alto e il basso del pannello
          const sp = await p.$eval('#ts', (s) => { const fr = s.querySelector('rect.frame'), y0 = +fr.getAttribute('y'), h = +fr.getAttribute('height'); const ys = [...s.querySelector('path.px').getAttribute('d').matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => +m[1]); const ma = [...s.querySelector('path.ma').getAttribute('d').matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => +m[1]); const all = ys.concat(ma); return [(Math.min(...all) - y0) / h, (y0 + h - Math.max(...all)) / h]; });
          ok(sp[0] < 0.09 && sp[1] < 0.09, `${tag}: scala ricalcolata sui valori visibili (margini ${sp.map((v) => v.toFixed(2)).join(', ')})`);
          // resta dopo livello blu, cambio di settore e ridimensionamento; vale anche per i Cali forti
          await p.click('#blueMinus'); await p.waitForTimeout(300);
          ok((await chip(ch)) === tz, `${tag}: resta dopo il livello blu −`);
          await p.click('#blueReset').catch(() => {}); await p.waitForTimeout(200);
          await p.click('#secChips button[data-sym="XLE"]'); await p.waitForTimeout(500);
          ok((await chip(ch)) === tz, `${tag}: resta cambiando settore (XLE)`);
          await p.setViewportSize({ width: opt.viewport.width - 60, height: 900 }); await p.waitForTimeout(600);
          ok((await chip(ch)) === tz, `${tag}: resta dopo il ridimensionamento`);
          await p.setViewportSize(opt.viewport); await p.waitForTimeout(400);
          await p.evaluate(() => { document.getElementById('secCap').open = true; }); await p.waitForTimeout(800);
          ok((await chip({ chip: 'secCapZoom' })) === tz, `${tag}: lo stesso zoom nei Cali forti`);
          await p.locator('#secCapSvg').scrollIntoViewIfNeeded();
          const cf = await frame({ svg: 'secCapSvg' });
          const cl = await tipDate({ tip: 'secCapTip' }, cf.x + 1, cf.y + cf.h / 2);
          ok(cl === mz[1], `${tag}: i Cali forti partono dal ${cl} (zoom dal ${mz[1]})`);
          ok((await p.$eval('#secCapSvg text.capalert-t', (x) => x.textContent).catch(() => '')).includes(`al ${mz[2]}`), `${tag}: «soglia … al ${mz[2]}» nei Cali forti`);
        }
        if (ch.svg === 'perf') {
          // base 100 al primo giorno del tratto: SPY alla fine = chiusura finale / chiusura iniziale × 100, dal file dei prezzi
          const lg = await p.$eval('#perfLegend', (x) => x.textContent);
          ok(lg.includes(`base 100 al ${mz[1]}`) && lg.includes(`al ${mz[2]}`), `${tag}: legenda «${lg.match(/zoom[^·]*/)}»`);
          const i0 = PR.dates.indexOf(iso(mz[1])), i1 = PR.dates.indexOf(iso(mz[2])), spy = PR.tickers.SPY.close;
          f = await frame(ch); await p.mouse.move(f.x + f.w - 1, y); await p.waitForTimeout(100);
          const v = await p.$$eval('#perfTip .row', (rs) => { const r = rs.find((x) => /SPY/.test(x.textContent)); return r ? r.querySelector('b').textContent : null; });
          const want = ((spy[i1] / spy[i0]) * 100).toFixed(1).replace('.', ',');
          ok(v === want, `${tag}: SPY ${v} alla fine del tratto (dal file: ${want})`);
          // resta passando sopra la RRG (che ridisegna la performance)
          const rb = await p.locator('#rrg').boundingBox();
          for (let k = 0; k < 5; k++) await p.mouse.move(rb.x + rb.width * (0.3 + k * 0.1), rb.y + rb.height * 0.5);
          await p.waitForTimeout(200);
          ok((await chip(ch)) === tz, `${tag}: resta passando sopra la RRG`);
        }
        if (ch.svg === 'emChart') {
          const meta = await p.$eval('#emChartMeta', (x) => x.textContent);
          ok(meta.includes(`base 100 al ${mz[1]}, inizio dello zoom`), `${tag}: nota «base 100 al ${mz[1]}, inizio dello zoom»`);
          await p.click('#emTable tbody tr:nth-child(2)'); await p.waitForTimeout(500);
          ok(!!(await chip(ch)), `${tag}: resta cambiando paese (${await chip(ch)})`);
        }
        if (ch.svg === 'vxChart') {
          await p.click('#vxIx button[data-ix="NDX"]'); await p.waitForTimeout(400);
          ok((await chip(ch)) === tz, `${tag}: resta cambiando indice`);
          // Esc: prima lo zoom, poi la crisi evidenziata
          await p.click('#vxCrises button >> nth=0'); await p.waitForTimeout(200);
          await p.keyboard.press('Escape'); await p.waitForTimeout(300);
          const sel1 = await p.$eval('#vxScatter', (s) => s.classList.contains('vxsel'));
          ok((await chip(ch)) === null && sel1, `${tag}: il primo Esc toglie lo zoom e lascia la crisi`);
          await p.keyboard.press('Escape'); await p.waitForTimeout(200);
          ok(!(await p.$eval('#vxScatter', (s) => s.classList.contains('vxsel'))), `${tag}: il secondo Esc toglie la crisi`);
        }
        // ricaricando la pagina lo zoom non c'è
        if (ch.svg === 'ts' || ch.svg === 'vxChart') { await p.reload(); await p.waitForSelector(`#${ch.svg} rect.frame`, { timeout: 30000 }); await p.waitForTimeout(500); ok((await chip(ch)) === null, `${tag}: dopo il ricaricamento niente zoom`); }
      }
    } else {
      // telefono: senza lente il grafico si comporta come prima; con la lente il trascinamento fa lo zoom
      for (const ch of CH.filter((x) => ['perf', 'ts', 'emChart', 'vxChart'].includes(x.svg))) {
        await open(ch);
        const tag = `${name} ${ch.svg}`;
        let f = await frame(ch);
        const y = f.y + Math.min(f.h * 0.5, 60);
        await touch(line(f.x + f.w * 0.25, y, f.x + f.w * 0.7, y));
        ok((await chip(ch)) === null, `${tag}: trascinamento orizzontale senza lente: niente zoom`);
        const s0 = await p.evaluate(() => scrollY);
        await touch(line(f.x + f.w * 0.5, y + 40, f.x + f.w * 0.5, y - 140, 10));
        ok((await p.evaluate(() => scrollY)) !== s0, `${tag}: trascinamento verticale: la pagina scorre (${s0} → ${await p.evaluate(() => scrollY)})`);
        await p.locator('#' + ch.lens).scrollIntoViewIfNeeded();
        await p.locator('#' + ch.lens).tap(); await p.waitForTimeout(150);
        ok(await p.$eval('#' + ch.lens, (l) => l.getAttribute('aria-pressed') === 'true') && await p.$eval('#' + ch.svg, (s) => s.classList.contains('zooming')), `${tag}: lente accesa`);
        await p.locator('#' + ch.svg).scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
        f = await frame(ch);
        let yy = f.y + Math.min(f.h * 0.5, 60);
        // con la lente accesa un gesto verticale fa scorrere la pagina e non fa zoom
        const s1 = await p.evaluate(() => scrollY);
        // dito verso il basso: la pagina sale (in fondo alla pagina non potrebbe scendere)
        await touch(line(f.x + f.w * 0.5, yy - 50, f.x + f.w * 0.5 + 8, yy + 130, 12));
        const s2 = await p.evaluate(() => scrollY);
        ok(s2 < s1 - 50 && (await chip(ch)) === null, `${tag}: lente accesa, gesto verticale: la pagina scorre (${s1} → ${s2}) e niente zoom`);
        await p.locator('#' + ch.svg).scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
        f = await frame(ch); yy = f.y + Math.min(f.h * 0.5, 60);
        await p.touchscreen.tap(f.x + f.w * 0.5, yy); await p.waitForTimeout(150);
        ok(!(await p.$eval('#' + ch.tip, (t) => t.hidden)) && (await chip(ch)) === null, `${tag}: un tocco con la lente accesa apre il riquadro`);
        await touch(line(f.x + f.w * 0.2, yy, f.x + f.w * 0.75, yy));
        const t = await chip(ch);
        ok(!!t && await p.$eval('#' + ch.lens, (l) => l.getAttribute('aria-pressed') === 'false'), `${tag}: zoom con la lente («${t}»), poi la lente si spegne`);
        const cw = await p.$eval('#' + ch.chip, (e) => { const b = e.getBoundingClientRect(); return [b.left, b.right]; });
        ok(cw[0] >= 0 && cw[1] <= 390, `${tag}: etichetta dentro lo schermo (${cw.map(Math.round).join('–')})`);
        await p.locator(`#${ch.chip} button`).tap(); await p.waitForTimeout(300);
        ok((await chip(ch)) === null, `${tag}: × toglie lo zoom`);
        const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        ok(sw[0] <= sw[1], `${tag}: nessuno scorrimento orizzontale`);
      }
    }
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
