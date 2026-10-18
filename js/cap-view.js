/*
 * cap-view.js — scheda «Cali forti» (capitolazione) nelle viste 4 Settore e 6 Indici, più la colonna e il riepilogo
 * nella tabella degli indici. Dati: data/capitulation.json (formato e metodo in capitulation.js), scaricato alla
 * prima apertura di una delle due viste. È un'allerta di contesto: non cambia stati, regole né alert.
 */
import { capSeries, capAnalysis, capOutcomes, CAP_DEFAULT } from './capitulation.js';
import { drawCap } from './cap-chart.js';
import { esc, fmt, pct, sgn, dIT, chartWidth, keepFocus } from './format.js';


const CHOICES = { thr: [5, 7, 10], win: [3, 5, 10], mode: ['count', 'pct'] };
const isPreset = (o) => o.thr === CAP_DEFAULT.thr && o.win === CAP_DEFAULT.win && o.mode === CAP_DEFAULT.mode;
const titoli = (v) => `${fmt(v, 0)} ${v === 1 ? 'calo' : 'cali'}`;

/**
 * @param {{store: {get: Function, set: Function}, load: () => Promise<object>}} ctx
 */
export function createCap(ctx) {
  const { store } = ctx;
  let data = null, loading = null, failed = null, waiting = false;
  const S = {}, cache = new Map(), listeners = new Set();
  const saved = store.get('cap', {}) || {};
  const opt = Object.fromEntries(Object.entries(CHOICES).map(([k, a]) => [k, a.includes(saved[k]) ? saved[k] : CAP_DEFAULT[k]]));

  function ensure() {
    if (data || failed) return Promise.resolve(data);
    if (!loading) loading = ctx.load().then((d) => { if (!d || !d.series) throw new Error('file vuoto'); data = d; }).catch((e) => { failed = e; });
    return loading.then(() => data);
  }
  // ridisegna chi usa la scheda quando arrivano i dati o cambiano le scelte
  const onChange = (fn) => listeners.add(fn);
  const notify = () => listeners.forEach((fn) => fn());
  function setOpt(k, v) {
    opt[k] = v;
    store.set('cap', { ...opt });
    notify();
  }
  function series(k) {
    if (!data || !data.series[k]) return null;
    return S[k] || (S[k] = capSeries(data.series[k]));
  }
  function analysis(k) {
    const key = `${k}:${opt.thr}:${opt.win}:${opt.mode}`;
    if (!cache.has(key)) {
      const s = series(k);
      if (!s) return null; // dati non ancora arrivati: niente in cache
      cache.set(key, capAnalysis(s, { ...CAP_DEFAULT, ...opt }));
    }
    return cache.get(key);
  }
  const unit = () => (opt.mode === 'pct' ? '%' : '');
  const val = (v) => (v == null ? '—' : opt.mode === 'pct' ? `${fmt(v)}%` : titoli(v));
  const what = () => `${opt.mode === 'pct' ? '% dei titoli' : 'titoli'} con un calo di almeno il ${opt.thr}% in una seduta, sommati sulle ultime ${opt.win} sedute`;

  /** Situazione di oggi di una serie (null se mancano i dati). */
  function status(k) {
    const a = analysis(k);
    return a && a.today ? { ...a.today, date: series(k).dates[a.today.i], episodes: a.episodes.length } : null;
  }
  /** Episodi e sedute in allerta nelle ultime 252 sedute (12 mesi). */
  function yearText(a) {
    const n = a.on.length, i0 = Math.max(0, n - 252);
    let on = 0;
    for (let i = i0; i < n; i++) if (a.on[i]) on++;
    const ep = a.episodes.filter((e) => e.end >= i0).length;
    return on ? `; negli ultimi 12 mesi ${ep} ${ep === 1 ? 'episodio' : 'episodi'}, ${on} ${on === 1 ? 'seduta' : 'sedute'} in allerta` : '';
  }
  /** Riga informativa per «Perché questo stato»: solo se c'è stata allerta negli ultimi 3 mesi. */
  function info(k) {
    const t = status(k);
    if (!t || (!t.on && !t.recent)) return '';
    const head = t.on ? `<b>Cali forti: allerta al ${dIT(t.date)}</b> (${val(t.value)} in ${opt.win} sedute, soglia ${val(t.alert)})` : `<b>Cali forti</b>: nessuna allerta al ${dIT(t.date)}`;
    return `<p class="note capinfo">ⓘ ${head} · ${t.recent} ${t.recent === 1 ? 'seduta' : 'sedute'} in allerta negli ultimi 3 mesi. Informativo: non fa parte delle regole del semaforo (scheda «Cali forti» qui sotto).</p>`;
  }
  /** Cella della tabella degli indici. */
  function cell(k, noCap) {
    if (noCap) return `<td class="muted" title="${esc(noCap)}">—</td>`;
    const t = status(k);
    if (!t) return '<td class="muted">…</td>';
    const tip = `Cali forti al ${dIT(t.date)}: ${val(t.value)} nelle ultime ${opt.win} sedute (calo di almeno il ${opt.thr}%), ${fmt(t.pct, 0)}° percentile della storia · soglia di allerta ${val(t.alert)} · ${t.recent} sedute in allerta negli ultimi 3 mesi`;
    const body = t.on ? '<span class="capflag">allerta</span>' : t.recent ? `<span class="capflag weak">${t.recent} sed.</span>` : `<span class="muted num">${fmt(t.pct, 0)}°</span>`;
    return `<td class="r" title="${esc(tip)}">${body}</td>`;
  }

  /**
   * Disegna la scheda con gli elementi `${p}Cap…` (p = 'ix' o 'sec').
   * @param {string} p prefisso degli id
   * @param {string} k serie (indice o settore)
   * @param {{dates: string[], close: number[], from: string, name: string, noCap?: string, what: string}} o
   *   dates/close: prezzo da mostrare e per i rendimenti; from: prima data del grafico (periodo della vista)
   */
  function card(p, k, o) {
    const $ = (id) => document.getElementById(p + id);
    const meta = $('CapMeta'), body = $('CapBody');
    if (!meta) return;
    const show = (on) => { for (const id of ['CapCtl', 'CapNow', 'CapWrap', 'CapLegend', 'CapScroll', 'CapBase']) $(id).hidden = !on; };
    if (o.noCap) { meta.textContent = 'non disponibile'; show(false); $('CapNote').textContent = o.noCap; return; }
    if (failed) { meta.textContent = 'dati non disponibili'; show(false); $('CapNote').textContent = `Dati dei cali forti non disponibili (${failed.message}).`; return; }
    if (!data) {
      meta.textContent = 'caricamento…'; show(false);
      if (!waiting) { waiting = true; ensure().then(() => { waiting = false; notify(); }); }
      return;
    }
    const s = series(k), a = analysis(k);
    if (!s || !a || !a.today) { meta.textContent = 'non disponibile'; show(false); $('CapNote').textContent = 'Per questa serie i cali forti non sono ancora calcolati.'; return; }
    show(true);
    const t = a.today;
    meta.innerHTML = t.on ? `<span class="capflag">allerta</span> <span class="muted">al ${dIT(s.dates[t.i])}</span>` : `al ${dIT(s.dates[t.i])}: ${fmt(t.pct, 0)}° percentile${t.recent ? ` · ${t.recent} sedute in allerta negli ultimi 3 mesi` : ''}`;
    // scelte: soglia, sedute, unità; il preset di Quant Rea è −7% su 5 sedute in titoli
    const seg = (key, label, fmtv) => `<span class="ctl">${label}<span class="seg" role="group" aria-label="${label}">` +
      CHOICES[key].map((v) => `<button type="button" data-k="${key}" data-v="${v}" aria-pressed="${opt[key] === v}">${fmtv(v)}</button>`).join('') + '</span></span>';
    keepFocus($('CapCtl'), 'data-v', seg('thr', 'Calo', (v) => `−${v}%`) + seg('win', 'Sedute', (v) => String(v)) + seg('mode', 'Mostra', (v) => (v === 'pct' ? '% titoli' : 'titoli')) +
      `<button type="button" class="mini" data-preset ${isPreset(opt) ? 'hidden' : ''}>Preset di Rea (−7%, 5 sedute)</button>`);
    $('CapCtl').querySelectorAll('button[data-k]').forEach((b) => { b.onclick = () => setOpt(b.dataset.k, b.dataset.k === 'mode' ? b.dataset.v : +b.dataset.v); });
    const pr = $('CapCtl').querySelector('button[data-preset]');
    if (pr) pr.onclick = () => { opt.thr = CAP_DEFAULT.thr; opt.win = CAP_DEFAULT.win; opt.mode = CAP_DEFAULT.mode; store.set('cap', { ...opt }); notify(); };

    const since = a.from >= 0 ? s.dates[a.from] : null;
    $('CapNow').innerHTML = (t.on
      ? `<b class="down">Allerta</b> al ${dIT(s.dates[t.i])}: ${val(t.value)} nelle ultime ${opt.win} sedute, sopra la soglia di ${val(t.alert)}.`
      : `Al ${dIT(s.dates[t.i])} ${val(t.value)} nelle ultime ${opt.win} sedute: ${fmt(t.pct, 0)}° percentile della storia${since ? ` dal ${since.slice(0, 4)}` : ''}, soglia di allerta ${val(t.alert)}.`) +
      ` In allerta ${t.recent} ${t.recent === 1 ? 'seduta' : 'sedute'} negli ultimi 3 mesi` + yearText(a) + '.';

    // grafico: dal periodo della vista, prezzo allineato per data
    const at = new Map(o.dates.map((d, i) => [d, o.close[i]]));
    let i0 = s.dates.findIndex((d) => d >= o.from);
    if (i0 < 0) i0 = 0;
    let last = null;
    const px = s.dates.map((d) => (at.has(d) ? (last = at.get(d)) : last));
    drawCap($('CapSvg'), {
      dates: s.dates.slice(i0), close: px.slice(i0), sum: a.sum.slice(i0), alert: a.alert.slice(i0), on: a.on.slice(i0),
      unit: unit(), label: `CALI FORTI · ${opt.mode === 'pct' ? '% DEI TITOLI' : 'TITOLI'} CON −${opt.thr}% O PEGGIO, SOMMA SU ${opt.win} SEDUTE`,
      short: `CALI FORTI · −${opt.thr}% · ${opt.win} SEDUTE${opt.mode === 'pct' ? ' · %' : ''}`,
      sym: k, tipEl: $('CapTip'), wrapEl: $('CapWrap'), width: chartWidth($('CapSvg'), 940, 380),
    });

    // episodi: dal più recente
    const { rows, base } = capOutcomes(a.episodes, s.dates, o.dates, o.close, a.from);
    const c = (v) => (v == null ? '<span class="muted">—</span>' : pct(v * 100));
    $('CapTable').innerHTML = rows.length
      ? `<thead><tr><th>Allerta dal</th><th>al</th><th class="r">Sedute in allerta</th><th class="r">Picco</th><th class="r" title="Calo ${esc(o.what)} dal massimo a 52 settimane il primo giorno dell'allerta: solo informativo">Dal max 52s</th><th class="r" title="Il punto più basso nelle 63 sedute dopo il primo giorno, rispetto a quel giorno">Calo dopo, 3M</th><th class="r">+3M</th><th class="r">+12M</th></tr></thead><tbody>` +
        rows.slice().reverse().map((r) => `<tr><td class="num">${dIT(r.date)}</td><td class="num">${r.end !== r.date ? dIT(r.end) : '<span class="muted">—</span>'}</td><td class="num r">${r.days}</td><td class="num r">${val(r.peak)}</td><td class="num r">${r.dd52 == null ? '—' : sgn(r.dd52 * 100) + '%'}</td><td class="num r">${c(r.fall63)}</td><td class="num r">${c(r.r63)}</td><td class="num r">${c(r.r252)}</td></tr>`).join('') + '</tbody>'
      : `<tbody><tr><td class="muted">Nessuna allerta${since ? ` dal ${dIT(since)}` : ''} con queste scelte.</td></tr></tbody>`;
    const neg = rows.filter((r) => r.r252 != null && r.r252 < 0).length, done = rows.filter((r) => r.r252 != null).length;
    $('CapBase').innerHTML = `${rows.length} ${rows.length === 1 ? 'episodio' : 'episodi'}${since ? ` dal ${dIT(since)}` : ''}` +
      (done ? `, ${neg} su ${done} con ${esc(o.what)} più in basso dopo 12 mesi` : '') +
      `. Per confronto, in media dopo una seduta qualsiasi della stessa storia: +3M ${c(base.r63)}, +12M ${c(base.r252)}.`;
    $('CapNote').innerHTML = `Quanti ${what()} (preset di Quant Rea, «Drop giornaliero cumulato»: −7% su 5 sedute). La linea tratteggiata è la soglia di allerta: il 99° percentile delle sedute precedenti, con almeno 5 cali nella somma. ` +
      'Un\'allerta dice che sotto la superficie le vendite sono forti e diffuse. Conta soprattutto se si ripete: con il preset, nei 12 mesi dal primo episodio le serie dell\'app sono state in allerta 31,5 sedute di mediana nel 2007-2009 (in più episodi), 12 nel 2020 e 5 nell\'aprile 2025. ' +
      'È un\'informazione di contesto da leggere con la breadth: non cambia stati, regole né alert. Storia con la stessa composizione della breadth; non contano i cali che la seduta dopo si riprendono quasi tutti mentre per gli altri membri quel giorno e il seguente sono tranquilli (errori di stampa della fonte).';
    body.dataset.k = k;
  }
  return { ensure, onChange, status, info, cell, card, ready: () => !!data };
}
