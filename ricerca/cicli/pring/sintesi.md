# Obbligazioni, poi azioni, poi materie prime? · Pring e Murphy sulla storia lunga

Fase di ricerca del 22/11/2026, sola lettura sull'app. Domanda dell'utente: «capire se c'è un pattern nel susseguirsi dei cicli degli asset». Criteri: `ricerca/cicli/domanda.md` (decisi prima dei risultati). Tutti i numeri vengono da `risultati.json` e `prove.json`, scritti dagli script in `script/`; le tabelle complete sono in `tabelle.md`.

## In breve

**Verdetto: non regge.** Sulla storia dal 1954 al 2026 l'ordine «obbligazioni → azioni → materie prime» non si ripete più di quanto accadrebbe per caso, né ai massimi né ai minimi, con nessuna delle definizioni provate. Nessun criterio è superato (1: no; 2: 0 coppie su 18; 3: non stimabile con le soglie, no con Bry-Boschan; 4: 0 su 18).

- Con la definizione a soglia i cicli in cui girano tutte e tre le serie entro 18 mesi sono pochissimi: 1, 1 e 0 ai massimi, 2, 1 e 0 ai minimi (soglie 15/20/30%). Uno solo è in ordine di Pring.
- Con Bry-Boschan (nessuna soglia di ampiezza) i cicli completi sono 5 ai massimi e 5 ai minimi; 2 e 2 sono in ordine di Pring, contro circa 0,7 attesi per caso (p = 0,17 in entrambi i casi).
- **Il caso più vicino all'ipotesi riguarda solo il passato.** Con Bry-Boschan e un indice di materie prime di mercato, ai minimi l'ordine di Pring c'era spesso nel 1954-1985 (metalli non ferrosi 5 cicli su 7, indice non energetico della World Bank 4 su 5, p ≤ 0,002), ma nel 1986-2026 non c'è mai (0 cicli su 2). Ai massimi non c'era neanche prima. Murphy stesso scrive che i minimi del 2002-2003 hanno «invertito l'ordine normale».
- **Dollaro e materie prime**: le variazioni a 12 mesi vanno in senso opposto (correlazione −0,29, p = 0,0005), ma solo dal 2000 (−0,44; prima −0,05). Come regola sui punti di svolta non funziona: una svolta delle materie prime ha una svolta opposta del dollaro entro 12 mesi nel 40% dei casi, contro il 33% atteso per caso (p = 0,31).
- **Utilità**: quando le obbligazioni girano, le azioni girano nello stesso verso entro 18 mesi in 4 casi su 20 ai massimi (base 15%) e 2 su 20 ai minimi (base 15%), alla soglia media. Nessuna coppia batte la frequenza di base dopo la correzione.
- **Oggi** (dati mensili fino a ottobre 2026): obbligazioni in calo (rendimento 5,13% contro 3,72% del minimo di settembre 2024), azioni in salita, materie prime in salita: è lo **stadio IV** di Pring con tutte e tre le classificazioni provate. La classificazione è però fragile: l'S&P 500 il 20/11/2026 è l'11,6% sotto il massimo del 06/10/2026 e le materie prime sono il 6% sotto il massimo di maggio e solo l'1,4% sopra la media di 12 mesi. Se il calo dell'S&P 500 continua si passerebbe allo stadio V. Solo descrizione, non una previsione.

## L'ipotesi e le fonti

- **John J. Murphy**, *Trading with Intermarket Analysis* (Wiley, 2013), capitolo 1 («Intermarket Analysis: The Study of Relationships»), verificato sull'estratto gratuito dell'editore: «bonds, stocks, and commodities have a history of peaking and troughing in a predictable order during turns in the business cycle» e, nel riquadro «John's tips», «Bonds usually change direction first at tops and bottoms, stocks turn second, and commodities third». Nello stesso capitolo: «the dollar and commodities trend in opposite directions» (e il capitolo 11 si intitola «The Dollar and Commodities Trend in Opposite Directions»). Il capitolo 4 ha due paragrafi intitolati «Bonds, Stocks, and Commodities Peaked in the Proper Order» (2000) e «The 2002 and 2003 Bottoms Reverse Normal Order»; il capitolo 8 è «Intermarket Analysis and the Business Cycle». I numeri di pagina non sono nell'estratto: **non verificati**. Le opere precedenti di Murphy (*Intermarket Technical Analysis*, Wiley 1991; *Intermarket Analysis*, Wiley 2004) non le ho potute consultare: capitolo e pagina **non verificati**.
- **Martin J. Pring**, *The All-Season Investor: Successful Strategies for Every Stage in the Business Cycle* (Wiley, 1992). L'indice pubblicato dall'editore contiene le parti «Tracking the Typical Cycle», «Tracking the Stages: Market Action», «Tracking the Stages: Business Cycle Benchmarks» e «Gold and the Business Cycle»; numeri dei capitoli e pagine **non verificati**, testo non consultato. Lo stesso schema è in *Technical Analysis Explained*, 5ª edizione (McGraw-Hill, 2014), capitolo 2 «Financial Markets and the Business Cycle» (pagina 17 secondo l'indice; testo non consultato). La pagina «InterMarket Review» di pring.com parla della «chronological bond, stock and commodity sequence» e del modello a sei stadi.
- **I sei stadi**, come li riassumono gli articoli di Pring Turner su Advisor Perspectives (2013; ho potuto leggerne solo gli estratti dei motori di ricerca): I obbligazioni su, azioni e materie prime giù; II obbligazioni e azioni su; III tutti e tre su; IV obbligazioni giù, azioni e materie prime su; V solo materie prime su; VI tutti e tre giù. Pring stesso avverte che a volte gli stadi si saltano o si torna indietro. Pring classifica gli stadi con i suoi «barometri» (indicatori economici e di mercato): non sono pubblici, quindi **non sono riproducibili**. Qui uso due semplici sostituti (media a 12 mesi e direzione dell'ultima svolta a soglia).
- **Cosa non è verificabile**: (a) le pagine esatte; (b) quali serie usavano Pring e Murphy per «commodities» (di solito indici come il CRB, che hanno licenze non libere e qui non si usano); (c) la regola di Pring per classificare gli stadi.

## Dati e licenze

Tutte le serie sono mensili, perché solo così c'è la storia lunga. Nessun buco in nessuna serie (controllato mese per mese).

| Ruolo | Serie | Fonte e licenza | Periodo | Note |
| --- | --- | --- | --- | --- |
| Obbligazioni | GS10, rendimento del decennale a scadenza costante, media mensile | FRED / Fed H.15, pubblico dominio | 04/1953 – 10/2026 | prezzo = rendimento con il segno cambiato. Controlli: media mensile di DGS10, scarto massimo 0,005 punti su 778 mesi; Yahoo ^TNX, 0,048 |
| Azioni | S&P 500, media mensile delle chiusure (solo prezzo) | Yahoo ^GSPC (uso personale, i dati restano in `cache/`) | 12/1927 – 10/2026 | controllo con il Dow Jones 1928-1968 (NBER Macrohistory): a 15% 21 svolte su 25 entro 2 mesi |
| Materie prime (principale) | PPI «Unprocessed goods for intermediate demand» (WPUID62) | FRED / BLS, pubblico dominio | 01/1947 – 10/2026 | è l'ex «Crude materials» (WPUSOP1000, chiusa nel 2015): uguale fino al 2010, poi scarti fino a 0,8 per revisioni. **Non è un indice di mercato**: prezzi alla produzione rilevati dal BLS, rivisti per 4 mesi |
| Controllo | PPIACO (tutte le merci) | FRED / BLS, pubblico dominio | 1913 – | molto liscia: 2 svolte a 15% dal 1954 |
| Controllo | WPU102 (metalli non ferrosi) | FRED / BLS, pubblico dominio | 1926 – | |
| Controllo | WTISPLC (petrolio WTI) | FRED, citazione richiesta | usato dal 1974 | prima del 1974 prezzi amministrati |
| Controllo | PALLFNFINDEXM (indice IMF), PCOPPUSDM (rame) | FRED / IMF, citazione richiesta | dal 1992 | |
| Controllo (aggiunto dopo) | World Bank Pink Sheet: indici «Non-energy» e «Metals & Minerals» | World Bank, CC BY 4.0 | 01/1960 – 10/2026 | prezzi di mercato |
| Dollaro | TWEXMMTH (valute principali) fino al 12/2019, poi variazioni di DTWEXAFEGS | FRED / Fed G.5, pubblico dominio | 01/1973 – 10/2026 | nel 2006-2019 le variazioni mensili delle due serie hanno correlazione 0,9988 |
| Recessioni | USRECM (NBER) | FRED | 1854 – | 12 picchi e 12 minimi dal 1947 |
| Solo prova di Bry-Boschan | INDPRO (produzione industriale) | FRED / Fed, pubblico dominio | 1919 – | |

Oro: la serie LBMA non è più su FRED; c'è nel Pink Sheet della World Bank (CC BY 4.0, mensile dal 1960, prezzo fisso a 35 dollari fino al 1968-1971). Non è nell'ipotesi a tre mercati e non l'ho usato nei test. Nessun dato da TradingView, StockCharts, CME, ICE o Bloomberg. I file scaricati restano in `cache/` (esclusa da git): nel repository ci sono solo i numeri derivati.

**Dato importante sulla serie principale**: WPUID62 non ha oscillazioni del 15% tra il 1956 e il 1983 (21 svolte a 15% dal 1954, la prima del 1984 dopo quella del 1955). Con la definizione a soglia, quindi, nella prima metà del campione le materie prime quasi non hanno cicli. Per questo ho aggiunto come controllo i due indici di mercato della World Bank, dichiarandolo (vedi sotto).

## Metodo

**Punti di svolta, definizione A (soglia, simmetrica).** Sulla serie mensile un massimo è confermato quando la serie scende di almeno X sotto il valore più alto dall'ultimo minimo; un minimo quando sale di almeno X sopra il valore più basso dall'ultimo massimo. Massimi e minimi si alternano. X = 15, 20, 30% per azioni e materie prime, 0,75, 1 e 1,5 punti per il rendimento, 10, 15, 20% per il dollaro. Il **mese di conferma** è quello in cui si completa il movimento: è quando, dal vivo, si sarebbe saputo. Servono 12 mesi di storia prima del punto. L'ultimo estremo non confermato è «in corso». Nota: diversamente dalla definizione «massimo dei 12 mesi prima», questa conta anche i rimbalzi dentro un mercato orso, purché ampi almeno X.

**Punti di svolta, definizione B (Bry-Boschan 1971, mensile).** Valori anomali sostituiti dalla curva di Spencer; estremi locali (±5 mesi) della media mobile a 12 mesi; rifinitura sulla curva di Spencer, sulla media a 3 mesi e sulla serie (±5, ±5, ±4 mesi); fasi di almeno 5 mesi, cicli di almeno 15; niente punti nei primi e negli ultimi 6 mesi. È la procedura che il NBER ha pubblicato per replicare le sue date (il NBER poi decide con un comitato, non con l'algoritmo). La mia è una versione semplificata (media corta fissa a 3 mesi): sulla produzione industriale ritrova entro 6 mesi 10 picchi NBER su 12 e 12 minimi su 12 dal 1947, più 8 svolte minori; su tutte le serie rispetta alternanza, fase minima e ciclo minimo. Non ha un mese di conferma dal vivo, quindi non entra nel criterio 4.

**Cicli comuni.** M2 (principale): i punti dello stesso tipo delle tre serie in ordine di data; il primo punto libero apre un ciclo e per ogni altra serie entra il suo primo punto libero entro 18 mesi. M1 (controllo): per ogni picco o minimo NBER il punto più vicino di ogni serie entro ±24 mesi.

**Ordine.** «Perfetto» se obbligazioni < azioni < materie prime (mesi, in senso stretto). Coppia (A, B): «B dopo A», «insieme» (stesso mese) o «B prima».

**Modello nullo.** Spostamento circolare: i punti di ogni serie, dentro il periodo comune (04/1954 – 10/2026, 871 mesi), si spostano tutti insieme di un numero casuale di mesi e si riavvolgono. Restano uguali il numero di cicli e le loro durate; gli allineamenti tra serie si rompono. 2000 ripetizioni. Come secondo modello, per l'ordine perfetto, le permutazioni dell'ordine dentro i cicli completi. Correzione per i test multipli: Benjamini-Hochberg.

## Interpretazioni dei criteri (scritte prima di vedere i risultati veri, 22/11/2026)

1. **Serie principali**: obbligazioni = decennale USA GS10 (prezzo = rendimento con il segno cambiato); azioni = S&P 500 (media mensile delle chiusure); materie prime = PPI delle materie prime grezze (WPUID62, l'ex «crude materials»). Le altre serie di materie prime (PPIACO, metalli non ferrosi, petrolio dal 1974, indice IMF dal 1992) sono controlli e non entrano nei verdetti.
2. **Soglie «15, 20, 30%»** (criterio 1): valgono così per azioni e materie prime; per i tassi le soglie corrispondenti sono 0,75, 1 e 1,5 punti di rendimento; per il dollaro 10, 15 e 20%.
3. **Cicli comuni**: metodo principale M2 (senza ancore, punti dello stesso tipo entro 18 mesi dal primo del ciclo); M1 (attorno ai picchi e ai minimi NBER, ±24 mesi) è un controllo.
4. **Criterio 1, statistica**: «l'ordine si ripete» si misura con la concordanza di Kendall (W) tra i cicli completi; il test usa la statistica di Friedman m·(n−1)·W, che cresce anche con il numero di cicli allineati. Regge se p < 0,05 ai massimi e ai minimi ad almeno 2 soglie su 3. Lo stesso schema si applica, come verdetto a parte, all'ordine di Pring (numero di cicli in ordine perfetto obbligazioni → azioni → materie prime).
5. **Criterio 2**: le coppie sono le tre dell'ipotesi (obbligazioni → azioni, azioni → materie prime, obbligazioni → materie prime), ai massimi e ai minimi, alle tre soglie: 18 test, corretti insieme con Benjamini-Hochberg. Il p viene dal modello nullo sul numero netto («B dopo A» meno «B prima di A»). «Vale in entrambe le metà» = quota «B dopo A» ≥ 75% sia fino al 1985 sia dal 1986.
6. **Criterio 3**: l'ordine stimato è quello dei ranghi medi nei cicli completi 1954-1985; si misura quante coppie dei cicli 1986-oggi rispettano quell'ordine (netto concordi − discordi), contro lo spostamento circolare dei punti 1986-oggi. Regge se p < 0,05 ai massimi e ai minimi ad almeno 2 soglie su 3.
7. **Criterio 4**: dal mese di conferma della svolta del «guida», il «seguace» gira nello stesso verso entro 18 mesi più spesso della frequenza di base (quota dei mesi seguiti da una svolta dello stesso tipo del seguace entro 18 mesi), con p binomiale < 0,05 dopo Benjamini-Hochberg (18 test), anticipo mediano ≥ 3 mesi dalla conferma, e quota sopra la base in entrambe le metà.
8. **Cambio fatto dopo le prove sintetiche e prima dei risultati veri**: all'inizio il modello nullo confrontava le quote (per esempio «quota di cicli in ordine perfetto»). Sulle serie sintetiche con un ritardo noto il test non trovava quasi mai il ritardo, perché nel modello nullo si formano pochi cicli e una quota su 1-2 cicli vale spesso 100%. Si è passati ai conteggi (Friedman, numero di cicli perfetti, netto delle coppie), che sulle stesse serie trovano il ritardo e su serie indipendenti rifiutano circa il 5% delle volte.

9. **Aggiunte fatte dopo aver visto i primi risultati** (sono controlli, non cambiano i verdetti): gli indici di mercato della World Bank; la sensibilità alla finestra dei cicli comuni (12, 24, 36, 48 mesi); il fuori campione per coppie (verso prevalente di ogni coppia nel 1954-1985 contro il 1986-oggi); la correzione BH sui 96 test delle serie di controllo; le metà del campione per tre serie di controllo.

## Risultati

### 1. Punti di svolta (dal 04/1954; massimi + minimi)

| Serie | 15% · 0,75 pt | 20% · 1 pt | 30% · 1,5 pt | Bry-Boschan |
| --- | --- | --- | --- | --- |
| Obbligazioni (GS10) | 43 | 41 | 21 | 37 |
| Azioni (S&P 500) | 24 | 14 | 6 | 26 |
| Materie prime (WPUID62) | 21 | 17 | 9 | 33 |
| Dollaro (10 · 15 · 20%, dal 1974) | 17 | 7 | 5 | 30 |

Gli elenchi con date, valori e mese di conferma sono in `risultati.json` (`punti`). Le medie mensili smussano i cali: per esempio a 20% l'S&P 500 ha solo 7 massimi dal 1954 (1961, 1968, 1973, 1987, 2000, 2007, 2021), perché in media mensile i cali del 1957, 1966, 1980-82, 1990 e 2020 restano sotto il 20%.

### 2. Ordine nei cicli comuni (criterio 1)

| Definizione | Tipo | Cicli completi | In ordine di Pring | Attesi per caso | p ordine | W | p concordanza |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 15% · 0,75 pt | massimi | 1 | 0 | 0,43 | 1,000 | — | 1,000 |
| 15% · 0,75 pt | minimi | 2 | 1 | 0,44 | 0,366 | 0,06 | 0,716 |
| 20% · 1 pt | massimi | 1 | 0 | 0,23 | 1,000 | — | 1,000 |
| 20% · 1 pt | minimi | 1 | 0 | 0,22 | 1,000 | — | 1,000 |
| 30% · 1,5 pt | massimi | 0 | 0 | 0,04 | 1,000 | — | 1,000 |
| 30% · 1,5 pt | minimi | 0 | 0 | 0,02 | 1,000 | — | 1,000 |
| Bry-Boschan | massimi | 5 | 2 | 0,72 | 0,168 | 0,12 | 0,588 |
| Bry-Boschan | minimi | 5 | 2 | 0,73 | 0,167 | 0,07 | 0,672 |

Con l'ancora NBER (M1) è uguale o peggio: con Bry-Boschan 0 cicli in ordine perfetto su 3 ai massimi e 0 su 5 ai minimi. I cicli completi con Bry-Boschan: massimi 1958-59 (obbligazioni 04/1958, materie prime 05/1958, azioni 07/1959), 1961-62 (in ordine), 1966-67, 1983-84 (in ordine), 2007-08; minimi 1960 (obbligazioni, materie prime, azioni), 1966-67 (in ordine), 1974-75, 1981-82 (in ordine), 2009-10.

### 3. Coppie guida-seguace (criterio 2)

Nessuna delle 18 coppie regge. La più forte è azioni → materie prime ai massimi a 30%: 2 casi su 2 (p = 0,019, q = 0,34), troppo pochi. Le coppie con più casi:

| Definizione | Tipo | Coppia | Casi | B dopo A | B prima | p | 1954-85 | 1986-oggi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15% · 0,75 pt | massimi | obbligazioni → azioni | 7 | 4 | 3 | 0,656 | 3/4 | 1/3 |
| 15% · 0,75 pt | minimi | obbligazioni → azioni | 8 | 4 | 4 | 0,774 | 3/4 | 1/4 |
| 15% · 0,75 pt | minimi | obbligazioni → materie prime | 6 | 3 | 3 | 0,714 | 0/0 | 3/6 |
| Bry-Boschan | massimi | obbligazioni → azioni | 8 | 5 | 3 | 0,347 | 4/6 | 1/2 |
| Bry-Boschan | massimi | azioni → materie prime | 8 | 6 | 2 | 0,144 | 4/5 | 2/3 |
| Bry-Boschan | minimi | obbligazioni → azioni | 10 | 7 | 3 | 0,108 | 7/8 | 0/2 |
| Bry-Boschan | minimi | obbligazioni → materie prime | 11 | 5 | 6 | 0,804 | 3/4 | 2/7 |

Tabella completa (18 righe con q di BH) in `tabelle.md`, T3.

### 4. Stabilità

- **1954-1985**: con le soglie i cicli completi sono 0 (le materie prime non hanno oscillazioni del 15%). Con Bry-Boschan 4 ai massimi e 4 ai minimi, 2 e 2 in ordine di Pring (p = 0,062 e 0,059). Obbligazioni prima delle azioni ai minimi 7 volte su 8 (p = 0,015).
- **1986-2026**: con Bry-Boschan un solo ciclo completo ai massimi e uno ai minimi, nessuno in ordine; obbligazioni prima delle azioni ai minimi 0 volte su 2.
- **2000-2026**: idem (1 e 1 cicli completi, 0 in ordine).
- **Cambio di regime**: la correlazione dei rendimenti mensili azioni-obbligazioni è +0,23 fino al 1999 e −0,22 dal 2000; sulla finestra mobile di 60 mesi diventa negativa per la prima volta a 05/2001 e resta negativa nel 92% dei mesi 2000-2020. Ad ottobre 2026 è di nuovo positiva (+0,32), come prima del 2000.
- **Serie di mercato**: con Bry-Boschan, ai minimi, metalli non ferrosi 5 cicli in ordine su 7 (1954-85, p = 0,002) e 0 su 2 (1986-oggi); indice World Bank non energetico 4 su 5 (p = 0,001) e 0 su 2; metalli e minerali World Bank 3 su 5 (p = 0,004) e 0 su 2. Sui 96 test delle serie di controllo solo 2 restano sotto 0,05 dopo BH (q = 0,048, entrambi Bry-Boschan, minimi, tutto il campione), e sono dovuti alla prima metà.
- **Finestra dei cicli comuni**: allargarla non fa emergere l'ordine; a 48 mesi, 20%, ai massimi 3 cicli in ordine su 4 (p = 0,029), ma ai minimi 0 su 3; con Bry-Boschan nessun p sotto 0,05 a 12, 24, 36 o 48 mesi (il più basso 0,054, minimi a 36 mesi).

### 5. Fuori campione (criterio 3)

Con le soglie l'ordine 1954-1985 **non si può stimare** (0 cicli completi). Con Bry-Boschan l'ordine stimato sul 1954-1985 è proprio quello di Pring (obbligazioni → azioni → materie prime, 4 cicli completi ai massimi e 4 ai minimi), ma nel 1986-oggi c'è un solo ciclo completo per tipo e va contro (netto −1 ai massimi, p = 0,75; −2 ai minimi, p = 0,87). Controllo per coppie (aggiunto dopo): nessuno dei 24 confronti è sotto 0,05 dopo BH; il verso prevalente 1954-1985 di obbligazioni → azioni ai minimi (7 su 8) nel 1986-oggi si rovescia (0 su 2).

### 6. Utilità (criterio 4)

Dal mese in cui la svolta del guida è confermata, il seguace fa una svolta dello stesso tipo nei 18 mesi seguenti:

| Soglia | Tipo | Coppia | Svolte del guida | Seguite | Quota | Base | p | Anticipo mediano |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20% · 1 pt | massimi | obbligazioni → azioni | 20 | 4 | 20% | 15% | 0,346 | 11,5 mesi |
| 20% · 1 pt | minimi | obbligazioni → azioni | 20 | 2 | 10% | 15% | 0,821 | 14 mesi |
| 20% · 1 pt | massimi | azioni → materie prime | 7 | 0 | 0% | 17% | 1,000 | — |
| 20% · 1 pt | minimi | azioni → materie prime | 7 | 1 | 14% | 19% | 0,774 | 14 mesi |
| 20% · 1 pt | massimi | obbligazioni → materie prime | 20 | 5 | 25% | 17% | 0,244 | 8 mesi |
| 20% · 1 pt | minimi | obbligazioni → materie prime | 20 | 6 | 30% | 19% | 0,168 | 12,5 mesi |

Nessuna delle 18 righe regge (q di BH ≥ 0,779). Il caso con il p più basso, obbligazioni → materie prime ai minimi a 30% (3 su 10 contro la base del 9%, p = 0,047), non passa la correzione e nel 1954-1985 vale 0 su 4.

### 7. Dollaro contro materie prime (1974-oggi)

| Soglie (materie prime · dollaro) | Svolte materie prime | Con svolta opposta del dollaro entro 12 mesi | Per caso | p |
| --- | --- | --- | --- | --- |
| 15% · 10% | 20 | 40% | 33% | 0,309 |
| 20% · 15% | 16 | 19% | 14% | 0,388 |
| 30% · 20% | 9 | 11% | 10% | 0,669 |

Variazioni a 12 mesi: correlazione −0,29 su tutto il periodo (p = 0,0005 con lo spostamento circolare), −0,05 fino al 1999, −0,44 dal 2000. **Descrittivo**: il legame inverso c'è nelle variazioni, soprattutto dal 2000, ma non come regola sui tempi delle svolte.

### 8. Stadi di Pring nella storia

Con la media a 12 mesi (871 mesi dal 1954): stadio I 49 mesi, II 144, III 145, IV 229, V 94, VI 36; combinazioni fuori dai sei stadi (obbligazioni e materie prime su con azioni giù, o il contrario) 20% dei mesi, contro il 23% atteso se le tre direzioni fossero indipendenti (p = 0,14). Quando lo stadio cambia, va «avanti di uno» nel 53% dei cambi contro il 44% atteso (p = 0,012); con le direzioni a soglia non si vede (51% contro 49%, p = 0,39; 50% contro 49%, p = 0,48). Descrittivo.

### 9. Oggi (solo descrizione)

| Serie | Ultimo mese | Valore | Media 12 mesi | Direzione con la media | Ultima svolta (soglia media) | Direzione con la soglia |
| --- | --- | --- | --- | --- | --- | --- |
| Obbligazioni (rendimento GS10) | 10/2026 | 5,13% | 4,46% | giù (rendimento sopra la media) | massimo del prezzo 09/2024 (rendimento 3,72%) | giù |
| Azioni (S&P 500, media mensile) | 10/2026 | 7.727 | 7.207 | su | minimo 10/2022 | su |
| Materie prime (WPUID62) | 10/2026 | 279,8 | 275,9 | su | minimo 09/2024 | su (massimo in corso 05/2026, 297,5) |
| Dollaro | 10/2026 | 95,9 | 93,7 | su | minimo 08/2011 (soglia 15%) | su |

Tutte e tre le classificazioni danno lo **stadio IV** (obbligazioni giù, azioni e materie prime su) da marzo 2026 con la media a 12 mesi, da febbraio con la soglia bassa, da settembre con la soglia media. È **ambiguo** per tre motivi: l'S&P 500 il 20/11/2026 chiude a 6.910, −11,6% dal massimo del 06/10/2026 (7.819), anche se la media di novembre fino al 20 (7.436) è ancora sopra la media a 12 mesi (7.265); le materie prime sono sopra la media di appena l'1,4% e il dato di ottobre del PPI è provvisorio (si rivede per 4 mesi); il decennale giornaliero è 5,04% il 19/11/2026. Un calo delle azioni sotto la media porterebbe allo stadio V, un calo anche delle materie prime al VI. Dato che l'ordine degli stadi non si è dimostrato stabile, questo stadio non dice cosa verrà dopo.

## Verdetti

| Criterio | Verdetto | Perché |
| --- | --- | --- |
| 1. Ordine che si ripete (concordanza) | **non regge** | p ≥ 0,72 alle tre soglie, massimi e minimi (0,59 e 0,67 con Bry-Boschan); 0 soglie su 3 sotto 0,05 |
| 1-bis. Ordine di Pring (cicli in ordine perfetto) | **non regge** | 1 ciclo in ordine su 5 completi con le soglie; 2+2 su 5+5 con Bry-Boschan (p = 0,17) |
| 2. Coppia guida-seguace | **non regge** | 0 coppie su 18; q minimo 0,34; nessuna con almeno 8 casi e 75% |
| 3. Fuori campione | **non regge** | non stimabile con le soglie; con Bry-Boschan l'ordine 1954-85 (= Pring) non si ripete nel 1986-oggi (p = 0,75 e 0,87) |
| 4. Utilità | **non regge** | 0 righe su 18 sopra la base dopo la correzione |
| Dollaro opposto alle materie prime | **descrittivo** | variazioni a 12 mesi opposte (−0,29), solo dal 2000; non una regola sulle svolte |
| Ordine di Pring ai minimi 1954-1985 con indici di mercato | **descrittivo, solo nel passato** | forte nel 1954-1985, assente dopo |

## Controlli

- **Ricalcolo indipendente** (`script/verifica.mjs`, JavaScript, altro codice, legge i file grezzi): 0 differenze su 238 punti di svolta (date, tipo, conferma), su cicli, coppie e ordini perfetti alle tre soglie, sulle 18 righe del criterio 4 (casi, colti, base), sulle correlazioni azioni-obbligazioni e sulle direzioni di oggi; i 6 p delle coppie a 20% rifatti con un altro generatore casuale coincidono entro 0,03 (errore Monte Carlo). Una prova con 4 valori alterati di proposito in una copia di `risultati.json` li trova tutti e 4. Bry-Boschan non è ricalcolato in modo indipendente: è controllato con le proprietà e con le date NBER (sopra).
- **I test sanno trovare e sanno rifiutare** (`script/prove.py`, `prove.json`): su 50 terne sintetiche con un ritardo noto (obbligazioni 12 mesi prima, azioni 6 mesi prima delle materie prime) il metodo trova l'ordine con p < 0,05 nel 100% dei casi alle soglie 15% e 20% e con Bry-Boschan, nel 70-76% a 30%, e i ritardi mediani trovati sono 5-6,5 e 11-12 mesi. Su 300 terne indipendenti con gli stessi cicli rifiuta tra lo 0,3% e il 6,7% delle volte, secondo il test e la soglia (atteso 5%).
- **Seconde fonti dei dati**: GS10 contro DGS10 e Yahoo ^TNX; WPUID62 contro WPUSOP1000; S&P 500 contro il Dow Jones 1928-1968; raccordo del dollaro (numeri nella tabella dei dati).

## Limiti

- **Pochi cicli.** Dal 1954 ci sono 10 recessioni NBER (10 picchi e 11 minimi nel periodo dei test); i cicli in cui girano tutte e tre le serie sono da 0 a 5 per tipo. Con così pochi casi un ordine vero ma debole non si vedrebbe; le prove sintetiche mostrano però che un ordine regolare come quello descritto da Pring (ritardi di mesi, non di anni) si vedrebbe.
- **Definizioni.** Medie mensili (smussano i cali brevi come il 1987 e il 2020); soglie fisse in punti per i tassi (0,75 punti nel 1960 valgono molto più che nel 1980); finestra di 18 mesi, che non raccoglie sequenze di più anni (per esempio obbligazioni 2003, azioni 2007, materie prime 2008: tre anni e mezzo). Le finestre fino a 48 mesi non cambiano il quadro.
- **Materie prime.** Nessuna serie libera corrisponde a quelle che usavano Pring e Murphy (indici CRB, Journal of Commerce). La serie principale (PPI) è un prezzo alla produzione, non un prezzo di mercato, ed è rivista; per 28 anni non ha oscillazioni del 15%. Gli indici di mercato della World Bank partono dal 1960.
- **Revisioni.** PPI rivisti per 4 mesi (l'ultimo dato è provvisorio); date NBER decise con mesi di ritardo (M1 usa quindi informazione del futuro; M2 no). GS10 e S&P 500 non si rivedono.
- **Bry-Boschan** è una versione semplificata della procedura del 1971.
- **S&P 500 di Yahoo**: solo prezzo; i dati prima del 1950 non entrano nei test.

## Rifare tutto

```
node ricerca/cicli/pring/script/scarica.mjs --refresh      # dati in ricerca/cicli/pring/cache/ (esclusa da git)
python3 -I ricerca/cicli/pring/script/analisi.py --rip 2000 # scrive risultati.json (circa 30 secondi)
python3 -I ricerca/cicli/pring/script/prove.py --rip-null 500 --rip-ind 300 --rip-rit 50   # prove.json (circa 3 minuti)
node ricerca/cicli/pring/script/verifica.mjs                # ricalcolo indipendente: deve dire «0 differenze»
python3 -I ricerca/cicli/pring/script/tabelle.py > ricerca/cicli/pring/tabelle.md
```

Con `--refresh` i dati di FRED e Yahoo si riscaricano e gli ultimi mesi possono cambiare (revisioni dei PPI, nuovi mesi): i numeri di questa sintesi sono quelli dei dati scaricati il 22/11/2026.
