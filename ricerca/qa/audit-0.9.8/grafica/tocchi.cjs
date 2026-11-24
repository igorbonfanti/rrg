// Audit 0.9.8: tocchi sui grafici del telefono (390×844). Per ogni grafico: tocco dentro l'area dei dati vicino al bordo
// destro (ultima seduta) e nel margine delle etichette; registra data del tooltip, linea verticale e linea gemella.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
const OUT = process.env.OUT || '/tmp/a098/';
fs.mkdirSync(OUT + 'int', { recursive: true });
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', 'dark'); localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('sm.opened', JSON.stringify({ secEpi: true, secCap: true, ixEpi: true, ixCap: true })); } } catch {} });
  const page = await ctx.newPage();
  const out = [];
  const probe = async (svg, tip, twin, label) => {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), svg);
    await page.waitForTimeout(300);
    // area dei dati: il rettangolo trasparente che riceve i tocchi (ultimo rect con fill transparent)
    const g = await page.evaluate((id) => {
      const s = document.getElementById(id), r = s.getBoundingClientRect();
      const hit = [...s.querySelectorAll('rect')].filter((x) => x.getAttribute('fill') === 'transparent' || getComputedStyle(x).fill === 'rgba(0, 0, 0, 0)').pop();
      const h = hit ? hit.getBoundingClientRect() : null;
      return { svg: [r.left, r.top, r.width, r.height], hit: h ? [h.left, h.top, h.width, h.height] : null };
    }, svg);
    const pts = g.hit ? [['ultima seduta (2 px dal bordo)', g.hit[0] + g.hit[2] - 2], ['margine etichette', g.svg[0] + g.svg[2] - 8]] : [['90%', g.svg[0] + g.svg[2] * 0.9]];
    for (const [where, x] of pts) {
      const y = g.hit ? g.hit[1] + g.hit[3] * 0.3 : g.svg[1] + g.svg[3] * 0.4;
      await page.touchscreen.tap(x, y); await page.waitForTimeout(350);
      const st = await page.evaluate(([svg, tip, twin]) => {
        const t = document.getElementById(tip), xh = document.querySelector(`#${svg} line.xhair`), xz = twin ? document.querySelector(`#${twin} line.xhair`) : null;
        return { tip: !t.hidden, txt: t.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), xh: xh ? xh.getAttribute('visibility') : null, twin: xz ? xz.getAttribute('visibility') : null };
      }, [svg, tip, twin]);
      out.push({ label, where, hitW: g.hit && Math.round(g.hit[2]), svgW: Math.round(g.svg[2]), ...st });
    }
    await page.touchscreen.tap(5, 5); await page.waitForTimeout(200);
  };
  await page.goto(BASE + '#XLU'); await page.waitForTimeout(2500);
  await probe('ts', 'tsTip', 'secCapSvg', 'Settore prezzo');
  await probe('secCapSvg', 'secCapTip', 'ts', 'Settore cali forti');
  await page.goto(BASE + '#idx'); await page.waitForTimeout(4500);
  await probe('ixTs', 'ixTsTip', 'ixCapSvg', 'Indice prezzo');
  await probe('ixCapSvg', 'ixCapTip', 'ixTs', 'Indice cali forti');
  await page.goto(BASE + '#rrg'); await page.waitForTimeout(2500);
  await probe('perf', 'perfTip', null, 'Performance relativa');
  await page.goto(BASE + '#tit-XLK'); await page.waitForTimeout(4500);
  await probe('titHist', 'titHistTip', null, 'Storia della divergenza');
  fs.writeFileSync(OUT + 'tocchi.json', JSON.stringify(out, null, 1));
  console.log(out.map((o) => JSON.stringify(o)).join('\n'));
  await b.close();
})();
