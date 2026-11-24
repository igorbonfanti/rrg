// Riquadri #vxKpis ai bordi delle fasce di larghezza (1.6.0) e riquadro dei valori prima del VIX3M e del credito.
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.0/grafici/riquadri.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 360, 600, 601, 768, 820, 1100, 1101, 1120, 1180, 1440, 1920]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600 });
    await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
    const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }); await p.waitForTimeout(300);
    const K = await p.evaluate(() => { const ks = [...document.querySelectorAll('#vxKpis .kpi')]; const tops = [...new Set(ks.map((k) => Math.round(k.getBoundingClientRect().top)))]; const bad = []; ks.forEach((k) => { const kb = k.getBoundingClientRect(); k.querySelectorAll('span').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && (r.right > kb.right + 0.5 || r.left < kb.left - 0.5 || e.scrollWidth > e.clientWidth + 1)) bad.push(k.querySelector('.k').textContent); }); }); return { per: tops.map((t) => ks.filter((k) => Math.round(k.getBoundingClientRect().top) === t).length), bad, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, minW: Math.min(...ks.map((k) => k.getBoundingClientRect().width)) }; });
    const want = w > 1100 ? '6' : w > 600 ? '3,3' : '2,2,2';
    ok(K.per.join() === want && !K.bad.length && K.sw <= K.cw, `${w}: righe ${K.per.join('+')} (attese ${want.replace(/,/g, '+')}), larghezza minima ${K.minW.toFixed(0)} px, testo fuori: ${K.bad.join(',') || 'nessuno'}, scorrimento ${K.sw}/${K.cw}`);
    await c.close();
  }
  // riquadro dei valori prima del VIX3M (2007) e prima del credito (2008-01): righe con «—»
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); localStorage.setItem('sm.vxRange', '"MAX"'); } catch {} });
  const p = await c.newPage(); await p.goto(BASE + '#vix'); await p.waitForSelector('#vxChart path.vxr', { timeout: 30000 }); await p.waitForTimeout(300);
  for (const frac of [0.3, 0.474, 0.49]) {
    const bb = await p.locator('#vxChart').boundingBox(); await p.locator('#vxChart').scrollIntoViewIfNeeded(); const b2 = await p.locator('#vxChart').boundingBox();
    const fr = await p.evaluate(() => { const f = document.querySelector('#vxChart rect.frame'); const svg = document.getElementById('vxChart'); const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width; return [+f.getAttribute('x') * k, +f.getAttribute('width') * k, +f.getAttribute('y') * k]; });
    await p.mouse.move(b2.x + fr[0] + fr[1] * frac, b2.y + fr[2] + 40); await p.waitForTimeout(150);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#vxTip .row')].map((r) => [...r.children].map((x) => x.textContent.trim()).join(': ')));
    console.log(`     MAX al ${(frac * 100).toFixed(1)}%: ${rows.join(' | ')}`);
    const d = rows[0].slice(0, 10).split('/').reverse().join('-');
    if (d < '2007-12-04') ok(rows.includes('VIX3M: —') && rows.includes('VIX / VIX3M: —') && rows.includes('HYG/IEF dal massimo 12 mesi: —'), `riquadro del ${d}: «—» per VIX3M, rapporto e credito`);
    else if (d < '2008-04-09') ok(!rows.includes('VIX3M: —') && rows.includes('HYG/IEF dal massimo 12 mesi: —'), `riquadro del ${d}: VIX3M sì, credito «—»`);
  }
  await b.close(); console.log(`\nFAIL: ${fail}`);
})();
