// Controllo 1.11.0 (numeri): regole d'errore del profilo dei volumi, pickProfile e check_fresh sui dati reali salvati
// (ATH_RAW_DIR) con modifiche mirate. Uso: node errori.mjs <copia dell'app> <raw_dir>
// Ogni caso stampa OK/KO; esce con 1 se un caso non fa quello che la regola dichiarata dice.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [APP, RAW] = process.argv.slice(2).map((p) => path.resolve(p));
const imp = (f) => import(pathToFileURL(path.join(APP, f)).href);
const { parse, parseHourly } = await imp('scripts/lib/yahoo.js');
const { buildProfile } = await imp('scripts/lib/volprofile.js');
const { pickProfile, prevProfileOf } = await imp('scripts/fetch_ath.js');
const { staleData } = await imp('scripts/check_fresh.js');
const { windowStart } = await imp('js/ath.js');
const raw = (k, s) => JSON.parse(fs.readFileSync(path.join(RAW, `${k}_${s.replace(/[^A-Za-z0-9.-]/g, '_')}.json`), 'utf-8'));
const daily = (s) => { const j = raw('d', s); return parse(j.res, { withVolume: true, nowSec: Date.parse(j.fetched) / 1000 }); };
const clone = (x) => JSON.parse(JSON.stringify(x));
let ko = 0, n = 0;
const check = (name, cond, extra = '') => { n++; if (!cond) ko++; console.log(`${cond ? 'OK' : 'KO'}  ${name}${extra ? ` (${extra})` : ''}`); };

const gspc = daily('^GSPC'), spy = daily('SPY'), si = daily('SI=F'), hsi = parseHourly(raw('h', 'SI=F').res), gc = daily('GC=F');
const to = gspc.dates.at(-1), from = windowStart(to, 1);
const inWin = (s) => s.dates.map((d, i) => [d, i]).filter(([d]) => d >= from && d <= to).map(([, i]) => i);
const base = buildProfile({ chart: gspc, vol: spy, from, to });
check('SPX di base calcolato', !!base.profile, base.why);

// volume 0: fino al 10% delle sedute si tiene, oltre null
for (const [frac, expect] of [[0.10, true], [0.11, false]]) {
  const v = clone(spy), idx = inWin(v), k = Math.floor(idx.length * frac);
  for (let j = 0; j < k; j++) v.volume[idx[j * Math.floor(idx.length / k)]] = 0;
  const r = buildProfile({ chart: gspc, vol: v, from, to });
  check(`volume 0 su ${k} sedute di ${idx.length}: profilo ${expect ? 'sì' : 'null'}`, !!r.profile === expect, r.why || `${r.profile && r.profile.sessions} sedute`);
}
// volume null (mancante) = come 0
{ const v = clone(spy), idx = inWin(v); for (const i of idx.slice(0, 30)) v.volume[i] = null;
  const r = buildProfile({ chart: gspc, vol: v, from, to }); check('volume mancante su 30 sedute: null (oltre il 10%)', !r.profile, r.why); }
// volume ricopiato: la seduta resta con volume 0 e non entra nel profilo
{ const v = clone(spy), idx = inWin(v), i = idx[100]; v.volume[i] = v.volume[i - 1];
  const r = buildProfile({ chart: gspc, vol: v, from, to });
  check('volume ricopiato tolto (seduta tenuta, volume 0)', r.profile && r.profile.sessions === base.profile.sessions && r.info.stale.includes(v.dates[i]) && r.info.noVolume === 1);
  // la prima seduta della finestra uguale a quella prima della finestra (fuori): tolta lo stesso
  const v2 = clone(spy), i0 = inWin(v2)[0]; v2.volume[i0] = v2.volume[i0 - 1];
  const r2 = buildProfile({ chart: gspc, vol: v2, from, to });
  check('ricopiato sulla prima seduta della finestra (confronto con la seduta prima della finestra)', r2.info.stale.includes(v2.dates[i0])); }
// ricopiato vero sull'ultima seduta dei future (GC=F): il volume dell'ultima seduta uguale a quello prima
{ const r = buildProfile({ chart: gc, vol: gc, from: windowStart(gc.dates.at(-1), 1), to: gc.dates.at(-1) });
  const last = gc.volume.at(-1), prev = gc.volume.at(-2);
  check(`GC=F ultima seduta ${gc.dates.at(-1)}: volume ${last} = ${prev} della seduta prima, tolto`, last === prev && r.info.stale.includes(gc.dates.at(-1))); }
// prezzi ≤ 0
for (const val of [0, -1]) {
  const v = clone(spy), i = inWin(v)[50]; v.low[i] = val;
  const r = buildProfile({ chart: gspc, vol: v, from, to }); check(`minimo ${val} in una seduta: null`, !r.profile, r.why);
}
{ const c = clone(gspc), i = inWin(c)[50]; c.close[i] = -5; const r = buildProfile({ chart: c, vol: spy, from, to });
  check('chiusura del grafico negativa (fattore negativo): null', !r.profile, r.why); }
// sedute senza chiusura comune: oltre il 5% null
for (const [k, expect] of [[12, true], [13, false]]) {
  const c = clone(gspc), idx = inWin(c).slice(10, 10 + k).reverse();
  for (const i of idx) for (const f of ['dates', 'close', 'high', 'low', 'volume', 'adjclose']) c[f].splice(i, 1);
  const r = buildProfile({ chart: c, vol: spy, from, to });
  check(`${k} sedute di SPY senza ^GSPC su ${inWin(spy).length}: profilo ${expect ? 'sì' : 'null'}`, !!r.profile === expect, r.why || '');
}
// asimmetria: sedute del grafico che lo strumento dei volumi non ha (non contate)
{ const v = clone(spy), idx = inWin(v).slice(10, 40).reverse();
  for (const i of idx) for (const f of ['dates', 'close', 'high', 'low', 'volume', 'adjclose']) v[f].splice(i, 1);
  const r = buildProfile({ chart: gspc, vol: v, from, to });
  console.log(`INFO  30 sedute di ^GSPC senza SPY (12%): profilo ${r.profile ? `calcolato con ${r.profile.sessions} sedute, skipped ${r.info.skipped}` : 'null'}`); }
// barre orarie: partono tardi (oltre 7 giorni) = null; entro 7 giorni = sì; mancanti = null; buco in mezzo
const sto = si.dates.at(-1), sfrom = windowStart(sto, 1);
const addD = (d, k) => new Date(Date.parse(d) + k * 864e5).toISOString().slice(0, 10);
for (const [lag, expect] of [[7, true], [8, false], [30, false]]) {
  const h = hsi.filter((x) => x.s >= addD(sfrom, lag));
  const r = buildProfile({ chart: si, vol: si, hourly: h, needHourly: true, from: sfrom, to: sto });
  check(`orarie dal giorno +${lag} (prima ${r.info && r.info.firstHourly}): profilo ${expect ? 'sì' : 'null'}`, !!r.profile === expect, r.why || '');
}
{ const r = buildProfile({ chart: si, vol: si, hourly: [], needHourly: true, from: sfrom, to: sto }); check('orarie vuote: null', !r.profile, r.why); }
{ const r = buildProfile({ chart: si, vol: si, hourly: null, needHourly: true, from: sfrom, to: sto }); check('orarie non arrivate: null', !r.profile, r.why); }
{ const h = hsi.filter((x) => x.s < '2026-03-01' || x.s >= '2026-05-01');
  const r = buildProfile({ chart: si, vol: si, hourly: h, needHourly: true, from: sfrom, to: sto });
  console.log(`INFO  orarie con un buco di 2 mesi (mar-apr 2026): profilo ${r.profile ? `calcolato con ${r.profile.sessions} sedute (di 252), skipped ${r.info.skipped}` : 'null: ' + r.why}`); }
// orarie con volume giornaliero «buono» (rapporto ≥ 0,5): si usano le giornaliere
{ const v = clone(si); const hs = new Map(); for (const x of hsi) hs.set(x.s, (hs.get(x.s) || 0) + x.v);
  v.volume = v.volume.map((x, i) => hs.get(v.dates[i]) || x);
  const r = buildProfile({ chart: si, vol: v, hourly: hsi, needHourly: true, from: sfrom, to: sto });
  check('SI=F con volume giornaliero = somma oraria: barre giornaliere', r.profile && r.profile.source === 'giornaliere', r.why || r.profile.source); }

// pickProfile
const P = (to) => ({ to, bp: [1] });
const cases = [
  ['nuovo, nessun pubblicato', P('2026-11-12'), null, '2026-11-12', 4, 'fresh'],
  ['nuovo più recente', P('2026-11-12'), P('2026-11-11'), '2026-11-12', 4, 'fresh'],
  ['nuovo uguale', P('2026-11-12'), P('2026-11-12'), '2026-11-12', 4, 'fresh'],
  ['nuovo più vecchio, pubblicato entro maxAge', P('2026-11-11'), P('2026-11-12'), '2026-11-13', 4, 'prev'],
  ['non arrivato, pubblicato a 4 giorni', null, P('2026-11-09'), '2026-11-13', 4, 'prev'],
  ['non arrivato, pubblicato a 5 giorni', null, P('2026-11-08'), '2026-11-13', 4, null],
  ['non arrivato, KOSPI a 12 giorni', null, P('2026-11-01'), '2026-11-13', 12, 'prev'],
  ['non arrivato, nessun pubblicato', null, null, '2026-11-13', 4, null],
  ['non arrivato, senza riga del mercato', null, P('2026-11-12'), null, 4, null],
  ['pubblicato dopo l\'ultima seduta', null, P('2026-11-14'), '2026-11-13', 4, null],
];
for (const [name, f, p, last, max, exp] of cases) {
  const r = pickProfile(f, p, last, max), got = r.profile === f && f ? 'fresh' : r.profile === p && p ? 'prev' : r.profile;
  check(`pickProfile: ${name} → ${exp}`, got === exp, r.why || '');
}
// profilo pubblicato con un altro strumento dei volumi: non si tiene
{ const c = { id: 'SPX', symbol: '^GSPC', profile: { vol: 'SPY' } };
  check('prevProfileOf: stesso strumento', !!prevProfileOf({ profiles: { SPX: { vol: 'SPY', bp: [1] } } }, {}, c));
  check('prevProfileOf: strumento cambiato → null', prevProfileOf({ profiles: { SPX: { vol: 'IVV', bp: [1] } } }, {}, c) === null);
  check('prevProfileOf: riga del mercato assente (simbolo cambiato) → null', prevProfileOf({ profiles: { SPX: { vol: 'SPY', bp: [1] } } }, null, c) === null); }

// check_fresh: staleData con i profili
const B = '2026-11-12', d0 = { breadth: { asOf: B } };
const probs = (ap) => staleData({ ...d0, athProfiles: ap, athMaxAge: { SPX: 4, KOSPI: 12 } }, '2026-11-13').filter((x) => /profilo/.test(x));
check('check_fresh: profilo al giorno della breadth, nessun avviso', probs({ SPX: B }).length === 0);
check('check_fresh: profilo a 4 giorni, nessun avviso', probs({ SPX: '2026-11-08' }).length === 0);
check('check_fresh: profilo a 5 giorni, avviso', probs({ SPX: '2026-11-07' }).length === 1, probs({ SPX: '2026-11-07' })[0]);
check('check_fresh: KOSPI a 12 giorni, nessun avviso', probs({ KOSPI: '2026-10-31' }).length === 0);
check('check_fresh: KOSPI a 13 giorni, avviso', probs({ KOSPI: '2026-10-30' }).length === 1);
check('check_fresh: profilo null, avviso', probs({ SPX: null }).length === 1, probs({ SPX: null })[0]);
check('check_fresh: senza profili nel file, nessun controllo', probs(undefined).length === 0);
console.log(`${n} casi, ${ko} KO`);
process.exitCode = ko ? 1 : 0;
