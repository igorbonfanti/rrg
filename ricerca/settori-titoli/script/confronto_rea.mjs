// Varianti di metodo per i rendimenti cap ed equal-weight dei settori (3M al 16/10/2026): finestra, prezzo e pesi.
// Le letture del grafico di Rea non sono più nel repository (decisione dell'utente del 20/10/2026): lo script
// stampa solo i nostri calcoli.
import fs from 'node:fs';
import { parseCSV } from '/home/user/rrg/scripts/fetch_breadth.js';
const S = process.argv[2];
const P = JSON.parse(fs.readFileSync(S + '/cve/prices.json'));
const mem = JSON.parse(fs.readFileSync('/home/user/rrg/data/sp500_members.json', 'utf8')).members;
const txt = fs.readFileSync(S + '/ivv/ivv.csv', 'utf8').split(/\r?\n/);
const mv = {};
for (const r of parseCSV(txt.slice(txt.findIndex((l) => l.startsWith('Ticker,'))).join('\n'))) if (r['Asset Class'] === 'Equity') { const t = r.Ticker.replace(/[ .]/g, '-'); mv[t] = (mv[t] || 0) + +r['Market Value'].replace(/,/g, ''); }
const SECTORS = ['XLV', 'XLE', 'XLK', 'XLP', 'XLB', 'XLY', 'XLF', 'XLC', 'XLI', 'XLU', 'XLRE'];
const ours = JSON.parse(fs.readFileSync('/home/user/rrg/data/sector_members.json'));
const cal = P.SPY.dates, N = cal.length - 1;
const idx = {}; for (const s in P) idx[s] = new Map(P[s].dates.map((d, i) => [d, i]));
const val = (s, d, adj) => { const i = idx[s] && idx[s].get(d); return i == null ? null : (adj ? P[s].adj : P[s].close)[i]; };
const starts = { 'S63 (20/07)': N - 63, 'cal 16/07': cal.filter((d) => d <= '2026-07-16').length - 1, 'cal 17/07': cal.filter((d) => d <= '2026-07-17').length - 1 };
const rows = [];
for (const [wn, s0] of Object.entries(starts)) for (const adj of [false, true]) {
  const res = {};
  for (const sec of SECTORS) {
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
// 3M per settore: la nostra app, poi le varianti (pesi di fine periodo, buy-and-hold, media semplice) per ogni partenza
for (const { wn, adj, res } of rows) {
  console.log(`\n${wn} ${adj ? 'con dividendi' : 'solo prezzo'}   settore  app cap  pesi oggi  buy&hold | app eq  media`);
  for (const k of SECTORS) console.log(k.padEnd(5), ours.sectors[k]['3M'][0][0].toFixed(2).padStart(8), res[k].endw.toFixed(2).padStart(9), res[k].bh.toFixed(2).padStart(9), '|', ours.sectors[k]['3M'][0][1].toFixed(2).padStart(6), res[k].eq.toFixed(2).padStart(6));
}
// ETF settoriali dalla stessa partenza del 17/07
const s17 = starts['cal 17/07'];
const etf = (t, adj) => 100 * (val(t, cal[N], adj) / val(t, cal[s17], adj) - 1);
console.log(`\nETF dal ${cal[s17]}:`, SECTORS.map((k) => `${k} ${etf(k, false).toFixed(2)}`).join(' · '));
