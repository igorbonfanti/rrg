// Barra dei comandi, tasti, indirizzi (#), Indietro/Avanti, ricarica, avviso «Nuova versione», intro, striscia dei cambi
const L = require('./lib.cjs');
const prof = process.argv[2] || 'desktop';
const R = new L.Rec('s6_cmd_nav_' + prof + '_' + (process.argv[3] || 'dark'));
(async () => {
  const b = await L.launch();
  const tag = prof;
  let { ctx, page, log } = await L.open(b, prof);
  const ev = (f, a) => page.evaluate(f, a);
  const snap = () => ev(() => {
    const vis = [...document.querySelectorAll('section.view')].find((s) => !s.hidden);
    const pin = document.querySelector('#rotTable tbody tr.sel');
    return {
      view: vis ? vis.id.slice(2) : null, hash: location.hash, group: document.getElementById('groupSel').value, bench: document.getElementById('benchSel').value,
      pin: pin ? pin.dataset.sym : null, help: document.getElementById('helpModal').open, theme: document.documentElement.getAttribute('data-theme'),
      sec: document.getElementById('secTitle').textContent, ix: (document.querySelector('#ixChips button[aria-pressed="true"]') || {}).dataset ? (document.querySelector('#ixChips button[aria-pressed="true"]') || { dataset: {} }).dataset.ix : null,
      tit: (document.querySelector('#titChips button[aria-pressed="true"]') || { dataset: {} }).dataset.sym, err: document.getElementById('cmdForm').classList.contains('err'), ph: document.getElementById('cmd').placeholder,
    };
  });
  const cmd = async (v, wait = 1200) => {
    await page.fill('#cmd', v); await page.press('#cmd', 'Enter'); await page.waitForTimeout(wait);
    return snap();
  };
  await L.goto(page, 'mon', 1200);
  const cases = [
    ['XLU', (s) => s.view === 'sec' && s.hash === '#XLU' && s.sec.startsWith('XLU')],
    ['xlk', (s) => s.view === 'sec' && s.hash === '#XLK'],
    ['XLK TIT', (s) => s.view === 'tit' && s.hash === '#tit-XLK' && s.tit === 'XLK', 3000],
    ['XLU SEC', (s) => s.view === 'sec' && s.hash === '#XLU'],
    ['ORO', (s) => s.view === 'rrg' && /Asset class/.test(s.group) && s.pin === 'SGLD.MI', 2500],
    ['NDX', (s) => s.view === 'idx' && s.ix === 'NDX', 3500],
    ['N225', (s) => s.view === 'idx' && s.ix === 'N225'],
    ['DAX', (s) => s.view === 'idx' && s.ix === 'DAX'],
    ['SMI', (s) => s.view === 'idx' && s.ix === 'SMI'],
    ['SPY', (s) => s.view === 'rrg' && /Settori/.test(s.group) && s.bench === 'SPY'],
    ['CAC', (s) => s.view === 'idx' && s.ix === 'CAC', 2500],
    ['CAC.PA', (s) => s.view === 'rrg' && s.pin === 'CAC.PA', 2000],
    ['cac', (s) => s.view === 'idx' && s.ix === 'CAC', 2000],
    ['ORO', (s) => s.view === 'rrg' && s.pin === 'SGLD.MI', 1500],
    ['SPY', (s) => s.view === 'rrg' && /Settori/.test(s.group) && s.bench === 'SPY'],
    ['FTSEMIB', (s) => s.view === 'idx' && s.ix === 'FTSEMIB', 2500],
    ['TWN', (s) => s.view === 'idx' && s.ix === 'TWN', 2500],
    ['QQQ', (s) => s.view === 'rrg' && s.bench === 'QQQ'],
    ['INDIA', (s) => s.view === 'rrg' && /Paesi/.test(s.group) && s.pin],
    ['TESLA', (s) => s.view === 'rrg' && /MAG7/.test(s.group) && s.pin === 'TSLA'],
    ['nvda', (s) => s.view === 'rrg' && /MAG7/.test(s.group) && s.pin === 'NVDA'],
    ['SWDA', (s) => s.view === 'rrg' && s.pin === 'SWDA.MI'],
    ['PTF', (s) => s.view === 'rrg' && /Asset class/.test(s.group) && s.bench === 'PTF'],
    ['GLD', (s) => s.view === 'rrg' && s.pin === 'GLD'],
    ['BITCOIN', (s) => s.view === 'rrg' && !!s.pin],
    ['BTC', (s) => s.view === 'rrg' && !!s.pin],
    ['XLU GO', (s) => s.view === 'sec' && s.hash === '#XLU'],
    ['MON', (s) => s.view === 'mon'], ['ROT', (s) => s.view === 'rrg'], ['RRG', (s) => s.view === 'rrg'], ['BTM', (s) => s.view === 'btm'], ['SEC', (s) => s.view === 'sec'],
    ['ALRT', (s) => s.view === 'alr'], ['ALERT', (s) => s.view === 'alr'], ['IDX', (s) => s.view === 'idx'], ['TIT', (s) => s.view === 'tit'], ['indici', (s) => s.view === 'idx'],
    ['HELP', (s) => s.help], ['GUIDA', (s) => s.help],
    ['CHIARO', (s) => s.theme === 'light'], ['TEMA', (s) => s.theme === 'dark'], ['SCURO', (s) => s.theme === 'dark'],
    ['ZZZZ', (s) => s.err && /non trovato/.test(s.ph)], ['XLK FOO', (s) => s.err], ['   ', (s) => !s.err],
  ];
  for (const [c, check, wait] of cases) {
    const s = await cmd(c, wait || 1200);
    if (s.help) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    R.add('K1', 'comandi', `${tag} comando «${c}»`, check(s), JSON.stringify(s));
  }
  // l'errore sparisce dopo 4 s
  await cmd('QWERTY', 300);
  await page.waitForTimeout(4300);
  const s4 = await snap();
  R.add('K2', 'comandi', `${tag} avviso «non trovato» sparisce dopo 4 s`, !s4.err && !/non trovato/.test(s4.ph), s4.ph);
  // ---- tasti
  await L.goto(page, 'mon', 800);
  await page.click('h1.brand');
  for (const [k, v] of [['2', 'rrg'], ['3', 'btm'], ['4', 'sec'], ['5', 'alr'], ['6', 'idx'], ['7', 'tit'], ['1', 'mon']]) {
    await page.keyboard.press(k); await page.waitForTimeout(k === '6' || k === '7' ? 2500 : 700);
    const s = await snap();
    R.add('K3', 'tasti', `${tag} tasto ${k} → ${v}`, s.view === v, s.view);
  }
  await page.keyboard.press('?'); await page.waitForTimeout(300);
  const h1 = await snap();
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const h2 = await snap();
  R.add('K4', 'tasti', `${tag} ? apre la guida, Esc la chiude`, h1.help && !h2.help, `${h1.help} ${h2.help}`);
  await page.keyboard.press('/'); await page.waitForTimeout(200);
  const foc = await ev(() => document.activeElement.id);
  await page.keyboard.type('3'); await page.waitForTimeout(300);
  const s5 = await snap();
  R.add('K5', 'tasti', `${tag} / porta alla barra; scrivendo un numero non cambia vista`, foc === 'cmd' && s5.view === 'mon' && (await page.inputValue('#cmd')) === '3', `${foc} ${s5.view}`);
  await page.fill('#cmd', '');
  // schede: frecce, Home, Fine
  await page.focus('#tab-mon');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600);
  const a1 = await ev(() => ({ f: document.activeElement.id, v: [...document.querySelectorAll('section.view')].find((s) => !s.hidden).id }));
  await page.keyboard.press('End'); await page.waitForTimeout(2500);
  const a2 = await ev(() => ({ f: document.activeElement.id, v: [...document.querySelectorAll('section.view')].find((s) => !s.hidden).id }));
  await page.keyboard.press('Home'); await page.waitForTimeout(600);
  const a3 = await ev(() => ({ f: document.activeElement.id }));
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(2000);
  const a4 = await ev(() => ({ f: document.activeElement.id }));
  R.add('K6', 'tasti', `${tag} frecce/Home/Fine sulle schede`, a1.f === 'tab-rrg' && a1.v === 'v-rrg' && a2.f === 'tab-tit' && a3.f === 'tab-mon' && a4.f === 'tab-tit', JSON.stringify({ a1, a2, a3, a4 }));
  // tabindex roving
  const tabidx = await ev(() => [...document.querySelectorAll('.fnkeys [role=tab]')].map((t) => t.tabIndex).join(','));
  R.add('K7', 'accessibilità', `${tag} schede con tabindex «roving»`, tabidx.split(',').filter((x) => x === '0').length === 1, tabidx);
  // scorciatoie spente
  await page.click('#helpBtn'); await page.waitForTimeout(300);
  await page.uncheck('#kbToggle'); await page.click('#helpClose'); await page.waitForTimeout(300);
  await page.click('h1.brand'); await page.keyboard.press('1'); await page.waitForTimeout(300); await page.keyboard.press('3'); await page.waitForTimeout(500);
  const off = await snap();
  await page.keyboard.press('?'); await page.waitForTimeout(300);
  const off2 = await snap();
  R.add('K8', 'tasti', `${tag} scorciatoie spente dalla guida: 3 e ? non fanno niente`, off.view !== 'btm' && !off2.help && (await ev(() => localStorage.getItem('sm.shortcuts'))) === 'false', `${off.view} help=${off2.help}`);
  await ev(() => localStorage.setItem('sm.shortcuts', 'true'));
  // ---- indirizzi diretti
  for (const [h, check] of [['mon', (s) => s.view === 'mon'], ['rrg', (s) => s.view === 'rrg'], ['btm', (s) => s.view === 'btm'], ['sec', (s) => s.view === 'sec' && /^#XL/.test(s.hash)], ['alr', (s) => s.view === 'alr'], ['idx', (s) => s.view === 'idx'], ['tit', (s) => s.view === 'tit' && /^#tit-XL/.test(s.hash)],
    ['xlu', (s) => s.view === 'sec' && s.sec.startsWith('XLU') && s.hash === '#XLU'], ['XLE', (s) => s.view === 'sec' && s.sec.startsWith('XLE')], ['tit-XLK', (s) => s.view === 'tit' && s.tit === 'XLK'], ['tit-xlb', (s) => s.view === 'tit' && s.tit === 'XLB'],
    ['TIT-ZZZ', (s) => s.view === 'mon'], ['pippo', (s) => s.view === 'mon' && s.hash === '#mon'], ['', (s) => s.view === 'mon'], ['NDX', (s) => true]]) {
    await page.goto('about:blank');
    await L.goto(page, h, h.startsWith('tit') || h === 'idx' ? 3500 : 1200);
    const s = await snap();
    R.add('K9', 'indirizzi', `${tag} apertura diretta #${h}`, check(s), JSON.stringify({ view: s.view, hash: s.hash, sec: s.sec, tit: s.tit, ix: s.ix }));
  }
  // cambio di hash a mano
  await L.goto(page, 'mon', 800);
  await ev(() => { location.hash = '#btm'; }); await page.waitForTimeout(700);
  R.add('K10', 'indirizzi', `${tag} cambio dell'hash a mano apre la vista`, (await snap()).view === 'btm');
  // ---- Indietro / Avanti
  await page.goto('about:blank');
  await L.goto(page, 'mon', 1000);
  await page.click('#tab-rrg'); await page.waitForTimeout(800);
  await cmd('XLU', 800);
  await page.click('#secChips button[data-sym="XLK"]'); await page.waitForTimeout(800);
  await page.click('#tab-btm'); await page.waitForTimeout(800);
  const seq = [];
  for (let i = 0; i < 4; i++) { await page.goBack(); await page.waitForTimeout(800); const s = await snap(); seq.push(s.view + s.hash); }
  await page.goForward(); await page.waitForTimeout(800); const fw = await snap();
  R.add('K11', 'indirizzi', `${tag} Indietro: btm → XLK → XLU → rrg → mon; Avanti → rrg`, seq.join(' ') === 'sec#XLK sec#XLU rrg#rrg mon#mon' && fw.view === 'rrg', `${seq.join(' ')} · avanti ${fw.view}${fw.hash}`);
  // ---- ricarica: lo stato resta
  await page.click('#tab-rrg'); await page.waitForTimeout(700);
  await page.selectOption('#groupSel', { index: 1 }); await page.waitForTimeout(600);
  await page.click('#formulaSeg button[data-formula="semplice"]'); await page.click('#tailSeg button[data-tail="16"]'); await page.click('#tfSeg button[data-tf="daily"]');
  await page.click('#themeBtn'); await page.click('#cvdBtn'); await page.waitForTimeout(400);
  const before = await ev(() => ({ g: document.getElementById('groupSel').value, b: document.getElementById('benchSel').value, f: document.querySelector('#formulaSeg [aria-pressed=true]').dataset.formula, t: document.querySelector('#tailSeg [aria-pressed=true]').dataset.tail, tf: document.querySelector('#tfSeg [aria-pressed=true]').dataset.tf, th: document.documentElement.dataset.theme, cvd: document.documentElement.classList.contains('cvd'), cvdA: document.getElementById('cvdBtn').getAttribute('aria-pressed'), thA: document.getElementById('themeBtn').getAttribute('aria-checked') }));
  await page.reload(); await page.waitForTimeout(2500);
  const after = await ev(() => ({ g: document.getElementById('groupSel').value, b: document.getElementById('benchSel').value, f: document.querySelector('#formulaSeg [aria-pressed=true]').dataset.formula, t: document.querySelector('#tailSeg [aria-pressed=true]').dataset.tail, tf: document.querySelector('#tfSeg [aria-pressed=true]').dataset.tf, th: document.documentElement.dataset.theme, cvd: document.documentElement.classList.contains('cvd'), cvdA: document.getElementById('cvdBtn').getAttribute('aria-pressed'), thA: document.getElementById('themeBtn').getAttribute('aria-checked') }));
  R.add('K12', 'ricarica', `${tag} universo, benchmark, formula, coda, timeframe, tema, CVD restano`, JSON.stringify(before) === JSON.stringify(after), `prima ${JSON.stringify(before)} dopo ${JSON.stringify(after)}`);
  const meta = await ev(() => ({ cs: getComputedStyle(document.documentElement).colorScheme, meta: document.querySelector('meta[name="color-scheme"]').content, tc: document.querySelector('meta[name="theme-color"]').content }));
  R.add('K12b', 'tema', `${tag} tema chiaro: color-scheme e theme-color coerenti`, meta.tc === '#ffffff' && /light/.test(meta.cs), JSON.stringify(meta), await L.shot(page, `k-${tag}-light-rrg`));
  await page.click('#themeBtn'); await page.click('#cvdBtn');
  // scale non salvata? (scala Massima)
  await page.click('#scaleSeg button[data-scale="max"]'); await page.reload(); await page.waitForTimeout(2500);
  const sc = await ev(() => document.querySelector('#scaleSeg [aria-pressed=true]').dataset.scale);
  R.add('K13', 'ricarica', `${tag} scala Massima resta dopo la ricarica (guida: «La scelta resta nel browser»)`, sc === 'max', `dopo ricarica: ${sc}`);
  await page.click('#scaleSeg button[data-scale="fit"]');
  R.add('Z1', 'console', `${tag} nessun errore (comandi/tasti)`, !log.length, log.join(' | '));
  await ctx.close();

  // ---- Nuova versione
  ({ ctx, page, log } = await L.open(b, prof));
  let ver = '9.9.9', reloads = 0;
  await ctx.route('**/version.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: ver, release: '2026-10-19' }) }));
  page.on('load', () => reloads++);
  await L.goto(page, 'mon', 1500);
  const nv = await page.evaluate(() => ({ h: document.getElementById('newVer').hidden, t: document.getElementById('newVer').textContent, title: document.getElementById('newVer').title }));
  R.add('V1', 'versione', `${tag} version.json diversa: compare «Nuova versione»`, !nv.h && /9\.9\.9/.test(nv.t), JSON.stringify(nv), await L.shot(page, `v-${tag}-banner`));
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  const r0 = reloads;
  await page.click('#newVer');
  await page.waitForTimeout(3000);
  R.add('V2', 'versione', `${tag} clic: riscarica i file e ricarica la pagina`, reloads > r0 && reqs.some((u) => /app\.js/.test(u)) && reqs.some((u) => /prices\.json/.test(u)), `ricariche=${reloads - r0} richieste=${reqs.length}`);
  ver = L.VERSION;
  await page.reload(); await page.waitForTimeout(1500);
  R.add('V3', 'versione', `${tag} versione uguale: niente avviso`, await page.evaluate(() => document.getElementById('newVer').hidden));
  await ctx.unroute('**/version.json*');
  await ctx.route('**/version.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{rotto' }));
  await page.reload(); await page.waitForTimeout(1500);
  R.add('V4', 'versione', `${tag} version.json non valida: niente avviso, niente errori`, await page.evaluate(() => document.getElementById('newVer').hidden), log.filter((l) => !/version/.test(l)).join('|'));
  await ctx.unroute('**/version.json*');
  await ctx.route('**/version.json*', (r) => r.abort());
  await page.reload(); await page.waitForTimeout(1500);
  R.add('V5', 'versione', `${tag} version.json irraggiungibile: niente avviso`, await page.evaluate(() => document.getElementById('newVer').hidden));
  // nuova versione mentre la pagina è aperta: visibilitychange
  await ctx.unroute('**/version.json*');
  ver = '1.0.0';
  await ctx.route('**/version.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: ver }) }));
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(800);
  R.add('V6', 'versione', `${tag} controllo al ritorno sulla scheda (visibilitychange)`, await page.evaluate(() => !document.getElementById('newVer').hidden && /1\.0\.0/.test(document.getElementById('newVer').textContent)));
  // verTag
  const vt = await page.evaluate(() => ({ t: document.getElementById('verTag').textContent, title: document.getElementById('verTag').title }));
  R.add('V7', 'versione', `${tag} numero di versione e novità al passaggio`, vt.t === 'v' + L.VERSION && /Novità/.test(vt.title), JSON.stringify(vt));
  await ctx.close();

  // ---- Intro
  ({ ctx, page, log } = await L.open(b, prof, { intro: true }));
  await L.goto(page, '', 1500);
  const in0 = await page.evaluate(() => !document.getElementById('intro').hidden);
  const sp = await L.shot(page, `i-${tag}-intro`);
  await page.click('#introHelp'); await page.waitForTimeout(300);
  const in1 = await page.evaluate(() => document.getElementById('helpModal').open);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const fIntro = await page.evaluate(() => document.activeElement.id);
  await page.click('#introClose'); await page.waitForTimeout(300);
  const in2 = await page.evaluate(() => ({ h: document.getElementById('intro').hidden, ls: localStorage.getItem('sm.introSeen'), f: document.activeElement.tagName + '#' + document.activeElement.id }));
  await page.reload(); await page.waitForTimeout(1500);
  const in3 = await page.evaluate(() => document.getElementById('intro').hidden);
  R.add('N1', 'intro', `${tag} intro alla prima visita, «Apri la guida», «Ho capito» e non ricompare`, in0 && in1 && in2.h && in2.ls === 'true' && in3, JSON.stringify({ in0, in1, fIntro, in2, in3 }), sp);
  R.add('N2', 'accessibilità', `${tag} dopo «Ho capito» il focus non si perde sul body`, !/^BODY/.test(in2.f), in2.f);
  // striscia dei cambi dall'ultima visita
  await ctx.close();
  ({ ctx, page, log } = await L.open(b, prof, { ls: { 'sm.visit': JSON.stringify({ cur: { date: '2026-10-09', blue: {}, s: { XLU: ['setup', 9], XLRE: ['normal', 25], XLK: ['normal', 60] } }, prev: null }) } }));
  await L.goto(page, 'mon', 1500);
  const ch = await page.evaluate(() => ({ h: document.getElementById('changes').hidden, t: document.getElementById('changes').innerText.replace(/\s+/g, ' '), items: [...document.querySelectorAll('#changes button, #changes a, #changes [data-sym]')].map((x) => x.dataset.sym || x.textContent) }));
  R.add('N3', 'monitor', `${tag} striscia «cosa è cambiato»`, !ch.h && /XLU/.test(ch.t) && /09\/10/.test(ch.t), JSON.stringify(ch), await L.shot(page, `n-${tag}-changes`));
  if (ch.items.length) {
    await page.click('#changes [data-sym]'); await page.waitForTimeout(800);
    R.add('N4', 'monitor', `${tag} voce della striscia apre il settore`, (await page.evaluate(() => !document.getElementById('v-sec').hidden)), await page.evaluate(() => location.hash));
  }
  // Monitor: clic su riga apre il settore, riga SPY non cliccabile
  await L.goto(page, 'mon', 1000);
  const r1 = await page.evaluate(() => document.querySelector('#boardTable tbody tr[data-sym]') ? document.querySelector('#boardTable tbody tr[data-sym]').dataset.sym : (document.querySelector('#boardTable tbody tr[data-s]') || { dataset: {} }).dataset.s);
  await page.click('#boardTable tbody tr >> nth=0'); await page.waitForTimeout(800);
  R.add('N5', 'monitor', `${tag} clic su riga del Monitor apre il dettaglio`, await page.evaluate(() => !document.getElementById('v-sec').hidden), `${r1} → ${await page.evaluate(() => location.hash)}`);
  await L.goto(page, 'mon', 1000);
  await page.focus('#boardTable tbody tr >> nth=1').catch(() => {});
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  R.add('N6', 'accessibilità', `${tag} riga del Monitor apribile con Invio`, await page.evaluate(() => !document.getElementById('v-sec').hidden), await page.evaluate(() => location.hash));
  // settori da osservare cliccabili
  await L.goto(page, 'mon', 1000);
  const ac = await page.$('#activeList [data-sym], #activeList .acard');
  if (ac) { await ac.click(); await page.waitForTimeout(800); }
  R.add('N7', 'monitor', `${tag} scheda «Settori da osservare» apre il settore`, !!ac && await page.evaluate(() => !document.getElementById('v-sec').hidden), await page.evaluate(() => location.hash));
  R.add('Z2', 'console', `${tag} nessun errore (intro/striscia)`, !log.length, log.join(' | '));
  R.save();
  await ctx.close(); await b.close();
})();
