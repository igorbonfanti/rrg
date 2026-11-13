# Volatilità implicita, realizzata e GARCH: S&P 500 e Nasdaq-100

Fase di verifica (novembre 2026) per un possibile grafico nel pannello VIX. **Non modifica l'app.**

Lo spunto è un grafico di Massimo Rea (quant-rea) sul Nasdaq-100 dal 2020: VIX, volatilità realizzata a 30 giorni e una stima GARCH(1,1) «fuori campione». Nella sua tabella il GARCH «segue» la realizzata molto meglio del VIX (correlazione 0,98 contro 0,69). L'idea e il grafico sono suoi; qui non c'è nessun dato preso dalla sua piattaforma. Tutti i numeri vengono da FRED e Yahoo e si rifanno con gli script di `script/`.

Domande dell'utente: (a) gli istituzionali si posizionano prima che la volatilità arrivi, cioè l'implicita sale prima della realizzata? (b) il GARCH anticipa la volatilità di qualche giorno? E quindi: conviene mostrare nell'app un grafico implicita / realizzata / GARCH, con quale lettura, e serve il Nasdaq-100 separato?

## In breve

- **(a) No, non in un modo utilizzabile.** L'implicita sale prima che la realizzata a 21 sedute superi la sua soglia, ma solo perché reagisce subito ai ribassi, mentre la realizzata ha bisogno di più sedute per salire. Il primo giorno di «premio alto» prima di un picco è sempre una seduta di ribasso (S&P 500: 7 su 7; Nasdaq-100: 5 su 5). Come segnale non serve: scatta tra 8 e 11 volte l'anno e solo nel 4-6% dei casi arriva un picco nelle 21 sedute dopo. Il criterio di utilità deciso prima non è soddisfatto.
- **(b) No.** Il GARCH sale con i primi rendimenti grandi, come la realizzata. Prima dei picchi è alto più spesso della media, ma meno spesso della realizzata stessa (9 su 10 contro 10 su 10 nell'S&P 500). Neanche la durata della volatilità dopo un picco la prevede meglio dei metodi semplici.
- **Previsione della volatilità del mese dopo.** Il criterio deciso prima («RMSE più basso del VIX e dell'EWMA in almeno 2 sottoperiodi su 3») è soddisfatto per l'S&P 500 (2 su 3) e non per il Nasdaq-100 (0 su 3). Il vantaggio del GARCH sull'S&P 500 viene quasi tutto dal fatto che il VIX sta in media 3,4 punti sopra la volatilità che si realizza. Per correlazione e R², l'implicita è il previsore più informativo in quasi tutti i periodi.
- **Il confronto alla Rea inganna.** Contro la realizzata *passata* il GARCH vince (correlazione 0,94 contro 0,88 del VIX), ma anche una semplice media esponenziale (EWMA) arriva a 0,975: misura i rendimenti di ieri come li misura la realizzata. Contro la realizzata *futura* il vantaggio sparisce.
- **Verdetto:** il grafico sì, ma con **implicita e realizzata a 21 sedute**, senza GARCH e senza promettere un anticipo. Il Nasdaq-100 non serve separato: basta una riga di confronto.

## Le tre volatilità

- **Implicita (VIX, VXN)**: quanto il mercato delle opzioni si aspetta che l'indice oscilli nei prossimi 30 giorni di calendario (circa 21 sedute), in % annua. È un prezzo: comprende un **premio** per la protezione, perciò di solito sta sopra la volatilità che poi si realizza.
- **Realizzata**: deviazione standard dei rendimenti giornalieri (logaritmici, chiusura su chiusura), × √252. **Passata** RVp(t): le 21 sedute da t−20 a t, nota il giorno t. **Futura** RVf(t): le 21 sedute da t+1 a t+21, nota solo un mese dopo; è quella che una previsione deve indovinare.
- **GARCH(1,1)**: modello statistico che stima la varianza di domani da quella di oggi e dall'ultimo rendimento al quadrato: s²(t+1) = ω + α·e(t)² + β·s²(t). Con α + β < 1 la previsione torna piano verso la media di lungo periodo. Usa solo i rendimenti passati: non sa nulla di ciò che il mercato si aspetta.
- Per confronto: **EWMA** (RiskMetrics, λ = 0,94), una media esponenziale dei rendimenti al quadrato; la RVp stessa usata come previsione («il mese prossimo come l'ultimo»).

## Dati

| Serie | Fonte | Periodo | Controllo con seconda fonte |
|---|---|---|---|
| S&P 500 | Yahoo `^GSPC` | 1985-01-02 → 2026-11-05 | FRED `SP500` (solo dal 2016): 2 date con scarto > 0,01%, massimo 0,12%; 4 rendimenti su 2.511 diversi di più di 0,01 punti |
| Nasdaq-100 | Yahoo `^NDX` | 1985-10-01 → 2026-11-05 | FRED `NASDAQ100`: dal 2008, 2 date con scarto > 0,01% (massimo 0,085%); fino al 2006 FRED ha centinaia di piccoli scarti (massimo 2,4%), fuori dal periodo valutato |
| VIX | FRED `VIXCLS` | 1990-01-02 → 2026-11-04 | Yahoo `^VIX`: dal 2005, 11 date diverse di più di 0,01 su 5.497, massimo 2,61 punti (06/02/2026: 17,76 FRED, 20,37 Yahoo) |
| VXN | FRED `VXNCLS` | 2001-02-02 → 2026-11-04 | Yahoo `^VXN`: dal 2008, 17 date diverse su 4.741, massimo 7,71 punti (22/10/2008); nel 2001-2003 le due serie sono diverse quasi ogni giorno |

Le sedute dell'indice senza l'implicita su FRED (S&P 500: 01/03/1991, 31/01/1997, 26/11/1997; Nasdaq-100: 22/08/2003, 10/09/2004) restano mancanti e non entrano nei confronti. L'ultima seduta (05/11/2026) su FRED non c'è ancora: la lettura «oggi» la dà a parte, con il VIX/VXN di Yahoo dichiarato come seconda fonte.

## Metodo (deciso prima di vedere i risultati)

- **Niente dati futuri.** Il GARCH si stima di nuovo l'ultima seduta di ogni mese, per massima verosimiglianza su una finestra mobile di 2.520 rendimenti (10 anni), e si usa fino alla fine del mese dopo. La previsione al giorno t è la media della varianza prevista per le 21 sedute successive (formula chiusa), annualizzata. Percentili e soglie si calcolano solo sulla storia fino a quel giorno.
- **Fuori campione**: dal 2005 per l'S&P 500 (5.475 sedute), dal 2008 per il Nasdaq-100 (4.721 sedute), fino al 07/10/2026, ultimo giorno con 21 sedute dopo. Sottoperiodi: fino al 2012, 2013-2019, 2020-oggi.
- **Metriche**: MAE (errore medio assoluto), RMSE (radice dell'errore quadratico medio, pesa di più gli errori grandi), distorsione (previsione meno realizzata, in media), correlazione, regressione di Mincer-Zarnowitz RVf = a + b·previsione (una previsione perfetta ha a = 0, b = 1; R² dice quanta parte delle variazioni spiega), anche in logaritmi. Test di Diebold-Mariano GARCH contro ciascun altro (errori standard Newey-West con 21 ritardi, perché le finestre di 21 sedute si sovrappongono): un valore sotto −1,96 vuol dire GARCH migliore in modo significativo, sopra +1,96 peggiore.
- **Criterio**: il GARCH «prevede meglio» se ha RMSE più basso dell'implicita **e** dell'EWMA in almeno 2 dei 3 sottoperiodi.

## 1. Chi prevede meglio la volatilità del mese dopo (RVf)

Volatilità in punti percentuali annui. In grassetto l'RMSE più basso tra i quattro previsori del criterio.

**S&P 500 (VIX)**

| Periodo | Previsore | MAE | RMSE | Distorsione | Corr. | a | b | R² | R² log |
|---|---|---|---|---|---|---|---|---|---|
| 2005-2012 | VIX | 6,17 | 8,63 | +3,30 | 0,79 | −2,52 | 0,96 | 0,62 | 0,64 |
| | RVp | 5,41 | 8,66 | −0,04 | 0,78 | 4,10 | 0,78 | 0,60 | 0,57 |
| | EWMA | 5,12 | 8,32 | +0,16 | 0,79 | 3,10 | 0,82 | 0,62 | 0,59 |
| | GARCH | 5,02 | **8,03** | +0,77 | 0,79 | 0,81 | 0,92 | 0,63 | 0,61 |
| 2013-2019 | VIX | 4,91 | 5,82 | +3,16 | 0,49 | 1,15 | 0,71 | 0,24 | 0,28 |
| | RVp | 4,58 | 6,27 | +0,06 | 0,35 | 7,63 | 0,35 | 0,12 | 0,12 |
| | EWMA | 4,20 | **5,69** | +0,33 | 0,38 | 6,30 | 0,45 | 0,15 | 0,17 |
| | GARCH | 4,68 | 5,70 | +2,16 | 0,39 | 3,65 | 0,58 | 0,15 | 0,15 |
| 2020-2026 | VIX | 6,86 | 10,23 | +3,82 | 0,56 | −0,57 | 0,84 | 0,32 | 0,38 |
| | RVp | 6,46 | 11,77 | −0,04 | 0,47 | 9,05 | 0,46 | 0,22 | 0,27 |
| | EWMA | 6,19 | 11,20 | +0,41 | 0,48 | 7,91 | 0,52 | 0,23 | 0,29 |
| | GARCH | 5,60 | **9,70** | +0,37 | 0,55 | 3,59 | 0,77 | 0,30 | 0,32 |
| Tutto | VIX | 5,98 | 8,41 | +3,41 | 0,71 | −1,81 | 0,92 | 0,51 | 0,53 |
| | RVp | 5,47 | 9,12 | −0,01 | 0,65 | 5,47 | 0,65 | 0,43 | 0,40 |
| | EWMA | 5,15 | 8,65 | +0,29 | 0,67 | 4,31 | 0,71 | 0,45 | 0,43 |
| | GARCH | 5,09 | **7,96** | +1,09 | 0,70 | 0,91 | 0,88 | 0,49 | 0,45 |

Diebold-Mariano GARCH contro VIX: −1,65 / −0,81 / −1,46 nei tre sottoperiodi, −2,30 su tutto il periodo. **Criterio: soddisfatto, 2 sottoperiodi su 3** (2005-2012 e 2020-2026). Nel 2013-2019 vince l'EWMA, per 0,01 punti.

**Nasdaq-100 (VXN)**

| Periodo | Previsore | MAE | RMSE | Distorsione | Corr. | a | b | R² | R² log |
|---|---|---|---|---|---|---|---|---|---|
| 2008-2012 | VXN | 7,46 | 10,12 | +3,63 | 0,73 | −2,47 | 0,96 | 0,54 | 0,52 |
| | RVp | 6,80 | 10,43 | +0,16 | 0,72 | 6,50 | 0,72 | 0,51 | 0,46 |
| | EWMA | 6,46 | **9,91** | +0,55 | 0,73 | 4,69 | 0,78 | 0,53 | 0,49 |
| | GARCH | 6,44 | 9,92 | +1,55 | 0,73 | 3,04 | 0,82 | 0,53 | 0,51 |
| 2013-2019 | VXN | 5,02 | **6,12** | +2,55 | 0,55 | −0,35 | 0,87 | 0,30 | 0,30 |
| | RVp | 5,57 | 7,30 | +0,07 | 0,39 | 9,00 | 0,39 | 0,15 | 0,12 |
| | EWMA | 5,05 | 6,67 | +0,36 | 0,42 | 7,38 | 0,49 | 0,17 | 0,15 |
| | GARCH | 5,15 | 6,39 | +1,95 | 0,43 | 3,03 | 0,70 | 0,19 | 0,16 |
| 2020-2026 | VXN | 6,82 | **10,09** | +2,71 | 0,56 | −0,18 | 0,90 | 0,31 | 0,37 |
| | RVp | 7,42 | 12,27 | −0,10 | 0,45 | 12,47 | 0,45 | 0,20 | 0,29 |
| | EWMA | 7,19 | 11,72 | +0,35 | 0,45 | 11,18 | 0,49 | 0,20 | 0,27 |
| | GARCH | 6,39 | 10,37 | −0,70 | 0,49 | 6,17 | 0,75 | 0,24 | 0,29 |
| Tutto | VXN | 6,32 | **8,83** | +2,90 | 0,69 | −1,23 | 0,93 | 0,47 | 0,50 |
| | RVp | 6,56 | 10,15 | +0,03 | 0,61 | 7,76 | 0,61 | 0,37 | 0,36 |
| | EWMA | 6,20 | 9,60 | +0,41 | 0,62 | 6,13 | 0,68 | 0,39 | 0,39 |
| | GARCH | 5,94 | 8,96 | +0,89 | 0,64 | 2,58 | 0,83 | 0,41 | 0,41 |

**Criterio: non soddisfatto, 0 sottoperiodi su 3.** Diebold-Mariano GARCH contro VXN: −0,45 / +1,70 / +0,62; +0,54 su tutto il periodo.

Cosa dicono le due tabelle:

- L'implicita sta **sopra** la volatilità che poi si realizza nell'83% delle sedute per l'S&P 500 e nel 77% per il Nasdaq-100, in media di 3,4 e 2,9 punti. È il premio che chi compra protezione paga, e pesa sull'RMSE dell'implicita.
- Tolta questa distorsione, l'implicita è la previsione **più informativa**: ha l'R² più alto o pari in tutti i periodi tranne l'S&P 500 2005-2012 (0,62 contro 0,63) e l'R² in logaritmi più alto ovunque. La pendenza b è vicina a 1 (0,92 e 0,93), mentre per RVp ed EWMA è 0,6-0,7: chi prevede «come il mese scorso» esagera sia la calma sia la tempesta.
- **Prova in più** (non faceva parte del criterio): implicita meno il suo premio medio passato, stimato ogni giorno solo sulle sedute la cui RVf era già nota. RMSE su tutto il periodo: 7,77 contro 7,96 del GARCH (S&P 500) e 8,39 contro 8,96 (Nasdaq-100, Diebold-Mariano +2,59: qui il GARCH è peggiore in modo significativo). Quindi sull'S&P 500 il GARCH vince il criterio grazie al premio contenuto nel VIX, non perché sappia di più.

## 1b. Perché il confronto con la realizzata passata inganna

Nel grafico di Rea il bersaglio è la realizzata degli **ultimi** 30 giorni. Il GARCH è costruito con gli stessi rendimenti passati, quindi la segue per costruzione. Il VIX guarda avanti e la segue meno. Correlazione con la realizzata passata, sedute fuori campione:

| | S&P 500: RVp 21 | S&P 500: RVp 30 | Nasdaq-100: RVp 21 | Nasdaq-100: RVp 30 |
|---|---|---|---|---|
| Implicita | 0,877 | 0,870 | 0,857 | 0,853 |
| GARCH a un passo | 0,941 | 0,907 | 0,938 | 0,907 |
| GARCH 21 sedute | 0,940 | 0,909 | 0,925 | 0,899 |
| EWMA | **0,975** | **0,979** | **0,971** | **0,975** |

Anche l'EWMA, che non stima nulla, «batte» il GARCH su questo terreno: misurare i rendimenti di ieri non è prevedere quelli di domani.

Ricostruzione alla Rea sul Nasdaq-100: GARCH stimato sul 2010-2019 con parametri fissi, applicato dal 02/01/2020.

| Bersaglio (dal 2020) | VXN corr. | VXN RMSE | GARCH a un passo corr. | RMSE | GARCH 21 sedute corr. | RMSE |
|---|---|---|---|---|---|---|
| Realizzata passata 30 sedute | 0,761 | 7,85 | 0,817 | 6,64 | 0,808 | 7,25 |
| Realizzata passata 21 sedute | 0,784 | 8,04 | 0,889 | 5,51 | 0,882 | 6,68 |
| **Realizzata futura 21 sedute** | **0,556** | **10,09** | 0,530 | 10,64 | 0,524 | 10,27 |

Contro la realizzata passata il GARCH sembra molto migliore; contro quella futura, cioè contro ciò che conta per una previsione, il VXN è pari o migliore. I valori 0,98 e 0,69 di Rea non si riproducono esattamente: periodo, finestre e dati sono diversi. La direzione però è la stessa, e si spiega così. Per l'S&P 500, stesso esercizio: contro la futura 0,562 VIX, 0,570 GARCH a un passo, 0,566 GARCH 21 sedute; RMSE 10,23, 10,11, 9,50.

Dove la correlazione è massima: implicita(t) con RVp(t+k) al massimo per k = 5 (S&P 500: 0,900 contro 0,877 a k = 0), ma lo stesso vale per il GARCH, con k = 4 e k = 3. Non è un segno di preveggenza: la RVp di oggi riassume le ultime 21 sedute, quindi «arriva» con qualche giorno di ritardo rispetto a qualsiasi misura aggiornata con l'ultimo rendimento.

## 2. L'implicita sale prima dei picchi? («istituzionali posizionati prima»)

**Eventi** (picchi della realizzata): prima seduta in cui la RVp supera il suo 90° percentile calcolato sulla storia fino a quel giorno, dopo almeno 63 sedute sotto. **Segnale**: premio per la paura sopra il suo 80° percentile (storia fino a quel giorno), in almeno una delle 10 sedute prima dell'evento. Due premi: P1 = implicita − GARCH 21 sedute, P2 = implicita − RVp. Criterio di utilità (deciso prima): eventi preceduti ≥ 2 × quota di base giornaliera **e** anticipo mediano ≥ 3 sedute **e** almeno metà degli inizi di segnale seguita da un evento entro 21 sedute.

| | Eventi preceduti | Anticipo mediano (sedute) | Base: sedute con segnale | Base: finestre di 10 sedute con segnale | Inizi di segnale | Seguiti da evento | Criterio |
|---|---|---|---|---|---|---|---|
| S&P 500, P1 (VIX − GARCH) | 5 su 10 | 7 | 13,7% | 32,8% | 182 | 10 (5,5%) | no |
| S&P 500, P2 (VIX − RVp) | 7 su 10 | 7 | 16,7% | 39,1% | 204 | 12 (5,9%) | no |
| Nasdaq-100, P1 (VXN − GARCH) | 6 su 7 | 10 | 20,4% | 44,1% | 214 | 13 (6,1%) | no |
| Nasdaq-100, P2 (VXN − RVp) | 5 su 7 | 9 | 21,7% | 43,2% | 166 | 7 (4,2%) | no |

Le prime due condizioni sono soddisfatte (rapporto sulla base giornaliera tra 3,3 e 4,2; anticipo 7-10 sedute), la terza no, e di molto: il segnale si accende tra 8,4 e 11,4 volte l'anno e quasi mai è seguito da un picco. Contro la base più giusta, cioè la quota di finestre di 10 sedute che contengono almeno un segnale, il rapporto scende a 1,5-1,9.

Soprattutto, **il primo giorno di segnale è sempre una seduta di ribasso dell'indice**: S&P 500, P2 7 su 7 e P1 5 su 5; Nasdaq-100, P2 5 su 5 e P1 6 su 6. In quasi tutti i casi l'indice scendeva già da qualche giorno (5 sedute fino al primo segnale in calo: P2 6 su 7 per l'S&P 500, 5 su 5 per il Nasdaq-100). L'implicita non si muove prima del mercato: si muove **con** il primo ribasso. È la realizzata a 21 sedute che arriva tardi.

Profilo mediano attorno agli eventi dell'S&P 500 (sedute rispetto all'evento):

| | −20 | −10 | −5 | −1 | 0 | +5 | +21 | +63 |
|---|---|---|---|---|---|---|---|---|
| VIX | 17,4 | 19,6 | 21,2 | 28,3 | 29,4 | 28,8 | 23,6 | 23,1 |
| RVp | 13,3 | 15,5 | 18,0 | 21,9 | 25,2 | 26,5 | 21,6 | 18,8 |
| GARCH 21 sedute | 15,9 | 16,6 | 17,5 | 22,9 | 29,0 | 24,4 | 20,2 | 17,8 |

Sensibilità (eventi al 85°/95° percentile, 42/126 sedute sotto, finestre di 5/20 sedute, segnale al 75°/90° percentile): in nessuna variante, per nessuno dei due premi, la quota di inizi di segnale seguiti da un evento supera il 10,4%. Con la finestra di 5 sedute, per il Nasdaq-100 gli eventi preceduti scendono a 2 su 7 (P1) e 0 su 7 (P2): il premio sale al primo ribasso, poi si chiude quando la realizzata lo raggiunge.

## 3. Il GARCH anticipa?

Stessa misura con il **livello** della previsione GARCH sopra il suo 80° percentile, confrontata con la stessa misura fatta sulla RVp e sull'implicita:

| | Eventi preceduti | Anticipo mediano | Base giornaliera | Inizi seguiti da evento |
|---|---|---|---|---|
| S&P 500, GARCH | 9 su 10 | 4 | 15,7% | 19 su 86 (22%) |
| S&P 500, RVp | 10 su 10 | 4 | 21,7% | 11 su 49 (22%) |
| S&P 500, VIX | 9 su 10 | 6 | 17,0% | 18 su 104 (17%) |
| Nasdaq-100, GARCH | 6 su 7 | 7 | 6,4% | 10 su 54 (19%) |
| Nasdaq-100, RVp | 7 su 7 | 7 | 13,1% | 8 su 29 (28%) |
| Nasdaq-100, VXN | 6 su 7 | 9 | 8,7% | 8 su 57 (14%) |

Il GARCH è alto prima dei picchi più spesso della base, ma la realizzata stessa lo è altrettanto o di più: prima di superare il 90° percentile la volatilità sale, e qualsiasi misura costruita sui rendimenti passati lo registra. Il GARCH non aggiunge un anticipo. Come atteso, reagisce dopo lo shock: nel profilo mediano passa da 17,5 a −5 sedute a 29,0 il giorno dell'evento.

**Durata dopo il picco**: realizzata delle sedute da +22 a +63 contro la previsione del giorno dell'evento.

| | S&P 500 (10 eventi): MAE | RMSE | Nasdaq-100 (7 eventi): MAE | RMSE |
|---|---|---|---|---|
| GARCH 22-63 sedute | 12,18 | 17,16 | 11,80 | 15,88 |
| Implicita | 13,97 | 18,69 | 13,30 | 15,57 |
| RVp | 10,56 | 16,22 | 18,31 | 21,41 |
| EWMA | 10,99 | 16,56 | 18,18 | 21,86 |

Il GARCH è più vicino dell'implicita in 8 casi su 10 (S&P 500) e 5 su 7 (Nasdaq-100); più vicino della RVp in 2 su 10 e 6 su 7. Il quadro è misto e i casi sono troppo pochi. Su tutte le sedute fuori campione, per l'orizzonte 22-63 il GARCH ha l'RMSE più basso (S&P 500: 9,85 contro 10,70 del VIX e 11,75 della RVp; Nasdaq-100: 10,71 contro 11,11 e 12,90). La correlazione però è pari o più bassa di quella dell'implicita (0,41 contro 0,42; 0,34 contro 0,39), quindi anche qui il vantaggio viene dal premio dell'implicita.

## Eventi principali

S&P 500 («—» = nessun segnale nelle 10 sedute prima; i numeri sono le sedute di anticipo del primo segnale):

| Evento | RVp / soglia | VIX | GARCH | Rend. del giorno | P1 | P2 | Rend. primo segnale P2 | 5 sedute fino al segnale | RV +22..+63 | GARCH 22-63 |
|---|---|---|---|---|---|---|---|---|---|---|
| 09/08/2007 | 23,8 / 22,7 | 26,5 | 24,3 | −3,0% | — | 9 | −1,6% | −5,0% | 17,1 | 23,4 |
| 30/07/2008 | 23,3 / 23,1 | 21,2 | 22,5 | +1,7% | — | — | — | — | 69,5 | 22,0 |
| 10/05/2010 | 26,4 / 25,0 | 28,8 | 28,9 | +4,3% | 9 | 10 | −0,4% | +1,2% | 20,6 | 27,1 |
| 08/08/2011 | 31,3 / 25,0 | 48,0 | 38,2 | −6,9% | 7 | 7 | −0,3% | −3,3% | 29,4 | 34,4 |
| 26/08/2015 | 25,2 / 25,0 | 30,3 | 31,3 | +3,8% | 3 | 3 | −3,2% | −5,9% | 14,8 | 26,4 |
| 12/02/2018 | 24,8 / 24,5 | 25,6 | 29,0 | +1,4% | 5 | 5 | −4,2% | −7,4% | 18,1 | 25,6 |
| 07/11/2018 | 25,5 / 24,5 | 16,4 | 20,0 | +2,1% | — | — | — | — | 22,4 | 18,7 |
| 27/02/2020 | 24,5 / 24,3 | 39,2 | 33,4 | −4,5% | — | 3 | −3,4% | −4,7% | 33,8 | 22,5 |
| 09/03/2022 | 25,3 / 24,7 | 32,5 | 24,5 | +2,5% | 10 | 10 | −1,9% | −5,7% | 28,5 | 18,3 |
| 03/04/2025 | 25,6 / 24,9 | 30,0 | 33,2 | −5,0% | — | — | — | — | 13,2 | 25,4 |

Nasdaq-100 (per il 10/11/2022 il primo segnale è di P1, P2 non c'era):

| Evento | RVp / soglia | VXN | GARCH | Rend. del giorno | P1 | P2 | Rend. primo segnale | 5 sedute fino al segnale | RV +22..+63 | GARCH 22-63 |
|---|---|---|---|---|---|---|---|---|---|---|
| 29/09/2008 | 52,2 / 42,5 | 49,6 | 50,7 | −11,1% | 10 | 10 | −3,6% | −3,3% | 56,3 | 49,7 |
| 18/08/2011 | 44,6 / 42,7 | 41,6 | 41,9 | −5,1% | 9 | 9 | −0,6% | −7,4% | 28,2 | 39,5 |
| 04/01/2019 | 40,2 / 39,3 | 28,6 | 35,9 | +4,4% | 9 | 7 | −2,5% | −8,9% | 12,2 | 26,3 |
| 09/03/2020 | 44,3 / 38,8 | 53,7 | 47,6 | −7,1% | 10 | 7 | −5,1% | −13,2% | 25,5 | 28,3 |
| 05/05/2022 | 39,1 / 38,6 | 37,2 | 41,8 | −5,2% | 10 | 9 | −2,7% | −3,9% | 32,3 | 28,1 |
| 10/11/2022 | 41,3 / 38,8 | 30,4 | 46,7 | +7,2% | 10 | — | −1,9% | +1,3% | 26,0 | 33,3 |
| 09/04/2025 | 54,5 / 38,0 | 34,8 | 70,6 | +11,4% | — | — | — | — | 15,7 | 52,0 |

Episodi citati che non sono eventi secondo la definizione:

- **S&P 500, settembre-ottobre 2008** (Lehman): la RVp supera la soglia il 15/09/2008 (massimo 85,4 il 28/10), ma l'evento era già scattato il 30/07/2008 e non c'erano state 63 sedute sotto.
- **S&P 500, agosto 2024**: RVp massima 22,2 (15/08), sotto la soglia di 25,0.
- **Nasdaq-100**: agosto 2015 (massimo 36,7 contro una soglia di 41,0), febbraio 2018 (30,0 contro 39,8) e agosto 2024 (30,9 contro 38,2) restano sotto la soglia, che per il Nasdaq-100 è più alta perché comprende la bolla del 2000.

## 4. Lettura «oggi»

| | S&P 500, 04/11/2026 (FRED) | S&P 500, 05/11/2026 (VIX di Yahoo) | Nasdaq-100, 04/11/2026 (FRED) | Nasdaq-100, 05/11/2026 (VXN di Yahoo) |
|---|---|---|---|---|
| Rendimento del giorno | +1,57% | −4,45% | +0,91% | −6,57% |
| Implicita (percentile) | 16,61 (44°) | 28,18 (90°) | 25,08 (66°) | 38,26 (89°) |
| RVp (percentile) | 12,60 (48°) | 19,72 (80°) | 22,80 (67°) | 31,10 (83°) |
| Soglia evento (90° pct RVp) | 24,82 | 24,82 | 37,63 | 37,63 |
| GARCH 21 sedute (percentile) | 16,50 (62°) | 29,59 (95°) | 24,89 (70°) | 41,65 (92°) |
| GARCH 22-63 sedute | 17,28 | 23,84 | 24,56 | 34,75 |
| P1 implicita − GARCH (percentile) | +0,11 (18°) | −1,41 (7°) | +0,19 (31°) | −3,39 (5°) |
| P2 implicita − RVp (percentile) | +4,01 (46°) | +8,46 (88°) | +2,28 (37°) | +7,16 (81°) |

Il 05/11 il premio P2 è sopra l'80° percentile. È la configurazione che ha preceduto 7 picchi su 10 dell'S&P 500, ma che dal 2005 si è accesa 204 volte, con un picco entro 21 sedute solo 12 volte. Dopo un −4,45% il GARCH sta sopra il VIX (P1 negativo): reagisce subito al rendimento del giorno. Non è un segnale.

## 5. Nasdaq-100 separato?

Il criterio della previsione dà esiti diversi (S&P 500 sì, Nasdaq-100 no), ma la **lettura non cambia**: in entrambi l'implicita è la previsione più informativa, sta sopra la realizzata per il premio, sale con i ribassi e non prima, e il GARCH non anticipa. Basta l'S&P 500, con una riga di confronto per il Nasdaq-100 (VXN, RVp, premio e percentili).

## Limiti

- **Pochi eventi**: 10 per l'S&P 500 e 7 per il Nasdaq-100, in buona parte nelle stesse crisi; le percentuali sono indicative.
- La definizione di evento (90° percentile, 63 sedute) esclude episodi noti (Lehman 2008 sull'S&P 500, agosto 2024). Le varianti di sensibilità non cambiano la conclusione.
- **Finestre sovrapposte**: le RVf di sedute vicine condividono quasi tutti i rendimenti, quindi le osservazioni indipendenti sono circa una al mese. Il test di Diebold-Mariano ne tiene conto con Newey-West, le altre metriche no.
- Il VIX copre 30 giorni di calendario, la RVf 21 sedute: la corrispondenza è approssimata. Il VIX chiude alle 16:15 di New York, l'indice alle 16:00.
- GARCH(1,1) con errori normali e senza effetto leva (asimmetria dei ribassi): è il modello del grafico di Rea, riammesso solo per questo test. Per il Nasdaq-100, nelle stime del 2005-2009 (finestre che contengono la bolla del 2000) α + β arriva al limite di 0,99999: la previsione quasi non torna verso la media.
- Le «previsioni» GARCH sono stimate su finestre di 10 anni; con la finestra crescente o con un altro calendario di ristima i numeri cambierebbero un poco (non provato).
- Due fonti dell'implicita: nell'S&P 500 c'è un giorno (06/02/2026) con 2,6 punti di differenza tra FRED e Yahoo; si usa FRED.
- I numeri 0,98 / 0,69 di Rea non sono riprodotti esattamente: non abbiamo i suoi dati né le sue scelte esatte e non li prendiamo dalla piattaforma.

## Verdetto per l'app

1. **Grafico sì, con due linee**: implicita (VIX) e realizzata a 21 sedute, più il premio (differenza) con il suo percentile. È un grafico onesto e facile da leggere. Mostra che il mercato di solito paga più volatilità di quella che arriva, e che nei momenti di panico la realizzata la raggiunge o la supera.
2. **GARCH no.** Non anticipa (domande a e b), non prevede la volatilità del mese dopo meglio dell'implicita in modo solido (vince il criterio solo sull'S&P 500 e grazie al premio del VIX; perde sul Nasdaq-100; perde contro l'implicita corretta per il premio passato) e invita alla lettura sbagliata del grafico di Rea («segue la realizzata, quindi prevede»). Se l'utente lo vuole comunque, l'implementazione Node è pronta e verificata (vedi sotto), con l'etichetta «stima statistica dai rendimenti passati: reagisce ai movimenti, non li anticipa».
3. **Lettura da scrivere** (proposta):
   - «Il VIX è la volatilità che il mercato delle opzioni si aspetta per i prossimi 30 giorni. Di solito è più alto della volatilità che poi si realizza: dal 2005 nell'83% delle sedute, di 3,4 punti in media. La differenza è il prezzo della protezione.»
   - «Il VIX sale insieme ai ribassi, non prima: nei picchi di volatilità dal 2005 il primo segnale è sempre arrivato in una seduta di ribasso. Un VIX molto sopra la volatilità recente non annuncia da solo un picco: dal 2005 è successo 204 volte (circa 9 l'anno) e solo 12 volte è arrivato un picco entro un mese.»
   - «La volatilità realizzata è misurata sulle ultime 21 sedute: per costruzione arriva qualche giorno dopo i movimenti.»
   - (204 e 12 sono gli inizi di segnale P2 e quelli seguiti da un evento, `risultati.json` → `sp500.eventi.misure.P2_impl_meno_RVp`; da aggiornare con lo script.)
4. **Nasdaq-100**: non separato, una riga di confronto.

Prima di passare all'app: decidere con l'utente lettura e linee (qui è una proposta), poi ricontrollare i numeri dei testi con `confronto_node.mjs` o con lo script che li calcolerà nella pipeline.

## Controlli indipendenti

`script/confronto_node.mjs` rifà da zero in Node, dagli stessi file di cache, i rendimenti, RVp, RVf, EWMA, il GARCH (Nelder-Mead invece di SLSQP), la tabella delle metriche, gli eventi, i segnali e la lettura «oggi», poi li confronta con Python. Tolleranze decise prima: GARCH 21 sedute entro 0,05 punti, metriche entro 0,01, eventi e conteggi identici. Risultato (`confronto_node.json`): **tutto coincide**.

- Scarto massimo del GARCH 21 sedute fuori campione: 0,00001 punti per l'S&P 500 e 0,0021 per il Nasdaq-100 (31/10/2008, stima al limite α + β = 0,99999).
- Metriche entro 0,00005; stessi 10 e 7 eventi; stessi conteggi dei segnali.
- Il confronto ha trovato un difetto, ora corretto: con un solo avvio di SLSQP, la stima Python del 30/06/1998 (S&P 500) si fermava su un ottimo peggiore (log-verosimiglianza più bassa di 12,8). Ora Python parte da due punti e rifinisce con Nelder-Mead, con lo stesso limite α + β < 0,99999 di Node.
- Controllo con la libreria `arch` su 7 date per indice: α e β entro circa 0,01 (arch avvia la varianza in un modo diverso), GARCH 21 sedute entro 0,25 punti (`controllo_arch` in `risultati.json`).
- Il GARCH in Node (`script/garch.mjs`, senza dipendenze) con tutte le stime mensili dal 1995 e gli altri ricalcoli impiega meno di 7 secondi per indice: la pipeline potrebbe usarlo.

## File

- `script/scarica.mjs`: scarica nella cache condivisa `ricerca/vix/cache/` solo le serie che mancano (FRED VIXCLS, VXNCLS, SP500, NASDAQ100; Yahoo ^GSPC, ^NDX, ^VIX, ^VXN).
- `script/analisi.py`: tutti i numeri di questa nota → `risultati.json` (più le serie giornaliere in `cache/volatilita_serie_*.json`, non versionate). Richiede numpy e scipy; la libreria `arch` serve solo al controllo incrociato.
- `script/garch.mjs`: GARCH(1,1) in Node.
- `script/confronto_node.mjs`: ricalcolo indipendente → `confronto_node.json`.

Uso: `node ricerca/vix/volatilita/script/scarica.mjs && python3 -I ricerca/vix/volatilita/script/analisi.py && node ricerca/vix/volatilita/script/confronto_node.mjs`
