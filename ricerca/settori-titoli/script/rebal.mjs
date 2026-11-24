// equal weight con ribilanciamento trimestrale (dopo il 3° venerdì di mar/giu/set/dic) vs media buy-and-hold vs RSP*
import fs from 'node:fs';
const S = process.argv[2];
const P = JSON.parse(fs.readFileSync(S + '/cve/prices.json'));
const mem = JSON.parse(fs.readFileSync('/home/user/rrg/data/sp500_members.json', 'utf8')).members;
const cal = P.SPY.dates, N = cal.length - 1;
const idx = {}; for (const s in P) idx[s] = new Map(P[s].dates.map((d, i) => [d, i]));
const px = (s, d) => { const i = idx[s].get(d); return i == null ? null : P[s].close[i]; };
const isRebal = (d) => { const [y, m, dd] = d.split('-').map(Number); if (![3, 6, 9, 12].includes(m)) return false; const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); return dow === 5 && dd >= 15 && dd <= 21; };
const EW = { XLK: 'RSPT', XLC: 'RSPC', XLY: 'RSPD', XLP: 'RSPS', XLE: 'RSPG', XLF: 'RSPF', XLV: 'RSPH', XLI: 'RSPN', XLB: 'RSPM', XLRE: 'RSPR', XLU: 'RSPU' };
for (const [pn, s0] of [['YTD', cal.findIndex((d) => d >= '2026-01-01') - 1], ['1A', N - 252]]) {
  console.log(`\n${pn}: bh-media  trimestr.  RSP*   (trimestr - RSP)`);
  for (const sec in EW) {
    const ms = mem.filter((m) => m.sector === sec && px(m.s, cal[s0]) != null).map((m) => m.s);
    let v = 1, w = Object.fromEntries(ms.map((s) => [s, 1 / ms.length])), base = Object.fromEntries(ms.map((s) => [s, px(s, cal[s0])]));
    let bh = ms.reduce((a, s) => a + px(s, cal[N]) / base[s], 0) / ms.length - 1;
    for (let t = s0 + 1; t <= N; t++) {
      const val = ms.reduce((a, s) => { const c = px(s, cal[t]) ?? base[s]; return a + w[s] * c / base[s]; }, 0);
      if (isRebal(cal[t - 1]) || t === N) { // nuovo periodo dal giorno dopo
        if (t === N) { v *= val; break; }
        v *= val; for (const s of ms) { w[s] = 1 / ms.length; base[s] = px(s, cal[t]) ?? base[s]; }
        // la valutazione riparte dalla chiusura t
      }
    }
    const e = 100 * (px(EW[sec], cal[N]) / px(EW[sec], cal[s0]) - 1);
    console.log(sec.padEnd(5), (100 * bh).toFixed(1).padStart(6), (100 * (v - 1)).toFixed(1).padStart(8), e.toFixed(1).padStart(7), (100 * (v - 1) - e).toFixed(1).padStart(7));
  }
}
