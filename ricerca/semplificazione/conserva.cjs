// Fase 2 della semplificazione (1.13.0): nessuna informazione persa.
// Per ogni testo di inventario.csv con proposta diversa da TENERE (testo di oggi nella 1.11.0), controlla che ogni sua frase
// sia ancora nell'app o nella guida: nella pagina (testo visibile), in un riquadro «i» (contenitori .info-src, data-info),
// in un title, nella guida rapida o in guida.html. Una frase passa se almeno il 70% delle sue parole lunghe (5 lettere o più)
// sta in uno stesso paragrafo del corpus e se i suoi numeri ci sono anch'essi (in quel paragrafo o altrove nel corpus).
// Per i testi generati dai js (sorgente js/…) si controllano solo i numeri scritti nel codice (costanti come «31,5», «99°»):
// gli altri vengono dai dati del 12/11/2026 e oggi sono altri.
// Le eccezioni motivate sono in ECCEZIONI qui sotto. Scrive ricerca/semplificazione/conserva.json.
// Uso: BASE=http://127.0.0.1:8795/ NODE_PATH=$(npm root -g) node ricerca/semplificazione/conserva.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8795/';
const ROOT = path.join(__dirname, '..', '..');

// frasi che non devono esserci per scelta, con il motivo (id dell'inventario → [inizio della frase, motivo])
const ECCEZIONI = {
  9: [['Sector Monitor segue due cose', 'guida rapida accorciata; stesso contenuto in guida.html#inizio («fa due lavori»)']],
  10: [['1 Monitor: gli 11 settori ordinati per stato', 'guida rapida accorciata; dettaglio in guida.html#mon'],
    ['In alto, se sei già passato', 'guida.html#mon, «Cosa è cambiato dall\'ultima visita» (con i 5 punti)'],
    ['Clic su un settore per il dettaglio, dove il riquadro', 'guida.html#sec, «Perché questo stato» (con ✓ e ✗)'],
    ['Sul telefono le spiegazioni delle intestazioni', 'guida.html#schermo (tocco sui valori con la sottolineatura a puntini) e #inizio (bottone «i»)']],
  13: [['4 Settore: prezzo, drawdown e breadth nel tempo', 'guida rapida accorciata; dettaglio in guida.html#sec e #cali']],
  14: [['Sotto, le bolle dei titoli', 'guida rapida accorciata; dettaglio in guida.html#tit-bolle']],
  15: [['La colonna e la scheda Cali forti contano', 'guida.html#cali (preset di Rea, 99° percentile, allerta che si ripete)']],
  29: [['1 Asset class confronta', 'tabella degli universi in guida.html#universi e #portafoglio'], ['2 Fattori', 'guida.html#universi'], ['3 Regioni e 4 Paesi', 'guida.html#universi'],
    ['Sotto il grafico, la nota «come si calcola»', 'il riquadro sotto il grafico non c\'è più: il confronto è in guida.html#formule, aperto dal «i» accanto a Formula']],
  39: [['Nella barra in alto scrivi un ETF settoriale', 'guida rapida accorciata; tabella completa dei comandi in guida.html#comandi'], ['XLU) per aprirne', 'guida.html#comandi'],
    ['ORO, INDIA, TESLA)', 'guida.html#comandi'], ['NDX, DAX) apre', 'guida.html#comandi'], ['CHIARO o SCURO', 'guida.html#comandi («sceglie o inverte il tema»)']],
  49: [['Sector Monitor cerca i possibili bottom', 'introduzione accorciata; guida.html#inizio'], ['Leggi il Monitor', 'introduzione accorciata; «sul telefono sopra» in guida.html#schermo'],
    ['Apri 2 Rotazione e scegli', 'introduzione accorciata; universi in guida.html#universi']],
  51: [['Clic su un\'intestazione per ordinare', 'tolta dalla pagina (regola 4 del piano); guida.html#rrg-tabelle «un clic sulle intestazioni ordina la tabella»']],
  66: [['Il benchmark è un portafoglio di esempio', 'accorciata nella pagina («Benchmark: un portafoglio di esempio con le 10 componenti qui sotto…»); il resto in guida.html#portafoglio']],
  71: [['Composizione e cursori sotto il grafico', 'tolta: il pannello del portafoglio è subito sotto il grafico']],
  84: [['coda = ultime 8 settimane · il percorso', 'legenda accorciata; il percorso del bottom nel riquadro «i» della legenda e in guida.html#btm']],
  93: [['Informativo: non fa parte delle regole del semaforo', 'accorciata: «(solo contesto, non fa parte delle regole)»']],
  96: [['Le modifiche valgono solo in questo browser', 'accorciata: «Vale solo in questo browser»; prova dei livelli in guida.html#sec-livello']],
  158: [['Le modifiche valgono solo in questo browser', 'accorciata: «Vale solo in questo browser»; prova dei livelli in guida.html#sec-livello']],
  112: [['4 zone blu dal', 'tolto solo «rendimenti a confronto sotto la tabella»: il confronto è subito sotto; il resto è generato dai dati di oggi']],
  189: [['4 zone blu dal', 'tolto solo «rendimenti a confronto sotto la tabella»: il confronto è subito sotto; il resto è generato dai dati di oggi']],
  119: [['Clic su un settore per vederne i titoli', 'accorciata: «Clic su un settore per i suoi titoli»']],
  142: [['titolo estero quotato negli Stati Uniti', 'legenda accorciata («quotato negli USA»); ADR in guida.html#industrie']],
  195: [['cambio al 12/11/2026', 'date generate dai dati (oggi sono altre); la riga resta nella pagina']],
  228: [['Lo scatter conta i giorni', 'riquadro «i» dello scatter («come il grafico di Massimo Rea», «Contare i giorni dà più peso alle crisi lunghe») e guida.html#vix-scatter']],
  6: [['Se compare «Nuova versione: ricarica», il browser sta usando file vecchi: clic sul pulsante, oppure Ctrl+F5 (su Mac Cmd+Maiusc+R)', 'accorciata nella guida rapida; la scorciatoia del Mac è in guida.html#faq («Non vedo le ultime novità»)']],
  56: [['colore = quadrante', 'la legenda dei quattro quadranti è subito a sinistra, con il loro colore']],
  63: [['Formula nuova · medie esponenziali divise per la volatilità · come si calcola e cosa cambia con le medie semplici', 'era il titolo del riquadro piegato, che non c\'è più; il contenuto è in guida.html#formule']],
  64: [['Il tuo portafoglio · come adattare i pesi e cosa cambia nel grafico', 'titolo del riquadro piegato tolto; contenuto in guida.html#portafoglio'],
    ['«Porta a 100%» riscrive i numeri', 'guida.html#portafoglio («Porta a 100%» riscrive i numeri)'], ['I pesi restano salvati in questo browser', 'guida.html#portafoglio e riquadro «i» («I pesi restano in questo browser»)']],
  65: [['Da sapere · dati, limiti e come usare questo universo', 'titolo del riquadro piegato tolto; contenuto in guida.html#asset-reali']],
  72: [['Vale anche come confronto con il tasso Fed', 'la frase resta nella riga BIL della tabella dei benchmark, evidenziata quando è il benchmark'],
    ['Ora il benchmark è Liquidità in dollari', 'la spiegazione resta nella riga del benchmark scelto, evidenziata; la riga sopra dice quale è']],
  123: [['Grandi contro piccoli', 'titolo del paragrafo']],
  124: [['Titoli del settore', 'titolo del paragrafo']],
  125: [['Dati', 'titolo del paragrafo']],
  126: [['Perché non coincide con il grafico di Rea', 'titolo del paragrafo, che è anche la domanda della FAQ'],
    ['I numeri non coincidono, per tre motivi', 'guida.html#faq-rea: «Sono vicini ma calcolati in modo diverso, per tre motivi»']],
  227: [['Dopo i picchi', 'titolo del paragrafo']],
  229: [['VIX contro realizzata', 'titolo del paragrafo (in guida «VIX contro volatilità realizzata»)']],
  230: [['Struttura a termine', 'titolo del paragrafo']],
  231: [['Credito high yield', 'titolo del paragrafo']],
};

function parseCSV(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = ''; } else if (ch === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (ch !== '\r') f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...r] = rows; return r.filter((x) => x.length === h.length).map((x) => Object.fromEntries(h.map((k, i) => [k, x[i]])));
}
const norm = (s) => s.replace(/ /g, ' ').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const STOP = new Set(['della', 'delle', 'dello', 'degli', 'nella', 'nelle', 'negli', 'sulla', 'sulle', 'dalla', 'dalle', 'dagli', 'questo', 'questa', 'quello', 'quella', 'quindi', 'anche', 'oppure', 'sono', 'perché', 'mentre', 'sempre', 'ancora', 'dopo', 'prima', 'senza', 'circa', 'tutti', 'tutte', 'ogni']);
const words = (s) => [...new Set((norm(s).toLowerCase().match(/[\p{L}]{5,}/gu) || []).filter((w) => !STOP.has(w)))];
const nums = (s) => [...new Set(norm(s).match(/\d+(?:[.,/]\d+)*/g) || [])];
const hasNum = (text, n) => new RegExp(`(^|[^\\d.,/])${n.replace(/[.,/]/g, (c) => '\\' + c)}([^\\d]|[.,](?!\\d)|$)`).test(text);
const sentences = (t) => norm(t).split(/(?<=[.!?:;])\s+(?=[A-ZÀ-Ü«"(]|\d)/u).map((x) => x.trim()).filter((x) => words(x).length >= 2 || nums(x).length);

(async () => {
  const inv = parseCSV(fs.readFileSync(path.join(__dirname, 'inventario.csv'), 'utf8')).filter((r) => r.proposta !== 'TENERE');
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.clear(); localStorage.setItem('sm.introSeen', 'false'); } } catch {} });
  const p = await c.newPage();
  const paras = new Set();
  const grab = () => p.evaluate(() => {
    const out = [];
    const vis = (el) => el.getClientRects().length > 0;
    for (const v of document.querySelectorAll('.view:not([hidden]), footer, #intro:not([hidden]), #filters:not([hidden])')) for (const line of v.innerText.split('\n')) out.push(line);
    for (const el of document.querySelectorAll('.info-src p, .info-src > div, .info-src')) out.push(el.textContent);
    for (const el of document.querySelectorAll('[data-info]')) out.push(el.dataset.info);
    for (const el of document.querySelectorAll('[title]')) out.push(el.getAttribute('title'));
    for (const el of document.querySelectorAll('#helpModal p, #helpModal li, #helpModal dd')) out.push(el.textContent);
    return out;
  });
  const add = (list) => list.forEach((x) => { x = x && x.replace(/\s+/g, ' ').trim(); if (x) paras.add(x); });
  const go = async (hash, wait) => { await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForSelector(wait, { timeout: 40000, state: 'attached' }).catch(() => {}); await p.waitForTimeout(900); add(await grab()); };
  await p.goto(BASE + '#mon'); await p.waitForSelector('#boardTable tbody tr', { timeout: 40000 }); await p.waitForTimeout(800); add(await grab());
  for (const [h, w] of [['#rrg', '#rotTable tbody tr'], ['#btm', '#bm circle'], ['#XLK', '#memTable tbody tr'], ['#SOXX', '#memTable tbody tr'], ['#tit', '#titPain tbody tr'], ['#tit-SOXX', '#titPain tbody tr'], ['#idx', '#ixTable tbody tr'], ['#emg', '#emTable tbody tr'], ['#vix', '#vxTable tbody tr'], ['#alr', '#alertLog li'], ['#ath', '#athTable tr.athr']]) await go(h, w);
  // rotazione: universi globali, portafoglio, asset reali, tabella dei prezzi
  await go('#rrg', '#rotTable tbody tr');
  for (const g of ['1 · Asset class', '5 · Asset reali']) { await p.selectOption('#groupSel', g); await p.waitForTimeout(900); await p.click('#tableSeg button[data-mode="px"]'); await p.waitForTimeout(400); add(await grab()); await p.click('#tableSeg button[data-mode="rot"]'); }
  // guida completa
  await p.goto(BASE + 'guida.html'); await p.waitForTimeout(500);
  add(await p.evaluate(() => [...document.querySelectorAll('main p, main li, main td, main dd')].map((x) => x.textContent)));
  await b.close();
  const corpus = [...paras].map(norm), all = corpus.join('\n');
  const cw = corpus.map((x) => new Set(words(x)));
  const res = [];
  for (const r of inv) {
    const js = r.sorgente.startsWith('js/') ? fs.readFileSync(path.join(ROOT, r.sorgente.split(':')[0]), 'utf8') : null;
    const exc = ECCEZIONI[r.id] || [];
    const bad = [], skipped = [];
    for (const s of sentences(r.testo_oggi)) {
      const e = exc.find(([start]) => s.startsWith(start) || start.startsWith(s.replace(/[.:]$/, '')));
      if (e) { skipped.push([s.slice(0, 60), e[1]]); continue; }
      const ws = words(s);
      let best = -1, bi = -1;
      for (let i = 0; i < cw.length; i++) { let k = 0; for (const w of ws) if (cw[i].has(w)) k++; const sc = ws.length ? k / ws.length : 1; if (sc > best) { best = sc; bi = i; } }
      const ns = nums(s).filter((n) => !js || js.includes(n));
      const missN = ns.filter((n) => !hasNum(all, n));
      if (best < 0.7 || missN.length) bad.push({ frase: s.slice(0, 140), parole: Math.round(best * 100) + '%', numeri_mancanti: missN, piu_vicino: (corpus[bi] || '').slice(0, 140) });
    }
    res.push({ id: +r.id, vista: r.vista, proposta: r.proposta, posizione: r.posizione, ok: !bad.length, mancano: bad, eccezioni: skipped });
  }
  fs.writeFileSync(path.join(__dirname, 'conserva.json'), JSON.stringify({ base: BASE, voci: res.length, ok: res.filter((x) => x.ok).length, risultati: res }, null, 1));
  for (const x of res.filter((x) => !x.ok)) { console.log(`FAIL ${x.id} ${x.vista} ${x.posizione}`); for (const m of x.mancano) console.log(`   ${m.parole} «${m.frase}» numeri mancanti: ${m.numeri_mancanti.join(' ') || '—'}\n      più vicino: «${m.piu_vicino}»`); }
  const ex = res.flatMap((x) => x.eccezioni.map((e) => `${x.id}: «${e[0]}» — ${e[1]}`));
  console.log(`\nEccezioni motivate (${ex.length}):\n` + ex.join('\n'));
  console.log(`\n${res.filter((x) => x.ok).length} su ${res.length} voci conservate`);
  process.exit(res.every((x) => x.ok) ? 0 : 1);
})();
