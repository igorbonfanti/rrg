// Strumenti comuni: apertura dell'app, trascinamento a date precise, lettura del DOM dei grafici
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const DAY = 864e5;
async function launch() { return chromium.launch(); }
async function page(b, ls = {}, vp = { width: 1440, height: 900 }) {
  const c = await b.newContext({ viewport: vp });
  await c.addInitScript((ls) => { try { if (sessionStorage.getItem('qa')) return; sessionStorage.setItem('qa', '1'); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); for (const [k, v] of Object.entries(ls)) localStorage.setItem('sm.' + k, JSON.stringify(v)); } catch {} }, ls);
  const p = await c.newPage();
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  return p;
}
async function go(p, hash, svg) {
  await p.goto(BASE + '#' + hash);
  await p.waitForSelector(`#${svg} rect.frame`, { timeout: 40000, state: 'attached' });
  await p.waitForTimeout(800);
  await p.locator('#' + svg).scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
}
// geometria: primo riquadro in unità SVG e matrice verso lo schermo
const geo = (p, svg) => p.$eval('#' + svg, (s) => {
  const fr = [...s.querySelectorAll('rect.frame')].map((r) => ({ x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') }));
  const m = s.getScreenCTM();
  return { fr, a: m.a, d: m.d, e: m.e, f: m.f, L: fr[0].x, PW: fr[0].w };
});
const cx = (g, x) => g.a * x + g.e, cy = (g, y) => g.d * y + g.f;
async function tipAt(p, svg, tip, x, yS) {
  const g = await geo(p, svg);
  const y = yS != null ? yS : g.fr[0].y + g.fr[0].h / 2;
  await p.mouse.move(cx(g, x), cy(g, y)); await p.waitForTimeout(25);
  return p.$eval('#' + tip, (t) => (t.hidden ? null : [...t.querySelectorAll('.row')].map((r) => [...r.children].map((c) => c.textContent.trim()))));
}
async function drag(p, svg, xa, xb) {
  const g = await geo(p, svg), y = cy(g, g.fr[0].y + g.fr[0].h / 2);
  await p.mouse.move(cx(g, xa), y); await p.mouse.down();
  await p.mouse.move((cx(g, xa) + cx(g, xb)) / 2, y, { steps: 5 }); await p.mouse.move(cx(g, xb), y, { steps: 5 });
  await p.mouse.up(); await p.waitForTimeout(500);
}
// zoom per seduta: dates = calendario della serie del grafico; prima legge le date ai bordi del grafico
async function edges(p, svg, tip) {
  const g = await geo(p, svg);
  const l = await tipAt(p, svg, tip, g.L + 0.01), r = await tipAt(p, svg, tip, g.L + g.PW - 0.01);
  await p.mouse.move(0, 0);
  return [l && l[0][0], r && r[0][0]];
}
const iso = (s) => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`;
function windowOf(dates, e) { const a = dates.indexOf(iso(e[0])), b = dates.indexOf(iso(e[1])); return dates.slice(a, b + 1); }
async function zoomIdx(p, svg, tip, dates, d0, d1) {
  const e = await edges(p, svg, tip), w = windowOf(dates, e), g = await geo(p, svg);
  const xi = (d) => { let i = w.findIndex((x) => x >= d); if (i < 0) i = w.length - 1; return g.L + (i / (w.length - 1)) * g.PW; };
  await drag(p, svg, xi(d0), xi(d1));
  return { before: e, n: w.length };
}
// zoom per data: t0, t1 della finestra in millisecondi
async function zoomTime(p, svg, t0, t1, d0, d1) {
  const g = await geo(p, svg), xt = (d) => g.L + ((Date.parse(d) - t0) / (t1 - t0)) * g.PW;
  await drag(p, svg, xt(d0), xt(d1));
}
const chip = (p, id) => p.$eval('#' + id, (e) => (e.hidden ? null : e.querySelector('span').textContent)).catch(() => 'MANCA');
// tutto il disegno: percorsi, rettangoli, cerchi, testi con le loro classi
const dump = (p, svg) => p.$eval('#' + svg, (s) => {
  const pts = (d) => [...(d || '').matchAll(/([MLZ])\s*(-?[\d.]+)?[ ,]?(-?[\d.]+)?/g)].filter((m) => m[1] !== 'Z').map((m) => [m[1], +m[2], +m[3]]);
  const out = { paths: [], rects: [], circles: [], texts: [], vb: s.getAttribute('viewBox') };
  for (const e of s.querySelectorAll('path')) if (!e.closest('defs')) out.paths.push({ cls: e.getAttribute('class') || '', pts: pts(e.getAttribute('d')) });
  for (const e of s.querySelectorAll('rect')) if (!e.closest('defs')) out.rects.push({ cls: e.getAttribute('class') || '', x: +e.getAttribute('x'), y: +e.getAttribute('y'), w: +e.getAttribute('width'), h: +e.getAttribute('height') });
  for (const e of s.querySelectorAll('circle')) out.circles.push({ cls: e.getAttribute('class') || '', x: +e.getAttribute('cx'), y: +e.getAttribute('cy'), vis: e.getAttribute('visibility') });
  for (const e of s.querySelectorAll('text')) out.texts.push({ cls: e.getAttribute('class') || '', x: +e.getAttribute('x'), y: +e.getAttribute('y'), anchor: e.getAttribute('text-anchor'), t: e.textContent });
  for (const e of s.querySelectorAll('line')) (out.lines = out.lines || []).push({ cls: e.getAttribute('class') || '', x1: +e.getAttribute('x1'), x2: +e.getAttribute('x2'), y1: +e.getAttribute('y1'), y2: +e.getAttribute('y2') });
  return out;
});
// riquadro a ogni seduta della finestra (grafici per seduta)
async function sweep(p, svg, tip, n, idxs) {
  const g = await geo(p, svg), out = [];
  if (idxs.length) { await tipAt(p, svg, tip, g.L + (idxs[0] / Math.max(1, n - 1)) * g.PW + 0.3); }
  for (const i of idxs) out.push([i, await tipAt(p, svg, tip, Math.max(g.L + Math.min(0.2, 0.4 * g.PW / Math.max(1, n - 1)), Math.min(g.L + g.PW - Math.min(0.2, 0.4 * g.PW / Math.max(1, n - 1)), g.L + (i / Math.max(1, n - 1)) * g.PW)))]);
  await p.mouse.move(0, 0);
  return out;
}
module.exports = { cx, cy, launch, page, go, geo, tipAt, drag, edges, zoomIdx, zoomTime, chip, dump, sweep, iso, windowOf, DAY, BASE };
