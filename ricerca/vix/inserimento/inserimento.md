# Pannello «VIX»: dati e inserimento nel codice (verifica preliminare)

06/11/2026, ramo `claude/great-noether-2f1ude` (versione 1.4.1). Solo verifica: nessuna modifica all'app, niente commit.
Il backtest dei regimi e del confronto implicita/realizzata/GARCH lo fanno altri due agenti (`ricerca/vix/regimi/`,
`ricerca/vix/volatilita/`); qui ci sono i **dati** (parte A) e il **piano di inserimento** (parte B).

File di questa cartella:

| File | Cosa fa |
|---|---|
| `scarica.mjs` | scarica i file grezzi in `ricerca/vix/cache/inserimento/` (FRED, Cboe, Yahoo giornaliero e a 5 minuti, 140 vintage ALFRED); non riscarica ciò che c'è già (`--refresh` per forzare) |
| `verifica_dati.mjs` | tutti i controlli della parte A, scrive `risultati/verifica_dati.json` e `risultati/verifica_dati.txt` |
| `ricontrollo.py` | ricalcolo indipendente in Python (date di Yahoo con `zoneinfo`, senza `scripts/lib/yahoo.js`) dei numeri chiave: tutti uguali (`risultati/ricontrollo.txt`) |
| `schede9.cjs` | prova di impaginazione della barra con 9 schede in Playwright (la nona scheda si aggiunge solo nella pagina aperta dal browser di prova); risultati in `risultati/schede9.txt` e `risultati/schede/*.png` |

Download del 06/11/2026 alle 14:40 UTC: l'ultima seduta chiusa è quella del 05/11/2026 (S&P 500 −4,36%, VIX da 16,61 a 28,18).

---

## A. Dati

### A.1 Cosa c'è già nell'app

- **Nessun VIX** né VXN: né in `data/`, né in `config/`, né in `universe.json` (c'è solo `DX-Y.NYB` per l'inverso del dollaro negli asset reali).
- **S&P 500 e Nasdaq-100**: chiusure di `^GSPC` e `^NDX` (solo prezzo, Yahoo) in `data/indices.json` (formato di `js/indexdata.js`), **dal 03/01/2000**. Per una tabella dei regimi «dal 1990» servono le chiusure 1990-1999, che l'app non ha.
- `^GSPC` e `^NDX` scaricati oggi da Yahoo coincidono al centesimo con `data/indices.json` su tutte le 6.751 sedute comuni (0 differenze; è la stessa fonte).
- `fetchFred` e `parseFredDaily` (`scripts/fetch_data.js:634-660`) e `pack`, `pickSeries`, `splice` (`scripts/fetch_emerging.js`) si possono riusare.

### A.2 Copertura delle fonti

| Fonte | Da | A (oggi 14:40 UTC) | Valori | Note |
|---|---|---|---:|---|
| FRED `VIXCLS` | 02/01/1990 | **04/11/2026** | 9.310 | 302 giorni feriali vuoti («.»): 299 sono feste NYSE, 3 sono sedute NYSE |
| Cboe `VIX_History.csv` | 02/01/1990 | 05/11/2026 | 9.310 | file ufficiale dell'emittente, OHLC (1990-1991: solo la chiusura) |
| Yahoo `^VIX` | 02/01/1990 | 05/11/2026 | 9.282 | fuso America/Chicago, orario 02:15-15:15 CT (03:15-16:15 ET) |
| FRED `VXNCLS` | 02/02/2001 | **04/11/2026** | 6.478 | 242 vuoti: 240 feste, 2 sedute (22/08/2003, 10/09/2004) |
| Cboe `VXN_History.csv` | **14/09/2009** | 05/11/2026 | 4.316 | il file ufficiale parte dal 2009 |
| Yahoo `^VXN` | 23/01/2001 | 05/11/2026 | 6.486 | |
| Yahoo `^GSPC` | 02/01/1985 | 05/11/2026 | 10.543 | uguale a `data/indices.json` dal 2000 |
| Yahoo `^NDX` | 01/10/1985 | 05/11/2026 | 10.355 | uguale a `data/indices.json` dal 2000 |
| FRED `SP500` | 07/11/2016 | 04/11/2026 | 2.512 | solo 10 anni (licenza S&P) |
| FRED `NASDAQ100` | 02/01/1986 | 05/11/2026 | 10.293 | errori nel 2003-2005, vedi A.6 |

Sedute NYSE dal 02/01/1990 al 05/11/2026 (date di `^GSPC`): **9.280**. Il calendario di `js/calendar.js` dà come festivi anche i Martin Luther King Day 1990-1997, in cui la NYSE era aperta (la festa in borsa c'è dal 1998): non conta per l'app di oggi, ma non va usato per classificare sedute storiche.

### A.3 Buchi, festività e giorni speciali

| | FRED VIX | Cboe VIX | Yahoo VIX |
|---|---|---|---|
| Sedute NYSE senza VIX | 3: 01/03/1991, 31/01/1997, 26/11/1997 | 4: le stesse più 31/12/1999 | 0 (vedi sotto) |
| VIX in giorni senza seduta NYSE | 34 | 34 | 2 (25/05/2026, 07/09/2026) |

- **Yahoo riempie i buchi**: il 01/03/1991, 31/01/1997 e 26/11/1997 ha una barra piatta (apertura = massimo = minimo = chiusura = chiusura del giorno prima, volume 0). È un valore di riempimento: va trattato come mancante.
- **31/12/1999**: manca solo nel file di Cboe; FRED e Yahoo hanno 24,64.
- **VIX nelle feste USA dal 2022**: Cboe (e quindi FRED) ha **33 valori in giorni senza seduta NYSE dal 30/05/2022**: 32 feste (Memorial Day, Juneteenth, 4 luglio, Labor Day, Thanksgiving, MLK, Presidents' Day…) e il funerale di Carter (09/01/2025). Sono valori veri, tutti diversi dal giorno prima (sedute «global trading hours» di Cboe), non ricopiati. Niente VIX invece nelle feste prima del 30/05/2022 e, dopo, a Natale, Capodanno e Venerdì santo (15 feste NYSE dal 2022 senza VIX). Yahoo li ha solo per 25/05/2026 e 07/09/2026. Il 34° è l'11/06/2004 (funerale di Reagan): barra piatta uguale al giorno prima, un valore ricopiato in un giorno senza seduta.
- **Giorni speciali** (nessuna fonte ha valori quando la NYSE è chiusa, tranne i due casi sopra):

| Data | Evento | NYSE | VIX (FRED = Cboe) | Yahoo |
|---|---|---|---|---|
| 27/04/1994 | funerale di Nixon | chiusa | vuoto | assente |
| 11-14/09/2001 | 11 settembre | chiusa | vuoto | assente |
| 17/09/2001 | riapertura | aperta | 41,76 | 41,76 (VXN: FRED 67,99, Yahoo 73,26) |
| 11/06/2004 | funerale di Reagan | chiusa | **15,04** (ricopiato) | assente |
| 02/01/2007 | funerale di Ford | chiusa | vuoto | assente |
| 29-30/10/2012 | uragano Sandy | chiusa | vuoto | assente |
| 31/10/2012 | riapertura | aperta | 18,60 | 18,60 |
| 05/12/2018 | funerale di G.H.W. Bush | chiusa | vuoto | assente |
| 09/01/2025 | funerale di Carter | chiusa | **18,07** (Cboe aperta) | assente |

**Conseguenza**: il VIX va allineato alle sedute NYSE (date di `^GSPC`). I valori in giorni senza seduta si tolgono (nella pipeline, con l'elenco nel file) e le 3-4 sedute senza VIX restano «—», mai riempite.

### A.4 Valori ricopiati

- FRED e Cboe: 50 sedute uguali alla precedente su 9.310 (con due decimali è plausibile per caso); due serie di tre valori uguali (26-28/07/1995 a 13,18; 18-22/08/2005 a 13,42), identiche in tutte e tre le fonti: non si possono distinguere da valori veri.
- Yahoo `^VIX`: le stesse più le tre barre di riempimento di A.3.
- Yahoo `^VXN`: **7 sedute ferme a 12,31 dal 10 al 21/02/2017**, mentre Cboe e FRED hanno 12,18, 11,69, 12,74, 12,07, 12,98…: Yahoo era fermo.

### A.5 FRED contro Cboe contro Yahoo

| Confronto | Sedute comuni | Diverse (> 0,005) | > 0,5 punti | Differenza massima |
|---|---:|---:|---:|---|
| VIX FRED-Cboe | 9.309 | **0** | 0 | — |
| VIX Yahoo-Cboe | 9.278 | 13 | 3 | **2,61 il 06/02/2026** (Yahoo 20,37, Cboe 17,76) |
| VXN FRED-Cboe | 4.315 | **0** | 0 | — |
| VXN Yahoo-Cboe (dal 2009) | 4.314 | 14 | 3 | 3,49 il 27/04/2010 (Yahoo 21,30, Cboe 17,81) |
| VXN Yahoo-FRED (dal 2001) | 6.475 | 694 | **650** | 12,32 il 06/04/2001 (Yahoo 79,56, FRED 67,24) |

- **FRED ripubblica Cboe senza differenze** (VIX e VXN): sono una fonte sola, con due canali.
- **Yahoo `^VIX` il 06/02/2026** ha una barra rimasta a metà seduta: chiude a 20,37 con minimo 19,99, mentre Cboe ha minimo 17,27 e chiusura 17,76. Su quella seduta Yahoo mette il VIX **sopra 20** e Cboe sotto: sulle sedute presenti in tutte e tre le fonti è l'unica con un regime diverso (soglie 20/25/30/40/50; FRED e Cboe danno sempre gli stessi giorni). Le altre differenze oltre mezzo punto: 15/10/2014 (Yahoo 25,27, Cboe 26,25) e 28/11/2008 (Yahoo 55,28, Cboe 55,84: un valore che Cboe ha corretto tra il 2020 e il 2022, vedi A.8, e Yahoo no).
- **VXN 2001-2003**: Yahoo e FRED differiscono di oltre mezzo punto in 646 sedute fino al 19/09/2003 (Yahoo in media 4,89 punti più alto, +10,6%); dal 2004 solo in 4 sedute. Il file ufficiale di Cboe parte dal 14/09/2009, quindi per il 2001-2009 non c'è un terzo termine di paragone. **Non risolto**: per il VXN conviene partire dal 14/09/2009 (dove FRED = Cboe) o dirlo nell'app. È un'informazione utile anche agli agenti del backtest, che usano `VXNCLS` dal 2001.

### A.6 `^GSPC` e `^NDX`: Yahoo, vista Indici e FRED

| Confronto | Comuni | Diverse oltre un centesimo | Oltre 0,1% | Massima |
|---|---:|---:|---:|---|
| `^GSPC` Yahoo contro `data/indices.json` (SPX) | 6.751 | **0** | 0 | — |
| `^NDX` Yahoo contro `data/indices.json` (NDX) | 6.751 | **0** | 0 | — |
| `^GSPC` Yahoo contro FRED `SP500` (dal 2016) | 2.512 | 9 | 1 | 0,12% il 11/08/2021 |
| `^NDX` Yahoo contro FRED `NASDAQ100` (dal 1986) | 10.290 | 746 | 433 | 2,44% il 26/09/2001 |

- Le 433 differenze del Nasdaq-100 sono quasi tutte nel 2003-2005 (408). Arbitro: **QQQ** (ETF sul Nasdaq-100, Yahoo). Nelle 411 sedute contestate dal 1999 il rendimento del giorno di `^NDX` Yahoo è più vicino a quello di QQQ in **327**, quello di FRED in 59 (25 pari): sono errori di FRED `NASDAQ100`, non di Yahoo. Bene per la vista Indici; FRED `NASDAQ100` non è una buona seconda fonte prima del 2006.
- `^NDX` su Yahoo non ha buchi oltre 5 giorni dal 1985 (a parte l'11 settembre).

### A.7 Ora della chiusura: VIX alle 16:15, indice alle 16:00

- Il VIX si calcola dalle 03:15 alle 16:15 ET (barre a 5 minuti di Yahoo: prima 03:15, ultima 16:10-16:15; `meta.currentTradingPeriod` 02:15-15:15 CT). La chiusura ufficiale è quella delle **16:15 ET**, 15 minuti dopo la chiusura di S&P 500 e Nasdaq-100 (16:00). Anche il VXN chiude alle 16:15 (ultimo aggiornamento di Yahoo alle 16:15:01 ET). Nei giorni a orario ridotto (dopo Thanksgiving, vigilia di Natale) il VIX chiude alle 13:15.
- Misura sugli ultimi 60 giorni di barre a 5 minuti (58 sedute): **|VIX 16:15 − VIX 16:00| mediana 0,05 punti, massimo 0,75** (29/10/2026: 16,45 → 17,20); oltre 0,5 punti 2 sedute su 58 (anche il 05/11/2026: 27,59 → 28,18). In nessuna delle 58 sedute il quarto d'ora ha fatto passare una soglia 20/25/30/40/50, ma può succedere nelle sedute più agitate.
- **Cosa comporta**:
  1. un rendimento «dalla chiusura del giorno in cui il VIX ha chiuso sopra 30» parte da un prezzo delle 16:00, quando il VIX delle 16:15 non si conosceva ancora: 15 minuti di dato futuro. Per un pannello di contesto è trascurabile, ma va detto, oppure si parte dalla chiusura della seduta dopo (è la stessa questione aperta in `docs/sviluppo.md` §5, «Rendimenti degli episodi»: da decidere con l'utente, vale anche per gli episodi della vista Indici);
  2. il VIX del giorno di un segnale della vista Indici (punto 4 dell'idea) è quello di 15 minuti dopo la chiusura: stesso giorno di calendario, va bene, ma la nota lo deve dire;
  3. per la volatilità realizzata (chiusura su chiusura dell'indice) non cambia nulla.

### A.8 FRED: ritardo di pubblicazione e revisioni

- **Ritardo**: FRED aggiorna `VIXCLS` e `VXNCLS` **la mattina dopo** (pagina della serie il 06/11/2026: «Updated: Nov 6, 2026 8:38 AM CST», cioè 14:38 UTC, con l'ultima seduta del 05/11). Con le corse della Action (22:40, 01:10-06:10 e 11:40 UTC) FRED è quindi **sempre una seduta indietro**: d'estate (8:38 CDT = 13:38 UTC) come d'inverno.
- **Cache di FRED**: l'indirizzo senza `cosd` (`fredgraph.csv?id=VIXCLS`) è servito da una cache con `Last-Modified` di un giorno prima: alle 14:43 UTC finiva al 04/11; con `&cosd=…` (come fa `fetchFred` in `scripts/fetch_data.js:645`) arriva la versione nuova con il 05/11. Le cache degli altri agenti (`ricerca/vix/cache/VIXCLS.json`, `VXNCLS.json`) usano l'indirizzo senza `cosd` e finiscono al 04/11.
- **ALFRED non misura il ritardo**: le vintage di `VIXCLS` sono datate con il giorno della seduta (la vintage del 05/11 contiene già il 05/11, che su FRED è comparso il 06/11). Su 125 vintage giornaliere (marzo 2024, aprile 2025, dicembre 2025-gennaio 2026, ottobre-novembre 2026) il «ritardo» risulta sempre 0: è la convenzione di ALFRED, non la realtà.
- **Revisioni**: rispetto alle vintage annuali, FRED ha cambiato il VIX in 4-8 sedute storiche fino alla vintage del 02/01/2024 (correzioni di Cboe: 16/09/2008 da 31,54 a 30,30; 16/12/2008 da 51,29 a 52,37; 28/11/2008 da 55,28 a 55,84; 10/09/2004 da 14,01 a 13,76…), nessuna dal 2025. Il VXN: 27/04/2010 da 21,30 a 17,81 (corretto tra il 2012 e il 2015); **01/02/2024 da 11,20 a 17,33, corretto solo nel 2026** (FRED ha tenuto un errore di stampa per due anni; Yahoo aveva il valore giusto). Conseguenza: la pipeline riscarica tutta la storia a ogni corsa (470 KB, una richiesta) e accetta le revisioni, segnalandole negli avvisi della corsa.

### A.9 Cboe: quando aggiorna

- Il file del VXN risultava modificato alle **22:31 UTC del 05/11** (75 minuti dopo la chiusura delle 16:15 ET); quello del VIX alle 02:30 UTC del 06/11 (forse un secondo aggiornamento). Alla corsa delle 22:40 UTC (che GitHub di solito fa partire con 2-4 ore di ritardo) il valore della seduta c'è quasi sempre; se manca, le corse di recupero non partono quando i dati USA sono completi (`scripts/need_update.js`) e il VIX arriva alla corsa delle 11:40 UTC.
- Il file non conteneva barre della seduta in corso alle 14:40 UTC; per prudenza la pipeline tiene solo le date fino all'ultima seduta chiusa (`expectedSession()` di `js/calendar.js`).
- L'indirizzo `cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv` risponde con un 307 verso `cdn-api.cboe.com`: non è un'API documentata e può cambiare. **Non verificato** che risponda dai server di GitHub Actions (CloudFront a volte blocca i data center): va provato alla prima corsa, il ripiego sotto lo copre.
- Licenza: FRED riporta per le due serie «Copyright, 2016, Chicago Board Options Exchange, Inc. Reprinted with permission» e chiede la citazione «Chicago Board Options Exchange, CBOE Volatility Index: VIX [VIXCLS], retrieved from FRED». Il repository è pubblico e `data/vix.json` ripubblicherebbe i valori: va scritto nella sezione Licenza del README (come per Yahoo e il CPI) e conviene che l'utente lo sappia.

### A.10 Fonte consigliata e ripiego

**VIX**: file ufficiale di **Cboe** per tutta la storia e per l'ultima seduta, con **FRED come controllo e ripiego**; Yahoo solo come ultima coda provvisoria.

| Caso | Cosa fa la pipeline | Cosa vede l'utente |
|---|---|---|
| Cboe risponde (normale) | storia e ultima seduta da Cboe; confronto con FRED sulle date comuni (oggi 0 differenze su 9.309): ogni differenza diventa un avviso della corsa | VIX della seduta di ieri sera |
| Cboe giù, FRED su | storia da FRED (= Cboe), ultima seduta mancante presa da Yahoo `^VIX` e segnata come provvisoria (campo `prov` con la data, come `fred` in `emerging.json`); alla corsa dopo la sostituisce Cboe o FRED | VIX con l'asterisco «provvisorio (Yahoo)» per una seduta |
| Cboe e FRED giù | coda di Yahoo sopra la serie pubblicata, provvisoria | come sopra |
| Tutto giù | resta il file pubblicato; `check_fresh.js` avvisa oltre i 4 giorni | la data del VIX dice quanto è vecchio |

Perché non solo FRED (come i cambi degli Emergenti): FRED è sempre una seduta indietro alle ore delle corse, e la coda di Yahoo ha errori come quello del 06/02/2026 (2,61 punti, regime diverso). Perché non solo Yahoo: barre piatte di riempimento, barre ferme (VXN febbraio 2017, VIX 06/02/2026), correzioni di Cboe non prese.

**VXN** (serve solo al grafico implicita/realizzata del Nasdaq-100): Cboe dal **14/09/2009**, FRED come ripiego. Prima del 2009 FRED e Yahoo non concordano nel 2001-2003 (A.5): non pubblicarlo finché non c'è un terzo termine di paragone.

**S&P 500 e Nasdaq-100**: Yahoo `^GSPC` e `^NDX` (gli stessi della vista Indici: 0 differenze), scaricati dallo script del VIX dal 1990. Seconda fonte per i controlli: FRED `SP500` (dal 2016) e QQQ/SPY per i rendimenti; non FRED `NASDAQ100` prima del 2006.

---

## B. Inserimento nel codice

### B.1 Scheda nuova o sezione della vista Indici?

| | Scheda nuova «8 VIX» (Alert al 9) | Sezione nella vista 6 Indici | Riga nella vista Alert (proposta C di `docs/sviluppo.md` §8) |
|---|---|---|---|
| Posto per tabella dei regimi, VIX di oggi, grafico | sì, come gli Emergenti | poco: la vista 6 è già la più lunga (tabellone, mappa, dettaglio, episodi, cali forti) | solo «VIX oggi» e una riga di statistiche |
| Riguarda | S&P 500 e Nasdaq-100 | ha senso solo per gli indici USA, non per DAX o Nikkei | i settori S&P 500 |
| Navigazione | 9 schede: tasti, barra, guida da rinumerare | nessun cambio | nessun cambio |
| Caricamento pigro | `data/vix.json` alla prima apertura della scheda | alla prima apertura della vista 6 (si aggiunge a 300 KB compressi) | all'apertura dell'Alert |
| Punto 4 (VIX alle date dei segnali) | resta naturale nella vista 6 e nella vista 4, con il link alla scheda | sì | no |

**Consiglio**: scheda nuova **«8 VIX»**, con **Alert al 9** (resta l'ultima, come ha voluto l'utente nella 1.4.1), per i punti 1-3; il punto 4 come colonna «VIX» nelle tabelle degli episodi della vista 6 (solo indici USA: SPX, NDX, DJI, RUT) e della vista 4 (settori), in un secondo passo. È lo stesso modello degli Emergenti (vista con il suo file, contesto, nessuna regola). Se l'utente vuole solo il VIX di oggi e la tabella dei regimi, senza grafico, basta la riga nell'Alert.

### B.2 Nove schede: tasti e barra

- **Tasti**: `+e.key - 1` in `js/app.js:984-985` porta già il tasto 9 a `VIEWS[8]`: basta `VIEWS`. Le frecce sulle schede (`js/app.js:957`) seguono l'ordine del DOM.
- **Barra** (misure di `schede9.cjs`, tema scuro; «oggi» = 8 schede):

| Larghezza | Oggi (8) | 9 schede con il CSS di oggi | 9 schede, variante consigliata (C) |
|---|---|---|---|
| 1440-900 px | 1 riga | 1 riga (865 px di schede) | 1 riga |
| 861 px | 1 riga | **la pagina scorre in orizzontale** (865 > 827 px) | 1 riga (padding 9 px tra 861 e 1100 px: 775 px) |
| 860-601 px (tablet 820, 768) | 2 righe da 4 | 3 righe (4+4+1), 90 px | 2 righe da 5 (5+4), 60 px, schede da 146-164 px |
| 600-414 px | 2 righe da 4 | 3 righe (4+4+1) | 3 righe da 3, 93-105 px |
| 390 px | 2 righe, 70 px | 3 righe, 105 px | 3 righe da 3, 105 px, nessuna etichetta a capo |
| 375-360 px | 2 righe, **84 px, etichette a capo** (Monitor, Rotazione, Bottom Map, Settore) | 3 righe, 119 px, a capo | 3 righe da 3, 105 px, **nessuna a capo** |

  La variante B (5+4 anche sul telefono) manda a capo tutte le nove etichette sotto 415 px: scartata. Con C il telefono guadagna anche sul difetto di oggi (a 360-375 px le prime quattro schede vanno già su due righe). Screenshot in `risultati/schede/` (`schede-C-360.png`, `-820.png`, `-861.png`…). Con 5+4 resta una cella vuota a destra della seconda riga: colorarla come la barra (`.fnkeys::after` visibile come decimo elemento della griglia) oppure lasciarla.

  CSS (`css/style.css:89-109`): tra 861 e 1100 px `padding: 7px 9px`; righe 100-104 `repeat(5, …)`; righe 106-110 `repeat(3, …)`, con `white-space: nowrap` possibile di nuovo. Da riprovare anche la testata del tablet a 820 px (già su due righe, `docs/sviluppo.md` §7).

### B.3 Piano dei file

**Navigazione e vista** (`js/app.js`):

| Riga | Modifica |
|---|---|
| 1 | commento: aggiungere VIX all'elenco delle viste |
| 7-8 | `import { createVix } from './vix-view.js';` |
| 17 | `VIEWS = ['mon', 'rrg', 'btm', 'sec', 'tit', 'idx', 'emg', 'vix', 'alr']` (commento: tasti 1-9, 1.5.0) |
| 76-81 | `SHAPE`: `'data/vix.json': ['series', 'asOf']` |
| 96-99 | nessun file nuovo all'avvio (niente `config/vix.json`: soglie 20/25/30/40/50 e orizzonti come costanti in `js/vix.js`, nessuna configurazione da cambiare) |
| 263-269 | dopo gli Emergenti: `state.vix = createVix({ $, store, load: () => getJSON('data/vix.json', false, true), indices: state.indices, openIndex: … })`; la scheda resta sempre visibile (se il file manca, la vista lo dice) |
| 283 | `state.vix.bind();` |
| 299-309 | commento con `#vix`; `routeHash` non cambia (`VIEWS.includes`) |
| 373-383 | `renderAll`: `else if (state.view === 'vix') state.vix.render();` |
| 790-792 | nessuna guardia (la vista esiste sempre) |
| 806-813 | `syncHash`: nessuna modifica se l'indirizzo è solo `#vix` (la scelta SPX/NDX resta nel browser, `sm.vixIx`); con `#vix-NDX` servirebbe un ramo come `emg` |
| 849 | la guida si apre a `guida.html#vix` da sola (serve la sezione con `id="vix"`) |
| 1000 | `words`: `VIX: 'vix', VXN: 'vix'` (nessun conflitto: `VIX` non è un ticker di `universe.json` né un indice di `config/indices.json`) |

**`index.html`**:
- 45-50: `modulepreload` di `js/vix.js` e `js/vix-view.js`;
- 83-84: `<button … id="tab-vix" data-view="vix" aria-controls="v-vix">8 VIX</button>`, Alert diventa «9 Alert»;
- dopo la riga 751 (fine di `#v-emg`): `<section class="view" id="v-vix" role="tabpanel" aria-labelledby="tab-vix" hidden>` con `#vxLoading` (messaggio di caricamento e di file assente), riquadri (VIX oggi, percentile, regime, data), tabella dei regimi, grafico, note e fonti, citazione di Rea;
- 769-777 (guida rapida, «Le viste»): voce «8 VIX», «9 Alert»; 810: comandi `VIX`, tasti `1`–`9`.

**`css/style.css`**: barra (B.2); dopo la riga 871 un blocco «vista 8 VIX» sul modello di `.emg-grid` (824-871), tabella con la prima colonna fissa sul telefono come le altre (decisione del 20/10/2026).

**`js/vix-view.js`** (nuovo, sul modello di `js/emerging-view.js`, circa 250-300 righe): `createVix(ctx)` con `ensure()` (scarica `data/vix.json` alla prima apertura, come `emerging-view.js:41-50`), `render()`, `bind()`, `open(k)`; messaggio «Dati del VIX non ancora disponibili» se il file non arriva (`emerging-view.js:92`); grafico SVG con `syncX`/`emitX` e `placeTip` di `js/format.js` come gli altri.

**`js/vix.js`** (nuovo, senza DOM, come `js/emerging.js`): definizioni in testa, identiche agli script di ricerca:
- `vixSeries(x)` (decodifica con `decodeDates`/`deltaDecode`), `onSessions(vix, dates)` (VIX sulle sedute dell'indice, `null` dove manca: nessun riempimento);
- `percentile(val, t)`: quota delle sedute dal 1990 fino a `t` con VIX minore o uguale (solo passato);
- `episodes(vixOn, close, L, opt)`: definizione degli episodi presa dal backtest (`ricerca/vix/regimi/`), rendimenti con `forward` e `worstWithin` di `js/signals.js` (gli stessi della vista 6), confronto con una seduta qualsiasi come `signalContext`;
- `realized(close, n)`: volatilità realizzata annualizzata;
- GARCH(1,1): **non nel browser**. Se l'utente lo vuole (vedi incongruenza 1), stima nella pipeline con i soli dati fino a ogni data (ristima mensile su finestra crescente), serie della previsione nel file; altrimenti la stima su tutta la storia mostrerebbe il passato con dati futuri.

**Dati**:
- `scripts/fetch_vix.js` (nuovo, circa 150 righe, non dentro `fetch_emerging.js`: fonti diverse e un guasto non deve fermare l'altro): Cboe VIX e VXN (Node `fetch` segue il 307), FRED `VIXCLS`/`VXNCLS` con `fetchFred` (controllo e ripiego), Yahoo `^VIX` (coda provvisoria), `^GSPC` e `^NDX` dal 1990 con `fetchDaily`; solo sedute NYSE (date di `^GSPC`) e solo fino all'ultima seduta chiusa; `pickSeries` di `fetch_emerging.js` per non riscrivere il file senza dati nuovi (attenzione: `pack` di `fetch_emerging.js` usa 4 decimali sotto 1.000; per il VIX bastano 2: `ps: 100`); nessun campo che cambia a ogni corsa oltre a `generated` (`keep_unchanged.js`); avvisi `::warning title=VIX::` per differenze Cboe-FRED, revisioni, coda provvisoria.
- `data/vix.json`:

  ```
  { generated, asOf: { vix, vxn, spx, ndx }, source: {…}, missing: [],
    dropped: { "2022-05-30": 26.54, … },           // VIX in giorni senza seduta NYSE, tolti
    series: { VIX: { d0, gaps, cd, ps: 100, last, src: "cboe", prov: null },
              VXN: { …dal 2009-09-14 }, SPX: { …dal 1990 }, NDX: { …dal 1990 } } }
  ```
  Dimensione misurata (`verifica_dati.mjs`, sezione 8): VIX e VXN 74 KB (24 KB compressi); con SPX e NDX dal 1990 **182 KB (63 KB compressi)**; con SPX e NDX solo 1990-1999 e il resto preso da `data/indices.json` 101 KB (33 KB), ma la vista dipenderebbe dal file degli indici (300 KB compressi). Consiglio il file autosufficiente. Se si fa prima la proposta B di `docs/sviluppo.md` §8 (`data/history_long.json` con le chiusure lunghe degli indici), SPX e NDX si prendono da lì.
- `.github/workflows/update-data.yml`: passo «VIX e VXN» dopo «Cambi e dollaro emergente» (righe 74-80), `continue-on-error: true`, `timeout-minutes: 5`; riga 156 dell'Esito: `steps.vix.outcome == 'failure'` (e nel messaggio d'errore); messaggio del commit (righe 116-117): `vix al ${VIX:-?}`. `git add data/` prende già il file nuovo.
- `scripts/check_fresh.js:43-45` (dopo le righe degli Emergenti): `['vix.json (VIX)', d.vix && d.vix.asOf && d.vix.asOf.vix, B, 4]`, lo stesso per SPX e NDX; VXN 6; con `prov` più vecchio di 2 giorni un avviso. Il file mancante alla prima corsa passa (`at === undefined`, riga 58; in `main()` passare `vix: read('vix.json') || undefined`), come per gli Emergenti; dopo una settimana senza file meglio un avviso.
- `scripts/need_update.js`: non cambia (il VIX non deve far ripartire le corse di recupero).

**Test** (`npm test`; i test girano su `main`, dove `ricerca/` non c'è):
- `test/vix.test.js`: funzioni di `fetch_vix.js` (lettura del CSV di Cboe, allineamento alle sedute NYSE, scelta della fonte e coda provvisoria, ultima seduta chiusa); `js/vix.js` su dati sintetici (percentile, episodi, `null` mai riempito); «nessun dato futuro» (valore a `t` sulla serie intera = sulla serie tagliata a `t`, come `test/emerging.test.js:72`); file reale completo e ordinato, saltato se `data/vix.json` manca;
- uguaglianza con la ricerca: fixture `test/fixtures/vix_sample.json` (VIX e SPX 2007-2010 e 2020) con i valori attesi calcolati dallo script di `ricerca/vix/regimi/` e scritti nel test (modello: `test/emerging.test.js:124-126`); in `ricerca/vix/verifica_porting.mjs` il confronto completo su tutta la storia (modello: `ricerca/emergenti/verifica_porting.mjs`);
- `test/pipeline.test.js`: `staleData` con le date del VIX;
- `test/syntax.test.js` prende da solo i file nuovi in `js/`;
- nel browser: `ricerca/qa/browser/v150.cjs` (scheda «8 VIX» e ordine delle 9 schede, tasto 9 apre Alert, `data/vix.json` scaricato solo all'apertura, `#vix` e comando `VIX`, file assente, 1440/1280/820/768/390/360, chiaro e scuro, console senza errori); aggiornare i controlli di `v140.cjs` sull'ordine delle schede (righe 18-20) e su «8 schede su 2 righe» (righe 26-28).

**Testi**:
- `guida.html`: indice (righe 98-99), «Per cominciare» (124), nuova sezione `<section id="vix"><h2>8 VIX</h2>` prima della riga 376 (`#alr`), «9 Alert» (377), tasti `1`–`9` (404) e comando `VIX` nella tabella dei comandi (387-403), fonti in «Dati e aggiornamenti» (418-428), limiti (429-440): VIX dal 1990 al 2003 ricalcolato da Cboe con il metodo di oggi (introdotto nel 2003), chiusura alle 16:15 contro le 16:00, VIX nelle feste USA tolto, sedute senza VIX «—», indici di solo prezzo, campione piccolo per le soglie alte (episodi sopra 50 pochi), dati Cboe via FRED.
- `README.md`: elenco delle viste (inserire «8 VIX» dopo la riga 95, «9 Alert» alla 96), tasti (107), riga 72 («vista 8 Alert» → 9), architettura (passo `fetch_vix.js` dopo la riga 297; limiti di `check_fresh.js` alla 324), sezione Licenza (345-353: valori del VIX © Cboe, via FRED, con la citazione), nota della versione **1.5.0** (funzione nuova: semver minore) con le approssimazioni.
- `js/version.js` e `version.json`: 1.5.0 insieme.
- `docs/sviluppo.md`: moduli (§2), avvio (riga 50), tabella del workflow (63-64), fonti e approssimazioni (73-89), decisioni (§5), stato (§7), proposta C di §8 da aggiornare.
- **Citazione di Rea**: l'idea viene dalle analisi 33 («GARCH contro VIX contro realizzata») e 34 («S&P 500 con il VIX sopra 30») della piattaforma quant-rea, come risulta da `ricerca/quant-rea/catalogo.md:58-59`. Nell'app e nella guida: «Idea dagli studi di Massimo Rea (quant-rea.com), rifatta con dati pubblici: i numeri possono differire». **Non** citare i numeri del fascicolo (μ 2,59/6,83/12,97/22,35%, MAE 1,53…): vengono da materiale riservato di un utente (CLAUDE.md, repository pubblico) e l'utente ha già chiesto di togliere i valori di Rea letti dagli screenshot (decisione del 20/10/2026). Nessun dato preso dalla piattaforma: VIX da Cboe/FRED.

### B.4 Rischi e casi limite

| Rischio | Cosa fare |
|---|---|
| VIX senza seduta NYSE (33 feste dal 2022, 11/06/2004, 09/01/2025) | tolti nella pipeline e registrati in `dropped`; detto nella guida |
| Seduta NYSE senza VIX (1991-03-01, 1997-01-31, 1997-11-26; 1999-12-31 solo su Cboe) | `null`, «—»; il 31/12/1999 da FRED (documentato nel file: `src` per data o elenco) |
| Barre piatte di riempimento di Yahoo | Yahoo solo per la coda provvisoria; scartare le barre con volume 0 e OHLC uguali alla chiusura prima (`dropStale` di `fetchDaily`) |
| Barra di Yahoo ferma a metà seduta (06/02/2026) | coda di Yahoo solo provvisoria, sostituita alla corsa dopo; asterisco nell'app |
| Feste diverse (Cboe aperta, NYSE chiusa) | come sopra; il VIX di «oggi» è sempre quello dell'ultima seduta NYSE |
| VIX alle 16:15, indice alle 16:00 | nota nell'app; rendimenti dalla chiusura del giorno o di quello dopo: **da decidere con l'utente** (regola) |
| Cboe cambia indirizzo o blocca GitHub | ripiego FRED + coda Yahoo; avviso nella corsa; `check_fresh` oltre 4 giorni |
| FRED appeso | `fetchFred` riprova 4 volte con 30 s: con FRED usato solo come controllo, dopo il primo errore non lo si richiede (come `fetch_emerging.js:87-90`) |
| Revisioni di Cboe (anche dopo anni) | storia riscaricata ogni volta; differenze rispetto al file pubblicato negli avvisi |
| `data/vix.json` assente alla prima pubblicazione (la Action lo crea solo di notte) | la scheda resta, la vista dice «dati non ancora disponibili» (come la 1.4.0); `check_fresh` lo salta; test del file saltati |
| File vecchio nella cache del browser | `getJSON(…, false, true)` con `cache: 'no-cache'`, come gli altri file pigri |
| Telefono 360 px | barra 3×3 (B.2); tabella dei regimi con la prima colonna fissa; grafico a larghezza piena con `chartWidth` |
| Pochi episodi alle soglie alte | `n` sempre scritto, «5 su 6» invece della percentuale (come la vista 6); il backtest dice quanti sono |
| VXN 2001-2009 | non pubblicato (A.5) |
| Statistiche nei testi | ogni numero da uno script di `ricerca/vix/` citato; da ricalcolare quando il campione cambia |

### B.5 Stima del lavoro

Sul modello della 1.4.0 (Emergenti: `fetch_emerging.js` ~170 righe, `emerging.js` 134, `emerging-view.js` 371):

| Parte | Righe circa | Tempo |
|---|---:|---|
| `scripts/fetch_vix.js`, workflow, `check_fresh`, test della pipeline | 200 | mezza giornata |
| `js/vix.js` e test (senza GARCH), porting verificato | 150 | mezza giornata |
| `js/vix-view.js`, HTML, CSS, barra a 9 schede | 350 | una giornata |
| Guida, README, sviluppo, versione | — | 2-3 ore |
| Controllo nel browser `v150.cjs` e controlli indipendenti prima di pubblicare | 150 | mezza giornata |
| GARCH nella pipeline (solo se l'utente lo vuole) | 120 | mezza giornata in più |
| Colonna «VIX» negli episodi delle viste 4 e 6 (secondo passo) | 60 | 2-3 ore |

Totale: circa **2,5-3 giornate** di lavoro con i controlli, più mezza giornata per il GARCH. Prima di tutto: una corsa di prova di `fetch_vix.js` dalla Action (raggiungibilità di Cboe da GitHub).

---

## C. Incongruenze notate nei documenti

1. **GARCH**: `docs/sviluppo.md:198` e `ricerca/quant-rea/rapporto.md:133` mettono il GARCH tra le cose «da non fare» (nella verifica il VIX prevede meglio del GARCH la volatilità dei 21 giorni dopo, e il GARCH «vince» solo contro la realizzata passata, `rapporto.md:78`); il punto 3 dell'idea lo ripropone. Da chiarire con l'utente prima del codice.
2. **Proposta C** (`docs/sviluppo.md:192`): «VIX per episodi nella vista Alert», con `data/vix.json` dal 1990; ora l'idea è una scheda: aggiornare la tabella dopo la decisione.
3. **Numeri delle viste rimasti vecchi dopo la 1.4.1** (non sono note storiche): `css/style.css:824` («vista 8 Emergenti»), `config/emerging.json:2` (`_note`: «Vista 8 Emergenti»), `.github/workflows/update-data.yml:74` («vista 8 Emergenti»), `docs/sviluppo.md:141` (tabella delle decisioni: «Vista 8 Emergenti»).
4. `README.md:164` (nota della 1.4.0): «sezione "8 Emergenti" qui sopra», ma la sezione ora si chiama «7 Emergenti» (le note storiche possono tenere i numeri di allora, il rimando a una sezione no).
5. `README.md:324` elenca i limiti di `check_fresh.js` senza quelli degli Emergenti (che sono alla riga 297): con il VIX conviene un elenco solo.
6. `README.md:72` «in sintesi nella vista 8 Alert»: giusto oggi, diventa 9 con il VIX (da aggiornare insieme).
7. `js/calendar.js` (`holidays`) conta il Martin Luther King Day anche prima del 1998, quando la NYSE era aperta: innocuo per l'app (usa solo gli anni recenti), sbagliato per chi lo usa sulla storia (qui le sedute vengono da `^GSPC`).
8. A 360-375 px le prime quattro schede vanno già oggi su due righe (barra di 84 px): non è tra i rilievi aperti di `docs/sviluppo.md` §7, che cita solo la testata del tablet a 820 px.
9. Per gli altri agenti: le cache `ricerca/vix/cache/VIXCLS.json` e `VXNCLS.json` vengono dall'indirizzo di FRED senza `cosd`, servito da una cache di un giorno prima (finiscono al 04/11/2026); `VXNCLS` nel 2001-2003 non concorda con `^VXN` (A.5); FRED `NASDAQ100` ha errori nel 2003-2005 (A.6).
