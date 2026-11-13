// Fase 3 · 1.6.2 · numeri e coerenza della vista VIX nel browser contro il ricalcolo indipendente (ricalcolo.json,
// da ricalcolo_episodi.py; NON importa js/vix.js). Controlla a ogni soglia e per entrambi gli indici: tabella degli
// episodi (tutte le colonne), punti dello scatter (insieme, coordinate), punti grandi, riquadro dei valori (anche con crisi evidenziata).
// Uso: BASE=http://127.0.0.1:8805/ RIC=ricerca/qa/1.6.2/ricalcolo.json VAR=B NODE_PATH=$(npm root -g) node ricerca/qa/1.6.2/browser_vix.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8805/';
const R = JSON.parse(fs.readFileSync(process.env.RIC || 'ricerca/qa/1.6.2/ricalcolo.json', 'utf8'));
const VAR = process.env.VAR || 'B';
let fail = 0, nchk = 0; const fails = [];
const ok = (c, m) => { nchk++; if (!c) { fail++; fails.push(m); console.log('FAIL ' + m); } };
const iso = (s) => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`;
const num = (s) => { s = s.trim().replace('−', '-').replace('%', '').replace('+', '').replace(',', '.'); return s === '—' || s === 'in corso' ? null : parseFloat(s.replace('*', '')); };
const near = (a, b, t) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= t);
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
  const p = await c.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(500);
  const stats = { rows: 0, pts: 0, bigs: 0, tips: 0, tipsOverlap: 0 };
  for (const ix of ['SPX', 'NDX']) {
    await p.click(`#vxIx button[data-ix="${ix}"]`); await p.waitForTimeout(400);
    const M = R[`${VAR}_${ix}`], pts = new Map(M.pts.map((q) => [q.date, q]));
    const ep30 = M.eps['30'];
    const epOf = (list, d, needEnd) => { let r = null; for (const e of list) if (e.date <= d && (!needEnd || d <= e.end)) r = e; return r; };
    for (const X of [20, 25, 30, 40, 50]) {
      await p.click(`#vxTable tr[data-x="${X}"]`); await p.waitForTimeout(300);
      // tabella degli episodi
      const rows = await p.$$eval('#vxEps tbody tr', (rs) => rs.map((r) => [...r.children].map((td) => td.textContent)));
      const want = M.eps[String(X)].slice().reverse();
      ok(rows.length === want.length, `${ix} ${X}: righe ${rows.length} attese ${want.length}`);
      want.forEach((e, i) => {
        const r = rows[i]; if (!r) return; stats.rows++;
        ok(iso(r[0]) === e.date, `${ix} ${X} riga ${i}: data ${r[0]} attesa ${e.date}`);
        ok(near(num(r[2]), e.vix, 0.051), `${ix} ${X} ${e.date}: VIX ${r[2]} atteso ${e.vix}`);
        ok(near(num(r[3]), e.vixMax, 0.051), `${ix} ${X} ${e.date}: VIX max ${r[3]} atteso ${e.vixMax}`);
        [21, 63, 126, 252].forEach((h, k) => ok(near(num(r[4 + k]), e.ret[h], 0.051), `${ix} ${X} ${e.date}: ${h} ${r[4 + k]} atteso ${e.ret[h]}`));
        ok(near(num(r[8]), e.dd, 0.051), `${ix} ${X} ${e.date}: calo ${r[8]} atteso ${e.dd}`);
        ok(r[8].includes('*') === (e.partial && e.dd != null), `${ix} ${X} ${e.date}: asterisco calo parziale`);
      });
      // punti dello scatter
      const circ = await p.$$eval('#vxScatter circle.vxpt', (cs) => cs.map((x) => ({ d: x.dataset.d, cx: +x.getAttribute('cx'), cy: +x.getAttribute('cy'), big: x.classList.contains('start'), r: +x.getAttribute('r') })));
      const ticks = await p.$$eval('#vxScatter text.axt', (ts) => ts.map((t) => ({ a: t.getAttribute('text-anchor'), x: +t.getAttribute('x'), y: +t.getAttribute('y'), s: t.textContent })));
      const xt = ticks.filter((t) => t.a === 'middle').map((t) => [parseFloat(t.s), t.x]), yt = ticks.filter((t) => t.a === 'end').map((t) => [parseFloat(t.s.replace('+', '').replace('%', '')), t.y - 3]);
      const lin = (T) => { const [a, b2] = [T[0], T.at(-1)]; const k = (b2[1] - a[1]) / (b2[0] - a[0]); return (v) => a[1] + (v - a[0]) * k; };
      const SX = lin(xt), SY = lin(yt);
      ok(circ.length === M.pts.length, `${ix} ${X}: ${circ.length} punti, attesi ${M.pts.length}`);
      ok(new Set(circ.map((q) => q.d)).size === circ.length && circ.every((q) => pts.has(q.d)), `${ix} ${X}: punti = sedute attese`);
      let bad = 0;
      for (const q of circ) { const e = pts.get(q.d); if (!e) continue; stats.pts++; if (Math.abs(q.cx - SX(e.vix)) > 0.12 || Math.abs(q.cy - SY(e.ret)) > 0.12) { bad++; if (bad < 4) console.log('coord', ix, X, q, e, SX(e.vix), SY(e.ret)); } }
      ok(bad === 0, `${ix} ${X}: ${bad} punti fuori posto`);
      // punti grandi
      const XB = Math.max(30, X), wantBig = M.eps[String(XB)].map((e) => e.date).filter((d) => pts.has(d)).sort();
      const big = circ.filter((q) => q.big).map((q) => q.d).sort();
      ok(big.join() === wantBig.join(), `${ix} ${X}: punti grandi ${big.join(' ')} attesi ${wantBig.join(' ')}`);
      ok(circ.every((q) => q.big === (q.r > 3)), `${ix} ${X}: raggio dei punti grandi`);
      if (X >= 30) { const col = rows.map((r) => iso(r[0])).filter((d) => pts.has(d)).sort(); ok(col.join() === big.join(), `${ix} ${X}: colonna = punti grandi`); }
      stats.bigs += big.length;
      // riquadro dei valori: tutti i punti grandi e un campione fisso di altri
      const others = circ.filter((q) => !q.big).filter((_, i) => i % 23 === 0);
      for (const sel of [null, '2020 Covid', '2007-09 crisi finanziaria']) {
        if (sel) { await p.click(`#vxCrises button[data-g="${sel}"]`); await p.waitForTimeout(150); const on = await p.$$eval('#vxScatter circle.vxpt.on', (cs) => cs.length); ok(on > 0, `${ix} ${X}: crisi ${sel} accesa (${on} punti)`); }
        await p.locator("#vxScatter").scrollIntoViewIfNeeded(); await p.evaluate(() => document.getElementById("vxScatter").scrollIntoView({ block: "center" })); await p.waitForTimeout(50);
        const list = sel ? circ.filter((q) => q.big) : circ.filter((q) => q.big).concat(others);
        for (const q of list) {
          const scr = await p.evaluate(([cx, cy]) => { const s = document.getElementById('vxScatter'); const pt = s.createSVGPoint(); pt.x = cx; pt.y = cy; const r = pt.matrixTransform(s.getScreenCTM()); return [r.x, r.y]; }, [q.cx, q.cy]);
          await p.mouse.move(scr[0], scr[1]); await p.waitForTimeout(15);
          const tip = await p.$eval('#vxScTip', (t) => ({ h: t.hidden, rows: [...t.querySelectorAll('.row')].map((r) => [...r.children].map((x) => x.textContent)), txt: t.textContent }));
          if (tip.h) { ok(false, `${ix} ${X} ${q.d}: riquadro nascosto`); continue; }
          const td = iso(tip.rows[0][0]); stats.tips++;
          if (td !== q.d) { const o = circ.find((z) => z.d === td); stats.tipsOverlap++; ok(o && Math.hypot(o.cx - q.cx, o.cy - q.cy) < 1.5, `${ix} ${X} ${q.d}: riquadro su ${td} lontano`); }
          const e = pts.get(td), kv = Object.fromEntries(tip.rows.slice(1).filter((r) => r.length === 2).map((r) => [r[0], r[1]]));
          ok(near(num(kv.VIX), e.vix, 0.0051), `${ix} ${X} ${td}: VIX riquadro ${kv.VIX} atteso ${e.vix}`);
          const rk = Object.keys(kv).find((k) => /dopo 12 mesi/.test(k)); ok(near(num(kv[rk]), e.ret, 0.051), `${ix} ${X} ${td}: 12 mesi ${kv[rk]} atteso ${e.ret}`);
          const e30 = epOf(ep30, td, true); ok(kv['VIX sopra 30 dal'] && iso(kv['VIX sopra 30 dal']) === (e30 && e30.date), `${ix} ${X} ${td}: sopra 30 dal ${kv['VIX sopra 30 dal']} atteso ${e30 && e30.date}`);
          if (XB > 30) { const eB = epOf(M.eps[String(XB)], td, true), s = kv[`VIX sopra ${XB} dal`]; ok(s != null && (s === '—' ? eB == null : eB && iso(s) === eB.date), `${ix} ${X} ${td}: sopra ${XB} dal ${s} atteso ${eB && eB.date}`); }
          else ok(!Object.keys(kv).some((k) => /sopra (40|50)/.test(k)), `${ix} ${X} ${td}: riga di soglia in più`);
          const isBig = wantBig.includes(td); ok(tip.txt.includes(`Primo giorno con il VIX sopra ${XB}`) === isBig, `${ix} ${X} ${td}: nota punto grande ${isBig}`);
          ok(!/Episodio iniziato/.test(tip.txt), `${ix} ${X} ${td}: vecchia etichetta`);
        }
        if (sel) { await p.click(`#vxCrises button[data-g="${sel}"]`); await p.waitForTimeout(100); }
      }
    }
  }
  ok(!errs.length, `console: ${errs.join(' | ')}`);
  console.log(JSON.stringify(stats));
  console.log(`${nchk} controlli, ${fail} FAIL`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
