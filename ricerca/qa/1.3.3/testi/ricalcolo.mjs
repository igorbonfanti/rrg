// Controllo indipendente dei testi della 1.3.3 (avvicinamento). Scritto da zero dal revisore: usa dall'app solo
// runMachine, breadthSeries, priceSeries, indexSeries, approachSeries, approachLevel (per un controllo a campione).
// Definizioni (dai commenti in testa a ricerca/attenzione/script/avvicinamento_pit.mjs e ricerca/avvicinamento-uso/script/*):
//   stato[t]      = runMachine(...).days[t] se calcolato, altrimenti l'ultimo calcolato ('normal' alla seduta 0), come apprDays;
//   avv[t]        = soglia[t] != null && b[t] != null && stato[t] === 'normal' && b[t] <= soglia[t], soglia = approachSeries;
//   periodo       = dalla prima seduta con stato (days != null), sedute con la breadth;
//   allarme       = prima seduta con la regola vera dopo almeno 20 sedute (con breadth, nel periodo) senza;
//   tocco         = b <= L dopo almeno 60 sedute (con breadth, nel periodo) sopra;
//   tocco avvisato= un allarme iniziato da 5 a 126 sedute prima del tocco;
//   arriva        = b <= L in una seduta j con t <= j < t + 126; anticipo = j - t (mediana: valore centrale basso);
//   zona blu entro h = days[j] in {setup, fail} per t < j <= t + h; base = sedute Normali non in avvicinamento;
//   calo massimo 63 = min(px[t..t+63]) / px[t] - 1; rendimento 63 = px[t+63] / px[t] - 1.
// Opzione --sbagliata: conta dalla seduta 0 (anche XLC prima del 2019 e XLRE prima del 2016, quando l'app non ha uno stato).
// Uso: node ricerca/qa/1.3.3/testi/ricalcolo.mjs [--sbagliata]
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachSeries, approachLevel, DEFAULT_PARAMS } from '../../../../js/signals.js';
import { indexSeries } from '../../../../js/indexdata.js';

const WRONG = process.argv.includes('--sbagliata');
const J = (p) => JSON.parse(fs.readFileSync(new URL('../../../../' + p, import.meta.url), 'utf8'));
const th = J('config/thresholds.json'), P = { ...DEFAULT_PARAMS, ...th.params };
const lowMed = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[(s.length - 1) >> 1]; };
const pc = (a, n) => (n ? (100 * a / n).toFixed(1) + '%' : '—');

// prepara una serie: b, L, prezzo, stato portato avanti, avvicinamento, primo giorno con stato
function prep(b, L, close, br) {
  const m = runMachine(priceSeries(close), br, L, P), N = b.length;
  const first = m.days.findIndex((d) => d != null);
  const start = WRONG ? 0 : first;
  const state = new Array(N);
  for (let t = 0, cur = 'normal'; t < N; t++) { if (m.days[t] != null) cur = m.days[t]; state[t] = cur; }
  const A = approachSeries(b, L);
  const avv = b.map((v, t) => v != null && A[t] != null && state[t] === 'normal' && v <= A[t]);
  return { b, L, px: close, m, N, first, start, state, A, avv };
}

// sedute valide del periodo (con la breadth)
const valid = (S) => { const out = []; for (let t = S.start; t < S.N; t++) if (S.b[t] != null) out.push(t); return out; };

// episodi: prima seduta vera dopo >= gap sedute valide false
function onsets(S, rule, gap = 20) {
  const out = []; let quiet = 0;
  for (const t of valid(S)) { if (rule(t)) { if (quiet >= gap) out.push(t); quiet = 0; } else quiet++; }
  return out;
}
function touches(S) {
  const out = []; let up = 0;
  for (const t of valid(S)) { if (S.b[t] <= S.L) { if (up >= 60) out.push(t); up = 0; } else up++; }
  return out;
}
function firstTouchFrom(S, t) { for (let j = t; j < Math.min(S.N, t + 126); j++) if (S.b[j] != null && S.b[j] <= S.L) return j; return -1; }

const RULES = {
  C: (S) => (t) => S.avv[t],
  D: (S) => (t) => S.avv[t] || S.state[t] === 'watch',
  E: (S) => (t) => S.state[t] === 'watch',
};

function warning(series, label) {
  const res = {};
  for (const [r, mk] of Object.entries(RULES)) {
    let al = 0, hit = 0, tw = 0, tn = 0; const lead = [], leadTouch = [];
    for (const S of series) {
      const rule = mk(S), on = onsets(S, rule), tc = touches(S);
      for (const s of on) { al++; const j = firstTouchFrom(S, s); if (j >= 0) { hit++; lead.push(j - s); } }
      for (const u of tc) {
        tn++;
        const w = on.filter((s) => u - s >= 5 && u - s <= 126);
        if (w.length) { tw++; leadTouch.push(u - w[0]); }
      }
    }
    res[r] = { tocchiAvvisati: `${tw}/${tn}`, allarmi: al, arrivano: `${hit}/${al} = ${Math.round(100 * hit / al)}%`, anticipoMediano: lowMed(lead), anticipoDeiTocchiAvvisati: lowMed(leadTouch) };
  }
  console.log(`\n== ${label}${WRONG ? ' (DEFINIZIONE SBAGLIATA: dalla seduta 0)' : ''}`);
  for (const [r, o] of Object.entries(res)) console.log(' ', r, JSON.stringify(o));
  return res;
}

// ---------- settori ----------
const sec = J('data/sectors.json'), br = J('data/breadth.json'), SECT = Object.keys(th.blue);
const SS = SECT.map((k) => { const B = breadthSeries(br, k, sec.dates); return { k, ...prep(B.pct200, th.blue[k], sec.adjclose[k], B) }; });
console.log('dati al', br.asOf, '· prima seduta con stato:', SS.map((S) => `${S.k} ${sec.dates[S.first]}`).join(', '));

// controllo a campione: approachSeries === approachLevel sulla storia tagliata
let chk = 0, diff = 0;
for (const S of SS) for (let t = S.first; t < S.N; t += 211) { chk++; const a = approachLevel(S.b.slice(0, t + 1), S.L); if (a !== S.A[t]) diff++; }
console.log(`controllo soglia: ${chk} sedute, ${diff} diverse`);

warning(SS, 'SETTORI');

// ---------- uso pratico (settori) ----------
if (!WRONG) {
  const blueDay = (S, j) => S.m.days[j] === 'setup' || S.m.days[j] === 'fail';
  const blueWithin = (S, t, h) => { for (let j = t + 1; j <= t + h; j++) if (blueDay(S, j)) return true; return false; };
  const mdd = (S, t, h) => { let lo = S.px[t]; for (let j = t; j <= t + h; j++) if (S.px[j] != null) lo = Math.min(lo, S.px[j]); return 100 * (lo / S.px[t] - 1); };
  const ret = (S, t, h) => (S.px[t] && S.px[t + h] != null ? 100 * (S.px[t + h] / S.px[t] - 1) : null);
  const g = { e: [0, 0], b: [0, 0], e63: [0, 0], b63: [0, 0], eDD: [], bDD: [], eR: [], bR: [], allR: [], third: {}, recent: {}, cond: [], per: {} };
  const bump = (o, key, hit) => { o[key] = o[key] || [0, 0]; o[key][1]++; if (hit) o[key][0]++; };
  for (const S of SS) {
    const ent = onsets(S, (t) => S.avv[t]);
    const trig = S.m.events.filter((e) => e.code === 'trig').map((e) => e.t);
    const ps = (g.per[S.k] = { ingressi: ent.length, e: [0, 0], b: [0, 0], e63: [0, 0], b63: [0, 0], sogliaOggi: +S.A[S.N - 1].toFixed(1), quotaSedute: 0 });
    let nAvv = 0, nVal = 0;
    for (const t of valid(S)) {
      nVal++; if (S.avv[t]) nAvv++;
      if (S.px[t] != null && t + 63 < S.N) { const r = ret(S, t, 63); if (r != null) g.allR.push(r); }
      if (S.state[t] === 'normal' && !S.avv[t]) {
        if (t + 126 <= S.N - 1) { const h = blueWithin(S, t, 126); g.b[1]++; ps.b[1]++; if (h) { g.b[0]++; ps.b[0]++; } }
        if (t + 63 <= S.N - 1) { const h = blueWithin(S, t, 63); g.b63[1]++; ps.b63[1]++; if (h) { g.b63[0]++; ps.b63[0]++; } if (S.px[t] != null) { g.bDD.push(mdd(S, t, 63)); const r = ret(S, t, 63); if (r != null) g.bR.push(r); } }
      }
    }
    ps.quotaSedute = +(100 * nAvv / nVal).toFixed(1);
    for (const t of ent) {
      if (t + 126 <= S.N - 1) { const h = blueWithin(S, t, 126); g.e[1]++; ps.e[1]++; if (h) { g.e[0]++; ps.e[0]++; } }
      if (t + 63 <= S.N - 1) { const h = blueWithin(S, t, 63); g.e63[1]++; ps.e63[1]++; if (h) { g.e63[0]++; ps.e63[0]++; } if (S.px[t] != null) { g.eDD.push(mdd(S, t, 63)); const r = ret(S, t, 63); if (r != null) g.eR.push(r); } }
      // regole d'uso: episodi con 126 sedute dopo
      if (t + 126 < S.N) {
        const hit = firstTouchFrom(S, t) >= 0, u = t + 2;
        const where = S.state[u] === 'watch' ? 'Attenzione' : S.avv[u] ? 'ancora giallo' : S.state[u] === 'normal' ? 'tornato sopra' : S.state[u];
        bump(g.third, where, hit); bump(g.third, where === 'Attenzione' ? '= Attenzione' : '≠ Attenzione', hit);
        let rec = false; for (let j = Math.max(0, t - 126); j < t; j++) if (S.b[j] != null && S.b[j] <= S.L) rec = true;
        bump(g.recent, rec ? 'tocco nei 126 prima' : 'nessun tocco nei 126 prima', hit);
      }
      // condizionato: arriva in zona blu e poi al trigger entro 252 sedute
      let tb = -1; for (let j = t + 1; j < S.N; j++) if (blueDay(S, j)) { tb = j; break; }
      const tt = trig.find((x) => x > t);
      if (tb >= 0 && tt != null && tt - t <= 252 && tt >= tb) { let lo = Infinity; for (let j = t; j <= tt; j++) if (S.px[j] != null) lo = Math.min(lo, S.px[j]); g.cond.push(100 * (lo / S.px[t] - 1)); }
    }
  }
  const sm = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  console.log('\n== USO PRATICO (settori, ingressi in avvicinamento)');
  console.log(`  ingressi: ${SS.reduce((a, S) => a + onsets(S, (t) => S.avv[t]).length, 0)}`);
  console.log(`  zona blu entro 126: ingressi ${g.e[0]}/${g.e[1]} = ${pc(...g.e)} · base (Normale non in avvicinamento) ${g.b[0]}/${g.b[1]} = ${pc(...g.b)}`);
  console.log(`  zona blu entro 63:  ingressi ${g.e63[0]}/${g.e63[1]} = ${pc(...g.e63)} · base ${g.b63[0]}/${g.b63[1]} = ${pc(...g.b63)}`);
  console.log(`  calo massimo 63 (mediana bassa / mediana classica): ingressi ${lowMed(g.eDD).toFixed(2)} / ${sm(g.eDD).toFixed(2)} · base ${lowMed(g.bDD).toFixed(2)} / ${sm(g.bDD).toFixed(2)}`);
  console.log(`  rendimento 63 (mediana bassa / classica): ingressi ${lowMed(g.eR).toFixed(2)} / ${sm(g.eR).toFixed(2)} (n ${g.eR.length}) · base Normale non avv. ${lowMed(g.bR).toFixed(2)} / ${sm(g.bR).toFixed(2)} · tutte le sedute ${lowMed(g.allR).toFixed(2)} / ${sm(g.allR).toFixed(2)} (n ${g.allR.length})`);
  console.log(`  condizionato (arriva in zona blu e al trigger entro 252): ${g.cond.length} episodi, calo massimo mediano dall'ingresso al trigger ${sm(g.cond).toFixed(1)} (bassa ${lowMed(g.cond).toFixed(1)})`);
  console.log('  terza seduta:', Object.entries(g.third).map(([k, [a, n]]) => `${k} ${a}/${n} = ${pc(a, n)}`).join(' · '));
  console.log('  tocco recente:', Object.entries(g.recent).map(([k, [a, n]]) => `${k} ${a}/${n} = ${pc(a, n)}`).join(' · '));
  console.log('  per settore (ingressi · zona blu 126 ingressi/base · R126 · R63 · soglia oggi · % sedute in avvicinamento):');
  for (const [k, p] of Object.entries(g.per)) {
    const r = (e, b) => (b[0] ? ((e[0] / e[1]) / (b[0] / b[1])).toFixed(2) : '—');
    console.log(`   ${k.padEnd(5)} ${String(p.ingressi).padStart(3)} · ${p.e[0]}/${p.e[1]} vs ${pc(...p.b)} · R126 ${r(p.e, p.b)} · R63 ${r(p.e63, p.b63)} · soglia ${p.sogliaOggi} · ${p.quotaSedute}%`);
  }
}

// ---------- indici ----------
const cfg = J('config/indices.json').indices, IX = { ...J('data/indices_more.json').series, ...J('data/indices.json').series };
const IS = Object.keys(cfg).map((k) => { const X = indexSeries(IX[k]); return { k, ...prep(X.pct200, cfg[k].blue, X.close, X) }; });
console.log(`\nindici: ${IS.length}`);
warning(IS, 'INDICI');
