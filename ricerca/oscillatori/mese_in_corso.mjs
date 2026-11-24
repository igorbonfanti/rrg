#!/usr/bin/env node
/*
 * ricerca/oscillatori/mese_in_corso.mjs — quanto cambia il valore del mese in corso di un oscillatore mensile.
 * Oscillatori GENERICI (Coppock 14/11/10 e KST mensile di Pring), non le formule della pagina, che non sono ancora note:
 * serve solo a stimare il rischio di mostrare il mese non chiuso.
 *
 * Per ogni mese chiuso dal 1994 e per la k-esima seduta del mese (5, 10, 15) si calcola l'oscillatore con la chiusura di
 * quella seduta al posto della chiusura di fine mese (i mesi prima restano chiusi) e si guarda se la DIREZIONE rispetto
 * al mese prima (sale/scende) è la stessa di quella finale.
 * Dati: data/vix.json, serie SPX (Yahoo ^GSPC, solo prezzo, dal 1990). Uso: node ricerca/oscillatori/mese_in_corso.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vxSeries } from '../../js/vix.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = vxSeries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vix.json'), 'utf8')).series.SPX);
// sedute per mese
const months = [];
S.dates.forEach((d, i) => { const k = d.slice(0, 7); if (!months.length || months.at(-1).m !== k) months.push({ m: k, px: [] }); months.at(-1).px.push(S.val[i]); });
months.pop(); // l'ultimo mese non è chiuso (vedi dati.mjs)

const roc = (a, n, i) => (i >= n ? (a[i] / a[i - n] - 1) * 100 : null);
// valore all'ultimo indice della serie a (solo l'ultimo punto: è quello che cambia)
function coppockAt(a, i) { let s = 0, w = 0; for (let k = 0; k < 10; k++) { const j = i - k, v1 = roc(a, 14, j), v2 = roc(a, 11, j); if (v1 == null || v2 == null) return null; s += (v1 + v2) * (10 - k); w += 10 - k; } return s / w; }
function smaRoc(a, r, n, i) { let s = 0; for (let k = 0; k < n; k++) { const v = roc(a, r, i - k); if (v == null) return null; s += v; } return s / n; }
function kstAt(a, i) { const p = [[9, 6, 1], [12, 6, 2], [18, 6, 3], [24, 9, 4]].map(([r, n, w]) => { const v = smaRoc(a, r, n, i); return v == null ? null : v * w; }); return p.some((x) => x == null) ? null : p.reduce((s, x) => s + x, 0); }

const C = months.map((x) => x.px.at(-1));
for (const [name, f] of [['Coppock', coppockAt], ['KST', kstAt]]) {
  const res = {};
  for (const K of [5, 10, 15]) res[K] = { n: 0, flip: 0, big: [] };
  let nFinal = 0;
  for (let i = 1; i < months.length; i++) {
    if (months[i].m < '1994-01') continue;
    const fin = f(C, i), prev = f(C, i - 1);
    if (fin == null || prev == null) continue;
    nFinal++;
    for (const K of [5, 10, 15]) {
      if (months[i].px.length <= K) continue;
      const a = C.slice(0, i + 1); a[i] = months[i].px[K - 1];
      const prov = f(a, i);
      res[K].n++;
      if (Math.sign(prov - prev) !== Math.sign(fin - prev)) res[K].flip++;
    }
  }
  console.log(`${name}: mesi chiusi dal 1994 con valore ${nFinal}`);
  for (const K of [5, 10, 15]) console.log(`  alla ${K}ª seduta del mese: direzione diversa da quella di fine mese in ${res[K].flip} mesi su ${res[K].n} (${(100 * res[K].flip / res[K].n).toFixed(1)}%)`);
}
