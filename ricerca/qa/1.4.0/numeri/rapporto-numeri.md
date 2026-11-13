# Controllo numeri e dati · versione 1.4.0 · commit afc06f3

Copia controllata: `http://127.0.0.1:8794/` (codice afc06f3, dati di `main` al 04/11/2026, `data/emerging.json` del 05/11). Ricalcolo indipendente in Python (solo libreria standard, nessun modulo dell'app); valori letti dal DOM con Playwright (Chromium, 1600×1100 e 1440×1000, tema di partenza). Seconde fonti: FRED H.10 (DEX*, DTWEXEMEGS) e cambi di riferimento BCE (14:15 CET, incrociati con EUR/USD).

Nota: durante il controllo nel working tree sono comparse modifiche non mie a `js/emerging-view.js`, `js/emerging.js` e altri file. Il rapporto vale per la copia servita (afc06f3), non per quelle modifiche.

**Verdetto: NO-GO.** Tutti i valori di oggi (KPI, tabellone, punti della forza relativa) tornano con il ricalcolo. Nel grafico di partenza (3A) però compaiono cambi sbagliati di Yahoo che `cleanFx` non toglie, e la nota «chiusura di Londra» descrive male l'ora del cambio.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | bloccante | Dettaglio IBOV, 3A (riquadro dei valori e linea «in dollari») | Il 26/10/2026 il riquadro mostra «BRL per dollaro 4,9602» e «In dollari (base 100) 147,2». FRED dà 5,4415 e la BCE 5,5884 (il cambio era salito dell'8% dopo le elezioni): con il cambio giusto il valore in dollari sarebbe 130,7 (BCE) o 134,2 (FRED). La linea in dollari ha quindi un picco finto del 10-13% nell'ultima settimana. `cleanFx` non lo toglie: il salto d'andata è −1,8% (sotto la soglia del 3%) e il giorno dopo il cambio non torna indietro, va oltre | `#emg-IBOV`, mouse sul 26/10/2026; `python3 -I vicini.py <sito> BRL=X 2026-10-26` | `shots/tip-IBOV-2026-10-26.png`, `output/vicini.txt`, `ecb/BRL.csv` |
| 2 | bloccante | Dettaglio NIFTY50, 3A (fascia e riquadro «Valuta») | Yahoo dà INR=X 85,194 il 02/11/2023 (FRED 83,22, BCE 83,20; il giorno prima e quello dopo 83,28 e 83,25). È un errore di stampa del 2,3%. Non viene tolto perché per INR valgono le soglie del 3% e dell'1%, anche se la configurazione lo segna come cambio `managed` (le soglie strette valgono solo per CNY e HKD). L'errore alza il massimo a 63 sedute, e così dal 06/11/2023 al 29/01/2024 (58 sedute) il grafico mostra la fascia e lo stato «Ha smesso di scendere». Con FRED, o togliendo quel giorno, lo stato è sempre «Normale». C'è anche un secondo errore non tolto: 93,5461 il 26/08/2026 (FRED 95,43, BCE 95,42). Lo stato di oggi non cambia, ma la z mostrata oggi passa da −0,36 a −0,21 | `#emg-NIFTY50`, mouse tra il 06/11/2023 e il 29/01/2024; `python3 -I spike_effetto.py <sito>` | `shots/tip-NIFTY50-2023-11-06.png`, `shots/tip-NIFTY50-2023-12-15.png`, `bande.json` (fascia «ferma» 2023-11-06→2024-01-29), `output/spike_effetto.txt`, `output/inr_stretto.txt` |
| 3 | da correggere | Nota «Fonti», guida (§ Emergenti), README («Indice in dollari») | La frase «Cambio di Yahoo: chiusura di Londra» non è esatta. Il valore che Yahoo data t corrisponde all'inizio della giornata di Londra t, cioè circa alla chiusura di New York del giorno prima. Lo scarto mediano contro FRED (mezzogiorno di New York) è più piccolo con la data t−1 che con la data t: CNY 0,006% contro 0,086%, KRW 0,16% contro 0,33%, INR 0,05% contro 0,10%, TWD 0,12% contro 0,18%, sia con l'ora legale sia con l'ora solare. Nel caso della CNY dal 2023 Yahoo(t) coincide spesso con FRED(t−1) alla quarta cifra. Due eventi lo confermano: la svalutazione della CNY dell'11/08/2015 (annunciata alle 02:15 di Londra) compare in Yahoo solo il 12/08, e la legge marziale in Corea del 03/12/2024 compare il 04/12. Effetto su «3 mesi in $» di oggi, ricalcolato con i cambi BCE dello stesso giorno: KOSPI200 −8,8% contro −7,1%, CSI300 −10,5% contro −10,9%, NIFTY50 −2,1% contro −1,9%, IBOV −12,4% contro −12,4%. Per l'IBOV il cambio è di circa 20 ore prima della chiusura | `python3 -I orario_cambio.py <sito>`; `python3 -I vicini.py <sito> CNY=X 2015-08-11` | `output/orario_cambio.txt`, `output/vicini.txt` |
| 4 | da correggere | Tabellone, colonna «3 mesi in $» (`change()` in js/emerging.js) | Se il cambio manca all'ultima seduta dell'indice (Venerdì Santo, Pasquetta o 1° gennaio a Londra, con la borsa locale aperta), `change()` torna all'ultima seduta che ha il cambio. La colonna «in $» finisce allora un giorno prima di «locale», senza dirlo, e mostra lo stesso valore in giorni diversi. Esempio: KOSPI200 il 18/04/2025 e il 21/04/2025 mostrerebbe «+3,3%» in tutti e due i giorni, calcolato dal 13/01 al 17/04, mentre «locale» è −0,6% e −0,3%. Oggi non succede; negli ultimi 3 anni sarebbe successo in 17 giorni sui 6 indici | `node finestra_usd.mjs <sito>` | `output/finestra_usd.txt` |
| 5 | minore | Cambi tolti da `cleanFx`, vista MAX | 22 dei 79 giorni tolti non sono errori secondo FRED. Dove Yahoo alterna due livelli, la regola toglie il valore giusto e tiene quello sbagliato. Esempi: KRW 16/09/2008, 1160,0 contro FRED 1159,75, tolto, mentre restano 1098,8 il 15/09 e 1099,6 il 17/09; INR 30/01/2012, 49,388 contro FRED 49,66, tolto; TWD 2015-16, 15 dei 30 tolti (per esempio 27/11/2015, 32,695 contro FRED 32,69). Sono tutti casi fino al 2016, quindi la vista 3A e gli stati di oggi non cambiano. La nota «sedute tolte perché errori di stampa» li conta tutti come errori | `python3 -I fred_confronto.py <sito>` | `fred_confronto.json` (`tolti_non_confermati`), `output/vicini.txt` |
| 6 | minore | Cambio CNY=X ed ETF ASHR (sorgente Yahoo) | Yahoo ripete lo stesso valore per più sedute e l'app lo usa come dato. CNY: 7,2037 per 10 sedute (23/05-05/06/2025), mentre FRED va da 7,175 a 7,199; nell'ottobre 2026 ci sono 4 serie di 3-6 sedute ferme; in tutto 50 sedute ripetute dal novembre 2023. ASHR: chiusura rettificata identica dal 30/06 al 02/07/2025. Per la CNY l'effetto è al massimo dello 0,4% e lo stato di oggi non cambia | `python3 -I ripetuti.py <sito>` | `output/ripetuti.txt`, `output/vicini.txt` (CNY 2026-10-14) |
| 7 | minore | Quadrante della forza relativa, punto EWY | Il titolo del punto dice «RS-Ratio 100,0 … (Lagging)». Il valore vero è 99,993, quindi il quadrante è giusto, ma chi legge vede 100,0 e Lagging insieme | passa il mouse sul punto EWY | `dom.json` → `rsDots` |
| 8 | minore | Riquadro del grafico, CSI300 | Il prezzo dell'ETF 510300 è mostrato con 2 decimali (per esempio «4,08»), mentre la vista 6 usa `pxDec` con 3 decimali, perché un centesimo vale lo 0,24% | mouse sul grafico di CSI300 | `dom.json` → `detail.CSI300.tips` |
| 9 | minore | Nota sotto il grafico, HSI | Mostra «cambio al —», ma il cambio HKD=X (fino al 04/11) serve per la linea in dollari | `#emg-HSI` | `dom.json` → `detail.HSI.chartMeta` |
| 10 | minore | Commento in testa a js/emerging.js | Dice «Ogni valore alla seduta t usa solo dati fino a t», ma `cleanFx` usa anche t+1 (la regola stessa dice «si annulla il giorno dopo»). Su 4.650 prove in 6 date uno stato passato mostrato oggi è diverso da quello mostrato quel giorno, per esempio CNY il 13/11/2023: «ferma» quel giorno, poi seduta tolta. Il resto è causale | `node causale.mjs <sito>` | `causale.json` |

## Cosa ho verificato e passa
- **783 confronti DOM contro ricalcolo indipendente, 0 diversi** (`confronto.py`, `output/confronto.txt`):
  - KPI: dollaro 130,9; «sopra la media 200» (128,62); «+2,0% in 3 mesi»; «non favorevole»; «FRED al 30/10/2026»; valute in calo forte 1/5 (IBOV); valute ferme 2/5 (NIFTY50, KOSPI200).
  - Ogni cella del tabellone: breadth, 3 mesi locale e in $, stato della valuta, z con 2 decimali, cambio e sua data, quadrante e data della forza relativa.
  - RS-Ratio, RS-Momentum e quadrante dei 7 punti.
  - «Dati al» dei 7 indici (CSI300 al 03/11, gli altri al 04/11).
  - Riquadro del grafico in 3A e MAX in circa 130 date: prezzo, in dollari base 100, % sopra la media 200, cambio, stato della valuta, dollaro FRED. Le date scelte comprendono giorni di cambio tolto, giorni senza cambio, giorni senza FRED e giorni con la valuta «ferma» o «in calo».
- 7 coincidenze sono a metà tra due arrotondamenti (prezzi CSI300 e HSI) e tornano anche con l'arrotondamento di `toFixed`. EWY con «100,0» è al punto 7.
- **Drawdown da massimo a 52 settimane**: 7 su 7, ricalcolato e uguale alla vista 6.
- **Scia della forza relativa**: 70 punti (7 indici × 10 settimane), coordinate SVG uguali al ricalcolo entro 0,06 px (`scia.mjs`).
- **Vista 8 uguale alla vista 6** per stato, breadth, livello blu e drawdown:
  - con i livelli di partenza;
  - dopo 3 cambi del livello blu che cambiano lo stato (KOSPI200 da 15 a 7: da Zona blu ad Attenzione; NIFTY50 da 10 a 50: da Normale ad Attenzione; CSI300 da 14 a 25: da Attenzione a Zona blu), compresi i conteggi dei KPI, il titolo del pannello «LIVELLO BLU x%», l'asterisco e la riga del dettaglio;
  - dopo la ricarica della pagina;
  - dopo il ritorno al livello di partenza.
  In tutti i casi 0 differenze (`blu.mjs`, `dom.mjs`).
- **DTWEXEMEGS**: 5.222 valori su 5.222 identici a FRED dal 2006; ultimo valore 30/10/2026, come FRED.
- **Cambi contro FRED**:
  - 56 dei 79 giorni tolti sono confermati come errori, 1 senza FRED.
  - Lo stato di oggi delle 5 valute è uguale calcolato con FRED alla sua ultima data (30/10) e resta uguale togliendo gli errori non tolti.
  - Dal novembre 2023 lo stato coincide con quello calcolato su FRED in 732 sedute su 747 per CNY, 721 su 748 per HKD, 689 su 748 per TWD e 684 su 748 per KRW; 630 su 748 per INR e 511 su 748 per BRL (differenze dovute all'ora del cambio, vedi il punto 3).
- **Nessun dato futuro**:
  - stato e z della valuta: 4.650 prove con la storia tagliata a t contro la storia completa; si differenziano solo 6 date di cambio tolto (punto 10);
  - D, media 200 e variazione a 63 sedute del dollaro: 800 prove, 0 diversi;
  - forza relativa: 1.393 punti settimanali, 0 diversi;
  - le bande del grafico usano gli stessi valori.
- **Date e dati mancanti**:
  - «cambi al 04/11/2026», «ETF al 04/11/2026», «FRED al 30/10/2026»;
  - meta del tabellone «dal 03/11/2026 al 04/11/2026»;
  - FRED mancante dopo il 30/10 mostrato «—» con la nota;
  - KRW mancante il 18/04/2025 e il 21/04/2025 (Pasqua a Londra) mostrato «—» nel cambio e nell'indice in dollari;
  - giorni di cambio tolto mostrati «—»;
  - nessuno zero e nessun valore ricopiato dall'app nel riquadro (la sola eccezione è la colonna del punto 4).
- **Ora del cambio**: la differenza tra cambio e chiusura locale è dichiarata, ma con un'ora sbagliata (punto 3).
- **Console**: nessun errore JavaScript durante tutte le prove.

## Cosa non ho potuto verificare e perché
- Le statistiche del riquadro «Come leggere» («in 13 cali oltre il 25% su 14», «mediana 110 sedute in 19 cali») tornano con `ricerca/emergenti/backtest/backtest.md`. Non le ho ricalcolate: la cache del backtest (`ricerca/emergenti/cache/`) non è nel repository e andrebbe riscaricata.
- TWD non ha una terza fonte: la BCE non pubblica il dollaro di Taiwan. Il confronto è solo con FRED.
- BRL il 02/01/2025 (Yahoo 6,30, FRED 6,1556, BCE 6,2203) resta dubbio: non l'ho contato come errore.
- I numeri del telefono e del tema chiaro: ho letto il DOM solo su computer. I calcoli non dipendono dalla larghezza, il disegno sì.

## Script e screenshot
Cartella `ricerca/qa/1.4.0/numeri/`:
- **Ricalcolo e confronto**:
  - `ricalcolo.py` e `ricalcolo_lib.py`: ricalcolo indipendente, scrivono `calc.json` e `probe_dates.json`;
  - `dom.mjs`: lettura del DOM, scrive `dom.json`;
  - `confronto.py`: confronto tra DOM e ricalcolo, scrive `confronto.json`.
- **Cambi contro le altre fonti**:
  - `fred_confronto.py`: Yahoo contro FRED e DTWEXEMEGS;
  - `spike_effetto.py`: errori non tolti e loro effetto sugli stati;
  - `inr_stretto.py`: INR con le soglie strette;
  - `orario_cambio.py`: ora del cambio, contro FRED e BCE;
  - `vicini.py`: valori attorno a una data.
  - `ripetuti.py`: valori ripetuti per più sedute.
- **Altre prove**: `causale.mjs` (nessun dato futuro), `finestra_usd.mjs` (punto 4), `blu.mjs` (vista 6 contro vista 8), `scia.mjs`, `bande.mjs`, `prove_tip.mjs`.
- **Dati delle fonti**: `fred/*.csv` (FRED, scaricati il 05/11/2026), `ecb/*.csv` (BCE).
- **Uscite**: `output/*.txt`.
- **Screenshot** in `shots/`: `emg-desktop.png`, `emg-dopo-blu.png`, `emg-blu-cambiati.png`, `tip-IBOV-2026-10-26.png`, `tip-NIFTY50-2023-11-06.png`, `tip-NIFTY50-2023-12-15.png`, `tip-KOSPI200-2025-04-18.png`.

Uso: `python3 -I ricerca/qa/1.4.0/numeri/<script>.py <cartella del sito>`; per gli script Playwright `NODE_PATH=$(npm root -g) node ricerca/qa/1.4.0/numeri/<script>.mjs [url]`.

Proposte (da discutere con l'utente, perché toccano la regola di pulizia e la scelta della fonte):
- usare per INR le soglie dei cambi gestiti, che toglierebbero il 02/11/2023 e, con lo 0,5%, anche il 26/08/2026;
- oppure segnare come sospetti i giorni in cui Yahoo si allontana da FRED o dalla BCE di oltre l'1,5% (0,5% per CNY);
- correggere la frase sull'ora del cambio;
- in «3 mesi in $» mostrare «—» quando il cambio manca all'ultima seduta, oppure dire la data.
