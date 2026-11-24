// QA 1.12.0 (regola del calo in corso), controllo nel browser scritto da zero (non riusa regola/in-corso.cjs).
// 1) data/ath_history.json di oggi: #ath con 4 conclusi e 1 in corso (06/10/2026), a 1440 e 390 px, tema scuro e chiaro.
// 2) tagli passati (page.route su data/ath_history.json): riquadri e intestazione attesi dal ricalcolo Python (py.json).
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/regola-qa/browser.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
const ROOT = path.resolve(__dirname, '../../../..');
const PY = JSON.parse(fs.readFileSync(path.join(__dirname, 'py.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const dIT = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const pct = (x) => (x < 0 ? '−' : x > 0 ? '+' : '') + Math.abs(x).toFixed(1).replace('.', ',') + '%';

// taglio indipendente: conta le sedute <= data e accorcia gaps (n-1) e cd (n)
function cutHist(H, to) {
  const out = JSON.parse(JSON.stringify(H));
  delete out.profiles;
  for (const [id, s] of Object.entries(out.series)) {
    let d = new Date(s.d0 + 'T00:00:00Z'), n = s.d0 <= to ? 1 : 0;
    if (!n) { delete out.series[id]; continue; }
    for (const ch of s.gaps) { d = new Date(d.getTime() + parseInt(ch, 36) * 864e5); if (d.toISOString().slice(0, 10) > to) break; n++; }
    s.gaps = s.gaps.slice(0, n - 1); s.cd = s.cd.slice(0, n);
  }
  return out;
}
// riquadri attesi dal ricalcolo Python
function expected(c) {
  const P = PY[c];
  const boxes = [...P.done.map(([d, dd]) => ({ d, dd, on: false })), ...P.open.map(([d, dd]) => ({ d, dd, on: true }))];
  return { asOf: P.asOf, boxes };
}

async function look(b, { w, mob, theme, route }) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('antigravity-theme', t); } catch {} }, theme);
  if (route) await c.route('**/data/ath_history.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: route }));
  const p = await c.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(BASE + '#ath', { waitUntil: 'load' });
  await p.waitForFunction(() => document.querySelectorAll('#pkBody .pkep').length > 0 || (document.getElementById('pkMiss') && !document.getElementById('pkMiss').hidden && !/Caricamento/.test(document.getElementById('pkMiss').textContent)), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(400);
  const got = await p.evaluate(() => ({
    h: [...document.querySelectorAll('#pkBody .pkep h3')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
    peaks: [...document.querySelectorAll('#pkBody .pkep')].map((x) => x.dataset.peak),
    meta: document.getElementById('pkMeta').textContent,
    miss: document.getElementById('pkMiss').hidden ? null : document.getElementById('pkMiss').textContent,
    theme: document.documentElement.getAttribute('data-theme'),
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
  }));
  return { p, c, got, errs };
}
function boxText(x) { return `Massimo S&P 500 ${dIT(x.d)} · ${x.dd == null || x.dd === 0 ? 'al massimo' : 'calo ' + pct(x.dd)}${x.on ? ' in corso' : ''}`; }

(async () => {
  const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ath_history.json'), 'utf8'));
  const b = await chromium.launch();
  // 1) dati di oggi
  const today = Object.keys(PY).sort().at(-1), E = expected(today);
  for (const [w, mob] of [[1440, false], [390, true]]) for (const theme of ['dark', 'light']) {
    const { p, c, got, errs } = await look(b, { w, mob, theme });
    const want = E.boxes.map(boxText);
    ok(JSON.stringify(got.h) === JSON.stringify(want), `oggi ${w}px ${theme}: riquadri ${got.h.join(' | ')}`);
    ok(got.h.length === 5 && got.h.filter((x) => x.endsWith('in corso')).length === 1 && got.h[4].includes('06/10/2026'), `oggi ${w}px ${theme}: 4 conclusi e 1 in corso dal 06/10/2026`);
    ok(got.meta === `ultimi 4 cali ≥ 15% dell'S&P 500 e quello in corso · chiusure al ${dIT(E.asOf)}`, `oggi ${w}px ${theme}: intestazione «${got.meta}»`);
    ok(got.theme === theme && got.sw <= got.cw && !errs.length, `oggi ${w}px ${theme}: tema ${got.theme}, larghezza ${got.sw}/${got.cw}, errori ${errs.length} ${errs.join(' | ')}`);
    await p.locator('#pkPanel').screenshot({ path: path.join(__dirname, `oggi-${w}-${theme}.png`) }).catch((e) => ok(false, 'foto ' + e.message));
    await c.close();
  }
  // 2) tagli passati
  const cuts = ['2023-07-31', '2011-10-03', '2010-06-30', '2013-03-28', '2005-06-30', '2009-03-09', '2003-01-31'];
  for (const cut of cuts) {
    const E2 = expected(cut), body = JSON.stringify(cutHist(H, cut));
    for (const [w, mob] of [[1440, false], [390, true]]) {
      const { p, c, got, errs } = await look(b, { w, mob, theme: 'dark', route: body });
      const want = E2.boxes.map(boxText);
      ok(JSON.stringify(got.h) === JSON.stringify(want), `${cut} ${w}px: riquadri app [${got.h.join(' | ')}] attesi [${want.join(' | ')}]${got.miss ? ' messaggio «' + got.miss + '»' : ''}`);
      console.log(`     ${cut} ${w}px intestazione «${got.meta}»`);
      ok(got.sw <= got.cw && !errs.length, `${cut} ${w}px: larghezza ${got.sw}/${got.cw}, errori ${errs.length} ${errs.join(' | ')}`);
      if (w === 1440 && ['2011-10-03', '2005-06-30', '2003-01-31'].includes(cut)) await p.locator('#pkPanel').screenshot({ path: path.join(__dirname, `${cut}-1440.png`) }).catch(() => {});
      await c.close();
    }
  }
  await b.close();
  console.log(`${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
