// Controllo indipendente 1.12.0 (uso e testi): navigazione tra le 10 schede, barra delle schede, vista 0 (tabella, grafico,
// profilo, zoom, linea del tempo contro ricerca/rotazione-bolle/risultati.json, sovrapposizioni, «i»), vista VIX con il
// rimando, file mancanti, console, scorrimento orizzontale, guida. Dati di oggi (nessuna fixture).
// Uso: BASE=http://127.0.0.1:8811/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/uso-testi/uso.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8811/';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'rotazione-bolle', 'risultati.json')));
let fail = 0, okn = 0; const notes = [];
const ok = (c, m) => { if (!c) { console.log('FAIL ' + m); fail++; } else { okn++; if (process.env.VERBOSE) console.log('OK   ' + m); } };
const info = (m) => { notes.push(m); console.log('INFO ' + m); };
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const sg = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
const p1 = (x) => (x === 0 ? '0,0%' : (x > 0 ? '+' : '−') + Math.abs(x).toFixed(1).replace('.', ',') + '%');
// atteso dalla ricerca: ultimi 4 cali ≥ 15% conclusi (SPX15) e quello in corso (ultima finestra SPX10, ongoing)
const EXP = [...R.windows.SPX15.slice(-4), R.windows.SPX10.at(-1)];
const IDS = ['BTC', 'GOLD', 'SILVER', 'COPPER', 'WTI', 'NDX', 'SPX', 'SOXX', 'KOSPI'];
const VIEWS = ['mon', 'rrg', 'btm', 'sec', 'tit', 'idx', 'emg', 'vix', 'alr', 'ath'];

function expNote(m, narrow, ep, id) {
  const epi = m.date && (R.episodes[id] || {})['20'] ? R.episodes[id]['20'].find((x) => x.date === m.date) : null;
  if (m.status === 'anchor') return `${dIT(m.date)} · ${p1(m.ddPct)}`; // «finora» tolto prima del confronto
  if (m.status === 'nodata') return 'serie troppo corta';
  if (m.status === 'none') return `nessun calo ≥ 20%${m.alt15 ? ` (≥ 15%: ${sg(m.alt15.offset)} g)` : ''}`;
  // calo oltre il 100% (chiusura negativa del petrolio): l'app scrive «sotto zero» (guida #linea-massimi)
  return `${dIT(m.date)} · ${sg(m.offset)} g · ${m.ddPct <= -100 ? (narrow ? 'sotto zero' : 'sotto zero il ' + dIT(epi.troughDate)) : p1(m.ddPct)}`;
}
const overlap = (a, b, pad = 0) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;

(async () => {
  const b = await chromium.launch();
  const mk = async (vw, h, theme, touch, extra = {}) => {
    const c = await b.newContext({ viewport: { width: vw, height: h }, isMobile: !!touch, hasTouch: !!touch, ...extra });
    await c.addInitScript(([t, cvd]) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('antigravity-theme', t); localStorage.setItem('sm.introSeen', 'true'); if (cvd) localStorage.setItem('sm.cvd', 'true'); } } catch {} }, [theme, !!extra.cvd]);
    const p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    return { c, p, errs };
  };
  const tapOrClick = (p, sel, touch) => (touch ? p.tap(sel, { timeout: 8000 }) : p.click(sel, { timeout: 8000 }));
  const hashView = (p) => p.evaluate(() => ({ h: location.hash, vis: [...document.querySelectorAll('section.view')].filter((s) => !s.hidden).map((s) => s.id), sel: (document.querySelector('.fnkeys [aria-selected="true"]') || {}).id }));

  const SIZES = [
    ['1440', 1440, 900, false], ['1280', 1280, 800, false], ['1100', 1100, 800, false], ['861', 861, 800, false],
    ['820', 820, 1180, true], ['390', 390, 844, true], ['360', 360, 780, true],
  ];
  for (const [name0, vw, vh, touch] of SIZES) for (const theme of ['dark', 'light']) {
    const name = `${name0}-${theme === 'dark' ? 'scuro' : 'chiaro'}`;
    const cvd = theme === 'light' && (vw === 1440 || vw === 390);
    const { c, p, errs } = await mk(vw, vh, theme, touch, cvd ? { cvd: true } : {});
    await p.goto(BASE + '#mon'); await p.waitForSelector('#tab-ath', { timeout: 30000 }); await p.waitForTimeout(800);
    if (cvd) ok(await p.evaluate(() => document.documentElement.classList.contains('cvd')), `${name}: CVD attivo`);
    // barra delle schede
    const bar = await p.evaluate(() => { const bar = document.querySelector('.fnkeys'); const bs = [...bar.querySelectorAll('button[data-view]')].filter((x) => !x.hidden); return { n: bs.length, txt: bs.map((x) => x.textContent), rows: [...new Set(bs.map((x) => Math.round(x.getBoundingClientRect().top)))].length, cut: bs.filter((x) => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1).map((x) => x.textContent), wrap: bs.filter((x) => x.getBoundingClientRect().height > 40).map((x) => x.textContent), sw: bar.scrollWidth, cw: bar.clientWidth, out: bs.filter((x) => x.getBoundingClientRect().right > innerWidth + 0.5).map((x) => x.textContent) }; });
    ok(bar.n === 10 && bar.txt.at(-1) === '0 Massimi', `${name}: 10 schede (${bar.txt.join('|')})`);
    ok(!bar.cut.length && bar.sw <= bar.cw && !bar.out.length, `${name}: schede senza testo tagliato né scorrimento (tagliate ${bar.cut}; fuori ${bar.out}; ${bar.sw}/${bar.cw})`);
    ok(vw <= 860 ? bar.rows === 2 : bar.rows === 1, `${name}: righe delle schede ${bar.rows}`);
    if (bar.wrap.length) info(`${name}: schede su due righe di testo: ${bar.wrap.join(', ')}`);
    await p.locator('header').first().screenshot({ path: path.join(OUT, `testata-${name}.png`) }).catch(() => {});
    // navigazione: clic su ogni scheda
    for (const v of VIEWS) {
      await tapOrClick(p, `#tab-${v}`, touch); await p.waitForTimeout(150);
      const s = await hashView(p);
      ok(s.vis.length === 1 && s.vis[0] === 'v-' + v && s.sel === 'tab-' + v && (v === 'sec' || v === 'tit' || v === 'emg' ? true : s.h === '#' + v), `${name}: clic ${v} → ${s.h} ${s.vis}`);
    }
    // Indietro: ripercorre le schede al contrario fino a mon
    for (let k = VIEWS.length - 2; k >= 0; k--) {
      await p.goBack(); await p.waitForTimeout(200);
      const s = await hashView(p);
      ok(s.vis[0] === 'v-' + VIEWS[k], `${name}: Indietro → ${VIEWS[k]} (${s.h} ${s.vis})`);
    }
    if (!touch) {
      // tasti 1-9 e 0
      for (let k = 0; k < 10; k++) {
        await p.locator('body').click({ position: { x: 3, y: vh - 3 } }).catch(() => {});
        const key = k === 9 ? '0' : String(k + 1);
        await p.keyboard.press(key); await p.waitForTimeout(150);
        const s = await hashView(p);
        ok(s.vis[0] === 'v-' + VIEWS[k], `${name}: tasto ${key} → ${s.vis}`);
      }
      // frecce sulle schede: da 9 Alert a destra va a 0 Massimi, poi torna a 1
      await p.focus('#tab-alr'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
      ok((await hashView(p)).vis[0] === 'v-ath', `${name}: freccia destra da Alert → Massimi`);
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
      ok((await hashView(p)).vis[0] === 'v-mon', `${name}: freccia destra da Massimi → Monitor`);
      await p.keyboard.press('End'); await p.waitForTimeout(150);
      ok((await hashView(p)).vis[0] === 'v-ath', `${name}: Fine → Massimi`);
    }
    // comandi
    for (const cmd of ['MASSIMI', 'ath', 'Max', 'BOLLE', 'MASSIMO']) {
      await tapOrClick(p, '#tab-mon', touch); await p.waitForTimeout(100);
      await p.fill('#cmd', cmd); await p.press('#cmd', 'Enter'); await p.waitForTimeout(200);
      ok((await hashView(p)).vis[0] === 'v-ath', `${name}: comando ${cmd}`);
    }
    // vista VIX: niente pannello, rimando
    await tapOrClick(p, '#tab-vix', touch); await p.waitForSelector('#vxKpis .kpi', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(200);
    const vx = await p.evaluate(() => ({ athIn: !!document.querySelector('#v-vix #athPanel, #v-vix #athTable, #v-vix #pkPanel'), moved: (document.getElementById('vxAthMoved') || {}).textContent, firstVisible: (() => { const m = document.getElementById('vxAthMoved'); return m && m.getBoundingClientRect().top < innerHeight; })() }));
    ok(!vx.athIn && /0 Massimi/.test(vx.moved), `${name}: VIX senza il pannello, rimando «${vx.moved}»`);
    if (!vx.firstVisible) info(`${name}: il rimando nel VIX non è visibile senza scorrere`);
    await tapOrClick(p, '#vxAthMoved a', touch); await p.waitForTimeout(300);
    ok((await hashView(p)).vis[0] === 'v-ath', `${name}: il rimando apre Massimi`);
    await p.goBack(); await p.waitForTimeout(300);
    ok((await hashView(p)).vis[0] === 'v-vix', `${name}: Indietro dal rimando torna al VIX`);
    await tapOrClick(p, '#tab-ath', touch);
    await p.waitForSelector('#pkBody .pkep svg .pkdot', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400);
    // tabella
    const rows = await p.$$('#athTable tbody tr.athr[tabindex]');
    ok(rows.length === 9, `${name}: tabella con ${rows.length} righe cliccabili`);
    // grafico al clic su S&P 500
    await tapOrClick(p, '#athTable tr.athr[data-id="SPX"]', touch); await p.waitForTimeout(500);
    const ch = await p.evaluate(() => ({ box: !document.getElementById('athChartBox').hidden, path: !!document.querySelector('#athChart path.athpx'), vp: document.querySelectorAll('#athChart .vpbar').length, title: document.getElementById('athChartTitle').textContent, leg: document.getElementById('athLegend').textContent }));
    ok(ch.box && ch.path && ch.vp > 5, `${name}: grafico SPX aperto (${ch.title}; ${ch.vp} barre del profilo)`);
    // riquadro al passaggio (prezzo e profilo)
    await p.locator('#athChart').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const sb = await p.locator('#athChart').boundingBox();
    if (sb) {
      if (touch) await p.touchscreen.tap(sb.x + sb.width * 0.4, sb.y + sb.height * 0.5); else await p.mouse.move(sb.x + sb.width * 0.4, sb.y + sb.height * 0.5);
      await p.waitForTimeout(200);
      const tip = await p.evaluate(() => { const t = document.getElementById('athTip'); return t.hidden ? '' : t.textContent; });
      ok(/\d{2}\/\d{2}\/\d{4}.*Chiusura/.test(tip), `${name}: riquadro del prezzo «${tip.slice(0, 50)}»`);
      const col = await p.evaluate(() => { const r = document.querySelector('#athChart .vpcol'); if (!r) return null; const b = r.getBoundingClientRect(); const bars = [...document.querySelectorAll('#athChart .vpbar')].map((x) => x.getBoundingClientRect()); const big = bars.sort((a, b2) => b2.width - a.width)[0]; return { x: b.left + 3, y: big.top + big.height / 2 }; });
      if (col) {
        if (touch) await p.touchscreen.tap(col.x, col.y); else await p.mouse.move(col.x, col.y);
        await p.waitForTimeout(200);
        const t2 = await p.evaluate(() => { const t = document.getElementById('athTip'); return t.hidden ? '' : t.textContent; });
        ok(/Volume degli ultimi 12 mesi/.test(t2), `${name}: riquadro del profilo «${t2.slice(0, 60)}»`);
      }
      // zoom: trascinamento (computer) o lente + trascinamento (telefono)
      if (!touch) {
        await p.mouse.move(sb.x + sb.width * 0.3, sb.y + sb.height * 0.5); await p.mouse.down(); await p.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height * 0.5, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
        const z = await p.evaluate(() => ({ chip: !document.getElementById('athZoom').hidden, txt: document.getElementById('athZoom').textContent }));
        ok(z.chip && /Zoom/.test(z.txt), `${name}: zoom «${z.txt.trim().slice(0, 40)}»`);
        await p.keyboard.press('Escape'); await p.waitForTimeout(300);
        ok(await p.evaluate(() => document.getElementById('athZoom').hidden), `${name}: Esc toglie lo zoom`);
      } else {
        const lens = await p.locator('#athLens').isVisible();
        ok(lens, `${name}: lente visibile`);
      }
    }
    for (const r of ['3A', 'MAX', '10A']) { await tapOrClick(p, `#athRange button[data-range="${r}"]`, touch); await p.waitForTimeout(200); ok(await p.evaluate((r) => document.querySelector(`#athRange button[data-range="${r}"]`).getAttribute('aria-pressed') === 'true' && !!document.querySelector('#athChart path.athpx'), r), `${name}: periodo ${r}`); }
    await p.locator('#athPanel').screenshot({ path: path.join(OUT, `pannello-${name}${cvd ? '-cvd' : ''}.png`) }).catch(() => {});
    // chiudi la riga
    await tapOrClick(p, '#athTable tr.athr[data-id="SPX"]', touch); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('athChartBox').hidden), `${name}: secondo clic chiude il grafico`);
    // linea del tempo contro risultati.json
    const got = await p.evaluate(() => [...document.querySelectorAll('#pkBody .pkep')].map((box) => {
      const svg = box.querySelector('svg'), vb = svg.viewBox.baseVal, sr = svg.getBoundingClientRect();
      const bb = (e) => { const r = e.getBBox(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      return { peak: box.dataset.peak, h3: box.querySelector('h3').textContent, narrow: svg.classList.contains('nar'), W: vb.width, scale: sr.width / vb.width, x0: +svg.dataset.x0, x1: +svg.dataset.x1,
        texts: [...svg.querySelectorAll('text')].map((t) => ({ cls: t.getAttribute('class'), id: t.dataset.id || '', t: t.textContent, ...bb(t) })),
        dots: [...svg.querySelectorAll('circle')].map((q) => ({ cls: q.getAttribute('class'), id: q.dataset.id, o: +q.dataset.o, ...bb(q), title: (q.querySelector('title') || {}).textContent })),
        band: (() => { const r = svg.querySelector('rect.pkband'); return r ? bb(r) : null; })(),
        fs: parseFloat(getComputedStyle(svg.querySelector('text.pknote')).fontSize) };
    }));
    ok(got.length === 5 && JSON.stringify(got.map((g) => g.peak)) === JSON.stringify(EXP.map((e) => e.peak)), `${name}: episodi ${got.map((g) => g.peak)} (attesi ${EXP.map((e) => e.peak)})`);
    const bad = [], ov = []; let nChecked = 0;
    got.forEach((g, k) => {
      const e = EXP[k]; if (!e) return;
      const wantH = `Massimo S&P 500 ${dIT(e.peak)} · calo ${p1(e.ddPct)}${e.ongoing ? ' in corso' : ''}`;
      if (g.h3 !== wantH) bad.push(`titolo «${g.h3}» ≠ «${wantH}»`);
      const xo = (o) => g.x0 + ((o + 365) / 730) * (g.x1 - g.x0);
      if (!g.band || Math.abs(g.band.x - xo(-31)) > 0.6 || Math.abs(g.band.x + g.band.w - xo(31)) > 0.6) bad.push(`${e.peak}: fascia insieme fuori posto`);
      for (const id of IDS) {
        const m = e.markets[id]; nChecked++;
        const note = g.texts.find((t) => t.cls.includes('pknote') && t.id === id);
        let w = expNote(m, g.narrow, e, id);
        if (!note) { bad.push(`${e.peak} ${id}: nessun testo`); continue; }
        // «finora» e «sotto zero» si controllano a parte (la ricerca non scrive se il calo è finito)
        const t = note.t.replace(/ finora$/, '');
        if (m.status === 'peak' && m.ddPct == null) w = w.replace(/ · [^·]+$/, '');
        if (!(t === w || (m.status === 'peak' && m.ddPct == null && t.startsWith(w)))) bad.push(`${e.peak} ${id}: «${note.t}» ≠ «${w}»`);
        if (/finora/.test(note.t) && !e.ongoing && m.status === 'anchor') bad.push(`${e.peak} ${id}: finora su un calo concluso`);
        const main = g.dots.filter((d) => d.id === id && d.cls.includes('pkdot'));
        const alts = g.dots.filter((d) => d.id === id && d.cls.includes('pkalt')).map((d) => d.o).sort((a, b2) => a - b2);
        const wantMain = m.status === 'peak' || m.status === 'anchor' ? [m.offset] : [];
        const wantAlts = m.status === 'peak' ? (m.all || []).map((a) => a.offset).filter((o) => o !== m.offset).sort((a, b2) => a - b2) : [];
        if (JSON.stringify(main.map((d) => d.o)) !== JSON.stringify(wantMain)) bad.push(`${e.peak} ${id}: punto ${main.map((d) => d.o)} ≠ ${wantMain}`);
        if (JSON.stringify(alts) !== JSON.stringify(wantAlts)) bad.push(`${e.peak} ${id}: cerchi ${alts} ≠ ${wantAlts}`);
        for (const d of g.dots.filter((q) => q.id === id)) { const cx = d.x + d.w / 2; if (Math.abs(cx - xo(d.o)) > 0.6) bad.push(`${e.peak} ${id}: cerchio a x=${cx.toFixed(1)} invece di ${xo(d.o).toFixed(1)}`); if (d.x < -0.5 || d.x + d.w > g.W + 0.5) bad.push(`${e.peak} ${id}: cerchio tagliato`); }
        if (note.x < -0.5 || note.x + note.w > g.W + 0.5) bad.push(`${e.peak} ${id}: testo fuori dal grafico`);
      }
      // sovrapposizioni: testi tra loro, testi con punti e cerchi
      const T = g.texts.filter((t) => t.w > 0);
      for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) if (overlap(T[i], T[j], 0.5)) ov.push(`${e.peak}: «${T[i].t}» / «${T[j].t}»`);
      for (const t of T) for (const d of g.dots) if (overlap(t, d, 0.5)) ov.push(`${e.peak}: «${t.t}» / cerchio ${d.id} ${d.o}`);
      // cerchi dello stesso mercato che si coprono (centri a meno di 4 px)
      for (const id of IDS) { const ds = g.dots.filter((d) => d.id === id).map((d) => d.x + d.w / 2).sort((a, b2) => a - b2); for (let i = 1; i < ds.length; i++) if ((ds[i] - ds[i - 1]) * g.scale < 4) ov.push(`${e.peak} ${id}: due cerchi quasi sovrapposti`); }
      const px = g.fs * g.scale;
      if (px < 10) info(`${name} ${e.peak}: testo accanto alle righe a ${px.toFixed(1)} px sullo schermo`);
    });
    ok(nChecked === 45 && !bad.length, `${name}: linea del tempo = risultati.json (${nChecked} righe) ${bad.slice(0, 5).join(' | ')}${bad.length > 5 ? ` (+${bad.length - 5})` : ''}`);
    ok(!ov.length, `${name}: nessuna sovrapposizione nella linea del tempo ${ov.slice(0, 4).join(' | ')}${ov.length > 4 ? ` (+${ov.length - 4})` : ''}`);
    // «finora» solo dove il calo non è finito: nella finestra in corso l'S&P 500
    const last = got.at(-1);
    if (last) ok(/finora/.test((last.texts.find((t) => t.id === 'SPX' && t.cls.includes('pknote')) || {}).t || ''), `${name}: S&P 500 «finora» nel calo in corso`);
    // ordine tipico
    const ord = await p.evaluate(() => ({ items: [...document.querySelectorAll('#pkOrder .pkord')].map((s) => s.textContent), txt: document.getElementById('pkOrder').textContent, h: document.getElementById('pkOrder').getBoundingClientRect().height }));
    const lab = { BTC: 'Bitcoin', GOLD: 'Oro', SILVER: 'Argento', COPPER: 'Rame', WTI: 'Petrolio WTI', NDX: 'Nasdaq-100', SPX: 'S&P 500', SOXX: 'Semiconduttori', KOSPI: 'KOSPI (Corea)' };
    const wantOrd = Object.entries(R.order.SPX15).sort((a, b2) => a[1].meanRankNorm - b2[1].meanRankNorm).map(([id, o]) => `${lab[id]} ${o.meanRankNorm.toFixed(2).replace('.', ',')}`);
    ok(JSON.stringify(ord.items) === JSON.stringify(wantOrd), `${name}: ordine tipico = risultati.json (${ord.items.join(' · ')})`);
    if (vw >= 1280 && theme === 'dark') info(`${name}: riga «ordine tipico» alta ${Math.round(ord.h)} px: «${ord.txt.slice(0, 90)}…»`);
    if (vw <= 390 && theme === 'dark') info(`${name}: riga «ordine tipico» alta ${Math.round(ord.h)} px`);
    // «i»
    const ih = await p.evaluate(() => { const i = document.querySelector('#pkPanel .ihint'); const r = i.getBoundingClientRect(); return { title: i.title, w: r.width, h: r.height }; });
    ok(/Solo descrizione/.test(ih.title), `${name}: «i» con il motivo`);
    if (touch) {
      await p.tap('#pkPanel .ihint'); await p.waitForTimeout(200);
      const tt = await p.evaluate(() => { const t = document.querySelector('.taptip'); return t && !t.hidden ? t.textContent : ''; });
      ok(/Solo descrizione/.test(tt), `${name}: «i» al tocco «${tt.slice(0, 40)}»`);
      await p.screenshot({ path: path.join(OUT, `i-tocco-${name}.png`) });
      await p.tap('#pkOrder .pkord'); await p.waitForTimeout(200);
      const t2 = await p.evaluate(() => { const t = document.querySelector('.taptip'); return t && !t.hidden ? t.textContent : ''; });
      ok(/rango medio/.test(t2), `${name}: voce dell'ordine tipico al tocco «${t2.slice(0, 40)}»`);
      // un cerchio della linea del tempo al tocco: c'è un riquadro?
      const dot = await p.locator('#pkBody .pkep svg circle.pkalt').first().boundingBox();
      if (dot) { await p.touchscreen.tap(dot.x + dot.width / 2, dot.y + dot.height / 2); await p.waitForTimeout(200); const t3 = await p.evaluate(() => { const t = document.querySelector('.taptip'); return t && !t.hidden ? t.textContent : ''; }); if (!t3) info(`${name}: al tocco su un cerchio vuoto non compare nulla (i numeri sono solo nel <title>, visibile col mouse)`); }
      if (ih.w < 24) info(`${name}: la «i» è ${Math.round(ih.w)}×${Math.round(ih.h)} px (area di tocco allargata solo con ::after)`);
    } else {
      await p.hover('#pkPanel .ihint'); await p.waitForTimeout(100);
      await p.focus('#pkPanel .ihint');
      ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('ihint')), `${name}: «i» raggiungibile con Tab`);
    }
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    ok(sw[0] <= sw[1], `${name}: nessuno scorrimento orizzontale (${sw})`);
    await p.locator('#pkPanel').screenshot({ path: path.join(OUT, `linea-${name}${cvd ? '-cvd' : ''}.png`) });
    if (vw === 1440 || vw === 390 || vw === 820) await p.screenshot({ path: path.join(OUT, `vista0-${name}.png`), fullPage: true });
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }

  // larghezze intermedie: telefono orizzontale e finestra stretta (la linea del tempo cambia impaginazione a 640 px di grafico)
  for (const [vw, vh, touch] of [[740, 360, true], [660, 900, false], [700, 900, false], [600, 900, false], [601, 900, false]]) {
    const name = `${vw}x${vh}`;
    const { c, p, errs } = await mk(vw, vh, 'dark', touch);
    await p.goto(BASE + '#ath'); await p.waitForSelector('#pkBody .pkep svg .pkdot', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400);
    const st = await p.evaluate(() => { const bar = document.querySelector('.fnkeys'); const bs = [...bar.querySelectorAll('button[data-view]')]; const svg = document.querySelector('#pkBody svg'); const vb = svg.viewBox.baseVal; const notes = [...svg.querySelectorAll('text.pknote')].map((t) => t.getBBox()); return { rows: [...new Set(bs.map((x) => Math.round(x.getBoundingClientRect().top)))].length, cut: bs.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, nar: svg.classList.contains('nar'), W: vb.width, out: notes.filter((r) => r.x + r.width > vb.width + 0.5).length, PW: +svg.dataset.x1 - +svg.dataset.x0 }; });
    ok(!st.cut.length && st.sw <= st.cw && st.out === 0, `${name}: schede (${st.rows} righe) e linea del tempo (stretta ${st.nar}, larghezza del tempo ${Math.round(st.PW)} px) senza tagli né scorrimento`);
    if (!st.nar && st.PW < 260) info(`${name}: linea del tempo in formato largo con solo ${Math.round(st.PW)} px per 24 mesi (testi a destra occupano 315 px)`);
    await p.locator('#pkPanel').screenshot({ path: path.join(OUT, `linea-${name}.png`) });
    // rotazione: da orizzontale a verticale si ridisegna
    if (touch) { await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(700); const n2 = await p.evaluate(() => document.querySelector('#pkBody svg').classList.contains('nar')); ok(n2, `${name}: dopo la rotazione a 360 la linea del tempo passa al formato del telefono`); const sw2 = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); ok(sw2, `${name}: dopo la rotazione nessuno scorrimento`); }
    ok(!errs.length, `${name}: console ${errs.join(' | ')}`);
    await c.close();
  }

  // file mancanti: uno alla volta e tutti e due, computer e telefono
  for (const [miss, vw, touch] of [['ath', 1280, false], ['ath_history', 1280, false], ['both', 1280, false], ['ath', 390, true], ['ath_history', 390, true], ['both', 390, true]]) {
    const name = `senza ${miss} ${vw}`;
    const { c, p, errs } = await mk(vw, 900, 'dark', touch);
    const pats = miss === 'both' ? ['ath', 'ath_history'] : [miss];
    for (const m of pats) await c.route(new RegExp(`/data/${m}\\.json`), (r) => r.fulfill({ status: 404, body: 'not found' }));
    await p.goto(BASE + '#ath'); await p.waitForTimeout(3000);
    const st = await p.evaluate(() => { const t = (id) => { const e = document.getElementById(id); return e && !e.hidden ? e.textContent : ''; }; return { am: t('athMiss'), pk: t('pkMiss'), eps: document.querySelectorAll('#pkBody .pkep').length, rows: document.querySelectorAll('#athTable tr.athr').length, load: t('athLoading'), labs: [...document.querySelectorAll('#pkBody .pkep:first-child text.pklab')].map((x) => x.textContent), ord: [...document.querySelectorAll('#pkOrder .pkord')].map((x) => x.textContent), sw: document.documentElement.scrollWidth <= document.documentElement.clientWidth }; });
    if (miss !== 'ath_history') ok(/non disponibili/.test(st.am) && st.rows === 0, `${name}: tabella «${st.am.slice(0, 60)}»`);
    else ok(st.rows === 9, `${name}: tabella con ${st.rows} righe`);
    if (miss !== 'ath') ok(/non disponibile/.test(st.pk) && st.eps === 0, `${name}: linea del tempo «${st.pk.slice(0, 60)}»`);
    else { ok(st.eps === 5, `${name}: linea del tempo con ${st.eps} episodi`); if (st.labs.some((l) => /^[A-Z]{3,}$/.test(l))) info(`${name}: senza data/ath.json la linea del tempo usa gli identificativi come nomi: ${st.labs.join(', ')}; ordine tipico: ${st.ord.join(' · ')}`); }
    ok(!st.load, `${name}: nessun «Caricamento» rimasto`);
    ok(st.sw, `${name}: nessuno scorrimento orizzontale`);
    if (miss === 'ath_history') { await p.click('#athTable tr.athr[data-id="SPX"]').catch(() => {}); await p.waitForTimeout(300); const cm = await p.evaluate(() => { const e = document.getElementById('athChartMiss'); return e && !e.hidden ? e.textContent : ''; }); ok(/non disponibile/.test(cm), `${name}: grafico «${cm.slice(0, 60)}»`); }
    await p.screenshot({ path: path.join(OUT, `mancanti-${miss}-${vw}.png`), fullPage: false });
    const real = errs.filter((x) => !/404|Failed to load resource/.test(x));
    ok(!real.length, `${name}: nessun errore JS ${real.join(' | ')}`);
    if (errs.length - real.length) info(`${name}: in console ${errs.length - real.length} righe di risorsa 404 (atteso dal test)`);
    await c.close();
  }

  // apertura diretta #ath, poi Indietro fuori dall'app non rompe nulla; #ATH maiuscolo
  for (const h of ['#ath', '#ATH']) {
    const { c, p, errs } = await mk(1280, 800, 'dark', false);
    await p.goto(BASE + h); await p.waitForSelector('#pkBody .pkep', { timeout: 30000 }).catch(() => {});
    ok((await hashView(p)).vis[0] === 'v-ath', `indirizzo ${h} apre Massimi`);
    ok(!errs.length, `indirizzo ${h}: console ${errs.join(' | ')}`);
    await c.close();
  }

  // guida: sezione, ancore, scorrimento orizzontale a 390 e 360, link «Come si legge»
  for (const [vw, touch] of [[1440, false], [390, true], [360, true]]) {
    const { c, p, errs } = await mk(vw, 850, 'light', touch);
    for (const a of ['ath', 'massimi', 'profilo-volumi', 'linea-massimi']) {
      await p.goto(BASE + 'guida.html#' + a); await p.waitForTimeout(400);
      const st = await p.evaluate((a) => { const e = document.getElementById(a); return { has: !!e, top: e ? e.getBoundingClientRect().top : null, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; }, a);
      ok(st.has && st.top < 200 && st.sw <= st.cw, `guida ${vw} #${a}: c'è, in alto (${Math.round(st.top)}), nessuno scorrimento (${st.sw}/${st.cw})`);
    }
    await p.goto(BASE + 'guida.html#linea-massimi'); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `guida-linea-${vw}.png`) });
    const toc = await p.evaluate(() => [...document.querySelectorAll('a[href="#ath"], a[href="#linea-massimi"]')].length);
    ok(toc >= 2, `guida ${vw}: indice con #ath e #linea-massimi (${toc})`);
    ok(!errs.length, `guida ${vw}: console ${errs.join(' | ')}`);
    await c.close();
  }
  // link «Come si legge ↗» della legenda
  { const { c, p } = await mk(1280, 800, 'dark', false);
    await p.goto(BASE + '#ath'); await p.waitForSelector('#pkLegend a', { timeout: 30000 });
    const [g] = await Promise.all([c.waitForEvent('page'), p.click('#pkLegend a')]);
    await g.waitForLoadState(); await g.waitForTimeout(300);
    ok(/guida\.html#linea-massimi$/.test(g.url()) && await g.evaluate(() => document.getElementById('linea-massimi').getBoundingClientRect().top < 200), `legenda: «Come si legge» apre la guida alla linea del tempo (${g.url()})`);
    // guida rapida dalla vista 0 → link alla sezione #ath
    await p.bringToFront(); await p.locator('body').click({ position: { x: 3, y: 790 } }); await p.keyboard.press('?'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('guideLink').getAttribute('href') === 'guida.html#ath'), 'guida rapida: link alla sezione #ath');
    await c.close(); }

  await b.close();
  console.log(`${okn} OK, ${fail} FAIL`);
  fs.writeFileSync(path.join(__dirname, 'uso-info.txt'), notes.join('\n') + '\n');
  process.exit(fail ? 1 : 0);
})();
