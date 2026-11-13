/*
 * volprofile.js — profilo dei volumi degli ultimi 12 mesi accanto al grafico del pannello «Distanza dal massimo degli
 * ultimi 3 anni» (vista 8 VIX, dalla 1.11.0). Funzioni pure, senza rete: le usa scripts/fetch_ath.js.
 *
 * Metodo (deciso e verificato in ricerca/poc/profilo/, sintesi.md; stessi calcoli di mapped() e profile() di analisi.mjs,
 * ricalcolati in modo indipendente da verifica.py):
 *  - finestra: sedute dalla stessa data di un anno prima (windowStart di js/ath.js) all'ultima seduta chiusa del grafico;
 *  - strumento dei volumi portato sulla scala del grafico con il rapporto delle chiusure della stessa seduta
 *    (grafico / strumento, 1 se sono lo stesso simbolo); sedute senza le due chiusure scartate e contate;
 *  - barre giornaliere; se il volume giornaliero è meno della metà della somma oraria della stessa seduta (mediana dei 12
 *    mesi: SI=F e HG=F, il cui storico giornaliero è il contratto del mese più vicino) la barra del giorno si costruisce
 *    dalle orarie (massimo, minimo, somma dei volumi);
 *  - un volume giornaliero uguale a quello della seduta prima si scarta (Yahoo ricopia il volume del giorno prima
 *    sull'ultima seduta dei future): la seduta resta, con volume 0;
 *  - il volume di ogni seduta si divide in parti uguali, sulla scala logaritmica, tra minimo e massimo della seduta (tutto
 *    nella fascia della chiusura se minimo = massimo); 100 fasce uguali sulla scala logaritmica tra il minimo e il massimo
 *    delle sedute della finestra; quote in centesimi di punto percentuale (bp, interi: la somma è circa 10.000);
 *  - prezzi dei future continui così come sono (la stessa linea del grafico).
 */

export const N_BINS = 100;
export const LIMITS = { maxSkipped: 0.05, maxNoVolume: 0.1, hourlyLagDays: 7, dailyVsHourly: 0.5 };

const median = (a) => { const s = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const closeMap = (dates, close) => { const m = new Map(); for (let i = 0; i < dates.length; i++) if (close[i] != null) m.set(dates[i], close[i]); return m; };
const addDays = (d, k) => new Date(Date.parse(d) + k * 86400000).toISOString().slice(0, 10);

/**
 * Barre dello strumento dei volumi sulla scala del grafico, una per seduta della finestra.
 * @param {{chart: {dates: string[], close: number[]}, vol: {dates: string[], close: number[], high: number[], low: number[], volume: (number|null)[]},
 *   hourly?: {s: string, h: number, l: number, c: number, v: number}[] | null, from: string, to: string}} o
 *   vol: barre giornaliere (parse di scripts/lib/yahoo.js con withVolume); hourly: barre orarie (parseHourly), solo dove servono
 * @returns {{bars: {s: string, h: number, l: number, c: number, v: number}[], info: {candidates: number, skipped: number,
 *   stale: string[], noVolume: number, dailyVsHourly: number|null, fromHourly: boolean, firstHourly: string|null}}}
 */
export function scaledBars({ chart, vol, hourly = null, from, to }) {
  const target = closeMap(chart.dates, chart.close), vm = closeMap(vol.dates, vol.close);
  const factor = (s) => (target.has(s) && vm.has(s) ? target.get(s) / vm.get(s) : null);
  const H = hourly || [];
  const hsum = new Map();
  for (const x of H) if (x.s >= from && x.s <= to) hsum.set(x.s, (hsum.get(x.s) || 0) + x.v);
  const vv = (i) => vol.volume[i] || 0;
  const idx = []; for (let i = 0; i < vol.dates.length; i++) if (vol.dates[i] >= from && vol.dates[i] <= to) idx.push(i);
  const dailyVsHourly = median(idx.filter((i) => hsum.get(vol.dates[i]) > 0).map((i) => vv(i) / hsum.get(vol.dates[i])));
  const fromHourly = dailyVsHourly != null && dailyVsHourly < LIMITS.dailyVsHourly;
  const firstHourly = H.find((x) => x.s >= from && x.s <= to);
  const info = { candidates: 0, skipped: 0, stale: [], noVolume: 0, dailyVsHourly, fromHourly, firstHourly: firstHourly ? firstHourly.s : null };
  const bars = [];
  if (fromHourly) {
    const agg = new Map();
    for (const x of H) {
      if (x.s < from || x.s > to) continue;
      const a = agg.get(x.s);
      if (!a) agg.set(x.s, { s: x.s, h: x.h, l: x.l, c: x.c, v: x.v });
      else { a.h = Math.max(a.h, x.h); a.l = Math.min(a.l, x.l); a.c = x.c; a.v += x.v; }
    }
    for (const a of [...agg.values()].sort((p, q) => (p.s < q.s ? -1 : 1))) {
      info.candidates++;
      const f = factor(a.s); if (f == null) { info.skipped++; continue; }
      bars.push({ s: a.s, h: a.h * f, l: a.l * f, c: a.c * f, v: a.v });
    }
  } else {
    for (const i of idx) {
      info.candidates++;
      const s = vol.dates[i], f = factor(s); if (f == null) { info.skipped++; continue; }
      let v = vv(i);
      if (v > 0 && i > 0 && vv(i - 1) === v) { info.stale.push(s); v = 0; }
      bars.push({ s, h: vol.high[i] * f, l: vol.low[i] * f, c: vol.close[i] * f, v });
    }
  }
  info.noVolume = bars.filter((b) => !(b.v > 0)).length;
  return { bars, info };
}

/** n + 1 bordi uguali sulla scala logaritmica tra lo e hi */
export const logEdges = (lo, hi, n) => Array.from({ length: n + 1 }, (_, i) => Math.exp(Math.log(lo) + ((Math.log(hi) - Math.log(lo)) * i) / n));

function binOf(e, p) {
  if (p <= e[0]) return 0;
  if (p >= e[e.length - 1]) return e.length - 2;
  let a = 0, b = e.length - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (e[m] <= p) a = m; else b = m; }
  return a;
}

/** Volume per fascia: ogni barra spalmata in modo uniforme sulla scala logaritmica tra minimo e massimo */
export function spread(bars, e) {
  const v = new Float64Array(e.length - 1);
  for (const x of bars) {
    if (!(x.v > 0)) continue;
    if (x.h <= x.l) { v[binOf(e, x.c)] += x.v; continue; }
    const i0 = binOf(e, x.l), i1 = binOf(e, x.h), w = Math.log(x.h) - Math.log(x.l);
    for (let i = i0; i <= i1; i++) v[i] += (x.v * (Math.log(Math.min(x.h, e[i + 1])) - Math.log(Math.max(x.l, e[i])))) / w;
  }
  return v;
}

/**
 * Profilo pubblicato: fasce logaritmiche tra il minimo e il massimo delle barre, quote in centesimi di punto (bp).
 * @returns {{lo: number, hi: number, n: number, bp: number[], loExact: number, hiExact: number} | null} null senza volume o con prezzi ≤ 0
 */
export function volumeProfile(bars, n = N_BINS) {
  if (!bars.length) return null;
  const lo = Math.min(...bars.map((x) => x.l)), hi = Math.max(...bars.map((x) => x.h));
  if (!(lo > 0) || !(hi > lo)) return null;
  const e = logEdges(lo, hi, n), v = spread(bars, e), tot = v.reduce((a, b) => a + b, 0);
  if (!(tot > 0)) return null;
  // lo e hi con 10 cifre significative: con 8 il bitcoin (decine di migliaia di dollari) sbagliava a volte il secondo decimale
  return { lo: +lo.toPrecision(10), hi: +hi.toPrecision(10), n, bp: Array.from(v, (x) => Math.round((x / tot) * 10000)), loExact: lo, hiExact: hi };
}

/**
 * Profilo di un mercato con le regole d'errore di ricerca/poc/profilo/sintesi.md §4.3.
 * @param {{chart: object, vol: object, hourly?: object[]|null, needHourly?: boolean, from: string, to: string}} o
 * @returns {{profile: object|null, why: string|null, info: object}} profile: {from, to, sessions, source, lo, hi, n, scale, bp}
 */
export function buildProfile(o) {
  const { from, to } = o;
  if (o.needHourly && !(o.hourly && o.hourly.length)) return { profile: null, why: 'barre orarie non arrivate', info: null };
  const { bars, info } = scaledBars(o);
  if (o.needHourly && info.fromHourly && (!info.firstHourly || info.firstHourly > addDays(from, LIMITS.hourlyLagDays)))
    return { profile: null, why: `barre orarie dal ${info.firstHourly || '—'}, oltre ${LIMITS.hourlyLagDays} giorni dopo l'inizio della finestra (${from})`, info };
  if (!info.candidates || !bars.length) return { profile: null, why: 'nessuna seduta nella finestra', info };
  if (info.skipped / info.candidates > LIMITS.maxSkipped) return { profile: null, why: `${info.skipped} sedute su ${info.candidates} senza chiusura comune con il grafico (oltre il 5%)`, info };
  // copertura: le sedute del grafico nella finestra devono avere quasi tutte una barra dei volumi (un buco di settimane in
  // SPY o nelle barre orarie farebbe un profilo con le date piene ma senza una parte dell'anno)
  const chartN = o.chart.dates.filter((d, i) => d >= from && d <= to && o.chart.close[i] != null).length;
  if (chartN && bars.length < (1 - LIMITS.maxSkipped) * chartN) return { profile: null, why: `${bars.length} sedute con i volumi su ${chartN} del grafico nella finestra (mancano oltre il 5%)`, info };
  if (info.noVolume / bars.length > LIMITS.maxNoVolume) return { profile: null, why: `${info.noVolume} sedute su ${bars.length} senza volume (oltre il 10%)`, info };
  if (bars.some((b) => !(b.l > 0) || !(b.c > 0))) return { profile: null, why: 'prezzi ≤ 0 nella finestra: fasce logaritmiche impossibili', info };
  const p = volumeProfile(bars);
  if (!p) return { profile: null, why: 'nessun volume nella finestra', info };
  return { profile: { from, to, sessions: bars.length, source: info.fromHourly ? 'orarie' : 'giornaliere', lo: p.lo, hi: p.hi, n: p.n, scale: 'log', bp: p.bp }, why: null, info };
}
