/*
 * bottom.js — viste della ricerca dei bottom settoriali: Monitor dei settori, Bottom Map,
 * dettaglio del settore e registro degli alert. Dati: sectors.json (prezzi ETF lunghi),
 * breadth.json (titoli sopra le medie), breadth_latest.json (fotografia per titolo),
 * config/thresholds.json (livelli blu e parametri), alerts.json (invii Telegram).
 */
import { breadthSeries, priceSeries, runMachine, forward, worstWithin, DEFAULT_PARAMS, STATES, SECTOR_KEYS } from './signals.js';
import { weeklyIndices } from './engine.js';
import { drawSector } from './sector-chart.js';
import { drawBottomMap, zoneOf } from './bottom-map.js';
import { nearestHead } from './rrg-chart.js';
import { esc, fmt, sgn, pct, dIT, qPill, placeTip } from './format.js';

const NAMES = {
  XLK: 'Technology', XLC: 'Communication Services', XLY: 'Consumer Discretionary', XLP: 'Consumer Staples', XLE: 'Energy',
  XLF: 'Financials', XLV: 'Health Care', XLI: 'Industrials', XLB: 'Materials', XLRE: 'Real Estate', XLU: 'Utilities',
};
const TV = { XLK: 'SKTH', XLC: 'SLTH', XLY: 'SYTH', XLP: 'SPTH', XLE: 'SETH', XLF: 'SFTH', XLV: 'SVTH', XLI: 'SITH', XLB: 'SBTH', XLRE: 'SSTH', XLU: 'SUTH' };
const ORDER = { setup: 0, fail: 1, trig: 2, cool: 3, watch: 4, normal: 5 };
const ICON = {
  setup: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11 L1 4 H11 Z" fill="currentColor"/></svg>',
  trig: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1 L11 8 H1 Z" fill="currentColor"/></svg>',
  fail: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="2"/></svg>',
  cool: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 3.5 V6 H8" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  watch: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  normal: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5" width="8" height="2" fill="currentColor"/></svg>',
};
export const badge = (code, label = STATES[code]) => `<span class="st st-${code}">${ICON[code]}${esc(label)}</span>`;
const tvLink = (sym) => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
// "del 70%" ma "dell'80%", "dell'8%", "dell'11%", "dell'1%"
const delPct = (v) => { const r = Math.round(v); return `${r === 1 || r === 8 || r === 11 || (r >= 80 && r <= 89) ? "dell'" : 'del '}${r}%`; };
const titoli = (k) => `${k} ${k === 1 ? 'titolo' : 'titoli'}`;
const median = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
const positive = (a) => { const v = a.filter((x) => x != null); return v.length ? (100 * v.filter((x) => x > 0).length) / v.length : null; };

function sparkline(arr, w, h) {
  const v = arr.filter((x) => x != null);
  if (v.length < 2) return '';
  const y = (x) => (h - (x / 100) * h).toFixed(1);
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * w).toFixed(1)},${y(x)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><line x1="0" x2="${w}" y1="${y(20)}" y2="${y(20)}" stroke="var(--rule)"/><polyline points="${pts}" fill="none" stroke="var(--ink-2)" stroke-width="1.2"/><circle cx="${w}" cy="${y(v[v.length - 1])}" r="2.5" fill="var(--amber)"/></svg>`;
}

/**
 * @param {{$: (id: string) => HTMLElement, sectors: object, breadth: object, latest: object|null, config: object,
 *          alertLog: object|null, store: {get: Function, set: Function}, rotation: (s: string) => ({q: string, heading: number}|null),
 *          setView: (v: string) => void, openRRG: (s: string) => void}} ctx
 */
export function createBottom(ctx) {
  const { $, sectors: S, breadth: B, latest, config, alertLog, store } = ctx;
  const DATES = S.dates;
  const P = { ...DEFAULT_PARAMS, ...config.params };
  const PX = {}, BR = {};
  for (const s of Object.keys(S.adjclose)) PX[s] = priceSeries(S.adjclose[s]);
  for (const k of [...SECTOR_KEYS, 'SPX']) BR[k] = breadthSeries(B, k, DATES);
  // ultima seduta con prezzi e breadth
  let NOW = DATES.length - 1;
  while (NOW > 0 && BR.SPX.pct200[NOW] == null) NOW--;
  const st = {
    blue: { ...config.blue, ...validBlue(store.get('blue', {})) },
    sector: SECTOR_KEYS.includes(store.get('sector')) ? store.get('sector') : 'XLU',
    range: ['3A', '10A', 'MAX'].includes(store.get('range')) ? store.get('range') : '3A', mapFocus: null,
  };
  const cache = new Map();
  // livelli blu salvati nel browser: solo settori noti e interi da 0 a 60
  function validBlue(v) {
    return Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {})
      .filter(([k, x]) => SECTOR_KEYS.includes(k) && Number.isInteger(x) && x >= 0 && x <= 60));
  }

  function machine(s) {
    const key = s + ':' + st.blue[s];
    if (!cache.has(key)) cache.set(key, runMachine(PX[s], BR[s], st.blue[s], P));
    return cache.get(key);
  }
  function stateOf(s) {
    const m = machine(s);
    let t = NOW;
    while (t > 0 && m.days[t] == null) t--;
    const code = m.days[t] || 'normal';
    const b = BR[s].pct200[NOW], L = st.blue[s], dd = PX[s].dd[NOW], dp = PX[s].dp[NOW];
    const since = DATES[Math.max(0, PX[s].close.findIndex((v) => v != null))].slice(0, 4);
    const ddTxt = `drawdown ${sgn(dd)}%, più profondo ${delPct(dp)} delle sedute dal ${since}`;
    const setup = m.setups[m.setups.length - 1];
    const lastEv = m.events[m.events.length - 1];
    const why = {
      setup: `${fmt(b)}% dei titoli sopra la media 200 (livello blu ${L}%)${setup ? ` · in zona blu dal ${dIT(DATES[setup.t])}, minimo ${fmt(setup.bmin)}%` : ''} · ${ddTxt}`,
      fail: lastEv ? lastEv.text : '',
      trig: lastEv && lastEv.code === 'trig' ? `${dIT(DATES[lastEv.t])}: ${lastEv.text}` : 'trigger recente',
      cool: lastEv && lastEv.code === 'trig' ? `trigger del ${dIT(DATES[lastEv.t])}: nuovi segnali sospesi fino a ${P.cooldown} sedute dopo` : 'trigger recente',
      watch: [watchText(m, b, L, dp), dp >= P.ddWatch ? ddTxt : null].filter(Boolean).join(' · '),
      normal: '',
    }[code];
    return { code, why };
  }
  // Perché un settore è in Attenzione e cosa manca alla zona blu
  function watchText(m, b, L, dp) {
    if (b > L + P.watchBand) return null;
    if (b > L) return `breadth ${fmt(b)}%, ${fmt(b - L)} punti sopra il livello blu (${L}%)`;
    const head = `breadth ${fmt(b)}%, sotto il livello blu (${L}%) da ${m.below} ${m.below === 1 ? 'chiusura' : 'chiusure'}`;
    if (!m.armed) return `${head}: dopo l'ultimo trigger una nuova zona blu richiede prima che la breadth torni sopra ${fmt(m.reset, 0)}%`;
    const miss = [];
    const k = P.setupCloses - m.below;
    if (k > 0) miss.push(k === 1 ? "un'altra chiusura sotto il livello" : `altre ${k} chiusure sotto il livello`);
    if (dp < P.ddSetup) miss.push(`un drawdown oltre il ${P.ddSetup}° percentile (ora ${dp}°)`);
    return miss.length ? `${head}: per la zona blu ${miss.length > 1 ? 'servono' : 'serve'} ${miss.join(' e ')}` : head;
  }
  const changed = (s) => st.blue[s] !== config.blue[s];

  // ---------- 1 MONITOR ----------
  function renderMonitor() {
    const rows = SECTOR_KEYS.map((s) => {
      const c = S.adjclose[s];
      return {
        s, state: stateOf(s), rot: ctx.rotation(s), last: c[NOW], d1: (c[NOW] / c[NOW - 1] - 1) * 100, m1: (c[NOW] / c[NOW - 21] - 1) * 100,
        dd: PX[s].dd[NOW], dp: PX[s].dp[NOW], worst: Math.min(...PX[s].dd.slice(NOW - 1259, NOW + 1).filter((v) => v != null)),
        b: BR[s].pct200[NOW], b1m: BR[s].pct200[NOW - 21], n: BR[s].n[NOW], above: BR[s].above200[NOW], L: st.blue[s],
      };
    }).sort((a, b) => ORDER[a.state.code] - ORDER[b.state.code] || (a.b - a.L) - (b.b - b.L));
    const DDMAX = 35;
    const body = rows.map((r) => {
      const ddw = Math.min(100, (Math.abs(r.dd) / DDMAX) * 100), worst = Math.min(100, (Math.abs(r.worst) / DDMAX) * 100);
      return `<tr data-sym="${r.s}" tabindex="0">
        <td><span class="sym">${r.s}</span><span class="nm">${NAMES[r.s]}</span></td>
        <td>${badge(r.state.code)}</td>
        <td><span class="cellv num" title="${titoli(r.above)} su ${r.n}">${fmt(r.b)}%</span><span class="bullet${r.b <= r.L ? ' below' : ''}"><span class="zone" style="width:${r.L}%"></span><i style="width:${Math.max(1, r.b)}%"></i><span class="ago" style="left:calc(${r.b1m}% - 1px)" title="un mese fa ${fmt(r.b1m)}%"></span><span class="tick" style="left:calc(${r.L}% - 1px)"></span></span></td>
        <td class="num r">${r.L}%${changed(r.s) ? '<span class="loc" title="modificato in questo browser">*</span>' : ''}</td>
        <td><span class="cellv num">${sgn(r.dd)}%</span><span class="bar" title="più profondo ${delPct(r.dp)} delle sedute; peggiore a 5 anni ${sgn(r.worst)}%"><i class="${r.dp >= 80 ? 'deep' : ''}" style="width:${ddw}%"></i><span class="mark" style="left:calc(${worst}% - 1px)"></span></span></td>
        <td>${r.rot ? qPill(r.rot.q, r.rot.heading) : ''}</td>
        <td class="num r">${fmt(r.last, 2)}</td><td class="num r">${pct(r.d1)}</td><td class="num r">${pct(r.m1)}</td></tr>`;
    }).join('');
    const spy = S.adjclose.SPY, spx = BR.SPX;
    const bench = `<tr class="bench"><td><span class="sym">SPY</span><span class="nm">S&amp;P 500</span></td><td class="muted">benchmark</td><td><span class="cellv num">${fmt(spx.pct200[NOW])}%</span></td><td></td><td><span class="cellv num">${sgn(PX.SPY.dd[NOW])}%</span></td><td></td><td class="num r">${fmt(spy[NOW], 2)}</td><td class="num r">${pct((spy[NOW] / spy[NOW - 1] - 1) * 100)}</td><td class="num r">${pct((spy[NOW] / spy[NOW - 21] - 1) * 100)}</td></tr>`;
    $('boardTable').innerHTML = `<thead><tr><th>Settore</th><th>Stato</th><th>% titoli sopra media 200</th><th class="r">Blu</th><th>Drawdown da max 52s</th><th>Rotazione</th><th class="r">Ultimo</th><th class="r">1G</th><th class="r">1M</th></tr></thead><tbody>${body}${bench}</tbody>`;
    $('boardTable').querySelectorAll('tbody tr[data-sym]').forEach((tr) => {
      tr.onclick = () => openSector(tr.dataset.sym);
      tr.onkeydown = (e) => { if (e.key === 'Enter') openSector(tr.dataset.sym); };
    });
    $('boardMeta').textContent = `ordinati per stato · dati al ${dIT(DATES[NOW])}`;
    const by = (codes) => rows.filter((r) => codes.includes(r.state.code));
    const list = (a) => a.map((r) => r.s).join(' · ') || 'nessuno';
    const kpi = [
      ['S&amp;P 500 sopra media 200', `${fmt(spx.pct200[NOW])}% ${sparkline(spx.pct200.slice(NOW - 251, NOW + 1), 96, 26)}`, `${titoli(spx.above200[NOW])} su ${spx.n[NOW]} · linea grigia al 20%`],
      ['Settori in zona blu', `${by(['setup', 'fail']).length}<small> / 11</small>`, list(by(['setup', 'fail']))],
      [`Trigger nelle ultime ${P.cooldown} sedute`, `${by(['trig', 'cool']).length}<small> / 11</small>`, list(by(['trig', 'cool']))],
      ['Settori in attenzione', `${by(['watch']).length}<small> / 11</small>`, list(by(['watch']))],
      ['SPY · S&amp;P 500', fmt(spy[NOW], 2), `${sgn(PX.SPY.dd[NOW])}% dal massimo a 52 settimane`],
    ];
    $('boardKpis').innerHTML = kpi.map(([k, v, s]) => `<div class="kpi"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');
    const active = rows.filter((r) => r.state.code !== 'normal');
    $('activeMeta').textContent = `${active.length} su 11 · in attenzione, zona blu o dopo un trigger`;
    $('activeList').innerHTML = active.length ? active.map((r) => `<div class="acard" data-sym="${r.s}" tabindex="0">
        <div class="acard-h"><span><span class="sym">${r.s}</span><span class="nm">${NAMES[r.s]}</span></span>${badge(r.state.code)}</div>
        <div class="acard-t">${esc(r.state.why)}</div></div>`).join('') : '<p class="note">Nessun settore vicino al livello blu.</p>';
    $('activeList').querySelectorAll('.acard').forEach((c) => { c.onclick = () => openSector(c.dataset.sym); c.onkeydown = (e) => { if (e.key === 'Enter') openSector(c.dataset.sym); }; });
    $('stateLegend').innerHTML = [
      ['watch', `breadth entro ${P.watchBand} punti dal livello blu, oppure drawdown più profondo ${delPct(P.ddWatch)} della storia del settore. Sotto il livello blu per meno di ${P.setupCloses} chiusure si resta qui.`],
      ['setup', `breadth sotto il livello blu per ${P.setupCloses} chiusure e drawdown oltre il ${P.ddSetup}° percentile. Qui si formano i bottom, spesso in anticipo: ci si prepara.`],
      ['trig', 'la breadth risale di almeno 2 titoli sopra il livello blu con una conferma: spinta di breadth, prezzo sopra una media 20 crescente, divergenza o rimbalzo a V.'],
      ['fail', `entro ${P.failWindow} sedute dal trigger il prezzo rompe il minimo della zona blu: si torna in zona blu con regole più severe.`],
      ['cool', `per ${P.cooldown} sedute dopo un trigger nessun nuovo alert sullo stesso settore.`],
    ].map(([c, t]) => `<div>${badge(c)}<span>${t}</span></div>`).join('');
  }

  // ---------- 3 BOTTOM MAP ----------
  let mapDraw = null, mapSeries = null;
  function mapData() {
    const weeks = weeklyIndices(DATES.slice(0, NOW + 1)).slice(-9);
    const out = {};
    for (const s of SECTOR_KEYS) {
      out[s] = weeks.filter((k) => BR[s].pct200[k] != null && PX[s].dp[k] != null)
        .map((k) => ({ x: PX[s].dp[k], y: BR[s].pct200[k] - st.blue[s], t: k }));
    }
    return out;
  }
  const mapStates = () => Object.fromEntries(SECTOR_KEYS.map((s) => [s, stateOf(s).code]));
  function renderMap() {
    mapSeries = mapData();
    mapDraw = drawBottomMap($('bm'), { series: mapSeries, syms: SECTOR_KEYS, focus: st.mapFocus, params: P, states: mapStates() });
    $('bmMeta').textContent = `settimanale · coda 8 settimane · al ${dIT(DATES[NOW])} · colore del punto = stato attuale (in zona blu si entra dopo ${P.setupCloses} chiusure sotto il livello)`;
    // titoli che devono ancora scendere sotto la media perché la breadth arrivi al livello blu
    const rows = SECTOR_KEYS.map((s) => ({ s, d: BR[s].pct200[NOW] - st.blue[s], need: BR[s].above200[NOW] - Math.floor((st.blue[s] * BR[s].n[NOW]) / 100) })).sort((a, b) => a.d - b.d);
    const lo = Math.min(-10, Math.floor(Math.min(...rows.map((r) => r.d)) / 5) * 5), hi = Math.max(40, Math.ceil(Math.max(...rows.map((r) => r.d)) / 10) * 10);
    const pos = (v) => ((v - lo) / (hi - lo)) * 100;
    $('distList').innerHTML = rows.map(({ s, d, need }) => {
      const a = pos(Math.min(0, d)), b = pos(Math.max(0, d));
      return `<div class="r${st.mapFocus === s ? ' sel' : ''}" data-sym="${s}" tabindex="0"><span class="sym">${s}</span>
        <span class="track"><i class="${d <= 0 ? 'neg' : ''}" style="left:${a}%;width:${Math.max(0.6, b - a)}%"></i><span class="axis0" style="left:calc(${pos(0)}% - 1px)"></span></span>
        <span class="v">${sgn(d)} pt</span><span class="v muted">${need <= 0 ? 'sotto' : need + (need === 1 ? ' titolo' : ' titoli')}</span></div>`;
    }).join('');
    $('distList').querySelectorAll('.r').forEach((r) => {
      r.onmouseenter = () => { st.mapFocus = r.dataset.sym; redrawMap(); };
      r.onmouseleave = () => { st.mapFocus = null; redrawMap(); };
      r.onclick = () => openSector(r.dataset.sym);
      r.onkeydown = (e) => { if (e.key === 'Enter') openSector(r.dataset.sym); };
    });
  }
  function redrawMap() {
    mapDraw = drawBottomMap($('bm'), { series: mapSeries, syms: SECTOR_KEYS, focus: st.mapFocus, params: P, states: mapStates() });
    $('distList').querySelectorAll('.r').forEach((r) => r.classList.toggle('sel', r.dataset.sym === st.mapFocus));
  }
  function bindMap() {
    const svg = $('bm'), tip = $('bmTip');
    svg.addEventListener('pointermove', (e) => {
      if (!mapDraw || e.pointerType === 'touch') return;
      const h = nearestHead(svg, mapDraw.heads, e);
      const s = h ? h.sym : null;
      if (s !== st.mapFocus) { st.mapFocus = s; redrawMap(); }
      if (!h) { tip.hidden = true; return; }
      const q = mapSeries[s][mapSeries[s].length - 1];
      tip.innerHTML = `<div class="row"><b>${s}</b><span>${NAMES[s]}</span></div>
        <div class="row"><span>Sopra media 200</span><b>${fmt(BR[s].pct200[q.t])}%</b></div><div class="row"><span>Livello blu</span><b>${st.blue[s]}%</b></div>
        <div class="row"><span>Drawdown 52s</span><b>${sgn(PX[s].dd[q.t])}%</b></div><div class="row"><span>Profondità storica</span><b>${q.x}° pct</b></div>
        <div class="row"><span>Stato</span><b>${esc(STATES[stateOf(s).code])}</b></div>
        <div class="row"><span>Area del grafico</span><b>${{ setup: 'zona blu', watch: 'attenzione', normal: 'normale' }[zoneOf(q.x, q.y, P)]}</b></div>`;
      placeTip(tip, $('bmWrap'), e);
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; if (st.mapFocus) { st.mapFocus = null; redrawMap(); } });
    // clic o tocco sul punto più vicino: apre il settore
    svg.addEventListener('click', (e) => { const h = mapDraw ? nearestHead(svg, mapDraw.heads, e) : null; if (h) openSector(h.sym); });
  }

  // ---------- 4 SETTORE ----------
  function openSector(s) {
    st.sector = s; store.set('sector', s);
    ctx.setView('sec');
  }
  function rangeStart(s) {
    const first = Math.max(BR[s].pct200.findIndex((v) => v != null), PX[s].dp.findIndex((v) => v != null));
    const back = { '3A': 756, '10A': 2520, MAX: DATES.length }[st.range];
    return Math.max(first, NOW - back);
  }
  function renderSector() {
    const s = st.sector, m = machine(s), L = st.blue[s], state = stateOf(s);
    $('secChips').innerHTML = SECTOR_KEYS.map((k) => `<button type="button" class="chip" data-sym="${k}" aria-pressed="${k === s}"><span class="sd sd-${stateOf(k).code}"></span>${k}</button>`).join('');
    $('secChips').querySelectorAll('button').forEach((b) => b.onclick = () => openSector(b.dataset.sym));
    document.querySelectorAll('#rangeSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.range === st.range)));
    $('secTitle').textContent = `${s} · ${NAMES[s]}`;
    $('secBadge').innerHTML = badge(state.code);
    const i0 = rangeStart(s);
    drawSector($('ts'), {
      dates: DATES, close: PX[s].close, dd: PX[s].dd, b200: BR[s].pct200, b50: BR[s].pct50, days: m.days,
      triggers: m.events.filter((e) => e.code === 'trig').map((e) => e.t), i0, sym: s, blue: L, tipEl: $('tsTip'), wrapEl: $('tsWrap'),
    });
    // livello blu
    $('blueVal').textContent = L + '%';
    const f0 = BR[s].pct200.findIndex((v) => v != null);
    const hist = BR[s].pct200.slice(f0, NOW + 1).filter((v) => v != null);
    const under = hist.filter((v) => v <= L).length;
    const n = BR[s].n[NOW];
    $('blueInfo').textContent = `Il ${fmt((100 * under) / hist.length)}% delle sedute dal ${DATES[f0].slice(0, 4)} è stato sotto questo livello. Con ${n} titoli, uno vale ${fmt(100 / n)} punti.`;
    $('blueSrc').innerHTML = changed(s)
      ? `<span class="loc">modificato in questo browser · livello di default ${config.blue[s]}%</span>`
      : 'Livello di default dalla tabella «200 LEVEL SETTORI» di quant-rea. Le regole di zona blu, trigger e cooldown sono di questa app.';
    $('blueReset').hidden = !changed(s);
    // situazione
    const b = BR[s].pct200[NOW];
    $('secFacts').innerHTML = [
      ['Ultimo', fmt(S.adjclose[s][NOW], 2)],
      ['Titoli sopra media 200', `${BR[s].above200[NOW]}/${n} · ${fmt(b)}%`],
      ['Sopra media 50', `${fmt(BR[s].pct50[NOW])}%`],
      ['Distanza dal livello blu', `${sgn(b - L)} pt`],
      ['Drawdown da max 52s', `${sgn(PX[s].dd[NOW])}%`],
      ['Profondità storica DD', `${PX[s].dp[NOW]}° percentile`],
    ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    $('tvLinks').innerHTML = `<a href="${tvLink('AMEX:' + s)}" target="_blank" rel="noopener">${s} su TradingView ↗</a><a href="${tvLink('INDEX:' + TV[s])}" target="_blank" rel="noopener">${TV[s]} su TradingView ↗</a>`;
    renderMembers(s);
    renderEpisodes(s, m);
  }
  function renderMembers(s) {
    if (!latest) { $('memTable').innerHTML = '<tbody><tr><td class="muted">Fotografia per titolo non disponibile.</td></tr></tbody>'; return; }
    // sopra la media 200 con la regola dei conteggi (up200); i titoli con meno di 200 sedute contano come "non sopra"
    const up = (r) => (r.up200 != null ? r.up200 : r.d200 > 0);
    const rows = latest.members.filter((m) => m.sector === s && m.close != null)
      .sort((a, b) => up(b) - up(a) || (b.d200 ?? -Infinity) - (a.d200 ?? -Infinity));
    const firstBelow = rows.findIndex((r) => !up(r));
    const nUp = rows.filter(up).length, young = rows.filter((r) => r.d200 == null).length;
    $('memMeta').textContent = `${nUp} su ${rows.length} sopra la media 200 · al ${dIT(latest.asOf)}` + (young ? ` · ${young} con meno di 200 sedute` : '');
    $('memTable').innerHTML = `<thead><tr><th>Titolo</th><th class="r">vs m.200</th><th class="r">vs m.50</th><th class="r">DD 52s</th></tr></thead><tbody>` +
      rows.map((r, i) => `<tr class="${i === firstBelow ? 'cut' : ''}"><td title="${esc(r.name)}"><span class="sym">${esc(r.s)}</span></td><td class="num r">${r.d200 == null ? '<span class="muted" title="meno di 200 sedute di storia">n.d.</span>' : pct(r.d200)}</td><td class="num r">${pct(r.d50)}</td><td class="num r">${sgn(r.dd)}%</td></tr>`).join('') + '</tbody>';
  }
  function renderEpisodes(s, m) {
    const c = PX[s].close;
    const eps = m.setups.map((u) => ({
      start: u.t, bmin: u.bmin, dd: u.dd, trig: u.trig ? u.trig.t : null, conf: u.trig ? u.trig.conf.join(' + ') : '', fails: u.fails,
      z63: forward(c, u.t, 63), t21: forward(c, u.trig && u.trig.t, 21), t63: forward(c, u.trig && u.trig.t, 63), t126: forward(c, u.trig && u.trig.t, 126), mae: worstWithin(c, u.trig && u.trig.t, 63),
    })).reverse();
    const tr = eps.filter((e) => e.t63 != null);
    const first = BR[s].pct200.findIndex((v) => v != null);
    $('epiMeta').textContent = `${eps.length} ${eps.length === 1 ? 'zona blu' : 'zone blu'} dal ${dIT(DATES[first])} con livello ${st.blue[s]}%` +
      (tr.length ? ` · dopo il trigger +3M mediana ${sgn(median(tr.map((e) => e.t63)))}%` + (tr.length >= 5 ? `, positivi ${fmt(positive(tr.map((e) => e.t63)), 0)}% su ${tr.length} casi` : ` (${tr.length === 1 ? 'un solo caso' : `solo ${tr.length} casi`}: troppo pochi per una statistica)`) : '');
    if (!eps.length) { $('epiTable').innerHTML = '<tbody><tr><td class="muted">Nessuna zona blu nel periodo con questo livello.</td></tr></tbody>'; return; }
    const cell = (v) => (v == null ? '<span class="muted">—</span>' : pct(v));
    $('epiTable').innerHTML = `<thead><tr><th>Zona blu dal</th><th class="r">Breadth min</th><th class="r">DD ingresso</th><th class="r">+3M da zona blu</th><th>Trigger</th><th>Conferma</th><th class="r">+1M</th><th class="r">+3M</th><th class="r">+6M</th><th class="r">Peggior calo 3M</th></tr></thead><tbody>` +
      eps.map((e) => `<tr><td class="num">${dIT(DATES[e.start])}</td><td class="num r">${fmt(e.bmin)}%</td><td class="num r">${sgn(e.dd)}%</td><td class="num r">${cell(e.z63)}</td>
        <td class="num">${e.trig != null ? dIT(DATES[e.trig]) : '<span class="muted">in attesa</span>'}${e.fails ? ` <span class="down">· ${e.fails} ${e.fails === 1 ? 'fallito' : 'falliti'}</span>` : ''}</td><td class="wrapc">${esc(e.conf) || '<span class="muted">—</span>'}</td>
        <td class="num r">${cell(e.t21)}</td><td class="num r">${cell(e.t63)}</td><td class="num r">${cell(e.t126)}</td><td class="num r">${cell(e.mae)}</td></tr>`).join('') + '</tbody>';
  }
  function setBlue(delta) {
    const s = st.sector;
    st.blue[s] = Math.max(0, Math.min(60, st.blue[s] + delta));
    saveBlue();
    renderSector();
  }
  function saveBlue() {
    const diff = Object.fromEntries(Object.entries(st.blue).filter(([k, v]) => v !== config.blue[k]));
    store.set('blue', diff);
  }
  function configText() {
    return JSON.stringify({ ...config, blue: { ...st.blue } }, null, 2);
  }

  // ---------- 5 ALERT ----------
  function renderAlerts() {
    const ev = [];
    for (const s of SECTOR_KEYS) for (const e of machine(s).events) ev.push({ t: e.t, s, code: e.code, text: e.text });
    ev.sort((a, b) => b.t - a.t);
    const trig = ev.filter((e) => e.code === 'trig').map((e) => ({ r3: forward(PX[e.s].close, e.t, 63), r6: forward(PX[e.s].close, e.t, 126) }));
    const zb = ev.filter((e) => e.code === 'setup').map((e) => forward(PX[e.s].close, e.t, 63));
    $('alertStats').innerHTML = [
      ['Zone blu dal 2005', ev.filter((e) => e.code === 'setup').length, `+3M dall'ingresso: mediana ${sgn(median(zb))}% · positivi ${fmt(positive(zb), 0)}%`],
      ['Trigger dal 2005', ev.filter((e) => e.code === 'trig').length, `+3M mediana ${sgn(median(trig.map((x) => x.r3)))}% · positivi ${fmt(positive(trig.map((x) => x.r3)), 0)}% · +6M ${sgn(median(trig.map((x) => x.r6)))}%`],
      ['Segnali falliti', ev.filter((e) => e.code === 'fail').length, `prezzo sotto il minimo della zona blu entro ${P.failWindow} sedute`],
    ].map(([k, v, s]) => `<div class="kpi"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');
    $('alertCount').textContent = `${ev.length} cambi di stato · ultimi 60`;
    $('alertLog').innerHTML = ev.slice(0, 60).map((e) => `<li><span class="when">${dIT(DATES[e.t])}</span><button type="button" class="who" data-sym="${e.s}">${e.s}</button><span>${badge(e.code)} <span class="atext">${esc(e.text)}</span></span></li>`).join('');
    $('alertLog').querySelectorAll('.who').forEach((b) => b.onclick = () => openSector(b.dataset.sym));
    const sent = alertLog && alertLog.log ? alertLog.log.slice(-8).reverse() : [];
    $('sentInfo').innerHTML = alertLog
      ? `La GitHub Action ha controllato i dati fino al <b>${dIT(alertLog.checkedThrough)}</b>.` + (sent.length ? `<ul class="sent">${sent.map((e) => `<li>${dIT(e.date)} · ${e.sector} · ${esc(STATES[e.code])} ${e.telegram ? '· inviato' : '· solo registrato'}</li>`).join('')}</ul>` : ' Nessun cambio di stato dall\'attivazione.')
      : 'La GitHub Action non ha ancora registrato controlli.';
    $('rulesList').innerHTML = [
      'Alert solo sui cambi di stato: ingresso in zona blu, trigger, segnale fallito.',
      `Zona blu: breadth ≤ livello blu per ${P.setupCloses} chiusure e drawdown oltre il ${P.ddSetup}° percentile.`,
      `Trigger: breadth ≥ livello + max(${P.minRecoveryPoints} punti, ${P.minRecoveryStocks} titoli) con una conferma (due se la zona blu dura più di ${P.slowSetupSessions} sedute o dopo un fallimento).`,
      `Riarmo: una nuova zona blu solo dopo che la breadth torna sopra max(${P.resetFloor}%, livello + ${P.resetAbove}).`,
    ].map((t) => `<li>${t}</li>`).join('');
  }

  function bind() {
    $('blueMinus').onclick = () => setBlue(-1);
    $('bluePlus').onclick = () => setBlue(+1);
    $('blueReset').onclick = () => { st.blue[st.sector] = config.blue[st.sector]; saveBlue(); renderSector(); };
    document.querySelectorAll('#rangeSeg button').forEach((b) => b.onclick = () => { st.range = b.dataset.range; store.set('range', st.range); renderSector(); });
    $('copyCfg').onclick = async () => {
      const text = configText();
      try { await navigator.clipboard.writeText(text); $('copyMsg').textContent = 'Copiata: incollala in config/thresholds.json per usarla negli alert.'; }
      catch { $('cfgText').value = text; $('cfgText').hidden = false; $('cfgText').select(); $('copyMsg').textContent = 'Copia il testo selezionato in config/thresholds.json.'; }
    };
    bindMap();
  }

  return {
    NOW, bind, renderMonitor, renderMap, renderSector, renderAlerts, openSector, sector: () => st.sector,
    isSector: (s) => SECTOR_KEYS.includes(s),
    asOf: DATES[NOW],
  };
}
