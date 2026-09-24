import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collectEvents, formatMessage } from '../scripts/send_alerts.js';
import { parseCSV, validateMembers, publishable, computeCounts } from '../scripts/fetch_breadth.js';

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
  assert.deepEqual(publishable(members, prices, ['d1', 'd2']), ['d1']); // d2: manca C (1 su 3 < 99%)
  const counts = computeCounts(members, prices, ['d1']);
  assert.deepEqual(counts.d1.XLU, { members: 2, n: 2, a20: 0, a50: 0, a200: 0 });
  assert.equal(counts.d1.SPX.n, 3);
});
