/* info.js — bottone «i» delle spiegazioni (1.13.0).
 * Un piccolo bottone accanto a un titolo, a un'intestazione o a una voce di legenda apre un riquadro con la spiegazione:
 * - col mouse al passaggio (dopo 120 ms; si chiude uscendo, a meno che il puntatore non passi sul riquadro);
 * - al clic, al tocco, con Invio o Spazio resta aperto finché non si clicca o tocca fuori, si preme Esc (il focus torna
 *   sul bottone) o si apre un altro «i». Uno solo aperto per volta.
 * Il testo viene da data-info (testo semplice) oppure da un contenitore nascosto (data-src = id): così i js che scrivono
 * già in un elemento (titData, vxScBig, pxCopied…) continuano a farlo e il riquadro mostra sempre il testo di oggi.
 * data-guide aggiunge il link «Nella guida ↗» alla sezione della guida (guida.html#…).
 * Eventi delegati sul documento, legati una sola volta (bindInfo): valgono anche per i bottoni nelle intestazioni che i
 * js ridisegnano. Il clic sul bottone non arriva a righe, pulsanti di ordinamento e <summary>.
 */

/**
 * Posizione del riquadro (logica pura, provata in test/info.test.js): sotto il bottone, allineato al suo bordo sinistro
 * meno 12 px, dentro lo schermo con 12 px di margine; sopra il bottone se sotto non c'è posto e sopra sì; se non c'è
 * posto né sotto né sopra, alzato quanto basta per stare nello schermo.
 * @param {{left:number, top:number, bottom:number}} r rettangolo del bottone (coordinate della finestra)
 * @param {number} vw larghezza della finestra
 * @param {number} vh altezza della finestra
 * @param {number} h altezza del riquadro
 * @param {number} [max=360] larghezza massima del riquadro
 * @returns {{left:number, top:number, width:number, above:boolean}}
 */
export function placeBox(r, vw, vh, h, max = 360) {
  const width = Math.max(120, Math.min(max, vw - 24));
  const left = Math.max(12, Math.min(vw - width - 12, r.left - 12));
  const below = r.bottom + 6, aboveTop = r.top - h - 6;
  const fitsBelow = below + h <= vh - 8, above = !fitsBelow && aboveTop >= 8;
  // non entra né sotto né sopra: si alza quanto serve per restare nello schermo (copre il bottone, si legge tutto)
  const top = fitsBelow ? below : above ? aboveTop : Math.max(8, vh - h - 8);
  return { left, top, width, above };
}

let bound = false;
let closeFn = () => {};

/** Chiude il riquadro aperto, se c'è (cambio di vista da js/app.js: pushState non manda hashchange). */
export function closeInfo() { closeFn(false); }

/** Lega i gestori una sola volta (chiamata da bind() di js/app.js). */
export function bindInfo() {
  if (bound || typeof document === 'undefined') return;
  bound = true;
  const pop = document.createElement('div');
  pop.className = 'infopop'; pop.id = 'infopop'; pop.hidden = true;
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'infopop-x'; x.setAttribute('aria-label', 'Chiudi la spiegazione'); x.textContent = '×';
  const body = document.createElement('div');
  body.className = 'infopop-t'; body.setAttribute('role', 'status');
  pop.append(x, body);
  document.body.append(pop);
  let cur = null, pinned = false, tOpen = 0, tClose = 0;
  const fine = () => !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  const btnOf = (t) => (t && t.closest ? t.closest('button.info') : null);

  function fill(btn) {
    body.textContent = '';
    const src = btn.dataset.src && document.getElementById(btn.dataset.src);
    if (src) { body.innerHTML = src.innerHTML; for (const e of body.querySelectorAll('[id]')) e.removeAttribute('id'); } // contenitori nascosti della pagina (testi dell'app, non dati esterni); la copia senza id, per non duplicarli
    else { const p = document.createElement('p'); p.textContent = btn.dataset.info || ''; body.append(p); }
    if (btn.dataset.guide) {
      const g = document.createElement('p'); g.className = 'infopop-g';
      const a = document.createElement('a');
      a.href = 'guida.html#' + btn.dataset.guide; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Nella guida ↗';
      g.append(a); body.append(g);
    }
  }
  function place(btn) {
    const r = btn.getBoundingClientRect();
    pop.style.width = placeBox(r, innerWidth, innerHeight, 0).width + 'px';
    const b = placeBox(r, innerWidth, innerHeight, pop.offsetHeight);
    pop.style.left = b.left + 'px'; pop.style.top = b.top + 'px';
    pop.classList.toggle('up', b.above);
  }
  function open(btn, pin) {
    clearTimeout(tClose); clearTimeout(tOpen);
    if (cur && cur !== btn) cur.setAttribute('aria-expanded', 'false');
    cur = btn; pinned = pin;
    fill(btn); pop.hidden = false; place(btn);
    btn.setAttribute('aria-expanded', 'true');
  }
  function close(focus) {
    clearTimeout(tOpen); clearTimeout(tClose);
    if (!cur) return;
    const b = cur;
    cur = null; pinned = false; pop.hidden = true;
    b.setAttribute('aria-expanded', 'false');
    if (focus && b.isConnected) b.focus();
  }
  closeFn = close;
  x.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); close(true); });
  // clic, tocco, Invio e Spazio (i bottoni li trasformano in clic): in cattura, prima di righe, intestazioni e <summary>
  document.addEventListener('click', (e) => {
    const b = btnOf(e.target);
    if (b) {
      e.preventDefault(); e.stopPropagation();
      if (cur === b && pinned) close(false); else open(b, true);
      return;
    }
    if (cur && !pop.contains(e.target)) close(false);
  }, true);
  // passaggio del mouse, solo con un puntatore fine (sul telefono il tocco fa già il clic)
  document.addEventListener('pointerover', (e) => {
    const b = btnOf(e.target);
    if (!b || e.pointerType === 'touch' || !fine() || pinned) return;
    clearTimeout(tClose);
    if (cur === b) return;
    clearTimeout(tOpen); tOpen = setTimeout(() => open(b, false), 120);
  });
  document.addEventListener('pointerout', (e) => {
    const b = btnOf(e.target);
    if (!b || pinned) return;
    if (b.contains(e.relatedTarget)) return;
    clearTimeout(tOpen);
    tClose = setTimeout(() => { if (!pinned && !pop.matches(':hover')) close(false); }, 250);
  });
  pop.addEventListener('pointerleave', () => { if (!pinned && cur) tClose = setTimeout(() => { if (!pinned && !(cur && cur.matches(':hover'))) close(false); }, 150); });
  pop.addEventListener('pointerenter', () => clearTimeout(tClose));
  // Esc: su window in cattura, prima dello zoom (js/zoom.js ascolta sul documento in cattura) e degli altri gestori.
  // Con un riquadro aperto il primo Esc chiude solo il riquadro.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !cur) return;
    e.preventDefault(); e.stopImmediatePropagation();
    close(pinned); // aperto solo col mouse: il focus resta dov'era
  }, true);
  // Tab dal bottone con il riquadro aperto: il focus entra nel riquadro (× e «Nella guida ↗»); Tab oltre l'ultimo
  // elemento del riquadro lo chiude e torna al bottone, così si prosegue nella pagina da lì
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !cur || e.altKey || e.ctrlKey || e.metaKey) return;
    const f = [...pop.querySelectorAll('button, a[href]')];
    if (!e.shiftKey && document.activeElement === cur && f.length) { e.preventDefault(); f[0].focus(); return; }
    if (pop.contains(document.activeElement)) {
      const i = f.indexOf(document.activeElement);
      if ((!e.shiftKey && i === f.length - 1) || (e.shiftKey && i === 0)) { e.preventDefault(); close(true); }
    }
  });
  // Tab fuori dal bottone e dal riquadro: si chiude (senza riportare il focus)
  document.addEventListener('focusin', (e) => { if (cur && e.target !== cur && !pop.contains(e.target)) close(false); });
  addEventListener('scroll', () => { if (cur) { if (cur.isConnected) place(cur); else close(false); } }, { passive: true, capture: true });
  addEventListener('resize', () => { if (cur) place(cur); });
  // cambiando vista il riquadro si chiude
  addEventListener('hashchange', () => close(false));
}
