#!/usr/bin/env node
/*
 * ricerca/oscillatori/massimi_minimi.mjs — il Composite Momentum (identificazione.md) usa uno stocastico a 5 periodi, che
 * vuole MASSIMO e MINIMO del mese, non solo la chiusura. L'app ha solo le chiusure dell'S&P 500 (data/vix.json).
 * Qui: Yahoo ^GSPC giornaliero (massimo e minimo di seduta) dal 1985 e mensile (interval=1mo); da quando massimo e minimo
 * sono veri (diversi dalla chiusura); massimi/minimi mensili ricostruiti dalle sedute contro le barre mensili di Yahoo.
 * Fonte: endpoint chart di Yahoo, lo stesso di scripts/lib/yahoo.js (che però restituisce solo close, adjclose, high).
 * Copie in ricerca/oscillatori/cache/. Uso: node ricerca/oscillatori/massimi_minimi.mjs [--offline]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = path.join(ROOT, 'ricerca/oscillatori/cache');
const OFFLINE = process.argv.includes('--offline');
const P1 = Math.floor(Date.parse('1985-01-01') / 1000);

async function chart(interval, file) {
  const p = path.join(CACHE, file);
  if (!OFFLINE) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=${P1}&period2=${Math.floor(Date.now() / 1000)}&interval=${interval}`;
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (research script)' }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json(); fs.writeFileSync(p, JSON.stringify(j));
    } catch (e) { console.log(`(${interval}: ${e.message}; uso la copia locale)`); }
  }
  const j = JSON.parse(fs.readFileSync(p, 'utf8')), res = j.chart.result[0], q = res.indicators.quote[0], tz = res.meta.exchangeTimezoneName;
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return res.timestamp.map((t, i) => ({ d: f.format(t * 1000), o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] })).filter((x) => x.c != null);
}

const D = await chart('1d', 'gspc_1d.json'), Mo = await chart('1mo', 'gspc_1mo.json');
console.log(`Yahoo ^GSPC giornaliero: ${D.length} barre dal ${D[0].d} al ${D.at(-1).d}; mensile: ${Mo.length} barre dal ${Mo[0].d} al ${Mo.at(-1).d}`);
// barre «piatte» (massimo = minimo = chiusura) per anno: senza massimo e minimo veri lo stocastico non ha senso
const flat = {};
for (const x of D) { const y = x.d.slice(0, 4); flat[y] ||= [0, 0]; flat[y][1]++; if (x.h === x.l || x.h == null || x.l == null) flat[y][0]++; }
console.log('Sedute con massimo = minimo (o mancanti), per anno: ' + (Object.entries(flat).filter(([, v]) => v[0]).map(([y, v]) => `${y} ${v[0]}/${v[1]}`).join(', ') || 'nessuna'));
// mensili ricostruiti dalle sedute contro le barre mensili
const byM = new Map();
for (const x of D) { const k = x.d.slice(0, 7), m = byM.get(k); if (!m) byM.set(k, { h: x.h, l: x.l, c: x.c, last: x.d }); else { m.h = Math.max(m.h, x.h); m.l = Math.min(m.l, x.l); m.c = x.c; m.last = x.d; } }
let n = 0, dh = 0, dl = 0, dc = 0, mx = 0, worst = '';
for (const b of Mo) {
  const k = b.d.slice(0, 7), m = byM.get(k); if (!m) continue;
  n++;
  const eh = Math.abs(b.h - m.h) / m.h, el = Math.abs(b.l - m.l) / m.l, ec = Math.abs(b.c - m.c) / m.c;
  if (eh > 1e-6) dh++; if (el > 1e-6) dl++; if (ec > 1e-6) dc++;
  const e = Math.max(eh, el, ec); if (e > mx) { mx = e; worst = `${k}: mensile H ${b.h.toFixed(2)} L ${b.l.toFixed(2)} C ${b.c.toFixed(2)}, dalle sedute H ${m.h.toFixed(2)} L ${m.l.toFixed(2)} C ${m.c.toFixed(2)}`; }
}
console.log(`Mesi confrontati ${n}: massimo diverso in ${dh}, minimo in ${dl}, chiusura in ${dc}; scarto massimo ${(100 * mx).toFixed(4)}% (${worst})`);
const cur = Mo.at(-1);
console.log(`Ultima barra mensile ${cur.d}: è il mese in corso (Yahoo la aggiorna seduta per seduta), da scartare o segnare come provvisoria`);
