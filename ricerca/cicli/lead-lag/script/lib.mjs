/*
 * lib.mjs — funzioni comuni dello studio lead-lag (ricerca/cicli/lead-lag/, non tocca l'app).
 * Metodo e scelte: ricerca/cicli/lead-lag/sintesi.md, sezione 1 (scritta prima dei risultati).
 * Usato da leadlag.mjs (dati veri) e sintetico.mjs (prove su serie sintetiche).
 */

export const DAY = 86400000;
export const D0 = (s) => Math.round(Date.parse(s) / DAY); // giorno (numero intero) da 'YYYY-MM-DD'
export const ISO = (d) => new Date(d * DAY).toISOString().slice(0, 10);

/** Generatore pseudo-casuale riproducibile (mulberry32) */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Punti di svolta con soglia X (%) su una serie {dates, close} pulita (solo chiusure > 0).
 * type 'peak': chiusura > tutte quelle dei 365 giorni prima, poi calo ≥ X% prima di una chiusura più alta.
 * type 'trough': chiusura < tutte quelle dei 365 giorni prima, poi rialzo ≥ X% prima di una chiusura più bassa.
 * Serve almeno un anno di storia: date ≥ prima data + 365 giorni.
 */
export function turningPoints(s, X, type) {
  const { dates, close } = s, n = close.length;
  const t = dates.map(D0), el = t[0] + 365;
  const sgn = type === 'peak' ? 1 : -1;
  const v = close.map((c) => sgn * c); // per i minimi: massimi di −prezzo
  // prossima chiusura strettamente «oltre» (più alta per i massimi, più bassa per i minimi)
  const next = new Array(n).fill(n), st = [];
  for (let i = 0; i < n; i++) { while (st.length && v[i] > v[st.at(-1)]) next[st.pop()] = i; st.push(i); }
  const out = [], dq = [];
  let lo = 0;
  for (let i = 0; i < n; i++) {
    while (lo < i && t[lo] < t[i] - 365) lo++;
    while (dq.length && dq[0] < lo) dq.shift();
    const ext = dq.length ? v[dq[0]] : null;
    if (t[i] >= el && ext != null && v[i] > ext) {
      const j = next[i];
      let k = -1;
      for (let q = i + 1; q < j; q++) {
        const ok = type === 'peak' ? close[q] <= close[i] * (1 - X / 100) : close[q] >= close[i] * (1 + X / 100);
        if (ok) { k = q; break; }
      }
      if (k >= 0) out.push({ date: dates[i], t: t[i], close: close[i], conf: dates[k], tConf: t[k], end: j < n ? dates[j] : null });
    }
    while (dq.length && v[dq.at(-1)] <= v[i]) dq.pop();
    dq.push(i);
  }
  return out;
}

/**
 * Raggruppamento gerarchico a legame completo con vincolo: al massimo un punto per mercato in un gruppo, ampiezza
 * (ultimo − primo punto) ≤ D giorni. pts: [{m, t}]. A parità: gruppo unito più stretto, poi inizio più presto, poi indice.
 * Restituisce gruppi [{members: [indici di pts], min, max}] in ordine di inizio.
 */
export function cluster(pts, D = 365) {
  let C = pts.map((p, i) => ({ members: [i], min: p.t, max: p.t, mk: new Set([p.m]) }));
  C.sort((a, b) => a.min - b.min || a.members[0] - b.members[0]);
  for (;;) {
    let best = null;
    for (let i = 0; i < C.length; i++) {
      const a = C[i];
      for (let j = i + 1; j < C.length; j++) {
        const b = C[j];
        if (b.min - a.min > D) break;
        const span = Math.max(a.max, b.max) - a.min;
        if (span > D) continue;
        let clash = false;
        for (const m of b.mk) if (a.mk.has(m)) { clash = true; break; }
        if (clash) continue;
        if (!best || span < best.span || (span === best.span && (a.min < best.start || (a.min === best.start && (i < best.i || (i === best.i && j < best.j))))))
          best = { i, j, span, start: a.min };
      }
    }
    if (!best) break;
    const a = C[best.i], b = C[best.j];
    const m = { members: a.members.concat(b.members), min: Math.min(a.min, b.min), max: Math.max(a.max, b.max), mk: new Set([...a.mk, ...b.mk]) };
    C.splice(best.j, 1);
    C[best.i] = m;
    C.sort((x, y) => x.min - y.min || x.members[0] - y.members[0]);
  }
  return C.map((c) => ({ members: c.members.slice().sort((x, y) => pts[x].t - pts[y].t), min: c.min, max: c.max }));
}

/** Ranghi medi (1..k) dei valori, a parità rango medio */
export function avgRanks(x) {
  const idx = x.map((v, i) => i).sort((a, b) => x[a] - x[b]);
  const r = new Array(x.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && x[idx[j + 1]] === x[idx[i]]) j++;
    for (let q = i; q <= j; q++) r[idx[q]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

export function pearson(a, b) {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
  if (saa === 0 || sbb === 0) return null;
  return sab / Math.sqrt(saa * sbb);
}
export const spearman = (a, b) => pearson(avgRanks(a), avgRanks(b));

/** Cicli: da gruppi a oggetti {date (mediana), t, pts: {m: t}} con almeno minSize mercati */
export function cyclesFrom(pts, groups, minSize = 3) {
  const out = [];
  for (const g of groups) {
    if (g.members.length < minSize) continue;
    const ts = g.members.map((i) => pts[i].t).sort((a, b) => a - b);
    const k = ts.length, med = k % 2 ? ts[(k - 1) / 2] : (ts[k / 2 - 1] + ts[k / 2]) / 2;
    const p = {};
    for (const i of g.members) p[pts[i].m] = pts[i].t;
    out.push({ t: med, pts: p });
  }
  return out;
}

/** Ranghi normalizzati (0 = primo, 1 = ultimo) dei mercati di un ciclo */
export function normRanks(pts) {
  const ms = Object.keys(pts), r = avgRanks(ms.map((m) => pts[m])), k = ms.length, o = {};
  ms.forEach((m, i) => { o[m] = k > 1 ? (r[i] - 1) / (k - 1) : null; });
  return o;
}

/** Concordanza: media delle Spearman tra coppie di cicli con almeno minCommon mercati in comune */
export function concordance(cycles, minCommon = 3) {
  let s = 0, n = 0;
  for (let i = 0; i < cycles.length; i++) for (let j = i + 1; j < cycles.length; j++) {
    const a = cycles[i].pts, b = cycles[j].pts;
    const ms = Object.keys(a).filter((m) => m in b);
    if (ms.length < minCommon) continue;
    const r = spearman(ms.map((m) => a[m]), ms.map((m) => b[m]));
    if (r == null) continue;
    s += r; n++;
  }
  return { rho: n ? s / n : null, pairs: n };
}

/** Rango medio normalizzato per mercato su un insieme di cicli */
export function meanRanks(cycles) {
  const acc = {};
  for (const c of cycles) {
    const r = normRanks(c.pts);
    for (const [m, v] of Object.entries(r)) { (acc[m] ||= []).push(v); }
  }
  return Object.fromEntries(Object.entries(acc).map(([m, a]) => [m, { mean: a.reduce((x, y) => x + y, 0) / a.length, n: a.length }]));
}

/** Fuori campione: stima su cicli con data ≤ split, prova sui cicli dopo; perm = permutazione delle etichette (opzionale) */
export function oos(cycles, split, minK = 3, perm = null) {
  const first = cycles.filter((c) => c.t <= split), second = cycles.filter((c) => c.t > split);
  const est = meanRanks(first);
  let keys = Object.keys(est), map = est;
  if (perm) { const sh = perm(keys); map = Object.fromEntries(keys.map((k, i) => [k, est[sh[i]]])); }
  let s = 0, n = 0;
  const per = [];
  for (const c of second) {
    const ms = Object.keys(c.pts).filter((m) => m in map);
    if (ms.length < minK) continue;
    const r = spearman(ms.map((m) => map[m].mean), ms.map((m) => c.pts[m]));
    if (r == null) continue;
    s += r; n++;
    per.push({ t: c.t, k: ms.length, rho: r });
  }
  return { rho: n ? s / n : null, cycles: n, per, est };
}

/** Spostamento circolare: quantità casuale in [minShift, L − minShift] (L = lunghezza del periodo in giorni) */
export function drawShift(R, L, minShift = 0) {
  const span = L - 2 * minShift;
  if (minShift > 0 && span < 1) throw new Error('periodo troppo corto per lo spostamento minimo');
  return minShift > 0 ? minShift + Math.floor(R() * (span + 1)) : Math.floor(R() * L);
}

/** Spostamento circolare dei punti di ogni mercato nel suo periodo [lo, hi] */
export function shiftPts(pts, win, R, minShift = 0) {
  const off = {};
  for (const m of Object.keys(win)) off[m] = drawShift(R, win[m].hi - win[m].lo + 1, minShift);
  return pts.map((p) => {
    const w = win[p.m], L = w.hi - w.lo + 1;
    return { m: p.m, t: w.lo + ((p.t - w.lo + off[p.m]) % L) };
  });
}

/**
 * Coppia (A → B): per ogni punto a di A con a in [aLo, aHi], il punto di B più vicino entro ±H (a pari distanza quello prima).
 * bT: date (giorni) di B ordinate. Restituisce i casi {a, off}.
 */
export function pairCases(aT, bT, aLo, aHi, H = 365) {
  const out = [];
  for (const a of aT) {
    if (a < aLo || a > aHi) continue;
    // ricerca binaria del primo b ≥ a
    let lo = 0, hi = bT.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (bT[mid] < a) lo = mid + 1; else hi = mid; }
    let best = null;
    for (const q of [lo - 1, lo]) {
      if (q < 0 || q >= bT.length) continue;
      const o = bT[q] - a;
      if (Math.abs(o) > H) continue;
      if (best == null || Math.abs(o) < Math.abs(best) || (Math.abs(o) === Math.abs(best) && o < best)) best = o;
    }
    if (best != null) out.push({ a, off: best });
  }
  return out;
}

export const median = (a) => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), k = s.length;
  return k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2;
};

/** p binomiale a una coda: P(X ≥ k), X ~ Bin(n, 0.5) */
export function binomUpper(k, n) {
  let p = 0;
  // log-coefficienti per stabilità
  const lf = [0];
  for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
  for (let i = k; i <= n; i++) p += Math.exp(lf[n] - lf[i] - lf[n - i] - n * Math.LN2);
  return Math.min(1, p);
}

/** Benjamini-Hochberg: p corretti (q) nello stesso ordine */
export function bh(p) {
  const m = p.length, idx = p.map((v, i) => i).sort((a, b) => p[a] - p[b]), q = new Array(m);
  let prev = 1;
  for (let r = m - 1; r >= 0; r--) { const i = idx[r]; prev = Math.min(prev, (p[i] * m) / (r + 1)); q[i] = prev; }
  return q;
}

/** Permutazione casuale (Fisher-Yates) */
export function shuffle(a, R) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
