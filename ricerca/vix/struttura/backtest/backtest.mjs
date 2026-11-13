// Ricerca «VIX: struttura a termine e credito» (fase 1, solo verifica: l'app non si tocca).
// Idea da un analista che usa futures VIX e spread high yield: aggiungere alla vista «8 VIX» (a) la struttura a termine
// della volatilità e (b) lo stress del credito. Qui si misura se queste due informazioni dicono qualcosa in più del solo
// livello del VIX sui rendimenti di S&P 500 e Nasdaq-100 dopo gli episodi di VIX alto.
//
// METODO (domande e criterio di successo fissati PRIMA di guardare i risultati; vedi backtest.md)
// - Dati. VIX, ^GSPC, ^NDX: data/vix.json dell'app (le stesse funzioni dell'app: vxSeries, align, episodes, outcomes,
//   dist, quantile, crisisOf, expandingPct di js/vix.js). VIX3M = FRED VXVCLS (dal 2007-12-04); credito = FRED BAA10Y
//   (Moody's Baa meno Treasury 10 anni, dal 1986); FRED BAMLH0A0HYM2 (HY OAS, solo gli ultimi 3 anni) solo descrittivo.
//   Cache in cache/ (CSV di FRED scaricati il 09/11/2026). Tutto sulle sedute dell'indice: un valore che manca resta null.
// - R = VIX / VIX3M alla chiusura. R ≥ 1 = backwardation, R < 1 = contango.
// - Rendimenti dalla chiusura della seduta DOPO il segnale (come l'app) a 21/63/126/252 sedute; calo successivo = minimo
//   entro 252 sedute rispetto all'ingresso (outcomes di js/vix.js). «12 mesi completi» = rendimento a 252 disponibile.
// - Confronto tra due gruppi A e B (compare): almeno 8 casi con 12 mesi completi in ciascun gruppo, altrimenti «non
//   valutabile»; poi |Δ mediana a 252| ≥ 5 punti, o |Δ quota di positivi a 252| ≥ 15 punti, o |Δ calo mediano| ≥ 5
//   punti (Q1 e Q3: conta la differenza in entrambe le direzioni, perché la domanda è «aggiunge informazione?»; Q2:
//   conta solo nella direzione «l'uscita dalla backwardation è migliore»); la differenza che passa deve avere lo stesso
//   segno in almeno 2 dei sottoperiodi in cui entrambi i gruppi hanno almeno un caso con 12 mesi (servono almeno 2 di
//   questi sottoperiodi). Sottoperiodi: Q1 e Q2 2008-2012, 2013-2019, 2020-oggi; Q3 1990-2007, 2008-2015, 2016-oggi.
//   Una domanda «passa» solo se passa nella regola principale e in tutte le varianti di sensibilità.
// - Q1: episodi dell'app (soglie 20, 25, 30, 40, quiete 63) con segnale dal 2008-01-01. «Con backwardation» = R ≥ 1 alla
//   chiusura del segnale o in una delle 5 sedute dopo (regola del brief). ATTENZIONE: guarda fino a 5 sedute oltre
//   l'ingresso (dato futuro). Varianti aggiunte da me prima dei risultati: (v1) solo R alla chiusura del segnale,
//   ingresso il giorno dopo (nessun dato futuro); (v2) stessa finestra di 5 sedute ma ingresso alla chiusura della seduta
//   dopo la finestra (p+6, nessun dato futuro); (v3, v4) soglia di R 0,95 e 1,05. Anche a livello di sedute: tutte le
//   sedute con R ≥ 1, con VIX ≥ 30, e base di tutte le sedute dal 2008.
// - Q2: «uscita dalla backwardation». Episodio di backwardation = prima chiusura con R ≥ s preceduta da almeno Q chiusure
//   (con R) tutte < s (come la quiete degli episodi VIX). Nell'episodio, l'evento è la prima chiusura con R < s subito
//   dopo almeno K chiusure consecutive con R ≥ s (un evento per episodio). Base K = 5, s = 1,00, Q = 63; sensibilità una
//   alla volta K = 3, 10; s = 0,95, 1,05; Q = 21. Variante descrittiva «stretta»: conta solo se il PRIMO tratto di
//   backwardation dell'episodio dura almeno K sedute; variante descrittiva «tutte»: ogni uscita dopo almeno K sedute di
//   backwardation, anche più d'una per episodio (eventi sovrapposti). Ingresso alla chiusura del giorno dopo. Il minimo era già fatto =
//   minimo dell'indice nelle 252 sedute dopo l'ingresso ≥ minimo dall'inizio della backwardation alla seduta dell'evento.
//   Uscita «falsa» = R torna ≥ s entro 21 sedute dall'evento E il minimo dopo è più basso di quello prima.
//   Confronti: (a) base di tutte le sedute dal 2008; (b) criterio: episodio VIX ≥ 30 della stessa crisi (stessa etichetta
//   CRISES o periodi sovrapposti; se più d'uno, l'ultimo partito entro la data dell'evento, altrimenti il primo dopo),
//   confronto appaiato. Per contesto anche VIX ≥ 20, 25, 40. Fuori campione: tra le 18 combinazioni K × s × Q si sceglie
//   quella con la mediana a 252 più alta sugli eventi fino al 2016 (almeno 3 eventi con 12 mesi), poi si guarda dal 2017.
// - Q3: episodi VIX ≥ 25 e ≥ 30 dal 1990. «Credito in tensione» = BAA10Y(segnale) − BAA10Y(21 sedute prima) ≥ 0,30
//   punti; sensibilità 0,20 e 0,50; variante: percentile di BAA10Y sulla sua storia FRED fino a quel giorno (dal 1986,
//   quota dei valori ≤) ≥ 80. Se manca uno dei due valori l'episodio resta «non classificato».
//
// Uso: node ricerca/vix/struttura/backtest/backtest.mjs          → risultati.json (+ tabelle a schermo)
//      python3 -I ricerca/vix/struttura/backtest/verifica.py      (ricalcolo indipendente, non importa js/vix.js)
import fs from 'node:fs';

const HERE = new URL('./', import.meta.url).pathname;
const W = new URL('../../../../', import.meta.url).pathname;
const V = await import(W + 'js/vix.js');
const D = JSON.parse(fs.readFileSync(W + 'data/vix.json'));

const r2 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);

function fred(id) {
  const lines = fs.readFileSync(HERE + 'cache/' + id + '.csv', 'utf8').trim().split(/\r?\n/).slice(1);
  const dates = [], val = [];
  for (const l of lines) {
    const [d, v] = l.split(',');
    const x = v === '' || v === '.' || v == null ? null : Number(v);
    dates.push(d); val.push(Number.isFinite(x) ? x : null);
  }
  return { dates, val, map: new Map(dates.map((d, i) => [d, val[i]])) };
}
const VXV = fred('VXVCLS'), BAA = fred('BAA10Y'), HY = fred('BAMLH0A0HYM2');
const on = (A, F) => A.dates.map((d) => (F.map.has(d) ? F.map.get(d) : null));
// percentile di BAA10Y sulla sua storia FRED fino a quel giorno (quota dei valori ≤), con expandingPct dell'app
const baaPctF = V.expandingPct(BAA.val, 1);
const baaPctMap = new Map(BAA.dates.map((d, i) => [d, baaPctF[i]]));

const vix = V.vxSeries(D.series.VIX);
const IDX = { SPX: 'S&P 500', NDX: 'Nasdaq-100' };
const HS = V.HS;
const SUB_R = [['2008-01-01', '2012-12-31'], ['2013-01-01', '2019-12-31'], ['2020-01-01', '2099-12-31']];
const SUB_C = [['1990-01-01', '2007-12-31'], ['2008-01-01', '2015-12-31'], ['2016-01-01', '2099-12-31']];
const FROM_R = '2008-01-01';

// ---------- statistiche di un gruppo di casi {date, ret, dd, partial} ----------
function stats(cases) {
  const full = cases.filter((c) => c.ret[252] != null);
  const s = { n: cases.length, full: full.length };
  for (const h of [63, 252]) { const d = V.dist(cases.map((c) => c.ret[h])); s[h] = { n: d.n, median: r2(d.median), posN: d.posN, pos: r2(d.pos) }; }
  const dds = cases.filter((c) => !c.partial && c.dd != null).map((c) => c.dd);
  s.dd = { n: dds.length, median: r2(V.quantile(dds, 0.5)), worst: dds.length ? r2(Math.min(...dds)) : null };
  return s;
}
// differenze A − B (calo: positivo = A scende meno)
function diffs(a, b) {
  return {
    med: a[252].median != null && b[252].median != null ? a[252].median - b[252].median : null,
    pos: a[252].pos != null && b[252].pos != null ? a[252].pos - b[252].pos : null,
    dd: a.dd.median != null && b.dd.median != null ? a.dd.median - b.dd.median : null,
  };
}
const LIM = { med: 5, pos: 15, dd: 5 };
/** Confronto col criterio. two: true = conta anche la direzione opposta (Q1, Q3); false = solo A migliore di B (Q2). */
function compare(A, B, subs, two = true) {
  const sa = stats(A), sb = stats(B), d = diffs(sa, sb);
  const subRes = subs.map(([a, b]) => {
    const xa = A.filter((c) => c.date >= a && c.date <= b), xb = B.filter((c) => c.date >= a && c.date <= b);
    const ta = stats(xa), tb = stats(xb);
    return { from: a, to: b, nA: ta.full, nB: tb.full, ...(ta.full && tb.full ? { d: Object.fromEntries(Object.entries(diffs(ta, tb)).map(([k, v]) => [k, r2(v)])) } : {}) };
  });
  const usable = subRes.filter((s) => s.d);
  const met = [];
  for (const k of ['med', 'pos', 'dd']) {
    const x = d[k]; if (x == null) continue;
    const big = two ? Math.abs(x) >= LIM[k] : x >= LIM[k];
    if (!big) continue;
    const agree = usable.filter((s) => s.d[k] != null && Math.sign(s.d[k]) === Math.sign(x)).length;
    met.push({ k, d: r2(x), agree, of: usable.length, ok: usable.length >= 2 && agree >= 2 });
  }
  let verdict;
  if (sa.full < 8 || sb.full < 8) verdict = 'non valutabile';
  else verdict = met.some((m) => m.ok) ? 'passa' : 'non passa';
  return { A: sa, B: sb, d: { med: r2(d.med), pos: r2(d.pos), dd: r2(d.dd) }, met, subs: subRes, verdict };
}
// verdetto complessivo: [principale, varianti...]. La principale decide «non valutabile» o «non passa»; se passa, devono
// passare tutte le varianti (una variante con meno di 8 casi rende il risultato «non valutabile nelle varianti»).
function overall([main, ...vars]) {
  if (main !== 'passa') return main;
  if (vars.every((v) => v === 'passa')) return 'passa';
  return vars.some((v) => v === 'non passa') ? 'non passa (varianti)' : 'non valutabile (varianti)';
}
const fmtEp = (e, extra = {}) => ({ date: e.date, vix: e.vix, crisis: e.crisis, ret: Object.fromEntries(HS.map((h) => [h, r2(e.ret[h])])), dd: r2(e.dd), partial: e.partial, ...extra });

// ---------- dati allineati per indice ----------
function build(k) {
  const A = V.align(V.vxSeries(D.series[k]), vix);
  const vxv = on(A, VXV), baa = on(A, BAA), hy = on(A, HY);
  const R = A.vix.map((v, i) => (v != null && vxv[i] != null ? v / vxv[i] : null));
  return { A, vxv, baa, hy, R };
}

// sedute (casi) dal giorno d0 con una condizione, ingresso il giorno dopo
function sessions(S, cond, d0 = FROM_R, entry = V.ENTRY) {
  const out = [];
  S.A.dates.forEach((d, p) => { if (d >= d0 && p + entry < S.A.close.length && cond(p)) { const o = V.outcomes(S.A.close, p, entry); out.push({ date: d, p, ret: o.ret, dd: o.dd, partial: o.partial }); } });
  return out;
}
// tratti consecutivi (sulle sedute con il dato) in cui la condizione vale; cluster = tratti separati da meno di gap sedute
function runs(S, cond, d0, gap = 21) {
  const pos = []; S.A.dates.forEach((d, p) => { if (d >= d0 && S.R[p] != null) pos.push(p); });
  const rs = []; let cur = null;
  pos.forEach((p, j) => { if (cond(p)) { if (cur && cur.lastJ === j - 1) { cur.lastJ = j; cur.end = p; cur.len++; } else { cur = { start: p, end: p, lastJ: j, firstJ: j, len: 1 }; rs.push(cur); } } });
  let clusters = 0, prev = null;
  for (const r of rs) { if (!prev || r.firstJ - prev.lastJ - 1 >= gap) clusters++; prev = r; }
  return { sessions: pos.length, on: rs.reduce((s, r) => s + r.len, 0), runs: rs.length, clusters, list: rs.map((r) => ({ start: S.A.dates[r.start], end: S.A.dates[r.end], len: r.len })) };
}

// ---------- Q2: eventi di uscita dalla backwardation ----------
function exits(S, { K = 5, s = 1, Q = 63, mode = 'main' } = {}) {
  const pos = []; S.R.forEach((x, p) => { if (x != null) pos.push(p); });
  const r = pos.map((p) => S.R[p]);
  const starts = [];
  for (let j = Q; j < r.length; j++) {
    if (r[j] < s) continue;
    let quiet = true; for (let k = j - Q; k < j; k++) if (r[k] >= s) { quiet = false; break; }
    if (quiet) starts.push(j);
  }
  const ev = [];
  starts.forEach((j0, e) => {
    const stop = e + 1 < starts.length ? starts[e + 1] : r.length;
    let run = 0, maxR = 0, firstRun = true;
    for (let k = j0; k < stop; k++) {
      if (r[k] >= s) { run++; maxR = Math.max(maxR, r[k]); continue; }
      // r[k] < s: chiusura in contango
      if (run >= K && (mode !== 'strict' || firstRun)) { ev.push(event(S, pos, j0, k, run, maxR, s)); if (mode !== 'all') break; }
      if (run > 0) firstRun = false;
      if (mode === 'strict' && !firstRun) break;
      run = 0;
    }
  });
  return ev;
}
function event(S, pos, j0, k, run, maxR, s) {
  const { A } = S, p = pos[k], p0 = pos[j0], n = A.close.length, e = p + 1;
  const o = V.outcomes(A.close, p, 1);
  let minBefore = Infinity; for (let i = p0; i <= p; i++) minBefore = Math.min(minBefore, A.close[i]);
  let minAfter = Infinity; for (let i = e; i <= Math.min(n - 1, e + 252); i++) minAfter = Math.min(minAfter, A.close[i]);
  let reBw = null; // R torna ≥ s entro 21 sedute dopo l'evento
  if (p + 21 < n) { reBw = false; for (let i = p + 1; i <= p + 21; i++) if (S.R[i] != null && S.R[i] >= s) { reBw = true; break; } }
  else { for (let i = p + 1; i < n; i++) if (S.R[i] != null && S.R[i] >= s) reBw = true; }
  const lowerAfter = e < n ? minAfter < minBefore : null;
  const bottomDone = e >= n ? null : (lowerAfter ? false : (o.partial ? null : true));
  const fake = reBw === true && lowerAfter === true ? true : (reBw === false || (lowerAfter === false && !o.partial) ? false : null);
  return {
    date: A.dates[p], p, start: A.dates[p0], run, maxR: r4(maxR), R: r4(S.R[p]), vix: A.vix[p], sessionsFromStart: p - p0,
    crisis: V.crisisOf(A.dates[p]), crisisStart: V.crisisOf(A.dates[p0]), ret: o.ret, dd: o.dd, partial: o.partial, toMin: o.toMin,
    minBeforeVsEntry: r2((minBefore / A.close[e] - 1) * 100), bottomDone, reBw21: reBw, fake,
  };
}
// episodio VIX della stessa crisi (etichetta CRISES uguale o periodi sovrapposti)
function matchVix(ev, eps) {
  const cand = eps.filter((e) => (e.crisis && (e.crisis === ev.crisis || e.crisis === ev.crisisStart)) || (e.date <= ev.date && e.end >= ev.start));
  if (!cand.length) return null;
  const before = cand.filter((e) => e.date <= ev.date);
  return before.length ? before.at(-1) : cand[0];
}
function pairs(evs, eps) {
  return evs.map((ev) => ({ ev, vx: matchVix(ev, eps) })).filter((x) => x.vx);
}
function pairedCompare(evs, eps, subs) {
  const P = pairs(evs, eps);
  // il confronto appaiato usa le stesse coppie: A = eventi, B = segnali VIX (date dell'evento per i sottoperiodi)
  const A = P.map((x) => x.ev), B = P.map((x) => ({ ...x.vx, date: x.ev.date }));
  const c = compare(A, B, subs, false);
  const full = P.filter((x) => x.ev.ret[252] != null && x.vx.ret[252] != null);
  const dif = full.map((x) => x.ev.ret[252] - x.vx.ret[252]);
  const ddFull = P.filter((x) => !x.ev.partial && !x.vx.partial);
  return {
    ...c, matched: P.length, unmatched: evs.length - P.length,
    paired: { n: full.length, evBetter252: dif.filter((x) => x > 0).length, medianDiff252: r2(V.quantile(dif, 0.5)), nDD: ddFull.length, evShallowerDD: ddFull.filter((x) => x.ev.dd > x.vx.dd).length },
    list: P.map((x) => ({ event: x.ev.date, vixSignal: x.vx.date, vixCrisis: x.vx.crisis, lag: x.ev.p - x.vx.p, ev252: r2(x.ev.ret[252]), vx252: r2(x.vx.ret[252]), evDD: r2(x.ev.dd), vxDD: r2(x.vx.dd) })),
  };
}

// ---------- calcolo ----------
const out = {
  generated: new Date().toISOString(),
  sources: {
    VIX: `data/vix.json (FRED VIXCLS, poi Yahoo ^VIX) ${vix.dates[0]} → ${vix.dates.at(-1)}, FRED fino a ${vix.fred}`,
    VXVCLS: `FRED VXVCLS ${VXV.dates[0]} → ${VXV.dates.at(-1)} (${VXV.val.filter((x) => x != null).length} valori)`,
    BAA10Y: `FRED BAA10Y ${BAA.dates[0]} → ${BAA.dates.at(-1)} (${BAA.val.filter((x) => x != null).length} valori)`,
    BAMLH0A0HYM2: `FRED BAMLH0A0HYM2 ${HY.dates[0]} → ${HY.dates.at(-1)} (${HY.val.filter((x) => x != null).length} valori; FRED pubblica solo gli ultimi 3 anni)`,
    index: D.source.index,
  },
  params: { HS, quiet: V.QUIET, entry: V.ENTRY, LIM, SUB_R, SUB_C },
};
for (const k of Object.keys(IDX)) {
  const S = build(k), { A } = S, o = (out[k] = { name: IDX[k] });
  // copertura
  const iR0 = A.dates.findIndex((d) => d >= VXV.dates[0]);
  const after = A.dates.slice(iR0);
  o.coverage = {
    sessionsFromVXV: after.length,
    vixNull: A.vix.slice(iR0).filter((x) => x == null).length,
    vxvNull: S.vxv.slice(iR0).filter((x) => x == null).length,
    Rnull: S.R.slice(iR0).filter((x) => x == null).length,
    Rnulldates: after.filter((d, i) => S.R[iR0 + i] == null).slice(0, 40),
    baaNull1990: S.baa.filter((x) => x == null).length, sessions1990: A.dates.length,
  };
  // ---- Q1 ----
  const bw = runs(S, (p) => S.R[p] >= 1, '2007-12-04');
  o.q1 = { backwardation: { sessions: bw.sessions, on: bw.on, share: r2((100 * bw.on) / bw.sessions), runs: bw.runs, clusters21: bw.clusters, list: bw.list } };
  const v30 = runs(S, (p) => A.vix[p] != null && A.vix[p] >= 30, '2007-12-04');
  o.q1.vix30 = { on: v30.on, share: r2((100 * v30.on) / v30.sessions), runs: v30.runs, clusters21: v30.clusters };
  const base = sessions(S, () => true);
  const sesR = sessions(S, (p) => S.R[p] != null && S.R[p] >= 1);
  o.q1.sessions = {
    base: stats(base),
    R1: stats(sesR),
    Rlt1: stats(sessions(S, (p) => S.R[p] != null && S.R[p] < 1)),
    vix30: stats(sessions(S, (p) => A.vix[p] != null && A.vix[p] >= 30)),
    vix30R1: stats(sessions(S, (p) => A.vix[p] != null && A.vix[p] >= 30 && S.R[p] != null && S.R[p] >= 1)),
    vix30Rlt1: stats(sessions(S, (p) => A.vix[p] != null && A.vix[p] >= 30 && S.R[p] != null && S.R[p] < 1)),
    R1vixlt30: stats(sessions(S, (p) => A.vix[p] != null && A.vix[p] < 30 && S.R[p] != null && S.R[p] >= 1)),
  };
  // per sottoperiodo (sedute con R ≥ 1 contro base)
  o.q1.sessionsSub = SUB_R.map(([a, b]) => ({ from: a, to: b, base: stats(base.filter((c) => c.date >= a && c.date <= b)), R1: stats(sesR.filter((c) => c.date >= a && c.date <= b)) }));
  o.q1.thresholds = {};
  const classify = (p, s, win) => { // true/false/null
    let any = false, seen = false;
    for (let i = p; i <= p + win && i < S.R.length; i++) if (S.R[i] != null) { seen = true; if (S.R[i] >= s) any = true; }
    return seen ? any : null;
  };
  const VARS = { main: { s: 1, win: 5, entry: 1 }, v1_segnale: { s: 1, win: 0, entry: 1 }, v2_ingresso_dopo_finestra: { s: 1, win: 5, entry: 6 }, v3_soglia095: { s: 0.95, win: 5, entry: 1 }, v4_soglia105: { s: 1.05, win: 5, entry: 1 } };
  for (const X of [20, 25, 30, 40]) {
    const eps = V.episodes(A, X).filter((e) => e.date >= FROM_R);
    const t = (o.q1.thresholds[X] = { n: eps.length, variants: {} });
    for (const [name, cfg] of Object.entries(VARS)) {
      const cases = eps.map((e) => { const oo = V.outcomes(A.close, e.p, cfg.entry); return { ...e, ret: oo.ret, dd: oo.dd, partial: oo.partial, bw: classify(e.p, cfg.s, cfg.win) }; });
      const yes = cases.filter((c) => c.bw === true), no = cases.filter((c) => c.bw === false);
      const c = compare(yes, no, SUB_R, true);
      t.variants[name] = { unclassified: cases.filter((c) => c.bw == null).length, ...c };
      if (name === 'main') t.episodes = cases.map((c) => fmtEp(c, { bw: c.bw, Rsig: r4(S.R[c.p]), maxR6: r4(Math.max(...S.R.slice(c.p, c.p + 6).filter((x) => x != null))) }));
    }
    t.verdict = overall(Object.values(t.variants).map((v) => v.verdict));
  }
  // ---- Q2 ----
  const eps30all = V.episodes(A, 30);
  const epsAll = { 20: V.episodes(A, 20), 25: V.episodes(A, 25), 30: eps30all, 40: V.episodes(A, 40) };
  const baseSub = SUB_R.map(([a, b]) => base.filter((c) => c.date >= a && c.date <= b));
  const vsBase = (evs) => {
    const s = stats(evs), b = stats(base), d = diffs(s, b);
    const subs = SUB_R.map(([a, bb], i) => { const x = stats(evs.filter((c) => c.date >= a && c.date <= bb)); const y = stats(baseSub[i]); return { from: a, nA: x.full, ...(x.full ? { d: Object.fromEntries(Object.entries(diffs(x, y)).map(([kk, v]) => [kk, r2(v)])) } : {}) }; });
    const usable = subs.filter((x) => x.d);
    const met = ['med', 'pos', 'dd'].filter((kk) => d[kk] != null && d[kk] >= LIM[kk]).map((kk) => { const agree = usable.filter((x) => x.d[kk] > 0).length; return { k: kk, d: r2(d[kk]), agree, of: usable.length, ok: usable.length >= 2 && agree >= 2 }; });
    return { A: s, B: b, d: { med: r2(d.med), pos: r2(d.pos), dd: r2(d.dd) }, met, subs, verdict: s.full < 8 ? 'non valutabile' : met.some((m) => m.ok) ? 'passa' : 'non passa' };
  };
  const Q2V = { main: {}, K3: { K: 3 }, K10: { K: 10 }, s095: { s: 0.95 }, s105: { s: 1.05 }, Q21: { Q: 21 } };
  o.q2 = { variants: {}, extra: {} };
  for (const [name, cfg] of Object.entries(Q2V)) {
    const evs = exits(S, cfg);
    const v = (o.q2.variants[name] = { cfg: { K: 5, s: 1, Q: 63, ...cfg }, n: evs.length });
    v.summary = {
      bottomDone: evs.filter((e) => e.bottomDone === true).length, bottomNotDone: evs.filter((e) => e.bottomDone === false).length, bottomUnknown: evs.filter((e) => e.bottomDone == null).length,
      fake: evs.filter((e) => e.fake === true).length, notFake: evs.filter((e) => e.fake === false).length, fakeUnknown: evs.filter((e) => e.fake == null).length,
      reBw21: evs.filter((e) => e.reBw21 === true).length,
    };
    v.vsBase = vsBase(evs);
    v.vsVix = {};
    for (const X of [20, 25, 30, 40]) v.vsVix[X] = pairedCompare(evs, epsAll[X], SUB_R);
    v.events = evs.map((e) => ({ ...fmtEp(e), start: e.start, run: e.run, R: e.R, maxR: e.maxR, crisisStart: e.crisisStart, sessionsFromStart: e.sessionsFromStart, toMin: e.toMin, minBeforeVsEntry: e.minBeforeVsEntry, bottomDone: e.bottomDone, reBw21: e.reBw21, fake: e.fake }));
  }
  // verdetto Q2: criterio = confronto appaiato con VIX ≥ 30 in tutte le varianti
  o.q2.verdict = overall(Object.values(o.q2.variants).map((v) => v.vsVix[30].verdict));
  o.q2.verdictVsBase = overall(Object.values(o.q2.variants).map((v) => v.vsBase.verdict));
  // varianti descrittive
  for (const [name, cfg] of Object.entries({ strict: { mode: 'strict' }, all: { mode: 'all' } })) {
    const evs = exits(S, cfg);
    o.q2.extra[name] = { n: evs.length, events: evs.map((e) => ({ date: e.date, start: e.start, ret252: r2(e.ret[252]), dd: r2(e.dd) })), vsBase: vsBase(evs), vsVix30: pairedCompare(evs, eps30all, SUB_R) };
  }
  // fuori campione: scelta fino al 2016, verifica dal 2017
  const grid = [];
  for (const K of [3, 5, 10]) for (const s of [0.95, 1, 1.05]) for (const Q of [21, 63]) {
    const evs = exits(S, { K, s, Q }), tr = evs.filter((e) => e.date <= '2016-12-31'), te = evs.filter((e) => e.date >= '2017-01-01');
    const trS = stats(tr);
    grid.push({ K, s, Q, train: { n: tr.length, full: trS.full, med252: trS[252].median, pos: `${trS[252].posN}/${trS[252].n}`, dd: trS.dd.median }, testEvents: te, trainEvents: tr });
  }
  const elig = grid.filter((g) => g.train.full >= 3 && g.train.med252 != null);
  const best = elig.reduce((a, b) => (b.train.med252 > a.train.med252 ? b : a), elig[0]);
  const baseTr = stats(base.filter((c) => c.date <= '2016-12-31')), baseTe = stats(base.filter((c) => c.date >= '2017-01-01'));
  const testOf = (g) => { const te = g.testEvents, s = stats(te); const P = pairs(te, eps30all).filter((x) => x.ev.ret[252] != null && x.vx.ret[252] != null); return { K: g.K, s: g.s, Q: g.Q, train: g.train, test: { n: te.length, full: s.full, med252: s[252].median, pos: `${s[252].posN}/${s[252].n}`, dd: s.dd.median, ddWorst: s.dd.worst, pairsVix30: P.length, betterThanVix30: P.filter((x) => x.ev.ret[252] > x.vx.ret[252]).length, events: te.map((e) => e.date) } }; };
  o.q2.oos = {
    rule: 'massima mediana a 252 sedute sugli eventi fino al 31/12/2016 (almeno 3 con 12 mesi), tra 18 combinazioni K ∈ {3,5,10} × s ∈ {0,95; 1; 1,05} × Q ∈ {21, 63}',
    baseTrain: { med252: baseTr[252].median, pos: baseTr[252].pos, dd: baseTr.dd.median }, baseTest: { med252: baseTe[252].median, pos: baseTe[252].pos, dd: baseTe.dd.median },
    grid: grid.map((g) => ({ K: g.K, s: g.s, Q: g.Q, train: g.train, test: testOf(g).test })),
    chosen: testOf(best), main: testOf(grid.find((g) => g.K === 5 && g.s === 1 && g.Q === 63)),
  };
  // ---- Q3 ----
  o.q3 = {};
  for (const X of [25, 30]) {
    const eps = V.episodes(A, X);
    const t = (o.q3[X] = { n: eps.length, variants: {} });
    const d21 = (p) => (p - 21 >= 0 && S.baa[p] != null && S.baa[p - 21] != null ? S.baa[p] - S.baa[p - 21] : null);
    const QV = { main: (p) => { const d = d21(p); return d == null ? null : d >= 0.3 - 1e-9; }, d020: (p) => { const d = d21(p); return d == null ? null : d >= 0.2 - 1e-9; }, d050: (p) => { const d = d21(p); return d == null ? null : d >= 0.5 - 1e-9; }, pct80: (p) => { const x = baaPctMap.get(A.dates[p]); return x == null ? null : x >= 80; } };
    for (const [name, f] of Object.entries(QV)) {
      const cases = eps.map((e) => ({ ...e, tens: f(e.p) }));
      const yes = cases.filter((c) => c.tens === true), no = cases.filter((c) => c.tens === false);
      t.variants[name] = { unclassified: cases.filter((c) => c.tens == null).map((c) => c.date), ...compare(yes, no, SUB_C, true) };
    }
    t.episodes = eps.map((e) => fmtEp(e, { baa: S.baa[e.p], dBaa21: r2(d21(e.p)), baaPct: r2(baaPctMap.get(e.date) ?? null), hy: S.hy[e.p], dHy21: e.p >= 21 && S.hy[e.p] != null && S.hy[e.p - 21] != null ? r2(S.hy[e.p] - S.hy[e.p - 21]) : null }));
    t.verdict = overall(Object.values(t.variants).map((v) => v.verdict));
  }
  // HY OAS: solo descrittivo, confronto con BAA10Y sulle date comuni (sedute dell'indice)
  const ix = A.dates.map((d, i) => i).filter((i) => S.hy[i] != null && S.baa[i] != null);
  const corr = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
  const dIx = ix.filter((i) => i >= 21 && S.hy[i - 21] != null && S.baa[i - 21] != null);
  const mx = (arr, idx) => idx.reduce((a, i) => (arr[i] > arr[a] ? i : a), idx[0]);
  o.hy = {
    from: A.dates[ix[0]], to: A.dates[ix.at(-1)], n: ix.length,
    corrLevel: r2(corr(ix.map((i) => S.hy[i]), ix.map((i) => S.baa[i]))),
    corrD21: r2(corr(dIx.map((i) => S.hy[i] - S.hy[i - 21]), dIx.map((i) => S.baa[i] - S.baa[i - 21]))), nD21: dIx.length,
    maxHy: { date: A.dates[mx(S.hy, ix)], v: S.hy[mx(S.hy, ix)] }, maxBaa: { date: A.dates[mx(S.baa, ix)], v: S.baa[mx(S.baa, ix)] },
    minHy: { v: Math.min(...ix.map((i) => S.hy[i])) }, minBaa: { v: Math.min(...ix.map((i) => S.baa[i])) },
    last: { date: A.dates[ix.at(-1)], hy: S.hy[ix.at(-1)], baa: S.baa[ix.at(-1)] },
  };
}
fs.writeFileSync(HERE + 'risultati.json', JSON.stringify(out, (key, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10000) / 10000 : v), 1) + '\n');

// ---------- tabelle a schermo ----------
const f = (x, d = 1) => (x == null ? '—' : (x > 0 ? '+' : '') + x.toFixed(d));
const g = (s, h = 252) => `${f(s[h].median)} (${s[h].posN}/${s[h].n})`;
for (const k of Object.keys(IDX)) {
  const o = out[k];
  console.log(`\n===== ${o.name} =====`);
  console.log('copertura', JSON.stringify({ ...o.coverage, Rnulldates: o.coverage.Rnulldates.length }));
  console.log('backwardation:', o.q1.backwardation.on, '/', o.q1.backwardation.sessions, 'sedute', o.q1.backwardation.share + '%', 'tratti', o.q1.backwardation.runs, 'periodi (gap≥21)', o.q1.backwardation.clusters21, '| VIX≥30:', JSON.stringify(o.q1.vix30));
  for (const [n, s] of Object.entries(o.q1.sessions)) console.log(`  sedute ${n.padEnd(10)} n=${s.n} 63: ${g(s, 63)} 252: ${g(s)} calo ${f(s.dd.median)}`);
  for (const X of [20, 25, 30, 40]) {
    const t = o.q1.thresholds[X];
    console.log(`Q1 VIX≥${X}: ${t.n} episodi dal 2008 → ${t.verdict}`);
    for (const [n, v] of Object.entries(t.variants)) console.log(`  ${n.padEnd(26)} con ${v.A.n}(${v.A.full}) 252 ${g(v.A)} 63 ${g(v.A, 63)} calo ${f(v.A.dd.median)} | senza ${v.B.n}(${v.B.full}) 252 ${g(v.B)} 63 ${g(v.B, 63)} calo ${f(v.B.dd.median)} | nc ${v.unclassified} | ${v.verdict}`);
  }
  for (const [n, v] of Object.entries(o.q2.variants)) {
    const b = v.vsBase, c = v.vsVix[30];
    console.log(`Q2 ${n.padEnd(5)} ${v.n} eventi 252 ${g(b.A)} 63 ${g(b.A, 63)} calo ${f(b.A.dd.median)} (peggiore ${f(b.A.dd.worst)}) | base ${g(b.B)} calo ${f(b.B.dd.median)} → ${b.verdict} | vs VIX30 appaiati ${c.paired.n}: meglio ${c.paired.evBetter252}, Δmed ${f(c.paired.medianDiff252)}, A ${g(c.A)} B ${g(c.B)} calo ${f(c.A.dd.median)}/${f(c.B.dd.median)} → ${c.verdict} | minimo già fatto ${v.summary.bottomDone}/${v.n} false ${v.summary.fake}`);
  }
  for (const e of o.q2.variants.main.events) console.log(`   ${e.date} (inizio ${e.start}, ${e.run} sedute, R max ${e.maxR}) ${e.crisis || e.crisisStart || 'altro'}: 21 ${f(e.ret[21])} 63 ${f(e.ret[63])} 126 ${f(e.ret[126])} 252 ${f(e.ret[252])} calo ${f(e.dd)} min.prima ${f(e.minBeforeVsEntry)} già fatto ${e.bottomDone} falsa ${e.fake}`);
  for (const x of o.q2.variants.main.vsVix[30].list) console.log(`   coppia ${x.event} ↔ VIX30 ${x.vixSignal} (${x.vixCrisis}, ${x.lag} sedute): 252 ${f(x.ev252)} / ${f(x.vx252)} calo ${f(x.evDD)} / ${f(x.vxDD)}`);
  for (const [n, x] of Object.entries(o.q2.extra)) console.log(`Q2 extra ${n}: ${x.n} eventi 252 ${g(x.vsBase.A)} calo ${f(x.vsBase.A.dd.median)} | vs VIX30 ${x.vsVix30.paired.n} coppie, meglio ${x.vsVix30.paired.evBetter252} → ${x.vsVix30.verdict} | ${x.events.map((e) => e.date).join(' ')}`);
  console.log('Q2 →', o.q2.verdict, '| vs base', o.q2.verdictVsBase);
  console.log('OOS scelta', JSON.stringify(o.q2.oos.chosen), '\n    base', JSON.stringify(o.q2.oos.main), JSON.stringify(o.q2.oos.baseTest));
  for (const X of [25, 30]) {
    const t = o.q3[X];
    console.log(`Q3 VIX≥${X}: ${t.n} episodi → ${t.verdict}`);
    for (const [n, v] of Object.entries(t.variants)) console.log(`  ${n.padEnd(5)} tensione ${v.A.n}(${v.A.full}) 252 ${g(v.A)} calo ${f(v.A.dd.median)} peggiore ${f(v.A.dd.worst)} | no ${v.B.n}(${v.B.full}) 252 ${g(v.B)} calo ${f(v.B.dd.median)} peggiore ${f(v.B.dd.worst)} | nc ${v.unclassified.length} | ${v.verdict} ${JSON.stringify(v.met)}`);
  }
  console.log('HY', JSON.stringify(o.hy));
}
