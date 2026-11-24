// Ricalcolo indipendente in Node dei numeri principali di analisi.py e confronto GARCH Node contro Python.
//
// Cosa rifà da zero, dagli stessi file di ricerca/vix/cache/ (senza usare le serie calcolate da Python):
//  - rendimenti log, RVp e RVf (21 sedute, ddof=1, ×√252), EWMA 0,94;
//  - GARCH(1,1) con garch.mjs (Nelder-Mead) e ristima mensile su 2520 rendimenti;
//  - tabella RMSE / MAE / correlazione per sottoperiodo (implicita, RVp, EWMA, GARCH Node) e conteggio del criterio;
//  - eventi (RVp sopra il 90° percentile, dopo 63 sedute sotto), eventi preceduti dai segnali P1, P2 e GARCH livello,
//    inizi di segnale seguiti da un evento;
//  - lettura «oggi».
// Poi confronta con ricerca/vix/volatilita/risultati.json e con le serie Python (cache/volatilita_serie_*.json).
// Tolleranza dichiarata (decisa prima): previsione GARCH 21g Node e Python entro 0,05 punti di volatilità annua in
// tutte le sedute fuori campione; metriche entro 0,01; eventi e conteggi identici.
//
// Uso (dopo analisi.py): node ricerca/vix/volatilita/script/confronto_node.mjs → scrive ricerca/vix/volatilita/confronto_node.json
import fs from 'node:fs';
import { rollingGarch } from './garch.mjs';

const CACHE = new URL('../../cache/', import.meta.url);
const ROOT = new URL('../', import.meta.url);
const load = (name) => JSON.parse(fs.readFileSync(new URL(name.replace(/[^A-Za-z0-9]/g, '_') + '.json', CACHE), 'utf8'));
const RES = JSON.parse(fs.readFileSync(new URL('risultati.json', ROOT), 'utf8'));
const TOL_G = 0.05, TOL_M = 0.01;

const std = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
function pctSeries(x, q) {
  const s = [], out = new Float64Array(x.length).fill(NaN);
  x.forEach((v, t) => {
    if (!Number.isFinite(v)) return;
    let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] <= v) lo = m + 1; else hi = m; }
    s.splice(lo, 0, v);
    if (s.length < 2) return;
    const pos = (s.length - 1) * q, l = Math.floor(pos), h = Math.min(l + 1, s.length - 1);
    out[t] = s[l] + (s[h] - s[l]) * (pos - l);
  });
  return out;
}
const sig = (x, q) => { const p = pctSeries(x, q); return Array.from(x, (v, i) => Number.isFinite(v) && Number.isFinite(p[i]) && v > p[i]); };
function corr(a, b) {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
}

const out = { tolleranze: { garch21_punti: TOL_G, metriche: TOL_M }, indici: {} };
let allOk = true;
for (const [key, cfg] of Object.entries({ sp500: { px: '^GSPC', iv: 'VIXCLS', oos: '2005-01-01' }, ndx: { px: '^NDX', iv: 'VXNCLS', oos: '2008-01-01' } })) {
  const t0 = Date.now();
  const px = load(cfg.px).rows, ivm = new Map(load(cfg.iv).rows);
  const dates = px.map((r) => r[0]), n = dates.length;
  const r = new Float64Array(n).fill(NaN);
  for (let i = 1; i < n; i++) r[i] = Math.log(px[i][1] / px[i - 1][1]) * 100;
  const iv = dates.map((d) => (ivm.has(d) ? ivm.get(d) : NaN));
  const rvp = new Float64Array(n).fill(NaN), rvf = new Float64Array(n).fill(NaN), ew = new Float64Array(n).fill(NaN);
  for (let t = 0; t < n; t++) {
    if (t - 20 >= 1) rvp[t] = std(Array.from(r.slice(t - 20, t + 1))) * Math.sqrt(252);
    if (t + 21 <= n - 1) rvf[t] = std(Array.from(r.slice(t + 1, t + 22))) * Math.sqrt(252);
  }
  let s2 = null;
  for (let t = 1; t < n; t++) { s2 = s2 === null ? r[t] ** 2 : 0.94 * s2 + 0.06 * r[t] ** 2; ew[t] = Math.sqrt(252 * s2); }
  const G = rollingGarch(dates, r);
  const py = JSON.parse(fs.readFileSync(new URL(`volatilita_serie_${key}.json`, CACHE), 'utf8'));
  const R = RES[key];
  const o = {};

  // GARCH Node contro Python
  const oosIdx = [...dates.keys()].filter((t) => dates[t] >= cfg.oos);
  let maxd = 0, maxdAll = 0, dAt = null; const ds = [];
  for (let t = 0; t < n; t++) {
    if (!Number.isFinite(G.g21[t]) || py.g21[t] == null) continue;
    const d = Math.abs(G.g21[t] - py.g21[t]); maxdAll = Math.max(maxdAll, d);
    if (dates[t] >= cfg.oos) { ds.push(d); if (d > maxd) { maxd = d; dAt = dates[t]; } }
  }
  ds.sort((a, b) => a - b);
  const pp = py.params, np_ = G.params;
  let nodeMeglio = 0, pyMeglio = 0, maxDa = 0, maxDb = 0, maxDnll = 0;
  np_.forEach((p, i) => {
    const q = pp[i]; if (q.stima !== p.stima) throw new Error('date di stima diverse');
    const dn = p.nll - q.nll; maxDnll = Math.max(maxDnll, Math.abs(dn));
    if (dn < -1e-6) nodeMeglio++; if (dn > 1e-6) pyMeglio++;
    maxDa = Math.max(maxDa, Math.abs(p.alpha - q.alpha)); maxDb = Math.max(maxDb, Math.abs(p.beta - q.beta));
  });
  const g2263d = Math.max(...oosIdx.filter((t) => py.g2263[t] != null).map((t) => Math.abs(G.g2263[t] - py.g2263[t])));
  o.garch = {
    stime: np_.length, sedute_confrontate_fuori_campione: ds.length,
    diff_max_garch21_fuori_campione: +maxd.toFixed(5), data_diff_max: dAt, diff_p99_garch21: +ds[Math.floor(ds.length * 0.99)].toFixed(5),
    diff_mediana_garch21: +ds[Math.floor(ds.length / 2)].toFixed(6), diff_max_garch21_tutte: +maxdAll.toFixed(5),
    diff_max_garch22_63_fuori_campione: +g2263d.toFixed(5),
    diff_max_alpha: +maxDa.toFixed(5), diff_max_beta: +maxDb.toFixed(5), diff_max_nll: +maxDnll.toFixed(6),
    stime_con_nll_node_migliore: nodeMeglio, stime_con_nll_python_migliore: pyMeglio,
    entro_tolleranza: maxd <= TOL_G,
  };
  allOk = allOk && maxd <= TOL_G;

  // serie di base contro Python
  const maxDiff = (a, b) => Math.max(...[...a.keys()].filter((t) => Number.isFinite(a[t]) && b[t] != null).map((t) => Math.abs(a[t] - b[t])));
  o.serie_di_base_diff_max = { RVp: maxDiff(rvp, py.rvp), RVf: maxDiff(rvf, py.rvf), EWMA: maxDiff(ew, py.ewma) };

  // tabella delle metriche, con il GARCH Node
  const preds = { implicita: iv, RVp: rvp, EWMA: ew, GARCH: G.g21 };
  const ok = oosIdx.filter((t) => Object.values(preds).every((v) => Number.isFinite(v[t])) && Number.isFinite(rvf[t]));
  const sub = [['fino al 2012', null, '2012-12-31'], ['2013-2019', '2013-01-01', '2019-12-31'], ['2020-oggi', '2020-01-01', null]];
  o.metriche = {}; let wins = 0, maxMd = 0;
  for (const [nm, a, b] of sub) {
    const sel = ok.filter((t) => (a === null || dates[t] >= a) && (b === null || dates[t] <= b));
    const y = sel.map((t) => rvf[t]);
    o.metriche[nm] = { n: sel.length };
    for (const [k, v] of Object.entries(preds)) {
      const f = sel.map((t) => v[t]);
      const rmse = Math.sqrt(f.reduce((s, x, i) => s + (x - y[i]) ** 2, 0) / y.length);
      const mae = f.reduce((s, x, i) => s + Math.abs(x - y[i]), 0) / y.length;
      const c = corr(f, y);
      o.metriche[nm][k] = { rmse: +rmse.toFixed(4), mae: +mae.toFixed(4), corr: +c.toFixed(4) };
      const P = R.previsione.sottoperiodi[nm][k];
      maxMd = Math.max(maxMd, Math.abs(rmse - P.rmse), Math.abs(mae - P.mae), Math.abs(c - P.corr));
    }
    const m = o.metriche[nm];
    if (m.GARCH.rmse < m.implicita.rmse && m.GARCH.rmse < m.EWMA.rmse) wins++;
  }
  o.criterio_sottoperiodi_vinti = wins;
  o.criterio_uguale_a_python = wins === R.previsione.garch_rmse_migliore_di_implicita_e_ewma_nei_sottoperiodi;
  o.metriche_diff_max_da_python = +maxMd.toFixed(5);
  allOk = allOk && o.criterio_uguale_a_python && maxMd <= TOL_M;

  // eventi
  const p90 = pctSeries(rvp, 0.9);
  const start = oosIdx[0];
  const above = Array.from(rvp, (v, i) => Number.isFinite(v) && Number.isFinite(p90[i]) && v > p90[i]);
  const ev = [];
  for (let t = Math.max(start, 63); t < n; t++) {
    if (!above[t]) continue;
    let okw = true; for (let j = t - 63; j < t; j++) if (above[j] || !Number.isFinite(rvp[j]) || !Number.isFinite(p90[j])) { okw = false; break; }
    if (okw) ev.push(t);
  }
  const evPy = R.eventi.lista.map((e) => e.data);
  o.eventi = ev.map((t) => dates[t]);
  o.eventi_uguali_a_python = JSON.stringify(o.eventi) === JSON.stringify(evPy);
  allOk = allOk && o.eventi_uguali_a_python;
  const prem = { P1_impl_meno_GARCH: iv.map((v, t) => v - G.g21[t]), P2_impl_meno_RVp: iv.map((v, t) => v - rvp[t]), GARCH_livello: Array.from(G.g21) };
  o.segnali = {};
  for (const [nm, x] of Object.entries(prem)) {
    const s = sig(x, 0.8);
    const prec = ev.filter((e) => s.slice(e - 10, e).some(Boolean));
    const lead = prec.map((e) => 10 - s.slice(e - 10, e).indexOf(true)).sort((a, b) => a - b);
    const med = lead.length % 2 ? lead[(lead.length - 1) / 2] : (lead[lead.length / 2 - 1] + lead[lead.length / 2]) / 2;
    const ons = []; for (let t = start; t < n; t++) if (s[t] && !s[t - 1]) ons.push(t);
    const judged = ons.filter((t) => t + 21 <= n - 1);
    const hit = judged.filter((t) => ev.some((e) => e > t && e <= t + 21));
    let base = 0; for (let t = start; t < n; t++) base += s[t] ? 1 : 0; base /= n - start;
    const P = R.eventi.misure[nm];
    o.segnali[nm] = { preceduti: prec.length, anticipo_mediano: med, base_giornaliera: +base.toFixed(4), inizi_valutabili: judged.length, inizi_seguiti: hit.length,
      uguale_a_python: prec.length === P.preceduti && med === P.anticipo_mediano && Math.abs(base - P.base_giornaliera) < 1e-4 && judged.length === P.inizi_valutabili && hit.length === P.inizi_seguiti_da_evento };
    allOk = allOk && o.segnali[nm].uguale_a_python;
  }
  // oggi (ultimo giorno con implicita FRED)
  const tf = Math.max(...[...dates.keys()].filter((t) => Number.isFinite(iv[t])));
  const T = R.oggi.fred;
  o.oggi = { data: dates[tf], implicita: iv[tf], RVp: +rvp[tf].toFixed(2), GARCH_21g: +G.g21[tf].toFixed(2), P1: +(iv[tf] - G.g21[tf]).toFixed(2), P2: +(iv[tf] - rvp[tf]).toFixed(2) };
  o.oggi.uguale_a_python = dates[tf] === T.data && Math.abs(o.oggi.RVp - T.RVp) <= 0.01 && Math.abs(o.oggi.GARCH_21g - T.GARCH_21g) <= TOL_G;
  allOk = allOk && o.oggi.uguale_a_python;
  o.secondi_totali = (Date.now() - t0) / 1000;
  out.indici[key] = o;
  console.log(key, JSON.stringify(o.garch), 'metriche', o.metriche_diff_max_da_python, 'eventi', o.eventi_uguali_a_python, 'segnali', Object.values(o.segnali).map((s) => s.uguale_a_python).join(','), 'oggi', o.oggi.uguale_a_python, o.secondi_totali + ' s');
}
out.tutto_coincide = allOk;
fs.writeFileSync(new URL('confronto_node.json', ROOT), JSON.stringify(out, null, 1));
console.log('tutto coincide:', allOk);
