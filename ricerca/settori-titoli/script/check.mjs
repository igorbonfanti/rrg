// confronto: rendimenti cap-weighted (pesi IVV a buy-and-hold) ed equal-weight dai membri contro gli ETF XL* e RSP*
import fs from 'node:fs';
import { parseCSV } from '/home/user/rrg/scripts/fetch_breadth.js';
const S = process.argv[2];
const P = JSON.parse(fs.readFileSync(S + '/cve/prices.json'));
const mem = JSON.parse(fs.readFileSync('/home/user/rrg/data/sp500_members.json', 'utf8')).members;
const txt = fs.readFileSync(S + '/ivv/ivv.csv', 'utf8').split(/\r?\n/);
const h = txt.findIndex((l) => l.startsWith('Ticker,'));
const rows = parseCSV(txt.slice(h).join('\n')).filter((r) => r['Asset Class'] === 'Equity');
const mv = {}, isec = {};
const norm = (t) => t.replace(/[ .]/g, '-').toUpperCase();
for (const r of rows) { const t = norm(r.Ticker); mv[t] = (mv[t] || 0) + Number(r['Market Value'].replace(/,/g, '')); isec[t] = r.Sector; }
const miss = mem.filter((m) => !mv[m.s]).map((m) => m.s);
console.log('membri senza peso IVV:', miss.join(' ') || '-', '| righe IVV non tra i membri:', Object.keys(mv).filter((t) => !mem.find((m) => m.s === t)).join(' '));
const SECN = { 'Information Technology': 'XLK', 'Communication': 'XLC', 'Consumer Discretionary': 'XLY', 'Consumer Staples': 'XLP', 'Energy': 'XLE', 'Financials': 'XLF', 'Health Care': 'XLV', 'Industrials': 'XLI', 'Materials': 'XLB', 'Real Estate': 'XLRE', 'Utilities': 'XLU' };
const diffSec = mem.filter((m) => isec[m.s] && SECN[isec[m.s]] && SECN[isec[m.s]] !== m.sector).map((m) => `${m.s}:${m.sector}/${isec[m.s]}`);
console.log('settore diverso:', diffSec.join(' ') || '-', '| settori IVV:', [...new Set(Object.values(isec))].join(','));
const EW = { XLK: 'RSPT', XLC: 'RSPC', XLY: 'RSPD', XLP: 'RSPS', XLE: 'RSPG', XLF: 'RSPF', XLV: 'RSPH', XLI: 'RSPN', XLB: 'RSPM', XLRE: 'RSPR', XLU: 'RSPU', SPX: 'RSP' };
const CW = { SPX: 'SPY' };
const cal = P.SPY.dates; const N = cal.length - 1;
const at = (s, d) => { const p = P[s]; if (!p) return null; const i = p.dates.indexOf(d); return i < 0 ? null : p.close[i]; };
const ytd0 = cal.findIndex((d) => d >= cal[N].slice(0, 4) + '-01-01') - 1;
const PER = { '1M': 21, '3M': 63, '6M': 126, 'YTD': N - ytd0, '1A': 252 };
function sectorRet(sec, e, len) {
  const d1 = cal[e], d0 = cal[e - len], dn = cal[N];
  let num = 0, den = 0, sum = 0, n = 0, tot = 0;
  for (const m of mem) {
    if (sec !== 'SPX' && m.sector !== sec) continue;
    tot++;
    const c0 = at(m.s, d0), c1 = at(m.s, d1), cn = at(m.s, dn);
    if (c0 == null || c1 == null || cn == null || !mv[m.s]) continue;
    const w1 = mv[m.s] * c1 / cn; // valore al termine del periodo (stesse azioni di oggi)
    num += w1; den += w1 * c0 / c1; sum += c1 / c0 - 1; n++;
  }
  return { cap: 100 * (num / den - 1), eq: 100 * sum / n, n, tot };
}
const etfRet = (s, e, len) => { const a = at(s, cal[e - len]), b = at(s, cal[e]); return a && b ? 100 * (b / a - 1) : null; };
const f = (v) => (v == null ? '   -' : (v >= 0 ? '+' : '') + v.toFixed(1)).padStart(6);
for (const [pn, len] of Object.entries(PER)) {
  console.log(`\n== ${pn} (${cal[N - len]} → ${cal[N]}) ==   cap  XL*   Δ |   eq  RSP*   Δ | spread noi/ETF | n`);
  for (const sec of [...Object.values(SECN), 'SPX']) {
    const r = sectorRet(sec, N, len), xc = etfRet(CW[sec] || sec, N, len), xe = etfRet(EW[sec], N, len);
    console.log(sec.padEnd(5), f(r.cap), f(xc), f(r.cap - xc), '|', f(r.eq), f(xe), f(r.eq - xe), '|', f(r.cap - r.eq), f(xc - xe), '|', r.n + '/' + r.tot);
  }
}
