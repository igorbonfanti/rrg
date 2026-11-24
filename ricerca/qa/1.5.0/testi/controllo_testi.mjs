// Controllo indipendente dei numeri scritti nei testi della 1.5.0 (vista 8 VIX).
// Uso: node ricerca/qa/1.5.0/testi/controllo_testi.mjs
// Dati: data/vix.json (lo stesso file dell'app). Il criterio delle soglie è riscritto qui da capo dalla descrizione
// in ricerca/vix/regimi/regimi.md (non importato da regimi.mjs); dall'app si usano solo decodifica e allineamento.
import fs from 'node:fs';
const W = new URL('../../../../', import.meta.url).pathname;
const V = await import(W + 'js/vix.js');
const D = JSON.parse(fs.readFileSync(W + 'data/vix.json'));
const vix = V.vxSeries(D.series.VIX);
const out = {};
const q = (a, p) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); if (!v.length) return null; const h = (v.length - 1) * p, lo = Math.floor(h); return lo + 1 < v.length ? v[lo] + (h - lo) * (v[lo + 1] - v[lo]) : v[lo]; };
const SUB = [['1990-2007', '1990-01-01', '2007-12-31'], ['2008-2015', '2008-01-01', '2015-12-31'], ['2016-oggi', '2016-01-01', '2099-12-31']];

for (const ix of ['SPX', 'NDX']) {
  const A = V.align(V.vxSeries(D.series[ix]), vix);
  const c = A.close, n = c.length, from = A.dates[A.vix.findIndex((v) => v != null)];
  // episodi (riscritti): sedute con VIX, prima chiusura >= X dopo 63 sedute con VIX tutte < X
  const pos = []; A.vix.forEach((v, i) => { if (v != null) pos.push(i); });
  const ret = (p, h) => (p + 1 + h < n ? (c[p + 1 + h] / c[p + 1] - 1) * 100 : null);
  const baseOf = (a, b) => { const r = []; A.dates.forEach((d, i) => { if (d >= from && d >= a && d <= b) r.push(ret(i, 252)); }); const v = r.filter((x) => x != null); return { med: q(v, 0.5), pos: 100 * v.filter((x) => x > 0).length / v.length }; };
  const base = baseOf('1900', '2099');
  const res = {};
  for (const X of [20, 25, 30, 40, 50]) {
    const st = [];
    for (let j = 63; j < pos.length; j++) { if (A.vix[pos[j]] < X) continue; let ok = true; for (let k = j - 63; k < j; k++) if (A.vix[pos[k]] >= X) { ok = false; break; } if (ok) st.push(pos[j]); }
    const r252 = st.map((p) => ret(p, 252)).filter((x) => x != null);
    const med = q(r252, 0.5), pp = 100 * r252.filter((x) => x > 0).length / r252.length;
    const passMed = med - base.med >= 5, passPos = pp - base.pos >= 15;
    const subs = SUB.map(([nm, a, b]) => { const r = st.filter((p) => A.dates[p] >= a && A.dates[p] <= b).map((p) => ret(p, 252)).filter((x) => x != null); if (!r.length) return null; const bs = baseOf(a, b); return { nm, dMed: q(r, 0.5) - bs.med, dPos: 100 * r.filter((x) => x > 0).length / r.length - bs.pos }; }).filter(Boolean);
    const agreeMed = subs.filter((s) => s.dMed > 0).length, agreePos = subs.filter((s) => s.dPos > 0).length;
    const pass = r252.length >= 8 && subs.length >= 2 && ((passMed && agreeMed >= 2) || (passPos && agreePos >= 2));
    // calo dopo (entro 252 sedute dall'ingresso), solo finestre complete
    const dd = st.filter((p) => p + 1 + 252 < n).map((p) => { let m = c[p + 1]; for (let k = p + 2; k <= p + 1 + 252; k++) m = Math.min(m, c[k]); return Math.min(0, (m / c[p + 1] - 1) * 100); });
    // risalita: l'indice ha poi superato il prezzo d'ingresso?
    const notRecovered = st.filter((p) => p + 1 < n && !c.slice(p + 2).some((x) => x > c[p + 1])).map((p) => A.dates[p]);
    res[X] = { episodi: st.length, n252: r252.length, positivi: r252.filter((x) => x > 0).length, mediana12: +med.toFixed(2), dMed: +(med - base.med).toFixed(2), dPos: +(pp - base.pos).toFixed(2), subs, pass, caloMediano: +q(dd, 0.5).toFixed(2), maiRisalito: notRecovered };
  }
  out[ix] = { base: { med: +base.med.toFixed(2), pos: +base.pos.toFixed(2) }, soglie: res, criterioPassatoDa: Object.keys(res).filter((X) => res[X].pass) };

  // scatter: sedute con VIX >= 30, ingresso il giorno dopo, 12 mesi
  const S = V.scatter(A);
  const byEp = new Map(); for (const p of S.pts) byEp.set(p.ep, (byEp.get(p.ep) || 0) + 1);
  const e30 = S.eps.filter((e) => e.ret[252] != null);
  const hi = S.pts.filter((p) => p.vix >= 50);
  const top = [...byEp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  out[ix].scatter = { sedute: S.pts.length, positive: S.pts.filter((p) => p.ret > 0).length, episodiConPunti: byEp.size, episodiCon12m: e30.length, episodiPositivi: e30.filter((e) => e.ret[252] > 0).length,
    top2: top.map(([d, k]) => [d, k, S.eps.find((e) => e.date === d)?.crisis]), top2Quota: +(100 * (top[0][1] + top[1][1]) / S.pts.length).toFixed(1), sopra50: hi.length, sopra50Episodi: [...new Set(hi.map((p) => p.ep))], open: S.open };
}

// VIX contro realizzata (S&P 500): quota di sedute dal 2005 con VIX > realizzata dei 21 giorni dopo, scarto medio
{
  const A = V.align(V.vxSeries(D.series.SPX), vix), c = A.close, n = c.length;
  const lr = c.map((x, i) => (i ? Math.log(x / c[i - 1]) : null));
  const sd = (a) => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
  let k = 0, above = 0, sum = 0; const end = '2026-10-07';
  for (let t = 0; t + 21 < n; t++) {
    if (A.dates[t] < '2005-01-01' || A.dates[t] > end || A.vix[t] == null) continue;
    const rvf = sd(lr.slice(t + 1, t + 22)) * Math.sqrt(252) * 100;
    k++; if (A.vix[t] > rvf) above++; sum += A.vix[t] - rvf;
  }
  out.volatilita = { sedute: k, quotaSopra: +(100 * above / k).toFixed(2), scartoMedio: +(sum / k).toFixed(3) };
  // premio = VIX - RVp(21); segnale = premio > 80° percentile (interp.) della storia fino al giorno (come analisi.py);
  // eventi = RVp > 90° percentile della storia, dopo 63 sedute sotto; inizi dal 2005, seguiti da evento entro 21 sedute
  const rv = V.realized(c);
  const prem = A.vix.map((v, i) => (v != null && rv[i] != null ? v - rv[i] : null));
  const expQ = (x, p) => { const s = []; return x.map((v) => { if (v == null) return null; let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] <= v) lo = m + 1; else hi = m; } s.splice(lo, 0, v); if (s.length < 2) return null; const h = (s.length - 1) * p, l = Math.floor(h), u = Math.min(l + 1, s.length - 1); return s[l] + (s[u] - s[l]) * (h - l); }); };
  const p80 = expQ(prem, 0.8), p90 = expQ(rv, 0.9);
  const sig = prem.map((v, i) => v != null && p80[i] != null && v > p80[i]);
  const ab = rv.map((v, i) => v != null && p90[i] != null && v > p90[i]);
  const valid = rv.map((v, i) => v != null && p90[i] != null);
  const s0 = A.dates.findIndex((d) => d >= '2005-01-01'), e0 = A.dates.findIndex((d) => d > end) - 1;
  const ev = []; for (let t = Math.max(s0, 63); t <= e0; t++) { if (!ab[t]) continue; let ok = true; for (let k2 = t - 63; k2 < t; k2++) if (!valid[k2] || ab[k2]) { ok = false; break; } if (ok) ev.push(t); }
  const on = []; for (let t = s0; t <= e0; t++) if (sig[t] && !sig[t - 1]) on.push(t);
  const judged = on.filter((s) => s + 21 <= e0), hit = judged.filter((s) => ev.some((e) => e > s && e <= s + 21));
  // variante dell'app: percentile come quota dei valori <= (expandingPct) e soglia >= 80
  const pp = V.expandingPct(prem); const sigApp = pp.map((x) => x != null && x >= 80);
  const onApp = []; for (let t = s0; t <= e0; t++) if (sigApp[t] && !sigApp[t - 1]) onApp.push(t);
  const hitApp = onApp.filter((s) => s + 21 <= e0 && ev.some((e) => e > s && e <= s + 21));
  out.premio = { eventi: ev.map((t) => A.dates[t]), inizi: on.length, valutabili: judged.length, seguiti: hit.length, appInizi: onApp.length, appSeguiti: hitApp.length };
  const T = V.today(A);
  out.oggi = { date: T.date, vix: T.vix, band: T.band[2], pct: +T.pct.toFixed(2), rv: +T.rv.toFixed(2), prem: +T.prem.toFixed(2), premPct: +T.premPct.toFixed(2), provisional: T.provisional, asOf: D.asOf };
}
fs.writeFileSync(new URL('./controllo_testi.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
