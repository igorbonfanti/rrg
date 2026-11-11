import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseISharesHoldings, checkList, nextList } from '../scripts/lib/members.js';
import { parseCSV } from '../scripts/fetch_breadth.js';
import { countDay } from '../scripts/fetch_indices.js';
import { etfSeries, publishableDays, expandBreadth, packBreadth, realign, setRows, lastBreadth, breadthRows, latestRows,
  industryMembers, mergeMembers, listOut } from '../scripts/fetch_industries.js';
import { expandRLE } from '../js/signals.js';
import { decodeDates } from '../js/indexdata.js';
import { capSeries } from '../js/capitulation.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url)));
const cfg = read('config/industries.json').industries;

// calendario di sedute dal lunedì al venerdì
function weekdays(from, n) {
  const out = [];
  for (let t = Date.parse(from + 'T00:00:00Z'); out.length < n; t += 864e5) { const d = new Date(t); if (d.getUTCDay() % 6) out.push(d.toISOString().slice(0, 10)); }
  return out;
}

test('holdings iShares: azioni con nomi, pesi e quantità; cassa, futures e righe senza simbolo fuori', () => {
  const h = parseISharesHoldings(fs.readFileSync(new URL('./fixtures/ishares_soxx_ridotto.csv', import.meta.url), 'utf-8'), parseCSV);
  assert.equal(h.asOf, '2026-11-10');
  assert.deepEqual(h.rows.map((r) => r.s), ['AMD', 'TSM', 'SKHY', 'TST-B']);
  assert.deepEqual(h.rows[0], { s: 'AMD', name: 'ADVANCED MICRO DEVICES', w: 10.11, q: 8097904, location: 'United States', exchange: 'NASDAQ' });
  assert.equal(h.rows[1].exchange, 'NYSE'); // ADR di Taiwan quotato a New York
  assert.equal(h.rows[2].location, 'Korea (South)');
  assert.deepEqual([h.rows[3].w, h.rows[3].q], [0.15, 150]); // stesso titolo su due righe: si somma
  assert.equal(parseISharesHoldings('nessuna tabella', parseCSV), null);
});

test('lista del SOXX: limiti di config/industries.json e 80% in comune con l\'ultima buona', () => {
  const { min, max } = cfg.SOXX;
  const prev = Array.from({ length: 30 }, (_, i) => 'T' + i);
  assert.deepEqual(checkList(prev, prev, { min, max }), []);
  assert.match(checkList(prev.slice(0, 20), prev, { min, max }).join(), /20 titoli/);
  const swap = prev.slice(0, 23).concat(['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7']); // 23 su 30 in comune: meno dell'80%
  assert.match(checkList(swap, prev, { min, max }).join(), /in comune/);
  // un cambio normale: la lista nuova si accetta e il cambio si registra
  const old = { asOf: '2026-11-10', source: 'x', count: 30, tickers: [...prev].sort(), changes: [] };
  const r = nextList(prev.slice(1).concat(['NEW']), old, { min, max }, '2026-11-11');
  assert.deepEqual([r.added, r.removed], [['NEW'], ['T0']]);
  assert.deepEqual(r.out.changes, [{ date: '2026-11-11', added: ['NEW'], removed: ['T0'] }]);
  assert.deepEqual(Object.keys(listOut(r.out, 'url')), ['asOf', 'source', 'count', 'tickers', 'changes']);
  // lista scartata o illeggibile: resta l'ultima buona
  const bad = nextList(swap, old, { min, max }, '2026-11-11');
  assert.equal(bad.out, null);
  assert.equal(bad.tickers, old.tickers);
  assert.equal(nextList(null, old, { min, max }, '2026-11-11').out, null);
});

test('sedute pubblicabili: al massimo un titolo quotato senza la chiusura, coda attesa, buco saltato', () => {
  const mk = (dates) => ({ dates, close: dates.map(() => 1) });
  const all = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
  const px = { A: mk(all), B: mk(all), C: mk(all) };
  assert.deepEqual(publishableDays(['A', 'B', 'C'], px, all).ok, all);
  // un titolo senza l'ultima seduta: si pubblica (≤1); due: si aspetta
  const one = { ...px, C: mk(all.slice(0, 4)) };
  assert.deepEqual(publishableDays(['A', 'B', 'C'], one, all).ok, all);
  const two = { ...one, B: mk(all.slice(0, 4)) };
  const w = publishableDays(['A', 'B', 'C'], two, all);
  assert.deepEqual(w.ok, all.slice(0, 4));
  assert.match(w.notes[0], /2026-11-06 non ancora pubblicabile: senza la chiusura del giorno B C/);
  // due titoli senza una seduta in mezzo: buco della fonte, si salta
  const hole = { A: mk(all), B: mk(all.filter((d) => d !== '2026-11-04')), C: mk(all.filter((d) => d !== '2026-11-04')) };
  const h = publishableDays(['A', 'B', 'C'], hole, all);
  assert.deepEqual(h.ok, ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06']);
  assert.match(h.notes[0], /saltata/);
  // un titolo quotato dopo quel giorno o fermo da più di una settimana non conta come mancante
  const late = { ...px, D: mk(['2026-11-06']), E: mk(['2026-10-01']), F: mk(['2026-10-01']) };
  assert.deepEqual(publishableDays(['A', 'B', 'C', 'D', 'E', 'F'], late, all).ok, all);
});

test('breadth e fotografia con la regola di countDay: righe con la chiusura = n, somma di up200 = a200', () => {
  const cal = weekdays('2025-01-06', 260), last = cal.at(-1);
  const up = cal.map((_, i) => 100 + i), down = cal.map((_, i) => 400 - i);
  const px = {
    UP: { dates: cal, close: up }, DOWN: { dates: cal, close: down },
    NEW: { dates: cal.slice(-50), close: cal.slice(-50).map((_, i) => 10 + i) }, // meno di 200 sedute: conta «sotto»
    LATE: { dates: cal.slice(0, -2), close: up.slice(0, -2) }, // ultima seduta 2 giorni prima: conta, con la sua chiusura
  };
  const tickers = ['UP', 'DOWN', 'NEW', 'LATE', 'NONE'];
  const { rows, short } = breadthRows(tickers, px, [last]);
  assert.deepEqual(short, []);
  assert.deepEqual(rows[last], { members: 5, n: 4, a20: 3, a50: 3, a200: 2 });
  const info = tickers.map((s, i) => ({ s, name: 'N' + s, w: 10 - i }));
  const lt = latestRows(info, px, last);
  assert.equal(lt.length, 5);
  assert.equal(lt.filter((x) => x.close != null).length, rows[last].n);
  assert.equal(lt.filter((x) => x.up200).length, rows[last].a200);
  assert.deepEqual(lt[4], { s: 'NONE', name: 'NNONE', w: 6 });
  assert.equal(lt[3].at, cal.at(-3)); // chiusura di un'altra seduta: lo dice
  assert.equal(lt[0].at, undefined);
  assert.deepEqual(Object.keys(lt[0]), ['s', 'name', 'close', 'd20', 'd50', 'd200', 'up200', 'dd', 'w']);
  assert.equal(lt[1].dd, Math.round((down.at(-1) / Math.max(...down.slice(-252)) - 1) * 1000) / 10);
  assert.equal(lt[2].d200, null);
  assert.equal(lt[2].up200, false);
  // stessa regola della ricostruzione: countDay
  const c = countDay(tickers, px, last);
  assert.equal(c.a200, rows[last].a200);
});

test('breadth del file: RLE, riallineamento per data, ricalcolo delle ultime sedute', () => {
  const d1 = ['2026-11-02', '2026-11-03', '2026-11-04'], d2 = [...d1, '2026-11-05'];
  const e = expandBreadth({ members: [[0, null], [1, 30]], n: [[0, null], [1, 29]], a20: [null, 5, 6], a50: [null, 4, 5], a200: [null, 2, 3] }, 3);
  assert.deepEqual(e.n, [null, 29, 29]);
  const r = realign(e, d1, d2);
  assert.deepEqual(r.a200, [null, 2, 3, null]);
  assert.equal(lastBreadth(r, d2), '2026-11-04');
  setRows(r, d2, { '2026-11-05': { members: 30, n: 30, a20: 1, a50: 1, a200: 1 }, '2026-11-04': { members: 30, n: 30, a20: 2, a50: 2, a200: 2 } });
  const p = packBreadth(r);
  assert.deepEqual(p.members, [[0, null], [1, 30]]);
  assert.deepEqual(p.n, [[0, null], [1, 29], [2, 30]]);
  assert.deepEqual(p.a200, [null, 2, 2, 1]);
  assert.deepEqual(expandRLE(p.n, 4), [null, 29, 30, 30]);
});

test('prezzo dell\'ETF: chiusure rettificate a 2 decimali e max52 alla seduta della breadth', () => {
  const dates = weekdays('2025-06-02', 300);
  const close = dates.map((_, i) => 100 + (i === 200 ? 50 : i % 7));
  const res = { dates, close, adjclose: close.map((c, i) => c * (i < 250 ? 0.99 : 1) + 0.001), high: close.map((c) => c + 1) };
  const at = dates[280];
  const s = etfSeries(res, at);
  assert.equal(s.max52At, at);
  assert.equal(s.adjclose[0], Math.round(res.adjclose[0] * 100) / 100);
  assert.deepEqual([s.max52.hi, s.max52.d, s.max52.ih, s.max52.id], [150, dates[200], 151, dates[200]]);
  assert.equal(s.max52.c, close[280]);
  assert.equal(s.max52.dv, 1); // una cedola nel periodo (cambio del fattore di rettifica alla seduta 250)
  assert.equal(s.max52.da, 1); // dopo il massimo
});

test('vista 5 dell\'industria: nessuna riga SPX, pesi delle azioni dell\'ETF, file di ieri se manca una chiusura', () => {
  const cal = weekdays('2024-09-02', 560), N = cal.length - 1;
  const px = { A: { dates: cal, close: cal.map((_, i) => 10 + i / 10) }, B: { dates: cal, close: cal.map((_, i) => 50 - i / 50) } };
  const info = [{ s: 'A', name: 'Alfa' }, { s: 'B', name: 'Beta' }];
  const { out } = industryMembers({ key: 'SOXX', cal, info, px, qty: { A: 100, B: 30 }, weightsAsOf: '2026-11-10' });
  assert.deepEqual(Object.keys(out.sectors), ['SOXX']);
  assert.deepEqual(Object.keys(out.hist.sectors), ['SOXX']);
  assert.equal(out.asOf, cal[N]);
  assert.equal(out.weightsAsOf, '2026-11-10');
  assert.deepEqual(out.missing, []);
  assert.ok(out.stocks.every((x) => x.sec === 'SOXX'));
  const va = 100 * px.A.close[N], vb = 30 * px.B.close[N];
  assert.equal(out.stocks[0].w, Math.round((va / (va + vb)) * 1e5) / 1e3);
  const short = { ...px, B: { dates: cal.slice(0, -1), close: px.B.close.slice(0, -1) } };
  const r = industryMembers({ key: 'SOXX', cal, info, px: short, qty: { A: 100, B: 30 } });
  assert.equal(r.out, null);
  assert.deepEqual(r.noClose, ['B']);
  assert.deepEqual(mergeMembers([out]), out);
});

test('data/industries.json: calendario, breadth e fotografia coerenti, storia da `from`', () => {
  const f = read('data/industries.json');
  const dates = decodeDates(f.dates.d0, f.dates.gaps), L = dates.length;
  assert.equal(dates[0], '2001-07-13'); // prima seduta del SOXX
  for (let i = 1; i < L; i++) assert.ok(dates[i] > dates[i - 1]);
  for (const k of Object.keys(cfg)) {
    const s = f.series[k], b = s.breadth;
    assert.equal(s.adjclose.length, L, k);
    assert.ok(s.adjclose.every((v) => v > 0 && Math.round(v * 100) / 100 === v), k);
    assert.ok(s.max52 && s.max52.hi >= s.max52.c && s.max52At <= dates.at(-1), k);
    const mem = expandRLE(b.members, L), n = expandRLE(b.n, L);
    for (const a of [b.a20, b.a50, b.a200]) assert.equal(a.length, L, k);
    const first = b.a200.findIndex((v) => v != null);
    assert.equal(dates[first], cfg[k].from, k);
    for (let i = 0; i < L; i++) {
      if (b.a200[i] == null) continue; // prima di `from`, o una seduta saltata per un buco della fonte
      assert.ok(n[i] <= mem[i] && n[i] > 0, `${k} ${dates[i]}`);
      for (const a of [b.a20, b.a50, b.a200]) assert.ok(a[i] >= 0 && a[i] <= n[i], `${k} ${dates[i]}`);
    }
    const lt = f.latest[k], i = dates.indexOf(lt.asOf);
    assert.equal(lt.asOf, dates[b.a200.findLastIndex((v) => v != null)], k);
    assert.equal(lt.members.length, mem[i], k);
    assert.equal(lt.members.filter((x) => x.close != null).length, n[i], k);
    assert.equal(lt.members.filter((x) => x.up200).length, b.a200[i], k);
    const li = f.lists[k];
    assert.equal(li.count, li.tickers.length);
    assert.ok(li.count >= cfg[k].min && li.count <= cfg[k].max, k);
    assert.deepEqual([...lt.members.map((x) => x.s)].sort(), li.tickers, k);
  }
  assert.equal(f.asOf, Object.values(f.latest).map((x) => x.asOf).sort()[0]);
});

test('data/industry_members.json e serie dei cali forti delle industrie', () => {
  const m = read('data/industry_members.json'), f = read('data/industries.json'), cap = read('data/capitulation.json');
  assert.deepEqual(Object.keys(m.sectors), Object.keys(cfg)); // senza SPX
  assert.equal(m.asOf, f.asOf);
  for (const k of Object.keys(cfg)) {
    const st = m.stocks.filter((x) => x.sec === k);
    assert.equal(st.length, f.lists[k].count, k);
    assert.ok(Math.abs(st.reduce((a, x) => a + x.w, 0) - 100) < 0.05, k);
    const c = capSeries(cap.series[k]);
    assert.equal(c.dates[0], cfg[k].from, k);
    assert.ok(c.dates.at(-1) >= f.asOf, k);
  }
});
