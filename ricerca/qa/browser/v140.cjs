// 1.4.0: vista 8 Emergenti (solo contesto). Deve fallire sulla 1.3.x (manca la scheda) e passare sulla 1.4.0.
// Uso: BASE=http://127.0.0.1:8791/ OUT=cartella_screenshot NODE_PATH=$(npm root -g) node ricerca/qa/browser/v140.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/', OUT = process.env.OUT;
let fail = 0;
const ok = (c, msg) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${msg}`); if (!c) fail++; };
const STATES = ['Normale', 'Attenzione', 'Zona blu', 'Trigger', 'Fallito', 'Cooldown', 'Avvicinamento'];
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, light, touch] of [['1440-scuro', 1440, 900, false, false], ['1280-chiaro', 1280, 900, true, false], ['390-scuro', 390, 844, false, true], ['360-chiaro', 360, 780, true, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    await ctx.addInitScript(({ light }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, { light });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    // 1. scheda e caricamento pigro
    await p.goto(BASE + '#mon'); await p.waitForTimeout(2500);
    ok(await p.locator('#tab-emg').count() === 1 && /8 Emergenti/i.test(await p.locator("#tab-emg").innerText()), `${name} scheda «8 Emergenti»`);
    if (!(await p.locator('#tab-emg').count())) { ok(false, `${name} vista assente: interrompo`); await ctx.close(); continue; }
    const before = await p.evaluate(() => performance.getEntriesByType('resource').some((r) => /data\/emerging\.json/.test(r.name)));
    ok(!before, `${name} data/emerging.json non scaricato aprendo il Monitor`);
    const rows = await p.evaluate(() => document.querySelectorAll('.fnkeys button').length);
    const tops = await p.evaluate(() => new Set([...document.querySelectorAll('.fnkeys button')].map((x) => Math.round(x.getBoundingClientRect().top))).size);
    ok(rows === 8 && tops <= 2, `${name} 8 schede su ${tops} righe`);
    await p.locator('#tab-emg').click(); await p.waitForTimeout(3500);
    ok(/#emg-/.test(p.url()), `${name} indirizzo ${p.url().split('#')[1]}`);
    ok(await p.evaluate(() => performance.getEntriesByType('resource').some((r) => /data\/emerging\.json/.test(r.name))), `${name} data/emerging.json scaricato alla prima apertura`);
    // 2. tabellone: 7 righe, stato uguale alla vista 6
    const em = await p.evaluate(() => [...document.querySelectorAll('#emTable tbody tr')].map((tr) => ({ k: tr.dataset.em, st: tr.querySelector('.c-state').innerText.trim(), fx: tr.querySelector('.c-fx').innerText.trim(), u: tr.querySelector('.c-m3u').innerText.trim() })));
    ok(em.length === 7, `${name} 7 righe (${em.map((r) => r.k).join(' ')})`);
    ok(em.every((r) => STATES.some((s) => r.st.toLowerCase().includes(s.toLowerCase()))), `${name} stati leggibili`);
    ok(em.find((r) => r.k === 'HSI') && /agganciato/i.test(em.find((r) => r.k === 'HSI').fx), `${name} HSI agganciato`);
    ok(em.find((r) => r.k === 'EEM') && /in dollari/i.test(em.find((r) => r.k === 'EEM').fx), `${name} EEM in dollari`);
    ok(em.every((r) => r.u === '—' || /^[+−]?\d+,\d%$/.test(r.u)), `${name} 3 mesi in $: numero o «—»`);
    await p.goto(BASE + '#idx'); await p.waitForTimeout(3500);
    const ix = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#ixTable tbody tr')].map((tr) => [tr.dataset.ix, tr.querySelector('.c-state').innerText.trim()])));
    const same = em.filter((r) => ix[r.k] != null).every((r) => ix[r.k] === r.st);
    ok(same, `${name} stati uguali alla vista 6 (${em.filter((r) => ix[r.k] != null).length} confrontati)`);
    // 3. #emg-KOSPI200, tasto 8, comando, Indietro
    await p.goto(BASE + '#emg-KOSPI200'); await p.waitForTimeout(2500);
    ok(/KOSPI200/.test(await p.locator('#emTitle').innerText()), `${name} #emg-KOSPI200 apre il dettaglio`);
    await p.goto(BASE + '#mon'); await p.waitForTimeout(1500);
    if (!touch) { await p.keyboard.press('8'); await p.waitForTimeout(1500); ok(!(await p.locator('#v-emg').isHidden()), `${name} tasto 8`); }
    await p.locator('#cmd').fill('CSI300 EMG'); await p.locator('#cmd').press('Enter'); await p.waitForTimeout(1500);
    ok(/CSI300/.test(await p.locator('#emTitle').innerText()), `${name} comando CSI300 EMG`);
    await p.locator('#emTable tbody tr[data-em="IBOV"]').click(); await p.waitForTimeout(800);
    ok(/IBOV/.test(await p.locator('#emTitle').innerText()) && /#emg-IBOV/i.test(p.url()), `${name} clic su IBOV`);
    await p.goBack(); await p.waitForTimeout(1200);
    ok(/CSI300/.test(await p.locator('#emTitle').innerText()), `${name} Indietro torna a CSI300`);
    // 4. grafico e tooltip
    const panes = await p.evaluate(() => [...document.querySelectorAll('#emChart .pane-t')].map((t) => t.textContent));
    ok(panes.length === 4, `${name} 4 pannelli`);
    const box = await p.locator('#emChart').boundingBox();
    await p.locator('#emChart').scrollIntoViewIfNeeded();
    const bb = await p.locator('#emChart').boundingBox();
    if (touch) await p.touchscreen.tap(bb.x + bb.width * 0.6, bb.y + bb.height * 0.3); else await p.mouse.move(bb.x + bb.width * 0.6, bb.y + bb.height * 0.3);
    await p.waitForTimeout(300);
    const tip = await p.locator('#emTip').innerText().catch(() => '');
    ok(/\d{2}\/\d{2}\/\d{4}/.test(tip) && /Sopra media 200/.test(tip) && /Dollaro vs emergenti/.test(tip), `${name} riquadro dei valori: ${tip.replace(/\n/g, ' / ').slice(0, 80)}`);
    // 5. nessuno scorrimento orizzontale, console pulita
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} niente scorrimento orizzontale`);
    if (OUT) await p.screenshot({ path: `${OUT}/v140-${name}.png`, fullPage: true });
    // 6. file non disponibile
    const c2 = await b.newContext({ viewport: { width: w, height: h } });
    const p2 = await c2.newPage(); await p2.route('**/data/emerging.json', (r) => r.abort());
    await c2.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    await p2.goto(BASE + '#emg'); await p2.waitForTimeout(3000);
    ok(/non disponibili/.test(await p2.locator('#emLoading').innerText()), `${name} file mancante: messaggio comprensibile`);
    await c2.close();
    ok(!errs.length, `${name} console senza errori ${errs.join(' | ').slice(0, 200)}`);
    await ctx.close();
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
