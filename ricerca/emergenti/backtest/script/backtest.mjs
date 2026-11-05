// Backtest «Emergenti»: lo strato macro (valuta locale contro dollaro, dollaro contro le valute emergenti) aggiunge
// informazione ai possibili bottom che l'app trova con la breadth (zona blu e trigger della macchina a stati)?
//
// METODO (definizioni fissate prima di guardare i risultati; le varianti sono solo sensibilità)
// - Indici: CSI300, NIFTY50, IBOV, KOSPI200, TWN, HSI, EEM, dai dati dell'app (data/indices*.json, js/indexdata.js),
//   breadth con i membri di oggi (approssimazione dichiarata dall'app). Macchina a stati: runMachine di js/signals.js con
//   i parametri di config/thresholds.json e i livelli blu di config/indices.json, come l'app (js/indices.js).
// - Cambi (Yahoo, unità di valuta locale per dollaro, calendario proprio del cambio): CNY=X, INR=X, BRL=X, KRW=X, TWD=X.
//   HSI (HKD agganciato) ed EEM (in dollari): solo il dollaro. HKD=X serve solo per i rendimenti in dollari dell'HSI.
//   Pulizia dichiarata: un errore di stampa isolato (salto oltre il 3% che si annulla il giorno dopo entro l'1%; 1% e 0,3%
//   per CNY e HKD) diventa un giorno mancante; la variazione a w sedute e il massimo a w sedute sono nulli se la finestra
//   scavalca un buco di oltre 10 giorni di calendario; deviazione standard (756) e finestra di 126 sedute per z chiedono
//   almeno il 90% dei valori presenti e, per la deviazione standard, non più di 3,5 anni di calendario (altrimenti un buco di un mese, come KRW nell'agosto 2008, toglierebbe quasi 4 anni).
// - F (stop della valuta), sul calendario del cambio: r = ln(cambio_t / cambio_{t-w}), w = 63; sd = deviazione standard
//   (campionaria) degli r delle ultime 756 sedute fino a t compreso; z = r / sd. F = 1 se z ≥ 1 in almeno una delle ultime
//   126 sedute E ln(max del cambio nelle ultime w sedute / cambio_t) ≥ 0,5·sd. F' (confronto): cambio sotto la media a 50.
// - D (dollaro emergente favorevole), sul calendario di FRED: DTWEXEMEGS sotto la media a 200 sedute E variazione a 63
//   sedute negativa. FRED pubblica la serie una volta alla settimana (H.10, il lunedì per la settimana prima): il valore
//   del giorno d si usa dal martedì della settimana successiva, l'ultimo pubblicato (eccezione dichiarata alla regola
//   «niente riempimento», perché è quello che un utente vede quel giorno). Confronti: D dello stesso giorno (guarda avanti
//   fino a una settimana) e DX-Y.NYB (Yahoo, ICE, stesso giorno).
// - Punteggio = F + D (0-2); HSI ed EEM solo D (0-1). «Pieno» = 2 (o 1 per HSI/EEM). Il valore del giorno t dell'indice
//   esiste solo se il cambio ha una riga con la stessa data (altrimenti «—», nessun riempimento).
// - Rendimenti: dalla chiusura della seduta DOPO il segnale (t+1) a t+1+h, in valuta locale (prezzo indice) e in dollari
//   (prezzo / cambio dello stesso giorno; nullo se il cambio manca in una delle due date). EEM è già in dollari.
// - Fallito: dopo il trigger, prima del trigger successivo, la macchina segna 'fail' (come la tabella degli episodi dell'app).
// - Crisi (finestre decise prima): 2008 (2007-10→2009-06), 2011 (2011-05→2012-06), 2015-16 (2015-06→2016-06),
//   2018 (2018-02→2019-01), 2020 (2020-01→2020-12), 2022 (2021-07→2022-12), 2024-25 (2024-01→2025-12), altro.
// - H3: tutte le sedute con il punteggio; periodo tenuto da parte dal 2016-01-01.
// - H5: minimi principali = episodi di drawdown oltre il 25% dal massimo di chiusura precedente (episodio = dal massimo al
//   nuovo massimo); minimo = chiusura più bassa dell'episodio. Sensibilità: drawdown dal massimo a 252 sedute (come l'app).
//   Anticipo = prima attivazione di F (passaggio a 1) tra 126 sedute prima e 126 dopo il minimo, in sedute dell'indice.
// Mediane con median() di js/signals.js. Solo dati fino a quella seduta per soglie, medie e deviazioni standard.
//
// Uso: node ricerca/emergenti/backtest/script/scarica.mjs   (una volta, cache in ricerca/emergenti/cache/)
//      node ricerca/emergenti/backtest/script/backtest.mjs  → ricerca/emergenti/backtest/risultati.json (+ tabelle a schermo)
//      python3 -I ricerca/emergenti/backtest/script/verifica.py  (ricalcolo indipendente, confronta con risultati.json)
import fs from 'node:fs';
import { priceSeries, runMachine, median, DEFAULT_PARAMS } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';

const ROOT = new URL('../../../../', import.meta.url);
const R = (f) => JSON.parse(fs.readFileSync(new URL(f, ROOT)));
const th = R('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params };
const CFG = R('config/indices.json').indices;
const IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
const cache = (s) => R('ricerca/emergenti/cache/' + s.replace(/[^A-Za-z0-9]/g, '_') + '.json');

export const INDICES = ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM'];
export const CCY = { CSI300: 'CNY=X', NIFTY50: 'INR=X', IBOV: 'BRL=X', KOSPI200: 'KRW=X', TWN: 'TWD=X' };
export const USD = { ...CCY, HSI: 'HKD=X' }; // per i rendimenti in dollari
export const FRED_CCY = { 'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS' };
export const GROUP = { 'BRL=X': 'libere', 'KRW=X': 'libere', 'TWD=X': 'intermedia', 'CNY=X': 'gestite', 'INR=X': 'gestite' };
export const CRISES = [
  ['2008', '2007-10-01', '2009-06-30'], ['2011', '2011-05-01', '2012-06-30'], ['2015-16', '2015-06-01', '2016-06-30'],
  ['2018', '2018-02-01', '2019-01-31'], ['2020', '2020-01-01', '2020-12-31'], ['2022', '2021-07-01', '2022-12-31'],
  ['2024-25', '2024-01-01', '2025-12-31'],
];
const crisisOf = (d) => (CRISES.find(([, a, b]) => d >= a && d <= b) || ['altro'])[0];
const HOLD = '2016-01-01';
const DAY = 86400000;

// ---------- serie dei cambi: pulizia degli errori isolati e buchi ----------
function loadFx(sym, src = 'yahoo') {
  const rows = cache(src === 'fred' ? FRED_CCY[sym] || sym : sym).rows;
  const thr = /CNY|HKD|DEXCH/.test(sym) ? 0.01 : 0.03, back = /CNY|HKD|DEXCH/.test(sym) ? 0.003 : 0.01;
  const bad = [];
  const v = rows.map((r) => r[1]);
  for (let i = 1; i + 1 < rows.length; i++) {
    const r1 = Math.log(v[i] / v[i - 1]), r2 = Math.log(v[i + 1] / v[i]);
    if (Math.abs(r1) > thr && Math.abs(r2) > thr && Math.sign(r1) !== Math.sign(r2) && Math.abs(r1 + r2) < back) bad.push(i);
  }
  const badSet = new Set(bad);
  const dates = [], val = [];
  rows.forEach((r, i) => { if (!badSet.has(i)) { dates.push(r[0]); val.push(r[1]); } });
  // brk[i] = numero di buchi (> 10 giorni) fino alla riga i: una finestra [i-k, i] scavalca un buco se brk cambia
  const brk = new Array(dates.length).fill(0);
  for (let i = 1; i < dates.length; i++) brk[i] = brk[i - 1] + ((Date.parse(dates[i]) - Date.parse(dates[i - 1])) / DAY > 10 ? 1 : 0);
  return { sym, dates, val, brk, removed: bad.map((i) => `${rows[i][0]} ${rows[i][1].toFixed(4)}`) };
}
const okWin = (S, i, k) => i - k >= 0 && S.brk[i] === S.brk[i - k];

// F sul calendario del cambio. opts: w (finestra della variazione), z (soglia), look (126), sdN (756), back (0,5)
export function computeF(S, { w = 63, z = 1, look = 126, sdN = 756, back = 0.5 } = {}) {
  const n = S.val.length, lr = new Array(n).fill(null), sd = new Array(n).fill(null), zz = new Array(n).fill(null), F = new Array(n).fill(null);
  for (let i = 0; i < n; i++) if (okWin(S, i, w)) lr[i] = Math.log(S.val[i] / S.val[i - w]);
  // deviazione standard sulle ultime sdN sedute (tutte presenti), somme scorrevoli
  let s1 = 0, s2 = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    if (lr[i] != null) { s1 += lr[i]; s2 += lr[i] * lr[i]; cnt++; }
    const j = i - sdN;
    if (j >= 0 && lr[j] != null) { s1 -= lr[j]; s2 -= lr[j] * lr[j]; cnt--; }
    if (cnt >= 0.9 * sdN && (Date.parse(S.dates[i]) - Date.parse(S.dates[Math.max(0, i - sdN + 1)])) / DAY <= 1278) { const m = s1 / cnt; sd[i] = Math.sqrt(Math.max(0, (s2 - cnt * m * m) / (cnt - 1))); }
    if (sd[i] && lr[i] != null) zz[i] = lr[i] / sd[i];
  }
  for (let i = 0; i < n; i++) {
    if (sd[i] == null || i - look + 1 < 0 || !okWin(S, i, w - 1)) continue;
    let hit = false, got = 0;
    for (let k = i - look + 1; k <= i; k++) { if (zz[k] == null) continue; got++; if (zz[k] >= z) hit = true; }
    if (got < 0.9 * look) continue;
    let mx = -Infinity; for (let k = i - w + 1; k <= i; k++) mx = Math.max(mx, S.val[k]);
    F[i] = hit && Math.log(mx / S.val[i]) >= back * sd[i] ? 1 : 0;
  }
  return F;
}
export function computeFsma(S, ma = 50) {
  const n = S.val.length, F = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (!okWin(S, i, ma - 1)) continue;
    let s = 0; for (let k = i - ma + 1; k <= i; k++) s += S.val[k];
    F[i] = S.val[i] < s / ma ? 1 : 0;
  }
  return F;
}
// D sul calendario della serie del dollaro
export function computeD(S, { ma = 200, w = 63 } = {}) {
  const n = S.val.length, D = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (!okWin(S, i, Math.max(ma - 1, w))) continue;
    let s = 0; for (let k = i - ma + 1; k <= i; k++) s += S.val[k];
    D[i] = S.val[i] < s / ma && S.val[i] < S.val[i - w] ? 1 : 0;
  }
  return D;
}
// valore sul calendario dell'indice: stessa data (null se manca) oppure ultimo pubblicato (FRED H.10)
function exactMap(S, arr) { const m = new Map(); S.dates.forEach((d, i) => m.set(d, arr[i])); return (d) => (m.has(d) ? m.get(d) : null); }
const availFRED = (d) => { // martedì della settimana dopo quella del giorno d
  const x = new Date(d + 'T12:00:00Z'), dow = x.getUTCDay(); // 0 dom … 6 sab
  const toNextMon = ((8 - dow) % 7) || 7; x.setUTCDate(x.getUTCDate() + toNextMon + 1);
  return x.toISOString().slice(0, 10);
};
function publishedMap(S, arr) {
  const av = S.dates.map(availFRED);
  return (dates) => { // array allineato a `dates` (crescenti)
    const out = new Array(dates.length).fill(null); let j = -1;
    for (let t = 0; t < dates.length; t++) {
      while (j + 1 < av.length && av[j + 1] <= dates[t]) j++;
      // ultimo valore pubblicato, se non più vecchio di 21 giorni rispetto alla data (altrimenti la serie è ferma: «—»)
      if (j >= 0 && (Date.parse(dates[t]) - Date.parse(S.dates[j])) / DAY <= 21) out[t] = arr[j];
    }
    return out;
  };
}

// ---------- dati degli indici e macchina ----------
const BASE = {};
for (const k of INDICES) {
  const X = indexSeries(IX[k]);
  const m = runMachine(priceSeries(X.close), X, CFG[k].blue, P);
  const start = m.days.findIndex((d) => d != null);
  const trig = [], setups = m.setups.map((s) => s.t);
  m.events.forEach((e, i) => {
    if (e.code !== 'trig') return;
    let failed = false;
    for (let j = i + 1; j < m.events.length && m.events[j].code !== 'trig'; j++) if (m.events[j].code === 'fail') { failed = true; break; }
    trig.push({ t: e.t, failed });
  });
  // fallito per un ingresso in zona blu: almeno un 'fail' nell'episodio
  const setupFail = m.setups.map((s) => s.fails > 0);
  BASE[k] = { X, m, start, trig, setups, setupFail };
}
const FX = {}; for (const s of new Set(Object.values(USD))) FX[s] = loadFx(s);
const FXF = {}; for (const s of Object.values(CCY)) FXF[s] = loadFx(s, 'fred');
const DTW = loadFx('DTWEXEMEGS'), DXY = loadFx('DX-Y.NYB');

const fwd = (a, t, h) => (t + 1 + h < a.length && a[t + 1] != null && a[t + 1 + h] != null ? (a[t + 1 + h] / a[t + 1] - 1) * 100 : null);

// Costruisce, per una variante, le serie F, D, punteggio e rendimenti sul calendario di ogni indice
export function build(v = {}) {
  const o = { w: 63, z: 1, ma: 200, dsrc: 'pub', fsrc: 'yahoo', ftype: 'z', ...v };
  const Dsrc = o.dsrc === 'dxy' ? DXY : DTW;
  const Darr = computeD(Dsrc, { ma: o.ma, w: o.w });
  const out = {};
  for (const k of INDICES) {
    const { X } = BASE[k], dates = X.dates, n = dates.length;
    const D = o.dsrc === 'pub' ? publishedMap(Dsrc, Darr)(dates) : dates.map(exactMap(Dsrc, Darr));
    let F = null;
    if (CCY[k]) {
      const S = o.fsrc === 'fred' ? FXF[CCY[k]] : FX[CCY[k]];
      const Fa = o.ftype === 'sma' ? computeFsma(S) : computeF(S, { w: o.w, z: o.z });
      F = o.fsrc === 'fred' ? publishedMap(S, Fa)(dates) : dates.map(exactMap(S, Fa));
    }
    const max = CCY[k] ? 2 : 1;
    const score = dates.map((_, t) => (D[t] == null || (F && F[t] == null) ? null : D[t] + (F ? F[t] : 0)));
    const fxu = USD[k] ? dates.map(exactMap(FX[USD[k]], FX[USD[k]].val)) : null;
    const usd = fxu ? X.close.map((c, t) => (c != null && fxu[t] != null ? c / fxu[t] : null)) : X.close;
    out[k] = { dates, D, F, score, max, close: X.close, usd };
  }
  return { o, by: out };
}

// ---------- statistiche ----------
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
function grp(items) { // items: {r126, r126u, r63, r252, failed}
  const g = (f) => items.map(f).filter((x) => x != null);
  const r = g((x) => x.r126);
  return {
    n: items.length, med126: r1(median(r)), med126usd: r1(median(g((x) => x.r126u))), med63: r1(median(g((x) => x.r63))), med252: r1(median(g((x) => x.r252))),
    pos126: `${r.filter((x) => x > 0).length}/${r.length}`, falliti: `${items.filter((x) => x.failed).length}/${items.length}`,
    quotaFalliti: items.length ? Math.round((100 * items.filter((x) => x.failed).length) / items.length) : null,
  };
}
function signalItems(B, kind) { // kind 'trig' | 'setup'
  const items = [];
  for (const k of INDICES) {
    const S = B.by[k], b = BASE[k];
    const list = kind === 'trig' ? b.trig : b.setups.map((t, i) => ({ t, failed: b.setupFail[i] }));
    for (const { t, failed } of list) {
      const sc = S.score[t];
      items.push({
        k, t, date: S.dates[t], crisis: crisisOf(S.dates[t]), score: sc, full: sc != null && sc === S.max, zero: sc === 0,
        F: S.F ? S.F[t] : null, D: S.D[t], failed, group: CCY[k] ? GROUP[CCY[k]] : 'solo dollaro',
        r63: fwd(S.close, t, 63), r126: fwd(S.close, t, 126), r252: fwd(S.close, t, 252), r126u: fwd(S.usd, t, 126),
      });
    }
  }
  return items;
}
function hyp(items) {
  const full = items.filter((x) => x.full), zero = items.filter((x) => x.zero), part = items.filter((x) => x.score != null && !x.full && !x.zero);
  const res = { tutti: grp(items), pieno: grp(full), parziale: grp(part), zero: grp(zero), mancante: items.filter((x) => x.score == null).length };
  const diff = (a, b) => (a == null || b == null ? null : r1(a - b));
  res.diffLocale = diff(res.pieno.med126, res.zero.med126); res.diffDollari = diff(res.pieno.med126usd, res.zero.med126usd);
  res.menoFalliti = res.pieno.quotaFalliti != null && res.zero.quotaFalliti != null ? res.pieno.quotaFalliti < res.zero.quotaFalliti : null;
  res.perCrisi = {};
  for (const [c] of [...CRISES, ['altro']]) {
    const I = items.filter((x) => x.crisis === c), f = grp(I.filter((x) => x.full)), z = grp(I.filter((x) => x.zero));
    res.perCrisi[c] = { n: I.length, pieno: f, zero: z, diffLocale: diff(f.med126, z.med126), diffDollari: diff(f.med126usd, z.med126usd),
      ok: f.n > 0 && z.n > 0 && f.med126 != null && z.med126 != null ? f.med126 - z.med126 >= 5 && f.quotaFalliti <= z.quotaFalliti : null };
  }
  res.crisiOk = Object.entries(res.perCrisi).filter(([c, x]) => c !== 'altro' && x.ok === true).map(([c]) => c);
  res.crisiConfrontabili = Object.entries(res.perCrisi).filter(([c, x]) => c !== 'altro' && x.ok != null).map(([c]) => c);
  res.superato = res.diffLocale != null && res.diffLocale >= 5 && res.menoFalliti === true && res.crisiOk.length >= 2;
  res.perIndice = Object.fromEntries(INDICES.map((k) => { const I = items.filter((x) => x.k === k); return [k, { n: I.length, pieno: grp(I.filter((x) => x.full)), zero: grp(I.filter((x) => x.zero)), mancante: I.filter((x) => x.score == null).length }]; }));
  return res;
}
function sessions(B, filter = () => true) { // H3: tutte le sedute con il punteggio
  const rows = [];
  for (const k of INDICES) {
    const S = B.by[k];
    for (let t = 0; t < S.dates.length; t++) {
      if (S.score[t] == null || !filter(S.dates[t])) continue;
      rows.push({ k, t, max: S.max, score: S.score[t], F: S.F ? S.F[t] : null, D: S.D[t], date: S.dates[t],
        r63: fwd(S.close, t, 63), r126: fwd(S.close, t, 126), r252: fwd(S.close, t, 252), r126u: fwd(S.usd, t, 126) });
    }
  }
  return rows;
}
function h3table(rows) {
  const m = (I, f) => r1(median(I.map(f).filter((x) => x != null)));
  const row = (I) => ({ n: I.length, r63: m(I, (x) => x.r63), r126: m(I, (x) => x.r126), r252: m(I, (x) => x.r252), r126usd: m(I, (x) => x.r126u) });
  const five = rows.filter((x) => x.max === 2), two = rows.filter((x) => x.max === 1);
  const out = {
    cinqueIndici: { base: row(five), 0: row(five.filter((x) => x.score === 0)), 1: row(five.filter((x) => x.score === 1)), 2: row(five.filter((x) => x.score === 2)) },
    hsiEem: { base: row(two), 0: row(two.filter((x) => x.score === 0)), 1: row(two.filter((x) => x.score === 1)) },
  };
  const c = out.cinqueIndici;
  out.monotono126 = c[0].r126 != null && c[1].r126 != null && c[2].r126 != null && c[0].r126 < c[1].r126 && c[1].r126 < c[2].r126;
  out.pienoMenoBase126 = c[2].r126 != null ? r1(c[2].r126 - c.base.r126) : null;
  out.pienoMenoBase126usd = c[2].r126usd != null ? r1(c[2].r126usd - c.base.r126usd) : null;
  // mediana per indice dello scarto «pieno meno base dello stesso indice» (toglie la mescolanza tra indici)
  out.scartoPerIndice126 = Object.fromEntries(INDICES.map((k) => {
    const I = rows.filter((x) => x.k === k), b = median(I.map((x) => x.r126).filter((x) => x != null)), f = median(I.filter((x) => x.score === x.max).map((x) => x.r126).filter((x) => x != null));
    return [k, { base: r1(b), pieno: r1(f), scarto: f == null || b == null ? null : r1(f - b), quotaPieno: I.length ? Math.round((100 * I.filter((x) => x.score === x.max).length) / I.length) : null }];
  }));
  return out;
}
function h4(B, sig) {
  const out = {};
  for (const g of ['libere', 'intermedia', 'gestite']) {
    const ks = INDICES.filter((k) => CCY[k] && GROUP[CCY[k]] === g);
    const rows = sessions(B).filter((x) => ks.includes(x.k));
    const md = (I, f = (x) => x.r126) => r1(median(I.map(f).filter((x) => x != null)));
    const on = rows.filter((x) => x.F === 1), off = rows.filter((x) => x.F === 0);
    const S = sig.filter((x) => ks.includes(x.k) && x.F != null), son = S.filter((x) => x.F === 1), soff = S.filter((x) => x.F === 0);
    out[g] = {
      indici: ks.join(', '),
      sedute: { F1: { n: on.length, r126: md(on), r126usd: md(on, (x) => x.r126u) }, F0: { n: off.length, r126: md(off), r126usd: md(off, (x) => x.r126u) }, diff: r1(md(on) - md(off)), diffUsd: r1(md(on, (x) => x.r126u) - md(off, (x) => x.r126u)) },
      segnali: { F1: grp(son), F0: grp(soff), diff: son.length && soff.length ? r1(median(son.map((x) => x.r126).filter((x) => x != null)) - median(soff.map((x) => x.r126).filter((x) => x != null))) : null },
    };
  }
  return out;
}
// H5: minimi principali e posizione di F
function lows(k, mode = 'ath') {
  const c = BASE[k].X.close, dates = BASE[k].X.dates, eps = [];
  if (mode === 'ath') {
    let pk = 0, lo = 0, inEp = false;
    for (let t = 1; t < c.length; t++) {
      if (c[t] == null) continue;
      if (c[t] >= c[pk]) { if (inEp && c[lo] / c[pk] - 1 <= -0.25) eps.push({ peak: pk, low: lo, dd: (c[lo] / c[pk] - 1) * 100, recovered: true }); pk = t; lo = t; inEp = false; continue; }
      inEp = true; if (c[t] < c[lo]) lo = t;
    }
    if (inEp && c[lo] / c[pk] - 1 <= -0.25) eps.push({ peak: pk, low: lo, dd: (c[lo] / c[pk] - 1) * 100, recovered: false });
  } else {
    const dd = priceSeries(c).dd; let seg = null;
    const segs = [];
    for (let t = 0; t < c.length; t++) {
      if (dd[t] != null && dd[t] <= -25) { if (seg && t - seg.end <= 63) seg.end = t; else { seg = { start: t, end: t }; segs.push(seg); } }
    }
    for (const s of segs) { let lo = s.start; for (let t = s.start; t <= s.end; t++) if (c[t] != null && c[t] < c[lo]) lo = t; eps.push({ peak: null, low: lo, dd: dd[lo] }); }
  }
  return eps.map((e) => ({ ...e, dateLow: dates[e.low], datePeak: e.peak != null ? dates[e.peak] : null }));
}
function h5(B, mode) {
  const list = [];
  for (const k of INDICES) {
    const S = B.by[k];
    for (const e of lows(k, mode)) {
      const t0 = e.low, a = Math.max(1, t0 - 126), b = Math.min(S.dates.length - 1, t0 + 126);
      const first = (arr) => { if (!arr) return null; for (let t = a; t <= b; t++) if (arr[t] === 1 && arr[t - 1] !== 1) return t - t0; return null; };
      const firstAfter = (arr) => { if (!arr) return null; if (arr[t0] == null) return 'assente al minimo'; for (let t = t0; t <= Math.min(S.dates.length - 1, t0 + 252); t++) if (arr[t] === 1) return t - t0; return null; };
      const cover = (arr) => arr && arr.slice(a, b + 1).some((x) => x != null);
      const trigAfter = BASE[k].trig.find((x) => x.t >= t0 - 126 && x.t <= t0 + 126);
      list.push({
        k, minimo: e.dateLow, massimo: e.datePeak, drawdown: r1(e.dd), crisi: crisisOf(e.dateLow),
        FalMinimo: S.F ? S.F[t0] : 'n.a.', anticipoF: S.F ? (cover(S.F) ? first(S.F) : 'dati F assenti') : 'n.a.',
        FdopoMinimo: S.F ? firstAfter(S.F) : 'n.a.', DalMinimo: S.D[t0], DdopoMinimo: firstAfter(S.D), anticipoD: cover(S.D) ? first(S.D) : 'dati D assenti',
        anticipoPieno: cover(S.score) ? first(S.score.map((x) => (x == null ? null : x === S.max ? 1 : 0))) : 'dati assenti',
        trigger: trigAfter ? trigAfter.t - t0 : null,
      });
    }
  }
  const num = (f) => list.map(f).filter((x) => typeof x === 'number');
  const s = (f) => { const v = num(f); return { conDato: v.length, mediana: median(v), prima: v.filter((x) => x < 0).length, stessoGiorno: v.filter((x) => x === 0).length, dopo: v.filter((x) => x > 0).length }; };
  return { episodi: list, FalMinimoAcceso: `${list.filter((x) => x.FalMinimo === 1).length}/${list.filter((x) => x.FalMinimo === 0 || x.FalMinimo === 1).length}`, DalMinimoAcceso: `${list.filter((x) => x.DalMinimo === 1).length}/${list.filter((x) => x.DalMinimo === 0 || x.DalMinimo === 1).length}`,
    FprimoDopo: s((x) => x.FdopoMinimo), DprimoDopo: s((x) => x.DdopoMinimo), F: s((x) => x.anticipoF), D: s((x) => x.anticipoD), pieno: s((x) => x.anticipoPieno), trigger: s((x) => x.trigger) };
}

// Esplorazione dopo i risultati (NON criteri decisi prima): punteggio ≥ 1 contro 0, F da solo, D da solo
function split(items, a, b) {
  const A = items.filter(a), Bz = items.filter(b), gA = grp(A), gB = grp(Bz);
  const perCrisi = {};
  for (const [c] of [...CRISES, ['altro']]) {
    const I = items.filter((x) => x.crisis === c), x = grp(I.filter(a)), y = grp(I.filter(b));
    if (x.n || y.n) perCrisi[c] = `${x.n}: ${x.med126 ?? '—'} (fall ${x.falliti}) | ${y.n}: ${y.med126 ?? '—'} (fall ${y.falliti})`;
  }
  return { si: gA, no: gB, diffLocale: gA.med126 != null && gB.med126 != null ? r1(gA.med126 - gB.med126) : null, diffDollari: gA.med126usd != null && gB.med126usd != null ? r1(gA.med126usd - gB.med126usd) : null, perCrisi };
}
function explore(items) {
  return {
    'punteggio ≥ 1 contro 0': split(items, (x) => x.score != null && x.score >= 1, (x) => x.score === 0),
    'F = 1 contro F = 0 (5 indici)': split(items, (x) => x.F === 1, (x) => x.F === 0),
    'D = 1 contro D = 0 (7 indici)': split(items, (x) => x.D === 1, (x) => x.D === 0),
  };
}

export function headline(B) {
  const TI = signalItems(B, 'trig'), T = hyp(TI), Z = hyp(signalItems(B, 'setup'));
  const fs1 = split(TI, (x) => x.F === 1, (x) => x.F === 0); // esplorazione, non criterio
  const hold = h3table(sessions(B, (d) => d >= HOLD)), train = h3table(sessions(B, (d) => d < HOLD));
  return {
    H1: { n: T.tutti.n, pieno: T.pieno.n, zero: T.zero.n, diffLocale: T.diffLocale, diffDollari: T.diffDollari, falliti: `${T.pieno.falliti} vs ${T.zero.falliti}`, crisiOk: T.crisiOk.join(' ') || '—', superato: T.superato },
    H2: { n: Z.tutti.n, pieno: Z.pieno.n, zero: Z.zero.n, diffLocale: Z.diffLocale, diffDollari: Z.diffDollari, falliti: `${Z.pieno.falliti} vs ${Z.zero.falliti}`, crisiOk: Z.crisiOk.join(' ') || '—', superato: Z.superato },
    esplorazioneTriggerF: `F=1 ${fs1.si.n} med ${fs1.si.med126} fall ${fs1.si.falliti} | F=0 ${fs1.no.n} med ${fs1.no.med126} fall ${fs1.no.falliti} | diff ${fs1.diffLocale}`,
    H3: { monotonoFino2015: train.monotono126, monotonoDal2016: hold.monotono126, pienoMenoBaseFino2015: train.pienoMenoBase126, pienoMenoBaseDal2016: hold.pienoMenoBase126, pienoMenoBaseDal2016usd: hold.pienoMenoBase126usd },
  };
}

// ---------- esecuzione ----------
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const B = build();
  const trigI = signalItems(B, 'trig'), setI = signalItems(B, 'setup');
  const H1 = hyp(trigI), H2 = hyp(setI);
  const H3 = { tutto: h3table(sessions(B)), fino2015: h3table(sessions(B, (d) => d < HOLD)), dal2016: h3table(sessions(B, (d) => d >= HOLD)) };
  const H4 = h4(B, [...trigI, ...setI]);
  const H5 = { ath: h5(B, 'ath'), max252: h5(B, '252') };
  const esplorazione = { trigger: explore(trigI), zonaBlu: explore(setI) };
  // quota di sedute con punteggio pieno e copertura del punteggio (dalla prima seduta con uno stato della macchina)
  const cover = Object.fromEntries(INDICES.map((k) => {
    const S = B.by[k], st = BASE[k].start, idx = S.dates.map((_, t) => t).filter((t) => t >= st);
    const def = idx.filter((t) => S.score[t] != null);
    const fx = CCY[k] ? idx.filter((t) => S.F[t] == null).length : 0;
    return [k, { daStato: S.dates[st], sedute: idx.length, conPunteggio: def.length, quotaPieno: def.length ? Math.round((100 * def.filter((t) => S.score[t] === S.max).length) / def.length) : null,
      quotaZero: def.length ? Math.round((100 * def.filter((t) => S.score[t] === 0).length) / def.length) : null, Fmancante: fx, primoPunteggio: S.dates[S.score.findIndex((x) => x != null)] }];
  }));
  // episodi persi (punteggio 0 ma rendimento a 126 sedute > +10%) e contrari (punteggio pieno ma fallito o negativo a 126)
  const lists = (I) => ({
    persi: I.filter((x) => x.zero && x.r126 != null && x.r126 > 10).map((x) => `${x.k} ${x.date} (+${x.r126.toFixed(1)}% a 126, ${x.failed ? 'fallito' : 'tenuto'})`),
    contrari: I.filter((x) => x.full && ((x.r126 != null && x.r126 < 0) || x.failed)).map((x) => `${x.k} ${x.date} (${x.r126 == null ? '—' : x.r126.toFixed(1) + '%'} a 126, ${x.failed ? 'fallito' : 'tenuto'})`),
  });
  // sensibilità
  const variants = {
    'principale (w 63, z 1, media 200, D pubblicato)': {},
    'w 26': { w: 26 }, 'w 126': { w: 126 }, 'z 0,75': { z: 0.75 }, 'z 1,5': { z: 1.5 }, 'media 100 per D': { ma: 100 },
    'D stesso giorno (guarda avanti)': { dsrc: 'same' }, 'D con DX-Y.NYB': { dsrc: 'dxy' }, "F' = cambio sotto media 50": { ftype: 'sma' },
    'cambi FRED H.10 (pubblicati)': { fsrc: 'fred' },
  };
  const sens = Object.fromEntries(Object.entries(variants).map(([n, v]) => [n, headline(build(v))]));
  // F ai trigger: Yahoo contro cambi FRED H.10 (pubblicati), sui trigger dei cinque indici con il cambio
  const BF = build({ fsrc: 'fred' });
  const fcmp = trigI.filter((x) => CCY[x.k]).map((x) => ({ k: x.k, date: x.date, yahoo: x.F, fred: BF.by[x.k].F[x.t] }));
  const both = fcmp.filter((x) => x.yahoo != null && x.fred != null);
  const Fyahoo_fred = { triggerConCambio: fcmp.length, conEntrambi: both.length, diversi: both.filter((x) => x.yahoo !== x.fred).length, soloFred: fcmp.filter((x) => x.yahoo == null && x.fred != null).length, elenco: fcmp };
  const res = {
    Fyahoo_fred,
    generato: new Date().toISOString(), asOfIndici: R('data/indices.json').asOf,
    fonti: Object.fromEntries([...Object.values(FX), DTW, DXY].map((S) => [S.sym, { righe: S.dates.length, da: S.dates[0], a: S.dates.at(-1), erroriTolti: S.removed, buchiOltre10gg: S.brk.at(-1) }])),
    copertura: cover,
    segnali: trigI.map(({ k, date, crisis, score, F, D, failed, r126, r126u }) => ({ k, date, crisis, score, F, D, failed, r126: r1(r126), r126usd: r1(r126u) })),
    zonaBlu: setI.map(({ k, date, crisis, score, F, D, failed, r126, r126u }) => ({ k, date, crisis, score, F, D, failed, r126: r1(r126), r126usd: r1(r126u) })),
    H1, H2, H3, H4, H5, esplorazione, episodiH1: lists(trigI), episodiH2: lists(setI), sensibilita: sens,
  };
  fs.writeFileSync(new URL('../risultati.json', import.meta.url), JSON.stringify(res, null, 1) + '\n');
  const show = (title, x) => { console.log('\n== ' + title); console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 1)); };
  show('copertura', cover);
  show('fonti', Object.fromEntries(Object.entries(res.fonti).map(([k, v]) => [k, `${v.righe} ${v.da}→${v.a} tolti ${v.erroriTolti.length} buchi ${v.buchiOltre10gg}`])));
  for (const [n, H] of [['H1 trigger', H1], ['H2 zona blu', H2]]) {
    show(n, { tutti: H.tutti, pieno: H.pieno, parziale: H.parziale, zero: H.zero, mancante: H.mancante, diffLocale: H.diffLocale, diffDollari: H.diffDollari, menoFalliti: H.menoFalliti, crisiOk: H.crisiOk, crisiConfrontabili: H.crisiConfrontabili, superato: H.superato });
    show(n + ' per crisi', Object.fromEntries(Object.entries(H.perCrisi).map(([c, x]) => [c, `n ${x.n} | pieno ${x.pieno.n} med ${x.pieno.med126} usd ${x.pieno.med126usd} fall ${x.pieno.falliti} | zero ${x.zero.n} med ${x.zero.med126} usd ${x.zero.med126usd} fall ${x.zero.falliti} | ok ${x.ok}`])));
    show(n + ' per indice', Object.fromEntries(Object.entries(H.perIndice).map(([c, x]) => [c, `n ${x.n} mancante ${x.mancante} | pieno ${x.pieno.n} med ${x.pieno.med126} fall ${x.pieno.falliti} | zero ${x.zero.n} med ${x.zero.med126} fall ${x.zero.falliti}`])));
  }
  show('H3', H3);
  show('H4', H4);
  for (const m of ['ath', 'max252']) { show('H5 ' + m, { FalMinimoAcceso: H5[m].FalMinimoAcceso, DalMinimoAcceso: H5[m].DalMinimoAcceso, FprimoDopo: H5[m].FprimoDopo, DprimoDopo: H5[m].DprimoDopo, F: H5[m].F, D: H5[m].D, pieno: H5[m].pieno, trigger: H5[m].trigger }); console.log(H5[m].episodi.map((e) => `${e.k} ${e.minimo} dd ${e.drawdown} ${e.crisi} F@min ${e.FalMinimo} antF ${e.anticipoF} Fdopo ${e.FdopoMinimo} Ddopo ${e.DdopoMinimo} antD ${e.anticipoD} antPieno ${e.anticipoPieno} trig ${e.trigger}`).join('\n')); }
  for (const w of ['trigger', 'zonaBlu']) for (const [n, x] of Object.entries(esplorazione[w])) show(`esplorazione ${w}: ${n}`, { si: `${x.si.n} med ${x.si.med126} usd ${x.si.med126usd} fall ${x.si.falliti} pos ${x.si.pos126}`, no: `${x.no.n} med ${x.no.med126} usd ${x.no.med126usd} fall ${x.no.falliti} pos ${x.no.pos126}`, diff: x.diffLocale, diffUsd: x.diffDollari, perCrisi: x.perCrisi });
  show('F ai trigger, Yahoo contro FRED', { ...Fyahoo_fred, elenco: undefined });
  show('episodi H1', res.episodiH1); show('episodi H2', res.episodiH2);
  show('sensibilita', Object.fromEntries(Object.entries(sens).map(([n, s]) => [n, `H1 ${s.H1.pieno}/${s.H1.zero} diff ${s.H1.diffLocale} usd ${s.H1.diffDollari} fall ${s.H1.falliti} crisi ${s.H1.crisiOk} ok ${s.H1.superato} | H2 ${s.H2.pieno}/${s.H2.zero} diff ${s.H2.diffLocale} usd ${s.H2.diffDollari} fall ${s.H2.falliti} crisi ${s.H2.crisiOk} ok ${s.H2.superato} | H3 mono ${s.H3.monotonoFino2015}/${s.H3.monotonoDal2016} pieno-base ${s.H3.pienoMenoBaseFino2015}/${s.H3.pienoMenoBaseDal2016} usd ${s.H3.pienoMenoBaseDal2016usd} | espl. ${s.esplorazioneTriggerF}`])));
}
