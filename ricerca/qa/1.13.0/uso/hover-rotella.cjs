// Riquadro aperto col solo passaggio del mouse, poi rotella: si chiude o segue il bottone?
const { chromium, NEW, ctx, pop } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch(); const c = await ctx(b, 1440, 'dark'); const p = await c.newPage();
  await p.goto(NEW + '#tit'); await p.waitForSelector('#titPain tbody tr', { timeout: 40000 }); await p.waitForTimeout(500);
  const bt = p.locator('button[data-src="titHistHelp"]'); await bt.evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  const bb = await bt.boundingBox(); console.log("sotto il puntatore:", await p.evaluate(([x, y]) => document.elementFromPoint(x, y).outerHTML.slice(0, 60), [bb.x + 8, bb.y + 8])); await p.mouse.move(bb.x + 8, bb.y + 8, { steps: 3 }); await p.waitForTimeout(350);
  const a = await pop(p); await p.mouse.wheel(0, 200); await p.waitForTimeout(800);
  const q = await pop(p); const nb = await bt.boundingBox();
  console.log(`aperto al passaggio: ${!!a}; dopo rotella di 200 px: ${q ? 'aperto, top ' + Math.round(q.top) + ' (bottone a ' + Math.round(nb.y) + ')' : 'chiuso'}`);
  await b.close();
})();
