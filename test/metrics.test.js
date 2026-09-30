import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawdown, depthPercentile, priceMetrics, closeHigh, intradayHigh, priceDrawdown } from '../js/metrics.js';

test('drawdown dal massimo mobile', () => {
  const dd = drawdown([100, 110, 99, 121, 60.5], 252);
  assert.deepEqual(dd.map((v) => Math.round(v * 10) / 10), [0, 0, -10, 0, -50]);
  // finestra corta: il vecchio massimo esce dalla finestra
  assert.equal(Math.round(drawdown([200, 100, 100, 100], 2)[3]), 0);
});

test('percentile di profondità usa solo la storia passata', () => {
  const dd = [0, -1, -2, -3, -10, -5];
  const p = depthPercentile(dd, 3);
  assert.equal(p[2], null);
  assert.equal(p[3], 100); // -3 più profondo di 0, -1, -2
  assert.equal(p[4], 100);
  assert.equal(p[5], 80); // -5: meno profondo solo di -10
});

test('metriche a fine serie', () => {
  const dates = Array.from({ length: 300 }, (_, i) => new Date(Date.UTC(2025, 0, 2 + i)).toISOString().slice(0, 10));
  const close = dates.map((_, i) => 100 + i);
  const m = priceMetrics(dates, close);
  assert.equal(m.last, 399);
  assert.equal(m.dd52, 0);
  assert.ok(m.vs200 > 0);
  assert.equal(Math.round(m.d1 * 1000) / 1000, Math.round((399 / 398 - 1) * 100 * 1000) / 1000);
});

test('chiusura più alta nel periodo e ultima chiusura; massimo intraday a parte', () => {
  const dates = ['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'], close = [10, 12, null, 9];
  // il 2 gennaio è fuori periodo; le chiusure mancanti si saltano
  assert.deepEqual(closeHigh(dates, close, '2026-01-05', '2026-01-07'), { hi: 12, d: '2026-01-05', c: 9 });
  assert.deepEqual(closeHigh(dates, close, '2026-01-01', '2026-01-02'), { hi: 10, d: '2026-01-02', c: 10 });
  assert.equal(closeHigh(dates, close, '2027-01-01', '2027-12-31'), null);
  // massimo intraday: senza il dato della seduta vale la chiusura
  const s = { dates, close: [10, 12, 11, 9], high: [15, 12.5, null, 9.2] };
  assert.deepEqual(intradayHigh(s, '2026-01-05', '2026-01-07'), { ih: 12.5, id: '2026-01-05' });
  assert.deepEqual(intradayHigh({ dates, close: s.close }, '2026-01-01', '2026-01-07'), { ih: 12, id: '2026-01-05' });
  // XLU al 29/09/2026: chiusura più alta 47,73 del 27/02, ultima 39,71
  assert.equal(Math.round(priceDrawdown({ hi: 47.73, d: '2026-02-27', c: 39.71 }) * 10) / 10, -16.8);
  assert.equal(priceDrawdown(null), null);
});
