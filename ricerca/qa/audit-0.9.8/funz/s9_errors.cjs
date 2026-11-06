// Resilienza: file opzionali o obbligatori che non arrivano (abort, 404, JSON rotto)
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const R = new L.Rec('s9_errors_' + prof + '_' + (process.argv[3] || 'dark'));
(async () => {
  const b = await L.launch();
  const tag = prof;
  const mk = async (file, mode = 'abort', ls = {}) => {
    const o = await L.open(b, prof, { expectFail: true, ls });
    await o.ctx.route(new RegExp(file.replace(/[.]/g, '\\.') + '(\\?|$)'), (r) => mode === 'abort' ? r.abort() : mode === '404' ? r.fulfill({ status: 404, body: 'not found' }) : r.fulfill({ status: 200, contentType: 'application/json', body: mode }));
    o.ev = (f, a) => o.page.evaluate(f, a);
    o.errs = () => o.log.filter((l) => /pageerror|UNHANDLED/.test(l));
    return o;
  };
  const vis = (page) => page.evaluate(() => { const v = [...document.querySelectorAll('section.view')].find((s) => !s.hidden); return v ? v.innerText.replace(/\s+/g, ' ') : ''; });

  // 1. capitulation.json
  for (const mode of ['abort', '404', '{"rotto":']) {
    const { ctx, page, ev, errs } = await mk('data/capitulation.json', mode);
    await L.goto(page, 'XLU', 1500);
    await page.click('#secCap summary'); await page.waitForTimeout(500);
    const s = await ev(() => ({ meta: document.getElementById('secCapMeta').textContent, note: document.getElementById('secCapNote').textContent, ctl: document.getElementById('secCapCtl').hidden, chk: document.getElementById('secCheck').innerText.slice(0, 80) }));
    R.add('E1', 'errori', `${tag} capitulation.json (${mode}): scheda Settore`, /non disponibili/.test(s.meta) && /non disponibili/.test(s.note) && s.ctl && !errs().length, JSON.stringify(s) + errs().join('|'), await L.shot(page, `e-${tag}-cap-sec-${mode === 'abort' ? 'abort' : mode === '404' ? '404' : 'json'}`, true));
    await L.goto(page, 'idx', 4000);
    const ix = await ev(() => ({ col: [...document.querySelectorAll('#ixTable tbody tr')].map((tr) => tr.cells[6].innerText).join(' '), kpi: [...document.querySelectorAll('#ixKpis .k')].map((k) => k.textContent).join(' | '), meta: document.getElementById('ixCapMeta').textContent }));
    R.add('E2', 'errori', `${tag} capitulation.json (${mode}): colonna «Cali forti» degli indici dice che mancano i dati`, !/…/.test(ix.col) && /non disponibili/.test(ix.meta), JSON.stringify(ix), await L.shot(page, `e-${tag}-cap-idx-${mode === 'abort' ? 'abort' : mode === '404' ? '404' : 'json'}`, true));
    await ctx.close();
  }
  // 2. indices_more.json (indici non principali): abort, 404, JSON troncato
  for (const mode of ['abort', '404', '{"series":{"SMI":']) {
    const m = mode === 'abort' ? 'abort' : mode === '404' ? '404' : 'troncato';
    const { ctx, page, ev, errs } = await mk('data/indices_more.json', mode, { 'sm.ixShown': JSON.stringify(['SPX', 'NDX', 'SMI', 'TSX60']), 'sm.ixSel': JSON.stringify('SMI') });
    await L.goto(page, 'idx', 6000);
    const s = await ev(() => ({ rows: [...document.querySelectorAll('#ixTable tbody tr')].map((r) => r.dataset.ix).join(','), chips: document.querySelectorAll('#ixPick button').length, meta: document.getElementById('ixPickMeta').textContent, sel: (document.querySelector('#ixChips button[aria-pressed=true]') || { dataset: {} }).dataset.ix, txt: document.getElementById('v-idx').innerText }));
    const lsBefore = await ev(() => localStorage.getItem('sm.ixShown'));
    const msg = /non disponibil|non sono arrivat|non arrivat/i.test(s.meta);
    R.add('E3', 'errori', `${tag} indices_more.json (${m}): avviso che 12 indici non sono arrivati (non «in arrivo» per sempre)`, msg && !/in arrivo/.test(s.meta) && !errs().length, `righe=${s.rows} chip=${s.chips} meta="${s.meta}" scelto=${s.sel} (salvato SMI)`, await L.shot(page, `e-${tag}-more-${m}`, true));
    R.add('E4', 'errori', `${tag} indices_more.json (${m}): conteggio «N su M mostrati» = righe visibili`, s.meta.startsWith(s.rows.split(',').length + ' su'), `meta "${s.meta}" righe ${s.rows}; salvato: ${lsBefore}`);
    await ctx.close();
  }
  // 3-4. prices_global.json / prices_macro.json: universo salvato i cui prezzi non arrivano. Si prova aprendo l'app dal
  // Monitor e aprendo direttamente #rrg (indirizzo salvato o ricarica stando sulla Rotazione)
  for (const [file, grp, mode, label] of [['data/prices_global.json', '1 · Asset class', 'abort', 'ETF in euro'], ['data/prices_global.json', '1 · Asset class', '{"dates":["20', 'ETF in euro'], ['data/prices_macro.json', '5 · Asset reali', '404', 'asset reali']]) {
    for (const start of ['mon', 'rrg']) {
      const { ctx, page, ev, errs } = await mk(file, mode, { 'sm.group': JSON.stringify(grp) });
      await L.goto(page, start, 2500);
      if (start === 'mon') { await page.click('#tab-rrg'); await page.waitForTimeout(900); }
      const s = await ev(() => ({ g: document.getElementById('groupSel').value, warn: document.getElementById('grpWarn').hidden ? '' : document.getElementById('grpWarn').textContent, title: document.getElementById('rrgTitle').textContent }));
      const m = mode === 'abort' ? 'abort' : mode === '404' ? '404' : 'troncato';
      R.add('E5', 'errori', `${tag} ${file} (${m}) con universo salvato «${grp}», apertura da #${start}: avviso che i prezzi non sono arrivati`, s.warn.includes(label) && s.warn.includes(grp) && !errs().length, JSON.stringify(s) + errs().join('|'), await L.shot(page, `e-${tag}-${file.replace(/\W/g, '_')}-${m}-${start}`, true));
      const ls = await ev(() => localStorage.getItem('sm.group'));
      R.add('E7', 'errori', `${tag} ${file} (${m}) da #${start}: l'universo salvato non viene sovrascritto`, ls === JSON.stringify(grp), ls);
      if (start === 'mon' && file.includes('global') && mode === 'abort') {
        await page.fill('#cmd', 'SWDA'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(800);
        const ph = await ev(() => document.getElementById('cmd').placeholder);
        R.add('E6', 'errori', `${tag} prices_global.json assente: il comando SWDA dice perché non lo trova (e non suggerisce SWDA)`, /non disponibil|non arrivat|mancan/i.test(ph) && !/SWDA\)/.test(ph), ph);
      }
      await ctx.close();
    }
  }
  // 5. sector_members.json
  for (const mode of ['abort', '{"x":1}']) {
    const { ctx, page, ev, errs } = await mk('data/sector_members.json', mode);
    await L.goto(page, 'tit', 3000);
    const s = await ev(() => ({ load: document.getElementById('titLoading').hidden ? '' : document.getElementById('titLoading').textContent, body: !document.getElementById('titBody').hidden }));
    R.add('E9', 'errori', `${tag} sector_members.json (${mode === 'abort' ? 'abort' : 'JSON senza campi'}): messaggio nella vista 7`, /non disponibili/.test(s.load) && !s.body && !errs().length, JSON.stringify(s) + errs().join('|'), await L.shot(page, `e-${tag}-tit-${mode === 'abort' ? 'abort' : 'json'}`));
    await ctx.close();
  }
  // 6. indices.json
  {
    const { ctx, page, ev, errs } = await mk('data/indices.json', 'abort');
    await L.goto(page, 'idx', 3000);
    const s = await ev(() => ({ load: document.getElementById('ixLoading').hidden ? '' : document.getElementById('ixLoading').textContent, body: !document.getElementById('ixBody').hidden }));
    await page.fill('#cmd', 'NDX'); await page.press('#cmd', 'Enter'); await page.waitForTimeout(600);
    R.add('E10', 'errori', `${tag} indices.json assente: messaggio nella vista 6`, /non disponibili/.test(s.load) && !s.body && !errs().length, JSON.stringify(s) + errs().join('|'), await L.shot(page, `e-${tag}-idx`));
    await ctx.close();
  }
  // 7. config/indices.json (opzionale): scheda nascosta
  {
    const { ctx, page, ev, errs } = await mk('config/indices.json', 'abort');
    await L.goto(page, 'idx', 2000);
    const s = await ev(() => ({ tab: document.getElementById('tab-idx').hidden, view: [...document.querySelectorAll('section.view')].find((x) => !x.hidden).id, txt: document.getElementById('v-idx').innerText.trim().slice(0, 100), hash: location.hash }));
    await page.click('h1.brand'); await page.keyboard.press('6'); await page.waitForTimeout(600);
    const s2 = await ev(() => ({ view: [...document.querySelectorAll('section.view')].find((x) => !x.hidden).id, txt: document.getElementById('v-idx').innerText.trim().slice(0, 100) }));
    R.add('E11', 'errori', `${tag} config/indices.json assente: #idx e tasto 6 non portano a una pagina vuota`, s.tab && !(s.view === 'v-idx' && !s.txt) && !(s2.view === 'v-idx' && !s2.txt) && !errs().length, JSON.stringify({ s, s2 }) + errs().join('|'), await L.shot(page, `e-${tag}-noixcfg`));
    await ctx.close();
  }
  // 8. alerts.json
  {
    const { ctx, page, ev, errs } = await mk('data/alerts.json', 'abort');
    await L.goto(page, 'alr', 1500);
    const s = await ev(() => document.getElementById('sentInfo').textContent);
    R.add('E12', 'errori', `${tag} alerts.json assente: il riquadro Telegram non dice cose false`, !/non ha ancora registrato/.test(s), s);
    await ctx.close();
  }
  // 9. breadth_latest.json
  {
    const { ctx, page, ev, errs } = await mk('data/breadth_latest.json', 'abort');
    await L.goto(page, 'XLU', 1500);
    const s = await ev(() => ({ meta: document.getElementById('memMeta').textContent, rows: document.querySelectorAll('#memTable tr').length, txt: document.getElementById('memTable').innerText.slice(0, 120) }));
    const bad = await L.badText(page, '#v-sec');
    R.add('E13', 'errori', `${tag} breadth_latest.json assente: titoli del settore con messaggio`, !errs().length && !bad.length && (s.rows > 0 || /non disponibil|mancan/i.test(s.meta + s.txt)), JSON.stringify(s) + bad.join('|') + errs().join('|'), await L.shot(page, `e-${tag}-latest`, true));
    await ctx.close();
  }
  // 10. obbligatorio: prices.json
  {
    const { ctx, page, ev, errs } = await mk('data/prices.json', '404');
    await page.goto(L.BASE); await page.waitForTimeout(2500);
    const s = await ev(() => document.getElementById('v-mon').innerText.slice(0, 200));
    R.add('E14', 'errori', `${tag} prices.json 404: messaggio chiaro al posto del Monitor`, /Impossibile caricare i dati/.test(s), s, await L.shot(page, `e-${tag}-prices`));
    await ctx.close();
  }
  // 11. version.json e rete lenta di capitulation (caricamento…)
  {
    const o = await L.open(b, prof);
    await o.ctx.route(/data\/capitulation\.json/, async (r) => { await new Promise((res) => setTimeout(res, 4000)); r.continue(); });
    await L.goto(o.page, 'XLU', 600);
    await o.page.click('#secCap summary'); await o.page.waitForTimeout(300);
    const m1 = await o.page.textContent('#secCapMeta');
    await o.page.waitForTimeout(5000);
    const m2 = await o.page.textContent('#secCapMeta');
    R.add('E15', 'errori', `${tag} capitulation.json lenta: «caricamento…» poi i dati`, /caricamento/.test(m1) && !/caricamento/.test(m2), `${m1} → ${m2}`);
    await o.ctx.close();
  }
  R.save();
  await b.close();
})();
