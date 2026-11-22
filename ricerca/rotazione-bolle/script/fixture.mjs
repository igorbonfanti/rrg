#!/usr/bin/env node
/*
 * fixture.mjs — scrive test/fixtures/peaks_20261120.json.gz per test/peaks.test.js (linea del tempo dei massimi, 1.12.0).
 *
 * Il test deve girare anche su main, dove ricerca/ non c'è: qui si copiano nella fixture
 *  - le chiusure di data/ath_history.json (il file dell'app) fino all'ultima seduta della ricerca (series.SPX.to di
 *    risultati.json, 20/11/2026), nello stesso formato compatto (d0, gaps, cd, ps);
 *  - i valori attesi, presi così come sono da ricerca/rotazione-bolle/risultati.json (scritto da backtest.mjs e
 *    ricontrollato da verifica.py): episodi (massimi di ciclo) per soglia, dalla prima data in cui il file dell'app
 *    permette un massimo di 52 settimane (un anno dopo la sua prima seduta); le 5 finestre della linea del tempo (ultimi 4
 *    cali ≥ 15% dell'S&P 500 e quello in corso di windows.SPX10); i ranghi di ogni calo ≥ 15%; l'ordine tipico (T3).
 * Nessun calcolo dei massimi qui: solo copia e filtro per data.
 *
 * Uso: node ricerca/rotazione-bolle/script/fixture.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { decodeDates, deltaDecode, encodeDates, deltaEncode } from '../../../js/indexdata.js';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(BASE, '..', '..');
const R = JSON.parse(fs.readFileSync(path.join(BASE, 'risultati.json'), 'utf-8'));
const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ath_history.json'), 'utf-8'));
const IDS = Object.keys(R.series);
const asOf = R.series.SPX.to;
const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

const series = {}, eligible = {};
for (const id of IDS) {
  const h = H.series[id];
  const d = decodeDates(h.d0, h.gaps), c = deltaDecode(h.cd, h.ps || 100);
  const k = d.filter((x) => x <= asOf).length;
  if (d[k - 1] !== R.series[id].to) throw new Error(`${id}: ultima seduta del file ${d[k - 1]}, della ricerca ${R.series[id].to}`);
  const ps = h.ps || 100;
  series[id] = { ...encodeDates(d.slice(0, k)), ps, cd: deltaEncode(c.slice(0, k), ps) };
  eligible[id] = addDays(d[0], 365);
}

const keep = ['date', 'troughDate', 'ddPct', 'confirmDate', 'recoveryDate', 'ongoing', 'belowZero'];
const pickKeys = (o) => Object.fromEntries(keep.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const episodes = {};
for (const id of IDS) {
  episodes[id] = {};
  for (const [X, list] of Object.entries(R.episodes[id])) episodes[id][X] = list.filter((p) => p.date >= eligible[id]).map(pickKeys);
}

const win = [...R.windows.SPX15.slice(-4), ...R.windows.SPX10.filter((r) => r.ongoing)];
const timeline = win.map((r) => ({
  peak: r.peak, ddPct: r.ddPct, ongoing: r.ongoing,
  markets: Object.fromEntries(IDS.map((id) => {
    const m = r.markets[id];
    const ep = m.status === 'peak' ? R.episodes[id][20].find((p) => p.date === m.date) : null;
    return [id, {
      status: m.status, date: m.date ?? null, offset: m.offset ?? null, ddPct: m.ddPct ?? null,
      others: m.all ? m.all.filter((a) => a.offset !== m.offset).map((a) => a.offset) : [],
      alt15: m.alt15 ? m.alt15.offset : null,
      ongoing: ep ? !!ep.ongoing : null, belowZero: ep ? !!ep.belowZero : null, troughDate: ep ? ep.troughDate : null,
    }];
  })),
}));
const ranks = R.windows.SPX15.map((r) => ({ peak: r.peak, ranks: Object.fromEntries(IDS.map((id) => [id, r.markets[id].rankNorm ?? null])) }));

const out = {
  note: 'Generato da ricerca/rotazione-bolle/script/fixture.mjs: chiusure di data/ath_history.json fino al ' + asOf + ' e valori attesi copiati da ricerca/rotazione-bolle/risultati.json (generated ' + R.generated + ').',
  asOf, ids: IDS, eligible, series, episodes, timeline, ranks, order: R.order.SPX15,
};
const f = path.join(ROOT, 'test', 'fixtures', 'peaks_20261120.json.gz');
fs.writeFileSync(f, zlib.gzipSync(JSON.stringify(out), { level: 9 }));
console.log('scritto', path.relative(ROOT, f), fs.statSync(f).size, 'byte;', Object.values(episodes).reduce((a, e) => a + Object.values(e).reduce((b, l) => b + l.length, 0), 0), 'episodi,', timeline.length, 'finestre');
