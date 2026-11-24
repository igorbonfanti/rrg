# SOXX: breadth a 200 sedute dei semiconduttori con un livello blu (ricerca dell'11/11/2026)

Idea dell'utente, da Massimo Rea (quant-rea, analisi «Analisi SOXX: Above/Below 200 MA & Drawdown», livello scelto 3%): aggiungere la breadth a 200 sedute dei membri del SOXX (iShares Semiconductor ETF) con un livello blu. **Fase di ricerca: nessuna modifica all'app.** Dalla piattaforma quant-rea non si è estratto nulla: il livello 3% e l'idea si citano soltanto. Nessuno scraping di TradingView o StockCharts.

## Criteri decisi prima

- La breadth ricostruita è utilizzabile se copre almeno dal 2008, con almeno 15 membri nelle crisi principali, e se il bias dei sopravvissuti (membri di oggi) è quantificabile e dichiarabile.
- Il livello 3% ha senso se nel campione dà almeno 5 episodi distinti.

## Verdetto: procedere con modifiche

Tutti e due i criteri sono soddisfatti:
- breadth dal 01/08/2001, con 21 membri nel 2001-2002, 22 nel 2008, 24-25 tra il 2011 e il 2022, 28 nel 2025;
- bias misurato con le fotografie storiche del SOX: in media da −0,7 a +4,9 punti, vicino ai minimi da −2 a +3, con le stesse zone blu al 3%;
- il livello 3% dà 7 zone blu dal 2002, in 6 crisi distinte.

Le modifiche e le scelte da fare con l'utente sono in fondo, alla sezione «Cosa decidere».

## Fonti

| Cosa | Fonte | Esito |
|---|---|---|
| Membri di oggi | CSV delle holdings iShares: https://www.ishares.com/us/products/239705/x/latest-holdings.csv (stesso tipo di file che l'app usa per IWM, EEM ed EWT, letto con `parseIShares` dell'app) | 30 azioni al 10/11/2026 (`membri_oggi.json`) |
| Indice seguito | pagina del fondo su ishares.com: oggi «NYSE Semiconductor Index»; Wikipedia (pagina del SOX, versione 618085128, con la fonte etfdailynews.com del 12/10/2010) e una ricerca web: fino all'ottobre 2010 il fondo era IGW e seguiva l'S&P North American Technology-Semiconductors Index, poi il PHLX SOX fino al 21/06/2021 | date da una sola fonte secondaria: da confermare con il prospetto |
| Storia della composizione | versioni storiche della pagina Wikipedia «PHLX Semiconductor Sector» (CC BY-SA), elenchi con la data scritta nella pagina: 2005 (19 titoli), 20/06/2010, 21/07/2014, 20/11/2020, 20/01/2023, 20/09/2024 (`composizioni.json`, con i link alle versioni) | sono fotografie del **SOX**, non dell'indice del SOXX prima del 2010 e dopo il 2021; possono essere in ritardo sui ribilanciamenti; servono solo a misurare il bias |
| Prezzi dei membri, del SOXX e di ^SOX | Yahoo, endpoint chart (`fetchDaily` di `scripts/lib/yahoo.js`) dal 1990 | completi (vedi «Prezzi») |
| Seconda fonte per il prezzo del SOXX | API storica di nasdaq.com (`api.nasdaq.com/api/quote/SOXX/historical`) | 2.513 sedute (10 anni) uguali a Yahoo: scarto massimo 0,07%, nessuna sopra 0,5% |

Fonti provate e non usate:
- **SEC EDGAR** (moduli N-PORT dal 2019, N-Q e N-CSR prima): avrebbero la composizione vera del SOXX trimestre per trimestre. Però www.sec.gov risponde 403 a un client che non dichiara un contatto (email) nello User-Agent: non ho messo dati dell'utente né un contatto inventato. Si può fare se l'utente fornisce il contatto da dichiarare.
- **Nasdaq Global Indexes** (pagina «Weighting» del SOX con il calendario): la storia dei pesi probabilmente richiede un accesso; la prova è stata bloccata e non va ripetuta senza decisione dell'utente.
- **Wayback Machine** (copie delle vecchie holdings iShares): non raggiungibile da questo ambiente (connessione chiusa).
- **ICE/NYSE**: nessuna lista pubblica dei membri trovata.
- **iShares con `asOfDate`**: non funziona più (già in `ricerca/indici/fonti-dati.md`).

## Metodo

Script in `script/`, da lanciare in ordine; i prezzi restano in una cartella cache fuori dal repository:

```
node ricerca/soxx/dati/script/scarica.mjs CACHE      # holdings iShares → membri_oggi.json; prezzi Yahoo in CACHE
node ricerca/soxx/dati/script/analisi.mjs CACHE      # → risultati.json, breadth_soxx.json
python3 -I ricerca/soxx/dati/script/verifica.py CACHE                      # ricalcolo indipendente
python3 -I ricerca/soxx/dati/script/verifica_nasdaq.py CACHE NQ.json       # seconda fonte del prezzo (istruzioni in testa)
```

- **Breadth**: la regola dell'app per gli indici, con le funzioni dell'app importate da `scripts/fetch_indices.js`: `clean()` (errori di scala di Yahoo) e `countDay()` (conteggi). È la stessa regola di `breadth_for()` in `scripts/backfill_indices.py`:
  - chiusura rettificata per gli split, non per i dividendi;
  - un titolo è «sopra» se ha almeno 200 sedute e chiude sopra la sua media a 200;
  - il denominatore conta i titoli con l'ultima seduta entro 5 giorni, anche quelli con meno di 200 sedute, che contano «sotto».
- **Composizione**: i membri di oggi su tutta la storia, come gli indici «membri di oggi» dell'app. Inizio con la regola degli indici con limiti: mese dopo la prima seduta in cui almeno il 60% dei membri di oggi ha 200 sedute (13/07/2001), quindi dal **01/08/2001**.
- **Macchina a stati**: `runMachine()` di `js/signals.js` con i parametri di `config/thresholds.json`, livelli 3, 5 e 10%. Tre varianti di prezzo:
  - principale: chiusura del SOXX **rettificata per i dividendi**, come gli ETF dei settori;
  - SOXX solo prezzo;
  - indice ^SOX (solo prezzo, dal 1994), come gli indici dell'app, con il percentile del drawdown su una storia più lunga.
- **Rendimenti**: SOXX rettificato, dalla chiusura del giorno del segnale (regola attuale dell'app), a 21/63/126/252 sedute. Termine di paragone: tutte le sedute dalla prima con uno stato (`signalContext` dell'app). Peggior calo: `worstWithin` dell'app.
- **Niente dati del futuro**:
  - il percentile del drawdown è quello dell'app (solo sedute precedenti, dopo 252 sedute: dal 19/07/2002);
  - il 3° percentile della breadth è calcolato anche a finestra crescente;
  - i livelli 3/5/10% sono fissi; il 3% è la scelta di Rea, fatta conoscendo la storia: è un numero «nel campione».
- **Ricalcolo indipendente** (`verifica.py`, senza i moduli dell'app e senza `clean()`):
  - conteggi della breadth: 0 sedute diverse su 6.357;
  - sedute sotto i livelli e rendimenti dei 7 episodi al 3%: uguali;
  - mediane della base: uguali (12 mesi: 20,1 contro 20,0, per l'arrotondamento dei singoli valori);
  - drawdown di oggi: uguale.

## Risultati

### 1. Composizione e bias dei membri di oggi

30 azioni al 10/11/2026: AMD, AVGO, NVDA, MU, INTC, TXN, ADI, QCOM, MPWR, KLAC, NXPI, AMAT, TSM, LRCX, MRVL, SKHY, TER, MCHP, ALAB, ON, ASML, CRDO, ENTG, MTSI, TSEM, ASX, CBRS, UMC, STM, ARM. I simboli Yahoo coincidono con quelli di iShares (nessuna classe di azioni; gli ADR hanno il simbolo americano). Esiste solo la lista di oggi: iShares non dà più le holdings passate.

Membri di oggi che hanno prezzi a una data (gli altri non erano quotati: IPO, spin-off o ADR nuovi):

| Data | Con prezzi | Con 200 sedute | Mancano (prima seduta su Yahoo) |
|---|---|---|---|
| 13/07/2001 | 21 su 30 | 20 | AVGO 2009, MPWR 2004, NXPI 2010, MTSI 2012, CRDO 2022, ARM 2023, ALAB 2024, CBRS 05/2026, SKHY 07/2026 |
| 02/01/2008 | 22 | 22 | AVGO, NXPI, MTSI, CRDO, ARM, ALAB, CBRS, SKHY |
| 02/01/2015 | 25 | 25 | CRDO, ARM, ALAB, CBRS, SKHY |
| 02/01/2020 | 25 | 25 | come sopra |
| 13/10/2022 | 26 | 25 | ARM, ALAB, CBRS, SKHY |
| 08/04/2025 | 28 | 28 | CBRS, SKHY |

Oggi SKHY (ADR di SK Hynix, 87 sedute) e CBRS (125 sedute) non hanno 200 sedute: con la regola dell'app contano «sotto», per cui oggi la breadth arriva al massimo a 28 su 30. A 0 titoli sopra la media non cambia nulla.

Confronto con le fotografie del SOX su Wikipedia. Per ogni fotografia: breadth dei membri di oggi meno quella dei membri della fotografia che hanno prezzi su Yahoo, nelle sedute fino alla fotografia successiva.

| Fotografia | Con prezzi | Scarto medio | Mediano | Da … a | Scarto medio con breadth della fotografia < 20% | Sedute ≤ 3%: oggi / fotografia |
|---|---|---|---|---|---|---|
| 2005 (19 titoli) → 06/2010 | 11 su 19 | +2,6 | 0,0 | −20,9 … +22,7 | +3,0 (368 sedute) | 139 / 162 |
| 20/06/2010 → 07/2014 | 18 su 30 | +2,0 | +1,6 | −20,4 … +24,9 | +1,3 (146) | 19 / 19 |
| 21/07/2014 → 11/2020 | 19 su 30 | −0,7 | −0,4 | −17,5 … +12,4 | −0,1 (147) | 4 / 4 |
| 20/11/2020 → 01/2023 | 25 su 30 | +2,6 | +3,4 | −8,0 … +12,0 | +3,0 (144) | 5 / 32 |
| 20/01/2023 → 09/2024 | 28 su 30 | +4,9 | +4,9 | −4,9 … +14,3 | — | 0 / 0 |
| 20/09/2024 → 10/11/2026 | 28 su 30 | +3,7 | +3,6 | −10,7 … +17,9 | −2,0 (52) | 20 / 13 |

- Il bias va nella stessa direzione e ha lo stesso ordine di grandezza della prova sul Nasdaq-100 già nel README (+3,6 in media, +1,1 vicino ai minimi).
- Questa misura sottostima il bias: le fotografie hanno anche loro solo i titoli sopravvissuti (8 su 19 del 2005 e 12 su 30 del 2010 non hanno prezzi utilizzabili su Yahoo, perché usciti dal listino o con il simbolo riusato: Altera, Linear, Xilinx, Maxim, National Semiconductor, Novellus, Broadcom Corp., Freescale, SanDisk, Cree prima della ristrutturazione e altri).
- Serie «a fotografie» dal 30/11/2005 (ogni seduta con l'ultima fotografia), macchina al 3%: **6 zone blu in tutte e due le serie, nelle stesse crisi** (2008 gennaio, 2008 settembre, 2011, 2015, 2022, 2025). Cambiano due date di ingresso: 2022 il 14/06 invece del 12/10, 2025 il 04/04 invece del 27/03. Al 5% e al 10% la serie a fotografie ha meno zone blu: 6 contro 8 e 7 contro 10. Nel 2005-2010 la serie a fotografie ha solo 11 titoli.

### 2. Prezzi

- **Membri di oggi**:
  - nessuna seduta mancante rispetto al calendario del SOXX tra la prima e l'ultima seduta di ciascuno;
  - nessuna correzione di `clean()`;
  - frazionamenti già rettificati da Yahoo; nessun delisting tra i membri di oggi.
- **SOXX**:
  - su Yahoo dal 13/07/2001, 6.370 sedute;
  - stesso calendario di ^SOX, nessun salto oltre il 25% nella chiusura solo prezzo (il frazionamento del 2024 è rettificato);
  - la rettificata vale 0,82 volte il solo prezzo nella prima seduta (dividendi);
  - seconda fonte Nasdaq: uguale (vedi Fonti).
- **Fotografie Wikipedia**: 13 simboli non sono su Yahoo (404). 6 sono riusati da altre società o hanno una storia ricominciata (ARMH, ATHR, NETL, SNDK, WOLF dopo la ristrutturazione del 2025, QRVO con una sola seduta) e si scartano con la regola dell'app (prezzi che partono più di 10 giorni dopo la data della lista). SUNE (SunEdison) è riusato con una storia dal 1990 senza senso (7 milioni di dollari nel 2005) e si scarta a mano.

### 3. Breadth

- Oggi (10/11/2026): **7 su 30, 23,3%**. Il 05/11/2026 era a 3,3% (1 su 30), il 30/10 a 36,7%; il SOXX ha perso il 12% il 05/11.
- Granularità: con 21-30 titoli, **il 3% vuol dire 0 titoli sopra la media 200** (le sedute ≤ 3% sono tutte sedute a 0: 260 su 260), il 5% al massimo 1 titolo, il 10% 2 o 3 titoli. Il trigger chiede almeno max(livello + 5 punti, minimo + 2 titoli): con 30 titoli, 3 titoli sopra la media.
- **Sedute a 0**: 260 su 6.357 (4,09%); dal 2008 185 su 4.745 (3,90%). Sedute ≤ 5%: 7,00%; ≤ 10%: 12,25%.
- 3° percentile della breadth: 0 su tutta la storia, e 0 anche a finestra crescente dal primo anno. Un livello «3° percentile» come quello dell'app per gli indici senza livello di Rea darebbe quindi lo stesso livello del 3%.
- Sedute a 0 per anno: 2001 12, 2002 61, 2006 2, 2008 88, 2009 49, 2011 19, 2015 2, 2018 1, 2019 1, 2022 5, 2025 20.

Confronto qualitativo con lo screenshot di Rea (nessun dato estratto da quant-rea): lo screenshot tocca circa 0% nel 2002-2003, nel 2008, a fine 2018, nel 2022 e nell'aprile 2025. La nostra serie è a 0 in tutti questi periodi:
- 2002: dal 19/07 al 14/10/2002;
- 2008-2009;
- 24/12/2018, una seduta, più il 03/01/2019;
- 2022: 5 sedute, dall'11 al 17/10;
- marzo-aprile 2025: 20 sedute, dal 06/03 al 23/04.

È a 0 anche nel 2001, a luglio 2006, ad agosto 2011 e il 24-25/08/2015. Senza l'immagine non si può dire se lo sono anche nel grafico di Rea. Nel 2020 la nostra serie si ferma al 4% (1 titolo su 25): niente zona blu al 3%.

Minimo della breadth nelle crisi (membri di oggi):

| Crisi | Minimo | Data | Titoli (con 200 sedute) | Sedute a 0 | ≤ 5% | ≤ 10% | Minimo del SOXX | Drawdown |
|---|---|---|---|---|---|---|---|---|
| 2001-2003 | 0% | 19/09/2001 | 21 (21) | 73 | 125 | 196 | 09/10/2002 | −65,9% |
| 2008-2009 | 0% | 29/09/2008 | 22 (22) | 115 | 125 | 139 | 20/11/2008 | −62,0% |
| ago 2011 | 0% | 04/08/2011 | 24 (24) | 19 | 33 | 48 | 19/08/2011 | −30,5% |
| 2015-2016 | 0% | 24/08/2015 | 25 (25) | 2 | 7 | 23 | 25/08/2015 | −24,6% |
| fine 2018 | 0% | 24/12/2018 | 25 (25) | 2 | 24 | 67 | 24/12/2018 | −25,3% |
| Covid 2020 | 4% | 16/03/2020 | 25 (25) | 0 | 1 | 8 | 20/03/2020 | −34,3% |
| 2022 | 0% | 11/10/2022 | 26 (25) | 5 | 48 | 93 | 14/10/2022 | −45,8% |
| apr 2025 | 0% | 06/03/2025 | 28 (28) | 20 | 29 | 33 | 08/04/2025 | −41,4% |

Note alla tabella:
- conteggi nelle finestre della tabella in `risultati.json` (`crisi`);
- la finestra 2008-2009 parte dal 01/09/2008;
- le 22 sedute a 0 di gennaio 2008 sono un episodio a parte.

### 4. Backtest del livello blu (macchina dell'app, SOXX rettificato, stati dal 19/07/2002)

| Livello | Zone blu | Crisi distinte | Trigger (falliti) | 3M dalla zona blu | 12M dalla zona blu | 3M dal 1° trigger | 12M dal 1° trigger | Peggior calo 252 s dalla zona blu | dal 1° trigger |
|---|---|---|---|---|---|---|---|---|---|
| 3% | 7 | 6 | 7 (0) | +10,6% (4 su 7 positivi) | +12,9% (6 su 7) | +11,7% (6 su 7) | +39,9% (6 su 7) | −20,4% | −5,9% |
| 5% | 9 | 8 | 11 (2) | +10,6% (5 su 9) | +33,7% (8 su 9) | +6,6% (8 su 9) | +29,0% (8 su 9) | −18,6% | −6,6% |
| 10% | 12 (1 in corso) | 11 | 14 (3) | +9,8% (7 su 11) | +33,7% (10 su 11) | +4,3% (7 su 11) | +33,8% (9 su 11) | −6,8% | −7,8% |
| Seduta qualsiasi | — | — | — | +5,5% (4.063 su 6.055) | +20,0% | | | −11,2% | |

Note alla tabella:
- valori mediani;
- l'1M dalla zona blu è negativo a tutti i livelli (−3,8 / −3,0 / −3,0, contro +1,9 di una seduta qualsiasi): la zona blu arriva in anticipo sul minimo;
- l'1M dal trigger al 3% è +3,4 (5 su 7).

Episodi al 3%:

| Zona blu | Trigger | 1M / 3M / 6M / 12M dalla zona blu | Peggior calo 252 s | 1M / 3M / 6M / 12M dal trigger | Peggior calo 252 s dal trigger |
|---|---|---|---|---|---|
| 22/07/2002 | 24/02/2003 | −5,5 / −27,6 / −23,3 / +5,7 | −42,8 | +9,2 / +17,9 / +55,5 / +80,8 | −5,2 |
| 08/01/2008 | 26/02/2008 | −3,8 / 0,0 / −9,2 / −41,8 | −54,8 | −5,2 / +8,7 / −5,1 / −46,8 | −55,3 |
| 30/09/2008 | 26/03/2009 | −22,1 / −30,1 / −21,2 / +11,8 | −42,3 | +3,4 / +11,7 / +34,8 / +50,2 | −5,9 |
| 05/08/2011 | 16/09/2011 | −3,0 / +10,6 / +21,1 / +12,9 | −6,8 | −3,0 / −8,0 / +15,5 / +6,7 | −14,5 |
| 25/08/2015 | 08/09/2015 | +5,4 / +17,8 / +11,5 / +43,8 | 0,0 | +1,0 / +10,1 / +3,7 / +29,8 | −9,9 |
| 12/10/2022 | 08/11/2022 | +21,1 / +27,3 / +40,4 / +59,0 | −1,4 | +10,0 / +23,9 / +20,3 / +39,9 | −3,2 |
| 27/03/2025 | 02/05/2025 | −5,2 / +23,0 / +38,8 / +60,2 | −20,4 | +12,4 / +26,8 / +62,0 / +155,7 | −1,7 |

- Il caso negativo è quello noto dei mercati orso lunghi: gennaio 2008, con il trigger di febbraio 2008 a −46,8% dopo 12 mesi. Il segnale non è «fallito» per la regola dell'app perché la breadth è tornata sopra il riarmo prima del crollo di settembre (fino al 59,1% tra febbraio e settembre 2008).
- Al 5% si aggiungono luglio 2006 e novembre 2018 (con un trigger fallito a dicembre 2018); al 10% anche settembre 2004, marzo 2020 e l'episodio in corso dal 06/11/2026.
- **Varianti di prezzo** (solo prezzo; ^SOX):
  - al 3%: stesse 7 zone blu con il solo prezzo;
  - con ^SOX 8 zone blu: in più il 20/09/2001, perché con la storia dal 1994 il percentile del drawdown esiste già nel 2001; 9 trigger, 1 fallito.
- Pochi casi (7, in 6 crisi), livello scelto con il senno di poi: tutte le percentuali sono indicative.

### 5. Drawdown

- Al 10/11/2026, dal massimo a 52 settimane:
  - SOXX rettificato −32,8%, 91° percentile (storia dal 2001, percentile dell'app dal 19/07/2002);
  - SOXX solo prezzo −32,9%, 91° percentile;
  - ^SOX −31,7%, 84° percentile, con la storia dal 1994.
- Ricalcolo indipendente: −32,8%, con il 90,9% delle sedute precedenti meno profonde.
- Su tutta la storia del SOXX il 70° percentile del drawdown è −15,7% e l'85° è −25,3% (solo informativo: l'app usa il percentile fino a quel giorno). Peggior drawdown −65,9% il 09/10/2002.
- Stato di oggi con la macchina:
  - al 3%: **Attenzione** (drawdown oltre l'85° percentile; breadth a 23,3%);
  - al 5%: Attenzione (una sola chiusura ≤ 5%, il 05/11);
  - al 10%: **Zona blu dal 06/11/2026**.

## Limiti

- **Composizione di oggi**: 9 membri su 30 non esistevano nel 2001, 8 nel 2008, 5 nel 2015-2020. Il bias misurato è di +2/+5 punti in media e di −2/+3 vicino ai minimi, ma la misura usa fotografie del SOX con i soli sopravvissuti. La composizione vera del SOXX (EDGAR) non è stata raggiunta.
- **Indice cambiato**:
  - fino al 2010: S&P North American Technology-Semiconductors;
  - 2010-2021: PHLX SOX;
  - dal 2021: NYSE Semiconductor Index.
  La breadth è sempre quella dei membri di oggi del fondo, non dell'indice di allora.
- **Granularità**: con 21-30 titoli un titolo vale 3,3-4,8 punti, il 3% è «nessun titolo sopra la media» e la breadth salta di molti punti in pochi giorni (dal 56,7% al 3,3% tra il 29/10 e il 05/11/2026).
- **ADR nuovi**: SK Hynix (ADR dal 10/07/2026) conta «sotto» fino a circa aprile 2027, CBRS fino a circa marzo 2027 (regola dell'app). La storia di Seul (000660.KS) è stata scaricata ma non usata: usarla cambierebbe la regola.
- **Livello col senno di poi**: il 3% è scelto da Rea guardando questa storia; 7 episodi in 6 crisi sono pochi.
- **Le fotografie Wikipedia** sono una fonte secondaria, con date dichiarate nella pagina ma forse in ritardo sui ribilanciamenti; la lista del 2005 non ha data (si usa quella della versione).

## Cosa decidere con l'utente (prima di qualsiasi codice)

1. **Dove**: come indice della vista 6 «con limiti» (membri di oggi, CSV iShares come IWM/EEM/EWT, voce in `scripts/lib/members.js` con 25-35 titoli) è la via più corta e riusa tutta la pipeline.
2. **Prezzo**:
   - ETF SOXX solo prezzo, come EEM e XIU: stesse 7 zone blu al 3%;
   - oppure ^SOX, per avere il percentile del drawdown dal 1994: 8 zone blu, con settembre 2001.
3. **Livello**: 3% (Rea, `blueSource: "Rea"`), da spiegare come «nessun titolo sopra la media a 200 sedute» con 21-30 titoli. Il 5% dà 9 zone blu in 8 crisi.
4. **Testi da dichiarare nell'app**:
   - membri di oggi, con il bias misurato qui;
   - indice cambiato nel 2010 e nel 2021;
   - ADR e IPO recenti che contano «sotto» per 200 sedute;
   - livello scelto col senno di poi.
5. **Facoltativo**: se l'utente vuole la composizione vera, ricostruirla dalle N-PORT/N-Q della SEC, con un contatto da dichiarare che deve dare l'utente.

## File

- `composizioni.json`: fotografie Wikipedia del SOX con i simboli Yahoo e le scelte fatte.
- `membri_oggi.json`: lista iShares del 10/11/2026 (simbolo, nome, paese, borsa; senza pesi).
- `risultati.json`: tutti i numeri di questa nota.
- `breadth_soxx.json`: conteggi giornalieri (membri, quotati, con 200 sedute, sopra la media a 20/50/200) dal 13/07/2001; nessun prezzo.
- `script/`: `scarica.mjs`, `analisi.mjs`, `verifica.py` (ricalcolo indipendente), `verifica_nasdaq.py` (seconda fonte del prezzo).
