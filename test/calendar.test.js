import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holidays, isTradingDay, prevTradingDay, expectedSession, sessionsBetween } from '../js/calendar.js';

test('festività NYSE 2026', () => {
  const h = holidays(2026);
  for (const d of ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25']) {
    assert.ok(h.has(d), d);
  }
  assert.equal(h.size, 10);
});

test('festività spostate e Capodanno di sabato', () => {
  assert.ok(holidays(2021).has('2021-12-24')); // Natale di sabato → venerdì
  assert.ok(!holidays(2022).has('2021-12-31')); // Capodanno 2022 di sabato: nessun recupero
  assert.ok(holidays(2023).has('2023-01-02')); // Capodanno di domenica → lunedì
  assert.ok(holidays(2025).has('2025-04-18')); // Venerdì santo
  assert.ok(!holidays(2021).has('2021-06-18')); // Juneteenth solo dal 2022
});

test('sedute e seduta attesa', () => {
  assert.equal(isTradingDay('2026-09-07'), false); // Labor Day
  assert.equal(prevTradingDay('2026-09-08'), '2026-09-04');
  // 24/09/2026 00:40 UTC = 23/09 sera a New York → attesa la seduta del 23
  assert.equal(expectedSession(new Date('2026-09-24T00:40:00Z')), '2026-09-23');
  // 23/09 alle 15:00 a New York: seduta non ancora chiusa → attesa quella del 22
  assert.equal(expectedSession(new Date('2026-09-23T19:00:00Z')), '2026-09-22');
  // sabato → venerdì
  assert.equal(expectedSession(new Date('2026-09-26T15:00:00Z')), '2026-09-25');
  assert.equal(sessionsBetween('2026-09-21', '2026-09-23'), 2);
  assert.equal(sessionsBetween('2026-09-04', '2026-09-08'), 1); // salta il Labor Day
  assert.equal(sessionsBetween('2026-09-23', '2026-09-23'), 0);
});
