import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawdown, depthPercentile, priceMetrics, priceHigh, priceDrawdown } from '../js/metrics.js';

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

test('massimo a 52 settimane sul solo prezzo: massimo intraday nella finestra e ultima chiusura', () => {
  const s = { dates: ['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'], close: [10, 12, 11, 9], high: [15, 12.5, null, 9.2] };
  // il 2 gennaio è fuori finestra; il 6 manca il massimo della seduta e vale la chiusura
  assert.deepEqual(priceHigh(s, '2026-01-05', '2026-01-07'), { hi: 12.5, d: '2026-01-05', c: 9 });
  assert.deepEqual(priceHigh(s, '2026-01-02', '2026-01-06'), { hi: 15, d: '2026-01-02', c: 11 });
  // senza massimi intraday contano le chiusure
  assert.deepEqual(priceHigh({ dates: s.dates, close: s.close }, '2026-01-01', '2026-01-07'), { hi: 12, d: '2026-01-05', c: 9 });
  assert.equal(priceHigh(s, '2027-01-01', '2027-12-31'), null);
  // XLU al 29/09/2026: massimo intraday 47,80 del 27/02, chiusura 39,71
  assert.equal(Math.round(priceDrawdown({ hi: 47.8, d: '2026-02-27', c: 39.71 }) * 10) / 10, -16.9);
  assert.equal(priceDrawdown(null), null);
});
