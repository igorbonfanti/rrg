/*
 * perf-chart.js — performance base 100 dei titoli e del benchmark sull'ultimo periodo.
 * Linee grigie, benchmark in bianco, titolo in evidenza in ambra; etichette solo
 * su benchmark, evidenza, migliore e peggiore. Mirino con i valori di tutti i titoli.
 */
import { fmt, dIT, esc } from './format.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function niceTicks(lo, hi, n) {
  const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => span / k <= n) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

/**
 * @param {SVGSVGElement} svg
 * @param {{dates: string[], closes: Record<string, number[]>, syms: string[], bench: string, focus?: string|null,
 *          days: number, tipEl: HTMLElement, wrapEl: HTMLElement, legendEl: HTMLElement}} p
 */
export function drawPerf(svg, p) {
  const { dates: all, closes, syms, bench, focus, days, tipEl, wrapEl, legendEl } = p;
  const i0 = Math.max(0, all.length - 1 - days);
  const dates = all.slice(i0), n = dates.length;
  const lines = {};
  for (const s of syms.concat([bench])) {
    const c = closes[s];
    if (!c || c[i0] == null) continue;
    lines[s] = c.slice(i0).map((v) => (v == null ? null : (v / c[i0]) * 100));
  }
  const W = 640, H = 300, L = 8, R = 62, T = 12, B = 26;
  const PW = W - L - R, PH = H - T - B;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  let lo = Infinity, hi = -Infinity;
  for (const a of Object.values(lines)) for (const v of a) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const pad = (hi - lo) * 0.06 || 1;
  lo -= pad; hi += pad;
  const sx = (i) => L + (i / Math.max(1, n - 1)) * PW;
  const sy = (v) => T + (1 - (v - lo) / (hi - lo)) * PH;
  const ticks = niceTicks(lo, hi, 5);
  for (const v of ticks) el('line', { x1: L, x2: L + PW, y1: sy(v), y2: sy(v), class: v === 100 ? 'base' : 'gridl' }, svg);
  // etichette del tempo: inizio di mese (ogni 1, 2 o 3 mesi a seconda del periodo)
  const every = n > 300 ? 3 : n > 130 ? 2 : 1;
  for (let i = 1; i < n; i++) {
    const m = +dates[i].slice(5, 7), pm = +dates[i - 1].slice(5, 7);
    if (m !== pm && (m - 1) % every === 0) {
      el('line', { x1: sx(i), x2: sx(i), y1: T, y2: T + PH, class: 'gridl' }, svg);
      el('text', { x: sx(i), y: H - 8, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = `${MESI[m - 1]} ${dates[i].slice(2, 4)}`;
    }
  }
  el('rect', { x: L, y: T, width: PW, height: PH, fill: 'none', stroke: '#2a2a2a' }, svg);
  const path = (a) => { let d = '', on = false; a.forEach((v, i) => { if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); on = true; }); return d; };
  const order = Object.keys(lines).filter((s) => s !== bench && s !== focus);
  for (const s of order) el('path', { d: path(lines[s]), class: 'ln' }, svg);
  if (lines[bench]) el('path', { d: path(lines[bench]), class: 'ln bench' }, svg);
  if (focus && lines[focus]) el('path', { d: path(lines[focus]), class: 'ln focus' }, svg);

  // etichette finali: benchmark, evidenza, migliore e peggiore (senza sovrapposizioni verticali)
  const endVal = (s) => lines[s][n - 1];
  const others = order.filter((s) => endVal(s) != null).sort((a, b) => endVal(b) - endVal(a));
  const want = [[bench, 'bench'], [focus, 'focus']];
  if (!focus && others.length) { want.push([others[0], ''], [others[others.length - 1], '']); }
  const tags = [];
  for (const [s, cls] of want) if (s && lines[s] && endVal(s) != null && !tags.some((t) => t.s === s)) tags.push({ s, cls, y: sy(endVal(s)) });
  tags.sort((a, b) => a.y - b.y);
  for (let k = 1; k < tags.length; k++) if (tags[k].y - tags[k - 1].y < 12) tags[k].y = tags[k - 1].y + 12;
  for (const t of tags) el('text', { x: L + PW + 6, y: t.y + 4, class: 'endl ' + t.cls }, svg).textContent = `${t.s} ${fmt(endVal(t.s), 0)}`;
  // valori dell'asse solo dove non coprono un'etichetta finale
  for (const v of ticks) if (!tags.some((t) => Math.abs(t.y - sy(v)) < 11)) el('text', { x: L + PW + 6, y: sy(v) + 3.5, class: 'axt' }, svg).textContent = fmt(v, 0);

  // mirino
  const xh = el('line', { x1: 0, x2: 0, y1: T, y2: T + PH, class: 'xhair', visibility: 'hidden' }, svg);
  const hit = el('rect', { x: L, y: T, width: PW, height: PH, fill: 'transparent' }, svg);
  hit.addEventListener('pointermove', (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const i = Math.max(0, Math.min(n - 1, Math.round(((q.x - L) / PW) * (n - 1))));
    xh.setAttribute('x1', sx(i)); xh.setAttribute('x2', sx(i)); xh.setAttribute('visibility', 'visible');
    const rows = Object.keys(lines).filter((s) => lines[s][i] != null).sort((a, b) => lines[b][i] - lines[a][i]);
    tipEl.innerHTML = `<div class="row"><b>${dIT(dates[i])}</b><span>base 100</span></div>` + rows.map((s) => {
      const col = s === bench ? 'var(--ink)' : s === focus ? 'var(--amber)' : '#6a6a6a';
      return `<div class="row"><span><span class="kl" style="background:${col}"></span>${esc(s)}</span><b>${fmt(lines[s][i], 1)}</b></div>`;
    }).join('');
    const wr = wrapEl.getBoundingClientRect();
    let x = e.clientX - wr.left + 14;
    if (x + 200 > wr.width) x = e.clientX - wr.left - 210;
    tipEl.style.left = x + 'px'; tipEl.style.top = Math.max(0, e.clientY - wr.top - 40) + 'px'; tipEl.hidden = false;
  });
  hit.addEventListener('pointerleave', () => { xh.setAttribute('visibility', 'hidden'); tipEl.hidden = true; });

  legendEl.innerHTML = `<span><span class="kl" style="background:var(--ink)"></span>${esc(bench)} (benchmark)</span>` +
    (focus ? `<span><span class="kl" style="background:var(--amber)"></span>${esc(focus)} (in evidenza)</span>` : '') +
    `<span><span class="kl" style="background:#5a5a5a"></span>altri titoli</span><span class="muted">dal ${dIT(dates[0])}</span>`;
}
