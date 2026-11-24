// Ricalcolo separato della regola R1 di pattern.mjs (tocco della breadth a 50 sedute sotto il 5° percentile della storia, almeno
// 500 sedute di storia, segnale dopo 20 sedute senza): rendimento e positivi a 63 sedute e calo massimo, contro tutte le sedute,
// 2001–2013 e 2014–oggi. Uso: node ricerca/indici-breadth50/script/verifica_r1.mjs [--incluso]
import fs from 'node:fs';
import { indexSeries } from '../../../js/indexdata.js';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const cfg = R('config/indices.json').indices, IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const incl = process.argv.includes('--incluso');
const S = { cal: [], ver: [] }, B = { cal: [], ver: [] }, Sdd = { cal: [], ver: [] }, Bdd = { cal: [], ver: [] }; let nsig = 0;
for (const k of Object.keys(cfg)) {
  const X = indexSeries(IX[k]), b = X.pct50, c = X.close, N = b.length, sorted = []; let seen = 0, off = 0;
  for (let t = 0; t < N; t++) {
    const v = b[t];
    const ins = (x) => { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= x) lo = m + 1; else hi = m; } sorted.splice(lo, 0, x); };
    if (v != null && incl) ins(v);
    let on = false;
    if (v != null && sorted.length >= 500) on = v <= sorted[Math.floor(0.05 * (sorted.length - 1))];
    if (v != null && !incl) ins(v);
    const per = X.dates[t] < '2014' ? 'cal' : 'ver';
    const fr = t + 63 < N && c[t] != null && c[t + 63] != null ? 100 * (c[t + 63] / c[t] - 1) : null;
    let dd = null; if (t + 63 < N && c[t] != null) { let mn = c[t]; for (let j = t + 1; j <= t + 63; j++) if (c[j] != null) mn = Math.min(mn, c[j]); dd = 100 * (mn / c[t] - 1); }
    if (v != null && sorted.length >= 500 && fr != null) { B[per].push(fr); Bdd[per].push(dd); }
    if (v == null) continue;
    if (on) { if (off >= 20) { nsig++; if (fr != null) { S[per].push(fr); Sdd[per].push(dd); } } off = 0; } else off++;
  }
}
for (const p of ['cal', 'ver']) console.log(p, 'segnali', S[p].length, '| mediana 63', med(S[p]).toFixed(1), 'base', med(B[p]).toFixed(1), '| positivi', (100 * S[p].filter((x) => x > 0).length / S[p].length).toFixed(1), 'base', (100 * B[p].filter((x) => x > 0).length / B[p].length).toFixed(1), '| calo max 63', med(Sdd[p]).toFixed(1), 'base', med(Bdd[p]).toFixed(1));
console.log('segnali totali R1', nsig, incl ? '(percentile con la seduta del giorno)' : '(percentile con la storia fino al giorno prima)');
