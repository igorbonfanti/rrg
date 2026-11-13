#!/usr/bin/env node
/*
 * analisi.mjs — ricerca SOXX, passo 2: breadth a 200 sedute dei membri del SOXX, livello blu 3% (con 5% e 10%),
 * macchina a stati dell'app, drawdown e bias dei membri di oggi. Non modifica l'app.
 *
 * Regola della breadth: quella dell'app per gli indici, con le funzioni dell'app importate da scripts/fetch_indices.js:
 *   clean() per gli errori di scala di Yahoo e countDay() per i conteggi (chiusura rettificata per gli split, non per i
 *   dividendi; un titolo è «sopra» se ha almeno 200 sedute e chiude sopra la sua media a 200 sedute; il denominatore n
 *   conta i membri con un'ultima seduta entro 5 giorni, anche quelli con meno di 200 sedute, che contano «sotto»).
 *   È la stessa regola di breadth_for() in scripts/backfill_indices.py (ricostruzione storica degli indici).
 * Composizione: membri di oggi del SOXX (membri_oggi.json, da scarica.mjs) su tutta la storia, come gli indici
 *   «membri di oggi» dell'app. Inizio con la regola dell'app per gli indici con limiti (backfill_indices.py): mese dopo la
 *   prima seduta in cui almeno il 60% dei membri di oggi ha 200 sedute di prezzi.
 * Macchina a stati: runMachine() di js/signals.js con i parametri di config/thresholds.json; prezzo = chiusura del SOXX
 *   rettificata per i dividendi (come gli ETF dei settori, priceSeries); variante con il solo prezzo e variante con il
 *   prezzo dell'indice ^SOX dal 1994 (come gli indici, percentile del drawdown su una storia più lunga).
 * Rendimenti dalla chiusura del giorno del segnale (regola dell'app), sulla chiusura rettificata del SOXX, a 21/63/126/252
 *   sedute; base: tutte le sedute dalla prima con uno stato (signalContext dell'app). Peggior calo: worstWithin dell'app.
 * Nessun dato del futuro: il percentile del drawdown è quello dell'app (solo sedute precedenti); il 3° percentile della
 *   breadth «fino a quel giorno» è calcolato a finestra crescente. I livelli 3/5/10% sono fissi: il 3% è la scelta di
 *   Massimo Rea (quant-rea, «Analisi SOXX: Above/Below 200 MA & Drawdown»), fatta conoscendo la storia.
 * Bias: membri di oggi con prezzi alle date chiave; confronto con le fotografie del SOX nelle versioni storiche di
 *   Wikipedia (composizioni.json): breadth con i membri della fotografia (quelli con prezzi su Yahoo) contro i membri di
 *   oggi, nelle sedute fino alla fotografia successiva; serie «a fotografie» dal 30/11/2005 con la macchina a stati.
 *
 * Uso: node ricerca/soxx/dati/script/analisi.mjs CACHE_DIR   → ricerca/soxx/dati/risultati.json e breadth_soxx.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clean, countDay } from '../../../../scripts/fetch_indices.js';
import { priceSeries, runMachine, forward, worstWithin, median, signalContext } from '../../../../js/signals.js';
import { drawdown, depthPercentile } from '../../../../js/metrics.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..');
const ROOT = path.resolve(HERE, '../../../..');
const cache = process.argv[2];
if (!cache) { console.error('uso: node analisi.mjs CACHE_DIR'); process.exit(1); }
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/thresholds.json'), 'utf-8')).params;
const load = (s) => {
  const f = path.join(cache, encodeURIComponent(s) + '.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : null;
};
const DAY = 864e5;
const addDays = (d, k) => new Date(Date.parse(d) + k * DAY).toISOString().slice(0, 10);
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const HZ = [21, 63, 126, 252], HZN = ['1M', '3M', '6M', '12M'];
const LEVELS = [3, 5, 10];

// ---------- dati ----------
const today = JSON.parse(fs.readFileSync(path.join(OUT, 'membri_oggi.json'), 'utf-8'));
const comp = JSON.parse(fs.readFileSync(path.join(OUT, 'composizioni.json'), 'utf-8'));
const soxx = load('SOXX'), sox = load('^SOX');
const px = {}, firstDate = {}, lastDate = {};
function addPx(s) {
  if (px[s] !== undefined) return;
  const j = load(s);
  if (!j || !j.dates.length) { px[s] = null; return; }
  px[s] = clean(j.dates, j.close);
  firstDate[s] = px[s].dates[0]; lastDate[s] = px[s].dates.at(-1);
}
for (const s of today.tickers) addPx(s);

// calendario: sedute del SOXX
const cal = soxx.dates, N = cal.length;
const pos = new Map(cal.map((d, i) => [d, i]));

// titoli con almeno 200 sedute di prezzi e ultima seduta entro 5 giorni (la media a 200 si può calcolare)
function eligible(members, d) {
  let k = 0;
  for (const s of members) {
    const p = px[s];
    if (!p) continue;
    let lo = 0, hi = p.dates.length - 1, j = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (p.dates[m] <= d) { j = m; lo = m + 1; } else hi = m - 1; }
    if (j >= 199 && (Date.parse(d) - Date.parse(p.dates[j])) / DAY <= 5) k++;
  }
  return k;
}
// breadth sulle sedute del calendario dall'indice i0 (membri fissi o funzione della data)
function breadth(membersAt, i0 = 0, i1 = N) {
  const out = { members: [], n: [], elig: [], a20: [], a50: [], a200: [], pct20: [], pct50: [], pct200: [] };
  for (const k of Object.keys(out)) out[k] = new Array(N).fill(null);
  for (let i = i0; i < i1; i++) {
    const d = cal[i], mem = typeof membersAt === 'function' ? membersAt(d) : membersAt;
    const r = countDay(mem, px, d);
    out.members[i] = r.members; out.n[i] = r.n; out.a20[i] = r.a20; out.a50[i] = r.a50; out.a200[i] = r.a200;
    out.elig[i] = eligible(mem, d);
    if (r.n) { out.pct20[i] = (100 * r.a20) / r.n; out.pct50[i] = (100 * r.a50) / r.n; out.pct200[i] = (100 * r.a200) / r.n; }
  }
  return out;
}

// ---------- 1. breadth con i membri di oggi ----------
const B = breadth(today.tickers);
// inizio con la regola dell'app (indici con limiti): mese dopo la prima seduta con almeno il 60% dei membri con 200 sedute
const iCov = B.elig.findIndex((e, i) => e != null && e >= 0.6 * B.members[i]);
const startApp = cal.find((d, i) => i > iCov && d.slice(0, 7) > cal[iCov].slice(0, 7));
const i0 = pos.get(startApp);
const BR = { pct200: B.pct200.map((v, i) => (i < i0 ? null : v)), pct50: B.pct50.map((v, i) => (i < i0 ? null : v)),
  pct20: B.pct20.map((v, i) => (i < i0 ? null : v)), n: B.n.map((v, i) => (i < i0 ? null : v)) };

// ---------- membri: disponibilità dei prezzi ----------
const keyDates = ['2001-07-13', '2002-10-09', '2008-01-02', '2008-11-20', '2015-01-02', '2020-01-02', '2022-10-13', '2025-04-08'];
// copertura: sedute del SOXX (dal 13/07/2001) tra la prima e l'ultima seduta del titolo che mancano nei suoi prezzi;
// chiusure tolte o riscalate da clean() (errori di scala di Yahoo)
const calSet = new Set(cal);
const memberInfo = today.membri.map((m) => {
  const j = load(m.ticker), p = px[m.ticker];
  let miss = 0, missList = [];
  if (p) {
    const own = new Set(p.dates);
    for (const d of cal) if (d >= p.dates[0] && d <= p.dates.at(-1) && !own.has(d)) { miss++; if (missList.length < 5) missList.push(d); }
  }
  const tolte = j && p ? j.dates.length - p.dates.length : null;
  const riscalate = j && p ? j.dates.filter((d, i) => { const k = p.dates.indexOf(d); return k >= 0 && Math.abs(p.close[k] / j.close[i] - 1) > 1e-9; }).length : null;
  return { ...m, primaSeduta: firstDate[m.ticker] || null, ultimaSeduta: lastDate[m.ticker] || null, sedute: p ? p.dates.length : 0,
    seduteSOXXMancanti: miss, esempiMancanti: missList, chiusureTolteDaClean: tolte, chiusureRiscalateDaClean: riscalate };
});
// calendario del SOXX contro quello di ^SOX (sedute di borsa USA) dal 13/07/2001
const soxSet = new Set(load('^SOX').dates.filter((d) => d >= cal[0]));
const calendario = { soxxSenzaSOX: cal.filter((d) => !soxSet.has(d)), soxSenzaSOXX: [...soxSet].filter((d) => !calSet.has(d)) };
const availability = keyDates.map((d) => {
  const i = pos.get(d) ?? cal.findIndex((x) => x >= d);
  const withPx = today.tickers.filter((s) => firstDate[s] && firstDate[s] <= d);
  const missing = today.tickers.filter((s) => !(firstDate[s] && firstDate[s] <= d)).map((s) => `${s} (${firstDate[s] || 'nessun prezzo'})`);
  return { data: d, membri: today.tickers.length, conPrezzi: withPx.length, con200Sedute: eligible(today.tickers, cal[i]), mancanti: missing };
});

// ---------- prezzo e macchina ----------
const adj = soxx.adjclose, raw = soxx.close;
const PXA = priceSeries(adj), PXR = priceSeries(raw);
// variante come gli indici: prezzo di ^SOX (solo prezzo) dal 1994, sullo stesso calendario del SOXX per la macchina; il
// percentile del drawdown usa tutta la storia di ^SOX fino a quel giorno
const soxPos = new Map(sox.dates.map((d, i) => [d, i]));
const soxDD = drawdown(sox.close), soxDP = depthPercentile(soxDD);
const PXS = { close: cal.map((d) => (soxPos.has(d) ? sox.close[soxPos.get(d)] : null)), dd: cal.map((d) => (soxPos.has(d) ? soxDD[soxPos.get(d)] : null)),
  dp: cal.map((d) => (soxPos.has(d) ? soxDP[soxPos.get(d)] : null)) };

function machine(px, br, L, retClose = adj) {
  const m = runMachine(px, br, L, P);
  const first = m.days.findIndex((x) => x != null);
  const ev = m.events.map((e) => ({ data: cal[e.t], t: e.t, code: e.code }));
  const trigT = m.events.filter((e) => e.code === 'trig').map((e) => e.t);
  const setupT = m.setups.map((s) => s.t);
  const ctx = signalContext(retClose, { trig: trigT, setup: setupT }, first, HZ);
  const episodi = m.setups.map((s) => {
    const trigs = m.events.filter((e) => e.code === 'trig' && e.setup === s).map((e) => e.t);
    const fails = m.events.filter((e) => e.code === 'fail' && e.setup === s).map((e) => e.t);
    const last = s.trig ? s.trig.t : null; // ultimo trigger rimasto valido (null se fallito o mai arrivato)
    const ret = (t) => (t == null ? null : Object.fromEntries(HZ.map((h, k) => [HZN[k], r1(forward(retClose, t, h))])));
    return {
      zonaBlu: cal[s.t], breadthIngresso: r1(br.pct200[s.t]), nIngresso: br.n[s.t], ddIngresso: r1(px.dd[s.t]), pctDD: px.dp[s.t],
      minBreadth: r1(s.bmin), dataMinBreadth: cal[s.tb], dataMinPrezzo: cal[s.tp],
      trigger: trigs.map((t) => cal[t]), falliti: fails.map((t) => cal[t]), ultimoTriggerValido: last == null ? null : cal[last],
      rendDaZonaBlu: ret(s.t), peggiorCalo63DaZonaBlu: r1(worstWithin(retClose, s.t, 63)), peggiorCalo252DaZonaBlu: r1(worstWithin(retClose, s.t, 252)),
      rendDaPrimoTrigger: ret(trigs[0] ?? null), peggiorCalo63DaPrimoTrigger: trigs.length ? r1(worstWithin(retClose, trigs[0], 63)) : null,
      peggiorCalo252DaPrimoTrigger: trigs.length ? r1(worstWithin(retClose, trigs[0], 252)) : null,
      rendDaUltimoTrigger: ret(last),
    };
  });
  const ctxOut = ctx.map((r) => ({ gruppo: r.key, n: r.n, mediane: Object.fromEntries(HZN.map((h, k) => [h, r1(r.med[k])])), positiviA3M: r.pos }));
  // peggior calo nelle 63 e 252 sedute: mediana di tutte le sedute (base)
  const wAll63 = [], wAll252 = [];
  for (let t = first; t < N; t++) { if (t + 63 < N) wAll63.push(worstWithin(retClose, t, 63)); if (t + 252 < N) wAll252.push(worstWithin(retClose, t, 252)); }
  const statoOggi = m.days[N - 1];
  return { livello: L, primaSedutaConStato: cal[first], zoneBlu: m.setups.length, trigger: trigT.length,
    falliti: m.events.filter((e) => e.code === 'fail').length, episodiConTrigger: m.setups.filter((s) => m.events.some((e) => e.code === 'trig' && e.setup === s)).length,
    contesto: ctxOut, basePeggiorCalo: { mediana63: r1(median(wAll63)), mediana252: r1(median(wAll252)) }, statoOggi, eventi: ev, episodi };
}

// discese «grezze» sotto il livello: tratti con la breadth ≤ L, uniti finché la breadth non torna sopra il livello di riarmo
function rawEpisodes(pct, L, from = 0) {
  const reset = Math.max(P.resetFloor, L + P.resetAbove), out = [];
  let cur = null, armed = true;
  for (let i = from; i < N; i++) {
    const b = pct[i];
    if (b == null) continue;
    if (b >= reset) { armed = true; if (cur) { out.push(cur); cur = null; } }
    if (b <= L) {
      if (!cur && armed) { cur = { inizio: cal[i], fine: cal[i], sedute: 0, min: b, dataMin: cal[i] }; armed = false; }
      if (cur) { cur.fine = cal[i]; cur.sedute++; if (b < cur.min) { cur.min = b; cur.dataMin = cal[i]; } }
    }
  }
  if (cur) out.push(cur);
  return out.map((e) => ({ ...e, min: r1(e.min) }));
}

const valid = (from) => { const v = []; for (let i = from; i < N; i++) if (BR.pct200[i] != null) v.push(BR.pct200[i]); return v; };
function share(L, fromD) { const i = cal.findIndex((d) => d >= fromD); const v = valid(Math.max(i, i0)); return { sedute: v.length, sotto: v.filter((x) => x <= L).length, quota: r2((100 * v.filter((x) => x <= L).length) / v.length) }; }
function pctile(v, q) { const s = [...v].sort((a, b) => a - b); return s[Math.floor(q * (s.length - 1))]; }
// 3° percentile della breadth con i soli dati fino a quel giorno (finestra crescente, almeno 252 sedute)
const p3pit = new Array(N).fill(null);
{ const s = []; for (let i = i0; i < N; i++) { const b = BR.pct200[i]; if (b == null) continue; let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] <= b) lo = m + 1; else hi = m; } s.splice(lo, 0, b); if (s.length >= 252) p3pit[i] = s[Math.floor(0.03 * (s.length - 1))]; } }

// finestre delle crisi: minimo della breadth, membri, prezzi
const CRISI = [['2001-07-13', '2003-03-31', 'dot-com 2001-2003'], ['2008-09-01', '2009-03-31', 'crisi 2008-2009'], ['2011-07-01', '2011-12-31', 'agosto 2011'],
  ['2015-07-01', '2016-03-31', '2015-2016'], ['2018-10-01', '2019-01-31', 'fine 2018'], ['2020-02-15', '2020-04-30', 'Covid 2020'],
  ['2022-05-01', '2022-12-31', '2022'], ['2024-07-01', '2024-09-30', 'estate 2024'], ['2025-03-01', '2025-05-31', 'aprile 2025']];
const crisi = CRISI.map(([a, b, nome]) => {
  let best = null;
  for (let i = i0; i < N; i++) if (cal[i] >= a && cal[i] <= b && BR.pct200[i] != null && (best == null || BR.pct200[i] < BR.pct200[best])) best = i;
  if (best == null) return { nome, da: a, a: b, nota: 'nessun dato' };
  let pmin = null;
  for (let i = 0; i < N; i++) if (cal[i] >= a && cal[i] <= b && (pmin == null || adj[i] < adj[pmin])) pmin = i;
  const sotto = (L) => { let k = 0; for (let i = 0; i < N; i++) if (cal[i] >= a && cal[i] <= b && BR.pct200[i] != null && BR.pct200[i] <= L) k++; return k; };
  return { nome, da: a, a: b, minBreadth: r1(BR.pct200[best]), data: cal[best], sopra: B.a200[best], n: B.n[best], con200Sedute: B.elig[best],
    seduteA0: sotto(0), seduteSotto3: sotto(3), seduteSotto5: sotto(5), seduteSotto10: sotto(10), p3FinoAQuelGiorno: r1(p3pit[best]),
    minimoPrezzoSOXX: cal[pmin], ddAlMinimo: r1(PXA.dd[pmin]), pctDDAlMinimo: PXA.dp[pmin] };
});

// ---------- 2. bias: fotografie Wikipedia del SOX ----------
const snaps = comp.wikipedia.map((w) => {
  const list = w.membri ? w.membri.map((m) => m.yahoo) : w.tickers.map((t) => (w.yahooAlias || {})[t] || t);
  const listed = w.membri ? w.membri.length : w.tickers.length;
  const used = [], dropped = [];
  for (const s of list) {
    if (!s) { dropped.push('(uscita dal listino, nessun simbolo)'); continue; }
    addPx(s);
    if (!px[s]) dropped.push(`${s}: nessun prezzo su Yahoo`);
    else if (firstDate[s] > addDays(w.data, 10)) dropped.push(`${s}: prezzi dal ${firstDate[s]}, dopo la data della lista (simbolo riusato o storia ricominciata)`);
    else used.push(s);
  }
  return { rev: w.rev, url: w.url, data: w.data, elencati: listed, conPrezzi: used.length, usati: used, esclusi: dropped };
});
const ends = snaps.map((s, k) => (k + 1 < snaps.length ? snaps[k + 1].data : cal[N - 1]));
const confronto = snaps.map((s, k) => {
  const a = cal.findIndex((d) => d >= s.data), b = cal.findIndex((d) => d >= ends[k]);
  const S = breadth(s.usati, a, b < 0 ? N : b);
  const diff = [], low = [];
  let n3o = 0, n3s = 0, minO = null, minS = null;
  for (let i = a; i < (b < 0 ? N : b); i++) {
    if (S.pct200[i] == null || B.pct200[i] == null) continue;
    const d = B.pct200[i] - S.pct200[i];
    diff.push(d); if (S.pct200[i] < 20) low.push(d);
    if (B.pct200[i] <= 3) n3o++; if (S.pct200[i] <= 3) n3s++;
    if (minO == null || B.pct200[i] < B.pct200[minO]) minO = i; if (minS == null || S.pct200[i] < S.pct200[minS]) minS = i;
  }
  const mean = (v) => (v.length ? v.reduce((x, y) => x + y, 0) / v.length : null);
  return { fotografia: s.data, fino: ends[k], sedute: diff.length, elencati: s.elencati, conPrezzi: s.conPrezzi, esclusi: s.esclusi,
    scartoMedio: r1(mean(diff)), scartoMediano: r1(median(diff)), scartoMin: r1(Math.min(...diff)), scartoMax: r1(Math.max(...diff)),
    seduteFotografiaSotto20: low.length, scartoMedioSotto20: r1(mean(low)),
    minimoMembriOggi: minO == null ? null : { data: cal[minO], breadth: r1(B.pct200[minO]) }, minimoFotografia: minS == null ? null : { data: cal[minS], breadth: r1(S.pct200[minS]) },
    seduteSotto3MembriOggi: n3o, seduteSotto3Fotografia: n3s };
});
// serie «a fotografie»: ogni seduta dal 30/11/2005 con i membri dell'ultima fotografia (con prezzi) a quella data
const at = (d) => { let k = -1; snaps.forEach((s, j) => { if (s.data <= d) k = j; }); return k < 0 ? [] : snaps[k].usati; };
const iSnap = cal.findIndex((d) => d >= snaps[0].data);
const BS = breadth(at, iSnap);
const BRS = { pct200: BS.pct200, pct50: BS.pct50, pct20: BS.pct20, n: BS.n };
// per il confronto, la serie dei membri di oggi dallo stesso giorno
const cut = (o) => ({ pct200: o.pct200.map((v, i) => (i < iSnap ? null : v)), pct50: o.pct50.map((v, i) => (i < iSnap ? null : v)),
  pct20: o.pct20.map((v, i) => (i < iSnap ? null : v)), n: o.n.map((v, i) => (i < iSnap ? null : v)) });
const brief = (m) => ({ livello: m.livello, zoneBlu: m.zoneBlu, trigger: m.trigger, falliti: m.falliti,
  episodi: m.episodi.map((e) => ({ zonaBlu: e.zonaBlu, min: e.minBreadth, trigger: e.trigger, falliti: e.falliti, rend12MDaZonaBlu: e.rendDaZonaBlu['12M'] })) });

// ---------- 3. risultati ----------
const lastI = N - 1;
const res = {
  generato: new Date().toISOString().slice(0, 10),
  metodo: 'vedi testa di script/analisi.mjs e README.md',
  parametri: P,
  holdings: { fonte: today.fonte, asOf: today.asOf, titoli: today.count },
  membri: memberInfo,
  calendario,
  soxx: { prima: cal[0], ultima: cal[lastI], sedute: N,
    // salti giornalieri oltre il 25% della chiusura solo prezzo (frazionamenti non rettificati) e rapporto rettificata/solo prezzo
    saltiOltre25: raw.map((c, i) => (i && Math.abs(c / raw[i - 1] - 1) > 0.25 ? { data: cal[i], var: r1((c / raw[i - 1] - 1) * 100) } : null)).filter(Boolean),
    rapportoRettificataPrimaSeduta: r2(adj[0] / raw[0]) },
  disponibilita: availability,
  breadth: { inizioRegolaApp: startApp, primaSedutaCoperta60: cal[iCov], primaSedutaSOXX: cal[0], ultimaSeduta: cal[lastI],
    oggi: { data: cal[lastI], sopra: B.a200[lastI], n: B.n[lastI], con200Sedute: B.elig[lastI], pct200: r1(B.pct200[lastI]) },
    minimoN: (() => { let m = null; for (let i = i0; i < N; i++) if (m == null || B.n[i] < B.n[m]) m = i; return { data: cal[m], n: B.n[m] }; })(),
    nPerAnno: Object.fromEntries([...new Set(cal.slice(i0).map((d) => d.slice(0, 4)))].map((y) => { const i = cal.findIndex((d) => d.slice(0, 4) === y && pos.get(d) >= i0); return [y, { n: B.n[i], con200Sedute: B.elig[i] }]; })),
    percentiliTuttaLaStoria: { p1: r1(pctile(valid(i0), 0.01)), p3: r1(pctile(valid(i0), 0.03)), p5: r1(pctile(valid(i0), 0.05)), p10: r1(pctile(valid(i0), 0.10)) },
    p3FinoAOggi: r1(p3pit[lastI]),
    quotaSedute: Object.fromEntries(LEVELS.map((L) => [L, { dalInizio: share(L, startApp), dal2008: share(L, '2008-01-01') }])),
    seduteA0: share(0, startApp),
  },
  crisi,
  discese: Object.fromEntries(LEVELS.map((L) => [L, { dalInizio: rawEpisodes(BR.pct200, L, i0), dal2008: rawEpisodes(BR.pct200, L, cal.findIndex((d) => d >= '2008-01-01')) }])),
  macchina: {
    soxxRettificato: LEVELS.map((L) => machine(PXA, BR, L, adj)),
    soxxSoloPrezzo: LEVELS.map((L) => brief(machine(PXR, BR, L, raw))),
    indiceSOX: LEVELS.map((L) => brief(machine(PXS, BR, L, PXS.close))),
  },
  drawdown: {
    oggi: { data: cal[lastI], rettificato: r1(PXA.dd[lastI]), pctRettificato: PXA.dp[lastI], soloPrezzo: r1(PXR.dd[lastI]), pctSoloPrezzo: PXR.dp[lastI],
      sox: { data: sox.dates.at(-1), dd: r1(soxDD.at(-1)), pct: soxDP.at(-1), storiaDal: sox.dates[0] } },
    soxxStoriaDal: cal[0], percentileDaSeduta: cal[PXA.dp.findIndex((x) => x != null)],
    peggiori: (() => { const v = PXA.dd.map((x, i) => [x, i]).filter(([x]) => x != null); v.sort((a, b) => a[0] - b[0]); return v.slice(0, 1).map(([x, i]) => ({ data: cal[i], dd: r1(x) })); })(),
    soglie: { p70: r1(pctile(PXA.dd.filter((x) => x != null).map((x) => -x), 0.70)), p85: r1(pctile(PXA.dd.filter((x) => x != null).map((x) => -x), 0.85)) },
  },
  bias: {
    fotografie: snaps.map(({ usati, ...s }) => ({ ...s, usati })),
    confronto,
    serieAFotografie: { da: cal[iSnap],
      membriOggi: LEVELS.map((L) => brief(machine(PXA, cut(BR), L, adj))),
      fotografie: LEVELS.map((L) => brief(machine(PXA, BRS, L, adj))),
      discese3: { membriOggi: rawEpisodes(cut(BR).pct200, 3, iSnap).length, fotografie: rawEpisodes(BRS.pct200, 3, iSnap).length },
      nMinimo: (() => { let m = null; for (let i = iSnap; i < N; i++) if (BS.n[i] != null && (m == null || BS.n[i] < BS.n[m])) m = i; return { data: cal[m], n: BS.n[m] }; })() },
  },
};
fs.writeFileSync(path.join(OUT, 'risultati.json'), JSON.stringify(res, null, 1));
// serie della breadth (conteggi, nessun prezzo di Yahoo): dalla prima seduta del SOXX
fs.writeFileSync(path.join(OUT, 'breadth_soxx.json'), JSON.stringify({ nota: 'membri di oggi del SOXX; conteggi con countDay() dell\'app; inizio con la regola dell\'app: ' + startApp,
  dates: cal, members: B.members, n: B.n, con200Sedute: B.elig, a20: B.a20, a50: B.a50, a200: B.a200,
  fotografie: { da: cal[iSnap], n: BS.n, a200: BS.a200 } }));

// ---------- riepilogo ----------
console.log(`breadth dal ${startApp} (copertura 60% il ${cal[iCov]}); oggi ${res.breadth.oggi.sopra}/${res.breadth.oggi.n} = ${res.breadth.oggi.pct200}%`);
console.log('percentili', res.breadth.percentiliTuttaLaStoria, 'p3 fino a oggi', res.breadth.p3FinoAOggi);
console.log('quota sedute', JSON.stringify(res.breadth.quotaSedute), 'a 0:', JSON.stringify(res.breadth.seduteA0));
for (const c of crisi) console.log(c.nome.padEnd(18), c.data, `${c.minBreadth}% (${c.sopra}/${c.n}, 200s ${c.con200Sedute})`, 'a0', c.seduteA0, '≤3', c.seduteSotto3, '≤5', c.seduteSotto5, '≤10', c.seduteSotto10, 'p3pit', c.p3FinoAQuelGiorno, 'minPx', c.minimoPrezzoSOXX, c.ddAlMinimo);
for (const L of LEVELS) console.log(`discese ≤${L}%:`, res.discese[L].dalInizio.length, 'dal 2008', res.discese[L].dal2008.length, res.discese[L].dalInizio.map((e) => `${e.inizio}(${e.sedute},min ${e.min})`).join(' '));
for (const m of res.macchina.soxxRettificato) {
  console.log(`\nL=${m.livello}: zone blu ${m.zoneBlu}, trigger ${m.trigger}, falliti ${m.falliti}, episodi con trigger ${m.episodiConTrigger}, stato oggi ${m.statoOggi}, dal ${m.primaSedutaConStato}`);
  for (const c of m.contesto) console.log('  ', c.gruppo.padEnd(6), 'n', c.n, JSON.stringify(c.mediane), 'pos3M', c.positiviA3M.join('/'));
  console.log('   base peggior calo', JSON.stringify(m.basePeggiorCalo));
  for (const e of m.episodi) console.log('   ZB', e.zonaBlu, 'min', e.minBreadth, e.dataMinBreadth, 'trig', e.trigger.join(','), 'fail', e.falliti.join(','), 'rZB', JSON.stringify(e.rendDaZonaBlu), 'w252', e.peggiorCalo252DaZonaBlu, 'rT1', JSON.stringify(e.rendDaPrimoTrigger), 'wT252', e.peggiorCalo252DaPrimoTrigger);
}
for (const k of ['soxxSoloPrezzo', 'indiceSOX']) for (const m of res.macchina[k]) console.log(k, m.livello, 'ZB', m.zoneBlu, 'trig', m.trigger, 'fail', m.falliti, m.episodi.map((e) => e.zonaBlu).join(' '));
console.log('\ndrawdown oggi', JSON.stringify(res.drawdown.oggi), 'percentile dal', res.drawdown.percentileDaSeduta, 'soglie', JSON.stringify(res.drawdown.soglie));
console.log('\ncopertura', JSON.stringify(res.calendario).slice(0, 300), JSON.stringify(res.soxx));
for (const m of memberInfo) console.log(' ', m.ticker.padEnd(5), m.primaSeduta, m.sedute, 'mancanti', m.seduteSOXXMancanti, m.esempiMancanti.join(','), 'clean tolte', m.chiusureTolteDaClean, 'riscalate', m.chiusureRiscalateDaClean);
console.log('\nbias');
for (const a of availability) console.log(' ', a.data, `${a.conPrezzi}/${a.membri} con prezzi, ${a.con200Sedute} con 200 sedute; mancano: ${a.mancanti.join(', ')}`);
for (const c of confronto) console.log(' ', c.fotografia, '→', c.fino, `${c.conPrezzi}/${c.elencati}`, 'scarto medio', c.scartoMedio, 'mediano', c.scartoMediano, `[${c.scartoMin}, ${c.scartoMax}]`, 'sotto20', c.seduteFotografiaSotto20, c.scartoMedioSotto20, 'min oggi', JSON.stringify(c.minimoMembriOggi), 'min foto', JSON.stringify(c.minimoFotografia), '≤3', c.seduteSotto3MembriOggi, c.seduteSotto3Fotografia);
const sf = res.bias.serieAFotografie;
console.log(' serie a fotografie dal', sf.da, 'n minimo', JSON.stringify(sf.nMinimo), 'discese ≤3', JSON.stringify(sf.discese3));
for (let k = 0; k < LEVELS.length; k++) console.log('  L', LEVELS[k], 'oggi: ZB', sf.membriOggi[k].zoneBlu, sf.membriOggi[k].episodi.map((e) => e.zonaBlu).join(' '), '| foto: ZB', sf.fotografie[k].zoneBlu, sf.fotografie[k].episodi.map((e) => e.zonaBlu).join(' '));
