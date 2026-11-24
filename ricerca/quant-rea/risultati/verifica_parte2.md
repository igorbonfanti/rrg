# Verifica indipendente — Fascicolo Quant Rea, sezioni 22–34

Script: `/home/user/rrg/ricerca/quant-rea/script/verifica_parte2.py` (output numerici in `out2/risultati.txt` e `out2/s*.csv`).
Dati: Yahoo ^GSPC (dal 1927, high/low reali solo dal 1962), ^NDX (dal 1985-10), ^VIX (dal 1990). Tutto tagliato al **2026-07-16** (data citata nel fascicolo).

**Nota sui dati del fascicolo.** TVC:SPX su TradingView ha barre **mensili prima del 1950 e giornaliere dopo**. La frase della Sez. 29 ("19.965 barre mensili dal 1871 … 19.288 mesi dal 1950") è impossibile: dal 1950 ci sono circa 920 mesi, mentre le sedute sono 19.255 (il nostro conteggio). Le date della Sez. 26 anteriori al 1950 (1909-12-01, 1929-08-01 …) sono tutte inizi mese. Ogni statistica "su tutto lo storico" mescola quindi episodi mensili e giornalieri, e le durate "in giorni" del periodo pre-1950 sono in realtà mesi o giorni di calendario.

**Esito generale.** Abbiamo ricostruito quasi tutti i numeri chiave, in diversi casi alla seconda cifra decimale. Così sappiamo *esattamente* quale algoritmo è stato usato, e i difetti trovati sono di metodo, non di arrotondamento.

| Sez. | Tema | Verdetto |
|---|---|---|
| 22 | MDD intra-anno vs rendimento | valido con riserve (la conclusione "nessuna relazione" è falsa) |
| 23 | Correzioni NDX −20% | **errato** (40 "correzioni" = 8 episodi contati più volte; minimo 2000-02 sbagliato) |
| 24 | Giorni in bear NDX | fuorviante ("circa quaranta fasi" = rumore attorno alla soglia) |
| 25 | "Ergodicità" | fuorviante (è un filtro di momentum a 12 mesi, non ergodicità) |
| 26 | Bear + secondo drawdown | valido con riserve (dati misti, il 1987 non è una seconda gamba) |
| 27 | DD dal massimo YTD e forward | valido con riserve (manca il confronto con la media; edge piccolo; artefatto 1963-64) |
| 28 | Mese del massimo annuale | valido con riserve (l'effetto dicembre è soprattutto deriva) |
| 29 | Dashboard bull/bear | valido con riserve (37 fasi solo con estremi intraday; un dato errato) |
| 30 | Dashboard titoli | fuorviante (survivorship bias, CAGR annualizzati su storici brevi) |
| 31 | Conteggio crolli giornalieri | descrittivo, valido con riserve (survivorship bias, non normalizzato) |
| 32 | Oro multi-orizzonte | descrittivo, valido con riserve (minori) |
| 33 | GARCH vs VIX | **fuorviante/errato** (target trailing; sul target corretto il VIX non perde) |
| 34 | SPX dopo VIX>30 | valido con riserve (734 giorni ≈ 21 episodi; manca la media di riferimento) |

---

## 22. Drawdown intra-anno e rendimento annuale (SPX 1950–2026)
**Metodo (ricostruito):** per ogni anno, MDD = min(low / cummax(high)) − 1 e rendimento = ultimo close / **primo close dell'anno** − 1.

| | Fascicolo | Nostro |
|---|---|---|
| Anni | 77 | 77 (1950–2026, 2026 parziale) |
| Anni positivi | 56 (73%) | **56 (72,7%)** con il loro metodo; 57 (74,0%) con il close dell'anno precedente (cambia il 1970) |

**Difetti**
- Il filtro "anni con drawdown ≤ 0%" non esclude nulla: ogni anno ha un drawdown ≤ 0. Il "73% positivi nonostante il drawdown" è solo la quota di anni positivi.
- Il rendimento parte dal primo close dell'anno, non dal close di fine anno precedente: perde il primo giorno (il 1970 cambia segno).
- L'affermazione "non si osserva una relazione lineare netta" è falsa: **corr(MDD, rendimento) = 0,65**. La versione condizionata, che è la parte informativa, manca:

| MDD intra-anno | n | % anni positivi |
|---|---|---|
| tutti | 76 | 74% |
| ≤ −10% | 47 | 60% |
| ≤ −15% | 29 | 45% |
| ≤ −20% | 20 | **35%** |

- Il 2026 è un anno parziale ed è incluso nel conteggio.

**Verdetto:** valido con riserve. Il numero è giusto, l'interpretazione no.

## 23. Correzioni NDX (soglia −20%)
**Metodo (ricostruito esattamente):**
- ogni **ri-attraversamento** al ribasso di −20% dal massimo storico conta come una nuova "correzione";
- il minimo viene cercato **solo nelle 250 sedute dopo il trigger**;
- la profondità assegnata è quella dell'episodio-padre (stesso picco), troncata dalle finestre;
- i "giorni di recovery" sono contati dal **picco**, non dal minimo;
- il "Ritorno 250gg" è calcolato dal **picco**, non dal trigger come dice il testo.

| | Fascicolo | Ricostruzione con il loro algoritmo | Episodi de-duplicati (corretto) |
|---|---|---|---|
| n correzioni | 40 | **40** | **8** (1987, 1990, 1998, 2000, 2018, 2020, 2022, 2025) |
| DD medio / mediano | −45,5% / −39,9% | **−45,5% / −39,9%** | −36,0% / −30,5% |
| DD peggiore | −76,05% (2001-09-21) | **−76,05% (2001-09-21)** | **−82,9% (2002-10-07)**; −83,5% intraday |
| Episodi ≈ −75/−80% | 11 | 11 (tutti lo stesso 2000) | 1 |
| Recovery medio | 1.306 gg | **1.306** (dal picco) | 675 gg dal picco (mediana 150) |
| Ritorno a 250 gg | −18,6% | −18,2% dal picco; +12,7% dal trigger | — |

La loro tabella (1987: −39,93%, 15 gg; 1990: −32,90%, 62 gg; 1998: −22,99%, 57 gg; 2000: −76,05%, 372 gg) coincide con la nostra al centesimo. I 40 trigger sono dieci per il 1987-88, quattro per il 1990-91, due per il 1998, **undici per il 2000**, uno per il 2018, quattro per il 2020, sette per il 2022-23 e uno per il 2025. La "correzione del 2000" finisce a settembre 2001 solo perché la finestra di 250 sedute dall'ultimo ri-attraversamento (2000-09-21) si chiude lì. Il minimo vero arriva 13 mesi dopo.

"NDX dal 1950" è impossibile: l'indice parte nel 1985.

**Probabilità condizionata di approfondimento** (riga "da −20%"):

| Base | n | → −25% | → −30% | → −35% | → −40% | → −50% |
|---|---|---|---|---|---|---|
| Fascicolo (40 trigger) | 40 | 90% | 80% | 70% | 28% | 28% |
| Ricostruzione 40 trigger | 40 | 90% (36) | 80% (32) | 70% (28) | 28% (11) | 28% (11) |
| **NDX de-dup** | 8 | 62% (5) | 50% (4) | 38% (3) | 12% (1) | 12% (1) |
| **SPX 1928+ de-dup** | 12 | 83% (10) | 58% (7) | 42% (5) | 33% (4) | 17% (2) |
| **SPX 1950+ de-dup** | 11 | 82% (9) | 55% (6) | 36% (4) | 27% (3) | 9% (1) |

Il "39% partendo da −35%" del testo è 11/28 nella tabella gonfiata. Sui dati de-duplicati la base vale n = 3 per NDX e n = 4 per SPX: non si può stimare.

**Verdetto:** **errato**. Il conteggio, le medie e il caso peggiore derivano dal doppio conteggio e dalla finestra troncata.

## 24. Giorni in bear (NDX, DD ≤ −20% da ATH)
| | Fascicolo | Nostro |
|---|---|---|
| Quota di giorni in bear dal 1985 | "poco più del 40%" | **38,9%** (3.993 / 10.276) |
| Fasi bear distinte | "circa quaranta" | **40** run contigui, di cui **27 durano ≤ 5 sedute** e 34 ≤ 20 |
| Fase più lunga | > 3.000 gg (2000–2013) | **3.445 sedute, 2000-09-21 → 2014-06-04** |

**Difetti**
- Le 40 "fasi" sono gli stessi 40 attraversamenti della Sez. 23: oscillazioni attorno a −20% dentro **8** episodi veri. La "coerenza" tra le due sezioni è lo stesso errore che si ripete.
- "Bear" qui vuol dire "ancora sotto il −20% dal vecchio ATH". L'**80%** dei giorni bear (3.192) cade *dopo* il minimo, cioè durante la risalita. Solo il 20% è discesa vera. Il 2003–2014 era un mercato in rialzo.
- Senza il 2000–2015 la quota scende al **7,3%**. Per confronto, SPX 1950+ = 16,0% e SPX 1928+ = 36,5%.

**Verdetto:** fuorviante (i numeri sono riprodotti, la lettura no).

## 25. "Ergodicità" (SPX 1950+, finestra 252, soglia ±0,0011)
**Metodo:** diff = media mobile a 252 giorni dei log-rendimenti − media espansiva; un giorno è "non ergodico" se |diff| > 0,0011.

| | Fascicolo | Nostro |
|---|---|---|
| Giorni non ergodici | 6,1% | **5,6%** (media espansiva dal 1950); 6,3% se la media espansiva parte dal 1928 (verosimilmente includono storia precedente) |
| Stato al 2026-07-16 | ergodico | ergodico |

**Difetti**
- 252 × media mobile è **identicamente** il log-rendimento a 12 mesi (scarto 1e−16). La soglia ±0,0011 al giorno vale **±27,7% annuo** attorno alla media storica (8,0%/anno). "Non ergodico" vuol dire solo "rendimento a 12 mesi sopra circa +36% o sotto circa −20%"; corr(diff, rendimento a 12 mesi) = 0,985.
- Non ha nulla a che vedere con l'ergodicità nel senso di Peters (media d'insieme contro media temporale di una dinamica moltiplicativa, cioè E[r] contro E[log(1+r)]). Una sola serie storica non può testare l'ergodicità.
- Non è un segnale precoce: per costruzione è in ritardo di 12 mesi. Ex post i segnali "sotto banda" sono seguiti da rendimenti migliori della media (+17,0% a 252 gg contro +9,2%), cioè mean-reversion. È l'opposto del "campanello d'allarme" descritto.
- La banda è fissa (±0,0011), non "più larga nei primi anni" come dice il testo.

**Verdetto:** fuorviante.

## 26. Bear market e secondo drawdown
**Metodo (ricostruito):** episodi de-duplicati da ATH su **estremi intraday** (cummax dell'high, low). La fine del bear è il minimo. Si cerca poi il primo calo ≥ 10% dal massimo del rimbalzo prima di tornare all'ATH pre-bear. Le profondità del 1962–2022 coincidono al centesimo con la nostra variante intraday (29,31; 37,27; 49,93; 35,93; 50,50; 57,69; 27,54), e anche **tutte e 7 le date di inizio** del secondo DD (1962-08-23, 1970-06-09, 1974-11-06, 1987-10-21, 2002-12-02, 2010-04-26, 2023-07-27).

| Campione | Bear | Con secondo DD |
|---|---|---|
| Fascicolo (1871+, mensile + giornaliero) | 21 | 9 |
| SPX 1928+ close | 12 | 7 |
| SPX 1950+ close | 11 | 6 (1962, 1970-71, 1974, 2002-03, 2010, 2023) |
| SPX 1962+ intraday | 14 | 7 (come il fascicolo dal 1962) |

**Difetti**
- **1987:** su base intraday il minimo è il 20/10 (216,46) e il "secondo DD" 21/10 → 26/10 è la stessa settimana del crash: un aftershock, non una seconda gamba. Sui close il minimo è il **4/12/1987** e il secondo DD **non esiste**. Il "caso più rapido, 62 giorni" è quindi un artefatto della scelta high/low.
- I "giorni tra bear e secondo DD" sono giorni di calendario dall'inizio del bear alla **fine** del secondo DD: 62 = 25/8 → 26/10. Nel periodo pre-1950 la misura si applica a barre mensili. La media di 1.153,9 gg dipende dal 1909 (mensile).
- La fine del secondo DD del fascicolo è troncata: per esempio 1974-11-18 −10,9%, mentre noi troviamo un minimo al 1974-12-09 −17,2%.
- Con 9 episodi su dati misti non si può fare inferenza.

**Verdetto:** valido con riserve (descrittivo corretto, campione eterogeneo, il 1987 è da togliere).

## 27. Numero di drawdown dal massimo YTD e rendimenti forward (SPX 1950+)
**Metodo (riprodotto):** il low scende sotto YTDhigh × (1 − soglia); si riarma a ogni nuovo massimo YTD. I conteggi 1950–1964 coincidono **tutti** con l'estratto del fascicolo, compreso il 59/61 al 1% nel 1963–64. Massimo a 5%: 7 eventi nel 1999.

| Soglia, orizzonte | n | Media (fasc.) | Media (nostra) | Win (nostro) | **Base: tutti i giorni** | Eccesso | p (shift circolare) |
|---|---|---|---|---|---|---|---|
| 5%, 5 gg | 162 (158) | 0,15% | 0,19% | 49,4% | 0,18% / 56,9% | 0,00 | 0,50 |
| 5%, 21 gg | 162 | 0,89% | 0,97% | 61,7% | 0,76% / 61,8% | +0,21 | 0,26 |
| 5%, 63 gg | 161 (157) | 3,22% | 3,33% | 71,4% | 2,28% / 66,8% | +1,05 | 0,03 |
| 10%, 63 gg | 55 | 3,21% | 3,19% | 67,3% | 2,28% / 66,8% | +0,91 | 0,16 |
| 15%, 63 gg | 29 | 3,99% | 4,06% | 65,5% | 2,28% / 66,8% | +1,78 | 0,07 |
| 1%, 63 gg | 1.426 | 1,90% | 1,94% | 68,3% | 2,28% / 66,8% | −0,34 | 0,70 |

**Difetti**
- Senza la media di riferimento (2,28% a 63 gg, win 66,8%) il "win rate 72%" sembra un edge. Rispetto alla base l'eccesso è circa +1 pp a 63 gg, e significativo solo per la soglia 5% (p ≈ 0,03, senza correzione per i circa 15 test).
- Il 32% degli eventi al 5% ha un altro evento entro 63 sedute: le finestre forward si sovrappongono.
- I 59/61 eventi all'1% nel 1963–64 sono un **artefatto dei dati**: gli high/low storici dello S&P di quegli anni sono "teorici", con escursione media giornaliera dell'1,2–1,3% contro lo 0,5–0,9% moderno. Quasi ogni nuovo massimo è seguito da un low a −1%. Anche TV ha lo stesso artefatto.

**Verdetto:** valido con riserve.

## 28. Mese del massimo annuale (SPX 1950–2026)
| | Fascicolo | Nostro |
|---|---|---|
| Dicembre / gennaio | 33/77 / 12/77 | **33 / 12** (su 77; nel 1950–2025 completo: 33/76, 12/76) |
| P(massimo ancora avanti) a fine ott. / fine nov. | 51% / 43% | **52% / 43%** |

**Test con dati nulli (cosa ci si aspetta senza stagionalità):**
- rimescolando i rendimenti giornalieri dentro ogni anno (stesso rendimento annuo, nessuna stagionalità), il massimo cade a dicembre nel **37,4%** degli anni (intervallo 5–95%: 30–45%). L'osservato 43% sta dentro l'intervallo;
- con un random walk con la deriva e la volatilità di SPX (Sharpe 0,5): dicembre 29,4%, gennaio 10,4%, novembre 11,0%;
- senza deriva: dicembre e gennaio circa 18,6% ciascuno (legge dell'arcoseno).

Negli anni positivi il massimo cade a dicembre nel 58% dei casi, negli anni negativi nello 0%.

Conclusione: la concentrazione a dicembre è soprattutto **effetto di bordo più deriva** (una serie che sale tende ad avere il massimo vicino alla fine della finestra), non un "rally di fine anno" dimostrato. Gennaio (15,6%) è il simmetrico per gli anni negativi. Il 2026 parziale conta come anno.

**Verdetto:** valido con riserve (numeri giusti, interpretazione causale non supportata).

## 29. Bull & bear ±20%, durata minima del bull 5 mesi (SPX 1950+)
**Metodo:** regola simmetrica 20/20 alla Lunde–Timmermann / Pagan–Sossounov, censura dei bull sotto le 105 sedute, in due varianti.

| | Fascicolo | Variante **intraday** high/low | Variante **close** |
|---|---|---|---|
| Fasi | 37 (19 bull, 18 bear) | **37 (19 / 18)** | 23 (12 / 11) |
| Bull: durata / rendimento medio | 3,2 anni / +99,8% | 3,23 anni / +106,4% | 5,36 anni / +178,7% |
| Bear: durata / rendimento medio | 10 mesi / −27,6% | 0,84 anni (≈ 10 mesi) / −30,3% | 13 mesi / −34,6% |
| Volatilità bull / bear | 14,1% / 25,7% | 14,0% / 26,3% | 13,3% / 27,9% |
| P90 durata bear / P10 rendimento bear | 1,7 anni / −47,6% | 1,71 / −50,1% | 1,72 / −48,2% |

**Difetti**
- 7 dei 18 bear esistono **solo sugli estremi intraday**: 1976–78 (−20,5%), feb–mar 1980 (−21,6%), 1990 (−20,4%), 1998 (−22,4%), 2011 (−21,6%), 2018 (−20,2%), 2025 (−21,3%). Sui close sono tutti tra −17% e −19,9%. La datazione standard (close o medie mensili) dà 11 bear, e le statistiche medie cambiano molto (il bull medio passa da 3,2 a 5,4 anni).
- **"Bull 1990–1998 annualizzato oltre il 65%" è errato:** +301,7% in 7,76 anni = **19,6%/anno**. Valori sopra il 65% annualizzato esistono solo per bull brevi, per esempio mar–nov 1980 (+84,7% annualizzato su 8 mesi).
- "19.965 barre mensili / 19.288 mesi dal 1950" sono sedute giornaliere (vedi la nota iniziale).
- Il bull in corso: +46,4% nel fascicolo contro il nostro +56,6% dal low intraday del 7/4/2025. Le date di partenza coincidono; l'errore viene probabilmente dal livello finale o dalla base sul close.
- I tempi di recupero sono coerenti: 1973 circa 69 mesi; 2000 circa 57 mesi; 2020 circa 5 mesi.

**Verdetto:** valido con riserve (algoritmo riprodotto; le conclusioni dipendono dall'uso degli estremi intraday; un numero è errato).

## 30. Dashboard drawdown/recovery dei titoli (S&P 500, 503 titoli)
Non verificabile senza i dati dei singoli titoli. Critica di metodo:
- **Survivorship bias forte.** Si usano gli **attuali** membri su tutta la loro storia. I falliti e i delisted (che hanno MDD = −100% e nessun recupero) mancano, quindi il CAGR mediano del 19,4%, il 94% di CAGR positivi e i tassi di recovery del 74–94% sono gonfiati. Si osserva un titolo *perché* è sopravvissuto ed è cresciuto abbastanza da entrare nell'indice. Il caveat compare in fondo alla sezione, ma il testo trae conclusioni ("la maggioranza si è comunque risolta in un nuovo massimo") che il bias invalida.
- **CAGR su storici brevi.** SNDK al 1.291% annualizza pochi mesi dallo spin-off (2025); GEV (2024), KVUE, SOLV e CEG sono simili. Mancano una lunghezza minima di storia (per esempio 5–10 anni) e una ponderazione per durata. Lo stesso vale per lo Sharpe di circa 3,1.
- Il MDD dipende dalla lunghezza dello storico: le aziende più vecchie hanno più occasioni di −80%. Senza un confronto a parità di finestra, le distribuzioni non si confrontano.
- Il "recovery %" conta gli episodi dentro lo stesso titolo (8.018 episodi a −10%), quindi sono sovrapposti e non indipendenti.
- Il riferimento pubblicato è **J.P. Morgan, "The Agony & the Ecstasy"** (Cembalest 2014, aggiornato 2021), sull'universo Russell 3000 *inclusi i delisted*: circa il 40% dei titoli ha subito un calo ≥ 70% senza mai recuperare, e circa due terzi hanno sottoperformato l'indice. È il confronto da fare (vedi anche Bessembinder 2018 sulla concentrazione dei rendimenti).

**Verdetto:** fuorviante come evidenza sui rischi dei singoli titoli.

## 31. Drop giornaliero cumulato (membri NDX ≤ −7%, SPX ≤ −5%, somma a 5 gg)
Non verificabile senza i dati dei membri.
- È una misura di ampiezza "washout" sul lato ribassista (simile ai conteggi di new lows o al TRIN). Va bene come descrizione, ma non è normalizzata: va divisa per il numero di membri × finestra, e soglie fisse in % ignorano il regime di volatilità (un −5% nel 2017 non equivale a un −5% nel 2008).
- Usa la composizione attuale (survivorship bias): nel 2000–2002 e nel 2008 mancano proprio i titoli crollati e poi usciti, quindi i picchi storici sono sottostimati e il confronto con oggi è distorto.
- Non c'è nessuna analisi di cosa segue i picchi (rendimenti forward con media di riferimento), quindi non c'è nessun contenuto predittivo dimostrato.

**Verdetto:** descrittivo, valido con riserve.

## 32. Oro: rendimenti multi-orizzonte e volatilità a 30 gg
Puramente descrittivo; i dati GC1! non sono disponibili qui.
- Il rendimento "settimanale/mensile" **somma** 5/22 rendimenti semplici invece di comporli. Nel 1979–80, con sedute a ±10%, la differenza è di diversi punti.
- Le finestre rolling si sovrappongono e sono mostrate giornalmente: non sono settimane o mesi di calendario.
- GC1! è un front-month continuo: i roll creano salti spuri se la serie non è aggiustata.
- La volatilità è espressa in frazioni (0,93) in un fascicolo che altrove usa punti percentuali.

**Verdetto:** valido con riserve (minori).

## 33. GARCH(1,1) OOS vs VIX vs realizzata (split 2000-01-01, roll 30)
**Setup ricostruito esattamente:**
- GARCH(1,1) normale stimato sul **1990–1999**, filtrato con parametri fissi dal 2000;
- confrontato con la realizzata **trailing** a 30 gg (finestra t−29…t);
- 6.673 osservazioni OOS (identiche alle nostre).

| Target **trailing 30 gg** (setup fascicolo) | MAE | RMSE | Corr | R² | a | b | sMAPE |
|---|---|---|---|---|---|---|---|
| GARCH (fascicolo) | 1,533 | 2,281 | 0,979 | 0,959 | −1,856 | 1,107 | 9,96 |
| GARCH (nostro) | **1,526** | 2,270 | **0,979** | 0,959 | −1,840 | 1,106 | 9,91 |
| VIX (fascicolo) | 4,818 | 6,171 | 0,863 | 0,745 | −4,568 | 1,062 | 29,02 |
| VIX (nostro) | **4,807** | 6,160 | **0,863** | 0,745 | −4,553 | 1,061 | 28,95 |
| Riferimento ingenuo: RV di ieri | 0,42 | — | 0,996 | — | — | — | — |

**Il difetto principale.** Il GARCH di oggi e la RV trailing di oggi usano gli stessi rendimenti passati. La RV trailing è a sua volta quasi una media esponenziale dei rendimenti al quadrato recenti, quindi la correlazione del 98% c'è per costruzione: la "RV di ieri" fa ancora meglio (MAE 0,42). Il VIX invece è una previsione dei **prossimi 30 giorni di calendario**: confrontarlo con il passato lo penalizza per definizione. Il target corretto è la volatilità **forward**.

| Target **forward 21 sedute** (t+1…t+21) | MAE | RMSE | Corr | QLIKE | a | b (HAC se) |
|---|---|---|---|---|---|---|
| GARCH previsione a 1 passo | 4,82 | 7,97 | 0,673 | 0,368 | 3,44 | 0,77 (0,08) |
| GARCH media a 21 gg | 4,77 | 7,88 | 0,672 | 0,355 | 2,85 | 0,81 (0,08) |
| VIX grezzo | 5,92 | 8,09 | **0,721** | **0,321** | −1,63 | 0,90 (0,06) |
| VIX × 0,732 (VRP stimato **1990–99**, nessun look-ahead) | **4,08** | 7,55 | 0,721 | 0,377 | −1,63 | 1,23 |
| VIX − 5,45 punti (VRP 1990–99) | 4,31 | **7,49** | 0,721 | 0,546 | 3,28 | 0,90 |
| Random walk (RV21 trailing) | 5,33 | 8,73 | 0,652 | 0,498 | — | — |

Altri test:
- Diebold–Mariano (MSE) tra GARCH a 21 gg e VIX: t_HAC = −0,77, nessuna differenza significativa.
- Encompassing: RV_fwd = −1,34 + 0,14·GARCH + **0,77·VIX** (t: GARCH 1,2; VIX 8,3). **Il VIX ingloba il GARCH**, non viceversa.
- Con il GARCH stimato sul 1950–1999 i risultati sono gli stessi (VIX t = 7,5, GARCH t = 1,95).

Sul target corretto il VIX ha la correlazione più alta e la QLIKE migliore. Una volta corretto per il premio al rischio medio (stimato prima del 2000), batte il GARCH anche su MAE e RMSE. Il VIX grezzo perde in MAE solo per il bias del premio al rischio (circa −3,6 punti), cosa nota e attesa.

**Verdetto:** **fuorviante/errato**. La frase "il GARCH batte nettamente il VIX su ogni metrica" dipende interamente dal target trailing.

## 34. SPX dopo giorni con VIX > 30 (1990+)
| Orizzonte | μ fasc. | μ nostra (n giorni) | σ nostra | Win | **Base: tutti i giorni dal 1990** μ / win |
|---|---|---|---|---|---|
| 1m (21 gg) | 2,59% | **2,58%** (734) | 7,71 | 71% | 0,81% / 64% |
| 3m | 6,83% | **6,82%** | 10,96 | 77% | 2,43% / 70% |
| 6m | 12,97% | **12,92%** | 14,08 | 83% | 4,87% / 74% |
| 12m | 22,35% | **22,28%** (732) | 18,25 | 87% | 10,16% / 81% |

- I 734 giorni corrispondono a **21 episodi distinti** (giorni separati da ≥ 63 sedute), o 35 con un intervallo di ≥ 21 sedute.
- Il 2008-09 pesa per il 25% dei giorni (186), il 2002-03 per 122 e il 2020-21 per 84.

| Media per episodio (n = 21) | 1m | 3m | 6m | 12m | Win a 12m |
|---|---|---|---|---|---|
| Dal **primo** giorno con VIX > 30 (realizzabile) | 1,1% | 3,3% | 6,2% | **8,7%** (mediana 15,3%) | 70% |
| Dal **picco** del VIX (look-ahead) | 8,7% | 11,6% | 14,7% | 17,4% | 80% |

- Episodi con 12m negativo dal primo giorno: **apr 2000 (−12,1%), ott 2000 (−19,6%), set 2001 (−18,0%), ago 2007 (−8,1%; dal giorno di picco, 17/3/2008, −39,0%), set 2008 (−11,7%), dic 2021 (−9,7%)**.
- Giorni con 12m < 0 per anno: 2001 (41), 2022 (22), 2008 (19), 2000 (5), 2007 (3), 2021 (2).

**Difetti**
- Senza la media di riferimento il +22% sembra enorme. L'eccesso effettivo è circa +12 pp a 12 mesi, ma pesato per giorni e dominato da 2008-09, 2002-03 e 2020.
- Per episodio, entrando al primo segnale, la media a 12 mesi è 8,7%: **sotto la media incondizionata** del 10,2%, con un episodio su tre negativo.
- Il fit gaussiano e le "probabilità di perdita" (37% → 11%) trattano 732 osservazioni sovrapposte come indipendenti.
- Il testo cita tra gli episodi rossi il **crollo dell'ottobre 1987**, ma CBOE:VIX parte nel 1990 (nel 1987 esisteva solo il VXO). Il grafico o il testo è incoerente.

**Verdetto:** valido con riserve (numeri riprodotti; la lettura "VIX > 30 = buon ingresso" non regge per episodio).
