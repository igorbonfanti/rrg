// Controlli aggiuntivi della vista 8 VIX (1.5.0): tabelle contro il ricalcolo Python, riga selezionata, anello dello scatter
// che ruba il puntatore, riquadri dentro lo schermo sul telefono, ingrandimenti e contrasto dei colori.
// Uso: BASE=... REF=<ref.json> OUT=<shots> NODE_PATH=$(npm root -g) node extra.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8798/';
const REF = JSON.parse(fs.readFileSync(process.env.REF));
const OUT = process.env.OUT;
let fail = 0, pass = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (c) pass++; else fail++; };
const note = (m) => console.log(`INFO ${m}`);
const ctxOf = async (b, opt, theme) => { const c = await b.newContext(opt); await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme); return c; };
const it = (v, k) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(k).replace('.', ',');
const sg = (v, k = 1) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(k).replace('.', ',') + '%';
const dIT = (d) => d.split('-').reverse().join('/');

(async () => {
  const b = await chromium.launch();
  // ---------- 1. tabelle (S&P 500 e Nasdaq-100, tutte le soglie) ----------
  {
    const ctx = await ctxOf(b, { viewport: { width: 1440, height: 900 } }, 'dark'); const p = await ctx.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxTable tbody tr'); await p.waitForTimeout(500);
    for (const ix of ['SPX', 'NDX']) {
      await p.click(`#vxIx button[data-ix="${ix}"]`); await p.waitForTimeout(300);
      const T = REF.tab[ix];
      const rows = await p.$$eval('#vxTable tbody tr', (t) => t.map((r) => ({ x: r.dataset.x || 'base', cells: [...r.cells].map((c) => c.innerText.replace(/\s+/g, ' ').trim()), sel: r.classList.contains('sel') })));
      // base
      const bse = rows[0].cells, B = T.base;
      const wantB = [21, 63, 126, 252].map((h) => `${Math.round(B[h].pos)}% ${sg(B[h].median)}`);
      ok(wantB.every((w, k) => bse[2 + k] === w) && bse[6] === it(B.dd, 1) + '%', `${ix} riga base: ${bse.slice(2, 7).join(' | ')} (attese ${wantB.join(' | ')} | ${it(B.dd, 1)}%)`);
      for (const X of [20, 25, 30, 40, 50]) {
        const r = rows.find((q) => q.x === String(X)), S = T.thr[X].stats, E = T.thr[X].eps;
        const want = [String(E.length), ...[21, 63, 126, 252].map((h) => (S[h].n ? `${S[h].posN}/${S[h].n} ${sg(S[h].median)}` : '—')), S.dd == null ? '—' : it(S.dd, 1) + '%', S.toMin == null ? '—' : String(Math.round(S.toMin))];
        ok(want.every((w, k) => r.cells[1 + k] === w), `${ix} soglia ${X}: ${r.cells.slice(1).join(' | ')} (attese ${want.join(' | ')})`);
        // episodi della soglia
        await p.click(`#vxTable tr[data-x="${X}"]`); await p.waitForTimeout(200);
        const sel = await p.$$eval('#vxTable tbody tr.sel', (t) => t.map((r) => r.dataset.x));
        ok(sel.join() === String(X), `${ix} soglia ${X}: riga selezionata ${sel.join()}`);
        const er = await p.$$eval('#vxEps tbody tr', (t) => t.map((r) => [...r.cells].map((c) => c.innerText.replace(/\s+/g, ' ').trim())));
        const exp = E.slice().reverse().map((e) => [dIT(e.date), it(e.vix, 1), it(e.vixMax, 1), ...[21, 63, 126, 252].map((h) => (e.ret[h] == null ? 'in corso' : sg(e.ret[h]))), (e.dd == null ? '—' : it(e.dd, 1) + '%') + (e.partial && e.dd != null ? '*' : '')]);
        let bad = [];
        for (let k = 0; k < Math.max(er.length, exp.length); k++) { const g = er[k] ? [er[k][0], er[k][2], er[k][3], er[k][4], er[k][5], er[k][6], er[k][7], er[k][8]] : []; if (g.join('|') !== (exp[k] || []).join('|')) bad.push(`${g.join('|')} ≠ ${(exp[k] || []).join('|')}`); }
        ok(!bad.length && er.length === exp.length, `${ix} episodi sopra ${X}: ${er.length} righe (attese ${exp.length})${bad.length ? ' — ' + bad.slice(0, 3).join(' ; ') : ''}`);
        // colori su/giù delle celle dei rendimenti
        const cls = await p.$$eval('#vxEps tbody tr', (t) => t.map((r) => [...r.cells].slice(4, 8).map((c) => c.className)));
        let cb = 0; cls.forEach((row, k) => row.forEach((c, j) => { const e = E[E.length - 1 - k], v = e.ret[[21, 63, 126, 252][j]]; const w = v == null ? 'muted' : v >= 0 ? 'up' : 'down'; if (!c.includes(w)) cb++; }));
        ok(cb === 0, `${ix} episodi sopra ${X}: colore delle celle (errori ${cb})`);
      }
    }
    // scatter: didascalia contro i numeri ricalcolati
    for (const ix of ['SPX', 'NDX']) {
      await p.click(`#vxIx button[data-ix="${ix}"]`); await p.waitForTimeout(300);
      const R = REF[ix], pts = R.pts, posD = pts.filter((q) => q.ret > 0).length, byEp = new Map(); pts.forEach((q) => byEp.set(q.ep, (byEp.get(q.ep) || 0) + 1));
      const top2 = [...byEp.values()].sort((a, c) => c - a).slice(0, 2).reduce((s, x) => s + x, 0);
      const E30 = REF.tab[ix].thr[30].eps.filter((e) => e.ret[252] != null), posE = E30.filter((e) => e.ret[252] > 0).length;
      const hi = pts.filter((q) => q.vix >= 50), hiE = new Set(hi.map((q) => q.ep)).size;
      const t = (await p.locator('#vxScNote').innerText()).replace(/\s+/g, ' ');
      const want = [`${pts.length} sedute`, `positive dopo 12 mesi ${posD} (${Math.round((100 * posD) / pts.length)}%)`, `da ${byEp.size} episodi`, `positivi ${posE} su ${E30.length}`, `${Math.round((100 * top2) / pts.length)}% dei punti`, `Sopra 50: ${hi.length} sedute da ${hiE}`, `${R.open} sedute recenti`];
      ok(want.every((w) => t.includes(w)), `${ix} didascalia dello scatter: ${want.join(' · ')} → «${t}»`);
    }
    await ctx.close();
  }
  // ---------- 2. anello dello scatter: il puntatore a ~6 px dal punto ----------
  {
    const ctx = await ctxOf(b, { viewport: { width: 1440, height: 900 } }, 'dark'); const p = await ctx.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(500);
    const pe = await p.evaluate(() => getComputedStyle(document.querySelector('#vxScatter .vxring')).pointerEvents);
    // punto isolato: il VIX massimo
    const c = await p.evaluate(() => { const s = document.getElementById('vxScatter'); s.scrollIntoView({ block: 'center' }); const cs = [...s.querySelectorAll('circle.vxpt')]; const m = cs.reduce((a, x) => (+x.getAttribute('cx') > +a.getAttribute('cx') ? x : a)); const pt = s.createSVGPoint(); pt.x = +m.getAttribute('cx'); pt.y = +m.getAttribute('cy'); const r = pt.matrixTransform(s.getScreenCTM()); return [r.x, r.y]; });
    const seq = [];
    for (const dx of [0, 2, 4, 5, 5.5, 6, 6.5, 7, 9]) { await p.mouse.move(c[0] + dx, c[1]); await p.waitForTimeout(60); seq.push(`${dx}:${await p.evaluate(() => (document.getElementById('vxScTip').hidden ? 'nascosto' : 'visibile'))}`); }
    const hitTop = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + (e.getAttribute('class') || '') : null; }, [c[0] + 6, c[1]]);
    note(`anello pointer-events=${pe}; elemento sotto il puntatore a 6 px: ${hitTop}; riquadro: ${seq.join(' ')}`);
    ok(!seq.some((s) => /nascosto/.test(s)), `scatter: il riquadro resta aperto spostando il puntatore sopra l'anello (${seq.join(' ')})`);
    await ctx.close();
  }
  // ---------- 3. riquadri dentro lo schermo sul telefono (tocchi ai bordi) ----------
  for (const [tag, w, h, theme] of [['360-chiaro', 360, 780, 'light'], ['390-scuro', 390, 844, 'dark']]) {
    const ctx = await ctxOf(b, { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, theme); const p = await ctx.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt'); await p.waitForTimeout(500);
    for (const [id, tip] of [['vxScatter', 'vxScTip'], ['vxChart', 'vxTip']]) {
      await p.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'center' }), id); await p.waitForTimeout(200);
      const bb = await p.locator('#' + id).boundingBox();
      const res = [];
      for (const [fx, fy] of [[0.15, 0.2], [0.97, 0.2], [0.97, 0.85], [0.15, 0.85], [0.6, 0.5]]) {
        // per lo scatter si tocca il punto più vicino alla posizione, così il riquadro si apre
        let x = bb.x + bb.width * fx, y = bb.y + bb.height * fy;
        if (id === 'vxScatter') { const q = await p.evaluate(([x0, y0]) => { const s = document.getElementById('vxScatter'); let best = null, bd = 1e9; for (const c of s.querySelectorAll('circle.vxpt')) { const r = c.getBoundingClientRect(); const d = (r.x + r.width / 2 - x0) ** 2 + (r.y + r.height / 2 - y0) ** 2; if (d < bd) { bd = d; best = [r.x + r.width / 2, r.y + r.height / 2]; } } return best; }, [x, y]); x = q[0]; y = q[1]; }
        await p.touchscreen.tap(x, y); await p.waitForTimeout(150);
        const r = await p.evaluate((t) => { const e = document.getElementById(t); if (e.hidden) return null; const b2 = e.getBoundingClientRect(); return [b2.left, b2.top, b2.right, b2.bottom]; }, tip);
        res.push(r ? (r[0] >= 0 && r[2] <= w && r[1] >= 0 && r[3] <= h ? 'dentro' : `fuori ${r.map((v) => v.toFixed(0)).join(',')}`) : 'non aperto');
      }
      ok(res.every((s) => s === 'dentro'), `${tag} ${id}: riquadro dentro lo schermo ai bordi (${res.join(' ; ')})`);
      await p.screenshot({ path: `${OUT}/${tag}-tip-${id}.png` });
    }
    await ctx.close();
  }
  // ---------- 4. 1700 chiaro, 3A: riquadro (ripetuto con il grafico visibile) ----------
  {
    const ctx = await ctxOf(b, { viewport: { width: 1700, height: 1000 } }, 'light'); const p = await ctx.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxChart path.vxvix'); await p.waitForTimeout(500);
    await p.click('#vxRange button[data-range="3A"]'); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('vxChart').scrollIntoView({ block: 'center' }));
    const bb = await p.locator('#vxChart').boundingBox();
    await p.mouse.move(bb.x + bb.width * 0.5, bb.y + 60); await p.waitForTimeout(150);
    const t = await p.evaluate(() => (document.getElementById('vxTip').hidden ? null : document.getElementById('vxTip').innerText.replace(/\s+/g, ' ')));
    ok(!!t, `1700-chiaro 3A: riquadro con il grafico visibile («${t}»)`);
    await p.screenshot({ path: `${OUT}/1700-chiaro-tip-3A.png` });
    await p.screenshot({ path: `${OUT}/1700-chiaro-vista-alto.png` });
    await ctx.close();
  }
  // ---------- 5. ingrandimenti (×3) di angoli e bande ----------
  for (const [tag, theme] of [['scuro', 'dark'], ['chiaro', 'light']]) {
    const ctx = await ctxOf(b, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 }, theme); const p = await ctx.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxChart path.vxvix'); await p.waitForTimeout(500);
    await p.evaluate(() => document.getElementById('vxScatter').scrollIntoView({ block: 'center' }));
    const s = await p.locator('#vxScatter').boundingBox();
    await p.screenshot({ path: `${OUT}/zoom-${tag}-scatter-angolo.png`, clip: { x: s.x + s.width - 200, y: s.y + s.height - 45, width: 200, height: 45 } });
    await p.screenshot({ path: `${OUT}/zoom-${tag}-scatter-sinistra.png`, clip: { x: s.x, y: s.y, width: 260, height: s.height } });
    await p.evaluate(() => document.getElementById('vxChart').scrollIntoView({ block: 'center' }));
    const c = await p.locator('#vxChart').boundingBox();
    await p.screenshot({ path: `${OUT}/zoom-${tag}-premio-2020.png`, clip: { x: c.x + c.width * 0.25, y: c.y + c.height * 0.6, width: 420, height: c.height * 0.4 } });
    await ctx.close();
  }
  // ---------- 6. vista con le impostazioni CVD (classe .cvd) ----------
  {
    const ctx = await ctxOf(b, { viewport: { width: 1440, height: 900 } }, 'light'); const p = await ctx.newPage();
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxChart path.vxvix'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => { document.documentElement.classList.add('cvd'); const b2 = document.querySelector('#vxChart rect.vxhigh'), c = [...document.querySelectorAll('#vxScatter circle.vxpt')].slice(0, 6); return { band: b2 ? getComputedStyle(b2).fill : null, pts: [...new Set([...document.querySelectorAll('#vxScatter circle.vxpt')].map((x) => getComputedStyle(x).fill))] }; });
    note(`con .cvd: banda ${r.band}; colori dei punti ${r.pts.join(' ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(`${pass} OK, ${fail} FAIL`);
})();
