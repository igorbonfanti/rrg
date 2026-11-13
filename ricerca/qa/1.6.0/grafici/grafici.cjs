// Controllo indipendente dei GRAFICI della 1.6.0 (vista 8 VIX, #vxChart con struttura a termine e credito, #vxKpis).
// Geometria controllata contro gli assi DISEGNATI (anni sull'asse x, etichette sull'asse y), non contro le formule dell'app;
// valori attesi da attesi.mjs (ricalcolo indipendente da data/vix.json).
// Uso (dalla radice del repository, server avviato):
//   node ricerca/qa/1.6.0/grafici/attesi.mjs > ricerca/qa/1.6.0/grafici/attesi.json
//   BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.0/grafici/grafici.cjs
// Con BASE puntato a una copia della 1.5.0 i controlli dei pannelli nuovi devono fallire (prova che possono fallire).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/';
const OUT = path.join(__dirname, 'shots');
const SHOTS = process.env.SHOTS !== '0';
const ONLY = process.env.ONLY; // es. "1440" per una sola larghezza
fs.mkdirSync(OUT, { recursive: true });
const E = JSON.parse(fs.readFileSync(path.join(__dirname, 'attesi.json')));
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../data/vix.json')));
let fail = 0, pass = 0;
const log = [];
const ok = (c, m) => { const s = `${c ? 'OK  ' : 'FAIL'} ${m}`; console.log(s); log.push(s); if (c) pass++; else fail++; };
const info = (m) => { console.log('     ' + m); log.push('     ' + m); };
const DAY = 86400000;

// ricostruzione indipendente delle serie (solo decodifica dal modulo dell'app)
let SER = null;
async function series() {
  if (SER) return SER;
  const { vxSeries } = await import(path.join(__dirname, '../../../../js/vix.js'));
  const S = Object.fromEntries(Object.keys(DATA.series).map((k) => [k, vxSeries(DATA.series[k])]));
  const mp = (s) => new Map(s.dates.map((x, i) => [x, s.val[i]]));
  const mV = mp(S.VIX), m3 = mp(S.VIX3M), mC = mp(S.HYGIEF);
  const dates = S.SPX.dates;
  const vix = dates.map((x) => (mV.has(x) ? mV.get(x) : null)), v3 = dates.map((x) => (m3.has(x) ? m3.get(x) : null));
  const r = dates.map((_, i) => (vix[i] != null && v3[i] != null ? vix[i] / v3[i] : null));
  const cr = dates.map((x) => (mC.has(x) ? mC.get(x) : null));
  const dd = dates.map(() => null), obs = [];
  cr.forEach((v, i) => { if (v == null) return; obs.push(v); if (obs.length >= 252) dd[i] = (v / Math.max(...obs.slice(-252)) - 1) * 100; });
  SER = { dates, close: S.SPX.val, vix, v3, r, dd };
  return SER;
}
const num = (s) => parseFloat(String(s).replace(/−/g, '-').replace(/\./g, '').replace(',', '.'));
const itNum = (s) => parseFloat(String(s).replace(/−/g, '-').replace(',', '.'));
const dIT = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const fit = (pts) => { // minimi quadrati y = a + b x
  const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  const b = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  const a = my - b * mx, res = Math.max(...pts.map((p) => Math.abs(a + b * p[0] - p[1])));
  return { f: (x) => a + b * x, inv: (y) => (y - a) / b, res, n };
};
const verts = (d) => { const out = []; const re = /([ML])([-\d.]+) ([-\d.]+)/g; let m; while ((m = re.exec(d))) out.push({ c: m[1], x: +m[2], y: +m[3] }); return out; };

// estrazione della geometria dall'SVG (coordinate dell'SVG)
const EXTRACT = () => {
  const svg = document.getElementById('vxChart'), vb = svg.viewBox.baseVal;
  const bb = (e) => { const b = e.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const attrs = (e) => Object.fromEntries([...e.attributes].map((a) => [a.name, a.value]));
  const texts = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent, cls: t.getAttribute('class'), x: +t.getAttribute('x'), y: +t.getAttribute('y'), anchor: t.getAttribute('text-anchor'), bb: bb(t) }));
  const frames = [...svg.querySelectorAll('rect.frame')].map((r) => ({ x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') }));
  const rects = (c) => [...svg.querySelectorAll('rect.' + c)].map((r) => ({ x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') }));
  const lines = (c) => [...svg.querySelectorAll('line.' + c)].map(attrs);
  const paths = Object.fromEntries([...svg.querySelectorAll('path')].map((p) => [p.getAttribute('class'), p.getAttribute('d')]));
  const dot = svg.querySelector('circle.vxrdot');
  const cs = (sel, prop) => { const e = svg.querySelector(sel) || document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
  return {
    W: vb.width, H: vb.height, cssW: svg.getBoundingClientRect().width, texts, frames, paths,
    back: rects('vxback'), nodata: rects('vxnodata'), high: rects('vxhigh').length,
    one: lines('vxone'), zero: lines('vxzero'), grid: lines('gridl'),
    dot: dot ? { cx: +dot.getAttribute('cx'), cy: +dot.getAttribute('cy'), cls: dot.getAttribute('class') } : null,
    legend: [...document.querySelectorAll('#vxLegend > span')].map((s) => ({ t: s.textContent, sw: s.querySelector('.kl,.kb') ? [...s.querySelector('.kl,.kb').classList].join(' ') : null, bg: s.querySelector('.kl,.kb') ? getComputedStyle(s.querySelector('.kl,.kb')).backgroundColor : null, op: s.querySelector('.kl,.kb') ? getComputedStyle(s.querySelector('.kl,.kb')).opacity : null })),
    colors: {
      bg: getComputedStyle(document.body).backgroundColor, panelBg: getComputedStyle(svg.closest('.panel')).backgroundColor,
      vix: cs('path.vxvix', 'stroke'), rv: cs('path.vxrv', 'stroke'), prem: cs('path.vxprem', 'stroke'), r: cs('path.vxr', 'stroke'), cr: cs('path.vxcr', 'stroke'),
      back: cs('rect.vxback', 'fill'), backOp: cs('rect.vxback', 'fillOpacity'), high: cs('rect.vxhigh', 'fill'), highOp: cs('rect.vxhigh', 'fillOpacity'),
      nodata: cs('rect.vxnodata', 'fill'), nodataOp: cs('rect.vxnodata', 'fillOpacity'), one: cs('line.vxone', 'stroke'), axt: cs('text.axt', 'fill'), title: cs('text.pane-t', 'fill'),
      dot: cs('circle.vxrdot', 'fill'), dotStroke: cs('circle.vxrdot', 'stroke'),
    },
  };
};

function analyse(G, S, range, tag, opts = {}) {
  const { dates } = S, last = dates.at(-1);
  // pannelli
  const titles = G.texts.filter((t) => t.cls === 'pane-t');
  const panes = G.frames.map((f, k) => ({ ...f, title: (titles.find((t) => Math.abs(t.y - (f.y - 5)) < 0.5) || {}).t || '' }));
  const L = panes[0].x, PW = panes[0].w;
  ok(panes.length === (opts.old ? 2 : 4), `${tag}: ${panes.length} pannelli (attesi ${opts.old ? 2 : 4})`);
  const PR = panes.find((p) => /VIX3M/.test(p.title)), PC = panes.find((p) => /CREDITO/i.test(p.title));
  // asse x: anni disegnati (etichette in fondo + linea verticale) -> retta tempo->x indipendente dalla formula dell'app
  const yl = G.texts.filter((t) => t.cls === 'axt' && Math.abs(t.y - (G.H - 4)) < 0.5 && /^\d{4}$/.test(t.t));
  const pts = yl.map((t) => [Date.parse(`${t.t}-01-01`), t.x]);
  ok(pts.length >= 2, `${tag}: ${pts.length} anni sull'asse x (${yl.map((t) => t.t).join(',')})`);
  if (pts.length < 2) return;
  const X = fit(pts), xOf = (iso) => X.f(Date.parse(iso));
  ok(X.res < 0.05, `${tag}: anni equidistanti nel tempo (scarto ${X.res.toFixed(3)})`);
  // ogni etichetta d'anno ha la sua linea verticale in tutti i pannelli
  const gl = G.grid.filter((l) => l.x1 === l.x2);
  ok(yl.every((t) => gl.filter((l) => Math.abs(+l.x1 - t.x) < 0.01).length === panes.length), `${tag}: linea verticale per ogni anno in ogni pannello`);
  // finestra: ultimo vertice del VIX = ultima seduta al bordo destro
  const vv = verts(G.paths.vxvix);
  ok(Math.abs(vv.at(-1).x - (L + PW)) < 0.2, `${tag}: ultima seduta sul bordo destro (${vv.at(-1).x.toFixed(1)} vs ${(L + PW).toFixed(1)})`);
  const t0 = X.inv(L), t1 = X.inv(L + PW);
  ok(Math.abs(t1 - Date.parse(last)) < DAY * 1.5, `${tag}: bordo destro alla data ${new Date(t1).toISOString().slice(0, 10)} (attesa ${last})`);
  const spanY = (t1 - t0) / (365.25 * DAY);
  info(`${tag}: finestra ${new Date(t0).toISOString().slice(0, 10)} → ${new Date(t1).toISOString().slice(0, 10)} (${spanY.toFixed(2)} anni)`);
  if (range === '3A') ok(Math.abs(spanY - 3) < 0.01, `${tag}: periodo 3 anni`);
  if (range === '10A') ok(Math.abs(spanY - 10) < 0.01, `${tag}: periodo 10 anni`);
  if (range === 'MAX') ok(Math.abs(t0 - Date.parse(dates[0])) < DAY, `${tag}: MAX parte dal ${dates[0]}`);
  const inWin = (d) => { const t = Date.parse(d); return t >= t0 - 1 && t <= t1 + 1; };
  // retta valore->y di un pannello dalle sue etichette sull'asse destro
  const yAxis = (p, parse) => {
    const lab = G.texts.filter((t) => t.cls === 'axt' && t.x > L + PW && t.y >= p.y - 1 && t.y <= p.y + p.h + 4);
    const f = fit(lab.map((t) => [parse(t.t), t.y - 3]));
    return { lab, ...f };
  };
  // controllo dei vertici di una linea: vertice k = k-esima seduta in finestra con valore
  const checkPath = (cls, arr, p, Y, name) => {
    const v = verts(G.paths[cls] || ''), idx = [];
    arr.forEach((x, i) => { if (x != null && inWin(dates[i])) idx.push(i); });
    ok(v.length === idx.length, `${tag}: ${name}: ${v.length} vertici, ${idx.length} sedute con dato nel periodo`);
    if (v.length !== idx.length) return;
    let worstX = 0, worstY = 0, wd = null;
    v.forEach((q, k) => { const ex = Math.abs(q.x - xOf(dates[idx[k]])), ey = Math.abs(q.y - Y.f(arr[idx[k]])); if (ex > worstX) worstX = ex; if (ey > worstY) { worstY = ey; wd = dates[idx[k]]; } });
    ok(worstX < 0.15 && worstY < 0.15, `${tag}: ${name}: tutti i vertici alla data e al valore giusti (scarto max x ${worstX.toFixed(2)}, y ${worstY.toFixed(2)} ${wd || ''})`);
    // date note
    for (const pd of E.probe) {
      if (!inWin(pd.date) || arr[pd.i] == null) continue;
      const k = idx.indexOf(pd.i);
      info(`${tag}: ${name} al ${pd.date}: disegnato ${Y.inv(v[k].y).toFixed(4)} atteso ${arr[pd.i].toFixed(4)} (x ${v[k].x.toFixed(1)} vs ${xOf(pd.date).toFixed(1)})`);
    }
    // segmenti: interrotti solo dove manca il dato
    const breaks = v.filter((q) => q.c === 'M').length;
    let gapsExp = 1; for (let k = 1; k < idx.length; k++) if (arr.slice(idx[k - 1] + 1, idx[k]).length) gapsExp++;
    ok(breaks === gapsExp, `${tag}: ${name}: ${breaks} tratti (attesi ${gapsExp})`);
  };
  // pannello 0 e premio: rapido controllo
  const Y0 = yAxis(panes[0], itNum); ok(Y0.res < 0.05, `${tag}: asse del VIX lineare (${Y0.lab.map((t) => t.t).join(' ')})`);
  checkPath('vxvix', S.vix, panes[0], Y0, 'VIX');
  if (opts.old) return { panes };
  // ---------- struttura a termine ----------
  ok(!!PR, `${tag}: pannello VIX/VIX3M presente («${PR && PR.title}»)`);
  if (PR) {
    const YR = yAxis(PR, itNum);
    info(`${tag}: etichette VIX/VIX3M ${YR.lab.map((t) => t.t).join(' ')}`);
    ok(YR.lab.length >= 3 && YR.lab.length <= 8, `${tag}: VIX/VIX3M ${YR.lab.length} etichette`);
    ok(YR.res < 0.3, `${tag}: etichette VIX/VIX3M coerenti con le loro posizioni (scarto ${YR.res.toFixed(2)} px)`);
    ok(new Set(YR.lab.map((t) => t.t)).size === YR.lab.length, `${tag}: etichette VIX/VIX3M tutte diverse`);
    checkPath('vxr', S.r, PR, YR, 'VIX/VIX3M');
    // linea tratteggiata a 1
    ok(G.one.length === 1 && Math.abs(+G.one[0].y1 - YR.f(1)) < 0.3, `${tag}: linea a 1 al posto giusto (${G.one[0] && (+G.one[0].y1).toFixed(1)} vs ${YR.f(1).toFixed(1)})`);
    if (G.one[0]) { const xs = +G.one[0].x1, first = dates[S.r.findIndex((x) => x != null)]; ok(Math.abs(xs - Math.max(L, xOf(first))) < 0.3, `${tag}: linea a 1 inizia dove inizia il VIX3M o al bordo (${xs.toFixed(1)})`); }
    // fasce di backwardation
    const runs = []; let s = null, prev = null;
    dates.forEach((d, i) => { if (!inWin(d)) return; if (S.r[i] != null && S.r[i] >= 1) { if (s == null) s = d; prev = d; } else if (s != null) { runs.push([s, prev]); s = null; } });
    if (s != null) runs.push([s, prev]);
    ok(G.back.length === runs.length, `${tag}: ${G.back.length} fasce di backwardation, ${runs.length} tratti di sedute con rapporto ≥ 1 nel periodo`);
    let bad = 0;
    G.back.forEach((b, k) => { const rr = runs[k]; if (!rr) { bad++; return; } const xs = xOf(rr[0]), xe = xOf(rr[1]); if (Math.abs(b.x - xs) > 0.3 || Math.abs(b.x + b.w - Math.max(xe, xs + 1)) > 0.3 || Math.abs(b.y - PR.y) > 0.1 || Math.abs(b.h - PR.h) > 0.1) { bad++; if (bad < 4) info(`fascia ${k}: x ${b.x.toFixed(1)}-${(b.x + b.w).toFixed(1)} attesa ${xs.toFixed(1)}-${xe.toFixed(1)} (${rr.join('→')})`); } });
    ok(bad === 0 && G.back.length > 0, `${tag}: fasce alle date giuste e alte quanto il pannello (${G.back.length - bad}/${G.back.length})`);
    // ogni seduta in backwardation cade in una fascia; nessuna seduta in contango coperta da una fascia larga più di 1 px
    let missing = 0, wrong = 0;
    dates.forEach((d, i) => { if (!inWin(d) || S.r[i] == null) return; const xx = xOf(d), inB = G.back.some((b) => xx >= b.x - 0.01 && xx <= b.x + b.w + 0.01); if (S.r[i] >= 1 && !inB) missing++; });
    ok(missing === 0, `${tag}: nessuna seduta in backwardation fuori dalle fasce (${missing})`);
    const narrow1 = G.back.filter((b) => b.w <= 1.001).length;
    info(`${tag}: fasce larghe 1 px (minimo): ${narrow1} su ${G.back.length}; la più larga ${Math.max(...G.back.map((b) => b.w)).toFixed(1)} px`);
    // bordo sinistro: tratto in corso all'inizio del periodo
    const iFirst = dates.findIndex((d) => inWin(d));
    if (S.r[iFirst] != null && S.r[iFirst] >= 1) { let j = iFirst; while (j > 0 && S.r[j - 1] != null && S.r[j - 1] >= 1) j--; info(`${tag}: la prima seduta del periodo (${dates[iFirst]}) è in backwardation da ${dates[j]} (${iFirst - j} sedute prima del bordo): fascia disegnata da x=${G.back[0].x.toFixed(1)} (bordo ${L})`); }
    // bordo destro: ultima fascia e punto finale
    const lastRun = runs.at(-1);
    if (lastRun && lastRun[1] === last) { const b = G.back.at(-1); info(`${tag}: ultima fascia ${lastRun.join('→')}: x ${b.x.toFixed(2)} largh. ${b.w.toFixed(2)} (bordo destro ${L + PW}); px per seduta ${(xOf('2026-11-06') - xOf('2026-11-05')).toFixed(2)}`); ok(b.x + b.w <= L + PW + 1.01, `${tag}: ultima fascia non esce dal pannello`); }
    // punto sull'ultimo valore
    const il = S.r.length - 1 - [...S.r].reverse().findIndex((x) => x != null);
    ok(!!G.dot && Math.abs(G.dot.cx - xOf(dates[il])) < 0.2 && Math.abs(G.dot.cy - YR.f(S.r[il])) < 0.3, `${tag}: punto finale al ${dates[il]} su ${S.r[il].toFixed(3)} (${G.dot && G.dot.cx.toFixed(1)},${G.dot && G.dot.cy.toFixed(1)})`);
    ok(!!G.dot && /back/.test(G.dot.cls) === (S.r[il] >= 1), `${tag}: punto pieno solo se backwardation (${G.dot && G.dot.cls})`);
    // fascia grigia prima del VIX3M
    if (Date.parse('2007-12-04') > t0) {
      const nd = G.nodata.filter((r) => Math.abs(r.y - PR.y) < 0.1);
      ok(nd.length === 1 && Math.abs(nd[0].x - L) < 0.1 && Math.abs(nd[0].x + nd[0].w - xOf('2007-12-04')) < 0.3, `${tag}: fascia grigia del VIX3M fino al 04/12/2007 (${nd[0] && (nd[0].x + nd[0].w).toFixed(1)} vs ${xOf('2007-12-04').toFixed(1)})`);
      const lab = G.texts.find((t) => /VIX3M dal/.test(t.t));
      ok(!!lab && lab.t === 'VIX3M dal 04/12/2007', `${tag}: scritta «${lab && lab.t}»`);
      if (lab) ok(lab.bb.x >= L && lab.bb.x + lab.bb.w <= xOf('2007-12-04') && lab.bb.y >= PR.y && lab.bb.y + lab.bb.h <= PR.y + PR.h, `${tag}: scritta del VIX3M dentro la fascia grigia`);
    } else ok(!G.nodata.some((r) => Math.abs(r.y - PR.y) < 0.1), `${tag}: nessuna fascia grigia nel VIX3M (periodo dopo il 2007)`);
  }
  // ---------- credito ----------
  ok(!!PC, `${tag}: pannello del credito presente («${PC && PC.title}»)`);
  if (PC) {
    const YC = yAxis(PC, itNum);
    info(`${tag}: etichette credito ${YC.lab.map((t) => t.t).join(' ')}`);
    ok(YC.lab.length >= 2 && YC.lab.length <= 8 && YC.res < 0.3, `${tag}: asse del credito (${YC.lab.length} etichette, scarto ${YC.res.toFixed(2)})`);
    checkPath('vxcr', S.dd, PC, YC, 'credito');
    const z = G.zero.filter((l) => +l.y1 >= PC.y && +l.y1 <= PC.y + PC.h);
    ok(z.length === 1 && Math.abs(+z[0].y1 - YC.f(0)) < 0.3, `${tag}: linea dello 0 del credito al posto giusto`);
    const ys = verts(G.paths.vxcr || '').map((q) => q.y);
    ok(ys.length && Math.min(...ys) >= YC.f(0) - 0.01 && Math.max(...ys) <= PC.y + PC.h + 0.01, `${tag}: linea del credito tutta sotto lo 0 e dentro il pannello`);
    ok(YC.f(0) - PC.y < PC.h * 0.12, `${tag}: lo 0 è in alto nel pannello (${(YC.f(0) - PC.y).toFixed(1)} px dal bordo)`);
    const firstDd = E.firstDd;
    if (Date.parse(firstDd) > t0) {
      const nd = G.nodata.filter((r) => Math.abs(r.y - PC.y) < 0.1);
      ok(nd.length === 1 && Math.abs(nd[0].x + nd[0].w - xOf(firstDd)) < 0.3, `${tag}: fascia grigia del credito fino al ${firstDd}`);
      const lab = G.texts.find((t) => /HYG\/IEF dal/.test(t.t)); info(`${tag}: scritta del credito «${lab && lab.t}»`);
    }
  }
  // ---------- testi: sovrapposizioni e bordi ----------
  const T = G.texts.filter((t) => t.t.trim());
  let ov = [];
  for (let a = 0; a < T.length; a++) for (let b = a + 1; b < T.length; b++) {
    const p = T[a].bb, q = T[b].bb;
    if (p.x < q.x + q.w - 0.5 && q.x < p.x + p.w - 0.5 && p.y < q.y + q.h - 0.5 && q.y < p.y + p.h - 0.5) ov.push(`«${T[a].t}»/«${T[b].t}»`);
  }
  ok(ov.length === 0, `${tag}: nessuna scritta sovrapposta (${T.length} scritte) ${ov.slice(0, 4).join(' ')}`);
  const cut = T.filter((t) => t.bb.x < -0.5 || t.bb.x + t.bb.w > G.W + 0.5 || t.bb.y < -0.5 || t.bb.y + t.bb.h > G.H + 0.5);
  ok(cut.length === 0, `${tag}: nessuna scritta tagliata ai bordi ${cut.map((t) => `«${t.t}» ${t.bb.x.toFixed(0)}-${(t.bb.x + t.bb.w).toFixed(0)}/${G.W}`).join(' ')}`);
  // titoli dei pannelli non più lunghi del pannello
  const longT = T.filter((t) => t.cls === 'pane-t' && t.bb.x + t.bb.w > L + PW);
  ok(longT.length === 0, `${tag}: titoli dei pannelli dentro la larghezza ${longT.map((t) => t.t).join(' | ')}`);
  // etichette d'anno: passo
  info(`${tag}: anni ${yl.map((t) => t.t).join(' ')}; dimensione dei testi ${(G.cssW / G.W).toFixed(2)}× (px CSS per unità)`);
  // legenda
  const lg = G.legend.map((l) => l.t);
  const want = ['VIX', 'realizzata', 'premio per la paura', '80°', 'VIX / VIX3M', 'backwardation', 'HYG/IEF'];
  ok(want.every((w) => lg.some((t) => t.includes(w))) && lg.length === 7, `${tag}: legenda con ${lg.length} voci`);
  return { panes, X, PR, PC };
}

const rgb = (s) => { const m = String(s).match(/[\d.]+/g); return m ? m.slice(0, 4).map(Number) : null; };
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (fg, a, bg) => fg.slice(0, 3).map((c, i) => c * a + bg[i] * (1 - a));
// simulazione di deuteranopia e protanopia (Machado 2009, gravità 1) in sRGB lineare
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const MAT = { deut: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]], prot: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]] };
const sim = (c, m) => { const l = c.slice(0, 3).map(lin); return MAT[m].map((row) => Math.max(0, Math.min(255, gam(Math.max(0, row[0] * l[0] + row[1] * l[1] + row[2] * l[2]))))); };
const lab = ([r, g, b]) => { const [R, G, B] = [r, g, b].map(lin); let X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883; const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); [X, Y, Z] = [f(X), f(Y), f(Z)]; return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]; };
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

(async () => {
  const S = await series();
  const b = await chromium.launch();
  const mk = async (w, theme, extra = {}) => {
    const mobile = w < 600;
    const c = await b.newContext({ viewport: { width: w, height: mobile ? 800 : 900 }, deviceScaleFactor: extra.dpr || 1, isMobile: mobile, hasTouch: mobile });
    await c.addInitScript(([t, cvd]) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); if (cvd) localStorage.setItem('sm.cvd', 'true'); } } catch {} }, [theme, !!extra.cvd]);
    if (extra.strip) await c.route('**/data/vix.json*', async (route) => { const r = await route.fetch(); const j = await r.json(); delete j.series.VIX3M; delete j.series.HYGIEF; delete j.asOf.vix3m; delete j.asOf.fred3m; delete j.asOf.credit; await route.fulfill({ response: r, body: JSON.stringify(j), headers: { ...r.headers(), 'content-encoding': '', 'content-type': 'application/json' } }); });
    const p = await c.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
    return { c, p, errs, mobile };
  };
  const open = async (p, base = BASE) => { await p.goto(base + '#vix'); await p.waitForSelector('#vxChart path.vxvix', { timeout: 30000 }); await p.waitForTimeout(400); };
  const setRange = async (p, mobile, r) => { const btn = p.locator(`#vxRange button[data-range="${r}"]`); if (mobile) await btn.tap(); else await btn.click(); await p.waitForTimeout(350); ok(await btn.getAttribute('aria-pressed') === 'true', `periodo ${r} selezionato`); };
  // hover/tocco su una data: x presa dall'asse degli anni disegnato
  const hoverAt = async (p, mobile, svgX, svgY) => {
    const sp = await p.evaluate(([x, y]) => { const svg = document.getElementById('vxChart'); const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const q = pt.matrixTransform(svg.getScreenCTM()); return [q.x, q.y]; }, [svgX, svgY]);
    if (mobile) await p.touchscreen.tap(sp[0], sp[1]); else await p.mouse.move(sp[0], sp[1]);
    await p.waitForTimeout(120);
    return p.evaluate(() => ({ tip: document.getElementById('vxTip').hidden ? null : document.getElementById('vxTip').innerText, rows: [...document.querySelectorAll('#vxTip .row')].map((r) => [...r.children].map((c) => c.textContent.trim())), xh: (() => { const l = document.querySelector('#vxChart line.xhair'); return l ? { x: +l.getAttribute('x1'), vis: l.getAttribute('visibility'), y1: +l.getAttribute('y1'), y2: +l.getAttribute('y2') } : null; })() }));
  };
  const tipCheck = async (p, mobile, tag, A, date) => {
    const iso = date; const i = S.dates.indexOf(iso);
    const r = await hoverAt(p, mobile, A.X.f(Date.parse(iso)) + 0.02, A.panes[0].y + 40);
    if (!r.tip) { ok(false, `${tag}: riquadro dei valori al ${iso} non visibile`); return; }
    const m = r.tip.match(/(\d\d)\/(\d\d)\/(\d{4})/); const shown = m ? `${m[3]}-${m[2]}-${m[1]}` : null; const j = S.dates.indexOf(shown);
    const pxd = A.X.f(Date.parse(iso) + DAY) - A.X.f(Date.parse(iso)), tol = pxd < 1 ? Math.ceil(1.5 / pxd) : 0;
    ok(shown && Math.abs(j - i) <= tol, `${tag}: mirino su ${iso} → riquadro del ${shown} (tolleranza ${tol} sedute)`);
    if (j < 0) return;
    ok(Math.abs(r.xh.x - A.X.f(Date.parse(shown))) < 0.2 && r.xh.vis === 'visible', `${tag}: mirino alla x della seduta del riquadro (${r.xh.x.toFixed(1)})`);
    ok(Math.abs(r.xh.y1 - A.panes[0].y) < 0.1 && Math.abs(r.xh.y2 - (A.panes.at(-1).y + A.panes.at(-1).h)) < 0.1, `${tag}: un solo mirino dal primo all'ultimo pannello`);
    const row = (k) => { const ln = r.rows.find((l) => l[0] === k); return ln ? ln[1] : null; };
    const f2 = (v, d) => (v == null ? '—' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ','));
    const sg = (v, d) => (v == null ? '—' : (+v.toFixed(d) === 0 ? '' : v > 0 ? '+' : '−') + Math.abs(v).toFixed(d).replace('.', ',') + '%');
    const v3 = row('VIX3M'), rr = row('VIX / VIX3M'), cr = row('HYG/IEF dal massimo 12 mesi'), vx = row('VIX') || '';
    const st = S.r[j] == null ? '' : S.r[j] >= 1 ? 'backwardation' : 'contango';
    const okv = (v3 || '').replace(/\s*provv\.?/, '') === f2(S.v3[j], 2) && (rr || '').replace(/\s+/g, ' ') === (S.r[j] == null ? '—' : `${f2(S.r[j], 2)} ${st}`) && cr === sg(S.dd[j], 1) && vx.replace(/\s*provv\.?/, '') === f2(S.vix[j], 2);
    ok(okv, `${tag}: riquadro del ${shown}: VIX ${vx} VIX3M ${v3} rapporto ${rr} credito ${cr} (attesi ${f2(S.vix[j], 2)} ${f2(S.v3[j], 2)} ${S.r[j] == null ? '—' : f2(S.r[j], 2) + ' ' + st} ${sg(S.dd[j], 1)})`);
    return r.tip;
  };

  const widths = (ONLY ? [ONLY] : ['1440', '1280', '1024', '390', '360']).map(Number);
  const summary = {};
  for (const w of widths) for (const theme of ['light', 'dark']) {
    const { c, p, errs, mobile } = await mk(w, theme);
    await open(p);
    const tag0 = `${w}-${theme === 'light' ? 'chiaro' : 'scuro'}`;
    // riquadri in alto
    const K = await p.evaluate(() => { const ks = [...document.querySelectorAll('#vxKpis .kpi')]; const tops = [...new Set(ks.map((k) => Math.round(k.getBoundingClientRect().top)))]; const over = []; ks.forEach((k) => { const kb = k.getBoundingClientRect(); k.querySelectorAll('*').forEach((e) => { const b = e.getBoundingClientRect(); if (b.width && (b.right > kb.right + 0.5 || e.scrollWidth > e.clientWidth + 1)) over.push(k.querySelector('.k').textContent + ': ' + e.className); }); }); return { n: ks.length, rows: tops.length, perRow: tops.map((t) => ks.filter((k) => Math.round(k.getBoundingClientRect().top) === t).length), over, txt: ks.map((k) => k.innerText.replace(/\n/g, ' | ')), hs: ks.map((k) => Math.round(k.getBoundingClientRect().height)) }; });
    const wantRow = w > 1100 ? [6] : w > 600 ? [3, 3] : [2, 2, 2];
    ok(K.n === 6 && K.perRow.join() === wantRow.join(), `${tag0}: riquadri ${K.n} in righe ${K.perRow.join('+')} (attese ${wantRow.join('+')})`);
    ok(K.over.length === 0, `${tag0}: nessun testo dei riquadri che esce ${K.over.join(', ')}`);
    if (theme === 'light') { info(`${tag0}: riquadri: ${K.txt.join(' || ')}`); info(`${tag0}: altezze ${K.hs.join(',')}`); }
    if (SHOTS) await p.locator('#vxKpis').screenshot({ path: path.join(OUT, `kpis-${tag0}.png`) });
    for (const range of ['3A', '10A', 'MAX']) {
      await setRange(p, mobile, range);
      const tag = `${tag0}-${range}`;
      const G = await p.evaluate(EXTRACT);
      const A = analyse(G, S, range, tag);
      summary[tag] = { W: G.W, H: G.H, cssW: G.cssW, back: G.back.length, colors: G.colors, legend: G.legend };
      if (A) for (const d of E.probe.map((q) => q.date).filter((d) => Date.parse(d) >= A.X.inv(A.panes[0].x) && d >= '2007-12-04')) await tipCheck(p, mobile, tag, A, d);
      const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      ok(sw[0] <= sw[1], `${tag}: nessuno scorrimento orizzontale (${sw[0]}/${sw[1]})`);
      if (SHOTS) {
        await p.mouse.move(0, 0); if (mobile) await p.evaluate(() => { document.getElementById('vxTip').hidden = true; });
        await p.locator('#vxChart').evaluate((e) => e.closest('.panel').scrollIntoView());
        await p.locator('#vxChart').evaluate((e) => e.closest('.panel').setAttribute('data-shot', '1'));
        await p.locator('[data-shot="1"]').screenshot({ path: path.join(OUT, `chart-${tag}.png`) });
      }
    }
    // tocco/mouse con riquadro visibile: screenshot su 10A
    await setRange(p, mobile, '10A');
    const G = await p.evaluate(EXTRACT); const A = analyse(G, S, '10A', tag0 + '-10A-hover');
    if (A) { await tipCheck(p, mobile, tag0 + '-10A-hover', A, '2025-04-08'); const tb = await p.evaluate(() => { const t = document.getElementById('vxTip').getBoundingClientRect(), w = document.getElementById('vxWrap').getBoundingClientRect(); return { t: [t.left, t.right, t.top, t.bottom], w: [w.left, w.right], vw: innerWidth }; }); ok(tb.t[0] >= -0.5 && tb.t[1] <= tb.vw + 0.5, `${tag0}: riquadro dei valori dentro lo schermo (${tb.t.map((v) => v.toFixed(0)).join(',')} / ${tb.vw})`); if (SHOTS) await p.locator('[data-shot="1"]').screenshot({ path: path.join(OUT, `hover-${tag0}-10A.png`) }); }
    ok(errs.length === 0, `${tag0}: console senza errori ${errs.join(' | ')}`);
    await c.close();
  }
  // CVD: colori in chiaro e scuro
  for (const theme of ['light', 'dark']) for (const cvd of [false, true]) {
    const { c, p, errs } = await mk(1280, theme, { cvd });
    await open(p); await setRange(p, false, 'MAX');
    const G = await p.evaluate(EXTRACT); const C = G.colors; const tag = `colori-${theme}${cvd ? '-CVD' : ''}`;
    ok(cvd === (await p.evaluate(() => document.documentElement.classList.contains('cvd'))), `${tag}: modalità CVD ${cvd ? 'attiva' : 'spenta'}`);
    const bg = rgb(C.panelBg).slice(0, 3).length ? rgb(C.panelBg) : rgb(C.bg);
    const bgc = (rgb(C.panelBg)[3] === 0 ? rgb(C.bg) : rgb(C.panelBg)).slice(0, 3);
    const backA = rgb(C.back)[3] != null ? rgb(C.back)[3] * +C.backOp : +C.backOp; const backOn = over(rgb(C.back), backA, bgc);
    const lines = { vix: rgb(C.vix), rv: rgb(C.rv), prem: rgb(C.prem), r: rgb(C.r), cr: rgb(C.cr) };
    info(`${tag}: sfondo ${bgc.join(',')}; ${Object.entries(lines).map(([k, v]) => `${k} ${v.slice(0, 3).join(',')} contrasto ${contrast(v, bgc).toFixed(2)}`).join('; ')}`);
    info(`${tag}: fascia backwardation ${C.back} (op ${C.backOp}) → ${backOn.map(Math.round).join(',')}, contrasto fascia/sfondo ${contrast(backOn, bgc).toFixed(2)}, linea del rapporto sulla fascia ${contrast(lines.r, backOn).toFixed(2)}; fascia premio ${C.high} op ${C.highOp}; nessun dato ${C.nodata} op ${C.nodataOp}; linea a 1 ${C.one} contrasto ${contrast(rgb(C.one), bgc).toFixed(2)}; scritte ${C.axt} contrasto ${contrast(rgb(C.axt), bgc).toFixed(2)}`);
    ok(Object.values(lines).every((v) => contrast(v, bgc) >= 3), `${tag}: tutte le linee con contrasto ≥ 3 sullo sfondo`);
    ok(contrast(lines.r, backOn) >= 3, `${tag}: linea del rapporto leggibile sopra la fascia di backwardation (${contrast(lines.r, backOn).toFixed(2)})`);
    ok(contrast(backOn, bgc) >= 1.2, `${tag}: fascia di backwardation distinguibile dallo sfondo (${contrast(backOn, bgc).toFixed(2)})`);
    ok(contrast(rgb(C.axt), bgc) >= 4.5, `${tag}: scritte degli assi ≥ 4,5`);
    for (const m of ['deut', 'prot']) {
      const pairs = [['vix', 'rv'], ['r', 'cr'], ['vix', 'r'], ['rv', 'cr'], ['vix', 'cr']];
      info(`${tag} ${m}: ΔE ${pairs.map(([a, bb]) => `${a}/${bb} ${dE(sim(lines[a], m), sim(lines[bb], m)).toFixed(0)}`).join(', ')}`);
      ok(dE(sim(lines.vix, m), sim(lines.rv, m)) > 20, `${tag} ${m}: VIX e realizzata distinte nello stesso pannello`);
    }
    // legenda: stessi colori delle linee
    const lgc = Object.fromEntries(G.legend.map((l) => [l.sw, l.bg]));
    ok(lgc['kl vxk-r'] === C.r && lgc['kl vxk-cr'] === C.cr && lgc['kl vxk-vix'] === C.vix, `${tag}: legenda con i colori delle linee`);
    const lb = G.legend.find((l) => /vxk-back/.test(l.sw || ''));
    ok(lb && rgb(lb.bg).slice(0, 3).join() === rgb(C.back).slice(0, 3).join(), `${tag}: legenda della backwardation col colore della fascia (${lb && lb.bg} vs ${C.back})`);
    const lh = G.legend.find((l) => /vxk-high/.test(l.sw || ''));
    ok(lh && rgb(lh.bg).slice(0, 3).join() === rgb(C.high).slice(0, 3).join() && Math.abs(+lh.op - +C.highOp) < 0.01, `${tag}: legenda del premio alto col colore della fascia (${lh && lh.bg} op ${lh && lh.op} vs ${C.high} op ${C.highOp})`);
    if (SHOTS) { await p.locator('#vxChart').evaluate((e) => e.closest('.panel').setAttribute('data-shot', '1')); await p.locator('[data-shot="1"]').screenshot({ path: path.join(OUT, `${tag}-MAX.png`) }); }
    ok(errs.length === 0, `${tag}: console senza errori ${errs.join(' | ')}`);
    await c.close();
  }
  // file senza le serie nuove: deve tornare come nella 1.5.0
  const OLD = process.env.OLD || 'http://127.0.0.1:8911/'; // copia della 1.5.0 (git archive d962970); controllare la versione servita
  for (const [w, theme] of [[1440, 'dark'], [390, 'light']]) {
    const svgs = {};
    for (const [nm, base] of [['1.6.0-senza', BASE], ['1.5.0', OLD]]) {
      const { c, p, errs, mobile } = await mk(w, theme, { strip: true });
      try { await open(p, base); } catch (e) { ok(false, `${nm} ${w}: grafico non disegnato (${e.message.split('\n')[0]})`); await c.close(); continue; }
      for (const range of ['3A', '10A', 'MAX']) {
        await setRange(p, mobile, range);
        const G = await p.evaluate(EXTRACT);
        svgs[nm + range] = await p.evaluate(() => document.getElementById('vxChart').outerHTML.replace(/ (style|aria-label)="[^"]*"/g, ''));
        if (nm === '1.6.0-senza') {
          analyse(G, S, range, `senza-serie-${w}-${range}`, { old: true });
          ok(G.legend.length === 4, `senza-serie-${w}-${range}: legenda di 4 voci (${G.legend.map((l) => l.t).join(' | ')})`);
          ok(!G.back.length && !G.nodata.length && !G.dot && !G.one.length, `senza-serie-${w}-${range}: nessun elemento nuovo`);
          const tip = (await hoverAt(p, mobile, G.frames[0].x + G.frames[0].w * 0.6, G.frames[0].y + 40)).tip || '';
          ok(tip && !/VIX3M|HYG/.test(tip), `senza-serie-${w}-${range}: riquadro dei valori senza righe nuove`);
        }
      }
      if (nm === '1.6.0-senza') {
        const K = await p.evaluate(() => [...document.querySelectorAll('#vxKpis .kpi')].map((k) => k.innerText.replace(/\n/g, ' | ')));
        info(`senza-serie-${w}: riquadri ${K.join(' || ')}`);
        info(`senza-serie-${w}: meta «${await p.locator('#vxMeta').innerText()}»`);
        if (SHOTS) { await p.locator('#vxChart').evaluate((e) => e.closest('.panel').setAttribute('data-shot', '1')); await p.locator('[data-shot="1"]').screenshot({ path: path.join(OUT, `senza-serie-${w}-${theme}-MAX.png`) }); await p.locator('#vxKpis').screenshot({ path: path.join(OUT, `senza-serie-kpis-${w}-${theme}.png`) }); }
      }
      ok(errs.length === 0, `${nm} ${w}: console senza errori ${errs.join(' | ')}`);
      await c.close();
    }
    for (const range of ['3A', '10A', 'MAX']) {
      const a = svgs['1.6.0-senza' + range], o = svgs['1.5.0' + range];
      if (!a || !o) continue;
      if (a === o) ok(true, `senza-serie-${w}-${range}: SVG identico alla 1.5.0`);
      else { let k = 0; while (a[k] === o[k]) k++; ok(false, `senza-serie-${w}-${range}: SVG diverso dalla 1.5.0 da carattere ${k}: …${a.slice(k - 60, k + 120)}… contro …${o.slice(k - 60, k + 120)}…`); }
    }
  }
  // screenshot per l'utente (deviceScaleFactor 2)
  if (SHOTS) for (const [w, theme, range] of [[1440, 'dark', 'MAX'], [1280, 'light', '10A'], [390, 'dark', '3A']]) {
    const { c, p, mobile } = await mk(w, theme, { dpr: 2 }); await open(p); await setRange(p, mobile, range);
    await p.locator('#vxChart').evaluate((e) => e.closest('.panel').setAttribute('data-shot', '1'));
    const bb = await p.locator('#vxChart').boundingBox(); await p.locator('#vxChart').scrollIntoViewIfNeeded();
    const bb2 = await p.locator('#vxChart').boundingBox();
    if (mobile) await p.touchscreen.tap(bb2.x + bb2.width * 0.62, bb2.y + 120); else await p.mouse.move(bb2.x + bb2.width * 0.83, bb2.y + 150);
    await p.waitForTimeout(200);
    await p.locator('[data-shot="1"]').screenshot({ path: path.join(OUT, `utente-${w}-${theme}-${range}@2x.png`) });
    await c.close();
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, process.env.OUTNAME || 'risultati.txt'), log.join('\n') + `\n\n${pass} OK, ${fail} FAIL\n`);
  fs.writeFileSync(path.join(__dirname, (process.env.OUTNAME || '') + 'colori.json'), JSON.stringify(Object.fromEntries(Object.entries(summary).filter(([k]) => /1280|390/.test(k) && /MAX/.test(k))), null, 1));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
