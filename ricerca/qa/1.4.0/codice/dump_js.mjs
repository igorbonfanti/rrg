// Calcola con js/emerging.js (copia di lavoro al commit afc06f3) z, F, D, SMA e forza relativa da data/emerging.json e li salva
// per il confronto indipendente (ricalcolo_indipendente.py). Uso: node dump_js.mjs <worktree> <out.json>
import fs from 'node:fs';
const W = process.argv[2].replace(/\/?$/, '/');
const E = await import(W + 'js/emerging.js');
const D = JSON.parse(fs.readFileSync(W + 'data/emerging.json'));
const CFG = JSON.parse(fs.readFileSync(W + 'config/emerging.json'));
const out = { fx: {}, dollar: null, rs: {} };
for (const k of CFG.order) {
  const c = CFG.indices[k];
  if (c.fx) { const S = E.cleanFx(c.fx, E.emSeries(D.series[c.fx])); const g = E.fxSignals(S); out.fx[c.fx] = { dates: S.dates, val: S.val, removed: S.removed, z: g.z, F: g.F, sd: g.sd }; }
  const r = E.relStrength(E.emSeries(D.series[c.etf]), E.emSeries(D.series[CFG.benchmark]));
  out.rs[c.etf] = r;
}
const S = E.plain(CFG.fred, E.emSeries(D.series[CFG.fred])), g = E.dollarSignals(S);
out.dollar = { dates: S.dates, val: S.val, D: g.D, sma: g.sma, ch: g.ch };
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.log('ok', Object.keys(out.fx).join(' '));
