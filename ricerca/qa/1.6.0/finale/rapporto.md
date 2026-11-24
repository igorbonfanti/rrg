# Controllo finale (terzo giro) · versione 1.6.0 · commit 77b4d97

Verdetto: **GO per l'app e per `main`**. Le correzioni del secondo giro funzionano e non rompono niente. Resta **un «da correggere» fuori dall'app**, sul ramo di sviluppo (rilievo 1): quattro livelli di HY OAS e di BAA10Y ancora in `ricerca/vix/struttura/backtest/risultati.json`. `ricerca/` non va su `main`, ma il ramo è pubblico. Gli altri rilievi sono minori.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere (non tocca l'app né `main`) | `ricerca/vix/struttura/backtest/risultati.json`, `SPX.hy` e `NDX.hy`: `maxHy.v`, `maxBaa.v`, `minHy.v`, `minBaa.v` | Ci sono ancora 8 valori, 4 diversi, che sono i livelli di HY OAS (ICE) e di BAA10Y (Moody's): il massimo del 07/04/2025 e il minimo della finestra dal 07/11/2023 al 05/11/2026. Coincidono con le serie di FRED nella cache. `ripulisci.mjs` toglie `maxHy`, `minHy`, `maxBaa` e `minBaa` solo quando il valore è un numero. Qui il valore è un oggetto `{date, v}`, e `v` non è tra le chiavi dei livelli. Rieseguito su una copia, lo script scrive «tolti 0 livelli». C'è da prima della 77b4d97: il file è cambiato l'ultima volta in b26e295. | `node ricerca/vix/struttura/ripulisci.mjs` su una copia → «tolti 0 livelli»; `python3 -I ricerca/qa/1.6.0/finale/livelli_terzi.py <repo> <cache>` | `livelli_terzi.txt`, righe `.SPX.hy.maxHy.v` e `.maxBaa.v`. I valori non sono scritti. Rimedio provato su una copia: in `strip`, se `k` è `max/min(Hy\|Baa)` e `o[k].v` è un numero, cancellare `o[k].v`. Lo script scrive «tolti 8 livelli» e cambia solo `backtest/risultati.json` |
| 2 | minore | `README.md` r. 101 | «821 sedute contro 479, da 1 in su» rimanda a `ricerca/vix/struttura/dati/`. Lì `dati.md` (r. 73-74 e 85) e `dati.mjs` danno 795 e 478, contati con `> 1`. Lo script che dà 479 e 821 è `ricerca/qa/1.6.0/testi2/soglia_uguale.mjs`. È salvato in `ricerca/`, come chiede la regola, ma il README non lo cita | `grep -n "795\|478" ricerca/vix/struttura/dati/dati.md` | — |
| 3 | minore | `guida.html` #vix, VIX / VIX3M | «contando come qui da 1 in su» si legge male. Meglio: «con la stessa soglia: da 1 in su» | — | — |
| 4 | minore (rilievo 4 del 2° giro, risolto in parte) | `index.html` «Credito high yield» | È stato aggiunto «rispetto ai titoli di Stato», ma l'index ha ancora «Non è uno spread ufficiale, cioè il rendimento in più…», che si può leggere come spiegazione di HYG/IEF. La guida usa la parentesi. «Baa» resta senza spiegazione in index e guida | — | — |
| 5 | minore (rilievo 6 del 2° giro, aperto) | grafico a MAX, computer | La scritta è ancora «HYG/IEF dal 09/04/2008», mentre i dati di HYG/IEF partono dal 2007 e dal 09/04/2008 parte la distanza dal massimo. Non è tra i minori aperti in `docs/sviluppo.md`, e nemmeno il rilievo 4 | `shots/chart-1440-light-MAX.png` | `vista_finale.txt` |
| 6 | minore | `ricerca/qa/1.6.0/codice2/vista.cjs` | Le attese di `r0997` («0,997») e `r1000` («1,000») descrivono il comportamento di prima. Sulla 77b4d97 lo script dà 4 FAIL, tutti attesi: «0,996» e «0,999». Va aggiornato prima di usarlo per le regressioni della prossima versione | `SHOTS=0 BASE=… node ricerca/qa/1.6.0/codice2/vista.cjs` | `vista_codice2.log` (100 controlli, 4 FAIL, solo questi) |
| 7 | minore (estetica) | grafico a MAX, 320-390 px | Nelle fasce grigie la linea verticale del 2000 passa sopra la scritta corta («dal 2|007»). Si legge lo stesso | — | `shots/chart-320-dark-MAX.png` |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), da correggere, minore.

Nota senza rilievo: ora sotto 1 il rapporto a 3 decimali si **tronca** in tutto l'intervallo da 0,995 a 1, non solo vicino a 1,000. Per esempio, R = 0,99689 si legge «0,996», e prima si leggeva «0,997». È coerente: nessun valore viene arrotondato verso la backwardation.

## Cosa ho verificato e passa

1. **479 e 821** (2 ricalcoli):
   - `soglia_uguale.mjs` su una copia della 77b4d97 con la cache dei futures dà 479 e 821 da 1 in su, e 478 e 795 sopra 1. Sono 4.761 sedute dal 04/12/2007 al 05/11/2026; R = 1 esatto il 17/09/2015; VX1 = VX2 in 26 sedute.
   - Ricalcolo indipendente in Python (`conteggi.py`, senza `dati.mjs`), che ricostruisce VX1 e VX2 dai file dei futures: stessi numeri. La concordanza da 1 in su è del 90,76%, quindi il «91%» di README e `sviluppo.md` resta giusto.
   - Guida e README hanno le stesse cifre, 479 e 821, e dicono «da 1 in su». Fuori da `ricerca/` non ci sono altre copie di 478 o 795.
2. **Frasi corrette** (8):
   - Guida: «Baa sul campione dal 1990».
   - Index e README: «la prima serie considerata, poi scartata per la licenza», che corrisponde a `inserimento.md`.
   - «rispetto ai titoli di Stato» in index e guida.
   - README: «segnale del VIX sopra 30», uguale a index e guida.
   - README: «può aggiornare il file anche dopo le 2 UTC (visto il 07/11/2026)».
   - `PROV`: «di solito la corsa della sera dopo lo sostituisce». È vero per le sedute da lunedì a giovedì: FRED esce il giorno dopo verso le 14:40 UTC e la corsa delle 22:40 UTC lo prende. Per il venerdì vale «di solito».
   - `docs/sviluppo.md`: condizioni di Cboe e minori aperti aggiunti.
3. **`fetch_vix.js`**:
   - `scenari2.mjs` su una copia della 77b4d97: 54 controlli, 0 FAIL. Al secondo giro i FAIL erano 2.
     - `cboeNoSess` (Cboe vuoto dopo il filtro): Yahoo viene chiesto una volta, la fonte è Yahoo/Yahoo e il VIX è al 06/11.
     - `cboeYahooDownNet` con il file della 1.5.0: `vixSrc` null.
     - Con il file della 1.6.0: Cboe. Con il file con l'ultima seduta da Yahoo: Yahoo.
   - Le 87 corse del primo giro (`scenari.mjs`) cambiano solo in 3 punti rispetto alla 6fc67a1: `allDown`, `allHang` e `cboeYahooDown` con il file della 1.5.0. In tutti e 3 `vixSrc` passa da «Cboe» a null, come voluto.
4. **Vista** (`vista_finale.cjs`: 21 controlli, 0 FAIL; sulla 6fc67a1: 10 FAIL):
   - **Rapporto vicino a 1**, a 1440 e 390 px, nel riquadro e nel riquadro dei valori. R = 0,99961 e 0,99922 si leggono «0,999 contango»; R = 0,99728 «0,997 contango»; R = 1,00039 «1,000 backwardation».
   - **`fr` sulle sedute vere**: 89 sedute vicino a 1, di cui 43 sotto 1. Nessuna sotto 1 si legge «1,000», e nessuna è diversa dal troncamento esatto calcolato in decimale (`fr_casi.mjs`). Il 06/02/2009, il 21/02/2018 e il 04/12/2018 si leggono «0,999».
   - **Fasce grigie a MAX**, in chiaro e scuro:
     - a 320 e 360 px, «dal 2007» e «dal 2008»;
     - a 390 px, «VIX3M dal 04/12/2007» e «dal 2008»;
     - a 1440 px, le due scritte lunghe.
     Tutte stanno dentro la fascia e nessun testo esce dal grafico. Lo screenshot ingrandito conferma che le scritte si vedono.
   - **File senza fonte**: con `vixSrc` null la riga dice «poi Cboe o Yahoo, provvisorio».
   - **Console**: nessun errore né avviso.
   - **Regressioni**: `v150.cjs` 108 OK e 0 FAIL; `v160.cjs` 87 OK e 0 FAIL. `vista.cjs` del secondo giro: 96 su 100, e i 4 FAIL sono quelli attesi del rilievo 6.
5. **Livelli di terzi e test**:
   - Nei JSON del controllo dei numeri non restano i livelli citati al secondo giro (`aprile_2025`, `esempi`).
   - La scansione di 92 file tracciati confronta il numero con il livello della serie nella stessa data e cerca gli estremi storici. Trova solo il rilievo 1. Le altre coincidenze sono percentili, correlazioni e rapporti del VIX.
   - `npm test`: 143 superati, 0 falliti.

## Cosa non ho potuto verificare e perché

- Cboe e Yahoo veri dalle macchine di GitHub Actions: gli scenari usano risposte registrate il 09/11, con Cboe al 06/11 e FRED al 05/11.
- Safari e telefoni veri: ho usato Chromium con emulazione mobile.
- La cronologia di git: i livelli tolti restano nei commit già su GitHub (punto aperto per l'utente in `sviluppo.md`).

## Script e risultati

In `ricerca/qa/1.6.0/finale/`:

- `conteggi.py` → `conteggi.json`;
- `fr_casi.mjs` → `fr_casi.txt`;
- `vista_finale.cjs` → `vista_finale.txt` (77b4d97) e `vista_finale_6fc67a1.txt`;
- `livelli_terzi.py` → `livelli_terzi.txt`;
- `scenari2_77b4d97.txt` e `scenari_diff_77b4d97.txt`;
- `v150.log`, `v160.log` e `vista_codice2.log`, ignorati da git;
- `shots/`, ignorata da git: il grafico a MAX a 320, 360, 390 e 1440 px, chiaro e scuro, e `kpi-r09997-*`.

Per rifarli:

- copia con `git archive 77b4d97 | tar -x -C <cartella>`, più `ricerca/vix/struttura/dati/cache/`;
- `node ricerca/qa/1.6.0/testi2/soglia_uguale.mjs <cartella>`;
- `python3 -I conteggi.py <cache>`;
- `WT=… CACHE=… P150=… P160=… OUT=… node scenari2.mjs`;
- `BASE=http://127.0.0.1:8799/ SITE=/home/user/rrg NODE_PATH=$(npm root -g) node vista_finale.cjs`.
