// Tocchi vicino al «i» nel titolo di un riquadro piegato (vista 4, 390 px): cosa si apre a varie distanze.
const { chromium, NEW, ctx, pop, neutral } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  for (const w of [390]) {
    const c = await ctx(b, w, 'light'); const p = await c.newPage();
    await p.goto(NEW + '#XLK'); await p.waitForSelector('#memTable tbody tr', { timeout: 40000 }); await p.waitForTimeout(600);
    for (const id of ['secCap']) for (const dx of [-30, -22, -16, -12, -10, -6, 22, 30]) {
      await p.evaluate((id) => { document.getElementById(id).open = false; }, id);
      const btn = p.locator(`#${id} > summary button.info`); await btn.scrollIntoViewIfNeeded();
      const bb = await btn.boundingBox();
      const x = dx < 0 ? bb.x + dx : bb.x + bb.width + dx - 16;
      const hit = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + e.className : ''; }, [x, bb.y + bb.height / 2]);
      await p.touchscreen.tap(x, bb.y + bb.height / 2); await p.waitForTimeout(200);
      console.log(id, `dx ${dx} (x=${Math.round(x)}, «i» ${Math.round(bb.x)}–${Math.round(bb.x + bb.width)}) elemento ${hit}: riquadro «i» ${!!(await pop(p))}, piegato aperto ${await p.evaluate((id) => document.getElementById(id).open, id)}`);
      await p.touchscreen.tap(...(await neutral(p))); await p.waitForTimeout(150);
    }
    await c.close();
  }
  await b.close();
})();
