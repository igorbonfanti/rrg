// Ricalcolo indipendente dei gruppi dello scatter (1.6.1) da data/vix.json.
// Uso: node ricerca/qa/1.6.1/grafici/gruppi.mjs  (dalla radice del repo)  -> stampa e scrive atteso.json
import fs from 'fs'; import path from 'path'; import url from 'url';
const SITE = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../../../..');
const V = await import(path.join(SITE, 'js/vix.js'));
const d = JSON.parse(fs.readFileSync(path.join(SITE, 'data/vix.json')));
const vix = V.vxSeries(d.series.VIX);
const out = {};
const mmaaaa = (s) => `${s.slice(5, 7)}/${s.slice(0, 4)}`;
for (const k of ['SPX', 'NDX']) {
  const A = V.align(V.vxSeries(d.series[k]), vix);
  // scatter indipendente: sedute con VIX>=30 e 252+1 sedute dopo
  const n = A.close.length, mine = [];
  for (let p = 0; p < n; p++) { const v = A.vix[p]; if (v == null || v < 30 || p + 1 + 252 >= n) continue; mine.push({ date: A.dates[p], vix: v, ret: (A.close[p + 253] / A.close[p + 1] - 1) * 100 }); }
  const S = V.scatter(A);
  let diff = 0; if (mine.length !== S.pts.length) diff = -1; else mine.forEach((m, i) => { const q = S.pts[i]; if (m.date !== q.date || Math.abs(m.vix - q.vix) > 1e-9 || Math.abs(m.ret - q.ret) > 1e-9) diff++; });
  // episodi a 30 indipendenti: prima seduta >=30 con le 63 osservazioni VIX precedenti tutte <30
  const obs = []; A.vix.forEach((v, i) => v != null && obs.push(i));
  const starts = []; for (let j = 63; j < obs.length; j++) { if (A.vix[obs[j]] < 30) continue; let q = true; for (let t = j - 63; t < j; t++) if (A.vix[obs[t]] >= 30) { q = false; break; } if (q) starts.push(obs[j]); }
  const epOf = (p) => { let e = null; for (const s of starts) if (s <= p) e = s; return e; };
  // gruppo: crisi in cui inizia l'episodio, altrimenti l'episodio
  const gl = [], gk = new Map();
  for (const s of starts) { const c = V.crisisOf(A.dates[s]); const key = c || `ep:${A.dates[s]}`; if (!gk.has(key)) { gk.set(key, { key, label: c || `Fuori dalle crisi elencate · ${mmaaaa(A.dates[s])}`, c: gl.length % 16, idx: gl.length, eps: [], pts: [] }); gl.push(gk.get(key)); } gk.get(key).eps.push(A.dates[s]); }
  const pidx = new Map(A.dates.map((x, i) => [x, i]));
  for (const m of mine) { const e = epOf(pidx.get(m.date)); m.ep = e == null ? null : A.dates[e]; m.start = e === pidx.get(m.date); const g = e == null ? null : gk.get(V.crisisOf(A.dates[e]) || `ep:${A.dates[e]}`); m.g = g ? g.key : null; if (g) g.pts.push(m.date); }
  // righe della tabella: per ogni soglia, gruppo atteso = gruppo dei punti dello scatter nella seduta d'inizio (se è un punto a VIX>=30)
  const R = V.regimes(A), rows = {};
  for (const X of V.XS) rows[X] = R.thr[X].episodes.map((e) => { const p = e.p; const ep30 = epOf(p); let inside = null; if (ep30 != null) { const s30 = S.eps.find((x) => x.p === ep30); if (s30 && e.date <= s30.end) inside = gk.get(V.crisisOf(A.dates[ep30]) || `ep:${A.dates[ep30]}`).key; } return { date: e.date, crisis: e.crisis, inside30: inside, byCrisis: e.crisis && gk.has(e.crisis) ? e.crisis : null }; });
  out[k] = { n: mine.length, diffVsApp: diff, nullEp: mine.filter((m) => !m.ep).length, groups: gl.map((g) => ({ key: g.key, label: g.label, c: g.c, eps: g.eps, npts: g.pts.length })), pts: mine, rows, starts: starts.map((s) => A.dates[s]), last: A.dates.at(-1) };
  console.log(`\n== ${k}: ${mine.length} punti (scarti dall'app ${diff}), punti senza episodio ${out[k].nullEp}, ultimo dato ${A.dates.at(-1)}, episodi a 30: ${starts.length}, gruppi ${gl.length}`);
  for (const g of gl) console.log(`  g${String(g.c).padEnd(2)} ${g.label.padEnd(42)} episodi ${g.eps.join(',')}  punti ${g.pts.length}`);
  for (const X of V.XS) { const mism = rows[X].filter((r) => r.byCrisis !== r.inside30 && (r.byCrisis || r.inside30)); console.log(`  soglia ${X}: ${rows[X].length} righe; righe dove crisi != gruppo dei punti: ${mism.map((r) => `${r.date}[${r.crisis}→${r.inside30}]`).join(' ') || 'nessuna'}`); }
}
fs.writeFileSync(path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'atteso.json'), JSON.stringify(out));
