# POC degli ultimi 12 mesi e oro/argento con i future · fase 1

Ricerca del 13/11/2026, sola lettura sull'app (nessun file di `js/`, `css/`, `data/`, `scripts/`, `config/`, `test/`, `index.html`, `guida.html` toccato). Dati Yahoo Finance fino all'ultima seduta chiusa (12/11/2026; KOSPI 13/11/2026).

- **Script**:
  - `ricerca/poc/dati.mjs` scarica le risposte grezze di Yahoo in `ricerca/poc/cache/` (esclusa da git con la riga `ricerca/poc/cache/` in `.gitignore`), più i settlement CME delle ultime sedute;
  - `ricerca/poc/analisi.mjs` fa tutti i calcoli e scrive `ricerca/poc/risultati.json`;
  - `ricerca/poc/grafico.mjs` disegna le due immagini di prova.
- **Ricalcolo indipendente**: `ricerca/poc/verifica.py` (Python, solo libreria standard, codice proprio, nessun import dagli script Node). Rifà le 23 varianti × 15 POC, le value area, la parte A e il volume degli indici. Risultato in `verifica.json`: **tutto coincide** (scarto massimo dovuto solo agli arrotondamenti a 4 decimali del JSON).
- **Rifare**: `node ricerca/poc/dati.mjs --refresh && node ricerca/poc/analisi.mjs && python3 -I ricerca/poc/verifica.py && node ricerca/poc/grafico.mjs`.

Tutti i numeri qui sotto vengono da `risultati.json` (arrotondati per la lettura).

## 1. In breve

- **A · oro e argento con i future.** Si può fare: i prezzi del future continuo di Yahoo coincidono con i settlement ufficiali CME e il massimo dell'argento del 26/01/2026 **non è un dato sporco**. Ma i numeri cambiano: con GC=F l'oro risulta 1,5 punti meno lontano dal massimo (−26,95% contro −28,44% di GLD) e l'argento ha il massimo il 26/01 invece del 28/01. Le cause sono due, e vanno dette nell'app: la chiusura del future è il settlement delle 13:30 di New York, e il continuo «sale» a ogni cambio di contratto.
- **B · POC.** Con il criterio deciso prima (i 15 calcoli entro il 2%), **il POC è robusto solo per l'S&P 500 con i volumi di SPY (6.844, scarto 1,74%) e per il Nasdaq-100 con i volumi di QQQ (24.759–25.108, scarto 1,41%)**. Per tutti gli altri mercati, e per gli stessi due indici con i volumi dei future, non lo è. Negli ultimi 12 mesi quasi tutti i mercati hanno due zone con volumi quasi uguali, e il «livello con più volume» salta dall'una all'altra al cambiare del metodo, delle fasce o dello strumento.
- **Verdetto: per ora non mostrare la linea del POC** (dettagli e alternative al punto 7).

## 2. Domanda A · oro e argento dai fondi ETF ai future

### 2.1 Cosa cambia nel pannello (athStats di `js/ath.js`, stesso codice di `scripts/fetch_ath.js`)

Con le sedute fino all'11/11/2026, GLD e SLV coincidono al centesimo con `data/ath.json` pubblicato.

| Serie | Ultima seduta | Massimo dei 3 anni | Distanza | Calo più profondo dopo il massimo | Massimo nella seduta (dettaglio) |
|---|---|---|---|---|---|
| GLD (oggi nell'app) | 12/11/2026 | 495,90 il 29/01/2026 | **−28,44%** | −28,44% (12/11/2026, minimo nuovo) | 509,70 il 29/01/2026 |
| GC=F | 12/11/2026 | 5.318,40 il 29/01/2026 | **−26,95%** | −26,95% (12/11/2026, minimo nuovo) | 5.586,20 il 29/01/2026 |
| GC=F fino all'11/11 | 11/11/2026 | 5.318,40 il 29/01/2026 | −24,78% | −26,69% (30/10/2026) | |
| SLV (oggi nell'app) | 12/11/2026 | 105,60 il 28/01/2026 | **−57,27%** | −57,77% (30/10/2026) | 109,83 il 29/01/2026 |
| SI=F | 12/11/2026 | 115,08 il 26/01/2026 | **−56,58%** | −57,34% (30/10/2026) | 121,30 il 29/01/2026 |

Per confronto, il **contratto attuale** (dicembre 2026) dallo stesso massimo: GCZ26 −29,47%, SIZ26 −57,90%.

In sintesi:
- **oro**: stesso giorno del massimo; il future dice 1,5 punti in meno di calo;
- **argento**: il massimo passa dal 28/01 al 26/01; la distanza cambia di 0,7 punti;
- **massimo nella seduta**: per l'argento è il 29/01, non il 26/01 come quello di chiusura. Il dettaglio della riga mostrerebbe due date diverse.

### 2.2 Che contratto è il «future continuo» di Yahoo (settlement CME)

Confronto con i settlement ufficiali CME delle sedute dal 09/11 al 12/11/2026 (JSON pubblico della pagina dei settlement, `otherSources.cme`):

- **Prezzi**: le chiusure giornaliere di Yahoo **sono i settlement CME**, uguali al millesimo. Vale per il continuo e per i contratti singoli (SIZ26, GCZ26, HGZ26, CLZ26…).
- **Oro e petrolio**: GC=F e CL=F seguono il contratto attivo (dicembre 2026).
- **Argento e rame**: lo **storico giornaliero** di SI=F e HG=F è il **contratto del mese più vicino** (novembre 2026), con pochissimi scambi. Per esempio il 12/11 il novembre dell'argento ha 15 contratti per CME e 4 per Yahoo, il dicembre 60.860. Le **barre orarie** di SI=F invece seguono il contratto attivo: coincidono con SIZ26 in 472 ore su 480 a settembre, 497 su 500 a ottobre e 215 su 215 a novembre, e mai prima di agosto (`A.hourlyContract`).
- **Volume dell'ultima seduta**: Yahoo ricopia quello del giorno prima. Il 12/11 GC=F ha 132.437 (il volume dell'11/11), mentre CME dà 229.442.

### 2.3 Salti ai cambi di contratto

Il metodo: salto giornaliero del rapporto tra il future continuo e il contratto attuale (log F/C, entrambi settlement), e per confronto del rapporto future/ETF. Un salto conta come cambio di contratto oltre max(6 × mediana dei salti, 0,1%).

- **Oro (GC=F)**: cambia contratto ogni due mesi, a fine mese. Nei 12 mesi i salti sono +0,89% (28/11/2025), +0,71% (30/01/2026), +0,63% (01/04), +0,71% (29/05) e +1,46% (31/07). Dal massimo del 29/01/2026 ci sono 4 cambi: somma **+3,51%** con il contratto, +3,88% stimata con GLD.
  - Il rapporto GC=F/GLD giorno per giorno è molto più rumoroso: mediana dei salti 0,26% contro 0,03% di GC=F/GCZ26, per via dell'ora diversa di chiusura. Va bene come stima, non per trovare i giorni.
- **Argento (SI=F)**: cambia contratto ogni mese, con salti piccoli (tra 0,15% e 0,30% quelli trovati nei 12 mesi). Dal 26/01/2026 il rapporto SI=F/SIZ26 è salito del **+3,09%** in tutto.
- **Effetto**: in contango (oggi oro, argento e rame) il continuo **sale a ogni cambio**. Quindi, rispetto a un massimo di molti mesi fa, il future continuo mostra un calo più piccolo di quello del contratto attuale. Rispetto al contratto di oggi, il prezzo di 12 mesi fa va alzato di **+4,27%** per l'oro, +4,42% per l'argento e +4,64% per il rame (`rolls12.gapAtStartPct`).

### 2.4 Il massimo dell'argento del 26/01/2026: dato sporco? No

- **Barre vicine**: le chiusure di SI=F nei giorni attorno sono 100,93 (23/01), **115,08 (26/01)**, 105,52 (27/01), 113,11 (28/01), 114,04 (29/01) e 78,29 (30/01, il crollo).
  - Il 28 e il 29/01 sono solo l'1,71% e lo 0,91% sotto il massimo, quindi il massimo non è isolato.
  - Lo scarto dalla mediana delle 5 sedute prima e dopo (+21,0%) viene dal crollo del 30/01, non da un picco anomalo.
- **Altri contratti**: SIZ26, SIH27 e SIK27 hanno il massimo di chiusura di gennaio-marzo 2026 lo stesso giorno, il 26/01. Il loro rapporto con SI=F resta stabile dal 21/01 al 02/02 (SIZ26 tra 1,0311 e 1,0355). SIL=F (micro) è identico a SI=F: è lo stesso flusso di Yahoo, non una seconda fonte.
- **Ora della chiusura**: è la spiegazione dello scarto con SLV.
  - La chiusura giornaliera di Yahoo è il settlement, intorno alle 13:25 di New York. Sui 12 mesi è più vicina al prezzo delle 13–14 che a quello delle 16 o delle 17 (`closeTime`).
  - Il 26/01 l'argento è salito fino a mezzogiorno (barra delle 12: 117,10) ed è crollato dopo le 13. Alle 16 SI=F valeva **108,59**, e SLV ha chiuso a 98,34.
  - Alla **stessa ora** (le 16) il rapporto SLV/SI=F è 0,9056, contro la mediana di 0,9027 sui 12 mesi (+0,32%). Usando il settlement del future, invece, è 0,8545 (−5,8% dalla mediana).
  - Quindi lo scarto è tutto dovuto all'ora della chiusura.
- **Seconda fonte esterna**:
  - i settlement CME del 26/01/2026 non sono più pubblici: la risposta è vuota, CME tiene solo le ultime sedute;
  - LBMA risponde 403;
  - FRED non ha l'argento.

  Per le ultime 4 sedute, però, CME conferma che le chiusure di Yahoo sono i settlement.

### 2.5 Il future continuo di Yahoo è affidabile per il pannello?

**Sì per i prezzi, con tre avvertenze da dire nell'app:**
1. la chiusura è il settlement delle 13:30 di New York, non le 16 come gli ETF e gli indici; in giornate molto mosse la data del massimo può cambiare (argento: 26/01 contro 28/01);
2. ai cambi di contratto il livello sale (in contango): da un massimo vecchio il calo risulta più piccolo di quello del contratto attuale. Oro: −26,95% contro −29,47%; l'ETF, vicino allo spot, dà −28,44%;
3. per argento e rame lo storico giornaliero è il contratto del mese più vicino (pochi scambi): i prezzi sono ufficiali, **i volumi giornalieri no** (0,2% e 2,2% della somma dei volumi orari).

**Testo proposto per le note di `config/ath.json`** (da decidere con l'utente):
- Oro: «Future continuo del Comex (Yahoo, GC=F). La chiusura è il prezzo di regolamento delle 13:30 di New York, non le 16:00 degli indici. A ogni cambio di contratto (ogni due mesi) il livello si sposta, di solito verso l'alto: da un massimo lontano il calo risulta un po' più piccolo di quello dell'oro fisico (dal massimo del 29/01/2026: −26,95% contro −28,44% dell'ETF GLD).»
- Argento: «Future continuo del Comex (Yahoo, SI=F), contratto del mese più vicino. Chiusura al prezzo di regolamento delle 13:30 di New York: il 26/01/2026, giorno del massimo, l'argento è crollato nel pomeriggio, e l'ETF SLV, che chiude alle 16:00, ha il massimo il 28/01.»

I numeri nelle note vanno ricalcolati al momento della pubblicazione.

## 3. Domanda B · che cosa è il volume di ogni strumento

| Mercato | Volume «vero» scelto | Cosa ho trovato |
|---|---|---|
| Bitcoin | BTC-USD (Yahoo) | Volume **in dollari**, aggregato da Yahoo su più piattaforme; meta `exchangeName` «CCC». Non si sa quali piattaforme né se c'è volume gonfiato. Le barre orarie sono inaffidabili: 4.366 ore su 8.763 hanno volume 0 e la somma oraria è circa 1/4,7 del giornaliero (mediana). |
| Oro | future GC=F | Volume giornaliero coerente con quello orario (rapporto 1,05). |
| Argento | future SI=F | Volume giornaliero inutile, perché è il mese più vicino: **0,24%** della somma oraria. Si usa la somma oraria, che è il contratto attivo. |
| Rame | future HG=F | Come l'argento (2,2%): si usa la somma oraria. |
| Petrolio | future CL=F | Coerente (1,10). |
| Nasdaq-100 | NQ=F; alternativa QQQ | **Il volume di ^NDX è quello del Nasdaq Composite (^IXIC)**: uguale in 252 sedute su 252, circa 6,3 volte la somma dei 101 membri. |
| S&P 500 | ES=F; alternativa SPY | **Il volume di ^GSPC è quello del NYSE Composite (^NYA)**: uguale in 252 sedute su 252, circa 1,7 volte la somma dei 503 membri (mediana di 23 sedute). È il volume di tutta la borsa di New York, non dell'indice. |
| Semiconduttori | SOXX | Volume giornaliero buono. I volumi orari **non sono rettificati per lo split 3:1 del 05/11/2026**: si usano solo per distribuire il volume del giorno nelle ore. |
| KOSPI | 069500.KS (KODEX 200); alternative EWY e il volume di ^KS11 | 069500.KS segue il KOSPI 200, non il KOSPI intero. EWY è in dollari e tratta a orari americani (13 sedute senza chiusura comune). Il volume di ^KS11 non l'ho verificato. |

**Barre orarie**: Yahoo le dà per 729 giorni (731 rifiutati: «must be within the last 730 days»), quindi coprono i 12 mesi.

**Scala**: ogni prezzo dello strumento dei volumi si porta sulla scala del grafico moltiplicandolo per il rapporto tra le chiusure dello stesso giorno (grafico / strumento). Per i future sugli indici questo toglie anche i salti dei cambi di contratto.

## 4. Metodo del POC (deciso prima di guardare i risultati)

- **Finestra**: dalla stessa data di un anno prima all'ultima seduta chiusa (`windowStart(…, 1)` di `js/ath.js`).
- **Metodi**:
  - (a) giornaliero, tutto il volume alla chiusura;
  - (b) giornaliero, volume spalmato uniformemente tra minimo e massimo;
  - (c) orario, volume alla chiusura dell'ora (le ore distribuiscono il volume del giorno);
  - (c2) orario spalmato, solo informativo.
- **Fasce**: 50, 100 e 200 fasce uguali tra il minimo e il massimo dei 12 mesi, oppure passo fisso dello 0,5% e dell'1%. Sono le stesse per tutti i metodi di un mercato.
- **POC**: il centro della fascia con più volume.
- **Value area 70%**: si parte dal POC e si aggiunge ogni volta la fascia vicina più piena.
- **Criterio**: robusto se i 15 livelli (a, b, c × 5 fasce) stanno entro il 2% (massimo / minimo − 1).
- **Controlli in più**:
  - i gruppi dei 15 livelli;
  - il secondo picco (la fascia più piena ad almeno il 3% dal POC, in quota del POC);
  - lo stesso POC (b, 100 fasce) calcolato alla fine di ognuna delle ultime 20 sedute.

## 5. Risultati per mercato

POC con 100 fasce. «15 calcoli» è l'intervallo dei 15 livelli; i gruppi sono separati da salti oltre il 2%. La value area è quella del metodo (b) con 100 fasce. Strumento principale in grassetto.

| Mercato (grafico) | Strumento dei volumi | (a) | (b) | (c) | 15 calcoli | Scarto | Robusto | Value area 70% | 2° picco (quota del POC) | Ultime 20 sedute (b) |
|---|---|---|---|---|---|---|---|---|---|---|
| Bitcoin (BTC-USD) | **BTC-USD** | 78.417 | 64.144 | 63.668 | 63.668–90.197 (4 gruppi) | 41,67% | **no** | 62.003–86.742 | 77.465 (99%) | 63.848–77.612, 2 salti |
| Oro (GC=F) | **GC=F** | 4.078 | 4.078 | 4.060 | 4.060–4.380 (2 gruppi: 10 e 5) | 7,87% | **no** | 3.998–4.689 | 4.379 (96%) | 4.078–4.377, 3 salti |
| | GC=F, scala GCZ26 | 4.537 | 4.399 | 4.379 | 4.379–4.660 | 6,41% | no | 4.034–4.803 | 4.143 (87%) | |
| | GLD sulla scala GC=F | 4.401 | 4.449 | 4.945 | 4.393–4.950 | 12,68% | no | 4.040–4.841 | 4.048 (83%) | |
| Argento (SI=F) | **SI=F** (somma oraria) | 76,44 | 58,00 | 58,74 | 57,64–76,81 (2 gruppi) | 33,26% | **no** | 56,16–87,13 | 75,70 (75%) | 58,00–58,19, 0 salti |
| | SI=F, scala SIZ26 | 60,67 | 65,30 | 61,45 | 52,57–78,15 | 48,65% | no | 59,52–94,24 | 60,67 (95%) | |
| | SLV sulla scala SI=F | 76,41 | 76,41 | 93,96 | 76,36–94,11 | 23,24% | no | 60,77–92,81 | 79,46 (76%) | |
| Rame (HG=F) | **HG=F** (somma oraria) | 6,596 | 6,596 | 6,616 | 6,481–6,627 (1 gruppo) | 2,25% | **no** (di poco) | 5,761–6,647 | 6,254 (78%) | 6,591–6,596, 0 salti |
| | HG=F, scala HGZ26 | 6,446 | 6,538 | 6,298 | 6,273–6,659 | 6,15% | no | 6,032–6,786 | 6,206 (90%) | |
| Petrolio (CL=F) | **CL=F** | 94,61 | 58,44 | 59,09 | 58,28–94,77 (3 gruppi) | 62,61% | **no** | 55,54–93,64 | 91,38 (86%) | 58,44–59,73, 1 salto |
| | CL=F, scala CLZ26 | 78,44 | 58,59 | 58,59 | 57,83–80,17 | 38,62% | no | 55,80–81,24 | 76,91 (67%) | |
| Nasdaq-100 (^NDX) | **NQ=F** | 24.977 | 29.430 | 29.430 | 24.977–29.558 (2 gruppi: 2 e 13) | 18,34% | **no** | 25.448–31.271 | 25.577 (89%) | 25.577–29.430, 1 salto |
| | QQQ | 25.014 | 24.759 | 24.929 | 24.759–25.108 | **1,41%** | **sì** | 23.013–29.143 | 25.525 (95%) | |
| | volume di ^NDX (= Nasdaq Composite) | 29.444 | 29.444 | 29.444 | 24.993–29.466 | 17,9% | no | 25.397–31.106 | | |
| S&P 500 (^GSPC) | **ES=F** | 7.406 | 6.840 | 7.682 | 6.829–7.741 (3 gruppi: 8, 2, 5) | 13,36% | **no** | 6.465–7.552 | 7.712 (86%) | 6.840, 0 salti (c: 1 salto) |
| | SPY | 6.844 | 6.844 | 6.844 | 6.824–6.943 | **1,74%** | **sì** | 6.363–7.447 | 7.699 (44%) | |
| | volume di ^GSPC (= NYSE Composite) | 6.829 | 6.844 | 7.715 | 6.829–7.731 | 13,21% | no | 6.470–7.554 | | |
| Semiconduttori (SOXX) | **SOXX** | 109,88 | 113,84 | 113,84 | 109,88–173,35 (3 gruppi) | 57,76% | **no** | 86,81–177,78 | 169,21 (75%) | 113,84, 0 salti |
| KOSPI (^KS11) | **069500.KS** | 5.528 | 5.528 | 5.473 | 5.473–6.926 (2 gruppi) | 26,57% | **no** | 4.889–7.392 | 6.919 (91%) | 4.012–6.901, 3 salti |
| | EWY | 5.580 | 5.635 | 5.580 | 5.544–6.842 | 23,43% | no | 4.842–7.194 | 6.839 (68%) | |
| | volume di ^KS11 | 5.804 | 5.804 | 5.527 | 5.443–6.203 | 13,95% | no | 4.777–7.276 | 5.471 (95%) | |

**Cosa dicono i numeri.**

- **Due zone quasi uguali.** In 12 mesi molto mossi (argento e oro crollati a fine gennaio, petrolio salito in primavera, semiconduttori quasi raddoppiati, KOSPI salito e poi crollato) il profilo dei volumi ha quasi sempre due o più zone. Il secondo picco va dal 75% al 99% del primo (tranne SPY, al 44%). Il POC è la più alta delle due, e basta una piccola variazione per scambiarle.
  - Oro: 4.078 o 4.379.
  - Nasdaq-100: 25.000 o 29.430.
  - KOSPI: 5.500 o 6.900.
  - Petrolio: 58–59 o 91–95.
- **Lo strumento conta quanto il metodo.**
  - Nasdaq-100: con QQQ il POC è robusto a 24.759–25.108; con il future NQ=F è 29.430 in 13 calcoli su 15.
  - S&P 500: SPY dà 6.844 sempre; ES=F dà 6.840 con (b), ma 7.406 con (a) e 7.682 con (c). Rispetto all'ETF, il future ha molto più volume negli ultimi mesi. Il rapporto dei volumi ES=F/SPY, mediana del mese divisa per quella dei 12 mesi, va da 0,61–0,69 (dicembre 2025–marzo 2026) a 1,41–1,67 (settembre–novembre 2026); per NQ=F/QQQ da 0,63 a 1,49 (`volumeMix`). Con i future il peso si sposta verso i prezzi recenti.
- **Il rame** è a un passo dal criterio (2,25%). Tutti i 15 calcoli sono in un gruppo solo, ma con la scala del contratto attuale lo scarto sale al 6,15%.
- **Nel tempo**: per oro, bitcoin, Nasdaq-100 e KOSPI la linea salterebbe di oltre il 2% già nelle ultime 20 sedute (da 1 a 3 volte). Per argento, rame, SOXX e S&P 500 (metodo b) resterebbe ferma.
- **Value area**: è meno ballerina del POC, ma i bordi si spostano comunque dall'1,4% al 57% tra i 15 calcoli (`vaLowSpreadPct`, `vaHighSpreadPct`). Per molti mercati copre metà o più del range dei 12 mesi, quindi dice poco.

## 6. Cambi di contratto e POC (punto 4 della domanda)

- **Livelli.** Nei 12 mesi il continuo di oro, argento e rame sta tra il 4,3% e il 4,6% sotto il contratto attuale all'inizio della finestra (petrolio 0,38%, ES=F 3,12%, NQ=F 3,61%). Il POC calcolato sul continuo e quello sulla scala del contratto attuale differiscono quindi di molto: oro 4.078 contro 4.399, argento 58,00 contro 65,30.
  - Per il petrolio i cambi di contratto non si separano dai movimenti della curva: nel marzo-aprile 2026 il rapporto con il contratto di dicembre ha salti fino al −16,6% in un giorno.
- **Volumi.** I volumi orari di Yahoo seguono il contratto attivo, quindi al cambio non c'è un buco evidente. Il volume orario delle 3 sedute dopo i cambi principali, rispetto alle 3 prima, va da 0,39 a 1,22 volte per oro, ES=F e NQ=F (`rolls12.steps[].hourlyVolAfterOverBefore`; il minimo è il 22/12/2025, sotto Natale).
  - I volumi giornalieri di argento e rame invece sono inutilizzabili (§3).
- **Proposta, se un giorno si mostra il POC**:
  - **indici**: future o ETF portati sulla scala dell'indice con il rapporto di ogni giorno (i salti spariscono da soli);
  - **materie prime**: prezzi e volumi del future portati sulla **scala del contratto attuale** con il rapporto contratto/continuo di ogni giorno (contratti singoli di Yahoo, settlement). È lo stesso metodo; sul grafico, che mostra il continuo senza correzioni, prima dell'ultimo cambio di contratto la linea del prezzo sta un po' più in basso (fino al 4–5% dopo 12 mesi), e va detto.
  - **ETF fisico per i prezzi e future solo come peso**: per oro e argento non lo consiglio, perché le ore di chiusura sono diverse e i due profili non coincidono (GLD 4.393–4.950, GC=F 4.060–4.380).

## 7. Raccomandazione e verdetto

**Verdetto: non procedere con la linea del POC** come proposta (un livello per ogni mercato).
- Il criterio deciso prima regge solo per 2 casi su 9 mercati principali (S&P 500 con SPY, Nasdaq-100 con QQQ).
- Per il Nasdaq-100 il future dice un'altra cosa (29.430 contro circa 25.000).
- Una linea che cambia del 5–40% a seconda del metodo o dello strumento, o da un giorno all'altro, darebbe all'utente un «supporto» che non esiste come numero unico.

**Alternative da discutere con l'utente** (cambiano le regole del pannello, quindi prima se ne parla):
1. **Niente POC** (raccomandata per ora).
2. **Solo S&P 500**, con i volumi di SPY. È robusto: 6.844, con il secondo picco al 44%. Il metodo (b) dà la stessa zona anche con ES=F e con il volume di ^GSPC (6.829–6.844). Testo proposto: «POC degli ultimi 12 mesi: il livello dell'S&P 500 dove si è scambiato più volume dell'ETF SPY (volumi giornalieri spalmati tra minimo e massimo, riportati sulla scala dell'indice). Approssimazione: barre giornaliere, non i singoli scambi; con i volumi del future ES=F cambia il peso dei mesi recenti.» Ha poco senso un livello su un mercato solo dei nove.
3. **Profilo dei volumi** a lato del grafico (come in `poc_spx.svg`), senza un livello unico: mostra tutte le zone con molto volume. Servirebbe un criterio nuovo di stabilità del profilo, da definire e verificare prima. Strumenti dei volumi: SPY, QQQ, SOXX, 069500.KS, GC=F; SI=F e HG=F con la somma oraria; CL=F; BTC-USD con la nota sui dati.

**Immagini di prova**:
- `poc_spx.svg` e `poc_spx.png`: S&P 500 con il POC da SPY, la value area, il profilo a destra, e tratteggiato il POC con i volumi orari di ES=F (7.682);
- `poc_oro.svg` e `poc_oro.png`: i due picchi quasi uguali dell'oro (4.078 e 4.379).

## 8. Limiti

- **Niente scambi singoli.** Il POC vero si calcola sugli scambi uno per uno. Qui ci sono barre giornaliere e orarie: (b) e (c2) suppongono il volume uniforme tra minimo e massimo, (a) e (c) tutto alla chiusura.
- **Nessuna fonte indipendente del POC.** TradingView e StockCharts sono esclusi per regola. Il ricalcolo in Python usa gli stessi dati di Yahoo con codice diverso: controlla il calcolo, non i dati.
- **Volume per quote.** Volume in quote o contratti, non in valore: in 12 mesi in cui SOXX quasi raddoppia, le quote pesano di più ai prezzi bassi. Il bitcoin invece è in dollari (Yahoo). Non ho provato la variante in valore.
- **Scala con il rapporto del giorno.** Con EWY e con le ore serali dei future il rapporto del giorno mescola orari diversi (e per EWY il cambio won/dollaro).
- **Sedute scartate.** Le sedute senza chiusura comune sono state scartate: 25–31 sedute orarie dei future (feste USA), 13 giornaliere di EWY.
- **Seconda fonte per l'argento.** Per il 26/01/2026 non c'è una fonte esterna allo stesso giorno (CME non tiene lo storico pubblico, LBMA 403). La conclusione si basa su contratti diversi e barre orarie dello stesso fornitore (Yahoo).
- **Data dei dati.** I numeri sono al 12/11/2026 e cambiano ogni giorno.
- **File non salvati.** File nuovi in `ricerca/poc/` e la riga in `.gitignore`, non ancora salvati sul ramo di sviluppo.
