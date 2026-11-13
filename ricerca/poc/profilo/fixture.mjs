#!/usr/bin/env node
/*
 * fixture.mjs — 1.11.0: estratto delle risposte di Yahoo della cache (ricerca/poc/cache/, esclusa da git) per il test del
 * profilo dei volumi (test/volprofile.test.js), che deve girare anche su main senza ricerca/.
 * S&P 500 (^GSPC e SPY giornalieri) e argento (SI=F giornaliero e orario), dal 01/10/2025 alla fine della cache; solo i
 * campi che servono (fuso, tipo, orario regolare, timestamp, chiusura, massimo, minimo, volume). Risultati attesi: i profili
 * SPX e SILVER di profilo_app.json, scritti da analisi.mjs sui dati completi; prima di scrivere il file si controlla che
 * analisi.mjs dia gli stessi bp anche sull'estratto (POC_CACHE).
 * Uso: node ricerca/poc/profilo/fixture.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, '..', '..', '..');
const CACHE = path.join(HERE, '..', 'cache'), T0 = Date.parse('2025-10-01T00:00:00Z') / 1000;
const name = (k, s) => `${k}_${s.replace(/[^A-Za-z0-9.-]/g, '_')}.json`;
const cut = (k, s) => {
  const j = JSON.parse(fs.readFileSync(path.join(CACHE, name(k, s)), 'utf-8')), r = j.res, q = r.indicators.quote[0], m = r.meta;
  const keep = r.timestamp.map((t, i) => (t >= T0 ? i : -1)).filter((i) => i >= 0), pick = (a) => keep.map((i) => a[i]);
  return { fetched: j.fetched, res: { meta: { exchangeTimezoneName: m.exchangeTimezoneName, instrumentType: m.instrumentType, dataGranularity: m.dataGranularity, gmtoffset: m.gmtoffset, currentTradingPeriod: { regular: m.currentTradingPeriod.regular } },
    timestamp: pick(r.timestamp), indicators: { quote: [{ close: pick(q.close), high: pick(q.high), low: pick(q.low), volume: pick(q.volume) }] } } };
};
const files = { [name('d', '^GSPC')]: cut('d', '^GSPC'), [name('d', 'SPY')]: cut('d', 'SPY'), [name('d', 'SI=F')]: cut('d', 'SI=F'), [name('h', 'SI=F')]: cut('h', 'SI=F') };
// controllo: analisi.mjs sull'estratto dà gli stessi bp di profilo_app.json
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'vpfix-'));
for (const [f, j] of Object.entries(files)) fs.writeFileSync(path.join(tmp, f), JSON.stringify(j));
const exp = JSON.parse(fs.readFileSync(path.join(HERE, 'profilo_app.json'), 'utf-8')).profiles;
const got = JSON.parse(execFileSync('node', ['--input-type=module', '-e', `import { appProfile } from ${JSON.stringify(path.join(HERE, 'analisi.mjs'))}; console.log(JSON.stringify({ SPX: appProfile('^GSPC', 'SPY'), SILVER: appProfile('SI=F', 'SI=F') }));`], { env: { ...process.env, POC_CACHE: tmp }, encoding: 'utf-8' }));
for (const k of ['SPX', 'SILVER']) {
  const same = got[k].bp.every((x, i) => x === exp[k].bp[i]) && got[k].from === exp[k].from && got[k].to === exp[k].to && got[k].sessions === exp[k].sessions;
  console.log(`${k}: analisi.mjs sull'estratto ${same ? 'uguale' : 'DIVERSO'} da profilo_app.json`);
  if (!same) process.exit(1);
}
const out = { note: 'Estratto di ricerca/poc/cache/ (Yahoo, 13/11/2026 07:16 UTC) scritto da ricerca/poc/profilo/fixture.mjs; expected = profili SPX e SILVER di ricerca/poc/profilo/profilo_app.json (analisi.mjs, ricalcolati da verifica.py).', files, expected: { SPX: exp.SPX, SILVER: exp.SILVER } };
const gz = zlib.gzipSync(JSON.stringify(out), { level: 9 });
fs.writeFileSync(path.join(ROOT, 'test/fixtures/volprofile_spx_si.json.gz'), gz);
console.log('test/fixtures/volprofile_spx_si.json.gz', gz.length, 'byte (', JSON.stringify(out).length, 'senza compressione)');
