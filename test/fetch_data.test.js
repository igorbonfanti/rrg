import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignSeries, pickAsOf } from '../scripts/fetch_data.js';

test('asOf = ultima data comune, esclusi i ticker fermi da giorni', () => {
  const r = pickAsOf({ SPY: '2026-09-23', XLK: '2026-09-22', XLU: '2026-09-23', OLD: '2026-09-01' });
  assert.equal(r.asOf, '2026-09-22');
  assert.equal(r.maxDate, '2026-09-23');
  assert.deepEqual(r.stale, ['OLD']);
});

test('allineamento: niente code ricopiate, lacune interne riempite', () => {
  const series = {
    SPY: { dates: ['2026-09-18', '2026-09-21', '2026-09-22'], adjclose: [1, 2, 3] },
    XLK: { dates: ['2026-09-17', '2026-09-21'], adjclose: [10, 20] },
  };
  const { dates, closes } = alignSeries(series, '2026-09-21');
  assert.deepEqual(dates, ['2026-09-17', '2026-09-18', '2026-09-21']);
  assert.deepEqual(closes.SPY, [null, 1, 2]);
  assert.deepEqual(closes.XLK, [10, 10, 20]);
});
