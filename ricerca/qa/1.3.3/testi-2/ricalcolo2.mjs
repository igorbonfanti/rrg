// Secondo controllo dei testi 1.3.3 (revisore indipendente, scritto da zero). Ricalcola ogni numero sull'avvicinamento
// citato nei testi visibili (Monitor, tooltip, note, guida, README, note di versione).
//
// Dall'app si importano solo: runMachine, breadthSeries, priceSeries, indexSeries (dati e stati) e approachSeries /
// approachLevel per un confronto. La soglia di avvicinamento è ricalcolata qui con una funzione propria (soglia[t] =
// L + quantile 0,9 dei cali della breadth in 10 sedute, sola storia fino a t, indice floor(0,9·(n−1)) sui cali ordinati),
// e confrontata seduta per seduta con approachSeries.
//
// Definizioni (dalle teste di ricerca/attenzione/script/*.mjs e ricerca/avvicinamento-uso/script/*.mjs):
//   periodo        = dalla prima seduta con m.days non nullo (start); prima non si conta nulla;
//   stato[t]       = m.days[t], o l'ultimo non nullo prima (dopo start);
//   avvicinamento  = stato Normale, breadth non nulla, soglia non nulla, breadth ≤ soglia (regola C);
//   D              = C oppure stato Attenzione ('watch'); E = solo Attenzione;
//   allarme/ingresso = prima seduta con la regola vera dopo almeno 20 sedute (con breadth) in cui è falsa;
//   tocco          = breadth ≤ L dopo almeno 60 sedute (con breadth) sopra; tocco avvisato = allarme da 5 a 126 sedute prima;
//   arriva         = breadth ≤ L in una seduta da t a t+125;
//   zona blu entro h = m.days[j] === 'setup' per qualche j in (t, t+h] (variante: anche 'fail'); finestra completa;
//   base           = sedute in stato Normale non in avvicinamento (variante: tutte le sedute del periodo);
//   calo massimo 63 = min delle chiusure da t a t+63 / chiusura t − 1; rendimento 63 = chiusura t+63 / chiusura t − 1.
//
// Uso: node ricerca/qa/1.3.3/testi-2/ricalcolo2.mjs            → definizioni corrette
//      node ricerca/qa/1.3.3/testi-2/ricalcolo2.mjs --sbagliata → periodo dalla seduta 0 (definizione sbagliata):
//                                                                 deve dare numeri diversi
import fs from 'node:fs';
import { runMachine, breadthSeries, priceSeries, approachSeries, approachLevel } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';

const WRONG = process.argv.includes('--sbagliata');
const J = (f) => JSON.parse(fs.readFileSync(new URL('../../../../' + f, import.meta.url)));
const thr = J('config/thresholds.json'), sec = J('data/sectors.json'), br = J('data/breadth.json');
const PARAMS = thr.params; // runMachine unisce da sé i default

const medMid = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const medLow = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const pc = (a, n) => `${a}/${n} = ${(100 * a / n).toFixed(1)}%`;
const f2 = (v) => (v == null ? '—' : v.toFixed(2));

// soglia propria, seduta per seduta (inserimento ordinato semplice, scritto a parte)
function myThreshold(b, L) {
  const drops = [], out = [];
  for (let t = 0; t < b.length; t++) {
    if (t >= 10 && b[t] != null && b[t - 10] != null && b[t] < b[t - 10]) {
      const v = b[t - 10] - b[t]; let i = drops.length; drops.push(v);
      while (i > 0 && drops[i - 1] > v) { drops[i] = drops[i - 1]; i--; } drops[i] = v;
    }
    out.push(drops.length ? L + drops[Math.floor(0.9 * (drops.length - 1))] : null);
  }
  return out;
}

let thrChecks = 0, thrDiff = 0, lvlChecks = 0, lvlDiff = 0;
function prepare(key, b, L, close, brObj) {
  const m = runMachine(priceSeries(close), brObj, L, PARAMS);
  const N = b.length, start0 = m.days.findIndex((d) => d != null), start = WRONG ? 0 : start0;
  const A = myThreshold(b, L), AS = approachSeries(b, L);
  for (let t = 0; t < N; t++) { thrChecks++; if ((A[t] == null) !== (AS[t] == null) || (A[t] != null && Math.abs(A[t] - AS[t]) > 1e-9)) thrDiff++; }
  for (let t = Math.max(start0, 0); t < N; t += 101) { lvlChecks++; const x = approachLevel(b.slice(0, t + 1), L); if ((x == null) !== (A[t] == null) || (x != null && Math.abs(x - A[t]) > 1e-9)) lvlDiff++; }
  const st = new Array(N).fill(null); let cur = 'normal';
  for (let t = 0; t < N; t++) { if (m.days[t] != null) cur = m.days[t]; st[t] = cur; }
  const C = (t) => b[t] != null && A[t] != null && b[t] <= A[t] && st[t] === 'normal';
  const E = (t) => st[t] === 'watch';
  const D = (t) => C(t) || E(t);
  return { key, b, L, close, m, N, start, start0, A, st, rule: { C, D, E } };
}

function alarms(s, on) {
  const out = []; let off = 0;
  for (let t = s.start; t < s.N; t++) { if (s.b[t] == null) continue; if (on(t)) { if (off >= 20) out.push(t); off = 0; } else off++; }
  return out;
}
function touches(s) {
  const out = []; let up = 0;
  for (let t = s.start; t < s.N; t++) { if (s.b[t] == null) continue; if (s.b[t] <= s.L) { if (up >= 60) out.push(t); up = 0; } else up++; }
  return out;
}
const reachesLevel = (s, t) => { for (let j = t; j < Math.min(s.N, t + 126); j++) if (s.b[j] != null && s.b[j] <= s.L) return j; return -1; };

function warningStats(list, label) {
  const R = {};
  const pairs = [], bothD = [], bothE = [], onlyD = [], onlyE = []; // tocchi avvisati sia da D sia da E: anticipo D − E sullo stesso tocco
  for (const r of ['C', 'D', 'E']) R[r] = { tocchi: 0, avvisati: 0, first: [], last: [], allarmi: 0, arrivano: 0, leadArr: [] };
  for (const s of list) {
    const T = touches(s), first = {};
    for (const r of ['C', 'D', 'E']) {
      const al = alarms(s, s.rule[r]);
      R[r].tocchi += T.length; R[r].allarmi += al.length;
      for (const t of al) { const j = reachesLevel(s, t); if (j >= 0) { R[r].arrivano++; R[r].leadArr.push(j - t); } }
      first[r] = {};
      for (const u of T) {
        const w = al.filter((t) => u - t >= 5 && u - t <= 126);
        if (w.length) { R[r].avvisati++; R[r].first.push(u - w[0]); R[r].last.push(u - w.at(-1)); first[r][u] = u - w[0]; }
      }
    }
    for (const u of T) {
      if (first.D[u] != null && first.E[u] != null) { pairs.push(first.D[u] - first.E[u]); bothD.push(first.D[u]); bothE.push(first.E[u]); }
      else if (first.D[u] != null) onlyD.push(first.D[u]);
      else if (first.E[u] != null) onlyE.push(first.E[u]);
    }
  }
  console.log(`\n== ${label}${WRONG ? ' (DEFINIZIONE SBAGLIATA: dalla seduta 0)' : ''}`);
  for (const r of ['C', 'D', 'E']) {
    const x = R[r];
    console.log(`${r}: tocchi avvisati ${x.avvisati}/${x.tocchi} | primo avviso prima del tocco: mediana ${medMid(x.first)} (centrale basso ${medLow(x.first)}) | ultimo ${medMid(x.last)} | allarmi ${x.allarmi}, arrivano al livello ${pc(x.arrivano, x.allarmi)} | anticipo degli allarmi che arrivano ${medLow(x.leadArr)}`);
  }
  const pos = pairs.filter((d) => d > 0), zero = pairs.filter((d) => d === 0).length, neg = pairs.filter((d) => d < 0).length;
  console.log(`stesso tocco (avvisato da D e da E, n=${pairs.length}): D − E mediana ${medMid(pairs)} sedute, media ${(pairs.reduce((a, b) => a + b, 0) / pairs.length).toFixed(1)}; D prima ${pos.length} (guadagno mediano ${medMid(pos)}), uguale ${zero}, D dopo ${neg}`);
  console.log(`  su quei tocchi: primo avviso mediano D ${medMid(bothD)}, E ${medMid(bothE)}`);
  console.log(`tocchi avvisati solo da D: ${onlyD.length} (primo avviso mediano ${medMid(onlyD)}) | solo da E: ${onlyE.length}`);
  return R;
}

// ---------- settori ----------
const SECT = Object.keys(thr.blue), D0 = sec.dates;
const S = SECT.map((k) => { const B = breadthSeries(br, k, D0); return prepare(k, B.pct200, thr.blue[k], sec.adjclose[k], B); });
console.log('asOf breadth', br.asOf, '| ultima data', D0.at(-1));
console.log('primo stato settori:', S.map((s) => `${s.key} ${D0[s.start0]}`).join(', '));
console.log('prima breadth settori:', S.map((s) => `${s.key} ${D0[s.b.findIndex((v) => v != null)]}`).join(', '));
warningStats(S, 'settori');

// ---------- uso pratico (settori, ingressi regola C) ----------
{
  const ent = [], base = [], allS = [];
  const per = {};
  for (const s of S) {
    const { m, N, close: px } = s;
    const blueWithin = (t, h, withFail) => { for (let j = t + 1; j <= t + h; j++) if (m.days[j] === 'setup' || (withFail && m.days[j] === 'fail')) return true; return false; };
    const fwd = (t, h) => { if (t + h > N - 1 || px[t] == null || px[t + h] == null) return null; let lo = px[t]; for (let j = t; j <= t + h; j++) if (px[j] != null) lo = Math.min(lo, px[j]); return { dd: 100 * (lo / px[t] - 1), r: 100 * (px[t + h] / px[t] - 1) }; };
    const trigT = m.events.filter((e) => e.code === 'trig').map((e) => e.t);
    const p = (per[s.key] = { n: 0, z: 0, nb: 0, zb: 0, zf: 0 });
    const ins = alarms(s, s.rule.C);
    for (const t of ins) {
      const e = { k: s.key, t, date: D0[t] };
      if (t + 126 <= N - 1) { e.z126 = blueWithin(t, 126, false); e.z126f = blueWithin(t, 126, true); p.n++; if (e.z126) p.z++; if (e.z126f) p.zf++; }
      const f = fwd(t, 63); if (f) { e.dd = f.dd; e.r = f.r; }
      // terza seduta e tocco recente (regole d'uso), finestra di 126 sedute completa
      if (t + 126 < N) {
        e.hit = reachesLevel(s, t) >= 0;
        e.t3 = s.st[t + 2] === 'watch' ? 'A' : s.rule.C(t + 2) ? 'ancora' : s.st[t + 2] === 'normal' ? 'sopra' : s.st[t + 2];
        e.t3b = [t + 1, t + 2].some((j) => s.st[j] !== 'normal') ? 'A+' : 'no';
        let rec = false; for (let j = Math.max(0, t - 126); j < t; j++) if (s.b[j] != null && s.b[j] <= s.L) rec = true;
        e.recent = rec;
        let rec2 = false; for (let j = Math.max(s.start0, t - 126); j < t; j++) if (s.b[j] != null && s.b[j] <= s.L) rec2 = true;
        e.recentInPeriod = rec2;
      }
      // condizionato: zona blu (setup o fail) e poi trigger entro 252 sedute
      let tb = null; for (let j = t + 1; j < N; j++) if (m.days[j] === 'setup' || m.days[j] === 'fail') { tb = j; break; }
      const tt = trigT.find((x) => x > t);
      if (tb != null && tt != null && tt - t <= 252 && tt >= tb) { let lo = Infinity; for (let j = t; j <= tt; j++) lo = Math.min(lo, px[j]); e.condDd = 100 * (lo / px[t] - 1); }
      ent.push(e);
    }
    for (let t = s.start; t < N; t++) {
      if (s.b[t] == null) continue;
      const f = fwd(t, 63);
      if (f) allS.push(f.r);
      if (s.st[t] === 'normal' && !s.rule.C(t)) {
        const o = { f };
        if (t + 126 <= N - 1) { o.z126 = blueWithin(t, 126, false); o.z126f = blueWithin(t, 126, true); p.nb++; if (o.z126) p.zb++; }
        base.push(o);
      }
    }
  }
  console.log('\n== uso pratico (settori)');
  console.log('ingressi in avvicinamento:', ent.length);
  const e126 = ent.filter((e) => e.z126 != null), b126 = base.filter((o) => o.z126 != null);
  console.log('zona blu entro 126 (setup):', pc(e126.filter((e) => e.z126).length, e126.length), '| base normali non in avv.', pc(b126.filter((o) => o.z126).length, b126.length));
  console.log('zona blu entro 126 (setup o fail):', pc(e126.filter((e) => e.z126f).length, e126.length), '| base', pc(b126.filter((o) => o.z126f).length, b126.length));
  const eDd = ent.filter((e) => e.dd != null).map((e) => e.dd), bDd = base.filter((o) => o.f).map((o) => o.f.dd);
  console.log('calo massimo 63: ingressi', f2(medMid(eDd)), '/', f2(medLow(eDd)), '| base normali', f2(medMid(bDd)), '/', f2(medLow(bDd)), '(media dei centrali / centrale basso)');
  const eR = ent.filter((e) => e.r != null).map((e) => e.r), bR = base.filter((o) => o.f).map((o) => o.f.r);
  console.log('rendimento 63: ingressi', f2(medMid(eR)), '/', f2(medLow(eR)), `(n=${eR.length})`, '| base normali', f2(medMid(bR)), '/', f2(medLow(bR)), '| tutte le sedute', f2(medMid(allS)), '/', f2(medLow(allS)));
  const cond = ent.filter((e) => e.condDd != null).map((e) => e.condDd);
  console.log('condizionato (zona blu e trigger entro 252): episodi', cond.length, '| calo mediano fino al trigger', f2(medMid(cond)), '/', f2(medLow(cond)));
  const w = ent.filter((e) => e.hit != null);
  const g = (f) => { const x = w.filter(f); return pc(x.filter((e) => e.hit).length, x.length); };
  console.log('terza seduta in Attenzione:', g((e) => e.t3 === 'A'), '| ancora in avv.', g((e) => e.t3 === 'ancora'), '| tornato sopra', g((e) => e.t3 === 'sopra'), '| altro stato', g((e) => !['A', 'ancora', 'sopra'].includes(e.t3)), '| non in Attenzione', g((e) => e.t3 !== 'A'));
  console.log('variante «Attenzione o oltre a t+1 o t+2»:', g((e) => e.t3b === 'A+'), '| altrimenti', g((e) => e.t3b !== 'A+'));
  console.log('tocco nelle 126 sedute prima:', g((e) => e.recent), '| nessun tocco', g((e) => !e.recent), '| (solo dentro il periodo:', g((e) => e.recentInPeriod), 'contro', g((e) => !e.recentInPeriod) + ')');
  console.log('livello raggiunto entro 126, tutti gli ingressi con finestra completa:', g(() => true));
  console.log('per settore (ingressi con 126 sedute dopo: zona blu setup / con fail | base):');
  for (const [k, p] of Object.entries(per)) console.log(`  ${k.padEnd(5)} ${String(p.z).padStart(2)}/${String(p.n).padEnd(3)} ${(100 * p.z / p.n).toFixed(1).padStart(5)}%  (con fail ${p.zf})  base ${(100 * p.zb / p.nb).toFixed(1)}%  R ${((p.z / p.n) / (p.zb / p.nb)).toFixed(2)}`);
  const lastA = S.map((s) => [s.key, s.A.at(-1), s.L]).sort((a, b) => b[1] - a[1]);
  console.log('soglia di oggi (alta→bassa):', lastA.map(([k, a, L]) => `${k} ${a.toFixed(1)} (L ${L}, +${(a - L).toFixed(1)})`).join(', '));
  const medA = S.map((s) => [s.key, medMid(s.A.slice(s.start0).filter((v) => v != null))]).sort((a, b) => b[1] - a[1]);
  console.log('soglia mediana nel periodo (alta→bassa):', medA.map(([k, a]) => `${k} ${a.toFixed(1)}`).join(', '));
}

// ---------- indici ----------
const cfg = J('config/indices.json').indices, IX = { ...J('data/indices_more.json').series, ...J('data/indices.json').series };
const I = Object.keys(cfg).map((k) => { const X = indexSeries(IX[k]); const s = prepare(k, X.pct200, cfg[k].blue, X.close, X); s.dates = X.dates; return s; });
console.log('\nindici: prima breadth → primo stato');
for (const s of I) console.log(`  ${s.key.padEnd(8)} ${s.dates[s.b.findIndex((v) => v != null)]} → ${s.dates[s.start0]}`);
warningStats(I, 'indici');

console.log(`\nsoglia propria contro approachSeries: ${thrChecks} sedute, ${thrDiff} differenze; contro approachLevel sulla storia tagliata: ${lvlChecks} sedute, ${lvlDiff} differenze`);
