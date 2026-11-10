const L = require('./lib.cjs');
const ROOT = require('path').resolve(__dirname, '../../..') + '/';
const fs = require('fs');
const IX = { ...JSON.parse(fs.readFileSync(ROOT + 'data/indices.json')).series, ...JSON.parse(fs.readFileSync(ROOT + 'data/indices_more.json')).series };
const dts = (k) => { const x = IX[k], out = [x.d0]; let t = Date.parse(x.d0); for (const ch of x.gaps) { t += parseInt(ch, 36) * 864e5; out.push(new Date(t).toISOString().slice(0, 10)); } return out; };
(async () => {
  const b = await L.launch(), R = {};
  const grab = async (p, k, full) => {
    const D = dts(k);
    await p.locator('#ixTs').scrollIntoViewIfNeeded();
    const x = { k, chip: await L.chip(p, 'ixTsZoom'), capChip: await L.chip(p, 'ixCapZoom'), edges: await L.edges(p, 'ixTs', 'ixTsTip'), dump: await L.dump(p, 'ixTs') };
    const w = L.windowOf(D, x.edges); x.win = w;
    const ids = full ? w.map((_, i) => i) : [0, 1, 2, Math.floor(w.length / 2), w.length - 2, w.length - 1];
    x.tips = (await L.sweep(p, 'ixTs', 'ixTsTip', w.length, ids)).map(([i, t]) => [w[i], t]);
    await p.locator('#ixCapSvg').scrollIntoViewIfNeeded();
    x.capEdges = await L.edges(p, 'ixCapSvg', 'ixCapTip'); x.cap = await L.dump(p, 'ixCapSvg');
    x.capTips = (await L.sweep(p, 'ixCapSvg', 'ixCapTip', w.length, ids)).map(([i, t]) => [w[i], t]);
    await p.locator('#ixTs').scrollIntoViewIfNeeded();
    return x;
  };
  const run = async (name, k0, range, d0, d1, others) => {
    const p = await L.page(b, { ixSel: k0, ixRange: range });
    await L.go(p, 'idx', 'ixTs');
    await p.evaluate(() => { const c = document.getElementById('ixCap'); if (c) c.open = true; });
    await p.waitForSelector('#ixCapSvg rect.frame', { timeout: 30000 }); await p.waitForTimeout(600);
    await p.locator('#ixTs').scrollIntoViewIfNeeded();
    const r = { range, before: { edges: await L.edges(p, 'ixTs', 'ixTsTip'), dump: await L.dump(p, 'ixTs') } };
    // riquadri senza zoom nelle sedute del tratto
    const D = dts(k0), wb = L.windowOf(D, r.before.edges), i0 = wb.indexOf(d0), i1 = wb.indexOf(d1);
    if (i0 >= 0) { const ids = []; for (let i = i0; i <= i1; i++) ids.push(i); r.before.tips = (await L.sweep(p, 'ixTs', 'ixTsTip', wb.length, ids)).map(([i, t]) => [wb[i], t]); }
    await L.zoomIdx(p, 'ixTs', 'ixTsTip', D, d0, d1);
    r.main = await grab(p, k0, true);
    r.after = [];
    for (const k of others) {
      const has = await p.$(`#ixChips button[data-ix="${k}"]`);
      if (!has) { r.after.push({ k, missing: true }); continue; }
      await p.click(`#ixChips button[data-ix="${k}"]`); await p.waitForTimeout(800);
      r.after.push(await grab(p, k, true));
    }
    r.errs = p.errs; await p.context().close(); R[name] = r;
    console.log(name, r.main.chip, r.after.map((x) => `${x.k}: ${x.chip} ${x.edges}`).join(' | '), 'errs', p.errs.length);
  };
  await run('B1_SPX_N225_DAX_2024', 'SPX', '3A', '2024-07-01', '2024-09-30', ['N225', 'DAX', 'FTSEMIB']);
  await run('B2_SPX_10A_3w', 'SPX', '10A', '2025-12-15', '2026-01-09', ['N225']);
  await run('B3_N225_MAX_2008', 'N225', 'MAX', '2008-09-01', '2009-03-31', ['SPX']);
  fs.writeFileSync('out/ix.json', JSON.stringify(R));
  await b.close();
})();
