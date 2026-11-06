# Controllo usabilità e funzioni · versione 1.4.0 · commit afc06f3

Verdetto: **GO**. Non ci sono problemi bloccanti: su computer la vista 8 funziona tutta, la console è pulita e le altre viste non sono peggiorate da 1024 px in su. Prima del push su `main` conviene però correggere le due voci «da correggere» (n. 1 e 2). La n. 1 è una regressione della barra delle schede che tocca **tutte** le viste sui tablet in verticale e nelle finestre larghe metà schermo.

Copia controllata: `http://127.0.0.1:8794/`. Ho verificato con sha1 che `js/app.js`, `js/emerging-view.js`, `js/emerging.js`, `js/indices.js`, `index.html` e `css/style.css` coincidono con afc06f3. Il confronto è con la 1.3.5 pubblicata (`origin/main` f8b7cf8, servita in locale sulla porta 8795). Le modifiche che l'autore sta facendo adesso nell'albero di lavoro (`js/emerging-view.js`, `js/emerging.js`, `js/indices.js`, `index.html` modificati dopo afc06f3) **non** sono state controllate.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Barra delle schede, larghezze da 601 a ~830 px, **tutte le viste** | Con otto schede su una riga la barra è larga 815 px. Sotto quella larghezza la scheda «8 Emergenti» esce dallo schermo e la pagina scorre in orizzontale in tutte le viste: 47 px a 768 (iPad in verticale), 71 a 744 (iPad mini), 115 a 700 (finestra larga metà di uno schermo da 1440), 214 a 601. A 820 px (iPad Air) non c'è scroll, ma la scheda sporge di 12 px oltre il bordo della cornice. La 1.3.5 non aveva problemi da 703 px in su; tra 601 e 702 sporgeva già, ma di meno (3–103 px contro i 115–214 di adesso). La regola a due righe di quattro vale solo fino a 600 px. | Finestra larga 768 px, una vista qualsiasi | `esito-f-tablet.json`, `esito-e-altre-viste.json` (33 controlli falliti, tutti per questa causa), `shots/tab-768-1.4.0.png` contro `shots/tab-768-1.3.5.png`, `shots/tab-744-1.4.0.png`, `shots/alt-820-dark-mon.png` |
| 2 | da correggere | Vista 8 a una colonna (sotto 1100 px: telefono, tablet, finestra stretta) | Un tocco su una riga del tabellone cambia il dettaglio, ma il dettaglio resta fuori dallo schermo: il titolo è 190–216 px sotto il bordo a 390/360 px e 71 px sotto a 900×1000. Chi tocca vede cambiare solo l'evidenza della riga. Un tocco su un punto del quadrante, che sul telefono sta sotto il dettaglio, lo cambia 800–870 px **più in alto**. Nella vista 6 lo stesso gesto porta al dettaglio (`open(k, true)` → `scrollIntoView`). Nella vista 8 `select()` non scorre. | Telefono 390: scheda 8, tocco sulla riga KOSPI200; poi tocco sul punto INDA del quadrante | `esito-b-telefono.json` (controlli «dopo il tocco…» e «[confronto] nella vista 6…»), `shots/390-dark-after-tap.png`, `shots/390-dark-quadrante.png`, `esito-i-larghezze.json` (900 px) |
| 3 | minore | Vista 8 a 1024 px (portatile piccolo, iPad in orizzontale) | Il tabellone scorre all'interno di 18 px e l'ultima colonna è tagliata («IMPROVIN», «WEAKENIN»). La causa è la regola `@media (max-width: 1100px)` che mostra anche il nome dell'indice (`#emTable .nm`). A 1100, 1280 e 1366 non succede. | Finestra 1024×768, `#emg` | `esito-i-larghezze.json`, `shots/w-1024-dark.png` |
| 4 | minore | Vista 8, percorso «KOSPI vicino al bottom?» | Nella vista 8 nessuno spiega gli stati (Zona blu, Attenzione, Normale, Trigger): il badge non ha un `title` e manca la legenda «Come si legge lo stato», che c'è nel Monitor. Il pannello «Come leggere il contesto» dice solo «lo stato è quello della vista 6». Chi arriva diretto da `#emg-KOSPI200` legge «ZONA BLU» senza definizione. | `#emg-KOSPI200`, passare sul badge | `esito-a-computer.json` («stato KOSPI ha una spiegazione al passaggio») |
| 5 | minore | Vista 8: stato della valuta | 1) «Ha smesso di scendere» è in **verde** (`--up`, il colore delle cose positive), mentre il testo dice che «non è un segnale d'ingresso» e che nel campione compare spesso nei rimbalzi falliti. Il colore suggerisce l'opposto della nota. 2) Lo stesso stato ha due nomi: «Valute ferme dopo un calo» nel riquadro, «Ha smesso di scendere» nel tabellone e nella legenda. 3) Nella legenda «valuta che ha smesso di scendere» e «dollaro favorevole» hanno lo stesso campione di colore. | `#emg-NIFTY50`, riquadri, tabellone e legenda | `shots/1440-dark-kospi.png`, `shots/p-360-light-1.png` |
| 6 | minore | Barra dei comandi | I nomi comuni accettati per la vista 6 (`KOSPI`, `NIFTY`, `IBOVESPA`, citati nella guida) non funzionano con EMG: `KOSPI EMG`, `NIFTY EMG` e `IBOVESPA EMG` danno «non trovato». Anche `EMG KOSPI200` (ordine inverso) dà «non trovato». `KOSPI200 EMG`, `CSI300 EMG` e `nifty50 emg` funzionano. | Scrivere `KOSPI EMG` e premere Invio | `esito-a-computer.json` (controlli «[esplorativo] comando…») |
| 7 | minore | Tastiera, vista 8 | Dopo Invio su un punto del quadrante il quadrante si ridisegna e il focus torna al `body`, quindi il Tab successivo riparte dalla testata. Spazio non attiva i punti, anche se hanno `role="button"`. Sulle righe Spazio fa scorrere la pagina (come nella vista 6). La riga scelta non ha `aria-selected`/`aria-current` (come nel resto dell'app). `#emRange` non ha `role="group"` e `aria-label`, che invece `#ixRange` ha. | Tab fino a un punto del quadrante, Invio, poi Tab | `esito-h-tastiera.json` |
| 8 | minore | Senza `config/emerging.json` | La scheda 8 sparisce (giusto), ma il tasto 8 e il comando `EMG` aprono lo stesso una sezione vuota con `#emg`: in `setView` manca la protezione che c'è per `idx`. L'indirizzo `#emg-KOSPI200` invece ripiega bene sul Monitor. | `page.route('**/config/emerging.json')` → 404, poi tasto 8 | `esito-g-dati.json`, `shots/config-404-tasto8.png` |
| 9 | minore | Vista 8 sul telefono | Le spiegazioni delle celle (stato della valuta, barretta z con la tacca della soglia, «in $») stanno solo nei `title`, che al tocco non si aprono: la barretta z resta un segno senza etichetta. La spiegazione è raggiungibile solo nel pannello «Come leggere il contesto» in fondo alla pagina, dopo circa 5 schermate. | Telefono 390, `#emg` | `shots/p-390-dark-0.png`, `shots/390-dark-emg-full.png` |
| 10 | minore | Barra delle schede a 360 px | «3 Bottom Map» va su due righe, così la prima riga di schede è alta 48 px e la seconda 34. La testata finisce a 255 px contro 243 della 1.3.5 (+12 px). Le schede sono 2×4 come previsto, non ci sono tagli e non c'è scroll. | Telefono 360 | `esito-b-telefono.json`, `shots/360-dark-emg-top.png` |
| 11 | minore | Quadrante della forza relativa | Con i dati di oggi le etichette «EEM» ed «EWY» si toccano («EEM●EWY»). Il bersaglio di ogni punto è 26×13 px: sotto 24 px in altezza, ma i centri distano almeno 24 px, quindi WCAG 2.5.8 è rispettato con l'eccezione della spaziatura. Il tocco a 6 px dal punto funziona. | `#emg-KOSPI200`, quadrante | `shots/p-360-dark-2.png`, `esito-b-telefono.json` |
| 12 | minore | Grafico del dettaglio | Le tacche degli assi cadono a metà degli intervalli e non su valori tondi: breadth 13/38/63/88%, accanto al livello blu del 15%; prezzo 103/183/262/342. La tacca 13% vicino alla linea del 15% confonde. | `#emg-KOSPI200` | `shots/1440-dark-kospi.png` |
| 13 | minore | Dati vecchi | Se i cambi o FRED restano indietro, la vista lo dice solo con la data in grigio («cambi al …», «FRED al …»). Non c'è un avviso evidente come il bollino AGGIORNATO della testata. Lo script di aggiornamento usa la data più vecchia tra i cambi (`minLast`), quindi la data mostrata è onesta. Nota: nel mio test ho accorciato le serie senza cambiare `asOf`, quindi la testata mostrava 04/11 per costruzione del test; non è un difetto dell'app. | `page.route` con le serie dei cambi accorciate di 60 sedute | `esito-g-dati.json`, `shots/dati-vecchi.png` |

## Cosa ho verificato e passa

In tutto 678 controlli automatici in 8 script con esito, più una tabella di misure (`f-tablet.cjs`, 10 larghezze × 2 versioni). Ne passano 599. I 79 che non passano si dividono così:

- 33: voce n. 1, ripetuta su ogni vista e larghezza;
- 10: voce n. 2;
- 8: voce n. 6;
- 8: voce n. 7;
- 4: voce n. 10;
- 4: voce n. 11;
- 2: voce n. 3;
- 2: voce n. 4;
- 2: voce n. 8;
- 2: voce n. 13 (uno dei due non è valido per costruzione del test);
- 2: falsi allarmi del mio script (ordine di tabulazione contato due volte).

- **Percorso 1, KOSPI su computer** (`a-computer.cjs`, 112/122). La risposta arriva in 2 passi: scheda 8, poi la riga KOSPI200 (Zona blu, valuta «Ha smesso di scendere» con la spiegazione al passaggio del mouse, KPI «Valute ferme 2/5: NIFTY50 · KOSPI200»). Per il dettaglio serve un clic in più.
  - «Solo contesto» è detto in tre punti: la nota sotto il tabellone, il primo paragrafo del pannello laterale e la guida.
  - Il tabellone ha 7 righe nell'ordine giusto e i riquadri sono 5.
  - Il clic su una riga apre `#emg-KOSPI200`. Indietro e Avanti funzionano tra le selezioni, e la riga evidenziata coincide con il dettaglio.
  - I periodi 3A/10A/MAX funzionano e sono ricordati dopo la ricarica. La ricarica su `#emg-KOSPI200` riapre lo stesso indice.
  - Il riquadro dei valori sul grafico appare al passaggio e resta dentro la finestra.
  - «Apri KOSPI200 nella vista 6» apre e fa scorrere il dettaglio giusto, e il link della vista 6 riporta a `#emg-<indice>`. Indietro funziona tra vista 6 e vista 8.
  - Il clic su un punto del quadrante seleziona l'indice.
  - I tasti 1–8 funzionano, così come i comandi `EMG`, `emergenti`, `CSI300 EMG`, `nifty50 emg` e `KOSPI200 EMG`.
  - Gli indirizzi `#emg-IBOV`, `#emg-kospi200`, `#emg` e `#emg-FOO` (che ripiega sull'ultimo scelto) funzionano.
  - Il tasto «?» apre la guida rapida (cita «8 Emergenti» e i tasti 1–8) e il link «Guida completa» punta a `guida.html#emg`. `guida.html#emg` scorre alla sezione e «Apri gli Emergenti» riapre la vista.
  - `data/emerging.json` non si scarica all'avvio, ma solo alla prima apertura. La console è pulita, nel tema chiaro e nello scuro.
- **Collegamenti tra vista 6 e vista 8** (`j-vista6.cjs`, 12/12): il link c'è per i 7 emergenti con l'indirizzo giusto e manca per DAX, NDX e N225.
- **Livello blu cambiato nella vista 6** (`k-livello-blu.cjs`, 4/4): la vista 8 mostra il nuovo livello con l'asterisco, lo stato coerente e il dettaglio aggiornato.
- **Percorso 2, telefono 390 e 360, chiaro e scuro** (`b-telefono.cjs`, 120/136):
  - Le 8 schede stanno su 2 righe di 4, il testo non è tagliato e le schede sono alte almeno 34 px.
  - La vista 8 non scorre in orizzontale, né la pagina né il tabellone. Il tabellone è a schede, con le etichette dei valori, e le celle restano dentro lo schermo. Nessun testo è tagliato.
  - Il tocco sul grafico mostra il riquadro dei valori dentro lo schermo; un tocco fuori lo chiude.
  - Il testo del grafico è almeno 9 px reali. I pulsanti dei periodi e «Apri nella vista 6» sono alti 34 px.
  - La legenda resta dentro lo schermo e la console è pulita.
- **Percorso 4, altre viste** (`e-altre-viste.cjs`, 201/234). Ho confrontato la 1.4.0 con la 1.3.5 a 1440, 1280, 1024, 820, 768, 700, 640, 601, 600, 390 e 360, nel tema scuro e anche nel chiaro a 1440 e 390. A 1440, 1280, 1024, 600, 390 e 360 nessuna delle 7 viste ha scroll orizzontale nuovo, il contenuto inizia dove prima (±16 px) e la console è pulita. Le uniche differenze sono quelle della voce n. 1.
- **Larghezze della vista 8** (`i-larghezze.cjs`, 90/94): a 1920, 1440, 1366, 1280, 1100, 900 e 820 non c'è scroll né testo tagliato. Su computer il titolo del dettaglio è nella prima schermata (563–591 px) e il testo del grafico è tra 10,5 e 12,3 px.
- **Percorso 5, dati** (`g-dati.cjs`, 28/32):
  - Con `emerging.json` in 404, troncato, con la rete interrotta o senza `series`, la vista mostra un messaggio chiaro con la causa e nessun errore non gestito. Il messaggio resta coerente se si riapre la vista, e le viste 1–7 funzionano (vista 6 con 10 righe).
  - Se mancano il cambio KRW e FRED, i valori diventano «—», il riquadro dice «FRED non disponibile» e il grafico scrive «Cambio non disponibile» e «FRED non disponibile».
  - Se manca `data/indices.json`, la vista 8 lo dice.
  - Tempi di apertura (mediana di 3): 467 ms in locale e 4,5 s con rete lenta emulata (1,6 Mbit/s, 150 ms di latenza). Durante l'attesa compare «Caricamento…».
- **Percorso 6, tastiera** (`h-tastiera.cjs`, 32/44):
  - I ruoli sono giusti (tablist, tab, aria-controls, tabpanel con aria-labelledby). Fine porta il focus su «8 Emergenti» e Destra torna a 1, con un solo `tabindex=0`. Il focus è visibile sulla scheda, sulle righe e sui punti.
  - L'ordine di tabulazione è: righe 1–7, poi periodo, poi «Apri nella vista 6», poi i punti del quadrante.
  - Invio su una riga la seleziona e il focus resta lì.
  - «?» con il focus su una riga apre la guida con `guida.html#emg`; alla chiusura il focus torna alla riga.

## Cosa non ho potuto verificare e perché

- **Dispositivi veri** (Safari su iOS, Chrome su Android), Firefox e WebKit: ho usato solo Chromium, con l'emulazione del telefono di Playwright.
- **Lettori di schermo**: ho controllato solo ruoli e attributi ARIA, senza ascolto reale.
- **GitHub Pages**: la 1.4.0 non è pubblicata, quindi non ho fatto il confronto sha1 con Pages.
- **Correttezza dei numeri** (stati della valuta, z, RS-Ratio, variazioni a 3 mesi): fuori tema per questo controllo. Ho controllato solo che i valori mancanti siano «—».
- **Modifiche dell'autore dopo afc06f3**: non controllate (vedi l'intestazione).
- **Nota di metodo**: in Playwright uno screenshot `fullPage` spegne l'emulazione di `(pointer: coarse)`. Dopo uno di questi screenshot i pulsanti misurano 21 px invece di 34. Le misure dei bersagli del tocco riportate qui sono prese prima di quegli screenshot (riproduzione: `z-artefatto-fullpage.cjs`).

## Script e screenshot

Cartella: `/home/user/rrg/ricerca/qa/1.4.0/usabilita/`. Si lanciano con `NODE_PATH=$(npm root -g) node <script>`, con il server della 1.4.0 su 8794 e quello della 1.3.5 su 8795.

- `lib.cjs`: funzioni comuni (apertura con il tema, attesa della vista, scroll orizzontale, testo tagliato).
- `a-computer.cjs`: percorsi 1 e 3 su computer.
- `b-telefono.cjs`: percorso 2.
- `d-pannelli.cjs`: screenshot dei pannelli a 390, 360 e 820.
- `e-altre-viste.cjs`: percorso 4, confronto con la 1.3.5.
- `f-tablet.cjs`: barra delle schede tra 601 e 900 px.
- `g-dati.cjs`: percorso 5.
- `h-tastiera.cjs`: percorso 6.
- `i-larghezze.cjs`: vista 8 da 820 a 1920 px.
- `j-vista6.cjs`: collegamenti tra vista 6 e vista 8.
- `k-livello-blu.cjs`: livello blu cambiato nella vista 6.
- `z-artefatto-fullpage.cjs`: riproduzione della nota di metodo.
- Esiti: `esito-*.json`.
- Screenshot: `shots/` (124 file). I principali:
  - computer: `1440-{dark,light}-kospi.png`, `w-1024-dark.png`;
  - telefono: `390-*-emg-full.png`, `*-after-tap.png`, `*-quadrante.png`, `p-360-light-0.png`, `p-360-light-1.png`;
  - barra delle schede: `tab-768-1.4.0.png`, `tab-768-1.3.5.png`, `alt-820-dark-mon.png`;
  - dati: `dati-*.png`, `config-404-tasto8.png`.
