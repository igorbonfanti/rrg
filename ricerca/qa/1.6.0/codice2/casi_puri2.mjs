// Secondo giro, funzioni pure di scripts/fetch_vix.js (6fc67a1) sui dati veri: plausible() su tutta la storia di Cboe,
// salti veri, date ripetute, mergeTail/lastSource; formato del rapporto vicino a 1 (fr della vista) su data/vix.json.
// Uso: WT=<copia di lavoro> CACHE=<risposte registrate da mock_run.mjs> node casi_puri2.mjs
import fs from 'node:fs';
import path from 'node:path';
const { WT, CACHE } = process.env;
const F = await import(path.join(WT, 'scripts/fetch_vix.js'));
const { fmt } = await import(path.join(WT, 'js/format.js'));
const V = await import(path.join(WT, 'js/vix.js'));
let n = 0, fail = 0; const ok = (c, m) => { n++; if (!c) fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1. plausible su tutta la storia: ogni seduta di Cboe trattata come provvisoria (fredLast = prima data)
for (const sym of ['VIX', 'VIX3M']) {
  const s = F.parseCboe(fs.readFileSync(path.join(CACHE, `cboe_${sym}.csv`), 'utf8'));
  const q = F.plausible(s.val[0], s, s.dates[0]);
  let mx = [0, ''], mn = [9, ''];
  for (let i = 1; i < s.val.length; i++) { const k = s.val[i] / s.val[i - 1]; if (k > mx[0]) mx = [k, s.dates[i]]; if (k < mn[0]) mn = [k, s.dates[i]]; }
  ok(q.dropped.length === 0, `${sym} Cboe ${s.dates[0]}→${s.dates.at(-1)} (${s.dates.length} sedute): scartate ${q.dropped.length} [${q.dropped.slice(0, 5)}]; salto max ×${mx[0].toFixed(3)} il ${mx[1]}, min ×${mn[0].toFixed(3)} il ${mn[1]}`);
}
// 05/02/2018: 17,31 → 37,32 come seduta provvisoria dopo l'ultimo FRED
{
  const q = F.plausible(17.31, { dates: ['2018-02-02', '2018-02-05', '2018-02-06'], val: [17.31, 37.32, 29.98] }, '2018-02-02');
  ok(eq(q.dates, ['2018-02-02', '2018-02-05', '2018-02-06']) && !q.dropped.length, `05/02/2018 (×2,16) tenuto: ${JSON.stringify(q)}`);
  const w = F.plausible(20, { dates: ['a', 'b', 'c'], val: [20, 60.01, 30] }, 'a');
  ok(eq(w.dates, ['a', 'c']) && eq(w.dropped, ['b 60.01']), `oltre ×3 scartato, la seduta dopo confrontata con l'ultima buona: ${JSON.stringify(w)}`);
  const x = F.plausible(20, { dates: ['a', 'b'], val: [20, 60] }, 'a');
  ok(eq(x.dates, ['a', 'b']), `esattamente ×3 tenuto (soglia «più del triplo»): ${JSON.stringify(x.dates)}`);
  const y = F.plausible(20, { dates: ['b'], val: [6.6] }, 'a');
  ok(eq(y.dates, []), `6,6 su 20 (sotto un terzo, 6,67): scartato ${JSON.stringify(y)}`);
  const y2 = F.plausible(20, { dates: ['b'], val: [6.7] }, 'a');
  ok(eq(y2.dates, ['b']), `6,7 su 20 (sopra un terzo): tenuto ${JSON.stringify(y2)}`);
  const z = F.plausible(20, { dates: ['b'], val: [6.5] }, 'a');
  ok(eq(z.dates, []), `6,5 su 20 (sotto un terzo) scartato: ${JSON.stringify(z)}`);
  const u = F.plausible(20, { dates: ['0', 'a', 'b'], val: [900, 21, 22] }, 'a');
  ok(eq(u.dates, ['0', 'a', 'b']), `date ≤ fredLast non controllate (le sostituisce FRED in splice): ${JSON.stringify(u)}`);
}
// 2. parseCboe con date ripetute, in mezzo e in fondo
ok(eq(F.parseCboe('DATE,CLOSE\n11/05/2026,28.18\n11/06/2026,25\n11/06/2026,25.64\n'), { dates: ['2026-11-05', '2026-11-06'], val: [28.18, 25.64] }), 'data ripetuta in fondo: una sola, ultima riga');
ok(eq(F.parseCboe('DATE,CLOSE\n11/05/2026,28.18\n11/05/2026,28.18\n11/06/2026,25.64\n'), { dates: ['2026-11-05', '2026-11-06'], val: [28.18, 25.64] }), 'data ripetuta in mezzo: una sola');
ok(eq(F.parseCboe('DATE,CLOSE\n11/06/2026,25.64\n11/05/2026,28.18\n'), { dates: ['2026-11-05', '2026-11-06'], val: [28.18, 25.64] }), 'righe in disordine: ordinate');
// 3. mergeTail e lastSource
ok(eq(F.mergeTail({ dates: [], val: [] }, null), null), 'mergeTail(Cboe vuoto, nessun Yahoo) = null (si passa alla coda pubblicata)');
ok(F.lastSource(['a', 'b'], 'c', null) === 'FRED', 'lastSource: ultima ≤ FRED → FRED');
ok(F.lastSource([], 'c', null) === 'FRED', 'lastSource: serie vuota → FRED');
// 4. formato del rapporto vicino a 1 sui valori veri
{
  const j = JSON.parse(fs.readFileSync(path.join(WT, 'data/vix.json'), 'utf8'));
  const vix = V.vxSeries(j.series.VIX), v3 = V.vxSeries(j.series.VIX3M), m = new Map(v3.dates.map((d, i) => [d, v3.val[i]]));
  const fr = (r) => fmt(r, Math.abs(r - 1) < 0.005 ? 3 : 2); // copia di js/vix-view.js, riga 81
  const bad = [], three = [];
  vix.dates.forEach((d, i) => { const b = m.get(d); if (!b) return; const r = vix.val[i] / b, s = fr(r); if (Math.abs(r - 1) < 0.005) three.push(`${d} ${s}`); if ((r < 1 && /^1,0+$/.test(s)) || (r >= 1 && /^0,9/.test(s))) bad.push(`${d} ${r} ${s}`); });
  ok(bad.length === 0, `rapporti < 1 che si leggono «1,00…» o ≥ 1 che si leggono «0,9…»: ${bad.length} [${bad.slice(0, 5)}]; con tre decimali ${three.length} sedute (es. ${three.filter((x) => /2026-03-13/.test(x))})`);
  // con la regola della 1.6.0 prima della correzione (sempre 2 decimali)
  let old = 0; vix.dates.forEach((d, i) => { const b = m.get(d); if (b && vix.val[i] / b < 1 && fmt(vix.val[i] / b, 2) === '1,00') old++; });
  console.log(`   (controllo che può fallire) con 2 decimali fissi: ${old} sedute < 1 lette «1,00»`);
  // casi limite sintetici
  for (const r of [0.9995, 0.99951, 0.99999, 0.995, 0.99499, 1.0049, 1.005]) console.log(`   fr(${r}) = ${fr(r)} ${r >= 1 ? 'backwardation' : 'contango'}`);
}
console.log(`\n${n} controlli, ${fail} FAIL`);
