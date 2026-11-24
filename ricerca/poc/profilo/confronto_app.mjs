#!/usr/bin/env node
/*
 * confronto_app.mjs — 1.11.0: il profilo dei volumi della pipeline (scripts/lib/volprofile.js, come lo chiama
 * scripts/fetch_ath.js con config/ath.json) contro quello di analisi.mjs (fase 1), sulle stesse risposte grezze di Yahoo.
 *
 * Uso:
 *  - sulla cache della ricerca (dati del 13/11/2026 alle 07:16 UTC), con in più il confronto con profilo_app.json:
 *      node ricerca/poc/profilo/confronto_app.mjs
 *  - sui dati di una corsa della pipeline: ATH_RAW_DIR=<cartella> node scripts/fetch_ath.js, poi
 *      POC_CACHE=<cartella> node ricerca/poc/profilo/confronto_app.mjs <cartella> data/ath_history.json
 *    (il secondo argomento: confronta anche i profili scritti nel file)
 * Esce con 1 se una sola fascia è diversa.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, parseHourly } from '../../../scripts/lib/yahoo.js';
import { buildProfile } from '../../../scripts/lib/volprofile.js';
import { windowStart } from '../../../js/ath.js';
import { appProfile } from './analisi.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, '..', '..', '..');
const DIR = path.resolve(process.argv[2] || path.join(HERE, '..', 'cache'));
if (path.resolve(process.env.POC_CACHE || path.join(HERE, '..', 'cache')) !== DIR) { console.error('POC_CACHE deve essere la stessa cartella'); process.exit(2); }
const FILE = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf-8')).profiles : null;
const EXPECTED = process.argv[2] ? null : JSON.parse(fs.readFileSync(path.join(HERE, 'profilo_app.json'), 'utf-8')).profiles;
const raw = (kind, sym) => JSON.parse(fs.readFileSync(path.join(DIR, `${kind}_${sym.replace(/[^A-Za-z0-9.-]/g, '_')}.json`), 'utf-8'));
const dailyOf = (sym) => { const j = raw('d', sym); return parse(j.res, { withVolume: true, nowSec: Date.parse(j.fetched) / 1000 }); };

let bad = 0;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/ath.json'), 'utf-8')).markets;
for (const c of cfg) {
  if (!c.profile) continue;
  const chart = dailyOf(c.symbol), to = chart.dates.at(-1), from = windowStart(to, 1);
  const vol = c.profile.vol === c.symbol ? chart : dailyOf(c.profile.vol);
  const hourly = c.profile.hourly ? parseHourly(raw('h', c.profile.vol).res) : null;
  const p = buildProfile({ chart, vol, hourly, needHourly: !!c.profile.hourly, from, to }).profile;
  const a = appProfile(c.symbol, c.profile.vol);
  const diff = p ? p.bp.filter((x, i) => x !== a.bp[i]).length : 100;
  const rel = (x, y) => Math.abs(x / y - 1);
  const same = p && diff === 0 && p.from === a.from && p.to === a.to && p.sessions === a.sessions && rel(p.lo, a.lo) < 1e-7 && rel(p.hi, a.hi) < 1e-7;
  let line = `${c.id.padEnd(7)} ${c.profile.vol.padEnd(10)} pipeline ${p ? `${p.from}→${p.to} ${p.sessions} sedute ${p.source}, somma bp ${p.bp.reduce((x, y) => x + y, 0)}` : 'null'} | analisi.mjs ${a.from}→${a.to} ${a.sessions} sedute | fasce diverse ${diff} ${same ? 'UGUALI' : 'DIVERSI'}`;
  if (!same) bad++;
  if (EXPECTED) { const e = EXPECTED[c.id], ok = p && e.bp.every((x, i) => x === p.bp[i]) && e.from === p.from && e.to === p.to && e.sessions === p.sessions && +p.lo.toPrecision(6) === e.lo && +p.hi.toPrecision(6) === e.hi; line += ` | profilo_app.json ${ok ? 'uguale' : 'DIVERSO'}`; if (!ok) bad++; }
  if (FILE) { const f = FILE[c.id], ok = f && p && f.bp.every((x, i) => x === p.bp[i]) && f.from === p.from && f.to === p.to && f.lo === p.lo && f.hi === p.hi; line += ` | file ${ok ? 'uguale' : 'DIVERSO'}`; if (!ok) bad++; }
  console.log(line);
}
console.log(bad ? `${bad} DIFFERENZE` : 'tutto uguale');
process.exit(bad ? 1 : 0);
