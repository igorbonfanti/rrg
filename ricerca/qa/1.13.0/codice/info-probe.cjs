// QA 1.13.0 (controllore indipendente): comportamento dei bottoni «i» (js/info.js) oltre a quanto prova v1130.cjs.
// Uso: NODE_PATH=$(npm root -g) BASE=http://localhost:8831/ node info-probe.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8831/';
const res = [];
const ok = (c, m) => { res.push([!!c, m]); console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); };
const pop = (p) => p.evaluate(() => { const x = document.getElementById('infopop'); return x && !x.hidden ? x.textContent : null; });
const dupIds = (p) => p.evaluate(() => { const seen = {}; for (const e of document.querySelectorAll('[id]')) seen[e.id] = (seen[e.id] || 0) + 1; return Object.keys(seen).filter((k) => seen[k] > 1); });

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

  // A. Rotazione: «i» della tabella segue la tabella mostrata; id duplicati con il riquadro aperto
  await p.goto(BASE + 'index.html#rrg'); await p.waitForTimeout(2500);
  await p.click('#tableInfo'); await p.waitForTimeout(150);
  ok(/Direzione: ultimo spostamento/.test(await pop(p) || ''), 'A1 «i» della tabella di rotazione: testo delle colonne');
  await p.keyboard.press('Escape');
  await p.click('#tableSeg button[data-mode="px"]'); await p.waitForTimeout(300);
  await p.click('#tableInfo'); await p.waitForTimeout(150);
  const t = await pop(p) || '';
  ok(/Drawdown con i dividendi reinvestiti/.test(t), 'A2 dopo «Prezzi» il «i» spiega la tabella dei prezzi');
  const d1 = await dupIds(p);
  ok(!d1.length, `A3 id duplicati con il riquadro dei prezzi aperto: ${JSON.stringify(d1)}`);
  await p.keyboard.press('Escape');
  const pxn = await p.evaluate(() => ({ h: document.getElementById('pxNote').hidden, t: document.getElementById('pxNote').textContent, c: document.getElementById('pxCopied').textContent }));
  console.log('   pxNote (universo USA):', JSON.stringify(pxn).slice(0, 300));
  // universo globale in euro: riga con l'asterisco e testo completo nel riquadro
  const g = await p.evaluate(() => { const s = document.getElementById('groupSel'); const o = [...s.options].find((x) => /Asset class/i.test(x.textContent)); return o ? o.value : null; });
  if (g) {
    await p.selectOption('#groupSel', g); await p.waitForTimeout(1500);
    await p.click('#tableSeg button[data-mode="px"]').catch(() => {}); await p.waitForTimeout(300);
    const gx = await p.evaluate(() => ({ h: document.getElementById('pxNote').hidden, t: document.getElementById('pxNote').textContent }));
    ok(!gx.h && /Sedute di Borsa Italiana/.test(gx.t), `A4 universo in euro: riga dell'asterisco visibile («${gx.t.slice(0, 60)}…»)`);
    await p.click('#tableInfo'); await p.waitForTimeout(150);
    ok(/chiusura giornaliera su Yahoo, a mezzanotte UTC/.test(await pop(p) || ''), 'A5 universo in euro: il riquadro contiene il testo completo di #pxCopied');
    await p.keyboard.press('Escape');
    // portafoglio: «i» e title delle intestazioni
    const th = await p.evaluate(() => [...document.querySelectorAll('#ptfTable th')].map((x) => x.title).filter(Boolean));
    ok(th.length === 2, `A6 intestazioni Obiettivo/Oggi con il title (${th.length})`);
  }

  // B. VIX: crisi evidenziata + riquadro aperto: primo Esc chiude il riquadro, secondo toglie la crisi
  await p.goto(BASE + 'index.html#vix'); await p.waitForTimeout(3500);
  const cr = p.locator('#vxCrises button').first();
  if (await cr.count()) {
    await cr.click(); await p.waitForTimeout(200);
    const sel0 = await p.evaluate(() => document.querySelectorAll('#vxCrises [aria-pressed="true"], #vxCrises .on, #vxCrises .sel').length);
    await p.click('button[data-src="vxScHelp"]'); await p.waitForTimeout(150);
    const d2 = await dupIds(p);
    ok(!d2.length, `B1 id duplicati con il riquadro dello scatter aperto: ${JSON.stringify(d2)}`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const sel1 = await p.evaluate(() => document.querySelectorAll('#vxCrises [aria-pressed="true"], #vxCrises .on, #vxCrises .sel').length);
    ok((await pop(p)) === null && sel0 > 0 && sel1 === sel0, `B2 primo Esc: riquadro chiuso, crisi ancora evidenziata (${sel0}→${sel1})`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const sel2 = await p.evaluate(() => document.querySelectorAll('#vxCrises [aria-pressed="true"], #vxCrises .on, #vxCrises .sel').length);
    ok(sel2 === 0, `B3 secondo Esc: crisi tolta (${sel2})`);
  } else ok(false, 'B: nessuna crisi nell\'elenco');

  // C. Guida rapida: un riquadro fissato si chiude aprendo la guida con «?»; Esc chiude poi la guida
  await p.goto(BASE + 'index.html#mon'); await p.waitForTimeout(2500);
  await p.click('button[data-src="stateHelp"]'); await p.waitForTimeout(150);
  ok(/Zona blu|zona blu/.test(await pop(p) || ''), 'C1 «i» delle regole degli stati aperto');
  await p.mouse.move(5, 5); await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('?'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ dlg: document.getElementById('helpModal').open, pop: !document.getElementById('infopop').hidden }));
  ok(st.dlg && !st.pop, `C2 «?» apre la guida e chiude il riquadro (${JSON.stringify(st)})`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => document.getElementById('helpModal').open)), 'C3 Esc chiude la guida rapida');

  // D. bindInfo chiamato una seconda volta: nessun riquadro o gestore in più
  await p.evaluate(async () => { const m = await import('./js/info.js'); m.bindInfo(); m.bindInfo(); });
  ok((await p.locator('#infopop').count()) === 1, 'D1 un solo #infopop dopo altre due chiamate a bindInfo');
  await p.click('button[data-src="stateHelp"]'); await p.waitForTimeout(150);
  ok((await pop(p)) !== null, 'D2 un clic apre ancora (nessun doppio gestore che apre e richiude)');
  await p.click('button[data-src="stateHelp"]'); await p.waitForTimeout(150);
  ok((await pop(p)) === null, 'D3 un secondo clic chiude');

  // E. data-src che non esiste: riquadro con il solo link della guida, nessun errore
  const n0 = errs.length;
  await p.evaluate(() => { document.querySelector('button[data-src="stateHelp"]').dataset.src = 'nonEsiste'; });
  await p.click('button[data-src="nonEsiste"]'); await p.waitForTimeout(150);
  const e1 = await pop(p);
  ok(e1 !== null && errs.length === n0, `E1 data-src mancante: si apre senza errori, testo «${e1}»`);
  await p.keyboard.press('Escape');

  // F. XSS: data-info entra come testo
  await p.evaluate(() => { const x = document.querySelector('#v-mon button.info[data-info]'); x.dataset.info = '<img src=x onerror="window.__xss=1">'; x.id = 'xssBtn'; });
  await p.click('#xssBtn'); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => window.__xss)) && !(await p.locator('#infopop img').count()), 'F1 data-info con HTML: mostrato come testo, nessuno script');
  await p.keyboard.press('Escape');

  // G. riquadro aperto al passaggio del mouse, Esc mentre si scrive nel comando: dove va il focus?
  await p.goto(BASE + 'index.html#mon'); await p.reload(); await p.waitForTimeout(2500);
  await p.focus('#cmd'); await p.keyboard.type('XL');
  await p.hover('button[data-src="stateHelp"]'); await p.waitForTimeout(400);
  const hov = await pop(p);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  const fa = await p.evaluate(() => ({ id: document.activeElement.id, cls: document.activeElement.className, v: document.getElementById('cmd').value }));
  ok(hov !== null, 'G1 passaggio del mouse apre il riquadro');
  console.log(`   G2 dopo Esc con il riquadro aperto al passaggio del mouse e il focus nel comando, focus su: ${JSON.stringify(fa)}`);
  res.push([fa.id === 'cmd', `G2 focus resta nel comando (${JSON.stringify(fa)})`]);

  // H. <summary>: il clic sul «i» non apre la scheda; il «i» dei cali forti prima di aprire la scheda
  await p.goto(BASE + 'index.html#XLK'); await p.waitForTimeout(3000);
  const o0 = await p.evaluate(() => document.getElementById('secEpiBox').open);
  await p.click('button[data-src="secEpiHelp"]'); await p.waitForTimeout(150);
  const o1 = await p.evaluate(() => document.getElementById('secEpiBox').open);
  ok(o0 === o1 && (await pop(p)) !== null, `H1 «i» nel summary: riquadro aperto, scheda invariata (${o0}→${o1})`);
  await p.keyboard.press('Escape');
  await p.click('button[data-src="secCapHelp"]'); await p.waitForTimeout(150);
  const cap = await pop(p) || '';
  ok(/Drop giornaliero cumulato/.test(cap), `H2 «i» dei cali forti con la scheda ${await p.evaluate(() => document.getElementById('secCap').open ? 'aperta' : 'chiusa')}: «${cap.slice(0, 60)}…»`);
  await p.keyboard.press('Escape');

  // I. SOXX: «i» nella frase generata dal js
  await p.goto(BASE + 'index.html#SOXX'); await p.waitForTimeout(3000);
  await p.click('#secQuality button.info'); await p.waitForTimeout(150);
  ok(/Come è costruita questa storia/.test(await pop(p) || ''), 'I1 «i» generato da bottom.js (SOXX) con il testo completo');
  // cambio del livello blu: la frase si ridisegna, il riquadro aperto non resta orfano
  await p.click('#blueUp').catch(() => {}); await p.waitForTimeout(400);
  const orphan = await p.evaluate(() => ({ pop: !document.getElementById('infopop').hidden, conn: !!document.querySelector('#secQuality button.info[aria-expanded="true"]') }));
  console.log('   I2 dopo + del livello blu:', JSON.stringify(orphan));
  await p.click('#blueReset').catch(() => {});

  // J. tastiera: Tab fino a un «i», Invio apre, Esc chiude e il focus torna sul bottone; cambio vista chiude
  await p.goto(BASE + 'index.html#mon'); await p.waitForTimeout(2500);
  await p.focus('button[data-src="stateHelp"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  const k1 = await pop(p);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  const k2 = await p.evaluate(() => document.activeElement.dataset.src);
  ok(k1 !== null && k2 === 'stateHelp' && (await pop(p)) === null, 'J1 Invio apre, Esc chiude e riporta il focus');
  await p.keyboard.press(' '); await p.waitForTimeout(150);
  ok((await pop(p)) !== null, 'J2 Spazio apre');
  await p.keyboard.press('3'); await p.waitForTimeout(800);
  ok((await pop(p)) === null && /btm/.test(await p.evaluate(() => location.hash)), 'J3 tasto 3 con il riquadro aperto: cambia vista e chiude il riquadro');

  ok(!errs.length, `Z console: ${errs.join(' | ')}`);
  await b.close();
  const f = res.filter((r) => !r[0]).length;
  console.log(`${res.length - f} OK, ${f} FAIL`);
})();
