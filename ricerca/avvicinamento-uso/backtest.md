# A cosa serve l'avvicinamento? Backtest dell'uso (settori S&P 500)

Analisi del 31/10/2026, dati al 30/10/2026. Solo ricerca: l'app non cambia.
Script: `script/backtest_uso.mjs` (in testa il metodo e i criteri). Risultati: `backtest_uso.json`. Tutti i numeri di questa nota vengono da lì.

## Domanda
L'«Avvicinamento» serve in pratica, prima della zona blu? E se sì, come va usato? Il risultato «non serve» va bene quanto l'altro. I criteri di successo sono stati fissati prima di vedere i numeri e scritti in testa allo script.

## Metodo
- **Regola**: è quella che l'app mostra (`approachSeries`, `runMachine` e la logica di `apprDays`, importate da `js/signals.js`). Il settore è in stato Normale e la breadth è sotto la soglia di quel giorno, calcolata con la sola storia fino a lì. Un controllo separato (soglia rifatta con `approachLevel` sulla storia fino a t, stato cercato all'indietro come `stateAt`) dà 0 differenze su 1461 sedute di prova. Altri 158 ingressi sono stati ricontrollati a parte (anticipo, rendimento e calo massimo a 63 sedute): 0 differenze.
- **Periodo**: si parte dalla prima seduta calcolata dalla macchina, cioè dal 2005 (XLC dal 20/06/2019 e XLRE dal 07/10/2016, perché prima manca il prezzo dell'ETF).
- **Ingresso**: è la prima seduta in avvicinamento dopo almeno 20 sedute senza. In tutto ci sono 158 ingressi (59 nel 2005–2015 e 99 dal 2016 in poi), raggruppati in **23 cluster** nel tempo: un cluster nuovo comincia quando passano più di 63 sedute dall'ingresso precedente.
- **Basi di confronto**:
  - (a) tutte le sedute in stato Normale fuori dall'avvicinamento (40.898 sedute);
  - (b) gli ingressi in Attenzione, con la stessa regola dei 20 giorni (212);
  - per i rendimenti, anche i trigger (61).
- **Zona blu e trigger**:
  - entrata in zona blu = prima seduta successiva in stato `setup` o `fail`;
  - trigger = evento `trig` successivo.
- **Rendimenti**: dalla chiusura del giorno d'ingresso, sull'adjclose (dividendi inclusi), senza costi. Le finestre che superano la fine dei dati sono escluse.

## 1. Preavviso della zona blu

| Gruppo | P(zona blu ≤ 63) | P(zona blu ≤ 126) | P(trigger ≤ 126) | P(trigger ≤ 252) | Anticipo mediano zona blu* | Anticipo mediano trigger* |
|---|---|---|---|---|---|---|
| Ingressi in avvicinamento | 26/152 = **17,1%** | 35/150 = **23,3%** | 31/150 = 20,7% | 40/144 = 27,8% | 33 sedute | 58 sedute |
| — 2005–2015 | 8/59 = 13,6% | 13/59 = 22,0% | 11/59 = 18,6% | 15/59 = 25,4% | 16 | 34 |
| — 2016–oggi | 18/93 = 19,4% | 22/91 = 24,2% | 20/91 = 22,0% | 25/85 = 29,4% | 36 | 60 |
| Base (a): sedute Normali | 3,7% | 9,2% | 7,5% | 18,9% | — | — |
| Base (b): ingressi in Attenzione | 41/208 = 19,7% | 51/206 = 24,8% | 46/206 = 22,3% | 61/201 = 30,3% | 17,5 | 46,5 |

\* tra quelli che ci arrivano (zona blu entro 126 sedute, trigger entro 252).

**Rapporti contro la base (a)**:

| Periodo | zona blu ≤ 63 | zona blu ≤ 126 | trigger ≤ 126 | trigger ≤ 252 |
|---|---|---|---|---|
| tutto | 4,62 | 2,53 | 2,76 | 1,47 |
| 2005–2015 | 4,86 | 3,24 | 3,38 | 1,83 |
| 2016–oggi | 4,31 | 2,12 | 2,39 | 1,24 |

Contro gli ingressi in Attenzione il rapporto è 0,87 a 63 sedute e 0,94 a 126: non è più preciso dell'Attenzione, ma arriva prima.

Se si contano i cluster una volta sola (media dei cluster), la zona blu arriva entro 126 sedute nel 17,9% dei casi e il trigger entro 252 nel 20,7%.

**Zone blu avvisate.** Ci sono 48 ingressi in zona blu con almeno 126 sedute di storia calcolata prima. Per ciascuno si guarda se era stato preceduto, da 5 a 126 sedute prima, da:

| Preceduta da | Zone blu | Anticipo mediano |
|---|---|---|
| un ingresso in avvicinamento | 29 su 48 | 40 sedute |
| un ingresso in Attenzione | 38 su 48 | 33 sedute |
| almeno uno dei due | 43 su 48 | — |

Le 19 zone blu non avvisate dall'avvicinamento sono 8 nel 2008, 6 nel 2020 e 5 in altri anni. Quasi sempre il settore era già in Attenzione, per il drawdown o la breadth, prima di scendere sotto la soglia, quindi non era mai in Normale sotto la soglia. In due casi (XLB ad agosto 2011 e XLV a dicembre 2018) la breadth è scesa dalla soglia in su al livello blu in meno di 5 sedute. L'elenco completo è in `zoneBluAvvisate.elenco`.

**Per settore.** Un settore è idoneo se ha almeno 5 ingressi con la finestra di 126 sedute completa: XLC ne ha 3, quindi resta fuori.

| Settore | Livello | Soglia oggi | Sedute in avvicinamento | Ingressi | Zona blu ≤ 63 | Zona blu ≤ 126 | Base ≤ 126 | R63 | R126 | Trigger ≤ 252 |
|---|---|---|---|---|---|---|---|---|---|---|
| XLK | 6 | 26,0 | 1,1% | 9 | 1/9 | 1/9 | 6,5% | 4,63 | 1,71 | 1/9 |
| XLC | 5 | 25,8 | 0,5% | 5 | 0/4 | 0/3 | 8,4% | 0 | 0 | 0/2 |
| XLY | 8 | 25,8 | 0,8% | 9 | 1/8 | 1/8 | 4,3% | 9,62 | 2,91 | 1/8 |
| XLP | 11 | 30,4 | 1,2% | 11 | 1/10 | 2/10 | 6,2% | 3,70 | 3,23 | 2/8 |
| XLE | 1 | 29,6 | 8,6% | 19 | 4/19 | 6/19 | 9,4% | 5,70 | 3,36 | 7/19 |
| XLF | 6 | 27,9 | 2,9% | 18 | 4/18 | 5/18 | 10,1% | 5,41 | 2,75 | 5/17 |
| XLV | 11 | 28,1 | 1,3% | 9 | 2/9 | 2/9 | 11,4% | 4,11 | 1,95 | 2/9 |
| XLI | 5 | 26,3 | 1,1% | 12 | 2/12 | 2/12 | 8,1% | 5,06 | 2,06 | 2/12 |
| XLB | 10 | 33,1 | 4,1% | 27 | 5/26 | 9/26 | 12,7% | 4,36 | 2,72 | 10/25 |
| XLRE | 8 | 39,8 | **12,1%** | 15 | 1/14 | 2/14 | 12,9% | 1,29 | 1,11 | 2/13 |
| XLU | 5 | 36,0 | 4,0% | 24 | 5/23 | 5/22 | 14,0% | 3,50 | 1,62 | 8/22 |

Su 10 settori idonei, 6 superano il criterio (R ≥ 2 a entrambi gli orizzonti): XLY, XLP, XLE, XLF, XLI, XLB. Non lo superano XLK, XLV, XLRE e XLU, tutti a 126 sedute. Con pochi casi per settore (1–9 arrivi), ogni rapporto è molto incerto.

**Verdetto 1: INCERTO.**
- Il rapporto supera 2 in tutto e in entrambe le metà, a 63 e a 126 sedute.
- Ma regge solo in 6 settori idonei su 10 (60%), sotto la soglia fissata del 64%.
- Con la regola a 40 giorni il verdetto diventa «utile», con quella a 10 resta «incerto».

In pratica:
- l'ingresso in avvicinamento rende la zona blu entro 3 mesi circa 4–5 volte più probabile di una seduta Normale qualsiasi;
- in assoluto, però, arriva in zona blu solo un ingresso su 4–6: 77% di falsi allarmi a 126 sedute;
- non è più preciso dell'ingresso in Attenzione: dà circa 2 settimane in più (anticipo 33 contro 17,5 sedute) e avvisa 5 zone blu in più (43 su 48 con l'uno o l'altro, contro 38 con la sola Attenzione).

## 2. Avviso di rischio sul prezzo

| Gruppo | Rendimento a 21 | Rendimento a 63 | Calo massimo ≤ 21 | Calo massimo ≤ 63 |
|---|---|---|---|---|
| Ingressi in avvicinamento | +2,4% (65% positivi, n 158) | +4,8% (71%, n 152) | −2,1% | **−3,3%** |
| — 2005–2015 | +2,3% | +5,9% | −2,2% | −2,9% |
| — 2016–oggi | +2,4% | +4,5% | −2,1% | −3,4% |
| Base (a) | +1,1% | +3,0% | −1,8% | **−3,3%** |
| — 2005–2015 | +1,2% | +2,9% | −1,7% | −3,1% |
| — 2016–oggi | +1,1% | +3,0% | −2,0% | −3,6% |
| Ingressi in Attenzione | +1,7% | +5,8% | −2,2% | −3,8% |

Differenza del calo massimo mediano a 63 sedute rispetto alla base: 0,0 punti in tutto, +0,2 nel 2005–2015 e +0,2 dal 2016 in poi. Il criterio chiedeva −2 punti o peggio.

**Verdetto 2: NON UTILE** come avviso di rischio sul prezzo. Dopo l'ingresso il prezzo, in mediana, non scende più di una seduta Normale qualsiasi e anzi sale un po' di più. Fa eccezione qualche crisi (2008 e 2018, vedi sotto), che però è compensata da altre (2011 e 2022).

## 3. Zona d'acquisto

| Rendimento mediano (positivi, n) | 63 sedute | 126 sedute | 252 sedute |
|---|---|---|---|
| Ingressi in avvicinamento | +4,8% (71%, 152) | +7,6% (79%, 150) | +13,7% (85%, 144) |
| — 2005–2015 | +5,9% | +10,1% | +16,9% |
| — 2016–oggi | +4,5% | +6,6% | +12,6% |
| Base (a) | +3,0% | +6,0% | +11,2% |
| — 2005–2015 | +2,9% | +5,9% | +11,6% |
| — 2016–oggi | +3,0% | +6,1% | +10,7% |
| Trigger | +5,1% (75%, 60) | +10,2% (73%, 60) | +19,6% (80%, 60) |
| — 2005–2015 (28) | +2,9% | +9,2% | +14,8% |
| — 2016–oggi (32) | +6,1% | +11,7% | +22,4% |
| Ingressi in Attenzione | +5,8% | +8,8% | +15,9% |

Il vantaggio sulla base è piccolo, da 0,5 a 5,3 punti: a 126 sedute dal 2016 è appena +0,5. Contato per cluster, a 252 sedute è +13,1% contro +11,2%.

**Verdetto 3: NON UTILE**, secondo il criterio fissato:
- batte la base a tutti e tre gli orizzonti in entrambe le metà;
- ma in tutto resta sotto la mediana dei trigger a tutti e tre gli orizzonti (4,8 contro 5,1; 7,6 contro 10,2; 13,7 contro 19,6);
- nel 2005–2015 invece fa meglio dei trigger: il confronto dipende dal periodo.

Come punto d'acquisto è un po' meglio di un giorno qualsiasi, non meglio del trigger. Il paragrafo 4 mostra però che aspettare il trigger, in pratica, spesso vuol dire non comprare.

## 4. Strategie a confronto
L'uscita è la stessa per tutte: ingresso + 252 sedute (oppure + 504). Se il segnale atteso non arriva prima dell'uscita, si resta liquidi a rendimento 0. Le decisioni usano solo ciò che si sa quel giorno.

| Uscita a +252 (144 episodi) | Comprano | Rendimento mediano, tutti gli episodi | Rendimento mediano se compra | Positivi | Calo mediano dal prezzo d'acquisto | Calo peggiore |
|---|---|---|---|---|---|---|
| Compra all'ingresso | 144 | +13,7% | +13,7% | 123/144 | −4,6% | −60,8% |
| Aspetta la zona blu | 45 | 0,0% | +14,8% | 36/45 | −6,0% | −47,1% |
| Aspetta il trigger | 40 | 0,0% | +11,7% | 32/40 | −5,0% | −38,2% |
| Trigger entro 126 sedute, se no compra a +126 | 144 | +7,3% | +7,3% | 103/144 | −4,5% | −58,0% |

Differenze a coppie, episodio per episodio:

| Uscita | Ingresso − trigger: mediana (meglio l'ingresso) | Ingresso − (trigger o +126): mediana (meglio l'ingresso) |
|---|---|---|
| +252 | +11,6 punti (105/144) | +6,4 punti (100/144) |
| +504 | +18,4 punti (91/132) | +8,0 punti (90/132) |

Nelle due metà si ha lo stesso segno: a +252, ingresso − trigger vale +14,9 punti nel 2005–2015 e +6,5 dal 2016.

**Caso condizionato** (lo si sa solo dopo, quindi non è una strategia). Ci sono 42 episodi che arrivano in zona blu e poi al trigger entro 252 sedute:
- in mediana il prezzo all'ingresso in zona blu è **−10,5%** rispetto a quello dell'ingresso in avvicinamento, e al trigger è **−5,2%**;
- comprare all'ingresso in avvicinamento sarebbe stato meglio che comprare al trigger in 9 casi su 42, e meglio che in zona blu in 4 su 42;
- chi compra all'ingresso sopporta in mediana un calo di −14,0% prima del trigger (il peggiore −56,5%), contro −4,5% dalla zona blu;
- il trigger costa in mediana +4,7% rispetto al prezzo in zona blu;
- il minimo cade prima della zona blu solo in 8 casi su 42.

Lettura:
- Quando l'avvicinamento «arriva», comprare subito costa caro: circa 10 punti e un calo di circa il 14% da sopportare.
- Poiché arriva solo in un caso su 4–6, chi aspetta resta spesso fuori da un mercato che sale.
- Come regola d'acquisto, quindi, l'avvicinamento non aggiunge niente: rende come comprare quasi in qualsiasi giorno (vedi paragrafo 3).
- Il valore pratico della zona blu e del trigger è avere un prezzo migliore nei pochi casi veri, non battere il «compra e tieni».

## 5. Per settore e per crisi

| Crisi (date d'ingresso) | Ingressi | Zona blu ≤ 126 | Trigger ≤ 252 | Calo massimo ≤ 63 (base) | Rendimento a 63 (base) | Rendimento a 252 (base) |
|---|---|---|---|---|---|---|
| 2008 (07/2007–06/2009) | 5 | 3/5 | 3/5 | −12,0% (−8,6%) | −4,8% (−3,4%) | −28,5% (−26,3%) |
| 2011 | 12 | 5/12 | 5/12 | −4,5% (−8,8%) | +8,2% (−1,1%) | +18,6% (+10,8%) |
| 2015-16 | 14 | 5/14 | 5/14 | −5,4% (−5,7%) | +6,1% (+1,3%) | +16,1% (+9,6%) |
| 2018 | 9 | 5/9 | 5/9 | −12,5% (−5,6%) | −1,7% (+0,1%) | +11,3% (+6,3%) |
| 2020 | 2 | 2/2 | 2/2 | −32,0% (−30,3%) | −6,2% (−8,8%) | +32,4% (+20,9%) |
| 2022 | 19 | 6/19 | 8/19 | −5,9% (−9,3%) | −1,0% (−2,6%) | +2,8% (−0,8%) |
| 2025 | 7 | 1/7 | 1/7 | −2,9% (−5,0%) | +5,9% (+3,9%) | +17,6% (+13,8%) |
| fuori crisi | 90 | 8/82 | 11/76 | −2,1% (−2,8%) | +5,9% (+3,6%) | +16,7% (+12,6%) |

- **Più di metà degli ingressi (90 su 158) cade fuori dalle crisi.** Lì arriva in zona blu 1 ingresso su 10 (8/82), contro il 5,1% della base fuori crisi.
- **Nelle crisi vere l'avvicinamento si vede poco.** Nel 2008 ci sono 5 ingressi e nel 2020 solo 2, perché i settori passano in Attenzione per il drawdown o per la breadth prima di scendere sotto la soglia.
- **XLRE**: soglia 39,8 contro un livello di 8. È in avvicinamento nel **12,1%** delle sedute dal 2016 (la quota più alta; la prima versione di questa nota diceva 46,4% per un errore dello script, che contava anche le sedute prima del 2016, corretto il 31/10/2026), con R126 = 1,1 e 2 zone blu su 14 ingressi: qui il segnale non distingue niente. XLC (0,5% delle sedute, 0 zone blu su 3) ha troppo poca storia per dire qualcosa.
- **XLU**: 24 ingressi, 5/22 in zona blu entro 126 sedute (R126 = 1,6 contro una base alta del 14%), 8/22 trigger entro 252. Rendimenti dopo l'ingresso +11,7% a 126 e +17,0% a 252, contro +5,9% e +10,4% della base. Utile come preavviso a 3 mesi (R63 = 3,5), meno a 6.
- **XLK**: è raro (1,1% delle sedute) e arriva quasi mai (1/9 in zona blu). Dopo l'ingresso il rendimento è alto (+13,1% a 126 contro +9,0%), ma su 9 casi.
- **XLF**: 18 ingressi, 5/18 in zona blu, R126 = 2,75, calo massimo a 63 −2,8% contro −3,6%. È il settore dove il preavviso regge meglio, insieme a XLE e XLB.
- **XLE**: è l'unico con il calo dopo l'ingresso peggiore della base (−7,3% contro −5,6% a 63 sedute).

## Robustezza

| Regola dei giorni | Ingressi | Cluster | P(zona blu ≤ 63) | P(zona blu ≤ 126) | R63 | R126 | Calo massimo ≤ 63 | Rendimento a 252 | Verdetti 1 / 2 / 3 |
|---|---|---|---|---|---|---|---|---|---|
| 10 sedute | 194 | 21 | 16,0% | 22,0% | 4,32 | 2,39 | −2,8% | +14,4% | incerto / non utile / non utile |
| 20 sedute | 158 | 23 | 17,1% | 23,3% | 4,62 | 2,53 | −3,3% | +13,7% | incerto / non utile / non utile |
| 40 sedute | 128 | 28 | 18,0% | 25,0% | 4,86 | 2,72 | −3,8% | +13,6% | utile / non utile / non utile |

I verdetti 2 e 3 non cambiano. Il verdetto 1 resta al limite.

## Verdetti in sintesi

| Domanda | Verdetto | Perché |
|---|---|---|
| 1. Preavviso della zona blu | **incerto** (al limite) | rapporto da 4,6 a 2,5 volte la base e stabile nelle due metà, ma regge in 6 settori su 10; il 77% degli ingressi non arriva in zona blu; non più preciso dell'Attenzione, solo circa 2 settimane prima |
| 2. Avviso di rischio sul prezzo | **non utile** | calo massimo mediano a 63 sedute identico alla base (−3,3%) |
| 3. Zona d'acquisto | **non utile** (secondo il criterio) | batte la base di poco, ma resta sotto i trigger in tutto |
| 4. Strategie | nessun criterio | comprare all'ingresso batte l'attesa solo perché l'attesa spesso lascia fuori dal mercato; nei casi veri costa circa 10 punti e un calo mediano del 14% |
| 5. Settori | descrittivo | inutile in XLRE (e XLC); più informativo in XLF, XLE e XLB |

**Uso consigliato, se lo si tiene:**
- solo come promemoria per la watchlist («guardare questo settore nelle prossime settimane»), non come segnale d'acquisto né di vendita;
- dice che la zona blu è diventata possibile (circa 1 volta su 4 o 5), con circa un mese e mezzo di anticipo;
- non dice che il prezzo scenderà;
- in XLRE non dice niente.

Comprare all'ingresso non è meglio che comprare in un giorno qualsiasi. Chi vuole un prezzo migliore deve aspettare la zona blu o il trigger, sapendo che spesso non arrivano.

## Limiti
- **Livelli blu e membri**: i livelli blu sono di oggi (quant-rea, Massimo Rea), quindi scelti col senno di poi. La breadth è ricostruita con i membri di oggi dei settori.
- **Pochi casi indipendenti**:
  - 158 ingressi, ma solo 23 cluster;
  - 48 zone blu e 61 trigger in tutto;
  - nei settori i casi che arrivano sono 1–10;
  - le percentuali per settore e per crisi sono indicative.
- **Soglia del 2005**: nei primi mesi del 2005 la soglia si basa su poca storia (2 ingressi nel 2005).
- **Ingressi recenti**: gli 11 ingressi del 2026 hanno quasi tutti finestre incomplete e sono esclusi dalle probabilità.
- **Prezzi**:
  - si misura dalla chiusura del giorno del segnale, che in pratica si conosce a mercato chiuso: comprare il giorno dopo cambierebbe di poco i numeri, ma qui non è misurato;
  - niente costi, niente tasse, liquidità a rendimento 0 nelle strategie: questo penalizza chi aspetta.
- **Basi**: la base (a) è fatta di sedute molto correlate tra loro, quindi le mediane sono stabili ma non indipendenti. Il confronto con i trigger mette insieme momenti di mercato diversi; il paragrafo 4 fa il confronto a coppie.
- **Criteri**: soglie e orizzonti dei criteri sono stati fissati prima. Quello per settore, «almeno il 64% dei settori idonei» quando gli idonei sono meno di 11, è una scelta mia, scritta nello script prima di guardare i numeri.
- **Strategie**: il trigger può fallire, ma la strategia «aspetta il trigger» non vende al fallimento.
