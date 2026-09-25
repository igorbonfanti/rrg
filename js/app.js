/* app.js — stato, viste (Monitor, RRG, Bottom Map, Settore, Alert), barra comandi e scorciatoie. */
import { build, stats, CENTER } from './engine.js';
import { createBottom } from './bottom.js';
import { priceMetrics } from './metrics.js';
import { drawRRG, nearestHead, SIZE } from './rrg-chart.js';
import { drawPerf } from './perf-chart.js';
import { expectedSession, sessionsBetween, MILAN } from './calendar.js';
import { portfolioIndex } from './portfolio.js';
import { esc, fmt, sgn, pct, dIT, arrow, qPill, QKEY, placeTip, chartWidth } from './format.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['mon', 'rrg', 'btm', 'sec', 'alr'];
const QORDER = { Improving: 0, Leading: 1, Weakening: 2, Lagging: 3 };
// La GitHub Action pubblica i dati di fine giornata alle 00:40 italiane (22:40 UTC), con due corse
// di recupero: prima di queste ore l'ultima chiusura non è ancora attesa e non conta come ritardo.
const PUBLISH_US = 20 * 60 + 30; // 20:30 a New York
const PUBLISH_EU = 26 * 60 + 30; // 02:30 a Roma del giorno dopo la seduta
const NEXT_UPDATE = 'aggiornamento automatico ogni notte verso l\'1 (ora italiana), dopo la chiusura USA';

// preferenze del singolo browser (se lo storage non è disponibile si usano i default)
const store = {
  get(k, d) { try { const v = localStorage.getItem('sm.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sm.' + k, JSON.stringify(v)); } catch { /* ignorato */ } },
  // valore salvato solo se è tra quelli ammessi (lo storage è condiviso da tutti i siti github.io dell'account)
  pick(k, allowed, d) { const v = this.get(k, d); return allowed.includes(v) ? v : d; },
};

const state = {
  data: null, global: null, groups: {}, view: 'mon',
  group: null, benchmark: null, timeframe: store.pick('timeframe', ['weekly', 'daily'], 'weekly'), formula: store.pick('formula', ['nuova', 'classica'], 'nuova'),
  tail: store.pick('tail', [4, 10, 16, 26], 10), scale: 'fit', perfDays: store.pick('perfDays', [63, 126, 252, 504], 126),
  shortcuts: store.get('shortcuts', true) !== false, // scorciatoie da un tasto (si spengono dalla guida)
  frame: 0, focus: null, pinned: null, hidden: new Set(), timer: null,
  sort: { key: 'rot', dir: 1 }, tableMode: 'rot',
  model: null, modelKey: '', bottom: null, sectorModels: {},
};

// ---------- avvio ----------
const getJSON = (url, optional) => fetch(url).then((r) => {
  if (r.ok) return r.json();
  if (optional) return null;
  throw new Error(`${url}: HTTP ${r.status}`);
}).catch((e) => { if (optional) return null; throw e; });

Promise.all([
  getJSON('data/prices.json'), getJSON('data/sectors.json'), getJSON('data/breadth.json'), getJSON('config/thresholds.json'),
  getJSON('data/breadth_latest.json', true), getJSON('data/alerts.json', true), getJSON('data/prices_global.json', true),
]).then(([prices, sectors, breadth, config, latest, alertLog, global]) => {
  state.data = prices;
  state.global = global ? addPortfolios(global) : null;
  state.extra = { sectors, breadth, config, latest, alertLog };
  init();
}).catch((e) => {
  $('v-mon').innerHTML = `<div class="panel"><div class="pb"><p class="note">Impossibile caricare i dati (${esc(e.message)}). In locale esegui gli script in <span class="mono">scripts/</span> e servi la cartella con un server statico.</p></div></div>`;
});

// ---------- universi ----------
// Portafoglio sintetico dei gruppi con "portfolio": diventa un ticker del file globale
function addPortfolios(g) {
  let k = 0;
  for (const grp of Object.values(g.groups)) {
    if (!grp.portfolio) continue;
    const key = k++ ? `PTF${k}` : 'PTF';
    const w = grp.portfolio.weights;
    const closes = Object.fromEntries(Object.keys(w).filter((s) => g.tickers[s]).map((s) => [s, g.tickers[s].close]));
    const { index, missing, now, rebalanced } = portfolioIndex(g.dates, closes, w);
    Object.assign(grp.portfolio, { key, now, rebalanced, missing });
    const lab = (s) => (g.tickers[s] ? g.tickers[s].label : s);
    const mix = Object.entries(w).map(([s, v]) => `${lab(s)} ${v}%`).join(', ');
    g.tickers[key] = {
      label: grp.portfolio.label, isBenchmark: true, synthetic: true, groups: [], close: index,
      name: `Portafoglio di esempio: ${mix}; ribilanciato a fine mese. Pesi indicativi, non una raccomandazione` + (missing.length ? ` (senza ${missing.join(', ')}: dati mancanti)` : ''),
    };
    const swap = (s) => (s === 'PTF' ? key : s);
    grp.benchmarks = grp.benchmarks.map(swap);
    grp.defaultBenchmark = swap(grp.defaultBenchmark);
  }
  return g;
}

// Registro degli universi: USA (prices.json, benchmark comuni) e globali in euro (prices_global.json)
// (un universo senza nessun benchmark nei dati, per esempio dopo un download fallito, non compare)
function buildGroups() {
  const out = {};
  const add = (name, ds, market, v, benchmarks) => {
    const ok = benchmarks.filter((b) => ds.tickers[b]);
    if (ok.length) out[name] = { ds, market, tickers: v.tickers, defaultBenchmark: ok.includes(v.defaultBenchmark) ? v.defaultBenchmark : ok[0], benchmarks: ok, portfolio: v.portfolio || null };
  };
  const us = state.data;
  for (const [name, v] of Object.entries(us.groups)) add(name, us, 'US', v, Object.keys(us.benchmarks));
  const gl = state.global;
  if (gl) for (const [name, v] of Object.entries(gl.groups)) add(name, gl, 'global', v, v.benchmarks);
  return out;
}
const grp = () => state.groups[state.group];
const ds = () => grp().ds;
const isGlobal = () => grp().market === 'global';
// simbolo senza suffisso di borsa (SWDA.MI → SWDA)
const baseSym = (s) => s.replace(/\.[A-Z]{1,3}$/, '');
// nome breve sul grafico: l'etichetta degli ETF globali, il ticker per i titoli USA
const labelOf = (set, s) => (set.tickers[s] && set.tickers[s].label) || s;
const label = (s) => labelOf(ds(), s);
const labelMap = () => Object.fromEntries(Object.keys(ds().tickers).map((s) => [s, label(s)]));
const benchText = (s) => (isGlobal() ? `${label(s)}${ds().tickers[s].synthetic ? '' : ` (${baseSym(s)})`}` : `${s} · ${state.data.benchmarks[s]}`);
function pickBenchmark(name) {
  const g = state.groups[name], saved = store.get('bench.' + name);
  return saved && g.benchmarks.includes(saved) ? saved : g.defaultBenchmark;
}
function fillSelects() {
  const names = Object.keys(state.groups);
  const opts = (market) => names.filter((n) => state.groups[n].market === market).map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  $('groupSel').innerHTML = `<optgroup label="USA · titoli in dollari">${opts('US')}</optgroup>` +
    (state.global ? `<optgroup label="Globali · ETF in euro">${opts('global')}</optgroup>` : '');
}
function fillBenchmarks() {
  $('benchSel').innerHTML = grp().benchmarks.filter((s) => ds().tickers[s]).map((s) => `<option value="${esc(s)}">${esc(benchText(s))}</option>`).join('');
}

function init() {
  state.groups = buildGroups();
  const names = Object.keys(state.groups);
  state.group = names.includes(store.get('group')) ? store.get('group') : names[0];
  state.benchmark = pickBenchmark(state.group);
  fillSelects();
  for (const set of [state.data, state.global]) {
    if (!set) continue;
    set.metrics = {};
    for (const s of Object.keys(set.tickers)) set.metrics[s] = priceMetrics(set.dates, set.tickers[s].close);
  }
  if (store.get('cvd', false) === true) { $('term').classList.add('cvd'); $('cvdBtn').setAttribute('aria-pressed', 'true'); }
  const x = state.extra;
  state.bottom = createBottom({
    $, sectors: x.sectors, breadth: x.breadth, latest: x.latest, config: x.config, alertLog: x.alertLog, store,
    rotation: sectorRotation, setView: (v) => setView(v), openRRG: focusSymbol,
  });
  renderHeader();
  $('loadingNote').hidden = true;
  $('intro').hidden = !!store.get('introSeen', false);
  bind();
  state.bottom.bind();
  syncControls();
  setPlaceholder();
  recompute(true, false);
  routeHash(true);
  window.addEventListener('hashchange', () => routeHash(true));
  // rotazione del telefono o finestra ridimensionata: i grafici si ridisegnano alla nuova larghezza
  let lastW = window.innerWidth, rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; setPlaceholder(); renderAll(); } }, 250);
  });
}

// #mon #rrg #btm #sec #alr, oppure #XLU per il dettaglio di un settore
function routeHash(silent) {
  const h = location.hash.replace('#', '').toUpperCase();
  if (state.bottom.isSector(h)) { state.bottom.openSector(h); return; }
  const v = h.toLowerCase();
  setView(VIEWS.includes(v) ? v : 'mon', silent);
}

// quadrante e direzione di un ETF settoriale vs SPY (settimanale), per la tabella dei settori
function sectorRotation(s) {
  const key = state.formula;
  if (!state.sectorModels[key]) {
    const group = Object.keys(state.data.groups).find((g) => state.data.groups[g].tickers.includes('XLK'));
    state.sectorModels[key] = group && state.data.tickers.SPY ? build(state.data, { symbols: state.data.groups[group].tickers, benchmark: 'SPY', timeframe: 'weekly', formula: key }) : null;
  }
  const m = state.sectorModels[key];
  return m && m.series[s] ? stats(m.series[s], m.dates.length - 1, 10) : null;
}

function renderHeader() {
  const d = state.data;
  const asOf = d.asOf || d.dates[d.dates.length - 1];
  const exp = expectedSession(new Date(), PUBLISH_US);
  // il ritardo peggiore tra prezzi USA e breadth dei settori
  const bAsOf = state.bottom ? state.bottom.asOf : asOf;
  const lag = Math.max(sessionsBetween(asOf, exp), sessionsBetween(bAsOf, exp));
  const badge = lag === 0 ? '<span class="fresh ok">AGGIORNATO</span>' : `<span class="fresh ${lag === 1 ? 'late' : 'stale'}">${lag} ${lag === 1 ? 'SEDUTA' : 'SEDUTE'} INDIETRO</span>`;
  const breadthNote = bAsOf < asOf ? ` <span class="muted">· breadth al ${dIT(bAsOf)}</span>` : '';
  $('clock').innerHTML = `EOD <b>${dIT(asOf)}</b>${breadthNote} ${badge}`;
  $('clock').title = `Chiusure USA · ${NEXT_UPDATE}`;
  $('genLine').textContent = `generato ${new Date(d.generated).toLocaleString('it-IT')}`;
}

// ---------- modello ----------
function symbols() {
  return grp().tickers.filter((s) => ds().tickers[s] && s !== state.benchmark);
}
function recompute(resetFrame, render = true) {
  const key = [state.group, state.benchmark, state.timeframe, state.formula].join('|');
  if (key !== state.modelKey) {
    // cambiando solo la formula si resta sulla stessa data
    const keepDate = !resetFrame && state.model ? state.model.dates[state.frame] : null;
    state.model = build(ds(), {
      symbols: symbols(), benchmark: state.benchmark, timeframe: state.timeframe, formula: state.formula,
      weekHasMoreSessions: isGlobal() ? MILAN.weekHasMoreSessions : undefined,
    });
    state.modelKey = key;
    state.maxRange = null;
    const k = keepDate ? state.model.dates.indexOf(keepDate) : -1;
    if (k >= 0) state.frame = k; else resetFrame = true;
  }
  const last = state.model.dates.length - 1;
  if (resetFrame || state.frame > last) state.frame = last;
  state.frame = Math.max(minFrame(), state.frame);
  if (render) renderAll();
}
const minFrame = () => Math.min(state.model.dates.length - 1, state.model.start + 1);
const lastFrame = () => state.model.dates.length - 1;
const isProvisional = () => state.model.provisional && state.frame === lastFrame();
const unit = () => (state.timeframe === 'weekly' ? 'sett.' : 'sedute');

function renderAll() {
  const b = state.bottom;
  if (state.view === 'rrg') renderRRGView();
  else if (state.view === 'mon') b.renderMonitor();
  else if (state.view === 'btm') b.renderMap();
  else if (state.view === 'sec') b.renderSector();
  else if (state.view === 'alr') b.renderAlerts();
}

// ---------- tabella prezzi dell'universo (vista RRG, modalità "Prezzi") ----------
function monitorRows() {
  const m = state.model, f = lastFrame(), d = ds();
  return symbols().map((s) => ({ s, name: d.tickers[s].name, mt: d.metrics[s], r: m.series[s] ? stats(m.series[s], f, state.tail) : null }));
}
// cella del titolo: ticker e nome per i titoli USA; per gli ETF globali etichetta e ticker, con il nome completo al passaggio del mouse
const symCell = (s, name, extra = '') => (isGlobal()
  ? `<span class="sym" title="${esc(name)}">${esc(label(s))}</span><span class="nm">${ds().tickers[s].synthetic ? '' : esc(baseSym(s))}${extra}</span>`
  : `<span class="sym">${esc(s)}</span><span class="nm">${esc(name)}${extra}</span>`);
const SORTERS = {
  sym: (a, b) => label(a.s).localeCompare(label(b.s)),
  last: (a, b) => a.mt.last - b.mt.last,
  d1: (a, b) => a.mt.d1 - b.mt.d1, w1: (a, b) => a.mt.w1 - b.mt.w1, m1: (a, b) => a.mt.m1 - b.mt.m1,
  m3: (a, b) => a.mt.m3 - b.mt.m3, ytd: (a, b) => a.mt.ytd - b.mt.ytd,
  dd: (a, b) => a.mt.dd52 - b.mt.dd52, vs200: (a, b) => a.mt.vs200 - b.mt.vs200,
  rot: (a, b) => (a.r && b.r ? QORDER[a.r.q] - QORDER[b.r.q] || b.r.dist - a.r.dist : 0),
  weeks: (a, b) => (a.r && b.r ? a.r.weeks - b.r.weeks : 0),
};
function renderPriceTable() {
  const d = ds(), bench = state.benchmark, bm = d.metrics[bench];
  const restore = keepFocus($('monTable')), foc = focused();
  // prezzi e rotazione all'ultima chiusura: la tabella non segue il cursore del periodo
  $('rotMeta').textContent = `ultima chiusura ${dIT(d.dates[d.dates.length - 1])}`;
  const rows = monitorRows();
  const { key, dir } = state.sort;
  rows.sort((a, b) => dir * SORTERS[key](a, b));
  const DDMAX = 35;
  const cols = [['sym', 'Titolo', ''], ['last', 'Ultimo', 'r'], ['d1', '1G', 'r'], ['w1', '1S', 'r'], ['m1', '1M', 'r'], ['m3', '3M', 'r'], ['ytd', 'YTD', 'r'],
    ['dd', 'Drawdown da max 52s', ''], ['vs200', 'vs media 200g', 'r'], ['rot', 'Rotazione', ''], ['weeks', 'Nel quadrante', 'r']];
  const head = '<thead><tr>' + cols.map(([k, label, cls]) => {
    const aria = state.sort.key === k ? ` aria-sort="${state.sort.dir > 0 ? 'ascending' : 'descending'}"` : '';
    return `<th class="${cls}"${aria}><button type="button" data-sort="${k}">${label}${state.sort.key === k ? (state.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`;
  }).join('') + '</tr></thead>';
  const ddCell = (mt) => {
    const w = Math.min(100, (Math.abs(mt.dd52) / DDMAX) * 100), worst = Math.min(100, (Math.abs(mt.ddWorst) / DDMAX) * 100);
    return `<span class="cellv num">${sgn(mt.dd52)}%</span><span class="bar" title="peggiore negli ultimi 5 anni ${sgn(mt.ddWorst)}%"><i class="${mt.ddDepth != null && mt.ddDepth >= 80 ? 'deep' : ''}" style="width:${w}%"></i><span class="mark" style="left:calc(${worst}% - 1px)"></span></span>`;
  };
  const body = rows.map(({ s, name, mt, r }) => `<tr data-sym="${esc(s)}" class="${foc === s ? 'sel' : ''}${state.hidden.has(s) ? ' off' : ''}" tabindex="0">
      <td>${symCell(s, name)}</td>
      <td class="num r">${fmt(mt.last, 2)}</td><td class="num r">${pct(mt.d1)}</td><td class="num r">${pct(mt.w1)}</td><td class="num r">${pct(mt.m1)}</td><td class="num r">${pct(mt.m3)}</td><td class="num r">${pct(mt.ytd)}</td>
      <td>${ddCell(mt)}</td><td class="num r">${pct(mt.vs200)}</td>
      <td>${r ? qPill(r.q, r.heading) : '<span class="muted">—</span>'}</td><td class="num r">${r ? `${r.weeks} ${unit()}` : '—'}</td></tr>`).join('');
  const benchRow = `<tr class="bench"><td>${symCell(bench, d.tickers[bench].name, ' · benchmark')}</td>
      <td class="num r">${fmt(bm.last, 2)}</td><td class="num r">${pct(bm.d1)}</td><td class="num r">${pct(bm.w1)}</td><td class="num r">${pct(bm.m1)}</td><td class="num r">${pct(bm.m3)}</td><td class="num r">${pct(bm.ytd)}</td>
      <td>${ddCell(bm)}</td><td class="num r">${pct(bm.vs200)}</td><td></td><td></td></tr>`;
  $('monTable').innerHTML = head + '<tbody>' + body + benchRow + '</tbody>';
  $('monTable').querySelectorAll('th button').forEach((b) => b.onclick = () => {
    const k = b.dataset.sort;
    state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === 'sym' || k === 'rot' ? 1 : -1) };
    renderPriceTable();
  });
  $('monTable').querySelectorAll('tbody tr[data-sym]').forEach((tr) => {
    const s = tr.dataset.sym, go = () => togglePin(s);
    tr.onmouseenter = () => { if (!state.pinned && !state.hidden.has(s)) { state.focus = s; refreshFocus(); } };
    tr.onmouseleave = () => { if (!state.pinned && state.focus) { state.focus = null; refreshFocus(); } };
    tr.onclick = go;
    tr.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  });
  restore();
}

// ---------- 2 RRG ----------
let lastDraw = null;
function maxRange() {
  if (state.maxRange) return state.maxRange;
  let mx = 1.5;
  for (const s of Object.keys(state.model.series)) {
    const { x, y } = state.model.series[s];
    for (let i = state.model.start; i < x.length; i++) if (x[i] != null) mx = Math.max(mx, Math.abs(x[i] - CENTER), Math.abs(y[i] - CENTER));
  }
  return (state.maxRange = Math.ceil(mx * 1.05 * 2) / 2);
}
function fitRange() {
  let mx = 1.5;
  const f0 = Math.max(0, state.frame - state.tail + 1);
  for (const [s, { x, y }] of Object.entries(state.model.series)) {
    if (state.hidden.has(s)) continue;
    for (let i = f0; i <= state.frame; i++) if (x[i] != null) mx = Math.max(mx, Math.abs(x[i] - CENTER), Math.abs(y[i] - CENTER));
  }
  return Math.ceil(mx * 1.12 * 4) / 4;
}
// titolo in evidenza (mai il benchmark, che non è sul grafico)
const focused = () => { const f = state.pinned || state.focus; return f && f !== state.benchmark ? f : null; };
function drawChart() {
  lastDraw = drawRRG($('rrg'), {
    syms: symbols().filter((s) => !state.hidden.has(s)), series: state.model.series, frame: state.frame, tail: state.tail, labels: labelMap(), size: chartWidth($('rrg'), SIZE),
    focus: focused(), range: state.scale === 'max' || state.timer ? maxRange() : fitRange(), provisional: isProvisional(),
  });
}
// frameOnly: cambia solo il periodo mostrato (la performance non dipende dal periodo e non si ridisegna)
function renderRRGView(frameOnly = false) {
  drawChart();
  const m = state.model;
  $('rrgTitle').textContent = `Rotazione relativa · ${state.group} vs ${isGlobal() ? label(state.benchmark) : state.benchmark}`;
  $('rrgMeta').innerHTML = `${state.timeframe === 'weekly' ? 'settimanale' : 'giornaliero'} · formula ${esc(state.formula)}` + (isGlobal() ? ` · ${globalFreshness()}` : '');
  const fr = $('frame');
  fr.min = minFrame(); fr.max = lastFrame(); fr.value = state.frame;
  $('frameDate').textContent = dIT(m.dates[state.frame]) + (isProvisional() ? ' *' : '');
  fr.setAttribute('aria-valuetext', dIT(m.dates[state.frame]) + (isProvisional() ? ', provvisorio' : ''));
  $('provNote').hidden = !isProvisional();
  const px = state.tableMode === 'px';
  $('rotWrap').hidden = px; $('rotNote').hidden = px; $('pxWrap').hidden = !px; $('pxNote').hidden = !px;
  $('tableTitle').textContent = px ? `Prezzi · ${state.group}` : 'Tabella di rotazione';
  if (px) renderPriceTable(); else renderRotTable();
  if (!frameOnly) { renderPerf(); renderPortfolio(); }
}
// Dopo il ridisegno di una tabella il focus da tastiera torna sulla stessa riga, spunta o intestazione
function keepFocus(table) {
  const a = document.activeElement;
  if (!a || !table.contains(a)) return () => {};
  const sort = a.dataset && a.dataset.sort, tr = a.closest('tr[data-sym]');
  const sym = tr && tr.dataset.sym, onBox = a.classList.contains('vis');
  return () => {
    let el = null;
    if (sort) el = table.querySelector(`th button[data-sort="${sort}"]`);
    else if (sym) {
      const row = [...table.querySelectorAll('tbody tr[data-sym]')].find((r) => r.dataset.sym === sym);
      el = row && (onBox ? row.querySelector('input.vis') : row);
    }
    if (el) el.focus({ preventScroll: true });
  };
}
function renderRotTable() {
  const f = state.frame, foc = focused();
  const restore = keepFocus($('rotTable'));
  const rows = symbols().filter((s) => state.model.series[s]).map((s) => ({ s, r: stats(state.model.series[s], f, state.tail) })).filter((x) => x.r)
    .sort((a, b) => QORDER[a.r.q] - QORDER[b.r.q] || b.r.dist - a.r.dist);
  $('rotMeta').textContent = `${dIT(state.model.dates[f])}${isProvisional() ? ' (in corso)' : ''}`;
  const dl = (v) => `<span class="dlt ${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${v > 0 ? '▲' : v < 0 ? '▼' : ''}${fmt(Math.abs(v), 2)}</span>`;
  $('rotTable').innerHTML = `<thead><tr><th>Titolo</th><th>Quadrante</th><th class="r">RS-Ratio</th><th class="r">RS-Mom</th><th class="r">Direz.</th><th class="r">Vel.</th><th class="r">Dist.</th><th class="r">${unit()}</th><th>Prima</th></tr></thead><tbody>` +
    rows.map(({ s, r }) => `<tr data-sym="${esc(s)}" class="${foc === s ? 'sel' : ''}${state.hidden.has(s) ? ' off' : ''}" tabindex="0">
      <td title="${esc((isGlobal() ? baseSym(s) + ' · ' : '') + ds().tickers[s].name)}"><input type="checkbox" class="vis" data-sym="${esc(s)}" aria-label="Mostra ${esc(label(s))} sul grafico" ${state.hidden.has(s) ? '' : 'checked'}> <span class="sym">${esc(label(s))}</span></td>
      <td><span class="pill q-${QKEY[r.q]}-c"><span class="d"></span>${r.q}</span></td>
      <td class="num r">${fmt(r.x, 2)} ${dl(r.dx)}</td><td class="num r">${fmt(r.y, 2)} ${dl(r.dy)}</td>
      <td class="num r${r.heading != null && r.heading <= 90 ? ' hpos' : ''}"><span class="q-${QKEY[r.q]}-c">${arrow(r.heading)}</span> ${fmt(r.heading, 0)}°</td>
      <td class="num r">${fmt(r.speed, 2)}</td><td class="num r">${fmt(r.dist, 2)}</td><td class="num r">${r.weeks}</td>
      <td>${r.prev ? `<span class="q-${QKEY[r.prev]}-c mini">${r.prev.slice(0, 3).toUpperCase()}</span>` : ''}</td></tr>`).join('') + '</tbody>';
  $('rotTable').querySelectorAll('tbody tr').forEach((tr) => {
    const s = tr.dataset.sym;
    tr.onmouseenter = () => { if (!state.pinned && !state.hidden.has(s)) { state.focus = s; refreshFocus(); } };
    tr.onmouseleave = () => { if (!state.pinned && state.focus) { state.focus = null; refreshFocus(); } };
    tr.onclick = (e) => { if (e.target.classList.contains('vis')) return; togglePin(s); };
    tr.onkeydown = (e) => { if (e.key === 'Enter') togglePin(s); };
  });
  $('rotTable').querySelectorAll('input.vis').forEach((cb) => cb.onchange = () => {
    const s = cb.dataset.sym;
    if (cb.checked) state.hidden.delete(s); else { state.hidden.add(s); if (state.pinned === s) state.pinned = null; if (state.focus === s) state.focus = null; }
    renderRRGView();
  });
  restore();
}
// ---------- portafoglio di riferimento (universi con un portafoglio, come 1 · Asset class) ----------
// Spiega contro cosa si confronta: componenti, classi, pesi obiettivo e pesi di oggi
function renderPortfolio() {
  const p = grp().portfolio;
  $('ptfPanel').hidden = !p;
  $('ptfLine').hidden = true;
  if (!p) return;
  const d = ds(), w = p.weights, isPtf = state.benchmark === p.key;
  const syms = Object.keys(w), classes = p.classes && p.classes.length ? p.classes : null;
  const sum = (list, src) => list.reduce((t, s) => t + (src[s] || 0), 0);
  const pw = (v) => fmt(v, Number.isInteger(v) ? 0 : 1) + '%';
  const mix = classes ? classes.map((c) => `${c.name} ${pw(sum(c.tickers, w))}`) : syms.map((s) => `${label(s)} ${pw(w[s])}`);
  if (isPtf) {
    $('ptfLine').innerHTML = `Contro un <b>portafoglio di esempio</b>: ${esc(mix.join(' · '))}. Composizione sotto il grafico.`;
    $('ptfLine').hidden = false;
  }
  $('ptfMeta').textContent = `${syms.length} componenti · ribilanciato a fine mese`;
  $('ptfWhat').innerHTML = isPtf
    ? `Il benchmark è un <b>portafoglio di esempio</b> fatto con le ${syms.length} componenti di questo universo, con i pesi qui sotto. Ogni punto del grafico confronta una componente con il portafoglio intero: a destra del centro la componente è più forte del portafoglio, in alto la sua forza relativa sta migliorando.`
    : `Questo universo è formato dalle componenti di un <b>portafoglio di esempio</b>, ma ora le confronti con <b>${esc(label(state.benchmark))}</b>. <button type="button" class="mini" id="ptfUse">Confronta con il portafoglio</button>`;
  // barre sulla stessa scala: la più lunga è il peso maggiore tra classi e componenti
  const max = Math.max(...syms.map((s) => w[s]), ...(classes ? classes.map((c) => sum(c.tickers, w)) : []));
  const bar = (v, cls = '') => `<span class="wbar${cls}" aria-hidden="true"><i style="width:${Math.max(1.5, (100 * v) / max).toFixed(1)}%"></i></span>`;
  const now = (v) => (v == null ? '—' : fmt(v, 1) + '%');
  const row = (s) => {
    const t = d.tickers[s];
    return `<tr data-sym="${esc(s)}" tabindex="0" class="${focused() === s ? 'sel' : ''}${t ? '' : ' off'}${classes ? ' sub' : ''}">
      <td title="${esc(t ? t.name : s + ': dati mancanti')}"><span class="sym">${esc(label(s))}</span><span class="tk-in">${t ? esc(baseSym(s)) : 'dati mancanti'}</span></td><td class="tk tkcol">${t ? esc(baseSym(s)) : 'dati mancanti'}</td>
      <td class="wcell">${bar(w[s])}<span class="num">${pw(w[s])}</span></td><td class="num r">${now(p.now[s])}</td></tr>`;
  };
  const body = classes
    ? classes.map((c) => `<tr class="cls"><td class="cn">${esc(c.name)}</td><td class="tkcol"></td><td class="wcell">${bar(sum(c.tickers, w), ' strong')}<span class="num">${pw(sum(c.tickers, w))}</span></td><td class="num r">${now(sum(c.tickers, p.now))}</td></tr>` + c.tickers.map(row).join('')).join('')
    : syms.map(row).join('');
  $('ptfTable').innerHTML = `<thead><tr><th>${classes ? 'Classe e componente' : 'Componente'}</th><th class="tkcol">ETF</th><th>Obiettivo</th><th class="r">Oggi</th></tr></thead><tbody>${body}</tbody>`;
  $('ptfFoot').innerHTML = `Pesi indicativi, non una raccomandazione. <b>Obiettivo</b>: il peso ripristinato alla chiusura dell'ultima seduta di ogni mese. <b>Oggi</b>: il peso dopo i movimenti dei prezzi dall'ultimo ribilanciamento (${dIT(p.rebalanced)}).` +
    (p.missing && p.missing.length ? ` Senza ${esc(p.missing.map(label).join(', '))} per dati mancanti: i pesi delle altre componenti sono riproporzionati.` : '');
  // riga: passandoci sopra evidenzia la componente nel grafico, clic o Invio la fissa (come la tabella di rotazione)
  $('ptfTable').querySelectorAll('tbody tr[data-sym]').forEach((tr) => {
    const s = tr.dataset.sym;
    tr.onmouseenter = () => { if (!state.pinned && !state.hidden.has(s) && d.tickers[s]) { state.focus = s; refreshFocus(); } };
    tr.onmouseleave = () => { if (!state.pinned && state.focus) { state.focus = null; refreshFocus(); } };
    tr.onclick = () => { if (d.tickers[s] && s !== state.benchmark) togglePin(s); };
    tr.onkeydown = (e) => { if (e.key === 'Enter') tr.onclick(); };
  });
  if ($('ptfUse')) $('ptfUse').onclick = () => { $('benchSel').value = p.key; $('benchSel').dispatchEvent(new Event('change')); };
}
function renderPerf() {
  const d = ds();
  drawPerf($('perf'), {
    dates: d.dates, closes: Object.fromEntries(Object.entries(d.tickers).map(([s, t]) => [s, t.close])), labels: labelMap(), width: chartWidth($('perf'), 640),
    syms: symbols().filter((s) => !state.hidden.has(s)), bench: state.benchmark, focus: focused(), days: state.perfDays,
    tipEl: $('perfTip'), wrapEl: $('perfWrap'), legendEl: $('perfLegend'),
  });
}
// aggiorna solo ciò che dipende dall'evidenza (più leggero durante l'hover)
function refreshFocus() {
  drawChart();
  const foc = focused();
  for (const id of ['rotTable', 'monTable', 'ptfTable']) $(id).querySelectorAll('tbody tr').forEach((tr) => tr.classList.toggle('sel', tr.dataset.sym === foc));
  renderPerf();
}
function togglePin(s) {
  state.pinned = state.pinned === s ? null : s;
  if (state.pinned) state.hidden.delete(s); // fissare un titolo nascosto lo rimostra
  state.focus = null;
  renderRRGView();
}
function focusSymbol(s) {
  state.hidden.delete(s);
  state.pinned = s; state.focus = null;
  setView('rrg');
}

// Cerca un titolo per ticker (con o senza suffisso di borsa) o etichetta, prima nell'universo aperto;
// poi tra i benchmark (SPY, QQQ, ACWI, Liquidità: { bench: true }); infine per una parola del nome (TESLA, DAX)
function findSymbol(v) {
  const names = Object.keys(state.groups);
  names.sort((a, b) => (a === state.group ? -1 : b === state.group ? 1 : 0));
  const exact = (g, s) => [s, baseSym(s), labelOf(g.ds, s)].some((x) => x.toUpperCase() === v);
  const byName = (g, s) => v.length >= 3 && (g.ds.tickers[s].name || '').toUpperCase().split(/[^A-Z0-9&+-]+/).some((w) => w.startsWith(v));
  const scan = (match, list) => {
    for (const name of names) {
      const g = state.groups[name];
      const sym = list(g).find((s) => g.ds.tickers[s] && match(g, s));
      if (sym) return { group: name, sym };
    }
    return null;
  };
  const bench = scan(exact, (g) => g.benchmarks);
  return scan(exact, (g) => g.tickers) || (bench && { ...bench, bench: true }) || scan(byName, (g) => g.tickers);
}

// Data dei dati globali e ritardo rispetto all'ultima seduta chiusa di Borsa Italiana
function globalFreshness() {
  const g = state.global;
  const lag = MILAN.sessionsBetween(g.asOf, MILAN.expectedSession(new Date(), PUBLISH_EU));
  const badge = lag === 0 ? '' : ` <span class="fresh ${lag === 1 ? 'late' : 'stale'}">${lag} ${lag === 1 ? 'SEDUTA' : 'SEDUTE'} INDIETRO</span>`;
  const n = g.repaired ? g.repaired.length : 0;
  const fixed = n ? ` · <span title="${esc(g.repaired.map((r) => `${r.sym} ${dIT(r.date)}: ${r.from} → ${r.to}`).join('\n'))}">${n} ${n === 1 ? 'prezzo anomalo corretto' : 'prezzi anomali corretti'}</span>` : '';
  return `ETF in euro, dati al ${dIT(g.asOf)}${badge}${fixed}`;
}

// animazione
function stop() {
  if (!state.timer) return;
  clearInterval(state.timer); state.timer = null;
  $('playBtn').textContent = '▶ PLAY';
  if (state.view === 'rrg') renderRRGView();
}
function play() {
  if (state.timer) { stop(); return; }
  if (state.frame >= lastFrame()) state.frame = Math.max(minFrame(), lastFrame() - (state.timeframe === 'weekly' ? 52 : 126));
  $('playBtn').textContent = '❚❚ STOP';
  state.timer = setInterval(() => {
    if (state.frame >= lastFrame()) { stop(); return; }
    state.frame++;
    renderRRGView(true);
  }, state.timeframe === 'weekly' ? 450 : 120);
}
function step(k) {
  stop();
  $('rrgTip').hidden = true;
  state.frame = Math.max(minFrame(), Math.min(lastFrame(), state.frame + k));
  renderRRGView(true);
}

// ---------- navigazione e controlli ----------
function setView(v, silent) {
  state.view = v;
  if (v !== 'rrg') stop();
  document.querySelectorAll('.fnkeys button[data-view]').forEach((b) => {
    const on = b.dataset.view === v;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  for (const id of VIEWS) $('v-' + id).hidden = id !== v;
  $('filters').hidden = v !== 'rrg';
  const hash = v === 'sec' ? '#' + state.bottom.sector() : '#' + v;
  if (!silent || location.hash !== hash) { try { history.replaceState(null, '', hash); } catch { /* cornice che non lo consente */ } }
  renderAll();
}
function segPress(id, attr, value) {
  document.querySelectorAll(`#${id} button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))));
}
function syncControls() {
  $('groupSel').value = state.group;
  fillBenchmarks();
  $('benchSel').value = state.benchmark;
  segPress('tfSeg', 'tf', state.timeframe);
  segPress('formulaSeg', 'formula', state.formula);
  segPress('tailSeg', 'tail', state.tail);
  segPress('scaleSeg', 'scale', state.scale);
  segPress('perfSeg', 'days', state.perfDays);
  segPress('tableSeg', 'mode', state.tableMode);
}
// guida: <dialog> modale (il resto della pagina è inerte); alla chiusura il focus torna a chi l'ha aperta
let helpOpener = null;
const narrow = () => window.innerWidth < 600;
let cmdErrTimer = null;
function setPlaceholder() {
  $('cmd').placeholder = narrow() ? 'Ticker o nome: XLU, ORO, HELP' : 'Comando: un ticker (XLU, NVDA, SWDA), un nome (ORO, TESLA), MON, ROT, BTM, ALRT, HELP · poi Invio';
}
function openHelp(open) {
  const d = $('helpModal');
  if (open && !d.open) { helpOpener = document.activeElement; d.showModal(); $('helpClose').focus(); }
  else if (!open && d.open) d.close();
}

function bind() {
  document.querySelectorAll('.fnkeys button[data-view]').forEach((b) => b.onclick = () => setView(b.dataset.view));
  $('groupSel').onchange = (e) => {
    state.group = e.target.value; store.set('group', state.group);
    state.benchmark = pickBenchmark(state.group);
    state.hidden.clear(); state.pinned = null; state.focus = null;
    syncControls(); recompute(true);
  };
  $('benchSel').onchange = (e) => {
    state.benchmark = e.target.value; store.set('bench.' + state.group, state.benchmark);
    if (state.pinned === state.benchmark) state.pinned = null;
    if (state.focus === state.benchmark) state.focus = null;
    recompute(true);
  };
  const seg = (id, attr, apply) => document.querySelectorAll(`#${id} button`).forEach((b) => b.onclick = () => { apply(b.dataset[attr]); syncControls(); });
  seg('tfSeg', 'tf', (v) => { state.timeframe = v; store.set('timeframe', v); recompute(true); });
  seg('formulaSeg', 'formula', (v) => { state.formula = v; store.set('formula', v); recompute(false); });
  seg('tableSeg', 'mode', (v) => { state.tableMode = v; renderRRGView(); });
  seg('tailSeg', 'tail', (v) => { state.tail = +v; store.set('tail', state.tail); renderAll(); });
  seg('scaleSeg', 'scale', (v) => { state.scale = v; renderAll(); });
  seg('perfSeg', 'days', (v) => { state.perfDays = +v; store.set('perfDays', state.perfDays); renderPerf(); });
  $('frame').oninput = (e) => { stop(); state.frame = +e.target.value; renderRRGView(true); };
  $('playBtn').onclick = play;

  const svg = $('rrg'), tip = $('rrgTip');
  const showTip = (sym, e) => {
    const r = stats(state.model.series[sym], state.frame, state.tail);
    if (!r) { tip.hidden = true; return; }
    tip.innerHTML = `<div class="row"><b>${esc(label(sym))}</b><span>${esc((isGlobal() ? baseSym(sym) + ' · ' : '') + ds().tickers[sym].name)}</span></div>
      <div class="row"><span>Quadrante</span><b class="q-${QKEY[r.q]}-c">${r.q}</b></div>
      <div class="row"><span>RS-Ratio</span><b>${fmt(r.x, 2)}</b></div><div class="row"><span>RS-Momentum</span><b>${fmt(r.y, 2)}</b></div>
      <div class="row"><span>Direzione</span><b>${fmt(r.heading, 0)}°</b></div><div class="row"><span>Nel quadrante da</span><b>${r.weeks} ${unit()}</b></div>`;
    placeTip(tip, $('rrgWrap'), e);
  };
  svg.addEventListener('pointermove', (e) => {
    if (!lastDraw || e.pointerType === 'touch') return;
    const h = nearestHead(svg, lastDraw.heads, e);
    const sym = h ? h.sym : null;
    if (!state.pinned && sym !== state.focus) { state.focus = sym; refreshFocus(); }
    if (!h) { tip.hidden = true; return; }
    showTip(sym, e);
  });
  svg.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    tip.hidden = true;
    if (!state.pinned && state.focus) { state.focus = null; refreshFocus(); }
  });
  // clic o tocco: fissa il punto più vicino (o lo sgancia); sul vuoto sgancia quello fissato
  svg.addEventListener('click', (e) => {
    const h = lastDraw ? nearestHead(svg, lastDraw.heads, e) : null;
    if (h) { togglePin(h.sym); if (state.pinned) showTip(h.sym, e); else tip.hidden = true; }
    else { tip.hidden = true; if (state.pinned) togglePin(state.pinned); }
  });

  $('helpBtn').onclick = () => openHelp(true);
  $('introClose').onclick = () => { $('intro').hidden = true; store.set('introSeen', true); };
  $('introHelp').onclick = () => openHelp(true);
  $('helpClose').onclick = () => openHelp(false);
  // clic sullo sfondo scuro: il bersaglio è il <dialog> ma il punto è fuori dal riquadro
  $('helpModal').addEventListener('click', (e) => {
    if (e.target !== $('helpModal')) return;
    const r = $('helpModal').getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) openHelp(false);
  });
  $('helpModal').addEventListener('close', () => {
    const back = helpOpener && document.contains(helpOpener) && helpOpener !== document.body ? helpOpener : $('helpBtn');
    helpOpener = null;
    back.focus();
  });
  // scorciatoie da un tasto: si possono spegnere (WCAG 2.1.4)
  $('kbToggle').checked = state.shortcuts;
  $('kbToggle').onchange = (e) => { state.shortcuts = e.target.checked; store.set('shortcuts', state.shortcuts); };
  // schede: frecce, Home e Fine spostano il focus e aprono la vista
  document.querySelector('.fnkeys').addEventListener('keydown', (e) => {
    const tabs = [...document.querySelectorAll('.fnkeys [role=tab]')];
    const i = tabs.indexOf(e.target);
    if (i < 0) return;
    const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (k == null) return;
    e.preventDefault(); e.stopPropagation();
    const t = tabs[(k + tabs.length) % tabs.length];
    setView(t.dataset.view);
    t.focus();
  });
  $('cvdBtn').onclick = () => {
    const on = $('term').classList.toggle('cvd');
    $('cvdBtn').setAttribute('aria-pressed', String(on));
    store.set('cvd', on);
  };

  document.addEventListener('keydown', (e) => {
    if ($('helpModal').open) return; // la guida gestisce da sola Esc e il focus
    if (e.key === 'Escape') {
      if (state.pinned || state.focus) { state.pinned = null; state.focus = null; if (state.view === 'rrg') renderRRGView(); }
      return;
    }
    if (!state.shortcuts || e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '?') { openHelp(true); return; }
    if (e.key === '/') { e.preventDefault(); $('cmd').focus(); return; }
    const idx = +e.key - 1;
    if (VIEWS[idx]) { setView(VIEWS[idx]); return; }
    if (state.view === 'rrg') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      // Spazio avvia l'animazione solo se il focus non è su un elemento attivabile (bottone, riga, link)
      if (e.key === ' ' && !e.target.closest('button, a, summary, [tabindex]')) { e.preventDefault(); play(); }
    }
  });

  $('cmdForm').onsubmit = (e) => {
    e.preventDefault();
    const v = $('cmd').value.trim().toUpperCase().replace(/\s*<GO>$|\s+GO$/, '');
    $('cmd').value = '';
    // un nuovo comando toglie l'avviso di quello non trovato
    clearTimeout(cmdErrTimer); $('cmdForm').classList.remove('err'); setPlaceholder();
    const words = { MON: 'mon', MONITOR: 'mon', RRG: 'rrg', ROT: 'rrg', ROTAZIONE: 'rrg', BTM: 'btm', BOTTOM: 'btm', MAP: 'btm', SEC: 'sec', SETTORE: 'sec', ALRT: 'alr', ALERT: 'alr' };
    if (!v) return;
    if (v === 'HELP' || v === 'GUIDA') { openHelp(true); return; }
    if (words[v]) { setView(words[v]); return; }
    if (state.bottom.isSector(v)) { state.bottom.openSector(v); return; }
    const hit = findSymbol(v);
    // cambia universo e benchmark (e li ricorda) solo se serve
    const switchTo = (group, bench) => {
      if (group === state.group && bench === state.benchmark) return;
      state.group = group; store.set('group', group);
      state.benchmark = bench; store.set('bench.' + group, bench);
      state.hidden.clear(); state.pinned = null; state.focus = null;
      syncControls(); recompute(true);
    };
    if (hit && hit.bench) { switchTo(hit.group, hit.sym); setView('rrg'); return; } // un benchmark: la rotazione contro di lui
    if (hit) {
      const g = state.groups[hit.group];
      let b = hit.group === state.group ? state.benchmark : pickBenchmark(hit.group);
      // il titolo cercato è il benchmark: si passa a un altro benchmark per poterlo vedere sul grafico
      if (b === hit.sym) b = [g.defaultBenchmark, ...g.benchmarks].find((x) => x !== hit.sym) || b;
      switchTo(hit.group, b);
      focusSymbol(hit.sym);
      return;
    }
    $('cmd').placeholder = narrow() ? `"${v}" non trovato · prova HELP` : `"${v}" non trovato. Prova un ticker (XLU, SWDA), un nome (ORO, TESLA), MON, ROT o HELP`;
    $('cmdForm').classList.add('err');
    clearTimeout(cmdErrTimer);
    cmdErrTimer = setTimeout(() => { $('cmdForm').classList.remove('err'); setPlaceholder(); }, 4000);
  };
}
