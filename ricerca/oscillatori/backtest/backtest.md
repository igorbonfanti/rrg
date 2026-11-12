# Backtest: «due oscillatori mensili girano al ribasso da zona alta» sull'S&P 500

Fase di ricerca del 12/11/2026 (ramo `claude/great-noether-2f1ude`). **Non modifica l'app.** Ogni numero di questa nota
viene da `backtest.mjs` (uscita completa in `backtest.out.txt`, tabelle in `risultati.json`, valori mese per mese in
`valori_mensili.json`). Dati fino alla seduta del 10/11/2026; ultimo mese chiuso 2026-10.

Idea di Francesco Caruso (Cicli&Mercati): nel video «Mercati al bivio…» mostra segnali mensili a mag 1998, nov 1999,
nov 2007, gen 2015, set 2018, gen 2020, gen 2022 e lug 2026 con il suo Composite Momentum Oscillator (CMO) e il C-Wave.
Il CMO è usato con il permesso dell'autore (formula ufficiale ProRealTime, vedi `../identificazione.md`). Il C-Wave non
è pubblico e non è stato imitato: al suo posto Coppock, KST di Pring e MACD mensili.

## 1. Domanda e criterio (decisi prima dei risultati)

- **Domanda**: il segnale avvisa di cali ≥10% (correzioni) e ≥20% (bear market)? Quanto prima? Con quanti falsi allarmi?
- **Successo**: (a) quota di segnali seguiti da un calo ≥10% entro 12 mesi − quota di tutti i mesi ≥ 15 punti;
  (b) almeno 3 bear market ≥20% avvisati (segnale da 12 mesi prima del mese del massimo a 1 mese dopo); nei sottoperiodi,
  che hanno 2 bear ciascuno, almeno il 75% (cioè 2 su 2); (c) mesi in allarme ≤ 35%; (d) a-c reggono nel 2010-2026 e con
  parametri vicini (K ±1, percentile ±10: almeno il 75% dei vicini supera a-c sul periodo intero).
- **Scelta dei parametri** sul campione 1992-10…2009-12 (la variante che supera a-c con lo scarto (a) più alto),
  **verifica** 2010-01…2026-10.

## 2. Metodo

### Dati
- Barre mensili dell'S&P 500 (`^GSPC`, solo prezzo) dalle sedute giornaliere di Yahoo dal 02/01/1985
  (`../cache/gspc_1d.json`): massimo = max dei massimi, minimo = min dei minimi, chiusura = ultima seduta. 502 mesi chiusi
  (1985-01…2026-10); 2026-11 è in corso e si scarta. Le barre sono salvate anche in `valori_mensili.json`: senza la cache
  lo script le rilegge da lì e dà gli stessi risultati (provato).
- Le 442 chiusure mensili dal 1990 coincidono con l'ultima seduta del mese di `data/vix.json` SPX (0 differenze oltre
  0,005 punti, stessa data in tutti i mesi). Nessuna barra con massimo ≤ minimo o chiusura fuori dall'intervallo.
- Esiti dalle chiusure giornaliere di `data/vix.json` SPX (dal 1990) e VIX di chiusura (FRED VIXCLS).

### Oscillatori (formule e fonti in testa a `lib.mjs`)
- **CMO**, K=4 (varianti K=3 e 5): formula ufficiale ProRealTime. Scelte dichiarate: `Stochastic[5,3]` = media semplice a
  3 mesi del %K grezzo `100·(C − min dei minimi a 5)/(max dei massimi a 5 − min dei minimi a 5)`. La documentazione di
  ProRealCode (https://www.prorealcode.com/documentation/stochastic/) dice solo «K – the smoothing period for the %K line»
  e non dà la formula; come controllo c'è la variante MetaStock (rapporto delle somme a 3): scarto massimo 2,76 punti,
  direzione diversa in 4 mesi su 406, segno diverso in 3; nelle varianti principali cambia poco (CMO + MACD: 26 segnali
  invece di 25, scarto (a) +1,8 invece di +3,3) e nessun criterio cambia esito (`backtest.out.txt`, sezione «Sensibilità»). EMA con alfa = 2/(n+1) e seme = primo valore disponibile; partendo dal
  1990 invece che dal 1985 il CMO cambia al massimo di 0,000015 punti dal 1993 (direzione e segno mai diversi).
- **Coppock** WMA10(ROC14 + ROC11); **KST** lungo termine (ROC 9/12/18/24, SMA 6/6/6/9, pesi 1-4, segnale SMA9);
  **MACD** EMA12 − EMA26 in punti, segnale EMA9. In più, fuori dal brief e solo come controllo, il **PPO** (MACD in % della
  EMA26), perché il MACD in punti cresce con il livello dell'indice.
- **Ricalcolo indipendente**: i valori coincidono con `../ricalcolo/oscillatori_py.json` (Python, scritto a parte) su
  tutti i 442 mesi dal 1990: scarto massimo 0,0001 (arrotondamento a 4 decimali; 0,0015 per il segnale del MACD, per il
  diverso seme del 1985), direzione mese su mese mai diversa.

### Regola esatta
- «Gira al ribasso» nel mese t: valore(t) < valore(t−1); per KST e MACD anche «sotto la propria linea di segnale».
- Zona alta: CMO > 0 (variante CMO > 50); secondo oscillatore > suo percentile 70 (varianti 60, 80) calcolato sui valori
  fino al mese t compreso (finestra crescente, almeno 60 valori); per Coppock e MACD anche «> 0».
- **Segnale nel mese chiuso t**: entrambi in discesa in t; il CMO in zona alta in almeno uno dei mesi t−2, t−1, t e il
  secondo oscillatore in zona alta in almeno uno dei mesi t−2, t−1, t (ciascuno per conto suo); in t−1 non erano già
  entrambi in discesa. Gli esiti partono dalla chiusura dell'ultima seduta del mese t.
- **In allarme**: dal mese del segnale fino al mese prima di quello in cui almeno uno dei due torna a salire.
- Valutazione dal 1992-10 (primo mese in cui tutte le varianti sono calcolabili) al 2026-10: 409 mesi; esiti a 12 mesi
  completi fino al 2025-10 (397 mesi).

### Eventi
Cali delle chiusure giornaliere: un evento parte da un massimo P se la chiusura scende di almeno X% sotto P prima di
tornare sopra P. Dopo il minimo di un calo lungo si cercano altri eventi tra quel minimo e il ritorno sopra P (così 2010,
2011, 2002-03 e 2023 contano; i rimbalzi dentro un bear market prima del suo minimo no). Massimi dal 1993.

| Massimo | Minimo | Calo | Note |
|---|---|---:|---|
| 07/10/1997 | 27/10/1997 | −10,8% | |
| 17/07/1998 | 31/08/1998 | −19,3% | |
| 23/09/1998 | 08/10/1998 | −10,0% | dopo il minimo di agosto (calo del 10,004%) |
| 16/07/1999 | 15/10/1999 | −12,1% | |
| **24/03/2000** | 09/10/2002 | **−49,1%** | bear |
| 27/11/2002 | 11/03/2003 | −14,7% | dopo il minimo del 2002 |
| **09/10/2007** | 09/03/2009 | **−56,8%** | bear |
| 23/04/2010 | 02/07/2010 | −16,0% | dopo il minimo del 2009 |
| 29/04/2011 | 03/10/2011 | −19,4% | dopo il minimo del 2009 |
| 21/05/2015 | 11/02/2016 | −14,2% | |
| 26/01/2018 | 08/02/2018 | −10,2% | |
| 20/09/2018 | 24/12/2018 | −19,8% | |
| **19/02/2020** | 23/03/2020 | **−33,9%** | bear |
| **03/01/2022** | 12/10/2022 | **−25,4%** | bear |
| 31/07/2023 | 27/10/2023 | −10,3% | dopo il minimo del 2022 |
| 19/02/2025 | 08/04/2025 | −18,9% | |

16 cali ≥10%, di cui 4 ≥20%. Nel 2026 nessun calo ≥10%: il più ampio è −9,1% (27/01 → 30/03/2026); dal massimo storico
del 06/10/2026 (7.818,93) il calo più ampio è −5,9% (05/11/2026).

## 3. Risultati

### 3.1 Varianti principali (dichiarate prima: CMO K=4 > 0, secondo oscillatore in discesa, zona alta p70)

Periodo intero 1992-10…2026-10. «Calo ≥10%» = segnali con esito a 12 mesi completo seguiti da un calo ≥10%.

| Regola | Segnali | Calo ≥10% entro 12m | Tutti i mesi | Scarto (a) | Bear avvisati | Correzioni avvisate | Anticipo mediano | Mesi in allarme | a b c |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| CMO + Coppock | 9 | 3 su 8 (37,5%) | 125 su 397 (31,5%) | +6,0 | 2 su 4 | 7 su 16 | 4 mesi | 27 su 409 (6,6%) | no no sì |
| CMO + KST | 12 | 3 su 10 (30,0%) | 31,5% | −1,5 | 1 su 4 | 7 su 16 | 1 | 37 (9,0%) | no no sì |
| CMO + MACD | 25 | 8 su 23 (34,8%) | 31,5% | +3,3 | 4 su 4 | 10 su 16 | 2,5 | 55 (13,4%) | no sì sì |
| Solo CMO: inizio di DOWN (CMO > 0 e in discesa) | 32 | 9 su 30 (30,0%) | 31,5% | −1,5 | 4 su 4 | 15 su 16 | 5 | 102 (24,9%) | no sì sì |

Anticipo = mesi tra l'ultimo segnale della finestra e il mese del massimo (0 = segnale alla chiusura del mese del massimo).

Per sottoperiodo (stesse regole):

| Regola | 1992-2009: calo ≥10% / base | scarto | bear | allarme | 2010-2026: calo ≥10% / base | scarto | bear | allarme |
|---|---|---:|---:|---:|---|---:|---:|---:|
| CMO + Coppock | 1 su 5 / 29,0% | −9,0 | 1 su 2 | 6,3% | 2 su 3 / 34,2% | +32,5 | 1 su 2 | 6,9% |
| CMO + KST | 0 su 5 / 29,0% | −29,0 | 1 su 2 | 5,3% | 3 su 5 / 34,2% | +25,8 | 0 su 2 | 12,9% |
| CMO + MACD | 3 su 12 / 29,0% | −4,0 | 2 su 2 | 13,5% | 5 su 11 / 34,2% | +11,2 | 2 su 2 | 13,4% |
| Solo CMO DOWN | 3 su 16 / 29,0% | −10,2 | 2 su 2 | 23,7% | 6 su 14 / 34,2% | +8,6 | 2 su 2 | 26,2% |

**Nessuna variante principale supera il criterio (a)**: dopo i segnali un calo ≥10% entro 12 mesi arriva quasi con la
stessa frequenza che dopo un mese qualunque (31,5%). Coppock e KST perdono anche metà o più dei bear market.

Esiti dopo i segnali (mediane, periodo intero, finestre complete):

| | Calo max 6m | 12m | 18m | Rend. 3m (positivi) | 6m | 12m | VIX max 12m | Mesi al minimo |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Tutti i mesi | −3,8% | −5,0% | −5,8% | +3,0% (283 su 406) | +5,4% (299 su 403) | +12,2% (312 su 397) | 33,6 | 3 |
| CMO + Coppock | −3,8% | −6,2% | −6,5% | +4,1% (6 su 8) | +8,7% (8 su 8) | +12,8% (7 su 8) | 36,3 | 2 |
| CMO + KST | −2,7% | −5,5% | −5,5% | +7,2% (10 su 11) | +5,5% (10 su 11) | +10,7% (9 su 10) | 39,5 | 3 |
| CMO + MACD | −3,4% | −4,4% | −4,4% | +4,5% (21 su 24) | +5,9% (20 su 24) | +9,0% (18 su 23) | 33,5 | 2 |
| Solo CMO DOWN | −2,6% | −3,9% | −4,0% | +4,0% (26 su 31) | +9,6% (25 su 31) | +13,1% (25 su 30) | 35,4 | 1,5 |

Dopo i segnali le mediane non sono peggiori della base: i rendimenti a 3 e 6 mesi sono anzi leggermente più alti.

### 3.2 Tutte le varianti (108 del brief + 48 con il PPO)

Sul periodo intero superano a, b e c solo **4 varianti del brief, tutte con il MACD in punti e zona alta p80**: CMO K3 > 0,
K4 > 0, K5 > 0 e K5 > 50 (più 4 con il PPO p60). **Nessuna supera anche (d).** Tabella completa ordinata per scarto in
`backtest.out.txt` («Tutte le varianti»).

Scelta nel campione 1992-2009: superano a-c solo 2 varianti su 108; la migliore è **CMO K5 > 0 + MACD in discesa, p80**.

| CMO K5 > 0 + MACD in discesa p80 | Segnali | Calo ≥10% entro 12m | Base | Scarto | Bear | Correzioni | Allarme |
|---|---:|---:|---:|---:|---:|---:|---:|
| Campione 1992-2009 | 5 | 3 su 5 (60%) | 29,0% | +31,0 | 2 su 2 | 6 su 7 | 6,8% |
| Verifica 2010-2026 | 8 | 4 su 6 (66,7%) | 34,2% | +32,5 | 2 su 2 | 4 su 9 | 8,9% |
| Periodo intero | 13 | 7 su 11 (63,6%) | 31,5% | +32,2 | 4 su 4 | 10 su 16 | 7,8% |

Supera a-c anche nella verifica, ma **non (d)**: dei due vicini, K4 p80 supera a-c sul periodo intero (+18,5 punti) ma non
nel campione (+13,9), e K5 p70 si ferma a +10,6 punti. Segnali: 1997-10, 1998-07, 1999-07, 2000-05, 2007-07, 2014-07,
2018-03, 2018-11, 2020-02, 2021-09, 2023-09, 2026-02, 2026-10 (falsi allarmi: 1997-10, 1999-07, 2014-07, 2023-09).

**Perché non è robusto.** Il MACD in punti cresce con il livello dell'indice, quindi la sua «zona alta» a finestra
crescente non è stabile nel tempo: è sopra il proprio percentile 70 nel 71% dei mesi degli anni '90, 39% nei 2000, 81% nei
2010 e 89% nei 2020. Negli ultimi anni il filtro «zona alta» del MACD è quasi sempre acceso. La versione senza questo
effetto (PPO, MACD in %) con K5 p80 non supera (a) né (b): +8,5 punti, 2 bear su 4. Anche Coppock e KST hanno lo stesso
problema in senso opposto: dopo i valori record della fine degli anni '90 la loro soglia p70 resta così alta che negli
anni 2000 sono in zona alta in 5 e 0 mesi su 120. Per questo perdono il 2007.

### 3.3 Base casuale

Lo stesso numero di segnali messo in mesi a caso (20.000 estrazioni, seme fisso):

| Regola | Segnali | Correzioni avvisate (a caso, in media) | P(caso ≥) | Bear avvisati (a caso) | P(caso ≥) |
|---|---:|---:|---:|---:|---:|
| CMO + Coppock p70 | 9 | 7 (4,35) | 0,10 | 2 (1,08) | 0,29 |
| CMO + KST p70 | 12 | 7 (5,54) | 0,30 | 1 (1,38) | 0,83 |
| CMO + MACD p70 | 25 | 10 (9,49) | 0,50 | 4 (2,36) | 0,11 |
| CMO K5 + MACD p80 (scelta) | 13 | 10 (5,89) | 0,023 | 4 (1,46) | 0,013 |
| Solo CMO DOWN | 32 | 15 (10,99) | 0,017 | 4 (2,75) | 0,21 |

Le varianti principali non fanno meglio del caso. La variante scelta sì, ma è la migliore tra oltre cento provate: le
probabilità non sono corrette per questo e vanno lette come indicative.

### 3.4 Eventi: avvisati e persi (varianti principali)

| Massimo | Calo | CMO + Coppock | CMO + KST | CMO + MACD | Solo CMO DOWN |
|---|---:|---|---|---|---|
| 1997-10 | −10,8% | 1997-03 (7 mesi prima) | 1997-10 (0) | 1997-10 (0) | 1997-10 (0) |
| 1998-07 | −19,3% | 1998-07 (0) | 1998-08 (1 dopo) | 1998-07 (0) | 1998-07 (0) |
| 1998-09 | −10,0% | 1998-07 (2) | 1998-08 (1) | 1998-07 (2) | 1998-07 (2) |
| 1999-07 | −12,1% | 1999-08 (1 dopo) | 1999-07 (0) | 1999-07 (0) | 1999-05 (2) |
| **2000-03** | −49,1% | 1999-08 (7) | 1999-07 (8) | 1999-07 (8) | 1999-05 (10) |
| 2002-11 | −14,7% | perso | perso | perso | 2002-05 (6) |
| **2007-10** | −56,8% | perso | perso | 2007-07 (3) | 2007-02 (8) |
| 2010-04 | −16,0% | perso | perso | perso | 2009-11 (5) |
| 2011-04 | −19,4% | perso | perso | perso | 2011-05 (1 dopo) |
| 2015-05 | −14,2% | perso | 2015-01 (4) | 2015-01 (4) | perso |
| 2018-01 | −10,2% | perso | perso | perso | 2017-06 (7) |
| 2018-09 | −19,8% | 2018-03 (6) | 2018-05 (4) | 2018-03 (6) | 2018-03 (6) |
| **2020-02** | −33,9% | perso | perso | 2020-02 (0) | 2020-02 (0) |
| **2022-01** | −25,4% | 2021-09 (4) | perso | 2021-09 (4) | 2021-06 (7) |
| 2023-07 | −10,3% | perso | perso | perso | 2023-08 (1 dopo) |
| 2025-02 | −18,9% | perso | perso | perso | 2024-06 (8) |

Tra parentesi i mesi di anticipo dell'ultimo segnale della finestra. Quanto vale l'avviso (`backtest.out.txt`, «Ultimo
segnale nella finestra»):
- **2020**: il segnale di febbraio arriva a chiusura del 28/02/2020, quando l'S&P era già −12,8% dal massimo; restava un
  altro −24,3% fino al minimo.
- **2000, 2007, 2018-09, 2022**: con le tre coppie, segnali da 3 a 8 mesi prima, ma l'indice è poi salito ancora del
  7,5-15,7% fino al massimo
  (2000: +15,0% dal segnale di luglio 1999; 2007: +7,5% da luglio 2007; 2022: +11,3% da settembre 2021).

Motivi dei persi (valori in `valori_mensili.json`):
- **2007** con Coppock e KST: mai in zona alta negli anni 2000 (soglia p70 tenuta alta dai record degli anni '90).
- **2020** con Coppock: ancora in salita a febbraio 2020 e sotto la soglia p70; con KST: sotto la soglia p70.
- **2022** con KST: a gennaio 2022 sono entrambi in discesa, ma il CMO è sotto zero da ottobre 2021 (−36,2 a gennaio):
  manca la zona alta del CMO.
- **2011**: a maggio 2011 il CMO gira da 84,8, ma Coppock, KST e MACD salgono ancora; a giugno il Coppock gira ma è appena
  sotto la soglia (36,4 contro 37,9).
- **2025**: il CMO è sotto zero da dicembre 2024 (−7,8): nessuna zona alta del CMO prima del massimo di febbraio.

### 3.5 Per crisi

| Crisi | Calo | Coppock | KST | MACD | Solo CMO |
|---|---:|---|---|---|---|
| 1998 | −19,3% | sì | sì (1 mese dopo il massimo) | sì | sì |
| 2000-02 | −49,1% | sì | sì | sì | sì |
| 2007-09 | −56,8% | no | no | sì | sì |
| 2011 | −19,4% | no | no | no | sì (1 mese dopo) |
| 2015-16 | −14,2% | no | sì | sì | no |
| 2018 (gen) | −10,2% | no | no | no | sì |
| 2018 (set-dic) | −19,8% | sì | sì | sì | sì |
| 2020 | −33,9% | no | no | sì (a −12,8%) | sì (a −12,8%) |
| 2022 | −25,4% | sì | no | sì | sì |
| 2025 | −18,9% | no | no | no | sì (8 mesi prima) |
| 2026 | −9,1% (nessun calo ≥10%) | segnale 2026-10 | 2026-02, 2026-10 | 2026-02, 2026-10 | 2026-10 |

Pochi casi indipendenti (4 bear, 16 correzioni): tutte le percentuali sono indicative.

### 3.6 Confronto con le date di Caruso (solo plausibilità)

| Data di Caruso | Nostro CMO K4 (mese prima) | Solo CMO DOWN ±3 mesi | CMO + Coppock | CMO + KST | CMO + MACD |
|---|---|---|---|---|---|
| 1998-05 | 39,8 (26,2) | 1998-07 | 1998-07 | 1998-08 | 1998-07 |
| 1999-11 | −55,5 (−59,6) | — | 1999-08 | — | — |
| 2007-11 | −14,2 (−10,6) | — | — | — | — |
| 2015-01 | −2,4 (2,1) | — | — | 2015-01 | 2015-01 |
| 2018-09 | 7,5 (−16,6) | 2018-11 | — | 2018-11 | 2018-11 |
| 2020-01 | 69,3 (64,9) | 2020-02 | — | — | 2020-02 |
| 2022-01 | −36,2 (−32,8) | — | — | — | — |
| 2026-07 | 17,3 (2,0) | 2026-10 | 2026-10 | 2026-10 | 2026-10 |

Il MACD si avvicina (entro 3 mesi) a 5 date su 8, il KST a 4, il Coppock a 3, il solo CMO a 4. A nov 1999, nov 2007 e gen
2022 il nostro CMO mensile è sotto zero: con questi dati e questa formula un «giro da zona alta» in quei mesi non c'è. Il
secondo indicatore di Caruso è diverso dal nostro e non sappiamo su quali dati e impostazioni lavora il suo grafico: il
confronto non dice chi ha ragione.

## 4. Verdetto

| Criterio | Varianti principali (K4, CMO > 0, p70) | Migliore nel campione (K5, MACD p80) |
|---|---|---|
| (a) scarto ≥ 15 punti | no (Coppock +6,0; KST −1,5; MACD +3,3) | sì (+32,2) |
| (b) ≥ 3 bear avvisati | solo MACD (4 su 4) | sì (4 su 4) |
| (c) allarme ≤ 35% | sì (6,6-13,4%) | sì (7,8%) |
| (d) 2010-2026 e parametri vicini | no | 2010-2026 sì, vicini no (1 su 2) |

**Nessuna coppia di oscillatori soddisfa tutti i criteri a-d.** Le varianti decise prima non avvisano meglio di un mese
qualunque. L'unica sacca che funziona (CMO + MACD in punti, zona alta p80) è fragile ai parametri vicini e si regge su una
soglia che cambia significato nel tempo (il MACD in punti cresce con l'indice); la versione corretta (PPO) non regge.

**Verdetto: scarta** il segnale «due oscillatori girano al ribasso da zona alta» con Coppock, KST o MACD come avviso di
correzioni e bear market. Se si vuole comunque mostrare il CMO nell'app, va proposto all'utente come lettura descrittiva
(stati UP/ADVANCING/DOWN/TERMINATING di Caruso), senza presentarlo come allarme e con questi numeri accanto: il solo CMO
«DOWN» ha avvisato 15 correzioni su 16 e 4 bear su 4, ma con 32 segnali, il 24,9% dei mesi in allarme e una quota di cali
≥10% dopo il segnale (30,0%) pari a quella di tutti i mesi (31,5%).

**Stato attuale** (informativo, finestre non finite): alla chiusura di ottobre 2026 le tre coppie principali e il solo CMO
danno un segnale (CMO 39,1 in discesa). Finora, al 10/11/2026: calo massimo −3,0% dalla chiusura di ottobre, VIX massimo
28,18 (05/11/2026). Il segnale di febbraio 2026 (KST, MACD) è stato seguito da un calo massimo del −7,8%.

## 5. Limiti

- **Pochi eventi**: 4 bear e 16 correzioni dal 1993, alcuni annidati nella stessa crisi (1998, 2018). Percentuali indicative.
- **Molte varianti**: 156 combinazioni provate (più 6 di sensibilità); la migliore nel campione è scelta guardando i dati e i suoi numeri sono
  ottimistici. La verifica 2010-2026 ha solo 2 bear.
- **Percentili a finestra crescente**: non usano dati futuri, ma per oscillatori non stazionari (MACD in punti) o con
  record storici (Coppock e KST negli anni '90) la «zona alta» cambia significato da un decennio all'altro.
- **Stocastico del CMO**: la documentazione di ProRealTime non dà la formula; usata la media semplice del %K. La variante
  MetaStock cambia 4 direzioni su 406 mesi e nessun esito dei criteri nelle varianti principali.
- **Solo prezzo**: niente dividendi. Eventi e cali sulle chiusure, non sui minimi intraday. VIX di chiusura.
- **Evento del 23/09/1998**: calo del 10,004%, al limite della soglia.
- **Date di Caruso**: lette dal video; il C-Wave non è pubblico e non è stato imitato, quindi il confronto è solo di
  plausibilità.
- I segnali di febbraio e ottobre 2026 hanno finestre non finite e non entrano nelle statistiche a 12 mesi.

## File

- `lib.mjs`: oscillatori e statistiche (funzioni pure, con le fonti).
- `backtest.mjs`: tutto il backtest. Uso: `node ricerca/oscillatori/backtest/backtest.mjs > ricerca/oscillatori/backtest/backtest.out.txt`.
  Legge `data/vix.json` e la cache Yahoo (o, se manca, le barre in `valori_mensili.json`); confronta i valori con
  `../ricalcolo/oscillatori_py.json` se c'è.
- `backtest.out.txt`: uscita completa. `risultati.json`: eventi, base, tutte le varianti con criteri e segnali, base
  casuale, confronto con Caruso, crisi. `valori_mensili.json`: barre e oscillatori mese per mese.
