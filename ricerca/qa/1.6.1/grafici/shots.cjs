// Screenshot dello scatter (1.6.1): 5 larghezze, chiaro e scuro, senza selezione e con 5 crisi selezionate; tabella; CVD.
// Uso: BASE=http://127.0.0.1:8801/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/grafici/shots.cjs
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8801/';
const OUT = path.join(__dirname, 'shots');
const SEL = [['covid', '2020 Covid'], ['gfc', '2007-09 crisi finanziaria'], ['dotcom', '2000-03 bolla internet'], ['fuori2021', 'ep:2021-12-01'], ['yen', '2024 carry yen']];
(async () => {
  const b = await chromium.launch();
  for (const w of [1440, 1280, 1024, 390, 360]) for (const theme of ['light', 'dark']) {
    const touch = w < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: touch ? 844 : 900 }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
    await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
    const p = await ctx.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(500);
    const panel = p.locator('#vxScatter').locator('xpath=ancestor::div[contains(@class,"panel")][1]');
    const tag = `${w}-${theme === 'light' ? 'chiaro' : 'scuro'}`;
    await panel.screenshot({ path: path.join(OUT, `${tag}-nessuna.png`) });
    for (const [n, key] of SEL) {
      await p.click(`#vxCrises button[data-g="${key}"]`); await p.waitForTimeout(120);
      await panel.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
      if (n === 'covid' || n === 'fuori2021') {
        // tabella degli episodi (soglia 30) con la crisi selezionata
        await p.click('#vxTable tr[data-x="30"]'); await p.waitForTimeout(150);
        const tp = p.locator('#vxEps').locator('xpath=ancestor::div[contains(@class,"panel")][1]');
        await tp.screenshot({ path: path.join(OUT, `${tag}-tabella30-${n}.png`) });
        await p.click('#vxTable tr[data-x="40"]'); await p.waitForTimeout(150);
      }
    }
    await p.keyboard.press('Escape');
    if (w === 1440 || w === 390) {
      // CVD
      await p.click('#cvdBtn'); await p.waitForTimeout(200);
      await panel.screenshot({ path: path.join(OUT, `${tag}-cvd-nessuna.png`) });
      await p.click('#cvdBtn');
      // riga della soglia 30 del 27/03/2026 (gruppo senza punti) e 2024 carry yen alla soglia 50
      await p.click('#vxTable tr[data-x="30"]'); await p.waitForTimeout(150);
      const r = p.locator('#vxEps tbody tr[data-g="ep:2026-03-27"]');
      if (await r.count()) { await r.click(); await p.waitForTimeout(150); await panel.screenshot({ path: path.join(OUT, `${tag}-riga-2026-03.png`) }); await p.keyboard.press('Escape'); }
      await p.click('#vxTable tr[data-x="50"]'); await p.waitForTimeout(150);
      await p.click('#vxCrises button[data-g="2024 carry yen"]'); await p.waitForTimeout(150);
      const tp = p.locator('#vxEps').locator('xpath=ancestor::div[contains(@class,"panel")][1]');
      await tp.screenshot({ path: path.join(OUT, `${tag}-tabella50-yen.png`) });
      await p.keyboard.press('Escape');
    }
    await ctx.close();
  }
  await b.close();
})();
