import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { placeBox } from '../js/info.js';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('placeBox: sotto il bottone, dentro lo schermo', () => {
  // bottone a sinistra, spazio sotto: 6 px sotto il bordo, 12 px a sinistra del bottone, larghezza massima 360
  assert.deepEqual(placeBox({ left: 100, top: 50, bottom: 66 }, 1440, 900, 120), { left: 88, top: 72, width: 360, above: false });
  // vicino al bordo destro: il riquadro rientra con 12 px di margine
  assert.equal(placeBox({ left: 1420, top: 50, bottom: 66 }, 1440, 900, 120).left, 1440 - 360 - 12);
  // vicino al bordo sinistro: mai sotto 12 px
  assert.equal(placeBox({ left: 2, top: 50, bottom: 66 }, 1440, 900, 120).left, 12);
  // telefono stretto: larghezza = schermo meno 24 px
  const b = placeBox({ left: 300, top: 50, bottom: 66 }, 360, 740, 120);
  assert.equal(b.width, 336); assert.equal(b.left, 12);
});

test('placeBox: sopra il bottone solo se sotto non c\'è posto e sopra sì', () => {
  // in fondo allo schermo, spazio sopra: va sopra
  assert.deepEqual(placeBox({ left: 100, top: 800, bottom: 816 }, 1440, 900, 200), { left: 88, top: 594, width: 360, above: true });
  // in fondo ma senza spazio sopra (riquadro più alto dello schermo): resta sotto
  assert.equal(placeBox({ left: 100, top: 100, bottom: 116 }, 1440, 300, 250).above, false);
  // a metà schermo con spazio sotto: sotto
  assert.equal(placeBox({ left: 100, top: 400, bottom: 416 }, 1440, 900, 300).above, false);
});

// I bottoni «i» sono in index.html e in alcuni js (intestazioni generate): ogni data-src deve avere il suo contenitore
// in index.html e ogni data-guide la sua ancora in guida.html, se no il riquadro sarebbe vuoto o il link rotto.
test('bottoni «i»: contenitori e ancore della guida esistono', () => {
  const html = read('index.html'), guide = read('guida.html');
  const files = ['index.html', ...fs.readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f)];
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const anchors = new Set([...guide.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const src = new Set(), gd = new Set();
  for (const f of files) {
    const t = read(f);
    for (const m of t.matchAll(/data-src="([^"$]+)"/g)) src.add(m[1]);
    for (const m of t.matchAll(/data-guide="([^"$]+)"/g)) gd.add(m[1]);
  }
  assert.ok(gd.size >= 1, `nessun bottone trovato (${src.size} data-src, ${gd.size} data-guide)`);
  for (const s of src) assert.ok(ids.has(s), `data-src="${s}" senza contenitore in index.html`);
  for (const g of gd) assert.ok(anchors.has(g), `data-guide="${g}" senza ancora in guida.html`);
  // i link «Fonti e note» delle righe in fondo alle viste
  for (const m of html.matchAll(/href="guida\.html#([^"]+)"/g)) assert.ok(anchors.has(m[1]), `link a guida.html#${m[1]} senza ancora`);
  // ogni contenitore letto da un «i» è nascosto
  for (const s of src) assert.match(html, new RegExp(`id="${s}"[^>]*\\shidden|hidden[^>]*id="${s}"`), `contenitore ${s} non nascosto`);
});
