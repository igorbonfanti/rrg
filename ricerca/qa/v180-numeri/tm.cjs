// grafici per data: Emergenti e VIX
const ROOT = require('path').resolve(__dirname, '../../..') + '/';
const L = require('./lib.cjs');
const fs = require('fs');
const DAY = 864e5;
const decode = (x) => { const out = [x.d0]; let t = Date.parse(x.d0); for (const ch of x.gaps) { t += parseInt(ch, 36) * DAY; out.push(new Date(t).toISOString().slice(0, 10)); } return out; };
const IX = { ...JSON.parse(fs.readFileSync(ROOT + 'data/indices.json')).series, ...JSON.parse(fs.readFileSync(ROOT + 'data/indices_more.json')).series };
const VX = JSON.parse(fs.readFileSync(ROOT + 'data/vix.json')).series;
(async () => {
  const b = await L.launch(), R = {};
  const sweepT = async (p, svg, tip, t0, t1, ds) => {
    const g = await L.geo(p, svg), out = [];
    if (ds.length) await L.tipAt(p, svg, tip, g.L + ((Date.parse(ds[0]) - t0) / (t1 - t0)) * g.PW + 0.5);
    for (const d of ds) out.push([d, await L.tipAt(p, svg, tip, Date.parse(d) >= t1 ? g.L + g.PW + 3 : g.L + ((Date.parse(d) + 0.3 * DAY - t0) / (t1 - t0)) * g.PW)]);
    await p.mouse.move(0, 0); return out;
  };
  const span = { '3A': 3, '10A': 10, MAX: null };
  const run = async (name, view, svg, tip, chipId, ls, D, d0, d1, after) => {
    const p = await L.page(b, ls);
    await L.go(p, view, svg);
    const range = ls.emRange || ls.vxRange, tEnd = Date.parse(D.at(-1));
    const t0 = span[range] ? Math.max(Date.parse(D[0]), tEnd - span[range] * 365.25 * DAY) : Date.parse(D[0]);
    const r = { t0, t1: tEnd };
    const inb = D.filter((d) => d >= d0 && d <= d1);
    r.tipsBefore = await sweepT(p, svg, tip, t0, tEnd, inb);
    r.dumpBefore = await L.dump(p, svg);
    await L.zoomTime(p, svg, t0, tEnd, d0, d1);
    r.chip = await L.chip(p, chipId);
    const m = r.chip && r.chip.match(/dal (\S+) al (\S+)/);
    if (m) {
      const z0 = Date.parse(L.iso(m[1])), z1 = Date.parse(L.iso(m[2]));
      r.z = [L.iso(m[1]), L.iso(m[2])];
      const g = await L.geo(p, svg);
      r.edgeL = await L.tipAt(p, svg, tip, g.L + 0.01); r.edgeR = await L.tipAt(p, svg, tip, g.L + g.PW + 3);
      r.dump = await L.dump(p, svg);
      r.tips = await sweepT(p, svg, tip, z0, z1, D.filter((d) => d >= r.z[0] && d <= r.z[1]));
      // seduta più vicina: al 40% e al 60% tra due sedute consecutive del tratto
      { const ds = D.filter((d) => d >= r.z[0] && d <= r.z[1]), g2 = await L.geo(p, svg), xs = (t) => g2.L + ((t - z0) / (z1 - z0)) * g2.PW; r.mid = [];
        const step = Math.max(1, Math.floor(ds.length / 40));
        for (let k = 0; k + 1 < ds.length; k += step) { const a = Date.parse(ds[k]), b2 = Date.parse(ds[k + 1]);
          r.mid.push([ds[k], await L.tipAt(p, svg, tip, xs(a + 0.4 * (b2 - a)))]); r.mid.push([ds[k + 1], await L.tipAt(p, svg, tip, xs(a + 0.6 * (b2 - a)))]); } }
      if (view.startsWith('emg')) r.meta = await p.$eval('#emChartMeta', (x) => x.textContent);
      if (after) await after(p, r, z0, z1);
    }
    r.errs = p.errs; await p.context().close(); R[name] = r;
    console.log(name, r.chip, 'errs', p.errs.length);
  };
  const NI = decode(IX.NIFTY50), SPX = decode(VX.SPX), KO = decode(IX.KOSPI200), EEM = decode(IX.EEM);
  await run('D1_NIFTY_2025', 'emg-NIFTY50', 'emChart', 'emTip', 'emZoom', { emRange: '3A' }, NI, '2025-01-02', '2025-04-30');
  await run('D2_NIFTY_MLK', 'emg-NIFTY50', 'emChart', 'emTip', 'emZoom', { emRange: '3A' }, NI, '2025-01-20', '2025-03-14');
  await run('D3_KOSPI_3w', 'emg-KOSPI200', 'emChart', 'emTip', 'emZoom', { emRange: '3A' }, KO, '2026-10-15', '2026-11-04');
  await run('D4_EEM_2020', 'emg-EEM', 'emChart', 'emTip', 'emZoom', { emRange: '10A' }, EEM, '2020-02-03', '2020-06-30');
  await run('E1_VIX_2020', 'vix', 'vxChart', 'vxTip', 'vxZoom', { vxRange: '10A' }, SPX, '2020-02-03', '2020-04-30');
  await run('E2_VIX_3w', 'vix', 'vxChart', 'vxTip', 'vxZoom', { vxRange: '3A' }, SPX, '2026-10-15', '2026-11-04');
  await run('E3_VIX_MAX_2008', 'vix', 'vxChart', 'vxTip', 'vxZoom', { vxRange: 'MAX' }, SPX, '2007-06-01', '2009-06-30', async (p, r) => {
    await p.click('#vxIx button[data-ix="NDX"]'); await p.waitForTimeout(500);
    r.ndxChip = await L.chip(p, 'vxZoom'); r.ndxDump = await L.dump(p, 'vxChart');
  });
  fs.writeFileSync('out/tm.json', JSON.stringify(R));
  await b.close();
})();
