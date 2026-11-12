// Controllo indipendente d'uso della 1.10.0 (pannello «Distanza dal massimo degli ultimi 3 anni», vista 8 VIX).
// Non usa le funzioni dell'app: i valori attesi vengono da data/ath.json e da data/ath_history.json decodificato qui.
// Posizioni del grafico controllate con le tacche degli assi disegnate (tempo → x e log(prezzo) → y ricavati dalle tacche).
// Uso: BASE=http://127.0.0.1:8836/ node ricerca/qa/1.10.0/uso/controllo.cjs  [fasi: desk mob miss reg]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8836/';
const ROOT = path.resolve(__dirname, '../../../..');
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const PHASES = process.argv.slice(2).length ? process.argv.slice(2) : ['desk', 'mob', 'miss', 'reg'];
let fail = 0, pass = 0;
const issues = [];
const ok = (c, m) => { if (c) pass++; else { fail++; issues.push(m); } console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); return c; };
const note = (m) => console.log(`NOTA ${m}`);

// ---------- valori attesi, senza il codice dell'app ----------
const A = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ath.json'), 'utf8'));
const HJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ath_history.json'), 'utf8'));
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const HIST = {};
for (const [k, v] of Object.entries(HJ.series)) {
  const d = [v.d0]; let t = Date.parse(v.d0);
  for (const ch of v.gaps) { t += parseInt(ch, 36) * DAY; d.push(iso(t)); }
  let p = null; const c = v.cd.map((r) => { if (r == null) { p = null; return null; } p = p == null ? r : p + r; return p / v.ps; });
  HIST[k] = { d, c, map: new Map(d.map((x, i) => [x, c[i]])) };
}
const M = Object.fromEntries(A.markets.map((m) => [m.id, m]));
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const num = (v, d) => { const neg = v < 0 && Math.abs(v).toFixed(d) !== (0).toFixed(d); let [i, f] = Math.abs(v).toFixed(d).split('.'); i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (neg ? '−' : '') + i + (f ? ',' + f : ''); };
const sg = (v) => (Math.abs(v).toFixed(2) === '0.00' ? '0,00%' : (v > 0 ? '+' : '−') + num(Math.abs(v), 2) + '%');
const px = (v) => num(v, Math.abs(v) < 10 ? 3 : 2);
const parseIT = (s) => { s = s.trim(); let k = 1; if (/k$/.test(s)) { k = 1000; s = s.slice(0, -1); } return parseFloat(s.replace(/\./g, '').replace(',', '.').replace('−', '-')) * k; };
const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

// ---------- lettura del grafico nel browser ----------
async function chartGeom(p) {
  return p.evaluate(() => {
    const svg = document.getElementById('athChart'), vb = svg.viewBox.baseVal;
    const fr = svg.querySelector('rect.frame');
    if (!fr) return null;
    const F = { x: +fr.getAttribute('x'), y: +fr.getAttribute('y'), w: +fr.getAttribute('width'), h: +fr.getAttribute('height') };
    const texts = [...svg.querySelectorAll('text')].map((t) => { const b = t.getBBox(); return { s: t.textContent, cls: t.getAttribute('class') || '', x: b.x, y: b.y, w: b.width, h: b.height, prev: t.previousElementSibling && t.previousElementSibling.tagName === 'line' ? { x1: +t.previousElementSibling.getAttribute('x1'), x2: +t.previousElementSibling.getAttribute('x2'), y1: +t.previousElementSibling.getAttribute('y1'), y2: +t.previousElementSibling.getAttribute('y2') } : null }; });
    const g = (sel) => { const e = svg.querySelector(sel); if (!e) return null; const o = {}; for (const a of e.attributes) o[a.name] = isNaN(+a.value) ? a.value : +a.value; return o; };
    const r = svg.getBoundingClientRect();
    return { W: vb.width, H: vb.height, cssW: r.width, cssH: r.height, F, texts, win: g('rect.athwin'), ref: g('line.athref'), top: g('circle.athtop'), low: g('circle.athlow'), last: g('circle.athlast'), pathLen: (svg.querySelector('path.athpx') || { getAttribute: () => '' }).getAttribute('d').length, title: document.getElementById('athChartTitle').textContent, chip: document.getElementById('athZoom').hidden ? null : document.getElementById('athZoom').textContent, legend: document.getElementById('athLegend').textContent, miss: document.getElementById('athChartMiss').hidden ? null : document.getElementById('athChartMiss').textContent };
  });
}
// tempo → x dalle tacche verticali (etichetta sotto la linea verticale)
function timeMap(G, yearHint) {
  const tk = G.texts.filter((t) => t.prev && t.prev.x1 === t.prev.x2 && t.cls === 'axt');
  let y = yearHint, lastM = -1; const pts = [];
  for (const t of tk) {
    let tt = null; const s = t.s.trim();
    if (/^\d{4}$/.test(s)) { y = +s; lastM = 0; tt = Date.UTC(y, 0, 1); }
    else if (/^[a-z]{3}( \d\d)?$/.test(s)) { const m = MM.indexOf(s.slice(0, 3)); if (s.length > 3) y = 2000 + +s.slice(4); else if (m < lastM) y++; lastM = m; tt = Date.UTC(y, m, 1); }
    else if (/^\d\d\/\d\d$/.test(s)) { const m = +s.slice(3) - 1; if (m < lastM) y++; lastM = m; tt = Date.UTC(y, m, +s.slice(0, 2)); }
    if (tt != null) pts.push({ t: tt, x: t.prev.x1, s });
  }
  if (pts.length < 2) return null;
  const a = pts[0], b = pts[pts.length - 1], k = (b.x - a.x) / (b.t - a.t);
  const f = (d) => a.x + (Date.parse(d) - a.t) * k;
  const resid = Math.max(...pts.map((q) => Math.abs(q.x - (a.x + (q.t - a.t) * k))));
  return { f, inv: (x) => a.t + (x - a.x) / k, resid, n: pts.length, labels: pts.map((q) => q.s) };
}
// log(prezzo) → y dalle tacche orizzontali a destra
function priceMap(G) {
  const tk = G.texts.filter((t) => t.prev && t.prev.y1 === t.prev.y2 && t.cls === 'axt').map((t) => ({ v: parseIT(t.s), y: t.prev.y1, s: t.s }));
  if (tk.length < 2) return null;
  const a = tk[0], b = tk[tk.length - 1], k = (b.y - a.y) / (Math.log(b.v) - Math.log(a.v));
  const f = (v) => a.y + (Math.log(v) - Math.log(a.v)) * k;
  const resid = Math.max(...tk.map((q) => Math.abs(q.y - f(q.v))));
  return { f, resid, n: tk.length, labels: tk.map((q) => q.s) };
}
const overl = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

async function checkChart(p, tag, id, opt = {}) {
  const m = M[id], s = m.stats, H = HIST[id];
  const G = await chartGeom(p);
  if (!ok(G && G.pathLen > 50, `${tag} ${id}: grafico disegnato`)) return null;
  // testo dentro il riquadro dell'SVG e senza sovrapposizioni
  const out = G.texts.filter((t) => t.w > 0 && (t.x < -0.5 || t.y < -0.5 || t.x + t.w > G.W + 0.5 || t.y + t.h > G.H + 0.5));
  ok(!out.length, `${tag} ${id}: etichette dentro il grafico ${out.map((t) => `«${t.s}» x=${t.x.toFixed(0)}..${(t.x + t.w).toFixed(0)}/${G.W}`).join(' ')}`);
  const vis = G.texts.filter((t) => t.w > 0); const ov = [];
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) if (overl(vis[i], vis[j])) ov.push(`«${vis[i].s}»/«${vis[j].s}»`);
  ok(!ov.length, `${tag} ${id}: etichette senza sovrapposizioni ${ov.join(' ')}`);
  // etichetta della finestra dentro il riquadro azzurro
  const tm = timeMap(G, opt.yearHint), pm = priceMap(G);
  if (!ok(tm && tm.resid < 1.5, `${tag} ${id}: asse del tempo lineare (${tm ? tm.n : 0} tacche, scarto ${tm ? tm.resid.toFixed(2) : '-'} ${tm ? tm.labels.join(',') : ''})`)) return G;
  if (!ok(pm && pm.resid < 1.5, `${tag} ${id}: asse dei prezzi logaritmico (${pm ? pm.n : 0} tacche ${pm ? pm.labels.join(',') : ''}, scarto ${pm ? pm.resid.toFixed(2) : '-'})`)) return G;
  const t0 = tm.inv(G.F.x), t1 = tm.inv(G.F.x + G.F.w);
  // finestra dei 3 anni
  const fromT = Date.parse(s.from);
  if (fromT < t1) {
    const want = Math.max(G.F.x, tm.f(s.from));
    ok(G.win && Math.abs(G.win.x - want) < 1.5 && Math.abs(G.win.x + G.win.width - (G.F.x + G.F.w)) < 1, `${tag} ${id}: finestra azzurra da ${s.from} (x ${G.win ? G.win.x.toFixed(1) : '-'} atteso ${want.toFixed(1)}) fino al bordo destro`);
  } else ok(!G.win, `${tag} ${id}: nessuna finestra azzurra (periodo prima del ${s.from})`);
  // linea del massimo all'altezza del valore
  const refT = Date.parse(s.refDate);
  if (refT <= t1 + DAY) {
    const wy = pm.f(s.ref);
    ok(G.ref && Math.abs(G.ref.y1 - wy) < 1.5 && Math.abs(G.ref.y1 - G.ref.y2) < 0.01, `${tag} ${id}: linea del massimo ${s.ref} a y=${G.ref ? G.ref.y1.toFixed(1) : '-'} (dalle tacche ${wy.toFixed(1)})`);
    if (G.ref) ok(Math.abs(G.ref.x1 - Math.max(G.F.x, tm.f(s.refDate))) < 1.5 && Math.abs(G.ref.x2 - (G.F.x + G.F.w)) < 0.5, `${tag} ${id}: la linea parte dal massimo (${s.refDate}) e arriva al bordo destro`);
    if (refT >= t0) ok(G.top && Math.abs(G.top.cx - tm.f(s.refDate)) < 1.5 && Math.abs(G.top.cy - wy) < 1.5, `${tag} ${id}: punto sul massimo`);
    const lbl = G.texts.find((t) => /athreft/.test(t.cls));
    ok(lbl && (lbl.s.includes(px(s.ref))), `${tag} ${id}: etichetta del massimo «${lbl ? lbl.s : ''}» con ${px(s.ref)}`);
  } else ok(!G.ref, `${tag} ${id}: nessuna linea del massimo (massimo dopo il periodo)`);
  if (s.cycleLowDate && Date.parse(s.cycleLowDate) >= t0 - DAY && Date.parse(s.cycleLowDate) <= t1 + DAY) ok(G.low && Math.abs(G.low.cx - tm.f(s.cycleLowDate)) < 1.5 && Math.abs(G.low.cy - pm.f(s.cycleLow)) < 1.5, `${tag} ${id}: cerchio del minimo ${s.cycleLowDate} ${s.cycleLow}`);
  if (Date.parse(s.lastDate) <= t1 + DAY && Date.parse(s.lastDate) >= t0) ok(G.last && Math.abs(G.last.cx - tm.f(s.lastDate)) < 1.5 && Math.abs(G.last.cy - pm.f(s.last)) < 1.5, `${tag} ${id}: punto dell'ultima chiusura ${s.lastDate} ${s.last}`);
  // titolo: «prezzo dal <anno della serie>»
  ok(G.title.startsWith(`${m.label}: prezzo dal ${H.d[0].slice(0, 4)}`), `${tag} ${id}: titolo «${G.title}»`);
  // riquadro dei valori in 6 punti (anche ai due bordi)
  const box = await p.locator('#athChart').boundingBox();
  const sc = box.width / G.W, bad = [];
  let nTip = 0;
  for (const f of [0.001, 0.13, 0.37, 0.61, 0.86, 0.999]) {
    const xs = G.F.x + f * G.F.w, cx = box.x + xs * sc, cy = box.y + (G.F.y + G.F.h * 0.5) * sc;
    if (opt.touch) await p.touchscreen.tap(cx, cy); else await p.mouse.move(cx, cy);
    await p.waitForTimeout(60);
    const tip = await p.evaluate(() => { const t = document.getElementById('athTip'); const xh = document.querySelector('#athChart .xhair'); return { hid: t.hidden, txt: t.innerText, rows: [...t.querySelectorAll('.row')].map((r) => [...r.children].map((c) => c.textContent)), xh: xh && +xh.getAttribute('x1'), vis: xh && xh.getAttribute('visibility'), r: t.getBoundingClientRect().toJSON(), vw: innerWidth }; });
    if (tip.hid) { bad.push(`f=${f}: riquadro nascosto`); continue; }
    nTip++;
    const dm = tip.rows[0] && tip.rows[0][0].match(/(\d\d)\/(\d\d)\/(\d{4})/);
    if (!dm) { bad.push(`f=${f}: data assente «${tip.txt}»`); continue; }
    const d = `${dm[3]}-${dm[2]}-${dm[1]}`, c = H.map.get(d);
    // la seduta più vicina al puntatore, dentro il periodo
    const tq = tm.inv(xs); let best = null;
    for (let i = 0; i < H.d.length; i++) { const t = Date.parse(H.d[i]); if (t < t0 - DAY / 2 || t > t1 + DAY / 2) continue; if (!best || Math.abs(t - tq) < Math.abs(Date.parse(best) - tq)) best = H.d[i]; }
    if (best !== d && Math.abs(Date.parse(best) - Date.parse(d)) > 3 * DAY) bad.push(`f=${f}: data ${d}, seduta più vicina ${best}`);
    const cl = tip.rows.find((r) => r[0] === 'Chiusura');
    if (!cl || cl[1] !== (c == null ? '—' : px(c))) bad.push(`f=${f} ${d}: chiusura «${cl && cl[1]}» attesa ${c == null ? '—' : px(c)}`);
    const dr = tip.rows.find((r) => /^Dal massimo/.test(r[0]));
    if (d >= s.refDate && c > 0) { const w = sg((c / s.ref - 1) * 100); if (!dr || dr[1] !== w || !dr[0].includes(dIT(s.refDate))) bad.push(`f=${f} ${d}: distanza «${dr && dr[1]}» attesa ${w}`); }
    else if (dr) bad.push(`f=${f} ${d}: distanza mostrata prima del massimo`);
    if (Math.abs(tip.xh - tm.f(d)) > 1.5) bad.push(`f=${f} ${d}: mirino x=${tip.xh} atteso ${tm.f(d).toFixed(1)}`);
    if (tip.r.left < 0 || tip.r.right > tip.vw) bad.push(`f=${f}: riquadro esce dallo schermo ${tip.r.left.toFixed(0)}..${tip.r.right.toFixed(0)}`);
  }
  ok(!bad.length && nTip === 6, `${tag} ${id}: riquadro dei valori in ${nTip}/6 punti (data, chiusura, distanza, mirino) ${bad.join(' | ')}`);
  if (!opt.touch) await p.mouse.move(1, 1);
  return G;
}

async function rowsOf(p) {
  return p.evaluate(() => [...document.querySelectorAll('#athTable tbody tr.athr')].map((t) => {
    const bar = t.querySelector('.athbar'), i = bar && bar.querySelector('i'), mk = bar && bar.querySelector('.mark');
    const br = bar && bar.getBoundingClientRect(), ir = i && i.getBoundingClientRect(), mr = mk && mk.getBoundingClientRect();
    const q = (s) => { const e = t.querySelector(s); return e ? e.textContent : null; };
    return { id: t.dataset.id, name: q('.nm b'), sub: q('.nm small'), d: q('.dv'), max: q('.c-max'), low: q('.c-low'), last: q('.c-last'), mob: q('.athmob'), lastMuted: !!t.querySelector('.c-last.muted'),
      bar: br && { l: br.left, r: br.right, w: br.width }, fill: ir && { l: ir.left, r: ir.right, w: ir.width }, mark: mr && { c: (mr.left + mr.right) / 2 },
      role: t.getAttribute('role'), tab: t.getAttribute('tabindex'), exp: t.getAttribute('aria-expanded'), aria: bar && bar.getAttribute('aria-label') };
  }));
}
function checkRows(tag, rows, mobile) {
  const bad = []; let n = 0;
  const newest = A.markets.map((m) => m.stats.lastDate).sort().at(-1);
  for (const r of rows) {
    const m = M[r.id], s = m && m.stats; if (!s) { bad.push(`${r.id} non nel file`); continue; }
    n++;
    const ago = s.days === 0 ? "all'ultima seduta" : s.days === 1 ? '1 giorno prima' : `${num(s.days, 0)} giorni fa`;
    if (r.name !== m.label) bad.push(`${r.id} nome «${r.name}»`);
    if (!r.sub || !r.sub.includes(m.symbol)) bad.push(`${r.id} simbolo «${r.sub}»`);
    if (r.d !== sg(s.distPct)) bad.push(`${r.id} distanza «${r.d}» attesa ${sg(s.distPct)}`);
    // barra: da 0 (destra) a −60% (sinistra), misurata in pixel
    const wf = Math.min(1, -s.distPct / 60);
    if (!r.bar || !r.fill || Math.abs(r.fill.w - wf * r.bar.w) > 1 || Math.abs(r.fill.r - r.bar.r) > 0.6) bad.push(`${r.id} barra ${r.fill && r.fill.w.toFixed(1)}px su ${r.bar && r.bar.w.toFixed(1)} attesa ${(wf * (r.bar ? r.bar.w : 0)).toFixed(1)}`);
    if (s.cycleLowPct != null && s.cycleLowPct < 0) {
      const want = r.bar.r - Math.min(1, -s.cycleLowPct / 60) * r.bar.w;
      if (!r.mark || Math.abs(r.mark.c - want) > 1.2) bad.push(`${r.id} tacca a ${r.mark && r.mark.c.toFixed(1)} attesa ${want.toFixed(1)} (${s.cycleLowPct}%)`);
      if (r.mark && r.mark.c > r.fill.l + 0.6) bad.push(`${r.id} tacca dentro la barra: il calo più profondo è minore della distanza di oggi`);
    } else if (r.mark) bad.push(`${r.id} tacca senza calo`);
    if (mobile) {
      const want = [`massimo il ${dIT(s.refDate)}`, ago, `calo più profondo ${sg(s.cycleLowPct)}`, `al ${dIT(s.lastDate)}`];
      for (const w of want) if (!r.mob || !r.mob.includes(w)) bad.push(`${r.id} riga del telefono senza «${w}»: «${r.mob}»`);
    } else {
      if (r.max !== `${dIT(s.refDate)} · ${ago}`) bad.push(`${r.id} massimo «${r.max}» atteso «${dIT(s.refDate)} · ${ago}»`);
      if (r.low !== sg(s.cycleLowPct)) bad.push(`${r.id} calo più profondo «${r.low}» atteso ${sg(s.cycleLowPct)}`);
      if (r.last !== dIT(s.lastDate)) bad.push(`${r.id} ultima «${r.last}»`);
    }
    if (r.lastMuted !== (s.lastDate < newest)) bad.push(`${r.id} grigio della data`);
    if (r.role !== 'button' || r.tab !== '0' || !['true', 'false'].includes(r.exp)) bad.push(`${r.id} aria riga ${r.role}/${r.tab}/${r.exp}`);
    if (!r.aria || !r.aria.includes(sg(s.distPct))) bad.push(`${r.id} aria-label barra «${r.aria}»`);
    // giorni: ricalcolo dalle date
    if (Math.round((Date.parse(s.lastDate) - Date.parse(s.refDate)) / DAY) !== s.days) bad.push(`${r.id} giorni nel file`);
  }
  ok(rows.length === 9 && n === 9 && !bad.length, `${tag}: 9 righe, ${n} confrontate con data/ath.json (nome, simbolo, distanza, barra e tacca in pixel, date, giorni, calo, aria) ${bad.join(' | ')}`);
}
const byDist = A.markets.slice().sort((a, b) => a.stats.distPct - b.stats.distPct).map((m) => m.id);
const byDate = A.markets.slice().sort((a, b) => (a.stats.refDate < b.stats.refDate ? -1 : a.stats.refDate > b.stats.refDate ? 1 : 0)).map((m) => m.id);

async function newCtx(b, opt, theme, extra) {
  const c = await b.newContext(opt);
  await c.addInitScript((t) => { try { if (!sessionStorage.getItem('qa')) { sessionStorage.setItem('qa', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, theme);
  if (extra) await extra(c);
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
  return { c, p, errs };
}
async function openVix(p) {
  await p.goto(BASE + '#vix');
  await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(400);
}
async function openRow(p, id, touch) {
  const l = p.locator(`#athTable tr.athr[data-id="${id}"]`);
  if (touch) await l.tap(); else await l.click();
  await p.waitForFunction((x) => { const t = document.getElementById('athChartTitle').textContent; return document.querySelector('#athChart path.athpx') && t.includes(':') && !document.getElementById('athChartBox').hidden; }, id, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(150);
}
async function dragZoom(p, f0, f1) {
  const G = await chartGeom(p), box = await p.locator('#athChart').boundingBox(), sc = box.width / G.W;
  const X = (f) => box.x + (G.F.x + f * G.F.w) * sc, Y = box.y + (G.F.y + G.F.h * 0.4) * sc;
  await p.mouse.move(X(f0), Y); await p.mouse.down(); await p.mouse.move(X((f0 + f1) / 2), Y, { steps: 4 }); await p.mouse.move(X(f1), Y, { steps: 4 }); await p.mouse.up();
  await p.waitForTimeout(250);
}
async function touchZoom(p, cdp, f0, f1) {
  const G = await chartGeom(p), box = await p.locator('#athChart').boundingBox(), sc = box.width / G.W;
  const X = (f) => box.x + (G.F.x + f * G.F.w) * sc, Y = box.y + (G.F.y + G.F.h * 0.4) * sc;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: X(f0), y: Y }] });
  for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: X(f0 + ((f1 - f0) * k) / 8), y: Y }] }); await p.waitForTimeout(20); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(300);
}
const noHScroll = (p) => p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
// testo tagliato o fuori schermo nel pannello
const clipped = (p) => p.evaluate(() => {
  const out = [];
  for (const e of document.querySelectorAll('#athPanel *')) {
    if (e.closest('svg') || !e.offsetParent) continue;
    const r = e.getBoundingClientRect(); if (!r.width) continue;
    const cs = getComputedStyle(e);
    if (r.right > innerWidth + 0.5 || r.left < -0.5) { if (!e.closest('.tscroll') || e.closest('.tscroll').scrollWidth > e.closest('.tscroll').clientWidth) out.push(`fuori schermo: ${e.tagName}.${e.className} «${(e.textContent || '').slice(0, 40)}» ${r.left.toFixed(0)}..${r.right.toFixed(0)}`); }
    if (e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible') out.push(`tagliato: ${e.tagName}.${e.className} «${e.textContent.slice(0, 40)}»`);
  }
  const ts = document.querySelector('#athPanel .tscroll'); if (ts && ts.scrollWidth > ts.clientWidth + 1) out.push(`tabella con scorrimento orizzontale ${ts.scrollWidth}/${ts.clientWidth}`);
  return out;
});
const realErrs = (errs) => errs.filter((e) => !/Failed to load resource.*404|status of 404/.test(e));

(async () => {
  const b = await chromium.launch();

  // ================= COMPUTER =================
  if (PHASES.includes('desk')) for (const [name, vw, theme] of [['1440-scuro', 1440, 'dark'], ['1280-chiaro', 1280, 'light']]) {
    const { c, p, errs } = await newCtx(b, { viewport: { width: vw, height: 900 } }, theme);
    await openVix(p);
    const T = `${name}`;
    await p.locator('#athPanel').scrollIntoViewIfNeeded();
    await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-pannello.png`) });
    const rows = await rowsOf(p);
    checkRows(`${T} tabella`, rows, false);
    ok(JSON.stringify(rows.map((r) => r.id)) === JSON.stringify(byDist), `${T}: ordine per distanza ${rows.map((r) => r.id).join(' ')}`);
    const ths = await p.$$eval('#athTable thead th', (x) => x.map((t) => t.textContent));
    ok(ths.length === 5, `${T}: 5 intestazioni (${ths.join(' | ')})`);
    // tastiera: Tab dai pulsanti dell'ordine alla prima riga, Invio apre, Spazio chiude senza scorrere la pagina
    await p.focus('#athSort button[data-sort="date"]');
    let hops = 0, fid = null;
    for (; hops < 6; hops++) { await p.keyboard.press('Tab'); fid = await p.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.id); if (fid) break; }
    ok(fid === byDist[0], `${T}: Tab porta alla prima riga (${fid}) in ${hops + 1} passi`);
    const fv = await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a.querySelector('td')); return { bg: cs.backgroundColor, ol: getComputedStyle(a).outlineStyle + ' ' + getComputedStyle(a).outlineWidth, fv: a.matches(':focus-visible') }; });
    ok(fv.fv && fv.bg !== 'rgba(0, 0, 0, 0)', `${T}: riga con il focus visibile (sfondo ${fv.bg}, outline ${fv.ol})`);
    if (fv.ol.startsWith('none')) note(`${T}: la riga col focus ha solo lo sfondo, nessun contorno (${fv.ol})`);
    await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    let st = await p.evaluate(() => ({ exp: document.activeElement.getAttribute('aria-expanded'), id: document.activeElement.dataset.id, det: document.querySelectorAll('#athTable tr.athdet').length, box: !document.getElementById('athChartBox').hidden }));
    ok(st.exp === 'true' && st.id === byDist[0] && st.det === 1 && st.box, `${T}: Invio apre dettaglio e grafico, il focus resta sulla riga (${JSON.stringify(st)})`);
    await p.waitForSelector('#athChart path.athpx', { timeout: 15000 }).catch(() => {});
    const sy0 = await p.evaluate(() => scrollY);
    await p.keyboard.press(' '); await p.waitForTimeout(300);
    st = await p.evaluate(() => ({ exp: document.activeElement.getAttribute('aria-expanded'), det: document.querySelectorAll('#athTable tr.athdet').length, box: document.getElementById('athChartBox').hidden, sy: scrollY }));
    ok(st.exp === 'false' && st.det === 0 && st.box && Math.abs(st.sy - sy0) < 2, `${T}: Spazio chiude, la pagina non scorre (${JSON.stringify(st)}, prima ${sy0})`);
    await p.keyboard.press('Tab'); await p.keyboard.press(' '); await p.waitForTimeout(300);
    st = await p.evaluate(() => ({ id: document.activeElement.dataset.id, exp: document.activeElement.getAttribute('aria-expanded') }));
    ok(st.id === byDist[1] && st.exp === 'true', `${T}: Tab alla riga dopo e Spazio la apre (${JSON.stringify(st)})`);
    // da tastiera si arriva ai pulsanti del periodo e alla lente del grafico
    const tabSeq = [];
    for (let k = 0; k < 8; k++) { await p.keyboard.press('Tab'); tabSeq.push(await p.evaluate(() => { const a = document.activeElement; return a.dataset.id || a.dataset.range || a.id || a.tagName; })); }
    note(`${T}: ordine del Tab dopo la riga aperta: ${tabSeq.join(' → ')}`);
    ok(tabSeq.some((x) => x === '3A' || x === 'MAX') ? tabSeq.indexOf(byDist[2]) < tabSeq.findIndex((x) => ['3A', '10A', 'MAX'].includes(x)) || true : false, `${T}: i periodi del grafico si raggiungono col Tab`);
    // ogni mercato, i tre periodi
    for (const id of byDist) {
      await openRow(p, id, false);
      if (!(await p.$(`#athTable tr.athr[data-id="${id}"][aria-expanded="true"]`))) { // era già aperto: il clic l'ha chiuso
        await openRow(p, id, false);
      }
      const det = await p.$eval('#athTable tr.athdet', (t) => t.textContent).catch(() => '');
      const s = M[id].stats, cur = id === 'KOSPI' ? ' won' : '';
      const need = [`ultima chiusura ${px(s.last)}${cur} il ${dIT(s.lastDate)}`, `ultimi 3 anni (dal ${dIT(s.from)}) ${px(s.ref)}${cur} il ${dIT(s.refDate)}`, `durante la seduta ${px(s.intradayRef)} il ${dIT(s.intradayRefDate)}`,
        s.cycleLow != null ? `calo più profondo dopo il massimo ${sg(s.cycleLowPct)} il ${dIT(s.cycleLowDate)}, da lì ${sg(s.fromLowPct)}` : 'nessun calo',
        s.athDate !== s.refDate ? `massimo di sempre ${px(s.ath)}${cur} il ${dIT(s.athDate)} (${sg(s.athDistPct)}), serie dal ${dIT(s.start)}` : `è anche il massimo di sempre, serie dal ${dIT(s.start)}`];
      const miss = need.filter((w) => !det.includes(w));
      ok(!miss.length, `${T} ${id}: dettaglio con i numeri del file ${miss.map((w) => `manca «${w}»`).join(' | ')}`);
      // controllo incrociato con la storia: ultima chiusura e massimo
      const H = HIST[id];
      ok(Math.abs(H.c[H.c.length - 1] - s.last) < 1e-3 && H.d[H.d.length - 1] === s.lastDate && Math.abs(H.map.get(s.refDate) - s.ref) < 1e-3, `${T} ${id}: storia del grafico e file dei numeri coincidono su ultima chiusura e massimo`);
      for (const R of ['3A', '10A', 'MAX']) {
        await p.click(`#athRange button[data-range="${R}"]`); await p.waitForTimeout(200);
        const G = await checkChart(p, `${T} ${R}`, id);
        if (G) {
          // periodo: inizio del grafico
          const tm = timeMap(G); const t0 = tm && tm.inv(G.F.x), tEnd = Date.parse(H.d[H.d.length - 1]);
          const want = R === 'MAX' ? Date.parse(H.d[0]) : Math.max(Date.parse(H.d[0]), tEnd - (R === '3A' ? 3 : 10) * 365.25 * DAY);
          ok(tm && Math.abs(t0 - want) < 3 * DAY && Math.abs(tm.inv(G.F.x + G.F.w) - tEnd) < 3 * DAY, `${T} ${R} ${id}: il grafico va da ${tm && iso(t0)} (atteso ${iso(want)}) a ${tm && iso(tm.inv(G.F.x + G.F.w))}`);
        }
        if (['BTC', 'WTI', 'SPX', 'GOLD'].includes(id) || R === 'MAX') await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-${id}-${R}.png`) });
      }
    }
    // WTI MAX: la chiusura negativa del 20/04/2020
    await openRow(p, 'WTI', false); if (!(await p.$('#athTable tr.athr[data-id="WTI"][aria-expanded="true"]'))) await openRow(p, 'WTI', false);
    await p.click('#athRange button[data-range="MAX"]'); await p.waitForTimeout(200);
    {
      const G = await chartGeom(p), tm = timeMap(G), box = await p.locator('#athChart').boundingBox(), sc = box.width / G.W;
      await p.mouse.move(box.x + tm.f('2020-04-20') * sc, box.y + (G.F.y + 40) * sc); await p.waitForTimeout(80);
      const t = await p.$eval('#athTip', (x) => x.innerText);
      note(`WTI MAX al 20/04/2020 il riquadro dice: ${t.replace(/\n/g, ' / ')}`);
      ok(/20\/04\/2020/.test(t) ? /−37,63/.test(t) : /\/04\/2020/.test(t), `${T}: WTI 20/04/2020 nel riquadro con la chiusura negativa (−37,63) o un giorno accanto`);
      const d = await p.$eval('#athChart path.athpx', (x) => x.getAttribute('d'));
      ok(!/NaN|Infinity/.test(d) && (d.match(/M/g) || []).length >= 2, `${T}: WTI linea interrotta sulla chiusura negativa, nessun NaN (${(d.match(/M/g) || []).length} tratti)`);
      await p.mouse.move(1, 1);
    }
    // zoom con il mouse: SPX 10A
    await openRow(p, 'SPX', false); if (!(await p.$('#athTable tr.athr[data-id="SPX"][aria-expanded="true"]'))) await openRow(p, 'SPX', false);
    await p.click('#athRange button[data-range="10A"]'); await p.waitForTimeout(200);
    const how = [['×', async () => { await p.click('#athZoom button'); }], ['doppio clic', async () => { const bx = await p.locator('#athChart').boundingBox(); await p.mouse.dblclick(bx.x + bx.width * 0.5, bx.y + bx.height * 0.5); }], ['Esc', async () => { await p.keyboard.press('Escape'); }], ['pulsante del periodo', async () => { await p.click('#athRange button[data-range="10A"]'); }]];
    for (const [lab, undo] of how) {
      await dragZoom(p, 0.55, 0.85);
      const G = await chartGeom(p);
      const m = G.chip && G.chip.match(/dal (\d\d\/\d\d\/\d{4}) al (\d\d\/\d\d\/\d{4})/);
      ok(!!m, `${T}: zoom col trascinamento, etichetta «${G.chip}»`);
      if (m) {
        const y0 = +m[1].slice(6);
        await checkChart(p, `${T} zoom(${lab})`, 'SPX', { yearHint: y0 });
        const tm = timeMap(G, y0), a = Date.parse(m[1].split('/').reverse().join('-')), z = Date.parse(m[2].split('/').reverse().join('-'));
        ok(tm && Math.abs(tm.inv(G.F.x) - a) < 2 * DAY && Math.abs(tm.inv(G.F.x + G.F.w) - z) < 2 * DAY, `${T}: il grafico zoomato va da ${m[1]} a ${m[2]}`);
        const aria = await p.getAttribute('#athChart', 'aria-label');
        ok(/zoom dal/.test(aria), `${T}: aria-label del grafico con lo zoom «${aria}»`);
      }
      if (lab === '×') await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-SPX-zoom.png`) });
      await undo(); await p.waitForTimeout(250);
      const G2 = await chartGeom(p), tm2 = timeMap(G2);
      ok(!G2.chip && tm2 && Math.abs(tm2.inv(G2.F.x) - (Date.parse(M.SPX.stats.lastDate) - 10 * 365.25 * DAY)) < 4 * DAY, `${T}: zoom tolto con ${lab}, torna il periodo 10A`);
    }
    // zoom dopo il massimo (la linea parte dal bordo sinistro) e prima della finestra dei 3 anni
    await dragZoom(p, 0.93, 0.999);
    { const G = await chartGeom(p); const yh = G.chip && +G.chip.match(/dal \d\d\/\d\d\/(\d{4})/)[1]; await checkChart(p, `${T} zoom finale`, 'SPX', { yearHint: yh }); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await dragZoom(p, 0.02, 0.2);
    { const G = await chartGeom(p); const yh = G.chip && +G.chip.match(/dal \d\d\/\d\d\/(\d{4})/)[1]; await checkChart(p, `${T} zoom iniziale`, 'SPX', { yearHint: yh }); await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-SPX-zoom-prima.png`) }); }
    // cambiando mercato lo zoom si toglie
    await openRow(p, 'NDX', false);
    ok(!(await chartGeom(p)).chip, `${T}: cambiando mercato lo zoom si toglie`);
    // zoom troppo corto: niente zoom
    await p.click('#athRange button[data-range="3A"]'); await p.waitForTimeout(200);
    await dragZoom(p, 0.5, 0.505);
    ok(!(await chartGeom(p)).chip, `${T}: trascinamento di pochi pixel non fa zoom`);
    // ordine per data del massimo, ricordato; periodo del grafico ricordato
    await p.click('#athSort button[data-sort="date"]'); await p.waitForTimeout(200);
    const ids = await p.$$eval('#athTable tbody tr.athr', (t) => t.map((x) => x.dataset.id));
    ok(JSON.stringify(ids) === JSON.stringify(byDate), `${T}: ordine per data del massimo ${ids.join(' ')}`);
    ok((await p.$$('#athTable tr.athdet')).length === 1 && (await p.$eval('#athTable tr.athr.on', (x) => x.dataset.id)) === 'NDX', `${T}: cambiando ordine resta aperto lo stesso mercato`);
    await p.reload(); await p.waitForSelector('#athTable tbody tr.athr', { timeout: 30000 }); await p.waitForTimeout(300);
    ok((await p.getAttribute('#athSort button[data-sort="date"]', 'aria-pressed')) === 'true' && JSON.stringify(await p.$$eval('#athTable tbody tr.athr', (t) => t.map((x) => x.dataset.id))) === JSON.stringify(byDate), `${T}: ordine ricordato dopo il ricaricamento`);
    await openRow(p, 'KOSPI', false);
    ok((await p.getAttribute('#athRange button[data-range="3A"]', 'aria-pressed')) === 'true', `${T}: periodo 3A del grafico ricordato dopo il ricaricamento`);
    await checkChart(p, `${T} dopo ricarica`, 'KOSPI');
    // navigazione: altra vista e ritorno
    await p.click('#athRange button[data-range="10A"]'); await p.waitForTimeout(150);
    const before = await chartGeom(p);
    await p.evaluate(() => { location.hash = '#monitor'; }); await p.waitForTimeout(700);
    await p.keyboard.press('1'); await p.waitForTimeout(600);
    await p.evaluate(() => { location.hash = '#vix'; }); await p.waitForTimeout(900);
    const after = await chartGeom(p);
    const vxOk = await p.evaluate(() => !document.getElementById('v-vix').hidden);
    ok(vxOk && after && !document.hidden && after.title === before.title && Math.abs(after.W - before.W) < 2 && (await p.$$('#athTable tr.athdet')).length === 1, `${T}: tornando alla vista VIX il pannello è coerente (titolo «${after && after.title}», larghezza ${after && after.W} contro ${before.W}, dettaglio aperto)`);
    if (after) await checkChart(p, `${T} dopo navigazione`, 'KOSPI');
    // ridimensionamento: il grafico si ridisegna alla nuova larghezza
    await p.setViewportSize({ width: vw === 1440 ? 1100 : 1440, height: 900 }); await p.waitForTimeout(900);
    const rz = await chartGeom(p);
    ok(rz && Math.abs(rz.W - Math.round(Math.min(1600, rz.cssW * (rz.cssW < 1000 ? 1 : 1.15)))) <= 2, `${T}: dopo il ridimensionamento il disegno è largo ${rz && rz.W} per ${rz && rz.cssW.toFixed(0)} px`);
    if (rz) await checkChart(p, `${T} ridimensionato`, 'KOSPI');
    await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-ridimensionato.png`) });
    const sw = await noHScroll(p);
    ok(sw[0] <= sw[1], `${T}: nessuno scorrimento orizzontale (${sw})`);
    ok(!errs.length, `${T}: console senza errori né avvisi ${errs.join(' | ')}`);
    await c.close();
  }

  // ================= TELEFONO =================
  if (PHASES.includes('mob')) for (const [name, vw, vh, theme] of [['390-scuro', 390, 844, 'dark'], ['360-chiaro', 360, 780, 'light'], ['390-chiaro', 390, 844, 'light'], ['360-scuro', 360, 780, 'dark']]) {
    const full = name === '390-scuro' || name === '360-chiaro';
    const { c, p, errs } = await newCtx(b, { viewport: { width: vw, height: vh }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, theme);
    const cdp = await c.newCDPSession(p);
    await openVix(p);
    const T = name;
    await p.locator('#athPanel').scrollIntoViewIfNeeded();
    await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-pannello.png`) });
    if (!full) { // solo screenshot e controlli rapidi nell'altro tema
      await openRow(p, 'BTC', true); await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-BTC.png`) });
      ok(!realErrs(errs).length, `${T}: console ${errs.join(' | ')}`); await c.close(); continue;
    }
    const rows = await rowsOf(p);
    checkRows(`${T} tabella`, rows, true);
    const cl = await clipped(p);
    ok(!cl.length, `${T}: nel pannello nessun testo tagliato o fuori schermo ${cl.join(' | ')}`);
    // sovrapposizioni tra nome, distanza e barra
    const ov = await p.evaluate(() => { const out = []; for (const t of document.querySelectorAll('#athTable tr.athr')) { const els = [t.querySelector('.nm b'), t.querySelector('.nm small'), t.querySelector('.dv'), t.querySelector('.athbar'), t.querySelector('.athmob')].filter(Boolean).map((e) => [e.className || e.tagName, e.getBoundingClientRect()]); for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i][1], b = els[j][1]; if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) out.push(`${t.dataset.id}: ${els[i][0]}/${els[j][0]}`); } } return out; });
    ok(!ov.length, `${T}: righe senza sovrapposizioni ${ov.join(' | ')}`);
    const sizes = await p.evaluate(() => [...document.querySelectorAll('#athTable tr.athr')].map((t) => t.getBoundingClientRect().height));
    ok(sizes.every((h) => h >= 44), `${T}: righe toccabili alte almeno 44 px (${sizes.map((h) => h.toFixed(0)).join(',')})`);
    await p.locator('#athSort button[data-sort="date"]').tap(); await p.waitForTimeout(200);
    ok(JSON.stringify(await p.$$eval('#athTable tbody tr.athr', (t) => t.map((x) => x.dataset.id))) === JSON.stringify(byDate), `${T}: tocco su «per data del massimo»`);
    await p.locator('#athSort button[data-sort="dist"]').tap(); await p.waitForTimeout(200);
    for (const id of ['BTC', 'GOLD', 'SILVER', 'WTI', 'KOSPI', 'COPPER']) {
      await openRow(p, id, true); if (!(await p.$(`#athTable tr.athr[data-id="${id}"][aria-expanded="true"]`))) await openRow(p, id, true);
      for (const R of ['3A', '10A', 'MAX']) {
        await p.locator(`#athRange button[data-range="${R}"]`).tap(); await p.waitForTimeout(200);
        await checkChart(p, `${T} ${R}`, id, { touch: true });
        if (R === 'MAX' || id === 'BTC') await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-${id}-${R}.png`) });
      }
      const sw = await noHScroll(p); ok(sw[0] <= sw[1], `${T} ${id}: nessuno scorrimento orizzontale (${sw})`);
      const cl2 = await clipped(p); ok(!cl2.length, `${T} ${id}: dettaglio e grafico senza testo tagliato ${cl2.join(' | ')}`);
    }
    // il riquadro dei valori si chiude toccando fuori
    await p.locator('#athNote').tap(); await p.waitForTimeout(150);
    ok(await p.$eval('#athTip', (x) => x.hidden), `${T}: il riquadro dei valori si chiude toccando fuori dal grafico`);
    // lente e trascinamento al tocco
    await p.locator('#athRange button[data-range="10A"]').tap(); await p.waitForTimeout(200);
    const sy0 = await p.evaluate(() => scrollY);
    await touchZoom(p, cdp, 0.3, 0.7);
    ok(!(await chartGeom(p)).chip, `${T}: senza lente il trascinamento al tocco non fa zoom`);
    await p.locator('#athLens').tap(); await p.waitForTimeout(100);
    ok((await p.getAttribute('#athLens', 'aria-pressed')) === 'true', `${T}: lente accesa`);
    await touchZoom(p, cdp, 0.3, 0.7);
    const G = await chartGeom(p);
    ok(!!G.chip && (await p.getAttribute('#athLens', 'aria-pressed')) === 'false', `${T}: zoom con la lente «${G.chip}», poi la lente si spegne`);
    if (G.chip) { const yh = +G.chip.match(/dal \d\d\/\d\d\/(\d{4})/)[1]; await checkChart(p, `${T} zoom`, 'COPPER', { touch: true, yearHint: yh }); }
    await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `${name}-COPPER-zoom.png`) });
    const chipBox = await p.locator('#athZoom').boundingBox();
    ok(chipBox && chipBox.x >= 0 && chipBox.x + chipBox.width <= vw, `${T}: etichetta dello zoom dentro lo schermo (${chipBox && (chipBox.x + chipBox.width).toFixed(0)})`);
    await p.locator('#athZoom button').tap(); await p.waitForTimeout(200);
    ok(!(await chartGeom(p)).chip, `${T}: × toglie lo zoom`);
    // intestazione del sotto-pannello: titolo, periodi e lente sulla stessa larghezza
    const hd = await p.evaluate(() => { const h = document.querySelector('#athChartBox .ph'); const r = h.getBoundingClientRect(); return [...h.querySelectorAll('h3, button')].map((e) => { const q = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20) || e.id, q.left.toFixed(0), q.right.toFixed(0), q.top.toFixed(0)]; }).concat([['ph', r.left.toFixed(0), r.right.toFixed(0)]]); });
    note(`${T}: intestazione del grafico ${JSON.stringify(hd)}`);
    const sw = await noHScroll(p); ok(sw[0] <= sw[1], `${T}: nessuno scorrimento orizzontale (${sw})`);
    ok(!errs.length, `${T}: console senza errori né avvisi ${errs.join(' | ')}`);
    await c.close();
  }

  // ================= FILE MANCANTI E DATI STRANI =================
  if (PHASES.includes('miss')) {
    const cases = [
      ['senza-ath', (c) => c.route('**/data/ath.json*', (r) => r.fulfill({ status: 404, body: 'no' }))],
      ['senza-storia', (c) => c.route('**/data/ath_history.json*', (r) => r.fulfill({ status: 404, body: 'no' }))],
      ['storia-lenta', (c) => c.route('**/data/ath_history.json*', async (r) => { await new Promise((z) => setTimeout(z, 2500)); r.continue(); })],
      ['dati-strani', async (c) => {
        const X = JSON.parse(JSON.stringify(A));
        X.markets.find((m) => m.id === 'COPPER').stats = null;
        Object.assign(X.markets.find((m) => m.id === 'SPX').stats, { distPct: 0, days: 0, cycleLow: null, cycleLowDate: null, cycleLowPct: null, fromLowPct: null, refDate: X.markets.find((m) => m.id === 'SPX').stats.lastDate, ref: X.markets.find((m) => m.id === 'SPX').stats.last });
        Object.assign(X.markets.find((m) => m.id === 'WTI').stats, { belowZero: '2020-04-20', cycleLow: null, cycleLowDate: null, cycleLowPct: null, fromLowPct: null });
        Object.assign(X.markets.find((m) => m.id === 'KOSPI').stats, { lastDate: '2026-11-10' });
        Object.assign(X.markets.find((m) => m.id === 'SILVER').stats, { distPct: -75.2 });
        const Hx = JSON.parse(JSON.stringify(HJ)); delete Hx.series.BTC;
        await c.route('**/data/ath.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(X) }));
        await c.route('**/data/ath_history.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Hx) }));
      }],
    ];
    for (const [lab, route] of cases) {
      const { c, p, errs } = await newCtx(b, { viewport: { width: 1280, height: 900 } }, 'light', route);
      await p.goto(BASE + '#vix'); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(700);
      const base = await p.evaluate(() => ({ kpis: document.querySelectorAll('#vxKpis .kpi').length, sc: document.querySelectorAll('#vxScatter circle, #vxScatter *').length, chart: !!document.querySelector('#vxChart path'), rows: document.querySelectorAll('#athTable tr.athr').length, miss: document.getElementById('athMiss').hidden ? null : document.getElementById('athMiss').textContent }));
      ok(base.kpis > 0 && base.chart, `${lab}: il resto della vista VIX funziona (${base.kpis} riquadri, grafico grande)`);
      if (lab === 'senza-ath') {
        ok(base.miss && /non disponibili/.test(base.miss) && base.rows === 0 && (await p.$eval('#athChartBox', (x) => x.hidden)), `${lab}: il pannello dice «${base.miss}»`);
        // i pulsanti dell'ordine senza dati
        await p.click('#athSort button[data-sort="date"]'); await p.waitForTimeout(150);
        ok((await p.$$('#athTable tr')).length === 0, `${lab}: cambiare ordine senza dati non rompe nulla`);
        await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `miss-${lab}.png`) });
      } else if (lab === 'senza-storia') {
        await openRow(p, 'BTC', false); await p.waitForTimeout(500);
        const g = await chartGeom(p);
        const msg = await p.$eval('#athChartMiss', (x) => (x.hidden ? null : x.textContent));
        ok(msg && /non disponibile/.test(msg) && !(await p.$('#athChart path.athpx')), `${lab}: il grafico dice «${msg}»`);
        ok((await p.$$('#athTable tr.athdet')).length === 1, `${lab}: il dettaglio c'è lo stesso`);
        const leftovers = await p.evaluate(() => ({ legend: document.getElementById('athLegend').textContent, svgKids: document.getElementById('athChart').childElementCount, title: document.getElementById('athChartTitle').textContent, wrapH: document.getElementById('athWrap').getBoundingClientRect().height }));
        note(`${lab}: con lo storico mancante restano titolo «${leftovers.title}», leggenda «${leftovers.legend}», ${leftovers.svgKids} elementi nell'SVG, area alta ${leftovers.wrapH.toFixed(0)} px`);
        // pulsanti del periodo e lente senza storico
        await p.click('#athRange button[data-range="MAX"]'); await p.waitForTimeout(150);
        await openRow(p, 'SPX', false); await p.waitForTimeout(200);
        const msg2 = await p.$eval('#athChartMiss', (x) => (x.hidden ? null : x.textContent));
        ok(msg2 && /non disponibile/.test(msg2), `${lab}: anche su un altro mercato «${msg2}»`);
        await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `miss-${lab}.png`) });
      } else if (lab === 'storia-lenta') {
        await openRow(p, 'BTC', false);
        const m1 = await p.$eval('#athChartMiss', (x) => (x.hidden ? null : x.textContent));
        ok(/Caricamento/.test(m1 || ''), `${lab}: durante il caricamento «${m1}»`);
        // cambio mercato durante il caricamento
        await p.click('#athTable tr.athr[data-id="GOLD"]'); await p.waitForTimeout(100);
        await p.waitForSelector('#athChart path.athpx', { timeout: 10000 }).catch(() => {});
        await p.waitForTimeout(300);
        const t = await p.$eval('#athChartTitle', (x) => x.textContent);
        ok(/^Oro: prezzo dal 2004/.test(t), `${lab}: dopo il caricamento il grafico è del mercato scelto per ultimo («${t}»)`);
        await checkChart(p, lab, 'GOLD');
        // via dalla vista durante il caricamento e ritorno
      } else if (lab === 'dati-strani') {
        const rows = await rowsOf(p);
        const cu = rows.find((r) => r.id === 'COPPER'), spx = rows.find((r) => r.id === 'SPX'), wti = rows.find((r) => r.id === 'WTI'), ko = rows.find((r) => r.id === 'KOSPI'), si = rows.find((r) => r.id === 'SILVER');
        ok(rows.length === 9 && rows[8].id === 'COPPER' && /dati non disponibili/.test((await p.$eval('#athTable tr.athr[data-id="COPPER"]', (x) => x.textContent))), `${lab}: mercato senza dati in fondo con «dati non disponibili» (${rows.map((r) => r.id).join(' ')})`);
        ok(cu.tab == null, `${lab}: la riga senza dati non è cliccabile`);
        ok(spx.d === '0,00%' && spx.fill.w < 0.6 && !spx.mark && spx.max.includes("all'ultima seduta") && /—/.test(spx.low), `${lab}: al massimo oggi «${spx.d}», «${spx.max}», calo «${spx.low}»`);
        ok(/sotto zero/.test(wti.low) && !wti.mark, `${lab}: chiusura sotto zero → «${wti.low}», niente tacca`);
        ok(ko.lastMuted, `${lab}: data vecchia in grigio`);
        ok(Math.abs(si.fill.w - si.bar.w) < 0.6 && si.fill.l >= si.bar.l - 0.5, `${lab}: calo oltre −60% → barra piena e non fuori (${si.fill.w.toFixed(1)}/${si.bar.w.toFixed(1)})`);
        const siMark = await p.evaluate(() => { const r = document.querySelector('#athTable tr[data-id="SILVER"] .mark'); const b = document.querySelector('#athTable tr[data-id="SILVER"] .athbar'); return r && [r.getBoundingClientRect().left, b.getBoundingClientRect().left]; });
        note(`${lab}: argento a −75,2% (finto): tacca del calo −57,77% a x=${siMark && siMark[0].toFixed(0)}, inizio barra ${siMark && siMark[1].toFixed(0)} (la tacca finisce dentro la barra piena)`);
        await openRow(p, 'BTC', false); await p.waitForTimeout(300);
        const msg = await p.$eval('#athChartMiss', (x) => (x.hidden ? null : x.textContent));
        ok(/Storico di questo mercato non disponibile/.test(msg || ''), `${lab}: storico di un solo mercato mancante «${msg}»`);
        await openRow(p, 'SPX', false); await p.waitForTimeout(300);
        const det = await p.$eval('#athTable tr.athdet', (x) => x.textContent);
        ok(/nessun calo dopo il massimo/.test(det), `${lab}: dettaglio «nessun calo dopo il massimo»`);
        await openRow(p, 'WTI', false); await p.waitForTimeout(300);
        ok(/sotto zero \(20\/04\/2020\)/.test(await p.$eval('#athTable tr.athdet', (x) => x.textContent)), `${lab}: dettaglio con la chiusura sotto zero`);
        await p.locator('#athPanel').screenshot({ path: path.join(SHOTS, `miss-${lab}.png`) });
      }
      ok(!realErrs(errs).length, `${lab}: console senza errori (a parte il 404 voluto) ${realErrs(errs).join(' | ')}`);
      await c.close();
    }
    // via dalla vista mentre lo storico si carica, poi ritorno
    {
      const { c, p, errs } = await newCtx(b, { viewport: { width: 1280, height: 900 } }, 'dark', (c) => c.route('**/data/ath_history.json*', async (r) => { await new Promise((z) => setTimeout(z, 2000)); r.continue(); }));
      await openVix(p); await openRow(p, 'SOXX', false);
      await p.evaluate(() => { location.hash = '#sector'; }); await p.waitForTimeout(2600);
      await p.evaluate(() => { location.hash = '#vix'; }); await p.waitForTimeout(800);
      await checkChart(p, 'ritorno dopo caricamento', 'SOXX');
      ok(!errs.length, `ritorno dopo caricamento: console ${errs.join(' | ')}`);
      await c.close();
    }
  }

  // ================= REGRESSIONI NEL RESTO DELLA VISTA VIX =================
  if (PHASES.includes('reg')) for (const [name, opt] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const { c, p, errs } = await newCtx(b, opt, 'dark');
    await openVix(p);
    const s = await p.evaluate(() => ({ kpis: document.querySelectorAll('#vxKpis .kpi').length, sc: document.querySelectorAll('#vxScatter circle').length, eps: document.querySelectorAll('#vxEps tbody tr, #vxTable tbody tr').length, chartPaths: document.querySelectorAll('#vxChart path').length, order: [...document.querySelectorAll('#v-vix .panel')].map((x) => (x.querySelector('h2') || {}).textContent || x.id) }));
    note(`${name}: pannelli della vista VIX nell'ordine: ${s.order.join(' / ')}`);
    const iAth = s.order.findIndex((t) => /Distanza dal massimo/.test(t)), iHow = s.order.findIndex((t) => /Come leggere/.test(t));
    ok(iAth >= 0 && iHow > iAth, `${name}: il pannello è prima di «Come leggere il VIX» (${iAth} < ${iHow})`);
    ok(s.kpis >= 4 && s.sc > 20 && s.chartPaths > 3, `${name}: riquadri ${s.kpis}, punti dello scatter ${s.sc}, linee del grafico grande ${s.chartPaths}, righe ${s.eps}`);
    if (!opt.isMobile) {
      // zoom del grafico grande
      await p.locator('#vxChart').scrollIntoViewIfNeeded();
      const bx = await p.locator('#vxChart').boundingBox();
      await p.mouse.move(bx.x + bx.width * 0.5, bx.y + 60); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * 0.6, bx.y + 60, { steps: 5 }); await p.mouse.move(bx.x + bx.width * 0.75, bx.y + 60, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
      const z = await p.evaluate(() => (document.getElementById('vxZoom').hidden ? null : document.getElementById('vxZoom').textContent));
      ok(!!z, `${name}: zoom del grafico grande del VIX «${z}»`);
      // Esc con entrambi gli zoom: uno solo alla volta?
      const ab = await p.locator('#athTable tr.athr[data-id="BTC"]'); await ab.click(); await p.waitForSelector('#athChart path.athpx');
      await dragZoom(p, 0.4, 0.8);
      const both = await p.evaluate(() => [!document.getElementById('vxZoom').hidden, !document.getElementById('athZoom').hidden]);
      await p.keyboard.press('Escape'); await p.waitForTimeout(250);
      const after = await p.evaluate(() => [!document.getElementById('vxZoom').hidden, !document.getElementById('athZoom').hidden]);
      note(`${name}: zoom attivi VIX/pannello prima di Esc ${both}, dopo ${after} (Esc toglie gli zoom dei grafici visibili sullo schermo)`);
      ok(!after[1], `${name}: Esc toglie lo zoom del grafico del pannello`);
      // periodo del grafico grande: non tocca il pannello
      await p.click('#vxRange button[data-range="MAX"]'); await p.waitForTimeout(300);
      ok(!(await p.$eval('#athChartBox', (x) => x.hidden)) && (await p.getAttribute('#athRange button[data-range="10A"]', 'aria-pressed')) === 'true', `${name}: il periodo del grafico grande non cambia il pannello`);
      // SPX/NDX nel grafico grande: il pannello resta aperto
      await p.click('#vxIx button[data-ix="NDX"]'); await p.waitForTimeout(400);
      ok((await p.$$('#athTable tr.athdet')).length === 1 && !!(await p.$('#athChart path.athpx')), `${name}: cambiando indice (NDX) il pannello resta aperto con il grafico`);
      // scatter: clic su un punto evidenzia una crisi
      const dot = await p.$('#vxScatter circle[data-g], #vxScatter [data-g]');
      if (dot) { await dot.click({ force: true }); await p.waitForTimeout(200); const h = await p.$$('#vxScatter .vxhalo'); ok(h.length > 0, `${name}: clic su un punto dello scatter → alone (${h.length})`); await p.keyboard.press('Escape'); }
      else note(`${name}: nessun punto con data-g nello scatter`);
      await p.screenshot({ path: path.join(SHOTS, `reg-${name}-pagina.png`), fullPage: true });
    } else await p.screenshot({ path: path.join(SHOTS, `reg-${name}-pagina.png`), fullPage: true });
    const sw = await noHScroll(p); ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale nella vista VIX (${sw})`);
    ok(!errs.length, `${name} reg: console ${errs.join(' | ')}`);
    await c.close();
  }
  await b.close();
  console.log(`\n${pass} OK, ${fail} FAIL`);
  if (issues.length) console.log('FALLITI:\n- ' + issues.join('\n- '));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
