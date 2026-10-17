import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSpChanges, membership, resetDays, align, sectorIndex, windowOf, buildSectorMembers, parseIvv, wikiDate, normName, PERIODS, OFFSETS } from '../scripts/lib/capeq.js';
import { parseCSV } from '../scripts/fetch_breadth.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url)));
// calendario di sedute (lun-ven) dal giorno `from`
function sessions(from, n) {
  const out = [];
  for (let d = new Date(from + 'T12:00:00Z'); out.length < n; d = new Date(d.getTime() + 864e5)) if (d.getUTCDay() % 6) out.push(d.toISOString().slice(0, 10));
  return out;
}

test('tabella dei cambi di Wikipedia: date, ticker, nomi e righe con la data sopra', () => {
  const text = `{| class="wikitable sortable" id="changes"
|-
! rowspan="2" | Effective Date !! colspan="2" | Added
|-
! Ticker || Security || Ticker || Security
|-
|October 6, 2026
|TWLO
|[[Twilio]]
|WBD
|[[Warner Bros. Discovery]]
|[[Paramount Skydance]] acquired Warner Bros. Discovery
|<ref name=":1">x</ref>
|-
|| September 21, 2026 || BRK.B || [[Berkshire Hathaway]] || || || Market capitalization changes. || <ref name=a/>
|-
|| SATS || [[EchoStar]] || TAP || [[Molson Coors]] || Market capitalization changes.
|-
|| March 1, 2020 || OLD || [[Old]] || OLDX || [[Older]] || x
|}`;
  assert.equal(wikiDate('October 6, 2026'), '2026-10-06');
  assert.deepEqual(parseSpChanges(text, '2024-01-01'), [
    { date: '2026-10-06', add: 'TWLO', addName: 'Twilio', rem: 'WBD' },
    { date: '2026-09-21', add: 'BRK-B', addName: 'Berkshire Hathaway', rem: '' },
    { date: '2026-09-21', add: 'SATS', addName: 'EchoStar', rem: 'TAP' },
  ]);
  assert.equal(parseSpChanges('niente', '2024-01-01'), null);
});

test('appartenenza: ingressi, uscite con settore, ticker cambiato dopo l\'ingresso', () => {
  const members = [{ s: 'AAA', name: 'Alpha Inc.', sector: 'XLK' }, { s: 'ECHO', name: 'EchoStar Corporation', sector: 'XLC' }];
  const changes = [
    { date: '2026-03-23', add: 'SATS', addName: 'EchoStar', rem: 'BBB' },
    { date: '2025-11-03', add: 'AAA', addName: 'Alpha', rem: 'CCC' },
  ];
  const life = membership(members, changes, { BBB: { name: 'Beta', sector: 'XLK' } });
  assert.equal(normName('EchoStar Corporation'), 'echostar');
  assert.deepEqual(life.AAA, { sector: 'XLK', in: '2025-11-03', out: '9999' });
  assert.equal(life.ECHO.in, '2026-03-23');
  assert.deepEqual(life.BBB, { sector: 'XLK', in: '0000', out: '2026-03-23', former: true });
  assert.equal(life.CCC, undefined); // uscito senza settore noto: resta fuori
});

test('ribilanciamenti: 3° venerdì (giovedì se festivo) con la data di riferimento', () => {
  const cal = sessions('2026-01-01', 200).filter((d) => d !== '2026-06-19'); // Juneteenth
  const r = resetDays(cal);
  assert.equal(r.get('2026-03-20'), '2026-03-11');
  assert.equal(r.get('2026-06-18'), '2026-06-10');
  assert.equal(r.get('2026-09-18'), '2026-09-09');
  assert.equal(r.size, 3);
});

test('prezzi allineati: avanti nelle sedute senza scambi, null dopo l\'ultima quotazione', () => {
  assert.deepEqual(align(['a', 'b', 'c', 'd', 'e'], ['b', 'd'], [10, 12]), [null, 10, 10, 12, null]);
});

test('indici simulati: cap a buy-and-hold, equal ribilanciato, ingressi e uscite', () => {
  const cal = sessions('2026-02-02', 60), N = cal.length - 1;
  const up = cal.map((_, t) => 100 * 1.01 ** t), flat = cal.map(() => 50);
  // A sale dell'1% al giorno, B è fermo; C entra a metà e D esce a metà
  const px = { A: up, B: flat, C: cal.map((d, t) => (t >= 20 ? 20 : null)), D: cal.map((d, t) => (t <= 30 ? 30 : null)) };
  const life = { A: { in: '0000', out: '9999' }, B: { in: '0000', out: '9999' }, C: { in: cal[25], out: '9999' }, D: { in: '0000', out: cal[30] } };
  const shares = { A: 3 / up[N], B: 1 / 50, C: 1, D: 1 };
  const solo = sectorIndex({ cal, s0: 0, names: ['A', 'B'], life, px, shares, resets: new Map() });
  // cap-weighted a buy-and-hold: valore del paniere con azioni fisse
  const val = (t) => shares.A * up[t] + shares.B * 50;
  assert.ok(Math.abs(solo.cw[N] - val(N) / val(0)) < 1e-9);
  // equal-weight senza ribilanciamenti: media dei rendimenti dei due titoli
  assert.ok(Math.abs(solo.ew[N] - (up[N] / up[0] + 1) / 2) < 1e-9);
  // ribilanciamento alla seduta 40 (riferimento 35): dopo, le azioni sono proporzionali a 1/prezzo di riferimento
  const reb = sectorIndex({ cal, s0: 0, names: ['A', 'B'], life, px, shares, resets: new Map([[cal[40], cal[35]]]) });
  const V40 = reb.ew[40], qa = 1 / up[35], qb = 1 / 50, k = V40 / (qa * up[40] + qb * 50);
  assert.ok(Math.abs(reb.ew[N] - k * (qa * up[N] + qb * 50)) < 1e-9);
  // C conta dalla seduta 25, D fino alla 29: entrambi fermi, quindi abbassano il rendimento ma non lo rompono
  const all = sectorIndex({ cal, s0: 0, names: ['A', 'B', 'C', 'D'], life, px, shares, resets: new Map() });
  assert.ok(all.ew[N] > 1 && all.ew[N] < solo.ew[N]);
  assert.ok(all.ew.every((v) => Number.isFinite(v)));
});

test('finestre dei periodi: YTD parte dall\'ultima seduta dell\'anno prima', () => {
  const cal = sessions('2025-06-02', 400), N = cal.length - 1;
  assert.deepEqual(windowOf(cal, '3M', N), [N - 63, N]);
  const [a] = windowOf(cal, 'YTD', N);
  assert.equal(cal[a] < `${cal[N].slice(0, 4)}-01-01` && cal[a + 1] >= `${cal[N].slice(0, 4)}-01-01`, true);
  assert.equal(windowOf(cal, 'YTD', a), null);
});

test('holdings di IVV: valore di mercato e data', () => {
  const csv = 'iShares Core S&P 500 ETF\nFund Holdings as of,"Oct 15, 2026"\n\nTicker,Name,Sector,Asset Class,Market Value,Weight (%)\n' +
    '"NVDA","NVIDIA","Information Technology","Equity","69,926,310,497.94","7.86"\n"BRKB","BERKSHIRE","Financials","Equity","1,000.5","0.01"\n"USD","USD CASH","Cash","Cash","5","0.00"\n';
  const p = parseIvv(csv, parseCSV);
  assert.equal(p.asOf, '2026-10-15');
  assert.deepEqual(Object.keys(p.mv), ['NVDA', 'BRKB']);
  assert.equal(p.mv.NVDA, 69926310497.94);
});

test('buildSectorMembers: forma del file e numeri dei titoli', () => {
  const cal = sessions('2024-09-02', 540), N = cal.length - 1;
  const members = [{ s: 'A', name: 'A', sector: 'XLK', sub: 'x' }, { s: 'B', name: 'B', sector: 'XLK', sub: 'y' }, { s: 'C', name: 'C', sector: 'XLU', sub: 'z' }];
  const px = { A: cal.map((_, t) => 100 + t), B: cal.map((_, t) => 200 - t / 10), C: cal.map(() => 10) };
  const life = membership(members, [], {});
  const out = buildSectorMembers({ cal, members, life, px, mv: { A: 3, B: 1, C: 1 }, sectors: ['XLK', 'XLU'] });
  assert.equal(out.asOf, cal[N]);
  assert.deepEqual(Object.keys(out.sectors), ['XLK', 'XLU', 'SPX']);
  for (const p of PERIODS) assert.equal(out.sectors.XLK[p].length, OFFSETS.length);
  assert.deepEqual(out.sectors.XLU['3M'][0], [0, 0]);
  const a = out.stocks.find((x) => x.s === 'A');
  assert.equal(a.r['3M'], Math.round((px.A[N] / px.A[N - 63] - 1) * 1000) / 10);
  assert.equal(a.dd, 0);
  assert.equal(a.w, 60);
  assert.ok(a.d200 > 0);
});

test('data/sector_members.json: 11 settori, S&P 500 e titoli della lista', () => {
  const d = read('data/sector_members.json'), m = read('data/sp500_members.json');
  assert.equal(Object.keys(d.sectors).length, 12);
  assert.ok(d.stocks.length >= m.members.length - 5);
  for (const k in d.sectors) for (const p of PERIODS) {
    const now = d.sectors[k][p][0];
    assert.ok(now && now.every((v) => Number.isFinite(v)), `${k} ${p}`);
  }
  assert.ok(d.stocks.every((s) => s.r && 'YTD' in s.r && s.sec));
});
