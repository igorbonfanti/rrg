# C'è un ordine nel susseguirsi dei cicli dei 9 mercati? · lead-lag

Fase di ricerca del 22/11/2026, sola lettura sull'app. Domanda e criteri in `ricerca/cicli/domanda.md`, applicati così come sono.

## 1. Metodo e interpretazioni, scritti prima di calcolare i risultati

Questa sezione è stata scritta prima di eseguire gli script sui dati reali. Dove un criterio di `domanda.md` lascia una
scelta, la scelta è qui e non è stata cambiata dopo.

**Dati.** Chiusure giornaliere di Yahoo già scaricate in `ricerca/rotazione-bolle/cache/serie.json` (fino al 20/11/2026):
bitcoin BTC-USD, oro GC=F, argento SI=F, rame HG=F, petrolio WTI CL=F, Nasdaq-100 ^NDX, S&P 500 ^GSPC, semiconduttori SOXX,
KOSPI ^KS11. Il ricalcolo in Python legge invece i file grezzi `Y_*.json` della stessa cartella.

**Petrolio, 20/04/2020.** La chiusura negativa (−37,63 dollari) è tolta e trattata come seduta mancante, per i massimi e
per i minimi: da un prezzo negativo un rialzo «del 20%» non ha senso. Il minimo del 2020 cade così sulla chiusura positiva
più bassa. Lo script controlla che le date dei massimi del petrolio non cambino togliendo quel giorno.

**Punti di svolta** (soglia X = 15, 20, 30%, sulle chiusure).
- *Massimo di ciclo*: una chiusura più alta di tutte quelle dei 365 giorni di calendario prima (con almeno 365 giorni di
  storia), dopo la quale il prezzo scende di almeno X% prima di tornare sopra. È la definizione di `js/peaks.js`; lo script
  controlla che i massimi coincidano con quelli di `cyclePeaks`.
- *Minimo di ciclo*: una chiusura più bassa di tutte quelle dei 365 giorni prima (stesse condizioni), dopo la quale il
  prezzo sale di almeno X% (chiusura ≥ minimo × (1 + X/100)) prima di scendere sotto.
- *Conferma*: il primo giorno in cui il movimento di X% è avvenuto (il giorno in cui, dal vivo, lo si sarebbe saputo).
- *Periodo*: punti di svolta dal 01/01/1999 al 20/11/2026. Il 1999 serve per non tagliare il ciclo del 2000 (S&P 500,
  Nasdaq-100 e KOSPI hanno storia prima); prima del 1999 non si usa nulla (la storia lunga è il tema di `ricerca/cicli/pring/`).

**Cicli comuni** (punto 2). Raggruppamento gerarchico a legame completo, separato per massimi e minimi e per soglia: si
uniscono via via i due gruppi più vicini se tra il primo e l'ultimo punto del gruppo unito ci sono al massimo 365 giorni e
se non contengono lo stesso mercato (un mercato compare al massimo una volta per ciclo). A parità si unisce prima il
gruppo più stretto, poi quello che inizia prima. Un *ciclo comune* è un gruppo con almeno 3 mercati. Data del ciclo = data
mediana dei suoi punti. Ordine nel ciclo = ordine delle date (a parità, rango medio); rango normalizzato da 0 (primo) a 1
(ultimo).

**Concordanza** (punto 3, criterio 1). Statistica: media delle correlazioni di rango di Spearman tra tutte le coppie di
cicli comuni che hanno almeno 3 mercati in comune, calcolate solo su quei mercati (così i mercati mancanti non contano). Con
dati completi è equivalente alla W di Kendall (W = ((m−1)·ρ̄ + 1)/m). Modello nullo: ogni mercato ha i suoi punti di svolta
spostati in modo circolare di una quantità casuale (uniforme, indipendente per mercato) dentro il proprio periodo; si rifà il
raggruppamento e si ricalcola la statistica. 2000 ripetizioni o più; p = (1 + ripetizioni con statistica ≥ quella vera) /
(1 + ripetizioni), a una coda. **Regge** se p < 0,05 per i massimi e per i minimi ad almeno 2 soglie su 3.

**Coppie** (punto 4, criterio 2). Per ogni coppia ordinata (A, B), stesso tipo di svolta:
- casi: i punti di svolta di A dal 01/01/2000 al 20/11/2025 (un anno prima della fine, perché B possa girare dopo), con B
  osservabile da 365 giorni prima; per ognuno il punto di B più vicino entro ±365 giorni (a pari distanza quello prima). Un
  punto di A senza B vicino non è un caso.
- «B dopo A» vuol dire almeno 1 giorno dopo; lo stesso giorno non conta come dopo.
- quota dopo, scarto mediano (giorni di calendario), p binomiale a una coda (quota attesa 50%), p del modello nullo (punti
  di B spostati in modo circolare, 10000 ripetizioni, statistica = quota dopo).
- correzione di Benjamini-Hochberg su tutti i 432 test insieme (72 coppie × 2 tipi × 3 soglie), sui p del modello nullo.
- metà del campione: punti di A nel 2000-2012 e nel 2013-2025; in ogni metà almeno 3 casi e quota dopo ≥ 75%.
- **regge** (per coppia, tipo e soglia) se: quota ≥ 75%, almeno 8 casi, p nullo corretto < 0,05, e le due metà come sopra.
- Bitcoin ha punti di svolta solo dal 2015: per le sue coppie c'è solo la seconda metà, quindi la condizione «in entrambe le
  metà» non si può verificare e le coppie con bitcoin al massimo sono descrittive.

**Fuori campione** (punto 5, criterio 3). Cicli comuni con data fino al 31/12/2012 → rango medio normalizzato di ogni
mercato. Per ogni ciclo comune dal 2013 con almeno 3 mercati che hanno una stima, correlazione di Spearman tra la stima e
l'ordine vero; statistica = media sui cicli. Bitcoin non ha stima (nessun ciclo prima del 2013) ed è escluso da questo
confronto. p con lo stesso modello nullo del criterio 1 (tutta la procedura rifatta sulle serie spostate); in più, come
controllo, p con le etichette della stima permutate a caso. **Regge** se p < 0,05 per massimi e minimi ad almeno 2 soglie
su 3 (stesso schema del criterio 1, che `domanda.md` non precisa per il 3).

**Utilità** (punto 6, criterio 4). Solo per le coppie che passano il criterio 2, quando per quel tipo passano anche 1 e 3.
Per ogni svolta di A: colpo se B ha una svolta dello stesso tipo dopo il giorno di conferma di A ed entro 365 giorni dalla
svolta di A. Anticipo utile = giorni dalla conferma di A alla svolta di B (e alla conferma di B). Base: per giorni presi a
caso nello stesso periodo, quota con una svolta di B nei giorni successivi di pari lunghezza. **Utile** se il colpo è più
frequente della base (p < 0,05, somma di prove di Bernoulli con la probabilità di base di ogni caso) e l'anticipo mediano
dalla conferma di A alla svolta di B è di almeno 30 giorni. Se nessuna coppia arriva qui, lo stesso conto si mostra solo
come illustrazione, dicendolo: per le coppie che passano il criterio 2 da sole, oppure, se non ce ne sono, per le 3 coppie
con la quota «dopo» più alta (almeno 8 casi) per massimi e per minimi alla soglia 20%.

**Controlli di sensibilità** (solo descrittivi, non cambiano i verdetti): distanza massima nel gruppo 182 e 548 giorni;
senza il Nasdaq-100 (molto sovrapposto all'S&P 500); cicli con almeno 4 mercati.

**Prove che il metodo sa rifiutare** (`script/sintetico.mjs`): serie sintetiche con un ritardo noto (ogni mercato = fattore
comune spostato di 0, 30, …, 240 giorni più rumore) e serie indipendenti, con le stesse date dei mercati veri.

**Ricalcolo indipendente** (`script/verifica.py`): Python, algoritmi a forza bruta, file grezzi di Yahoo.

**Cambio dopo la prova sintetica, prima di guardare le coppie vere** (dichiarato). Nella prova B di `sintetico.mjs`
(argento sintetico = oro sintetico spostato di 60 giorni più rumore) la coppia oro → argento aveva 13 casi su 13 «dopo», ma
il modello nullo dava solo p ≈ 0,02: con uno spostamento circolare libero, gli spostamenti piccoli (fino a qualche mese)
lasciano B quasi allineato ad A, e il nullo riproduce il ritardo invece di romperlo. Con p ≥ 0,02 nessuna coppia potrebbe
mai superare la correzione per 432 test. Per le coppie lo spostamento casuale è quindi preso tra 730 giorni (due volte la
finestra di ±365) e la lunghezza del periodo meno 730 giorni. Il p con lo spostamento libero resta nei risultati (`pNull0`,
`qBH0`). A quel punto avevo già visto concordanza e fuori campione sui dati veri (sezione 3 e 5), non le coppie: per non
scegliere dopo aver visto, per concordanza e fuori campione resta il nullo dichiarato (spostamento libero) e lo spostamento
minimo di 730 giorni compare solo tra i controlli di sensibilità.

## 2. Verdetto

**Nessun pattern regge.** L'ordine in cui i 9 mercati fanno massimi e minimi cambia da un ciclo all'altro più o meno quanto
cambierebbe per caso. Solo una coppia passa il criterio 2: **rame → petrolio, ai massimi**. È però descrittiva: i
criteri 1 e 3 non passano, e come segnale non serve (criterio 4).

| Criterio | Esito | Numeri chiave |
| --- | --- | --- |
| 1. Ordine che si ripete | **non regge** | p = 0,051 · 0,102 · 0,289 per i massimi (15/20/30%) e 0,458 · 0,571 · 0,359 per i minimi. Nessuna soglia sotto 0,05; ne servivano 2 su 3 per tipo. |
| 2. Coppia guida-seguace | **regge per 1 coppia su 72** (massimi, 15% e 20%) | Rame → petrolio: 11 casi su 12 «dopo» a 15% (scarto mediano +68,5 giorni, q = 0,021), 8 su 9 a 20% (+52 giorni, q = 0,021), e lo stesso in tutte e due le metà. Ai minimi niente (4 su 8 a 15%). Le altre 430 combinazioni non passano. |
| 3. Fuori campione | **non regge** | p = 0,064 · 0,276 · 0,498 (massimi) e 0,212 · 0,386 · 0,260 (minimi). |
| 4. Utilità | **non utile** (calcolo solo illustrativo, perché 1 e 3 non passano) | Dalla conferma del massimo del rame, il petrolio fa un massimo entro la finestra 7 volte su 13 (54%), contro il 52% di giorni presi a caso (p = 0,56). A 20%: 4 su 10 (40%) contro il 40%. |

Rame → petrolio va letto con tre cautele:
- regge solo con il modello nullo corretto dopo la prova sintetica (sezione 1, ultimo paragrafo). Con lo spostamento libero
  dichiarato all'inizio: q = 0,319, quindi non passerebbe;
- 3 degli 11 «dopo» sono di 1-4 giorni (2008, 2010, 2022), cioè in pratica insieme. Oltre i 31 giorni sono 8 su 12 (67%) a 15%
  e 5 su 9 (56%) a 20%;
- quando il massimo del rame è confermato, il petrolio di solito ha già girato oppure non gira più: per questo il criterio 4 fallisce.

## 3. Risultati

Tutti i numeri vengono da `risultati.json` (scritto da `script/leadlag.mjs`). Gli elenchi completi sono in `tabelle.md`.

### 3.1 Punti di svolta (punto 1)

| Mercato | Da | Massimi 15% | 20% | 30% | Minimi 15% | 20% | 30% |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 17/09/2015 | 22 | 17 | 8 | 6 | 5 | 4 |
| Oro | 30/08/2001 | 8 | 6 | 2 | 6 | 4 | 4 |
| Argento | 30/08/2001 | 16 | 10 | 8 | 14 | 10 | 8 |
| Rame | 30/08/2001 | 15 | 10 | 5 | 9 | 7 | 6 |
| Petrolio WTI | 23/08/2001 | 19 | 13 | 9 | 18 | 17 | 12 |
| Nasdaq-100 | 01/01/1999 | 12 | 6 | 3 | 14 | 12 | 8 |
| S&P 500 | 01/01/1999 | 8 | 4 | 3 | 13 | 10 | 7 |
| Semiconduttori | 13/07/2002 | 16 | 11 | 7 | 13 | 12 | 9 |
| KOSPI | 01/01/1999 | 16 | 12 | 7 | 13 | 11 | 8 |
| **Totale** | | 132 | 89 | 52 | 106 | 88 | 66 |

«Da» è il primo giorno in cui un punto di svolta è valido: il 01/01/1999, oppure un anno dopo l'inizio della serie. I
massimi coincidono con `cyclePeaks` dell'app in tutti i 27 casi (mercato × soglia). Togliere il 20/04/2020 del petrolio non
cambia nessuna data dei suoi massimi. Dal 2000 i conteggi dei massimi sono quelli di `ricerca/rotazione-bolle/backtest.md` (T1);
il KOSPI ne ha 2 in più a 15% perché qui si parte dal 1999. I minimi sono meno dei massimi nei mercati che salgono a lungo
(bitcoin 6 contro 22): un minimo di 52 settimane arriva solo nelle fasi di ribasso.

### 3.2 Cicli comuni e concordanza (punti 2 e 3)

| Tipo | Soglia | Cicli comuni | Coppie di cicli confrontate | ρ medio | Nullo: mediana [5%, 95%] | p |
| --- | --- | --- | --- | --- | --- | --- |
| massimi | 15% | 23 | 121 | 0,143 | −0,006 [−0,127; 0,144] | 0,051 |
| massimi | 20% | 15 | 46 | 0,222 | 0,008 [−0,227; 0,290] | 0,102 |
| massimi | 30% | 9 | 16 | 0,321 | 0,000 [−0,600; 0,750] | 0,289 |
| minimi | 15% | 19 | 74 | 0,043 | 0,028 [−0,200; 0,294] | 0,458 |
| minimi | 20% | 14 | 52 | 0,029 | 0,060 [−0,231; 0,400] | 0,571 |
| minimi | 30% | 10 | 31 | 0,184 | 0,107 [−0,255; 0,500] | 0,359 |

5000 ripetizioni del modello nullo. Ai massimi l'ordine è un po' più simile del caso (ρ positivo a tutte le soglie), ma
non abbastanza per passare la soglia di 0,05. Ai minimi l'ordine è come quello del caso.

**Ordine medio ai massimi** (rango da 0 = primo a 1 = ultimo, soglia 15%, tutti i cicli; `tabelle.md` T3). Prima bitcoin
(0,29) e semiconduttori (0,31). Poi KOSPI (0,43), rame (0,44), S&P 500 (0,54), Nasdaq-100 (0,60), argento (0,63) e oro
(0,65). Per ultimo il petrolio (0,73). È lo stesso quadro dello studio precedente: tecnologia e Corea prima, materie prime
dopo. Però non regge come regola, e alcuni ranghi si spostano molto tra le due metà. Per esempio i semiconduttori: 0,13 fino
al 2012 e 0,40 dal 2013 ai massimi a 15%, 0,24 e 0,71 a 20%. L'argento ai minimi a 20% passa da 0,68 a 0,06.

**Esempio di cicli** (massimi a 20%; tutti gli elenchi in `tabelle.md` T4):
- 2007-08: semiconduttori 17/07/2007 → rame 20/07/2007 → S&P 500 09/10/2007 → Nasdaq-100 e KOSPI 31/10/2007;
- 2008: argento 05/03/2008 → oro 18/03/2008 → rame 02/07/2008 → petrolio 03/07/2008;
- 2025-26: rame 23/07/2025 → bitcoin 06/10/2025 → argento 26/01/2026 → oro 29/01/2026 → petrolio 07/04/2026 →
  semiconduttori e KOSPI 22/06/2026.

**Sensibilità** (`tabelle.md` T2s, 2000 ripetizioni, solo descrittiva). Con gruppi fino a 548 giorni i massimi a 15% danno
p = 0,024; con cicli di almeno 4 mercati p = 0,042. Con gruppi fino a 182 giorni p = 0,114; senza il Nasdaq-100 p = 0,054.
Le altre soglie e tutti i minimi restano sopra 0,05 in tutte le varianti. Con 5 varianti × 6 casi, un paio di p appena
sotto 0,05 sono quelli che ci si aspetta per caso. Il segnale più forte resta un ordine debole ai massimi a 15%, non una regola.

### 3.3 Coppie (punto 4)

432 test (72 coppie ordinate × 2 tipi × 3 soglie), 425 con almeno un caso. Prima della correzione, 23 combinazioni hanno
una quota «dopo» ≥ 75% con almeno 8 casi. Dopo la correzione di Benjamini-Hochberg ne restano 2, cioè rame → petrolio ai
massimi a 15% e 20%. Le prime della lista (`tabelle.md` T5a e T5b):

| Tipo | Soglia | A → B | Casi | Quota dopo | Scarto mediano | p nullo | q | 2000-2012 | 2013-2025 | Criterio 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| massimi | 15% | Rame → Petrolio | 12 | 92% | +68,5 g | < 0,001 | 0,021 | 7/7 | 4/5 | **sì** |
| massimi | 20% | Rame → Petrolio | 9 | 89% | +52 g | < 0,001 | 0,021 | 5/5 | 3/4 | **sì** |
| massimi | 15% | Bitcoin → Rame | 16 | 94% | +128,5 g | 0,006 | 0,836 | — | 15/16 | no (q; solo dal 2015) |
| massimi | 20% | Bitcoin → Semiconduttori | 14 | 79% | +158 g | 0,021 | 1,000 | — | 11/14 | no |
| massimi | 15% | Semiconduttori → S&P 500 | 9 | 78% | +71 g | 0,026 | 1,000 | 3/3 | 4/6 | no |
| massimi | 15% | Nasdaq-100 → Oro | 8 | 88% | +129,5 g | 0,031 | 1,000 | 3/4 | 4/4 | no |
| minimi | 20% | KOSPI → S&P 500 | 9 | 89% | +12 g | 0,045 | 1,000 | 5/6 | 3/3 | no |

Bitcoin ha punti di svolta solo dal 2015: le sue coppie hanno solo la seconda metà e non possono passare il criterio 2.
Le sue quote alte ai massimi (prima di rame, KOSPI, semiconduttori e indici, con scarti di 4-8 mesi) vengono da
un solo periodo (2015-2025) e non reggono alla correzione.

Casi di rame → petrolio, massimi a 15% (giorno del massimo del rame, tra parentesi i giorni fino a quello del petrolio):
01/03/2004 (+92), 23/05/2006 (+52), 20/07/2007 (+349), 02/07/2008 (+1), 06/01/2010 (+90), 05/04/2010 (+1), 14/02/2011 (+74),
08/06/2018 (+117), 11/05/2021 (+63), 04/03/2022 (+4), 21/05/2024 (−237), 23/07/2025 (+258).

### 3.4 Fuori campione (punto 5)

| Tipo | Soglia | Cicli dal 2013 confrontati | ρ medio tra ordine stimato e ordine vero | p nullo | p permutazione |
| --- | --- | --- | --- | --- | --- |
| massimi | 15% | 11 | 0,299 | 0,064 | 0,078 |
| massimi | 20% | 6 | 0,161 | 0,276 | 0,234 |
| massimi | 30% | 4 | 0,025 | 0,498 | 0,470 |
| minimi | 15% | 10 | 0,183 | 0,212 | 0,235 |
| minimi | 20% | 7 | 0,098 | 0,386 | 0,395 |
| minimi | 30% | 5 | 0,237 | 0,260 | 0,284 |

L'ordine dei cicli fino al 2012 prevede un po' quello dei cicli dopo (ρ sempre positivo), ma mai in modo distinguibile dal
caso. Il caso migliore sono di nuovo i massimi a 15%.

### 3.5 Utilità (punto 6)

Il calcolo vero e proprio non si fa: nessuna coppia passa i criteri 1-3. Come illustrazione, dichiarata prima, lo si fa per
rame → petrolio (`tabelle.md` T6). Dal giorno in cui il massimo del rame è confermato, il petrolio fa un massimo entro la
finestra 7 volte su 13 a 15% (54%, base 52%, p = 0,56; anticipo mediano 68 giorni). A 20% sono 4 volte su 10 (40%, base 40%,
p = 0,62). Saperlo non aggiunge niente rispetto a un giorno qualsiasi: il petrolio fa un massimo entro un anno circa una
volta su due in ogni caso.

### 3.6 Oggi, 20/11/2026 (punto 7, solo descrizione)

Nessun pattern regge, quindi qui non c'è una previsione. Ecco dove si trova ciascun mercato (`tabelle.md` T7):
- **Semiconduttori e KOSPI**: massimo il 22/06/2026, insieme. Oggi −43,5% e −46,6%.
- **Nasdaq-100**: massimo il 06/10/2026, confermato a 15% il 19/11/2026 (−19,8%). **S&P 500**: massimo lo stesso giorno,
  oggi −11,6%, sotto la soglia del 15%.
- **Rame**: massimo il 09/09/2026, confermato a 15% il 18/11/2026 (−19,5%).
- **Petrolio**: massimo il 07/04/2026, oggi −25,6%.
- **Oro e argento**: massimo a fine gennaio 2026 (29/01 e 26/01). Oggi sono al minimo di 52 settimane, a −33,9% e −64,3%.
- **Bitcoin**: −39,3% dal massimo di 52 settimane del 14/01/2026 (il suo ultimo massimo di ciclo è del 06/10/2025), +0,4%
  dal minimo di 52 settimane.

Nell'unica relazione descrittiva, rame → petrolio, questa volta il petrolio è già venuto dopo il rame: il rame ha fatto il
massimo il 23/07/2025, il petrolio il 07/04/2026 (+258 giorni). Dopo il nuovo massimo del rame del 09/09/2026, il petrolio
dovrebbe superare 112,95 dollari per fare un nuovo massimo di ciclo. Il ciclo 2025-26 dei massimi (rame, bitcoin, metalli
preziosi, petrolio, semiconduttori e KOSPI, poi Nasdaq-100 e S&P 500 a ottobre 2026) ha le materie prime **prima** degli
indici. È il contrario dell'ordine medio, e questo conferma che l'ordine non è fisso.

## 4. Il metodo sa trovare e sa rifiutare? (`script/sintetico.mjs`, `sintetico.json`)

Sono prezzi sintetici con le date vere dei 9 mercati. Le tabelle complete sono in `tabelle.md` T8.
- **A. Ritardo noto** (ogni mercato = un fattore comune spostato di 0, 30, …, 240 giorni, più rumore): la concordanza ha
  p < 0,001 in 6 casi su 6 e il fuori campione p ≤ 0,016 in 6 su 6. Gli scarti mediani trovati sono 29,5 / 60 / 90 / 120
  giorni per ritardi veri di 30 / 60 / 90 / 120 giorni. Nessuna coppia al contrario passa il criterio 2. Il criterio 2 però è
  severo: passano 43 coppie su 155 con un ritardo vero di 30-120 giorni. Con 25 anni di dati, anche un ritardo vero spesso
  non arriva a 8 casi o non supera la correzione.
- **B. Una sola coppia a 60 giorni tra mercati indipendenti**: oro → argento è trovata a 15% (massimi 10 casi su 11, +59
  giorni; minimi 13 su 13, +61 giorni; q = 0,014). A 20% e 30% non passa: i casi sono meno di 8 oppure q è troppo alto.
  Nessuna coppia falsa passa e la concordanza non risulta significativa (p da 0,22 a 0,94).
- **C. Mercati indipendenti**: in 20 serie diverse nessuna coppia passa il criterio 2 (0 su 2876 test), anche se 84
  combinazioni hanno una quota ≥ 75% con almeno 8 casi. Il 4% dei p delle coppie, prima della correzione, è sotto 0,05.
  Con 100 serie diverse a 15 e 20%, la concordanza dà p < 0,05 in 19 prove su 400 (4,8%) e il fuori campione in 15 su 400
  (3,8%): il modello nullo è tarato bene.

## 5. Controllo indipendente (`script/verifica.py`)

Python, file grezzi di Yahoo, algoritmi a forza bruta. Risultato: **0 differenze**.
- 533 punti di svolta uguali per data e conferma.
- Tutti i cicli comuni uguali, con la stessa concordanza e lo stesso fuori campione.
- Tutte le 432 coppie uguali per casi, «dopo», scarto mediano, p binomiale e metà.
- Correzione di Benjamini-Hochberg uguale (scipy).
- I p del modello nullo, rifatti con un altro generatore, coincidono entro l'errore Monte Carlo. Per esempio la concordanza
  dei massimi a 15% dà 0,058 con 500 ripetizioni, contro 0,051; rame → petrolio dà 0,0001 in entrambi.
- Utilità e valori di oggi uguali.

Una prova con 4 valori alterati di proposito (una data, una ρ, un conteggio e un p) li trova tutti e 4
(`--risultati <file>`). Il ricalcolo di `leadlag.mjs` è deterministico: due esecuzioni danno lo stesso `risultati.json`.

## 6. Limiti

- **Pochi cicli**: da 9 a 23 cicli comuni per tipo e soglia, e da 5 a 20 casi per coppia. Le percentuali sono indicative e
  il test ha poca potenza: la prova sintetica A mostra che anche un ritardo vero spesso non passa il criterio 2. «Non regge»
  vuol dire «non dimostrato con questi dati», non «non esiste».
- **Campione**: dal 1999. Bitcoin solo dal 2015, metalli e petrolio dal 2001, semiconduttori dal 2002. La storia lunga (dal
  dopoguerra, tassi e dollaro) è il tema di `ricerca/cicli/pring/`.
- **Serie sovrapposte**: S&P 500 e Nasdaq-100, semiconduttori e Nasdaq-100, oro e argento si muovono insieme. Questo gonfia
  un po' la concordanza; senza il Nasdaq-100 i risultati sono simili o più deboli.
- **Test multipli**: 432 test di coppia, 6 di concordanza, 6 di fuori campione e 30 di sensibilità. La correzione è applicata
  alle coppie; per concordanza e fuori campione la regola «2 soglie su 3, massimi e minimi» fa da freno.
- **Modello nullo delle coppie**: cambiato dopo la prova sintetica e prima di vedere le coppie vere (sezione 1). L'unica coppia
  che passa dipende da questo cambio.
- **Definizioni**: un calo del 15% e un rialzo del 15% non sono simmetrici. Il raggruppamento a volte forma gruppi
  intrecciati (2021-22 ai massimi, due gruppi nel 2008 ai minimi).
- **Fine del campione**: le svolte troppo vicine al 20/11/2026 non sono ancora confermate. Nelle coppie, i punti di A dopo il
  20/11/2025 sono esclusi.
- **Future continui** (oro, argento, rame, petrolio): ai cambi di contratto il livello si sposta (vedi `config/ath.json`).
  Le date delle svolte cambiano poco, i cali un po' di più.

## 7. Come rifare tutto

```
node ricerca/rotazione-bolle/script/backtest.mjs --refresh      # solo per riscaricare i dati da Yahoo (scrive serie.json)
node ricerca/cicli/lead-lag/script/leadlag.mjs                  # circa 1 minuto: risultati.json
node ricerca/cicli/lead-lag/script/sintetico.mjs                # circa 7 minuti: sintetico.json
python3 -I ricerca/cicli/lead-lag/script/verifica.py            # ricalcolo indipendente, deve dire «DIFFERENZE: 0»
node ricerca/cicli/lead-lag/script/tabelle.mjs                  # tabelle.md
```

Gli script leggono le chiusure da `ricerca/rotazione-bolle/cache/`: non è stato scaricato nulla di nuovo, e
`ricerca/cicli/lead-lag/cache/` resta vuota. Nessun file dell'app è stato modificato.
