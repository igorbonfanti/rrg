# Controllo usabilità e funzioni · versione 1.6.0 · commit 06a5360

Verdetto: GO (nessun bloccante, nessun «da correggere»; 6 minori)

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | minore | Riquadro «Credito high yield» con dati in ritardo | Se HYG/IEF resta indietro (Yahoo non risponde e `fetch_vix.js` tiene la serie pubblicata, `check_fresh` avvisa solo dopo 4 giorni), il riquadro mostra l'ultimo valore (−2,7% «al 30/10/2026») accanto al VIX del 06/11 senza nessun avviso. Il riquadro VIX/VIX3M nella stessa situazione mostra «—» e «non ancora arrivato». Il riquadro dei valori del grafico all'ultima seduta mostra invece «—» per HYG/IEF. Proprio la domanda «la paura è anche nel credito?» mette a confronto due date diverse senza dirlo, salvo la data scritta in piccolo. Proposta: trattarlo come il VIX3M (avviso «non aggiornato» o «—» quando la data è prima di quella del VIX). | caso `d-credito-fermo-5-sedute` in `percorsi.cjs` (5 sedute tolte da HYGIEF con page.route) | `shots/dati-d-credito-fermo-5-sedute-1440.png`, `percorsi.log` |
| 2 | minore | Riquadro «Credito high yield» | È l'unico riquadro senza una parola che dica com'è il valore. Il VIX ha «paura», il VIX/VIX3M ha «backwardation», il credito solo «−3,1%» e «57° percentile». Che il percentile alto voglia dire un calo più profondo si legge solo nel title. In pochi secondi non si capisce se −3,1% sia una tensione. Una fascia o una parola sarebbe una regola nuova: da decidere con l'utente. In alternativa basta aggiungere «(alto = calo più profondo)» al sottotitolo. | apri `#vix` a 1440 | `shots/1440-scuro-01-apertura.png` |
| 3 | minore | Telefono, grafico in fondo | Il grafico ora è alto 648 px, cioè l'83% di uno schermo di 780 e il 77% di uno di 844 (nella 1.5.0 era circa 404). La pagina scorre trascinando il dito in verticale sopra il grafico (`touch-action: pan-y`, verificato con eventi di tocco grezzi), ma il riquadro dei valori si apre al primo contatto (pointerdown) e resta aperto mentre si scorre. Con il grafico così alto succede spesso. Al tocco il riquadro, con 9 righe, copre il 16-18% del grafico e a destra nasconde quasi tutto il pannello VIX/VIX3M e il titolo del credito. Il comportamento c'era già (`bindTip` è comune a tutte le viste), ma ora pesa di più. | `percorsi.cjs`, sezione telefono: trascinamento sul grafico, poi tocco al 97% | `shots/390-scuro-03-tocco-grafico.png`, `percorsi.log` («aperto (minore)», «copre il 16%») |
| 4 | minore | Grafico a MAX, telefono 360-390 | Le etichette delle fasce senza dati sono più larghe della fascia. «HYG/IEF dal 09/04/2008» occupa 0–138 su una fascia 8–130 a 360 px (e 7–146 su 8–145 a 390): tocca il bordo sinistro dello schermo ed entra nella linea dei dati del 2008. Lo stesso vale per «VIX3M dal 04/12/2007» a 360. | `#vix`, MAX, 360 px | `shots/360-chiaro-04-grafico-MAX.png` |
| 5 | minore | Riquadri VIX e VIX/VIX3M, riquadro dei valori | «provvisorio» (e «provv.» nel riquadro dei valori) non è spiegato nel title dei riquadri. Lo spiegano solo la riga sotto i riquadri, in breve («FRED al …, poi Cboe provvisorio»), e le fonti in fondo alla pagina. Nella 1.5.0 il riquadro diceva almeno la fonte («Yahoo, provvisorio»). Basterebbe una frase nel title: «l'ultima seduta viene dal file di Cboe e la sostituisce FRED il giorno dopo». | passa il mouse sul riquadro VIX/VIX3M | `percorsi.log` («provvisorio» spiegato nel title: no) |
| 6 | minore | Testi del credito | Fonti e guida dicono «dal 2007», la fascia del grafico a MAX dice «HYG/IEF dal 09/04/2008» (servono 252 sedute per il massimo di 12 mesi). Chi guarda il grafico può pensare a un errore. Proposta: scrivere «indicatore dal 2008». Rilievo da passare anche al controllo dei testi. | `#vix`, MAX | `shots/1280-chiaro-03-grafico-MAX.png` |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), da correggere, minore.

## Cosa ho verificato e passa (285 controlli in `percorsi.cjs`, 0 FAIL; più v150 108 OK e v160 75 OK, 0 FAIL)

- **Percorso «paura solo in borsa o anche nel credito? backwardation?»**: a 1440 e 1280 i due riquadri nuovi sono nella prima schermata (fondo a 199-213 px). Sul telefono a 390 e 360 finiscono a 631-659 px e si vedono senza scorrere. «1,04 backwardation» si legge subito, con il colore e la parola.
- **Spiegazioni**: tutti e 6 i riquadri hanno un title; quelli nuovi spiegano backwardation, contango, HYG, IEF e percentile. Sul telefono il tocco sul riquadro apre la spiegazione (`.taptip`) dentro lo schermo, a 390 e 360, in chiaro e in scuro. «Come leggere», legenda, fonti e guida spiegano contango, backwardation, HYG/IEF e «provvisorio».
- **Tasti e indirizzi**: tasto 8 apre `#vix`; comando «vix» in minuscolo e «VIX» (v150) nella barra; Indietro, Indietro e Avanti tra `#vix` e `#mon` funzionano e la vista resta intera; tasto 9 apre Alert.
- **Cambio indice**: con Nasdaq-100 il grafico in fondo non cambia (SVG identico) e il titolo dice «… · S&P 500»; la realizzata dice «S&P 500». Si capisce che il grafico resta dell'S&P 500.
- **Periodi**: 3A, MAX e 10A restano dopo il ricaricamento; 3A si sceglie anche con Invio; al tocco MAX funziona.
- **Mirino e riquadro dei valori**: con il mouse su tutti e 4 i pannelli, al 5%, al 50% e al 99,5%, il riquadro resta dentro lo schermo (24 posizioni per dimensione) e contiene VIX3M, rapporto, stato e HYG/IEF. Il mirino arriva fino al pannello del credito e il riquadro si chiude uscendo dal grafico. Al tocco a 390 e 360 resta dentro lo schermo (6 posizioni per dimensione) e si chiude toccando fuori.
- **Scorrimento sul telefono**: trascinando il dito in verticale sul grafico la pagina scorre di circa 350 px. Il tocco non blocca lo scorrimento.
- **Impaginazione**: 6 colonne a 1440 e 1280; 3×2 a 1100, 1024, 820 e 601; 2×3 a 600, 390 e 360. Nessun testo tagliato nei riquadri, nessuno scorrimento orizzontale a nessuna larghezza provata; i titoli dei pannelli sul telefono stanno dentro il grafico.
- **Dati vecchi o mancanti** (page.route, a 1440 e 390):
  - (a) con il file della 1.5.0 i due riquadri mostrano «—» e «dato non disponibile», il grafico ha 2 pannelli e la legenda senza le voci nuove;
  - (b) senza l'ultimo VIX3M il riquadro mostra «—» e «VIX3M del 06/11/2026 non ancora arrivato · al 05/11/2026 era 1,10 (backwardation)», la riga sotto dice «VIX3M al 05/11/2026» e il riquadro dei valori mostra «—»;
  - (c) con il 404 compare «Dati del VIX non disponibili (data/vix.json: HTTP 404).», in console c'è solo la riga del browser per la risorsa 404 e nessun errore dell'app;
  - (e) senza il solo credito c'è «—» e il pannello del credito sparisce.
  
  In tutti i casi le viste 1, 6, 7 e 9 si aprono dopo, senza errori.
- **Tempi**: in locale il grafico completo arriva in 210-250 ms su computer e in 265-303 ms su telefono. Con 4G lento simulato (1,6 Mbit/s, 150 ms di latenza) e processore ×4, la mediana è 1545 ms contro 1305 ms con il file della 1.5.0 (+0,24 s; il file compresso passa da 65 a 81 KB); il passaggio a MAX richiede 283 ms contro 254 (`tempi.log`).
- **Regressioni**: le viste 1-9 si aprono senza errori in console e senza scorrimento orizzontale a 1440 e a 390; `npm test` passa 142 test su 142; v150.cjs 108 OK, v160.cjs 75 OK.
- **Controllo che può fallire**: `percorsi.cjs` lanciato sulla 1.5.0 (origin/main) si ferma subito (manca `path.vxcr`, uscita 2).

## Cosa non ho potuto verificare e perché

- Il tooltip nativo del title al passaggio del mouse non compare negli screenshot di Playwright: ho controllato che il title ci sia e cosa dice, non come appare.
- Lo scorrimento con il dito è simulato con eventi di tocco CDP in Chromium headless, non su un telefono vero né su Safari per iOS. `Input.synthesizeScrollGesture` in headless non scorre nemmeno sul testo: un primo esito negativo era un artefatto e non va usato.
- Tablet con tocco vero (iPad): provato solo con viewport a 820 e 1024 e `hasTouch`.
- GitHub Pages: controllato solo il server locale con gzip (`gzserve.mjs`).

Script e screenshot: `ricerca/qa/1.6.0/usabilita/percorsi.cjs` (log `percorsi.log`), `tempi.cjs` (`tempi.log`), `v150.log`, `v160.log`, `shots/` (58 immagini).
