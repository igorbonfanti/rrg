// Vista 7 Titoli
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const R = new L.Rec('s5_tit_' + prof + '_' + (process.argv[3] || 'dark'));
(async () => {
  const b = await L.launch();
  const { ctx, page, log } = await L.open(b, prof, { theme: process.argv[3] || 'dark' });
  const tag = prof;
  const ev = (f, a) => page.evaluate(f, a);
  await L.goto(page, 'tit', 3500);
  const t0 = await ev(() => ({ body: !document.getElementById('titBody').hidden, chips: document.querySelectorAll('#titChips button').length, sel: document.querySelector('#titChips button[aria-pressed="true"]') && document.querySelector('#titChips button[aria-pressed="true"]').dataset.sym, meta: document.getElementById('titMeta').textContent, rows: document.querySelectorAll('#titSpread g').length, bub: document.querySelectorAll('#titBubble circle').length, pain: document.querySelectorAll('#titPain tbody tr').length, hist: !document.getElementById('titHistPanel').hidden, h: location.hash }));
  R.add('T1', 'titoli', `${tag} apertura`, t0.body && t0.chips === 11 && t0.sel && t0.bub > 10 && t0.pain === 12 && t0.hist && t0.h === '#tit-' + t0.sel, JSON.stringify(t0), await L.shot(page, `t-${tag}-0`, true));
  // chip settore
  for (const c of ['XLK', 'XLE', 'XLRE']) {
    await page.click(`#titChips button[data-sym="${c}"]`); await page.waitForTimeout(600);
    const s = await ev(() => ({ sel: document.querySelector('#titChips button[aria-pressed="true"]').dataset.sym, h: location.hash, bt: document.getElementById('titBubbleTitle').textContent, ht: document.getElementById('titHistTitle').textContent, focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.sym : null }));
    const bad = await L.badText(page, '#v-tit');
    R.add('T2', 'titoli', `${tag} chip ${c}`, s.sel === c && s.h === '#tit-' + c && s.bt.includes(c) && !bad.length && s.focus === c, JSON.stringify(s) + bad.join('|'));
  }
  // Indietro torna al settore precedente nella vista 7
  await page.goBack(); await page.waitForTimeout(800);
  const back = await ev(() => ({ h: location.hash, sel: document.querySelector('#titChips button[aria-pressed="true"]').dataset.sym }));
  R.add('T3', 'titoli', `${tag} Indietro torna al settore precedente`, back.h === '#tit-XLE' && back.sel === 'XLE', JSON.stringify(back));
  await page.goForward(); await page.waitForTimeout(800);
  // periodo
  for (const p of ['1M', '6M', 'YTD', '1A', '3M']) {
    await page.click(`#titPerSeg button[data-per="${p}"]`); await page.waitForTimeout(500);
    const s = await ev(() => ({ p: [...document.querySelectorAll('#titPerSeg button[aria-pressed="true"]')].map((b) => b.dataset.per), meta: document.getElementById('titMeta').textContent, ax: document.getElementById('titAx').value, prevDis: document.querySelector('#titAx option[value="prev"]').disabled }));
    const bad = await L.badText(page, '#v-tit');
    R.add('T4', 'titoli', `${tag} periodo ${p}`, s.p.length === 1 && s.p[0] === p && !bad.length, JSON.stringify(s) + bad.join('|'));
  }
  // scia
  for (const t of ['sel', 'off', 'all']) {
    await page.click(`#titTrailSeg button[data-trail="${t}"]`); await page.waitForTimeout(400);
    const n = await ev(() => document.querySelectorAll('#titSpread circle').length);
    R.add('T5', 'titoli', `${tag} scia ${t}`, (await ev((t) => document.querySelector(`#titTrailSeg button[data-trail="${t}"]`).getAttribute('aria-pressed'), t)) === 'true', `cerchi=${n}`);
  }
  // ordine
  await page.click('#titSortSeg button[data-sort="sec"]'); await page.waitForTimeout(400);
  const ordSec = await ev(() => [...document.querySelectorAll('#titSpread text')].map((t) => t.textContent).filter((t) => /^XL|^S&P|^SPX/.test(t)).join(','));
  await page.click('#titSortSeg button[data-sort="div"]'); await page.waitForTimeout(400);
  const ordDiv = await ev(() => [...document.querySelectorAll('#titSpread text')].map((t) => t.textContent).filter((t) => /^XL|^S&P|^SPX/.test(t)).join(','));
  R.add('T6', 'titoli', `${tag} ordine Settore vs Divergenza cambia l'ordine`, ordSec !== ordDiv, `sec=${ordSec} | div=${ordDiv}`);
  // asse e bolle
  for (const a of ['dd', 'prev', 'd200']) {
    await page.selectOption('#titAx', a); await page.waitForTimeout(400);
    const s = await ev(() => ({ v: document.getElementById('titAx').value, ls: localStorage.getItem('sm.titAx'), lbl: [...document.querySelectorAll('#titBubble text')].map((t) => t.textContent).filter((t) => t.length > 12).join(' | ').slice(0, 160) }));
    R.add('T7', 'titoli', `${tag} asse ${a}`, s.v === a && s.ls === JSON.stringify(a), JSON.stringify(s));
  }
  const rAt = async () => ev(() => [...document.querySelectorAll('#titBubble circle')].map((c) => c.getAttribute('r')).slice(0, 30));
  const rw = await rAt();
  await page.click('#titSizeSeg button[data-size="eq"]'); await page.waitForTimeout(400);
  const re = await rAt();
  R.add('T8', 'titoli', `${tag} bolle Uguali`, new Set(re).size < new Set(rw).size, `peso: ${new Set(rw).size} raggi diversi, uguali: ${new Set(re).size}`);
  await page.click('#titSizeSeg button[data-size="w"]'); await page.waitForTimeout(300);
  // persistenza
  await page.click('#titPerSeg button[data-per="6M"]'); await page.click('#titTrailSeg button[data-trail="sel"]'); await page.selectOption('#titAx', 'dd'); await page.waitForTimeout(300);
  await page.reload(); await page.waitForTimeout(3500);
  const ps = await ev(() => ({ per: document.querySelector('#titPerSeg button[aria-pressed="true"]').dataset.per, trail: document.querySelector('#titTrailSeg button[aria-pressed="true"]').dataset.trail, ax: document.getElementById('titAx').value, sel: document.querySelector('#titChips button[aria-pressed="true"]').dataset.sym }));
  R.add('T9', 'titoli', `${tag} scelte restano dopo la ricarica`, ps.per === '6M' && ps.trail === 'sel' && ps.ax === 'dd' && ps.sel === 'XLRE', JSON.stringify(ps));
  // tooltip della riga del dumbbell e dei titoli
  if (prof === 'desktop') {
    await ev(() => document.getElementById('titSpread').scrollIntoView({ block: 'center' }));
    const gs = await ev(() => [...document.querySelectorAll('#titSpread g')].map((g) => { const r = g.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width, r.height]; }).filter((x) => x[2] > 50));
    let tip = '';
    if (gs.length) { await page.mouse.move(gs[0][0], gs[0][1]); await page.waitForTimeout(300); tip = await ev(() => { const t = document.getElementById('titSpreadTip'); return t.hidden ? '' : t.innerText.replace(/\s+/g, ' '); }); }
    R.add('T10', 'tooltip', `${tag} tooltip riga dumbbell`, tip.length > 10, tip.slice(0, 300), await L.shot(page, `t-${tag}-spreadtip`));
    // bubble vs pain table
    await ev(() => document.getElementById('titBubble').scrollIntoView({ block: 'center' }));
    const painRow = await ev(() => { const tr = document.querySelector('#titPain tbody tr'); return tr ? { txt: tr.innerText.replace(/\s+/g, ' '), sym: tr.querySelector('a') ? tr.querySelector('a').textContent : '' } : null; });
    await page.hover('#titPain tbody tr'); await page.waitForTimeout(300);
    const hl = await ev(() => document.querySelectorAll('#titBubble .hl, #titBubble circle.on, #titBubble circle.sel, #titBubble .focus').length);
    R.add('T11', 'titoli', `${tag} passaggio su «I più in pena» evidenzia la bolla`, hl > 0, `${JSON.stringify(painRow)} evidenziati=${hl}`);
    const circ = await ev(() => [...document.querySelectorAll('#titBubble circle')].map((c) => { const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
    let bt = '';
    for (const [x, y] of circ.slice(0, 40)) { await page.mouse.move(x, y); await page.waitForTimeout(80); bt = await ev(() => { const t = document.getElementById('titBubbleTip'); return t.hidden ? '' : t.innerText.replace(/\s+/g, ' '); }); if (bt) break; }
    // confronto con la tabella dei più in pena se il titolo c'è
    const tsym = bt.split(' ')[0];
    const prow = await ev((s) => { const tr = [...document.querySelectorAll('#titPain tbody tr')].find((r) => r.innerText.includes(s)); return tr ? tr.innerText.replace(/\s+/g, ' ') : ''; }, tsym);
    R.add('T12', 'tooltip', `${tag} tooltip bolla`, bt.length > 10, `tip: ${bt.slice(0, 200)} · riga pena: ${prow.slice(0, 150)}`, await L.shot(page, `t-${tag}-bubtip`));
    // storia divergenza
    const hb = await ev(() => { const s = document.getElementById('titHist'); s.scrollIntoView({ block: 'center' }); const r = s.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    let ht = '';
    for (let f = 0.99; f > 0.6 && !/Settimana al 1[0-9]\/10\/2026/.test(ht); f -= 0.01) { await page.mouse.move(hb[0] + hb[2] * f, hb[1] + hb[3] / 2); await page.waitForTimeout(60); ht = await ev(() => { const t = document.getElementById('titHistTip'); return t.hidden ? '' : t.innerText.replace(/\s+/g, ' '); }); }
    const hn = await ev(() => document.getElementById('titHistNote').textContent);
    R.add('T13', 'tooltip', `${tag} tooltip storia della divergenza: ultimo punto = «oggi» della nota`, ht.length > 5 && ht.includes((/oggi (\S+ pp)/.exec(hn) || [])[1] || '§'), `tip: ${ht.slice(0, 200)} · nota: ${hn.slice(0, 200)}`, await L.shot(page, `t-${tag}-histtip`));
  }
  // clic su riga del dumbbell sceglie il settore
  const gsym = await ev(() => { const g = [...document.querySelectorAll('#titSpread g')].find((g) => g.getAttribute('data-k') || g.dataset.k); return g ? (g.getAttribute('data-k') || g.dataset.k) : null; });
  // link TradingView nei più in pena
  const tv = await ev(() => [...document.querySelectorAll('#titPain a')].slice(0, 3).map((a) => a.href + ' ' + a.target));
  R.add('T14', 'titoli', `${tag} ticker dei più in pena aprono TradingView in nuova scheda`, tv.length && tv.every((h) => /tradingview\.com/.test(h) && /_blank/.test(h)), tv.join(' | '));
  R.add('Z', 'console', `${tag} nessun errore`, !log.length, log.join(' | '));
  R.save();
  await ctx.close(); await b.close();
})();
