// Controllo 3b: con data/vix.json, data/ath.json e data/emerging.json che rispondono 404 la vista lo dice e il resto funziona.
const fs = require('fs'), path = require('path');
const { chromium, NEW, VIEWS, ctx, watch, go, pop } = require('./lib.cjs');
const SH = path.join(__dirname, 'shots', 'mancanti'); fs.mkdirSync(SH, { recursive: true });
const lines = []; const log = (m) => { lines.push(m); console.log(m); };
(async () => {
  const b = await chromium.launch();
  for (const w of [1440, 390]) {
    const c = await ctx(b, w, w === 1440 ? 'dark' : 'light'); const p = await c.newPage(); const errs = watch(p);
    const hit = [];
    await p.route(/data\/(vix|ath|emerging)\.json/, (r) => { hit.push(r.request().url().split('/').pop()); r.fulfill({ status: 404, body: 'not found' }); });
    await p.goto(NEW + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 });
    for (const [h, vid, wait] of VIEWS) {
      await go(p, NEW, h, null); await p.waitForTimeout(2500);
      const r = await p.evaluate((vid) => {
        const v = [...document.querySelectorAll('section.view')].find((s) => !s.hidden);
        const msgs = [...v.querySelectorAll('.note, .loading, .miss, p')].filter((x) => x.getClientRects().length && /non (disponibil|caricat|arrivat)|mancan|errore|impossibile|404|non è stato|non riesc/i.test(x.textContent)).map((x) => x.textContent.trim().slice(0, 160));
        const tab = document.querySelector(`.fnkeys button[aria-controls="${vid}"]`);
        return { shown: v.id, msgs, rows: v.querySelectorAll('tbody tr, circle, li').length, tabHidden: tab ? tab.hidden : null, loading: [...v.querySelectorAll('.loading')].filter((x) => x.getClientRects().length).map((x) => x.textContent.trim().slice(0, 80)) };
      }, vid);
      log(`${w} #${h}: vista mostrata ${r.shown}, righe/punti ${r.rows}, scheda nascosta ${r.tabHidden}, messaggi: ${r.msgs.join(' ‖ ') || '—'}${r.loading.length ? ', ancora «' + r.loading.join(' ') + '»' : ''}`);
      if (['vix', 'ath', 'emg', 'mon'].includes(h)) await p.screenshot({ path: path.join(SH, `${h}-${w}.png`), fullPage: false });
      // i «i» della vista si aprono ancora?
      const bt = p.locator(`#${r.shown} button.info`).first();
      if (await bt.count() && await bt.isVisible()) { if (w < 600) await bt.tap(); else await bt.click(); await p.waitForTimeout(200); const q = await pop(p); log(`   «i» ${q ? 'si apre' : 'NON si apre'}`); await p.keyboard.press('Escape'); if (w < 600) await p.touchscreen.tap(3, 300); }
    }
    log(`${w}: richieste bloccate ${[...new Set(hit)].join(', ')}; errori in console: ${errs.length} ${errs.slice(0, 4).join(' | ')}`);
    await c.close();
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, 'dati-mancanti.txt'), lines.join('\n') + '\n');
})();
