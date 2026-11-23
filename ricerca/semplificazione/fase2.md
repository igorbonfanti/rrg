# Semplificazione delle note, fase 2 (versione 1.13.0, parte A del piano)

Piano di lavoro del 23/11/2026 sul ramo `claude/great-noether-2f1ude`, partendo dalla 1.12.0 (commit 0c253bb). Applica la parte A di `piano.md` (note più corte) con le decisioni dell'utente. Nessuna regola, formula, soglia o numero cambia: si spostano e si accorciano testi. Ogni numero che resta scritto (pagina, riquadro «i» o guida) è quello di oggi, con il suo script in `ricerca/`.

## Decisioni dell'utente (vincolanti)

- Nella pagina restano istruzioni d'uso brevi, stato dei dati e legende brevi. Metodo, limiti e definizioni vanno in un bottone «i» accanto al titolo o all'intestazione (si apre al passaggio del mouse e al clic, al tocco, con Invio o Spazio; si chiude con Esc o toccando fuori; link «Nella guida ↗») oppure nella guida.
- Una sola riga «Fonti e note» per vista, in fondo, con le citazioni obbligatorie (Massimo Rea e quant-rea sempre; Stefano Serafini e «VIX e VIX3M © Cboe, da FRED» nel VIX; Francesco Caruso nella vista 0; Fed e FRED negli Emergenti) e il link alla sottosezione della guida `#fonti-…`. Nella guida una sezione nuova «Fonti e note» (`#fonti`) con il testo completo delle fonti e delle condizioni.
- Monitor: la legenda «Come si legge lo stato» diventa una riga per stato; la regola completa nel riquadro «i» e nella guida.
- Guida rapida (tasto ?): solo l'elenco delle viste, gli stati, i comandi e il glossario; il resto nella guida completa.

## File e ordine

1. **Questo piano** (commit).
2. **`js/info.js`** (nuovo) e CSS in `css/style.css`:
   - bottone `<button type="button" class="info" data-src|data-info data-guide aria-label aria-expanded>i</button>`, riquadro unico `.infopop` con il testo in una regione `role="status"`;
   - delega degli eventi sul documento, legata una sola volta da `bind()` di `js/app.js` (funziona anche per i bottoni nelle intestazioni ridisegnate dai js);
   - apertura col mouse dopo 120 ms (solo puntatore fine), al clic, al tocco, con Invio e Spazio (sono bottoni veri); chiusura con Esc (il focus torna sul bottone), con un clic o un tocco fuori, con un altro «i»;
   - Esc ascoltato su `window` in cattura, prima di `js/zoom.js` (che ascolta sul documento in cattura): con un riquadro aperto il primo Esc chiude il riquadro e non toglie lo zoom;
   - il clic sul bottone non arriva alle righe, ai pulsanti di ordinamento né ai `<summary>` (preventDefault e stopPropagation in cattura);
   - funzione pura `placeBox` (posizione del riquadro: sotto il bottone, sopra se sotto non c'è posto, dentro lo schermo) con test in `test/info.test.js`; nello stesso test: ogni `data-src` di `index.html` ha il suo contenitore e ogni `data-guide` ha la sua ancora in `guida.html`;
   - CSS con i token esistenti (`--ink-3`, `--amber`, `--panel`, `--ink-2`), quindi temi chiaro e scuro senza regole a parte; area di tocco di 32 px con uno pseudo-elemento;
   - `.ihint` della linea del tempo (`#pkPanel`) convertito al bottone nuovo.
3. **`guida.html`**: sezione `#fonti` con `#fonti-mon`, `#fonti-rrg`, `#fonti-btm`, `#fonti-sec`, `#fonti-tit`, `#fonti-idx`, `#fonti-emg`, `#fonti-vix`, `#fonti-alr`, `#fonti-ath`; testi che oggi mancano (StockCharts 25/09/2026 e scarto di circa 0,2 con SPY con il confronto completo delle due formule; RSP 0,47 su 60 e SPDR 1,6-1,7; «Perché non coincide con il grafico di Rea» per intero in `#faq-rea`; CPI di ottobre 2025, dollar index inverso, SGLD e gli altri in `#asset-reali`; «15 su 17» con il minimo provvisorio e il ricalcolo; «89 tocchi su 132» con `ricerca/avvicinamento-uso/`; percorsi di ricalcolo del VIX; portafoglio: tastiera, componenti fisse, pesi nel browser); ancore usate dai «i» (`#vix-picchi`, `#vix-scatter`, `#vix-realizzata`, `#vix-struttura`, `#tit-grandi`, `#tit-storia`, `#tit-bolle`, `#tit-dati`, `#emg-leggere`, `#sec-episodi`, …). Commit prima di togliere qualsiasi testo dalla pagina.
4. **Vista per vista**, un commit ciascuna con `npm test` verde, nell'ordine del piano: VIX, Titoli, Emergenti, Monitor con la guida rapida, Rotazione, Indici e Settore insieme, Bottom Map, Alert, piè di pagina, 0 Massimi. Si applica `inventario.csv` (proposte ≠ TENERE). Dove i js scrivono già in un elemento (`#titData`, `#vxScBig`, `#pxCopied`, `#stateLegend`…) l'elemento resta, dentro un contenitore nascosto letto dal «i» con `data-src`: nessun `$(id).textContent =` resta senza elemento.
5. **Controlli nel browser** (`ricerca/qa/browser/`):
   - `v1100`, `v1101`, `v1110`, `v1120` e gli altri che cercano testi tolti: cercano il testo nel riquadro «i» (aperto davvero) o nella guida, e possono ancora fallire;
   - `v1130.cjs` nuovo: riquadri «i» con mouse, tocco e tastiera (Tab, Invio, Esc, Esc con lo zoom), nessun ordinamento o apertura di riga col clic sul «i», una riga di fonti per vista con le citazioni e il link alla sua ancora, nessun testo tolto rimasto visibile, nessuno scorrimento orizzontale, console senza errori, a 1440, 1280, 390 e 360 px, tema chiaro e scuro; deve fallire sulla 1.12.0;
   - `ricerca/semplificazione/conserva.cjs`: per ogni testo dell'inventario con proposta ≠ TENERE, numeri e frasi chiave ancora presenti nella pagina (testo visibile o riquadri «i») o in `guida.html`; eccezioni motivate scritte nello script.
6. **Prove**: server `python3 -m http.server 8795 --bind 127.0.0.1` dalla radice, Playwright con `NODE_PATH=$(npm root -g)`; screenshot guardati (computer prima, poi telefono).
7. **Versione 1.13.0** (`js/version.js` e `version.json` insieme, 23/11/2026), nota nel README, `docs/sviluppo.md`, parole visibili per vista prima e dopo (sotto).

## Controlli prima di ogni commit di una vista

- `npm test` verde;
- nella vista: console senza errori, nessun elemento scritto dai js mancante, il «i» si apre e ha il testo spostato;
- grep dei testi tolti in `index.html` e nei js: ogni frase tolta ha un posto (riquadro «i» della stessa vista o sezione della guida aperta da lì).

## Punti a cui fare attenzione

- Esc: zoom (`js/zoom.js`, cattura sul documento), crisi del VIX (`js/vix-view.js`), evidenza della rotazione (`js/app.js`), guida rapida (`<dialog>`).
- Bottoni nelle intestazioni ordinabili (tabella Prezzi) e nelle righe cliccabili: il clic sul «i» non ordina e non apre.
- `<summary>` dei riquadri richiudibili (Episodi, Cali forti): il «i» non apre né chiude il riquadro.
- Titoli riscritti dai js con `textContent` (`#secTitle`, `#titHistTitle`, `#emTitle`, `#athChartTitle`…): il bottone sta fuori dal titolo.
- Approssimazioni dichiarate (elenco in `docs/sviluppo.md`): restano scritte nella pagina («provvisorio», «storia con i membri di oggi», «solo prezzo», asterisco dell'ultimo prezzo noto) o nel «i» del pannello del numero o nella sezione della guida aperta da lì.

## Parole visibili per vista, prima e dopo

Conteggio del 23/11/2026 con `ricerca/semplificazione/script/conta_fase2.cjs`, lo stesso script sulle due versioni (1.12.0 dalla copia di `0c253bb`, 1.13.0 dal ramo di sviluppo), stessi dati: parole degli elementi di nota visibili subito a 1440 px (note, letture, legende, righe di stato, titoli dei riquadri piegati, righe di fonti, introduzione del Monitor alla prima visita; i riquadri «i» sono chiusi e non contano), la vista 4 con XLK, la Rotazione con i settori. La guida rapida si conta tutta.

| Vista | 1.12.0 | 1.13.0 | Variazione |
|---|---|---|---|
| Piè di pagina | 125 | 29 | -77% |
| Guida rapida (tasto ?) | 2013 | 649 | -68% |
| 1 Monitor | 447 | 193 | -57% |
| 2 Rotazione | 87 | 63 | -28% |
| 3 Bottom Map | 135 | 76 | -44% |
| 4 Settore (XLK) | 181 | 179 | -1% |
| 5 Titoli | 811 | 161 | -80% |
| 6 Indici | 394 | 230 | -42% |
| 7 Emergenti | 750 | 184 | -75% |
| 8 VIX | 1270 | 246 | -81% |
| 9 Alert | 89 | 74 | -17% |
| 0 Massimi | 358 | 148 | -59% |
| **Viste e piè di pagina** | **4647** | **1583** | **-66%** |

Il conteggio dell'inventario (`piano.md`, «In breve»: 4.976 → 1.271 previste, −74%) classificava a mano ogni voce, contava anche il pannello delle bolle ancora nel VIX (1.11.0) e i riquadri piegati in altro modo: i due numeri non sono confrontabili tra loro. La vista 4 cambia poco perché i testi più lunghi (episodi, cali forti) erano già in riquadri piegati: lì il guadagno è dentro i riquadri, le cui note lunghe sono passate nei «i». La Rotazione conta l'universo dei settori, senza i pannelli del portafoglio e degli asset reali.

## Esiti

- `npm test`: 206 test verdi (3 nuovi in `test/info.test.js`).
- `ricerca/qa/browser/v1130.cjs`: vedi `docs/sviluppo.md` (stato della 1.13.0) per i numeri dell'ultima corsa; sulla 1.12.0 fallisce.
- `ricerca/semplificazione/conserva.cjs`: 91 voci su 91 conservate, eccezioni motivate nello script (titoli di paragrafo e di riquadri tolti, frasi accorciate con il loro posto in guida o nel riquadro, date generate dai dati).
