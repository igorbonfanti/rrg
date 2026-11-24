// Funzioni comuni dei controlli della vista 8 (vista2): apertura con tema, raccolta degli errori, contrasto.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
const SHOTS = __dirname + '/shots/';
async function openPage(browser, { width = 1440, height = 900, theme = 'light', touch = false, hash = '#emg', intro = true, url = BASE } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await ctx.addInitScript(([t, i]) => { try { localStorage.setItem('antigravity-theme', t); if (i) localStorage.setItem('sm.introSeen', 'true'); } catch {} }, [theme, intro]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`http ${r.status()}: ${r.url()}`); });
  await page.goto(url + hash, { waitUntil: 'load' });
  return { ctx, page, errs };
}
async function waitEmg(page) {
  await page.waitForSelector('#emTable tbody tr[data-em]', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#emChart path.emloc'));
  await page.waitForTimeout(200);
}
// rapporto di contrasto WCAG tra due colori css rgb()/rgba() (alpha composto sul fondo)
function parse(c) { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; }
function over(fg, bg, a = fg.a) { return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; }
function lum({ r, g, b }) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function contrast(fg, bg) { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
module.exports = { chromium, BASE, SHOTS, openPage, waitEmg, parse, over, contrast };
