/*
 * cap-chart.js — scheda «Cali forti»: due pannelli con lo stesso asse del tempo.
 *   1. prezzo (scala logaritmica oltre i 4 anni);
 *   2. somma dei cali forti sulle ultime N sedute (titoli o % dei titoli) con la soglia di allerta.
 * Le bande rosse chiare sono gli episodi di allerta (capAnalysis in capitulation.js).
 */
import { fmt, dIT, placeTip, pxDec, bindTip } from './format.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function ticks(lo, hi, n) {
  const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => span / k <= n) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/**
 * @param {SVGSVGElement} svg
 * @param {{dates: string[], close: (number|null)[], sum: (number|null)[], alert: (number|null)[], on: boolean[],
 *          unit: string, label: string, short?: string, sym: string, tipEl: HTMLElement, wrapEl: HTMLElement, width?: number}} p
 *   short: titolo del secondo pannello sugli schermi stretti
 *   tutte le serie sulle stesse sedute (`dates`), già tagliate al periodo da mostrare; unit: '' (titoli) o '%'
 */
export function drawCap(svg, p) {
  const { dates, close: c, sum, alert, on, unit, tipEl, wrapEl } = p;
  const n = dates.length;
  const W = p.width || 940, L = 8, R = 60, GAP = 26, PW = W - L - R, narrow = PW < 440;
  const P0 = { h: 170, title: 'PREZZO' }, P1 = { h: 130, title: narrow && p.short ? p.short : p.label };
  P0.y0 = 20; P0.y1 = P0.y0 + P0.h; P1.y0 = P0.y1 + GAP; P1.y1 = P1.y0 + P1.h;
  const H = P1.y1 + 26;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  if (!n) return;
  const sx = (i) => L + (i / Math.max(1, n - 1)) * PW;
  const vals = (a) => a.filter((v) => v != null);

  const pv = vals(c), pLo = Math.min(...pv), pHi = Math.max(...pv);
  P0.log = n / 252 > 4;
  if (P0.log) {
    P0.lo = pLo * 0.94; P0.hi = pHi * 1.06;
    const a = Math.log(P0.lo), b = Math.log(P0.hi);
    P0.sy = (v) => P0.y1 - ((Math.log(v) - a) / (b - a)) * P0.h;
    P0.ticks = [];
    for (let e = Math.floor(Math.log10(P0.lo)); e <= Math.ceil(Math.log10(P0.hi)); e++) for (const k of [1, 2, 5]) { const v = k * 10 ** e; if (v >= P0.lo && v <= P0.hi) P0.ticks.push(v); }
    P0.title = narrow ? 'PREZZO (SCALA LOG)' : 'PREZZO (SCALA LOGARITMICA)';
  } else {
    const pad = (pHi - pLo) * 0.06 || 1;
    P0.lo = pLo - pad; P0.hi = pHi + pad;
    P0.sy = (v) => P0.y1 - ((v - P0.lo) / (P0.hi - P0.lo)) * P0.h;
  }
  const top = Math.max(1, ...vals(sum), ...vals(alert));
  P1.lo = 0; P1.hi = top * 1.08;
  P1.sy = (v) => P1.y1 - ((v - P1.lo) / (P1.hi - P1.lo)) * P1.h;

  // episodi di allerta
  let s0 = null;
  for (let i = 0; i <= n; i++) {
    const x = i < n && on[i];
    if (x && s0 == null) s0 = i;
    if (!x && s0 != null) {
      const x0 = sx(s0) - 1.5, x1 = sx(i - 1) + 1.5;
      for (const q of [P0, P1]) el('rect', { x: x0, y: q.y0, width: Math.max(3, x1 - x0), height: q.h, class: 'band-cap' }, svg);
      s0 = null;
    }
  }
  const lastVal = [c[n - 1], sum[n - 1]];
  [P0, P1].forEach((q, k) => {
    const tk = q.ticks || ticks(q.lo, q.hi, k ? 3 : 5);
    const tagY = lastVal[k] == null ? null : q.sy(lastVal[k]);
    for (const v of tk) {
      el('line', { x1: L, x2: L + PW, y1: q.sy(v), y2: q.sy(v), class: 'gridl' }, svg);
      if (tagY != null && Math.abs(q.sy(v) - tagY) < 16) continue;
      el('text', { x: L + PW + 6, y: q.sy(v) + 3.5, class: 'axt' }, svg).textContent = k ? fmt(v, v >= 10 || !unit ? 0 : 1) + unit : fmt(v, v >= 100 ? 0 : v >= 10 ? 1 : 2);
    }
    el('rect', { x: L, y: q.y0, width: PW, height: q.h, class: 'frame' }, svg);
    el('text', { x: L + 6, y: q.y0 - 7, class: 'pane-t' }, svg).textContent = q.title;
  });

  const months = n / 21;
  const every = [3, 6, 12, 24, 48].find((e) => (months / e) * (e >= 12 ? 36 : 52) <= PW) || 48;
  for (let i = 1; i < n; i++) {
    const yy = +dates[i].slice(0, 4), mm = +dates[i].slice(5, 7) - 1, pm = +dates[i - 1].slice(5, 7) - 1;
    if (mm !== pm && (yy * 12 + mm) % every === 0) {
      for (const q of [P0, P1]) el('line', { x1: sx(i), x2: sx(i), y1: q.y0, y2: q.y1, class: 'gridl' }, svg);
      el('text', { x: sx(i), y: H - 8, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = every >= 12 ? String(yy) : `${MESI[mm]} ${dates[i].slice(2, 4)}`;
    }
  }

  const path = (a, sy) => { let d = '', go = false; for (let i = 0; i < n; i++) { if (a[i] == null) { go = false; continue; } d += (go ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(a[i]).toFixed(1); go = true; } return d; };
  el('path', { d: path(c, P0.sy), class: 'px' }, svg);
  // somma come area: con migliaia di sedute le barre sarebbero più sottili di un pixel
  let d = '';
  let open = -1;
  for (let i = 0; i <= n; i++) {
    const v = i < n ? sum[i] : null;
    if (v != null && open < 0) { open = i; d += `M${sx(i).toFixed(1)} ${P1.y1}`; }
    if (v != null) d += `L${sx(i).toFixed(1)} ${P1.sy(v).toFixed(1)}`;
    if (v == null && open >= 0) { d += `L${sx(i - 1).toFixed(1)} ${P1.y1}Z`; open = -1; }
  }
  el('path', { d, class: 'caparea' }, svg);
  el('path', { d: path(alert, P1.sy), class: 'capalert' }, svg);
  // valore della soglia di allerta all'ultima seduta, accanto alla sua linea
  const aL = alert[n - 1];
  if (aL != null) el('text', { x: L + PW - 4, y: P1.sy(aL) - 4, 'text-anchor': 'end', class: 'axt capalert-t' }, svg).textContent = `soglia ${fmt(aL, unit ? 1 : 0)}${unit}`;
  for (const [q, v, txt] of [[P0, c[n - 1], fmt(c[n - 1], c[n - 1] >= 1000 ? 0 : pxDec(c[n - 1]))], [P1, sum[n - 1], sum[n - 1] == null ? '' : fmt(sum[n - 1], unit ? 1 : 0) + unit]]) {
    if (v == null) continue;
    const yy = q.sy(v);
    el('rect', { x: L + PW + 1, y: yy - 8, width: R - 3, height: 16, class: 'lasttag' }, svg);
    el('text', { x: L + PW + 5, y: yy + 3.5, class: 'lasttxt' }, svg).textContent = txt;
  }

  const xh = el('line', { x1: 0, x2: 0, y1: P0.y0, y2: P1.y1, class: 'xhair', visibility: 'hidden' }, svg);
  const dots = [el('circle', { r: 3.5, class: 'xdot', visibility: 'hidden' }, svg), el('circle', { r: 3.5, class: 'xdot', visibility: 'hidden' }, svg)];
  const hit = el('rect', { x: L, y: P0.y0, width: PW, height: P1.y1 - P0.y0, fill: 'transparent' }, svg);
  const show = (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const i = Math.max(0, Math.min(n - 1, Math.round(((q.x - L) / PW) * (n - 1))));
    xh.setAttribute('x1', sx(i)); xh.setAttribute('x2', sx(i)); xh.setAttribute('visibility', 'visible');
    [[c[i], P0], [sum[i], P1]].forEach(([v, qq], k) => {
      if (v == null) { dots[k].setAttribute('visibility', 'hidden'); return; }
      dots[k].setAttribute('cx', sx(i)); dots[k].setAttribute('cy', qq.sy(v)); dots[k].setAttribute('visibility', 'visible');
    });
    const num = (v) => (v == null ? '—' : fmt(v, unit ? 1 : 0) + unit);
    tipEl.innerHTML = `<div class="row"><b>${dIT(dates[i])}</b><span>${p.sym}${on[i] ? ' · <span class="down">allerta</span>' : ''}</span></div>
      <div class="row"><span>Prezzo</span><b>${c[i] == null ? '—' : fmt(c[i], pxDec(c[i]))}</b></div>
      <div class="row"><span>Cali forti</span><b>${num(sum[i])}</b></div><div class="row"><span>Soglia di allerta</span><b>${num(alert[i])}</b></div>`;
    placeTip(tipEl, wrapEl, e, 12);
  };
  bindTip(hit, svg, show, () => { xh.setAttribute('visibility', 'hidden'); dots.forEach((x) => x.setAttribute('visibility', 'hidden')); tipEl.hidden = true; });
}
