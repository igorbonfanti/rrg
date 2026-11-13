#!/usr/bin/env node
/*
 * dati.mjs — verifica dei DATI per due possibili aggiunte alla vista «8 VIX» (fase 1, nessuna modifica all'app):
 *   (a) struttura a termine della volatilità: rapporto VIX/VIX3M (indici Cboe) contro VX1/VX2 (futures VIX);
 *   (b) spread di credito: HY OAS (ICE BofA, su FRED solo 3 anni) contro serie lunghe e gratuite.
 * Non dice se gli indicatori funzionano (lo fa il backtest): dice se i dati ci sono, sono puliti e coincidono tra fonti.
 *
 * Legge solo i file grezzi di cache/ (scaricati da scarica.mjs) e data/vix.json (sedute dell'S&P 500, con vxSeries di
 * js/vix.js). Scrive risultati.json. Uso: node ricerca/vix/struttura/dati/scarica.mjs && node ricerca/vix/struttura/dati/dati.mjs
 *
 * Metodo
 * 1. VIX3M. FRED VXVCLS e Cboe VIX3M_History.csv: copertura, «.» (mancanti), valori ≤ 0, valori uguali ripetuti in sedute
 *    consecutive, buchi di oltre 4 giorni di calendario; confronto giorno per giorno arrotondato al centesimo. Sedute
 *    dell'S&P 500: quelle di data/vix.json (vxSeries) più quelle di Yahoo ^GSPC dopo l'ultima data del file. Yahoo ^VIX3M
 *    contro Cboe: ultimi 60 giorni di calendario e tutta la storia comune. Ritardo: ultima data di ogni fonte, «Updated:»
 *    della pagina FRED, Last-Modified del file Cboe (cache/_scaricato.json).
 * 2. Futures VX. Contratti MENSILI: elenco ufficiale di Cboe (product/list/VX, duration_type «M») per le scadenze dal 2013,
 *    archivio CFE_<mese><aa>_VX.csv per quelle 2004-2013 (scadenza = data dell'ultima riga, che è il giorno del valore
 *    finale). Prezzo = Settle (chiusura ufficiale); Settle 0 = mancante. Per ogni contratto: Settle del CDN se > 0, se no
 *    quello dell'archivio se > 0, se no mancante. Prima del 26/03/2007 i futures erano quotati 10 volte il VIX: si divide
 *    per 10. Roll: VX1 alla data d = contratto mensile con scadenza > d (il giorno di scadenza si passa al successivo);
 *    VX2 = il mensile dopo VX1. Backwardation dei futures: VX1/VX2 > 1; degli indici: VIXCLS/VXVCLS > 1 (FRED, sulle sedute
 *    dell'S&P 500). Periodo comune: sedute con entrambi i rapporti. Concordanza = stessa risposta sì/no; correlazione di
 *    Pearson dei livelli e delle variazioni da una seduta alla successiva (solo coppie di sedute consecutive del calendario
 *    comune); ingressi in backwardation = prima seduta sopra 1 dopo una sotto (anche «filtrati»: dopo almeno 10 sedute
 *    sotto), abbinati se l'altro rapporto entra entro ±2 sedute; periodi di disaccordo = sedute consecutive con risposta
 *    diversa. Salti alle scadenze: nel giorno di scadenza VX1 passa al contratto dopo; salto di roll = VX2 − VX1 della
 *    seduta prima.
 * 3. Credito. HY OAS (BAMLH0A0HYM2) contro BAA10Y, AAA10Y, Baa−Aaa (BAA10Y − AAA10Y), IG OAS (BAMLC0A0CM, anch'esso ICE),
 *    −ln(HYG/IEF) (Yahoo, chiusure rettificate per i dividendi, solo come confronto di mercato) e NFCICREDIT (settimanale,
 *    a parte). Calendario: sedute dell'S&P 500 nel periodo dell'HY OAS; variazioni a k sedute = x(t) − x(t−k) solo se
 *    entrambi i valori ci sono; correlazione di Pearson su livelli, variazioni a 5 e 21 sedute (sovrapposte). Aprile 2025:
 *    valore al 02/04/2025 (prima dell'annuncio dei dazi), massimo dal 03/04 al 30/05/2025 e sua data, aumento in multipli
 *    della deviazione standard delle variazioni a 21 sedute del periodo comune, percentile del massimo nel periodo comune.
 *    Serie lunga: BAA10Y contro −ln(HYG/IEF) dal 2007 (variazioni a 21 sedute). Ritardo: ultima data contro ultima seduta.
 *    Buchi: sedute dell'S&P 500 senza valore, date con valore fuori dalle sedute.
 * 4. Peso: pack() di scripts/fetch_emerging.js (stesso formato di data/vix.json), byte del JSON e con gzip.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { parse as parseYahoo } from '../../../../scripts/lib/yahoo.js';
import { pack } from '../../../../scripts/fetch_emerging.js';
import { vxSeries } from '../../../../js/vix.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const C = path.join(HERE, 'cache');
const R = {}; // risultati
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const DAY = 86400000;
const dd = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// ---------- lettura ----------
function readFred(id) {
  const m = new Map(); let dots = 0, rows = 0;
  for (const line of fs.readFileSync(path.join(C, `fred_${id}.csv`), 'utf8').trim().split(/\r?\n/).slice(1)) {
    const [d, v] = line.split(','); rows++;
    if (v === '' || v === '.') { dots++; continue; }
    m.set(d, Number(v));
  }
  return { m, dots, rows };
}
function readCboe(name) {
  const m = new Map(), ohlcSame = [];
  for (const line of fs.readFileSync(path.join(C, `cboe_${name}.csv`), 'utf8').trim().split(/\r?\n/).slice(1)) {
    const [d, o, h, l, c] = line.split(',');
    const [mm, gg, aa] = d.split('/');
    const iso = `${aa}-${mm.padStart(2, '0')}-${gg.padStart(2, '0')}`;
    m.set(iso, Number(c));
    if (o === h && h === l && l === c) ohlcSame.push(iso);
  }
  return { m, ohlcSame };
}
function readYahoo(name, nowSec) {
  const j = JSON.parse(fs.readFileSync(path.join(C, `yahoo_${name}_1d.json`), 'utf8')).chart.result[0];
  const p = parseYahoo(j, { nowSec });
  return { close: new Map(p.dates.map((d, i) => [d, p.close[i]])), adj: new Map(p.dates.map((d, i) => [d, p.adjclose[i]])) };
}
const log = JSON.parse(fs.readFileSync(path.join(C, '_scaricato.json'), 'utf8'));
const nowSec = Date.parse(log['yahoo_GSPC_1d.json'].at) / 1000; // ora del download (per scartare una barra aperta)
function fredUpdated(id) {
  const t = fs.readFileSync(path.join(C, `page_${id}.html`), 'utf8');
  const u = t.match(/Updated:\s*<span title="([A-Z][a-z]{2} \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M C[SD]T)"/);
  const title = (t.match(/<title>([^<]*)/) || [])[1] || null;
  const cr = (t.match(/Copyrighted:\s*([A-Za-z -]+)/) || [])[1] || null;
  return { updated: u ? u[1] : null, title: title && title.replace(/ \| FRED \| St\. Louis Fed/, ''), copyrighted: cr && cr.trim() };
}

// ---------- statistica ----------
function pearson(x, y) {
  const n = x.length; if (n < 3) return null;
  let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; } mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxy / Math.sqrt(sxx * syy);
}
const median = (a) => { const v = [...a].sort((p, q) => p - q); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
const sd = (a) => { const n = a.length; const m = a.reduce((s, x) => s + x, 0) / n; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)); };

// ---------- sedute dell'S&P 500 ----------
const vixJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vix.json'), 'utf8'));
const spxFile = vxSeries(vixJson.series.SPX).dates;
const gspc = readYahoo('GSPC', nowSec);
const spxExtra = [...gspc.close.keys()].filter((d) => d > spxFile.at(-1)).sort();
const SESS = [...spxFile, ...spxExtra];
const SESS_SET = new Set(SESS);
const LAST_SESS = SESS.at(-1);
R.sedute = { fonte: 'data/vix.json SPX (vxSeries) + Yahoo ^GSPC dopo l\'ultima data del file', primo: SESS[0], ultimo: LAST_SESS, file_fino_al: spxFile.at(-1), aggiunte_da_yahoo: spxExtra, scaricato: log['yahoo_GSPC_1d.json'].at };
const sessFrom = (d0) => SESS.filter((d) => d >= d0);

// ---------- 1. VIX3M ----------
function profile(m, name, extra = {}) {
  const dates = [...m.keys()].sort();
  let le0 = 0; const rep = []; const gaps = [];
  let run = 1;
  for (let i = 0; i < dates.length; i++) {
    const v = m.get(dates[i]);
    if (!(v > 0)) le0++;
    if (i > 0) {
      if (v === m.get(dates[i - 1])) run++; else { if (run >= 3) rep.push({ fine: dates[i - 1], sedute: run, valore: m.get(dates[i - 1]) }); run = 1; }
      const g = dd(dates[i - 1], dates[i]); if (g > 4) gaps.push({ da: dates[i - 1], a: dates[i], giorni: g });
    }
  }
  if (run >= 3) rep.push({ fine: dates.at(-1), sedute: run, valore: m.get(dates.at(-1)) });
  let rep2 = 0; for (let i = 1; i < dates.length; i++) if (m.get(dates[i]) === m.get(dates[i - 1])) rep2++;
  return { serie: name, primo: dates[0], ultimo: dates.at(-1), valori: dates.length, ...extra, valori_le_0: le0, coppie_consecutive_uguali: rep2, ripetuti_3_o_piu: rep, buchi_oltre_4_giorni: gaps };
}
const fV3 = readFred('VXVCLS'), cV3 = readCboe('VIX3M'), fVIX = readFred('VIXCLS'), cVIX = readCboe('VIX');
R.vix3m = {};
R.vix3m.fred = profile(fV3.m, 'FRED VXVCLS', { righe: fV3.rows, mancanti_punto: fV3.dots });
R.vix3m.cboe = profile(cV3.m, 'Cboe VIX3M_History.csv', { righe_open_high_low_close_uguali: cV3.ohlcSame.length, primo_ohlc_uguali: cV3.ohlcSame[0] || null, ultimo_ohlc_uguali: cV3.ohlcSame.at(-1) || null });
function compare(a, b) {
  const common = [...a.keys()].filter((d) => b.has(d)).sort();
  let eq = 0; const diffs = [];
  for (const d of common) { const x = a.get(d), y = b.get(d); if (Math.round(x * 100) === Math.round(y * 100)) eq++; else diffs.push({ data: d, a: x, b: y, diff: r4(x - y) }); }
  diffs.sort((p, q) => Math.abs(q.diff) - Math.abs(p.diff));
  return { comuni: common.length, uguali_al_centesimo: eq, diversi: diffs.length, max_diff: diffs[0] || null, primi_10_diversi_per_ampiezza: diffs.slice(0, 10), solo_in_a: [...a.keys()].filter((d) => !b.has(d)).sort(), solo_in_b: [...b.keys()].filter((d) => !a.has(d)).sort() };
}
const cmpV3 = compare(fV3.m, cV3.m);
R.vix3m.fred_contro_cboe = { ...cmpV3, nota: 'a = FRED, b = Cboe', solo_in_a: { n: cmpV3.solo_in_a.length, primo: cmpV3.solo_in_a[0], ultimo: cmpV3.solo_in_a.at(-1), dopo_2009_09_18: cmpV3.solo_in_a.filter((d) => d >= '2009-09-18') }, solo_in_b: cmpV3.solo_in_b };
// FRED prima del 2009-09-18 (prima del file Cboe): stessa fonte? confronto con Yahoo ^VIX3M
const yV3 = readYahoo('VIX3M', nowSec), yVIX = readYahoo('VIX', nowSec);
const fredPre = new Map([...fV3.m].filter(([d]) => d < '2009-09-18'));
const cmpPre = compare(fredPre, yV3.close);
R.vix3m.fred_prima_di_cboe_contro_yahoo = { comuni: cmpPre.comuni, uguali_al_centesimo: cmpPre.uguali_al_centesimo, diversi: cmpPre.diversi, max_diff: cmpPre.max_diff };
// sedute dell'S&P 500
function onSess(m, d0) {
  const s = sessFrom(d0);
  const miss = s.filter((d) => !m.has(d) || !(m.get(d) > 0));
  const outside = [...m.keys()].filter((d) => d >= d0 && d <= LAST_SESS && !SESS_SET.has(d)).sort();
  return { sedute_dal: d0, sedute: s.length, sedute_senza_valore: miss.length, date_senza_valore: miss.length <= 40 ? miss : { primi: miss.slice(0, 20), ultimi: miss.slice(-20) }, valori_fuori_seduta: outside.length, date_fuori_seduta: outside };
}
R.vix3m.fred_su_sedute_spx = onSess(fV3.m, fV3.m.keys().next().value);
R.vix3m.cboe_su_sedute_spx = onSess(cV3.m, '2009-09-18');
R.vix3m.vixcls_su_sedute_spx_dal_2007_12_04 = onSess(fVIX.m, '2007-12-04');
// Yahoo contro Cboe
function yahooVs(y, c, label) {
  const lastC = [...c.keys()].sort().at(-1);
  const from = new Date(Date.parse(lastC) - 60 * DAY).toISOString().slice(0, 10);
  const recent = new Map([...y].filter(([d]) => d >= from && d <= lastC));
  const cr = compare(recent, c);
  const all = compare(y, c);
  return { serie: label, ultimi_60_giorni: { dal: from, comuni: cr.comuni, uguali_al_centesimo: cr.uguali_al_centesimo, diversi: cr.primi_10_diversi_per_ampiezza, solo_yahoo: cr.solo_in_a }, tutta_la_storia: { comuni: all.comuni, uguali_al_centesimo: all.uguali_al_centesimo, diversi: all.diversi, quota_diversi: r4(all.diversi / all.comuni), oltre_1_punto: all.primi_10_diversi_per_ampiezza.length ? compareCount(y, c, 1) : 0, max_diff: all.max_diff, primo_yahoo: [...y.keys()].sort()[0] } };
}
function compareCount(a, b, thr) { let n = 0; for (const [d, x] of a) if (b.has(d) && Math.abs(x - b.get(d)) > thr) n++; return n; }
R.vix3m.yahoo_VIX3M_contro_cboe = yahooVs(yV3.close, cV3.m, 'Yahoo ^VIX3M');
R.vix3m.yahoo_VIX_contro_cboe = yahooVs(yVIX.close, cVIX.m, 'Yahoo ^VIX (riferimento)');
// ritardo di pubblicazione
const lastOf = (m) => [...m.keys()].sort().at(-1);
const sessAfter = (d) => SESS.filter((x) => x > d).length;
R.ritardo = { ultima_seduta_spx: LAST_SESS, scaricato_alle: log['fred_VXVCLS.csv'].at, serie: {} };
for (const [k, m, meta] of [
  ['FRED VXVCLS', fV3.m, fredUpdated('VXVCLS')], ['FRED VIXCLS', fVIX.m, fredUpdated('VIXCLS')],
  ['Cboe VIX3M', cV3.m, { lastModified: log['cboe_VIX3M.csv'].lastModified }], ['Cboe VIX', cVIX.m, { lastModified: log['cboe_VIX.csv'].lastModified }],
  ['Yahoo ^VIX3M', yV3.close, {}],
]) R.ritardo.serie[k] = { ultima_data: lastOf(m), sedute_spx_mancanti_in_coda: sessAfter(lastOf(m)), ...meta };

// ---------- 2. futures VX ----------
const list = JSON.parse(fs.readFileSync(path.join(C, 'vx_product_list.json'), 'utf8'));
const allList = Object.values(list).flat();
const cdnM = allList.filter((r) => r.duration_type === 'M').map((r) => r.expire_date).sort();
const contracts = new Map(); // scadenza -> { settle: Map(data -> valore), fonte }
function addRows(exp, rows, src) {
  if (!contracts.has(exp)) contracts.set(exp, { cdn: new Map(), old: new Map() });
  const c = contracts.get(exp)[src];
  for (const [d, s] of rows) c.set(d, s);
}
for (const e of cdnM) {
  const f = path.join(C, `vx/VX_${e}.csv`);
  if (!fs.existsSync(f)) continue;
  const rows = fs.readFileSync(f, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).map((x) => [x[0], Number(x[6])]);
  addRows(e, rows, 'cdn');
}
const oldFiles = fs.readdirSync(path.join(C, 'vx_old')).filter((f) => f.endsWith('.csv')).sort();
const oldCheck = [];
for (const f of oldFiles) {
  const lines = fs.readFileSync(path.join(C, 'vx_old', f), 'utf8').trim().split(/\r?\n/);
  const h = lines.findIndex((l) => l.startsWith('Trade Date'));
  const rows = lines.slice(h + 1).map((l) => l.split(',')).filter((x) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(x[0])).map((x) => {
    const [mm, gg, aa] = x[0].split('/');
    const d = `${aa}-${mm.padStart(2, '0')}-${gg.padStart(2, '0')}`;
    let s = Number(x[6]);
    if (d < '2007-03-26') s /= 10; // fino al 23/03/2007 i futures valevano 10 volte il VIX
    return [d, s];
  }).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const exp = rows.at(-1)[0];
  oldCheck.push({ file: f, scadenza: exp, giorno_settimana: new Date(exp).getUTCDay() });
  addRows(exp, rows, 'old');
}
// scadenze: regola (mercoledì 30 giorni prima del terzo venerdì del mese dopo) contro le date ufficiali
function ruleExpiry(y, m) { // m 1-12: mese del contratto
  let ny = y, nm = m + 1; if (nm === 13) { nm = 1; ny++; }
  const first = new Date(Date.UTC(ny, nm - 1, 1));
  const fri = 1 + ((5 - first.getUTCDay() + 7) % 7) + 14;
  return new Date(Date.UTC(ny, nm - 1, fri) - 30 * DAY).toISOString().slice(0, 10);
}
const EXP = [...contracts.keys()].sort();
const ruleCmp = EXP.map((e) => ({ e, r: ruleExpiry(+e.slice(0, 4), +e.slice(5, 7)) })).filter((x) => x.e !== x.r);
// controllo: le scadenze 2013 dell'archivio coincidono con l'elenco ufficiale?
const old2013 = oldCheck.filter((o) => o.file.endsWith('13_VX.csv')).map((o) => o.scadenza);
const consec = []; for (let i = 1; i < EXP.length; i++) if (dd(EXP[i - 1], EXP[i]) > 42) consec.push({ da: EXP[i - 1], a: EXP[i], giorni: dd(EXP[i - 1], EXP[i]) });
// settle: CDN se > 0, se no archivio se > 0
const settle = (e, d) => { const c = contracts.get(e); if (!c) return null; const a = c.cdn.get(d); if (a > 0) return a; const b = c.old.get(d); return b > 0 ? b : null; };
// confronto CDN contro archivio dove ci sono entrambi
let ovN = 0, ovEq = 0, ovMax = { diff: 0 };
for (const [e, c] of contracts) for (const [d, a] of c.cdn) { const b = c.old.get(d); if (a > 0 && b > 0) { ovN++; if (Math.abs(a - b) < 0.005 + 1e-9) ovEq++; if (Math.abs(a - b) > Math.abs(ovMax.diff)) ovMax = { scadenza: e, data: d, cdn: a, archivio: b, diff: r4(a - b) }; } }
let cdnZero = []; for (const [, c] of contracts) for (const [d, a] of c.cdn) if (!(a > 0)) cdnZero.push(d);
cdnZero.sort();
R.futures = {
  elenco_ufficiale: { contratti: allList.length, mensili: cdnM.length, settimanali: allList.filter((r) => r.duration_type === 'W').length, prima_scadenza_mensile: cdnM[0], ultima_scadenza_mensile: cdnM.at(-1) },
  archivio_vecchio: { file: oldFiles.length, prima_scadenza: oldCheck.map((o) => o.scadenza).sort()[0], ultima_scadenza: oldCheck.map((o) => o.scadenza).sort().at(-1), scadenze_non_di_mercoledi: oldCheck.filter((o) => o.giorno_settimana !== 3), scadenze_2013_uguali_all_elenco: old2013.every((e) => cdnM.includes(e)) && old2013.length },
  scadenze_totali: EXP.length,
  scadenze_diverse_dalla_regola_semplice: ruleCmp.map((x) => ({ ufficiale: x.e, regola: x.r })),
  buchi_tra_scadenze_oltre_42_giorni: consec,
  cdn_settle_zero: { righe: cdnZero.length, dal: cdnZero[0] || null, al: cdnZero.at(-1) || null },
  cdn_contro_archivio: { righe_con_entrambi: ovN, uguali_al_mezzo_centesimo: ovEq, max_diff: ovMax },
  prima_riga_cdn: [...contracts.values()].flatMap((c) => [...c.cdn.keys()]).sort()[0],
};
// continuo VX1 / VX2 dal primo giorno con scadenze mensili consecutive
const startCons = consec.length ? consec.at(-1).da : EXP[0];
const futDates = [...new Set([...contracts.values()].flatMap((c) => [...c.cdn.keys(), ...c.old.keys()]))].filter((d) => d > startCons).sort();
const VX = new Map(); // data -> { e1, e2, v1, v2 }
for (const d of futDates) {
  const i = EXP.findIndex((e) => e > d);
  if (i < 0 || i + 1 >= EXP.length) continue;
  const e1 = EXP[i], e2 = EXP[i + 1];
  VX.set(d, { e1, e2, v1: settle(e1, d), v2: settle(e2, d) });
}
const vxDates = [...VX.keys()].sort();
const vxOk = vxDates.filter((d) => VX.get(d).v1 != null && VX.get(d).v2 != null);
R.futures.continuo = {
  regola: 'VX1 = mensile con scadenza > data; VX2 = il mensile dopo; Settle; il giorno di scadenza VX1 passa al contratto successivo',
  dal: vxDates[0], al: vxDates.at(-1), date: vxDates.length, con_vx1_e_vx2: vxOk.length,
  senza_valore: vxDates.filter((d) => !(VX.get(d).v1 != null && VX.get(d).v2 != null)),
  date_futures_fuori_sedute_spx: vxDates.filter((d) => d <= LAST_SESS && !SESS_SET.has(d)),
  sedute_spx_senza_futures: SESS.filter((d) => d >= vxDates[0] && d <= vxDates.at(-1) && !VX.has(d)),
};
// rapporto indici (FRED, sedute SPX)
const RI = new Map(); for (const d of SESS) { const a = fVIX.m.get(d), b = fV3.m.get(d); if (a > 0 && b > 0) RI.set(d, a / b); }
const RF = new Map(); for (const d of vxOk) RF.set(d, VX.get(d).v1 / VX.get(d).v2);
const CAL = SESS.filter((d) => RI.has(d) && RF.has(d));
const sI = CAL.map((d) => RI.get(d) > 1), sF = CAL.map((d) => RF.get(d) > 1);
let agree = 0; for (let i = 0; i < CAL.length; i++) if (sI[i] === sF[i]) agree++;
const lvl = pearson(CAL.map((d) => RI.get(d)), CAL.map((d) => RF.get(d)));
// variazioni su sedute consecutive del calendario SPX (entrambe nel calendario comune)
const sIdx = new Map(SESS.map((d, i) => [d, i]));
const dI = [], dF = [], dFnoRoll = [], dInoRoll = [];
const isRoll = (d, p) => VX.get(d).e1 !== VX.get(p).e1;
for (let i = 1; i < CAL.length; i++) {
  if (sIdx.get(CAL[i]) - sIdx.get(CAL[i - 1]) !== 1) continue;
  const a = RI.get(CAL[i]) - RI.get(CAL[i - 1]), b = RF.get(CAL[i]) - RF.get(CAL[i - 1]);
  dI.push(a); dF.push(b);
  if (!isRoll(CAL[i], CAL[i - 1])) { dInoRoll.push(a); dFnoRoll.push(b); }
}
// ingressi
function entries(s, minBefore = 1) { const out = []; for (let i = minBefore; i < s.length; i++) if (s[i] && s.slice(i - minBefore, i).every((x) => !x)) out.push(i); return out; }
function matchEntries(a, b, tol = 2) { let m = 0; const lags = []; for (const i of a) { let best = null; for (const j of b) if (Math.abs(j - i) <= tol && (best == null || Math.abs(j - i) < Math.abs(best))) best = j - i; if (best != null) { m++; lags.push(best); } } return { n: a.length, abbinati: m, ritardi: Object.fromEntries([-2, -1, 0, 1, 2].map((k) => [k, lags.filter((x) => x === k).length])) }; }
const eI = entries(sI), eF = entries(sF), eI10 = entries(sI, 10), eF10 = entries(sF, 10);
// ingresso di uno: l'altro è in backwardation (stato, non ingresso) in almeno una seduta entro ±2?
const stateNear = (a, other) => a.filter((i) => [-2, -1, 0, 1, 2].some((k) => other[i + k])).length;
// periodi di disaccordo
const runs = []; let st = null;
for (let i = 0; i <= CAL.length; i++) {
  const dis = i < CAL.length && sI[i] !== sF[i];
  if (dis && st == null) st = i;
  if (!dis && st != null) {
    const seg = CAL.slice(st, i);
    runs.push({ dal: seg[0], al: seg.at(-1), sedute: seg.length, chi_dice_backwardation: sI[st] ? 'VIX/VIX3M' : 'VX1/VX2', vix_vix3m_medio: r4(seg.reduce((s, d) => s + RI.get(d), 0) / seg.length), vx1_vx2_medio: r4(seg.reduce((s, d) => s + RF.get(d), 0) / seg.length) });
    st = null;
  }
}
const runLen = (k) => runs.filter((r) => r.sedute >= k).length;
const ties = CAL.filter((d) => VX.get(d).v1 === VX.get(d).v2).length;
// quanto «vicino a 1»: disaccordi con almeno un rapporto entro ±2% da 1
const disDays = CAL.filter((d, i) => sI[i] !== sF[i]);
const near = disDays.filter((d) => Math.abs(RI.get(d) - 1) <= 0.02 || Math.abs(RF.get(d) - 1) <= 0.02).length;
// salti alle scadenze
const rolls = [];
for (let i = 1; i < vxOk.length; i++) {
  const d = vxOk[i], p = vxOk[i - 1];
  if (VX.get(d).e1 === VX.get(p).e1) continue;
  const P = VX.get(p), D = VX.get(d);
  const newPrev = settle(D.e1, p), newE2prev = settle(D.e2, p);
  rolls.push({
    data: d, prima: p, vecchio_vx1: P.e1, nuovo_vx1: D.e1,
    vx1_prima: P.v1, vx1_dopo: D.v1, salto_vx1: r4(D.v1 - P.v1), di_cui_roll: newPrev != null ? r4(newPrev - P.v1) : null, di_cui_mercato: newPrev != null ? r4(D.v1 - newPrev) : null,
    salto_vx2: r4(D.v2 - P.v2), roll_vx2: newE2prev != null ? r4(newE2prev - P.v2) : null,
    rapporto_prima: r4(P.v1 / P.v2), rapporto_dopo: r4(D.v1 / D.v2), rapporto_senza_roll: newPrev != null && newE2prev != null ? r4(newPrev / newE2prev) : null,
    vix_vix3m_prima: r4(RI.get(p) ?? null), vix_vix3m_dopo: r4(RI.get(d) ?? null),
  });
}
const rollsC = rolls.filter((x) => x.data >= CAL[0]);
const absNoRollVX1 = []; for (let i = 1; i < vxOk.length; i++) { const d = vxOk[i], p = vxOk[i - 1]; if (VX.get(d).e1 === VX.get(p).e1) absNoRollVX1.push(Math.abs(VX.get(d).v1 - VX.get(p).v1)); }
const rollAbs = rollsC.filter((x) => x.di_cui_roll != null).map((x) => Math.abs(x.di_cui_roll));
const ratioJumpRoll = rollsC.filter((x) => x.rapporto_senza_roll != null).map((x) => Math.abs(x.rapporto_dopo - x.rapporto_prima));
const ratioRollPart = rollsC.filter((x) => x.rapporto_senza_roll != null).map((x) => Math.abs(x.rapporto_senza_roll - x.rapporto_prima));
// cambi di stato dovuti al solo roll: il cambio di contratti porta il rapporto dall'altra parte di 1 e il mercato non lo riporta indietro
// rapporto_senza_roll = rapporto della NUOVA coppia nella seduta prima: prima → senza_roll è solo il cambio di contratti, senza_roll → dopo è il mercato
const flipsByRoll = rollsC.filter((x) => x.rapporto_senza_roll != null && ((x.rapporto_prima > 1) !== (x.rapporto_senza_roll > 1)) && ((x.rapporto_senza_roll > 1) === (x.rapporto_dopo > 1)));
R.struttura = {
  indici: 'VIXCLS / VXVCLS (FRED) sulle sedute dell\'S&P 500', futures: 'VX1 / VX2 (Settle Cboe)',
  periodo_comune: { dal: CAL[0], al: CAL.at(-1), sedute: CAL.length },
  backwardation_sedute: { vix_vix3m: sI.filter(Boolean).length, vx1_vx2: sF.filter(Boolean).length, vx1_uguale_vx2: ties },
  concordanza: { sedute_uguali: agree, quota: r4(agree / CAL.length), entrambi_backwardation: CAL.filter((d, i) => sI[i] && sF[i]).length, solo_vix_vix3m: CAL.filter((d, i) => sI[i] && !sF[i]).length, solo_vx1_vx2: CAL.filter((d, i) => !sI[i] && sF[i]).length, disaccordi_con_un_rapporto_entro_2pc_da_1: near },
  correlazione: { livelli: r4(lvl), variazioni_1_seduta: r4(pearson(dI, dF)), coppie_variazioni: dI.length, variazioni_senza_giorni_di_roll: r4(pearson(dInoRoll, dFnoRoll)), coppie_senza_roll: dInoRoll.length },
  ingressi: { vix_vix3m: matchEntries(eI, eF), vx1_vx2: matchEntries(eF, eI), filtrati_10_sedute: { vix_vix3m: matchEntries(eI10, eF10), vx1_vx2: matchEntries(eF10, eI10) }, altro_in_backwardation_entro_2_sedute: { ingressi_vix_vix3m: stateNear(eI, sF), ingressi_vx1_vx2: stateNear(eF, sI), filtrati_vix_vix3m: stateNear(eI10, sF), filtrati_vx1_vx2: stateNear(eF10, sI) }, nota: 'abbinati = l\'altro rapporto ha un ingresso (dello stesso tipo) entro ±2 sedute; ritardi = sedute dell\'altro dopo questo' },
  disaccordi: { periodi: runs.length, di_almeno_3_sedute: runLen(3), di_almeno_5_sedute: runLen(5), di_almeno_10_sedute: runLen(10), lista_almeno_3: runs.filter((r) => r.sedute >= 3) },
  scadenze: {
    nel_periodo_comune: rollsC.length,
    salto_roll_vx1_assoluto: { mediana: r4(median(rollAbs)), massimo: r4(Math.max(...rollAbs)) },
    variazione_vx1_assoluta_senza_roll_mediana: r4(median(absNoRollVX1)),
    rapporto_salto_assoluto_mediano_alla_scadenza: r4(median(ratioJumpRoll)), di_cui_solo_roll_mediano: r4(median(ratioRollPart)),
    variazione_rapporto_assoluta_mediana_altri_giorni: r4(median(dFnoRoll.map(Math.abs))),
    cambi_di_stato_causati_dal_solo_roll: flipsByRoll.map((x) => ({ data: x.data, prima: x.rapporto_prima, nuova_coppia_seduta_prima: x.rapporto_senza_roll, dopo: x.rapporto_dopo, vix_vix3m_prima: x.vix_vix3m_prima, vix_vix3m_dopo: x.vix_vix3m_dopo })),
    maggiori_10_salti_roll: [...rollsC].filter((x) => x.di_cui_roll != null).sort((a, b) => Math.abs(b.di_cui_roll) - Math.abs(a.di_cui_roll)).slice(0, 10),
    tutte: rollsC,
  },
};

// ---------- 3. credito ----------
const CR = { HY: readFred('BAMLH0A0HYM2'), IG: readFred('BAMLC0A0CM'), BAA10Y: readFred('BAA10Y'), AAA10Y: readFred('AAA10Y'), DBAA: readFred('DBAA'), DAAA: readFred('DAAA'), DGS10: readFred('DGS10'), NFCICREDIT: readFred('NFCICREDIT') };
const BAAAAA = new Map(); for (const [d, v] of CR.BAA10Y.m) if (CR.AAA10Y.m.has(d)) BAAAAA.set(d, Math.round((v - CR.AAA10Y.m.get(d)) * 1e6) / 1e6);
const hyg = readYahoo('HYG', nowSec), ief = readYahoo('IEF', nowSec);
const HYGIEF = new Map(); for (const [d, v] of hyg.adj) if (ief.adj.has(d)) HYGIEF.set(d, -100 * Math.log(v / ief.adj.get(d)));
const SER = { 'HY OAS (BAMLH0A0HYM2)': CR.HY.m, 'IG OAS (BAMLC0A0CM)': CR.IG.m, BAA10Y: CR.BAA10Y.m, AAA10Y: CR.AAA10Y.m, 'Baa-Aaa (BAA10Y-AAA10Y)': BAAAAA, '-ln(HYG/IEF)x100 (Yahoo)': HYGIEF };
const HY0 = lastOf(CR.HY.m) && [...CR.HY.m.keys()].sort()[0];
const W = SESS.filter((d) => d >= HY0);
const onCal = (m, cal) => cal.map((d) => (m.has(d) ? m.get(d) : null));
const diffK = (a, k) => a.map((v, i) => (i >= k && v != null && a[i - k] != null ? v - a[i - k] : null));
function corrPairs(a, b) { const x = [], y = []; for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null) { x.push(a[i]); y.push(b[i]); } return { r: r4(pearson(x, y)), n: x.length }; }
const hyCal = onCal(CR.HY.m, W);
R.credito = { periodo_hy: { dal: W[0], al: W.at(-1), sedute_spx: W.length }, correlazioni_con_hy_oas: {}, aprile_2025: {}, buchi: {}, ritardo: {}, licenze: {} };
for (const [k, m] of Object.entries(SER)) {
  if (k.startsWith('HY')) continue;
  const c = onCal(m, W);
  R.credito.correlazioni_con_hy_oas[k] = { livelli: corrPairs(hyCal, c), variazioni_5_sedute: corrPairs(diffK(hyCal, 5), diffK(c, 5)), variazioni_21_sedute: corrPairs(diffK(hyCal, 21), diffK(c, 21)) };
}
// NFCICREDIT settimanale: HY OAS all'ultima seduta della settimana (fino al venerdì della data NFCI)
{
  const nf = [...CR.NFCICREDIT.m].filter(([d]) => d >= HY0).sort();
  const hyD = [...CR.HY.m.keys()].sort();
  const pairs = nf.map(([d, v]) => { const h = hyD.filter((x) => x <= d).at(-1); return h && dd(h, d) <= 6 ? [CR.HY.m.get(h), v] : null; }).filter(Boolean);
  const lv = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
  const ch = []; for (let i = 1; i < pairs.length; i++) ch.push([pairs[i][0] - pairs[i - 1][0], pairs[i][1] - pairs[i - 1][1]]);
  const ch4 = []; for (let i = 4; i < pairs.length; i++) ch4.push([pairs[i][0] - pairs[i - 4][0], pairs[i][1] - pairs[i - 4][1]]);
  R.credito.correlazioni_con_hy_oas['NFCICREDIT (settimanale)'] = { settimane: pairs.length, livelli: r4(lv), variazioni_1_settimana: r4(pearson(ch.map((p) => p[0]), ch.map((p) => p[1]))), variazioni_4_settimane: r4(pearson(ch4.map((p) => p[0]), ch4.map((p) => p[1]))) };
}
// aprile 2025
const sd21 = {};
for (const [k, m] of Object.entries(SER)) {
  const c = onCal(m, W), d21 = diffK(c, 21).filter((x) => x != null);
  sd21[k] = sd(d21);
  const base = m.get('2025-04-02');
  const win = [...m].filter(([d]) => d >= '2025-04-03' && d <= '2025-05-30').sort((a, b) => b[1] - a[1]);
  const [pd, pv] = win[0];
  const vals = c.filter((x) => x != null);
  const pct = vals.filter((x) => x <= pv).length / vals.length;
  R.credito.aprile_2025[k] = { al_2025_04_02: r4(base), massimo: r4(pv), data_massimo: pd, aumento: r4(pv - base), aumento_in_sd_delle_variazioni_21: r2((pv - base) / sd21[k]), percentile_del_massimo_nel_periodo_hy: r4(pct), massimo_del_periodo_hy: r4(Math.max(...vals)), data_massimo_periodo_hy: W[c.indexOf(Math.max(...vals))] };
}
// percentile del picco 2025 nella storia lunga dal 1990 (solo serie lunghe)
for (const k of ['BAA10Y', 'AAA10Y', 'Baa-Aaa (BAA10Y-AAA10Y)']) {
  const m = SER[k]; const all = [...m].filter(([d]) => d >= '1990-01-02').map(([, v]) => v);
  const pv = R.credito.aprile_2025[k].massimo;
  R.credito.aprile_2025[k].percentile_del_massimo_dal_1990 = r4(all.filter((x) => x <= pv).length / all.length);
}
// serie lunga: BAA10Y e Baa-Aaa contro -ln(HYG/IEF) dal primo giorno comune (HYG dal 2007)
{
  const h0 = [...HYGIEF.keys()].sort()[0];
  const cal = SESS.filter((d) => d >= h0);
  const h = onCal(HYGIEF, cal);
  R.credito.storia_lunga_contro_hyg_ief = { dal: h0, al: cal.at(-1) };
  for (const k of ['BAA10Y', 'Baa-Aaa (BAA10Y-AAA10Y)', 'AAA10Y']) {
    const c = onCal(SER[k], cal);
    R.credito.storia_lunga_contro_hyg_ief[k] = { variazioni_21_sedute: corrPairs(diffK(h, 21), diffK(c, 21)), variazioni_5_sedute: corrPairs(diffK(h, 5), diffK(c, 5)), livelli: corrPairs(h, c) };
    // per sotto-periodi
    for (const [a, b] of [['2007-04-11', '2012-12-31'], ['2013-01-01', '2019-12-31'], ['2020-01-01', '2026-12-31']]) {
      const idx = cal.map((d, i) => (d >= a && d <= b ? i : -1)).filter((i) => i >= 0);
      const H = diffK(h, 21), Cc = diffK(c, 21);
      R.credito.storia_lunga_contro_hyg_ief[k][`var21_${a.slice(0, 4)}_${b.slice(0, 4)}`] = corrPairs(idx.map((i) => H[i]), idx.map((i) => Cc[i]));
    }
  }
}
// BAA10Y = DBAA - DGS10? (riproducibilità; se DBAA si ferma si ferma anche BAA10Y)
{
  let n = 0, eq = 0; const off = [];
  for (const [d, v] of CR.BAA10Y.m) { const a = CR.DBAA.m.get(d), b = CR.DGS10.m.get(d); if (a != null && b != null) { n++; if (Math.abs(v - (a - b)) < 0.005 + 1e-9) eq++; else off.push({ data: d, baa10y: v, dbaa_meno_dgs10: r4(a - b) }); } }
  R.credito.baa10y_uguale_dbaa_meno_dgs10 = { date: n, uguali: eq, diverse: off.length, esempi: off.slice(-5) };
}
// buchi e date fuori seduta
for (const [k, m] of [['HY OAS (BAMLH0A0HYM2)', CR.HY.m], ['IG OAS (BAMLC0A0CM)', CR.IG.m], ['BAA10Y', CR.BAA10Y.m], ['AAA10Y', CR.AAA10Y.m], ['DGS10', CR.DGS10.m], ['VXVCLS', fV3.m]]) {
  const d0 = [...m.keys()].sort()[0] < '1990-01-02' ? '1990-01-02' : [...m.keys()].sort()[0];
  const s = SESS.filter((d) => d >= d0 && d <= lastOf(m));
  const miss = s.filter((d) => !m.has(d));
  const out = [...m.keys()].filter((d) => d >= d0 && d <= lastOf(m) && !SESS_SET.has(d)).sort();
  const perYear = {}; for (const d of miss) perYear[d.slice(0, 4)] = (perYear[d.slice(0, 4)] || 0) + 1;
  const last3 = miss.filter((d) => d >= '2023-11-07');
  const kind = (x) => { const t = new Date(x), m = t.getUTCMonth() + 1, g = t.getUTCDate(), w = t.getUTCDay();
    if (m === 10 && w === 1 && g >= 8 && g <= 14) return 'Columbus Day'; if (m === 11 && (g === 11 || (g === 10 && w === 5) || (g === 12 && w === 1))) return 'Veterans Day'; return 'altro'; };
  const tipi = {}; for (const x of miss) tipi[kind(x)] = (tipi[kind(x)] || 0) + 1;
  R.credito.buchi[k] = { tipi_dei_buchi: tipi, buchi_altro: miss.filter((x) => kind(x) === 'altro'), dal: d0, al: lastOf(m), sedute_spx: s.length, sedute_senza_valore: miss.length, quota: r4(miss.length / s.length), per_anno: perYear, dal_2023_11_07: last3, valori_fuori_seduta: out.length, fuori_seduta_ultimi: out.slice(-8), mancanti_punto_nel_csv: (CR[k.split(' ')[0]] || fV3).dots };
}
for (const [k, id] of [['HY OAS (BAMLH0A0HYM2)', 'BAMLH0A0HYM2'], ['IG OAS (BAMLC0A0CM)', 'BAMLC0A0CM'], ['BAA10Y', 'BAA10Y'], ['AAA10Y', 'AAA10Y'], ['DBAA', 'DBAA'], ['DAAA', 'DAAA'], ['DGS10', 'DGS10'], ['NFCICREDIT', 'NFCICREDIT']]) {
  const m = (CR[k.split(' ')[0]] || CR[id]).m;
  R.credito.ritardo[k] = { ultima_data: lastOf(m), sedute_spx_dopo: sessAfter(lastOf(m)), ...fredUpdated(id) };
}
R.credito.ritardo['-ln(HYG/IEF) (Yahoo)'] = { ultima_data: lastOf(HYGIEF), sedute_spx_dopo: sessAfter(lastOf(HYGIEF)) };
R.credito.serie_lunghe = Object.fromEntries(['BAA10Y', 'AAA10Y', 'DBAA', 'DAAA', 'NFCICREDIT', 'HY', 'IG'].map((k) => [k, { primo: [...CR[k].m.keys()].sort()[0], ultimo: lastOf(CR[k].m), valori: CR[k].m.size }]));
R.credito.serie_lunghe['HYG/IEF (Yahoo)'] = { primo: [...HYGIEF.keys()].sort()[0], ultimo: lastOf(HYGIEF), valori: HYGIEF.size };

// ---------- 4. peso ----------
const onS = (m, d0 = '1990-01-01') => { const dates = SESS.filter((d) => d >= d0 && m.has(d) && m.get(d) > 0); return { dates, val: dates.map((d) => m.get(d)) }; };
const cand = {
  VIX3M_FRED_dal_2007: onS(fV3.m),
  VX1_dal_2007_12: (() => { const dates = SESS.filter((d) => d >= '2007-12-04' && RF.has(d)); return { dates, val: dates.map((d) => VX.get(d).v1) }; })(),
  VX2_dal_2007_12: (() => { const dates = SESS.filter((d) => d >= '2007-12-04' && RF.has(d)); return { dates, val: dates.map((d) => VX.get(d).v2) }; })(),
  HY_OAS_3_anni: onS(CR.HY.m),
  BAA10Y_dal_1990: onS(CR.BAA10Y.m),
  AAA10Y_dal_1990: onS(CR.AAA10Y.m),
};
const sizes = {};
const base = JSON.stringify(vixJson);
const gz = (s) => zlib.gzipSync(Buffer.from(s), { level: 9 }).length;
for (const [k, s] of Object.entries(cand)) {
  const p = { ...pack(s.dates, s.val), last: s.dates.at(-1) };
  const withIt = JSON.stringify({ ...vixJson, series: { ...vixJson.series, X: p } });
  const dec2 = s.val.every((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6);
  const p100 = { ...pack(s.dates, s.val, 100), last: s.dates.at(-1) };
  const with100 = JSON.stringify({ ...vixJson, series: { ...vixJson.series, X: p100 } });
  sizes[k] = { valori: s.dates.length, ps: p.ps, kb: r2((withIt.length - base.length) / 1024), kb_gzip: r2((gz(withIt) - gz(base)) / 1024), solo_2_decimali: dec2, ...(dec2 ? { kb_con_ps100: r2((with100.length - base.length) / 1024), kb_gzip_con_ps100: r2((gz(with100) - gz(base)) / 1024) } : {}) };
}
const combos = { 'VIX3M + BAA10Y': ['VIX3M_FRED_dal_2007', 'BAA10Y_dal_1990'], 'VIX3M + VX1 + VX2 + BAA10Y': ['VIX3M_FRED_dal_2007', 'VX1_dal_2007_12', 'VX2_dal_2007_12', 'BAA10Y_dal_1990'] };
for (const [k, ks] of Object.entries(combos)) {
  const extra = Object.fromEntries(ks.map((x) => [x, { ...pack(cand[x].dates, cand[x].val), last: cand[x].dates.at(-1) }]));
  const withIt = JSON.stringify({ ...vixJson, series: { ...vixJson.series, ...extra } });
  sizes[k] = { kb: r2((withIt.length - base.length) / 1024), kb_gzip: r2((gz(withIt) - gz(base)) / 1024), file_kb: r2(withIt.length / 1024), file_kb_gzip: r2(gz(withIt) / 1024) };
}
R.peso = { file_attuale_kb: r2(base.length / 1024), file_attuale_kb_gzip: r2(gz(base) / 1024), aggiunte: sizes };

R.generato = new Date().toISOString();
fs.writeFileSync(path.join(HERE, 'risultati.json'), JSON.stringify(R, null, 1));

// ---------- riepilogo ----------
const S = R.struttura;
console.log('VIX3M FRED', R.vix3m.fred.primo, '→', R.vix3m.fred.ultimo, R.vix3m.fred.valori, 'valori; Cboe', R.vix3m.cboe.primo, '→', R.vix3m.cboe.ultimo);
console.log('FRED contro Cboe:', cmpV3.comuni, 'comuni,', cmpV3.uguali_al_centesimo, 'uguali; max', JSON.stringify(cmpV3.max_diff));
console.log('Yahoo ^VIX3M 60 g:', JSON.stringify(R.vix3m.yahoo_VIX3M_contro_cboe.ultimi_60_giorni).slice(0, 300));
console.log('Periodo comune struttura', S.periodo_comune, 'concordanza', S.concordanza, 'corr', S.correlazione);
console.log('Ingressi', JSON.stringify(S.ingressi));
console.log('Disaccordi', S.disaccordi.periodi, S.disaccordi.di_almeno_5_sedute);
console.log('Credito', JSON.stringify(R.credito.correlazioni_con_hy_oas, null, 0));
console.log('Peso', JSON.stringify(R.peso));
