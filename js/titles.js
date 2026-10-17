/*
 * titles.js — vista 7 Titoli: dentro i settori S&P 500.
 *  - Grandi contro piccoli: per ogni settore il rendimento cap-weighted (pesano i grandi, blu) ed equal-weight
 *    (ogni titolo conta uguale, arancio) nel periodo, con le frecce da 1 settimana, 1 mese o 3 mesi fa e la divergenza;
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
    from: ['1', '2', '3', 'off'].includes(store.get('titFrom')) ? store.get('titFrom') : '2',
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
    press('titPerSeg', 'per', st.per); press('titFromSeg', 'from', st.from); press('titSortSeg', 'sort', st.sort); press('titSizeSeg', 'size', st.size);
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
  // due corsie per settore: in alto il cap-weighted (blu, pesano i grandi), sotto l'equal-weight (arancio, ogni
  // titolo uguale). La freccia va da dove era la misura 1 settimana, 1 mese o 3 mesi fa (sulla stessa durata) a
  // oggi; la distanza tra le due punte è la divergenza di oggi. Le date intermedie sono nel riquadro al passaggio
  // del mouse: con i periodi mobili non stanno sulla linea della freccia.
  function rowOf(k) {
    const v = D.sectors[k][st.per];
    const sp = (p) => (p ? p[1] - p[0] : null);
    return { k, v, cw: v[0][0], ew: v[0][1], sp: sp(v[0]), sp1m: sp(v[2]) };
  }
  function drawSpread() {
    const svg = $('titSpread'), sel = ctx.getSector();
    $('titSpreadTip').hidden = true;
    const W = chartWidth(svg, 1120, 360), narrow = W < 640;
    const rows = SECTORS.map(rowOf);
    if (st.sort === 'div') rows.sort((a, b) => b.sp - a.sp);
    const top3 = new Set([...rows].sort((a, b) => Math.abs(b.sp) - Math.abs(a.sp)).slice(0, 3).map((r) => r.k));
    const all = [...rows, rowOf('SPX')];
    const from = st.from === 'off' ? 0 : +st.from; // 1 = 1 settimana, 2 = 1 mese, 3 = 3 mesi fa
    const vals = [0];
    for (const r of all) for (let o = 0; o <= from; o++) if (r.v[o]) vals.push(r.v[o][0], r.v[o][1]);
    const sc = nice(Math.min(...vals), Math.max(...vals), narrow ? 4 : 8);
    const L = narrow ? 50 : 210, R = narrow ? 86 : 190, T = 24, RH = narrow ? 36 : 34, LANE = 6;
    const H = T + RH * (all.length + 0.6) + 6;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const X = (v) => L + ((v - sc.lo) / (sc.hi - sc.lo)) * (W - L - R);
    for (const v of ticks(sc)) {
      el('line', { class: v === 0 ? 'zero' : 'grid', x1: X(v), x2: X(v), y1: T - 8, y2: H - 4 }, svg);
      text(svg, X(v), 12, tickLabel(v, sc.step), { 'text-anchor': 'middle' });
    }
    text(svg, W - R + 24, 12, narrow ? 'EW−CW' : 'equal − cap');
    text(svg, W - 6, 12, narrow ? '1M' : 'in 1 mese', { 'text-anchor': 'end' });
    all.forEach((r, i) => {
      const ref = r.k === 'SPX';
      const y = T + RH * (i + 0.5) + (ref ? RH * 0.6 : 0);
      if (ref) el('line', { class: 'sep', x1: 0, x2: W, y1: y - RH * 0.8, y2: y - RH * 0.8 }, svg);
      const g = el('g', { class: `row${r.k === sel ? ' sel' : ''}${ref ? ' ref' : ''}${top3.has(r.k) ? ' hot' : ''}`, 'data-k': r.k }, svg);
      el('rect', { class: 'rowbg', x: 0, y: y - RH / 2, width: W, height: RH }, g);
      el('rect', { class: 'mark', x: 0, y: y - RH / 2, width: 3, height: RH }, g);
      text(g, 8, y + 4, r.k, { class: 'sym' });
      if (!narrow) text(g, 52, y + 4, ctx.names[r.k] || 'S&P 500', { class: 'nm' });
      for (const leg of [0, 1]) {
        const ly = y + (leg ? LANE : -LANE), cls = leg ? 'eq' : 'cap', x1 = X(r.v[0][leg]);
        const o = from && r.v[from] ? from : 0;
        const x0 = o ? X(r.v[o][leg]) : x1;
        if (Math.abs(x1 - x0) >= 7) {
          // freccia: corpo dal punto di partenza alla punta, punta triangolare nella direzione del movimento
          const dir = x1 > x0 ? 1 : -1;
          el('line', { class: `arr ${cls}`, x1: x0, y1: ly, x2: x1 - dir * 6, y2: ly }, g);
          el('circle', { class: `tail ${cls}`, cx: x0, cy: ly, r: 2.2 }, g);
          el('path', { class: `head ${cls}`, d: `M${x1 + dir * 1.5} ${ly} L${x1 - dir * 7} ${ly - 4.6} L${x1 - dir * 7} ${ly + 4.6} Z` }, g);
        } else {
          el('circle', { class: `head ${cls}`, cx: x1, cy: ly, r: 4.2 }, g);
        }
      }
      const lead = r.sp >= 0 ? 'eq' : 'cap';
      el('circle', { class: `key ${lead}`, cx: W - R + 28, cy: y, r: 3.6 }, g);
      text(g, W - R + 36, y + 4, sgn(r.sp), { class: 'sp' });
      if (r.sp1m != null) {
        const d = r.sp - r.sp1m, flat = Math.abs(d) < 0.5;
        const t = text(g, W - 6, y + 4, '', { class: 'dm', 'text-anchor': 'end' });
        const tri = el('tspan', { class: flat ? '' : d > 0 ? 'eq' : 'cap' }, t);
        tri.textContent = flat ? '=' : d > 0 ? '▲' : '▼';
        if (!narrow) { const v = el('tspan', {}, t); v.textContent = ` ${sgn(d)}`; }
      }
      if (!ref) g.addEventListener('click', () => pick(r.k));
      g.addEventListener('mousemove', (e) => spreadTip(e, r));
      g.addEventListener('mouseleave', () => { $('titSpreadTip').hidden = true; });
    });
    const lead = rows.filter((r) => r.sp > 0).length;
    $('titSpreadNote').textContent = `Equal-weight davanti in ${lead} settori su 11. ` +
      (from ? `Le frecce vanno da ${OFF_TEXT[from]} a oggi. ` : '') +
      `A destra la divergenza di oggi (pallino del colore di chi è davanti) e come è cambiata in 1 mese: ▲ arancio verso l'equal-weight, ▼ blu verso i grandi. Clic su un settore per vederne i titoli.`;
  }
  function spreadTip(e, r) {
    const tip = $('titSpreadTip');
    tip.innerHTML = `<div class="row"><b>${r.k}</b><span>${esc(ctx.names[r.k] || 'S&P 500')}</span></div>` +
      `<div class="row"><span>${PER_TEXT[st.per]}</span><span><span class="cap-c">cap</span> · <span class="eq-c">equal</span> · diff.</span></div>` +
      r.v.map((p, i) => (p ? `<div class="row"><span>${OFF_TEXT[i]}</span><span><span class="cap-c">${sgn(p[0])}%</span> · <span class="eq-c">${sgn(p[1])}%</span> · ${pp(p[1] - p[0])}</span></div>` : '')).join('') +
      (st.per === 'YTD' ? '<span class="note-row">Da inizio anno: le date passate tengono l\'inizio al 31/12 e spostano solo la fine.</span>' : '');
    placeTip(tip, $('titSpreadWrap'), e);
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
    const L = 46, R = 12, T = 12, B = 34;
    const cx = (v) => Math.min(sx.hi, Math.max(sx.lo, v)), cy = (v) => Math.min(sy.hi, Math.max(sy.lo, v));
    const X = (v) => L + ((cx(v) - sx.lo) / (sx.hi - sx.lo)) * (W - L - R);
    const Y = (v) => T + ((sy.hi - cy(v)) / (sy.hi - sy.lo)) * (H - T - B);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    el('rect', { class: 'pain', x: L, y: Y(0), width: Math.max(0, X(0) - L), height: Math.max(0, H - B - Y(0)) }, svg);
    for (const v of ticks(sx)) { el('line', { class: v === 0 ? 'zero' : 'grid', x1: X(v), x2: X(v), y1: T, y2: H - B }, svg); text(svg, X(v), H - B + 14, tickLabel(v, sx.step), { 'text-anchor': 'middle' }); }
    for (const v of ticks(sy)) { el('line', { class: v === 0 ? 'zero' : 'grid', x1: L, x2: W - R, y1: Y(v), y2: Y(v) }, svg); text(svg, L - 6, Y(v) + 4, tickLabel(v, sy.step), { 'text-anchor': 'end' }); }
    text(svg, W - R, H - 4, `${ax.label} →`, { class: 'axl', 'text-anchor': 'end' });
    text(svg, L + 4, T + 10, `↑ rendimento ${st.per}`, { class: 'axl' });
    // rendimento del settore: equal e cap
    const yEw = Y(ref[1]), yCw = Y(ref[0]), close = Math.abs(yEw - yCw) < 12;
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
      const vx = getX(s), vy = s.r[st.per], x = X(vx), y = Y(vy), r = rad(s);
      el('circle', { class: `dot${worst.has(s.s) ? ' bad' : ''}`, 'data-s': s.s, cx: x, cy: y, r }, dots);
      const dx = vx < sx.lo ? -1 : vx > sx.hi ? 1 : 0, dy = vy < sy.lo ? 1 : vy > sy.hi ? -1 : 0;
      if (dx || dy) { // freccia verso il valore fuori scala
        const a = Math.atan2(dy, dx), ex = x + Math.cos(a) * (r + 2), ey = y + Math.sin(a) * (r + 2);
        const p = (ang, d) => `${(ex + Math.cos(ang) * d).toFixed(1)} ${(ey + Math.sin(ang) * d).toFixed(1)}`;
        el('path', { class: 'out', d: `M${p(a, 6)} L${p(a + 2.4, 5)} L${p(a - 2.4, 5)} Z` }, dots);
      }
      pos.push({ s, x, y, r });
    }
    // etichette: i più in pena e i 3 più pesanti, dove non si sovrappongono
    const labels = el('g', {}, svg), boxes = [];
    const heavy = [...list].sort((a, b) => (b.w || 0) - (a.w || 0)).slice(0, 3);
    for (const s of new Set([...order.slice(0, WORST), ...heavy])) {
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
    const w = p.s.s.length * 7 + 4, h = 12;
    const cands = [[p.x + p.r + 3, p.y + 4], [p.x - p.r - 3 - w, p.y + 4], [p.x - w / 2, p.y - p.r - 4], [p.x - w / 2, p.y + p.r + 12]];
    const ok = cands.find(([x, y]) => x > x0 && x + w < x1 && y - h > y0 && y < y1 && !boxes.some((b) => x < b[0] + b[2] && x + w > b[0] && y - h < b[1] && y > b[1] - b[3]));
    if (ok) boxes.push([ok[0], ok[1], w, h]);
    return ok;
  }
  function drawList(rows, sec) {
    $('titPainMeta').textContent = `${sec} · ${st.per}`;
    $('titPain').innerHTML = `<thead><tr><th>Titolo</th><th class="r">${st.per}</th><th class="r" title="Distanza dalla chiusura più alta delle 52 settimane">Dal max</th><th class="r" title="Distanza dalla media a 200 sedute">M. 200</th><th class="r" title="Peso nell'S&amp;P 500">Peso</th></tr></thead><tbody>` +
      rows.map((s) => `<tr data-s="${esc(s.s)}"><td><a class="sym" href="${tvStock(s.s)}" target="_blank" rel="noopener" title="${esc(s.n)} · grafico su TradingView">${esc(s.s)}</a><span class="nm">${esc(s.n)}</span></td>` +
        `<td class="num r">${pct(s.r[st.per])}</td><td class="num r">${pct(s.dd)}</td><td class="num r">${s.d200 == null ? '<span class="muted" title="meno di 200 sedute di storia">n.d.</span>' : pct(s.d200)}</td>` +
        `<td class="num r muted">${s.w == null ? '—' : fmt(s.w, 2)}</td></tr>`).join('') + '</tbody>';
    $('titPain').querySelectorAll('tbody tr').forEach((tr) => {
      tr.onmouseenter = () => setHover(tr.dataset.s);
      tr.onmouseleave = () => setHover(null);
      tr.addEventListener('focusin', () => setHover(tr.dataset.s)); // dal link del ticker, con la tastiera
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
      [[`rendimento ${st.per}`, s.r[st.per]], ['periodo precedente', s.prev[st.per]], ['dal massimo 52 sett.', s.dd], ['dalla media 200', s.d200], ['dalla media 50', s.d50]]
        .map(([k, v]) => `<div class="row"><span>${k}</span><span>${pct(v)}</span></div>`).join('') +
      `<div class="row"><span>peso nell'S&amp;P 500</span><span>${s.w == null ? '—' : fmt(s.w, 2) + '%'}</span></div>`;
    placeTip(tip, $('titBubbleWrap'), e);
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
    seg('titFromSeg', 'from', 'from', drawSpread);
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
