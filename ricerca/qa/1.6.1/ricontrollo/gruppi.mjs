// Ricontrollo 1.6.1 (secondo giro, grafici e usabilità): ricalcolo indipendente dei gruppi dello scatter e delle righe
// cliccabili della tabella degli episodi, con la regola nuova:
//   ogni seduta va con la crisi di CRISES in cui cade la sua data; se la data non è in nessuna crisi, con la crisi del
//   suo episodio (a 30); se neanche quello, con l'episodio da solo («Altro episodio · MM/AAAA»).
// Riga della tabella (soglia X): data in una crisi → quella crisi; altrimenti il gruppo dell'episodio a 30 in corso quel
// giorno (inizio ≤ data ≤ ultima seduta ≥ 30 prima dell'episodio dopo); cliccabile solo se il gruppo ha punti.
// Dal modulo dell'app uso solo la lettura dei dati (vxSeries, align), l'elenco CRISES e, per confronto, scatter/regimes.
// Uso: node ricerca/qa/1.6.1/ricontrollo/gruppi.mjs [SITE]   → stampa e scrive atteso.json accanto a sé
import fs from 'fs'; import path from 'path'; import url from 'url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SITE = process.argv[2] || path.resolve(HERE, '../../../..');
const V = await import(path.join(SITE, 'js/vix.js'));
const d = JSON.parse(fs.readFileSync(path.join(SITE, 'data/vix.json')));
const crisis = (s) => { for (const [n, a, b] of V.CRISES) if (s >= a && s <= b) return n; return null; };
const mmaaaa = (s) => `${s.slice(5, 7)}/${s.slice(0, 4)}`;
const out = {};
for (const k of ['SPX', 'NDX']) {
  const A = V.align(V.vxSeries(d.series[k]), V.vxSeries(d.series.VIX)), n = A.close.length;
  // episodi a una soglia: prima osservazione ≥ X con le 63 osservazioni del VIX prima tutte < X
  const obs = []; A.vix.forEach((v, i) => v != null && obs.push(i));
  const epis = (X) => {
    const st = []; for (let j = 63; j < obs.length; j++) { if (A.vix[obs[j]] < X) continue; let q = true; for (let t = j - 63; t < j; t++) if (A.vix[obs[t]] >= X) { q = false; break; } if (q) st.push(j); }
    return st.map((j, e) => { const stop = e + 1 < st.length ? st[e + 1] : obs.length; let last = j; for (let t = j; t < stop; t++) if (A.vix[obs[t]] >= X) last = t; return { p: obs[j], date: A.dates[obs[j]], end: A.dates[obs[last]] }; });
  };
  const e30 = epis(30);
  // punti: VIX ≥ 30 e 1 + 252 sedute dopo
  const pts = [];
  for (let p = 0; p < n; p++) { const v = A.vix[p]; if (v == null || v < 30 || p + 253 >= n) continue; let ep = null; for (const e of e30) if (e.p <= p) ep = e; pts.push({ date: A.dates[p], vix: v, ret: (A.close[p + 253] / A.close[p + 1] - 1) * 100, ep: ep.date, start: ep.p === p }); }
  // confronto con l'app (stessi punti, stesso episodio)
  const S = V.scatter(A); let diff = S.pts.length === pts.length ? 0 : -1;
  if (!diff) pts.forEach((m, i) => { const q = S.pts[i]; if (m.date !== q.date || Math.abs(m.ret - q.ret) > 1e-9 || m.ep !== q.ep || m.start !== q.start) diff++; });
  const keyOfEp = (date) => crisis(date) || `ep:${date}`;
  const groups = [], gk = new Map();
  for (const m of pts) { // in ordine di data
    const key = crisis(m.date) || keyOfEp(m.ep);
    if (!gk.has(key)) { const g = { key, label: key.startsWith('ep:') ? `Altro episodio · ${mmaaaa(key.slice(3))}` : key, c: groups.length % 16, npts: 0 }; gk.set(key, g); groups.push(g); }
    m.g = key; gk.get(key).npts++;
  }
  // righe
  const R = V.regimes(A), rows = {};
  for (const X of V.XS) {
    const mine = epis(X), app = R.thr[X].episodes;
    if (mine.length !== app.length || mine.some((e, i) => e.date !== app[i].date)) console.log(`!! ${k} soglia ${X}: episodi diversi dall'app`);
    rows[X] = mine.map((e) => {
      const c = crisis(e.date); let key = null;
      if (c) key = c; else { let x = null; for (const y of e30) if (y.date <= e.date && e.date <= y.end) x = y; if (x) key = keyOfEp(x.date); }
      return { date: e.date, crisis: c, g: key && gk.has(key) ? key : null };
    });
  }
  // casi in cui la crisi del punto non è quella dell'inizio del suo episodio
  const moved = pts.filter((m) => m.g !== keyOfEp(m.ep));
  const byPair = {}; for (const m of moved) { const t = `${keyOfEp(m.ep)} → ${m.g}`; (byPair[t] = byPair[t] || []).push(m.date); }
  out[k] = { n: pts.length, diffVsApp: diff, groups, pts, rows, last: A.dates.at(-1) };
  console.log(`\n== ${k}: ${pts.length} punti (scarti dall'app ${diff}), ultimo dato ${A.dates.at(-1)}, episodi a 30: ${e30.length}, gruppi con punti ${groups.length}`);
  for (const g of groups) console.log(`  g${String(g.c).padEnd(2)} ${g.label.padEnd(30)} punti ${g.npts}`);
  console.log('  sedute con un gruppo diverso da quello dell\'inizio del loro episodio:');
  for (const [t, ds] of Object.entries(byPair)) console.log(`    ${t}: ${ds.length} (${ds[0]} … ${ds.at(-1)})`);
  const y22 = pts.filter((m) => m.date.startsWith('2022')); console.log(`  2022: ${y22.length} sedute, gruppi ${[...new Set(y22.map((m) => m.g))].join(', ')}`);
  for (const X of V.XS) console.log(`  soglia ${X}: ${rows[X].length} righe, cliccabili ${rows[X].filter((r) => r.g).length}; non cliccabili: ${rows[X].filter((r) => !r.g).map((r) => r.date).join(' ') || '—'}`);
}
fs.writeFileSync(path.join(HERE, 'atteso.json'), JSON.stringify(out));
