// B. Vista 8 su computer: riquadri e tabellone contro il ricalcolo e contro la vista 6, quadrante della forza relativa
// (posizioni, scia, etichette), legenda, contrasto, barra delle schede, tasti, comandi, Indietro, ricarica.
// Uso: W=1440 THEME=light node b-computer.cjs
const fs = require('fs');
const { chromium, SHOTS, openPage, waitEmg, parse, over, contrast } = require('./lib.cjs');
const ATT = JSON.parse(fs.readFileSync(__dirname + '/atteso.json', 'utf8'));
const fmt = (v, d = 1) => (v == null ? '—' : (v < 0 && Math.abs(v).toFixed(d) !== (0).toFixed(d) ? '−' : '') + Math.abs(v).toFixed(d).replace('.', ','));
const sgnP = (v, d = 1) => (v == null ? '—' : (Math.abs(v).toFixed(d) === (0).toFixed(d) ? '' : v > 0 ? '+' : '−') + fmt(Math.abs(v), d) + '%');
const dIT = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const W = +(process.env.W || 1440), THEME = process.env.THEME || 'light';
const out = { problemi: [], controlli: 0, note: [] };
const bad = (m) => { out.problemi.push(m); console.log('PROBLEMA', m); };
const ok = (c, m) => { out.controlli++; if (!c) bad(m); return c; };
(async () => {
  const browser = await chromium.launch();
  const { page, errs } = await openPage(browser, { width: W, theme: THEME });
  await waitEmg(page);
  await page.screenshot({ path: `${SHOTS}b-${W}-${THEME}-pagina.png`, fullPage: true });
  // 1. riquadri
  const kpis = await page.$$eval('#emKpis .kpi', (a) => a.map((e) => ({ k: e.querySelector('.k').innerText, v: e.querySelector('.v').innerText, s: e.querySelector('.s').innerText, t: e.title })));
  out.kpis = kpis;
  const dl = ATT.dollaro;
  ok(kpis[0].v === fmt(dl.valore, 1), `riquadro dollaro: ${kpis[0].v} invece di ${fmt(dl.valore, 1)}`);
  const sExp = `${dl.valore > dl.sma ? 'sopra la media 200' : 'sotto la media 200'} · ${sgnP(dl.ch63)} in 3 mesi · ${dl.D ? 'favorevole' : 'non favorevole'} · FRED al ${dIT(dl.data)}`;
  ok(kpis[0].s === sExp, `riquadro dollaro: «${kpis[0].s}» invece di «${sExp}»`);
  const fxK = Object.entries(ATT.indici).filter(([k, o]) => o.fx && k !== 'HSI');
  const calo = fxK.filter(([, o]) => o.fx.stato === 'calo').map(([k]) => k), ferma = fxK.filter(([, o]) => o.fx.stato === 'ferma').map(([k]) => k);
  ok(kpis[3].v.replace(/\s+/g, ' ') === `${calo.length} / ${fxK.length} con dati` && kpis[3].s === (calo.join(' · ') || 'nessuno'), `riquadro valute in calo: ${kpis[3].v} ${kpis[3].s} invece di ${calo}`);
  ok(kpis[4].v.replace(/\s+/g, ' ') === `${ferma.length} / ${fxK.length} con dati` && kpis[4].s === (ferma.join(' · ') || 'nessuno'), `riquadro valute ferme: ${kpis[4].v} ${kpis[4].s} invece di ${ferma}`);
  // 2. tabellone
  const rows = await page.$$eval('#emTable tbody tr[data-em]', (a) => a.map((tr) => {
    const c = (s) => tr.querySelector(s); return { k: tr.dataset.em, state: c('.c-state').innerText.trim(), br: c('.c-br .cellv').innerText.trim(), blue: c('.c-blue').innerText.trim(), blueTitle: c('.c-blue').title, dd: c('.c-dd').innerText.trim(),
      fx: c('.c-fx').innerText.trim(), fxTitle: (c('.c-fx .zbar') || c('.c-fx span') || {}).title || '', m3: c('.c-m3').innerText.trim(), m3u: c('.c-m3u').innerText.trim(), m3uTitle: c('.c-m3u').title, rs: c('.c-rs').innerText.trim(), rsTitle: c('.c-rs').title };
  }));
  out.righe = rows;
  const FXL = { calo: 'IN CALO FORTE', ferma: 'HA SMESSO DI SCENDERE', normale: 'NORMALE' };
  for (const r of rows) {
    const a = ATT.indici[r.k];
    ok(r.br === fmt(a.b) + '%', `${r.k}: breadth ${r.br} invece di ${fmt(a.b)}%`);
    ok(r.m3 === sgnP(a.ch63), `${r.k}: 3 mesi locale ${r.m3} invece di ${sgnP(a.ch63)}`);
    ok(r.m3u.replace('*', '') === sgnP(a.ch63u.v) && r.m3u.includes('*') === a.ch63u.lag, `${r.k}: 3 mesi in $ ${r.m3u} invece di ${sgnP(a.ch63u.v)}${a.ch63u.lag ? '*' : ''}`);
    if (a.fx && r.k !== 'HSI') {
      ok(r.fx.toUpperCase() === FXL[a.fx.stato], `${r.k}: valuta ${r.fx} invece di ${a.fx.stato}`);
      ok(r.fxTitle.includes(`: ${fmt(a.fx.z, 2)} `) && r.fxTitle.includes(`cambio ${fmt(a.fx.valore, a.fx.valore < 10 ? 4 : 2)} al ${dIT(a.fx.ultima)}`), `${r.k}: nota della barra z «${r.fxTitle}» (atteso z ${fmt(a.fx.z, 2)}, cambio ${a.fx.valore} al ${a.fx.ultima})`);
    }
    ok(r.rs.toUpperCase() === a.rs.quad.toUpperCase(), `${r.k}: forza relativa ${r.rs} invece di ${a.rs.quad}`);
    ok(r.rsTitle.includes(`al ${dIT(a.rs.last)}`), `${r.k}: data della forza relativa ${r.rsTitle}`);
  }
  // 3. stessa riga nella vista 6
  const meta = await page.textContent('#emMeta');
  out.meta = meta;
  await page.click('#tab-idx'); await page.waitForSelector('#ixTable tbody tr[data-ix]');
  await page.click('#ixPickAll'); await page.waitForTimeout(1500);
  const six = await page.$$eval('#ixTable tbody tr[data-ix]', (a) => Object.fromEntries(a.map((tr) => [tr.dataset.ix, { state: tr.querySelector('.c-state').innerText.trim(), br: tr.querySelector('.c-br .cellv').childNodes[0].textContent.trim(), blue: tr.querySelector('.c-blue').innerText.trim(), dd: tr.querySelector('.c-dd .cellv').innerText.trim() }])));
  for (const r of rows) {
    const s = six[r.k];
    if (!s) { out.note.push(`${r.k} non è tra gli indici mostrati nella vista 6 di partenza: confronto saltato`); continue; }
    ok(s.state === r.state && s.br === r.br && s.blue === r.blue && s.dd === r.dd, `${r.k}: vista 8 ${JSON.stringify([r.state, r.br, r.blue, r.dd])} contro vista 6 ${JSON.stringify(s)}`);
  }
  await page.click('#tab-emg'); await waitEmg(page);
  // 4. quadrante: posizioni, scia, etichette
  const rs = await page.evaluate(() => {
    const svg = document.getElementById('emRS'), vb = svg.viewBox.baseVal;
    const dots = [...svg.querySelectorAll('g.emdot')].map((g) => { const c = g.querySelector('circle'), t = g.querySelector('text'), b = t.getBBox(); return { k: g.dataset.em, on: g.classList.contains('on'), cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy'), r: +c.getAttribute('r'), lab: t.textContent, box: [b.x, b.y, b.x + b.width, b.y + b.height], title: g.querySelector('title').textContent }; });
    const tr = [...svg.querySelectorAll('path.emtrail')].map((p) => p.getAttribute('d'));
    const qlab = [...svg.querySelectorAll('text.qlab')].map((t) => { const b = t.getBBox(); return [t.textContent, b.x, b.y, b.x + b.width, b.y + b.height]; });
    return { W: vb.width, H: vb.height, dots, tr, qlab, meta: document.getElementById('emRSMeta').textContent };
  });
  out.rs = rs;
  const sx = (v) => ((Math.max(96, Math.min(104, v)) - 96) / 8) * rs.W, sy = (v) => rs.H - ((Math.max(96, Math.min(104, v)) - 96) / 8) * rs.H;
  ok(rs.dots.length === 7, `quadrante: ${rs.dots.length} punti invece di 7`);
  ok(rs.tr.length === 1, `quadrante: ${rs.tr.length} scie invece di 1`);
  for (const d of rs.dots) {
    const a = ATT.indici[d.k].rs;
    ok(Math.abs(d.cx - sx(a.ratio)) < 0.05 && Math.abs(d.cy - sy(a.mom)) < 0.05, `quadrante ${d.k}: punto a ${d.cx.toFixed(1)},${d.cy.toFixed(1)} invece di ${sx(a.ratio).toFixed(1)},${sy(a.mom).toFixed(1)}`);
    ok(d.title.includes(`RS-Ratio ${fmt(a.ratio, Math.abs(a.ratio - 100) < 0.05 ? 2 : 1)}`) && d.title.includes(`RS-Momentum ${fmt(a.mom, Math.abs(a.mom - 100) < 0.05 ? 2 : 1)}`) && d.title.includes(`(${a.quad})`), `quadrante ${d.k}: titolo «${d.title}»`);
    // etichetta dentro il riquadro, senza toccare altre etichette, altri punti o le scritte dei quadranti
    ok(d.box[0] >= -0.5 && d.box[2] <= rs.W + 0.5 && d.box[1] >= -0.5 && d.box[3] <= rs.H + 0.5, `quadrante ${d.k}: etichetta fuori dal riquadro ${d.box.map((v) => v.toFixed(0))}`);
    for (const e of rs.dots) {
      if (e === d) continue;
      const ov = d.box[0] < e.box[2] && d.box[2] > e.box[0] && d.box[1] < e.box[3] && d.box[3] > e.box[1];
      ok(!ov, `quadrante: le etichette ${d.lab} e ${e.lab} si sovrappongono`);
      const dotIn = e.cx + e.r > d.box[0] && e.cx - e.r < d.box[2] && e.cy + e.r > d.box[1] && e.cy - e.r < d.box[3];
      ok(!dotIn, `quadrante: l'etichetta ${d.lab} copre il punto di ${e.lab}`);
    }
    for (const q of rs.qlab) { const ov = d.box[0] < q[3] && d.box[2] > q[1] && d.box[1] < q[4] && d.box[3] > q[2]; ok(!ov, `quadrante: l'etichetta ${d.lab} tocca la scritta ${q[0]}`); }
  }
  // scia dell'indice scelto, 10 settimane
  const sel = rs.dots.find((d) => d.on), a = ATT.indici[sel.k].rs, tp = [...rs.tr[0].matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  ok(tp.length === a.trail.length, `scia ${sel.k}: ${tp.length} punti invece di ${a.trail.length}`);
  tp.forEach((p, i) => ok(Math.abs(p[0] - sx(a.trail[i][0])) < 0.06 && Math.abs(p[1] - sy(a.trail[i][1])) < 0.06, `scia ${sel.k}: punto ${i} spostato`));
  ok(rs.meta === `al ${dIT(a.last)}`, `quadrante: data ${rs.meta}`);
  // punti fuori scala (bloccati sul bordo) : segnalati?
  for (const [k, o] of Object.entries(ATT.indici)) if (Math.abs(o.rs.ratio - 100) > 4 || Math.abs(o.rs.mom - 100) > 4) out.note.push(`${k} fuori scala nel quadrante (${o.rs.ratio.toFixed(1)}, ${o.rs.mom.toFixed(1)}): disegnato sul bordo`);
  // clic su ogni punto del quadrante: scia e riga scelte
  for (const d of rs.dots) {
    await page.click(`#emRS g.emdot[data-em="${d.k}"] circle`, { force: true }); await page.waitForTimeout(120);
    const st = await page.evaluate(() => ({ on: [...document.querySelectorAll('#emRS g.emdot.on')].map((g) => g.dataset.em), sel: [...document.querySelectorAll('#emTable tr.sel')].map((t) => t.dataset.em), title: document.getElementById('emTitle').textContent, hash: location.hash, trails: document.querySelectorAll('#emRS path.emtrail').length }));
    ok(st.on.join() === d.k && st.sel.join() === d.k && st.title.startsWith(d.k + ' ·') && st.hash === '#emg-' + d.k && st.trails === 1, `clic sul punto ${d.k}: ${JSON.stringify(st)}`);
    // etichette ancora senza sovrapposizioni con il punto scelto più grande
    const ov = await page.evaluate(() => { const g = [...document.querySelectorAll('#emRS g.emdot')]; const bx = g.map((x) => { const b = x.querySelector('text').getBBox(); return [x.dataset.em, b.x, b.y, b.x + b.width, b.y + b.height]; }); const o = []; for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) { const A = bx[i], B = bx[j]; if (A[1] < B[3] && A[3] > B[1] && A[2] < B[4] && A[4] > B[2]) o.push(A[0] + '/' + B[0]); } return o; });
    ok(!ov.length, `etichette sovrapposte con ${d.k} scelto: ${ov}`);
  }
  // 5. legenda e note del grafico
  await page.click('#emTable tr[data-em="KOSPI200"]'); await page.waitForTimeout(150);
  out.legenda = await page.innerText('#emLegend'); out.notaGrafico = await page.innerText('#emChartMeta'); out.noteKOSPI = await page.innerText('#emNotes');
  // 6. contrasto (testi ≥ 4,5; linee e bande ≥ 3 sono il riferimento WCAG per elementi grafici)
  const col = await page.evaluate(() => {
    const cs = (s, p) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; };
    const bgOf = (s) => { let e = document.querySelector(s); while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; };
    const bg = bgOf('#emWrap');
    return { bg, axt: cs('#emChart text.axt', 'fill'), paneT: cs('#emChart text.pane-t', 'fill'), loc: cs('#emChart path.emloc', 'stroke'), usd: cs('#emChart path.emusd', 'stroke'), fx: cs('#emChart path.emfx', 'stroke'), dl: cs('#emChart path.emdl', 'stroke'), ma: cs('#emChart path.ma', 'stroke'), maOp: cs('#emChart path.ma', 'opacity'),
      br: cs('#emChart path.br', 'stroke'), blue: cs('#emChart line.blue', 'stroke'), calo: cs('#emChart rect.fxcalo', 'fill'), caloOp: cs('#emChart rect.fxcalo', 'fillOpacity'), ferma: cs('#emChart rect.fxferma', 'fill'), fermaOp: cs('#emChart rect.fxferma', 'fillOpacity'), fav: cs('#emChart rect.dlfav', 'fill'), favOp: cs('#emChart rect.dlfav', 'fillOpacity'),
      band: cs('#emChart rect.band', 'fill'), bandOp: cs('#emChart rect.band', 'fillOpacity'),
      legCalo: cs('#emLegend .kb.em-calo', 'backgroundColor'), legCaloOp: cs('#emLegend .kb.em-calo', 'opacity'),
      rsBg: bgOf('#emRSWrap'), rsLab: cs('#emRS g.emdot:not(.on) text', 'fill'), rsLabOn: cs('#emRS g.emdot.on text', 'fill'), rsDot: cs('#emRS g.emdot:not(.on) circle', 'fill'), tint: cs('#emRS rect.q-lag-tint', 'fill'),
      fxpCalo: cs('#emTable .fx-calo', 'color'), fxpFerma: cs('#emTable .fx-ferma', 'color'), tdBg: bgOf('#emTable tbody td'), note: cs('#v-emg .emread', 'color'), muted: cs('#v-emg .emread .muted', 'color'), noteBg: bgOf('#v-emg .emread') };
  });
  const B = parse(col.bg), C = (k, opk) => { const c = parse(col[k]); return c ? contrast(over(c, B, (opk ? +col[opk] : 1) * c.a), B) : null; };
  const tint = parse(col.tint), rsB = tint ? over(tint, parse(col.rsBg)) : parse(col.rsBg);
  out.contrasto = { fondo: col.bg, testoAssi: C('axt'), titoliPannelli: C('paneT'), prezzoLocale: C('loc'), prezzoDollari: C('usd'), cambio: C('fx'), dollaro: C('dl'), media200: C('ma', 'maOp'), breadth: C('br'), livelloBlu: C('blue'),
    bandaCalo: C('calo', 'caloOp'), bandaFerma: C('ferma', 'fermaOp'), bandaFavorevole: C('fav', 'favOp'), zonaBlu: C('band', 'bandOp'),
    etichetteQuadrante: contrast(parse(col.rsLab), rsB), etichettaScelta: contrast(parse(col.rsLabOn), rsB), puntoQuadrante: contrast(parse(col.rsDot), rsB),
    pillCalo: contrast(parse(col.fxpCalo), parse(col.tdBg)), pillFerma: contrast(parse(col.fxpFerma), parse(col.tdBg)), testoLettura: contrast(parse(col.note), parse(col.noteBg)), testoMuted: contrast(parse(col.muted), parse(col.noteBg)), colori: col };
  for (const [k, v] of Object.entries(out.contrasto)) if (typeof v === 'number') {
    const lim = ['testoAssi', 'titoliPannelli', 'etichetteQuadrante', 'etichettaScelta', 'pillCalo', 'pillFerma', 'testoLettura', 'testoMuted'].includes(k) ? 4.5 : /^banda|zonaBlu/.test(k) ? 1.15 : 3;
    ok(v >= lim, `contrasto ${THEME} ${k}: ${v.toFixed(2)} (minimo ${lim})`);
  }
  // 7. barra delle schede e scorrimento orizzontale a questa larghezza
  const bar = await page.evaluate(() => ({ tops: [...new Set([...document.querySelectorAll('.fnkeys button')].map((b) => Math.round(b.getBoundingClientRect().top)))], sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(bar.tops.length === 1, `barra delle schede su ${bar.tops.length} righe a ${W} px`);
  ok(bar.sw <= bar.cw, `scorrimento orizzontale a ${W}: ${bar.sw} > ${bar.cw}`);
  out.errori = errs;
  fs.writeFileSync(__dirname + `/esito-b-computer-${W}-${THEME}.json`, JSON.stringify(out, null, 1));
  console.log('controlli', out.controlli, 'problemi', out.problemi.length, 'errori', errs, out.note);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
