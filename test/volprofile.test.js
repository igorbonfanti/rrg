// Profilo dei volumi degli ultimi 12 mesi (1.11.0, vista 8 VIX, pannello dei massimi): calcolo uguale allo script della
// ricerca (ricerca/poc/profilo/analisi.mjs, ricalcolato da verifica.py) su un estratto dei dati reali, casi limite, profilo
// pubblicato tenuto, formato del file e controllo dei dati fermi. Sulla 1.10.2 fallisce: scripts/lib/volprofile.js non esiste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { parse, parseHourly } from '../scripts/lib/yahoo.js';
import { buildProfile, scaledBars, volumeProfile, spread, logEdges, N_BINS } from '../scripts/lib/volprofile.js';
import { pickProfile, prevProfileOf, profileRow, UNSTABLE_NOTE } from '../scripts/fetch_ath.js';
import { staleData } from '../scripts/check_fresh.js';
import { windowStart, daysBetween } from '../js/ath.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url)));
const FX = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/volprofile_spx_si.json.gz', import.meta.url))));
const T = (iso) => Date.parse(iso) / 1000;
const daily = (f) => { const j = FX.files[f]; return parse(j.res, { withVolume: true, nowSec: Date.parse(j.fetched) / 1000 }); };
const sum = (a) => a.reduce((x, y) => x + y, 0);

test('profilo dei volumi: stessi bp dello script della ricerca (S&P 500 con SPY, argento dalle barre orarie)', () => {
  const gspc = daily('d__GSPC.json'), spy = daily('d_SPY.json'), si = daily('d_SI_F.json');
  const cases = [
    ['SPX', { chart: gspc, vol: spy, hourly: null }, 'giornaliere'],
    ['SILVER', { chart: si, vol: si, hourly: parseHourly(FX.files['h_SI_F.json'].res), needHourly: true }, 'orarie'],
  ];
  for (const [k, o, source] of cases) {
    const to = o.chart.dates.at(-1), from = windowStart(to, 1), e = FX.expected[k];
    const r = buildProfile({ ...o, from, to });
    assert.ok(r.profile, `${k}: ${r.why}`);
    const p = r.profile;
    assert.equal(p.from, e.from, k); assert.equal(p.to, e.to, k); assert.equal(p.sessions, e.sessions, k); assert.equal(p.source, source, k);
    assert.equal(p.n, 100); assert.equal(p.bp.length, 100);
    assert.deepEqual(p.bp, e.bp, `${k}: fasce diverse da profilo_app.json`);
    assert.equal(+p.lo.toPrecision(6), e.lo, k); assert.equal(+p.hi.toPrecision(6), e.hi, k);
  }
  // argento: il volume giornaliero di SI=F è lo 0,24% della somma oraria (contratto del mese più vicino), quindi barre orarie
  const ro = scaledBars({ chart: si, vol: si, hourly: parseHourly(FX.files['h_SI_F.json'].res), from: windowStart(si.dates.at(-1), 1), to: si.dates.at(-1) });
  assert.ok(ro.info.fromHourly && ro.info.dailyVsHourly < 0.01, `rapporto ${ro.info.dailyVsHourly}`);
  assert.equal(ro.info.skipped, 5); // sedute delle ore senza la barra giornaliera (come in risultati.json, skippedDaily)
});

test('profilo dei volumi: parse con withVolume aggiunge minimo e volume senza cambiare il resto', () => {
  const j = FX.files['d_SPY.json'], now = Date.parse(j.fetched) / 1000;
  const a = parse(j.res, { nowSec: now }), b = parse(j.res, { nowSec: now, withVolume: true });
  assert.deepEqual(Object.keys(a).sort(), ['adjclose', 'close', 'dates', 'high', 'meta']);
  for (const k of ['dates', 'close', 'adjclose', 'high']) assert.deepEqual(b[k], a[k], k);
  assert.equal(b.low.length, a.dates.length); assert.equal(b.volume.length, a.dates.length);
  assert.ok(b.low.every((l, i) => l <= b.close[i] && l <= b.high[i]));
  // minimo mancante o sopra la chiusura = chiusura; volume mancante = null
  const r = { meta: { exchangeTimezoneName: 'America/New_York', instrumentType: 'ETF' }, timestamp: [T('2026-11-10T14:30:00Z'), T('2026-11-11T14:30:00Z')],
    indicators: { quote: [{ close: [10, 11], high: [10.5, 11.5], low: [null, 11.2], volume: [500, null] }] } };
  const p = parse(r, { withVolume: true, nowSec: T('2026-11-13T12:00:00Z') });
  assert.deepEqual(p.low, [10, 11]); assert.deepEqual(p.volume, [500, null]);
});

test('profilo dei volumi: barre orarie, seduta dei future dalle 18 di New York (ora legale compresa)', () => {
  const mk = (type, ts) => ({ meta: { exchangeTimezoneName: 'America/New_York', instrumentType: type }, timestamp: ts.map(T),
    indicators: { quote: [{ close: ts.map(() => 5), high: ts.map(() => 5.1), low: ts.map(() => null), volume: ts.map(() => 7) }] } });
  // 17:00 e 18:00 di New York, in estate (UTC−4) e in inverno (UTC−5)
  const ts = ['2026-07-14T21:00:00Z', '2026-07-14T22:00:00Z', '2026-11-12T22:00:00Z', '2026-11-12T23:00:00Z'];
  assert.deepEqual(parseHourly(mk('FUTURE', ts)).map((x) => x.s), ['2026-07-14', '2026-07-15', '2026-11-12', '2026-11-13']);
  assert.deepEqual(parseHourly(mk('ETF', ts)).map((x) => x.s), ['2026-07-14', '2026-07-14', '2026-11-12', '2026-11-12']);
  const b = parseHourly(mk('FUTURE', ts))[0];
  assert.equal(b.l, 5); assert.equal(b.h, 5.1); assert.equal(b.v, 7);
});

// serie giornaliere finte: n sedute dal 03/11/2025 (lunedì), prezzi 100 → 100·1,001^i
function fake(n, f = {}) {
  const dates = [], close = [], high = [], low = [], volume = [];
  for (let t = Date.parse('2025-11-03'); dates.length < n; t += 864e5) {
    const d = new Date(t); if (d.getUTCDay() % 6 === 0) continue;
    const i = dates.length, c = 100 * 1.001 ** i;
    dates.push(d.toISOString().slice(0, 10)); close.push(c); high.push(c * 1.01); low.push(c * 0.99); volume.push(1000 + i);
  }
  return Object.assign({ dates, close, high, low, volume }, f);
}
const win = (s) => ({ from: windowStart(s.dates.at(-1), 1), to: s.dates.at(-1) });

test('profilo dei volumi: somma delle quote, fasce annidate, barra senza escursione', () => {
  const s = fake(300), r = buildProfile({ chart: s, vol: s, ...win(s) });
  assert.ok(r.profile, r.why);
  assert.ok(Math.abs(sum(r.profile.bp) - 10000) <= 50, `somma ${sum(r.profile.bp)}`);
  assert.ok(r.profile.bp.every((x) => Number.isInteger(x) && x >= 0));
  // 100 fasce sommate a due a due = 50 fasce (le fasce logaritmiche si annidano)
  const { bars } = scaledBars({ chart: s, vol: s, ...win(s) }), lo = Math.min(...bars.map((b) => b.l)), hi = Math.max(...bars.map((b) => b.h));
  const v100 = spread(bars, logEdges(lo, hi, 100)), v50 = spread(bars, logEdges(lo, hi, 50));
  for (let i = 0; i < 50; i++) assert.ok(Math.abs(v100[2 * i] + v100[2 * i + 1] - v50[i]) < 1e-6 * sum(v50), `fascia ${i}`);
  // tutto il volume di una barra senza escursione finisce nella fascia della chiusura
  const one = volumeProfile([{ s: 'a', h: 10, l: 10, c: 10, v: 5 }, { s: 'b', h: 20, l: 10, c: 15, v: 5 }]);
  assert.equal(one.bp[0], 5000 + Math.round(5000 / N_BINS)); assert.equal(sum(one.bp), 10000);
  assert.equal(volumeProfile([]), null);
});

test('profilo dei volumi: volume 0, mancante o ricopiato', () => {
  const s = fake(300), w = win(s);
  // volume ricopiato dalla seduta prima (Yahoo sull'ultima seduta dei future): la seduta resta, senza volume
  const vol = { ...s, volume: s.volume.slice() }; vol.volume[299] = vol.volume[298];
  const r = scaledBars({ chart: s, vol, ...w });
  assert.deepEqual(r.info.stale, [s.dates[299]]); assert.equal(r.bars.at(-1).v, 0); assert.equal(r.info.noVolume, 1);
  const p = buildProfile({ chart: s, vol, ...w }).profile, p0 = buildProfile({ chart: s, vol: { ...s, volume: s.volume.map((v, i) => (i === 299 ? 0 : v)) }, ...w }).profile;
  assert.deepEqual(p.bp, p0.bp);
  // un volume ricopiato uguale a 0 non è una copia; null resta mancante
  const z = { ...s, volume: s.volume.map((v, i) => (i >= 297 ? null : v)) };
  assert.deepEqual(scaledBars({ chart: s, vol: z, ...w }).info.stale, []);
  // oltre il 10% delle sedute senza volume: nessun profilo
  const n = scaledBars({ chart: s, vol: s, ...w }).bars.length, k = Math.floor(n * 0.1) + 1;
  const many = { ...s, volume: s.volume.map((v, i) => (i >= 300 - k ? null : v)) };
  const r2 = buildProfile({ chart: s, vol: many, ...w });
  assert.equal(r2.profile, null); assert.match(r2.why, /senza volume/);
  const fine = { ...s, volume: s.volume.map((v, i) => (i >= 300 - k + 2 ? null : v)) };
  assert.ok(buildProfile({ chart: s, vol: fine, ...w }).profile);
});

test('profilo dei volumi: prezzi ≤ 0 e sedute senza chiusura comune con il grafico', () => {
  const s = fake(300), w = win(s);
  const neg = { ...s, low: s.low.map((v, i) => (i === 280 ? -1 : v)) };
  assert.match(buildProfile({ chart: s, vol: neg, ...w }).why, /≤ 0/);
  // un altro strumento sulla scala del grafico: rapporto delle chiusure della stessa seduta
  const etf = { ...s, close: s.close.map((c) => c / 10), high: s.high.map((c) => c / 10), low: s.low.map((c) => c / 10) };
  const a = buildProfile({ chart: s, vol: s, ...w }).profile, b = buildProfile({ chart: s, vol: etf, ...w }).profile;
  assert.ok(Math.abs(b.lo / a.lo - 1) < 1e-9 && Math.abs(b.hi / a.hi - 1) < 1e-9);
  assert.ok(b.bp.every((x, i) => Math.abs(x - a.bp[i]) <= 1));
  // sedute del grafico mancanti: scartate e contate; oltre il 5% nessun profilo
  const nIn = scaledBars({ chart: s, vol: s, ...w }).bars.length, k = Math.floor(nIn * 0.05) + 1;
  const holes = { ...s, close: s.close.map((c, i) => (i >= 300 - k ? null : c)) };
  const r = buildProfile({ chart: holes, vol: s, ...w });
  assert.equal(r.profile, null); assert.equal(r.info.skipped, k); assert.match(r.why, /senza chiusura comune/);
  const few = { ...s, close: s.close.map((c, i) => (i === 290 ? null : c)) };
  const r1 = buildProfile({ chart: few, vol: s, ...w });
  assert.ok(r1.profile); assert.equal(r1.info.skipped, 1); assert.equal(r1.profile.sessions, nIn - 1);
});

test('profilo dei volumi: regola giornaliero/orario e barre orarie che partono tardi', () => {
  const s = fake(300), w = win(s);
  const hourly = (from, vol) => s.dates.filter((d) => d >= from).flatMap((d, k) => [0, 1].map((h) => ({ s: d, h: s.high[s.dates.indexOf(d)], l: s.low[s.dates.indexOf(d)], c: s.close[s.dates.indexOf(d)], v: vol + h + k * 0 })));
  // volume giornaliero meno della metà della somma oraria: barre dalle orarie
  const big = hourly(w.from, 5000);
  const r = buildProfile({ chart: s, vol: s, hourly: big, needHourly: true, ...w });
  assert.equal(r.profile.source, 'orarie'); assert.ok(r.info.fromHourly);
  // volume giornaliero più grande: si tengono le giornaliere
  assert.equal(buildProfile({ chart: s, vol: s, hourly: hourly(w.from, 10), needHourly: true, ...w }).profile.source, 'giornaliere');
  // orarie che partono più di 7 giorni dopo l'inizio della finestra: nessun profilo
  const late = s.dates.find((d) => daysBetween(w.from, d) > 7);
  assert.match(buildProfile({ chart: s, vol: s, hourly: hourly(late, 5000), needHourly: true, ...w }).why, /barre orarie dal/);
  const ok = s.dates.find((d) => d >= w.from && daysBetween(w.from, d) <= 7);
  assert.ok(buildProfile({ chart: s, vol: s, hourly: hourly(ok, 5000), needHourly: true, ...w }).profile);
  // orarie che servono ma non arrivate
  assert.match(buildProfile({ chart: s, vol: s, hourly: null, needHourly: true, ...w }).why, /non arrivate/);
});

test('profilo dei volumi: profilo pubblicato tenuto se il nuovo manca o è più vecchio, fino a maxAge giorni', () => {
  const prev = { to: '2026-11-11', bp: [] }, fresh = { to: '2026-11-12', bp: [] };
  assert.deepEqual(pickProfile(fresh, prev, '2026-11-12', 4), { profile: fresh, kept: false, why: null });
  assert.deepEqual(pickProfile(fresh, null, '2026-11-12', 4).profile, fresh);
  const k = pickProfile(null, prev, '2026-11-12', 4);
  assert.equal(k.profile, prev); assert.ok(k.kept); assert.equal(k.why, 'non arrivato');
  const older = pickProfile({ to: '2026-11-10' }, prev, '2026-11-12', 4);
  assert.equal(older.profile, prev); assert.match(older.why, /più vecchia/);
  // oltre maxAge dall'ultima seduta del mercato: niente profilo (l'app lo dice, check_fresh.js segnala)
  const gone = pickProfile(null, prev, '2026-11-16', 4);
  assert.equal(gone.profile, null); assert.match(gone.why, /oltre 4 giorni/);
  assert.equal(pickProfile(null, prev, '2026-11-15', 4).profile, prev);
  assert.equal(pickProfile(null, null, '2026-11-12', 4).profile, null);
  // il pubblicato vale solo con lo stesso strumento e la stessa serie del grafico
  const c = { id: 'SPX', profile: { vol: 'SPY' } }, H = { profiles: { SPX: { vol: 'SPY', bp: [1] } } };
  assert.ok(prevProfileOf(H, { id: 'SPX' }, c));
  assert.equal(prevProfileOf(H, null, c), null);
  assert.equal(prevProfileOf(H, { id: 'SPX' }, { id: 'SPX', profile: { vol: 'ES=F' } }), null);
  // testo e stabilità da config/ath.json
  const p = { from: 'a', to: 'b', sessions: 1, source: 'giornaliere', lo: 1, hi: 2, n: 100, scale: 'log', bp: [] };
  assert.equal(profileRow(p, { vol: 'QQQ', text: 't', stable: false }).stableNote, UNSTABLE_NOTE);
  assert.equal(profileRow(p, { vol: 'SPY', text: 't', stable: true }).stable, true);
  assert.equal('stableNote' in profileRow(p, { vol: 'SPY', text: 't', stable: true }), false);
  assert.equal(profileRow(null, {}), null);
});

test('profilo dei volumi: dati fermi o mancanti segnalati da check_fresh con il limite del mercato', () => {
  const base = { breadth: { asOf: '2026-11-12' }, athMaxAge: { SPX: 4, KOSPI: 12 } };
  assert.deepEqual(staleData({ ...base, athProfiles: { SPX: '2026-11-12', KOSPI: '2026-11-01' } }, '2026-11-13'), []);
  const p = staleData({ ...base, athProfiles: { SPX: '2026-11-07', KOSPI: null } }, '2026-11-13');
  assert.equal(p.length, 2, p.join(' | '));
  assert.ok(p.some((x) => /profilo dei volumi SPX: fermo al 2026-11-07/.test(x)) && p.some((x) => /profilo dei volumi KOSPI: senza data/.test(x)));
  assert.deepEqual(staleData(base, '2026-11-13'), []); // file senza profili: nessun controllo
});

test('profilo dei volumi: configurazione e file dei dati coerenti', { skip: !fs.existsSync(new URL('../data/ath_history.json', import.meta.url)) && 'data/ath_history.json assente' }, () => {
  const C = read('config/ath.json').markets, H = read('data/ath_history.json'), A = read('data/ath.json');
  // tutti e 9 i mercati con il profilo; oro, Nasdaq-100 e KOSPI con l'avvertenza (scelta dell'utente del 13/11/2026)
  assert.deepEqual(C.filter((m) => m.profile).map((m) => m.id), C.map((m) => m.id));
  assert.deepEqual(C.filter((m) => m.profile.stable === false).map((m) => m.id), ['GOLD', 'NDX', 'KOSPI']);
  assert.deepEqual(C.filter((m) => m.profile.hourly).map((m) => m.id), ['SILVER', 'COPPER']);
  const volOf = Object.fromEntries(C.map((m) => [m.id, m.profile.vol]));
  assert.deepEqual(volOf, { BTC: 'BTC-USD', GOLD: 'GC=F', SILVER: 'SI=F', COPPER: 'HG=F', WTI: 'CL=F', NDX: 'QQQ', SPX: 'SPY', SOXX: 'SOXX', KOSPI: '069500.KS' });
  if (!H.profiles) return; // file della 1.10.x: ancora senza profili
  assert.deepEqual(Object.keys(H.profiles), C.map((m) => m.id));
  for (const c of C) {
    const p = H.profiles[c.id], row = A.markets.find((m) => m.id === c.id);
    if (!p) continue;
    assert.equal(p.vol, c.profile.vol, c.id); assert.equal(p.text, c.profile.text, c.id);
    assert.equal(p.stable, c.profile.stable !== false, c.id); assert.equal(p.stableNote, c.profile.stable === false ? UNSTABLE_NOTE : undefined, c.id);
    assert.equal(p.n, 100); assert.equal(p.scale, 'log'); assert.equal(p.bp.length, p.n, c.id);
    assert.ok(p.bp.every((x) => Number.isInteger(x) && x >= 0), c.id);
    assert.ok(Math.abs(sum(p.bp) - 10000) <= 50, `${c.id}: somma ${sum(p.bp)}`);
    assert.ok(p.lo > 0 && p.hi > p.lo, c.id);
    assert.equal(p.from, windowStart(p.to, 1), c.id);
    assert.ok(row.stats && p.to <= row.stats.lastDate && daysBetween(p.to, row.stats.lastDate) <= c.maxAge, c.id);
    assert.ok(p.sessions > 200, `${c.id}: ${p.sessions} sedute`);
    assert.equal(p.source, c.profile.hourly ? 'orarie' : 'giornaliere', c.id);
  }
});

test('profilo dei volumi: un buco nei volumi oltre il 5% delle sedute del grafico non dà profilo (controllo indipendente 1.11.0)', async () => {
  const { buildProfile } = await import('../scripts/lib/volprofile.js');
  const dates = [], close = [];
  for (let t = Date.parse('2026-01-05'), k = 0; k < 100; t += 86400000) { const d = new Date(t); if (d.getUTCDay() % 6) { dates.push(d.toISOString().slice(0, 10)); close.push(100 + (k % 7)); k++; } }
  const vol = (keep) => ({ dates: dates.filter((_, i) => keep(i)), close: close.filter((_, i) => keep(i)), high: close.filter((_, i) => keep(i)).map((c) => c + 1), low: close.filter((_, i) => keep(i)).map((c) => c - 1), volume: close.filter((_, i) => keep(i)).map((_, i) => 1000 + i) });
  const o = { chart: { dates, close }, from: dates[0], to: dates.at(-1) };
  assert.ok(buildProfile({ ...o, vol: vol(() => true) }).profile, 'copertura piena');
  const r = buildProfile({ ...o, vol: vol((i) => i < 40 || i >= 52) }); // 12 sedute su 100 senza volumi
  assert.equal(r.profile, null); assert.match(r.why, /mancano oltre il 5%/);
  assert.ok(buildProfile({ ...o, vol: vol((i) => i !== 50 && i !== 51) }).profile, '2 sedute su 100: profilo');
});
