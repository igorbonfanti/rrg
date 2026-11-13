// Prova di impaginazione della barra delle schede con 9 viste (nessuna modifica all'app: la nona scheda e le regole CSS si
// aggiungono solo nella pagina aperta da Playwright). Misura righe, larghezza, testo tagliato e scorrimento orizzontale a
// diverse larghezze, nella barra attuale (8 schede) e in tre varianti a 9 schede:
//   A: CSS di oggi (flex sopra 860 px, griglia di 4 colonne sotto);
//   B: griglia di 5 colonne sotto 860 px (5 + 4) e padding ridotto sopra 860 px fino a 1100 px;
//   C: griglia di 3 colonne sotto 600 px (3 + 3 + 3), 5 colonne tra 601 e 860 px.
// Uso: BASE=http://127.0.0.1:8791/ OUT=cartella NODE_PATH=$(npm root -g) node ricerca/vix/inserimento/schede9.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8791/', OUT = process.env.OUT;
const CSS = {
  A: '',
  B: `@media (min-width: 861px) and (max-width: 1100px) { .fnkeys button { padding-left: 9px; padding-right: 9px; } }
      @media (max-width: 860px) { .fnkeys { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; } }`,
  C: `@media (min-width: 861px) and (max-width: 1100px) { .fnkeys button { padding-left: 9px; padding-right: 9px; } }
      @media (min-width: 601px) and (max-width: 860px) { .fnkeys { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; } }
      @media (max-width: 600px) { .fnkeys { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }`,
};
const WIDTHS = [1440, 1280, 1100, 1024, 960, 900, 861, 860, 820, 768, 601, 600, 414, 390, 375, 360];
(async () => {
  const b = await chromium.launch();
  const rows = [];
  for (const variant of ['oggi', 'A', 'B', 'C']) {
    for (const w of WIDTHS) {
      const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 600, hasTouch: w < 600 });
      await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
      const p = await ctx.newPage();
      await p.goto(BASE + '#mon'); await p.waitForTimeout(1200);
      const r = await p.evaluate(({ variant, css }) => {
        const bar = document.querySelector('.fnkeys');
        if (variant !== 'oggi') {
          // nona scheda: VIX all'8, Alert al 9
          const alr = document.getElementById('tab-alr');
          const vix = alr.cloneNode(true); vix.id = 'tab-vix'; vix.dataset.view = 'vix'; vix.textContent = '8 VIX';
          alr.before(vix); alr.textContent = '9 Alert';
          if (css) { const st = document.createElement('style'); st.textContent = css; document.head.append(st); }
        }
        const btns = [...bar.querySelectorAll('button[data-view]')];
        const tops = new Set(btns.map((x) => Math.round(x.getBoundingClientRect().top)));
        const cut = btns.filter((x) => x.scrollWidth > x.clientWidth + 1 || x.getBoundingClientRect().height > 40).map((x) => x.textContent.trim());
        const right = Math.max(...btns.map((x) => x.getBoundingClientRect().right));
        return { n: btns.length, righe: tops.size, altezza: Math.round(bar.getBoundingClientRect().height), larghezzaSchede: Math.round(right - bar.getBoundingClientRect().left),
          barra: Math.round(bar.clientWidth), scorre: document.documentElement.scrollWidth > window.innerWidth + 1, tagliate_o_a_capo: cut,
          minW: Math.round(Math.min(...btns.map((x) => x.getBoundingClientRect().width))) };
      }, { variant, css: CSS[variant] || '' });
      rows.push({ variant, w, ...r });
      if (OUT && [1440, 1024, 861, 820, 768, 390, 360].includes(w)) {
        fs.mkdirSync(OUT, { recursive: true });
        await p.locator('.fnkeys').screenshot({ path: `${OUT}/schede-${variant}-${w}.png` });
      }
      await ctx.close();
    }
  }
  await b.close();
  for (const r of rows) console.log(`${r.variant.padEnd(4)} ${String(r.w).padStart(4)} px: ${r.n} schede su ${r.righe} righe, barra alta ${r.altezza} px, schede larghe ${r.larghezzaSchede}/${r.barra} px, la più stretta ${r.minW} px${r.scorre ? ', PAGINA CHE SCORRE' : ''}${r.tagliate_o_a_capo.length ? `, a capo o tagliate: ${r.tagliate_o_a_capo.join(', ')}` : ''}`);
  if (OUT) fs.writeFileSync(`${OUT}/schede9.json`, JSON.stringify(rows, null, 1));
})();
