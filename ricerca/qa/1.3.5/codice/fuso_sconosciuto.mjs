// fuso_sconosciuto.mjs — parse nuovo con un fuso che Intl non conosce, vuoto o alias: deve dare le date del codice vecchio
// (gmtoffset) o quelle giuste, senza eccezioni. Misura anche il tempo con un fuso sconosciuto (il formatter non si mette in cache).
import * as NEW from '../../../../scripts/lib/yahoo.js';
import * as OLD from '../../date-barre/yahoo_prima.js';
const T = (iso) => Date.parse(iso) / 1000;
const ts = Array.from({ length: 1300 }, (_, i) => T('2021-01-04T23:30:00Z') + i * 86400);
const res = (tz, off) => ({ meta: { gmtoffset: off, ...(tz !== undefined ? { exchangeTimezoneName: tz } : {}) }, timestamp: ts, indicators: { quote: [{ close: ts.map(() => 1) }] } });
const now = T('2026-11-05T12:00:00Z');
let ok = 0, n = 0;
for (const [tz, off] of [['Mars/Olympus', 3600], ['', 3600], [null, -18000], [undefined, 19800], ['Etc/Unknown', 0], [123, 3600]]) {
  n++;
  const t0 = performance.now();
  let a, err = null;
  try { a = NEW.parse(res(tz, off), { nowSec: now }).dates; } catch (e) { err = e.message; }
  const ms = (performance.now() - t0).toFixed(1);
  const b = OLD.parse(res(undefined, off), { nowSec: now }).dates;
  const same = !err && JSON.stringify(a) === JSON.stringify(b);
  if (same) ok++;
  console.log(`${JSON.stringify(tz)} gmtoffset ${off}: ${err ? 'ECCEZIONE ' + err : same ? 'uguale al vecchio' : 'DIVERSO'} (${ms} ms, ${a ? a.length : 0} barre)`);
}
for (const tz of ['Asia/Calcutta', 'Europe/Kiev', 'Asia/Saigon', 'America/Buenos_Aires', 'GMT', 'EST5EDT', 'US/Eastern']) {
  n++;
  try { NEW.parse(res(tz, 0), { nowSec: now }); new Intl.DateTimeFormat('en-US', { timeZone: tz }); ok++; console.log(`${tz}: accettato da Intl`); } catch (e) { console.log(`${tz}: ${e.message}`); }
}
console.log(`${ok} su ${n} casi come atteso`);
