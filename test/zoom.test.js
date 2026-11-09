// Zoom su un sottoperiodo (js/zoom.js, prototipo): intervallo dal trascinamento e tacche dell'asse del tempo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRange, timeTicks } from '../js/zoom.js';

const D = 86400000, g = { L: 10, PW: 1000, t0: Date.UTC(2008, 0, 1), t1: Date.UTC(2010, 0, 1) };
test('zoom: intervallo dal trascinamento, ordinato, dentro la finestra, almeno 10 giorni', () => {
  const r = pickRange(510, 260, g); // da destra a sinistra
  assert.ok(r[0] < r[1]);
  assert.ok(Math.abs(r[0] - (g.t0 + 0.25 * (g.t1 - g.t0))) <= D && Math.abs(r[1] - (g.t0 + 0.5 * (g.t1 - g.t0))) <= D);
  assert.deepEqual(pickRange(-50, 2000, g), [g.t0, g.t1]); // oltre i bordi: tagliato alla finestra
  assert.equal(pickRange(500, 503, g), null); // troppo corto
});
test('zoom: tacche dell\'asse del tempo adatte alla durata', () => {
  assert.ok(timeTicks(Date.UTC(1990, 0, 2), Date.UTC(2026, 10, 6), 10).every((t) => /^\d{4}$/.test(t.label)));
  const m = timeTicks(Date.UTC(2008, 2, 15), Date.UTC(2009, 5, 1), 10);
  assert.ok(m.length >= 3 && m.length <= 10 && m.some((t) => t.label === '2009'));
  const w = timeTicks(Date.UTC(2020, 1, 20), Date.UTC(2020, 2, 25), 6);
  assert.ok(w.length >= 2 && w.length <= 6);
  for (const s of [m, w]) for (let i = 1; i < s.length; i++) assert.ok(s[i].t > s[i - 1].t);
});
