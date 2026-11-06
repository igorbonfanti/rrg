/*
 * vix-view.js — vista 8 «VIX»: solo contesto (decisione dell'utente del 06/11/2026), nessuna regola e nessun alert.
 * Idea di Massimo Rea (quant-rea): come vanno le borse dopo che il VIX raggiunge certi livelli, e volatilità implicita
 * contro realizzata. Calcoli in vix.js; dati in data/vix.json (scaricato alla prima apertura). Metodo e verifica in
 * ricerca/vix/ (ramo di sviluppo).
 */
import * as V from './vix.js';
import { esc, fmt, sgnP, pct, dIT, placeTip, bindTip, chartWidth } from './format.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const DAY = 86400000;
const IXN = { SPX: 'S&P 500', NDX: 'Nasdaq-100' };
const HL = { 21: '1 mese', 63: '3 mesi', 126: '6 mesi', 252: '12 mesi' };

/** @param {{$: Function, store: object, load: () => Promise<object>}} ctx */
export function createVix(ctx) {
  const { $, store } = ctx;
  let data = null, loading = null, failed = null, model = null;
  const st = { ix: ['SPX', 'NDX'].includes(store.get('vxIx')) ? store.get('vxIx') : 'SPX', thr: V.XS.includes(store.get('vxThr')) ? store.get('vxThr') : 40, range: ['3A', '10A', 'MAX'].includes(store.get('vxRange')) ? store.get('vxRange') : '10A' };

  function ensure() {
    if (!loading) {
      $('vxLoading').hidden = false;
      loading = ctx.load().then((d) => { data = d; }).catch((e) => { failed = e; }).finally(() => { $('vxLoading').hidden = true; });
    }
    return loading;
  }
  function build() {
    const vix = V.vxSeries(data.series.VIX), out = { vix };
    for (const k of ['SPX', 'NDX']) {
      const s = V.vxSeries(data.series[k]);
      if (!vix || !s) { out[k] = null; continue; }
      const A = V.align(s, vix);
      out[k] = { A, R: V.regimes(A), S: V.scatter(A) };
    }
    out.today = out.SPX ? V.today(out.SPX.A) : null;
    return out;
  }

  async function render() {
    await ensure();
    if (failed || !data || !data.series) {
      $('vxBody').hidden = true; $('vxMiss').hidden = false;
      $('vxMiss').textContent = `Dati del VIX non disponibili (${failed ? failed.message : 'file vuoto'}).`;
      return;
    }
    if (!model) model = build();
    $('vxMiss').hidden = true; $('vxBody').hidden = false;
    renderKpis(); renderTable(); renderScatter(); renderChart();
    document.querySelectorAll('#vxIx button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ix === st.ix)));
    document.querySelectorAll('#vxRange button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.range === st.range)));
  }

  // ---------- riquadri di oggi ----------
  function renderKpis() {
    const T = model.today;
    if (!T) { $('vxKpis').innerHTML = ''; return; }
    const prov = T.provisional ? ' · Yahoo, provvisorio' : '';
    const kpi = (k, v, s, t) => `<div class="kpi" title="${esc(t)}"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`;
    $('vxKpis').innerHTML = [
      kpi('VIX', fmt(T.vix, 2), `${esc(T.band[2])} · al ${dIT(T.date)}${prov}`, 'Volatilità implicita dell\'S&P 500 per i prossimi 30 giorni (Cboe, da FRED). Fasce: sotto 15 calmo, 15-20 normale, 20-25 nervoso, 25-30 paura, 30-40 paura forte, 40-50 panico, oltre 50 panico estremo.'),
      kpi('Percentile del VIX', `${fmt(T.pct, 0)}°`, `nella storia dal ${dIT(model.SPX.R.from)}`, 'Quota delle chiusure del VIX fino a oggi minori o uguali a quella di oggi (solo storia passata).'),
      kpi('Volatilità realizzata', T.rv == null ? '—' : fmt(T.rv, 1), 'S&P 500, ultime 21 sedute, annualizzata', 'Deviazione standard dei rendimenti giornalieri delle ultime 21 sedute, ×√252.'),
      kpi('Premio per la paura', T.prem == null ? '—' : sgnP(T.prem, 1).replace('%', ''), T.premPct == null ? '—' : `VIX − realizzata · ${fmt(T.premPct, 0)}° percentile`, 'Quanto il VIX sta sopra la volatilità delle ultime 21 sedute. Un premio alto da solo non ha annunciato i picchi di volatilità (vedi «Come leggere»).'),
    ].join('');
    $('vxMeta').textContent = `VIX al ${dIT(data.asOf.vix)}${data.asOf.fred && data.asOf.fred < data.asOf.vix ? ` (FRED al ${dIT(data.asOf.fred)}, poi Yahoo provvisorio)` : ''} · S&P 500 al ${dIT(data.asOf.spx)} · Nasdaq-100 al ${dIT(data.asOf.ndx)}`;
  }

  // ---------- tabella dei regimi ----------
  function renderTable() {
    const m = model[st.ix];
    if (!m) { $('vxTable').innerHTML = ''; return; }
    const { R } = m;
    const cell = (d) => (d.n ? `<span class="vxpos">${d.posN}/${d.n}</span> <b>${sgnP(d.median, 1)}</b>` : '<span class="muted">—</span>');
    const head = `<thead><tr><th>VIX chiude sopra</th><th class="r">episodi</th>${V.HS.map((h) => `<th class="r h${h}">${HL[h]}<br><small>positivi · mediana</small></th>`).join('')}<th class="r">calo dopo<br><small>mediana</small></th><th class="r hmin">minimo dopo<br><small>sedute</small></th></tr></thead>`;
    const base = `<tr class="vxbase"><td>Una seduta qualsiasi</td><td class="r muted">—</td>${V.HS.map((h) => `<td class="r h${h}"><span class="vxpos">${fmt(R.base[h].pos, 0)}%</span> <b>${sgnP(R.base[h].median, 1)}</b></td>`).join('')}<td class="r">${pct(R.base.dd.median, 1)}</td><td class="r muted hmin">—</td></tr>`;
    const rows = V.XS.map((X) => {
      const t = R.thr[X], s = t.stats, on = X === st.thr;
      return `<tr data-x="${X}" class="${on ? 'sel' : ''}" tabindex="0"><td><b>${X}</b>${t.robust ? ' <span class="pill vxrob" title="Nella verifica (criterio deciso prima: almeno 8 episodi, chiaramente meglio della base, in almeno 2 periodi su 3) è l\'unica soglia con un risultato robusto. Pochi casi: numeri indicativi.">robusto</span>' : ''}</td><td class="r">${t.episodes.length}</td>${V.HS.map((h) => `<td class="r h${h}">${cell(s[h])}</td>`).join('')}<td class="r">${s.dd.median == null ? '—' : pct(s.dd.median, 1)}</td><td class="r hmin">${s.toMin == null ? '—' : fmt(s.toMin, 0)}</td></tr>`;
    }).join('');
    $('vxTable').innerHTML = head + `<tbody>${base}${rows}</tbody>`;
    $('vxTable').querySelectorAll('tbody tr[data-x]').forEach((tr) => {
      const go = () => { st.thr = +tr.dataset.x; store.set('vxThr', st.thr); renderTable(); };
      tr.onclick = go; tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); const n = $('vxTable').querySelector(`tr[data-x="${st.thr}"]`); if (n) n.focus(); } };
    });
    $('vxTableMeta').textContent = `${IXN[st.ix]} · solo prezzo · dal ${dIT(R.from)} · ingresso alla chiusura della seduta dopo il segnale`;
    // episodi della soglia scelta
    const eps = R.thr[st.thr].episodes;
    $('vxEpsTitle').textContent = `Episodi con il VIX sopra ${st.thr} · ${IXN[st.ix]}`;
    $('vxEps').innerHTML = `<thead><tr><th>Inizio</th><th>Crisi</th><th class="r">VIX</th><th class="r hmin">VIX max</th>${V.HS.map((h) => `<th class="r h${h}">${HL[h]}</th>`).join('')}<th class="r">calo dopo</th></tr></thead><tbody>` +
      eps.slice().reverse().map((e) => `<tr><td>${dIT(e.date)}</td><td>${esc(e.crisis || '—')}</td><td class="r">${fmt(e.vix, 1)}</td><td class="r hmin">${fmt(e.vixMax, 1)}</td>${V.HS.map((h) => `<td class="r h${h} ${e.ret[h] == null ? 'muted' : e.ret[h] >= 0 ? 'up' : 'down'}">${e.ret[h] == null ? 'in corso' : sgnP(e.ret[h], 1)}</td>`).join('')}<td class="r">${e.dd == null ? '—' : pct(e.dd, 1)}${e.partial ? '<span class="loc" title="meno di 12 mesi di dati dopo il segnale: calo fino a oggi">*</span>' : ''}</td></tr>`).join('') + '</tbody>';
  }

  // ---------- scatter in stile Rea (giorni con il VIX ≥ 30) ----------
  function renderScatter() {
    const svg = $('vxScatter'), m = model[st.ix];
    svg.innerHTML = '';
    if (!m) return;
    const { pts, eps, open } = m.S;
    const W = chartWidth(svg, 900), H = Math.round(Math.min(380, Math.max(240, W * 0.45))), L = 44, R = 12, T = 10, B = 30, PW = W - L - R, PH = H - T - B;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    const xmax = Math.max(60, Math.ceil(Math.max(...pts.map((p) => p.vix)) / 10) * 10), xmin = 30;
    const ys = pts.map((p) => p.ret), ymin = Math.min(-50, Math.floor(Math.min(...ys) / 10) * 10), ymax = Math.max(60, Math.ceil(Math.max(...ys) / 10) * 10);
    const sx = (v) => L + ((v - xmin) / (xmax - xmin)) * PW, sy = (v) => T + ((ymax - v) / (ymax - ymin)) * PH;
    el('rect', { x: L, y: T, width: PW, height: PH, class: 'frame' }, svg);
    for (let v = xmin; v <= xmax; v += 10) { el('line', { x1: sx(v), x2: sx(v), y1: T, y2: T + PH, class: v === 40 || v === 50 ? 'vxthr' : 'gridl' }, svg); el('text', { x: sx(v), y: H - 12, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = String(v); }
    for (let v = Math.ceil(ymin / 20) * 20; v <= ymax; v += 20) { el('line', { x1: L, x2: L + PW, y1: sy(v), y2: sy(v), class: v === 0 ? 'vxzero' : 'gridl' }, svg); el('text', { x: L - 4, y: sy(v) + 3, class: 'axt', 'text-anchor': 'end' }, svg).textContent = (v > 0 ? '+' : '') + v + '%'; }
    el('text', { x: L + PW, y: H - 1, class: 'axt', 'text-anchor': 'end' }, svg).textContent = 'VIX alla chiusura';
    // colore per episodio (alternato), inizio dell'episodio più grande
    const idx = new Map(eps.map((e, i) => [e.date, i]));
    const g = el('g', {}, svg);
    for (const p of pts) el('circle', { cx: sx(p.vix).toFixed(1), cy: sy(p.ret).toFixed(1), r: p.start ? 4.2 : 2, class: `vxpt c${(idx.get(p.ep) || 0) % 6}${p.start ? ' start' : ''}` }, g);
    // riquadro dei valori: il punto più vicino
    const hit = el('rect', { x: L, y: T, width: PW, height: PH, fill: 'transparent' }, svg);
    const ring = el('circle', { r: 6, class: 'vxring', visibility: 'hidden' }, svg);
    const show = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      let best = null, bd = Infinity;
      for (const p of pts) { const d = (sx(p.vix) - q.x) ** 2 + (sy(p.ret) - q.y) ** 2; if (d < bd) { bd = d; best = p; } }
      if (!best || bd > 400) { $('vxScTip').hidden = true; ring.setAttribute('visibility', 'hidden'); return; }
      ring.setAttribute('cx', sx(best.vix)); ring.setAttribute('cy', sy(best.ret)); ring.setAttribute('visibility', 'visible');
      const ep = eps.find((x) => x.date === best.ep);
      $('vxScTip').innerHTML = `<div class="row"><b>${dIT(best.date)}</b><span>${esc(best.crisis || '')}</span></div>
        <div class="row"><span>VIX</span><b>${fmt(best.vix, 2)}</b></div>
        <div class="row"><span>${IXN[st.ix]} dopo 12 mesi</span><b>${sgnP(best.ret, 1)}</b></div>
        <div class="row"><span>Episodio iniziato il</span><b>${ep ? dIT(ep.date) : '—'}</b></div>${best.start ? '<div class="row note-row">Primo giorno dell\'episodio (il punto grande).</div>' : ''}`;
      placeTip($('vxScTip'), $('vxScWrap'), e, 12);
    };
    bindTip(hit, svg, show, () => { $('vxScTip').hidden = true; ring.setAttribute('visibility', 'hidden'); });
    // didascalia: giorni contro episodi, calcolata sui dati
    const byEp = new Map(); for (const p of pts) byEp.set(p.ep, (byEp.get(p.ep) || 0) + 1);
    const top2 = [...byEp.values()].sort((a, b) => b - a).slice(0, 2).reduce((s, x) => s + x, 0);
    const posD = pts.filter((p) => p.ret > 0).length;
    const e30 = eps.filter((e) => e.ret[252] != null), posE = e30.filter((e) => e.ret[252] > 0).length;
    const hi = pts.filter((p) => p.vix >= 50), hiEp = new Set(hi.map((p) => p.ep));
    $('vxScMeta').textContent = `${IXN[st.ix]} · ogni punto è una seduta con il VIX sopra 30 · ingresso alla chiusura della seduta dopo`;
    $('vxScNote').innerHTML = `<b>Giorni contro episodi.</b> ${pts.length} sedute, positive dopo 12 mesi ${posD} (${fmt((100 * posD) / pts.length, 0)}%); ma vengono da ${byEp.size} episodi, positivi ${posE} su ${e30.length}, e le due crisi più lunghe da sole fanno ${fmt((100 * top2) / pts.length, 0)}% dei punti. Sopra 50: ${hi.length} sedute da ${hiEp.size} ${hiEp.size === 1 ? 'episodio' : 'episodi'}. Contare i giorni dà più peso alle crisi lunghe: la tabella conta gli episodi.${open ? ` ${open} ${open === 1 ? 'seduta recente non ha' : 'sedute recenti non hanno'} ancora 12 mesi di dati e non ${open === 1 ? 'è disegnata' : 'sono disegnate'}.` : ''}`;
  }

  // ---------- VIX contro volatilità realizzata (S&P 500) ----------
  function renderChart() {
    const svg = $('vxChart'), m = model.SPX, T0 = model.today;
    svg.innerHTML = '';
    if (!m || !T0) return;
    const { A } = m, dates = A.dates, n = dates.length;
    const W = chartWidth(svg, 1600), L = 8, R = 46, PW = W - L - R, narrow = PW < 440;
    const t1 = Date.parse(dates[n - 1]), span = st.range === '3A' ? 3 : st.range === '10A' ? 10 : null;
    const t0 = span ? Math.max(Date.parse(dates[0]), t1 - span * 365.25 * DAY) : Date.parse(dates[0]);
    const x = (d) => L + ((Date.parse(d) - t0) / (t1 - t0)) * PW, inWin = (d) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
    const P = [{ h: 230, title: narrow ? 'VIX E REALIZZATA (21 SEDUTE)' : 'VIX E VOLATILITÀ REALIZZATA DELL\'S&P 500 (21 SEDUTE, ANNUALIZZATA)' }, { h: 110, title: narrow ? 'PREMIO PER LA PAURA' : 'PREMIO PER LA PAURA (VIX − REALIZZATA)' }];
    let y = 4; for (const p of P) { p.y0 = y + 16; p.y1 = p.y0 + p.h; y = p.y1 + 6; }
    const H = y + 16;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    const sy = (p, lo, hi) => (v) => p.y0 + ((hi - v) / (hi - lo)) * p.h;
    const path = (vs, f2) => { let d = '', on = false; for (let i = 0; i < n; i++) { if (vs[i] == null || !inWin(dates[i])) { on = false; continue; } d += (on ? 'L' : 'M') + x(dates[i]).toFixed(1) + ' ' + f2(vs[i]).toFixed(1); on = true; } return d; };
    const vis = (a) => a.filter((v, i) => v != null && inWin(dates[i]));
    for (const p of P) { el('rect', { x: L, y: p.y0, width: PW, height: p.h, class: 'frame' }, svg); el('text', { x: L, y: p.y0 - 5, class: 'pane-t' }, svg).textContent = p.title; }
    const yy0 = new Date(t0).getUTCFullYear(), yy1 = new Date(t1).getUTCFullYear(), every = Math.max(1, Math.ceil((yy1 - yy0 + 1) / (narrow ? 4 : 10)));
    for (let yr = yy0 + 1; yr <= yy1; yr++) { if ((yr - yy0) % every) continue; const xx = x(`${yr}-01-01`); for (const p of P) el('line', { x1: xx, x2: xx, y1: p.y0, y2: p.y1, class: 'gridl' }, svg); el('text', { x: xx, y: H - 4, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = String(yr); }
    // 1. VIX e realizzata
    const P0 = P[0], hi0 = Math.max(...vis(A.vix), ...vis(T0.rvSeries)) * 1.04, f0 = sy(P0, 0, hi0);
    for (const v of [20, 30, 40, 50, 60, 80]) if (v < hi0) { el('line', { x1: L, x2: L + PW, y1: f0(v), y2: f0(v), class: 'gridl' }, svg); el('text', { x: L + PW + 4, y: f0(v) + 3, class: 'axt' }, svg).textContent = String(v); }
    el('path', { d: path(T0.rvSeries, f0), class: 'vxrv' }, svg);
    el('path', { d: path(A.vix, f0), class: 'vxvix' }, svg);
    // 2. premio, con le sedute oltre l'80° percentile (storia fino a quel giorno)
    const P1 = P[1], pv = vis(T0.premSeries), lo1 = Math.min(-10, ...pv), hi1 = Math.max(10, ...pv), f1 = sy(P1, lo1, hi1);
    let s = null, prev = null;
    const flush = () => { if (s != null) el('rect', { x: x(s), y: P1.y0, width: Math.max(1, x(prev) - x(s)), height: P1.h, class: 'vxhigh' }, svg); s = null; };
    for (let i = 0; i < n; i++) { if (!inWin(dates[i])) continue; const on = T0.premPctSeries[i] != null && T0.premPctSeries[i] >= 80; if (on) { if (s == null) s = dates[i]; prev = dates[i]; } else if (s != null) flush(); }
    if (s != null) flush();
    el('line', { x1: L, x2: L + PW, y1: f1(0), y2: f1(0), class: 'vxzero' }, svg);
    for (const v of [-10, 0, 10, 20]) if (v > lo1 && v < hi1) el('text', { x: L + PW + 4, y: f1(v) + 3, class: 'axt' }, svg).textContent = (v > 0 ? '+' : '') + v;
    el('path', { d: path(T0.premSeries, f1), class: 'vxprem' }, svg);
    // riquadro dei valori
    let i0 = 0; while (i0 < n - 1 && !inWin(dates[i0])) i0++;
    const xh = el('line', { x1: 0, x2: 0, y1: P[0].y0, y2: P[1].y1, class: 'xhair', visibility: 'hidden' }, svg);
    const hit = el('rect', { x: L, y: P[0].y0, width: PW + R, height: P[1].y1 - P[0].y0, fill: 'transparent' }, svg);
    const show = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      const tq = t0 + ((Math.max(L, Math.min(L + PW, q.x)) - L) / PW) * (t1 - t0);
      let i = i0; while (i + 1 < n && Date.parse(dates[i + 1]) <= tq) i++;
      const xx = x(dates[i]); xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.setAttribute('visibility', 'visible');
      const prov = A.fred && dates[i] > A.fred && A.vix[i] != null ? ' <span class="muted">Yahoo, provvisorio</span>' : '';
      $('vxTip').innerHTML = `<div class="row"><b>${dIT(dates[i])}</b><span>S&amp;P 500 ${fmt(A.close[i], 0)}</span></div>
        <div class="row"><span>VIX</span><b>${A.vix[i] == null ? '—' : fmt(A.vix[i], 2) + prov}</b></div>
        <div class="row"><span>Realizzata 21 sedute</span><b>${T0.rvSeries[i] == null ? '—' : fmt(T0.rvSeries[i], 1)}</b></div>
        <div class="row"><span>Premio per la paura</span><b>${T0.premSeries[i] == null ? '—' : sgnP(T0.premSeries[i], 1).replace('%', '')}</b></div>
        <div class="row"><span>Percentile del premio</span><b>${T0.premPctSeries[i] == null ? '—' : fmt(T0.premPctSeries[i], 0) + '°'}</b></div>`;
      placeTip($('vxTip'), $('vxWrap'), e, 12);
    };
    bindTip(hit, svg, show, () => { xh.setAttribute('visibility', 'hidden'); $('vxTip').hidden = true; });
    $('vxLegend').innerHTML = '<span><span class="kl vxk-vix"></span>VIX (implicita, prossimi 30 giorni)</span><span><span class="kl vxk-rv"></span>realizzata delle ultime 21 sedute</span><span><span class="kl vxk-prem"></span>premio per la paura</span><span><span class="kb vxk-high"></span>premio oltre l\'80° percentile della sua storia</span>';
  }

  function bind() {
    document.querySelectorAll('#vxIx button').forEach((b) => b.onclick = () => { st.ix = b.dataset.ix; store.set('vxIx', st.ix); if (model) render(); });
    document.querySelectorAll('#vxRange button').forEach((b) => b.onclick = () => { st.range = b.dataset.range; store.set('vxRange', st.range); if (model) render(); });
  }

  return { bind, render };
}
