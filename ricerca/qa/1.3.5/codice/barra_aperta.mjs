// barra_aperta.mjs — ramo senza orario di contrattazione (meta ridotto) e fillLast: per ogni risposta grezza chart 5y
// si toglie currentTradingPeriod e si lancia parse, vecchio e nuovo, con «adesso» ogni 30 minuti nelle 72 ore dopo
// l'ultima barra (con e senza fillLast). Si confrontano solo le ultime 5 date (la storia è già in verita.py).
// Uso: node barra_aperta.mjs <dir_raw>
import fs from 'node:fs';
import path from 'node:path';
import * as NEW from '../../../../scripts/lib/yahoo.js';
import * as OLD from '../../date-barre/yahoo_prima.js';
const RAW = process.argv[2];
let cases = 0, diff = 0;
const out = [];
for (const f of fs.readdirSync(RAW).filter((x) => x.startsWith('5y_'))) {
  const res = JSON.parse(fs.readFileSync(path.join(RAW, f))).chart.result[0];
  const { currentTradingPeriod, ...meta } = res.meta;
  for (const r of [res, { ...res, meta }]) {
    const last = r.timestamp.at(-1);
    for (let k = 0; k <= 144; k++) for (const fillLast of [false, true]) {
      const nowSec = last + k * 1800;
      const a = NEW.parse(r, { nowSec, fillLast }), b = OLD.parse(r, { nowSec, fillLast });
      cases++;
      if (JSON.stringify(a.dates.slice(-5)) !== JSON.stringify(b.dates.slice(-5)) || a.close.at(-1) !== b.close.at(-1)) {
        diff++;
        if (out.length < 30) out.push(`${f} ${r === res ? 'con orario' : 'senza orario'} adesso=${new Date(nowSec * 1000).toISOString()} fillLast=${fillLast}: nuovo ${a.dates.slice(-2)} vecchio ${b.dates.slice(-2)}`);
      }
    }
  }
}
console.log(`${cases} casi, ${diff} con ultime date o ultima chiusura diverse`);
console.log(out.join('\n'));
