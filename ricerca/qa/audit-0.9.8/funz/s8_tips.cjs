// Spiegazioni: title al passaggio (desktop) e taptip al tocco (telefono/tablet); valori dei tooltip contro le tabelle
const L = require('./lib.cjs');
const prof = process.argv[2] || 'phone';
const R = new L.Rec('s8_tips_' + prof + '_' + (process.argv[3] || 'dark'));
(async () => {
  const b = await L.launch();
  const tag = prof;
  const { ctx, page, log } = await L.open(b, prof, { theme: process.argv[3] || 'dark' });
  const ev = (f, a) => page.evaluate(f, a);
  const touch = prof === 'phone' || prof === 'tablet';
  const tapAt = async (sel, i = 0) => {
    const el = (await page.$$(sel))[i];
    if (!el) return null;
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    const bb = await el.boundingBox();
    if (!bb) return null;
    if (touch) await page.touchscreen.tap(bb.x + Math.min(6, bb.width / 2), bb.y + bb.height / 2); else await page.mouse.click(bb.x + 4, bb.y + bb.height / 2);
    await page.waitForTimeout(250);
    return ev(() => { const t = document.querySelector('.taptip'); return t && !t.hidden ? t.textContent : ''; });
  };
  // Monitor: dalla 0.9.2 le spiegazioni si aprono al tocco anche dentro le schede (il tocco sul nome apre il settore)
  await L.goto(page, 'mon', 1500);
  const titled = await ev(() => [...document.querySelectorAll('#v-mon [title]')].filter((e) => e.getBoundingClientRect().width > 0).length);
  R.add('TT1', 'spiegazioni', `${tag} Monitor: elementi con spiegazione visibili`, titled > 20, `visibili=${titled}`);
  if (touch) {
    let okT = 0; const badT = [];
    for (const sel of ['#boardTable tbody tr[data-sym] .cnt[title]', '#boardTable tbody tr[data-sym] .bar[title]', '#boardTable tbody tr[data-sym] .ago[title]']) {
      const want = await ev((sel) => { const e = document.querySelector(sel); return e ? e.getAttribute('title') : null; }, sel);
      if (want == null) { badT.push(sel + ': assente'); continue; }
      const got = await tapAt(sel);
      const h = await ev(() => location.hash);
      if (got && got.startsWith(want) && h === '#mon') okT++; else badT.push(`${sel}: «${(got || '').slice(0, 40)}» hash=${h}`);
      await page.touchscreen.tap(3, 150); await page.waitForTimeout(150);
      if (h !== '#mon') await L.goto(page, 'mon', 800);
    }
    R.add('TT2', 'spiegazioni', `${tag} Monitor a schede: tocco su k/n, barra del drawdown e tacca del mese prima mostra la spiegazione senza aprire il settore`, okT === 3, badT.join(' | '));
    const leg = await ev(() => document.getElementById('v-mon').innerText);
    R.add('TT2b', 'spiegazioni', `${tag} Monitor a schede: legenda e nota spiegano drawdown con i dividendi e «Solo prezzo»`, /dividendi/.test(leg) && /Solo prezzo/i.test(leg), '');
    // tap su riga: apre il settore, niente taptip
    // dettaglio: dt della situazione
    await L.goto(page, 'XLU', 1200);
    const t1 = await tapAt('#secFacts dt[title]');
    const want = await ev(() => document.querySelector('#secFacts dt[title]').getAttribute('title'));
    const sp = await L.shot(page, `tt-${tag}-facts`);
    R.add('TT3', 'taptip', `${tag} tocco su voce della Situazione mostra la spiegazione`, t1 === want, `mostrato: ${(t1 || '').slice(0, 100)}`, sp);
    // tocco altrove chiude
    await page.touchscreen.tap(5, 200); await page.waitForTimeout(250);
    R.add('TT4', 'taptip', `${tag} tocco altrove chiude la spiegazione`, await ev(() => document.querySelector('.taptip').hidden));
    // riquadro dentro lo schermo
    await tapAt('#secFacts dt[title]', 1);
    const pos = await ev(() => { const r = document.querySelector('.taptip').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, iw: innerWidth, ih: innerHeight }; });
    R.add('TT5', 'taptip', `${tag} il riquadro sta nello schermo`, pos.l >= 0 && pos.r <= pos.iw && pos.t >= 0 && pos.b <= pos.ih, JSON.stringify(pos));
    // scroll chiude
    await page.mouse.wheel(0, 300); await ev(() => window.scrollBy(0, 200)); await page.waitForTimeout(300);
    R.add('TT6', 'taptip', `${tag} lo scorrimento chiude la spiegazione`, await ev(() => document.querySelector('.taptip').hidden));
    // tabella episodi: intestazioni con title?
    const epiTh = await tapAt('#epiCtx [title], #epiTable th[title]');
    R.add('TT7', 'taptip', `${tag} intestazioni degli episodi`, epiTh === null || epiTh.length > 0, epiTh === null ? 'nessuna intestazione con spiegazione' : epiTh.slice(0, 80));
    // RRG: tocco su un punto lo fissa e mostra il tooltip
    await L.goto(page, 'rrg', 2000);
    const head = await ev(() => { const c = document.querySelector('#rrg circle.head'); c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.touchscreen.tap(head[0], head[1]); await page.waitForTimeout(400);
    const rt = await ev(() => ({ tip: !document.getElementById('rrgTip').hidden, txt: document.getElementById('rrgTip').innerText.replace(/\s+/g, ' ').slice(0, 120), pin: (document.querySelector('#rotTable tr.sel') || { dataset: {} }).dataset.sym }));
    R.add('TT8', 'taptip', `${tag} RRG: tocco su un punto lo fissa e mostra i numeri`, rt.tip && !!rt.pin, JSON.stringify(rt), await L.shot(page, `tt-${tag}-rrg`));
    // tocco sul vuoto lo libera
    const svgb = await ev(() => { const r = document.getElementById('rrg').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    await page.touchscreen.tap(svgb[0] + 8, svgb[1] + 8); await page.waitForTimeout(300);
    const rt2 = await ev(() => ({ tip: !document.getElementById('rrgTip').hidden, pin: document.querySelectorAll('#rotTable tr.sel').length }));
    R.add('TT9', 'taptip', `${tag} RRG: tocco sul vuoto libera il punto`, !rt2.tip && rt2.pin === 0, JSON.stringify(rt2));
    // Indici a schede (fino a 900 px): intestazioni nascoste, spiegazioni nelle celle al tocco
    await L.goto(page, 'idx', 4000);
    const capWant = await ev(() => { const e = document.querySelector('#ixTable tbody td.c-cap[title]'); return e ? e.getAttribute('title') : null; });
    const cc = await tapAt('#ixTable tbody td.c-cap[title]');
    const ch = await ev(() => location.hash);
    R.add('TT10', 'taptip', `${tag} Indici a schede: tocco sulla cella «Cali forti» mostra la spiegazione`, !!capWant && !!cc && cc.startsWith(capWant) && ch === '#idx', `«${(cc || '').slice(0, 100)}» hash=${ch}`);
    await page.touchscreen.tap(3, 150); await page.waitForTimeout(150);
    const lw = await ev(() => { const e = document.querySelector('#ixTable tbody .loc[title]'); return e ? e.getAttribute('title') : null; });
    const lc = await tapAt('#ixTable tbody .loc[title]');
    R.add('TT11', 'taptip', `${tag} Indici a schede: tocco su «con limiti»/storia mostra la spiegazione`, !!lw && !!lc && lc.startsWith(lw), (lc || 'nessuna').slice(0, 120));
    await page.touchscreen.tap(3, 150); await page.waitForTimeout(150);
    // Titoli: tocco sulla bolla
    await L.goto(page, 'tit', 3500);
    const circ = await ev(() => { const c = [...document.querySelectorAll('#titBubble circle')].sort((a, b) => b.getAttribute('r') - a.getAttribute('r'))[0]; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.touchscreen.tap(circ[0], circ[1]); await page.waitForTimeout(400);
    const bt = await ev(() => ({ tip: !document.getElementById('titBubbleTip').hidden, txt: document.getElementById('titBubbleTip').innerText.replace(/\s+/g, ' ').slice(0, 120) }));
    R.add('TT12', 'taptip', `${tag} Titoli: tocco su una bolla mostra il titolo`, bt.tip, JSON.stringify(bt), await L.shot(page, `tt-${tag}-bubble`));
    // Titoli: tocco sulla riga del dumbbell sceglie il settore e mostra i numeri
    const row = await ev(() => { const g = [...document.querySelectorAll('#titSpread g')].filter((g) => g.getBoundingClientRect().width > 100)[2]; g.scrollIntoView({ block: 'center' }); const r = g.getBoundingClientRect(); return [r.x + r.width * 0.5, r.y + r.height / 2]; });
    await page.touchscreen.tap(row[0], row[1]); await page.waitForTimeout(500);
    const st = await ev(() => ({ tip: !document.getElementById('titSpreadTip').hidden, txt: document.getElementById('titSpreadTip').innerText.replace(/\s+/g, ' ').slice(0, 140), sel: document.querySelector('#titChips button[aria-pressed="true"]').dataset.sym }));
    R.add('TT13', 'taptip', `${tag} Titoli: tocco sulla riga del dumbbell`, st.tip, JSON.stringify(st), await L.shot(page, `tt-${tag}-spread`));
    // Bottom map: tocco su un punto apre il settore
    await L.goto(page, 'btm', 1500);
    const bh = await ev(() => { const c = [...document.querySelectorAll('#bm circle')].filter((c) => +c.getAttribute('r') >= 5)[0]; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.touchscreen.tap(bh[0], bh[1]); await page.waitForTimeout(500);
    const first = await ev(() => ({ tip: !document.getElementById('bmTip').hidden, sec: !document.getElementById('v-sec').hidden }));
    await page.touchscreen.tap(bh[0], bh[1]); await page.waitForTimeout(700);
    R.add('TT14', 'taptip', `${tag} Bottom Map: primo tocco i numeri, secondo apre il settore`, first.tip && !first.sec && await ev(() => !document.getElementById('v-sec').hidden), JSON.stringify(first) + ' ' + await ev(() => location.hash));
  } else {
    // desktop: i title principali esistono
    const t = await ev(() => ({ dd: !!document.querySelector('#boardTable th[title]'), cnt: document.querySelectorAll('#boardTable .cnt[title]').length }));
    R.add('TT20', 'spiegazioni', `${tag} title su intestazioni e conteggi del Monitor`, t.dd && t.cnt === 11, JSON.stringify(t));
  }
  // Monitor: conteggio nel title = testo k/n
  await L.goto(page, 'mon', 1200);
  const cnt = await ev(() => [...document.querySelectorAll('#boardTable .cnt')].map((c) => { const m = /^(\d+) titol[io] sopra la media 200 su (\d+): .* vale ([\d,]+) punti/.exec(c.title); return { txt: c.textContent, ok: m && `${m[1]}/${m[2]}` === c.textContent && Math.abs(parseFloat(m[3].replace(',', '.')) - 100 / +m[2]) < 0.06, pct: c.parentElement.firstChild.textContent }; }));
  const pctOk = cnt.every((c) => { const [a, n] = c.txt.split('/').map(Number); return Math.abs(parseFloat(c.pct.replace(',', '.')) - (100 * a) / n) < 0.06; });
  R.add('TT21', 'coerenza', `${tag} Monitor: k/n, valore del titolo e % coincidono`, cnt.every((c) => c.ok) && pctOk, cnt.map((c) => `${c.pct} ${c.txt} ${c.ok}`).join(' | '));
  // SPY kpi vs riga SPY
  const spy = await ev(() => ({ kpi: [...document.querySelectorAll('#boardKpis .kpi')].map((k) => k.innerText.replace(/\s+/g, ' ')).find((t) => /SPY/.test(t)), row: document.querySelector('#boardTable tr.bench').innerText.replace(/\s+/g, ' ') }));
  const kv = /SPY · S&P 500 ([\d.,]+) (\S+)% dal massimo.*solo prezzo (\S+)%/i.exec(spy.kpi || '');
  R.add('TT22', 'coerenza', `${tag} Monitor: riquadro SPY = riga SPY (ultimo, drawdown, solo prezzo; sul telefono la scheda ha solo il drawdown)`, kv && (prof === 'phone' || spy.row.includes(kv[1])) && spy.row.includes(kv[2] + '%') && (prof === 'phone' || spy.row.includes(kv[3] + '%')), `${spy.kpi} || ${spy.row}`);
  R.add('Z', 'console', `${tag} nessun errore`, !log.length, log.join(' | '));
  R.save();
  await ctx.close(); await b.close();
})();
