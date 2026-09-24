import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawdown, depthPercentile, priceMetrics } from '../js/metrics.js';

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
