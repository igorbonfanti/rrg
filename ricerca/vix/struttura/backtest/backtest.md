# VIX: struttura a termine e credito (fase 1, backtest)

Fase di verifica: l'app non è stata toccata. Dati FRED scaricati il 09/11/2026; ultima seduta usata il 05/11/2026.
Tutti i numeri escono da `backtest.mjs`, che scrive `risultati.json` e usa le funzioni dell'app (`js/vix.js`: `vxSeries`, `align`, `episodes`, `outcomes`, `dist`, `quantile`, `crisisOf`, `expandingPct`).
`verifica.py` ricalcola da zero i numeri chiave, senza importare `js/vix.js`. Risultato: **454 controlli, 0 differenze**. I controlli coprono le quote di backwardation, i gruppi di Q1, gli 11 eventi di Q2 (date, rendimenti, calo, minimo già fatto, uscite false, coppie con il VIX ≥ 30) e i gruppi di Q3 (variazione a 21 sedute e percentile).

```
# i CSV di FRED sono già in cache/ (VXVCLS, BAA10Y, BAMLH0A0HYM2), presi da fred.stlouisfed.org/graph/fredgraph.csv?id=…
node ricerca/vix/struttura/backtest/backtest.mjs        # → risultati.json + tabelle a schermo
python3 -I ricerca/vix/struttura/backtest/verifica.py    # ricalcolo indipendente
```

## Idea e domande

L'idea viene da un analista che usa i futures sul VIX e gli spread high yield: aggiungere alla vista «8 VIX» la **struttura a termine** della volatilità e lo **stress del credito**.

- **Struttura a termine.** R = VIX / VIX3M alla chiusura. Il VIX3M è FRED `VXVCLS` e c'è dal 04/12/2007. R ≥ 1 è backwardation (paura immediata); R < 1 è contango (situazione normale).
- **Credito.** FRED `BAA10Y`, cioè il rendimento delle obbligazioni Moody's Baa meno il Treasury a 10 anni, dal 1986. L'HY OAS di FRED (`BAMLH0A0HYM2`) copre solo gli ultimi 3 anni e serve solo come confronto descrittivo.

Tutto è allineato alle sedute dell'indice. Un valore mancante resta mancante. Dal 2007-12-04 nessuna seduta dell'S&P 500 è senza R. BAA10Y manca in 79 sedute su 9.280 (feste del mercato dei titoli di Stato), ma nessuna di queste cade su un episodio.

Le definizioni dell'app restano quelle: episodio, ingresso alla chiusura del giorno dopo il segnale e calo successivo entro 252 sedute dall'ingresso.

- **Q1.** La backwardation aggiunge informazione al solo livello del VIX?
- **Q2.** Il ritorno al contango è un ingresso migliore del segnale del VIX?
- **Q3.** Il credito distingue i cali profondi?

## Criterio di successo (deciso prima dei risultati)

Si confrontano due gruppi, per esempio «con backwardation» e «senza».

1. Servono almeno **8 casi con 12 mesi completi in ciascun gruppo**. Altrimenti il risultato è **«non valutabile»**, che non è un successo.
2. Deve esserci almeno una di queste differenze:
   - mediana a 252 sedute: almeno 5 punti;
   - quota di positivi a 252 sedute: almeno 15 punti;
   - calo mediano: almeno 5 punti.
3. La differenza che supera la soglia deve avere lo **stesso segno in almeno 2 dei sottoperiodi** in cui entrambi i gruppi hanno casi:
   - per R: 2008-2012, 2013-2019, 2020-oggi;
   - per il credito: 1990-2007, 2008-2015, 2016-oggi.
4. Il risultato deve reggere in **tutte le varianti** di sensibilità.

Precisazioni fissate prima di vedere i numeri:

- In Q1 e Q3 conta una differenza in entrambe le direzioni, perché la domanda è se l'informazione aggiunge qualcosa. In Q2 conta solo la direzione «l'uscita dalla backwardation è migliore».
- **Q1, varianti aggiunte.** La regola chiesta, cioè R ≥ 1 al segnale o nelle 5 sedute dopo, guarda fino a 4 sedute oltre l'ingresso: usa dati futuri. Ho quindi aggiunto:
  - v1: solo R alla chiusura del segnale;
  - v2: la stessa finestra, ma con ingresso alla chiusura della seduta dopo la finestra (p+6);
  - v3 e v4: soglia di R a 0,95 e a 1,05.
- **Q2, lettura della regola.** Un episodio di backwardation inizia alla prima chiusura con R ≥ s dopo almeno Q chiusure tutte con R < s. Dentro l'episodio, l'evento è la prima chiusura con R < s subito dopo almeno K chiusure consecutive con R ≥ s. Si conta un evento per episodio, come per gli episodi del VIX.
- **Q2, varianti descrittive.**
  - «Stretta»: vale solo se il primo tratto di backwardation dura almeno K sedute.
  - «Tutte»: conta ogni uscita dopo almeno K sedute, anche più di una per episodio. **Questa variante l'ho aggiunta dopo aver visto i primi risultati**, quindi è solo descrittiva.
- **Q2, criterio.** È il confronto appaiato con l'episodio di VIX ≥ 30 della stessa crisi: stessa etichetta `CRISES` oppure periodi sovrapposti; se ce n'è più d'uno, l'ultimo partito entro la data dell'evento. Il confronto con la base di tutte le sedute dal 2008 e quelli con VIX ≥ 20, 25 e 40 sono contesto.
- **Q2, fuori campione.** Tra le 18 combinazioni K ∈ {3, 5, 10}, s ∈ {0,95; 1; 1,05} e Q ∈ {21, 63} si sceglie quella con la mediana a 252 sedute più alta sugli eventi fino al 2016, con almeno 3 eventi a 12 mesi. Poi si guarda come va dal 2017.
- **Verdetto complessivo.** Se la regola principale non passa, oppure è non valutabile, quello è il verdetto. Se passa, devono passare anche tutte le varianti.
  - Questa regola di aggregazione l'ho scritta dopo il primo calcolo. Prima, una variante con meno di 8 casi rendeva «non valutabile» anche una domanda la cui regola principale «non passa».
  - Le soglie non sono cambiate e nessun verdetto si è spostato verso il successo.

## Q1. La backwardation aggiunge informazione al livello del VIX?

**Quanto è comune.** Dal 04/12/2007 il VIX è sopra il VIX3M in **479 sedute su 4.761 (10,1%)**. Sono 133 tratti consecutivi, che diventano **46 periodi distinti** se si uniscono i tratti separati da meno di 21 sedute di contango. Per confronto, il VIX ≥ 30 copre 446 sedute (9,4%) in 51 tratti e 20 periodi.

**Episodi dell'app dal 2008, regola del brief.** Rendimento a 252 sedute: mediana (positivi/casi con 12 mesi). Il calo è la mediana del calo successivo.

| Indice | VIX ≥ | episodi | con backwardation | 252 | 63 | calo | senza backwardation | 252 | calo | verdetto |
|---|---|---|---|---|---|---|---|---|---|---|
| S&P 500 | 20 | 15 | 13 (12 con 12 m) | +16,4 (11/12) | +7,6 (9/12) | −2,3 | 2 | +28,0 (2/2) | −3,1 | non valutabile |
| S&P 500 | 25 | 17 | 15 (13) | +15,5 (12/13) | +0,9 (7/14) | −12,8 | 2 | +6,2 (1/2) | −9,3 | non valutabile |
| S&P 500 | 30 | 13 | **13 (12)** | +17,2 (10/12) | +5,2 (10/13) | −6,4 | **0** | — | — | non valutabile |
| S&P 500 | 40 | 7 | **7 (7)** | +19,6 (6/7) | +7,6 (4/7) | −6,3 | **0** | — | — | non valutabile |
| Nasdaq-100 | 20 | 15 | 13 (12) | +24,0 (12/12) | +7,8 (11/12) | −1,7 | 2 | +34,7 (2/2) | −4,1 | non valutabile |
| Nasdaq-100 | 25 | 17 | 15 (13) | +18,8 (12/13) | +3,6 (10/14) | −8,4 | 2 | −2,5 (1/2) | −14,7 | non valutabile |
| Nasdaq-100 | 30 | 13 | 13 (12) | +28,7 (10/12) | +7,9 (10/13) | −6,0 | 0 | — | — | non valutabile |
| Nasdaq-100 | 40 | 7 | 7 (7) | +25,6 (7/7) | +9,7 (5/7) | −5,7 | 0 | — | — | non valutabile |

**Dal 2008 ogni episodio di VIX ≥ 30 o ≥ 40 è in backwardation già alla chiusura del segnale** (13 su 13 e 7 su 7, variante v1). Alle soglie 20 e 25 gli episodi senza backwardation sono solo 2 o 3. Questi episodi sono:

- VIX ≥ 20: 13/06/2016 e 19/10/2023, più il 02/11/2026 nella variante v1;
- VIX ≥ 25: 18/05/2012 e 20/09/2021.

Il risultato non cambia con le altre varianti: tutte le varianti sono non valutabili, perché il gruppo «senza» ha al massimo 6 episodi (v4, soglia 1,05, alla soglia del VIX 20).

**Confronto per sedute dal 2008.** Ingresso il giorno dopo. Il calo è la mediana.

| Sedute | S&P 500: n | 63 | 252 | calo | Nasdaq-100: 252 | calo |
|---|---|---|---|---|---|---|
| tutte (base) | 4.741 | +3,8 | +13,8 (3.761/4.489) | −5,9 | +20,6 (3.918/4.489) | −6,3 |
| R ≥ 1 | 478 | +5,0 | +18,1 (386/466) | **−10,2** | +26,9 (402/466) | −8,0 |
| R < 1 | 4.263 | +3,7 | +13,4 (3.375/4.023) | −5,6 | +20,1 (3.516/4.023) | −6,0 |
| VIX ≥ 30 | 446 | +7,4 | +25,2 (403/444) | −5,5 | +39,0 (418/444) | −5,9 |
| VIX ≥ 30 e R ≥ 1 | 249 | +6,5 | +25,4 (219/247) | −7,8 | +40,1 (233/247) | −6,8 |
| VIX ≥ 30 e R < 1 | 197 | +7,8 | +23,6 (184/197) | −3,7 | +36,7 (185/197) | −4,2 |
| R ≥ 1 e VIX < 30 | 229 | +4,4 | +10,2 (167/219) | **−11,5** | +17,4 (169/219) | −10,1 |

Le sedute si sovrappongono: sono 46 periodi distinti, non 478 casi. Il dato più interessante è descrittivo. La backwardation **con il VIX sotto 30** è seguita da un calo successivo mediano più profondo, −11,5 contro −5,9 della base per l'S&P 500. È un'ipotesi da verificare con episodi indipendenti, non un risultato.

**Verdetto Q1: scarta come statistica.** Dal 2008 a VIX ≥ 30 la backwardation c'è sempre, quindi sopra le soglie dell'app non aggiunge niente. Alle soglie basse mancano i casi senza backwardation. Si può mostrare come **contesto** (R di oggi, in backwardation sì o no), senza statistiche di rendimento. Oggi, 05/11/2026, R vale 28,18 / 25,55 = **1,10**: backwardation.

## Q2. Il ritorno al contango è un ingresso migliore del segnale del VIX?

**Eventi della regola principale** (K = 5, s = 1, Q = 63). Ingresso alla chiusura del giorno dopo. I dati sono dell'S&P 500, tra parentesi il Nasdaq-100.

- *Minimo già fatto*: il minimo nelle 252 sedute dopo l'ingresso non scende sotto il minimo dall'inizio della backwardation.
- *Falsa*: R torna ≥ 1 entro 21 sedute e l'indice fa poi un minimo più basso.

| uscita | inizio backwardation | sedute in backw. | crisi | 21 | 63 | 126 | 252 | calo | minimo già fatto | falsa |
|---|---|---|---|---|---|---|---|---|---|---|
| 21/07/2008 | 30/06/2008 | 12 | 2007-09 crisi finanziaria | −0,2 | −22,8 | −34,2 | −25,3 (−14,1) | −47,0 (−43,1) | no | sì |
| 25/05/2010 | 28/10/2009 | 7 | 2010 euro/flash crash | +0,8 | −1,2 | +10,6 | +23,6 (+28,6) | −4,3 (−3,8) | no (sì) | sì (no) |
| 31/08/2011 | 15/03/2011 | 25 | 2011-12 debito USA/euro | −8,7 | +3,3 | +13,3 | +16,8 (+24,9) | −8,7 (−6,0) | no (sì) | sì (no) |
| 20/10/2014 | 31/07/2014 | 7 | 2014 ottobre | +5,5 | +6,3 | +8,8 | +4,0 (+11,1) | −3,8 (−0,6) | sì | no |
| 02/09/2015 | 29/06/2015 | 9 | 2015-16 Cina/petrolio | +1,8 | +5,0 | +2,6 | +11,7 (+13,3) | −6,3 (−6,8) | no | sì |
| 09/11/2016 | 02/11/2016 | 5 | — | +4,1 | +7,4 | +10,8 | +19,1 (+32,9) | −0,1 (−0,9) | sì | no |
| 14/02/2018 | 02/02/2018 | 8 | 2018 volatilità/Fed | −0,7 | −0,4 | +4,0 | +1,8 (+4,0) | −13,9 (−13,2) | no | sì |
| 01/11/2018 | 10/10/2018 | 7 | 2018 volatilità/Fed | −0,8 | +0,3 | +5,7 | +12,9 (+17,9) | −13,7 (−15,3) | no | sì |
| 24/04/2020 | 27/01/2020 | 43 | 2020 Covid | +5,5 | +12,5 | +20,4 | +45,5 (+58,0) | −2,0 (−1,8) | sì | no |
| 04/11/2020 | 26/10/2020 | 7 | 2020 Covid | +5,2 | +11,5 | +19,3 | +33,8 (+35,5) | −0,0 (−3,8) | sì | no |
| 14/03/2025 | 02/08/2024 | 9 | 2025 dazi | −4,9 | +6,3 | +16,4 | +16,7 (+23,3) | −12,2 (−13,7) | no | sì |

- S&P 500: minimo già fatto in **4 uscite su 11**, uscite false **7 su 11**.
- Nasdaq-100: minimo già fatto in 6 su 11, uscite false 5 su 11.
- In 7 uscite su 11 R torna ≥ 1 entro 21 sedute.

Con «un evento per episodio» la regola **non vede** il fondo dell'ottobre 2008 né il 2022. Non vede neppure l'aprile 2025: quell'episodio era partito ad agosto 2024 e aveva già dato l'uscita del 14/03/2025.

**Confronto (12 mesi: mediana, positivi/casi; calo mediano).**

| Variante | eventi | S&P 500 eventi | base dal 2008 | coppie con VIX ≥ 30 | eventi / segnale VIX ≥ 30 | calo eventi / VIX | evento meglio | verdetto (VIX ≥ 30) |
|---|---|---|---|---|---|---|---|---|
| **principale** K5 s1 Q63 | 11 | +16,7 (10/11), calo −6,3 | +13,8 (84%), −5,9 | 9 | +16,7 (8/9) / +16,5 (8/9) | −8,7 / −12,8 | 6 su 9 | **non passa** |
| K = 3 | 16 | +11,7 (14/15) | | 9 | +17,3 / +16,5 | −6,3 / −12,8 | 5 su 9 | non passa |
| K = 10 | 5 | +27,0 (4/5) | | 5 | +27,0 / +32,1 | −2,0 / −8,3 | 2 su 5 | non valutabile |
| s = 0,95 | 12 | +9,9 (11/12) | | 7 | +10,0 / +16,3 | −8,7 / −12,8 | 6 su 7 | non valutabile |
| s = 1,05 | 7 | +12,3 (7/7) | | 6 | +15,7 / +8,3 | −10,5 / −12,8 | 5 su 6 | non valutabile |
| Q = 21 | 13 | +16,7 (11/13) | | 11 | +16,7 / +16,3 | −12,2 / −12,8 | 7 su 11 | non passa |
| Nasdaq-100, principale | 11 | +23,3 (10/11), calo −6,0 | +20,6 (87%), −6,3 | 9 | +23,3 (8/9) / +22,8 (9/9) | −6,8 / −9,4 | 4 su 9 | **non passa** |

- **Contro la base.** S&P 500: +3,0 punti di mediana, +7,1 punti di positivi, calo uguale (−6,3 contro −5,9). Non passa. Nasdaq-100: +2,7, +3,6 e +0,2: non passa.
- **Contro il segnale del VIX ≥ 30 della stessa crisi.** Le mediane sono quasi uguali, +0,25 punti per l'S&P 500 e +0,5 per il Nasdaq-100. Il calo è meno profondo di 4,0 punti (S&P 500) e 2,6 punti (Nasdaq-100), sotto i 5 richiesti.
- **Le coppie sono deboli.** Lo stesso segnale del VIX serve due uscite (05/02/2018 e 27/02/2020). Diverse uscite arrivano 150-234 sedute dopo il segnale: 21/07/2008 contro 15/08/2007, 01/11/2018 contro 05/02/2018, 14/03/2025 contro 05/08/2024.
- **Contesto, rispetto ai segnali di VIX ≥ 20 e ≥ 25.** Contro questi l'uscita «passa» nella regola principale, con un calo meno profondo di 7-11 punti. Il motivo è che quei segnali arrivano molto prima nella crisi. Contro il VIX ≥ 40: 2 uscite migliori su 7, non valutabile.
- **Variante descrittiva «tutte».** Sono 19 uscite, che si sovrappongono e comprendono dicembre 2008, febbraio e marzo 2009 e aprile 2025. Contro il VIX ≥ 30 passa per l'S&P 500 (+6,8 punti, 12 su 17) ma non per il Nasdaq-100 (10 su 17). L'ho aggiunta dopo aver visto i primi numeri e usa più volte lo stesso segnale del VIX (15/09/2008 tre volte): non conta.
- **Variante «stretta».** Restano 3 eventi: non valutabile.

**Fuori campione** (scelta sugli eventi fino al 2016, verifica dal 2017):

| Indice | scelta (K, s, Q) | eventi fino al 2016 | dal 2017 | base dal 2017 | regola principale dal 2017 |
|---|---|---|---|---|---|
| S&P 500 | 10, 0,95, 21 | 7: +14,9 (6/7), base +12,6 | 9 (8 con 12 m): **+15,2 (7/8)**, calo −11,1; meglio del VIX ≥ 30 in 5 coppie su 8 | +14,7 (84%), calo −6,5 | 5: +16,7 (5/5), calo −12,2 |
| Nasdaq-100 | 5, 1,05, 63 | 3: +21,9 (3/3) | 4: +28,9 (4/4), calo −9,3; meglio in 3 su 4 | +24,2 (86%), calo −7,5 | 5: +23,3 (5/5), calo −13,2 |

Fuori campione la regola scelta per l'S&P 500 rende quanto una seduta qualsiasi, con un calo più profondo. Per il Nasdaq-100 la scelta è stata fatta su 3 eventi e verificata su 4: non dice niente.

**Verdetto Q2: scarta come statistica.** L'uscita dalla backwardation non è un ingresso migliore del segnale del VIX ≥ 30 né della base. Nel 64% dei casi per l'S&P 500 (7 su 11) l'uscita è falsa. Come **contesto** si può dire «la struttura è tornata in contango il …», senza rendimenti.

## Q3. Il credito distingue i cali profondi?

Gli episodi di VIX ≥ 25 e ≥ 30 vanno dal 1990. «Tensione» vuol dire che BAA10Y è salito di almeno 0,30 punti nelle 21 sedute fino al segnale. Il calo si legge come mediana / peggiore.

| Indice | VIX ≥ | variante | tensione: n (12 m) | 252 | calo | senza tensione: n (12 m) | 252 | calo | verdetto |
|---|---|---|---|---|---|---|---|---|---|
| S&P 500 | 25 | +0,30 | **0** | — | — | 23 (21) | +12,3 (17/21) | −12,8 / −46,4 | non valutabile |
| S&P 500 | 25 | +0,20 | 3 (3) | +15,5 (2/3) | −4,9 / −17,2 | 20 (18) | +11,3 (15/18) | −12,9 / −46,4 | non valutabile |
| S&P 500 | 25 | +0,50 | 0 | — | — | 23 | | | non valutabile |
| S&P 500 | 25 | percentile ≥ 80 | 7 (7) | +15,5 (5/7) | −4,9 / −46,4 | 16 (14) | +11,3 (12/14) | −12,9 / −28,5 | non valutabile |
| S&P 500 | 30 | **+0,30** | **4 (4)** | **−9,8 (1/4)** | **−17,6 / −44,3** | 17 (16) | +16,4 (13/16) | −9,9 / −29,7 | **non valutabile** |
| S&P 500 | 30 | +0,20 | 8 (8) | +11,9 (5/8) | −14,8 / −44,3 | 13 (12) | +16,1 (9/12) | −9,9 / −29,7 | non passa (−4,1 / −12,5 / −4,8) |
| S&P 500 | 30 | +0,50 | 0 | — | — | 21 (20) | | | non valutabile |
| S&P 500 | 30 | percentile ≥ 80 | 7 (7) | −11,7 (3/7) | −21,3 / −44,3 | 14 (13) | +17,9 (11/13) | −8,3 / −24,3 | non valutabile |
| Nasdaq-100 | 30 | +0,30 | 4 (4) | +3,0 (2/4) | −24,6 / −61,2 | 17 (16) | +29,6 (13/16) | −10,9 / −65,6 | non valutabile |
| Nasdaq-100 | 30 | +0,20 | 8 (8) | +24,9 (6/8) | −12,7 / −61,2 | 13 (12) | +28,7 (9/12) | −10,9 / −65,6 | non passa |
| Nasdaq-100 | 30 | percentile ≥ 80 | 7 (7) | −0,0 (3/7) | −37,2 / −65,6 | 14 (13) | +30,6 (12/13) | −9,4 / −33,1 | non valutabile |
| Nasdaq-100 | 25 | +0,30 / +0,20 / pct 80 | 0 / 3 / 7 | | | | | | non valutabile |

I 4 episodi di VIX ≥ 30 con tensione a +0,30 sono:

- 14/04/2000;
- 15/08/2007;
- 15/09/2008;
- 03/04/2025, l'unico con un rendimento a 12 mesi positivo.

A VIX ≥ 30 il percentile ≥ 80 cade solo tra il 2000 e il 2015: lo spread Baa è stato strutturalmente più alto in quegli anni, quindi dal 2016 non c'è nessun caso. A VIX ≥ 25 ci sono anche due casi del 2016.

Alla soglia 25 la direzione si inverte: con tensione il calo è meno profondo. Il segnale a 25 arriva prima che il credito si allarghi.

**HY OAS (descrittivo, 07/11/2023-05/11/2026, 747 sedute).**

- Correlazione con BAA10Y: 0,44 sui livelli e 0,67 sulle variazioni a 21 sedute.
- I massimi cadono entrambi il 07/04/2025 (livelli non riportati: licenze ICE e Moody's, vedi `../ripulisci.mjs`).
- Variazione a 21 sedute al segnale, HY contro BAA10Y:
  - 05/08/2024: +0,66 contro +0,29;
  - 03/04/2025: +1,13 contro +0,32;
  - 27/03/2026: +0,44 contro +0,03.
- L'HY si muove di più ma va nella stessa direzione.
- Tre anni sono troppo pochi per un test.

**Verdetto Q3: scarta come statistica, per ora non valutabile.** Con la regola principale gli episodi in tensione sono 0 (VIX 25) e 4 (VIX 30). A VIX ≥ 30 la direzione è coerente: in tensione il rendimento a 12 mesi è peggiore e il calo più profondo, nella regola principale, a +0,20 e con il percentile, per entrambi gli indici. Però dove ci sono abbastanza casi (+0,20, 8 contro 12) le differenze stanno sotto le soglie. Il livello e la variazione di BAA10Y si possono mostrare come **contesto**, senza statistiche di rendimento.

## Limiti

- **Pochi casi.** R c'è solo dal 2008: 13 episodi a VIX ≥ 30 e 7 a VIX ≥ 40. Le uscite dalla backwardation sono 11. Tutte le percentuali sono indicative.
- **Crisi sovrapposte.** Più uscite e più segnali cadono nella stessa crisi (2018, 2020). Nelle coppie di Q2 lo stesso segnale del VIX si usa due volte.
- **Nel campione.** Tutto è nel campione tranne la prova fuori campione di Q2, che ha 4-9 eventi.
- **Dati futuri nella regola del brief per Q1.** Le varianti v1 e v2 li eliminano e danno lo stesso verdetto.
- **Orari.** VIX e VIX3M sono chiusure Cboe delle 16:15; l'ingresso è alla chiusura del giorno dopo. BAA10Y è un dato giornaliero di FRED: ci si entra il giorno dopo, ma la pubblicazione può arrivare con un giorno di ritardo.
- **Percentile di BAA10Y.** È calcolato solo sulla storia fino a quel giorno, ma su una serie che cambia livello da un decennio all'altro.
- **Fonti.** Le fonti dei dati le verifica un altro agente. Qui si usano i CSV di FRED così come sono, in `cache/`.

## Verdetti

| Domanda | Esito con il criterio | Verdetto |
|---|---|---|
| Q1 backwardation in più del livello del VIX | non valutabile a tutte le soglie (gruppo «senza» con 0-2 episodi; a VIX ≥ 30 e ≥ 40 sempre in backwardation) | **scarta come statistica**; R di oggi solo come contesto |
| Q2 uscita dalla backwardation come ingresso | non passa contro il VIX ≥ 30 né contro la base; fuori campione nessun vantaggio; 7 uscite false su 11 (S&P 500) | **scarta come statistica**; «tornata in contango il …» solo come contesto |
| Q3 credito e cali profondi | non valutabile (4 episodi in tensione a VIX ≥ 30); direzione coerente a VIX ≥ 30, ma sotto le soglie dove i casi bastano | **scarta come statistica**; BAA10Y (livello e variazione a 21 sedute) solo come contesto, eventualmente da rivedere con più storia di HY OAS |
