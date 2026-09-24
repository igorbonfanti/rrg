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
 *  4. data/sectors.json: storia completa (dal 2004) degli ETF settoriali, rettificata per i dividendi.
 *  5. data/breadth_latest.json: fotografia titolo per titolo dell'ultima seduta.
 * Lo storico iniziale viene da scripts/backfill_breadth.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { expandRLE, encodeRLE } from '../js/signals.js';
import { expectedSession } from '../js/calendar.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const CONSTITUENTS_URL = 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv';
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
  if (prev) {
    const count = (list) => list.reduce((a, m) => ((a[m.sector] = (a[m.sector] || 0) + 1), a), {});
    const a = count(members), b = count(prev);
    for (const k of Object.values(GICS)) if (Math.abs((a[k] || 0) - (b[k] || 0)) > 3) problems.push(`${k} passa da ${b[k]} a ${a[k]} membri`);
  }
  return { members, problems };
}

async function loadMembers(today) {
  const file = path.join(DATA, 'sp500_members.json');
  const prev = readJSON(file, null);
  let fresh = null;
  try {
    const r = await fetch(CONSTITUENTS_URL);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { members, problems } = validateMembers(parseCSV(await r.text()), prev && prev.members);
    if (problems.length) console.warn(`Lista costituenti scartata: ${problems.join('; ')}`);
    else fresh = members;
  } catch (e) {
    console.warn(`Lista costituenti non disponibile (${e.message})`);
  }
  if (!fresh && !prev) throw new Error('nessuna lista dei costituenti disponibile');
  if (!fresh) return prev.members;
  const out = prev || { changes: [] };
  if (prev) {
    const before = new Set(prev.members.map((m) => m.s)), after = new Set(fresh.map((m) => m.s));
    const added = [...after].filter((s) => !before.has(s)), removed = [...before].filter((s) => !after.has(s));
    if (added.length || removed.length) {
      out.changes.push({ date: today, added, removed });
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
  const info = candidates.map((d) => {
    const missing = {};
    let priced = 0;
    for (const m of members) {
      if (prices[m.s] && prices[m.s].index.has(d)) priced++;
      else missing[m.sector] = (missing[m.sector] || 0) + 1;
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

async function updateSectors() {
  const file = path.join(DATA, 'sectors.json');
  const prev = readJSON(file, null);
  const period1 = Math.floor(Date.parse('2004-01-01T00:00:00Z') / 1000);
  const res = await mapLimit(ETFS, 2, async (t) => { try { return await fetchDaily(t, { period1 }); } catch (e) { console.warn(`  ETF ${t}: ${e.message}`); return null; } }, 150);
  if (res.some((r) => !r)) { console.warn('ETF incompleti: sectors.json non aggiornato'); return prev; }
  const asOf = res.map((r) => r.dates.at(-1)).sort()[0];
  const dates = [...new Set(res.flatMap((r) => r.dates))].filter((d) => d <= asOf).sort();
  if (prev && asOf < prev.asOf) { console.warn(`ETF al ${asOf}, più vecchi di quelli pubblicati: non aggiorno`); return prev; }
  const adjclose = {};
  ETFS.forEach((t, k) => {
    const m = new Map(res[k].dates.map((d, i) => [d, Math.round(res[k].adjclose[i] * 100) / 100]));
    let last = null;
    adjclose[t] = dates.map((d) => (m.has(d) ? (last = m.get(d)) : last));
  });
  const out = { generated: new Date().toISOString(), asOf, dates, adjclose };
  writeJSON(file, out);
  console.log(`sectors.json: ${dates.length} date, al ${asOf}`);
  return out;
}

async function main() {
  const today = expectedSession();
  const current = readJSON(path.join(DATA, 'breadth.json'), null);
  const etf = readJSON(path.join(DATA, 'sectors.json'), null);
  if (current && etf && current.asOf >= today && etf.asOf >= today && !process.argv.includes('--force')) {
    console.log(`Breadth ed ETF già aggiornati al ${current.asOf} (seduta attesa ${today}): niente da fare.`);
    return;
  }
  const members = await loadMembers(today);
  console.log(`${members.length} membri S&P 500`);

  const results = await mapLimit(members, 3, async (m) => {
    try { return await fetchDaily(m.s, { range: '2y' }); } catch (e) { console.warn(`  ${m.s}: ${e.message}`); return null; }
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
    return { s: m.s, name: m.name, sector: m.sector, close: Math.round(c[i] * 100) / 100, d20: dist(20), d50: dist(50), d200: dist(200), dd: Math.round((c[i] / hi - 1) * 1000) / 10 };
  });
  writeJSON(path.join(DATA, 'breadth_latest.json'), { asOf: d, members: snap });

  await updateSectors();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
