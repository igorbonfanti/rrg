# Verifica indipendente — Breadth e drawdown (sezioni 11, 14, 30, 31 del fascicolo "Quant Rea")

**Script:** `/home/user/rrg/ricerca/quant-rea/script/verifica_breadth.py` (tutte le tabelle complete sono in `tabelle_breadth.md`, serie giornaliere in `breadth_daily.csv` e `pct_above_ma_pit.csv`, stessa cartella).
**Dati:** membership S&P 500 point-in-time (snapshot alle date di variazione, forward-fill), prezzi 1995-01 → 2026-09-21 (l'ultimo giorno, il 22/09, è stato scartato perché aggiornato solo per 60 titoli), ^GSPC e ^NDX da CSV. Breadth calcolata sul rendimento di prezzo (close split-adjusted; nei 411 giorni-titolo con corporate action non riflessa nel close, cioè |r_close − r_adj| > 5pp, si usa il rendimento adjusted). Drawdown e CAGR (sez. 30) calcolati su adj_close (total return).
**Convenzioni:** PIT = membri dell'indice in quella data; CUR = membri di oggi (snapshot del 24/09/2026, 503 ticker) usati su tutta la storia, cioè il metodo che il fascicolo sembra usare. Episodio = gruppo di segnali separati da meno di 10 sedute; l'ingresso è il primo giorno del gruppo. "Eccesso" = media dopo l'evento meno la media di tutti i giorni dello stesso periodo. I p-value sono bootstrap (20.000 estrazioni casuali di n giorni dal periodo).

## Avvertenza sui dati (vale per tutto il documento)

Il dataset PIT **non è privo di survivorship prima del 2010**. Ogni giorno l'indice ha circa 500 membri, ma quelli con una serie di prezzi sono molti meno:

| anno | membri (snapshot) | membri PIT con prezzo | CUR con prezzo | PIT∩CUR |
|---|---|---|---|---|
| 1996 | 499 | 218 | 304 | 149 |
| 2000 | 500 | 278 | 349 | 191 |
| 2004 | 500 | 318 | 377 | 219 |
| 2008 | 500 | 383 | 413 | 256 |
| 2010 | 500 | 413 | 425 | 284 |
| 2016 | 507 | 474 | 467 | 348 |
| 2020 | 503 | 495 | 485 | 410 |
| 2024 | 501 | 499 | 498 | 460 |

Dei 1.222 ticker che sono stati membri dal 1996, 443 (36%) non hanno alcun prezzo. Sono quasi tutti titoli usciti: falliti, acquisiti o declassati. Di conseguenza tutti i gap PIT−CUR stimati prima del 2010 sono **limiti inferiori** del bias vero. Dal 2015 la copertura supera il 92%, dal 2018 il 98%.

---

## A. Test di survivorship (PIT vs membri attuali)

| periodo | misura | media PIT | media CUR | gap CUR−PIT (pp) | corr livelli | corr Δ giornaliere |
|---|---|---|---|---|---|---|
| 1996+ | % in rialzo (adv) | 50.35 | 50.36 | **+0.01** | 0.99 | 0.99 |
| 1996+ | % che batte l'indice, 1g | 49.41 | 49.75 | +0.34 | 0.93 | 0.92 |
| 1996+ | % che batte l'indice, 21g | 49.81 | 51.38 | **+1.57** | 0.93 | 0.87 |
| 1996+ | % che batte l'indice, 63g | 49.73 | 52.46 | **+2.73** | 0.94 | 0.84 |
| 1996+ | % con r ≤ −5% | 1.79 | 1.98 | +0.19 | 0.99 | 0.99 |
| 2010+ | adv | 51.63 | 51.80 | +0.17 | 1.00 | 1.00 |
| 2010+ | out 1g | 49.52 | 49.88 | +0.36 | 0.97 | 0.97 |
| 2010+ | out 21g | 48.95 | 50.56 | +1.61 | 0.96 | 0.94 |
| 2010+ | out 63g | 48.38 | 51.10 | +2.72 | 0.96 | 0.92 |
| 2010+ | % con r ≤ −5% | 1.29 | 1.29 | 0.00 | 0.99 | 0.99 |

Anni peggiori (gap su out63): 2017 +5.0pp, 2007 +4.9, 2000 +4.8, 2005 +4.7, 2015 +4.2, 2003 +4.2.

**Concordanza delle date-segnale**

| segnale | dal | giorni PIT | giorni CUR | in comune | Jaccard |
|---|---|---|---|---|---|
| adv < 10% | 1996 | 372 | 329 | 314 | 0.81 |
| adv < 10% | 2010 | 230 | 219 | 210 | 0.88 |
| out63 < 35% | 1996 | 548 | 222 | 218 | **0.39** |
| out63 < 35% | 2010 | 308 | 165 | 165 | 0.54 |
| out63 > 65% | 1996 | 329 | 460 | 308 | 0.64 |
| out63 > 65% | 2010 | 54 | 108 | 50 | **0.45** |
| out21 < 30% | 2010 | 133 | 100 | 100 | 0.75 |

**Lettura**
- Le misure giornaliere (adv%, cali ≤ −5%) sono quasi immuni alla survivorship: gap di circa 0, correlazione 0.99, 81–88% di date-segnale in comune.
- Le misure "batte l'indice su 21/63 giorni" hanno invece un bias sistematico di +1.6 e +2.7pp, che sale fino a +5pp in alcuni anni. Sono gonfiate per costruzione: chi è nell'indice oggi è chi ha sovraperformato. Con il paniere attuale i giorni di breadth debole (out63 < 35%) risultano dimezzati (−46% dal 2010, −60% dal 1996) e quelli di breadth forte raddoppiati. Le date-segnale cambiano molto (Jaccard 0.39–0.54).
- Il conteggio in valore assoluto (non in %) con il paniere CUR cresce meccanicamente con il numero di titoli disponibili: 304 nel 1996, 425 nel 2010, 500 oggi. Vedi C.

---

## B. Logica della sez. 11 applicata all'S&P 500 (adv% PIT < soglia)

| soglia | dal | giorni segnale | episodi |
|---|---|---|---|
| < 2% | 1996 | 43 | 36 |
| < 2% | 2010 | 33 | 27 |
| < 5% | 2010 | 104 | 54 |
| < 10% | 2010 | 230 | 86 |
| < 15% | 2010 | 367 | 112 |

**Rendimenti forward di ^GSPC (%), dal 2010** (baseline: tutti i giorni)

| evento | n | 5g | 21g | 63g | 126g | 252g | ecc. 252g | p(252) | hit 252g |
|---|---|---|---|---|---|---|---|---|---|
| BASELINE tutti i giorni | 3971 | 0.25 | 1.06 | 3.16 | 6.37 | 13.03 | — | — | 86.5 |
| Baseline: SPX in drawdown ≤ −10% da max 52s | 509 | 0.68 | 2.66 | 6.57 | 12.16 | 21.61 | +8.59 | — | 95.7 |
| adv<2%, tutti i giorni | 33 | 0.35 | 2.28 | 7.27 | 11.34 | 20.19 | +7.16 | — | 90.9 |
| adv<2%, episodi | 27 | 0.74 | 1.32 | 5.26 | 9.16 | 16.42 | **+3.40** | 0.07 | 88.9 |
| analogo solo prezzo (SPX r1 ≤ −3.37%), episodi | 16 | 0.71 | −0.05 | 5.37 | 10.44 | 19.97 | +6.95 | 0.01 | 93.8 |
| adv<5%, episodi | 53 | 0.59 | 1.36 | 4.46 | 8.53 | 15.50 | +2.48 | 0.06 | 90.6 |
| analogo solo prezzo (SPX r1 ≤ −2.27%) | 52 | 0.42 | 1.19 | 4.87 | 9.86 | 16.85 | +3.82 | 0.01 | 90.4 |
| adv<10%, episodi | 85 | 0.54 | 1.23 | 3.88 | 7.64 | 14.13 | +1.11 | 0.20 | 84.7 |
| adv<15%, episodi | 110 | 0.21 | 0.78 | 2.97 | 6.56 | 11.54 | **−1.48** | 0.90 | 80.0 |

**Dal 1996**

| evento | n | 63g | 252g | ecc. 252g | p(252) |
|---|---|---|---|---|---|
| BASELINE | 7497 | 2.36 | 9.72 | — | — |
| adv<2% episodi | 36 | 5.02 | 16.90 | +7.18 | <0.01 |
| analogo solo prezzo (r1 ≤ −4.10%) | 17 | 5.51 | 16.96 | +7.24 | 0.03 |
| adv<5% episodi | 90 | 4.27 | 11.47 | +1.74 | 0.16 |
| adv<10% episodi | 156 | 3.61 | 10.77 | +1.05 | 0.22 |
| adv<15% episodi | 217 | 2.76 | 10.04 | +0.32 | 0.39 |

**NDX: confronto con il "+11% a 252 giorni dopo i segnali"**

| serie | n | media 252g | mediana | hit% |
|---|---|---|---|---|
| NDX, tutti i giorni 2010–2025 | 3971 | **+19.45** | +20.92 | 90.1 |
| SPX, tutti i giorni 2010–2025 | 3971 | +13.03 | +14.10 | 86.5 |
| NDX dopo episodi SPX adv<5% | 53 | +21.57 | +19.74 | 94.3 |
| NDX dopo episodi SPX adv<10% | 85 | +21.64 | +22.27 | 91.8 |

Il CAGR di prezzo del NDX tra 2010 e 2025 è 17.6%/anno.

**Lettura**
- **Il "+11% a un anno" del fascicolo è circa 8.5pp sotto il rendimento incondizionato del NDX nello stesso periodo (+19.5%).** Anche se il numero fosse corretto, i segnali avrebbero preceduto rendimenti **inferiori** alla media, non un "recupero nettamente positivo". La sezione presenta come favorevole un risultato che, rispetto alla baseline, è sfavorevole o al più neutro. Non abbiamo la membership NDX, quindi i 62 segnali non sono replicabili direttamente. Sull'S&P 500 i giorni con adv<2% sono 33 dal 2010, quindi l'ordine di grandezza è plausibile.
- Sull'SPX solo la soglia estrema (<2%) mostra un eccesso positivo a 63–252 giorni: +3.4pp dal 2010 (p≈0.07), +7.2pp dal 1996. L'effetto si dimezza passando dai giorni agli episodi, perché i segnali arrivano a grappoli (2008, 2011, 2020). Con soglie 5–15% l'eccesso scompare.
- **L'analogo solo-prezzo** (stesso numero di giorni, scelti fra i peggiori rendimenti giornalieri dell'indice) dà eccessi uguali o maggiori. adv% non aggiunge informazione rispetto al movimento dell'indice.
- La baseline condizionata "SPX in drawdown ≤ −10%" dal 2010 rende +21.6% a 252 giorni, più di qualsiasi segnale adv. Prima del 2010 questa stessa baseline era negativa (−3.1pp), il che mostra che il risultato dipende molto dal regime.
- Il fascicolo descrive rendimenti a 5/21/42 giorni "leggermente negativi". Sull'SPX sono positivi su tutti gli orizzonti, quindi la descrizione non si generalizza.

---

## C. Sez. 14: conteggio dei sovraperformanti e "soglia dinamica = media dei massimi mobili"

La soglia è implementata in due varianti. **A** = media mobile (w) del massimo mobile (w), con w = 105 sedute, 52 settimane o 12 mesi; è la variante coerente con la descrizione di una soglia che sale nel tempo. **B** = media espansiva del massimo mobile.

| universo | freq | % periodi con conteggio sotto la soglia A | % sotto la soglia B | soglia A − media mobile | corr(soglia, N titoli) | R² soglia ~ media + dev.std mobili |
|---|---|---|---|---|---|---|
| PIT | giornaliera | **99.0** | 68.3 | +82 titoli | 0.94 | **0.98** |
| PIT | settimanale | 97.1 | 59.5 | +72 | 0.95 | 0.97 |
| PIT | mensile | 89.1 | 53.3 | +55 | 0.91 | 0.91 |
| CUR | giornaliera | 99.0 | 88.3 | +87 | 0.90 | 0.96 |

**Andamento annuo (giornaliero, w = 105, PIT)**

| anno | N medio | conteggio medio | % di N | soglia A | soglia A in % di N | dev.std del conteggio | p99 del conteggio |
|---|---|---|---|---|---|---|---|
| 2010 | 413 | 204 | 49% | 257 | 62% | 23 | 259 |
| 2014 | 454 | 224 | 49% | 284 | 63% | 27 | 287 |
| 2018 | 492 | 246 | 50% | 338 | 69% | 38 | 334 |
| 2022 | 497 | 256 | 51% | 373 | 75% | 50 | 380 |
| 2024 | 499 | 241 | 48% | 408 | 82% | 78 | 410 |
| 2025 | 499 | 244 | 49% | 416 | 83% | 77 | 404 |

**Perché la soglia segue meccanicamente il livello (e la dispersione)**
1. Il massimo su una finestra è per costruzione sopra la media della stessa finestra. La media dei massimi resta sopra la serie il 99% dei giorni (97% delle settimane, 89% dei mesi). "Conteggio sotto la soglia dinamica" è quindi lo stato normale, non un segnale.
2. Il livello della soglia si scompone quasi interamente (R² 0.98) in media mobile + k × deviazione standard mobile del conteggio. In pratica è un canale di volatilità ricostruito sul massimo.
3. Il rialzo della soglia da circa 257 (2010) a circa 416 (2025) **non** dipende da una partecipazione "normale" più alta: il conteggio medio è fermo al 48–51% dei membri. Dipende da (a) l'aumento del numero di titoli disponibili, 413 → 499 nel PIT e 425 → 500 con il paniere CUR del fascicolo, e (b) soprattutto la dispersione del conteggio giornaliero, la cui deviazione standard è passata da 23 a 77 (×3.4). Con un indice concentrato su poche mega-cap, i giorni in cui queste ultime scendono e il resto sale producono 400 e più "sovraperformanti". La soglia misura quindi le code dello spread equal-weight/cap-weight, cioè la concentrazione dell'indice. L'interpretazione del fascicolo ("il livello normale di partecipazione si è spostato più in alto") è **sbagliata**.

**Contenuto informativo**

| condizione (PIT, giornaliera) | dal | % del tempo | ecc. 21g | ecc. 63g | ecc. 252g |
|---|---|---|---|---|---|
| sotto soglia | 2010 | 99.1 | −0.01 | −0.01 | −0.01 |
| sopra soglia | 2010 | 0.9 | +0.86 | +1.01 | +1.13 |
| < 0.6 × soglia | 2010 | 20.9 | +0.16 | +0.32 | +1.99 |
| sotto soglia (settimanale) | 2010 | 97.6 | +0.03 | −0.09 | −0.13 |
| sotto soglia (mensile) | 2010 | 89.6 | +0.12 | +0.01 | −0.11 |

Per quintile di % sovraperformanti dal 1996 (rendimento a 252 giorni; baseline 9.72%):
- out1: 10.4 / 9.7 / 9.7 / 10.0 / 8.9. Piatto: rho di Spearman circa 0.
- out63: 14.1 / 11.4 / 10.6 / 9.6 / **3.1**. Il quintile alto, in cui l'equal-weight batte nettamente il cap-weight, precede rendimenti bassi (rho −0.22). Dal 2010 però l'effetto si riduce a rho −0.09 ed è guidato dal 2000–2002, quindi è instabile.

Valori recenti (PIT): gli ultimi 10 giorni al 21/09/2026 vanno da 124 a 327 su circa 500. Il "355/500" del fascicolo non è verificabile, perché la data non è indicata. Il range giornaliero 2010+ (p1 = 123, p99 = 373) è compatibile con l'intervallo "50–400" citato.

---

## D. Sez. 31: titoli con calo giornaliero ≤ −5%, somma mobile su 5 giorni

| episodio | PIT max r5 (conteggio) | data | PIT max r5 (somma delle %) | max quota in 1 giorno | CUR max r5 | valore nel fascicolo |
|---|---|---|---|---|---|---|
| mar 2020 | **1255** | 2020-03-18 | 254 | 93% | 1235 | > 1.200 ✔ |
| GFC 2008 | **822** | 2008-11-20 | 210 | 89% | 841 | ≈ 800 ✔ |
| ago 2011 | **711** | 2011-08-10 | 168 | 84% | 717 | ≈ 650 ✔ (circa) |
| apr 2025 | 573 | 2025-04-08 | 115 | 59% | 592 | "> 500" ✔ |
| 2022 (intero anno) | **343** | 2022-06-16 | 69 | 29% | 350 | "> 500" ✘ |
| 2000–02 | 354 | 2001-09-21 | 120 | 52% | 427 | — |

I picchi principali sono riprodotti. L'affermazione "2022–2025 sopra i 500" vale solo per aprile 2025: nel 2022 il picco è circa 343. Il conteggio grezzo dipende da N, che prima del 2008 era molto più basso nel dataset. La versione normalizzata (% dei membri) è quella confrontabile nel tempo. La survivorship qui è trascurabile dal 2008; prima, il paniere CUR gonfia i conteggi (427 contro 354 nel 2001).

**Forward di ^GSPC dopo i picchi** (ingresso al primo giorno sopra la soglia; "espansiva" = soglia calcolata solo sul passato, quindi senza look-ahead)

| evento (1996+) | n episodi | 63g | ecc. 63g | 252g | ecc. 252g | p(252) | hit 252g |
|---|---|---|---|---|---|---|---|
| BASELINE | 7497 | 2.36 | — | 9.72 | — | — | 78.3 |
| conteggio r5 > p99, soglia full-sample (377) | 7 | 9.72 | +7.36 | 30.59 | +20.86 | <0.01 | 85.7 |
| conteggio r5 > p99, espansiva | 10 | 5.76 | +3.40 | 17.72 | +8.00 | 0.06 | 70.0 |
| conteggio r5 > p99.5, espansiva | 8 | 6.67 | +4.30 | 14.77 | +5.05 | 0.20 | 62.5 |
| **% normalizzata r5 > p99, espansiva** | 10 | 10.26 | **+7.90** | 22.65 | **+12.93** | <0.01 | 70.0 |
| % normalizzata r5 > p99.5, espansiva | 6 | 8.44 | +6.08 | 16.71 | +6.99 | 0.15 | 66.7 |
| % in 1 giorno > p99, espansiva | 24 | 1.80 | −0.57 | 7.03 | **−2.69** | 0.78 | 62.5 |
| % in 1 giorno > p99.5, espansiva | 15 | 6.22 | +3.86 | 19.68 | +9.96 | 0.01 | 66.7 |
| analogo solo prezzo: SPX r5 < p0.5 (−8.8%) | 13 | 8.05 | +5.69 | 17.89 | +8.17 | 0.04 | 76.9 |
| analogo solo prezzo: SPX r5 < p1 (−6.8%) | 23 | 4.11 | +1.75 | 11.16 | +1.43 | 0.34 | 69.6 |

Dal 2010 gli episodi sono solo 4 (ago 2011, mar 2020, giu 2020, apr 2025), tutti positivi: +22pp a 252 giorni. Con n = 4 non c'è potere statistico. Episodio di avvertimento: 2008-10-02, primo superamento, seguito da −16% a 63 giorni e −8% a 252 giorni.

**Lettura**
- Lo strumento è descrittivo e corretto nella meccanica. La versione normalizzata (somma su 5 giorni della % di membri con r ≤ −5%) è leggermente più informativa del conteggio grezzo e del dato di un singolo giorno, che è instabile: con la soglia espansiva al p99 l'eccesso a 252 giorni è negativo.
- Gli episodi sono pochissimi (6–10 in 30 anni) e il guadagno rispetto all'analogo solo-prezzo è modesto: +12.9 contro +8.2pp a 252 giorni, a parità di soglia p0.5/p99 non identica.
- **Ridondanza con l'app:** l'80% degli episodi "% normalizzata r5 > p99" cade entro ±10 sedute da un episodio di "% membri sopra la MA20 < 10%". Al segnale, la quota mediana sopra la MA20 è 7.8%. "%>MA20 < 10" da solo (49 episodi dal 1996) dà +3.2pp a 63 giorni e +5.0pp a 252 giorni (p = 0.02).

---

## E. Sez. 30: max drawdown, CAGR e recovery (survivorship)

| statistica | CUR (membri attuali) | EX (usciti) | ALL (tutti i membri dal 1996 con prezzi) | fascicolo (503 attuali) |
|---|---|---|---|---|
| ticker | 503 | 262 | 765 | 503 |
| MaxDD mediano | **−71.0%** | −88.2% | −76.1% | −70/−71% ✔ |
| % con MaxDD ≤ −50% | 90.9 | 95.0 | 92.3 | 89 ✔ |
| % con MaxDD ≤ −80% | **33.0** | 64.9 | **43.9** | 31 ✔ |
| % con MaxDD ≤ −95% | 7.4 | 25.6 | 13.6 | — |
| CAGR mediano (storia ≥ 3 anni) | 12.5% | 7.9% | 11.2% | 19.4% (non riprodotto) |
| % con CAGR < 0 | **1.6** | 17.6 | 7.1 | 6 |
| % episodi ≤ −50% recuperati | 86.7 | 70.8 | 80.8 | — |
| % episodi ≤ −80% recuperati | **82.6** | **46.2** | **63.1** | 74 |
| % episodi ≤ −90% recuperati | 80.0 | 34.1 | 52.3 | — |
| % ticker con ≤ −80% che hanno recuperato | 80.7 | 32.9 | 56.5 | — |

**Coorte 2010.** Dei 500 membri al 04/01/2010, 407 hanno prezzi. Di questi il 68.8% è ancora nell'indice, con un CAGR mediano dal 2010 di 12.1%, contro il 7.7% di quelli usciti. Gli altri 93 membri, senza prezzi, sono quasi tutti usciti: il tasso vero di permanenza è circa 56% (280 su 500).

**Lettura**
- Le statistiche descrittive sui 503 membri attuali sono **riprodotte**: MaxDD mediano −71% e 33% dei titoli oltre −80%. La storia del dataset parte dal 1995, il fascicolo usa probabilmente storie più lunghe. Il CAGR mediano del 19.4% non è riprodotto: con dati dal 1995 e total return otteniamo 12.5%. Probabilmente la differenza viene da una definizione o una finestra diversa, oppure dal peso di IPO e spin-off recenti.
- La conclusione inferenziale è viziata da survivorship: "anche oltre −80% la maggioranza degli episodi si è risolta in un nuovo massimo". Sui membri attuali la quota è 83%; su tutti i membri dal 1996 è 63%, fra gli usciti 46%; oltre −90% scende al 52% sul totale e al 34% fra gli usciti. La survivorship sposta la quota di titoli con DD ≤ −80% di circa 11pp (33 → 44%), quella dei CAGR negativi da 1.6% a 7.1% e il CAGR mediano di circa −1.3pp. **Sono limiti inferiori**, perché i 443 ex-membri senza prezzi (fallimenti come Lehman, Enron, WorldCom e molte acquisizioni) non sono nel campione.
- Il fascicolo cita la survivorship tra i rischi, ma non la quantifica e ne trae comunque conclusioni sulla probabilità di recovery che non reggono.

---

## Verdetti

| sezione | verdetto | motivo principale |
|---|---|---|
| 11 (adv% NDX < 2%) | **fuorviante** | nessuna baseline: il +11% a 252 giorni è circa 8.5pp sotto il NDX incondizionato 2010–25 (+19.5%); segnali contati per giorno e non per episodio (grappoli); sull'SPX l'effetto esiste solo alla soglia estrema, è debole dal 2010 (+3.4pp, p ≈ 0.07) e non supera l'analogo solo-prezzo |
| 14 (sovraperformanti + soglia dinamica) | **fuorviante / interpretazione sbagliata** | la soglia "media dei massimi" sta sopra il conteggio il 97–99% del tempo e cresce con N e con la dispersione (R² 0.98), non con la partecipazione; nessun contenuto predittivo (eccesso ≈ 0); con il paniere attuale le finestre 21/63 giorni sono gonfiate di 1.6/2.7pp |
| 30 (dashboard MaxDD/CAGR) | **valida con riserve (descrittiva), fuorviante (inferenza)** | numeri sui membri attuali riprodotti; tassi di recovery e CAGR dipendono fortemente dalla survivorship (recovery oltre −80%: 83% contro 63% su tutti i membri, limite inferiore) |
| 31 (cali ≤ −5% cumulati) | **valida con riserve** | picchi 2008/2011/2020/2025 riprodotti; "2022 sopra 500" errato (343); conteggio grezzo non comparabile nel tempo, meglio la %; survivorship trascurabile dal 2008; strumento descrittivo, segnali forward positivi ma con n molto piccolo e in gran parte ridondanti con %>MA20 |

## Indicazioni per l'app di ricerca dei bottom (che usa già %>MA20/50/200 PIT)

- **Da non aggiungere:** il conteggio dei sovraperformanti con soglia dinamica (sez. 14), perché non ha informazione e la soglia è un artefatto; adv% con soglie 5–15%, perché l'eccesso è nullo dopo la de-duplicazione e il segnale equivale all'analogo prezzo.
- **Eventualmente utile come conferma di capitolazione:** % dei membri PIT con r ≤ −5%, somma su 5 giorni, con soglia espansiva al p99 (circa 93 punti di somma percentuale). Dal 1996 dà +7.9pp a 63 giorni e +12.9pp a 252 giorni, ma con soli 10 episodi, ed è per l'80% sovrapposto a %>MA20 < 10. È utile soprattutto per distinguere una capitolazione violenta da un'erosione lenta, più che come segnale indipendente. adv% < 2% in un giorno è un indicatore simile, ma più rumoroso.
- **Regole di metodo:** usare sempre membership PIT, che per le misure su 21/63 giorni è indispensabile; usare % e non conteggi; usare soglie espansive senza look-ahead; contare per episodi; confrontare sempre con la baseline incondizionata e con quella "indice in drawdown", che dal 2010 batte quasi tutti i segnali di breadth.
