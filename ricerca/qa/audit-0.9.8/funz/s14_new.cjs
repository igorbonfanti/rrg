// Funzioni arrivate dopo la 0.9.0 (0.9.1-0.9.8): pannelli richiudibili ricordati (sm.opened), grafico dei cali forti
// sulle stesse date del grafico principale, linea del cursore condivisa (mouse e tocco), scala tagliata sui picchi,
// link a TradingView di settori, indici e titoli, Zoom sulla zona, Bottom Map al tocco (primo tocco i numeri, secondo
// apre), settori da osservare prima sul telefono, percentile con 0 cali, spiegazioni al tocco nelle schede.
// Uso: node s14_new.cjs <desktop|phone> <dark|light>
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const theme = process.argv[3] || 'dark';
const R = new L.Rec('s14_new_' + prof + '_' + theme);
const touch = prof === 'phone' || prof === 'tablet';
(async () => {
  const b = await L.launch();
  const tag = `${prof}/${theme}`;
  const { ctx, page, log } = await L.open(b, prof, { theme });
  const ev = (f, a) => page.evaluate(f, a);
  const openIdx = async (k) => { await page.fill('#cmd', k); await page.press('#cmd', 'Enter'); await page.waitForTimeout(1500); };

  // ---------- pannelli richiudibili (episodi, cali forti) nelle viste 4 e 6
  for (const [view, epi, cap] of [['XLF', 'secEpiBox', 'secCap'], ['idx', 'ixEpiBox', 'ixCap']]) {
    await L.goto(page, view, view === 'idx' ? 3500 : 1500);
    const st0 = await ev(([e, c]) => [document.getElementById(e).open, document.getElementById(c).open, document.querySelector(`#${e} summary`).innerText.replace(/\s+/g, ' ')], [epi, cap]);
    R.add('P1', 'pannelli', `${tag} ${view}: episodi e cali forti chiusi di default`, !st0[0] && !st0[1], JSON.stringify(st0));
    if (view === 'XLF') R.add('P2', 'pannelli', `${tag} ${view}: il titolo chiuso dice quante zone blu, trigger e falliti`, /zon[ae] blu/i.test(st0[2]) && /trigger/i.test(st0[2]) && /fallit/i.test(st0[2]) && !/NaN|undefined/.test(st0[2]), st0[2]);
    else R.add('P2', 'pannelli', `${tag} ${view}: il titolo chiuso dice quante zone blu e trigger`, /zon[ae] blu/i.test(st0[2]) && /trigger/i.test(st0[2]) && !/NaN|undefined/.test(st0[2]), st0[2]);
    await page.click(`#${epi} > summary`); await page.click(`#${cap} > summary`); await page.waitForTimeout(900);
    const ls = await ev(() => localStorage.getItem('sm.opened'));
    const rows = await ev((e) => document.querySelectorAll(`#${e} tbody tr`).length, epi);
    R.add('P3', 'pannelli', `${tag} ${view}: aperti con un clic, episodi visibili, scelta salvata in sm.opened`, rows > 0 && /"(sec|ix)Epi":true/.test(ls) && /"(sec|ix)Cap":true/.test(ls), `righe episodi=${rows} sm.opened=${ls}`);
    await page.reload(); await page.waitForTimeout(view === 'idx' ? 3500 : 2000);
    const st1 = await ev(([e, c]) => [document.getElementById(e).open, document.getElementById(c).open], [epi, cap]);
    R.add('P4', 'pannelli', `${tag} ${view}: restano aperti dopo il ricaricamento`, st1[0] && st1[1], JSON.stringify(st1));
    // lo stesso stato vale cambiando settore o indice
    if (view === 'XLF') { await page.click('#secChips button[data-sym="XLE"]'); await page.waitForTimeout(800); }
    else { await page.click('#ixChips button[data-ix="DAX"]'); await page.waitForTimeout(1000); }
    const st2 = await ev(([e, c]) => [document.getElementById(e).open, document.getElementById(c).open], [epi, cap]);
    R.add('P5', 'pannelli', `${tag} ${view}: restano aperti cambiando ${view === 'idx' ? 'indice' : 'settore'}`, st2[0] && st2[1], JSON.stringify(st2));
  }

  // ---------- stesse date agli stessi pixel, linea del cursore condivisa, nei tre periodi
  const axes = (m, c) => ev(([m, c]) => {
    const lab = (id) => {
      const s = document.getElementById(id), r = s.getBoundingClientRect(), k = r.width / s.viewBox.baseVal.width, H = s.viewBox.baseVal.height;
      return { w: Math.round(r.width * 10) / 10, left: Math.round(r.left * 10) / 10, t: [...s.querySelectorAll('text.axt')].filter((t) => +t.getAttribute('y') > H - 12 && /^\d{4}$|^[a-z]{3} \d\d$/.test(t.textContent)).map((t) => [t.textContent, Math.round(r.left + k * +t.getAttribute('x'))]) };
    };
    return [lab(m), lab(c)];
  }, [m, c]);
  const xhPx = (a, z) => ev(([a, z]) => {
    const px = (s) => { const e = document.getElementById(s), l = e.querySelector('line.xhair'), r = e.getBoundingClientRect(); return { vis: l.getAttribute('visibility'), x: r.left + (r.width / e.viewBox.baseVal.width) * +l.getAttribute('x1') }; };
    return [px(a), px(z)];
  }, [a, z]);
  const point = async (src, f) => {
    const r = await ev(([id, f]) => { const s = document.getElementById(id); s.scrollIntoView({ block: 'center' }); const h = s.querySelector('rect[fill="transparent"]') || s; const x = h.getBoundingClientRect(); return [x.left + x.width * f, x.top + x.height * 0.5]; }, [src, f]);
    if (touch) await page.touchscreen.tap(r[0], r[1]); else await page.mouse.move(r[0], r[1]);
    await page.waitForTimeout(250);
  };
  const tipTxt = (id) => ev((id) => { const t = document.getElementById(id); return t.hidden ? '' : t.innerText.replace(/\s+/g, ' '); }, id);
  for (const [view, rangeSeg, main, capSvg, mainTip, capTip] of [['XLF', 'rangeSeg', 'ts', 'secCapSvg', 'tsTip', 'secCapTip'], ['idx', 'ixRange', 'ixTs', 'ixCapSvg', 'ixTsTip', 'ixCapTip']]) {
    await L.goto(page, view, view === 'idx' ? 3500 : 1500);
    if (view === 'idx') await openIdx('SPX');
    for (const rg of ['3A', '10A', 'MAX']) {
      await page.click(`#${rangeSeg} button[data-range="${rg}"]`); await page.waitForTimeout(900);
      const ax = await axes(main, capSvg);
      const same = JSON.stringify(ax[0].t) === JSON.stringify(ax[1].t);
      R.add('X1', 'cali forti', `${tag} ${view} ${rg}: grafico dei cali forti largo come il principale, stesse date agli stessi pixel`, Math.abs(ax[0].w - ax[1].w) < 1 && Math.abs(ax[0].left - ax[1].left) < 1 && same && ax[0].t.length >= 2, `largh. ${ax[0].w}/${ax[1].w} sin. ${ax[0].left}/${ax[1].left} etichette ${JSON.stringify(ax[0].t.slice(0, 3))} vs ${JSON.stringify(ax[1].t.slice(0, 3))}`);
      for (const [src, dst, srcTip] of [[main, capSvg, mainTip], [capSvg, main, capTip]]) {
        await point(src, 0.63);
        const v = await xhPx(src, dst);
        const tt = await tipTxt(srcTip);
        const okLine = v[0].vis === 'visible' && v[1].vis === 'visible' && Math.abs(v[0].x - v[1].x) < 1.5;
        // chiusura: mouse fuori (computer) o tocco fuori dal grafico (telefono)
        if (touch) { await page.touchscreen.tap(3, 120); } else { await page.mouse.move(3, 3); }
        await page.waitForTimeout(250);
        const g = await xhPx(src, dst);
        R.add('X2', 'cursore', `${tag} ${view} ${rg}: linea da ${src} a ${dst} (${touch ? 'tocco' : 'mouse'}), poi sparisce`, okLine && tt.length > 5 && g[0].vis === 'hidden' && g[1].vis === 'hidden', `linee ${JSON.stringify(v)} tip «${tt.slice(0, 80)}» dopo: ${g[0].vis}/${g[1].vis}`);
      }
      if (view === 'idx' && rg === 'MAX') {
        const cut = await ev(() => [...document.querySelectorAll('#ixCapSvg text.capcut')].map((t) => t.textContent));
        R.add('X3', 'cali forti', `${tag} SPX MAX: picchi tagliati scritti in alto (▲ valore, mese)`, cut.length >= 1 && cut.every((t) => /^▲\s?[\d.]+ \([a-z]{3} \d{4}\)/.test(t)), cut.join(' | '));
      }
      const bad = await L.badText(page, '#v-' + (view === 'idx' ? 'idx' : 'sec'));
      R.add('X4', 'testo', `${tag} ${view} ${rg}: niente NaN/undefined`, !bad.length, bad.join(' | '));
    }
    await page.click(`#${rangeSeg} button[data-range="3A"]`); await page.waitForTimeout(400);
  }

  // ---------- link a TradingView (solo href, non si aprono)
  const TVRE = /^https:\/\/www\.tradingview\.com\/chart\/\?symbol=[A-Z0-9_]+%3A[A-Z0-9_.!]+$/;
  await L.goto(page, 'XLK', 1500);
  const secs = await ev(() => [...document.querySelectorAll('#secChips button')].map((b) => b.dataset.sym));
  const secBad = [];
  for (const s of secs) {
    await page.click(`#secChips button[data-sym="${s}"]`); await page.waitForTimeout(350);
    const l = await ev(() => [...document.querySelectorAll('#tvLinks a')].map((a) => [a.textContent, a.href, a.target, a.rel]));
    const mem = await ev(() => [...document.querySelectorAll('#memTable a.sym')].map((a) => [a.textContent, a.href, a.target, a.rel]));
    const okL = l.length === 2 && l.every(([t, h, tg, rel]) => TVRE.test(h) && tg === '_blank' && /noopener/.test(rel)) && decodeURIComponent(l[0][1]).endsWith('AMEX:' + s);
    const memBad = mem.filter(([t, h, tg]) => !/^https:\/\/www\.tradingview\.com\/chart\/\?symbol=[A-Z0-9.]+$/.test(h) || tg !== '_blank' || !decodeURIComponent(h).endsWith(t.replace('-', '.')));
    if (!okL || memBad.length || mem.length < 15) secBad.push(`${s}: ${JSON.stringify(l.map((x) => decodeURIComponent(x[1])))} membri=${mem.length} sbagliati=${memBad.slice(0, 3).map((x) => x[0] + '→' + x[1]).join(',')}`);
  }
  R.add('TV1', 'TradingView', `${tag} 11 settori: link ETF e breadth nella Situazione, link di ogni titolo del settore (nuova scheda)`, !secBad.length && secs.length === 11, secBad.join(' | '));
  await L.goto(page, 'idx', 3500);
  await page.click('#ixPickAll'); await page.waitForTimeout(1500);
  const ixs = await ev(() => [...document.querySelectorAll('#ixChips button')].map((b) => b.dataset.ix));
  const want = { SPX: 'S5TH', NDX: 'NDTH', DJI: 'DITH', RUT: 'R2TH', TSX60: 'XIU', CSI300: '510300', KOSPI200: 'KOSPI', TWN: 'EWT' };
  const ixBad = [], ixSeen = [];
  for (const k of ixs) {
    await page.click(`#ixChips button[data-ix="${k}"]`); await page.waitForTimeout(350);
    const l = await ev(() => [...document.querySelectorAll('#ixLinks a')].map((a) => [a.textContent, a.href, a.target, a.rel]));
    ixSeen.push(`${k}:${l.map((x) => decodeURIComponent(x[1]).split('=')[1]).join('+')}`);
    const ok = l.length >= 1 && l.every(([t, h, tg, rel]) => TVRE.test(h) && tg === '_blank' && /noopener/.test(rel) && t.includes(decodeURIComponent(h).split(':').pop())) && (!want[k] || l.some(([, h]) => decodeURIComponent(h).endsWith(':' + want[k])));
    if (!ok) ixBad.push(`${k}: ${JSON.stringify(l)}`);
  }
  R.add('TV2', 'TradingView', `${tag} 22 indici: link nella Situazione (indice + breadth o ETF del prezzo dove serve)`, ixs.length === 22 && !ixBad.length, (ixBad.join(' | ') || ixSeen.join(' ')).slice(0, 600));
  await page.click('#ixPickMain'); await page.waitForTimeout(500);
  await L.goto(page, 'tit-XLK', 3500);
  const pain = await ev(() => [...document.querySelectorAll('#titPain a.sym')].map((a) => [a.textContent, a.href, a.target]));
  R.add('TV3', 'TradingView', `${tag} vista 7: link dei «più in pena»`, pain.length === 12 && pain.every(([t, h, tg]) => /^https:\/\/www\.tradingview\.com\/chart\/\?symbol=[A-Z0-9.]+$/.test(h) && tg === '_blank'), pain.slice(0, 3).map((x) => x.join(' ')).join(' | '));

  // ---------- Zoom sulla zona (settori e indici): assi, scelta salvata
  for (const [view, btn, svg] of [['btm', 'bmZoom', 'bm'], ['idx', 'ixZoom', 'ixMap']]) {
    await L.goto(page, view, view === 'idx' ? 3500 : 1500);
    const labs = () => ev((s) => [...document.querySelectorAll(`#${s} text`)].map((t) => t.textContent).filter((t) => /^[−+-]?\d/.test(t)).join(','), svg);
    const a0 = await labs();
    await page.click('#' + btn); await page.waitForTimeout(500);
    const z1 = await ev((b) => document.getElementById(b).getAttribute('aria-pressed'), btn);
    const a1 = await labs();
    await page.reload(); await page.waitForTimeout(view === 'idx' ? 3500 : 1800);
    const z2 = await ev((b) => document.getElementById(b).getAttribute('aria-pressed'), btn);
    const a2 = await labs();
    await page.click('#' + btn); await page.waitForTimeout(400);
    const z3 = await ev((b) => document.getElementById(b).getAttribute('aria-pressed'), btn);
    R.add('Z1', 'zoom', `${tag} ${view}: «Zoom sulla zona» cambia gli assi, resta dopo il ricaricamento, si spegne`, z1 === 'true' && a1 !== a0 && z2 === 'true' && a2 === a1 && z3 === 'false', `prima ${a0.slice(0, 60)} · zoom ${a1.slice(0, 60)} · ricaricato ${z2} · spento ${z3}`);
    // zoom su una crisi passata: nessun punto fuori dall'area del grafico
    const jb = view === 'btm' ? 'bmJumps' : 'ixJumps';
    await page.click('#' + btn); await page.waitForTimeout(300);
    await page.click(`#${jb} button >> nth=4`); await page.waitForTimeout(500);
    const inside = await ev((s) => { const v = document.getElementById(s).viewBox.baseVal; return [...document.querySelectorAll(`#${s} circle`)].filter((c) => +c.getAttribute('r') >= 4).filter((c) => { const x = +c.getAttribute('cx'), y = +c.getAttribute('cy'); return x < 0 || y < 0 || x > v.width || y > v.height || Number.isNaN(x) || Number.isNaN(y); }).length; }, svg);
    const bad = await L.badText(page, '#v-' + view);
    R.add('Z2', 'zoom', `${tag} ${view}: zoom alla crisi di marzo 2020, punti di oggi (teste) dentro il grafico, niente NaN (le code fuori dalla zona sono tagliate)`, inside === 0 && !bad.length, `fuori=${inside} ${bad.join('|')}`);
    await page.click('#' + btn); await page.waitForTimeout(300);
    await page.click(view === 'btm' ? '#bmToday' : '#ixToday').catch(() => {});
  }

  // ---------- Bottom Map al tocco: primo tocco i numeri, secondo apre
  if (touch) {
    for (const [view, svg, tip, dest] of [['btm', 'bm', 'bmTip', 'v-sec'], ['idx', 'ixMap', 'ixMapTip', 'ixTitle']]) {
      await L.goto(page, view, view === 'idx' ? 3500 : 1500);
      const pt = await ev((s) => { const c = [...document.querySelectorAll(`#${s} circle`)].filter((c) => +c.getAttribute('r') >= 5).sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)[0]; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, svg);
      const h0 = await ev(() => location.hash);
      await page.touchscreen.tap(pt[0], pt[1]); await page.waitForTimeout(500);
      const s1 = await ev((t) => ({ tip: !document.getElementById(t).hidden, txt: document.getElementById(t).innerText.replace(/\s+/g, ' ').slice(0, 80), h: location.hash }), tip);
      await page.touchscreen.tap(pt[0], pt[1]); await page.waitForTimeout(900);
      const s2 = await ev(() => ({ h: location.hash, sec: !document.getElementById('v-sec').hidden, ixT: document.getElementById('ixTitle').textContent }));
      const sym = s1.txt.split(' ')[0];
      const opened = view === 'btm' ? s2.sec && s2.h === '#' + sym : s2.ixT.length > 0 && s2.h === h0;
      R.add('BM1', 'bottom map', `${tag} ${view}: primo tocco mostra i numeri, secondo apre ${view === 'btm' ? 'il settore' : "l'indice"}`, s1.tip && s1.h === h0 && opened, JSON.stringify({ s1, s2 }));
    }
  }

  // ---------- Monitor: sul telefono i settori da osservare vengono prima; spiegazioni al tocco nelle schede
  await L.goto(page, 'mon', 1500);
  const order = await ev(() => { const a = document.getElementById('activeList'), t = document.getElementById('boardTable'); return a && t ? [Math.round(a.getBoundingClientRect().top), Math.round(t.getBoundingClientRect().top), a.children.length] : null; });
  if (prof === 'phone') R.add('MO1', 'monitor', `${tag} telefono: «Settori da osservare» prima della tabella`, order && (order[2] === 0 || order[0] < order[1]), JSON.stringify(order));
  if (touch) {
    const tt = await ev(() => [...document.querySelectorAll('#boardTable tbody [title]')].filter((e) => e.getBoundingClientRect().width > 0).length);
    const el = (await page.$$('#boardTable tbody .cnt[title]'))[0];
    let shown = '', hash = '';
    if (el) {
      await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox();
      await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(400);
      shown = await ev(() => { const t = document.querySelector('.taptip'); return t && !t.hidden ? t.textContent : ''; });
      hash = await ev(() => location.hash);
    }
    R.add('MO2', 'spiegazioni', `${tag} Monitor a schede: tocco su «k/n» mostra la spiegazione e non apre il settore`, tt > 0 && /titol/.test(shown) && hash === '#mon', `elementi con spiegazione=${tt} mostrato «${shown.slice(0, 80)}» hash=${hash}`);
    await page.touchscreen.tap(3, 200); await page.waitForTimeout(200);
    await L.goto(page, 'idx', 3500);
    const cell = (await page.$$('#ixTable tbody td [title], #ixTable tbody td[title]'))[0];
    let s2 = '', h2 = '';
    if (cell) {
      await cell.scrollIntoViewIfNeeded(); const bb = await cell.boundingBox();
      const y0 = await ev(() => scrollY);
      await page.touchscreen.tap(bb.x + Math.min(8, bb.width / 2), bb.y + bb.height / 2); await page.waitForTimeout(400);
      s2 = await ev(() => { const t = document.querySelector('.taptip'); return t && !t.hidden ? t.textContent : ''; });
      h2 = String(Math.abs((await ev(() => scrollY)) - y0));
    }
    R.add('MO3', 'spiegazioni', `${tag} tabellone indici a schede: tocco su una cella con spiegazione la mostra`, s2.length > 10, `«${s2.slice(0, 100)}» scorrimento=${h2}`);
  }

  // ---------- percentile con 0 cali (B4 della 0.9.0)
  await L.goto(page, 'idx', 3500);
  await page.click('#ixPickAll'); await page.waitForTimeout(1500);
  const zero = await ev(() => [...document.querySelectorAll('#ixTable tbody tr')].map((tr) => { const c = [...tr.cells].find((td) => /Cali forti/.test(td.getAttribute('title') || '') || td.querySelector('[title^="Cali forti"]')); const t = c ? (c.getAttribute('title') || c.querySelector('[title]').getAttribute('title')) : ''; return [tr.dataset.ix, c ? c.innerText.replace(/\s+/g, ' ') : '', t]; }).filter(([, , t]) => /: 0 cali/.test(t)));
  R.add('CF1', 'cali forti', `${tag} indici con 0 cali nelle ultime sedute: percentile 0°`, zero.every(([, v, t]) => !/[1-9]\d?°/.test(v) && !/[1-9]\d?° percentile/.test(t)), zero.map((z) => `${z[0]} «${z[1]}» (${z[2].slice(0, 80)})`).join(' | ') || 'nessun indice con 0 cali oggi');
  await page.click('#ixPickMain'); await page.waitForTimeout(500);

  R.add('Z', 'console', `${tag} nessun errore in console`, !log.length, log.join(' | '));
  R.add('Z', 'pagina', `${tag} niente scroll orizzontale alla fine`, (await L.overflow(page)) <= 0, String(await L.overflow(page)));
  R.save();
  await ctx.close(); await b.close();
})();
