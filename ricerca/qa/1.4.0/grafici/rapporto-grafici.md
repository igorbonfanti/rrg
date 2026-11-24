# Controllo grafici · versione 1.4.0 · commit afc06f3

Verdetto: **NO-GO**

Ho controllato la copia servita su `http://127.0.0.1:8794/`: codice identico ad afc06f3 (sha1 di `js/emerging-view.js`, `js/emerging.js`, `css/style.css`, `index.html` e `js/format.js` confrontati) e dati di main al 04/11/2026 più `data/emerging.json` del 05/11. Durante il controllo nel working tree sono comparse modifiche non committate a `js/emerging.js` e `js/emerging-view.js`, che correggono in parte i punti 1 e 4. Non le ho verificate nel browser: il verdetto vale per afc06f3.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | bloccante | TWN MAX e 10A, pannelli 1 e 3 e riquadro dei valori (anche CSI300 MAX, sole bande) | Tre errori di stampa del cambio superano la pulizia di `cleanFx`: TWD 1,8015 il 25/10/2011 e 3,67 il 31/12/2014, CNY 5,863 il 18/07/2011. Non vengono tolti perché il giorno prima o dopo è a sua volta spostato e il rientro supera l'1% (TWD) o lo 0,3% (CNY). Effetti su TWN MAX: la linea in dollari ha due picchi (riquadro «In dollari (base 100) 1870,6» e «TWD per dollaro 1,8015» il 25/10/2011; 1140,8 e 3,6700 il 31/12/2014). La scala del prezzo arriva a 1724 e quella del cambio scende a 4,47: tutte le linee restano schiacciate. Il riquadro del 25/10/2011 dice anche «Valuta: Ha smesso di scendere». La deviazione standard del TWD risulta gonfiata fino a 6,1 volte, quindi lo stato della valuta cambia in 1051 sedute dal 26/10/2011 al 13/06/2017. Nel periodo 10A di TWN mancano 111 sedute di banda «ha smesso di scendere» e 2 di «in calo forte». Per il CNY cambiano 141 sedute (13/10/2011–07/05/2014), visibili in CSI300 MAX. Lo stato di oggi non cambia. | `#emg-TWN`, Periodo MAX, mouse sul picco del 2011; poi 10A | `spot.cjs` → `output-spot.txt`; `stampe-cambio.mjs`; `shots/spot-TWN-MAX-stampe.png`, `shots/1440-scuro-TWN-MAX.png`. Il codice in lavorazione (non committato) toglie le tre stampe: `stampe-cambio.mjs` dà 0 sedute diverse. |
| 2 | bloccante | Pannello 1 in MAX per KOSPI200, IBOV, TWN e HSI | Le due linee «base 100» hanno basi in date diverse. La linea in valuta locale vale 100 alla prima seduta dell'indice (2000). Quella in dollari vale 100 al primo giorno con il cambio: 01/12/2003 (KRW, HKD), 24/03/2006 (BRL), 16/05/2006 (TWD). Il confronto tra le due linee quindi è falso. KOSPI200 oggi: locale 536,7 e dollari 628,2, mentre con la stessa base il valore in dollari sarebbe 478,9 (il won si è indebolito, ma la linea dice il contrario). TWN: 590,2 contro 476,5. HSI: 190,0 contro 136,3. IBOV: 175,1 contro 388,7. Il riquadro mostra quei numeri come «In dollari (base 100)». Nei periodi 3A e 10A le basi coincidono per tutti e 7 gli indici. | `#emg-KOSPI200`, Periodo MAX: la linea blu parte da 100 nel 2003 accanto a quella arancione a 76 | `analisi.mjs` (righe «base in dollari al …»); `shots/1440-scuro-KOSPI200-MAX.png` |
| 3 | da correggere | Pannello 3 in MAX, NIFTY50 e KOSPI200 | La banda rossa «in calo forte» si disegna con `z ≥ 1 && !F[i]`, quindi anche dove F è nullo per storia insufficiente o dopo il buco del cambio di agosto 2008. In quelle sedute il riquadro dice «Valuta —». KOSPI200: 50 sedute dal 14/03/2007 al 31/03/2009. NIFTY50: 38 sedute dal 21/11/2008 al 01/04/2009. | `#emg-KOSPI200`, MAX, mouse sul 14/03/2007: banda rossa, riquadro «Valuta —» | `output-spot.txt` (righe KOSPI200/NIFTY50 MAX: `"calo":true`, «Valuta —»); `analisi.mjs` |
| 4 | da correggere | Legenda, EEM | La legenda dice «in valuta locale» per la linea arancione, ma EEM è in dollari: il titolo del pannello dice «PREZZO, BASE 100 · IN DOLLARI». | `#emg-EEM`, legenda | `output-extra.txt` («legenda EEM: in valuta locale \| …»); `shots/1440-scuro-legenda-EEM.png`. Nel working tree c'è già la correzione («prezzo in dollari»), non verificata. |
| 5 | da correggere | Quadrante `#emRS` a 1280 px e a 360 px | Non c'è un controllo delle collisioni: l'etichetta «EEM» finisce sul punto EWY (99,28/98,37 contro 99,99/98,38). A 1280 px il quadrante è largo 240 unità e si legge «EEN●EWY»; quando è selezionato KOSPI200 il punto grande copre la «M». Il problema c'è in tutte le 7 selezioni a 1280 (chiaro e scuro) e a 360 scuro; non a 1440 né a 390. Con i dati di altre settimane le collisioni cambiano. | `#emg-KOSPI200` a 1280×900 | `output-completo.txt` (28 FAIL «sovrapposizioni»); `shots/1280-chiaro-rs-KOSPI200.png`, `shots/360-scuro-rs-KOSPI200.png` |
| 6 | da correggere | Riquadro dei valori vicino al fondo della finestra | `placeTip` mette il riquadro sempre sotto il puntatore, senza rovesciarlo né limitarlo in basso. Con il puntatore sul pannello del dollaro a 780 px su una finestra alta 900, il riquadro va da 792 a 913 px ed esce di 13 px; più in basso esce quasi tutto. In orizzontale resta sempre dentro (40 prove su 40). | 1440×900, si scorre finché il grafico tocca il fondo, poi mouse sul pannello 4 | `output-extra.txt`; `shots/1440-scuro-tip-fondo.png` |
| 7 | da correggere | Nota «Fonti» sotto la vista | Il testo dice «i cambi di Yahoo prima del 2006 hanno buchi di mesi e non si usano. Prima si mostra «—»». Invece CNY, INR, KRW e HKD si disegnano e si usano dal 01/12/2003 (circa 260 sedute all'anno, nessun buco oltre 10 giorni prima di luglio 2008). Il riquadro mostra «KRW per dollaro» nel 2004–2005, e da lì partono la linea in dollari e la sua base del punto 2. | `#emg-KOSPI200` MAX, mouse sul 2005 | `dati.mjs` (date dei cambi); `index.html` riga 749 |
| 8 | minore | Bordo sinistro, pannello 3, NIFTY50 3A e IBOV 3A | La banda «ha smesso di scendere» è iniziata prima del 06/11/2023, ma è disegnata dal bordo e niente lo segnala: sembra iniziare lì. Nei periodi 10A e MAX e nelle altre bande (zona blu, dollaro favorevole) nessun caso. I grafici dei settori fanno lo stesso con la zona blu. | `#emg-NIFTY50`, 3A | `analisi.mjs`; `shots/1440-chiaro-NIFTY50-bordo-sinistro.png` |
| 9 | minore | Assi verticali | Le tacche sono a (i+0,5)/4 dell'intervallo, quindi non a numeri tondi. Nella breadth le linee stanno a 12,5/37,5/62,5/87,5 ma le etichette dicono 13%/38%/63%/88% (mezzo punto di differenza). Il livello blu del 10% è vicino alla linea «13%». Il prezzo ha tacche come 101/112/122/133. | qualsiasi indice | screenshot `shots/*-3A.png` |
| 10 | minore | Legenda | I campioni delle bande hanno opacità .35/.45, le bande disegnate .16/.22, quindi la legenda è più scura del grafico. «Sua media 200» ha lo stesso arancione di «in valuta locale». Il trigger è un quadrato in legenda e un triangolo nel grafico. Con CVD «ha smesso di scendere» e «dollaro favorevole» diventano blu, simili al campione «zona blu». | legenda, con e senza CVD | `output-extra.txt` (colori calcolati) |
| 11 | minore | Pannello 3 in MAX | La linea del cambio unisce con un tratto dritto il buco dal 31/07/2008 al 26/08/2008 (26 giorni, tutti i cambi tranne CNY). Sono circa 3 px a scala MAX. La linea in dollari invece si interrompe, come deve. | NIFTY50/IBOV/KOSPI200/TWN MAX | `dati.mjs` (buchi oltre 10 giorni) |
| 12 | minore | Pannello 1 | Alcuni triangoli dei trigger escono dalla cornice del pannello del prezzo fino a 4 unità: CSI300 3A (1), TWN 10A (1), TWN MAX (6). Non toccano il titolo del pannello sotto. | `#emg-CSI300` 3A | `output-spot.txt` |
| 13 | minore | Riquadro dei valori | «Prezzo» è la chiusura in valuta locale mentre «In dollari» è in base 100: il valore base 100 della linea arancione non compare. | qualsiasi indice | screenshot |
| 14 | minore | Bande, tema scuro | Il contrasto tra banda e sfondo è 1,14 per «in calo forte» e 1,22 per «ha smesso di scendere» (tema chiaro: 1,26–1,30). Le due bande differiscono solo per tinta (rapporto di luminanza tra loro 1,01–1,07): in scuro il rosso si vede appena. Le linee passano tutte (da 3,8 a 11,4 su sfondo). | `#emg-TWN` 3A, tema scuro | `output-extra.txt` |

## Cosa ho verificato e passa

Metodo: `dati.mjs` decodifica i file dei dati senza il codice dell'app. Le chiusure e la breadth coincidono con la decodifica dell'app: 0 differenze su 7 indici. `attese.mjs` aggiunge gli stati della macchina, z/F della valuta e la forza relativa presi dal codice di afc06f3 (quei calcoli sono del controllo dei numeri). `grafici.cjs` ridisegna in modo indipendente ogni coordinata (scale con margine del 6%, base 100, tempo lineare, bande) e la confronta con l'SVG, punto per punto, con una tolleranza di 0,11 unità.

Combinazioni: 7 indici × 3 periodi × 8 schermi (1440 e 1280 chiaro e scuro, 390 e 360 con isMobile/hasTouch chiaro e scuro). In tutto 7742 controlli passati e 28 non passati (tutti del punto 5).

- **Linee:** prezzo in valuta locale 168/168. Prezzo in dollari 144/144, assente per EEM 24/24. Breadth 168/168. Cambio 120/120, assente per HSI ed EEM 48/48. Dollaro FRED 168/168. Media 200 del dollaro 168/168. Tutti i punti al posto giusto, interruzioni dove il dato manca (nessun valore di riempimento né zero).
- **Bande:** zona blu (stati setup/fallito, sui pannelli 1 e 2) 168/168. «In calo forte» 120/120. «Ha smesso di scendere» 120/120. «Dollaro favorevole» (D ricalcolato da me: sotto la media semplice a 200 e sotto il valore di 63 sedute prima) 168/168. Inizio e fine coincidono con le date attese entro 0,01 unità.
- **Trigger:** 168/168. Numero, data e posizione (10 sotto la linea) giusti. Livello blu 168/168. Cornici 168/168. Etichette dell'asse del cambio 120/120.
- **Testi del grafico:** tutti dentro il disegno 168/168, nessuna sovrapposizione 168/168, anni alla x del 1° gennaio 168/168. La legenda contiene le voci attese per ogni indice 168/168: il controllo non copre il testo della voce per EEM, vedi punto 4.
- **Riquadro dei valori:** 1198 date controllate, tutte con i valori attesi. Le date includono la prima seduta del periodo, l'ultima, le sedute senza cambio, le sedute del cambio tolte come errori di stampa, i giorni senza FRED e date distribuite nel periodo. Ogni riga è stata confrontata: data, stato, prezzo, in dollari, breadth, cambio, stato della valuta, dollaro. Nota FRED presente solo dove manca il dato: 1198/1198.
- **Linea verticale:** alla data giusta e su tutti e 4 i pannelli, 1198/1198. Riquadro dentro lo schermo in orizzontale (mouse e tocco, bordi sinistro, destro e centro): 40/40.
- **Quadrante:** 7 punti, 56/56. Punto nel quadrante giusto, coordinate giuste, titolo con RS-Ratio e RS-Momentum e quadrante: 392/392. Nessun valore oltre ±4 (nessun punto bloccato al bordo). Solo il punto selezionato è evidenziato: 448/448. Scia di 10 settimane nell'ordine dalla più vecchia alla più recente: 56/56. La scia finisce sul punto evidenziato: 56/56. Data «al 04/11/2026»: 56/56. Etichette dentro il disegno.
- **Interazione:** clic, o tocco sul telefono, sul punto EWT seleziona TWN, cambia l'indirizzo in `#emg-TWN` ed evidenzia il punto: 8/8. Nessuno scorrimento orizzontale 8/8, console senza errori 8/8, titolo del dettaglio giusto 168/168.
- **Contrasto delle linee e dei testi** (chiaro, scuro, con e senza CVD): prezzo locale da 6,3 a 10,3, in dollari da 6,0 a 8,8, breadth/cambio/dollaro da 10,1 a 11,4, media 200 da 4,6 a 7,5, livello blu da 3,8 a 5,5, testi degli assi 6,1. Con CVD «in calo forte» resta rosso, mentre «ha smesso di scendere» e «favorevole» diventano blu.

## Cosa non ho potuto verificare e perché

- La correttezza delle formule di stato della macchina, z/F e RS-Ratio/RS-Momentum: le ho prese dal codice di afc06f3. Sono del controllo dei numeri; qui ho controllato che il disegno le riproduca.
- I dati confrontati con le fonti esterne (Yahoo, FRED): li ho confrontati solo con i file, decodificati in modo indipendente. Gli errori di stampa del punto 1 li ho trovati come valori lontani oltre l'8% dalla mediana dei 10 vicini.
- La linea verticale condivisa con altri grafici: il gruppo `emg` contiene un solo grafico, quindi non c'è niente da sincronizzare. La condivisione tra i 4 pannelli invece è verificata.
- Dispositivi reali e lettori di schermo: ho usato solo l'emulazione di Playwright, Chromium.
- Le modifiche in lavorazione nel working tree (non committate): non verificate nel browser.

## Script e screenshot

Tutto in `/home/user/rrg/ricerca/qa/1.4.0/grafici/`:

- **Script:**
  - `dati.mjs`: decodifica indipendente e buchi; produce `atteso.json`.
  - `attese.mjs`: valori attesi; produce `attese.json`. Con `APP=<copia di afc06f3>/` usa il codice controllato.
  - `analisi.mjs`: basi del base 100, bande al bordo, F nullo, bande di una seduta.
  - `grafici.cjs`: controllo completo; `VERBOSE=1` scrive anche gli OK.
  - `extra.cjs`: colori, contrasto, CVD, riquadro in fondo alla finestra.
  - `spot.cjs`: prove dei punti 1, 3 e 12.
  - `stampe-cambio.mjs`: effetto degli errori di stampa.
  - `legenda-mobile.cjs`: legenda e note a 360 px.
- **Uscite:** `output-completo.txt`, `esito.txt`, `output-extra.txt`, `output-spot.txt`.
- **Screenshot:** 164 in `shots/`, con nomi `<schermo>-<indice>-<periodo>.png`, `*-rs-KOSPI200.png`, `*-pagina.png`, `*-tip-*.png`, `*-legenda-*.png`, `spot-TWN-MAX-stampe.png`.
- **Comandi:**
  ```
  node ricerca/qa/1.4.0/grafici/dati.mjs
  APP=<copia>/ node ricerca/qa/1.4.0/grafici/attese.mjs
  BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/grafici/grafici.cjs
  ```
