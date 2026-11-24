// Audit 0.9.8: focus da tastiera, tooltip al tocco, linea condivisa al tocco, modalità CVD.
// Uso come giro.cjs (OUT, BASE). Scrive OUT/interazioni.json e le schermate in OUT/int/.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8802/';
const OUT = process.env.OUT || '/tmp/a098/';
fs.mkdirSync(OUT + 'int', { recursive: true });
const R = {};
const init = (theme, extra = {}) => ({ theme, extra });
async function ctxFor(b, w, h, touch, theme, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
  await ctx.addInitScript(({ theme, extra }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', theme); localStorage.setItem('sm.introSeen', 'true'); for (const k in extra) localStorage.setItem(k, extra[k]); } } catch {} }, init(theme, extra));
  return ctx;
}
// contrasto del contorno di focus contro il fondo attorno all'elemento
const FOCUS_INFO = () => {
  const el = document.activeElement; if (!el || el === document.body) return null;
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (e0) => { for (let e = e0; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0.5) return c; } return parse(getComputedStyle(document.body).backgroundColor) || [0, 0, 0, 1]; };
  const oc = parse(cs.outlineColor), around = bgOf(el.parentElement), own = bgOf(el);
  const ow = parseFloat(cs.outlineWidth) || 0;
  return {
    el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''),
    txt: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
    outline: cs.outlineStyle !== 'none' && ow > 0 ? `${ow}px ${cs.outlineStyle} off ${cs.outlineOffset}` : 'nessuno',
    shadow: cs.boxShadow !== 'none' ? cs.boxShadow.slice(0, 40) : '',
    crAround: oc && ow ? +ratio(oc, around).toFixed(2) : 0,
    crOwn: oc && ow ? +ratio(oc, own).toFixed(2) : 0,
    inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
  };
};
(async () => {
  const b = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  // 1. focus da tastiera, 1440, scuro e chiaro
  for (const theme of ['dark', 'light']) {
    const ctx = await ctxFor(b, 1440, 900, false, theme); const page = await ctx.newPage();
    for (const v of ['mon', 'XLU', 'idx', 'btm', 'tit-XLK', 'rrg', 'alr']) {
      await page.goto(BASE + '#' + v); await page.waitForTimeout(v === 'idx' || v.startsWith('tit') ? 4000 : 2200);
      const list = []; let shots = 0;
      await page.mouse.click(2, 300); // fuoco nel documento senza attivare nulla
      for (let i = 0; i < 70; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(FOCUS_INFO);
        if (!f) continue;
        list.push(f);
        const weak = f.outline === 'nessuno' && !f.shadow || (f.outline !== 'nessuno' && Math.max(f.crAround, f.crOwn) < 3) || !f.inView;
        if ((weak || /summary|ixRange|tvlinks|Cap|Epi|seg|chip|tab-/.test(f.el + f.txt)) && shots < 6) {
          const [x, y, w, h] = f.rect;
          if (f.inView && w > 0) { await page.screenshot({ path: `${OUT}int/focus-${theme}-${v}-${i}.png`, clip: { x: Math.max(0, x - 12), y: Math.max(0, y - 10), width: Math.min(1440 - Math.max(0, x - 12), w + 24), height: Math.min(900 - Math.max(0, y - 10), h + 20) } }); shots++; }
        }
      }
      R[`focus-${theme}-${v}`] = list;
    }
    // pannelli richiudibili con la tastiera (Invio e Spazio sul summary)
    await page.goto(BASE + '#XLU'); await page.waitForTimeout(2200);
    const kb = [];
    for (const id of ['secEpiBox', 'secCap']) {
      await page.focus(`#${id} > summary`);
      const before = await page.evaluate((id) => document.getElementById(id).open, id);
      await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      const a1 = await page.evaluate((id) => document.getElementById(id).open, id);
      await page.keyboard.press('Space'); await page.waitForTimeout(300);
      const a2 = await page.evaluate((id) => document.getElementById(id).open, id);
      const info = await page.evaluate(FOCUS_INFO);
      kb.push({ id, before, enter: a1, space: a2, focus: info });
    }
    R[`details-kb-${theme}`] = kb;
    await ctx.close();
  }
  // 2. tooltip e linea condivisa al tocco, 390 e 360
  for (const [w, h] of [[390, 844], [360, 740]]) for (const theme of ['dark', 'light']) {
    const ctx = await ctxFor(b, w, h, true, theme, { 'sm.opened': JSON.stringify({ secEpi: true, secCap: true, ixEpi: true, ixCap: true }) });
    const page = await ctx.newPage();
    const res = [];
    const tapOn = async (svg, tip, fx, label, twin) => {
      const ok = await page.evaluate((id) => { const e = document.getElementById(id); if (!e) return false; e.scrollIntoView({ block: 'center' }); return true; }, svg);
      if (!ok) { res.push({ label, err: 'manca ' + svg }); return; }
      await page.waitForTimeout(300);
      const box = await page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }, svg);
      const x = box[0] + box[2] * fx, y = box[1] + box[3] * 0.35;
      await page.touchscreen.tap(x, y); await page.waitForTimeout(400);
      const t = await page.evaluate(([tip, twin]) => {
        const e = document.getElementById(tip); const r = e.getBoundingClientRect();
        const xz = twin ? document.querySelector(`#${twin} line.xhair`) : null;
        return { shown: !e.hidden && r.width > 0, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], inside: r.left >= 0 && r.right <= innerWidth, text: e.textContent.trim().slice(0, 60), twin: xz ? xz.getAttribute('visibility') : null };
      }, [tip, twin]);
      res.push({ label, fx, ...t });
      if (t.shown && (!t.inside || label.includes('shot'))) await page.screenshot({ path: `${OUT}int/tap-${w}-${theme}-${label}.png` });
    };
    await page.goto(BASE + '#XLU'); await page.waitForTimeout(2500);
    for (const fx of [0.05, 0.5, 0.97]) await tapOn('ts', 'tsTip', fx, 'ts' + (fx === 0.97 ? '-shot' : ''), 'secCapSvg');
    for (const fx of [0.05, 0.97]) await tapOn('secCapSvg', 'secCapTip', fx, 'secCap' + (fx === 0.97 ? '-shot' : ''), 'ts');
    // tocco fuori: si chiude?
    await page.touchscreen.tap(5, 5); await page.waitForTimeout(300);
    res.push({ label: 'chiuso dopo tocco fuori', closed: await page.evaluate(() => document.getElementById('secCapTip').hidden && document.getElementById('tsTip').hidden) });
    await page.goto(BASE + '#btm'); await page.waitForTimeout(2500);
    for (const fx of [0.5, 0.9]) await tapOn('bm', 'bmTip', fx, 'bm' + (fx === 0.9 ? '-shot' : ''));
    await page.goto(BASE + '#idx'); await page.waitForTimeout(4500);
    await tapOn('ixMap', 'ixMapTip', 0.6, 'ixMap-shot');
    for (const fx of [0.05, 0.97]) await tapOn('ixTs', 'ixTsTip', fx, 'ixTs' + (fx === 0.97 ? '-shot' : ''), 'ixCapSvg');
    await tapOn('ixCapSvg', 'ixCapTip', 0.97, 'ixCap-shot', 'ixTs');
    await page.goto(BASE + '#rrg'); await page.waitForTimeout(2500);
    await tapOn('perf', 'perfTip', 0.9, 'perf-shot');
    await page.goto(BASE + '#tit-XLK'); await page.waitForTimeout(4500);
    await tapOn('titHist', 'titHistTip', 0.9, 'titHist-shot');
    R[`tap-${w}-${theme}`] = res;
    await ctx.close();
  }
  // 3. CVD: schermate a 1440 e 390, tutte e due i temi
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) for (const theme of ['dark', 'light']) {
    const ctx = await ctxFor(b, w, h, touch, theme, { 'sm.cvd': 'true', 'sm.opened': JSON.stringify({ secEpi: true, secCap: true, ixEpi: true, ixCap: true }) });
    const page = await ctx.newPage();
    await page.goto(BASE + '#mon'); await page.waitForTimeout(2200);
    const on = await page.evaluate(() => document.documentElement.classList.contains('cvd') || document.body.classList.contains('cvd'));
    if (!on) { await page.click('#cvdBtn'); await page.waitForTimeout(400); }
    R[`cvd-${w}-${theme}`] = { on: await page.evaluate(() => [document.documentElement.className, document.getElementById('cvdBtn').getAttribute('aria-pressed')]) };
    for (const v of ['mon', 'btm', 'XLU', 'rrg', 'idx', 'tit-XLK', 'alr']) {
      await page.goto(BASE + '#' + v); await page.waitForTimeout(v === 'idx' || v.startsWith('tit') ? 4000 : 2200);
      await page.screenshot({ path: `${OUT}int/cvd-${w}-${theme}-${v}.jpg`, fullPage: true, type: 'jpeg', quality: 70 });
    }
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(OUT + 'interazioni.json', JSON.stringify(R, null, 1));
  console.log('fatto');
})();
