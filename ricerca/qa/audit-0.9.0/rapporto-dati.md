# Sector Monitor: audit della correttezza dei dati (QA1)

Data dell'audit: 18/10/2026. Dati dell'app: `asOf` 2026-10-16 (venerdì) per tutti i file. Repository letto in sola lettura (`/home/user/rrg`, commit 07a09d7).

Cartella di lavoro: `OUT=/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/`
- `scripts/`: ricalcoli indipendenti (Python, formule riscritte da zero; il codice dell'app si chiama solo per sapere cosa mostra l'app)
- `yahoo/`, `spark/`, `fred/`: copie delle risposte delle fonti (Yahoo chart e spark, FRED)
- `c*.json`: risultati dei controlli

Fonti indipendenti: Yahoo chart API (stessa fonte dell'app, serve a controllare l'elaborazione), Yahoo spark (la fonte usata da `fetch_indices.js`), FRED (SP500, DJIA, CPIAUCSL, DEXUSEU), probe point-in-time S&P 500 (`data-probe/jb`, prezzi fino al 2026-09-22), cache dei membri degli indici (`ixcache`, fino al 2026-10-16), file pubblicati da Barchart/EOD per S5TH e SUTH (`data-probe/eod`).

## Sintesi

Il nucleo dei calcoli è corretto e riproducibile: prezzi, rendimenti, breadth storica di S&P 500, settori e indici, drawdown e percentili, RRG (le due formule), portafoglio di riferimento, cap ed equal-weight e conteggi dei cali forti coincidono con i miei ricalcoli fino all'arrotondamento. I problemi riguardano soprattutto **dati della fonte vecchi presentati come freschi**, un **filtro dei cali forti che scarta cali veri** e **l'endpoint spark che perde sedute**, oltre a qualche approssimazione non detta nell'app.

## Tabella dei controlli

Legenda: OK = coincide (entro l'arrotondamento mostrato); DIFF = differenza reale; DUBBIO = differenza spiegabile ma da decidere.

| # | Cosa | Valore app | Valore indipendente | Diff | Esito |
|---|---|---|---|---|---|
| 1.1 | Ultimo prezzo, 1G, 1S, 1M, 3M, YTD dei 22 ticker USA (`prices.json`) contro Yahoo adjclose | es. XLK 183,47 · 1G −3,02 · 1M −2,33 · YTD 27,90 | identici | 0 su 22 ticker | OK |
| 1.2 | Storia completa dei 22 ticker USA, punto per punto | 1.255 sedute | Yahoo | 0 punti oltre 0,05% | OK |
| 1.3 | Ultimo prezzo e rendimenti dei 46 ETF globali (`prices_global.json`) | 46 ticker | Yahoo | 44 identici | OK |
| 1.4 | LYXIB.MC, ultima seduta (16/10) | 204,95 · 1G +0,93% | barra Yahoo 204,6301 · 1G +0,77% | +0,16% sul prezzo, +0,16 pt sull'1G | DUBBIO |
| 1.5 | YTD degli ETF di Parigi e Amsterdam (base: ultima seduta di Milano, 30/12/2025, Milano chiusa il 31/12) | CACC.PA 0,20 · IAEX.AS 22,27 · DBMFE.PA 25,86 | dal 31/12 della loro borsa: 0,30 · 22,56 · 26,24 | −0,10 / −0,29 / −0,38 pt | DIFF (bassa) |
| 1.6 | Macro (10 ticker), ultimo e rendimenti | es. GLD 382,01, 1M −4,10 | identici | 0 | OK |
| 1.7 | CPI (`prices_macro.json`) contro FRED CPIAUCSL | 92 mesi | FRED | 0 differenze; 2025-10 assente anche su FRED | OK |
| 1.8 | CPI a gradini dal giorno di uscita | 1.255 sedute | ricalcolo dai `releases` | 0 errori | OK |
| 1.9 | DXY_INV = 10000/DXY | 1.255 sedute | Yahoo DX-Y.NYB | 0 errori | OK |
| 1.10 | Prezzi riempiti in avanti (data del calendario di Milano senza barra Yahoo) | CSNDX.MI: 22/12/2025, 29/12, 30/12, 02/01/2026, 20/06/2022, 04/07/2022; SMEA.MI 24/09/2024 | barre Yahoo nulle | prezzo del giorno prima mostrato come chiusura | DIFF (non detto nell'app) |
| 1.11 | Barre Yahoo «segnaposto» (O=H=L=C, volume 0) prese per chiusure vere | 13–20/09/2022: 21 ETF di Milano fermi per 6 sedute (es. CSSPX 418,06 ×7, poi 404,20 il 21/09); 04–06/12/2023: 13 ETF di Xetra fermi per 3 sedute (SXR8 441,24 ×4 mentre CSSPX si muove) | volume 0 su Yahoo | prezzo vecchio mostrato come seduta | DIFF (alta) |
| 1.12 | DBMFE.PA, raccordo con DBMF prima del 28/04/2025 | fattore implicito 4,5255 | ricalcolo: DBMF adjclose / EURUSD=X × 94,99/DBMF€(28/04) | max 8·10⁻⁷ relativo su 896 sedute | OK |
| 1.13 | DBMFE, cambio usato per convertire DBMF | EURUSD=X «close» di Yahoo | FRED DEXUSEU (mezzogiorno NY) | Yahoo del giorno D vicino a FRED del giorno D−1 (mediana 0,10% contro 0,25% stesso giorno); rendimenti giornalieri del tratto proxy con errore mediano 0,4 pt, fino a 2,7 pt; cumulato 2021–2025 19,48% contro 19,51% | DUBBIO (bassa) |
| 1.14 | Il raccordo DBMFE è detto nell'app? | nome del ticker (universe.json) e guida | — | il campo `spliced` del file non è usato nei grafici | OK (bassa) |
| 2.1 | Breadth S&P 500 (a20/a50/a200 e n) dal probe jb, composizione storica | 20/11/2008 4/392 · 23/03/2020 15/494 · 12/10/2022 78/497 · 08/04/2025 88/499 | identici | 0 | OK |
| 2.2 | Breadth degli 11 settori alle stesse date | es. XLU 0/28 (2020), XLE 17/23 (2022), XLU 18/31 (2025) | identici nel 2020, 2022, 2025; nel 2008 differenze di n per XLK/XLC/XLY dovute alla mia mappa dei settori, percentuali uguali o +0,2 | ≤0,2 pt | OK |
| 2.3 | Breadth 18 e 21/09/2026 contro jb | SPX 250/503 | 247/500 (jb ha 501 membri) | ±3 titoli, composizione diversa | DUBBIO (bassa, non errore dell'app) |
| 2.4 | Breadth all'ultima seduta (16/10/2026), 503 membri, chiusure da Yahoo chart | SPX 344/226/259 su 503; settori | identici con chart (con spark esce 260 per un buco di DOC) | 0 | OK |
| 2.5 | `breadth_latest.json`: chiusura, d20, d50, d200, dd, up200 di 503 titoli | — | Yahoo chart | 0 dopo l'arrotondamento a 0,1 | OK |
| 2.6 | Breadth contro i valori pubblicati S5TH/SUTH (8 sedute 2018 e 22/05/2020) | SUTH identico (±0,01); S5TH | pubblicato | da −0,06 a +0,44 pt; README dice «tra 0 e +0,4», la docstring di `backfill_breadth.py` «tra −0,1 e +0,9» | DIFF (testo, bassa) |
| 2.7 | Breadth indici DJI, NDX (epoca), DAX, CAC, N225, FTSEMIB, UKX, SMI (membri di oggi) a 20/11/2008, 23/03/2020, 12/10/2022, 08/04/2025, 16/10/2026 | 40 righe | ixcache, mia implementazione | 39 identiche | OK |
| 2.8 | UKX 16/10/2026, % sopra media 20 | 66/100 | 67/100 (chart e ixcache); 66 con spark | 1 titolo | DIFF (media, causa spark) |
| 2.9 | Chiusure S&P 500 e Dow Jones contro FRED | 2.514 sedute | FRED SP500, DJIA | max 0,12% (11/08/2021), 3 sedute oltre 0,01% | OK |
| 2.10 | 1G e 1M dei 22 indici | es. SPX −1,09 / 0,28 | ixcache | 21 identici | OK |
| 2.11 | CSI 300 (ETF 510300 a 4,24 CNY), 1G e drawdown | 1G 0,00% · dd −16,70% | 1G −0,14% · dd −16,79% | chiusure salvate a 2 decimali (passo 0,24%) | DIFF (media) |
| 3.1 | Drawdown a 52 settimane rettificato, 11 settori + SPY + RSP | es. XLU −9,71 · XLI −9,81 · XLK −9,17 | Yahoo adjclose | ≤0,01 pt | OK |
| 3.2 | Percentile della profondità | es. XLU 80 · XLI 83 | 80,5 · 82,9 | ≤1 (classi da 0,1 pt) | OK |
| 3.3 | «Solo prezzo» (max52: chiusura più alta, data, ultima, massimo intraday, cedole) in tutti e tre i file prezzi e in `sectors.json` | 81 ticker | Yahoo close/high/eventi | tutto uguale tranne LYXIB (vedi 1.4) e un pari merito di SMEA (stesso massimo in due date) | OK |
| 3.4 | Drawdown e percentile dei 22 indici (storia dal 2000) | es. KOSPI200 −37,81 (96°) | −37,81 (95,8) | ≤0,01 pt (CSI300 0,09, vedi 2.11) | OK |
| 3.5 | Testi del README: XLU al 29/09/2026 −15,1% / −16,8%, GLD −22,8%, GLD 509,70 / 495,90 | — | −15,07 / −16,80 / −22,79 / 509,70 / 495,90 | 0 | OK |
| 3.6 | Percentile nella tabella «Prezzi» della rotazione | su 5 anni (`prices.json`): XLU 74 | Monitor su storia dal 2004: XLU 80 | la barra rossa (≥80) è accesa nel Monitor e spenta nella rotazione per lo stesso ETF | DIFF (bassa, coerenza) |
| 4.1 | Alert XLU zona blu 25/09/2026 | breadth 3,2% · dd −15,5% (93°) | 1/31 per la 2ª chiusura (24 e 25/09) · −15,49% · 92,8° | 0 | OK |
| 4.2 | Alert XLU trigger 12/10/2026 | 16,1% · spinta a 20 giorni | 5/31 ≥ max(10; 3,2+6,45); % sopra 20 = 96,8 con minimo 3,2 nelle 15 sedute | 0 | OK |
| 4.3 | Date del registro contro la macchina a stati sui dati attuali | 2 eventi | `runMachine` sugli stessi dati: stessi 2 eventi, nessun altro nel 2026 | 0 | OK |
| 5.1 | RRG «nuova» e «medie semplici», settimanale e giornaliero, XLK/XLE/XLU contro SPY e NVDA contro QQQ, ultime 3 barre | es. XLU sett. 98,3535 / 99,7577 | 98,3536 / 99,7577 | ≤1·10⁻⁴ | OK |
| 5.2 | Portafoglio di riferimento (livello 1, ribilanciato a fine mese) | indice 141,7027 · YTD 9,549% · pesi di oggi (SWDA 40,19…) | identici | 0 | OK |
| 6.1 | Cap ed equal-weight 3M (20/07→16/10), 1M e 3M di un mese fa, 11 settori + SPX | es. XLC −0,4 / −4,5 · SPX 2,9 / 0,8 | mia simulazione: −0,39 / −4,53 · 2,89 / 0,79 | ≤0,05 pt | OK |
| 6.2 | Equal-weight contro ETF Invesco RSP* (solo prezzo), 1M…1A | — | RSP* | media 0,35–0,62 pt, max 3,1 (XLC 1A, RSPC segue un indice più largo) | OK (come dice il README) |
| 6.3 | Cap-weighted contro SPDR XL* (solo prezzo), 3M | XLP 4,8 · XLB 3,4 | XLP 3,25 · XLB 1,78 | +1,5 / +1,6 pt; il README nomina solo Tecnologia, Comunicazioni, Discrezionali (e su 3M XLC coincide) | DIFF (testo, bassa) |
| 6.4 | Peso dei titoli usciti nel cap-weighted | 0,7 × 20° percentile dei valori di mercato del settore (stima) | escludendoli: XLC 3M −0,34 invece di −0,39 | ≤0,07 pt | DUBBIO (stima non detta) |
| 6.5 | Rendimenti dei singoli titoli (`stocks[].r`, 5 periodi) | 2.503 valori | Yahoo | 0 oltre 0,1 | OK |
| 6.6 | Coerenza `hist` con i valori di oggi e di 1 settimana fa | — | — | 0 | OK |
| 7.1 | Cali forti S&P 500: 10/10/2008, 15/10/2008, 12/03/2020, 16/03/2020, 04/04/2025 | es. 16/03/2020 454/414/324 su 494 · 04/04/2025 296/153/28 su 499 | identici (stesso metodo) | 0 | OK |
| 7.2 | Cali forti DAX (06/10/2008, 12/03/2020, 07/04/2025), N225 (13/03/2020, 05/08/2024, 07/04/2025), CAC e FTSE MIB (12/03/2020) | es. N225 07/04/2025 191/135/54 su 225 | identici | 0 | OK |
| 7.3 | Effetto del filtro «errori di stampa» sull'S&P 500 | 10/10/2008: 6 cali ≤−5% (5 ≤−7%) · 08/04/2025: 4 (2) · 03/04/2020: 6 (1) | cali veri nei prezzi: 79 (46) · 41 (11) · 51 (11) | il filtro toglie 73, 37, 45 cali veri | DIFF (alta) |
| 8.1 | Valori ripetuti in `sectors.json` | XLU 189 coppie uguali, XLK 170… | arrotondamento a 2 decimali dei primi anni (XLK 7,68 nel 2004) | passo fino a 0,13% | OK (bassa) |
| 8.2 | Sedute NYSE senza breadth, n = 0, copertura < 60% | — | — | nessuna | OK |

## Problemi, in ordine di gravità

Nessun problema bloccante: nessun numero dell'ultima seduta è inventato o sbagliato in modo grave. Quattro sono di gravità alta o media perché l'app mostra come dato vero un numero che non lo è.

### ALTA 1. Il filtro degli «errori di stampa» scarta cali veri nelle giornate di panico (cali forti)
- **Dove**: `js/capitulation.js` `dayCounts`, `scripts/backfill_capitulation.py` `counts`; dati in `data/capitulation.json`, serie SPX (e, con la stessa regola, settori e indici).
- **Cosa**: un calo ≤−5% non conta se la seduta dopo si riprende quasi tutto e la mediana dei membri quel giorno è entro ±2%. È proprio ciò che succede nei giorni di capitolazione seguiti da un rimbalzo violento: 10/10/2008 (mediana −1,6%, poi +11,6% il 13/10), 08/04/2025 (prima del +9,5% del 09/04), 03/04/2020 e 16/04/2020.
- **Numeri**: SPX, cali ≤−5% / ≤−7%: 10/10/2008 l'app ne conta 6 / 5, i prezzi 79 / 46; 08/04/2025 4 / 2 contro 41 / 11; 03/04/2020 6 / 1 contro 51 / 11. In tutta la storia SPX il filtro toglie 1.115 cali ≤−5% (24 sedute con almeno 10 tolti), quasi tutti in mercati agitati.
- **Perché conta**: il conteggio e l'allerta (somma su 5 sedute, 99° percentile) sono più bassi del vero proprio nelle settimane in cui servono, e il file dice «esclusi gli errori di stampa» per cali che sono veri.
- **Riprodurre**: `PYTHONPATH=…/data-probe/pylib python3 $OUT/scripts/c7_cap.py` (colonne `raw` contro app) e `python3 $OUT/scripts/c7_filter.py` (elenco delle sedute).
- **Proposta**: chiedere che il rimbalzo sia anomalo anche rispetto alla mediana del giorno dopo (in un rimbalzo di mercato la mediana sale anch'essa), oppure limitare il filtro ai titoli isolati (per esempio meno di 3 membri o l'1% nello stesso giorno).

### ALTA 2. Prezzi fermi di Yahoo presentati come chiusure vere (universi globali)
- **Dove**: `data/prices_global.json`; `scripts/lib/yahoo.js` `parse` accetta barre con open = high = low = close e volume 0.
- **Cosa**: dal 13 al 20/09/2022 Yahoo ha barre segnaposto per 21 ETF di Milano (SWDA, CSSPX, EIMI, SGLD, i governativi, IWDP…; altri 4 dal 16/09, XMIB fino al 21/09), che restano allo stesso prezzo per 6 sedute e poi saltano tutto in un giorno (CSSPX 418,06 → 404,20, −3,3% il 21/09). Dal 04 al 06/12/2023 lo stesso per 13 ETF di Xetra (IUSQ, SXR8, EXS1, ZPRS…; SXR8 resta a 441,24 mentre lo stesso fondo a Milano, CSSPX, si muove). Il calendario «a maggioranza» e la correzione dei prezzi isolati non le vedono, perché la barra esiste e non rientra il giorno dopo.
- **Perché conta**: per una settimana i grafici giornalieri di rotazione, le performance e i rendimenti giornalieri mescolano ETF fermi e ETF che si muovono (IUSQ.DE, il benchmark ACWI, si muove nel 2022 mentre gli ETF di Milano sono fermi): la forza relativa di quei giorni è falsa e il salto finale sembra un movimento di un giorno.
- **Riprodurre**: `python3 -I $OUT/scripts/c8_stale.py` (sequenze di prezzi uguali con volume Yahoo 0), oppure guardare nel file `CSSPX.MI` dal 2022-09-12 al 2022-09-21.
- **Proposta**: trattare come mancante una barra con volume 0 e O=H=L=C uguale alla chiusura precedente (o quando più della metà degli ETF della stessa borsa è ferma), poi applicare la regola già detta per le lacune e segnalarla.

### MEDIA 3. Indici: l'endpoint spark perde sedute e le medie si calcolano su finestre sbagliate
- **Dove**: `scripts/fetch_indices.js` `needsChart` (riscarica da chart solo con buchi di più di 5 giorni negli ultimi 60, o se il titolo è indietro).
- **Cosa**: spark perde singole sedute molto spesso: nell'ultimo anno 66 membri su 100 del FTSE 100, 110 su 225 del Nikkei, 15 su 40 del DAX e 11 su 101 del Nasdaq-100 hanno almeno una seduta mancante. Con una seduta in meno, la media a 20/50/200 «sulle sedute del titolo» copre un giorno in più, e il rendimento giornaliero dei cali forti diventa di due sedute.
- **Numeri**: FTSE 100 al 16/10/2026, titoli sopra la media a 20: app 66, Yahoo chart 67, ixcache 67, spark 66 (stesso valore dell'app, quindi la causa è spark). Gli altri indici controllati coincidono alla stessa data, ma l'errore si accumula sera dopo sera nelle sedute aggiunte dalla Action.
- **Riprodurre**: `python3 -I $OUT/scripts/c2_indices.py` (riga UKX 2026-10-16) e il controllo spark/chart sugli stessi membri descritto nel log (spark.py `get(mem,'1y')`).
- **Proposta**: riscaricare da chart chi ha qualsiasi seduta mancante rispetto al calendario della sua borsa (la maggioranza dei titoli con lo stesso suffisso), non solo i buchi di più di 5 giorni.

### MEDIA 4. Prezzi riempiti in avanti senza dirlo nell'app
- **Dove**: `data/prices_global.json` (`alignToCalendar`). La regola è nel README («un ETF senza prezzo quel giorno prende l'ultimo prezzo noto»), ma in `index.html`, nei tooltip e in `guida.html` non c'è; CLAUDE.md chiede esplicitamente di dirla nell'app.
- **Casi**: CSNDX.MI il 22/12/2025, 29/12, 30/12/2025 e 02/01/2026 (Yahoo non ha la barra; l'app mostra 1.239,10 e 1.243,19 ricopiati) e anche il 20/06 e il 04/07/2022; SMEA.MI il 24/09/2024. La base dello YTD di CSNDX (30/12/2025) è quindi il prezzo del 23/12.
- **Riprodurre**: `python3 -I $OUT/scripts/c1_prices.py` (colonna `filled`).
- **Proposta**: segnare nel tooltip della cella e nella nota della tabella le sedute ricopiate, o dirlo almeno nella guida.

### MEDIA 5. CSI 300: chiusure arrotondate a 2 decimali su un prezzo di 4 yuan
- **Dove**: `data/indices_more.json`, `CSI300` (prezzo: ETF 510300.SS, circa 4,24 CNY). Il formato salva le chiusure in centesimi (`cd`).
- **Numeri**: 1G app 0,00% contro −0,14% reale (Yahoo 4,242 → 4,236; l'app salva 4,24 tutte e due le sedute); drawdown −16,70% contro −16,79%. Ogni passo di 0,01 vale 0,24%, quindi la colonna 1G del tabellone può mostrare 0,00% o ±0,24% in giorni con movimenti diversi.
- **Riprodurre**: la riga CSI300 dello script del punto 2.10 (`ixload.app_index('CSI300')` contro la cache).
- **Proposta**: salvare più decimali per i prezzi sotto 100 (per esempio una scala per indice).

### BASSA 6. LYXIB.MC: l'ultima seduta usa un prezzo diverso dalla chiusura
- `data/prices_global.json`, LYXIB.MC al 16/10/2026: 204,95 (il `regularMarketPrice` usato da `fillLast`) contro la barra di Yahoo, ora presente, di 204,6301; le sedute prima usano la barra. 1G +0,93% invece di +0,77%; anche `max52.c`. La prossima corsa lo correggerà, ma per un giorno la seduta mescola due definizioni di prezzo. Riprodurre: `python3 -I $OUT/scripts/c1_prices.py`.

### BASSA 7. YTD degli ETF di altre borse calcolato dalla seduta di Milano
- Borsa Italiana è chiusa il 31/12: per CACC.PA, IAEX.AS e DBMFE.PA la base dello YTD è il 30/12/2025, non l'ultima chiusura dell'anno della loro borsa (0,20 contro 0,30; 22,27 contro 22,56; 25,86 contro 26,24). Coerente con il calendario scelto, ma non detto.

### BASSA 8. Cambio di DBMF (tratto prima del 28/04/2025)
- EURUSD=X «close» di Yahoo del giorno D è più vicino al fixing FRED del giorno D−1 che a quello di D: la chiusura di DBMF delle 16 di New York si converte con un cambio di molte ore prima. Il cumulato non cambia (19,48% contro 19,51% dal 2021 al 25/04/2025), ma i rendimenti giornalieri del tratto proxy hanno un errore mediano di circa 0,4 punti (fino a 2,7). Riprodurre: `python3 -I $OUT/scripts/c1_dbmf.py`.

### BASSA 9. Pesi stimati nel cap-weighted per i titoli usciti
- `scripts/lib/capeq.js` `buildSectorMembers`: chi non è nelle holdings di IVV (usciti senza quantità salvata, appena entrati) vale 0,7 × il 20° percentile dei valori di mercato del settore. È una stima, non scritta nel README né nell'app (la nota parla solo di chi è escluso). Effetto misurato: al massimo 0,07 punti sul 3M (XLC −0,39 con la stima, −0,34 senza i titoli usciti).

### BASSA 10. Testi da correggere
- README, cap-weighted «uguale agli SPDR XL* tranne … Tecnologia, Comunicazioni, Discrezionali»: su 3M scartano anche XLP (+1,5 pt) e XLB (+1,6 pt), e su 1A XLRE (+2,0) e XLB (−2,1); XLC su 3M invece coincide. Probabilmente anche lì c'entra il taglio dei pesi: va detto per tutti i settori dove succede.
- README, verifica S5TH: «scarto tra 0 e +0,4 punti», ma nei file EOD gli scarti vanno da −0,06 a +0,44; la docstring di `backfill_breadth.py` dice ancora «tra −0,1 e +0,9».
- Tabella «Prezzi» della rotazione: il percentile per il colore rosso è sui 5 anni di `prices.json`, quello del Monitor sulla storia dal 2004, quindi per lo stesso ETF la barra può essere rossa in una vista e no nell'altra (XLU 74 contro 80; XLI 88 contro 83). Il tooltip parla di «peggiore negli ultimi 5 anni», ma non dice che anche il rosso è sui 5 anni.

### Cosa è risultato corretto (in breve)
Rendimenti e ultimi prezzi di tutti gli 81 ticker; CPI e 1/DXY; raccordo DBMFE; breadth storica di S&P 500 e settori con la composizione d'epoca; breadth degli indici a cinque date; breadth e fotografia titolo per titolo all'ultima seduta; drawdown, percentili e «solo prezzo»; ingressi e date degli alert; RRG con le due formule; portafoglio di riferimento; cap ed equal-weight con la composizione d'epoca; rendimenti dei titoli della vista 7; conteggi dei cali forti (a parità di metodo).

## Come riprodurre
```bash
OUT=/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati
PL=/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/data-probe/pylib
python3 -I $OUT/scripts/c1_prices.py        # 1.1–1.6, 1.10 (prezzi, rendimenti, lacune)
python3 -I $OUT/scripts/c1_dbmf.py          # 1.12–1.13 (raccordo e cambio)
node $OUT/scripts/fred.mjs SP500 DJIA CPIAUCSL DEXUSEU   # scarica FRED
python3 -I $OUT/scripts/c8_fills.py         # 1.7–1.9, 8.x (CPI, DXY, valori ripetuti)
python3 -I $OUT/scripts/c8_stale.py         # 1.11 (barre segnaposto di Yahoo)
PYTHONPATH=$PL python3 $OUT/scripts/c2_spx.py 2008-11-20 2020-03-23 2022-10-12 2025-04-08   # 2.1–2.2
python3 -I $OUT/scripts/c2_latest.py        # 2.4–2.5 (con spark; DOC differisce per un buco di spark)
python3 -I $OUT/scripts/c2_indices.py       # 2.7–2.8
python3 -I $OUT/scripts/c2_ndx.py           # 2.7 (Nasdaq-100 d'epoca)
python3 -I $OUT/scripts/c2_fred.py          # 2.9
python3 -I $OUT/scripts/c3_dd.py            # 3.1–3.4
python3 -I $OUT/scripts/c3_max52.py         # 3.3
python3 -I $OUT/scripts/c4_alerts.py        # 4.1–4.2
python3 $OUT/scripts/c5_rrg.py              # 5.1
python3 $OUT/scripts/c5_ptf.py              # 5.2
python3 $OUT/scripts/c6_capeq.py            # 6.1–6.4
PYTHONPATH=$PL python3 $OUT/scripts/c7_cap.py      # 7.1–7.2
PYTHONPATH=$PL python3 $OUT/scripts/c7_filter.py   # 7.3
```
Gli script leggono le risposte di Yahoo salvate in `$OUT/yahoo` e `$OUT/spark` (le scaricano solo se mancano).
