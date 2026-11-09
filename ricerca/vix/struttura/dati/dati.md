# Struttura a termine e credito: verifica dei dati (fase 1)

Verifica preliminare per due possibili aggiunte alla vista «8 VIX»: **(a)** la struttura a termine della volatilità e **(b)** uno spread di credito. Qui si controllano solo i **dati** (ci sono? sono puliti? le fonti coincidono? quanto pesano?). Se gli indicatori servono lo dice il backtest, che è un lavoro a parte. L'app non è stata toccata.

Dati scaricati il 09/11/2026 alle 09:34 UTC. Ultima seduta dell'S&P 500: venerdì 06/11/2026.

| File | Cosa fa |
|---|---|
| `scarica.mjs` | scarica i file grezzi in `cache/` (ignorata da git) e salva ora, stato HTTP e Last-Modified in `cache/_scaricato.json` |
| `dati.mjs` | tutti i calcoli, con il metodo scritto in testa; scrive `risultati.json` |
| `ricontrollo.py` | ricalcolo indipendente in Python dei numeri chiave (metodo diverso, vedi in fondo); scrive `ricontrollo.json` |

Uso: `node ricerca/vix/struttura/dati/scarica.mjs && node ricerca/vix/struttura/dati/dati.mjs && python3 -I ricerca/vix/struttura/dati/ricontrollo.py`

## Raccomandazione

**Struttura a termine: usare VIX/VIX3M con FRED `VIXCLS` / `VXVCLS`, non VX1/VX2.**
- `VXVCLS` coincide al centesimo con il file ufficiale di Cboe in **4.310 sedute su 4.310**. Nessun valore ≤ 0, nessun valore ripetuto per 3 sedute o più, nessuna seduta dell'S&P 500 senza valore dal 04/12/2007 (manca solo l'ultima, il 06/11, che FRED pubblica il giorno dopo). La serie ha la stessa fonte, la stessa licenza («Citation Required») e lo stesso ritardo del `VIXCLS` che l'app usa già.
- VX1/VX2 dice la stessa cosa (backwardation sì/no) nel **91,1%** delle sedute (4.336 su 4.761). Però costa molto di più: 175 file, uno per contratto, più un archivio vecchio. Ha salti a ogni scadenza: **21 cambi di stato** sono causati dal solo passaggio al contratto successivo. Dal 02/01 al 19/07/2013 il CDN di Cboe non ha i Settle. Aggiungerebbe due serie (circa +62 KB). Il rapporto VX1/VX2 si può citare nella guida come la misura usata dall'analista, con i numeri di concordanza qui sotto.
- Per l'ultima seduta (quella che FRED non ha ancora) conviene il file ufficiale `VIX3M_History.csv` di Cboe, già aggiornato alle 22:31 UTC del giorno stesso, invece di Yahoo `^VIX3M`. Yahoo coincide negli ultimi 60 giorni (44 su 44), ma nella storia ha 12 valori diversi (fino a −1,05 punti il 15/10/2014) e su `^VIX` ha già sbagliato (06/02/2026). È una proposta per chi scrive il codice, da decidere con l'utente.

**Credito: l'HY OAS non si può usare; la serie lunga migliore è BAA10Y, ma prima l'utente deve decidere due cose.**
- **HY OAS (ICE BofA, `BAMLH0A0HYM2`)**: su FRED ci sono solo 3 anni (dal 07/11/2023). Nota di FRED: «Starting in April 2026, this series will only include 3 years of observations. For more data, go to the source.» Anche le vecchie versioni su ALFRED sono tagliate allo stesso inizio (provate quelle del 02/01/2024, 02/06/2025 e 02/03/2026). Soprattutto la licenza è «Copyrighted: Pre-Approval Required» e ICE scrive: «you are not authorized or permitted to publish, distribute or otherwise furnish Top Level Data to any third-party without prior written approval of ICE Data». In un'app pubblica non si può mettere. Vale lo stesso per l'IG OAS (`BAMLC0A0CM`).
- **BAA10Y** (Moody's Baa meno Treasury 10 anni, FRED, giornaliera dal 1986) è la candidata lunga più vicina. Nei 3 anni comuni le variazioni seguono l'HY OAS con correlazione **0,69 a 5 sedute** e **0,67 a 21 sedute**. Nell'aprile 2025 ha il picco **lo stesso giorno** (07/04/2025), ma più piccolo: +0,29 punti contro +1,19, cioè 2,8 contro 3,8 deviazioni standard. I livelli invece si somigliano poco (correlazione 0,44). **Non è uno spread high yield**: è il gradino più basso dell'investment grade, e va detto nell'app.
- Le due decisioni per l'utente:
  1. **Licenza.** FRED la classifica «Copyrighted: Citation Required» (si può usare citando la fonte), come il VIX. La nota di Moody's sulla stessa pagina però dice «MAY NOT BE COPIED OR OTHERWISE REPRODUCED, REPACKAGED, FURTHER TRANSMITTED … WITHOUT MOODY'S PRIOR WRITTEN CONSENT».
  2. **Continuità.** La pagina FRED di `DBAA` (il rendimento Baa da cui si calcola BAA10Y: verificato uguale a `DBAA − DGS10` in 10.211 date su 10.212) oggi si intitola «Moody's Seasoned Baa Corporate Bond Yield (DISCONTINUED)», anche se è aggiornata al 05/11/2026. In un risultato di ricerca web del grafico di `DBAA` aggiornato all'08/04/2026 il titolo era ancora senza la scritta: il cambio sembra recente, ma la data esatta non è verificata. Se `DBAA` si ferma, si ferma anche BAA10Y.
- **Alternativa senza licenze di terzi:** −ln(HYG/IEF) da Yahoo (prezzi rettificati, la stessa fonte che l'app usa per gli indici). È disponibile dal 2007, arriva in giornata e segue l'HY OAS come BAA10Y (0,70 a 5 sedute, 0,71 a 21). Però non è uno spread ufficiale: è il rapporto tra due ETF, con durate e cedole diverse. Nell'aprile 2025 il suo picco non è il massimo dei 3 anni (89° percentile).

## 1. VIX3M

| | FRED `VXVCLS` | Cboe `VIX3M_History.csv` |
|---|---|---|
| Periodo | 04/12/2007 – 05/11/2026 | 18/09/2009 – 06/11/2026 |
| Valori | 4.761 (più 177 righe «.», giorni di borsa chiusa) | 4.311 |
| Valori ≤ 0 | 0 | 0 |
| Coppie di sedute consecutive con lo stesso valore | 40 | 39 |
| Valori uguali per 3 sedute o più | 0 | 0 |
| Buchi di oltre 4 giorni | 1 (26/10 → 31/10/2012, uragano Sandy, borsa chiusa) | lo stesso |
| Sedute S&P 500 senza valore | 1 (06/11/2026, non ancora pubblicata) | 0 dal 18/09/2009 |
| Valori in giorni senza seduta | **0** (il `VIXCLS` ne ha 33 dal 2022) | 0 |

- **FRED contro Cboe**: 4.310 date comuni, **4.310 uguali al centesimo**, differenza massima 0. Date solo su FRED: le 451 prima del 18/09/2009 (prima dell'inizio del file Cboe) e nessuna dopo. Data solo su Cboe: 06/11/2026.
- **FRED prima del 2009**: senza il file Cboe, il confronto è con Yahoo `^VIX3M`: 450 uguali su 451. L'unica differenza è il 24/12/2008: 43,93 contro 43,96.
- **Yahoo `^VIX3M` contro Cboe**: negli ultimi 60 giorni 44 uguali su 44. Su tutta la storia comune (4.311) 12 diversi; uno solo oltre 1 punto: 15/10/2014, 22,77 contro 23,82. Per confronto, `^VIX` su tutta la storia ha 13 valori diversi; il più grande è il 06/02/2026: 20,37 contro 17,76.
- **Quando pubblicano** (un'osservazione, coerente con `ricerca/vix/inserimento/inserimento.md`):

| Fonte | Ultima data il 09/11 alle 09:34 UTC | Aggiornata |
|---|---|---|
| FRED `VXVCLS` | 05/11 | «Updated: Nov 6, 2026 8:38 AM CST» (14:38 UTC del giorno dopo) |
| FRED `VIXCLS` | 05/11 | la stessa ora |
| Cboe `VIX3M_History.csv` | 06/11 | Last-Modified ven 06/11 22:31 UTC (76 minuti dopo la chiusura delle 16:15 ET) |
| Cboe `VIX_History.csv` | 06/11 | Last-Modified sab 07/11 02:11 UTC |
| Yahoo `^VIX3M` | 06/11 | — |

FRED è quindi **una seduta indietro** fino a circa le 14:40 UTC del giorno dopo; il lunedì mattina manca il venerdì.

## 2. VIX/VIX3M contro VX1/VX2

### Futures: da dove vengono

- **Elenco ufficiale delle scadenze**: `https://www.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/` (JSON). Contiene 633 contratti: **175 mensili** (`duration_type` «M») e 458 settimanali (esclusi). Le scadenze mensili vanno dal 16/01/2013 al 21/07/2027. Ogni contratto ha il suo file `cdn.cboe.com/data/us/futures/market_statistics/historical_data/VX/VX_AAAA-MM-GG.csv`; la prima riga del CDN è del 02/01/2013.
- **Prima del 2013**: archivio `cdn.cboe.com/resources/futures/archive/volume-and-price/CFE_<mese><aa>_VX.csv` (codici dei mesi F G H J K M N Q U V X Z). Sono 112 file, con scadenze dal 19/05/2004 al 18/12/2013; i file del 2013 hanno una riga di avvertenza prima dell'intestazione. La scadenza è la data dell'ultima riga, quella del valore finale: le 12 del 2013 coincidono con l'elenco ufficiale. Fino al 23/03/2007 i futures erano quotati a 10 volte il VIX (es. 150,00, poi 15,01 il 26/03/2007), quindi lì si divide per 10.
- **Settle mancanti**: sul CDN 852 righe dal 02/01/2013 al 19/07/2013 hanno Settle 0; per quelle si usa l'archivio. Dove ci sono entrambi (601 righe) CDN e archivio sono uguali.
- **Regola delle scadenze** (mercoledì 30 giorni prima del terzo venerdì del mese dopo): delle 275 scadenze ufficiali, 10 sono diverse dalla regola semplice. 8 sono le eccezioni per festività, con la scadenza spostata al martedì: 19/02/2008, 18/03/2014, 19/03/2019, 15/03/2022 e 18/03/2025 (Venerdì Santo), 18/06/2024 (Juneteenth di mercoledì), 19/05/2026 e 18/05/2027 (Juneteenth di venerdì). Le altre 2 sono del 2004 (14/07 e 13/10), fuori dal periodo usato. Conviene prendere le date dall'elenco ufficiale, non calcolarle.
- **Serie continua**: VX1 = Settle del mensile con scadenza **dopo** la data. Il giorno di scadenza si passa al contratto successivo, perché il Settle di quel giorno è il valore finale. VX2 = il mensile seguente. La serie continua parte dal 18/08/2005: prima i mensili non erano consecutivi. Fino al 2006 ci sono 24 date senza Settle, fuori dal periodo di confronto. Nel periodo di confronto non manca nessuna seduta. Ci sono 3 date di futures senza seduta dell'S&P 500 (03/04/2015, 05/12/2018, 09/01/2025), escluse.
- **Orario**: il Settle dei futures si forma intorno alle 15:00 CT (16:00 ET), mentre il VIX chiude alle 16:15 ET. Sono 15 minuti di differenza; l'orario esatto va confermato sulle specifiche Cboe.

### Confronto (sedute dell'S&P 500 dal 04/12/2007 al 05/11/2026: 4.761)

| | Numero |
|---|---|
| Sedute in backwardation secondo VIX/VIX3M (> 1) | 478 |
| Sedute in backwardation secondo VX1/VX2 (> 1) | 795 |
| Sedute con VX1 = VX2 | 26 |
| **Stessa risposta** | **4.336 (91,1%)** |
| Entrambi in backwardation | 424 |
| Solo VIX/VIX3M | 54 |
| Solo VX1/VX2 | 371 |
| Disaccordi con almeno un rapporto entro ±2% da 1 | 306 su 425 |
| Correlazione dei livelli | 0,855 |
| Correlazione delle variazioni giornaliere (4.760 coppie) | 0,586 |
| La stessa senza i giorni di scadenza (4.533 coppie) | 0,715 |

I futures dicono «backwardation» molto più spesso (795 sedute contro 478). Quasi tutti i disaccordi sono di questo tipo, e i più lunghi lo sono tutti.

**Ingressi in backwardation** (prima seduta sopra 1 dopo una sotto):

| | Ingressi | L'altro entra entro ±2 sedute | L'altro è in backwardation entro ±2 sedute |
|---|---|---|---|
| VIX/VIX3M | 132 | 69 (40 lo stesso giorno) | 115 (87%) |
| VX1/VX2 | 126 | 64 (40 lo stesso giorno) | 68 (54%) |
| VIX/VIX3M, dopo almeno 10 sedute sotto 1 | 58 | 29 | 47 (81%) |
| VX1/VX2, dopo almeno 10 sedute sotto 1 | 63 | 29 | 35 (56%) |

Quando VIX/VIX3M entra in backwardation, i futures di solito lo sono già o lo diventano entro 2 sedute. Il contrario vale solo in poco più della metà dei casi.

**Periodi di disaccordo**: 185 in tutto; 47 durano almeno 3 sedute, 18 almeno 5, 5 almeno 10. Tutti quelli di almeno 5 sedute sono «VX1/VX2 sì, VIX/VIX3M no»:

| Dal | Al | Sedute | VIX/VIX3M medio | VX1/VX2 medio |
|---|---|---|---|---|
| 15/02/2008 | 22/02/2008 | 5 | 0,993 | 1,001 |
| 20/03/2008 | 28/03/2008 | 6 | 0,982 | 1,018 |
| 21/01/2009 | 29/01/2009 | 7 | 0,950 | 1,056 |
| 20/04/2009 | 28/04/2009 | 7 | 0,986 | 1,008 |
| 14/09/2011 | 20/09/2011 | 5 | 0,966 | 1,022 |
| 05/10/2011 | 18/10/2011 | 10 | 0,965 | 1,037 |
| 21/10/2011 | 31/10/2011 | 7 | 0,965 | 1,044 |
| 02/11/2011 | 08/11/2011 | 5 | 0,962 | 1,050 |
| 02/09/2015 | 11/09/2015 | 7 | 0,974 | 1,065 |
| 30/09/2015 | 07/10/2015 | 6 | 0,928 | 1,027 |
| 19/01/2016 | 05/02/2016 | 14 | 0,946 | 1,034 |
| 24/04/2020 | 06/05/2020 | 9 | 0,956 | 1,017 |
| 09/03/2022 | 15/03/2022 | 5 | 0,956 | 1,011 |
| 13/06/2022 | 21/06/2022 | 6 | 0,975 | 1,011 |
| 14/10/2022 | 24/10/2022 | 7 | 0,982 | 1,011 |
| 18/09/2024 | 04/10/2024 | 13 | 0,877 | 1,034 |
| 08/10/2024 | 30/10/2024 | 17 | 0,973 | 1,050 |
| 25/04/2025 | 08/05/2025 | 10 | 0,963 | 1,013 |

I due periodi di settembre-ottobre 2024 coincidono con il contratto di ottobre, che copriva le elezioni USA del 05/11/2024: i futures avevano un «gradino» legato all'evento, mentre il VIX3M era tranquillo (VIX/VIX3M 0,88). La lista completa (anche da 3 sedute) è in `risultati.json`, alla voce `struttura.disaccordi`.

**Salti di VX1/VX2 alle scadenze** (227 scadenze nel periodo):
- salto di VX1 dovuto solo al cambio di contratto (VX2 − VX1 della seduta prima): mediana **1,60 punti**, massimo 9,75 (19/11/2008: VX1 da 67,04 a 62,90). La variazione giornaliera tipica di VX1 negli altri giorni è di 0,45 punti (mediana);
- il rapporto VX1/VX2 nei giorni di scadenza cambia in mediana di 0,044 (0,048 per il solo cambio di contratto), contro 0,0088 negli altri giorni;
- **21 cambi di stato** (sopra o sotto 1) sono causati dal solo cambio di contratto. Esempi: 19/11/2025, da 1,101 a 0,958 (VIX/VIX3M da 1,006 a 0,986); 18/09/2024, da 0,937 a 1,018. L'elenco è in `risultati.json`, alla voce `struttura.scadenze`.

Il rapporto VIX/VIX3M non ha questi salti: i due indici hanno una scadenza costante (30 e 93 giorni).

## 3. Credito

### Serie candidate

| Serie | Fonte | Dal | Frequenza | Licenza su FRED | Note |
|---|---|---|---|---|---|
| HY OAS `BAMLH0A0HYM2` | ICE BofA via FRED | 07/11/2023 | giornaliera | **Pre-Approval Required** | solo 3 anni; ICE vieta di pubblicarla senza permesso |
| IG OAS `BAMLC0A0CM` | ICE BofA via FRED | 07/11/2023 | giornaliera | Pre-Approval Required | stessi limiti |
| `BAA10Y` | FRED (Moody's − Treasury) | 02/01/1986 | giornaliera | Citation Required | nota Moody's restrittiva; `DBAA` segnata «DISCONTINUED» |
| `AAA10Y` | FRED (Moody's − Treasury) | 03/01/1983 | giornaliera | Citation Required | come sopra (`DAAA` «DISCONTINUED») |
| Baa − Aaa | calcolata (BAA10Y − AAA10Y) | 1986 | giornaliera | come sopra | |
| `NFCICREDIT` | Chicago Fed via FRED | 08/01/1971 | **settimanale** | Citation Required | dati al venerdì, pubblicati il mercoledì dopo |
| −ln(HYG/IEF) | Yahoo, prezzi rettificati | 11/04/2007 | giornaliera | — | rapporto di ETF, non uno spread ufficiale |

### Somiglianza con l'HY OAS (sedute dell'S&P 500 dal 07/11/2023 al 06/11/2026)

| Serie | Livelli | Variazioni a 5 sedute | Variazioni a 21 sedute |
|---|---|---|---|
| IG OAS (ICE, stessi limiti) | 0,929 | 0,822 | 0,884 |
| **BAA10Y** | 0,440 | **0,688** | **0,674** |
| AAA10Y | −0,178 | 0,629 | 0,548 |
| Baa − Aaa | 0,701 | 0,128 | 0,438 |
| −ln(HYG/IEF) (Yahoo) | 0,692 | 0,699 | 0,706 |
| NFCICREDIT (156 settimane) | 0,817 | 0,357 (1 settimana) | 0,701 (4 settimane) |

Le variazioni a 5 e 21 sedute si sovrappongono, quindi le correlazioni non sono campioni indipendenti. In 3 anni c'è un solo episodio di stress vero (aprile 2025): queste correlazioni dicono poco su come le serie si comportano in una crisi lunga.

**Storia lunga** (non c'è l'HY OAS, si usa −ln(HYG/IEF) come riferimento di mercato): BAA10Y dal 2007 ha correlazione 0,739 sulle variazioni a 21 sedute (0,717 nel 2007-2012, 0,667 nel 2013-2019, 0,843 nel 2020-2026); Baa − Aaa 0,533; AAA10Y 0,635.

### Aprile 2025

| Serie | 02/04/2025 | Massimo 03/04 – 30/05 | Data | Aumento | In deviazioni standard (var. a 21 sedute) | Percentile del massimo nei 3 anni |
|---|---|---|---|---|---|---|
| HY OAS | — | — | 07/04 | +1,19 | 3,83 | 100% (massimo dei 3 anni) |
| IG OAS | — | — | 09/04 | +0,25 | 3,32 | 99% |
| BAA10Y | — | — | 07/04 | +0,29 | 2,76 | 100% |
| AAA10Y | — | — | 07/04 | +0,25 | 2,78 | 99,7% |
| Baa − Aaa | — | — | 21/04 | +0,09 | 1,83 | 92,5% |
| −ln(HYG/IEF) | 21,89 | 25,88 | 04/04 | +3,99 | 2,98 | 89,5% |

I livelli di ICE e Moody's non sono riportati nel repository (licenze; `../ripulisci.mjs` li toglie anche dai JSON).

Sulla storia dal 1990 il picco di BAA10Y dell'aprile 2025 è solo al **44° percentile**: è stato il massimo degli ultimi 3 anni, non un livello di crisi. Una soglia fissa sul livello di BAA10Y andrebbe quindi studiata nel backtest, non copiata da quelle tipiche dell'HY.

### Ritardo e buchi

| Serie | Ultima data (09/11 alle 09:34 UTC) | Sedute mancanti in coda | Aggiornata su FRED |
|---|---|---|---|
| HY OAS | 05/11 | 1 | 06/11 9:08 AM CST |
| IG OAS | 05/11 | 1 | 06/11 9:02 AM CST |
| BAA10Y | 05/11 | 1 | 06/11 4:04 PM CST |
| AAA10Y | 05/11 | 1 | 06/11 4:03 PM CST |
| DBAA / DAAA | 05/11 | 1 | 06/11 10:31 AM CST |
| DGS10 | 05/11 | 1 | 06/11 4:05 PM CST |
| NFCICREDIT | 30/10 | 5 | 04/11 7:34 AM CST |
| −ln(HYG/IEF) | 06/11 | 0 | — |

BAA10Y esce nel **pomeriggio** del giorno dopo (16:04 CST = 22:04 UTC, una sola osservazione): alla corsa delle 22:40 UTC c'era, a quelle del mattino UTC del giorno dopo la seduta ancora no.

**Sedute dell'S&P 500 senza valore** (le borse obbligazionarie hanno festività diverse):
- BAA10Y e AAA10Y, dal 1990: **79 su 9.280 (0,85%)**. Di queste, 37 sono Columbus Day e 32 Veterans Day (mercato dei titoli di Stato chiuso, borsa aperta); le altre 10 sono il Martin Luther King Day 1990-1997, il 24/12/2001 e il 31/12/2021. Dal 07/11/2023 sono 5: 14/10/2024, 11/11/2024, 13/10/2025, 11/11/2025, 12/10/2026. Al contrario, 11 date hanno un valore in un giorno senza seduta (es. Venerdì Santo 2007, 2010, 2012, 2015; 29/10/2012; 09/01/2025). Lì una seduta senza valore deve restare «—», come vuole la regola del progetto.
- HY OAS: 0 sedute senza valore, ma 34 valori in giorni senza seduta (festività di borsa e alcune fine mese di sabato o domenica, es. 28/02/2026, 31/05/2026).
- IG OAS: 1 seduta senza valore (24/12/2024).

## 4. Peso in `data/vix.json`

Calcolato con `pack()` di `scripts/fetch_emerging.js`, solo sulle sedute dell'S&P 500 con un valore. Oggi il file pesa 205,8 KB (62,6 KB con gzip).

| Serie aggiunta | Valori | KB | KB con gzip | Con ps = 100 (i valori hanno 2 decimali) |
|---|---|---|---|---|
| VIX3M (FRED, dal 2007) | 4.761 | +30,9 | +7,9 | +21,7 KB (+7,1 con gzip) |
| BAA10Y (dal 1990) | 9.201 | +45,7 | +7,0 | +30,9 KB (+6,5 con gzip) |
| AAA10Y (dal 1990) | 9.201 | +45,6 | +7,2 | +30,9 KB (+6,6 con gzip) |
| HY OAS (3 anni, solo come riferimento) | 752 | +4,1 | +1,0 | +2,7 KB |
| VX1 (dal 2007, 4 decimali) | 4.762 | +31,2 | +8,9 | — |
| VX2 (dal 2007, 4 decimali) | 4.762 | +30,5 | +8,5 | — |
| **VIX3M + BAA10Y** | | **+76,6** | **+14,9** | file da 282 KB (77 KB con gzip) |
| VIX3M + VX1 + VX2 + BAA10Y | | +138,3 | +31,1 | file da 344 KB (94 KB con gzip) |

`pack()` sceglie da solo ps = 10000 (4 decimali) per i valori sotto 1000. Passando ps = 100 per le serie a 2 decimali (VIX3M, BAA10Y) si risparmia circa un terzo dei byte senza perdere nulla.

## Ricalcolo indipendente

`ricontrollo.py` (Python, `python3 -I`) rifà i numeri chiave senza il codice dell'app né quello di `dati.mjs`:
- le sedute vengono da una decodifica di `data/vix.json` scritta a parte, più Yahoo letto con `zoneinfo`;
- le scadenze dei futures sono ricavate dai file stessi (ultima riga dell'archivio, nome del file del CDN controllato contro l'ultima riga per i 166 contratti già scaduti) e poi confrontate con l'elenco ufficiale: coincidono;
- le correlazioni usano `statistics.correlation`;
- la codifica compatta è riscritta in Python.

**Tutti i numeri coincidono**, alla quarta cifra decimale per le correlazioni e alla singola seduta per i conteggi:
- VIX3M: 4.761 valori, 4.310 su 4.310 uguali a Cboe, 0 valori fuori seduta (`VIXCLS` 33); Yahoo: 44 su 44 negli ultimi 60 giorni, 12 diversi nella storia, massimo 1,05 il 15/10/2014;
- struttura: 4.761 sedute, 4.336 uguali (0,9107), 424 / 54 / 371; correlazioni 0,8548 e 0,5856; ingressi 132 → 69 e 126 → 64, filtrati 58 → 29 e 63 → 29; stato entro ±2 sedute 115, 68, 47, 35; 185 periodi di disaccordo, 18 di almeno 5 sedute e 5 di almeno 10; 227 scadenze, salto mediano 1,60, massimo 9,75;
- credito: BAA10Y 0,4401 / 0,6876 / 0,6736, AAA10Y −0,1782 / 0,629 / 0,5475, IG 0,9287 / 0,822 / 0,8843, HYG/IEF 0,6921 / 0,6986 / 0,7062, Baa−Aaa 0,7005 / 0,1277 / 0,4376; BAA10Y contro HYG/IEF dal 2007 0,7394; aprile 2025: HY +1,19 al 07/04, BAA10Y +0,29 al 07/04; 79 sedute senza BAA10Y dal 1990;
- peso: VIX3M 30,9 KB (21,68 KB con ps 100), BAA10Y 45,66 KB (30,93 KB con ps 100).

Il ricalcolo indipendente non copre il gzip e la tabella dell'aprile 2025 in deviazioni standard e percentili.

## Limiti

- Questa è una verifica dei dati. Se VIX/VIX3M o BAA10Y aiutano a riconoscere i bottom lo dice il backtest. Le soglie (1 per la backwardation, qualsiasi livello per il credito) sono regole: si decidono con l'utente.
- Il ritardo di pubblicazione viene da un solo giorno di osservazione (le pagine FRED e il Last-Modified di Cboe di oggi). Per il VIX è coerente con `ricerca/vix/inserimento/inserimento.md`.
- L'HY OAS copre 3 anni con un solo episodio di stress, quindi il confronto con le serie lunghe è debole. Una storia lunga gratuita dell'HY OAS non c'è: FRED e ALFRED sono tagliati, e i dati ICE alla fonte non sono liberi.
- Le licenze vanno lette dall'utente prima di pubblicare. Il VIX3M ha la stessa licenza del VIX già in uso. Per BAA10Y la classificazione di FRED e la nota di Moody's non dicono la stessa cosa. Per i Settle dei futures Cboe i file dell'archivio rimandano ai «Terms and Conditions of CBOE's Websites», che non sono stati verificati qui. I termini di FRED in generale chiedono di non archiviare i contenuti di terzi: questo riguarda già oggi tutte le serie FRED dell'app, non solo queste.
- −ln(HYG/IEF) usa i prezzi rettificati di Yahoo, che cambiano a ogni dividendo; è un confronto di mercato, non una fonte ufficiale.
