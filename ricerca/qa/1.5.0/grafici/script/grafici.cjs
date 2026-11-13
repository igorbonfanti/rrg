// Controllo indipendente dei grafici della vista 8 VIX (1.5.0). Confronta il disegno (coordinate SVG lette dal DOM,
// riportate ai valori con le etichette degli assi) con il ricalcolo Python di riferimento.py, non con js/vix.js.
// Uso: BASE=http://127.0.0.1:8798/ REF=<ref.json> OUT=<cartella shots> NODE_PATH=$(npm root -g) node grafici.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8798/';
const REF = JSON.parse(fs.readFileSync(process.env.REF));
const OUT = process.env.OUT;
let fail = 0, pass = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (c) pass++; else fail++; };
const note = (m) => console.log(`INFO ${m}`);
const DAY = 86400000;
const lin = (a, b) => { // regressione lineare: valore -> coordinata
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; }
  const k = sab / saa; return { k, q: mb - k * ma, f: (v) => mb + k * (v - ma), inv: (c) => ma + (c - mb) / k };
};
const ctxOf = async (b, opt, theme) => { const c = await b.newContext(opt); await c.addInitScript((t) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme); return c; };

async function readScatter(p) {
  return p.evaluate(() => {
    const s = document.getElementById('vxScatter'), vb = s.viewBox.baseVal;
    const txt = [...s.querySelectorAll('text.axt')].map((t) => ({ s: t.textContent, x: +t.getAttribute('x'), y: +t.getAttribute('y'), anchor: t.getAttribute('text-anchor'), bb: (() => { const b = t.getBBox(); return [b.x, b.y, b.width, b.height]; })() }));
    const lines = [...s.querySelectorAll('line')].map((l) => ({ c: l.getAttribute('class'), x1: +l.getAttribute('x1'), x2: +l.getAttribute('x2'), y1: +l.getAttribute('y1'), y2: +l.getAttribute('y2') }));
    const pts = [...s.querySelectorAll('circle.vxpt')].map((c) => ({ cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy'), r: +c.getAttribute('r'), cls: c.getAttribute('class'), fill: getComputedStyle(c).fill, op: getComputedStyle(c).opacity }));
    const fr = s.querySelector('rect.frame'); const frame = { x: +fr.getAttribute('x'), y: +fr.getAttribute('y'), w: +fr.getAttribute('width'), h: +fr.getAttribute('height') };
    const bcr = s.getBoundingClientRect();
    return { vb: [vb.width, vb.height], px: [bcr.width, bcr.height], txt, lines, pts, frame };
  });
}
async function readChart(p) {
  return p.evaluate(() => {
    const s = document.getElementById('vxChart'), vb = s.viewBox.baseVal;
    const txt = [...s.querySelectorAll('text')].map((t) => { const b = t.getBBox(); return { c: t.getAttribute('class'), s: t.textContent, x: +t.getAttribute('x'), y: +t.getAttribute('y'), bb: [b.x, b.y, b.width, b.height] }; });
    const lines = [...s.querySelectorAll('line')].map((l) => ({ c: l.getAttribute('class'), x1: +l.getAttribute('x1'), x2: +l.getAttribute('x2'), y1: +l.getAttribute('y1'), y2: +l.getAttribute('y2') }));
    const paths = {}; for (const k of ['vxvix', 'vxrv', 'vxprem']) { const e = s.querySelector('path.' + k); paths[k] = { d: e.getAttribute('d'), stroke: getComputedStyle(e).stroke, sw: getComputedStyle(e).strokeWidth }; }
    const frames = [...s.querySelectorAll('rect.frame')].map((r) => ({ x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') }));
    const bands = [...s.querySelectorAll('rect.vxhigh')].map((r) => ({ x: +r.getAttribute('x'), w: +r.getAttribute('width'), y: +r.getAttribute('y'), h: +r.getAttribute('height'), fill: getComputedStyle(r).fill, fo: getComputedStyle(r).fillOpacity }));
    const leg = [...document.querySelectorAll('#vxLegend .kl, #vxLegend .kb')].map((k) => ({ c: k.className, bg: getComputedStyle(k).backgroundColor, op: getComputedStyle(k).opacity }));
    const bcr = s.getBoundingClientRect();
    return { vb: [vb.width, vb.height], px: [bcr.width, bcr.height], txt, lines, paths, frames, bands, leg, bg: getComputedStyle(document.body).backgroundColor, panelBg: getComputedStyle(document.querySelector('#vxWrap').closest('.panel')).backgroundColor };
  });
}
const parsePath = (d) => { const segs = []; let cur = null; for (const m of d.matchAll(/([ML])([-\d.]+) ([-\d.]+)/g)) { if (m[1] === 'M') { cur = []; segs.push(cur); } cur.push([+m[2], +m[3]]); } return segs; };

async function checkScatter(p, tag, ix) {
  const S = await readScatter(p), R = REF[ix];
  ok(S.pts.length === R.pts.length, `${tag} scatter ${ix}: ${S.pts.length} punti, attesi ${R.pts.length}`);
  // scale dalle etichette degli assi
  const xl = S.txt.filter((t) => /^\d+$/.test(t.s)), yl = S.txt.filter((t) => /%$/.test(t.s));
  const fx = lin(xl.map((t) => +t.s), xl.map((t) => t.x)), fy = lin(yl.map((t) => parseFloat(t.s.replace('+', ''))), yl.map((t) => t.y - 3));
  let maxdx = 0, maxdy = 0, startBad = 0, sizeBad = 0, out = 0;
  const n = Math.min(S.pts.length, R.pts.length);
  for (let i = 0; i < n; i++) {
    const s = S.pts[i], r = R.pts[i];
    maxdx = Math.max(maxdx, Math.abs(fx.inv(s.cx) - r.vix)); maxdy = Math.max(maxdy, Math.abs(fy.inv(s.cy) - r.ret));
    if (/start/.test(s.cls) !== r.start) startBad++;
    if ((s.r > 3) !== r.start) sizeBad++;
    if (s.cx - s.r < S.frame.x - 0.01 || s.cx + s.r > S.frame.x + S.frame.w + 0.01 || s.cy - s.r < S.frame.y - 0.01 || s.cy + s.r > S.frame.y + S.frame.h + 0.01) out++;
  }
  const ux = Math.abs(1 / fx.k), uy = Math.abs(1 / fy.k); // valore per unità SVG
  ok(maxdx <= ux * 0.06 + 0.005, `${tag} scatter ${ix}: ascissa = VIX (scarto massimo ${maxdx.toFixed(3)} punti, mezza cifra di arrotondamento ${(ux * 0.05).toFixed(3)})`);
  ok(maxdy <= uy * 0.06 + 0.005, `${tag} scatter ${ix}: ordinata = rendimento 252 sedute dalla seduta dopo (scarto massimo ${maxdy.toFixed(3)} punti %)`);
  ok(startBad === 0 && sizeBad === 0, `${tag} scatter ${ix}: primi giorni degli episodi (classe start ${startBad} errori, raggio ${sizeBad})`);
  note(`${tag} scatter ${ix}: punti che sporgono dal riquadro ${out}`);
  // colori: stesso episodio stessa classe, episodi consecutivi classi diverse
  const byEp = new Map(); let mixed = 0;
  for (let i = 0; i < n; i++) { const c = (S.pts[i].cls.match(/c\d/) || [''])[0]; const e = R.pts[i].ep; if (byEp.has(e) && byEp.get(e) !== c) mixed++; byEp.set(e, c); }
  const epl = [...byEp.keys()]; let same = 0; for (let i = 1; i < epl.length; i++) if (byEp.get(epl[i]) === byEp.get(epl[i - 1])) same++;
  ok(mixed === 0 && same === 0, `${tag} scatter ${ix}: un colore per episodio (${byEp.size} episodi con punti; misti ${mixed}, consecutivi uguali ${same})`);
  // linee 40, 50 e zero
  const thr = S.lines.filter((l) => l.c === 'vxthr').map((l) => +fx.inv(l.x1).toFixed(2)), zero = S.lines.filter((l) => l.c === 'vxzero').map((l) => +fy.inv(l.y1).toFixed(2));
  ok(thr.join() === '40,50' && zero.join() === '0', `${tag} scatter ${ix}: soglie verticali ${thr} e zero ${zero}`);
  // assi: copertura dei dati
  const vmax = Math.max(...R.pts.map((q) => q.vix)), rmin = Math.min(...R.pts.map((q) => q.ret)), rmax = Math.max(...R.pts.map((q) => q.ret));
  const xr = [fx.inv(S.frame.x), fx.inv(S.frame.x + S.frame.w)], yr = [fy.inv(S.frame.y + S.frame.h), fy.inv(S.frame.y)];
  ok(xr[0] <= 30.001 && xr[1] >= vmax && yr[0] <= rmin && yr[1] >= rmax, `${tag} scatter ${ix}: assi coprono i dati (x ${xr.map((v) => v.toFixed(1))}, y ${yr.map((v) => v.toFixed(1))}; dati VIX max ${vmax}, rend. ${rmin.toFixed(1)}..${rmax.toFixed(1)})`);
  // etichette che si sovrappongono o escono
  const T = S.txt; let ov = [], cut = [];
  for (let i = 0; i < T.length; i++) { const a = T[i].bb; if (a[0] < -0.5 || a[0] + a[2] > S.vb[0] + 0.5 || a[1] < -0.5 || a[1] + a[3] > S.vb[1] + 0.5) cut.push(T[i].s); for (let j = i + 1; j < T.length; j++) { const b = T[j].bb; if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) ov.push(`${T[i].s}|${T[j].s}`); } }
  ok(!ov.length && !cut.length, `${tag} scatter ${ix}: etichette senza sovrapposizioni (${ov.join(' ; ') || '-'}) né tagli (${cut.join(' ; ') || '-'})`);
  return { S, fx, fy };
}

async function hoverScatter(p, tag, ix, info, touch) {
  const R = REF[ix];
  // 3 punti: il massimo VIX, il peggior rendimento, un primo giorno di episodio
  const picks = [R.pts.reduce((a, b) => (b.vix > a.vix ? b : a)), R.pts.reduce((a, b) => (b.ret < a.ret ? b : a)), R.pts.filter((q) => q.start)[3]];
  for (const q of picks) {
    const i = R.pts.indexOf(q), c = info.S.pts[i];
    const sc = await p.evaluate(([x, y]) => { const s = document.getElementById('vxScatter'); s.scrollIntoView({ block: 'center' }); const pt = s.createSVGPoint(); pt.x = x; pt.y = y; const r = pt.matrixTransform(s.getScreenCTM()); return [r.x, r.y]; }, [c.cx, c.cy]);
    if (touch) await p.touchscreen.tap(sc[0], sc[1]); else { await p.mouse.move(sc[0] + 1, sc[1] + 1); await p.mouse.move(sc[0], sc[1]); }
    await p.waitForTimeout(150);
    const tip = await p.evaluate(() => { const t = document.getElementById('vxScTip'); return t.hidden ? null : t.innerText; });
    if (!tip) { ok(false, `${tag} tip scatter ${ix} ${q.date}: riquadro non visibile`); continue; }
    const d = q.date.split('-').reverse().join('/');
    const vixS = q.vix.toFixed(2).replace('.', ','), retS = (q.ret >= 0 ? '+' : '−') + Math.abs(q.ret).toFixed(1).replace('.', ',') + '%';
    const epS = q.ep.split('-').reverse().join('/');
    // un altro punto alla stessa posizione (stesso VIX e rendimento entro 0,5 px) rende ambiguo il riquadro
    const twins = R.pts.filter((o, k) => k !== i && Math.hypot(info.S.pts[k].cx - c.cx, info.S.pts[k].cy - c.cy) < 0.5).length;
    const good = tip.includes(d) && tip.includes(vixS) && (tip.includes(retS) || tip.replace('-', '−').includes(retS)) && tip.includes(epS) && (q.start === /Primo giorno/.test(tip));
    ok(good || twins > 0, `${tag} tip scatter ${ix} ${q.date}: data ${d}, VIX ${vixS}, rend. ${retS}, episodio ${epS}${twins ? ` (${twins} punti sovrapposti)` : ''} → «${tip.replace(/\s+/g, ' ').slice(0, 140)}»`);
  }
}

async function checkChart(p, tag, range) {
  const C = await readChart(p), Rf = REF.chart;
  const n = Rf.dates.length, t1 = Date.parse(Rf.dates[n - 1]);
  const t0 = range === 'MAX' ? Date.parse(Rf.dates[0]) : Math.max(Date.parse(Rf.dates[0]), t1 - (range === '3A' ? 3 : 10) * 365.25 * DAY);
  const inW = (i) => { const t = Date.parse(Rf.dates[i]); return t >= t0 && t <= t1; };
  // asse x dagli anni (etichette e griglia verticale)
  const yrs = C.txt.filter((t) => /^\d{4}$/.test(t.s));
  const fxT = lin(yrs.map((t) => Date.parse(`${t.s}-01-01`)), yrs.map((t) => t.x));
  const fr = C.frames;
  ok(Math.abs(fxT.f(t0) - fr[0].x) < 0.6 && Math.abs(fxT.f(t1) - (fr[0].x + fr[0].w)) < 0.6, `${tag} ${range}: bordi del periodo (sinistra ${fxT.f(t0).toFixed(1)} contro ${fr[0].x}, destra ${fxT.f(t1).toFixed(1)} contro ${fr[0].x + fr[0].w})`);
  // asse y pannello 1 dalle etichette, pannello 2 dalle etichette
  const right = C.txt.filter((t) => t.c === 'axt' && /^[+−-]?\d+$/.test(t.s) && !/^\d{4}$/.test(t.s));
  const y0l = right.filter((t) => t.y < fr[0].y + fr[0].h + 4), y1l = right.filter((t) => t.y > fr[1].y - 2);
  const fy0 = lin(y0l.map((t) => +t.s), y0l.map((t) => t.y - 3)), fy1 = lin(y1l.map((t) => +t.s.replace('+', '').replace('−', '-')), y1l.map((t) => t.y - 3));
  note(`${tag} ${range}: etichette pannello 1 ${y0l.map((t) => t.s).join(',')}; pannello 2 ${y1l.map((t) => t.s).join(',')}; anni ${yrs.map((t) => t.s).join(',')}`);
  const pane1Lo = fy0.inv(fr[0].y + fr[0].h);
  ok(Math.abs(pane1Lo) < 0.05, `${tag} ${range}: pannello 1 parte da 0 (${pane1Lo.toFixed(3)})`);
  const res = {};
  for (const [k, ser, fy] of [['vxvix', Rf.vix, fy0], ['vxrv', Rf.rv, fy0], ['vxprem', Rf.prem, fy1]]) {
    const segs = parsePath(C.paths[k].d), P = segs.flat();
    const idx = []; for (let i = 0; i < n; i++) if (inW(i) && ser[i] != null) idx.push(i);
    let mdy = 0, mdt = 0;
    const m = Math.min(P.length, idx.length);
    for (let j = 0; j < m; j++) { const i = idx[j]; mdy = Math.max(mdy, Math.abs(fy.inv(P[j][1]) - ser[i])); mdt = Math.max(mdt, Math.abs(fxT.inv(P[j][0]) - Date.parse(Rf.dates[i])) / DAY); }
    const uy = Math.abs(1 / fy.k), ut = Math.abs(1 / fxT.k) / DAY;
    ok(P.length === idx.length && mdy <= uy * 0.06 + 1e-3 && mdt <= ut * 0.06 + 0.01, `${tag} ${range} ${k}: ${P.length} vertici (attesi ${idx.length}, ${segs.length} tratti); scarto valore ${mdy.toFixed(3)} (tolleranza ${(uy * 0.06).toFixed(3)}), data ${mdt.toFixed(2)} g (toll. ${(ut * 0.06).toFixed(2)})`);
    // massimo e minimo dentro il riquadro
    const ys = P.map((q) => q[1]); const f = k === 'vxprem' ? fr[1] : fr[0];
    ok(Math.min(...ys) >= f.y - 0.01 && Math.max(...ys) <= f.y + f.h + 0.01, `${tag} ${range} ${k}: linea dentro il pannello (y ${Math.min(...ys).toFixed(1)}..${Math.max(...ys).toFixed(1)}, pannello ${f.y}..${f.y + f.h})`);
    res[k] = { segs: segs.length };
  }
  // zero del premio
  const z = C.lines.filter((l) => l.c === 'vxzero');
  ok(z.length === 1 && Math.abs(fy1.inv(z[0].y1)) < 0.05, `${tag} ${range}: linea dello zero del premio a ${z.length ? fy1.inv(z[0].y1).toFixed(3) : '-'}`);
  // bande: tratti consecutivi con percentile ≥ 80 dentro il periodo
  const runs = []; let s = null, pv = null;
  for (let i = 0; i < n; i++) { if (!inW(i)) continue; const on = Rf.pp[i] != null && Rf.pp[i] >= 80; if (on) { if (s == null) s = i; pv = i; } else if (s != null) { runs.push([s, pv]); s = null; } }
  if (s != null) runs.push([s, pv]);
  let bad = 0; const B = C.bands;
  for (let j = 0; j < Math.min(B.length, runs.length); j++) { const a = fxT.f(Date.parse(Rf.dates[runs[j][0]])), b = fxT.f(Date.parse(Rf.dates[runs[j][1]])); if (Math.abs(B[j].x - a) > 0.6 || Math.abs(B[j].x + B[j].w - Math.max(a + 1, b)) > 0.6) bad++; }
  ok(B.length === runs.length && bad === 0, `${tag} ${range}: bande del premio ≥ 80° percentile ${B.length} (attese ${runs.length}, fuori posto ${bad})`);
  const inPane = B.every((b) => Math.abs(b.y - fr[1].y) < 0.01 && Math.abs(b.h - fr[1].h) < 0.01 && b.x >= fr[1].x - 0.01 && b.x + b.w <= fr[1].x + fr[1].w + 1.01);
  ok(inPane, `${tag} ${range}: bande dentro il pannello del premio`);
  // copertura dell'asse del premio con le etichette
  const pv2 = []; for (let i = 0; i < n; i++) if (inW(i) && Rf.prem[i] != null) pv2.push(Rf.prem[i]);
  const lo = Math.min(-10, ...pv2), hi = Math.max(10, ...pv2), labs = y1l.map((t) => +t.s.replace('−', '-').replace('+', ''));
  note(`${tag} ${range}: premio da ${lo.toFixed(1)} a ${hi.toFixed(1)}; etichette ${labs.join(',')}`);
  ok(Math.min(...labs) - lo <= 10.5 && hi - Math.max(...labs) <= 10.5, `${tag} ${range}: etichette del premio coprono la scala (spazio senza etichette sotto ${(Math.min(...labs) - lo).toFixed(1)}, sopra ${(hi - Math.max(...labs)).toFixed(1)} punti)`);
  // etichette sovrapposte o tagliate
  const T = C.txt; let ov = [], cut = [];
  for (let i = 0; i < T.length; i++) { const a = T[i].bb; if (a[0] < -0.5 || a[0] + a[2] > C.vb[0] + 0.5 || a[1] < -0.5 || a[1] + a[3] > C.vb[1] + 0.5) cut.push(T[i].s); for (let j = i + 1; j < T.length; j++) { const b = T[j].bb; if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) ov.push(`${T[i].s}|${T[j].s}`); } }
  ok(!ov.length && !cut.length, `${tag} ${range}: etichette senza sovrapposizioni (${ov.join(' ; ') || '-'}) né tagli (${cut.join(' ; ') || '-'})`);
  return { C, fxT, fy0, fy1, t0, t1 };
}

async function hoverChart(p, tag, range, info, touch) {
  const Rf = REF.chart, n = Rf.dates.length;
  const fr = info.C.frames[0];
  const out = [];
  for (const fr01 of [0.002, 0.25, 0.5, 0.77, 0.999]) {
    const xs = fr.x + fr.w * fr01, ys = fr.y + 40;
    const sc = await p.evaluate(([x, y]) => { const s = document.getElementById('vxChart'); const pt = s.createSVGPoint(); pt.x = x; pt.y = y; const r = pt.matrixTransform(s.getScreenCTM()); return [r.x, r.y]; }, [xs, ys]);
    if (touch) await p.touchscreen.tap(sc[0], sc[1]); else { await p.mouse.move(sc[0] + 2, sc[1]); await p.mouse.move(sc[0], sc[1]); }
    await p.waitForTimeout(120);
    const r = await p.evaluate(() => { const t = document.getElementById('vxTip'), xh = document.querySelector('#vxChart line.xhair'); return { tip: t.hidden ? null : t.innerText, xh: +xh.getAttribute('x1'), vis: xh.getAttribute('visibility') }; });
    if (!r.tip) { ok(false, `${tag} ${range} tip ${fr01}: non visibile`); continue; }
    // la seduta mostrata: la più vicina alla linea verticale del cursore
    const tq = info.fxT.inv(r.xh);
    let best = -1, bd = Infinity; for (let i = 0; i < n; i++) { const dd = Math.abs(Date.parse(Rf.dates[i]) - tq); if (dd < bd) { bd = dd; best = i; } }
    const tCur = info.fxT.inv(xs); let near = -1, nd = Infinity; for (let i = 0; i < n; i++) { const dd = Math.abs(Date.parse(Rf.dates[i]) - tCur); if (dd < nd) { nd = dd; near = i; } }
    const i = best, d = Rf.dates[i].split('-').reverse().join('/');
    const f = (v, k) => v.toFixed(k).replace('.', ','), sg = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',');
    const want = [d, Rf.vix[i] == null ? '—' : f(Rf.vix[i], 2), Rf.rv[i] == null ? '—' : f(Rf.rv[i], 1), Rf.prem[i] == null ? '—' : sg(Rf.prem[i]), Rf.pp[i] == null ? '—' : Math.round(Rf.pp[i]) + '°'];
    const T = r.tip.replace(/\s+/g, ' ');
    const closeS = Math.round(Rf.close[i]).toLocaleString('it-IT');
    ok(want.every((w) => T.includes(w)) && T.replace(/\./g, '').includes(closeS.replace(/\./g, '')), `${tag} ${range} tip a ${(fr01 * 100).toFixed(1)}%: ${want.join(' | ')} S&P ${closeS} → «${T.slice(0, 160)}»`);
    out.push({ fr01, shown: Rf.dates[i], nearest: Rf.dates[near] });
  }
  note(`${tag} ${range}: seduta mostrata contro seduta più vicina al cursore ${out.map((o) => `${o.shown}/${o.nearest}`).join(' ; ')}`);
  if (!touch) { await p.mouse.move(2, 2); await p.waitForTimeout(80); }
}

(async () => {
  const b = await chromium.launch();
  const confs = [
    ['1440-scuro', { viewport: { width: 1440, height: 900 } }, 'dark'], ['1440-chiaro', { viewport: { width: 1440, height: 900 } }, 'light'],
    ['1280-scuro', { viewport: { width: 1280, height: 900 } }, 'dark'], ['1280-chiaro', { viewport: { width: 1280, height: 900 } }, 'light'],
    ['1700-scuro', { viewport: { width: 1700, height: 1000 } }, 'dark'], ['1700-chiaro', { viewport: { width: 1700, height: 1000 } }, 'light'],
    ['390-scuro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'dark'], ['390-chiaro', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light'],
    ['360-scuro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'dark'], ['360-chiaro', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light'],
  ];
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [tag, opt, theme] of confs) {
    if (only && !only.includes(tag)) continue;
    const touch = !!opt.hasTouch;
    const ctx = await ctxOf(b, opt, theme); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#vix'); await p.waitForSelector('#vxScatter circle.vxpt', { timeout: 30000 }); await p.waitForTimeout(700);
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === theme, `${tag}: tema ${theme}`);
    await p.screenshot({ path: `${OUT}/${tag}-vista.png`, fullPage: true });
    // layout: colonne affiancate?
    const lay = await p.evaluate(() => { const ps = [...document.querySelectorAll('#v-vix .vix-grid > .panel')].map((x) => x.getBoundingClientRect()); return { cols: new Set(ps.map((r) => Math.round(r.top))).size === 1 && ps.length === 2 ? 2 : 1, w: ps.map((r) => Math.round(r.width)), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
    note(`${tag}: griglia a ${lay.cols} colonne, larghezze ${lay.w.join('/')}`);
    ok(lay.sw <= lay.cw, `${tag}: nessuno scorrimento orizzontale (${lay.sw}/${lay.cw})`);
    for (const ix of ['SPX', 'NDX']) {
      if (ix === 'NDX') { const bt = p.locator('#vxIx button[data-ix="NDX"]'); if (touch) await bt.tap(); else await bt.click(); await p.waitForTimeout(400); }
      const info = await checkScatter(p, tag, ix);
      note(`${tag} scatter ${ix}: viewBox ${info.S.vb.join('x')}, a schermo ${info.S.px.map((v) => v.toFixed(0)).join('x')} (scala ${(info.S.px[0] / info.S.vb[0]).toFixed(2)})`);
      if (/1440|390-scuro|360-chiaro/.test(tag)) await hoverScatter(p, tag, ix, info, touch);
      await p.evaluate(() => { document.getElementById('vxScTip').hidden = true; const r = document.querySelector('#vxScatter .vxring'); if (r) r.setAttribute('visibility', 'hidden'); });
      await p.locator('#vxScWrap').screenshot({ path: `${OUT}/${tag}-scatter-${ix}.png` });
    }
    { const bt = p.locator('#vxIx button[data-ix="SPX"]'); if (touch) await bt.tap(); else await bt.click(); await p.waitForTimeout(300); }
    for (const range of ['3A', '10A', 'MAX']) {
      const bt = p.locator(`#vxRange button[data-range="${range}"]`); if (touch) await bt.tap(); else await bt.click(); await p.waitForTimeout(400);
      const info = await checkChart(p, tag, range);
      note(`${tag} ${range}: viewBox ${info.C.vb.join('x')}, a schermo ${info.C.px.map((v) => v.toFixed(0)).join('x')}`);
      if (/1440-scuro|1280-chiaro|390-scuro|360-chiaro|1700-chiaro/.test(tag)) await hoverChart(p, tag, range, info, touch);
      await p.locator('#vxWrap').evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await p.evaluate(() => { document.getElementById('vxTip').hidden = true; const r = document.querySelector('#vxChart .xhair'); if (r) r.setAttribute('visibility', 'hidden'); });
      await p.locator('#vxWrap').screenshot({ path: `${OUT}/${tag}-chart-${range}.png` });
      if (range === '10A') {
        // legenda contro stili del grafico
        const C = info.C; const L = C.leg;
        const lk = (c) => (L.find((k) => k.c.includes(c)) || {}).bg;
        ok(lk('vxk-vix') === C.paths.vxvix.stroke && lk('vxk-rv') === C.paths.vxrv.stroke && lk('vxk-prem') === C.paths.vxprem.stroke, `${tag}: colori della legenda = colori delle linee (${lk('vxk-vix')}/${C.paths.vxvix.stroke}, ${lk('vxk-rv')}/${C.paths.vxrv.stroke}, ${lk('vxk-prem')}/${C.paths.vxprem.stroke})`);
        const kb = L.find((k) => k.c.includes('vxk-high')), bd = C.bands[0];
        note(`${tag}: banda nel grafico ${bd ? bd.fill + ' fill-opacity ' + bd.fo : '-'}; nella legenda ${kb.bg} opacity ${kb.op}; sfondo pannello ${C.panelBg}`);
        fs.writeFileSync(`${OUT}/../stili-${tag}.json`, JSON.stringify({ leg: L, paths: Object.fromEntries(Object.entries(C.paths).map(([k, v]) => [k, { stroke: v.stroke, sw: v.sw }])), band: bd, bg: C.bg, panelBg: C.panelBg }, null, 1));
      }
    }
    ok(!errs.length, `${tag}: console senza errori ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(`${pass} OK, ${fail} FAIL`);
})();
