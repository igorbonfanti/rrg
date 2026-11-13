/*
 * confronto.mjs — controllo indipendente della 1.3.5 (barDate con exchangeTimezoneName).
 *
 * Per ogni simbolo scarica la risposta grezza di Yahoo (chart v8 o spark v7, come la pipeline) e la passa a:
 *  - parse NUOVO (scripts/lib/yahoo.js) con il gmtoffset di oggi e con quello dell'altra stagione (deve dare le stesse date);
 *  - parse VECCHIO (ricerca/qa/date-barre/yahoo_prima.js, identico a origin/main) con il gmtoffset di oggi e con quello
 *    dell'altra stagione (simula una corsa fatta 6 mesi prima/dopo).
 * Scrive per simbolo le date e i timestamp grezzi; verita.py ricalcola la data di ogni barra con zoneinfo (Python) e confronta.
 * Uso: node confronto.mjs <dir_raw> <out.json>     (le risposte grezze si riusano se già in <dir_raw>)
 */
import fs from 'node:fs';
import path from 'node:path';
import * as NEW from '../../../../scripts/lib/yahoo.js';
import * as OLD from '../../date-barre/yahoo_prima.js';

const [RAW, OUT] = process.argv.slice(2);
fs.mkdirSync(RAW, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'Mozilla/5.0 (sector-monitor qa)' };

const CHART_5Y = [
  'EURUSD=X', 'EURGBP=X', 'EURCHF=X', 'EURJPY=X', 'EURCAD=X', 'EURSEK=X', 'EURAUD=X', 'EURBRL=X', 'USDJPY=X',
  'DX-Y.NYB', 'GC=F', 'CL=F', 'ES=F',
  '^GSPC', '^NDX', '^RUT', '^DJI', '^VIX', '^TNX', 'AAPL', 'BRK-B', 'SPY', 'BIL', 'DBMF', 'EEM', 'GLD', 'BTC-USD', 'BTC-EUR',
  'SWDA.MI', 'DBMFE.PA', 'EXS1.DE', 'CAC.PA', 'IAEX.AS', 'LYXIB.MC', 'XUKX.DE', 'XSMI.DE', 'SGLD.MI', '^STOXX', '^FTSE', '^GDAXI', 'AAF.L', 'ABBN.SW', 'FTSEMIB.MI',
  'BHP.AX', 'CBA.AX', '^AXJO', 'PETR4.SA', 'VALE3.SA', '^BVSP', '7203.T', '^N225', 'RELIANCE.NS', '^NSEI', '0700.HK', '^HSI',
  '510300.SS', '000001.SZ', '^KS11', '^TWII', 'XIU.TO',
  '^NZ50', '^IPSA', '^MXX', 'TA35.TA',
];
// storia lunga giornaliera (range=max di Yahoo dà barre mensili): dal 2001, come fetch_breadth (ETF dal 2004)
const CHART_MAX = ['^GSPC', 'SPY', 'XLK', '^BVSP', 'PETR4.SA', '^AXJO', 'BHP.AX', 'EURUSD=X', 'DX-Y.NYB', '^MXX', '^N225', '^FTSE', '^HSI'];

async function getJSON(url, f) {
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) });
      if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
      if (!r.ok) return null;
      const j = await r.json();
      fs.writeFileSync(f, JSON.stringify(j));
      await sleep(250);
      return j;
    } catch { await sleep(1500 * 2 ** a); }
  }
  return null;
}
const fname = (s) => s.replace(/[^A-Za-z0-9.=-]/g, '_');

// scarto dall'UTC di un fuso in un istante (secondi), come lo darebbe Yahoo in gmtoffset
function offsetAt(tz, ms) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(ms).find((x) => x.type === 'timeZoneName').value;
  const m = /GMT([+-])(\d\d):(\d\d)/.exec(p);
  return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 3600 + +m[3] * 60) : 0;
}

const now = Date.now() / 1000;
function run(res) {
  const meta = res.meta || {};
  const tz = meta.exchangeTimezoneName;
  const alt = tz ? offsetAt(tz, (now + 182 * 86400) * 1000) : meta.gmtoffset;
  const withOff = (off) => ({ ...res, meta: { ...meta, gmtoffset: off } });
  const p = (M, r, o) => M.parse(r, { nowSec: now, ...o }).dates;
  const opts = meta.instrumentType === 'CURRENCY' ? { fillLast: true } : {};
  return {
    tz, gmtoffset: meta.gmtoffset, altOffset: alt, type: meta.instrumentType, hasReg: !!(meta.currentTradingPeriod && meta.currentTradingPeriod.regular),
    ts: res.timestamp,
    close: (res.indicators.quote[0] || {}).close || [],
    newNow: p(NEW, res, opts), newAlt: p(NEW, withOff(alt), opts),
    oldNow: p(OLD, res, opts), oldAlt: p(OLD, withOff(alt), opts),
  };
}

const out = { now, chart5y: {}, chartMax: {}, spark: {} };
for (const s of CHART_5Y) {
  const j = await getJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5y&interval=1d&includeAdjustedClose=true`, path.join(RAW, `5y_${fname(s)}.json`));
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (res && res.timestamp) out.chart5y[s] = run(res); else console.error('nessun dato', s);
}
for (const s of CHART_MAX) {
  const j = await getJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=978307200&period2=1793923200&interval=1d&includeAdjustedClose=true`, path.join(RAW, `p2001_${fname(s)}.json`));
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (res && res.timestamp) out.chartMax[s] = run(res); else console.error('nessun dato', s);
}
// spark: tutti i membri degli indici (come fetch_indices.js)
const DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../data/index_members');
const members = [...new Set(fs.readdirSync(DIR).flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, f))).tickers))].sort();
for (let i = 0; i < members.length; i += 20) {
  const chunk = members.slice(i, i + 20);
  const j = await getJSON(`https://query1.finance.yahoo.com/v7/finance/spark?symbols=${chunk.map(encodeURIComponent).join(',')}&range=1y&interval=1d`, path.join(RAW, `spark_${i}.json`));
  for (const x of (j && j.spark && j.spark.result) || []) {
    const res = x.response && x.response[0];
    if (res && res.timestamp) out.spark[x.symbol] = run(res);
  }
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`chart5y ${Object.keys(out.chart5y).length}, chartMax ${Object.keys(out.chartMax).length}, spark ${Object.keys(out.spark).length} su ${members.length}`);
