// Ricerca «credito: la soglia dei 350 punti base» (fase di verifica: l'app non si tocca).
// Idea: un analista (Francesco Caruso) indica per lo spread high yield una soglia di 350 pb come «segnale affidabile che
// qualcosa scricchiola». Qui si misura (1) se l'attraversamento della soglia sull'HY OAS ufficiale (ICE BofA, FRED
// BAMLH0A0HYM2, dal 31/12/1996; SOLO RICERCA, non ripubblicabile) anticipa i cali dell'S&P 500 e (2) se sul rapporto
// HYG/IEF dell'app (dal 2007) esiste una soglia che si comporta allo stesso modo.
//
// METODO (domande, regole e criterio decisi PRIMA di guardare i risultati; vedi ../backtest.md)
// - Dati. S&P 500 (^GSPC, solo prezzo), VIX e HYG/IEF da data/vix.json, con le funzioni dell'app (js/vix.js: vxSeries,
//   align, onDates, context → ddFromMax e expandingPct, quantile, crisisOf). HY OAS da cache/hy_oas.csv (script/scarica.mjs:
//   copie del CSV di FRED salvate su GitHub fino al 2023, FRED di oggi dopo). Tutto sulle sedute dell'S&P 500: un valore
//   che manca resta null. HY OAS in punti base (pb) = valore FRED × 100, arrotondato.
// - Segnale (regola esatta): prima seduta in cui la condizione è vera dopo almeno Q = 63 osservazioni valide tutte con la
//   condizione falsa (come gli episodi del VIX dell'app). «Supera la soglia» = ≥ (come gli episodi del VIX).
//   Famiglie: HY livello ≥ L (L = 300, 350, 400, 500); HY sale di ≥ X pb in N osservazioni (N = 21, 63; X = 50, 100,
//   150); HY sopra il minimo delle ultime 252 osservazioni di ≥ X pb (X = 100, 150, 200: aggiunta mia, è l'analogo del
//   «calo dal massimo» di HYG/IEF); HY percentile del livello sulla storia fino a quel giorno ≥ 80, 90 (almeno 252 valori);
//   HYG/IEF calo dal massimo di 252 sedute ≤ −X% (X = 3, 4, 5, 6, 8, 10), percentile del calo (quello dell'app) ≥ 80,
//   90, 95.
// - Esiti dalla chiusura della seduta DOPO il segnale (la serie si conosce a fine giornata): rendimenti a 21/63/126/252
//   sedute; calo massimo entro 63/126/252 sedute = minimo delle chiusure da e+1 a e+h rispetto all'ingresso (0 se non
//   scende); VIX massimo da e a e+126. Un esito con la finestra incompleta resta null.
// - Base: tutte le sedute dalla prima in cui il segnale è possibile (63 osservazioni valide prima) con lo stesso ingresso.
// - Eventi dell'S&P 500: zigzag sulle chiusure con soglia θ (10% o 20%): un massimo è confermato quando l'indice scende
//   di θ, un minimo quando risale di θ. Evento = massimo → minimo successivo (calo ≥ θ). Si contano gli eventi con il
//   massimo dalla prima seduta del periodo (1997 per HY, 2007 per HYG/IEF). L'ultimo, se l'indice non è ancora risalito
//   di θ, è «in corso».
//   Per ogni evento e regola: (i) segnale nuovo = primo segnale da 126 sedute prima del massimo fino al giorno prima del
//   minimo; anticipo = sedute dal massimo al segnale (negativo = prima); quota del calo già avvenuta all'ingresso =
//   (massimo − chiusura d'ingresso) / (massimo − minimo), 0 se l'ingresso è prima del massimo, limitata a [0, 1];
//   (ii) «già in allarme» = condizione vera nella seduta del massimo (descrittivo).
// - Criterio di successo (deciso prima):
//   (a) quota di segnali seguiti da un calo ulteriore ≥ 10% entro 126 sedute almeno 15 punti sopra la stessa quota
//       per tutte le sedute del periodo (solo segnali con la finestra completa);
//   (b) mediana, su tutti gli eventi ≥ 10% e su tutti quelli ≥ 20% del periodo, della quota del calo già avvenuta al
//       segnale nuovo < 50%; un evento senza segnale nuovo prima del minimo conta 100% (avviso mai arrivato in tempo);
//   (c) (a) e (b) valgono anche alle soglie vicine (350: 300 e 400; per HYG/IEF le soglie adiacenti nell'elenco) e (a)
//       vale (≥ +15 punti) in ciascun sottoperiodo con almeno 3 segnali (HY: 1997-2009 e 2010-oggi; HYG/IEF: 2008-2016 e
//       2017-oggi), contro la base dello stesso sottoperiodo.
//   Verdetto per la regola principale: «passa» solo se (a), (b) e (c). Meno di 8 segnali con la finestra completa:
//   «indicativo» (lo si dice, ma il verdetto si dà lo stesso: con criteri non soddisfatti è «non passa»).
// - Soglia di HYG/IEF «equivalente» ai 350 pb: scelta senza guardare gli esiti, come (1) mediana del calo di HYG/IEF
//   nelle sedute degli attraversamenti dei 350 pb dal 2008 e (2) la soglia con la stessa quota di sedute in allarme dei
//   350 pb nel periodo comune; si prende la soglia dell'elenco più vicina alla (1).
// - Domanda secondaria (solo descrittiva): «rientro» = prima seduta con la condizione falsa dopo almeno 21 osservazioni
//   consecutive con la condizione vera, dentro un episodio iniziato da un segnale; esiti come sopra e «minimo già fatto»
//   (il minimo nelle 252 sedute dopo l'ingresso non scende sotto il minimo dal segnale al rientro).
// - Licenza ICE: nei risultati non si scrivono livelli dell'HY OAS (solo date, variazioni, correlazioni, esiti).
//
// Uso: node ricerca/credito-soglia/script/scarica.mjs     (una volta: dati in cache/)
//      node ricerca/credito-soglia/script/backtest.mjs    → ../risultati.json (+ riassunto a schermo)
//      python3 -I ricerca/credito-soglia/script/verifica.py  (ricalcolo indipendente)
import fs from 'node:fs';

const HERE = new URL('../', import.meta.url).pathname;
const W = new URL('../../../', import.meta.url).pathname;
const V = await import(W + 'js/vix.js');
const D = JSON.parse(fs.readFileSync(W + 'data/vix.json'));

const Q = 63, H_RET = [21, 63, 126, 252], H_DD = [63, 126, 252], H_VIX = 126, PRE = 126, REENTRY_K = 21;
const r1 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 1000) / 1000);
const med = (a) => r2(V.quantile(a.filter((x) => x != null), 0.5));

// ---------- dati ----------
const A = V.align(V.vxSeries(D.series.SPX), V.vxSeries(D.series.VIX));
const N = A.dates.length, close = A.close, dates = A.dates;
const ctx = V.context(A, V.vxSeries(D.series.VIX3M), V.vxSeries(D.series.HYGIEF));
const hyRaw = (() => {
  const ds = [], vs = [];
  for (const l of fs.readFileSync(HERE + 'cache/hy_oas.csv', 'utf8').trim().split('\n').slice(1)) {
    const [d, v] = l.split(',');
    if (v !== '' && v != null) { ds.push(d); vs.push(Math.round(Number(v) * 100)); }
  }
  return { dates: ds, val: vs };
})();
const HY = V.onDates(dates, hyRaw);

// ---------- condizioni ----------
const validPos = (a) => a.reduce((p, x, i) => (x != null && p.push(i), p), []);
function changeObs(a, n) { // a[i] − a[n osservazioni valide prima]
  const out = new Array(a.length).fill(null), pos = [];
  a.forEach((x, i) => { if (x == null) return; pos.push(i); const k = pos.length - 1 - n; if (k >= 0) out[i] = x - a[pos[k]]; });
  return out;
}
function aboveMin(a, w = 252) { // a[i] − minimo delle ultime w osservazioni valide (oggi compreso); null finché non ce ne sono w
  const out = new Array(a.length).fill(null), pos = [];
  a.forEach((x, i) => { if (x == null) return; pos.push(i); if (pos.length < w) return; let mn = Infinity; for (let k = pos.length - w; k < pos.length; k++) mn = Math.min(mn, a[pos[k]]); out[i] = x - mn; });
  return out;
}
const hyPct = V.expandingPct(HY, 252);
const cond = (src, f) => src.map((x) => (x == null ? null : f(x)));
const RULES = [];
const add = (id, fam, label, series, test, extra = {}) => RULES.push({ id, fam, label, c: cond(series, test), ...extra });
for (const L of [300, 350, 400, 500]) add(`hy_L${L}`, 'hy', `HY OAS ≥ ${L} pb`, HY, (x) => x >= L, { L });
for (const n of [21, 63]) { const ch = changeObs(HY, n); for (const X of [50, 100, 150]) add(`hy_up${X}_${n}`, 'hy', `HY sale di ≥ ${X} pb in ${n} sedute`, ch, (x) => x >= X); }
{ const am = aboveMin(HY); for (const X of [100, 150, 200]) add(`hy_min${X}`, 'hy', `HY ≥ ${X} pb sopra il minimo di 252 sedute`, am, (x) => x >= X); }
for (const P of [80, 90]) add(`hy_pct${P}`, 'hy', `HY percentile del livello ≥ ${P}`, hyPct, (x) => x >= P);
const DDX = [3, 4, 5, 6, 8, 10];
for (const X of DDX) add(`cr_dd${X}`, 'cr', `HYG/IEF ≤ −${X}% dal massimo di 252 sedute`, ctx.dd, (x) => x <= -X, { X });
for (const P of [80, 90, 95]) add(`cr_pct${P}`, 'cr', `HYG/IEF percentile del calo ≥ ${P}`, ctx.ddPct, (x) => x >= P);

function signals(c) { // prima condizione vera dopo almeno Q osservazioni valide con la condizione falsa
  const pos = validPos(c), out = [];
  for (let j = Q; j < pos.length; j++) {
    if (!c[pos[j]]) continue;
    let quiet = true;
    for (let k = j - Q; k < j; k++) if (c[pos[k]]) { quiet = false; break; }
    if (quiet) out.push(pos[j]);
  }
  return out;
}
const firstPossible = (c) => { const pos = validPos(c); return pos.length > Q ? pos[Q] : null; };

// ---------- esiti ----------
function outcome(p) {
  const e = p + 1, o = { ret: {}, dd: {}, vixMax: null };
  for (const h of H_RET) o.ret[h] = e + h < N ? (close[e + h] / close[e] - 1) * 100 : null;
  for (const h of H_DD) {
    if (e + h >= N) { o.dd[h] = null; continue; }
    let mn = close[e]; for (let k = e + 1; k <= e + h; k++) if (close[k] < mn) mn = close[k];
    o.dd[h] = Math.min(0, (mn / close[e] - 1) * 100);
  }
  if (e + H_VIX < N) { let mx = null; for (let k = e; k <= e + H_VIX; k++) if (A.vix[k] != null && (mx == null || A.vix[k] > mx)) mx = A.vix[k]; o.vixMax = mx; }
  return o;
}
const OUT = new Array(N).fill(null).map((_, p) => (p + 1 < N ? outcome(p) : null));
// calo dell'S&P 500 dal massimo delle ultime 252 sedute alla seduta p (quanto era già sceso)
const spxDD = close.map((x, i) => { let mx = -Infinity; for (let k = Math.max(0, i - 251); k <= i; k++) mx = Math.max(mx, close[k]); return (x / mx - 1) * 100; });

function stats(ps) {
  const os = ps.map((p) => OUT[p]).filter(Boolean), s = { n: ps.length };
  for (const h of H_RET) { const v = os.map((o) => o.ret[h]).filter((x) => x != null); s['r' + h] = { n: v.length, med: med(v), pos: v.length ? r1((100 * v.filter((x) => x > 0).length) / v.length) : null }; }
  for (const h of H_DD) {
    const v = os.map((o) => o.dd[h]).filter((x) => x != null);
    s['dd' + h] = { n: v.length, med: med(v), k10: v.filter((x) => x <= -10).length, q10: v.length ? r1((100 * v.filter((x) => x <= -10).length) / v.length) : null, k20: v.filter((x) => x <= -20).length, q20: v.length ? r1((100 * v.filter((x) => x <= -20).length) / v.length) : null };
  }
  const vm = os.map((o) => o.vixMax).filter((x) => x != null);
  s.vixMax126 = { n: vm.length, med: med(vm) };
  return s;
}
const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const idxOf = (d) => dates.findIndex((x) => x >= d);

// ---------- eventi (zigzag) ----------
function zigzag(th) {
  const ev = []; let mode = 'up', hi = 0, lo = 0;
  for (let t = 1; t < N; t++) {
    if (mode === 'up') { if (close[t] > close[hi]) hi = t; else if (close[t] <= close[hi] * (1 - th)) { mode = 'down'; lo = t; } }
    else if (close[t] < close[lo]) lo = t;
    else if (close[t] >= close[lo] * (1 + th)) { ev.push({ peak: hi, trough: lo, open: false }); mode = 'up'; hi = t; }
  }
  if (mode === 'down') ev.push({ peak: hi, trough: lo, open: true });
  return ev.map((e) => ({ ...e, depth: (close[e.trough] / close[e.peak] - 1) * 100 }));
}
const crisisLabel = (e) => V.crisisOf(dates[e.trough]) || V.crisisOf(dates[e.peak]) || null;

function eventView(ev, sig, c, from) {
  const S = new Set(sig);
  return ev.filter((e) => e.peak >= from || (e.trough >= from)).map((e) => {
    let s = null; for (let i = Math.max(0, e.peak - PRE); i < e.trough; i++) if (S.has(i)) { s = i; break; }
    const base = { peak: dates[e.peak], trough: dates[e.trough], depth: r1(e.depth), sessions: e.trough - e.peak, open: e.open, crisis: crisisLabel(e), dataBeforePeak: e.peak >= from, alarmAtPeak: c[e.peak] == null ? null : !!c[e.peak] };
    if (s == null) return { ...base, signal: null, frac: 1, warned: false };
    const en = s + 1, frac = en <= e.peak ? 0 : Math.max(0, Math.min(1, (close[e.peak] - close[en]) / (close[e.peak] - close[e.trough])));
    return { ...base, warned: true, signal: dates[s], lead: s - e.peak, frac: r3(frac), further: r1((close[e.trough] / close[en] - 1) * 100), spxDDatSignal: r1(spxDD[s]) };
  });
}

// ---------- rientro (domanda secondaria) ----------
function reentries(c, sig) {
  const pos = validPos(c), at = new Map(pos.map((p, j) => [p, j])), out = [];
  sig.forEach((s, k) => {
    const stop = k + 1 < sig.length ? sig[k + 1] : N;
    let run = 0;
    for (let j = at.get(s); j < pos.length && pos[j] < stop; j++) {
      const p = pos[j];
      if (c[p]) { run++; continue; }
      if (run >= REENTRY_K) {
        let mnBefore = Infinity; for (let i = s; i <= p; i++) mnBefore = Math.min(mnBefore, close[i]);
        const e = p + 1; let ok = null;
        if (e + 252 < N) { let mn = Infinity; for (let i = e + 1; i <= e + 252; i++) mn = Math.min(mn, close[i]); ok = mn >= mnBefore; }
        out.push({ signal: dates[s], date: dates[p], p, minAlreadyDone: ok, crisis: V.crisisOf(dates[p]) });
        break;
      }
      run = 0;
    }
  });
  return out;
}

// ---------- analisi di una regola ----------
const HY_SUB = [['1997-2009', '1990-01-01', '2009-12-31'], ['2010-oggi', '2010-01-01', '2099-12-31']];
const CR_SUB = [['2008-2016', '1990-01-01', '2016-12-31'], ['2017-oggi', '2017-01-01', '2099-12-31']];
const EV10 = zigzag(0.10), EV20 = zigzag(0.20);

function analyse(R) {
  const sig = signals(R.c), from = firstPossible(R.c), basePs = range(from, N - 2);
  const st = stats(sig), bs = stats(basePs);
  const nAl = basePs.filter((p) => R.c[p]).length, nVal = basePs.filter((p) => R.c[p] != null).length;
  const a = st.dd126.n ? r1(st.dd126.q10 - bs.dd126.q10) : null;
  const ev10 = eventView(EV10, sig, R.c, from), ev20 = eventView(EV20, sig, R.c, from);
  const bMed = (ev) => (ev.length ? V.quantile(ev.map((e) => e.frac), 0.5) : null);
  // descrittivo (deciso dopo il primo calcolo): conta come avviso anche l'allarme già acceso alla seduta del massimo
  const alarmMed = (ev) => (ev.length ? r3(V.quantile(ev.map((e) => (e.alarmAtPeak ? 0 : e.frac)), 0.5)) : null);
  const warnedMed = (ev) => { const w = ev.filter((e) => e.warned); return w.length ? r3(V.quantile(w.map((e) => e.frac), 0.5)) : null; };
  const SUB = R.fam === 'hy' ? HY_SUB : CR_SUB;
  const sub = SUB.map(([name, d0, d1]) => {
    const i0 = Math.max(from, idxOf(d0)), i1 = (idxOf(d1 > dates.at(-1) ? '9999' : d1) === -1 ? N : idxOf(d1)) - 1;
    const ps = sig.filter((p) => p >= i0 && p <= i1), b = stats(range(i0, Math.min(i1, N - 2)));
    const s = stats(ps);
    return { name, from: dates[i0], to: dates[Math.min(i1, N - 1)], signals: ps.length, n126: s.dd126.n, k10: s.dd126.k10, q10: s.dd126.q10, base_q10: b.dd126.q10, diff: s.dd126.n ? r1(s.dd126.q10 - b.dd126.q10) : null, base_n: b.dd126.n };
  });
  const list = sig.map((p) => { const o = OUT[p]; return { date: dates[p], crisis: V.crisisOf(dates[p]), spxDD: r1(spxDD[p]), r21: r1(o.ret[21]), r63: r1(o.ret[63]), r126: r1(o.ret[126]), r252: r1(o.ret[252]), dd63: r1(o.dd[63]), dd126: r1(o.dd[126]), dd252: r1(o.dd[252]), vixMax126: r1(o.vixMax) }; });
  return {
    id: R.id, fam: R.fam, label: R.label, from: dates[from], to: dates[N - 1],
    signals: sig.length, signalsFull126: st.dd126.n, stats: st, base: bs,
    alarmShare: r1((100 * nAl) / nVal), alarmSessions: nAl,
    a: { diff: a, k: st.dd126.k10, n: st.dd126.n, q: st.dd126.q10, base: bs.dd126.q10, pass: a != null && a >= 15 },
    b: {
      ev10: { n: ev10.length, warned: ev10.filter((e) => e.warned).length, medFrac: r3(bMed(ev10)), medFracWarned: warnedMed(ev10), alarmAtPeak: ev10.filter((e) => e.alarmAtPeak).length, medFracAlarm: alarmMed(ev10) },
      ev20: { n: ev20.length, warned: ev20.filter((e) => e.warned).length, medFrac: r3(bMed(ev20)), medFracWarned: warnedMed(ev20), alarmAtPeak: ev20.filter((e) => e.alarmAtPeak).length, medFracAlarm: alarmMed(ev20) },
    },
    sub, list, events10: ev10, events20: ev20, reentry: reentries(R.c, sig),
  };
}

// probabilità di avere almeno k successi su n per caso, se ogni segnale avesse la quota della base (descrittivo: i segnali
// non sono del tutto indipendenti e la base non è un'estrazione a caso)
const binTail = (k, n, p) => { let t = 0; for (let j = k; j <= n; j++) { let c = 1; for (let m = 0; m < j; m++) c = (c * (n - m)) / (m + 1); t += c * p ** j * (1 - p) ** (n - j); } return t; };
const res = {};
for (const R of RULES) {
  const x = analyse(R);
  x.a.pBinomiale = x.a.n ? r3(binTail(x.a.k, x.a.n, x.a.base / 100)) : null;
  // descrittivo: tutte le sedute con la condizione vera contro quelle con la condizione falsa (sedute sovrapposte)
  const from = firstPossible(R.c), on = [], off = [];
  for (let p = from; p < N - 1; p++) if (R.c[p] === true) on.push(p); else if (R.c[p] === false) off.push(p);
  const so = stats(on), sf = stats(off);
  x.stato = { vera: { n: on.length, dd126: so.dd126, r126: so.r126, r252: so.r252 }, falsa: { n: off.length, dd126: sf.dd126, r126: sf.r126, r252: sf.r252 } };
  x.b.pass = x.b.ev10.medFrac != null && x.b.ev10.medFrac < 0.5 && x.b.ev20.medFrac != null && x.b.ev20.medFrac < 0.5;
  res[R.id] = x;
}

// ---------- rientro: esiti ----------
for (const x of Object.values(res)) {
  const ps = x.reentry.map((r) => r.p), s = stats(ps);
  x.reentryStats = { n: ps.length, r63: s.r63, r126: s.r126, r252: s.r252, dd252: s.dd252, minAlreadyDone: x.reentry.filter((r) => r.minAlreadyDone).length, minKnown: x.reentry.filter((r) => r.minAlreadyDone != null).length };
  x.reentry = x.reentry.map(({ p, ...r }) => ({ ...r, r126: r1(OUT[p].ret[126]), r252: r1(OUT[p].ret[252]), dd252: r1(OUT[p].dd[252]) }));
}

// ---------- mappa HY OAS ↔ HYG/IEF ----------
const pearson = (xs, ys) => { const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sx += (xs[i] - mx) ** 2; sy += (ys[i] - my) ** 2; } return sxy / Math.sqrt(sx * sy); };
const pairsOf = (a, b, f = () => true) => { const xs = [], ys = []; for (let i = 0; i < N; i++) if (a[i] != null && b[i] != null && f(i)) { xs.push(a[i]); ys.push(b[i]); } return { n: xs.length, r: r3(pearson(xs, ys)) }; };
const hyCh21 = changeObs(HY, 21), hyAm = aboveMin(HY);
const mapping = {
  periodo: [dates[ctx.dd.findIndex((x) => x != null)], dates[N - 1]],
  corr_livello_HY_vs_calo_HYGIEF: pairsOf(HY, ctx.dd),
  corr_HY_sopra_minimo252_vs_calo_HYGIEF: pairsOf(hyAm, ctx.dd),
  corr_variazione21_HY_vs_HYGIEF21: pairsOf(hyCh21, ctx.ch),
  corr_percentile_HY_vs_percentile_calo: pairsOf(hyPct, ctx.ddPct),
  per_sottoperiodo: CR_SUB.map(([n, a, b]) => ({ n, livello: pairsOf(HY, ctx.dd, (i) => dates[i] >= a && dates[i] <= b), sopra_minimo: pairsOf(hyAm, ctx.dd, (i) => dates[i] >= a && dates[i] <= b), var21: pairsOf(hyCh21, ctx.ch, (i) => dates[i] >= a && dates[i] <= b) })),
  soglie: {},
};
for (const L of [300, 350, 400, 500]) {
  const cr = range(1, N - 1).filter((i) => HY[i] != null && HY[i] >= L && HY[i - 1] != null && HY[i - 1] < L && ctx.dd[i] != null); // ogni attraversamento dal basso (anche senza 63 sedute sotto)
  const sg = signals(res[`hy_L${L}`] ? RULES.find((r) => r.id === `hy_L${L}`).c : []).filter((p) => ctx.dd[p] != null);
  const band = range(0, N - 1).filter((i) => HY[i] != null && Math.abs(HY[i] - L) <= 10 && ctx.dd[i] != null).map((i) => ctx.dd[i]);
  const common = range(0, N - 1).filter((i) => HY[i] != null && ctx.dd[i] != null);
  const share = common.filter((i) => HY[i] >= L).length / common.length;
  const ddSorted = common.map((i) => ctx.dd[i]);
  mapping.soglie[L] = {
    attraversamenti: cr.length, calo_HYGIEF_agli_attraversamenti_mediana: med(cr.map((i) => ctx.dd[i])), quartili: [r2(V.quantile(cr.map((i) => ctx.dd[i]), 0.25)), r2(V.quantile(cr.map((i) => ctx.dd[i]), 0.75))],
    segnali_dal_2008: sg.map((p) => ({ date: dates[p], calo_HYGIEF: r1(ctx.dd[p]), percentile_calo: r1(ctx.ddPct[p]) })),
    calo_HYGIEF_con_HY_entro_10pb_dalla_soglia: { n: band.length, mediana: med(band), p25: r2(V.quantile(band, 0.25)), p75: r2(V.quantile(band, 0.75)) },
    quota_sedute_sopra_nel_periodo_comune: r1(100 * share), calo_HYGIEF_con_la_stessa_quota: r2(V.quantile(ddSorted, share)),
  };
}
// descrittivo: il calo di HYG/IEF quando l'HY è 100, 150, 200 pb sopra il suo minimo di 252 sedute (misura dello stesso tipo)
mapping.sopra_minimo = Object.fromEntries([100, 150, 200].map((X) => {
  const band = range(0, N - 1).filter((i) => hyAm[i] != null && Math.abs(hyAm[i] - X) <= 10 && ctx.dd[i] != null).map((i) => ctx.dd[i]);
  const sg = signals(RULES.find((r) => r.id === `hy_min${X}`).c).filter((p) => ctx.dd[p] != null);
  return [X, { sedute_entro_10pb: band.length, mediana: med(band), p25: r2(V.quantile(band, 0.25)), p75: r2(V.quantile(band, 0.75)), ai_segnali: sg.map((p) => ({ date: dates[p], calo_HYGIEF: r1(ctx.dd[p]) })) }];
}));
// soglia equivalente scelta senza guardare gli esiti: la più vicina alla mediana del calo agli attraversamenti dei 350 pb
const m350 = mapping.soglie[350].calo_HYGIEF_agli_attraversamenti_mediana;
const eqX = DDX.reduce((b, X) => (Math.abs(-X - m350) < Math.abs(-b - m350) ? X : b), DDX[0]);
mapping.soglia_equivalente = { regola: 'soglia dell\'elenco più vicina alla mediana del calo di HYG/IEF agli attraversamenti dei 350 pb dal 2008', X: eqX };

// ---------- verdetti ----------
function verdict(id, nbrs) {
  const x = res[id], c1 = nbrs.every((n) => res[n].a.pass && res[n].b.pass), c2 = x.sub.filter((s) => s.n126 >= 3).every((s) => s.diff != null && s.diff >= 15) && x.sub.filter((s) => s.n126 >= 3).length > 0;
  const pass = x.a.pass && x.b.pass && c1 && c2;
  return { id, a: x.a.pass, b: x.b.pass, c_vicine: c1, c_sottoperiodi: c2, pass, pochi: x.signalsFull126 < 8, verdetto: pass ? 'passa' : 'non passa' };
}
const i = DDX.indexOf(eqX);
const verdetti = {
  hy350: verdict('hy_L350', ['hy_L300', 'hy_L400']),
  hyG: Object.fromEntries(Object.keys(res).filter((k) => k.startsWith('hy_')).map((k) => [k, { a: res[k].a.pass, b: res[k].b.pass }])),
  crEq: verdict(`cr_dd${eqX}`, [DDX[i - 1], DDX[i + 1]].filter(Boolean).map((X) => `cr_dd${X}`)),
  // descrittivo, deciso dopo aver visto che queste due varianti passano (a) e (b): reggono alle soglie vicine?
  dopo_hy_up100_63: verdict('hy_up100_63', ['hy_up50_63', 'hy_up150_63', 'hy_up100_21']),
  dopo_hy_min100: verdict('hy_min100', ['hy_min150']),
  crG: Object.fromEntries(Object.keys(res).filter((k) => k.startsWith('cr_')).map((k) => [k, { a: res[k].a.pass, b: res[k].b.pass }])),
};

// ---------- crisi ----------
// Crisi: calo intero = dal massimo più alto tra gli eventi ≥ 10% con quell'etichetta al minimo più basso dopo di esso.
// Per ogni regola: primo segnale da 126 sedute prima del massimo al giorno prima del minimo (come per gli eventi).
const CRI = ['1998 Russia/LTCM', '2000-03 bolla internet', '2007-09 crisi finanziaria', '2010 euro/flash crash', '2011-12 debito USA/euro', '2015-16 Cina/petrolio', '2018 volatilità/Fed', '2020 Covid', '2022 inflazione/tassi', '2025 dazi'];
const CRI_RULES = ['hy_L300', 'hy_L350', 'hy_L400', 'hy_L500', 'hy_up100_21', 'hy_up100_63', 'hy_min100', 'hy_min150', 'cr_dd3', 'cr_dd4', 'cr_dd5', 'cr_dd8', 'cr_pct90'];
const SIG = Object.fromEntries(RULES.map((R) => [R.id, { s: signals(R.c), c: R.c, from: firstPossible(R.c) }]));
const crisi = CRI.map((name) => {
  const evs = EV10.filter((e) => crisisLabel(e) === name);
  if (!evs.length) return { name, evento: null };
  const pk = evs.reduce((a, b) => (close[b.peak] > close[a.peak] ? b : a)).peak;
  const tr = evs.filter((e) => e.trough > pk).reduce((a, b) => (close[b.trough] < close[a.trough] ? b : a)).trough;
  const row = { name, peak: dates[pk], trough: dates[tr], depth: r1((close[tr] / close[pk] - 1) * 100), sessions: tr - pk, eventi10: evs.length };
  for (const id of CRI_RULES) {
    const { s: sg, c, from } = SIG[id];
    if (tr < from) { row[id] = { dati: 'serie non ancora disponibile' }; continue; }
    const s = sg.find((i) => i >= pk - PRE && i < tr);
    if (s == null) { row[id] = { signal: null, alarmAtPeak: c[pk] == null ? null : !!c[pk], dataAtPeak: pk >= from }; continue; }
    const en = s + 1, frac = en <= pk ? 0 : Math.max(0, Math.min(1, (close[pk] - close[en]) / (close[pk] - close[tr])));
    row[id] = { signal: dates[s], lead: s - pk, frac: r3(frac), further: r1((close[tr] / close[en] - 1) * 100), alarmAtPeak: c[pk] == null ? null : !!c[pk] };
  }
  return row;
});

// Descrittivo: perché i 350 pb non danno un segnale nuovo in una crisi (allarme già acceso o spread «a cavallo» della soglia)
const c350 = RULES.find((r) => r.id === 'hy_L350').c, s350 = SIG.hy_L350.s;
const perche350 = crisi.filter((c) => c.peak && c.hy_L350 && c.hy_L350.signal == null).map((c) => {
  const pk = dates.indexOf(c.peak), tr = dates.indexOf(c.trough);
  const last = [...s350].reverse().find((i) => i < pk);
  let first = null; for (let i = pk; i <= tr; i++) if (c350[i] && c350[i - 1] === false) { first = i; break; }
  const before = first == null ? null : range(Math.max(0, first - 63), first - 1).filter((i) => c350[i]).length;
  return { crisi: c.name, allarme_al_massimo: c350[pk], ultimo_segnale_prima: last == null ? null : dates[last], sedute_sopra_su_252_prima_del_massimo: range(pk - 252, pk - 1).filter((i) => c350[i]).length, primo_attraversamento_dopo_il_massimo: first == null ? null : dates[first], sedute_sopra_nelle_63_prima: before };
});
const crossAll = (c) => range(1, N - 1).filter((i) => c[i] && c[i - 1] === false).length;
const attraversamenti = Object.fromEntries([300, 350, 400, 500].map((L) => [L, { tutti_dal_basso: crossAll(RULES.find((r) => r.id === `hy_L${L}`).c), segnali: SIG[`hy_L${L}`].s.length }]));
const oggi = Object.fromEntries(['hy_L300', 'hy_L350', 'hy_L400', 'hy_L500', 'hy_up100_63', 'hy_min100', 'cr_dd3', 'cr_dd4', 'cr_dd5', 'cr_dd8', 'cr_pct90'].map((id) => {
  const c = SIG[id].c; let t = N - 1; while (t >= 0 && c[t] == null) t--;
  return [id, { data: dates[t], condizione: c[t], ultimo_segnale: SIG[id].s.length ? dates[SIG[id].s.at(-1)] : null }];
}));
oggi.HYGIEF = { data: dates[N - 1], calo: r1(ctx.dd[N - 1]), percentile: r1(ctx.ddPct[N - 1]) };

const out = {
  creato: new Date().toISOString(), dati: { spx: [dates[0], dates[N - 1]], hy: [hyRaw.dates[0], hyRaw.dates.at(-1)], hy_sedute_spx_senza_valore_dal_1997: range(idxOf('1997-01-02'), N - 1).filter((p) => HY[p] == null).map((p) => dates[p]), hygief_primo_calo: dates[ctx.dd.findIndex((x) => x != null)], hygief_primo_percentile: dates[ctx.ddPct.findIndex((x) => x != null)] },
  eventi10: EV10.filter((e) => dates[e.peak] >= '1997-01-01').map((e) => ({ peak: dates[e.peak], trough: dates[e.trough], depth: r1(e.depth), open: e.open, crisis: crisisLabel(e) })),
  eventi20: EV20.filter((e) => dates[e.peak] >= '1997-01-01').map((e) => ({ peak: dates[e.peak], trough: dates[e.trough], depth: r1(e.depth), open: e.open, crisis: crisisLabel(e) })),
  mapping, verdetti, crisi, perche350, attraversamenti, oggi, regole: res,
};
fs.writeFileSync(HERE + 'risultati.json', JSON.stringify(out, null, 1) + '\n');

// ---------- riassunto ----------
console.log('dati', JSON.stringify(out.dati).slice(0, 300));
console.log('eventi ≥10%:', out.eventi10.length, ' ≥20%:', out.eventi20.length);
console.log('regola | segnali (126 completi) | calo≥10% in 6m k/n q% | base q% | diff | allarme% | ev10 avvisati/n medFrac | ev20 avvisati/n medFrac | sub');
for (const x of Object.values(res)) console.log([x.id, `${x.signals} (${x.signalsFull126})`, `${x.a.k}/${x.a.n} ${x.a.q}`, x.a.base, x.a.diff, x.alarmShare, `${x.b.ev10.warned}/${x.b.ev10.n} ${x.b.ev10.medFrac}`, `${x.b.ev20.warned}/${x.b.ev20.n} ${x.b.ev20.medFrac}`, x.sub.map((s) => `${s.name}:${s.k10}/${s.n126} ${s.diff}`).join(' ')].join(' | '));
console.log(JSON.stringify(out.verdetti, null, 0));
console.log(JSON.stringify(mapping, null, 0).slice(0, 3000));
console.log(JSON.stringify({ perche350, attraversamenti, oggi }, null, 0));
for (const id of ['hy_L350', 'hy_L400', 'hy_L500', `cr_dd${eqX}`, 'cr_dd5', 'cr_dd8']) console.log(id, JSON.stringify(res[id].reentryStats), JSON.stringify(res[id].reentry));
for (const id of Object.keys(res)) console.log(id, 'b-allarme', res[id].b.ev10.medFracAlarm, res[id].b.ev20.medFracAlarm, 'allarme al massimo', res[id].b.ev10.alarmAtPeak, res[id].b.ev20.alarmAtPeak, 'mediana avvisati', res[id].b.ev10.medFracWarned, res[id].b.ev20.medFracWarned);
