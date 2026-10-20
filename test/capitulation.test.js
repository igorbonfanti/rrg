import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeCounts, decodeCounts, dayCounts, capSeries, windowSum, alertLine, capAnalysis, capOutcomes, countsOn, mergeCap, packCap } from '../js/capitulation.js';

test('conteggi in stringa: piccoli, grandi e sedute mancanti tornano uguali', () => {
  const a = [0, 1, 34, 35, 999, null, 46655, 7];
  assert.equal(decodeCounts(encodeCounts(a)).join(), a.join());
  assert.equal(encodeCounts([0, 5, null]), '05-');
});

test('cali di una seduta: soglie, errori di stampa e crolli impossibili', () => {
  // giornata di crollo vero: si contano tutti, anche chi rimbalza il giorno dopo
  const r = [-0.12, -0.08, -0.06, -0.03, -0.02], next = [0.13, 0.01, 0, 0, 0];
  assert.deepEqual(dayCounts(r, next), { n: 5, x5: 3, x7: 2, x10: 1 });
  // giornata tranquilla: il −10% che il giorno dopo torna dov'era è un errore della fonte
  const calm = [-0.1, 0.01, 0, -0.005, 0.002, 0.01], nx = [0.11, 0, 0, 0, 0, 0];
  assert.equal(dayCounts(calm, nx).x5, 0);
  assert.equal(dayCounts(calm, [0.02, 0, 0, 0, 0, 0]).x10, 1); // senza ripresa resta
  assert.equal(dayCounts([-0.7, 0, 0.01, 0], null).x5, 0); // −70% in una giornata normale: frazionamento non registrato
  // giorno di panico seguito dal rimbalzo di tutto il mercato (10 e 13/10/2008): i cali sono veri e contano
  const panic = [-0.09, -0.08, -0.06, 0.01, -0.01, 0], rebound = [0.1, 0.09, 0.07, 0.08, 0.06, 0.09];
  assert.equal(dayCounts(panic, rebound).x7, 2);
  // l'ultima seduta, senza la seduta dopo: nessun filtro (si ricontrolla la sera dopo)
  assert.equal(dayCounts(calm, null).x10, 1);
  assert.deepEqual(dayCounts([null, null], null), { n: 0, x5: 0, x7: 0, x10: 0 });
});

test('rendimenti dei membri: seduta precedente vicina e chiusura rettificata per gli eventi straordinari', () => {
  const prices = {
    A: { dates: ['2026-01-02', '2026-01-05', '2026-01-06'], close: [100, 90, 91] },
    B: { dates: ['2025-12-20', '2026-01-05'], close: [100, 50] }, // seduta prima troppo lontana
    C: { dates: ['2026-01-02', '2026-01-05'], close: [100, 60], adj: [100, 99] }, // spin-off: vale l'adj
  };
  assert.deepEqual(countsOn(['A', 'B', 'C', 'X'], prices, '2026-01-05'), { n: 2, x5: 1, x7: 1, x10: 1 });
});

test('somme su N sedute, in conteggi o in percentuale dei membri', () => {
  const s = { n: [10, 10, 20, 20], x7: [1, 0, 2, 4] };
  assert.deepEqual(windowSum(s, { thr: 7, win: 2 }).sum, [null, 1, 2, 6]);
  assert.deepEqual(windowSum(s, { thr: 7, win: 2, mode: 'pct' }).sum, [null, 10, 10, 30]);
  assert.deepEqual(windowSum({ n: [10, 10, 10], x7: [1, null, 1] }, { thr: 7, win: 2 }).sum, [null, null, null]);
});

test('soglia di allerta: solo le sedute precedenti, dopo il riscaldamento', () => {
  const sum = [1, 2, 3, 4, 100, 5];
  const a = alertLine(sum, { q: 1, warm: 3 });
  assert.deepEqual(a, [null, null, null, 3, 4, 100]);
});

test('episodi: sedute in allerta raggruppate, sedute in allerta contate, situazione di oggi', () => {
  const L = 40, x7 = new Array(L).fill(0), n = new Array(L).fill(100);
  x7[20] = 30; x7[24] = 30; x7[38] = 40; // due episodi: 20–24 (stesso episodio) e 38
  const s = { n, x7 };
  const a = capAnalysis(s, { thr: 7, win: 1, warm: 10, q: 0.99, gap: 10, min: 5, look: 10 });
  assert.equal(a.episodes.length, 2);
  assert.deepEqual([a.episodes[0].start, a.episodes[0].end, a.episodes[0].days], [20, 24, 2]);
  assert.equal(a.episodes[1].peak, 40);
  assert.equal(a.today.on, false);
  assert.equal(a.today.recent, 1);
  // il minimo di cali: 3 titoli non bastano
  const b = capAnalysis({ n, x7: x7.map((v) => (v ? 3 : 0)) }, { thr: 7, win: 1, warm: 10, min: 5 });
  assert.equal(b.episodes.length, 0);
});

test('dopo l episodio: calo dal massimo a 52 settimane, ulteriore calo, rendimenti e confronto', () => {
  const pd = [], close = [];
  for (let i = 0; i < 400; i++) { pd.push(new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString().slice(0, 10)); close.push(i < 100 ? 100 : i < 110 ? 80 : 80 + (i - 110) * 0.1); }
  const ep = [{ start: 0, end: 0, days: 1, peak: 50 }];
  const { rows, base } = capOutcomes(ep, [pd[100]], pd, close);
  assert.ok(Math.abs(rows[0].dd52 + 0.2) < 1e-9);
  assert.equal(rows[0].fall63, 0);
  assert.ok(rows[0].r63 > 0 && rows[0].r252 > 0);
  assert.ok(base.r63 != null);
});

test('aggiornamento del file: sedute nuove in ordine, sedute presenti sostituite', () => {
  const x = packCap({ dates: ['2026-01-02', '2026-01-05'], n: [10, 10], x5: [1, 2], x7: [0, 1], x10: [0, 0] });
  const y = mergeCap(x, { '2026-01-05': { n: 11, x5: 3, x7: 2, x10: 1 }, '2026-01-06': { n: 12, x5: 0, x7: 0, x10: 0 } });
  const s = capSeries(y);
  assert.deepEqual(s.dates, ['2026-01-02', '2026-01-05', '2026-01-06']);
  assert.deepEqual(s.n, [10, 11, 12]);
  assert.deepEqual(s.x7, [0, 2, 0]);
  assert.deepEqual(capSeries(mergeCap(null, { '2026-01-02': { n: 5, x5: 1, x7: 1, x10: 0 } })).x5, [1]);
});

test('sera: cali forti per settore e S&P 500 dalle chiusure dei membri', async () => {
  const { capRows } = await import('../scripts/fetch_breadth.js');
  const mk = (c) => ({ dates: ['2026-01-02', '2026-01-05'], close: c, index: new Map([['2026-01-02', 0], ['2026-01-05', 1]]) });
  const members = [{ s: 'A', sector: 'XLK' }, { s: 'B', sector: 'XLK' }, { s: 'C', sector: 'XLE' }];
  const rows = capRows(members, { A: mk([100, 92]), B: mk([100, 101]), C: mk([100, 80]) }, ['2026-01-05']);
  assert.deepEqual(rows.XLK['2026-01-05'], { n: 2, x5: 1, x7: 1, x10: 0 });
  assert.deepEqual(rows.SPX['2026-01-05'], { n: 3, x5: 2, x7: 2, x10: 1 });
  assert.equal(rows.XLU['2026-01-05'].n, 0);
});

test('esiti degli episodi: senza il prezzo quel giorno i valori mancano, non sono NaN', async () => {
  const { capOutcomes } = await import('../js/capitulation.js');
  const pDates = Array.from({ length: 300 }, (_, i) => `d${String(i).padStart(3, '0')}`);
  const close = pDates.map((_, i) => (i < 50 ? null : 100 + i));
  const { rows } = capOutcomes([{ start: 10, end: 12, days: 3, peak: 9 }], pDates, pDates, close);
  for (const k of ['dd52', 'fall63', 'r63', 'r252']) assert.equal(rows[0][k], null, k);
});
