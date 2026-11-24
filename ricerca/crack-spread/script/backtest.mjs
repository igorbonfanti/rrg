#!/usr/bin/env node
/*
 * backtest.mjs — crack spread 3-2-1 accanto al petrolio: dati, tre criteri di domanda.md, varianti di controllo, «oggi».
 * Regole: ../sintesi.md, sezione «Interpretazioni decise prima dei risultati». Funzioni in lib.mjs (massimi di ciclo da
 * js/peaks.js). Dati in ../cache (scarica.mjs). Scrive ../risultati.json e ../cache/pannelli.json (per verifica.py).
 * Uso: node ricerca/crack-spread/script/backtest.mjs [--veloce]   (--veloce: meno spostamenti casuali, solo per prove)
 */
import fs from 'node:fs';
import path from 'node:path';
import * as L from './lib.mjs';

const { r, addDays, dayDiff, halfOf, HALVES } = L;
const FAST = process.argv.includes('--veloce');
const N1 = FAST ? 1000 : 10000, N2 = FAST ? 300 : 2000;
const OUT = path.join(L.CACHE, '..');
const R = { creato: new Date().toISOString().slice(0, 10), note: 'Regole in sintesi.md («Interpretazioni decise prima dei risultati»).' };

// ------------------------------------------------------------ dati
const crack = L.crackSeries();
const wti = L.wtiSeries();
const spx = (() => { const y = L.readYahoo('^GSPC'); return { dates: y.dates, close: y.close }; })();
const Y = Object.fromEntries(['SPY', 'XLE', 'VLO', 'MPC', 'PSX', 'RB=F', 'HO=F', 'CL=F'].map((s) => [s, L.readYahoo(s)]));

const cov = {};
for (const d of crack.dates) cov[d.slice(0, 4)] = (cov[d.slice(0, 4)] || 0) + 1;
const fredInfo = Object.fromEntries(['DCOILWTICO', 'DGASNYH', 'DGASUSGULF', 'DHOILNYH', 'DDFUELNYH', 'DDFUELUSGULF', 'DRGASLA'].map((id) => {
  const m = L.readFred(id), ks = [...m.keys()].sort();
  const rows = fs.readFileSync(path.join(L.CACHE, `fred_${id}.csv`), 'utf8').trim().split(/\r?\n/).length - 1;
  return [id, { da: ks[0], a: ks.at(-1), righe: rows, valori: m.size, vuoti: rows - m.size }];
}));
R.dati = {
  fred: fredInfo,
  yahoo: Object.fromEntries([['^GSPC', spx], ...Object.entries(Y)].map(([k, v]) => [k, { da: v.dates[0], a: v.dates.at(-1), sedute: v.dates.length }])),
  crack: { da: crack.dates[0], a: crack.dates.at(-1), giorni: crack.dates.length, giorni_per_anno: cov,
    negativi: crack.dates.filter((d, i) => crack.close[i] < 0).map((d) => `${d} ${r(crack.close[crack.dates.indexOf(d)], 2)}`),
    minimo: (() => { const i = crack.close.indexOf(Math.min(...crack.close)); return [crack.dates[i], r(crack.close[i], 2)]; })(),
    massimo: (() => { const i = crack.close.indexOf(Math.max(...crack.close)); return [crack.dates[i], r(crack.close[i], 2)]; })(),
    buco_max_giorni: (() => { let m = 0, at = null; for (let i = 1; i < crack.dates.length; i++) { const g = dayDiff(crack.dates[i - 1], crack.dates[i]); if (g > m) { m = g; at = crack.dates[i - 1]; } } return [m, at]; })() },
  wti_tolto: '2020-04-20 (−36,98 $)',
};

// confronto con il crack dei future Yahoo (solo controllo)
{
  const m = (s) => new Map(Y[s].dates.map((d, i) => [d, Y[s].close[i]]));
  const RB = m('RB=F'), HO = m('HO=F'), CL = m('CL=F');
  const S = new Map(crack.dates.map((d, i) => [d, crack.close[i]]));
  const seg = { '11/2000-2005 (RB=F di Yahoo e HO gasolio)': ['2000-01-01', '2005-12-31'], '01/2006-04/2013 (RB e HO gasolio)': ['2006-01-01', '2013-04-30'], '05/2013-oggi (RBOB e HO = ULSD)': ['2013-05-01', '2100-01-01'], tutto: ['2000-01-01', '2100-01-01'] };
  const common = [...S.keys()].filter((d) => RB.has(d) && HO.has(d) && CL.has(d) && CL.get(d) > 0 && d !== '2020-04-20');
  const fut = new Map(common.map((d) => [d, 14 * (2 * RB.get(d) + HO.get(d)) - CL.get(d)]));
  const corr = (a, b) => { const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
  const med = (v) => { const s = [...v].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  R.future = { nota: 'crack dei future = 14 × (2 × RB=F + HO=F) − CL=F (contratto più vicino di Yahoo, chiusure), nei giorni comuni con il crack spot' };
  for (const [k, [a, b]] of Object.entries(seg)) {
    const ds = common.filter((d) => d >= a && d <= b);
    const sp = ds.map((d) => S.get(d)), fu = ds.map((d) => fut.get(d)), diff = ds.map((d, i) => fu[i] - sp[i]);
    // variazioni a 3 mesi sulle date comuni
    const dv = [], fv = [];
    for (let i = 0; i < ds.length; i++) { const j = L.lag3m(ds, i); if (j >= 0) { dv.push(sp[i] - sp[j]); fv.push(fu[i] - fu[j]); } }
    const mean = diff.reduce((x, y) => x + y, 0) / diff.length;
    R.future[k] = { giorni: ds.length, da: ds[0], a: ds.at(-1), scarto_medio_fut_meno_spot: r(mean, 2), scarto_mediano: r(med(diff), 2), dev_std_scarto: r(Math.sqrt(diff.reduce((x, y) => x + (y - mean) ** 2, 0) / (diff.length - 1)), 2), corr_livelli: r(corr(sp, fu), 3), corr_variazioni_3m: r(corr(dv, fv), 3),
      scarto_massimo: (() => { let k = 0; for (let i = 1; i < diff.length; i++) if (Math.abs(diff[i]) > Math.abs(diff[k])) k = i; return [ds[k], r(diff[k], 2)]; })() };
  }
  // WTI spot contro CL=F (controllo della prima fonte)
  const W = new Map(wti.dates.map((d, i) => [d, wti.close[i]]));
  const dw = common.filter((d) => W.has(d));
  R.future.wti_spot_vs_CL = { giorni: dw.length, scarto_medio: r(dw.reduce((s, d) => s + CL.get(d) - W.get(d), 0) / dw.length, 3), corr: r(corr(dw.map((d) => W.get(d)), dw.map((d) => CL.get(d))), 4) };
  R.future._ultimo = (() => { const ds = [...Y['RB=F'].dates].filter((d) => HO.has(d) && CL.has(d) && RB.has(d)); const d = ds.at(-1); return { data: d, crack_future: r(14 * (2 * RB.get(d) + HO.get(d)) - CL.get(d), 2), RB: RB.get(d), HO: HO.get(d), CL: CL.get(d) }; })();
}

// ------------------------------------------------------------ criterio 1
const VARIANTS = {
  principale: () => crack,
  benzina_gulf: () => L.crackSeries({ gas: 'DGASUSGULF' }),
  ulsd_dal_2006: () => L.crackSeries({ ulsdFrom: '2006-06-14' }),
  riempito_5_giorni: () => L.crackSeries({ fill: 5 }),
};
const VS = Object.fromEntries(Object.entries(VARIANTS).map(([k, f]) => [k, f()]));
R.criterio1 = {};
for (const X of [20, 30]) {
  const t = L.test1(wti, crack, X, { nNull: N1, seed: X });
  R.criterio1[`X${X}`] = t;
}
R.criterio1.passa = R.criterio1.X20.passa && R.criterio1.X30.passa;
R.criterio1.varianti = {};
for (const [k, s] of Object.entries(VS)) {
  if (k === 'principale') continue;
  for (const X of [20, 30]) { const t = L.test1(wti, s, X, { nNull: N2, seed: X }); delete t.casi; R.criterio1.varianti[`${k}_X${X}`] = t; }
}
// controllo con il confronto stretto (prima = scarto < 0)
R.criterio1.scarto_negativo = Object.fromEntries([20, 30].map((X) => [`X${X}`, Object.fromEntries(['tutto', ...Object.keys(HALVES)].map((h) => { const cs = R.criterio1[`X${X}`].casi.filter((c) => h === 'tutto' || halfOf(c.wti) === h); return [h, `${cs.filter((c) => c.offset != null && c.offset < 0).length}/${cs.length}`]; }))]));

// ------------------------------------------------------------ criterio 2
const ev = L.zigzag(spx, 10);
const lastObs = spx.dates.at(-1);
function rule2(s, opt = {}) { return L.extremeDays(s, opt); }
function c2(crk, opt = {}) {
  const ec = rule2(crk, opt), ew = rule2(wti, opt);
  const from = [ec.firstEligible, ew.firstEligible].sort().at(-1);
  const o = { from, lastObs };
  const or = (e) => e.pct.map((x, i) => x || e.drop[i]);
  const sig = { crack: or(ec), crack_percentile: ec.pct, crack_calo: ec.drop, wti: or(ew), wti_percentile: ew.pct, wti_calo: ew.drop };
  const dates = { crack: crk.dates, wti: wti.dates };
  const res = { dal: from, base: L.baseRate(spx, ev, o) };
  const eps = {};
  for (const [k, v] of Object.entries(sig)) {
    const ds = dates[k.startsWith('crack') ? 'crack' : 'wti'];
    eps[k] = L.episodes(ds, v, ev, o);
    res[k] = L.summEp(eps[k]);
    res[k].quota_giorni_in_segnale = r((100 * v.filter((x, i) => x && ds[i] >= from).length) / ds.filter((d) => d >= from).length);
  }
  // stessa regola sul WTI ma solo nei giorni in cui c'è il crack (controllo)
  {
    const W = new Map(wti.dates.map((d, i) => [d, i]));
    const ds = crk.dates.filter((d) => W.has(d)), sv = ds.map((d) => sig.wti[W.get(d)]);
    res.wti_nei_giorni_del_crack = L.summEp(L.episodes(ds, sv, ev, o));
  }
  return { res, eps, sig, o };
}
const C2 = c2(crack);
R.criterio2 = { regola: 'crack sopra il 90° percentile della sua storia (≥ 250 valori) o calo > 40% in 3 mesi', ...C2.res };
R.criterio2.episodi_sp500 = ev.map((e) => `${e.peak}→${e.trough} ${e.calo}% (conferma ${e.confirm}${e.end ? ', chiuso ' + e.end : ', aperto'})`);
R.criterio2.episodi_crack = C2.eps.crack.map((e) => `${e.date}${e.hit ? ' → conferma ' + e.hit : ' → nessun calo ≥ 10% entro 12 mesi'}`);
R.criterio2.episodi_wti = C2.eps.wti.map((e) => `${e.date}${e.hit ? ' → conferma ' + e.hit : ' → nessun calo ≥ 10% entro 12 mesi'}`);
R.criterio2.p_spostamenti_solo_info = { crack: L.shiftP(crack.dates, C2.sig.crack, ev, C2.o, C2.res.crack, { nNull: N2, seed: 11 }), wti: L.shiftP(wti.dates, C2.sig.wti, ev, C2.o, C2.res.wti, { nNull: N2, seed: 12 }) };
R.criterio2.passa_meta = Object.fromEntries(Object.keys(HALVES).map((h) => {
  const c = C2.res.crack[h], b = C2.res.base[h], w = C2.res.wti[h];
  return [h, { episodi_ok: c.episodi >= 8, sopra_base: c.quota > b.quota, sopra_wti: w.quota == null || c.quota > w.quota, passa: c.episodi >= 8 && c.quota > b.quota && (w.quota == null || c.quota > w.quota) }];
}));
R.criterio2.passa = Object.values(R.criterio2.passa_meta).every((v) => v.passa);
R.criterio2.varianti = {};
for (const [k, s] of Object.entries(VS)) if (k !== 'principale') { const x = c2(s).res; R.criterio2.varianti[k] = { crack: x.crack, wti: x.wti, base: x.base }; }
for (const p of [85, 95]) { const x = c2(crack, { p }).res; R.criterio2.varianti[`percentile_${p}`] = { crack: x.crack, wti: x.wti, base: x.base }; }

// ------------------------------------------------------------ criterio 3
const px = (s, adj) => ({ dates: Y[s].dates, v: adj ? Y[s].adjclose : Y[s].close });
const gspc = { dates: spx.dates, v: spx.close };
// paniere raffinerie VLO, MPC, PSX: indice a pesi uguali dei rendimenti giornalieri, dalla prima seduta comune
const basket = (() => {
  const S = ['VLO', 'MPC', 'PSX'].map((s) => new Map(Y[s].dates.map((d, i) => [d, Y[s].close[i]])));
  const ds = Y.PSX.dates.filter((d) => S.every((m) => m.has(d)));
  const v = [100];
  for (let i = 1; i < ds.length; i++) v.push(v[i - 1] * (1 + S.reduce((a, m) => a + m.get(ds[i]) / m.get(ds[i - 1]) - 1, 0) / 3));
  return { dates: ds, v };
})();
const PANELS = {
  XLE_SPY: L.panel(px('XLE', true), px('SPY', true), crack),
  VLO_GSPC: L.panel(px('VLO', false), gspc, crack),
};
// Correzione dei dati trovata DOPO il primo calcolo (dichiarata in sintesi.md): la chiusura VLO di Yahoo (solo split) scende
// del 33% il 01/08/1997, giorno della scissione di Valero (la chiusura rettificata per i dividendi non ha il salto).
// Correzione minima: si tolgono le finestre a 3 mesi che contengono quel giorno. Controllo: VLO rettificato per i dividendi.
const CORR = {
  VLO_GSPC_senza_scissione: L.panel(px('VLO', false), gspc, crack, { skip: '1997-08-01' }),
  VLO_rettificato_GSPC: L.panel(px('VLO', true), gspc, crack),
};
const SENS = {
  XLE_SPY_crack_dollari: L.panel(px('XLE', true), px('SPY', true), crack, { crackUsd: true }),
  VLO_GSPC_crack_dollari: L.panel(px('VLO', false), gspc, crack, { crackUsd: true }),
  XLE_SPY_trimestrale: L.panel(px('XLE', true), px('SPY', true), crack, { quarterly: true }),
  VLO_GSPC_trimestrale: L.panel(px('VLO', false), gspc, crack, { quarterly: true }),
  VLO_GSPC_dal_1997_08: L.panel(px('VLO', false), gspc, crack, { from: '1997-08-01' }),
  VLO_GSPC_senza_scissione_crack_dollari: L.panel(px('VLO', false), gspc, crack, { skip: '1997-08-01', crackUsd: true }),
  VLO_GSPC_senza_scissione_trimestrale: L.panel(px('VLO', false), gspc, crack, { skip: '1997-08-01', quarterly: true }),
  VLO_GSPC_senza_scissione_benzina_gulf: L.panel(px('VLO', false), gspc, VS.benzina_gulf, { skip: '1997-08-01' }),
  VLO_GSPC_senza_scissione_ulsd: L.panel(px('VLO', false), gspc, VS.ulsd_dal_2006, { skip: '1997-08-01' }),
  XLE_SPY_benzina_gulf: L.panel(px('XLE', true), px('SPY', true), VS.benzina_gulf),
  VLO_GSPC_benzina_gulf: L.panel(px('VLO', false), gspc, VS.benzina_gulf),
  XLE_SPY_ulsd: L.panel(px('XLE', true), px('SPY', true), VS.ulsd_dal_2006),
  VLO_GSPC_ulsd: L.panel(px('VLO', false), gspc, VS.ulsd_dal_2006),
  paniere_raffinerie_GSPC: L.panel(basket, gspc, crack),
};
R.criterio3 = { variazione_crack: '(crack_t − crack_partenza) / WTI_partenza', obiettivi: {} };
for (const [k, rows] of Object.entries(PANELS)) R.criterio3.obiettivi[k] = L.test3(rows);
R.criterio3.passa = Object.values(R.criterio3.obiettivi).some((v) => v.passa);
R.criterio3.correzione_dati = { nota: 'VLO: −33% il 01/08/1997 (scissione di Valero) nella chiusura solo split di Yahoo; trovato dopo il primo calcolo', obiettivi: Object.fromEntries(Object.entries(CORR).map(([k, rows]) => [k, L.test3(rows)])) };
R.criterio3.passa_corretto = R.criterio3.obiettivi.XLE_SPY.passa || R.criterio3.correzione_dati.obiettivi.VLO_GSPC_senza_scissione.passa;
R.criterio3.controlli = Object.fromEntries(Object.entries(SENS).map(([k, rows]) => [k, L.test3(rows)]));
fs.writeFileSync(path.join(L.CACHE, 'pannelli.json'), JSON.stringify({ ...PANELS, ...CORR }));

// ------------------------------------------------------------ oggi (solo descrizione)
{
  const n = crack.close.length, last = crack.close[n - 1], d = crack.dates[n - 1];
  const below = crack.close.filter((x) => x < last).length, eq = crack.close.filter((x) => x === last).length;
  const lo = L.idxLE(crack.dates, addDays(d, -365));
  let iMax = lo + 1;
  for (let i = lo + 1; i < n; i++) if (crack.close[i] > crack.close[iMax]) iMax = i;
  const j = L.lag3m(crack.dates, n - 1);
  const ec = rule2(crack), cp = L.cyclePeaks(crack, 20).filter((p) => p.date >= '2025-01-01');
  R.oggi = {
    data: d, crack: r(last, 2), wti: crack.wti[n - 1], benzina: crack.gas[n - 1], gasolio: crack.ho[n - 1],
    percentile_storia: r((100 * (below + eq / 2)) / n, 1),
    percentile_da_2006: (() => { const v = crack.close.filter((x, i) => crack.dates[i] >= '2006-01-01'); return r((100 * (v.filter((x) => x < last).length + v.filter((x) => x === last).length / 2)) / v.length, 1); })(),
    massimo_12_mesi: [crack.dates[iMax], r(crack.close[iMax], 2)], distanza_dal_massimo_12m_pct: r((last / crack.close[iMax] - 1) * 100, 1), distanza_dal_massimo_12m_dollari: r(last - crack.close[iMax], 2),
    variazione_3m: j >= 0 ? { da: crack.dates[j], valore: r(crack.close[j], 2), pct: r((last / crack.close[j] - 1) * 100, 1) } : null,
    regola_criterio2_oggi: { sopra_p90: ec.pct[n - 1], calo_40_3m: ec.drop[n - 1] },
    massimi_di_ciclo_20_dal_2025: cp,
    storia_massimo: R.dati.crack.massimo,
  };
}

R.verdetto = { criterio1: R.criterio1.passa, criterio2: R.criterio2.passa, criterio3_serie_decisa_prima: R.criterio3.passa, criterio3_dati_corretti: R.criterio3.passa_corretto };
fs.writeFileSync(path.join(OUT, 'risultati.json'), JSON.stringify(R, null, 1));

// ------------------------------------------------------------ stampa
const c1 = (X) => { const t = R.criterio1[`X${X}`]; return ['tutto', ...Object.keys(HALVES)].map((h) => `${h}: ${t[h].prima}/${t[h].casi} prima (${t[h].quota_prima}%, nullo ${t[h].quota_prima_nullo_media}%, p ${t[h].p})`).join(' | '); };
console.log('crack', R.dati.crack.da, R.dati.crack.a, R.dati.crack.giorni, 'giorni; min', R.dati.crack.minimo, 'max', R.dati.crack.massimo);
console.log('C1 X20', c1(20)); console.log('C1 X30', c1(30)); console.log('C1 passa', R.criterio1.passa);
for (const k of ['base', 'crack', 'crack_percentile', 'crack_calo', 'wti', 'wti_percentile', 'wti_calo', 'wti_nei_giorni_del_crack']) {
  const v = R.criterio2[k];
  console.log('C2', k.padEnd(25), ['tutto', ...Object.keys(HALVES)].map((h) => (k === 'base' ? `${h} ${v[h].seguite}/${v[h].sedute}=${v[h].quota}%` : `${h} ${v[h].seguiti}/${v[h].episodi}=${v[h].quota}%`)).join(' | '));
}
console.log('C2 p info', JSON.stringify(R.criterio2.p_spostamenti_solo_info), 'passa', R.criterio2.passa, JSON.stringify(R.criterio2.passa_meta));
for (const [k, v] of Object.entries(R.criterio3.obiettivi)) console.log('C3', k, JSON.stringify(v.fuori_campione), 'passa', v.passa);
for (const [k, v] of Object.entries(R.criterio3.correzione_dati.obiettivi)) console.log('C3 corr', k, JSON.stringify(v.fuori_campione), 'passa', v.passa);
for (const [k, v] of Object.entries(R.criterio3.controlli)) console.log('C3 ctrl', k, JSON.stringify(v.fuori_campione ?? {}), JSON.stringify(Object.fromEntries(Object.entries(v.nel_campione).map(([h, x]) => [h, x.aumento]))));
console.log('oggi', JSON.stringify(R.oggi));
console.log('verdetto', JSON.stringify(R.verdetto));
