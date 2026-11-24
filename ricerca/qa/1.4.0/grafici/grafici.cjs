// Controllo dei grafici della vista 8 (1.4.0): ridisegna in modo indipendente le coordinate attese (attese.json) e le
// confronta con l'SVG; riquadro dei valori a date scelte; quadrante della forza relativa; testi tagliati o sovrapposti.
// Uso: BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/grafici/grafici.cjs [veloce]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8794/', OUT = path.join(__dirname, 'shots');
const X = JSON.parse(fs.readFileSync(path.join(__dirname, 'attese.json'), 'utf8'));
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../config/emerging.json'), 'utf8'));
const FAST = process.argv.includes('veloce');
const DAY = 86400000;
let pass = 0, fail = 0, warn = 0; const fails = [];
const ok = (c, m) => { if (process.env.VERBOSE) console.log(c ? 'OK  ' + m : ''); if (c) pass++; else { fail++; fails.push(m); console.log('FAIL', m); } };
const att = (m) => { warn++; console.log('ATTENZIONE', m); };
const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : (v < 0 && Math.abs(v).toFixed(d) !== (0).toFixed(d) ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ','));
const dIT = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const FXL = { calo: 'In calo forte', ferma: 'Ha smesso di scendere', normale: 'Normale' };
const fxState = (F, z) => (F == null || z == null ? null : F ? 'ferma' : z >= 1 ? 'calo' : 'normale');

// geometria attesa (stesse formule della specifica: tempo lineare, base 100 alla prima seduta del periodo, scale con 6% di margine)
function expected(k, range, W) {
  const I = X.idx[k], c = CFG.indices[k], dates = I.dates, n = dates.length;
  const L = 8, R = 56, PW = W - L - R, t1 = Date.parse(dates[n - 1]);
  const span = range === '3A' ? 3 : range === '10A' ? 10 : null;
  const t0 = span ? Math.max(Date.parse(dates[0]), t1 - span * 365.25 * DAY) : Date.parse(dates[0]);
  const x = (d) => L + ((Date.parse(d) - t0) / (t1 - t0)) * PW, inWin = (d) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
  const i0 = dates.findIndex(inWin);
  const fm = I.fx ? new Map(I.fx.dates.map((d, i) => [d, I.fx.val[i]])) : null;
  const usdRaw = c.fx && fm ? dates.map((d, i) => (fm.get(d) > 0 ? I.close[i] / fm.get(d) : null)) : null;
  const reb = (a) => { let b = null; for (let i = i0; i < n; i++) if (a[i] != null) { b = a[i]; break; } return a.map((v, i) => (i < i0 || v == null ? null : (v / b) * 100)); };
  const loc = reb(I.close), usd = usdRaw ? reb(usdRaw) : null;
  return { L, PW, t0, t1, x, inWin, i0, loc, usd, fm, I, c };
}
const scale = (vals, pad = 0.06) => { let lo = Infinity, hi = -Infinity; for (const v of vals) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } const m = (hi - lo) * pad || 1; return [lo - m, hi + m]; };
const runs = (ds, on, inWin) => { const r = []; let s = null, p = null; ds.forEach((d, i) => { if (!inWin(d)) return; if (on[i]) { if (s == null) s = d; p = d; } else if (s != null) { r.push([s, p]); s = null; } }); if (s != null) r.push([s, p]); return r; };
const parseD = (d) => { const segs = []; for (const m of d.matchAll(/([ML])([-\d.]+) ([-\d.]+)/g)) { if (m[1] === 'M') segs.push([]); segs.at(-1).push([+m[2], +m[3]]); } return segs; };
const expPath = (E, ds, vs, f) => { const segs = []; let on = false; ds.forEach((d, i) => { if (vs[i] == null || !E.inWin(d)) { on = false; return; } if (!on) segs.push([]); segs.at(-1).push([+E.x(d).toFixed(1), +f(vs[i]).toFixed(1)]); on = true; }); return segs; };
function cmpPath(got, exp, tag) {
  const g = parseD(got || ''), nPts = (s) => s.reduce((a, b) => a + b.length, 0);
  if (g.length !== exp.length || nPts(g) !== nPts(exp)) { ok(false, `${tag}: tratti ${g.length}/${exp.length}, punti ${nPts(g)}/${nPts(exp)}`); return; }
  let worst = 0; g.forEach((s, i) => s.forEach((p, j) => { worst = Math.max(worst, Math.abs(p[0] - exp[i][j][0]), Math.abs(p[1] - exp[i][j][1])); }));
  ok(worst <= 0.11, `${tag}: ${nPts(g)} punti in ${g.length} tratti, scarto massimo ${worst.toFixed(2)}`);
}

async function geometry(p) {
  return p.evaluate(() => {
    const svg = document.getElementById('emChart'), vb = svg.viewBox.baseVal;
    const A = (e, a) => +e.getAttribute(a);
    const frames = [...svg.querySelectorAll('rect.frame')].map((r) => ({ x: A(r, 'x'), y: A(r, 'y'), w: A(r, 'width'), h: A(r, 'height') }));
    const rects = (cls) => [...svg.querySelectorAll('rect.' + cls)].map((r) => ({ x: A(r, 'x'), y: A(r, 'y'), w: A(r, 'width'), h: A(r, 'height') }));
    const paths = Object.fromEntries(['emloc', 'emusd', 'br', 'emfx', 'emdl', 'ma'].map((c) => [c, [...svg.querySelectorAll('path.' + c)].map((e) => e.getAttribute('d'))]));
    const trig = [...svg.querySelectorAll('path.trigmark')].map((e) => { const m = e.getAttribute('d').match(/M([-\d.]+) ([-\d.]+)/); return [+m[1], +m[2] + 7]; });
    const texts = [...svg.querySelectorAll('text')].map((t) => { const b = t.getBBox(); return { cls: t.getAttribute('class'), s: t.textContent, x: b.x, y: b.y, w: b.width, h: b.height }; });
    const blue = [...svg.querySelectorAll('line.blue')].map((l) => A(l, 'y1'));
    return { W: vb.width, H: vb.height, frames, band: rects('band'), calo: rects('fxcalo'), ferma: rects('fxferma'), fav: rects('dlfav'), paths, trig, texts, blue,
      legend: document.getElementById('emLegend').innerText, title: document.getElementById('emTitle').innerText };
  });
}
function checkGeometry(k, range, G, tag) {
  const E = expected(k, range, G.W), { I, c } = E;
  ok(Math.abs(G.frames[0].x - E.L) < 1e-6 && Math.abs(G.frames[0].w - E.PW) < 1e-6, `${tag} cornice L=${G.frames[0].x} PW=${G.frames[0].w}`);
  const P = G.frames.map((f) => ({ y0: f.y, h: f.h }));
  const sy = (q, lo, hi) => (v) => P[q].y0 + ((hi - v) / (hi - lo)) * P[q].h;
  // 1. prezzo
  const [a0, b0] = scale([...E.loc, ...(E.usd || [])]), f0 = sy(0, a0, b0);
  cmpPath(G.paths.emloc[0], expPath(E, I.dates, E.loc, f0), `${tag} prezzo locale`);
  if (E.usd) cmpPath(G.paths.emusd[0], expPath(E, I.dates, E.usd, f0), `${tag} prezzo in dollari`);
  else ok(!G.paths.emusd.length, `${tag} nessuna linea in dollari (${c.fx === null ? 'EEM' : 'cambio assente'})`);
  // trigger: un segno per ogni trigger nel periodo, alla x della seduta, 10 sotto il prezzo
  const tr = I.trig.filter((t) => E.inWin(I.dates[t]));
  ok(G.trig.length === tr.length && tr.every((t, j) => Math.abs(G.trig[j][0] - E.x(I.dates[t])) < 0.01 && Math.abs(G.trig[j][1] - (f0(E.loc[t]) + 10)) < 0.01), `${tag} trigger ${G.trig.length}/${tr.length} alle date ${tr.map((t) => I.dates[t]).join(' ')}`);
  // 2. breadth e livello blu
  const f1 = sy(1, 0, 100);
  cmpPath(G.paths.br[0], expPath(E, I.dates, I.pct, f1), `${tag} breadth`);
  ok(G.blue.length === 1 && Math.abs(G.blue[0] - f1(I.blue)) < 0.01, `${tag} livello blu ${I.blue}% a y=${G.blue[0]}`);
  // zona blu: per ogni tratto due rettangoli (pannelli 1 e 2) da x(inizio) a x(fine)
  const bandsExp = (ds, on, panes) => runs(ds, on, E.inWin).flatMap(([s, e]) => panes.map((q) => ({ x: E.x(s), w: Math.max(1, E.x(e) - E.x(s)), y: P[q].y0, s, e })));
  const cmpBands = (got, exp, what) => {
    const bad = exp.filter((r, j) => !got[j] || Math.abs(got[j].x - r.x) > 0.01 || Math.abs(got[j].w - r.w) > 0.01 || Math.abs(got[j].y - r.y) > 0.01);
    ok(got.length === exp.length && !bad.length, `${tag} ${what}: ${got.length}/${exp.length} rettangoli${bad.length ? ', diverso il primo: ' + bad[0].s + '→' + bad[0].e : ''}`);
    return exp;
  };
  const blueOn = I.days.map((s) => s === 'setup' || s === 'fail');
  // l'app disegna prima il pannello 1 poi il 2 per ogni... no: per pannello, tutti i tratti
  const be = [0, 1].flatMap((q) => bandsExp(I.dates, blueOn, [q]));
  cmpBands(G.band, be, 'zona blu');
  // 3. cambio
  const hasFx = !!(I.fx && c.fx && !c.peg);
  if (hasFx) {
    const fd = I.fx.dates, fv = I.fx.val;
    cmpBands(G.calo, bandsExp(fd, I.fx.z.map((z, i) => z != null && z >= 1 && !I.fx.F[i]), [2]), 'bande «in calo forte»');
    cmpBands(G.ferma, bandsExp(fd, I.fx.F.map((v) => v === 1), [2]), 'bande «ha smesso di scendere»');
    const [a2, b2] = scale(fv.filter((_, i) => E.inWin(fd[i])));
    cmpPath(G.paths.emfx[0], expPath(E, fd, fv, sy(2, a2, b2)), `${tag} cambio`);
    const ax = G.texts.filter((t) => t.cls === 'axt' && t.y > P[2].y0 - 8 && t.y < P[2].y0 + P[2].h && t.x > E.L + E.PW);
    const expAx = [0, 1, 2, 3].map((i) => { const v = a2 + ((b2 - a2) * (i + 0.5)) / 4; return fmt(v, v < 10 ? 2 : v < 100 ? 1 : 0); });
    ok(expAx.every((s) => ax.some((t) => t.s === s)), `${tag} etichette dell'asse del cambio ${expAx.join(' ')}`);
  } else ok(!G.calo.length && !G.ferma.length && !G.paths.emfx.length, `${tag} nessun cambio disegnato (${c.peg ? 'agganciato' : 'in dollari'})`);
  // 4. dollaro contro emergenti
  const dd = X.dl.dates, dv = X.dl.val, sma = X.dl.sma;
  cmpBands(G.fav, bandsExp(dd, X.dl.D.map((v) => v === 1), [3]), 'bande «dollaro favorevole»');
  const [a3, b3] = scale([...dv.filter((_, i) => E.inWin(dd[i])), ...sma.filter((v, i) => v != null && E.inWin(dd[i]))]), f3 = sy(3, a3, b3);
  cmpPath(G.paths.emdl[0], expPath(E, dd, dv, f3), `${tag} dollaro FRED`);
  cmpPath(G.paths.ma[0], expPath(E, dd, sma, f3), `${tag} media 200 del dollaro`);
  // testi dentro il disegno e senza sovrapposizioni
  const out = G.texts.filter((t) => t.s && (t.x < -0.5 || t.x + t.w > G.W + 0.5 || t.y < -0.5 || t.y + t.h > G.H + 0.5));
  ok(!out.length, `${tag} testi dentro il disegno${out.length ? ': ' + out.map((t) => `«${t.s}» x ${t.x.toFixed(1)}…${(t.x + t.w).toFixed(1)} su ${G.W}`).join('; ') : ''}`);
  const tx = G.texts.filter((t) => t.s), ov = [];
  for (let i = 0; i < tx.length; i++) for (let j = i + 1; j < tx.length; j++) { const a = tx[i], b = tx[j]; if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) ov.push(`«${a.s}»/«${b.s}»`); }
  ok(!ov.length, `${tag} testi senza sovrapposizioni${ov.length ? ': ' + ov.join(' ') : ''}`);
  // anni sull'asse: alla x del 1° gennaio
  const yrs = G.texts.filter((t) => /^\d{4}$/.test(t.s) && t.y > G.frames[3].y + G.frames[3].h);
  ok(yrs.length > 0 && yrs.every((t) => Math.abs(t.x + t.w / 2 - E.x(`${t.s}-01-01`)) < 0.6), `${tag} anni sull'asse ${yrs.map((t) => t.s).join(' ')}`);
  // legenda
  const lg = G.legend;
  ok(/in valuta locale/.test(lg) === true && /in dollari/.test(lg) === !!c.fx && /valuta in calo forte/.test(lg) === hasFx, `${tag} legenda: ${lg.replace(/\n/g, ' | ')}`);
  return E;
}

// riquadro dei valori alla data d (evento sintetico con la x esatta della data + mezza giornata)
async function tipAt(p, E, d, last) {
  const xs = last ? E.L + E.PW : E.x(d) + (0.5 * DAY / (E.t1 - E.t0)) * E.PW;
  return p.evaluate(({ xs }) => {
    const svg = document.getElementById('emChart'), hit = svg.querySelector('rect[fill="transparent"]');
    const m = svg.getScreenCTM(), y = +hit.getAttribute('y') + 20;
    const cx = m.a * xs + m.e, cy = m.d * y + m.f;
    hit.dispatchEvent(new PointerEvent('pointermove', { clientX: cx, clientY: cy, bubbles: true, pointerType: 'mouse' }));
    const xh = svg.querySelector('line.xhair');
    return { tip: [...document.querySelectorAll('#emTip .row')].map((r) => r.classList.contains('note-row') ? ['NOTA', r.textContent.trim()] : [...r.children].map((c) => c.textContent.trim())), xh: +xh.getAttribute('x1'), vis: xh.getAttribute('visibility'), y1: +xh.getAttribute('y1'), y2: +xh.getAttribute('y2') };
  }, { xs });
}
function expTip(k, E, i) {
  const { I, c } = E, d = I.dates[i], rows = [];
  rows.push([dIT(d), `${k}${I.days[i] ? ' · ' + X.STATES[I.days[i]].toLowerCase() : ''}`]);
  rows.push(['Prezzo', fmt(I.close[i], I.close[i] >= 1000 ? 0 : 2)]);
  if (E.usd) rows.push(['In dollari (base 100)', fmt(E.usd[i], 1)]);
  rows.push(['Sopra media 200', I.pct[i] == null ? '—' : fmt(I.pct[i]) + '%']);
  const hasFx = !!(I.fx && c.fx && !c.peg);
  if (hasFx) { const j = I.fx.dates.indexOf(d); rows.push([`${c.ccy} per dollaro`, j < 0 ? '—' : fmt(I.fx.val[j], I.fx.val[j] < 10 ? 4 : 2)]); const s = j < 0 ? null : fxState(I.fx.F[j], I.fx.z[j]); rows.push(['Valuta', s ? FXL[s] : '—']); }
  const di = X.dl.dates.indexOf(d); rows.push(['Dollaro vs emergenti', di < 0 ? '—' : fmt(X.dl.val[di], 2)]);
  return rows;
}

(async () => {
  const br = await chromium.launch();
  const VP = FAST ? [['1440-scuro', 1440, 900, false, false]] : [['1440-scuro', 1440, 900, false, false], ['1440-chiaro', 1440, 900, true, false], ['1280-chiaro', 1280, 900, true, false], ['1280-scuro', 1280, 900, false, false], ['390-scuro', 390, 844, false, true], ['390-chiaro', 390, 844, true, true], ['360-chiaro', 360, 780, true, true], ['360-scuro', 360, 780, false, true]];
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, w, h, light, touch] of VP) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 });
    await ctx.addInitScript(({ light }) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', light ? 'light' : 'dark'); localStorage.setItem('sm.introSeen', 'true'); } } catch {} }, { light });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '#emg-' + CFG.order[0]); await p.waitForSelector('#emChart path.emloc', { timeout: 30000 }); await p.waitForTimeout(500);
    for (const k of CFG.order) {
      await p.goto(BASE + '#emg-' + k); await p.waitForFunction((k) => document.getElementById('emTitle').innerText.startsWith(k + ' ·'), k); await p.waitForTimeout(250);
      for (const range of ['3A', '10A', 'MAX']) {
        await p.click(`#emRange button[data-range="${range}"]`); await p.waitForTimeout(200);
        const tag = `${name} ${k} ${range}`;
        const G = await geometry(p);
        ok(G.title.startsWith(k + ' ·'), `${tag} titolo ${G.title}`);
        const E = checkGeometry(k, range, G, tag);
        // riquadro dei valori
        if (!FAST || range !== '10A') {
          const I = E.I, idx = [E.i0, I.dates.length - 1];
          const noFx = I.dates.map((d, i) => i).filter((i) => i >= E.i0 && E.fm && !E.fm.has(I.dates[i]));
          const noDl = I.dates.map((d, i) => i).filter((i) => i >= E.i0 && !X.dl.dates.includes(I.dates[i]));
          const rem = I.fx ? I.fx.removed.map((r) => I.dates.indexOf(r.date)).filter((i) => i >= E.i0) : [];
          if (noFx.length) idx.push(noFx[0], noFx.at(-1)); if (noDl.length) idx.push(noDl[0]); if (rem.length) idx.push(rem.at(-1));
          for (let q = 1; q <= (name.startsWith('1440-scuro') ? 8 : 2); q++) idx.push(E.i0 + Math.floor(((I.dates.length - 1 - E.i0) * q) / 9));
          for (const i of [...new Set(idx)]) {
            const T = await tipAt(p, E, I.dates[i], i === I.dates.length - 1);
            const exp = expTip(k, E, i), got = T.tip.filter((r) => r[0] !== 'NOTA');
            const bad = exp.length !== got.length || exp.some(([a, b], j) => got[j][0] !== a || got[j][1] !== b);
            ok(!bad, `${tag} riquadro al ${I.dates[i]}${bad ? ': atteso ' + exp.map((r) => r.join(' ')).join(' / ') + ' · visto ' + got.map((r) => r.join(' ')).join(' / ') : ''}`);
            const nota = T.tip.some((r) => r[0] === 'NOTA'), dlMissing = exp.at(-1)[1] === '—';
            ok(nota === dlMissing, `${tag} nota FRED al ${I.dates[i]} ${nota ? 'presente' : 'assente'}`);
            ok(T.vis === 'visible' && Math.abs(T.xh - E.x(I.dates[i])) < 0.01 && Math.abs(T.y1 - G.frames[0].y) < 0.01 && Math.abs(T.y2 - (G.frames[3].y + G.frames[3].h)) < 0.01, `${tag} linea verticale al ${I.dates[i]} su tutti e 4 i pannelli`);
          }
        }
        if (range === '3A' || !touch || k === 'KOSPI200') await p.locator('#emDetail, #emChart').first().screenshot({ path: path.join(OUT, `${name}-${k}-${range}.png`) }).catch(async () => { await p.locator('#emWrap').screenshot({ path: path.join(OUT, `${name}-${k}-${range}.png`) }); });
      }
      await p.click('#emRange button[data-range="3A"]'); await p.waitForTimeout(150);
    }
    // riquadro reale vicino ai bordi: non esce dallo schermo né dal contenitore
    await p.goto(BASE + '#emg-KOSPI200'); await p.waitForTimeout(800);
    await p.locator('#emChart').scrollIntoViewIfNeeded();
    const bb = await p.locator('#emChart').boundingBox();
    for (const [fx, fy] of [[0.995, 0.05], [0.01, 0.05], [0.5, 0.93], [0.995, 0.93], [0.93, 0.5]]) {
      const cx = bb.x + bb.width * fx, cy = bb.y + bb.height * fy;
      if (touch) await p.touchscreen.tap(cx, cy); else await p.mouse.move(cx, cy);
      await p.waitForTimeout(150);
      const r = await p.evaluate(() => { const t = document.getElementById('emTip').getBoundingClientRect(), w = document.getElementById('emWrap').getBoundingClientRect(); return { hidden: document.getElementById('emTip').hidden, l: t.left, r: t.right, t: t.top, b: t.bottom, wl: w.left, wr: w.right, wb: w.bottom, vw: innerWidth, sw: document.documentElement.scrollWidth }; });
      ok(!r.hidden && r.l >= 0 && r.r <= r.vw && r.sw <= r.vw, `${name} riquadro al ${(fx * 100).toFixed(0)}%/${(fy * 100).toFixed(0)}% dentro lo schermo (${r.l.toFixed(0)}…${r.r.toFixed(0)} su ${r.vw})`);
      if (r.b > r.wb + 1) att(`${name} riquadro al ${(fx * 100).toFixed(0)}%/${(fy * 100).toFixed(0)}% sotto il fondo del grafico di ${(r.b - r.wb).toFixed(0)} px (copre legenda/note)`);
      if (fy === 0.93 && fx === 0.995) await p.screenshot({ path: path.join(OUT, `${name}-tip-bordo.png`) });
    }
    // quadrante della forza relativa
    for (const k of CFG.order) {
      await p.goto(BASE + '#emg-' + k); await p.waitForTimeout(500);
      const R = await p.evaluate(() => {
        const svg = document.getElementById('emRS'), vb = svg.viewBox.baseVal;
        const dots = [...svg.querySelectorAll('g.emdot')].map((g) => { const c = g.querySelector('circle'), t = g.querySelector('text'), b = t.getBBox(); return { k: g.dataset.em, on: g.classList.contains('on'), cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy'), r: +c.getAttribute('r'), title: g.querySelector('title').textContent, lab: t.textContent, tb: { x: b.x, y: b.y, w: b.width, h: b.height } }; });
        const tr = svg.querySelector('path.emtrail');
        const qlab = [...svg.querySelectorAll('text.qlab')].map((t) => { const b = t.getBBox(); return { s: t.textContent, x: b.x, y: b.y, w: b.width, h: b.height }; });
        return { W: vb.width, H: vb.height, dots, trail: tr ? tr.getAttribute('d') : null, qlab, meta: document.getElementById('emRSMeta').innerText, cssW: svg.getBoundingClientRect().width };
      });
      const W = R.W, H = R.H, sx = (v) => ((Math.max(96, Math.min(104, v)) - 96) / 8) * W, sy = (v) => H - ((Math.max(96, Math.min(104, v)) - 96) / 8) * H;
      ok(R.dots.length === 7, `${name} RS ${k}: 7 punti (${R.dots.map((d) => d.k).join(' ')})`);
      for (const d of R.dots) {
        const rs = X.idx[d.k].rs, qx = rs.ratio >= 100, qy = rs.mom >= 100;
        ok(Math.abs(d.cx - sx(rs.ratio)) < 0.01 && Math.abs(d.cy - sy(rs.mom)) < 0.01 && (d.cx >= W / 2) === qx && (d.cy <= H / 2) === qy && d.title.includes(`(${rs.quad})`) && d.title.includes(`RS-Ratio ${fmt(rs.ratio, 1)}, RS-Momentum ${fmt(rs.mom, 1)}`), `${name} RS ${k}: ${d.k} a ${fmt(rs.ratio, 2)}/${fmt(rs.mom, 2)} nel quadrante ${rs.quad}`);
        if (Math.abs(rs.ratio - 100) > 4 || Math.abs(rs.mom - 100) > 4) att(`${name} RS ${d.k} fuori scala (bloccato al bordo)`);
        if (d.tb.x + d.tb.w > W + 0.5 || d.tb.x < -0.5 || d.tb.y < -0.5 || d.tb.y + d.tb.h > H + 0.5) ok(false, `${name} RS ${k}: etichetta ${d.lab} tagliata`);
        ok(d.on === (d.k === k) && (d.on ? d.r === 4.5 : d.r === 3.2), `${name} RS ${k}: ${d.k} ${d.on ? 'evidenziato' : 'normale'}`);
      }
      const ov = [];
      for (let i = 0; i < R.dots.length; i++) for (let j = 0; j < R.dots.length; j++) {
        if (i === j) continue; const a = R.dots[i].tb, b = R.dots[j];
        if (j > i && a.x < b.tb.x + b.tb.w && b.tb.x < a.x + a.w && a.y < b.tb.y + b.tb.h && b.tb.y < a.y + a.h) ov.push(`${R.dots[i].lab}/${b.lab}`);
        if (a.x < b.cx + b.r && b.cx - b.r < a.x + a.w && a.y < b.cy + b.r && b.cy - b.r < a.y + a.h) ov.push(`etichetta ${R.dots[i].lab} sul punto ${b.lab}`);
      }
      for (const d of R.dots) for (const q of R.qlab) if (d.tb.x < q.x + q.w && q.x < d.tb.x + d.tb.w && d.tb.y < q.y + q.h && q.y < d.tb.y + d.tb.h) ov.push(`${d.lab}/${q.s}`);
      if (ov.length) ok(false, `${name} RS ${k}: sovrapposizioni ${[...new Set(ov)].join(', ')}`); else pass++;
      // scia: punti nell'ordine dal più vecchio al più recente, ultimo = punto evidenziato
      const tr = X.idx[k].rs.trail, got = parseD(R.trail || '')[0] || [];
      ok(got.length === tr.length && tr.every((q, j) => Math.abs(got[j][0] - +sx(q[0]).toFixed(1)) < 0.06 && Math.abs(got[j][1] - +sy(q[1]).toFixed(1)) < 0.06), `${name} RS ${k}: scia di ${got.length} settimane nell'ordine giusto (${tr[0][2]} → ${tr.at(-1)[2]})`);
      const on = R.dots.find((d) => d.on);
      ok(on && got.length && Math.abs(got.at(-1)[0] - on.cx) < 0.06 && Math.abs(got.at(-1)[1] - on.cy) < 0.06, `${name} RS ${k}: la scia finisce sul punto evidenziato`);
      ok(R.meta === `al ${dIT(X.idx[k].rs.last)}`, `${name} RS ${k}: data «${R.meta}»`);
      if (k === 'KOSPI200') await p.locator('#emRSWrap').screenshot({ path: path.join(OUT, `${name}-rs-${k}.png`) });
    }
    // clic (o tocco) su un punto del quadrante seleziona l'indice
    await p.goto(BASE + '#emg-CSI300'); await p.waitForTimeout(600);
    const g = p.locator('#emRS g.emdot[data-em="TWN"] circle'); await g.scrollIntoViewIfNeeded();
    if (touch) { const b = await g.boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await g.click();
    await p.waitForTimeout(600);
    ok(/^TWN ·/.test(await p.locator('#emTitle').innerText()) && /#emg-TWN/.test(p.url()) && (await p.locator('#emRS g.emdot.on').getAttribute('data-em')) === 'TWN', `${name} ${touch ? 'tocco' : 'clic'} sul punto EWT seleziona TWN (${p.url().split('#')[1]})`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} niente scorrimento orizzontale`);
    ok(!errs.length, `${name} console pulita${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
    await p.screenshot({ path: path.join(OUT, `${name}-pagina.png`), fullPage: true });
    await ctx.close();
  }
  await br.close();
  console.log(`\nPASSA ${pass} · NON PASSA ${fail} · ATTENZIONE ${warn}`);
  fs.writeFileSync(path.join(__dirname, 'esito.txt'), `PASSA ${pass} · NON PASSA ${fail} · ATTENZIONE ${warn}\n` + fails.join('\n') + '\n');
})();
