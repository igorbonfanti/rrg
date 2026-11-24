/*
 * pattern.mjs — esiste un pattern della breadth a 50 sedute utilizzabile come allerta sugli indici?
 *
 * DOMANDA. Sugli indici maggiori il livello blu (breadth a 200 sedute) si tocca solo nelle grandi crisi; i minimi
 * locali sembrano segnalati dalla breadth a 50 sedute. Si verifica se una delle regole R1–R5, fissate PRIMA di
 * guardare i risultati, dà dopo il segnale rendimenti migliori di una seduta qualsiasi dello stesso indice.
 * «Non c'è un pattern affidabile» è un esito accettabile: regole e parametri non si cambiano dopo i risultati.
 *
 * DATI. 22 indici di config/indices.json (livelli blu `blue`), serie da data/indices.json e data/indices_more.json
 * lette con indexSeries (js/indexdata.js); prezzi solo prezzo, valuta locale. Stati con runMachine (js/signals.js),
 * params = DEFAULT_PARAMS + config/thresholds.json `params`. Verifica fuori campione: gli 11 settori
 * (data/sectors.json, chiusure rettificate per i dividendi, + data/breadth.json con breadthSeries), breadth dal 2005.
 *
 * NIENTE DATI DEL FUTURO. Il p-esimo percentile di una serie alla seduta t si calcola sui valori non nulli dalla prima
 * seduta della breadth fino a t compreso (finestra crescente): valore ordinato in posizione floor(q·(N−1)), come
 * approachLevel in js/signals.js. Si usa solo se prima di t ci sono almeno 500 valori. Le sedute prima non sono
 * valutabili. La media a 200 sedute della chiusura usa le 200 chiusure fino a t.
 *
 * REGOLE (fissate prima; p = 5, gap = 20). «basso50(t)»: pct50[t] ≤ P_p(pct50)[t].
 *   R1 tocco della 50:            basso50.
 *   R2 correzione in mercato sano: basso50 e pct200 > livello blu + 10.
 *   R3 correzione sopra la 200:    basso50 e chiusura > media a 200 sedute della chiusura.
 *   R4 ripartenza:                 esiste s in [t−10, t] con basso50(s); m = minimo di pct50 nei giorni s con basso50;
 *                                   condizione: pct50[t] ≥ m + 30.
 *   R5 doppio estremo:             pct20 ≤ P_p(pct20) e pct50 ≤ P_2p(pct50)  (p = 5: 5° e 10° percentile).
 *   Segnale: prima seduta con la condizione vera dopo almeno `gap` sedute valutabili con la condizione falsa (le sedute
 *   non valutabili, per esempio una breadth mancante, non contano e non azzerano il conteggio).
 *   R0 (confronto): eventi 'trig' di runMachine; R0z: ingresso in zona blu (eventi 'setup'). Per confrontare alla pari
 *   si tengono solo quelli nelle sedute valutabili per R1–R5 (dopo le 500 sedute di storia della breadth).
 *
 * MISURE (dalla chiusura del giorno del segnale, che si conosce a mercato chiuso: chi entra il giorno dopo ha un
 * prezzo diverso). Rendimento a 21 e 63 sedute (forward di js/signals.js), quota positivi, calo massimo nelle 21 e 63
 * sedute dopo (minimo delle chiusure da t a t+k rispetto alla chiusura di t, ≤ 0, solo con la finestra completa),
 * «vicino al minimo locale»: calo massimo a 63 sedute non oltre −3%. Base: tutte le sedute valutabili dello stesso
 * indice nello stesso periodo, con le stesse misure; la base dell'insieme è l'unione di quelle sedute.
 * Periodi: calibrazione 2001-01-01 … 2013-12-31, verifica 2014-01-01 … oggi (per data del segnale).
 *
 * CRITERIO (fissato prima). Una regola è utile se, sui segnali di tutti gli indici insieme:
 *   C1 calibrazione e C2 verifica: mediana a 63 sedute ≥ base + 2 punti E quota positivi a 63 ≥ base + 10 punti;
 *   C3 nella verifica la stessa condizione (contro la base dell'indice) vale in almeno il 60% degli indici con almeno
 *      5 segnali con l'esito a 63 sedute (non valutabile se gli indici con 5 segnali sono meno di 3).
 *   Versione per episodi globali: segnali di indici diversi entro 10 sedute (giorni feriali) l'uno dall'altro formano un
 *   episodio (legame a catena); per episodio la mediana dei suoi segnali; periodo = data del primo segnale.
 *   Verdetto: «utile» se C1, C2, C3 valgono sui segnali e C1, C2 sugli episodi; «non utile» se C1 o C2 falliscono sia
 *   sui segnali sia sugli episodi, oppure C3 è valutabile e fallisce; altrimenti «incerto».
 * Regola migliore (per la sola sensibilità, decisa prima): tra R1–R5 quella con il più alto minimo, sui due periodi,
 * dello scarto della mediana a 63 sedute dalla base. Sensibilità: p 3/5/10 × gap 10/20/40 (per R5 p vale per pct20 e
 * 2p per pct50). Serve solo a vedere quanto la regola è fragile, non a sceglierne i parametri.
 * Crisi: 2008 (2007-10-01…2009-03-31), 2011 (07-01…12-31), 2015-16 (2015-08-01…2016-03-31), 2018 (2018-01-26…12-31),
 * 2020 (02-15…04-30), 2022 (01-01…10-31), 2025 (02-15…05-31). Mercati orso: 2001-02 (2001-01-01…2003-03-31),
 * 2008 (2007-10-01…2009-03-31), 2022 (2022-01-01…2022-10-31): per ogni segnale nella finestra, calo ulteriore =
 * minimo delle chiusure dal segnale alla fine della finestra rispetto alla chiusura del segnale; «continua a scendere»
 * se il calo ulteriore è oltre −3%.
 *
 * CONTROLLI. Ricalcolo indipendente (algoritmo ingenuo) dei percentili su un campione di sedute, dei segnali R1 e dei
 * rendimenti; lo script si ferma se non coincidono.
 *
 * USO: node ricerca/indici-breadth50/script/pattern.mjs [--md]
 *   scrive ricerca/indici-breadth50/pattern.json; con --md stampa le tabelle in Markdown (usate in pattern.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PARAMS, priceSeries, runMachine, breadthSeries, median, forward, SECTOR_KEYS } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const CFG = R('config/indices.json').indices;
const TH = R('config/thresholds.json');
const PARAMS = { ...DEFAULT_PARAMS, ...TH.params };
const IX = { ...R('data/indices.json').series, ...R('data/indices_more.json').series };

const MIN_HIST = 500, BASE_P = 5, BASE_GAP = 20;
const PERIODS = { cal: ['2001-01-01', '2013-12-31'], ver: ['2014-01-01', '9999-12-31'] };
// elenchi [nome, [inizio, fine]] (non oggetti: in JavaScript le chiavi come '2008' finirebbero prima di '2001-02')
const CRISES = [
  ['2008', ['2007-10-01', '2009-03-31']], ['2011', ['2011-07-01', '2011-12-31']], ['2015-16', ['2015-08-01', '2016-03-31']],
  ['2018', ['2018-01-26', '2018-12-31']], ['2020', ['2020-02-15', '2020-04-30']], ['2022', ['2022-01-01', '2022-10-31']],
  ['2025', ['2025-02-15', '2025-05-31']],
];
const BEARS = [['2001-02', ['2001-01-01', '2003-03-31']], ['2008', ['2007-10-01', '2009-03-31']], ['2022', ['2022-01-01', '2022-10-31']]];
const RULES = ['R1', 'R2', 'R3', 'R4', 'R5'];
const ALL_RULES = ['R0', 'R0z', ...RULES];
const periodOf = (d) => (d >= PERIODS.cal[0] && d <= PERIODS.cal[1] ? 'cal' : d >= PERIODS.ver[0] ? 'ver' : null);
const inWin = (d, w) => d >= w[0] && d <= w[1];

// ---------- serie ----------
// Percentile a finestra crescente: inserimento ordinato, valore in posizione floor(q·(N−1)) con a[t] compreso
function expandingPct(a, q, minHist = MIN_HIST) {
  const out = new Array(a.length).fill(null), s = [];
  for (let t = 0; t < a.length; t++) {
    const v = a[t];
    if (v == null) continue;
    const before = s.length;
    let lo = 0, hi = s.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (s[mid] <= v) lo = mid + 1; else hi = mid; }
    s.splice(lo, 0, v);
    if (before >= minHist) out[t] = s[Math.floor(q * (s.length - 1))];
  }
  return out;
}
function sma200(c) {
  const out = new Array(c.length).fill(null);
  let s = 0, k = 0;
  for (let t = 0; t < c.length; t++) {
    if (c[t] == null) { s = 0; k = 0; continue; }
    s += c[t]; k++;
    if (k > 200) { s -= c[t - 200]; k = 200; }
    if (k === 200) out[t] = s / 200;
  }
  return out;
}
const ddWithin = (c, t, k) => {
  if (t + k >= c.length || c[t] == null) return null;
  let m = c[t];
  for (let i = t; i <= t + k; i++) { if (c[i] == null) return null; m = Math.min(m, c[i]); }
  return (m / c[t] - 1) * 100;
};
function outcome(c, t) {
  const dd63 = ddWithin(c, t, 63);
  return { r21: forward(c, t, 21), r63: forward(c, t, 63), dd21: ddWithin(c, t, 21), dd63, near: dd63 == null ? null : dd63 >= -3 };
}

// Un "universo": per ogni chiave le serie allineate (dates, close, pct200, pct50, pct20, n), il livello blu, la macchina
function loadIndices() {
  const U = {};
  for (const k of Object.keys(CFG)) {
    const X = indexSeries(IX[k]);
    U[k] = { dates: X.dates, close: X.close, pct200: X.pct200, pct50: X.pct50, pct20: X.pct20, n: X.n, blue: CFG[k].blue };
  }
  return U;
}
function loadSectors() {
  const S = R('data/sectors.json'), B = R('data/breadth.json'), U = {};
  for (const k of SECTOR_KEYS) {
    const br = breadthSeries(B, k, S.dates);
    U[k] = { dates: S.dates, close: S.adjclose[k], pct200: br.pct200, pct50: br.pct50, pct20: br.pct20, n: br.n, blue: TH.blue[k] };
  }
  return U;
}
function prepare(U) {
  for (const x of Object.values(U)) {
    x.sma = sma200(x.close);
    x.pc = {}; // cache dei percentili: chiave 'pct50:5'
    x.m = runMachine(priceSeries(x.close), { pct200: x.pct200, pct50: x.pct50, pct20: x.pct20, n: x.n }, x.blue, PARAMS);
    x.out = x.dates.map((_, t) => outcome(x.close, t));
  }
}
const pctOf = (x, ser, p) => { const k = ser + ':' + p; if (!x.pc[k]) x.pc[k] = expandingPct(x[ser], p / 100); return x.pc[k]; };
// seduta valutabile (base): c'è la chiusura e ci sono pct50 e il suo percentile al 5° (la storia minima non dipende da p).
// La chiusura manca per i settori prima che esista l'ETF (XLRE, XLC): lì la breadth c'è ma il segnale non si misura.
const evaluable = (x, t) => x.close[t] != null && x.pct50[t] != null && pctOf(x, 'pct50', BASE_P)[t] != null;

// Condizione della regola: true/false, null se non valutabile
function condition(x, rule, p) {
  const L = x.dates.length, P50 = pctOf(x, 'pct50', p), out = new Array(L).fill(null);
  const low = (t) => (x.pct50[t] == null || P50[t] == null ? null : x.pct50[t] <= P50[t]);
  if (rule === 'R5') { const P20 = pctOf(x, 'pct20', p), P50b = pctOf(x, 'pct50', 2 * p);
    for (let t = 0; t < L; t++) if (x.close[t] != null && x.pct20[t] != null && P20[t] != null && x.pct50[t] != null && P50b[t] != null) out[t] = x.pct20[t] <= P20[t] && x.pct50[t] <= P50b[t];
    return out; }
  for (let t = 0; t < L; t++) {
    const b = low(t);
    if (b == null || x.close[t] == null) continue;
    if (rule === 'R1') out[t] = b;
    else if (rule === 'R2') out[t] = b && x.pct200[t] != null && x.pct200[t] > x.blue + 10;
    else if (rule === 'R3') out[t] = b && x.sma[t] != null && x.close[t] > x.sma[t];
    else if (rule === 'R4') {
      let m = Infinity;
      for (let s = Math.max(0, t - 10); s <= t; s++) if (low(s)) m = Math.min(m, x.pct50[s]);
      out[t] = m < Infinity && x.pct50[t] >= m + 30;
    }
  }
  return out;
}
function signalsFrom(cond, gap) {
  const sig = [];
  let off = 0;
  for (let t = 0; t < cond.length; t++) {
    if (cond[t] == null) continue;
    if (cond[t]) { if (off >= gap) sig.push(t); off = 0; } else off++;
  }
  return sig;
}
// Segnali di una regola su tutto l'universo: [{k, t, d, ...outcome}]
function ruleSignals(U, rule, p = BASE_P, gap = BASE_GAP) {
  const rows = [];
  let alarm = 0, evalN = 0;
  for (const [k, x] of Object.entries(U)) {
    let ts;
    if (rule === 'R0' || rule === 'R0z') {
      const code = rule === 'R0' ? 'trig' : 'setup';
      ts = x.m.events.filter((e) => e.code === code && evaluable(x, e.t)).map((e) => e.t);
      for (let t = 0; t < x.dates.length; t++) if (evaluable(x, t)) { evalN++; if (rule === 'R0' ? x.m.days[t] === 'trig' : x.m.days[t] === 'setup') alarm++; }
    } else {
      const cond = condition(x, rule, p);
      ts = signalsFrom(cond, gap);
      for (let t = 0; t < cond.length; t++) if (cond[t] != null) { evalN++; if (cond[t]) alarm++; }
    }
    for (const t of ts) rows.push({ k, t, d: x.dates[t], close: x.close[t], pct50: x.pct50[t], pct200: x.pct200[t], ...x.out[t] });
  }
  rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.k < b.k ? -1 : 1));
  return { rows, alarmShare: evalN ? (100 * alarm) / evalN : null };
}

// ---------- statistiche ----------
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
function stats(rows) {
  const v = (f) => rows.map((r) => r[f]).filter((y) => y != null);
  const a21 = v('r21'), a63 = v('r63'), nr = v('near');
  return {
    n: rows.length, n63: a63.length,
    med21: r1(median(a21)), pos21: a21.length ? r1((100 * a21.filter((y) => y > 0).length) / a21.length) : null,
    med63: r1(median(a63)), pos63n: a63.filter((y) => y > 0).length, pos63: a63.length ? r1((100 * a63.filter((y) => y > 0).length) / a63.length) : null,
    dd21: r1(median(v('dd21'))), dd63: r1(median(v('dd63'))),
    near: nr.length ? r1((100 * nr.filter(Boolean).length) / nr.length) : null, nearN: nr.filter(Boolean).length,
    raw: { med63: median(a63), pos63: a63.length ? (100 * a63.filter((y) => y > 0).length) / a63.length : null }, // per il criterio, senza arrotondare
  };
}
// Base: le sedute valutabili di ogni chiave per periodo (righe con le misure)
function baseRows(U) {
  const B = { cal: [], ver: [], byKey: {} };
  for (const [k, x] of Object.entries(U)) {
    B.byKey[k] = { cal: [], ver: [] };
    for (let t = 0; t < x.dates.length; t++) {
      if (!evaluable(x, t)) continue;
      const p = periodOf(x.dates[t]);
      if (!p) continue;
      B[p].push(x.out[t]); B.byKey[k][p].push(x.out[t]);
    }
  }
  const S = { cal: stats(B.cal), ver: stats(B.ver), byKey: {} };
  for (const k of Object.keys(B.byKey)) S.byKey[k] = { cal: stats(B.byKey[k].cal), ver: stats(B.byKey[k].ver) };
  return S;
}
// Giorni feriali da a (escluso) a b (compreso)
function weekdays(a, b) {
  const t0 = Date.parse(a + 'T12:00:00Z'), t1 = Date.parse(b + 'T12:00:00Z');
  let n = 0;
  for (let t = t0 + 86400000; t <= t1; t += 86400000) { const w = new Date(t).getUTCDay(); if (w % 6) n++; }
  return n;
}
function episodes(rows) {
  const eps = [];
  for (const r of rows) {
    const e = eps.at(-1);
    if (e && weekdays(e.last, r.d) <= 10) { e.rows.push(r); e.last = r.d; } else eps.push({ first: r.d, last: r.d, rows: [r] });
  }
  return eps.map((e) => {
    const m = (f) => median(e.rows.map((r) => r[f]));
    const dd63 = m('dd63');
    return { first: e.first, last: e.last, n: e.rows.length, keys: [...new Set(e.rows.map((r) => r.k))].join(' '),
      d: e.first, r21: m('r21'), r63: m('r63'), dd21: m('dd21'), dd63, near: dd63 == null ? null : dd63 >= -3 };
  });
}
const passes = (s, b) => s.raw.med63 != null && b.raw.med63 != null && s.raw.pos63 != null && s.raw.med63 >= b.raw.med63 + 2 && s.raw.pos63 >= b.raw.pos63 + 10;

function evaluateRule(U, base, rows) {
  const per = {}, perEp = {};
  const eps = episodes(rows);
  for (const p of ['cal', 'ver']) {
    per[p] = stats(rows.filter((r) => periodOf(r.d) === p));
    perEp[p] = stats(eps.filter((e) => periodOf(e.first) === p));
    per[p].ok = passes(per[p], base[p]); perEp[p].ok = passes(perEp[p], base[p]);
    per[p].dMed63 = r1(per[p].med63 - base[p].med63); per[p].dPos63 = r1(per[p].pos63 - base[p].pos63);
    perEp[p].dMed63 = r1(perEp[p].med63 - base[p].med63); perEp[p].dPos63 = r1(perEp[p].pos63 - base[p].pos63);
  }
  const byKey = {};
  for (const k of Object.keys(U)) {
    byKey[k] = {};
    for (const p of ['cal', 'ver']) {
      const s = stats(rows.filter((r) => r.k === k && periodOf(r.d) === p)), b = base.byKey[k][p];
      byKey[k][p] = { n: s.n, n63: s.n63, med63: s.med63, pos63: s.pos63, base63: b.med63, basePos63: b.pos63, near: s.near, ok: s.n63 >= 5 ? passes(s, b) : null };
    }
  }
  const elig = Object.values(byKey).filter((v) => v.ver.ok != null), okN = elig.filter((v) => v.ver.ok).length;
  const c3 = { eligible: elig.length, pass: okN, share: elig.length ? r1((100 * okN) / elig.length) : null,
    ok: elig.length >= 3 ? okN / elig.length >= 0.6 : null };
  const sigOK = per.cal.ok && per.ver.ok, epOK = perEp.cal.ok && perEp.ver.ok;
  const verdict = sigOK && c3.ok === true && epOK ? 'utile'
    : (!sigOK && !epOK) || c3.ok === false ? 'non utile' : 'incerto';
  const crises = {};
  for (const [c, w] of CRISES) {
    const rr = rows.filter((r) => inWin(r.d, w)), s = stats(rr);
    crises[c] = { ...s, indices: new Set(rr.map((r) => r.k)).size, episodes: eps.filter((e) => inWin(e.first, w)).length };
  }
  const bears = {};
  for (const [c, w] of BEARS) {
    const rr = rows.filter((r) => inWin(r.d, w)).map((r) => {
      const x = U[r.k];
      let m = x.close[r.t];
      for (let i = r.t; i < x.dates.length && x.dates[i] <= w[1]; i++) if (x.close[i] != null) m = Math.min(m, x.close[i]);
      return { k: r.k, d: r.d, further: r1((m / x.close[r.t] - 1) * 100), r63: r1(r.r63) };
    });
    const down = rr.filter((r) => r.further < -3), f = down.map((r) => r.further);
    bears[c] = { n: rr.length, indices: new Set(rr.map((r) => r.k)).size, kept: down.length,
      medFurther: r1(median(f)), worst: f.length ? Math.min(...f) : null, medR63: r1(median(rr.map((r) => r.r63))), signals: rr };
  }
  return { n: rows.length, episodes: eps.length, per, perEp, byKey, c3, verdict, crises, bears,
    episodeList: eps.map((e) => ({ first: e.first, last: e.last, n: e.n, keys: e.keys, r63: r1(e.r63), dd63: r1(e.dd63) })) };
}

// ---------- ricalcolo indipendente ----------
function checks(U) {
  let nPct = 0, nSig = 0, nRet = 0;
  for (const [k, x] of Object.entries(U)) {
    const P = pctOf(x, 'pct50', 5);
    const step = Math.max(1, Math.floor(x.dates.length / 40));
    for (let t = 0; t < x.dates.length; t += step) {
      const hist = x.pct50.slice(0, t + 1).filter((v) => v != null);
      const exp = x.pct50[t] == null || hist.length - 1 < MIN_HIST ? null : [...hist].sort((a, b) => a - b)[Math.floor(0.05 * (hist.length - 1))];
      if (exp !== P[t]) throw new Error(`percentile ${k} ${x.dates[t]}: ${exp} vs ${P[t]}`);
      nPct++;
      const c = x.close;
      if (t + 63 < c.length && c[t] != null && c[t + 63] != null) {
        const r = 100 * (c[t + 63] - c[t]) / c[t];
        if (Math.abs(r - x.out[t].r63) > 1e-9) throw new Error(`rendimento ${k} ${x.dates[t]}`);
        nRet++;
      }
    }
    // segnali R1 con un ciclo ingenuo (percentile ricalcolato da capo dove serve)
    const naive = [];
    let falses = 0;
    const vals = [];
    for (let t = 0; t < x.dates.length; t++) {
      const v = x.pct50[t];
      if (v == null) continue;
      vals.push(v);
      if (vals.length - 1 < MIN_HIST || x.close[t] == null) continue;
      let below = 0; // v ≤ percentile ⇔ v ≤ s[floor(q(N−1))]: conta i valori < v
      for (const y of vals) if (y < v) below++;
      const isLow = below <= Math.floor(0.05 * (vals.length - 1));
      if (isLow) { if (falses >= 20) naive.push(t); falses = 0; } else falses++;
    }
    const fast = signalsFrom(condition(x, 'R1', 5), 20);
    if (naive.join() !== fast.join()) throw new Error(`segnali R1 ${k}: ${naive.length} vs ${fast.length}`);
    nSig += naive.length;
  }
  return { percentili: nPct, rendimenti: nRet, segnaliR1: nSig, esito: 'coincidono' };
}

// ---------- esecuzione ----------
function runUniverse(U, label, withSens) {
  prepare(U);
  const base = baseRows(U), res = {}, sig = {};
  for (const r of ALL_RULES) {
    const { rows, alarmShare } = ruleSignals(U, r);
    sig[r] = rows;
    res[r] = { ...evaluateRule(U, base, rows), alarmShare: r1(alarmShare) };
  }
  let best = null, sens = null;
  if (withSens) {
    best = RULES.map((r) => [r, Math.min(res[r].per.cal.dMed63 ?? -Infinity, res[r].per.ver.dMed63 ?? -Infinity)]).sort((a, b) => b[1] - a[1])[0][0];
    sens = [];
    for (const p of [3, 5, 10]) for (const gap of [10, 20, 40]) {
      const { rows } = ruleSignals(U, best, p, gap), ev = evaluateRule(U, base, rows);
      sens.push({ p, gap, n: ev.n, episodes: ev.episodes, cal: pick(ev.per.cal), ver: pick(ev.per.ver), epCal: pick(ev.perEp.cal), epVer: pick(ev.perEp.ver), c3: ev.c3, verdict: ev.verdict });
    }
  }
  const firstEval = Object.fromEntries(Object.entries(U).map(([k, x]) => { const t = x.dates.findIndex((_, i) => evaluable(x, i)); return [k, t < 0 ? null : x.dates[t]]; }));
  return { label, firstEval, base: { cal: base.cal, ver: base.ver, byKey: base.byKey }, rules: res, best, sens,
    signals: Object.fromEntries(Object.entries(sig).map(([r, rows]) => [r, rows.map((x) => ({ k: x.k, d: x.d, pct50: r1(x.pct50), pct200: r1(x.pct200), r21: r1(x.r21), r63: r1(x.r63), dd21: r1(x.dd21), dd63: r1(x.dd63), near: x.near }))])) };
}
const pick = (s) => ({ n: s.n, n63: s.n63, med63: s.med63, pos63: s.pos63, dMed63: s.dMed63, dPos63: s.dPos63, near: s.near, ok: s.ok });

const UI = loadIndices();
const IND = runUniverse(UI, 'indici', true);
const CHK = checks(UI);
const US = loadSectors();
const SEC = runUniverse(US, 'settori', false);
const CHK_S = checks(US);
const asOf = Object.values(UI).map((x) => x.dates.at(-1)).sort().at(-1);
const OUT = { generated: new Date().toISOString().slice(0, 10), asOf, params: { minHist: MIN_HIST, p: BASE_P, gap: BASE_GAP, periods: PERIODS, crises: CRISES, bears: BEARS, machine: PARAMS },
  checks: { indici: CHK, settori: CHK_S }, indices: IND, sectors: SEC };
fs.writeFileSync(path.join(HERE, '..', 'pattern.json'), JSON.stringify(OUT) + '\n');

// ---------- tabelle Markdown ----------
if (process.argv.includes('--md')) {
  const f = (v, s = '') => (v == null ? '—' : String(v).replace('.', ',') + s);
  const sg = (v) => (v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ','));
  const yn = (v) => (v == null ? 'n.v.' : v ? 'sì' : 'no');
  const NAME = { R0: 'R0 trigger', R0z: 'R0z zona blu', R1: 'R1 tocco della 50', R2: 'R2 correzione in mercato sano', R3: 'R3 sopra la 200 del prezzo', R4: 'R4 ripartenza', R5: 'R5 doppio estremo' };
  for (const U of [IND, SEC]) {
    console.log(`\n## ${U.label}: prima seduta valutabile\n\n${Object.entries(U.firstEval).map(([k, d]) => `${k} ${d}`).join(' · ')}`);
    console.log(`\n## ${U.label}: base\n`);
    console.log('| Periodo | Sedute | Mediana 21 | Positivi 21 | Mediana 63 | Positivi 63 | Calo max 21 | Calo max 63 | Vicino al minimo |\n|---|---|---|---|---|---|---|---|---|');
    for (const p of ['cal', 'ver']) { const b = U.base[p]; console.log(`| ${p === 'cal' ? '2001–2013' : '2014–oggi'} | ${b.n} | ${f(b.med21)} | ${f(b.pos21, '%')} | ${f(b.med63)} | ${f(b.pos63, '%')} | ${f(b.dd21)} | ${f(b.dd63)} | ${f(b.near, '%')} |`); }
    console.log(`\n## ${U.label}: tabella principale (segnali; tra parentesi lo scarto dalla base)\n`);
    console.log('| Regola | Segnali | Episodi | In allarme | Periodo | Segnali (con 63) | Mediana 21 | Positivi 21 | Mediana 63 | Positivi 63 | Calo max 21 | Calo max 63 | Vicino al minimo | Criterio |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of ALL_RULES) { const x = U.rules[r];
      for (const p of ['cal', 'ver']) { const s = x.per[p];
        console.log(`| ${p === 'cal' ? NAME[r] : ''} | ${p === 'cal' ? x.n : ''} | ${p === 'cal' ? x.episodes : ''} | ${p === 'cal' ? f(x.alarmShare, '%') : ''} | ${p === 'cal' ? '2001–13' : '2014–'} | ${s.n} (${s.n63}) | ${f(s.med21)} | ${f(s.pos21, '%')} | ${f(s.med63)} (${sg(s.dMed63)}) | ${s.pos63n}/${s.n63} = ${f(s.pos63, '%')} (${sg(s.dPos63)}) | ${f(s.dd21)} | ${f(s.dd63)} | ${f(s.near, '%')} | ${yn(s.ok)} |`); } }
    console.log(`\n## ${U.label}: episodi globali\n`);
    console.log('| Regola | Periodo | Episodi (con 63) | Mediana 63 | Positivi 63 | Calo max 63 | Vicino al minimo | Criterio |\n|---|---|---|---|---|---|---|---|');
    for (const r of ALL_RULES) for (const p of ['cal', 'ver']) { const s = U.rules[r].perEp[p];
      console.log(`| ${p === 'cal' ? NAME[r] : ''} | ${p === 'cal' ? '2001–13' : '2014–'} | ${s.n} (${s.n63}) | ${f(s.med63)} (${sg(s.dMed63)}) | ${s.pos63n}/${s.n63} = ${f(s.pos63, '%')} (${sg(s.dPos63)}) | ${f(s.dd63)} | ${f(s.near, '%')} | ${yn(s.ok)} |`); }
    console.log(`\n## ${U.label}: verdetti\n`);
    console.log('| Regola | C1 calibrazione | C2 verifica | C3 per indice (verifica) | Episodi C1/C2 | Verdetto |\n|---|---|---|---|---|---|');
    for (const r of ALL_RULES) { const x = U.rules[r];
      console.log(`| ${NAME[r]} | ${yn(x.per.cal.ok)} | ${yn(x.per.ver.ok)} | ${x.c3.pass} su ${x.c3.eligible} (${f(x.c3.share, '%')}): ${yn(x.c3.ok)} | ${yn(x.perEp.cal.ok)}/${yn(x.perEp.ver.ok)} | ${x.verdict} |`); }
    console.log(`\n## ${U.label}: per indice (verifica 2014–oggi: segnali con 63, mediana 63 contro base, positivi contro base)\n`);
    const keys = Object.keys(U.base.byKey);
    console.log(`| ${U.label === 'settori' ? 'Settore' : 'Indice'} | Base med63 / pos | ${RULES.join(' | ')} |\n|---|---|${RULES.map(() => '---').join('|')}|`);
    for (const k of keys) { const b = U.base.byKey[k].ver;
      console.log(`| ${k} | ${f(b.med63)} / ${f(b.pos63, '%')} | ${RULES.map((r) => { const v = U.rules[r].byKey[k].ver; return v.n63 ? `${v.n63}: ${f(v.med63)} / ${f(v.pos63, '%')}${v.ok == null ? '' : v.ok ? ' ✓' : ' ✗'}` : '—'; }).join(' | ')} |`); }
    console.log(`\n## ${U.label}: per crisi (segnali, indici, mediana 63, positivi 63, calo max 63, vicino al minimo)\n`);
    console.log(`| Crisi | ${ALL_RULES.map((r) => r).join(' | ')} |\n|---|${ALL_RULES.map(() => '---').join('|')}|`);
    for (const [c] of CRISES) console.log(`| ${c} | ${ALL_RULES.map((r) => { const s = U.rules[r].crises[c]; return s.n ? `${s.n} (${s.indices} ind., ${s.episodes} ep.): ${f(s.med63)}, ${s.pos63n}/${s.n63}, ${f(s.dd63)}, ${s.nearN}/${s.n63}` : '0'; }).join(' | ')} |`);
    console.log(`\n## ${U.label}: mercati orso (segnali; che hanno visto un calo ulteriore oltre −3% entro la fine della finestra; mediana e peggiore del calo ulteriore; mediana 63)\n`);
    console.log(`| Orso | ${ALL_RULES.join(' | ')} |\n|---|${ALL_RULES.map(() => '---').join('|')}|`);
    for (const [c] of BEARS) console.log(`| ${c} | ${ALL_RULES.map((r) => { const s = U.rules[r].bears[c]; return s.n ? `${s.n}; ${s.kept} giù; ${f(s.medFurther)} / ${f(s.worst)}; ${f(s.medR63)}` : '0'; }).join(' | ')} |`);
    if (U.sens) {
      console.log(`\n## ${U.label}: sensibilità della regola migliore (${U.best})\n`);
      console.log('| p | gap | Segnali | Episodi | Cal: med63 (Δ) / pos (Δ) | Ver: med63 (Δ) / pos (Δ) | Ep. cal Δmed/Δpos | Ep. ver Δmed/Δpos | C3 | Verdetto |\n|---|---|---|---|---|---|---|---|---|---|');
      for (const s of U.sens) console.log(`| ${s.p} | ${s.gap} | ${s.n} | ${s.episodes} | ${f(s.cal.med63)} (${sg(s.cal.dMed63)}) / ${f(s.cal.pos63, '%')} (${sg(s.cal.dPos63)}) | ${f(s.ver.med63)} (${sg(s.ver.dMed63)}) / ${f(s.ver.pos63, '%')} (${sg(s.ver.dPos63)}) | ${sg(s.epCal.dMed63)}/${sg(s.epCal.dPos63)} | ${sg(s.epVer.dMed63)}/${sg(s.epVer.dPos63)} | ${s.c3.pass}/${s.c3.eligible} | ${s.verdict} |`);
    }
  }
  console.log('\nControlli:', JSON.stringify({ indici: CHK, settori: CHK_S }), 'dati al', asOf);
}
