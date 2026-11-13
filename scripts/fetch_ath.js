#!/usr/bin/env node
/*
 * fetch_ath.js — dati del pannello «Distanza dal massimo» della vista 8 VIX (1.10.0, solo contesto).
 * Scrive data/ath.json (valori della tabella) e data/ath_history.json (chiusure dal 2000 per il grafico, letto solo
 * quando si apre il grafico di un mercato).
 *
 * Per ogni mercato di config/ath.json scarica da Yahoo tutta la storia giornaliera (barre chiuse, scripts/lib/yahoo.js)
 * e calcola con athStats (js/ath.js) il massimo di chiusura degli ultimi 3 anni (riferimento), la distanza dell'ultima
 * chiusura, i giorni passati, il calo più profondo dopo il massimo, il massimo durante la seduta e quello di sempre.
 * Si ricalcola ogni notte dall'intera storia: nessun massimo «salvato», così una revisione di Yahoo entra da sola.
 * Scelte delle serie (future continui per oro, argento, rame e petrolio dalla 1.10.1, prima ETF fisici per oro e argento; niente USO) e confronto con
 * seconde fonti: ricerca/bolle-rotazione/sintesi.md.
 *
 * Regole: un mercato che non risponde, arriva più vecchio della riga pubblicata o con la storia accorciata (inizio più
 * tardi di oltre 30 giorni) tiene la riga pubblicata e finisce in `missing`; un mercato mai arrivato ha stats null
 * (l'app mostra «—»). Avvisi nel log se il nuovo massimo è sotto il precedente oltre lo 0,5% (storia rivista).
 * Il file non contiene ore di download per riga: keep_unchanged.js evita i commit quando non cambia nulla.
 *
 * Profilo dei volumi degli ultimi 12 mesi (dalla 1.11.0, `profiles` in data/ath_history.json; metodo in
 * scripts/lib/volprofile.js, ricerca in ricerca/poc/profilo/): per i mercati con `profile` in config/ath.json si usa il
 * volume della serie del grafico (bitcoin, oro, petrolio, SOXX: nessuna richiesta in più), oppure si scaricano lo strumento
 * dei volumi (SPY, QQQ, 069500.KS: 13 mesi di barre giornaliere) e le barre orarie (SI=F e HG=F, ~1,3 MB in tutto con SPY).
 * Un profilo che non si può fare (strumento non arrivato, regole d'errore del §4.3) o che arriva più vecchio tiene quello
 * pubblicato finché finisce entro maxAge giorni dall'ultima seduta del mercato, poi diventa null (l'app lo dice nella
 * legenda). Il passo non fallisce mai per il profilo (solo avvisi nel log): un profilo mancante o fermo oltre maxAge lo
 * segnala check_fresh.js, che fa fallire la corsa.
 * Uso: node scripts/fetch_ath.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchChart, parse, parseHourly, mapLimit } from './lib/yahoo.js';
import { athStats, daysBetween, windowStart } from '../js/ath.js';
import { buildProfile } from './lib/volprofile.js';
import { pack } from './fetch_emerging.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/ath.json');
const CFG = path.join(ROOT, 'config/ath.json');
const OUT_H = path.join(ROOT, 'data/ath_history.json');
export const HIST_FROM = '2000-01-01'; // il grafico parte dal 2000: il massimo di sempre resta nel dettaglio della riga
const P1 = -2208988800; // 1900: tutta la storia che Yahoo ha
// solo per le verifiche: con ATH_RAW_DIR le risposte grezze di Yahoo si salvano lì, nel formato di ricerca/poc/cache/
// ({fetched, res}), così ricerca/poc/profilo/confronto_app.mjs rifà i profili con analisi.mjs sugli stessi dati
const RAW_DIR = process.env.ATH_RAW_DIR || null;
async function yahoo(kind, sym, opt) {
  const res = await fetchChart(sym, { ...opt, raw: true });
  if (RAW_DIR) fs.writeFileSync(path.join(RAW_DIR, `${kind}_${sym.replace(/[^A-Za-z0-9.-]/g, '_')}.json`), JSON.stringify({ fetched: new Date().toISOString(), res }));
  return res;
}
const daily = async (sym, period1) => parse(await yahoo('d', sym, { period1 }), { withVolume: true });

/**
 * Riga nuova o quella pubblicata.
 * @param {object|null} fresh statistiche appena calcolate (null = non arrivate)
 * @param {object|null} prev statistiche pubblicate
 * @returns {{stats: object|null, kept: boolean, why: string|null}}
 */
export function pickStats(fresh, prev) {
  if (!fresh) return { stats: prev || null, kept: true, why: 'non arrivato' };
  // Yahoo a volte ridà una seduta in meno (KOSPI il 13/11/2026 alle 18:42 UTC): si tiene la riga pubblicata, ma non è un
  // errore (soft): se resta indietro per giorni lo segnala check_fresh.js con il limite del mercato
  if (prev && fresh.lastDate < prev.lastDate) return { stats: prev, kept: true, soft: true, why: `ultima seduta ${fresh.lastDate}, più vecchia della pubblicata (${prev.lastDate})` };
  if (prev && daysBetween(prev.start, fresh.start) > 30) return { stats: prev, kept: true, why: `storia accorciata (dal ${fresh.start} invece che dal ${prev.start})` };
  return { stats: fresh, kept: false, why: null };
}

/** Avvertenza per i mercati che non passano il criterio di stabilità (ricerca/poc/profilo/sintesi.md), mostrati per scelta
 * dell'utente del 13/11/2026 */
export const UNSTABLE_NOTE = 'profilo poco stabile: con barre giornaliere e orarie le zone principali non coincidono (due zone di volume quasi uguali); leggere con cautela';

/**
 * Profilo dei volumi nuovo o quello pubblicato (come pickStats).
 * @param {object|null} fresh profilo appena calcolato (null = non arrivato o non calcolabile)
 * @param {object|null} prev profilo pubblicato dello stesso mercato e dello stesso strumento
 * @param {string|null} lastDate ultima seduta del mercato (riga di data/ath.json)
 * @param {number} maxAge giorni di calendario oltre i quali il profilo pubblicato non vale più
 * @returns {{profile: object|null, kept: boolean, why: string|null}}
 */
export function pickProfile(fresh, prev, lastDate, maxAge) {
  if (fresh && (!prev || fresh.to >= prev.to)) return { profile: fresh, kept: false, why: null };
  const why = fresh ? `ultima seduta ${fresh.to}, più vecchia della pubblicata (${prev.to})` : 'non arrivato';
  if (prev && lastDate && prev.to <= lastDate && daysBetween(prev.to, lastDate) <= maxAge) return { profile: prev, kept: true, why };
  return { profile: null, kept: false, why: prev ? `${why}; il pubblicato (al ${prev.to}) è oltre ${maxAge} giorni dall'ultima seduta` : why };
}

/** Profilo pubblicato dello stesso mercato, dello stesso simbolo del grafico e dello stesso strumento dei volumi */
export const prevProfileOf = (prevH, prevRow, c) => {
  const p = prevRow && c.profile && prevH && prevH.profiles ? prevH.profiles[c.id] : null;
  return p && p.vol === c.profile.vol && Array.isArray(p.bp) ? p : null;
};

/** Profilo come lo scrive il file: dati del calcolo più strumento, testo e stabilità da config/ath.json */
export function profileRow(p, cfg) {
  if (!p) return null;
  const { from, to, sessions, source, lo, hi, n, scale, bp } = p;
  return { vol: cfg.vol, text: cfg.text, stable: cfg.stable !== false, ...(cfg.stable === false ? { stableNote: UNSTABLE_NOTE } : {}), from, to, sessions, source, lo, hi, n, scale, bp };
}

/** Riga pubblicata dello stesso mercato e dello stesso simbolo (null se la serie è cambiata o manca) */
export const prevRowOf = (prev, c) => (prev && Array.isArray(prev.markets) ? prev.markets.find((m) => m.id === c.id && m.symbol === c.symbol) || null : null);

async function main() {
  const cfg = JSON.parse(fs.readFileSync(CFG, 'utf-8')).markets;
  let prev = null, prevH = null;
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf-8')); } catch { /* prima corsa */ }
  try { prevH = JSON.parse(fs.readFileSync(OUT_H, 'utf-8')); } catch { /* prima corsa */ }
  const hist = {};
  // riga pubblicata dello stesso mercato e dello stesso simbolo: se la serie cambia (oro e argento dagli ETF ai future,
  // 1.10.1) la riga vecchia non vale più
  const prevRow = (c) => prevRowOf(prev, c);
  const prevOf = (c) => (prevRow(c) || {}).stats || null;
  const res = await mapLimit(cfg, 3, async (c) => {
    let fresh = null, h = null, r = null;
    try {
      r = await daily(c.symbol, P1);
      fresh = athStats(r.dates, r.close, r.high);
      const i0 = r.dates.findIndex((d) => d >= HIST_FROM);
      if (i0 >= 0) h = pack(r.dates.slice(i0), r.close.slice(i0).map((v) => Math.round(v * 10000) / 10000));
    } catch (e) { r = null; console.warn(`${c.id} (${c.symbol}): ${e.message}`); }
    const vp = c.profile ? await freshProfile(c, r) : null;
    const p = prevOf(c), pick = pickStats(fresh, p);
    if (!pick.kept && p && fresh.ath < p.ath * 0.995) console.warn(`::warning::${c.id}: massimo sceso da ${p.ath} (${p.athDate}) a ${fresh.ath} (${fresh.athDate}): storia rivista da Yahoo?`);
    const ph = prevRow(c) && prevH && prevH.series ? prevH.series[c.id] || null : null;
    const hh = pick.kept ? (pick.stats ? ph : null) : h; // senza riga (mai arrivato) niente storico vecchio
    if (pick.kept) console.warn(`${c.id}: ${pick.stats ? `tengo la riga pubblicata (${pick.why})` : 'non arrivato e nessuna riga pubblicata: «—»'}`);
    const { maxAge, profile: pcfg, ...meta } = c;
    let prof = null;
    if (pcfg) {
      const pp = pickProfile(vp && (!pick.kept || pick.soft) ? vp.profile : null, prevProfileOf(prevH, prevRow(c), c), pick.stats ? pick.stats.lastDate : null, maxAge);
      prof = profileRow(pp.profile, pcfg);
      if (pp.why) console.log(`::warning::${c.id}: profilo dei volumi ${pp.profile ? `pubblicato tenuto (al ${pp.profile.to})` : 'non disponibile'}: ${pp.why}${vp && vp.why ? ` (${vp.why})` : ''}`);
    }
    return { row: { ...meta, stats: pick.stats }, hist: hh, prof, kept: pick.kept, soft: !!pick.soft };
  }, 300);
  // tutto nell'ordine di config/ath.json, non in quello di arrivo delle risposte: due corse senza sedute nuove scrivono
  // file identici e keep_unchanged.js non li ripubblica
  const rows = res.map((x) => x.row), missing = cfg.filter((c, k) => res[k].kept).map((c) => c.id);
  const failed = cfg.filter((c, k) => res[k].kept && !res[k].soft).map((c) => c.id); // non arrivati o con la storia accorciata
  for (const [k, c] of cfg.entries()) if (res[k].hist) hist[c.id] = res[k].hist;
  const profiles = {};
  for (const [k, c] of cfg.entries()) if (c.profile) profiles[c.id] = res[k].prof;
  const ok = rows.filter((r) => r.stats);
  if (!ok.length) { console.error('Nessun mercato disponibile: data/ath.json resta com\'è'); process.exitCode = 1; return; }
  const out = {
    generated: new Date().toISOString(),
    method: 'Riferimento: massimo di chiusura degli ultimi 3 anni (dalla stessa data di 3 anni prima dell\'ultima seduta), dalla serie di Yahoo, solo prezzo, nella valuta di quotazione; distanza = ultima chiusura / massimo − 1; giorni di calendario dal massimo all\'ultima seduta; calo massimo = minimo di chiusura dopo il massimo (non calcolato se una chiusura è ≤ 0); ath = massimo di chiusura dall\'inizio della serie.',
    asOf: ok.map((r) => r.stats.lastDate).sort().at(-1),
    missing,
    markets: rows,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  fs.writeFileSync(OUT_H, JSON.stringify({ generated: out.generated, from: HIST_FROM, note: 'Chiusure giornaliere di Yahoo (solo prezzo) per il grafico del pannello; date compatte (d0, gaps) e valori in differenze intere (cd) divise per ps. profiles (dalla 1.11.0): profilo dei volumi degli ultimi 12 mesi, n fasce uguali sulla scala logaritmica tra lo e hi, quota di ogni fascia in centesimi di punto percentuale (bp); null = non disponibile.', series: hist, profiles }) + '\n');
  console.log(`data/ath.json: ${ok.length} mercati su ${rows.length}${missing.length ? ` (non aggiornati: ${missing.join(', ')}; resta la riga pubblicata dove c'è)` : ''}`);
  for (const r of rows) if (r.stats) console.log(`  ${r.id.padEnd(7)} ${String(r.stats.distPct).padStart(7)}%  massimo dei 3 anni ${r.stats.refDate}  (di sempre ${r.stats.athDate})  ultima ${r.stats.lastDate}`);
  // un mercato non arrivato (o con la storia accorciata) fa fallire il passo (come fetch_industries.js): l'Esito della corsa lo segnala subito, i file
  // sono già scritti con le righe pubblicate
  if (failed.length) { console.error(`Mercati non aggiornati: ${failed.join(', ')}`); process.exitCode = 1; }
  else if (missing.length) console.log(`::warning::Seduta più vecchia della pubblicata, tenuta la riga pubblicata: ${missing.join(', ')}`);
}

/**
 * Profilo dei volumi di un mercato appena scaricato.
 * @param {object} c mercato di config/ath.json (con profile)
 * @param {object|null} r serie giornaliera del grafico (fetchDaily con withVolume), null se non arrivata
 * @returns {Promise<{profile: object|null, why: string|null}>}
 */
async function freshProfile(c, r) {
  if (!r || !r.dates.length) return { profile: null, why: 'serie del grafico non arrivata' };
  const P = c.profile, to = r.dates[r.dates.length - 1], from = windowStart(to, 1);
  const p1 = Math.floor(Date.parse(from) / 1000) - 40 * 86400; // un mese in più: serve la seduta prima della finestra (volume ricopiato)
  let vol = r, hourly = null;
  try {
    if (P.vol !== c.symbol) vol = await daily(P.vol, p1);
    if (P.hourly) hourly = parseHourly(await yahoo('h', P.vol, { period1: p1, interval: '60m' }));
  } catch (e) { return { profile: null, why: `${P.vol}${P.hourly ? ' (barre orarie)' : ''} non arrivato: ${e.message}` }; }
  const b = buildProfile({ chart: r, vol, hourly, needHourly: !!P.hourly, from, to });
  const i = b.info;
  if (i) console.log(`  ${c.id.padEnd(7)} profilo ${P.vol}${i.dailyVsHourly != null ? ` (giornaliero/orario ${i.dailyVsHourly.toFixed(4)}: barre ${i.fromHourly ? 'orarie' : 'giornaliere'})` : ''}: ${b.profile ? `dal ${b.profile.from} al ${b.profile.to}, ${b.profile.sessions} sedute` : 'non calcolato'}` +
    `${i.skipped ? `, ${i.skipped} sedute senza chiusura comune` : ''}${i.stale.length ? `, volume ricopiato tolto: ${i.stale.join(', ')}` : ''}${i.noVolume ? `, ${i.noVolume} sedute senza volume` : ''}`);
  return b;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
