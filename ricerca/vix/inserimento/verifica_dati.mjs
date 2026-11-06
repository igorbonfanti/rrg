#!/usr/bin/env node
/*
 * verifica_dati.mjs — controlli sui dati del VIX e del VXN per il futuro pannello «VIX» (fase di verifica: non tocca l'app).
 * Legge i file grezzi scaricati da scarica.mjs (ricerca/vix/cache/inserimento/) e i file dell'app (data/indices.json) e
 * scrive ricerca/vix/inserimento/risultati/verifica_dati.json più un riepilogo leggibile sullo schermo.
 *
 * Controlli:
 *  1. copertura di ogni fonte (prima e ultima data, sedute, giorni vuoti di FRED);
 *  2. buchi: sedute NYSE (prese da ^GSPC di Yahoo) senza VIX/VXN, e valori del VIX in giorni senza seduta NYSE;
 *     chiusure straordinarie (11/09/2001, Sandy 2012, lutti nazionali) controllate una per una;
 *  3. valori ricopiati: chiusure uguali alla seduta prima, barre con apertura = massimo = minimo = chiusura;
 *  4. FRED contro Cboe contro Yahoo, VIX e VXN: date in più o in meno e differenze di valore;
 *  5. ora della chiusura: VIX alle 16:00 ET contro la chiusura ufficiale delle 16:15 (barre a 5 minuti, ultimi 60 giorni);
 *  6. ritardo di pubblicazione di FRED (vintage ALFRED giornalieri) e revisioni (vintage annuali);
 *  7. ^GSPC e ^NDX di Yahoo contro data/indices.json (vista Indici) e contro FRED (SP500, NASDAQ100);
 *  8. dimensione di un data/vix.json compatto (formato di js/indexdata.js) con e senza gzip.
 * Uso: node ricerca/vix/inserimento/verifica_dati.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const C = path.resolve(HERE, '../cache/inserimento');
const OUTDIR = path.join(HERE, 'risultati');
fs.mkdirSync(OUTDIR, { recursive: true });
const { parse } = await import(path.join(ROOT, 'scripts/lib/yahoo.js'));
const { indexSeries, encodeDates, deltaEncode } = await import(path.join(ROOT, 'js/indexdata.js'));
const { holidays } = await import(path.join(ROOT, 'js/calendar.js'));

const R = {}; // risultati
const read = (f) => fs.readFileSync(path.join(C, f), 'utf8');

// ---------- lettura delle fonti ----------
function fred(f) {
  const rows = read(f).trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  const all = rows.filter(([d]) => /^\d{4}-\d{2}-\d{2}$/.test(d)).map(([d, v]) => [d, v === '' || v === '.' ? null : Number(v)]);
  return { all, map: new Map(all.filter(([, v]) => v != null)), empty: all.filter(([, v]) => v == null).map(([d]) => d) };
}
function cboe(f) {
  const rows = read(f).trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  const out = rows.map(([d, o, h, l, c]) => { const [m, g, y] = d.split('/'); return { d: `${y}-${m.padStart(2, '0')}-${g.padStart(2, '0')}`, o: +o, h: +h, l: +l, c: +c }; });
  return { rows: out, map: new Map(out.map((x) => [x.d, x.c])) };
}
function yahoo(f) {
  const res = JSON.parse(read(f)).chart.result[0];
  const p = parse(res); // stesse regole della pipeline: niente barra aperta, date nel fuso della borsa
  return { dates: p.dates, close: p.close, map: new Map(p.dates.map((d, i) => [d, p.close[i]])), meta: res.meta, res };
}

const F = { VIX: fred('fred_VIXCLS.csv'), VXN: fred('fred_VXNCLS.csv'), SP500: fred('fred_SP500.csv'), NDX: fred('fred_NASDAQ100.csv') };
const B = { VIX: cboe('cboe_VIX.csv'), VXN: cboe('cboe_VXN.csv') };
const Y = { VIX: yahoo('yahoo_VIX_1d.json'), VXN: yahoo('yahoo_VXN_1d.json'), GSPC: yahoo('yahoo_GSPC_1d.json'), NDX: yahoo('yahoo_NDX_1d.json') };
const DL = JSON.parse(read('_scaricato.json')).at;
R.scaricato = DL;

// ---------- 1. copertura ----------
const span = (dates) => ({ da: dates[0], a: dates[dates.length - 1], n: dates.length });
R.copertura = {
  'FRED VIXCLS': { ...span([...F.VIX.map.keys()]), vuoti: F.VIX.empty.length },
  'FRED VXNCLS': { ...span([...F.VXN.map.keys()]), vuoti: F.VXN.empty.length },
  'Cboe VIX_History': span([...B.VIX.map.keys()]),
  'Cboe VXN_History': span([...B.VXN.map.keys()]),
  'Yahoo ^VIX': { ...span(Y.VIX.dates), fuso: Y.VIX.meta.exchangeTimezoneName },
  'Yahoo ^VXN': { ...span(Y.VXN.dates), fuso: Y.VXN.meta.exchangeTimezoneName },
  'Yahoo ^GSPC': { ...span(Y.GSPC.dates), fuso: Y.GSPC.meta.exchangeTimezoneName },
  'Yahoo ^NDX': { ...span(Y.NDX.dates), fuso: Y.NDX.meta.exchangeTimezoneName },
  'FRED SP500': span([...F.SP500.map.keys()]),
  'FRED NASDAQ100': span([...F.NDX.map.keys()]),
};

// ---------- 2. buchi contro le sedute NYSE ----------
// sedute NYSE = date di ^GSPC su Yahoo; controllo incrociato con le festività regolari di js/calendar.js
const nyse = Y.GSPC.dates.filter((d) => d >= '1990-01-02');
const nyseSet = new Set(nyse);
const weekdays = [];
for (let t = Date.parse('1990-01-02'); t <= Date.parse(nyse[nyse.length - 1]); t += 864e5) { const d = new Date(t); if (d.getUTCDay() % 6) weekdays.push(d.toISOString().slice(0, 10)); }
const closedNotHoliday = weekdays.filter((d) => !nyseSet.has(d) && !holidays(+d.slice(0, 4)).has(d));
const holidayButOpen = nyse.filter((d) => holidays(+d.slice(0, 4)).has(d));
R.calendario = { sedute_GSPC_dal_1990: nyse.length, chiusure_feriali_non_regolari: closedNotHoliday, festivita_regolari_con_seduta: holidayButOpen };

function gaps(name, map, from) {
  const keys = [...map.keys()].filter((d) => d >= from);
  const first = keys[0], last = keys[keys.length - 1];
  const missing = nyse.filter((d) => d >= first && d <= last && !map.has(d));
  const extra = keys.filter((d) => !nyseSet.has(d));
  return { da: first, a: last, sedute_NYSE_senza_valore: missing, valori_in_giorni_senza_NYSE: extra };
}
R.buchi = {
  'FRED VIXCLS': gaps('FRED VIXCLS', F.VIX.map, '1990-01-02'),
  'Cboe VIX': gaps('Cboe VIX', B.VIX.map, '1990-01-02'),
  'Yahoo ^VIX': gaps('Yahoo ^VIX', Y.VIX.map, '1990-01-02'),
  'FRED VXNCLS': gaps('FRED VXNCLS', F.VXN.map, '2001-01-01'),
  'Cboe VXN': gaps('Cboe VXN', B.VXN.map, '2001-01-01'),
  'Yahoo ^VXN': gaps('Yahoo ^VXN', Y.VXN.map, '2001-01-01'),
  'Yahoo ^NDX': gaps('Yahoo ^NDX', Y.NDX.map, '1990-01-02'),
};
// FRED: i giorni vuoti sono festività NYSE (FRED scrive tutti i giorni feriali)?
const emptyKind = (f) => { const e = f.empty.filter((d) => d >= '1990-01-02'); return { totale: e.length, in_giorni_senza_NYSE: e.filter((d) => !nyseSet.has(d)).length, in_sedute_NYSE: e.filter((d) => nyseSet.has(d)) }; };
R.fred_vuoti = { VIXCLS: emptyKind(F.VIX), VXNCLS: emptyKind(F.VXN) };
const SPECIAL = { '1994-04-27': 'funerale di Nixon', '2001-09-11': '11 settembre', '2001-09-12': '11 settembre', '2001-09-13': '11 settembre', '2001-09-14': '11 settembre', '2001-09-17': 'riapertura', '2004-06-11': 'funerale di Reagan', '2007-01-02': 'funerale di Ford', '2012-10-29': 'uragano Sandy', '2012-10-30': 'uragano Sandy', '2012-10-31': 'riapertura dopo Sandy', '2018-12-05': 'funerale di G.H.W. Bush', '2025-01-09': 'funerale di Carter' };
R.giorni_speciali = Object.fromEntries(Object.entries(SPECIAL).map(([d, w]) => [d, {
  evento: w, NYSE: nyseSet.has(d), 'FRED VIX': F.VIX.map.get(d) ?? (F.VIX.all.find(([x]) => x === d) ? 'vuoto' : 'assente'), 'Cboe VIX': B.VIX.map.get(d) ?? 'assente', 'Yahoo VIX': Y.VIX.map.get(d) ?? 'assente',
  'FRED VXN': F.VXN.map.get(d) ?? (F.VXN.all.find(([x]) => x === d) ? 'vuoto' : 'assente'), 'Yahoo VXN': Y.VXN.map.get(d) ?? 'assente',
}]));

// ---------- 3. valori ricopiati ----------
function repeats(dates, val) {
  const runs = []; let cur = null;
  for (let i = 1; i < dates.length; i++) {
    if (val[i] === val[i - 1]) { if (!cur) cur = { da: dates[i - 1], n: 1, v: val[i] }; cur.n++; cur.a = dates[i]; }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return { coppie_uguali: runs.reduce((s, r) => s + r.n - 1, 0), serie_di_3_o_piu: runs.filter((r) => r.n >= 3), esempi: runs.slice(-5) };
}
const asArr = (map) => { const d = [...map.keys()].sort(); return [d, d.map((x) => map.get(x))]; };
R.ricopiati = {
  'FRED VIXCLS': repeats(...asArr(F.VIX.map)), 'Cboe VIX': repeats(...asArr(B.VIX.map)), 'Yahoo ^VIX': repeats(...asArr(Y.VIX.map)),
  'FRED VXNCLS': repeats(...asArr(F.VXN.map)), 'Yahoo ^VXN': repeats(...asArr(Y.VXN.map)),
};
// Cboe: barre con OHLC tutte uguali (solo la chiusura disponibile) per anno
const flat = {};
for (const x of B.VIX.rows) if (x.o === x.h && x.h === x.l && x.l === x.c) flat[x.d.slice(0, 4)] = (flat[x.d.slice(0, 4)] || 0) + 1;
R.cboe_vix_ohlc_piatte_per_anno = flat;

// ---------- 4. confronto delle fonti ----------
function compare(a, b, from = '0000') {
  const common = [...a.keys()].filter((d) => d >= from && b.has(d));
  const diffs = common.map((d) => ({ d, a: a.get(d), b: b.get(d), x: Math.abs(a.get(d) - b.get(d)) }));
  const over = (t) => diffs.filter((x) => x.x > t).length;
  const top = [...diffs].sort((p, q) => q.x - p.x).slice(0, 8).map((x) => ({ data: x.d, a: +x.a.toFixed(4), b: +x.b.toFixed(4), diff: +x.x.toFixed(4) }));
  const byYear = {};
  for (const x of diffs) if (x.x > 0.005) byYear[x.d.slice(0, 4)] = (byYear[x.d.slice(0, 4)] || 0) + 1;
  const onlyA = [...a.keys()].filter((d) => d >= from && !b.has(d)), onlyB = [...b.keys()].filter((d) => d >= from && !a.has(d));
  return { comuni: common.length, 'diverse_oltre_0,005': over(0.005), 'oltre_0,05': over(0.05), 'oltre_0,5': over(0.5), max: top[0] || null, top, per_anno_oltre_0_005: byYear, solo_nella_prima: onlyA.length, solo_nella_seconda: onlyB.length, esempi_solo_prima: onlyA.slice(-6), esempi_solo_seconda: onlyB.slice(-6) };
}
R.confronto = {
  'VIX FRED-Cboe': compare(F.VIX.map, B.VIX.map),
  'VIX Yahoo-Cboe': compare(Y.VIX.map, B.VIX.map),
  'VIX Yahoo-FRED': compare(Y.VIX.map, F.VIX.map),
  'VXN FRED-Cboe': compare(F.VXN.map, B.VXN.map),
  'VXN Yahoo-Cboe': compare(Y.VXN.map, B.VXN.map),
  'VXN Yahoo-FRED': compare(Y.VXN.map, F.VXN.map),
};
// VIX: soglie toccate (chiusura >= 20/25/30/40/50) — le fonti danno gli stessi giorni?
const cross = (map, L) => new Set([...map.keys()].filter((d) => map.get(d) >= L));
R.soglie = Object.fromEntries([20, 25, 30, 40, 50].map((L) => {
  const f = cross(F.VIX.map, L), b = cross(B.VIX.map, L), y = cross(Y.VIX.map, L);
  const both = (s, t) => [...s].filter((d) => !t.has(d) && (F.VIX.map.has(d) && B.VIX.map.has(d) && Y.VIX.map.has(d)));
  return [L, { FRED: f.size, Cboe: b.size, Yahoo: y.size, 'FRED_si_Cboe_no': both(f, b), 'Yahoo_si_Cboe_no': both(y, b), 'Cboe_si_Yahoo_no': both(b, y) }];
}));

// ---------- 5. 16:00 contro 16:15 ----------
function intraday(f) {
  const res = JSON.parse(read(f)).chart.result[0], q = res.indicators.quote[0];
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const by = {};
  res.timestamp.forEach((t, i) => {
    if (q.close[i] == null) return;
    const p = Object.fromEntries(fmt.formatToParts(t * 1000).map((x) => [x.type, x.value]));
    const d = `${p.year}-${p.month}-${p.day}`, hm = `${p.hour}:${p.minute}`;
    (by[d] = by[d] || {})[hm] = q.close[i];
  });
  return by;
}
const V5 = intraday('yahoo_VIX_5m_60d.json'), G5 = intraday('yahoo_GSPC_5m_60d.json'), N5 = intraday('yahoo_VXN_5m_60d.json');
const days16 = [];
for (const d of Object.keys(V5).sort()) {
  const v = V5[d], at1600 = v['15:55'], at1615 = B.VIX.map.get(d) ?? Y.VIX.map.get(d), last = v['16:10'];
  const g = G5[d] ? G5[d]['15:55'] : null, gClose = Y.GSPC.map.get(d);
  if (at1600 == null || at1615 == null || !Y.GSPC.map.has(d)) continue;
  const i = Y.GSPC.dates.indexOf(d);
  days16.push({ d, vix1600: +at1600.toFixed(2), vix1615: at1615, diff: +(at1615 - at1600).toFixed(2), ultimaBarra: last != null ? +last.toFixed(2) : null, spx_ret: i > 0 ? +(100 * (gClose / Y.GSPC.close[i - 1] - 1)).toFixed(2) : null });
}
const absd = days16.map((x) => Math.abs(x.diff)).sort((a, b) => a - b);
const med = (a) => (a.length ? a[Math.floor(a.length / 2)] : null);
R.chiusura_1615 = {
  nota: 'vix1600 = chiusura della barra a 5 minuti 15:55-16:00 ET (Yahoo); vix1615 = chiusura ufficiale (Cboe). La barra 15:55 di Yahoo è etichettata con l\'inizio: la sua chiusura è il valore delle 16:00.',
  giorni: days16.length, mediana_diff_assoluta: med(absd), massima: absd[absd.length - 1], oltre_0_25: absd.filter((x) => x > 0.25).length, oltre_0_5: absd.filter((x) => x > 0.5).length,
  // soglie: in quanti giorni le 16:00 e le 16:15 stanno da parti diverse di 20/25/30?
  soglia_diversa: days16.filter((x) => [20, 25, 30, 40, 50].some((L) => (x.vix1600 >= L) !== (x.vix1615 >= L))).map((x) => x.d),
  dettaglio: days16,
  orari_barre_VIX: (() => { const d = Object.keys(V5).sort().slice(-2, -1)[0]; const k = Object.keys(V5[d]).sort(); return { giorno: d, prima: k[0], ultima: k[k.length - 1], barre: k.length }; })(),
  orari_barre_VXN: (() => { const d = Object.keys(N5).sort().slice(-2, -1)[0]; const k = Object.keys(N5[d]).sort(); return { giorno: d, prima: k[0], ultima: k[k.length - 1], barre: k.length }; })(),
  meta_VIX: { fuso: Y.VIX.meta.exchangeTimezoneName, regular: Y.VIX.meta.currentTradingPeriod.regular },
};

// ---------- 6. FRED: ritardo di pubblicazione e revisioni ----------
const alfred = fs.readdirSync(C).filter((f) => /^alfred_VIXCLS_\d{4}-\d{2}-\d{2}\.csv$/.test(f)).sort();
const sessionsBetween = (a, b) => nyse.filter((d) => d > a && d <= b).length; // sedute dopo a fino a b compreso
const lag = [];
for (const f of alfred) {
  const v = f.match(/(\d{4}-\d{2}-\d{2})/)[1];
  const rows = read(f).trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).filter(([, x]) => x !== '' && x !== '.');
  if (!rows.length) continue;
  const lastObs = rows[rows.length - 1][0];
  // ultima seduta NYSE chiusa entro il giorno del vintage (compreso)
  const lastSess = nyse.filter((d) => d <= v).pop();
  lag.push({ vintage: v, ultima_osservazione: lastObs, ultima_seduta_fino_al_vintage: lastSess, sedute_di_ritardo: sessionsBetween(lastObs, lastSess) });
}
const daily = lag.filter((x) => !/-01-0[2-5]$/.test(x.vintage) || x.vintage >= '2025-12-15');
const hist = {};
for (const x of daily) hist[x.sedute_di_ritardo] = (hist[x.sedute_di_ritardo] || 0) + 1;
// vintage quotidiani consecutivi: in quale vintage compare per la prima volta ogni osservazione
const firstSeen = [];
const vintSorted = daily.map((x) => x.vintage).sort();
for (let i = 1; i < vintSorted.length; i++) {
  const prevV = daily.find((x) => x.vintage === vintSorted[i - 1]), cur = daily.find((x) => x.vintage === vintSorted[i]);
  if (Date.parse(cur.vintage) - Date.parse(prevV.vintage) !== 864e5) continue;
  if (cur.ultima_osservazione !== prevV.ultima_osservazione) firstSeen.push({ osservazione: cur.ultima_osservazione, primo_vintage: cur.vintage, giorni_di_calendario: Math.round((Date.parse(cur.vintage) - Date.parse(cur.ultima_osservazione)) / 864e5) });
}
const fsHist = {};
for (const x of firstSeen) fsHist[x.giorni_di_calendario] = (fsHist[x.giorni_di_calendario] || 0) + 1;
R.fred_ritardo = { nota: 'sedute_di_ritardo = sedute NYSE tra l\'ultima osservazione presente nel vintage e l\'ultima seduta chiusa entro il giorno del vintage. Un vintage datato v contiene i valori pubblicati fino a v compreso.', vintage: daily.length, distribuzione_sedute: hist, prima_comparsa_giorni_di_calendario: fsHist, oggi: { FRED_VIXCLS: [...F.VIX.map.keys()].pop(), Cboe: [...B.VIX.map.keys()].pop(), Yahoo: Y.VIX.dates[Y.VIX.dates.length - 1], scaricato: DL }, dettaglio: lag };
// revisioni: vintage annuali contro FRED di oggi
const rev = {};
for (const f of fs.readdirSync(C).filter((f) => /^alfred_(VIX|VXN)CLS_\d{4}-01-0\d\.csv$/.test(f)).sort()) {
  const id = f.includes('VXN') ? 'VXN' : 'VIX', v = f.match(/(\d{4}-\d{2}-\d{2})/)[1];
  const rows = read(f).trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).filter(([d, x]) => /^\d{4}/.test(d) && x !== '' && x !== '.');
  const now = F[id].map;
  let n = 0, changed = [], missingNow = 0;
  for (const [d, x] of rows) { if (!now.has(d)) { missingNow++; continue; } n++; if (Math.abs(+x - now.get(d)) > 1e-9) changed.push({ d, allora: +x, oggi: now.get(d) }); }
  rev[`${id} ${v}`] = { valori: n, cambiati: changed.length, esempi: changed.slice(0, 5), spariti_oggi: missingNow };
}
R.fred_revisioni = rev;

// ---------- 7. ^GSPC e ^NDX: Yahoo contro vista Indici e contro FRED ----------
const IX = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/indices.json'), 'utf8'));
const ixMap = (k) => { const s = indexSeries(IX.series[k]); return new Map(s.dates.map((d, i) => [d, s.close[i]]).filter(([, v]) => v != null)); };
function cmpRel(a, b) {
  const common = [...a.keys()].filter((d) => b.has(d));
  const rel = common.map((d) => ({ d, a: a.get(d), b: b.get(d), r: Math.abs(a.get(d) / b.get(d) - 1) }));
  const top = [...rel].sort((p, q) => q.r - p.r).slice(0, 6).map((x) => ({ data: x.d, a: +x.a.toFixed(2), b: +x.b.toFixed(2), rel_pct: +(100 * x.r).toFixed(4) }));
  const centDiff = rel.filter((x) => Math.abs(x.a - x.b) > 0.0051).length;
  return { comuni: common.length, 'diverse_oltre_un_centesimo': centDiff, oltre_1e4: rel.filter((x) => x.r > 1e-4).length, oltre_1e3: rel.filter((x) => x.r > 1e-3).length, top, solo_prima: [...a.keys()].filter((d) => !b.has(d) && d >= [...b.keys()][0] && d <= [...b.keys()].pop()).slice(-8), solo_seconda: [...b.keys()].filter((d) => !a.has(d) && d >= [...a.keys()][0] && d <= [...a.keys()].pop()).slice(-8) };
}
R.indici = {
  'SPX: Yahoo ^GSPC contro data/indices.json': cmpRel(Y.GSPC.map, ixMap('SPX')),
  'NDX: Yahoo ^NDX contro data/indices.json': cmpRel(Y.NDX.map, ixMap('NDX')),
  'SPX: Yahoo ^GSPC contro FRED SP500': cmpRel(Y.GSPC.map, F.SP500.map),
  'NDX: Yahoo ^NDX contro FRED NASDAQ100': cmpRel(Y.NDX.map, F.NDX.map),
  indices_json: { asOf: IX.asOf, SPX_da: ixMap('SPX').keys().next().value, NDX_da: ixMap('NDX').keys().next().value },
};
// NDX: la storia di Yahoo prima del 1990-2000 ha buchi o salti?
const ndxGap = [];
for (let i = 1; i < Y.NDX.dates.length; i++) { const g = (Date.parse(Y.NDX.dates[i]) - Date.parse(Y.NDX.dates[i - 1])) / 864e5; if (g > 5) ndxGap.push([Y.NDX.dates[i - 1], Y.NDX.dates[i], g]); }
R.indici.NDX_buchi_oltre_5_giorni = ndxGap;

// ---------- 8. dimensione di un data/vix.json compatto ----------
function packSer(map, from, ps) {
  const d = [...map.keys()].filter((x) => x >= from).sort(), v = d.map((x) => map.get(x));
  return { ...encodeDates(d), cd: deltaEncode(v, ps), ps };
}
const sizes = {};
const variants = {
  'VIX+VXN (Cboe/FRED, 2 decimali)': { VIX: packSer(B.VIX.map, '1990-01-02', 100), VXN: packSer(F.VXN.map, '2001-01-01', 100) },
  'VIX+VXN + SPX e NDX dal 1990 (Yahoo, 2 decimali)': { VIX: packSer(B.VIX.map, '1990-01-02', 100), VXN: packSer(F.VXN.map, '2001-01-01', 100), SPX: packSer(Y.GSPC.map, '1990-01-02', 100), NDX: packSer(Y.NDX.map, '1990-01-02', 100) },
  'VIX+VXN + SPX e NDX solo 1990-1999 (il resto da indices.json)': { VIX: packSer(B.VIX.map, '1990-01-02', 100), VXN: packSer(F.VXN.map, '2001-01-01', 100), SPX: packSer(new Map([...Y.GSPC.map].filter(([d]) => d < '2000-01-03')), '1990-01-02', 100), NDX: packSer(new Map([...Y.NDX.map].filter(([d]) => d < '2000-01-03')), '1990-01-02', 100) },
};
for (const [k, series] of Object.entries(variants)) {
  const s = JSON.stringify({ generated: 'x', asOf: 'x', series });
  sizes[k] = { KB: +(s.length / 1024).toFixed(0), gzip_KB: +(zlib.gzipSync(s, { level: 9 }).length / 1024).toFixed(0) };
}
R.dimensione = sizes;

fs.writeFileSync(path.join(OUTDIR, 'verifica_dati.json'), JSON.stringify(R, null, 1));

// ---------- riepilogo ----------
const P = (...a) => console.log(...a);
P(`Scaricato: ${DL}`);
P('\n1. Copertura'); for (const [k, v] of Object.entries(R.copertura)) P(`  ${k.padEnd(18)} ${v.da} → ${v.a}  ${v.n} sedute${v.vuoti != null ? `, ${v.vuoti} giorni vuoti` : ''}${v.fuso ? `, fuso ${v.fuso}` : ''}`);
P(`  Calendario: chiusure feriali non regolari ${R.calendario.chiusure_feriali_non_regolari.join(' ')}; festività regolari con seduta: ${R.calendario.festivita_regolari_con_seduta.join(' ') || 'nessuna'}`);
P('\n2. Buchi (sedute NYSE senza valore / valori in giorni senza NYSE)');
for (const [k, v] of Object.entries(R.buchi)) P(`  ${k.padEnd(12)} ${v.sedute_NYSE_senza_valore.length} [${v.sedute_NYSE_senza_valore.slice(0, 12).join(' ')}${v.sedute_NYSE_senza_valore.length > 12 ? ' …' : ''}] / ${v.valori_in_giorni_senza_NYSE.length} [${v.valori_in_giorni_senza_NYSE.slice(0, 12).join(' ')}]`);
P(`  FRED vuoti: VIXCLS ${JSON.stringify({ ...R.fred_vuoti.VIXCLS })}`);
P(`  FRED vuoti: VXNCLS ${JSON.stringify({ ...R.fred_vuoti.VXNCLS })}`);
P('  Giorni speciali:'); for (const [d, v] of Object.entries(R.giorni_speciali)) P(`   ${d} ${v.evento.padEnd(24)} NYSE ${v.NYSE ? 'sì' : 'no'} · FRED ${v['FRED VIX']} · Cboe ${v['Cboe VIX']} · Yahoo ${typeof v['Yahoo VIX'] === 'number' ? v['Yahoo VIX'].toFixed(2) : v['Yahoo VIX']} · VXN FRED ${v['FRED VXN']} Yahoo ${typeof v['Yahoo VXN'] === 'number' ? v['Yahoo VXN'].toFixed(2) : v['Yahoo VXN']}`);
P('\n3. Valori ricopiati'); for (const [k, v] of Object.entries(R.ricopiati)) P(`  ${k.padEnd(12)} ${v.coppie_uguali} sedute uguali alla prima; serie di 3+: ${v.serie_di_3_o_piu.map((r) => `${r.da}→${r.a} (${r.n}, ${r.v})`).join('; ') || 'nessuna'}`);
P(`  Cboe VIX con OHLC piatte per anno: ${JSON.stringify(R.cboe_vix_ohlc_piatte_per_anno)}`);
P('\n4. Confronto delle fonti');
for (const [k, v] of Object.entries(R.confronto)) P(`  ${k.padEnd(15)} comuni ${v.comuni}; diverse >0,005: ${v['diverse_oltre_0,005']}, >0,05: ${v['oltre_0,05']}, >0,5: ${v['oltre_0,5']}; max ${v.max ? `${v.max.diff} il ${v.max.data} (${v.max.a} / ${v.max.b})` : '—'}; solo nella prima ${v.solo_nella_prima}, solo nella seconda ${v.solo_nella_seconda}`);
P(`  Soglie: ${JSON.stringify(Object.fromEntries(Object.entries(R.soglie).map(([L, v]) => [L, [v.FRED, v.Cboe, v.Yahoo, v.FRED_si_Cboe_no.length, v.Yahoo_si_Cboe_no.length, v.Cboe_si_Yahoo_no.length]])))} (FRED, Cboe, Yahoo, FRED sì/Cboe no, Yahoo sì/Cboe no, Cboe sì/Yahoo no)`);
P('\n5. 16:00 contro 16:15'); const c = R.chiusura_1615; P(`  ${c.giorni} giorni; mediana |16:15−16:00| ${c.mediana_diff_assoluta}, max ${c.massima}, oltre 0,25: ${c.oltre_0_25}, oltre 0,5: ${c.oltre_0_5}; soglia diversa: ${c.soglia_diversa.join(' ') || 'nessuno'}; barre VIX ${JSON.stringify(c.orari_barre_VIX)}, VXN ${JSON.stringify(c.orari_barre_VXN)}`);
P('\n6. FRED'); P(`  ritardo (sedute) ${JSON.stringify(R.fred_ritardo.distribuzione_sedute)} su ${R.fred_ritardo.vintage} vintage; prima comparsa (giorni di calendario dopo la seduta) ${JSON.stringify(R.fred_ritardo.prima_comparsa_giorni_di_calendario)}; oggi ${JSON.stringify(R.fred_ritardo.oggi)}`);
for (const [k, v] of Object.entries(R.fred_revisioni)) P(`  revisioni ${k}: ${v.cambiati} valori cambiati su ${v.valori}${v.esempi.length ? ` (es. ${v.esempi.map((x) => `${x.d} ${x.allora}→${x.oggi}`).join(', ')})` : ''}; spariti oggi ${v.spariti_oggi}`);
P('\n7. Indici'); for (const [k, v] of Object.entries(R.indici)) if (v.comuni != null) P(`  ${k}: comuni ${v.comuni}, diverse oltre un centesimo ${v['diverse_oltre_un_centesimo']}, oltre 0,01% ${v.oltre_1e4}, oltre 0,1% ${v.oltre_1e3}; max ${v.top[0] ? `${v.top[0].rel_pct}% il ${v.top[0].data} (${v.top[0].a} / ${v.top[0].b})` : '—'}; solo prima ${v.solo_prima.join(' ')}; solo seconda ${v.solo_seconda.join(' ')}`);
P(`  indices.json: ${JSON.stringify(R.indici.indices_json)}; NDX Yahoo buchi oltre 5 giorni: ${JSON.stringify(R.indici.NDX_buchi_oltre_5_giorni)}`);
P('\n8. Dimensione'); for (const [k, v] of Object.entries(R.dimensione)) P(`  ${k}: ${v.KB} KB, ${v.gzip_KB} KB compressi`);
