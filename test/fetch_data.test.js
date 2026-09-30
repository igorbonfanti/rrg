import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { alignSeries, pickAsOf, validateMacro, parseFredCsv, cpiReleases, cpiSteps, inverse, high52, unadjusted } from '../scripts/fetch_data.js';
import { drawdown, priceDrawdown } from '../js/metrics.js';

test('asOf = ultima data comune, esclusi i ticker fermi da giorni', () => {
  const r = pickAsOf({ SPY: '2026-09-23', XLK: '2026-09-22', XLU: '2026-09-23', OLD: '2026-09-01' });
  assert.equal(r.asOf, '2026-09-22');
  assert.equal(r.maxDate, '2026-09-23');
  assert.deepEqual(r.stale, ['OLD']);
});

test('allineamento: niente code ricopiate, lacune interne riempite', () => {
  const series = {
    SPY: { dates: ['2026-09-18', '2026-09-21', '2026-09-22'], adjclose: [1, 2, 3] },
    XLK: { dates: ['2026-09-17', '2026-09-21'], adjclose: [10, 20] },
  };
  const { dates, closes } = alignSeries(series, '2026-09-21');
  assert.deepEqual(dates, ['2026-09-17', '2026-09-18', '2026-09-21']);
  assert.deepEqual(closes.SPY, [null, 1, 2]);
  assert.deepEqual(closes.XLK, [10, 10, 20]);
});

test('universe.json: sezione macro coerente, errori riconosciuti', () => {
  const u = JSON.parse(fs.readFileSync(new URL('../universe.json', import.meta.url)));
  assert.deepEqual(validateMacro(u.macro), []);
  const bad = structuredClone(u.macro);
  const g = Object.values(bad.groups)[0];
  g.benchmarks.push('NOPE');
  g.defaultBenchmark = 'ALTRO';
  bad.benchmarks.CPI.synthetic = 'boh';
  delete bad.benchmarks.DXY_INV.source;
  const errs = validateMacro(bad).join('; ');
  for (const k of ['NOPE', 'default', 'boh', 'DXY_INV']) assert.ok(errs.includes(k), errs);
});

test('CSV di FRED: mesi con valore, quelli vuoti saltati', () => {
  const csv = 'observation_date,CPIAUCSL\n2025-09-01,324.245\n2025-10-01,\n2025-11-01,.\n2025-12-01,325.5\n';
  assert.deepEqual(parseFredCsv(csv), { '2025-09': 324.245, '2025-12': 325.5 });
});

test('CPI a gradini dal giorno di pubblicazione, senza guardare avanti', () => {
  const months = { '2025-08': 100, '2025-09': 101, '2025-11': 103 }; // ottobre mai pubblicato
  const releases = { '2025-08': '2025-09-11', '2025-09': '2025-10-24', '2025-11': '2025-12-18' };
  const dates = ['2025-09-10', '2025-09-11', '2025-10-23', '2025-10-24', '2025-12-17', '2025-12-18', '2025-12-19'];
  assert.deepEqual(cpiSteps(dates, months, releases), [null, 100, 100, 101, 101, 103, 103]);
  // un mese senza data di uscita non entra
  assert.deepEqual(cpiSteps(dates, { ...months, '2025-12': 104 }, releases), [null, 100, 100, 101, 101, 103, 103]);
  // date nuove: i mesi mai visti prendono la data di oggi, quelli noti restano
  const r = cpiReleases({ ...months, '2025-12': 104 }, releases, '2026-01-13');
  assert.deepEqual(r.added, ['2025-12']);
  assert.equal(r.releases['2025-12'], '2026-01-13');
  assert.equal(r.releases['2025-09'], '2025-10-24');
});

test('date di uscita del CPI (seme ALFRED): nel mese successivo, in ordine, senza ottobre 2025', () => {
  const seed = JSON.parse(fs.readFileSync(new URL('../config/cpi_releases.json', import.meta.url)));
  const months = Object.keys(seed.releases).sort();
  assert.ok(!months.includes('2025-10'));
  let prev = '';
  for (const m of months) {
    const d = seed.releases[m];
    const [y, mm] = m.split('-').map(Number);
    const next = mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, '0')}`;
    assert.equal(d.slice(0, 7), next, m);
    assert.ok(d > prev, m);
    prev = d;
  }
});

test('benchmark «senza dollaro»: inverso del dollar index', () => {
  assert.deepEqual(inverse([100, 125, null, 0]), [100, 80, null, null]);
});

// Serie Yahoo finta su 300 giorni: prezzo in discesa con un massimo al giorno 100 e una cedola del 2% il giorno 200
function fakeYahoo() {
  const dates = Array.from({ length: 300 }, (_, i) => new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
  const close = dates.map((_, i) => (i === 100 ? 130 : 100 - i / 10));
  const adjclose = close.map((v, i) => (i < 200 ? v * 0.98 : v));
  const high = close.map((v) => v + 1);
  high[10] = 500; // fuori finestra: prima delle ultime 252 sedute
  high[100] = 140; // rovescio nella seduta del massimo
  return { dates, close, adjclose, high };
}

test('chiusure senza rettifica: la pubblicata divisa per il fattore di Yahoo di quel giorno', () => {
  const s = fakeYahoo(), adj = s.adjclose.map((v) => Math.round(v * 10000) / 10000);
  const raw = unadjusted(s, s.dates, adj);
  assert.equal(raw[100], 130);
  assert.equal(raw[250], adj[250]); // dopo lo stacco il fattore vale 1
  // senza cedole le due serie sono identiche
  const flat = { ...s, adjclose: s.close };
  assert.deepEqual(unadjusted(flat, s.dates, s.close), s.close);
});

test('massimo a 52 settimane: stesse sedute del drawdown rettificato, i due valori cambiano solo per la cedola', () => {
  const s = fakeYahoo(), adj = s.adjclose.map((v) => Math.round(v * 10000) / 10000);
  const m = high52(s, s.dates, adj);
  assert.deepEqual(m, { hi: 130, d: s.dates[100], c: s.close[299], ih: 140, id: s.dates[100] });
  // con i dividendi: la chiusura rettificata più alta (127,4) contro l'ultima; sul solo prezzo: 130 contro l'ultima
  assert.equal(Math.round(drawdown(adj).at(-1) * 100) / 100, Math.round((s.close[299] / 127.4 - 1) * 10000) / 100);
  assert.equal(Math.round(priceDrawdown(m) * 100) / 100, Math.round((s.close[299] / 130 - 1) * 10000) / 100);
  // senza cedole (oro, bitcoin) i due valori coincidono
  const flat = { ...s, adjclose: s.close };
  assert.equal(priceDrawdown(high52(flat, s.dates, s.close)), drawdown(s.close).at(-1));
  assert.equal(high52(undefined, s.dates, adj), null);
});

test('criptovalute: contano tutti i giorni, anche i fine settimana fuori dal calendario del file', () => {
  const s = fakeYahoo();
  // calendario del file senza il giorno del massimo (un sabato, per esempio)
  const dates = s.dates.filter((_, i) => i !== 100), adj = s.close.filter((_, i) => i !== 100);
  const m = high52({ ...s, adjclose: s.close }, dates, adj, true);
  assert.equal(m.hi, 130);
  assert.equal(m.all, true);
  // barra dopo la data del file (bitcoin quota anche dopo l'ultima seduta): non conta
  const late = { dates: [...s.dates, '2025-12-31'], close: [...s.close, 999], adjclose: [...s.close, 999], high: [...s.high, 999] };
  assert.equal(high52(late, s.dates, s.close, true).c, s.close[299]);
});
