// Linea che inizia dopo l'inizio del tratto: MWEQ.MI (quotato dal 07/10/2024) con drawPerf e uno zoom vero (zoomGroup),
const ROOT = require('path').resolve(__dirname, '../../..') + '/';
// periodo di 600 sedute (oltre i pulsanti dell'app, che arrivano a 504: con i dati di oggi il caso non si raggiunge dall'interfaccia)
const L = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const b = await L.launch(); const p = await L.page(b, {});
  await L.go(p, 'rrg', 'perf');
  const info = await p.evaluate(async () => {
    const { drawPerf } = await import('/js/perf-chart.js'); const { zoomGroup } = await import('/js/zoom.js');
    const G = await (await fetch('/data/prices_global.json')).json();
    const grp = G.groups['2 · Fattori'];
    const wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;width:900px;background:#fff'; wrap.className = 'chart-wrap';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'qaPerf'; svg.setAttribute('class', 'perf'); svg.style.width = '900px';
    const tip = document.createElement('div'); tip.id = 'qaTip'; tip.className = 'tip'; tip.hidden = true;
    const leg = document.createElement('div'); leg.id = 'qaLeg';
    wrap.append(svg, tip); document.body.prepend(wrap, leg);
    const z = zoomGroup('qa', { onChange: () => {} }); z.range = ['2024-09-02', '2024-12-31'];
    const bench = 'SWDA.MI';
    const syms = grp.tickers.filter((s) => G.tickers[s] && s !== bench);
    drawPerf(svg, { zoom: z, dates: G.dates, closes: Object.fromEntries(Object.entries(G.tickers).map(([s, t]) => [s, t.close])), syms, bench, focus: null, days: 600, width: 900, tipEl: tip, wrapEl: wrap, legendEl: leg });
    return { syms, bench, legend: leg.textContent, shown: z.shown };
  });
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  const D = JSON.parse(fs.readFileSync(ROOT + 'data/prices_global.json')).dates;
  const e = await L.edges(p, 'qaPerf', 'qaTip'); const w = L.windowOf(D, e);
  info.edges = e; info.win = w;
  info.tips = (await L.sweep(p, 'qaPerf', 'qaTip', w.length, w.map((_, i) => i))).map(([i, t]) => [w[i], t]);
  info.dump = await L.dump(p, 'qaPerf'); info.errs = p.errs;
  fs.writeFileSync('out/perflate.json', JSON.stringify(info));
  console.log(info.legend, info.shown, e);
  await b.close();
})();
