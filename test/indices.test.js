import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encodeDates, decodeDates, indexSeries, deltaEncode, deltaDecode, packIndex, unpackIndex } from '../js/indexdata.js';
import { wikiColumn, cellText, PARSERS, parseNikkei, parseExsa, parseNasdaq, parseIShares, parseB3 } from '../scripts/lib/members.js';
import { checkList, needsChart, clean, countDay, expand, pack, mergePrices, setCounts } from '../scripts/fetch_indices.js';
import { parseCSV } from '../scripts/fetch_breadth.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url)));

test('date compresse: andata e ritorno', () => {
  const d = ['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-09', '2026-02-10'];
  const e = encodeDates(d);
  assert.equal(e.gaps, '313w'); // 3, 1, 3 e 32 giorni
  assert.deepEqual(decodeDates(e.d0, e.gaps), d);
  assert.throws(() => encodeDates(['2026-01-01', '2026-03-01']));
});

test('data/indices.json e indices_more.json: ogni indice ha prezzo e breadth coerenti, i principali nel primo file', () => {
  const cfg = read('config/indices.json').indices, main = read('data/indices.json').series, more = read('data/indices_more.json').series;
  const data = { ...more, ...main };
  for (const k of Object.keys(cfg)) assert.ok(cfg[k].main ? main[k] : more[k], `${k} nel file giusto`);
  for (const k of Object.keys(cfg)) {
    const s = indexSeries(data[k]);
    assert.equal(s.dates.length, s.close.length, k);
    assert.ok(s.dates.every((d, i) => i === 0 || d > s.dates[i - 1]), `${k}: date in ordine`);
    const b = s.pct200.filter((v) => v != null);
    assert.ok(b.length > 2000, `${k}: ${b.length} sedute di breadth`); // il Russell 2000 parte dal 2017
    assert.ok(b.every((v) => v >= 0 && v <= 100), k);
    assert.ok(s.n.every((n, i) => n == null || n <= s.members[i]), `${k}: quotati ≤ membri`);
  }
});

test('formato compatto: differenze senza perdita, nulls e file vecchi', () => {
  assert.deepEqual(deltaEncode([10, 12, null, 7, 7]), [10, 2, null, 7, 0]);
  assert.deepEqual(deltaDecode([10, 2, null, 7, 0]), [10, 12, null, 7, 7]);
  const close = [1455.22, 1399.42, 0.07, 72516.98];
  assert.deepEqual(deltaDecode(deltaEncode(close, 100), 100), close);
  const x = { symbol: 'X', d0: '2026-01-02', gaps: '13', b0: 1, members: [[0, 3]], n: [[0, 3]], close: [100.5, 101.25, 99], a20: [1, null], a50: [2, 3], a200: [0, 1] };
  const p = packIndex(x);
  assert.equal(p.close, undefined);
  assert.deepEqual(unpackIndex(p), x);
  assert.equal(unpackIndex(x), x); // formato esteso: si legge così com'è
  assert.deepEqual(indexSeries(p), indexSeries(x));
});

test('tabelle di Wikipedia: colonna dei ticker', () => {
  const dow = `{| class="wikitable" id="constituents"
|-
!scope="col"| Company
!scope="col"| Exchange
!scope="col"| Symbol
|-
!scope="row"| [[3M]]
| [[New York Stock Exchange|NYSE]]
| {{NYSE link|MMM}}
|-
!scope="row"| [[Berkshire Hathaway]]<ref>nota</ref>
| NYSE
| {{NYSE link|BRK.B}}
|}`;
  assert.deepEqual(PARSERS.DJI(dow), ['MMM', 'BRK-B']);
  const ftse = `{| class="wikitable sortable" id="constituents"
|-
!|Company|| Ticker || Sector<ref>{{cite web|url=x |title=y}}</ref>
|-
|[[3i]]||III||Financial services
|-
|[[BT Group]]|| BT.A || Telecom
|-
|[[Rolls-Royce Holdings|Rolls-Royce]]||RR.||Aerospace
|}`;
  assert.deepEqual(PARSERS.UKX(ftse), ['III.L', 'BT-A.L', 'RR.L']);
  const smi = `{| class="wikitable sortable"
! style="color: black;"| Rank
! style="color: black;"| Ticker
|-
|1|| {{SWX3|NOVN}}
|}`;
  assert.deepEqual(PARSERS.SMI(smi), ['NOVN.SW']);
  assert.equal(cellText(' {{FWB link|ADS.DE}} '), 'ADS.DE');
  assert.equal(wikiColumn('{|\n! A !! B\n|-\n| 1 || 2\n|}', /^Ticker$/), null);
});

test('CSV Nikkei, holdings EXSA e API Nasdaq', () => {
  const nk = new TextEncoder().encode('Date of Data,Code,Company Name\n"2026/09/30","1332","NISSUI"\n"2026/09/30","285A","KIOXIA"\n');
  assert.deepEqual(parseNikkei(nk), ['1332.T', '285A.T']);
  const exsa = 'Fondsname\n\nEmittententicker,Name,Anlageklasse,Börse\n"ASML","ASML","Aktien","Euronext Amsterdam"\n"BT.A","BT","Aktien","London Stock Exchange"\n"EUR","Euro","Cash","-"\n';
  assert.deepEqual(parseExsa(exsa, parseCSV), ['ASML.AS', 'BT-A.L']);
  assert.equal(parseExsa(exsa.replace('Euronext Amsterdam', 'Borsa Nuova'), parseCSV), null);
  assert.deepEqual(parseNasdaq({ data: { data: { rows: [{ symbol: 'AAPL' }, { symbol: 'BRK.B' }] } } }), ['AAPL', 'BRK-B']);
  assert.equal(parseNasdaq({}), null);
});

test('lista nuova: numero di titoli e sovrapposizione con l\'ultima buona', () => {
  const prev = Array.from({ length: 40 }, (_, i) => 'T' + i);
  assert.deepEqual(checkList(prev.slice(0, 38).concat(['A', 'B']), prev, { min: 40, max: 40 }), []);
  assert.equal(checkList(prev.slice(0, 30), prev, { min: 40, max: 40 }).length, 2); // troppo pochi e poco in comune
  assert.match(checkList(prev.slice(0, 20).concat(Array.from({ length: 20 }, (_, i) => 'X' + i)), prev, { min: 40, max: 40 })[0], /in comune/);
  assert.match(checkList(['A', 'A'], null, { min: 2, max: 2 })[0], /doppi/);
});

test('spark: si riscaricano i titoli con sedute mancanti o indietro', () => {
  const full = { dates: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'], close: [1, 1, 1, 1, 1, 1] };
  const px = { 'A.WA': { dates: ['2026-09-30', '2026-10-01', '2026-10-12'], close: [1, 1, 1] }, 'B.WA': full, 'C.WA': full, 'D.L': { dates: ['2026-10-09'], close: [1] }, 'E.L': full, 'F.L': full };
  assert.deepEqual(needsChart(px, ['A.WA', 'B.WA', 'C.WA', 'D.L', 'E.L', 'F.L', 'G.L']), ['A.WA', 'D.L', 'G.L']);
});

test('pulizia degli errori di scala', () => {
  const d = ['a', 'b', 'c', 'd', 'e', 'f'];
  // chiusura isolata 100 volte troppo alta
  assert.deepEqual(clean(d, [10, 10, 1000, 10, 10, 10]).close, [10, 10, 10, 10, 10]);
  // tratto in pence per due sedute, poi di nuovo in sterline
  assert.deepEqual(clean(d, [10, 10, 1000, 1000, 10, 10]).close, [10, 10, 10, 10]);
  // split non rettificato: la storia prima si porta alla nuova scala
  assert.deepEqual(clean(d, [100, 100, 100, 10, 10, 10]).close, [10, 10, 10, 10, 10, 10]);
});

test('conteggi di una seduta e aggiornamento del file', () => {
  const dates = Array.from({ length: 210 }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10));
  const up = { dates, close: dates.map((_, i) => 100 + i) }; // sempre sopra le medie
  const down = { dates, close: dates.map((_, i) => 300 - i) };
  const stale = { dates: dates.slice(0, 200), close: dates.slice(0, 200).map(() => 1) };
  const d = dates.at(-1);
  const r = countDay(['UP', 'DOWN', 'STALE', 'MISSING'], { UP: up, DOWN: down, STALE: stale }, d);
  assert.deepEqual(r, { members: 4, n: 2, fresh: 2, a20: 1, a50: 1, a200: 1 });

  const x = { symbol: '^X', ...encodeDates(['2026-10-12', '2026-10-13', '2026-10-14']), close: [1, 2, 3], b0: 1, members: [[0, 10]], n: [[0, 10]], a20: [5], a50: [5], a200: [5] };
  const e = expand(x);
  mergePrices(e, ['2026-10-14', '2026-10-15'], [3.333, 4]);
  assert.deepEqual(e.close, [1, 2, 3.33, 4]);
  assert.ok(setCounts(e, '2026-10-15', { members: 10, n: 9, a20: 1, a50: 2, a200: 3 }));
  assert.ok(!setCounts(e, '2026-10-12', { members: 10, n: 9, a20: 1, a50: 2, a200: 3 }));
  const s = indexSeries(pack(e));
  assert.deepEqual(s.above200, [null, 5, null, 3]);
  assert.equal(s.pct200[3], (100 * 3) / 9);
});

test('indici con limiti: holdings iShares, B3 e tabelle di Wikipedia', () => {
  const csv = 'iShares\nFund Holdings as of,"Oct 14, 2026"\n\nTicker,Name,Asset Class,Exchange\n"MOG A","MOOG","Equity","NYSE"\n"ADRO","A","Equity","NASDAQ"\n"ADRO","A CVR","Equity","NASDAQ"\n"-","X","Equity","NYSE"\n"USD","Cash","Cash","-"\n';
  assert.deepEqual(parseIShares(csv, parseCSV), ['MOG-A', 'ADRO']);
  const em = 'Ticker,Name,Asset Class,Exchange\n"700","TENCENT","Equity","Hong Kong Exchanges And Clearing Ltd"\n"WALMEX*","WALMART DE MEXICO","Equity","Bolsa Mexicana De Valores"\n"PTT.R","PTT","Equity","Stock Exchange Of Thailand"\n"2330","TSMC","Equity","Taiwan Stock Exchange"\n"X","Ignota","Equity","Borsa di Marte"\n';
  assert.deepEqual(parseIShares(em, parseCSV, true), ['0700.HK', 'WALMEX.MX', 'PTT.BK', '2330.TW']);
  assert.deepEqual(parseB3({ results: [{ cod: 'ABEV3 ' }, { cod: 'PETR4' }] }), ['ABEV3.SA', 'PETR4.SA']);
  const hsi = '{| class="wikitable"\n!Ticker\n!Name\n|-\n|{{SEHK|5}}\n|[[HSBC]]\n|-\n|{{SEHK|388}}\n|[[HKEX]]\n|}';
  assert.deepEqual(PARSERS.HSI(hsi), ['0005.HK', '0388.HK']);
  const csi = '{|\n!Ticker\n!Company\n|-\n|{{SSE|600519}}\n|Moutai\n|-\n|{{SZSE|000858}}\n|Wuliangye\n|}';
  assert.deepEqual(PARSERS.CSI300(csi), ['600519.SS', '000858.SZ']);
  const ks = '{|\n! Company !! Symbol !! Sector\n|-\n| A || 090430 || x\n|-\n| B || 0126Z0 || y\n|}';
  assert.deepEqual(PARSERS.KOSPI200(ks), ['090430.KS', '0126Z0.KS']);
  const ibex = '{|\n!Ticker\n!Company\n|-\n|[https://www.bolsamadrid.es/x?ISIN=ES1 ACS.MC] \n|[[ACS]]\n|}';
  assert.deepEqual(PARSERS.IBEX(ibex), ['ACS.MC']);
  const asx = '{|\n!Code!!Company\n|-\n|FPH|FPH\n|x\n|-\n|360\n|Life360\n|}';
  assert.deepEqual(PARSERS.ASX200(asx), ['FPH.AX', '360.AX']);
});

test('version.json e js/version.js hanno la stessa versione', async () => {
  const { VERSION, RELEASE } = await import('../js/version.js');
  const v = read('version.json');
  assert.equal(v.version, VERSION);
  assert.equal(v.release, RELEASE);
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
