// Controllo indipendente 1.12.0: la linea del tempo che la PAGINA mostra (#ath) contro il ricalcolo Python (file.json,
// da ricalcolo.py su data/ath_history.json). Testo di ogni riga, titolo di ogni episodio, posizione dei punti pieni e dei
// cerchi vuoti, ordine tipico contro risultati.json. Uso:
// BASE=http://127.0.0.1:8817/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/numeri-codice/pagina.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8817/';
const M = JSON.parse(fs.readFileSync(path.join(__dirname, process.env.EXP || 'file.json')));
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'rotazione-bolle', 'risultati.json')));
const LAB = { BTC: 'Bitcoin', GOLD: 'Oro', SILVER: 'Argento', COPPER: 'Rame', WTI: 'Petrolio WTI', NDX: 'Nasdaq-100', SPX: 'S&P 500', SOXX: 'Semiconduttori', KOSPI: 'KOSPI (Corea)' };
const d = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const sgn = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
const pc = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1).replace('.', ',') + '%';
let fail = 0, n = 0;
const chk = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } };
function expect(m, ep, narrow) {
  if (m.status === 'anchor') return `${d(m.date)} · ${m.ddPct == null ? 'al massimo' : pc(m.ddPct)}${ep.ongoing && m.ddPct != null ? ' finora' : ''}`;
  if (m.status === 'nodata') return 'serie troppo corta';
  if (m.status === 'none') return 'nessun calo ≥ 20%' + (m.alt15 != null ? ` (≥ 15%: ${sgn(m.alt15)} g)` : '');
  return `${d(m.date)} · ${sgn(m.offset)} g · ${m.belowZero ? (narrow ? 'sotto zero' : 'sotto zero il ' + d(m.trough)) : pc(m.ddPct)}${m.ongoing ? ' finora' : ''}`;
}
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE + '#ath'); await p.waitForSelector('#pkBody .pkep svg .pkdot', { timeout: 30000 });
    const got = await p.evaluate(() => [...document.querySelectorAll('#pkBody .pkep')].map((box) => {
      const svg = box.querySelector('svg'), x0 = +svg.dataset.x0, x1 = +svg.dataset.x1;
      const off = (cx) => Math.round(((cx - x0) / (x1 - x0)) * 730 - 365);
      const rows = {};
      svg.querySelectorAll('.pknote').forEach((t) => { rows[t.dataset.id] = { note: t.textContent, dots: [], alts: [] }; });
      svg.querySelectorAll('.pkdot').forEach((c) => rows[c.dataset.id].dots.push(off(+c.getAttribute('cx'))));
      svg.querySelectorAll('.pkalt').forEach((c) => rows[c.dataset.id].alts.push(off(+c.getAttribute('cx'))));
      return { peak: box.dataset.peak, h3: box.querySelector('h3').textContent, rows, labels: [...svg.querySelectorAll('.pklab')].map((t) => t.textContent) };
    }));
    const meta = await p.textContent('#pkMeta'), order = await p.textContent('#pkOrder');
    chk(got.length === M.episodes.length, `${w}: episodi ${got.length} vs ${M.episodes.length}`);
    chk(meta.includes(`chiusure al ${d(M.asOf)}`) && meta.includes(`ultimi ${M.episodes.filter((e) => !e.ongoing).length} cali`), `${w}: meta «${meta}»`);
    M.episodes.forEach((ep, k) => {
      const g = got[k]; if (!g) return;
      chk(g.peak === ep.peak, `${w} episodio ${k}: ${g.peak} vs ${ep.peak}`);
      const h3 = `Massimo S&P 500 ${d(ep.peak)} · calo ${pc(ep.ddPct)}${ep.ongoing ? ' in corso' : ''}`;
      chk(g.h3.replace(/\s+/g, ' ').trim() === h3, `${w} ${ep.peak} titolo «${g.h3}» vs «${h3}»`);
      for (const [id, m] of Object.entries(ep.markets)) {
        const r = g.rows[id]; if (!r) { chk(false, `${w} ${ep.peak} ${id}: riga mancante`); continue; }
        chk(r.note === expect(m, ep, w < 640), `${w} ${ep.peak} ${id}: «${r.note}» vs «${expect(m, ep, w < 640)}»`);
        const dots = m.status === 'peak' || m.status === 'anchor' ? [m.offset] : [];
        chk(JSON.stringify(r.dots) === JSON.stringify(dots), `${w} ${ep.peak} ${id}: punto ${r.dots} vs ${dots}`);
        const alts = m.status === 'peak' ? [...m.others].sort((a, b) => a - b) : [];
        chk(JSON.stringify([...r.alts].sort((a, b) => a - b)) === JSON.stringify(alts), `${w} ${ep.peak} ${id}: cerchi ${r.alts} vs ${alts}`);
      }
    });
    // ordine tipico: valori e ordine contro risultati.json (order.SPX15)
    const O = R.order && R.order.SPX15;
    if (O) {
      const ids = Object.keys(O).sort((a, b) => O[a].meanRankNorm - O[b].meanRankNorm);
      const txt = ids.map((id) => `${LAB[id]} ${O[id].meanRankNorm.toFixed(2).replace('.', ',')}`).join(' · ');
      chk(order.includes(txt), `${w}: ordine tipico «${order}» vs «${txt}»`);
    } else chk(false, 'risultati.json senza order.SPX15');
    chk(errs.length === 0, `${w}: console ${errs.join(' | ')}`);
    await p.close();
  }
  await b.close();
  console.log(`controlli: ${n}, falliti: ${fail}`);
  process.exit(fail ? 1 : 0);
})();
