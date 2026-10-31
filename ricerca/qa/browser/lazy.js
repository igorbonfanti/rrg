const { chromium } = require('playwright');
const B = 'http://127.0.0.1:8790/';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'OK  ' : 'FAIL'} ${n} ${x}`);
(async () => {
  const b = await chromium.launch();
  const mk = async (init) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((init) => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.setItem('sm.introSeen', 'true'); for (const [k, v] of Object.entries(init)) localStorage.setItem('sm.' + k, JSON.stringify(v)); } } catch {} }, init);
    const p = await ctx.newPage(); const log = [];
    p.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); }); p.on('pageerror', (e) => log.push(e.message));
    return { p, log, ctx };
  };
  // 1. universo salvato globale, apertura dal Monitor, poi Rotazione
  let { p, log, ctx } = await mk({ group: '1 · Asset class' });
  await p.goto(B + '#mon'); await p.waitForTimeout(2000);
  await p.click('#tab-rrg'); await p.waitForTimeout(800);
  ok('universo salvato dopo il Monitor', (await p.inputValue('#groupSel')) === '1 · Asset class', await p.inputValue('#groupSel'));
  ok('Trend nel grafico', (await p.$$eval('#rrg text', (t) => t.map((x) => x.textContent))).includes('Trend'));
  await p.fill('#cmd', 'XLK'); await p.press('#cmd', 'Enter'); await p.waitForTimeout(500);
  await p.fill('#cmd', 'ORO'); await p.press('#cmd', 'Enter'); await p.waitForTimeout(700);
  ok('comando ORO (universo globale)', /Asset|Asset reali/.test(await p.inputValue('#groupSel')), await p.inputValue('#groupSel'));
  ok('nessun errore (1)', !log.length, log.join(' | ')); await ctx.close();
  // 2. apertura diretta della Rotazione con universo globale
  ({ p, log, ctx } = await mk({ group: '1 · Asset class' }));
  await p.goto(B + '#rrg'); await p.waitForTimeout(2500);
  ok('apertura diretta #rrg', (await p.inputValue('#groupSel')) === '1 · Asset class' && (await p.$$eval('#rrg text', (t) => t.map((x) => x.textContent))).includes('Trend'));
  ok('nessun errore (2)', !log.length, log.join(' | ')); await ctx.close();
  // 3. clic su Rotazione subito, prima dei prezzi globali
  ({ p, log, ctx } = await mk({ group: '1 · Asset class' }));
  await p.goto(B + '#mon'); await p.waitForFunction(() => document.querySelectorAll('#boardTable tbody tr').length >= 11, null, { polling: 10 });
  await p.click('#tab-rrg'); await p.waitForTimeout(2500);
  ok('Rotazione cliccata subito: poi passa all\'universo salvato', (await p.inputValue('#groupSel')) === '1 · Asset class', await p.inputValue('#groupSel'));
  ok('nessun errore (3)', !log.length, log.join(' | ')); await ctx.close();
  // 4. indice non principale salvato e mostrato
  ({ p, log, ctx } = await mk({ ixSel: 'IBEX', ixShown: ['SPX', 'IBEX', 'DAX'] }));
  await p.goto(B + '#idx'); await p.waitForTimeout(3500);
  ok('indice non principale scelto', /IBEX/.test(await p.textContent('#ixTitle')), await p.textContent('#ixTitle'));
  const rows = await p.$$eval('#ixTable tbody tr', (r) => r.length);
  ok('tabellone con 3 indici', rows === 3, rows);
  await p.fill('#cmd', 'NIFTY50'); await p.press('#cmd', 'Enter'); await p.waitForTimeout(800);
  ok('comando indice non principale', /NIFTY|Nifty/.test(await p.textContent('#ixTitle')), await p.textContent('#ixTitle'));
  ok('nessun errore (4)', !log.length, log.join(' | ')); await ctx.close();
  // 5. indici: comando prima di aprire la pagina
  ({ p, log, ctx } = await mk({}));
  await p.goto(B + '#mon'); await p.waitForTimeout(1500);
  await p.fill('#cmd', 'IBOV'); await p.press('#cmd', 'Enter'); await p.waitForTimeout(3500);
  ok('IBOV dal Monitor', /IBOV|Bovespa/.test(await p.textContent('#ixTitle')), await p.textContent('#ixTitle'));
  ok('nessun errore (5)', !log.length, log.join(' | ')); await ctx.close();
  console.log(res.join('\n')); await b.close();
})();
