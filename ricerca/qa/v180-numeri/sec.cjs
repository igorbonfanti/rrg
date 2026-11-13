const L = require('./lib.cjs');
const ROOT = require('path').resolve(__dirname, '../../..') + '/';
const fs = require('fs');
const SEC = JSON.parse(fs.readFileSync(ROOT + 'data/sectors.json'));
const D = SEC.dates;
(async () => {
  const b = await L.launch(), R = {};
  const run = async (name, sym, range, d0, d1, extra, pre) => {
    const p = await L.page(b, { sector: sym, range });
    await L.go(p, sym, 'ts');
    await p.evaluate(() => { const c = document.getElementById('secCap'); if (c) c.open = true; });
    await p.waitForSelector('#secCapSvg rect.frame', { timeout: 30000 }); await p.waitForTimeout(600);
    await p.locator('#ts').scrollIntoViewIfNeeded();
    const r = { sym, range };
    r.dumpBefore = await L.dump(p, 'ts');
    r.capBefore = await L.dump(p, 'secCapSvg');
    r.edgesBefore = await L.edges(p, 'ts', 'tsTip');
    // riquadri senza zoom nelle sedute del tratto (se dentro il periodo)
    const wb = L.windowOf(D, r.edgesBefore), i0 = wb.indexOf(d0), i1 = wb.indexOf(d1);
    if (i0 >= 0 && i1 >= 0) {
      const ids = []; for (let i = i0; i <= i1; i++) ids.push(i);
      r.tipsBefore = (await L.sweep(p, 'ts', 'tsTip', wb.length, ids)).map(([i, t]) => [wb[i], t]);
      await p.locator('#secCapSvg').scrollIntoViewIfNeeded();
      r.capTipsBefore = (await L.sweep(p, 'secCapSvg', 'secCapTip', wb.length, ids)).map(([i, t]) => [wb[i], t]);
      await p.locator('#ts').scrollIntoViewIfNeeded();
    }
    if (pre) await L.zoomIdx(p, 'ts', 'tsTip', D, pre[0], pre[1]);
    await L.zoomIdx(p, 'ts', 'tsTip', D, d0, d1);
    r.chip = await L.chip(p, 'secZoom'); r.capChip = await L.chip(p, 'secCapZoom');
    r.edges = await L.edges(p, 'ts', 'tsTip');
    const w = L.windowOf(D, r.edges);
    r.win = w;
    r.dump = await L.dump(p, 'ts');
    r.tips = (await L.sweep(p, 'ts', 'tsTip', w.length, w.map((_, i) => i))).map(([i, t]) => [w[i], t]);
    await p.locator('#secCapSvg').scrollIntoViewIfNeeded();
    r.capEdges = await L.edges(p, 'secCapSvg', 'secCapTip');
    r.cap = await L.dump(p, 'secCapSvg');
    r.capTips = (await L.sweep(p, 'secCapSvg', 'secCapTip', w.length, w.map((_, i) => i))).map(([i, t]) => [w[i], t]);
    await p.locator('#ts').scrollIntoViewIfNeeded();
    if (extra) await extra(p, r);
    r.errs = p.errs;
    await p.context().close();
    R[name] = r;
    console.log(name, r.chip, r.edges, 'n', w.length, 'errs', p.errs.length);
  };
  const switchTo = (syms) => async (p, r) => {
    r.after = {};
    for (const s of syms) {
      await p.click(`#secChips button[data-sym="${s}"]`); await p.waitForTimeout(700);
      await p.locator('#ts').scrollIntoViewIfNeeded();
      const x = { chip: await L.chip(p, 'secZoom'), capChip: await L.chip(p, 'secCapZoom'), edges: await L.edges(p, 'ts', 'tsTip'), dump: await L.dump(p, 'ts') };
      await p.locator('#secCapSvg').scrollIntoViewIfNeeded();
      x.capEdges = await L.edges(p, 'secCapSvg', 'secCapTip'); x.cap = await L.dump(p, 'secCapSvg');
      await p.locator('#ts').scrollIntoViewIfNeeded();
      const w = L.windowOf(D, x.edges);
      x.tips = (await L.sweep(p, 'ts', 'tsTip', w.length, [0, 1, Math.floor(w.length / 2), w.length - 1])).map(([i, t]) => [w[i], t]);
      r.after[s] = x;
    }
  };
  await run('A1_XLK_3A_2025', 'XLK', '3A', '2025-03-03', '2025-05-30');
  await run('A2_XLF_MAX_2008', 'XLF', 'MAX', '2008-09-02', '2009-06-30');
  await run('A3_XLK_MAX_2017_19', 'XLK', 'MAX', '2017-01-03', '2019-12-31', switchTo(['XLC', 'XLRE']));
  await run('A4_XLK_MAX_2010_12', 'XLK', 'MAX', '2010-01-04', '2012-12-31', switchTo(['XLC', 'XLRE']));
  await run('A5_XLK_MAX_2015', 'XLK', 'MAX', '2015-06-01', '2016-12-30', switchTo(['XLRE']));
  await run('A6_XLE_10A_3w', 'XLE', '10A', '2026-10-15', '2026-11-04', null, ['2026-06-01', '2026-11-06']);
  await run('A7_XLRE_3A_appr', 'XLRE', '3A', '2025-04-01', '2025-06-30');
  fs.writeFileSync('out/sec.json', JSON.stringify(R));
  await b.close();
})();
