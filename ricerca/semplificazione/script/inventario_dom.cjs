// Inventario dei testi «di nota» di Sector Monitor, letto dalla pagina disegnata (testi fissi di index.html e testi
// generati da js/*.js), più gli screenshot «prima» a 1440 px, tema scuro.
// Uso: python3 -m http.server 8871 --bind 127.0.0.1   (dalla radice del repository)
//      BASE=http://127.0.0.1:8871/ NODE_PATH=$(npm root -g) node ricerca/semplificazione/script/inventario_dom.cjs
// Scrive ricerca/semplificazione/inventario_grezzo.json e ricerca/semplificazione/prima/*.png (SHOTS=0 senza immagini).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8871/';
const OUT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS !== '0';
fs.mkdirSync(path.join(OUT, 'prima'), { recursive: true });

// che cosa conta come testo «di nota»: note, testi attenuati, letture, legende, righe di stato, riquadri da aprire
const SEL = [
  ['p.note', 'nota'], ['.emread > p', 'lettura'], ['p.muted', 'nota'], ['.legend > span', 'legenda'],
  ['.ph .meta', 'meta'], ['details.fx', 'riquadro'], ['details.owner', 'riquadro'], ['ul.emnotes > li', 'nota'],
  ['.ptf-line', 'nota'], ['.vxcrises + p', 'nota'], ['.how > p', 'lettura'], ['.intro', 'intro'],
];

async function grab(p, view, state) {
  return p.evaluate(({ SEL, view, state }) => {
    const root = view === 'globale' ? document : document.getElementById('v-' + view);
    const roots = view === 'globale' ? [document.querySelector('header.cmdbar'), document.querySelector('footer.statusline'), document.getElementById('helpModal'), document.getElementById('intro'), document.getElementById('filters')] : [root];
    const words = (t) => (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%\/-]*/gu) || []).length;
    const where = (el) => {
      if (el.id) return '#' + el.id;
      let a = el, chain = [];
      while (a && !a.id && a !== document.body) { chain.unshift(a.tagName.toLowerCase() + (a.classList.length ? '.' + [...a.classList].join('.') : '')); a = a.parentElement; }
      return (a && a.id ? '#' + a.id + ' > ' : '') + chain.slice(-2).join(' > ');
    };
    const panelTitle = (el) => { const pn = el.closest('.panel, details.panel, .modal-card'); const h = pn && pn.querySelector('h2, .h2'); return h ? h.textContent.trim().slice(0, 80) : ''; };
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
    const out = [], seen = new Set();
    for (const r of roots) {
      if (!r) continue;
      for (const [s, kind] of SEL) for (const el of r.querySelectorAll(s)) {
        if (seen.has(el)) continue;
        // un elemento dentro un riquadro già preso (details.fx, .intro) non si conta due volte
        if ([...seen].some((x) => x.contains(el))) continue;
        const t = el.textContent.replace(/\s+/g, ' ').trim();
        if (!t) continue;
        seen.add(el);
        out.push({ view, state, kind, sel: where(el), panel: panelTitle(el), visible: vis(el), folded: !!el.closest('details:not([open])') || (el.tagName === 'DETAILS' && !el.open), words: words(t), text: t });
      }
      if (view === 'globale') {
        for (const el of r.querySelectorAll('footer.statusline > span, .help > p, .help li, .help dd')) {
          if (seen.has(el) || [...seen].some((x) => x.contains(el))) continue;
          const t = el.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue; seen.add(el);
          out.push({ view, state, kind: el.closest('.help') ? 'guida rapida' : 'piè di pagina', sel: where(el), panel: panelTitle(el), visible: vis(el), folded: false, words: words(t), text: t });
        }
      }
      // title già presenti (tooltip del browser)
      for (const el of r.querySelectorAll('[title]')) {
        const t = el.getAttribute('title').replace(/\s+/g, ' ').trim();
        if (!t) continue;
        out.push({ view, state, kind: 'title', sel: where(el), tag: el.tagName.toLowerCase(), label: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60), panel: panelTitle(el), visible: vis(el), folded: false, words: words(t), text: t });
      }
      // titoli dei pannelli e intestazioni: punti dove si può agganciare un'icona ⓘ
      for (const el of r.querySelectorAll('.ph h2, .ph .h2, .ph h3, th')) {
        const t = el.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
        out.push({ view, state, kind: el.tagName === 'TH' ? 'intestazione' : 'titolo', sel: where(el), panel: panelTitle(el), visible: vis(el), folded: !!el.closest('details:not([open])'), words: words(t), text: t, hasTitle: el.hasAttribute('title') || !!el.closest('[title]') });
      }
    }
    return out;
  }, { SEL, view, state });
}

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', 'dark'); } } catch {} });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const all = [];
  const shot = async (name) => { if (SHOTS) await p.screenshot({ path: path.join(OUT, 'prima', name + '.png'), fullPage: true }); };
  const go = async (hash, wait) => {
    await p.evaluate((h) => { location.hash = h; }, hash).catch(() => {});
    await p.waitForSelector(wait, { timeout: 30000 }).catch(() => console.log('attesa scaduta', hash, wait));
    await p.waitForTimeout(700);
  };
  await p.goto(BASE + '#mon');
  await p.waitForSelector('#boardTable tbody tr, #boardTable tr', { timeout: 30000 });
  await p.waitForTimeout(800);
  // prima visita: introduzione visibile
  all.push(...await grab(p, 'globale', 'prima visita'));
  all.push(...await grab(p, 'mon', 'prima visita'));
  await shot('1-mon-prima-visita');
  await p.click('#introClose').catch(() => {});
  await p.waitForTimeout(300);
  await shot('1-mon');

  const views = [
    ['rrg', '#rrg', '#rotTable tbody tr'], ['btm', '#btm', '#distList > *'], ['sec', '#XLK', '#secCheck > *'],
    ['tit', '#tit-XLK', '#titPain tbody tr'], ['idx', '#idx', '#ixTable tbody tr'], ['emg', '#emg', '#emTable tbody tr'],
    ['vix', '#vix', '#athTable tbody tr.athr'], ['alr', '#alr', '#alertLog li'],
  ];
  const N = { rrg: 2, btm: 3, sec: 4, tit: 5, idx: 6, emg: 7, vix: 8, alr: 9 };
  for (const [v, h, w] of views) {
    await go(h, w);
    if (v === 'vix') await p.waitForSelector('#vxTable tbody tr', { timeout: 30000 }).catch(() => {});
    if (v === 'idx') await p.waitForSelector('#ixCheck > *', { timeout: 30000 }).catch(() => {});
    await shot(`${N[v]}-${v}`);
    all.push(...await grab(p, v, 'predefinito'));
    if (v === 'sec' || v === 'idx') {
      // riquadri piegati: episodi e cali forti
      for (const id of v === 'sec' ? ['secEpiBox', 'secCap'] : ['ixEpiBox', 'ixCap']) await p.evaluate((id) => { const d = document.getElementById(id); if (d && !d.open) d.querySelector('summary').click(); }, id);
      await p.waitForTimeout(1500);
      await shot(`${N[v]}-${v}-riquadri-aperti`);
      all.push(...(await grab(p, v, 'riquadri aperti')).filter((x) => /Epi|Cap|epi|Cap/.test(x.sel)));
    }
    if (v === 'rrg') {
      for (const g of ['1 · Asset class', '5 · Asset reali']) {
        await p.selectOption('#groupSel', g).catch((e) => console.log('universo', g, e.message));
        await p.waitForTimeout(1500);
        await shot(`2-rrg-${g.startsWith('1') ? 'asset-class' : 'asset-reali'}`);
        all.push(...(await grab(p, v, 'universo ' + g)).filter((x) => /ptf|mx|rrgMeta|rotMeta|provNote|ptfLine|#filters/.test(x.sel) || /ptf|mx|Portafoglio|benchmark/i.test(x.panel)));
      }
      await p.click('#tableSeg button[data-mode="px"]').catch(() => {});
      await p.waitForTimeout(500);
      all.push(...(await grab(p, v, 'tabella prezzi')).filter((x) => x.kind === 'intestazione' || x.kind === 'title' || /pxNote/.test(x.sel)));
      await p.selectOption('#groupSel', 'Settori S&P 500').catch(() => {});
      await p.click('#tableSeg button[data-mode="rot"]').catch(() => {});
    }
    if (v === 'vix') {
      await p.click('#athTable tr.athr').catch(() => {});
      await p.waitForSelector('#athChart .athpx', { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(500);
      await shot('8-vix-bolle-aperto');
      all.push(...(await grab(p, v, 'bolle con grafico')).filter((x) => /ath/.test(x.sel) || /massimo/.test(x.panel)));
    }
  }
  // guida rapida
  await go('#mon', '#boardTable tr');
  await p.click('#helpBtn'); await p.waitForTimeout(400);
  await shot('0-guida-rapida');
  // dedup (stesso elemento in due stati): tengo la prima lettura, segno gli stati
  const key = (x) => x.view + '|' + x.kind + '|' + x.sel + '|' + x.text;
  const m = new Map();
  for (const x of all) { const k = key(x); if (m.has(k)) { const y = m.get(k); if (!y.states.includes(x.state)) y.states.push(x.state); y.visible ||= x.visible; } else m.set(k, { ...x, states: [x.state] }); }
  const res = [...m.values()].map(({ state, ...r }) => r);
  fs.writeFileSync(path.join(OUT, 'inventario_grezzo.json'), JSON.stringify(res, null, 1));
  console.log('voci', res.length, 'errori pagina', errs.length, errs.slice(0, 3));
  await b.close();
})();
