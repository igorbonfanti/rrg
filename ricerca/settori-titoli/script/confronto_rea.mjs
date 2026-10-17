// Quale metodo riproduce i pallini di Rea (3M al 16/10/2026)? Varianti di finestra, prezzo e pesi.
import fs from 'node:fs';
import { parseCSV } from '/home/user/rrg/scripts/fetch_breadth.js';
const S = process.argv[2];
const P = JSON.parse(fs.readFileSync(S + '/cve/prices.json'));
const mem = JSON.parse(fs.readFileSync('/home/user/rrg/data/sp500_members.json', 'utf8')).members;
const txt = fs.readFileSync(S + '/ivv/ivv.csv', 'utf8').split(/\r?\n/);
const mv = {};
for (const r of parseCSV(txt.slice(txt.findIndex((l) => l.startsWith('Ticker,'))).join('\n'))) if (r['Asset Class'] === 'Equity') { const t = r.Ticker.replace(/[ .]/g, '-'); mv[t] = (mv[t] || 0) + +r['Market Value'].replace(/,/g, ''); }
// letture dei pallini di Rea dallo screenshot: [cap, equal]
const REA = { XLV: [12.86, 14.56], XLE: [21.04, 14.33], XLK: [8.14, 6.99], XLP: [4.80, 0.43], XLB: [5.14, 0.04], XLY: [-1.83, -3.11], XLF: [-1.58, -3.16], XLC: [0.09, -3.82], XLI: [-4.16, -4.86], XLU: [-6.06, -6.84], XLRE: [-6.38, -8.32] };
const ours = JSON.parse(fs.readFileSync('/home/user/rrg/data/sector_members.json'));
const cal = P.SPY.dates, N = cal.length - 1;
const idx = {}; for (const s in P) idx[s] = new Map(P[s].dates.map((d, i) => [d, i]));
const val = (s, d, adj) => { const i = idx[s] && idx[s].get(d); return i == null ? null : (adj ? P[s].adj : P[s].close)[i]; };
const starts = { 'S63 (20/07)': N - 63, 'cal 16/07': cal.filter((d) => d <= '2026-07-16').length - 1, 'cal 17/07': cal.filter((d) => d <= '2026-07-17').length - 1 };
const rows = [];
for (const [wn, s0] of Object.entries(starts)) for (const adj of [false, true]) {
  const res = {};
  for (const sec in REA) {
    const ms = mem.filter((m) => m.sector === sec && val(m.s, cal[s0], adj) != null && val(m.s, cal[N], adj) != null && mv[m.s]);
    const r = ms.map((m) => val(m.s, cal[N], adj) / val(m.s, cal[s0], adj) - 1);
    const w = ms.map((m) => mv[m.s]);
    const w0 = ms.map((m, i) => mv[m.s] / (1 + r[i]));
    const bh = 100 * (w0.reduce((a, x, i) => a + x * r[i], 0) / w0.reduce((a, b) => a + b, 0));
    const endw = 100 * (w.reduce((a, x, i) => a + x * r[i], 0) / w.reduce((a, b) => a + b, 0));
    const eq = 100 * r.reduce((a, b) => a + b, 0) / r.length;
    res[sec] = { bh, endw, eq };
  }
  rows.push({ wn, adj, res });
}
const rmse = (f) => Math.sqrt(Object.keys(REA).reduce((a, k) => a + f(k) ** 2, 0) / 11);
console.log('nostra app (sector_members):  cap RMSE', rmse((k) => ours.sectors[k]['3M'][0][0] - REA[k][0]).toFixed(2), ' equal RMSE', rmse((k) => ours.sectors[k]['3M'][0][1] - REA[k][1]).toFixed(2));
for (const { wn, adj, res } of rows) {
  console.log(`${wn.padEnd(12)} ${adj ? 'con dividendi' : 'solo prezzo  '} | cap buy&hold ${rmse((k) => res[k].bh - REA[k][0]).toFixed(2)} | cap pesi di oggi ${rmse((k) => res[k].endw - REA[k][0]).toFixed(2)} | equal media semplice ${rmse((k) => res[k].eq - REA[k][1]).toFixed(2)}`);
}
// dettaglio del migliore
const best = rows.find((x) => x.wn.startsWith('cal 16') && !x.adj);
console.log('\nsettore  Rea cap  noi  pesi-oggi(16/07) | Rea eq  noi  media(16/07)');
for (const k in REA) console.log(k.padEnd(5), REA[k][0].toFixed(2).padStart(7), ours.sectors[k]['3M'][0][0].toFixed(1).padStart(6), best.res[k].endw.toFixed(2).padStart(8), ' |', REA[k][1].toFixed(2).padStart(7), ours.sectors[k]['3M'][0][1].toFixed(1).padStart(6), best.res[k].eq.toFixed(2).padStart(7));

// dettaglio con partenza 17/07 e prova degli ETF settoriali
const s17 = starts['cal 17/07'];
const r17 = rows.find((x) => x.wn === 'cal 17/07' && !x.adj).res, r17a = rows.find((x) => x.wn === 'cal 17/07' && x.adj).res;
const etf = (t, adj) => 100 * (val(t, cal[N], adj) / val(t, cal[s17], adj) - 1);
console.log(`\npartenza ${cal[s17]}  settore  Rea cap | pesi oggi  buy&hold  ETF XL*  ETF adj | Rea eq | media  media adj`);
for (const k in REA) console.log(k.padEnd(5), REA[k][0].toFixed(2).padStart(7), '|', r17[k].endw.toFixed(2).padStart(8), r17[k].bh.toFixed(2).padStart(9), etf(k, false).toFixed(2).padStart(8), etf(k, true).toFixed(2).padStart(8), '|', REA[k][1].toFixed(2).padStart(6), '|', r17[k].eq.toFixed(2).padStart(6), r17a[k].eq.toFixed(2).padStart(7));
console.log('RMSE ETF', rmse((k) => etf(k, false) - REA[k][0]).toFixed(2), 'ETF adj', rmse((k) => etf(k, true) - REA[k][0]).toFixed(2));
