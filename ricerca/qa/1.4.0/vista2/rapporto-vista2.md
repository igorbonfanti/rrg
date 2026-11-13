# Controllo grafici, testi e usabilità · versione 1.4.0 · commit 249d245

Copia provata: `http://127.0.0.1:8794/` (sha1 di index.html, guida.html, js/emerging*.js, js/app.js, js/format.js, css/style.css, data/emerging.json, data/indices*.json, config/emerging.json, version.* uguali al commit 249d245). Confronto: 1.3.5 di `origin/main` su `http://127.0.0.1:8795/`. Browser: Chromium di Playwright (computer 1440 e 1280; telefono 390 e 360 con tocco; tablet 820 e 768; temi chiaro e scuro).

**Verdetto: GO** (nessun bloccante: tutti i numeri del grafico, del tabellone, dei riquadri e del quadrante coincidono con il ricalcolo indipendente; conviene sistemare i 3 rilievi «da correggere» prima della pubblicazione).

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Tabellone, computer tra 1101 e 1279 px | Con due colonne (tabellone + quadrante) il tabellone è più largo del riquadro: le ultime colonne finiscono in uno scorrimento interno. A 1101 px mancano «3 mesi locale», «3 mesi in $» e «Forza rel. vs ACWI» (164 px nascosti), a 1200 e 1250 px «Forza rel. vs ACWI». L'ombra di scorrimento è appena visibile. A 1280 px e sopra va bene. | Finestra 1200 px, `#emg` | `h2-tabellone.cjs`, `esito-h2-tabellone.txt`, `shots/h-tabellone-1101.png`, `shots/h-tabellone-1200.png` |
| 2 | da correggere | Quadrante, tastiera | Invio (o Spazio) su un punto del quadrante sceglie l'indice ma il focus va su `body`: il Tab successivo riparte dal primo punto (CSI300). Causa: in `renderRS` il gestore chiama `select()`, che chiama `render()` asincrona, e poi `focus()` sul vecchio nodo, che `render()` sostituisce subito dopo. Sulle righe del tabellone il focus resta (Invio su TWN: focus su TWN). | `#emg-CSI300`, Tab fino al punto IBOV, Invio | `f-fuoco-riquadro.cjs` → `esito-f-fuoco-riquadro.json` (`dopoInvio.active = BODY`), `e-percorsi.cjs` |
| 3 | da correggere (testo) | Riquadro dei valori, periodo MAX, date prima del 02/01/2006 | «Dollaro vs emergenti —» con la nota «FRED: nessun valore per questa data (festa negli Stati Uniti, oppure dato non ancora pubblicato…)»: il motivo è sbagliato, la serie DTWEXEMEGS inizia il 02/01/2006. Succede per tutti i 7 indici in MAX. | HSI, MAX, mouse sul 2002 | `esito-a-grafici-1440-light.json` (HSI MAX 11/09/2002). **Frase corretta** (prima del primo dato): «FRED: la serie del dollaro contro gli emergenti inizia il 02/01/2006». |
| 4 | minore | Grafico del cambio, tema scuro | Le bande «in calo forte» hanno contrasto 1,14 con il fondo nero (in chiaro 1,30; «ha smesso di scendere» 1,22): la banda di oggi di IBOV, l'unico «in calo forte», è una striscia sottile quasi invisibile. Le bande dei cali forti della vista 6 usano più opacità in scuro (0,25) che in chiaro (0,14). | IBOV, 3A, tema scuro | `shots/a-1280-dark-IBOV-3A.png`, `shots/c-360-dark-grafico.png`, `esito-b-computer-1440-dark.json` (`contrasto.bandaCalo`) |
| 5 | minore (testo) | Nota sotto il grafico di EEM | «cambio al — · dollaro FRED al 30/10/2026»: «cambio al —» sembra un dato mancante, ma EEM non ha cambio. **Frase corretta**: «EEM è in dollari, senza cambio · dollaro FRED al 30/10/2026». | EEM, qualsiasi periodo | `esito-g-testi-dettaglio.json` |
| 6 | minore | Quadrante della forza relativa | L'etichetta dell'indice scelto è attraversata dalla sua scia (ASHR a 1440 px, EWY a 360 px). Il controllo sulle etichette guarda solo punti ed etichette, non la scia. | `#emg-CSI300` a 1440; `#emg-KOSPI200` a 360 | `shots/b-1440-light-pagina.png`, `shots/c-360-light-quadrante.png` |
| 7 | minore | Riquadro dei valori | «Prezzo» è la chiusura in valuta locale, «In dollari» è in base 100: la differenza tra le due linee del grafico (l'effetto del cambio) non si legge nel riquadro. Per HSI, negli ultimi 3 giorni «In dollari» usa il cambio provvisorio di Yahoo senza dirlo (la riga del cambio non c'è). | KOSPI200 3A, 04/11/2026: «Prezzo 5684 · In dollari (base 100) 219,5» | `esito-a-grafici-1440-light.json`. **Proposta**: aggiungere la riga «In valuta locale (base 100)»; per HSI scrivere «In dollari (base 100) 136,5 · cambio Yahoo, provvisorio». |
| 8 | minore (testo) | Nota dei riquadri e del cartellino «Ha smesso di scendere» (`FXT.ferma`) | «Nel campione si era accesa prima del vero minimo in 15 cali di borsa su 17»: «vero minimo» non torna con il minimo del KOSPI ancora provvisorio (uno dei 15), e manca il criterio «oltre il 25% dal massimo storico» che «Come leggere», guida e README scrivono. | Passare sul riquadro «Valute che hanno smesso di scendere» | **Frase corretta**: «Nel campione (cali oltre il 25% dal massimo storico) si era già accesa nei sei mesi prima del minimo in 15 cali su 17, e poi la borsa era scesa ancora: non è un segnale d'ingresso.» |
| 9 | minore (testo) | Definizione di «ha smesso di scendere» in app (`FXT.ferma`, «Come leggere») e guida | Manca la soglia di 0,5 deviazioni standard che codice (`fxSignals`) e README usano: «si è allontanato dal massimo» non dice di quanto. | — | **Frase corretta**: «dopo un calo forte negli ultimi 6 mesi, il cambio è sceso di almeno mezza deviazione standard dal massimo delle ultime 13 settimane: la valuta ha smesso di scendere». |
| 10 | minore (testo) | `js/version.js`, prima nota della 1.4.0 | «(in calo forte o ferma dopo un calo)»: l'app non usa mai «ferma». | — | **Frase corretta**: «la valuta (in calo forte o che ha smesso di scendere)». |
| 11 | minore (testo) | README, nota 1.4.0 | «Sul telefono le otto schede stanno su due righe di quattro»: vale anche per il tablet fino a 860 px, dove nella 1.3.5 c'era una riga. A 820 e 768 px, in tutte le 7 viste, la barra passa da 36 a 72 px e il contenuto scende di 36 px (comportamento voluto, ma va detto). | 820 px, qualsiasi vista | `esito-d-altre-viste.json`. **Frase corretta**: «Sotto 860 px (telefono e tablet in verticale) le otto schede stanno su due righe di quattro.» |
| 12 | minore (testo) | Guida, sezione `#emg` | Mancano due approssimazioni che la nota «Fonti» dell'app e il README dichiarano: l'ora del cambio provvisorio di Yahoo e le revisioni di DTWEXEMEGS. | — | **Frase da aggiungere** dopo «…sostituito da quello della Fed quando esce.»: «Il cambio provvisorio di Yahoo datato un giorno è in pratica il prezzo della sera prima (mezzanotte di Londra). FRED a volte rivede il dollaro contro gli emergenti (fino allo 0,6% nelle versioni 2024-2026): le fasce passate usano i valori rivisti.» |
| 13 | minore | Quadrante senza dati | Se manca ACWI in `data/emerging.json`, la colonna «Forza rel.» mostra «—» ma il quadrante resta vuoto, senza scritta. | Togliere `series.ACWI` dal file | `e-percorsi.cjs` (caso «senza ACWI»). **Proposta**: «Forza relativa non disponibile (manca ACWI)» nel riquadro. |

## Cosa ho verificato e passa (circa 13.800 controlli automatici)

- **Ricalcolo indipendente** (`ricalcolo.py`, Python, senza importare i moduli dell'app): decodifica di `data/emerging.json` e `data/indices*.json`, poi pulizia della coda di Yahoo, z, F, stato della valuta, media 200, variazione a 63 sedute e D del dollaro, indice in dollari, variazioni a 63 sedute, `rrgNew` settimanale contro ACWI. Risultati in `atteso.json`.
- **Grafici, 7 indici × 3 periodi** (`a-grafici.cjs`, 5.941 controlli a 1440 chiaro e 5.941 a 1280 scuro, 0 differenze): pulsante del periodo segnato; 4 cornici; inizio e fine della linea del prezzo ai bordi del periodo; base 100 comune (le due linee coincidono alla data base, e la nota «base 100 al …» compare solo quando serve); bande «in calo forte», «ha smesso di scendere» e «favorevole» (numero, inizio e fine di ogni tratto, dentro la cornice); fine della linea del dollaro all'ultimo dato FRED (30/10) e inizio della media 200; tutte le linee dentro le cornici; tacche degli anni al 1° gennaio; **168 letture del riquadro dei valori** (prezzo, breadth, in dollari base 100, cambio, «Yahoo, provvisorio» solo dopo il 30/10, stato della valuta, dollaro FRED) uguali al ricalcolo.
- **Riquadri e tabellone** (`b-computer.cjs`, 239 controlli × 4 combinazioni di larghezza e tema): dollaro 130,9, «sopra la media 200 · +2,0% in 3 mesi · non favorevole · FRED al 30/10/2026»; valute in calo forte 1/5 (IBOV), che hanno smesso di scendere 2/5 (NIFTY50, KOSPI200); per ogni riga breadth, 3 mesi locale e in $, stato della valuta, z e cambio nel cartellino, quadrante e data della forza relativa. Stato, breadth, livello blu e drawdown uguali alla vista 6 per i 7 indici (con «Tutti» acceso nella vista 6).
- **Quadrante**: 7 punti nelle posizioni del ricalcolo (scarto < 0,05 px), titoli con RS-Ratio e RS-Momentum (nomi giusti), una sola scia di 10 settimane per l'indice scelto, etichette senza sovrapposizioni tra loro, con i punti e con le scritte dei quadranti, dentro il riquadro a 1440, 1280, 390, 360, 820 e 768 px, anche con ognuno dei 7 indici scelto. Clic su ogni punto: riga, titolo, indirizzo e scia coerenti. Nessun ETF fuori scala oggi.
- **Contrasto** (chiaro / scuro): testi degli assi 6,1 / 6,1; titoli dei pannelli 6,3 / 10,3; linee del prezzo 6,3 e 6,0 / 10,3 e 8,8; media 200 4,6 / 7,5; livello blu 3,8 / 5,5; etichette del quadrante 5,6 / 5,9; testo di «Come leggere» 11,4 / 10,1.
- **Telefono e tablet** (`c-telefono.cjs`, 176 controlli): barra su 2 righe sotto 860 px e su 1 riga sopra; nessuno scorrimento orizzontale; nessun testo delle schede tagliato; tabellone a schede senza scorrimento laterale; titoli corti dei pannelli dentro la cornice; tocco su una riga e su un punto del quadrante: la pagina scorre al dettaglio (meno di 80 px dall'alto); tocco sul grafico: riquadro dentro lo schermo e mai sopra il dito, anche sul pannello in basso; tocco fuori: il riquadro si chiude; Indietro torna all'indice precedente. Sul computer, vicino al fondo della finestra, il riquadro va sopra il puntatore (`esito-f-fuoco-riquadro.json`).
- **Altre viste** (`d-altre-viste.cjs`, 468 controlli): le 7 viste a 1440, 1280, 820, 768, 390 e 360 px, chiaro e scuro, contro la 1.3.5: nessuno scorrimento orizzontale, nessun errore in console, nessuna scheda tagliata. A 390 px la barra è 2 px più bassa; a 360 px è 12 px più alta, perché «3 Bottom Map» va su due righe.
- **Larghezze ai bordi delle regole CSS** (`h-soglie.cjs`): 1440/1439, 1101/1100, 861/860, 601/600, 320: nessuno scorrimento della pagina, barra giusta (resta il rilievo 1).
- **Percorsi** (`e-percorsi.cjs`, 48 controlli): tasto 8; frecce sulle schede (da 7 a 8; da 8 si torna a 1); comandi `EMG`, `EMERGENTI`, `KOSPI200 EMG`, `KOSPI EMG`, `EMG KOSPI200`, `ibov emg`, `NIFTY EMG`, `HANGSENG EMG`, `TAIWAN EMG`, `CSI EMG`, `EEM EMG` e `TWN EMG` con la vista già aperta; `DAX EMG` non apre la vista 8; Indietro e Avanti tra gli indici; un clic sulla riga già scelta non aggiunge passi alla storia; dopo la ricarica restano indice e periodo; `#emg-IBOV` diretto; `#emg-DAX` torna all'ultimo indice valido; Invio su una riga sceglie l'indice e lascia il focus sulla riga; «8» scritto nella barra dei comandi resta testo; «Apri IBOV nella vista 6» e ritorno con Indietro; il link «Cambio e dollaro: vista 8 Emergenti →» nel dettaglio della vista 6; il link «Apri gli Emergenti →» della guida.
- **Dati che mancano**: con `data/emerging.json` mancante (404), troncato, vuoto o `{}` compare «Dati della vista Emergenti non disponibili (…). Gli stati degli indici restano nella vista 6.», senza eccezioni, e la vista 6 funziona. Senza KRW=X: valuta e «3 mesi in $» del KOSPI 200 sono «—». Senza DTWEXEMEGS: «— FRED non disponibile». Nessun valore di riempimento.
- **Testi e numeri**: «15 su 17» e «mediana 110 sedute in 19 cali (nel ventesimo, il KOSPI in corso, non ancora)» uguali a `risultati.json` H5 (`F.prima 15`, `F.conDato 16 + F.mai 1`; `DprimoDopo.conDato 19`, `mediana 110`, `mai 1`). Minimo del KOSPI al 26/10/2026 (−40,0% dal massimo del 22/06/2026) confermato su `data/indices.json`. Storie più corte confermate sui dati: ASHR 06/11/2013, INDA 03/02/2012, ACWI 28/03/2008, DTWEXEMEGS 02/01/2006, cambi dal 03/01/2000. «Fino allo 0,6%» (app) e «0,64%» (README) tornano con `ricerca/qa/1.4.0/codice/fred_revisioni.out`. «Circa 160 KB compressi»: 160.810 byte con gzip -9. Banda di Hong Kong 7,75-7,85 giusta. Livelli blu di HSI ed EEM con la citazione «dai grafici di Massimo Rea (quant-rea)»; piè di pagina con la citazione di quant-rea. RS-Ratio e RS-Momentum con questi nomi. Nessuna promessa di rendimento («non è un segnale d'ingresso», «conferma, non anticipa», disclaimer nel piè di pagina).
- **Console**: nessun errore né avviso in tutti i percorsi. Fanno eccezione i casi in cui il 404 è provocato apposta: lì c'è il solo messaggio del browser per la risorsa mancante.

## Cosa non ho potuto verificare e perché

- Telefoni e browser veri (Safari/WebKit su iOS, Firefox): ho usato solo Chromium emulato con il tocco.
- I valori di oggi contro FRED e Yahoo dal vivo: ho confrontato i numeri dell'app con un ricalcolo indipendente sugli stessi file del repository, non con le fonti esterne (le fa il controllo dei numeri).
- La correttezza della macchina a stati della vista 6: ho controllato solo che stato e zona blu della vista 8 coincidano con la vista 6.
- L'ora del cambio provvisorio di Yahoo (la sera prima, a mezzanotte di Londra): non l'ho rimisurata. Lo script citato `ricerca/qa/1.4.0/testi/ora_cambio.py` esiste.
- Lettori di schermo: ho controllato solo ruoli, focus e ordine del Tab.
- La pubblicazione su GitHub Pages (sha1): la versione non è ancora pubblicata.
- Nota: durante il controllo altri agenti hanno cambiato i file del repository (`js/emerging*.js`, commit a0bce67). I risultati valgono per il commit 249d245 servito sulla porta 8794.

## Script e screenshot

Tutti in `/home/user/rrg/ricerca/qa/1.4.0/vista2/`:

- `ricalcolo.py` → `atteso.json`; con un secondo argomento scrive le serie complete usate dal controllo del grafico.
- `lib.cjs`
- `a-grafici.cjs` → `esito-a-grafici-1440-light.json`, `esito-a-grafici-1280-dark.json`
- `b-computer.cjs` → `esito-b-computer-{1440,1280}-{light,dark}.json`
- `c-telefono.cjs` → `esito-c-telefono.json`
- `d-altre-viste.cjs` → `esito-d-altre-viste.json`
- `e-percorsi.cjs` → `esito-e-percorsi.json`
- `f-fuoco-riquadro.cjs` → `esito-f-fuoco-riquadro.json`
- `g-testi-dettaglio.cjs` → `esito-g-testi-dettaglio.json`
- `h-soglie.cjs` → `esito-h-soglie.txt`
- `h2-tabellone.cjs` → `esito-h2-tabellone.txt`
- `shot-alto.cjs`

Uso: `NODE_PATH=$(npm root -g) SERIE=<serie.json> node a-grafici.cjs`. `SITE=<cartella del sito>` serve a `e-percorsi.cjs`, `BASE135` a `d-altre-viste.cjs`.

Screenshot in `shots/`:

- `a-*`: grafici, 7 indici, KOSPI in 3 periodi
- `b-*`: pagina intera
- `c-*`: telefono e tablet, con grafico, quadrante e riquadro in basso
- `d-*`: parte alta delle viste
- `e-*`: barra delle schede e casi con i dati mancanti
- `f-*`: focus e riquadro vicino al fondo
- `h-*`: tabellone a 1101 e 1200 px
