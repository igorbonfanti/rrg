/*
 * bottom.js — viste della ricerca dei bottom settoriali: Monitor dei settori, Bottom Map,
 * dettaglio del settore e registro degli alert. Dati: sectors.json (prezzi ETF lunghi),
 * breadth.json (titoli sopra le medie), breadth_latest.json (fotografia per titolo),
 * config/thresholds.json (livelli blu e parametri), alerts.json (invii Telegram).
 */
import { breadthSeries, priceSeries, runMachine, forward, worstWithin, offReasons, approachLevel, explainState, signalContext, median, DEFAULT_PARAMS, STATES, SECTOR_KEYS } from './signals.js';
import { weeklyIndices } from './engine.js';
import { drawSector } from './sector-chart.js';
import { drawBottomMap, zoneOf } from './bottom-map.js';
import { nearestHead, SIZE } from './rrg-chart.js';
import { esc, fmt, sgn, sgnP, pct, dIT, qPill, placeTip, hideOnTapOutside, chartWidth, keepFocus, DD_TIP, DDP_TIP, ddpTip, ilPct, delPct, checklistHTML, contextHTML, outOf } from './format.js';
import { priceDrawdown } from './metrics.js';

export const NAMES = {
  XLK: 'Technology', XLC: 'Communication Services', XLY: 'Consumer Discretionary', XLP: 'Consumer Staples', XLE: 'Energy',
  XLF: 'Financials', XLV: 'Health Care', XLI: 'Industrials', XLB: 'Materials', XLRE: 'Real Estate', XLU: 'Utilities',
};
const TV = { XLK: 'SKTH', XLC: 'SLTH', XLY: 'SYTH', XLP: 'SPTH', XLE: 'SETH', XLF: 'SFTH', XLV: 'SVTH', XLI: 'SITH', XLB: 'SBTH', XLRE: 'SSTH', XLU: 'SUTH' };
const ORDER = { setup: 0, fail: 1, trig: 2, cool: 3, watch: 4, appr: 4.5, normal: 5 };
const ICON = {
  setup: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11 L1 4 H11 Z" fill="currentColor"/></svg>',
  trig: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1 L11 8 H1 Z" fill="currentColor"/></svg>',
  fail: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="2"/></svg>',
  cool: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 3.5 V6 H8" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  watch: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  normal: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5" width="8" height="2" fill="currentColor"/></svg>',
};
export const badge = (code, label = STATES[code]) => `<span class="st st-${code}">${ICON[code]}${esc(label)}</span>`;
// avvicinamento al livello blu: non è uno stato della macchina (niente alert), solo un'indicazione per la watchlist
const APPR_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.2 1.6"/></svg>';
export const apprBadge = () => `<span class="st st-appr">${APPR_ICON}Avvicinamento</span>`;
const tvLink = (sym) => `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
// Titoli: TradingView scrive le classi di azioni con il punto (BRK.B), i dati con il trattino (BRK-B)
const tvStock = (sym) => tvLink(sym.replace('-', '.'));
// "del 70%" ma "dell'80%", "dell'8%", "dell'11%", "dell'1%"
const titoli = (k) => `${k} ${k === 1 ? 'titolo' : 'titoli'}`;
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
 *          rotationNote?: () => string,
 *          setView: (v: string) => void, openRRG: (s: string) => void}} ctx
 */
export function createBottom(ctx) {
  const { $, sectors: S, breadth: B, latest, config, alertLog, store, cap } = ctx;
  const DATES = S.dates;
  const P = { ...DEFAULT_PARAMS, ...config.params };
  const PX = {}, BR = {};
  for (const s of Object.keys(S.adjclose)) PX[s] = priceSeries(S.adjclose[s]);
  for (const k of [...SECTOR_KEYS, 'SPX']) BR[k] = breadthSeries(B, k, DATES);
  // ultima seduta con prezzi e breadth
  let NOW = DATES.length - 1;
  while (NOW > 0 && BR.SPX.pct200[NOW] == null) NOW--;
  // drawdown sul solo prezzo (stesse sedute, chiusure senza la rettifica per i dividendi): la pipeline lo
  // calcola alla seduta della breadth; si mostra solo se è la stessa del Monitor, così una riga non mescola due date
  const P52 = S.max52 && (S.max52At || S.asOf) === DATES[NOW] ? S.max52 : {};
  const ddp = (s) => priceDrawdown(P52[s]);
  const ddpCell = (s) => {
    const v = ddp(s);
    return `<td class="num r c-ddp" title="${esc(v == null ? DDP_TIP : ddpTip(P52[s], DATES[NOW], PX[s].dd[NOW]))}">${v == null ? '<span class="muted">—</span>' : sgn(v) + '%'}</td>`;
  };
  const st = {
    blue: { ...config.blue, ...validBlue(store.get('blue', {})) },
    sector: SECTOR_KEYS.includes(store.get('sector')) ? store.get('sector') : 'XLU',
    range: ['3A', '10A', 'MAX'].includes(store.get('range')) ? store.get('range') : '3A', mapFocus: null, mapWeek: null, zoom: store.get('bmZoom', false) === true,
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
    const ddTxt = `drawdown ${sgnP(dd)}, più profondo ${delPct(dp)} delle sedute dal ${since}`;
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
  // perché questo stato e cosa manca al prossimo (signals.js explainState, stesse regole della macchina)
  function explain(s) {
    const m = machine(s);
    let t = NOW;
    while (t > 0 && m.days[t] == null) t--;
    const e = explainState(PX[s], BR[s], st.blue[s], P, m, DATES, t);
    if (approach(s).on) e.why = `Avvicinamento: ${apprWhy(s)}.`;
    return e;
  }
  const changed = (s) => st.blue[s] !== config.blue[s];
  // Avvicinamento: settore in stato normale con la breadth sotto la sua soglia di avvicinamento (signals.js)
  const apprCache = new Map();
  function approach(s) {
    const L = st.blue[s], key = s + ':' + L;
    if (!apprCache.has(key)) apprCache.set(key, approachLevel(BR[s].pct200.slice(0, NOW + 1), L));
    const A = apprCache.get(key), b = BR[s].pct200[NOW];
    return { A, on: A != null && b != null && stateOf(s).code === 'normal' && b <= A };
  }
  const apprWhy = (s) => {
    const { A } = approach(s), b = BR[s].pct200[NOW], L = st.blue[s];
    return `breadth ${fmt(b)}%, sotto la soglia di avvicinamento ${fmt(A, 0)}% (livello blu ${L}% + il calo forte del settore in 10 sedute, ${fmt(A - L, 0)} punti): in un calo deciso il livello blu è a circa due settimane`;
  };

  // ---------- cosa è cambiato dall'ultima visita ----------
  // In questo browser restano due fotografie: quella dei dati di oggi e quella dell'ultima visita con i dati di un altro
  // giorno. Si confronta con la seconda, così la striscia resta per tutta la giornata anche ricaricando la pagina.
  const snapCode = (s) => (approach(s).on ? 'appr' : stateOf(s).code);
  const VISIT_LABEL = { ...STATES, appr: 'Avvicinamento' };
  let visitBase;
  function lastVisit() {
    if (visitBase !== undefined) return visitBase;
    const now = { date: DATES[NOW], blue: { ...st.blue }, s: Object.fromEntries(SECTOR_KEYS.map((k) => [k, [snapCode(k), BR[k].pct200[NOW] == null ? null : Math.round(BR[k].pct200[NOW] * 10) / 10]])) };
    const v = store.get('visit', null), ok = (x) => x && typeof x.date === 'string' && x.s && typeof x.s === 'object';
    let base = null;
    if (v && ok(v.cur) && v.cur.date === now.date) base = ok(v.prev) ? v.prev : null;
    else if (v && ok(v.cur) && v.cur.date < now.date) base = v.cur;
    store.set('visit', { cur: now, prev: base });
    return (visitBase = base);
  }
  function renderChanges() {
    const base = lastVisit(), box = $('changes');
    if (!base) { box.hidden = true; return; }
    const items = [];
    for (const k of SECTOR_KEYS) {
      const o = base.s[k], code = snapCode(k);
      if (!Array.isArray(o) || !VISIT_LABEL[o[0]] || o[0] === code) continue;
      const lvl = base.blue && base.blue[k] != null && base.blue[k] !== st.blue[k] ? ' (livello blu cambiato)' : '';
      items.push(`<button type="button" class="chg" data-sym="${k}"><b>${k}</b> ${VISIT_LABEL[o[0]]} → <b>${VISIT_LABEL[code]}</b>${lvl}</button>`);
    }
    // breadth mossa di almeno 5 punti: le 4 variazioni più grandi
    const moves = SECTOR_KEYS.map((k) => [k, Array.isArray(base.s[k]) ? base.s[k][1] : null, BR[k].pct200[NOW]])
      .filter(([, a, b]) => typeof a === 'number' && b != null && Math.abs(b - a) >= 5)
      .sort((x, y) => Math.abs(y[2] - y[1]) - Math.abs(x[2] - x[1])).slice(0, 4);
    box.innerHTML = `<span class="chg-k">Dalla tua visita con i dati al ${dIT(base.date)}</span>` +
      (items.length ? items.join('') : '<span class="chg-none">nessun cambio di stato</span>') +
      (moves.length ? `<span class="chg-br">breadth ${moves.map(([k, a, b]) => `<button type="button" class="chg" data-sym="${k}">${k} ${fmt(a, 0)} → ${fmt(b, 0)}%</button>`).join('')}</span>` : '');
    box.querySelectorAll('.chg').forEach((b) => { b.onclick = () => openSector(b.dataset.sym); });
    box.hidden = false;
  }

  // ---------- 1 MONITOR ----------
  function renderMonitor() {
    renderChanges();
    const rows = SECTOR_KEYS.map((s) => {
      const c = S.adjclose[s];
      return {
        s, state: stateOf(s), appr: approach(s).on, rot: ctx.rotation(s), last: c[NOW], d1: (c[NOW] / c[NOW - 1] - 1) * 100, m1: (c[NOW] / c[NOW - 21] - 1) * 100,
        dd: PX[s].dd[NOW], dp: PX[s].dp[NOW], worst: Math.min(...PX[s].dd.slice(NOW - 1259, NOW + 1).filter((v) => v != null)),
        b: BR[s].pct200[NOW], b1m: BR[s].pct200[NOW - 21], n: BR[s].n[NOW], above: BR[s].above200[NOW], L: st.blue[s],
      };
    }).sort((a, b) => ORDER[a.appr ? 'appr' : a.state.code] - ORDER[b.appr ? 'appr' : b.state.code] || (a.b - a.L) - (b.b - b.L));
    const DDMAX = 35;
    const body = rows.map((r) => {
      const ddw = Math.min(100, (Math.abs(r.dd) / DDMAX) * 100), worst = Math.min(100, (Math.abs(r.worst) / DDMAX) * 100);
      return `<tr data-sym="${r.s}" tabindex="0">
        <td class="c-name"><span class="sym">${r.s}</span><span class="nm">${NAMES[r.s]}</span></td>
        <td class="c-state">${r.appr ? apprBadge() : badge(r.state.code)}</td>
        <td class="c-br" data-l="breadth"><span class="cellv num" title="${titoli(r.above)} su ${r.n}">${fmt(r.b)}%<span class="cnt" title="${titoli(r.above)} sopra la media 200 su ${r.n}: nei settori piccoli un titolo vale ${fmt(100 / r.n)} punti">${r.above}/${r.n}</span></span><span class="bullet${r.b <= r.L ? ' below' : ''}"><span class="zone" style="width:${r.L}%"></span><i style="width:${Math.max(1, r.b)}%"></i><span class="ago" style="left:calc(${r.b1m}% - 1px)" title="un mese fa ${fmt(r.b1m)}%"></span><span class="tick" style="left:calc(${r.L}% - 1px)"></span></span></td>
        <td class="num r c-blue" data-l="blu">${r.L}%${changed(r.s) ? '<span class="loc" title="modificato in questo browser">*</span>' : ''}</td>
        <td class="c-dd" data-l="drawdown"><span class="cellv num">${sgnP(r.dd)}</span><span class="bar" title="più profondo ${delPct(r.dp)} delle sedute; peggiore a 5 anni ${sgnP(r.worst)}"><i class="${r.dp >= 80 ? 'deep' : ''}" style="width:${ddw}%"></i><span class="mark" style="left:calc(${worst}% - 1px)"></span></span></td>
        ${ddpCell(r.s)}
        <td class="c-rot">${r.rot ? qPill(r.rot.q, r.rot.heading) : ''}</td>
        <td class="num r c-last" data-l="ultimo">${fmt(r.last, 2)}</td><td class="num r c-d1" data-l="1G">${pct(r.d1)}</td><td class="num r c-m1" data-l="1M">${pct(r.m1)}</td></tr>`;
    }).join('');
    const spy = S.adjclose.SPY, spx = BR.SPX;
    const bench = `<tr class="bench"><td class="c-name"><span class="sym">SPY</span><span class="nm">S&amp;P 500</span></td><td class="muted c-state">benchmark</td><td class="c-br" data-l="breadth"><span class="cellv num">${fmt(spx.pct200[NOW])}%</span></td><td class="c-blue"></td><td class="c-dd" data-l="drawdown"><span class="cellv num">${sgnP(PX.SPY.dd[NOW])}</span></td>${ddpCell('SPY')}<td class="c-rot"></td><td class="num r c-last" data-l="ultimo">${fmt(spy[NOW], 2)}</td><td class="num r c-d1" data-l="1G">${pct((spy[NOW] / spy[NOW - 1] - 1) * 100)}</td><td class="num r c-m1" data-l="1M">${pct((spy[NOW] / spy[NOW - 21] - 1) * 100)}</td></tr>`;
    $('boardTable').innerHTML = `<thead><tr><th>Settore</th><th>Stato</th><th class="wrap-l">% titoli sopra media 200</th><th class="r">Blu</th><th class="wrap-l" title="${esc(DD_TIP)}">Drawdown da max 52s</th><th class="r wrap" title="${esc(DDP_TIP)}">Solo prezzo</th><th${ctx.rotationNote ? ` title="${ctx.rotationNote()}"` : ''}>Rotazione</th><th class="r">Ultimo</th><th class="r">1G</th><th class="r">1M</th></tr></thead><tbody>${body}${bench}</tbody>`;
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
      ['Settori in attenzione', `${by(['watch']).length}<small> / 11</small>`, list(by(['watch'])) + (rows.some((r) => r.appr) ? ` · in avvicinamento: ${rows.filter((r) => r.appr).map((r) => r.s).join(' · ')}` : '')],
      ['SPY · S&amp;P 500', fmt(spy[NOW], 2), `${sgnP(PX.SPY.dd[NOW])} dal massimo a 52 settimane${ddp('SPY') == null ? '' : ` · solo prezzo ${sgnP(ddp('SPY'))}`}`],
    ];
    $('boardKpis').innerHTML = kpi.map(([k, v, s]) => `<div class="kpi"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');
    const active = rows.filter((r) => r.state.code !== 'normal' || r.appr);
    $('activeMeta').textContent = `${active.length} su 11 · in avvicinamento, attenzione, zona blu o dopo un trigger`;
    $('activeList').innerHTML = active.length ? active.map((r) => `<div class="acard" data-sym="${r.s}" tabindex="0">
        <div class="acard-h"><span><span class="sym">${r.s}</span><span class="nm">${NAMES[r.s]}</span></span>${r.appr ? apprBadge() : badge(r.state.code)}</div>
        <div class="acard-t">${esc(r.appr ? apprWhy(r.s) : r.state.why)}</div>${explain(r.s).summary ? `<div class="acard-t ck-sum">${esc(explain(r.s).summary)}</div>` : ''}</div>`).join('') : '<p class="note">Nessun settore vicino al livello blu.</p>';
    $('activeList').querySelectorAll('.acard').forEach((c) => { c.onclick = () => openSector(c.dataset.sym); c.onkeydown = (e) => { if (e.key === 'Enter') openSector(c.dataset.sym); }; });
    $('stateLegend').innerHTML = `<div>${apprBadge()}<span>breadth sotto la soglia di avvicinamento del settore: livello blu più il suo calo forte in 10 sedute (in un calo deciso il livello è a circa due settimane). Da mettere in osservazione; non cambia lo stato e non manda alert. Dal 2005, nel campione: 59 tocchi del livello su 73 avvisati, ma meno della metà degli avvicinamenti è arrivata al livello.</span></div>` + [
      ['watch', `breadth entro ${P.watchBand} punti dal livello blu, oppure drawdown più profondo ${delPct(P.ddWatch)} della storia del settore. Sotto il livello blu per meno di ${P.setupCloses} chiusure si resta qui.`],
      ['setup', `breadth sotto il livello blu per ${P.setupCloses} chiusure e drawdown oltre il ${P.ddSetup}° percentile. Qui si formano spesso i bottom, di solito in anticipo: ci si prepara.`],
      ['trig', `la breadth risale sopra il livello blu di almeno ${P.minRecoveryPoints} punti (o ${P.minRecoveryStocks} titoli, se valgono di più) e di almeno ${P.minRecoveryStocks} titoli sopra il minimo della zona blu, con una conferma (due se la zona blu dura più di ${P.slowSetupSessions} sedute o dopo un fallimento): spinta di breadth, prezzo sopra una media 20 crescente o divergenza. Il rimbalzo a V, cioè la breadth di nuovo sopra max(${P.resetFloor}%, livello + ${P.resetAbove}), basta da solo.`],
      ['fail', `il prezzo chiude sotto il minimo della zona blu, meno un'escursione media giornaliera, entro ${P.failWindow} sedute dal trigger; oppure più tardi, prima del riarmo, con la breadth di nuovo sotto il livello blu. Si torna in zona blu con regole più severe.`],
      ['cool', `per ${P.cooldown} sedute dopo un trigger nessun nuovo alert sullo stesso settore.`],
    ].map(([c, t]) => `<div>${badge(c)}<span>${t}</span></div>`).join('');
  }

  // ---------- 3 BOTTOM MAP ----------
  let mapDraw = null, mapSeries = null;
  // Data della mappa: oggi oppure una settimana passata (cursore, replay, crisi passate). Alla data T tutto è come si
  // vedeva allora: coda delle 8 settimane prima, stato della macchina quel giorno, avvicinamento con la storia fino a T
  const WEEKS = weeklyIndices(DATES.slice(0, NOW + 1));
  const FIRST_WEEK = Math.max(0, WEEKS.findIndex((k) => SECTOR_KEYS.filter((s) => BR[s].pct200[k] != null && PX[s].dp[k] != null).length >= 6));
  const JUMPS = [['2008-11-20', 'nov 2008'], ['2011-10-03', 'ott 2011'], ['2016-02-11', 'feb 2016'], ['2018-12-24', 'dic 2018'], ['2020-03-23', 'mar 2020'], ['2022-10-12', 'ott 2022'], ['2025-04-08', 'apr 2025']];
  const mapT = () => (st.mapWeek == null ? NOW : WEEKS[st.mapWeek]);
  function mapData(T) {
    const weeks = WEEKS.filter((k) => k <= T).slice(-9);
    if (weeks.at(-1) !== T) weeks.push(T); // l'ultima seduta, anche a settimana non finita
    const out = {};
    for (const s of SECTOR_KEYS) {
      out[s] = weeks.slice(-9).filter((k) => BR[s].pct200[k] != null && PX[s].dp[k] != null)
        .map((k) => ({ x: PX[s].dp[k], y: BR[s].pct200[k] - st.blue[s], t: k }));
    }
    return out;
  }
  // stato di un settore alla seduta T (l'ultima calcolata fino a lì)
  function stateAt(s, T) {
    if (T === NOW) return stateOf(s).code;
    const m = machine(s);
    let t = T;
    while (t > 0 && m.days[t] == null) t--;
    return m.days[t] || 'normal';
  }
  // avvicinamento alla seduta T, con la soglia calcolata sulla storia fino a T (nessun dato del futuro)
  // soglia alla data T: nel replay ogni fotogramma la chiede per tutti i settori, quindi si tiene in cache
  const apprAt = new Map();
  function approachAt(s, T) {
    if (T === NOW) return approach(s);
    const key = `${s}:${st.blue[s]}:${T}`;
    if (!apprAt.has(key)) apprAt.set(key, approachLevel(BR[s].pct200.slice(0, T + 1), st.blue[s]));
    const b = BR[s].pct200[T], A = apprAt.get(key);
    return { A, on: A != null && b != null && stateAt(s, T) === 'normal' && b <= A };
  }
  const mapStates = (T) => Object.fromEntries(SECTOR_KEYS.map((s) => [s, stateAt(s, T)]));
  const mapRings = (T) => SECTOR_KEYS.filter((s) => approachAt(s, T).on);
  function mapControls() {
    const T = mapT(), today = st.mapWeek == null;
    const r = $('bmDate');
    r.min = FIRST_WEEK; r.max = WEEKS.length - 1; r.value = today ? WEEKS.length - 1 : st.mapWeek;
    $('bmDateVal').textContent = today ? `oggi · ${dIT(DATES[T])}` : `settimana al ${dIT(DATES[T])}`;
    $('bmToday').hidden = today;
    $('bmZoom').setAttribute('aria-pressed', String(st.zoom));
    keepFocus($('bmJumps'), 'data-d', JUMPS.map(([d, l]) => `<button type="button" class="chip" data-d="${d}" aria-pressed="${!today && DATES[T] >= d && Date.parse(DATES[T]) - Date.parse(d) < 7 * 864e5}">${l}</button>`).join(''));
    $('bmJumps').querySelectorAll('button').forEach((b) => { b.onclick = () => { stopReplay(); setMapWeek(weekOf(b.dataset.d)); }; });
  }
  // settimana che contiene la data (la prima che finisce in quel giorno o dopo): il minimo della crisi è nella mappa
  const weekOf = (d) => { let i = WEEKS.findIndex((w) => DATES[w] >= d); if (i < 0) i = WEEKS.length - 1; return Math.max(FIRST_WEEK, i); };
  function setMapWeek(i) {
    st.mapWeek = i == null || i >= WEEKS.length - 1 ? null : Math.max(FIRST_WEEK, i);
    st.mapFocus = null;
    renderMap();
  }
  let replay = null;
  function stopReplay() { if (replay) { clearInterval(replay); replay = null; $('bmPlay').textContent = '▶ PLAY'; } }
  function playReplay() {
    if (replay) { stopReplay(); return; }
    // da oggi si riparte da un anno fa; altrimenti dalla settimana scelta
    if (st.mapWeek == null) st.mapWeek = Math.max(FIRST_WEEK, WEEKS.length - 53);
    $('bmPlay').textContent = '❚❚ STOP';
    renderMap();
    replay = setInterval(() => {
      if (st.mapWeek == null || $('v-btm').hidden) { stopReplay(); return; }
      setMapWeek(st.mapWeek + 1);
      if (st.mapWeek == null) stopReplay();
    }, 220);
  }
  // per le date passate l'asse verticale è fisso (fino a 100 punti sopra il livello più basso), così nel replay non salta
  const mapTop = () => 96 - Math.min(...SECTOR_KEYS.map((s) => st.blue[s]));
  const mapOpts = (T) => ({ series: mapSeries, syms: SECTOR_KEYS, focus: st.mapFocus, params: P, states: mapStates(T), rings: mapRings(T), size: chartWidth($('bm'), SIZE), zoom: st.zoom, ...(T !== NOW ? { top: mapTop() } : {}) });
  function renderMap() {
    const T = mapT(), past = T !== NOW;
    mapControls();
    mapSeries = mapData(T);
    mapDraw = drawBottomMap($('bm'), mapOpts(T));
    $('bmMeta').textContent = `settimanale · coda 8 settimane · al ${dIT(DATES[T])}${past ? ' (storico)' : ''} · colore del punto = stato ${past ? 'di quel giorno' : 'attuale'} (in zona blu si entra dopo ${P.setupCloses} chiusure sotto il livello)${past ? ' · livelli blu di oggi, scelti conoscendo anche quella crisi' : ''}`;
    // titoli che devono ancora scendere sotto la media perché la breadth arrivi al livello blu
    const rows = SECTOR_KEYS.filter((s) => BR[s].pct200[T] != null).map((s) => ({ s, d: BR[s].pct200[T] - st.blue[s], need: BR[s].above200[T] - Math.floor((st.blue[s] * BR[s].n[T]) / 100) })).sort((a, b) => a.d - b.d);
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
      // anche da tastiera: la riga con il focus evidenzia il settore nel grafico
      r.onfocus = r.onmouseenter;
      r.onblur = r.onmouseleave;
      r.onclick = () => openSector(r.dataset.sym);
      r.onkeydown = (e) => { if (e.key === 'Enter') openSector(r.dataset.sym); };
    });
  }
  function redrawMap() {
    const T = mapT();
    mapDraw = drawBottomMap($('bm'), mapOpts(T));
    $('distList').querySelectorAll('.r').forEach((r) => r.classList.toggle('sel', r.dataset.sym === st.mapFocus));
  }
  function bindMap() {
    const svg = $('bm'), tip = $('bmTip');
    // con il mouse il tooltip segue il puntatore e il clic apre il settore; al tocco il primo tocco mostra i valori,
    // il secondo sullo stesso punto apre il settore
    let tapped = null, lastType = 'mouse';
    const showTip = (e, h, touch) => {
      const s = h.sym, q = mapSeries[s][mapSeries[s].length - 1], T = mapT(), ap = approachAt(s, T);
      tip.innerHTML = `<div class="row"><b>${s}</b><span>${NAMES[s]}</span></div>${T !== NOW ? `<div class="row"><span>Settimana al</span><b>${dIT(DATES[T])}</b></div>` : ''}
        <div class="row"><span>Sopra media 200</span><b>${fmt(BR[s].pct200[q.t])}%</b></div><div class="row"><span>Livello blu</span><b>${st.blue[s]}%</b></div>
        <div class="row"><span>Drawdown 52s</span><b>${sgnP(PX[s].dd[q.t])}</b></div><div class="row"><span>Profondità storica</span><b>${q.x}° pct</b></div>
        <div class="row"><span>Stato</span><b>${ap.on ? 'Avvicinamento' : esc(STATES[stateAt(s, T)])}</b></div>
        <div class="row"><span>Soglia di avvicinamento</span><b>${ap.A == null ? '—' : fmt(ap.A, 0) + '%'}</b></div>
        <div class="row"><span>Area del grafico</span><b>${{ setup: 'zona blu', watch: 'attenzione', normal: 'normale' }[zoneOf(q.x, q.y, P)]}</b></div>` +
        (touch ? `<div class="row note-row">Tocca di nuovo il punto per aprire ${s}</div>` : '');
      placeTip(tip, $('bmWrap'), e);
    };
    svg.addEventListener('pointerdown', (e) => { lastType = e.pointerType; });
    svg.addEventListener('pointermove', (e) => {
      if (!mapDraw || e.pointerType !== 'mouse') return;
      const h = nearestHead(svg, mapDraw.heads, e);
      const s = h ? h.sym : null;
      if (s !== st.mapFocus) { st.mapFocus = s; redrawMap(); }
      if (!h) { tip.hidden = true; return; }
      showTip(e, h, false);
    });
    const hideTip = () => { tip.hidden = true; tapped = null; if (st.mapFocus) { st.mapFocus = null; redrawMap(); } };
    svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
    hideOnTapOutside(svg, hideTip);
    // data: cursore, una settimana avanti o indietro con le frecce, replay, oggi
    $('bmDate').oninput = (e) => { stopReplay(); setMapWeek(+e.target.value); };
    $('bmDate').onkeydown = (e) => e.stopPropagation(); // le frecce muovono il cursore, non la rotazione
    $('bmPlay').onclick = playReplay;
    $('bmToday').onclick = () => { stopReplay(); setMapWeek(null); };
    $('bmZoom').onclick = () => { st.zoom = !st.zoom; store.set('bmZoom', st.zoom); renderMap(); };
    // clic o tocco sul punto più vicino: apre il settore
    svg.addEventListener('click', (e) => {
      const h = mapDraw ? nearestHead(svg, mapDraw.heads, e) : null;
      if (!h) { if (lastType !== 'mouse') hideTip(); return; }
      if (lastType === 'mouse' || tapped === h.sym) { tapped = null; openSector(h.sym); return; }
      tapped = h.sym; st.mapFocus = h.sym; redrawMap(); showTip(e, h, true);
    });
  }

  // ---------- 4 SETTORE ----------
  function openSector(s, silent) {
    st.sector = s; store.set('sector', s);
    ctx.setView('sec', silent);
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
    $('secBadge').innerHTML = approach(s).on ? apprBadge() : badge(state.code);
    $('secCheck').innerHTML = checklistHTML(explain(s)) + (cap ? cap.info(s) : '');
    const i0 = rangeStart(s);
    drawSector($('ts'), {
      dates: DATES, close: PX[s].close, dd: PX[s].dd, b200: BR[s].pct200, b50: BR[s].pct50, days: m.days,
      triggers: m.events.filter((e) => e.code === 'trig').map((e) => e.t), i0, sym: s, blue: L, tipEl: $('tsTip'), wrapEl: $('tsWrap'), width: chartWidth($('ts'), 940),
      off: m.off, offText: offReasons(P), sync: 'sec', watchBand: P.watchBand, approach: approach(s).A,
    });
    // livello blu
    $('blueVal').textContent = L + '%';
    $('blueMinus').disabled = L <= 0; $('bluePlus').disabled = L >= 60;
    const f0 = BR[s].pct200.findIndex((v) => v != null);
    const hist = BR[s].pct200.slice(f0, NOW + 1).filter((v) => v != null);
    const under = hist.filter((v) => v <= L).length;
    const n = BR[s].n[NOW];
    const share = fmt((100 * under) / hist.length);
    $('blueInfo').textContent = `${ilPct(share)} ${share}% delle sedute dal ${DATES[f0].slice(0, 4)} è stato sotto questo livello. Con ${n} titoli, uno vale ${fmt(100 / n)} punti.`;
    $('blueSrc').innerHTML = changed(s)
      ? `<span class="loc">modificato in questo browser · livello di default ${config.blue[s]}%</span>`
      : 'Livello di default dalla tabella «200 LEVEL SETTORI» di quant-rea. Le regole di zona blu, trigger e cooldown sono di questa app.';
    $('blueReset').hidden = !changed(s);
    // la configurazione copiata prima non vale più: si toglie il messaggio e il testo vecchio
    $('copyMsg').textContent = ''; $('cfgText').hidden = true;
    // situazione
    const b = BR[s].pct200[NOW], px = ddp(s);
    $('secFacts').innerHTML = [
      ['Ultimo', fmt(S.adjclose[s][NOW], 2)],
      ['Titoli sopra media 200', `${BR[s].above200[NOW]}/${n} · ${fmt(b)}%`],
      ['Sopra media 50', `${fmt(BR[s].pct50[NOW])}%`],
      ['Distanza dal livello blu', `${sgn(b - L)} pt`],
      ...(approach(s).A == null ? [] : [['Soglia di avvicinamento', `${fmt(approach(s).A, 0)}% · ${b <= approach(s).A ? 'sotto' : `${sgn(b - approach(s).A)} pt`}`, 'Livello blu più il calo forte della breadth in 10 sedute (90° percentile della storia): sotto questa soglia, in un calo deciso, il livello blu è a circa due settimane. Non è uno stato e non manda alert. Nel campione dal 2005 (regola scelta su questa stessa storia): avvisati con circa un mese di anticipo 59 tocchi del livello su 73; meno della metà degli avvicinamenti arriva al livello.']]),
      ['Drawdown da max 52s', `${sgnP(PX[s].dd[NOW])}`, DD_TIP],
      ...(px == null ? [] : [['Sul solo prezzo', `${sgnP(px)} · max ${fmt(P52[s].hi, 2)}`, `${ddpTip(P52[s], DATES[NOW], PX[s].dd[NOW])} ${DDP_TIP}`]]),
      ['Profondità storica DD', `${PX[s].dp[NOW]}° percentile`],
    ].map(([k, v, t]) => { const tt = t ? ` title="${esc(t)}"` : ''; return `<dt${tt}>${k}</dt><dd${tt}>${v}</dd>`; }).join('');
    $('tvLinks').innerHTML = `<a href="${tvLink('AMEX:' + s)}" target="_blank" rel="noopener">${s} su TradingView ↗</a><a href="${tvLink('INDEX:' + TV[s])}" target="_blank" rel="noopener">${TV[s]} su TradingView ↗</a>`;
    renderMembers(s);
    renderEpisodes(s, m);
    if (cap) cap.card('sec', s, { dates: DATES, close: PX[s].close, from: DATES[i0], what: 'il settore' });
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
      rows.map((r, i) => `<tr class="${i === firstBelow ? 'cut' : ''}"><td><a class="sym" href="${tvStock(r.s)}" target="_blank" rel="noopener" title="${esc(r.name)} · grafico su TradingView">${esc(r.s)}</a></td><td class="num r">${r.d200 == null ? '<span class="muted" title="meno di 200 sedute di storia">n.d.</span>' : pct(r.d200)}</td><td class="num r">${pct(r.d50)}</td><td class="num r">${sgnP(r.dd)}</td></tr>`).join('') + '</tbody>';
  }
  function renderEpisodes(s, m) {
    const c = PX[s].close;
    const eps = m.setups.map((u) => ({
      start: u.t, bmin: u.bmin, dd: u.dd, trig: u.trig ? u.trig.t : null, conf: u.trig ? u.trig.conf.join(' + ') : '', fails: u.fails,
      z63: forward(c, u.t, 63), t21: forward(c, u.trig && u.trig.t, 21), t63: forward(c, u.trig && u.trig.t, 63), t126: forward(c, u.trig && u.trig.t, 126), mae: worstWithin(c, u.trig && u.trig.t, 63),
    })).reverse();
    // la zona blu chiede il percentile del drawdown: per XLRE e XLC (ETF dal 2015 e dal 2018) la storia utile parte dopo
    const first = Math.max(BR[s].pct200.findIndex((v) => v != null), PX[s].dp.findIndex((v) => v != null));
    const nTrig = m.events.filter((e) => e.code === 'trig').length, nFail = m.events.filter((e) => e.code === 'fail').length;
    $('epiMeta').textContent = `${eps.length} ${eps.length === 1 ? 'zona blu' : 'zone blu'} dal ${dIT(DATES[first])} con livello ${st.blue[s]}% · ${nTrig} trigger${nFail ? `, ${nFail} ${nFail === 1 ? 'fallito' : 'falliti'}` : ''} · rendimenti a confronto sotto la tabella`;
    // per confronto: una seduta qualsiasi della stessa storia e SPY negli stessi giorni dei trigger
    const at = { trig: m.events.filter((e) => e.code === 'trig').map((e) => e.t), setup: m.setups.map((u) => u.t) };
    $('epiCtx').innerHTML = contextHTML(signalContext(c, at, first, [21, 63, 126], PX.SPY.close), { h: ['+1M', '+3M', '+6M'], key: 1, since: DATES[first].slice(0, 4), bench: 'SPY', what: 'il settore' });
    if (!eps.length) { $('epiTable').innerHTML = '<tbody><tr><td class="muted">Nessuna zona blu nel periodo con questo livello.</td></tr></tbody>'; return; }
    const cell = (v) => (v == null ? '<span class="muted">—</span>' : pct(v));
    $('epiTable').innerHTML = `<thead><tr><th>Zona blu dal</th><th class="r">Breadth min</th><th class="r">DD ingresso</th><th class="r">+3M da zona blu</th><th>Trigger</th><th>Conferma</th><th class="r">+1M</th><th class="r">+3M</th><th class="r">+6M</th><th class="r">Peggior calo 3M</th></tr></thead><tbody>` +
      eps.map((e) => `<tr><td class="num">${dIT(DATES[e.start])}</td><td class="num r">${fmt(e.bmin)}%</td><td class="num r">${sgnP(e.dd)}</td><td class="num r">${cell(e.z63)}</td>
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
  let anyCache = null;
  function renderAlerts() {
    const ev = [];
    for (const s of SECTOR_KEYS) for (const e of machine(s).events) ev.push({ t: e.t, s, code: e.code, text: e.text });
    ev.sort((a, b) => b.t - a.t);
    const trig = ev.filter((e) => e.code === 'trig').map((e) => ({ r3: forward(PX[e.s].close, e.t, 63), r6: forward(PX[e.s].close, e.t, 126), spy: forward(PX.SPY.close, e.t, 63) }));
    const zb = ev.filter((e) => e.code === 'setup').map((e) => forward(PX[e.s].close, e.t, 63));
    // per confronto: tutte le sedute di tutti i settori dal 2005 (cache: non dipende dai livelli blu)
    if (!anyCache) {
      const a = [];
      for (const s of SECTOR_KEYS) for (let t = BR[s].pct200.findIndex((v) => v != null); t >= 0 && t < DATES.length; t++) { const r = forward(PX[s].close, t, 63); if (r != null) a.push(r); }
      anyCache = { med: median(a), pos: positive(a) };
    }
    const excess = trig.map((x) => (x.r3 == null || x.spy == null ? null : x.r3 - x.spy));
    $('alertStats').innerHTML = [
      ['Zone blu dal 2005', ev.filter((e) => e.code === 'setup').length, `+3M dall'ingresso: mediana ${sgnP(median(zb))} · positivi ${outOf(zb)}`],
      ['Trigger dal 2005', ev.filter((e) => e.code === 'trig').length, `+3M mediana ${sgnP(median(trig.map((x) => x.r3)))} · positivi ${outOf(trig.map((x) => x.r3))} · +6M ${sgnP(median(trig.map((x) => x.r6)))}`],
      ['Per confronto', 'seduta qualsiasi', `+3M mediana ${sgnP(anyCache.med)} · positivi ${fmt(anyCache.pos, 0)}% (tutti i settori dal 2005) · dopo i trigger SPY +3M ${sgnP(median(trig.map((x) => x.spy)))}, settore meglio di SPY ${outOf(excess)}`],
      ['Segnali falliti', ev.filter((e) => e.code === 'fail').length, 'prezzo di nuovo sotto il minimo della zona blu dopo il trigger'],
    ].map(([k, v, s]) => `<div class="kpi"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');
    $('alertCount').textContent = `${ev.length} cambi di stato · ultimi 60`;
    $('alertLog').innerHTML = ev.slice(0, 60).map((e) => `<li><span class="when">${dIT(DATES[e.t])}</span><button type="button" class="who" data-sym="${e.s}">${e.s}</button><span>${badge(e.code)} <span class="atext">${esc(e.text)}</span></span></li>`).join('');
    $('alertLog').querySelectorAll('.who').forEach((b) => b.onclick = () => openSector(b.dataset.sym));
    const sent = alertLog && alertLog.log ? alertLog.log.slice(-8).reverse() : [];
    $('sentInfo').innerHTML = alertLog
      ? `La GitHub Action ha controllato i dati fino al <b>${dIT(alertLog.checkedThrough)}</b>.` + (sent.length ? `<ul class="sent">${sent.map((e) => `<li>${dIT(e.date)} · ${esc(e.sector)} · ${esc(STATES[e.code])} ${e.telegram ? '· inviato' : '· solo registrato'}${e.moved ? ` · rettifica: prima del ${dIT(e.moved)}` : ''}${e.retracted === true ? ' · annullato dal ricalcolo' : e.retracted ? ` · spostato al ${dIT(e.retracted)}` : ''}</li>`).join('')}</ul>` : ' Nessun cambio di stato dall\'attivazione.')
      : 'Registro degli invii non disponibile: il file data/alerts.json non è arrivato.';
    $('rulesList').innerHTML = [
      'Alert solo sui cambi di stato: ingresso in zona blu, trigger, segnale fallito.',
      `Zona blu: breadth ≤ livello blu per ${P.setupCloses} chiusure e drawdown oltre il ${P.ddSetup}° percentile.`,
      `Trigger: breadth ≥ livello + max(${P.minRecoveryPoints} punti, ${P.minRecoveryStocks} titoli) e almeno ${P.minRecoveryStocks} titoli sopra il minimo della zona blu, con una conferma (due se la zona blu dura più di ${P.slowSetupSessions} sedute o dopo un fallimento); il rimbalzo a V basta da solo.`,
      `Fallito: il prezzo chiude sotto il minimo della zona blu meno un'escursione media giornaliera entro ${P.failWindow} sedute dal trigger, oppure più tardi, prima del riarmo, con la breadth di nuovo sotto il livello blu.`,
      `Cooldown e riarmo: ${P.cooldown} sedute senza nuovi alert dopo un trigger; una nuova zona blu solo dopo che la breadth torna sopra max(${P.resetFloor}%, livello + ${P.resetAbove}).`,
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
    // arrivo dei dati dei cali forti o scelte cambiate nella scheda
    if (cap) cap.onChange(() => { if (!$('v-sec').hidden) renderSector(); });
  }

  return {
    NOW, bind, renderMonitor, renderMap, renderSector, renderAlerts, openSector, sector: () => st.sector,
    // per la vista 7 Titoli: stesso settore scelto, senza cambiare vista, e colore del suo stato
    selectSector: (s) => { if (SECTOR_KEYS.includes(s)) { st.sector = s; store.set('sector', s); } },
    stateCode: (s) => stateOf(s).code,
    isSector: (s) => SECTOR_KEYS.includes(s),
    asOf: DATES[NOW],
  };
}
