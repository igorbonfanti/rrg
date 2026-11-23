// Parole «di nota» visibili subito in ogni vista, prima (1.12.0) e dopo (1.13.0), con lo stesso metodo sulle due versioni.
// Conta, a 1440 px, le parole (sequenze di lettere e cifre, come conta_parole.cjs) degli elementi di nota visibili senza aprire
// nulla: note, letture, legende (anche quella degli stati del Monitor), righe di stato (.meta), riquadri da aprire (il loro
// titolo), riga di fonti, introduzione del Monitor alla prima visita; a parte il piè di pagina e la guida rapida (tutta, anche se si apre con ?). I riquadri «i» non
// contano: sono chiusi. Non è il conteggio dell'inventario (piano.md, «In breve»), che classificava a mano ogni voce: i due
// numeri non sono confrontabili tra loro, solo prima e dopo di questo script.
// Uso: NODE_PATH=$(npm root -g) node ricerca/semplificazione/script/conta_fase2.cjs http://127.0.0.1:8796/ http://127.0.0.1:8795/
const { chromium } = require('playwright');
const [A, B] = process.argv.slice(2);
const VIEWS = [['1 Monitor', 'mon', '#boardTable tbody tr'], ['2 Rotazione', 'rrg', '#rotTable tbody tr'], ['3 Bottom Map', 'btm', '#bm circle'],
  ['4 Settore (XLK)', 'XLK', '#memTable tbody tr'], ['5 Titoli', 'tit', '#titPain tbody tr'], ['6 Indici', 'idx', '#ixTable tbody tr'],
  ['7 Emergenti', 'emg', '#emTable tbody tr'], ['8 VIX', 'vix', '#vxTable tbody tr'], ['9 Alert', 'alr', '#alertLog li'], ['0 Massimi', 'ath', '#athTable tr.athr']];
const SEL = ['p.note', '.emread > p', 'p.muted', '.legend > span', '.ph .meta', 'details.fx > summary', 'details.owner > summary', 'ul.emnotes > li', '.ptf-line', '.how > p', '.intro', '.srcline', '.vxmeta', '.states > div'];
async function count(base) {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', 'dark'); } } catch {} });
  const p = await c.newPage();
  const words = (root, sel) => p.evaluate(({ root, sel }) => {
    const r = typeof root === 'string' ? document.querySelector(root) : document; const seen = []; let n = 0;
    const w = (t) => (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%\/-]*/gu) || []).length;
    for (const el of r.querySelectorAll(sel.join(','))) {
      if (seen.some((x) => x.contains(el)) || !el.getClientRects().length || el.closest('.info-src, [hidden]')) continue;
      seen.push(el); n += w(el.innerText || '');
    }
    return n;
  }, { root, sel });
  const out = {};
  await p.goto(base + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 }); await p.waitForTimeout(900);
  out['Piè di pagina'] = await words('footer.statusline', ['span']);
  out['Guida rapida (tasto ?)'] = await p.evaluate(() => (document.getElementById('helpModal').textContent.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%\/-]*/gu) || []).length);
  for (const [name, hash, wait] of VIEWS) {
    await p.evaluate((h) => { location.hash = '#' + h; }, hash); await p.waitForSelector(wait, { timeout: 40000, state: 'attached' }).catch(() => {}); await p.waitForTimeout(1200);
    const vid = await p.evaluate(() => document.querySelector('.view:not([hidden])').id);
    out[name] = await words('#' + vid, SEL);
  }
  await b.close();
  return out;
}
(async () => {
  const a = await count(A), bb = await count(B);
  let ta = 0, tb = 0;
  console.log('| Vista | 1.12.0 | 1.13.0 | Variazione |\n|---|---|---|---|');
  for (const k of Object.keys(a)) {
    if (!k.startsWith('Guida')) { ta += a[k]; tb += bb[k]; }
    console.log(`| ${k} | ${a[k]} | ${bb[k]} | ${a[k] ? Math.round((100 * (bb[k] - a[k])) / a[k]) + '%' : '—'} |`);
  }
  console.log(`| **Viste e piè di pagina** | **${ta}** | **${tb}** | **${Math.round((100 * (tb - ta)) / ta)}%** |`);
})();
