// Vista 5 Alert e vista 6 Indici
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const R = new L.Rec('s4_alr_idx_' + prof + '_' + (process.argv[3] || 'dark'));
(async () => {
  const b = await L.launch();
  const { ctx, page, log } = await L.open(b, prof, { theme: process.argv[3] || 'dark' });
  const tag = prof;
  const ev = (f, a) => page.evaluate(f, a);
  // ---- 5 Alert
  await L.goto(page, 'alr', 1500);
  const a0 = await ev(() => ({ kpis: document.querySelectorAll('#alertStats .kpi').length, n: document.querySelectorAll('#alertLog li').length, cnt: document.getElementById('alertCount').textContent, sent: document.getElementById('sentInfo').textContent, rules: document.querySelectorAll('#rulesList li').length, first: document.querySelector('#alertLog li') && document.querySelector('#alertLog li').innerText.replace(/\s+/g, ' ') }));
  R.add('A1', 'alert', `${tag} registro, riquadri e regole`, a0.kpis === 4 && a0.n > 0 && a0.n <= 60 && a0.rules === 5 && a0.sent.length > 10, JSON.stringify(a0), await L.shot(page, `a-${tag}`, true));
  // ordine dal più recente
  const dates = await ev(() => [...document.querySelectorAll('#alertLog .when')].map((w) => w.textContent.split('/').reverse().join('-')));
  R.add('A2', 'alert', `${tag} ordinati dal più recente`, dates.every((d, i) => !i || dates[i - 1] >= d), dates.slice(0, 5).join(','));
  const who = await ev(() => document.querySelector('#alertLog .who').dataset.sym);
  await page.click('#alertLog .who'); await page.waitForTimeout(700);
  R.add('A3', 'alert', `${tag} clic sul ticker apre il settore`, (await ev(() => location.hash)) === '#' + who, await ev(() => location.hash));
  // ---- 6 Indici
  await L.goto(page, 'idx', 4000);
  const i0 = await ev(() => ({ load: document.getElementById('ixLoading').hidden, body: !document.getElementById('ixBody').hidden, rows: document.querySelectorAll('#ixTable tbody tr').length, meta: document.getElementById('ixPickMeta').textContent, chips: document.querySelectorAll('#ixPick button').length, main: document.getElementById('ixPickMain').getAttribute('aria-pressed'), all: document.getElementById('ixPickAll').getAttribute('aria-pressed'), kpis: [...document.querySelectorAll('#ixKpis .kpi .k')].map((k) => k.textContent) }));
  R.add('I1', 'indici', `${tag} apertura: 10 principali, 22 chip, «Principali» premuto`, i0.body && i0.rows === 10 && i0.chips === 22 && i0.main === 'true' && i0.all === 'false', JSON.stringify(i0), await L.shot(page, `i-${tag}-0`, true));
  R.add('I1b', 'indici', `${tag} riquadro «Cali forti in allerta» presente`, i0.kpis.some((k) => /Cali forti/.test(k)), i0.kpis.join(' | '));
  // colonna cali forti
  const capcol = await ev(() => [...document.querySelectorAll('#ixTable tbody tr')].map((tr) => tr.cells[0].innerText.split('\n')[0] + ':' + tr.cells[6].innerText + ' [' + (tr.cells[6].getAttribute('title') || '').slice(0, 60) + ']'));
  R.add('I2', 'indici', `${tag} colonna «Cali forti» valorizzata (nessun «…»)`, capcol.every((c) => !/:…/.test(c)), capcol.join(' | '));
  // Tutti
  await page.click('#ixPickAll'); await page.waitForTimeout(800);
  const i1 = await ev(() => ({ rows: document.querySelectorAll('#ixTable tbody tr').length, all: document.getElementById('ixPickAll').getAttribute('aria-pressed'), meta: document.getElementById('ixPickMeta').textContent, ls: localStorage.getItem('sm.ixShown') }));
  R.add('I3', 'indici', `${tag} «Tutti» mostra 22 indici e salva`, i1.rows === 22 && i1.all === 'true' && i1.ls && JSON.parse(i1.ls).length === 22, JSON.stringify(i1));
  const bad1 = await L.badText(page, '#v-idx');
  R.add('I3b', 'indici', `${tag} 22 indici senza NaN`, !bad1.length, bad1.join('|'), await L.shot(page, `i-${tag}-all`, true));
  // Taiwan: cali forti «—» con spiegazione
  const tw = await ev(() => { const tr = [...document.querySelectorAll('#ixTable tbody tr')].find((r) => /TWII|Taiwan/.test(r.innerText)); return tr ? tr.cells[6].innerText + ' | ' + tr.cells[6].getAttribute('title') : 'assente'; });
  R.add('I4', 'indici', `${tag} Taiwan senza cali forti, con spiegazione`, /—/.test(tw) && tw.length > 10, tw);
  // toggle chip
  const chip = await ev(() => document.querySelector('#ixPick button[aria-pressed="true"]').dataset.ix);
  await page.click(`#ixPick button[data-ix="${chip}"]`); await page.waitForTimeout(500);
  const i2 = await ev((c) => ({ rows: document.querySelectorAll('#ixTable tbody tr').length, p: document.querySelector(`#ixPick button[data-ix="${c}"]`).getAttribute('aria-pressed'), all: document.getElementById('ixPickAll').getAttribute('aria-pressed'), focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.ix : null }), chip);
  R.add('I5', 'indici', `${tag} clic su chip toglie l'indice (focus resta)`, i2.rows === 21 && i2.p === 'false' && i2.all === 'false' && i2.focus === chip, JSON.stringify(i2));
  // Principali
  await page.click('#ixPickMain'); await page.waitForTimeout(500);
  const i3 = await ev(() => ({ rows: document.querySelectorAll('#ixTable tbody tr').length, main: document.getElementById('ixPickMain').getAttribute('aria-pressed') }));
  R.add('I6', 'indici', `${tag} «Principali» torna a 10`, i3.rows === 10 && i3.main === 'true', JSON.stringify(i3));
  // togliere tutti: l'ultimo resta
  const pressed = await ev(() => [...document.querySelectorAll('#ixPick button[aria-pressed="true"]')].map((b) => b.dataset.ix));
  for (const k of pressed) { await page.click(`#ixPick button[data-ix="${k}"]`); await page.waitForTimeout(150); }
  const i4 = await ev(() => ({ rows: document.querySelectorAll('#ixTable tbody tr').length, n: document.querySelectorAll('#ixPick button[aria-pressed="true"]').length, meta: document.getElementById('ixPickMeta').textContent }));
  const bad4 = await L.badText(page, '#v-idx');
  R.add('I7', 'indici', `${tag} non si possono togliere tutti (resta 1)`, i4.rows === 1 && i4.n === 1 && !bad4.length, JSON.stringify(i4) + bad4.join('|'), await L.shot(page, `i-${tag}-one`, true));
  await page.click('#ixPickMain'); await page.waitForTimeout(500);
  // clic riga: dettaglio
  const rowK = await ev(() => document.querySelectorAll('#ixTable tbody tr')[3].dataset.ix);
  await page.click(`#ixTable tbody tr[data-ix="${rowK}"]`); await page.waitForTimeout(1200);
  const d0 = await ev(() => ({ t: document.getElementById('ixTitle').textContent, chip: document.querySelector('#ixChips button[aria-pressed="true"]').dataset.ix, ls: localStorage.getItem('sm.ixSel'), check: document.getElementById('ixCheck').innerText.length, epi: document.querySelectorAll('#ixEpiTable tr').length, facts: document.getElementById('ixFacts').innerText.length }));
  R.add('I8', 'indici', `${tag} clic su riga apre il dettaglio`, d0.chip === rowK && d0.check > 20 && d0.facts > 20 && d0.ls === JSON.stringify(rowK), JSON.stringify(d0));
  // coerenza tabella / dettaglio
  const tb = await ev((k) => { const tr = document.querySelector(`#ixTable tbody tr[data-ix="${k}"]`); const f = (t) => (t.match(/[−+-]?[\d.]+,\d+%/) || [t.split('\n')[0]])[0]; return [f(tr.cells[2].innerText), f(tr.cells[4].innerText), tr.cells[7].innerText]; }, rowK);
  const facts = await ev(() => document.getElementById('ixFacts').innerText.replace(/\s+/g, ' '));
  R.add('I9', 'coerenza', `${tag} ${rowK}: breadth, drawdown e ultimo uguali tra tabellone e Situazione`, tb.slice(0, 2).every((x) => facts.includes(x.trim())), `tabella ${tb.join(' / ')} · situazione ${facts.slice(0, 300)}`);
  // chip del dettaglio
  const chips = await ev(() => [...document.querySelectorAll('#ixChips button')].map((b) => b.dataset.ix));
  for (const c of chips) {
    await page.click(`#ixChips button[data-ix="${c}"]`); await page.waitForTimeout(450);
    const s = await ev(() => ({ chip: document.querySelector('#ixChips button[aria-pressed="true"]').dataset.ix, t: document.getElementById('ixTitle').textContent }));
    const bad = await L.badText(page, '#v-idx');
    R.add('I10', 'indici', `${tag} chip dettaglio ${c}`, s.chip === c && !bad.length, JSON.stringify(s) + bad.join('|'));
  }
  // periodo
  for (const r of ['10A', 'MAX', '3A']) {
    await page.click(`#ixRange button[data-range="${r}"]`); await page.waitForTimeout(400);
    const p = await ev(() => [...document.querySelectorAll('#ixRange button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.range).join());
    R.add('I11', 'indici', `${tag} periodo ${r}`, p === r, p);
  }
  // livello blu indice
  const bv = () => ev(() => ({ v: document.getElementById('ixBlueVal').textContent, reset: !document.getElementById('ixBlueReset').hidden, src: document.getElementById('ixBlueSrc').textContent, ls: localStorage.getItem('sm.ixBlue') }));
  const b0 = await bv();
  await page.click('#ixBluePlus'); await page.waitForTimeout(400);
  const b1 = await bv();
  const star = await ev(() => { const k = document.querySelector('#ixChips button[aria-pressed="true"]').dataset.ix; const tr = document.querySelector(`#ixTable tbody tr[data-ix="${k}"]`); return tr ? tr.cells[3].innerText : 'riga assente'; });
  await page.click('#ixBlueMinus'); await page.waitForTimeout(300); await page.click('#ixBlueMinus'); await page.waitForTimeout(300);
  const b2 = await bv();
  await page.click('#ixBlueReset'); await page.waitForTimeout(300);
  const b3 = await bv();
  R.add('I12', 'livello blu', `${tag} indice: +, −, asterisco in tabella, Ripristina`, parseInt(b1.v) === parseInt(b0.v) + 1 && b1.reset && /\*/.test(star) && parseInt(b2.v) === parseInt(b0.v) - 1 && b3.v === b0.v && !b3.reset, JSON.stringify({ b0: b0.v, b1: b1.v, star, b2: b2.v, b3 }));
  // mappa indici: cursore, jumps, play, oggi
  await ev(() => { const r = document.getElementById('ixDate'); r.value = 50; r.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(400);
  const m1 = await ev(() => ({ v: document.getElementById('ixDateVal').textContent, meta: document.getElementById('ixMapMeta').textContent, today: !document.getElementById('ixToday').hidden, dist: document.querySelectorAll('#ixDist .r').length }));
  R.add('I13', 'mappa indici', `${tag} data passata: nota con gli indici senza dati`, /settimana al/.test(m1.v) && m1.today && /storico/.test(m1.meta), JSON.stringify(m1), await L.shot(page, `i-${tag}-map-past`));
  const jumps = await ev(() => [...document.querySelectorAll('#ixJumps button')].map((b) => [b.dataset.d, b.textContent]));
  for (const [d, l] of jumps) {
    await page.click(`#ixJumps button[data-d="${d}"]`); await page.waitForTimeout(350);
    const j = await ev(() => ({ v: document.getElementById('ixDateVal').textContent, pressed: [...document.querySelectorAll('#ixJumps button[aria-pressed="true"]')].map((b) => b.dataset.d) }));
    const m = /(\d\d)\/(\d\d)\/(\d{4})/.exec(j.v); const diff = m ? (Date.parse(`${m[3]}-${m[2]}-${m[1]}`) - Date.parse(d)) / 864e5 : NaN;
    R.add('I14', 'mappa indici', `${tag} crisi «${l}»: settimana che contiene il minimo, chip premuto`, j.pressed.length === 1 && j.pressed[0] === d && diff >= 0 && diff < 7, JSON.stringify(j) + ` diff=${diff}`);
  }
  await page.click('#ixToday'); await page.waitForTimeout(300);
  await page.click('#ixPlay'); await page.waitForTimeout(1200);
  const pl = await ev(() => ({ t: document.getElementById('ixPlay').textContent, v: document.getElementById('ixDateVal').textContent }));
  await page.click('#ixPlay'); await page.waitForTimeout(300);
  const pl2 = await ev(() => ({ t: document.getElementById('ixPlay').textContent, v: document.getElementById('ixDateVal').textContent }));
  R.add('I15', 'mappa indici', `${tag} PLAY/STOP`, /STOP/.test(pl.t) && /settimana al/.test(pl.v) && /PLAY/.test(pl2.t), JSON.stringify({ pl, pl2 }));
  await page.click('#ixToday'); await page.waitForTimeout(300);
  // tooltip mappa indici = distanza
  if (prof === 'desktop') {
    await ev(() => document.getElementById('ixMap').scrollIntoView({ block: 'center' }));
    const heads = await ev(() => [...document.querySelectorAll('#ixMap circle')].filter((c) => +c.getAttribute('r') >= 5).map((c) => { const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
    let ok = 0, bad = [];
    for (const [x, y] of heads.slice(0, 12)) {
      await page.mouse.move(x, y); await page.waitForTimeout(150);
      const t = await ev(() => { const t = document.getElementById('ixMapTip'); return t.hidden ? null : [...t.querySelectorAll('.row')].map((r) => r.innerText.replace(/\s+/g, ' ')); });
      if (!t) continue;
      const k = t[0].split(' ')[0];
      const br = parseFloat(t.find((r) => r.startsWith('Sopra media 200')).split(' ').pop().replace(',', '.'));
      const blue = parseFloat(t.find((r) => r.startsWith('Livello blu')).split(' ').pop());
      const dist = await ev((k) => { const r = document.querySelector(`#ixDist .r[data-ix="${k}"]`); return r ? r.querySelectorAll('.v')[0].textContent : null; }, k);
      const dv = dist ? parseFloat(dist.replace('−', '-').replace('+', '').replace(',', '.')) : NaN;
      const tbl = await ev((k) => { const tr = document.querySelector(`#ixTable tbody tr[data-ix="${k}"]`); return tr ? tr.cells[2].innerText.split('\n')[0] : null; }, k);
      if (Math.abs((br - blue) - dv) < 0.11 && tbl && parseFloat(tbl.replace(',', '.')) === br) ok++; else bad.push(`${k}: tip ${br}-${blue} lista ${dist} tabella ${tbl}`);
    }
    R.add('I16', 'tooltip', `${tag} tooltip mappa indici = distanza = tabellone`, ok >= 6 && !bad.length, `ok=${ok} ${bad.join(' | ')}`, await L.shot(page, `i-${tag}-tip`));
    await page.mouse.move(2, 2);
  }
  // cali forti indici
  await page.click(`#ixChips button[data-ix="${chips[0]}"]`); await page.waitForTimeout(400);
  await page.click('#ixCap summary'); await page.waitForTimeout(800);
  const c0 = await ev(() => ({ open: document.getElementById('ixCap').open, meta: document.getElementById('ixCapMeta').textContent, now: document.getElementById('ixCapNow').textContent, rows: document.querySelectorAll('#ixCapTable tbody tr').length, base: document.getElementById('ixCapBase').textContent }));
  R.add('IC1', 'cali forti', `${tag} scheda indice ${chips[0]}`, c0.open && c0.now.length > 10 && c0.rows > 0, JSON.stringify(c0), await L.shot(page, `i-${tag}-cap`, true));
  await page.click('#ixCapCtl button[data-k="thr"][data-v="5"]'); await page.waitForTimeout(500);
  const capcol2 = await ev(() => [...document.querySelectorAll('#ixTable tbody tr')].map((tr) => tr.cells[6].getAttribute('title') || '').join('|'));
  R.add('IC2', 'cali forti', `${tag} la scelta −5% si riflette anche nella colonna della tabella`, /almeno il 5%/.test(capcol2), capcol2.slice(0, 200));
  // la scelta vale anche per la scheda dei settori (stesso store)
  await page.click('#ixCapCtl button[data-preset]'); await page.waitForTimeout(400);
  // Taiwan dettaglio: scheda non disponibile
  await page.click('#ixPickAll'); await page.waitForTimeout(600);
  const twk = await ev(() => [...document.querySelectorAll('#ixPick button')].find((b) => /Taiwan/i.test(b.title)).dataset.ix);
  await page.click(`#ixChips button[data-ix="${twk}"]`); await page.waitForTimeout(600);
  const tw2 = await ev(() => ({ meta: document.getElementById('ixCapMeta').textContent, note: document.getElementById('ixCapNote').textContent, ctl: document.getElementById('ixCapCtl').hidden }));
  R.add('IC3', 'cali forti', `${tag} Taiwan: scheda «non disponibile» con motivo`, /non disponibile/.test(tw2.meta) && tw2.note.length > 10 && tw2.ctl, JSON.stringify(tw2));
  // Percentile con zero cali (semantica)
  const zero = await ev(() => [...document.querySelectorAll('#ixTable tbody tr')].map((tr) => [tr.dataset.ix, tr.cells[6].innerText, tr.cells[6].getAttribute('title') || '']).filter(([, , t]) => /^Cali forti: 0 cali/.test(t)).map(([k, v, t]) => `${k} ${v} (${t.slice(0, 90)})`));
  R.add('IC4', 'cali forti', `${tag} con 0 cali il percentile mostrato non deve sembrare alto`, !zero.some((z) => / (\d\d)°/.test(z) && +/ (\d\d)°/.exec(z)[1] >= 50), zero.slice(0, 6).join(' | '));
  // ricarica: selezione e indici mostrati restano
  await page.reload(); await page.waitForTimeout(4000);
  const r1 = await ev(() => ({ rows: document.querySelectorAll('#ixTable tbody tr').length, sel: document.querySelector('#ixChips button[aria-pressed="true"]') && document.querySelector('#ixChips button[aria-pressed="true"]').dataset.ix }));
  R.add('I17', 'indici', `${tag} dopo ricarica restano «Tutti» e l'indice scelto (anche non principale)`, r1.rows === 22 && r1.sel === twk, JSON.stringify(r1) + ' atteso ' + twk);
  R.add('Z', 'console', `${tag} nessun errore`, !log.length, log.join(' | '));
  R.save();
  await ctx.close(); await b.close();
})();
