// Controllo testi 1.6.0, secondo giro: testi della vista 8 come li vede l'utente (riga delle date sotto i riquadri,
// riquadri con title, legenda, scritte delle fasce senza dati, «Come leggere») e la guida #vix. Prova anche la riga
// delle date e il riquadro del credito con varianti di data/vix.json servite dal browser (page.route), senza toccare file:
//   A) file vero; B) asOf.vixSrc = 'Yahoo'; C) senza vixSrc e vix3mSrc (file scritto prima della correzione);
//   D) asOf.fred = asOf.vix (nessuna seduta provvisoria); E) HYG/IEF senza l'ultima seduta.
// Uso: node ricerca/qa/server/gzserve.mjs . 8797 &  poi  NODE_PATH=$(npm root -g) node ricerca/qa/1.6.0/testi2/testi_browser2.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8797/';
const OUT = __dirname;
const REAL = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../data/vix.json'), 'utf8'));
const variants = {
  A: (d) => d,
  B: (d) => { d.asOf.vixSrc = 'Yahoo'; return d; },
  C: (d) => { delete d.asOf.vixSrc; delete d.asOf.vix3mSrc; return d; },
  D: (d) => { d.asOf.fred = d.asOf.vix; d.series.VIX.fred = d.series.VIX.last; return d; },
  E: (d) => { const s = d.series.HYGIEF; s.gaps = s.gaps.slice(0, -1); s.cd = s.cd.slice(0, -1); if (s.last) s.last = null; d.asOf.credit = null; return d; },
};
const grab = () => ({
  meta: document.getElementById('vxMeta').textContent,
  kpis: [...document.querySelectorAll('#vxKpis .kpi')].map((k) => ({ text: k.innerText.replace(/\s+/g, ' ').trim(), title: k.getAttribute('title') })),
  legend: document.getElementById('vxLegend').innerText.replace(/\s+/g, ' '),
  nodata: [...document.querySelectorAll('#vxChart text')].map((t) => t.textContent).filter((t) => / dal /.test(t)),
});
(async () => {
  const b = await chromium.launch();
  const res = {};
  for (const [name, vp] of [['1440', { width: 1440, height: 1000 }], ['390', { width: 390, height: 844 }]]) {
    for (const [v, f] of Object.entries(variants)) {
      if (name === '390' && v !== 'A') continue;
      const p = await b.newPage({ viewport: vp });
      const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
      await p.route(/data\/vix\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(f(JSON.parse(JSON.stringify(REAL)))) }));
      await p.goto(BASE + '#vix', { waitUntil: 'networkidle' });
      await p.waitForSelector('#vxKpis .kpi', { timeout: 20000 });
      await p.waitForTimeout(600);
      const r = await p.evaluate(grab);
      if (v === 'A') {
        r.comeLeggere = await p.evaluate(() => { const h = [...document.querySelectorAll('#v-vix p')].filter((x) => /Struttura a termine\.|Credito high yield\.|Ricalcolo:|^Fonti: VIX/.test(x.textContent)); return h.map((x) => x.textContent.replace(/\s+/g, ' ')); });
        await p.click('#vxRange button[data-range="MAX"]'); await p.waitForTimeout(400);
        r.nodataMax = await p.evaluate(() => [...document.querySelectorAll('#vxChart text')].map((t) => t.textContent).filter((t) => / dal /.test(t)));
        await p.click('#vxRange button[data-range="10A"]'); await p.waitForTimeout(300);
        await p.locator('#vxKpis').scrollIntoViewIfNeeded();
        await p.screenshot({ path: path.join(OUT, `vix-${name}.png`), fullPage: false });
      }
      r.errors = errs;
      res[`${name}_${v}`] = r;
      await p.close();
    }
  }
  const g = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await g.goto(BASE + 'guida.html#vix', { waitUntil: 'networkidle' });
  res.guida = await g.evaluate(() => document.getElementById('vix').innerText);
  res.version = await g.evaluate(async () => (await import('./js/version.js')).NOTES[0]).catch((e) => String(e));
  await b.close();
  fs.writeFileSync(path.join(OUT, 'testi_browser2.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
})();
