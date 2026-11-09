// Struttura a termine (VIX/VIX3M) e credito (HYG/IEF) della vista VIX, dalla 1.6.0: calcoli di js/vix.js e funzioni
// pure di scripts/fetch_vix.js. Sulla 1.5.0 fallisce: le funzioni non esistono.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as V from '../js/vix.js';
import { parseCboe, mergeTail, ratioSeries, assemble } from '../scripts/fetch_vix.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} contro ${b}`);
const days = (n) => Array.from({ length: n }, (_, i) => `2020-${String(i).padStart(4, '0')}`); // date fittizie ordinate

test('struttura a termine: rapporto, stato, nessun riempimento', () => {
  assert.deepEqual(V.ratio([20, 30, null, 10], [25, null, 20, 10]), [0.8, null, null, 1]);
  assert.equal(V.termState(1), 'backwardation');
  assert.equal(V.termState(0.9999), 'contango');
  assert.equal(V.termState(null), null);
  assert.deepEqual(V.onDates(['a', 'b', 'c'], { dates: ['a', 'c'], val: [1, 3] }), [1, null, 3]);
  assert.deepEqual(V.onDates(['a', 'b'], null), [null, null]);
});

test('credito: distanza dal massimo e variazione sulle osservazioni valide, i buchi restano buchi', () => {
  const a = [100, 110, null, 99, 121, 110];
  const dd = V.ddFromMax(a, 3); // massimo delle ultime 3 osservazioni valide
  assert.deepEqual(dd.slice(0, 3), [null, null, null]);
  near(dd[3], (99 / 110 - 1) * 100); // 100, 110, 99
  near(dd[4], 0); // 110, 99, 121
  near(dd[5], (110 / 121 - 1) * 100);
  const ch = V.obsChange(a, 2);
  assert.deepEqual([ch[0], ch[1], ch[2]], [null, null, null]);
  near(ch[3], -1); // 99 contro 100, saltando il null
  near(ch[4], 10); // 121 contro 110
});

test('contesto: oggi, seduta provvisoria, VIX3M mancante, file senza le serie nuove, nessun dato futuro', () => {
  const n = 600, dates = days(n);
  const vix = dates.map((_, i) => 15 + (i % 7));
  const A = { dates, close: dates.map((_, i) => 100 + i), vix, fred: dates[n - 2] };
  const v3 = { dates, val: dates.map((_, i) => (i === n - 1 ? 18 : 17)), fred: dates[n - 2] };
  const cr = { dates, val: dates.map((_, i) => 1 + 0.001 * Math.sin(i / 9)) };
  const C = V.context(A, v3, cr);
  assert.equal(C.has3m && C.hasCredit, true);
  near(C.now.r.r, vix[n - 1] / 18);
  assert.equal(C.now.r.provisional, true);
  assert.equal(C.now.r.sameDay, true);
  assert.equal(C.provisional(n - 2), false);
  // provvisorio anche se è provvisorio solo il VIX3M
  assert.equal(V.context({ ...A, fred: dates[n - 1] }, v3, cr).now.r.provisional, true);
  assert.equal(V.context({ ...A, fred: dates[n - 1] }, { ...v3, fred: dates[n - 1] }, cr).now.r.provisional, false);
  // VIX dell'ultima seduta senza VIX3M: R di oggi null, l'ultimo R ha la sua data
  const miss = V.context(A, { dates: dates.slice(0, -1), val: v3.val.slice(0, -1), fred: v3.fred }, cr);
  assert.equal(miss.r[n - 1], null);
  assert.equal(miss.now.r.sameDay, false);
  assert.equal(miss.now.r.date, dates[n - 2]);
  // file della 1.5.0: niente errori, tutto null
  const old = V.context(A, null, null);
  assert.equal(old.has3m || old.hasCredit, false);
  assert.ok(old.r.every((x) => x == null) && old.dd.every((x) => x == null));
  assert.equal(old.now.r, null);
  // nessun dato futuro: tagliando la storia a t i valori di t non cambiano
  const t = 560, cut = (s) => ({ ...s, dates: s.dates.slice(0, t + 1), val: s.val.slice(0, t + 1) });
  const At = { dates: dates.slice(0, t + 1), close: A.close.slice(0, t + 1), vix: vix.slice(0, t + 1), fred: A.fred };
  const Ct = V.context(At, cut(v3), cut(cr));
  for (const k of ['r', 'rPct', 'dd', 'ddPct', 'ch']) assert.equal(Ct[k][t], C[k][t], k);
  assert.ok(C.rPct[t] != null && C.ddPct[t] != null);
});

test('fetch_vix: file di Cboe, coda Cboe + Yahoo, rapporto HYG/IEF', () => {
  const s = parseCboe('DATE,OPEN,HIGH,LOW,CLOSE\r\n11/06/2026,27.68,27.76,23.47,25.640000\n11/05/2026,1,1,1,28.18\n11/04/2026,1,1,1,0\n');
  assert.deepEqual(s, { dates: ['2026-11-05', '2026-11-06'], val: [28.18, 25.64] });
  assert.throws(() => parseCboe('Date,Valore\n1,2'));
  const cb = { dates: ['a1', 'a2'], val: [1, 2] }, yh = { dates: ['a1', 'a2', 'a3'], val: [9, 9, 3] };
  assert.deepEqual(mergeTail(cb, yh), { dates: ['a1', 'a2', 'a3'], val: [1, 2, 3] }); // Yahoo solo dopo l'ultima di Cboe
  assert.equal(mergeTail(null, yh), yh);
  assert.equal(mergeTail(cb, null), cb);
  assert.deepEqual(ratioSeries({ dates: ['a', 'b', 'c'], val: [2, 3, 4] }, { dates: ['a', 'c'], val: [4, 0] }), { dates: ['a'], val: [0.5] });
});

test('fetch_vix: VIX3M e credito facoltativi, VIX, S&P 500 e Nasdaq-100 obbligatori', () => {
  const ser = (last, fred) => ({ d0: '2026-01-02', gaps: '', cd: [100], ps: 100, last, ...(fred ? { fred } : {}) });
  const fresh = { VIX: ser('2026-11-06', '2026-11-05'), SPX: ser('2026-11-06'), NDX: ser('2026-11-06') };
  const r = assemble(fresh, null, new Date('2026-11-06T23:00:00Z'));
  assert.deepEqual(r.missing, ['VIX3M', 'HYGIEF']);
  assert.deepEqual(r.out.missing, ['VIX3M', 'HYGIEF']);
  assert.equal(r.out.asOf.vix3m, null);
  assert.equal(r.out.asOf.credit, null);
  // con la serie pubblicata: resta quella
  const prev = { series: { VIX3M: ser('2026-11-05', '2026-11-04') } };
  const r2 = assemble(fresh, prev);
  assert.deepEqual(r2.missing, ['HYGIEF']);
  assert.ok(r2.kept.includes('VIX3M'));
  assert.equal(r2.out.asOf.fred3m, '2026-11-04');
  // manca una serie obbligatoria: nessun file
  const r3 = assemble({ VIX: fresh.VIX, SPX: fresh.SPX }, null);
  assert.equal(r3.out, null);
  assert.deepEqual(r3.missing, ['NDX']);
});

const VX = fs.existsSync(new URL('../data/vix.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../data/vix.json', import.meta.url))) : null;
test('vix.json: VIX3M e HYG/IEF completi e solo nelle sedute dell\'S&P 500', { skip: !(VX && VX.series.VIX3M && VX.series.HYGIEF) && 'data/vix.json senza le serie della 1.6.0' }, () => {
  const spx = new Set(V.vxSeries(VX.series.SPX).dates);
  const v3 = V.vxSeries(VX.series.VIX3M), cr = V.vxSeries(VX.series.HYGIEF);
  assert.equal(v3.dates[0], '2007-12-04');
  assert.ok(cr.dates[0] <= '2007-12-31');
  for (const s of [v3, cr]) {
    assert.ok(s.dates.length > 4500);
    assert.ok(s.dates.every((d) => spx.has(d)));
    assert.ok(s.val.every((v) => v > 0));
    for (let i = 1; i < s.dates.length; i++) assert.ok(s.dates[i] > s.dates[i - 1]);
  }
  assert.ok(VX.series.VIX3M.fred && VX.series.VIX3M.fred <= VX.series.VIX3M.last);
  assert.equal(VX.asOf.vix3m, VX.series.VIX3M.last);
  assert.equal(VX.asOf.credit, VX.series.HYGIEF.last);
  // valori noti (FRED VXVCLS = Cboe): R del 24/10/2008 massimo dal 2007, 1,43
  const A = V.align(V.vxSeries(VX.series.SPX), V.vxSeries(VX.series.VIX)), C = V.context(A, v3, cr);
  const i = A.dates.indexOf('2008-10-24');
  near(C.r[i], 79.13 / 55.30, 1e-3);
});
