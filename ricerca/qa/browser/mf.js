const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/v080/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
    await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await ctx.newPage(); const log = [];
    p.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); }); p.on('pageerror', (e) => log.push(e.message));
    await p.goto('http://127.0.0.1:8780/#rrg'); await p.waitForTimeout(1500);
    const opt = await p.$$eval('#groupSel option', (o) => o.map((x) => x.value));
    await p.selectOption('#groupSel', opt.find((v) => /Asset class/.test(v))); await p.waitForTimeout(1200);
    const bench = await p.inputValue('#benchSel');
    const labels = await p.$$eval('#rrg text', (t) => t.map((x) => x.textContent));
    const rot = await p.textContent('#rotTable');
    const ptf = await p.textContent('#ptfTable');
    console.log(w, 'bench', bench, '| Trend nel grafico', labels.includes('Trend'), '| in tabella', /Trend/.test(rot), '| classe', /Alternativi/.test(ptf), '| errori', log.join(' ; ') || 'nessuno');
    const row = await p.$$eval('#rotTable tbody tr', (r) => r.map((x) => x.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /Trend/.test(t)));
    console.log('  riga:', row[0]);
    await p.screenshot({ path: `${OUT}mf-${w}.png`, fullPage: false });
    // peso al 5%: il portafoglio si ricalcola senza errori
    await p.fill('#ptfTable input.wnum[data-sym="DBMFE.PA"]', '5'); await p.dispatchEvent('#ptfTable input.wnum[data-sym="DBMFE.PA"]', 'input'); await p.waitForTimeout(600);
    console.log('  dopo 5%:', (await p.textContent('#ptfTotNote')).slice(0, 90), '| errori', log.length);
    await ctx.close();
  }
  await b.close();
})();
