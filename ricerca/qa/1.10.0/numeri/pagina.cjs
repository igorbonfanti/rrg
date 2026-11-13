// Legge il pannello «Distanza dal massimo» nella pagina vera (Chromium, 1440 px) e confronta i numeri mostrati con il
// ricalcolo indipendente (ricalcolo.json di verifica_ath.py), formattati all'italiana.
// Uso: python3 -m http.server 8791 --directory <repo> &  NODE_PATH=/opt/node-tools/node_modules node pagina.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const R = JSON.parse(fs.readFileSync(__dirname + '/ricalcolo.json', 'utf-8'));
const it = (x, d) => { const [a, b] = Math.abs(x).toFixed(d).split('.'); return (x < 0 ? '−' : '') + a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b ? ',' + b : ''); };
const pct = (x) => (x > 0 ? '+' : '') + it(x, 2) + '%';
const dI = (d) => d.split('-').reverse().join('/');
const pv = (x) => it(x, Math.abs(x) < 10 ? 3 : 2);
(async () => {
  const b = await chromium.launch(); let ok = 0, ko = 0; const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  await p.goto('http://127.0.0.1:8791/#vix'); await p.waitForSelector('#athTable tr.athr', { timeout: 20000 });
  const ids = await p.$$eval('#athTable tr.athr', (r) => r.map((x) => x.dataset.id));
  for (const id of ids) {
    const s = R[id];
    const row = await p.$eval(`#athTable tr.athr[data-id="${id}"]`, (r) => r.innerText.replace(/\s+/g, ' '));
    await p.click(`#athTable tr.athr[data-id="${id}"]`); await p.waitForTimeout(300);
    const det = await p.$eval('#athTable tr.athdet', (r) => r.innerText.replace(/\s+/g, ' '));
    const want = [pct(s.distPct), dI(s.refDate), dI(s.lastDate), s.cycleLowPct == null ? '—' : pct(s.cycleLowPct)];
    const wantD = [pv(s.last), pv(s.ref), dI(s.from), pv(s.intradayRef), dI(s.intradayRefDate), dI(s.start)]
      .concat(s.cycleLowPct != null ? [pct(s.cycleLowPct), dI(s.cycleLowDate), pct(s.fromLowPct)] : [])
      .concat(s.athDate !== s.refDate ? [pv(s.ath), dI(s.athDate), pct(s.athDistPct)] : []);
    const miss = want.filter((w) => !row.includes(w)).concat(wantD.filter((w) => !det.includes(w)));
    const days = s.days === 0 ? "all'ultima seduta" : `${it(s.days, 0)} giorni fa`;
    if (!row.includes(days)) miss.push(days);
    if (miss.length) { ko++; console.log(`NO ${id}: mancano ${miss.join(' | ')}\n   riga: ${row}\n   dettaglio: ${det}`); } else { ok++; console.log(`OK ${id}: ${row.slice(0, 140)}`); }
    // grafico: titolo e assenza di messaggi di errore
    await p.waitForTimeout(400);
    const miss2 = await p.$eval('#athChartMiss', (e) => (e.hidden ? '' : e.textContent));
    if (miss2) console.log(`   grafico ${id}: ${miss2}`);
    await p.click(`#athTable tr.athr[data-id="${id}"]`); await p.waitForTimeout(150);
  }
  console.log(`pagina: ${ok} mercati coerenti, ${ko} no; errori in console: ${errs.length ? errs.join(' ; ') : 'nessuno'}`);
  await b.close();
})();
