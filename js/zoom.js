/*
 * zoom.js — zoom su un sottoperiodo nei grafici con il tempo in ascissa, uguale in tutta l'app (PROTOTIPO, fase 1).
 *
 * Computer: si trascina sul grafico da una data all'altra; al rilascio il grafico si ridisegna su quel tratto (scale
 * ricalcolate sui dati visibili). Telefono: il trascinamento serve a scorrere la pagina, quindi prima si tocca la lente
 * (pulsante accanto ai periodi), poi si trascina. Si torna al periodo scelto con il pulsante «×» dell'etichetta dello zoom,
 * con un doppio clic sul grafico, con Esc o scegliendo un periodo. Un clic senza trascinamento resta il riquadro dei valori.
 *
 * Uso: const z = attachZoom({ svg, frame, lens, chip, onChange(range|null) }) e a ogni disegno z.update({ L, PW, top,
 * bottom, t0, t1 }) con l'area del grafico in unità SVG e la finestra mostrata (millisecondi). z.range è lo zoom attivo.
 */
const NS = 'http://www.w3.org/2000/svg';
const DAY = 86400000;
const it = (t) => { const d = new Date(t); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`; };

/** Intervallo selezionato tra due x (unità SVG) → [t0, t1] in ms, ordinato, dentro la finestra, almeno minDays giorni */
export function pickRange(xa, xb, g, minDays = 10) {
  const toT = (x) => g.t0 + ((Math.max(g.L, Math.min(g.L + g.PW, x)) - g.L) / g.PW) * (g.t1 - g.t0);
  let a = toT(Math.min(xa, xb)), b = toT(Math.max(xa, xb));
  if (b - a < minDays * DAY) return null;
  return [Math.round(a / DAY) * DAY, Math.round(b / DAY) * DAY];
}

export function attachZoom({ svg, lens, chip, onChange }) {
  let g = null, drag = null, band = null, lensOn = false;
  const z = { range: null };
  const toSvgX = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const setRange = (r) => {
    z.range = r;
    if (chip) { chip.hidden = !r; if (r) chip.querySelector('span').textContent = `Zoom: ${it(r[0])} – ${it(r[1])}`; }
    onChange(r);
  };
  const setLens = (on) => { lensOn = on; if (lens) lens.setAttribute('aria-pressed', String(on)); svg.classList.toggle('zooming', on); };
  if (lens) lens.onclick = () => setLens(!lensOn);
  if (chip) chip.querySelector('button').onclick = () => setRange(null);
  svg.addEventListener('dblclick', (e) => { if (z.range) { e.preventDefault(); setRange(null); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && z.range && svg.isConnected && svg.getBoundingClientRect().width) setRange(null); });
  svg.addEventListener('pointerdown', (e) => {
    if (!g || (e.pointerType === 'mouse' ? e.button !== 0 : !lensOn)) return;
    const q = toSvgX(e);
    if (q.x < g.L || q.x > g.L + g.PW || q.y < g.top || q.y > g.bottom) return;
    if (e.pointerType === 'mouse') e.preventDefault(); // niente selezione del testo della pagina durante il trascinamento
    drag = { x: q.x, id: e.pointerId, moved: false };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const q = toSvgX(e);
    if (!drag.moved && Math.abs(q.x - drag.x) < 4) return;
    drag.moved = true;
    if (!band) { band = document.createElementNS(NS, 'rect'); band.setAttribute('class', 'zoomband'); svg.appendChild(band); try { svg.setPointerCapture(e.pointerId); } catch {} }
    const a = Math.max(g.L, Math.min(drag.x, q.x)), b = Math.min(g.L + g.PW, Math.max(drag.x, q.x));
    band.setAttribute('x', a); band.setAttribute('width', Math.max(1, b - a)); band.setAttribute('y', g.top); band.setAttribute('height', g.bottom - g.top);
    const tip = svg.parentNode && svg.parentNode.querySelector('.tip'); if (tip) tip.hidden = true;
  });
  const end = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    if (band) { band.remove(); band = null; }
    if (!d.moved || !e) return;
    const r = pickRange(d.x, toSvgX(e).x, g);
    if (r) { setLens(false); setRange(r); }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', () => { drag = null; if (band) { band.remove(); band = null; } });
  z.update = (geo) => { g = geo; };
  z.reset = () => { if (z.range) { z.range = null; if (chip) chip.hidden = true; } };
  return z;
}

/** Tacche dell'asse del tempo per una finestra qualsiasi: anni, trimestri, mesi o settimane, al massimo maxN etichette */
export function timeTicks(t0, t1, maxN = 10) {
  const out = [], d0 = new Date(t0), y0 = d0.getUTCFullYear(), y1 = new Date(t1).getUTCFullYear();
  const years = (t1 - t0) / (365.25 * DAY);
  if (years >= 2.5) {
    const every = Math.max(1, Math.ceil((y1 - y0 + 1) / maxN));
    for (let y = y0 + 1; y <= y1; y++) if (!((y - y0) % every)) out.push({ t: Date.UTC(y, 0, 1), label: String(y) });
    return out;
  }
  const months = (t1 - t0) / (30.44 * DAY);
  if (months >= 2) {
    const step = [1, 2, 3, 6].find((s) => months / s <= maxN) || 12;
    const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
    for (let y = y0, m = d0.getUTCMonth() + 1; Date.UTC(y, m, 1) <= t1; m++) {
      if (m > 11) { m = 0; y++; }
      const t = Date.UTC(y, m, 1); if (t <= t0 || t > t1 || m % step) continue;
      out.push({ t, label: m === 0 ? String(y) : `${MM[m]}${months > 8 ? '' : ' ' + String(y).slice(2)}` });
    }
    return out;
  }
  const days = (t1 - t0) / DAY, step = [1, 2, 7, 14].find((s) => days / s <= maxN) || 28;
  for (let t = Math.ceil(t0 / DAY) * DAY; t <= t1; t += DAY) { const d = new Date(t); if (step >= 7 ? d.getUTCDay() === 1 && Math.round((t - t0) / DAY) % step < 7 : Math.round((t - t0) / DAY) % step === 0) out.push({ t, label: it(t).slice(0, 5) }); }
  return out;
}
