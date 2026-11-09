// File vix.json alterati per provare che i controlli possono fallire. Uso: node muta.mjs (scrive mut/*.json)
import fs from 'node:fs';
import path from 'node:path';
import { HERE, decodeFile } from './lib.mjs';
const J = JSON.parse(fs.readFileSync(path.join(HERE, '../../../../data/vix.json'), 'utf8'));
fs.mkdirSync(path.join(HERE, 'mut'), { recursive: true });
const w = (n, o) => fs.writeFileSync(path.join(HERE, 'mut', n), JSON.stringify(o));
const cl = () => JSON.parse(JSON.stringify(J));
// 1) ultimo VIX3M +0,40 (rapporto 1,02 invece di 1,04)
{ const o = cl(); o.series.VIX3M.cd[o.series.VIX3M.cd.length - 1] += 40; w('v3_ultimo.json', o); }
// 2) HYG/IEF della seduta 2015-06-18 −1% (cambia la distanza dal massimo mostrata in quella data)
{ const o = cl(), s = o.series.HYGIEF, F = decodeFile(s), i = F.dates.indexOf('2015-06-18'); const dv = Math.round(F.val[i] * 0.01 * s.ps); s.cd[i] -= dv; s.cd[i + 1] += dv; w('credito_storico.json', o); }
// 3) VIX3M senza l'ultima seduta (il riquadro deve mostrare «—» e il valore del giorno prima)
{ const o = cl(), s = o.series.VIX3M; const F = decodeFile(s); s.cd.pop(); s.gaps = s.gaps.slice(0, -1); s.last = F.dates.at(-2); s.fred = F.dates.at(-2); o.asOf.vix3m = s.last; o.asOf.fred3m = s.fred; w('v3_manca_ultima.json', o); }
console.log('scritti mut/v3_ultimo.json, mut/credito_storico.json, mut/v3_manca_ultima.json');
