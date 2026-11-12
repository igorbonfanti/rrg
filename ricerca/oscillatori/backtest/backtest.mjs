#!/usr/bin/env node
/*
 * ricerca/oscillatori/backtest/backtest.mjs — fase di ricerca, NON tocca l'app.
 *
 * Domanda: un segnale MENSILE «due oscillatori lenti girano al ribasso insieme da zona alta» sull'S&P 500 (idea di
 * Francesco Caruso, Cicli&Mercati, con il suo Composite Momentum Oscillator e il C-Wave) avvisa di correzioni (calo ≥10%)
 * e bear market (calo ≥20%)? Quanto prima, con quanti falsi allarmi? Il C-Wave non è pubblico e non si imita: al suo posto
 * Coppock, KST di Pring e MACD mensili (formule e fonti in lib.mjs). Il CMO si usa con il permesso dell'autore.
 *
 * Dati
 *  - Barre mensili dell'S&P 500 (massimo, minimo, chiusura) costruite dalle sedute di Yahoo ^GSPC dal 02/01/1985
 *    (ricerca/oscillatori/cache/gspc_1d.json, scaricata da ../massimi_minimi.mjs; la cartella cache è fuori da git).
 *    Massimo = max dei massimi, minimo = min dei minimi, chiusura = ultima seduta del mese. Solo mesi CHIUSI (il mese in
 *    corso si scarta). Le barre si salvano in valori_mensili.json: se la cache manca, lo script le rilegge da lì (offline).
 *    Le chiusure mensili si confrontano con quelle di data/vix.json (serie SPX dal 1990).
 *  - Esiti (cali, rendimenti) dalle chiusure GIORNALIERE di data/vix.json SPX (dal 02/01/1990, solo prezzo); VIX di chiusura
 *    da data/vix.json VIX (FRED VIXCLS, dal 1990). Decodifica con vxSeries di js/vix.js.
 *
 * Regola (decisa prima di vedere i risultati)
 *  - «gira al ribasso» nel mese t: valore(t) < valore(t−1); per KST e MACD anche la variante «sotto la propria linea di
 *    segnale»: valore(t) < segnale(t).
 *  - zona alta del CMO: CMO > 0 (principale) o CMO > 50; zona alta del secondo oscillatore: valore > suo percentile 70
 *    (varianti 60, 80) calcolato sui soli valori fino al mese t compreso (finestra crescente, almeno 60 valori), oppure,
 *    per Coppock/MACD, valore > 0.
 *  - SEGNALE nel mese chiuso t: entrambi in discesa in t; il CMO è stato in zona alta in almeno uno dei mesi t−2, t−1, t
 *    E il secondo oscillatore è stato in zona alta in almeno uno dei mesi t−2, t−1, t (ciascuno per conto suo);
 *    in t−1 NON erano già entrambi in discesa (si conta solo l'inizio).
 *  - Il segnale si conosce alla chiusura dell'ultima seduta del mese t: gli esiti partono da quella chiusura.
 *  - «In allarme»: dal mese del segnale fino al mese prima di quello in cui almeno uno dei due torna a salire (cioè non
 *    sono più entrambi in discesa).
 *
 * Esiti per ogni mese t: calo massimo (chiusure giornaliere dei mesi t+1..t+h rispetto alla chiusura di t) a 6/12/18 mesi;
 * rendimento a 3/6/12 mesi (chiusura di fine mese t+h); VIX massimo di chiusura nei mesi t+1..t+12; mesi fino al minimo
 * (mese del minimo di chiusura nei 12 mesi dopo, contato da t). Finestre non finite: escluse dalle statistiche.
 * Base: gli stessi esiti per tutti i mesi del periodo.
 *
 * Eventi: cali ≥10% e ≥20% delle chiusure giornaliere. Un evento parte da un massimo P e c'è se la chiusura scende di
 * almeno X% sotto P prima di tornare sopra P; finisce quando torna sopra P (o è in corso). Il massimo è il più alto dal
 * minimo dell'evento precedente: dopo il minimo di un evento lungo (per esempio 2007-09) si cercano altri eventi tra quel
 * minimo e il ritorno sopra P (così 2010 e 2011 contano, i rimbalzi dentro un bear market prima del suo minimo no).
 * Eventi con massimo dal 1993. Un evento è «avvisato» se c'è un segnale in un mese da 12 mesi prima del mese del
 * massimo a 1 mese dopo; anticipo = mese del massimo − mese del segnale (negativo = dopo il massimo).
 *
 * Criterio di successo (deciso prima): (a) quota di segnali con calo ≥10% entro 12 mesi − quota di tutti i mesi ≥ 15 punti;
 * (b) almeno 3 bear market ≥20% avvisati (nei sottoperiodi: almeno il 75% di quelli del periodo, arrotondato per eccesso);
 * (c) mesi in allarme ≤ 35%; (d) a-c reggono nel 2010-2026 e con parametri vicini (K ±1, percentile ±10: almeno il 75%
 * dei vicini, arrotondato per eccesso, supera a-c sul periodo intero).
 * Scelta dei parametri nel campione 1993-2009 (variante che supera a-c con lo scarto (a) più alto), verifica 2010-2026.
 *
 * Uso: node ricerca/oscillatori/backtest/backtest.mjs > ricerca/oscillatori/backtest/backtest.out.txt
 * Scrive: valori_mensili.json (barre e oscillatori mese per mese), risultati.json (tutte le tabelle).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vxSeries } from '../../../js/vix.js';
import { NYSE } from '../../../js/calendar.js';
import { cmo, coppock, kst, macd, ppo, expandingPct, median, quantile } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const CACHE = path.join(ROOT, 'ricerca/oscillatori/cache/gspc_1d.json');
const OUT_VAL = path.join(HERE, 'valori_mensili.json'), OUT_RES = path.join(HERE, 'risultati.json');
const r2 = (v, d = 2) => (v == null || !isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const pc = (v) => (v == null ? '—' : (100 * v).toFixed(1) + '%');
const f1 = (v, d = 1) => (v == null ? '—' : v.toFixed(d));
const DAY = 86400000;

// =====================================================================================================================
// 1. Dati
// =====================================================================================================================
const VJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vix.json'), 'utf8'));
const SPX = vxSeries(VJ.series.SPX), VIX = vxSeries(VJ.series.VIX);
const lastData = SPX.dates.at(-1);

function lastNyseSession(ym) {
  const [y, m] = ym.split('-').map(Number);
  let t = Date.UTC(y, m, 0);
  for (;;) { const iso = new Date(t).toISOString().slice(0, 10); if (NYSE.isTradingDay(iso)) return iso; t -= DAY; }
}
const isClosed = (ym, lastSession, lastAvail) => { const e = lastNyseSession(ym); return lastSession >= e || lastAvail > e; };

let bars, barSource;
if (fs.existsSync(CACHE)) {
  const j = JSON.parse(fs.readFileSync(CACHE, 'utf8')), res = j.chart.result[0], q = res.indicators.quote[0];
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: res.meta.exchangeTimezoneName, year: 'numeric', month: '2-digit', day: '2-digit' });
  const D = res.timestamp.map((t, i) => ({ d: f.format(t * 1000), h: q.high[i], l: q.low[i], c: q.close[i] })).filter((x) => x.c != null);
  const byM = [];
  for (const x of D) {
    const k = x.d.slice(0, 7), m = byM.at(-1);
    if (!m || m.m !== k) byM.push({ m: k, last: x.d, high: x.h, low: x.l, close: x.c, n: 1 });
    else { m.high = Math.max(m.high, x.h); m.low = Math.min(m.low, x.l); m.close = x.c; m.last = x.d; m.n++; }
  }
  const lastAvail = D.at(-1).d;
  bars = byM.filter((b) => isClosed(b.m, b.last, lastAvail));
  barSource = `cache Yahoo ^GSPC giornaliera (${D.length} sedute dal ${D[0].d} al ${lastAvail}); mese in corso scartato: ${byM.filter((b) => !isClosed(b.m, b.last, lastAvail)).map((b) => b.m).join(', ') || 'nessuno'}`;
} else {
  bars = JSON.parse(fs.readFileSync(OUT_VAL, 'utf8')).mesi.map((r) => ({ m: r.mese, last: r.ultimaSeduta, high: r.massimo, low: r.minimo, close: r.chiusura, n: r.sedute }));
  barSource = 'valori_mensili.json (cache assente: barre salvate dalla corsa precedente)';
}
console.log('== Dati');
console.log(`Barre mensili: ${bars.length} mesi chiusi dal ${bars[0].m} al ${bars.at(-1).m}; fonte: ${barSource}`);
const lastClosed = bars.at(-1).m;

// controllo: chiusure mensili delle barre = ultima seduta del mese in data/vix.json
const vixMonthly = new Map();
SPX.dates.forEach((d, i) => { if (SPX.val[i] != null) vixMonthly.set(d.slice(0, 7), { d, c: SPX.val[i] }); });
{
  let n = 0, diff = 0, dDate = 0, mx = 0, worst = '';
  for (const b of bars) {
    const v = vixMonthly.get(b.m); if (!v) continue; n++;
    const e = Math.abs(v.c - b.close); if (e > 0.005) diff++; if (v.d !== b.last) dDate++;
    if (e > mx) { mx = e; worst = `${b.m} (${b.close} contro ${v.c})`; }
  }
  console.log(`Chiusure mensili confrontate con data/vix.json: ${n} mesi; diverse oltre 0,005 punti: ${diff}; ultima seduta diversa: ${dDate}; scarto massimo ${f1(mx, 4)} ${worst}`);
  const flat = bars.filter((b) => !(b.high > b.low)).length;
  const bad = bars.filter((b) => b.close > b.high + 1e-9 || b.close < b.low - 1e-9).length;
  console.log(`Barre con massimo ≤ minimo: ${flat}; chiusura fuori da [minimo, massimo]: ${bad}`);
}

// =====================================================================================================================
// 2. Oscillatori
// =====================================================================================================================
const C = bars.map((b) => b.close);
const O = {
  CMO4: cmo(bars, 4, 'sma'), CMO3: cmo(bars, 3, 'sma'), CMO5: cmo(bars, 5, 'sma'), CMO4s: cmo(bars, 4, 'somme'),
};
// stessa formula partendo dal 1990-01 (sensibilità al punto di partenza)
{
  const i90 = bars.findIndex((b) => b.m === '1990-01');
  const c90 = cmo(bars.slice(i90), 4, 'sma').cmo;
  O.CMO4from90 = { cmo: new Array(i90).fill(null).concat(c90) };
}
const COP = coppock(C), K = kst(C), MA = macd(C), PP = ppo(C);
const idx = new Map(bars.map((b, i) => [b.m, i]));
const N = bars.length;

// confronto partenza 1985 / 1990 dal 1993
{
  const a = O.CMO4.cmo, b = O.CMO4from90.cmo; let n = 0, mx = 0, dirDiff = 0, zDiff = 0;
  for (let t = idx.get('1993-01'); t < N; t++) {
    n++; mx = Math.max(mx, Math.abs(a[t] - b[t]));
    if ((a[t] < a[t - 1]) !== (b[t] < b[t - 1])) dirDiff++;
    if ((a[t] > 0) !== (b[t] > 0)) zDiff++;
  }
  console.log(`CMO K=4 partendo dal 1985 o dal 1990, mesi dal 1993: ${n}; scarto massimo ${f1(mx, 6)} punti; direzione diversa ${dirDiff}; segno diverso ${zDiff}`);
  const s = O.CMO4s.cmo; let m2 = 0, dd = 0, zd = 0, n2 = 0;
  for (let t = idx.get('1993-01'); t < N; t++) { n2++; m2 = Math.max(m2, Math.abs(a[t] - s[t])); if ((a[t] < a[t - 1]) !== (s[t] < s[t - 1])) dd++; if ((a[t] > 0) !== (s[t] > 0)) zd++; }
  console.log(`CMO K=4 con stocastico «media semplice di %K» contro «rapporto di somme» (MetaStock): scarto massimo ${f1(m2, 2)} punti; direzione diversa in ${dd} mesi su ${n2}; segno diverso in ${zd}`);
}

// valori mensili per il ricalcolo indipendente
const valori = {
  descrizione: 'S&P 500 (^GSPC, solo prezzo) mensile: barre dalle sedute Yahoo (massimo dei massimi, minimo dei minimi, chiusura dell\'ultima seduta), solo mesi chiusi; oscillatori di lib.mjs. null = storia insufficiente.',
  formule: {
    CMO: 'CMO ufficiale ProRealTime, K=4 (CMO_K3, CMO_K5: K=3 e 5); Stochastic[5,3] = media semplice a 3 del %K grezzo su massimi e minimi; EMA seme = primo valore; calcolo dal 1985-01. CMO_K4_somme: stocastico come rapporto di somme a 3 (MetaStock).',
    Coppock: 'WMA10(ROC14 + ROC11), ROC in %', KST: 'Pring lungo termine: 1·SMA6(ROC9)+2·SMA6(ROC12)+3·SMA6(ROC18)+4·SMA9(ROC24), ROC in %; KSTsig = SMA9(KST)',
    MACD: 'EMA12 − EMA26 delle chiusure (punti), EMA seme = prima chiusura (1985-01), primi 25 mesi scartati; MACDsig = EMA9(MACD)', PPO: 'MACD / EMA26 × 100 (variante aggiunta)',
  },
  mesi: bars.map((b, t) => ({
    mese: b.m, ultimaSeduta: b.last, sedute: b.n, massimo: b.high, minimo: b.low, chiusura: b.close,
    CMO: r2(O.CMO4.cmo[t], 6), CMO_K3: r2(O.CMO3.cmo[t], 6), CMO_K5: r2(O.CMO5.cmo[t], 6), CMO_K4_somme: r2(O.CMO4s.cmo[t], 6),
    key: r2(O.CMO4.key[t], 6), xtl: r2(O.CMO4.xtl[t], 6),
    Coppock: r2(COP[t], 6), KST: r2(K.kst[t], 6), KSTsig: r2(K.sig[t], 6), MACD: r2(MA.macd[t], 6), MACDsig: r2(MA.sig[t], 6), PPO: r2(PP.macd[t], 6), PPOsig: r2(PP.sig[t], 6),
  })),
};
fs.writeFileSync(OUT_VAL, JSON.stringify(valori, null, 0).replace(/\},\{/g, '},\n{'));
// confronto con il ricalcolo indipendente in Python (ricerca/oscillatori/ricalcolo/oscillatori_py.json), se c'è
const PYF = path.join(ROOT, 'ricerca/oscillatori/ricalcolo/oscillatori_py.json');
const PYCHECK = {};
if (fs.existsSync(PYF)) {
  const py = new Map(JSON.parse(fs.readFileSync(PYF, 'utf8')).map((r) => [r.mese, r]));
  const pairs = [['CMO', 'cmo'], ['Coppock', 'coppock'], ['KST', 'kst'], ['KSTsig', 'kst_sig'], ['MACD', 'macd'], ['MACDsig', 'macd_sig']];
  const rows = valori.mesi.filter((r) => r.mese >= '1990-01');
  for (const [a, b] of pairs) {
    let n = 0, mx = 0, dir = 0;
    rows.forEach((r, i) => { const q = py.get(r.mese); if (!q || r[a] == null || q[b] == null) return; n++; mx = Math.max(mx, Math.abs(r[a] - q[b])); if (i > 0) { const r0 = rows[i - 1], q0 = py.get(r0.mese); if (r0[a] != null && q0 && q0[b] != null && (r[a] < r0[a]) !== (q[b] < q0[b])) dir++; } });
    PYCHECK[a] = { mesi: n, scartoMassimo: r2(mx, 4), direzioneDiversa: dir };
  }
  console.log('Ricalcolo indipendente in Python (ricalcolo/oscillatori_py.json, 4 decimali), mesi dal 1990: ' + Object.entries(PYCHECK).map(([k, v]) => `${k} ${v.mesi} mesi, scarto massimo ${v.scartoMassimo}, direzione diversa ${v.direzioneDiversa}`).join('; '));
} else console.log('Ricalcolo indipendente in Python non trovato: confronto saltato');

// =====================================================================================================================
// 3. Esiti mese per mese (chiusure giornaliere di data/vix.json)
// =====================================================================================================================
const dayIdxByMonth = new Map(); // mese → [primo, ultimo] indice di seduta in SPX
SPX.dates.forEach((d, i) => { const k = d.slice(0, 7); const r = dayIdxByMonth.get(k); if (!r) dayIdxByMonth.set(k, [i, i]); else r[1] = i; });
const vixByDate = new Map(VIX.dates.map((d, i) => [d, VIX.val[i]]));
const lastClosedIdx = idx.get(lastClosed);
function outcome(t) {
  const m = bars[t].m, r0 = dayIdxByMonth.get(m); if (!r0) return null;
  const e = SPX.val[r0[1]], o = { mese: m, entrata: e };
  for (const h of [6, 12, 18]) {
    const full = t + h <= lastClosedIdx;
    const last = t + h <= lastClosedIdx ? dayIdxByMonth.get(bars[t + h].m)[1] : SPX.dates.length - 1;
    let mn = Infinity, mi = -1;
    for (let i = r0[1] + 1; i <= last; i++) if (SPX.val[i] < mn) { mn = SPX.val[i]; mi = i; }
    o['dd' + h] = mi < 0 ? null : mn / e - 1; o['dd' + h + 'full'] = full;
    if (h === 12) {
      o.minData = mi < 0 ? null : SPX.dates[mi];
      o.mesiAlMinimo = mi < 0 ? null : (Number(SPX.dates[mi].slice(0, 4)) - Number(m.slice(0, 4))) * 12 + Number(SPX.dates[mi].slice(5, 7)) - Number(m.slice(5, 7));
      let vx = null, vd = null;
      for (let i = r0[1] + 1; i <= last; i++) { const v = vixByDate.get(SPX.dates[i]); if (v != null && (vx == null || v > vx)) { vx = v; vd = SPX.dates[i]; } }
      o.vixMax12 = vx; o.vixData = vd;
    }
  }
  for (const h of [3, 6, 12]) o['ret' + h] = t + h <= lastClosedIdx ? SPX.val[dayIdxByMonth.get(bars[t + h].m)[1]] / e - 1 : null;
  return o;
}
const OUTC = bars.map((_, t) => (bars[t].m >= '1990-01' ? outcome(t) : null));

// =====================================================================================================================
// 4. Eventi (cali ≥10% e ≥20%)
// =====================================================================================================================
function findEvents(X) {
  const out = [], P = SPX.val, D = SPX.dates;
  (function scan(i0, i1, depth) {
    let pk = i0, i = i0 + 1;
    while (i < i1) {
      if (P[i] > P[pk]) { pk = i; i++; continue; }
      if (P[i] <= P[pk] * (1 - X)) {
        let r = i; while (r < i1 && !(P[r] > P[pk])) r++;
        let tr = pk; for (let j = pk; j < r; j++) if (P[j] < P[tr]) tr = j;
        const ongoing = r >= D.length;
        out.push({ massimo: D[pk], pMassimo: P[pk], minimo: D[tr], pMinimo: P[tr], calo: P[tr] / P[pk] - 1, ritorno: ongoing ? null : D[r], inCorso: ongoing, annidato: depth > 0 });
        scan(tr, r, depth + 1);
        pk = r; i = r + 1; continue;
      }
      i++;
    }
  })(0, P.length, 0);
  return out.filter((e) => e.massimo >= '1993-01-01').sort((a, b) => (a.massimo < b.massimo ? -1 : 1));
}
const EV10 = findEvents(0.10), EV20 = findEvents(0.20);
console.log(`\n== Eventi dal 1993 (chiusure giornaliere dell'S&P 500, data/vix.json)`);
for (const [lab, E] of [['≥10%', EV10], ['≥20%', EV20]]) {
  console.log(`Cali ${lab}: ${E.length}`);
  for (const e of E) console.log(`  massimo ${e.massimo} (${f1(e.pMassimo, 2)}) → minimo ${e.minimo} (${f1(e.pMinimo, 2)}) ${pc(e.calo)}; ritorno sopra il massimo ${e.ritorno ?? 'non ancora'}${e.annidato ? ' [dopo il minimo di un calo più lungo]' : ''}`);
}
// calo dal massimo all'ultima seduta (per dire se il 2026 ha un calo in corso)
{
  let pk = 0; SPX.val.forEach((v, i) => { if (v > SPX.val[pk]) pk = i; });
  let mn = pk; for (let i = pk; i < SPX.val.length; i++) if (SPX.val[i] < SPX.val[mn]) mn = i;
  console.log(`Massimo storico di chiusura ${SPX.dates[pk]} (${SPX.val[pk]}); calo massimo dopo: ${pc(SPX.val[mn] / SPX.val[pk] - 1)} al ${SPX.dates[mn]}; ultima seduta ${lastData} (${SPX.val.at(-1)})`);
  // calo massimo del 2026 dal massimo precedente
  let best = { dd: 0 }, peak = null;
  SPX.dates.forEach((d, i) => { if (d < '2025-12-31') { if (!peak || SPX.val[i] > peak.v) peak = { d, v: SPX.val[i] }; return; } if (SPX.val[i] > peak.v) peak = { d, v: SPX.val[i] }; const dd = SPX.val[i] / peak.v - 1; if (dd < best.dd) best = { dd, d, pk: peak.d }; });
  console.log(`Calo massimo nelle sedute del 2026 dal massimo precedente: ${pc(best.dd)} (massimo ${best.pk}, minimo ${best.d})`);
}

// =====================================================================================================================
// 5. Varianti e segnali
// =====================================================================================================================
const PCT = {};
const pctCache = (name, x, q) => (PCT[name + q] ||= expandingPct(x, q, 60));
const SECOND = {
  Coppock: { v: COP, sig: null }, KST: { v: K.kst, sig: K.sig }, MACD: { v: MA.macd, sig: MA.sig }, PPO: { v: PP.macd, sig: PP.sig },
};
const ZONES = { p60: 0.6, p70: 0.7, p80: 0.8, gt0: 0 };
const CMOS = { K3: O.CMO3.cmo, K4: O.CMO4.cmo, K5: O.CMO5.cmo, K4somme: O.CMO4s.cmo, K4da1990: O.CMO4from90.cmo };

function series(v) {
  const cmoK = CMOS[v.k], X = SECOND[v.osc];
  const thr = v.zone === 'gt0' ? null : pctCache(v.osc, X.v, ZONES[v.zone]);
  const cmoDown = (t) => t > 0 && cmoK[t] != null && cmoK[t - 1] != null && cmoK[t] < cmoK[t - 1];
  const xDown = v.mode === 'sig'
    ? (t) => X.v[t] != null && X.sig[t] != null && X.v[t] < X.sig[t]
    : (t) => t > 0 && X.v[t] != null && X.v[t - 1] != null && X.v[t] < X.v[t - 1];
  const cmoHigh = (t) => cmoK[t] != null && cmoK[t] > v.cmoThr;
  const xHigh = v.zone === 'gt0' ? (t) => X.v[t] != null && X.v[t] > 0 : (t) => thr[t] != null && X.v[t] > thr[t];
  const valid = (t) => cmoK[t] != null && cmoK[t - 1] != null && X.v[t] != null && X.v[t - 1] != null && (v.mode !== 'sig' || X.sig[t] != null) && (v.zone === 'gt0' || thr[t - 2] != null);
  return { cmoDown, xDown, cmoHigh, xHigh, valid, bothDown: (t) => cmoDown(t) && xDown(t) };
}
// inizio comune della valutazione: primo mese in cui TUTTE le varianti sono valide (stessa finestra per tutte)
const ALLV = [];
for (const k of ['K3', 'K4', 'K5']) for (const cmoThr of [0, 50]) for (const osc of ['Coppock', 'KST', 'MACD', 'PPO']) for (const mode of (osc === 'Coppock' ? ['slope'] : ['slope', 'sig'])) for (const zone of ['p60', 'p70', 'p80', ...(osc === 'KST' ? [] : ['gt0'])]) ALLV.push({ k, cmoThr, osc, mode, zone, extra: osc === 'PPO' });
for (const k of ['K4somme', 'K4da1990']) for (const osc of ['Coppock', 'KST', 'MACD']) ALLV.push({ k, cmoThr: 0, osc, mode: 'slope', zone: 'p70', extra: true, sens: true });
let S = 0;
for (const v of ALLV) { const s = series(v); let t = 2; while (t < N && !s.valid(t)) t++; S = Math.max(S, t); }
S = Math.max(S, idx.get('1990-01'));
const START = bars[S].m;
console.log(`\n== Valutazione dal ${START} (primo mese valido per tutte le varianti) al ${lastClosed}; esiti a 12 mesi completi fino al ${bars[lastClosedIdx - 12].m}`);

const PERIODS = { intero: [START, lastClosed], campione: [START, '2009-12'], verifica: ['2010-01', lastClosed] };
const inP = (m, p) => m >= PERIODS[p][0] && m <= PERIODS[p][1];
const monthDiff = (a, b) => (Number(a.slice(0, 4)) - Number(b.slice(0, 4))) * 12 + Number(a.slice(5, 7)) - Number(b.slice(5, 7));

function runVariant(v) {
  const s = series(v), sig = [], alarm = new Array(N).fill(false);
  for (let t = S; t < N; t++) {
    if (!s.bothDown(t) || s.bothDown(t - 1)) continue;
    const zc = [t - 2, t - 1, t].some(s.cmoHigh), zx = [t - 2, t - 1, t].some(s.xHigh);
    if (!(zc && zx)) continue;
    let e = t; while (e < N && s.bothDown(e)) { alarm[e] = true; e++; }
    sig.push({ t, mese: bars[t].m, durataAllarme: e - t, fineAllarme: e < N ? bars[e].m : null });
  }
  return { sig, alarm };
}
const nameOf = (v) => `CMO ${v.k}${v.cmoThr ? '>50' : '>0'} + ${v.osc} ${v.mode === 'sig' ? 'sotto segnale' : 'in discesa'} ${v.zone === 'gt0' ? '>0' : v.zone}`;

function evalVariant(v, run) {
  const res = { nome: nameOf(v), ...v, periodi: {} };
  for (const p of Object.keys(PERIODS)) {
    const months = []; for (let t = S; t < N; t++) if (inP(bars[t].m, p)) months.push(t);
    const sigs = run.sig.filter((x) => inP(x.mese, p));
    const sig12 = sigs.filter((x) => OUTC[x.t].dd12full), base12 = months.filter((t) => OUTC[t].dd12full);
    const hit = (t, th) => OUTC[t].dd12 <= -th;
    const qs = sig12.length ? sig12.filter((x) => hit(x.t, 0.1)).length / sig12.length : null;
    const qb = base12.filter((t) => hit(t, 0.1)).length / base12.length;
    const alarmN = months.filter((t) => run.alarm[t]).length;
    const ev = (E) => E.filter((e) => inP(e.massimo.slice(0, 7), p)).map((e) => {
      const pm = e.massimo.slice(0, 7), w = run.sig.filter((x) => { const d = monthDiff(pm, x.mese); return d <= 12 && d >= -1; });
      return { massimo: e.massimo, calo: e.calo, avvisato: w.length > 0, segnali: w.map((x) => x.mese), anticipoMesi: w.length ? monthDiff(pm, w[0].mese) : null, anticipoUltimo: w.length ? monthDiff(pm, w.at(-1).mese) : null };
    });
    const e10 = ev(EV10), e20 = ev(EV20);
    const nb = e20.length, need = p === 'intero' ? 3 : Math.ceil(0.75 * nb);
    const okA = qs != null && qs - qb >= 0.15, okB = e20.filter((x) => x.avvisato).length >= need && nb > 0, okC = alarmN / months.length <= 0.35;
    res.periodi[p] = {
      mesi: months.length, segnali: sigs.length, segnaliCon12: sig12.length, segnaliCalo10: sig12.filter((x) => hit(x.t, 0.1)).length, segnaliCalo20: sig12.filter((x) => hit(x.t, 0.2)).length,
      quotaSegnali10: qs, mesiBase12: base12.length, baseCalo10: base12.filter((t) => hit(t, 0.1)).length, quotaBase10: qb,
      quotaBase20: base12.filter((t) => hit(t, 0.2)).length / base12.length, scartoA: qs == null ? null : qs - qb,
      mesiAllarme: alarmN, quotaAllarme: alarmN / months.length,
      falsiAllarmi: sig12.filter((x) => !hit(x.t, 0.1)).map((x) => x.mese),
      eventi10: e10.length, eventi10Avvisati: e10.filter((x) => x.avvisato).length, eventi20: nb, eventi20Avvisati: e20.filter((x) => x.avvisato).length, bServono: need,
      anticipoMediano10: median(e10.filter((x) => x.avvisato).map((x) => x.anticipoUltimo)),
      persi10: e10.filter((x) => !x.avvisato).map((x) => x.massimo), persi20: e20.filter((x) => !x.avvisato).map((x) => x.massimo),
      a: okA, b: okB, c: okC,
    };
  }
  return res;
}
const RESULTS = ALLV.map((v) => { const run = runVariant(v); return { v, run, r: evalVariant(v, run) }; });
const find = (q) => RESULTS.find((x) => Object.entries(q).every(([k, val]) => x.v[k] === val));

// (d): verifica 2010-2026 e vicini
for (const x of RESULTS) {
  const v = x.v; if (v.sens) continue;
  const nb = [];
  if (v.k === 'K4') { nb.push({ ...v, k: 'K3' }, { ...v, k: 'K5' }); } else nb.push({ ...v, k: 'K4' });
  const zs = ['p60', 'p70', 'p80'], zi = zs.indexOf(v.zone);
  if (zi >= 0) { if (zi > 0) nb.push({ ...v, zone: zs[zi - 1] }); if (zi < 2) nb.push({ ...v, zone: zs[zi + 1] }); }
  const nbr = nb.map((q) => find({ k: q.k, cmoThr: q.cmoThr, osc: q.osc, mode: q.mode, zone: q.zone, extra: q.extra }));
  const pass = nbr.filter((y) => y && y.r.periodi.intero.a && y.r.periodi.intero.b && y.r.periodi.intero.c);
  const ver = x.r.periodi.verifica;
  x.r.vicini = nbr.map((y) => y.r.nome); x.r.viciniOk = pass.length; x.r.viciniServono = Math.ceil(0.75 * nbr.length);
  x.r.d = ver.a && ver.b && ver.c && pass.length >= x.r.viciniServono;
  x.r.abc = x.r.periodi.intero.a && x.r.periodi.intero.b && x.r.periodi.intero.c;
}

// regola di confronto: solo CMO, inizio di DOWN (sopra zero e in discesa)
function cmoDownStarts(arr) {
  const isDown = (t) => arr[t] != null && arr[t - 1] != null && arr[t] > 0 && arr[t] < arr[t - 1];
  const out = []; const alarm = new Array(N).fill(false);
  for (let t = S; t < N; t++) if (isDown(t) && !isDown(t - 1)) { let e = t; while (e < N && isDown(e)) { alarm[e] = true; e++; } out.push({ t, mese: bars[t].m, durataAllarme: e - t }); }
  return { sig: out, alarm };
}
const CMO_ONLY = cmoDownStarts(O.CMO4.cmo);
const cmoOnlyR = evalVariant({ k: 'K4', cmoThr: 0, osc: '—', mode: 'DOWN', zone: '—' }, CMO_ONLY); cmoOnlyR.nome = 'Solo CMO K4: inizio di DOWN (CMO>0 e in discesa)';

// =====================================================================================================================
// 6. Tabelle a schermo
// =====================================================================================================================
const row = (r, p) => { const x = r.periodi[p]; return `${r.nome.padEnd(46)} | ${String(x.segnali).padStart(3)} | ${(x.segnaliCalo10 + '/' + x.segnaliCon12).padStart(6)} ${pc(x.quotaSegnali10).padStart(6)} | base ${pc(x.quotaBase10).padStart(6)} | ${(x.scartoA == null ? '—' : (100 * x.scartoA).toFixed(1)).padStart(6)} | ${(x.eventi20Avvisati + '/' + x.eventi20).padStart(4)} | ${(x.eventi10Avvisati + '/' + x.eventi10).padStart(5)} | ${pc(x.quotaAllarme).padStart(6)} | ${x.a ? 'a' : '-'}${x.b ? 'b' : '-'}${x.c ? 'c' : '-'}`; };
const head = `${'Variante'.padEnd(46)} | seg | calo≥10%/12m      |              | scarto | bear | corr. | allarme | criteri`;
const MAIN = ['Coppock', 'KST', 'MACD'].map((osc) => find({ k: 'K4', cmoThr: 0, osc, mode: 'slope', zone: 'p70', extra: false }));
for (const p of ['intero', 'campione', 'verifica']) {
  console.log(`\n== Varianti principali (CMO K4 >0, secondo oscillatore in discesa, zona alta p70) — periodo ${p} ${PERIODS[p].join('…')}`);
  console.log(head);
  for (const x of MAIN) console.log(row(x.r, p));
  console.log(row(cmoOnlyR, p));
}
console.log('\n== Tutte le varianti, periodo intero (ordinate per scarto (a)); [d] = supera anche (d)');
console.log(head);
const sorted = RESULTS.filter((x) => !x.v.sens).sort((a, b) => (b.r.periodi.intero.scartoA ?? -9) - (a.r.periodi.intero.scartoA ?? -9));
for (const x of sorted) console.log(row(x.r, 'intero') + (x.r.d ? ' [d]' : '') + (x.v.extra ? ' (PPO, aggiunta)' : ''));
console.log('\n== Sensibilità: stocastico «somme» e partenza dal 1990 (CMO K4 >0, p70, in discesa)');
for (const x of RESULTS.filter((y) => y.v.sens)) for (const p of ['intero']) console.log(row(x.r, p));

// scelta nel campione
const cand = RESULTS.filter((x) => !x.v.extra && !x.v.sens && x.r.periodi.campione.a && x.r.periodi.campione.b && x.r.periodi.campione.c)
  .sort((a, b) => (b.r.periodi.campione.scartoA - a.r.periodi.campione.scartoA) || (a.r.periodi.campione.quotaAllarme - b.r.periodi.campione.quotaAllarme));
console.log(`\n== Scelta nel campione ${PERIODS.campione.join('…')}: varianti (del brief, senza PPO) che superano a, b, c: ${cand.length} su ${RESULTS.filter((x) => !x.v.extra && !x.v.sens).length}`);
for (const x of cand.slice(0, 10)) console.log(`  ${row(x.r, 'campione')}`);
const chosen = cand[0] || null;
if (chosen) {
  console.log(`Scelta: ${chosen.r.nome}. Verifica 2010-${lastClosed.slice(0, 4)}:`);
  console.log('  ' + row(chosen.r, 'verifica'));
  console.log(`  vicini: ${chosen.r.vicini.join('; ')}; superano a-c sul periodo intero ${chosen.r.viciniOk} (servono ${chosen.r.viciniServono}); (d) ${chosen.r.d ? 'sì' : 'no'}`);
}
const allPass = RESULTS.filter((x) => !x.v.sens && x.r.abc && x.r.d);
console.log(`\nVarianti che superano a, b, c sul periodo intero E (d): ${allPass.length}${allPass.length ? ': ' + allPass.map((x) => x.r.nome + (x.v.extra ? ' (PPO)' : '')).join('; ') : ''}`);
const abcOnly = RESULTS.filter((x) => !x.v.sens && x.r.abc);
console.log(`Varianti che superano a, b, c sul periodo intero (senza d): ${abcOnly.length}${abcOnly.length ? ': ' + abcOnly.map((x) => x.r.nome).join('; ') : ''}`);

// esiti dei segnali delle varianti principali e base
function stats(ts) {
  const o = ts.map((t) => OUTC[t]);
  const g = (k, full) => o.filter((x) => (full ? x[full] : true) && x[k] != null).map((x) => x[k]);
  const q = (a) => ({ n: a.length, mediana: r2(median(a), 4), p25: r2(quantile(a, 0.25), 4) });
  return {
    dd6: q(g('dd6', 'dd6full')), dd12: q(g('dd12', 'dd12full')), dd18: q(g('dd18', 'dd18full')),
    ret3: { ...q(g('ret3')), positivi: g('ret3').filter((x) => x > 0).length }, ret6: { ...q(g('ret6')), positivi: g('ret6').filter((x) => x > 0).length }, ret12: { ...q(g('ret12')), positivi: g('ret12').filter((x) => x > 0).length },
    vixMax12: q(g('vixMax12', 'dd12full')), mesiAlMinimo12: q(g('mesiAlMinimo', 'dd12full')),
  };
}
const allMonths = []; for (let t = S; t < N; t++) allMonths.push(t);
const BASE = stats(allMonths);
console.log('\n== Esiti: mediane (calo massimo, rendimenti, VIX massimo, mesi al minimo) — periodo intero');
const pr = (lab, s) => console.log(`${lab.padEnd(28)} calo 6m ${pc(s.dd6.mediana)} (n ${s.dd6.n}) | 12m ${pc(s.dd12.mediana)} | 18m ${pc(s.dd18.mediana)} | rend 3m ${pc(s.ret3.mediana)} (${s.ret3.positivi}/${s.ret3.n} >0) | 6m ${pc(s.ret6.mediana)} (${s.ret6.positivi}/${s.ret6.n}) | 12m ${pc(s.ret12.mediana)} (${s.ret12.positivi}/${s.ret12.n}) | VIX max 12m ${f1(s.vixMax12.mediana)} | mesi al minimo ${f1(s.mesiAlMinimo12.mediana)}`);
pr('Tutti i mesi (base)', BASE);
for (const x of MAIN) pr(x.v.osc, stats(x.run.sig.map((s) => s.t)));
pr('Solo CMO DOWN', stats(CMO_ONLY.sig.map((s) => s.t)));
if (chosen && !MAIN.includes(chosen)) pr('Scelta nel campione', stats(chosen.run.sig.map((s) => s.t)));

// elenco segnali delle varianti principali
const sigTable = (run) => run.sig.map((s) => { const o = OUTC[s.t]; return { mese: s.mese, chiusura: bars[s.t].close, CMO: r2(O.CMO4.cmo[s.t], 1), durataAllarmeMesi: s.durataAllarme, calo6: r2(o.dd6, 4), calo12: r2(o.dd12, 4), calo18: r2(o.dd18, 4), completo12: o.dd12full, ret3: r2(o.ret3, 4), ret6: r2(o.ret6, 4), ret12: r2(o.ret12, 4), vixMax12: o.vixMax12, vixData: o.vixData, minimo12: o.minData, mesiAlMinimo: o.mesiAlMinimo }; });
for (const x of [...MAIN, ...(chosen && !MAIN.includes(chosen) ? [chosen] : [])]) {
  console.log(`\n== Segnali: ${x.r.nome}`);
  for (const s of sigTable(x.run)) console.log(`  ${s.mese} chiusura ${f1(s.chiusura, 2)} CMO ${f1(s.CMO)} allarme ${s.durataAllarmeMesi}m | calo 6/12/18m ${pc(s.calo6)} ${pc(s.calo12)}${s.completo12 ? '' : '*'} ${pc(s.calo18)} | rend 3/6/12m ${pc(s.ret3)} ${pc(s.ret6)} ${pc(s.ret12)} | VIX max ${f1(s.vixMax12, 2)} (${s.vixData}) | minimo ${s.minimo12} dopo ${s.mesiAlMinimo}m`);
}

// eventi: avvisati o no, per le varianti principali
console.log('\n== Eventi e segnali nelle varianti principali (finestra: da 12 mesi prima del mese del massimo a 1 mese dopo; anticipo in mesi dall\'ultimo segnale della finestra)');
const evRows = (E) => E.map((e) => {
  const pm = e.massimo.slice(0, 7), o = { massimo: e.massimo, minimo: e.minimo, calo: r2(e.calo, 4), annidato: e.annidato, inCorso: e.inCorso };
  for (const x of [...MAIN, { r: { nome: 'soloCMO' }, run: CMO_ONLY, v: { osc: 'soloCMO' } }]) {
    const w = x.run.sig.filter((s) => { const d = monthDiff(pm, s.mese); return d <= 12 && d >= -1; });
    o[x.v.osc] = w.length ? { segnali: w.map((s) => s.mese), anticipoUltimo: monthDiff(pm, w.at(-1).mese), anticipoPrimo: monthDiff(pm, w[0].mese) } : null;
  }
  return o;
});
const E10 = evRows(EV10), E20 = evRows(EV20);
for (const [lab, E] of [['≥10%', E10], ['≥20%', E20]]) {
  console.log(`Cali ${lab}`);
  for (const e of E) console.log(`  ${e.massimo} ${pc(e.calo)} | ` + ['Coppock', 'KST', 'MACD', 'soloCMO'].map((k) => `${k}: ${e[k] ? e[k].segnali.join(',') + ` (anticipo ${e[k].anticipoUltimo}m)` : 'perso'}`).join(' | '));
}

// dettaglio: quanto del calo era già avvenuto all'ultimo segnale della finestra e quanto ne restava
console.log('\n== Ultimo segnale nella finestra di ogni evento: se prima del massimo, quanto l\'indice è ancora salito («poi su»); se dopo, il calo già avvenuto («già»); calo residuo dalla chiusura del segnale al minimo dell\'evento');
const closeAt = (m) => SPX.val[dayIdxByMonth.get(m)[1]];
for (const [lab, E, EV] of [['≥10%', E10, EV10], ['≥20%', E20, EV20]]) {
  for (let i = 0; i < E.length; i++) {
    const e = E[i], ev = EV[i];
    for (const k of ['Coppock', 'KST', 'MACD', 'soloCMO']) {
      if (!e[k]) continue;
      const m = e[k].segnali.at(-1), c = closeAt(m), sd = SPX.dates[dayIdxByMonth.get(m)[1]];
      // segnale prima del massimo: quanto è ancora salito l'indice fino al massimo; dopo: quanto era già sceso
      e[k].salitaFinoAlMassimo = sd < ev.massimo ? r2(ev.pMassimo / c - 1, 4) : null;
      e[k].giaFatto = sd >= ev.massimo ? r2(c / ev.pMassimo - 1, 4) : null;
      e[k].residuo = r2(Math.min(0, ev.pMinimo / c - 1), 4);
    }
    console.log(`  ${lab} ${e.massimo} ${pc(e.calo)}: ` + ['Coppock', 'KST', 'MACD', 'soloCMO'].map((k) => `${k} ${e[k] ? `${e[k].segnali.at(-1)} ${e[k].giaFatto != null ? 'già ' + pc(e[k].giaFatto) : 'poi su ' + pc(e[k].salitaFinoAlMassimo)}, residuo ${pc(e[k].residuo)}` : 'perso'}`).join(' | '));
  }
}

// base casuale: stesso numero di segnali messi a caso nei mesi valutati (generatore con seme fisso)
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const evMonths = (E) => E.map((e) => idx.get(e.massimo.slice(0, 7)));
const PM10 = evMonths(EV10), PM20 = evMonths(EV20);
function caught(sigIdx, PM) { let n = 0; for (const p of PM) if (sigIdx.some((t) => p - t <= 12 && p - t >= -1)) n++; return n; }
function randomBase(nSig, obs10, obs20, draws = 20000) {
  const rnd = mulberry32(20261112), pool = []; for (let t = S; t < N; t++) pool.push(t);
  let s10 = 0, s20 = 0, ge10 = 0, ge20 = 0;
  for (let d = 0; d < draws; d++) {
    const a = pool.slice(); for (let i = 0; i < nSig; i++) { const j = i + Math.floor(rnd() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; }
    const pick = a.slice(0, nSig), c10 = caught(pick, PM10), c20 = caught(pick, PM20);
    s10 += c10; s20 += c20; if (c10 >= obs10) ge10++; if (c20 >= obs20) ge20++;
  }
  return { estrazioni: draws, mediaCorrezioni: r2(s10 / draws, 2), pCorrezioni: r2(ge10 / draws, 4), mediaBear: r2(s20 / draws, 2), pBear: r2(ge20 / draws, 4) };
}
console.log(`\n== Base casuale: stesso numero di segnali in mesi a caso tra ${START} e ${lastClosed} (20.000 estrazioni, seme fisso): eventi avvisati attesi e probabilità di farne almeno quanti la regola`);
const RB = {};
for (const x of [...MAIN, ...(chosen && !MAIN.includes(chosen) ? [chosen] : []), { r: cmoOnlyR, run: CMO_ONLY }]) {
  const ts = x.run.sig.map((s) => s.t), o10 = caught(ts, PM10), o20 = caught(ts, PM20), rb = randomBase(ts.length, o10, o20);
  RB[x.r.nome] = { segnali: ts.length, correzioniAvvisate: o10, bearAvvisati: o20, ...rb };
  console.log(`  ${x.r.nome}: ${ts.length} segnali; correzioni avvisate ${o10}/${PM10.length} (a caso in media ${rb.mediaCorrezioni}, P(≥${o10}) ${rb.pCorrezioni}); bear ${o20}/${PM20.length} (a caso ${rb.mediaBear}, P(≥${o20}) ${rb.pBear})`);
}

// frequenza della «zona alta» del secondo oscillatore (p70): se l'oscillatore è stabile nel tempo dovrebbe stare vicino al 30%
console.log('\n== Quota di mesi in zona alta (sopra il percentile 70 a finestra crescente), per decennio');
const ZF = {};
for (const osc of ['Coppock', 'KST', 'MACD', 'PPO']) {
  const thr = pctCache(osc, SECOND[osc].v, 0.7), by = {};
  for (let t = S; t < N; t++) { const dec = bars[t].m.slice(0, 3) + '0s'; by[dec] ||= [0, 0]; by[dec][1]++; if (thr[t] != null && SECOND[osc].v[t] > thr[t]) by[dec][0]++; }
  ZF[osc] = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { sopra: v[0], mesi: v[1] }]));
  console.log(`  ${osc.padEnd(8)} ` + Object.entries(by).map(([k, v]) => `${k} ${v[0]}/${v[1]} (${pc(v[0] / v[1])})`).join(' | '));
}
for (const x of MAIN) console.log(`Falsi allarmi (nessun calo ≥10% nei 12 mesi dopo), ${x.r.nome}: ${x.r.periodi.intero.falsiAllarmi.join(', ')}`);
if (chosen && !MAIN.includes(chosen)) console.log(`Falsi allarmi, ${chosen.r.nome}: ${chosen.r.periodi.intero.falsiAllarmi.join(', ')}`);

// confronto con le date di Caruso
const CARUSO = ['1998-05', '1999-11', '2007-11', '2015-01', '2018-09', '2020-01', '2022-01', '2026-07'];
console.log('\n== Date di Caruso (CMO + C-Wave, dal video) contro i nostri segnali (distanza in mesi: nostro − suo)');
const near = (list, m, w) => list.filter((s) => Math.abs(monthDiff(s.mese, m)) <= w).map((s) => `${s.mese} (${monthDiff(s.mese, m) >= 0 ? '+' : ''}${monthDiff(s.mese, m)})`);
const CAR = CARUSO.map((m) => {
  const o = { mese: m, CMO: r2(O.CMO4.cmo[idx.get(m)], 1), CMOprec: r2(O.CMO4.cmo[idx.get(m) - 1], 1), soloCMO_DOWN_entro3: near(CMO_ONLY.sig, m, 3) };
  for (const x of MAIN) o[x.v.osc + '_entro3'] = near(x.run.sig, m, 3);
  if (chosen) o.scelta_entro3 = near(chosen.run.sig, m, 3);
  return o;
});
for (const c of CAR) console.log(`  ${c.mese}: CMO ${f1(c.CMO)} (mese prima ${f1(c.CMOprec)}) | inizio DOWN del solo CMO ±3m: ${c.soloCMO_DOWN_entro3.join(', ') || 'nessuno'} | Coppock: ${c.Coppock_entro3.join(', ') || '—'} | KST: ${c.KST_entro3.join(', ') || '—'} | MACD: ${c.MACD_entro3.join(', ') || '—'}${chosen ? ` | scelta: ${c.scelta_entro3.join(', ') || '—'}` : ''}`);
console.log(`Inizi di DOWN del solo CMO K4 dal ${START}: ${CMO_ONLY.sig.length} (${CMO_ONLY.sig.map((s) => s.mese).join(', ')})`);

// per crisi
const CRISI = [['1998', ['1998']], ['2000-02', ['2000']], ['2007-09', ['2007']], ['2011', ['2011']], ['2015-16', ['2015']], ['2018', ['2018']], ['2020', ['2020']], ['2022', ['2022']], ['2025', ['2025']], ['2026', ['2026']]];
console.log('\n== Per crisi (eventi ≥10% con massimo in quell\'anno; varianti principali)');
const CR = CRISI.map(([lab, ys]) => {
  const ev = E10.filter((e) => ys.includes(e.massimo.slice(0, 4)));
  const o = { crisi: lab, eventi: ev };
  if (!ev.length) {
    o.nota = 'nessun calo ≥10% con massimo in quell\'anno';
    for (const x of MAIN) o['segnali_' + x.v.osc] = x.run.sig.filter((s) => ys.some((y) => s.mese.startsWith(y))).map((s) => s.mese);
    o.segnali_soloCMO = CMO_ONLY.sig.filter((s) => ys.some((y) => s.mese.startsWith(y))).map((s) => s.mese);
  }
  console.log(`  ${lab}: ${ev.length ? ev.map((e) => `${e.massimo} ${pc(e.calo)} → ` + ['Coppock', 'KST', 'MACD', 'soloCMO'].map((k) => `${k} ${e[k] ? e[k].segnali.join(',') : 'perso'}`).join('; ')).join(' || ') : o.nota + '; segnali nell\'anno: ' + ['Coppock', 'KST', 'MACD', 'soloCMO'].map((k) => `${k} ${(o['segnali_' + k] || []).join(',') || '—'}`).join('; ')}`);
  return o;
});

// =====================================================================================================================
// 7. JSON
// =====================================================================================================================
const out = {
  generato: 'node ricerca/oscillatori/backtest/backtest.mjs', dati: { barre: barSource, primoMese: bars[0].m, ultimoMeseChiuso: lastClosed, ultimaSedutaSPX: lastData, inizioValutazione: START, periodi: PERIODS },
  regola: 'Segnale nel mese chiuso t: CMO(t)<CMO(t−1) e secondo oscillatore in discesa (o sotto il segnale) in t; CMO in zona alta in almeno un mese tra t−2 e t e secondo oscillatore in zona alta in almeno un mese tra t−2 e t; in t−1 non erano già entrambi in discesa. Allarme: da t finché non sono più entrambi in discesa.',
  eventi10: E10, eventi20: E20,
  base: BASE,
  variantiPrincipali: MAIN.map((x) => ({ ...x.r, segnali: sigTable(x.run), esiti: stats(x.run.sig.map((s) => s.t)) })),
  soloCMO: { ...cmoOnlyR, segnali: sigTable(CMO_ONLY), esiti: stats(CMO_ONLY.sig.map((s) => s.t)) },
  sceltaNelCampione: chosen ? { ...chosen.r, segnali: sigTable(chosen.run), esiti: stats(chosen.run.sig.map((s) => s.t)) } : null,
  candidatiNelCampione: cand.map((x) => x.r.nome),
  superanoABCeD: allPass.map((x) => x.r.nome), superanoABC: abcOnly.map((x) => x.r.nome),
  tutteLeVarianti: RESULTS.map((x) => ({ ...x.r, segnali: x.run.sig.map((s) => s.mese) })),
  baseCasuale: RB, confrontoPython: PYCHECK, zonaAltaPerDecennio: ZF,
  caruso: CAR, inizioDownSoloCMO: CMO_ONLY.sig.map((s) => s.mese), perCrisi: CR,
};
fs.writeFileSync(OUT_RES, JSON.stringify(out, (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e6) / 1e6 : v), 1));
console.log(`\nScritti ${path.relative(ROOT, OUT_VAL)} e ${path.relative(ROOT, OUT_RES)}`);
