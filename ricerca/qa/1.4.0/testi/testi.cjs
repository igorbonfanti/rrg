// Controllo testi 1.4.0: raccoglie tutti i testi della vista 8 (riquadri, tabella, tooltip, note, legenda, titoli dei
// grafici, riquadro dei valori) a 1440 e 390 px, tema chiaro e scuro, e cerca testi tagliati o sovrapposti.
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/testi/testi.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/', OUT = path.join(__dirname, 'shots');
const res = {};
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, light, touch] of [['1440-scuro', 1440, 900, false, false], ['1440-chiaro', 1440, 900, true, false], ['390-scuro', 390, 844, false, true], ['390-chiaro', 390, 844, true, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
    await ctx.addInitScript(({ light }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, { light });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    const R = res[name] = { errs };
    for (const k of ['KOSPI200', 'EEM', 'HSI', 'IBOV']) {
      await p.goto(BASE + '#emg-' + k); await p.waitForTimeout(3500);
      const t = await p.evaluate(() => {
        const q = (s) => [...document.querySelectorAll(s)];
        const over = q('#v-emg *').filter((e) => { const cs = getComputedStyle(e); if (!e.offsetParent || cs.overflow === 'visible' && cs.textOverflow !== 'ellipsis') return false; return e.scrollWidth > e.clientWidth + 1 && !/tscroll|chart-wrap|emRSWrap/.test(e.className + e.id); }).map((e) => (e.id || e.className) + ': ' + e.innerText.slice(0, 60));
        // testi SVG che escono dal riquadro o si sovrappongono
        const svgOut = [], svgLap = [];
        for (const svg of q('#emChart, #emRS')) {
          const sb = svg.getBoundingClientRect(), tx = [...svg.querySelectorAll('text')].map((e) => ({ e, r: e.getBoundingClientRect(), s: e.textContent }));
          for (const a of tx) if (a.r.width && (a.r.left < sb.left - 1 || a.r.right > sb.right + 1)) svgOut.push(`${svg.id}: «${a.s}» esce di ${Math.round(Math.max(sb.left - a.r.left, a.r.right - sb.right))} px`);
          for (let i = 0; i < tx.length; i++) for (let j = i + 1; j < tx.length; j++) { const a = tx[i].r, c = tx[j].r; if (a.width && c.width && a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) svgLap.push(`${svg.id}: «${tx[i].s}» / «${tx[j].s}»`); }
        }
        // celle con testo che va a capo male o esce dalla cella
        const cellOut = q('#emTable td, #emTable th').filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.className + ': ' + c.innerText.replace(/\n/g, ' ').slice(0, 50));
        const kpiOut = q('#emKpis .kpi span').filter((s) => s.scrollWidth > s.clientWidth + 1 || s.getBoundingClientRect().right > s.closest('.kpi').getBoundingClientRect().right + 1).map((s) => s.innerText.slice(0, 60));
        return {
          kpis: q('#emKpis .kpi').map((k) => ({ testo: k.innerText.replace(/\n/g, ' | '), title: k.title })),
          meta: document.getElementById('emMeta').innerText, miss: document.getElementById('emMiss').hidden ? null : document.getElementById('emMiss').innerText,
          rows: q('#emTable tbody tr').map((tr) => ({ testo: tr.innerText.replace(/\s*\n\s*/g, ' | '), titles: [...tr.querySelectorAll('[title]')].map((e) => e.title) })),
          head: q('#emTable thead th').map((th) => th.innerText.replace(/\n/g, ' ')),
          title: document.getElementById('emTitle').innerText, dmeta: document.getElementById('emState').innerText + ' ' + document.getElementById('emDMeta').innerText,
          btn: document.getElementById('emOpenIx').innerText,
          panes: q('#emChart text.pane-t').map((e) => e.textContent), fxmsg: q('#emChart text.axt').map((e) => e.textContent).filter((s) => /[a-z]{4}/i.test(s)),
          legend: document.getElementById('emLegend').innerText.replace(/\n/g, ' | '), chartMeta: document.getElementById('emChartMeta').parentElement.innerText,
          notes: q('#emNotes li').map((l) => l.innerText), rsMeta: document.getElementById('emRSMeta').innerText, rsTitles: q('#emRS g.emdot title').map((t) => t.textContent),
          over, svgOut, svgLap, cellOut, kpiOut, hscroll: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      R[k] = t;
      // riquadro dei valori: al centro del grafico e su una data FRED mancante
      const box = await p.locator('#emChart').boundingBox();
      if (box) {
        for (const fx of [0.5, 0.995]) {
          const x = box.x + box.width * fx * 0.94, y = box.y + 60;
          if (touch) await p.touchscreen.tap(x, y); else await p.mouse.move(x, y);
          await p.waitForTimeout(300);
          R[k]['tip' + fx] = await p.evaluate(() => { const t = document.getElementById('emTip'); const r = t.getBoundingClientRect(); return { testo: t.innerText.replace(/\n/g, ' | '), fuori: r.right > window.innerWidth + 1 || r.left < -1 }; });
        }
      }
      if (k === 'KOSPI200' || k === 'EEM') await p.screenshot({ path: path.join(OUT, `${name}-${k}.png`), fullPage: true });
    }
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, 'testi.json'), JSON.stringify(res, null, 1));
  for (const [n, R] of Object.entries(res)) for (const k of ['KOSPI200', 'EEM', 'HSI', 'IBOV']) { const t = R[k]; if (!t) continue; console.log(n, k, 'overflow', t.over.length, 'svgOut', t.svgOut.length, 'svgLap', t.svgLap.length, 'celle', t.cellOut.length, 'kpi', t.kpiOut.length, 'hscroll', t.hscroll, 'errori', R.errs.length); }
})();
