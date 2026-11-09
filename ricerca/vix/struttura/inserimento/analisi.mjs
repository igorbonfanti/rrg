#!/usr/bin/env node
/*
 * analisi.mjs — numeri che servono al PIANO di inserimento (non sono statistiche da mostrare nell'app):
 * copertura delle serie nuove rispetto alle sedute dell'S&P 500 di data/vix.json, festività diverse, peso del file
 * con le serie nuove (formato di pack() di scripts/fetch_emerging.js), casi limite per il disegno (prima seduta, quota di
 * sedute in backwardation solo per dimensionare le zone del grafico). Scrive risultati/analisi.json e stampa un riepilogo.
 * Le statistiche da mostrare (se si mostreranno) le decide e le calcola l'agente del backtest (ricerca/vix/struttura/backtest/).
 * Uso: node ricerca/vix/struttura/inserimento/analisi.mjs   (dopo scarica.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { pack } from '../../../../scripts/fetch_emerging.js';
import { decodeDates, deltaDecode } from '../../../../js/indexdata.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const C = (f) => path.join(HERE, 'cache', f);
const fred = (id) => {
  const dates = [], val = [], dots = [];
  for (const l of fs.readFileSync(C(`${id}.csv`), 'utf8').trim().split(/\r?\n/).slice(1)) {
    const [d, v] = l.split(',');
    if (v === '' || v === '.') { dots.push(d); continue; }
    dates.push(d); val.push(+v);
  }
  return { dates, val, dots };
};
const app = JSON.parse(fs.readFileSync(C('app_vix.json'), 'utf8'));
const dec = (x) => ({ dates: decodeDates(x.d0, x.gaps), val: deltaDecode(x.cd, x.ps || 1) });
const SPX = dec(app.series.SPX), VIXa = dec(app.series.VIX);
const S = new Set(SPX.dates), out = {};

for (const id of ['VIXCLS', 'VXVCLS', 'BAA10Y', 'BAMLH0A0HYM2']) {
  const s = fred(id), first = s.dates[0], last = s.dates.at(-1);
  const sess = SPX.dates.filter((d) => d >= first && d <= last);
  const have = new Set(s.dates);
  const missing = sess.filter((d) => !have.has(d));
  const extra = s.dates.filter((d) => !S.has(d) && d <= SPX.dates.at(-1));
  out[id] = { first, last, n: s.dates.length, dots: s.dots.length, spxSessions: sess.length, spxSessionsWithout: missing.length, missingSample: missing.slice(-12), notSpxSession: extra.length, notSpxSample: extra.slice(-8) };
}
// mesi/giorni tipici dei buchi del credito (feste del mercato dei titoli di Stato, aperto il NYSE)
const md = (d) => d.slice(5);
const baaMiss = (() => { const s = fred('BAA10Y'), h = new Set(s.dates); return SPX.dates.filter((d) => d >= s.dates[0] && !h.has(d)); })();
const byMD = {}; for (const d of baaMiss) { const k = md(d).slice(0, 2); byMD[k] = (byMD[k] || 0) + 1; }
out.BAA10Y.missingByMonth = byMD;

// sedute S&P 500 con VIX ma senza VIX3M (dal 2007-12-04) e viceversa
const vxv = fred('VXVCLS'), mV = new Map(vxv.dates.map((d, i) => [d, vxv.val[i]]));
const mX = new Map(VIXa.dates.map((d, i) => [d, VIXa.val[i]]));
const from = vxv.dates[0];
const sessV = SPX.dates.filter((d) => d >= from);
const R = sessV.map((d) => (mX.has(d) && mV.has(d) ? mX.get(d) / mV.get(d) : null));
out.ratio = {
  from, sessions: sessV.length, withR: R.filter((x) => x != null).length,
  vixNoVxv: sessV.filter((d) => mX.has(d) && !mV.has(d)), vxvNoVix: sessV.filter((d) => !mX.has(d) && mV.has(d)),
  backwardationShare: R.filter((x) => x != null && x >= 1).length / R.filter((x) => x != null).length,
  last: { date: sessV.at(-1), vix: mX.get(sessV.at(-1)), vxv: mV.get(sessV.at(-1)), r: R.at(-1) },
  max: (() => { let b = -1, at = null; R.forEach((x, i) => { if (x != null && x > b) { b = x; at = sessV[i]; } }); return { r: b, date: at }; })(),
  min: (() => { let b = 9, at = null; R.forEach((x, i) => { if (x != null && x < b) { b = x; at = sessV[i]; } }); return { r: b, date: at }; })(),
};
// tratti di backwardation (sedute consecutive con R ≥ 1): quanti e quanto lunghi, per le zone del grafico
const runs = []; let s0 = null;
R.forEach((x, i) => { if (x != null && x >= 1) { if (s0 == null) s0 = i; } else if (s0 != null) { runs.push(i - s0); s0 = null; } });
if (s0 != null) runs.push(R.length - s0);
runs.sort((a, b) => a - b);
out.ratio.runs = { n: runs.length, single: runs.filter((x) => x === 1).length, median: runs[Math.floor(runs.length / 2)], max: runs.at(-1) };

// peso del file: serie nuove nel formato dell'app (solo sedute dell'S&P 500), con ps 10000 (default di pack) e ps 100
const onS = (s, since) => { const d = [], v = []; s.dates.forEach((x, i) => { if (S.has(x) && x >= since) { d.push(x); v.push(s.val[i]); } }); return { d, v }; };
const sz = (o) => Buffer.byteLength(JSON.stringify(o));
const gz = (o) => zlib.gzipSync(JSON.stringify(o)).length;
const size = {};
for (const [id, since] of [['VXVCLS', '2007-12-04'], ['BAA10Y', '1990-01-02'], ['BAMLH0A0HYM2', '2000-01-01']]) {
  const { d, v } = onS(fred(id), since);
  const a = { ...pack(d, v), last: d.at(-1) }, b = { ...pack(d, v, 100), last: d.at(-1) };
  size[id] = { rows: d.length, bytes_ps10000: sz(a), bytes_ps100: sz(b) };
}
const now = JSON.parse(fs.readFileSync(C('app_vix.json'), 'utf8'));
size.file_oggi = { bytes: sz(now), gzip: gz(now) };
const plus = JSON.parse(JSON.stringify(now));
{ const a = onS(fred('VXVCLS'), '2007-12-04'), b = onS(fred('BAA10Y'), '1990-01-02'); plus.series.VIX3M = { ...pack(a.d, a.v, 100), last: a.d.at(-1), fred: a.d.at(-1) }; plus.series.BAA10Y = { ...pack(b.d, b.v, 100), last: b.d.at(-1) }; }
size.file_con_VIX3M_BAA10Y = { bytes: sz(plus), gzip: gz(plus) };
out.size = size;

fs.mkdirSync(path.join(HERE, 'risultati'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'risultati/analisi.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
