// 1.3.3, controllo indipendente di usabilità e grafica dei testi dell'avvicinamento.
// Uso: BASE=http://127.0.0.1:8797/ OUT=cartella_screenshot EXPECT=1.3.3 NODE_PATH=$(npm root -g) node ricerca/qa/1.3.3/usabilita/u133.cjs
// Viste: #mon (legenda «Come si legge lo stato»), #XLRE e #XLV (riga «Soglia di avvicinamento»), vista Indici (stessa riga),
// guida della pagina (note nel riquadro «? Guida»), versione in alto, guida.html#avvicinamento (elenco «Come usarlo»).
// Computer 1440 e 1280, telefono 390 e 360 con tocco, tema chiaro e scuro.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8797/', OUT = process.env.OUT, EXPECT = process.env.EXPECT || '1.3.3';
let fail = 0, n = 0;
const ok = (c, msg) => { n++; console.log(`${c ? 'OK  ' : 'FAIL'} ${msg}`); if (!c) fail++; };
// testi attesi nella 1.3.3
const SEC_NUM = /50 tocchi del livello su 63[\s\S]*da sola 33/;
const IX_NUM = /89 tocchi del livello su 132[\s\S]*23 sedute invece di 13[\s\S]*da sola 83[\s\S]*40%/;
const inView = (r, W, H) => r && r.x >= -0.5 && r.y >= -0.5 && r.x + r.width <= W + 0.5 && r.y + r.height <= H + 0.5;

async function noHScroll(page, name) {
  const s = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, w: innerWidth }));
  ok(s.sw <= s.w && s.bw <= s.w, `${name} nessuna pagina più larga dello schermo (scrollWidth ${s.sw}/${s.bw}, finestra ${s.w})`);
}
// testo non tagliato: nessun antenato con overflow nascosto più stretto, nessun ellipsis, scrollWidth <= clientWidth
async function notClipped(page, sel, name) {
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { missing: true };
    const rr = el.getBoundingClientRect();
    let clip = null;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.textOverflow === 'ellipsis' && a.scrollWidth > a.clientWidth + 1) clip = 'ellipsis ' + a.className;
      if (/(hidden|clip)/.test(cs.overflowX + cs.overflowY) && a !== el) {
        const ar = a.getBoundingClientRect();
        if (rr.right > ar.right + 1 || rr.left < ar.left - 1 || rr.bottom > ar.bottom + 1) clip = 'overflow ' + (a.id || a.className);
      }
    }
    return { clip, sw: el.scrollWidth, cw: el.clientWidth, x: rr.x, w: rr.width, W: innerWidth, h: rr.height };
  }, sel);
  ok(!r.missing && !r.clip && r.sw <= r.cw + 1 && r.x >= 0 && r.x + r.w <= r.W + 0.5, `${name} testo intero ${sel} (${r.missing ? 'manca' : `clip=${r.clip} sw ${r.sw}/${r.cw} x ${Math.round(r.x)}..${Math.round(r.x + r.w)} di ${r.W}`})`);
}
// i figli diretti non si sovrappongono
async function noOverlap(page, sel, name) {
  const k = await page.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length);
    const rs = els.map((e) => e.getBoundingClientRect());
    let bad = 0;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) bad++;
    }
    return { n: els.length, bad };
  }, sel);
  ok(k.n > 0 && k.bad === 0, `${name} nessuna sovrapposizione in ${sel} (${k.n} elementi, ${k.bad} coppie sovrapposte)`);
}
// tooltip: computer = attributo title; telefono = tocco e riquadro .taptip dentro lo schermo
async function tip(page, loc, re, touch, name, shot) {
  await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
  const title = await loc.getAttribute('title');
  ok(!!title && re.test(title), `${name} testo del tooltip (${title ? title.length : 0} caratteri)`);
  if (!touch) { await loc.hover(); return; }
  const bb = await loc.boundingBox();
  await page.touchscreen.tap(bb.x + Math.min(20, bb.width / 2), bb.y + bb.height / 2);
  await page.waitForTimeout(250);
  const t = await page.evaluate(() => { const e = document.querySelector('.taptip'); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return { r: { x: r.x, y: r.y, width: r.width, height: r.height }, txt: e.textContent, sh: e.scrollHeight, ch: e.clientHeight, W: innerWidth, H: innerHeight }; });
  ok(!!t && re.test(t.txt), `${name} il tocco apre il riquadro con il testo`);
  ok(!!t && inView(t.r, t.W, t.H) && t.sh <= t.ch + 1, `${name} riquadro dentro lo schermo (${t ? `x ${Math.round(t.r.x)} y ${Math.round(t.r.y)} ${Math.round(t.r.width)}×${Math.round(t.r.height)} su ${t.W}×${t.H}` : 'chiuso'})`);
  if (OUT && shot) await page.screenshot({ path: `${OUT}/${shot}.png` });
}

(async () => {
  const b = await chromium.launch();
  const sizes = [['1440', 1440, 900, false], ['1280', 1280, 800, false], ['390', 390, 844, true], ['360', 360, 740, true]];
  for (const [sz, w, h, touch] of sizes) for (const light of [false, true]) {
    const th = light ? 'chiaro' : 'scuro', tag = `${sz}-${th}`;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
    await ctx.addInitScript(({ light }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, { light });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));

    // 1 Monitor: legenda degli stati
    await page.goto(BASE + '#mon'); await page.waitForTimeout(2200);
    ok(await page.evaluate((l) => document.documentElement.dataset.theme === l, light ? 'light' : 'dark'), `${tag} tema ${th} applicato`);
    const ver = await page.locator('#verTag').innerText();
    ok(ver.includes(EXPECT), `${tag} versione in alto «${ver.trim()}»`);
    const leg = page.locator('#stateLegend > div').first();
    await leg.scrollIntoViewIfNeeded();
    ok(SEC_NUM.test(await leg.innerText()), `${tag} #mon legenda Avvicinamento con 50/63 e 33`);
    await notClipped(page, '#stateLegend > div:first-child > span:last-child', `${tag} #mon`);
    await noOverlap(page, '#stateLegend > div', `${tag} #mon legenda`);
    await noOverlap(page, '#stateLegend > div:first-child > *', `${tag} #mon badge e testo`);
    await noHScroll(page, `${tag} #mon`);
    if (OUT) await page.locator('#stateLegend').screenshot({ path: `${OUT}/mon-legenda-${tag}.png` });
    // tooltip della versione
    await tip(page, page.locator('#verTag'), new RegExp(`Versione ${EXPECT.replace(/\./g, '\\.')}[\\s\\S]*50 tocchi del livello su 63`), touch, `${tag} versione`, touch ? `versione-tip-${tag}` : null);
    if (touch) { await page.touchscreen.tap(5, h - 5); await page.waitForTimeout(150); }

    // 4 Settore: XLRE e XLV
    for (const s of ['XLRE', 'XLV']) {
      await page.goto(BASE + '#' + s); await page.waitForTimeout(1800);
      const dt = page.locator('#secFacts dt', { hasText: 'Soglia di avvicinamento' });
      ok(await dt.count() === 1, `${tag} #${s} riga «Soglia di avvicinamento» presente`);
      if (!(await dt.count())) continue;
      await notClipped(page, '#secFacts', `${tag} #${s} Situazione`);
      const dd = await page.evaluate(() => { const d = [...document.querySelectorAll('#secFacts dt')].find((e) => /Soglia di avvicinamento/.test(e.textContent)); const v = d.nextElementSibling; const a = d.getBoundingClientRect(), r = v.getBoundingClientRect(); return { v: v.textContent, sw: v.scrollWidth, cw: v.clientWidth, ov: Math.min(a.right, r.right) - Math.max(a.left, r.left) > 1 && Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top) > 1, right: r.right, W: innerWidth }; });
      ok(/^\d+% · (sotto|[+−-]\d)/.test(dd.v) && dd.sw <= dd.cw + 1 && !dd.ov && dd.right <= dd.W, `${tag} #${s} valore «${dd.v}» intero e non sovrapposto all'etichetta`);
      await noOverlap(page, '#secFacts > *', `${tag} #${s} righe Situazione`);
      await tip(page, dt, SEC_NUM, touch, `${tag} #${s} tooltip soglia`, `sec-${s}-tip-${tag}`);
      if (OUT && !touch) await page.locator('#secFacts').screenshot({ path: `${OUT}/sec-${s}-situazione-${tag}.png` });
      await noHScroll(page, `${tag} #${s}`);
      if (touch) { await page.touchscreen.tap(5, 5); await page.waitForTimeout(100); }
    }

    // 6 Indici: dettaglio dell'S&P 500 (il primo)
    await page.goto(BASE + '#idx'); await page.waitForTimeout(2500);
    let ixdt = page.locator('#ixFacts dt', { hasText: 'Soglia di avvicinamento' });
    if (!(await ixdt.count())) {
      const row = page.locator('tr[data-ix]').first();
      if (await row.count()) { await row.locator('td').first().click(); await page.waitForTimeout(1200); }
      ixdt = page.locator('#ixFacts dt', { hasText: 'Soglia di avvicinamento' });
    }
    ok(await ixdt.count() === 1, `${tag} #idx riga «Soglia di avvicinamento» presente`);
    if (await ixdt.count()) {
      await notClipped(page, '#ixFacts', `${tag} #idx Situazione`);
      await noOverlap(page, '#ixFacts > *', `${tag} #idx righe Situazione`);
      await tip(page, ixdt, IX_NUM, touch, `${tag} #idx tooltip soglia`, `idx-tip-${tag}`);
      if (OUT && !touch) await page.locator('#ixFacts').screenshot({ path: `${OUT}/idx-situazione-${tag}.png` });
    }
    await noHScroll(page, `${tag} #idx`);

    // note della pagina (riquadro «? Guida»)
    await page.goto(BASE + '#mon'); await page.waitForTimeout(1500);
    await page.locator('#helpBtn').click(); await page.waitForTimeout(300);
    const li = page.locator('#helpModal li', { hasText: 'promemoria, non un segnale' });
    ok(await li.count() === 1, `${tag} note: voce Avvicinamento con «promemoria»`);
    if (await li.count()) {
      const t = await li.innerText();
      ok(SEC_NUM.test(t), `${tag} note: settori 50/63 e 33`);
      await li.scrollIntoViewIfNeeded();
      const r = await li.boundingBox(); const W = await page.evaluate(() => innerWidth);
      ok(r.x >= 0 && r.x + r.width <= W, `${tag} note: voce dentro lo schermo (${Math.round(r.x)}..${Math.round(r.x + r.width)} di ${W})`);
      if (OUT) await li.screenshot({ path: `${OUT}/note-${tag}.png` });
    }
    const ixli = page.locator('#helpModal li', { hasText: '6 Indici: la stessa analisi' });
    ok(IX_NUM.test(await ixli.innerText()) || /89 tocchi del livello su 132[\s\S]*23 sedute invece di 13[\s\S]*da sola 83/.test(await ixli.innerText()), `${tag} note: indici 89/132, 23 e 13 sedute, 83`);
    await page.keyboard.press('Escape');

    // guida.html#avvicinamento
    await page.goto(BASE + 'guida.html#avvicinamento'); await page.waitForTimeout(1200);
    const g = await page.evaluate(() => {
      const h = document.getElementById('avvicinamento');
      const hr = h.getBoundingClientRect();
      let ul = h.nextElementSibling; while (ul && ul.tagName !== 'UL' && ul.tagName !== 'H3') ul = ul.nextElementSibling;
      if (!ul || ul.tagName !== 'UL') return { hTop: hr.top, ul: null };
      // un elenco di riferimento della guida, fuori dalla sezione (primo ul in .g-main che non sia l'indice)
      const ref = [...document.querySelectorAll('.g-main ul')].find((u) => u !== ul && !u.closest('nav') && u.querySelector('li > b'));
      const css = (e) => { const c = getComputedStyle(e); return [c.fontSize, c.lineHeight, c.marginTop, c.marginBottom, c.paddingLeft, c.listStyleType, c.color, c.fontFamily].join('|'); };
      const lis = [...ul.children];
      const rr = lis.map((l) => l.getBoundingClientRect());
      let over = 0; for (let i = 1; i < rr.length; i++) if (rr[i].top < rr[i - 1].bottom - 0.5) over++;
      return { hTop: hr.top, n: lis.length, txt: ul.innerText, ulCss: css(ul), refUlCss: ref && css(ref), liCss: css(lis[0]), refLiCss: ref && css(ref.children[0]), over, maxR: Math.max(...rr.map((r) => r.right)), minL: Math.min(...rr.map((r) => r.left)), W: innerWidth, hdr: (() => { const el = document.elementFromPoint(innerWidth / 2, Math.max(1, hr.top + 4)); return el && (el.closest('#avvicinamento') ? 'h3' : el.tagName + '.' + el.className); })() };
    });
    ok(g.ul !== null && g.n === 4, `${tag} guida: elenco «Come usarlo» con ${g.n} voci`);
    if (g.ul !== null) {
      ok(g.ulCss === g.refUlCss && g.liCss === g.refLiCss, `${tag} guida: elenco impaginato come gli altri (${g.ulCss} / ${g.liCss} vs ${g.refUlCss} / ${g.refLiCss})`);
      ok(g.over === 0 && g.minL >= 0 && g.maxR <= g.W, `${tag} guida: voci non sovrapposte e dentro lo schermo`);
      ok(/23%[\s\S]*46%[\s\S]*27%[\s\S]*21%[\s\S]*34%/.test(g.txt), `${tag} guida: percentuali dell'elenco presenti`);
    }
    ok(g.hTop >= -1 && g.hTop < h / 2 && g.hdr === 'h3', `${tag} guida: l'ancora porta al titolo, visibile e non coperto (top ${Math.round(g.hTop)}, sopra: ${g.hdr})`);
    await noHScroll(page, `${tag} guida`);
    if (OUT) {
      const sec = await page.evaluate(() => { const h = document.getElementById('avvicinamento'); const s = h.getBoundingClientRect(); let e = h; let last = h; while ((e = e.nextElementSibling) && e.tagName !== 'H3') last = e; const l = last.getBoundingClientRect(); return { y: s.top + scrollY - 8, h: l.bottom - s.top + 16 }; });
      await page.screenshot({ path: `${OUT}/guida-${tag}.png`, fullPage: true, clip: { x: 0, y: Math.max(0, sec.y), width: w, height: sec.h } });
    }
    ok(!errs.length, `${tag} console senza errori ${errs.join(' | ').slice(0, 300)}`);
    await ctx.close();
  }
  await b.close();
  console.log(`${n} controlli, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
