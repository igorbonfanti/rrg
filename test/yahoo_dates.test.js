import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../scripts/lib/yahoo.js';

// Barre di Yahoo datate nel fuso della borsa con l'ora legale di quel giorno, non con il gmtoffset di oggi.
// Errore riprodotto in ricerca/qa/date-barre/: lanciato d'inverno, EURUSD=X datava le barre estive al giorno prima
// (760 barre su 1305 in 5 anni, 152 finite di domenica) e DX-Y.NYB 997 barre (6 date doppie, una barra persa per ognuna).
const T = (iso) => Date.parse(iso) / 1000;
const bars = (meta, iso) => ({
  meta: { instrumentType: 'CURRENCY', ...meta },
  timestamp: iso.map(T),
  indicators: { quote: [{ close: iso.map((_, i) => 1 + i / 100) }], adjclose: [{ adjclose: iso.map((_, i) => 1 + i / 100) }] },
});
const WINTER = T('2026-11-05T12:00:00Z'), SUMMER = T('2026-07-15T12:00:00Z');

test('Yahoo: cambi (Europe/London) datati con l\'ora legale della barra, qualunque sia il giorno del download', () => {
  // EURUSD=X: 1751324400 = 30/06/2025 23:00 UTC = 01/07/2025 00:00 a Londra; d'inverno la barra è alle 00:00 UTC
  const iso = ['2025-06-26T23:00:00Z', '2025-06-29T23:00:00Z', '2025-06-30T23:00:00Z', '2025-12-01T00:00:00Z'];
  const want = ['2025-06-30', '2025-07-01', '2025-12-01'];
  assert.equal(T(iso[2]), 1751324400);
  for (const [gmtoffset, now] of [[0, WINTER], [3600, SUMMER]]) {
    const p = parse(bars({ gmtoffset, exchangeTimezoneName: 'Europe/London', timezone: gmtoffset ? 'BST' : 'GMT' }, iso), { nowSec: now });
    assert.deepEqual(p.dates, ['2025-06-27', ...want], `gmtoffset ${gmtoffset}`);
    assert.ok(!p.dates.includes('2025-06-29'), 'nessuna barra di domenica');
  }
});

test('Yahoo: DX-Y.NYB (America/New_York, barre a mezzanotte) senza date doppie né spostate', () => {
  const iso = ['2025-06-30T04:00:00Z', '2025-07-01T04:00:00Z', '2025-12-01T05:00:00Z', '2025-12-02T05:00:00Z'];
  for (const [gmtoffset, now] of [[-18000, WINTER], [-14400, SUMMER]]) {
    const p = parse(bars({ gmtoffset, exchangeTimezoneName: 'America/New_York', instrumentType: 'INDEX' }, iso), { nowSec: now });
    assert.deepEqual(p.dates, ['2025-06-30', '2025-07-01', '2025-12-01', '2025-12-02'], `gmtoffset ${gmtoffset}`);
    assert.equal(p.close.length, 4);
  }
});

test('Yahoo: senza exchangeTimezoneName si usa ancora il gmtoffset', () => {
  const p = parse(bars({ gmtoffset: 3600 }, ['2025-07-01T07:00:00Z', '2025-07-01T23:30:00Z']), { nowSec: WINTER });
  assert.deepEqual(p.dates, ['2025-07-01', '2025-07-02']);
});
