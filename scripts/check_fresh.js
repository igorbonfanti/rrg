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
 * @param {object} d {breadth, sectors, members, history, sectorMembers, indices, capitulation, indexMembers: {k: {asOf}}}
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
  ];
  for (const [k, m] of Object.entries(d.indexMembers || {})) checks.push([`index_members/${k}.json`, m && m.asOf, today, 14]);
  for (const [name, at, ref, max] of checks) {
    if (at === undefined) continue; // campo non ancora scritto (prima sera con questo controllo)
    if (!at) out.push(`${name}: senza data`);
    else if (age(at, ref) > max) out.push(`${name}: fermo al ${at} (${age(at, ref)} giorni)`);
  }
  return out;
}

function main() {
  const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf-8')); } catch { return null; } };
  const dir = path.join(ROOT, 'data', 'index_members');
  const indexMembers = fs.existsSync(dir) ? Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), read('index_members/' + f)])) : {};
  const problems = staleData({
    breadth: read('breadth.json'), sectors: read('sectors.json'), members: read('sp500_members.json'), history: read('sp500_history.json'),
    sectorMembers: read('sector_members.json'), indices: read('indices.json'), capitulation: read('capitulation.json'), indexMembers,
  }, new Date().toISOString().slice(0, 10));
  for (const p of problems) console.log(`::error::Dati non aggiornati: ${p}`);
  if (problems.length) process.exit(1);
  console.log('Dati aggiornati.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
