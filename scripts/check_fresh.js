#!/usr/bin/env node
/*
 * check_fresh.js — ultimo passo del workflow: segnala i dati rimasti indietro.
 *
 * Gli script tengono i dati della sera prima quando una fonte non risponde o cambia formato (lista dei
 * costituenti, tabella dei cambi di Wikipedia, holdings di IVV, liste dei membri degli indici, ETF). Per una
 * sera va bene; se succede per giorni l'app mostra dati vecchi senza dirlo. Qui si controllano le date e,
 * oltre i limiti, il passo fallisce e l'Esito del workflow lo segnala (mail di GitHub).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 864e5;
const age = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

/**
 * @param {object} d {breadth, sectors, members, history, sectorMembers, indices, capitulation, indexMembers: {k: {asOf}},
 *   prices, pricesGlobal, pricesMacro, indexLast: {k: ultima seduta con la breadth}, capLast: {k: ultima seduta con i cali forti},
 *   industries, industryMembers (undefined = file non ancora creato: nessun controllo)}
 * @param {string} today data ISO di oggi
 * @returns {string[]} problemi
 */
export function staleData(d, today) {
  const out = [];
  const B = d.breadth && d.breadth.asOf;
  if (!B) return ['breadth.json senza data'];
  // [file, data, riferimento, giorni massimi]: 4 giorni coprono i ponti festivi di Borsa (es. Thanksgiving)
  const checks = [
    ['breadth.json', B, today, 6],
    ['sectors.json', d.sectors && d.sectors.asOf, B, 4],
    ['sp500_members.json (lista dei costituenti)', d.members && d.members.asOf, today, 7],
    ['sp500_history.json (cambi di Wikipedia)', d.history && d.history.changesAsOf, B, 7],
    ['sector_members.json', d.sectorMembers && d.sectorMembers.asOf, B, 4],
    ['sector_members.json (holdings IVV)', d.sectorMembers && d.sectorMembers.weightsAsOf, B, 10],
    ['indices.json', d.indices && d.indices.asOf, B, 4],
    ['capitulation.json (cali forti)', d.capitulation && d.capitulation.asOf, B, 4],
    ['prices.json (rotazione USA)', d.prices && d.prices.asOf, B, 4],
    ['prices_global.json (ETF in euro)', d.pricesGlobal && d.pricesGlobal.asOf, today, 6],
    ['prices_macro.json (asset reali)', d.pricesMacro && d.pricesMacro.asOf, B, 4],
    // vista 7 Emergenti: cambi ed ETF come gli altri prezzi; FRED H.10 esce una volta alla settimana (con un lunedì festivo il
    // martedì, a fine anno può saltare una settimana)
    ['emerging.json (cambi)', d.emerging && d.emerging.asOf && d.emerging.asOf.fx, B, 4],
    ['emerging.json (ETF in dollari)', d.emerging && d.emerging.asOf && d.emerging.asOf.etf, B, 4],
    ['emerging.json (FRED DTWEXEMEGS)', d.emerging && d.emerging.asOf && d.emerging.asOf.fred, today, 14],
  ];
  // ogni indice e ogni serie dei cali forti con la sua ultima seduta: le borse hanno feste diverse, e le più lunghe
  // (Capodanno cinese, Golden Week) tengono chiuse Shanghai e Hong Kong fino a 11 giorni di calendario
  for (const [k, at] of Object.entries(d.indexLast || {})) checks.push([`indici: ${k}`, at, B, 12]);
  for (const [k, at] of Object.entries(d.capLast || {})) checks.push([`cali forti: ${k}`, at, B, 12]);
  for (const [k, at] of Object.entries(d.emergingLast || {})) checks.push([`emerging.json: ${k}`, at, B, 6]);
  // cambi: la parte della Fed (H.10, settimanale) non deve fermarsi, altrimenti la coda provvisoria di Yahoo si allunga
  for (const [k, at] of Object.entries(d.emergingFed || {})) checks.push([`emerging.json: ${k} (Fed)`, at, today, 14]);
  // vista 8 VIX: VIX e indici come gli altri prezzi; la parte di FRED (aggiornata ogni mattina) al massimo 6 giorni
  if (d.vix !== undefined) {
    checks.push(['vix.json (VIX)', d.vix && d.vix.asOf && d.vix.asOf.vix, B, 4], ['vix.json (S&P 500)', d.vix && d.vix.asOf && d.vix.asOf.spx, B, 4],
      ['vix.json (Nasdaq-100)', d.vix && d.vix.asOf && d.vix.asOf.ndx, B, 4], ['vix.json (FRED)', d.vix && d.vix.asOf && d.vix.asOf.fred, today, 6],
      // dalla 1.6.0: VIX3M come il VIX, credito HYG/IEF come gli altri prezzi di Yahoo (null = serie facoltativa mai arrivata)
      ['vix.json (VIX3M)', d.vix && d.vix.asOf && d.vix.asOf.vix3m, B, 4], ['vix.json (FRED VIX3M)', d.vix && d.vix.asOf && d.vix.asOf.fred3m, today, 6],
      ['vix.json (HYG/IEF)', d.vix && d.vix.asOf && d.vix.asOf.credit, B, 4]);
  }
  // industrie (dalla 1.9.0, scripts/fetch_industries.js): breadth e vista 5 come i settori, lista come quelle degli indici,
  // holdings iShares come IVV
  if (d.industries !== undefined) {
    checks.push(['industries.json (industrie)', d.industries && d.industries.asOf, B, 4]);
    for (const [k, l] of Object.entries((d.industries && d.industries.lists) || {})) checks.push([`industries.json: lista ${k}`, l && l.asOf, today, 14]);
  }
  if (d.industryMembers !== undefined) {
    checks.push(['industry_members.json', d.industryMembers && d.industryMembers.asOf, B, 4],
      ['industry_members.json (holdings iShares)', d.industryMembers && d.industryMembers.weightsAsOf, B, 10]);
  }
  // distanza dal massimo storico (dalla 1.10.0, scripts/fetch_ath.js): ogni mercato con il suo limite (config/ath.json,
  // maxAge: 4 giorni come gli altri prezzi, 12 per il KOSPI per le feste coreane); un mercato senza dati è segnalato
  if (d.ath !== undefined) {
    const lim = d.athMaxAge || {};
    if (!d.ath || !Array.isArray(d.ath.markets)) out.push('ath.json: illeggibile o senza mercati');
    else for (const m of d.ath.markets) checks.push([`ath.json: ${m.id}`, m.stats ? m.stats.lastDate : null, B, lim[m.id] || 4]);
  }
  // serie che non sono mai arrivate (prima corsa con qualche fonte giù): senza data, quindi segnalate
  for (const k of (d.emerging && d.emerging.missing) || []) checks.push([`emerging.json: ${k} (mancante)`, null, B, 6]);
  for (const [k, m] of Object.entries(d.indexMembers || {})) checks.push([`index_members/${k}.json`, m && m.asOf, today, 14]);
  for (const [name, at, ref, max] of checks) {
    if (at === undefined) continue; // campo non ancora scritto (prima sera con questo controllo)
    if (!at) out.push(`${name}: senza data`);
    else if (age(at, ref) > max) out.push(`${name}: fermo al ${at} (${age(at, ref)} giorni)`);
  }
  return out;
}

async function main() {
  const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf-8')); } catch { return null; } };
  const dir = path.join(ROOT, 'data', 'index_members');
  const indexMembers = fs.existsSync(dir) ? Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), read('index_members/' + f)])) : {};
  const { indexSeries } = await import('../js/indexdata.js');
  const { capSeries } = await import('../js/capitulation.js');
  const last = (dates, a) => { let t = a.length - 1; while (t >= 0 && a[t] == null) t--; return t >= 0 ? dates[t] : null; };
  const ix = { ...((read('indices_more.json') || {}).series || {}), ...((read('indices.json') || {}).series || {}) };
  const indexLast = Object.fromEntries(Object.entries(ix).map(([k, x]) => { const s = indexSeries(x); return [k, last(s.dates, s.pct200)]; }));
  const cap = read('capitulation.json');
  const capLast = cap && cap.series ? Object.fromEntries(Object.entries(cap.series).map(([k, x]) => { const s = capSeries(x); return [k, last(s.dates, s.n)]; })) : {};
  const em = read('emerging.json');
  // ultima seduta di ogni serie degli emergenti (tranne FRED, controllato sopra)
  const emergingLast = em && em.series ? Object.fromEntries(Object.entries(em.series).filter(([k]) => !/^DTW/.test(k)).map(([k, x]) => [k, x.last || null])) : {};
  const problems = staleData({
    breadth: read('breadth.json'), sectors: read('sectors.json'), members: read('sp500_members.json'), history: read('sp500_history.json'),
    sectorMembers: read('sector_members.json'), indices: read('indices.json'), capitulation: cap, indexMembers,
    prices: read('prices.json'), pricesGlobal: read('prices_global.json'), pricesMacro: read('prices_macro.json'), indexLast, capLast,
    emerging: em || undefined, emergingLast,
    vix: read('vix.json') || undefined,
    industries: read('industries.json') || undefined, industryMembers: read('industry_members.json') || undefined,
    ath: read('ath.json') || undefined,
    athMaxAge: (() => { try { return Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'config/ath.json'), 'utf-8')).markets.map((m) => [m.id, m.maxAge])); } catch { return {}; } })(),
    emergingFed: em && em.series ? Object.fromEntries(Object.entries(em.series).filter(([, x]) => x.fred).map(([k, x]) => [k, x.fred])) : {},
  }, new Date().toISOString().slice(0, 10));
  for (const p of problems) console.log(`::error::Dati non aggiornati: ${p}`);
  if (problems.length) process.exit(1);
  console.log('Dati aggiornati.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
