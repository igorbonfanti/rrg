const L = require('./lib.cjs');
const ROOT = require('path').resolve(__dirname, '../../..') + '/';
const fs = require('fs');
(async () => {
  const b = await L.launch(), R = {};
  const run = async (name, ls, file, d0, d1) => {
    const D = JSON.parse(fs.readFileSync(ROOT + 'data/' + file)).dates;
    const p = await L.page(b, ls);
    await L.go(p, 'rrg', 'perf');
    if (ls.group) { await p.waitForFunction((g) => document.getElementById('groupSel').value === g, ls.group, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(800); await p.locator('#perf').scrollIntoViewIfNeeded(); }
    const r = { group: await p.$eval('#groupSel', (s) => s.value), bench: await p.$eval('#benchSel', (s) => s.value) };
    r.edgesBefore = await L.edges(p, 'perf', 'perfTip');
    r.legendBefore = await p.$eval('#perfLegend', (x) => x.textContent);
    await L.zoomIdx(p, 'perf', 'perfTip', D, d0, d1);
    r.chip = await L.chip(p, 'perfZoom'); r.edges = await L.edges(p, 'perf', 'perfTip');
    const w = L.windowOf(D, r.edges); r.win = w;
    r.dump = await L.dump(p, 'perf');
    r.tips = (await L.sweep(p, 'perf', 'perfTip', w.length, w.map((_, i) => i))).map(([i, t]) => [w[i], t]);
    r.legend = await p.$eval('#perfLegend', (x) => x.textContent);
    r.errs = p.errs; await p.context().close(); R[name] = r;
    console.log(name, r.group, r.bench, r.chip, r.edges, 'errs', p.errs.length);
  };
  await run('C1_US_settori', { perfDays: 504 }, 'prices.json', '2025-03-03', '2025-06-30');
  await run('C3_US_3w', { perfDays: 126 }, 'prices.json', '2026-10-15', '2026-11-04');
  fs.writeFileSync('out/perf.json', JSON.stringify(R));
  await b.close();
})();
