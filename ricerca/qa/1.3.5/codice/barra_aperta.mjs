// barra_aperta.mjs — ramo senza orario di contrattazione (meta ridotto) e fillLast: per ogni risposta grezza chart 5y
// si toglie currentTradingPeriod e si lancia parse, vecchio e nuovo, con «adesso» ogni 30 minuti nelle 72 ore dopo
// l'ultima barra (con e senza fillLast). Si confrontano le ultime 2 date e l'ultima chiusura (la storia è già in verita.py; il 1°/11 New York è passata all'ora solare, quindi la quintultima barra di DX-Y.NYB e dei futures cambia già per la correzione).
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
      if (JSON.stringify(a.dates.slice(-2)) !== JSON.stringify(b.dates.slice(-2)) || a.close.at(-1) !== b.close.at(-1)) {
        diff++;
        if (out.length < 30) out.push(`${f} ${r === res ? 'con orario' : 'senza orario'} adesso=${new Date(nowSec * 1000).toISOString()} fillLast=${fillLast}: nuovo ${a.dates.slice(-2)} vecchio ${b.dates.slice(-2)}`);
      }
    }
  }
}
console.log(`${cases} casi, ${diff} con ultime date o ultima chiusura diverse`);
console.log(out.join('\n'));

// stessa prova «d'estate»: risposta tagliata al 15/07/2026, gmtoffset estivo, senza orario, regularMarketTime 8 ore dopo l'ultima barra
let c2 = 0, d2 = 0;
const out2 = [];
const offsetAt = (tz, ms) => { const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(ms).find((x) => x.type === 'timeZoneName').value; const m = /GMT([+-])(\d\d):(\d\d)/.exec(p); return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 3600 + +m[3] * 60) : 0; };
const CUT = Date.parse('2026-07-15T00:00:00Z') / 1000;
for (const f of fs.readdirSync(RAW).filter((x) => x.startsWith('5y_'))) {
  const res = JSON.parse(fs.readFileSync(path.join(RAW, f))).chart.result[0];
  const n = res.timestamp.filter((t) => t < CUT).length;
  const cut = (a) => (a ? a.slice(0, n) : a);
  const q = res.indicators.quote[0];
  const { currentTradingPeriod, ...meta } = res.meta;
  const last = res.timestamp[n - 1];
  const r = {
    meta: { ...meta, gmtoffset: offsetAt(meta.exchangeTimezoneName, CUT * 1000), regularMarketTime: last + 8 * 3600, regularMarketPrice: 1 },
    timestamp: res.timestamp.slice(0, n),
    indicators: { quote: [{ close: [...cut(q.close).slice(0, -1), null], high: cut(q.high) }], adjclose: res.indicators.adjclose ? [{ adjclose: [...cut(res.indicators.adjclose[0].adjclose).slice(0, -1), null] }] : undefined },
  };
  for (let k = 0; k <= 144; k++) for (const fillLast of [false, true]) {
    const nowSec = last + k * 1800;
    const a = NEW.parse(r, { nowSec, fillLast }), b = OLD.parse(r, { nowSec, fillLast });
    c2++;
    if (JSON.stringify(a.dates.slice(-2)) !== JSON.stringify(b.dates.slice(-2)) || a.close.at(-1) !== b.close.at(-1)) {
      d2++;
      if (out2.length < 10) out2.push(`${f} estate adesso=${new Date(nowSec * 1000).toISOString()} fillLast=${fillLast}: nuovo ${a.dates.slice(-2)} vecchio ${b.dates.slice(-2)}`);
    }
  }
}
console.log(`estate: ${c2} casi, ${d2} con ultime date o ultima chiusura diverse`);
console.log(out2.join('\n'));
