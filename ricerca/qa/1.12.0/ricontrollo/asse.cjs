// Ricontrollo 1.12.0: linea del tempo dei massimi (#pkPanel, vista 0) a tutte le larghezze.
// Per ogni larghezza e tema: sovrapposizioni fra testi SVG (tolleranza 1 px), testi fuori dall'SVG,
// scorrimento orizzontale della pagina, formato (largo/stretto) coerente con la soglia, errori in console.
// Uso: BASE=http://127.0.0.1:8794/ OUT=asse-523e952.json NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/ricontrollo/asse.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
const OUT = path.join(__dirname, process.env.OUT || 'asse.json');
const ONLY = process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : null;
const widths = ONLY || [...new Set([...Array.from({ length: 55 }, (_, i) => 360 + 20 * i), 390, 768, 1024, 1280])].sort((a, b) => a - b);
const TOL = 1;

// misura nella pagina: tutti i <text> degli SVG di #pkPanel, in coordinate dello schermo
async function measure(p) {
  return p.evaluate((TOL) => {
    const svgs = [...document.querySelectorAll('#pkPanel svg')];
    const texts = [];
    const out = [];
    const fmt = [];
    svgs.forEach((svg, si) => {
      const sr = svg.getBoundingClientRect();
      const vbW = svg.viewBox.baseVal.width;
      // formato atteso dalla larghezza attuale dell'SVG (stessa formula di chartWidth in js/format.js e soglia di drawEpisode)
      const w = sr.width, cw = Math.round(Math.max(280, Math.min(1400, w * (w < 1000 ? 1 : 1.15))));
      fmt.push({ si, nar: svg.classList.contains('nar'), vbW, cssW: +w.toFixed(1), expW: cw, expNar: cw - 118 - 315 < 520 });
      svg.querySelectorAll('text').forEach((t) => {
        if (!t.textContent.trim()) return;
        const r = t.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const o = { si, cls: t.getAttribute('class'), txt: t.textContent, l: r.left, r: r.right, t: r.top, b: r.bottom };
        texts.push(o);
        if (r.left < sr.left - TOL || r.right > sr.right + TOL || r.top < sr.top - TOL || r.bottom > sr.bottom + TOL)
          out.push(`svg${si} «${o.txt}» [${r.left.toFixed(1)}..${r.right.toFixed(1)} × ${r.top.toFixed(1)}..${r.bottom.toFixed(1)}] fuori da [${sr.left.toFixed(1)}..${sr.right.toFixed(1)} × ${sr.top.toFixed(1)}..${sr.bottom.toFixed(1)}]`);
      });
    });
    const ov = [];
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      const dx = Math.min(a.r, b.r) - Math.max(a.l, b.l), dy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (dx > TOL && dy > TOL) ov.push(`svg${a.si} «${a.txt}» × svg${b.si} «${b.txt}» (${dx.toFixed(1)}×${dy.toFixed(1)} px)`);
    }
    const de = document.documentElement;
    return { nSvg: svgs.length, nText: texts.length, ov, out, fmt, sw: de.scrollWidth, cw: de.clientWidth, bsw: document.body.scrollWidth };
  }, TOL);
}

function verdict(m) {
  const fmtBad = m.fmt.filter((f) => f.nar !== f.expNar || f.vbW !== f.expW);
  return { ok: m.nSvg > 0 && m.nText > 0 && !m.ov.length && !m.out.length && m.sw <= m.cw && !fmtBad.length, fmtBad };
}

async function load(b, vw, theme, errs) {
  const mob = vw < 500;
  const c = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob });
  await c.addInitScript((theme) => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', theme); } catch {} }, theme);
  const p = await c.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
  p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  p.on('requestfailed', (r) => errs.push(`requestfailed: ${r.url()} ${r.failure() && r.failure().errorText}`));
  p.on('response', (r) => { if (r.status() >= 400) errs.push(`http ${r.status()}: ${r.url()}`); });
  await p.goto(BASE + '#ath', { waitUntil: 'load' });
  await p.waitForSelector('#pkBody .pkep svg .pkdot', { timeout: 30000 });
  await p.waitForTimeout(400);
  return { c, p };
}

(async () => {
  const b = await chromium.launch();
  const res = [];
  const jobs = [];
  for (const theme of ['dark', 'light']) for (const vw of widths) jobs.push({ vw, theme });
  let k = 0;
  async function worker() {
    while (k < jobs.length) {
      const { vw, theme } = jobs[k++];
      const errs = [];
      try {
        const { c, p } = await load(b, vw, theme, errs);
        const m = await measure(p);
        const themeAttr = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
        const v = verdict(m);
        res.push({ vw, theme, themeAttr, mobile: vw < 500, ...m, errs, ok: v.ok && !errs.length, fmtBad: v.fmtBad });
        await c.close();
      } catch (e) { res.push({ vw, theme, ok: false, fatal: String(e), errs }); }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  res.sort((a, b) => a.theme.localeCompare(b.theme) || a.vw - b.vw);

  // ridimensionamento: 1440 → 800 → 400 → 1440 nella stessa pagina (solo se si controllano tutte le larghezze)
  const rs = [];
  if (!ONLY) for (const theme of ['dark', 'light']) {
    const errs = [];
    const { c, p } = await load(b, 1440, theme, errs);
    for (const vw of [1440, 800, 400, 1440]) {
      if (vw !== 1440 || rs.filter((r) => r.theme === theme).length) { await p.setViewportSize({ width: vw, height: 900 }); await p.waitForTimeout(500); }
      const m = await measure(p);
      const v = verdict(m);
      rs.push({ theme, vw, nar: [...new Set(m.fmt.map((f) => f.nar))], vbW: [...new Set(m.fmt.map((f) => f.vbW))], expW: [...new Set(m.fmt.map((f) => f.expW))], ov: m.ov, out: m.out, sw: m.sw, cw: m.cw, fmtBad: v.fmtBad, ok: v.ok });
    }
    rs.filter((r) => r.theme === theme).forEach((r) => (r.errs = errs.slice()));
    await c.close();
  }
  await b.close();
  fs.writeFileSync(OUT, JSON.stringify({ base: BASE, tol: TOL, res, rs }, null, 1));
  for (const r of res) console.log(`${r.theme.padEnd(5)} ${String(r.vw).padStart(4)}${r.mobile ? 'm' : ' '} ${r.ok ? 'OK ' : 'KO '} tema=${r.themeAttr} svg=${r.nSvg} testi=${r.nText} formato=${r.fmt ? [...new Set(r.fmt.map((f) => (f.nar ? 'stretto' : 'largo')))].join('/') : '?'} W=${r.fmt ? [...new Set(r.fmt.map((f) => f.vbW))].join('/') : '?'} scroll=${r.sw}/${r.cw} sovrapp=${r.ov ? r.ov.length : '?'} fuori=${r.out ? r.out.length : '?'} err=${r.errs.length}${r.fatal ? ' FATALE ' + r.fatal : ''}${r.ov && r.ov.length ? '\n      ' + r.ov.slice(0, 4).join('\n      ') : ''}${r.out && r.out.length ? '\n      ' + r.out.slice(0, 3).join('\n      ') : ''}${r.errs.length ? '\n      ' + r.errs.slice(0, 3).join('\n      ') : ''}${r.fmtBad && r.fmtBad.length ? '\n      formato inatteso: ' + JSON.stringify(r.fmtBad[0]) : ''}`);
  for (const r of rs) console.log(`ridimensiona ${r.theme} → ${r.vw}: ${r.ok && !r.errs.length ? 'OK' : 'KO'} formato=${r.nar.map((n) => (n ? 'stretto' : 'largo'))} W=${r.vbW} atteso=${r.expW} sovrapp=${r.ov.length} fuori=${r.out.length} scroll=${r.sw}/${r.cw} err=${r.errs.length}${r.ov.length ? ' ' + r.ov.slice(0, 2).join('; ') : ''}`);
  const bad = res.filter((r) => !r.ok).length + rs.filter((r) => !r.ok || r.errs.length).length;
  console.log(`\nTOTALE: ${res.length} caricamenti, ${rs.length} passi di ridimensionamento, ${bad} con problemi`);
})();
