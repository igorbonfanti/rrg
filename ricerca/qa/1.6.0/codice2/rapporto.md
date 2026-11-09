# Controllo codice, pipeline e grafici (secondo giro) · versione 1.6.0 · commit 6fc67a1

Verdetto: **NO-GO solo per il rilievo 1**, che è fuori dall'app e da `main`: il rilievo 2 del primo giro è corretto solo in parte. Per l'app e per la pipeline è **GO**: tutti i «da correggere» di codice, grafici e usabilità (punti 1, 3 e 5) sono corretti davvero, i minori dichiarati corretti lo sono, e nessuna correzione rompe altro. Restano 6 minori, di cui 2 sono correzioni a metà.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere (non tocca l'app né `main`) | `ricerca/qa/1.6.0/numeri/dati_risultati_rieseguito.json` (`credito.aprile_2025`, `baa10y_uguale_dbaa_meno_dgs10.esempi`), `ricerca/qa/1.6.0/codice/rapporto.md` riga 8 | Rilievo 2 del primo giro, corretto a metà. `ripulisci.mjs` ha tolto i livelli di ICE e Moody's da `ricerca/vix/struttura/`, ma la copia rieseguita dal controllo dei numeri ha ancora gli stessi livelli: HY OAS [livello tolto] e [livello tolto], IG OAS [livello tolto], [livello tolto] e [livello tolto], BAA10Y [livello tolto] e [livello tolto], AAA10Y [livello tolto], [livello tolto] e [livello tolto], Baa−Aaa [livello tolto], [livello tolto] e [livello tolto], più un esempio BAA10Y [livello tolto] del 29/01/1991. Il rapporto del primo controllo del codice cita «[livello tolto] / [livello tolto]». I file sono già su `origin`, e la storia di git conserva i valori comunque. Restano anche 16 `dHy21` e 88 `dBaa21` in `backtest/risultati.json`: sono variazioni, che `ripulisci.mjs` tiene di proposito. Se vanno bene, lo decide l'utente. | `python3` sul JSON (chiavi `massimo`, `al_2025_04_02`, `massimo_del_periodo_hy` sotto le serie di terzi); `git branch -r --contains 084ff25` | valori elencati qui sopra |
| 2 | minore (correzione a metà del rilievo 9) | `scripts/fetch_vix.js` `volSeries`, riga 183 | `mergeTail` ora gestisce un Cboe vuoto, ma Yahoo non viene richiesto. Se il file di Cboe arriva e nessuna sua data è una seduta dell'S&P 500, `cb.dates.at(-1) < spx.at(-1)` vale `undefined < "…"`, cioè falso. Senza file pubblicato VIX e VIX3M finiscono all'ultimo FRED (05/11), con l'S&P 500 al 06/11. Con il file pubblicato resta la coda pubblicata, che è giusta. Il test nuovo copre solo `mergeTail`. Rimedio: `!cb \|\| !cb.dates.length \|\| …`. | scenario `cboeNoSess` | `scenari2.txt`: fonte `["FRED","FRED"]`, VIX `["2026-11-05",28.18]`, Yahoo ^VIX chiesto 0 volte |
| 3 | minore (latente, transitorio) | `volSeries`, riga 192 | Cboe e Yahoo giù, FRED su, e file pubblicato nel formato 1.5.0 (senza `src`, ultima seduta di Yahoo): `yFrom` vale null e `lastSource` scrive `vixSrc: "Cboe"`. La riga delle date dice allora «poi Cboe» per un valore di Yahoo. Succede solo alla prima corsa della 1.6.0 se su `main` c'è ancora il `vix.json` della 1.5.0. Con un `src` mancante dovrebbe restare null, così l'app scrive «Cboe o Yahoo». | scenario `cboeYahooDownNet` con `git show origin/main:data/vix.json` | `scenari2.txt`: fonte `["Cboe","FRED"]` |
| 4 | minore | `js/vix-view.js` riga 81 (`fr`) | Con 3 decimali vicino a 1, le sedute con il rapporto sotto 1 lette «1,00 contango» passano da 43 a 3: 06/02/2009 (0,99977), 21/02/2018 (0,99950) e 04/12/2018 (0,99952). Ora si leggono «1,000 contango». Rimedio: per r < 1 troncare invece di arrotondare. | `casi_puri2.mjs`; nel browser il caso `r1000` di `vista.cjs` (VIX3M modificato con page.route) | `casi_puri2.txt`; `shots/kpi-r1000-1440.png` |
| 5 | minore | grafico a MAX, telefono | La scritta si disegna solo se entra, e ora non esce mai. Però a 320, 360 e 375 px nessuna delle due fasce grigie ha la scritta, e a 390 px manca quella del credito. Sul telefono la fascia grigia resta senza spiegazione nel grafico (la spiega la guida). Una scritta più corta come ripiego («dal 12/2007», «dal 2008») entrerebbe. | `vista.cjs` sezione 1 | `vista.log` (riga «scritte presenti»); `shots/chart-320-light-MAX.png`, `shots/chart-375-dark-MAX.png` |
| 6 | minore | `yahoo()` | Corretto il caso 404: HYG e IEF si chiedono lo stesso. Un simbolo che risponde 200 senza risultato («nessun dato») ferma però ancora HYG e IEF, come un errore di rete. Caso improbabile. | scenario `cboeLateYahooNoData` | `scenari2.txt`: HYG chiesto 0 volte, credito null |
| 7 | minore (rilievo 10, aperto) | test | In `npm test` ci sono `lastSource`, `plausible`, `mergeTail`, `parseCboe` e `assemble`. La logica di `volSeries` (scelta della coda, coda dal file pubblicato, `src`) resta coperta solo dagli scenari simulati di questa cartella. | — | — |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), da correggere, minore.

## Cosa ho verificato e passa

**`fetch_vix.js`**: 54 controlli in `scenari2.mjs`, 52 OK. I 2 FAIL sono i rilievi 2 e 3. Le corse usano fetch simulato e risposte vere registrate oggi: Cboe al 06/11, FRED al 05/11. Ho rifatto anche i 29 scenari del primo giro, 87 corse in `scenari.txt`. L'unica uscita cambiata è `cboeDup`, che senza file ora scrive.

- **Fonte dell'ultima seduta**, cioè `src`, `asOf.vixSrc` e `asOf.vix3mSrc`:
  - Cboe aggiornato: Cboe/Cboe, e Yahoo non viene chiesto.
  - Cboe in ritardo: Yahoo/Yahoo.
  - In ritardo solo il VIX3M: Cboe/Yahoo.
  - Cboe 403: un tentativo per file, poi Yahoo.
  - Cboe 503 o vuoto: 3 tentativi sul VIX, il VIX3M di Cboe non si chiede, poi Yahoo.
  - Solo il file del VIX3M 404: Cboe/Yahoo.
  - Coda tenuta dal file pubblicato: resta Cboe o Yahoo, quello del file.
  - Stessi valori ma fonte cambiata, Yahoo → Cboe o Cboe → Yahoo: si scrive il file, con `cd` e `ps` invariati.
  - Cboe aggiornato sul file del commit: cambia solo `generated`, quindi `keep_unchanged` non pubblica.
- **`plausible`**:
  - Su tutta la storia di Cboe nessuna seduta viene scartata: VIX 9.311 sedute, salto massimo ×2,156 il 05/02/2018 e minimo ×0,642 il 09/04/2025; VIX3M 4.311 sedute.
  - Il 05/02/2018 (17,31 → 37,32) si tiene. ×3 esatto si tiene; 6,6 su 20 si scarta, 6,7 si tiene.
  - Si scartano 2564, 0,2564, 256,4 di Yahoo e 99,99 da una data ripetuta. La serie finisce all'ultimo FRED con fonte FRED e `ps` 10000. Con il file pubblicato resta il VIX pubblicato.
- **`parseCboe`**: con una data ripetuta in fondo, in mezzo o in testa vale l'ultima riga. Non ci sono più errori di `encodeDates`: la 06a5360 non scriveva il file.
- **Corto circuito**:
  - Yahoo: un 404 su ^VIX3M o su ^VIX non ferma HYG e IEF (credito al 06/11). Un errore di rete li ferma: 4 tentativi su ^GSPC, poi stop.
  - Cboe: un 503, un timeout o un file vuoto fermano il secondo file; un 4xx no.
- **Tempi** (orologio virtuale, il passo dura 480 s):
  - Tutte le fonti appese: 369 s (nella 06a5360 erano 475,5).
  - Solo Cboe appeso: 94,5 s. FRED appeso: 142,5 s. Yahoo appeso: 132 s. Cboe giù e Yahoo appeso: 136,5 s.
  - Con il file pubblicato il file si scrive sempre, con il VIX al 06/11.
- **VIX senza riscritture**: sul `vix.json` di `origin/main` (1.5.0) il VIX esce identico: `d0`, `gaps`, `ps` 10000 e tutti i 9.278 valori di `cd`. SPX e NDX sono identici. Il `ps` del VIX resta 10000 anche con il valore sbagliato.

**Vista**: 100 controlli in `vista.cjs`, 0 FAIL, con il JSON modificato tramite page.route.

- **Riga delle date**: «poi Cboe, provvisorio», «poi Yahoo», misto Cboe/Yahoo, «Cboe o Yahoo» senza `src`, niente parentesi quando la serie è già di FRED.
- **«provv.» nel riquadro dei valori**: con il VIX3M già di FRED compare solo sul VIX; con il VIX già di FRED solo sul VIX3M.
- **Title dei riquadri**: VIX e VIX/VIX3M spiegano «provvisorio».
- **Tre decimali**: «0,997 contango» nel riquadro e nel riquadro dei valori, a 1440 e 390 px.
- **Asse del rapporto**:
  - Con il rapporto a 1,6, 1,75, 1,9 e 3,0 il passo è 0,25 con due decimali ([0,75 1,00 1,25 1,50 1,75] a 1440; [0,75 … 1,50] a 390 e 320 con 1,6), oppure 0,5 o 1 con un decimale.
  - Le etichette sono in posizione lineare e l'1 sta sulla linea a 1.
  - Con i dati veri: [0,8 1,0 1,2 1,4] a tutte le larghezze.
- **Scritte delle fasce grigie a MAX**: a 320, 360, 375, 390, 412, 1280 e 1440 px, chiaro e scuro, ogni scritta presente sta dentro la fascia e nessun testo esce dall'SVG. Ho rifatto la prova anche:
  - ridisegnando dopo un'altra vista e un ridimensionamento;
  - con i caratteri serviti 4 s in ritardo (l'app aspetta i caratteri prima di disegnare).
- **Legenda**: il punto finale c'è, tondo di 9 px, dello stesso colore della linea del rapporto, in chiaro e scuro.
- **Telefono**: il grafico è alto 558 px a 390 (66% di 844; era 648). A 1440 resta 648.
- **Credito in ritardo**: «—» e «HYG/IEF del 06/11/2026 non ancora arrivato · al 05/11/2026 era −3,1% dal massimo» a 1440, 390 e 360 px. Il riquadro dei valori mostra «—» e nessun testo è tagliato. Col credito aggiornato il sottotitolo dice «percentile del calo (alto = più profondo)».
- **Console e impaginazione**: nessun errore né avviso in console, nessuno scorrimento orizzontale in nessun caso.

**Regressioni**:

- `npm test`: 143 test, 0 falliti (il numero coincide con `docs/sviluppo.md`, rilievo 11 corretto).
- `node --check` su 58 file js e cjs del repository: 0 errori.
- `v150.cjs`: 108 OK, 0 FAIL. `v160.cjs`: 87 OK, 0 FAIL.

**I controlli possono fallire**. Sul commit 06a5360, prima delle correzioni:

- `vista.cjs` dà 39 FAIL: scritte fuori dalla fascia a 320-390, grafico di 648 px, punto finale assente in legenda, «poi Cboe provvisorio» fisso, «provv.» sul VIX3M di FRED, «1,00 contango», asse [0,8 1,0 1,3 1,5 1,8], credito vecchio mostrato come attuale.
- `scenari2.mjs` dà 24 FAIL e si ferma su `cboeDup` (file non scritto). Nel caso con tutte le fonti appese l'attesa è 475,5 s.
- Il test nuovo `test/vix_struttura.test.js` fallisce con un errore d'importazione (`lastSource`).

In `scenari2.mjs` e `casi_puri2.mjs` avevo scritto male tre attese: VIX3M che cambia fonte con Cboe in ritardo, 6,6 su 20 e un ordine di date. Le ho corrette prima della corsa finale e non sono rilievi.

## Cosa non ho potuto verificare e perché

- Il comportamento vero di Cboe e Yahoo dalle macchine di GitHub Actions: tutte le prove con fonti giù o appese sono simulate, e i tempi sono quelli dell'orologio virtuale, non attesi davvero.
- Un file di Cboe con date fuori dalle sedute, o un Yahoo che risponde 200 senza dati: li ho solo costruiti, non osservati.
- Safari e i telefoni veri: ho usato Chromium con emulazione mobile e tocco.
- GitHub Pages: ho servito l'app solo in locale, con `gzserve.mjs` sulla porta 8798 (1.6.0) e sulla 8799 (06a5360).

## Script e screenshot

In `ricerca/qa/1.6.0/codice2/`:

- `mock_run.mjs`: quello del primo giro, con 14 scenari nuovi in fondo a `S`.
- `scenari2.mjs`, con i risultati in `scenari2.txt` (6fc67a1) e `scenari2_06a5360.txt` (06a5360).
- `scenari.mjs`, con `scenari.txt` e `scenari.json` (le 87 corse del primo giro, rifatte).
- `casi_puri2.mjs`, con `casi_puri2.txt`.
- `vista.cjs`, con `vista.log` e `vista_06a5360.log`.
- `font_race.cjs`, con `font_race.log`.
- `v150.log` e `v160.log`.
- `shots/`, 34 immagini: il grafico a MAX a 320, 360, 375, 390, 412, 1280 e 1440 px in chiaro e scuro, gli assi forzati (`asse-r16-*`, `asse-r19-*`, `asse-r30-*`), i riquadri `kpi-r0997-*`, `kpi-r1000-*` e `kpi-credito-ritardo-*`, `tip-v3fred-1440.png`, `tip-vixfred-1440.png`, `legenda-390-*` e `vista-1440-dark.png`.

Per rifarli:

- copia di lavoro con `git archive 6fc67a1 | tar -x -C <cartella>`;
- `WT=<cartella> CACHE=<cache> MODE=record node mock_run.mjs`;
- `WT=… CACHE=… P150=<git show origin/main:data/vix.json> P160=<git show 6fc67a1:data/vix.json> node scenari2.mjs`;
- `WT=… CACHE=… node casi_puri2.mjs`, con `data/vix.json` del commit nella copia;
- `BASE=http://127.0.0.1:8798/ SITE=/home/user/rrg NODE_PATH=$(npm root -g) node vista.cjs`.
