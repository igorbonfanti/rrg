// Controllo che la data nuova non cambi nulla fuori da cambi e DX-Y.NYB: ETF e titoli USA di prices.json, ETF di
// prices_global.json e prices_macro.json, prezzi dei 22 indici, e un campione di membri degli indici (2 a metà
// lista per indice + un titolo per ogni suffisso di borsa nella lista EEM + 10 titoli dell'S&P 500), con chart (5y) e
// con spark (1y, come fetch_indices.js). Si confrontano date e chiusure di parse() vecchio e nuovo.
// Uso: node invariati.mjs <repoRoot> <cacheDir>
import fs from 'node:fs'; import path from 'node:path';
const [root, cache] = process.argv.slice(2);
const OLD = await import(path.join(root, 'ricerca/qa/date-barre/yahoo_prima.js'));
const NEW = await import(path.join(root, 'scripts/lib/yahoo.js'));
const J = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf-8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const groups = {};
const add = (g, s) => { (groups[g] ||= new Set()).add(s); };
for (const s of Object.keys(J('data/prices.json').tickers)) add('USA prices.json', s);
for (const s of Object.keys(J('data/prices_global.json').tickers)) add('globali', s);
for (const [s, t] of Object.entries(J('data/prices_macro.json').tickers)) if (!t.synthetic) add('macro', s);
const cfg = J('config/indices.json');
for (const v of Object.values(cfg.indices || cfg)) if (v.price) add('indici (prezzo)', v.price);
const memb = [];
for (const f of fs.readdirSync(path.join(root, 'data/index_members'))) {
  const t = J('data/index_members/' + f).tickers; const n = t.length;
  memb.push(t[(n >> 1) - 1], t[n >> 1]);
  if (f === 'EEM.json') { const seen = new Set(); for (const s of t) { const suf = s.includes('.') ? s.split('.').pop() : 'US'; if (!seen.has(suf)) { seen.add(suf); memb.push(s); } } }
}
const sp = J('data/sp500_members.json'); const spT = (sp.tickers || sp.members || Object.keys(sp)).map((x) => (typeof x === 'string' ? x : x.symbol || x.s));
for (let i = 0; i < 10; i++) memb.push(spT[Math.floor((i + 0.5) * spT.length / 10)]);
for (const s of memb.filter(Boolean)) add('membri', s);

async function chart(sym, range) {
  const f = path.join(cache, 'inv', `${sym.replace(/[^A-Za-z0-9._=^-]/g, '_')}_${range}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(`https://query${1 + (a % 2)}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d&includeAdjustedClose=true`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(r.status);
      const res = (await r.json()).chart.result[0]; fs.writeFileSync(f, JSON.stringify(res)); await sleep(150); return res;
    } catch { await sleep(1000 * 2 ** a); }
  }
  return null;
}
async function spark(syms) {
  const out = {};
  for (let i = 0; i < syms.length; i += 20) {
    const ch = syms.slice(i, i + 20);
    const f = path.join(cache, 'inv', `spark_${i}.json`);
    let j = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : null;
    if (!j) { const r = await fetch(`https://query1.finance.yahoo.com/v7/finance/spark?symbols=${ch.map(encodeURIComponent).join(',')}&range=1y&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' } }); j = await r.json(); fs.writeFileSync(f, JSON.stringify(j)); await sleep(300); }
    for (const x of j.spark?.result || []) if (x.response?.[0]?.timestamp) out[x.symbol] = x.response[0];
  }
  return out;
}
fs.mkdirSync(path.join(cache, 'inv'), { recursive: true });
const nowSec = Date.now() / 1000;
const report = { gruppi: {}, diversi: [], senzaFuso: [], fusi: {} };
function cmp(g, sym, res) {
  const o = OLD.parse(res, { nowSec }), n = NEW.parse(res, { nowSec });
  const same = JSON.stringify(o.dates) === JSON.stringify(n.dates) && JSON.stringify(o.close) === JSON.stringify(n.close) && JSON.stringify(o.adjclose) === JSON.stringify(n.adjclose);
  const r = (report.gruppi[g] ||= { simboli: 0, barre: 0, diversi: 0 });
  r.simboli++; r.barre += n.dates.length; if (!same) { r.diversi++; report.diversi.push({ g, sym, barreVecchie: o.dates.length, barreNuove: n.dates.length }); }
  const tz = res.meta.exchangeTimezoneName; if (!tz) report.senzaFuso.push(sym); else report.fusi[tz] = (report.fusi[tz] || 0) + 1;
}
// controllo che il confronto possa fallire: EURUSD=X e DX-Y.NYB devono risultare diversi
add('controllo (deve cambiare)', 'EURUSD=X'); add('controllo (deve cambiare)', 'DX-Y.NYB');
const miss = [];
for (const [g, set] of Object.entries(groups)) for (const s of set) { const res = await chart(s, '5y'); if (res) cmp(g, s, res); else miss.push(s); }
const sk = await spark([...groups.membri]);
for (const [s, res] of Object.entries(sk)) cmp('membri via spark (1y)', s, res);
report.nonScaricati = miss;
console.log(JSON.stringify(report, null, 1));
