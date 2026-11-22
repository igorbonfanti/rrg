// Linea del tempo dei massimi (1.12.0, vista 0 Massimi): js/peaks.js contro ricerca/rotazione-bolle/risultati.json, episodio
// per episodio, sulle chiusure di data/ath_history.json al 20/11/2026. La fixture la scrive
// ricerca/rotazione-bolle/script/fixture.mjs (così il test gira anche su main, senza ricerca/). Sulla 1.11.0 fallisce:
// js/peaks.js non esiste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { cyclePeaks, runningPeak, timeline, ranks, clean, eligibleFrom, ORDER } from '../js/peaks.js';
import { decodeDates, deltaDecode } from '../js/indexdata.js';

const F = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/peaks_20261120.json.gz', import.meta.url))));
const S = Object.fromEntries(F.ids.map((id) => { const h = F.series[id]; return [id, { dates: decodeDates(h.d0, h.gaps), close: deltaDecode(h.cd, h.ps || 100) }]; }));

// serie giornaliera di prova: una seduta al giorno dal 01/01/2020
const day = (k) => new Date(Date.UTC(2020, 0, 1) + k * 86400000).toISOString().slice(0, 10);
const mk = (vals) => ({ dates: vals.map((_, k) => day(k)), close: vals });

test('massimi di ciclo: serve un anno di storia, calo fino al ritorno sopra o al massimo successivo', () => {
  // 400 giorni a 100, poi massimo a 120, calo a 90 (−25%), ritorno a 121
  const v = [...Array(400).fill(100), 120, 110, 90, 100, 121, 121];
  const p = cyclePeaks(mk(v), 20);
  assert.equal(p.length, 1);
  assert.equal(p[0].date, day(400)); assert.equal(p[0].troughDate, day(402)); assert.equal(p[0].ddPct, -25);
  assert.equal(p[0].confirmDate, day(402)); assert.equal(p[0].recoveryDate, day(404)); assert.equal(p[0].ongoing, undefined);
  assert.equal(cyclePeaks(mk(v), 30).length, 0); // −25% non basta per la soglia 30%
  // un massimo nel primo anno non conta (nessun massimo di 52 settimane valido)
  assert.equal(cyclePeaks(mk([100, 120, 90, 80, 85]), 20).length, 0);
  assert.equal(eligibleFrom(mk([1, 2])), '2020-12-31');
});

test('massimi di ciclo: calo in corso, chiusura sotto zero, parità', () => {
  const s = mk([...Array(400).fill(50), 60, 40, -5, 30]);
  const [p] = cyclePeaks(s, 20);
  assert.equal(p.belowZero, true); assert.equal(p.ongoing, true); assert.equal(p.recoveryDate, null); assert.equal(p.troughDate, day(402));
  // una chiusura uguale al massimo non lo supera: il calo continua
  const t = cyclePeaks(mk([...Array(400).fill(100), 120, 90, 120, 80]), 20);
  assert.equal(t.length, 1); assert.equal(t[0].troughDate, day(403)); assert.equal(t[0].ddPct, -33.3);
  // chiusure mancanti si saltano
  assert.deepEqual(clean(['a', 'b', 'c'], [1, null, NaN]), { dates: ['a'], close: [1] });
});

test('calo in corso: ultimo massimo di 52 settimane non superato, anche all\'ultima seduta', () => {
  const r = runningPeak(mk([...Array(400).fill(100), 110, 105, 104]));
  assert.equal(r.date, day(400)); assert.equal(r.ddPct, -5.5); assert.equal(r.troughDate, day(402));
  const top = runningPeak(mk([...Array(400).fill(100), 110]));
  assert.equal(top.date, day(400)); assert.equal(top.ddPct, null); assert.equal(top.troughDate, null);
  assert.equal(runningPeak(mk([100, 99, 98])), null);
});

test('linea del tempo: senza S&P 500 niente; un mercato con la serie corta è «nodata»', () => {
  assert.equal(timeline({}, ['SPX']), null);
  const v = [...Array(800).fill(100), 120, 90, 80, 125, 95, 96];
  const A = mk(v), T = timeline({ SPX: A, X: { dates: A.dates.slice(-30), close: v.slice(-30) } }, ['X', 'SPX'], { anchorX: 15 });
  assert.equal(T.episodes.length, 2);
  assert.equal(T.episodes[0].peak, day(800)); assert.equal(T.episodes[0].ongoing, false);
  assert.equal(T.episodes[0].markets.X.status, 'nodata'); assert.equal(T.episodes[0].markets.SPX.status, 'anchor');
  assert.equal(T.episodes[1].peak, day(803)); assert.equal(T.episodes[1].ongoing, true); assert.equal(T.episodes[1].ddPct, -24);
});

test('massimi di ciclo uguali alla ricerca, episodio per episodio (9 mercati, soglie 10-40%)', () => {
  let n = 0;
  for (const id of F.ids) {
    const s = clean(S[id].dates, S[id].close);
    assert.equal(eligibleFrom(s), F.eligible[id], id);
    for (const [X, exp] of Object.entries(F.episodes[id])) {
      const got = cyclePeaks(s, +X).filter((p) => p.date >= '2000-01-01');
      assert.equal(got.length, exp.length, `${id} ≥ ${X}%: numero di episodi`);
      exp.forEach((e, k) => {
        const g = got[k];
        for (const key of ['date', 'troughDate', 'ddPct', 'confirmDate', 'recoveryDate']) assert.equal(g[key] ?? null, e[key] ?? null, `${id} ≥ ${X}% ${e.date} ${key}`);
        assert.equal(!!g.ongoing, !!e.ongoing, `${id} ≥ ${X}% ${e.date} in corso`);
        assert.equal(!!g.belowZero, !!e.belowZero, `${id} ≥ ${X}% ${e.date} sotto zero`);
        n++;
      });
    }
  }
  assert.equal(n, 281);
});

test('linea del tempo uguale alla ricerca: ultimi 4 cali ≥ 15% dell\'S&P 500 e quello in corso', () => {
  const T = timeline(S, F.ids);
  assert.equal(T.asOf, F.asOf);
  assert.deepEqual(T.episodes.map((e) => [e.peak, e.ddPct, e.ongoing]), F.timeline.map((e) => [e.peak, e.ddPct, e.ongoing]));
  T.episodes.forEach((e, k) => {
    for (const id of F.ids) {
      const a = e.markets[id], b = F.timeline[k].markets[id], tag = `${e.peak} ${id}`;
      assert.equal(a.status, b.status, tag);
      if (a.status === 'peak' || a.status === 'anchor') { assert.equal(a.date, b.date, tag); assert.equal(a.offset, b.offset, tag); assert.equal(a.ddPct, b.ddPct, tag); }
      if (a.status === 'peak') {
        assert.deepEqual(a.others.map((o) => o.offset), b.others, `${tag} altri massimi`);
        assert.equal(a.ongoing, b.ongoing, `${tag} finora`); assert.equal(a.belowZero, b.belowZero, tag); assert.equal(a.troughDate, b.troughDate, tag);
      }
      if (a.status === 'none') assert.equal(a.alt ? a.alt.offset : null, b.alt15, `${tag} soglia 15%`);
    }
  });
  // il calo in corso: il massimo dell'S&P 500 del 06/10/2026, −11,6% finora
  assert.equal(T.episodes[4].peak, '2026-10-06'); assert.equal(T.episodes[4].markets.SPX.ddPct, -11.6);
});

test('ordine tipico: ranghi uguali alla ricerca e media degli 8 cali uguale a ORDER', () => {
  const T = timeline(S, F.ids, { last: 99 });
  const done = T.episodes.filter((e) => !e.ongoing);
  // il calo del 2000 non si ricalcola: le chiusure dell'app partono dal 2000 e serve un anno di storia
  assert.deepEqual(done.map((e) => e.peak), F.ranks.slice(1).map((r) => r.peak));
  const mine = done.map((e) => ranks(e));
  mine.forEach((r, k) => { for (const id of F.ids) assert.equal(r[id] ?? null, F.ranks[k + 1].ranks[id], `${done[k].peak} ${id}`); });
  const all = [F.ranks[0].ranks, ...mine];
  for (const id of F.ids) {
    const v = all.map((r) => r[id]).filter((x) => x != null);
    const mean = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10000) / 10000;
    assert.equal(mean, ORDER.markets[id].meanRankNorm, `${id} rango medio`);
    for (const k of ['meanRankNorm', 'withPeak', 'none', 'nodata', 'before', 'together', 'after', 'medianOffset']) assert.equal(ORDER.markets[id][k], F.order[id][k], `${id} ${k}`);
  }
  assert.equal(ORDER.episodes, F.ranks.length);
});

test('linea del tempo sui dati di oggi (data/ath_history.json): si calcola e ha il calo in corso', () => {
  const H = JSON.parse(fs.readFileSync(new URL('../data/ath_history.json', import.meta.url)));
  const live = Object.fromEntries(Object.entries(H.series).map(([id, h]) => [id, { dates: decodeDates(h.d0, h.gaps), close: deltaDecode(h.cd, h.ps || 100) }]));
  const T = timeline(live, Object.keys(live));
  assert.ok(T && T.episodes.length === 5);
  assert.equal(T.episodes.at(-1).ongoing, true);
  assert.ok(T.episodes.slice(0, 4).every((e) => !e.ongoing && e.ddPct <= -15));
});
