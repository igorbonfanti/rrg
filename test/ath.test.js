// Distanza dal massimo degli ultimi 3 anni (1.10.0, vista 8 VIX): calcolo, casi limite, ordine delle righe, riga pubblicata tenuta,
// controllo dei dati fermi. Sulla 1.9.1 fallisce: js/ath.js e scripts/fetch_ath.js non esistono.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { athStats, athRows, daysBetween, windowStart } from '../js/ath.js';
import { pickStats, prevRowOf } from '../scripts/fetch_ath.js';
import { staleData } from '../scripts/check_fresh.js';
import { decodeDates } from '../js/indexdata.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url)));
const D = ['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'];

test('massimo dei 3 anni: distanza, giorni, calo più profondo dopo il massimo', () => {
  const s = athStats(D, [100, 120, 90, 96, 108], [101, 125, 95, 99, 110]);
  assert.equal(s.ref, 120); assert.equal(s.refDate, '2026-01-05');
  assert.equal(s.distPct, -10); assert.equal(s.days, 3);
  assert.equal(s.cycleLow, 90); assert.equal(s.cycleLowDate, '2026-01-06'); assert.equal(s.cycleLowPct, -25);
  assert.equal(s.fromLowPct, 20); assert.equal(s.belowZero, null);
  assert.equal(s.intradayRef, 125); assert.equal(s.intradayRefDate, '2026-01-05');
  assert.equal(s.start, '2026-01-02'); assert.equal(s.lastDate, '2026-01-08'); assert.equal(s.from, '2023-01-08');
  assert.equal(s.ath, 120); assert.equal(s.athDistPct, -10);
});

test('massimo dei 3 anni: il massimo di sempre più vecchio resta fuori dal riferimento', () => {
  const d = ['2008-07-03', '2020-04-20', '2023-11-10', '2023-11-13', '2026-04-07', '2026-07-06', '2026-11-11'];
  const s = athStats(d, [145, -37, 99, 77, 112, 68, 86]);
  assert.equal(s.from, '2023-11-11');
  assert.equal(s.refDate, '2026-04-07'); assert.equal(s.ref, 112); // 99 del 10/11/2023 è un giorno fuori dalla finestra
  assert.equal(s.distPct, -23.21); assert.equal(s.cycleLowDate, '2026-07-06');
  assert.equal(s.ath, 145); assert.equal(s.athDate, '2008-07-03'); assert.equal(s.athDistPct, -40.69);
  assert.equal(s.belowZero, null); // la chiusura sotto zero del 2020 è prima del massimo di riferimento
  assert.equal(windowStart('2028-02-29'), '2025-02-28');
});

test('massimo dei 3 anni: nuovo massimo all\'ultima seduta, parità, chiusura sotto zero', () => {
  const top = athStats(D, [100, 101, 102, 103, 104]);
  assert.equal(top.distPct, 0); assert.equal(top.days, 0);
  assert.equal(top.cycleLow, null); assert.equal(top.cycleLowPct, null);
  const tie = athStats(D, [100, 120, 110, 120, 115]);
  assert.equal(tie.refDate, '2026-01-05'); assert.equal(tie.days, 3); assert.equal(tie.cycleLow, 110);
  const neg = athStats(D, [50, 60, 10, -5, 30]);
  assert.equal(neg.belowZero, '2026-01-07'); assert.equal(neg.cycleLowPct, null); assert.equal(neg.fromLowPct, null);
  assert.equal(neg.distPct, -50);
  assert.equal(athStats([], []), null);
});

test('massimo dei 3 anni: valori reali uguali agli script della ricerca (S&P 500 e future WTI al 11/11/2026)', () => {
  const F = read('test/fixtures/ath_spx_wti.json');
  for (const k of ['SPX', 'WTI']) {
    const x = F[k], s = athStats(decodeDates(x.dates.d0, x.dates.gaps), x.close, x.high), r = x.expected, r3 = x.expected3y;
    // massimo di sempre (dati.mjs) e massimo dei 3 anni (confronto.mjs), due script diversi dal nostro
    assert.equal(s.ath, r.ath, `${k} massimo di sempre`); assert.equal(s.athDate, r.athDate); assert.equal(s.athDistPct, r.distPct);
    assert.equal(s.last, r.last); assert.equal(s.lastDate, r.lastDate);
    assert.equal(s.refDate, r3.refDate, `${k} data del massimo dei 3 anni`); assert.ok(Math.abs(s.distPct - r3.distPct1) <= 0.05 + 1e-9, `${k} distanza ${s.distPct} contro ${r3.distPct1} (un decimale)`);
  }
  // S&P 500: il massimo dei 3 anni è anche quello di sempre, quindi tutti i campi di dati.mjs valgono
  const x = F.SPX, s = athStats(decodeDates(x.dates.d0, x.dates.gaps), x.close, x.high), r = x.expected;
  assert.equal(s.ref, r.ath); assert.equal(s.days, r.daysSinceAth); assert.equal(s.cycleLow, r.cycleLow); assert.equal(s.cycleLowPct, r.cycleLowPct);
  assert.equal(s.fromLowPct, r.fromCycleLowPct); assert.equal(s.intradayRef, r.intradayAth); assert.equal(s.intradayRefDate, r.intradayAthDate);
});

test('massimo dei 3 anni: ordine per distanza o per data del massimo, mercati senza dati in fondo', () => {
  const m = [
    { id: 'A', stats: { distPct: -5, refDate: '2026-10-01' } }, { id: 'B', stats: null },
    { id: 'C', stats: { distPct: -40, refDate: '2024-07-03' } }, { id: 'D', stats: { distPct: -5, refDate: '2025-10-06' } },
  ];
  assert.deepEqual(athRows(m, 'dist').map((x) => x.id), ['C', 'A', 'D', 'B']); // parità: ordine del file
  assert.deepEqual(athRows(m, 'date').map((x) => x.id), ['C', 'D', 'A', 'B']);
  assert.deepEqual(athRows(null, 'dist'), []);
});

test('massimo dei 3 anni: riga pubblicata tenuta se il mercato non arriva, è più vecchio o ha la storia accorciata', () => {
  const prev = { start: '2000-08-23', lastDate: '2026-11-10', ath: 145.29 };
  assert.deepEqual(pickStats(null, prev), { stats: prev, kept: true, why: 'non arrivato' });
  assert.equal(pickStats(null, null).stats, null);
  assert.equal(pickStats({ start: '2000-08-23', lastDate: '2026-11-07' }, prev).kept, true);
  assert.equal(pickStats({ start: '2000-08-23', lastDate: '2026-11-07' }, prev).soft, true); // seduta più vecchia: riga tenuta, nessun errore
  assert.ok(!pickStats(null, prev).soft && !pickStats({ start: '2010-01-04', lastDate: '2026-11-11' }, prev).soft); // non arrivato o accorciato: errore
  assert.equal(pickStats({ start: '2010-01-04', lastDate: '2026-11-11' }, prev).kept, true);
  const fresh = { start: '2000-08-23', lastDate: '2026-11-11' };
  assert.deepEqual(pickStats(fresh, prev), { stats: fresh, kept: false, why: null });
  assert.equal(daysBetween('2026-01-01', '2026-03-01'), 59);
});

test('dati fermi: ogni mercato della distanza dal massimo con il suo limite (KOSPI 12 giorni)', () => {
  const base = { breadth: { asOf: '2026-11-11' } };
  const ath = (k, b) => ({ markets: [{ id: 'SPX', stats: { lastDate: '2026-11-11' } }, { id: 'KOSPI', stats: { lastDate: k } }, { id: 'BTC', stats: b === null ? null : { lastDate: b || '2026-11-12' } }] });
  const lim = { SPX: 4, KOSPI: 12, BTC: 4 };
  assert.deepEqual(staleData({ ...base, ath: ath('2026-10-31'), athMaxAge: lim }, '2026-11-12'), []); // 11 giorni: festa coreana
  const p = staleData({ ...base, ath: ath('2026-10-20', null), athMaxAge: lim }, '2026-11-12');
  assert.equal(p.length, 2, p.join(' | '));
  assert.ok(p.some((x) => /ath\.json: KOSPI: fermo al 2026-10-20/.test(x)) && p.some((x) => /ath\.json: BTC: senza data/.test(x)));
  assert.deepEqual(staleData({ ...base, ath: {} }, '2026-11-12'), ['ath.json: illeggibile o senza mercati']);
  assert.deepEqual(staleData(base, '2026-11-12'), []); // file non ancora creato: nessun controllo
});

test('massimo dei 3 anni: configurazione e file dei dati coerenti', { skip: !fs.existsSync(new URL('../data/ath.json', import.meta.url)) && 'data/ath.json assente' }, () => {
  const C = read('config/ath.json').markets, A = read('data/ath.json');
  assert.deepEqual(A.markets.map((m) => m.id), C.map((m) => m.id));
  assert.ok(C.every((m) => m.id && m.label && m.symbol && m.kind && m.maxAge > 0));
  assert.ok(!C.some((m) => m.symbol === 'USO'), 'niente USO: il suo massimo non è quello del petrolio');
  for (const m of A.markets) if (m.stats) {
    const s = m.stats;
    assert.ok(s.distPct <= 0 && s.ref >= s.last && s.refDate <= s.lastDate && s.from <= s.refDate && s.ath >= s.ref && s.start <= s.athDate, m.id);
    assert.equal(s.days, daysBetween(s.refDate, s.lastDate), m.id);
    assert.equal(s.from, windowStart(s.lastDate), m.id);
  }
});

test('massimo dei 3 anni: bordi della finestra, chiusura a zero, valori mancanti, massimo durante la seduta', () => {
  // il primo giorno della finestra è dentro, quello prima è fuori
  assert.equal(athStats(['2023-01-08', '2026-01-08'], [200, 100]).refDate, '2023-01-08');
  assert.equal(athStats(['2023-01-07', '2026-01-08'], [200, 100]).refDate, '2026-01-08');
  // una chiusura esattamente a zero dopo il massimo: calo più profondo non calcolato
  assert.equal(athStats(D, [50, 60, 0, 20, 30]).belowZero, '2026-01-06');
  // chiusure mancanti in coda e in testa: ultima e prima seduta con la chiusura
  const t = athStats(D, [null, 120, 90, null, null], [500, 121, 95, 999, 999]);
  assert.equal(t.lastDate, '2026-01-06'); assert.equal(t.days, 1); assert.equal(t.start, '2026-01-05');
  assert.equal(t.intradayRef, 121); // i massimi delle sedute senza chiusura non contano
  // massimo durante la seduta cercato solo nella finestra dei 3 anni
  const w = athStats(['2010-01-04', '2026-01-05', '2026-01-06'], [100, 50, 60], [500, 55, 61]);
  assert.equal(w.intradayRef, 61); assert.equal(w.intradayRefDate, '2026-01-06'); assert.equal(w.ath, 100);
  // parità del massimo di sempre: la prima data
  const a = athStats(['2010-01-04', '2015-01-05', '2026-01-05', '2026-01-06'], [120, 100, 120, 110]);
  assert.equal(a.athDate, '2010-01-04'); assert.equal(a.refDate, '2026-01-05');
});

test('massimo dei 3 anni: con un simbolo nuovo la riga pubblicata non vale (oro e argento dagli ETF ai future, 1.10.1)', () => {
  const prev = { markets: [{ id: 'GOLD', symbol: 'GLD', stats: { lastDate: '2026-11-12' } }, { id: 'SPX', symbol: '^GSPC', stats: { lastDate: '2026-11-12' } }] };
  assert.equal(prevRowOf(prev, { id: 'GOLD', symbol: 'GC=F' }), null);
  assert.equal(prevRowOf(prev, { id: 'SPX', symbol: '^GSPC' }).stats.lastDate, '2026-11-12');
  assert.equal(prevRowOf(null, { id: 'SPX', symbol: '^GSPC' }), null);
  const C = read('config/ath.json').markets;
  assert.deepEqual(C.filter((m) => ['GOLD', 'SILVER'].includes(m.id)).map((m) => m.symbol), ['GC=F', 'SI=F']);
});
