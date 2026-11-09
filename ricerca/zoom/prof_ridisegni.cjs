// Tempi di ridisegno dei grafici con il tempo in ascissa (profilatore CPU di Chromium, 5 clic per caso).
// Uso: python3 -m http.server 8791 --bind 127.0.0.1 (dalla radice del sito), poi NODE_PATH=$(npm root -g) node ricerca/zoom/prof_ridisegni.cjs
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8791/';
const FN = ['drawSector', 'drawCap', 'card', 'renderSector', 'renderDetail', 'drawChart', 'renderChart', 'render', 'renderKpis', 'renderTable', 'renderScatter', 'drawPerf', 'renderPerf', 'drawHist', 'drawSpread', 'drawBubble', 'renderEpisodes', 'renderMembers', 'renderBoard', 'renderMap'];
function incl(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  profile.samples.forEach((id, k) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[k] || 0)));
  const memo = new Map();
  const tot = (id) => { if (memo.has(id)) return memo.get(id); const n = byId.get(id); let t = self.get(id) || 0; for (const c of n.children || []) t += tot(c); memo.set(id, t); return t; };
  const out = {};
  // inclusive per function name, without double counting nested same-name frames
  const walk = (id, inside) => { const n = byId.get(id), f = n.callFrame.functionName; const key = FN.includes(f) ? f + '@' + n.callFrame.url.split('/').pop() : null; const add = key && !inside.has(key); if (add) out[key] = (out[key] || 0) + tot(id); const s = add ? new Set([...inside, key]) : inside; for (const c of n.children || []) walk(c, s); };
  walk(profile.nodes[0].id, new Set());
  return out;
}
(async () => {
  const b = await chromium.launch();
  for (const [vp, mob] of [[{ width: 1440, height: 900 }, false], [{ width: 390, height: 844 }, true]]) {
    const c = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage();
    const cdp = await c.newCDPSession(p);
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 50 });
    const cases = [
      ['#XLK', '#ts path.px', '#rangeSeg button', ['3A', 'MAX', '10A']],
      ['#idx', '#ixTs path.px', '#ixRange button', ['3A', 'MAX', '10A']],
      ['#emg', '#emChart path', '#emRange button', ['3A', 'MAX', '10A']],
      ['#vix', '#vxChart path.vxvix', '#vxRange button', ['3A', 'MAX', '10A']],
      ['#rrg', '#perf path', '#perfSeg button', ['63', '504', '126']],
      ['#tit', '#titHist path', '#titPerSeg button', ['1M', '1A', '3M']],
    ];
    for (const [hash, sel, btn, vals] of cases) {
      await p.goto(BASE + hash); await p.waitForSelector(sel, { timeout: 60000 }); await p.waitForTimeout(800);
      const attr = btn.includes('perfSeg') ? 'data-days' : btn.includes('titPer') ? 'data-per' : 'data-range';
      for (const v of vals) {
        const R = 5; const wall = [];
        await cdp.send('Profiler.start');
        for (let r = 0; r < R; r++) {
          wall.push(await p.evaluate(([s, a, v]) => { const b = document.querySelector(`${s}[${a}="${v}"]`); if (!b) return -1; const t = performance.now(); b.click(); return performance.now() - t; }, [btn, attr, v]));
        }
        const { profile } = await cdp.send('Profiler.stop');
        const I = incl(profile);
        const nodes = await p.evaluate((s) => document.querySelector(s).ownerSVGElement ? document.querySelector(s).ownerSVGElement.querySelectorAll('*').length : 0, sel);
        console.log(`${vp.width} ${hash} ${v}: click medio ${(wall.reduce((a, x) => a + x, 0) / R).toFixed(1)} ms · nodi SVG ${nodes} · ` + Object.entries(I).map(([k, t]) => `${k} ${(t / 1000 / R).toFixed(1)}`).join(', '));
      }
    }
    await c.close();
  }
  await b.close();
})();
