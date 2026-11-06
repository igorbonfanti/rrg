// Verifica dati della vista «Emergenti»: completezza e affidabilità di cambi, indici del dollaro, ETF e rendimento
// reale (Yahoo e FRED) e dei dati degli indici emergenti già nell'app (data/indices.json, indices_more.json).
// Parte dalla cache di scarica.mjs (nessuna rete) e scrive ricerca/emergenti/dati/risultati.json.
//
// Metodo (nessun dato riempito: un giorno mancante resta mancante):
//  - Date delle barre Yahoo nel fuso della borsa (meta.exchangeTimezoneName, con Intl). Si conta a parte quante barre
//    avrebbero una data diversa con il metodo di scripts/lib/yahoo.js (timestamp + gmtoffset di OGGI).
//  - Buchi: giorni lunedì-venerdì senza dato tra la prima e l'ultima osservazione; «periodi lunghi» = almeno 3 giorni
//    lavorativi consecutivi senza dato. Per FRED le righe vuote del CSV si dividono tra festività federali USA (calendario
//    calcolato qui sotto) e altre. Per gli ETF il riferimento è il calendario NYSE ricavato dagli ETF stessi (date
//    presenti in almeno metà degli ETF già quotati).
//  - Valori ricopiati: serie di almeno 3 osservazioni consecutive identiche (si contano le serie e la più lunga).
//  - Anomalie: rendimento logaritmico giornaliero oltre 5 sigma, con sigma robusta = 1,4826 × MAD dei 250 rendimenti
//    precedenti (almeno 60). «Picco che rientra» = salto oltre 5 sigma seguito il giorno dopo da uno di segno opposto che
//    ne annulla almeno il 70% (tipico errore di stampa). «Inversione» = valore vicino (±10%) all'inverso della mediana
//    delle 21 osservazioni intorno; «scala» = valore oltre 1,5 volte (o sotto 1/1,5) quella mediana.
//  - Confronto Yahoo/FRED: stessa data, differenza = Yahoo/FRED − 1. Si prova anche Yahoo spostato di un giorno.
//    Le differenze > 1% si classificano: Yahoo ricopiato, picco Yahoo, picco FRED, sfasamento di un giorno, mercato
//    mosso (FRED si muove > 1% quel giorno: l'ora diversa di rilevazione basta a spiegarlo), non spiegato.
//  - Periodo principale «dal 2006» (inizio del backtest); prima data e conteggi anche sull'intera storia.
// Uso (dalla radice del repository): node ricerca/emergenti/dati/script/analisi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YAHOO_FX, YAHOO_USD, YAHOO_ETF, FRED, PAIRS, APP_EM, fileName } from './serie.mjs';
import { parse as appParse } from '../../../../scripts/lib/yahoo.js';
import { indexSeries } from '../../../../js/indexdata.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const CACHE = path.resolve(HERE, '../../cache');
const OUT = path.resolve(HERE, '../risultati.json');
const FROM = '2006-01-01';
const scaricato = JSON.parse(fs.readFileSync(path.join(CACHE, 'scaricato.json'), 'utf8'));
const TODAY = scaricato.scaricato.slice(0, 10);

// ---------- utilità ----------
const DAY = 86400000;
const t = (d) => Date.parse(d + 'T00:00:00Z');
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const wd = (d) => new Date(t(d)).getUTCDay();
const isWeekday = (d) => { const w = wd(d); return w >= 1 && w <= 5; };
const r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10000) / 10000);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const quantile = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
function weekdaysBetween(a, b) { const out = []; for (let x = t(a); x <= t(b); x += DAY) { const d = iso(x); if (isWeekday(d)) out.push(d); } return out; }
function bizDaysBetween(a, b) { let n = 0; for (let x = t(a) + DAY; x <= t(b); x += DAY) if (isWeekday(iso(x))) n++; return n; }

// Festività federali USA (giorni di chiusura delle banche della Fed, con le regole del giorno osservato)
function nthWeekday(y, m, w, n) { const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); return Date.UTC(y, m, 1 + ((w - first + 7) % 7) + 7 * (n - 1)); }
function lastWeekday(y, m, w) { const last = new Date(Date.UTC(y, m + 1, 0)); return Date.UTC(y, m, last.getUTCDate() - ((last.getUTCDay() - w + 7) % 7)); }
// Giorno osservato: domenica → lunedì, sabato → venerdì. Per la Fed il venerdì resta aperto, ma l'H.10 quel venerdì non ha
// dati (2010-12-24, 2015-07-03, 2021-12-31...): si usa quindi la regola federale generale, che spiega più righe vuote.
function observed(ms) { const w = new Date(ms).getUTCDay(); return w === 6 ? ms - DAY : w === 0 ? ms + DAY : ms; }
const US_HOL = new Map();
for (let y = 1970; y <= 2027; y++) {
  const add = (ms, name) => { if (ms != null) US_HOL.set(iso(ms), name); };
  add(observed(Date.UTC(y, 0, 1)), 'Capodanno'); add(nthWeekday(y, 0, 1, 3), 'Martin Luther King'); add(nthWeekday(y, 1, 1, 3), 'Presidents Day');
  add(lastWeekday(y, 4, 1), 'Memorial Day'); if (y >= 2021) add(observed(Date.UTC(y, 5, 19)), 'Juneteenth');
  add(observed(Date.UTC(y, 6, 4)), 'Indipendenza'); add(nthWeekday(y, 8, 1, 1), 'Labor Day'); add(nthWeekday(y, 9, 1, 2), 'Columbus Day');
  add(observed(Date.UTC(y, 10, 11)), 'Veterans Day'); add(nthWeekday(y, 10, 4, 4), 'Thanksgiving'); add(observed(Date.UTC(y, 11, 25)), 'Natale');
}
// Giorni speciali di chiusura (lutti nazionali, 11 settembre) noti nel calendario Fed/NYSE
for (const [d, n] of [['2001-09-11', '11 settembre'], ['2001-09-12', '11 settembre'], ['2004-06-11', 'lutto Reagan'], ['2007-01-02', 'lutto Ford'],
  ['2012-10-29', 'uragano Sandy'], ['2012-10-30', 'uragano Sandy'], ['2018-12-05', 'lutto Bush'], ['2025-01-09', 'lutto Carter']]) if (!US_HOL.has(d)) US_HOL.set(d, n);

// ---------- lettura ----------
const fmtCache = new Map();
function localDate(ms, tz) {
  let f = fmtCache.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }); fmtCache.set(tz, f); }
  return f.format(new Date(ms));
}
function loadYahoo(sym, file = fileName(sym) + '.json') {
  const f = path.join(CACHE, 'yahoo', file);
  if (!fs.existsSync(f)) return null;
  const res = JSON.parse(fs.readFileSync(f, 'utf8')).chart.result[0];
  const tz = res.meta.exchangeTimezoneName, q = res.indicators.quote[0] || {};
  const ts = res.timestamp || [];
  const out = { sym, tz, meta: res.meta, dates: [], close: [], open: [], high: [], low: [], volume: [], nullBars: [], dupDates: 0, ts: [] };
  for (let i = 0; i < ts.length; i++) {
    const d = localDate(ts[i] * 1000, tz), c = q.close?.[i];
    if (c == null) { out.nullBars.push(d); continue; }
    if (out.dates.at(-1) === d) { out.dupDates++; out.close[out.close.length - 1] = c; continue; }
    out.dates.push(d); out.close.push(c); out.open.push(q.open?.[i]); out.high.push(q.high?.[i]); out.low.push(q.low?.[i]); out.volume.push(q.volume?.[i]); out.ts.push(ts[i]);
  }
  // date con il metodo della pipeline (scripts/lib/yahoo.js: timestamp + gmtoffset attuale)
  try {
    const p = appParse(res, { nowSec: Date.now() / 1000 + 10 * 86400 });
    const mine = new Set(out.dates), theirs = new Set(p.dates);
    out.pipelineDateMismatch = { barreConDataDiversa: p.dates.filter((d) => !mine.has(d)).length, suDomenicaOSabato: p.dates.filter((d) => !isWeekday(d)).length, totale: p.dates.length };
    void theirs;
  } catch (e) { out.pipelineDateMismatch = { errore: e.message }; }
  return out;
}
function loadFred(id) {
  const f = path.join(CACHE, 'fred', id + '.csv');
  if (!fs.existsSync(f)) return null;
  const rows = fs.readFileSync(f, 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
  const all = rows.map(([d, v]) => ({ d, v: v === '' || v === '.' || v == null ? null : Number(v) }));
  return { id, all, dates: all.filter((r) => r.v != null).map((r) => r.d), close: all.filter((r) => r.v != null).map((r) => r.v), empty: all.filter((r) => r.v == null).map((r) => r.d) };
}

// ---------- statistiche di una serie ----------
// diff = true per i rendimenti dei titoli di Stato (DFII10, che passa per lo zero): differenze in punti invece dei logaritmi
function returns(close, diff = false) { const r = [null]; for (let i = 1; i < close.length; i++) r.push(diff ? close[i] - close[i - 1] : Math.log(close[i] / close[i - 1])); return r; }
function anomalies(dates, close, from, diff = false) {
  const r = returns(close, diff), flags = [], spikes = [], inv = [], scale = [];
  const pct = (x) => (diff ? r2(100 * x) : r2(100 * (Math.exp(x) - 1))); // diff: variazione in punti base
  const i0 = dates.findIndex((d) => d >= from);
  for (let i = Math.max(1, i0); i < close.length; i++) {
    const win = r.slice(Math.max(1, i - 250), i).filter((x) => x != null);
    if (win.length >= 60) {
      const m = median(win), mad = median(win.map((x) => Math.abs(x - m))), sig = 1.4826 * mad;
      if (sig > 0 && Math.abs(r[i]) > 5 * sig) {
        const f = { data: dates[i], rendPct: pct(r[i]), sigma: r2(Math.abs(r[i]) / sig), valore: close[i], prima: close[i - 1] };
        flags.push(f);
        if (i + 1 < close.length && Math.sign(r[i + 1]) === -Math.sign(r[i]) && Math.abs(r[i + 1]) >= 0.7 * Math.abs(r[i])) spikes.push({ ...f, dopo: close[i + 1], dataDopo: dates[i + 1] });
      } else if (sig === 0 && r[i] !== 0) {
        flags.push({ data: dates[i], rendPct: pct(r[i]), sigma: 'inf', valore: close[i], prima: close[i - 1] });
      }
    }
    if (diff) continue;
    const nb = close.slice(Math.max(0, i - 10), i + 11), med = median(nb);
    if (Math.abs(Math.log(close[i]) + Math.log(med)) < 0.1 && Math.abs(Math.log(close[i] / med)) > 0.5) inv.push({ data: dates[i], valore: close[i], mediana: med });
    else if (Math.abs(Math.log(close[i] / med)) > Math.log(1.5)) scale.push({ data: dates[i], valore: close[i], mediana: med });
  }
  const big = flags.filter((f) => Math.abs(f.rendPct) >= (diff ? 20 : 2)); // 2% o, per i rendimenti, 20 punti base
  const top = r.map((x, i) => ({ i, x })).filter((o) => o.x != null && dates[o.i] >= from).sort((a, b) => Math.abs(b.x) - Math.abs(a.x)).slice(0, 8)
    .map((o) => ({ data: dates[o.i], rendPct: pct(o.x), valore: close[o.i], prima: close[o.i - 1] }));
  return { unita: diff ? 'punti base' : '%', oltre5sigma: flags.length, oltre5sigmaE2pct: big.length, piccoCheRientra: spikes.length, inversioni: inv.length, erroriDiScala: scale.length,
    esempiPicchi: spikes.slice(0, 12), esempiInversioni: inv.slice(0, 10), esempiScala: scale.slice(0, 10), maggioriMovimenti: top };
}
function staleRuns(dates, close, from, minLen = 3) {
  const runs = [];
  let s = 0;
  for (let i = 1; i <= close.length; i++) {
    if (i < close.length && close[i] === close[i - 1]) continue;
    if (i - s >= minLen && dates[s] >= from) runs.push({ da: dates[s], a: dates[i - 1], osservazioni: i - s, valore: close[s] });
    s = i;
  }
  runs.sort((a, b) => b.osservazioni - a.osservazioni);
  const eq = close.reduce((n, v, i) => n + (i && dates[i] >= from && v === close[i - 1] ? 1 : 0), 0);
  const nFrom = dates.filter((d) => d >= from).length;
  return { serie: runs.length, osservazioniInSerie: runs.reduce((n, r) => n + r.osservazioni, 0), piuLunga: runs[0] || null, esempi: runs.slice(0, 8),
    giorniUgualiAlPrecedente: eq, quotaUgualiPct: r2((100 * eq) / Math.max(1, nFrom)) };
}
function gaps(dates, from, calendar = null, explain = null) {
  const a = dates.find((d) => d >= from) || dates[0], b = dates.at(-1);
  const have = new Set(dates);
  const ref = calendar ? calendar.filter((d) => d >= a && d <= b) : weekdaysBetween(a, b);
  const miss = ref.filter((d) => !have.has(d));
  const runs = [];
  for (let i = 0; i < miss.length;) {
    let j = i;
    const refIdx = (d) => ref.indexOf(d);
    while (j + 1 < miss.length && refIdx(miss[j + 1]) === refIdx(miss[j]) + 1) j++;
    if (j - i + 1 >= 3) runs.push({ da: miss[i], a: miss[j], giorni: j - i + 1 });
    i = j + 1;
  }
  runs.sort((x, y) => y.giorni - x.giorni);
  const byKind = {};
  if (explain) for (const d of miss) { const k = explain(d); byKind[k] = (byKind[k] || 0) + 1; }
  const perYear = {};
  for (const d of miss) perYear[d.slice(0, 4)] = (perYear[d.slice(0, 4)] || 0) + 1;
  return { da: a, a: b, giorniDiRiferimento: ref.length, mancanti: miss.length, mancantiPct: r2((100 * miss.length) / Math.max(1, ref.length)),
    periodiDiAlmeno3: runs.length, periodoPiuLungo: runs[0] || null, periodiLunghi: runs.slice(0, 10), perTipo: explain ? byKind : undefined, perAnno: perYear,
    esempiMancanti: miss.slice(-12) };
}
const fxHolidayKind = (d) => (d.slice(5) === '01-01' ? 'Capodanno' : d.slice(5) === '12-25' ? 'Natale' : d.slice(5) === '12-26' ? 'Santo Stefano' : 'altro');

// ---------- 1. Yahoo: cambi e indice del dollaro ----------
const R = { generato: new Date().toISOString(), oggi: TODAY, scaricato: scaricato.scaricato, periodo: `dal ${FROM}`, yahoo: {}, fred: {}, confronto: {}, cnh: {}, festivita: {}, app: {} };
const Y = {};
for (const sym of [...YAHOO_FX, ...YAHOO_USD]) {
  const s = loadYahoo(sym);
  if (!s) { R.yahoo[sym] = { errore: 'non scaricato' }; continue; }
  Y[sym] = s;
  const flat = s.close.reduce((n, c, i) => n + (i && s.dates[i] >= FROM && s.open[i] === c && s.high[i] === c && s.low[i] === c && c === s.close[i - 1] ? 1 : 0), 0);
  R.yahoo[sym] = {
    fuso: s.tz, prima: s.dates[0] || null, ultima: s.dates.at(-1) || null, osservazioni: s.dates.length, osservazioniDal2006: s.dates.filter((d) => d >= FROM).length,
    barreNulle: s.nullBars.length, barreNulleDal2006: s.nullBars.filter((d) => d >= FROM).length, barreDuplicate: s.dupDates,
    barreSulFineSettimana: s.dates.filter((d) => !isWeekday(d)).length,
    dataConMetodoPipeline: s.pipelineDateMismatch,
    buchi: s.dates.length > 1 ? gaps(s.dates.filter(isWeekday), FROM, null, fxHolidayKind) : null,
    ricopiati: staleRuns(s.dates, s.close, FROM), barrePiatteUgualiAlPrecedente: flat,
    anomalie: s.dates.length > 70 ? anomalies(s.dates, s.close, FROM) : null,
  };
}

// ---------- 2. Yahoo: ETF in dollari, calendario NYSE dagli ETF ----------
const E = {};
for (const sym of YAHOO_ETF) { const s = loadYahoo(sym); if (s) E[sym] = s; }
const count = new Map(), alive = (d) => YAHOO_ETF.filter((k) => E[k] && E[k].dates[0] <= d).length;
for (const k of Object.keys(E)) for (const d of E[k].dates) count.set(d, (count.get(d) || 0) + 1);
const NYSE = [...count.keys()].filter((d) => count.get(d) >= alive(d) / 2).sort();
R.calendarioNyseDaEtf = { sedute: NYSE.length, prima: NYSE[0], ultima: NYSE.at(-1), sedute2006: NYSE.filter((d) => d >= FROM).length };
for (const sym of YAHOO_ETF) {
  const s = E[sym];
  if (!s) { R.yahoo[sym] = { errore: 'non scaricato' }; continue; }
  const set = new Set(NYSE);
  R.yahoo[sym] = {
    fuso: s.tz, prima: s.dates[0], ultima: s.dates.at(-1), osservazioni: s.dates.length, barreNulle: s.nullBars.length, barreNulleDal2006: s.nullBars.filter((d) => d >= FROM).length,
    esempiBarreNulle: s.nullBars.slice(-6), barreDuplicate: s.dupDates, dataConMetodoPipeline: s.pipelineDateMismatch,
    buchiRispettoNyse: gaps(s.dates, FROM, NYSE), giorniFuoriCalendario: s.dates.filter((d) => d >= FROM && !set.has(d)).length,
    ricopiati: staleRuns(s.dates, s.close, FROM), anomalie: anomalies(s.dates, s.close, FROM),
  };
}
// DX-Y.NYB rispetto al calendario NYSE (ICE quota anche in alcune festività USA)
if (Y['DX-Y.NYB']) {
  const s = Y['DX-Y.NYB'], have = new Set(s.dates), set = new Set(NYSE);
  R.yahoo['DX-Y.NYB'].rispettoNyse = { mancantiInSeduteNyse: NYSE.filter((d) => d >= FROM && d <= s.dates.at(-1) && !have.has(d)).length,
    presentiFuoriSeduteNyse: s.dates.filter((d) => d >= FROM && !set.has(d)).length };
}

// ---------- 3. FRED ----------
const F = {};
for (const id of FRED) {
  const s = loadFred(id);
  if (!s) { R.fred[id] = { errore: 'non scaricato' }; continue; }
  F[id] = s;
  const gapsDays = []; for (let i = 1; i < s.dates.length; i++) gapsDays.push((t(s.dates[i]) - t(s.dates[i - 1])) / DAY);
  const recent = s.dates.filter((d) => d >= '2025-01-01');
  const gRecent = []; for (let i = 1; i < recent.length; i++) gRecent.push((t(recent[i]) - t(recent[i - 1])) / DAY);
  const emptyFrom = s.empty.filter((d) => d >= FROM);
  const kinds = {}; const nonHol = [];
  for (const d of emptyFrom) { const k = US_HOL.get(d) || 'non festivo'; kinds[k] = (kinds[k] || 0) + 1; if (!US_HOL.has(d)) nonHol.push(d); }
  const last = s.dates.at(-1);
  R.fred[id] = {
    prima: s.dates[0], ultima: last, osservazioni: s.dates.length, osservazioniDal2006: s.dates.filter((d) => d >= FROM).length,
    ritardoGiorniCalendario: (t(TODAY) - t(last)) / DAY, ritardoGiorniLavorativi: bizDaysBetween(last, TODAY),
    frequenza: { intervalloMedianoGiorni: median(gapsDays), intervalloMedianoDal2025: median(gRecent), quotaIntervalli1o3giorni: r2((100 * gapsDays.filter((g) => g === 1 || g === 3).length) / gapsDays.length),
      quotaIntervalli7giorni: r2((100 * gapsDays.filter((g) => g === 7).length) / gapsDays.length), primaDataGiornaliera: (() => { for (let i = 1; i < s.dates.length; i++) if ((t(s.dates[i]) - t(s.dates[i - 1])) / DAY === 1) return s.dates[i - 1]; return null; })() },
    righeVuoteDal2006: emptyFrom.length, righeVuotePerTipo: kinds, righeVuoteNonFestive: nonHol.slice(0, 40), righeVuoteNonFestiveN: nonHol.length,
    festiveConValore: [...US_HOL.keys()].filter((d) => d >= FROM && d <= last && isWeekday(d) && s.dates.includes(d)).length,
    esempiFestiveConValore: [...US_HOL.keys()].filter((d) => d >= FROM && d <= last && isWeekday(d) && s.dates.includes(d)).sort().slice(0, 40),
    buchi: gaps(s.dates.filter(isWeekday), FROM, null, (d) => (US_HOL.has(d) ? 'festività USA' : 'altro')),
    ricopiati: staleRuns(s.dates, s.close, FROM), anomalie: anomalies(s.dates, s.close, FROM, id === 'DFII10'),
  };
}

// ---------- 4. Confronto Yahoo ↔ FRED ----------
function retMap(dates, close) { const m = new Map(); for (let i = 1; i < dates.length; i++) m.set(dates[i], close[i] / close[i - 1] - 1); return m; }
for (const [ys, fid] of PAIRS) {
  const y = Y[ys], f = F[fid];
  if (!y || !f || y.dates.length < 70) { R.confronto[`${ys}~${fid}`] = { nota: `serie Yahoo ${ys} senza storia giornaliera (${y ? y.dates.length : 0} barre): confronto impossibile` }; continue; }
  const ym = new Map(y.dates.map((d, i) => [d, y.close[i]])), fm = new Map(f.dates.map((d, i) => [d, f.close[i]]));
  const yIdx = new Map(y.dates.map((d, i) => [d, i]));
  const ySpk = new Set((R.yahoo[ys].anomalie?.esempiPicchi || []).map((x) => x.data));
  const fAn = anomalies(f.dates, f.close, '1900-01-01'); const fSpk = new Set(fAn.esempiPicchi.map((x) => x.data));
  const fRet = retMap(f.dates, f.close);
  const common = f.dates.filter((d) => d >= FROM && ym.has(d));
  const diffs = common.map((d) => ({ d, x: ym.get(d) / fm.get(d) - 1 }));
  const abs = diffs.map((o) => Math.abs(o.x));
  const shift = (k) => { const a = []; for (const d of f.dates) { if (d < FROM) continue; const i = yIdx.get(d); if (i == null) continue; const j = i + k; if (j < 0 || j >= y.dates.length) continue; a.push(Math.abs(y.close[j] / fm.get(d) - 1)); } return r4(100 * median(a)); };
  const big = diffs.filter((o) => Math.abs(o.x) > 0.01);
  const cls = {}, worst = [];
  for (const o of big) {
    const i = yIdx.get(o.d), fr = fRet.get(o.d);
    let k;
    if (i > 0 && y.close[i] === y.close[i - 1]) k = 'Yahoo ricopiato';
    else if (ySpk.has(o.d)) k = 'picco Yahoo';
    else if (fSpk.has(o.d)) k = 'picco FRED';
    else if ((i > 0 && Math.abs(y.close[i - 1] / fm.get(o.d) - 1) < Math.abs(o.x) / 2) || (i + 1 < y.dates.length && Math.abs(y.close[i + 1] / fm.get(o.d) - 1) < Math.abs(o.x) / 2)) k = 'sfasamento di un giorno';
    else if (fr != null && Math.abs(fr) > 0.01) k = 'mercato mosso (ora diversa)';
    else k = 'non spiegato';
    cls[k] = (cls[k] || 0) + 1;
    worst.push({ data: o.d, yahoo: ym.get(o.d), fred: fm.get(o.d), diffPct: r2(100 * o.x), tipo: k });
  }
  worst.sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct));
  const perYear = {}; for (const o of big) perYear[o.d.slice(0, 4)] = (perYear[o.d.slice(0, 4)] || 0) + 1;
  const signedYear = {}; for (const o of diffs) (signedYear[o.d.slice(0, 4)] ||= []).push(o.x);
  const diffMedianaConSegnoPerAnno = Object.fromEntries(Object.entries(signedYear).map(([k, v]) => [k, r2(100 * median(v))]));
  const fOnly = f.dates.filter((d) => d >= FROM && d >= y.dates[0] && d <= y.dates.at(-1) && !ym.has(d));
  const yOnly = y.dates.filter((d) => d >= FROM && d >= f.dates[0] && d <= f.dates.at(-1) && isWeekday(d) && !fm.has(d));
  // correlazione dei rendimenti giornalieri sulle date comuni consecutive
  const yr = retMap(y.dates, y.close), rr = [];
  for (let i = 1; i < common.length; i++) { const d = common[i]; if (yr.has(d) && fRet.has(d)) rr.push([yr.get(d), fRet.get(d)]); }
  const mx = rr.reduce((s, p) => s + p[0], 0) / rr.length, my = rr.reduce((s, p) => s + p[1], 0) / rr.length;
  const cov = rr.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0), vx = rr.reduce((s, p) => s + (p[0] - mx) ** 2, 0), vy = rr.reduce((s, p) => s + (p[1] - my) ** 2, 0);
  // rendimenti su 20 sedute (più vicini all'uso nell'app: variazione del cambio in un mese)
  const r20 = []; for (let i = 20; i < common.length; i++) { const a = common[i - 20], b = common[i]; r20.push(Math.abs((ym.get(b) / ym.get(a)) - (fm.get(b) / fm.get(a)))); }
  R.confronto[`${ys}~${fid}`] = {
    dateComuniDal2006: common.length, diffMedianaPct: r4(100 * median(abs)), diffP95Pct: r4(100 * quantile(abs, 0.95)), diffMaxPct: r2(100 * Math.max(...abs)),
    dataDiffMax: worst[0]?.data || diffs.reduce((a, b) => (Math.abs(b.x) > Math.abs(a.x) ? b : a), diffs[0]).d,
    giorniOltre05pct: diffs.filter((o) => Math.abs(o.x) > 0.005).length, giorniOltre1pct: big.length, oltre1pctPerTipo: cls, oltre1pctPerAnno: perYear, diffMedianaConSegnoPerAnnoPct: diffMedianaConSegnoPerAnno, peggiori: worst.slice(0, 15),
    diffMedianaYahooSpostato: { menoUno: shift(-1), zero: shift(0), piuUno: shift(1) },
    corrRendimentiGiornalieri: r4(cov / Math.sqrt(vx * vy)), diffRend20sedute: { medianaPunti: r4(100 * median(r20)), p95Punti: r4(100 * quantile(r20, 0.95)), maxPunti: r2(100 * Math.max(...r20)) },
    dateSoloFred: fOnly.length, dateSoloYahoo: yOnly.length, esempiSoloYahoo: yOnly.slice(-8), esempiSoloFred: fOnly.slice(-8),
  };
}

// ---------- 5. CNH contro CNY ----------
{
  const cnhDaily = loadYahoo('CNH=X');
  const h = JSON.parse(fs.readFileSync(path.join(CACHE, 'yahoo', 'CNH_X_1h.json'), 'utf8')).chart.result[0];
  const q = h.indicators.quote[0], byDay = new Map();
  let nullH = 0;
  for (let i = 0; i < h.timestamp.length; i++) { const c = q.close[i]; if (c == null) { nullH++; continue; } byDay.set(localDate(h.timestamp[i] * 1000, 'Europe/London'), c); }
  const cnh = { dates: [...byDay.keys()].filter(isWeekday).sort() }; cnh.close = cnh.dates.map((d) => byDay.get(d));
  const cny = Y['CNY=X'], cm = new Map(cny.dates.map((d, i) => [d, cny.close[i]])), fm = new Map(F.DEXCHUS.dates.map((d, i) => [d, F.DEXCHUS.close[i]]));
  const com = cnh.dates.filter((d) => cm.has(d)), dd = com.map((d) => cnh.close[cnh.dates.indexOf(d)] / cm.get(d) - 1);
  const comF = cnh.dates.filter((d) => fm.has(d)), ddF = comF.map((d) => cnh.close[cnh.dates.indexOf(d)] / fm.get(d) - 1);
  const ret = (s, ds) => { const m = new Map(); for (let i = 1; i < ds.length; i++) m.set(ds[i], s.get(ds[i]) / s.get(ds[i - 1]) - 1); return m; };
  const cnhM = new Map(cnh.dates.map((d, i) => [d, cnh.close[i]]));
  const ra = ret(cnhM, com), rb = ret(cm, com), pr = [...ra.keys()].map((d) => [ra.get(d), rb.get(d)]);
  const corr = (p) => { const mx = p.reduce((s, x) => s + x[0], 0) / p.length, my = p.reduce((s, x) => s + x[1], 0) / p.length; let c = 0, a = 0, b = 0; for (const [x, y] of p) { c += (x - mx) * (y - my); a += (x - mx) ** 2; b += (y - my) ** 2; } return c / Math.sqrt(a * b); };
  // rendimento su 20 sedute
  const r20 = []; for (let i = 20; i < com.length; i++) r20.push(Math.abs(cnhM.get(com[i]) / cnhM.get(com[i - 20]) - cm.get(com[i]) / cm.get(com[i - 20])));
  R.cnh = {
    giornalieraYahoo: { barre: cnhDaily ? cnhDaily.dates.length + cnhDaily.nullBars.length : 0, prima: cnhDaily?.dates[0] || null, nota: 'Yahoo non ha storia giornaliera di CNH=X (né settimanale o mensile); provato con range max/10y/5y/1y e period1, anche USDCNH=X' },
    orariaYahoo: { barre: h.timestamp.length, barreNulle: nullH, prima: localDate(h.timestamp[0] * 1000, 'Europe/London'), ultima: localDate(h.timestamp.at(-1) * 1000, 'Europe/London'), giorniLavorativi: cnh.dates.length },
    cnhMenoCnyStessoGiorno: { giorni: com.length, diffMedianaPct: r4(100 * median(dd.map(Math.abs))), diffMediaConSegnoPct: r4(100 * dd.reduce((s, x) => s + x, 0) / dd.length), diffP95Pct: r4(100 * quantile(dd.map(Math.abs), 0.95)), diffMaxPct: r2(100 * Math.max(...dd.map(Math.abs))) },
    cnhMenoDexchus: { giorni: comF.length, diffMedianaPct: r4(100 * median(ddF.map(Math.abs))), diffMaxPct: r2(100 * Math.max(...ddF.map(Math.abs))) },
    corrRendimentiGiornalieriCnhCny: r4(corr(pr)), diffRend20sedute: { medianaPunti: r4(100 * median(r20)), p95Punti: r4(100 * quantile(r20, 0.95)), maxPunti: r2(100 * Math.max(...r20)) },
  };
  // CNY prima e dopo la fine dell'ancoraggio (21/07/2005)
  const pre = cny.dates.map((d, i) => [d, cny.close[i]]).filter(([d]) => d < '2005-07-21');
  R.cnh.cnyPrimaDel2005 = { osservazioni: pre.length, valoriDistinti: new Set(pre.map((x) => x[1])).size, min: Math.min(...pre.map((x) => x[1])), max: Math.max(...pre.map((x) => x[1])) };
}

// ---------- 6. Festività locali: cosa fanno cambi e FRED quando la borsa locale è chiusa ----------
const LOCAL = { 'CNY=X': ['000001.SS', 'DEXCHUS'], 'INR=X': ['^NSEI', 'DEXINUS'], 'BRL=X': ['^BVSP', 'DEXBZUS'], 'KRW=X': ['^KS11', 'DEXKOUS'], 'TWD=X': ['^TWII', 'DEXTAUS'], 'HKD=X': ['^HSI', 'DEXHKUS'] };
const IX = {};
for (const s of ['510300.SS', '^NSEI', '^BVSP', '^KS11', '^TWII', '^HSI', '000001.SS', '000300.SS', 'EEM']) IX[s] = loadYahoo(s);
for (const [fx, [ix, fid]] of Object.entries(LOCAL)) {
  const y = Y[fx], idx = IX[ix], f = F[fid];
  if (!y || !idx || !f) continue;
  const a = [idx.dates[0], y.dates[0], FROM].sort().at(-1), b = [idx.dates.at(-1), y.dates.at(-1), f.dates.at(-1)].sort()[0];
  const ih = new Set(idx.dates), yi = new Map(y.dates.map((d, i) => [d, i])), fh = new Set(f.dates);
  const closed = weekdaysBetween(a, b).filter((d) => !ih.has(d) && !US_HOL.has(d));
  const open = weekdaysBetween(a, b).filter((d) => ih.has(d));
  const same = (d) => { const i = yi.get(d); return i != null && i > 0 && y.close[i] === y.close[i - 1]; };
  R.festivita[fx] = { borsaLocale: ix, periodo: `${a} → ${b}`, giorniBorsaChiusaNonFestiviUsa: closed.length,
    yahooConBarra: closed.filter((d) => yi.has(d)).length, yahooUgualeAlGiornoPrima: closed.filter(same).length,
    fredConValore: closed.filter((d) => fh.has(d)).length,
    confrontoBorsaAperta: { giorni: open.length, yahooUgualeAlGiornoPrimaPct: r2((100 * open.filter(same).length) / open.length) },
    yahooUgualeAlGiornoPrimaPctBorsaChiusa: r2((100 * closed.filter(same).length) / Math.max(1, closed.length)) };
}

// ---------- 6b. A che ora corrisponde la chiusura giornaliera dei cambi su Yahoo ----------
// Per ogni barra giornaliera degli ultimi 3 mesi (esclusa l'ultima, ancora aperta) si confronta la chiusura con la chiusura
// delle barre orarie che iniziano k ore (k da −30 a +30) dopo l'inizio della barra giornaliera (mezzanotte di Londra).
// La barra oraria che inizia a t chiude a t + 1 h. Si riporta lo spostamento con la differenza mediana più piccola.
R.oraChiusuraYahoo = { metodo: 'chiusura giornaliera contro chiusura della barra oraria che inizia k ore dopo la mezzanotte di Londra della barra giornaliera; ultimi 3 mesi' };
for (const sym of YAHOO_FX.filter((x) => x !== 'CNH=X')) {
  const fh = path.join(CACHE, 'yahoo', fileName(sym) + '_1h3mo.json'), fd = fh.replace('_1h3mo', '_1d3mo');
  if (!fs.existsSync(fh) || !fs.existsSync(fd)) continue;
  const h = JSON.parse(fs.readFileSync(fh, 'utf8')).chart.result[0], d = JSON.parse(fs.readFileSync(fd, 'utf8')).chart.result[0];
  const H = new Map(); h.timestamp.forEach((x, k) => { const c = h.indicators.quote[0].close[k]; if (c != null) H.set(x, c); });
  const res = [];
  for (let off = -30; off <= 30; off++) {
    const e = [];
    for (let i = 0; i < d.timestamp.length - 1; i++) { const c = d.indicators.quote[0].close[i]; const x = d.timestamp[i] + off * 3600; if (c != null && H.has(x)) e.push(Math.abs(H.get(x) / c - 1)); }
    if (e.length >= 15) res.push({ oreDopoMezzanotteLondra: off, diffMedianaPct: r4(100 * median(e)), barre: e.length });
  }
  res.sort((a, b) => a.diffMedianaPct - b.diffMedianaPct);
  R.oraChiusuraYahoo[sym] = { migliore: res[0], seconda: res[1], terza: res[2], fineGiornata23h: res.find((r) => r.oreDopoMezzanotteLondra === 22) || null };
}
{
  const fp = path.join(CACHE, 'fred', 'pagine.json');
  if (fs.existsSync(fp)) {
    const P = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const [id, p] of Object.entries(P.pagine)) if (R.fred[id]) R.fred[id].paginaFred = { letta: p.letto, aggiornata: p.Updated?.split(' Next')[0] || null,
      prossimaUscita: (p.Updated?.match(/Next Release Date:\s*([A-Z][a-z]{2} \d{1,2}, \d{4})/) || [])[1] || null, frequenza: p.Frequency?.split(' ')[0] || null };
    R.fredErroriPagine = P.errori.length;
  }
}

// ---------- 7. Dati dell'app: indici emergenti ----------
const appRaw = { ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/indices.json'), 'utf8')).series, ...JSON.parse(fs.readFileSync(path.join(ROOT, 'data/indices_more.json'), 'utf8')).series };
const appAsOf = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/indices.json'), 'utf8')).asOf;
R.app.asOf = appAsOf;
const sse = IX['000001.SS'], sseSet = new Set(sse.dates);
for (const [k, sym] of Object.entries(APP_EM)) {
  const s = indexSeries(appRaw[k]), L = s.dates.length;
  const b0 = s.pct200.findIndex((v) => v != null);
  const noBreadth = []; for (let i = b0; i < L; i++) if (s.pct200[i] == null) noBreadth.push(s.dates[i]);
  const nullClose = s.close.filter((v) => v == null).length;
  const longGaps = []; for (let i = 1; i < L; i++) { const g = (t(s.dates[i]) - t(s.dates[i - 1])) / DAY; if (g > 5) longGaps.push({ da: s.dates[i - 1], a: s.dates[i], giorni: g }); }
  const nDrops = []; for (let i = b0; i < L; i++) { if (s.n[i] == null) continue; const w = s.n.slice(Math.max(b0, i - 10), i + 11).filter((v) => v != null); const m = median(w); if (s.n[i] < 0.9 * m) nDrops.push({ data: s.dates[i], n: s.n[i], medianaVicina: m }); }
  const nDropsPerYear = {}; for (const x of nDrops) nDropsPerYear[x.data.slice(0, 4)] = (nDropsPerYear[x.data.slice(0, 4)] || 0) + 1;
  // stalli: chiusura uguale alla seduta prima
  const sameClose = []; for (let i = 1; i < L; i++) if (s.close[i] != null && s.close[i] === s.close[i - 1]) sameClose.push(s.dates[i]);
  // confronto con Yahoo scaricato oggi
  const y = IX[sym], ym = new Map(y.dates.map((d, i) => [d, y.close[i]])), am = new Set(s.dates);
  const yOnly = y.dates.filter((d) => d >= s.dates[0] && d <= s.dates.at(-1) && !am.has(d));
  const aOnly = s.dates.filter((d) => d >= y.dates[0] && !ym.has(d));
  const cmp = s.dates.filter((d) => ym.has(d)).map((d, _, __) => ({ d, x: s.close[s.dates.indexOf(d)] / ym.get(d) - 1 }));
  const big = cmp.filter((o) => Math.abs(o.x) > 0.005);
  const nullY = y.nullBars.filter((d) => d >= s.dates[0]);
  R.app[k] = {
    simboloPrezzo: sym, primaSeduta: s.dates[0], ultimaSeduta: s.dates.at(-1), sedute: L, chiusureNulle: nullClose,
    primaBreadth: b0 >= 0 ? s.dates[b0] : null, seduteSenzaBreadthDopoLaPrima: noBreadth.length, esempiSenzaBreadth: noBreadth.slice(-10),
    intervalliOltre5giorni: longGaps.length, intervalliLunghi: longGaps.sort((a, b) => b.giorni - a.giorni).slice(0, 8),
    calodiN: { sedute: nDrops.length, perAnno: nDropsPerYear, peggiori: [...nDrops].sort((a, b) => a.n / a.medianaVicina - b.n / b.medianaVicina).slice(0, 5) },
    chiusuraUgualeAllaPrecedente: sameClose.length, esempiChiusuraUguale: sameClose.slice(-8), ultimoN: s.n.filter((v) => v != null).at(-1), ultimiMembri: s.members.filter((v) => v != null).at(-1),
    confrontoYahooOggi: { seduteYahooAssentiNellApp: yOnly.length, esempiYahooAssenti: yOnly.slice(-10), seduteAppAssentiSuYahoo: aOnly.length, esempiAppAssenti: aOnly.slice(-10),
      chiusureDiverseOltre05pct: big.length, esempiDiverse: big.slice(-6).map((o) => ({ data: o.d, diffPct: r2(100 * o.x) })), barreYahooNulle: nullY.length, esempiBarreNulle: nullY.slice(-10) },
  };
  if (k === 'CSI300') {
    const etf = IX['510300.SS'], es = new Set(etf.dates);
    const missEtf = sse.dates.filter((d) => d >= etf.dates[0] && d <= etf.dates.at(-1) && !es.has(d));
    const nulls = new Set(etf.nullBars);
    R.app[k].etfFermoRispettoShanghai = { seduteShanghaiSenzaEtf: missEtf.length, diCuiBarraNullaSuYahoo: missEtf.filter((d) => nulls.has(d)).length, esempi: missEtf.slice(-10),
      appSenzaSedutaShanghai: sse.dates.filter((d) => d >= s.dates[0] && d <= s.dates.at(-1) && !am.has(d)).length,
      indice000300SuYahoo: `${(IX['000300.SS']?.dates.length || 0) + (IX['000300.SS']?.nullBars.length || 0)} barre giornaliere` };
  }
  if (k === 'EEM') {
    // cali di copertura e chiusure di Shanghai (borsa chiusa in un giorno lavorativo nei 7 giorni prima)
    const closedSse = (d) => { for (let x = t(d) - 7 * DAY; x <= t(d); x += DAY) { const z = iso(x); if (isWeekday(z) && z >= sse.dates[0] && !sseSet.has(z)) return true; } return false; };
    R.app[k].caliDiNConShanghaiChiusa = nDrops.filter((x) => closedSse(x.data)).length;
  }
}

fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
console.log('scritto', path.relative(ROOT, OUT));
