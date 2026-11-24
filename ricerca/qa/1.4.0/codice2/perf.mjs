import fs from 'node:fs';
const D = process.argv[2];
const m = await import(D + '/js/emerging.js');
const em = JSON.parse(fs.readFileSync(D + '/data/emerging.json', 'utf8'));
const cfg = JSON.parse(fs.readFileSync(D + '/config/emerging.json', 'utf8'));
const t0 = performance.now();
const S = (s) => m.emSeries(em.series[s]);
const dl = m.plain('D', S(cfg.fred)); m.dollarSignals(dl);
for (const k of cfg.order) { const c = cfg.indices[k]; if (c.fx) m.fxSignals(m.cleanFx(c.fx, S(c.fx))); m.relStrength(S(c.etf), S(cfg.benchmark)); }
console.log('build:', (performance.now() - t0).toFixed(0), 'ms');
