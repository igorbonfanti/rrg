// scarica 2 anni di prezzi dei membri S&P 500 + ETF settoriali cap ed equal weight, salva in cache
import fs from 'node:fs';
import { fetchDaily, mapLimit } from '/home/user/rrg/scripts/lib/yahoo.js';
const dir = process.argv[2];
const mem = JSON.parse(fs.readFileSync('/home/user/rrg/data/sp500_members.json', 'utf8')).members;
const ETF = ['XLK','XLC','XLY','XLP','XLE','XLF','XLV','XLI','XLB','XLRE','XLU','SPY','RSP','RSPT','RSPC','RSPD','RSPS','RSPG','RSPF','RSPH','RSPN','RSPM','RSPR','RSPU'];
const syms = [...mem.map((m) => m.s), ...ETF];
const res = await mapLimit(syms, 3, async (s) => { try { const r = await fetchDaily(s, { range: '2y' }); return { dates: r.dates, close: r.close, adj: r.adjclose }; } catch (e) { console.warn(s, e.message); return null; } }, 150);
const out = {}; syms.forEach((s, i) => { if (res[i]) out[s] = res[i]; });
fs.writeFileSync(dir + '/prices.json', JSON.stringify(out));
console.log(Object.keys(out).length, '/', syms.length);
