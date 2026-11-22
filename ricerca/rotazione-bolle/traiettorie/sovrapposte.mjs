// Proposte «tutti i mercati sullo stesso grafico» (22/11/2026, richiesta dell'utente dopo i prototipi A/B/C di proto.mjs).
// Solo ricerca. Dati: ricerca/rotazione-bolle/cache/serie.json; massimi di ciclo e cali dell'S&P 500 da js/peaks.js.
// Curve: chiusura settimanale in log, levigata con una media gaussiana centrata (sigma 4 settimane; all'ultima seduta solo
// il passato). Tre scale:
//  1 «base 100 al massimo dell'S&P 500»: prezzo / prezzo del giorno del massimo dell'S&P 500 × 100 (scala logaritmica);
//  2 «% dal proprio massimo»: prezzo / massimo della curva nella finestra − 1 (scala logaritmica, 0 = il proprio massimo);
//  3 «posizione nel ciclo 0-100»: tra minimo (0) e massimo (100) della curva nella finestra (scala lineare).
// Punti: giorno vero del massimo di ciclo ≥ 20% (come la linea del tempo), sulla curva. Colori: 8 tinte della tavolozza
// categorica scura validata (scripts/validate_palette.js della skill dataviz) + S&P 500 bianco; etichette dirette a destra.
// Uso: node ricerca/rotazione-bolle/traiettorie/sovrapposte.mjs → sovrapposte.html
import fs from 'node:fs';
import { timeline, clean, addDays, dayDiff } from '../../../js/peaks.js';

const DIR = new URL('./', import.meta.url);
const S0 = JSON.parse(fs.readFileSync(new URL('../cache/serie.json', DIR)));
const IDS = ['BTC', 'GOLD', 'SILVER', 'COPPER', 'WTI', 'NDX', 'SPX', 'SOXX', 'KOSPI'];
const NAMES = { BTC: 'Bitcoin', GOLD: 'Oro', SILVER: 'Argento', COPPER: 'Rame', WTI: 'Petrolio', NDX: 'Nasdaq-100', SPX: 'S&P 500', SOXX: 'Semicond.', KOSPI: 'KOSPI' };
const COL = { NDX: '#3987e5', COPPER: '#d95926', SILVER: '#199e70', GOLD: '#c98500', KOSPI: '#d55181', WTI: '#0ca30c', SOXX: '#9085e9', BTC: '#e66767', SPX: '#f0efec' };
const S = Object.fromEntries(IDS.map((id) => [id, clean(S0[id].dates, S0[id].close)]));
const T = timeline(S, IDS, { last: 99 });
const asOf = T.asOf, HALF = 365;

function weekly(s) {
  const out = [];
  for (let i = 0; i < s.dates.length; i++) {
    if (!(s.close[i] > 0)) continue;
    const t = Date.parse(s.dates[i]), wk = t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5;
    if (out.length && out.at(-1).wk === wk) { out.at(-1).d = s.dates[i]; out.at(-1).y = Math.log(s.close[i]); } else out.push({ wk, d: s.dates[i], y: Math.log(s.close[i]) });
  }
  return out;
}
function smooth(w, sig = 4) {
  const k = Math.ceil(3 * sig);
  return w.map((p, i) => { let a = 0, b = 0; for (let j = Math.max(0, i - k); j <= Math.min(w.length - 1, i + k); j++) { const g = Math.exp(-((j - i) ** 2) / (2 * sig * sig)); a += g * w[j].y; b += g; } return { d: p.d, y: a / b }; });
}
const W = Object.fromEntries(IDS.map((id) => [id, smooth(weekly(S[id]))]));
const valAt = (arr, d) => {
  const t = Date.parse(d); let lo = 0, hi = arr.length - 1;
  if (t < Date.parse(arr[0].d) || t > Date.parse(arr[hi].d)) return null;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Date.parse(arr[m].d) <= t) lo = m; else hi = m; }
  const t0 = Date.parse(arr[lo].d), t1 = Date.parse(arr[hi].d);
  return t1 === t0 ? arr[lo].y : arr[lo].y + ((arr[hi].y - arr[lo].y) * (t - t0)) / (t1 - t0);
};

const C = { bg: '#0e0e0e', ink: '#e8e8e8', ink2: '#b4b4b4', ink3: '#8a8a8a', grid: '#1f1f1f', band: 'rgba(255,255,255,0.06)', amber: '#ffa028', dim: '#3a3a3a' };
const WIDTH = 1360, H = 460, L = 64, R = 120, TOP = 22, B = 30, PW = WIDTH - L - R, PH = H - TOP - B;
const xOf = (off) => L + ((off + HALF) / (2 * HALF)) * PW;
const pathOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const pc = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(0) + '%';

// mode: 'base' | 'dd' | 'pos'; hi: mercati evidenziati (gli altri grigi), null = tutti
function chart(ep, mode, hi = null) {
  const P = ep.peak, lo = addDays(P, -HALF), end = addDays(P, HALF) < asOf ? addDays(P, HALF) : asOf;
  const ser = {};
  for (const id of IDS) {
    const pts = W[id].filter((p) => p.d >= lo && p.d <= end);
    if (pts.length < 8 || valAt(W[id], lo) == null) continue;
    const yP = valAt(W[id], P), mx = Math.max(...pts.map((p) => p.y)), mn = Math.min(...pts.map((p) => p.y));
    const f = mode === 'base' ? (y) => y - yP : mode === 'dd' ? (y) => y - mx : (y) => (mx === mn ? 50 : ((y - mn) / (mx - mn)) * 100);
    ser[id] = { pts: pts.map((p) => [dayDiff(P, p.d), f(p.y)]), f, raw: pts };
  }
  const all = Object.values(ser).flatMap((s) => s.pts.map((p) => p[1]));
  let ymin = Math.min(...all), ymax = Math.max(...all);
  if (mode === 'dd') ymax = 0; if (mode === 'pos') { ymin = 0; ymax = 100; }
  const pad = (ymax - ymin) * 0.04; if (mode !== 'pos') { ymin -= pad; if (mode === 'base') ymax += pad; }
  const yOf = (v) => TOP + ((ymax - v) / (ymax - ymin)) * PH;
  let g = `<rect x="${xOf(-31)}" y="${TOP}" width="${xOf(31) - xOf(-31)}" height="${PH}" fill="${C.band}"/>`;
  for (const m of [-12, -9, -6, -3, 0, 3, 6, 9, 12]) { const x = xOf((m * HALF) / 12); g += `<line x1="${x}" x2="${x}" y1="${TOP}" y2="${TOP + PH}" stroke="${m === 0 ? '#777' : C.grid}"/><text x="${x}" y="${H - 10}" fill="${C.ink3}" font-size="11" text-anchor="middle">${m === 0 ? 'massimo S&amp;P 500' : (m > 0 ? '+' : '−') + Math.abs(m) + ' m'}</text>`; }
  // griglia y
  const ticks = mode === 'pos' ? [0, 25, 50, 75, 100].map((v) => [v, String(v)]) : (mode === 'base' ? [25, 33, 50, 67, 80, 100, 125, 150, 200, 300, 400] : [0, -10, -20, -30, -40, -50, -60, -70, -80]).map((v) => (mode === 'base' ? [Math.log(v / 100), String(v)] : [Math.log(1 + v / 100), v === 0 ? '0%' : `−${-v}%`])).filter(([v]) => v >= ymin && v <= ymax);
  for (const [v, t] of ticks) g += `<line x1="${L}" x2="${L + PW}" y1="${yOf(v)}" y2="${yOf(v)}" stroke="${(mode === 'base' && t === '100') || (mode === 'dd' && t === '0%') ? '#555' : C.grid}"/><text x="${L - 8}" y="${yOf(v) + 4}" fill="${C.ink3}" font-size="11" text-anchor="end">${t}</text>`;
  const order = IDS.filter((id) => ser[id]).sort((a, b) => (hi ? (hi.includes(a) ? 1 : 0) - (hi.includes(b) ? 1 : 0) : 0) || (a === 'SPX' ? 1 : b === 'SPX' ? -1 : 0));
  const labels = [];
  for (const id of order) {
    const on = !hi || hi.includes(id), col = on ? COL[id] : C.dim, sw = id === 'SPX' ? 2.6 : on ? 2 : 1.4;
    g += `<path d="${pathOf(ser[id].pts.map(([o, v]) => [xOf(o), yOf(v)]))}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    const m = ep.markets[id];
    if ((m.status === 'peak' || m.status === 'anchor') && m.date >= lo && m.date <= end) {
      const v = valAt(ser[id].raw, m.date); if (v != null) g += `<circle cx="${xOf(dayDiff(P, m.date))}" cy="${yOf(ser[id].f(v))}" r="${on ? 5 : 3.5}" fill="${col}" stroke="${C.bg}" stroke-width="2"/>`;
    }
    const last = ser[id].pts.at(-1);
    if (on) labels.push({ id, y: yOf(last[1]), x: xOf(last[0]), col });
  }
  labels.sort((a, b) => a.y - b.y); for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;
  for (const l of labels) g += `<text x="${l.x + 6}" y="${l.y + 4}" fill="${C.ink}" font-size="12"><tspan fill="${l.col}">■</tspan> ${NAMES[l.id]}</text>`;
  if (ep.ongoing) { const x = xOf(dayDiff(P, asOf)); g += `<line x1="${x}" x2="${x}" y1="${TOP}" y2="${TOP + PH}" stroke="${C.amber}" stroke-dasharray="3 3"/><text x="${x}" y="${TOP - 6}" fill="${C.amber}" font-size="11" text-anchor="middle">oggi ${dIT(asOf)}</text>`; }
  return `<svg viewBox="0 0 ${WIDTH} ${H}" width="${WIDTH}" height="${H}">${g}</svg>`;
}
const legend = (hi) => `<p class="lg">${IDS.map((id) => `<span style="opacity:${!hi || hi.includes(id) ? 1 : 0.35}"><i style="background:${COL[id]}"></i>${NAMES[id]}</span>`).join('')}</p>`;
const e22 = T.episodes.find((e) => e.peak === '2022-01-03'), cur = T.episodes.find((e) => e.ongoing);
const TIT = { base: 'Base 100 al giorno del massimo dell\'S&amp;P 500 (scala logaritmica)', dd: '% dal proprio massimo nella finestra (scala logaritmica)', pos: 'Posizione nel ciclo: 0 = minimo, 100 = massimo della finestra' };
const sec = (id, ep, mode, hi) => `<section id="${id}"><h3>${TIT[mode]} — massimo S&amp;P 500 ${dIT(ep.peak)}${ep.ongoing ? ' (in corso)' : ''}${hi ? ' · evidenziati: ' + hi.map((x) => NAMES[x]).join(', ') : ''}</h3>${legend(hi)}${chart(ep, mode, hi)}</section>`;
const SEL = ['KOSPI', 'SOXX', 'SPX', 'GOLD'];
const html = `<!doctype html><meta charset="utf-8"><title>Traiettorie sovrapposte</title><style>body{background:#000;color:#e8e8e8;font-family:"IBM Plex Sans Condensed",Arial Narrow,sans-serif;margin:16px}section{background:${C.bg};border:1px solid #2a2a2a;padding:10px 14px;margin:0 0 18px;width:${WIDTH}px}h3{font-size:15px;margin:4px 0 4px}.lg{font-size:12px;color:#b4b4b4;margin:2px 0 4px;display:flex;gap:14px;flex-wrap:wrap}.lg i{display:inline-block;width:14px;height:3px;margin:0 5px 3px 0;vertical-align:middle}svg text{font-family:inherit}</style>
${sec('base', e22, 'base')}${sec('dd', e22, 'dd')}${sec('pos', e22, 'pos')}${sec('dd-sel', e22, 'dd', SEL)}${sec('dd-cur', cur, 'dd')}${sec('pos-cur', cur, 'pos')}`;
fs.writeFileSync(new URL('sovrapposte.html', DIR), html);
console.log('ok', e22.peak, cur.peak);
