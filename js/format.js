/* format.js — formattazione numeri/date all'italiana e piccoli elementi grafici condivisi. */

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Numeri all'italiana con il segno meno tipografico (−); un valore che arrotondato vale zero non ha segno
const zero = (v, d) => +Math.abs(v).toFixed(d) === 0;
export const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : (v < 0 && !zero(v, d) ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ','));
export const sgn = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : (zero(v, d) ? '' : v > 0 ? '+' : '−') + fmt(Math.abs(v), d));
export const pct = (v, d = 1) => (v == null ? '<span class="muted">—</span>' : `<span class="${zero(v, d) ? '' : v > 0 ? 'up' : 'down'}">${sgn(v, d)}%</span>`);
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
    : `Chiusura più alta ${fmt(m.hi, 2)} del ${dIT(m.d)}, ultima ${fmt(m.c, 2)} del ${dIT(asOf)}: ${sgn(v)}%.`];
  if (m.da > 0) t.push(`Con i dividendi reinvestiti ${sgn(dd)}%: la differenza ${m.da === 1 ? 'è la cedola staccata' : `sono le ${m.da} cedole staccate`} dopo il massimo.`);
  else if (m.dv > 0) t.push('Nessuna cedola dopo il massimo: stesso valore del drawdown con i dividendi.');
  if (m.ih != null && m.ih > m.hi * 1.0005) {
    t.push(`Il «massimo a 52 settimane» di TradingView è il picco intraday, ${fmt(m.ih, 2)} del ${dIT(m.id)}: da lì il calo è ${sgn((m.c / m.ih - 1) * 100)}%.`);
  }
  if (m.all) t.push('Quota tutti i giorni: contano anche i fine settimana.');
  return t.join(' ');
}

// Larghezza del disegno in unità SVG: i pixel reali × 1,15, tra `min` e `max`. Sul telefono il
// grafico si disegna più stretto invece di rimpicciolirsi, così il testo resta di circa 10 px.
export function chartWidth(svg, max, min = 340) {
  const w = svg.getBoundingClientRect().width;
  return w ? Math.round(Math.max(min, Math.min(max, w * 1.15))) : max;
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
