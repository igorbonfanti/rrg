// Screenshot mirati per i bug
const L = require('./lib.cjs');
(async () => {
  const b = await L.launch();
  const { ctx, page } = await L.open(b, 'desktop');
  await L.goto(page, 'idx', 4000);
  await page.click('#ixPickAll'); await page.waitForTimeout(800);
  const tr = await page.$('#ixTable tbody tr[data-ix="CAC"]');
  await tr.scrollIntoViewIfNeeded(); await tr.hover(); 
  await page.screenshot({ path: L.SHOTS + 'bug-cali-0-percentile.png', clip: await page.$eval('#ixTable', (t) => { const r = t.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 900) }; }) });
  await page.click('#ixPickMain');
  await page.fill('#cmd', 'DAX'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(1500);
  await page.screenshot({ path: L.SHOTS + 'bug-cmd-dax.png' });
  // storia della divergenza: punto del 01/12/2025
  await L.goto(page, 'tit-XLU', 3500);
  const hb = await page.evaluate(() => { const s = document.getElementById('titHist'); s.scrollIntoView({ block: 'center' }); const r = s.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
  let ht = '';
  for (let f = 0.1; f < 0.9 && !/01\/12\/2025/.test(ht); f += 0.004) { await page.mouse.move(hb[0] + hb[2] * f, hb[1] + hb[3] / 2); await page.waitForTimeout(30); ht = await page.evaluate(() => document.getElementById('titHistTip').innerText); }
  console.log('hist tip:', ht.replace(/\s+/g, ' '));
  await page.screenshot({ path: L.SHOTS + 'bug-hist-lunedi.png' });
  // portafoglio a zero
  await L.goto(page, 'rrg', 2000);
  await page.selectOption('#groupSel', '1 · Asset class'); await page.waitForTimeout(600); await page.selectOption('#benchSel', 'PTF'); await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('#ptfTable input.wsl').forEach((el) => { el.value = 0; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: L.SHOTS + 'bug-ptf-zero.png' });
  await page.click('#ptfReset');
  // SPY da universo globale
  await page.fill('#cmd', 'SPY'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(1200);
  console.log('SPY da Asset class →', await page.inputValue('#groupSel'), await page.inputValue('#benchSel'));
  await page.screenshot({ path: L.SHOTS + 'bug-cmd-spy.png' });
  await ctx.close();
  const p2 = await L.open(b, 'phone');
  await L.goto(p2.page, 'mon', 1500);
  await p2.page.screenshot({ path: L.SHOTS + 'bug-phone-monitor-schede.png' });
  await b.close();
})();
