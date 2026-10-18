/*
 * indices.js — pagina Indici: la stessa analisi dei settori (breadth a 200 sedute contro un livello
 * blu, drawdown, macchina a stati) sui principali indici azionari. Riusa signals.js, sector-chart.js e
 * bottom-map.js senza cambiarne la logica. Dati: data/indices.json (formato in indexdata.js) e
 * config/indices.json (livelli e qualità della storia), caricati alla prima apertura della pagina.
 */
import { priceSeries, runMachine, forward, worstWithin, offReasons, approachLevel, explainState, signalContext, DEFAULT_PARAMS, STATES } from './signals.js';
import { indexSeries } from './indexdata.js';
import { weeklyIndices } from './engine.js';
import { drawSector } from './sector-chart.js';
import { drawBottomMap, zoneOf } from './bottom-map.js';
import { nearestHead, SIZE } from './rrg-chart.js';
import { badge, apprBadge } from './bottom.js';
import { esc, fmt, sgn, pct, dIT, placeTip, chartWidth, keepFocus, ilPct, delPct, checklistHTML, contextHTML } from './format.js';

const ORDER = { setup: 0, fail: 1, trig: 2, cool: 3, watch: 4, appr: 4.5, normal: 5 };
// grafici su TradingView: indice e, dove esiste, la serie pronta della % di titoli sopra la media 200
const TV = {
  SPX: ['SP:SPX', 'INDEX:S5TH'], NDX: ['NASDAQ:NDX', 'INDEX:NDTH'], DJI: ['DJ:DJI', 'INDEX:DITH'], N225: ['TVC:NI225'],
  SXXP: ['TVC:SXXP'], UKX: ['TVC:UKX'], DAX: ['XETR:DAX'], CAC: ['EURONEXT:PX1'], SMI: ['SIX:SMI'],
};
const tvLink = (sym) => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
const titoli = (k) => `${k} ${k === 1 ? 'titolo' : 'titoli'}`;

/**
 * @param {{$: (id: string) => HTMLElement, store: {get: Function, set: Function}, params: object, config: object,
 *          load: () => Promise<object>, cap?: object}} ctx  config: config/indices.json; load: restituisce data/indices.json;
 *   cap: scheda dei cali forti (cap-view.js)
 */
export function createIndices(ctx) {
  const { $, store, cap } = ctx;
  const P = { ...DEFAULT_PARAMS, ...ctx.params };
  const CFG = ctx.config.indices;
  // KEYS: indici con i dati già scaricati (prima i principali, poi gli altri); ALL: tutti quelli in configurazione
  const ALL = Object.keys(CFG);
  let D = null, KEYS = [], loading = null, failed = null, more = null;
  const S = {}, PX = {}, NOW = {}, cache = new Map();
  const st = { blue: {}, sel: null, range: null, focus: null, pending: null, shown: new Set(), mapWeek: null };
  // indici mostrati in tabellone, Bottom Map e schede: di partenza i principali ("main" in config), poi
  // quelli scelti nel selettore (salvati nel browser). Il selettore li raggruppa per area.
  const ORDER_AREAS = ['Nord America', 'Europa', 'Asia-Pacifico', 'Emergenti'];
  const AREAS = [...new Set(Object.values(CFG).map((c) => c.area))].sort((a, b) => (ORDER_AREAS.indexOf(a) + 1 || 99) - (ORDER_AREAS.indexOf(b) + 1 || 99));
  const MAIN = () => KEYS.filter((k) => CFG[k].main);
  const VIS = () => KEYS.filter((k) => st.shown.has(k));

  function addSeries(data) {
    for (const k of ALL) {
      if (S[k] || !data.series[k]) continue;
      S[k] = indexSeries(data.series[k]);
      PX[k] = priceSeries(S[k].close);
      let t = S[k].dates.length - 1;
      while (t > 0 && S[k].pct200[t] == null) t--;
      NOW[k] = t;
    }
    KEYS = ALL.filter((k) => S[k]);
  }
  function ready(data) {
    addSeries(data);
    st.blue = { ...defaults(), ...validBlue(store.get('ixBlue', {})) };
    // scelte salvate valide anche per gli indici che arrivano dopo, con il secondo file
    const sel = store.get('ixSel');
    st.sel = KEYS.includes(sel) ? sel : KEYS[0];
    if (sel !== st.sel && ALL.includes(sel)) st.pending = sel;
    st.range = ['3A', '10A', 'MAX'].includes(store.get('ixRange')) ? store.get('ixRange') : '3A';
    const saved = store.get('ixShown', null);
    const keep = Array.isArray(saved) ? saved.filter((k) => ALL.includes(k)) : [];
    st.shown = new Set(keep.length ? keep : MAIN());
    D = data;
  }
  // secondo file (indici non principali): si scarica dopo il primo disegno, poi si ridisegna se la pagina è aperta
  function loadMore() {
    if (more || !ctx.loadMore) return;
    more = ctx.loadMore().then((data) => {
      if (!data || !data.series) return;
      addSeries(data);
      st.blue = { ...defaults(), ...validBlue(store.get('ixBlue', {})) };
      if (!$('v-idx').hidden) render();
    }).catch(() => { /* restano i principali */ });
  }
  const defaults = () => Object.fromEntries(ALL.map((k) => [k, CFG[k].blue]));
  function validBlue(v) {
    return Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {})
      .filter(([k, x]) => ALL.includes(k) && Number.isInteger(x) && x >= 0 && x <= 60));
  }
  const changed = (k) => st.blue[k] !== CFG[k].blue;

  function machine(k) {
    const key = k + ':' + st.blue[k];
    if (!cache.has(key)) cache.set(key, runMachine(PX[k], S[k], st.blue[k], P));
    return cache.get(key);
  }
  function stateOf(k) {
    const m = machine(k), t0 = NOW[k];
    let t = t0;
    while (t > 0 && m.days[t] == null) t--;
    const code = m.days[t] || 'normal';
    const s = S[k], b = s.pct200[t0], L = st.blue[k], dd = PX[k].dd[t0], dp = PX[k].dp[t0];
    const ddTxt = `drawdown ${sgn(dd)}%, più profondo ${delPct(dp)} delle sedute dal ${s.dates[0].slice(0, 4)}`;
    const setup = m.setups[m.setups.length - 1], lastEv = m.events[m.events.length - 1];
    const why = {
      setup: `${fmt(b)}% dei titoli sopra la media 200 (livello blu ${L}%)${setup ? ` · in zona blu dal ${dIT(s.dates[setup.t])}, minimo ${fmt(setup.bmin)}%` : ''} · ${ddTxt}`,
      fail: lastEv ? lastEv.text : '',
      trig: lastEv && lastEv.code === 'trig' ? `${dIT(s.dates[lastEv.t])}: ${lastEv.text}` : 'trigger recente',
      cool: lastEv && lastEv.code === 'trig' ? `trigger del ${dIT(s.dates[lastEv.t])}: nuovi segnali sospesi fino a ${P.cooldown} sedute dopo` : 'trigger recente',
      watch: [b <= L + P.watchBand ? `breadth ${fmt(b)}%, ${b > L ? `${fmt(b - L)} punti sopra il` : 'sotto il'} livello blu (${L}%)` : null, dp >= P.ddWatch ? ddTxt : null].filter(Boolean).join(' · '),
      normal: '',
    }[code];
    return { code, why };
  }
  // Avvicinamento: indice in stato normale con la breadth sotto la sua soglia (stessa regola dei settori)
  const apprCache = new Map();
  function approach(k) {
    const L = st.blue[k], key = k + ':' + L;
    if (!apprCache.has(key)) apprCache.set(key, approachLevel(S[k].pct200.slice(0, NOW[k] + 1), L));
    const A = apprCache.get(key), b = S[k].pct200[NOW[k]];
    return { A, on: A != null && b != null && stateOf(k).code === 'normal' && b <= A };
  }
  // perché questo stato e cosa manca al prossimo (stesse regole della macchina)
  function explain(k) {
    const m = machine(k);
    let t = NOW[k];
    while (t > 0 && m.days[t] == null) t--;
    const e = explainState(PX[k], S[k], st.blue[k], P, m, S[k].dates, t);
    if (approach(k).on) e.why = `Avvicinamento: breadth ${fmt(S[k].pct200[NOW[k]])}%, sotto la soglia di avvicinamento ${fmt(approach(k).A, 0)}% (livello blu ${st.blue[k]}% + il calo forte dell'indice in 10 sedute): in un calo deciso il livello blu è a circa due settimane.`;
    return e;
  }
  const name = (k) => CFG[k].name;
  const asOf = () => KEYS.map((k) => S[k].dates[NOW[k]]).sort().at(-1);

  // ---------- caricamento ----------
  function ensure() {
    if (D || failed) return Promise.resolve();
    if (!loading) {
      $('ixLoading').hidden = false;
      loading = ctx.load().then(ready).catch((e) => { failed = e; })
        .finally(() => { $('ixLoading').hidden = true; });
    }
    return loading;
  }
  async function render() {
    await ensure();
    if (failed) { $('ixLoading').hidden = false; $('ixLoading').textContent = `Dati degli indici non disponibili (${failed.message}).`; return; }
    $('ixBody').hidden = false;
    renderAreas();
    renderBoard();
    renderMap();
    renderDetail();
    if (st.pending && KEYS.includes(st.pending)) { const k = st.pending; st.pending = null; open(k, true); }
    loadMore();
  }

  // ---------- tabellone ----------
  function renderBoard() {
    const rows = VIS().map((k) => {
      const s = S[k], c = s.close, t = NOW[k], last = c.length - 1;
      return {
        k, state: stateOf(k), appr: approach(k).on, b: s.pct200[t], b1m: s.pct200[Math.max(0, t - 21)], n: s.n[t], above: s.above200[t], mem: s.members[t], L: st.blue[k],
        dd: PX[k].dd[last], dp: PX[k].dp[last], worst: Math.min(...PX[k].dd.slice(Math.max(0, last - 1259)).filter((v) => v != null)),
        last: c[last], d1: (c[last] / c[last - 1] - 1) * 100, m1: (c[last] / c[last - 21] - 1) * 100, date: s.dates[last], bdate: s.dates[t],
      };
    }).sort((a, b) => ORDER[a.appr ? 'appr' : a.state.code] - ORDER[b.appr ? 'appr' : b.state.code] || (a.b - a.L) - (b.b - b.L));
    const DDMAX = 35;
    const quality = (k, r) => CFG[k].composition === 'epoca'
      ? `<span class="muted" title="Storia con i membri di ogni data · copertura oggi ${r.n}/${r.mem}">d'epoca</span>`
      : CFG[k].limits
        ? `<span class="loc" title="${esc(`Storia dal ${S[k].dates[S[k].pct200.findIndex((v) => v != null)].slice(0, 4)} · ${CFG[k].note || ''}`)}">con limiti</span>`
        : `<span class="muted" title="Storia ricostruita con i membri di oggi: nelle fasi intermedie la breadth risulta 3-6 punti più alta, vicino ai minimi lo scarto è piccolo">membri di oggi</span>`;
    $('ixTable').innerHTML = `<thead><tr><th>Indice</th><th>Stato</th><th class="wrap-l">% titoli sopra media 200</th><th class="r">Blu</th><th class="wrap-l">Drawdown da max 52s</th><th>Storia</th><th class="r" title="Cali forti dei titoli (scheda «Cali forti» nel dettaglio): allerta oggi, sedute in allerta negli ultimi 3 mesi o percentile di oggi">Cali forti</th><th class="r">Ultimo</th><th class="r">1G</th><th class="r">1M</th></tr></thead><tbody>` +
      rows.map((r) => {
        const ddw = Math.min(100, (Math.abs(r.dd) / DDMAX) * 100), worst = Math.min(100, (Math.abs(r.worst) / DDMAX) * 100);
        const need = r.above - Math.floor((r.L * r.n) / 100);
        return `<tr data-ix="${r.k}" tabindex="0">
        <td><span class="sym">${r.k}</span><span class="nm">${esc(name(r.k))}</span></td>
        <td${r.appr ? ` title="${esc(`breadth ${fmt(r.b)}%, sotto la soglia di avvicinamento ${fmt(approach(r.k).A, 0)}% (livello blu ${r.L}% + il calo forte dell'indice in 10 sedute): in un calo deciso il livello blu è a circa due settimane`)}"` : ''}>${r.appr ? apprBadge() : badge(r.state.code)}</td>
        <td><span class="cellv num" title="${titoli(r.above)} su ${r.n}${need > 0 ? ` · ne devono scendere sotto la media ancora ${need} per il livello blu` : ''}">${fmt(r.b)}%<span class="cnt" title="${titoli(r.above)} sopra la media 200 su ${r.n}: un titolo vale ${fmt(100 / r.n)} punti">${r.above}/${r.n}</span></span><span class="bullet${r.b <= r.L ? ' below' : ''}"><span class="zone" style="width:${r.L}%"></span><i style="width:${Math.max(1, r.b)}%"></i><span class="ago" style="left:calc(${r.b1m}% - 1px)" title="un mese fa ${fmt(r.b1m)}%"></span><span class="tick" style="left:calc(${r.L}% - 1px)"></span></span></td>
        <td class="num r">${r.L}%${changed(r.k) ? '<span class="loc" title="modificato in questo browser">*</span>' : ''}</td>
        <td><span class="cellv num">${sgn(r.dd)}%</span><span class="bar" title="più profondo ${delPct(r.dp)} delle sedute; peggiore a 5 anni ${sgn(r.worst)}%"><i class="${r.dp >= 80 ? 'deep' : ''}" style="width:${ddw}%"></i><span class="mark" style="left:calc(${worst}% - 1px)"></span></span></td>
        <td>${quality(r.k, r)}</td>${cap ? cap.cell(r.k, CFG[r.k].noCap) : '<td></td>'}
        <td class="num r" title="chiusura del ${dIT(r.date)}${r.bdate < r.date ? ` · breadth al ${dIT(r.bdate)}` : ''}">${fmt(r.last, r.last >= 1000 ? 0 : 2)}</td><td class="num r">${pct(r.d1)}</td><td class="num r">${pct(r.m1)}</td></tr>`;
      }).join('') + '</tbody>';
    $('ixTable').querySelectorAll('tbody tr[data-ix]').forEach((tr) => {
      tr.onclick = () => open(tr.dataset.ix, true);
      tr.onkeydown = (e) => { if (e.key === 'Enter') open(tr.dataset.ix, true); };
    });
    // le borse chiudono in giorni diversi: ogni riga è all'ultima seduta del suo indice
    const dates = [...new Set(rows.map((r) => r.bdate))].sort();
    $('ixMeta').textContent = `ordinati per stato · ` + (dates.length > 1 ? `ultima seduta di ogni borsa, dal ${dIT(dates[0])} al ${dIT(dates.at(-1))}` : `dati al ${dIT(dates[0])}`);
    const by = (codes) => rows.filter((r) => codes.includes(r.state.code));
    const list = (a) => a.map((r) => r.k).join(' · ') || 'nessuno';
    $('ixKpis').innerHTML = [
      ['Indici in zona blu', `${by(['setup', 'fail']).length}<small> / ${rows.length}</small>`, list(by(['setup', 'fail']))],
      [`Trigger nelle ultime ${P.cooldown} sedute`, `${by(['trig', 'cool']).length}<small> / ${rows.length}</small>`, list(by(['trig', 'cool']))],
      ['Indici in attenzione', `${by(['watch']).length}<small> / ${rows.length}</small>`, list(by(['watch'])) + (rows.some((r) => r.appr) ? ` · in avvicinamento: ${rows.filter((r) => r.appr).map((r) => r.k).join(' · ')}` : '')],
      ...(cap && cap.ready() ? [(() => { const on = rows.filter((r) => (cap.status(r.k) || {}).on), rec = rows.filter((r) => !(cap.status(r.k) || {}).on && (cap.status(r.k) || {}).recent);
        return ['Cali forti in allerta', `${on.length}<small> / ${rows.filter((r) => !CFG[r.k].noCap).length}</small>`, list(on) + (rec.length ? ` · negli ultimi 3 mesi: ${list(rec)}` : '')]; })()] : []),
      ['Più vicino al livello blu', rows.length ? `${[...rows].sort((a, b) => (a.b - a.L) - (b.b - b.L))[0].k}` : '—', rows.length ? (() => { const r = [...rows].sort((a, b) => (a.b - a.L) - (b.b - b.L))[0]; return `${fmt(r.b)}% contro un livello di ${r.L}% (${sgn(r.b - r.L)} punti)`; })() : ''],
    ].map(([k, v, s]) => `<div class="kpi"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');
  }

  // ---------- indici mostrati ----------
  function renderAreas() {
    const same = (a) => a.length === st.shown.size && a.every((k) => st.shown.has(k));
    keepFocus($('ixPick'), 'data-ix', AREAS.map((a) => `<div class="ixarea"><span class="lbl">${esc(a)}</span>` +
      KEYS.filter((k) => CFG[k].area === a).map((k) => `<button type="button" class="chip" data-ix="${k}" aria-pressed="${st.shown.has(k)}" title="${esc(name(k))}${CFG[k].limits ? ' · con limiti' : ''}">${k}</button>`).join('') + '</div>').join(''));
    $('ixPickMeta').textContent = `${st.shown.size} su ${KEYS.length} mostrati` + (same(MAIN()) ? ' · i principali' : '');
    $('ixPickMain').setAttribute('aria-pressed', String(same(MAIN())));
    $('ixPickAll').setAttribute('aria-pressed', String(same(KEYS)));
    $('ixPick').querySelectorAll('button').forEach((b) => b.onclick = () => {
      const k = b.dataset.ix;
      if (st.shown.has(k)) { if (st.shown.size > 1) st.shown.delete(k); } else st.shown.add(k);
      setShown(st.shown);
    });
  }
  function setShown(set) {
    st.shown = new Set(set); st.focus = null;
    store.set('ixShown', ALL.filter((k) => st.shown.has(k)));
    if (!st.shown.has(st.sel)) { st.sel = VIS()[0]; store.set('ixSel', st.sel); }
    renderAreas(); renderBoard(); renderMap(); renderDetail();
  }

  // ---------- Bottom Map ----------
  // Data della mappa: oggi oppure un venerdì passato. Gli indici hanno calendari diversi: a quel venerdì ognuno usa
  // l'ultima sua seduta fino a lì; stato, avvicinamento e distanze sono quelli di allora (come la mappa dei settori)
  let mapDraw = null, mapSeries = null, mapT = {};
  const JUMPS = [['2008-11-20', 'nov 2008'], ['2011-10-03', 'ott 2011'], ['2016-02-11', 'feb 2016'], ['2018-12-24', 'dic 2018'], ['2020-03-23', 'mar 2020'], ['2022-10-12', 'ott 2022'], ['2025-04-08', 'apr 2025']];
  let FRIDAYS = [], gridKey = '';
  function fridays() {
    const key = KEYS.join(',');
    if (key === gridKey) return FRIDAYS;
    const first = KEYS.map((k) => S[k].dates[Math.max(S[k].pct200.findIndex((v) => v != null), PX[k].dp.findIndex((v) => v != null))]).filter(Boolean).sort()[0];
    const out = [], d = new Date(first + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7));
    for (const end = asOf(); d.toISOString().slice(0, 10) < end; d.setUTCDate(d.getUTCDate() + 7)) out.push(d.toISOString().slice(0, 10));
    FRIDAYS = out; gridKey = key;
    return out;
  }
  const mapDate = () => (st.mapWeek == null ? null : fridays()[st.mapWeek]);
  // seduta dell'indice k alla data della mappa (null se a quella data l'indice non ha ancora dati)
  function seduta(k, D) {
    if (D == null) return NOW[k];
    let i = NOW[k];
    while (i >= 0 && S[k].dates[i] > D) i--;
    return i >= 0 && S[k].pct200[i] != null && PX[k].dp[i] != null ? i : null;
  }
  function stateAt(k, T) {
    if (T === NOW[k]) return stateOf(k).code;
    const m = machine(k);
    let t = T;
    while (t > 0 && m.days[t] == null) t--;
    return m.days[t] || 'normal';
  }
  function approachAt(k, T) {
    if (T === NOW[k]) return approach(k);
    const b = S[k].pct200[T], A = approachLevel(S[k].pct200.slice(0, T + 1), st.blue[k]);
    return { A, on: A != null && b != null && stateAt(k, T) === 'normal' && b <= A };
  }
  const weekOf = (d) => { const F = fridays(); let i = F.length - 1; while (i > 0 && F[i] > d) i--; return i; };
  function setMapWeek(i) {
    const F = fridays();
    st.mapWeek = i == null || i >= F.length - 1 ? null : Math.max(0, i);
    st.focus = null;
    renderMap();
  }
  let replay = null;
  function stopReplay() { if (replay) { clearInterval(replay); replay = null; $('ixPlay').textContent = '▶ PLAY'; } }
  function playReplay() {
    if (replay) { stopReplay(); return; }
    if (st.mapWeek == null) st.mapWeek = Math.max(0, fridays().length - 53);
    $('ixPlay').textContent = '❚❚ STOP';
    renderMap();
    replay = setInterval(() => {
      if (st.mapWeek == null || $('v-idx').hidden) { stopReplay(); return; }
      setMapWeek(st.mapWeek + 1);
      if (st.mapWeek == null) stopReplay();
    }, 220);
  }
  function mapControls() {
    const F = fridays(), D = mapDate(), today = D == null, r = $('ixDate');
    r.min = 0; r.max = F.length - 1; r.value = today ? F.length - 1 : st.mapWeek;
    $('ixDateVal').textContent = today ? `oggi · ${dIT(asOf())}` : `settimana al ${dIT(D)}`;
    $('ixToday').hidden = today;
    keepFocus($('ixJumps'), 'data-d', JUMPS.map(([d, l]) => `<button type="button" class="chip" data-d="${d}" aria-pressed="${!today && Math.abs(Date.parse(D) - Date.parse(d)) < 6 * 864e5}">${l}</button>`).join(''));
    $('ixJumps').querySelectorAll('button').forEach((b) => { b.onclick = () => { stopReplay(); setMapWeek(weekOf(b.dataset.d)); }; });
  }
  function renderMap() {
    const D = mapDate();
    mapControls();
    mapSeries = {}; mapT = {};
    for (const k of VIS()) {
      const T = seduta(k, D);
      if (T == null) continue;
      mapT[k] = T;
      const weeks = weeklyIndices(S[k].dates.slice(0, T + 1)).slice(-9);
      if (weeks.at(-1) !== T) weeks.push(T);
      mapSeries[k] = weeks.slice(-9).filter((t) => S[k].pct200[t] != null && PX[k].dp[t] != null).map((t) => ({ x: PX[k].dp[t], y: S[k].pct200[t] - st.blue[k], t }));
    }
    drawMap();
    const hidden = VIS().filter((k) => mapT[k] == null);
    $('ixMapMeta').textContent = D == null ? 'settimanale · coda 8 settimane · colore del punto = stato attuale'
      : `settimanale · coda 8 settimane · al ${dIT(D)} (storico) · colore del punto = stato di quel giorno · livelli blu di oggi` + (hidden.length ? ` · senza dati a quella data: ${hidden.join(', ')}` : '');
    // titoli che devono ancora scendere sotto la media perché la breadth arrivi al livello blu
    const rows = Object.keys(mapT).map((k) => { const t = mapT[k], s = S[k]; return { k, d: s.pct200[t] - st.blue[k], need: s.above200[t] - Math.floor((st.blue[k] * s.n[t]) / 100) }; }).sort((a, b) => a.d - b.d);
    const lo = Math.min(-10, Math.floor(Math.min(...rows.map((r) => r.d)) / 5) * 5), hi = Math.max(40, Math.ceil(Math.max(...rows.map((r) => r.d)) / 10) * 10);
    const pos = (v) => ((v - lo) / (hi - lo)) * 100;
    $('ixDist').innerHTML = rows.map(({ k, d, need }) => {
      const a = pos(Math.min(0, d)), b = pos(Math.max(0, d));
      return `<div class="r${st.focus === k ? ' sel' : ''}" data-ix="${k}" tabindex="0"><span class="sym">${k}</span>
        <span class="track"><i class="${d <= 0 ? 'neg' : ''}" style="left:${a}%;width:${Math.max(0.6, b - a)}%"></i><span class="axis0" style="left:calc(${pos(0)}% - 1px)"></span></span>
        <span class="v">${sgn(d)} pt</span><span class="v muted">${need <= 0 ? 'sotto' : need + (need === 1 ? ' titolo' : ' titoli')}</span></div>`;
    }).join('');
    $('ixDist').querySelectorAll('.r').forEach((r) => {
      r.onmouseenter = r.onfocus = () => { st.focus = r.dataset.ix; drawMap(); markDist(); };
      r.onmouseleave = r.onblur = () => { st.focus = null; drawMap(); markDist(); };
      r.onclick = () => open(r.dataset.ix, true);
      r.onkeydown = (e) => { if (e.key === 'Enter') open(r.dataset.ix, true); };
    });
  }
  const markDist = () => $('ixDist').querySelectorAll('.r').forEach((r) => r.classList.toggle('sel', r.dataset.ix === st.focus));
  function drawMap() {
    const syms = Object.keys(mapT), past = mapDate() != null;
    mapDraw = drawBottomMap($('ixMap'), {
      series: mapSeries, syms, focus: st.focus, params: P, states: Object.fromEntries(syms.map((k) => [k, stateAt(k, mapT[k])])), rings: syms.filter((k) => approachAt(k, mapT[k]).on),
      size: chartWidth($('ixMap'), SIZE), clipId: 'ixclip', unit: "dell'indice",
      // per le date passate l'asse verticale è fisso, così nel replay non salta
      ...(past ? { top: 96 - Math.min(...syms.map((k) => st.blue[k])) } : {}),
    });
  }

  // ---------- dettaglio ----------
  function open(k, scroll) {
    if (!KEYS.includes(k)) return;
    st.sel = k; store.set('ixSel', k);
    renderDetail();
    if (scroll) $('ixDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function rangeStart(k) {
    const first = Math.max(S[k].pct200.findIndex((v) => v != null), PX[k].dp.findIndex((v) => v != null));
    const back = { '3A': 756, '10A': 2520, MAX: S[k].dates.length }[st.range];
    return Math.max(first, S[k].dates.length - 1 - back);
  }
  function renderDetail() {
    const k = st.sel, s = S[k], m = machine(k), L = st.blue[k], t = NOW[k], last = s.close.length - 1;
    keepFocus($('ixChips'), 'data-ix', [...new Set([...VIS(), k])].map((x) => `<button type="button" class="chip" data-ix="${x}" aria-pressed="${x === k}"><span class="sd sd-${stateOf(x).code}"></span>${x}</button>`).join(''));
    $('ixChips').querySelectorAll('button').forEach((b) => b.onclick = () => open(b.dataset.ix));
    document.querySelectorAll('#ixRange button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.range === st.range)));
    $('ixTitle').textContent = `${k} · ${name(k)}`;
    $('ixBadge').innerHTML = approach(k).on ? apprBadge() : badge(stateOf(k).code);
    $('ixCheck').innerHTML = checklistHTML(explain(k)) + (cap ? cap.info(k) : '');
    drawSector($('ixTs'), {
      dates: s.dates, close: s.close, dd: PX[k].dd, b200: s.pct200, b50: s.pct50, days: m.days,
      triggers: m.events.filter((e) => e.code === 'trig').map((e) => e.t), i0: rangeStart(k), sym: k, blue: L,
      tipEl: $('ixTsTip'), wrapEl: $('ixTsWrap'), width: chartWidth($('ixTs'), 940, 380), ddNote: 'SOLO PREZZO',
      off: m.off, offText: offReasons(P),
    });
    // livello blu
    $('ixBlueVal').textContent = L + '%';
    $('ixBlueMinus').disabled = L <= 0; $('ixBluePlus').disabled = L >= 60;
    const f0 = s.pct200.findIndex((v) => v != null);
    const hist = s.pct200.slice(f0, t + 1).filter((v) => v != null);
    const n = s.n[t];
    const under = fmt((100 * hist.filter((v) => v <= L).length) / hist.length);
    $('ixBlueInfo').textContent = `${ilPct(under)} ${under}% delle sedute dal ${s.dates[f0].slice(0, 4)} è stato sotto questo livello. Con ${n} titoli, uno vale ${fmt(100 / n)} punti.`;
    $('ixBlueSrc').innerHTML = changed(k)
      ? `<span class="loc">modificato in questo browser · livello di default ${CFG[k].blue}%</span>`
      : CFG[k].blueSource === 'Rea'
        ? 'Livello di default dai grafici di Massimo Rea (quant-rea). Le regole di zona blu, trigger e cooldown sono quelle dei settori.'
        : 'Livello di default calcolato: 3° percentile della storia dell\'indice, la regola che ritrova i livelli di Rea sugli indici che li hanno. Regole di zona blu, trigger e cooldown come per i settori.';
    $('ixBlueReset').hidden = !changed(k);
    // situazione
    const b = s.pct200[t];
    const facts = [
      ['Ultimo', `${fmt(s.close[last], 2)} · ${dIT(s.dates[last])}`],
      ['Titoli sopra media 200', `${s.above200[t]}/${n} · ${fmt(b)}%`],
      ['Sopra media 50', `${fmt(s.pct50[t])}%`],
      ['Distanza dal livello blu', `${sgn(b - L)} pt`],
      ...(approach(k).A == null ? [] : [['Soglia di avvicinamento', `${fmt(approach(k).A, 0)}% · ${b <= approach(k).A ? 'sotto' : `${sgn(b - approach(k).A)} pt`}`, 'Livello blu più il calo forte della breadth in 10 sedute (90° percentile della storia): sotto questa soglia, in un calo deciso, il livello blu è a circa due settimane. Non è uno stato e non manda alert. Nel campione dal 2001 sui 22 indici (regola scelta su questa stessa storia): anticipo mediano 20 sedute, 96 tocchi del livello su 134 avvisati; il 47% degli avvicinamenti arriva al livello.']]),
      ['Drawdown da max 52s', `${sgn(PX[k].dd[last])}%`, 'Dalla chiusura più alta delle ultime 252 sedute. Gli indici sono di solo prezzo: è il valore che si vede su TradingView (che però usa il massimo intraday).'],
      ['Profondità storica DD', `${PX[k].dp[last]}° percentile`],
      ['Copertura', `${n} su ${s.members[t]} membri con prezzi`, 'Titoli dell\'indice con i prezzi su Yahoo Finance: quelli tolti dal listino mancano, e nella storia la copertura è più bassa.'],
    ];
    if (s.dates[t] < s.dates[last]) facts.push(['Breadth al', dIT(s.dates[t])]);
    $('ixFacts').innerHTML = facts.map(([a, v, tt]) => { const ti = tt ? ` title="${esc(tt)}"` : ''; return `<dt${ti}>${a}</dt><dd${ti}>${v}</dd>`; }).join('');
    $('ixQuality').textContent = CFG[k].composition === 'epoca'
      ? `Storia con la composizione dell'indice di ogni data, dal ${s.dates[f0].slice(0, 4)}. Fonte della composizione: ${CFG[k].source}.`
      : `${CFG[k].limits ? 'Indice con limiti. ' : ''}Storia ricostruita con i membri di oggi, dal ${s.dates[f0].slice(0, 4)}: nelle fasi intermedie la breadth risulta più alta del vero, vicino ai minimi lo scarto è piccolo.${CFG[k].note ? ' ' + CFG[k].note : ''} Fonte della lista: ${CFG[k].source}.`;
    $('ixLinks').innerHTML = (TV[k] || []).map((x) => `<a href="${tvLink(x)}" target="_blank" rel="noopener">${esc(x.split(':')[1])} su TradingView ↗</a>`).join('');
    renderEpisodes(k, m);
    if (cap) cap.card('ix', k, { dates: s.dates, close: s.close, from: s.dates[rangeStart(k)], noCap: CFG[k].noCap, what: "l'indice" });
  }
  function renderEpisodes(k, m) {
    const c = S[k].close, dates = S[k].dates;
    const eps = m.setups.map((u) => ({
      start: u.t, bmin: u.bmin, dd: u.dd, trig: u.trig ? u.trig.t : null, conf: u.trig ? u.trig.conf.join(' + ') : '', fails: u.fails,
      z63: forward(c, u.t, 63), t63: forward(c, u.trig && u.trig.t, 63), t126: forward(c, u.trig && u.trig.t, 126), t252: forward(c, u.trig && u.trig.t, 252), mae: worstWithin(c, u.trig && u.trig.t, 63),
    })).reverse();
    const first = S[k].pct200.findIndex((v) => v != null);
    const nTrig = m.events.filter((e) => e.code === 'trig').length, nFail = m.events.filter((e) => e.code === 'fail').length;
    $('ixEpiMeta').textContent = `${eps.length} ${eps.length === 1 ? 'zona blu' : 'zone blu'} dal ${dIT(dates[first])} con livello ${st.blue[k]}% · ${nTrig} trigger${nFail ? `, ${nFail} ${nFail === 1 ? 'fallito' : 'falliti'}` : ''} · rendimenti a confronto sotto la tabella`;
    const at = { trig: m.events.filter((e) => e.code === 'trig').map((e) => e.t), setup: m.setups.map((u) => u.t) };
    $('ixEpiCtx').innerHTML = contextHTML(signalContext(c, at, first, [63, 126, 252]), { h: ['+3M', '+6M', '+12M'], key: 0, since: dates[first].slice(0, 4), what: "l'indice" });
    if (!eps.length) { $('ixEpiTable').innerHTML = '<tbody><tr><td class="muted">Nessuna zona blu nel periodo con questo livello.</td></tr></tbody>'; return; }
    const cell = (v) => (v == null ? '<span class="muted">—</span>' : pct(v));
    $('ixEpiTable').innerHTML = `<thead><tr><th>Zona blu dal</th><th class="r">Breadth min</th><th class="r">DD ingresso</th><th class="r">+3M da zona blu</th><th>Trigger</th><th>Conferma</th><th class="r">+3M</th><th class="r">+6M</th><th class="r">+12M</th><th class="r">Peggior calo 3M</th></tr></thead><tbody>` +
      eps.map((e) => `<tr><td class="num">${dIT(dates[e.start])}</td><td class="num r">${fmt(e.bmin)}%</td><td class="num r">${sgn(e.dd)}%</td><td class="num r">${cell(e.z63)}</td>
        <td class="num">${e.trig != null ? dIT(dates[e.trig]) : '<span class="muted">in attesa</span>'}${e.fails ? ` <span class="down">· ${e.fails} ${e.fails === 1 ? 'fallito' : 'falliti'}</span>` : ''}</td><td class="wrapc">${esc(e.conf) || '<span class="muted">—</span>'}</td>
        <td class="num r">${cell(e.t63)}</td><td class="num r">${cell(e.t126)}</td><td class="num r">${cell(e.t252)}</td><td class="num r">${cell(e.mae)}</td></tr>`).join('') + '</tbody>';
  }
  function setBlue(v) {
    const k = st.sel;
    st.blue[k] = Math.max(0, Math.min(60, v));
    store.set('ixBlue', Object.fromEntries(Object.entries(st.blue).filter(([x, y]) => y !== CFG[x].blue)));
    renderBoard(); renderMap(); renderDetail();
  }

  // arrivo dei dati dei cali forti o scelte cambiate nella scheda
  if (cap) cap.onChange(() => { if (D && !$('v-idx').hidden) { renderBoard(); renderDetail(); } });

  function bind() {
    $('ixBlueMinus').onclick = () => setBlue(st.blue[st.sel] - 1);
    $('ixBluePlus').onclick = () => setBlue(st.blue[st.sel] + 1);
    $('ixBlueReset').onclick = () => setBlue(CFG[st.sel].blue);
    document.querySelectorAll('#ixRange button').forEach((b) => b.onclick = () => { st.range = b.dataset.range; store.set('ixRange', st.range); renderDetail(); });
    $('ixPickMain').onclick = () => setShown(MAIN());
    $('ixPickAll').onclick = () => setShown(KEYS);
    const svg = $('ixMap'), tip = $('ixMapTip');
    svg.addEventListener('pointermove', (e) => {
      if (!mapDraw || e.pointerType === 'touch') return;
      const h = nearestHead(svg, mapDraw.heads, e);
      const k = h ? h.sym : null;
      if (k !== st.focus) { st.focus = k; drawMap(); markDist(); }
      if (!h) { tip.hidden = true; return; }
      const q = mapSeries[k][mapSeries[k].length - 1], T = mapT[k], ap = approachAt(k, T);
      tip.innerHTML = `<div class="row"><b>${k}</b><span>${esc(name(k))}</span></div>${T !== NOW[k] ? `<div class="row"><span>Seduta</span><b>${dIT(S[k].dates[T])}</b></div>` : ''}
        <div class="row"><span>Sopra media 200</span><b>${fmt(S[k].pct200[q.t])}%</b></div><div class="row"><span>Livello blu</span><b>${st.blue[k]}%</b></div>
        <div class="row"><span>Drawdown 52s</span><b>${sgn(PX[k].dd[q.t])}%</b></div><div class="row"><span>Profondità storica</span><b>${q.x}° pct</b></div>
        <div class="row"><span>Stato</span><b>${ap.on ? 'Avvicinamento' : esc(STATES[stateAt(k, T)])}</b></div>
        <div class="row"><span>Soglia di avvicinamento</span><b>${ap.A == null ? '—' : fmt(ap.A, 0) + '%'}</b></div>
        <div class="row"><span>Area del grafico</span><b>${{ setup: 'zona blu', watch: 'attenzione', normal: 'normale' }[zoneOf(q.x, q.y, P)]}</b></div>`;
      placeTip(tip, $('ixMapWrap'), e);
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; if (st.focus) { st.focus = null; drawMap(); markDist(); } });
    svg.addEventListener('click', (e) => { const h = mapDraw ? nearestHead(svg, mapDraw.heads, e) : null; if (h) open(h.sym, true); });
    $('ixDate').oninput = (e) => { stopReplay(); setMapWeek(+e.target.value); };
    $('ixDate').onkeydown = (e) => e.stopPropagation();
    $('ixPlay').onclick = playReplay;
    $('ixToday').onclick = () => { stopReplay(); setMapWeek(null); };
  }

  return {
    bind, render,
    // dalla barra comandi, prima di mostrare la pagina: la scelta la apre il render() successivo
    open: (k) => { if (ALL.includes(k)) { st.pending = k; store.set('ixSel', k); } },
    isIndex: (k) => ALL.includes(k), asOf: () => (D ? asOf() : null),
  };
}
