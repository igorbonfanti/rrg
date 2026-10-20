import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onlyStamp } from '../scripts/keep_unchanged.js';
import { staleData } from '../scripts/check_fresh.js';
import { retryFrom } from '../scripts/send_alerts.js';

test('commit dei dati: un file che cambia solo per l\'ora di generazione non si pubblica', () => {
  assert.equal(onlyStamp('{"generated":"a","asOf":"2026-10-16","x":[1,2]}', '{"generated":"b","asOf":"2026-10-16","x":[1,2]}'), true);
  assert.equal(onlyStamp('{"generated":"a","x":[1,2]}', '{"generated":"b","x":[1,3]}'), false);
  assert.equal(onlyStamp('{"x":1}', 'non json'), false);
});

test('dati fermi: ogni fonte con il suo limite, i ponti festivi passano', () => {
  const ok = {
    breadth: { asOf: '2026-11-27' }, sectors: { asOf: '2026-11-27' }, members: { asOf: '2026-11-30' },
    history: { changesAsOf: '2026-11-27' }, sectorMembers: { asOf: '2026-11-27', weightsAsOf: '2026-11-26' },
    indices: { asOf: '2026-11-27' }, indexMembers: { DAX: { asOf: '2026-11-30' } },
  };
  assert.deepEqual(staleData(ok, '2026-12-01'), []); // venerdì dopo Thanksgiving letto il martedì
  const stale = { ...ok, history: { changesAsOf: '2026-11-10' }, indexMembers: { DAX: { asOf: '2026-11-01' } } };
  const p = staleData(stale, '2026-12-01');
  assert.equal(p.length, 2);
  assert.match(p[0], /Wikipedia.*2026-11-10/);
  assert.match(p[1], /DAX/);
  assert.equal(staleData({ ...ok, history: {} }, '2026-12-01').length, 0); // campo non ancora scritto
  assert.deepEqual(staleData({ breadth: { asOf: '2026-11-20' } }, '2026-12-01'), ['breadth.json: fermo al 2026-11-20 (11 giorni)']);
});

test('alert: un invio fallito si riprova per 5 sedute', () => {
  const dates = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];
  assert.equal(retryFrom(dates, 'd7'), 'd3');
  assert.equal(retryFrom(dates, 'd2'), 'd1');
});

test('dati fermi: file dei prezzi e ogni indice o serie dei cali forti, con le feste lunghe delle borse asiatiche', () => {
  const base = { breadth: { asOf: '2026-10-16' }, prices: { asOf: '2026-10-16' }, pricesGlobal: { asOf: '2026-10-16' }, pricesMacro: { asOf: '2026-10-16' } };
  assert.deepEqual(staleData({ ...base, indexLast: { CSI300: '2026-10-06' }, capLast: { NDX: '2026-10-16' } }, '2026-10-19'), []); // Golden Week: 10 giorni
  const p = staleData({ ...base, prices: { asOf: '2026-10-09' }, pricesGlobal: { asOf: '2026-10-09' }, indexLast: { HSI: '2026-09-30' }, capLast: { KOSPI200: '2026-10-01' } }, '2026-10-19');
  assert.equal(p.length, 4, p.join(' | '));
  assert.ok(p.some((x) => /indici: HSI/.test(x)) && p.some((x) => /cali forti: KOSPI200/.test(x)));
});

test('corse di recupero: si fermano solo se la seduta USA attesa c\'è già ovunque', async () => {
  const { needUpdate, RECOVERY } = await import('../scripts/need_update.js');
  const all = { SPX: '2026-10-19', NDX: '2026-10-19', DJI: '2026-10-19', RUT: '2026-10-19' };
  const done = { schedule: RECOVERY, expected: '2026-10-19', prices: '2026-10-19', breadth: '2026-10-19', indexLast: all };
  assert.equal(needUpdate(done).run, false);
  assert.equal(needUpdate({ ...done, prices: '2026-10-16' }).run, true);
  assert.equal(needUpdate({ ...done, indexLast: { ...all, RUT: '2026-10-16' } }).run, true);
  assert.equal(needUpdate({ ...done, indexLast: { SPX: '2026-10-19' } }).run, true); // indice mancante nel file
  assert.equal(needUpdate({ ...done, breadth: undefined }).run, true);
  assert.equal(needUpdate({ ...done, schedule: '40 22 * * 1-5' }).run, true); // corsa principale: sempre
  assert.equal(needUpdate({ ...done, schedule: '' }).run, true); // lanciata a mano: sempre
});

test('corse di recupero: lo stesso cron nel workflow e nello script', async () => {
  const fs = await import('node:fs');
  const { RECOVERY } = await import('../scripts/need_update.js');
  assert.ok(fs.readFileSync(new URL('../.github/workflows/update-data.yml', import.meta.url), 'utf8').includes(`cron: "${RECOVERY}"`));
});
