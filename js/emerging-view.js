/*
 * emerging-view.js — vista 7 «Emergenti»: solo contesto (decisione dell'utente del 05/11/2026). Per i 7 indici emergenti
 * della vista 6 mostra lo stato della macchina e la breadth letti dalla vista 6 (stessa fonte, stessi livelli blu), la
 * valuta locale contro il dollaro, il dollaro contro le valute emergenti (FRED) e la forza relativa dell'ETF del paese
 * contro ACWI. Nessuna regola, nessun alert. Calcoli in emerging.js; dati in data/emerging.json (scaricato alla prima
 * apertura) e config/emerging.json.
 */
import { badge, apprBadge } from './bottom.js';
import { emSeries, cleanFx, plain, fxSignals, fxState, dollarSignals, onDates, inUsd, change, relStrength } from './emerging.js';
import { esc, fmt, sgnP, pct, dIT, qPill, placeTip, bindTip, chartWidth, keepFocus, syncX, emitX } from './format.js';
import { STATES } from './signals.js';
import { zoomGroup, timeTicks } from './zoom.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const DAY = 86400000;
const FXL = { calo: 'In calo forte', ferma: 'Ha smesso di scendere', normale: 'Normale', agganciato: 'Agganciato', dollari: 'In dollari' };
const FXT = {
  calo: 'La valuta ha perso molto contro il dollaro nelle ultime 13 settimane (variazione oltre 1 deviazione standard delle sue variazioni a 13 settimane negli ultimi 3 anni).',
  ferma: 'Dopo un calo forte negli ultimi 6 mesi, il cambio è sceso di almeno mezza deviazione standard dal massimo delle ultime 13 settimane: la valuta ha smesso di scendere. Nel campione (cali oltre il 25% dal massimo storico) si era già accesa nei sei mesi prima del minimo in 15 cali su 17, e poi la borsa era scesa ancora: non è un segnale d\'ingresso.',
  normale: 'La valuta oggi non è in calo forte (variazione in 13 settimane sotto 1 deviazione standard) e non ha smesso di scendere dopo un calo forte.',
  agganciato: 'Il dollaro di Hong Kong è agganciato al dollaro americano (il cambio può muoversi solo tra 7,75 e 7,85): non dà informazioni.',
  dollari: 'EEM è quotato in dollari: per lui conta il dollaro contro le valute emergenti.',
};
const short = (name) => name.replace(/ \(.*\)/, '');

/**
 * @param {{$: Function, store: object, indices: object, config: object, load: () => Promise<object>, openIndex: (k: string) => void,
 *          onSelect: (k: string) => void}} ctx  indices: API della vista 6 (ensureAll, snapshot, onChange)
 */
export function createEmerging(ctx) {
  const { $, store, indices } = ctx;
  const CFG = ctx.config.indices, KEYS = ctx.config.order.filter((k) => CFG[k] && indices.isIndex(k));
  let data = null, loading = null, failed = null, model = null, zoom = null;
  const st = { sel: KEYS.includes(store.get('emSel')) ? store.get('emSel') : KEYS[0], range: ['3A', '10A', 'MAX'].includes(store.get('emRange')) ? store.get('emRange') : '3A' };

  function ensure() {
    if (!loading) {
      $('emLoading').hidden = false;
      loading = Promise.all([indices.ensureAll().catch(() => null), ctx.load()])
        .then(([, d]) => { data = d; })
        .catch((e) => { failed = e; })
        .finally(() => { $('emLoading').hidden = true; });
    }
    return loading;
  }

  // serie e indicatori (una volta per file; lo stato della macchina si rilegge a ogni disegno dalla vista 6)
  function build() {
    const S = (sym) => (data && data.series[sym] ? emSeries(data.series[sym]) : null);
    const dl = S(ctx.config.fred);
    const dollar = dl ? { S: plain(ctx.config.fred, dl) } : null;
    if (dollar) Object.assign(dollar, dollarSignals(dollar.S));
    const acwi = S(ctx.config.benchmark);
    const fx = {}, rs = {};
    for (const k of KEYS) {
      const c = CFG[k];
      if (c.fx) { const raw = S(c.fx); if (raw) { const C = cleanFx(c.fx, raw); fx[k] = { S: C, ...fxSignals(C) }; } }
      rs[k] = relStrength(S(c.etf), acwi);
    }
    return { dollar, fx, rs };
  }

  // riga del tabellone e dati del dettaglio di un indice, alla sua ultima seduta
  function row(k) {
    const snap = indices.snapshot(k);
    if (!snap) return { k, missing: true };
    // «3 mesi in $» alla stessa seduta di «3 mesi locale»: se quel giorno manca il cambio, «—» (non il giorno prima in silenzio)
    // (la sera le borse asiatiche hanno già la seduta di oggi e il cambio di oggi non c'è ancora): allora si usa l'ultima seduta
    // con il cambio, e la colonna lo dice con l'asterisco e la data
    const chUsd = (cl, u) => { let t = cl.length - 1; while (t >= 0 && cl[t] == null) t--; const tl = t; while (t >= 0 && u[t] == null) t--; return t < 0 ? null : { v: change(u, 63, t), t, lag: t < tl }; };
    const c = CFG[k], f = model.fx[k], last = snap.close.length - 1;
    const fxOn = f ? onDates(f.S.dates, f.S.val, snap.dates) : null;
    const usd = c.fx === null ? snap.close : fxOn ? inUsd(snap.close, fxOn) : null;
    const cu = usd ? chUsd(snap.close, usd) : null;
    let fxs;
    if (c.peg) fxs = { state: 'agganciato' };
    else if (!c.fx) fxs = { state: 'dollari' };
    else if (!f) fxs = { state: null };
    else { const j = f.S.dates.length - 1; fxs = { state: fxState(f.F[j], f.z[j]), z: f.z[j], date: f.S.dates[j], value: f.S.val[j], fred: f.S.fred }; }
    return { k, snap, name: snap.name, state: snap.state, appr: snap.appr, b: snap.pct200[snap.now], L: snap.blue, changed: snap.changed, blueSource: snap.blueSource, dd: snap.dd[last],
      // le due colonne alla stessa seduta: senza il cambio di oggi anche «locale» si ferma all'ultima seduta con il cambio
      ch63: cu && cu.lag ? change(snap.close, 63, cu.t) : change(snap.close, 63), ch63u: cu, fx: fxs, rs: model.rs[k], usd, last, date: snap.dates[last] };
  }

  async function render() {
    await ensure();
    if (failed && !data) { $('emLoading').hidden = false; $('emLoading').textContent = `Dati della vista Emergenti non disponibili (${failed.message}). Gli stati degli indici restano nella vista 6.`; return; }
    if (!model) model = build();
    $('emBody').hidden = false;
    const rows = KEYS.map(row);
    if (!rows.some((r) => !r.missing)) { $('emLoading').hidden = false; $('emLoading').textContent = 'Dati degli indici non disponibili: la vista Emergenti usa gli stati della vista 6.'; $('emBody').hidden = true; return; }
    if (!KEYS.includes(st.sel) || rows.find((r) => r.k === st.sel).missing) st.sel = rows.find((r) => !r.missing).k;
    renderKpis(rows);
    renderTable(rows);
    renderDetail(rows.find((r) => r.k === st.sel));
    renderRS(rows);
  }

  // ---------- riquadri ----------
  function renderKpis(rows) {
    const ok = rows.filter((r) => !r.missing), withFx = ok.filter((r) => CFG[r.k].fx && !CFG[r.k].peg);
    const dl = model.dollar, j = dl ? dl.S.val.length - 1 : -1;
    const by = (fn) => ok.filter(fn);
    const names = (a) => a.map((r) => r.k).join(' · ') || 'nessuno';
    const fxWith = withFx.filter((r) => r.fx.state != null);
    const dollarK = dl
      ? [`${fmt(dl.S.val[j], 1)}`, `${dl.sma[j] == null ? 'media 200 —' : dl.S.val[j] > dl.sma[j] ? 'sopra la media 200' : 'sotto la media 200'} · ${sgnP(dl.ch[j])} in 3 mesi · ${dl.D[j] == null ? '—' : dl.D[j] ? 'favorevole' : 'non favorevole'} · FRED al ${dIT(dl.S.dates[j])}`]
      : ['—', 'FRED non disponibile'];
    $('emKpis').innerHTML = [
      ['Dollaro contro emergenti', ...dollarK, 'Indice della Federal Reserve del dollaro contro le valute emergenti (FRED DTWEXEMEGS). «Favorevole»: sotto la media a 200 sedute e in calo in 3 mesi. Esce una volta alla settimana: conta la data.'],
      ['Emergenti in zona blu', `${by((r) => r.state === 'setup' || r.state === 'fail').length}<small> / ${ok.length}</small>`, names(by((r) => r.state === 'setup' || r.state === 'fail')), 'Stato della vista 6 (breadth contro il livello blu): Zona blu e Fallito, come nella vista 6.'],
      ['In attenzione', `${by((r) => r.state === 'watch').length}<small> / ${ok.length}</small>`, names(by((r) => r.state === 'watch')), 'Stato della vista 6.'],
      ['Valute in calo forte', `${fxWith.filter((r) => r.fx.state === 'calo').length}<small> / ${fxWith.length} con dati</small>`, names(fxWith.filter((r) => r.fx.state === 'calo')), FXT.calo],
      ['Valute che hanno smesso di scendere', `${fxWith.filter((r) => r.fx.state === 'ferma').length}<small> / ${fxWith.length} con dati</small>`, names(fxWith.filter((r) => r.fx.state === 'ferma')), FXT.ferma],
    ].map(([k, v, s, t]) => `<div class="kpi" title="${esc(t)}"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');
  }

  // ---------- tabellone ----------
  function fxCell(f) {
    if (f.state === 'agganciato' || f.state === 'dollari') return `<span class="fxp fx-na" title="${esc(FXT[f.state])}">${FXL[f.state]}</span>`;
    if (f.state == null) return '<span class="muted" title="cambio non disponibile o storia troppo corta">—</span>';
    const z = Math.max(-2.5, Math.min(2.5, f.z)), left = 50 + Math.min(0, z) * 20, w = Math.abs(z) * 20;
    return `<span class="fxp fx-${f.state}" title="${esc(FXT[f.state])}">${FXL[f.state]}</span><span class="zbar" title="${esc(`variazione del cambio in 13 settimane in deviazioni standard: ${fmt(f.z, 2)} (a destra = valuta più debole; tacca = soglia 1) · cambio ${fmt(f.value, f.value < 10 ? 4 : 2)} al ${dIT(f.date)}${f.fred && f.date > f.fred ? ' (Yahoo, provvisorio)' : ''}`)}"><b></b><span class="thr"></span><i style="left:${left}%;width:${w}%"></i></span>`;
  }
  function renderTable(rows) {
    const ok = rows.filter((r) => !r.missing);
    const dates = [...new Set(ok.map((r) => r.date))].sort();
    $('emMeta').textContent = (dates.length > 1 ? `ultima seduta di ogni borsa, dal ${dIT(dates[0])} al ${dIT(dates.at(-1))}` : `dati al ${dIT(dates[0])}`) + ` · cambi al ${dIT(data.asOf.fx)} · ETF al ${dIT(data.asOf.etf)}`;
    const miss = rows.filter((r) => r.missing).map((r) => r.k);
    $('emMiss').hidden = !miss.length;
    $('emMiss').textContent = miss.length ? `Senza dati della vista 6: ${miss.join(', ')}${indices.moreFailed() ? ' (file degli altri indici non arrivato)' : ''}.` : '';
    const html = `<thead><tr><th>Indice</th><th>Stato</th><th class="wrap-l">% titoli sopra media 200</th><th class="r">Blu</th><th class="r wrap">Drawdown<br>da max 52s</th><th>Valuta contro dollaro</th><th class="r wrap">3 mesi<br>locale</th><th class="r wrap">3 mesi<br>in $</th><th class="wrap">Forza rel.<br>vs ACWI</th></tr></thead><tbody>` +
      ok.map((r) => `<tr data-em="${r.k}" tabindex="0" class="${r.k === st.sel ? 'sel' : ''}">
        <td class="c-name"><span class="sym">${r.k}</span><span class="nm">${esc(short(r.name))}</span></td>
        <td class="c-state">${r.appr ? apprBadge() : badge(r.state)}</td>
        <td class="c-br" data-l="breadth"><span class="cellv num">${fmt(r.b)}%</span><span class="bullet${r.b <= r.L ? ' below' : ''}"><span class="zone" style="width:${r.L}%"></span><i style="width:${Math.max(1, r.b || 0)}%"></i><span class="tick" style="left:calc(${r.L}% - 1px)"></span></span></td>
        <td class="num r c-blue" data-l="blu" title="${esc(r.changed ? 'modificato in questo browser (vista 6)' : r.blueSource === 'Rea' ? 'livello di default dai grafici di Massimo Rea (quant-rea)' : 'livello di default: 3° percentile della storia della breadth dell\'indice')}">${r.L}%${r.changed ? '<span class="loc" title="modificato in questo browser (vista 6)">*</span>' : ''}</td>
        <td class="num r c-dd" data-l="drawdown">${pct(r.dd)}</td>
        <td class="c-fx" data-l="valuta">${fxCell(r.fx)}</td>
        <td class="num r c-m3" data-l="3 mesi" title="${esc((CFG[r.k].fx ? 'variazione in 63 sedute dell\'indice in valuta locale' : 'variazione in 63 sedute (EEM è in dollari)') + (r.ch63u && r.ch63u.lag ? `; al ${dIT(r.snap.dates[r.ch63u.t])}, come la colonna in $ (il cambio di oggi non è ancora arrivato)` : ''))}">${pct(r.ch63)}${r.ch63u && r.ch63u.lag ? '<span class="loc">*</span>' : ''}</td>
        <td class="num r c-m3u" data-l="in $" title="${esc((CFG[r.k].fx === null ? 'EEM è già in dollari' : `indice diviso per il cambio ${CFG[r.k].fx} dello stesso giorno`) + (r.ch63u && r.ch63u.lag ? `; al ${dIT(r.snap.dates[r.ch63u.t])}, l'ultima seduta con il cambio (quello di oggi non è ancora arrivato)` : ''))}">${r.ch63u ? pct(r.ch63u.v) : pct(null)}${r.ch63u && r.ch63u.lag ? `<span class="loc">*</span>` : ''}</td>
        <td class="c-rs" data-l="forza rel. vs ACWI" title="${esc(r.rs ? `${CFG[r.k].etf} contro ACWI, settimanale, al ${dIT(r.rs.last)}` : 'storia non disponibile')}">${r.rs && r.rs.quad ? qPill(r.rs.quad) : '<span class="muted">—</span>'}</td></tr>`).join('') + '</tbody>';
    keepFocus($('emTable'), 'data-em', html);
    $('emTable').querySelectorAll('tbody tr[data-em]').forEach((tr) => {
      tr.onclick = () => select(tr.dataset.em, true);
      tr.onkeydown = (e) => { if (e.key === 'Enter') select(tr.dataset.em, true); };
    });
  }
  function select(k, scroll = false, focusDot = false) {
    if (!KEYS.includes(k)) return;
    st.sel = k; store.set('emSel', k);
    if (ctx.onSelect) ctx.onSelect(k);
    // dalla tastiera sul quadrante il focus torna sul punto ridisegnato
    render().then(() => { if (focusDot) { const d = $('emRS').querySelector(`[data-em="${k}"]`); if (d) d.focus(); } });
    // a una colonna (sotto 1100 px) il dettaglio è sotto il tabellone: ci si porta lì, come nella vista 6
    if (scroll && window.matchMedia('(max-width: 1279px)').matches) $('emTitle').closest('.panel').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // ---------- dettaglio: quattro pannelli con lo stesso asse del tempo ----------
  function renderDetail(r) {
    const k = r.k, snap = r.snap, c = CFG[k];
    $('emTitle').textContent = `${k} · ${short(r.name)}`;
    $('emDMeta').textContent = `breadth ${fmt(r.b)}% · livello blu ${r.L}% · dati al ${dIT(r.date)}`;
    $('emState').innerHTML = r.appr ? apprBadge() : badge(r.state);
    document.querySelectorAll('#emRange button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.range === st.range)));
    $('emOpenIx').textContent = `Apri ${k} nella vista 6 →`;
    drawChart(r);
    const notes = [];
    if (c.managed) notes.push(`Il cambio ${c.ccy} è gestito dalla banca centrale e si muove poco: z si misura sulla volatilità della valuta stessa, quindi anche un movimento piccolo può dare «in calo forte».`);
    if (c.peg) notes.push(FXT.agganciato);
    if (!c.fx) notes.push(FXT.dollari);
    const f = model.fx[k];
    if (f && f.S.removed.length) notes.push(`${f.S.removed.length} ${f.S.removed.length === 1 ? 'seduta del cambio tolta' : 'sedute del cambio tolte'} negli ultimi giorni di Yahoo come probabili errori di stampa (salto che si annulla il giorno dopo): lì ${c.peg ? 'l\'indice in dollari' : 'il cambio'} è «—».`);
    notes.push(`Forza relativa con ${c.etf} (ETF in dollari, dividendi inclusi) contro ACWI.`);
    $('emNotes').innerHTML = notes.map((x) => `<li>${esc(x)}</li>`).join('');
  }

  function drawChart(r) {
    const svg = $('emChart'), snap = r.snap, k = r.k, c = CFG[k];
    svg.innerHTML = '';
    const W = chartWidth(svg, 940), L = 8, R = 56, PW = W - L - R, narrow = PW < 440;
    const dates = snap.dates, n = dates.length, tEnd = Date.parse(dates[n - 1]);
    const span = st.range === '3A' ? 3 : st.range === '10A' ? 10 : null;
    let t0 = span ? Math.max(Date.parse(dates[0]), tEnd - span * 365.25 * DAY) : Date.parse(dates[0]), t1 = tEnd;
    // zoom su un sottoperiodo (js/zoom.js): il tratto scelto dentro il periodo, tagliato alla storia del paese
    const zw = zoom ? zoom.time(t0, t1, dates) : null;
    if (zw) [t0, t1] = zw;
    const x = (d) => L + ((Date.parse(d) - t0) / (t1 - t0)) * PW;
    const inWin = (d) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
    const f = model.fx[k], dl = model.dollar;
    const hasFx = !!(f && c.fx && !c.peg);
    const panes = [
      { key: 'px', h: 130, title: narrow ? 'PREZZO, BASE 100' : `PREZZO, BASE 100 · ${c.fx === null ? 'IN DOLLARI' : 'IN VALUTA LOCALE E IN DOLLARI'}` },
      { key: 'br', h: 110, title: narrow ? `% SOPRA MEDIA 200 · BLU ${r.L}%` : `% TITOLI SOPRA LA MEDIA 200 · LIVELLO BLU ${r.L}%` },
      { key: 'fx', h: hasFx ? 100 : 44, title: hasFx ? (narrow ? `${c.ccy} PER DOLLARO · SU = PIÙ DEBOLE` : `CAMBIO ${c.ccy} PER DOLLARO · SU = VALUTA PIÙ DEBOLE`) : 'CAMBIO' },
      { key: 'dl', h: 100, title: narrow ? 'DOLLARO VS EMERGENTI (FRED)' : 'DOLLARO CONTRO LE VALUTE EMERGENTI · FRED DTWEXEMEGS' },
    ];
    let y = 4;
    for (const p of panes) { p.y0 = y + 16; p.y1 = p.y0 + p.h; y = p.y1 + 6; }
    const H = y + 16;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    // indice nel periodo
    let i0 = 0; while (i0 < n - 1 && !inWin(dates[i0])) i0++;
    // base 100 comune: la prima seduta del periodo in cui ci sono entrambe le linee (in MAX il cambio parte dopo l'indice:
    // con basi diverse il confronto tra valuta locale e dollari sarebbe falso)
    const usdRaw = r.usd && c.fx ? r.usd : null;
    let jb = -1;
    for (let i = i0; i < n; i++) if (snap.close[i] != null && (!usdRaw || usdRaw[i] != null)) { jb = i; break; }
    const rebase = (a) => a.map((v, i) => (i < i0 || v == null || jb < 0 ? null : (v / a[jb]) * 100));
    const loc = rebase(snap.close), usd = usdRaw ? rebase(usdRaw) : null;
    // nello zoom la base 100 è il primo giorno del tratto: si scrive sempre, il valore cambia con lo zoom
    const baseNote = zw && jb >= 0 ? ` · base 100 al ${dIT(dates[jb])}, inizio dello zoom` : jb > i0 ? ` · base 100 al ${dIT(dates[jb])}` : '';
    const scale = (vals, pad = 0.06, fixed = null) => {
      let lo = Infinity, hi = -Infinity;
      for (const v of vals) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      if (fixed) { lo = Math.min(lo, fixed[0]); hi = Math.max(hi, fixed[1]); }
      if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
      const m = (hi - lo) * pad || 1; return [lo - m, hi + m];
    };
    const sy = (p, lo, hi) => (v) => p.y0 + ((hi - v) / (hi - lo)) * p.h;
    const path = (ds, vs, f2) => { let d = '', on = false; for (let i = 0; i < ds.length; i++) { if (vs[i] == null || !inWin(ds[i])) { on = false; continue; } d += (on ? 'L' : 'M') + x(ds[i]).toFixed(1) + ' ' + f2(vs[i]).toFixed(1); on = true; } return d; };
    const bands = (p, ds, on, cls) => {
      let s = null, prev = null;
      const flush = (end) => { if (s != null) el('rect', { x: x(s), y: p.y0, width: Math.max(1, x(end) - x(s)), height: p.h, class: cls }, svg); s = null; };
      ds.forEach((d, i) => { if (!inWin(d)) return; if (on[i]) { if (s == null) s = d; prev = d; } else if (s != null) flush(prev); });
      if (s != null) flush(prev);
    };
    const axis = (p, lo, hi, fmtv) => {
      for (let i = 0; i <= 3; i++) { const v = lo + ((hi - lo) * (i + 0.5)) / 4, yy = sy(p, lo, hi)(v); el('line', { x1: L, x2: L + PW, y1: yy, y2: yy, class: 'gridl' }, svg); el('text', { x: L + PW + 4, y: yy + 3, class: 'axt' }, svg).textContent = fmtv(v); }
    };
    for (const p of panes) {
      el('rect', { x: L, y: p.y0, width: PW, height: p.h, class: 'frame' }, svg);
      el('text', { x: L, y: p.y0 - 5, class: 'pane-t' }, svg).textContent = p.title;
    }
    // asse del tempo: anni, e nello zoom anche mesi e giorni
    for (const tk of timeTicks(t0, t1, narrow ? 4 : 10)) {
      const xx = L + ((tk.t - t0) / (t1 - t0)) * PW;
      for (const p of panes) el('line', { x1: xx, x2: xx, y1: p.y0, y2: p.y1, class: 'gridl' }, svg);
      el('text', { x: xx, y: H - 4, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = tk.label;
    }
    // zona blu sui primi due pannelli (come le bande del grafico dei settori)
    const blueOn = snap.m.days.map((s) => s === 'setup' || s === 'fail');
    for (const p of panes.slice(0, 2)) bands(p, dates, blueOn, 'band');
    // 1. prezzo
    const P0 = panes[0], [a0, b0] = scale([...loc, ...(usd || [])]), f0 = sy(P0, a0, b0);
    axis(P0, a0, b0, (v) => fmt(v, 0));
    el('path', { d: path(dates, loc, f0), class: 'emloc' }, svg);
    if (usd) el('path', { d: path(dates, usd, f0), class: 'emusd' }, svg);
    for (const e of snap.m.events) if (e.code === 'trig' && inWin(dates[e.t]) && loc[e.t] != null) { const xx = x(dates[e.t]), yy = f0(loc[e.t]) + 10; el('path', { d: `M${xx} ${yy - 7} L${xx - 5} ${yy + 2} L${xx + 5} ${yy + 2} Z`, class: 'trigmark' }, svg); }
    // 2. breadth
    const P1 = panes[1], f1 = sy(P1, 0, 100);
    axis(P1, 0, 100, (v) => fmt(v, 0) + '%');
    el('path', { d: path(dates, snap.pct200, f1), class: 'br' }, svg);
    el('line', { x1: L, x2: L + PW, y1: f1(r.L), y2: f1(r.L), class: 'blue' }, svg);
    // 3. cambio
    const P2 = panes[2];
    if (hasFx) {
      const fd = f.S.dates, fv = f.S.val;
      bands(P2, fd, f.z.map((z, i) => z != null && z >= 1 && f.F[i] === 0), 'fxcalo');
      bands(P2, fd, f.F.map((v) => v === 1), 'fxferma');
      const [a2, b2] = scale(fv.filter((_, i) => inWin(fd[i]))), f2 = sy(P2, a2, b2);
      axis(P2, a2, b2, (v) => fmt(v, v < 10 ? 2 : v < 100 ? 1 : 0));
      el('path', { d: path(fd, fv, f2), class: 'emfx' }, svg);
    } else {
      el('text', { x: L + 8, y: P2.y0 + P2.h / 2 + 4, class: 'axt' }, svg).textContent = c.peg ? (narrow ? 'HKD agganciato al dollaro' : 'Dollaro di Hong Kong agganciato al dollaro americano: il cambio non dà informazioni') : c.fx === null ? (narrow ? 'EEM è in dollari' : 'EEM è quotato in dollari: conta il dollaro contro gli emergenti, qui sotto') : 'Cambio non disponibile';
    }
    // 4. dollaro contro emergenti
    const P3 = panes[3];
    if (dl) {
      const dd = dl.S.dates, dv = dl.S.val;
      bands(P3, dd, dl.D.map((v) => v === 1), 'dlfav');
      const [a3, b3] = scale([...dv.filter((_, i) => inWin(dd[i])), ...dl.sma.filter((v, i) => v != null && inWin(dd[i]))]), f3 = sy(P3, a3, b3);
      axis(P3, a3, b3, (v) => fmt(v, 0));
      el('path', { d: path(dd, dl.sma, f3), class: 'ma' }, svg);
      el('path', { d: path(dd, dv, f3), class: 'emdl' }, svg);
    } else el('text', { x: L + 8, y: P3.y0 + P3.h / 2 + 4, class: 'axt' }, svg).textContent = 'FRED non disponibile';

    // mirino e riquadro dei valori (stessa data esatta per ogni serie: dove manca, «—»)
    const fxAt = hasFx ? new Map(f.S.dates.map((d, i) => [d, i])) : null, dlAt = dl ? new Map(dl.S.dates.map((d, i) => [d, i])) : null;
    const xh = el('line', { x1: 0, x2: 0, y1: panes[0].y0, y2: panes[3].y1, class: 'xhair', visibility: 'hidden' }, svg);
    const hit = el('rect', { x: L, y: panes[0].y0, width: PW + R, height: panes[3].y1 - panes[0].y0, fill: 'transparent' }, svg);
    const at = new Map(dates.map((d, i) => [d, i]));
    const line = (d) => { const xx = x(d); xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.setAttribute('visibility', 'visible'); };
    syncX('emg', svg.id, (d) => { if (d == null || !inWin(d)) xh.setAttribute('visibility', 'hidden'); else line(d); });
    const show = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      const tq = t0 + ((Math.max(L, Math.min(L + PW, q.x)) - L) / PW) * (t1 - t0);
      let i = i0; while (i + 1 < n && Date.parse(dates[i + 1]) <= tq) i++;
      const d = dates[i];
      line(d); emitX('emg', svg.id, d);
      const fi = fxAt ? fxAt.get(d) : undefined, di = dlAt ? dlAt.get(d) : undefined;
      const fxTxt = fi == null ? '—' : fmt(f.S.val[fi], f.S.val[fi] < 10 ? 4 : 2) + (f.S.fred && f.S.dates[fi] > f.S.fred ? ' <span class="muted">Yahoo, provvisorio</span>' : '');
      const fxSt = fi == null ? null : fxState(f.F[fi], f.z[fi]);
      $('emTip').innerHTML = `<div class="row"><b>${dIT(d)}</b><span>${k}${snap.m.days[i] ? ' · ' + esc(STATES[snap.m.days[i]].toLowerCase()) : ''}</span></div>
        <div class="row"><span>Prezzo</span><b>${fmt(snap.close[i], snap.close[i] >= 1000 ? 0 : snap.close[i] < 10 ? 3 : 2)}</b></div>
        ${usd ? `<div class="row"><span>In dollari (base 100)</span><b>${fmt(usd[i], 1)}</b></div>` : ''}
        <div class="row"><span>Sopra media 200</span><b>${snap.pct200[i] == null ? '—' : fmt(snap.pct200[i]) + '%'}</b></div>
        ${hasFx ? `<div class="row"><span>${c.ccy} per dollaro</span><b>${fxTxt}</b></div><div class="row"><span>Valuta</span><b>${fxSt ? FXL[fxSt] : '—'}</b></div>` : ''}
        <div class="row"><span>Dollaro vs emergenti</span><b>${di == null ? '—' : fmt(dl.S.val[di], 2)}</b></div>` +
        (di == null && dl ? `<div class="row note-row">${d < dl.S.dates[0] ? `FRED: la serie del dollaro contro gli emergenti inizia il ${dIT(dl.S.dates[0])}` : 'FRED: nessun valore per questa data (festa negli Stati Uniti, oppure dato non ancora pubblicato: FRED aggiorna la serie una volta alla settimana)'}</div>` : '');
      placeTip($('emTip'), $('emWrap'), e, 12);
    };
    bindTip(hit, svg, show, () => { xh.setAttribute('visibility', 'hidden'); $('emTip').hidden = true; emitX('emg', svg.id, null); });
    if (zoom) zoom.geo(svg, { L, PW, top: panes[0].y0, bottom: panes[3].y1, t0, t1, dates });
    // legenda
    $('emLegend').innerHTML = [
      `<span><span class="kl" style="background:var(--amber)"></span>${c.fx ? 'in valuta locale' : 'prezzo in dollari'}</span>`,
      c.fx ? '<span><span class="kl" style="background:var(--blue-light)"></span>in dollari</span>' : '',
      '<span><span class="kb" style="background:var(--blue);opacity:.45"></span>zona blu</span>',
      '<span><span class="kb" style="background:var(--st-trig)"></span>trigger</span>',
      hasFx ? '<span><span class="kb em-calo"></span>valuta in calo forte</span><span><span class="kb em-ferma"></span>valuta che ha smesso di scendere</span>' : '',
      '<span><span class="kl" style="background:var(--ink-2)"></span>dollaro contro emergenti</span><span><span class="kl" style="background:var(--amber)"></span>sua media 200</span><span><span class="kb em-fav"></span>dollaro favorevole (sotto la media e in calo in 3 mesi)</span>',
    ].join('');
    $('emChartMeta').textContent = `${c.fx === null ? 'EEM è in dollari, senza cambio' : `cambio al ${f ? dIT(f.S.dates.at(-1)) : '—'}`}${f && f.S.fred && f.S.fred < f.S.dates.at(-1) ? ` (Fed fino al ${dIT(f.S.fred)}, poi Yahoo provvisorio)` : ''} · dollaro FRED al ${dl ? dIT(dl.S.dates.at(-1)) : '—'}${baseNote}${baseNote && usd ? (zw ? ' (le due linee hanno la stessa base)' : ' (primo giorno con il cambio: le due linee hanno la stessa base)') : ''}`;
  }

  // ---------- forza relativa contro ACWI ----------
  function renderRS(rows) {
    const svg = $('emRS'), W = Math.max(240, Math.min(360, $('emRSWrap').clientWidth || 300)), H = W, c = 100, span = 4;
    svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    const sx = (v) => ((v - c + span) / (2 * span)) * W, sy = (v) => H - ((v - c + span) / (2 * span)) * H, cl = (v) => Math.max(c - span, Math.min(c + span, v));
    [['lead', W / 2, 0], ['imp', 0, 0], ['lag', 0, H / 2], ['weak', W / 2, H / 2]].forEach(([q, xx, yy]) => el('rect', { x: xx, y: yy, width: W / 2, height: H / 2, class: `qbg q-${q}-tint` }, svg));
    el('line', { x1: W / 2, x2: W / 2, y1: 0, y2: H, class: 'axis' }, svg); el('line', { x1: 0, x2: W, y1: H / 2, y2: H / 2, class: 'axis' }, svg);
    [['Leading', W - 4, 12, 'end', 'lead'], ['Improving', 4, 12, 'start', 'imp'], ['Lagging', 4, H - 4, 'start', 'lag'], ['Weakening', W - 4, H - 4, 'end', 'weak']]
      .forEach(([t, xx, yy, a, q]) => { el('text', { x: xx, y: yy, 'text-anchor': a, class: `qlab q-${q}-c` }, svg).textContent = t; });
    let last = null;
    // etichette: a destra del punto, altrimenti a sinistra, sopra o sotto, la prima posizione che non tocca altri punti o etichette
    const pts = rows.filter((r) => !r.missing && r.rs && r.rs.trail.length).map((r) => { const p = r.rs.trail.at(-1); return [sx(cl(p[0])), sy(cl(p[1]))]; });
    const boxes = [], hit = (b) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) || pts.some(([px, py]) => px > b[0] - 4 && px < b[2] + 4 && py > b[1] - 4 && py < b[3] + 4);
    const place = (px, py, t) => {
      const w = t.length * 6.2 + 2, h = 10;
      for (const [lx, ly, a] of [[px + 6, py + 3, 'start'], [px - 6, py + 3, 'end'], [px, py - 7, 'middle'], [px, py + 13, 'middle']]) {
        const x0 = a === 'start' ? lx : a === 'end' ? lx - w : lx - w / 2, b = [x0, ly - h + 1, x0 + w, ly + 1];
        if (!hit(b)) { boxes.push(b); return [lx, ly, a]; }
      }
      boxes.push([px + 6, py - 7, px + 6 + w, py + 4]);
      return [px + 6, py + 3, 'start'];
    };
    for (const r of rows) {
      if (r.missing || !r.rs || !r.rs.trail.length) continue;
      const on = r.k === st.sel, tr = r.rs.trail;
      if (on) el('path', { d: tr.map((p, i) => (i ? 'L' : 'M') + sx(cl(p[0])).toFixed(1) + ' ' + sy(cl(p[1])).toFixed(1)).join(''), class: 'emtrail' }, svg);
      const p = tr.at(-1), g = el('g', { class: on ? 'emdot on' : 'emdot', 'data-em': r.k, tabindex: 0, role: 'button', 'aria-label': `${CFG[r.k].etf}: ${r.rs.quad}` }, svg);
      el('circle', { cx: sx(cl(p[0])), cy: sy(cl(p[1])), r: on ? 4.5 : 3.2 }, g);
      const [lx, ly, la] = place(sx(cl(p[0])), sy(cl(p[1])), CFG[r.k].etf);
      el('text', { x: lx, y: ly, 'text-anchor': la }, g).textContent = CFG[r.k].etf;
      el('title', {}, g).textContent = `${r.k} · ${CFG[r.k].etf} contro ACWI al ${dIT(r.rs.last)}: RS-Ratio ${fmt(r.rs.ratio, Math.abs(r.rs.ratio - 100) < 0.05 ? 2 : 1)}, RS-Momentum ${fmt(r.rs.mom, Math.abs(r.rs.mom - 100) < 0.05 ? 2 : 1)} (${r.rs.quad})`;
      g.addEventListener('click', () => select(r.k, true));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(r.k, true, true); } });
      if (on) last = r.rs.last;
    }
    $('emRSMeta').textContent = last ? `al ${dIT(last)}` : '';
    if (!pts.length) el('text', { x: W / 2, y: H / 2 - 8, 'text-anchor': 'middle', class: 'qlab' }, svg).textContent = 'Forza relativa non disponibile';
  }

  function bind() {
    // un pulsante del periodo, anche quello già scelto, toglie lo zoom
    document.querySelectorAll('#emRange button').forEach((b) => b.onclick = () => { st.range = b.dataset.range; store.set('emRange', st.range); zoom.reset(); if (model) renderDetail(row(st.sel)); });
    zoom = zoomGroup('emg', { lens: $('emLens'), chips: [$('emZoom')], back: () => document.querySelector('#emRange [aria-pressed="true"]'), onChange: () => { if (model) drawChart(row(st.sel)); } });
    zoom.attach($('emChart'));
    $('emOpenIx').onclick = () => ctx.openIndex(st.sel);
    // livello blu cambiato nella vista 6: stati e breadth si rileggono alla prossima apertura (o subito, se la vista è aperta)
    indices.onChange(() => { if (model && !$('v-emg').hidden) render(); });
  }

  return {
    bind, render, keys: KEYS,
    open: (k) => { if (KEYS.includes(k)) { st.sel = k; store.set('emSel', k); } },
    selected: () => st.sel,
  };
}
