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
  const names = Object.keys(life).filter((s) => (sec === 'SPX' || life[s].sector === sec) && ser[s]);
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
  return { cw, ew };
}

// ---- dati della demo ----
const metaMem = Object.fromEntries(mem.map((m) => [m.s, m]));
const ytd0 = cal.findIndex((d) => d >= cal[N].slice(0, 4) + '-01-01') - 1;
const S0 = N - 252 - 63 - 2;
const OFF = [0, 5, 21, 63];
const PER = { '1M': 21, '3M': 63, '6M': 126, 'YTD': null, '1A': 252 };
const win = (p, e) => { if (p === 'YTD') { return e > ytd0 ? [ytd0, e] : null; } return [e - PER[p], e]; };
const SECS = ['XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU'];
const r1 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 1000) / 10);
const sectors = {};
const allCw = [], allEw = [];
for (const sec of [...SECS, 'SPX']) {
  const { cw, ew } = sim(sec, S0);
  const o = {};
  for (const p in PER) o[p] = OFF.map((k) => { const w = win(p, N - k); if (!w) return null; const [a, b] = w.map((t) => t - S0); return [r1(cw[b] / cw[a] - 1), r1(ew[b] / ew[a] - 1)]; });
  sectors[sec] = o;
}
const totMv = Object.values(mv).reduce((a, b) => a + b, 0);
const stocks = [];
for (const m of mem) {
  const c = ser[m.s]; if (!c || c[N] == null) continue;
  const ret = (a, b) => (c[a] != null && c[b] != null ? r1(c[b] / c[a] - 1) : null);
  const r = {}, prev = {};
  for (const p in PER) { const [a, b] = win(p, N); r[p] = ret(a, b); }
  for (const p of ['1M', '3M', '6M', '1A']) prev[p] = ret(N - 2 * PER[p], N - PER[p]);
  prev.YTD = (() => { const y0 = cal.findIndex((d) => d >= String(+cal[N].slice(0, 4) - 1) + '-01-01') - 1; return y0 >= 0 ? ret(y0, ytd0) : null; })();
  const hist = c.slice(Math.max(0, N - 251), N + 1).filter((v) => v != null);
  const hi = Math.max(...hist), lo = Math.min(...hist);
  const sma = (n) => { const x = c.slice(N - n + 1, N + 1); return x.length === n && x.every((v) => v != null) ? x.reduce((a, b) => a + b, 0) / n : null; };
  const m200 = sma(200), m50 = sma(50);
  const first = P[m.s].dates[0];
  stocks.push({ s: m.s, n: m.name, sec: m.sector, sub: m.sub, w: mv[m.s] ? Math.round(mv[m.s] / totMv * 10000) / 100 : null, px: Math.round(c[N] * 100) / 100,
    r, prev, dd: r1(c[N] / hi - 1), up: r1(c[N] / lo - 1), d200: m200 ? r1(c[N] / m200 - 1) : null, d50: m50 ? r1(c[N] / m50 - 1) : null,
    since: first > cal[N - 252] ? first : null, added: life[m.s].in !== '0000' ? life[m.s].in : null });
}
const dates = OFF.map((k) => cal[N - k]);
const starts = Object.fromEntries(Object.keys(PER).map((p) => [p, OFF.map((k) => { const w = win(p, N - k); return w ? cal[w[0]] : null; })]));
fs.writeFileSync(S + '/cve/demo_data.json', JSON.stringify({ asOf: cal[N], dates, starts, sectors, stocks }));
console.log('ok', stocks.length, cal[N], JSON.stringify(sectors.XLK['3M']), JSON.stringify(starts.YTD));
