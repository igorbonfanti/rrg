#!/usr/bin/env node
/*
 * dati.mjs — dati del prototipo (solo per le immagini della nota, non è l'app): chiusure dal 2000 dalla cache di
 * ricerca/poc/cache/ (parse di scripts/lib/yahoo.js, come scripts/fetch_ath.js), statistiche con athStats (js/ath.js) e
 * profilo dei volumi da ../profilo_app.json (scritto da ../analisi.mjs). Scrive prototipo/dati.json.
 * Uso: node ricerca/poc/profilo/prototipo/dati.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../../../scripts/lib/yahoo.js';
import { athStats } from '../../../../js/ath.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '..', '..', 'cache');
const VP = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'profilo_app.json'), 'utf-8')).profiles;
const daily = (sym) => { const j = JSON.parse(fs.readFileSync(path.join(CACHE, `d_${sym.replace(/[^A-Za-z0-9.-]/g, '_')}.json`), 'utf-8')); return parse(j.res, { nowSec: Date.parse(j.fetched) / 1000 }); };
const M = [
  { id: 'SPX', label: 'S&P 500', symbol: '^GSPC', kind: 'indice, solo prezzo', volText: 'ETF SPY riportato sulla scala dell\'indice' },
  { id: 'GOLD', label: 'Oro', symbol: 'GC=F', kind: 'future continuo', volText: 'future GC=F' },
  { id: 'WTI', label: 'Petrolio WTI', symbol: 'CL=F', kind: 'future continuo', volText: 'future CL=F' },
];
const out = [];
for (const m of M) {
  const s = daily(m.symbol), st = athStats(s.dates, s.close, s.high);
  const i0 = s.dates.findIndex((d) => d >= '2000-01-01');
  out.push({ ...m, stats: st, dates: s.dates.slice(i0), close: s.close.slice(i0).map((v) => Math.round(v * 10000) / 10000), vp: VP[m.id] });
  console.log(m.id, s.dates.at(-1), 'massimo 3 anni', st.ref, st.refDate, 'profilo', VP[m.id].from, VP[m.id].to);
}
fs.writeFileSync(path.join(HERE, 'dati.json'), JSON.stringify(out));
