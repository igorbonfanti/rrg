// L'avvicinamento serve a qualcosa in pratica? Backtest dell'uso preventivo del segnale «Avvicinamento» dei settori S&P 500.
//
// Uso: node ricerca/avvicinamento-uso/script/backtest_uso.mjs   → scrive ricerca/avvicinamento-uso/backtest_uso.json
//
// REGOLA MISURATA (la stessa che l'app mostra, funzioni importate da js/signals.js):
//   avvicinamento[t] = soglia[t] != null && breadth[t] != null && stato[t] === 'normal' && breadth[t] <= soglia[t]
//   soglia[t] = approachSeries(breadth, livello blu)[t] (livello + q90 dei cali in 10 sedute, sola storia fino a t);
//   stato[t] = runMachine(...).days[t], oppure quello dell'ultimo giorno calcolato (come apprDays in js/bottom.js).
//   Si considerano solo le sedute dalla prima calcolata dalla macchina (XLC dal 2019, XLRE dal 2016: prima manca il prezzo
//   dell'ETF; l'app lì mostrerebbe lo stato «normale» di partenza, che non è un dato).
// EPISODI: ingresso = prima seduta in avvicinamento dopo almeno GAP=20 sedute (con la breadth) senza; stessa regola per gli
//   ingressi in Attenzione (stato 'watch'). Sensibilità con GAP 10 e 40.
// BASI: (a) tutte le sedute in stato Normale non in avvicinamento; (b) gli ingressi in Attenzione.
// ZONA BLU: prima seduta j > t con stato 'setup' o 'fail' (il fallimento riporta in zona blu); TRIGGER: evento 'trig' con j > t.
// RENDIMENTI: dalla chiusura del giorno dell'ingresso (adjclose, dividendi inclusi, nessun costo); il segnale si conosce a
//   mercato chiuso, quindi in pratica si compra un giorno dopo: è un'approssimazione dichiarata.
//   Calo massimo entro k = worstWithin (minimo delle chiusure da t a t+k rispetto alla chiusura di t).
//   Le finestre incomplete (fine dei dati) sono escluse dal denominatore.
// METÀ: ingressi 2005–2015 e 2016–oggi. CRISI (decise prima, per data d'ingresso): vedi CRISES.
// CLUSTER: ingressi di tutti i settori ordinati per data; nuovo cluster se passano più di 63 sedute dall'ingresso precedente.
//
// CRITERI DI SUCCESSO (decisi prima di vedere i numeri, codificati in verdict*):
//  1. Preavviso zona blu: R(h) = P(zona blu entro h | ingresso) / P(zona blu entro h | base a), h = 63 e 126.
//     UTILE se R >= 2 a entrambi gli orizzonti, in tutto e in entrambe le metà, e in almeno 7 settori su 11 con R >= 2 a
//     entrambi gli orizzonti (settori con almeno 5 ingressi a finestra completa; se sono meno di 11, almeno il 64% di quelli).
//     NON UTILE se in tutto R < 2 a entrambi gli orizzonti. Altrimenti INCERTO.
//  2. Rischio sul prezzo: diff = mediana calo massimo a 63 (ingressi) − mediana base (a).
//     UTILE se diff <= −2 punti in tutto e in entrambe le metà. NON UTILE se in tutto diff > −2. Altrimenti INCERTO.
//  3. Zona d'acquisto: mediana rendimento a 63/126/252 dopo l'ingresso contro base (a) e contro i trigger.
//     UTILE se supera la base a tutti e 3 gli orizzonti in entrambe le metà E non è sotto la mediana dei trigger in almeno
//     2 orizzonti su 3. NON UTILE se in tutto supera la base in meno di 2 orizzonti su 3 oppure è sotto i trigger in 2 su 3
//     o più. Altrimenti INCERTO.
//  4. Strategie: nessuna soglia, solo confronto (comprare all'ingresso / aspettare la zona blu / aspettare il trigger, uscita
//     comune a ingresso + 252 e + 504 sedute, cassa a rendimento 0 se il segnale non arriva).
//  5. Descrittivo: per settore, per crisi, quota di sedute in avvicinamento.
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachSeries, approachLevel, forward, worstWithin, median, DEFAULT_PARAMS } from '../../../js/signals.js';

const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), sec = R('data/sectors.json'), br = R('data/breadth.json');
const P = { ...DEFAULT_PARAMS, ...th.params }, SECT = Object.keys(th.blue), D = sec.dates, N = D.length;
const RET_H = [21, 63, 126, 252], SET_H = [63, 126], TRIG_H = [126, 252], MDD_H = [21, 63];
const CRISES = [
  ['2008', '2007-07-01', '2009-06-30'], ['2011', '2011-04-01', '2011-12-31'], ['2015-16', '2015-05-01', '2016-06-30'],
  ['2018', '2018-01-15', '2019-01-31'], ['2020', '2020-02-01', '2020-06-30'], ['2022', '2022-01-01', '2022-12-31'],
  ['2025', '2025-02-01', '2025-06-30'],
];
const crisisOf = (d) => (CRISES.find(([, a, b]) => d >= a && d <= b) || ['fuori crisi'])[0];
const half = (d) => (d <= '2015-12-31' ? 'H1' : 'H2');
const r1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
const r2 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
const pct = (k, n) => (n ? r1((100 * k) / n) : null);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

// ---------- serie per settore ----------
const S = {};
let checks = 0, mism = 0;
for (const k of SECT) {
  const B = breadthSeries(br, k, D), b = B.pct200, L = th.blue[k], px = sec.adjclose[k];
  const m = runMachine(priceSeries(px), B, L, P), A = approachSeries(b, L);
  const start = m.days.findIndex((v) => v != null);
  let code = null;
  const state = b.map((_, t) => { if (m.days[t] != null || t === 0) code = m.days[t] || 'normal'; return code; });
  const appr = b.map((v, t) => A[t] != null && v != null && state[t] === 'normal' && v <= A[t]);
  // controllo separato: soglia ricalcolata con approachLevel sulla storia fino a t e stato cercato all'indietro (stateAt)
  for (let t = start; t < N; t += 37) {
    const Ai = approachLevel(b.slice(0, t + 1), L);
    let u = t; while (u > 0 && m.days[u] == null) u--;
    const s2 = m.days[u] || 'normal';
    const on2 = Ai != null && b[t] != null && s2 === 'normal' && b[t] <= Ai;
    checks++; if (on2 !== appr[t]) mism++;
  }
  const blueDay = (j) => m.days[j] === 'setup' || m.days[j] === 'fail';
  const trigT = m.events.filter((e) => e.code === 'trig').map((e) => e.t);
  const nextBlue = new Array(N).fill(null), nextTrig = new Array(N).fill(null);
  for (let t = N - 2, nb = null, nt = null, ti = trigT.length - 1; t >= 0; t--) {
    if (blueDay(t + 1)) nb = t + 1;
    while (ti >= 0 && trigT[ti] > t) { nt = trigT[ti]; ti--; }
    nextBlue[t] = nb; nextTrig[t] = nt;
  }
  S[k] = { b, px, m, A, state, appr, start, trigT, nextBlue, nextTrig };
}

function entries(k, on, gap) {
  const { b, start } = S[k], out = [];
  let off = 0;
  for (let t = start; t < N; t++) {
    if (b[t] == null) continue;
    if (on(t)) { if (off >= gap) out.push(t); off = 0; } else off++;
  }
  return out;
}

// misure di una seduta t (null dove la finestra non è completa)
function measure(k, t) {
  const { px, nextBlue, nextTrig } = S[k], o = { k, t, date: D[t], half: half(D[t]), crisis: crisisOf(D[t]) };
  const lb = nextBlue[t] == null ? null : nextBlue[t] - t, lt = nextTrig[t] == null ? null : nextTrig[t] - t;
  for (const h of SET_H) o['blu' + h] = t + h <= N - 1 ? lb != null && lb <= h : null;
  for (const h of TRIG_H) o['trig' + h] = t + h <= N - 1 ? lt != null && lt <= h : null;
  o.leadBlu = lb; o.leadTrig = lt;
  for (const h of RET_H) o['ret' + h] = forward(px, t, h);
  for (const h of MDD_H) o['mdd' + h] = t + h <= N - 1 && px[t] != null ? worstWithin(px, t, h) : null;
  return o;
}

// aggregato di un insieme di misure
function agg(rows) {
  const o = { n: rows.length };
  for (const h of SET_H) { const v = rows.filter((r) => r['blu' + h] != null); o['blu' + h] = [v.filter((r) => r['blu' + h]).length, v.length]; o['pBlu' + h] = pct(...o['blu' + h]); }
  for (const h of TRIG_H) { const v = rows.filter((r) => r['trig' + h] != null); o['trig' + h] = [v.filter((r) => r['trig' + h]).length, v.length]; o['pTrig' + h] = pct(...o['trig' + h]); }
  o.leadBluMed126 = median(rows.filter((r) => r.leadBlu != null && r.leadBlu <= 126).map((r) => r.leadBlu));
  o.leadTrigMed252 = median(rows.filter((r) => r.leadTrig != null && r.leadTrig <= 252).map((r) => r.leadTrig));
  for (const h of RET_H) { const v = rows.map((r) => r['ret' + h]).filter((x) => x != null); o['ret' + h] = r1(median(v)); o['nRet' + h] = v.length; o['pos' + h] = pct(v.filter((x) => x > 0).length, v.length); }
  for (const h of MDD_H) { const v = rows.map((r) => r['mdd' + h]).filter((x) => x != null); o['mdd' + h] = r1(median(v)); o['nMdd' + h] = v.length; }
  return o;
}
const ratio = (a, b) => (a == null || b == null ? null : b === 0 ? (a > 0 ? Infinity : null) : r2(a / b));

// ---------- analisi completa per una regola dei giorni GAP ----------
function run(gap) {
  const E = [], W = [], base = [], trig = [];
  for (const k of SECT) {
    const s = S[k];
    for (const t of entries(k, (t) => s.appr[t], gap)) E.push(measure(k, t));
    for (const t of entries(k, (t) => s.state[t] === 'watch', gap)) W.push(measure(k, t));
    for (let t = s.start; t < N; t++) if (s.b[t] != null && s.state[t] === 'normal' && !s.appr[t]) base.push(measure(k, t));
    for (const t of s.trigT) if (t >= s.start) trig.push(measure(k, t));
  }
  const by = (rows, f) => { const g = {}; for (const r of rows) (g[f(r)] = g[f(r)] || []).push(r); return g; };
  const split = (rows) => ({ tutto: agg(rows), H1: agg(rows.filter((r) => r.half === 'H1')), H2: agg(rows.filter((r) => r.half === 'H2')) });
  const res = { gap, ingressi: split(E), attenzione: split(W), base: split(base), trigger: split(trig) };
  res.rapporti = {};
  for (const p of ['tutto', 'H1', 'H2']) {
    res.rapporti[p] = {};
    for (const h of SET_H) {
      res.rapporti[p]['blu' + h + '_vsBase'] = ratio(res.ingressi[p]['pBlu' + h], res.base[p]['pBlu' + h]);
      res.rapporti[p]['blu' + h + '_vsAttenzione'] = ratio(res.ingressi[p]['pBlu' + h], res.attenzione[p]['pBlu' + h]);
    }
    for (const h of TRIG_H) res.rapporti[p]['trig' + h + '_vsBase'] = ratio(res.ingressi[p]['pTrig' + h], res.base[p]['pTrig' + h]);
  }
  // per settore
  const eS = by(E, (r) => r.k), bS = by(base, (r) => r.k), wS = by(W, (r) => r.k), tS = by(trig, (r) => r.k);
  res.perSettore = {};
  for (const k of SECT) {
    const e = agg(eS[k] || []), bb = agg(bS[k] || []);
    const valid = S[k].b.slice(S[k].start).filter((v) => v != null).length;
    res.perSettore[k] = {
      livello: th.blue[k], dal: D[S[k].start], sedute: valid, seduteAvvicinamento: S[k].appr.filter((x) => x).length,
      quotaSedute: pct(S[k].appr.filter((x) => x).length, valid), sogliaOggi: r1(S[k].A[N - 1]),
      ingressi: e, base: bb, attenzione: agg(wS[k] || []), trigger: agg(tS[k] || []),
      R63: ratio(e.pBlu63, bb.pBlu63), R126: ratio(e.pBlu126, bb.pBlu126),
      diffMdd63: e.mdd63 == null || bb.mdd63 == null ? null : r1(e.mdd63 - bb.mdd63),
    };
  }
  // per crisi
  const eC = by(E, (r) => r.crisis), bC = by(base, (r) => r.crisis);
  res.perCrisi = {};
  for (const c of [...CRISES.map((x) => x[0]), 'fuori crisi']) res.perCrisi[c] = { ingressi: agg(eC[c] || []), base: agg(bC[c] || []), settori: [...new Set((eC[c] || []).map((r) => r.k))].join(' ') };
  // cluster (episodi raggruppati nel tempo)
  const sorted = [...E].sort((a, b) => a.t - b.t), cl = [];
  for (const r of sorted) { if (!cl.length || r.t - cl.at(-1).at(-1).t > 63) cl.push([]); cl.at(-1).push(r); }
  const cw = (f) => { const v = cl.map((g) => { const x = g.map(f).filter((y) => y != null); return x.length ? mean(x) : null; }).filter((y) => y != null); return v.length ? r1(100 * mean(v)) : null; };
  const cm = (f) => r1(median(cl.map((g) => median(g.map(f))).filter((y) => y != null)));
  res.cluster = {
    n: cl.length, elenco: cl.map((g) => `${D[g[0].t]}…${D[g.at(-1).t]} (${g.length}: ${g.map((r) => r.k).join(' ')})`),
    pBlu63: cw((r) => (r.blu63 == null ? null : +r.blu63)), pBlu126: cw((r) => (r.blu126 == null ? null : +r.blu126)),
    pTrig252: cw((r) => (r.trig252 == null ? null : +r.trig252)), mdd63: cm((r) => r.mdd63), ret63: cm((r) => r.ret63), ret252: cm((r) => r.ret252),
  };
  return { res, E, base, trig };
}

// ---------- strategie (domanda 4) ----------
function strategies(E) {
  const out = {};
  for (const X of [252, 504]) {
    const rows = [];
    for (const e of E) {
      const { px, nextBlue, nextTrig } = S[e.k], t0 = e.t, end = t0 + X;
      if (end > N - 1 || px[t0] == null) continue;
      const leg = (tb) => {
        if (tb == null || tb >= end) return { bought: false, ret: 0, mddFromBuy: 0, days: 0 };
        let mn = px[tb], pk = px[tb], mdd = 0;
        for (let i = tb; i <= end; i++) { mn = Math.min(mn, px[i]); pk = Math.max(pk, px[i]); mdd = Math.min(mdd, px[i] / pk - 1); }
        return { bought: true, tb, ret: (px[end] / px[tb] - 1) * 100, mddFromBuy: (mn / px[tb] - 1) * 100, mddPeak: mdd * 100, days: end - tb };
      };
      const tw = nextTrig[t0] != null && nextTrig[t0] - t0 <= 126 ? nextTrig[t0] : t0 + 126;
      rows.push({ k: e.k, date: e.date, half: e.half, A: leg(t0), B: leg(nextBlue[t0]), C: leg(nextTrig[t0]), Dd: leg(tw) });
    }
    const sum = (sel) => {
      const v = rows.map(sel);
      const b = v.filter((x) => x.bought);
      return { episodi: v.length, comprano: b.length, retMedioTutti: r1(mean(v.map((x) => x.ret))), retMedianoTutti: r1(median(v.map((x) => x.ret))),
        retMedianoSeCompra: r1(median(b.map((x) => x.ret))), positiviSeCompra: `${b.filter((x) => x.ret > 0).length}/${b.length}`,
        caloMedianoDalPrezzoDiAcquisto: r1(median(b.map((x) => x.mddFromBuy))), caloPeggiore: r1(Math.min(...b.map((x) => x.mddFromBuy))),
        drawdownMassimoMediano: r1(median(b.map((x) => x.mddPeak))), seduteInvestiteMedie: r1(mean(v.map((x) => x.days))) };
    };
    const paired = (f, g) => { const d = rows.map((r) => f(r).ret - g(r).ret); return { mediaDiff: r1(mean(d)), medianaDiff: r1(median(d)), primoMeglio: `${d.filter((x) => x > 0).length}/${d.length}` }; };
    const split = (h) => {
      const keep = h ? rows.filter((r) => r.half === h) : rows, save = rows.splice(0, rows.length, ...keep);
      const o = { compraIngresso: sum((r) => r.A), aspettaZonaBlu: sum((r) => r.B), aspettaTrigger: sum((r) => r.C),
        triggerOppure126: sum((r) => r.Dd), ingressoMenoTriggerOppure126: paired((r) => r.A, (r) => r.Dd),
        ingressoMenoTrigger: paired((r) => r.A, (r) => r.C), ingressoMenoZonaBlu: paired((r) => r.A, (r) => r.B), zonaBluMenoTrigger: paired((r) => r.B, (r) => r.C) };
      rows.splice(0, rows.length, ...save);
      return o;
    };
    out['uscita+' + X] = { tutto: split(null), H1: split('H1'), H2: split('H2') };
  }
  // descrittivo, condizionato al futuro: episodi che arrivano in zona blu e poi al trigger entro 252 sedute
  const cond = [];
  for (const e of E) {
    const { px, nextBlue, nextTrig } = S[e.k], t0 = e.t, tb = nextBlue[t0], tt = nextTrig[t0];
    if (tb == null || tt == null || tt - t0 > 252 || tt < tb) continue;
    let mn = Infinity, tmin = t0; for (let i = t0; i <= tt; i++) if (px[i] < mn) { mn = px[i]; tmin = i; }
    let mnB = Infinity; for (let i = tb; i <= tt; i++) mnB = Math.min(mnB, px[i]);
    cond.push({ k: e.k, ingresso: e.date, zonaBlu: D[tb], trigger: D[tt], seduteAlBlu: tb - t0, seduteAlTrigger: tt - t0,
      prezzoBluVsIngresso: r1((px[tb] / px[t0] - 1) * 100), prezzoTriggerVsIngresso: r1((px[tt] / px[t0] - 1) * 100),
      prezzoTriggerVsBlu: r1((px[tt] / px[tb] - 1) * 100), caloMaxDaIngresso: r1((mn / px[t0] - 1) * 100), caloMaxDaBlu: r1((mnB / px[tb] - 1) * 100),
      minimoPrimaDelBlu: tmin < tb });
  }
  out.condizionato = {
    nota: 'solo episodi che arrivano in zona blu e al trigger entro 252 sedute: si sa solo dopo, non è una strategia',
    episodi: cond.length,
    ingressoMeglioDelTrigger: `${cond.filter((c) => c.prezzoTriggerVsIngresso > 0).length}/${cond.length}`,
    ingressoMeglioDelBlu: `${cond.filter((c) => c.prezzoBluVsIngresso > 0).length}/${cond.length}`,
    medianaPrezzoTriggerVsIngresso: r1(median(cond.map((c) => c.prezzoTriggerVsIngresso))),
    medianaPrezzoBluVsIngresso: r1(median(cond.map((c) => c.prezzoBluVsIngresso))),
    medianaPrezzoTriggerVsBlu: r1(median(cond.map((c) => c.prezzoTriggerVsBlu))),
    medianaCaloMaxDaIngresso: r1(median(cond.map((c) => c.caloMaxDaIngresso))), peggioreCaloDaIngresso: r1(Math.min(...cond.map((c) => c.caloMaxDaIngresso))),
    medianaCaloMaxDaBlu: r1(median(cond.map((c) => c.caloMaxDaBlu))),
    medianaSeduteAlBlu: median(cond.map((c) => c.seduteAlBlu)), medianaSeduteAlTrigger: median(cond.map((c) => c.seduteAlTrigger)),
    minimoPrimaDellaZonaBlu: `${cond.filter((c) => c.minimoPrimaDelBlu).length}/${cond.length}`,
    elenco: cond,
  };
  return out;
}

// ---------- zone blu avvisate (quanti ingressi in zona blu erano preceduti da un ingresso in avvicinamento) ----------
function warnedBlue(gap) {
  const rows = [];
  for (const k of SECT) {
    const s = S[k], ea = entries(k, (t) => s.appr[t], gap), ew = entries(k, (t) => s.state[t] === 'watch', gap);
    for (const st of s.m.setups) {
      if (st.t < s.start + 126) continue; // serve una finestra di 126 sedute già calcolate prima
      const t = st.t, inW = (e) => e >= t - 126 && e <= t - 5;
      let anyAppr = false; for (let j = t - 126; j <= t - 5; j++) if (s.appr[j]) anyAppr = true;
      const a = ea.filter(inW), w = ew.filter(inW);
      rows.push({ k, data: D[t], crisi: crisisOf(D[t]), ingressoAvv: a.length > 0, seduteAvvicinamento: anyAppr, anticipoAvv: a.length ? t - a[0] : null,
        ingressoAttenzione: w.length > 0, anticipoAttenzione: w.length ? t - w[0] : null,
        cinqueSedutePrima: `${s.state[t - 5]}, breadth ${r1(s.b[t - 5])}, soglia ${r1(s.A[t - 5])}` });
    }
  }
  return { zoneBlu: rows.length, conIngressoAvv: rows.filter((r) => r.ingressoAvv).length, conSeduteAvv: rows.filter((r) => r.seduteAvvicinamento).length,
    conIngressoAttenzione: rows.filter((r) => r.ingressoAttenzione).length, conUnoDeiDue: rows.filter((r) => r.ingressoAvv || r.ingressoAttenzione).length,
    anticipoMedianoAvv: median(rows.map((r) => r.anticipoAvv)), anticipoMedianoAttenzione: median(rows.map((r) => r.anticipoAttenzione)), elenco: rows };
}

// ---------- verdetti (criteri fissati in testa) ----------
function verdict1(res) {
  const ok = (p) => SET_H.every((h) => (res.rapporti[p]['blu' + h + '_vsBase'] ?? 0) >= 2);
  const elig = SECT.filter((k) => res.perSettore[k].ingressi.blu126[1] >= 5);
  const pass = elig.filter((k) => (res.perSettore[k].R63 ?? 0) >= 2 && (res.perSettore[k].R126 ?? 0) >= 2);
  const sectOk = elig.length >= 11 ? pass.length >= 7 : elig.length > 0 && pass.length / elig.length >= 0.64;
  const allBelow = SET_H.every((h) => (res.rapporti.tutto['blu' + h + '_vsBase'] ?? 0) < 2);
  return { tutto: ok('tutto'), H1: ok('H1'), H2: ok('H2'), settoriIdonei: elig.length, settoriOk: pass, settoriKo: elig.filter((k) => !pass.includes(k)), settoriCriterio: sectOk,
    verdetto: ok('tutto') && ok('H1') && ok('H2') && sectOk ? 'utile' : allBelow ? 'non utile' : 'incerto' };
}
function verdict2(res) {
  const d = (p) => (res.ingressi[p].mdd63 == null ? null : r1(res.ingressi[p].mdd63 - res.base[p].mdd63));
  const ok = (p) => d(p) != null && d(p) <= -2;
  return { diffTutto: d('tutto'), diffH1: d('H1'), diffH2: d('H2'), verdetto: ok('tutto') && ok('H1') && ok('H2') ? 'utile' : !ok('tutto') ? 'non utile' : 'incerto' };
}
function verdict3(res) {
  const H = [63, 126, 252], beats = (p) => H.filter((h) => res.ingressi[p]['ret' + h] > res.base[p]['ret' + h]).length;
  const belowTrig = H.filter((h) => res.ingressi.tutto['ret' + h] < res.trigger.tutto['ret' + h]).length;
  const util = beats('H1') === 3 && beats('H2') === 3 && belowTrig <= 1;
  return { orizzontiSopraBase: { tutto: beats('tutto'), H1: beats('H1'), H2: beats('H2') }, orizzontiSottoTrigger: belowTrig,
    verdetto: util ? 'utile' : beats('tutto') < 2 || belowTrig >= 2 ? 'non utile' : 'incerto' };
}

// ---------- esecuzione ----------
const main = run(20);
const sens = {};
for (const g of [10, 20, 40]) {
  const { res } = g === 20 ? main : run(g);
  sens['gap' + g] = { ingressi: res.ingressi.tutto.n, cluster: res.cluster.n, pBlu63: res.ingressi.tutto.pBlu63, pBlu126: res.ingressi.tutto.pBlu126,
    R63: res.rapporti.tutto.blu63_vsBase, R126: res.rapporti.tutto.blu126_vsBase, pTrig252: res.ingressi.tutto.pTrig252,
    mdd63: res.ingressi.tutto.mdd63, ret63: res.ingressi.tutto.ret63, ret126: res.ingressi.tutto.ret126, ret252: res.ingressi.tutto.ret252,
    v1: verdict1(res).verdetto, v2: verdict2(res).verdetto, v3: verdict3(res).verdetto };
}
const out = {
  asOf: br.asOf, generato: 'node ricerca/avvicinamento-uso/script/backtest_uso.mjs', controlloIndipendente: { sedute: checks, differenze: mism },
  parametri: { gap: 20, orizzonti: { zonaBlu: SET_H, trigger: TRIG_H, rendimenti: RET_H, calo: MDD_H }, crisi: CRISES, livelli: th.blue },
  verdetti: { d1: verdict1(main.res), d2: verdict2(main.res), d3: verdict3(main.res) },
  zoneBluAvvisate: warnedBlue(20), risultati: main.res, strategie: strategies(main.E), sensibilita: sens,
  ingressi: main.E.map((r) => ({ k: r.k, data: r.date, crisi: r.crisis, blu63: r.blu63, blu126: r.blu126, trig126: r.trig126, trig252: r.trig252,
    leadBlu: r.leadBlu, leadTrig: r.leadTrig, ret21: r1(r.ret21), ret63: r1(r.ret63), ret126: r1(r.ret126), ret252: r1(r.ret252), mdd21: r1(r.mdd21), mdd63: r1(r.mdd63) })),
};
fs.mkdirSync(new URL('../', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../backtest_uso.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');

// ---------- stampa ----------
const R0 = main.res, row = (name, a) => console.log(name.padEnd(22), JSON.stringify(a));
console.log('controllo indipendente:', checks, 'sedute,', mism, 'differenze');
for (const g of ['ingressi', 'attenzione', 'base', 'trigger']) for (const p of ['tutto', 'H1', 'H2']) {
  const a = R0[g][p];
  row(`${g} ${p}`, { n: a.n, blu63: a.blu63, blu126: a.blu126, trig126: a.trig126, trig252: a.trig252, leadBlu: a.leadBluMed126, leadTrig: a.leadTrigMed252,
    ret: [a.ret21, a.ret63, a.ret126, a.ret252], mdd: [a.mdd21, a.mdd63] });
}
console.log('rapporti', JSON.stringify(R0.rapporti));
console.log('cluster', JSON.stringify({ ...R0.cluster, elenco: R0.cluster.elenco.length }));
for (const k of SECT) { const s = R0.perSettore[k]; row(k, { quota: s.quotaSedute, ing: s.ingressi.n, blu63: s.ingressi.blu63, blu126: s.ingressi.blu126, base126: s.base.pBlu126, R63: s.R63, R126: s.R126, trig252: s.ingressi.trig252, mdd63: [s.ingressi.mdd63, s.base.mdd63], ret: [s.ingressi.ret63, s.ingressi.ret126, s.ingressi.ret252], baseRet: [s.base.ret63, s.base.ret126, s.base.ret252] }); }
for (const [c, s] of Object.entries(R0.perCrisi)) row(c, { ing: s.ingressi.n, blu126: s.ingressi.blu126, trig252: s.ingressi.trig252, mdd63: s.ingressi.mdd63, ret: [s.ingressi.ret63, s.ingressi.ret126, s.ingressi.ret252], settori: s.settori });
for (const [c, s] of Object.entries(R0.perCrisi)) row('base ' + c, { n: s.base.n, blu126: s.base.pBlu126, mdd63: s.base.mdd63, ret: [s.base.ret63, s.base.ret126, s.base.ret252] });
console.log('zone blu avvisate', JSON.stringify(out.zoneBluAvvisate, null, 0));
console.log('strategie', JSON.stringify(out.strategie, (k, v) => (k === 'elenco' ? undefined : v), 1));
console.log('sensibilita', JSON.stringify(sens, null, 1));
console.log('verdetti', JSON.stringify(out.verdetti, null, 1));
