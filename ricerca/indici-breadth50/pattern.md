# Breadth a 50 sedute come allerta sugli indici: c'è un pattern?

Fase di ricerca: non modifica l'app. Script: `ricerca/indici-breadth50/script/pattern.mjs` (in testa metodo, regole, criteri e uso); risultati: `ricerca/indici-breadth50/pattern.json`. Dati al 30/10/2026. Tutti i numeri di questa nota sono stampati dallo script (`node ricerca/indici-breadth50/script/pattern.mjs --md`).

## Verdetto in breve

**Non c'è un pattern della breadth a 50 sedute che regga il criterio fissato prima.** Nessuna delle cinque regole (R1–R5) è utile, né sugli indici né sui settori; nessuna supera il criterio nel periodo di calibrazione 2001–2013, e nel periodo di verifica 2014–oggi la migliore (R1) arriva a +2,0 punti di mediana a 63 sedute ma solo a +7,7 punti di quota positivi, e vale in 6 indici su 22. Il segnale non porta più vicino al minimo locale di una seduta qualsiasi (R1: 34,6% e 39% contro 38,2% e 43,6% della base). Nei mercati orso la regola scatta presto e più volte: nella finestra del 2008 R1 ha dato 47 segnali, 45 seguiti da un calo ulteriore oltre il 3%, con un calo ulteriore mediano del 40,7%.

| Regola | Indici: verdetto | Settori: verdetto |
|---|---|---|
| R1 tocco della 50 | non utile | non utile |
| R2 correzione in mercato sano | non utile | non utile |
| R3 sopra la 200 del prezzo | non utile | non utile |
| R4 ripartenza | non utile | non utile |
| R5 doppio estremo | non utile | non utile |
| R0 trigger (regola attuale, confronto) | non utile | non utile |
| R0z ingresso in zona blu (confronto) | incerto | non utile |

**Raccomandazione:** non aggiungere un'allerta o uno stato basato sulla breadth a 50 sedute per gli indici. L'impressione che la 50 «segnali i minimi locali» viene dai rimbalzi a V del 2015-16, 2018 e 2025, ma nella storia completa un tocco del 5° percentile capita anche nelle prime fasi dei cali grandi (2007-08, 2020, 2022): nel 2001–2013 non dà rendimenti diversi da una seduta qualsiasi e nel 2014–oggi poco migliori. Non conviene cercare varianti delle regole su questi stessi dati: sarebbe adattare la regola alla storia. Se Igor vuole comunque mostrare la breadth a 50 come informazione (per esempio «breadth a 50 al suo 5° percentile: correzione estrema per questo indice»), va presentata come descrizione dello stato, senza promettere un rimbalzo, e con i numeri dei mercati orso accanto; è una scelta da discutere prima, perché cambia le regole dell'app.

## Domanda e criterio (fissati prima)

Sugli indici maggiori il livello blu (breadth a 200 sedute) si tocca solo nelle grandi crisi; i minimi locali sembrano segnalati dalla breadth a 50 sedute. La domanda: dopo un estremo della breadth a 50, l'indice fa meglio di una seduta qualsiasi?

- **Periodi**: la breadth è valutabile solo dopo 500 sedute, quindi la calibrazione comincia nel 2002 (Dow Jones e S&P/TSX 60), a fine 2002 per gli indici europei e più tardi per gli altri; Russell 2000 e CSI 300 sono solo nella verifica.
- **Percentili** per indice con la sola storia fino a quel giorno (finestra crescente, valore in posizione floor(q·(N−1)) come `approachLevel`), usati solo con almeno 500 sedute di breadth prima.
- **Segnale**: prima seduta con la condizione vera dopo almeno 20 sedute valutabili con la condizione falsa.
- **Regole**: R1 pct50 ≤ 5° percentile; R2 R1 e pct200 > livello blu + 10; R3 R1 e chiusura sopra la media a 200 sedute; R4 entro 10 sedute da un giorno di R1, pct50 sale di almeno 30 punti sopra il minimo di quei giorni; R5 pct20 ≤ 5° percentile e pct50 ≤ 10° percentile. Confronto: R0 trigger della macchina a stati (eventi `trig` di `runMachine`) e R0z ingresso in zona blu, tenuti solo nelle stesse sedute valutabili.
- **Misure** dalla chiusura del giorno del segnale (si conosce a mercato chiuso): rendimento a 21 e 63 sedute, quota positivi, calo massimo nelle 21 e 63 sedute dopo, «vicino al minimo locale» (minimo delle 63 sedute dopo non oltre il 3% sotto la chiusura del segnale). **Base**: tutte le sedute valutabili dello stesso indice nello stesso periodo.
- **Criterio**: mediana a 63 ≥ base + 2 punti e quota positivi a 63 ≥ base + 10 punti, sia in calibrazione (2001–2013) sia in verifica (2014–oggi) (C1, C2), e nella verifica in almeno il 60% degli indici con almeno 5 segnali (C3). Versione per episodi globali: segnali di indici diversi entro 10 giorni feriali l'uno dall'altro sono un episodio (a catena), con la mediana dei suoi segnali. Verdetto: «utile» se C1, C2, C3 valgono sui segnali e C1, C2 sugli episodi; «non utile» se C1 o C2 falliscono sia sui segnali sia sugli episodi, oppure C3 è valutabile (almeno 3 indici con 5 segnali) e fallisce; altrimenti «incerto».

Le regole, i parametri, i periodi, le finestre delle crisi e dei mercati orso e la scelta della regola migliore per la sensibilità sono scritti in testa allo script e non sono stati cambiati dopo i risultati. Correzioni fatte durante il lavoro, nessuna delle quali cambia una regola: le finestre delle crisi in ordine di data (in JavaScript le chiavi come «2008» finivano prima di «2001-02»); per i settori le sedute senza prezzo dell'ETF (XLC, XLRE prima della quotazione) non sono valutabili; il criterio usa i valori non arrotondati (nessun verdetto cambiato).

## Indici: base

Prima seduta valutabile (500 sedute di breadth prima): SPX 2006-12-27 · NDX 2009-12-24 · DJI 2002-01-02 · N225 2003-01-17 · SXXP 2007-12-20 · UKX 2002-12-23 · DAX 2002-12-18 · CAC 2002-12-18 · SMI 2002-12-27 · RUT 2019-08-29 · TSX60 2002-01-28 · SX5E 2009-04-03 · FTSEMIB 2007-03-13 · IBEX 2009-02-20 · HSI 2010-09-07 · CSI300 2014-06-26 · KOSPI200 2008-12-12 · TWN 2005-01-04 · NIFTY50 2009-10-22 · ASX200 2010-04-21 · EEM 2013-02-26 · IBOV 2010-11-16

| Periodo | Sedute | Mediana 21 | Positivi 21 | Mediana 63 | Positivi 63 | Calo max 21 | Calo max 63 | Vicino al minimo |
|---|---|---|---|---|---|---|---|---|
| 2001–2013 | 35576 | 1,1 | 59,3% | 2,5 | 62,6% | -2,3 | -4,4 | 38,2% |
| 2014–oggi | 69026 | 0,9 | 59% | 2,4 | 63,4% | -2 | -3,7 | 43,6% |

## Indici: tabella principale

Segnali di tutti gli indici insieme; tra parentesi lo scarto dalla base dello stesso periodo. «In allarme»: quota di sedute valutabili con la condizione vera (per R0 e R0z: in stato Trigger o Zona blu).

| Regola | Segnali | Episodi | In allarme | Periodo | Segnali (con 63) | Mediana 21 | Positivi 21 | Mediana 63 | Positivi 63 | Calo max 21 | Calo max 63 | Vicino al minimo | Criterio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R0 trigger | 125 | 31 | 2,3% | 2001–13 | 64 (64) | 0,9 | 56,3% | 1,1 (−1,4) | 34/64 = 53,1% (−9,5) | -3,5 | -7,3 | 23,4% | no |
|  |  |  |  | 2014– | 61 (61) | 4 | 73,8% | 8,3 (+5,9) | 48/61 = 78,7% (+15,3) | -1,3 | -3,4 | 49,2% | sì |
| R0z zona blu | 86 | 31 | 3,6% | 2001–13 | 35 (35) | 2,7 | 65,7% | 4,5 (+2) | 24/35 = 68,6% (+6) | -3,7 | -6,6 | 20% | no |
|  |  |  |  | 2014– | 51 (50) | 7,8 | 84% | 15,1 (+12,7) | 49/50 = 98% (+34,6) | -4 | -5,3 | 42% | sì |
| R1 tocco della 50 | 439 | 105 | 3,9% | 2001–13 | 156 (156) | 1,6 | 59% | 2,9 (+0,4) | 97/156 = 62,2% (−0,4) | -3,6 | -5,9 | 34,6% | no |
|  |  |  |  | 2014– | 283 (277) | 2,4 | 67,7% | 4,4 (+2) | 197/277 = 71,1% (+7,7) | -2,5 | -4,5 | 39% | no |
| R2 correzione in mercato sano | 318 | 90 | 1,4% | 2001–13 | 102 (102) | 1,5 | 60,8% | 2,1 (−0,4) | 64/102 = 62,7% (+0,1) | -3,2 | -5 | 36,3% | no |
|  |  |  |  | 2014– | 216 (212) | 2,3 | 67,3% | 3,8 (+1,4) | 146/212 = 68,9% (+5,5) | -2,5 | -4,6 | 36,8% | no |
| R3 sopra la 200 del prezzo | 78 | 49 | 0,3% | 2001–13 | 33 (33) | 2,9 | 60,6% | 3,8 (+1,3) | 24/33 = 72,7% (+10,1) | -2,2 | -4,9 | 42,4% | no |
|  |  |  |  | 2014– | 45 (44) | 2,5 | 68,9% | 0,7 (−1,7) | 23/44 = 52,3% (−11,1) | -2,6 | -4,6 | 31,8% | no |
| R4 ripartenza | 286 | 87 | 1,2% | 2001–13 | 114 (114) | 1,3 | 57,9% | 1,2 (−1,3) | 68/114 = 59,6% (−3) | -3,1 | -6 | 28,1% | no |
|  |  |  |  | 2014– | 172 (169) | 2,6 | 76,5% | 3,4 (+1) | 110/169 = 65,1% (+1,7) | -1,3 | -4,1 | 40,2% | no |
| R5 doppio estremo | 614 | 124 | 3,4% | 2001–13 | 225 (225) | 2,5 | 64,4% | 3,9 (+1,4) | 147/225 = 65,3% (+2,7) | -2,6 | -4,7 | 42,7% | no |
|  |  |  |  | 2014– | 389 (384) | 1,9 | 63,5% | 4,1 (+1,7) | 262/384 = 68,2% (+4,8) | -2,6 | -4,6 | 42,4% | no |

## Indici: episodi globali

Molti segnali cadono negli stessi giorni (per esempio R1: 439 segnali in 105 episodi). Per episodio la mediana dei suoi segnali.

| Regola | Periodo | Episodi (con 63) | Mediana 63 | Positivi 63 | Calo max 63 | Vicino al minimo | Criterio |
|---|---|---|---|---|---|---|---|
| R0 trigger | 2001–13 | 13 (13) | 1,1 (−1,4) | 7/13 = 53,8% (−8,8) | -6,6 | 30,8% | no |
|  | 2014– | 18 (18) | 3,9 (+1,5) | 12/18 = 66,7% (+3,3) | -4,9 | 33,3% | no |
| R0z zona blu | 2001–13 | 13 (13) | 5,8 (+3,3) | 10/13 = 76,9% (+14,3) | -5,8 | 23,1% | sì |
|  | 2014– | 18 (17) | 13 (+10,6) | 16/17 = 94,1% (+30,7) | -1,2 | 64,7% | sì |
| R1 tocco della 50 | 2001–13 | 39 (39) | 6,4 (+3,9) | 29/39 = 74,4% (+11,8) | -3,5 | 46,2% | sì |
|  | 2014– | 66 (63) | 4,9 (+2,5) | 46/63 = 73% (+9,6) | -3,6 | 39,7% | no |
| R2 correzione in mercato sano | 2001–13 | 31 (31) | 3,1 (+0,6) | 21/31 = 67,7% (+5,1) | -3,5 | 45,2% | no |
|  | 2014– | 59 (56) | 5 (+2,6) | 43/56 = 76,8% (+13,4) | -3,5 | 44,6% | sì |
| R3 sopra la 200 del prezzo | 2001–13 | 21 (21) | 3,1 (+0,6) | 14/21 = 66,7% (+4,1) | -4,8 | 42,9% | no |
|  | 2014– | 28 (27) | 4,2 (+1,8) | 16/27 = 59,3% (−4,1) | -4,3 | 37% | no |
| R4 ripartenza | 2001–13 | 36 (36) | 0,4 (−2,1) | 19/36 = 52,8% (−9,8) | -5,8 | 27,8% | no |
|  | 2014– | 51 (48) | 2,8 (+0,4) | 30/48 = 62,5% (−0,9) | -4,6 | 37,5% | no |
| R5 doppio estremo | 2001–13 | 49 (49) | 4,9 (+2,4) | 33/49 = 67,3% (+4,7) | -4,4 | 42,9% | no |
|  | 2014– | 75 (73) | 4,5 (+2,1) | 50/73 = 68,5% (+5,1) | -3,8 | 45,2% | no |

## Indici: verdetti

| Regola | C1 calibrazione | C2 verifica | C3 per indice (verifica) | Episodi C1/C2 | Verdetto |
|---|---|---|---|---|---|
| R0 trigger | no | sì | 2 su 4 (50%): no | no/no | non utile |
| R0z zona blu | no | sì | 1 su 1 (100%): n.v. | sì/sì | incerto |
| R1 tocco della 50 | no | no | 6 su 22 (27,3%): no | sì/no | non utile |
| R2 correzione in mercato sano | no | no | 6 su 21 (28,6%): no | no/sì | non utile |
| R3 sopra la 200 del prezzo | no | no | 0 su 2 (0%): n.v. | no/no | non utile |
| R4 ripartenza | no | no | 4 su 18 (22,2%): no | no/no | non utile |
| R5 doppio estremo | no | no | 3 su 22 (13,6%): no | no/no | non utile |

Lettura:

- **R1** è la regola che si avvicina di più all'idea, ma nel 2001–2013 è uguale alla base (+0,4 punti di mediana, −0,4 di positivi) e nel 2014–oggi arriva a +2,0 e +7,7: sotto la soglia dei positivi. Per indice vale solo in 6 su 22 (SPX, DJI, N225, SXXP, UKX, HSI). Sugli episodi passa in calibrazione (+3,9 e +11,8, 39 episodi) e non in verifica (+2,5 e +9,6): i segnali del 2008, tanti e negativi, pesano nella versione per segnale e poco in quella per episodio. Il risultato quindi dipende da come si contano le crisi: non è un pattern stabile.
- **R2** (correzione con la 200 ancora alta) e **R3** (sopra la media a 200 del prezzo) non migliorano R1: R3 è quasi rara (78 segnali, 0,3% delle sedute) e nel 2014–oggi va sotto la base (−1,7 e −11,1).
- **R4** (ripartenza) è sotto la base nel 2001–2013 (−1,3 e −3,0) e quasi uguale nel 2014–oggi.
- **R5** (doppio estremo) è la «regola migliore» secondo la scelta fissata prima (scarto minimo dei due periodi +1,4), ma resta sotto le soglie in tutti e due i periodi e vale in 3 indici su 22.
- **Vicino al minimo locale**: nessuna regola della 50 porta più vicino al minimo delle 63 sedute successive di una seduta qualsiasi; il calo massimo mediano a 63 sedute dopo il segnale è più profondo della base (R1 −5,9 contro −4,4 nel 2001–2013, −4,5 contro −3,7 nel 2014–oggi). La breadth a 50 bassa indica una fase volatile, non un minimo.
- **R0 / R0z** (macchina attuale, per confronto): nel 2014–oggi molto sopra la base (zona blu +12,7 e +34,6 sui segnali), nel 2001–2013 no (trigger −1,4 e −9,5; zona blu +2,0 e +6,0). R0z sugli episodi passa in tutti e due i periodi (13 e 18 episodi), ma i segnali per indice sono troppo pochi per C3 (1 indice con 5 segnali): «incerto». Non è una nuova regola: è il comportamento dell'app di oggi, e conferma che i segnali sulla 200 sono rari e concentrati nelle crisi grandi.

## Indici: per indice (verifica 2014–oggi, in breve)

Per ogni regola: segnali con l'esito a 63 sedute, mediana a 63 / quota positivi; ✓ = la condizione vale contro la base dell'indice, ✗ = non vale (solo con almeno 5 segnali). RUT e CSI300 non hanno sedute nel periodo di calibrazione.

| Indice | Base med63 / pos | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|---|
| SPX | 3,8 / 75,9% | 12: 6,7 / 91,7% ✓ | 10: 7 / 90% ✓ | 5: 5,5 / 60% ✗ | 10: 5,3 / 70% ✗ | 16: 6,3 / 81,3% ✗ |
| NDX | 5 / 75,8% | 12: 10,2 / 75% ✗ | 7: 11,6 / 85,7% ✗ | 5: 11,6 / 80% ✗ | 11: 4,9 / 72,7% ✗ | 18: 10,5 / 83,3% ✗ |
| DJI | 3 / 71,9% | 13: 7,3 / 84,6% ✓ | 11: 3,8 / 81,8% ✗ | 3: 3,7 / 100% | 12: 5,7 / 83,3% ✓ | 20: 5,4 / 85% ✓ |
| N225 | 2,9 / 62,7% | 13: 6,7 / 84,6% ✓ | 11: 5,9 / 81,8% ✓ | 2: 7,2 / 100% | 8: 1,6 / 50% ✗ | 20: 5,8 / 70% ✗ |
| SXXP | 1,7 / 62,7% | 10: 7,3 / 80% ✓ | 7: 3,9 / 71,4% ✗ | — | 6: 9,1 / 66,7% ✗ | 19: 5,3 / 78,9% ✓ |
| UKX | 1,5 / 63,3% | 13: 6,8 / 76,9% ✓ | 12: 4,1 / 75% ✓ | — | 11: 2,6 / 63,6% ✗ | 19: 3,3 / 84,2% ✗ |
| DAX | 2,6 / 65,6% | 12: 9,2 / 75% ✗ | 9: 4,4 / 66,7% ✗ | 1: -8,8 / 0% | 7: 2,3 / 71,4% ✗ | 16: 6,3 / 68,8% ✗ |
| CAC | 1,8 / 59,5% | 16: 4,8 / 68,8% ✗ | 13: 2,2 / 61,5% ✗ | 1: -4,5 / 0% | 14: 0,7 / 57,1% ✗ | 19: 3,2 / 52,6% ✗ |
| SMI | 1,5 / 61,2% | 21: 2,8 / 76,2% ✗ | 19: 3,1 / 78,9% ✗ | 2: 3,7 / 50% | 16: 1,7 / 56,3% ✗ | 22: 2,8 / 72,7% ✗ |
| RUT | 3,3 / 61,6% | 7: 6,2 / 71,4% ✗ | 3: 6,2 / 66,7% | — | 3: 9,5 / 100% | 12: 4,8 / 66,7% ✗ |
| TSX60 | 2,9 / 68,5% | 16: 2,9 / 75% ✗ | 12: 2,3 / 66,7% ✗ | 2: -3,5 / 50% | 7: 8,6 / 85,7% ✓ | 20: 2,4 / 70% ✗ |
| SX5E | 1,8 / 60,4% | 13: 5,7 / 53,8% ✗ | 9: -1,1 / 33,3% ✗ | 1: -6,3 / 0% | 10: 4,7 / 60% ✗ | 17: 5,7 / 76,5% ✓ |
| FTSEMIB | 3,2 / 64,9% | 10: -3,1 / 30% ✗ | 9: -2,8 / 33,3% ✗ | 3: -4,1 / 0% | 7: -5,7 / 42,9% ✗ | 14: -1,8 / 42,9% ✗ |
| IBEX | 1,5 / 57,7% | 9: 0,8 / 77,8% ✗ | 6: 0,7 / 66,7% ✗ | 2: -5,6 / 0% | 6: -3,4 / 16,7% ✗ | 10: 1,4 / 70% ✗ |
| HSI | 0,3 / 50,7% | 12: 7,2 / 83,3% ✓ | 7: 2,8 / 85,7% ✓ | 1: -20,8 / 0% | 5: 2,2 / 60% ✗ | 21: 1,5 / 57,1% ✗ |
| CSI300 | 0,8 / 54% | 11: 1,3 / 63,6% ✗ | 5: 9,5 / 80% ✓ | 3: 1,3 / 66,7% | 4: 1,4 / 50% | 17: -0,5 / 47,1% ✗ |
| KOSPI200 | 1,4 / 58,1% | 17: -0,5 / 47,1% ✗ | 10: 1,6 / 50% ✗ | 3: -6,5 / 0% | 5: 5,9 / 80% ✓ | 22: 1,8 / 59,1% ✗ |
| TWN | 3,5 / 69,9% | 8: 7,8 / 75% ✗ | 5: 6 / 80% ✓ | 2: 13,8 / 100% | 7: 5,7 / 85,7% ✓ | 14: 7,7 / 64,3% ✗ |
| NIFTY50 | 3,7 / 67,3% | 13: 4,2 / 84,6% ✗ | 13: 4,2 / 84,6% ✗ | 3: 0,9 / 66,7% | 5: 4 / 80% ✗ | 15: 4,4 / 66,7% ✗ |
| ASX200 | 1,4 / 61,7% | 10: 4,7 / 70% ✗ | 10: 4,7 / 70% ✗ | — | 4: 5,5 / 75% | 13: 2,4 / 69,2% ✗ |
| EEM | 2 / 58,5% | 12: 4,4 / 58,3% ✗ | 10: 2,5 / 50% ✗ | 1: 17,2 / 100% | 1: -10,8 / 0% | 16: 4,4 / 62,5% ✗ |
| IBOV | 3,7 / 62,1% | 17: 3,4 / 64,7% ✗ | 14: 3,3 / 57,1% ✗ | 4: 4,9 / 50% | 10: 7,4 / 70% ✗ | 24: 6,3 / 66,7% ✗ |

## Indici: per crisi

Per ogni regola: segnali (indici, episodi): mediana a 63 sedute, positivi a 63, calo massimo mediano a 63, segnali vicini al minimo locale. Finestre: 2008 = 01/10/2007–31/03/2009, 2011 = luglio–dicembre, 2015-16 = 01/08/2015–31/03/2016, 2018 = 26/01–31/12, 2020 = 15/02–30/04, 2022 = gennaio–ottobre, 2025 = 15/02–31/05.

| Crisi | R0 | R0z | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|---|---|
| 2008 | 24 (10 ind., 5 ep.): -7,6, 5/24, -10,1, 3/24 | 16 (11 ind., 5 ep.): -1,4, 7/16, -8,3, 1/16 | 47 (11 ind., 7 ep.): -5,8, 15/47, -11,8, 6/47 | 14 (8 ind., 4 ep.): -3,9, 1/14, -11,6, 0/14 | 2 (1 ind., 2 ep.): -9,4, 0/2, -14, 0/2 | 36 (11 ind., 9 ep.): -1,5, 16/36, -10,7, 6/36 | 56 (11 ind., 8 ep.): -5,2, 18/56, -12,2, 7/56 |
| 2011 | 20 (14 ind., 3 ep.): 0, 10/20, -8, 2/20 | 14 (14 ind., 3 ep.): 7,5, 13/14, -5,7, 4/14 | 21 (16 ind., 3 ep.): 3,4, 13/21, -8, 7/21 | 9 (9 ind., 1 ep.): -3,4, 3/9, -11,6, 0/9 | 0 | 17 (14 ind., 2 ep.): 2,5, 13/17, -6,8, 3/17 | 34 (18 ind., 4 ep.): 3,8, 22/34, -4,7, 15/34 |
| 2015-16 | 12 (10 ind., 5 ep.): 3,8, 7/12, -4,3, 3/12 | 11 (10 ind., 4 ep.): 13,6, 11/11, -0,6, 8/11 | 37 (20 ind., 5 ep.): 5,7, 33/37, -5,3, 13/37 | 24 (14 ind., 4 ep.): 4,9, 21/24, -5,9, 8/24 | 0 | 28 (18 ind., 4 ep.): -0,5, 13/28, -5,9, 6/28 | 38 (21 ind., 3 ep.): 4,4, 26/38, -6,5, 5/38 |
| 2018 | 4 (3 ind., 3 ep.): 4,1, 3/4, -7,9, 0/4 | 5 (5 ind., 3 ep.): 5,8, 4/5, -5,5, 1/5 | 48 (21 ind., 6 ep.): 3, 30/48, -4,6, 15/48 | 36 (19 ind., 6 ep.): 1,1, 19/36, -5, 9/36 | 10 (5 ind., 3 ep.): 2,9, 7/10, -2,8, 5/10 | 16 (11 ind., 6 ep.): 1,5, 9/16, -5,5, 3/16 | 60 (21 ind., 7 ep.): 2,9, 39/60, -4,5, 25/60 |
| 2020 | 19 (19 ind., 1 ep.): 12,3, 19/19, -3,4, 9/19 | 20 (20 ind., 1 ep.): 21,2, 20/20, -7,9, 3/20 | 21 (21 ind., 1 ep.): -1,4, 10/21, -25,6, 1/21 | 21 (21 ind., 1 ep.): -1,8, 10/21, -25,6, 1/21 | 2 (2 ind., 1 ep.): 5,3, 1/2, -22,3, 0/2 | 9 (9 ind., 1 ep.): 12,2, 9/9, -3,6, 3/9 | 20 (20 ind., 1 ep.): -7,7, 4/20, -28,9, 0/20 |
| 2022 | 13 (8 ind., 5 ep.): -0,3, 6/13, -9,1, 5/13 | 10 (10 ind., 6 ep.): 11,3, 10/10, -0,6, 6/10 | 50 (20 ind., 6 ep.): 3,8, 36/50, -4,2, 18/50 | 23 (14 ind., 6 ep.): 3,1, 16/23, -5, 7/23 | 0 | 25 (13 ind., 5 ep.): 0,6, 13/25, -5, 9/25 | 67 (22 ind., 7 ep.): 2,8, 45/67, -5,6, 19/67 |
| 2025 | 2 (2 ind., 1 ep.): 15,5, 2/2, 0, 2/2 | 2 (2 ind., 1 ep.): 22,8, 2/2, -4,3, 1/2 | 16 (16 ind., 2 ep.): 16,6, 16/16, -1,4, 13/16 | 15 (15 ind., 2 ep.): 16,4, 15/15, -1,5, 10/15 | 0 | 11 (11 ind., 1 ep.): 9,5, 10/11, 0, 11/11 | 20 (20 ind., 2 ep.): 15,3, 20/20, -1,8, 13/20 |

Le correzioni brevi (2015-16, 2025) sono quelle in cui la 50 al 5° percentile ha funzionato; nel 2008 e nel 2020 i segnali sono arrivati in anticipo (2020: 21 segnali su 21 indici, mediana a 63 sedute −1,4%, calo massimo mediano −25,6%, 1 su 21 vicino al minimo).

## Indici: mercati orso

Per ogni regola: segnali nella finestra; quanti sono stati seguiti da un calo ulteriore oltre il 3% prima della fine della finestra («giù»); mediana e peggiore di quel calo ulteriore (%); mediana del rendimento a 63 sedute. Finestre: 2001-02 = 01/01/2001–31/03/2003 (solo gli indici con la breadth già valutabile: Dow Jones e S&P/TSX 60 da gennaio 2002, DAX, CAC 40, FTSE 100 e SMI da dicembre 2002, Nikkei da gennaio 2003), 2008 = 01/10/2007–31/03/2009, 2022 = gennaio–ottobre 2022.

| Orso | R0 | R0z | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|---|---|
| 2001-02 | 6; 3 giù; -7,7 / -12,2; 12,3 | 3; 2 giù; -10,7 / -15,7; 7,2 | 8; 6 giù; -10,2 / -21,7; 7 | 3; 2 giù; -21,5 / -21,7; -10,5 | 0 | 9; 6 giù; -8,2 / -16,1; 8,6 | 10; 8 giù; -8,2 / -25; 6,7 |
| 2008 | 24; 22 giù; -44 / -51; -7,6 | 16; 16 giù; -41,4 / -49,9; -1,4 | 47; 45 giù; -40,7 / -66,4; -5,8 | 14; 14 giù; -50,5 / -66,4; -3,9 | 2; 2 giù; -43,2 / -44,9; -9,3 | 36; 33 giù; -42,3 / -67,6; -1,5 | 56; 56 giù; -42,2 / -66,7; -5,1 |
| 2022 | 13; 9 giù; -12,6 / -21; -0,3 | 10; 7 giù; -8,9 / -17,6; 11,4 | 50; 40 giù; -8,7 / -24,8; 3,9 | 23; 20 giù; -8,7 / -24,8; 3,1 | 0 | 25; 14 giù; -10,6 / -16,9; 0,6 | 67; 60 giù; -8,2 / -29,3; 2,8 |

Nel 2008 tutte le regole della 50 hanno dato segnali quasi sempre seguiti da altri cali grandi (R1: 45 su 47, calo ulteriore mediano −40,7%; R5: 56 su 56, −42,2%). Anche la macchina attuale ha questo problema (R0: 22 su 24, −44%), ma con meno segnali. Nel 2022 R1 ha dato 50 segnali, 40 seguiti da un calo ulteriore oltre il 3% (mediana −8,7%, peggiore −24,8%).

## Indici: sensibilità della regola migliore (R5)

Solo come verifica di fragilità (p vale per pct20, 2p per pct50). Scarti dalla base a 63 sedute.

| p | gap | Segnali | Episodi | Cal: med63 (Δ) / pos (Δ) | Ver: med63 (Δ) / pos (Δ) | Ep. cal Δmed/Δpos | Ep. ver Δmed/Δpos | C3 | Verdetto |
|---|---|---|---|---|---|---|---|---|---|
| 3 | 10 | 466 | 108 | 2,9 (+0,4) / 60,5% (−2,1) | 4,8 (+2,4) / 72,2% (+8,8) | +2,7/+4,1 | +2/+8,5 | 7/22 | non utile |
| 3 | 20 | 426 | 100 | 2,9 (+0,4) / 61,4% (−1,2) | 4,8 (+2,4) / 73,2% (+9,8) | +1,6/+2,5 | +2/+9,3 | 7/22 | non utile |
| 3 | 40 | 367 | 90 | 2 (−0,5) / 56% (−6,6) | 4,4 (+2) / 73% (+9,6) | 0/−1,1 | +1,4/+10,1 | 7/22 | non utile |
| 5 | 10 | 681 | 131 | 4 (+1,5) / 64,4% (+1,8) | 4,3 (+1,9) / 68,2% (+4,8) | +3,2/+6,6 | +2,2/+7,7 | 4/22 | non utile |
| 5 | 20 | 614 | 124 | 3,9 (+1,4) / 65,3% (+2,7) | 4,1 (+1,7) / 68,2% (+4,8) | +2,4/+4,7 | +2,1/+5,1 | 3/22 | non utile |
| 5 | 40 | 513 | 109 | 2,6 (+0,1) / 62% (−0,6) | 4,5 (+2,1) / 68,4% (+5) | −0,2/−0,7 | +2,5/+5,8 | 5/22 | non utile |
| 10 | 10 | 1164 | 176 | 3,3 (+0,8) / 63,2% (+0,6) | 3,7 (+1,3) / 66,1% (+2,7) | +0,9/+4,1 | +1,7/+4,9 | 1/22 | non utile |
| 10 | 20 | 964 | 173 | 3 (+0,5) / 62% (−0,6) | 3,5 (+1,1) / 66,4% (+3) | +0,9/+4,1 | +1,4/+1,9 | 0/22 | non utile |
| 10 | 40 | 717 | 152 | 2,3 (−0,2) / 59,4% (−3,2) | 3,6 (+1,2) / 66,1% (+2,7) | +0,1/+0,6 | +1,3/+2,9 | 2/22 | non utile |

Nessuna delle 9 varianti supera il criterio: in calibrazione lo scarto della mediana va da −0,5 a +1,5 e quello dei positivi da −6,6 a +2,7; per indice al massimo 7 su 22. Il risultato negativo non dipende dai parametri scelti.

## Settori (verifica fuori campione, dal 2005)

Stesse regole e misure sugli 11 settori (chiusure rettificate per i dividendi degli ETF, breadth di `data/breadth.json`, livelli blu di `config/thresholds.json`). Con 500 sedute di storia la breadth è valutabile dal 2007: il periodo di calibrazione è in pratica 2007–2013.

### Base

Prima seduta valutabile: XLK 2006-12-27 · XLC 2018-06-19 · XLY 2006-12-27 · XLP 2006-12-27 · XLE 2006-12-27 · XLF 2006-12-27 · XLV 2006-12-27 · XLI 2006-12-27 · XLB 2006-12-27 · XLRE 2015-10-08 · XLU 2006-12-27

| Periodo | Sedute | Mediana 21 | Positivi 21 | Mediana 63 | Positivi 63 | Calo max 21 | Calo max 63 | Vicino al minimo |
|---|---|---|---|---|---|---|---|---|
| 2001–2013 | 15885 | 1,4 | 62,6% | 3,5 | 66,5% | -2,1 | -4 | 42% |
| 2014–oggi | 33929 | 1,2 | 61% | 3,3 | 68% | -2 | -3,6 | 44,3% |

### Tabella principale

| Regola | Segnali | Episodi | In allarme | Periodo | Segnali (con 63) | Mediana 21 | Positivi 21 | Mediana 63 | Positivi 63 | Calo max 21 | Calo max 63 | Vicino al minimo | Criterio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R0 trigger | 61 | 30 | 2,4% | 2001–13 | 25 (25) | -2,1 | 44% | 3,7 (+0,2) | 16/25 = 64% (−2,5) | -5,3 | -7,9 | 20% | no |
|  |  |  |  | 2014– | 36 (35) | 3 | 74,3% | 5,4 (+2,1) | 29/35 = 82,9% (+14,9) | -1,1 | -4,1 | 45,7% | sì |
| R0z zona blu | 49 | 21 | 4,2% | 2001–13 | 17 (17) | -1,5 | 35,3% | -1,7 (−5,2) | 8/17 = 47,1% (−19,4) | -7,3 | -15,4 | 23,5% | no |
|  |  |  |  | 2014– | 32 (31) | 6,4 | 84,4% | 12,5 (+9,2) | 29/31 = 93,5% (+25,5) | -5 | -5 | 35,5% | sì |
| R1 tocco della 50 | 262 | 82 | 5,1% | 2001–13 | 95 (95) | 2 | 61,1% | 2 (−1,5) | 59/95 = 62,1% (−4,4) | -3,6 | -5,7 | 30,5% | no |
|  |  |  |  | 2014– | 167 (160) | 2,2 | 63,5% | 6,5 (+3,2) | 121/160 = 75,6% (+7,6) | -2,6 | -4,7 | 43,8% | no |
| R2 correzione in mercato sano | 200 | 75 | 2,4% | 2001–13 | 71 (71) | 3 | 66,2% | 2 (−1,5) | 44/71 = 62% (−4,5) | -2,6 | -4,8 | 35,2% | no |
|  |  |  |  | 2014– | 129 (123) | 2,3 | 64,3% | 5,4 (+2,1) | 89/123 = 72,4% (+4,4) | -2,4 | -3,7 | 45,5% | no |
| R3 sopra la 200 del prezzo | 81 | 47 | 0,8% | 2001–13 | 33 (33) | 3,2 | 75,8% | 2,7 (−0,8) | 22/33 = 66,7% (+0,2) | -2 | -3,6 | 42,4% | no |
|  |  |  |  | 2014– | 48 (47) | 3,3 | 75% | 7,1 (+3,8) | 37/47 = 78,7% (+10,7) | -1,8 | -2,2 | 57,4% | sì |
| R4 ripartenza | 200 | 70 | 1,9% | 2001–13 | 77 (77) | 1,5 | 66,2% | 2 (−1,5) | 46/77 = 59,7% (−6,8) | -3 | -4,8 | 31,2% | no |
|  |  |  |  | 2014– | 123 (117) | 2,4 | 64,1% | 4 (+0,7) | 73/117 = 62,4% (−5,6) | -2,1 | -3,9 | 45,3% | no |
| R5 doppio estremo | 340 | 97 | 4,2% | 2001–13 | 122 (122) | 2 | 64,8% | 3,3 (−0,2) | 75/122 = 61,5% (−5) | -3,2 | -6 | 35,2% | no |
|  |  |  |  | 2014– | 218 (210) | 2,1 | 63,3% | 5,6 (+2,3) | 151/210 = 71,9% (+3,9) | -2,5 | -3,4 | 47,1% | no |

### Episodi globali

| Regola | Periodo | Episodi (con 63) | Mediana 63 | Positivi 63 | Calo max 63 | Vicino al minimo | Criterio |
|---|---|---|---|---|---|---|---|
| R0 trigger | 2001–13 | 12 (12) | 0,8 (−2,7) | 6/12 = 50% (−16,5) | -8,4 | 8,3% | no |
|  | 2014– | 18 (17) | 5,7 (+2,4) | 15/17 = 88,2% (+20,2) | -4,2 | 41,2% | sì |
| R0z zona blu | 2001–13 | 6 (6) | -3,8 (−7,3) | 3/6 = 50% (−16,5) | -16,7 | 16,7% | no |
|  | 2014– | 15 (14) | 10,1 (+6,8) | 13/14 = 92,9% (+24,9) | -4,1 | 42,9% | sì |
| R1 tocco della 50 | 2001–13 | 28 (28) | 6,4 (+2,9) | 21/28 = 75% (+8,5) | -3,7 | 46,4% | no |
|  | 2014– | 54 (53) | 6,1 (+2,8) | 41/53 = 77,4% (+9,4) | -3,1 | 49,1% | no |
| R2 correzione in mercato sano | 2001–13 | 25 (25) | 6,2 (+2,7) | 18/25 = 72% (+5,5) | -4 | 44% | no |
|  | 2014– | 50 (49) | 5,1 (+1,8) | 37/49 = 75,5% (+7,5) | -3,1 | 46,9% | no |
| R3 sopra la 200 del prezzo | 2001–13 | 17 (17) | 1,8 (−1,7) | 12/17 = 70,6% (+4,1) | -3,6 | 47,1% | no |
|  | 2014– | 30 (29) | 6,1 (+2,8) | 24/29 = 82,8% (+14,8) | -2,2 | 58,6% | sì |
| R4 ripartenza | 2001–13 | 25 (25) | 2,2 (−1,3) | 15/25 = 60% (−6,5) | -4 | 40% | no |
|  | 2014– | 45 (44) | 3,3 (0) | 26/44 = 59,1% (−8,9) | -4,1 | 45,5% | no |
| R5 doppio estremo | 2001–13 | 30 (30) | 4,7 (+1,2) | 22/30 = 73,3% (+6,8) | -3,4 | 50% | no |
|  | 2014– | 67 (65) | 6,3 (+3) | 47/65 = 72,3% (+4,3) | -2,4 | 55,4% | no |

### Verdetti

| Regola | C1 calibrazione | C2 verifica | C3 per indice (verifica) | Episodi C1/C2 | Verdetto |
|---|---|---|---|---|---|
| R0 trigger | no | sì | 1 su 2 (50%): n.v. | no/sì | non utile |
| R0z zona blu | no | sì | 0 su 0 (—): n.v. | no/sì | non utile |
| R1 tocco della 50 | no | no | 5 su 11 (45,5%): no | no/no | non utile |
| R2 correzione in mercato sano | no | no | 1 su 11 (9,1%): no | no/no | non utile |
| R3 sopra la 200 del prezzo | no | sì | 0 su 6 (0%): no | no/sì | non utile |
| R4 ripartenza | no | no | 1 su 10 (10%): no | no/no | non utile |
| R5 doppio estremo | no | no | 2 su 11 (18,2%): no | no/no | non utile |

### Per settore (verifica 2014–oggi)

| Settore | Base med63 / pos | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|---|
| XLK | 5,7 / 76,4% | 13: 12,5 / 76,9% ✗ | 8: 11,7 / 75% ✗ | 6: 11,9 / 83,3% ✗ | 12: 5,5 / 75% ✗ | 16: 7,4 / 68,8% ✗ |
| XLC | 4,3 / 66,8% | 7: -5 / 42,9% ✗ | 6: 3,4 / 50% ✗ | — | 4: -2,9 / 50% | 12: -2,5 / 41,7% ✗ |
| XLY | 3,6 / 71,3% | 13: 6,7 / 69,2% ✗ | 10: 6,2 / 70% ✗ | 1: 9,8 / 100% | 12: 3,2 / 58,3% ✗ | 20: 6,5 / 80% ✗ |
| XLP | 2,3 / 69,2% | 19: 3,5 / 78,9% ✗ | 19: 3,5 / 78,9% ✗ | 7: 2,9 / 85,7% ✗ | 12: 3,6 / 58,3% ✗ | 27: 3,4 / 74,1% ✗ |
| XLE | 1,8 / 56,2% | 19: 7,3 / 68,4% ✓ | 13: 8 / 61,5% ✗ | 5: 8 / 60% ✗ | 10: 3,7 / 50% ✗ | 22: 5,1 / 68,2% ✓ |
| XLF | 3,5 / 71,2% | 15: 7,1 / 73,3% ✗ | 13: 5,3 / 69,2% ✗ | 4: 4,2 / 75% | 10: 2,9 / 60% ✗ | 21: 4,8 / 71,4% ✗ |
| XLV | 3,1 / 69,4% | 17: 5,3 / 82,4% ✓ | 14: 5,8 / 78,6% ✗ | 8: 5,7 / 75% ✗ | 15: 2,9 / 53,3% ✗ | 25: 6,1 / 88% ✓ |
| XLI | 3,4 / 69,8% | 11: 12,2 / 81,8% ✓ | 9: 9,5 / 66,7% ✗ | 1: 15,1 / 100% | 7: 8,8 / 100% ✓ | 14: 8,9 / 78,6% ✗ |
| XLB | 2,8 / 64,7% | 18: 5,7 / 88,9% ✓ | 11: 3 / 90,9% ✗ | 6: 4,7 / 100% ✗ | 17: 2,8 / 64,7% ✗ | 19: 6,3 / 68,4% ✗ |
| XLRE | 2,2 / 63,3% | 10: 4,8 / 80% ✓ | 5: 4,6 / 80% ✓ | 1: -3,6 / 0% | 6: 8,1 / 66,7% ✗ | 14: 6,1 / 71,4% ✗ |
| XLU | 3 / 68,3% | 18: 4 / 72,2% ✗ | 15: 3,8 / 66,7% ✗ | 8: 9,4 / 75% ✗ | 12: 3 / 58,3% ✗ | 20: 3 / 65% ✗ |

### Per crisi

| Crisi | R0 | R0z | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|---|---|
| 2008 | 12 (6 ind., 7 ep.): -2, 6/12, -8,9, 1/12 | 12 (9 ind., 5 ep.): -9,3, 3/12, -29,1, 2/12 | 41 (9 ind., 7 ep.): -0,6, 18/41, -11,3, 4/41 | 22 (9 ind., 4 ep.): -7, 7/22, -11,1, 2/22 | 7 (5 ind., 3 ep.): -2,6, 2/7, -9,1, 0/7 | 35 (9 ind., 9 ep.): -8,5, 13/35, -14,3, 6/35 | 47 (9 ind., 8 ep.): -1,6, 20/47, -10, 7/47 |
| 2011 | 7 (5 ind., 3 ep.): 1,1, 4/7, -10,5, 0/7 | 5 (5 ind., 1 ep.): 6,5, 5/5, -3,3, 2/5 | 11 (9 ind., 3 ep.): 5,2, 8/11, -8, 1/11 | 7 (6 ind., 3 ep.): 6,4, 5/7, -6,7, 0/7 | 2 (2 ind., 1 ep.): 0,7, 1/2, -9, 0/2 | 10 (9 ind., 3 ep.): 7,5, 10/10, -2,9, 5/10 | 18 (9 ind., 3 ep.): 11,4, 14/18, -5,1, 7/18 |
| 2015-16 | 5 (4 ind., 4 ep.): 4,6, 4/5, -1,3, 3/5 | 4 (3 ind., 3 ep.): 14, 4/4, -4,7, 1/4 | 16 (8 ind., 4 ep.): 9,5, 14/16, -4,9, 7/16 | 9 (7 ind., 3 ep.): 7,3, 7/9, -4,4, 3/9 | 0 | 12 (8 ind., 6 ep.): 4,9, 8/12, -4,4, 4/12 | 17 (8 ind., 5 ep.): 7,1, 15/17, -6,9, 5/17 |
| 2018 | 0 | 5 (5 ind., 1 ep.): 12,5, 5/5, -3,4, 2/5 | 28 (11 ind., 5 ep.): 5,4, 20/28, -5,9, 10/28 | 22 (11 ind., 5 ep.): 3,7, 14/22, -5,6, 10/22 | 5 (5 ind., 4 ep.): 1,4, 3/5, -2,6, 3/5 | 11 (8 ind., 3 ep.): -0,6, 3/11, -11,1, 1/11 | 33 (11 ind., 5 ep.): 3,9, 21/33, -7, 12/33 |
| 2020 | 8 (8 ind., 1 ep.): 8,4, 7/8, -6, 3/8 | 10 (10 ind., 1 ep.): 23,7, 9/10, -7,6, 1/10 | 11 (11 ind., 1 ep.): 5,9, 7/11, -25, 0/11 | 9 (9 ind., 1 ep.): 0,6, 5/9, -25, 0/9 | 2 (2 ind., 1 ep.): 10, 2/2, -20, 0/2 | 9 (6 ind., 2 ep.): 6, 6/9, -5,4, 4/9 | 11 (11 ind., 1 ep.): -2,4, 5/11, -28,6, 0/11 |
| 2022 | 6 (4 ind., 3 ep.): -2,1, 2/6, -12,7, 0/6 | 5 (5 ind., 3 ep.): 8,7, 5/5, -5,8, 2/5 | 26 (11 ind., 5 ep.): 3,1, 16/26, -8,1, 5/26 | 16 (9 ind., 5 ep.): 3,6, 10/16, -7,3, 2/16 | 2 (2 ind., 1 ep.): 9,2, 2/2, -8,1, 0/2 | 24 (11 ind., 7 ep.): -0,2, 11/24, -9,9, 5/24 | 33 (11 ind., 5 ep.): 1,3, 17/33, -8, 5/33 |
| 2025 | 1 (1 ind., 1 ep.): 5,1, 1/1, -0,8, 1/1 | 1 (1 ind., 1 ep.): 4,7, 1/1, -12,1, 0/1 | 8 (8 ind., 2 ep.): 15,9, 8/8, -2,9, 5/8 | 5 (5 ind., 2 ep.): 18,5, 5/5, -1,3, 4/5 | 0 | 3 (3 ind., 1 ep.): 11,5, 2/3, -0,7, 2/3 | 10 (10 ind., 2 ep.): 13,3, 10/10, -2,1, 6/10 |

### Mercati orso (nel 2001-02 la breadth dei settori non c'è)

| Orso | R0 | R0z | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|---|---|
| 2001-02 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2008 | 12; 12 giù; -41,3 / -59,9; -2 | 12; 12 giù; -38,8 / -58,5; -9,3 | 41; 41 giù; -42,3 / -75,7; -0,6 | 22; 22 giù; -44,9 / -75,7; -7 | 7; 7 giù; -52,9 / -58,7; -2,6 | 35; 31 giù; -44,8 / -77,5; -8,5 | 47; 47 giù; -43 / -77,3; -1,6 |
| 2022 | 6; 5 giù; -13,5 / -17,7; -2,1 | 5; 4 giù; -10,7 / -11,7; 8,7 | 26; 22 giù; -10,7 / -25,5; 3,1 | 16; 15 giù; -9,7 / -25,5; 3,6 | 2; 2 giù; -9,8 / -12,5; 9,2 | 24; 18 giù; -13,1 / -29,7; -0,2 | 33; 31 giù; -12,2 / -31,7; 1,3 |

Sui settori nessuna regola della 50 è utile; R1 nel 2007–2013 è sotto la base (−1,5 e −4,4). R3 passa nel 2014–oggi sui segnali (+3,8 e +10,7) ma non nel 2007–2013 e in nessun settore con 5 segnali (0 su 6). Il quadro è lo stesso degli indici.

## Controlli

- Ricalcolo indipendente nello script (algoritmo ingenuo, a parte): percentili su 902 sedute degli indici e 451 dei settori, rendimenti a 63 sedute su 880 e 393 sedute, tutti i segnali R1 (439 sugli indici, 262 sui settori) con un ciclo che conta i valori sotto il valore del giorno: coincidono (`checks` in `pattern.json`).
- Funzioni dell'app importate: `indexSeries`, `breadthSeries`, `priceSeries`, `runMachine`, `forward`, `median`.
- Spot check: i segnali R1 dell'S&P 500 (in `pattern.json`, `indices.signals.R1`) cadono dove ci si aspetta (24/08/2015, 08/01/2016, 08/02/2018, 11/10/2018, 17/12/2018, 27/02/2020, 04/04/2025).

## Limiti

- **Membri di oggi**: la breadth storica di 19 indici su 22 usa i membri di oggi. Sul Nasdaq-100 la breadth a 200 sedute risulta in media 4,5 punti più alta e quasi uguale vicino ai minimi (`ricerca/indici/membri_oggi_ndx.json`); per la breadth a 50 il bias non è stato misurato e potrebbe essere diverso. I percentili sono calcolati sulla stessa serie, quindi un bias costante si annulla in parte, uno che cambia nel tempo no.
- **Solo prezzo** per gli indici (senza dividendi): segnali e base sono misurati allo stesso modo, quindi il confronto regge, ma i rendimenti assoluti sono più bassi di quelli totali. I settori usano chiusure rettificate.
- **Livelli blu di oggi** (scelti col senno di poi): entrano in R2 e in R0/R0z.
- **Percentili a finestra crescente**: nei primi anni dopo le 500 sedute la soglia viene da una storia corta (per l'S&P 500, dal 2005 al 2007 un mercato calmo): il 5° percentile è più alto e la regola scatta più spesso. È il prezzo di non usare dati del futuro.
- **Indici diversi negli stessi giorni**: molti segnali sono lo stesso evento in più indici; per questo c'è la versione per episodi. Gli episodi sono 105 per R1, ma nel 2001–2013 contano solo 39 e le crisi grandi sono poche (2008, 2011, 2020, 2022): le percentuali per crisi sono indicative.
- **Indici con pochi titoli** (SMI 20, FTSE MIB 40, IBEX 35, DAX 40, CAC 40): la breadth a 50 si muove a scatti di 2,5–7 punti (un titolo su 14–40 coperti) e il 5° percentile spesso è un valore ripetuto.
- **R0 e R0z** sono tenuti solo nelle sedute valutabili per R1–R5 (dopo 500 sedute di breadth): restano fuori, per esempio, i trigger del Nasdaq-100 del 2008-09 (breadth dal 2008).
- Taiwan: dividendi in azioni non rettificati (vedi `config/indices.json`), la breadth può risultare più bassa.

## Segnali recenti (solo informazione)

Nelle ultime settimane R1 ha dato segnali su Nifty 50 (11/09/2026), S&P/TSX 60 (29/09), KOSPI 200 (15/10), MSCI Emerging Markets e Hang Seng (22/10), Ibovespa (28/10). Per quanto visto sopra, non indicano da soli un minimo.
