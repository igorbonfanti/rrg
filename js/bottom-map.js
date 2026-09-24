/*
 * bottom-map.js — "mappa dei bottom": come il grafico di rotazione, ma per drawdown e breadth.
 *   X = profondità del drawdown dal massimo a 52 settimane, in percentile della storia del
 *       settore (a sinistra = più profondo);
 *   Y = % di titoli sopra la media 200 meno il livello blu del settore (0 = livello blu).
 * In basso a sinistra la zona blu; il percorso tipico di un bottom scende verso sinistra,
 * poi risale (la breadth recupera) e infine torna verso destra.
 */
import { placeLabels, SIZE } from './rrg-chart.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
export const zoneOf = (x, y, P) => (y <= 0 && x >= P.ddSetup ? 'setup' : y <= P.watchBand || x >= P.ddWatch ? 'watch' : 'normal');

/**
 * @param {SVGSVGElement} svg
 * @param {{series: Record<string, {x: number, y: number}[]>, syms: string[], focus?: string|null, params: {ddSetup: number, ddWatch: number, watchBand: number}}} p
 */
export function drawBottomMap(svg, { series, syms, focus, params: P }) {
  const W = SIZE, H = 560, M = { l: 46, r: 14, t: 14, b: 42 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  let top = 60;
  for (const s of syms) for (const q of series[s] || []) top = Math.max(top, q.y);
  const yMin = -12, yMax = Math.ceil((top + 4) / 10) * 10;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const sx = (v) => M.l + ((100 - v) / 100) * PW;
  const sy = (v) => M.t + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * PH;
  el('rect', { x: M.l, y: M.t, width: PW, height: PH }, el('clipPath', { id: 'bmclip' }, el('defs', {}, svg)));
  el('rect', { x: M.l, y: M.t, width: sx(P.ddWatch) - M.l, height: PH, class: 'bz-watch' }, svg);
  el('rect', { x: sx(P.ddWatch), y: sy(P.watchBand), width: M.l + PW - sx(P.ddWatch), height: M.t + PH - sy(P.watchBand), class: 'bz-watch' }, svg);
  el('rect', { x: M.l, y: sy(0), width: sx(P.ddSetup) - M.l, height: M.t + PH - sy(0), class: 'bz-setup' }, svg);
  const g = el('g', { class: 'grid' }, svg);
  for (const v of [0, 25, 50, 75, 100]) {
    el('line', { x1: sx(v), x2: sx(v), y1: M.t, y2: M.t + PH }, g);
    el('text', { x: sx(v), y: M.t + PH + 15, class: 'tick', 'text-anchor': 'middle' }, svg).textContent = v + '°';
  }
  for (let v = -10; v <= yMax; v += 10) {
    el('line', { y1: sy(v), y2: sy(v), x1: M.l, x2: M.l + PW }, g);
    el('text', { x: M.l - 7, y: sy(v) + 4, class: 'tick' + (v === 0 ? ' strong' : ''), 'text-anchor': 'end' }, svg).textContent = (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
  }
  el('line', { x1: M.l, x2: M.l + PW, y1: sy(0), y2: sy(0), class: 'bm-blue' }, svg);
  el('line', { x1: sx(P.ddSetup), x2: sx(P.ddSetup), y1: M.t, y2: M.t + PH, class: 'axis100' }, svg);
  el('rect', { x: M.l, y: M.t, width: PW, height: PH, class: 'frame' }, svg);
  for (const [t, x, y, a, c] of [['ZONA BLU', M.l + 8, M.t + PH - 9, 'start', 'bl-setup'], ['ATTENZIONE', M.l + 8, M.t + 16, 'start', 'bl-watch'], ['NORMALE', M.l + PW - 8, M.t + 16, 'end', 'bl-normal']]) {
    el('text', { x, y, 'text-anchor': a, class: 'qlabel ' + c }, svg).textContent = t;
  }
  el('text', { x: M.l + PW - 8, y: sy(0) - 5, 'text-anchor': 'end', class: 'axlabel bl-blue' }, svg).textContent = 'LIVELLO BLU';
  el('text', { x: M.l + PW, y: H - 8, 'text-anchor': 'end', class: 'axlabel' }, svg).textContent = '←  DRAWDOWN PIÙ PROFONDO (percentile storico del settore)';
  el('text', { x: 12, y: M.t, 'text-anchor': 'end', class: 'axlabel', transform: `rotate(-90 12 ${M.t})` }, svg).textContent = 'BREADTH − LIVELLO BLU (punti)  →';

  const plot = el('g', { 'clip-path': 'url(#bmclip)' }, svg);
  const heads = [];
  const order = syms.filter((s) => series[s] && series[s].length);
  if (focus && order.includes(focus)) { order.splice(order.indexOf(focus), 1); order.push(focus); }
  for (const s of order) {
    const pts = series[s], n = pts.length - 1;
    const isFocus = focus === s, dim = focus && !isFocus;
    const grp = el('g', { class: 'series' + (dim ? ' dim' : '') + (isFocus ? ' focus' : '') }, plot);
    for (let i = 1; i <= n; i++) {
      el('line', { x1: sx(pts[i - 1].x), y1: sy(pts[i - 1].y), x2: sx(pts[i].x), y2: sy(pts[i].y), class: isFocus ? `seg segz-${zoneOf(pts[i].x, pts[i].y, P)}` : 'seg', 'stroke-opacity': (0.2 + 0.6 * (i / Math.max(1, n))).toFixed(2) }, grp);
    }
    for (let i = 0; i < n; i++) el('circle', { cx: sx(pts[i].x), cy: sy(pts[i].y), r: 1.8, class: 'dot', 'fill-opacity': (0.25 + 0.6 * (i / Math.max(1, n))).toFixed(2) }, grp);
    const q = pts[n];
    el('circle', { cx: sx(q.x), cy: sy(q.y), r: isFocus ? 7 : 5.5, class: `head headz-${zoneOf(q.x, q.y, P)}` }, grp);
    heads.push({ sym: s, label: s, px: sx(q.x), py: sy(q.y), dim });
  }
  placeLabels(heads, { x1: M.l + 2, y1: M.t + 2, x2: M.l + PW - 2, y2: M.t + PH - 2 });
  const lg = el('g', {}, svg);
  for (const h of heads) {
    if (h.lab.leader) {
      const r = h.lab.r;
      el('line', { x1: h.px, y1: h.py, x2: Math.max(r.x1, Math.min(h.px, r.x2)), y2: Math.max(r.y1, Math.min(h.py, r.y2)), class: 'leader' + (h.dim ? ' dim' : '') }, lg);
    }
    el('text', { x: h.lab.x, y: h.lab.y, class: 'tlabel' + (h.dim ? ' dim' : '') + (focus === h.sym ? ' focus' : '') }, lg).textContent = h.label;
  }
  return { heads };
}
