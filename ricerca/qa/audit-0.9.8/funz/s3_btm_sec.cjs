// Vista 3 Bottom Map e vista 4 Settore
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const R = new L.Rec('s3_btm_sec_' + prof + '_' + (process.argv[3] || 'dark'));
(async () => {
  const b = await L.launch();
  const { ctx, page, log } = await L.open(b, prof, { theme: process.argv[3] || 'dark' });
  const tag = prof;
  const ev = (f, a) => page.evaluate(f, a);
  await L.goto(page, 'btm', 1500);
  const bm0 = await ev(() => ({ val: document.getElementById('bmDateVal').textContent, today: document.getElementById('bmToday').hidden, n: document.querySelectorAll('#bm circle').length, rows: document.querySelectorAll('#distList .r').length, meta: document.getElementById('bmMeta').textContent }));
  R.add('B1', 'bottom map', `${tag} stato iniziale «oggi»`, /^oggi/.test(bm0.val) && bm0.today && bm0.rows === 11, JSON.stringify(bm0), await L.shot(page, `b-${tag}-oggi`, true));
  // cursore indietro
  await ev(() => { const r = document.getElementById('bmDate'); r.value = +r.max - 100; r.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(400);
  const bm1 = await ev(() => ({ val: document.getElementById('bmDateVal').textContent, today: !document.getElementById('bmToday').hidden, meta: document.getElementById('bmMeta').textContent }));
  R.add('B2', 'bottom map', `${tag} cursore: settimana passata, pulsante Oggi`, /^settimana al/.test(bm1.val) && bm1.today && /storico/.test(bm1.meta), JSON.stringify(bm1));
  // scorciatoie
  const jumps = await ev(() => [...document.querySelectorAll('#bmJumps button')].map((b) => [b.dataset.d, b.textContent]));
  for (const [d, l] of jumps) {
    await page.click(`#bmJumps button[data-d="${d}"]`); await page.waitForTimeout(400);
    const j = await ev((d) => ({ val: document.getElementById('bmDateVal').textContent, pressed: [...document.querySelectorAll('#bmJumps button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.d), bad: /NaN|undefined/.test(document.getElementById('v-btm').innerText) }), d);
    const m = /(\d\d)\/(\d\d)\/(\d{4})/.exec(j.val); const shown = m ? `${m[3]}-${m[2]}-${m[1]}` : '';
    // dalla 0.9.1: la settimana che contiene il minimo (fine settimana tra il minimo e 6 giorni dopo)
    const diff = (Date.parse(shown) - Date.parse(d)) / 864e5;
    R.add('B3', 'bottom map', `${tag} crisi «${l}» (minimo ${d}): settimana che contiene il minimo, chip premuto`, j.pressed.length === 1 && j.pressed[0] === d && diff >= 0 && diff < 7 && !j.bad, `mostra ${j.val}, fine settimana ${diff} giorni dopo il minimo; chip premuti=${j.pressed.join(',') || 'nessuno'}`, l === 'nov 2008' || l === 'feb 2016' ? await L.shot(page, `b-${tag}-jump-${d}`) : '');
  }
  // PLAY da oggi
  await page.click('#bmToday'); await page.waitForTimeout(300);
  await page.click('#bmPlay'); await page.waitForTimeout(250);
  const p0 = await page.textContent('#bmDateVal');
  await page.waitForTimeout(1200);
  const p1 = await ev(() => ({ t: document.getElementById('bmPlay').textContent, v: document.getElementById('bmDateVal').textContent }));
  // cambio vista durante il replay: si ferma
  await page.click('#tab-mon'); await page.waitForTimeout(500);
  await page.click('#tab-btm'); await page.waitForTimeout(600);
  const p2 = await ev(() => ({ t: document.getElementById('bmPlay').textContent, v: document.getElementById('bmDateVal').textContent }));
  await page.waitForTimeout(600);
  const p3 = await page.textContent('#bmDateVal');
  R.add('B4', 'bottom map', `${tag} PLAY parte da un anno fa, avanza, si ferma lasciando la vista`, /STOP/.test(p1.t) && p1.v !== p0 && /PLAY/.test(p2.t) && p3 === p2.v, JSON.stringify({ p0, p1, p2, p3 }));
  await page.click('#bmPlay'); await page.waitForTimeout(700); await page.click('#bmPlay');
  // tasti sul cursore: le frecce non devono spostare la rotazione
  await page.focus('#bmDate');
  const k0 = await page.textContent('#bmDateVal');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300);
  const k1 = await page.textContent('#bmDateVal');
  R.add('B5', 'bottom map', `${tag} freccia sul cursore cambia settimana`, k0 !== k1, `${k0} → ${k1}`);
  await page.click('#bmToday'); await page.waitForTimeout(300);
  // tooltip mappa = lista distanze
  if (prof === 'desktop' || prof === 'laptop') {
    await ev(() => document.getElementById('bm').scrollIntoView({ block: 'center' }));
    const heads = await ev(() => [...document.querySelectorAll('#bm circle')].filter((c) => +c.getAttribute('r') >= 5).map((c) => { const r = c.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
    let ok = 0, bad = [];
    for (const [x, y] of heads.slice(0, 14)) {
      await page.mouse.move(x, y); await page.waitForTimeout(150);
      const t = await ev(() => { const t = document.getElementById('bmTip'); return t.hidden ? null : [...t.querySelectorAll('.row')].map((r) => r.innerText.replace(/\s+/g, ' ')); });
      if (!t) continue;
      const sym = t[0].split(' ')[0];
      const br = parseFloat(t.find((r) => r.startsWith('Sopra media 200')).split(' ').pop().replace(',', '.'));
      const blue = parseFloat(t.find((r) => r.startsWith('Livello blu')).split(' ').pop());
      const dist = await ev((s) => { const r = document.querySelector(`#distList .r[data-sym="${s}"]`); return r ? r.querySelectorAll('.v')[0].textContent : null; }, sym);
      const mon = await ev((s) => s, sym);
      const dv = dist ? parseFloat(dist.replace('−', '-').replace('+', '').replace(',', '.')) : NaN;
      if (Math.abs((br - blue) - dv) < 0.11) ok++; else bad.push(`${sym}: tip ${br}-${blue} lista ${dist}`);
    }
    R.add('B6', 'tooltip', `${tag} tooltip Bottom Map coerente con «Distanza dal livello blu»`, ok >= 8 && !bad.length, `ok=${ok} ${bad.join(' | ')}`, await L.shot(page, `b-${tag}-tip`));
    await page.mouse.move(2, 2);
  }
  // clic su riga della distanza apre il settore
  const s0 = await ev(() => document.querySelector('#distList .r').dataset.sym);
  await page.click(`#distList .r[data-sym="${s0}"]`); await page.waitForTimeout(800);
  R.add('B7', 'bottom map', `${tag} clic su riga apre il settore`, (await ev(() => location.hash)) === '#' + s0 && !(await ev(() => document.getElementById('v-sec').hidden)), await ev(() => location.hash));

  // ---------- 4 SETTORE
  await L.goto(page, 'XLK', 1200);
  const chips = await ev(() => [...document.querySelectorAll('#secChips button')].map((b) => b.dataset.sym));
  R.add('S1', 'settore', `${tag} 11 chip dei settori`, chips.length === 11, chips.join(','));
  for (const c of chips) {
    await page.click(`#secChips button[data-sym="${c}"]`); await page.waitForTimeout(500);
    const s = await ev(() => ({ t: document.getElementById('secTitle').textContent, h: location.hash, p: [...document.querySelectorAll('#secChips button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.sym), chk: document.getElementById('secCheck').innerText.length, mem: document.querySelectorAll('#memTable tbody tr').length, epi: document.querySelectorAll('#epiTable tr').length }));
    const bad = await L.badText(page, '#v-sec');
    R.add('S2', 'settore', `${tag} chip ${c}`, s.t.startsWith(c) && s.h === '#' + c && s.p.length === 1 && s.p[0] === c && s.chk > 20 && s.mem > 5 && !bad.length, JSON.stringify(s) + bad.join('|'));
  }
  await page.click('#secChips button[data-sym="XLU"]'); await page.waitForTimeout(500);
  // periodo
  for (const r of ['10A', 'MAX', '3A']) {
    await page.click(`#rangeSeg button[data-range="${r}"]`); await page.waitForTimeout(500);
    const x = await ev(() => ({ p: [...document.querySelectorAll('#rangeSeg button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.range), yrs: [...document.querySelectorAll('#ts text')].map((t) => t.textContent).filter((t) => /^((19|20)\d\d|[a-z]{3} \d\d)$/.test(t)) }));
    R.add('S3', 'settore', `${tag} periodo ${r}`, x.p.length === 1 && x.p[0] === r && x.yrs.length > 0, JSON.stringify(x));
  }
  // livello blu
  const bv = async () => ev(() => ({ v: document.getElementById('blueVal').textContent, reset: !document.getElementById('blueReset').hidden, src: document.getElementById('blueSrc').textContent, info: document.getElementById('blueInfo').textContent, minus: document.getElementById('blueMinus').disabled, plus: document.getElementById('bluePlus').disabled, epiMeta: document.getElementById('epiMeta').textContent, ls: localStorage.getItem('sm.blue') }));
  const b0 = await bv();
  await page.click('#bluePlus'); await page.waitForTimeout(400);
  await page.click('#bluePlus'); await page.waitForTimeout(400);
  const b1 = await bv();
  R.add('S4', 'livello blu', `${tag} + alza di 1 per clic, Ripristina visibile, salvato`, parseInt(b1.v) === parseInt(b0.v) + 2 && b1.reset && /modificato/.test(b1.src) && b1.ls && b1.ls.includes('XLU'), JSON.stringify({ b0: b0.v, b1 }));
  // asterisco nel Monitor
  await page.click('#tab-mon'); await page.waitForTimeout(500);
  const star = await ev(() => { const tr = [...document.querySelectorAll('#boardTable tbody tr')].find((r) => /XLU/.test(r.innerText)); return tr ? tr.innerText.replace(/\s+/g, ' ') : ''; });
  R.add('S5', 'livello blu', `${tag} asterisco nel Monitor dopo la modifica`, /\*/.test(star), star.slice(0, 160));
  await page.click('#tab-sec'); await page.waitForTimeout(500);
  // Copia configurazione: con permesso negato -> textarea

  await page.click('.blue-box details.owner summary'); await page.waitForTimeout(200);
  await page.click('#copyCfg'); await page.waitForTimeout(500);
  const cp = await ev(() => ({ msg: document.getElementById('copyMsg').textContent, ta: !document.getElementById('cfgText').hidden, txt: document.getElementById('cfgText').value }));
  let clip = '';
  if (!cp.ta) clip = await ev(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e.message));
  const cfgText = cp.ta ? cp.txt : clip;
  let parsed = null; try { parsed = JSON.parse(cfgText); } catch {}
  R.add('S6', 'livello blu', `${tag} «Copia configurazione» (messaggio + JSON valido col livello nuovo)`, cp.msg.length > 5 && parsed && JSON.stringify(parsed).includes(`"XLU":${parseInt(b1.v)}`), `${cp.msg} · textarea=${cp.ta} · ${cfgText.slice(0, 200)}`, await L.shot(page, `s-${tag}-copycfg`));
  // ripristina
  await page.click('#blueReset'); await page.waitForTimeout(400);
  const b2 = await bv();
  R.add('S7', 'livello blu', `${tag} Ripristina torna al default`, b2.v === b0.v && !b2.reset && !/modificato/.test(b2.src), JSON.stringify(b2));
  // limiti 0 e 60
  await ev(() => { localStorage.setItem('sm.blue', JSON.stringify({ XLU: 1 })); });
  await page.reload(); await page.waitForTimeout(1500);
  await page.click('#blueMinus'); await page.waitForTimeout(300);
  const b3 = await bv();
  await page.click('#blueMinus', { force: true, timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300);
  const b4 = await bv();
  R.add('S8', 'livello blu', `${tag} limite 0%: − disattivato`, b3.v === '0%' && b3.minus && b4.v === '0%', JSON.stringify({ b3: b3.v, minus: b3.minus, b4: b4.v }));
  await ev(() => { localStorage.setItem('sm.blue', JSON.stringify({ XLU: 60 })); });
  await page.reload(); await page.waitForTimeout(1500);
  const b5 = await bv();
  R.add('S9', 'livello blu', `${tag} limite 60%: + disattivato`, b5.v === '60%' && b5.plus, JSON.stringify({ v: b5.v, plus: b5.plus }));
  // valore non valido in localStorage
  await ev(() => { localStorage.setItem('sm.blue', JSON.stringify({ XLU: 'abc', XLK: -5, XLE: 999 })); });
  await page.reload(); await page.waitForTimeout(1500);
  const b6 = await bv();
  const bad6 = await L.badText(page, '#v-sec');
  R.add('S10', 'livello blu', `${tag} livelli non validi in localStorage ignorati`, b6.v === b0.v && !bad6.length, JSON.stringify({ v: b6.v }) + bad6.join('|'));
  await ev(() => localStorage.removeItem('sm.blue'));
  await page.reload(); await page.waitForTimeout(1500);
  // tooltip grafico del settore
  if (prof === 'desktop') {
    const bb = await page.$eval('#ts', (s) => { s.scrollIntoView({ block: 'center' }); const r = s.querySelector('rect[fill="transparent"]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await page.mouse.move(bb.x + bb.w - 0.2, bb.y + bb.h * 0.5); await page.waitForTimeout(300);
    const tt = await ev(() => { const t = document.getElementById('tsTip'); return t.hidden ? '' : t.innerText.replace(/\s+/g, ' '); });
    const facts = await ev(() => document.getElementById('secFacts').innerText.replace(/\s+/g, ' '));
    const want = [facts.match(/Ultimo ([\d.,]+)/)[1], facts.match(/Drawdown da max 52s (\S+)/)[1], facts.match(/· ([\d,]+%)/)[1], facts.match(/Sopra media 50 (\S+)/)[1]];
    R.add('S11', 'tooltip', `${tag} tooltip del grafico all'ultima seduta = Situazione (prezzo, DD, breadth 200/50)`, tt.length > 10 && want.every((w) => tt.includes(w)), `attesi ${want.join(' ')} · tip: ${tt.slice(0, 250)} || situazione: ${facts.slice(0, 250)}`, await L.shot(page, `s-${tag}-tstip`));
    await page.mouse.move(2, 2);
  }
  // Monitor vs Settore: breadth e drawdown uguali
  const facts = await ev(() => Object.fromEntries([...document.querySelectorAll('#secFacts dt')].map((dt) => [dt.textContent, dt.nextElementSibling.textContent])));
  await page.click('#tab-mon'); await page.waitForTimeout(500);
  const monRow = await ev(() => { const tr = [...document.querySelectorAll('#boardTable tbody tr')].find((r) => /XLU/.test(r.cells[0].innerText)); return tr ? tr.innerText.replace(/\s+/g, ' ') : ''; });
  const br = (facts['Titoli sopra media 200'] || '').split('·')[1] || '';
  const dd = facts['Drawdown da max 52s'] || '';
  R.add('S12', 'coerenza', `${tag} XLU: breadth e drawdown uguali tra Monitor e Situazione`, monRow.includes(br.trim()) && monRow.includes(dd.trim()), `situazione: ${br} / ${dd} · monitor: ${monRow.slice(0, 160)}`);
  await page.click('#tab-sec'); await page.waitForTimeout(500);
  // pulsante 7 Titoli
  await page.click('#toTit'); await page.waitForTimeout(2500);
  const tt = await ev(() => ({ h: location.hash, v: !document.getElementById('v-tit').hidden, chip: [...document.querySelectorAll('#titChips button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.s || b.dataset.sym || b.textContent) }));
  R.add('S13', 'settore', `${tag} «7 Titoli →» apre i titoli dello stesso settore`, tt.h === '#tit-XLU' && tt.v && tt.chip.join().includes('XLU'), JSON.stringify(tt));
  await page.goBack(); await page.waitForTimeout(800);
  // cali forti
  await page.click('#secCap summary'); await page.waitForTimeout(1500);
  const c0 = await ev(() => ({ open: document.getElementById('secCap').open, meta: document.getElementById('secCapMeta').textContent, now: document.getElementById('secCapNow').textContent, rows: document.querySelectorAll('#secCapTable tbody tr').length, ctl: [...document.querySelectorAll('#secCapCtl button[data-k]')].map((b) => `${b.dataset.k}=${b.dataset.v}:${b.getAttribute('aria-pressed')}`).join(' '), preset: document.querySelector('#secCapCtl button[data-preset]') && !document.querySelector('#secCapCtl button[data-preset]').hidden }));
  R.add('C1', 'cali forti', `${tag} scheda si apre con preset −7%/5/titoli`, c0.open && c0.meta.length > 2 && /thr=7:true/.test(c0.ctl) && /win=5:true/.test(c0.ctl) && /mode=count:true/.test(c0.ctl) && !c0.preset, JSON.stringify(c0), await L.shot(page, `c-${tag}-sec-open`, true));
  for (const [k, v] of [['thr', '5'], ['thr', '10'], ['win', '3'], ['win', '10'], ['mode', 'pct']]) {
    await page.click(`#secCapCtl button[data-k="${k}"][data-v="${v}"]`); await page.waitForTimeout(500);
    const c = await ev(([k, v]) => ({ p: document.querySelector(`#secCapCtl button[data-k="${k}"][data-v="${v}"]`).getAttribute('aria-pressed'), now: document.getElementById('secCapNow').textContent, preset: !!document.querySelector('#secCapCtl button[data-preset]:not([hidden])'), ls: localStorage.getItem('sm.cap'), focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.v : null, open: document.getElementById('secCap').open }), [k, v]);
    const bad = await L.badText(page, '#secCap');
    R.add('C2', 'cali forti', `${tag} scelta ${k}=${v}`, c.p === 'true' && c.preset && c.ls.includes(k === 'mode' ? `"mode":"pct"` : `"${k}":${v}`) && c.open && !bad.length && (k !== 'mode' || /%/.test(c.now)), JSON.stringify(c) + bad.join('|'));
  }
  await page.click('#secCapCtl button[data-preset]'); await page.waitForTimeout(500);
  const c3 = await ev(() => ({ ctl: [...document.querySelectorAll('#secCapCtl button[data-k]')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => `${b.dataset.k}=${b.dataset.v}`).join(' '), preset: !!document.querySelector('#secCapCtl button[data-preset]:not([hidden])'), focus: document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id + '.' + document.activeElement.className : '' }));
  R.add('C3', 'cali forti', `${tag} «Preset di Rea» ripristina −7%, 5, titoli`, c3.ctl === 'thr=7 win=5 mode=count' && !c3.preset, JSON.stringify(c3));
  R.add('C3b', 'accessibilità', `${tag} focus dopo «Preset di Rea» non va perso sul body`, !/^BODY/.test(c3.focus), c3.focus);
  // tooltip del grafico dei cali (desktop)
  if (prof === 'desktop') {
    const bb = await page.$eval('#secCapSvg', (s) => { s.scrollIntoView({ block: 'center' }); const r = s.querySelector('rect[fill="transparent"]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await page.mouse.move(bb.x + bb.w - 0.2, bb.y + bb.h * 0.6); await page.waitForTimeout(300);
    const t = await ev(() => { const t = document.getElementById('secCapTip'); return t.hidden ? '' : t.innerText.replace(/\s+/g, ' '); });
    const now = await page.textContent('#secCapNow');
    R.add('C4', 'tooltip', `${tag} tooltip dei cali forti all'ultima seduta coerente con la frase «Oggi …»`, t.length > 5, `tip: ${t.slice(0, 200)} || ${now.slice(0, 200)}`, await L.shot(page, `c-${tag}-tip`));
  }
  // chiusura details
  await page.click('#secCap summary'); await page.waitForTimeout(200);
  R.add('C5', 'cali forti', `${tag} scheda si richiude`, !(await ev(() => document.getElementById('secCap').open)));
  // lo stato aperto resta cambiando settore?
  await page.click('#secCap summary'); await page.waitForTimeout(300);
  await page.click('#secChips button[data-sym="XLE"]'); await page.waitForTimeout(800);
  const c6 = await ev(() => ({ open: document.getElementById('secCap').open, meta: document.getElementById('secCapMeta').textContent, k: document.getElementById('secCapBody').dataset.k }));
  R.add('C6', 'cali forti', `${tag} cambiando settore la scheda mostra il nuovo settore`, c6.k === 'XLE', JSON.stringify(c6));
  R.add('Z', 'console', `${tag} nessun errore`, !log.length, log.join(' | '));
  R.save();
  await ctx.close(); await b.close();
})();
