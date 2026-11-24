# Backtest «Emergenti»: lo strato macro (valuta e dollaro) aiuta i bottom trovati con la breadth?

Fase di verifica preliminare, nessuna modifica all'app. Tutti i numeri vengono da `script/backtest.mjs`, che scrive
`risultati.json`, e sono ricontrollati da `script/verifica.py`, un ricalcolo indipendente in Python che non importa
i moduli dell'app. Dati degli indici al 30/10/2026 (`data/indices.json`), cambi e FRED scaricati il 05/11/2026.

```
node ricerca/emergenti/backtest/script/scarica.mjs     # cache in ricerca/emergenti/cache/ (non versionata)
node ricerca/emergenti/backtest/script/backtest.mjs    # → risultati.json e tabelle a schermo
python3 -I ricerca/emergenti/backtest/script/verifica.py
```


> **Correzioni del 05/11/2026 (controlli della 1.4.0).** I controlli hanno trovato nella storia dei cambi di Yahoo errori di stampa che la pulizia non riconosceva (TWD=X a 1,80 il 25/10/2011, CNY=X a 5,86 il 18/07/2011, INR=X a 85,19 il 02/11/2023, BRL=X a 4,96 il 26/10/2026). Per scelta dell'utente, **dal 05/11/2026 la fonte principale dei cambi è la Federal Reserve** (FRED H.10 dal 2000, alla stessa data, senza pulizia: `fsrc: 'fedx'` in `script/backtest.mjs`); Yahoo resta come sensibilità («cambi Yahoo»), la Fed pubblicata con il ritardo reale come seconda sensibilità. Inoltre in H5 il denominatore conta anche l'episodio in cui F non si accende mai (campo `F.mai`).
> Numeri attuali (`risultati.json`, ricalcolati e confermati da `script/verifica.py`; le tabelle qui sotto sono della prima corsa con Yahoo dove non dette): **H5**: F già acceso nei sei mesi prima del minimo in **15 cali su 17** (in 1 si accende dopo, KOSPI 2011; in 1 mai, IBOV 2004; uno dei 15 è il KOSPI 2026, minimo provvisorio); F si accende dopo il minimo in mediana dopo 3 sedute (15 episodi); D in mediana 110 sedute dopo il minimo (19 cali, invariato). **H1** punteggio pieno in 0 trigger su 31; **H2** in 0 ingressi su 27; **H3** dal 2016 pieno − base +2,7 punti (soglia 5); **H4** sulle sedute libere +4,5 contro gestite +5,0, sui segnali +13,6 contro −5,2 con 5-11 casi per cella. Esplorazione: trigger con F acceso +24,7% a 126 sedute (0/11 falliti) contro +10,1% (5/13). Yahoo e Fed danno un F diverso in 3 trigger su 19. **I verdetti non cambiano.**

## La domanda

L'app trova i possibili bottom degli indici emergenti con la breadth: ingresso in zona blu e trigger della macchina a
stati. Se a quel punto guardiamo anche la valuta locale contro il dollaro e il dollaro contro le valute emergenti,
separiamo meglio i segnali buoni da quelli cattivi?

## Il metodo, in breve

Le definizioni sono state fissate prima di guardare i risultati. Le varianti provate dopo sono solo sensibilità o
esplorazione, e sono indicate come tali.

- **Indici**: CSI300, NIFTY50, IBOV, KOSPI200, TWN, HSI ed EEM, con breadth e prezzi dell'app. La breadth degli
  emergenti è ricostruita con i **membri di oggi**: è un'approssimazione, ed è dichiarata dall'app. La macchina a
  stati è `runMachine` di `js/signals.js`, con i parametri di `config/thresholds.json` e i livelli blu di
  `config/indices.json`, come fa l'app.
- **F, la valuta ha smesso di scendere**. Si calcola sul calendario del cambio, in unità di valuta locale per
  dollaro (Yahoo: CNY=X, INR=X, BRL=X, KRW=X, TWD=X). Prima si misura z: la variazione a 63 sedute divisa per la
  deviazione standard delle variazioni a 63 sedute dei 3 anni precedenti, con i soli dati fino a quel giorno.
  F è acceso se z è stato almeno +1 (deprezzamento) in una delle ultime 126 sedute e se oggi il cambio è sotto il
  massimo delle ultime 63 sedute di almeno 0,5 deviazioni standard.
  - F′, per confronto: il cambio sotto la sua media a 50 sedute.
- **D, il dollaro è favorevole agli emergenti**: DTWEXEMEGS (FRED) sotto la media a 200 sedute e con una variazione a
  63 sedute negativa.
- **Punteggio**: F + D, da 0 a 2. Per HSI (dollaro di Hong Kong agganciato) ed EEM (in dollari) conta solo D, da 0 a 1.
  «Pieno» vuol dire 2, oppure 1 per HSI ed EEM.
- **Rendimenti**: dalla chiusura della seduta **dopo** il segnale, in valuta locale e in dollari (prezzo diviso per il
  cambio dello stesso giorno; HSI con HKD=X).
- **Fallito**: dopo il trigger la macchina segna «fallito» prima del trigger successivo, come nella tabella degli
  episodi dell'app.
- **Crisi**, finestre decise prima di guardare: 2008 (10/2007-6/2009), 2011 (5/2011-6/2012), 2015-16 (6/2015-6/2016),
  2018 (2/2018-1/2019), 2020, 2022 (7/2021-12/2022), 2024-25.
- **Nessun dato futuro, e due regole dichiarate e misurate**:
  1. *Ritardo di pubblicazione di D.* FRED pubblica DTWEXEMEGS una volta alla settimana: il lunedì esce la settimana
     precedente. Il valore di un giorno si usa quindi dal martedì della settimana dopo, prendendo l'ultimo valore
     pubblicato. È un'eccezione alla regola «niente riempimento», perché è proprio il dato che un utente vede quel
     giorno. Come sensibilità c'è anche D preso lo stesso giorno, che guarda avanti fino a una settimana.
  2. *Dati sporchi di Yahoo.* Un errore di stampa isolato (un salto oltre il 3% che si annulla il giorno dopo; per
     CNY e HKD le soglie sono 1% e 0,3%) diventa un giorno mancante. Le giornate tolte sono 9 per CNY, 3 per INR,
     16 per BRL, 18 per KRW, 30 per TWD e 3 per HKD. Una variazione a 63 sedute che scavalca un buco di oltre 10
     giorni vale «—».
- Se il cambio manca nella data dell'indice, il punteggio di quel giorno è «—».

Gli episodi indipendenti sono pochi: 31 trigger e 27 ingressi in zona blu, che però cadono in 7 crisi. Le
percentuali sono quindi **solo indicative**.

## Copertura: quanto spesso il punteggio è pieno

Sedute contate dalla prima con uno stato della macchina.

| Indice | Stato dal | Punteggio dal | Sedute | Con punteggio | Pieno | Zero |
|---|---|---|---:|---:|---:|---:|
| CSI300 | 05/06/2013 | 04/05/2012 | 3254 | 3238 | 11% | 53% |
| NIFTY50 | 22/09/2008 | 17/09/2007 | 4439 | 4288 | 16% | 41% |
| IBOV | 03/11/2008 | 18/11/2009 | 4458 | 4184 | 11% | 36% |
| KOSPI200 | 01/12/2006 | 29/03/2007 | 4901 | 4618 | 17% | 33% |
| TWN | 02/01/2003 | 24/12/2009 | 5838 | 4077 | 8% | 51% |
| HSI (solo D) | 01/09/2008 | 10/10/2006 | 4474 | 4474 | 38% | 62% |
| EEM (solo D) | 01/03/2011 | 10/10/2006 | 3942 | 3942 | 34% | 66% |

Su Yahoo BRL e TWD mancano tra il 2004 e il 2006, e tutti i cambi mancano dal 31/07 al 26/08/2008. Per questo F manca
proprio sui trigger di marzo-aprile 2009 di NIFTY50, IBOV, KOSPI200 e TWN.

## H1. Trigger: il punteggio pieno separa i buoni dai cattivi?

Criterio deciso prima: con il punteggio pieno il rendimento mediano a 126 sedute deve superare di almeno 5 punti quello
con punteggio 0, i falliti devono essere meno, e il risultato deve ripetersi in almeno 2 crisi.

| Punteggio al trigger | n | Mediana 126 sedute, locale | in dollari | Positivi | Falliti |
|---|---:|---:|---:|---:|---:|
| tutti | 31 | +18,0% | +18,8% | 27/31 | 5/31 |
| **pieno** | **0** | — | — | — | — |
| parziale (1 su 2) | 10 | +21,7% | +23,1% | 8/10 | 0/10 |
| 0 | 16 | +8,4% | +8,2% | 15/16 | 4/16 |
| «—» (F mancante) | 5 | | | | |

**Nessuno dei 31 trigger ha il punteggio pieno**, e solo uno ha D acceso: TWN il 12/08/2008, che poi è fallito
(−39,2%). D non si accende mai vicino ai bottom, perché nelle crisi il dollaro è forte. Così l'ipotesi non si può
nemmeno mettere alla prova: nessuna crisi permette il confronto.

Per indice, i trigger sono: CSI300 6, NIFTY50 2, IBOV 4, KOSPI200 5, TWN 8, HSI 4 ed EEM 2. Con il punteggio 0, i
falliti sono 2 su 3 per KOSPI200, 1 su 4 per TWN e 1 su 1 per CSI300.

**Verdetto H1: scartare** il punteggio F + D come regola sui trigger.

## H2. Ingresso in zona blu

| Punteggio all'ingresso | n | Mediana 126, locale | in dollari | Positivi | Falliti |
|---|---:|---:|---:|---:|---:|
| tutti | 27 | +14,5% | +15,8% | 19/26 | 4/27 |
| **pieno** | **0** | — | — | — | — |
| parziale | 4 | +3,9% | +2,8% | 2/3 | 0/4 |
| 0 | 19 | +19,0% | +21,0% | 16/19 | 3/19 |

Anche qui il punteggio pieno non c'è mai. Il punteggio parziale (in pratica F acceso) all'ingresso in zona blu va
**peggio** del punteggio 0, ma su 4 casi soltanto.

**Verdetto H2: scartare.**

## H3. Il punteggio da solo, su tutte le sedute

Mediane dei rendimenti per punteggio, sui cinque indici con F + D (CSI300, NIFTY50, IBOV, KOSPI200, TWN). Il periodo
dal 2016 è stato tenuto da parte.

| Punteggio | n fino al 2015 | 63 s. | 126 s. | 252 s. | n dal 2016 | 63 s. | 126 s. | 252 s. | 126 s. in dollari (dal 2016) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| tutte (base) | 7656 | +1,1 | +0,5 | +1,2 | 13214 | +2,9 | +5,3 | +11,3 | +5,1 |
| 0 | 2984 | +2,4 | +3,4 | +4,2 | 5672 | +2,1 | +4,5 | +11,3 | +4,4 |
| 1 | 3722 | −0,2 | −1,4 | −0,7 | 5798 | +3,5 | +5,5 | +11,7 | +5,4 |
| 2 | 950 | +1,7 | +1,0 | −0,4 | 1744 | +2,7 | +7,3 | +9,1 | +6,8 |

Su HSI ed EEM (solo D), dal 2016 D acceso dà +0,1% a 126 sedute contro +3,8% della base. Fino al 2015 dà −1,4%
contro +1,0%. Quindi D acceso va peggio della base, non meglio.

Come si legge la tabella:
- l'andamento è monotono (a 126 sedute 0 < 1 < 2) solo dal 2016, non fino al 2015;
- dal 2016 il punteggio pieno supera la base di 2,0 punti in valuta locale e di 1,7 in dollari, contro i 5 richiesti;
- per indice, dal 2016 lo scarto tra pieno e base è +4,6 per CSI300, +1,1 per NIFTY50, −4,2 per IBOV, +8,1 per
  KOSPI200 e +6,9 per TWN;
- le sedute si sovrappongono, quindi i valori n esagerano molto la quantità di informazione.

**Verdetto H3: scartare** come indicatore autonomo.

## H4. La valuta informa di più dove il cambio è libero?

Mediana a 126 sedute con F acceso contro F spento.

| Gruppo | Tutte le sedute: F=1 contro F=0 | Scarto | Segnali (trigger + zona blu): F=1 contro F=0 | Scarto |
|---|---|---:|---|---:|
| libere (BRL, KRW) | +3,2% (3468) contro +2,1% (5334) | +1,1 | +37,1% (4; 0 falliti) contro +19,2% (9; 3 falliti) | +17,9 |
| intermedia (TWD) | +5,1% (777) contro +5,2% (3300) | −0,1 | +31,0% (2; 0) contro +12,2% (9; 2) | +18,8 |
| gestite (CNY, INR) | +7,4% (2508) contro +2,0% (5483) | +5,4 | +3,5% (8; 0) contro +17,0% (5; 2) | −13,6 |

Su tutte le sedute vale il contrario dell'ipotesi: F informa di più per le valute gestite. Sui segnali c'è una
differenza nella direzione attesa, ma con 2-9 casi per cella.

**Verdetto H4: scartare.** L'ipotesi non è confermata, e i gruppi sono troppo piccoli per distinguere.

## H5. La valuta smette di scendere prima o dopo il minimo dell'indice?

I minimi principali sono gli episodi con un drawdown oltre il 25% dal massimo di chiusura precedente; il minimo è la
chiusura più bassa dell'episodio. Gli anticipi sono in sedute dell'indice: un numero negativo vuol dire prima del minimo.

| Misura | Episodi con il dato | Mediana | Prima / stesso giorno / dopo |
|---|---:|---:|---|
| F acceso il giorno del minimo | 2/13 | | |
| D acceso il giorno del minimo | 0/20 | | |
| prima accensione di F dal minimo in poi (entro 252 sedute) | 12 | **+4** | 0 / 2 / 10 |
| prima accensione di D dal minimo in poi | 19 | +110 | 0 / 0 / 19 |
| trigger dell'app (entro ±126 sedute) | 14 | +12,5 | 2 / 0 / 12 |
| prima accensione di F tra −126 e +126 sedute | 14 | −110,5 | 13 / 0 / 1 |

Sensibilità con il drawdown dal massimo a 252 sedute, come l'app: F acceso al minimo 1/21; F si accende dopo il
minimo in mediana dopo 6,5 sedute (18 episodi); D dopo 91 sedute.

La tabella dice tre cose:
- F è quasi sempre spento il giorno del minimo;
- F si accende in genere pochi giorni dopo il minimo (mediana 4 sedute), prima del trigger dell'app (mediana 12,5);
- F si era però già acceso, e poi spento, nei sei mesi prima del minimo in 15 episodi su 17 (in 1 si accende dopo, in 1 mai). Da solo dà molti falsi
  «stop».

D arriva in genere 4-5 mesi dopo il minimo: è una conferma tardiva, non un segnale di bottom.

| Indice | Minimo | Drawdown | F al minimo | F dopo (sedute) | D dopo | Trigger (sedute dal minimo) |
|---|---|---:|---|---:|---:|---:|
| CSI300 | 28/01/2016 | −46,3% | spento | 8 | 61 | −76 |
| CSI300 | 02/02/2024 | −45,1% | acceso | 0 | 26 | 1 |
| NIFTY50 | 27/10/2008 | −59,9% | — | — | 133 | 106 |
| NIFTY50 | 20/12/2011 | −27,9% | spento | 2 | 32 | — |
| NIFTY50 | 23/03/2020 | −38,4% | spento | 3 | 110 | 12 |
| IBOV | 27/10/2008 | −60,0% | — | — | 141 | 100 |
| IBOV | 23/03/2020 | −46,8% | spento | 13 | 112 | 28 |
| IBOV | 14/07/2022 | −26,5% | spento | 10 | 118 | — |
| KOSPI200 | 24/10/2008 | −54,5% | — | — | 145 | 99 |
| KOSPI200 | 26/09/2011 | −25,9% | spento | 16 | 91 | — |
| KOSPI200 | 19/03/2020 | −43,9% | spento | 4 | 113 | 21 |
| KOSPI200 | 30/09/2022 | −34,8% | spento | 4 | 64 | −46 |
| KOSPI200 | 26/10/2026* | −40,0% | acceso | 0 | — | — |
| TWN | 19/03/2020 | −28,7% | spento | nessuna entro 252 | 113 | 11 |
| TWN | 25/10/2022 | −31,6% | spento | 10 | 49 | 11 |
| TWN | 09/04/2025 | −28,7% | spento | 1 | 14 | 13 |
| HSI | 27/10/2008 | −65,2% | n.a. | | 142 | 109 |
| HSI | 31/10/2022 | −55,7% | n.a. | | 43 | 10 |
| EEM | 20/11/2008 | −67,2% | n.a. | | 126 | — |
| EEM | 24/10/2022 | −41,5% | n.a. | | 48 | — |

\* Episodio in corso: è il minimo provvisorio di 4 sedute prima della fine dei dati, non un minimo confermato.
Mancano gli episodi del 2001-2004, quando non c'erano ancora né cambi né D. «Trigger» è il primo trigger entro ±126
sedute dal minimo.

**Verdetto H5: procedere con modifiche.** F può servire come contesto del tipo «la valuta ha smesso di scendere», che
arriva vicino al minimo. Non può servire come anticipo né come regola, per via dei falsi stop prima del minimo. D non
serve per i bottom.

## Sensibilità

Per ogni variante: trigger con punteggio pieno contro punteggio 0 (H1), ingressi in zona blu (H2), lo scarto tra pieno
e base a 126 sedute in H3, e l'esplorazione su F da solo ai trigger (vedi sotto).

| Variante | H1 pieno/zero | H1 diff. (locale) | H2 pieno/zero | H3 monotono fino al 2015 / dal 2016 | H3 pieno − base dal 2016 | Trigger: F=1 contro F=0 |
|---|---|---:|---|---|---:|---|
| principale | 0/16 | — | 0/19 | no / sì | +2,0 | +21,7 (10; 0 falliti) contro +8,0 (10; 4) |
| variazione a 26 sedute | 0/13 | — | 0/16 | no / sì | +0,4 | +22,2 (15; 1) contro +5,9 (7; 3) |
| variazione a 126 sedute | 0/17 | — | 1/18 | no / sì | +4,3 | +13,0 (6; 0) contro +17,0 (11; 3) |
| z 0,75 | 0/16 | — | 0/19 | no / sì | +2,2 | come la principale |
| z 1,5 | 0/18 | — | 0/21 | no / sì | +1,4 | +21,7 (8; 0) contro +8,0 (12; 4) |
| media a 100 per D | 3/15 | +11,2 (0/3 contro 3/15 falliti) | 1/19 | no / sì | +3,1 | come la principale |
| D dello stesso giorno (guarda avanti) | 1/14 | +26,3 | 0/19 | no / sì | +1,3 | come la principale |
| D con DX-Y.NYB | 4/13 | +7,3 (0/4 contro 4/13) | 0/16 | no / sì | +4,4 | come la principale |
| F′ = cambio sotto la media a 50 | 0/21 | — | 1/22 | no / sì | +1,8 | +35,1 (9; 0) contro +10,1 (15; 4) |
| cambi FRED H.10 (pubblicati) | 0/15 | — | 0/22 | no / sì | +2,5 | +21,3 (15; 2) contro +18,1 (10; 3) |

Nessuna variante supera i criteri di H1, H2 o H3. Le due varianti di D che danno qualche trigger con il punteggio
pieno (media a 100 e DX-Y.NYB) ne danno 3-4: troppo pochi, e il criterio delle 2 crisi non è soddisfatto.

## Esplorazione dopo i risultati (non è un criterio deciso prima)

F da solo al momento del trigger, sui cinque indici con il cambio:

| | n | Mediana 126, locale | in dollari | Falliti |
|---|---:|---:|---:|---:|
| F acceso al trigger | 10 | +21,7% | +23,1% | 0/10 |
| F spento al trigger | 10 | +8,0% | +8,2% | 4/10 |

Per crisi, nell'ordine F acceso contro F spento:
- 2018: +21,3 contro +17,0;
- 2020: +29,2 contro +25,4;
- 2022: +10,0 contro +1,6;
- 2015-16: +4,7 contro +3,9.

La direzione è la stessa in 4 crisi su 4, ma lo scarto supera i 5 punti solo nel 2022. Il risultato è anche fragile:
- con i cambi FRED invece di Yahoo lo scarto scende a +3,2;
- con la variazione a 126 sedute diventa −4,0;
- all'ingresso in zona blu F acceso va peggio (+3,9% su 4 contro +22,3% su 13).

Il motivo: F cambia stato spesso vicino alle soglie. Sui 20 trigger in cui F esiste con tutte e due le fonti, Yahoo e
FRED danno un F diverso in 7 casi; in altri 5 F c'è solo con FRED, per il buco di Yahoo del 2008 (`Fyahoo_fred` in
`risultati.json`).

## Episodi persi e contrari

- **Contrari** (punteggio pieno, poi fallito o negativo a 126 sedute): nessuno, perché il punteggio pieno non c'è mai.
- **Persi ai trigger** (punteggio 0, ma oltre +10% a 126 sedute): 8.
  - CSI300 21/09/2018 (+17,0%, fallito);
  - IBOV 29/08/2011 (+19,2%) e 05/05/2020 (+23,7%);
  - KOSPI200 28/10/2022 (+10,1%);
  - TWN 07/04/2020 (+27,1%);
  - HSI 06/04/2009 (+44,0%) e 22/02/2016 (+18,0%);
  - EEM 17/02/2016 (+23,3%).
- **Persi all'ingresso in zona blu**: 13 su 19 ingressi con punteggio 0 (l'elenco è in `risultati.json`, `episodiH2`).
  Tra questi ci sono IBOV 21/01/2016 (+49,3%) e 17/03/2020 (+49,6%), TWN 18/03/2020 (+48,3%) e 08/04/2025 (+55,6%).

Un filtro «punteggio pieno» avrebbe tolto tutti i bottom migliori.

## Limiti

- Pochi episodi indipendenti: 7 crisi, e i trigger della stessa crisi sono correlati. Le percentuali sono indicative.
- La breadth degli emergenti usa i membri di oggi (approssimazione dichiarata dall'app). L'HSI di oggi è un indice
  diverso da quello del 2008.
- I cambi Yahoo sono sporchi. Dopo la pulizia, lo scarto mediano da FRED H.10 è dello 0,12-0,36%, ma TWD differisce
  di oltre il 3% in 194 date (143 nel 2004, le altre sparse tra il 2011 e il 2016). Il buco di agosto 2008 toglie F ai
  trigger del 2009. F dipende dalla fonte: sui 20 trigger con tutte e due le fonti, Yahoo e FRED danno un F diverso in 7 casi.
- La chiusura Yahoo dei cambi è a mezzanotte di Londra, non all'ora di chiusura della borsa. Il rendimento parte dalla
  seduta dopo il segnale, quindi non c'è uno sguardo al futuro, ma l'allineamento è approssimato.
- D (FRED) esce con circa una settimana di ritardo. Il caso principale lo rispetta; con il dato dello stesso giorno i
  numeri cambiano poco.
- CSI300 usa come prezzo l'ETF 510300, da maggio 2012.
- Nessun costo e nessuna tassa. I rendimenti in dollari dipendono dal cambio dello stesso giorno: se manca, il
  rendimento è «—».

## Verdetti

| Ipotesi | Verdetto | Perché |
|---|---|---|
| H1, trigger con punteggio pieno | **scartare** | 0 trigger su 31 con il punteggio pieno; D non è mai acceso ai bottom |
| H2, ingresso in zona blu | **scartare** | 0 su 27 con il punteggio pieno; il parziale va peggio dello zero (4 casi) |
| H3, punteggio su tutte le sedute | **scartare** | monotono solo dal 2016; pieno − base = +2,0 punti contro i 5 richiesti; con D acceso HSI ed EEM vanno peggio della base |
| H4, valute libere contro gestite | **scartare** | su tutte le sedute vale il contrario; sui segnali le celle hanno da 2 a 9 casi |
| H5, anticipo di F sul minimo | **procedere con modifiche** | F si accende in mediana 4 sedute dopo il minimo, prima del trigger (12,5), ma ha molti falsi stop nei sei mesi prima |

## Raccomandazione per la vista «Emergenti»

**Solo contesto, nessuna regola.** Niente punteggio macro, niente cambi alla macchina a stati, niente alert.

1. **Mostrare lo stato della valuta locale contro il dollaro** per ogni indice che ne ha una (non HSI ed EEM):
   - variazione a 13 settimane in unità di volatilità (z);
   - «in calo forte» quando z ≥ 1;
   - «ha smesso di scendere» quando F è acceso;
   - «—» se il dato manca.

   Va accompagnato da una nota: nel campione, vicino ai minimi principali F si è acceso in genere pochi giorni dopo il
   minimo, ma si era acceso anche prima, nei rimbalzi falliti. Quindi non va letto come un segnale.
2. **Mostrare il dollaro contro gli emergenti** (DTWEXEMEGS, con la data dell'ultimo valore pubblicato) come sfondo
   generale. La nota deve dire che nelle crisi del campione il dollaro è diventato favorevole solo mesi dopo il minimo:
   è una conferma tardiva.
3. Se si vuole citare l'esplorazione «trigger con la valuta già ferma» (+21,7% contro +8,0%, 0 falliti su 10 contro 4
   su 10), va detto che è stata trovata dopo i risultati, che si basa su 10 casi per parte e che con i cambi FRED lo
   scarto scende a 3 punti. Meglio non metterla nell'app finché non ci sono nuovi episodi fuori campione.
4. I numeri nei testi vanno presi da `risultati.json` e citati con lo script, come chiede `CLAUDE.md`.
