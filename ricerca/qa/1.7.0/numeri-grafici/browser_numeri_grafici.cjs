// Fase 3, 1.7.0, tema numeri e grafici: confronta la pagina (tabella degli episodi, mini-grafici, pannello dell'indice,
// riquadro dei valori) con il ricalcolo indipendente di ricalcolo.py (variante B, file data/vix.json decodificato in Python).
// Non importa js/vix.js. Uso:
//   BASE=http://127.0.0.1:8807/ RIC=<ric.json di ricalcolo.py> OUT=<cartella> NODE_PATH=$(npm root -g) node browser_numeri_grafici.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8807/';
const R = JSON.parse(fs.readFileSync(process.env.RIC, 'utf8'));
const OUT = process.env.OUT || '.';
let fail = 0, checks = 0; const issues = [];
const ok = (c, m) => { checks++; if (!c) { fail++; console.log('FAIL ' + m); issues.push(m); } return c; };
const it = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const f = (v, d = 1) => (v == null ? '—' : v.toFixed(d).replace('.', ','));
const XS = [20, 25, 30, 40, 50];
const DAY = 86400000;
const pathPts = (d) => { const out = []; const re = /([MLh])\s*([-\d.]+)(?:\s+([-\d.]+))?/g; let m; while ((m = re.exec(d))) out.push({ c: m[1], x: +m[2], y: m[3] == null ? null : +m[3] }); return out; };

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', 'light'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} });
  const p = await c.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '#vix'); await p.waitForSelector('#vxEps tbody tr', { timeout: 30000 }); await p.waitForTimeout(500);
  const stats = { rows: 0, sparkVerts: 0, hiVerts: 0, bands: 0, ixVerts: 0, ticks: 0, tips: 0 };
  const SPX = R.SPX.B, sd = SPX.dates, n = sd.length;
  for (const ix of ['SPX', 'NDX']) {
    await p.click(`#vxIx button[data-ix="${ix}"]`); await p.waitForTimeout(300);
    const B = R[ix].B, dates = B.dates, vix = B.vix, close = B.close;
    // gruppi (crisi) dello scatter: etichetta -> classe colore
    for (const X of XS) {
      await p.click(`#vxTable tr[data-x="${X}"]`); await p.waitForTimeout(300);
      const groups = await p.$$eval('#vxCrises button', (bs) => bs.map((x) => ({ cls: [...x.classList].find((k) => /^g\d+$/.test(k)), label: x.textContent.trim(), key: x.dataset.g })));
      const g2label = Object.fromEntries(groups.map((g) => [g.cls, g.label]));
      const eps = B.eps[X].slice().reverse();
      const rows = await p.$$eval('#vxEps tbody tr', (rs) => rs.map((r) => {
        const s = r.querySelector('svg.vxsp'); const q = (sel, a) => (s && s.querySelector(sel) ? s.querySelector(sel).getAttribute(a) : null);
        return { cls: [...r.classList].find((k) => /^g\d+$/.test(k)) || null, cells: [...r.children].map((td) => (td.querySelector('svg') ? '' : td.textContent.trim())),
          title: s ? s.querySelector('title').textContent : null, vb: s && s.getAttribute('viewBox'), aria: s && s.getAttribute('aria-label'),
          ty: q('line.vxsp-t', 'y1'), l: q('path.vxsp-l', 'd'), h: q('path.vxsp-h', 'd'), ex: q('line.vxsp-e', 'x1'), ey1: q('line.vxsp-e', 'y1'), ey2: q('line.vxsp-e', 'y2'),
          mx: q('circle.vxsp-m', 'cx'), my: q('circle.vxsp-m', 'cy'), sx: q('circle.vxsp-s', 'cx'), sy: q('circle.vxsp-s', 'cy') };
      }));
      const head = await p.$$eval('#vxEps thead th', (t) => t.map((x) => x.textContent.trim()));
      ok(rows.length === eps.length, `${ix} ${X}: righe ${rows.length}, episodi ricalcolati ${eps.length}`);
      ok(head[0] === `Primo giorno a ${X} o più` && head[2] === 'Andamento del VIX' && head[5] === `Ultimo giorno a ${X} o più` && head[6] === 'Sedute', `${ix} ${X}: intestazioni ${head.slice(0, 7).join(' | ')}`);
      eps.forEach((e, k) => {
        const r = rows[k]; if (!r) return; stats.rows++;
        const tag = `${ix} ${X} ${e.date}`, cs = r.cells;
        ok(cs[0] === it(e.date), `${tag}: primo giorno ${cs[0]}`);
        ok(cs[1].replace(/^\s*/, '') === (e.crisis || '—'), `${tag}: crisi «${cs[1]}» attesa «${e.crisis || '—'}»`);
        ok(cs[3] === f(e.vix), `${tag}: VIX quel giorno ${cs[3]} atteso ${f(e.vix)}`);
        ok(cs[4] === `${f(e.vixMax)} ${it(e.maxDate)}`, `${tag}: massimo «${cs[4]}» atteso «${f(e.vixMax)} ${it(e.maxDate)}»`);
        ok(cs[5] === it(e.end) + (e.finished ? '' : '*'), `${tag}: ultimo giorno «${cs[5]}» atteso «${it(e.end)}${e.finished ? '' : '*'}»`);
        ok(cs[6] === String(e.sessions), `${tag}: sedute ${cs[6]} attese ${e.sessions}`);
        // title
        const w = e.win;
        const T = `VIX da ${it(w.d0)}: ${f(w.v0)}; primo giorno a ${X} o più il ${it(e.date)} (${f(e.vix)}); massimo ${f(e.vixMax)} il ${it(e.maxDate)}; ultimo giorno a ${X} o più il ${it(e.end)}; poi fino al ${it(w.d1)}: ${f(w.v1)}`;
        ok(r.title === T, `${tag}: title\n   pagina: ${r.title}\n   atteso: ${T}`);
        ok(r.aria === r.title, `${tag}: aria-label uguale al title`);
        // geometria: W, H, pad dal viewBox; scala ricavata dalla linea della soglia, poi confrontata con il massimo della finestra
        const [, , W, H] = r.vb.split(' ').map(Number), pad = 3, i0 = w.i0, i1 = w.i1;
        const vals = w.vals, hiExp = Math.max(X, ...vals.filter((v) => v != null)) * 1.06;
        const SX = (i) => pad + ((i - i0) / Math.max(1, i1 - i0)) * (W - 2 * pad), SY = (v) => H - pad - (v / hiExp) * (H - 2 * pad);
        ok(Math.abs(+r.ty - SY(X)) <= 0.06, `${tag}: linea della soglia a y=${r.ty}, attesa ${SY(X).toFixed(2)}`);
        const L = pathPts(r.l).filter((q) => q.c !== 'h');
        const expL = []; vals.forEach((v, k2) => { if (v != null) expL.push({ x: SX(i0 + k2), y: SY(v), M: k2 === 0 || vals[k2 - 1] == null }); });
        ok(L.length === expL.length, `${tag}: vertici della linea ${L.length}, attesi ${expL.length}`);
        let badL = 0; L.forEach((q, k2) => { const ex = expL[k2]; if (!ex || Math.abs(q.x - ex.x) > 0.06 || Math.abs(q.y - ex.y) > 0.06 || (q.c === 'M') !== ex.M) badL++; });
        stats.sparkVerts += L.length;
        ok(!badL, `${tag}: ${badL} vertici della linea fuori posto`);
        // tratti colorati: vertici esattamente nelle sedute dell'episodio con VIX >= X
        const Hh = pathPts(r.h).filter((q) => q.c !== 'h');
        const aboveIdx = e.above.map((d) => dates.indexOf(d, i0));
        const expH = aboveIdx.map((i) => ({ x: SX(i), y: SY(vix[i]) }));
        stats.hiVerts += Hh.length;
        ok(Hh.length === expH.length && Hh.every((q, k2) => Math.abs(q.x - expH[k2].x) <= 0.06 && Math.abs(q.y - expH[k2].y) <= 0.06), `${tag}: tratti colorati ${Hh.length} vertici, attesi ${expH.length}`);
        // le giunzioni L solo tra sedute consecutive a X o più
        const segBad = pathPts(r.h).filter((q) => q.c !== 'h').filter((q, k2) => q.c === 'L' && !(aboveIdx[k2] - aboveIdx[k2 - 1] === 1)).length;
        ok(!segBad, `${tag}: ${segBad} tratti colorati che uniscono sedute non consecutive`);
        // primo giorno, massimo, ultimo giorno
        ok(Math.abs(+r.sx - SX(e.p)) <= 0.06 && Math.abs(+r.sy - SY(e.vix)) <= 0.06, `${tag}: punto pieno (${r.sx},${r.sy}) atteso (${SX(e.p).toFixed(1)},${SY(e.vix).toFixed(1)})`);
        ok(Math.abs(+r.mx - SX(e.maxP)) <= 0.06 && Math.abs(+r.my - SY(e.vixMax)) <= 0.06, `${tag}: cerchio del massimo (${r.mx},${r.my}) atteso (${SX(e.maxP).toFixed(1)},${SY(e.vixMax).toFixed(1)})`);
        ok(Math.abs(+r.ex - SX(e.endP)) <= 0.06 && Math.abs((+r.ey1 + +r.ey2) / 2 - SY(vix[e.endP])) <= 0.06, `${tag}: tacca (${r.ex}) attesa (${SX(e.endP).toFixed(1)})`);
        // finestra: 63 sedute prima, 21 dopo
        // dalla pagina: sedute (con VIX) disegnate prima del punto pieno e dopo la tacca
        const before = L.filter((q) => q.x < +r.sx - 0.01).length, after = L.filter((q) => q.x > +r.ex + 0.01).length;
        const expB = vals.slice(0, e.p - i0).filter((v) => v != null).length, expA = vals.slice(e.endP - i0 + 1).filter((v) => v != null).length;
        ok(e.p - i0 === Math.min(63, e.p) && i1 - e.endP === Math.min(21, n - 1 - e.endP) && before === expB && after === expA, `${tag}: finestra della pagina ${before} vertici prima, ${after} dopo (attesi ${expB}, ${expA})`);
        // colore della riga: gruppo della crisi (o dell'episodio a 30 in corso)
        if (r.cls) ok(!e.crisis || g2label[r.cls] === e.crisis, `${tag}: colore della riga ${r.cls} = «${g2label[r.cls]}», crisi «${e.crisis}»`);
        else console.log(`  nota: ${tag} senza colore (crisi ${e.crisis || '—'})`);
        e._cls = r.cls;
      });
      // pannello dell'indice a 3A, 10A, MAX
      for (const rg of ['3A', '10A', 'MAX']) {
        await p.click(`#vxRange button[data-range="${rg}"]`); await p.waitForTimeout(250);
        const G = await p.evaluate(() => {
          const s = document.getElementById('vxChart'), vb = s.getAttribute('viewBox').split(' ').map(Number), fr = [...s.querySelectorAll('rect.frame')].map((r) => ({ y: +r.getAttribute('y'), h: +r.getAttribute('height'), x: +r.getAttribute('x'), w: +r.getAttribute('width') }));
          const titles = [...s.querySelectorAll('text.pane-t')].map((t) => t.textContent);
          const bands = [...s.querySelectorAll('rect.vxepb')].map((r) => ({ x: +r.getAttribute('x'), w: +r.getAttribute('width'), y: +r.getAttribute('y'), h: +r.getAttribute('height'), cls: [...r.classList].find((k) => /^g\d+$/.test(k)) || null }));
          const ixp = s.querySelector('path.vxix').getAttribute('d');
          const axt = [...s.querySelectorAll('text.axt')].map((t) => ({ x: +t.getAttribute('x'), y: +t.getAttribute('y'), t: t.textContent, bb: t.getBBox() }));
          return { vb, fr, titles, bands, ixp, axt };
        });
        const W = G.vb[2], Lm = 8, PW = W - 8 - 46, PI = G.fr[1];
        ok(G.titles[1].startsWith(ix === 'SPX' ? 'S&P 500' : 'NASDAQ-100') && G.titles[1].includes(`${X} O PIÙ`), `${ix} ${X} ${rg}: titolo del pannello «${G.titles[1]}»`);
        const t1 = Date.parse(sd[n - 1]), span = rg === '3A' ? 3 : rg === '10A' ? 10 : null, t0 = span ? Math.max(Date.parse(sd[0]), t1 - span * 365.25 * DAY) : Date.parse(sd[0]);
        const xOf = (t) => Lm + ((t - t0) / (t1 - t0)) * PW;
        const vis = B.eps[X].filter((e) => Date.parse(e.end) >= t0 && Date.parse(e.date) <= t1);
        ok(G.bands.length === vis.length, `${ix} ${X} ${rg}: fasce ${G.bands.length}, episodi visibili ${vis.length}`);
        vis.forEach((e, k) => {
          const bd = G.bands[k]; if (!bd) return; stats.bands++;
          const a = Math.max(t0, Date.parse(e.date)), bb = Math.min(t1, Date.parse(e.end)), xa = xOf(a), xb = xOf(bb);
          ok(Math.abs(bd.x - xa) <= 0.06 && Math.abs(bd.w - Math.max(1.5, xb - xa)) <= 0.11, `${ix} ${X} ${rg} ${e.date}: fascia x=${bd.x} w=${bd.w}, attesa x=${xa.toFixed(2)} w=${Math.max(1.5, xb - xa).toFixed(2)}`);
          ok(bd.y === PI.y && bd.h === PI.h, `${ix} ${X} ${rg} ${e.date}: fascia dentro il pannello dell'indice`);
          const rowE = B.eps[X].find((z) => z.date === e.date);
          ok(bd.cls === (rowE && rowE._cls !== undefined ? rowE._cls : bd.cls), `${ix} ${X} ${rg} ${e.date}: colore della fascia ${bd.cls} diverso dalla riga ${rowE && rowE._cls}`);
          if (Date.parse(e.date) < t0) console.log(`  bordo: ${ix} ${X} ${rg} episodio dal ${e.date} iniziato prima del periodo (fascia dal bordo sinistro, nessun segno)`);
        });
        // prezzi: vertici della linea alle date giuste e al prezzo giusto (scala logaritmica)
        const inW = []; dates.forEach((d, i) => { const t = Date.parse(d); if (t >= t0 && t <= t1 && close[i] != null) inW.push(i); });
        const ys = inW.map((i) => close[i]), lo = Math.log(Math.min(...ys)) - 0.03, hi = Math.log(Math.max(...ys)) + 0.03;
        const fi = (v) => PI.y + ((hi - Math.log(v)) / (hi - lo)) * PI.h;
        const V = pathPts(G.ixp); stats.ixVerts += V.length;
        let bad = 0, worst = 0; V.forEach((q, k) => { const i = inW[k]; if (i == null) { bad++; return; } const dx = Math.abs(q.x - xOf(Date.parse(dates[i]))), dy = Math.abs(q.y - fi(close[i])); worst = Math.max(worst, dy); if (dx > 0.06 || dy > 0.06) bad++; });
        ok(V.length === inW.length && !bad, `${ix} ${X} ${rg}: linea dell'indice ${V.length} vertici (attesi ${inW.length}), ${bad} fuori posto`);
        // la linea dell'indice deve restare dentro il pannello
        ok(V.every((q) => q.y >= PI.y && q.y <= PI.y + PI.h), `${ix} ${X} ${rg}: linea dell'indice dentro il pannello`);
        // etichette della scala logaritmica
        const tk = G.axt.filter((t) => t.y - 3 >= PI.y - 0.5 && t.y - 3 <= PI.y + PI.h + 0.5 && t.x > W - 50);
        stats.ticks += tk.length;
        ok(tk.length >= 2, `${ix} ${X} ${rg}: ${tk.length} etichette dei prezzi (${tk.map((t) => t.t).join(' ')})`);
        tk.forEach((t) => {
          const val = t.t.endsWith('k') ? parseFloat(t.t.slice(0, -1).replace(',', '.')) * 1000 : parseFloat(t.t.replace(/\./g, '').replace(',', '.'));
          ok(Math.abs(fi(val) - (t.y - 3)) < 0.6, `${ix} ${X} ${rg}: etichetta «${t.t}» a y=${t.y - 3}, valore a quella altezza ${Math.exp(hi - ((t.y - 3 - PI.y) / PI.h) * (hi - lo)).toFixed(0)}`);
        });
        for (let k = 1; k < tk.length; k++) ok(Math.abs(tk[k].y - tk[k - 1].y) >= 12, `${ix} ${X} ${rg}: etichette «${tk[k - 1].t}» e «${tk[k].t}» sovrapposte`);
        // riquadro dei valori: tre sedute (una dentro un episodio se c'è)
        const probe = [];
        if (vis.length) { const e = vis[Math.floor(vis.length / 2)]; probe.push(e.date < sd[0] ? e.end : e.date); probe.push(e.end); }
        probe.push(sd.find((d) => Date.parse(d) >= t0 + (t1 - t0) * 0.37));
        const box = await p.$('#vxChart').then((h) => h.boundingBox());
        for (const d of probe) {
          if (Date.parse(d) < t0) continue;
          const sxp = box.x + (xOf(Date.parse(d)) / W) * box.width + 0.2 * box.width / W;
          const syp = box.y + ((PI.y + PI.h / 2) / G.vb[3]) * box.height;
          await p.mouse.move(sxp, syp); await p.waitForTimeout(60);
          const tip = await p.$eval('#vxTip', (t) => t.innerText);
          const dd = (tip.match(/(\d\d\/\d\d\/\d{4})/) || [])[1];
          const iso = dd && `${dd.slice(6)}-${dd.slice(3, 5)}-${dd.slice(0, 2)}`, i = dates.indexOf(iso);
          stats.tips++;
          if (!ok(i >= 0, `${ix} ${X} ${rg}: riquadro senza data riconoscibile (${tip.slice(0, 60)})`)) continue;
          const cl = Math.round(close[i]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          const nm = ix === 'SPX' ? 'S&P 500' : 'Nasdaq-100';
          ok(tip.includes(`${nm} ${cl}`), `${ix} ${X} ${rg} ${iso}: riquadro «${tip.split('\n')[0]}» atteso «${nm} ${cl}»`);
          const ep = B.eps[X].find((e) => e.date <= iso && iso <= e.end);
          const expT = ep ? `Nell'episodio a ${X} o più dal ${it(ep.date)} al ${it(ep.end)}${ep.crisis ? ` (${ep.crisis})` : ''}` : null;
          ok(ep ? tip.includes(expT) : !tip.includes("Nell'episodio"), `${ix} ${X} ${rg} ${iso}: riga dell'episodio nel riquadro (attesa «${expT}»)\n   ${tip.replace(/\n/g, ' / ')}`);
          const vx = vix[i] == null ? '—' : vix[i].toFixed(2).replace('.', ',');
          ok(tip.includes(`VIX\t${vx}`) || tip.includes(`VIX ${vx}`) || tip.includes(`VIX\n${vx}`), `${ix} ${X} ${rg} ${iso}: VIX nel riquadro (atteso ${vx})`);
        }
        await p.mouse.move(2, 2);
      }
      await p.click('#vxRange button[data-range="10A"]'); await p.waitForTimeout(150);
    }
  }
  ok(!errs.length, `console: ${errs.join(' | ')}`);
  console.log(JSON.stringify(stats));
  console.log(`${checks} controlli, ${fail} FAIL`);
  fs.writeFileSync(OUT + '/browser_esito.json', JSON.stringify({ checks, fail, stats, issues }, null, 1));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
