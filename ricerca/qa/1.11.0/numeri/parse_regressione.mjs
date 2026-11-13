// Controllo 1.11.0 (numeri): parse e fetchDaily di scripts/lib/yahoo.js nuovi contro quelli della 1.10.2 (yahoo_1.10.2.js,
// copia di origin/main) sulle risposte grezze salvate. Uso: node parse_regressione.mjs <yahoo.js nuovo> <dir> [<dir> ...]
// Confronta: parse senza withVolume (4 combinazioni di opzioni × 3 istanti nowSec), parse con withVolume meno low/volume,
// fetchDaily con fetch finto (URL richiesto e uscita). Conta i confronti fatti.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OLD = await import(pathToFileURL(path.join(here, 'yahoo_1.10.2.js')).href);
const NEW = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const files = process.argv.slice(3).flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => path.join(d, f)));
const S = (x) => JSON.stringify(x);
const OPTS = [{}, { fillLast: true }, { keepOpenCrypto: true }, { dropStale: true }, { fillLast: true, keepOpenCrypto: true, dropStale: true }];
let n = 0, bad = 0, nres = 0, withVol = 0;
const fail = (m) => { bad++; if (bad < 20) console.log('DIVERSO', m); };
for (const f of files) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { continue; }
  const res = j && j.res;
  if (!res || !res.timestamp || !res.indicators) continue;
  nres++;
  const t0 = Date.parse(j.fetched || '2026-11-13T00:00:00Z') / 1000, last = res.timestamp[res.timestamp.length - 1];
  const reg = res.meta && res.meta.currentTradingPeriod && res.meta.currentTradingPeriod.regular;
  for (const nowSec of [t0, last + 1800, last + 5 * 86400, ...(reg ? [reg.end + 1800, reg.start + 60] : [])]) for (const o of OPTS) {
    const a = OLD.parse(res, { ...o, nowSec }), b = NEW.parse(res, { ...o, nowSec });
    n++; if (S(a) !== S(b)) fail(`${f} ${S(o)} ${nowSec}`);
    const c = NEW.parse(res, { ...o, nowSec, withVolume: true });
    const { low, volume, ...rest } = c;
    n++; if (S(rest) !== S(a)) fail(`${f} withVolume ${S(o)}`);
    if (low.length !== c.dates.length || volume.length !== c.dates.length || low.some((x, i) => !(x <= c.close[i])) ) fail(`${f} low/volume`);
    withVol++;
  }
}
// fetchDaily con fetch finto: stesso URL e stessa uscita
let urls = [];
const one = files.map((f) => { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return null; } }).filter((j) => j && j.res && j.res.timestamp).slice(0, 40);
globalThis.fetch = async (url) => { urls.push(url); return { status: 200, ok: true, json: async () => ({ chart: { result: [globalThis.__res] } }) }; };
const FOPTS = [{ range: '1y' }, { period1: 1700000000, period2: 1790000000 }, { range: '5y', raw: true, fillLast: true }, { period1: 1700000000, period2: 1790000000, raw: true, keepOpenCrypto: true, dropStale: true }];
for (const j of one) for (const o of FOPTS) for (const sym of ['BRK.B', '069500.KS', '^GSPC', 'GC=F']) {
  globalThis.__res = j.res; urls = [];
  const a = await OLD.fetchDaily(sym, o); const b = await NEW.fetchDaily(sym, o);
  n++; if (urls[0] !== urls[1]) fail(`URL ${urls[0]} ${urls[1]}`);
  n++; if (S(a) !== S(b)) fail(`fetchDaily ${sym} ${S(o)}`);
}
// errori: HTTP 404 senza nuovi tentativi, «nessun dato»
for (const [st, body, msg] of [[404, {}, 'HTTP 404'], [200, { chart: { result: null } }, 'nessun dato']]) {
  globalThis.fetch = async () => ({ status: st, ok: st === 200, json: async () => body });
  const e1 = await OLD.fetchDaily('X', {}).catch((e) => e.message), e2 = await NEW.fetchDaily('X', {}).catch((e) => e.message);
  n++; if (e1 !== msg || e2 !== msg) fail(`errore ${st}: ${e1} / ${e2}`);
}
console.log(`${nres} risposte, ${n} confronti, ${withVol} con withVolume, ${bad} diversi`);
process.exitCode = bad ? 1 : 0;
