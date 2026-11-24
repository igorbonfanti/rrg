// Analisi dei casi limite del disegno, sui valori attesi (attese.json): basi del «base 100», bande al bordo sinistro,
// bande «in calo forte» dove lo stato è «—», sedute senza cambio, bande di una seduta. Uso: node .../analisi.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const X = JSON.parse(fs.readFileSync(path.join(here, 'attese.json'), 'utf8'));
const CFG = JSON.parse(fs.readFileSync(path.join(here, '../../../../config/emerging.json'), 'utf8'));
const DAY = 86400000;
export function win(dates, range) {
  const t1 = Date.parse(dates.at(-1)), span = range === '3A' ? 3 : range === '10A' ? 10 : null;
  const t0 = span ? Math.max(Date.parse(dates[0]), t1 - span * 365.25 * DAY) : Date.parse(dates[0]);
  return { t0, t1, inWin: (d) => { const t = Date.parse(d); return t >= t0 && t <= t1; } };
}
const runs = (ds, on, inWin) => { const r = []; let s = null, p = null; ds.forEach((d, i) => { if (!inWin(d)) return; if (on[i]) { if (s == null) s = d; p = d; } else if (s != null) { r.push([s, p]); s = null; } }); if (s != null) r.push([s, p]); return r; };
for (const k of CFG.order) {
  const I = X.idx[k], c = CFG.indices[k];
  for (const range of ['3A', '10A', 'MAX']) {
    const { t0, inWin } = win(I.dates, range);
    const i0 = I.dates.findIndex(inWin), msg = [];
    // base 100: prima seduta del periodo con un valore, in locale e in dollari
    if (I.fx && c.fx) {
      const fm = new Map(I.fx.dates.map((d, i) => [d, I.fx.val[i]]));
      const usd = I.dates.map((d, i) => (fm.get(d) ? I.close[i] / fm.get(d) : null));
      const bU = usd.findIndex((v, i) => i >= i0 && v != null);
      if (bU !== i0) msg.push(`base in dollari al ${I.dates[bU]} invece che al ${I.dates[i0]} (prima seduta del periodo; ${bU - i0} sedute dopo)`);
      const miss = I.dates.filter((d, i) => i >= i0 && !fm.has(d)).length;
      msg.push(`sedute dell'indice senza cambio nel periodo: ${miss} su ${I.dates.length - i0}`);
    }
    // bande al bordo sinistro
    const blueOn = I.days.map((s) => s === 'setup' || s === 'fail');
    if (i0 > 0 && blueOn[i0] && blueOn[i0 - 1]) msg.push(`zona blu già in corso prima del ${I.dates[i0]} (bordo sinistro)`);
    if (I.fx && !c.peg) {
      const fd = I.fx.dates, j0 = fd.findIndex(inWin);
      const calo = I.fx.z.map((z, i) => z != null && z >= 1 && !I.fx.F[i]), ferma = I.fx.F.map((v) => v === 1);
      if (j0 > 0 && calo[j0] && calo[j0 - 1]) msg.push(`banda «in calo forte» già in corso prima del ${fd[j0]}`);
      if (j0 > 0 && ferma[j0] && ferma[j0 - 1]) msg.push(`banda «ha smesso di scendere» già in corso prima del ${fd[j0]}`);
      const nullF = fd.filter((d, i) => inWin(d) && calo[i] && I.fx.F[i] == null);
      if (nullF.length) msg.push(`sedute con banda «in calo forte» ma F nullo (riquadro «—»): ${nullF.length}, dal ${nullF[0]} al ${nullF.at(-1)}`);
      const one = [...runs(fd, calo, inWin), ...runs(fd, ferma, inWin)].filter(([a, b]) => a === b);
      if (one.length) msg.push(`bande del cambio di una sola seduta (larghe 1 unità): ${one.length}`);
    }
    const dd = X.dl.dates, dj0 = dd.findIndex(inWin), Don = X.dl.D.map((v) => v === 1);
    if (dj0 > 0 && Don[dj0] && Don[dj0 - 1]) msg.push(`banda «dollaro favorevole» già in corso prima del ${dd[dj0]}`);
    const one = runs(I.dates, blueOn, inWin).filter(([a, b]) => a === b);
    if (one.length) msg.push(`zone blu di una sola seduta: ${one.length}`);
    console.log(`${k} ${range} (dal ${I.dates[i0]}):\n  - ${msg.join('\n  - ') || 'nessun caso limite'}`);
  }
}
