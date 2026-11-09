// Controllo dei gruppi dello scatter e delle righe della tabella degli episodi (stessa logica di groupsOf in js/vix-view.js,
// riscritta qui): righe senza gruppo (non cliccabili), righe che portano a un gruppo senza punti nello scatter, crisi senza righe.
// Uso: node ricerca/qa/1.6.1/usabilita/gruppi.mjs <cartella del sito>
import path from 'path'; import fs from 'fs';
const SITE = path.resolve(process.argv[2] || '.');
const V = await import(path.join(SITE, 'js/vix.js'));
const D = JSON.parse(fs.readFileSync(path.join(SITE, 'data/vix.json'), 'utf8'));
for (const ix of ['SPX', 'NDX']) {
  const A = V.align(V.vxSeries(D.series[ix]), V.vxSeries(D.series.VIX)), S = V.scatter(A), R = V.regimes(A);
  const byKey = new Map(), byEp = new Map(), list = [];
  for (const e of S.eps) { const k = e.crisis || `ep:${e.date}`; if (!byKey.has(k)) { const g = { key: k, eps: [] }; byKey.set(k, g); list.push(g); } byKey.get(k).eps.push(e); byEp.set(e.date, byKey.get(k)); }
  const n = new Map(); for (const p of S.pts) { const g = byEp.get(p.ep); if (g) n.set(g.key, (n.get(g.key) || 0) + 1); }
  const ofRow = (e) => (e.crisis && byKey.has(e.crisis) ? byKey.get(e.crisis) : (() => { let g = null; for (const x of S.eps) if (x.p <= e.p && e.date <= (x.end || x.date)) g = byEp.get(x.date); return g; })());
  console.log(`\n${ix}: ${S.pts.length} punti, ${S.eps.length} episodi sopra 30, ${list.length} gruppi, ${list.filter((g) => n.get(g.key)).length} con punti; open=${S.open}`);
  console.log(' gruppi:', list.map((g) => `${g.key}(${n.get(g.key) || 0})`).join(', '));
  for (const X of V.XS) {
    const eps = R.thr[X].episodes; const noG = eps.filter((e) => !ofRow(e)); const noPts = eps.filter((e) => { const g = ofRow(e); return g && !n.get(g.key); });
    const withRows = new Set(eps.map((e) => ofRow(e)).filter(Boolean).map((g) => g.key));
    const lacking = list.filter((g) => n.get(g.key) && !withRows.has(g.key)).map((g) => g.key);
    console.log(` soglia ${X}: ${eps.length} righe, senza gruppo ${noG.length} (${noG.map((e) => e.date + ' ' + (e.crisis || '—')).join('; ')}), gruppo senza punti ${noPts.length}; crisi dello scatter senza righe: ${lacking.length}`);
    const wrong = eps.filter((e) => e.crisis && ofRow(e) && ofRow(e).key !== e.crisis); if (wrong.length) console.log('  riga con crisi diversa dal gruppo:', wrong.map((e) => e.date + ' ' + e.crisis + ' -> ' + ofRow(e).key).join('; '));
    const fb = eps.filter((e) => !(e.crisis && byKey.has(e.crisis)) && ofRow(e)); if (fb.length) console.log('  righe assegnate con la regola «episodio sopra 30 in corso»:', fb.map((e) => `${e.date} ${e.crisis || '—'} -> ${ofRow(e).key}`).join('; '));
  }
}
