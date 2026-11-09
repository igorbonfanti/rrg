// Zoom su un sottoperiodo (js/zoom.js): tratto dal trascinamento, finestre per seduta e per data, tacche dell'asse del tempo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRange, dateAt, countIn, windowIdx, windowTime, timeTicks, sessionTicks, zoomText } from '../js/zoom.js';

// calendario di borsa finto: giorni feriali dal 02/01/2018 al 31/12/2021
const DATES = [];
for (let t = Date.UTC(2018, 0, 2); t <= Date.UTC(2021, 11, 31); t += 86400000) { const d = new Date(t); if (d.getUTCDay() % 6) DATES.push(d.toISOString().slice(0, 10)); }
const n = DATES.length;

test('zoom: tratto dal trascinamento su un grafico per seduta, ordinato e tagliato ai bordi', () => {
  const g = { L: 10, PW: 1000, top: 0, bottom: 100, dates: DATES };
  const ix = (x) => Math.round(((x - 10) / 1000) * (n - 1));
  const r = pickRange(610, 260, g); // da destra a sinistra
  assert.deepEqual(r, [DATES[ix(260)], DATES[ix(610)]]);
  // la data è quella che il riquadro dei valori mostra in quella x
  assert.equal(dateAt(260, g), DATES[ix(260)]);
  assert.deepEqual(pickRange(-50, 5000, g), [DATES[0], DATES[n - 1]]);
  // 9 sedute: niente zoom; 10 sedute: zoom
  const xOf = (i) => 10 + (i / (n - 1)) * 1000;
  assert.equal(pickRange(xOf(100), xOf(108), g), null);
  assert.deepEqual(pickRange(xOf(100), xOf(109), g), [DATES[100], DATES[109]]);
});

test('zoom: tratto su un grafico per data, con la seduta più vicina', () => {
  const t0 = Date.parse('2019-01-01'), t1 = Date.parse('2021-01-01'), g = { L: 0, PW: 731, t0, t1, top: 0, bottom: 1, dates: DATES };
  // un sabato cade sul venerdì o sul lunedì più vicino
  const d = dateAt(Date.parse('2020-03-07') - t0 > 0 ? ((Date.parse('2020-03-07') - t0) / (t1 - t0)) * 731 : 0, g);
  assert.ok(['2020-03-06', '2020-03-09'].includes(d), d);
  const r = pickRange(0, 731, g);
  assert.deepEqual(r, ['2019-01-01', '2021-01-01']); // nel calendario finto il 01/01/2021 è un venerdì di borsa
});

test('zoom: finestra per seduta dentro il periodo, anche con date di sabato; fuori storia resta il periodo', () => {
  const iBase = 200, iEnd = n - 1;
  const w = windowIdx(DATES, iBase, iEnd, ['2020-02-01', '2020-05-16']); // sabato e sabato
  assert.equal(w.zoomed, true);
  assert.equal(DATES[w.i0], '2020-02-03');
  assert.equal(DATES[w.i1], '2020-05-15');
  // lo zoom non va prima dell'inizio del periodo
  const w2 = windowIdx(DATES, iBase, iEnd, ['2017-01-01', '2019-06-28']);
  assert.equal(w2.i0, iBase);
  // zoom prima della storia della serie o con meno di 10 sedute in comune: resta il periodo
  assert.deepEqual(windowIdx(DATES, iBase, iEnd, ['2010-01-01', '2012-01-01']), { i0: iBase, i1: iEnd, zoomed: false });
  assert.deepEqual(windowIdx(DATES, iBase, iEnd, ['2021-12-24', '2022-03-01']), { i0: iBase, i1: iEnd, zoomed: false });
  assert.deepEqual(windowIdx(DATES, iBase, iEnd, null), { i0: iBase, i1: iEnd, zoomed: false });
});

test('zoom: finestra per data, intersezione con il periodo', () => {
  const t0 = Date.parse('2019-01-01'), t1 = Date.parse('2021-12-31');
  assert.deepEqual(windowTime(t0, t1, ['2020-02-03', '2020-05-15'], DATES), [Date.parse('2020-02-03'), Date.parse('2020-05-15')]);
  assert.deepEqual(windowTime(t0, t1, ['2018-06-01', '2019-03-01'], DATES), [t0, Date.parse('2019-03-01')]);
  assert.equal(windowTime(t0, t1, ['2015-01-01', '2016-01-01'], DATES), null);
  assert.equal(windowTime(t0, t1, ['2020-02-03', '2020-02-10'], DATES), null); // 6 sedute
  assert.equal(countIn(DATES, '2020-02-01', '2020-02-29'), 20);
});

test('zoom: tacche dell\'asse del tempo, almeno 2 e al massimo maxN, in ordine e dentro la finestra', () => {
  assert.ok(timeTicks(Date.UTC(1990, 0, 2), Date.UTC(2026, 10, 6), 10).every((t) => /^\d{4}$/.test(t.label)));
  const cases = [['2020-02-20', '2020-03-12'], ['2020-02-03', '2020-04-03'], ['2020-01-02', '2020-08-31'], ['2018-01-02', '2021-01-04'], ['1990-01-02', '2020-01-02']];
  for (const [a, b] of cases) {
    const t0 = Date.parse(a), t1 = Date.parse(b);
    for (const maxN of [4, 6, 10]) {
      const tk = timeTicks(t0, t1, maxN);
      assert.ok(tk.length >= 2 && tk.length <= maxN, `${a}–${b} maxN ${maxN}: ${tk.length}`);
      for (let i = 0; i < tk.length; i++) { assert.ok(tk[i].t > t0 && tk[i].t <= t1); if (i) assert.ok(tk[i].t > tk[i - 1].t); }
    }
  }
  const m = timeTicks(Date.UTC(2008, 2, 15), Date.UTC(2009, 5, 1), 10);
  assert.ok(m.some((t) => t.label === '2009'));
});

test('zoom: tacche per seduta su sedute che esistono', () => {
  const ds = DATES.filter((d) => d >= '2020-02-03' && d <= '2020-04-30');
  const tk = sessionTicks(ds, 6);
  assert.ok(tk.length >= 2 && tk.length <= 6);
  for (const t of tk) assert.ok(t.i > 0 && t.i < ds.length);
  assert.equal(ds[tk.find((t) => t.label === 'mar 20').i], '2020-03-02');
});

test('zoom: testo dell\'etichetta', () => {
  assert.equal(zoomText(['2020-02-03', '2020-05-15']), 'dal 03/02/2020 al 15/05/2020');
});
