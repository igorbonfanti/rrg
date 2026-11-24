#!/usr/bin/env node
/*
 * analisi.mjs — ricerca sul POC (point of control) degli ultimi 12 mesi e sul passaggio di oro e argento dagli ETF
 * (GLD, SLV) ai future continui di Yahoo (GC=F, SI=F). Fase 1: non tocca l'app. Legge solo ricerca/poc/cache/ (scritta
 * da dati.mjs) e, in sola lettura, data/ath.json; scrive ricerca/poc/risultati.json.
 *
 * Uso: node ricerca/poc/dati.mjs && node ricerca/poc/analisi.mjs && python3 -I ricerca/poc/verifica.py
 *
 * PARTE A · oro e argento con i future (domanda A)
 *  - athStats (js/ath.js, la funzione dell'app) sulle barre giornaliere lette con parse (scripts/lib/yahoo.js, lo
 *    stesso codice di scripts/fetch_ath.js) per GLD, SLV, GC=F, SI=F: distanza, data del massimo dei 3 anni, calo più
 *    profondo; anche con le sedute fino all'11/11/2026, per il confronto con data/ath.json pubblicato.
 *  - Cambi di contratto: rapporto giornaliero future continuo / contratto attuale (GCZ26, SIZ26: le chiusure di Yahoo
 *    dei contratti singoli sono i settlement) e future continuo / ETF. Un cambio di contratto è un salto di log(F/C)
 *    oltre max(6 × mediana dei |salti|, 0,1%); si riporta per ognuno anche il salto dello stesso giorno di log(F/ETF).
 *  - Argento il 26/01/2026: chiusure vicine, massimo durante la seduta, contratti singoli (SIZ26, SIH27), barre orarie di
 *    SI=F e di SLV (rapporto SLV/SI=F alla stessa ora del settlement, 13:25 di New York, contro il giorno tipico).
 *
 * PARTE B · POC degli ultimi 12 mesi (domanda B)
 *  - Finestra: sedute da windowStart(ultima seduta, 1) (js/ath.js: stessa data di un anno prima) all'ultima seduta
 *    chiusa del mercato del grafico. Barre orarie assegnate alla seduta: per i future le ore dalle 18:00 di New York
 *    vanno alla seduta del giorno dopo; ETF e indici il giorno di borsa; bitcoin il giorno UTC.
 *  - Scala: ogni prezzo dello strumento dei volumi si porta sulla scala dello strumento del grafico moltiplicandolo per
 *    il rapporto delle chiusure giornaliere (grafico / strumento) della sua seduta; le sedute senza chiusura di uno dei
 *    due si scartano (contate in `skipped`). Per i future c'è anche la scala del contratto attuale (rapporto contratto /
 *    continuo della seduta), che toglie gli scalini dei cambi di contratto.
 *  - Metodi: (a) giornaliero, tutto il volume alla chiusura; (b) giornaliero, volume spalmato in modo uniforme tra
 *    minimo e massimo della seduta; (c) orario, volume alla chiusura dell'ora; (c2, solo informativo) orario spalmato.
 *  - Fasce: 50, 100, 200 fasce uguali tra il minimo e il massimo dei 12 mesi (sulla scala del grafico, gli stessi per
 *    tutti i metodi di un mercato), oppure fasce a passo fisso in % (0,5% e 1%) dal minimo. POC = centro della fascia con
 *    più volume (parità: la più bassa). Value area 70%: dalla fascia del POC si aggiunge ogni volta la fascia vicina
 *    (sopra o sotto) con più volume finché si arriva al 70% del volume (parità: sopra); VAL e VAH sono i bordi.
 *  - Criterio deciso prima di guardare i risultati: il POC di un mercato è «robusto» se i 15 livelli (metodi a, b, c ×
 *    5 tipi di fasce) stanno entro il 2%: (massimo − minimo) / minimo ≤ 2%.
 *  - Volumi giornalieri: se il volume giornaliero di Yahoo è meno della metà della somma dei volumi orari della stessa
 *    seduta (mediana sui 12 mesi; succede a SI=F e HG=F, il cui storico giornaliero è il contratto del mese più vicino,
 *    con pochi scambi), nei metodi (a) e (b) si usa la somma oraria. Un volume giornaliero identico a quello della seduta
 *    prima (Yahoo ricopia il volume dell'ultimo giorno finché non arriva il definitivo) si sostituisce con la somma oraria.
 *  - Volumi orari: quando il giornaliero è buono, i volumi orari servono solo a distribuire nella seduta il volume del
 *    giorno (riportati alla somma giornaliera): SOXX ha i volumi orari non rettificati per lo split 3:1 del 05/11/2026,
 *    BTC-USD ha metà delle ore a volume 0, le ore degli ETF non hanno l'asta di chiusura.
 *  - In più: gruppi dei 15 livelli (salto > 2% = gruppo nuovo), intervallo di VAL e VAH sui 15 calcoli, secondo picco del
 *    profilo (fascia con più volume ad almeno il 3% dal POC, in quota del POC), POC alla fine di ciascuna delle ultime 20
 *    sedute (strumento principale), cambi di contratto dei future nei 12 mesi, volume di ^GSPC e ^NDX contro ^NYA, ^IXIC
 *    e la somma dei membri, settlement CME delle ultime sedute contro Yahoo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../scripts/lib/yahoo.js';
import { athStats, windowStart } from '../../js/ath.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CACHE = path.join(HERE, 'cache');
const r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10000) / 10000);
const pct = (a, b) => r2((a / b - 1) * 100);
const median = (a) => { const s = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

// ------------------------------------------------------------------ lettura della cache grezza
function raw(kind, sym) {
  const f = path.join(CACHE, `${kind}_${sym.replace(/[^A-Za-z0-9.-]/g, '_')}.json`);
  if (!fs.existsSync(f)) return null;
  const j = JSON.parse(fs.readFileSync(f, 'utf-8'));
  return j.res && !j.res.error ? { res: j.res, fetchedSec: Date.parse(j.fetched) / 1000 } : null;
}
// serie giornaliera come la legge l'app (parse di scripts/lib/yahoo.js: solo barre chiuse, date nel fuso della borsa)
function appDaily(sym, kind = 'd') {
  const r = raw(kind, sym);
  return r ? parse(r.res, { nowSec: r.fetchedSec }) : null;
}
const FMT = {};
function localDate(ts, tz) {
  const f = FMT[tz] || (FMT[tz] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }));
  const p = Object.fromEntries(f.formatToParts(ts * 1000).map((x) => [x.type, x.value]));
  return { d: `${p.year}-${p.month}-${p.day}`, h: +p.hour };
}
const nextDay = (d) => new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10);
/**
 * Barre OHLCV grezze (anche il volume, che parse non dà). Seduta: per i future (instrumentType FUTURE) le ore dalle 18
 * vanno al giorno dopo (solo barre orarie). Scarta le barre senza chiusura.
 */
function bars(kind, sym) {
  const r = raw(kind, sym);
  if (!r) return null;
  const { res } = r, q = res.indicators.quote[0], tz = res.meta.exchangeTimezoneName;
  const fut = res.meta.instrumentType === 'FUTURE', hourly = res.meta.dataGranularity !== '1d';
  const out = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    const c = q.close[i];
    if (c == null) continue;
    const t = res.timestamp[i], ld = localDate(t, tz);
    const s = fut && hourly && ld.h >= 18 ? nextDay(ld.d) : ld.d;
    const h = q.high[i] != null ? Math.max(q.high[i], c) : c, l = q.low[i] != null ? Math.min(q.low[i], c) : c;
    out.push({ t, d: ld.d, hr: ld.h, s, o: q.open[i], h, l, c, v: q.volume[i] || 0 });
  }
  return { bars: out, meta: res.meta };
}
const closeMap = (b) => { const m = new Map(); for (const x of b.bars) m.set(x.d, x.c); return m; };

// ================================================================== PARTE A
function partA() {
  const out = { stats: {}, published: {}, statsTo1111: {}, rolls: {}, silverJan26: {} };
  const ath = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ath.json'), 'utf-8'));
  for (const sym of ['GLD', 'SLV', 'GC=F', 'SI=F', 'SIL=F', 'GCZ26.CMX', 'SIZ26.CMX']) {
    const s = appDaily(sym, sym.includes('.CMX') ? 'c' : 'd');
    out.stats[sym] = athStats(s.dates, s.close, s.high);
    const k = s.dates.findIndex((d) => d > '2026-11-11');
    const n = k < 0 ? s.dates.length : k;
    out.statsTo1111[sym] = athStats(s.dates.slice(0, n), s.close.slice(0, n), s.high.slice(0, n));
  }
  for (const m of ath.markets) if (['GLD', 'SLV'].includes(m.symbol)) out.published[m.symbol] = m.stats;
  // cambi di contratto nei 3 anni: rapporto F/C (contratto attuale) e F/ETF
  for (const [F, C, E] of [['GC=F', 'GCZ26.CMX', 'GLD'], ['SI=F', 'SIZ26.CMX', 'SLV']]) {
    const f = appDaily(F), c = appDaily(C, 'c'), e = appDaily(E);
    const cm = new Map(c.dates.map((d, i) => [d, c.close[i]])), em = new Map(e.dates.map((d, i) => [d, e.close[i]]));
    const st = out.stats[F], from = st.from;
    const days = f.dates.map((d, i) => ({ d, f: f.close[i], c: cm.get(d), e: em.get(d) })).filter((x) => x.d >= from && x.c != null && x.e != null);
    const jumps = [];
    for (let i = 1; i < days.length; i++) jumps.push({ d: days[i].d, prev: days[i - 1].d, fc: Math.log(days[i].f / days[i].c) - Math.log(days[i - 1].f / days[i - 1].c), fe: Math.log(days[i].f / days[i].e) - Math.log(days[i - 1].f / days[i - 1].e) });
    const mad = median(jumps.map((j) => Math.abs(j.fc))), madE = median(jumps.map((j) => Math.abs(j.fe)));
    const thr = Math.max(6 * mad, 0.001);
    const rolls = jumps.filter((j) => Math.abs(j.fc) > thr).map((j) => ({ date: j.d, stepFC: r2(j.fc * 100), stepFE: r2(j.fe * 100) }));
    const at = (d) => days.find((x) => x.d === d);
    const ref = at(st.refDate), last = at(st.lastDate);
    const inRef = rolls.filter((r) => r.date > st.refDate && r.date <= st.lastDate);
    out.rolls[F] = {
      contract: C, etf: E, from, sessions: days.length, medianAbsDailyChangeFC: r4(mad * 100), medianAbsDailyChangeFE: r4(madE * 100), thresholdPct: r4(thr * 100),
      rolls, nRolls: rolls.length,
      sinceRef: { refDate: st.refDate, lastDate: st.lastDate, nRolls: inRef.length, sumStepsFC: r2(inRef.reduce((a, r) => a + r.stepFC, 0)), sumStepsFE: r2(inRef.reduce((a, r) => a + r.stepFE, 0)),
        changeLogFC: r2(Math.log((last.f / last.c) / (ref.f / ref.c)) * 100), changeLogFE: r2(Math.log((last.f / last.e) / (ref.f / ref.e)) * 100),
        distF: pct(last.f, ref.f), distC: pct(last.c, ref.c), distE: pct(last.e, ref.e) },
    };
    // calo e risalita con il contratto attuale e con l'ETF, dallo stesso giorno del massimo del future
  }
  // argento attorno al 26/01/2026
  const si = bars('d', 'SI=F').bars, k = si.findIndex((x) => x.d === '2026-01-26');
  const neigh = [...si.slice(k - 5, k), ...si.slice(k + 1, k + 6)];
  const sj = out.silverJan26;
  sj.days = si.slice(k - 3, k + 6).map((x) => ({ d: x.d, o: r4(x.o), h: r4(x.h), l: r4(x.l), c: r4(x.c), v: x.v }));
  sj.closeVsNeighbourMedianPct = pct(si[k].c, median(neigh.map((x) => x.c)));
  const sMax = out.stats['SI=F'];
  sj.intradayRef = { value: sMax.intradayRef, date: sMax.intradayRefDate };
  sj.contracts = {};
  for (const C of ['SIZ26.CMX', 'SIH27.CMX', 'SIK27.CMX', 'SIL=F']) {
    const b = bars(C === 'SIL=F' ? 'd' : 'c', C).bars.filter((x) => x.d >= '2026-01-02' && x.d <= '2026-03-31');
    const mx = b.reduce((a, x) => (x.c > a.c ? x : a));
    const cm = new Map(b.map((x) => [x.d, x.c]));
    sj.contracts[C] = { maxCloseJanMar26: r4(mx.c), date: mx.d, ratioToSIF: Object.fromEntries(sj.days.map((x) => [x.d, cm.has(x.d) ? r4(cm.get(x.d) / x.c) : null])) };
  }
  // barre orarie del 26/01: percorso di SI=F e confronto con SLV alla stessa ora
  const hs = bars('h', 'SI=F').bars.filter((x) => x.s === '2026-01-26');
  sj.hourlySIF = hs.map((x) => ({ t: new Date(x.t * 1000).toISOString(), hNY: x.hr, h: r4(x.h), l: r4(x.l), c: r4(x.c), v: x.v }));
  // rapporto SLV / SI=F: SLV alla fine della barra oraria che comprende le 13:25 (barra 12:30-13:30, chiusura 13:30) contro
  // la chiusura giornaliera di SI=F (settlement); e SLV alla chiusura delle 16:00 contro la stessa chiusura di SI=F
  const slvH = bars('h', 'SLV').bars, slvD = bars('d', 'SLV').bars;
  const at1330 = new Map(); for (const x of slvH) { const ld = localDate(x.t, 'America/New_York'); const mm = new Date(x.t * 1000).getUTCMinutes(); if (ld.h === 12 && mm === 30) at1330.set(x.d, x.c); }
  const sid = new Map(si.map((x) => [x.d, x.c])), slvc = new Map(slvD.map((x) => [x.d, x.c]));
  const lastD = si[si.length - 1].d, from1 = windowStart(lastD, 1);
  const rSame = [], rClose = [];
  for (const [d, v] of at1330) if (d >= windowStart('2026-01-26', 1) && d <= '2026-11-12' && sid.has(d) && slvc.has(d)) { rSame.push({ d, r: v / sid.get(d) }); rClose.push({ d, r: slvc.get(d) / sid.get(d) }); }
  const pick = (a, d) => (a.find((x) => x.d === d) || {}).r;
  sj.ratioSLVtoSIF = {
    sessions: rSame.length, from: rSame.length ? rSame.map((x) => x.d).sort()[0] : null,
    at1330: { median: r4(median(rSame.map((x) => x.r))), on0126: r4(pick(rSame, '2026-01-26')), on0128: r4(pick(rSame, '2026-01-28')), on0129: r4(pick(rSame, '2026-01-29')) },
    at1600: { median: r4(median(rClose.map((x) => x.r))), on0126: r4(pick(rClose, '2026-01-26')), on0128: r4(pick(rClose, '2026-01-28')), on0129: r4(pick(rClose, '2026-01-29')) },
    gapAt1600vsMedianPct0126: pct(pick(rClose, '2026-01-26'), median(rClose.map((x) => x.r))),
    gapAt1330vsMedianPct0126: pct(pick(rSame, '2026-01-26'), median(rSame.map((x) => x.r))),
  };
  // SI=F alle 16:00 (chiusura della barra oraria 15:00-16:00) contro la chiusura di SLV delle 16:00: stessa ora
  const sif16 = new Map(); for (const x of bars('h', 'SI=F').bars) if (x.hr === 15) sif16.set(x.d, x.c);
  const r16 = []; for (const [d, v] of slvc) if (d >= windowStart('2026-01-26', 1) && d <= '2026-11-12' && sif16.has(d)) r16.push({ d, r: v / sif16.get(d) });
  sj.ratioSLVcloseToSIFat1600 = { sessions: r16.length, median: r4(median(r16.map((x) => x.r))), on0126: r4(pick(r16, '2026-01-26')), gapVsMedianPct0126: pct(pick(r16, '2026-01-26'), median(r16.map((x) => x.r))) };
  sj.SIFat1600on0126 = r4(sif16.get('2026-01-26'));
  sj.SLVclose0126 = r4(slvc.get('2026-01-26'));
  // seconda chiusura più alta del future nella finestra dei 3 anni (il massimo è isolato?)
  const fromA = out.stats['SI=F'].from, top = si.filter((x) => x.d >= fromA).sort((a, b) => b.c - a.c).slice(0, 4);
  sj.topCloses = top.map((x) => ({ d: x.d, c: r4(x.c), vsMaxPct: pct(x.c, top[0].c) }));
  // a che ora corrisponde la chiusura giornaliera dei future di Yahoo? scarto mediano tra la chiusura giornaliera e la
  // chiusura di ogni barra oraria della stessa seduta (ora di New York di inizio barra), ultimi 12 mesi
  out.closeTime = {};
  for (const F of ['GC=F', 'SI=F', 'HG=F', 'CL=F']) {
    const dc = new Map(bars('d', F).bars.map((x) => [x.d, x.c])), byHr = {};
    for (const x of bars('h', F).bars) if (x.s >= '2025-11-12' && x.s <= '2026-11-12' && dc.has(x.s)) (byHr[x.hr] = byHr[x.hr] || []).push(Math.abs(dc.get(x.s) / x.c - 1));
    const rows = Object.entries(byHr).filter(([, a]) => a.length > 150).map(([h, a]) => ({ barStartNY: +h, n: a.length, medianAbsPct: r4(median(a) * 100) })).sort((a, b) => a.medianAbsPct - b.medianAbsPct);
    out.closeTime[F] = { best: rows[0], at1600: rows.find((r) => r.barStartNY === 15) || null, at1700: rows.find((r) => r.barStartNY === 16) || null };
  }
  // settlement CME contro Yahoo: quale contratto è il future continuo (=F) e se i prezzi e i volumi coincidono
  const fonti = fs.existsSync(path.join(CACHE, 'fonti.json')) ? JSON.parse(fs.readFileSync(path.join(CACHE, 'fonti.json'), 'utf-8')) : null;
  out.otherSources = fonti ? { probe: fonti.probe, hourlyLimit: fonti.hourlyLimit, cme: {} } : null;
  const MC = { JAN: 'F', FEB: 'G', MAR: 'H', APR: 'J', MAY: 'K', JUN: 'M', JUL: 'N', AUG: 'Q', SEP: 'U', OCT: 'V', NOV: 'X', DEC: 'Z' };
  const EXCH = { SI: 'CMX', GC: 'CMX', HG: 'CMX', CL: 'NYM' };
  if (fonti) for (const [k, byDate] of Object.entries(fonti.cme)) {
    const cont = new Map(bars('d', `${k}=F`).bars.map((x) => [x.d, x]));
    out.otherSources.cme[k] = Object.entries(byDate).map(([td, v]) => {
      const iso = `${td.slice(6)}-${td.slice(0, 2)}-${td.slice(3, 5)}`, y = cont.get(iso);
      if (!v.settlements || !v.settlements.length) return { date: iso, empty: true };
      const rows = v.settlements.map((x) => {
        const [mon, yy] = x.month.split(' '), sym = `${k}${MC[mon]}${yy}.${EXCH[k]}`;
        const cb = bars('c', sym), yb = cb && cb.bars.find((b) => b.d === iso);
        return { month: x.month, settle: +String(x.settle).replace(/,/g, ''), volume: +String(x.volume).replace(/,/g, ''), yahooContract: sym, yahooClose: yb ? r4(yb.c) : null, yahooVolume: yb ? yb.v : null };
      });
      const same = y ? rows.find((r) => Math.abs(r.settle / y.c - 1) < 1e-6) : null; // Yahoo salva in float32
      return { date: iso, yahooContinuousClose: y ? r4(y.c) : null, yahooContinuousVolume: y ? y.v : null, continuousEqualsMonth: same ? same.month : null, rows };
    });
  }
  void from1;
  return out;
}

// ================================================================== PARTE B
const GRIDS = [{ id: 'n50', n: 50 }, { id: 'n100', n: 100 }, { id: 'n200', n: 200 }, { id: 'p0.5', step: 0.005 }, { id: 'p1', step: 0.01 }];
function edges(g, lo, hi) {
  if (g.n) return Array.from({ length: g.n + 1 }, (_, i) => lo + ((hi - lo) * i) / g.n);
  const e = [lo]; while (e[e.length - 1] < hi) e.push(e[e.length - 1] * (1 + g.step));
  return e;
}
function binOf(e, p) { // indice della fascia [e[i], e[i+1]); il massimo va nell'ultima
  if (p <= e[0]) return 0;
  if (p >= e[e.length - 1]) return e.length - 2;
  let a = 0, b = e.length - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (e[m] <= p) a = m; else b = m; }
  return a;
}
function profile(items, mode, e) {
  const v = new Float64Array(e.length - 1);
  for (const x of items) {
    if (!(x.v > 0)) continue;
    if (mode === 'close' || x.h <= x.l) { v[binOf(e, x.c)] += x.v; continue; }
    const i0 = binOf(e, x.l), i1 = binOf(e, x.h), w = x.h - x.l;
    for (let i = i0; i <= i1; i++) v[i] += (x.v * (Math.min(x.h, e[i + 1]) - Math.max(x.l, e[i]))) / w;
  }
  return v;
}
function readProfile(v, e, g) {
  let p = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[p]) p = i;
  const center = (i) => (g.n ? (e[i] + e[i + 1]) / 2 : Math.sqrt(e[i] * e[i + 1]));
  const tot = v.reduce((a, b) => a + b, 0);
  let lo = p, hi = p, s = v[p];
  while (s < 0.7 * tot) {
    const up = hi + 1 < v.length ? v[hi + 1] : -1, dn = lo - 1 >= 0 ? v[lo - 1] : -1;
    if (up < 0 && dn < 0) break;
    if (up >= dn) { hi++; s += up; } else { lo--; s += dn; }
  }
  // secondo picco: la fascia con più volume lontana almeno il 3% dal POC
  let q = -1; for (let i = 0; i < v.length; i++) if (Math.abs(center(i) / center(p) - 1) >= 0.03 && (q < 0 || v[i] > v[q])) q = i;
  return { poc: center(p), val: e[lo], vah: e[hi + 1], second: q >= 0 ? center(q) : null, secondShare: q >= 0 ? v[q] / v[p] : null, binWidthPct: ((e[p + 1] - e[p]) / center(p)) * 100 };
}

/**
 * Barre dello strumento dei volumi portate sulla scala del grafico, nella finestra.
 * @param {object} o {vol, chart, scale: 'chart'|'contract', contract}
 */
function mapped(o, from, to) {
  const chartD = bars('d', o.chart), volD = bars('d', o.vol), volH = bars('h', o.vol);
  const cm = closeMap(chartD), vm = closeMap(volD);
  let target = cm;
  if (o.scale === 'contract') target = closeMap(bars('c', o.contract));
  // fattore della seduta: (chiusura della scala) / (chiusura dello strumento)
  const factor = (s) => (target.has(s) && vm.has(s) ? target.get(s) / vm.get(s) : null);
  // volume giornaliero: quello di Yahoo o la somma oraria
  const hsum = new Map(); for (const x of volH.bars) if (x.s >= from && x.s <= to) hsum.set(x.s, (hsum.get(x.s) || 0) + x.v);
  const dIn = volD.bars.filter((x) => x.d >= from && x.d <= to);
  const ratios = dIn.filter((x) => hsum.get(x.d) > 0).map((x) => x.v / hsum.get(x.d));
  const dailyVsHourly = median(ratios), useHourlySum = dailyVsHourly != null && dailyVsHourly < 0.5;
  const skipped = { daily: 0, hourly: 0 };
  const daily = [];
  // volume giornaliero identico a quello della seduta prima: Yahoo ricopia il volume del giorno prima finché non arriva
  // quello definitivo (visto con i settlement CME del 12/11/2026); per quella seduta si usa la somma oraria
  let stale = 0;
  const allD = volD.bars, prevV = new Map(allD.map((x, i) => [x.d, i ? allD[i - 1].v : null]));
  for (const x of dIn) {
    const f = factor(x.d); if (f == null) { skipped.daily++; continue; }
    const isStale = !useHourlySum && x.v > 0 && prevV.get(x.d) === x.v && hsum.get(x.d) > 0;
    if (isStale) stale++;
    const v = useHourlySum || isStale ? hsum.get(x.d) || 0 : x.v;
    daily.push({ s: x.d, c: x.c * f, h: x.h * f, l: x.l * f, v });
  }
  // volume orario: se il giornaliero è buono, i volumi orari servono solo a distribuire nella seduta il volume giornaliero
  // (somma oraria riportata al volume del giorno): così non pesano le ore mancanti o non rettificate per gli split
  // (SOXX 3:1 il 05/11/2026: volumi orari non rettificati) né l'asta di chiusura che manca nelle barre orarie
  const dv = new Map(daily.map((x) => [x.s, x.v]));
  const hourly = [];
  for (const x of volH.bars) {
    if (x.s < from || x.s > to) continue;
    const f = factor(x.s); if (f == null) { skipped.hourly++; continue; }
    const k = useHourlySum || o.hourlyRaw ? 1 : hsum.get(x.s) > 0 && dv.has(x.s) ? dv.get(x.s) / hsum.get(x.s) : 0;
    hourly.push({ s: x.s, c: x.c * f, h: x.h * f, l: x.l * f, v: x.v * k });
  }
  const zeroH = hourly.filter((x) => !(x.v > 0)).length;
  return { daily, hourly, dailyVsHourly: r4(dailyVsHourly), useHourlySum, skipped, zeroHourly: zeroH, staleDaily: stale };
}

function pocSet(m) {
  const all = [...m.daily, ...m.hourly];
  const lo = Math.min(...all.map((x) => x.l)), hi = Math.max(...all.map((x) => x.h));
  const methods = { a: [m.daily, 'close'], b: [m.daily, 'spread'], c: [m.hourly, 'close'], c2: [m.hourly, 'spread'] };
  const res = {};
  for (const [k, [items, mode]] of Object.entries(methods)) {
    res[k] = {};
    for (const g of GRIDS) {
      const e = edges(g, lo, hi), r = readProfile(profile(items, mode, e), e, g);
      res[k][g.id] = { poc: r4(r.poc), val: r4(r.val), vah: r4(r.vah), second: r4(r.second), secondShare: r4(r.secondShare), binWidthPct: r4(r.binWidthPct) };
    }
  }
  // profili con 100 fasce (quota del volume in ogni fascia), per i grafici e per capire i casi non robusti
  const e100 = edges(GRIDS[1], lo, hi), prof = {};
  for (const [k, [items, mode]] of Object.entries(methods)) { const v = profile(items, mode, e100), t = v.reduce((a, b) => a + b, 0); prof[k] = Array.from(v, (x) => Math.round((x / t) * 1e5) / 1e5); }
  const vals = ['a', 'b', 'c'].flatMap((k) => GRIDS.map((g) => res[k][g.id].poc));
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const n100 = ['a', 'b', 'c'].map((k) => res[k].n100.poc);
  // gruppi dei 15 livelli: valori ordinati, un gruppo nuovo quando il salto dal precedente supera il 2%
  const sorted = [...vals].sort((x, y) => x - y), groups = [];
  for (const v of sorted) { const g = groups[groups.length - 1]; if (g && v / g[g.length - 1] - 1 <= 0.02) g.push(v); else groups.push([v]); }
  const vaL = ['a', 'b', 'c'].flatMap((k) => GRIDS.map((g) => res[k][g.id].val)), vaH = ['a', 'b', 'c'].flatMap((k) => GRIDS.map((g) => res[k][g.id].vah));
  const clusters = groups.map((g) => ({ n: g.length, from: r4(g[0]), to: r4(g[g.length - 1]) }));
  return { clusters, vaLowRange: [r4(Math.min(...vaL)), r4(Math.max(...vaL))], vaHighRange: [r4(Math.min(...vaH)), r4(Math.max(...vaH))],
    vaLowSpreadPct: r2((Math.max(...vaL) / Math.min(...vaL) - 1) * 100), vaHighSpreadPct: r2((Math.max(...vaH) / Math.min(...vaH) - 1) * 100),
    range: [r4(lo), r4(hi)], nDaily: m.daily.length, nHourly: m.hourly.length, methods: res, minPoc: r4(mn), maxPoc: r4(mx), spreadPct: r2((mx / mn - 1) * 100), robust: mx / mn - 1 <= 0.02,
    spreadN100Pct: r2((Math.max(...n100) / Math.min(...n100) - 1) * 100), medianPoc: r4(median(vals)), profile100: prof };
}

// mercati: strumento del grafico (quello del pannello; oro e argento con i future scelti dall'utente) e strumenti dei volumi
const MARKETS = [
  { id: 'BTC', chart: 'BTC-USD', variants: [{ vol: 'BTC-USD', main: true }] },
  { id: 'GOLD', chart: 'GC=F', contract: 'GCZ26.CMX', variants: [{ vol: 'GC=F', main: true }, { vol: 'GC=F', scale: 'contract' }, { vol: 'GLD' }, { vol: 'GLD', scale: 'contract' }] },
  { id: 'SILVER', chart: 'SI=F', contract: 'SIZ26.CMX', variants: [{ vol: 'SI=F', main: true }, { vol: 'SI=F', scale: 'contract' }, { vol: 'SLV' }, { vol: 'SLV', scale: 'contract' }] },
  { id: 'COPPER', chart: 'HG=F', contract: 'HGZ26.CMX', variants: [{ vol: 'HG=F', main: true }, { vol: 'HG=F', scale: 'contract' }] },
  { id: 'WTI', chart: 'CL=F', contract: 'CLZ26.NYM', variants: [{ vol: 'CL=F', main: true }, { vol: 'CL=F', scale: 'contract' }] },
  { id: 'NDX', chart: '^NDX', variants: [{ vol: 'NQ=F', main: true }, { vol: 'QQQ' }, { vol: '^NDX' }] },
  { id: 'SPX', chart: '^GSPC', variants: [{ vol: 'ES=F', main: true }, { vol: 'SPY' }, { vol: '^GSPC' }] },
  { id: 'SOXX', chart: 'SOXX', variants: [{ vol: 'SOXX', main: true }] },
  { id: 'KOSPI', chart: '^KS11', variants: [{ vol: '069500.KS', main: true }, { vol: 'EWY' }, { vol: '^KS11' }] },
];

function partB() {
  const out = {};
  for (const M of MARKETS) {
    const ch = appDaily(M.chart);
    const to = ch.dates[ch.dates.length - 1], from = windowStart(to, 1);
    const last = ch.close[ch.close.length - 1];
    const row = { chart: M.chart, from, to, last: r4(last), variants: [] };
    for (const V of M.variants) {
      const o = { vol: V.vol, chart: M.chart, scale: V.scale || 'chart', contract: M.contract };
      const m = mapped(o, from, to), ps = pocSet(m);
      // il livello sulla scala del contratto attuale si confronta con l'ultima chiusura del contratto
      const lastScale = o.scale === 'contract' ? closeMap(bars('c', M.contract)).get(to) : last;
      // stabilità nel tempo (solo strumento principale): lo stesso POC (b, 100 fasce) calcolato alla fine di ognuna delle
      // ultime 20 sedute, ciascuno sui suoi 12 mesi: quanto salterebbe la linea da un giorno all'altro
      let rolling = null;
      if (V.main) {
        const ends = ch.dates.slice(-20), pocs = [];
        for (const t of ends) { const mm = mapped(o, windowStart(t, 1), t), pp = pocSet(mm); pocs.push({ d: t, b: pp.methods.b.n100.poc, c: pp.methods.c.n100.poc }); }
        const jumps = (k) => pocs.slice(1).filter((x, i) => Math.abs(x[k] / pocs[i][k] - 1) > 0.02).length;
        rolling = { sessions: pocs.length, bMin: r4(Math.min(...pocs.map((x) => x.b))), bMax: r4(Math.max(...pocs.map((x) => x.b))), bJumpsOver2pct: jumps('b'), cMin: r4(Math.min(...pocs.map((x) => x.c))), cMax: r4(Math.max(...pocs.map((x) => x.c))), cJumpsOver2pct: jumps('c'), pocs };
      }
      row.variants.push({ rolling20: rolling, vol: V.vol, scale: o.scale === 'contract' ? `contratto ${M.contract}` : `grafico ${M.chart}`, main: !!V.main, lastOnScale: r4(lastScale),
        dailyVsHourlyVolume: m.dailyVsHourly, dailyVolumeFromHourly: m.useHourlySum, staleDailyVolumes: m.staleDaily, skipped: m.skipped, zeroVolumeHourlyBars: m.zeroHourly,
        ...ps, lastVsPocPct: pct(lastScale, ps.methods.b.n100.poc) });
    }
    out[M.id] = row;
  }
  return out;
}

// volume degli indici di Yahoo: uguale a quello di ^NYA / ^IXIC? somma dei membri?
function indexVolume() {
  const res = {};
  for (const [I, X, key] of [['^GSPC', '^NYA', 'spx'], ['^NDX', '^IXIC', 'ndx']]) {
    const a = bars('d', I).bars, b = closeMapV(bars('d', X).bars);
    const to = a[a.length - 1].d, from = windowStart(to, 1);
    const w = a.filter((x) => x.d >= from);
    const eq = w.filter((x) => b.get(x.d) === x.v).length;
    // somma dei volumi dei membri (ultimo mese)
    const mem = JSON.parse(fs.readFileSync(path.join(CACHE, 'membri.json'), 'utf-8'))[key];
    const sum = new Map(); let got = 0;
    for (const t of mem) { const bb = bars('m', t.replace(/\./g, '-')); if (!bb) continue; got++; for (const x of bb.bars) sum.set(x.d, (sum.get(x.d) || 0) + x.v); }
    const days = w.filter((x) => sum.has(x.d)).map((x) => ({ d: x.d, index: x.v, members: sum.get(x.d), ratio: r4(x.v / sum.get(x.d)) }));
    res[I] = { comparedWith: X, sessions: w.length, equalToComposite: eq, members: mem.length, membersDownloaded: got, memberDays: days.length, medianIndexOverMembers: r4(median(days.map((x) => x.ratio))), lastDays: days.slice(-5) };
  }
  return res;
}
const closeMapV = (b) => new Map(b.map((x) => [x.d, x.v]));

// cambi di contratto nei 12 mesi per i future dei volumi: rapporto continuo / contratto attuale e volume orario attorno
function rolls12() {
  const res = {};
  for (const [F, C] of [['GC=F', 'GCZ26.CMX'], ['SI=F', 'SIZ26.CMX'], ['HG=F', 'HGZ26.CMX'], ['CL=F', 'CLZ26.NYM'], ['ES=F', 'ESZ26.CME'], ['NQ=F', 'NQZ26.CME']]) {
    const f = bars('d', F).bars, cm = closeMap(bars('c', C));
    const to = f[f.length - 1].d >= '2026-11-13' ? f[f.length - 2].d : f[f.length - 1].d, from = windowStart(to, 1);
    const days = f.filter((x) => x.d >= from && x.d <= to && cm.has(x.d)).map((x) => ({ d: x.d, r: Math.log(x.c / cm.get(x.d)) }));
    const j = []; for (let i = 1; i < days.length; i++) j.push({ d: days[i].d, x: days[i].r - days[i - 1].r });
    const mad = median(j.map((x) => Math.abs(x.x))), thr = Math.max(6 * mad, 0.001);
    const steps = j.filter((x) => Math.abs(x.x) > thr).map((x) => ({ date: x.d, stepPct: r2(x.x * 100) }));
    // volume orario per seduta (contratto attivo) 3 sedute prima e dopo ogni salto
    const hv = new Map(); for (const x of bars('h', F).bars) hv.set(x.s, (hv.get(x.s) || 0) + x.v);
    const sess = [...hv.keys()].sort();
    for (const s of steps) {
      const k = sess.indexOf(s.date);
      if (k > 3) { const b = median(sess.slice(k - 3, k).map((d) => hv.get(d))), a = median(sess.slice(k, k + 3).map((d) => hv.get(d))); s.hourlyVolAfterOverBefore = r2(a / b); }
    }
    const first = days[0], lastD = days[days.length - 1];
    res[F] = { contract: C, from, to, sessions: days.length, medianAbsDailyPct: r4(mad * 100), thresholdPct: r4(thr * 100), steps,
      // distanza tra continuo e contratto attuale all'inizio della finestra: di quanto il prezzo di 12 mesi fa va spostato
      gapAtStartPct: r2((Math.exp(-first.r) - 1) * 100), gapAtEndPct: r2((Math.exp(-lastD.r) - 1) * 100) };
  }
  return res;
}

// quale contratto seguono le barre orarie di SI=F e GC=F: quota di ore con chiusura uguale a quella del contratto di
// dicembre 2026 (stesso istante), per mese
function hourlyContract() {
  const res = {};
  for (const [F, C] of [['SI=F', 'SIZ26.CMX'], ['GC=F', 'GCZ26.CMX']]) {
    const c = new Map(bars('ch', C).bars.map((x) => [x.t, x.c])), by = {};
    for (const x of bars('h', F).bars) if (c.has(x.t) && x.d >= '2025-11-01') { const k = x.d.slice(0, 7), b = by[k] || (by[k] = [0, 0]); b[0]++; if (Math.abs(x.c / c.get(x.t) - 1) < 1e-6) b[1]++; }
    res[F] = { contract: C, byMonth: Object.fromEntries(Object.entries(by).map(([k, [n, e]]) => [k, { hours: n, equal: e }])) };
  }
  return res;
}
// peso dei future rispetto agli ETF nel tempo: rapporto dei volumi giornalieri future/ETF, mediana per mese divisa per la
// mediana dei 12 mesi
function volumeMix() {
  const res = {};
  for (const [F, E] of [['ES=F', 'SPY'], ['NQ=F', 'QQQ']]) {
    const f = new Map(bars('d', F).bars.map((x) => [x.d, x.v])), e = bars('d', E).bars;
    const to = e[e.length - 1].d, from = windowStart(to, 1);
    const rows = e.filter((x) => x.d >= from && x.d < to && f.get(x.d) > 0 && x.v > 0).map((x) => ({ m: x.d.slice(0, 7), r: f.get(x.d) / x.v }));
    const all = median(rows.map((x) => x.r)), by = {};
    for (const x of rows) (by[x.m] = by[x.m] || []).push(x.r);
    res[`${F}/${E}`] = { from, to, medianRatio: r4(all), monthVsYear: Object.fromEntries(Object.entries(by).map(([k, a]) => [k, r2(median(a) / all)])) };
  }
  return res;
}

const A = partA(), B = partB(), IV = indexVolume(), R = rolls12();
A.hourlyContract = hourlyContract();
const VM = volumeMix();
const out = { generated: new Date().toISOString(), note: 'Scritto da ricerca/poc/analisi.mjs dai dati in ricerca/poc/cache/ (Yahoo Finance). Metodo in testa allo script e in ricerca/poc/sintesi.md.', A, B, indexVolume: IV, rolls12: R, volumeMix: VM };
fs.writeFileSync(path.join(HERE, 'risultati.json'), JSON.stringify(out, null, 1) + '\n');

// riepilogo a schermo
for (const [id, m] of Object.entries(B)) {
  console.log(`\n${id} (grafico ${m.chart}, ${m.from} → ${m.to}, ultima ${m.last})`);
  for (const v of m.variants) {
    const f = (k) => v.methods[k].n100.poc;
    if (v.rolling20) console.log(`    ultime 20 sedute: POC b ${v.rolling20.bMin}–${v.rolling20.bMax} (salti >2%: ${v.rolling20.bJumpsOver2pct}), c ${v.rolling20.cMin}–${v.rolling20.cMax} (salti >2%: ${v.rolling20.cJumpsOver2pct})`);
    console.log(`  ${v.main ? '*' : ' '} ${v.vol.padEnd(10)} ${v.scale.padEnd(20)} a ${f('a')}  b ${f('b')}  c ${f('c')}  c2 ${f('c2')}  | 15 livelli ${v.minPoc}–${v.maxPoc} scarto ${v.spreadPct}% ${v.robust ? 'ROBUSTO' : 'non robusto'} gruppi ${v.clusters.map((c) => `${c.n}×${c.from}–${c.to}`).join(' ')} | VA(b) ${v.methods.b.n100.val}–${v.methods.b.n100.vah} (VAL ±${v.vaLowSpreadPct}% VAH ±${v.vaHighSpreadPct}%) | 2° picco ${v.methods.b.n100.second} (${v.methods.b.n100.secondShare})`);
  }
}
console.log('\nA:', JSON.stringify({ GC: A.stats['GC=F'], SI: A.stats['SI=F'] }, null, 0));
console.log('rolls', JSON.stringify(A.rolls, null, 0));
console.log('silver', JSON.stringify(A.silverJan26.ratioSLVtoSIF), A.silverJan26.closeVsNeighbourMedianPct, JSON.stringify(A.silverJan26.contracts));
console.log('indexVolume', JSON.stringify(IV, null, 0));
console.log('rolls12', JSON.stringify(R, null, 0));
