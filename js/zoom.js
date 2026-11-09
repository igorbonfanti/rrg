/*
 * zoom.js — zoom su un sottoperiodo nei grafici con il tempo in ascissa, uguale in tutta l'app.
 *
 * Computer: si trascina sul grafico da una data all'altra; al rilascio il grafico si ridisegna su quel tratto (scale
 * ricalcolate sui dati visibili). Telefono: il trascinamento serve a scorrere la pagina, quindi prima si tocca la lente
 * (pulsante accanto ai periodi), poi si trascina; dopo lo zoom la lente si spegne. Si torna al periodo con «×»
 * dell'etichetta «Zoom: dal … al …», con un doppio clic sul grafico, con Esc o con un pulsante del periodo (anche quello
 * già scelto). Un clic senza trascinamento resta il riquadro dei valori.
 *
 * Lo zoom è una coppia di date ISO [d0, d1] per gruppo di grafici (gli stessi gruppi della linea condivisa, syncX): vale
 * per tutti i grafici del gruppo, resta cambiando settore, indice o paese (tagliato alla storia disponibile) e non si
 * salva nel browser.
 *
 * Uso: const z = zoomGroup('sec', { lens, chips: [..], onChange, back }); z.attach(svg) una volta; in chi disegna
 * const w = z.idx(dates, i0, i1) (grafici per seduta) oppure z.time(t0, t1, dates) (grafici per data), poi, con la
 * geometria, z.geo(svg, { L, PW, top, bottom, dates }) oppure { …, t0, t1, dates }.
 */
const NS = 'http://www.w3.org/2000/svg';
const DAY = 86400000;
export const MIN_SESSIONS = 10;
const dIT = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const isoOf = (t) => new Date(t).toISOString().slice(0, 10);

/** «dal 03/02/2020 al 15/05/2020» */
export const zoomText = (r) => `dal ${dIT(r[0])} al ${dIT(r[1])}`;

// prima posizione con a[k] >= d (lb) e con a[k] > d (ub), in un elenco di date ISO in ordine
const lb = (a, d) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < d) lo = m + 1; else hi = m; } return lo; };
const ub = (a, d) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= d) lo = m + 1; else hi = m; } return lo; };
/** Sedute di `dates` tra d0 e d1 compresi */
export const countIn = (dates, d0, d1) => Math.max(0, ub(dates, d1) - lb(dates, d0));

/**
 * Data sotto una x (unità SVG), con la stessa regola del riquadro dei valori del grafico.
 * g = { L, PW, dates } per i grafici per seduta (x = L + i/(n−1)·PW), { L, PW, t0, t1, dates } per quelli per data
 * (la seduta più vicina in `dates`, dentro la finestra).
 */
export function dateAt(x, g) {
  const f = (Math.max(g.L, Math.min(g.L + g.PW, x)) - g.L) / g.PW, ds = g.dates;
  if (g.t0 == null) return ds[Math.max(0, Math.min(ds.length - 1, Math.round(f * (ds.length - 1))))];
  const t = g.t0 + f * (g.t1 - g.t0), a = lb(ds, isoOf(g.t0)), b = ub(ds, isoOf(g.t1)) - 1;
  if (b < a) return null;
  let k = Math.max(a, Math.min(b, lb(ds, isoOf(t))));
  if (k > a && Math.abs(Date.parse(ds[k - 1]) - t) <= Math.abs(Date.parse(ds[k]) - t)) k--;
  return ds[k];
}

/** Tratto selezionato tra due x → [d0, d1] (date di sedute, in ordine), oppure null se ha meno di minN sedute */
export function pickRange(xa, xb, g, minN = MIN_SESSIONS) {
  const a = dateAt(Math.min(xa, xb), g), b = dateAt(Math.max(xa, xb), g);
  if (!a || !b || countIn(g.dates, a, b) < minN) return null;
  return [a, b];
}

/**
 * Finestra di un grafico per seduta: le sedute di `dates` tra iBase e iEnd (il periodo scelto) dentro lo zoom.
 * Se lo zoom lascia meno di minN sedute (per esempio un indice con la storia che inizia dopo) resta il periodo.
 */
export function windowIdx(dates, iBase, iEnd, range, minN = MIN_SESSIONS) {
  if (!range) return { i0: iBase, i1: iEnd, zoomed: false };
  const i0 = Math.max(iBase, lb(dates, range[0])), i1 = Math.min(iEnd, ub(dates, range[1]) - 1);
  if (i1 - i0 + 1 < minN) return { i0: iBase, i1: iEnd, zoomed: false };
  return { i0, i1, zoomed: true };
}

/** Finestra di un grafico per data (millisecondi): l'intersezione tra periodo e zoom, null se ha meno di minN sedute di `dates` */
export function windowTime(t0, t1, range, dates, minN = MIN_SESSIONS) {
  if (!range) return null;
  const a = Math.max(t0, Date.parse(range[0])), b = Math.min(t1, Date.parse(range[1]));
  if (!(b > a) || (dates && countIn(dates, isoOf(a), isoOf(b)) < minN)) return null;
  return [a, b];
}

/** Tacche dell'asse del tempo per una finestra qualsiasi: anni, mesi o giorni, al massimo maxN etichette */
export function timeTicks(t0, t1, maxN = 10) {
  const out = [], d0 = new Date(t0), y0 = d0.getUTCFullYear(), y1 = new Date(t1).getUTCFullYear();
  const years = (t1 - t0) / (365.25 * DAY);
  if (years >= 2.5) {
    const every = Math.max(1, Math.ceil((y1 - y0 + 1) / maxN));
    for (let y = y0 + 1; y <= y1; y++) if (!((y - y0) % every)) out.push({ t: Date.UTC(y, 0, 1), label: String(y) });
    return out;
  }
  const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const months = (t1 - t0) / (30.44 * DAY);
  if (months >= 2) {
    const step = [1, 2, 3, 6].find((s) => months / s <= maxN) || 12;
    for (let y = y0, m = d0.getUTCMonth() + 1; Date.UTC(y, m, 1) <= t1; m++) {
      if (m > 11) { m = 0; y++; }
      const t = Date.UTC(y, m, 1); if (t <= t0 || t > t1 || m % step) continue;
      out.push({ t, label: m === 0 ? String(y) : `${MM[m]}${months > 8 ? '' : ' ' + String(y).slice(2)}` });
    }
    return out;
  }
  // meno di due mesi: un giorno ogni 1 o 2, oppure i lunedì (ogni 1 o 2 settimane)
  const days = (t1 - t0) / DAY, step = [1, 2, 7, 14].find((s) => days / s <= maxN) || 28;
  let k = 0;
  for (let t = Math.ceil((t0 + 1) / DAY) * DAY; t <= t1; t += DAY) {
    const d = new Date(t);
    if (step >= 7) { if (d.getUTCDay() !== 1) continue; if (k++ % (step / 7)) continue; } else if (Math.round((t - t0) / DAY) % step) continue;
    out.push({ t, label: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}` });
  }
  return out;
}

/** Le stesse tacche per un grafico per seduta: ogni tacca va sulla prima seduta dalla sua data in poi → [{ i, label }] */
export function sessionTicks(dates, maxN = 10) {
  if (dates.length < 2) return [];
  const out = [];
  for (const tk of timeTicks(Date.parse(dates[0]), Date.parse(dates.at(-1)), maxN)) {
    const i = lb(dates, isoOf(tk.t));
    if (i > 0 && i < dates.length && (!out.length || out.at(-1).i !== i)) out.push({ i, label: tk.label });
  }
  return out;
}

// ---------- collegamento al DOM ----------
const GROUPS = new Map();
let liveEl = null;
const announce = (txt) => {
  if (!liveEl) { liveEl = document.createElement('div'); liveEl.className = 'zlive'; liveEl.setAttribute('aria-live', 'polite'); document.body.appendChild(liveEl); }
  liveEl.textContent = txt;
};
const visible = (svg) => svg.isConnected && svg.getBoundingClientRect().width > 0;

if (typeof document !== 'undefined') {
  // Esc toglie prima lo zoom del grafico visibile, e solo quello (l'evidenza della RRG o la crisi del VIX restano per il
  // secondo Esc): ascolto in cattura, prima degli altri gestori della pagina
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return; // con la guida aperta Esc chiude la guida
    let done = false;
    for (const z of GROUPS.values()) {
      if (z.lensOn && [...z.svgs.keys()].some(visible)) z.setLens(false);
      if (z.shown && [...z.svgs.keys()].some(visible)) { z.clear(); done = true; }
    }
    if (done) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // cambiando vista la lente si spegne: accesa, il grafico non lascia scorrere la pagina al tocco
  window.addEventListener('hashchange', () => { for (const z of GROUPS.values()) z.setLens(false); });
}

/**
 * Gruppo di grafici con lo stesso zoom.
 * @param {string} key chiave del gruppo
 * @param {{lens?: HTMLButtonElement, chips?: HTMLElement[], onChange: Function, back?: () => HTMLElement|null}} o
 *   chips: etichette «Zoom: dal … al … ×» (span con uno span per il testo e il pulsante ×); back: dove va il focus dopo «×»
 */
export function zoomGroup(key, { lens, chips = [], onChange, back }) {
  const z = { key, range: null, shown: null, lensOn: false, svgs: new Map() };
  const paint = () => {
    for (const c of chips) { if (!c) continue; c.hidden = !z.shown; if (z.shown) c.querySelector('span').textContent = `Zoom: ${zoomText(z.shown)}`; }
    for (const svg of z.svgs.keys()) svg.setAttribute('aria-label', svg.dataset.zlabel + (z.shown ? ` · zoom ${zoomText(z.shown)}` : ''));
  };
  // shown: il tratto davvero mostrato nell'ultimo disegno (lo zoom tagliato alla storia della serie), o null
  const setShown = (r) => { const was = z.shown ? z.shown.join() : '', now = r ? r.join() : ''; z.shown = r; if (was !== now) paint(); };
  z.setLens = (on) => { z.lensOn = on; if (lens) lens.setAttribute('aria-pressed', String(on)); for (const svg of z.svgs.keys()) svg.classList.toggle('zooming', on); };
  /** Toglie lo zoom senza ridisegnare (per chi ridisegna subito dopo, come i pulsanti del periodo) */
  z.reset = () => { z.range = null; setShown(null); };
  /** Toglie lo zoom e ridisegna */
  z.clear = () => { const had = z.range; z.reset(); if (had) { onChange(); announce('Zoom tolto: torna il periodo scelto'); } };
  z.set = (r) => { z.range = r; onChange(); if (z.shown) announce(`Zoom ${zoomText(z.shown)}`); };
  z.idx = (dates, iBase, iEnd, minN = MIN_SESSIONS) => {
    const w = windowIdx(dates, iBase, iEnd, z.range, minN);
    setShown(w.zoomed ? [dates[w.i0], dates[w.i1]] : null);
    return w;
  };
  z.time = (t0, t1, dates, minN = MIN_SESSIONS) => {
    const w = windowTime(t0, t1, z.range, dates, minN);
    setShown(w ? (dates ? [dates[lb(dates, isoOf(w[0]))], dates[ub(dates, isoOf(w[1])) - 1]] : [isoOf(w[0]), isoOf(w[1])]) : null);
    return w;
  };
  z.geo = (svg, g) => { if (z.svgs.has(svg)) z.svgs.set(svg, g); };
  if (lens) lens.onclick = () => z.setLens(!z.lensOn);
  for (const c of chips) if (c) c.querySelector('button').onclick = () => { z.clear(); const b = back && back(); if (b) b.focus(); };

  z.attach = (svg) => {
    if (z.svgs.has(svg)) return;
    z.svgs.set(svg, null);
    svg.dataset.zlabel = svg.getAttribute('aria-label') || '';
    svg.classList.add('zoomable');
    let drag = null, band = null, label = null;
    const toSvg = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
    const stop = () => { drag = null; svg._zoomDrag = false; if (band) { band.remove(); label.remove(); band = label = null; } };
    svg.addEventListener('dblclick', (e) => { if (z.range) { e.preventDefault(); z.clear(); } });
    svg.addEventListener('pointerdown', (e) => {
      const g = z.svgs.get(svg);
      if (!g || (e.pointerType === 'mouse' ? e.button !== 0 : !z.lensOn)) return;
      const q = toSvg(e);
      if (q.x < g.L || q.x > g.L + g.PW || q.y < g.top || q.y > g.bottom) return;
      if (e.pointerType === 'mouse') e.preventDefault(); // niente selezione del testo della pagina durante il trascinamento
      drag = { x: q.x, id: e.pointerId, moved: false };
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const g = z.svgs.get(svg), q = toSvg(e);
      if (!drag.moved && Math.abs(q.x - drag.x) < 5) return;
      if (!drag.moved) {
        // da qui è una selezione: via riquadro, mirino e linea condivisa finché non si rilascia
        drag.moved = true; svg._zoomDrag = true;
        if (svg._tipHide) svg._tipHide();
        band = document.createElementNS(NS, 'rect'); band.setAttribute('class', 'zoomband');
        label = document.createElementNS(NS, 'text'); label.setAttribute('class', 'zoomlab');
        svg.append(band, label);
        try { svg.setPointerCapture(e.pointerId); } catch { /* il puntatore può essere già rilasciato */ }
      }
      const a = Math.max(g.L, Math.min(drag.x, q.x)), b = Math.min(g.L + g.PW, Math.max(drag.x, q.x));
      const d0 = dateAt(a, g), d1 = dateAt(b, g), ok = d0 && d1 && countIn(g.dates, d0, d1) >= MIN_SESSIONS;
      band.setAttribute('x', a); band.setAttribute('width', Math.max(1, b - a)); band.setAttribute('y', g.top); band.setAttribute('height', g.bottom - g.top);
      band.classList.toggle('short', !ok);
      if (d0 && d1) {
        label.textContent = `${dIT(d0)} – ${dIT(d1)}`;
        const mid = (a + b) / 2, w = 150;
        label.setAttribute('x', Math.max(g.L + w / 2, Math.min(g.L + g.PW - w / 2, mid))); label.setAttribute('y', g.top + 13); label.setAttribute('text-anchor', 'middle');
      }
    });
    svg.addEventListener('pointerup', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag, g = z.svgs.get(svg);
      stop();
      if (!d.moved) return;
      const r = pickRange(d.x, toSvg(e).x, g);
      if (r) { z.setLens(false); z.set(r); }
    });
    svg.addEventListener('pointercancel', stop);
    if (z.lensOn) svg.classList.add('zooming');
  };
  GROUPS.set(key, z);
  return z;
}
