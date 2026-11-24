#!/usr/bin/env node
/*
 * linea-del-tempo.mjs — prototipo (solo ricerca) di una «linea del tempo dei massimi» dei 9 mercati per gli ultimi
 * cali dell'S&P 500: un riquadro per episodio, una riga per mercato, il punto è il massimo di ciclo (seguito da un calo
 * ≥ 20%) più alto entro ±365 giorni, la linea verticale è il massimo dell'S&P 500. Nessun calcolo nuovo: legge
 * ricerca/rotazione-bolle/risultati.json (windows.SPX15 e il calo in corso da windows.SPX10).
 *
 * Uso: node ricerca/rotazione-bolle/script/linea-del-tempo.mjs
 *   Scrive ricerca/rotazione-bolle/linea-del-tempo.svg e linea-del-tempo.html (lo stesso SVG in una pagina con i due
 *   temi); poi, se c'è Playwright: NODE_PATH=$(npm root -g) node ricerca/rotazione-bolle/script/linea-del-tempo.mjs --png
 *   salva linea-del-tempo-chiaro.png e linea-del-tempo-scuro.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = JSON.parse(fs.readFileSync(path.join(BASE, 'risultati.json'), 'utf-8'));
const IDS = Object.keys(R.series);
const L = Object.fromEntries(IDS.map((id) => [id, R.series[id].label]));
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const it = (d) => `${+d.slice(8, 10)} ${MESI[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const pct = (x) => (x == null ? '—' : x.toFixed(1).replace('-', '−').replace('.', ',') + '%');
const sg = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const eps = [...R.windows.SPX15.slice(-4), ...R.windows.SPX10.filter((r) => r.ongoing)];
const W = 1080, padL = 132, padR = 250, rowH = 19, headH = 40, gap = 22;
const plotW = W - padL - padR;
const x = (o) => padL + ((o + 365) / 730) * plotW;
const panelH = headH + IDS.length * rowH + 8;
const H = 76 + eps.length * (panelH + gap) + 40;

let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Linea del tempo dei massimi di ciclo dei 9 mercati intorno agli ultimi cali dell'S&amp;P 500" font-family="system-ui, -apple-system, Segoe UI, sans-serif">
<style>
  .bg{fill:var(--surface,#fcfcfb)} .t1{fill:var(--text-primary,#0b0b0b)} .t2{fill:var(--text-secondary,#52514e)} .t3{fill:var(--text-muted,#7a7974)}
  .grid{stroke:var(--grid,#e6e5e1);stroke-width:1} .zero{stroke:var(--text-secondary,#52514e);stroke-width:1.5}
  .band{fill:var(--band,#efeeea)} .dot{fill:var(--series-1,#2a78d6);stroke:var(--surface,#fcfcfb);stroke-width:2}
  .alt{fill:none;stroke:var(--series-1,#2a78d6);stroke-width:1.5} .ring{fill:var(--surface,#fcfcfb);stroke:var(--series-1,#2a78d6);stroke-width:2}
  .rowline{stroke:var(--grid,#e6e5e1);stroke-width:1;stroke-dasharray:2 3}
</style>
<rect class="bg" width="${W}" height="${H}"/>
<text class="t1" x="16" y="26" font-size="16" font-weight="600">Chi ha fatto il massimo prima, chi insieme, chi dopo l'S&amp;P 500</text>
<text class="t2" x="16" y="45" font-size="12">Mesi dal massimo di chiusura dell'S&amp;P 500 (linea verticale). Punto pieno: il massimo di ciclo più alto del mercato nella finestra di ±12 mesi (seguito da un calo ≥ 20%);</text>
<text class="t2" x="16" y="61" font-size="12">cerchio vuoto: altri massimi seguiti da un calo ≥ 20% nella stessa finestra; fascia grigia: «insieme» (±31 giorni). A destra: data del massimo, giorni di scarto, calo massimo.</text>
`;
let y0 = 76;
for (const ep of eps) {
  const top = y0;
  s += `<g>\n<text class="t1" x="16" y="${top + 16}" font-size="13" font-weight="600">Massimo S&amp;P 500 ${it(ep.peak)} · calo ${pct(ep.ddPct)}${ep.ongoing ? ' (in corso, dati al ' + it(R.series.SPX.to) + ')' : ''}</text>\n`;
  const gy0 = top + headH - 6, gy1 = top + headH + IDS.length * rowH - 4;
  s += `<rect class="band" x="${x(-31)}" y="${gy0}" width="${x(31) - x(-31)}" height="${gy1 - gy0}"/>\n`;
  for (const m of [-12, -9, -6, -3, 3, 6, 9, 12]) {
    const o = Math.round((m * 365) / 12);
    s += `<line class="grid" x1="${x(o)}" x2="${x(o)}" y1="${gy0}" y2="${gy1}"/><text class="t3" x="${x(o)}" y="${gy0 - 3}" font-size="10" text-anchor="middle">${m > 0 ? '+' : '−'}${Math.abs(m)} m</text>\n`;
  }
  s += `<line class="zero" x1="${x(0)}" x2="${x(0)}" y1="${gy0}" y2="${gy1}"/><text class="t2" x="${x(0)}" y="${gy0 - 3}" font-size="10" text-anchor="middle" font-weight="600">0</text>\n`;
  IDS.forEach((id, k) => {
    const cy = top + headH + k * rowH + rowH / 2;
    const m = ep.markets[id];
    s += `<text class="t2" x="${padL - 10}" y="${cy + 4}" font-size="12" text-anchor="end">${esc(L[id])}</text>`;
    s += `<line class="rowline" x1="${padL}" x2="${padL + plotW}" y1="${cy}" y2="${cy}"/>`;
    let note;
    if (m.status === 'nodata') note = 'serie troppo corta';
    else if (m.status === 'none') note = m.alt15 ? `nessun calo ≥ 20% (≥ 15%: ${sg(m.alt15.offset)} g)` : 'nessun calo ≥ 20%';
    else {
      for (const a of (m.all || []).filter((a) => a.offset !== m.offset)) s += `<circle class="alt" cx="${x(a.offset)}" cy="${cy}" r="4"><title>${esc(L[id])}: altro massimo ≥ 20%, ${sg(a.offset)} giorni, calo ${pct(a.ddPct)}</title></circle>`;
      const ongoing = m.status === 'peak' && R.episodes[id][20].some((p) => p.date === m.date && p.ongoing);
      s += `<circle class="dot" cx="${x(m.offset)}" cy="${cy}" r="5.5"><title>${esc(L[id])}: massimo ${it(m.date)}, ${sg(m.offset)} giorni, calo ${pct(m.ddPct)}</title></circle>`;
      note = `${it(m.date)} · ${sg(m.offset)} g · ${m.belowZero ? 'sotto zero il ' + it(R.episodes[id][20].find((p) => p.date === m.date).troughDate) : pct(m.ddPct)}${ongoing ? ' finora' : ''}`;
    }
    if (m.status === 'anchor') note = `${it(m.date)} · ${pct(m.ddPct)}${ep.ongoing ? ' finora' : ''}`;
    s += `<text class="${m.status === 'peak' || m.status === 'anchor' ? 't2' : 't3'}" x="${padL + plotW + 10}" y="${cy + 4}" font-size="11">${esc(note)}</text>\n`;
  });
  s += `</g>\n`;
  y0 += panelH + gap;
}
s += `<text class="t3" x="16" y="${H - 22}" font-size="10.5">Chiusure di Yahoo (solo prezzo; oro, argento, rame e petrolio: future continui; KOSPI in won). Massimo di ciclo: massimo di 52 settimane seguito da un calo ≥ 20% prima di una chiusura più alta.</text>
<text class="t3" x="16" y="${H - 8}" font-size="10.5">«finora»: calo non ancora finito. Fonte dei numeri: ricerca/rotazione-bolle/risultati.json (prototipo di ricerca, non è nell'app).</text>
</svg>
`;
fs.writeFileSync(path.join(BASE, 'linea-del-tempo.svg'), s);

const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Linea del tempo dei massimi</title>
<style>
:root{--surface:#fcfcfb;--text-primary:#0b0b0b;--text-secondary:#52514e;--text-muted:#6f6e69;--grid:#e6e5e1;--band:#efeeea;--series-1:#2a78d6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--surface:#1a1a19;--text-primary:#f0efec;--text-secondary:#c3c2b7;--text-muted:#9a998f;--grid:#33332f;--band:#262624;--series-1:#3987e5}}
:root[data-theme="dark"]{--surface:#1a1a19;--text-primary:#f0efec;--text-secondary:#c3c2b7;--text-muted:#9a998f;--grid:#33332f;--band:#262624;--series-1:#3987e5}
body{margin:0;padding:16px;background:var(--surface)} svg{max-width:100%;height:auto;display:block}
</style></head><body>${s}</body></html>`;
fs.writeFileSync(path.join(BASE, 'linea-del-tempo.html'), html);

if (process.argv.includes('--png')) {
  const require = createRequire(import.meta.url);
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  for (const [name, theme] of [['chiaro', 'light'], ['scuro', 'dark']]) {
    const p = await b.newPage({ viewport: { width: W + 32, height: 800 }, deviceScaleFactor: 2 });
    await p.goto('file://' + path.join(BASE, 'linea-del-tempo.html'));
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(BASE, `linea-del-tempo-${name}.png`), fullPage: true });
    await p.close();
  }
  await b.close();
}
console.log('scritto linea-del-tempo.svg/.html' + (process.argv.includes('--png') ? ' e i PNG' : ''));
