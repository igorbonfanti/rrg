/*
 * vix-view.js — vista 8 «VIX»: solo contesto (decisione dell'utente del 06/11/2026), nessuna regola e nessun alert.
 * Idea di Massimo Rea (quant-rea): come vanno le borse dopo che il VIX raggiunge certi livelli, e volatilità implicita
 * contro realizzata. Struttura a termine (VIX/VIX3M) e credito high yield (HYG/IEF): idea di Stefano Serafini (Swiss
 * Capital School, Morning Trading Show di BNP Paribas), solo contesto. Calcoli in vix.js; dati in data/vix.json (scaricato alla prima apertura). Metodo e verifica in
 * ricerca/vix/ (ramo di sviluppo).
 */
import * as V from './vix.js';
import { esc, fmt, sgnP, pct, dIT, placeTip, bindTip, chartWidth } from './format.js';
import { zoomGroup, timeTicks } from './zoom.js';
import { athRows } from './ath.js';

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

/** @param {{$: Function, store: object, load: () => Promise<object>, loadAth?: () => Promise<object|null>}} ctx */
export function createVix(ctx) {
  const { $, store } = ctx;
  let data = null, loading = null, failed = null, model = null;
  // crisi selezionata nello scatter (alone) e nella tabella degli episodi: chiave del gruppo, non salvata
  let selG = null, zoom = null;
  const st = { ix: ['SPX', 'NDX'].includes(store.get('vxIx')) ? store.get('vxIx') : 'SPX', thr: V.XS.includes(store.get('vxThr')) ? store.get('vxThr') : 40, range: ['3A', '10A', 'MAX'].includes(store.get('vxRange')) ? store.get('vxRange') : '10A' };

  // distanza dal massimo storico (1.10.0): file a parte e facoltativo, se manca il pannello lo dice e il resto funziona
  let ath = null, athOpen = null;
  st.athSort = store.get('athSort') === 'date' ? 'date' : 'dist';
  function ensure() {
    if (!loading) {
      $('vxLoading').hidden = false;
      loading = Promise.all([
        ctx.load().then((d) => { data = d; }).catch((e) => { failed = e; }),
        (ctx.loadAth ? ctx.loadAth() : Promise.resolve(null)).then((d) => { ath = d; }).catch(() => { ath = null; }),
      ]).finally(() => { $('vxLoading').hidden = true; });
    }
    return loading;
  }
  function build() {
    const vix = V.vxSeries(data.series.VIX), out = { vix };
    for (const k of ['SPX', 'NDX']) {
      const s = V.vxSeries(data.series[k]);
      if (!vix || !s) { out[k] = null; continue; }
      const A = V.align(s, vix);
      const S = V.scatter(A);
      out[k] = { A, R: V.regimes(A), S, G: groupsOf(S) };
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
    renderKpis(); renderTable(); renderScatter(); renderChart(); renderAth();
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
      kpi('VIX', fmt(T.vix, 2), `${esc(T.band[2])} · al ${dIT(T.date)}${prov}`, 'Volatilità implicita dell\'S&P 500 per i prossimi 30 giorni (Cboe, da FRED). Fasce: sotto 15 calmo, 15-20 normale, 20-25 nervoso, 25-30 paura, 30-40 paura forte, 40-50 panico, oltre 50 panico estremo.' + PROV),
      kpi('Percentile del VIX', `${fmt(T.pct, 0)}°`, `nella storia dal ${dIT(model.SPX.R.from)}`, 'Quota delle chiusure del VIX fino a oggi minori o uguali a quella di oggi (solo storia passata).'),
      kpi('Volatilità realizzata', T.rv == null ? '—' : fmt(T.rv, 1), `S&P 500, 21 sedute al ${dIT(T.date)}, annualizzata`, 'Deviazione standard dei rendimenti logaritmici giornalieri delle ultime 21 sedute, ×√252.'),
      kpi('Premio per la paura', T.prem == null ? '—' : sgnP(T.prem, 1).replace('%', ''), T.premPct == null ? '—' : `VIX − realizzata · ${fmt(T.premPct, 0)}° percentile`, 'Quanto il VIX sta sopra la volatilità delle ultime 21 sedute. Un premio alto da solo non ha annunciato i picchi di volatilità (vedi «Come leggere»).'),
      kpiTerm(kpi), kpiCredit(kpi),
    ].join('');
    const a = data.asOf, after = (f, l, src) => (f && l && f < l ? ` (FRED al ${dIT(f)}, poi ${src === 'Cboe' || src === 'Yahoo' ? src : 'Cboe o Yahoo'}, provvisorio)` : '');
    $('vxMeta').textContent = `VIX al ${dIT(a.vix)}${after(a.fred, a.vix, a.vixSrc)}${a.vix3m ? ` · VIX3M al ${dIT(a.vix3m)}${after(a.fred3m, a.vix3m, a.vix3mSrc)}` : ''}${a.credit ? ` · HYG/IEF al ${dIT(a.credit)}` : ''} · S&P 500 al ${dIT(a.spx)} · Nasdaq-100 al ${dIT(a.ndx)}`;
  }
  const PROV = ' «Provvisorio»: FRED pubblica la seduta la mattina dopo; fino ad allora il valore viene dal file di Cboe (o da Yahoo) e di solito la corsa della sera dopo lo sostituisce.';
  // rapporto con 2 decimali, 3 vicino a 1 (0,996 non deve leggersi «1,00 contango»)
  const fr = (r) => (Math.abs(r - 1) < 0.005 ? fmt(r < 1 ? Math.floor(r * 1000) / 1000 : r, 3) : fmt(r, 2)); // sotto 1 si tronca: mai «1,000 contango»
  function kpiTerm(kpi) {
    const C = model.ctx, t = 'Rapporto tra il VIX (paura per i prossimi 30 giorni) e il VIX3M (prossimi 3 mesi), dal 04/12/2007. Sotto 1 «contango», la situazione normale; da 1 in su «backwardation»: la paura è per i prossimi giorni, succede nei ribassi bruschi. Percentile sulla storia fino a quel giorno. Solo contesto.' + PROV;
    const r = C && C.now.r;
    if (!C || !C.has3m || !r) return kpi('VIX / VIX3M', '—', 'dato non disponibile', t);
    if (!r.sameDay) return kpi('VIX / VIX3M', '—', `VIX3M del ${dIT(model.today.date)} non ancora arrivato · al ${dIT(r.date)} era ${fr(r.r)} (${r.state})`, t);
    return kpi('VIX / VIX3M', `${fr(r.r)} <span class="vxst ${r.state === 'backwardation' ? 'back' : 'cont'}">${r.state}</span>`, `VIX ${fmt(r.vix, 2)} / VIX3M ${fmt(r.v3, 2)} · al ${dIT(r.date)}${r.pct == null ? '' : ` · ${fmt(r.pct, 0)}° percentile`}${r.provisional ? ' · provvisorio' : ''}`, t);
  }
  function kpiCredit(kpi) {
    const C = model.ctx, t = 'Rapporto tra gli ETF HYG (obbligazioni societarie high yield) e IEF (titoli di Stato USA a 7-10 anni), con i dividendi reinvestiti: quanto ha perso dal massimo delle ultime 252 sedute. Vicino a 0 il credito è calmo; molto sotto zero il mercato teme i fallimenti. Il percentile dice quanto è profondo il calo rispetto alla storia fino a quel giorno (alto = più profondo). Non è uno spread ufficiale. Solo contesto.';
    const c = C && C.now.credit;
    if (!C || !C.hasCredit || !c) return kpi('Credito high yield', '—', 'dato non disponibile', t);
    // come per il VIX3M: un credito più vecchio del VIX non si mostra come se fosse di oggi
    if (c.date < model.today.date) return kpi('Credito high yield', '—', `HYG/IEF del ${dIT(model.today.date)} non ancora arrivato · al ${dIT(c.date)} era ${sgnP(c.dd, 1)} dal massimo`, t);
    return kpi('Credito high yield', sgnP(c.dd, 1), `HYG/IEF dal massimo di 12 mesi · ${sgnP(c.ch, 1)} in un mese${c.pct == null ? '' : ` · ${fmt(c.pct, 0)}° percentile del calo (alto = più profondo)`} · al ${dIT(c.date)}`, t);
  }

  // ---------- mini-grafico di un episodio: il VIX da 63 sedute prima del primo giorno a 21 dopo l'ultimo giorno a X o più,
  // con la soglia (tratteggio), i tratti a X o più colorati, il primo giorno (punto pieno), il massimo (cerchio) e la fine (tacca)
  function spark(A, e, X) {
    const n = A.vix.length, i0 = Math.max(0, e.p - 63), i1 = Math.min(n - 1, e.endP + 21), W = 150, H = 38, pad = 3;
    let hi = X; for (let i = i0; i <= i1; i++) if (A.vix[i] != null && A.vix[i] > hi) hi = A.vix[i];
    hi *= 1.06;
    const sx = (i) => pad + ((i - i0) / Math.max(1, i1 - i0)) * (W - 2 * pad), sy = (v) => H - pad - (v / hi) * (H - 2 * pad);
    let d = '', dh = '', on = false;
    for (let i = i0; i <= i1; i++) {
      const v = A.vix[i]; if (v == null) { on = false; continue; }
      d += (on ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); on = true;
      if (v >= X && i >= e.p && i <= e.endP) { const pv = A.vix[i - 1]; dh += (pv != null && pv >= X && i > e.p ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); if (!(i + 1 <= e.endP && A.vix[i + 1] != null && A.vix[i + 1] >= X)) dh += 'h0.01'; }
    }
    const im = A.dates.indexOf(e.maxDate, e.p);
    const open = e.endP + 63 > n - 1, pv = A.fred && e.end > A.fred ? ' (provvisorio)' : '';
    const t = `VIX da ${dIT(A.dates[i0])}: ${fmt(A.vix[i0], 1)}; primo giorno a ${X} o più il ${dIT(e.date)} (${fmt(e.vix, 1)}); massimo ${fmt(e.vixMax, 1)} il ${dIT(e.maxDate)}; ${open ? `episodio in corso, ultimo giorno a ${X} o più finora il ${dIT(e.end)}${pv}` : `ultimo giorno a ${X} o più il ${dIT(e.end)}; poi fino al ${dIT(A.dates[i1])}: ${fmt(A.vix[i1], 1)}`}`;
    return `<svg class="vxsp" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t)}"><title>${esc(t)}</title><line x1="${pad}" x2="${W - pad}" y1="${sy(X).toFixed(1)}" y2="${sy(X).toFixed(1)}" class="vxsp-t"/><path d="${d}" class="vxsp-l"/><path d="${dh}" class="vxsp-h"/><line x1="${sx(e.endP).toFixed(1)}" x2="${sx(e.endP).toFixed(1)}" y1="${(sy(A.vix[e.endP]) - 4).toFixed(1)}" y2="${(sy(A.vix[e.endP]) + 4).toFixed(1)}" class="vxsp-e"/><circle cx="${sx(im).toFixed(1)}" cy="${sy(e.vixMax).toFixed(1)}" r="2.6" class="vxsp-m"/><circle cx="${sx(e.p).toFixed(1)}" cy="${sy(e.vix).toFixed(1)}" r="2.4" class="vxsp-s"/></svg>`;
  }

  // ---------- tabella dei regimi ----------
  function renderTable() {
    const m = model[st.ix];
    if (!m) { $('vxTable').innerHTML = ''; return; }
    const { R } = m;
    const cell = (d) => (d.n ? `<span class="vxpos">${d.posN}/${d.n}</span> <b>${sgnP(d.median, 1)}</b>` : '<span class="muted">—</span>');
    const head = `<thead><tr><th>VIX chiude a (o più)</th><th class="r">episodi</th>${V.HS.map((h) => `<th class="r h${h}">${HL[h]}<br><small>positivi · mediana</small></th>`).join('')}<th class="r">calo dopo<br><small>mediana</small></th><th class="r hmin">minimo dopo<br><small>sedute</small></th></tr></thead>`;
    const base = `<tr class="vxbase"><td>Una seduta qualsiasi</td><td class="r muted">—</td>${V.HS.map((h) => `<td class="r h${h}"><span class="vxpos">${fmt(R.base[h].pos, 0)}%</span> <b>${sgnP(R.base[h].median, 1)}</b></td>`).join('')}<td class="r">${pct(R.base.dd.median, 1)}</td><td class="r muted hmin">—</td></tr>`;
    const rows = V.XS.map((X) => {
      const t = R.thr[X], s = t.stats, on = X === st.thr;
      return `<tr data-x="${X}" class="${on ? 'sel' : ''}" tabindex="0"><td><b>${X}</b>${t.robust ? ' <span class="pill vxrob" title="Supera il criterio deciso prima (almeno 8 episodi, chiaramente meglio della base, in almeno 2 periodi su 3) in tutte le varianti provate (attesa di 21, 63 o 126 sedute sotto la soglia, ingresso lo stesso giorno o quello dopo). Pochi casi: numeri indicativi.">robusto</span>' : ''}</td><td class="r">${t.episodes.length}</td>${V.HS.map((h) => `<td class="r h${h}">${cell(s[h])}</td>`).join('')}<td class="r">${s.dd.median == null ? '—' : pct(s.dd.median, 1)}</td><td class="r hmin">${s.toMin == null ? '—' : fmt(s.toMin, 0)}</td></tr>`;
    }).join('');
    $('vxTable').innerHTML = head + `<tbody>${base}${rows}</tbody>`;
    $('vxTable').querySelectorAll('tbody tr[data-x]').forEach((tr) => {
      const go = () => { st.thr = +tr.dataset.x; store.set('vxThr', st.thr); renderTable(); renderScatter(); renderChart(); }; // punti grandi e fasce seguono la soglia
      tr.onclick = go; tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); const n = $('vxTable').querySelector(`tr[data-x="${st.thr}"]`); if (n) n.focus(); } };
    });
    $('vxTableMeta').textContent = `${IXN[st.ix]} · solo prezzo · dal ${dIT(R.from)} · ingresso alla chiusura della seduta dopo il segnale`;
    // episodi della soglia scelta
    const eps = R.thr[st.thr].episodes, G = m.G;
    $('vxEpsTitle').textContent = `Episodi con il VIX a ${st.thr} o più · ${IXN[st.ix]}`;
    $('vxScBig').textContent = st.thr >= 30 ? `il primo giorno di ogni episodio con il VIX a ${st.thr} o più, lo stesso della colonna «Primo giorno a ${st.thr} o più» della tabella (gli episodi senza ancora 12 mesi di dati non hanno punti)` : `il primo giorno di ogni episodio a 30 o più (episodi calcolati con la soglia 30, perché lo scatter mostra solo le sedute a 30 o più: un episodio a ${st.thr} della tabella può non contenerne nessuno o contenerne più d'uno)`;
    $('vxEps').innerHTML = `<thead><tr><th title="Primo giorno dell'episodio: la prima chiusura del VIX a ${st.thr} o più dopo almeno 63 sedute sotto">Primo giorno a ${st.thr} o più</th><th>Crisi</th><th class="vxspc" title="Il VIX da 3 mesi prima del primo giorno a un mese dopo l'ultimo giorno a ${st.thr} o più: linea tratteggiata la soglia, colorati i tratti a ${st.thr} o più, punto pieno il primo giorno, cerchio il massimo, tacca l'ultimo giorno. Ogni mini-grafico ha la sua scala di tempo e di valori: per confrontare la durata guarda il numero di sedute">Andamento del VIX</th><th class="r" title="Chiusura del VIX nel primo giorno dell'episodio">VIX quel giorno</th><th class="r hmin" title="Chiusura più alta del VIX nell'episodio, con la sua data. Un episodio finisce solo quando il VIX resta sotto la soglia per 63 sedute di fila: alle soglie basse può durare anni e comprendere più crisi">VIX massimo</th><th class="hend" title="Ultima chiusura del VIX a ${st.thr} o più prima di 63 sedute di fila sotto (l'episodio in corso non è ancora finito)">Ultimo giorno a ${st.thr} o più</th><th class="r hend" title="Sedute dal primo all'ultimo giorno a ${st.thr} o più (in mezzo il VIX può essere sceso sotto la soglia)">Sedute</th>${V.HS.map((h) => `<th class="r h${h}">${HL[h]}</th>`).join('')}<th class="r">calo dopo</th></tr></thead><tbody>` +
      eps.slice().reverse().map((e) => { const g = G.ofRow(e), open = e.endP + 63 > m.A.vix.length - 1, pv = m.A.fred && e.end > m.A.fred ? ' provv.' : ''; return `<tr${g ? ` data-g="${esc(g.key)}" class="vxgrow g${g.c}" tabindex="0" role="button" aria-pressed="false" title="Clic per evidenziare la crisi nello scatter"` : ' class="gnone"'}><td>${dIT(e.date)}</td><td>${g ? '<span class="kd"></span>' : ''}${esc(e.crisis || '—')}<small class="vxmob">massimo ${fmt(e.vixMax, 1)} il ${dIT(e.maxDate)} · ${open ? 'in corso' : `fino al ${dIT(e.end)}`} · ${fmt(e.sessions, 0)} ${e.sessions === 1 ? 'seduta' : 'sedute'}</small></td><td class="vxspc">${spark(m.A, e, st.thr)}</td><td class="r">${fmt(e.vix, 1)}</td><td class="r hmin">${fmt(e.vixMax, 1)} <small class="muted">${dIT(e.maxDate)}</small></td><td class="hend">${open ? `<span class="muted" title="Episodio in corso: non ancora 63 sedute sotto la soglia, può continuare${pv ? '; l\'ultima seduta è provvisoria (non ancora su FRED)' : ''}">${dIT(e.end)}*${pv}</span>` : dIT(e.end)}</td><td class="r hend">${fmt(e.sessions, 0)}</td>${V.HS.map((h) => `<td class="r h${h} ${e.ret[h] == null ? 'muted' : Math.abs(e.ret[h]) < 0.05 ? '' : e.ret[h] > 0 ? 'up' : 'down'}">${e.ret[h] == null ? 'in corso' : sgnP(e.ret[h], 1)}</td>`).join('')}<td class="r">${e.dd == null ? '—' : pct(e.dd, 1)}${e.partial && e.dd != null ? '<span class="loc" title="meno di 12 mesi di dati dopo il segnale: calo fino a oggi">*</span>' : ''}</td></tr>`; }).join('') + '</tbody>';
    $('vxEps').querySelectorAll('tr[data-g]').forEach((tr) => { const go = () => { select(selG === tr.dataset.g ? null : tr.dataset.g); if (selG) { const r = $('vxScatter').getBoundingClientRect(); if (r.top > innerHeight - 120 || r.bottom < 120) $('vxScatter').scrollIntoView({ block: 'center', behavior: 'smooth' }); } }; tr.onclick = go; tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
    markRows();
  }

  // ---------- scatter in stile Rea (giorni con il VIX ≥ 30) ----------
  // Gruppi: ogni seduta va con la crisi dell'elenco CRISES in cui cade la sua data; se la data non è in nessuna crisi, con
  // la crisi del suo episodio; se neanche l'episodio è in una crisi, con l'episodio da solo («Altro episodio · MM/AAAA»).
  // Solo gruppi con punti; colori in ordine di tempo da una tavolozza di 16 (ricerca/vix/scatter/tavolozza.py).
  function groupsOf(S) {
    const epKey = (e) => e.crisis || `ep:${e.date}`, epByDate = new Map(S.eps.map((e) => [e.date, e]));
    const keyOfPt = (p) => p.crisis || (epByDate.has(p.ep) ? epKey(epByDate.get(p.ep)) : null);
    const byKey = new Map(), byPt = new Map(), list = [];
    for (const p of S.pts.slice().sort((a, b) => (a.date < b.date ? -1 : 1))) {
      const key = keyOfPt(p); if (!key) continue;
      if (!byKey.has(key)) { const e = key.startsWith('ep:') ? epByDate.get(key.slice(3)) : null; const g = { key, label: e ? `Altro episodio · ${dIT(e.date).slice(3)}` : key, crisis: !e, c: list.length % 16, n: 0 }; byKey.set(key, g); list.push(g); }
      const g = byKey.get(key); g.n++; byPt.set(p.date, g);
    }
    // riga della tabella (episodio a un'altra soglia): la sua crisi, altrimenti il gruppo dell'episodio sopra 30 in corso quel
    // giorno; nessun gruppo (riga non cliccabile) se quel gruppo non ha punti nello scatter
    const ofRow = (e) => {
      if (e.crisis) return byKey.get(e.crisis) || null;
      let x = null; for (const y of S.eps) if (y.p <= e.p && e.date <= (y.end || y.date)) x = y;
      return x ? byKey.get(epKey(x)) || null : null;
    };
    return { list, byKey, ofPt: (p) => byPt.get(p.date) || null, ofRow };
  }
  function select(key) {
    selG = key;
    paintScatter(); markRows();
  }
  function markRows() {
    document.querySelectorAll('#vxEps tr[data-g]').forEach((tr) => { tr.classList.toggle('sel', tr.dataset.g === selG); tr.setAttribute('aria-pressed', String(tr.dataset.g === selG)); });
    const m = model && model[st.ix], g = m && selG ? m.G.byKey.get(selG) : null;
    const none = g && !document.querySelector(`#vxEps tr.sel`);
    $('vxEpsNone').hidden = !none;
    if (none) $('vxEpsNone').textContent = `${g.label}: nella tabella sopra non ci sono episodi del VIX a ${st.thr} o più ${g.crisis ? 'in questa crisi' : 'in questo periodo'}.`;
  }
  let paintScatter = () => {};
  function renderScatter() {
    const svg = $('vxScatter'), m = model[st.ix];
    svg.innerHTML = '';
    if (!m) return;
    const { pts, eps, open } = m.S, G = m.G;
    if (selG && !G.byKey.has(selG)) selG = null;
    const W = chartWidth(svg, 1800), H = Math.round(Math.min(520, Math.max(260, W * 0.36))), L = 44, R = 12, T = 10, B = 30, PW = W - L - R, PH = H - T - B;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    const xmax = Math.max(60, Math.ceil(Math.max(...pts.map((p) => p.vix)) / 10) * 10), xmin = 30;
    const ys = pts.map((p) => p.ret), ymin = Math.min(-50, Math.floor(Math.min(...ys) / 10) * 10), ymax = Math.max(60, Math.ceil(Math.max(...ys) / 10) * 10);
    const sx = (v) => L + ((v - xmin) / (xmax - xmin)) * PW, sy = (v) => T + ((ymax - v) / (ymax - ymin)) * PH;
    el('rect', { x: L, y: T, width: PW, height: PH, class: 'frame' }, svg);
    for (let v = xmin; v <= xmax; v += 10) { el('line', { x1: sx(v), x2: sx(v), y1: T, y2: T + PH, class: v === 40 || v === 50 ? 'vxthr' : 'gridl' }, svg); el('text', { x: sx(v), y: H - 12, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = String(v); }
    for (let v = Math.ceil(ymin / 20) * 20; v <= ymax; v += 20) { el('line', { x1: L, x2: L + PW, y1: sy(v), y2: sy(v), class: v === 0 ? 'vxzero' : 'gridl' }, svg); el('text', { x: L - 4, y: sy(v) + 3, class: 'axt', 'text-anchor': 'end' }, svg).textContent = (v > 0 ? '+' : '') + v + '%'; }
    el('rect', { x: L, y: T, width: PW, height: PH }, el('clipPath', { id: 'vxScClip' }, el('defs', {}, svg)));
    const halo = el('g', { class: 'vxhalos' }, svg), dots = el('g', { class: 'vxdots' }, svg);
    const gOf = (p) => G.ofPt(p);
    // punti grandi: primo giorno degli episodi della soglia scelta nella tabella (30 se la soglia è più bassa: lo scatter
    // mostra solo le sedute con il VIX a 30 o più), così coincidono con la colonna «Sopra X dal» della tabella
    const XB = Math.max(30, st.thr), epsB = XB === 30 ? eps : m.R.thr[XB].episodes, big = new Set(epsB.map((e) => e.date));
    const inEp = (list, p) => { let r = null; for (const e of list) if (e.date <= p.date && p.date <= (e.end || e.date)) r = e; return r; };
    for (const p of [...pts.filter((q) => !big.has(q.date)), ...pts.filter((q) => big.has(q.date))]) { const g = gOf(p), b = big.has(p.date); el('circle', { cx: sx(p.vix).toFixed(1), cy: sy(p.ret).toFixed(1), r: b ? 5.5 : 2.1, class: `vxpt g${g ? g.c : 0}${b ? ' start' : ''}`, 'data-g': g ? g.key : '', 'data-d': p.date }, dots); }
    paintScatter = () => {
      halo.innerHTML = '';
      svg.classList.toggle('vxsel', !!selG);
      dots.querySelectorAll('circle').forEach((c) => c.classList.toggle('on', c.dataset.g === selG));
      const g = selG && G.byKey.get(selG);
      if (g) {
        // alone: un cerchio largo attorno a ogni punto della crisi, disegnati insieme con un'unica trasparenza (dove si
        // sovrappongono non si scuriscono): la forma segue i punti invece di un poligono che copre anche le zone vuote
        const hg = el('g', { class: `vxhalo g${g.c}`, 'clip-path': 'url(#vxScClip)' }, halo), r = Math.max(10, Math.min(28, PW / 45));
        for (const p of pts) if (gOf(p) === g) el('circle', { cx: sx(p.vix).toFixed(1), cy: sy(p.ret).toFixed(1), r }, hg);
      }
      document.querySelectorAll('#vxCrises button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === selG)));
    };
    // riquadro dei valori: il punto più vicino; clic (o tocco) su un punto: evidenzia la sua crisi, su un punto vuoto: toglie
    const hit = el('rect', { x: L, y: T, width: PW, height: PH, fill: 'transparent' }, svg);
    const ring = el('circle', { r: 7, class: 'vxring', visibility: 'hidden' }, svg);
    const nearest = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      let best = null, bd = Infinity;
      for (const p of pts) { const d = (sx(p.vix) - q.x) ** 2 + (sy(p.ret) - q.y) ** 2; if (d < bd) { bd = d; best = p; } }
      return bd <= 400 ? best : null;
    };
    const show = (e) => {
      const best = nearest(e);
      if (!best) { $('vxScTip').hidden = true; ring.setAttribute('visibility', 'hidden'); return; }
      ring.setAttribute('cx', sx(best.vix)); ring.setAttribute('cy', sy(best.ret)); ring.setAttribute('visibility', 'visible');
      const ep = eps.find((x) => x.date === best.ep), g = gOf(best), eB = XB > 30 ? inEp(epsB, best) : null;
      $('vxScTip').innerHTML = `<div class="row"><b>${dIT(best.date)}</b><span>${esc(g ? g.label : '')}</span></div>
        <div class="row"><span>VIX</span><b>${fmt(best.vix, 2)}</b></div>
        <div class="row"><span>${IXN[st.ix]} dopo 12 mesi</span><b>${sgnP(best.ret, 1)}</b></div>
        <div class="row"><span>Episodio a 30 o più iniziato il</span><b>${ep ? dIT(ep.date) : '—'}</b></div>${XB > 30 ? `<div class="row"><span>Episodio a ${XB} o più iniziato il</span><b>${eB ? dIT(eB.date) : '—'}</b></div>` : ''}${big.has(best.date) ? `<div class="row note-row">Primo giorno dell'episodio a ${XB} o più (il punto grande).</div>` : ''}<div class="row note-row">${g && selG === g.key ? 'Crisi evidenziata: clic su un punto vuoto per togliere.' : 'Clic o tocco per evidenziare la crisi.'}</div>`;
      placeTip($('vxScTip'), $('vxScWrap'), e, 12);
    };
    bindTip(hit, svg, show, () => { $('vxScTip').hidden = true; ring.setAttribute('visibility', 'hidden'); });
    // clic su un punto: la sua crisi (resta accesa: sul telefono il tocco serve anche a leggere i valori); su un punto vuoto: toglie
    hit.addEventListener('click', (e) => { const p = nearest(e), g = p && gOf(p); select(g ? g.key : null); if (p) show(e); }); // riquadro aggiornato dopo la scelta
    hit.style.cursor = 'pointer';
    // legenda delle crisi, cliccabile
    $('vxCrises').innerHTML = G.list.map((g) => `<button type="button" class="vxcr-b g${g.c}" data-g="${esc(g.key)}" aria-pressed="false"><span class="kd"></span>${esc(g.label)}</button>`).join('');
    $('vxCrises').querySelectorAll('button').forEach((b) => b.onclick = () => select(selG === b.dataset.g ? null : b.dataset.g));
    paintScatter();
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
    const tEnd = Date.parse(dates[n - 1]), span = st.range === '3A' ? 3 : st.range === '10A' ? 10 : null;
    let t0 = span ? Math.max(Date.parse(dates[0]), tEnd - span * 365.25 * DAY) : Date.parse(dates[0]), t1 = tEnd;
    // zoom su un sottoperiodo (trascinamento sul grafico, js/zoom.js): il tratto scelto dentro il periodo
    const zw = zoom ? zoom.time(t0, t1, dates) : null;
    if (zw) [t0, t1] = zw;
    const x = (d) => L + ((Date.parse(d) - t0) / (t1 - t0)) * PW, inWin = (d) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
    const C = model.ctx, has3 = !!(C && C.has3m), hasC = !!(C && C.hasCredit);
    const MI = model[st.ix] || m, IN = IXN[st.ix] || IXN.SPX, ixAt = new Map(MI.A.dates.map((d, i) => [d, MI.A.close[i]]));
    const P = [{ h: narrow ? 190 : 230, title: narrow ? 'VIX E REALIZZATA S&P 500 (21 SEDUTE)' : 'VIX E VOLATILITÀ REALIZZATA DELL\'S&P 500 (21 SEDUTE, ANNUALIZZATA)' },
      { h: narrow ? 120 : 160, key: 'ix', title: narrow ? `${IN.toUpperCase()} · EPISODI A ${st.thr} O PIÙ` : `${IN.toUpperCase()} (SCALA LOGARITMICA) · IN COLORE GLI EPISODI CON IL VIX A ${st.thr} O PIÙ DELLA TABELLA` },
      { h: narrow ? 90 : 110, key: 'prem', title: narrow ? 'PREMIO PER LA PAURA' : 'PREMIO PER LA PAURA (VIX − REALIZZATA)' }];
    if (has3) P.push({ h: narrow ? 90 : 110, key: 'r', title: narrow ? 'VIX / VIX3M' : 'STRUTTURA A TERMINE: VIX / VIX3M (DA 1 IN SU BACKWARDATION)' });
    if (hasC) P.push({ h: narrow ? 80 : 90, key: 'c', title: narrow ? 'CREDITO: HYG/IEF DAL MASSIMO' : 'CREDITO HIGH YIELD: HYG CONTRO IEF, DISTANZA DAL MASSIMO DI 12 MESI (%)' });
    let y = 4; for (const p of P) { p.y0 = y + 16; p.y1 = p.y0 + p.h; y = p.y1 + 6; }
    const H = y + 16;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    const sy = (p, lo, hi) => (v) => p.y0 + ((hi - v) / (hi - lo)) * p.h;
    const path = (vs, f2) => { let d = '', on = false; for (let i = 0; i < n; i++) { if (vs[i] == null || !inWin(dates[i])) { on = false; continue; } d += (on ? 'L' : 'M') + x(dates[i]).toFixed(1) + ' ' + f2(vs[i]).toFixed(1); on = true; } return d; };
    const vis = (a) => a.filter((v, i) => v != null && inWin(dates[i]));
    for (const p of P) { el('rect', { x: L, y: p.y0, width: PW, height: p.h, class: 'frame' }, svg); el('text', { x: L, y: p.y0 - 5, class: 'pane-t' }, svg).textContent = p.title; }
    for (const tk of timeTicks(t0, t1, narrow ? 4 : 10)) { const xx = L + ((tk.t - t0) / (t1 - t0)) * PW; for (const p of P) el('line', { x1: xx, x2: xx, y1: p.y0, y2: p.y1, class: 'gridl' }, svg); el('text', { x: xx, y: H - 4, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = tk.label; }
    // 1. VIX e realizzata
    const P0 = P[0], hi0 = Math.max(...vis(A.vix), ...vis(T0.rvSeries)) * 1.04, f0 = sy(P0, 0, hi0);
    const st0 = hi0 > 70 ? 20 : 10;
    for (let v = st0; v < hi0; v += st0) { el('line', { x1: L, x2: L + PW, y1: f0(v), y2: f0(v), class: 'gridl' }, svg); el('text', { x: L + PW + 4, y: f0(v) + 3, class: 'axt' }, svg).textContent = String(v); }
    el('path', { d: path(T0.rvSeries, f0), class: 'vxrv' }, svg);
    el('path', { d: path(A.vix, f0), class: 'vxvix' }, svg);
    // 2. indice scelto, scala logaritmica, con le fasce degli episodi della soglia della tabella (dal primo all'ultimo giorno)
    {
      const PI = P.find((p) => p.key === 'ix'), IA = MI.A, xs = [], ys = [];
      IA.dates.forEach((d, i) => { if (IA.close[i] != null && inWin(d)) { xs.push(d); ys.push(IA.close[i]); } });
      if (ys.length) {
        const lo = Math.log(Math.min(...ys)) - 0.03, hi = Math.log(Math.max(...ys)) + 0.03, fi = (v) => PI.y0 + ((hi - Math.log(v)) / (hi - lo)) * PI.h;
        for (const e of MI.R.thr[st.thr].episodes) {
          const a = Math.max(t0, Date.parse(e.date)), b = Math.min(t1, Date.parse(e.end)); if (b < a) continue;
          const g = MI.G.ofRow(e), xa = L + ((a - t0) / (t1 - t0)) * PW, xb = L + ((b - t0) / (t1 - t0)) * PW;
          el('rect', { x: xa.toFixed(1), y: PI.y0, width: Math.max(1.5, xb - xa).toFixed(1), height: PI.h, class: `vxepb ${g ? `g${g.c}` : 'gnone'}` }, svg);
        }
        // etichette dei prezzi: 1, 2, 5 × 10^k distanti almeno 20 px; se troppo poche, anche 1,5 2,5 3 4 6 8
        const vals = []; for (let k = Math.floor(lo / Math.LN10) - 1; k <= Math.ceil(hi / Math.LN10) + 1; k++) for (const mm of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) vals.push(mm * 10 ** k);
        let lastY = Infinity; const inR = vals.filter((v) => Math.log(v) > lo && Math.log(v) < hi);
        const main = inR.filter((v) => [1, 2, 5].includes(+(v / 10 ** Math.floor(Math.log10(v))).toFixed(2)));
        for (const v of (main.length >= 3 ? main : inR)) { const yv = fi(v); if (lastY - yv < 20) continue; lastY = yv; el('line', { x1: L, x2: L + PW, y1: yv, y2: yv, class: 'gridl' }, svg); el('text', { x: L + PW + 4, y: yv + 3, class: 'axt' }, svg).textContent = v >= 1000 ? fmt(v / 1000, v % 1000 ? 1 : 0) + 'k' : fmt(v, 0); }
        let d = '', on = false; IA.dates.forEach((dd, i) => { if (IA.close[i] == null || !inWin(dd)) { on = false; return; } d += (on ? 'L' : 'M') + x(dd).toFixed(1) + ' ' + fi(IA.close[i]).toFixed(1); on = true; });
        el('path', { d, class: 'vxix' }, svg);
      }
    }
    // 3. premio, con le sedute oltre l'80° percentile (storia fino a quel giorno)
    const P1 = P.find((p) => p.key === 'prem'), pv = vis(T0.premSeries), lo1 = Math.min(-10, ...pv), hi1 = Math.max(10, ...pv), f1 = sy(P1, lo1, hi1);
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
      const t = el('text', { x: L + (xe - L) / 2, y: p.y0 + p.h / 2 + 3, class: 'axt', 'text-anchor': 'middle' }, svg);
      t.textContent = label;
      if (t.getComputedTextLength() > xe - L - 8) t.textContent = `dal ${first.slice(0, 4)}`; // sul telefono la scritta corta
      if (t.getComputedTextLength() > xe - L - 8) t.remove(); // la scritta solo se entra nella fascia
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
        const lo = Math.min(0.8, ...rv) - 0.02, hi = Math.max(1.2, ...rv) + 0.02, fy = sy(PR, lo, hi), k = step(hi - lo, PR.h);
        bands(PR, (i) => C.r[i] != null && C.r[i] >= 1, 'vxback');
        const dec = Math.abs(k * 10 - Math.round(k * 10)) > 1e-9 ? 2 : 1; // passo 0,05 o 0,25: due decimali
        for (let v = Math.ceil(lo / k) * k; v < hi; v += k) el('text', { x: L + PW + 4, y: fy(v) + 3, class: 'axt' }, svg).textContent = fmt(v, dec);
        el('line', { x1: Math.max(L, Math.min(L + PW, x(first))), x2: L + PW, y1: fy(1), y2: fy(1), class: 'vxone' }, svg);
        el('path', { d: path(C.r, fy), class: 'vxr' }, svg);
        const tl = C.now.r && n - 1 - [...C.r].reverse().findIndex((v) => v != null);
        if (C.now.r && inWin(dates[tl])) el('circle', { cx: x(dates[tl]), cy: fy(C.r[tl]), r: 3.2, class: `vxrdot${C.r[tl] >= 1 ? ' back' : ''}` }, svg);
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
      // la seduta più vicina al puntatore (come la selezione dello zoom), dentro la finestra
      if (i + 1 < n && Date.parse(dates[i + 1]) <= t1 && Date.parse(dates[i + 1]) - tq < tq - Date.parse(dates[i])) i++;
      const xx = x(dates[i]); xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.setAttribute('visibility', 'visible');
      const prov = A.fred && dates[i] > A.fred && A.vix[i] != null ? ' <span class="muted">provv.</span>' : '';
      const v3 = has3 ? C.v3[i] : null, p3 = has3 && v3 != null && C.fred3m && dates[i] > C.fred3m ? ' <span class="muted">provv.</span>' : '';
      const extra = (has3 ? `<div class="row"><span>VIX3M</span><b>${v3 == null ? '—' : fmt(v3, 2) + p3}</b></div>
        <div class="row"><span>VIX / VIX3M</span><b>${C.r[i] == null ? '—' : `${fr(C.r[i])} ${C.r[i] >= 1 ? 'backwardation' : 'contango'}`}</b></div>` : '') +
        (hasC ? `<div class="row"><span>HYG/IEF dal massimo 12 mesi</span><b>${sgnP(C.dd[i], 1)}</b></div>` : '');
      const ci = ixAt.get(dates[i]), epi = MI.R.thr[st.thr].episodes.find((e) => e.date <= dates[i] && dates[i] <= e.end);
      $('vxTip').innerHTML = `<div class="row"><b>${dIT(dates[i])}</b><span>${esc(IN)} ${ci == null ? '—' : fmt(ci, 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</span></div>${epi ? `<div class="row note-row">Nell'episodio a ${st.thr} o più iniziato il ${dIT(epi.date)}, ${epi.endP + 63 > MI.A.vix.length - 1 ? 'ancora in corso' : `finito il ${dIT(epi.end)}`}</div>` : ''}
        <div class="row"><span>VIX</span><b>${A.vix[i] == null ? '—' : fmt(A.vix[i], 2) + prov}</b></div>
        <div class="row"><span>Realizzata S&amp;P 500, 21 sedute</span><b>${T0.rvSeries[i] == null ? '—' : fmt(T0.rvSeries[i], 1)}</b></div>
        <div class="row"><span>Premio per la paura (S&amp;P 500)</span><b>${T0.premSeries[i] == null ? '—' : sgnP(T0.premSeries[i], 1).replace('%', '')}</b></div>
        <div class="row"><span>Percentile del premio</span><b>${T0.premPctSeries[i] == null ? '—' : fmt(T0.premPctSeries[i], 0) + '°'}</b></div>${extra}`;
      placeTip($('vxTip'), $('vxWrap'), e, 12);
    };
    bindTip(hit, svg, show, () => { xh.setAttribute('visibility', 'hidden'); $('vxTip').hidden = true; });
    if (zoom) zoom.geo(svg, { L, PW, top: P[0].y0, bottom: yEnd, t0, t1, dates });
    $('vxLegend').innerHTML = '<span><span class="kl vxk-vix"></span>VIX (implicita, prossimi 30 giorni)</span><span><span class="kl vxk-rv"></span>realizzata dell\'S&amp;P 500 nelle ultime 21 sedute</span>' + `<span><span class="kl vxk-ix"></span>${esc(IN)}</span><span><span class="kb vxk-ep"></span>episodi con il VIX a ${st.thr} o più (dal primo all'ultimo giorno), nel colore della crisi; grigi se la crisi non è nello scatter</span>` + '<span><span class="kl vxk-prem"></span>premio per la paura</span><span><span class="kb vxk-high"></span>premio oltre l\'80° percentile della sua storia</span>' +
      (has3 ? '<span><span class="kl vxk-r"></span>VIX / VIX3M</span><span><span class="kb vxk-back"></span>backwardation (VIX ≥ VIX3M)</span><span><span class="kd vxk-dot"></span>ultimo valore (pieno se in backwardation)</span>' : '') +
      (hasC ? '<span><span class="kl vxk-cr"></span>HYG/IEF: distanza dal massimo di 12 mesi</span>' : '');
  }

  // ---------- distanza dal massimo storico (solo contesto) ----------
  const p2 = (x) => sgnP(x, 2);
  const W60 = 60; // scala fissa della barra: da 0 a −60%
  const barW = (x) => Math.max(0, Math.min(100, (-x / W60) * 100));
  // numero con il punto delle migliaia (12.345,67): i prezzi vanno da 6 (rame) a 124.752 (bitcoin)
  const th = (x, d) => { const t = fmt(x, d), i = t.indexOf(','), n = i < 0 ? t : t.slice(0, i); return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (i < 0 ? '' : t.slice(i)); };
  function athDetail(m) {
    const s = m.stats, cur = m.id === 'KOSPI' ? ' won' : '';
    const v = (x) => th(x, Math.abs(x) < 10 ? 3 : 2);
    const parts = [
      `<b>${esc(m.label)}</b> · ${esc(m.symbol)} (${esc(m.kind)})`,
      `ultima chiusura ${v(s.last)}${cur} il ${dIT(s.lastDate)}`,
      `massimo di chiusura ${v(s.ath)}${cur} il ${dIT(s.athDate)}, <b>dal ${dIT(s.start)}</b> (inizio della serie)`,
      s.intradayAth != null && s.intradayAthDate ? `massimo durante la seduta ${v(s.intradayAth)} il ${dIT(s.intradayAthDate)}` : null,
      s.belowZero ? `dopo il massimo ha chiuso sotto zero (${dIT(s.belowZero)}): il calo più profondo non si calcola` : s.cycleLow != null ? `calo più profondo dopo il massimo ${p2(s.cycleLowPct)} il ${dIT(s.cycleLowDate)}, da lì ${p2(s.fromLowPct)}` : 'nessun calo dopo il massimo',
      s.max52w != null && s.max52wDate !== s.athDate ? `massimo delle ultime 52 settimane ${v(s.max52w)} il ${dIT(s.max52wDate)} (${p2(s.dist52wPct)})` : null,
    ].filter(Boolean);
    return parts.join(' · ') + (m.note ? `. ${esc(m.note)}` : '.');
  }
  function renderAth() {
    const T = $('athTable');
    document.querySelectorAll('#athSort button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === st.athSort)));
    if (!ath || !Array.isArray(ath.markets) || !ath.markets.length) {
      T.innerHTML = ''; $('athMiss').hidden = false;
      $('athMiss').textContent = 'Dati della distanza dal massimo storico non disponibili (data/ath.json): il pannello tornerà dopo il prossimo aggiornamento.';
      return;
    }
    $('athMiss').hidden = true;
    const rows = athRows(ath.markets, st.athSort);
    const newest = rows.filter((m) => m.stats).map((m) => m.stats.lastDate).sort().at(-1);
    T.innerHTML = `<thead><tr><th>Mercato</th><th title="Ultima chiusura contro il massimo di chiusura dall'inizio della serie. Barra da 0 a −60%; la tacca è il calo più profondo dopo il massimo">Distanza dal massimo <span class="muted">· tacca: calo più profondo</span></th><th>Massimo di chiusura</th><th class="r" title="Il punto più basso di chiusura dopo il massimo, rispetto al massimo">Calo più profondo</th><th>Ultima chiusura</th></tr></thead><tbody>` +
      rows.map((m) => {
        const s = m.stats, open = athOpen === m.id;
        if (!s) return `<tr class="athr" data-id="${esc(m.id)}"><td class="nm"><b>${esc(m.label)}</b><small>${esc(m.symbol)} · ${esc(m.kind)}</small></td><td><span class="dv zero">—</span><span class="muted">dati non disponibili</span></td><td class="c-max">—</td><td class="r c-low">—</td><td class="c-last">—</td></tr>`;
        const z = s.distPct === 0, d = s.days, ago = d === 0 ? 'all\'ultima seduta' : d === 1 ? '1 giorno prima' : `${th(d, 0)} giorni fa`;
        const mark = s.cycleLowPct != null && s.cycleLowPct < 0 ? `<span class="mark" style="right:${barW(s.cycleLowPct).toFixed(2)}%"></span>` : '';
        const low = s.belowZero ? '<span class="muted" title="Dopo il massimo ha chiuso sotto zero: il calo più profondo non si calcola">sotto zero</span>' : s.cycleLowPct == null ? '<span class="muted">—</span>' : p2(s.cycleLowPct);
        const old = s.lastDate < newest ? ' muted' : '';
        return `<tr class="athr${open ? ' on' : ''}" data-id="${esc(m.id)}" tabindex="0" role="button" aria-expanded="${open}" title="Clic per i dettagli"><td class="nm"><b>${esc(m.label)}</b><small>${esc(m.symbol)} · ${esc(m.kind)}</small></td>` +
          `<td><span class="dv${z ? ' zero' : ''}">${z ? '0,00%' : p2(s.distPct)}</span><span class="athbar" role="img" aria-label="${esc(m.label)}: ${z ? 'al massimo' : p2(s.distPct) + ' dal massimo'}"><i style="width:${barW(s.distPct).toFixed(2)}%"></i>${mark}</span>` +
          `<span class="athmob">massimo il ${dIT(s.athDate)} · ${ago} · calo più profondo ${s.belowZero ? 'non calcolabile' : s.cycleLowPct == null ? '—' : p2(s.cycleLowPct)} · al ${dIT(s.lastDate)}</span></td>` +
          `<td class="c-max mono">${dIT(s.athDate)} <span class="muted">· ${ago}</span></td><td class="r c-low mono">${low}</td><td class="c-last mono${old}">${dIT(s.lastDate)}</td></tr>` +
          (open ? `<tr class="athdet"><td colspan="5">${athDetail(m)}</td></tr>` : '');
      }).join('') + '</tbody>';
    T.querySelectorAll('tr.athr[tabindex]').forEach((tr) => {
      const go = () => { athOpen = athOpen === tr.dataset.id ? null : tr.dataset.id; renderAth(); const n = $('athTable').querySelector(`tr.athr[data-id="${tr.dataset.id}"]`); if (n) n.focus(); };
      tr.onclick = go;
      tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
  }

  function bind() {
    document.querySelectorAll('#athSort button').forEach((b) => b.onclick = () => { st.athSort = b.dataset.sort; store.set('athSort', st.athSort); if (model) renderAth(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && selG && !$('v-vix').hidden) select(null); });
    document.querySelectorAll('#vxIx button').forEach((b) => b.onclick = () => { st.ix = b.dataset.ix; store.set('vxIx', st.ix); if (model) render(); });
    // un pulsante del periodo, anche quello già scelto, toglie lo zoom; SPX/NDX e la soglia lo lasciano
    document.querySelectorAll('#vxRange button').forEach((b) => b.onclick = () => { st.range = b.dataset.range; store.set('vxRange', st.range); zoom.reset(); if (model) render(); });
    zoom = zoomGroup('vix', { lens: $('vxLens'), chips: [$('vxZoom')], back: () => document.querySelector('#vxRange [aria-pressed="true"]'), onChange: () => { if (model) renderChart(); } });
    zoom.attach($('vxChart'));
  }

  return { bind, render };
}
