/* app.js — stato, viste (Monitor, RRG, Bottom Map, Settore, Alert), barra comandi e scorciatoie. */
import { build, stats, CENTER } from './engine.js';
import { createBottom } from './bottom.js';
import { priceMetrics } from './metrics.js';
import { drawRRG, nearestHead } from './rrg-chart.js';
import { drawPerf } from './perf-chart.js';
import { expectedSession, sessionsBetween } from './calendar.js';
import { esc, fmt, sgn, pct, dIT, arrow, qPill, QKEY } from './format.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['mon', 'rrg', 'btm', 'sec', 'alr'];
const QORDER = { Improving: 0, Leading: 1, Weakening: 2, Lagging: 3 };

// preferenze del singolo browser (se lo storage non è disponibile si usano i default)
const store = {
  get(k, d) { try { const v = localStorage.getItem('sm.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sm.' + k, JSON.stringify(v)); } catch { /* ignorato */ } },
};

const state = {
  data: null, view: 'mon',
  group: null, benchmark: null, timeframe: store.get('timeframe', 'weekly'), formula: store.get('formula', 'nuova'),
  tail: store.get('tail', 10), scale: 'fit', perfDays: store.get('perfDays', 126),
  frame: 0, focus: null, pinned: null, hidden: new Set(), timer: null,
  sort: { key: 'rot', dir: 1 }, tableMode: 'rot',
  model: null, modelKey: '', metrics: {}, bottom: null, sectorModels: {},
};

// ---------- avvio ----------
const getJSON = (url, optional) => fetch(url).then((r) => {
  if (r.ok) return r.json();
  if (optional) return null;
  throw new Error(`${url}: HTTP ${r.status}`);
}).catch((e) => { if (optional) return null; throw e; });

Promise.all([
  getJSON('data/prices.json'), getJSON('data/sectors.json'), getJSON('data/breadth.json'), getJSON('config/thresholds.json'),
  getJSON('data/breadth_latest.json', true), getJSON('data/alerts.json', true),
]).then(([prices, sectors, breadth, config, latest, alertLog]) => {
  state.data = prices;
  state.extra = { sectors, breadth, config, latest, alertLog };
  init();
}).catch((e) => {
  $('v-mon').innerHTML = `<div class="panel"><div class="pb"><p class="note">Impossibile caricare i dati (${esc(e.message)}). In locale esegui gli script in <span class="mono">scripts/</span> e servi la cartella con un server statico.</p></div></div>`;
});

function init() {
  const d = state.data;
  const groups = Object.keys(d.groups);
  state.group = groups.includes(store.get('group')) ? store.get('group') : groups[0];
  $('groupSel').innerHTML = groups.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  $('benchSel').innerHTML = Object.entries(d.benchmarks).map(([s, n]) => `<option value="${esc(s)}">${esc(s)} · ${esc(n)}</option>`).join('');
  const savedBench = store.get('bench.' + state.group);
  state.benchmark = savedBench && d.tickers[savedBench] ? savedBench : d.groups[state.group].defaultBenchmark;
  for (const s of Object.keys(d.tickers)) state.metrics[s] = priceMetrics(d.dates, d.tickers[s].close);
  if (store.get('cvd', false)) { $('term').classList.add('cvd'); $('cvdBtn').setAttribute('aria-pressed', 'true'); }
  const x = state.extra;
  state.bottom = createBottom({
    $, sectors: x.sectors, breadth: x.breadth, latest: x.latest, config: x.config, alertLog: x.alertLog, store,
    rotation: sectorRotation, setView: (v) => setView(v), openRRG: focusSymbol,
  });
  renderHeader();
  bind();
  state.bottom.bind();
  syncControls();
  recompute(true);
  routeHash(true);
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
    state.sectorModels[key] = group ? build(state.data, { symbols: state.data.groups[group].tickers, benchmark: 'SPY', timeframe: 'weekly', formula: key }) : null;
  }
  const m = state.sectorModels[key];
  return m && m.series[s] ? stats(m.series[s], m.dates.length - 1, 10) : null;
}

function renderHeader() {
  const d = state.data;
  const asOf = d.asOf || d.dates[d.dates.length - 1];
  const lag = sessionsBetween(asOf, expectedSession());
  const badge = lag === 0 ? '<span class="fresh ok">AGGIORNATO</span>' : `<span class="fresh ${lag === 1 ? 'late' : 'stale'}">${lag} ${lag === 1 ? 'SEDUTA' : 'SEDUTE'} INDIETRO</span>`;
  $('clock').innerHTML = `EOD <b>${dIT(asOf)}</b> ${badge}`;
  $('genLine').textContent = `generato ${new Date(d.generated).toLocaleString('it-IT')}`;
}

// ---------- modello ----------
function symbols() {
  return state.data.groups[state.group].tickers.filter((s) => state.data.tickers[s] && s !== state.benchmark);
}
function recompute(resetFrame) {
  const key = [state.group, state.benchmark, state.timeframe, state.formula].join('|');
  if (key !== state.modelKey) {
    state.model = build(state.data, { symbols: symbols(), benchmark: state.benchmark, timeframe: state.timeframe, formula: state.formula });
    state.modelKey = key;
    state.maxRange = null;
    resetFrame = true;
  }
  const last = state.model.dates.length - 1;
  if (resetFrame || state.frame > last) state.frame = last;
  state.frame = Math.max(minFrame(), state.frame);
  renderAll();
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
  const m = state.model, f = lastFrame();
  return symbols().map((s) => ({ s, name: state.data.tickers[s].name, mt: state.metrics[s], r: m.series[s] ? stats(m.series[s], f, state.tail) : null }));
}
const SORTERS = {
  sym: (a, b) => a.s.localeCompare(b.s),
  last: (a, b) => a.mt.last - b.mt.last,
  d1: (a, b) => a.mt.d1 - b.mt.d1, w1: (a, b) => a.mt.w1 - b.mt.w1, m1: (a, b) => a.mt.m1 - b.mt.m1,
  m3: (a, b) => a.mt.m3 - b.mt.m3, ytd: (a, b) => a.mt.ytd - b.mt.ytd,
  dd: (a, b) => a.mt.dd52 - b.mt.dd52, vs200: (a, b) => a.mt.vs200 - b.mt.vs200,
  rot: (a, b) => (a.r && b.r ? QORDER[a.r.q] - QORDER[b.r.q] || b.r.dist - a.r.dist : 0),
  weeks: (a, b) => (a.r && b.r ? a.r.weeks - b.r.weeks : 0),
};
function renderPriceTable() {
  const d = state.data, bench = state.benchmark, bm = state.metrics[bench];
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
  const body = rows.map(({ s, name, mt, r }) => `<tr data-sym="${esc(s)}" tabindex="0">
      <td><span class="sym">${esc(s)}</span><span class="nm">${esc(name)}</span></td>
      <td class="num r">${fmt(mt.last, 2)}</td><td class="num r">${pct(mt.d1)}</td><td class="num r">${pct(mt.w1)}</td><td class="num r">${pct(mt.m1)}</td><td class="num r">${pct(mt.m3)}</td><td class="num r">${pct(mt.ytd)}</td>
      <td>${ddCell(mt)}</td><td class="num r">${pct(mt.vs200)}</td>
      <td>${r ? qPill(r.q, r.heading) : '<span class="muted">—</span>'}</td><td class="num r">${r ? `${r.weeks} ${unit()}` : '—'}</td></tr>`).join('');
  const benchRow = `<tr class="bench"><td><span class="sym">${esc(bench)}</span><span class="nm">${esc(d.tickers[bench].name)} · benchmark</span></td>
      <td class="num r">${fmt(bm.last, 2)}</td><td class="num r">${pct(bm.d1)}</td><td class="num r">${pct(bm.w1)}</td><td class="num r">${pct(bm.m1)}</td><td class="num r">${pct(bm.m3)}</td><td class="num r">${pct(bm.ytd)}</td>
      <td>${ddCell(bm)}</td><td class="num r">${pct(bm.vs200)}</td><td></td><td></td></tr>`;
  $('monTable').innerHTML = head + '<tbody>' + body + benchRow + '</tbody>';
  $('monTable').querySelectorAll('th button').forEach((b) => b.onclick = () => {
    const k = b.dataset.sort;
    state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === 'sym' || k === 'rot' ? 1 : -1) };
    renderPriceTable();
  });
  $('monTable').querySelectorAll('tbody tr[data-sym]').forEach((tr) => {
    const go = () => togglePin(tr.dataset.sym);
    tr.onclick = go;
    tr.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  });
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
const focused = () => state.pinned || state.focus;
function drawChart() {
  lastDraw = drawRRG($('rrg'), {
    syms: symbols().filter((s) => !state.hidden.has(s)), series: state.model.series, frame: state.frame, tail: state.tail,
    focus: focused(), range: state.scale === 'max' || state.timer ? maxRange() : fitRange(), provisional: isProvisional(),
  });
}
function renderRRGView() {
  drawChart();
  const m = state.model;
  $('rrgTitle').textContent = `Rotazione relativa · ${state.group} vs ${state.benchmark}`;
  $('rrgMeta').textContent = `${state.timeframe === 'weekly' ? 'settimanale' : 'giornaliero'} · formula ${state.formula}`;
  const fr = $('frame');
  fr.min = minFrame(); fr.max = lastFrame(); fr.value = state.frame;
  $('frameDate').textContent = dIT(m.dates[state.frame]) + (isProvisional() ? ' *' : '');
  $('provNote').hidden = !isProvisional();
  const px = state.tableMode === 'px';
  $('rotWrap').hidden = px; $('rotNote').hidden = px; $('pxWrap').hidden = !px; $('pxNote').hidden = !px;
  $('tableTitle').textContent = px ? `Prezzi · ${state.group}` : 'Tabella di rotazione';
  if (px) renderPriceTable(); else renderRotTable();
  renderPerf();
}
function renderRotTable() {
  const f = state.frame, foc = focused();
  const rows = symbols().filter((s) => state.model.series[s]).map((s) => ({ s, r: stats(state.model.series[s], f, state.tail) })).filter((x) => x.r)
    .sort((a, b) => QORDER[a.r.q] - QORDER[b.r.q] || b.r.dist - a.r.dist);
  $('rotMeta').textContent = `${dIT(state.model.dates[f])}${isProvisional() ? ' (in corso)' : ''}`;
  const dl = (v) => `<span class="dlt ${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${v > 0 ? '▲' : v < 0 ? '▼' : ''}${fmt(Math.abs(v), 2)}</span>`;
  $('rotTable').innerHTML = `<thead><tr><th><span class="sr">Mostra</span></th><th>Titolo</th><th>Quadrante</th><th class="r">RS-Ratio</th><th class="r">RS-Mom</th><th class="r">Direz.</th><th class="r">Vel.</th><th class="r">Dist.</th><th class="r">${unit()}</th><th>Prima</th></tr></thead><tbody>` +
    rows.map(({ s, r }) => `<tr data-sym="${esc(s)}" class="${foc === s ? 'sel' : ''}${state.hidden.has(s) ? ' off' : ''}" tabindex="0">
      <td><input type="checkbox" class="vis" data-sym="${esc(s)}" aria-label="Mostra ${esc(s)}" ${state.hidden.has(s) ? '' : 'checked'}></td>
      <td title="${esc(state.data.tickers[s].name)}"><span class="sym">${esc(s)}</span></td>
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
}
function renderPerf() {
  drawPerf($('perf'), {
    dates: state.data.dates, closes: Object.fromEntries(Object.entries(state.data.tickers).map(([s, t]) => [s, t.close])),
    syms: symbols().filter((s) => !state.hidden.has(s)), bench: state.benchmark, focus: focused(), days: state.perfDays,
    tipEl: $('perfTip'), wrapEl: $('perfWrap'), legendEl: $('perfLegend'),
  });
}
// aggiorna solo ciò che dipende dall'evidenza (più leggero durante l'hover)
function refreshFocus() {
  drawChart();
  const foc = focused();
  for (const id of ['rotTable', 'monTable']) $(id).querySelectorAll('tbody tr').forEach((tr) => tr.classList.toggle('sel', tr.dataset.sym === foc));
  renderPerf();
}
function togglePin(s) {
  state.pinned = state.pinned === s ? null : s;
  state.focus = null;
  renderRRGView();
}
function focusSymbol(s) {
  state.hidden.delete(s);
  state.pinned = s; state.focus = null;
  setView('rrg');
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
    drawChart();
    $('frame').value = state.frame;
    $('frameDate').textContent = dIT(state.model.dates[state.frame]);
  }, state.timeframe === 'weekly' ? 450 : 120);
}
function step(k) {
  stop();
  state.frame = Math.max(minFrame(), Math.min(lastFrame(), state.frame + k));
  renderRRGView();
}

// ---------- navigazione e controlli ----------
function setView(v, silent) {
  state.view = v;
  if (v !== 'rrg') stop();
  document.querySelectorAll('.fnkeys button[data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  for (const id of VIEWS) $('v-' + id).hidden = id !== v;
  $('filters').hidden = v !== 'rrg';
  const hash = v === 'sec' ? '#' + store.get('sector', 'XLU') : '#' + v;
  if (!silent || location.hash !== hash) { try { history.replaceState(null, '', hash); } catch { /* cornice che non lo consente */ } }
  renderAll();
}
function segPress(id, attr, value) {
  document.querySelectorAll(`#${id} button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))));
}
function syncControls() {
  $('groupSel').value = state.group;
  $('benchSel').value = state.benchmark;
  segPress('tfSeg', 'tf', state.timeframe);
  segPress('formulaSeg', 'formula', state.formula);
  segPress('tailSeg', 'tail', state.tail);
  segPress('scaleSeg', 'scale', state.scale);
  segPress('perfSeg', 'days', state.perfDays);
  segPress('tableSeg', 'mode', state.tableMode);
}
function openHelp(open) { $('helpModal').hidden = !open; if (open) $('helpClose').focus(); }

function bind() {
  document.querySelectorAll('.fnkeys button[data-view]').forEach((b) => b.onclick = () => setView(b.dataset.view));
  $('groupSel').onchange = (e) => {
    state.group = e.target.value; store.set('group', state.group);
    const saved = store.get('bench.' + state.group);
    state.benchmark = saved && state.data.tickers[saved] ? saved : state.data.groups[state.group].defaultBenchmark;
    state.hidden.clear(); state.pinned = null; state.focus = null;
    syncControls(); recompute(true);
  };
  $('benchSel').onchange = (e) => { state.benchmark = e.target.value; store.set('bench.' + state.group, state.benchmark); recompute(true); };
  const seg = (id, attr, apply) => document.querySelectorAll(`#${id} button`).forEach((b) => b.onclick = () => { apply(b.dataset[attr]); syncControls(); });
  seg('tfSeg', 'tf', (v) => { state.timeframe = v; store.set('timeframe', v); recompute(true); });
  seg('formulaSeg', 'formula', (v) => { state.formula = v; store.set('formula', v); recompute(false); });
  seg('tableSeg', 'mode', (v) => { state.tableMode = v; renderRRGView(); });
  seg('tailSeg', 'tail', (v) => { state.tail = +v; store.set('tail', state.tail); renderAll(); });
  seg('scaleSeg', 'scale', (v) => { state.scale = v; renderAll(); });
  seg('perfSeg', 'days', (v) => { state.perfDays = +v; store.set('perfDays', state.perfDays); renderPerf(); });
  $('frame').oninput = (e) => { stop(); state.frame = +e.target.value; renderRRGView(); };
  $('playBtn').onclick = play;

  const svg = $('rrg'), tip = $('rrgTip');
  svg.addEventListener('pointermove', (e) => {
    if (!lastDraw) return;
    const h = nearestHead(svg, lastDraw.heads, e);
    const sym = h ? h.sym : null;
    if (!state.pinned && sym !== state.focus) { state.focus = sym; refreshFocus(); }
    if (!h) { tip.hidden = true; return; }
    const r = stats(state.model.series[sym], state.frame, state.tail);
    tip.innerHTML = `<div class="row"><b>${esc(sym)}</b><span>${esc(state.data.tickers[sym].name)}</span></div>
      <div class="row"><span>Quadrante</span><b class="q-${QKEY[r.q]}-c">${r.q}</b></div>
      <div class="row"><span>RS-Ratio</span><b>${fmt(r.x, 2)}</b></div><div class="row"><span>RS-Momentum</span><b>${fmt(r.y, 2)}</b></div>
      <div class="row"><span>Direzione</span><b>${fmt(r.heading, 0)}°</b></div><div class="row"><span>Nel quadrante da</span><b>${r.weeks} ${unit()}</b></div>`;
    const wr = $('rrgWrap').getBoundingClientRect();
    let x = e.clientX - wr.left + 14;
    if (x + 210 > wr.width) x = e.clientX - wr.left - 220;
    tip.style.left = x + 'px'; tip.style.top = (e.clientY - wr.top + 14) + 'px'; tip.hidden = false;
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; if (!state.pinned && state.focus) { state.focus = null; refreshFocus(); } });
  svg.addEventListener('click', () => { if (state.focus) togglePin(state.focus); else if (state.pinned) togglePin(state.pinned); });

  $('helpBtn').onclick = () => openHelp(true);
  $('helpClose').onclick = () => openHelp(false);
  $('helpModal').onclick = (e) => { if (e.target.id === 'helpModal') openHelp(false); };
  $('cvdBtn').onclick = () => {
    const on = $('term').classList.toggle('cvd');
    $('cvdBtn').setAttribute('aria-pressed', String(on));
    store.set('cvd', on);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('helpModal').hidden) { openHelp(false); return; }
      if (state.pinned || state.focus) { state.pinned = null; state.focus = null; if (state.view === 'rrg') renderRRGView(); }
      return;
    }
    if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '?') { openHelp(true); return; }
    if (e.key === '/') { e.preventDefault(); $('cmd').focus(); return; }
    const idx = +e.key - 1;
    if (VIEWS[idx]) { setView(VIEWS[idx]); return; }
    if (state.view === 'rrg') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); play(); }
    }
  });

  $('cmdForm').onsubmit = (e) => {
    e.preventDefault();
    const v = $('cmd').value.trim().toUpperCase().replace(/\s*<?GO>?$/, '');
    $('cmd').value = '';
    const words = { MON: 'mon', MONITOR: 'mon', RRG: 'rrg', ROT: 'rrg', BTM: 'btm', BOTTOM: 'btm', MAP: 'btm', SEC: 'sec', SETTORE: 'sec', ALRT: 'alr', ALERT: 'alr' };
    if (!v) return;
    if (v === 'HELP' || v === 'GUIDA') { openHelp(true); return; }
    if (words[v]) { setView(words[v]); return; }
    if (state.bottom.isSector(v)) { state.bottom.openSector(v); return; }
    if (symbols().includes(v)) { focusSymbol(v); return; }
    const g = Object.keys(state.data.groups).find((k) => state.data.groups[k].tickers.includes(v));
    if (g) {
      state.group = g; $('groupSel').value = g;
      state.benchmark = state.data.groups[g].defaultBenchmark;
      state.hidden.clear(); syncControls(); recompute(true); focusSymbol(v);
      return;
    }
    $('cmd').placeholder = `"${v}" non riconosciuto. Prova un ticker (es. XLU), MON, RRG o HELP`;
  };
}
