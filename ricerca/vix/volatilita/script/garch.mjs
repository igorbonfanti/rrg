// GARCH(1,1) in Node, senza dipendenze: la versione che servirebbe alla pipeline dell'app se il pannello lo mostrasse.
//
// Modello (uguale a analisi.py): r = mu + e (r in percentuale), s2(t) = omega + alpha·e(t-1)² + beta·s2(t-1),
// s2 iniziale = varianza (ddof=0) della finestra, errori normali. Stima per massima verosimiglianza con Nelder-Mead
// (coefficienti classici 1 / 2 / 0,5 / 0,5), vincoli omega > 0, alpha >= 0, beta >= 0, alpha + beta < 0,99999 imposti
// rendendo infinita la funzione fuori dalla regione; si riparte dal punto migliore finché la verosimiglianza non migliora più.
// Previsione: media della varianza prevista per gli orizzonti h1..h2 (formula chiusa), annualizzata con 252.
//
// Uso: import { garchFit, garchFilter, garchAvgVar, rollingGarch } from './garch.mjs'

const LOG2PI = Math.log(2 * Math.PI);

export function garchNll([mu, om, a, b], r, s0) {
  if (!(om > 0) || a < 0 || b < 0 || a + b >= 0.99999) return Infinity;
  let s2 = s0, nll = 0;
  for (let i = 0; i < r.length; i++) {
    const e = r[i] - mu;
    if (!(s2 > 0)) return Infinity;
    nll += LOG2PI + Math.log(s2) + (e * e) / s2;
    s2 = om + a * e * e + b * s2;
  }
  return 0.5 * nll;
}

export function nelderMead(f, x0, steps, { maxIter = 20000, ftol = 1e-11, xtol = 1e-10 } = {}) {
  const n = x0.length;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) { const x = x0.slice(); x[i] += steps[i]; simplex.push(x); }
  let fv = simplex.map(f);
  let it = 0;
  for (; it < maxIter; it++) {
    const ord = fv.map((v, i) => i).sort((i, j) => fv[i] - fv[j]);
    simplex = ord.map((i) => simplex[i]); fv = ord.map((i) => fv[i]);
    let dx = 0;
    for (let i = 1; i <= n; i++) for (let k = 0; k < n; k++) dx = Math.max(dx, Math.abs(simplex[i][k] - simplex[0][k]));
    if (Math.abs(fv[n] - fv[0]) <= ftol && dx <= xtol) break;
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) c[k] += simplex[i][k] / n;
    const pt = (t) => c.map((ck, k) => ck + t * (simplex[n][k] - ck));
    const xr = pt(-1), fr = f(xr);
    if (fr < fv[0]) {
      const xe = pt(-2), fe = f(xe);
      if (fe < fr) { simplex[n] = xe; fv[n] = fe; } else { simplex[n] = xr; fv[n] = fr; }
    } else if (fr < fv[n - 1]) {
      simplex[n] = xr; fv[n] = fr;
    } else {
      const xc = fr < fv[n] ? pt(-0.5) : pt(0.5), fc = f(xc);
      if (fc < Math.min(fr, fv[n])) { simplex[n] = xc; fv[n] = fc; } else {
        for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v, k) => simplex[0][k] + 0.5 * (v - simplex[0][k])); fv[i] = f(simplex[i]); }
      }
    }
  }
  let best = 0;
  for (let i = 1; i <= n; i++) if (fv[i] < fv[best]) best = i;
  return { x: simplex[best], fx: fv[best], iter: it };
}

export function garchFit(r) {
  const m = r.reduce((s, v) => s + v, 0) / r.length;
  const s0 = r.reduce((s, v) => s + (v - m) * (v - m), 0) / r.length;
  const f = (x) => garchNll(x, r, s0);
  let x = [m, 0.05 * s0, 0.10, 0.85];
  let fx = f(x);
  let steps = [0.05, 0.5 * x[1], 0.05, 0.05];
  for (let round = 0; round < 50; round++) {
    const res = nelderMead(f, x, steps);
    const better = res.fx < fx - 1e-9;
    if (res.fx <= fx) { x = res.x; fx = res.fx; }
    if (!better && round > 0) break;
    steps = [0.01, 0.2 * Math.max(x[1], 1e-6), 0.01, 0.01];
  }
  return { mu: x[0], omega: x[1], alpha: x[2], beta: x[3], nll: fx, s0 };
}

// s2[j], j = 0..n: s2[0] = s0, s2[j+1] = omega + alpha·e[j]² + beta·s2[j]; s2[n] è la previsione dopo l'ultimo r
export function garchFilter(r, { mu, omega, alpha, beta }, s0) {
  const out = new Float64Array(r.length + 1);
  out[0] = s0;
  for (let j = 0; j < r.length; j++) { const e = r[j] - mu; out[j + 1] = omega + alpha * e * e + beta * out[j]; }
  return out;
}

export function garchAvgVar(s1, { omega, alpha, beta }, h1, h2) {
  const p = alpha + beta, vl = omega / (1 - p);
  return vl + ((s1 - vl) * (p ** (h1 - 1) - p ** h2)) / (1 - p) / (h2 - h1 + 1);
}

// r[i] = rendimento dal giorno i-1 al giorno i (r[0] = NaN). Stima l'ultima seduta di ogni mese su 2520 rendimenti,
// parametri usati fino al giorno prima della fine del mese successivo.
export function rollingGarch(dates, r, W = 2520) {
  const n = dates.length;
  const g21 = new Float64Array(n).fill(NaN), g2263 = new Float64Array(n).fill(NaN), s1 = new Float64Array(n).fill(NaN);
  const starts = [];
  for (let i = 0; i < n - 1; i++) if (dates[i].slice(0, 7) !== dates[i + 1].slice(0, 7) && i - W + 1 >= 1) starts.push(i);
  const params = [];
  starts.forEach((i, k) => {
    const w0 = i - W + 1;
    const p = garchFit(r.slice(w0, i + 1));
    const end = k + 1 < starts.length ? starts[k + 1] - 1 : n - 1;
    const s2 = garchFilter(r.slice(w0, end + 1), p, p.s0);
    for (let t = i; t <= end; t++) {
      const one = s2[t - w0 + 1];
      s1[t] = one;
      g21[t] = Math.sqrt(252 * garchAvgVar(one, p, 1, 21));
      g2263[t] = Math.sqrt(252 * garchAvgVar(one, p, 22, 63));
    }
    params.push({ stima: dates[i], ...p });
  });
  return { g21, g2263, s1, params };
}
