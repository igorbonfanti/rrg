# F1 · Ricostruzione storica e validazione degli indici di fase 1

15/10/2026. Nessuna modifica all'app: i file nuovi non sono ancora letti da nessuna pagina.

## In breve

- **Dati.** La breadth a 200 sedute è ricostruita per 8 indici nuovi più l'S&P 500, che c'era già:
  - Nasdaq-100 dal 2008 e Dow Jones dal 1993, con i membri di ogni data;
  - Nikkei 225, FTSE 100, DAX, CAC 40 e SMI dal 2001, STOXX Europe 600 dal 2006, con i membri di oggi.
- **Livelli.** La regola del 3° percentile ritrova i livelli di Rea su S&P 500, Nikkei, CAC e SMI (scarto di 1-3 punti). Su Nasdaq-100, Dow e DAX i livelli di Rea sono più larghi: lasciano sotto il 5-6% delle sedute invece del 3%.
  - Proposta: livelli di Rea dove ci sono; 3° percentile per STOXX 600 (9%) e FTSE 100 (12%).
- **Segnali.** Con la stessa macchina a stati dei settori, senza cambiare nessun parametro, i trigger sono 53 (10 dei quali sul Dow).
  - **Dal 2005:** 42 trigger, rendimento a 1 anno medio +10,8% e mediano +15,9%, 30 positivi su 42.
  - **Nel 2001-2004:** 11 trigger, medio −4,9%, 3 positivi su 11.
  - **Tutti i 53:** medio +7,5%, contro +7,4% di un giorno qualsiasi. In media il segnale non batte il mercato.
- **Il punto debole è uno solo:** i rimbalzi dentro un mercato orso lungo, cioè 2001-2002 e la prima metà del 2008. Quei 19 trigger perdono in media il 23% in un anno. Gli altri 34 guadagnano in media il 24,6%, e 32 su 34 sono positivi.
  - Con una data di riferimento per ogni episodio i casi non sono indipendenti: un solo evento (per esempio il marzo 2020) compare in tutti gli indici.
- **USA contro Europa.** Gli indici USA vanno meglio: Nasdaq-100 5 su 5 positivi, S&P 500 4 su 4. FTSE 100, CAC 40 e SMI fanno peggio, perché hanno più episodi nel 2001-2002 e nel 2008.

## 1. Cosa è stato fatto

| File | Contenuto |
|---|---|
| `config/indices.json` | indici, simbolo del prezzo, composizione, livello blu e fonte del livello |
| `config/index_history.json` | composizioni di epoca: Dow dal 6/5/1991, ricostruito a mano dai cambi di Wikipedia; Nasdaq-100 dal 2007, da n100tickers, con la mappa dei ticker rinominati e l'elenco di quelli riusati da altre società |
| `data/index_members/*.json` | liste dei membri di oggi (8 indici) |
| `scripts/backfill_indices.py` | ricostruzione: `ndx-history`, `prices` (1.156 simboli Yahoo in 2 minuti), `build` (40 secondi) |
| `data/index_breadth.json` | conteggi dei titoli sopra la media a 20, 50 e 200 sedute, stesso formato di `breadth.json` |
| `data/indices.json` | chiusure degli indici dal 2000 (solo prezzo, valuta locale) |
| `ricerca/indici/script/valida.mjs` | validazione con `js/signals.js` così com'è |
| `ricerca/indici/grafici/*.png` | grafici nello stile di Rea |

**Metodo.** È lo stesso della breadth dei settori:
- chiusure rettificate per gli split, non per i dividendi;
- un titolo è «sopra» se ha almeno 200 sedute e chiude sopra la sua media;
- il denominatore conta i titoli quotati quel giorno.

Due aggiunte, necessarie per le borse fuori dagli USA:
- **Calendari diversi.** Un titolo conta con la sua ultima seduta se è al massimo di 5 giorni prima. Serve per lo STOXX 600, che mette insieme 17 borse con festività diverse.
- **Errori di scala di Yahoo.** In 36 titoli ci sono pence e sterline scambiati, tratti moltiplicati per 10 o per 100, o split non rettificati (per esempio ULVR.L, BA.L, ROSE.L, PCT.L, COLO-B.CO, LOGN.SW, KDP).
  - Se il salto rientra entro 60 sedute, il tratto si scarta.
  - Se il salto resta, la storia precedente si riporta alla scala nuova.
  - Per le medie si usano solo i 2 anni prima dell'inizio della breadth: prima del 1999 i dati di Londra sono inservibili.

**Copertura** (titoli con prezzi su Yahoo / membri):

| Indice | Membri | Breadth dal | Copertura all'inizio | Copertura oggi |
|---|---|---|---|---|
| S&P 500 | di epoca | 2005 | 64% | 100% |
| Nasdaq-100 | di epoca | 2008 | 59% | 100% |
| Dow Jones | di epoca | 1993 | 67% (87% nel 2000, 97% dal 2005) | 100% |
| Nikkei 225 | di oggi | 2001 | 84% | 100% |
| STOXX Europe 600 | di oggi | 2006 | 74% | 100% |
| FTSE 100 | di oggi | 2001 | 72% | 100% |
| DAX | di oggi | 2001 | 70% | 100% |
| CAC 40 | di oggi | 2001 | 78% | 100% |
| SMI | di oggi | 2001 | 70% (80% fino al 2021) | 100% |

**Note sui dati.**
- **Dow.** Mancano 11 membri nel 1993 (AT&T Corp, Kodak, GM, Sears, Bethlehem, Texaco, Union Carbide, Westinghouse, Woolworth, J.P. Morgan & Co, oltre a Walgreens nel 2018-2024). Alcoa prima del 2016 c'è, sotto AA.
- **Nasdaq-100.** 70 ex membri non sono più su Yahoo (per esempio Celgene, Xilinx, Activision, Yahoo). EA e Warner Bros. Discovery sono state comprate quest'anno e la loro storia è sparita da Yahoo.
- **Membri di oggi.** La storia degli indici costruiti così è di 3-6 punti troppo alta nelle fasi intermedie, quasi corretta vicino ai minimi.
- **Spin-off.** Yahoo non rettifica gli spin-off (per esempio Altria nel 2008): il titolo risulta sotto la media per qualche mese. Succede anche nella breadth dei settori.

## 2. Livelli

Le colonne degli anni sono i minimi della breadth a 200 sedute in ogni crisi.

| Indice | Livello Rea | 3° percentile | Sedute sotto il livello usato | 2002 | 2008-09 | 2011 | 2015-16 | 2018 | 2020 | 2022 | 2025 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S&P 500 | 13 | 13,3 | 3% (liv. 13) | – | 0,8 | 7,3 | 16,3 | 9,4 | 3 | 10,3 | 17,6 |
| Nasdaq-100 | 18 | 11,5 | 5,5% (liv. 18) | – | 0 | 13,6 | 15,2 | 6,5 | 7,6 | 5,2 | 16,3 |
| Dow Jones | 15 | 10 | 5,7% (liv. 15) | 0 | 0 | 10 | 6,7 | 20,7 | 0 | 6,9 | 16,7 |
| Nikkei 225 | 8 | 9,5 | 2,4% (liv. 8) | 6,8 | 0 | 10,4 | 3,7 | 5,4 | 0,9 | 32,9 | 10,2 |
| STOXX Europe 600 | – | 9,1 | 3% (liv. 9) | – | 0,8 | 3,9 | 14,2 | 13,7 | 3 | 11,2 | 27,1 |
| FTSE 100 | – | 11,6 | 3,7% (liv. 12) | 2,6 | 1,2 | 6,9 | 17,6 | 12,8 | 0 | 13,3 | 21,2 |
| DAX | 7 | 3,3 | 4,9% (liv. 7) | 0 | 0 | 0 | 5,4 | 5,3 | 2,6 | 12,5 | 40 |
| CAC 40 | 4 | 5,1 | 2,8% (liv. 4) | 0 | 0 | 2,6 | 5,1 | 2,6 | 0 | 2,6 | 30 |
| SMI | 3 | 0 | 3,5% (liv. 3) | 0 | 0 | 0 | 12,5 | 18,8 | 0 | 0 | 10,5 |

**Perché Nasdaq-100 e Dow differiscono da Rea.** È probabile che la differenza venga dalla storia: quella di Rea parte dal 1985, la nostra dal 2008 (Nasdaq-100) e la regola del 3% guarda solo agli anni che abbiamo. Il bear market del 2000-2002 del Nasdaq ha avuto la breadth bassa per molto tempo, e una storia che lo contiene alza il 3° percentile. Anche per questo, dove c'è il livello di Rea lo teniamo.

**Sensibilità.** Spostando i livelli di 2-5 punti cambiano parecchio sia il numero dei trigger sia il risultato:
- Dow a 10: 8 trigger, tutti positivi; a 15: 10 trigger, 7 positivi.
- DAX a 3: 4 su 4 positivi; a 7: 3 su 7.
- STOXX 600 a 7: 3 su 3 positivi; a 11: 2 su 3.

I campioni sono piccoli e la scelta «migliore» sarebbe fatta guardando i risultati. Per questo non ho ritoccato i livelli: valgono quelli decisi prima di vedere i numeri (Rea, altrimenti il 3° percentile).

## 3. Episodi

La macchina a stati è quella dei settori, con i parametri attuali e il livello del §2:
- **percentile del drawdown:** calcolato sul prezzo dal 2000, quindi non ci sono segnali prima del 2001;
- **rendimenti:** solo prezzo, dalla chiusura del trigger;
- **«Calo peggiore»:** il minimo entro 63 sedute dal trigger.

### Riepilogo

| Indice | Trigger | 3 mesi | 6 mesi | 12 mesi | Base 12 mesi (giorno qualsiasi) | Positivi a 12 mesi | Calo peggiore medio |
|---|---|---|---|---|---|---|---|
| S&P 500 | 4 | +3,3 | +12,7 | +24,8 | +10,3 | 4/4 | −6,6 |
| Nasdaq-100 | 5 | +11,3 | +21,2 | +41,6 | +18,7 | 5/5 | −4,3 |
| Dow Jones | 10 | +1,1 | +4,2 | +5,8 | +7,2 | 7/10 | −7,0 |
| Nikkei 225 | 5 | +5,1 | +1,9 | +14,1 | +9,3 | 4/5 | −4,7 |
| STOXX Europe 600 | 3 | +2,5 | 0,0 | +2,1 | +4,5 | 2/3 | −6,3 |
| FTSE 100 | 7 | −4,2 | −6,3 | −5,0 | +3,5 | 3/7 | −13,0 |
| DAX | 7 | +5,0 | +5,9 | +3,0 | +8,3 | 3/7 | −8,3 |
| CAC 40 | 5 | +3,0 | −1,4 | −6,9 | +3,7 | 2/5 | −9,3 |
| SMI | 7 | +0,2 | −0,9 | +0,6 | +4,0 | 3/7 | −8,1 |
| **Tutti** | **53** | **+2,6** | **+3,6** | **+7,5** (mediana +13,9) | **+7,4** | **33/53** | |

| Gruppo | Trigger | 12 mesi medio | Positivi |
|---|---|---|---|
| Dal 2005 | 42 | +10,8 (mediana +15,9) | 30/42 |
| 2001-2004 | 11 | −4,9 | 3/11 |
| Rimbalzi nel mercato orso (2001-2002 e gennaio-agosto 2008) | 19 | −23,1 | |
| Tutti gli altri | 34 | +24,6 | 32/34 |
| Ingresso al primo giorno di zona blu, invece che al trigger | 53 | +9,0 (mediana +11,2) | 35/53 |

**Come si confronta con i settori.** Per i settori (`ricerca/verifica-trigger/risultati-2.md`, 2008-2025) il trigger dava +16,3% medio e +18,5% mediano a un anno. Sugli indici dal 2005 il risultato è simile nella mediana (+15,9%) e più basso nella media, per colpa dei rimbalzi di inizio 2008.

**Cosa non ho toccato.** Un filtro contro i rimbalzi nel mercato orso (per esempio sulla media a 200 sedute del prezzo, o una seconda zona blu) andrebbe studiato con lo stesso protocollo usato per i settori: regole decise prima, poi verifica. Non l'ho fatto: cambierebbe le regole, e su questo ci confrontiamo prima.

### Dettaglio

### S&P 500 · livello 13%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 06/10/2008 | 0,8% | −32,5% (100°) | 06/05/2009 | 146 | +2,2 | +9,0 | +13,7 | +22,7 | −4,4 |
| 22/08/2011 | 11,6% | −17,6% (75°) | 29/08/2011 | 5 | −4,9 | −1,4 | +12,9 | +16,5 | −9,2 |
| 12/03/2020 | 3% | −26,7% (94°) | 14/04/2020 | 22 | −0,9 | +12,3 | +24,2 | +44,9 | −3,8 |
| 17/06/2022 | 11% | −23,4% (92°) | 19/07/2022 | 20 | +8,6 | −6,6 | −0,2 | +15,2 | −9,1 |

### Nasdaq-100 · livello 18%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 23/09/2008 | 0% | −26,4% (71°) | 26/03/2009 | 127 | +6,9 | +15,2 | +33,4 | +52,4 | −4,7 |
| 08/02/2016 | 15,2% | −16,1% (73°) | 17/02/2016 | 6 | +4,8 | +2,9 | +14,2 | +26,3 | −1,1 |
| 20/12/2018 | 6,5% | −18,5% (79°) | 08/01/2019 | 11 | +5,4 | +15,5 | +20,6 | +36,0 | −0,2 |
| 17/03/2020 | 8,7% | −23,1% (83°) | 06/04/2020 | 14 | +11,2 | +30,2 | +42,4 | +68,5 | −0,4 |
| 09/05/2022 | 5,2% | −26,5% (85°) | 27/07/2022 | 54 | +4,3 | −7,4 | −4,4 | +25,0 | −15,2 |

### Dow Jones · livello 15%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 17/09/2001 | 7,4% | −21,3% (100°) | 10/10/2001 | 17 | +3,8 | +8,9 | +10,3 | −18,5 | −1,8 |
| 15/07/2002 | 0% | −18,8% (97°) | 04/11/2002 | 79 | +1,9 | −6,8 | −0,1 | +14,8 | −7,3 |
| 05/02/2003 | 0% | −24,9% (97°) | 17/03/2003 | 27 | +3,2 | +14,5 | +16,1 | +25,1 | −1,8 |
| 11/02/2008 | 10,3% | −13,6% (84°) | 03/04/2008 (dopo un fallimento) | 36 | +3,4 | −11,2 | −14,2 | −36,8 | −11,2 |
| 02/07/2008 | 13,8% | −20,8% (95°) | 08/08/2008 | 26 | −4,3 | −25,9 | −29,5 | −20,4 | −30,3 |
| 01/07/2010 | 6,7% | −13,1% (74°) | 09/07/2010 | 5 | +4,9 | +7,4 | +14,7 | +24,1 | −2,1 |
| 09/08/2011 | 10% | −12,3% (74°) | 29/08/2011 | 14 | −4,6 | −0,1 | +12,2 | +13,6 | −7,7 |
| 25/08/2015 | 6,7% | −14,4% (84°) | 16/09/2015 | 15 | +2,4 | +4,7 | +4,4 | +8,8 | −4,4 |
| 12/03/2020 | 0% | −28,3% (96°) | 14/04/2020 | 22 | −2,9 | +11,2 | +20,4 | +40,8 | −3,9 |
| 14/09/2022 | 6,9% | −15,4% (88°) | 21/10/2022 | 27 | +8,4 | +8,5 | +7,9 | +6,6 | 0,0 |

### Nikkei 225 · livello 8%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 17/01/2008 | 2,4% | −24,5% (75°) | 07/04/2008 | 55 | +1,5 | −3,1 | −31,6 | −34,9 | −4,0 |
| 08/10/2008 | 0% | −47,3% (100°) | 06/04/2009 | 118 | +6,7 | +6,4 | +13,8 | +23,2 | −4,1 |
| 21/01/2016 | 3,7% | −23,2% (77°) | 02/03/2016 (dopo un fallimento) | 28 | −3,5 | −1,0 | +1,7 | +17,2 | −6,2 |
| 26/12/2018 | 5,9% | −20,4% (75°) | 15/01/2019 | 9 | +2,8 | +8,1 | +5,2 | +11,8 | −1,1 |
| 13/03/2020 | 0,9% | −27,6% (87°) | 27/03/2020 | 9 | +2,0 | +14,9 | +20,2 | +53,2 | −8,1 |

### STOXX Europe 600 · livello 9%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 22/01/2008 | 5,1% | −21,2% (100°) | 01/04/2008 (dopo un fallimento) | 48 | +2,2 | −11,2 | −19,6 | −41,5 | −11,2 |
| 08/08/2011 | 3,9% | −21,4% (82°) | 10/10/2011 (dopo un fallimento) | 45 | +1,9 | +6,3 | +7,8 | +13,9 | −6,6 |
| 13/03/2020 | 3% | −31,1% (95°) | 07/04/2020 | 17 | +4,0 | +12,3 | +11,9 | +33,9 | −1,1 |

### FTSE 100 · livello 12%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 21/09/2001 | 9,6% | −31,6% (100°) | 09/10/2001 | 12 | +4,1 | +4,4 | +4,4 | −25,3 | −0,1 |
| 16/07/2002 | 2,6% | −28,0% (99°) | 19/08/2002 | 24 | −12,7 | −7,6 | −16,6 | −3,5 | −17,1 |
| 22/01/2008 | 5,9% | −14,7% (77°) | 01/02/2008 | 8 | −3,5 | +3,1 | −11,2 | −31,2 | −10,2 |
| 27/06/2008 | 7% | −17,8% (82°) | 23/07/2008 | 18 | −1,5 | −22,4 | −25,5 | −17,5 | −29,1 |
| 21/10/2008 | 2,3% | −37,1% (100°) | 02/01/2009 | 50 | −10,6 | −13,3 | −7,1 | +18,7 | −23,0 |
| 19/08/2011 | 8% | −17,2% (77°) | 31/08/2011 | 7 | −3,7 | −1,5 | +9,9 | +5,9 | −8,3 |
| 12/03/2020 | 0% | −31,9% (97°) | 20/04/2020 | 25 | +4,4 | +7,7 | +1,8 | +18,0 | −3,0 |

### DAX · livello 7%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 23/03/2001 | 6,9% | −30,1% (100°) | 12/04/2001 | 14 | +2,4 | −1,2 | −23,1 | −12,6 | −3,3 |
| 13/09/2001 | 3,3% | −38,4% (100°) | 04/10/2001 | 15 | +0,8 | +15,1 | +13,7 | −38,1 | −1,7 |
| 16/07/2002 | 0% | −32,1% (93°) | 20/03/2003 | 172 | +13,7 | +24,3 | +36,7 | +46,9 | −6,9 |
| 14/03/2008 | 3,1% | −20,4% (75°) | 01/04/2008 | 10 | +3,4 | −4,5 | −8,1 | −37,5 | −4,5 |
| 30/06/2008 | 0% | −20,8% (76°) | 31/07/2008 | 23 | −0,9 | −25,6 | −33,0 | −17,3 | −33,7 |
| 09/08/2011 | 0% | −21,4% (75°) | 20/09/2011 | 30 | +3,5 | +1,8 | +28,5 | +31,2 | −7,3 |
| 13/03/2020 | 2,6% | −33,0% (92°) | 16/04/2020 | 22 | +7,4 | +25,0 | +26,4 | +48,1 | −0,5 |

### CAC 40 · livello 4%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 13/09/2001 | 2,9% | −37,0% (100°) | 03/10/2001 | 14 | +8,5 | +16,4 | +12,2 | −29,7 | 0,0 |
| 25/07/2002 | 0% | −38,4% (98°) | 09/08/2002 | 11 | −7,2 | −6,8 | −17,7 | −9,3 | −23,0 |
| 23/01/2008 | 0% | −24,8% (80°) | 31/03/2008 (dopo un fallimento) | 46 | +5,7 | −6,6 | −12,6 | −38,9 | −6,6 |
| 09/08/2011 | 2,6% | −23,6% (74°) | 13/10/2011 (dopo un fallimento) | 47 | −1,2 | +0,4 | +2,6 | +6,9 | −11,4 |
| 12/03/2020 | 0% | −33,8% (94°) | 14/04/2020 | 21 | −5,5 | +11,8 | +8,6 | +36,3 | −5,5 |

### SMI · livello 3%

| Zona blu dal | Breadth minima | Drawdown | Trigger | Sedute | 1 mese | 3 mesi | 6 mesi | 12 mesi | Calo peggiore entro 3 mesi |
|---|---|---|---|---|---|---|---|---|---|
| 25/07/2002 | 0% | −29,3% (98°) | 08/08/2002 | 10 | −2,8 | −4,1 | −20,9 | −3,9 | −15,6 |
| 21/01/2008 | 0% | −23,5% (88°) | 01/04/2008 (dopo un fallimento) | 49 | +0,5 | −8,6 | −13,3 | −36,7 | −8,6 |
| 10/10/2008 | 0% | −42,0% (100°) | 02/06/2009 | 158 | +0,7 | +14,3 | +18,2 | +16,4 | −3,6 |
| 03/08/2011 | 0% | −18,4% (73°) | 14/10/2011 | 52 | −1,7 | +4,1 | +5,4 | +15,5 | −7,0 |
| 13/03/2020 | 0% | −25,7% (92°) | 25/03/2020 | 8 | +8,6 | +11,9 | +13,6 | +23,7 | 0,0 |
| 08/03/2022 | 0% | −14,8% (80°) | 16/03/2022 | 6 | +4,8 | −12,2 | −9,7 | −10,0 | −12,2 |
| 17/06/2022 | 0% | −19,4% (86°) | 08/08/2022 | 35 | −3,0 | −4,1 | +0,2 | −0,5 | −9,8 |

Note sugli episodi:
- **S&P 500, dicembre 2018.** La breadth tocca 9,4% il 24/12 per una sola chiusura, e ne servono 2: non c'è zona blu.
- **Aprile 2025.** La breadth resta sopra 13 (minimo 17,6): non c'è segnale. Lo stesso vale per il Nasdaq-100 (minimo 16,3 contro 18).

## 4. Grafici

`ricerca/indici/grafici/<indice>.png`:
- in alto il prezzo in scala logaritmica, colorato per stato: grigio normale, giallo attenzione, blu zona blu, verde trigger, rosso fallito; le linee verticali verdi sono i trigger;
- in basso la breadth a 200 sedute, con il livello blu e la zona sotto il livello colorata; il tratteggio marrone è la copertura.

Da fare con le immagini di Rea davanti: controllare che la breadth tocchi i suoi livelli negli stessi punti. Per Nasdaq-100 e Dow si può controllare anche su TradingView (NDTH, DITH) su qualche data.

## 5. Cosa serve per la F2

- I livelli: confermare Rea più il 3° percentile, oppure cambiarli.
- Per il Dow si possono mostrare due cose diverse:
  - la storia dal 1993, solo come grafico;
  - i segnali dal 2001, come gli altri indici, perché servono le chiusure dal 2000 per il percentile del drawdown.
- I file pesano 1,1 MB ciascuno: nella F2 le date si comprimono e il caricamento avviene solo quando si apre la pagina.
