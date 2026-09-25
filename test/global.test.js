import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from '../scripts/lib/yahoo.js';
import { alignToCalendar, globalCalendar, pickAsOf, repairSpikes, validateGlobal, marketIndex, dropAfter, keepPublished, withMeta, collectGlobalTickers } from '../scripts/fetch_data.js';
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

test('portafoglio: pesi di oggi e data dell\'ultimo ribilanciamento', () => {
  const dates = ['2026-01-02', '2026-01-30', '2026-02-02', '2026-02-27'];
  const { now, rebalanced } = portfolioIndex(dates, { A: [10, 20, 22, 22], B: [5, 5, 5, 5] }, { A: 50, B: 50 });
  assert.equal(rebalanced, '2026-01-30'); // ultima seduta di gennaio
  // dopo il ribilanciamento A sale del 10%: 55 / 105 del portafoglio
  assert.ok(Math.abs(now.A - (100 * 55) / 105) < 1e-9, String(now.A));
  assert.ok(Math.abs(now.A + now.B - 100) < 1e-9);
  // senza movimenti dopo l'avvio i pesi restano quelli obiettivo
  const flat = portfolioIndex(['2026-03-02', '2026-03-03'], { A: [1, 1], B: [2, 2] }, { A: 70, B: 30 });
  assert.ok(Math.abs(flat.now.A - 70) < 1e-9 && flat.rebalanced === '2026-03-02');
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
  // classi del portafoglio: ogni componente pesata in una e una sola classe
  const cls = structuredClone(u.global);
  const p = Object.values(cls.groups).find((x) => x.portfolio).portfolio;
  const [first, second] = p.classes;
  second.tickers.push(first.tickers[0]); // la stessa componente in due classi
  const lost = p.classes.at(-1).tickers.pop(); // e una componente senza classe
  const e2 = validateGlobal(cls);
  assert.ok(e2.some((e) => e.includes('in più di una classe')), e2.join('; '));
  assert.ok(e2.some((e) => e.includes(`${lost} ha un peso ma non è in nessuna classe`)), e2.join('; '));
});

test('prezzi anomali: un vero crollo a V di tutto il mercato non si corregge', () => {
  // 12 ETF con rumore proprio e un crollo del 6% seguito da un rimbalzo del 6,2% per tutti
  const n = 150, all = [];
  for (let k = 0; k < 12; k++) {
    const c = walk(n, 0.008, 100 + k);
    for (let i = 120; i < n; i++) c[i] *= 0.94;
    for (let i = 121; i < n; i++) c[i] *= 1.062;
    all.push(c);
  }
  const mkt = marketIndex(all, n);
  for (const c of all) assert.equal(repairSpikes(c, mkt).fixes.length, 0);
  // lo stesso salto su un solo ETF, con il mercato fermo, è un errore e si corregge
  const one = walk(n, 0.008, 7); one[120] *= 1.16;
  const flat = [one, ...Array.from({ length: 11 }, (_, k) => walk(n, 0.008, 200 + k))];
  assert.equal(repairSpikes(one, marketIndex(flat, n)).fixes.length, 1);
});

test('niente barre della seduta in corso, tranne le criptovalute', () => {
  const series = {
    'SWDA.MI': { dates: ['2026-09-24', '2026-09-25'], close: [1, 2], adjclose: [1, 2] },
    'BTC-EUR': { dates: ['2026-09-24', '2026-09-25'], close: [1, 2], adjclose: [1, 2] },
  };
  assert.equal(dropAfter(series, '2026-09-24', (s) => s === 'BTC-EUR'), 1);
  assert.deepEqual(series['SWDA.MI'].dates, ['2026-09-24']);
  assert.deepEqual(series['BTC-EUR'].dates, ['2026-09-24', '2026-09-25']);
});

test('una lacuna nuova di Yahoo non cancella un prezzo già pubblicato (riscalato alle rettifiche)', () => {
  const dates = ['2026-09-22', '2026-09-23', '2026-09-24'];
  // nuovo scaricamento: manca il 23 (riempito col 22) e la storia è riscalata del 2% per un dividendo
  const closes = { 'IWDP.MI': [98, 98, 100] };
  const real = { 'IWDP.MI': new Set(['2026-09-22', '2026-09-24']) };
  const prev = { dates: ['2026-09-22', '2026-09-23'], tickers: { 'IWDP.MI': { close: [100, 101] } } };
  assert.equal(keepPublished(dates, closes, real, prev), 1);
  assert.deepEqual(closes['IWDP.MI'], [98, 98.98, 100]);
});

test('calendario globale: la seduta che manca alla maggior parte degli ETF si toglie per tutti', () => {
  const mk = (dates) => ({ dates, adjclose: dates.map(() => 1) });
  const full = ['2025-10-22', '2025-10-23', '2025-10-24', '2025-10-27'];
  const hole = ['2025-10-22', '2025-10-23', '2025-10-27'];
  const series = { A: mk(full), B: mk(hole), C: mk(hole), D: mk(hole), E: mk(['2025-10-27']) };
  assert.deepEqual(globalCalendar(series, '2025-10-27'), ['2025-10-22', '2025-10-23', '2025-10-27']);
});

test('prezzi tenuti: nomi, etichette e gruppi arrivano comunque da universe.json', () => {
  const prev = {
    asOf: '2026-09-24', dates: ['2026-09-23', '2026-09-24'],
    groups: { 'Fattori · livello 2': { defaultBenchmark: 'SWDA.MI', benchmarks: ['SWDA.MI'], tickers: ['EQQQ.MI'] } },
    tickers: {
      'EQQQ.MI': { name: 'Invesco EQQQ', label: 'Growth', groups: ['Fattori · livello 2'], isBenchmark: false, quoteCurrency: 'EUR', close: [500, 505] },
      'SWDA.MI': { name: 'iShares World', label: 'World', groups: [], isBenchmark: true, quoteCurrency: 'EUR', close: [100, 101] },
      'OLD.MI': { name: 'tolto', label: 'Old', groups: ['Fattori · livello 2'], isBenchmark: false, quoteCurrency: 'EUR', close: [1, 1] },
    },
  };
  const G = {
    benchmarks: { 'SWDA.MI': { label: 'World', name: 'iShares World' } },
    groups: { '2 · Fattori': { defaultBenchmark: 'SWDA.MI', benchmarks: ['SWDA.MI'], tickers: { 'EQQQ.MI': { label: 'Growth NDX', name: 'Invesco EQQQ' } } } },
  };
  const groups = { '2 · Fattori': { defaultBenchmark: 'SWDA.MI', benchmarks: ['SWDA.MI'], tickers: ['EQQQ.MI'] } };
  const next = withMeta(prev, groups, collectGlobalTickers(G));
  assert.deepEqual(Object.keys(next.groups), ['2 · Fattori']);
  assert.equal(next.tickers['EQQQ.MI'].label, 'Growth NDX');
  assert.deepEqual(next.tickers['EQQQ.MI'].groups, ['2 · Fattori']);
  assert.deepEqual(next.tickers['EQQQ.MI'].close, [500, 505]); // prezzi intatti
  assert.equal(next.asOf, '2026-09-24');
  assert.deepEqual(next.tickers['OLD.MI'], prev.tickers['OLD.MI']); // fuori dall'universo: resta com'era
  // universo invariato: il file risulta identico, quindi non si riscrive
  const same = withMeta(next, groups, collectGlobalTickers(G));
  assert.equal(JSON.stringify(same), JSON.stringify(next));
});
