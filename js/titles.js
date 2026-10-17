/*
 * titles.js — vista 7 Titoli: dentro i settori S&P 500.
 *  - Grandi contro piccoli: per ogni settore il rendimento cap-weighted (pesano i grandi) ed equal-weight
 *    (ogni titolo conta uguale) nel periodo, con la scia di 1 settimana, 1 mese e 3 mesi fa e la divergenza;
 *  - Titoli del settore: una bolla per titolo (rendimento del periodo contro distanza dalla media 200, dal
 *    massimo a 52 settimane o rendimento nel periodo precedente) e la lista dei più in pena.
 * Dati: data/sector_members.json (scripts/lib/capeq.js), caricato alla prima apertura della vista.
 * Il settore scelto è lo stesso della vista 4 Settore.
 */
import { esc, fmt, sgn, pct, dIT, placeTip, chartWidth, keepFocus } from './format.js';

const NS = 'http://www.w3.org/2000/svg';
const PERIODS = ['1M', '3M', '6M', 'YTD', '1A'];
const PER_TEXT = { '1M': 'ultimo mese', '3M': 'ultimi 3 mesi', '6M': 'ultimi 6 mesi', YTD: "da inizio anno", '1A': 'ultimi 12 mesi' };
const OFF_TEXT = ['oggi', '1 settimana fa', '1 mese fa', '3 mesi fa'];
const AXES = {
  d200: { label: 'distanza dalla media a 200 sedute', short: 'dalla media 200', get: (s) => s.d200 },
  dd: { label: 'distanza dal massimo a 52 settimane', short: 'dal massimo 52s', get: (s) => s.dd },
  prev: { label: 'rendimento nel periodo precedente', short: 'periodo precedente', get: (s, p) => s.prev[p] },
};
const WORST = 8; // titoli in rosso, con etichetta
const LIST = 12; // righe della lista dei più in pena
const tvStock = (sym) => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym.replace('-', '.'))}`;

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function text(parent, x, y, s, attrs = {}) { const t = el('text', { x, y, ...attrs }, parent); t.textContent = s; return t; }
// scala "tonda" che contiene [lo, hi] con circa n tacche
function nice(lo, hi, n) {
  const span = hi - lo || 1, raw = span / n, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
  return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step };
}
const ticks = (s) => { const out = []; for (let v = s.lo; v <= s.hi + s.step / 1e6; v += s.step) out.push(Math.round(v * 1e6) / 1e6); return out; };
const quant = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };
const tickLabel = (v, step) => (v === 0 ? '0' : `${v < 0 ? '−' : ''}${fmt(Math.abs(v), step < 1 ? 1 : 0)}%`);
const pp = (v) => `${sgn(v)} pp`;

/**
 * @param {{$: Function, store: {get: Function, set: Function}, load: () => Promise<object>, names: object,
 *          getSector: () => string, setSector: (s: string) => void, stateCode?: (s: string) => string}} ctx
 */
export function createTitles(ctx) {
  const { $, store } = ctx;
  const SECTORS = Object.keys(ctx.names);
  let D = null, loading = null, failed = null;
  const st = {
    per: PERIODS.includes(store.get('titPer')) ? store.get('titPer') : '3M',
    trail: ['sel', 'all', 'off'].includes(store.get('titTrail')) ? store.get('titTrail') : 'all',
    sort: ['div', 'sec'].includes(store.get('titSort')) ? store.get('titSort') : 'div',
    ax: AXES[store.get('titAx')] ? store.get('titAx') : 'd200',
    size: ['w', 'eq'].includes(store.get('titSize')) ? store.get('titSize') : 'w',
    hover: null,
  };
  let bub = null; // ultimo disegno della bubble: posizioni per il passaggio del mouse

  function ensure() {
    if (D || failed) return Promise.resolve();
    if (!loading) loading = ctx.load().then((d) => { D = d; }).catch((e) => { failed = e; });
    return loading;
  }

  async function render() {
    if (!D && !failed) { $('titLoading').hidden = false; $('titBody').hidden = true; await ensure(); }
    if (failed) { $('titLoading').hidden = false; $('titLoading').textContent = `Dati dei titoli non disponibili (${failed.message}).`; return; }
    $('titLoading').hidden = true; $('titBody').hidden = false;
    renderControls();
    drawSpread();
    drawBubble();
  }

  // ---------- comandi ----------
  function renderControls() {
    const s = ctx.getSector();
    keepFocus($('titChips'), 'data-sym', SECTORS.map((k) => `<button type="button" class="chip" data-sym="${k}" aria-pressed="${k === s}" title="${esc(ctx.names[k])}">${ctx.stateCode ? `<span class="sd sd-${ctx.stateCode(k)}"></span>` : ''}${k}</button>`).join(''));
    $('titChips').querySelectorAll('button').forEach((b) => { b.onclick = () => pick(b.dataset.sym); });
    const press = (id, attr, v) => document.querySelectorAll(`#${id} button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === v)));
    press('titPerSeg', 'per', st.per); press('titTrailSeg', 'trail', st.trail); press('titSortSeg', 'sort', st.sort); press('titSizeSeg', 'size', st.size);
    // «periodo precedente» a 1 anno vorrebbe 2 anni di storia: se nessun titolo ce l'ha, l'opzione si spegne
    const hasPrev = D.stocks.some((x) => x.prev[st.per] != null);
    $('titAx').querySelector('option[value="prev"]').disabled = !hasPrev;
    if (st.ax === 'prev' && !hasPrev) st.ax = 'd200';
    $('titAx').value = st.ax;
    $('titMeta').textContent = `al ${dIT(D.asOf)} · ${PER_TEXT[st.per]}, dal ${dIT(D.starts[st.per][0])}`;
    $('titData').textContent = `Pesi IVV al ${dIT(D.weightsAsOf)}.` + (D.missing && D.missing.length ? ` Esclusi i titoli usciti dall'indice che non hanno più prezzi (acquisiti): ${D.missing.join(', ')}.` : '');
  }
  function pick(s) { ctx.setSector(s); st.hover = null; render(); }

  // ---------- grandi contro piccoli ----------
  // Una riga per settore: pallino pieno = cap-weighted (pesano i grandi), vuoto = equal-weight (ogni titolo uguale),
  // la barra tra i due è la divergenza (verde acqua se è davanti l'equal-weight, viola se guidano i grandi).
  // La scia resta in secondo piano, come nel grafico di Rea: dove erano i due pallini 1 settimana, 1 mese e 3 mesi
  // fa, con la stessa forma e sempre più piccoli, e una freccia sottile per il movimento dell'ultima settimana:
  // verde se sale, rossa se scende, sfumata da trasparente (1 settimana fa) a piena (oggi).
  function rowOf(k) {
    const v = D.sectors[k][st.per];
    const sp = (p) => (p ? p[1] - p[0] : null);
    return { k, v, cw: v[0][0], ew: v[0][1], sp: sp(v[0]), sp1m: sp(v[2]) };
  }
  let lastPointer = 'mouse';
  const TRAIL_R = [0, 3.4, 2.6, 1.9]; // raggio dei segnaposto: 1 settimana, 1 mese, 3 mesi fa
  const TRAIL_O = [0, 0.75, 0.55, 0.4];
  function drawSpread() {
    const svg = $('titSpread'), sel = ctx.getSector();
    $('titSpreadTip').hidden = true;
    const W = chartWidth(svg, 1120, 360), narrow = W < 640;
    const rows = SECTORS.filter((k) => D.sectors[k] && D.sectors[k][st.per][0]).map(rowOf); // settore senza titoli: fuori
    if (st.sort === 'div') rows.sort((a, b) => b.sp - a.sp);
    const top3 = new Set([...rows].sort((a, b) => Math.abs(b.sp) - Math.abs(a.sp)).slice(0, 3).map((r) => r.k));
    const all = [...rows, rowOf('SPX')];
    const trail = (r) => st.trail === 'all' || (st.trail === 'sel' && (r.k === sel || r.k === 'SPX'));
    const vals = [0];
    for (const r of all) r.v.forEach((p, i) => { if (p && (i === 0 || trail(r))) vals.push(p[0], p[1]); });
    const sc = nice(Math.min(...vals), Math.max(...vals), narrow ? 4 : 8);
    const L = narrow ? 50 : 210, R = narrow ? 92 : 178, T = 22, RH = narrow ? 32 : 30;
    const H = T + RH * (all.length + 0.6) + 6;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    // sfumature delle frecce: verso destra (sale) verde, verso sinistra (scende) rosso; la coda è trasparente
    const defs = el('defs', {}, svg);
    for (const [id, cls, x1, x2] of [['titArrUp', 'up', 0, 1], ['titArrDn', 'down', 1, 0]]) {
      const gr = el('linearGradient', { id, x1, x2, y1: 0, y2: 0 }, defs);
      el('stop', { offset: 0, class: `st-${cls}`, 'stop-opacity': 0.08 }, gr);
      el('stop', { offset: 1, class: `st-${cls}`, 'stop-opacity': 1 }, gr);
    }
    const X = (v) => L + ((v - sc.lo) / (sc.hi - sc.lo)) * (W - L - R);
    for (const v of ticks(sc)) {
      el('line', { class: v === 0 ? 'zero' : 'grid', x1: X(v), x2: X(v), y1: T - 6, y2: H - 4 }, svg);
      text(svg, X(v), 12, tickLabel(v, sc.step), { 'text-anchor': 'middle' });
    }
    text(svg, W - R + 24, 12, 'EW − CW');
    text(svg, W - 6, 12, narrow ? '1M' : 'in 1 mese', { 'text-anchor': 'end' });
    all.forEach((r, i) => {
      const ref = r.k === 'SPX';
      const y = T + RH * (i + 0.5) + (ref ? RH * 0.6 : 0);
      if (ref) el('line', { class: 'sep', x1: 0, x2: W, y1: y - RH * 0.8, y2: y - RH * 0.8 }, svg);
      const cls = r.sp >= 0 ? 'b' : 'n';
      const g = el('g', { class: `row${r.k === sel ? ' sel' : ''}${ref ? ' ref' : ''}${top3.has(r.k) ? ' hot' : ''}`, 'data-k': r.k }, svg);
      el('rect', { class: 'rowbg', x: 0, y: y - RH / 2, width: W, height: RH }, g);
      el('rect', { class: 'mark', x: 0, y: y - RH / 2, width: 3, height: RH }, g);
      text(g, 8, y + 4, r.k, { class: 'sym' });
      if (!narrow) text(g, 52, y + 4, ctx.names[r.k] || 'S&P 500', { class: 'nm' });
      // scia, sotto tutto il resto: puntini (3 mesi → 1 mese → 1 settimana) e freccia dell'ultima settimana
      const arrows = [];
      if (trail(r)) {
        for (const leg of [0, 1]) {
          const pts = [3, 2, 1].filter((o) => r.v[o]).map((o) => [o, X(r.v[o][leg])]);
          if (pts.length > 1) el('polyline', { class: 'tr-line', points: pts.map(([, x]) => `${x.toFixed(1)},${y}`).join(' ') }, g);
          for (const [o, x] of pts) el('circle', { class: `td ${leg ? 'ew' : 'cw'}`, cx: x, cy: y, r: TRAIL_R[o], opacity: TRAIL_O[o] }, g);
          if (r.v[1]) arrows.push([X(r.v[1][leg]), X(r.v[0][leg]), leg ? 4.4 : 5.2]);
        }
      }
      el('line', { class: `bar ${cls}`, x1: X(r.cw), x2: X(r.ew), y1: y, y2: y }, g);
      // freccia dell'ultima settimana, sopra la barra, che si ferma prima del pallino di oggi
      for (const [x0, x1, rr] of arrows) {
        const d = x1 - x0, dir = Math.sign(d);
        if (Math.abs(d) < rr + 7) continue; // movimento troppo piccolo per una freccia
        const tip = x1 - dir * (rr + 1.5), end = tip - dir * 4.5;
        // corpo come rettangolo sottile: la sfumatura su una linea orizzontale (altezza 0) non si vedrebbe
        el('rect', { class: 'tr-arr', x: Math.min(x0, end), y: y - 1.2, width: Math.abs(end - x0), height: 2.4, fill: `url(#${dir > 0 ? 'titArrUp' : 'titArrDn'})` }, g);
        el('path', { class: `tr-head ${dir > 0 ? 'up' : 'down'}`, d: `M${tip} ${y} L${tip - dir * 5.5} ${y - 3.6} L${tip - dir * 5.5} ${y + 3.6} Z` }, g);
      }
      el('circle', { class: 'cw', cx: X(r.cw), cy: y, r: 5.2 }, g);
      el('circle', { class: 'ew', cx: X(r.ew), cy: y, r: 4.4 }, g);
      // le 3 divergenze più ampie: anello sul pallino di chi è davanti
      if (top3.has(r.k)) el('circle', { class: 'ring', cx: X(r.sp >= 0 ? r.ew : r.cw), cy: y, r: 8.5 }, g);
      text(g, W - R + 24, y + 4, sgn(r.sp), { class: `sp ${cls}` });
      if (r.sp1m != null) {
        const d = r.sp - r.sp1m, flat = Math.abs(d) < 0.5;
        const sym = flat ? '=' : d > 0 ? '▲' : '▼';
        text(g, W - 6, y + 4, narrow ? sym : `${sym} ${sgn(d)}`, { class: `dm ${flat ? '' : d > 0 ? 'b' : 'n'}`, 'text-anchor': 'end' });
      }
      // al tocco la scelta ridisegna il grafico: il riquadro dei numeri si riapre sulla riga toccata
      if (!ref) g.addEventListener('click', (e) => { const touch = lastPointer === 'touch'; pick(r.k); if (touch) spreadTip(e, rowOf(r.k)); });
      g.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
      g.addEventListener('mousemove', (e) => spreadTip(e, r));
      g.addEventListener('mouseleave', () => { $('titSpreadTip').hidden = true; });
    });
    const lead = rows.filter((r) => r.sp > 0).length;
    $('titSpreadNote').textContent = `Equal-weight davanti in ${lead} settori su 11. Ultima colonna: come è cambiata la divergenza rispetto a 1 mese fa ` +
      `(▲ verso l'equal-weight, ▼ verso i grandi). Clic su un settore per vederne i titoli.`;
  }
  function spreadTip(e, r) {
    const tip = $('titSpreadTip');
    tip.innerHTML = `<div class="row"><b>${r.k}</b><span>${esc(ctx.names[r.k] || 'S&P 500')}</span></div>` +
      `<div class="row"><span>${PER_TEXT[st.per]}</span><span>cap · equal · diff.</span></div>` +
      r.v.map((p, i) => (p ? `<div class="row"><span>${OFF_TEXT[i]}</span><span>${sgn(p[0])}% · ${sgn(p[1])}% · <span class="${p[1] - p[0] >= 0 ? 'q-lead-c' : 'q-imp-c'}">${pp(p[1] - p[0])}</span></span></div>` : '')).join('') +
      (st.per === 'YTD' ? '<span class="note-row">Da inizio anno: la scia tiene l\'inizio al 31/12 e sposta solo la fine.</span>' : '');
    placeTip(tip, $('titSpreadWrap'), e);
    keepOnScreen(tip, e);
  }
  // se il riquadro esce dal fondo della finestra va sopra il puntatore
  function keepOnScreen(tip, e) {
    const r = tip.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 4) tip.style.top = Math.max(0, parseFloat(tip.style.top) - r.height - 28) + 'px';
  }

  // ---------- titoli del settore ----------
  // punteggio di pena: media dei ranghi nel settore di rendimento del periodo e distanza dal massimo (0 = il peggiore)
  function ranked(list) {
    const rank = (key) => { const s = [...list].sort((a, b) => key(a) - key(b)); return new Map(s.map((x, i) => [x.s, i / Math.max(1, s.length - 1)])); };
    const a = rank((x) => x.r[st.per]), b = rank((x) => x.dd ?? 0);
    return [...list].map((x) => ({ x, pain: (a.get(x.s) + b.get(x.s)) / 2 })).sort((p, q) => p.pain - q.pain).map((p) => p.x);
  }
  function drawBubble() {
    const svg = $('titBubble'), sec = ctx.getSector(), ax = AXES[st.ax];
    const W = chartWidth(svg, 940, 360), narrow = W < 640;
    const H = Math.round(Math.min(600, Math.max(340, W * (narrow ? 1.1 : 0.6))));
    const getX = (s) => ax.get(s, st.per);
    $('titBubbleTip').hidden = true;
    // la lista dei più in pena usa tutti i titoli con il rendimento del periodo; le bolle solo chi ha anche l'asse x
    const members = D.stocks.filter((s) => s.sec === sec && s.r[st.per] != null);
    const list = members.filter((s) => getX(s) != null);
    const order = ranked(members), worst = new Set(order.slice(0, WORST).map((s) => s.s));
    $('titBubbleTitle').textContent = `Titoli · ${sec} ${ctx.names[sec]}`;
    drawList(order.slice(0, LIST), sec);
    if (!list.length) {
      svg.setAttribute('viewBox', `0 0 ${W} 80`); svg.innerHTML = ''; bub = null;
      text(svg, W / 2, 44, `Nessun titolo ha il dato dell'asse orizzontale (${ax.short}) per ${st.per}.`, { 'text-anchor': 'middle' });
      $('titBubbleMeta').textContent = `${members.length} titoli · ${st.per}`;
      return;
    }
    const ref = D.sectors[sec][st.per][0];
    // scale: 2°–98° percentile più lo zero e le linee del settore; chi sta fuori resta sul bordo con una freccia
    const xs = list.map(getX), ys = list.map((s) => s.r[st.per]);
    const pad = (lo, hi) => { const d = (hi - lo) * 0.06 || 1; return [lo - d, hi + d]; };
    const sx = nice(...pad(Math.min(0, quant(xs, 0.02)), Math.max(0, quant(xs, 0.98))), narrow ? 4 : 7);
    const sy = nice(...pad(Math.min(0, quant(ys, 0.02), ...ref), Math.max(0, quant(ys, 0.98), ...ref)), 6);
    const L = 46, R = 14, T = 14, B = 36;
    const cx = (v) => Math.min(sx.hi, Math.max(sx.lo, v)), cy = (v) => Math.min(sy.hi, Math.max(sy.lo, v));
    const X = (v) => L + ((cx(v) - sx.lo) / (sx.hi - sx.lo)) * (W - L - R);
    const Y = (v) => T + ((sy.hi - cy(v)) / (sy.hi - sy.lo)) * (H - T - B);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    el('rect', { class: 'pain', x: L, y: Y(0), width: Math.max(0, X(0) - L), height: Math.max(0, H - B - Y(0)) }, svg);
    for (const v of ticks(sx)) {
      el('line', { class: v === 0 ? 'zero' : 'grid', x1: X(v), x2: X(v), y1: T, y2: H - B }, svg);
      if (v !== sx.lo) text(svg, X(v), H - B + 15, tickLabel(v, sx.step), { 'text-anchor': 'middle' }); // il primo toccherebbe l'asse y
    }
    for (const v of ticks(sy)) { el('line', { class: v === 0 ? 'zero' : 'grid', x1: L, x2: W - R, y1: Y(v), y2: Y(v) }, svg); text(svg, L - 6, Y(v) + 4, tickLabel(v, sy.step), { 'text-anchor': 'end' }); }
    text(svg, W - R, H - 4, `${ax.label} →`, { class: 'axl', 'text-anchor': 'end' });
    text(svg, L + 4, T + 10, `↑ rendimento ${st.per}`, { class: 'axl' });
    // rendimento del settore: equal e cap
    const yEw = Y(ref[1]), yCw = Y(ref[0]), close = Math.abs(yEw - yCw) < 16;
    el('line', { class: 'l-ew', x1: L, x2: W - R, y1: yEw, y2: yEw }, svg);
    el('line', { class: 'l-cw', x1: L, x2: W - R, y1: yCw, y2: yCw }, svg);
    text(svg, W - R - 2, yEw + (close && yEw >= yCw ? 12 : -4), `equal ${sgn(ref[1])}%`, { class: 't-ew', 'text-anchor': 'end' });
    text(svg, W - R - 2, yCw + (close && yCw > yEw ? 12 : -4), `cap ${sgn(ref[0])}%`, { class: 't-cw', 'text-anchor': 'end' });
    // bolle: area proporzionale al peso nell'indice (con un minimo e un massimo), le grandi sotto
    const maxW = Math.max(...list.map((s) => s.w || 0), 0.001), rMax = narrow ? 20 : 28;
    const rad = (s) => (st.size === 'eq' ? 5 : Math.max(3, rMax * Math.sqrt((s.w || 0) / maxW)));
    const pos = [];
    const dots = el('g', {}, svg);
    for (const s of [...list].sort((a, b) => rad(b) - rad(a))) {
      const vx = getX(s), vy = s.r[st.per], r = rad(s);
      const dx = vx < sx.lo ? -1 : vx > sx.hi ? 1 : 0, dy = vy < sy.lo ? 1 : vy > sy.hi ? -1 : 0;
      // fuori scala: la bolla resta tutta dentro il grafico, con lo spazio per la freccia verso il valore vero
      const pin = (v, lo, hi, out) => (out ? Math.min(hi - r - 9, Math.max(lo + r + 9, v)) : v);
      const x = pin(X(vx), L, W - R, dx), y = pin(Y(vy), T, H - B, dy);
      el('circle', { class: `dot${worst.has(s.s) ? ' bad' : ''}`, 'data-s': s.s, cx: x, cy: y, r }, dots);
      if (dx || dy) { // freccia verso il valore fuori scala
        const a = Math.atan2(dy, dx), ex = x + Math.cos(a) * (r + 2), ey = y + Math.sin(a) * (r + 2);
        const p = (ang, d) => `${(ex + Math.cos(ang) * d).toFixed(1)} ${(ey + Math.sin(ang) * d).toFixed(1)}`;
        el('path', { class: 'out', d: `M${p(a, 6)} L${p(a + 2.4, 5)} L${p(a - 2.4, 5)} Z` }, dots);
      }
      pos.push({ s, x, y, r });
    }
    // etichette: i più in pena e i 3 più pesanti, dove non si sovrappongono tra loro né ai testi del grafico
    const labels = el('g', {}, svg), lw = (s) => s.length * 6.9 + 6;
    // riquadri occupati {x, top, w, bottom}: un testo di 11 px sta da 11 sopra a 4 sotto la linea di base
    const box = (x, y, w) => ({ x, top: y - 11, w, bottom: y + 4 });
    const boxes = [
      box(W - R - 2 - lw(`equal ${sgn(ref[1])}%`), yEw + (close && yEw >= yCw ? 12 : -4), lw(`equal ${sgn(ref[1])}%`)),
      box(W - R - 2 - lw(`cap ${sgn(ref[0])}%`), yCw + (close && yCw > yEw ? 12 : -4), lw(`cap ${sgn(ref[0])}%`)),
      box(L + 4, T + 10, lw(`↑ rendimento ${st.per}`)),
    ];
    const heavy = [...list].sort((a, b) => (b.w || 0) - (a.w || 0)).slice(0, narrow ? 2 : 3);
    for (const s of new Set([...order.slice(0, narrow ? 6 : WORST), ...heavy])) {
      const p = pos.find((q) => q.s === s);
      if (!p) continue; // senza valore sull'asse x: solo nella lista
      const b = placeLabel(p, boxes, L, W - R, T, H - B);
      if (b) text(labels, b[0], b[1], s.s, { class: `lab${worst.has(s.s) ? ' bad' : ''}` });
    }
    const hoverLab = text(svg, -99, -99, '', { class: 'lab on' });
    bub = { pos, hoverLab, boxes, bounds: [L, W - R, T, H - B], W };
    const below = members.filter((s) => s.d200 != null && s.d200 < 0).length, off = members.length - list.length;
    $('titBubbleMeta').textContent = `${members.length} titoli · ${below} sotto la media 200 · ${st.per}` + (off ? ` · ${off} senza il dato dell'asse orizzontale, solo nella lista` : '');
    if (st.hover) setHover(st.hover);
  }
  function placeLabel(p, boxes, x0, x1, y0, y1) {
    const w = p.s.s.length * 6.9 + 6;
    const cands = [[p.x + p.r + 3, p.y + 4], [p.x - p.r - 3 - w, p.y + 4], [p.x - w / 2, p.y - p.r - 5], [p.x - w / 2, p.y + p.r + 12]];
    const free = ([x, y]) => x > x0 && x + w < x1 && y - 11 > y0 && y + 4 < y1 &&
      !boxes.some((b) => x < b.x + b.w && x + w > b.x && y - 11 < b.bottom && y + 4 > b.top);
    const ok = cands.find(free);
    if (ok) boxes.push({ x: ok[0], top: ok[1] - 11, w, bottom: ok[1] + 4 });
    return ok;
  }
  function drawList(rows, sec) {
    $('titPainMeta').textContent = `${sec} · ${st.per}`;
    $('titPain').innerHTML = `<thead><tr><th>Titolo</th><th class="r">${st.per}</th><th class="r" title="Distanza dalla chiusura più alta delle 52 settimane">Dal max 52s</th><th class="r" title="Distanza dalla media a 200 sedute">M. 200</th><th class="r" title="Peso nell'S&amp;P 500">Peso</th></tr></thead><tbody>` +
      rows.map((s, i) => `<tr data-s="${esc(s.s)}"${i < WORST ? ' class="worst"' : ''}><td><a class="sym" href="${tvStock(s.s)}" target="_blank" rel="noopener" title="${esc(s.n)} · grafico su TradingView">${esc(s.s)}</a><span class="nm">${esc(s.n)}</span></td>` +
        `<td class="num r">${pct(s.r[st.per])}</td><td class="num r">${pct(s.dd)}</td><td class="num r">${s.d200 == null ? '<span class="muted" title="meno di 200 sedute di storia">—</span>' : pct(s.d200)}</td>` +
        `<td class="num r muted">${s.w == null ? '—' : fmt(s.w, 2) + '%'}</td></tr>`).join('') + '</tbody>';
    $('titPain').querySelectorAll('tbody tr').forEach((tr) => {
      // col mouse evidenza al passaggio; al tocco la evidenza resta finché non si tocca altro
      tr.onpointerenter = (e) => { if (e.pointerType === 'mouse') setHover(tr.dataset.s); };
      tr.onpointerleave = (e) => { if (e.pointerType === 'mouse') setHover(null); };
      tr.addEventListener('focusin', () => setHover(tr.dataset.s)); // dal link del ticker, con la tastiera
      tr.addEventListener('click', (e) => { if (!e.target.closest('a')) setHover(tr.dataset.s); }); // al tocco
      tr.addEventListener('focusout', () => setHover(null));
    });
  }
  // evidenza di un titolo nella bubble e nella lista, senza ridisegnare
  function setHover(s) {
    st.hover = s;
    $('titPain').querySelectorAll('tbody tr').forEach((tr) => tr.classList.toggle('hl', tr.dataset.s === s));
    if (!bub) return;
    $('titBubble').querySelectorAll('circle.dot').forEach((c) => c.classList.toggle('on', c.dataset.s === s));
    const p = s && bub.pos.find((q) => q.s.s === s);
    if (p) {
      const c = $('titBubble').querySelector(`circle.dot[data-s="${CSS.escape(s)}"]`);
      if (c) c.parentNode.appendChild(c); // in primo piano
      const [x0, x1, y0, y1] = bub.bounds, w = s.length * 7 + 4;
      const x = p.x + p.r + 3 + w < x1 ? p.x + p.r + 3 : p.x - p.r - 3 - w;
      bub.hoverLab.setAttribute('x', Math.max(x0, x)); bub.hoverLab.setAttribute('y', Math.min(y1, Math.max(y0 + 12, p.y + 4)));
      bub.hoverLab.textContent = s;
    } else { bub.hoverLab.textContent = ''; }
  }
  function bubbleTip(e, s) {
    const tip = $('titBubbleTip');
    const since = s.added ? `nell'indice dal ${dIT(s.added)}` : s.since ? `quotato dal ${dIT(s.since)}` : '';
    tip.innerHTML = `<div class="row"><b>${esc(s.s)}</b><span>${fmt(s.px, 2)} $</span></div>` +
      `<span class="note-row">${esc(s.n)} · ${esc(s.sub)}${since ? ' · ' + since : ''}</span>` +
      [[`rendimento ${st.per}`, s.r[st.per]], ['periodo precedente', s.prev[st.per]], ['dal massimo 52s', s.dd], ['dalla media 200', s.d200], ['dalla media 50', s.d50]]
        .map(([k, v]) => `<div class="row"><span>${k}</span><span>${pct(v)}</span></div>`).join('') +
      `<div class="row"><span>peso nell'S&amp;P 500</span><span>${s.w == null ? '—' : fmt(s.w, 2) + '%'}</span></div>`;
    placeTip(tip, $('titBubbleWrap'), e);
    keepOnScreen(tip, e);
  }
  // titolo sotto il puntatore o più vicino (14 px di tolleranza, anche al tocco). Dentro più bolle vince l'ultima
  // disegnata, cioè la più piccola, che sta sopra: così anche le bolle piccole sopra una grande si raggiungono
  function nearest(e) {
    if (!bub) return null;
    const svg = $('titBubble'), rc = svg.getBoundingClientRect(), k = bub.W / rc.width;
    const x = (e.clientX - rc.left) * k, y = (e.clientY - rc.top) * k;
    let best = null, bd = Infinity;
    for (const p of bub.pos) { const d = Math.max(0, Math.hypot(p.x - x, p.y - y) - p.r); if (d <= bd) { bd = d; best = p; } }
    return best && bd <= 14 * k ? best.s : null;
  }

  function bind() {
    const seg = (id, attr, key, after) => document.querySelectorAll(`#${id} button`).forEach((b) => {
      b.onclick = () => { st[key] = b.dataset[attr]; store.set('tit' + key[0].toUpperCase() + key.slice(1), st[key]); renderControls(); after(); };
    });
    seg('titPerSeg', 'per', 'per', () => { drawSpread(); drawBubble(); });
    seg('titTrailSeg', 'trail', 'trail', drawSpread);
    seg('titSortSeg', 'sort', 'sort', drawSpread);
    seg('titSizeSeg', 'size', 'size', drawBubble);
    $('titAx').onchange = (e) => { st.ax = e.target.value; store.set('titAx', st.ax); renderControls(); drawBubble(); };
    const svg = $('titBubble');
    const show = (e) => {
      const s = nearest(e);
      if (s) { bubbleTip(e, s); if (st.hover !== s.s) setHover(s.s); } else { $('titBubbleTip').hidden = true; if (st.hover) setHover(null); }
    };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('click', show); // al tocco
    svg.addEventListener('pointerleave', () => { $('titBubbleTip').hidden = true; setHover(null); });
  }

  return { bind, render, ensure };
}
