#!/usr/bin/env node
/*
 * need_update.js — primo passo del workflow: decide se la corsa deve scaricare i dati.
 *
 * GitHub fa partire le corse programmate con ore di ritardo e Yahoo pubblica le chiusure USA a ore diverse della notte.
 * Per avere i dati della seduta il prima possibile ci sono corse di recupero ogni ora nelle prime ore del mattino
 * (RECOVERY). Quelle corse servono solo finché manca la seduta USA attesa: se prezzi, breadth e indici USA ce l'hanno
 * già, la corsa si ferma subito e non riscarica migliaia di titoli. Le corse principali, quelle lanciate a mano e
 * quelle con un altro orario partono sempre.
 * Scrive run=true|false in $GITHUB_OUTPUT.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedSession } from '../js/calendar.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// stesso testo del cron in .github/workflows/update-data.yml
export const RECOVERY = '10 1-6 * * 2-6';
const US = ['SPX', 'NDX', 'DJI', 'RUT'];

/**
 * @param {{schedule?: string, expected: string, prices?: string, breadth?: string, indexLast?: Record<string, string|null>}} s
 *   schedule: cron della corsa (vuoto se lanciata a mano); expected: seduta USA attesa; prices/breadth: asOf dei file;
 *   indexLast: ultima seduta con la breadth per gli indici USA
 * @returns {{run: boolean, why: string}}
 */
export function needUpdate(s) {
  if (s.schedule !== RECOVERY) return { run: true, why: s.schedule ? `corsa programmata (${s.schedule})` : 'corsa lanciata a mano' };
  const late = [['prezzi', s.prices], ['breadth', s.breadth], ...US.map((k) => [k, (s.indexLast || {})[k]])].filter(([, d]) => !d || d < s.expected);
  return late.length
    ? { run: true, why: `manca la seduta ${s.expected} per ${late.map(([k]) => k).join(', ')}` }
    : { run: false, why: `dati USA già alla seduta ${s.expected}: niente da fare` };
}

async function main() {
  const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf-8')); } catch { return null; } };
  const { indexSeries } = await import('../js/indexdata.js');
  const ix = (read('indices.json') || {}).series || {};
  const indexLast = Object.fromEntries(US.filter((k) => ix[k]).map((k) => {
    const x = indexSeries(ix[k]);
    let t = x.pct200.length - 1;
    while (t >= 0 && x.pct200[t] == null) t--;
    return [k, t >= 0 ? x.dates[t] : null];
  }));
  const r = needUpdate({
    schedule: process.env.SCHEDULE || '', expected: expectedSession(),
    prices: (read('prices.json') || {}).asOf, breadth: (read('breadth.json') || {}).asOf, indexLast,
  });
  console.log(`${r.run ? 'Aggiorno' : 'Salto'}: ${r.why}.`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `run=${r.run}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
