# Emergenti: verifica dei dati (cambi, dollaro, ETF, rendimento reale)

Fase di verifica preliminare: nessun file dell'app è stato modificato. Dati scaricati il 05/11/2026; dati dell'app al 30/10/2026 (`data/indices.json`, `asOf`). Tutti i numeri vengono da `risultati.json`, scritto dagli script.

- `script/scarica.mjs` scarica Yahoo (endpoint chart v8, storia intera, risposta grezza con le barre vuote) e FRED (`fredgraph.csv`) in `ricerca/emergenti/cache/`. La cartella è esclusa dal repository con `ricerca/emergenti/.gitignore`.
- `script/analisi.mjs` lavora senza rete e scrive `risultati.json`.
- `script/serie.mjs` contiene l'elenco delle serie.

Uso, dalla radice del repository: `node ricerca/emergenti/dati/script/scarica.mjs && node ricerca/emergenti/dati/script/analisi.mjs`.

Nessun dato è stato riempito. Il periodo di riferimento parte dal 2006, cioè dall'inizio del backtest; la prima data è sempre quella della storia intera.

## In breve

1. **La storia per il backtest va presa da FRED** (H.10 e indici del dollaro). Dal 2006 le serie sono complete: mancano solo le festività USA e 8 giorni di chiusura straordinaria. Non ci sono errori di stampa evidenti. Il limite di FRED è il ritardo: l'H.10 esce **una volta a settimana**, il lunedì, con i dati fino al venerdì prima. Oggi (05/11) l'ultimo dato è del 30/10, cioè 6 giorni di calendario e 4 lavorativi; la prossima uscita è il 09/11.
2. **I cambi di Yahoo sono completi ma sporchi.** Hanno errori di stampa grandi:
   - ZAR=X −18% il 15/11/2024 e −18% il 17/01/2025;
   - TWD=X a 1,80 il 25/10/2011 e a 3,67 il 31/12/2014, contro circa 30;
   - CNY=X −9% il 18/07/2011;
   - BRL=X −27% il 24/03/2006;
   - INR=X a 50,000 tondo il 26/01/2012.

   Ci sono anche periodi interi sfalsati rispetto a FRED: KRW=X nel 2006 (mediana −1,25%, 194 giorni oltre l'1%) e TWD=X nel 2013 (mediana −1,6% per tutto l'anno). A tutte le coppie manca il periodo dall'1 al 25/08/2008 (17 giorni lavorativi) per INR, BRL, KRW, TWD e HKD.
3. **La «chiusura» giornaliera dei cambi su Yahoo non è la fine della giornata.** Corrisponde al prezzo intorno all'01:00 di Londra del giorno della barra, cioè alla sera prima a New York (vedi la sezione 5). La barra del giorno d somiglia di più al dato FRED (mezzogiorno di New York) del giorno d−1: la differenza mediana è più bassa con la barra del giorno dopo per 7 coppie su 8.
4. **CNH=X non è utilizzabile.** Yahoo non ha storia giornaliera, né settimanale né mensile: c'è una sola barra, quella di oggi, con qualunque intervallo di date. Esiste solo la serie oraria degli ultimi 730 giorni, dal 19/01/2024. **CNY=X può sostituirlo**, ma va controllato contro FRED DEXCHUS. Negli ultimi due anni CNH e CNY differiscono in mediana dello 0,16% (95° percentile 0,71%, massimo 1,92%); sulle variazioni a 20 sedute la differenza mediana è di 0,19 punti percentuali.
5. **Gli ETF in dollari sono puliti.** EEM, MCHI, INDA, EWZ, EWY, EWT, EWW, EZA e ACWI non hanno barre vuote né buchi rispetto al calendario NYSE, e i loro salti grandi sono crisi vere (2008, marzo 2020, 26/10/2026 per EWZ). Due hanno la storia corta: MCHI dal 31/03/2011, INDA dal 03/02/2012.
6. **I dati degli indici emergenti nell'app sono coerenti con Yahoo.** Non ci sono chiusure nulle né buchi di breadth dopo l'inizio. Tutte le sedute di Yahoo sono nell'app e nessuna chiusura differisce oltre lo 0,5%. Restano i due problemi noti:
   - **CSI 300**: manca il 24/10/2025, perché la barra dell'ETF è ancora vuota su Yahoo;
   - **EEM**: 68 sedute con meno del 90% dei titoli, tutte entro 7 giorni da una chiusura di Shanghai.

## 1. Cambi e dollaro su Yahoo (dal 2006)

| Serie | Prima data | Giorni lun-ven mancanti | Periodi di almeno 3 giorni | Valori uguali al giorno prima | Salti oltre 5σ (di cui ≥ 2%) | Picchi che rientrano | Errori di scala | Barre con la data sbagliata (metodo della pipeline) |
|---|---|---|---|---|---|---|---|---|
| CNY=X | 2001-06-25 | 15 (0,28%) | 0 | 338 (6,23%), serie più lunga 10 | 203 (4) | 32 | 0 | 778 su 6.352 |
| CNH=X | — | nessuna storia giornaliera | — | — | — | — | — | — |
| INR=X | 2003-12-01 | 34 (0,63%) | 1 (17 giorni dal 01/08/2008) | 71 (1,31%) | 52 (22) | 8 | 0 | 708 su 5.947 |
| BRL=X | 2003-12-01 | 42 (0,78%) | 1 (17 giorni dal 01/08/2008) | 54 (1,01%) | 41 (41) | 9 | 0 | 666 su 5.532 |
| KRW=X | 2003-12-01 | 34 (0,63%) | 1 (17 giorni dal 01/08/2008) | 43 (0,80%) | 112 (107) | 40 | 0 | 708 su 5.948 |
| TWD=X | 2004-03-24 | 34 (0,64%) | 1 (17 giorni dal 01/08/2008) | 162 (3,05%) | 283 (232) | 110 | 2 | 668 su 5.455 |
| MXN=X | 2003-12-01 | 11 (0,20%) | 0 | 12 (0,22%) | 49 (48) | 6 | 0 | 709 su 5.971 |
| ZAR=X | 2003-12-01 | 18 (0,33%) | 0 | 3 (0,06%) | 14 (14) | 5 | 0 | 711 su 5.964 |
| HKD=X | 2001-07-16 | 34 (0,63%) | 1 (17 giorni dal 01/08/2008) | 112 (2,07%) | 219 (0) | 46 | 0 | 756 su 6.408 |
| DX-Y.NYB | 1971-01-04 | 2 sedute NYSE mancanti | 0 | 63 (1,20%) | 12 (1) | 1 | 0 | 1.738 su 14.180 |

Come leggere la tabella:
- **Salti oltre 5σ**: si usa una sigma robusta sui 250 giorni precedenti. Per HKD (cambio ancorato) e CNY (bande strette) la sigma è minima, quindi molti «5σ» sono movimenti di qualche centesimo di punto. Conta la colonna «≥ 2%».
- **Picco che rientra**: un salto oltre 5σ annullato per almeno il 70% il giorno dopo. È il segno tipico di un errore di stampa.
- **Errore di scala**: un valore oltre 1,5 volte (o sotto 1/1,5) la mediana delle 21 osservazioni intorno.
- **Barre con la data sbagliata**: barre a cui `scripts/lib/yahoo.js` (timestamp più il gmtoffset di oggi) darebbe una data diversa da quella del fuso della borsa (`Europe/London` per i cambi, `America/New_York` per DX-Y.NYB). Vedi i rischi più sotto.

Valori anomali principali, da trattare come mancanti:
- **ZAR=X**:
  - 15/11/2024: 14,86 contro 18,23 il giorno prima e 18,17 il giorno dopo;
  - 15/01/2025: 16,50;
  - 17/01/2025: 15,43, contro circa 18,7–19,0.
- **TWD=X**: 1,80 il 25/10/2011 (circa 29–30 prima e dopo) e 3,67 il 31/12/2014 (circa 31). Nel 2013 è sotto FRED in mediana dell'1,6% per tutto l'anno, e dal 2013 al 2016 ha 343 giorni oltre l'1% di differenza.
- **KRW=X**: nel 2006-2007 ci sono 40 picchi del 3-4% che rientrano il giorno dopo (per esempio 917,63 il 15/08/2006, tra 953,66 e 949,34; FRED 965,5). Nel 2006 la differenza mediana da FRED è −1,25% e i giorni oltre l'1% sono 194.
- **INR=X**: dal 26/01 al 01/02/2012 ci sono valori tondi o ripetuti (50,000; 52,493 due volte), con differenze da FRED del 6%.
- **CNY=X**:
  - 18/07/2011: 5,863 tra 6,434 e 6,469;
  - 30/10/2023: −2,1%, rientrato il giorno dopo;
  - 34 giorni oltre l'1% da FRED nel 2023-2024;
  - un fermo di 10 osservazioni uguali dal 23/05 al 05/06/2025.
- **BRL=X**: 2,952 il 23/03/2006 contro 2,155 il giorno dopo (−27%); picchi nel 2006 e nell'ottobre 2008.

## 2. FRED (dal 2006)

| Serie | Prima data | Ultima | Ritardo oggi (giorni di calendario / lavorativi) | Righe vuote (di cui non festive) | Valori uguali al giorno prima | Salti oltre 5σ (≥ 2%) | Picchi che rientrano |
|---|---|---|---|---|---|---|---|
| DEXCHUS | 1981-01-02 | 2026-10-30 | 6 / 4 | 216 (8) | 311 (5,96%) | 185 (0) | 21 |
| DEXINUS | 1973-01-02 | 2026-10-30 | 6 / 4 | 217 (9) | 173 (3,32%) | 58 (17) | 3 |
| DEXBZUS | 1995-01-02 | 2026-10-30 | 6 / 4 | 216 (8) | 25 (0,48%) | 34 (34) | 5 |
| DEXKOUS | 1981-04-13 | 2026-10-30 | 6 / 4 | 216 (8) | 82 (1,57%) | 47 (32) | 3 |
| DEXTAUS | 1983-10-03 | 2026-10-30 | 6 / 4 | 219 (8) | 418 (8,01%) | 61 (6) | 5 |
| DEXMXUS | 1993-11-08 | 2026-10-30 | 6 / 4 | 216 (8) | 14 (0,27%) | 46 (46) | 9 |
| DEXSFUS | 1980-01-02 | 2026-10-30 | 6 / 4 | 216 (8) | 23 (0,44%) | 7 (7) | 0 |
| DEXHKUS | 1981-01-02 | 2026-10-30 | 6 / 4 | 216 (8) | 302 (5,79%) | 226 (0) | 28 |
| DTWEXEMEGS | 2006-01-02 | 2026-10-30 | 6 / 4 | 213 (27) | 2 (0,04%) | 36 (6) | 3 |
| DTWEXBGS | 2006-01-02 | 2026-10-30 | 6 / 4 | 213 (27) | 0 | 28 (4) | 0 |
| DFII10 | 2003-01-02 | 2026-11-03 | 2 / 2 | 223 (14) | 486 (9,32%) | 14 (8, variazioni ≥ 20 pb) | 0 |

**Frequenza e uscita.** Tutte le serie sono **giornaliere**: l'intervallo mediano tra due osservazioni è di 1 giorno e la pagina FRED dice «Daily». Per DTWEXEMEGS e DTWEXBGS la prima osservazione giornaliera è il 02/01/2006. L'H.10 (le DEX* e i due indici del dollaro) è stato aggiornato lunedì 02/11/2026 alle 15:51 CST, e la prossima uscita indicata è lunedì 09/11/2026. DTWEXEMEGS è quindi **una serie giornaliera pubblicata una volta a settimana**. DFII10 esce ogni giorno (aggiornato il 04/11, prossima uscita il 05/11).

**Righe vuote.**
- Per le DEX* sono quasi tutte festività federali USA. Le 8 non festive sono il 26/12/2014, il 24/12/2018 e il 24/12/2020 (chiusure straordinarie), il 20/01/2017 e il 20/01/2021 (insediamenti), il 14/01/2019, il 20/02/2019 e il 27/11/2020. DEXINUS ha in più il 26/01/2010.
- Per i due indici del dollaro le righe vuote non festive sono 27. Ci sono due periodi di almeno 3 giorni: dall'8 all'11/02/2010 (la tempesta di neve che chiuse Washington) e dal 22 al 26/01/2016. Al contrario, dal 2006 al 2008 gli indici hanno un valore anche in 32 festività USA.
- Le 14 righe vuote non festive di DFII10 sono tutte il Venerdì santo, quando il mercato dei titoli USA chiude.

**Anomalie.** Nelle DEX* non ci sono inversioni né errori di scala. I salti oltre il 2% cadono nel 2008, nel 2016 (MXN, elezioni USA) e il 26/10/2026 (BRL +7,9%, confermato da EWZ −19,8% e da BRL=X), cioè in fasi di mercato vere. I «5σ» di DEXCHUS e DEXHKUS sono movimenti minimi, dovuti a cambi gestiti.

## 3. Confronto Yahoo e FRED (stessa data, dal 2006)

Differenza = Yahoo / FRED − 1.

| Coppia | Date comuni | Differenza mediana | 95° percentile | Massima (data) | Giorni oltre 0,5% | Giorni oltre 1% | Mediana con la barra Yahoo del giorno dopo | Differenza sulle variazioni a 20 sedute (mediana / 95°) |
|---|---|---|---|---|---|---|---|---|
| CNY=X / DEXCHUS | 5.209 | 0,13% | 0,48% | 9,36% (18/07/2011) | 244 | 53 | 0,05% | 0,11 / 0,69 punti |
| CNH=X / DEXCHUS | — | nessuna storia giornaliera su Yahoo | | | | | | |
| INR=X / DEXINUS | 5.188 | 0,17% | 0,79% | 6,28% (27/01/2012) | 731 | 134 | 0,09% | 0,25 / 1,12 punti |
| BRL=X / DEXBZUS | 5.126 | 0,37% | 1,88% | 8,84% (26/10/2026) | 2.102 | 907 | 0,29% | 0,53 / 2,48 punti |
| KRW=X / DEXKOUS | 5.188 | 0,31% | 1,39% | 4,96% (15/08/2006) | 1.554 | 577 | 0,17% | 0,40 / 1,69 punti |
| TWD=X / DEXTAUS | 5.093 | 0,17% | 2,39% | 94,02% (25/10/2011) | 784 | 411 | 0,13% | 0,23 / 2,33 punti |
| MXN=X / DEXMXUS | 5.211 | 0,26% | 1,09% | 8,83% (09/10/2008) | 1.225 | 310 | 0,30% | 0,37 / 1,51 punti |
| ZAR=X / DEXSFUS | 5.204 | 0,47% | 1,65% | 18,53% (15/11/2024) | 2.476 | 978 | 0,23% | 0,66 / 2,33 punti |
| HKD=X / DEXHKUS | 5.188 | 0,01% | 0,08% | 1,72% (21/03/2008) | 5 | 3 | 0,01% | 0,02 / 0,11 punti |

**Cosa spiega le differenze oltre l'1%.** Per ogni giorno si controlla, in quest'ordine: Yahoo ricopiato dal giorno prima, picco Yahoo, picco FRED, valore Yahoo del giorno prima o dopo più vicino a FRED (sfasamento di un giorno), FRED che si muove oltre l'1% quel giorno (l'ora diversa basta a spiegarlo).

| Coppia | Sfasamento di un giorno | Mercato mosso | Picco Yahoo | Yahoo ricopiato | Non spiegato |
|---|---|---|---|---|---|
| CNY | 31 | 0 | 0 | 3 | 19 |
| INR | 105 | 13 | 6 | 7 | 3 |
| BRL | 738 | 95 | 8 | 14 | 52 |
| KRW | 333 | 21 | 12 | 5 | 206 (194 nel 2006) |
| TWD | 180 | 12 | 7 | 8 | 204 (2013-2016) |
| MXN | 252 | 35 | 3 | 0 | 20 |
| ZAR | 883 | 67 | 4 | 2 | 22 |
| HKD | 0 | 0 | 3 | 0 | 0 |

**Lettura.**
- La causa principale è l'**ora di rilevazione**. FRED è il cambio di mezzogiorno a New York. Yahoo è il prezzo all'inizio della giornata di Londra, cioè la sera prima a New York (sezione 5). Per questo la correlazione dei rendimenti giornalieri nella stessa data è bassa: da 0,07 per CNY a 0,46 per MXN, e 0,004 per TWD a causa degli errori. Sulle variazioni a 20 sedute, che sono l'uso probabile nell'app, la differenza mediana scende a 0,1–0,7 punti.
- **Festività.** In circa 210 giorni festivi USA Yahoo ha il cambio e FRED no. Al contrario, FRED ha date che mancano su Yahoo: 10 per CNY, 30 per INR, 93 per BRL, 31 per KRW, 123 per TWD, 8 per MXN, 15 per ZAR e 31 per HKD. Sono i buchi di Yahoo, compreso agosto 2008.
- La parte «non spiegata» è concentrata in **KRW=X nel 2006** e **TWD=X dal 2013 al 2016**: sono periodi di Yahoo con livelli sbagliati.

## 4. CNH contro CNY

- **CNH=X su Yahoo**: c'è 1 barra giornaliera, quella di oggi. Sono stati provati `range` max, 10y, 5y, 2y e 1y, `period1`, gli intervalli 1d, 1wk e 1mo e anche `USDCNH=X`. La serie oraria ha 17.511 barre (381 vuote) dal 19/01/2024 al 05/11/2026, cioè 730 giorni lavorativi: troppo poco per il backtest, e non è una serie giornaliera ufficiale.
- **CNH (ultima ora di ogni giorno di Londra) contro CNY=X, stesso giorno**: 725 giorni. Differenza mediana 0,16%, media con segno +0,08%, 95° percentile 0,71%, massimo 1,92%. Sulle variazioni a 20 sedute la differenza mediana è di 0,19 punti (95° percentile 0,99, massimo 1,81).
- **CNH contro DEXCHUS**: 698 giorni, differenza mediana 0,08%, massimo 1,10%.
- **CNY=X prima del 21/07/2005** (fine dell'ancoraggio): 811 osservazioni con 26 valori distinti tra 8,2468 e 8,2778. Dal 2006 si può usare.
- **Conclusione**: si usa **CNY**. Per la storia meglio DEXCHUS, che ha la stessa fonte delle altre DEX* e nessun errore di stampa; per gli ultimi giorni CNY=X, controllato. Va detto che è il cambio onshore e non quello offshore (CNH), che segue più da vicino gli investitori esteri: la differenza tipica è di qualche decimo di punto.

## 5. A che ora corrisponde la «chiusura» dei cambi su Yahoo

Su 3 mesi di barre orarie (da agosto a novembre 2026) la chiusura giornaliera coincide con la chiusura della barra oraria che inizia alla mezzanotte di Londra della barra stessa, cioè con il prezzo verso l'01:00 di Londra:

| Cambio | Ora più vicina | Differenza mediana | Barra delle 22-23 di Londra |
|---|---|---|---|
| BRL | 00-01 | 0,022% | 0,416% |
| MXN | 00-01 | 0,015% | 0,339% |
| ZAR | 00-01 | 0,009% | 0,303% |
| TWD | 00-01 | 0,004% | 0,167% |
| KRW | 23-00 del giorno prima | 0,050% | 0,275% |
| INR | 23-00 del giorno prima | 0,030% | 0,116% |
| CNY | 20-21 del giorno prima | 0,008% | 0,148% |

La barra Yahoo del giorno d contiene quindi il cambio della sera prima a New York, prima dell'apertura asiatica di d. È coerente con il confronto con FRED: la barra del giorno dopo è più vicina al mezzogiorno di New York del giorno d per 7 coppie su 8; fa eccezione MXN.

## 6. Festività locali

Giorni in cui la borsa locale è chiusa e non è festa negli USA, dal 2006:

| Cambio (borsa) | Giorni chiusi | Yahoo con barra | Yahoo uguale al giorno prima | FRED con valore | Yahoo uguale al giorno prima, borsa aperta |
|---|---|---|---|---|---|
| CNY (Shanghai) | 354 | 354 | 131 (37,0%) | 354 | 3,98% |
| INR (Nifty, dal 2007) | 268 | 265 | 7 (2,6%) | 267 | 1,09% |
| BRL (Bovespa) | 229 | 221 | 10 (4,4%) | 223 | 0,72% |
| KRW (KOSPI) | 265 | 263 | 4 (1,5%) | 263 | 0,76% |
| TWD (TAIEX) | 309 | 299 | 21 (6,8%) | 308 | 2,73% |
| HKD (Hang Seng) | 260 | 254 | 5 (1,9%) | 259 | 2,05% |

Il cambio esiste quasi sempre anche quando la borsa locale è chiusa. Lo yuan di Yahoo però resta fermo nel 37% di quei giorni (Capodanno lunare, Golden Week). Esempi: CNY=X fermo dal 28/04 al 05/05/2006 e dal 29/09 al 06/10/2006.

## 7. Dati dell'app: indici emergenti

| Indice (prezzo) | Prima seduta | Ultima | Chiusure nulle | Breadth dal | Sedute senza breadth dopo l'inizio | Intervalli oltre 5 giorni | n sotto il 90% della mediana vicina | Sedute Yahoo assenti nell'app | Chiusure diverse da Yahoo oltre 0,5% | Barre Yahoo vuote |
|---|---|---|---|---|---|---|---|---|---|---|
| CSI 300 (510300.SS) | 2012-05-04 | 2026-10-30 | 0 | 2012-06-01 | 0 | 42 | 0 | 0 | 0 | 13 |
| Nifty 50 (^NSEI) | 2007-09-17 | 2026-10-30 | 0 | 2007-10-01 | 0 | 1 | 0 | 0 | 0 | 31 |
| Ibovespa (^BVSP) | 2000-01-03 | 2026-10-30 | 0 | 2008-11-03 | 0 | 1 | 0 | 0 | 0 | 87 |
| KOSPI 200 (^KS11) | 2000-01-04 | 2026-10-30 | 0 | 2006-12-01 | 0 | 26 | 0 | 0 | 0 | 100 |
| Taiwan (^TWII) | 2000-01-04 | 2026-10-30 | 0 | 2003-01-02 | 0 | 31 | 0 | 0 | 0 | 98 |
| Hang Seng (^HSI) | 2000-01-03 | 2026-10-30 | 0 | 2008-09-01 | 0 | 13 | 0 | 0 | 0 | 79 |
| EEM (EEM) | 2003-04-14 | 2026-10-30 | 0 | 2011-03-01 | 0 | 0 | 68 | 0 | 0 | 0 |

- Gli intervalli oltre 5 giorni sono festività lunghe: quelli massimi sono di 11 giorni per CSI 300 (Capodanno lunare 2020, Golden Week 2023) e KOSPI (2017), e di 13 giorni per Taiwan (Capodanno lunare 2023).
- **CSI 300 fermo.** Ci sono 13 sedute di Shanghai senza barra dell'ETF su Yahoo. In tutte e 13 Yahoo ha la barra, ma con la chiusura vuota: 12 sono dal 7 al 24/05/2012, nelle prime settimane dell'ETF (l'app parte dal 04/05/2012 e quelle sedute mancano) e una è il **24/10/2025**, che ancora oggi è vuota ed è assente nell'app, con prezzo e breadth. La barra vuota del 19/10/2026 segnalata dall'audit 0.9.8 oggi è piena e la seduta c'è nell'app: Yahoo l'ha corretta dopo. Il problema quindi a volte si risolve da solo e a volte no. L'indice 000300.SS su Yahoo ha 1 sola barra (nessuna storia).
- **EEM nelle feste cinesi.** Ci sono 68 sedute con n sotto il 90% della mediana delle 21 sedute intorno, da 2 a 6 all'anno dal 2011. Tutte e 68 cadono entro 7 giorni da un giorno lavorativo in cui Shanghai era chiusa. I casi peggiori sono 612 titoli contro 1.099 il 14/02/2024 e 604 contro 1.078 il 26/01/2023. Confermato quanto già scritto in `ricerca/indici-breadth50/dati.md`.

## 8. Quali serie usare

| Uso | Serie consigliata | Perché | Da evitare |
|---|---|---|---|
| Cambio locale/dollaro, storia e backtest | **DEXCHUS, DEXINUS, DEXBZUS, DEXKOUS, DEXTAUS, DEXMXUS, DEXSFUS** (FRED) | Complete dal 2006, buchi solo nelle festività USA, nessun errore di stampa, un'ora di rilevazione unica (mezzogiorno di New York) | Yahoo per la storia: errori fino al −18% (ZAR) e al −94% (TWD), e anni sfalsati (KRW 2006, TWD 2013) |
| Cambio, ultimi giorni (dopo l'ultimo venerdì FRED) | CNY=X, INR=X, BRL=X, KRW=X, TWD=X, MXN=X, ZAR=X, solo con un filtro dei picchi e un controllo contro FRED appena esce | FRED arriva fino a 10 giorni dopo | — |
| Cina | **CNY** (DEXCHUS, poi CNY=X) | CNH=X non ha storia | CNH=X |
| Hong Kong | nessuna | HKD è ancorato tra 7,75 e 7,85 (differenza mediana tra le fonti 0,01%): non dice nulla | HKD=X, DEXHKUS |
| Dollaro contro emergenti | **DTWEXEMEGS** | Giornaliero dal 02/01/2006, completo e senza picchi; esce il lunedì | DX-Y.NYB come sostituto: è il dollaro contro valute sviluppate, soprattutto l'euro |
| Dollaro largo | DTWEXBGS (stesse caratteristiche) oppure DX-Y.NYB se serve il dato del giorno | DX-Y.NYB è completo sulle sedute NYSE (2 mancanti, 6 in più) | — |
| Rendimento reale USA | **DFII10** | Esce ogni giorno con 1-2 giorni di ritardo; mancano solo le festività e il Venerdì santo | — |
| Indici emergenti in dollari | EEM, EWZ, EWY, EWT, EWW, EZA, ACWI; MCHI dal 2011, INDA dal 2012 | Nessun buco né barra vuota | — |

## 9. Approssimazioni da dichiarare nell'app

1. **Cambi FRED**: tasso di mezzogiorno a New York (H.10 della Federal Reserve), pubblicato il lunedì. L'ultimo valore può avere fino a una settimana, e di più se il lunedì è festivo.
2. **Cambi Yahoo** (se usati per gli ultimi giorni): sono il prezzo di inizio giornata a Londra, quindi la sera prima a New York; non coincidono con la chiusura della borsa locale. Per una borsa asiatica la chiusura del giorno d sta tra la barra Yahoo d e la barra d+1.
3. **Cina**: si usa lo yuan onshore (CNY), non quello offshore (CNH), che su Yahoo non ha storia.
4. **Festività**: nei giorni di chiusura della borsa locale il cambio c'è lo stesso (lo yuan spesso fermo). Nelle festività USA FRED non ha il dato, che resta mancante («—»).
5. **Dollaro contro emergenti**: è l'indice della Fed (DTWEXEMEGS), con pesi commerciali: comprende Messico, Cina e altri, non i pesi di MSCI EM.
6. **Indici emergenti**: restano le note già nell'app (CSI 300 con l'ETF e sedute mancanti quando Yahoo ha la barra vuota, EEM in dollari, breadth di EEM falsata nelle feste cinesi).

## 10. Rischi per la pipeline notturna

1. **FRED risponde spesso 503.** Durante lo scarico del 05/11/2026 (osservazione, non statistica) tutte le richieste a `fredgraph.csv`, alle pagine delle serie e ad ALFRED sono fallite per alcuni minuti di fila, e con curl la connessione si chiudeva. Servono tentativi ripetuti con attesa crescente (come `fetchFred` in `scripts/fetch_data.js`) e, se FRED non risponde, si tengono i valori già pubblicati.
2. **Ritardo settimanale.** Con l'H.10 la serie è ferma da martedì a lunedì: `scripts/check_fresh.js` deve accettare almeno 10 giorni di calendario per queste serie (11 con un lunedì festivo), e l'app deve mostrare la data dell'ultimo dato.
3. **Date dei cambi su Yahoo.** `scripts/lib/yahoo.js` data le barre con il gmtoffset *attuale*. Le barre dei cambi sono a mezzanotte di Londra (alle 23:00 UTC con l'ora legale). Lanciato d'inverno, il metodo sposta di un giorno indietro tutte le barre dell'ora legale: 666–778 barre per cambio su circa 6.000, che finiscono di domenica al posto del lunedì. Per DX-Y.NYB sono 1.738 su 14.180. Con il metodo della pipeline finiscono di sabato o domenica 749 barre di CNY=X, e tra 653 e 746 degli altri cambi (`dataConMetodoPipeline` in `risultati.json`). Per i nuovi cambi bisogna datare con `exchangeTimezoneName`. **Da verificare a parte**: la stessa funzione serve già a `toCurrency` in `fetch_data.js` (cambi EURUSD=X e simili per `prices_global.json`) e alle serie macro.
4. **Errori di stampa su Yahoo** di −18% (ZAR, 2024-2025) e −94% (TWD): un'alert o un livello calcolato sul cambio del giorno scatterebbe per sbaglio. Serve un filtro dei «picchi che rientrano», o meglio il confronto con FRED quando arriva. Un picco va tolto (dato mancante), non corretto.
5. **Simboli che perdono la storia.** CNH=X e 000300.SS hanno una sola barra; un simbolo oggi completo potrebbe smettere di esserlo. Bisogna controllare il numero di barre scaricate e non sovrascrivere la storia pubblicata con una serie più corta.
6. **Barre vuote dell'ETF del CSI 300.** Il 24/10/2025 manca ancora; il 19/10/2026 è stato corretto da Yahoo in seguito. La pipeline non deve fermarsi né riempire: la seduta resta vuota finché Yahoo non la corregge.
7. **Allineamento delle date.** Cambi (giorni lavorativi di Londra), FRED (giorni federali USA), indici locali e ETF americani hanno calendari diversi. Nei confronti a 20 sedute serve una regola esplicita, per esempio il calendario dell'indice locale e l'ultimo cambio pubblicato non successivo, detta nella nota. Non si interpola.
