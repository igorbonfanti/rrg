// 1.4.0: controlli dei rilievi dei controlli indipendenti (grafici e usabilità) sulla vista 8 e sulla barra delle schede.
// Uso: BASE=http://127.0.0.1:8791/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v140fix.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
let fail = 0;
const ok = (c, msg) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${msg}`); if (!c) fail++; };
const init = (range) => () => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} };
(async () => {
  const b = await chromium.launch();
  const open = async (w, h, hash, opt = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, ...opt });
    await ctx.addInitScript(init());
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + hash); await p.waitForTimeout(500);
    if (hash.startsWith('#emg')) await p.waitForSelector('#emChart path', { timeout: 30000 });
    return { ctx, p, errs };
  };
  const range = async (p, r) => { await p.click(`#emRange button[data-range="${r}"]`); await p.waitForTimeout(400); };
  // 1. TWN in MAX: niente picchi da errori di stampa (scala del cambio sopra 20, prezzo in dollari sotto 1000)
  {
    const { ctx, p, errs } = await open(1440, 900, '#emg-TWN');
    await range(p, 'MAX');
    const ax = await p.evaluate(() => [...document.querySelectorAll('#emChart .axt')].map((t) => t.textContent));
    const nums = ax.map((t) => parseFloat(t.replace(/\./g, '').replace(',', '.'))).filter((v) => !isNaN(v) && v < 3000 && v > 0);
    ok(!ax.some((t) => /^[1-9],\d+$/.test(t) && parseFloat(t.replace(',', '.')) < 20), `TWN MAX: nessuna tacca del cambio sotto 20 (${ax.slice(0, 12).join(' ')})`);
    const px = nums.filter((v) => v > 20 && !(v >= 2000 && v <= 2100 && Number.isInteger(v))); ok(px.length && Math.max(...px) < 1500, `TWN MAX: scala del prezzo senza picchi oltre 1500 (${px.join(' ')})`);
    ok(!errs.length, 'TWN console ' + errs.join(' | '));
    await ctx.close();
  }
  // 2. KOSPI200 MAX: le due linee hanno la stessa base (al primo giorno con il cambio valgono uguale)
  {
    const { ctx, p } = await open(1440, 900, '#emg-KOSPI200');
    await range(p, 'MAX');
    const meta = await p.locator('#emChartMeta').innerText();
    const same = await p.evaluate(() => { const a = document.querySelector('#emChart .emloc').getAttribute('d'), u = document.querySelector('#emChart .emusd').getAttribute('d'); const m = u.match(/^M([\d.]+) ([\d.]+)/); const re = new RegExp('[ML]' + m[1].replace('.', '\\.') + ' ([\\d.]+)'); const l = a.match(re); return l ? Math.abs(+l[1] - +m[2]) : null; });
    // dalla 1.4.0 (cambi della Fed dal 2000) il cambio parte con l'indice e la nota della base di solito non serve: conta che le
    // due linee partano dallo stesso punto, sulla stessa data
    ok(!/base 100 al/.test(meta) || /stessa base/.test(meta), `KOSPI200 MAX: nota della base coerente (${meta})`);
    ok(same != null && same < 0.2, `KOSPI200 MAX: le due linee partono dallo stesso punto (scarto ${same})`);
    await range(p, '3A');
    ok(!/base 100 al/.test(await p.locator('#emChartMeta').innerText()), 'KOSPI200 3A: nessuna nota della base (le basi coincidono)');
    await ctx.close();
  }
  // 3. quadrante: nessuna etichetta sopra un altro punto o un'altra etichetta (1280 e 360)
  for (const [w, h, opt] of [[1280, 900, {}], [1440, 900, {}], [360, 780, { isMobile: true, hasTouch: true }]]) {
    const { ctx, p } = await open(w, h, '#emg-KOSPI200', opt);
    const bad = await p.evaluate(() => {
      const t = [...document.querySelectorAll('#emRS .emdot text')].map((e) => e.getBoundingClientRect()), c = [...document.querySelectorAll('#emRS .emdot circle')].map((e) => e.getBoundingClientRect());
      const ov = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      let n = 0; t.forEach((a, i) => { t.forEach((b, j) => { if (j > i && ov(a, b)) n++; }); c.forEach((b, j) => { if (j !== i && ov(a, b)) n++; }); });
      return [n, t.length];
    });
    ok(bad[0] === 0 && bad[1] === 7, `quadrante ${w}: ${bad[1]} etichette, sovrapposizioni ${bad[0]}`);
    await ctx.close();
  }
  // 4. barra delle schede: nessuno scorrimento orizzontale tra 360 e 1024 px, in due viste
  for (const w of [360, 601, 700, 744, 768, 820, 860, 900, 1024]) for (const v of ['#mon', '#emg']) {
    const { ctx, p } = await open(w, 900, v);
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, last: Math.round(document.querySelector('#tab-emg').getBoundingClientRect().right) }));
    ok(r.sw <= r.cw && r.last <= r.cw, `schede ${w} ${v}: scroll ${r.sw}/${r.cw}, scheda 8 fino a ${r.last}`);
    await ctx.close();
  }
  // 5. tabellone a 1024: nessuno scorrimento interno
  {
    const { ctx, p } = await open(1024, 768, '#emg');
    const r = await p.evaluate(() => { const s = document.querySelector('#emTable').closest('.tscroll'); return [s.scrollWidth, s.clientWidth]; });
    ok(r[0] <= r[1], `tabellone 1024: ${r[0]}/${r[1]}`);
    await ctx.close();
  }
  // 6. telefono: il tocco su una riga porta il dettaglio sullo schermo
  {
    const { ctx, p } = await open(390, 844, '#emg', { isMobile: true, hasTouch: true });
    await p.locator('#emTable tbody tr[data-em="IBOV"]').tap(); await p.waitForTimeout(900);
    const top = await p.evaluate(() => document.getElementById('emTitle').getBoundingClientRect().top);
    ok(top >= -5 && top < 300, `390: dopo il tocco il titolo del dettaglio è a ${Math.round(top)} px`);
    ok(/IBOV/.test(await p.locator('#emTitle').innerText()), '390: dettaglio di IBOV');
    await ctx.close();
  }
  // 7. comandi e tasto 8 senza config/emerging.json
  {
    const { ctx, p } = await open(1440, 900, '#mon');
    for (const [cmd, k] of [['KOSPI EMG', 'KOSPI200'], ['EMG IBOV', 'IBOV'], ['NIFTY EMG', 'NIFTY50']]) {
      await p.goto(BASE + '#mon'); await p.reload(); await p.waitForTimeout(1500); await p.keyboard.press('/'); await p.keyboard.type(cmd); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
      const h = await p.evaluate(() => location.hash); ok(h === '#emg-' + k, `comando ${cmd} → ${h}`);
      await p.keyboard.press('Escape');
    }
    await ctx.close();
    const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx2.addInitScript(init());
    await ctx2.route('**/config/emerging.json*', (r) => r.fulfill({ status: 404, body: '' }));
    const p2 = await ctx2.newPage(); await p2.goto(BASE + '#mon'); await p2.waitForTimeout(1500);
    await p2.keyboard.press('8'); await p2.waitForTimeout(500);
    ok(await p2.evaluate(() => document.getElementById('v-emg').hidden && !document.getElementById('v-mon').hidden), 'senza config/emerging.json il tasto 8 non apre una sezione vuota');
    await ctx2.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
