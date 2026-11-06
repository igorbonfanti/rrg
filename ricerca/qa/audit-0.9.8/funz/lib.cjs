// libreria comune per i test funzionali (QA funz)
const path = require('path');
const fs = require('fs');
// Playwright globale: NODE_PATH=$(npm root -g) node <script>.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8805/';
// esiti in funz/res/ (nel repository, ramo di sviluppo); screenshot fuori dal repository (SHOTS, di default /tmp)
const OUT = path.join(__dirname, '/');
const RES = OUT + 'res/';
const SHOTS = process.env.SHOTS || '/tmp/sm-audit-098-shots/';
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(RES, { recursive: true });

// versione pubblicata (version.json) per i controlli dell'avviso «Nuova versione» e del numero in alto
const VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'version.json'), 'utf8')).version;

const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 } },
  laptop: { viewport: { width: 1280, height: 720 } },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

async function launch() {
  return chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
}

/**
 * Nuovo contesto + pagina con raccolta errori.
 * opts: theme 'dark'|'light', intro (true = mostra intro), ls: {chiave: valore} da mettere in localStorage al primo avvio
 */
async function open(browser, profile, opts = {}) {
  const ctx = await browser.newContext({ ...PROFILES[profile], locale: 'it-IT', timezoneId: 'Europe/Rome', ...(opts.ctx || {}) });
  const theme = opts.theme || 'dark';
  const ls = { 'antigravity-theme': theme, ...(opts.intro ? {} : { 'sm.introSeen': 'true' }), ...(opts.ls || {}) };
  await ctx.addInitScript(({ ls }) => {
    try {
      if (!sessionStorage.getItem('__qa_init')) {
        sessionStorage.setItem('__qa_init', '1');
        for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
      }
    } catch {}
    window.addEventListener('unhandledrejection', (e) => console.error('UNHANDLED_REJECTION ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  }, { ls });
  const page = await ctx.newPage();
  const log = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => log.push('[pageerror] ' + e.message));
  page.on('requestfailed', (r) => { const f = r.failure(); if (!(f && /ERR_ABORTED|net::ERR_FAILED/.test(f.errorText) && opts.expectFail)) log.push(`[reqfail] ${r.url()} ${f && f.errorText}`); });
  page.on('response', (r) => { if (r.status() >= 400) log.push(`[http ${r.status()}] ${r.url()}`); });
  return { ctx, page, log };
}

async function goto(page, hash = '', wait = 1500) {
  await page.goto(BASE + (hash ? '#' + hash.replace(/^#/, '') : ''));
  await page.waitForFunction(() => document.getElementById('loadingNote') && document.getElementById('loadingNote').hidden, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(wait);
}

const overflow = (page) => page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
// elementi più larghi della finestra (per capire chi causa lo scroll orizzontale)
const wideEls = (page) => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.right > innerWidth + 1 && !el.closest('.tscroll') && getComputedStyle(el).position !== 'fixed') {
      const p = el.parentElement && el.parentElement.getBoundingClientRect();
      if (!p || p.right <= innerWidth + 1) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} right=${Math.round(r.right)}`);
    }
  }
  return out.slice(0, 8);
});
// testo visibile con valori sospetti
const badText = (page, sel = 'main') => page.evaluate((sel) => {
  const root = document.querySelector(sel) || document.body;
  const t = root.innerText || '';
  const m = t.match(/.{0,40}(NaN|undefined|Infinity|\[object|null%|null |—%)(.{0,30})/g);
  return m ? m.slice(0, 5) : [];
}, sel);

class Rec {
  constructor(name) { this.name = name; this.rows = []; }
  add(id, area, test, ok, detail = '', shot = '', sev = '') {
    this.rows.push({ id, area, test, ok: ok ? 'OK' : 'BUG', detail: String(detail).slice(0, 600), shot, sev });
    console.log(`${ok ? 'OK ' : 'BUG'} [${id}] ${area} · ${test} ${ok ? '' : '→ ' + String(detail).slice(0, 300)}`);
  }
  save() { fs.writeFileSync(RES + this.name + '.json', JSON.stringify(this.rows, null, 1)); }
}
async function shot(page, name, full = false) {
  const p = SHOTS + name + '.png';
  await page.screenshot({ path: p, fullPage: full }).catch(() => {});
  return 'shots/' + name + '.png';
}

module.exports = { launch, open, goto, overflow, wideEls, badText, Rec, shot, BASE, OUT, RES, SHOTS, PROFILES, VERSION };
