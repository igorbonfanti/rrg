#!/usr/bin/env node
/*
 * dati.mjs — fase 1 del pannello «Distanza dal massimo storico» (ricerca, non tocca l'app).
 *
 * Per ogni mercato dell'elenco proposto (Bitcoin, oro, argento, rame, petrolio WTI e Brent, Nasdaq-100, S&P 500,
 * semiconduttori SOXX, KOSPI) scarica la serie principale (Yahoo Finance, endpoint chart v8 con scripts/lib/yahoo.js,
 * tutta la storia disponibile) e le serie di controllo, poi calcola:
 *  - inizio della serie, ultima chiusura e data;
 *  - massimo di chiusura dall'inizio della serie e data, distanza % dell'ultima chiusura;
 *  - giorni di calendario e sedute dal massimo; minimo di chiusura dopo il massimo (calo massimo del ciclo attuale)
 *    e risalita da quel minimo; massimo intraday con la data (solo per spiegare le differenze con chi lo usa);
 *  - gli stessi valori alle chiusure del 09/11/2026 (05/11/2026 per il bitcoin), da confrontare con la slide di
 *    Francesco Caruso (Cicli&Mercati), usata solo come controllo esterno;
 *  - il confronto con una seconda fonte quando c'è (FRED, Bitstamp, i file della pipeline in data/, ETF fisici)
 *    sulle sedute in comune: scarto delle chiusure e massimo nello stesso periodo.
 *
 * Uso: node ricerca/bolle-rotazione/dati.mjs [--refresh]
 *   I dati scaricati vanno in ricerca/bolle-rotazione/cache/ (esclusa da git); senza --refresh si riusano.
 *   Scrive ricerca/bolle-rotazione/risultati.json.
 * Fonti: Yahoo Finance; FRED (fred.stlouisfed.org, CSV pubblico come in scripts/fetch_data.js); Bitstamp
 * (API pubblica OHLC giornaliera, giorni UTC); file della pipeline in data/ (sola lettura).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { fetchDaily } from '../../scripts/lib/yahoo.js';
import { decodeDates, deltaDecode } from '../../js/indexdata.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CACHE = path.join(HERE, 'cache');
const REFRESH = process.argv.includes('--refresh');
const UA = { 'User-Agent': 'sector-monitor research (data check)' };
fs.mkdirSync(CACHE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// ---------------------------------------------------------------- download con cache
async function cached(name, fn) {
  const f = path.join(CACHE, name.replace(/[^A-Za-z0-9_.-]/g, '_') + '.json');
  if (!REFRESH && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  const v = await fn();
  fs.writeFileSync(f, JSON.stringify(v));
  return v;
}

async function yahoo(sym) {
  return cached('Y_' + sym, async () => {
    const r = await fetchDaily(sym, { period1: -2208988800, raw: true }); // dal 1900: tutta la storia che Yahoo ha
    await sleep(400);
    return { src: 'Yahoo ' + sym, tz: r.meta.exchangeTimezoneName, currency: r.meta.currency, type: r.meta.instrumentType,
      fetched: new Date().toISOString(), dates: r.dates, close: r.close, adjclose: r.adjclose, high: r.high };
  });
}

async function fred(id) {
  return cached('F_' + id, async () => {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`;
    // con fetch di Node FRED risponde 503 da questo ambiente, con curl 200: si usa curl (stesso URL, nessuna intestazione)
    let txt;
    for (let a = 0; a < 4; a++) {
      try { txt = execFileSync('curl', ['-sS', '-f', '-m', '90', url], { encoding: 'utf-8', maxBuffer: 64 << 20 }); break; }
      catch (e) { if (a === 3) throw e; await sleep(3000 * (a + 1)); }
    }
    if (!/^observation_date,/.test(txt)) throw new Error(`FRED ${id}: risposta non CSV`);
    const dates = [], close = [];
    for (const line of txt.trim().split('\n').slice(1)) {
      const [d, v] = line.split(',');
      if (v === '' || v === '.' || v == null) continue; // FRED: giorno senza valore (festività)
      dates.push(d); close.push(Number(v));
    }
    return { src: 'FRED ' + id, fetched: new Date().toISOString(), dates, close };
  });
}

// Bitstamp: candele giornaliere UTC (timestamp = inizio del giorno), 1000 per richiesta, dal 2011
async function bitstamp() {
  return cached('B_btcusd', async () => {
    const rows = new Map();
    let start = Date.UTC(2011, 7, 18) / 1000;
    const end = Date.now() / 1000;
    while (start < end) {
      const url = `https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=86400&limit=1000&start=${start}`;
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('Bitstamp HTTP ' + r.status);
      const j = await r.json();
      const ohlc = (j.data && j.data.ohlc) || [];
      if (!ohlc.length) break;
      for (const c of ohlc) rows.set(Number(c.timestamp), { close: Number(c.close), high: Number(c.high) });
      const last = Math.max(...ohlc.map((c) => Number(c.timestamp)));
      if (last + 86400 <= start) break;
      start = last + 86400;
      await sleep(500);
    }
    // l'ultima candela è il giorno UTC in corso: si scarta
    const today = new Date().toISOString().slice(0, 10);
    const ts = [...rows.keys()].sort((a, b) => a - b).filter((t) => new Date(t * 1000).toISOString().slice(0, 10) < today);
    return { src: 'Bitstamp btcusd', fetched: new Date().toISOString(), dates: ts.map((t) => new Date(t * 1000).toISOString().slice(0, 10)),
      close: ts.map((t) => rows.get(t).close), high: ts.map((t) => rows.get(t).high) };
  });
}

// ---------------------------------------------------------------- file della pipeline (sola lettura)
const readData = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf-8'));
function pipeline() {
  const out = {};
  const macro = readData('prices_macro.json');
  for (const s of ['GLD', 'SLV', 'CPER', 'USO', 'BTC-USD', 'SPY']) {
    const t = macro.tickers[s];
    out['macro:' + s] = { src: `data/prices_macro.json ${s} (chiusure rettificate per i dividendi, calendario NYSE, 5 anni)`,
      dates: macro.dates, close: t.close, max52: t.max52 };
  }
  const us = readData('prices.json');
  out['prices:QQQ'] = { src: 'data/prices.json QQQ (rettificato, 5 anni)', dates: us.dates, close: us.tickers.QQQ.close };
  const vix = readData('vix.json');
  for (const k of ['SPX', 'NDX']) {
    const x = vix.series[k];
    out['vix:' + k] = { src: `data/vix.json ${k} (Yahoo, solo prezzo, dal ${x.d0})`, dates: decodeDates(x.d0, x.gaps), close: deltaDecode(x.cd, x.ps || 1) };
  }
  const ind = readData('indices.json');
  for (const k of ['SPX', 'NDX', 'KOSPI200']) {
    const x = ind.series[k];
    out['indices:' + k] = { src: `data/indices.json ${k} (${x.symbol}, solo prezzo, dal ${x.d0})`, dates: decodeDates(x.d0, x.gaps), close: deltaDecode(x.cd, x.ps || 100) };
  }
  const indu = readData('industries.json');
  out['industries:SOXX'] = { src: `data/industries.json SOXX (rettificato per i dividendi, dal ${indu.dates.d0})`,
    dates: decodeDates(indu.dates.d0, indu.dates.gaps), close: indu.series.SOXX.adjclose };
  for (const p of Object.values(out)) { // togli eventuali null
    const d = [], c = [];
    p.dates.forEach((x, i) => { if (p.close[i] != null) { d.push(x); c.push(p.close[i]); } });
    p.dates = d; p.close = c;
  }
  return { out, asOf: { macro: macro.asOf, prices: us.asOf, vix: vix.asOf, indices: ind.asOf, industries: indu.asOf } };
}

// ---------------------------------------------------------------- calcoli
/**
 * Statistiche della distanza dal massimo alla data `at` (inclusa; default: ultima data della serie).
 * Massimo = chiusura più alta dall'inizio della serie fino a `at`; a parità vale la prima data.
 */
export function athStats(s, at = null) {
  let n = s.dates.length;
  if (at) { while (n > 0 && s.dates[n - 1] > at) n--; }
  if (!n) return null;
  let mi = 0;
  for (let i = 1; i < n; i++) if (s.close[i] > s.close[mi]) mi = i;
  let lo = mi;
  for (let i = mi + 1; i < n; i++) if (s.close[i] < s.close[lo]) lo = i;
  let hi = null, hiD = null;
  if (s.high) for (let i = 0; i < n; i++) if (s.high[i] != null && (hi == null || s.high[i] > hi)) { hi = s.high[i]; hiD = s.dates[i]; }
  const last = s.close[n - 1], ath = s.close[mi];
  // controllo del dato: il massimo contro la mediana delle 5 chiusure prima e dopo (un valore isolato sarebbe un errore)
  const nb = [];
  for (let i = Math.max(0, mi - 5); i <= Math.min(n - 1, mi + 5); i++) if (i !== mi) nb.push(s.close[i]);
  nb.sort((a, b) => a - b);
  const athVsNeighboursPct = nb.length ? r2((ath / nb[Math.floor(nb.length / 2)] - 1) * 100) : null;
  // massimo delle ultime 52 settimane (365 giorni di calendario), solo come contesto
  const from52 = new Date(Date.parse(s.dates[n - 1]) - 365 * 86400000).toISOString().slice(0, 10);
  let m52 = -1;
  for (let i = 0; i < n; i++) if (s.dates[i] > from52 && (m52 < 0 || s.close[i] > s.close[m52])) m52 = i;
  return {
    start: s.dates[0], last: r4(last), lastDate: s.dates[n - 1],
    ath: r4(ath), athDate: s.dates[mi], distPct: r2((last / ath - 1) * 100),
    daysSinceAth: dayDiff(s.dates[mi], s.dates[n - 1]), barsSinceAth: n - 1 - mi,
    cycleLow: r4(s.close[lo]), cycleLowDate: s.dates[lo], cycleLowPct: r2((s.close[lo] / ath - 1) * 100),
    fromCycleLowPct: r2((last / s.close[lo] - 1) * 100),
    intradayAth: r4(hi), intradayAthDate: hiD, distFromIntradayPct: hi ? r2((last / hi - 1) * 100) : null,
    athVsNeighboursPct, max52w: r4(s.close[m52]), max52wDate: s.dates[m52], dist52wPct: r2((last / s.close[m52] - 1) * 100),
    negativeCloses: s.close.slice(0, n).filter((x) => x <= 0).length,
  };
}

// Confronto di due serie sulle date in comune (con uno sfasamento di `lag` giorni di calendario sulla seconda)
function compare(a, b, lag = 0) {
  const shift = (d) => (lag ? new Date(Date.parse(d) + lag * 86400000).toISOString().slice(0, 10) : d);
  const mb = new Map(b.dates.map((d, i) => [shift(d), b.close[i]]));
  const rel = [], days = [];
  a.dates.forEach((d, i) => { const v = mb.get(d); if (v != null && a.close[i] > 0 && v > 0) { rel.push(Math.abs(v / a.close[i] - 1)); days.push(d); } });
  if (!rel.length) return null;
  const sorted = [...rel].sort((x, y) => x - y);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return { lag, common: rel.length, from: days[0], to: days.at(-1), medianAbsPct: r4(q(0.5) * 100), p99AbsPct: r4(q(0.99) * 100),
    maxAbsPct: r4(sorted.at(-1) * 100), over05pct: rel.filter((x) => x > 0.005).length };
}
// Serie ristretta a un intervallo di date
const cut = (s, from, to) => {
  const out = { dates: [], close: [], ...(s.high ? { high: [] } : {}) };
  s.dates.forEach((d, i) => { if (d >= from && d <= to) { out.dates.push(d); out.close.push(s.close[i]); if (s.high) out.high.push(s.high[i]); } });
  return out;
};
// Controllo: stesso calcolo sulla seconda fonte nel periodo in comune, e scarto delle chiusure
function control(primary, ctl, { lagSearch = false, note = '' } = {}) {
  const from = primary.dates[0] > ctl.dates[0] ? primary.dates[0] : ctl.dates[0];
  const to = primary.dates.at(-1) < ctl.dates.at(-1) ? primary.dates.at(-1) : ctl.dates.at(-1);
  let cmp = compare(primary, ctl, 0);
  if (lagSearch) for (const lag of [-1, 1]) { const c = compare(primary, ctl, lag); if (c && (!cmp || c.medianAbsPct < cmp.medianAbsPct)) cmp = c; }
  // deriva del rapporto principale/controllo tra il massimo del principale e l'ultima data in comune: per due strumenti
  // sullo stesso sottostante (future e ETF fisico, future e spot) è quanto le due distanze dal massimo si allontanano
  const mc = new Map(ctl.dates.map((d, i) => [d, ctl.close[i]]));
  const pa = athStats(cut(primary, from, to));
  const ratioAt = (d) => { const i = primary.dates.indexOf(d); const v = mc.get(d); return i >= 0 && v ? primary.close[i] / v : null; };
  let lastCommon = null; for (let i = primary.dates.length - 1; i >= 0; i--) if (primary.dates[i] <= to && mc.has(primary.dates[i])) { lastCommon = primary.dates[i]; break; }
  const ra = pa && ratioAt(pa.athDate), rl = lastCommon && ratioAt(lastCommon);
  const ratioDrift = ra && rl ? { athDate: pa.athDate, lastCommon, driftPct: r2((rl / ra - 1) * 100) } : null;
  return {
    src: ctl.src, note, period: { from, to }, ratioDrift,
    primaryInPeriod: athStats(cut(primary, from, to)), controlInPeriod: athStats(cut({ ...ctl, high: undefined }, from, to)),
    controlFullHistory: athStats({ ...ctl, high: undefined }), closeDiff: cmp,
  };
}

// ---------------------------------------------------------------- elenco dei mercati
const CUTOFF = '2026-11-09';
const CUTOFF_BTC = '2026-11-05';
const SLIDE = { // Francesco Caruso (Cicli&Mercati), chiusure al 9/11/2026: solo controllo esterno
  BTC: { distPct: -39.77, peak: 'ott. 2025', at: CUTOFF_BTC },
  GOLD: { distPct: -26.04, peak: 'gen. 2026', ath: 5595, at: CUTOFF },
  NDX: { distPct: -8.5, peak: 'ott. 2026', at: CUTOFF, note: 'la slide dice «Nasdaq»: Nasdaq-100 o Composite' },
  SPX: { distPct: -3.76, peak: 'ott. 2026', ath: 7844.52, at: CUTOFF },
};

async function main() {
  const P = pipeline();
  const res = { generated: new Date().toISOString(), method: 'massimo = chiusura più alta dall\'inizio della serie disponibile; distanza = ultima chiusura / massimo − 1', pipelineAsOf: P.asOf, markets: {} };

  const M = [
    { id: 'BTC', alt: [], name: 'Bitcoin', main: 'BTC-USD', kind: 'criptovaluta, 7 giorni su 7, giorno UTC',
      controls: async (p) => [
        control(p, await fred('CBBTCUSD'), { lagSearch: true, note: 'Coinbase via FRED' }),
        control(p, await bitstamp(), { note: 'Bitstamp, candele UTC' }),
        control(p, P.out['macro:BTC-USD'], { note: 'pipeline: ultimo prezzo a ogni seduta NYSE, 5 anni' }),
      ] },
    { id: 'GOLD', alt: ['GLD'], name: 'Oro', main: 'GC=F', kind: 'future COMEX continuo (contratto attivo), $/oncia',
      controls: async (p) => [
        control(p, await yahoo('GLD'), { note: 'ETF fisico (LBMA PM meno commissioni), solo prezzo' }),
        control(p, P.out['macro:GLD'], { note: 'pipeline, 5 anni, rettificato (GLD non paga dividendi)' }),
      ] },
    { id: 'SILVER', alt: ['SLV'], name: 'Argento', main: 'SI=F', kind: 'future COMEX continuo, $/oncia',
      controls: async (p) => [
        control(p, await yahoo('SLV'), { note: 'ETF fisico, solo prezzo' }),
        control(p, P.out['macro:SLV'], { note: 'pipeline, 5 anni' }),
      ] },
    { id: 'COPPER', alt: ['CPER'], name: 'Rame', main: 'HG=F', kind: 'future COMEX continuo, $/libbra',
      controls: async (p) => [
        control(p, await yahoo('CPER'), { note: 'ETF di futures con rollover: livello non confrontabile' }),
        control(p, P.out['macro:CPER'], { note: 'pipeline, 5 anni' }),
        { src: 'FRED PCOPPUSDM', note: 'FMI, media mensile LME in $/tonnellata: solo il mese del massimo', monthly: athStats(await fred('PCOPPUSDM')) },
      ] },
    { id: 'WTI', alt: ['USO'], name: 'Petrolio WTI', main: 'CL=F', kind: 'future NYMEX continuo (primo contratto), $/barile',
      controls: async (p) => [
        control(p, await fred('DCOILWTICO'), { note: 'EIA via FRED, spot Cushing' }),
        control(p, await yahoo('USO'), { note: 'ETF con rollover: il suo massimo non è quello del petrolio' }),
        control(p, P.out['macro:USO'], { note: 'pipeline, 5 anni' }),
      ] },
    { id: 'BRENT', name: 'Petrolio Brent', main: 'BZ=F', kind: 'future ICE continuo, $/barile',
      controls: async (p) => [control(p, await fred('DCOILBRENTEU'), { note: 'EIA via FRED, spot Europa' })] },
    { id: 'NDX', alt: ['QQQ'], name: 'Nasdaq-100', main: '^NDX', kind: 'indice, solo prezzo',
      controls: async (p) => [
        control(p, await fred('NASDAQ100'), { note: 'Nasdaq via FRED' }),
        control(p, P.out['vix:NDX'], { note: 'pipeline' }),
        control(p, P.out['indices:NDX'], { note: 'pipeline' }),
        control(p, await yahoo('QQQ'), { note: 'ETF, solo prezzo' }),
      ] },
    { id: 'COMP', name: 'Nasdaq Composite', main: '^IXIC', kind: 'indice, solo prezzo (solo per la slide)',
      controls: async (p) => [control(p, await fred('NASDAQCOM'), { note: 'Nasdaq via FRED' })] },
    { id: 'SPX', alt: ['SPY'], name: 'S&P 500', main: '^GSPC', kind: 'indice, solo prezzo',
      controls: async (p) => [
        control(p, await fred('SP500'), { note: 'S&P Dow Jones via FRED, solo ultimi 10 anni' }),
        control(p, P.out['vix:SPX'], { note: 'pipeline' }),
        control(p, P.out['indices:SPX'], { note: 'pipeline' }),
        control(p, await yahoo('SPY'), { note: 'ETF, solo prezzo' }),
      ] },
    { id: 'SOXX', alt: ['^SOX'], name: 'Semiconduttori (SOXX)', main: 'SOXX', kind: 'ETF, solo prezzo (chiusure rettificate per gli split)',
      controls: async (p, y) => [
        control(p, { src: 'Yahoo SOXX adjclose', dates: y.dates, close: y.adjclose }, { note: 'stesso ETF con i dividendi reinvestiti' }),
        control(p, P.out['industries:SOXX'], { note: 'pipeline (rettificato per i dividendi)' }),
        control(p, await yahoo('^SOX'), { note: 'indice PHLX Semiconductor: SOXX segue l\'indice ICE dal 2021' }),
      ] },
    { id: 'KOSPI', alt: ['EWY', '069500.KS'], name: 'KOSPI (Corea)', main: '^KS11', kind: 'indice KOSPI Composite, solo prezzo, won',
      controls: async (p) => [
        control(p, P.out['indices:KOSPI200'], { note: 'pipeline: la serie KOSPI200 della vista 6 usa ^KS11 come prezzo' }),
        control(p, await yahoo('069500.KS'), { note: 'ETF KODEX 200 (KOSPI 200, altro indice), solo prezzo' }),
        control(p, await yahoo('EWY'), { note: 'ETF MSCI Korea in dollari (altro indice, con il cambio)' }),
      ] },
  ];

  for (const m of M) {
    const y = await yahoo(m.main);
    const s = { dates: y.dates, close: y.close, high: y.high };
    const out = { name: m.name, series: 'Yahoo ' + m.main, kind: m.kind, tz: y.tz, currency: y.currency, fetched: y.fetched,
      now: athStats(s), atCutoff: athStats(s, m.id === 'BTC' ? CUTOFF_BTC : CUTOFF) };
    if (m.id === 'BTC') out.atCutoff0911 = athStats(s, CUTOFF);
    if (m.id === 'SOXX') { out.totalReturnNow = athStats({ dates: y.dates, close: y.adjclose }); }
    out.controls = await m.controls(s, y);
    out.alternatives = {};
    for (const a of m.alt || []) {
      const ya = await yahoo(a);
      const sa = { dates: ya.dates, close: ya.close, high: ya.high };
      out.alternatives[a] = { now: athStats(sa), atCutoff: athStats(sa, m.id === 'BTC' ? CUTOFF_BTC : CUTOFF) };
    }
    if (SLIDE[m.id]) {
      const sl = SLIDE[m.id], a = out.atCutoff;
      out.slide = { ...sl, ours: { distPct: a.distPct, ath: a.ath, athDate: a.athDate, last: a.last, lastDate: a.lastDate, intradayAth: a.intradayAth, distFromIntradayPct: a.distFromIntradayPct },
        diffPts: r2(a.distPct - sl.distPct),
        // prezzo implicito nella slide: massimo dichiarato × (1 + distanza); massimo implicito: nostra chiusura / (1 + distanza)
        impliedLast: sl.ath ? r2(sl.ath * (1 + sl.distPct / 100)) : null, impliedAth: r2(a.last / (1 + sl.distPct / 100)) };
    }
    res.markets[m.id] = out;
    console.log(`${m.name.padEnd(24)} ${m.main.padEnd(8)} dal ${out.now.start}  ultima ${out.now.last} (${out.now.lastDate})  max ${out.now.ath} (${out.now.athDate})  ${out.now.distPct}%  giorni ${out.now.daysSinceAth}  minimo ciclo ${out.now.cycleLowPct}%`);
  }
  // Slide: anche il Nasdaq Composite come lettura alternativa di «Nasdaq»
  const c = res.markets.COMP.atCutoff;
  res.markets.NDX.slide.alternativeComposite = { distPct: c.distPct, athDate: c.athDate, diffPts: r2(c.distPct - SLIDE.NDX.distPct) };

  // Ordine di «sgonfiamento»: data del massimo, dal più vecchio
  res.deflationOrder = Object.entries(res.markets).filter(([k]) => k !== 'COMP')
    .map(([k, v]) => ({ id: k, name: v.name, athDate: v.now.athDate, distPct: v.now.distPct, cycleLowPct: v.now.cycleLowPct }))
    .sort((a, b) => (a.athDate < b.athDate ? -1 : a.athDate > b.athDate ? 1 : 0));

  fs.writeFileSync(path.join(HERE, 'risultati.json'), JSON.stringify(res, null, 1) + '\n');
  console.log('\nscritto ricerca/bolle-rotazione/risultati.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
