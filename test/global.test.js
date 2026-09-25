import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from '../scripts/lib/yahoo.js';
import { alignToCalendar, globalCalendar, pickAsOf, repairSpikes, validateGlobal } from '../scripts/fetch_data.js';
import { MILAN } from '../js/calendar.js';
import { portfolioIndex } from '../js/portfolio.js';

const T = (iso) => Date.parse(iso) / 1000;

test('Yahoo: chiusura europea ancora vuota presa dalla quotazione, a seduta finita', () => {
  // come SWDA.MI il 25/09/2026 alle 5:28 UTC: la barra del 24 è nulla, il prezzo finale è nella quotazione
  const res = {
    meta: {
      gmtoffset: 7200, instrumentType: 'ETF', regularMarketPrice: 128.38, regularMarketTime: T('2026-09-24T15:35:00Z'),
      currentTradingPeriod: { regular: { start: T('2026-09-25T07:00:00Z'), end: T('2026-09-25T15:30:00Z') } },
    },
    timestamp: [T('2026-09-23T07:00:00Z'), T('2026-09-24T07:00:00Z')],
    indicators: { quote: [{ close: [129.12, null] }], adjclose: [{ adjclose: [129.12, null] }] },
  };
  const now = T('2026-09-25T05:28:00Z');
  assert.deepEqual(parse(res, { nowSec: now }).dates, ['2026-09-23']);
  const p = parse(res, { fillLast: true, nowSec: now });
  assert.deepEqual(p.dates, ['2026-09-23', '2026-09-24']);
  assert.deepEqual(p.close, [129.12, 128.38]);
  // durante la seduta del 25 la barra in corso si scarta e il prezzo della quotazione non riempie il 24
  const live = {
    ...res,
    meta: { ...res.meta, regularMarketTime: T('2026-09-25T09:00:00Z') },
    timestamp: [...res.timestamp, T('2026-09-25T07:00:00Z')],
    indicators: { quote: [{ close: [129.12, null, 128.9] }], adjclose: [{ adjclose: [129.12, null, 128.9] }] },
  };
  assert.deepEqual(parse(live, { fillLast: true, nowSec: T('2026-09-25T09:00:00Z') }).dates, ['2026-09-23']);
});

test('Yahoo: per le criptovalute si tiene la barra del giorno in corso', () => {
  const res = {
    meta: { gmtoffset: 0, instrumentType: 'CRYPTOCURRENCY', currentTradingPeriod: { regular: { start: T('2026-09-24T00:00:00Z'), end: T('2026-09-24T23:59:59Z') } } },
    timestamp: [T('2026-09-23T00:00:00Z'), T('2026-09-24T00:00:00Z')],
    indicators: { quote: [{ close: [74138.9, 74013.0] }], adjclose: [{ adjclose: [74138.9, 74013.0] }] },
  };
  const now = T('2026-09-24T22:40:00Z');
  assert.deepEqual(parse(res, { nowSec: now }).dates, ['2026-09-23']);
  assert.deepEqual(parse(res, { keepOpenCrypto: true, nowSec: now }).dates, ['2026-09-23', '2026-09-24']);
});

test('calendario di Borsa Italiana', () => {
  const h = MILAN.holidays(2025);
  for (const d of ['2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01', '2025-08-15', '2025-12-24', '2025-12-25', '2025-12-26', '2025-12-31']) assert.ok(h.has(d), d);
  assert.equal(MILAN.isTradingDay('2025-08-15'), false);
  // 24/09/2026 alle 22:40 UTC (00:40 a Roma del 25): attesa la seduta del 24
  assert.equal(MILAN.expectedSession(new Date('2026-09-24T22:40:00Z')), '2026-09-24');
  // 25/09 alle 13:40 a Roma: seduta in corso, attesa quella del 24
  assert.equal(MILAN.expectedSession(new Date('2026-09-25T11:40:00Z')), '2026-09-24');
  assert.equal(MILAN.sessionsBetween('2025-08-13', '2025-08-18'), 2); // salta Ferragosto
});

test('calendario globale e allineamento: Ferragosto e fine settimana esclusi, bitcoin all\'ultimo prezzo', () => {
  const xetra = { dates: ['2025-08-14', '2025-08-15', '2025-08-18'], adjclose: [10, 11, 12] };
  const milan = { dates: ['2025-08-14', '2025-08-18'], adjclose: [20, 21] };
  const dates = globalCalendar({ xetra, milan }, '2025-08-18');
  assert.deepEqual(dates, ['2025-08-14', '2025-08-18']);
  const btc = { dates: ['2025-08-14', '2025-08-15', '2025-08-16', '2025-08-17'], adjclose: [100, 101, 102, 103] };
  const late = { dates: ['2025-08-18'], adjclose: [5] };
  const c = alignToCalendar({ xetra, milan, btc, late }, dates);
  assert.deepEqual(c.xetra, [10, 12]);
  assert.deepEqual(c.btc, [100, 103]); // lunedì: ultimo prezzo disponibile (domenica)
  assert.deepEqual(c.late, [null, 5]);
});

test('data di pubblicazione con il calendario di Milano', () => {
  const r = pickAsOf({ 'SWDA.MI': '2025-08-18', 'EXS1.DE': '2025-08-14', 'OLD.MI': '2025-08-01' }, MILAN.sessionsBetween);
  assert.equal(r.asOf, '2025-08-14');
  assert.deepEqual(r.stale, ['OLD.MI']);
});

function walk(n, vol, seed) {
  let s = seed, p = 100;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 - 0.5; };
  return Array.from({ length: n }, () => (p *= Math.exp(vol * 3.46 * rnd())));
}

test('prezzi anomali: si corregge il salto isolato che rientra, non i movimenti veri', () => {
  const ref = walk(150, 0.008, 1), base = walk(150, 0.008, 2);
  // prezzo in dollari al posto di quello in euro per un giorno (+16%)
  const bad = base.slice(); bad[100] = base[100] * 1.16;
  const r = repairSpikes(bad, ref);
  assert.equal(r.fixes.length, 1);
  assert.equal(r.fixes[0].i, 100);
  assert.ok(Math.abs(r.close[100] / base[100] - 1) < 0.02, String(r.close[100] / base[100]));
  // tutto il mercato sale del 7% e poi scende: movimento vero
  const ref2 = ref.slice(), mkt = base.slice();
  for (let i = 100; i < 150; i++) { ref2[i] *= 1.07; mkt[i] *= 1.07; }
  for (let i = 101; i < 150; i++) { ref2[i] /= 1.06; mkt[i] /= 1.06; }
  assert.equal(repairSpikes(mkt, ref2).fixes.length, 0);
  // salto del titolo senza rientro: movimento vero
  const jump = base.map((v, i) => (i >= 100 ? v * 1.15 : v));
  assert.equal(repairSpikes(jump, ref).fixes.length, 0);
  // l'ultimo prezzo non si tocca (manca la seduta dopo)
  const tail = base.slice(); tail[149] *= 1.16;
  assert.equal(repairSpikes(tail, ref).fixes.length, 0);
});

test('portafoglio sintetico ribilanciato a fine mese', () => {
  const dates = ['2026-01-02', '2026-01-30', '2026-02-02', '2026-02-27'];
  const closes = { A: [10, 20, 22, 22], B: [5, 5, 5, 5] };
  const { index } = portfolioIndex(dates, closes, { A: 50, B: 50 });
  assert.equal(index[0], 100);
  assert.equal(index[1], 150); // A raddoppia: 50→100, B fermo a 50
  // a fine gennaio si torna a 50/50: A +10% in febbraio → 150 × (0,5 × 1,1 + 0,5)
  assert.ok(Math.abs(index[2] - 157.5) < 1e-9, String(index[2]));
  const { missing, index: part } = portfolioIndex(dates, { A: closes.A }, { A: 50, B: 50 });
  assert.deepEqual(missing, ['B']);
  assert.equal(part[1], 200); // senza B il portafoglio è tutto A
});

test('universe.json: universi globali coerenti', () => {
  const u = JSON.parse(fs.readFileSync(new URL('../universe.json', import.meta.url)));
  assert.deepEqual(validateGlobal(u.global), []);
  const bad = structuredClone(u.global);
  const g = Object.values(bad.groups).find((x) => x.portfolio);
  g.portfolio.weights[Object.keys(g.portfolio.weights)[0]] -= 10;
  g.benchmarks.push('NOPE.MI');
  const errs = validateGlobal(bad);
  assert.ok(errs.some((e) => e.includes('sommano a 90')), errs.join('; '));
  assert.ok(errs.some((e) => e.includes('NOPE.MI')), errs.join('; '));
});
