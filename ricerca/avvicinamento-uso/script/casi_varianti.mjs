/*
 * Avvicinamento al livello blu: casi, lettura e varianti (settori S&P 500). Ricerca: non modifica l'app.
 *
 * Domanda: il segnale «Avvicinamento» serve davvero e come si usa? Si guardano gli episodi uno per uno, i casi in cui
 * il segnale «salta», perché XLRE e XLU restano a lungo in avvicinamento e alcune varianti della regola.
 *
 * Regola attuale (copiata da js/bottom.js apprDays, righe 144–151, con le funzioni di js/signals.js):
 *   seduta in avvicinamento = stato della macchina (runMachine) Normale quel giorno e breadth (% titoli sopra la media 200)
 *   ≤ soglia del giorno, soglia = livello blu + 90° percentile dei cali della breadth in 10 sedute calcolato con la sola
 *   storia fino a quel giorno (approachSeries). Livelli blu e parametri da config/thresholds.json.
 * Periodo: per ogni settore dalla prima seduta con uno stato della macchina (come il grafico del settore, rangeStart):
 *   XLC dal 20/06/2019 e XLRE dal 07/10/2016 (un anno dopo il lancio dell'ETF), gli altri dal 03/01/2005.
 *   Prima di quelle date apprDays darebbe sedute «in avvicinamento» anche senza stato (riporta lo stato Normale della
 *   seduta 0): il grafico non le mostra e qui si escludono; per confronto con ricerca/attenzione/avvicinamento_pit.mjs
 *   (regola C, 42 tocchi su 73) lo script rifà anche quel conteggio sulla storia intera.
 *
 * Definizioni (le stesse di ricerca/attenzione):
 *   allarme / episodio  = prima seduta in avvicinamento dopo almeno 20 sedute senza; l'episodio comprende tutte le sedute
 *                         in avvicinamento seguenti finché non passano 20 sedute senza.
 *   tratto              = sedute in avvicinamento consecutive (nel grafico, un tratto giallo o un pallino da solo).
 *   arriva              = la breadth tocca il livello blu (≤ L) entro 126 sedute dall'ingresso.
 *   tocco               = breadth ≤ livello blu dopo almeno 60 sedute sopra.
 *   tocco avvisato      = un episodio iniziato da 5 a 126 sedute prima del tocco.
 *   esito dell'episodio = lo stato più grave raggiunto dall'ingresso a 20 sedute dopo l'ultima seduta in avvicinamento:
 *                         zona blu (setup) > Attenzione per breadth (≤ livello + 10) > Attenzione per solo drawdown >
 *                         Normale (la breadth torna sopra la soglia); con le sedute dall'ingresso al primo giorno di quello stato
 *                         (per Normale: alla prima seduta dopo l'ultima in avvicinamento). «in corso» se i dati finiscono prima.
 *   rendimento          = ETF (chiusure rettificate) dalla chiusura della seduta d'ingresso a 63 sedute dopo (il segnale si
 *                         conosce a mercato chiuso). Base: tutte le sedute del periodo.
 *   passaggio diretto   = seduta t in Attenzione o zona blu con la seduta prima in stato Normale e breadth sopra la soglia.
 *   ingresso in fascia  = breadth ≤ livello + 10 dopo almeno 20 sedute sopra; «annunciato» se nelle 20 sedute prima c'è
 *                         almeno una seduta in avvicinamento; altrimenti il motivo (stato del giorno in cui la breadth
 *                         è scesa sotto la soglia di avvicinamento l'ultima volta).
 * Varianti (ricerca, non regole nuove): percentile 85 e 95; soglia livello + k titoli (k = 10, 15, 20; un titolo vale 100/n
 *   punti); conferma con 2 chiusure di fila; «in caduta» (calo della breadth in 10 sedute oltre il 75° percentile dei cali
 *   fino a quel giorno) sia giorno per giorno (d1) sia solo all'ingresso e poi finché resta sotto soglia (d2); stato Normale
 *   oppure Attenzione per solo drawdown con la breadth sopra la fascia livello + 10 (e). Per contesto: D = attuale oppure
 *   Attenzione, E = solo Attenzione.
 * Regole d'uso (punto 5): percentuali di arrivo condizionate a ciò che si sa a una data seduta (nessun dato futuro nella
 *   condizione), tutte nel campione.
 *
 * Uso: node ricerca/avvicinamento-uso/script/casi_varianti.mjs  → scrive ricerca/avvicinamento-uso/casi_varianti.json
 */
import fs from 'node:fs';
import { breadthSeries, priceSeries, runMachine, approachSeries, approachLevel, forward, median, DEFAULT_PARAMS, SECTOR_KEYS } from '../../../js/signals.js';

const R = (f) => JSON.parse(fs.readFileSync(new URL('../../../' + f, import.meta.url)));
const th = R('config/thresholds.json'), sec = R('data/sectors.json'), br = R('data/breadth.json');
const P = { ...DEFAULT_PARAMS, ...th.params }, D = sec.dates;
const H = 126, LEAD = 5, GAP = 20, TOUCH_GAP = 60, RET = 63, FALL_Q = 0.75;
const r1 = (x) => (x == null ? null : +x.toFixed(1));
const pct = (a, b) => (b ? +((100 * a) / b).toFixed(1) : null);

// ultima seduta con la breadth dell'S&P 500 (come NOW in js/bottom.js)
const SPX = breadthSeries(br, 'SPX', D).pct200;
let NOW = D.length - 1;
while (NOW > 0 && SPX[NOW] == null) NOW--;

// ---------- dati per settore ----------
const S = {};
for (const k of SECTOR_KEYS) {
  const B = breadthSeries(br, k, D), L = th.blue[k], px = sec.adjclose[k];
  const pxs = priceSeries(px), m = runMachine(pxs, B, L, P);
  const b = B.pct200.slice(0, NOW + 1);
  const A = approachSeries(b, L);
  // replica di apprDays (js/bottom.js): stato riportato in avanti dalla seduta 0
  let code = null;
  const carry = b.map((_, t) => { if (m.days[t] != null || t === 0) code = m.days[t] || 'normal'; return code; });
  const apprApp = A.map((a, t) => a != null && b[t] != null && carry[t] === 'normal' && b[t] <= a);
  const t0 = m.days.findIndex((v) => v != null);
  const valid = b.map((v, t) => t >= t0 && v != null && m.days[t] != null);
  const st = m.days;
  const drop10 = b.map((v, t) => (t >= 10 && v != null && b[t - 10] != null ? b[t - 10] - v : null));
  const fallQ = approachSeries(b, 0, 10, FALL_Q); // 75° percentile dei cali in 10 sedute fino a quel giorno (livello 0)
  S[k] = { B, L, px, pxs, m, b, A, apprApp, carry, t0, valid, st, drop10, fallQ, n: B.n };
}

// ---------- controlli indipendenti ----------
const checks = {};
{
  // 1) soglia del giorno: approachSeries contro approachLevel sulla storia troncata, ogni 97 sedute
  let diff = 0, cnt = 0;
  for (const k of SECTOR_KEYS) {
    const { b, L, A } = S[k];
    for (let t = 30; t <= NOW; t += 97) { const x = approachLevel(b.slice(0, t + 1), L); cnt++; if (x !== A[t]) diff++; }
  }
  checks.sogliaDelGiorno = { campioni: cnt, diversi: diff };
  // 2) sedute in avvicinamento con un conteggio separato: stato del giorno (m.days) senza riporto, soglia ricalcolata
  //    con un ordinamento completo ogni 250 sedute e con approachSeries nelle altre
  let d2 = 0, n2 = 0;
  for (const k of SECTOR_KEYS) {
    const { b, L, A, st, valid, apprApp } = S[k];
    for (let t = 0; t <= NOW; t++) {
      if (!valid[t]) continue;
      let a = A[t];
      if (t % 250 === 0) {
        const d = [];
        for (let j = 10; j <= t; j++) if (b[j] != null && b[j - 10] != null && b[j] < b[j - 10]) d.push(b[j - 10] - b[j]);
        d.sort((x, y) => x - y);
        a = d.length ? L + d[Math.floor(0.9 * (d.length - 1))] : null;
      }
      const on = a != null && st[t] === 'normal' && b[t] <= a;
      n2++; if (on !== apprApp[t]) d2++;
    }
  }
  checks.seduteAvvicinamento = { sedute: n2, diverse: d2 };
  // 3) sedute senza stato dentro il periodo (dovrebbero essere 0, così il riporto di apprDays non conta)
  checks.seduteSenzaStatoNelPeriodo = Object.fromEntries(SECTOR_KEYS.map((k) => [k, S[k].b.filter((v, t) => t >= S[k].t0 && (v == null || S[k].st[t] == null)).length]));
  // 4) sedute «in avvicinamento» per apprDays prima che esista uno stato (escluse qui)
  checks.seduteAvvicinamentoSenzaStato = Object.fromEntries(SECTOR_KEYS.map((k) => [k, S[k].apprApp.filter((v, t) => v && t < S[k].t0).length]));
}

// ---------- funzioni comuni ----------
// episodi di una serie booleana `on` (solo sedute valide); ritorna gli episodi con le loro sedute
function episodesOf(on, valid, startUp = 0) {
  const eps = []; let up = startUp, cur = null;
  for (let t = 0; t < on.length; t++) {
    if (!valid[t]) continue;
    if (on[t]) {
      if (up >= GAP) { cur = { t0: t, days: [] }; eps.push(cur); }
      if (cur) cur.days.push(t);
      up = 0;
    } else { up++; }
  }
  // tratti consecutivi (su sedute valide consecutive)
  for (const e of eps) {
    e.tLast = e.days[e.days.length - 1];
    e.segs = [];
    let len = 0, prev = null;
    for (const t of e.days) {
      if (prev != null && t === nextValid(valid, prev)) len++; else { if (len) e.segs.push(len); len = 1; }
      prev = t;
    }
    if (len) e.segs.push(len);
  }
  return eps;
}
function nextValid(valid, t) { for (let j = t + 1; j < valid.length; j++) if (valid[j]) return j; return -1; }
function touchesOf(b, L, valid) {
  const out = []; let above = 0;
  for (let t = 0; t < b.length; t++) {
    if (!valid[t]) continue;
    if (b[t] <= L) { if (above >= TOUCH_GAP) out.push(t); above = 0; } else above++;
  }
  return out;
}
function firstTouch(b, L, t, h = H) { for (let j = t; j < Math.min(b.length, t + h); j++) if (b[j] != null && b[j] <= L) return j; return -1; }
const isBlue = (s) => s === 'setup' || s === 'trig' || s === 'fail';

// ---------- 1. mappa degli episodi (regola attuale) ----------
const onAll = {}; // regola attuale nel periodo, per settore
for (const k of SECTOR_KEYS) onAll[k] = S[k].apprApp.map((v, t) => v && S[k].valid[t]);
// quanti altri settori sono in avvicinamento, Attenzione o zona blu/trigger/fallito in ogni seduta
const hot = (k, t) => onAll[k][t] || (S[k].valid[t] && S[k].st[t] !== 'normal' && S[k].st[t] !== 'cool');

const episodi = {}, riepilogo = {}, flatEps = [];
for (const k of SECTOR_KEYS) {
  const { b, L, A, st, valid, px, pxs, n, drop10, fallQ } = S[k];
  const on = onAll[k];
  const eps = episodesOf(on, valid);
  const rows = [];
  for (const e of eps) {
    const end = e.tLast + GAP;
    const open = end > NOW;
    let worst = 'normale', tWorst = nextValid(valid, e.tLast);
    let firstBlue = -1, firstWB = -1, firstWD = -1;
    for (let t = e.t0; t <= Math.min(end, NOW); t++) {
      if (!valid[t]) continue;
      if (isBlue(st[t]) && firstBlue < 0) firstBlue = t;
      if (st[t] === 'watch' && b[t] <= L + P.watchBand && firstWB < 0) firstWB = t;
      if (st[t] === 'watch' && b[t] > L + P.watchBand && firstWD < 0) firstWD = t;
    }
    if (firstBlue >= 0) { worst = 'zona blu'; tWorst = firstBlue; }
    else if (firstWB >= 0) { worst = 'Attenzione (breadth)'; tWorst = firstWB; }
    else if (firstWD >= 0) { worst = 'Attenzione (drawdown)'; tWorst = firstWD; }
    else if (open && tWorst < 0) worst = 'in corso';
    if (open && worst === 'normale') worst = 'in corso';
    const u = firstTouch(b, L, e.t0);
    const full = e.t0 + H <= NOW;
    const t2 = e.t0 + 2; // terza seduta dall'ingresso
    let at3 = null;
    if (t2 <= NOW) at3 = on[e.t0 + 1] && on[t2] ? 'ancora in avvicinamento' : [e.t0 + 1, t2].some((j) => st[j] !== 'normal') ? 'già in Attenzione o oltre' : 'tornato sopra la soglia';
    const others = SECTOR_KEYS.filter((x) => x !== k && hot(x, e.t0)).length;
    const row = {
      ingresso: D[e.t0], ultimo: D[e.tLast], durata: e.tLast - e.t0 + 1, seduteAvv: e.days.length, tratti: e.segs.length, trattoPiuLungo: Math.max(...e.segs),
      esito: worst, seduteAllEsito: tWorst >= 0 ? tWorst - e.t0 : null,
      toccaBlu126: u >= 0 ? u - e.t0 : full ? 'no' : 'dati non sufficienti',
      etf63: r1(forward(px, e.t0, RET)),
      ingressoBreadth: r1(b[e.t0]), ingressoSoglia: r1(A[e.t0]), titoli: n[e.t0], calo10: r1(drop10[e.t0]), calo10Veloce: drop10[e.t0] != null && fallQ[e.t0] != null && drop10[e.t0] >= fallQ[e.t0],
      ddPercentile: pxs.dp[e.t0], altriSettoriCaldi: others, allaTerzaSeduta: at3,
    };
    rows.push(row);
    flatEps.push({ k, ...row, t0: e.t0, hit: u >= 0, full, short: e.days.length <= 2 });
  }
  episodi[k] = rows;
  const nValid = valid.filter(Boolean).length, nOn = on.filter(Boolean).length;
  const segs = eps.flatMap((e) => e.segs);
  const ret = rows.map((r) => r.etf63).filter((x) => x != null);
  const base = []; for (let t = 0; t <= NOW; t++) if (valid[t]) { const x = forward(px, t, RET); if (x != null) base.push(x); }
  const esiti = {};
  rows.forEach((r) => (esiti[r.esito] = (esiti[r.esito] || 0) + 1));
  const full = rows.filter((r) => r.toccaBlu126 !== 'dati non sufficienti');
  riepilogo[k] = {
    dal: D[S[k].t0], titoliOggi: n[NOW], livelloBlu: L, sogliaOggi: r1(A[NOW]), breadthOggi: r1(b[NOW]), inAvvicinamentoOggi: on[NOW],
    episodi: rows.length, durataMediana: median(rows.map((r) => r.durata)), seduteAvvMediane: median(rows.map((r) => r.seduteAvv)),
    quotaSeduteAvv: pct(nOn, nValid), episodi1_2: rows.filter((r) => r.seduteAvv <= 2).length, quotaEpisodi1_2: pct(rows.filter((r) => r.seduteAvv <= 2).length, rows.length),
    tratti: segs.length, quotaTratti1_2: pct(segs.filter((x) => x <= 2).length, segs.length), esiti,
    arrivanoAlBlu: `${full.filter((r) => typeof r.toccaBlu126 === 'number').length}/${full.length}`,
    etf63Mediano: r1(median(ret)), etf63Positivi: `${ret.filter((x) => x > 0).length}/${ret.length}`, baseEtf63Mediano: r1(median(base)), basePositivi: pct(base.filter((x) => x > 0).length, base.length),
  };
}
{
  const all = Object.values(riepilogo);
  const totValid = SECTOR_KEYS.reduce((s, k) => s + S[k].valid.filter(Boolean).length, 0), totOn = SECTOR_KEYS.reduce((s, k) => s + onAll[k].filter(Boolean).length, 0);
  const ret = flatEps.map((e) => e.etf63).filter((x) => x != null);
  const base = []; for (const k of SECTOR_KEYS) for (let t = 0; t <= NOW; t++) if (S[k].valid[t]) { const x = forward(S[k].px, t, RET); if (x != null) base.push(x); }
  const esiti = {}; flatEps.forEach((r) => (esiti[r.esito] = (esiti[r.esito] || 0) + 1));
  riepilogo.TOTALE = {
    episodi: flatEps.length, durataMediana: median(flatEps.map((r) => r.durata)), seduteAvvMediane: median(flatEps.map((r) => r.seduteAvv)), quotaSeduteAvv: pct(totOn, totValid),
    episodi1_2: flatEps.filter((r) => r.short).length, quotaEpisodi1_2: pct(flatEps.filter((r) => r.short).length, flatEps.length),
    tratti: all.reduce((s, r) => s + r.tratti, 0), esiti,
    arrivanoAlBlu: `${flatEps.filter((e) => e.full && e.hit).length}/${flatEps.filter((e) => e.full).length}`,
    etf63Mediano: r1(median(ret)), etf63Positivi: `${ret.filter((x) => x > 0).length}/${ret.length}`, baseEtf63Mediano: r1(median(base)), basePositivi: pct(base.filter((x) => x > 0).length, base.length),
  };
  const segAll = []; for (const k of SECTOR_KEYS) segAll.push(...episodesOf(onAll[k], S[k].valid).flatMap((e) => e.segs));
  riepilogo.TOTALE.quotaTratti1_2 = pct(segAll.filter((x) => x <= 2).length, segAll.length);
}

// ---------- 2. passaggi diretti e ingressi in fascia non annunciati ----------
const passaggi = {};
for (const k of SECTOR_KEYS) {
  const { b, L, A, st, valid } = S[k];
  const on = onAll[k];
  const c = { normaleSopraSoglia_AttenzioneBreadth: 0, normaleSopraSoglia_AttenzioneDrawdown: 0, normaleSopraSoglia_zonaBlu: 0,
    avvicinamento_AttenzioneBreadth: 0, avvicinamento_zonaBlu: 0, normale_AttenzioneBreadthTotale: 0 };
  let prev = -1;
  for (let t = 0; t <= NOW; t++) {
    if (!valid[t]) continue;
    if (prev >= 0 && st[prev] === 'normal') {
      const above = !on[prev];
      const wb = st[t] === 'watch' && b[t] <= L + P.watchBand, wd = st[t] === 'watch' && !wb, bl = isBlue(st[t]);
      if (wb) c.normale_AttenzioneBreadthTotale++;
      if (above) { if (wb) c.normaleSopraSoglia_AttenzioneBreadth++; if (wd) c.normaleSopraSoglia_AttenzioneDrawdown++; if (bl) c.normaleSopraSoglia_zonaBlu++; }
      else { if (wb) c.avvicinamento_AttenzioneBreadth++; if (bl) c.avvicinamento_zonaBlu++; }
    }
    prev = t;
  }
  // ingressi nella fascia livello + 10 (qualsiasi stato)
  const ingressi = [], motivi = {};
  let up = 0;
  for (let t = 0; t <= NOW; t++) {
    if (!valid[t]) continue;
    if (b[t] <= L + P.watchBand) {
      if (up >= GAP) {
        let ann = false;
        for (let j = Math.max(0, t - GAP); j < t; j++) if (on[j]) ann = true;
        let why = 'annunciato';
        if (!ann) {
          // ultima discesa sotto la soglia prima di t (o il giorno stesso)
          let x = t;
          while (x > S[k].t0 && A[x - 1] != null && b[x - 1] <= A[x - 1]) x--;
          const s = st[x === t ? prevValid(valid, t) : x];
          why = x === t && s === 'normal' ? 'salto in un giorno (Normale e sopra la soglia il giorno prima)'
            : s === 'watch' ? 'già in Attenzione per drawdown quando ha passato la soglia'
            : s === 'trig' || s === 'cool' || s === 'fail' ? 'dopo un trigger (trigger o cooldown) quando ha passato la soglia'
            : s === 'normal' ? 'soglia passata più di 20 sedute prima, poi mai di nuovo Normale sotto soglia'
            : 'altro: ' + s;
        }
        motivi[why] = (motivi[why] || 0) + 1;
        ingressi.push({ data: D[t], motivo: why });
      }
      up = 0;
    } else up++;
  }
  passaggi[k] = { ...c, ingressiInFascia: ingressi.length, motivi, elenco: ingressi.filter((x) => x.motivo !== 'annunciato').map((x) => `${x.data}: ${x.motivo}`) };
}
function prevValid(valid, t) { for (let j = t - 1; j >= 0; j--) if (valid[j]) return j; return -1; }
{
  const T = {}; const M = {};
  for (const k of SECTOR_KEYS) {
    for (const [a, v] of Object.entries(passaggi[k])) if (typeof v === 'number') T[a] = (T[a] || 0) + v;
    for (const [a, v] of Object.entries(passaggi[k].motivi)) M[a] = (M[a] || 0) + v;
  }
  passaggi.TOTALE = { ...T, motivi: M };
}

// ---------- 3. XLRE e XLU: soglia, livello, titoli, breadth tipica ----------
const confronto = {};
for (const k of SECTOR_KEYS) {
  const { b, L, A, valid, n, st } = S[k];
  const idx = []; for (let t = 0; t <= NOW; t++) if (valid[t]) idx.push(t);
  const last5 = idx.filter((t) => D[t] >= '2021-10-29');
  const below = (ix) => pct(ix.filter((t) => b[t] <= A[t]).length, ix.length);
  // posizione della soglia di oggi nella distribuzione della breadth del settore (sedute del periodo)
  const sorted = idx.map((t) => b[t]).sort((x, y) => x - y);
  const rank = pct(sorted.filter((v) => v <= A[NOW]).length, sorted.length);
  const stock = 100 / n[NOW];
  confronto[k] = {
    titoli: n[NOW], puntiPerTitolo: r1(stock), livelloBlu: L, sogliaOggi: r1(A[NOW]), calo90Punti: r1(A[NOW] - L), calo90Titoli: r1((A[NOW] - L) / stock),
    breadthMediana: r1(median(idx.map((t) => b[t]))), breadthMediana5anni: r1(median(last5.map((t) => b[t]))),
    sogliaComePercentileBreadth: rank, quotaSeduteSottoSoglia: below(idx), quotaSeduteSottoSoglia5anni: below(last5),
    quotaSeduteAvv: pct(onAll[k].filter(Boolean).length, idx.length), quotaSeduteAvv5anni: pct(last5.filter((t) => onAll[k][t]).length, last5.length),
    quotaSeduteNormaleSottoSoglia5anni: pct(last5.filter((t) => st[t] === 'normal' && b[t] <= A[t]).length, last5.filter((t) => st[t] === 'normal').length),
  };
}
// rango (Spearman) tra numero di titoli e quota di sedute in avvicinamento
function spearman(x, y) {
  const rk = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(a.length); o.forEach(([, i], j) => (r[i] = j + 1)); return r; };
  const rx = rk(x), ry = rk(y), n = x.length; let d = 0; for (let i = 0; i < n; i++) d += (rx[i] - ry[i]) ** 2;
  return +(1 - (6 * d) / (n * (n * n - 1))).toFixed(2);
}
const titoliVsQuota = { spearman: spearman(SECTOR_KEYS.map((k) => confronto[k].titoli), SECTOR_KEYS.map((k) => confronto[k].quotaSeduteAvv)),
  spearmanSogliaPercentile: spearman(SECTOR_KEYS.map((k) => confronto[k].sogliaComePercentileBreadth), SECTOR_KEYS.map((k) => confronto[k].quotaSeduteAvv)) };
// XLRE nel 2025: episodi e sedute
const xlre2025 = {
  seduteAvv2025: onAll.XLRE.filter((v, t) => v && D[t].startsWith('2025')).length,
  sedute2025: S.XLRE.valid.filter((v, t) => v && D[t].startsWith('2025')).length,
  breadthMediana2025: r1(median(S.XLRE.b.filter((v, t) => S.XLRE.valid[t] && D[t].startsWith('2025')))),
  minimo2025: r1(Math.min(...S.XLRE.b.filter((v, t) => S.XLRE.valid[t] && D[t].startsWith('2025')))),
  episodi: episodi.XLRE.filter((e) => e.ingresso >= '2024-10-01'),
};

// ---------- 4. varianti ----------
function variantOn(k, name) {
  const { b, L, A, st, valid, n, drop10, fallQ } = S[k];
  const N = b.length, out = new Array(N).fill(false);
  const normal = (t) => st[t] === 'normal';
  const base = onAll[k];
  if (name === 'attuale (q90)') return base;
  if (name === 'a. q85' || name === 'a. q95') {
    const Aq = approachSeries(b, L, 10, name === 'a. q85' ? 0.85 : 0.95);
    for (let t = 0; t < N; t++) out[t] = valid[t] && normal(t) && Aq[t] != null && b[t] <= Aq[t];
    return out;
  }
  const mk = name.match(/^b\. livello \+ (\d+) titoli$/);
  if (mk) { const kk = +mk[1]; for (let t = 0; t < N; t++) out[t] = valid[t] && normal(t) && n[t] && b[t] <= L + (kk * 100) / n[t]; return out; }
  if (name === 'c. 2 chiusure di fila') {
    let p = -1; for (let t = 0; t < N; t++) { if (!valid[t]) continue; out[t] = base[t] && p >= 0 && base[p]; p = t; }
    return out;
  }
  const fast = (t) => drop10[t] != null && fallQ[t] != null && drop10[t] >= fallQ[t];
  if (name === 'd1. in caduta (ogni giorno)') { for (let t = 0; t < N; t++) out[t] = base[t] && fast(t); return out; }
  if (name === 'd2. in caduta all\'ingresso') {
    let p = -1; for (let t = 0; t < N; t++) { if (!valid[t]) continue; out[t] = base[t] && (fast(t) || (p >= 0 && out[p])); p = t; }
    return out;
  }
  if (name === 'e. anche Attenzione per drawdown') {
    for (let t = 0; t < N; t++) out[t] = valid[t] && A[t] != null && b[t] <= A[t] && (normal(t) || (st[t] === 'watch' && b[t] > L + P.watchBand));
    return out;
  }
  if (name === 'D. attuale oppure Attenzione') { for (let t = 0; t < N; t++) out[t] = base[t] || (valid[t] && st[t] === 'watch'); return out; }
  if (name === 'E. solo Attenzione') { for (let t = 0; t < N; t++) out[t] = valid[t] && st[t] === 'watch'; return out; }
  throw new Error(name);
}
const VARIANTS = ['attuale (q90)', 'a. q85', 'a. q95', 'b. livello + 10 titoli', 'b. livello + 15 titoli', 'b. livello + 20 titoli',
  'c. 2 chiusure di fila', 'd1. in caduta (ogni giorno)', 'd2. in caduta all\'ingresso', 'e. anche Attenzione per drawdown',
  'D. attuale oppure Attenzione', 'E. solo Attenzione'];
const PERIODS = [['2005–2015', '0000', '2015-12-31'], ['2016–2026', '2016-01-01', '9999']];
function evaluate(name, keys = SECTOR_KEYS) {
  const T = { eps: 0, hitEl: 0, full: 0, leads: [], touches: 0, warned: 0, days: 0, valid: 0, short: 0, segs: 0, seg12: 0, ret: [], missed: [], per: {} };
  for (const [p] of PERIODS) T.per[p] = { touches: 0, warned: 0, days: 0, valid: 0, eps: 0, hit: 0, full: 0 };
  for (const k of keys) {
    const { b, L, valid, px, st } = S[k];
    const on = variantOn(k, name), eps = episodesOf(on, valid), touches = touchesOf(b, L, valid);
    const per = (t) => PERIODS.find(([, a, z]) => D[t] >= a && D[t] <= z)[0];
    T.eps += eps.length;
    for (const e of eps) {
      const full = e.t0 + H <= NOW, u = firstTouch(b, L, e.t0);
      if (full || u >= 0) { T.full++; T.per[per(e.t0)].full++; if (u >= 0) { T.hitEl++; T.leads.push(u - e.t0); T.per[per(e.t0)].hit++; } }
      T.per[per(e.t0)].eps++;
      if (e.days.length <= 2) T.short++;
      T.segs += e.segs.length; T.seg12 += e.segs.filter((x) => x <= 2).length;
      const r = forward(px, e.t0, RET); if (r != null) T.ret.push(r);
    }
    for (const u of touches) {
      const w = eps.some((e) => e.t0 <= u - LEAD && u - e.t0 <= H);
      T.touches++; T.per[per(u)].touches++;
      if (w) { T.warned++; T.per[per(u)].warned++; } else T.missed.push(`${k} ${D[u]}`);
    }
    for (let t = 0; t <= NOW; t++) if (valid[t]) { T.valid++; T.per[per(t)].valid++; if (on[t]) { T.days++; T.per[per(t)].days++; } }
  }
  return {
    allarmi: T.eps, arrivano: `${T.hitEl}/${T.full}`, quotaArrivano: pct(T.hitEl, T.full), anticipoMediano: median(T.leads),
    tocchiAvvisati: `${T.warned}/${T.touches}`, tocchiAvvisatiN: T.warned, quotaSeduteInAllarme: pct(T.days, T.valid),
    episodi1_2: T.short, quotaEpisodi1_2: pct(T.short, T.eps), quotaTratti1_2: pct(T.seg12, T.segs),
    etf63Mediano: r1(median(T.ret)), etf63Positivi: pct(T.ret.filter((x) => x > 0).length, T.ret.length),
    perPeriodo: Object.fromEntries(Object.entries(T.per).map(([p, x]) => [p, { tocchiAvvisati: `${x.warned}/${x.touches}`, quotaSeduteInAllarme: pct(x.days, x.valid), arrivano: `${x.hit}/${x.full}` }])),
    tocchiPersi: T.missed,
  };
}
const varianti = {}, variantiPerSettore = {};
for (const v of VARIANTS) {
  varianti[v] = evaluate(v);
  variantiPerSettore[v] = Object.fromEntries(SECTOR_KEYS.map((k) => { const e = evaluate(v, [k]); return [k, { allarmi: e.allarmi, arrivano: e.arrivano, tocchiAvvisati: e.tocchiAvvisati, quotaSeduteInAllarme: e.quotaSeduteInAllarme, quotaEpisodi1_2: e.quotaEpisodi1_2, anticipoMediano: e.anticipoMediano }]; }));
}
// criterio deciso prima (vedi la nota): migliore se tocchi avvisati ≥ attuale − 2, quota che arriva ≥ attuale, anticipo
// mediano ≥ 15 sedute, e almeno una tra sedute in allarme −20% o episodi di 1–2 sedute −33% (in quota)
{
  const a = varianti['attuale (q90)'];
  for (const [v, x] of Object.entries(varianti)) {
    if (v === 'attuale (q90)' || v.startsWith('D.') || v.startsWith('E.')) continue;
    const c1 = x.tocchiAvvisatiN >= a.tocchiAvvisatiN - 2, c2 = x.quotaArrivano >= a.quotaArrivano, c3 = x.anticipoMediano != null && x.anticipoMediano >= 15;
    const c4 = x.quotaSeduteInAllarme <= 0.8 * a.quotaSeduteInAllarme || x.quotaEpisodi1_2 <= (2 / 3) * a.quotaEpisodi1_2;
    x.criterio = { tocchiNonPeggio: c1, arrivanoNonPeggio: c2, anticipoAlmeno15: c3, menoAllarmeOMenoBrevi: c4, migliore: c1 && c2 && c3 && c4 };
  }
}
// riproduzione della regola C di ricerca/attenzione (storia intera, apprDays esatto): 42/73 atteso
{
  let w = 0, tt = 0;
  for (const k of SECTOR_KEYS) {
    const { b, L, apprApp } = S[k];
    const any = b.map((v) => v != null);
    const eps = episodesOf(apprApp, any), touches = touchesOf(b, L, any);
    tt += touches.length; w += touches.filter((u) => eps.some((e) => e.t0 <= u - LEAD && u - e.t0 <= H)).length;
  }
  checks.regolaC_storiaIntera = `${w}/${tt}`;
}

// ---------- 5. regole d'uso: percentuali di arrivo condizionate ----------
const done = flatEps.filter((e) => e.full || e.hit);
const rate = (f) => { const x = done.filter(f); return { arrivano: `${x.filter((e) => e.hit).length}/${x.length}`, quota: pct(x.filter((e) => e.hit).length, x.length), etf63Mediano: r1(median(x.map((e) => e.etf63))) }; };
const uso = {
  tutti: rate(() => true),
  allaTerzaSeduta: {
    'ancora in avvicinamento': rate((e) => e.allaTerzaSeduta === 'ancora in avvicinamento'),
    'tornato sopra la soglia': rate((e) => e.allaTerzaSeduta === 'tornato sopra la soglia'),
    'già in Attenzione o oltre': rate((e) => e.allaTerzaSeduta === 'già in Attenzione o oltre'),
  },
  calo10AllIngresso: { 'veloce (≥ 75° percentile)': rate((e) => e.calo10Veloce), 'lento': rate((e) => !e.calo10Veloce) },
  altriSettoriCaldiAllIngresso: { '0–1': rate((e) => e.altriSettoriCaldi <= 1), '2–4': rate((e) => e.altriSettoriCaldi >= 2 && e.altriSettoriCaldi <= 4), '5 o più': rate((e) => e.altriSettoriCaldi >= 5) },
  drawdownAllIngresso: { 'sotto il 50° percentile': rate((e) => e.ddPercentile < 50), '50°–84°': rate((e) => e.ddPercentile >= 50) },
  gruppo: { 'XLRE e XLU': rate((e) => e.k === 'XLRE' || e.k === 'XLU'), 'altri 9': rate((e) => e.k !== 'XLRE' && e.k !== 'XLU') },
  per2periodi: Object.fromEntries(PERIODS.map(([p, a, z]) => [p, {
    tutti: rate((e) => e.ingresso >= a && e.ingresso <= z),
    terzaSedutaAncora: rate((e) => e.ingresso >= a && e.ingresso <= z && e.allaTerzaSeduta === 'ancora in avvicinamento'),
    terzaSedutaTornato: rate((e) => e.ingresso >= a && e.ingresso <= z && e.allaTerzaSeduta === 'tornato sopra la soglia'),
    altri5: rate((e) => e.ingresso >= a && e.ingresso <= z && e.altriSettoriCaldi >= 5),
    altri0_1: rate((e) => e.ingresso >= a && e.ingresso <= z && e.altriSettoriCaldi <= 1),
  }])),
};
// crisi distinte tra gli episodi che arrivano: anni
uso.anniDegliArrivi = {};
for (const e of done.filter((e) => e.hit)) uso.anniDegliArrivi[e.ingresso.slice(0, 4)] = (uso.anniDegliArrivi[e.ingresso.slice(0, 4)] || 0) + 1;

// ---------- uscita ----------
const out = { asOf: D[NOW], metodo: 'vedi testa dello script', controlli: checks, riepilogo, passaggi, confronto, titoliVsQuota, xlre2025, varianti, variantiPerSettore, uso, episodi };
fs.writeFileSync(new URL('../casi_varianti.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');

// stampa
console.log('dati al', D[NOW], '· controlli', JSON.stringify(checks));
console.log('\n1. riepilogo per settore');
for (const [k, r] of Object.entries(riepilogo)) console.log(k.padEnd(7), JSON.stringify({ ep: r.episodi, durMed: r.durataMediana, avvMed: r.seduteAvvMediane, quotaAvv: r.quotaSeduteAvv, ep12: `${r.episodi1_2} (${r.quotaEpisodi1_2}%)`, tratti12: r.quotaTratti1_2, esiti: r.esiti, arrivano: r.arrivanoAlBlu, etf63: r.etf63Mediano, pos: r.etf63Positivi, base: r.baseEtf63Mediano, basePos: r.basePositivi, oggi: r.inAvvicinamentoOggi }));
console.log('\n2. passaggi');
for (const [k, r] of Object.entries(passaggi)) console.log(k.padEnd(7), JSON.stringify({ ...r, elenco: undefined }));
console.log('\n3. confronto');
for (const [k, r] of Object.entries(confronto)) console.log(k.padEnd(7), JSON.stringify(r));
console.log(JSON.stringify(titoliVsQuota), JSON.stringify({ ...xlre2025, episodi: xlre2025.episodi.map((e) => `${e.ingresso}→${e.ultimo} ${e.seduteAvv}/${e.durata} ${e.esito}`) }));
console.log('\n4. varianti');
for (const [k, r] of Object.entries(varianti)) console.log(k.padEnd(34), JSON.stringify({ ...r, tocchiPersi: r.tocchiPersi.length }));
console.log('\n5. uso', JSON.stringify(uso, null, 1));
