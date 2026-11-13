// Ricontrollo 1.6.1 (secondo giro, temi grafici e usabilità) dello scatter della vista 8 VIX, dopo le correzioni di 571a400.
// Prima: node ricerca/qa/1.6.1/ricontrollo/gruppi.mjs   (ricalcolo indipendente → atteso.json)
// Uso: BASE=http://127.0.0.1:8804/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/ricontrollo/ricontrollo.cjs [--shots] [--quick]
// Deve fallire sulla 4d75669 (gruppi del 2022, riga del 27/03/2026 cliccabile, tocco che spegne, scritta sopra lo scatter).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8804/';
const DIR = __dirname, SHOTS = path.join(DIR, 'shots');
const W = JSON.parse(fs.readFileSync(path.join(DIR, 'atteso.json')));
const SHOT = process.argv.includes('--shots'), QUICK = process.argv.includes('--quick');
let fail = 0, nok = 0, PART = [];
const ok = (c, m) => { if (!c || process.env.V) console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; else nok++; };
const oss = (m) => console.log(`OSS  ${m}`);
const iso2it = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const XS = [20, 25, 30, 40, 50];

const CONFIGS = [
  // nome, larghezza, altezza, tocco, tema, completo
  ['1440-scuro', 1440, 900, false, 'dark', true],
  ['1280-chiaro', 1280, 800, false, 'light', true],
  ['1440-chiaro', 1440, 900, false, 'light', false],
  ['1280-scuro', 1280, 800, false, 'dark', false],
  ['1024-chiaro', 1024, 768, true, 'light', false],
  ['1024-scuro', 1024, 768, true, 'dark', false],
  ['390-scuro', 390, 844, true, 'dark', false],
  ['390-chiaro', 390, 844, true, 'light', false],
  ['360-chiaro', 360, 780, true, 'light', false],
  ['360-scuro', 360, 780, true, 'dark', false],
];

async function open(b, [name, w, h, touch, theme]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch && w < 600, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
  await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(500);
  return { ctx, p, errs };
}
const dom = (p) => p.evaluate(() => {
  const svg = document.getElementById('vxScatter'), cs = (e) => getComputedStyle(e);
  const root = getComputedStyle(document.documentElement), pal = Array.from({ length: 16 }, (_, i) => root.getPropertyValue('--g' + i).trim());
  const ticks = [...svg.querySelectorAll('text.axt')].map((t) => ({ x: +t.getAttribute('x'), y: +t.getAttribute('y'), a: t.getAttribute('text-anchor'), s: t.textContent }));
  const pts = [...svg.querySelectorAll('g.vxdots circle')].map((c) => ({ cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy'), r: +c.getAttribute('r'), on: c.classList.contains('on'), g: c.dataset.g, fill: cs(c).fill }));
  const hg = svg.querySelector('g.vxhalos g');
  const halo = hg ? { cls: hg.getAttribute('class'), fill: cs(hg).fill, clip: hg.getAttribute('clip-path'), c: [...hg.querySelectorAll('circle')].map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`) } : null;
  const legend = [...document.querySelectorAll('#vxCrises button')].map((x) => ({ g: x.dataset.g, t: x.textContent.trim(), pr: x.getAttribute('aria-pressed'), kd: cs(x.querySelector('.kd')).backgroundColor, h: x.getBoundingClientRect().height }));
  const rows = [...document.querySelectorAll('#vxEps tbody tr')].map((r) => { const kd = r.cells[1].querySelector('.kd'); return { d: r.cells[0].textContent, g: r.dataset.g || null, sel: r.classList.contains('sel'), pr: r.getAttribute('aria-pressed'), tab: r.getAttribute('tabindex'), kd: kd ? cs(kd).backgroundColor : null, kdw: kd ? kd.getBoundingClientRect().width : 0 }; });
  const none = document.getElementById('vxEpsNone');
  const R = (e) => { const b = e.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, vt: b.top, vb: b.bottom }; };
  return { pal, ticks, pts, halo, legend, rows, none: none.hidden ? null : none.textContent, noneR: R(none), crR: R(document.getElementById('vxCrises')), scR: R(svg), noteR: R(document.getElementById('vxScNote')), sel: svg.classList.contains('vxsel'), tip: document.getElementById('vxScTip').hidden ? null : document.getElementById('vxScTip').innerText, sw: [document.documentElement.scrollWidth, document.documentElement.clientWidth] };
});
function scale(D) {
  const xs = D.ticks.filter((t) => t.a === 'middle').map((t) => [+t.s, t.x]), ys = D.ticks.filter((t) => t.a === 'end').map((t) => [parseFloat(t.s.replace('+', '').replace('%', '')), t.y - 3]);
  const fit = (a) => { const [v0, p0] = a[0], [v1, p1] = a.at(-1); const k = (p1 - p0) / (v1 - v0); return (v) => p0 + (v - v0) * k; };
  return { sx: fit(xs), sy: fit(ys) };
}
const setThr = async (p, X, touch) => { const l = p.locator(`#vxTable tr[data-x="${X}"]`); await l.scrollIntoViewIfNeeded(); if (touch) await l.tap(); else await l.click(); await p.waitForTimeout(120); };
const clickLeg = async (p, key, touch) => { const l = p.locator(`#vxCrises button[data-g="${key}"]`); await l.scrollIntoViewIfNeeded(); if (touch) await l.tap(); else await l.click(); await p.waitForTimeout(60); };
const selected = (D) => { const pr = D.legend.filter((x) => x.pr === 'true').map((x) => x.g); return D.sel ? (pr.length === 1 ? pr[0] : `?${pr.join('|')}`) : (pr.length ? `?${pr.join('|')}` : null); };
// punto isolato di una crisi (lontano dagli altri) in coordinate dello schermo
const pointOf = (p, key, start = false) => p.evaluate(([key, start]) => {
  const svg = document.getElementById('vxScatter'), cs = [...svg.querySelectorAll('g.vxdots circle')];
  const P = cs.map((c) => [+c.getAttribute('cx'), +c.getAttribute('cy')]);
  let best = null, bd = -1;
  cs.forEach((c, i) => { if (c.dataset.g !== key || c.classList.contains('start') !== start) return; let m = Infinity; P.forEach((q, j) => { if (j !== i) m = Math.min(m, (q[0] - P[i][0]) ** 2 + (q[1] - P[i][1]) ** 2); }); if (m > bd) { bd = m; best = c; } });
  if (!best) return null;
  best.scrollIntoView({ block: 'center' }); const b = best.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2];
}, [key, start]);
// zona vuota: punto del riquadro a più di 40 unità SVG da ogni punto
const emptyAt = (p) => p.evaluate(() => {
  const svg = document.getElementById('vxScatter'), fr = svg.querySelector('rect.frame'), P = [...svg.querySelectorAll('g.vxdots circle')].map((c) => [+c.getAttribute('cx'), +c.getAttribute('cy')]);
  const x0 = +fr.getAttribute('x'), y0 = +fr.getAttribute('y'), w = +fr.getAttribute('width'), h = +fr.getAttribute('height');
  for (let fx = 0.9; fx > 0.1; fx -= 0.05) for (let fy = 0.1; fy < 0.9; fy += 0.05) { const x = x0 + fx * w, y = y0 + fy * h; if (P.every((q) => (q[0] - x) ** 2 + (q[1] - y) ** 2 > 1600)) { svg.scrollIntoView({ block: 'center' }); const m = svg.getScreenCTM(); return [m.a * x + m.e, m.d * y + m.f]; } }
  return null;
});
const tapAt = async (p, xy, touch) => { if (touch) await p.touchscreen.tap(xy[0], xy[1]); else await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(150); };
const visFrac = (p) => p.evaluate(() => { const b = document.getElementById('vxScatter').getBoundingClientRect(); return Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)) / b.height; });
const shot = async (p, f, el) => { if (!SHOT) return; if (el) await p.locator(el).screenshot({ path: path.join(SHOTS, f) }); else await p.screenshot({ path: path.join(SHOTS, f) }); };

(async () => {
  const b = await chromium.launch();
  for (const cfg of CONFIGS) {
    const [name, , , touch, theme, full] = cfg;
    if (QUICK && !full) continue;
    const { ctx, p, errs } = await open(b, cfg);
    for (const ix of full ? ['SPX', 'NDX'] : ['SPX']) {
      const tag = `${name}-${ix}`, E = W[ix], G = E.groups, byKey = new Map(G.map((g) => [g.key, g]));
      await p.locator(`#vxIx button[data-ix="${ix}"]`).click(); await p.waitForTimeout(400);
      if (await p.$eval('#vxScatter', (s) => s.classList.contains('vxsel'))) { await p.keyboard.press('Escape'); }
      let D = await dom(p);
      const pal = await (p.evaluate((pal) => pal.map((c) => { const d = document.createElement('i'); d.style.color = c; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; }), D.pal));
      // --- punti: ordine (normali poi inizi, per data), gruppo, colore, dimensione, posizione ---
      const exp = [...E.pts.filter((q) => !q.start), ...E.pts.filter((q) => q.start)], S = scale(D);
      ok(D.pts.length === exp.length, `${tag}: ${D.pts.length} punti, attesi ${exp.length}`);
      let bad = [];
      exp.forEach((q, i) => { const d = D.pts[i]; if (!d) return bad.push(q.date + ' manca'); const g = byKey.get(q.g); const why = [];
        if (d.g !== q.g) why.push(`gruppo ${d.g}≠${q.g}`); if (d.fill !== pal[g.c]) why.push(`colore ${d.fill}≠${pal[g.c]}`); if (d.r !== (q.start ? 5.5 : 2.1)) why.push(`r ${d.r}`);
        if (Math.abs(d.cx - S.sx(q.vix)) > 0.2 || Math.abs(d.cy - S.sy(q.ret)) > 0.2) why.push('posizione');
        if (why.length) bad.push(`${q.date} ${why.join(' ')}`); });
      ok(!bad.length, `${tag}: ogni punto con gruppo, colore, dimensione e posizione attesi (${exp.length} controllati)${bad.length ? ' — ' + bad.length + ' scarti, es. ' + bad.slice(0, 4).join('; ') : ''}`);
      const n22 = D.pts.filter((d, i) => exp[i] && exp[i].date.startsWith('2022') && d.g === '2022 inflazione/tassi').length;
      ok(n22 === E.pts.filter((q) => q.date.startsWith('2022')).length && n22 > 0, `${tag}: ${n22} sedute del 2022 con «2022 inflazione/tassi» (attese ${E.pts.filter((q) => q.date.startsWith('2022')).length})`);
      // --- elenco delle crisi ---
      ok(D.legend.length === G.length && G.every((g, i) => D.legend[i] && D.legend[i].g === g.key && D.legend[i].t === g.label && D.legend[i].kd === pal[g.c]), `${tag}: elenco delle crisi = ${G.length} gruppi attesi, in ordine, con etichetta e colore (${D.legend.map((x) => x.t).join(' | ')})`);
      ok(new Set(D.legend.map((x) => x.kd)).size === D.legend.length && D.legend.length > 0, `${tag}: ${D.legend.length} colori tutti diversi`);
      ok(!D.legend.some((x) => /Fuori dalle crisi/.test(x.t)), `${tag}: nessuna voce «Fuori dalle crisi elencate»`);
      if (touch && cfg[1] < 600) oss(`${tag}: elenco delle crisi alto ${Math.round(D.crR.bottom - D.crR.top)} px, pulsanti alti ${[...new Set(D.legend.map((x) => Math.round(x.h)))].join('/')} px; scatter alto ${Math.round(D.scR.bottom - D.scR.top)} px`);
      // --- per ogni soglia: righe cliccabili, puntino; per ogni gruppo: alone, punti accesi, righe evidenziate, scritta ---
      for (const X of (full ? XS : [30, 40])) {
        await setThr(p, X, touch); D = await dom(p);
        const ER = E.rows[X].slice().reverse();
        const rowsOk = D.rows.length === ER.length && ER.every((r, i) => D.rows[i].d === iso2it(r.date) && D.rows[i].g === r.g && (r.g ? D.rows[i].tab === '0' && D.rows[i].kd === pal[byKey.get(r.g).c] && D.rows[i].kdw > 0 : D.rows[i].tab === null && D.rows[i].kd === null));
        ok(rowsOk, `${tag} soglia ${X}: ${D.rows.length} righe, cliccabili ${D.rows.filter((r) => r.g).length} (attese ${ER.filter((r) => r.g).length}), gruppo e puntino colorato giusti${rowsOk ? '' : ' — ' + JSON.stringify(D.rows.map((r, i) => [r.d, r.g, ER[i] && ER[i].g, r.kd]).filter((x) => x[1] !== x[2]).slice(0, 4))}`);
        if (X === 30) { const r26 = D.rows.find((r) => r.d === '27/03/2026'); ok(r26 && !r26.g && r26.tab === null && !r26.kd, `${tag}: riga del 27/03/2026 presente e non cliccabile`); }
        for (const g of (full || X === 40 ? G : [])) {
          const sc0 = (await dom(p)).scR.top;
          await clickLeg(p, g.key, touch); D = await dom(p);
          const onKeys = D.pts.filter((d) => d.on);
          const want = new Set(D.pts.filter((d) => d.g === g.key).map((d) => `${d.cx.toFixed(1)},${d.cy.toFixed(1)}`));
          const haloOk = D.halo && D.halo.c.length === g.npts && D.halo.c.every((c) => want.has(c)) && new Set(D.halo.c).size === want.size && D.halo.cls === `vxhalo g${g.c}` && D.halo.fill === pal[g.c] && D.halo.clip === 'url(#vxScClip)';
          ok(haloOk, `${tag} ${X} ${g.label}: alone di ${D.halo ? D.halo.c.length : 0} cerchi = i ${g.npts} punti della crisi, colore ${pal[g.c]}`);
          ok(onKeys.length === g.npts && onKeys.every((d) => d.g === g.key) && D.sel && selected(D) === g.key, `${tag} ${X} ${g.label}: ${onKeys.length} punti accesi, solo questo pulsante premuto`);
          const wantRows = ER.filter((r) => r.g === g.key).map((r) => iso2it(r.date)), selRows = D.rows.filter((r) => r.sel).map((r) => r.d);
          ok(JSON.stringify(selRows) === JSON.stringify(wantRows) && D.rows.every((r) => !r.g || r.pr === String(r.sel)), `${tag} ${X} ${g.label}: righe evidenziate ${selRows.join(',') || '—'} (attese ${wantRows.join(',') || '—'})`);
          ok(!!D.none === !wantRows.length && (!D.none || (D.none.startsWith(g.label + ':') && D.none.includes(`sopra ${X}`) && !/nessun episodio sopra/.test(D.none))), `${tag} ${X} ${g.label}: scritta ${D.none ? '«' + D.none + '»' : 'assente'}`);
          if (D.none) ok(D.noneR.top >= D.crR.bottom - 1 && D.noneR.bottom <= D.noteR.top + 1 && D.noneR.top > D.scR.bottom, `${tag} ${X} ${g.label}: scritta tra l'elenco delle crisi e la nota, sotto lo scatter`);
          ok(Math.abs(D.scR.top - sc0) < 0.5, `${tag} ${X} ${g.label}: lo scatter non si sposta (${(D.scR.top - sc0).toFixed(1)} px)`);
        }
        // secondo clic sulla stessa voce dell'elenco: toglie
        const last = G.at(-1).key; await clickLeg(p, last, touch); D = await dom(p);
        if (selected(D) === last) { await clickLeg(p, last, touch); D = await dom(p); }
        ok(selected(D) === null && !D.halo && !D.none && D.rows.every((r) => !r.sel), `${tag} ${X}: secondo clic sulla stessa crisi dell'elenco toglie la selezione`);
        // clic su ogni riga cliccabile: la sua crisi; secondo clic: toglie; righe non cliccabili: niente
        const rowsToClick = full ? ER.map((r, i) => [r, i]) : ER.map((r, i) => [r, i]).filter(([r]) => r.g).slice(0, 3).concat(ER.map((r, i) => [r, i]).filter(([r]) => !r.g).slice(0, 1));
        for (const [r, i] of rowsToClick) {
          const loc = p.locator('#vxEps tbody tr').nth(i);
          await loc.evaluate((e) => e.scrollIntoView({ block: 'center' }));
          const v0 = await visFrac(p);
          if (touch) await loc.tap(); else await loc.click();
          await p.waitForTimeout(r.g ? 900 : 150); D = await dom(p);
          if (!r.g) { ok(selected(D) === null && !D.halo, `${tag} ${X}: riga ${iso2it(r.date)} non cliccabile, il clic non cambia nulla`); continue; }
          const v1 = await visFrac(p);
          ok(selected(D) === r.g && D.halo && D.halo.c.length === byKey.get(r.g).npts, `${tag} ${X}: riga ${iso2it(r.date)} → ${r.g} (alone ${D.halo ? D.halo.c.length : 0})`);
          if (v0 < 0.3) ok(v1 >= 0.9, `${tag} ${X}: riga ${iso2it(r.date)}: scatter visibile dopo il clic ${(v1 * 100).toFixed(0)}% (prima ${(v0 * 100).toFixed(0)}%)`);
          else if (v1 < 0.7) { PART.push(Math.round(v1 * 100)); if (SHOT && PART.length === 1) await shot(p, `${name}-${ix}-riga-scatter-parziale-${Math.round(v1 * 100)}.png`); }
          if (i === rowsToClick[0][1] && SHOT && X === 30) await shot(p, `${name}-${ix}-dopo-riga.png`);
          await loc.evaluate((e) => e.scrollIntoView({ block: 'center' }));
          if (touch) await loc.tap(); else await loc.click(); await p.waitForTimeout(150); D = await dom(p);
          ok(selected(D) === null && !D.halo, `${tag} ${X}: secondo clic sulla riga ${iso2it(r.date)} toglie`);
        }
      }
      // --- tocchi e clic sui punti ---
      await setThr(p, 40, touch);
      await clickLeg(p, '2020 Covid', touch);
      const c1 = await pointOf(p, '2020 Covid'); await tapAt(p, c1, touch); D = await dom(p);
      ok(selected(D) === '2020 Covid', `${tag}: un tocco su un punto della crisi già accesa la lascia accesa (${selected(D)})`);
      ok(D.tip && /Crisi evidenziata/.test(D.tip), `${tag}: riquadro dopo il tocco sulla crisi accesa: «${(D.tip || '').split('\n').at(-1)}»`);
      const c2 = await pointOf(p, '2020 Covid', true); await tapAt(p, c2, touch); D = await dom(p);
      ok(selected(D) === '2020 Covid', `${tag}: anche il punto grande del Covid la lascia accesa`);
      const o1 = await pointOf(p, '2007-09 crisi finanziaria'); await tapAt(p, o1, touch); D = await dom(p);
      ok(selected(D) === '2007-09 crisi finanziaria', `${tag}: un tocco su un punto di un'altra crisi passa a quella`);
      const tipNow = (D.tip || '').split('\n').at(-1);
      if (!/Crisi evidenziata/.test(tipNow)) oss(`${tag}: subito dopo il tocco che accende «2007-09» il riquadro dice ancora «${tipNow}» (scritto prima del clic)`);
      if (SHOT && !full) await shot(p, `${name}-tocco-2007.png`);
      const e1 = await emptyAt(p); await tapAt(p, e1, touch); D = await dom(p);
      ok(selected(D) === null && !D.halo, `${tag}: un tocco su un punto vuoto toglie la selezione`);
      // il primo tocco su un punto: riquadro e selezione
      const c3 = await pointOf(p, '2025 dazi'); await tapAt(p, c3, touch); D = await dom(p);
      ok(selected(D) === '2025 dazi', `${tag}: primo tocco su un punto dei dazi la accende`);
      if (!/Crisi evidenziata/.test((D.tip || '').split('\n').at(-1))) oss(`${tag}: dopo il primo tocco il riquadro dice «${(D.tip || '').split('\n').at(-1)}» anche se la crisi è già evidenziata`);
      if (!touch) {
        await p.keyboard.press('Escape'); await p.waitForTimeout(100); D = await dom(p);
        ok(selected(D) === null, `${tag}: Esc toglie la selezione`);
        ok(await p.evaluate(() => getComputedStyle(document.querySelector('#vxScatter rect[fill="transparent"]')).cursor) === 'pointer', `${tag}: cursore a manina sul grafico`);
      }
      D = await dom(p);
      ok(D.sw[0] <= D.sw[1], `${tag}: nessuno scorrimento orizzontale (${D.sw.join('/')})`);
    }
    // screenshot
    if (SHOT) {
      const mk = async (key, f) => { if (key) await clickLeg(p, key, touch); else if (await p.$eval('#vxScatter', (s) => s.classList.contains('vxsel'))) { const s = await p.$eval('#vxCrises button[aria-pressed="true"]', (x) => x.dataset.g); await clickLeg(p, s, touch); } await p.locator('#vxScatter').evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(150); await shot(p, f, '#vxScWrap >> xpath=..'); };
      await p.locator('#vxIx button[data-ix="SPX"]').click(); await p.waitForTimeout(300);
      await setThr(p, 40, touch);
      await mk(null, `${name}-nessuna.png`);
      await mk('2020 Covid', `${name}-covid.png`);
      await mk('2022 inflazione/tassi', `${name}-2022.png`);
      await mk('2000-03 bolla internet', `${name}-bolla.png`);
      await mk('1990 Golfo', `${name}-golfo-scritta40.png`);
      await setThr(p, 30, touch); await clickLeg(p, '2022 inflazione/tassi', touch);
      await p.locator('#vxEps').evaluate((e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(150); await shot(p, `${name}-tabella30.png`);
      if (name === '1440-scuro' || name === '1280-chiaro') { await p.locator('#cvdBtn').click(); await p.waitForTimeout(200); await mk('2020 Covid', `${name}-cvd-covid.png`); await p.locator('#cvdBtn').click(); }
    }
    // Esc con la guida aperta (minore aperto, dichiarato in docs/sviluppo.md)
    if (!touch && full) {
      await clickLeg(p, '2020 Covid', false); await p.locator('#helpBtn').click(); await p.waitForTimeout(300);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      const st = await p.evaluate(() => [document.getElementById('helpModal').open, document.getElementById('vxScatter').classList.contains('vxsel')]);
      oss(`${name}: Esc con la guida aperta → guida ${st[0] ? 'aperta' : 'chiusa'}, selezione ${st[1] ? 'rimasta' : 'tolta'}`);
    }
    if (PART.length) oss(`${name}: ${PART.length} clic su righe con lo scatter già visibile in parte (${Math.min(...PART)}-${Math.max(...PART)}%): non scorre, resta visibile solo in parte`); PART = [];
    ok(!errs.length, `${name}: console senza errori ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(`\n${nok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
