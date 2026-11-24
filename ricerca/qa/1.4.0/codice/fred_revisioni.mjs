// DTWEXEMEGS viene rivista? D (dollaro favorevole) calcolato sulla serie pubblicata in una data passata (ALFRED, vintage)
// e sulla serie di oggi, sulle stesse date. Uso: node fred_revisioni.mjs <worktree> 2025-01-06 2026-01-05 ...
const W = process.argv[2].replace(/\/?$/, '/');
const E = await import(W + 'js/emerging.js');
const { parseFredDaily } = await import(W + 'scripts/fetch_data.js');
const get = async (u) => parseFredDaily(await (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor qa)' } })).text());
const now = await get('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DTWEXEMEGS&cosd=2006-01-01');
const Dn = E.dollarSignals(E.plain('x', { dates: now.dates, val: now.val })).D, at = new Map(now.dates.map((d, i) => [d, i]));
for (const v of process.argv.slice(3)) {
  const old = await get(`https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=DTWEXEMEGS&vintage_date=${v}&cosd=2006-01-01`);
  const Do = E.dollarSignals(E.plain('x', { dates: old.dates, val: old.val })).D;
  let diff = 0, tot = 0, maxRel = 0, lastDiff = null, dLast = 0;
  old.dates.forEach((d, i) => { const j = at.get(d); if (j == null) return; maxRel = Math.max(maxRel, Math.abs(old.val[i] / now.val[j] - 1)); if (Do[i] == null || Dn[j] == null) return; tot++; if (Do[i] !== Dn[j]) { diff++; lastDiff = d; if (i >= old.dates.length - 260) dLast++; } });
  console.log(`vintage ${v} (ultimo dato ${old.dates.at(-1)}): valori diversi fino al ${(maxRel * 100).toFixed(2)}%; D diverso in ${diff} sedute su ${tot} (ultimo anno: ${dLast}), ultima differenza ${lastDiff}; D all'ultima seduta allora ${Do.at(-1)}, oggi per la stessa data ${Dn[at.get(old.dates.at(-1))]}`);
}
