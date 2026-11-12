// Distanza dal massimo storico (1.10.0, vista 8 VIX): calcolo, casi limite, ordine delle righe, riga pubblicata tenuta,
// controllo dei dati fermi. Sulla 1.9.1 fallisce: js/ath.js e scripts/fetch_ath.js non esistono.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { athStats, athRows, daysBetween } from '../js/ath.js';
import { pickStats } from '../scripts/fetch_ath.js';
import { staleData } from '../scripts/check_fresh.js';
import { decodeDates } from '../js/indexdata.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url)));
const D = ['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'];

test('massimo storico: distanza, giorni, calo più profondo dopo il massimo', () => {
  const s = athStats(D, [100, 120, 90, 96, 108], [101, 125, 95, 99, 110]);
  assert.equal(s.ath, 120); assert.equal(s.athDate, '2026-01-05');
  assert.equal(s.distPct, -10); assert.equal(s.days, 3);
  assert.equal(s.cycleLow, 90); assert.equal(s.cycleLowDate, '2026-01-06'); assert.equal(s.cycleLowPct, -25);
  assert.equal(s.fromLowPct, 20); assert.equal(s.belowZero, null);
  assert.equal(s.intradayAth, 125); assert.equal(s.intradayAthDate, '2026-01-05');
  assert.equal(s.start, '2026-01-02'); assert.equal(s.lastDate, '2026-01-08');
});

test('massimo storico: nuovo massimo all\'ultima seduta, parità, chiusura sotto zero', () => {
  const top = athStats(D, [100, 101, 102, 103, 104]);
  assert.equal(top.distPct, 0); assert.equal(top.days, 0);
  assert.equal(top.cycleLow, null); assert.equal(top.cycleLowPct, null);
  // parità: vale la prima data
  const tie = athStats(D, [100, 120, 110, 120, 115]);
  assert.equal(tie.athDate, '2026-01-05'); assert.equal(tie.days, 3); assert.equal(tie.cycleLow, 110);
  // chiusura ≤ 0 dopo il massimo (WTI 20/04/2020): niente calo più profondo né risalita
  const neg = athStats(D, [50, 60, 10, -5, 30]);
  assert.equal(neg.belowZero, '2026-01-07'); assert.equal(neg.cycleLowPct, null); assert.equal(neg.fromLowPct, null);
  assert.equal(neg.distPct, -50);
  assert.equal(athStats([], []), null);
});

test('massimo storico: valori reali uguali allo script della ricerca (S&P 500 e future WTI al 11/11/2026)', () => {
  const F = read('test/fixtures/ath_spx_wti.json');
  for (const k of ['SPX', 'WTI']) {
    const x = F[k], s = athStats(decodeDates(x.dates.d0, x.dates.gaps), x.close, x.high), r = x.expected;
    for (const f of ['ath', 'athDate', 'last', 'lastDate', 'distPct', 'intradayAth', 'intradayAthDate', 'max52w', 'max52wDate', 'dist52wPct']) assert.equal(s[f], r[f], `${k} ${f}`);
    assert.equal(s.days, r.daysSinceAth, `${k} giorni`);
    if (k === 'SPX') { assert.equal(s.cycleLow, r.cycleLow); assert.equal(s.cycleLowPct, r.cycleLowPct); assert.equal(s.fromLowPct, r.fromCycleLowPct); }
    else { assert.equal(s.belowZero, '2020-04-20'); assert.equal(s.cycleLowPct, null); }
  }
});

test('massimo storico: ordine per distanza o per data del massimo, mercati senza dati in fondo', () => {
  const m = [
    { id: 'A', stats: { distPct: -5, athDate: '2026-10-01' } }, { id: 'B', stats: null },
    { id: 'C', stats: { distPct: -40, athDate: '2008-07-03' } }, { id: 'D', stats: { distPct: -5, athDate: '2025-10-06' } },
  ];
  assert.deepEqual(athRows(m, 'dist').map((x) => x.id), ['C', 'A', 'D', 'B']); // parità: ordine del file
  assert.deepEqual(athRows(m, 'date').map((x) => x.id), ['C', 'D', 'A', 'B']);
  assert.deepEqual(athRows(null, 'dist'), []);
});

test('massimo storico: riga pubblicata tenuta se il mercato non arriva, è più vecchio o ha la storia accorciata', () => {
  const prev = { start: '2000-08-23', lastDate: '2026-11-10', ath: 145.29 };
  assert.deepEqual(pickStats(null, prev), { stats: prev, kept: true, why: 'non arrivato' });
  assert.equal(pickStats(null, null).stats, null);
  assert.equal(pickStats({ start: '2000-08-23', lastDate: '2026-11-07' }, prev).kept, true);
  assert.equal(pickStats({ start: '2010-01-04', lastDate: '2026-11-11' }, prev).kept, true);
  const fresh = { start: '2000-08-23', lastDate: '2026-11-11' };
  assert.deepEqual(pickStats(fresh, prev), { stats: fresh, kept: false, why: null });
  assert.equal(daysBetween('2026-01-01', '2026-03-01'), 59);
});

test('dati fermi: ogni mercato della distanza dal massimo con il suo limite (KOSPI 12 giorni)', () => {
  const base = { breadth: { asOf: '2026-11-11' } };
  const ath = (k, b) => ({ markets: [{ id: 'SPX', stats: { lastDate: '2026-11-11' } }, { id: 'KOSPI', stats: { lastDate: k } }, { id: 'BTC', stats: b === null ? null : { lastDate: b || '2026-11-12' } }] });
  const lim = { SPX: 4, KOSPI: 12, BTC: 4 };
  assert.deepEqual(staleData({ ...base, ath: ath('2026-10-31'), athMaxAge: lim }, '2026-11-12'), []); // 11 giorni: festa coreana
  const p = staleData({ ...base, ath: ath('2026-10-20', null), athMaxAge: lim }, '2026-11-12');
  assert.equal(p.length, 2, p.join(' | '));
  assert.ok(p.some((x) => /ath\.json: KOSPI: fermo al 2026-10-20/.test(x)) && p.some((x) => /ath\.json: BTC: senza data/.test(x)));
  assert.deepEqual(staleData({ ...base, ath: {} }, '2026-11-12'), ['ath.json: illeggibile o senza mercati']);
  assert.deepEqual(staleData(base, '2026-11-12'), []); // file non ancora creato: nessun controllo
});

test('massimo storico: configurazione e file dei dati coerenti', { skip: !fs.existsSync(new URL('../data/ath.json', import.meta.url)) && 'data/ath.json assente' }, () => {
  const C = read('config/ath.json').markets, A = read('data/ath.json');
  assert.deepEqual(A.markets.map((m) => m.id), C.map((m) => m.id));
  assert.ok(C.every((m) => m.id && m.label && m.symbol && m.kind && m.maxAge > 0));
  assert.ok(!C.some((m) => m.symbol === 'USO'), 'niente USO: il suo massimo non è quello del petrolio');
  for (const m of A.markets) if (m.stats) {
    const s = m.stats;
    assert.ok(s.distPct <= 0 && s.ath >= s.last && s.athDate <= s.lastDate && s.start <= s.athDate, m.id);
    assert.equal(s.days, daysBetween(s.athDate, s.lastDate), m.id);
  }
});
