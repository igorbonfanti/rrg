// Ricalcolo indipendente dei riquadri «VIX / VIX3M» e «Credito high yield» dalle fonti originali (src/) e confronto
// con data/vix.json. Uso: node ricalcolo.mjs [percorso di vix.json]   (scrive ricalcolo.json)
import fs from 'node:fs';
import path from 'node:path';
import { HERE, fredCsv, cboeCsv, yahoo, decodeFile, pctAt, ddAt, chAt } from './lib.mjs';

const FILE = process.argv[2] || path.join(HERE, '../../../../data/vix.json');
const J = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const out = { file: FILE, asOf: J.asOf };

// sedute: Yahoo ^GSPC (dal 2007)
const gspc = yahoo('y_%5EGSPC.json');
const sessions = [...gspc.keys()].sort();
const sesSet = new Set(sessions);

// VIX e VIX3M: FRED, poi Cboe dopo l'ultima data di FRED
function vol(fredF, cboeF) {
  const fr = fredCsv(fredF), cb = cboeCsv(cboeF);
  const fredLast = [...fr.keys()].sort().at(-1);
  const m = new Map();
  for (const d of sessions) { if (fr.has(d)) m.set(d, fr.get(d)); else if (d > fredLast && cb.has(d)) m.set(d, cb.get(d)); }
  return { m, fredLast, fr, cb };
}
const VIX = vol('VIXCLS.csv', 'VIX_History.csv'), V3 = vol('VXVCLS.csv', 'VIX3M_History.csv');
out.fredLast = { vix: VIX.fredLast, vix3m: V3.fredLast };

// struttura a termine
const R = sessions.map((d) => (VIX.m.has(d) && V3.m.has(d) ? VIX.m.get(d) / V3.m.get(d) : null));
const rPct = R.map((x, i) => (x == null ? null : pctAt(R.slice(0, i + 1), 252)));
let tr = R.length - 1; while (R[tr] == null) tr--;
const lastVix = sessions.filter((d) => VIX.m.has(d)).at(-1);
out.term = { date: sessions[tr], vix: VIX.m.get(sessions[tr]), v3: V3.m.get(sessions[tr]), r: R[tr], state: R[tr] >= 1 ? 'backwardation' : 'contango', pct: rPct[tr],
  provisional: sessions[tr] > VIX.fredLast || sessions[tr] > V3.fredLast, sameDay: sessions[tr] === lastVix, firstR: sessions[R.findIndex((x) => x != null)] };

// credito
const hyg = yahoo('y_HYG.json', 'adjclose'), ief = yahoo('y_IEF.json', 'adjclose');
const C = sessions.map((d) => (hyg.has(d) && ief.has(d) ? hyg.get(d) / ief.get(d) : null));
const dd = C.map((x, i) => (x == null ? null : ddAt(C.slice(0, i + 1), 252)));
const ch = C.map((x, i) => (x == null ? null : chAt(C.slice(0, i + 1), 21)));
const negdd = dd.map((x) => (x == null ? null : -x));
const ddPct = negdd.map((x, i) => (x == null ? null : pctAt(negdd.slice(0, i + 1), 252)));
let tc = C.length - 1; while (dd[tc] == null) tc--;
out.credit = { date: sessions[tc], dd: dd[tc], ch: ch[tc], pct: ddPct[tc], firstC: sessions[C.findIndex((x) => x != null)], firstDD: sessions[dd.findIndex((x) => x != null)] };

// ---- confronto con il file ----
const F3 = decodeFile(J.series.VIX3M), FC = decodeFile(J.series.HYGIEF), FV = decodeFile(J.series.VIX), FS = decodeFile(J.series.SPX);
const cmp = (F, ref, tol) => { let n = 0, diff = [], notSes = [], missing = []; const fm = new Map(F.dates.map((d, i) => [d, F.val[i]]));
  F.dates.forEach((d, i) => { if (!sesSet.has(d) && d >= sessions[0]) notSes.push(d); if (ref.has(d)) { n++; if (Math.abs(F.val[i] - ref.get(d)) > tol(ref.get(d))) diff.push([d, F.val[i], ref.get(d)]); } else missing.push(['nel file, non nella fonte', d]); });
  for (const d of ref.keys()) if (!fm.has(d) && d >= F.dates[0]) missing.push(['nella fonte, non nel file', d]);
  return { n, diff: diff.length, diffEx: diff.slice(0, 10), notSes, missing: missing.slice(0, 20), missingN: missing.length }; };
out.file = {
  vix3m: { first: F3.dates[0], last: F3.dates.at(-1), n: F3.dates.length, fred: J.series.VIX3M.fred, last_field: J.series.VIX3M.last, ...cmp(F3, V3.m, () => 0.0051) },
  vix_tail: cmp({ dates: FV.dates.filter((d) => d >= '2007-12-04'), val: FV.val.slice(FV.dates.findIndex((d) => d >= '2007-12-04')) }, VIX.m, () => 0.0051),
  credit: { first: FC.dates[0], last: FC.dates.at(-1), n: FC.dates.length, last_field: J.series.HYGIEF.last, ...cmp(FC, new Map(sessions.map((d, i) => [d, C[i]]).filter((x) => x[1] != null)), (v) => 1e-5 * 0.51 + v * 1e-9) },
  spxSessionsNotInYahoo: FS.dates.filter((d) => d >= sessions[0] && !sesSet.has(d)),
  yahooSessionsNotInFile: sessions.filter((d) => !FS.dates.includes(d)),
};
// relative difference credit (level) file vs today
const fc = new Map(FC.dates.map((d, i) => [d, FC.val[i]]));
const rel = sessions.map((d, i) => (C[i] != null && fc.has(d) ? fc.get(d) / C[i] - 1 : null)).filter((x) => x != null);
out.file.credit.relDiffMinMax = [Math.min(...rel), Math.max(...rel)];
// Cboe contro FRED per il VIX3M (date comuni)
let n3 = 0, d3 = []; for (const [d, v] of V3.fr) if (V3.cb.has(d)) { n3++; if (Math.abs(V3.cb.get(d) - v) > 0.0051) d3.push([d, v, V3.cb.get(d)]); }
out.cboeVsFred3m = { common: n3, diff: d3.length, ex: d3.slice(0, 10), fredFirst: [...V3.fr.keys()].sort()[0], cboeFirst: [...V3.cb.keys()].sort()[0] };
// FRED fuori seduta
out.fredVxvOffSession = [...V3.fr.keys()].filter((d) => d >= sessions[0] && d <= sessions.at(-1) && !sesSet.has(d));
// sedute senza VIX3M (dopo l'inizio)
out.sessionsWithoutV3 = sessions.filter((d) => d >= '2007-12-04' && !V3.m.has(d));
// ricopiati: due valori uguali consecutivi nel file del VIX3M
out.repeats3m = F3.val.map((v, i) => (i && v === F3.val[i - 1] ? F3.dates[i] : null)).filter(Boolean);
out.repeatsC = FC.val.map((v, i) => (i && v === FC.val[i - 1] ? FC.dates[i] : null)).filter(Boolean);

// serie per i controlli nel browser
out.series = Object.fromEntries(sessions.map((d, i) => [d, { v3: V3.m.get(d) ?? null, r: R[i], rPct: rPct[i], dd: dd[i], ch: ch[i], ddPct: ddPct[i] }]));
fs.writeFileSync(path.join(HERE, 'ricalcolo.json'), JSON.stringify(out));
const { series, ...rest } = out;
console.log(JSON.stringify(rest, null, 1));
