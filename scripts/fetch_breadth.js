#!/usr/bin/env node
/*
 * fetch_breadth.js — aggiornamento serale della breadth settoriale e dei prezzi lunghi degli ETF.
 *
 *  1. Lista dei costituenti S&P 500 con settore GICS (datasets/s-and-p-500-companies, aggiornata
 *     da Wikipedia). Se la lista sembra rotta si usa l'ultima valida; i cambi si registrano in
 *     data/sp500_members.json, così la composizione storica si costruisce giorno per giorno.
 *  2. Chiusure di ogni membro da Yahoo (rettificate per split, NON per dividendi, come le serie
 *     S5TH…), 2 anni di storia per le medie a 20/50/200 sedute.
 *  3. Si pubblica una seduta solo se ha i prezzi di almeno il 99% dei membri e di tutti i membri
 *     di ogni settore tranne al più uno. Le ultime sedute già pubblicate si ricalcolano (correzioni).
 *  4. data/sectors.json: storia completa (dal 2004) degli ETF settoriali, rettificata per i dividendi,
 *     più max52 per il drawdown sul solo prezzo alla seduta della breadth (max52At): chiusura più alta
 *     delle 252 sedute e ultima chiusura senza rettifica (stesse date: i due drawdown differiscono solo
 *     per le cedole), cedole staccate nel periodo e dopo il massimo, massimo intraday («52 week high»).
 *  5. data/breadth_latest.json: fotografia titolo per titolo dell'ultima seduta.
 *  6. data/sector_members.json (vista 7 Titoli): settori cap-weighted contro equal-weight e numeri di ogni
 *     titolo, calcolati in scripts/lib/capeq.js con la composizione dell'epoca di data/sp500_history.json
 *     (tabella dei cambi di Wikipedia, ricaricata ogni sera, più nome e settore di chi esce) e i pesi delle
 *     holdings dell'ETF iShares IVV.
 * Lo storico iniziale viene da scripts/backfill_breadth.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { expandRLE, encodeRLE } from '../js/signals.js';
import { expectedSession } from '../js/calendar.js';
import { closeHigh, intradayHigh, exDates } from '../js/metrics.js';
import { membership, buildSectorMembers, parseSpChanges, parseIvv, align, simStart, HISTORY } from './lib/capeq.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const CONSTITUENTS_URL = 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv';
const CHANGES_URL = 'https://en.wikipedia.org/w/index.php?title=Historical_components_of_the_S%26P_500&action=raw';
const IVV_URL = 'https://www.ishares.com/us/products/239726/x/latest-holdings.csv';
const CHANGES_FROM = '2024-06-01';
const SINCE = () => Math.floor(Date.now() / 1000) - 790 * 86400; // circa 540 sedute
const GICS = {
  'Information Technology': 'XLK', 'Communication Services': 'XLC', 'Consumer Discretionary': 'XLY',
  'Consumer Staples': 'XLP', 'Energy': 'XLE', 'Financials': 'XLF', 'Health Care': 'XLV',
  'Industrials': 'XLI', 'Materials': 'XLB', 'Real Estate': 'XLRE', 'Utilities': 'XLU',
};
const ETFS = ['XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU', 'SPY', 'RSP'];
const RECOMPUTE = 5; // ultime sedute pubblicate da ricalcolare (e finestra in cui recuperare sedute saltate)
const readJSON = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : d);
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o));

// CSV con campi tra virgolette (es. "Saint Paul, Minnesota")
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

// Lista dei membri validata; `prev` = ultima lista buona
export function validateMembers(rows, prev) {
  const members = rows.map((r) => ({ s: r.Symbol.replace(/\./g, '-').toUpperCase(), name: r.Security || r.Name, sector: GICS[r['GICS Sector']] || null, sub: r['GICS Sub-Industry'] || '' }));
  const problems = [];
  if (members.length < 490 || members.length > 520) problems.push(`${members.length} membri`);
  const unknown = members.filter((m) => !m.sector);
  if (unknown.length) problems.push(`settore sconosciuto per ${unknown.map((m) => m.s).join(', ')}`);
  if (new Set(members.map((m) => m.sector)).size !== 11) problems.push('non ci sono 11 settori');
  const moved = [];
  if (prev) {
    // i settori si confrontano sugli ingressi e le uscite; chi resta e cambia settore è una riclassificazione GICS
    // (marzo 2023: Visa, Mastercard e altri da Tecnologia a Finanziari), accettata se riguarda pochi titoli.
    // Confrontare i conteggi di tutta la lista la scarterebbe ogni sera per sempre, perché `prev` non cambierebbe più.
    const old = new Map(prev.map((m) => [m.s, m.sector]));
    const count = (list) => list.reduce((a, m) => ((a[m.sector] = (a[m.sector] || 0) + 1), a), {});
    const now = new Set(members.map((m) => m.s));
    const a = count(members.filter((m) => !old.has(m.s))), b = count(prev.filter((m) => !now.has(m.s)));
    for (const k of Object.values(GICS)) if (Math.abs((a[k] || 0) - (b[k] || 0)) > 3) problems.push(`${k}: ${a[k] || 0} entrati e ${b[k] || 0} usciti`);
    for (const m of members) if (old.has(m.s) && old.get(m.s) !== m.sector) moved.push(`${m.s} ${old.get(m.s)}→${m.sector}`);
    if (moved.length > 40) problems.push(`${moved.length} titoli cambiano settore`);
  }
  return { members, problems, moved };
}

async function loadMembers(today) {
  const file = path.join(DATA, 'sp500_members.json');
  const prev = readJSON(file, null);
  let fresh = null;
  try {
    const r = await fetch(CONSTITUENTS_URL);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { members, problems, moved } = validateMembers(parseCSV(await r.text()), prev && prev.members);
    if (problems.length) console.log(`::warning::Lista costituenti scartata, uso quella salvata: ${problems.join('; ')}`);
    else fresh = members;
    if (!problems.length && moved.length) console.log(`::warning::Titoli che cambiano settore GICS: ${moved.join(', ')}`);
  } catch (e) {
    console.log(`::warning::Lista costituenti non disponibile (${e.message}): uso quella salvata`);
  }
  if (!fresh && !prev) throw new Error('nessuna lista dei costituenti disponibile');
  if (!fresh) return prev.members;
  const out = prev || { changes: [] };
  if (prev) {
    const before = new Set(prev.members.map((m) => m.s)), after = new Set(fresh.map((m) => m.s));
    const added = [...after].filter((s) => !before.has(s)), removed = [...before].filter((s) => !after.has(s));
    if (added.length || removed.length) {
      out.changes.push({ date: today, added, removed });
      rememberFormer(prev.members.filter((m) => removed.includes(m.s)));
      console.log(`Cambi nell'indice: +${added.join(' +') || '—'} / -${removed.join(' -') || '—'}`);
    }
  }
  out.asOf = today;
  out.members = fresh;
  writeJSON(file, out);
  return fresh;
}

function smaAt(c, i, w) {
  if (i < w - 1) return null;
  let s = 0;
  for (let k = i - w + 1; k <= i; k++) s += c[k];
  return s / w;
}

// Conteggi per settore in ogni data da pubblicare
export function computeCounts(members, prices, dates) {
  const keys = [...Object.values(GICS), 'SPX'];
  const out = {};
  for (const d of dates) {
    const row = Object.fromEntries(keys.map((k) => [k, { members: 0, n: 0, a20: 0, a50: 0, a200: 0 }]));
    for (const m of members) {
      for (const k of [m.sector, 'SPX']) row[k].members++;
      const p = prices[m.s];
      const i = p ? p.index.get(d) : undefined;
      if (i === undefined) continue;
      const c = p.close;
      for (const k of [m.sector, 'SPX']) {
        const r = row[k];
        r.n++;
        for (const w of [20, 50, 200]) { const v = smaAt(c, i, w); if (v != null && c[i] > v) r['a' + w]++; }
      }
    }
    out[d] = row;
  }
  return out;
}

// Date pubblicabili: quelle con prezzi per ≥99% dei membri e ≤1 mancante per settore.
// Una seduta incompleta seguita da sedute complete è un buco nei dati della fonte (Yahoo a volte
// non ha mai la barra di un giorno per molti titoli): si salta. Una seduta incompleta in coda
// invece si aspetta, perché le chiusure arrivano in ritardo.
export function publishable(members, prices, candidates) {
  // ultimo prezzo di ogni membro: chi non quota più da oltre una settimana (delistato ma ancora
  // nella lista, ticker rotto) non deve bloccare per sempre la pubblicazione
  const lastDate = new Map(members.map((m) => [m.s, prices[m.s] ? [...prices[m.s].index.keys()].sort().at(-1) : null]));
  const info = candidates.map((d) => {
    const missing = {};
    const t = Date.parse(d + 'T00:00:00Z');
    const weekBefore = Number.isFinite(t) ? new Date(t - 7 * 86400000).toISOString().slice(0, 10) : '';
    let priced = 0;
    for (const m of members) {
      if (prices[m.s] && prices[m.s].index.has(d)) priced++;
      else if (lastDate.get(m.s) && lastDate.get(m.s) >= weekBefore) missing[m.sector] = (missing[m.sector] || 0) + 1;
    }
    const worst = Math.max(0, ...Object.values(missing));
    return { d, priced, worst, ok: priced >= members.length * 0.99 && worst <= 1 };
  });
  const lastOk = info.map((x) => x.ok).lastIndexOf(true);
  const ok = [];
  info.forEach((x, i) => {
    if (x.ok) ok.push(x.d);
    else if (i < lastOk) console.log(`Seduta ${x.d} saltata: prezzi per ${x.priced}/${members.length} membri ma le sedute successive sono complete (buco nei dati della fonte)`);
    else console.log(`Seduta ${x.d} non ancora pubblicabile: prezzi per ${x.priced}/${members.length} membri${x.worst > 1 ? `, fino a ${x.worst} mancanti in un settore` : ''}`);
  });
  return ok;
}

export function mergeBreadth(breadth, counts) {
  const dates = Object.keys(counts).sort();
  if (!dates.length) return 0;
  const len = breadth.dates.length;
  const expanded = {};
  for (const [k, s] of Object.entries(breadth.series)) {
    expanded[k] = { members: expandRLE(s.members, len), n: expandRLE(s.n, len), a20: s.a20.slice(), a50: s.a50.slice(), a200: s.a200.slice() };
  }
  let added = 0;
  for (const d of dates) {
    let i = breadth.dates.indexOf(d);
    if (i < 0) {
      // nuova seduta, o una seduta recente prima saltata per un buco nei dati: va inserita in ordine
      i = breadth.dates.findIndex((x) => x > d);
      if (i < 0) i = breadth.dates.length;
      breadth.dates.splice(i, 0, d);
      for (const e of Object.values(expanded)) for (const k of ['members', 'n', 'a20', 'a50', 'a200']) e[k].splice(i, 0, null);
      added++;
    }
    for (const [k, v] of Object.entries(counts[d])) {
      const e = expanded[k];
      e.members[i] = v.members; e.n[i] = v.n; e.a20[i] = v.a20; e.a50[i] = v.a50; e.a200[i] = v.a200;
    }
  }
  for (const [k, e] of Object.entries(expanded)) breadth.series[k] = { members: encodeRLE(e.members), n: encodeRLE(e.n), a20: e.a20, a50: e.a50, a200: e.a200 };
  breadth.asOf = breadth.dates[breadth.dates.length - 1];
  breadth.generated = new Date().toISOString();
  return added;
}

// Nome e settore di chi esce dall'indice: la tabella dei cambi di Wikipedia ha solo il ticker
// e le azioni detenute da IVV l'ultima sera, per il suo peso nel cap-weighted fino all'uscita
function rememberFormer(list) {
  const file = path.join(DATA, 'sp500_history.json');
  const h = readJSON(file, { changes: [], former: {} });
  const prev = readJSON(path.join(DATA, 'sector_members.json'), null);
  const q = new Map(prev ? prev.stocks.filter((x) => x.q).map((x) => [x.s, x.q]) : []);
  for (const m of list) h.former[m.s] = { name: m.name, sector: m.sector, ...(q.has(m.s) ? { q: q.get(m.s) } : {}) };
  writeHistory(file, h);
}
const writeHistory = (file, h) => fs.writeFileSync(file, JSON.stringify(h).replace(/\},\{/g, '},\n{'));

// Vista 7 Titoli: tabella dei cambi aggiornata, prezzi di chi è uscito nel periodo, pesi di IVV, poi capeq.js
async function updateSectorMembers(members, prices, breadth) {
  const file = path.join(DATA, 'sp500_history.json');
  const h = readJSON(file, { changes: [], former: {} });
  try {
    const r = await fetch(CHANGES_URL, { headers: { 'User-Agent': 'sector-monitor/1.0 (github.com/igorbonfanti/rrg)' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const parsed = parseSpChanges(await r.text(), CHANGES_FROM);
    // una tabella vuota o molto più corta di quella salvata è un errore di lettura, non una novità
    if (!parsed || parsed.length < h.changes.length * 0.9) throw new Error(`tabella dei cambi sospetta (${parsed ? parsed.length : 0} righe)`);
    if (parsed.bad.length) throw new Error(`righe non lette: ${parsed.bad.slice(0, 3).join('; ')}`);
    h.changes = parsed;
    h.changesAsOf = breadth.asOf; // data dell'ultima lettura buona, controllata da check_fresh.js
  } catch (e) {
    console.log(`::warning::Cambi dell'S&P 500 non aggiornati (${e.message}): uso quelli salvati`);
  }
  h.asOf = breadth.asOf;
  writeHistory(file, h);
  const noSector = h.changes.filter((c) => c.rem && !h.former[c.rem] && !members.some((m) => m.s === c.rem)).map((c) => c.rem);
  if (noSector.length) console.warn(`  usciti senza settore (restano fuori): ${noSector.join(' ')}`);

  const N = breadth.dates.length - 1;
  const cal = breadth.dates.slice(Math.max(0, N - HISTORY));
  const life = membership(members, h.changes, h.former);
  const px = {};
  for (const m of members) if (prices[m.s]) px[m.s] = align(cal, prices[m.s].dates, prices[m.s].close);
  const gone = Object.keys(life).filter((s) => life[s].former && life[s].spans.some(([, out]) => out > cal[simStart(cal)]));
  const got = await mapLimit(gone, 3, async (s) => { try { return await fetchDaily(s, { period1: SINCE() }); } catch { return null; } }, 150);
  const missing = [];
  gone.forEach((s, i) => { if (got[i] && got[i].dates.length) px[s] = align(cal, got[i].dates, got[i].close); else missing.push(s); });
  // pesi: azioni detenute da IVV; se le holdings non arrivano, quelle salvate la sera prima
  const prev = readJSON(path.join(DATA, 'sector_members.json'), null);
  let qty = null, ivvAsOf = null;
  try {
    const r = await fetch(IVV_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const p = parseIvv(await r.text(), parseCSV);
    const found = p ? members.filter((m) => p.qty[m.s]).length : 0;
    if (found < members.length * 0.95) throw new Error(`${found} membri su ${members.length} nelle holdings`);
    qty = p.qty; ivvAsOf = p.asOf;
  } catch (e) {
    console.log(`::warning::Holdings IVV non disponibili (${e.message}): uso le azioni salvate`);
    if (prev && prev.stocks.some((x) => x.q)) { qty = Object.fromEntries(prev.stocks.filter((x) => x.q).map((x) => [x.s, x.q])); ivvAsOf = prev.weightsAsOf; }
  }
  if (!qty) throw new Error('nessun peso disponibile');
  for (const [s, f] of Object.entries(h.former)) if (f.q && !qty[s]) qty[s] = f.q;
  // un titolo pesante senza la chiusura dell'ultima seduta falserebbe settore e lista: si tiene il file di ieri
  const N1 = cal.length - 1, tot = members.reduce((a, m) => a + (qty[m.s] && px[m.s] && px[m.s][N1] ? qty[m.s] * px[m.s][N1] : 0), 0);
  const noClose = members.filter((m) => !px[m.s] || px[m.s][N1] == null);
  const heavy = noClose.filter((m) => prev && (prev.stocks.find((x) => x.s === m.s) || {}).w >= 0.1);
  if (noClose.length > members.length * 0.01 || heavy.length) {
    console.log(`::warning::sector_members.json non aggiornato: ${noClose.length} membri senza la chiusura del ${cal[N1]}${heavy.length ? ` (pesanti: ${heavy.map((m) => m.s).join(' ')})` : ''}`);
    return;
  }
  if (noClose.length) console.warn(`  senza la chiusura del ${cal[N1]} (fuori dalla lista): ${noClose.map((m) => m.s).join(' ')}`);
  if (!tot) throw new Error('pesi nulli');
  const out = buildSectorMembers({ cal, members, life, px, qty, sectors: Object.values(GICS) });
  out.weightsAsOf = ivvAsOf;
  out.missing = missing;
  writeJSON(path.join(DATA, 'sector_members.json'), out);
  console.log(`sector_members.json: ${out.stocks.length} titoli al ${out.asOf}, pesi IVV ${ivvAsOf || '—'}` + (missing.length ? `, usciti senza prezzi: ${missing.join(' ')}` : ''));
}

// at: data della breadth pubblicata; il drawdown sul solo prezzo si calcola a quella seduta (o alla precedente
// presente per gli ETF), la stessa del Monitor, anche quando gli ETF hanno già la seduta dopo
async function updateSectors(at) {
  const file = path.join(DATA, 'sectors.json');
  const prev = readJSON(file, null);
  const period1 = Math.floor(Date.parse('2004-01-01T00:00:00Z') / 1000);
  const res = await mapLimit(ETFS, 2, async (t) => { try { return await fetchDaily(t, { period1 }); } catch (e) { console.warn(`  ETF ${t}: ${e.message}`); return null; } }, 150);
  if (res.some((r) => !r)) { console.log('::warning::ETF incompleti: sectors.json non aggiornato'); return prev; }
  const asOf = res.map((r) => r.dates.at(-1)).sort()[0];
  const dates = [...new Set(res.flatMap((r) => r.dates))].filter((d) => d <= asOf).sort();
  if (prev && asOf < prev.asOf) { console.warn(`ETF al ${asOf}, più vecchi di quelli pubblicati: non aggiorno`); return prev; }
  // stesso allineamento e arrotondamento per le chiusure rettificate e per quelle senza rettifica
  const align = (r, key) => {
    const m = new Map(r.dates.map((d, i) => [d, Math.round(r[key][i] * 100) / 100]));
    let last = null;
    return dates.map((d) => (m.has(d) ? (last = m.get(d)) : last));
  };
  const adjclose = {}, max52 = {};
  let iTo = dates.length - 1;
  while (at && iTo > 0 && dates[iTo] > at) iTo--;
  const from = dates[Math.max(0, iTo - 251)], to = dates[iTo];
  ETFS.forEach((t, k) => {
    adjclose[t] = align(res[k], 'adjclose');
    // drawdown sul solo prezzo: stesse 252 sedute del drawdown rettificato, chiusure senza rettifica
    const p = closeHigh(dates, align(res[k], 'close'), from, to), ex = exDates(res[k], from, to);
    max52[t] = { ...p, dv: ex.length, da: p ? ex.filter((x) => x > p.d).length : 0, ...intradayHigh(res[k], from, to) };
  });
  const out = { generated: new Date().toISOString(), asOf, dates, adjclose, max52At: to, max52 };
  writeJSON(file, out);
  console.log(`sectors.json: ${dates.length} date, al ${asOf}`);
  return out;
}

async function main() {
  const today = expectedSession();
  const current = readJSON(path.join(DATA, 'breadth.json'), null);
  const etf = readJSON(path.join(DATA, 'sectors.json'), null);
  // un sectors.json nel formato precedente (senza max52 o senza il conto delle cedole) si rifà subito
  const fresh = etf && etf.max52 && etf.max52.SPY && etf.max52.SPY.dv != null;
  const titles = readJSON(path.join(DATA, 'sector_members.json'), null);
  // un sector_members.json senza la storia della divergenza (formato precedente) si rifà subito
  if (current && etf && current.asOf >= today && etf.asOf >= today && fresh && titles && titles.hist && titles.asOf >= current.asOf && !process.argv.includes('--force')) {
    console.log(`Breadth ed ETF già aggiornati al ${current.asOf} (seduta attesa ${today}): niente da fare.`);
    return;
  }
  const members = await loadMembers(today);
  console.log(`${members.length} membri S&P 500`);

  const results = await mapLimit(members, 3, async (m) => {
    // 2 anni e un mese: la vista 7 Titoli confronta l'ultimo anno con quello prima (HISTORY in capeq.js)
    try { return await fetchDaily(m.s, { period1: SINCE() }); } catch (e) { console.warn(`  ${m.s}: ${e.message}`); return null; }
  }, 150);
  const prices = {};
  members.forEach((m, k) => {
    const r = results[k];
    if (r && r.dates.length) prices[m.s] = { dates: r.dates, close: r.close, index: new Map(r.dates.map((d, i) => [d, i])) };
  });
  const got = Object.keys(prices).length;
  console.log(`Prezzi scaricati per ${got}/${members.length} membri`);
  if (got < members.length * 0.9) throw new Error('troppi titoli senza prezzi: non aggiorno la breadth');

  const breadthFile = path.join(DATA, 'breadth.json');
  const breadth = readJSON(breadthFile, null);
  if (!breadth) throw new Error('manca data/breadth.json: esegui prima scripts/backfill_breadth.py');
  const from = breadth.dates[Math.max(0, breadth.dates.length - RECOMPUTE)];
  const candidates = [...new Set(Object.values(prices).flatMap((p) => p.dates))].filter((d) => d >= from && d <= today).sort();
  const dates = publishable(members, prices, candidates);
  const counts = computeCounts(members, prices, dates);
  const added = mergeBreadth(breadth, counts);
  writeJSON(breadthFile, breadth);
  console.log(`breadth.json: ${added} nuove sedute, ${dates.length} ricalcolate/aggiunte, al ${breadth.asOf}`);

  // fotografia titolo per titolo dell'ultima seduta pubblicata
  const d = breadth.asOf;
  const snap = members.map((m) => {
    const p = prices[m.s];
    const i = p ? p.index.get(d) : undefined;
    if (i === undefined) return { s: m.s, name: m.name, sector: m.sector };
    const c = p.close, hi = Math.max(...c.slice(Math.max(0, i - 251), i + 1));
    const dist = (w) => { const v = smaAt(c, i, w); return v == null ? null : Math.round((c[i] / v - 1) * 1000) / 10; };
    const m200 = smaAt(c, i, 200);
    // up200: sopra la media 200 con la stessa regola dei conteggi (d200 è arrotondato e può valere 0)
    return { s: m.s, name: m.name, sector: m.sector, close: Math.round(c[i] * 100) / 100, d20: dist(20), d50: dist(50), d200: dist(200), up200: m200 != null && c[i] > m200, dd: Math.round((c[i] / hi - 1) * 1000) / 10 };
  });
  writeJSON(path.join(DATA, 'breadth_latest.json'), { asOf: d, members: snap });

  try { await updateSectorMembers(members, prices, breadth); } catch (e) { console.log(`::warning::sector_members.json non aggiornato: ${e.message}`); }

  await updateSectors(breadth.asOf);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
