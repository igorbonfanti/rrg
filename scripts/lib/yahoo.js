/*
 * yahoo.js — download delle serie giornaliere dall'endpoint chart di Yahoo Finance.
 *
 * Restituisce solo barre chiuse: scarta le chiusure nulle e la barra della seduta
 * ancora in corso. Riprova con attesa crescente su 429/5xx, alternando query1/query2.
 * Nessuna dipendenza (fetch nativo, Node 18+).
 */

const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Il formato ticker di Yahoo usa il trattino per le classi di azioni (BRK.B → BRK-B)
export const yahooSymbol = (sym) => sym.replace(/\./g, '-');

// Data di una barra nel fuso della borsa (evita che una barra finisca sul giorno sbagliato)
function barDate(ts, gmtoffset) {
  return new Date((ts + (gmtoffset || 0)) * 1000).toISOString().slice(0, 10);
}

/**
 * @param {string} symbol
 * @param {{range?: string, period1?: number, period2?: number, interval?: string, retries?: number}} [opt]
 * @returns {Promise<{dates: string[], close: number[], adjclose: number[], meta: object}>}
 */
export async function fetchDaily(symbol, opt = {}) {
  const { range = '5y', period1, period2, interval = '1d', retries = 3 } = opt;
  const q = period1 != null ? `period1=${period1}&period2=${period2 ?? Math.floor(Date.now() / 1000)}` : `range=${range}`;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol(symbol))}?${q}&interval=${interval}&includeAdjustedClose=true`;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor data fetch)' } });
      if (r.status === 429 || r.status >= 500) throw Object.assign(new Error(`HTTP ${r.status}`), { retry: true });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const res = j.chart && j.chart.result && j.chart.result[0];
      if (!res || !res.timestamp) throw new Error('nessun dato');
      return parse(res);
    } catch (e) {
      lastErr = e;
      if (!e.retry && !(e instanceof TypeError)) break; // TypeError = errore di rete
      await sleep(800 * 2 ** attempt);
    }
  }
  throw lastErr;
}

function parse(res) {
  const meta = res.meta || {};
  const ts = res.timestamp;
  const quote = res.indicators.quote[0] || {};
  const adj = (res.indicators.adjclose && res.indicators.adjclose[0].adjclose) || quote.close || [];
  const reg = meta.currentTradingPeriod && meta.currentTradingPeriod.regular;
  const nowSec = Date.now() / 1000;
  const out = { dates: [], close: [], adjclose: [], meta };
  for (let i = 0; i < ts.length; i++) {
    const c = quote.close ? quote.close[i] : null;
    const a = adj[i];
    if (c == null || a == null) continue;
    // barra della seduta in corso: cade dentro l'orario regolare attuale e la seduta non è finita
    if (reg && ts[i] >= reg.start && nowSec < reg.end) continue;
    const d = barDate(ts[i], meta.gmtoffset);
    if (out.dates.length && out.dates[out.dates.length - 1] === d) {
      // barra duplicata per la stessa data: tieni l'ultima
      out.close[out.close.length - 1] = c; out.adjclose[out.adjclose.length - 1] = a;
      continue;
    }
    out.dates.push(d); out.close.push(c); out.adjclose.push(a);
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
