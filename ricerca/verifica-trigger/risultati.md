# Verifica del trigger dopo la zona blu: risultati

26 settembre 2026 · protocollo congelato nel commit `6665380` (`protocollo.md`), dati al 25/09/2026 (commit `f743b04`).

## In breve

**Nessuna delle sette regole supera i criteri fissati, quindi resta il trigger attuale.** È l'esito «inconcludente» che il protocollo prevedeva come possibile.

- **Freno con la media a 50 (C1a):** è la regola a ingresso unico più vicina a passare. Guadagna 1 punto in media e aiuta nei ribassi lenti (2008–09, 2011, 2022–23), ma perde un po' negli altri periodi. Fa perdere più rimbalzo del consentito e non regge sul 2015–2025.
- **Ingresso in due tempi (C4):** è la regola più vicina in assoluto. Il rendimento è uguale a quello di oggi (+0,3 punti) e il calo massimo migliora in 5 periodi su 7, ma ne servivano 6.
- **Struttura di Dow, acceleratore e tre tempi alla Rea, con e senza POC:** abbassano tutti il rendimento.

**Il dato più forte viene da un termine di paragone, non da una regola.** Comprare appena il settore entra in zona blu e tenere un anno ha reso in media il 21,5%, contro il 16,3% del trigger attuale: 5,2 punti in più. È andata meglio in 5 periodi su 7 e in 34 episodi su 48.

Costa però più rischio:

| | Ingresso in zona blu | Trigger attuale |
|---|---|---|
| Calo massimo mediano a 63 sedute | −5,1% | −4,5% |
| False partenze | 17 | 14 |
| Caso peggiore | −25,2% | −18,7% |

Aspettare la conferma ha pagato davvero solo nel 2008–09.

## Controlli

- Il motore riproduce il trigger dell'app (`js/signals.js`) in tutti i 48 episodi: stessi trigger, stessi fallimenti, stesse date.
- Il valore finale di un episodio con ingresso singolo e di uno con ingresso in due tempi è stato ricalcolato a mano e coincide.
- Gli script salvati in questa cartella riproducono esattamente `risultati.json`.

## Risultati per regola

Il rendimento è la misura principale: da inizio zona blu a un anno dopo, restando liquidi fino all'ingresso. Le medie danno lo stesso peso a ogni periodo di crisi. Per gli ingressi in più tempi, la colonna «Periodi migliori» conta i periodi in cui migliora il calo massimo.

| Regola | Rendimento medio a 1 anno | Differenza da C0 | Periodi migliori / toccati | p casuale corretto | Calo massimo a 63 sedute (mediana) | False partenze | Rimbalzo perso: mediana (solo crolli a V) | Esito |
|---|---|---|---|---|---|---|---|---|
| C0 trigger attuale | 16,3% | — | — | 0,003 | −4,5% | 29% | 30% (52%) | Riferimento |
| C1a freno, media a 50 | 17,3% | +1,0 | 3 / 7 | < 0,001 | −3,9% | 23% | 43% (56%) | Non passa |
| C1b freno, struttura di Dow | 13,6% | −2,7 | 3 / 7 | 0,196 | −4,0% | 21% | 54% (67%) | Non passa |
| C2 acceleratore | 14,6% | −1,7 | 1 / 4 | 0,040 | −4,8% | 35% | 25% (52%) | Non passa |
| C3 freno e acceleratore | 15,8% | −0,6 | 3 / 7 | 0,007 | −4,5% | 29% | 37% (56%) | Non passa |
| C4 due tempi | 16,7% | +0,3 | 5 / 7 | 0,001 | −4,2% | 29% | 30% (56%) | Non passa |
| C5 tre tempi, solo prezzi | 14,0% | −2,3 | 4 / 6 | 0,107 | −2,8% | 35% | 31% (63%) | Non passa |
| C6 tre tempi con POC | 10,6% | −5,7 | 4 / 6 | 0,983 | −1,7% | 19% | 63% (72%) | Non passa |

Criteri non superati:

- **C1a:** coerenza tra i periodi (3 su 7, ne servivano 6); rimbalzo perso (+13 punti, il tetto era 10); robustezza (sul 2015–2025 perde 0,4 punti). Supera il test con date casuali, il calo massimo, le false partenze e i ritardi rimescolati.
- **C1b:** tutti i criteri tranne calo massimo e false partenze. Batte C1a in un solo periodo su 6, quindi il freno usato in C3 è C1a.
- **C2 e C3:** coerenza e robustezza.
- **C4:** solo la coerenza del rischio (5 periodi su 7). Il rendimento e la robustezza passano.
- **C5:** rischio (4 periodi su 6), costo (2,3 punti, il tetto era 2) e robustezza.
- **C6:** tutti. Inoltre in 7 episodi non entra mai. Tra C5 e C6 il protocollo preferisce C5: C6 non lo batte in nessun periodo.

## Differenze per periodo rispetto al trigger attuale

Punti di rendimento a un anno. Per C4, C5 e C6 la seconda riga è il calo massimo a 63 sedute (positivo = calo minore).

| | 2008–09 | 2011 | 2015–16 | dic. 2018 | 2020 | 2022–23 | 2025 |
|---|---|---|---|---|---|---|---|
| Episodi | 12 | 5 | 7 | 5 | 10 | 8 | 1 |
| C1a | +3,9 | +4,6 | −0,2 | −1,2 | −0,7 | +1,4 | −1,1 |
| C1b | +5,4 | +1,2 | −5,5 | −4,3 | −6,6 | +1,5 | −10,9 |
| C2 | +0,1 | 0,0 | −0,7 | 0,0 | −3,8 | 0,0 | −7,7 |
| C3 | +4,0 | +4,6 | −1,2 | −1,2 | −3,8 | +1,4 | −7,7 |
| C4 rendimento | +2,2 | +2,3 | −0,4 | −1,0 | −0,7 | +0,6 | −0,6 |
| C4 calo massimo | +2,1 | +2,9 | +0,3 | −0,2 | +0,2 | +1,5 | −0,5 |
| C5 rendimento | +2,1 | +0,3 | −2,1 | −4,0 | −6,3 | −0,8 | −5,2 |
| C5 calo massimo | +2,3 | +4,5 | +0,2 | −0,2 | +0,1 | +1,3 | −2,6 |
| C6 rendimento | −7,4 | −2,3 | −6,0 | −6,6 | −10,3 | −1,1 | −6,2 |
| C6 calo massimo | +7,0 | +9,0 | −0,1 | −3,3 | +1,4 | +4,3 | −1,6 |
| Ingresso in zona blu (paragone) | −8,5 | +12,5 | +4,3 | +9,5 | +16,3 | +4,8 | −2,9 |

## Perché è andata così

- **Il freno funziona dove doveva, ma solo lì.**
  - La media a 50 riduce le false partenze dal 29% al 23% e aggiunge rendimento nei ribassi lenti.
  - Nei rimbalzi rapidi fa entrare più tardi: il rimbalzo perso sale dal 30% al 43%.
  - La struttura di Dow è ancora più lenta (54% di rimbalzo perso) e in 2 episodi non entra.
- **L'acceleratore cambia pochi episodi, e quasi sempre in peggio.**
  - Nel 2020 fa entrare XLE l'8 giugno invece che a novembre. Era il massimo di giugno: da lì il settore riscende del 39% fino al 28 ottobre, e il rendimento passa dal 48% al 10%.
  - Nel 2025 il segnale su XLB scatta il 2 aprile, giorno dell'annuncio dei dazi. Si compra alla chiusura del 3, in pieno crollo, e il segnale fallisce subito: si esce il 4, un altro 6% più in basso.
  - Nel 2008–09 i risultati sono misti.
- **I tre tempi alla Rea entrano troppo tardi con i secondi e terzi terzi.** Il ritest e la compressione di lungo periodo arrivano quando buona parte del rimbalzo è passata.
- **Con il POC l'attesa si allunga di mesi.** Il POC di tutta la discesa, dal massimo a 52 settimane, sta di solito in alto, quindi il primo terzo aspetta che il prezzo lo recuperi. Esempi:
  - XLE 2018: trigger a gennaio 2019, primo acquisto a luglio 2019;
  - XLB 2008: nessun acquisto.
- **Nota sulla definizione di C5, tenuta com'era congelata.** Quando il trigger non nasce da una rottura, il «livello rotto» sta sopra il prezzo e il secondo terzo entra quasi subito.

## Termini di paragone

| Ingresso | Rendimento medio a 1 anno |
|---|---|
| Sul minimo ex post (solo riferimento, impossibile in tempo reale) | 38,1% |
| Buy & hold di SPY nelle stesse finestre | 25,5% |
| Buy & hold del settore da inizio zona blu | 21,7% |
| All'ingresso in zona blu (T0) | 21,5% |
| T0 + 10 sedute | 20,7% |
| T0 + 21 sedute | 18,3% |
| Trigger attuale (C0) | 16,3% |
| Sola risalita della breadth, senza conferme | 14,9% |
| Date casuali nella finestra (media) | 10,4% |

Due letture:

- **Ogni attesa costa.** Il rendimento scende man mano che l'ingresso si allontana dall'inizio della zona blu. La conferma serve soprattutto a evitare il caso peggiore, cioè un ribasso lungo come il 2008–09, non a guadagnare di più.
- **Nell'anno successivo, in media, SPY ha fatto meglio del settore in zona blu** (25,5% contro 21,7%). Il segnale sembra dire più sul momento del mercato che sulla scelta del settore. È un'osservazione descrittiva, non verificata con i criteri del protocollo.

## Limiti

- I 48 episodi valgono circa 7 prove indipendenti. Anche il vantaggio dell'ingresso in zona blu (5 periodi su 7) non supererebbe la soglia di coerenza del protocollo.
- Nel campione non c'è un ribasso pluriennale come il 2000–02, perché la breadth parte dal 2005.
- Per il POC il volume è quello dei titoli del settore, non quello dell'ETF.
- Tutte le conclusioni valgono per queste regole con questi parametri. Le variazioni del punto 8 sono servite solo come controllo di robustezza, come previsto. Alcune danno piccoli miglioramenti medi, fino a +0,7 punti per C3, ma nessuna è stata valutata come regola a sé.

## Registro

Sono state calcolate 53 varianti: le 8 regole, i controlli di robustezza del punto 8 e i termini di paragone. L'elenco completo, con i valori, è in `risultati.json` (campo `registry`), insieme alle misure per episodio di ogni regola.

## Come riprodurre

- **Verifica:** `node valuta.mjs` in questa cartella legge i dati congelati dal commit `f743b04` con `git show` e riscrive `risultati.json`.
- **Controllo di coerenza:** `node controllo_c0.mjs` confronta il motore con l'app.
- **Volumi di settore (`volumi_settori.json`):** sono ricavati dall'archivio sp500-data di Johnbrick123 con `settori.py` e `volumi_settori.py`. Servono Python e duckdb.
