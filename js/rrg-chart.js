/*
 * rrg-chart.js — disegno SVG della rotazione relativa, senza librerie.
 *
 * L'etichetta identifica il titolo; il colore dice il quadrante. Code dritte e neutre,
 * più chiare verso il passato; il titolo in evidenza ha la coda colorata per quadrante
 * e gli altri si attenuano. Scala uguale sui due assi, centrata su 100.
 */
import { quadrant, CENTER } from './engine.js';
import { QKEY } from './format.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

// Etichette senza sovrapposizioni: 8 posizioni attorno al punto, poi più lontano con una linea guida
export function placeLabels(heads, box) {
  const placed = [];
  const CW = 7.1, CH = 12;
  const hit = (r) =>
    placed.some((p) => !(r.x2 < p.x1 || r.x1 > p.x2 || r.y2 < p.y1 || r.y1 > p.y2)) ||
    heads.some((h) => h.px > r.x1 - 5 && h.px < r.x2 + 5 && h.py > r.y1 - 5 && h.py < r.y2 + 5) ||
    r.x1 < box.x1 || r.x2 > box.x2 || r.y1 < box.y1 || r.y2 > box.y2;
  const dirs = [[1, -1], [1, 1], [-1, -1], [-1, 1], [0, -1], [0, 1], [1, 0], [-1, 0]];
  for (const h of heads) h.crowd = heads.filter((o) => o !== h && Math.hypot(o.px - h.px, o.py - h.py) < 40).length;
  for (const h of heads.slice().sort((a, b) => b.crowd - a.crowd)) {
    const w = h.label.length * CW;
    let best = null;
    for (const rad of [9, 16, 26, 38]) {
      for (const [dx, dy] of dirs) {
        const cx = h.px + dx * rad, cy = h.py + dy * rad;
        const x1 = dx > 0 ? cx : dx < 0 ? cx - w : cx - w / 2;
        const y1 = dy > 0 ? cy : dy < 0 ? cy - CH : cy - CH / 2;
        const r = { x1, y1, x2: x1 + w, y2: y1 + CH };
        if (!hit(r)) { best = { r, rad }; break; }
      }
      if (best) break;
    }
    if (!best) { const x1 = h.px + 8, y1 = h.py - 14; best = { r: { x1, y1, x2: x1 + w, y2: y1 + CH }, rad: 9 }; }
    placed.push(best.r);
    h.lab = { x: best.r.x1, y: best.r.y1 + CH - 2.5, leader: best.rad > 12, r: best.r };
  }
}

export const SIZE = 640;

/**
 * @param {SVGSVGElement} svg
 * @param {{syms: string[], series: Record<string,{x:number[],y:number[]}>, frame: number, tail: number,
 *          focus?: string|null, range: number, provisional?: boolean, labels?: Record<string,string>, size?: number}} p
 *   labels: nome breve (default il ticker); size: lato del disegno in unità SVG (default SIZE)
 * @returns {{heads: {sym: string, px: number, py: number}[]}}
 */
export function drawRRG(svg, p) {
  const { syms, series, frame, tail, focus, range, provisional, labels = {} } = p;
  const S = p.size || SIZE, M = { l: 46, r: 14, t: 14, b: 42 };
  const PW = S - M.l - M.r, PH = S - M.t - M.b;
  svg.setAttribute('viewBox', `0 0 ${S} ${S}`);
  svg.replaceChildren();
  const lo = CENTER - range, hi = CENTER + range;
  const sx = (v) => M.l + ((v - lo) / (hi - lo)) * PW;
  const sy = (v) => M.t + (1 - (v - lo) / (hi - lo)) * PH;
  const cx = sx(CENTER), cy = sy(CENTER);
  const clipId = 'rrgclip-' + (svg.id || 'x');
  el('rect', { x: M.l, y: M.t, width: PW, height: PH }, el('clipPath', { id: clipId }, el('defs', {}, svg)));

  for (const [q, x, y, w, h] of [
    ['Improving', M.l, M.t, cx - M.l, cy - M.t], ['Leading', cx, M.t, M.l + PW - cx, cy - M.t],
    ['Lagging', M.l, cy, cx - M.l, M.t + PH - cy], ['Weakening', cx, cy, M.l + PW - cx, M.t + PH - cy],
  ]) el('rect', { x, y, width: w, height: h, class: `qfill q-${QKEY[q]}` }, svg);

  const step = range > 8 ? 4 : range > 4 ? 2 : range > 2 ? 1 : 0.5;
  const g = el('g', { class: 'grid' }, svg);
  const dec = step < 1 ? 1 : 0;
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    if (Math.abs(v - CENTER) < 1e-9) continue;
    el('line', { x1: sx(v), x2: sx(v), y1: M.t, y2: M.t + PH }, g);
    el('line', { y1: sy(v), y2: sy(v), x1: M.l, x2: M.l + PW }, g);
    el('text', { x: sx(v), y: M.t + PH + 15, class: 'tick', 'text-anchor': 'middle' }, svg).textContent = v.toFixed(dec);
    el('text', { x: M.l - 7, y: sy(v) + 4, class: 'tick', 'text-anchor': 'end' }, svg).textContent = v.toFixed(dec);
  }
  // cerchi di distanza dal centro, un'unità alla volta
  const rings = el('g', { class: 'rings', 'clip-path': `url(#${clipId})` }, svg);
  for (let d = 1; d < range * 1.45; d += step < 1 ? 1 : step) el('circle', { cx, cy, r: (d / (hi - lo)) * PW }, rings);
  el('line', { x1: cx, x2: cx, y1: M.t, y2: M.t + PH, class: 'axis100' }, svg);
  el('line', { y1: cy, y2: cy, x1: M.l, x2: M.l + PW, class: 'axis100' }, svg);
  el('text', { x: cx, y: M.t + PH + 15, class: 'tick strong', 'text-anchor': 'middle' }, svg).textContent = '100';
  el('text', { x: M.l - 7, y: cy + 4, class: 'tick strong', 'text-anchor': 'end' }, svg).textContent = '100';
  el('rect', { x: M.l, y: M.t, width: PW, height: PH, class: 'frame' }, svg);
  for (const [t, x, y, a, k] of [['IMPROVING', M.l + 8, M.t + 16, 'start', 'imp'], ['LEADING', M.l + PW - 8, M.t + 16, 'end', 'lead'],
    ['LAGGING', M.l + 8, M.t + PH - 9, 'start', 'lag'], ['WEAKENING', M.l + PW - 8, M.t + PH - 9, 'end', 'weak']]) {
    el('text', { x, y, 'text-anchor': a, class: `qlabel ql-${k}` }, svg).textContent = t;
  }
  el('text', { x: M.l + PW, y: S - 8, 'text-anchor': 'end', class: 'axlabel' }, svg).textContent = 'RS-RATIO  →  forza relativa';
  el('text', { x: 12, y: M.t, 'text-anchor': 'end', class: 'axlabel', transform: `rotate(-90 12 ${M.t})` }, svg).textContent = 'RS-MOMENTUM  →  slancio';

  const plot = el('g', { 'clip-path': `url(#${clipId})` }, svg);
  const heads = [];
  const order = syms.filter((s) => series[s] && series[s].x[frame] != null);
  if (focus && order.includes(focus)) { order.splice(order.indexOf(focus), 1); order.push(focus); }
  for (const s of order) {
    const { x, y } = series[s];
    let f0 = Math.max(0, frame - tail + 1);
    while (x[f0] == null && f0 < frame) f0++;
    const isFocus = focus === s, dim = focus && !isFocus;
    const grp = el('g', { class: 'series' + (dim ? ' dim' : '') + (isFocus ? ' focus' : '') }, plot);
    const n = Math.max(1, frame - f0);
    for (let i = f0 + 1; i <= frame; i++) {
      const age = (i - f0) / n;
      el('line', {
        x1: sx(x[i - 1]), y1: sy(y[i - 1]), x2: sx(x[i]), y2: sy(y[i]),
        class: isFocus ? `seg segq-${QKEY[quadrant(x[i], y[i])]}` : 'seg', 'stroke-opacity': (0.2 + 0.6 * age).toFixed(2),
      }, grp);
    }
    for (let i = f0; i < frame; i++) {
      el('circle', {
        cx: sx(x[i]), cy: sy(y[i]), r: isFocus ? 2.6 : 1.8, 'fill-opacity': (0.25 + 0.6 * ((i - f0) / n)).toFixed(2),
        class: isFocus ? `dot dotq-${QKEY[quadrant(x[i], y[i])]}` : 'dot',
      }, grp);
    }
    const hx = sx(x[frame]), hy = sy(y[frame]);
    el('circle', { cx: hx, cy: hy, r: isFocus ? 7 : 5.5, class: `head headq-${QKEY[quadrant(x[frame], y[frame])]}${provisional ? ' prov' : ''}` }, grp);
    heads.push({ sym: s, label: labels[s] || s, px: hx, py: hy, dim });
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

// Punto più vicino al puntatore (in coordinate del viewBox), entro `radiusPx` pixel a schermo
export function nearestHead(svg, heads, evt, radiusPx = 26) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  const vb = svg.viewBox.baseVal;
  const scale = svg.getBoundingClientRect().width / ((vb && vb.width) || SIZE);
  let best = null, bd = radiusPx / scale;
  for (const h of heads) { const d = Math.hypot(h.px - p.x, h.py - p.y); if (d < bd) { bd = d; best = h; } }
  return best;
}
