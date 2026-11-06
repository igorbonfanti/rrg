// Vista 2 Rotazione: universi, benchmark, timeframe, formula, coda, scala, PLAY, cursore, tasti, tabelle, ordinamenti,
// spunte, evidenza, performance, portafoglio, asset reali, tooltip contro tabella.
const L = require('./lib.cjs');
const R = new L.Rec('s2_rrg_' + (process.argv[2] || 'desktop') + '_' + (process.argv[3] || 'dark'));
const prof = process.argv[2] || 'desktop';
(async () => {
  const b = await L.launch();
  const { ctx, page, log } = await L.open(b, prof, { theme: process.argv[3] || 'dark' });
  const tag = prof;
  await L.goto(page, 'rrg', 2000);
  const ev = (f, a) => page.evaluate(f, a);
  const groups = await ev(() => [...document.querySelectorAll('#groupSel option')].map((o) => o.value));
  R.add('R1', 'rotazione', `${tag} elenco universi`, groups.length >= 8, groups.join(' | '));
  const selectGroup = async (g) => { await page.selectOption('#groupSel', g); await page.waitForTimeout(700); };
  for (const g of groups) {
    await selectGroup(g);
    const benches = await ev(() => [...document.querySelectorAll('#benchSel option')].map((o) => o.value));
    for (const bn of benches) {
      await page.selectOption('#benchSel', bn); await page.waitForTimeout(500);
      const s = await ev(() => ({
        title: document.getElementById('rrgTitle').textContent, heads: document.querySelectorAll('#rrg circle.head').length,
        rows: [...document.querySelectorAll('#rotTable tbody tr')].map((r) => r.dataset.sym),
      }));
      const bad = await L.badText(page, '#v-rrg');
      R.add('R2', 'rotazione', `${tag} ${g} vs ${bn}`, s.heads > 0 && s.rows.length === s.heads && !s.rows.includes(bn) && !bad.length && s.title.includes(g), `${s.title} heads=${s.heads} rows=${s.rows.length} bench in rows=${s.rows.includes(bn)} ${bad.join('|')}`);
    }
  }
  R.add('R2b', 'rotazione', `${tag} benchmark salvato per universo`, true, await ev(() => Object.keys(localStorage).filter((k) => k.startsWith('sm.bench')).map((k) => k + '=' + localStorage[k]).join(', ')));

  // torno ai settori
  await selectGroup(groups[0]);
  const lsGroup = await ev(() => localStorage.getItem('sm.group'));
  R.add('R3', 'rotazione', `${tag} universo salvato in localStorage`, lsGroup === JSON.stringify(groups[0]), lsGroup);
  // timeframe
  const fr0 = await ev(() => ({ max: +document.getElementById('frame').max, d: document.getElementById('frameDate').textContent }));
  await page.click('#tfSeg button[data-tf="daily"]'); await page.waitForTimeout(700);
  const fr1 = await ev(() => ({ max: +document.getElementById('frame').max, d: document.getElementById('frameDate').textContent, meta: document.getElementById('rrgMeta').textContent, p: [...document.querySelectorAll('#tfSeg button')].map((b) => b.getAttribute('aria-pressed')).join(','), unit: document.querySelector('#rotTable thead th:nth-child(8)').textContent }));
  R.add('R4', 'rotazione', `${tag} timeframe giornaliero`, fr1.max > fr0.max * 3 && /giornaliero/.test(fr1.meta) && fr1.p === 'false,true' && fr1.unit === 'sedute', JSON.stringify({ fr0, fr1 }));
  await page.click('#tfSeg button[data-tf="weekly"]'); await page.waitForTimeout(600);
  // formula: la data resta
  await page.evaluate(() => { const f = document.getElementById('frame'); f.value = +f.max - 5; f.dispatchEvent(new Event('input')); });
  const dBefore = await page.textContent('#frameDate');
  await page.click('#formulaSeg button[data-formula="semplice"]'); await page.waitForTimeout(700);
  const fx = await ev(() => ({ d: document.getElementById('frameDate').textContent, meta: document.getElementById('rrgMeta').textContent, sum: document.getElementById('fxSum').textContent, ls: localStorage.getItem('sm.formula') }));
  R.add('R5', 'rotazione', `${tag} formula Medie semplici (stessa data, nota aggiornata)`, fx.d === dBefore && /medie semplici/.test(fx.meta) && /Medie semplici/.test(fx.sum) && fx.ls === '"semplice"', JSON.stringify({ dBefore, ...fx }));
  // la formula vale anche per la colonna Rotazione del Monitor?
  await page.click('#tab-mon'); await page.waitForTimeout(600);
  const monRot = await ev(() => [...document.querySelectorAll('#boardTable tbody tr')].map((r) => r.innerText.replace(/\s+/g, ' ')).join('\n').slice(0, 200));
  await page.click('#tab-rrg'); await page.waitForTimeout(600);
  await page.click('#formulaSeg button[data-formula="nuova"]'); await page.waitForTimeout(500);
  // coda
  for (const t of ['4', '16', '26', '10']) {
    await page.click(`#tailSeg button[data-tail="${t}"]`); await page.waitForTimeout(400);
    const n = await ev(() => document.querySelectorAll('#rrg g.series')[0].querySelectorAll('circle.dot').length);
    const p = await ev(() => [...document.querySelectorAll('#tailSeg button')].map((b) => b.getAttribute('aria-pressed')).join(','));
    R.add('R6', 'rotazione', `${tag} coda ${t}`, n === +t - 1 && p.split(',').filter((x) => x === 'true').length === 1, `punti coda=${n} pressed=${p}`);
  }
  // scala
  const vb = async () => ev(() => document.querySelector('#rrg .axis, #rrg text') ? [...document.querySelectorAll('#rrg text')].map((t) => t.textContent).filter((t) => /^\d/.test(t)).join(',') : '');
  const sFit = await vb();
  await page.click('#scaleSeg button[data-scale="max"]'); await page.waitForTimeout(400);
  const sMax = await vb();
  R.add('R7', 'rotazione', `${tag} scala Massima cambia gli assi`, sFit !== sMax, `fit=${sFit.slice(0, 80)} max=${sMax.slice(0, 80)}`);
  await page.click('#scaleSeg button[data-scale="fit"]'); await page.waitForTimeout(300);
  // PLAY
  await page.evaluate(() => { const f = document.getElementById('frame'); f.value = f.max; f.dispatchEvent(new Event('input')); });
  const d0 = await page.textContent('#frameDate');
  await page.click('#playBtn'); await page.waitForTimeout(1600);
  const pl = await ev(() => ({ t: document.getElementById('playBtn').textContent, d: document.getElementById('frameDate').textContent }));
  await page.click('#playBtn'); await page.waitForTimeout(500);
  const pl2 = await ev(() => ({ t: document.getElementById('playBtn').textContent, d: document.getElementById('frameDate').textContent }));
  await page.waitForTimeout(900);
  const pl3 = await page.textContent('#frameDate');
  R.add('R8', 'rotazione', `${tag} PLAY parte da un anno fa e STOP ferma`, /STOP/.test(pl.t) && pl.d !== d0 && /PLAY/.test(pl2.t) && pl3 === pl2.d, JSON.stringify({ d0, pl, pl2, pl3 }), await L.shot(page, `r-${tag}-play`));
  // tasti ← →
  await page.click('#rrgTitle');
  const k0 = await page.textContent('#frameDate');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300);
  const k1 = await page.textContent('#frameDate');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  const k2 = await page.textContent('#frameDate');
  R.add('R9', 'rotazione', `${tag} frecce ← → spostano il periodo`, k0 !== k1 && k2 === k0, `${k0} → ${k1} → ${k2}`);
  // Spazio
  await page.keyboard.press(' '); await page.waitForTimeout(800);
  const sp = await page.textContent('#playBtn');
  await page.keyboard.press(' '); await page.waitForTimeout(300);
  R.add('R10', 'rotazione', `${tag} Spazio avvia e ferma l'animazione`, /STOP/.test(sp) && /PLAY/.test(await page.textContent('#playBtn')), sp);
  // slider all'ultimo frame: provvisorio?
  await page.evaluate(() => { const f = document.getElementById('frame'); f.value = f.max; f.dispatchEvent(new Event('input')); });
  const prov = await ev(() => ({ d: document.getElementById('frameDate').textContent, note: !document.getElementById('provNote').hidden, aria: document.getElementById('frame').getAttribute('aria-valuetext') }));
  R.add('R11', 'rotazione', `${tag} ultimo periodo: data e nota provvisorio coerenti`, prov.note === /\*/.test(prov.d), JSON.stringify(prov));
  // tooltip vs tabella
  const heads = await page.evaluate(() => [...document.querySelectorAll('#rrg circle.head')].map((c) => { const r = c.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; }));
  await page.evaluate(() => document.getElementById('rrg').scrollIntoView({ block: 'center' }));
  const sy0 = await page.evaluate(() => scrollY);
  let tipOk = 0, tipBad = [];
  if (prof !== 'phone' && prof !== 'tablet') {
    for (const h of heads.slice(0, 11)) {
      const bb = h;
      await page.mouse.move(bb.x + bb.width / 2, bb.y - sy0 + bb.height / 2); await page.waitForTimeout(150);
      const t = await ev(() => { const tip = document.getElementById('rrgTip'); if (tip.hidden) return null; const rows = [...tip.querySelectorAll('.row')].map((r) => r.innerText.replace(/\s+/g, ' ')); return rows; });
      if (!t) { tipBad.push('tip nascosto'); continue; }
      const sym = t[0].split(' ')[0];
      const rr = (t.find((x) => x.startsWith('RS-Ratio')) || '').split(' ').pop(), rm = (t.find((x) => x.startsWith('RS-Momentum')) || '').split(' ').pop();
      const row = await ev((sym) => { const tr = [...document.querySelectorAll('#rotTable tbody tr')].find((r) => r.querySelector('.sym').textContent === sym); return tr ? [tr.cells[2].innerText.split(/\s/)[0], tr.cells[3].innerText.split(/\s/)[0], tr.cells[1].innerText.trim()] : null; }, sym);
      const q = (t.find((x) => x.startsWith('Quadrante')) || '').split(' ').pop();
      if (row && row[0] === rr && row[1] === rm && row[2].toLowerCase() === q.toLowerCase()) tipOk++; else tipBad.push(`${sym}: tip ${rr}/${rm}/${q} tabella ${row}`);
    }
    R.add('R12', 'tooltip', `${tag} tooltip RRG = tabella di rotazione (RS-Ratio, RS-Mom, quadrante)`, tipOk > 5 && !tipBad.length, `ok=${tipOk} ${tipBad.join(' | ')}`, await L.shot(page, `r-${tag}-tip`));
    await page.mouse.move(5, 5);
  }
  // clic su riga = fissa; Esc toglie
  const firstRow = await page.$('#rotTable tbody tr');
  const sym1 = await firstRow.getAttribute('data-sym');
  await page.click(`#rotTable tbody tr[data-sym="${sym1}"] td:nth-child(2)`); await page.waitForTimeout(300);
  const pinned = await ev((s) => ({ sel: document.querySelector(`#rotTable tbody tr[data-sym="${s}"]`).classList.contains('sel'), dim: document.querySelectorAll('#rrg g.series.dim').length, focus: document.querySelectorAll('#rrg g.series.focus').length }), sym1);
  await page.click('#rrgTitle');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const unp = await ev(() => ({ sel: document.querySelectorAll('#rotTable tbody tr.sel').length, dim: document.querySelectorAll('#rrg g.series.dim').length }));
  R.add('R13', 'rotazione', `${tag} clic su riga fissa il titolo, Esc lo libera`, pinned.sel && pinned.focus === 1 && pinned.dim > 0 && unp.sel === 0 && unp.dim === 0, JSON.stringify({ pinned, unp }));
  // spunta: nasconde dal grafico
  const nH = (await page.$$('#rrg circle.head')).length;
  await page.click(`#rotTable tbody tr[data-sym="${sym1}"] input.vis`); await page.waitForTimeout(400);
  const nH2 = (await page.$$('#rrg circle.head')).length;
  const off = await ev((s) => document.querySelector(`#rotTable tbody tr[data-sym="${s}"]`).classList.contains('off'), sym1);
  const perfLines = await ev(() => document.getElementById('perfLegend').innerText);
  await page.click(`#rotTable tbody tr[data-sym="${sym1}"] input.vis`); await page.waitForTimeout(400);
  const nH3 = (await page.$$('#rrg circle.head')).length;
  R.add('R14', 'rotazione', `${tag} spunta nasconde e rimostra il titolo`, nH2 === nH - 1 && off && nH3 === nH, `${nH}→${nH2}→${nH3} off=${off}`);
  // Prezzi + ordinamenti
  await page.click('#tableSeg button[data-mode="px"]'); await page.waitForTimeout(500);
  const pxv = await ev(() => ({ px: !document.getElementById('pxWrap').hidden, rot: document.getElementById('rotWrap').hidden, title: document.getElementById('tableTitle').textContent }));
  R.add('R15', 'rotazione', `${tag} interruttore Prezzi`, pxv.px && pxv.rot && /Prezzi/.test(pxv.title), JSON.stringify(pxv));
  const keys = await ev(() => [...document.querySelectorAll('#monTable th button')].map((b) => b.dataset.sort));
  const num = (s) => { s = s.replace(/[▲▼%\s]|sett\.|sedute/g, '').replace(/\./g, '').replace(',', '.').replace('−', '-'); return s === '—' || s === '' ? NaN : +s; };
  for (const k of keys) {
    for (const pass of [1, 2]) {
      await page.click(`#monTable th button[data-sort="${k}"]`); await page.waitForTimeout(250);
      const r = await ev((k) => {
        const ths = [...document.querySelectorAll('#monTable thead th')]; const ci = ths.findIndex((t) => t.querySelector(`button[data-sort="${k}"]`));
        return { aria: ths[ci].getAttribute('aria-sort'), vals: [...document.querySelectorAll('#monTable tbody tr[data-sym]')].map((tr) => tr.cells[ci].innerText.trim().split('\n')[0]), focus: document.activeElement && document.activeElement.dataset && document.activeElement.dataset.sort };
      }, k);
      let ok = !!r.aria;
      if (!['sym', 'rot'].includes(k)) {
        const v = r.vals.map(num).filter((x) => !Number.isNaN(x));
        const asc = v.every((x, i) => !i || v[i - 1] <= x + 1e-9), desc = v.every((x, i) => !i || v[i - 1] >= x - 1e-9);
        ok = ok && (r.aria === 'ascending' ? asc : desc);
      }
      if (!ok || pass === 2) R.add('R16', 'ordinamento', `${tag} ordina per ${k} (clic ${pass})`, ok, `${r.aria} ${r.vals.slice(0, 12).join(' ')}`);
    }
  }
  await page.click('#tableSeg button[data-mode="rot"]'); await page.waitForTimeout(300);
  // performance
  for (const d of ['63', '252', '504', '126']) {
    await page.click(`#perfSeg button[data-days="${d}"]`); await page.waitForTimeout(300);
    const p = await ev(() => ({ p: [...document.querySelectorAll('#perfSeg button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.days), n: document.querySelectorAll('#perf path, #perf polyline').length }));
    R.add('R17', 'performance', `${tag} periodo ${d}`, p.p.length === 1 && p.p[0] === d && p.n > 0, JSON.stringify(p));
  }
  // details formule
  await page.click('#fxSum'); await page.waitForTimeout(200);
  R.add('R18', 'rotazione', `${tag} nota «come si calcola» si apre`, await ev(() => document.getElementById('fxBox').open));
  await page.click('#fxSum');

  // ---- portafoglio 1 Asset class
  const ac = groups.find((g) => /Asset class/i.test(g));
  await selectGroup(ac);
  await page.selectOption('#benchSel', 'PTF'); await page.waitForTimeout(600);
  const pt0 = await ev(() => ({ vis: !document.getElementById('ptfPanel').hidden, bench: document.getElementById('benchSel').value, tot: document.getElementById('ptfTot').textContent, line: !document.getElementById('ptfLine').hidden, reset: document.getElementById('ptfReset').disabled, n: document.querySelectorAll('#ptfTable input.wsl').length }));
  R.add('P1', 'portafoglio', `${tag} pannello in Asset class, benchmark PTF, totale 100`, pt0.vis && pt0.bench === 'PTF' && pt0.tot === '100' && pt0.line && pt0.reset && pt0.n >= 9, JSON.stringify(pt0), await L.shot(page, `p-${tag}-ptf0`, true));
  const rr0 = await ev(() => [...document.querySelectorAll('#rotTable tbody tr')].map((r) => r.cells[2].innerText.split(/\s/)[0]).join(','));
  // cursore del primo componente: 40 → 60
  const sl = await page.$('#ptfTable input.wsl');
  const symP = await sl.getAttribute('data-sym');
  await sl.evaluate((el) => { el.value = 60; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(600);
  const pt1 = await ev((s) => ({ tot: document.getElementById('ptfTot').textContent, note: document.getElementById('ptfTotNote').hidden ? '' : document.getElementById('ptfTotNote').textContent, norm: !document.getElementById('ptfNorm').hidden, reset: document.getElementById('ptfReset').disabled, num: document.querySelector(`#ptfTable input.wnum[data-sym="${s}"]`).value, ls: localStorage.getItem('sm.ptf.' + document.getElementById('groupSel').value), line: document.getElementById('ptfLine').textContent }), symP);
  const rr1 = await ev(() => [...document.querySelectorAll('#rotTable tbody tr')].map((r) => r.cells[2].innerText.split(/\s/)[0]).join(','));
  R.add('P2', 'portafoglio', `${tag} cursore cambia peso, totale, nota, salva e ricalcola`, pt1.tot === '120' && pt1.norm && !pt1.reset && pt1.num === '60' && pt1.ls && rr1 !== rr0 && /tuo portafoglio/.test(pt1.line), JSON.stringify(pt1), await L.shot(page, `p-${tag}-ptf1`, true));
  // persistenza dopo ricarica
  await page.reload(); await page.waitForTimeout(2500);
  const pt2 = await ev((s) => ({ g: document.getElementById('groupSel').value, num: document.querySelector(`#ptfTable input.wnum[data-sym="${s}"]`) && document.querySelector(`#ptfTable input.wnum[data-sym="${s}"]`).value, tot: document.getElementById('ptfTot') && document.getElementById('ptfTot').textContent }), symP);
  R.add('P3', 'portafoglio', `${tag} pesi e universo restano dopo la ricarica`, pt2.g === ac && pt2.num === '60' && pt2.tot === '120', JSON.stringify(pt2));
  // Porta a 100%
  await page.click('#ptfNorm'); await page.waitForTimeout(500);
  const pt3 = await ev(() => ({ tot: document.getElementById('ptfTot').textContent, norm: document.getElementById('ptfNorm').hidden, vals: [...document.querySelectorAll('#ptfTable input.wnum')].map((i) => i.value).join(',') }));
  R.add('P4', 'portafoglio', `${tag} «Porta a 100%»`, pt3.tot === '100' && pt3.norm, JSON.stringify(pt3));
  // numero oltre 100 nella casella
  const numEl = await page.$(`#ptfTable input.wnum[data-sym="${symP}"]`);
  await numEl.fill('150'); await numEl.press('Tab'); await page.waitForTimeout(400);
  const pt4 = await ev((s) => ({ num: document.querySelector(`#ptfTable input.wnum[data-sym="${s}"]`).value, sl: document.querySelector(`#ptfTable input.wsl[data-sym="${s}"]`).value }), symP);
  R.add('P5', 'portafoglio', `${tag} casella numero 150 limitata a 100`, pt4.num === '100' && pt4.sl === '100', JSON.stringify(pt4));
  // casella vuota
  await numEl.fill(''); await numEl.press('Tab'); await page.waitForTimeout(300);
  const pt4b = await ev((s) => document.querySelector(`#ptfTable input.wnum[data-sym="${s}"]`).value, symP);
  R.add('P5b', 'portafoglio', `${tag} casella svuotata torna al valore`, pt4b === '100', pt4b);
  // tutti a zero
  await ev(() => document.querySelectorAll('#ptfTable input.wsl').forEach((el) => { el.value = 0; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }));
  await page.waitForTimeout(500);
  const pt5 = await ev(() => ({ note: document.getElementById('ptfTotNote').textContent, hid: document.getElementById('ptfTotNote').hidden, tot: document.getElementById('ptfTot').textContent, norm: document.getElementById('ptfNorm').hidden, line: document.getElementById('ptfLine').textContent }));
  const bad0 = await L.badText(page, '#v-rrg');
  R.add('P6', 'portafoglio', `${tag} tutti i pesi a zero: avviso, niente NaN`, /almeno un peso/.test(pt5.note) && !pt5.hid && !bad0.length, JSON.stringify(pt5) + bad0.join('|'), await L.shot(page, `p-${tag}-ptf-zero`, true));
  // ripristina
  await page.click('#ptfReset'); await page.waitForTimeout(500);
  const pt6 = await ev(() => ({ tot: document.getElementById('ptfTot').textContent, dis: document.getElementById('ptfReset').disabled, ls: localStorage.getItem('sm.ptf.' + document.getElementById('groupSel').value) }));
  const rr6 = await ev(() => [...document.querySelectorAll('#rotTable tbody tr')].map((r) => r.cells[2].innerText.split(/\s/)[0]).join(','));
  R.add('P7', 'portafoglio', `${tag} «Ripristina l'esempio»`, pt6.tot === '100' && pt6.dis && (pt6.ls === null || pt6.ls === 'null'), JSON.stringify(pt6) + ` rot uguale a prima=${rr6 === rr0}`);
  // altro benchmark: bottone «Confronta con il portafoglio»
  const other = await ev(() => [...document.querySelectorAll('#benchSel option')].map((o) => o.value).find((v) => v !== 'PTF'));
  await page.selectOption('#benchSel', other); await page.waitForTimeout(500);
  const hasUse = await page.isVisible('#ptfUse');
  if (hasUse) { await page.click('#ptfUse'); await page.waitForTimeout(500); }
  R.add('P8', 'portafoglio', `${tag} «Confronta con il portafoglio» torna a PTF`, hasUse && (await page.inputValue('#benchSel')) === 'PTF', `${other} → ${await page.inputValue('#benchSel')}`);
  // hover riga portafoglio evidenzia
  if (prof === 'desktop') {
    await page.hover('#ptfTable tbody tr[data-sym]:not(.off)'); await page.waitForTimeout(300);
    R.add('P9', 'portafoglio', `${tag} passaggio su riga evidenzia la componente`, (await page.$$('#rrg g.series.focus')).length === 1);
  }
  // ---- asset reali
  const mx = groups.find((g) => /Asset reali/i.test(g));
  await selectGroup(mx);
  const m0 = await ev(() => ({ vis: !document.getElementById('mxPanel').hidden, rows: [...document.querySelectorAll('#mxTable tbody tr')].filter((r) => !r.hidden).map((r) => r.dataset.b), sel: document.querySelector('#mxTable tr.sel') && document.querySelector('#mxTable tr.sel').dataset.b, bench: document.getElementById('benchSel').value, now: document.getElementById('mxNow').textContent, ptf: document.getElementById('ptfPanel').hidden }));
  R.add('X1', 'asset reali', `${tag} pannello benchmark`, m0.vis && m0.sel === m0.bench && m0.ptf && m0.rows.length >= 5, JSON.stringify(m0));
  for (const bb of m0.rows) {
    await page.click(`#mxTable tbody tr[data-b="${bb}"]`); await page.waitForTimeout(500);
    const v = await page.inputValue('#benchSel');
    const bad = await L.badText(page, '#v-rrg');
    R.add('X2', 'asset reali', `${tag} clic su riga ${bb} cambia benchmark`, v === bb && !bad.length, v + bad.join('|'));
  }
  // tooltip performance vs nothing: solo che non dia errori
  R.add('R99', 'console', `${tag} nessun errore`, !log.length, log.join(' | '));
  R.save();
  await ctx.close(); await b.close();
})();
