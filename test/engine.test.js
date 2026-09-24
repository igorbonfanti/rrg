import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build, rrgNew, stats, weeklyIndices, quadrant } from '../js/engine.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/prices.json', import.meta.url)));
const sectors = data.groups['Settori S&P 500'].tickers;

// serie sintetica: benchmark piatto, titolo con trend relativo costante + rumore deterministico
function synthetic(drift, n = 300, seed = 7) {
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 - 0.5; };
  const sym = [], bench = [];
  let lr = 0;
  for (let i = 0; i < n; i++) { lr += drift + 0.01 * rnd(); sym.push(100 * Math.exp(lr)); bench.push(100); }
  return { sym, bench };
}

test('formula nuova: un trend più forte finisce più a destra', () => {
  const avg = (d) => { const { sym, bench } = synthetic(d); const r = rrgNew(sym, bench).rsRatio.slice(150); return r.reduce((a, b) => a + b, 0) / r.length; };
  const a = avg(0.002), b = avg(0.004), c = avg(0.008);
  assert.ok(a > 100 && b > a && c > b, `${a} ${b} ${c}`);
});

test('formula nuova: nessun valore prima del riscaldamento, poi sempre definito', () => {
  const { sym, bench } = synthetic(0.001);
  const r = rrgNew(sym, bench);
  assert.equal(r.rsRatio[20], null);
  assert.ok(r.rsRatio.slice(40).every((v) => Number.isFinite(v)));
  assert.ok(r.rsMomentum.slice(40).every((v) => Number.isFinite(v)));
});

test('formula classica invariata rispetto alla prima versione (XLU al 22/09/2026)', () => {
  // dati congelati: gli stessi prezzi su cui girava la prima versione dell'app
  const frozen = JSON.parse(fs.readFileSync(new URL('./fixtures/prices_381de6a.json', import.meta.url)));
  const m = build(frozen, { symbols: ['XLU'], benchmark: 'SPY', timeframe: 'weekly', formula: 'classica' });
  const f = m.dates.indexOf('2026-09-22');
  assert.ok(f > 0);
  assert.ok(Math.abs(m.series.XLU.x[f] - 98.41) < 0.01, String(m.series.XLU.x[f]));
  assert.ok(Math.abs(m.series.XLU.y[f] - 100.14) < 0.01, String(m.series.XLU.y[f]));
});

test('direzione in gradi bussola e quadranti', () => {
  const ser = { x: [99, 101, 101, 100], y: [99, 99, 101, 101] };
  assert.equal(Math.round(stats(ser, 1, 10).heading), 90); // verso est
  assert.equal(Math.round(stats(ser, 2, 10).heading), 0); // verso nord
  assert.equal(Math.round(stats(ser, 3, 10).heading), 270); // verso ovest
  assert.equal(stats(ser, 2, 10).q, 'Leading');
  assert.equal(stats(ser, 2, 10).prev, 'Weakening');
  assert.equal(quadrant(99, 101), 'Improving');
  assert.equal(quadrant(99, 99), 'Lagging');
});

test('campionamento settimanale e settimana provvisoria', () => {
  const dates = ['2026-09-14', '2026-09-15', '2026-09-18', '2026-09-21', '2026-09-22'];
  assert.deepEqual(weeklyIndices(dates), [2, 4]);
  const tickers = { A: { close: [1, 2, 3, 4, 5] }, B: { close: [1, 1, 1, 1, 1] } };
  assert.equal(build({ dates, tickers }, { symbols: ['A'], benchmark: 'B', timeframe: 'weekly' }).provisional, true);
  const full = ['2026-09-14', '2026-09-18'];
  assert.equal(build({ dates: full, tickers: { A: { close: [1, 2] }, B: { close: [1, 1] } } }, { symbols: ['A'], benchmark: 'B', timeframe: 'weekly' }).provisional, false);
});

test('dati reali: tutti i settori hanno valori finiti dall\'inizio valido in poi', () => {
  for (const formula of ['nuova', 'classica']) {
    const m = build(data, { symbols: sectors, benchmark: 'SPY', timeframe: 'weekly', formula });
    assert.ok(m.start < m.dates.length - 52, formula);
    for (const s of sectors) for (let i = m.start; i < m.dates.length; i++) assert.ok(Number.isFinite(m.series[s].x[i]) && Number.isFinite(m.series[s].y[i]), `${formula} ${s} ${i}`);
  }
});
