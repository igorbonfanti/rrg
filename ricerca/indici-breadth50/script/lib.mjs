// Funzioni comuni agli script di ricerca/indici-breadth50: lettura delle serie dell'app, prezzi Yahoo in cache e
// ricalcolo indipendente della breadth con la regola di scripts/backfill_indices.py (breadth_for), riscritta qui in JS.
//
// Regola (backfill_indices.py): chiusura rettificata per gli split, non per i dividendi; un titolo è «sopra» la media a N
// se ha almeno N sedute (dal taglio di 2 anni prima dell'inizio della breadth) e chiude sopra la media delle ultime N
// chiusure; il denominatore n conta i membri quotati quel giorno (ultima seduta del titolo entro 5 giorni), anche quelli
// con meno di N sedute (contano come «sotto»). Per la composizione d'epoca un ticker con prezzi che partono più di 10 giorni
// dopo l'ingresso nell'indice è scartato (probabile ticker riusato) ma resta tra i membri.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexSeries } from '../../../js/indexdata.js';
import { breadthSeries } from '../../../js/signals.js';
import { fetchDaily, mapLimit } from '../../../scripts/lib/yahoo.js';
import { clean } from '../../../scripts/fetch_indices.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const OUT = path.join(ROOT, 'ricerca/indici-breadth50/dati.json');
export const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
export const DAY = 864e5;
export const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

export function loadAll() {
  const cfg = read('config/indices.json').indices;
  const raw = { ...read('data/indices_more.json').series, ...read('data/indices.json').series };
  const S = {};
  for (const k of Object.keys(cfg)) S[k] = indexSeries(raw[k]);
  return { cfg, raw, S };
}
export function loadSectors() {
  const br = read('data/breadth.json'), sec = read('data/sectors.json');
  const out = {};
  for (const k of Object.keys(br.series)) out[k] = { dates: br.dates, ...breadthSeries(br, k, br.dates) };
  return { br, sec, S: out };
}

// Aggiorna una sezione di dati.json lasciando le altre
export function saveSection(key, obj) {
  const cur = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  cur[key] = obj;
  cur.aggiornato = { ...(cur.aggiornato || {}), [key]: new Date().toISOString().slice(0, 10) };
  fs.writeFileSync(OUT, JSON.stringify(cur, null, 1) + '\n');
}

export const r1 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10) / 10);
export const r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100);
export function median(a) { const v = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; }
export function mean(a) { const v = a.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; }
export function quantile(a, q) { const v = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y); if (!v.length) return null; const p = (v.length - 1) * q, i = Math.floor(p); return v[i] + (v[Math.min(i + 1, v.length - 1)] - v[i]) * (p - i); }
export function corr(x, y) {
  const a = [], b = [];
  for (let i = 0; i < x.length; i++) if (x[i] != null && y[i] != null && isFinite(x[i]) && isFinite(y[i])) { a.push(x[i]); b.push(y[i]); }
  const n = a.length; if (n < 30) return null;
  const ma = mean(a), mb = mean(b);
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
}

// ---------- prezzi ----------
// Chiusure giornaliere da Yahoo (endpoint chart, rettificate per gli split), salvate in cache. period1 = 1990 come il backfill.
export async function prices(symbols, cache, { period1 = 631152000, limit = 4 } = {}) {
  fs.mkdirSync(cache, { recursive: true });
  const px = {}, missing = [];
  await mapLimit(symbols, limit, async (s) => {
    const f = path.join(cache, encodeURIComponent(s) + '.json');
    if (!fs.existsSync(f)) {
      let r = null;
      try { r = await fetchDaily(s, { period1, raw: true }); } catch (e) { r = { dates: [], close: [], error: e.message }; }
      fs.writeFileSync(f, JSON.stringify({ dates: r.dates, close: r.close, error: r.error }));
    }
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (j.dates && j.dates.length) px[s] = clean(j.dates, j.close); else missing.push(s);
  }, 120);
  return { px, missing: missing.sort() };
}

// ---------- breadth con la regola dell'app ----------
function flags(close) {
  const n = close.length, out = { 20: new Uint8Array(n), 50: new Uint8Array(n), 200: new Uint8Array(n) };
  for (const w of [20, 50, 200]) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += close[i]; if (i >= w) s -= close[i - w];
      if (i >= w - 1 && close[i] > s / w) out[w][i] = 1;
    }
  }
  return out;
}
const ord = (d) => Math.round(Date.parse(d) / DAY);
const addDays = (d, k) => new Date(Date.parse(d) + k * DAY).toISOString().slice(0, 10);

/**
 * Conteggi su `cal` (date ISO). members: {simbolo: [[inizio, fine|null], ...]} (fine esclusa); per i membri di oggi
 * {simbolo: [[cal[0], null]]}. Simboli che iniziano con «!» = senza prezzi. opts.pit: composizione d'epoca (attiva il
 * controllo dei ticker riusati); opts.lateStartOk: simboli esenti; opts.calStart: inizio della breadth per il taglio dei
 * 2 anni (default cal[0]); opts.minSessions: se true, il titolo entra in n solo con almeno N sedute (variante).
 */
export function breadthFor(members, px, cal, opts = {}) {
  const N = cal.length, calStart = opts.calStart || cal[0];
  const warm = `${+calStart.slice(0, 4) - 2}${calStart.slice(4)}`;
  const calOrd = cal.map(ord);
  const acc = { members: new Array(N).fill(0), n: new Array(N).fill(0), a20: new Array(N).fill(0), a50: new Array(N).fill(0), a200: new Array(N).fill(0),
    n50: new Array(N).fill(0), n200: new Array(N).fill(0), dropped: [] };
  for (const [sym, ivs] of Object.entries(members)) {
    let have = !sym.startsWith('!') && px[sym] && px[sym].dates.length > 0;
    if (have && opts.pit && !(opts.lateStartOk || new Set()).has(sym)) {
      const first = px[sym].dates[0];
      const late = ivs.filter((iv) => ord(first) > ord(iv[0] > '1990-01-01' ? iv[0] : '1990-01-01') + 10 && (iv[1] == null || iv[1] > first));
      if (late.length) { acc.dropped.push(`${sym} (dati dal ${first}, membro dal ${late[0][0]})`); have = false; }
    }
    let sd, sc, fl, sord;
    if (have) {
      let cut = px[sym].dates.findIndex((d) => d >= warm); if (cut < 0) cut = px[sym].dates.length;
      sd = px[sym].dates.slice(cut); sc = px[sym].close.slice(cut);
      have = sd.length > 0;
      if (have) { fl = flags(sc); sord = sd.map(ord); }
    }
    const always = ivs.length === 1 && ivs[0][0] <= cal[0] && ivs[0][1] == null;
    let j = -1;
    for (let i = 0; i < N; i++) {
      const d = cal[i];
      if (!always && !ivs.some((iv) => iv[0] <= d && (iv[1] == null || d < iv[1]))) continue;
      acc.members[i]++;
      if (!have) continue;
      while (j + 1 < sord.length && sord[j + 1] <= calOrd[i]) j++;
      if (j < 0 || calOrd[i] - sord[j] > 5) continue;
      acc.n[i]++;
      if (j >= 49) acc.n50[i]++;
      if (j >= 199) acc.n200[i]++;
      acc.a20[i] += fl[20][j]; acc.a50[i] += fl[50][j]; acc.a200[i] += fl[200][j];
    }
  }
  return acc;
}

// Intervalli del Dow Jones da config/index_history.json (come dji_intervals in backfill_indices.py)
export function djiIntervals(h) {
  const iv = {}, cur = new Set(h.initial);
  for (const t of cur) iv[t] = [[h.start, null]];
  for (const [d, add, rem] of h.changes) {
    for (const t of rem) { iv[t].at(-1)[1] = d; cur.delete(t); }
    for (const t of add) { (iv[t] ||= []).push([d, null]); cur.add(t); }
  }
  return iv;
}
export { addDays };
