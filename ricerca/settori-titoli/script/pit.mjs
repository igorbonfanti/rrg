// prova: equal weight point-in-time (membri all'inizio del periodo, usciti tenuti fino all'uscita) vs membri di oggi vs RSP*
import fs from 'node:fs';
import { fetchDaily, mapLimit } from '/home/user/rrg/scripts/lib/yahoo.js';
const S = process.argv[2];
const P = JSON.parse(fs.readFileSync(S + '/cve/prices.json'));
const mem = JSON.parse(fs.readFileSync('/home/user/rrg/data/sp500_members.json', 'utf8')).members;
const ch = JSON.parse(fs.readFileSync(S + '/wiki/changes.json'));
// settore GICS degli usciti (solo per questa prova)
const REMSEC = { WBD: 'XLC', CTVA: 'XLB', TAP: 'XLP', TTD: 'XLC', BLDR: 'XLI', AVB: 'XLRE', EA: 'XLC', CAG: 'XLP', POOL: 'XLY', CPB: 'XLP', EPAM: 'XLK', CTRA: 'XLE', HOLX: 'XLV', MTCH: 'XLC', MOH: 'XLV', LW: 'XLP', PAYC: 'XLI', DAY: 'XLI', LKQ: 'XLY', SOLS: 'XLI', MHK: 'XLY', K: 'XLP', IPG: 'XLC', EMN: 'XLB', KMX: 'XLY', ENPH: 'XLK', CZR: 'XLY', MKTX: 'XLF', WBA: 'XLP', HES: 'XLE', ANSS: 'XLK', JNPR: 'XLK' };
const rem = ch.filter((c) => c.rem).map((c) => ({ s: c.rem, out: c.date, sector: REMSEC[c.rem] }));
const add = Object.fromEntries(ch.filter((c) => c.add).map((c) => [c.add, c.date]));
const got = await mapLimit(rem, 3, async (r) => { try { const x = await fetchDaily(r.s, { range: '2y' }); return { dates: x.dates, close: x.close }; } catch (e) { return null; } }, 150);
rem.forEach((r, i) => { if (got[i] && got[i].dates.length) P[r.s] = got[i]; });
console.log('usciti con prezzi:', rem.filter((r) => P[r.s]).map((r) => r.s).join(' '), '\nsenza:', rem.filter((r) => !P[r.s]).map((r) => r.s).join(' '));
const cal = P.SPY.dates, N = cal.length - 1;
const idx = {}; for (const s in P) idx[s] = new Map(P[s].dates.map((d, i) => [d, i]));
const px = (s, d) => { const i = idx[s] && idx[s].get(d); return i == null ? null : P[s].close[i]; };
// ultima chiusura disponibile entro la data (per gli usciti: il prezzo di uscita / di acquisizione)
const last = (s, d) => { const p = P[s]; let k = -1; for (let i = 0; i < p.dates.length && p.dates[i] <= d; i++) k = i; return k < 0 ? null : p.close[k]; };
const EW = { XLK: 'RSPT', XLC: 'RSPC', XLY: 'RSPD', XLP: 'RSPS', XLE: 'RSPG', XLF: 'RSPF', XLV: 'RSPH', XLI: 'RSPN', XLB: 'RSPM', XLRE: 'RSPR', XLU: 'RSPU' };
for (const [pn, s0] of [['6M', N - 126], ['YTD', cal.findIndex((d) => d >= '2026-01-01') - 1], ['1A', N - 252]]) {
  const d0 = cal[s0];
  console.log(`\n${pn} da ${d0}: oggi   pit   RSP*  | oggi-RSP pit-RSP | n oggi/pit (usciti senza prezzo)`);
  for (const sec in EW) {
    const today = mem.filter((m) => m.sector === sec && px(m.s, d0) != null);
    const rToday = today.reduce((a, m) => a + px(m.s, cal[N]) / px(m.s, d0) - 1, 0) / today.length;
    const pit = [...mem.filter((m) => m.sector === sec && !(add[m.s] > d0)), ...rem.filter((r) => r.sector === sec && r.out > d0)];
    let sum = 0, n = 0, miss = 0;
    for (const m of pit) {
      if (!P[m.s]) { miss++; continue; }
      const a = px(m.s, d0) ?? null; if (a == null) { miss++; continue; }
      const b = m.out ? last(m.s, m.out < cal[N] ? m.out : cal[N]) : px(m.s, cal[N]);
      sum += b / a - 1; n++;
    }
    const e = px(EW[sec], cal[N]) / px(EW[sec], d0) - 1;
    const f = (v) => (100 * v).toFixed(1).padStart(6);
    console.log(sec.padEnd(5), f(rToday), f(sum / n), f(e), '|', f(rToday - e), f(sum / n - e), '|', today.length + '/' + n, miss ? `(${miss})` : '');
  }
}
