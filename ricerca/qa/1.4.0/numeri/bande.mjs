// Controllo numeri 1.4.0 · bande del pannello del cambio (in calo forte / ha smesso di scendere) e del dollaro favorevole
// nel grafico 3A, riportate a date (x → data con la scala del grafico) e confrontate con gli stati ricalcolati.
// Uso: NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/numeri/bande.mjs [url]
import { createRequire } from 'node:module'; import fs from 'node:fs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://127.0.0.1:8794/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto(URL0 + '#emg', { waitUntil: 'networkidle' }); await p.waitForSelector('#emTable tbody tr');
const out = {};
for (const k of ['NIFTY50', 'IBOV', 'KOSPI200', 'CSI300', 'TWN']) {
  await p.click(`#emTable tr[data-em="${k}"]`); await p.waitForTimeout(200);
  await p.click('#emRange button[data-range="3A"]'); await p.waitForTimeout(200);
  out[k] = await p.evaluate(() => {
    const s = document.getElementById('emChart'), W = s.viewBox.baseVal.width, L = 8, PW = W - 64;
    const last = document.querySelector('#emDMeta').textContent.match(/dati al (\d\d)\/(\d\d)\/(\d{4})/);
    const t1 = Date.parse(`${last[3]}-${last[2]}-${last[1]}`), t0 = t1 - 3 * 365.25 * 864e5;
    const dt = (x) => new Date(t0 + ((x - L) / PW) * (t1 - t0)).toISOString().slice(0, 10);
    const r = (cls) => [...s.querySelectorAll('rect.' + cls)].map((e) => [dt(+e.getAttribute('x')), dt(+e.getAttribute('x') + +e.getAttribute('width'))]);
    return { calo: r('fxcalo'), ferma: r('fxferma'), fav: r('dlfav') };
  });
  console.log(k, 'ferma', JSON.stringify(out[k].ferma.slice(0, 6)), '| calo', JSON.stringify(out[k].calo.slice(0, 4)));
}
fs.writeFileSync(new URL('./bande.json', import.meta.url), JSON.stringify(out, null, 1));
await b.close();
