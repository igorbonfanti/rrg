/*
 * yahoo.js — download delle serie giornaliere dall'endpoint chart di Yahoo Finance.
 *
 * Restituisce solo barre chiuse: scarta le chiusure nulle e la barra della seduta
 * ancora in corso. Riprova con attesa crescente su 429/5xx, alternando query1/query2.
 * Nessuna dipendenza (fetch nativo, Node 18+).
 *
 * Opzioni per le borse europee e le criptovalute:
 *  - raw: il simbolo si usa così com'è (SWDA.MI, non SWDA-MI);
 *  - fillLast: se la chiusura dell'ultima seduta, già finita, è ancora nulla, si usa il
 *    prezzo finale della quotazione (Yahoo la inserisce nella serie solo il giorno dopo);
 *  - keepOpenCrypto: per le criptovalute (quotate sempre) si tiene anche la barra del giorno
 *    in corso, con l'ultimo prezzo.
 */

const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Il formato ticker di Yahoo usa il trattino per le classi di azioni (BRK.B → BRK-B)
export const yahooSymbol = (sym) => sym.replace(/\./g, '-');

// Data di una barra nel fuso della borsa, con l'ora legale di quel giorno (meta.exchangeTimezoneName). Il gmtoffset di
// Yahoo è quello di oggi: lanciato d'inverno, datava al giorno prima le barre estive dei cambi (mezzanotte di Londra =
// 23:00 UTC) e di DX-Y.NYB (mezzanotte di New York). Senza il nome del fuso resta il gmtoffset.
const DAY_FMT = {};
function barDate(ts, meta) {
  const tz = meta && meta.exchangeTimezoneName;
  if (tz && DAY_FMT[tz] !== null) {
    try {
      const c = DAY_FMT[tz] || (DAY_FMT[tz] = { f: new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }), seen: new Map() });
      let d = c.seen.get(ts);
      if (d === undefined) {
        const p = Object.fromEntries(c.f.formatToParts(ts * 1000).map((x) => [x.type, x.value]));
        d = `${p.year}-${p.month}-${p.day}`;
        c.seen.set(ts, d);
      }
      return d;
    } catch { DAY_FMT[tz] = null; /* fuso sconosciuto: si usa il gmtoffset, senza riprovare a ogni barra */ }
  }
  return new Date((ts + ((meta && meta.gmtoffset) || 0)) * 1000).toISOString().slice(0, 10);
}

/**
 * @param {string} symbol
 * @param {{range?: string, period1?: number, period2?: number, interval?: string, retries?: number, withVolume?: boolean}} [opt]
 * @returns {Promise<{dates: string[], close: number[], adjclose: number[], high: number[], meta: object}>}
 *   close e high rettificati solo per gli split, adjclose anche per i dividendi; con withVolume anche low e volume
 */
export async function fetchDaily(symbol, opt = {}) {
  const { fillLast = false, keepOpenCrypto = false, dropStale = false, withVolume = false } = opt;
  return parse(await fetchChart(symbol, opt), { fillLast, keepOpenCrypto, dropStale, withVolume });
}

/**
 * Risposta grezza dell'endpoint chart (result[0]), con gli stessi tentativi di fetchDaily. Serve alle barre orarie
 * (interval: '60m', parseHourly) del profilo dei volumi (1.11.0).
 * @param {string} symbol
 * @param {{range?: string, period1?: number, period2?: number, interval?: string, retries?: number, raw?: boolean}} [opt]
 * @returns {Promise<object>}
 */
export async function fetchChart(symbol, opt = {}) {
  const { range = '5y', period1, period2, interval = '1d', retries = 3, raw = false } = opt;
  const q = period1 != null ? `period1=${period1}&period2=${period2 ?? Math.floor(Date.now() / 1000)}` : `range=${range}`;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(raw ? symbol : yahooSymbol(symbol))}?${q}&interval=${interval}&includeAdjustedClose=true`;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor data fetch)' }, signal: AbortSignal.timeout(30000) });
      if (r.status === 429 || r.status >= 500) throw Object.assign(new Error(`HTTP ${r.status}`), { retry: true });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const res = j.chart && j.chart.result && j.chart.result[0];
      if (!res || !res.timestamp) throw new Error('nessun dato');
      return res;
    } catch (e) {
      lastErr = e;
      if (!e.retry && !(e instanceof TypeError) && e.name !== 'TimeoutError') break; // TypeError = errore di rete; TimeoutError = 30 s senza risposta
      await sleep(800 * 2 ** attempt);
    }
  }
  throw lastErr;
}

/**
 * Barre giornaliere dalla risposta di Yahoo (chart v8).
 * dropStale: scarta le barre «segnaposto» (volume 0, apertura = massimo = minimo = chiusura = chiusura precedente):
 * Yahoo le mette quando non ha la seduta (Milano 13–20/09/2022, Xetra 04–06/12/2023) e sembrano sedute ferme.
 * withVolume (1.11.0, profilo dei volumi): restituisce anche low (minimo della seduta; se manca o è sopra la chiusura vale
 * la chiusura) e volume (null se manca). Senza l'opzione l'uscita resta quella di prima.
 */
const SETTLE = 3600;
export function parse(res, { fillLast = false, keepOpenCrypto = false, dropStale = false, withVolume = false, nowSec = Date.now() / 1000 } = {}) {
  const meta = res.meta || {};
  const ts = res.timestamp;
  const quote = res.indicators.quote[0] || {};
  const adj = (res.indicators.adjclose && res.indicators.adjclose[0].adjclose) || quote.close || [];
  const reg = meta.currentTradingPeriod && meta.currentTradingPeriod.regular;
  const keepOpen = keepOpenCrypto && meta.instrumentType === 'CRYPTOCURRENCY';
  const out = { dates: [], close: [], adjclose: [], high: [], meta };
  if (withVolume) { out.low = []; out.volume = []; }
  for (let i = 0; i < ts.length; i++) {
    let c = quote.close ? quote.close[i] : null;
    let a = adj[i];
    let h = quote.high ? quote.high[i] : null;
    // barra della seduta in corso: cade dentro l'orario regolare attuale e non è passata un'ora dalla chiusura (SETTLE:
    // subito dopo la chiusura Yahoo può avere ancora un prezzo provvisorio, come Taiwan il 20/10/2026, 46.280 contro
    // 46.293). Senza l'orario (meta ridotto) è aperta la barra di oggi nel fuso della borsa fino a 9,5 ore dall'apertura
    const open = reg ? ts[i] >= reg.start && nowSec < reg.end + SETTLE : barDate(ts[i], meta) === barDate(nowSec, meta) && nowSec < ts[i] + 8.5 * 3600 + SETTLE;
    if (open && !keepOpen) continue;
    const d = barDate(ts[i], meta);
    if (c == null && fillLast && (!open || keepOpen) && i === ts.length - 1 && meta.regularMarketPrice != null &&
        meta.regularMarketTime >= ts[i] && barDate(meta.regularMarketTime, meta) === d) {
      c = a = meta.regularMarketPrice;
      if (h == null) h = meta.regularMarketDayHigh;
    }
    if (c == null || a == null) continue;
    if (dropStale && quote.volume && quote.volume[i] === 0 && quote.open && quote.low && quote.open[i] === c && h === c && quote.low[i] === c &&
        out.close.length && out.close[out.close.length - 1] === c) continue;
    // massimo della seduta; se manca (o è sotto la chiusura, dato sporco) vale la chiusura
    const hi = h != null && h > c ? h : c;
    let lo = null, vol = null;
    if (withVolume) {
      const l = quote.low ? quote.low[i] : null, v = quote.volume ? quote.volume[i] : null;
      lo = l != null && l < c ? l : c; vol = v == null ? null : v;
    }
    if (out.dates.length && out.dates[out.dates.length - 1] === d) {
      // barra duplicata per la stessa data: tieni l'ultima
      out.close[out.close.length - 1] = c; out.adjclose[out.adjclose.length - 1] = a; out.high[out.high.length - 1] = hi;
      if (withVolume) { out.low[out.low.length - 1] = lo; out.volume[out.volume.length - 1] = vol; }
      continue;
    }
    out.dates.push(d); out.close.push(c); out.adjclose.push(a); out.high.push(hi);
    if (withVolume) { out.low.push(lo); out.volume.push(vol); }
  }
  return out;
}

/**
 * Barre orarie (interval 60m) dalla risposta di Yahoo, per il profilo dei volumi (1.11.0): {t, s, h, l, c, v} con la
 * seduta s nel fuso della borsa (ora legale di quel giorno). Per i future una barra dalle 18 locali in poi è della seduta
 * del giorno dopo (Globex riapre alle 18 di New York). Barre senza chiusura scartate; massimo e minimo comprendono la
 * chiusura; volume mancante = 0. Nessun filtro sulla barra in corso: chi le usa tiene solo le sedute già chiuse del
 * grafico (s <= ultima seduta). Stessa regola di bars() in ricerca/poc/profilo/analisi.mjs.
 * @param {object} res risposta grezza (fetchChart)
 * @returns {{t: number, s: string, h: number, l: number, c: number, v: number}[]}
 */
const HOUR_FMT = {};
export function parseHourly(res) {
  const meta = res.meta || {}, tz = meta.exchangeTimezoneName || 'UTC', q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const fut = meta.instrumentType === 'FUTURE';
  const f = HOUR_FMT[tz] || (HOUR_FMT[tz] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }));
  const out = [], ts = res.timestamp || [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close ? q.close[i] : null;
    if (c == null) continue;
    const p = Object.fromEntries(f.formatToParts(ts[i] * 1000).map((x) => [x.type, x.value]));
    let s = `${p.year}-${p.month}-${p.day}`;
    if (fut && +p.hour >= 18) s = new Date(Date.parse(s) + 86400000).toISOString().slice(0, 10);
    const hh = q.high ? q.high[i] : null, ll = q.low ? q.low[i] : null;
    out.push({ t: ts[i], s, h: hh != null ? Math.max(hh, c) : c, l: ll != null ? Math.min(ll, c) : c, c, v: (q.volume && q.volume[i]) || 0 });
  }
  return out;
}

// Esegue fn su tutti gli elementi con al massimo `limit` richieste in parallelo e una pausa tra una e l'altra
export async function mapLimit(items, limit, fn, pauseMs = 150) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
      if (pauseMs) await sleep(pauseMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
