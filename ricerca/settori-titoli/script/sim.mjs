// simulazione giornaliera degli indici di settore cap ed equal weight con composizione point-in-time
import fs from 'node:fs';
import { fetchDaily, mapLimit } from '/home/user/rrg/scripts/lib/yahoo.js';
import { parseCSV } from '/home/user/rrg/scripts/fetch_breadth.js';
const S = process.argv[2];
const P = JSON.parse(fs.readFileSync(S + '/cve/prices.json'));
const mem = JSON.parse(fs.readFileSync('/home/user/rrg/data/sp500_members.json', 'utf8')).members;
const ch = JSON.parse(fs.readFileSync(S + '/wiki/changes.json'));
const REMSEC = { WBD: 'XLC', CTVA: 'XLB', TAP: 'XLP', TTD: 'XLC', BLDR: 'XLI', AVB: 'XLRE', EA: 'XLC', CAG: 'XLP', POOL: 'XLY', CPB: 'XLP', EPAM: 'XLK', CTRA: 'XLE', HOLX: 'XLV', MTCH: 'XLC', MOH: 'XLV', LW: 'XLP', PAYC: 'XLI', DAY: 'XLI', LKQ: 'XLY', SOLS: 'XLI', MHK: 'XLY', K: 'XLP', IPG: 'XLC', EMN: 'XLB', KMX: 'XLY', ENPH: 'XLK', CZR: 'XLY', MKTX: 'XLF', WBA: 'XLP', HES: 'XLE', ANSS: 'XLK', JNPR: 'XLK' };
const txt = fs.readFileSync(S + '/ivv/ivv.csv', 'utf8').split(/\r?\n/);
const mv = {}; for (const r of parseCSV(txt.slice(txt.findIndex((l) => l.startsWith('Ticker,'))).join('\n'))) if (r['Asset Class'] === 'Equity') { const t = r.Ticker.replace(/[ .]/g, '-'); mv[t] = (mv[t] || 0) + +r['Market Value'].replace(/,/g, ''); }
const rem = ch.filter((c) => c.rem && REMSEC[c.rem]);
if (!fs.existsSync(S + '/cve/rem.json')) {
  const got = await mapLimit(rem, 3, async (r) => { try { const x = await fetchDaily(r.rem, { range: '2y' }); return { dates: x.dates, close: x.close }; } catch { return null; } }, 150);
  const o = {}; rem.forEach((r, i) => { if (got[i] && got[i].dates.length) o[r.rem] = got[i]; }); fs.writeFileSync(S + '/cve/rem.json', JSON.stringify(o));
}
Object.assign(P, JSON.parse(fs.readFileSync(S + '/cve/rem.json')));
const cal = P.SPY.dates, N = cal.length - 1;
const ser = {}; // prezzo per data del calendario, riempito in avanti solo fino all'ultima quotazione
for (const s in P) { const m = new Map(P[s].dates.map((d, i) => [d, P[s].close[i]])); let v = null; ser[s] = cal.map((d) => (m.has(d) ? (v = m.get(d)) : (d > P[s].dates.at(-1) ? null : v))); }
// intervalli di appartenenza: [in, out) per data di efficacia
const life = {};
for (const m of mem) life[m.s] = { sector: m.sector, in: '0000', out: '9999' };
for (const c of ch) { if (c.add && life[c.add]) life[c.add].in = c.date; }
for (const c of rem) life[c.rem] = { sector: REMSEC[c.rem], in: '0000', out: c.date, removed: true };
const isReset = (d) => { const [y, m, dd] = d.split('-').map(Number); return [3, 6, 9, 12].includes(m) && new Date(Date.UTC(y, m - 1, dd)).getUTCDay() === 5 && dd >= 15 && dd <= 21; };
function sim(sec, s0) {
  // ritorna serie cw ed ew dal giorno s0 (=1)
  const names = Object.keys(life).filter((s) => life[s].sector === sec && ser[s]);
  const inIdx = (s, t) => life[s].in <= cal[t] && cal[t] < life[s].out && ser[s][t - 1] != null && ser[s][t] != null;
  // cap a buy-and-hold: azioni costanti = mv di oggi / prezzo di oggi; usciti: peso del 20° percentile del settore
  const nowMv = names.filter((s) => mv[s]).map((s) => mv[s]).sort((a, b) => a - b);
  const shares = Object.fromEntries(names.map((s) => { const last = P[s].close.at(-1); return [s, (mv[s] || nowMv[Math.floor(nowMv.length * 0.2)] * 0.7) / last]; }));
  const cw = [1], ew = [1]; let h = null; // h: quote equal weight
  for (let t = s0 + 1; t <= N; t++) {
    const act = names.filter((s) => inIdx(s, t));
    // cap: rendimento del giorno pesato per la cap di ieri
    let a = 0, b = 0; for (const s of act) { const c0 = shares[s] * ser[s][t - 1]; a += c0 * ser[s][t] / ser[s][t - 1]; b += c0; }
    cw.push(cw.at(-1) * a / b);
    // equal: quote fisse tra i reset; chi entra/esce: si riequilibra in proporzione
    const V = ew.at(-1);
    const setEq = () => { h = Object.fromEntries(act.map((s) => [s, V / act.length / ser[s][t - 1]])); };
    if (!h || isReset(cal[t - 1])) setEq();
    else {
      const keys = Object.keys(h);
      if (keys.length !== act.length || act.some((s) => !(s in h))) {
        const keep = act.filter((s) => s in h); const valKeep = keep.reduce((x, s) => x + h[s] * ser[s][t - 1], 0);
        const nNew = act.length - keep.length, wNew = V / act.length;
        const scale = (V - nNew * wNew) / valKeep; const nh = {};
        for (const s of keep) nh[s] = h[s] * scale; for (const s of act) if (!(s in h)) nh[s] = wNew / ser[s][t - 1];
        h = nh;
      }
    }
    ew.push(Object.entries(h).reduce((x, [s, q]) => x + q * ser[s][t], 0));
  }
  return { cw: cw.at(-1) - 1, ew: ew.at(-1) - 1 };
}
const EW = { XLK: 'RSPT', XLC: 'RSPC', XLY: 'RSPD', XLP: 'RSPS', XLE: 'RSPG', XLF: 'RSPF', XLV: 'RSPH', XLI: 'RSPN', XLB: 'RSPM', XLRE: 'RSPR', XLU: 'RSPU' };
const f = (v) => (100 * v).toFixed(1).padStart(6);
for (const [pn, s0] of [['3M', N - 63], ['6M', N - 126], ['YTD', cal.findIndex((d) => d >= '2026-01-01') - 1], ['1A', N - 252]]) {
  console.log(`\n${pn} da ${cal[s0]}:   cw    XL*  |   ew   RSP*   Δew | spread sim / ETF`);
  for (const sec in EW) {
    const r = sim(sec, s0), x = ser[sec][N] / ser[sec][s0] - 1, e = ser[EW[sec]][N] / ser[EW[sec]][s0] - 1;
    console.log(sec.padEnd(5), f(r.cw), f(x), ' |', f(r.ew), f(e), f(r.ew - e), ' |', f(r.ew - r.cw), f(e - x));
  }
}
