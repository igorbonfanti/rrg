/* format.js — formattazione numeri/date all'italiana e piccoli elementi grafici condivisi. */

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : v.toFixed(d).replace('.', ','));
export const sgn = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), d));
export const pct = (v, d = 1) => (v == null ? '<span class="muted">—</span>' : `<span class="${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${sgn(v, d)}%</span>`);
export const dIT = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

export const QKEY = { Leading: 'lead', Weakening: 'weak', Lagging: 'lag', Improving: 'imp' };

// freccia che punta nella direzione `deg` (gradi bussola, 0° = nord)
export const arrow = (deg) => (deg == null ? '' : `<svg class="arrow" viewBox="-7 -7 14 14" aria-hidden="true"><g transform="rotate(${(deg - 90).toFixed(1)})"><line x1="-5" y1="0" x2="3" y2="0" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 0 L0.8 -3.4 L0.8 3.4 Z" fill="currentColor"/></g></svg>`);
export const qPill = (q, deg) => `<span class="pill q-${QKEY[q]}-c"><span class="d"></span>${q}${deg == null ? '' : ' ' + arrow(deg)}</span>`;
