/*
 * sector-chart.js — dettaglio di un settore: tre pannelli con lo stesso asse del tempo.
 *   1. prezzo dell'ETF (scala logaritmica oltre i 4 anni) con media 200 sedute e i trigger;
 *   2. drawdown dal massimo a 52 settimane;
 *   3. % di titoli sopra la media 200 (e 50, più chiara) con il livello blu.
 * Le bande blu verticali sono i periodi in zona blu calcolati dalla macchina a stati.
 */
import { fmt, sgn, dIT, placeTip } from './format.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function ticks(lo, hi, n) {
  const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => span / k <= n) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}
function sma200(c) {
  const out = new Array(c.length).fill(null);
  let s = 0, k = 0;
  for (let i = 0; i < c.length; i++) {
    if (c[i] == null) { s = 0; k = 0; continue; }
    s += c[i]; k++;
    if (k > 200) s -= c[i - 200];
    if (k >= 200) out[i] = s / 200;
  }
  return out;
}

/**
 * @param {SVGSVGElement} svg
 * @param {{dates: string[], close: number[], dd: number[], b200: number[], b50: number[], days: (string|null)[], triggers: number[],
 *          i0: number, sym: string, blue: number, tipEl: HTMLElement, wrapEl: HTMLElement, width?: number}} p
 */
export function drawSector(svg, p) {
  const { i0, sym, blue, tipEl, wrapEl } = p;
  const ma = sma200(p.close);
  const dates = p.dates.slice(i0), n = dates.length;
  const c = p.close.slice(i0), m = ma.slice(i0), dd = p.dd.slice(i0), b = p.b200.slice(i0), b50 = p.b50.slice(i0), days = p.days.slice(i0);
  const W = p.width || 940, L = 8, R = 60, GAP = 26, PW = W - L - R;
  const narrow = PW < 440; // telefono: titoli e note più corti per non sovrapporsi
  const panes = [
    { key: 'px', h: 220, title: 'PREZZO · MEDIA 200 SEDUTE' },
    { key: 'dd', h: 100, title: narrow ? 'DRAWDOWN DAL MASSIMO 52 SETT.' : 'DRAWDOWN DAL MASSIMO A 52 SETTIMANE' },
    { key: 'br', h: 150, title: `% TITOLI SOPRA LA MEDIA 200 · LIVELLO BLU ${blue}%` },
  ];
  let y = 20;
  for (const q of panes) { q.y0 = y; q.y1 = y + q.h; y = q.y1 + GAP; }
  const H = y - GAP + 26;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const sx = (i) => L + (i / Math.max(1, n - 1)) * PW;
  const vals = (a) => a.filter((v) => v != null);

  const pv = vals(c).concat(vals(m));
  const pLo = Math.min(...pv), pHi = Math.max(...pv);
  const P0 = panes[0], P1 = panes[1], P2 = panes[2];
  P0.log = n / 252 > 4;
  if (P0.log) {
    P0.lo = pLo * 0.94; P0.hi = pHi * 1.06;
    const a = Math.log(P0.lo), bb = Math.log(P0.hi);
    P0.sy = (v) => P0.y1 - ((Math.log(v) - a) / (bb - a)) * P0.h;
    P0.ticks = [];
    for (let e = Math.floor(Math.log10(P0.lo)); e <= Math.ceil(Math.log10(P0.hi)); e++) for (const k of [1, 2, 5]) { const v = k * 10 ** e; if (v >= P0.lo && v <= P0.hi) P0.ticks.push(v); }
    P0.title = narrow ? 'PREZZO (SCALA LOG) · MEDIA 200' : 'PREZZO (SCALA LOGARITMICA) · MEDIA 200 SEDUTE';
  } else {
    const pad = (pHi - pLo) * 0.06;
    P0.lo = pLo - pad; P0.hi = pHi + pad;
  }
  P1.lo = Math.min(-5, Math.floor(Math.min(...vals(dd)) / 5) * 5); P1.hi = 0;
  P2.lo = 0; P2.hi = 100; P2.ticks = [0, 25, 50, 75, 100];
  for (const q of panes) if (!q.sy) q.sy = (v) => q.y1 - ((v - q.lo) / (q.hi - q.lo)) * q.h;

  // periodi in zona blu (stati setup/fallito)
  let st = null;
  for (let i = 0; i <= n; i++) {
    const inZone = i < n && (days[i] === 'setup' || days[i] === 'fail');
    if (inZone && st == null) st = i;
    if (!inZone && st != null) {
      const x0 = sx(st) - 1, x1 = sx(i - 1) + 1;
      for (const q of panes) el('rect', { x: x0, y: q.y0, width: Math.max(2, x1 - x0), height: q.h, class: 'band' }, svg);
      st = null;
    }
  }

  const lastVal = { px: c[n - 1], dd: dd[n - 1], br: b[n - 1] };
  for (const q of panes) {
    const tk = q.ticks || ticks(q.lo, q.hi, q.key === 'px' ? 5 : 3);
    const tagY = lastVal[q.key] == null ? null : q.sy(lastVal[q.key]);
    for (const v of tk) {
      el('line', { x1: L, x2: L + PW, y1: q.sy(v), y2: q.sy(v), class: 'gridl' }, svg);
      if (tagY != null && Math.abs(q.sy(v) - tagY) < 13) continue;
      el('text', { x: L + PW + 6, y: q.sy(v) + 3.5, class: 'axt' }, svg).textContent = q.key === 'px' ? fmt(v, v >= 100 ? 0 : 1) : fmt(v, 0) + '%';
    }
    el('rect', { x: L, y: q.y0, width: PW, height: q.h, fill: 'none', stroke: '#2a2a2a' }, svg);
    el('text', { x: L + 6, y: q.y0 - 7, class: 'pane-t' }, svg).textContent = q.title;
  }
  el('text', { x: L + PW, y: P1.y0 - 7, class: 'axt', 'text-anchor': 'end' }, svg).textContent = `${narrow ? 'min' : 'peggiore nel periodo'} ${fmt(Math.min(...vals(dd)))}%`;

  // asse del tempo: ogni 3, 6, 12, 24 o 48 mesi, il più fitto che entra nella larghezza del disegno
  const months = n / 21;
  const every = [3, 6, 12, 24, 48].find((e) => (months / e) * (e >= 12 ? 36 : 52) <= PW) || 48;
  for (let i = 1; i < n; i++) {
    const yy = +dates[i].slice(0, 4), mm = +dates[i].slice(5, 7) - 1, pm = +dates[i - 1].slice(5, 7) - 1;
    if (mm !== pm && (yy * 12 + mm) % every === 0) {
      for (const q of panes) el('line', { x1: sx(i), x2: sx(i), y1: q.y0, y2: q.y1, class: 'gridl' }, svg);
      el('text', { x: sx(i), y: H - 8, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = every >= 12 ? String(yy) : `${MESI[mm]} ${dates[i].slice(2, 4)}`;
    }
  }

  const path = (a, sy) => { let d = '', on = false; for (let i = 0; i < n; i++) { if (a[i] == null) { on = false; continue; } d += (on ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(a[i]).toFixed(1); on = true; } return d; };
  el('path', { d: path(m, P0.sy), class: 'ma' }, svg);
  el('path', { d: path(c, P0.sy), class: 'px' }, svg);
  for (const t of p.triggers) {
    const i = t - i0;
    if (i < 0 || i >= n || c[i] == null) continue;
    const x = sx(i), yy = P0.sy(c[i]) + 10;
    el('path', { d: `M${x} ${yy - 7} L${x - 5} ${yy + 2} L${x + 5} ${yy + 2} Z`, class: 'trigmark' }, svg);
  }
  el('line', { x1: L, x2: L + PW, y1: P1.sy(0), y2: P1.sy(0), class: 'zero' }, svg);
  const first = dd.findIndex((v) => v != null);
  if (first >= 0) el('path', { d: path(dd, P1.sy) + `L${sx(n - 1)} ${P1.sy(0)} L${sx(first)} ${P1.sy(0)} Z`, class: 'ddl' }, svg);
  const clipId = 'bclip-' + sym;
  el('rect', { x: L, y: P2.sy(blue), width: PW, height: Math.max(0, P2.y1 - P2.sy(blue)) }, el('clipPath', { id: clipId }, el('defs', {}, svg)));
  const fb = b.findIndex((v) => v != null);
  if (fb >= 0) {
    el('path', { d: path(b50, P2.sy), class: 'br50' }, svg);
    el('path', { d: path(b, P2.sy) + `L${sx(n - 1)} ${P2.y1} L${sx(fb)} ${P2.y1} Z`, class: 'brfill', 'clip-path': `url(#${clipId})` }, svg);
    el('path', { d: path(b, P2.sy), class: 'br' }, svg);
  }
  el('line', { x1: L, x2: L + PW, y1: P2.sy(blue), y2: P2.sy(blue), class: 'blue' }, svg);
  for (const [q, v, txt] of [[P0, c[n - 1], fmt(c[n - 1], 2)], [P1, dd[n - 1], fmt(dd[n - 1]) + '%'], [P2, b[n - 1], fmt(b[n - 1]) + '%']]) {
    if (v == null) continue;
    const yy = q.sy(v);
    el('rect', { x: L + PW + 1, y: yy - 8, width: R - 3, height: 16, class: 'lasttag' }, svg);
    el('text', { x: L + PW + 5, y: yy + 3.5, class: 'lasttxt' }, svg).textContent = txt;
  }

  // mirino con i valori dei tre pannelli
  const xh = el('line', { x1: 0, x2: 0, y1: P0.y0, y2: P2.y1, class: 'xhair', visibility: 'hidden' }, svg);
  const dots = panes.map(() => el('circle', { r: 3.5, class: 'xdot', visibility: 'hidden' }, svg));
  const hit = el('rect', { x: L, y: P0.y0, width: PW, height: P2.y1 - P0.y0, fill: 'transparent' }, svg);
  const STATE = { normal: 'normale', watch: 'attenzione', setup: 'zona blu', trig: 'trigger', fail: 'fallito', cool: 'cooldown' };
  hit.addEventListener('pointermove', (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const i = Math.max(0, Math.min(n - 1, Math.round(((q.x - L) / PW) * (n - 1))));
    xh.setAttribute('x1', sx(i)); xh.setAttribute('x2', sx(i)); xh.setAttribute('visibility', 'visible');
    [[c[i], P0], [dd[i], P1], [b[i], P2]].forEach(([v, qq], k) => {
      if (v == null) { dots[k].setAttribute('visibility', 'hidden'); return; }
      dots[k].setAttribute('cx', sx(i)); dots[k].setAttribute('cy', qq.sy(v)); dots[k].setAttribute('visibility', 'visible');
    });
    tipEl.innerHTML = `<div class="row"><b>${dIT(dates[i])}</b><span>${sym}${days[i] ? ' · ' + STATE[days[i]] : ''}</span></div>
      <div class="row"><span>Prezzo</span><b>${fmt(c[i], 2)}</b></div><div class="row"><span>Media 200</span><b>${fmt(m[i], 2)}</b></div>
      <div class="row"><span>Drawdown 52s</span><b>${sgn(dd[i])}%</b></div>
      <div class="row"><span>Sopra media 200</span><b>${b[i] == null ? '—' : fmt(b[i]) + '%'}</b></div><div class="row"><span>Sopra media 50</span><b>${b50[i] == null ? '—' : fmt(b50[i]) + '%'}</b></div>`;
    placeTip(tipEl, wrapEl, e, 12);
  });
  hit.addEventListener('pointerleave', () => { xh.setAttribute('visibility', 'hidden'); dots.forEach((d) => d.setAttribute('visibility', 'hidden')); tipEl.hidden = true; });
}
