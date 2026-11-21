/*
 * proto.js — prototipo (non è codice dell'app). Tre cose:
 * 1. il meccanismo proposto per le spiegazioni: un bottone «i» accanto a titoli e intestazioni che apre un piccolo
 *    riquadro al passaggio del mouse (sul computer) e al clic, al tocco, con Invio o Spazio; si chiude con Esc (il focus
 *    torna sul bottone), con un clic fuori o con un altro «i». Il testo viene da data-info oppure da un contenitore
 *    nascosto (data-src), così i testi che oggi i js scrivono in un elemento (vxScBig, titData…) restano dove sono;
 *    data-guide aggiunge il link alla sezione della guida;
 * 2. la scheda «0 Massimi» (solo per vedere il pannello delle bolle in una vista sua);
 * 3. l'accorciamento di alcuni testi generati dai js (nell'app si cambierebbero nei js stessi).
 */
(function () {
  // ---------- 1. popover delle spiegazioni ----------
  const pop = document.createElement('div');
  pop.className = 'infopop'; pop.hidden = true; pop.id = 'infopop';
  pop.innerHTML = '<div class="infopop-t" role="status"></div>';
  document.body.append(pop);
  let cur = null, pinned = false, tOpen = null, tClose = null;
  const fine = () => window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  function fill(btn) {
    const src = btn.dataset.src && document.getElementById(btn.dataset.src);
    const body = src ? src.innerHTML : `<p>${btn.dataset.info || ''}</p>`;
    const g = btn.dataset.guide ? `<p class="infopop-g"><a href="guida.html#${btn.dataset.guide}" target="_blank" rel="noopener">Nella guida ↗</a></p>` : '';
    pop.querySelector('.infopop-t').innerHTML = body + g;
  }
  function place(btn) {
    const r = btn.getBoundingClientRect(), w = Math.min(360, innerWidth - 24);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left - 12)) + 'px';
    const h = pop.offsetHeight, below = r.bottom + 6;
    pop.style.top = (below + h > innerHeight - 8 && r.top - h - 6 > 8 ? r.top - h - 6 : below) + 'px';
  }
  function open(btn, pin) {
    clearTimeout(tClose);
    if (cur && cur !== btn) cur.setAttribute('aria-expanded', 'false');
    cur = btn; pinned = pin;
    fill(btn); pop.hidden = false; place(btn);
    btn.setAttribute('aria-expanded', 'true');
  }
  function close(focus) {
    if (!cur) return;
    cur.setAttribute('aria-expanded', 'false');
    if (focus) cur.focus();
    pop.hidden = true; cur = null; pinned = false;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button.info');
    if (b) { e.preventDefault(); e.stopPropagation(); if (cur === b && pinned) close(false); else open(b, true); return; }
    if (cur && !pop.contains(e.target)) close(false);
  }, true);
  document.addEventListener('pointerover', (e) => {
    const b = e.target.closest && e.target.closest('button.info');
    if (!b || !fine() || pinned) return;
    clearTimeout(tOpen); tOpen = setTimeout(() => open(b, false), 120);
  });
  document.addEventListener('pointerout', (e) => {
    const b = e.target.closest && e.target.closest('button.info');
    if (!b || pinned) return;
    clearTimeout(tOpen);
    tClose = setTimeout(() => { if (!pinned && !pop.matches(':hover')) close(false); }, 250);
  });
  pop.addEventListener('pointerleave', () => { if (!pinned) close(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cur) { e.stopImmediatePropagation(); close(true); } }, true);
  addEventListener('scroll', () => { if (cur) place(cur); }, { passive: true });
  addEventListener('resize', () => { if (cur) place(cur); });

  // ---------- 2. scheda «0 Massimi» ----------
  const $ = (id) => document.getElementById(id);
  const waitFor = (sel, ms = 20000) => new Promise((res) => { const t0 = Date.now(); (function tick() { if (document.querySelector(sel)) res(true); else if (Date.now() - t0 > ms) res(false); else setTimeout(tick, 100); })(); });
  async function showAth() {
    if (!document.querySelector('#athTable tr.athr')) { location.hash = '#vix'; await waitFor('#athTable tr.athr'); }
    document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== 'v-ath'; });
    $('filters').hidden = true;
    document.querySelectorAll('.fnkeys [role=tab]').forEach((b) => { const on = b.id === 'tab-ath'; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    // la riga aperta si ridisegna alla larghezza giusta, ora che la vista è visibile
    const r = document.querySelector('#athTable tr.athr.on');
    if (r) { r.click(); r.click(); }
  }
  window.protoShowAth = showAth;
  document.addEventListener('click', (e) => {
    if (e.target.closest('#tab-ath')) { showAth(); return; }
    if (e.target.closest('.fnkeys button[data-view]')) { $('v-ath').hidden = true; $('tab-ath').setAttribute('aria-selected', 'false'); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === '0' && !e.target.closest('input, select, textarea')) showAth(); });

  // ---------- 3. testi generati, più corti ----------
  const set = (el, t) => { if (el.textContent !== t) el.textContent = t; };
  const patch = {
    titSpreadNote: (el) => { const m = /^(Equal-weight davanti in [^.]*\.)/.exec(el.textContent); if (m) set(el, m[1] + ' Clic su un settore per i suoi titoli.'); },
    vxScNote: (el) => {
      const t = el.textContent, a = /(\d[\d.]*) sedute, positive/.exec(t), b = /da (\d+) episodi con già 12 mesi di dati, positivi (\d+) su (\d+)/.exec(t);
      if (a && b) set(el, `${a[1]} sedute da ${b[1]} episodi (${b[2]} su ${b[3]} positivi dopo 12 mesi): le crisi lunghe pesano di più, la tabella conta gli episodi.`);
    },
    vxScMeta: (el) => { set(el, el.textContent.replace(/ · ogni punto è una seduta con il VIX a 30 o più · in orizzontale il VIX, in verticale il rendimento a 12 mesi dalla chiusura della seduta dopo/, ' · sedute con il VIX a 30 o più · rendimento a 12 mesi')); },
    vxLegend: (el) => { for (const s of el.querySelectorAll(':scope > span')) if (/grigi se la crisi/.test(s.textContent)) { const n = s.lastChild; if (n && n.nodeType === 3 && /grigi/.test(n.textContent)) n.textContent = n.textContent.replace(/ \(dal primo all'ultimo giorno\), nel colore della crisi; grigi se la crisi non è nello scatter/, ', nel colore della crisi'); } },
  };
  const busy = new Set();
  const mo = new MutationObserver(() => {
    for (const id in patch) { const el = $(id); if (!el || busy.has(id)) continue; busy.add(id); patch[id](el); busy.delete(id); }
  });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true });
})();
