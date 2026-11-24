/*
 * misura.mjs — riproduce l'errore di data delle barre di Yahoo (scripts/lib/yahoo.js, barDate con il gmtoffset di oggi).
 *
 * Per ogni simbolo scaricato dalla pipeline confronta due date per barra:
 *  - «vecchia»: ts + meta.gmtoffset (offset di oggi, come barDate);
 *  - «nel fuso»: data di calendario di ts nel fuso meta.exchangeTimezoneName (ora legale compresa).
 * Conta le barre con data diversa, quelle finite di sabato/domenica e le date duplicate.
 * Uso: node ricerca/qa/date-barre/misura.mjs [range] > ricerca/qa/date-barre/misura.json
 * Le risposte grezze si salvano in raw/ (non nel repository) per i ricalcoli successivi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const RAW = path.join(HERE, 'raw');
fs.mkdirSync(RAW, { recursive: true });
const range = process.argv[2] || '5y';

const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'universe.json')));
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/indices.json'))).indices;
const list = (o) => {
  const s = new Set(Object.keys(o.benchmarks || {}).filter((k) => !(o.benchmarks[k].synthetic)));
  for (const g of Object.values(o.groups || {})) for (const [k, v] of Object.entries(g.tickers || {})) { s.add(k); if (v.history) s.add(v.history.proxy); }
  return [...s];
};
const groups = {
  global: list(U.global),
  fx: ['EURUSD=X', 'EURGBP=X', 'EURCHF=X', 'EURJPY=X', 'EURCAD=X', 'EURSEK=X'],
  macro: [...list(U.macro), 'DX-Y.NYB'],
  indici: Object.values(idx).map((x) => x.price),
  settori: ['SPY', 'XLK', 'AAPL'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function raw(sym) {
  const f = path.join(RAW, `${range}_${sym.replace(/[^A-Za-z0-9.=-]/g, '_')}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f));
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d&includeAdjustedClose=true`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor qa)' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()).chart.result[0];
  fs.writeFileSync(f, JSON.stringify(j));
  await sleep(200);
  return j;
}
const oldDate = (ts, off) => new Date((ts + (off || 0)) * 1000).toISOString().slice(0, 10);
const fmt = {};
const tzDate = (ts, tz) => (fmt[tz] ||= new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })).format(ts * 1000);
const wk = (d) => { const g = new Date(d + 'T00:00:00Z').getUTCDay(); return g === 0 || g === 6; };
const dup = (a) => a.filter((d, i) => i && a[i - 1] === d).length;

const out = { range, run: new Date().toISOString(), symbols: {} };
for (const [g, syms] of Object.entries(groups)) {
  for (const sym of syms) {
    let j;
    try { j = await raw(sym); } catch (e) { out.symbols[sym] = { group: g, error: e.message }; continue; }
    const m = j.meta, ts = j.timestamp || [];
    const a = ts.map((t) => oldDate(t, m.gmtoffset)), b = ts.map((t) => tzDate(t, m.exchangeTimezoneName));
    const diff = a.map((d, i) => (d !== b[i] ? i : -1)).filter((i) => i >= 0);
    const hours = {};
    for (const t of ts) { const h = new Intl.DateTimeFormat('en-GB', { timeZone: m.exchangeTimezoneName, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t * 1000); hours[h] = (hours[h] || 0) + 1; }
    out.symbols[sym] = {
      group: g, tz: m.exchangeTimezoneName, gmtoffset: m.gmtoffset, bars: ts.length,
      shifted: diff.length, weekendOld: a.filter(wk).length, weekendTz: b.filter(wk).length, dupOld: dup(a), dupTz: dup(b),
      localBarHours: hours,
      examples: diff.slice(0, 2).concat(diff.slice(-1)).map((i) => ({ ts: ts[i], utc: new Date(ts[i] * 1000).toISOString(), old: a[i], tz: b[i] })),
    };
  }
}
console.log(JSON.stringify(out, null, 1));
