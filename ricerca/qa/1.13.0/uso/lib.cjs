// Funzioni comuni dei controlli di usabilità 1.13.0 (controllore indipendente).
const { chromium } = require('playwright');
const NEW = process.env.NEW || 'http://127.0.0.1:8821/';
const OLD = process.env.OLD || 'http://127.0.0.1:8822/';
const SIZES = {
  1440: { viewport: { width: 1440, height: 900 } },
  1280: { viewport: { width: 1280, height: 800 } },
  1024: { viewport: { width: 1024, height: 768 } },
  768: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  360: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const VIEWS = [
  ['mon', 'v-mon', '#boardTable tbody tr'], ['rrg', 'v-rrg', '#rotTable tbody tr'], ['btm', 'v-btm', '#bm circle'],
  ['XLK', 'v-sec', '#memTable tbody tr'], ['SOXX', 'v-sec', '#memTable tbody tr'], ['tit', 'v-tit', '#titPain tbody tr'],
  ['idx', 'v-idx', '#ixTable tbody tr'], ['emg', 'v-emg', '#emTable tbody tr'], ['vix', 'v-vix', '#vxTable tbody tr'],
  ['alr', 'v-alr', '#alertLog li'], ['ath', 'v-ath', '#athTable tr.athr'],
];
async function ctx(b, w, theme) {
  const c = await b.newContext(SIZES[w]);
  await c.addInitScript((t) => { try { localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } catch {} }, theme);
  return c;
}
function watch(p) {
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  return errs;
}
async function go(p, base, hash, wait) {
  if (!p.url().startsWith(base)) { await p.goto(base + '#' + hash); }
  else await p.evaluate((h) => { location.hash = '#' + h; }, hash);
  if (wait) await p.waitForSelector(wait, { timeout: 40000, state: 'attached' }).catch(() => {});
  await p.waitForTimeout(600);
}
const pop = (p) => p.evaluate(() => {
  const x = document.getElementById('infopop'); if (!x || x.hidden) return null;
  const r = x.getBoundingClientRect();
  return { t: x.innerText, l: r.left, r: r.right, top: r.top, b: r.bottom, h: r.height, sh: x.scrollHeight, ch: x.clientHeight,
    vw: innerWidth, vh: innerHeight, link: (x.querySelector('.infopop-g a') || {}).href || '' };
});
module.exports = { chromium, NEW, OLD, SIZES, VIEWS, ctx, watch, go, pop };
// un punto «neutro» dove cliccare o toccare fuori: nessun elemento interattivo e fuori dal riquadro
async function neutral(p) {
  return p.evaluate(() => {
    const W = innerWidth, H = innerHeight, cand = [];
    for (const y of [H * 0.5, H * 0.3, H * 0.7, H * 0.15, H * 0.9]) for (const x of [3, W - 4, W * 0.5, 8]) cand.push([x, y]);
    const pop = document.getElementById('infopop');
    for (const [x, y] of cand) {
      const e = document.elementFromPoint(x, y); if (!e) continue;
      if (pop && pop.contains(e)) continue;
      if (e.closest('a,button,input,select,label,summary,svg,canvas,tr,[onclick],[role=button],[tabindex],.zwrap,.chart')) continue;
      return [x, y];
    }
    return [3, H - 4];
  });
}
module.exports.neutral = neutral;
