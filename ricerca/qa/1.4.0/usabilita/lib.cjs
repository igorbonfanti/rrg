// Aiuti comuni dei controlli di usabilità 1.4.0 (scritti dal controllore, indipendenti da ricerca/qa/browser/v140.cjs)
const { chromium, devices } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
const OLD = process.env.OLD || 'http://127.0.0.1:8795/';
const SHOTS = path.join(__dirname, 'shots');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail !== undefined ? ' · ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}
function summary(tag) {
  const f = results.filter((r) => !r.ok);
  console.log(`\n== ${tag}: ${results.length - f.length}/${results.length} passano`);
  f.forEach((r) => console.log('  FAIL ' + r.name + ' · ' + JSON.stringify(r.detail)));
  require('fs').writeFileSync(path.join(__dirname, `esito-${tag}.json`), JSON.stringify(results, null, 1));
}

async function open(browser, { width = 1440, height = 900, theme = 'dark', mobile = false, hash = '', base = BASE, intro = false, route } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent }
    : { viewport: { width, height } });
  await ctx.addInitScript(([t, intro]) => {
    try { if (!sessionStorage.getItem('qa-init')) { localStorage.setItem('antigravity-theme', t); sessionStorage.setItem('qa-init', '1'); } } catch {}
  }, [theme, intro]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  if (route) await route(page);
  await page.goto(base + (hash ? '#' + hash : ''), { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('loadingNote') && document.getElementById('loadingNote').hidden, null, { timeout: 30000 });
  return { ctx, page, errors, reqs };
}
async function waitEmg(page, timeout = 30000) {
  await page.waitForFunction(() => {
    const b = document.getElementById('emBody'), l = document.getElementById('emLoading');
    return (b && !b.hidden && document.querySelector('#emTable tbody tr')) || (l && !l.hidden && /non disponibil/.test(l.textContent));
  }, null, { timeout });
}
async function hscroll(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const over = [];
    if (de.scrollWidth > de.clientWidth + 1) {
      document.querySelectorAll('body *').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.width && r.right > de.clientWidth + 1 && !e.closest('.tscroll') && getComputedStyle(e).position !== 'fixed') over.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + e.className).slice(0, 60) + ' r=' + Math.round(r.right));
      });
    }
    return { sw: de.scrollWidth, cw: de.clientWidth, over: over.slice(0, 8) };
  });
}
// testo tagliato: elementi visibili con overflow nascosto e contenuto più largo del riquadro
async function clipped(page, sel) {
  return page.evaluate((sel) => {
    const out = [];
    document.querySelectorAll(sel).forEach((e) => {
      if (!e.offsetParent) return;
      const cs = getComputedStyle(e);
      if (e.scrollWidth > e.clientWidth + 1 && (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis')) out.push((e.id || e.className || e.tagName) + ': ' + e.textContent.trim().slice(0, 40));
    });
    return out;
  }, sel);
}
module.exports = { chromium, BASE, OLD, SHOTS, check, summary, open, waitEmg, hscroll, clipped, results };
