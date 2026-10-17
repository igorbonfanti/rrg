/*
 * indices.js — pagina Indici: la stessa analisi dei settori (breadth a 200 sedute contro un livello
 * blu, drawdown, macchina a stati) sui principali indici azionari. Riusa signals.js, sector-chart.js e
 * bottom-map.js senza cambiarne la logica. Dati: data/indices.json (formato in indexdata.js) e
 * config/indices.json (livelli e qualità della storia), caricati alla prima apertura della pagina.
 */
import { priceSeries, runMachine, forward, worstWithin, offReasons, approachLevel, DEFAULT_PARAMS, STATES } from './signals.js';
import { indexSeries } from './indexdata.js';
import { weeklyIndices } from './engine.js';
import { drawSector } from './sector-chart.js';
import { drawBottomMap, zoneOf } from './bottom-map.js';
import { nearestHead, SIZE } from './rrg-chart.js';
import { badge, apprBadge } from './bottom.js';
import { esc, fmt, sgn, pct, dIT, placeTip, chartWidth, keepFocus, ilPct } from './format.js';

const ORDER = { setup: 0, fail: 1, trig: 2, cool: 3, watch: 4, appr: 4.5, normal: 5 };
// grafici su TradingView: indice e, dove esiste, la serie pronta della % di titoli sopra la media 200
const TV = {
  SPX: ['SP:SPX', 'INDEX:S5TH'], NDX: ['NASDAQ:NDX', 'INDEX:NDTH'], DJI: ['DJ:DJI', 'INDEX:DITH'], N225: ['TVC:NI225'],
  SXXP: ['TVC:SXXP'], UKX: ['TVC:UKX'], DAX: ['XETR:DAX'], CAC: ['EURONEXT:PX1'], SMI: ['SIX:SMI'],
};
const tvLink = (sym) => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
const titoli = (k) => `${k} ${k === 1 ? 'titolo' : 'titoli'}`;
const median = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
const positive = (a) => { const v = a.filter((x) => x != null); return v.length ? (100 * v.filter((x) => x > 0).length) / v.length : null; };
const delPct = (v) => { const r = Math.round(v); return `${r === 1 || r === 8 || r === 11 || (r >= 80 && r <= 89) ? "dell'" : 'del '}${r}%`; };

/**
 * @param {{$: (id: string) => HTMLElement, store: {get: Function, set: Function}, params: object, config: object,
 *          load: () => Promise<object>}} ctx  config: config/indices.json; load: restituisce data/indices.json
 */
export function createIndices(ctx) {
  const { $, store } = ctx;
  const P = { ...DEFAULT_PARAMS, ...ctx.params };
  const CFG = ctx.config.indices;
  let D = null, KEYS = Object.keys(CFG), loading = null, failed = null;
  const S = {}, PX = {}, NOW = {}, cache = new Map();
  const st = { blue: {}, sel: null, range: null, focus: null, pending: null, shown: new Set() };
  // indici mostrati in tabellone, Bottom Map e schede: di partenza i principali ("main" in config), poi
  // quelli scelti nel selettore (salvati nel browser). Il selettore li raggruppa per area.
  const ORDER_AREAS = ['Nord America', 'Europa', 'Asia-Pacifico', 'Emergenti'];
  const AREAS = [...new Set(Object.values(CFG).map((c) => c.area))].sort((a, b) => (ORDER_AREAS.indexOf(a) + 1 || 99) - (ORDER_AREAS.indexOf(b) + 1 || 99));
  const MAIN = () => KEYS.filter((k) => CFG[k].main);
  const VIS = () => KEYS.filter((k) => st.shown.has(k));

  function ready(data) {
    KEYS = KEYS.filter((k) => data.series[k]);
    for (const k of KEYS) {
      S[k] = indexSeries(data.series[k]);
      PX[k] = priceSeries(S[k].close);
      let t = S[k].dates.length - 1;
      while (t > 0 && S[k].pct200[t] == null) t--;
      NOW[k] = t;
    }
    st.blue = { ...defaults(), ...validBlue(store.get('ixBlue', {})) };
    st.sel = KEYS.includes(store.get('ixSel')) ? store.get('ixSel') : KEYS[0];
    st.range = ['3A', '10A', 'MAX'].includes(store.get('ixRange')) ? store.get('ixRange') : '3A';
    const saved = store.get('ixShown', null);
    const keep = Array.isArray(saved) ? saved.filter((k) => KEYS.includes(k)) : [];
    st.shown = new Set(keep.length ? keep : MAIN());
    D = data;
  }
  const defaults = () => Object.fromEntries(KEYS.map((k) => [k, CFG[k].blue]));
  function validBlue(v) {
    return Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {})
      .filter(([k, x]) => KEYS.includes(k) && Number.isInteger(x) && x >= 0 && x <= 60));
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
    if (st.pending) { const k = st.pending; st.pending = null; open(k, true); }
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
    $('ixTable').innerHTML = `<thead><tr><th>Indice</th><th>Stato</th><th class="wrap-l">% titoli sopra media 200</th><th class="r">Blu</th><th class="wrap-l">Drawdown da max 52s</th><th>Storia</th><th class="r">Ultimo</th><th class="r">1G</th><th class="r">1M</th></tr></thead><tbody>` +
      rows.map((r) => {
        const ddw = Math.min(100, (Math.abs(r.dd) / DDMAX) * 100), worst = Math.min(100, (Math.abs(r.worst) / DDMAX) * 100);
        const need = r.above - Math.floor((r.L * r.n) / 100);
        return `<tr data-ix="${r.k}" tabindex="0">
        <td><span class="sym">${r.k}</span><span class="nm">${esc(name(r.k))}</span></td>
        <td${r.appr ? ` title="${esc(`breadth ${fmt(r.b)}%, sotto la soglia di avvicinamento ${fmt(approach(r.k).A, 0)}% (livello blu ${r.L}% + il calo forte dell'indice in 10 sedute): in un calo deciso il livello blu è a circa due settimane`)}"` : ''}>${r.appr ? apprBadge() : badge(r.state.code)}</td>
        <td><span class="cellv num" title="${titoli(r.above)} su ${r.n}${need > 0 ? ` · ne devono scendere sotto la media ancora ${need} per il livello blu` : ''}">${fmt(r.b)}%</span><span class="bullet${r.b <= r.L ? ' below' : ''}"><span class="zone" style="width:${r.L}%"></span><i style="width:${Math.max(1, r.b)}%"></i><span class="ago" style="left:calc(${r.b1m}% - 1px)" title="un mese fa ${fmt(r.b1m)}%"></span><span class="tick" style="left:calc(${r.L}% - 1px)"></span></span></td>
        <td class="num r">${r.L}%${changed(r.k) ? '<span class="loc" title="modificato in questo browser">*</span>' : ''}</td>
        <td><span class="cellv num">${sgn(r.dd)}%</span><span class="bar" title="più profondo ${delPct(r.dp)} delle sedute; peggiore a 5 anni ${sgn(r.worst)}%"><i class="${r.dp >= 80 ? 'deep' : ''}" style="width:${ddw}%"></i><span class="mark" style="left:calc(${worst}% - 1px)"></span></span></td>
        <td>${quality(r.k, r)}</td>
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
    store.set('ixShown', KEYS.filter((k) => st.shown.has(k)));
    if (!st.shown.has(st.sel)) { st.sel = VIS()[0]; store.set('ixSel', st.sel); }
    renderAreas(); renderBoard(); renderMap(); renderDetail();
  }

  // ---------- Bottom Map ----------
  let mapDraw = null, mapSeries = null;
  function renderMap() {
    mapSeries = {};
    for (const k of VIS()) {
      const weeks = weeklyIndices(S[k].dates.slice(0, NOW[k] + 1)).slice(-9);
      mapSeries[k] = weeks.filter((t) => S[k].pct200[t] != null && PX[k].dp[t] != null).map((t) => ({ x: PX[k].dp[t], y: S[k].pct200[t] - st.blue[k], t }));
    }
    drawMap();
    $('ixMapMeta').textContent = 'settimanale · coda 8 settimane · colore del punto = stato attuale';
    // titoli che devono ancora scendere sotto la media perché la breadth arrivi al livello blu
    const rows = VIS().map((k) => { const t = NOW[k], s = S[k]; return { k, d: s.pct200[t] - st.blue[k], need: s.above200[t] - Math.floor((st.blue[k] * s.n[t]) / 100) }; }).sort((a, b) => a.d - b.d);
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
    mapDraw = drawBottomMap($('ixMap'), {
      series: mapSeries, syms: VIS(), focus: st.focus, params: P, states: Object.fromEntries(VIS().map((k) => [k, stateOf(k).code])), rings: VIS().filter((k) => approach(k).on),
      size: chartWidth($('ixMap'), SIZE), clipId: 'ixclip', unit: "dell'indice",
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
    $('ixBadge').innerHTML = badge(stateOf(k).code);
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
  }
  function renderEpisodes(k, m) {
    const c = S[k].close, dates = S[k].dates;
    const eps = m.setups.map((u) => ({
      start: u.t, bmin: u.bmin, dd: u.dd, trig: u.trig ? u.trig.t : null, conf: u.trig ? u.trig.conf.join(' + ') : '', fails: u.fails,
      z63: forward(c, u.t, 63), t63: forward(c, u.trig && u.trig.t, 63), t126: forward(c, u.trig && u.trig.t, 126), t252: forward(c, u.trig && u.trig.t, 252), mae: worstWithin(c, u.trig && u.trig.t, 63),
    })).reverse();
    const tr = eps.filter((e) => e.t63 != null);
    const first = S[k].pct200.findIndex((v) => v != null);
    $('ixEpiMeta').textContent = `${eps.length} ${eps.length === 1 ? 'zona blu' : 'zone blu'} dal ${dIT(dates[first])} con livello ${st.blue[k]}%` +
      (tr.length ? ` · dopo il trigger +3M mediana ${sgn(median(tr.map((e) => e.t63)))}%` + (tr.length >= 5 ? `, positivi ${fmt(positive(tr.map((e) => e.t63)), 0)}% su ${tr.length} casi` : ` (${tr.length === 1 ? 'un solo caso' : `solo ${tr.length} casi`}: troppo pochi per una statistica)`) : '');
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
      const q = mapSeries[k][mapSeries[k].length - 1];
      tip.innerHTML = `<div class="row"><b>${k}</b><span>${esc(name(k))}</span></div>
        <div class="row"><span>Sopra media 200</span><b>${fmt(S[k].pct200[q.t])}%</b></div><div class="row"><span>Livello blu</span><b>${st.blue[k]}%</b></div>
        <div class="row"><span>Drawdown 52s</span><b>${sgn(PX[k].dd[q.t])}%</b></div><div class="row"><span>Profondità storica</span><b>${q.x}° pct</b></div>
        <div class="row"><span>Stato</span><b>${approach(k).on ? 'Avvicinamento' : esc(STATES[stateOf(k).code])}</b></div>
        <div class="row"><span>Soglia di avvicinamento</span><b>${approach(k).A == null ? '—' : fmt(approach(k).A, 0) + '%'}</b></div>
        <div class="row"><span>Area del grafico</span><b>${{ setup: 'zona blu', watch: 'attenzione', normal: 'normale' }[zoneOf(q.x, q.y, P)]}</b></div>`;
      placeTip(tip, $('ixMapWrap'), e);
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; if (st.focus) { st.focus = null; drawMap(); markDist(); } });
    svg.addEventListener('click', (e) => { const h = mapDraw ? nearestHead(svg, mapDraw.heads, e) : null; if (h) open(h.sym, true); });
  }

  return {
    bind, render,
    // dalla barra comandi, prima di mostrare la pagina: la scelta la apre il render() successivo
    open: (k) => { if (KEYS.includes(k)) { st.pending = k; store.set('ixSel', k); } },
    isIndex: (k) => KEYS.includes(k), asOf: () => (D ? asOf() : null),
  };
}
