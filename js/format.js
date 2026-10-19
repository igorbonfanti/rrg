/* format.js — formattazione numeri/date all'italiana e piccoli elementi grafici condivisi. */

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Numeri all'italiana con il segno meno tipografico (−); un valore che arrotondato vale zero non ha segno
const zero = (v, d) => +Math.abs(v).toFixed(d) === 0;
export const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : (v < 0 && !zero(v, d) ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ','));
/** Decimali di un prezzo: tre sotto 10 (l'ETF del CSI 300 vale circa 4 yuan: con due decimali un centesimo è lo 0,24%). */
export const pxDec = (v) => (v != null && Math.abs(v) < 10 ? 3 : 2);
export const sgn = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : (zero(v, d) ? '' : v > 0 ? '+' : '−') + fmt(Math.abs(v), d));
// variazione con segno e «%»; un valore mancante resta «—» (non «—%»)
export const sgnP = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : sgn(v, d) + '%');
export const pct = (v, d = 1) => (v == null || !Number.isFinite(v) ? '<span class="muted">—</span>' : `<span class="${zero(v, d) ? '' : v > 0 ? 'up' : 'down'}">${sgnP(v, d)}</span>`);
export const dIT = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

export const QKEY = { Leading: 'lead', Weakening: 'weak', Lagging: 'lag', Improving: 'imp' };

// Drawdown dal massimo a 52 settimane: note per i due valori, con i dividendi e sul solo prezzo
export const DD_TIP = 'Calo dalla chiusura più alta delle ultime 52 settimane, con i dividendi reinvestiti (prezzi rettificati): ' +
  'è la perdita effettiva di chi ha tenuto il titolo e la base di segnali, percentili e colori.';
export const DDP_TIP = 'Stesso calcolo sul solo prezzo, senza i dividendi: calo dalla chiusura più alta delle ultime 52 settimane, come sul grafico di TradingView. ' +
  "Rispetto all'altro valore cambia solo per le cedole staccate dopo il massimo: per chi non ne paga (oro, bitcoin) i due valori coincidono. " +
  'Il «massimo a 52 settimane» della scheda di TradingView è invece il picco intraday, che può stare più in alto della chiusura.';
// m = max52 {hi, d, c, dv, da, ih, id, all} alla data asOf (chiusura più alta e ultima senza rettifica, cedole nel
// periodo e dopo il massimo, massimo intraday); dd = drawdown con i dividendi. Di cedole si parla solo per chi
// ne paga. Senza m: per una serie calcolata dall'app (portafoglio, CPI…) non c'è un grafico da confrontare
export function ddpTip(m, asOf, dd, synthetic = false) {
  if (!m) return synthetic ? "Serie calcolata dall'app: non c'è un grafico di prezzo con cui confrontarla." : DDP_TIP;
  const v = (m.c / m.hi - 1) * 100;
  const t = [m.c >= m.hi ? `Ultima chiusura ${fmt(m.c, 2)} del ${dIT(asOf)}: è la più alta delle 52 settimane.`
    : `Chiusura più alta ${fmt(m.hi, 2)} del ${dIT(m.d)}, ultima ${fmt(m.c, 2)} del ${dIT(asOf)}: ${sgnP(v)}.`];
  if (m.da > 0) t.push(`Con i dividendi reinvestiti ${sgnP(dd)}: la differenza ${m.da === 1 ? 'è la cedola staccata' : `sono le ${m.da} cedole staccate`} dopo il massimo.`);
  else if (m.dv > 0) t.push('Nessuna cedola dopo il massimo: stesso valore del drawdown con i dividendi.');
  if (m.ih != null && m.ih > m.hi * 1.0005) {
    t.push(`Il «massimo a 52 settimane» di TradingView è il picco intraday, ${fmt(m.ih, 2)} del ${dIT(m.id)}: da lì il calo è ${sgnP((m.c / m.ih - 1) * 100)}.`);
  }
  if (m.all) t.push('Quota tutti i giorni: contano anche i fine settimana.');
  return t.join(' ');
}

// Tooltip dei grafici con il mouse e al tocco: col mouse segue il puntatore e sparisce uscendo; al tocco (o con la penna)
// si apre dove si tocca, resta aperto e si chiude con un tocco fuori dal grafico.
const TIPPED = new Set();
export function bindTip(target, svg, show, hide) {
  target.addEventListener('pointermove', show);
  target.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') show(e); });
  target.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  hideOnTapOutside(svg, hide);
}
export function hideOnTapOutside(svg, hide) {
  svg._tipHide = hide;
  if (!TIPPED.size) document.addEventListener('pointerdown', (e) => { for (const x of TIPPED) if (!x.contains(e.target) && x._tipHide) x._tipHide(); }, true);
  TIPPED.add(svg);
}

// Larghezza del disegno in unità SVG: i pixel reali × 1,15 (sul telefono × 1), tra `min` e `max`. Sul telefono il
// grafico si disegna più stretto invece di rimpicciolirsi, così il testo resta di circa 10 px.
export function chartWidth(svg, max, min = 280) {
  const w = svg.getBoundingClientRect().width;
  return w ? Math.round(Math.max(min, Math.min(max, w * (w < 500 ? 1 : 1.15)))) : max;
}

// Articolo davanti a una percentuale scritta come `s` («0,0» → Lo, «1»/«8»/«11»/«80-89» → L', altrimenti Il)
export function ilPct(s) {
  const n = parseInt(String(s).replace(/^−/, ''), 10);
  return n === 0 ? 'Lo' : n === 1 || n === 8 || n === 11 || (n >= 80 && n <= 89) ? "L'" : 'Il';
}
// "del 40%", "dell'80%", "dello 0%" (percentile arrotondato)
export const delPct = (v) => { const r = Math.round(v), a = ilPct(r); return `${a === 'Lo' ? 'dello ' : a === "L'" ? "dell'" : 'del '}${r}%`; };

// Riscrive i pulsanti di `box` senza perdere il focus della tastiera: torna sul pulsante con lo stesso `attr`
export function keepFocus(box, attr, html) {
  const a = document.activeElement;
  const v = a && box.contains(a) ? a.getAttribute(attr) : null;
  box.innerHTML = html;
  if (v != null) { const b = box.querySelector(`[${attr}="${CSS.escape(v)}"]`); if (b) b.focus(); }
}

// Posiziona un tooltip vicino al puntatore, senza farlo uscire dal contenitore
export function placeTip(tip, wrap, e, dy = 14) {
  const wr = wrap.getBoundingClientRect();
  tip.hidden = false;
  const w = tip.offsetWidth || 210;
  let x = e.clientX - wr.left + 14;
  if (x + w > wr.width) x = e.clientX - wr.left - w - 10;
  tip.style.left = Math.max(4, Math.min(x, wr.width - w - 4)) + 'px';
  tip.style.top = Math.max(0, e.clientY - wr.top + dy) + 'px';
}

// freccia che punta nella direzione `deg` (gradi bussola, 0° = nord)
export const arrow = (deg) => (deg == null ? '' : `<svg class="arrow" viewBox="-7 -7 14 14" aria-hidden="true"><g transform="rotate(${(deg - 90).toFixed(1)})"><line x1="-5" y1="0" x2="3" y2="0" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 0 L0.8 -3.4 L0.8 3.4 Z" fill="currentColor"/></g></svg>`);
export const qPill = (q, deg) => `<span class="pill q-${QKEY[q]}-c"><span class="d"></span>${q}${deg == null ? '' : ' ' + arrow(deg)}</span>`;

// Lista "perché questo stato e cosa manca" (signals.js explainState): ✓ soddisfatta, ✗ manca, i = informazione
export function checklistHTML(e) {
  const mark = (ok) => (ok == null ? '<span class="ck ck-i" aria-label="informazione">i</span>' : ok ? '<span class="ck ck-ok" aria-label="sì">✓</span>' : '<span class="ck ck-no" aria-label="manca">✗</span>');
  return `<p class="note ck-why">${esc(e.why)}</p><p class="ck-goal">${{ 'zona blu': 'Per la zona blu servono tutte:', trigger: 'Per il trigger servono la breadth e le conferme richieste, una o due tra le quattro (quante, nella riga «conferme»); il rimbalzo a V basta da solo:', 'tenuta del segnale': 'Dopo il trigger:' }[e.goal]}</p>` +
    `<ul class="cklist">${e.items.map((x) => `<li class="${x.sub ? 'sub' : ''}${x.ok === false ? ' no' : ''}">${mark(x.ok)}<span>${esc(x.text)}</span></li>`).join('')}</ul>`;
}

// Tabella di paragone degli episodi (signals.js signalContext): mediane per orizzonte e quante volte positivo.
// o = {h: ['+1M', '+3M', '+6M'], key: 1, since: '2005', bench: 'SPY', what: 'il settore'}
export function contextHTML(rows, o) {
  const name = {
    trig: 'Dopo ogni trigger, anche quelli poi falliti', setup: "Dall'ingresso in zona blu", any: `Una seduta qualsiasi dal ${o.since}`,
    bench: `${o.bench} dopo gli stessi trigger`, excess: `${o.what.charAt(0).toUpperCase() + o.what.slice(1)} meno ${o.bench}, dopo il trigger`,
  };
  const n = (r) => (r.key === 'any' ? `${r.n.toLocaleString('it-IT')} sedute` : r.n);
  const cell = (v) => pct(v); // un valore che arrotondato vale zero si scrive 0,0% senza segno
  const pos = (r) => (!r.pos[1] ? '—' : r.key === 'any' ? `${Math.round((100 * r.pos[0]) / r.pos[1])}%` : r.key === 'excess' ? `meglio in ${r.pos[0]} su ${r.pos[1]}` : `${r.pos[0]} su ${r.pos[1]}`);
  return `<thead><tr><th>Mediane</th><th class="r">Casi</th>${o.h.map((h) => `<th class="r">${h}</th>`).join('')}<th class="r">${o.h[o.key]} positivi</th></tr></thead><tbody>` +
    rows.map((r) => `<tr class="ctx-${r.key}"><td>${esc(name[r.key])}</td><td class="num r">${n(r)}</td>${r.med.map((v) => `<td class="num r">${cell(v)}</td>`).join('')}<td class="num r">${pos(r)}</td></tr>`).join('') + '</tbody>';
}
// "5 su 6" invece di una percentuale sui pochi casi
export const outOf = (a) => { const v = a.filter((x) => x != null); return `${v.filter((x) => x > 0).length} su ${v.length}`; };
