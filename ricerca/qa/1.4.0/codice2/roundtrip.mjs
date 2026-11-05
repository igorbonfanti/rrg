// roundtrip.mjs — formato compatto con i dati veri: ogni serie di data/emerging.json decodificata contro le risposte
// grezze di FRED e Yahoo registrate da mock_fetch.mjs (MOCK=rec). Controlla date, valori, errore massimo di arrotondamento,
// e che pack() + emSeries() riproducano esattamente i valori arrotondati.
// Uso: node roundtrip.mjs <emerging.json> <cartella cache>
import fs from 'node:fs';
import path from 'node:path';
import { emSeries } from '../../../../js/emerging.js';
import { pack } from '../../../../scripts/fetch_emerging.js';
import { parseFredDaily } from '../../../../scripts/fetch_data.js';
import { parse } from '../../../../scripts/lib/yahoo.js';

const [file, cache] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const cfg = JSON.parse(fs.readFileSync(new URL('../../../../config/emerging.json', import.meta.url), 'utf8'));
const fedOf = Object.fromEntries(Object.values(cfg.indices).filter((x) => x.fx).map((x) => [x.fx, x.fxFred]));
let checks = 0, fails = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('  FALLITO:', msg); } };
const yahoo = (sym, tail) => {
  const f = path.join(cache, `yahoo_${sym.replace(/[^\w]/g, '_')}_${tail ? 'tail' : 'long'}.txt`);
  return fs.existsSync(f) ? parse(JSON.parse(fs.readFileSync(f, 'utf8')).chart.result[0], { dropStale: !tail }) : null;
};
for (const [sym, x] of Object.entries(j.series)) {
  const s = emSeries(x), ps = x.ps || 1;
  // 1. andata e ritorno del formato: pack dei valori decodificati = stessa serie
  const re = pack(s.dates, s.val);
  ok(JSON.stringify({ d0: re.d0, gaps: re.gaps, cd: re.cd, ps: re.ps }) === JSON.stringify({ d0: x.d0, gaps: x.gaps, cd: x.cd, ps: x.ps }), `${sym}: pack(decodifica) diverso`);
  ok(s.dates.at(-1) === x.last, `${sym}: last`);
  // 2. contro la fonte
  let maxRel = 0, n = 0, missing = 0;
  const cmp = (dates, vals, from, to) => {
    const m = new Map(dates.map((d, i) => [d, vals[i]]));
    s.dates.forEach((d, i) => {
      if (d < from || d > to) return;
      if (!m.has(d)) { missing++; return; }
      const v = m.get(d), err = Math.abs(s.val[i] - v);
      ok(err <= 0.5 / ps + 1e-9, `${sym} ${d}: ${s.val[i]} contro ${v}`);
      maxRel = Math.max(maxRel, err / v); n++;
    });
    // nessuna data della fonte persa dentro l'intervallo
    const have = new Set(s.dates);
    const lost = dates.filter((d, i) => d >= from && d <= to && vals[i] > 0 && !have.has(d));
    ok(lost.length === 0, `${sym}: ${lost.length} date della fonte perse (${lost.slice(0, 3)})`);
  };
  if (fedOf[sym]) {
    const f = parseFredDaily(fs.readFileSync(path.join(cache, `fred_${fedOf[sym]}.txt`), 'utf8'));
    cmp(f.dates, f.val, x.d0, x.fred);
    ok(f.dates.at(-1) === x.fred, `${sym}: fred ${x.fred} contro ultima data Fed ${f.dates.at(-1)}`);
    const t = yahoo(sym, true);
    if (t) cmp(t.dates, t.close, x.fred + 'z', x.last);
  } else if (sym === cfg.fred) {
    const f = parseFredDaily(fs.readFileSync(path.join(cache, `fred_${sym}.txt`), 'utf8'));
    cmp(f.dates, f.val, x.d0, x.last);
  } else {
    const y = yahoo(sym, false);
    if (y) cmp(y.dates, y.adjclose, x.d0, x.last);
  }
  console.log(`${sym.padEnd(11)} ps=${ps} righe=${s.dates.length} confrontate=${n} errore relativo massimo=${maxRel.toExponential(2)}${missing ? ` date non nella fonte=${missing}` : ''}`);
}
console.log(`${checks} controlli, ${fails} falliti`);
