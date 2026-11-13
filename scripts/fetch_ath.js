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
 * Scelte delle serie (ETF fisici per oro e argento, future continui per rame e petrolio, niente USO) e confronto con
 * seconde fonti: ricerca/bolle-rotazione/sintesi.md.
 *
 * Regole: un mercato che non risponde, arriva più vecchio della riga pubblicata o con la storia accorciata (inizio più
 * tardi di oltre 30 giorni) tiene la riga pubblicata e finisce in `missing`; un mercato mai arrivato ha stats null
 * (l'app mostra «—»). Avvisi nel log se il nuovo massimo è sotto il precedente oltre lo 0,5% (storia rivista).
 * Il file non contiene ore di download per riga: keep_unchanged.js evita i commit quando non cambia nulla.
 * Uso: node scripts/fetch_ath.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDaily, mapLimit } from './lib/yahoo.js';
import { athStats, daysBetween } from '../js/ath.js';
import { pack } from './fetch_emerging.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/ath.json');
const CFG = path.join(ROOT, 'config/ath.json');
const OUT_H = path.join(ROOT, 'data/ath_history.json');
export const HIST_FROM = '2000-01-01'; // il grafico parte dal 2000: il massimo di sempre resta nel dettaglio della riga
const P1 = -2208988800; // 1900: tutta la storia che Yahoo ha

/**
 * Riga nuova o quella pubblicata.
 * @param {object|null} fresh statistiche appena calcolate (null = non arrivate)
 * @param {object|null} prev statistiche pubblicate
 * @returns {{stats: object|null, kept: boolean, why: string|null}}
 */
export function pickStats(fresh, prev) {
  if (!fresh) return { stats: prev || null, kept: true, why: 'non arrivato' };
  if (prev && fresh.lastDate < prev.lastDate) return { stats: prev, kept: true, why: `ultima seduta ${fresh.lastDate}, più vecchia della pubblicata (${prev.lastDate})` };
  if (prev && daysBetween(prev.start, fresh.start) > 30) return { stats: prev, kept: true, why: `storia accorciata (dal ${fresh.start} invece che dal ${prev.start})` };
  return { stats: fresh, kept: false, why: null };
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
    let fresh = null, h = null;
    try {
      const r = await fetchDaily(c.symbol, { period1: P1, raw: true });
      fresh = athStats(r.dates, r.close, r.high);
      const i0 = r.dates.findIndex((d) => d >= HIST_FROM);
      if (i0 >= 0) h = pack(r.dates.slice(i0), r.close.slice(i0).map((v) => Math.round(v * 10000) / 10000));
    } catch (e) { console.warn(`${c.id} (${c.symbol}): ${e.message}`); }
    const p = prevOf(c), pick = pickStats(fresh, p);
    if (!pick.kept && p && fresh.ath < p.ath * 0.995) console.warn(`::warning::${c.id}: massimo sceso da ${p.ath} (${p.athDate}) a ${fresh.ath} (${fresh.athDate}): storia rivista da Yahoo?`);
    const ph = prevRow(c) && prevH && prevH.series ? prevH.series[c.id] || null : null;
    const hh = pick.kept ? (pick.stats ? ph : null) : h; // senza riga (mai arrivato) niente storico vecchio
    if (pick.kept) console.warn(`${c.id}: ${pick.stats ? `tengo la riga pubblicata (${pick.why})` : 'non arrivato e nessuna riga pubblicata: «—»'}`);
    const { maxAge, ...meta } = c;
    return { row: { ...meta, stats: pick.stats }, hist: hh, kept: pick.kept };
  }, 300);
  // tutto nell'ordine di config/ath.json, non in quello di arrivo delle risposte: due corse senza sedute nuove scrivono
  // file identici e keep_unchanged.js non li ripubblica
  const rows = res.map((x) => x.row), missing = cfg.filter((c, k) => res[k].kept).map((c) => c.id);
  for (const [k, c] of cfg.entries()) if (res[k].hist) hist[c.id] = res[k].hist;
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
  fs.writeFileSync(OUT_H, JSON.stringify({ generated: out.generated, from: HIST_FROM, note: 'Chiusure giornaliere di Yahoo (solo prezzo) per il grafico del pannello; date compatte (d0, gaps) e valori in differenze intere (cd) divise per ps.', series: hist }) + '\n');
  console.log(`data/ath.json: ${ok.length} mercati su ${rows.length}${missing.length ? ` (non aggiornati: ${missing.join(', ')}; resta la riga pubblicata dove c'è)` : ''}`);
  for (const r of rows) if (r.stats) console.log(`  ${r.id.padEnd(7)} ${String(r.stats.distPct).padStart(7)}%  massimo dei 3 anni ${r.stats.refDate}  (di sempre ${r.stats.athDate})  ultima ${r.stats.lastDate}`);
  // un mercato non arrivato fa fallire il passo (come fetch_industries.js): l'Esito della corsa lo segnala subito, i file
  // sono già scritti con le righe pubblicate
  if (missing.length) { console.error(`Mercati non aggiornati: ${missing.join(', ')}`); process.exitCode = 1; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
