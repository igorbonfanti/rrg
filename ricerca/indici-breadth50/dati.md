# Breadth a 50 e a 20 sedute degli indici: i dati sono affidabili per un backtest sui minimi locali?

Fase di ricerca (31/10/2026): verifica dei dati, nessun backtest e nessuna modifica all'app. Tutti i numeri vengono da tre script, che scrivono `dati.json`:

| Script | Cosa fa | Rete |
|---|---|---|
| `script/dati.mjs` | copertura, buchi, sedute ricopiate, titoli «giovani», coerenza, allineamento con il prezzo, salti; confronto con i valori pubblicati da First Trust | no |
| `script/ricalcolo.mjs CACHE` | ricalcola pct20/50/200 dai prezzi dei membri (DAX, CAC 40, SMI, Dow Jones su tutta la storia; S&P 500 dal 06/2024) | Yahoo |
| `script/bias.mjs CACHE` | breadth con i soli membri di oggi contro la breadth d'epoca (Nasdaq-100, S&P 500, Dow Jones) | Yahoo |

`script/lib.mjs` contiene le funzioni comuni: la regola di `scripts/backfill_indices.py` (`breadth_for`) riscritta in JS e i prezzi in cache. Uso: `node ricerca/indici-breadth50/script/dati.mjs`, poi gli altri due con una cartella di cache fuori dal repository.

## Come sono fatti i dati (promemoria)

- Gli indici si leggono con `indexSeries` sul calendario del prezzo dell'indice. Per S&P 500, Nasdaq-100 e Dow Jones la composizione è quella di ogni data; per gli altri 19 si usano i membri di oggi.
- Un titolo è «sopra» se ha almeno N sedute e chiude sopra la media delle ultime N chiusure (rettificate per gli split, non per i dividendi).
- **Denominatore**: n conta tutti i membri quotati quel giorno, cioè con l'ultima seduta del titolo al massimo 5 giorni prima, **anche quelli con meno di N sedute**. Un titolo appena quotato conta quindi «sotto» per 49 sedute nella pct50 e per 199 nella pct200.
- Lo storico viene dalla ricostruzione di ottobre 2026; da allora la pipeline serale ricalcola le ultime 5 sedute. Le borse europee hanno la breadth fino al 29/10 e il prezzo fino al 30/10: l'ultima seduta può non avere ancora la breadth.

## 1. Copertura

Nessun indice ha sedute senza breadth tra la prima e l'ultima. Gli intervalli di più di 5 giorni tra due sedute sono tutti feste lunghe: Natale in Europa, Golden Week e Capodanno in Giappone e in Cina, Capodanno lunare a Taiwan e in Corea, la chiusura dell'11/09/2001 per il Dow. L'unico caso dubbio è l'Euro Stoxx 50, con un buco dal 19 al 25/03/2008: manca anche il giovedì prima di Pasqua. In nessun anno completo mancano sedute rispetto alla mediana dell'indice. Non ci sono valori impossibili (pct fuori da 0-100, n > membri, conteggi > n) né nei 22 indici né nei 12 settori.

Colonne della tabella:

- **n mediano**: numero mediano di titoli nel denominatore.
- **punti/titolo** = 100 / n mediano: di quanto si muove la percentuale quando un titolo cambia lato.
- **copertura**: n diviso i membri, alla prima seduta.
- **≥80% dal**: prima seduta con almeno l'80% dei membri quotati.
- **giovani 50**: quota massima di n fatta di titoli con meno di 50 sedute, e quante sedute hanno più del 5% di titoli così. Si stima dai nuovi massimi di n, solo per gli indici con i membri di oggi.

| Indice | Comp. | Breadth dal | n mediano | punti/titolo | copertura | ≥80% dal | giovani 50 (max; sedute >5%) |
|---|---|---|---|---|---|---|---|
| S&P 500 | epoca | 03/01/2005 | 462 | 0,2 | 0,64 | 01/07/2009 | — |
| Nasdaq-100 | epoca | 02/01/2008 | 83 | 1,2 | 0,59 | 19/06/2017 | — |
| Dow Jones | epoca | 03/01/2000 | 29 | 3,4 | 0,87 | 03/01/2000 | — |
| Nikkei 225 | oggi | 04/01/2001 | 214 | 0,5 | 0,84 | 04/01/2001 | 1,5%; 0 |
| STOXX 600 | oggi | 02/01/2006 | 536 | 0,2 | 0,74 | 29/04/2010 | 1,7%; 0 |
| FTSE 100 | oggi | 02/01/2001 | 89 | 1,1 | 0,72 | 23/09/2004 | 3,9%; 0 |
| DAX | oggi | 02/01/2001 | 35 | 2,9 | 0,70 | 11/12/2006 | 3,4%; 0 |
| CAC 40 | oggi | 02/01/2001 | 38 | 2,6 | 0,78 | 03/09/2001 | 8,8%; 49 |
| SMI | oggi | 03/01/2001 | 16 | 6,3 | 0,70 | 24/03/2006 | 6,7%; 245 |
| Russell 2000 | oggi | 01/09/2017 | 1.738 | 0,1 | 0,63 | 29/03/2021 | 3,2%; 0 |
| S&P/TSX 60 | oggi | 01/02/2000 | 53 | 1,9 | 0,62 | 03/12/2007 | 6,5%; 66 |
| Euro Stoxx 50 | oggi | 02/04/2007 | 47 | 2,1 | 0,88 | 02/04/2007 | 2,2%; 0 |
| FTSE MIB | oggi | 01/04/2005 | 36 | 2,8 | 0,63 | 03/07/2014 | 6,3%; 72 |
| IBEX 35 | oggi | 01/03/2007 | 32 | 3,1 | 0,63 | 24/01/2011 | 11,5%; 88 |
| Hang Seng | oggi | 01/09/2008 | 63 | 1,6 | 0,61 | 13/12/2018 | 6,3%; 41 |
| CSI 300 | oggi | 01/06/2012 | 259 | 0,4 | 0,65 | 08/05/2018 | 3,3%; 0 |
| KOSPI 200 | oggi | 01/12/2006 | 159 | 0,6 | 0,61 | 11/11/2016 | 3,6%; 0 |
| Taiwan (MSCI) | oggi | 02/01/2003 | 71 | 1,4 | 0,66 | 25/06/2008 | 8,3%; 49 |
| Nifty 50 | oggi | 01/10/2007 | 45 | 2,2 | 0,80 | 01/10/2007 | 4,8%; 0 |
| S&P/ASX 200 | oggi | 01/05/2008 | 165 | 0,6 | 0,63 | 11/04/2016 | 3,6%; 0 |
| MSCI EM (EEM) | oggi | 01/03/2011 | 938 | 0,1 | 0,63 | 08/01/2019 | 3,2%; 0 |
| Ibovespa | oggi | 03/11/2008 | 62 | 1,6 | 0,64 | 02/04/2015 | 7,5%; 39 |

**Sedute ricopiate.** Le sedute con l'indice aperto e la borsa dei membri chiusa sono il caso tipico: tutti i conteggi uguali alla seduta prima e il prezzo dell'indice fermo. Ce ne sono al massimo 3 per indice (SMI 3, S&P/TSX 60 3, Euro Stoxx 50 e Taiwan 1, gli altri 0).

Conteggi uguali alla seduta prima con il prezzo che si muove sono invece frequenti negli indici piccoli: SMI 669, Dow 221, DAX 186, FTSE MIB 175, IBEX 173, CAC 146. Negli indici grandi sono quasi assenti: S&P 500 1, STOXX 600 0, Russell 0, EEM 0, Nikkei 1. Per DAX, CAC, SMI e Dow il ricalcolo dai prezzi (punto 3) dà gli stessi conteggi in tutte le sedute: sono pareggi veri, non copie.

**Valori costanti.** Le serie più lunghe di pct50 identica sono fasi di crollo o di euforia, per esempio:

- DAX al 2,6% (1 titolo su 38) per 21 sedute fino al 06/04/2020;
- SMI al 93,3% per 22 sedute nel 2004;
- Euro Stoxx 50 al 2,2% per 20 sedute ad agosto 2011.

Per DAX e SMI sono confermate dal ricalcolo.

**Due problemi veri.**

1. **MSCI EM (EEM)**: in 68 sedute n scende sotto il 90% della mediana delle sedute vicine. Succede ogni anno nella Golden Week cinese (ottobre) e nel Capodanno lunare: i titoli cinesi fermi da più di 5 giorni escono da n (per esempio 466 titoli invece di 780 il 26/01/2012, 689 invece di 1.104 il 07/10/2024). Nelle sedute di entrata e di uscita da questi cali la pct50 si muove in media di 7,0 punti, contro 2,6 di una seduta qualsiasi, con salti fino a ±16,4 punti (26/01/2012, 06/10/2015, 07/10/2024). Vanno trattate come mancanti nel backtest. La pipeline serale pubblica una seduta solo con almeno il 75% dei titoli aggiornati: d'ora in poi queste sedute resteranno probabilmente vuote, mentre nello storico ci sono.
2. **Titoli giovani nel denominatore**: in alcune finestre una quota visibile di n non può essere sopra la media a 50: IBEX dicembre 2007 (fino all'11,5%), CAC settembre 2001 (8,8%), Taiwan dicembre 2007 (8,3%), Ibovespa dicembre 2009 (7,5%), SMI 2001 (6,7%), FTSE MIB luglio 2014 (6,3%), Hang Seng febbraio 2021 (6,3%). Nella pct200 la finestra è quattro volte più lunga e la quota arriva al 15,4% (IBEX). L'effetto abbassa la pct50 al massimo di quella quota moltiplicata per la frazione di titoli sopra la media. Vicino ai minimi, con la breadth bassa, conta poco.

**Settori** (`data/breadth.json`, pct50): stessa assenza di buchi e di valori impossibili. Nei primi anni però i settori piccoli hanno pochissimi titoli. Real Estate ha 3 titoli su 5 nel 2005, 11 nel 2008-2009, 14-15 fino al 2012. Communication Services ne ha 11-18 fino al 2014. Su questi settori la pct50 prima del 2010 si muove a scatti di 7-33 punti (100 diviso il numero di titoli).

## 2. Coerenza interna

- **Allineamento con il prezzo**: la correlazione tra la variazione giornaliera della pct20 e il rendimento dell'indice nello stesso giorno va da 0,60 a 0,81. Con il rendimento del giorno prima o del giorno dopo è tra −0,06 e +0,05. Le date della breadth e del prezzo coincidono, senza sfasamenti di una seduta. **Eccezione: EEM**, con 0,44 nello stesso giorno e 0,29 col giorno prima. L'ETF chiude a New York dopo le borse asiatiche, quindi la breadth di oggi reagisce anche alle notizie di ieri sera americana. Nel backtest su EEM il minimo del prezzo e quello della breadth possono distare una seduta per costruzione.
- **Relazioni tra le tre breadth**: correlazione pct20-pct50 tra 0,75 e 0,79 e pct50-pct200 tra 0,60 e 0,65 in tutti gli indici, come sull'S&P 500 d'epoca (0,78 e 0,63). Le distanze più grandi sono quelle attese:
  - pct20 molto sopra la pct50 nei rimbalzi di aprile 2020 (fino a +92 punti su DAX e CAC);
  - pct50 molto sopra la pct200 nei rimbalzi di inizio 2009;
  - pct50 molto sotto la pct200 nelle correzioni dentro un rialzo (DAX −83 il 05/05/2015).

  Nessuna combinazione impossibile.
- **Salti di un giorno**: il 99° percentile di |Δpct50| va da 11 punti (EEM) a 27 (SMI, Euro Stoxx 50), in linea con i punti per titolo. I salti grandi con il prezzo quasi fermo o di segno opposto (almeno 15 punti e oltre il 98° percentile) sono 0 o 1 per indice, 4-5 su S&P/TSX 60 e SMI. Quelli di EEM (6) sono i cali di copertura descritti sopra. Per lo SMI (fino a −31 punti il 13/08/2018 con −0,3% di prezzo) il ricalcolo conferma i conteggi: con 16 titoli bastano 5 titoli vicini alla media.
- **Salti di n** (almeno il 5% in una seduta): fuori da EEM, al più uno per indice. Sono cambi di composizione (Dow 08/04/2004, Nasdaq-100 22/12/2008) o titoli che entrano nei prezzi (CAC 03/09/2001, Taiwan 31/12/2007).

## 3. Seconda fonte e ricalcolo

**Fonte pubblica indipendente.** Una serie storica libera della % sopra la media a 50 o a 20 non c'è: S5FI e S5TW stanno su StockCharts, TradingView e Barchart, e non si usano. Ho usato invece i valori interi dell'S&P 500 pubblicati da First Trust nei post «A Snapshot of Moving Averages» (dati Bloomberg). Sono trascritti a mano nello script con l'indirizzo di ciascun post, senza scraping.

| Seduta | pubbl. 50 | app 50 | pubbl. 200 | app 200 |
|---|---|---|---|---|
| 09/05/2018 | 44 | 51,1 (08/05: 45,0) | 51 | 55,2 (08/05: 52,5) |
| 12/09/2018 | 62 | 65,2 | 63 | 63,6 |
| 12/08/2019 | 36 | 36,8 | 54 | 56,5 |
| 11/10/2019 | 61 | 59,9 | 62 | 61,7 |
| 31/08/2020 | 75 | 74,8 | 61 | 61,1 |

Sulle 5 sedute con la data scritta, lo scarto assoluto medio è 2,5 punti sulla pct50 e 1,5 sulla 200. Il caso peggiore (+7,1 il 09/05/2018) torna a 1 punto con la chiusura del giorno prima: probabilmente il post usava i dati dell'8 maggio. Le due letture senza data scritta distano 0,1 e 1,6 punti dalla chiusura presunta. Le due intraday non si possono confrontare: 64 contro 54,5 la sera prima e 58,2 a fine seduta il 05/05/2020; 27 contro 42,9 e 31,2 il 20/09/2021.

Sui settori a 50 sedute, gli estremi pubblicati coincidono con l'app quasi sempre (Energy, Utilities, Staples, Industrials entro 1-4 punti). Fanno eccezione:

- 24/10/2016: Utilities 7,1 contro 3, ed Energy 71,9 contro 66, cioè 1-2 titoli;
- 12/08/2019: il post dà Utilities 57 come settore più alto, l'app ha Utilities 57,1 ma Real Estate 70.

**Ricalcolo dai prezzi dei membri** (Yahoo, regola dell'app riscritta in `lib.mjs`):

| Indice | Sedute | Conteggi identici (n, a20, a50, a200) | |Δpct50| media / max |
|---|---|---|---|
| DAX (oggi) | 6.559, 2001-2026 | 6.559 | 0 / 0 |
| CAC 40 (oggi) | 6.604, 2001-2026 | 6.604 | 0 / 0 |
| SMI (oggi) | 6.484, 2001-2026 | 6.484 | 0 / 0 |
| Dow Jones (epoca) | 6.748, 2000-2026 | 6.748 | 0 / 0 |
| S&P 500 (epoca, dal 03/06/2024) | 606 | 10 (n diverso: 13 titoli usciti senza prezzi oggi, per esempio ANSS, HES, JNPR) | 0,33 / 1,2 (pct20 0,29 / 1,7) |

Il file dell'app si rifà esattamente dai prezzi, comprese le sedute vicine ai minimi e quelle della pipeline serale: niente errori di calendario, di copia o di codice. È però la **stessa fonte di prezzi** (Yahoo). Errori di Yahoo, come split non rettificati o dividendi in azioni a Taiwan, non si vedono con questo controllo. Una seconda fonte di prezzi (Stooq) non è raggiungibile da questo ambiente.

## 4. Bias dei membri di oggi

Sui tre indici con la composizione d'epoca ho ricostruito la breadth con i soli membri di oggi, con la regola dell'app per gli indici «oggi». Scarto = oggi − epoca, in punti.

| | Nasdaq-100 (101 titoli, dal 2008) | S&P 500 (503, dal 2005) | Dow Jones (30, dal 2000) |
|---|---|---|---|
| pct20: media (p5 – p95) | +1,8 (−6,2 – +10,1) | +1,1 (−2,7 – +5,3) | +1,5 (−10,0 – +13,3) |
| pct50: media (p5 – p95) | +2,7 (−5,5 – +10,5) | +1,9 (−1,9 – +5,8) | +2,5 (−8,2 – +13,3) |
| pct200: media (p5 – p95) | +3,8 (−4,3 – +11,7) | +3,1 (−0,7 – +7,5) | +4,0 (−5,8 – +14,8) |
| pct50 con epoca < 10%: media | +2,0 | +0,9 | +5,0 |
| pct50 al minimo locale del prezzo: media / mediana | +1,7 / +1,1 (20 minimi) | +0,9 / +0,6 (17) | +1,9 / 0 (24) |
| pct20 al minimo locale: media / mediana | +1,8 / +0,1 | +0,4 / +0,1 | +2,3 / 0 |
| pct200 al minimo locale: media / mediana | +3,0 / +2,8 | +1,6 / +0,7 | +5,1 / +6,7 |
| pct50 ≤ 10 (entrate): epoca / oggi / comuni ±5 sedute | 20 / 18 / 16 | 18 / 18 / 16 | 33 / 33 / 23 |
| pct20 ≤ 10 (entrate) | 45 / 36 / 29 | 38 / 36 / 34 | 76 / 62 / 52 |
| correlazione delle variazioni giornaliere pct50 | 0,92 | 0,99 | 0,88 |

I minimi locali sono le chiusure più basse nelle 40 sedute prima e dopo, con almeno il 10% di calo dal massimo di 252 sedute.

- Con i membri di oggi la breadth risulta più alta, ma **sulla pct50 e sulla pct20 il bias è circa metà di quello sulla pct200** e vicino ai minimi si riduce ancora: sull'S&P 500 meno di un punto in media. Il minimo della breadth cade nella stessa seduta nella maggior parte dei casi (pct50: 12 su 20, 13 su 17, 20 su 24).
- Sugli indici piccoli il bias in media è contenuto, ma **i singoli episodi possono essere molto diversi**: sul Dow nel 2001-2003 la pct50 ai minimi è 0 contro 11,1 (22/03/2001), 7,4 contro 18,5 (09/10/2002) e 7,4 contro 22,2 (11/03/2003). Di 33 entrate sotto il 10% solo 23 coincidono. Una regola a soglia fissa sugli indici piccoli con i membri di oggi può quindi trovare o perdere episodi interi.
- La prova trimestrale citata nel README (pct200 +4,5 in media su 76 date) usava una regola diversa: escludeva dal denominatore i titoli con meno di 200 sedute. Con la regola dell'app, alle stesse 76 date lo scarto è +3,6 sulla pct200, +1,8 sulla pct50 e +0,5 sulla pct20.
- Limite: il bias si misura solo dove esiste la composizione d'epoca (indici americani). Per gli indici europei e asiatici con i membri di oggi è una stima per analogia. Lì la composizione è cambiata di più (Hang Seng da 50 a circa 85 titoli, EEM con le azioni cinesi A dal 2018), quindi il bias può essere maggiore.

## 5. Conclusione: cosa è usabile per il backtest

| Indice | pct50/pct20 usabile da | Avvertenze |
|---|---|---|
| S&P 500 | 2005 (meglio dal 07/2009, copertura ≥80%) | Riferimento migliore: composizione d'epoca, ricalcolo e fonte esterna coerenti. Prima del 2009 manca il 20-36% dei membri dell'epoca (usciti senza prezzi). |
| Nasdaq-100 | 2008 | Composizione d'epoca, ma copertura sotto l'80% fino al 06/2017 (mancano i titoli usciti senza prezzi). |
| Dow Jones | 2000 | 3,4 punti per titolo: soglie basse = 0-3 titoli; pareggi frequenti. |
| Nikkei 225, STOXX 600, CSI 300, KOSPI 200, ASX 200, Russell 2000 | dal «from» dell'app | Membri di oggi con molti titoli. Il bias qui non si può misurare: per analogia con l'S&P 500 ci si aspetta 1-2 punti, meno ai minimi, ma il Russell (small cap che entrano ed escono) può essere peggio. STOXX 600: 17 borse, nelle feste di una sola borsa una parte dei titoli resta ferma. KOSPI: prezzo del KOSPI intero. CSI 300: prezzo dell'ETF. Russell: solo dal 2017. |
| FTSE 100, Nifty 50, Hang Seng, Ibovespa, Taiwan | dal «from» | Bias non misurabile: per analogia con Nasdaq-100 e Dow, 2-3 punti in media e episodi singoli più incerti. Hang Seng: indice cambiato dal 2020. Taiwan: i dividendi in azioni non rettificati abbassano anche pct20 e pct50 per qualche settimana dopo lo stacco. |
| DAX, CAC 40, FTSE MIB, IBEX 35, Euro Stoxx 50, S&P/TSX 60 | dal «from», meglio da quando la copertura è ≥80% (DAX 12/2006, FTSE MIB 07/2014, IBEX 01/2011, TSX 12/2007) | 2-3 punti per titolo, membri di oggi: come il Dow, gli episodi vicini alle soglie basse possono cambiare. Finestre con titoli giovani (IBEX 2007, FTSE MIB 2014, CAC 2001). |
| SMI | solo con cautela | 16 titoli in mediana (6,3 punti per titolo), salti di 25-30 punti in un giorno, 245 sedute con più del 5% di titoli giovani. |
| MSCI EM (EEM) | dal 2011, **togliendo le 68 sedute con il calo di copertura** | Feste cinesi: n cala dal 10 al 40% e la pct50 salta fino a ±16 punti. La breadth asiatica è in anticipo di mezza seduta sul prezzo americano. |
| Settori (breadth.json) | 2005 per i settori grandi; Real Estate e Communication Services dal 2010 circa | Pochi titoli nei primi anni (Real Estate 3-11 fino al 2009). |

**Avvertenze da scrivere nel backtest e, se si arriva all'app, nel testo:**

1. Storia ricostruita con i membri di oggi per 19 indici su 22. Sulla pct50 il bias stimato sui tre indici americani è di +1,9/+2,7 punti in media e +0,9/+1,9 ai minimi locali, circa metà di quello della pct200. Sugli indici piccoli i singoli episodi possono cambiare: sul Dow, 23 entrate sotto il 10% in comune su 33.
2. Il denominatore comprende i titoli con meno di 50 (20) sedute, che contano «sotto». Va detto perché le serie pubblicate possono contarli in modo diverso.
3. Negli indici con meno di 50 titoli la pct50 si muove a scatti di 2-6 punti: le soglie vanno espresse anche in numero di titoli, come già fa il trigger (max(5 punti, 2 titoli)).
4. EEM: escludere le sedute delle feste cinesi e tenere conto dello sfasamento con il prezzo.
5. Il controllo con i prezzi rifà esattamente i file, ma con la stessa fonte (Yahoo). L'unica fonte indipendente (First Trust, S&P 500, 5 date) è entro 1-3 punti, con un caso spiegato da una data diversa.
6. Nel backtest i minimi locali si definiscono sul prezzo dell'indice. Per KOSPI 200 (prezzo del KOSPI), CSI 300, S&P/TSX 60 ed EEM (prezzo dell'ETF) il prezzo non è quello del paniere della breadth.

Fonti esterne: post First Trust «A Snapshot of Moving Averages» del [10/05/2018](https://www.ftportfolios.com/Blogs/MarketBlog/2018/5/10/a-snapshot-of-moving-averages), [13/09/2018](https://www.ftportfolios.com/blogs/MarketBlog/2018/9/13/a-snapshot-of-moving-averages), [13/08/2019](https://www.ftportfolios.com/blogs/MarketBlog/2019/8/13/a-snapshot-of-moving-averages), [15/10/2019](https://www.ftportfolios.com/Blogs/MarketBlog/2019/10/15/a-snapshot-of-moving-averages), [01/09/2020](https://www.ftportfolios.com/blogs/MarketBlog/2020/9/1/a-snapshot-of-moving-averages); gli altri indirizzi sono in `script/dati.mjs`.
