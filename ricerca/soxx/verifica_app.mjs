#!/usr/bin/env node
/*
 * verifica_app.mjs — controllo dei dati del SOXX dell'app (data/industries.json, scritto da scripts/backfill_industries.js
 * o da scripts/fetch_industries.js) contro la ricerca (ricerca/soxx/dati/).
 *
 *  1. Breadth: per ogni seduta in comune dal `from` di config/industries.json, members, n, a20, a50 e a200 del file
 *     uguali a ricerca/soxx/dati/breadth_soxx.json (conteggi di analisi.mjs). Attese 0 sedute diverse; ogni differenza
 *     si elenca con la data e i valori.
 *  2. Macchina a stati: runMachine() di js/signals.js sul calendario del SOXX, con il prezzo del file (chiusura
 *     rettificata per i dividendi, 2 decimali) e la breadth del file letta con breadthSeries() dell'app, livello blu di
 *     config/thresholds.json (3%). Zone blu, trigger e falliti fino all'ultima seduta della ricerca uguali agli eventi di
 *     risultati.json (macchina.soxxRettificato, livello 3). Anche con il 5% e il 10%, come controllo in più.
 *  3. Fotografia dei titoli (latest): righe con la chiusura = n e somma di up200 = a200 all'ultima seduta.
 *  4. Lista: tickers del file contro membri_oggi.json della ricerca (stessa fonte, un giorno diverso).
 *
 * Uso: node ricerca/soxx/verifica_app.mjs [DIR_DATI]      (esce con codice 1 se un controllo non passa)
 *   DIR_DATI: cartella con industries.json e industry_members.json (di solito data/ del repository; per la pubblicazione
 *   la cartella data/ del worktree di main dove si è eseguito scripts/backfill_industries.js)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMachine, priceSeries, breadthSeries, expandRLE } from '../../js/signals.js';
import { decodeDates } from '../../js/indexdata.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf-8'));
const DATA = path.resolve(process.argv[2] || path.join(ROOT, 'data'));
const readData = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf-8'));
console.log(`Dati: ${DATA}`);
const file = readData('industries.json'), ind = read('config/industries.json').industries.SOXX, cfg = read('config/thresholds.json');
const ref = read('ricerca/soxx/dati/breadth_soxx.json'), res = read('ricerca/soxx/dati/risultati.json'), oggi = read('ricerca/soxx/dati/membri_oggi.json');
const dates = decodeDates(file.dates.d0, file.dates.gaps), S = file.series.SOXX, L = dates.length;
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'NO  '} ${msg}`); if (!ok) fail++; };

// ---------- 1. breadth ----------
const b = { members: expandRLE(S.breadth.members, L), n: expandRLE(S.breadth.n, L), a20: S.breadth.a20, a50: S.breadth.a50, a200: S.breadth.a200 };
const refAt = new Map(ref.dates.map((d, i) => [d, i]));
const last = ref.dates.at(-1);
let same = 0;
const diff = [], onlyRef = [], onlyApp = [];
dates.forEach((d, i) => {
  if (d < ind.from || d > last) return;
  if (b.a200[i] == null) { if (refAt.has(d)) onlyRef.push(d); return; }
  const j = refAt.get(d);
  if (j == null) { onlyApp.push(d); return; }
  const bad = ['members', 'n', 'a20', 'a50', 'a200'].filter((k) => b[k][i] !== ref[k][j]);
  if (bad.length) diff.push(`${d}: ${bad.map((k) => `${k} ${b[k][i]} contro ${ref[k][j]}`).join(', ')}`); else same++;
});
const refFrom = ref.dates.filter((d) => d >= ind.from).length;
check(diff.length === 0 && onlyRef.length === 0 && onlyApp.length === 0,
  `breadth dal ${ind.from} al ${last}: ${same} sedute uguali su ${refFrom} della ricerca, ${diff.length} diverse, ${onlyRef.length} solo nella ricerca, ${onlyApp.length} solo nel file`);
for (const x of diff.slice(0, 20)) console.log('     ', x);
if (onlyRef.length) console.log('      solo nella ricerca:', onlyRef.slice(0, 20).join(' '));
if (onlyApp.length) console.log('      solo nel file:', onlyApp.slice(0, 20).join(' '));
const firstB = dates[b.a200.findIndex((v) => v != null)];
check(firstB === ind.from, `prima seduta con la breadth ${firstB} (config: ${ind.from}); prima del from tutto vuoto`);
const after = dates.filter((d, i) => d > last && b.a200[i] != null);
console.log(`      sedute del file dopo la fine della ricerca (${last}): ${after.length ? after.join(' ') : 'nessuna'}`);

// ---------- 2. macchina a stati ----------
const br = breadthSeries({ dates, series: { SOXX: S.breadth } }, 'SOXX', dates);
const pxs = priceSeries(S.adjclose);
const research = Object.fromEntries(res.macchina.soxxRettificato.map((m) => [m.livello, m]));
for (const lv of [cfg.blue.SOXX, 5, 10]) {
  const m = runMachine(pxs, br, lv, cfg.params);
  const ev = m.events.filter((e) => dates[e.t] <= last).map((e) => `${dates[e.t]} ${e.code}`);
  const want = (research[lv] ? research[lv].eventi : []).map((e) => `${e.data} ${e.code}`);
  const zb = ev.filter((x) => x.endsWith('setup')).length;
  const eq = JSON.stringify(ev) === JSON.stringify(want);
  check(eq, `livello ${lv}%${lv === cfg.blue.SOXX ? ' (config/thresholds.json)' : ''}: ${zb} zone blu, ${ev.filter((x) => x.endsWith('trig')).length} trigger, ${ev.filter((x) => x.endsWith('fail')).length} falliti fino al ${last}; ricerca ${research[lv] ? research[lv].zoneBlu : '—'} zone blu`);
  if (!eq) { console.log('      app:    ', ev.join(' | ')); console.log('      ricerca:', want.join(' | ')); }
  if (lv === cfg.blue.SOXX) console.log('      zone blu:', ev.filter((x) => x.endsWith('setup')).map((x) => x.slice(0, 10)).join(' '));
  const later = m.events.filter((e) => dates[e.t] > last).map((e) => `${dates[e.t]} ${e.code}`);
  if (later.length) console.log(`      eventi dopo il ${last}: ${later.join(' ')}`);
}

// ---------- 3. fotografia ----------
const lt = file.latest.SOXX, iA = dates.indexOf(lt.asOf);
const priced = lt.members.filter((x) => x.close != null);
check(lt.asOf === file.asOf && priced.length === b.n[iA] && priced.filter((x) => x.up200).length === b.a200[iA] && lt.members.length === b.members[iA],
  `fotografia del ${lt.asOf}: ${lt.members.length} righe (membri ${b.members[iA]}), ${priced.length} con la chiusura (n ${b.n[iA]}), ${priced.filter((x) => x.up200).length} sopra la media 200 (a200 ${b.a200[iA]})`);
const wSum = lt.members.reduce((a, x) => a + (x.w || 0), 0);
console.log(`      somma dei pesi del CSV: ${wSum.toFixed(2)}% (il resto è cassa e futures)`);

// ---------- 4. lista ----------
const li = file.lists.SOXX, a = new Set(li.tickers), r = new Set(oggi.tickers);
const plus = li.tickers.filter((t) => !r.has(t)), minus = oggi.tickers.filter((t) => !a.has(t));
check(li.count === li.tickers.length && li.count >= ind.min && li.count <= ind.max, `lista del ${li.asOf}: ${li.count} titoli (limiti ${ind.min}-${ind.max})`);
console.log(`      contro la ricerca (holdings del ${oggi.asOf}): ${plus.length || minus.length ? `+${plus.join(' +')} -${minus.join(' -')}` : 'stessi titoli'}`);

// ---------- 5. vista 5: linea «cap» (azioni dell'ETF) contro l'ETF (solo informativo) ----------
const im = readData('industry_members.json'), at = new Map(dates.map((d, i) => [d, i]));
const rows = ['1M', '3M', '6M'].map((p) => {
  const st = im.starts[p][0], cap = im.sectors.SOXX[p][0];
  const etf = (S.adjclose[at.get(im.asOf)] / S.adjclose[at.get(st)] - 1) * 100;
  return `${p} dal ${st}: cap ${cap ? cap[0] : '—'}%, ETF ${etf.toFixed(1)}% (scarto ${cap ? (cap[0] - etf).toFixed(1) : '—'})`;
});
console.log(`INFO vista 5 al ${im.asOf}, cap con le azioni del CSV contro il SOXX rettificato: ${rows.join('; ')}`);

console.log(fail ? `\n${fail} controlli non superati` : '\nTutti i controlli superati');
process.exit(fail ? 1 : 0);
