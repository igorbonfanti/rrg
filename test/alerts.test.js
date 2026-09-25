import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collectEvents, formatMessage, newEvents } from '../scripts/send_alerts.js';
import { parseCSV, validateMembers, publishable, computeCounts, mergeBreadth } from '../scripts/fetch_breadth.js';
import { expandRLE } from '../js/signals.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url)));

test('eventi storici e messaggio Telegram', () => {
  const ev = collectEvents(read('data/breadth.json'), read('data/sectors.json'), read('config/thresholds.json'));
  assert.ok(ev.length > 50);
  const covid = ev.filter((e) => e.date.startsWith('2020-03') && e.code === 'setup').map((e) => e.sector);
  assert.ok(covid.length >= 8, `zone blu a marzo 2020: ${covid.join(' ')}`);
  const msg = formatMessage({ date: '2026-09-21', sector: 'XLU', code: 'setup', text: 'breadth 3,2% ≤ livello blu 5%' });
  assert.match(msg, /ZONA BLU/);
  assert.match(msg, /21\/09\/2026/);
  assert.match(msg, /#XLU$/);
});

test('CSV con virgolette e validazione della lista', () => {
  const rows = parseCSV('Symbol,Security,GICS Sector\nMMM,3M,Industrials\nBRK.B,"Berkshire, Hathaway",Financials\n');
  assert.deepEqual(rows[1], { Symbol: 'BRK.B', Security: 'Berkshire, Hathaway', 'GICS Sector': 'Financials' });
  const { members, problems } = validateMembers(rows, null);
  assert.equal(members[1].s, 'BRK-B');
  assert.ok(problems.length > 0); // due righe non sono una lista S&P 500 valida
});

test('si pubblicano solo sedute complete', () => {
  const members = [{ s: 'A', sector: 'XLU' }, { s: 'B', sector: 'XLU' }, { s: 'C', sector: 'XLK' }];
  const mk = (dates, close) => ({ dates, close, index: new Map(dates.map((d, i) => [d, i])) });
  const prices = { A: mk(['d1', 'd2'], [1, 2]), B: mk(['d1', 'd2'], [1, 1]), C: mk(['d1'], [1]) };
  assert.deepEqual(publishable(members, prices, ['d1', 'd2']), ['d1']); // d2 in coda: manca C, si aspetta
  // buco nei dati: d2 incompleta ma d3 completa → d2 si salta, d3 si pubblica
  const holes = { A: mk(['d1', 'd2', 'd3'], [1, 2, 3]), B: mk(['d1', 'd3'], [1, 1]), C: mk(['d1', 'd3'], [1, 1]) };
  assert.deepEqual(publishable(members, holes, ['d1', 'd2', 'd3']), ['d1', 'd3']);
  const counts = computeCounts(members, prices, ['d1']);
  assert.deepEqual(counts.d1.XLU, { members: 2, n: 2, a20: 0, a50: 0, a200: 0 });
  assert.equal(counts.d1.SPX.n, 3);
});

test('una seduta saltata per un buco nei dati si inserisce al suo posto', () => {
  const series = () => ({ members: [[0, 31]], n: [[0, 31]], a20: [1, 3], a50: [1, 3], a200: [1, 3] });
  const b = { dates: ['2026-09-21', '2026-09-23'], series: { XLU: series(), SPX: series() } };
  const row = { members: 31, n: 30, a20: 2, a50: 2, a200: 2 };
  const added = mergeBreadth(b, { '2026-09-22': { XLU: row, SPX: row }, '2026-09-24': { XLU: row, SPX: row } });
  assert.equal(added, 2);
  assert.deepEqual(b.dates, ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24']);
  assert.deepEqual(b.series.XLU.a200, [1, 2, 3, 2]);
  assert.deepEqual(expandRLE(b.series.XLU.n, 4), [31, 30, 31, 30]);
  assert.equal(b.asOf, '2026-09-24');
});

test('alert: un evento comparso con il ricalcolo delle ultime sedute non va perso', async () => {
  const { newEvents: ne } = await import('../scripts/send_alerts.js');
  const dates = ['2026-09-18', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
  const state = { checkedThrough: '2026-09-24', log: [{ date: '2026-09-21', sector: 'XLP', code: 'setup' }] };
  const events = [
    { date: '2026-09-21', sector: 'XLP', code: 'setup' }, // già registrato
    { date: '2026-09-24', sector: 'XLU', code: 'setup' }, // comparso col ricalcolo del 23/09
    { date: '2026-09-25', sector: 'XLE', code: 'trig' }, // nuovo
    { date: '2025-01-10', sector: 'XLK', code: 'setup' }, // vecchio, fuori finestra
  ];
  const out = ne(events, state, dates, '2026-09-25').map((e) => e.sector);
  assert.deepEqual(out, ['XLU', 'XLE']);
  assert.deepEqual(ne(events, null, dates, '2026-09-25'), []); // prima esecuzione: nessun invio
});

test('breadth: due membri che non quotano più non bloccano la pubblicazione', () => {
  const mk = (dates) => ({ index: new Map(dates.map((d, i) => [d, i])) });
  const days = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'];
  const members = [], prices = {};
  for (let k = 0; k < 300; k++) { members.push({ s: 'A' + k, sector: k % 2 ? 'XLK' : 'XLF' }); prices['A' + k] = mk(days); }
  // due delistati dello stesso settore, fermi da inizio mese
  for (const s of ['D1', 'D2']) { members.push({ s, sector: 'XLK' }); prices[s] = mk(['2026-09-01', '2026-09-02']); }
  assert.deepEqual(publishable(members, prices, ['2026-09-24']), ['2026-09-24']);
  // due membri dello stesso settore senza la seduta ma attivi fino al giorno prima: si aspetta
  for (const s of ['L1', 'L2']) { members.push({ s, sector: 'XLF' }); prices[s] = mk(days.slice(0, -1)); }
  assert.deepEqual(publishable(members, prices, ['2026-09-24']), []);
});
