#!/usr/bin/env node
/*
 * grafico.mjs — immagini di prova (SVG statici, solo per la nota) del grafico del pannello con la linea del POC.
 * Legge ricerca/poc/risultati.json (analisi.mjs) e le chiusure in ricerca/poc/cache/; scrive in ricerca/poc/:
 *  - poc_spx.svg: S&P 500, ultimi 3 anni, scala logaritmica come nell'app; POC dei 12 mesi con i volumi di SPY (robusto),
 *    value area 70% e profilo dei volumi a destra; per confronto il POC con i volumi orari del future ES=F (metodo c), che cade in un'altra zona;
 *  - poc_oro.svg: oro con il future GC=F: i due picchi quasi uguali del profilo (POC non robusto).
 * Il POC mostrato è quello del metodo (b), 100 fasce. Uso: node ricerca/poc/grafico.mjs (le PNG accanto sono le stesse
 * immagini rese con Playwright, solo per vederle senza browser).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../scripts/lib/yahoo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(fs.readFileSync(path.join(HERE, 'risultati.json'), 'utf-8')).B;
const daily = (sym) => { const j = JSON.parse(fs.readFileSync(path.join(HERE, 'cache', `d_${sym.replace(/[^A-Za-z0-9.-]/g, '_')}.json`), 'utf-8')); return parse(j.res, { nowSec: Date.parse(j.fetched) / 1000 }); };
const th = (v, d = 0) => v.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
const dIT = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const C = { ink: '#1f2937', muted: '#6b7280', grid: '#e5e7eb', win: '#eef2f7', poc: '#c2410c', alt: '#2563eb', va: 'rgba(194,65,12,0.10)', prof: '#9ca3af', bg: '#fcfcfb' };

function chart({ file, title, sub, market, main, alt, altLabel, mainLabel, dec = 0 }) {
  const m = R[market], v = m.variants[main], s = daily(m.chart);
  const W = 1000, L = 10, PW = 760, GAP = 8, PRW = 150, R0 = L + PW + GAP, T = 64, PH = 330, B = 86, H = T + PH + B;
  const end = s.dates[s.dates.length - 1], t1 = Date.parse(end), t0 = t1 - 3 * 365.25 * 864e5;
  const idx = s.dates.map((d, i) => i).filter((i) => Date.parse(s.dates[i]) >= t0);
  const vis = idx.map((i) => s.close[i]);
  const [plo, phi] = v.range, lo = Math.log(Math.min(...vis, plo)) - 0.02, hi = Math.log(Math.max(...vis, phi)) + 0.02;
  const x = (d) => L + ((Date.parse(d) - t0) / (t1 - t0)) * PW, y = (p) => T + ((hi - Math.log(p)) / (hi - lo)) * PH;
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="12">`);
  o.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);
  o.push(`<text x="${L}" y="24" font-size="16" font-weight="600" fill="${C.ink}">${esc(title)}</text><text x="${L}" y="44" fill="${C.muted}">${esc(sub)}</text>`);
  // finestra dei 12 mesi
  const xa = x(m.from);
  o.push(`<rect x="${xa}" y="${T}" width="${L + PW - xa}" height="${PH}" fill="${C.win}"/>`);
  o.push(`<text x="${xa + 4}" y="${T + PH - 6}" fill="${C.muted}">ultimi 12 mesi (dal ${dIT(m.from)}): qui si contano i volumi</text>`);
  // griglia dei prezzi
  const step = (hi - lo) / 5;
  for (let k = 0; k <= 5; k++) { const p = Math.exp(lo + step * k), mag = 10 ** (Math.floor(Math.log10(p)) - 1), pr = Math.round(p / mag) * mag, yy = y(pr); if (yy < T || yy > T + PH) continue; o.push(`<line x1="${L}" x2="${L + PW}" y1="${yy}" y2="${yy}" stroke="${C.grid}"/><text x="${L + PW - 4}" y="${yy - 3}" text-anchor="end" fill="${C.muted}">${th(pr, dec)}</text>`); }
  for (let yr = new Date(t0).getUTCFullYear() + 1; yr <= new Date(t1).getUTCFullYear(); yr++) { const xx = x(`${yr}-01-01`); o.push(`<line x1="${xx}" x2="${xx}" y1="${T}" y2="${T + PH}" stroke="${C.grid}"/><text x="${xx}" y="${T + PH + 16}" text-anchor="middle" fill="${C.muted}">${yr}</text>`); }
  // value area e POC (dal primo giorno della finestra alla fine)
  const b = v.methods.b.n100;
  o.push(`<rect x="${xa}" y="${y(b.vah)}" width="${L + PW - xa}" height="${y(b.val) - y(b.vah)}" fill="${C.va}"/>`);
  // prezzo
  o.push(`<path d="${idx.map((i, k) => `${k ? 'L' : 'M'}${x(s.dates[i]).toFixed(1)} ${y(s.close[i]).toFixed(1)}`).join('')}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`);
  o.push(`<line x1="${xa}" x2="${L + PW}" y1="${y(b.poc)}" y2="${y(b.poc)}" stroke="${C.poc}" stroke-width="2"/>`);
  let altPoc = null;
  if (alt != null) { altPoc = alt.poc; o.push(`<line x1="${xa}" x2="${L + PW}" y1="${y(altPoc)}" y2="${y(altPoc)}" stroke="${C.alt}" stroke-width="2" stroke-dasharray="6 4"/>`); }
  // profilo dei volumi a destra (b, 100 fasce), larghezza proporzionale alla quota della fascia più piena
  const pr = v.profile100.b, mx = Math.max(...pr), bw = (phi - plo) / pr.length;
  o.push(`<line x1="${R0}" x2="${R0}" y1="${T}" y2="${T + PH}" stroke="${C.grid}"/>`);
  pr.forEach((q, i) => { const a = plo + bw * i, z = a + bw, y1 = y(z), y2 = y(a); o.push(`<rect x="${R0}" y="${y1.toFixed(1)}" width="${((q / mx) * PRW).toFixed(1)}" height="${Math.max(0.5, y2 - y1 - 0.6).toFixed(1)}" fill="${q === mx ? C.poc : C.prof}"/>`); });
  o.push(`<text x="${R0}" y="${T - 8}" fill="${C.muted}">volume per fascia di prezzo</text>`);
  // legenda
  const ly = T + PH + 40, it = [[C.ink, 'solid', `${m.chart}, chiusure`], [C.poc, 'solid', `POC 12 mesi, ${mainLabel}: ${th(b.poc, dec)}`]];
  if (alt != null) it.push([C.alt, 'dash', `${altLabel}: ${th(altPoc, dec)}`]);
  let lx = L;
  for (const [c, k, t] of it) { o.push(`<line x1="${lx}" x2="${lx + 22}" y1="${ly}" y2="${ly}" stroke="${c}" stroke-width="2" ${k === 'dash' ? 'stroke-dasharray="6 4"' : ''}/><text x="${lx + 28}" y="${ly + 4}" fill="${C.ink}">${t}</text>`); lx += 40 + t.length * 6.4; }
  o.push(`<rect x="${L}" y="${ly + 16}" width="22" height="10" fill="${C.va}" stroke="${C.poc}" stroke-opacity="0.3"/><text x="${L + 28}" y="${ly + 25}" fill="${C.ink}">value area 70%: ${th(b.val, dec)}–${th(b.vah, dec)}</text>`);
  o.push(`<text x="${L}" y="${H - 8}" fill="${C.muted}">Prova di ricerca (ricerca/poc), non è l'app. Scala logaritmica. Dati Yahoo fino al ${dIT(end)}. Scarto tra i 15 calcoli del POC: ${th(v.spreadPct, 2)}% (${v.robust ? 'robusto' : 'non robusto'}).</text>`);
  o.push('</svg>');
  fs.writeFileSync(path.join(HERE, file), o.join('\n') + '\n');
  console.log(`${file}: POC ${b.poc}, VA ${b.val}–${b.vah}${altPoc != null ? `, confronto ${altPoc}` : ''}`);
}

const spx = R.SPX.variants;
chart({ file: 'poc_spx.svg', title: 'S&P 500: prezzo e POC degli ultimi 12 mesi', sub: 'Volumi dell\'ETF SPY sulla scala dell\'indice (rapporto delle chiusure di ogni giorno); tratteggio: volumi orari di ES=F', market: 'SPX', main: spx.findIndex((v) => v.vol === 'SPY'), mainLabel: 'volumi SPY', alt: spx.find((v) => v.vol === 'ES=F').methods.c.n100, altLabel: 'POC con i volumi orari di ES=F' });
const au = R.GOLD.variants, g = au.find((v) => v.vol === 'GC=F' && v.scale.startsWith('grafico')).methods.b.n100;
chart({ file: 'poc_oro.svg', title: 'Oro (future GC=F): due zone con quasi lo stesso volume', sub: 'Profilo dei volumi del future, 12 mesi (metodo b, 100 fasce): il secondo picco ha il ' + th(g.secondShare * 100, 0) + '% del volume del primo', market: 'GOLD', main: au.findIndex((v) => v.vol === 'GC=F' && v.scale.startsWith('grafico')), mainLabel: 'volumi GC=F', alt: { poc: g.second }, altLabel: 'secondo picco del profilo' });
