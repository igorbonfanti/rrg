// Industrie accanto ai settori (1.9.0): configurazione e calendario allungato all'indietro senza cambiare gli 11 settori.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachSeries, SECTOR_KEYS, DEFAULT_PARAMS } from '../js/signals.js';
import { mergeCalendar, industryKeys, industryBreadth } from '../js/industries.js';
import { encodeDates } from '../js/indexdata.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url)));
const B = read('data/breadth.json'), S = read('data/sectors.json'), T = read('config/thresholds.json'), C = read('config/industries.json');
const P = { ...DEFAULT_PARAMS, ...T.params };

test('industrie: configurazione coerente con i livelli blu e i settori', () => {
  const keys = Object.keys(C.industries);
  assert.ok(keys.length >= 1);
  for (const k of keys) {
    const x = C.industries[k];
    assert.ok(!SECTOR_KEYS.includes(k), `${k} non è un settore`);
    assert.ok(Number.isInteger(T.blue[k]) && T.blue[k] >= 0 && T.blue[k] <= 60, `${k}: livello blu`);
    assert.ok(SECTOR_KEYS.includes(x.parent), `${k}: settore che la contiene`);
    assert.ok(x.name && x.label && x.etf && x.tv && x.holdings && x.from && x.blueSource, `${k}: campi`);
    assert.ok(x.min > 0 && x.max >= x.min);
  }
  assert.equal(T.blue.SOXX, 3); // livello di partenza di Massimo Rea (quant-rea)
});

// industria finta dal 2001 al primo giorno dei settori (giorni feriali): conta solo quante sedute si aggiungono davanti
function fakeIndustry(upTo) {
  const dates = [];
  for (let t = Date.parse('2001-07-13'); ; t += 864e5) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (d > upTo) break;
    if (new Date(t).getUTCDay() % 6) dates.push(d);
  }
  const n = dates.length;
  return { dates: encodeDates(dates), series: { SOXX: { adjclose: dates.map((_, i) => 10 + i / 100), breadth: { members: [[0, 30]], n: [[0, 25]], a20: new Array(n).fill(5), a50: new Array(n).fill(5), a200: new Array(n).fill(5) } } } };
}

test('industrie: il calendario allungato all\'indietro non cambia nessun numero degli 11 settori', () => {
  const ind = fakeIndustry(S.dates.at(-1));
  const keys = industryKeys(C, ind);
  assert.deepEqual(keys, ['SOXX']);
  const M = mergeCalendar(S, ind, keys);
  assert.ok(M.pad > 600, `sedute aggiunte davanti: ${M.pad}`);
  assert.deepEqual(M.dates.slice(M.pad), S.dates);
  for (const s of SECTOR_KEYS) {
    const a = priceSeries(S.adjclose[s]), b = priceSeries(M.adjclose[s]);
    const ba = breadthSeries(B, s, S.dates), bb = breadthSeries(B, s, M.dates);
    const sl = (x) => x.slice(M.pad);
    assert.deepEqual(sl(b.dd), a.dd, `${s}: drawdown`);
    assert.deepEqual(sl(b.dp), a.dp, `${s}: percentile del drawdown`);
    assert.deepEqual(sl(bb.pct200), ba.pct200, `${s}: breadth`);
    const ma = runMachine(a, ba, T.blue[s], P), mb = runMachine(b, bb, T.blue[s], P);
    assert.deepEqual(sl(mb.days), ma.days, `${s}: stati giornalieri`);
    assert.deepEqual(mb.events.map((e) => [M.dates[e.t], e.code, e.text]), ma.events.map((e) => [S.dates[e.t], e.code, e.text]), `${s}: eventi`);
    assert.deepEqual(sl(approachSeries(bb.pct200, T.blue[s])), approachSeries(ba.pct200, T.blue[s]), `${s}: avvicinamento`);
  }
  // l'industria si allinea per data e le sedute dopo l'ultima dei settori restano fuori
  const di = M.indDates, br = breadthSeries(industryBreadth(ind, 'SOXX', di), 'SOXX', M.dates);
  assert.equal(M.adjclose.SOXX[0], 10);
  assert.equal(br.pct200[0], 20);
  assert.equal(M.dates.length, M.pad + S.dates.length);
});

test('industrie: senza file restano solo i settori', () => {
  assert.deepEqual(industryKeys(C, null), []);
  const M = mergeCalendar(S, null, []);
  assert.equal(M.dates, S.dates);
  assert.equal(M.pad, 0);
});

test('industrie: un file con la struttura sbagliata lascia solo i settori', () => {
  for (const bad of [{ dates: {}, series: { SOXX: {} } }, { dates: { d0: '2001-07-13', gaps: '' }, series: { SOXX: { adjclose: [] } } }, { dates: { d0: 1 }, series: {} }]) assert.deepEqual(industryKeys(C, bad), []);
});
