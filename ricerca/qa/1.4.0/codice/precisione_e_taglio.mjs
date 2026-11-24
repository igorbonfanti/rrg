// (1) andata e ritorno del formato compatto sui dati veri di Yahoo/FRED (pack → emSeries) e errore di arrotondamento;
// (2) effetto dell'arrotondamento (ps) e del taglio dopo l'ultimo buco oltre 35 giorni su z, F, D: confronto con la serie
//     grezza intera, sulle date comuni. Uso: node precisione_e_taglio.mjs <worktree>
const W = process.argv[2].replace(/\/?$/, '/');
const { fetchDaily } = await import(W + 'scripts/lib/yahoo.js');
const { fetchFred, parseFredDaily } = await import(W + 'scripts/fetch_data.js');
const { pack, lastLongGap } = await import(W + 'scripts/fetch_emerging.js');
const E = await import(W + 'js/emerging.js');
const P1 = Math.floor(Date.parse('2003-01-01') / 1000);
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('  NO:', msg); } };
for (const sym of ['CNY=X', 'INR=X', 'BRL=X', 'KRW=X', 'TWD=X', 'HKD=X', 'EWZ', 'ACWI', 'DTWEXEMEGS']) {
  let dates = [], v = [];
  if (sym === 'DTWEXEMEGS') { const f = await fetchFred(sym, '2006-01-01', parseFredDaily); dates = f.dates; v = f.val; }
  else { const d = await fetchDaily(sym, { period1: P1, raw: sym.endsWith('=X'), dropStale: !sym.endsWith('=X') }); const a = sym.endsWith('=X') ? d.close : d.adjclose; d.dates.forEach((x, i) => { if (a[i] != null && a[i] > 0) { dates.push(x); v.push(a[i]); } }); }
  const cut = lastLongGap(dates), dc = dates.slice(cut), vc = v.slice(cut);
  const p = pack(dc, vc), back = E.emSeries(p);
  ok(JSON.stringify(back.dates) === JSON.stringify(dc), `${sym} date`);
  let maxRel = 0, maxAbs = 0; vc.forEach((x, i) => { maxRel = Math.max(maxRel, Math.abs(back.val[i] / x - 1)); maxAbs = Math.max(maxAbs, Math.abs(back.val[i] - x)); });
  ok(maxAbs <= 0.5 / p.ps + 1e-9, `${sym} errore ${maxAbs} oltre mezzo passo`);
  // andata e ritorno esatta del pacchetto (pack(emSeries(pack)) = pack)
  ok(JSON.stringify(pack(back.dates, back.val)) === JSON.stringify(p), `${sym} secondo giro diverso`);
  let line = `${sym.padEnd(11)} ps ${p.ps} max err ass ${maxAbs.toExponential(2)} rel ${maxRel.toExponential(2)} taglio a ${dates[cut]} (${cut} righe tolte su ${dates.length})`;
  if (sym.endsWith('=X')) {
    const full = E.cleanFx(sym, { dates, val: v }), app = E.cleanFx(sym, back), sf = E.fxSignals(full), sa = E.fxSignals(app);
    const at = new Map(full.dates.map((d, i) => [d, i]));
    let dF = 0, dZ = 0, nF = 0, firstDiff = null, lastDiff = null;
    app.dates.forEach((d, j) => { const i = at.get(d); if (i == null) return; if (sa.F[j] != null || sf.F[i] != null) { nF++; if (sa.F[j] !== sf.F[i]) { dF++; firstDiff ??= d; lastDiff = d; } } if (sa.z[j] != null && sf.z[i] != null && Math.abs(sa.z[j] - sf.z[i]) > 1e-3) dZ++; });
    line += ` | F diverse ${dF}/${nF} (${firstDiff || '-'}…${lastDiff || '-'}), z oltre 1e-3: ${dZ}, F ultimo app ${sa.F.at(-1)} grezzo ${sf.F.at(-1)}`;
    ok(sa.F.at(-1) === sf.F.at(-1), `${sym} F all'ultima seduta`);
    ok(!lastDiff || lastDiff < '2016-01-01', `${sym} F diverse anche dopo il 2016 (${lastDiff})`);
  }
  if (sym === 'DTWEXEMEGS') { const a = E.dollarSignals(E.plain(sym, back)).D, b = E.dollarSignals(E.plain(sym, { dates: dc, val: vc })).D; const dd = a.filter((x, i) => x !== b[i]).length; line += ` | D diverse ${dd}/${a.length}`; ok(dd === 0, 'D'); }
  console.log(line);
}
console.log(`CONTROLLI ${checks}, falliti ${fails}`);
