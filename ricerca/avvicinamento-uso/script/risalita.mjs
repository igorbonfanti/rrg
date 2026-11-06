/*
 * «Risalita dopo l'Attenzione»: la nota «probabile risalita» è sostenuta dai dati, e conviene spegnere l'avvicinamento
 * in quei casi? Ricerca: non modifica l'app.
 *
 * Perché: la regola dell'avvicinamento misura la distanza dal livello blu ma non la direzione. Dopo un minimo, mentre la
 * breadth risale dalla fascia di Attenzione (livello blu + 10) verso la soglia, l'app segnala di nuovo avvicinamento
 * (esempio: XLRE dal 20/10/2026).
 *
 * Regola attuale (copiata da js/bottom.js apprDays e da ricerca/attenzione/script/avvicinamento_pit.mjs, regola C):
 *   seduta in avvicinamento = stato della macchina (runMachine) Normale e breadth ≤ soglia del giorno (approachSeries:
 *   livello blu + 90° percentile dei cali della breadth in 10 sedute con la sola storia fino a quel giorno). Lo stato
 *   di un giorno senza calcolo è quello dell'ultimo calcolato; si conta solo dalla prima seduta con uno stato
 *   (m.days non nullo). Settori: data/breadth.json, data/sectors.json, config/thresholds.json. Indici: js/indexdata.js
 *   indexSeries, data/indices*.json, livelli di config/indices.json, prezzo = chiusura dell'indice.
 *
 * Condizione studiata (fissata prima, non cambiata dopo aver visto i numeri): «risalita» in una seduta t se
 *   (1) t è in avvicinamento, (2) nelle K sedute prima (t−K…t−1, solo sedute con uno stato) lo stato è stato almeno una
 *   volta diverso da Normale (watch, setup, trig, fail o cool), (3) breadth(t) ≥ minimo della breadth in quelle K
 *   sedute + X punti. Principale K = 20, X = 10; sensibilità K = 10/40 e X = 5 (tutte le 6 combinazioni).
 *
 * Definizioni (le stesse di avvicinamento_pit.mjs):
 *   ingresso / allarme = prima seduta in avvicinamento dopo almeno 20 sedute senza (sedute con breadth, dal primo stato);
 *                        l'episodio comprende le sedute in avvicinamento seguenti finché non passano 20 sedute senza.
 *   tocco              = breadth ≤ livello blu dopo almeno 60 sedute sopra.
 *   tocco avvisato     = un ingresso da 5 a 126 sedute prima del tocco.
 *   arriva             = la breadth tocca il livello (≤ L) nelle 126 sedute da t (t compresa), come avvicinamento_pit.
 *   zona blu entro 126 = stato 'setup' in una seduta da t a t+125 (la macchina entra in zona blu solo passando da setup).
 *   rendimento         = ETF (chiusure rettificate) o indice (solo prezzo) dalla chiusura di t a 63 sedute dopo.
 *   anticipo           = sedute dall'ingresso al primo tocco del livello, per gli ingressi che arrivano (mediana).
 *   episodio di 1–2 sedute = episodio con al più 2 sedute in avvicinamento (come casi_varianti.mjs).
 *
 * Domanda 1 (probabilità condizionate): per gli ingressi e, separatamente, per tutte le sedute in avvicinamento, gruppi
 *   «risalita» e «altri». P(tocco entro 126) e P(zona blu entro 126) si calcolano solo sui casi con 126 sedute di dati
 *   dopo (o che arrivano prima della fine dei dati): i casi recenti senza esito si escludono e si contano a parte.
 *   Criterio (fissato prima): la nota è sostenuta se P(tocco) «risalita» / P(tocco) «altri» ≤ 0,67 in entrambe le metà
 *   (2005–2015 e 2016–oggi) sui settori; gli indici (storie dal 2001) sono la verifica fuori campione. Il criterio si
 *   applica agli ingressi (unità principale, casi più indipendenti) e si riporta anche sulle sedute.
 * Domanda 2 (variante): avvicinamento acceso solo se la condizione «risalita» è falsa. Confronto con l'attuale, da sola e
 *   insieme all'Attenzione (avvicinamento oppure stato watch). Criterio (fissato prima): migliore se perde al massimo
 *   2 tocchi avvisati (da sola e con l'Attenzione), la quota di ingressi che arrivano al livello (definizione di
 *   avvicinamento_pit: arrivati / ingressi) non scende, e riduce la quota di sedute accese di almeno il 20% oppure la
 *   quota di episodi di 1–2 sedute di almeno un terzo. Settori campione principale, indici verifica.
 *
 * Controlli indipendenti nello script: la regola attuale deve rifare i numeri di ricerca/attenzione/avvicinamento_pit*.json
 *   (regole C e D); la condizione «risalita» si ricalcola con un secondo codice (stato dal solo m.days, minimo con
 *   slice) e si confrontano le sedute.
 *
 * Uso: node ricerca/avvicinamento-uso/script/risalita.mjs  → scrive ricerca/avvicinamento-uso/risalita.json e stampa
 *   le tabelle principali.
 */
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachSeries, forward, median, DEFAULT_PARAMS, SECTOR_KEYS } from '../../../js/signals.js';
import { indexSeries } from '../../../js/indexdata.js';

const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), sec = R('data/sectors.json'), br = R('data/breadth.json');
const P = { ...DEFAULT_PARAMS, ...th.params };
const icfg = R('config/indices.json').indices, IX = { ...R('data/indices_more.json').series, ...R('data/indices.json').series };
const H = 126, LEAD = 5, GAP = 20, TOUCH_GAP = 60, RET = 63;
const MAIN = { K: 20, X: 10 };
const EPS = 1e-9; // «almeno X punti»: un salto di esattamente X punti conta (evita errori di arrotondamento, es. UKX 20/10/2014)
// mediana come in avvicinamento_pit.mjs (per un numero pari di valori, il più basso dei due centrali) per l'anticipo
const medLow = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const GRID = [[20, 10], [10, 10], [40, 10], [20, 5], [10, 5], [40, 5]];
const r1 = (x) => (x == null ? null : +x.toFixed(1));
const r2 = (x) => (x == null ? null : +x.toFixed(2));
const pct = (a, b) => (b ? +((100 * a) / b).toFixed(1) : null);
const HALVES = [['prima metà', '0000', '2015-12-31'], ['seconda metà', '2016-01-01', '9999']];
const halfOf = (d) => HALVES.find(([, a, z]) => d >= a && d <= z)[0];
// periodi di crisi (finestre fissate a calendario, larghe, prima di guardare i casi); il resto è «altri periodi»
const CRISES = [['gen 2001–giu 2003', '2001-01-01', '2003-06-30'], ['lug 2007–giu 2009', '2007-07-01', '2009-06-30'], ['apr–set 2010', '2010-04-01', '2010-09-30'],
  ['mag 2011–gen 2012', '2011-05-01', '2012-01-31'], ['giu 2015–giu 2016', '2015-06-01', '2016-06-30'], ['set 2018–gen 2019', '2018-09-01', '2019-01-31'],
  ['feb–giu 2020', '2020-02-01', '2020-06-30'], ['gen–dic 2022', '2022-01-01', '2022-12-31'], ['feb–giu 2025', '2025-02-01', '2025-06-30']];
const crisisOf = (d) => (CRISES.find(([, a, z]) => d >= a && d <= z) || ['altri periodi'])[0];

// ---------- serie ----------
function build(k, dates, B, L, px) {
  const b = B.pct200;
  const m = runMachine(priceSeries(px), B, L, P);
  const start = m.days.findIndex((d) => d != null);
  const A = approachSeries(b, L);
  let code = null;
  const state = b.map((_, t) => { if (m.days[t] != null || t === 0) code = m.days[t] || 'normal'; return code; });
  const valid = b.map((v, t) => v != null && t >= start);
  const appr = b.map((v, t) => valid[t] && A[t] != null && v <= A[t] && state[t] === 'normal');
  let last = b.length - 1; while (last > 0 && b[last] == null) last--;
  return { k, dates, b, L, px, m, start, A, state, valid, appr, last };
}
const SECT = SECTOR_KEYS.map((k) => build(k, sec.dates, breadthSeries(br, k, sec.dates), th.blue[k], sec.adjclose[k]));
const INDX = Object.keys(icfg).map((k) => { const X = indexSeries(IX[k]); return build(k, X.dates, X, icfg[k].blue, X.close); });

// condizione «risalita» (codice principale)
function risalita(s, K, X) {
  const { b, state, start, appr } = s;
  return b.map((v, t) => {
    if (!appr[t]) return false;
    let notNormal = false, mn = Infinity;
    for (let j = Math.max(start, t - K); j < t; j++) {
      if (state[j] !== 'normal') notNormal = true;
      if (b[j] != null && b[j] < mn) mn = b[j];
    }
    return notNormal && mn < Infinity && v - mn >= X - EPS;
  });
}
// secondo codice indipendente: stato dal solo m.days (nel periodo è sempre calcolato), minimo con slice/filter
function risalita2(s, K, X) {
  const out = [];
  for (let t = 0; t < s.b.length; t++) {
    const from = Math.max(s.start, t - K);
    const win = s.b.slice(from, t).filter((v) => v != null);
    const st = s.m.days.slice(from, t);
    out.push(Boolean(s.appr[t]) && st.some((x) => x != null && x !== 'normal') && win.length > 0 && s.b[t] >= Math.min(...win) + X - EPS);
  }
  return out;
}

// ---------- funzioni comuni ----------
function episodesOf(s, on) {
  const eps = []; let up = 0, cur = null;
  for (let t = 0; t < s.b.length; t++) {
    if (!s.valid[t]) continue;
    if (on[t]) { if (up >= GAP) { cur = { t0: t, days: [] }; eps.push(cur); } if (cur) cur.days.push(t); up = 0; } else up++;
  }
  return eps;
}
function touchesOf(s) {
  const out = []; let above = 0;
  for (let t = 0; t < s.b.length; t++) {
    if (!s.valid[t]) continue;
    if (s.b[t] <= s.L) { if (above >= TOUCH_GAP) out.push(t); above = 0; } else above++;
  }
  return out;
}
function firstTouch(s, t) { for (let j = t; j < Math.min(s.b.length, t + H); j++) if (s.b[j] != null && s.b[j] <= s.L) return j; return -1; }
function firstSetup(s, t) { for (let j = t; j < Math.min(s.b.length, t + H); j++) if (s.state[j] === 'setup') return j; return -1; }

// ---------- domanda 1 ----------
// esito di un caso (ingresso o seduta)
function outcome(s, t, ris) {
  const u = firstTouch(s, t), z = firstSetup(s, t), full = t + H - 1 <= s.last;
  return { k: s.k, d: s.dates[t], t, ris, touch: u >= 0, touchKnown: full || u >= 0, setup: z >= 0, setupKnown: full || z >= 0, ret: forward(s.px, t, RET) };
}
function summarize(cases) {
  const tk = cases.filter((c) => c.touchKnown), sk = cases.filter((c) => c.setupKnown), ret = cases.map((c) => c.ret).filter((x) => x != null);
  return {
    casi: cases.length, senzaEsito: cases.length - tk.length,
    tocco126: `${tk.filter((c) => c.touch).length}/${tk.length}`, pTocco: pct(tk.filter((c) => c.touch).length, tk.length),
    zonaBlu126: `${sk.filter((c) => c.setup).length}/${sk.length}`, pZonaBlu: pct(sk.filter((c) => c.setup).length, sk.length),
    ret63Mediano: r1(median(ret)), ret63Positivi: `${ret.filter((x) => x > 0).length}/${ret.length}`,
  };
}
function compare(cases) {
  const R = summarize(cases.filter((c) => c.ris)), O = summarize(cases.filter((c) => !c.ris));
  return { risalita: R, altri: O, rapportoTocco: R.pTocco != null && O.pTocco ? r2(R.pTocco / O.pTocco) : null, rapportoZonaBlu: R.pZonaBlu != null && O.pZonaBlu ? r2(R.pZonaBlu / O.pZonaBlu) : null };
}
function q1(univ, K, X) {
  const entries = [], sessions = [], base = [];
  for (const s of univ) {
    const ris = risalita(s, K, X);
    for (const e of episodesOf(s, s.appr)) entries.push(outcome(s, e.t0, ris[e.t0]));
    for (let t = 0; t < s.b.length; t++) if (s.appr[t]) sessions.push(outcome(s, t, ris[t]));
    for (let t = 0; t < s.b.length; t++) if (s.valid[t]) { const x = forward(s.px, t, RET); if (x != null) base.push(x); }
  }
  const byHalf = (arr) => Object.fromEntries(HALVES.map(([h]) => [h, compare(arr.filter((c) => halfOf(c.d) === h))]));
  const byCrisis = (arr) => {
    const o = {};
    for (const c of arr) { const g = crisisOf(c.d); (o[g] = o[g] || []).push(c); }
    return Object.fromEntries([...CRISES.map(([g]) => g), 'altri periodi'].filter((g) => o[g]).map((g) => { const c = compare(o[g]); return [g, { risalita: `${c.risalita.tocco126}`, altri: `${c.altri.tocco126}` }]; }));
  };
  const byYear = (arr) => {
    const o = {};
    for (const c of arr.filter((c) => c.ris)) { const y = c.d.slice(0, 4); const x = (o[y] = o[y] || { casi: 0, tocco: 0, noti: 0, settori: new Set() }); x.casi++; x.settori.add(c.k); if (c.touchKnown) { x.noti++; if (c.touch) x.tocco++; } }
    return Object.fromEntries(Object.entries(o).sort().map(([y, x]) => [y, { casi: x.casi, toccano: `${x.tocco}/${x.noti}`, chi: [...x.settori].join(' ') }]));
  };
  const byUnit = (arr) => {
    const o = {};
    for (const c of arr) { const x = (o[c.k] = o[c.k] || []); x.push(c); }
    return Object.fromEntries(Object.entries(o).map(([k, a]) => { const c = compare(a); return [k, { risalita: `${c.risalita.tocco126} (${c.risalita.casi})`, altri: `${c.altri.tocco126} (${c.altri.casi})` }]; }));
  };
  return {
    ingressi: { tutto: compare(entries), perMeta: byHalf(entries), perCrisi: byCrisis(entries), risalitaPerAnno: byYear(entries), perSerie: byUnit(entries),
      elencoRisalita: entries.filter((c) => c.ris).map((c) => `${c.k} ${c.d}: tocco ${c.touchKnown ? (c.touch ? 'sì' : 'no') : 'senza esito'}, zona blu ${c.setupKnown ? (c.setup ? 'sì' : 'no') : 'senza esito'}, 63 sedute ${c.ret == null ? '—' : r1(c.ret) + '%'}`) },
    sedute: { tutto: compare(sessions), perMeta: byHalf(sessions), perCrisi: byCrisis(sessions), risalitaPerAnno: byYear(sessions),
      episodiConRisalita: (() => { let n = 0; for (const s of univ) { const ris = risalita(s, K, X); n += episodesOf(s, s.appr).filter((e) => e.days.some((t) => ris[t])).length; } return n; })() },
    base: { sedute: base.length, ret63Mediano: r1(median(base)), ret63Positivi: pct(base.filter((x) => x > 0).length, base.length) },
  };
}

// ---------- domanda 2 ----------
function evaluate(univ, onOf, withWatch = false) {
  const T = { eps: 0, hit: 0, known: 0, hitKnown: 0, leads: [], touches: 0, warned: 0, days: 0, valid: 0, short: 0, ret: [], missed: [], per: {} };
  for (const [h] of HALVES) T.per[h] = { touches: 0, warned: 0, days: 0, valid: 0 };
  const warnedSet = new Set();
  for (const s of univ) {
    const base = onOf(s), on = withWatch ? base.map((v, t) => v || (s.valid[t] && s.state[t] === 'watch')) : base;
    const eps = episodesOf(s, on), touches = touchesOf(s);
    for (const e of eps) {
      T.eps++;
      const u = firstTouch(s, e.t0);
      if (u >= 0) { T.hit++; T.leads.push(u - e.t0); }
      if (u >= 0 || e.t0 + H - 1 <= s.last) { T.known++; if (u >= 0) T.hitKnown++; }
      if (e.days.length <= 2) T.short++;
      const r = forward(s.px, e.t0, RET); if (r != null) T.ret.push(r);
    }
    for (const u of touches) {
      const h = halfOf(s.dates[u]);
      T.touches++; T.per[h].touches++;
      if (eps.some((e) => e.t0 <= u - LEAD && u - e.t0 <= H)) { T.warned++; T.per[h].warned++; warnedSet.add(`${s.k} ${s.dates[u]}`); } else T.missed.push(`${s.k} ${s.dates[u]}`);
    }
    for (let t = 0; t < s.b.length; t++) if (s.valid[t]) { const h = halfOf(s.dates[t]); T.valid++; T.per[h].valid++; if (on[t]) { T.days++; T.per[h].days++; } }
  }
  return {
    allarmi: T.eps, arrivano: T.hit, quotaArrivano: pct(T.hit, T.eps), quotaArrivanoConEsito: `${T.hitKnown}/${T.known} (${pct(T.hitKnown, T.known)}%)`,
    anticipoMediano: medLow(T.leads), tocchiAvvisati: `${T.warned}/${T.touches}`, tocchiAvvisatiN: T.warned,
    quotaSeduteAccese: pct(T.days, T.valid), seduteAccese: T.days, episodi1_2: T.short, quotaEpisodi1_2: pct(T.short, T.eps),
    ret63Mediano: r1(median(T.ret)),
    perMeta: Object.fromEntries(Object.entries(T.per).map(([h, x]) => [h, { tocchiAvvisati: `${x.warned}/${x.touches}`, quotaSeduteAccese: pct(x.days, x.valid) }])),
    _warned: warnedSet,
  };
}
function criterion(a, v, aw, vw) {
  const c1 = v.tocchiAvvisatiN >= a.tocchiAvvisatiN - 2, c1w = vw.tocchiAvvisatiN >= aw.tocchiAvvisatiN - 2;
  const c2 = v.quotaArrivano >= a.quotaArrivano;
  const dDays = r1(100 * (1 - v.quotaSeduteAccese / a.quotaSeduteAccese)), dShort = r1(100 * (1 - v.quotaEpisodi1_2 / a.quotaEpisodi1_2));
  const c3 = dDays >= 20 || dShort >= 100 / 3;
  return { tocchiPersiDaSola: a.tocchiAvvisatiN - v.tocchiAvvisatiN, tocchiPersiConAttenzione: aw.tocchiAvvisatiN - vw.tocchiAvvisatiN,
    riduzioneSeduteAccesePct: dDays, riduzioneQuotaEpisodi1_2Pct: dShort,
    riduzioneEpisodi1_2Numero: `${a.episodi1_2} → ${v.episodi1_2}`,
    ok: { tocchiDaSola: c1, tocchiConAttenzione: c1w, arrivanoNonScende: c2, menoAccesoOMenoBrevi: c3 }, migliore: c1 && c1w && c2 && c3 };
}
// tocchi persi: con la data, gli ingressi attuali che li avvisavano (e se erano «risalita») e cosa resta nella variante
function lostTouches(univ, K, X, withWatch) {
  const out = [];
  for (const s of univ) {
    const ris = risalita(s, K, X), onV = s.appr.map((v, t) => v && !ris[t]);
    const W = (on) => (withWatch ? on.map((v, t) => v || (s.valid[t] && s.state[t] === 'watch')) : on);
    const eA = episodesOf(s, W(s.appr)), eV = episodesOf(s, W(onV));
    const inWin = (e, u) => e.t0 <= u - LEAD && u - e.t0 <= H;
    for (const u of touchesOf(s)) {
      const a = eA.filter((e) => inWin(e, u)), v = eV.filter((e) => inWin(e, u));
      if (!a.length || v.length) continue;
      const near = eV.filter((e) => e.t0 <= u && u - e.t0 <= H).map((e) => `${s.dates[e.t0]} (${u - e.t0} sedute prima)`);
      const why = a.map((e) => `ingresso attuale ${s.dates[e.t0]} ${ris[e.t0] ? 'in «risalita» (spento)' : `non in risalita, ma l'episodio si spezza: le sedute in risalita spente cambiano gli ingressi`}`);
      out.push({ serie: s.k, tocco: s.dates[u], motivo: why.join('; '), ingressiVarianteVicini: near.length ? near.join(', ') + ' (meno di 5 sedute di anticipo)' : 'nessuno' });
    }
  }
  return out;
}
function q2(univ, K, X) {
  const cur = (s) => s.appr, varr = (s) => { const r = risalita(s, K, X); return s.appr.map((v, t) => v && !r[t]); };
  const a = evaluate(univ, cur), v = evaluate(univ, varr), aw = evaluate(univ, cur, true), vw = evaluate(univ, varr, true);
  const gained = (x, y) => [...y._warned].filter((z) => !x._warned.has(z));
  const strip = (o) => { const { _warned, missed, ...r } = o; return r; };
  return {
    attuale: strip(a), variante: strip(v), attualeOAttenzione: strip(aw), varianteOAttenzione: strip(vw),
    criterio: criterion(a, v, aw, vw),
    tocchiPersi: { daSola: lostTouches(univ, K, X, false), conAttenzione: lostTouches(univ, K, X, true) },
    tocchiGuadagnati: { daSola: gained(a, v), conAttenzione: gained(aw, vw) },
  };
}

// ---------- controlli ----------
const checks = {};
{
  const pit = R('ricerca/attenzione/avvicinamento_pit.json').regole, piti = R('ricerca/attenzione/avvicinamento_pit_indici.json').regole;
  const cS = evaluate(SECT, (s) => s.appr), dS = evaluate(SECT, (s) => s.appr, true), cI = evaluate(INDX, (s) => s.appr), dI = evaluate(INDX, (s) => s.appr, true);
  const C = pit['C. B + stato Normale (app)'], D = pit['D. C oppure Attenzione'], Ci = piti['C. B + stato Normale (app)'], Di = piti['D. C oppure Attenzione'];
  checks.regolaAttualeComeAvvicinamentoPit = {
    settori: { qui: [cS.allarmi, cS.arrivano, cS.anticipoMediano, cS.tocchiAvvisati, dS.tocchiAvvisati], pit: [C.allarmi, C.arrivanoAlBlu, C.anticipoMediano, C.tocchiAvvisati, D.tocchiAvvisati] },
    indici: { qui: [cI.allarmi, Math.round(cI.quotaArrivano), cI.anticipoMediano, cI.tocchiAvvisati, dI.tocchiAvvisati], pit: [Ci.allarmi, Ci.quotaArrivano, Ci.anticipoMediano, Ci.tocchiAvvisati, Di.tocchiAvvisati] },
  };
  for (const u of Object.values(checks.regolaAttualeComeAvvicinamentoPit)) u.uguali = JSON.stringify(u.qui) === JSON.stringify(u.pit);
  let n = 0, diff = 0, on = 0;
  for (const s of [...SECT, ...INDX]) for (const [K, X] of GRID) { const a = risalita(s, K, X), b2 = risalita2(s, K, X); a.forEach((x, t) => { n++; if (x !== b2[t]) diff++; if (x && K === 20 && X === 10) on++; }); }
  checks.risalitaDueCodici = { confronti: n, diversi: diff, seduteRisalitaPrincipale: on };
  checks.seduteSenzaStatoNelPeriodo = [...SECT, ...INDX].reduce((a, s) => a + s.b.filter((v, t) => s.valid[t] && s.m.days[t] == null).length, 0);
  checks.inizio = { settori: Object.fromEntries(SECT.map((s) => [s.k, s.dates[s.start]])), indiciPrimo: INDX.map((s) => s.dates[s.start]).sort()[0], indiciUltimo: INDX.map((s) => s.dates[s.start]).sort().at(-1) };
  checks.ultimaSeduta = { settori: sec.dates[Math.max(...SECT.map((s) => s.last))] };
}

// ---------- esempio XLRE ----------
const xlre = (() => {
  const s = SECT.find((x) => x.k === 'XLRE'), ris = risalita(s, MAIN.K, MAIN.X), out = [];
  for (let t = s.last - 40; t <= s.last; t++) out.push(`${s.dates[t]} b=${r1(s.b[t])} soglia=${r1(s.A[t])} stato=${s.state[t]}${s.appr[t] ? ' AVV' : ''}${ris[t] ? ' RISALITA' : ''}`);
  return out;
})();

// ---------- uscita ----------
const out = { asOf: checks.ultimaSeduta.settori, metodo: 'vedi testa dello script', controlli: checks, principale: MAIN, settori: {}, indici: {}, xlreUltime40: xlre };
for (const [K, X] of GRID) {
  const key = `K${K}_X${X}`;
  out.settori[key] = { domanda1: q1(SECT, K, X), domanda2: q2(SECT, K, X) };
  out.indici[key] = { domanda1: q1(INDX, K, X), domanda2: q2(INDX, K, X) };
}
fs.writeFileSync(new URL('../risalita.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');

// stampa
console.log('controlli', JSON.stringify(checks, null, 1));
const line = (o) => `${o.casi} casi (senza esito ${o.senzaEsito}) · tocco ${o.tocco126} = ${o.pTocco}% · zona blu ${o.zonaBlu126} = ${o.pZonaBlu}% · 63s ${o.ret63Mediano}% (pos ${o.ret63Positivi})`;
for (const U of ['settori', 'indici']) for (const [K, X] of GRID) {
  const key = `K${K}_X${X}`, d1 = out[U][key].domanda1, d2 = out[U][key].domanda2;
  console.log(`\n===== ${U} ${key} =====`);
  for (const unit of ['ingressi', 'sedute']) {
    const c = d1[unit].tutto;
    console.log(` D1 ${unit}: risalita ${line(c.risalita)}\n    ${' '.repeat(unit.length)}  altri    ${line(c.altri)}\n    rapporto tocco ${c.rapportoTocco} · zona blu ${c.rapportoZonaBlu}`);
    for (const [h, x] of Object.entries(d1[unit].perMeta)) console.log(`    ${h}: risalita ${x.risalita.tocco126} (${x.risalita.pTocco}%) · altri ${x.altri.tocco126} (${x.altri.pTocco}%) · rapporto ${x.rapportoTocco} · zona blu ${x.risalita.zonaBlu126} vs ${x.altri.zonaBlu126}`);
  }
  console.log('    base 63s', JSON.stringify(d1.base), '· episodi con almeno una seduta in risalita', d1.sedute.episodiConRisalita);
  if (key === 'K20_X10') { console.log('    ingressi per crisi (tocco risalita | altri)', JSON.stringify(d1.ingressi.perCrisi)); console.log('    sedute per crisi', JSON.stringify(d1.sedute.perCrisi)); console.log('    ingressi per serie', JSON.stringify(d1.ingressi.perSerie)); console.log('    ingressi in risalita per anno', JSON.stringify(d1.ingressi.risalitaPerAnno)); console.log('    sedute in risalita per anno', JSON.stringify(d1.sedute.risalitaPerAnno)); }
  for (const r of ['attuale', 'variante', 'attualeOAttenzione', 'varianteOAttenzione']) { const x = d2[r]; console.log(` D2 ${r.padEnd(20)} allarmi ${x.allarmi} arrivano ${x.arrivano} (${x.quotaArrivano}%; con esito ${x.quotaArrivanoConEsito}) anticipo ${x.anticipoMediano} tocchi ${x.tocchiAvvisati} sedute ${x.quotaSeduteAccese}% ep1-2 ${x.episodi1_2} (${x.quotaEpisodi1_2}%) ret ${x.ret63Mediano}`); }
  console.log('    criterio', JSON.stringify(d2.criterio));
  console.log('    persi', JSON.stringify(d2.tocchiPersi), 'guadagnati', JSON.stringify(d2.tocchiGuadagnati));
}
console.log('\nXLRE', xlre.slice(-12).join('\n'));
