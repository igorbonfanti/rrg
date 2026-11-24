#!/usr/bin/env node
/*
 * potenza.mjs — i test sanno trovare un anticipo vero e sanno rifiutare un legame che non c'è? Stesse funzioni di
 * backtest.mjs (lib.mjs) applicate a serie sintetiche:
 *  - criterio 1: (a) «crack» = WTI con le date spostate indietro di 60 o 120 giorni (anticipo noto), esatto o con rumore;
 *    controllo: spostato in avanti di 60 giorni (il «crack» segue); (b) 200 passeggiate casuali indipendenti dal WTI:
 *    deve passare raramente (quota di p < 0,05 vicina al 5%).
 *  - criterio 2: (a) «crack» con un picco 90-120 giorni prima di ogni conferma di un calo ≥ 10% dell'S&P: deve passare;
 *    (b) 200 passeggiate casuali: quota di serie che passano il criterio così come è scritto (nessuna soglia statistica).
 *  - criterio 3: (a) y sintetica = 0,3 × WTI + crack + rumore sulle date vere: deve passare; (b) 200 crack casuali con le
 *    y vere (XLE/SPY, VLO/^GSPC senza la scissione): non deve passare.
 * Scrive la chiave «potenza» in ../risultati.json (lanciare dopo backtest.mjs).
 * Uso: node ricerca/crack-spread/script/potenza.mjs [--veloce]
 */
import fs from 'node:fs';
import path from 'node:path';
import * as L from './lib.mjs';

const FAST = process.argv.includes('--veloce');
const NS = FAST ? 40 : 200, NN = FAST ? 300 : 1000;
const { r, addDays, HALVES } = L;
const crack = L.crackSeries(), wti = L.wtiSeries();
const spx = (() => { const y = L.readYahoo('^GSPC'); return { dates: y.dates, close: y.close }; })();
const R = L.rng(424242);
const gauss = () => { let u = 0, v = 0; while (u === 0) u = R(); while (v === 0) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
// passeggiata casuale nei logaritmi sulle date del crack (salti di calendario: varianza proporzionale ai giorni)
function walk(dates, sd = 0.03, x0 = 10) {
  const out = [x0];
  for (let i = 1; i < dates.length; i++) out.push(out[i - 1] * Math.exp(sd * Math.sqrt(Math.min(L.dayDiff(dates[i - 1], dates[i]), 5)) * gauss()));
  return out;
}
const P = { criterio1: {}, criterio2: {}, criterio3: {} };

// ---------------------------------------------------------------- criterio 1
{
  const W = { dates: wti.dates, close: wti.close };
  // (a) anticipo noto: il «crack» è il WTI spostato indietro di `lead` giorni di calendario (date spostate esattamente),
  //     con o senza un rumore AR(1) nei logaritmi (deviazione stazionaria sdN); lead < 0 = il «crack» segue il WTI
  const shifted = (lead, sdN) => {
    let e = 0; const phi = 0.9, sd = sdN * Math.sqrt(1 - phi * phi);
    return { dates: wti.dates.map((d) => addDays(d, -lead)), close: wti.close.map((v) => { e = phi * e + sd * gauss(); return v * Math.exp(e); }) };
  };
  for (const lead of [60, 120, -60]) for (const X of [20, 30]) {
    const t = L.test1(W, shifted(lead, 0), X, { nNull: NN, seed: 5 });
    P.criterio1[`esatto_${lead}g_X${X}`] = { tutto: t.tutto, '1986-2005': t['1986-2005'], '2006-oggi': t['2006-oggi'], passa: t.passa };
  }
  for (const lead of [60, 120]) for (const sdN of [0.02, 0.05]) for (const X of [20, 30]) {
    const K = FAST ? 10 : 50; let pass = 0, p05 = 0, q = 0;
    for (let s = 0; s < K; s++) { const t = L.test1(W, shifted(lead, sdN), X, { nNull: 300, seed: s + 9 }); if (t.passa) pass++; if (t.tutto.p < 0.05) p05++; q += t.tutto.quota_prima / K; }
    P.criterio1[`rumore_${sdN * 100}pct_${lead}g_X${X}`] = { serie: K, passano_il_criterio: pass, p_sotto_005_tutto: p05, quota_prima_media: r(q) };
  }
  // (b) serie indipendenti
  for (const X of [20, 30]) {
    let pass = 0, p05 = 0, half05 = 0, q = 0;
    for (let s = 0; s < NS; s++) {
      const syn = { dates: crack.dates, close: walk(crack.dates) };
      const t = L.test1(W, syn, X, { nNull: Math.min(NN, 500), seed: s + 1 });
      if (t.passa) pass++;
      if (t.tutto.p < 0.05) p05++;
      if (t['1986-2005'].p < 0.05 || t['2006-oggi'].p < 0.05) half05++;
      q += t.tutto.quota_prima / NS;
    }
    P.criterio1[`indipendenti_X${X}`] = { serie: NS, passano_il_criterio: pass, p_sotto_005_tutto: p05, p_sotto_005_in_almeno_una_meta: half05, quota_prima_media: r(q) };
  }
}

// ---------------------------------------------------------------- criterio 2
{
  const ev = L.zigzag(spx, 10), lastObs = spx.dates.at(-1);
  const ew = L.extremeDays(wti);
  const run = (syn) => {
    const ec = L.extremeDays(syn);
    const from = [ec.firstEligible, ew.firstEligible].sort().at(-1), o = { from, lastObs };
    const c = L.summEp(L.episodes(syn.dates, ec.pct.map((x, i) => x || ec.drop[i]), ev, o));
    const w = L.summEp(L.episodes(wti.dates, ew.pct.map((x, i) => x || ew.drop[i]), ev, o));
    const b = L.baseRate(spx, ev, o);
    const meta = Object.keys(HALVES).map((h) => c[h].episodi >= 8 && c[h].quota > b[h].quota && c[h].quota > w[h].quota);
    return { c, w, b, passa: meta.every(Boolean), sopra_base_entrambe: Object.keys(HALVES).every((h) => c[h].quota > b[h].quota) };
  };
  // (a) picco 90-120 giorni prima di ogni conferma
  const base = walk(crack.dates, 0.01);
  const conf = ev.map((x) => x.confirm);
  const lead = { dates: crack.dates, close: crack.dates.map((d, i) => (conf.some((c) => d >= addDays(c, -120) && d <= addDays(c, -90)) ? base[i] * 5 : base[i])) };
  const a = run(lead);
  P.criterio2.picco_prima_dei_cali = { crack: a.c, wti: a.w, base: a.b, passa: a.passa };
  // (b) indipendenti
  let pass = 0, sb = 0, diff = 0;
  for (let s = 0; s < NS; s++) {
    const x = run({ dates: crack.dates, close: walk(crack.dates) });
    if (x.passa) pass++;
    if (x.sopra_base_entrambe) sb++;
    diff += (x.c.tutto.quota - x.b.tutto.quota) / NS;
  }
  P.criterio2.indipendenti = { serie: NS, passano_il_criterio: pass, sopra_la_base_in_entrambe_le_meta: sb, scarto_medio_dalla_base_punti: r(diff) };
}

// ---------------------------------------------------------------- criterio 3
{
  const Y = Object.fromEntries(['XLE', 'SPY', 'VLO'].map((s) => [s, L.readYahoo(s)]));
  const g = L.readYahoo('^GSPC');
  const tg = { XLE_SPY: [{ dates: Y.XLE.dates, v: Y.XLE.adjclose }, { dates: Y.SPY.dates, v: Y.SPY.adjclose }, null], VLO_GSPC_senza_scissione: [{ dates: Y.VLO.dates, v: Y.VLO.close }, { dates: g.dates, v: g.close }, '1997-08-01'] };
  // (a) y sintetica con un effetto noto del crack
  for (const [k, [n, d, skip]] of Object.entries(tg)) {
    const rows = L.panel(n, d, crack, { skip });
    const sdW = Math.sqrt(rows.reduce((s, x) => s + x.wti ** 2, 0) / rows.length), sdC = Math.sqrt(rows.reduce((s, x) => s + x.crack ** 2, 0) / rows.length);
    const syn = rows.map((x) => ({ ...x, y: 0.3 * x.wti + (0.3 * sdW / sdC) * x.crack + 0.3 * sdW * 1.2 * gauss() }));
    const t = L.test3(syn);
    P.criterio3[`effetto_noto_${k}`] = { fuori_campione: t.fuori_campione, passa: t.passa };
  }
  // (b) crack indipendente, y vere
  for (const [k, [n, d, skip]] of Object.entries(tg)) {
    let pass = 0, inc = [];
    for (let s = 0; s < NS; s++) {
      const syn = { dates: crack.dates, close: walk(crack.dates).map((x) => x * 2), wti: crack.wti };
      const t = L.test3(L.panel(n, d, syn, { skip }));
      if (t.passa) pass++;
      inc.push(...Object.values(t.fuori_campione).map((v) => v.aumento));
    }
    inc.sort((a, b) => a - b);
    P.criterio3[`indipendenti_${k}`] = { serie: NS, passano_il_criterio: pass, aumento_oos_mediano: r(inc[inc.length >> 1], 4), aumento_oos_95: r(inc[Math.floor(inc.length * 0.95)], 4) };
  }
}

const F = path.join(L.CACHE, '..', 'risultati.json');
const RES = JSON.parse(fs.readFileSync(F, 'utf8'));
RES.potenza = P;
fs.writeFileSync(F, JSON.stringify(RES, null, 1));
console.log(JSON.stringify(P, null, 1));
