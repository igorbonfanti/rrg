// Casi limite della vista 8 nel browser (Playwright): file mancanti, serie mancanti, indirizzi, ridisegni ripetuti, tempi.
// Uso: node gzserve.mjs <worktree> 8817 & ; BASE=http://127.0.0.1:8817/ NODE_PATH=$(npm root -g) node casi_browser.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8817/', WT = process.env.WT;
let fail = 0, n = 0;
const ok = (c, msg) => { n++; console.log(`${c ? 'OK  ' : 'FAIL'} ${msg}`); if (!c) fail++; };
const init = () => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} };
async function page(b, opt = {}, routes = []) {
  const ctx = await b.newContext({ viewport: { width: opt.w || 1440, height: 900 }, isMobile: !!opt.mobile, hasTouch: !!opt.mobile });
  await ctx.addInitScript(init);
  for (const [pat, fn] of routes) await ctx.route(pat, fn);
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errs.push(m.text()));
  return { ctx, p, errs };
}
const rows = (p) => p.evaluate(() => [...document.querySelectorAll('#emTable tbody tr')].map((tr) => ({ k: tr.dataset.em, fx: tr.querySelector('.c-fx').innerText.trim(), u: tr.querySelector('.c-m3u').innerText.trim(), rs: tr.querySelector('.c-rs').innerText.trim() })));
(async () => {
  const b = await chromium.launch();
  // A. caso normale: tempi, ridisegni ripetuti, nodi stabili
  {
    const { ctx, p, errs } = await page(b);
    await p.goto(BASE + '#mon'); await p.waitForSelector('#boardTable tbody tr');
    const t0 = Date.now(); await p.click('#tab-emg');
    await p.waitForFunction(() => document.querySelectorAll('#emTable tbody tr').length >= 7 && document.querySelector('#emChart path'), null, { timeout: 60000, polling: 20 });
    ok(true, `A apertura della vista 8 (desktop, rete locale): ${Date.now() - t0} ms`);
    const nodes0 = await p.evaluate(() => document.querySelectorAll('#emChart *').length);
    const times = [];
    for (let i = 0; i < 12; i++) for (const r of ['10A', 'MAX', '3A']) { const t = await p.evaluate((r) => { const s = performance.now(); document.querySelector(`#emRange [data-range="${r}"]`).click(); return performance.now() - s; }, r); times.push(t); }
    times.sort((a, b) => a - b);
    ok(times[Math.floor(times.length / 2)] < 150, `A ridisegno al cambio di periodo: mediana ${times[Math.floor(times.length / 2)].toFixed(0)} ms, massimo ${times.at(-1).toFixed(0)} ms (36 cambi)`);
    const nodes1 = await p.evaluate(() => document.querySelectorAll('#emChart *').length);
    ok(nodes0 === nodes1, `A nodi del grafico stabili dopo 36 ridisegni (${nodes0} → ${nodes1})`);
    // 20 selezioni di righe: tempo e nodi del grafico della forza relativa
    const sel = [];
    for (let i = 0; i < 20; i++) { const k = ['KOSPI200', 'CSI300', 'EEM', 'HSI'][i % 4]; sel.push(await p.evaluate(async (k) => { const s = performance.now(); document.querySelector(`#emTable tr[data-em="${k}"]`).click(); await new Promise((r) => setTimeout(r, 0)); return performance.now() - s; }, k)); }
    sel.sort((a, b) => a - b);
    ok(true, `A selezione di una riga (ridisegno di tutta la vista): mediana ${sel[10].toFixed(0)} ms`);
    const cdp = await ctx.newCDPSession(p);
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'document' });
    const ls = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    ok(ls.listeners.filter((l) => l.type === 'pointerdown').length <= 3, `A ascoltatori pointerdown sul documento dopo i ridisegni: ${ls.listeners.filter((l) => l.type === 'pointerdown').length}`);
    // livello blu cambiato nella vista 6 → la vista 8 lo rilegge
    await p.click('#emOpenIx'); await p.waitForTimeout(400);
    const k = await p.evaluate(() => location.hash);
    await p.click('#ixBluePlus'); await p.waitForTimeout(200);
    await p.click('#tab-emg'); await p.waitForTimeout(500);
    const blu = await p.evaluate(() => document.querySelector('#emTable tr.sel .c-blue').innerText);
    ok(/\*/.test(blu), `A livello blu cambiato nella vista 6 (${k}) letto dalla vista 8: «${blu.trim()}»`);
    await p.evaluate(() => document.querySelector('#emRange [data-range="3A"]').click());
    ok(!errs.length, `A nessun errore nella console (${errs.join(' | ')})`);
    await ctx.close();
  }
  // A2. telefono con CPU rallentata 4×: apertura della vista 8 a freddo dall'indirizzo
  {
    const { ctx, p, errs } = await page(b, { w: 390, mobile: true });
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 6e6 / 8, uploadThroughput: 1.5e6 / 8 });
    const t0 = Date.now(); await p.goto(BASE + '#emg-KOSPI200', { waitUntil: 'commit' });
    await p.waitForFunction(() => document.querySelectorAll('#emTable tbody tr').length >= 7 && document.querySelector('#emChart path'), null, { timeout: 120000, polling: 50 });
    ok(true, `A2 telefono (CPU 4×, 6 Mbit/s): vista 8 pronta dall'indirizzo in ${Date.now() - t0} ms`);
    const t1 = await p.evaluate(() => { const s = performance.now(); document.querySelector('#emRange [data-range="MAX"]').click(); return performance.now() - s; });
    ok(t1 < 400, `A2 telefono: ridisegno MAX ${t1.toFixed(0)} ms`);
    ok((await p.evaluate(() => document.querySelector('#emTable tr.sel')?.dataset.em)) === 'KOSPI200', 'A2 #emg-KOSPI200 apre KOSPI200');
    ok(!errs.length, `A2 nessun errore (${errs.join(' | ')})`);
    await ctx.close();
  }
  // B. data/emerging.json assente (prima della prima corsa)
  {
    const { ctx, p, errs } = await page(b, {}, [['**/data/emerging.json', (r) => r.fulfill({ status: 404, body: '' })]]);
    await p.goto(BASE + '#emg'); await p.waitForTimeout(3500);
    const msg = await p.evaluate(() => ({ t: document.querySelector('#emLoading').innerText, vis: !document.querySelector('#emLoading').hidden, body: !document.querySelector('#emBody').hidden }));
    ok(msg.vis && /non disponibili/.test(msg.t) && !msg.body, `B emerging.json 404: «${msg.t}», corpo nascosto ${!msg.body}`);
    ok(!errs.length, `B nessuna eccezione (${errs.join(' | ')})`);
    await ctx.close();
  }
  // C. file con serie mancanti (FRED, KRW=X, ACWI) e asOf nulli
  {
    const em = JSON.parse(fs.readFileSync(WT + '/data/emerging.json'));
    delete em.series.DTWEXEMEGS; delete em.series['KRW=X']; delete em.series.ACWI; em.asOf.fred = null; em.missing = ['DTWEXEMEGS', 'KRW=X', 'ACWI'];
    const { ctx, p, errs } = await page(b, {}, [['**/data/emerging.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(em) })]]);
    await p.goto(BASE + '#emg-KOSPI200'); await p.waitForTimeout(3500);
    const r = await rows(p);
    const kos = r.find((x) => x.k === 'KOSPI200');
    ok(r.length === 7 && kos && kos.fx === '—' && kos.u === '—', `C KRW=X mancante: valuta «${kos && kos.fx}», 3 mesi in $ «${kos && kos.u}»`);
    ok(r.every((x) => x.rs === '—'), `C ACWI mancante: forza relativa «—» per tutti (${r.map((x) => x.rs).join(',')})`);
    const kp = await p.evaluate(() => document.querySelector('#emKpis').innerText);
    ok(/FRED non disponibile/.test(kp), 'C FRED mancante: riquadro «FRED non disponibile»');
    ok(!errs.length, `C nessuna eccezione (${errs.join(' | ')})`);
    // tooltip sul grafico senza FRED né cambio
    const box = await p.locator('#emChart').boundingBox();
    await p.mouse.move(box.x + box.width * 0.5, box.y + 60); await p.waitForTimeout(150);
    ok(!errs.length && !(await p.evaluate(() => document.querySelector('#emTip').hidden)), `C riquadro dei valori senza FRED e senza cambio (${errs.join(' | ')})`);
    await ctx.close();
  }
  // D. indices_more.json assente: 5 indici su 7 mancano
  {
    const { ctx, p, errs } = await page(b, {}, [['**/data/indices_more.json', (r) => r.fulfill({ status: 404, body: '' })]]);
    await p.goto(BASE + '#emg'); await p.waitForTimeout(3500);
    const r = await rows(p), miss = await p.evaluate(() => ({ h: document.querySelector('#emMiss').hidden, t: document.querySelector('#emMiss').innerText }));
    ok(r.length === 2 && !miss.h, `D righe ${r.map((x) => x.k).join(',')}; avviso «${miss.t}»`);
    ok(!errs.length, `D nessuna eccezione (${errs.join(' | ')})`);
    await ctx.close();
  }
  // E. config/emerging.json assente: scheda nascosta, #emg torna al Monitor
  {
    const { ctx, p, errs } = await page(b, {}, [['**/config/emerging.json', (r) => r.fulfill({ status: 404, body: '' })]]);
    await p.goto(BASE + '#emg-KOSPI200'); await p.waitForTimeout(2500);
    const s = await p.evaluate(() => ({ tab: document.querySelector('#tab-emg').hidden, view: !document.querySelector('#v-mon').hidden, h: location.hash }));
    ok(s.tab && s.view, `E config assente: scheda nascosta ${s.tab}, Monitor aperto ${s.view} (${s.h})`);
    ok(!errs.length, `E nessuna eccezione (${errs.join(' | ')})`);
    await ctx.close();
  }
  // F. indirizzo con un indice sconosciuto e comandi
  {
    const { ctx, p, errs } = await page(b);
    await p.goto(BASE + '#emg-FOO'); await p.waitForTimeout(3500);
    const h = await p.evaluate(() => ({ h: location.hash, sel: document.querySelector('#emTable tr.sel')?.dataset.em, view: !document.querySelector('#v-emg').hidden }));
    ok(h.view && h.sel, `F #emg-FOO: vista 8 aperta con ${h.sel}, indirizzo ${h.h}`);
    await p.fill('#cmd', 'TWN EMG'); await p.press('#cmd', 'Enter'); await p.waitForTimeout(800);
    ok((await p.evaluate(() => document.querySelector('#emTable tr.sel')?.dataset.em)) === 'TWN', 'F comando «TWN EMG»');
    await p.goBack(); await p.waitForTimeout(800);
    ok(!errs.length, `F nessuna eccezione (${errs.join(' | ')}), dopo Indietro ${await p.evaluate(() => location.hash)}`);
    await ctx.close();
  }
  await b.close();
  console.log(`CONTROLLI ${n}, falliti ${fail}`);
})();
