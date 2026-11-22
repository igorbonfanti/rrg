# Le bolle si sgonfiano a rotazione: chi per primo, chi dopo, chi insieme? · backtest

Fase di ricerca del 21/11/2026, sola lettura sull'app. Domanda dell'utente sul pannello «Distanza dal massimo degli ultimi 3 anni» (vista 8 VIX; idea di Francesco Caruso, Cicli&Mercati: «le bolle si sgonfiano a rotazione»): c'è un ordine che si ripete, utile all'analisi?

- **Script**: `script/backtest.mjs` (scarica le chiusure di Yahoo in `cache/`, esclusa da git, e scrive `risultati.json`); `script/tabelle.mjs` (solo formato: scrive `tabelle.md`, con gli elenchi completi degli episodi); `script/linea-del-tempo.mjs` (prototipo grafico); `script/fixture.mjs` (dalla 1.12.0: scrive `test/fixtures/peaks_20261120.json.gz` per `test/peaks.test.js`, che confronta la linea del tempo dell'app, `js/peaks.js`, con `risultati.json`).
- **Ricalcolo indipendente**: `script/verifica.py` (Python, altro codice e algoritmi a forza bruta, legge i file grezzi di Yahoo). Risultato: **0 differenze** su episodi (date, cali, minimi, conferme, a 15, 20, 30 e 40%), finestre, ordine tipico, criteri, basi di confronto, conferme e valori di oggi. Una prova con 4 valori alterati di proposito in `risultati.json` li trova tutti e 4.
- **Seconde fonti**: (1) le chiusure scaricate coincidono con `data/ath_history.json` della pipeline su tutte le sedute in comune (scarto massimo 0,0024%, bitcoin); (2) con le serie FRED (S&P 500 dal 2016, Nasdaq-100 dal 1986, scaricate il 12/11/2026 per `ricerca/bolle-rotazione/`) gli episodi conclusi sono uguali per date e cali (S&P 500 ≥ 15%: 4 su 4; ≥ 20%: 2 su 2; Nasdaq-100 ≥ 20%: 6 su 6); l'unica differenza è nel Nasdaq-100 ≥ 15% del 2004 (massimo il 21/01 con FRED, −16,3%, il 26/01 con Yahoo, −16,0%), che non entra nei risultati.
- **Rifare**: `node ricerca/rotazione-bolle/script/backtest.mjs --refresh && python3 -I ricerca/rotazione-bolle/script/verifica.py && node ricerca/rotazione-bolle/script/tabelle.mjs > ricerca/rotazione-bolle/tabelle.md && NODE_PATH=$(npm root -g) node ricerca/rotazione-bolle/script/linea-del-tempo.mjs --png`.

Dati fino al 20/11/2026 (ultima seduta chiusa di tutti e 9 i mercati). Tutti i numeri qui sotto vengono da `risultati.json`.

## 1. Domanda e criteri, decisi prima di guardare i risultati

**Massimo di ciclo** (soglia X). Una chiusura più alta di tutte quelle dei 365 giorni prima (massimo di 52 settimane, con almeno un anno di storia alle spalle), dopo la quale il prezzo scende di almeno X% prima di tornare sopra. Si usano le chiusure, come nel pannello. Soglie: 15, 20 e 30% per tutti, 40% anche per bitcoin e argento, 10% per l'S&P 500 (serve per i falsi allarmi). Per ogni massimo:
- **calo massimo**: la chiusura più bassa dopo il massimo, fino al ritorno sopra il massimo, oppure fino al massimo di ciclo successivo se viene prima (vedi sotto, «Cambio fatto dopo il primo passaggio»);
- **discesa**: i giorni dal massimo al minimo; **recupero**: i giorni fino al ritorno sopra il massimo;
- **conferma**: il primo giorno in cui la chiusura è almeno X% sotto il massimo, cioè il giorno in cui, dal vivo, si sarebbe saputo che quel massimo era un massimo di ciclo.

Ho scelto il massimo di 52 settimane e non quello di 3 anni del pannello perché con 3 anni sparirebbero i cali del 2010 e del 2011, che l'utente elenca.

**Finestra di rotazione.** ±365 giorni dal massimo P di un calo dell'S&P 500: i cali ≥ 15%, e il loro sottoinsieme ≥ 20%. Per confronto anche i cali ≥ 20% del Nasdaq-100. Per ogni mercato si prende, tra i suoi massimi di ciclo ≥ 20% nella finestra, quello con la chiusura più alta. Lo scarto è in giorni da P (negativo = prima). «Insieme» vuol dire entro 31 giorni. «Dati mancanti» vuol dire che la serie non permette un massimo valido già a P − 365 giorni.

**Anticipatore utile.** Un mercato lo è solo se valgono tutte e tre le condizioni:
- (a) ha un massimo di ciclo ≥ 20% tra 365 e 30 giorni prima di P in almeno il 70% dei cali ≥ 20% dell'S&P 500 in cui aveva dati, con almeno 4 casi;
- (b) i falsi allarmi sono meno della metà. Un suo massimo ≥ 20% è un falso allarme se nei 365 giorni dopo l'S&P 500 non ha un calo ≥ 10%, dal massimo al minimo, entrambi dentro la finestra. I massimi degli ultimi 365 giorni restano «in sospeso»;
- (c) (a) e (b) reggono anche separatamente nel 2000-2012 e nel 2013-oggi.

**Basi di confronto**, aggiunte come chiede il metodo:
- per (a): quante sedute dell'S&P 500, prese a caso, hanno un massimo ≥ 20% del mercato tra 365 e 30 giorni prima;
- per (b): quante sedute dell'S&P 500, prese a caso, NON sono seguite da un calo ≥ 10% entro un anno.

**Gruppi.** Ciclo industriale (semiconduttori, KOSPI, rame), metalli preziosi (oro, argento), rischio speculativo (bitcoin). Un caso del gruppo conta se almeno metà dei membri ha i dati. È colto se almeno metà dei membri con dati ha un massimo tra 365 e 30 giorni prima. Per i falsi allarmi, il gruppo dà un allarme quando, nei 182 giorni fino a un massimo di un membro, almeno metà dei membri ha avuto un massimo di ciclo; un nuovo allarme entro 365 giorni dal precedente non conta.

**Ordine tipico.** Per ogni calo ≥ 15% dell'S&P 500 si mettono in fila i mercati con un massimo nella finestra, S&P 500 compreso (a parità, rango medio). Il rango va da 0 (primo) a 1 (ultimo) e si fa la media per mercato.

**Cambio fatto dopo il primo passaggio**, dichiarato. All'inizio il calo massimo arrivava fino al ritorno sopra il massimo. Così i massimi del petrolio del 2008, 2011 e 2013 finivano tutti nella chiusura negativa del 20/04/2020, perché il WTI non è più tornato a 145 dollari. Ho fermato il calo al massimo di ciclo successivo. Questo cambia solo la misura dei cali e delle discese, non le date dei massimi, le finestre o i criteri.

## 2. Risposta breve e verdetto

**Verdetto: solo descrittivo.** C'è un ordine che si ripete abbastanza spesso, ma nessun mercato e nessun gruppo supera i criteri decisi prima.

- **Chi prima.** Nei cali dell'S&P 500 dal 2000 il **KOSPI** e i **semiconduttori** fanno di solito il massimo per primi: in mediana 80 e 71 giorni prima dell'S&P 500.
- **Chi insieme.** Il **Nasdaq-100** fa il massimo insieme all'S&P 500 (5 volte su 6 in cui ha avuto un calo ≥ 20%).
- **Chi dopo.** Le materie prime vengono di solito dopo. L'**oro** arriva dopo in tutti i 5 cali in cui ha fatto un massimo di ciclo, in mediana 161 giorni dopo.
- **Bitcoin** non ha una posizione fissa.
- **Come anticipatore non serve.** Ci sono solo 4 cali ≥ 20% dell'S&P 500 dal 2000, e per 6 mercati su 8 i casi con dati sono meno di 4. Il KOSPI ne coglie 2 su 4, il Nasdaq-100 1 su 4. Il «colpo» del bitcoin (4 su 4 con i cali ≥ 15%) non vuol dire niente: un suo massimo seguito da un calo ≥ 20% c'è nel 79,3% di tutte le finestre di 11 mesi. In più il massimo di chi arriva prima si riconosce spesso troppo tardi: dei 9 massimi che semiconduttori e KOSPI hanno fatto prima dell'S&P 500 nei cali conclusi, solo 3 erano già scesi del 20% il giorno del massimo dell'S&P 500 (1 su 4 e 2 su 5).
- **Oggi (20/11/2026)** l'S&P 500 è a −11,6% dal massimo del 06/10/2026. KOSPI e semiconduttori hanno fatto il massimo il 22/06/2026, 106 giorni prima, come nell'ordine tipico. Questa volta però anche oro, argento, petrolio e bitcoin hanno fatto il massimo **prima** dell'S&P 500. Per l'oro è il contrario di tutti i cali precedenti (5 volte su 5 dopo); per argento e petrolio è meno insolito (l'argento è venuto prima 2 volte su 7, il petrolio mai: 3 volte insieme, 2 dopo).

## 3. Episodi (domanda 1)

### T1. Massimi di ciclo seguiti da un calo ≥ 20% (chiusure, dal 2000; bitcoin dal 2015)

Numero di episodi per soglia:

| Mercato | ≥ 15% | ≥ 20% | ≥ 30% | ≥ 40% | Dati da | Massimi validi da |
| --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 22 | 17 | 8 | 5 | 17/09/2014 | 17/09/2015 |
| Oro | 8 | 6 | 2 | · | 30/08/2000 | 30/08/2001 |
| Argento | 16 | 10 | 8 | 5 | 30/08/2000 | 30/08/2001 |
| Rame | 15 | 10 | 5 | · | 30/08/2000 | 30/08/2001 |
| Petrolio WTI | 19 | 13 | 9 | · | 23/08/2000 | 23/08/2001 |
| Nasdaq-100 | 12 | 6 | 3 | · | 01/10/1985 | 01/01/2000 |
| S&P 500 | 8 | 4 | 3 | · | 30/12/1927 | 01/01/2000 |
| Semiconduttori | 16 | 11 | 7 | · | 13/07/2001 | 13/07/2002 |
| KOSPI (Corea) | 14 | 10 | 7 | · | 11/12/1996 | 01/01/2000 |

Gli elenchi completi, con data, calo massimo, discesa e recupero di ogni episodio, sono in `tabelle.md` (T1). Il calo massimo di uno stesso massimo può cambiare con la soglia, perché il calo si ferma al massimo di ciclo successivo della stessa soglia. Per esempio l'argento del 02/08/2016 fa −32,5% con la soglia 20% (si ferma al massimo del 04/09/2019) e −43,2% con la soglia 40%.

I cali ≥ 20% dell'S&P 500 dal 2000 sono solo **4**: 2000, 2007, 2020 e 2022. Sulle chiusure, i cali del 2011 (−19,4%), del 2018 (−19,8%) e del 2025 (−18,9%) restano sotto il 20%; il 2015-16 (−14,2%) è sotto anche il 15%. Il calo in corso del 2026 è a −11,6%.

## 4. Ordine dei massimi (domanda 2)

### T2. Finestre dei cali ≥ 15% dell'S&P 500: giorni tra il massimo di ogni mercato e quello dell'S&P 500

| Massimo | Calo | Bitcoin | Oro | Argento | Rame | Petrolio WTI | Nasdaq-100 | S&P 500 | Semiconduttori | KOSPI (Corea) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24/03/2000 | −49,1% | — | — | — | — | — | ≈+3 | **0** | — | −80 [−259] |
| 09/10/2007 | −56,8% | — | +161 | +148 | +267 [−81] | +268 | ≈+22 | **0** | −84 | ≈+22 |
| 23/04/2010 | −16,0% | — | · | −142 | +297 [−18] | ≈−17 | · (15%: 0) | **0** | +300 [−8] | · |
| 29/04/2011 | −19,4% | — | +115 | ≈0 | −74 | ≈0 | · (15%: +84) | **0** | −71 | ≈+3 |
| 20/09/2018 | −19,8% | −278 [−316, +279] | · | +349 | −104 | ≈+13 | ≈−22 | **0** | −192 | −234 |
| 19/02/2020 | −33,9% | +324 [−238] | +169 | +348 [−168, +173] | · | · | ≈0 | **0** | ≈0 | ≈−28 |
| 03/01/2022 | −25,4% | −56 [−360, −316, −265] | +64 | −336 | +60 | +64 [−69] | −45 | **0** | ≈−7 | −181 |
| 19/02/2025 | −18,9% | +229 [−343, −29] | +344 | +341 | +154 [−274, +35] | · | ≈0 | **0** | −224 | −223 |
| 06/10/2026 (in corso) | −11,6% | −365 | −250 | −253 | · (15%: −27) | −182 | · (15%: 0) | **0** | −106 | −106 |

Numero = giorni di calendario dal massimo dell'S&P 500 (negativo = prima) del massimo di ciclo ≥ 20% più alto del mercato entro ±365 giorni; ≈ = insieme (entro 31 giorni); tra parentesi quadre gli altri massimi ≥ 20% nella finestra; · = nessun massimo seguito da un calo ≥ 20% nella finestra (tra parentesi lo scarto con la soglia 15%, se c'è); — = serie troppo corta. L'ultima riga è il calo in corso dell'S&P 500 (≥ 10%, non ancora 15%).

### T2c. Chi prima, chi insieme, chi dopo (cali ≥ 15% dell'S&P 500)

| Massimo S&P 500 | Prima (oltre 1 mese) | Insieme (±1 mese) | Dopo (oltre 1 mese) | Nessun calo ≥ 20% | Dati mancanti |
| --- | --- | --- | --- | --- | --- |
| 24/03/2000 | KOSPI (Corea) (−80) | S&P 500 (0), Nasdaq-100 (+3) | — | — | Bitcoin, Oro, Argento, Rame, Petrolio WTI, Semiconduttori |
| 09/10/2007 | Semiconduttori (−84) | S&P 500 (0), Nasdaq-100 (+22), KOSPI (Corea) (+22) | Argento (+148), Oro (+161), Rame (+267), Petrolio WTI (+268) | — | Bitcoin |
| 23/04/2010 | Argento (−142) | Petrolio WTI (−17), S&P 500 (0) | Rame (+297), Semiconduttori (+300) | Oro, Nasdaq-100, KOSPI (Corea) | Bitcoin |
| 29/04/2011 | Rame (−74), Semiconduttori (−71) | Argento (0), Petrolio WTI (0), S&P 500 (0), KOSPI (Corea) (+3) | Oro (+115) | Nasdaq-100 | Bitcoin |
| 20/09/2018 | Bitcoin (−278), KOSPI (Corea) (−234), Semiconduttori (−192), Rame (−104) | Nasdaq-100 (−22), S&P 500 (0), Petrolio WTI (+13) | Argento (+349) | Oro | — |
| 19/02/2020 | — | KOSPI (Corea) (−28), Nasdaq-100 (0), S&P 500 (0), Semiconduttori (0) | Oro (+169), Bitcoin (+324), Argento (+348) | Rame, Petrolio WTI | — |
| 03/01/2022 | Argento (−336), KOSPI (Corea) (−181), Bitcoin (−56), Nasdaq-100 (−45) | Semiconduttori (−7), S&P 500 (0) | Rame (+60), Oro (+64), Petrolio WTI (+64) | — | — |
| 19/02/2025 | Semiconduttori (−224), KOSPI (Corea) (−223) | Nasdaq-100 (0), S&P 500 (0) | Rame (+154), Bitcoin (+229), Argento (+341), Oro (+344) | Petrolio WTI | — |
| 06/10/2026 | Bitcoin (−365), Argento (−253), Oro (−250), Petrolio WTI (−182), Semiconduttori (−106), KOSPI (Corea) (−106) | S&P 500 (0) | — | Rame, Nasdaq-100 | — |

### T2b. Finestre dei cali ≥ 20% del Nasdaq-100

| Massimo | Calo | Bitcoin | Oro | Argento | Rame | Petrolio WTI | Nasdaq-100 | S&P 500 | Semiconduttori | KOSPI (Corea) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 27/03/2000 | −82,9% | — | — | — | — | — | **0** | ≈−3 | — | −83 [−262] |
| 31/10/2007 | −53,7% | — | +139 | +126 | +245 [−103] | +246 | **0** | ≈−22 | −106 | ≈0 |
| 29/08/2018 | −23,0% | −256 [−362, −294, +301] | · | · | −82 | +35 | **0** | · (15%: +22) | −170 | −212 |
| 19/02/2020 | −28,0% | +324 [−238] | +169 | +348 [−168, +173] | · | · | **0** | ≈0 | ≈0 | ≈−28 |
| 19/11/2021 | −35,6% | ≈−11 [−315, −271, −220] | +109 | −291 | +105 | +109 [−24] | **0** | +45 | +38 | −136 |
| 19/02/2025 | −22,9% | +229 [−343, −29] | +344 | +341 | +154 [−274, +35] | · | **0** | · (15%: 0) | −224 | −223 |

## 5. Pattern (domanda 3)

### T3. Ordine tipico (8 cali ≥ 15% dell'S&P 500, 2000-2025)

| Mercato | Con un massimo nella finestra | Prima | Insieme | Dopo | Scarto mediano (g) | Rango medio (0 = primo, 1 = ultimo) | Nessun calo ≥ 20% | Dati mancanti |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KOSPI (Corea) | 7 su 8 | 4 | 3 | 0 | −80 | 0,23 | 1 | 0 |
| Semiconduttori | 7 su 7 | 4 | 2 | 1 | −71 | 0,33 | 0 | 1 |
| Bitcoin | 4 su 4 | 2 | 0 | 2 | +86,5 | 0,45 | 0 | 4 |
| S&P 500 | 8 su 8 | 0 | 8 | 0 | 0 | 0,46 | 0 | 0 |
| Nasdaq-100 | 6 su 8 | 1 | 5 | 0 | 0 | 0,50 | 2 | 0 |
| Rame | 6 su 7 | 2 | 0 | 4 | +107 | 0,56 | 1 | 1 |
| Argento | 7 su 7 | 2 | 1 | 4 | +148 | 0,56 | 0 | 1 |
| Petrolio WTI | 5 su 7 | 0 | 3 | 2 | +13 | 0,71 | 2 | 1 |
| Oro | 5 su 7 | 0 | 0 | 5 | +161 | 0,86 | 2 | 1 |

Con i soli 4 cali ≥ 20% dell'S&P 500: KOSPI (Corea) 0,12 (mediana −54 g, 4 casi); Semiconduttori 0,28 (mediana −7 g, 3 casi); S&P 500 0,40 (mediana 0 g, 4 casi); Nasdaq-100 0,52 (mediana +1,5 g, 4 casi); Argento 0,52 (mediana +148 g, 3 casi); Bitcoin 0,54 (mediana +134 g, 2 casi); Oro 0,77 (mediana +161 g, 3 casi); Rame 0,80 (mediana +163,5 g, 2 casi); Petrolio WTI 0,97 (mediana +166 g, 2 casi).

Con i 6 cali ≥ 20% del Nasdaq-100: KOSPI (Corea) 0,14 (mediana −109,5 g, 6 casi); Semiconduttori 0,25 (mediana −106 g, 5 casi); S&P 500 0,40 (mediana −1,5 g, 4 casi); Bitcoin 0,44 (mediana +109 g, 4 casi); Nasdaq-100 0,53 (mediana 0 g, 6 casi); Argento 0,60 (mediana +233,5 g, 4 casi); Rame 0,68 (mediana +129,5 g, 4 casi); Oro 0,83 (mediana +154 g, 4 casi); Petrolio WTI 0,98 (mediana +109 g, 3 casi).

Come leggerla:
- **KOSPI e semiconduttori** non sono mai stati gli ultimi. Il KOSPI non ha mai fatto il massimo dopo l'S&P 500 (oltre un mese) in nessuno degli 8 cali; i semiconduttori una volta, nel 2010. Lo stesso ordine si vede prendendo come riferimento il Nasdaq-100.
- **Oro, rame e argento** di solito fanno il massimo dopo. Per esempio nel 2007-08 argento, oro, rame e petrolio fanno il massimo tra 148 e 268 giorni dopo l'S&P 500.
- **Bitcoin** ha massimi così frequenti (17 cali ≥ 20% in 11 anni) che un suo massimo «vicino» c'è quasi sempre.

### T4. Criterio dell'anticipatore (riferimento: i 4 cali ≥ 20% dell'S&P 500; mercati ≥ 20%)

| Mercato o gruppo | (a) colti | Base (a) | (b) falsi allarmi | Base (b) | (a) 2000-12 | (a) 2013-oggi | (b) 2000-12 | (b) 2013-oggi | In sospeso | a | b | c | Esito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 2 su 2 (100,0%) | 79,3% | 4 su 17 (23,5%) | 42,3% | — | 2 su 2 | — | 4 su 17 | 0 | no | sì | no | no |
| Oro | 0 su 3 (0,0%) | 22,0% | 3 su 5 (60,0%) | 42,3% | 0 su 1 | 0 su 2 | 2 su 3 | 1 su 2 | 1 | no | no | no | no |
| Argento | 2 su 3 (66,7%) | 35,4% | 5 su 9 (55,6%) | 42,3% | 0 su 1 | 2 su 2 | 2 su 5 | 3 su 4 | 1 | no | no | no | no |
| Rame | 1 su 3 (33,3%) | 34,9% | 2 su 10 (20,0%) | 42,3% | 1 su 1 | 0 su 2 | 1 su 5 | 1 su 5 | 0 | no | sì | no | no |
| Petrolio WTI | 1 su 3 (33,3%) | 45,4% | 5 su 12 (41,7%) | 42,3% | 0 su 1 | 1 su 2 | 3 su 6 | 2 su 6 | 1 | no | sì | no | no |
| Nasdaq-100 | 1 su 4 (25,0%) | 20,5% | 0 su 6 (0,0%) | 42,3% | 0 su 2 | 1 su 2 | 0 su 2 | 0 su 4 | 0 | no | sì | no | no |
| Semiconduttori | 1 su 3 (33,3%) | 40,5% | 2 su 10 (20,0%) | 42,3% | 1 su 1 | 0 su 2 | 2 su 5 | 0 su 5 | 1 | no | sì | no | no |
| KOSPI (Corea) | 2 su 4 (50,0%) | 32,4% | 1 su 9 (11,1%) | 42,3% | 1 su 2 | 1 su 2 | 1 su 5 | 0 su 4 | 1 | no | sì | no | no |
| Ciclo industriale | 1 su 3 (33,3%) | 37,3% | 2 su 11 (18,2%) | 42,3% | 1 su 1 | 0 su 2 | 2 su 7 | 0 su 4 | 1 | no | sì | no | no |
| Metalli preziosi | 2 su 3 (66,7%) | 40,7% | 4 su 9 (44,4%) | 42,3% | 0 su 1 | 2 su 2 | 2 su 5 | 2 su 4 | 1 | no | sì | no | no |

Base (a): quota delle sedute dell'S&P 500 dal 2000 (con i dati del mercato) che hanno un massimo di ciclo ≥ 20% del mercato tra 365 e 30 giorni prima: quanto spesso il criterio sarebbe «colto» per caso, scegliendo un giorno qualsiasi. Base (b): quota delle sedute dell'S&P 500 dal 2000 NON seguite da un calo ≥ 10% entro 365 giorni (2756 su 6512): il tasso di falsi allarmi di un allarme dato a caso.

### T4b. Sensibilità (colti / casi; falsi allarmi / allarmi; criteri a-b-c)

| Mercato o gruppo | Principale | SPX≥15%, mercati ≥20% | SPX≥20%, mercati ≥15% | SPX≥20%, mercati ≥30% | NDX≥20% come riferimento, mercati ≥20% |
| --- | --- | --- | --- | --- | --- |
| Bitcoin | 2/2; 4/17; no-sì-no | 4/4; 4/17; sì-sì-no | 2/2; 6/22; no-sì-no | 2/2; 2/8; no-sì-no | 4/4; 4/17; sì-sì-no |
| Oro | 0/3; 3/5; no-no-no | 0/7; 3/5; no-no-no | 0/3; 5/7; no-no-no | 0/3; 1/1; no-no-no | 0/5; 3/5; no-no-no |
| Argento | 2/3; 5/9; no-no-no | 3/7; 5/9; no-no-no | 2/3; 6/15; no-sì-no | 2/3; 4/7; no-no-no | 2/5; 5/9; no-no-no |
| Rame | 1/3; 2/10; no-sì-no | 4/7; 2/10; no-sì-no | 2/3; 3/14; no-sì-no | 0/3; 1/5; no-sì-no | 3/5; 2/10; no-sì-no |
| Petrolio WTI | 1/3; 5/12; no-sì-no | 1/7; 5/12; no-sì-no | 1/3; 9/18; no-no-no | 0/3; 4/8; no-no-no | 0/5; 5/12; no-sì-no |
| Nasdaq-100 | 1/4; 0/6; no-sì-no | 1/8; 0/6; no-sì-no | 1/4; 2/11; no-sì-no | 1/4; 0/3; no-sì-no | 0/0; 0/6; no-sì-no |
| Semiconduttori | 1/3; 2/10; no-sì-no | 4/7; 2/10; no-sì-no | 2/3; 3/14; no-sì-no | 1/3; 1/6; no-sì-no | 3/5; 2/10; no-sì-no |
| KOSPI (Corea) | 2/4; 1/9; no-sì-no | 4/8; 1/9; no-sì-no | 3/4; 2/12; sì-sì-no | 2/4; 0/6; no-sì-no | 4/6; 1/9; no-sì-no |
| Ciclo industriale | 1/3; 2/11; no-sì-no | 4/7; 2/11; no-sì-no | 2/3; 2/12; no-sì-no | 0/3; 0/7; no-sì-no | 3/5; 2/11; no-sì-no |
| Metalli preziosi | 2/3; 4/9; no-sì-no | 3/7; 4/9; no-sì-no | 2/3; 4/12; no-sì-no | 2/3; 4/7; no-no-no | 2/5; 4/9; no-sì-no |

Cosa dicono questi numeri:
- **(a) non passa per nessuno.** Hanno almeno 4 casi solo il Nasdaq-100 e il KOSPI, gli unici con dati prima del 2000: 1 su 4 e 2 su 4. Rame, oro, argento, petrolio e semiconduttori hanno 3 casi, bitcoin 2. Nelle varianti passano solo il bitcoin (4 su 4, ma la base è il 79,3%) e il KOSPI con i suoi cali ≥ 15% (3 su 4). Nessuno dei due regge nei due sottoperiodi: il bitcoin non ha dati prima del 2013, il KOSPI fa 1 su 2 nel 2013-oggi.
- **(b) è un filtro debole.** Dal 2000 l'S&P 500 ha avuto un calo ≥ 10% entro un anno dopo il 57,7% delle sedute (3756 su 6512). Un allarme dato a caso sbaglia quindi il 42,3% delle volte, e già passa la soglia del 50%. Fanno meglio della base Nasdaq-100 (0 su 6), KOSPI (1 su 9), rame e semiconduttori (2 su 10) e bitcoin (4 su 17). Fanno peggio oro (3 su 5) e argento (5 su 9).
- **(c) non passa per nessuno.** Già (a) cade in almeno uno dei due periodi.

### T5. Il massimo di chi «arriva prima» si sapeva in tempo? (cali ≥ 15% dell'S&P 500)

Per mercato (cali conclusi): Bitcoin 8 su 8; Argento 2 su 3; Rame 2 su 4; Petrolio WTI 1 su 1; Nasdaq-100 0 su 1; Semiconduttori 1 su 4; KOSPI (Corea) 2 su 5.

Nei cali conclusi (2000-2025): 16 conferme arrivate prima del massimo dell'S&P 500 su 26 massimi arrivati prima.

Elenco completo dei massimi e delle conferme: `tabelle.md` (T5).

Anche quando un mercato fa il massimo prima, il −20% che lo rende riconoscibile arriva spesso dopo il massimo dell'S&P 500. Il bitcoin, che arriva sempre in tempo, è anche quello che dà più massimi in assoluto.

## 6. Oggi (domanda 4, solo descrittivo)

### T6. Oggi: massimo degli ultimi 3 anni (athStats di js/ath.js) all'ultima seduta scaricata

| Mercato | Ultima seduta | Massimo 3 anni | Giorni rispetto al massimo dell'S&P 500 | Distanza oggi | Calo massimo dal massimo | Massimo di ciclo in corso |
| --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 20/11/2026 | 06/10/2025 | −365 | −52,9% | −53,1% | ≥ 30% |
| Argento | 20/11/2026 | 26/01/2026 | −253 | −64,3% | −64,3% | ≥ 30% |
| Oro | 20/11/2026 | 29/01/2026 | −250 | −33,9% | −33,9% | ≥ 30% |
| Petrolio WTI | 20/11/2026 | 07/04/2026 | −182 | −25,6% | −39,3% | ≥ 30% |
| Semiconduttori | 20/11/2026 | 22/06/2026 | −106 | −43,5% | −43,5% | ≥ 30% |
| KOSPI (Corea) | 20/11/2026 | 22/06/2026 | −106 | −46,6% | −46,6% | ≥ 30% |
| Rame | 20/11/2026 | 09/09/2026 | −27 | −19,5% | −19,5% | ≥ 15% |
| Nasdaq-100 | 20/11/2026 | 06/10/2026 | 0 | −19,8% | −19,8% | ≥ 15% |
| S&P 500 | 20/11/2026 | 06/10/2026 | 0 | −11,6% | −11,6% | ≥ 10% |

Rispetto al massimo dell'S&P 500 del 06/10/2026 (calo in corso, −11,6% al 20/11/2026, non ancora un calo ≥ 15%):
- **Prima, come di solito**: KOSPI e semiconduttori, entrambi il 22/06/2026, 106 giorni prima. Oggi sono a −46,6% e −43,5%.
- **Prima, al contrario di come di solito**: bitcoin (06/10/2025, 365 giorni prima, proprio al bordo della finestra, −52,9%), argento (26/01/2026, −64,3%), oro (29/01/2026, −33,9%) e petrolio (07/04/2026, oggi −25,6%, al minimo −39,3%). Nei cali passati l'oro è sempre arrivato dopo (5 su 5) e l'argento dopo in 4 casi su 7; questa volta i metalli preziosi hanno avuto il loro ciclo prima.
- **Insieme**: Nasdaq-100 (06/10/2026, −19,8%) e rame (09/09/2026, −19,5%); nessuno dei due ha ancora toccato il −20%.

Questo è solo un confronto con l'ordine passato, non una previsione. Se il calo dell'S&P 500 si ferma sotto il 15%, la riga del 2026 non entra nemmeno nell'elenco dei cali; se l'S&P 500 torna sopra il massimo, il riferimento cambia.

## 7. Limiti

- **Pochi episodi.** 4 cali ≥ 20% dell'S&P 500 dal 2000, 8 cali ≥ 15% e 6 cali ≥ 20% del Nasdaq-100. Le percentuali su 3 o 4 casi sono solo indicative, e molti mercati non hanno dati per il 2000.
- **Serie corte.** I future di Yahoo partono da agosto 2000, SOXX da luglio 2001 e il bitcoin da settembre 2014. Con un anno di storia richiesto prima del massimo, il calo del 2000 c'è solo per S&P 500, Nasdaq-100 e KOSPI. Per i semiconduttori manca la bolla del 2000.
- **Future continui.** Oro, argento, rame e petrolio sono future continui: a ogni cambio di contratto il livello si sposta un po'. Il petrolio ha chiuso sotto zero il 20/04/2020: il calo del massimo del 03/10/2018 è oltre il −100% e va letto come «più del 100%», non come un numero.
- **Valute.** Il KOSPI è in won: per chi investe in dollari o euro il massimo e il calo possono essere diversi.
- **Senno di poi.** Le soglie del 20% e del 15%, la finestra di ±12 mesi e il massimo di 52 settimane sono scelte; con altre scelte i risultati cambiano (T4b; per l'ordine, i ranghi con i soli cali ≥ 20% sotto la T3). Un massimo di ciclo si riconosce solo dopo il calo (T5): l'ordine dei massimi è una ricostruzione a posteriori.
- **Scelta del massimo nella finestra.** Ho preso il massimo più alto; con mercati che hanno più massimi nella finestra (bitcoin, argento, rame) lo scarto dipende da questa scelta. Gli altri massimi sono comunque elencati in T2.
- **Casi non indipendenti.** Molti massimi cadono nelle stesse crisi (2007-08, 2021-22).

## 8. Cosa potrebbe mostrare l'app

Il pattern non regge come segnale, quindi nell'app **niente avvisi** né frasi del tipo «KOSPI anticipa l'S&P 500». Restano due possibilità solo descrittive, da decidere con l'utente:

1. **Linea del tempo dei massimi.** Un riquadro per episodio, una riga per mercato, il punto è il giorno del massimo rispetto a quello dell'S&P 500. Prototipo: `linea-del-tempo.svg`, `linea-del-tempo-chiaro.png` e `linea-del-tempo-scuro.png` (gli ultimi 4 cali ≥ 15% più quello in corso). Il pannello ordina già le righe per data del massimo (`js/ath.js`, ordine «date»): la linea del tempo aggiungerebbe il confronto con i cali passati.
2. **Una nota nella guida o un tooltip** con i numeri della tabella T3, detti come descrizione. Per esempio: «negli 8 cali dell'S&P 500 di almeno il 15% dal 2000, il KOSPI ha fatto il massimo prima o insieme all'S&P 500 in 7 casi su 7 (nel 2010 non ha avuto un calo ≥ 20%), i semiconduttori in 6 su 7, l'oro sempre dopo (5 casi su 5); pochi casi, non è un segnale». Prima di scriverla va ricontrollata con `verifica.py`.

Se si decide di andare avanti, i numeri del testo vanno presi da `risultati.json` e ricontrollati, e la regola «massimo di ciclo» va scritta nella guida.
