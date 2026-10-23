# Protocollo di verifica: ingresso dopo la zona blu

Approvato il 26 settembre 2026 e congelato prima di calcolare qualsiasi regola candidata. Scelte confermate all'approvazione: il «PK» delle note di Rea è il POC; i tre ingressi hanno pesi uguali; il «time frame più lungo» è l'equivalente giornaliero descritto in C5. Le precisazioni di calcolo del punto 11 sono state fissate anch'esse prima del calcolo.

## 1. Scopo

Confrontare il trigger attuale con sette alternative sui 48 episodi di zona blu chiusi tra il 2008 e il 2025, per decidere se cambiare il modo di entrare.

Regole, parametri, misure e criteri di scelta sono fissati qui, prima di calcolare qualsiasi risultato. L'unità di prova è il periodo di crisi, non il singolo episodio, perché i 48 episodi si concentrano in 7 periodi.

## 2. Dati congelati

| File | Contenuto | SHA-256 (inizio) |
|---|---|---|
| `sectors.json` | Chiusure rettificate degli ETF al 25/09/2026 | `343cbdbaea16` |
| `breadth.json` | Breadth dei settori al 25/09/2026 | `570719e2a774` |
| `thresholds.json` | Livelli blu e parametri dell'app | `a02b94d525d1` |
| `prices.parquet` | Prezzi e volumi giornalieri dei titoli S&P 500 fino al 22/09/2026 (archivio sp500-data di Johnbrick123) | `9753bfa54f28` |
| `membership_intervals.parquet` | Composizione storica dell'indice | `22c19a24ca90` |
| `settori.json` | Settore di ogni titolo, ricostruito con la logica di `scripts/backfill_breadth.py` | `8193914156a7` |

Codice dell'app: commit `2d08746`, macchina a stati in `js/signals.js`.

## 3. Episodi e periodi

Gli episodi sono i 48 chiusi, elencati in appendice. L'episodio aperto di XLU, iniziato il 25/09/2026, è escluso: si segue dal vivo con le regole congelate.

I periodi di crisi raggruppano gli episodi con finestre di un anno sovrapposte:

| Periodo | Episodi |
|---|---|
| 2008–09 | 12 |
| 2011 | 5 |
| 2015–16 (con novembre 2016) | 7 |
| Dicembre 2018 | 5 |
| 2020 | 10 |
| 2022–23 | 8 |
| 2025 | 1 |

## 4. Convenzioni comuni

- **Esecuzione:** segnale alla chiusura del giorno t, esecuzione alla chiusura del giorno dopo.
- **Costi:** 10 punti base per ogni acquisto o vendita.
- **Finestra di valutazione:** da T0, il primo giorno di zona blu, a T0 + 252 sedute. Si chiude prima se lo stesso settore rientra in zona blu.
- **Liquidità:** fuori dal mercato rende zero.
- **Fallimento, uguale per tutte le regole:** se entro 20 sedute dal primo ingresso il prezzo chiude sotto il minimo della zona blu meno un'escursione giornaliera media, si esce da tutta la posizione. Poi si aspetta un nuovo segnale, con due conferme richieste.
- **Minimo della zona blu:** sempre quello noto fino a quel giorno, mai quello ex post.
- **Parametri:** nessuno si ottimizza. Le variazioni del punto 8 servono solo a controllare che il risultato regga.

## 5. Le regole a confronto

**C0 — Trigger attuale**, identico all'app.

**C1 — Freno.** Si applica solo quando l'unica conferma del trigger è la spinta di breadth a 20 sedute; negli altri casi si entra come in C0. In quel caso si aspetta anche una prova dal prezzo, in due versioni:

- **C1a:** la prima chiusura sopra la media semplice a 50 sedute.
- **C1b, struttura di Dow:**
  - la soglia di swing *h* vale 3 deviazioni standard dei rendimenti giornalieri delle ultime 20 sedute;
  - L1 è il minimo della zona blu;
  - il massimo di reazione H1 si fissa quando il prezzo, salito di almeno *h* da L1, ne ritraccia di almeno *h*;
  - L2 è il minimo dopo H1;
  - il segnale è la prima chiusura sopra H1 con L2 sopra L1;
  - un nuovo minimo sotto L1 fa ripartire la struttura.

Se durante l'attesa scatta la condizione di fallimento, il trigger decade come nell'app.

**C2 — Acceleratore.** Aggiunge una conferma alla lista del trigger, che scatta quando valgono due condizioni:

- la volatilità a 10 sedute è sotto quella a 60, misurate alla chiusura precedente;
- la chiusura supera la più alta delle 10 chiusure precedenti.

Vale come una conferma, e la risalita della breadth resta obbligatoria.

**C3 — Freno e acceleratore insieme.** È C2 con il freno scelto tra C1a e C1b secondo la regola del punto 7. Il freno non si applica se tra le conferme c'è anche la compressione.

**C4 — Due tempi.** Metà al trigger attuale, metà alla prima chiusura sopra la media a 50 sedute dal trigger in poi. Se il prezzo è già sopra la media, si entra tutto subito.

**C5 — Tre tempi, stile Rea, solo prezzi.**

- **Primo terzo:** al trigger con acceleratore (C2), cioè sulla rottura della compressione vicino al minimo, con la breadth che conferma.
- **Secondo terzo:** al ritest del livello rotto, cioè alla prima chiusura non oltre lo 0,5% sopra la più alta delle 10 chiusure prima del segnale, purché senza fallimento. Se il ritest non arriva entro 63 sedute, questo terzo entra insieme al terzo.
- **Terzo terzo:** dopo il primo ingresso, quando si forma una nuova compressione su un orizzonte più lungo:
  - la volatilità a 20 sedute è sotto quella a 120;
  - la chiusura supera la più alta delle 50 chiusure precedenti.

**C6 — Tre tempi, stile Rea con volumi.** Come C5, con due differenze:

- **Primo terzo:** richiede anche una chiusura sopra il POC (point of control) della discesa, cioè il prezzo con più scambi nel profilo dei volumi. Il profilo va dal massimo a 52 settimane prima della zona blu fino al giorno del segnale.
- **Secondo terzo:** entra al ritest del livello rotto oppure del POC, al primo dei due che arriva.

Il volume dell'ETF non è nei nostri dati, quindi si usa il controvalore scambiato dai titoli del settore (prezzo per volume). Ogni giorno quel controvalore si assegna al prezzo di chiusura dell'ETF, in fasce dell'1%. Se C6 venisse scelto, la pipeline dovrebbe cominciare a salvare i volumi ogni giorno.

## 6. Misure

Per ogni episodio e ogni regola si calcolano:

- **Misura principale:** rendimento da T0 a T0 + 252 sedute, restando liquidi fino all'ingresso e applicando fallimento e rientro. Una regola che entra tardi o non entra affatto viene penalizzata, non esclusa.
- **Quota di rimbalzo persa all'ingresso:**
  - si calcola come ln(prezzo d'ingresso / minimo ex post) diviso ln(massimo delle 126 sedute dopo il minimo / minimo);
  - vale 0 se si entra sul minimo;
  - gli ingressi prima del minimo si contano a parte;
  - per gli ingressi in più tempi si usa il prezzo medio.
- **Rischio:** calo massimo del capitale complessivo (investito più liquidità) a 21 e 63 sedute dal primo ingresso.
- **Falsa partenza:** primo ingresso seguito entro 126 sedute da un calo di almeno il 10%.
- **Episodi senza ingresso:** quota degli episodi in cui la regola non entra mai nella finestra.
- **Rendimenti dall'ingresso:** a 21, 63 e 126 sedute, assoluti e contro SPY.

Termini di paragone:

- ingresso a T0;
- ingresso a T0 + 10 e a T0 + 21 sedute;
- sola risalita della breadth, senza conferme;
- date casuali nella finestra;
- ritardi rimescolati tra gli episodi;
- buy & hold del settore e di SPY;
- ingresso sul minimo, solo come riferimento.

## 7. Criteri di scelta

**Regole a ingresso unico (C1a, C1b, C2, C3).** Passano solo se valgono tutte queste condizioni:

1. la misura principale migliora rispetto a C0 in almeno 6 periodi su 7, e anche in media, con ogni periodo che pesa uguale;
2. il test con date casuali (10.000 estrazioni, corretto per il numero di regole provate) dà p sotto 0,10;
3. il calo massimo mediano a 63 sedute non peggiora di oltre 2 punti, e le false partenze non aumentano di oltre 10 punti;
4. la quota di rimbalzo persa non cresce di oltre 10 punti in mediana, né sul totale né sui soli crolli a V (2018 e 2020);
5. togliendo un periodo alla volta il segno del miglioramento non cambia, e regge anche con i parametri del punto 8;
6. solo per C1a e C1b: battono anche i propri ritardi rimescolati.

C1b è preferito a C1a solo se lo batte in almeno 5 periodi su 7. Il freno preferito è quello usato in C3.

**Ingressi in più tempi (C4, C5, C6).** Si giudicano sul rischio e passano solo se:

1. il calo massimo del capitale a 63 sedute dal primo ingresso migliora rispetto a C0 in almeno 6 periodi su 7;
2. la misura principale media non scende di oltre 2 punti rispetto a C0;
3. la robustezza è quella richiesta al punto 5 delle regole a ingresso unico.

C6 è preferito a C5 solo se lo batte in almeno 5 periodi su 7.

Se nessuna regola passa, resta il trigger attuale: è un esito previsto, non un fallimento della verifica.

## 8. Controlli di robustezza

Queste variazioni non servono a scegliere, solo a controllare che il risultato regga:

- media a 40 e a 60 sedute invece di 50;
- *h* a 2 e a 4 deviazioni standard;
- tolleranza del doppio minimo fino a un'escursione media sotto L1;
- volatilità 5/40 e 20/60 invece di 10/60;
- rottura sulle 20 chiusure invece che sulle 10;
- ritest a 0% e a 1%;
- fasce del POC a 0,5% e a 2%;
- un giorno di ritardo in più nell'esecuzione;
- con e senza stop;
- periodo 2005–2015 contro 2016–2025;
- esclusione del 2008–09 e del 2020.

## 9. Già visto prima di congelare

Prima di questo protocollo sono stati calcolati solo dati descrittivi sul trigger attuale e sui rimbalzi:

- tempi del trigger e false partenze;
- quota di rimbalzo persa al trigger;
- quanto il rimbalzo si concentra nelle prime sedute, per gli ETF e per i singoli titoli.

Nessuna delle regole da C1 a C6 è stata calcolata.

## 10. Dopo la verifica

- Si producono le tabelle per episodio e per periodo, più il registro di tutte le varianti calcolate, comprese quelle scartate.
- XLU e le prossime zone blu si seguono con le regole congelate.
- L'app non cambia senza approvazione.

## 11. Precisazioni fissate prima del calcolo

Queste scelte di dettaglio non erano scritte nella bozza. Sono state fissate dopo l'approvazione ma prima di calcolare qualsiasi regola candidata.

1. **Periodi toccati.** Per le regole a ingresso unico, un periodo in cui la regola coincide con C0 (differenza media sotto 0,1 punti) non conta. Il criterio 1 del punto 7 richiede un miglioramento in almeno 6/7 dei periodi toccati, arrotondando per eccesso, e almeno 4 periodi toccati; con meno di 4 l'esito è «inconcludente». I confronti C1b–C1a e C6–C5 seguono la stessa logica con la soglia 5/7; senza preferenza si usa la regola più semplice (C1a, C5).
2. **Confronti tra varianti.** Nei confronti C1b–C1a e C6–C5, «batte» si misura sulla misura principale.
3. **Test con date casuali.**
   - Ogni estrazione assegna a ogni episodio una data d'ingresso uniforme nella finestra; la posizione intera si tiene fino alla fine.
   - La statistica è la media per periodo della misura principale.
   - La correzione per il numero di regole confronta la regola con il massimo di 7 strategie casuali indipendenti in ciascuna delle 10.000 estrazioni.
4. **Ritardi rimescolati (C1a, C1b).**
   - Il ritardo è la seduta del primo ingresso della regola meno quella di C0.
   - Per ogni episodio si estrae un ritardo tra quelli degli altri episodi.
   - Il confronto usa il rendimento dal primo ingresso a fine finestra, senza regola di fallimento.
   - La regola deve superare la media di 1.000 rimescolamenti.
5. **Quota di rimbalzo persa, per il criterio 4.**
   - Vale 0 se il primo ingresso è prima del minimo ex post e 1 se la regola non entra.
   - Il minimo ex post è la chiusura più bassa tra T0 e T0 + 252.
   - Per gli ingressi in più tempi decide la data del primo ingresso.
6. **Calo massimo del capitale.** Si misura dal valore al primo ingresso: è il minimo nelle 21 o 63 sedute seguenti.
7. **Falsa partenza.** Si calcola sul prezzo del primo ingresso, anche se nel frattempo la regola è uscita.
8. **Ingressi in più tempi.**
   - Ogni quota vale 1/2 o 1/3 del capitale all'inizio del ciclo.
   - Il fallimento, contato dal primo ingresso, chiude tutto; al segnale successivo il ciclo riparte.
   - In C5 e C6, se il terzo ingresso arriva prima del ritest, compra il suo terzo e il secondo terzo aspetta il ritest fino a 63 sedute.
   - Se il ritest non arriva, il secondo terzo entra con il terzo ingresso, oppure alla 63ª seduta se il terzo ingresso è già avvenuto.
   - Le quote non investite entro la fine della finestra restano liquide.
9. **Attese (freno e primo terzo di C6).**
   - L'attesa comincia il giorno del trigger, e la condizione può essere già vera quel giorno.
   - La struttura di Dow di C1b può essersi formata prima del trigger; resta valida finché il prezzo non fa un nuovo minimo sotto L1.
   - Se entro 20 sedute dal trigger scatta la condizione di fallimento, il trigger decade e servono due conferme.
10. **Termini di paragone.**
    - A date fisse (T0, T0 + 10, T0 + 21) e nel buy & hold, la posizione intera si tiene fino a fine finestra, senza regola di fallimento.
    - Nella «sola risalita della breadth» si entra appena vale la condizione di breadth, senza conferme, con fallimento e rientro.
11. **Robustezza.** Una regola regge se il suo criterio vale in ogni caso seguente:
    - in ogni variazione applicabile del punto 8;
    - togliendo un periodo alla volta;
    - togliendo insieme 2008–09 e 2020;
    - in entrambe le metà del campione (2008–2011 e 2015–2025).

    Il criterio è il miglioramento medio positivo per le regole a ingresso unico, e per gli ingressi in più tempi il calo massimo migliore con un costo entro 2 punti. Il giorno di ritardo e lo stop si applicano sia alla regola sia a C0. Lo stop esce quando la chiusura scende sotto il minimo della zona blu meno un'escursione media, in qualunque momento; dopo le prime 20 sedute l'uscita è definitiva per quell'episodio.
12. **Esecuzione.** Acquisti e vendite avvengono alla chiusura del giorno dopo il segnale e costano 10 punti base ciascuno; il valore a fine finestra non paga la vendita.

## Appendice: i 48 episodi

| # | Settore | Inizio zona blu | Periodo |
|---|---|---|---|
| 1 | XLY | 22/01/2008 | 2008–09 |
| 2 | XLK | 28/01/2008 | 2008–09 |
| 3 | XLU | 03/03/2008 | 2008–09 |
| 4 | XLU | 25/07/2008 | 2008–09 |
| 5 | XLE | 04/09/2008 | 2008–09 |
| 6 | XLK | 02/10/2008 | 2008–09 |
| 7 | XLI | 03/10/2008 | 2008–09 |
| 8 | XLB | 03/10/2008 | 2008–09 |
| 9 | XLY | 07/10/2008 | 2008–09 |
| 10 | XLV | 07/10/2008 | 2008–09 |
| 11 | XLP | 10/10/2008 | 2008–09 |
| 12 | XLF | 10/10/2008 | 2008–09 |
| 13 | XLB | 05/08/2011 | 2011 |
| 14 | XLI | 08/08/2011 | 2011 |
| 15 | XLF | 09/08/2011 | 2011 |
| 16 | XLK | 19/08/2011 | 2011 |
| 17 | XLV | 22/08/2011 | 2011 |
| 18 | XLU | 08/06/2015 | 2015–16 |
| 19 | XLV | 29/09/2015 | 2015–16 |
| 20 | XLB | 14/01/2016 | 2015–16 |
| 21 | XLV | 19/01/2016 | 2015–16 |
| 22 | XLE | 04/02/2016 | 2015–16 |
| 23 | XLRE | 11/11/2016 | 2015–16 |
| 24 | XLU | 11/11/2016 | 2015–16 |
| 25 | XLE | 17/12/2018 | Dicembre 2018 |
| 26 | XLI | 20/12/2018 | Dicembre 2018 |
| 27 | XLB | 20/12/2018 | Dicembre 2018 |
| 28 | XLF | 21/12/2018 | Dicembre 2018 |
| 29 | XLV | 24/12/2018 | Dicembre 2018 |
| 30 | XLE | 28/02/2020 | 2020 |
| 31 | XLY | 12/03/2020 | 2020 |
| 32 | XLF | 12/03/2020 | 2020 |
| 33 | XLB | 12/03/2020 | 2020 |
| 34 | XLC | 17/03/2020 | 2020 |
| 35 | XLI | 17/03/2020 | 2020 |
| 36 | XLV | 20/03/2020 | 2020 |
| 37 | XLRE | 20/03/2020 | 2020 |
| 38 | XLU | 20/03/2020 | 2020 |
| 39 | XLP | 24/03/2020 | 2020 |
| 40 | XLY | 10/05/2022 | 2022–23 |
| 41 | XLK | 20/05/2022 | 2022–23 |
| 42 | XLRE | 14/06/2022 | 2022–23 |
| 43 | XLF | 17/06/2022 | 2022–23 |
| 44 | XLU | 30/09/2022 | 2022–23 |
| 45 | XLRE | 20/03/2023 | 2022–23 |
| 46 | XLE | 17/05/2023 | 2022–23 |
| 47 | XLP | 06/10/2023 | 2022–23 |
| 48 | XLB | 13/03/2025 | 2025 |
