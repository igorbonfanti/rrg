import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { expandRLE, encodeRLE, breadthSeries, priceSeries, runMachine, SECTOR_KEYS } from '../js/signals.js';

const B = JSON.parse(fs.readFileSync(new URL('../data/breadth.json', import.meta.url)));
const S = JSON.parse(fs.readFileSync(new URL('../data/sectors.json', import.meta.url)));
const T = JSON.parse(fs.readFileSync(new URL('../config/thresholds.json', import.meta.url)));

test('RLE andata e ritorno', () => {
  const a = [3, 3, 3, 5, 5, 3];
  assert.deepEqual(encodeRLE(a), [[0, 3], [3, 5], [5, 3]]);
  assert.deepEqual(expandRLE(encodeRLE(a), a.length), a);
});

test('breadth ricostruita coincide con i valori pubblicati di SUTH', () => {
  const br = breadthSeries(B, 'XLU', S.dates);
  const at = (d) => Math.floor(br.pct200[S.dates.indexOf(d)] * 100) / 100; // i fornitori troncano a 2 decimali
  assert.equal(at('2018-04-27'), 42.85);
  assert.equal(at('2018-07-27'), 82.75);
  assert.equal(at('2020-05-22'), 3.57);
});

test('configurazione: livello blu per tutti gli 11 settori, Consumer Discretionary all\'8%', () => {
  for (const s of SECTOR_KEYS) assert.ok(Number.isFinite(T.blue[s]), s);
  assert.equal(T.blue.XLY, 8);
});

// scenario sintetico: crollo con breadth a zero, poi recupero con prezzo sopra una media 20g crescente
function scenario() {
  const n = 700, close = [], p200 = [], p50 = [], p20 = [], nn = [];
  for (let i = 0; i < n; i++) {
    let p;
    if (i < 400) p = 100 + i * 0.05; // lento rialzo: drawdown quasi nullo nella storia
    else if (i < 460) p = 120 - (i - 400) * 0.6; // crollo del 30%
    else p = 84 + (i - 460) * 0.25; // ripresa
    close.push(p);
    const b = i < 420 ? 60 : i < 470 ? 0 : Math.min(60, (i - 470) * 2);
    p200.push(b); p50.push(b); p20.push(b); nn.push(30);
  }
  return { px: priceSeries(close), br: { pct200: p200, pct50: p50, pct20: p20, n: nn } };
}

test('macchina a stati: zona blu nel crollo, trigger nella ripresa, poi cooldown', () => {
  const { px, br } = scenario();
  const m = runMachine(px, br, 5, T.params);
  const codes = m.events.map((e) => e.code);
  assert.deepEqual(codes, ['setup', 'trig']);
  const [setup, trig] = m.events;
  assert.ok(setup.t >= 421 && setup.t < 470, `zona blu a ${setup.t}`);
  assert.ok(trig.t > 470, `trigger a ${trig.t}`);
  assert.equal(m.days[trig.t], 'trig');
  assert.equal(m.days[trig.t + 30], 'cool');
  assert.ok(['normal', 'watch'].includes(m.days[trig.t + 80]));
});

test('dati reali: Utilities in attenzione al 21/09/2026, zona blu nel 2008, 2020 e 2022', () => {
  const m = runMachine(priceSeries(S.adjclose.XLU), breadthSeries(B, 'XLU', S.dates), T.blue.XLU, T.params);
  assert.equal(m.days[S.dates.indexOf('2026-09-21')], 'watch');
  const years = m.setups.map((u) => S.dates[u.t].slice(0, 4));
  for (const y of ['2008', '2020', '2022']) assert.ok(years.includes(y), y);
});

test('segnale fallito tardivo: prezzo sotto il minimo e breadth sotto il livello prima del riarmo', async () => {
  const { runMachine, priceSeries } = await import('../js/signals.js');
  // 300 sedute di salita, crollo con breadth a 2%, rimbalzo (trigger), poi dopo 40 sedute nuovo minimo con breadth a 1%
  const close = [], b = [];
  for (let i = 0; i < 300; i++) { close.push(100 + i * 0.1); b.push(60); }
  for (let i = 0; i < 30; i++) { close.push(130 - i * 1.5); b.push(i < 10 ? 30 : 2); }
  for (let i = 0; i < 30; i++) { close.push(86 + i * 0.6); b.push(i < 3 ? 2 : 20); }
  for (let i = 0; i < 40; i++) { close.push(104 - i * 0.2); b.push(20); }
  for (let i = 0; i < 20; i++) { close.push(96 - i * 1.2); b.push(1); }
  const n = close.length, arr = (v) => new Array(n).fill(v);
  const br = { pct200: b, pct50: b.map((x) => x), pct20: b.map((x, i) => (i > 330 && i < 336 ? 80 : x)), n: arr(100) };
  const m = runMachine(priceSeries(close), br, 5);
  const codes = m.events.map((e) => e.code);
  assert.ok(codes.includes('trig'), codes.join(' '));
  const trig = m.events.find((e) => e.code === 'trig').t, fail = m.events.find((e) => e.code === 'fail');
  assert.ok(fail && fail.t - trig > 20, `fallito ${fail && fail.t - trig} sedute dopo il trigger`);
  assert.equal(m.days[fail.t], 'fail');
  // prima del fallimento, con la breadth sotto il livello ma dopo il trigger, la seduta è "sospesa"
  assert.ok(m.off.slice(trig, fail.t).every((x) => x == null || x === 'cool' || x === 'rearm'));
});

test('soglia di avvicinamento: livello + calo forte in 10 sedute', async () => {
  const { approachLevel } = await import('../js/signals.js');
  // breadth che scende di 1 punto al giorno: ogni calo in 10 sedute vale 10 punti
  const b = Array.from({ length: 60 }, (_, i) => 80 - i);
  assert.equal(approachLevel(b, 5), 15);
  assert.equal(approachLevel([50, 50, 50], 5), null);
  // i null non contano
  assert.equal(approachLevel([null, ...b, null], 5), 15);
});
