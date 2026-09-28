import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { alignSeries, pickAsOf, validateMacro, parseFredCsv, cpiReleases, cpiSteps, inverse } from '../scripts/fetch_data.js';

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
