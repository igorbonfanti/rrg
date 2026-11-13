// Ricontrollo 1.6.2: nel browser, colonna «VIX massimo dell'episodio» (valore e data) a 1440 px contro data_massimo.json
// (ricalcolo da FRED VIXCLS sulle sedute di Yahoo, senza js/vix.js); etichette nuove della tabella e del riquadro dei valori
// su tutti i punti grandi; colonna nascosta a 390 px. Raccoglie i testi delle intestazioni e delle note per la lettura.
// Uso: BASE=http://127.0.0.1:8806/ RIC=ricerca/qa/1.6.2/ricontrollo/data_massimo.json NODE_PATH=$(npm root -g) node ricerca/qa/1.6.2/ricontrollo/browser_massimo.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8806/';
const R = JSON.parse(fs.readFileSync(process.env.RIC || 'ricerca/qa/1.6.2/ricontrollo/data_massimo.json', 'utf8'));
let fail = 0, nchk = 0;
const ok = (c, m) => { nchk++; if (!c) { fail++; console.log('FAIL ' + m); } };
const iso = (s) => `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`;
const texts = {};
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600 });
    await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(500);
    let rows = 0, tips = 0;
    for (const ix of ['SPX', 'NDX']) {
      await p.click(`#vxIx button[data-ix="${ix}"]`); await p.waitForTimeout(400);
      for (const X of [20, 25, 30, 40, 50]) {
        await p.click(`#vxTable tr[data-x="${X}"]`); await p.waitForTimeout(300);
        const want = R[ix][String(X)].slice().reverse();
        if (w === 1440) {
          const head = await p.$$eval('#vxEps thead th', (t) => t.map((x) => [x.textContent, x.title]));
          texts[`${ix} ${X}`] = { title: await p.textContent('#vxEpsTitle'), big: await p.textContent('#vxScBig'), head: head.slice(0, 4) };
          ok(head[0][0] === `Primo giorno a ${X} o più`, `${ix} ${X}: intestazione ${head[0][0]}`);
          const got = await p.$$eval('#vxEps tbody tr', (rs) => rs.map((r) => { const td = r.querySelector('td.hmin'); return [r.children[0].textContent, td.childNodes[0].textContent.trim(), (td.querySelector('small') || {}).textContent, getComputedStyle(td).display]; }));
          ok(got.length === want.length, `${ix} ${X}: ${got.length} righe, attese ${want.length}`);
          want.forEach((e, i) => {
            const g = got[i]; if (!g) return; rows++;
            ok(iso(g[0]) === e.date, `${ix} ${X} riga ${i}: ${g[0]} attesa ${e.date}`);
            ok(Math.abs(parseFloat(g[1].replace(',', '.')) - e.vixMax) <= 0.051, `${ix} ${X} ${e.date}: max ${g[1]} atteso ${e.vixMax}`);
            ok(g[2] && iso(g[2]) === e.maxDate, `${ix} ${X} ${e.date}: data del max ${g[2]} attesa ${e.maxDate}`);
            ok(g[3] !== 'none', `${ix} ${X} ${e.date}: colonna nascosta a 1440`);
          });
        } else {
          const vis = await p.$$eval('#vxEps .hmin', (t) => t.filter((x) => getComputedStyle(x).display !== 'none').length);
          ok(vis === 0, `${ix} ${X} 390: ${vis} celle del massimo visibili`);
        }
        // riquadro dei valori su tutti i punti grandi
        const XB = Math.max(30, X);
        const big = await p.$$eval('#vxScatter circle.vxpt.start', (cs) => cs.map((x) => ({ d: x.dataset.d, cx: +x.getAttribute('cx'), cy: +x.getAttribute('cy') })));
        const wantBig = R[ix][String(XB)].map((e) => e.date);
        ok(big.length > 0 && big.every((q) => wantBig.includes(q.d)), `${ix} ${X}: punti grandi non tra gli inizi a ${XB}`);
        await p.evaluate(() => document.getElementById('vxScatter').scrollIntoView({ block: 'center' })); await p.waitForTimeout(50);
        for (const q of (w === 1440 ? big : big.slice(0, 3))) {
          const s = await p.evaluate(([cx, cy]) => { const v = document.getElementById('vxScatter'); const pt = v.createSVGPoint(); pt.x = cx; pt.y = cy; const r = pt.matrixTransform(v.getScreenCTM()); return [r.x, r.y]; }, [q.cx, q.cy]);
          if (w === 1440) { await p.mouse.move(s[0], s[1]); } else { await p.touchscreen.tap(s[0], s[1]); }
          await p.waitForTimeout(30);
          const t = await p.$eval('#vxScTip', (x) => ({ h: x.hidden, rows: [...x.querySelectorAll('.row')].map((r) => [...r.children].map((y) => y.textContent)), txt: x.textContent }));
          if (t.h) { ok(false, `${ix} ${X} ${q.d}: riquadro nascosto`); continue; }
          if (iso(t.rows[0][0]) !== q.d) continue; // punto sovrapposto: non conta
          tips++;
          const kv = Object.fromEntries(t.rows.slice(1).filter((r) => r.length === 2));
          ok(kv['Episodio a 30 o più iniziato il'] != null, `${ix} ${X} ${q.d}: manca «Episodio a 30 o più iniziato il»`);
          if (XB > 30) ok(kv[`Episodio a ${XB} o più iniziato il`] && iso(kv[`Episodio a ${XB} o più iniziato il`]) === q.d, `${ix} ${X} ${q.d}: episodio a ${XB} ${kv[`Episodio a ${XB} o più iniziato il`]}`);
          else ok(iso(kv['Episodio a 30 o più iniziato il']) === q.d, `${ix} ${X} ${q.d}: episodio a 30 ${kv['Episodio a 30 o più iniziato il']}`);
          ok(t.txt.includes(`Primo giorno dell'episodio a ${XB} o più (il punto grande).`), `${ix} ${X} ${q.d}: nota del punto grande`);
          ok(!/sopra/i.test(t.txt), `${ix} ${X} ${q.d}: «sopra» nel riquadro: ${t.txt}`);
          if (w < 600) await p.touchscreen.tap(5, 5);
        }
      }
    }
    ok(!errs.length, `${w}: console ${errs.join(' | ')}`);
    console.log(w, { rows, tips });
    await c.close();
  }
  fs.writeFileSync(process.env.OUT || 'ricerca/qa/1.6.2/ricontrollo/testi_vista.json', JSON.stringify(texts, null, 1));
  console.log(`${nchk} controlli, ${fail} FAIL`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
