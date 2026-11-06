import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as V from '../js/vix.js';
import { onSessions } from '../scripts/fetch_vix.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url)));
const FX = read('test/fixtures/vix_1990_2025.json');
const VIX = V.vxSeries(FX.VIX);
const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} contro ${b}`);

test('vix: episodi solo dopo 63 sedute di quiete, rendimenti dalla chiusura del giorno dopo', () => {
  const dates = Array.from({ length: 80 }, (_, i) => `2020-01-${String(i).padStart(3, '0')}`); // date fittizie ordinate
  const vix = dates.map((_, i) => (i === 70 || i === 72 ? 45 : 15));
  const close = dates.map((_, i) => 100 + i);
  const A = { dates, close, vix, fred: null };
  const e = V.episodes(A, 40);
  assert.equal(e.length, 1); // il secondo superamento (72) non ha 63 sedute di quiete
  assert.equal(e[0].p, 70);
  assert.equal(e[0].vixMax, 45);
  // ingresso alla chiusura della seduta 71: 21 sedute dopo non ci sono ancora (80 sedute)
  assert.equal(e[0].ret[21], null);
  const o = V.outcomes([100, 100, 90, 120], 0, 1);
  near(o.dd, -10); // dall'ingresso a 100 il punto più basso è 90
  assert.equal(o.toMin, 1);
});

test('vix: tabella dei regimi sul campione 1990-2025 (valori verificati con lo script di ricerca)', () => {
  const want = {
    SPX: [[20, 23, 21, 23, 16.4097, -1.2145], [25, 21, 16, 20, 11.2905, -12.9333], [30, 20, 13, 19, 15.8638, -11.7582], [40, 10, 7, 9, 19.5893, -6.2514], [50, 3, 2, 2, 20.7144, -27.2318]],
    NDX: [[20, 23, 22, 23, 23.805, -4.2832], [25, 21, 16, 20, 17.5345, -13.9059], [30, 20, 14, 19, 28.6214, -11.5006], [40, 10, 8, 9, 25.6031, -10.2785], [50, 3, 2, 2, 40.4602, -19.2623]],
  };
  const base = { SPX: [11.5803, 7082, 8814], NDX: [18.1787, 7348, 8814] };
  for (const k of ['SPX', 'NDX']) {
    const R = V.regimes(V.align(V.vxSeries(FX[k]), VIX));
    for (const [X, eps, posN, n, med, dd] of want[k]) {
      const t = R.thr[X];
      assert.equal(t.episodes.length, eps, `${k} ${X} episodi`);
      assert.equal(t.stats[252].posN, posN, `${k} ${X} positivi`);
      assert.equal(t.stats[252].n, n, `${k} ${X} con 12 mesi`);
      near(t.stats[252].median, med);
      near(t.stats.dd.median, dd);
      assert.equal(t.robust, X === 40);
    }
    near(R.base[252].median, base[k][0]);
    assert.equal(R.base[252].posN, base[k][1]);
    assert.equal(R.base[252].n, base[k][2]);
  }
});

test('vix: realizzata, percentili sulla storia fino a quel giorno, fasce, scatter', () => {
  const A = V.align(V.vxSeries(FX.SPX), VIX);
  const rv = V.realized(A.close), i = A.dates.indexOf('2020-03-16');
  near(rv[i], 79.3404);
  // percentile crescente: il valore del giorno t non cambia aggiungendo dati dopo t
  const full = V.expandingPct(A.vix), cut = V.expandingPct(A.vix.slice(0, i + 1));
  assert.equal(cut[i], full[i]);
  const ep = V.expandingPct([3, 1, 2, null, 2]);
  [100, 50, 200 / 3, null, 75].forEach((x, k) => (x == null ? assert.equal(ep[k], null) : near(ep[k], x)));
  assert.equal(V.bandOf(28.18)[2], 'paura');
  assert.equal(V.bandOf(40)[2], 'panico');
  assert.equal(V.bandOf(null), null);
  const S = V.scatter(A);
  assert.deepEqual([S.pts.length, S.pts.filter((p) => p.ret > 0).length, S.open], [722, 632, 12]);
  assert.ok(S.pts.every((p) => p.vix >= 30 && p.ep));
  assert.equal(S.pts.filter((p) => p.start).length, S.eps.filter((e) => e.p + 1 + 252 < A.close.length).length);
});

test('vix: solo sedute dell\'indice e nessun dato futuro nella lettura di oggi', () => {
  assert.deepEqual(onSessions({ dates: ['2026-01-02', '2026-01-03', '2026-01-05'], val: [20, 21, 0] }, ['2026-01-02', '2026-01-05']), { dates: ['2026-01-02'], val: [20] });
  const A = V.align(V.vxSeries(FX.SPX), VIX), t = 6000;
  const cut = { dates: A.dates.slice(0, t + 1), close: A.close.slice(0, t + 1), vix: A.vix.slice(0, t + 1), fred: null };
  const a = V.today(cut), b = V.today(A);
  assert.equal(a.date, A.dates[t]);
  assert.equal(a.pct, b.vixPctSeries[t]);
  assert.equal(a.premPct, b.premPctSeries[t]);
  assert.equal(V.today({ ...cut, fred: A.dates[t - 1] }).provisional, true);
});

const VX = fs.existsSync(new URL('../data/vix.json', import.meta.url)) ? read('data/vix.json') : null;
test('vix: file dei dati completo e ordinato', { skip: !VX && 'data/vix.json assente' }, () => {
  for (const k of ['VIX', 'SPX', 'NDX']) {
    const s = V.vxSeries(VX.series[k]);
    assert.ok(s.dates.length > 9000, k);
    assert.ok(s.val.every((v) => v > 0));
    for (let i = 1; i < s.dates.length; i++) assert.ok(s.dates[i] > s.dates[i - 1]);
    assert.equal(VX.series[k].last, s.dates.at(-1));
  }
  const spx = new Set(V.vxSeries(VX.series.SPX).dates);
  assert.ok(V.vxSeries(VX.series.VIX).dates.every((d) => spx.has(d)), 'VIX solo nelle sedute dell\'S&P 500');
  assert.ok(VX.series.VIX.fred && VX.series.VIX.fred <= VX.series.VIX.last);
  assert.ok(VX.asOf.vix && VX.asOf.spx && VX.asOf.ndx);
});
