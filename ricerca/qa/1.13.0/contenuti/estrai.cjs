// QA indipendente 1.13.0 (contenuti): legge dalle due versioni (vecchia 1.12.0 e nuova 1.13.0), a parità di dati e di scelte,
// per ogni scenario (vista + scelte):
//  - "blocchi": testo di tabelle, grafici SVG, riquadri dei numeri (kpi), elenchi di fatti, liste (testo + title), per id;
//  - "vis": testo visibile della vista (innerText) e del piè di pagina;
//  - "all": testo di tutta la vista (textContent, anche nascosto), title, aria-label, data-info dei bottoni «i»;
//  - "info": testo di ogni riquadro «i» aperto davvero (clic), con il suo data-guide;
//  - "srcline": riga di fonti, con i link;
//  - "ids": testo di ogni elemento con id che non contiene altri elementi con id.
// Uso: NODE_PATH=$(npm root -g) node estrai.cjs <BASE> <uscita.json>
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2], OUT = process.argv[3];

// scenario: [nome, hash, localStorage extra, azioni]
const SC = [
  ['mon', '#mon', {}, null],
  ['rrg-settori', '#rrg', {}, null],
  ['rrg-settori-prezzi', '#rrg', {}, 'px'],
  ['rrg-mag7', '#rrg', {}, 'group:1'],
  ['rrg-global1', '#rrg', {}, 'group:2'],
  ['rrg-global1-prezzi', '#rrg', {}, 'group:2,px'],
  ['rrg-global2', '#rrg', {}, 'group:3'],
  ['rrg-global5', '#rrg', {}, 'group:6'],
  ['rrg-global6', '#rrg', {}, 'group:7'],
  ['rrg-semplice', '#rrg', {}, 'formula'],
  ['btm', '#btm', {}, null],
  ['sec-XLK', '#XLK', {}, 'details'],
  ['sec-SOXX', '#SOXX', {}, 'details'],
  ['sec-XLRE', '#XLRE', {}, 'details'],
  ['tit-XLK', '#tit-XLK', {}, null],
  ['tit-SOXX', '#tit-SOXX', {}, null],
  ['idx-SPX', '#idx', { ixSel: 'SPX' }, 'details'],
  ['idx-DAX', '#idx', { ixSel: 'DAX' }, 'details'],
  ['idx-KOSPI200', '#idx', { ixSel: 'KOSPI200' }, 'details'],
  ['idx-TSX60', '#idx', { ixSel: 'TSX60' }, 'details'],
  ['emg', '#emg', {}, null],
  ['emg-CSI300', '#emg-CSI300', {}, null],
  ['vix', '#vix', {}, null],
  ['alr', '#alr', {}, null],
  ['ath', '#ath', {}, 'athrow'],
  ['help', '#mon', {}, 'help'],
  ['intro', '#mon', { introSeen: null }, null],
];
const VIEW = (h) => ({ mon: 'v-mon', rrg: 'v-rrg', btm: 'v-btm', XLK: 'v-sec', SOXX: 'v-sec', XLRE: 'v-sec', tit: 'v-tit', idx: 'v-idx', emg: 'v-emg', vix: 'v-vix', alr: 'v-alr', ath: 'v-ath' }[h.replace('#', '').split('-')[0]]);

(async () => {
  const b = await chromium.launch();
  const out = {};
  for (const [name, hash, ls, act] of SC) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', locale: 'it-IT', timezoneId: 'Europe/Rome' });
    const init = { introSeen: true, ...ls };
    await ctx.addInitScript((o) => { for (const [k, v] of Object.entries(o)) { if (v === null) localStorage.removeItem('sm.' + k); else localStorage.setItem('sm.' + k, JSON.stringify(v)); } }, init);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE + 'index.html' + hash, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);
    const vid = act === 'help' ? 'help' : VIEW(hash);
    for (const a of (act || '').split(',').filter(Boolean)) {
      if (a.startsWith('group:')) {
        const i = +a.split(':')[1];
        await p.evaluate((i) => { const s = document.getElementById('groupSel'); s.selectedIndex = i; s.dispatchEvent(new Event('change')); }, i);
        await p.waitForTimeout(2500);
      } else if (a === 'px') { await p.click('#tableSeg button[data-mode="px"]'); await p.waitForTimeout(800); }
      else if (a === 'formula') { await p.click('#formulaSeg button[data-formula="semplice"]'); await p.waitForTimeout(1200); }
      else if (a === 'details') {
        await p.evaluate((v) => document.querySelectorAll(`#${v} details`).forEach((d) => { if (!d.classList.contains('owner')) d.open = true; }), vid);
        await p.waitForTimeout(2500);
      } else if (a === 'athrow') { await p.waitForSelector('#athTable tr.athr', { timeout: 15000 }).catch(() => {}); await p.click('#athTable tr.athr >> nth=0').catch(() => {}); await p.waitForTimeout(2500); }
      else if (a === 'help') { await p.keyboard.press('?'); await p.waitForTimeout(800); }
    }
    const r = await p.evaluate((vid) => {
      const N = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const root = vid === 'help' ? document.getElementById('helpModal') : document.getElementById(vid);
      const blocks = {};
      const key = (el) => { let k = el.id; if (!k) { const par = el.closest('[id]'); k = (par ? par.id : '?') + '>' + el.tagName.toLowerCase() + '.' + [...el.classList].join('.'); } return k; };
      const add = (el) => { let k = key(el), i = 2; while (blocks[k] !== undefined) k = key(el) + '#' + i++; const titles = [...el.querySelectorAll('[title]')].map((x) => x.getAttribute('title')).join(' | '); blocks[k] = { t: N(el.textContent), ti: N(titles) }; };
      if (vid !== 'help') root.querySelectorAll('table, svg, .kpis, dl, .dist, .alist, #activeList, .vxcrises, .pkbody, .pkorder, #frameDate, .meta, .legend').forEach(add);
      const allText = N(root.textContent);
      const attrs = [...root.querySelectorAll('[title],[aria-label],[data-info]')].map((x) => [x.getAttribute('title'), x.getAttribute('aria-label'), x.getAttribute('data-info')].filter(Boolean).join(' ¦ '));
      const infos = [...root.querySelectorAll('button.info')].map((x) => ({ label: x.getAttribute('aria-label'), guide: x.dataset.guide || '', src: x.dataset.src || '', visible: !!(x.offsetWidth || x.offsetHeight) }));
      const src = root.querySelector('.srcline');
      const ids = {}; root.querySelectorAll('[id]').forEach((el) => { if (!el.querySelector('[id]')) ids[el.id] = N(el.textContent); });
      return { ids, vis: root.innerText, all: allText, attrs, blocks, infos,
        srcline: src ? { t: N(src.textContent), links: [...src.querySelectorAll('a')].map((a) => a.getAttribute('href')) } : null,
        footer: N((document.querySelector('footer') || {}).innerText || ''), version: (document.getElementById('ver') || {}).textContent || '' };
    }, vid);
    // apre davvero ogni «i» visibile della vista e ne legge il testo
    r.infoText = [];
    if (vid !== 'help') {
      const n = await p.locator(`#${vid} button.info`).count();
      for (let i = 0; i < n; i++) {
        const btn = p.locator(`#${vid} button.info`).nth(i);
        if (!(await btn.isVisible())) { r.infoText.push(null); continue; }
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click().catch(() => {});
        await p.waitForTimeout(200);
        const t = await p.evaluate(() => { const x = document.getElementById('infopop'); return x && !x.hidden ? { t: x.textContent.replace(/\s+/g, ' ').trim(), g: (x.querySelector('.infopop-g a') || {}).href || '' } : null; });
        r.infoText.push(t);
        await p.keyboard.press('Escape'); await p.waitForTimeout(80);
      }
    }
    r.errs = errs;
    out[name] = r;
    console.log(name, 'blocchi', Object.keys(r.blocks).length, 'info', r.infoText.filter(Boolean).length, 'errori', errs.length);
    await ctx.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  await b.close();
})();
