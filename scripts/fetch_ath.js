#!/usr/bin/env node
/*
 * fetch_ath.js — dati del pannello «Distanza dal massimo storico» della vista 8 VIX (1.10.0, solo contesto).
 * Scrive data/ath.json.
 *
 * Per ogni mercato di config/ath.json scarica da Yahoo tutta la storia giornaliera (barre chiuse, scripts/lib/yahoo.js)
 * e calcola con athStats (js/ath.js) il massimo di chiusura dall'inizio della serie, la distanza dell'ultima chiusura,
 * i giorni passati, il calo più profondo dopo il massimo, il massimo durante la seduta e quello a 52 settimane.
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data/ath.json');
const CFG = path.join(ROOT, 'config/ath.json');
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

async function main() {
  const cfg = JSON.parse(fs.readFileSync(CFG, 'utf-8')).markets;
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf-8')); } catch { /* prima corsa */ }
  const prevOf = (id) => (prev && Array.isArray(prev.markets) ? (prev.markets.find((m) => m.id === id) || {}).stats || null : null);
  const missing = [];
  const rows = await mapLimit(cfg, 3, async (c) => {
    let fresh = null;
    try {
      const r = await fetchDaily(c.symbol, { period1: P1, raw: true });
      fresh = athStats(r.dates, r.close, r.high);
    } catch (e) { console.warn(`${c.id} (${c.symbol}): ${e.message}`); }
    const p = prevOf(c.id), pick = pickStats(fresh, p);
    if (pick.kept) { missing.push(c.id); console.warn(`${c.id}: tengo la riga pubblicata (${pick.why})`); }
    if (!pick.kept && p && fresh.ath < p.ath * 0.995) console.warn(`::warning::${c.id}: massimo sceso da ${p.ath} (${p.athDate}) a ${fresh.ath} (${fresh.athDate}): storia rivista da Yahoo?`);
    const { maxAge, ...meta } = c;
    return { ...meta, stats: pick.stats };
  }, 300);
  const ok = rows.filter((r) => r.stats);
  if (!ok.length) { console.error('Nessun mercato disponibile: data/ath.json resta com\'è'); process.exitCode = 1; return; }
  const out = {
    generated: new Date().toISOString(),
    method: 'Massimo di chiusura dall\'inizio della serie di Yahoo, solo prezzo, nella valuta di quotazione; distanza = ultima chiusura / massimo − 1; giorni di calendario dal massimo all\'ultima seduta; calo massimo = minimo di chiusura dopo il massimo (non calcolato se una chiusura è ≤ 0).',
    asOf: ok.map((r) => r.stats.lastDate).sort().at(-1),
    missing,
    markets: rows,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(`data/ath.json: ${ok.length} mercati su ${rows.length}${missing.length ? ` (righe pubblicate: ${missing.join(', ')})` : ''}`);
  for (const r of rows) if (r.stats) console.log(`  ${r.id.padEnd(7)} ${String(r.stats.distPct).padStart(7)}%  massimo ${r.stats.athDate}  ultima ${r.stats.lastDate}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
