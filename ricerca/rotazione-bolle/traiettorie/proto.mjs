// Prototipi grafici delle traiettorie (22/11/2026, richiesta dell'utente: «tracciare la traiettoria degli asset, una curva
// morbida tra picco e bottom come nei cicli economici»). Solo ricerca: non tocca l'app.
// Dati: chiusure di ricerca/rotazione-bolle/cache/serie.json (Yahoo, dal 1999 dove c'è; scritte da script/backtest.mjs).
// Massimi di ciclo, minimi e cali dell'S&P 500: js/peaks.js (stesse regole della linea del tempo della 1.12.0).
//  A «Onde levigate»: per ogni mercato la chiusura settimanale in scala logaritmica, levigata con una media pesata
//    gaussiana (sigma 4 settimane, centrata; all'ultima seduta usa solo il passato), scalata tra minimo e massimo della
//    finestra; in rosso il tratto dal massimo di ciclo al minimo; punto al giorno vero del massimo.
//  B «Schema del ciclo»: solo i punti di svolta veri (massimi di ciclo ≥ 20%, o ≥ 15% tratteggiato, e i loro minimi),
//    uniti da una curva monotona (Fritsch-Carlson: nessuna oscillazione inventata tra un punto e l'altro).
//  C «Ciclo tipico»: per ogni mercato la mediana, sugli 8 cali ≥ 15% dell'S&P 500 dal 2000 al 2025, della curva A
//    rispetto al giorno del massimo dell'S&P 500 (log del prezzo meno quello del giorno P). Punto: scarto mediano del massimo
//    di ciclo (medianOffset della tabella T3, ORDER di js/peaks.js), non il massimo della curva mediana: in 5 cali su 8
//    l'S&P 500 era già sopra il massimo entro un anno e il massimo della curva mediana cadrebbe nella ripresa.
// Uso: node ricerca/rotazione-bolle/traiettorie/proto.mjs  → traiettorie/proto.html e traiettorie/numeri.json
import fs from 'node:fs';
import { timeline, cyclePeaks, clean, addDays, dayDiff, ORDER } from '../../../js/peaks.js';

const DIR = new URL('./', import.meta.url);
const S0 = JSON.parse(fs.readFileSync(new URL('../cache/serie.json', DIR)));
const IDS = ['BTC', 'GOLD', 'SILVER', 'COPPER', 'WTI', 'NDX', 'SPX', 'SOXX', 'KOSPI'];
const NAMES = { BTC: 'Bitcoin', GOLD: 'Oro', SILVER: 'Argento', COPPER: 'Rame', WTI: 'Petrolio WTI', NDX: 'Nasdaq-100', SPX: 'S&P 500', SOXX: 'Semiconduttori', KOSPI: 'KOSPI (Corea)' };
const S = Object.fromEntries(IDS.map((id) => [id, clean(S0[id].dates, S0[id].close)]));
const T = timeline(S, IDS, { last: 99 });
const asOf = T.asOf;
const HALF = 365;

// settimanale: ultima chiusura positiva di ogni settimana (lunedì-domenica), in log
function weekly(s) {
  const out = [];
  for (let i = 0; i < s.dates.length; i++) {
    if (!(s.close[i] > 0)) continue;
    const t = Date.parse(s.dates[i]), wd = (new Date(t).getUTCDay() + 6) % 7, wk = t - wd * 864e5;
    if (out.length && out.at(-1).wk === wk) { out.at(-1).d = s.dates[i]; out.at(-1).y = Math.log(s.close[i]); }
    else out.push({ wk, d: s.dates[i], y: Math.log(s.close[i]) });
  }
  return out;
}
// media gaussiana centrata (sigma in settimane); ai bordi della serie usa i punti che ci sono
function smooth(w, sig = 4) {
  const k = Math.ceil(3 * sig);
  return w.map((p, i) => {
    let a = 0, b = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(w.length - 1, i + k); j++) { const g = Math.exp(-((j - i) ** 2) / (2 * sig * sig)); a += g * w[j].y; b += g; }
    return { d: p.d, y: a / b };
  });
}
const W = Object.fromEntries(IDS.map((id) => [id, smooth(weekly(S[id]))]));
const valAt = (arr, d) => { // interpolazione lineare sul tempo
  const t = Date.parse(d);
  let lo = 0, hi = arr.length - 1;
  if (t < Date.parse(arr[0].d) || t > Date.parse(arr[hi].d)) return null;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Date.parse(arr[m].d) <= t) lo = m; else hi = m; }
  const t0 = Date.parse(arr[lo].d), t1 = Date.parse(arr[hi].d);
  return t1 === t0 ? arr[lo].y : arr[lo].y + ((arr[hi].y - arr[lo].y) * (t - t0)) / (t1 - t0);
};
const closeAt = (s, d) => { let r = null; for (let i = 0; i < s.dates.length && s.dates[i] <= d; i++) r = s.close[i]; return r; };

// curva monotona di Fritsch-Carlson tra punti (x crescente)
function monotone(pts) {
  const n = pts.length; if (n < 2) return () => (n ? pts[0][1] : null);
  const dx = [], m = [], t = new Array(n);
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); m.push((pts[i + 1][1] - pts[i][1]) / dx[i]); }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  return (x) => {
    let i = 0; while (i < n - 2 && x > pts[i + 1][0]) i++;
    const h = dx[i], u = (x - pts[i][0]) / h, h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    return h00 * pts[i][1] + h10 * h * t[i] + h01 * pts[i + 1][1] + h11 * h * t[i + 1];
  };
}

// ---------- disegno ----------
const C = { bg: '#0e0e0e', ink: '#e8e8e8', ink2: '#b4b4b4', ink3: '#8a8a8a', grid: '#1f1f1f', axis: '#55555c', line: '#8a8a8a', down: '#ef4444', blue: '#3b7bff', band: 'rgba(255,255,255,0.07)', amber: '#ffa028' };
const L = 118, R = 250, ROW = 40, TOP = 26, WIDTH = 1360, PW = WIDTH - L - R;
const xOf = (off) => L + ((off + HALF) / (2 * HALF)) * PW;
const f1 = (v) => (v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',') + '%');
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
function frame(title, nRows, body, foot = '') {
  const H = TOP + nRows * ROW + 26;
  let g = `<rect x="${xOf(-31)}" y="${TOP - 6}" width="${xOf(31) - xOf(-31)}" height="${nRows * ROW + 6}" fill="${C.band}"/>`;
  for (const m of [-12, -9, -6, -3, 0, 3, 6, 9, 12]) { const x = xOf((m * HALF) / 12); g += `<line x1="${x}" x2="${x}" y1="${TOP - 6}" y2="${TOP + nRows * ROW}" stroke="${m === 0 ? C.ink : C.grid}" stroke-width="${m === 0 ? 1.5 : 1}"/><text x="${x}" y="${TOP - 10}" fill="${C.ink3}" font-size="11" text-anchor="middle">${m === 0 ? '0' : (m > 0 ? '+' : '−') + Math.abs(m) + ' m'}</text>`; }
  return `<h3>${title}</h3><svg viewBox="0 0 ${WIDTH} ${H}" width="${WIDTH}" height="${H}">${g}${body}</svg>${foot}`;
}
const rowY = (r) => TOP + r * ROW;
const pathOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

const numbers = { asOf, A: {}, B: {}, C: {} };

// A: onde levigate per un episodio
function optionA(ep) {
  const P = ep.peak; let body = '';
  numbers.A[P] = {};
  IDS.forEach((id, r) => {
    const lo = addDays(P, -HALF), hi = addDays(P, HALF);
    const pts = W[id].filter((p) => p.d >= lo && p.d <= hi && p.d <= asOf);
    const y0 = rowY(r), m = ep.markets[id];
    body += `<text x="${L - 10}" y="${y0 + ROW / 2 + 4}" fill="${C.ink2}" font-size="13" text-anchor="end">${NAMES[id]}</text>`;
    if (pts.length < 8) { body += `<text x="${L + 6}" y="${y0 + ROW / 2 + 4}" fill="${C.ink3}" font-size="12">dati non disponibili</text>`; return; }
    const mn = Math.min(...pts.map((p) => p.y)), mx = Math.max(...pts.map((p) => p.y));
    const Y = (v) => y0 + ROW - 6 - ((v - mn) / (mx - mn || 1)) * (ROW - 12);
    const xy = pts.map((p) => [xOf(dayDiff(P, p.d)), Y(p.y)]);
    body += `<path d="${pathOf(xy)}" fill="none" stroke="${C.line}" stroke-width="1.6"/>`;
    let txt = 'nessun calo ≥ 20%';
    if (m.status === 'peak' || m.status === 'anchor') {
      const td = m.troughDate || null;
      const seg = pts.filter((p) => p.d >= m.date && (!td || p.d <= td));
      if (seg.length > 1) body += `<path d="${pathOf(seg.map((p) => [xOf(dayDiff(P, p.d)), Y(p.y)]))}" fill="none" stroke="${C.down}" stroke-width="2.4"/>`;
      const vy = valAt(pts, m.date);
      if (vy != null) body += `<circle cx="${xOf(dayDiff(P, m.date))}" cy="${Y(vy)}" r="4.5" fill="${id === 'SPX' ? C.ink : C.blue}" stroke="${C.bg}" stroke-width="2"/>`;
      txt = `${dIT(m.date)} · ${m.ddPct == null ? 'al massimo' : f1(m.ddPct)}${m.ongoing || ep.ongoing && id === 'SPX' ? ' finora' : ''}`;
      numbers.A[P][id] = { peak: m.date, trough: td, ddPct: m.ddPct };
    }
    body += `<text x="${L + PW + 12}" y="${y0 + ROW / 2 + 4}" fill="${C.ink2}" font-size="12" font-family="monospace">${txt}</text>`;
  });
  if (ep.ongoing) { const x = xOf(dayDiff(P, asOf)); body += `<line x1="${x}" x2="${x}" y1="${TOP - 6}" y2="${TOP + IDS.length * ROW}" stroke="${C.amber}" stroke-dasharray="3 3"/><text x="${x + 4}" y="${TOP + IDS.length * ROW + 16}" fill="${C.amber}" font-size="11">oggi</text>`; }
  return frame(`A · Onde levigate — massimo S&amp;P 500 ${dIT(P)} · calo ${f1(ep.ddPct)}${ep.ongoing ? ' · in corso' : ''}`, IDS.length, body);
}

// B: schema del ciclo tra i punti di svolta veri
function optionB(ep) {
  const P = ep.peak; let body = '';
  numbers.B[P] = {};
  IDS.forEach((id, r) => {
    const y0 = rowY(r), s = S[id];
    body += `<text x="${L - 10}" y="${y0 + ROW / 2 + 4}" fill="${C.ink2}" font-size="13" text-anchor="end">${NAMES[id]}</text>`;
    const lo = addDays(P, -HALF), hi = addDays(P, HALF), end = hi < asOf ? hi : asOf;
    if (!s.dates.length || s.dates[0] > addDays(lo, -365)) { body += `<text x="${L + 6}" y="${y0 + ROW / 2 + 4}" fill="${C.ink3}" font-size="12">dati non disponibili</text>`; return; }
    let X = 20, pk = cyclePeaks(s, 20).filter((p) => p.date <= addDays(hi, 200) && (p.troughDate >= addDays(lo, -200)));
    if (!pk.some((p) => p.date >= lo && p.date <= hi)) { X = 15; pk = cyclePeaks(s, 15).filter((p) => p.date <= addDays(hi, 200) && p.troughDate >= addDays(lo, -200)); }
    const anchors = [];
    for (const p of pk) { anchors.push([dayDiff(P, p.date), Math.log(p.close), 'P', p]); if (!p.ongoing || p.troughDate) anchors.push([dayDiff(P, p.troughDate), Math.log(closeAt(s, p.troughDate)), 'T', p]); }
    anchors.push([-HALF, Math.log(closeAt(s, lo)), 'E'], [dayDiff(P, end), Math.log(closeAt(s, end)), 'E']);
    anchors.sort((a, b) => a[0] - b[0]);
    const uniq = anchors.filter((a, i) => i === 0 || a[0] !== anchors[i - 1][0]);
    const f = monotone(uniq.map((a) => [a[0], a[1]]));
    const xs = []; for (let o = -HALF; o <= dayDiff(P, end); o += 3) xs.push(o);
    const ys = xs.map(f), inW = uniq.filter((a) => a[0] >= -HALF && a[0] <= dayDiff(P, end));
    const mn = Math.min(...ys, ...inW.map((a) => a[1])), mx = Math.max(...ys, ...inW.map((a) => a[1]));
    const Y = (v) => y0 + ROW - 6 - ((v - mn) / (mx - mn || 1)) * (ROW - 12);
    const dash = X === 15 && id !== 'SPX' ? ' stroke-dasharray="5 4"' : '';
    body += `<path d="${pathOf(xs.map((o, i) => [xOf(o), Y(ys[i])]))}" fill="none" stroke="${C.line}" stroke-width="1.8"${dash}/>`;
    // tratti di discesa: dal massimo al suo minimo
    for (const p of pk) {
      const a = Math.max(-HALF, dayDiff(P, p.date)), b = Math.min(dayDiff(P, end), p.troughDate ? dayDiff(P, p.troughDate) : dayDiff(P, end));
      if (b <= a) continue;
      const seg = []; for (let o = a; o <= b; o += 2) seg.push([xOf(o), Y(f(o))]);
      body += `<path d="${pathOf(seg)}" fill="none" stroke="${C.down}" stroke-width="2.6"${dash}/>`;
    }
    const m = ep.markets[id];
    for (const a of inW) if (a[2] === 'P') body += `<circle cx="${xOf(a[0])}" cy="${Y(a[1])}" r="${m.date === a[3].date ? 4.5 : 3.5}" fill="${m.date === a[3].date ? (id === 'SPX' ? C.ink : C.blue) : C.bg}" stroke="${m.date === a[3].date ? C.bg : C.blue}" stroke-width="2"/>`;
    for (const a of inW) if (a[2] === 'T') body += `<rect x="${xOf(a[0]) - 3}" y="${Y(a[1]) - 3}" width="6" height="6" fill="${C.ink3}"/>`;
    const txt = m.status === 'peak' || m.status === 'anchor' ? `${dIT(m.date)} · ${m.ddPct == null ? 'al massimo' : f1(m.ddPct)}${m.ongoing || (ep.ongoing && id === 'SPX') ? ' finora' : ''}` : X === 15 && m.alt ? `solo calo ≥ 15%: ${dIT(m.alt.date)} · ${f1(m.alt.ddPct)}` : 'nessun calo ≥ 20%';
    body += `<text x="${L + PW + 12}" y="${y0 + ROW / 2 + 4}" fill="${C.ink2}" font-size="12" font-family="monospace">${txt}</text>`;
    numbers.B[P][id] = { X, anchors: inW.map((a) => [addDays(P, a[0]), a[2], Math.round(Math.exp(a[1]) * 100) / 100]) };
  });
  if (ep.ongoing) { const x = xOf(dayDiff(P, asOf)); body += `<line x1="${x}" x2="${x}" y1="${TOP - 6}" y2="${TOP + IDS.length * ROW}" stroke="${C.amber}" stroke-dasharray="3 3"/><text x="${x + 4}" y="${TOP + IDS.length * ROW + 16}" fill="${C.amber}" font-size="11">oggi</text>`; }
  return frame(`B · Schema del ciclo — massimo S&amp;P 500 ${dIT(P)} · calo ${f1(ep.ddPct)}${ep.ongoing ? ' · in corso' : ''}`, IDS.length, body);
}

// C: ciclo tipico, mediana sugli 8 cali conclusi
function optionC(eps) {
  const K = 52, med = {}, order = [];
  for (const id of IDS) {
    const curves = [];
    for (const ep of eps) {
      const P = ep.peak, y0 = valAt(W[id], P);
      if (y0 == null || valAt(W[id], addDays(P, -HALF)) == null) continue;
      curves.push(Array.from({ length: 2 * K + 1 }, (_, i) => { const v = valAt(W[id], addDays(P, (i - K) * 7)); return v == null ? null : v - y0; }));
    }
    const m = Array.from({ length: 2 * K + 1 }, (_, i) => { const v = curves.map((c) => c[i]).filter((x) => x != null).sort((a, b) => a - b); return v.length >= 3 ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; });
    const imax = Math.round(ORDER.markets[id].medianOffset / 7) + K;
    let imin = -1; for (let i = imax; i < m.length; i++) if (m[i] != null && (imin < 0 || m[i] < m[imin])) imin = i;
    med[id] = { n: curves.length, m, peakWeek: imax - K, troughWeek: imin - K, dropPct: Math.round((Math.exp(m[imin] - m[imax]) - 1) * 1000) / 10 };
    order.push(id);
  }
  order.sort((a, b) => ORDER.markets[a].meanRankNorm - ORDER.markets[b].meanRankNorm);
  numbers.C = Object.fromEntries(order.map((id) => [id, { episodi: med[id].n, settimanaMassimo: med[id].peakWeek, settimanaMinimo: med[id].troughWeek, caloMediana: med[id].dropPct }]));
  let body = '';
  order.forEach((id, r) => {
    const y0 = rowY(r), m = med[id].m, idx = m.map((v, i) => [i, v]).filter(([, v]) => v != null);
    body += `<text x="${L - 10}" y="${y0 + ROW / 2 + 4}" fill="${C.ink2}" font-size="13" text-anchor="end">${NAMES[id]}</text>`;
    const mn = Math.min(...idx.map(([, v]) => v)), mx = Math.max(...idx.map(([, v]) => v));
    const Y = (v) => y0 + ROW - 6 - ((v - mn) / (mx - mn || 1)) * (ROW - 12), X = (i) => xOf((i - 52) * 7);
    body += `<path d="${pathOf(idx.map(([i, v]) => [X(i), Y(v)]))}" fill="none" stroke="${C.line}" stroke-width="1.8"/>`;
    const a = med[id].peakWeek + 52, b = med[id].troughWeek + 52;
    body += `<path d="${pathOf(idx.filter(([i]) => i >= a && i <= b).map(([i, v]) => [X(i), Y(v)]))}" fill="none" stroke="${C.down}" stroke-width="2.6"/>`;
    body += `<circle cx="${X(a)}" cy="${Y(m[a])}" r="4.5" fill="${id === 'SPX' ? C.ink : C.blue}" stroke="${C.bg}" stroke-width="2"/>`;
    const w = med[id].peakWeek;
    const o = ORDER.markets[id];
    body += `<text x="${L + PW + 12}" y="${y0 + ROW / 2 + 4}" fill="${C.ink2}" font-size="12" font-family="monospace">${o.medianOffset === 0 ? '0 g' : (o.medianOffset > 0 ? '+' : '−') + String(Math.abs(o.medianOffset)).replace('.', ',') + ' g'} · rango ${o.meanRankNorm.toFixed(2).replace('.', ',')} · ${med[id].n} cali</text>`; void w;
  });
  return frame(`C · Ciclo tipico — mediana degli ${eps.length} cali ≥ 15% dell'S&amp;P 500 dal ${eps[0].peak.slice(0, 4)} al ${eps.at(-1).peak.slice(0, 4)}, in ordine tipico`, IDS.length, body);
}

const done = T.episodes.filter((e) => !e.ongoing && e.peak >= '2000-01-01'), cur = T.episodes.filter((e) => e.ongoing);
const e22 = done.find((e) => e.peak === '2022-01-03');
const html = `<!doctype html><meta charset="utf-8"><title>Traiettorie</title><style>body{background:#000;color:#e8e8e8;font-family:"IBM Plex Sans Condensed",Arial Narrow,sans-serif;margin:16px}section{background:${C.bg};border:1px solid #2a2a2a;padding:10px 14px;margin:0 0 18px;width:${WIDTH}px}h3{font-size:15px;margin:4px 0 6px}p{color:#b4b4b4;font-size:13px;margin:6px 0;max-width:${WIDTH}px}svg text{font-family:inherit}</style>
<section id="A">${optionA(e22)}${optionA(cur[0])}<p>Linea grigia: chiusura settimanale levigata (media gaussiana di circa 2 mesi), scala logaritmica, ogni riga tra il suo minimo e il suo massimo nella finestra. Rosso: dal massimo di ciclo al minimo. Punto: giorno vero del massimo di ciclo (blu) e dell'S&amp;P 500 (bianco).</p></section>
<section id="B">${optionB(e22)}${optionB(cur[0])}<p>Solo i punti di svolta veri (punto: massimo di ciclo ≥ 20%, pieno quello più alto nella finestra; quadratino: minimo) uniti da una curva morbida che non inventa oscillazioni; tratteggio: solo cali ≥ 15%. Rosso: discesa dal massimo al minimo. Le oscillazioni sotto il 20% non si vedono.</p></section>
<section id="C">${optionC(done)}<p>Per ogni mercato la mediana delle curve levigate negli 8 cali, rispetto al giorno del massimo dell'S&amp;P 500; righe nell'ordine tipico. Punto: scarto mediano del massimo di ciclo (tabella T3 della ricerca); rosso: discesa della curva mediana da lì al suo minimo.</p></section>`;
fs.writeFileSync(new URL('proto.html', DIR), html);
fs.writeFileSync(new URL('numeri.json', DIR), JSON.stringify(numbers, null, 1));
console.log('episodi', done.map((e) => e.peak).join(' '), '| in corso', cur.map((e) => e.peak).join(' '));
console.log(JSON.stringify(numbers.C));
