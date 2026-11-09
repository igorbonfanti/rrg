/*
 * vix-view.js — vista 8 «VIX»: solo contesto (decisione dell'utente del 06/11/2026), nessuna regola e nessun alert.
 * Idea di Massimo Rea (quant-rea): come vanno le borse dopo che il VIX raggiunge certi livelli, e volatilità implicita
 * contro realizzata. Struttura a termine (VIX/VIX3M) e credito high yield (HYG/IEF): idea di Stefano Serafini (Swiss
 * Capital School, Morning Trading Show di BNP Paribas), solo contesto. Calcoli in vix.js; dati in data/vix.json (scaricato alla prima apertura). Metodo e verifica in
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
    // struttura a termine e credito: sulle sedute dell'S&P 500; con un file senza le serie nuove has3m/hasCredit sono falsi
    out.ctx = out.SPX ? V.context(out.SPX.A, V.vxSeries(data.series.VIX3M), V.vxSeries(data.series.HYGIEF)) : null;
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
    const prov = T.provisional ? ' · provvisorio' : '';
    const kpi = (k, v, s, t) => `<div class="kpi" title="${esc(t)}"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`;
    $('vxKpis').innerHTML = [
      kpi('VIX', fmt(T.vix, 2), `${esc(T.band[2])} · al ${dIT(T.date)}${prov}`, 'Volatilità implicita dell\'S&P 500 per i prossimi 30 giorni (Cboe, da FRED). Fasce: sotto 15 calmo, 15-20 normale, 20-25 nervoso, 25-30 paura, 30-40 paura forte, 40-50 panico, oltre 50 panico estremo.'),
      kpi('Percentile del VIX', `${fmt(T.pct, 0)}°`, `nella storia dal ${dIT(model.SPX.R.from)}`, 'Quota delle chiusure del VIX fino a oggi minori o uguali a quella di oggi (solo storia passata).'),
      kpi('Volatilità realizzata', T.rv == null ? '—' : fmt(T.rv, 1), `S&P 500, 21 sedute al ${dIT(T.date)}, annualizzata`, 'Deviazione standard dei rendimenti logaritmici giornalieri delle ultime 21 sedute, ×√252.'),
      kpi('Premio per la paura', T.prem == null ? '—' : sgnP(T.prem, 1).replace('%', ''), T.premPct == null ? '—' : `VIX − realizzata · ${fmt(T.premPct, 0)}° percentile`, 'Quanto il VIX sta sopra la volatilità delle ultime 21 sedute. Un premio alto da solo non ha annunciato i picchi di volatilità (vedi «Come leggere»).'),
      kpiTerm(kpi), kpiCredit(kpi),
    ].join('');
    const a = data.asOf, after = (f, l) => (f && l && f < l ? ` (FRED al ${dIT(f)}, poi Cboe provvisorio)` : '');
    $('vxMeta').textContent = `VIX al ${dIT(a.vix)}${after(a.fred, a.vix)}${a.vix3m ? ` · VIX3M al ${dIT(a.vix3m)}${after(a.fred3m, a.vix3m)}` : ''}${a.credit ? ` · HYG/IEF al ${dIT(a.credit)}` : ''} · S&P 500 al ${dIT(a.spx)} · Nasdaq-100 al ${dIT(a.ndx)}`;
  }
  function kpiTerm(kpi) {
    const C = model.ctx, t = 'Rapporto tra il VIX (paura per i prossimi 30 giorni) e il VIX3M (prossimi 3 mesi), dal 04/12/2007. Sotto 1 «contango», la situazione normale; da 1 in su «backwardation»: la paura è per i prossimi giorni, succede nei ribassi bruschi. Percentile sulla storia fino a quel giorno. Solo contesto.';
    const r = C && C.now.r;
    if (!C || !C.has3m || !r) return kpi('VIX / VIX3M', '—', 'dato non disponibile', t);
    if (!r.sameDay) return kpi('VIX / VIX3M', '—', `VIX3M del ${dIT(model.today.date)} non ancora arrivato · al ${dIT(r.date)} era ${fmt(r.r, 2)} (${r.state})`, t);
    return kpi('VIX / VIX3M', `${fmt(r.r, 2)} <span class="vxst ${r.state === 'backwardation' ? 'back' : 'cont'}">${r.state}</span>`, `VIX ${fmt(r.vix, 2)} / VIX3M ${fmt(r.v3, 2)} · al ${dIT(r.date)}${r.pct == null ? '' : ` · ${fmt(r.pct, 0)}° percentile`}${r.provisional ? ' · provvisorio' : ''}`, t);
  }
  function kpiCredit(kpi) {
    const C = model.ctx, t = 'Rapporto tra gli ETF HYG (obbligazioni societarie high yield) e IEF (titoli di Stato USA a 7-10 anni), con i dividendi reinvestiti: quanto ha perso dal massimo delle ultime 252 sedute. Vicino a 0 il credito è calmo; molto sotto zero il mercato teme i fallimenti. Il percentile dice quanto è profondo il calo rispetto alla storia fino a quel giorno (alto = più profondo). Non è uno spread ufficiale. Solo contesto.';
    const c = C && C.now.credit;
    if (!C || !C.hasCredit || !c) return kpi('Credito high yield', '—', 'dato non disponibile', t);
    return kpi('Credito high yield', sgnP(c.dd, 1), `HYG/IEF dal massimo di 12 mesi · ${sgnP(c.ch, 1)} in un mese${c.pct == null ? '' : ` · ${fmt(c.pct, 0)}° percentile`} · al ${dIT(c.date)}`, t);
  }

  // ---------- tabella dei regimi ----------
  function renderTable() {
    const m = model[st.ix];
    if (!m) { $('vxTable').innerHTML = ''; return; }
    const { R } = m;
    const cell = (d) => (d.n ? `<span class="vxpos">${d.posN}/${d.n}</span> <b>${sgnP(d.median, 1)}</b>` : '<span class="muted">—</span>');
    const head = `<thead><tr><th>VIX chiude a (o sopra)</th><th class="r">episodi</th>${V.HS.map((h) => `<th class="r h${h}">${HL[h]}<br><small>positivi · mediana</small></th>`).join('')}<th class="r">calo dopo<br><small>mediana</small></th><th class="r hmin">minimo dopo<br><small>sedute</small></th></tr></thead>`;
    const base = `<tr class="vxbase"><td>Una seduta qualsiasi</td><td class="r muted">—</td>${V.HS.map((h) => `<td class="r h${h}"><span class="vxpos">${fmt(R.base[h].pos, 0)}%</span> <b>${sgnP(R.base[h].median, 1)}</b></td>`).join('')}<td class="r">${pct(R.base.dd.median, 1)}</td><td class="r muted hmin">—</td></tr>`;
    const rows = V.XS.map((X) => {
      const t = R.thr[X], s = t.stats, on = X === st.thr;
      return `<tr data-x="${X}" class="${on ? 'sel' : ''}" tabindex="0"><td><b>${X}</b>${t.robust ? ' <span class="pill vxrob" title="Supera il criterio deciso prima (almeno 8 episodi, chiaramente meglio della base, in almeno 2 periodi su 3) in tutte le varianti provate (attesa di 21, 63 o 126 sedute sotto la soglia, ingresso lo stesso giorno o quello dopo). Pochi casi: numeri indicativi.">robusto</span>' : ''}</td><td class="r">${t.episodes.length}</td>${V.HS.map((h) => `<td class="r h${h}">${cell(s[h])}</td>`).join('')}<td class="r">${s.dd.median == null ? '—' : pct(s.dd.median, 1)}</td><td class="r hmin">${s.toMin == null ? '—' : fmt(s.toMin, 0)}</td></tr>`;
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
      eps.slice().reverse().map((e) => `<tr><td>${dIT(e.date)}</td><td>${esc(e.crisis || '—')}</td><td class="r">${fmt(e.vix, 1)}</td><td class="r hmin">${fmt(e.vixMax, 1)}</td>${V.HS.map((h) => `<td class="r h${h} ${e.ret[h] == null ? 'muted' : Math.abs(e.ret[h]) < 0.05 ? '' : e.ret[h] > 0 ? 'up' : 'down'}">${e.ret[h] == null ? 'in corso' : sgnP(e.ret[h], 1)}</td>`).join('')}<td class="r">${e.dd == null ? '—' : pct(e.dd, 1)}${e.partial && e.dd != null ? '<span class="loc" title="meno di 12 mesi di dati dopo il segnale: calo fino a oggi">*</span>' : ''}</td></tr>`).join('') + '</tbody>';
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
    $('vxScMeta').textContent = `${IXN[st.ix]} · ogni punto è una seduta con il VIX a 30 o più · in orizzontale il VIX, in verticale il rendimento a 12 mesi dalla chiusura della seduta dopo`;
    $('vxScNote').innerHTML = `<b>Giorni contro episodi.</b> ${pts.length} sedute, positive dopo 12 mesi ${posD} (${fmt((100 * posD) / pts.length, 0)}%); ma vengono da ${byEp.size} episodi con già 12 mesi di dati, positivi ${posE} su ${e30.length}, e i due episodi più lunghi da soli fanno ${fmt((100 * top2) / pts.length, 0)}% dei punti. Sopra 50: ${hi.length} sedute da ${hiEp.size} ${hiEp.size === 1 ? 'episodio' : 'episodi'}. Contare i giorni dà più peso alle crisi lunghe: la tabella conta gli episodi.${open ? ` ${open} ${open === 1 ? 'seduta recente non ha' : 'sedute recenti non hanno'} ancora 12 mesi di dati e non ${open === 1 ? 'è disegnata' : 'sono disegnate'}.` : ''}`;
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
    const C = model.ctx, has3 = !!(C && C.has3m), hasC = !!(C && C.hasCredit);
    const P = [{ h: 230, title: narrow ? 'VIX E REALIZZATA (21 SEDUTE)' : 'VIX E VOLATILITÀ REALIZZATA DELL\'S&P 500 (21 SEDUTE, ANNUALIZZATA)' }, { h: 110, title: narrow ? 'PREMIO PER LA PAURA' : 'PREMIO PER LA PAURA (VIX − REALIZZATA)' }];
    if (has3) P.push({ h: 110, key: 'r', title: narrow ? 'VIX / VIX3M' : 'STRUTTURA A TERMINE: VIX / VIX3M (DA 1 IN SU BACKWARDATION)' });
    if (hasC) P.push({ h: 90, key: 'c', title: narrow ? 'CREDITO: HYG/IEF DAL MASSIMO' : 'CREDITO HIGH YIELD: HYG CONTRO IEF, DISTANZA DAL MASSIMO DI 12 MESI (%)' });
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
    const st0 = hi0 > 70 ? 20 : 10;
    for (let v = st0; v < hi0; v += st0) { el('line', { x1: L, x2: L + PW, y1: f0(v), y2: f0(v), class: 'gridl' }, svg); el('text', { x: L + PW + 4, y: f0(v) + 3, class: 'axt' }, svg).textContent = String(v); }
    el('path', { d: path(T0.rvSeries, f0), class: 'vxrv' }, svg);
    el('path', { d: path(A.vix, f0), class: 'vxvix' }, svg);
    // 2. premio, con le sedute oltre l'80° percentile (storia fino a quel giorno)
    const P1 = P[1], pv = vis(T0.premSeries), lo1 = Math.min(-10, ...pv), hi1 = Math.max(10, ...pv), f1 = sy(P1, lo1, hi1);
    // fasce (sedute consecutive in cui test è vero), dal primo giorno visibile: niente segni d'ingresso sul bordo
    const bands = (p, test, cls) => {
      let s = null, prev = null;
      const flush = () => { if (s != null) el('rect', { x: x(s), y: p.y0, width: Math.max(1, x(prev) - x(s)), height: p.h, class: cls }, svg); s = null; };
      for (let i = 0; i < n; i++) { if (!inWin(dates[i])) continue; if (test(i)) { if (s == null) s = dates[i]; prev = dates[i]; } else if (s != null) flush(); }
      if (s != null) flush();
    };
    // parte del periodo prima che la serie esista: fascia grigia con la data d'inizio
    const noData = (p, first, label) => {
      if (!first || Date.parse(first) <= t0) return;
      const xe = Math.min(L + PW, x(first));
      el('rect', { x: L, y: p.y0, width: xe - L, height: p.h, class: 'vxnodata' }, svg);
      if (xe - L > 90) el('text', { x: L + (xe - L) / 2, y: p.y0 + p.h / 2 + 3, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = label;
    };
    const step = (span, h) => [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50].find((k) => (h * k) / span >= 22) || 100;
    bands(P1, (i) => T0.premPctSeries[i] != null && T0.premPctSeries[i] >= 80, 'vxhigh');
    el('line', { x1: L, x2: L + PW, y1: f1(0), y2: f1(0), class: 'vxzero' }, svg);
    const st1 = hi1 - lo1 > 50 ? 20 : 10;
    for (let v = Math.ceil(lo1 / st1) * st1; v < hi1; v += st1) el('text', { x: L + PW + 4, y: f1(v) + 3, class: 'axt' }, svg).textContent = (v > 0 ? '+' : '') + v;
    el('path', { d: path(T0.premSeries, f1), class: 'vxprem' }, svg);
    // 3. struttura a termine: R = VIX/VIX3M, fasce di backwardation, linea a 1, punto sull'ultimo valore
    const PR = P.find((p) => p.key === 'r');
    if (PR) {
      const rv = vis(C.r), first = dates[C.r.findIndex((v) => v != null)];
      noData(PR, first, `VIX3M dal ${dIT(C.from3m)}`);
      if (rv.length) {
        const lo = Math.min(0.8, ...rv) - 0.02, hi = Math.max(1.2, ...rv) + 0.02, fr = sy(PR, lo, hi), k = step(hi - lo, PR.h);
        bands(PR, (i) => C.r[i] != null && C.r[i] >= 1, 'vxback');
        for (let v = Math.ceil(lo / k) * k; v < hi; v += k) el('text', { x: L + PW + 4, y: fr(v) + 3, class: 'axt' }, svg).textContent = fmt(v, k < 0.1 ? 2 : 1);
        el('line', { x1: Math.max(L, Math.min(L + PW, x(first))), x2: L + PW, y1: fr(1), y2: fr(1), class: 'vxone' }, svg);
        el('path', { d: path(C.r, fr), class: 'vxr' }, svg);
        const tl = C.now.r && n - 1 - [...C.r].reverse().findIndex((v) => v != null);
        if (C.now.r && inWin(dates[tl])) el('circle', { cx: x(dates[tl]), cy: fr(C.r[tl]), r: 3.2, class: `vxrdot${C.r[tl] >= 1 ? ' back' : ''}` }, svg);
      }
    }
    // 4. credito: distanza di HYG/IEF dal massimo di 252 sedute (0 in alto)
    const PC = P.find((p) => p.key === 'c');
    if (PC) {
      const cv = vis(C.dd), first = dates[C.dd.findIndex((v) => v != null)];
      noData(PC, first, `HYG/IEF dal ${dIT(first)}`);
      if (cv.length) {
        const lo = Math.min(-5, ...cv) * 1.04, hi = Math.max(0, ...cv) + (0 - lo) * 0.04, fc = sy(PC, lo, hi), k = step(hi - lo, PC.h);
        el('line', { x1: Math.max(L, Math.min(L + PW, x(first))), x2: L + PW, y1: fc(0), y2: fc(0), class: 'vxzero' }, svg);
        for (let v = 0; v > lo; v -= k) el('text', { x: L + PW + 4, y: fc(v) + 3, class: 'axt' }, svg).textContent = v === 0 ? '0' : fmt(v, 0);
        el('path', { d: path(C.dd, fc), class: 'vxcr' }, svg);
      }
    }
    // riquadro dei valori
    let i0 = 0; while (i0 < n - 1 && !inWin(dates[i0])) i0++;
    const yEnd = P[P.length - 1].y1;
    const xh = el('line', { x1: 0, x2: 0, y1: P[0].y0, y2: yEnd, class: 'xhair', visibility: 'hidden' }, svg);
    const hit = el('rect', { x: L, y: P[0].y0, width: PW + R, height: yEnd - P[0].y0, fill: 'transparent' }, svg);
    const show = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      const tq = t0 + ((Math.max(L, Math.min(L + PW, q.x)) - L) / PW) * (t1 - t0);
      let i = i0; while (i + 1 < n && Date.parse(dates[i + 1]) <= tq) i++;
      const xx = x(dates[i]); xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.setAttribute('visibility', 'visible');
      const prov = A.fred && dates[i] > A.fred && A.vix[i] != null ? ' <span class="muted">provv.</span>' : '';
      const v3 = has3 ? C.v3[i] : null, p3 = has3 && v3 != null && model.ctx.provisional(i) ? ' <span class="muted">provv.</span>' : '';
      const extra = (has3 ? `<div class="row"><span>VIX3M</span><b>${v3 == null ? '—' : fmt(v3, 2) + p3}</b></div>
        <div class="row"><span>VIX / VIX3M</span><b>${C.r[i] == null ? '—' : `${fmt(C.r[i], 2)} ${C.r[i] >= 1 ? 'backwardation' : 'contango'}`}</b></div>` : '') +
        (hasC ? `<div class="row"><span>HYG/IEF dal massimo 12 mesi</span><b>${sgnP(C.dd[i], 1)}</b></div>` : '');
      $('vxTip').innerHTML = `<div class="row"><b>${dIT(dates[i])}</b><span>S&amp;P 500 ${fmt(A.close[i], 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</span></div>
        <div class="row"><span>VIX</span><b>${A.vix[i] == null ? '—' : fmt(A.vix[i], 2) + prov}</b></div>
        <div class="row"><span>Realizzata 21 sedute</span><b>${T0.rvSeries[i] == null ? '—' : fmt(T0.rvSeries[i], 1)}</b></div>
        <div class="row"><span>Premio per la paura</span><b>${T0.premSeries[i] == null ? '—' : sgnP(T0.premSeries[i], 1).replace('%', '')}</b></div>
        <div class="row"><span>Percentile del premio</span><b>${T0.premPctSeries[i] == null ? '—' : fmt(T0.premPctSeries[i], 0) + '°'}</b></div>${extra}`;
      placeTip($('vxTip'), $('vxWrap'), e, 12);
    };
    bindTip(hit, svg, show, () => { xh.setAttribute('visibility', 'hidden'); $('vxTip').hidden = true; });
    $('vxLegend').innerHTML = '<span><span class="kl vxk-vix"></span>VIX (implicita, prossimi 30 giorni)</span><span><span class="kl vxk-rv"></span>realizzata delle ultime 21 sedute</span><span><span class="kl vxk-prem"></span>premio per la paura</span><span><span class="kb vxk-high"></span>premio oltre l\'80° percentile della sua storia</span>' +
      (has3 ? '<span><span class="kl vxk-r"></span>VIX / VIX3M</span><span><span class="kb vxk-back"></span>backwardation (VIX ≥ VIX3M)</span>' : '') +
      (hasC ? '<span><span class="kl vxk-cr"></span>HYG/IEF: distanza dal massimo di 12 mesi</span>' : '');
  }

  function bind() {
    document.querySelectorAll('#vxIx button').forEach((b) => b.onclick = () => { st.ix = b.dataset.ix; store.set('vxIx', st.ix); if (model) render(); });
    document.querySelectorAll('#vxRange button').forEach((b) => b.onclick = () => { st.range = b.dataset.range; store.set('vxRange', st.range); if (model) render(); });
  }

  return { bind, render };
}
