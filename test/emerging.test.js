import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { emSeries, cleanFx, plain, fxSignals, fxState, dollarSignals, onDates, inUsd, change, relStrength } from '../js/emerging.js';
import { parseFredDaily, parseFredCsv } from '../scripts/fetch_data.js';
import { pack, pickSeries, lastLongGap } from '../scripts/fetch_emerging.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url)));
const CFG = read('config/emerging.json'), IXCFG = read('config/indices.json').indices;
const EM = fs.existsSync(new URL('../data/emerging.json', import.meta.url)) ? read('data/emerging.json') : null;

test('emergenti: configurazione coerente con la vista 6', () => {
  for (const k of CFG.order) assert.ok(IXCFG[k], `${k} non è nella vista 6`);
  assert.deepEqual([...CFG.order].sort(), Object.keys(CFG.indices).sort());
  assert.equal(CFG.indices.HSI.peg, true);
  assert.equal(CFG.indices.EEM.fx, null);
});

test('emergenti: pulizia di un errore di stampa isolato, non di un salto vero', () => {
  const dates = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'];
  const spike = cleanFx('TWD=X', { dates, val: [30, 30.1, 1.8, 30.2, 30.1] });
  assert.deepEqual(spike.removed.map((x) => x.date), ['2026-01-07']);
  assert.equal(spike.dates.length, 4);
  const shift = cleanFx('BRL=X', { dates, val: [5, 5.05, 5.6, 5.62, 5.6] }); // salto che non rientra: resta
  assert.equal(shift.removed.length, 0);
  // CNY ha soglie più strette (1%)
  assert.equal(cleanFx('CNY=X', { dates, val: [7, 7.01, 7.2, 7.01, 7.0] }).removed.length, 1);
  // salto enorme che rientra per più di 3/4 anche se il cambio intanto si è mosso del 3% (TWD=X 25/10/2011: 29,254 → 1,8015 → 30,11)
  assert.deepEqual(cleanFx('TWD=X', { dates, val: [30.02, 29.254, 1.8015, 30.11, 30.09] }).removed.map((x) => x.date), ['2026-01-07']);
  // movimento vero della settimana di Lehman confermato dalla Fed (BRL=X 8/10/2008: 2,179 → 2,400 → 2,148): resta
  assert.equal(cleanFx('BRL=X', { dates, val: [2.16, 2.179, 2.4, 2.148, 2.25] }).removed.length, 0);
  // storia della Fed: si pulisce solo la coda di Yahoo, dopo l'ultima data della Fed
  assert.equal(cleanFx('TWD=X', { dates, val: [30, 30.1, 1.8, 30.2, 30.1], fred: '2026-01-07' }).removed.length, 0);
  assert.equal(cleanFx('TWD=X', { dates, val: [30, 30.1, 1.8, 30.2, 30.1], fred: '2026-01-06' }).removed.length, 1);
});

test('emergenti: stato della valuta in parole', () => {
  assert.equal(fxState(1, 0.3), 'ferma');
  assert.equal(fxState(0, 1.4), 'calo');
  assert.equal(fxState(0, 0.2), 'normale');
  assert.equal(fxState(null, 1), null);
  assert.equal(fxState(0, null), null);
});

test('emergenti: valori sulle date dell\'indice senza riempimento, indice in dollari e variazioni', () => {
  const v = onDates(['2026-01-05', '2026-01-07'], [7, 7.1], ['2026-01-05', '2026-01-06', '2026-01-07']);
  assert.deepEqual(v, [7, null, 7.1]);
  assert.deepEqual(inUsd([70, 71, 71], v), [10, null, 10]);
  // CNY=X sale da 7,0 a 7,2: lo yuan si indebolisce, l'indice in dollari scende anche a prezzo fermo
  assert.ok(inUsd([100], [7.2])[0] < inUsd([100], [7.0])[0]);
  assert.equal(Math.round(change([100, null, 110], 2) * 1e6) / 1e6, 10);
  assert.equal(Math.round(change([100, 105, null], 1) * 1e6) / 1e6, 5); // dall'ultimo valore presente
  assert.equal(change([null, null, 110], 2), null);
});

test('emergenti: pacchetto delle serie, andata e ritorno; FRED giornaliero con i «.»', () => {
  const dates = ['2026-01-05', '2026-01-06', '2026-01-08'], val = [1344.12, 1350.5, 1349.99];
  const s = emSeries(pack(dates, val));
  assert.deepEqual(s.dates, dates);
  assert.deepEqual(s.val, val);
  const f = parseFredDaily('observation_date,DTWEXEMEGS\n2026-10-28,130.1234\n2026-10-29,.\n2026-10-30,130.9\n');
  assert.deepEqual(f, { dates: ['2026-10-28', '2026-10-30'], val: [130.1234, 130.9] });
  assert.deepEqual(parseFredCsv('d,v\n2026-01-01,1\n2026-02-01,2\n'), { '2026-01': 1, '2026-02': 2 }); // invariato
  assert.equal(lastLongGap(['2003-04-29', '2003-12-01', '2003-12-02', '2006-03-24', '2006-03-27']), 3);
  assert.equal(lastLongGap(['2026-01-05', '2026-01-06']), 0);
  // una serie che arriva più vecchia di quella pubblicata non la sostituisce
  assert.deepEqual(pickSeries({ last: '2026-11-03' }, { last: '2026-11-04' }), { s: { last: '2026-11-04' }, kept: true });
  assert.deepEqual(pickSeries(null, { last: '2026-11-04' }), { s: { last: '2026-11-04' }, kept: true });
  assert.deepEqual(pickSeries({ last: '2026-11-05' }, { last: '2026-11-04' }), { s: { last: '2026-11-05' }, kept: false });
});

test('emergenti: nessun dato futuro (il valore a t sulla serie intera è uguale a quello sulla serie tagliata a t)', { skip: !EM && 'data/emerging.json assente' }, () => {
  for (const sym of ['KRW=X', 'CNY=X']) {
    const raw = emSeries(EM.series[sym]), full = cleanFx(sym, raw), sig = fxSignals(full), at = new Map(full.dates.map((d, i) => [d, i]));
    let checked = 0;
    for (let t = raw.dates.length - 1; t > raw.dates.length - 1500; t -= 137) {
      const d = raw.dates[t], i = at.get(d);
      if (i == null) continue; // seduta tolta dalla pulizia (errore di stampa riconosciuto il giorno dopo)
      const cut = cleanFx(sym, { dates: raw.dates.slice(0, t + 1), val: raw.val.slice(0, t + 1), fred: raw.fred }), s2 = fxSignals(cut), j = cut.dates.length - 1;
      assert.equal(cut.dates[j], d);
      assert.equal(s2.F[j], sig.F[i], `${sym} F al ${d}`);
      assert.equal(s2.z[j], sig.z[i], `${sym} z al ${d}`);
      checked++;
    }
    assert.ok(checked >= 8, `${sym}: solo ${checked} sedute controllate`);
  }
  const dl = plain('DTWEXEMEGS', emSeries(EM.series.DTWEXEMEGS)), D = dollarSignals(dl), n = dl.dates.length;
  for (let t = n - 1; t > n - 2000; t -= 211) {
    const c = plain('x', { dates: dl.dates.slice(0, t + 1), val: dl.val.slice(0, t + 1) }), D2 = dollarSignals(c);
    assert.equal(D2.D[t], D.D[t]);
    assert.equal(D2.sma[t], D.sma[t]);
  }
});

test('emergenti: file dei dati completo e ordinato', { skip: !EM && 'data/emerging.json assente' }, () => {
  const want = [...new Set([...Object.values(CFG.indices).map((x) => x.fx).filter(Boolean), ...Object.values(CFG.indices).map((x) => x.etf), CFG.benchmark, CFG.fred])];
  for (const s of want) {
    assert.ok(EM.series[s], `${s} manca`);
    const x = emSeries(EM.series[s]);
    assert.equal(x.dates.length, x.val.length);
    assert.ok(x.val.every((v) => v > 0), `${s}: valori non positivi`);
    for (let i = 1; i < x.dates.length; i++) assert.ok(x.dates[i] > x.dates[i - 1], `${s}: date non in ordine`);
    assert.equal(EM.series[s].last, x.dates.at(-1));
    if (CFG.indices && Object.values(CFG.indices).some((c) => c.fx === s)) assert.ok(EM.series[s].fred && EM.series[s].fred <= EM.series[s].last && x.dates.includes(EM.series[s].fred), `${s}: data della Fed`);
  }
  assert.ok(EM.asOf.fx && EM.asOf.etf && EM.asOf.fred);
  assert.ok(!('checkedAt' in EM), 'nessun campo che cambia a ogni corsa oltre a generated');
});

test('emergenti: forza relativa con la formula della rotazione, quadrante coerente', { skip: !EM && 'data/emerging.json assente' }, () => {
  const acwi = emSeries(EM.series.ACWI);
  for (const etf of ['ASHR', 'EWZ', 'EEM']) {
    const r = relStrength(emSeries(EM.series[etf]), acwi);
    assert.ok(r && r.ratio != null && r.mom != null, etf);
    assert.ok(r.trail.length <= 10 && r.trail.length > 0);
    assert.deepEqual(r.trail.at(-1).slice(0, 2), [r.ratio, r.mom]);
    const q = r.ratio >= 100 ? (r.mom >= 100 ? 'Leading' : 'Weakening') : r.mom >= 100 ? 'Improving' : 'Lagging';
    assert.equal(r.quad, q);
  }
  assert.equal(relStrength(null, acwi), null);
});

test('emergenti: valori «d\'oro» delle definizioni (cambi della Fed 2012-2020, ricalcolo indipendente in Python)', () => {
  // valori di ricerca/qa/1.4.0/codice/ricalcolo_indipendente.py (fx_signals, dollar) sul file test/fixtures/emerging_fed.json:
  // un cambio di soglie, finestre, media o condizioni sposta i conteggi
  const fx = read('test/fixtures/emerging_fed.json');
  const ser = (rows) => ({ dates: rows.map((r) => r[0]), val: rows.map((r) => r[1]) });
  const K = plain('KRW', ser(fx.KRW)), s = fxSignals(K), cnt = (a, v) => a.filter((x) => x === v).length;
  assert.deepEqual([cnt(s.F, 1), cnt(s.F, 0), cnt(s.F, null), s.z.filter((x) => x != null && x >= 1).length], [606, 789, 856, 305]);
  const at = (d) => K.dates.indexOf(d);
  for (const [d, z] of [['2016-02-25', 1.746634], ['2018-10-31', 0.551434], ['2020-03-19', 2.419068], ['2020-12-30', -2.172433]]) assert.ok(Math.abs(s.z[at(d)] - z) < 1e-6, `z al ${d}`);
  const Dl = plain('DTW', ser(fx.DTW)), D = dollarSignals(Dl);
  assert.deepEqual([cnt(D.D, 1), cnt(D.D, 0)], [605, 1432]);
  for (const [d, m, v] of [['2016-02-25', 112.602026, 0], ['2020-03-23', 124.033238, 0], ['2020-12-30', 129.610694, 1]]) {
    const i = Dl.dates.indexOf(d);
    assert.ok(Math.abs(D.sma[i] - m) < 1e-6, `media 200 al ${d}`);
    assert.equal(D.D[i], v, `D al ${d}`);
  }
});
