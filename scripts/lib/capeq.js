/*
 * capeq.js — grandi contro piccoli e titoli dei settori (vista 7 Titoli).
 *
 * Per ogni settore S&P 500 (e per l'indice intero) due indici simulati giorno per giorno sui costituenti:
 *  - cap-weighted: rendimento del giorno pesato per la capitalizzazione della sera prima. Le azioni sono
 *    tenute fisse (valore di mercato di oggi nelle holdings di IVV ÷ prezzo di oggi), quindi i pesi si
 *    muovono con i prezzi come in un indice a capitalizzazione, senza il taglio dei giganti degli ETF SPDR;
 *  - equal-weight: come gli indici S&P Equal Weight, dopo la chiusura del 3° venerdì di marzo, giugno, settembre
 *    e dicembre le azioni si ricalcolano per pesi uguali ai prezzi della data di riferimento (il mercoledì prima
 *    del 2° venerdì), poi i pesi corrono. Chi entra prende il peso medio, chi esce libera il suo.
 * Composizione dell'epoca: un titolo conta dal giorno di ingresso nell'indice (data di efficacia della tabella
 * dei cambi di Wikipedia) al giorno prima dell'uscita. Senza questo, su YTD e 1 anno l'equal-weight risulta
 * troppo alto (nell'indice entrano i titoli già saliti). Verifica del 16/10/2026 su 3M, 6M, YTD e 1A:
 * equal-weight in media a 0,5 punti dagli ETF Invesco RSP* (al massimo 3, Comunicazioni: RSPC segue un indice
 * più largo); cap-weighted uguale agli SPDR XL* tranne dove questi
 * tagliano il peso dei giganti (Tecnologia, Comunicazioni, Discrezionali). Prezzi solo prezzo (split sì,
 * dividendi no), come la breadth. I titoli usciti senza più prezzi su Yahoo (acquisiti) restano fuori.
 */
import { splitTop, cellText } from './members.js';

export const PERIODS = ['1M', '3M', '6M', 'YTD', '1A'];
export const LEN = { '1M': 21, '3M': 63, '6M': 126, '1A': 252 };
export const OFFSETS = [0, 5, 21, 63]; // oggi, 1 settimana, 1 mese, 3 mesi fa (sedute)
// sedute di storia che servono: 1 anno + 3 mesi di scia + il periodo precedente per la bubble
export const HISTORY = 2 * 252 + 5;
const MONTHS = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };

// Data di Wikipedia ("October 6, 2026", anche "Oct. 6, 2026" o "6 October 2026") → ISO, altrimenti null
export function wikiDate(s) {
  const t = String(s).replace(/&nbsp;|\u00a0/g, ' ').trim();
  const m = /^([A-Z][a-z]+)\.?\s+(\d{1,2}),?\s*(\d{4})$/.exec(t) || /^(\d{1,2})\s+([A-Z][a-z]+)\.?,?\s+(\d{4})$/.exec(t);
  if (!m) return null;
  const [mon, day] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
  const n = MONTHS[mon] || Object.entries(MONTHS).find(([k]) => mon.length >= 3 && k.startsWith(mon))?.[1];
  const iso = n && `${m[3]}-${String(n).padStart(2, '0')}-${day.padStart(2, '0')}`;
  return iso && new Date(iso + 'T00:00:00Z').toISOString().startsWith(iso) ? iso : null;
}
const tick = (s) => s.replace(/\./g, '-').toUpperCase().trim();

/**
 * Tabella dei cambi della voce "Historical components of the S&P 500" (wikitext).
 * @returns {{date: string, add: string, rem: string, addName?: string}[]|null} dal più recente; null se la tabella manca
 */
export function parseSpChanges(text, from = '0000') {
  const start = text.indexOf('id="changes"');
  if (start < 0) return null;
  const body = text.slice(start).split(/^\|\}/m)[0];
  const out = [], bad = [];
  let lastDate = null;
  for (const row of body.split(/^\|-.*$/m).slice(1)) {
    const lines = row.split('\n').filter((l) => l.startsWith('|') && !l.startsWith('|}'));
    if (!lines.length) continue;
    const cells = lines.flatMap((l) => splitTop(l.slice(1).replace(/^\|/, ''), '||')).map(cellText);
    let date = wikiDate(cells[0]);
    if (date) cells.shift();
    else if (/\b(19|20)\d{2}\b/.test(cells[0] || '')) { bad.push(cells[0]); continue; } // data in un formato nuovo
    else date = lastDate; // data in rowspan sulla riga sopra
    if (!date || cells.length < 4) continue;
    lastDate = date;
    if (date < from) break;
    const c = { date, add: cells[0] ? tick(cells[0]) : '', rem: cells[2] ? tick(cells[2]) : '' };
    // un ticker che non sembra un ticker vuol dire colonne spostate: la riga non si usa
    if (![c.add, c.rem].every((x) => x === '' || /^[A-Z0-9-]{1,7}$/.test(x))) { bad.push(cells.slice(0, 3).join(' | ')); continue; }
    if (c.add) c.addName = cells[1];
    out.push(c);
  }
  out.bad = bad; // righe non lette: chi chiama tiene la tabella salvata
  return out;
}

/**
 * Periodi di appartenenza all'indice di ogni titolo: {s: {sector, spans: [[ingresso, uscita), …], former?}} con date
 * ISO ('0000'/'9999' = da sempre / ancora dentro). Gestisce chi entra ed esce (anche più volte) nella finestra.
 * members: lista di oggi [{s, name, sector}]; changes: tabella dei cambi; former: {s: {sector}}.
 */
export function membership(members, changes, former) {
  const current = new Map(members.map((m) => [m.s, m]));
  // un titolo che ha cambiato ticker dopo l'ingresso (SATS → ECHO) si ritrova dal nome, anche se poi è uscito
  const byName = new Map([...Object.entries(former).filter(([, f]) => f.name).map(([s, f]) => [normName(f.name), s]), ...members.map((m) => [normName(m.name), m.s])]);
  const events = {}; // ticker → [[data, +1 ingresso | -1 uscita]]
  const push = (s, d, e) => { (events[s] = events[s] || []).push([d, e]); };
  for (const c of changes) {
    const add = c.add && (current.has(c.add) || former[c.add] ? c.add : c.addName ? byName.get(normName(c.addName)) : null);
    if (add) push(add, c.date, 1);
    if (c.rem) push(c.rem, c.date, -1);
  }
  const life = {};
  for (const s of new Set([...current.keys(), ...Object.keys(events)])) {
    const sector = current.has(s) ? current.get(s).sector : former[s] && former[s].sector;
    if (!sector) continue; // uscito senza settore noto: resta fuori
    // periodi di appartenenza [ingresso, uscita): chi esce senza un ingresso registrato c'era da sempre
    const ev = (events[s] || []).sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
    const spans = [];
    let open = ev.length && ev[0][1] < 0 ? '0000' : current.has(s) && !ev.length ? '0000' : null;
    for (const [d, e] of ev) {
      if (e > 0 && open == null) open = d;
      else if (e < 0 && open != null) { spans.push([open, d]); open = null; }
    }
    if (open != null) spans.push([open, '9999']);
    else if (current.has(s)) spans.push([ev.length ? ev[ev.length - 1][0] : '0000', '9999']); // dati incoerenti: dentro dall'ultimo cambio
    if (!spans.length) continue;
    life[s] = { sector, spans, ...(current.has(s) ? {} : { former: true }) };
  }
  return life;
}
// il titolo è nell'indice nel giorno d?
export const inIndex = (l, d) => l.spans.some(([a, b]) => a <= d && d < b);
// ultima data di ingresso nell'indice di chi ne fa parte oggi (null = da prima della tabella dei cambi)
export const lastEntry = (l) => { const s = l.spans[l.spans.length - 1]; return s && s[0] !== '0000' ? s[0] : null; };

// Nome senza forma societaria e punteggiatura, per riconoscere lo stesso titolo con un altro ticker
export const normName = (s) => String(s || '').toLowerCase().replace(/&amp;/g, '&').replace(/[.,'()]/g, ' ')
  .replace(/\b(inc|incorporated|corp|corporation|co|company|the|plc|ltd|limited|holdings?|group|n ?v|s ?a|class [a-z])\b/g, ' ').replace(/\s+/g, ' ').trim();

// Ribilanciamenti dell'equal-weight: {seduta dopo la cui chiusura vale (3° venerdì di marzo, giugno, settembre,
// dicembre, o la seduta prima della stessa settimana se è festivo) → seduta della data di riferimento (mercoledì
// prima del 2° venerdì, o la seduta prima)}
export function resetDays(cal) {
  const out = new Map();
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const upTo = (d) => cal.filter((c) => c <= d).pop();
  for (const y of new Set(cal.map((d) => +d.slice(0, 4)))) for (const m of [3, 6, 9, 12]) {
    const fri = 15 + ((5 - new Date(Date.UTC(y, m - 1, 15)).getUTCDay() + 7) % 7); // tra il 15 e il 21
    const eff = upTo(iso(y, m, fri)), ref = upTo(iso(y, m, fri - 9));
    if (eff && eff >= iso(y, m, fri - 4)) out.set(eff, ref || eff);
  }
  return out;
}

// Prezzi di un titolo sulle date del calendario: riportati in avanti nelle sedute senza scambi, null prima della
// prima quotazione e dopo l'ultima (titolo tolto dal listino)
export function align(cal, dates, close) {
  const m = new Map(dates.map((d, i) => [d, close[i]]));
  const lastD = dates[dates.length - 1];
  let v = null;
  return cal.map((d) => (m.has(d) && m.get(d) != null ? (v = m.get(d)) : d > lastD ? null : v));
}

/**
 * Indici cap ed equal-weight dal giorno s0 (valore 1) a fine calendario.
 * @param {string[]} names titoli candidati; life da membership(); px {s: prezzi allineati}; shares {s: azioni}
 * @returns {{cw: number[], ew: number[], n: number[]}} indice t - s0; n = titoli nell'indice nel giorno
 */
export function sectorIndex({ cal, s0, names, life, px, shares, resets }) {
  const N = cal.length - 1;
  const at = new Map(cal.map((d, i) => [d, i]));
  const inIdx = (s, t) => inIndex(life[s], cal[t]) && px[s][t - 1] != null && px[s][t] != null;
  const cw = [1], ew = [1], n = [0];
  let h = null; // quote dell'equal-weight
  for (let t = s0 + 1; t <= N; t++) {
    const act = names.filter((s) => inIdx(s, t));
    n.push(act.length);
    let a = 0, b = 0;
    for (const s of act) { const c0 = shares[s] * px[s][t - 1]; a += (c0 * px[s][t]) / px[s][t - 1]; b += c0; }
    cw.push(b ? (cw[cw.length - 1] * a) / b : cw[cw.length - 1]);
    const V = ew[ew.length - 1];
    if (!act.length) { ew.push(V); h = null; continue; }
    if (!h) h = Object.fromEntries(act.map((s) => [s, V / act.length / px[s][t - 1]]));
    else if (resets.has(cal[t - 1])) {
      // azioni ∝ 1/prezzo alla data di riferimento, scalate al valore dell'indice alla chiusura del ribilanciamento
      const k = at.get(resets.get(cal[t - 1]));
      const inv = act.map((s) => 1 / ((k != null && px[s][k]) || px[s][t - 1]));
      const val = act.reduce((a, s, i) => a + inv[i] * px[s][t - 1], 0);
      h = Object.fromEntries(act.map((s, i) => [s, (inv[i] * V) / val]));
    }
    else if (act.length !== Object.keys(h).length || act.some((s) => !(s in h))) {
      const keep = act.filter((s) => s in h), nNew = act.length - keep.length, wNew = V / act.length;
      const valKeep = keep.reduce((x, s) => x + h[s] * px[s][t - 1], 0);
      const scale = valKeep ? (V - nNew * wNew) / valKeep : 0, nh = {};
      for (const s of keep) nh[s] = h[s] * scale;
      for (const s of act) if (!(s in h)) nh[s] = (keep.length ? wNew : V / act.length) / px[s][t - 1];
      h = nh;
    }
    ew.push(Object.entries(h).reduce((x, [s, q]) => x + q * px[s][t], 0));
  }
  return { cw, ew, n };
}

// Finestra [inizio, fine] del periodo p che termina alla seduta e (indici del calendario), o null
export function windowOf(cal, p, e) {
  if (p !== 'YTD') return e - LEN[p] >= 0 ? [e - LEN[p], e] : null;
  const y0 = lastBeforeYear(cal, cal[cal.length - 1].slice(0, 4));
  return y0 >= 0 && e > y0 ? [y0, e] : null;
}
// ultima seduta prima del 1° gennaio dell'anno `y`
function lastBeforeYear(cal, y) { let k = -1; for (let i = 0; i < cal.length && cal[i] < `${y}-01-01`; i++) k = i; return k; }

// prima seduta degli indici simulati: 1 anno + 3 mesi di scia prima dell'ultima
export const simStart = (cal) => Math.max(0, cal.length - 1 - LEN['1A'] - OFFSETS[OFFSETS.length - 1] - 2);

const r1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 1000) / 10);

/**
 * File data/sector_members.json.
 * @param {object} o cal (sedute fino a asOf), members [{s, name, sector, sub}], life, px {s: allineati}, qty {s: azioni
 *   detenute da IVV, o salvate per chi è uscito} (anche parziale), sectors (11 chiavi)
 */
export function buildSectorMembers({ cal, members, life, px, qty, sectors }) {
  const N = cal.length - 1;
  const s0 = simStart(cal);
  const resets = resetDays(cal);
  const names = Object.keys(life).filter((s) => px[s] && px[s].some((v) => v != null));
  // azioni: quelle detenute da IVV (proporzionali al flottante). Chi non è in IVV (uscito senza quantità salvata,
  // appena entrato) vale come un titolo piccolo del settore: 0,7 × il 20° percentile dei valori di mercato
  const lastPx = (s) => { const a = px[s]; for (let t = a.length - 1; t >= 0; t--) if (a[t] != null) return a[t]; return null; };
  const value = (s) => (qty[s] ? qty[s] * lastPx(s) : null), small = {};
  for (const k of sectors) { const v = names.filter((s) => life[s].sector === k && qty[s]).map(value).sort((a, b) => a - b); small[k] = v.length ? 0.7 * v[Math.floor(v.length * 0.2)] : 1; }
  const shares = Object.fromEntries(names.map((s) => [s, qty[s] || small[life[s].sector] / lastPx(s)]));
  const out = { asOf: cal[N], dates: OFFSETS.map((k) => cal[N - k]), starts: {}, sectors: {}, stocks: [] };
  for (const p of PERIODS) out.starts[p] = OFFSETS.map((k) => { const w = windowOf(cal, p, N - k); return w ? cal[w[0]] : null; });
  for (const k of [...sectors, 'SPX']) {
    const own = names.filter((s) => k === 'SPX' || life[s].sector === k);
    const { cw, ew, n } = sectorIndex({ cal, s0, names: own, life, px, shares, resets });
    out.sectors[k] = {};
    for (const p of PERIODS) {
      out.sectors[k][p] = OFFSETS.map((off) => {
        const w = windowOf(cal, p, N - off);
        // senza titoli quotati in qualche seduta della finestra il rendimento non c'è (non 0%)
        if (!w || w[0] < s0 || n.slice(w[0] - s0 + 1, w[1] - s0 + 1).some((x) => !x)) return null;
        const [a, b] = w.map((t) => t - s0);
        return [r1(cw[b] / cw[a] - 1), r1(ew[b] / ew[a] - 1)];
      });
    }
  }
  const tot = members.reduce((a, m) => a + (value(m.s) || 0), 0);
  const y0 = lastBeforeYear(cal, cal[N].slice(0, 4)), yPrev = lastBeforeYear(cal, String(+cal[N].slice(0, 4) - 1));
  for (const m of members) {
    const c = px[m.s];
    if (!c || c[N] == null) continue;
    const ret = (a, b) => (a >= 0 && c[a] != null && c[b] != null ? r1(c[b] / c[a] - 1) : null);
    const r = {}, prev = {};
    for (const p of PERIODS) { const w = windowOf(cal, p, N); r[p] = w ? ret(w[0], w[1]) : null; }
    for (const p of ['1M', '3M', '6M', '1A']) prev[p] = ret(N - 2 * LEN[p], N - LEN[p]);
    prev.YTD = yPrev >= 0 ? ret(yPrev, y0) : null;
    const year = c.slice(Math.max(0, N - 251), N + 1).filter((v) => v != null);
    const sma = (n) => { const x = c.slice(N - n + 1, N + 1); return x.length === n && x.every((v) => v != null) ? x.reduce((a, b) => a + b, 0) / n : null; };
    const m200 = sma(200), m50 = sma(50);
    const first = c.findIndex((v) => v != null);
    out.stocks.push({
      s: m.s, n: m.name, sec: m.sector, sub: m.sub || '', w: value(m.s) && tot ? Math.round((value(m.s) / tot) * 1e5) / 1e3 : null,
      ...(qty[m.s] ? { q: qty[m.s] } : {}),
      px: Math.round(c[N] * 100) / 100, r, prev, dd: r1(c[N] / Math.max(...year) - 1),
      d200: m200 ? r1(c[N] / m200 - 1) : null, d50: m50 ? r1(c[N] / m50 - 1) : null,
      ...(first > N - 252 ? { since: cal[first] } : {}), ...(life[m.s] && lastEntry(life[m.s]) ? { added: lastEntry(life[m.s]) } : {}),
    });
  }
  return out;
}

/**
 * Holdings di IVV (CSV di iShares): valore di mercato e azioni detenute per ticker (stessa forma dei simboli dei
 * membri). Per i pesi si usano le azioni, moltiplicate per i nostri prezzi della stessa seduta: il valore di mercato
 * del file è della sera prima e il peso ha solo 2 decimali.
 */
export function parseIvv(text, parseCSV) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const h = lines.findIndex((l) => l.startsWith('Ticker,'));
  if (h < 0) return null;
  const raw = (/Fund Holdings as of,"([^"]+)"/.exec(text) || [])[1];
  const d = raw ? new Date(`${raw} 12:00 UTC`) : null;
  const asOf = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  const mv = {}, qty = {};
  for (const r of parseCSV(lines.slice(h).join('\n'))) {
    if (r['Asset Class'] !== 'Equity') continue;
    const t = tick((r.Ticker || '').replace(/ /g, '-'));
    const v = Number(String(r['Market Value']).replace(/,/g, '')), q = Number(String(r.Quantity).replace(/,/g, ''));
    if (t && t !== '-' && v > 0) { mv[t] = (mv[t] || 0) + v; if (q > 0) qty[t] = (qty[t] || 0) + q; }
  }
  return { asOf, mv, qty };
}
