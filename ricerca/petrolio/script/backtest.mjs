#!/usr/bin/env node
/*
 * backtest.mjs — gli shock del petrolio hanno anticipato i cali dell'S&P 500? (ricerca, nessuna modifica all'app)
 *
 * Domanda: un analista sostiene che un petrolio «stabilmente sopra 95-100 $» (Brent) porta a stagflazione e forti cali
 * azionari, come nel 1973-74. Si misura se gli shock petroliferi, in tre forme decise prima, hanno preceduto i cali
 * dell'S&P 500, contro la base di tutti i mesi.
 *
 * Dati (scaricati da scarica.mjs in ../cache, vedi lì le fonti):
 *  - petrolio mensile: FRED WTISPLC (WTI spot, media mensile, dal 1946; prima del 1982 è il prezzo «posted», quasi fisso
 *    fino al 1973), MCOILBRENTEU (Brent, media mensile EIA, dal 05/1987); controlli: MCOILWTICO, DCOILWTICO, DCOILBRENTEU,
 *    Yahoo CL=F e BZ=F (futures, seconda fonte);
 *  - CPI: FRED CPIAUCSL. Prezzo reale del mese t = prezzo × CPI(ultimo) / CPI(t−1): si usa il CPI del mese prima perché
 *    quello del mese t esce a metà del mese dopo (nessun dato futuro; se manca, l'ultimo pubblicato prima). «Dollari di oggi» = CPI dell'ultimo mese disponibile;
 *  - S&P 500: Yahoo ^GSPC giornaliero (solo prezzo, senza dividendi), controllato contro data/vix.json (dal 1990, letto con
 *    vxSeries di js/vix.js) e contro FRED SP500 (ultimi 10 anni);
 *  - recessioni: FRED USREC (NBER; le date sono decise a posteriori).
 *
 * Regole (decise prima di guardare i risultati; condizione sul mese t, nota a fine mese):
 *  R1 Hamilton: P(t) > max(P(t−L..t−1)) × (1 + X/100), L = 12 o 36 mesi, X = 0, 10, 20; nominale e reale.
 *  R2 variazione annua: P(t)/P(t−12) − 1 ≥ +50% o +100% (sensibilità: +30%, +75%); nominale e reale.
 *  R3 livello: media del mese sopra S (95 o 100 $) per K mesi di fila (K = 2 o 3); nominale e reale (dollari di oggi).
 *  Segnale = primo mese con la condizione vera dopo almeno 6 mesi con la condizione definita e falsa.
 * Esiti (dalla chiusura dell'ultima seduta del mese del segnale):
 *  - calo massimo nei 6/12/18 mesi = minimo delle chiusure giornaliere dopo l'ingresso fino all'ultima seduta del mese
 *    t+h, rispetto alla chiusura d'ingresso (0 se non scende sotto l'ingresso);
 *  - rendimenti a 3/6/12 mesi (chiusure di fine mese);
 *  - recessione entro 12 mesi = almeno un mese con USREC = 1 tra t+1 e t+12.
 *  Solo finestre complete (l'ultimo mese completo è l'ultimo mese chiuso dell'S&P e del petrolio).
 *  Base = tutti i mesi dello stesso periodo con l'esito disponibile.
 * Eventi: cali dell'S&P ≥ 20% e ≥ 10% sulle chiusure giornaliere dal 1950, con il metodo «zigzag» simmetrico (un calo
 *  di X% dal massimo apre l'evento, un rialzo di X% dal minimo lo chiude). Un evento è «avvisato» se un segnale (data di
 *  fine mese) cade nei 12 mesi prima del massimo (fine mese ≤ data del massimo). Recessioni: inizio = primo mese con
 *  USREC = 1; avvisata se un segnale cade nei 12 mesi prima (mesi m−12..m−1).
 * Criterio di successo (deciso prima):
 *  (a) quota di segnali seguiti da un calo ≥ 10% entro 12 mesi almeno 15 punti sopra la base (campione intero);
 *  (b) lo stesso (≥ +15 punti) sia nel 1950-1989 sia dal 1990, con più di 5 segnali in ciascun periodo
 *      (altrimenti «troppo pochi casi», e (b) non è superato);
 *  (c) soglie vicine danno risultati simili: tutte le varianti adiacenti della stessa regola (un passo di X, di L, di S,
 *      di K, o della soglia annua) hanno almeno +10 punti sulla base nel campione intero.
 * Uso: node ricerca/petrolio/script/backtest.mjs  → ../risultati.json (e riepilogo a schermo)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vxSeries } from '../../../js/vix.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const C = path.join(HERE, '..', 'cache');
const ROOT = path.join(HERE, '..', '..', '..');
const r1 = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);

// ---------- lettura ----------
function fred(id) {
  const m = new Map();
  for (const line of fs.readFileSync(path.join(C, `fred_${id}.csv`), 'utf8').trim().split('\n').slice(1)) {
    const [d, v] = line.split(',');
    if (v && v !== '.' && v.trim() !== '') m.set(d, +v);
  }
  return m;
}
function yahoo(file) {
  const r = JSON.parse(fs.readFileSync(path.join(C, file), 'utf8')).chart.result[0];
  // data = giorno UTC del timestamp: le barre giornaliere dei futures sono alla mezzanotte di New York (04:00/05:00 UTC),
  // quelle dell'indice all'apertura (13:30/14:30 UTC); sommare lo scarto orario di oggi sposterebbe le barre estive al giorno prima
  const cl = r.indicators.quote[0].close;
  const out = [];
  r.timestamp.forEach((t, i) => { if (cl[i] != null) out.push([new Date(t * 1000).toISOString().slice(0, 10), cl[i]]); });
  // Yahoo a volte ripete l'ultima seduta: si tiene l'ultimo valore per data
  const m = new Map(out);
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
const ym = (d) => d.slice(0, 7);
const addM = (m, k) => { let [y, mo] = m.split('-').map(Number); mo += k; y += Math.floor((mo - 1) / 12); mo = ((mo - 1) % 12 + 12) % 12 + 1; return `${y}-${String(mo).padStart(2, '0')}`; };
const monthly = (fm) => new Map([...fm.entries()].map(([d, v]) => [ym(d), v]));

const WTI = monthly(fred('WTISPLC')), BRENT = monthly(fred('MCOILBRENTEU')), WTI2 = monthly(fred('MCOILWTICO'));
const CPI = monthly(fred('CPIAUCSL')), REC = monthly(fred('USREC'));
const DWTI = fred('DCOILWTICO'), DBRENT = fred('DCOILBRENTEU');
const SPX = yahoo('yahoo_GSPC_1d.json').filter(([d]) => d >= '1945-01-01');
const CLF = yahoo('yahoo_CLF_1d.json'), BZF = yahoo('yahoo_BZF_1d.json');

// ---------- controlli dei dati ----------
const checks = {};
function cover(m) { const k = [...m.keys()].sort(); return { first: k[0], last: k[k.length - 1], n: k.length }; }
function monthHoles(m) { const k = [...m.keys()].sort(); const h = []; for (let x = k[0]; x <= k[k.length - 1]; x = addM(x, 1)) if (!m.has(x)) h.push(x); return h; }
checks.cpi_mesi_mancanti = monthHoles(CPI);
checks.copertura = {
  WTISPLC: { ...cover(WTI), buchi: monthHoles(WTI).length }, MCOILBRENTEU: { ...cover(BRENT), buchi: monthHoles(BRENT).length },
  MCOILWTICO: cover(WTI2), CPIAUCSL: { ...cover(CPI), buchi: monthHoles(CPI).length }, USREC: cover(REC),
  DCOILWTICO: cover(DWTI), DCOILBRENTEU: cover(DBRENT),
  GSPC_yahoo: { first: SPX[0][0], last: SPX[SPX.length - 1][0], n: SPX.length },
  CLF_yahoo: { first: CLF[0][0], last: CLF[CLF.length - 1][0], n: CLF.length }, BZF_yahoo: { first: BZF[0][0], last: BZF[BZF.length - 1][0], n: BZF.length },
};
function cmpMonthly(a, b) { // differenza assoluta e % tra due serie mensili sui mesi comuni
  const d = []; for (const [k, v] of a) if (b.has(k)) d.push({ k, abs: Math.abs(v - b.get(k)), pct: Math.abs(v / b.get(k) - 1) * 100 });
  d.sort((x, y) => x.pct - y.pct);
  return { mesi: d.length, mediana_pct: r1(d[Math.floor(d.length / 2)]?.pct, 2), max_pct: r1(d[d.length - 1]?.pct, 2), mese_max: d[d.length - 1]?.k, sotto_1pct: d.filter((x) => x.pct < 1).length };
}
const avgByMonth = (pairs) => { const s = new Map(); for (const [d, v] of pairs) { const k = ym(d); const o = s.get(k) || [0, 0]; o[0] += v; o[1]++; s.set(k, o); } return new Map([...s].map(([k, [a, n]]) => [k, a / n])); };
const lastM = [...WTI.keys()].sort().pop();
const drop = (m) => new Map([...m].filter(([k]) => k <= lastM)); // mese in corso escluso
checks.WTISPLC_vs_MCOILWTICO = cmpMonthly(WTI, WTI2);
checks.MCOILWTICO_vs_media_DCOILWTICO = cmpMonthly(WTI2, drop(avgByMonth([...DWTI])));
checks.MCOILBRENTEU_vs_media_DCOILBRENTEU = cmpMonthly(BRENT, drop(avgByMonth([...DBRENT])));
checks.WTI_FRED_vs_media_Yahoo_CLF = cmpMonthly(WTI, drop(avgByMonth(CLF.filter(([, v]) => v > 0))));
checks.Brent_FRED_vs_media_Yahoo_BZF = cmpMonthly(BRENT, drop(avgByMonth(BZF)));
{ // S&P: Yahoo contro data/vix.json e FRED SP500
  const vx = vxSeries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vix.json'), 'utf8')).series.SPX);
  const y = new Map(SPX);
  const cmp = (dates, vals) => { let n = 0, mx = 0, at = null, miss = 0; dates.forEach((d, i) => { if (!y.has(d)) { miss++; return; } n++; const p = Math.abs(vals[i] / y.get(d) - 1) * 100; if (p > mx) { mx = p; at = d; } }); return { sedute_comuni: n, mancanti_in_yahoo: miss, max_diff_pct: r1(mx, 3), data_max: at }; };
  checks.GSPC_yahoo_vs_vix_json = { ...cmp(vx.dates, vx.val), vix_json: { first: vx.dates[0], last: vx.dates[vx.dates.length - 1] } };
  const fs5 = fred('SP500');
  checks.GSPC_yahoo_vs_FRED_SP500 = cmp([...fs5.keys()], [...fs5.values()]);
  let big = []; for (let i = 1; i < SPX.length; i++) { const c = SPX[i][1] / SPX[i - 1][1] - 1; if (Math.abs(c) > 0.12) big.push([SPX[i][0], r1(c * 100)]); }
  checks.GSPC_variazioni_giornaliere_oltre_12pct = big;
}

// ---------- calendario mensile ----------
const spxLastDay = new Map(); // mese → indice dell'ultima seduta
SPX.forEach(([d], i) => spxLastDay.set(ym(d), i));
const lastSpxM = ym(SPX[SPX.length - 1][0]);
// ultimo mese completo: l'S&P ha sedute nel mese dopo e il petrolio mensile c'è
const LAST = [lastM, addM(lastSpxM, -1)].sort()[0]; // il mese dell'ultima seduta dell'S&P si considera incompleto
const MONTHS = []; for (let m = '1946-01'; m <= LAST; m = addM(m, 1)) MONTHS.push(m);
const CPI_REF_M = [...CPI.keys()].filter((k) => k <= LAST).sort().pop();
const CPI_REF = CPI.get(CPI_REF_M);
// deflatore del mese t: l'ultimo CPI pubblicato con mese ≤ t−1 (il CPI di 10/2025 non è mai uscito per la chiusura del governo
// USA: per 11/2025 si usa quello di 09/2025, l'ultimo noto allora; nessun valore inventato)
const cpiKnown = (m) => { for (let k = 1; k <= 3; k++) if (CPI.has(addM(m, -k))) return CPI.get(addM(m, -k)); return null; };
const real = (series) => new Map(MONTHS.filter((m) => series.has(m) && cpiKnown(m) != null).map((m) => [m, series.get(m) * CPI_REF / cpiKnown(m)]));
const SER = { WTI, WTI_real: real(WTI), Brent: BRENT, Brent_real: real(BRENT) };

// esiti per mese
const OUT = new Map();
for (const m of MONTHS) {
  const e = spxLastDay.get(m); if (e == null) continue;
  const p0 = SPX[e][1], o = { entry: SPX[e][0], ret: {}, dd: {}, rec12: null };
  { // quanto l'S&P era già sotto il massimo delle chiusure dei 12 mesi prima, al momento del segnale
    const from = spxLastDay.get(addM(m, -12)); if (from != null) { let mx = 0; for (let i = from + 1; i <= e; i++) mx = Math.max(mx, SPX[i][1]); o.ddPrima = r1((p0 / mx - 1) * 100); }
  }
  for (const h of [3, 6, 12]) { const mm = addM(m, h); o.ret[h] = mm <= LAST && spxLastDay.has(mm) ? (SPX[spxLastDay.get(mm)][1] / p0 - 1) * 100 : null; }
  for (const h of [6, 12, 18]) {
    const mm = addM(m, h); if (mm > LAST) { o.dd[h] = null; continue; }
    let mn = p0; for (let i = e + 1; i <= spxLastDay.get(mm); i++) mn = Math.min(mn, SPX[i][1]);
    o.dd[h] = (mn / p0 - 1) * 100;
  }
  if (addM(m, 12) <= LAST && [...Array(12)].every((_, k) => REC.has(addM(m, k + 1)))) o.rec12 = [...Array(12)].some((_, k) => REC.get(addM(m, k + 1)) === 1);
  OUT.set(m, o);
}

// ---------- regole ----------
function condition(rule) { // mese → true/false/null
  const P = SER[rule.series], c = new Map();
  for (let i = 0; i < MONTHS.length; i++) {
    const m = MONTHS[i]; let v = null;
    if (rule.kind === 'R1') {
      const prev = []; for (let k = 1; k <= rule.L; k++) prev.push(P.get(addM(m, -k)));
      if (P.has(m) && prev.every((x) => x != null)) v = P.get(m) > Math.max(...prev) * (1 + rule.X / 100);
    } else if (rule.kind === 'R2') {
      const a = P.get(addM(m, -12)); if (P.has(m) && a != null) v = P.get(m) / a - 1 >= rule.Y / 100;
    } else {
      const xs = []; for (let k = 0; k < rule.K; k++) xs.push(P.get(addM(m, -k)));
      if (xs.every((x) => x != null)) v = xs.every((x) => x > rule.S);
    }
    c.set(m, v);
  }
  return c;
}
function signals(c) {
  const s = []; let falseRun = 0;
  for (const m of MONTHS) { const v = c.get(m); if (v == null) { falseRun = 0; continue; } if (v) { if (falseRun >= 6) s.push(m); falseRun = 0; } else falseRun++; }
  return s;
}
const RULES = [];
for (const series of ['WTI', 'WTI_real', 'Brent', 'Brent_real']) {
  for (const L of [12, 36]) for (const X of [0, 10, 20]) RULES.push({ id: `R1_${series}_L${L}_X${X}`, kind: 'R1', series, L, X });
  for (const Y of [30, 50, 75, 100]) RULES.push({ id: `R2_${series}_Y${Y}`, kind: 'R2', series, Y, sens: Y === 30 || Y === 75 });
  for (const S of [80, 90, 95, 100, 110, 120]) for (const K of [2, 3]) RULES.push({ id: `R3_${series}_S${S}_K${K}`, kind: 'R3', series, S, K, sens: S !== 95 && S !== 100 });
}
const neighbours = (r) => RULES.filter((q) => q.kind === r.kind && q.series === r.series && q.id !== r.id && (
  r.kind === 'R1' ? ((q.L === r.L && Math.abs(q.X - r.X) === 10) || (q.X === r.X && q.L !== r.L))
    : r.kind === 'R2' ? Math.abs([30, 50, 75, 100].indexOf(q.Y) - [30, 50, 75, 100].indexOf(r.Y)) === 1
      : ((q.K === r.K && Math.abs([80, 90, 95, 100, 110, 120].indexOf(q.S) - [80, 90, 95, 100, 110, 120].indexOf(r.S)) === 1) || (q.S === r.S && q.K !== r.K))));

const PERIODS = { tutto: ['1950-01', LAST], '1950-1989': ['1950-01', '1989-12'], '1990-oggi': ['1990-01', LAST] };
const inP = (m, [a, b]) => m >= a && m <= b;
const stat = (ms) => {
  const f10 = ms.filter((m) => OUT.get(m)?.dd[12] != null), f20 = f10;
  const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? r1(v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
  const rec = ms.filter((m) => OUT.get(m)?.rec12 != null);
  return {
    n: ms.length, n_esito12: f10.length,
    calo10_12m: f10.filter((m) => OUT.get(m).dd[12] <= -10).length, calo20_12m: f20.filter((m) => OUT.get(m).dd[12] <= -20).length,
    quota_calo10: f10.length ? r1(100 * f10.filter((m) => OUT.get(m).dd[12] <= -10).length / f10.length) : null,
    quota_calo20: f10.length ? r1(100 * f10.filter((m) => OUT.get(m).dd[12] <= -20).length / f10.length) : null,
    dd_mediano: { 6: med(ms.map((m) => OUT.get(m)?.dd[6])), 12: med(ms.map((m) => OUT.get(m)?.dd[12])), 18: med(ms.map((m) => OUT.get(m)?.dd[18])) },
    rend_mediano: { 3: med(ms.map((m) => OUT.get(m)?.ret[3])), 6: med(ms.map((m) => OUT.get(m)?.ret[6])), 12: med(ms.map((m) => OUT.get(m)?.ret[12])) },
    rend12_positivi: ms.filter((m) => OUT.get(m)?.ret[12] != null && OUT.get(m).ret[12] > 0).length,
    recessione12: rec.filter((m) => OUT.get(m).rec12).length, n_esito_rec: rec.length,
    quota_recessione: rec.length ? r1(100 * rec.filter((m) => OUT.get(m).rec12).length / rec.length) : null,
  };
};
const BASE = {}; for (const [k, p] of Object.entries(PERIODS)) BASE[k] = stat(MONTHS.filter((m) => inP(m, p) && OUT.has(m)));

// ---------- eventi: zigzag sulle chiusure giornaliere dal 1950 ----------
function zigzag(X) {
  const s = SPX.filter(([d]) => d >= '1950-01-01'); const ev = [];
  let mode = 'up', pk = 0, tr = 0;
  for (let i = 1; i < s.length; i++) {
    if (mode === 'up') { if (s[i][1] > s[pk][1]) pk = i; else if (s[i][1] <= s[pk][1] * (1 - X / 100)) { mode = 'down'; tr = i; } }
    else { if (s[i][1] < s[tr][1]) tr = i; else if (s[i][1] >= s[tr][1] * (1 + X / 100)) { ev.push({ peak: s[pk][0], trough: s[tr][0], calo: r1((s[tr][1] / s[pk][1] - 1) * 100), chiuso: true }); mode = 'up'; pk = i; } }
  }
  if (mode === 'down') ev.push({ peak: s[pk][0], trough: s[tr][0], calo: r1((s[tr][1] / s[pk][1] - 1) * 100), chiuso: false });
  return ev;
}
const EV = { calo20: zigzag(20), calo10: zigzag(10) };
const RECS = []; { let prev = 0; for (const m of [...REC.keys()].sort()) { const v = REC.get(m); if (v === 1 && prev === 0 && m >= '1950-01') RECS.push(m); prev = v; } }
const monthEnd = (m) => SPX[spxLastDay.get(m)][0];

function evaluate(rule) {
  const c = condition(rule), sig = signals(c);
  const firstDef = MONTHS.find((m) => c.get(m) != null);
  const res = { id: rule.id, kind: rule.kind, series: rule.series, params: { L: rule.L, X: rule.X, Y: rule.Y, S: rule.S, K: rule.K }, sensibilita: !!rule.sens, prima_condizione: firstDef, segnali: sig.filter((m) => m >= '1950-01') };
  res.periodi = {};
  for (const [k, p] of Object.entries(PERIODS)) {
    const s = stat(res.segnali.filter((m) => inP(m, p)));
    s.vantaggio_calo10 = s.quota_calo10 == null || BASE[k].quota_calo10 == null ? null : r1(s.quota_calo10 - BASE[k].quota_calo10);
    res.periodi[k] = s;
  }
  const defM = MONTHS.filter((m) => m >= '1950-01' && c.get(m) != null);
  // lettura secondaria «stato»: tutti i mesi con la condizione vera (mesi sovrapposti, non indipendenti)
  res.stato = {};
  for (const [k, p] of Object.entries(PERIODS)) { const s = stat(defM.filter((m) => c.get(m) && inP(m, p))); res.stato[k] = { n: s.n, n_esito12: s.n_esito12, calo10_12m: s.calo10_12m, quota_calo10: s.quota_calo10, vantaggio_calo10: s.quota_calo10 == null ? null : r1(s.quota_calo10 - BASE[k].quota_calo10), rend_mediano12: s.rend_mediano[12], quota_recessione: s.quota_recessione }; }
  res.mesi_in_allarme = { mesi_definiti: defM.length, condizione_vera: defM.filter((m) => c.get(m)).length, quota: defM.length ? r1(100 * defM.filter((m) => c.get(m)).length / defM.length) : null };
  // falsi allarmi: segnali con esito a 12 mesi e senza calo ≥ 10%
  const done = res.segnali.filter((m) => OUT.get(m)?.dd[12] != null);
  res.falsi_allarmi = done.filter((m) => OUT.get(m).dd[12] > -10);
  // eventi avvisati (solo eventi con la finestra di 12 mesi prima del massimo interamente coperta dalla regola, +6 mesi per l'avvio)
  const startOK = addM(firstDef, 6);
  res.eventi = {};
  for (const [k, list] of Object.entries(EV)) {
    const elig = list.filter((e) => addM(ym(e.peak), -12) >= startOK);
    const det = elig.map((e) => { const s = sig.find((m) => { const d = monthEnd(m); return d <= e.peak && m >= addM(ym(e.peak), -12); }); return { ...e, segnale: s || null, anticipo_mesi: s ? (Date.parse(e.peak) - Date.parse(monthEnd(s))) / 2629800000 : null }; });
    res.eventi[k] = { eventi: elig.length, avvisati: det.filter((e) => e.segnale).length, persi: det.filter((e) => !e.segnale).map((e) => `${e.peak} (${e.calo}%)`), dettaglio: det.filter((e) => e.segnale).map((e) => `${e.peak} ${e.calo}% ← ${e.segnale} (${r1(e.anticipo_mesi)} mesi prima)`) };
  }
  // copertura «a caso»: quota delle sedute (dal primo massimo ammissibile) con un segnale nei 12 mesi prima; è la quota di
  // eventi che la regola «avviserebbe» se i massimi cadessero in giorni qualsiasi
  { const ends = sig.map((m) => [monthEnd(m), m]); let j = -1, cov = 0, tot = 0;
    const from = `${addM(startOK, 12)}-01`;
    for (const [d] of SPX) { if (d < from || d < '1950-01-01') continue; while (j + 1 < ends.length && ends[j + 1][0] <= d) j++; tot++; if (j >= 0 && ends[j][1] >= addM(ym(d), -12)) cov++; }
    res.eventi.copertura_casuale_pct = tot ? r1(100 * cov / tot) : null; }
  const er = RECS.filter((m) => addM(m, -12) >= startOK);
  const rd = er.map((m) => ({ m, s: sig.find((x) => x >= addM(m, -12) && x <= addM(m, -1)) || null }));
  res.eventi.recessioni = { eventi: er.length, avvisati: rd.filter((x) => x.s).length, persi: rd.filter((x) => !x.s).map((x) => x.m), dettaglio: rd.filter((x) => x.s).map((x) => `${x.m} ← ${x.s}`) };
  res.segnali_dettaglio = res.segnali.map((m) => ({ mese: m, prezzo: r1(SER[rule.series].get(m), 2), entry: OUT.get(m)?.entry, sp_sotto_max12m_prima: OUT.get(m)?.ddPrima, dd12: r1(OUT.get(m)?.dd[12]), ret12: r1(OUT.get(m)?.ret[12]), rec12: OUT.get(m)?.rec12 }));
  return res;
}
const RES = RULES.map(evaluate);
const byId = new Map(RES.map((r) => [r.id, r]));
for (const r of RES) {
  const rule = RULES.find((q) => q.id === r.id), t = r.periodi;
  const a = t.tutto.vantaggio_calo10 != null && t.tutto.vantaggio_calo10 >= 15;
  const pb = ['1950-1989', '1990-oggi'].map((k) => (t[k].n_esito12 <= 5 ? 'troppo pochi casi' : t[k].vantaggio_calo10 >= 15 ? 'sì' : 'no'));
  const nb = neighbours(rule).map((q) => ({ id: q.id, vantaggio: byId.get(q.id).periodi.tutto.vantaggio_calo10 }));
  const c = nb.length > 0 && nb.every((q) => q.vantaggio != null && q.vantaggio >= 10);
  r.criterio = { a, b: pb, c, vicine: nb, superato: a && pb.every((x) => x === 'sì') && c };
}

// ---------- episodi ----------
const KEY = ['R1_WTI_L12_X0', 'R1_WTI_L36_X0', 'R1_WTI_real_L36_X0', 'R1_WTI_L12_X20', 'R2_WTI_Y50', 'R2_WTI_Y100', 'R3_WTI_S100_K2', 'R3_WTI_real_S100_K2', 'R3_Brent_S100_K2', 'R3_Brent_real_S100_K2'];
const EPIS = [['1973-74', '1973-01', '1974-12'], ['1979-80', '1978-07', '1980-12'], ['1990', '1990-01', '1990-12'], ['2000', '1999-01', '2000-12'], ['2005-08', '2004-01', '2008-12'], ['2011', '2010-07', '2011-12'], ['2021-22', '2021-01', '2022-12'], ['2026', '2025-07', LAST]];
const EPISODI = EPIS.map(([nome, a, b]) => {
  const sig = {}; for (const id of KEY) sig[id] = byId.get(id).segnali.filter((m) => m >= a && m <= b);
  const ev20 = EV.calo20.filter((e) => ym(e.peak) >= addM(a, -12) && ym(e.peak) <= b).map((e) => `${e.peak}→${e.trough} ${e.calo}%${e.chiuso ? '' : ' (in corso)'}`);
  const ev10 = EV.calo10.filter((e) => ym(e.peak) >= addM(a, -12) && ym(e.peak) <= b).map((e) => `${e.peak}→${e.trough} ${e.calo}%${e.chiuso ? '' : ' (in corso)'}`);
  const rec = RECS.filter((m) => m >= a && m <= addM(b, 12));
  const px = (S) => { const v = MONTHS.filter((m) => m >= a && m <= b && SER[S].has(m)).map((m) => [m, SER[S].get(m)]); if (!v.length) return null; const mx = v.reduce((x, y) => (y[1] > x[1] ? y : x)); const mn = v.reduce((x, y) => (y[1] < x[1] ? y : x)); return { min: [mn[0], r1(mn[1], 2)], max: [mx[0], r1(mx[1], 2)] }; };
  const first = Object.values(sig).flat().sort()[0];
  return { nome, finestra: [a, b], petrolio: { WTI: px('WTI'), WTI_real: px('WTI_real'), Brent: px('Brent') }, segnali: sig, cali20_con_massimo_da_12m_prima: ev20, cali10_con_massimo_da_12m_prima: ev10, recessioni_iniziate: rec, primo_segnale: first || null, esito_primo_segnale: first ? { dd12: r1(OUT.get(first).dd[12]), ret12: r1(OUT.get(first).ret[12]), rec12: OUT.get(first).rec12 } : null };
});

// ---------- situazione attuale ----------
const lastOf = (arr) => arr[arr.length - 1];
function peakTo(arr, from) {
  const s = arr.filter(([d]) => d >= from); const mx = s.reduce((x, y) => (y[1] > x[1] ? y : x)); const l = lastOf(s);
  const after = s.filter(([d]) => d > mx[0]); const mn = after.length ? after.reduce((x, y) => (y[1] < x[1] ? y : x)) : null;
  return { massimo: [mx[0], r1(mx[1], 2)], ultimo: [l[0], r1(l[1], 2)], calo_pct: r1((l[1] / mx[1] - 1) * 100), minimo_dopo: mn && [mn[0], r1(mn[1], 2)], calo_max_pct: mn && r1((mn[1] / mx[1] - 1) * 100) };
}
const spxPk = (() => { const s = SPX.filter(([d]) => d >= '2026-01-01'); return peakTo(s, '2026-01-01'); })();
const ADESSO = {
  ultimo_mese_completo: LAST, cpi_riferimento: [CPI_REF_M, CPI_REF],
  petrolio_mensile: Object.fromEntries(['WTI', 'Brent'].map((S) => [S, MONTHS.slice(-8).map((m) => [m, r1(SER[S].get(m), 2), r1(SER[S + '_real'].get(m), 2)])])),
  brent_giornaliero_FRED_da_ottobre: peakTo([...DBRENT].sort(), '2026-10-01'), wti_giornaliero_FRED_da_ottobre: peakTo([...DWTI].sort(), '2026-10-01'),
  brent_Yahoo_BZF_da_ottobre: peakTo(BZF, '2026-10-01'), wti_Yahoo_CLF_da_ottobre: peakTo(CLF, '2026-10-01'),
  sp500_2026: spxPk, sp500_da_fine_ottobre: peakTo(SPX, '2026-10-15'),
  condizioni_ultimo_mese: Object.fromEntries(RULES.filter((r) => !r.sens).map((r) => { const c = condition(r); return [r.id, { [LAST]: c.get(LAST), segnale_recente: byId.get(r.id).segnali.filter((m) => m >= '2025-01') }]; })),
  massimo_reale_storico: Object.fromEntries(['WTI_real', 'Brent_real'].map((S) => { const v = [...SER[S]].reduce((x, y) => (y[1] > x[1] ? y : x)); return [S, [v[0], r1(v[1], 2)]]; })),
  soglia_100_reale_in_nominale: Object.fromEntries(['1974-01', '1980-01', '1990-10', '2008-06', '2022-06'].map((m) => [m, r1(100 * cpiKnown(m) / CPI_REF, 2)])),
};

// esito parziale dei segnali del 2026 (finestra non ancora completa: solo descrittivo)
ADESSO.segnali_2026_parziali = Object.fromEntries(KEY.map((id) => [id, byId.get(id).segnali.filter((m) => m >= '2026-01').map((m) => {
  const e = spxLastDay.get(m), p0 = SPX[e][1]; let mn = p0, at = SPX[e][0]; for (let i = e + 1; i < SPX.length; i++) if (SPX[i][1] < mn) { mn = SPX[i][1]; at = SPX[i][0]; }
  return { mese: m, ingresso: [SPX[e][0], r1(p0, 2)], minimo_dopo: [at, r1(mn, 2)], calo_max_pct: r1((mn / p0 - 1) * 100), ultimo: [lastOf(SPX)[0], r1(lastOf(SPX)[1], 2)], rend_pct: r1((lastOf(SPX)[1] / p0 - 1) * 100) };
})]));

// ---------- uscita ----------
const SUMMARY = RES.map((r) => ({ id: r.id, sens: r.sensibilita, segnali: r.periodi.tutto.n, esito12: r.periodi.tutto.n_esito12, calo10: r.periodi.tutto.calo10_12m, quota: r.periodi.tutto.quota_calo10, vant: r.periodi.tutto.vantaggio_calo10, p1: `${r.periodi['1950-1989'].calo10_12m}/${r.periodi['1950-1989'].n_esito12}`, p2: `${r.periodi['1990-oggi'].calo10_12m}/${r.periodi['1990-oggi'].n_esito12}`, v1: r.periodi['1950-1989'].vantaggio_calo10, v2: r.periodi['1990-oggi'].vantaggio_calo10, ev20: `${r.eventi.calo20.avvisati}/${r.eventi.calo20.eventi}`, caso: r.eventi.copertura_casuale_pct, ev10: `${r.eventi.calo10.avvisati}/${r.eventi.calo10.eventi}`, stato: `${r.stato.tutto.calo10_12m}/${r.stato.tutto.n_esito12}`, vstato: r.stato.tutto.vantaggio_calo10, rec: `${r.eventi.recessioni.avvisati}/${r.eventi.recessioni.eventi}`, allarme: r.mesi_in_allarme.quota, crit: r.criterio.superato, a: r.criterio.a, b: r.criterio.b.join('|'), c: r.criterio.c }));
const out = { generato: new Date().toISOString(), ultimo_mese_completo: LAST, controlli_dati: checks, base: BASE, eventi: { ...EV, recessioni: RECS }, sintesi: SUMMARY, regole: RES, episodi: EPISODI, adesso: ADESSO };
fs.writeFileSync(path.join(HERE, '..', 'risultati.json'), JSON.stringify(out, null, 1));
console.log('ultimo mese completo', LAST, 'CPI rif.', CPI_REF_M);
console.log('base', JSON.stringify(Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k, `${v.calo10_12m}/${v.n_esito12}=${v.quota_calo10}% rec ${v.quota_recessione}%`]))));
console.table(SUMMARY.filter((s) => !s.sens || process.argv.includes('--tutte')));
