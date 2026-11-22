/*
 * ath-view.js — vista 0 «Massimi» (1.12.0, solo contesto): il pannello «Distanza dal massimo degli ultimi 3 anni» con il
 * grafico e il profilo dei volumi (dalla 1.10.0 al 1.11.0 nella vista 8 VIX) e la linea del tempo dei massimi.
 * Idea da una slide di Francesco Caruso (Cicli&Mercati): «le bolle si sgonfiano a rotazione».
 * Dati: data/ath.json (valori del pannello, calcolati ogni notte da scripts/fetch_ath.js) e data/ath_history.json
 * (chiusure dal 2000 e profili dei volumi), scaricati alla prima apertura della vista; se mancano la vista lo dice.
 * Linea del tempo: js/peaks.js (stesso metodo di ricerca/rotazione-bolle/, solo descrizione, nessun segnale).
 * Chiavi del browser athSort e athRange e gruppo di zoom 'ath': le stesse di prima, così le scelte restano.
 */
import { esc, fmt, sgnP, dIT, placeTip, bindTip, chartWidth } from './format.js';
import { zoomGroup, timeTicks } from './zoom.js';
import { athRows, daysBetween } from './ath.js';
import { decodeDates, deltaDecode } from './indexdata.js';
import { timeline, ORDER, HALF, TOGETHER } from './peaks.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const DAY = 86400000;
// nomi dei mercati se data/ath.json non c'è (la linea del tempo usa solo lo storico)
const NAMES = { BTC: 'Bitcoin', GOLD: 'Oro', SILVER: 'Argento', COPPER: 'Rame', WTI: 'Petrolio WTI', NDX: 'Nasdaq-100', SPX: 'S&P 500', SOXX: 'Semiconduttori', KOSPI: 'KOSPI (Corea)' };

/** @param {{$: Function, store: object, loadAth: () => Promise<object|null>, loadAthHist: () => Promise<object|null>}} ctx */
export function createAth(ctx) {
  const { $, store } = ctx;
  const st = {
    athSort: store.get('athSort') === 'date' ? 'date' : 'dist',
    athRange: ['3A', '10A', 'MAX'].includes(store.get('athRange')) ? store.get('athRange') : '10A',
  };
  // valori del pannello (data/ath.json) e storico (data/ath_history.json): file facoltativi, si scaricano alla prima apertura
  let ath = null, athLoad = null, athDone = false, athOpen = null;
  let athHist = null, athHistLoad = null, athHistDone = false, athZoom = null, tl = null;
  function ensure() {
    if (!athLoad) {
      $('athLoading').hidden = false;
      athLoad = ctx.loadAth().then((d) => { ath = d; }).catch(() => { ath = null; }).finally(() => { athDone = true; $('athLoading').hidden = true; });
    }
    return athLoad;
  }
  function ensureHist() {
    if (!athHistLoad) {
      athHistLoad = ctx.loadAthHist().then((d) => { athHist = d; }).catch(() => { athHist = null; })
        .finally(() => { athHistDone = true; if (!$('v-ath').hidden) { renderAthChart(); renderTimeline(); } });
    }
    return athHistLoad;
  }
  const visible = () => !$('v-ath').hidden;

  async function render() {
    ensureHist();
    await ensure();
    if (!visible()) return;
    renderAth();
    renderTimeline();
  }

  // ---------- distanza dal massimo degli ultimi 3 anni (solo contesto) ----------
  const p2 = (x) => sgnP(x, 2);
  const W60 = 60; // scala fissa della barra: da 0 a −60%
  const barW = (x) => Math.max(0, Math.min(100, (-x / W60) * 100));
  // numero con il punto delle migliaia (12.345,67): i prezzi vanno da 6 (rame) a 124.752 (bitcoin)
  const th = (x, d) => { const t = fmt(x, d), i = t.indexOf(','), n = i < 0 ? t : t.slice(0, i); return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (i < 0 ? '' : t.slice(i)); };
  const pv = (x) => th(x, Math.abs(x) < 10 ? 3 : 2);
  function athDetail(m) {
    const s = m.stats, cur = m.id === 'KOSPI' ? ' won' : '';
    const parts = [
      `<b>${esc(m.label)}</b> · ${esc(m.symbol)} (${esc(m.kind)})`,
      `ultima chiusura ${pv(s.last)}${cur} il ${dIT(s.lastDate)}`,
      `massimo di chiusura degli ultimi 3 anni (dal ${dIT(s.from)}) ${pv(s.ref)}${cur} il ${dIT(s.refDate)}`,
      s.intradayRef != null && s.intradayRefDate ? `durante la seduta ${pv(s.intradayRef)} il ${dIT(s.intradayRefDate)}` : null,
      s.belowZero ? `dopo il massimo ha chiuso sotto zero (${dIT(s.belowZero)}): il calo più profondo non si calcola` : s.cycleLow != null ? `calo più profondo dopo il massimo ${p2(s.cycleLowPct)} il ${dIT(s.cycleLowDate)}, da lì ${p2(s.fromLowPct)}` : 'nessun calo dopo il massimo',
      s.athDate !== s.refDate ? `massimo di sempre ${pv(s.ath)}${cur} il ${dIT(s.athDate)} (${p2(s.athDistPct)}), serie dal ${dIT(s.start)}` : `è anche il massimo di sempre, serie dal ${dIT(s.start)}`,
    ].filter(Boolean);
    return parts.join(' · ') + (m.note ? `. ${esc(m.note)}` : '.');
  }
  function renderAth() {
    const T = $('athTable');
    document.querySelectorAll('#athSort button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === st.athSort)));
    if (!ath || !Array.isArray(ath.markets) || !ath.markets.length) {
      T.innerHTML = ''; $('athMiss').hidden = false; $('athChartBox').hidden = true;
      $('athMiss').textContent = 'Dati della distanza dal massimo non disponibili (data/ath.json): il pannello tornerà dopo il prossimo aggiornamento.';
      return;
    }
    $('athMiss').hidden = true;
    const rows = athRows(ath.markets, st.athSort);
    const newest = rows.filter((m) => m.stats).map((m) => m.stats.lastDate).sort().at(-1);
    // giorni dal massimo contati fino a oggi (la data del computer), non fino all'ultima chiusura
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    T.innerHTML = `<thead><tr><th>Mercato</th><th title="Ultima chiusura contro il massimo di chiusura degli ultimi 3 anni. Barra da 0 a −60%; la tacca è il calo più profondo dopo il massimo">Distanza dal massimo dei 3 anni <span class="muted">· tacca: calo più profondo</span></th><th>Massimo dei 3 anni</th><th class="r" title="Il punto più basso di chiusura dopo il massimo, rispetto al massimo">Calo più profondo</th><th>Ultima chiusura</th></tr></thead><tbody>` +
      rows.map((m) => {
        const s = m.stats, open = athOpen === m.id;
        if (!s) return `<tr class="athr" data-id="${esc(m.id)}"><td class="nm"><b>${esc(m.label)}</b><small>${esc(m.symbol)} · ${esc(m.kind)}</small></td><td><span class="dv zero">—</span><span class="muted">dati non disponibili</span></td><td class="c-max">—</td><td class="r c-low">—</td><td class="c-last">—</td></tr>`;
        const z = s.distPct === 0, d = Math.max(s.days, daysBetween(s.refDate, today)), ago = d === 0 ? 'oggi' : d === 1 ? '1 giorno fa' : `${th(d, 0)} giorni fa`;
        const mark = s.cycleLowPct != null && s.cycleLowPct < 0 ? `<span class="mark" style="right:${barW(s.cycleLowPct).toFixed(2)}%"></span>` : '';
        const low = s.belowZero ? '<span class="muted" title="Dopo il massimo ha chiuso sotto zero: il calo più profondo non si calcola">sotto zero</span>' : s.cycleLowPct == null ? '<span class="muted">—</span>' : p2(s.cycleLowPct);
        const old = daysBetween(s.lastDate, newest) > 3 ? ' muted' : '';
        return `<tr class="athr${open ? ' on' : ''}" data-id="${esc(m.id)}" tabindex="0" role="button" aria-expanded="${open}" aria-controls="athChartBox" title="Clic per i dettagli e il grafico"><td class="nm"><b>${esc(m.label)}</b><small>${esc(m.symbol)} · ${esc(m.kind)}</small></td>` +
          `<td><span class="dv${z ? ' zero' : ''}">${z ? '0,00%' : p2(s.distPct)}</span><span class="athbar" role="img" aria-label="${esc(m.label)}: ${z ? 'al massimo' : p2(s.distPct) + ' dal massimo dei 3 anni'}"><i style="width:${barW(s.distPct).toFixed(2)}%"></i>${mark}</span>` +
          `<span class="athmob">massimo il ${dIT(s.refDate)} · ${ago} · calo più profondo ${s.belowZero ? 'non calcolabile' : s.cycleLowPct == null ? '—' : p2(s.cycleLowPct)} · al ${dIT(s.lastDate)}</span></td>` +
          `<td class="c-max mono">${dIT(s.refDate)} <span class="muted">· ${ago}</span></td><td class="r c-low mono">${low}</td><td class="c-last mono${old}">${dIT(s.lastDate)}</td></tr>` +
          (open ? `<tr class="athdet"><td colspan="5">${athDetail(m)}</td></tr>` : '');
      }).join('') + '</tbody>';
    T.querySelectorAll('tr.athr[tabindex]').forEach((tr) => {
      const go = () => {
        const was = athOpen; athOpen = athOpen === tr.dataset.id ? null : tr.dataset.id;
        if (athZoom && was !== athOpen) athZoom.reset(); // un altro mercato: si torna al periodo scelto
        renderAth(); const n = $('athTable').querySelector(`tr.athr[data-id="${tr.dataset.id}"]`); if (n) n.focus();
      };
      tr.onclick = go;
      tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
    renderAthChart();
  }

  // grafico dello storico del mercato aperto: chiusure dal 2000 (data/ath_history.json, letto alla prima apertura della vista)
  // profilo dei volumi del mercato (profiles di data/ath_history.json, dalla 1.11.0) nel formato atteso, altrimenti null
  const VP_NOTE = 'profilo poco stabile: con metodi di calcolo diversi (barre giornaliere o orarie, 50, 100 o 200 fasce) le zone principali si spostano di oltre il 2% (due zone di volume quasi uguali); leggere con cautela';
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  function vpOf(h, id) {
    const p = h && h.profiles && h.profiles[id];
    if (!p || !Array.isArray(p.bp) || !(p.n > 0) || p.bp.length !== p.n || !(p.lo > 0) || !(p.hi > p.lo) || typeof p.from !== 'string' || typeof p.to !== 'string') return null;
    if (!p.bp.every((v) => Number.isFinite(v) && v >= 0) || !(p.bp.reduce((a, b) => a + b, 0) > 0)) return null;
    return p;
  }
  function renderAthChart() {
    const box = $('athChartBox'), m = athOpen && ath && ath.markets.find((x) => x.id === athOpen);
    if (!m || !m.stats) { box.hidden = true; return; }
    box.hidden = false;
    document.querySelectorAll('#athRange button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.range === st.athRange)));
    $('athChartTitle').textContent = `${m.label}: prezzo, scala logaritmica`;
    const showChart = (on) => { $('athWrap').hidden = !on; $('athRange').hidden = !on; $('athLens').hidden = !on; if (!on) $('athZoom').hidden = true; };
    if (!athHistDone) {
      showChart(false); $('athChartMiss').hidden = false; $('athChartMiss').textContent = 'Caricamento dello storico…';
      ensureHist();
      return;
    }
    const svg = $('athChart'), H0 = athHist && athHist.series && athHist.series[m.id];
    svg.innerHTML = ''; $('athLegend').innerHTML = '';
    // serie nel formato atteso (date compatte e valori in differenze), altrimenti il messaggio
    let dates = null, close = null;
    try { if (H0 && typeof H0.d0 === 'string' && Array.isArray(H0.cd)) { dates = decodeDates(H0.d0, H0.gaps); close = deltaDecode(H0.cd, H0.ps || 1); } } catch { dates = null; }
    if (!dates || !dates.length || !close || close.length !== dates.length) {
      showChart(false); $('athChartMiss').hidden = false;
      $('athChartMiss').textContent = !athHistDone ? 'Caricamento dello storico…' : athHist ? 'Storico di questo mercato non disponibile.' : 'Storico non disponibile (data/ath_history.json): il grafico tornerà dopo il prossimo aggiornamento.';
      return;
    }
    $('athChartMiss').hidden = true; showChart(true);
    const s = m.stats, n = dates.length;
    $('athChartTitle').textContent = `${m.label}: prezzo (serie dal ${dates[0].slice(0, 4)}), scala logaritmica`;
    const W = chartWidth(svg, 1600), narrow = W < 560, L = 8, R = 52, T = 22, PH = narrow ? 200 : 260, B = 20, H = T + PH + B;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    const tEnd = Date.parse(dates[n - 1]), span = st.athRange === '3A' ? 3 : st.athRange === '10A' ? 10 : null;
    let t0 = span ? Math.max(Date.parse(dates[0]), tEnd - span * 365.25 * DAY) : Date.parse(dates[0]), t1 = tEnd;
    const zw = athZoom ? athZoom.time(t0, t1, dates) : null;
    if (zw) [t0, t1] = zw;
    // profilo dei volumi degli ultimi 12 mesi (1.11.0): colonna stretta tra il riquadro del prezzo e i valori dell'asse, solo
    // quando il tratto mostrato arriva alla fine del profilo (con uno zoom più vecchio la colonna si toglie e la scala resta
    // quella del tratto)
    const vp = vpOf(athHist, m.id), showVp = !!vp && t1 >= Date.parse(vp.to);
    const GAP = 6, PRW = showVp ? Math.round(Math.max(44, Math.min(110, W * 0.08))) : 0, PW = W - L - R - (showVp ? PRW + GAP : 0), XC = L + PW + GAP;
    svg.setAttribute('aria-label', `Prezzo di ${m.label} dal ${dIT(dates[0])}, con il massimo di chiusura degli ultimi 3 anni${showVp ? ' e il profilo dei volumi degli ultimi 12 mesi' : ''}`); svg.dataset.zlabel = svg.getAttribute('aria-label');
    const inWin = (d) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
    const x = (d) => L + ((Date.parse(d) - t0) / (t1 - t0)) * PW;
    const vis = []; for (let i = 0; i < n; i++) if (close[i] != null && close[i] > 0 && inWin(dates[i])) vis.push(close[i]);
    if (!vis.length) return;
    const showRef = inWin(s.refDate) || Date.parse(s.refDate) < t0;
    // con il profilo la scala comprende anche il minimo e il massimo delle sedute dei 12 mesi (poco oltre le chiusure)
    const lo = Math.log(Math.min(...vis, ...(showVp ? [vp.lo] : []))) - 0.03, hi = Math.log(Math.max(...vis, ...(showRef && Date.parse(s.refDate) <= t1 ? [s.ref] : []), ...(showVp ? [vp.hi] : []))) + 0.03;
    const fy = (v) => T + ((hi - Math.log(v)) / (hi - lo)) * PH;
    el('rect', { x: L, y: T, width: PW, height: PH, class: 'frame' }, svg);
    // finestra degli ultimi 3 anni (dove si cerca il massimo di riferimento)
    if (Date.parse(s.from) < t1) {
      const xa = Math.max(L, x(s.from)), xb = L + PW;
      el('rect', { x: xa, y: T, width: Math.max(0, xb - xa), height: PH, class: 'athwin' }, svg);
      if (Date.parse(s.from) > t0) { const t = el('text', { x: xa + 4, y: T + PH - 6, class: 'axt' }, svg); t.textContent = narrow ? 'ultimi 3 anni' : `ultimi 3 anni (dal ${dIT(s.from)}): qui si cerca il massimo`; if (xa + 8 + t.getComputedTextLength() > L + PW) t.textContent = 'ultimi 3 anni'; if (xa + 8 + t.getComputedTextLength() > L + PW) t.remove(); }
    }
    for (const tk of timeTicks(t0, t1, narrow ? 4 : 9)) { const xx = L + ((tk.t - t0) / (t1 - t0)) * PW; el('line', { x1: xx, x2: xx, y1: T, y2: T + PH, class: 'gridl' }, svg); el('text', { x: xx, y: H - 5, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = tk.label; }
    // prezzi: 1, 2, 5 × 10^k distanti almeno 20 px; se troppo poche, anche 1,5 2,5 3 4 6 8
    const vals = []; for (let k = Math.floor(lo / Math.LN10) - 1; k <= Math.ceil(hi / Math.LN10) + 1; k++) for (const mm of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) vals.push(mm * 10 ** k);
    const inR = vals.filter((v) => Math.log(v) > lo && Math.log(v) < hi), main = inR.filter((v) => [1, 2, 5].includes(+(v / 10 ** Math.floor(Math.log10(v))).toFixed(2)));
    let lastY = Infinity, ticks = main.length >= 3 ? main : inR;
    // zoom stretto: meno di due valori tondi nel riquadro, si usano 5 livelli con 3 cifre significative
    if (ticks.length < 2) { ticks = []; for (let k = 0; k < 5; k++) { const v = Math.exp(lo + ((hi - lo) * (k + 0.5)) / 5), e = 10 ** (Math.floor(Math.log10(v)) - 2); ticks.push(Math.round(v / e) * e); } }
    // decimali solo se servono: 2,5 e 3 (non 2,50), 6,32k nello zoom stretto
    const dec = (v) => (Number.isInteger(+v.toFixed(6)) ? 0 : Number.isInteger(+(v * 10).toFixed(6)) ? 1 : 2);
    const lab = (v) => (v >= 1000 ? th(v / 1000, dec(v / 1000)) + 'k' : th(v, dec(v)));
    // le righe della griglia attraversano anche la colonna del profilo: i valori a destra valgono per tutte e due
    for (const v of ticks) { const yv = fy(v); if (lastY - yv < 20) continue; lastY = yv; el('line', { x1: L, x2: L + PW + (showVp ? GAP + PRW : 0), y1: yv, y2: yv, class: 'gridl' }, svg); el('text', { x: W - R + 4, y: yv + 3, class: 'axt' }, svg).textContent = lab(v); }
    let d = '', on = false;
    for (let i = 0; i < n; i++) { if (close[i] == null || close[i] <= 0 || !inWin(dates[i])) { on = false; continue; } d += (on ? 'L' : 'M') + x(dates[i]).toFixed(1) + ' ' + fy(close[i]).toFixed(1); on = true; }
    el('path', { d, class: 'athpx' }, svg);
    // massimo di riferimento: linea tratteggiata dal massimo alla fine, punto sul massimo; minimo dopo il massimo
    if (showRef) {
      const xa = Math.max(L, x(s.refDate)), yr = fy(s.ref);
      if (yr >= T && yr <= T + PH) {
        el('line', { x1: xa, x2: L + PW, y1: yr, y2: yr, class: 'athref' }, svg);
        if (inWin(s.refDate)) el('circle', { cx: x(s.refDate), cy: yr, r: 3.5, class: 'athtop' }, svg);
      }
    }
    if (s.cycleLowDate && inWin(s.cycleLowDate)) el('circle', { cx: x(s.cycleLowDate), cy: fy(s.cycleLow), r: 3, class: 'athlow' }, svg);
    if (inWin(s.lastDate) && close[n - 1] > 0) el('circle', { cx: x(dates[n - 1]), cy: fy(close[n - 1]), r: 3, class: 'athlast' }, svg);
    // profilo dei volumi: le 100 fasce si uniscono a gruppi (divisori di n) finché ogni barra è alta almeno 3 px; barre grigie
    // lunghe quanto la quota (la più lunga occupa la colonna); nessun livello e nessuna fascia evidenziata
    const bars = [];
    if (showVp) {
      if (inWin(vp.from)) el('line', { x1: x(vp.from), x2: x(vp.from), y1: T, y2: T + PH, class: 'vpwin' }, svg);
      el('rect', { x: XC, y: T, width: PRW, height: PH, class: 'vpcol' }, svg);
      el('text', { x: XC + 2, y: T - 6, class: 'axt' }, svg).textContent = PRW >= 70 ? 'volumi 12 mesi' : 'vol. 12m';
      const lr = Math.log(vp.hi / vp.lo), pxBin = (lr / vp.n / (hi - lo)) * PH, tot = vp.bp.reduce((a, b) => a + b, 0);
      const k = [...Array(vp.n).keys()].map((i) => i + 1).find((g) => vp.n % g === 0 && g * pxBin >= 3) || vp.n;
      const edge = (i) => vp.lo * Math.exp((lr * i * k) / vp.n);
      for (let g = 0; g < vp.n / k; g++) { let sh = 0; for (let i = g * k; i < (g + 1) * k; i++) sh += vp.bp[i]; bars.push({ a: edge(g), b: edge(g + 1), sh: (sh / tot) * 100 }); }
      const mx = Math.max(...bars.map((b) => b.sh)), gap = k * pxBin >= 4 ? 0.8 : 0.3;
      for (const b of bars) {
        b.y1 = fy(b.b); b.y2 = fy(b.a);
        b.el = el('rect', { x: XC + 1, y: b.y1.toFixed(1), width: Math.max(0, (b.sh / mx) * (PRW - 4)).toFixed(1), height: Math.max(0.6, b.y2 - b.y1 - gap).toFixed(1), class: 'vpbar' }, svg);
      }
      svg.dataset.vpMerge = k;
    } else delete svg.dataset.vpMerge;
    const lit = (b) => { for (const z of bars) z.el.classList.toggle('on', z === b); };
    // riquadro dei valori: sul prezzo la seduta, sulla colonna la fascia indicata
    let i0 = 0; while (i0 < n - 1 && !inWin(dates[i0])) i0++;
    const xh = el('line', { x1: 0, x2: 0, y1: T, y2: T + PH, class: 'xhair', visibility: 'hidden' }, svg);
    const hit = el('rect', { x: L, y: T, width: showVp ? W - L : PW + R, height: PH, fill: 'transparent' }, svg);
    const show = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      if (showVp && q.x >= XC - GAP / 2) {
        xh.setAttribute('visibility', 'hidden');
        const b = bars.find((z) => q.y >= z.y1 && q.y <= z.y2);
        lit(b || null);
        if (!b) { $('athTip').hidden = true; return; }
        $('athTip').innerHTML = `<div class="row"><b>Volume degli ultimi 12 mesi</b></div><div class="row"><span>Prezzi da ${pv(b.a)} a ${pv(b.b)}</span><b>${th(b.sh, 1)}%</b></div>` +
          `<div class="note-row">del volume scambiato dal ${dIT(vp.from)} al ${dIT(vp.to)} (${esc(vp.text || vp.vol)})</div>` + (vp.stable === false ? `<div class="note-row vpwarn">${esc(cap(vp.stableNote || VP_NOTE))}</div>` : '');
        placeTip($('athTip'), $('athWrap'), e, 12);
        return;
      }
      lit(null);
      const tq = t0 + ((Math.max(L, Math.min(L + PW, q.x)) - L) / PW) * (t1 - t0);
      let i = i0; while (i + 1 < n && Date.parse(dates[i + 1]) <= tq) i++;
      if (i + 1 < n && Date.parse(dates[i + 1]) <= t1 && Date.parse(dates[i + 1]) - tq < tq - Date.parse(dates[i])) i++;
      const xx = x(dates[i]); xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.setAttribute('visibility', 'visible');
      const c = close[i], after = dates[i] >= s.refDate && c != null && c > 0;
      $('athTip').innerHTML = `<div class="row"><b>${dIT(dates[i])}</b><span>${esc(m.label)}</span></div><div class="row"><span>Chiusura</span><b>${c == null ? '—' : pv(c)}</b></div>` +
        (after ? `<div class="row"><span>Dal massimo dei 3 anni (${dIT(s.refDate)})</span><b>${p2((c / s.ref - 1) * 100)}</b></div>` : '');
      placeTip($('athTip'), $('athWrap'), e, 12);
    };
    bindTip(hit, svg, show, () => { xh.setAttribute('visibility', 'hidden'); $('athTip').hidden = true; lit(null); });
    if (athZoom) athZoom.geo(svg, { L, PW, top: T, bottom: T + PH, t0, t1, dates });
    const vpLeg = showVp ? `<span><span class="kb vpk-bar"></span>a destra: volume per fascia di prezzo, dal ${dIT(vp.from)} al ${dIT(vp.to)} (${esc(vp.text || vp.vol)})</span><span><span class="kb vpk-win"></span>inizio dei 12 mesi</span>` +
        (vp.stable === false ? `<span class="vpwarn">${esc(vp.stableNote || VP_NOTE)}</span>` : '')
      : vp ? '<span class="muted">profilo dei volumi nascosto: lo zoom non arriva all\'ultima seduta</span>' : '<span class="muted">profilo dei volumi non disponibile</span>';
    $('athLegend').innerHTML = `<span><span class="kl athk-px"></span>${esc(m.label)} (${esc(m.symbol)}), chiusure</span><span><span class="kb athk-win"></span>ultimi 3 anni (dal ${dIT(s.from)})</span><span class="athleg-ref"><span class="kl athk-ref"></span><span class="kd athk-top"></span>massimo di chiusura dei 3 anni: ${pv(s.ref)} il ${dIT(s.refDate)}</span>` +
      (s.cycleLowDate ? `<span><span class="kd athk-low"></span>minimo dopo il massimo: ${pv(s.cycleLow)} il ${dIT(s.cycleLowDate)}</span>` : '') + `<span><span class="kd athk-last"></span>ultima chiusura: ${pv(s.last)} il ${dIT(s.lastDate)}</span>` + (s.athDate !== s.refDate ? `<span>massimo di sempre: ${pv(s.ath)} il ${dIT(s.athDate)}${s.athDate < dates[0] ? ', prima del 2000' : ''}</span>` : '') + vpLeg;
  }

  // ---------- linea del tempo dei massimi (solo descrizione) ----------
  // mercati nell'ordine di config/ath.json (quello di data/ath.json), con le etichette; senza data/ath.json quelli dello storico
  function markets() {
    const ser = athHist && athHist.series ? athHist.series : {};
    const list = ath && Array.isArray(ath.markets) && ath.markets.length ? ath.markets.map((m) => ({ id: m.id, label: m.label })) : Object.keys(ser).map((id) => ({ id, label: NAMES[id] || id }));
    return list.filter((m) => ser[m.id]);
  }
  function buildTimeline() {
    const ser = athHist && athHist.series, out = {};
    if (!ser) return null;
    const ms = markets();
    for (const m of ms) {
      const h = ser[m.id];
      try { if (h && typeof h.d0 === 'string' && Array.isArray(h.cd)) { const d = decodeDates(h.d0, h.gaps), c = deltaDecode(h.cd, h.ps || 1); if (d.length === c.length) out[m.id] = { dates: d, close: c }; } } catch { /* serie non valida: il mercato resta senza dati */ }
    }
    if (!out.SPX) return null;
    const T = timeline(out, ms.map((m) => m.id));
    return T ? { ...T, ms } : null;
  }
  const sg = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
  const p1 = (x) => sgnP(x, 1);
  // testo a destra (o sotto, sul telefono) di una riga
  function rowNote(m, short) {
    if (m.status === 'anchor') return `${dIT(m.date)} · ${m.ddPct == null ? 'al massimo' : m.belowZero ? 'sotto zero' : p1(m.ddPct)}${m.ongoing && m.ddPct != null ? ' finora' : ''}`;
    if (m.status === 'nodata') return 'serie troppo corta';
    if (m.status === 'none') return `nessun calo ≥ 20%${m.alt ? ` (≥ ${m.alt.X}%: ${sg(m.alt.offset)} g)` : ''}`;
    return `${dIT(m.date)} · ${sg(m.offset)} g · ${m.belowZero ? (short ? 'sotto zero' : 'sotto zero il ' + dIT(m.troughDate)) : p1(m.ddPct)}${m.ongoing ? ' finora' : ''}`;
  }
  function renderOrder(ms) {
    const label = Object.fromEntries(ms.map((m) => [m.id, m.label]));
    const items = Object.entries(ORDER.markets).filter(([id]) => label[id]).sort((a, b) => a[1].meanRankNorm - b[1].meanRankNorm).map(([id, o]) => {
      const t = `${label[id]}: rango medio ${fmt(o.meanRankNorm, 2)} (0 = primo, 1 = ultimo). Massimo di ciclo nella finestra in ${o.withPeak} cali su ${ORDER.episodes}: ${o.before} prima, ${o.together} insieme, ${o.after} dopo; scarto mediano ${sg(o.medianOffset).replace('.', ',')} giorni` +
        (o.none ? `; ${o.none} ${o.none === 1 ? 'calo' : 'cali'} senza un suo calo ≥ 20%` : '') + (o.nodata ? `; ${o.nodata} ${o.nodata === 1 ? 'calo' : 'cali'} prima dell'inizio della serie` : '') + '.';
      return `<span class="pkord" title="${esc(t)}">${esc(label[id])} <b>${fmt(o.meanRankNorm, 2)}</b></span>`;
    });
    $('pkOrder').innerHTML = `<span class="pkordh" title="Rango medio del giorno del massimo di ciclo negli ${ORDER.episodes} cali dell'S&amp;P 500 di almeno il 15% dal ${ORDER.from} al ${ORDER.to}: 0 = primo, 1 = ultimo. Dettagli nella guida.">Ordine tipico</span>: ` + items.join('<span class="muted"> · </span>');
  }
  function renderTimeline() {
    const body = $('pkBody');
    if (!athHistDone || !athDone) { $('pkMiss').hidden = false; $('pkMiss').textContent = 'Caricamento dello storico…'; body.innerHTML = ''; $('pkMeta').textContent = ''; return; }
    if (!tl) tl = buildTimeline();
    if (!tl || !tl.episodes.length) {
      $('pkMiss').hidden = false; body.innerHTML = ''; $('pkMeta').textContent = ''; $('pkOrder').innerHTML = '';
      $('pkMiss').textContent = 'Linea del tempo non disponibile: manca lo storico dell\'S&P 500 (data/ath_history.json). Tornerà dopo il prossimo aggiornamento.';
      return;
    }
    $('pkMiss').hidden = true;
    renderOrder(tl.ms);
    $('pkMeta').textContent = `ultimi ${tl.episodes.filter((e) => !e.ongoing).length} cali ≥ 15% dell'S&P 500 e quello in corso · chiusure al ${dIT(tl.asOf)}`;
    body.innerHTML = '';
    for (const ep of tl.episodes) {
      const box = document.createElement('div');
      box.className = 'pkep'; box.dataset.peak = ep.peak;
      const h = document.createElement('h3');
      h.innerHTML = `Massimo S&amp;P 500 ${dIT(ep.peak)} <span class="muted">·</span> ${ep.ddPct == null || ep.ddPct === 0 ? 'al massimo' : 'calo ' + esc(p1(ep.ddPct))}${ep.ongoing ? ' <span class="pkon">in corso</span>' : ''}`;
      box.append(h);
      const svg = el('svg', { class: 'ts pk', role: 'img' });
      box.append(svg);
      body.append(box);
      drawEpisode(svg, ep, tl.ms);
    }
  }
  function drawEpisode(svg, ep, ms) {
    // formato largo (testi a destra, 315 px) solo se ai 24 mesi restano almeno 520 px: tra 720 e 880 px le etichette
    // dell'asse si sovrapponevano (controllo della 1.12.0); sotto, testo sotto la riga come sul telefono
    const W = chartWidth(svg, 1400), narrow = W - 118 - 315 < 520;
    const padL = narrow ? 96 : 118, padR = narrow ? 10 : 315, T = 18, rowH = narrow ? 30 : 20, dotY = narrow ? 9 : 10;
    const PW = W - padL - padR, H = T + ms.length * rowH + 4;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.classList.toggle('nar', narrow);
    svg.setAttribute('aria-label', `Massimo dell'S&P 500 del ${dIT(ep.peak)}${ep.ongoing ? ' (calo in corso)' : ''}: giorno del massimo di ciclo di ogni mercato entro 12 mesi prima o dopo`);
    const x = (o) => padL + ((o + HALF) / (2 * HALF)) * PW;
    const y0 = T, y1 = T + ms.length * rowH;
    el('rect', { x: x(-TOGETHER), y: y0, width: x(TOGETHER) - x(-TOGETHER), height: y1 - y0, class: 'pkband' }, svg);
    for (const mo of [-12, -9, -6, -3, 3, 6, 9, 12]) {
      const xx = x(Math.round((mo * 365) / 12));
      el('line', { x1: xx, x2: xx, y1: y0, y2: y1, class: 'gridl' }, svg);
      if (!narrow || mo % 6 === 0) el('text', { x: xx, y: T - 6, class: 'axt', 'text-anchor': mo === 12 ? 'end' : mo === -12 ? 'start' : 'middle' }, svg).textContent = `${mo > 0 ? '+' : '−'}${Math.abs(mo)}${!narrow ? ' m' : Math.abs(mo) === 12 ? 'm' : ''}`;
    }
    el('line', { x1: x(0), x2: x(0), y1: y0, y2: y1, class: 'pkzero' }, svg);
    svg.dataset.x0 = x(-HALF).toFixed(2); svg.dataset.x1 = x(HALF).toFixed(2); // per i controlli: x di −365 e +365 giorni
    el('text', { x: x(0), y: T - 6, class: 'axt', 'text-anchor': 'middle' }, svg).textContent = '0';
    ms.forEach((mk, k) => {
      const m = ep.markets[mk.id] || { status: 'nodata' }, top = T + k * rowH, cy = top + dotY;
      const lab = el('text', { x: padL - 8, y: cy + 4, class: 'pklab', 'text-anchor': 'end' }, svg);
      lab.textContent = mk.label;
      if (narrow && mk.label.length > 13) lab.textContent = mk.label.replace(/ \(.*\)$/, '');
      el('line', { x1: padL, x2: padL + PW, y1: cy, y2: cy, class: 'pkrow' }, svg);
      const note = rowNote(m, narrow), dim = m.status === 'none' || m.status === 'nodata';
      if (m.status === 'peak') {
        for (const o of m.others) {
          const c = el('circle', { cx: x(o.offset).toFixed(1), cy, r: 4, class: 'pkalt', 'data-id': mk.id, 'data-o': o.offset }, svg);
          el('title', {}, c).textContent = `${mk.label}: altro massimo di ciclo ${sg(o.offset)} giorni, calo ${o.belowZero ? 'sotto zero' : p1(o.ddPct)}${o.ongoing ? ' finora' : ''} (${dIT(o.date)})`;
        }
      }
      if (m.status === 'peak' || m.status === 'anchor') {
        const c = el('circle', { cx: x(m.offset).toFixed(1), cy, r: 5, class: 'pkdot' + (m.status === 'anchor' ? ' pkanchor' : ''), 'data-id': mk.id, 'data-o': m.offset }, svg);
        el('title', {}, c).textContent = `${mk.label}: ${note}`;
      }
      const t = narrow ? el('text', { x: padL, y: top + rowH - 5, class: 'pknote' + (dim ? ' dim' : ''), 'data-id': mk.id }, svg) : el('text', { x: padL + PW + 10, y: cy + 4, class: 'pknote' + (dim ? ' dim' : ''), 'data-id': mk.id }, svg);
      t.textContent = note;
    });
  }

  function bind() {
    document.querySelectorAll('#athSort button').forEach((b) => b.onclick = () => { st.athSort = b.dataset.sort; store.set('athSort', st.athSort); if (athDone) renderAth(); });
    document.querySelectorAll('#athRange button').forEach((b) => b.onclick = () => { st.athRange = b.dataset.range; store.set('athRange', st.athRange); athZoom.reset(); if (athDone) renderAthChart(); });
    athZoom = zoomGroup('ath', { lens: $('athLens'), chips: [$('athZoom')], back: () => document.querySelector('#athRange [aria-pressed="true"]'), onChange: () => { if (athDone) renderAthChart(); } });
    athZoom.attach($('athChart'));
  }

  return { bind, render };
}
