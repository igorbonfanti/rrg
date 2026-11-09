// Controllo indipendente (tema grafici) dello scatter della vista VIX, versione 1.6.1.
// Prima: node ricerca/qa/1.6.1/grafici/gruppi.mjs   (scrive atteso.json, ricalcolo dai dati)
// Uso: BASE=http://127.0.0.1:8801/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/grafici/grafici.cjs [--shots]
// Deve fallire sulla 1.6.0 (niente #vxCrises, niente alone, colori per episodio).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8801/';
const DIR = __dirname, SHOTS = path.join(DIR, 'shots');
const W = JSON.parse(fs.readFileSync(path.join(DIR, 'atteso.json')));
const SHOT = process.argv.includes('--shots');
let fail = 0, nok = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) fail++; else nok++; };
const hex2rgb = (h) => { h = h.trim().replace('#', ''); return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`; };

async function open(b, w, theme, touch = w < 600) {
  const ctx = await b.newContext({ viewport: { width: w, height: touch ? 844 : 900 }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
  await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(500);
  return { ctx, p, errs };
}
// stato del disegno letto dal DOM
const dom = (p) => p.evaluate(() => {
  const svg = document.getElementById('vxScatter'), vb = svg.getAttribute('viewBox').split(' ').map(Number);
  const cs = (e) => getComputedStyle(e);
  const ticks = [...svg.querySelectorAll('text.axt')].map((t) => ({ x: +t.getAttribute('x'), y: +t.getAttribute('y'), a: t.getAttribute('text-anchor'), s: t.textContent }));
  const pts = [...svg.querySelectorAll('g.vxdots circle')].map((c) => ({ cx: c.getAttribute('cx'), cy: c.getAttribute('cy'), r: +c.getAttribute('r'), cls: c.getAttribute('class'), g: c.dataset.g, fill: cs(c).fill, op: +cs(c).opacity }));
  const hg = svg.querySelector('g.vxhalos g');
  const halo = hg ? { cls: hg.getAttribute('class'), fill: cs(hg).fill, op: +cs(hg).opacity, clip: hg.getAttribute('clip-path'), c: [...hg.querySelectorAll('circle')].map((c) => ({ cx: c.getAttribute('cx'), cy: c.getAttribute('cy'), r: +c.getAttribute('r') })) } : null;
  const root = getComputedStyle(document.documentElement), pal = Array.from({ length: 16 }, (_, i) => root.getPropertyValue('--g' + i).trim());
  const legend = [...document.querySelectorAll('#vxCrises button')].map((b) => ({ g: b.dataset.g, t: b.textContent.trim(), pr: b.getAttribute('aria-pressed'), kd: cs(b.querySelector('.kd')).backgroundColor }));
  const rows = [...document.querySelectorAll('#vxEps tbody tr')].map((r) => ({ d: r.cells[0].textContent, cr: r.cells[1].textContent, g: r.dataset.g || null, sel: r.classList.contains('sel'), bg: cs(r.cells[0]).backgroundColor }));
  const none = document.getElementById('vxEpsNone');
  return { vb, ticks, pts, halo, pal, legend, rows, none: none.hidden ? null : none.textContent, sel: svg.classList.contains('vxsel'), tip: document.getElementById('vxScTip').hidden ? null : document.getElementById('vxScTip').innerText };
});
// scala dagli assi (etichette) e posizioni attese dei punti ricalcolati
function scale(D) {
  const xs = D.ticks.filter((t) => t.a === 'middle').map((t) => [+t.s, t.x]), ys = D.ticks.filter((t) => t.a === 'end').map((t) => [parseFloat(t.s.replace('+', '').replace('%', '')), t.y - 3]);
  const fit = (a) => { const [v0, p0] = a[0], [v1, p1] = a.at(-1); const k = (p1 - p0) / (v1 - v0); return (v) => p0 + (v - v0) * k; };
  return { sx: fit(xs), sy: fit(ys), xr: [xs[0][0], xs.at(-1)[0]], yr: [ys[0][0], ys.at(-1)[0]] };
}
const iso2it = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

(async () => {
  const b = await chromium.launch();
  // ---------- 1. posizioni, colori, gruppi, alone, tabella (1440 scuro e 1280 chiaro, entrambi gli indici) ----------
  for (const [w, theme] of [[1440, 'dark'], [1280, 'light']]) {
    const { ctx, p, errs } = await open(b, w, theme);
    for (const ix of ['SPX', 'NDX']) {
      await p.click(`#vxIx button[data-ix="${ix}"]`); await p.waitForTimeout(400);
      const E = W[ix], groups = E.groups, gByKey = new Map(groups.map((g) => [g.key, g]));
      let D = await dom(p); const S = scale(D);
      const tag = `${w}-${theme}-${ix}`;
      ok(D.pts.length === E.n, `${tag}: ${D.pts.length} punti nel disegno, attesi ${E.n}`);
      // ogni punto atteso nel posto giusto, una volta sola, del colore della sua crisi, grande se inizio
      // abbinamento con tolleranza di arrotondamento (cx, cy scritti a 0,1)
      const used = new Set(); const take = (x, y) => { for (let i = 0; i < D.pts.length; i++) { const c = D.pts[i]; if (!used.has(i) && Math.abs(+c.cx - x) <= 0.06 && Math.abs(+c.cy - y) <= 0.06) { used.add(i); return c; } } return null; };
      let pos = 0, col = 0, grp = 0, big = 0, outside = 0;
      for (const q of E.pts) {
        const c = take(S.sx(q.vix), S.sy(q.ret));
        if (!c) { pos++; continue; }
        const g = gByKey.get(q.g);
        if (c.g !== q.g) grp++;
        if (c.fill !== hex2rgb(D.pal[g.c])) col++;
        if ((c.r > 4) !== q.start) big++;
        if (+c.cx < S.sx(30) - 0.5 || +c.cy < 0 || +c.cy > D.vb[3]) outside++;
      }
      ok(pos === 0, `${tag}: punti fuori posto o mancanti ${pos}/${E.n}`);
      ok(grp === 0, `${tag}: punti con il gruppo sbagliato ${grp}`);
      ok(col === 0, `${tag}: punti con il colore sbagliato ${col}`);
      ok(big === 0, `${tag}: punti grandi diversi dagli inizi degli episodi ${big} (inizi attesi ${E.pts.filter((q) => q.start).length})`);
      ok(outside === 0, `${tag}: punti fuori dal riquadro ${outside}`);
      // legenda: gruppi con punti, in ordine di tempo, etichette e colori
      const want = groups.filter((g) => g.npts > 0);
      ok(D.legend.map((l) => l.t).join('|') === want.map((g) => g.label).join('|'), `${tag}: elenco delle crisi (${D.legend.length}) = gruppi con punti (${want.length})`);
      ok(D.legend.every((l, i) => l.kd === hex2rgb(D.pal[want[i].c])), `${tag}: colore della legenda = colore dei punti`);
      // colori distinti tra i gruppi visibili
      ok(new Set(want.map((g) => D.pal[g.c])).size === want.length, `${tag}: ${want.length} gruppi visibili con colori tutti diversi`);
      // ---- selezione di ogni gruppo dalla legenda: alone e punti accesi
      for (const g of want) {
        await p.click(`#vxCrises button[data-g="${g.key}"]`); await p.waitForTimeout(80);
        D = await dom(p);
        const mine = E.pts.filter((q) => q.g === g.key);
        const hu = new Set(), hc = D.halo ? D.halo.c : [];
        const matched = mine.filter((q) => { const i = hc.findIndex((c, j) => !hu.has(j) && Math.abs(+c.cx - S.sx(q.vix)) <= 0.06 && Math.abs(+c.cy - S.sy(q.ret)) <= 0.06); if (i >= 0) hu.add(i); return i >= 0; }).length;
        const hal = hc;
        ok(matched === mine.length && hc.length === mine.length, `${tag} ${g.label}: alone ${hal.length} cerchi su ${mine.length} punti della crisi`);
        ok(D.halo && D.halo.fill === hex2rgb(D.pal[g.c]) && D.halo.clip, `${tag} ${g.label}: alone del colore della crisi e ritagliato`);
        const on = D.pts.filter((c) => c.op === 1 && !(c.cls.includes('start') && false));
        const onG = D.pts.filter((c) => c.cls.includes(' on') || c.cls.endsWith('on'));
        ok(onG.length === mine.length && onG.every((c) => c.g === g.key), `${tag} ${g.label}: punti accesi ${onG.length}`);
        ok(D.pts.filter((c) => c.g !== g.key).every((c) => c.op < 0.2), `${tag} ${g.label}: altri punti spenti (opacità ${[...new Set(D.pts.filter((c) => c.g !== g.key).map((c) => c.op))].join(',')})`);
        ok(D.legend.filter((l) => l.pr === 'true').map((l) => l.g).join() === g.key, `${tag} ${g.label}: legenda premuta solo sulla crisi`);
      }
      await p.keyboard.press('Escape'); await p.waitForTimeout(80);
      D = await dom(p); ok(!D.sel && !D.halo, `${tag}: Esc toglie la selezione`);
      // ---- tabella: per ogni soglia, ogni gruppo, righe evidenziate
      for (const X of [20, 25, 30, 40, 50]) {
        await p.click(`#vxTable tr[data-x="${X}"]`); await p.waitForTimeout(150);
        const rowsE = E.rows[X];
        for (const g of groups) {
          // selezione dal grafico/legenda (o, per i gruppi senza punti, nessun modo dal grafico)
          if (!g.npts) continue;
          await p.click(`#vxCrises button[data-g="${g.key}"]`); await p.waitForTimeout(60);
          D = await dom(p);
          const selRows = D.rows.filter((r) => r.sel).map((r) => r.d).sort();
          // atteso: righe con la stessa crisi; per i gruppi fuori dalle crisi: le righe che iniziano dentro l'episodio a 30 del gruppo
          const exp = rowsE.filter((r) => (r.crisis ? r.crisis === g.key : r.inside30 === g.key)).map((r) => iso2it(r.date)).sort();
          ok(selRows.join() === exp.join(), `${tag} soglia ${X} ${g.label}: righe evidenziate ${selRows.length} (attese ${exp.length}) ${selRows.join() === exp.join() ? '' : 'APP ' + selRows.join(' ') + ' ATTESE ' + exp.join(' ')}`);
          const msg = D.none;
          ok(exp.length ? !msg : !!msg && msg.includes(String(X)), `${tag} soglia ${X} ${g.label}: scritta «nessun episodio» ${msg ? 'presente' : 'assente'}`);
          await p.keyboard.press('Escape');
        }
        // clic su una riga: seleziona il gruppo giusto nello scatter
        const rws = await p.$$('#vxEps tbody tr[data-g]');
        let bad = [];
        for (let i = 0; i < rws.length; i++) {
          const r = rws[i]; const gk = await r.getAttribute('data-g'); await r.click(); await p.waitForTimeout(40);
          D = await dom(p); const hk = D.halo ? D.halo.c.length : 0, gg = gByKey.get(gk);
          if (hk !== (gg ? gg.npts : -1)) bad.push(`${D.rows[i] && D.rows[i].d}→${gk}(${hk} cerchi)`);
          await p.keyboard.press('Escape');
        }
        ok(!bad.length, `${tag} soglia ${X}: clic sulle ${rws.length} righe cliccabili → alone del gruppo ${bad.join(' ')}`);
        const notClick = D.rows.filter((r) => !r.g).map((r) => r.d);
        console.log(`     soglia ${X}: righe non cliccabili ${notClick.length}: ${notClick.join(' ')}`);
      }
      await p.click('#vxTable tr[data-x="40"]'); await p.waitForTimeout(100);
    }
    ok(!errs.length, `${w}-${theme}: console ${errs.join(' | ')}`);
    await ctx.close();
  }

  // ---------- 2. clic su un punto, tooltip e punto vuoto (1440) ----------
  {
    const { ctx, p, errs } = await open(b, 1440, 'dark');
    await p.click('#vxIx button[data-ix="SPX"]'); await p.waitForTimeout(300);
    const D = await dom(p), S = scale(D), E = W.SPX;
    await p.locator('#vxScatter').scrollIntoViewIfNeeded();
    const box = await p.locator('#vxScatter').boundingBox(), k = box.width / D.vb[2];
    const scr = (q) => ({ x: box.x + S.sx(q.vix) * k, y: box.y + S.sy(q.ret) * k });
    // punti isolati: il più vicino sullo schermo deve essere lui
    const iso = E.pts.filter((q) => { const a = scr(q); return E.pts.every((r) => r === q || Math.hypot(scr(r).x - a.x, scr(r).y - a.y) > 8); });
    console.log(`     punti isolati (nessun altro entro 8 px): ${iso.length}`);
    const gl = new Map(E.groups.map((g) => [g.key, g.label]));
    let bad = [];
    for (const q of iso.filter((_, i) => i % Math.max(1, Math.floor(iso.length / 40)) === 0)) {
      const a = scr(q); await p.mouse.move(a.x, a.y); await p.waitForTimeout(40);
      const t = await p.locator('#vxScTip').innerText();
      const vixs = q.vix.toFixed(2).replace('.', ',');
      if (!t.includes(iso2it(q.date)) || !t.includes(gl.get(q.g)) || !t.includes(vixs)) bad.push(`${q.date}: «${t.split('\n').slice(0, 2).join(' / ')}»`);
    }
    ok(!bad.length, `mouse: riquadro dei valori su ${Math.min(iso.length, 40)} punti isolati: data, crisi e VIX ${bad.slice(0, 5).join(' ; ')}`);
    // clic su un punto: seleziona il suo gruppo; secondo clic: toglie; clic su vuoto: toglie
    const q = E.pts.find((x) => x.date === '2020-03-16') || iso[0]; const a = scr(q);
    await p.mouse.click(a.x, a.y); await p.waitForTimeout(100);
    let d2 = await dom(p); ok(d2.sel && d2.halo && d2.halo.c.length === E.groups.find((g) => g.key === q.g).npts, `clic sul punto ${q.date}: seleziona ${q.g}`);
    await p.mouse.click(a.x, a.y); await p.waitForTimeout(100); d2 = await dom(p); ok(!d2.sel, 'secondo clic sullo stesso punto: toglie');
    await p.mouse.click(a.x, a.y); await p.mouse.click(box.x + box.width - 30, box.y + 20); await p.waitForTimeout(100); d2 = await dom(p);
    ok(!d2.sel, 'clic su un punto vuoto (in alto a destra): toglie');
    ok(!errs.length, `clic: console ${errs.join(' | ')}`);
    await ctx.close();
  }
  // ---------- 3. tocco (390) ----------
  {
    const { ctx, p, errs } = await open(b, 390, 'dark', true);
    const D = await dom(p), S = scale(D), E = W.SPX;
    await p.locator('#vxScatter').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const box = await p.locator('#vxScatter').boundingBox(), k = box.width / D.vb[2];
    const scr = (q) => ({ x: box.x + S.sx(q.vix) * k, y: box.y + S.sy(q.ret) * k });
    const iso = E.pts.filter((q) => { const a = scr(q); return E.pts.every((r) => r === q || Math.hypot(scr(r).x - a.x, scr(r).y - a.y) > 6); });
    const gl = new Map(E.groups.map((g) => [g.key, g.label]));
    let bad = [], n = 0;
    for (const q of iso.slice(0, 12)) {
      const a = scr(q); await p.touchscreen.tap(a.x, a.y); await p.waitForTimeout(120); n++;
      const t = await p.locator('#vxScTip').isHidden() ? '' : await p.locator('#vxScTip').innerText(); const d = await dom(p);
      if (!t.includes(iso2it(q.date)) || !t.includes(gl.get(q.g))) bad.push(`${q.date}: «${t.split('\n')[0]}»`);
      if (!d.halo || !d.legend.find((l) => l.pr === 'true' && l.g === q.g)) bad.push(`${q.date}: selezione ${d.legend.filter((l) => l.pr === 'true').map((l) => l.g)}`);
      await p.keyboard.press('Escape');
    }
    ok(n > 0 && !bad.length, `tocco 390: ${n} punti isolati, riquadro e selezione ${bad.slice(0, 4).join(' ; ')}`);
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `390: nessuno scorrimento orizzontale ${sw}`);
    ok(!errs.length, `tocco: console ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(`\n${nok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
