# Controllo uso e testi · versione 1.11.0 · commit 56e6768

Verdetto: **GO**. Il rilievo 1 «da correggere» è un testo da sistemare prima di pubblicare. È una correzione di poche parole e non blocca.

Server statico mio: `python3 -m http.server 8917` sulla cartella del repository, pagina `http://127.0.0.1:8917/#vix`. Non ho toccato nessun file dell'app.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Avvertenza `UNSTABLE_NOTE` (`scripts/fetch_ath.js:70`, `stableNote` nei dati) e `VP_NOTE` (`js/vix-view.js:467`), nota `#athNote`, guida («Stabilità»), README | Il motivo dato per i 3 mercati che non passano è sempre lo stesso: «con barre giornaliere e orarie le zone principali non coincidono». Per il **Nasdaq-100** non è così. Con 100 fasce, giornaliero e orario restano entro lo 0,95%. La prova cade solo perché tra i profili orari quello a 50 fasce sposta il bordo basso del 3,22%. Per il **KOSPI** giornaliero e orario a 100 fasce coincidono (scarto 0). Lo scarto arriva quando si cambia anche il numero di fasce. La frase vale bene solo per l'oro. Nella nota del pannello poi il «perché» si lega a «si mostrano lo stesso», e la frase sembra dire che vengono mostrati *perché* le zone non coincidono. | `python3 -c "import json;[print(m['id'],m['info']['vaSpreadSubsets']) for m in json.load(open('ricerca/poc/profilo/risultati.json'))['markets'] if m['id'] in ('GOLD','NDX','KOSPI')]"`. NDX: dailyOnly 0,32%, n100 0,95% (passerebbe), hourlyOnly 3,22%. KOSPI: n100 0/0. Vedi anche `sintesi.md` §3 («Senza le 50 fasce passerebbe»). | `ricerca/poc/profilo/risultati.json`. Proposta: «profilo poco stabile: con metodi di calcolo diversi (barre giornaliere o orarie, 50, 100 o 200 fasce) le zone principali si spostano oltre il 2% (due zone di volume quasi uguali); leggere con cautela». Nella nota: «…si mostrano lo stesso, con un'avvertenza: …» |
| 2 | minore | Legenda, profilo con `to` dopo l'ultima seduta del grafico | Senza zoom la legenda dice «profilo dei volumi nascosto: lo zoom non arriva all'ultima seduta». Oggi la pipeline non produce questo caso (`pickProfile` tiene `to` ≤ ultima seduta), ma il messaggio sarebbe falso. | `profilo.cjs`, variante `SPX-to-futuro` (page.route con `profiles.SPX.to = '2099-01-01'`) | `profilo.txt`, ultime righe |
| 3 | minore | Guida, «Come si calcola» | «Il profilo finisce con l'ultima seduta del grafico». Oggi per il KOSPI non è così: il grafico arriva al 13/11/2026, il profilo al 12/11/2026 (Yahoo ridà la serie fino al 12/11, caso della 1.10.2). La legenda mostra le date giuste, quindi non c'è un numero sbagliato. Basterebbe «di solito con l'ultima seduta; le date sono nella legenda». | Aprire il KOSPI: la legenda dice «ultima chiusura … il 13/11/2026» e il profilo «dal 12/11/2025 al 12/11/2026» | `shots/KOSPI-1440-scuro-3A.png` |
| 4 | minore | Legenda con zoom fino all'ultima seduta | La voce «┆ inizio dei 12 mesi» resta anche quando la linea è fuori dal tratto e non si vede. Con lo zoom la scala si allarga ai 12 mesi del profilo: la linea del prezzo occupa circa il 60% dell'altezza (155–162 px su 260). Questo limite è scritto in `docs/sviluppo.md` ma non nella guida, che parla solo dello zoom che *non* arriva all'ultima seduta. | Zoom con trascinamento dall'80% al 100% del grafico, SPX 3A | `shots/zoom-fine-SPX-1440-scuro.png`, righe INFO di `profilo.txt` |
| 5 | minore | README, nota 1.11.0 | «1,36 MB nella corsa del 13/11/2026» non si ritrova in nessun file del repository. La somma delle 5 risposte misurate in `sintesi.md` §4.1 fa 1,34 MB, il commento del workflow dice «~1,4 MB». Meglio citare la fonte o scrivere «circa 1,3–1,4 MB». | `grep -rn "1,36" ricerca/poc/profilo/ docs/` (nessun risultato) | |
| 6 | minore | Nota `#athNote` | La nota è diventata lunga: 1.649 caratteri, 286 parole in un solo paragrafo, sul telefono più di una schermata. «Scelta dell'utente del 13/11/2026» va bene in `docs/`, ma chi legge l'app non sa chi sia «l'utente». In guida questa formula c'era già. | Aprire `#vix` a 390 px | |
| 7 | minore (c'era già) | Tastiera | Il riquadro delle barre si apre solo con il mouse o il tocco: nel grafico non c'è nessun elemento raggiungibile con Tab, come per il resto del grafico dal 1.10.0. L'`aria-label` cita il profilo. Righe e periodi funzionano con Tab e Invio. | `profilo.cjs`, blocco «tastiera» | |
| 8 | nessuno (falso positivo del mio controllo) | 390 e 360 px, S&P 500 3A/10A | I riquadri del testo «vol. 12m» e del valore «8k» dell'asse si toccano di 1–2 px (contorni del carattere). A occhio sono separati. | `shots/SPX-390-scuro-3A.png` | |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), da correggere, minore.

## Cosa ho verificato e passa

- **`ricerca/qa/1.11.0/uso-testi/profilo.cjs`: 4.911 controlli passati, 10 falliti.** Gli 8 falliti per «vol. 12m/8k» sono il falso positivo del rilievo 8, i 2 del caso `SPX-to-futuro` sono il rilievo 2. Viste: 1440, 1280, 390 e 360 px, tema scuro e chiaro, 9 mercati, 3A, 10A e MAX.
  - **Quote del riquadro: 681 riquadri provati, tutti giusti.** Su tutte le barre a 1440 scuro 3A e su un campione altrove (più bassa, più alta, più lunga, una a caso). Ho controllato fascia «da … a …» e quota (somma dei `bp` delle fasce unite divisa per la somma totale, ricalcolata dal file). Con un solo riquadro alla volta, la barra accesa è quella sotto il puntatore o il dito. La quota non è giusta solo per la barra più lunga: le ho controllate tutte.
  - **Altezza delle barre.** La scala logaritmica l'ho ricavata da due valori dell'asse: ogni barra sta alla quota dei suoi prezzi, entro 0,8 px. `lo` e `hi` del file sono al posto giusto. I valori intermedi dell'asse sono coerenti tra loro.
  - **Fasce unite.** Le ho ricalcolate dalla scala: il più piccolo divisore di 100 che dà almeno 3 px. Coincidono con quelle dell'app. Le lunghezze delle barre sono proporzionali alla quota.
  - **Niente sovrapposizioni.** Le barre stanno dentro la colonna. La linea del prezzo e il punto dell'ultima chiusura restano a sinistra della colonna. La linea dei 12 mesi sta dentro il riquadro del prezzo. Tutti i testi del disegno stanno dentro i bordi.
  - **Legenda e avvertenza.** La legenda ha le date e lo strumento giusti per ogni mercato. L'avvertenza c'è solo per oro, Nasdaq-100 e KOSPI, sia in legenda sia nel riquadro.
  - **Riquadro.** Resta dentro lo schermo e il testo non è tagliato. Si chiude fuori dal grafico. Sulla colonna vuota non si apre. Sul prezzo torna il riquadro della seduta, senza barre accese.
  - **Zoom e scorrimento.** Con uno zoom a metà la colonna si toglie, il riquadro del prezzo torna largo e la legenda lo dice. Esc toglie lo zoom. Con uno zoom fino all'ultima seduta la colonna torna. Prove con SPX, WTI e KOSPI su computer e con SPX sul telefono, dove lo zoom si attiva dalla lente e si trascina con il tocco. Nessuno scorrimento orizzontale.
  - **Console** senza errori in tutte le 8 combinazioni.
- **Dati mancanti o rovinati** (page.route, 1440 e 390 px), 11 varianti:
  - colonna tolta e «profilo dei volumi non disponibile» per: senza `profiles`, `profiles.SPX = null`, `bp` con 99 valori, `bp` tutti a 0, un `bp` null, `lo = 0`, `profiles` che è una stringa. Gli altri mercati restano a posto;
  - senza `text` si usa il simbolo e senza `stable` non c'è avvertenza;
  - senza `stableNote` resta l'avvertenza predefinita;
  - con `from` prima del tratto mostrato non c'è nessuna linea sul bordo;
  - con `ath_history.json` in 404 c'è il messaggio dello storico mancante;
  - nessun errore in console.
- **Tastiera** (rilievo 7 a parte): Invio su una riga apre il grafico con il profilo, Tab raggiunge i periodi, Invio su MAX cambia periodo.
- **Tablet a 820 px** (`tablet820.cjs`), chiaro e scuro, S&P 500, oro e rame: colonna di 61 px, riquadro al tocco, nessuno scorrimento. 6 su 6.
- **Il controllo può fallire.** Lanciato sulla versione 1.10.x (d0ba3c5, senza `profiles`) si ferma con un errore, quindi non passa.
- **Regressioni** con `BASE=http://127.0.0.1:8917/`:
  - `v1100.cjs`: 66 OK, 0 FAIL;
  - `v1101.cjs`: 15 OK, 0 FAIL;
  - `v1110.cjs`: 2.845 OK, 0 FAIL (con `SHOTS=0`, senza riscrivere le immagini di chi ha scritto il codice).
- **`npm test`**: 0 falliti.
- **Dati.** I `bp` di `data/ath_history.json` sono uguali a `ricerca/poc/profilo/profilo_app.json` per 6 mercati. NDX cambia di 1 bp e SOXX di 2 bp. Il KOSPI ha un'altra finestra (dal 12/11/2025 al 12/11/2026). Tutte e tre le differenze sono spiegate in `docs/sviluppo.md`. La somma dei `bp` va da 9.990 a 10.005, come dice il README.
- **Testi** ritrovati nelle fonti:
  - in `sintesi.md` e `risultati.json`: «6 mercati su 9» e la lista dei mercati; gli strumenti (`config/ath.json` uguale alla tabella §2.1); le barre orarie per argento e rame, con il motivo (contratto del mese più vicino, 0,24% e 2,2%); il volume ricopiato sull'ultima seduta dei future; «la forma regge» (0,936–0,945); il volume in quote o contratti (bitcoin in dollari);
  - in `ricerca/poc/sintesi.md` (252 sedute su 252): il volume di ^GSPC è quello del NYSE Composite e quello di ^NDX quello del Nasdaq Composite. Questo regge la frase della guida «il volume degli indici su Yahoo non è quello dei titoli dell'indice».
- **Coerenza** (grep su `index.html`, `guida.html`, `README.md`, `js/version.js`, `docs/sviluppo.md`, workflow): strumenti, «6 mercati su 9», «profilo poco stabile» e il percorso `ricerca/poc/profilo/` sono uguali dappertutto. Il commento del workflow conta 5 richieste in più, come il README. `version.json` e `js/version.js` sono entrambi a 1.11.0.
- **Nessuna promessa di segnale**: «non è un livello né un segnale», «dice dove si è scambiato, non dove il prezzo si fermerà». Caruso è citato nella nota del pannello, come prima. L'idea del profilo è dell'utente, quindi non serve un'altra citazione.

## Cosa non ho potuto verificare e perché

- La corsa notturna vera, con Yahoo, e i 1,36 MB: non ho rete verso Yahoo e non ho fatto scraping.
- Su un telefono vero ho provato solo l'emulazione di Playwright (tocco con CDP). Non ho provato lettori di schermo.

## Script e immagini

- Script: `ricerca/qa/1.11.0/uso-testi/profilo.cjs` e `tablet820.cjs`. Si lanciano con `BASE=http://127.0.0.1:<porta>/ NODE_PATH=$(npm root -g) node …`.
- Risultato: `ricerca/qa/1.11.0/uso-testi/profilo.txt`.
- Immagini: `ricerca/qa/1.11.0/uso-testi/shots/`, 148 file:
  - mercati per vista e tema;
  - `tip-*` con il riquadro aperto;
  - `zoom-*`;
  - `dati-*` con i file mancanti;
  - `tablet-820-*`.
