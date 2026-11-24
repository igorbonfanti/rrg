# Controllo numeri e pipeline · versione 1.10.0 · commit 99054cc

Pannello «Distanza dal massimo degli ultimi 3 anni» (vista 8 VIX): data/ath.json, data/ath_history.json, js/ath.js,
scripts/fetch_ath.js, scripts/check_fresh.js, scripts/keep_unchanged.js, passo nel workflow. Controllo del 12/11/2026,
15:40–16:10 UTC, dati dell'app generati alle 15:28 UTC (ultima seduta 11/11/2026).

Verdetto: **GO per i numeri** (nessun valore sbagliato), con **2 rilievi «da correggere» nella pipeline** (nessuno dei due
mostra un numero sbagliato). Secondo la regola di controlli.md («GO quando non restano bloccanti né da correggere») il verdetto
formale è **NO-GO finché i punti 1 e 2 non sono corretti o accettati dall'utente**: sono correzioni di poche righe.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | scripts/fetch_ath.js, `hist[c.id] = …` dentro `mapLimit` | Le serie di data/ath_history.json sono scritte **nell'ordine di arrivo** delle risposte (3 richieste in parallelo), non in quello di config/ath.json. L'ordine cambia da una corsa all'altra, quindi `keep_unchanged.js` (che confronta `JSON.stringify`) non riconosce il file come uguale e **ath_history.json (342 KB) si pubblica a ogni corsa anche senza sedute nuove** (commit e deploy di Pages inutili, per esempio nelle corse di recupero 01:10–06:10 quando la seduta USA non è ancora arrivata, o in una corsa manuale). Lo stesso vale per l'ordine di `missing` in ath.json quando mancano 2 o più mercati. Correzione: costruire `series` nell'ordine di `cfg` dopo `mapLimit` (o ordinare le chiavi). | Rete vera: in un clone, `node scripts/fetch_ath.js; git commit -am x` e poi di nuovo `node scripts/fetch_ath.js; node scripts/keep_unchanged.js; git status` → `M data/ath_history.json`. Senza rete: `prova_pipeline.sh <clone>`, prova 1 (ritardo su `^GSPC` o su `BTC-USD`). | 3 corse reali di fila: ordini `BTC,SILVER,GOLD,COPPER,WTI,NDX,SOXX,SPX,KOSPI`, `GOLD,SILVER,BTC,WTI,COPPER,NDX,KOSPI,SOXX,SPX`, `BTC,SILVER,GOLD,…,KOSPI,SPX`; ath.json «cambia solo l'ora», ath_history.json da pubblicare ogni volta. Con lo stesso ordine (prova 1, terza riga) keep_unchanged ripristina entrambi i file. Il file pubblicato ha già l'ordine `…NDX,SOXX,KOSPI,SPX` diverso da config. |
| 2 | da correggere | scripts/fetch_ath.js, fine di `main()`; workflow, commento del passo `ath` | Se uno, alcuni o **tutti e 9** i mercati non arrivano ma c'è un ath.json precedente, lo script esce con **codice 0**: il passo risulta `success` e il riepilogo «Esito» non lo segnala. Il commento del workflow dice «se un mercato non risponde resta la sua riga pubblicata e la corsa lo segnala»: in realtà la segnalazione arriva solo da check_fresh dopo 4 giorni (12 per il KOSPI). `fetch_industries.js` invece mette `process.exitCode = 1` appena manca una serie. Il codice 1 c'è solo con ath.json precedente assente e nessun mercato arrivato. | `prova_pipeline.sh <clone>`, prove 2 e 9 (`MOCK_FAIL=CL=F` e `MOCK_FAIL=` tutti e 9) → `exit=0`, `missing` pieno. | Output della prova 9: «data/ath.json: 9 mercati su 9 (righe pubblicate: BTC, GOLD, …, KOSPI)», `exit=0`. |
| 3 | minore | scripts/check_fresh.js `main()` (`ath: read('ath.json') \|\| undefined`) | Con data/ath.json **assente o illeggibile** (JSON rotto) il controllo dei mercati viene saltato e check_fresh dice «Dati aggiornati.». Il messaggio «ath.json: illeggibile o senza mercati» esce solo con un JSON valido senza `markets` (`{}`), e il test lo prova solo così. Nel workflow un file rotto viene comunque ripristinato dal controllo JSON prima del commit, quindi l'effetto pratico è piccolo; il testo del messaggio però promette un controllo che per i file illeggibili non c'è. | In un clone: `mv data/ath.json /tmp/; node scripts/check_fresh.js` → «Dati aggiornati.», exit 0; idem con `head -c 300` del file. Con `{}` → errore. | Uscita registrata nel controllo (sezione check_fresh). |
| 4 | minore | js/ath.js `athStats` con valori null | (a) `start` è `dates[0]` anche se la prima chiusura è null (dovrebbe essere la prima seduta con un prezzo; `start` serve a pickStats per la «storia accorciata»). (b) Il massimo della seduta può venire da un giorno **senza chiusura** (`hv(i)` usa `high[i]` anche con `close[i]` null). Oggi non succede: `parse` di yahoo.js scarta le barre con chiusura null, quindi i dati pubblicati non ne sono toccati. | `node ricerca/qa/1.10.0/numeri/casi_limite.mjs` → 2 NO su 19. | `athStats(['2026-01-01','2026-01-02','2026-01-05'],[null,100,90]).start` = `2026-01-01`; `athStats([…3 date],[100,null,90],[101,130,91]).intradayRef` = 130 del giorno senza chiusura. |
| 5 | minore | data/ath.json, riga WTI, campo `note` | Il file pubblicato ha la nota del WTI della versione precedente di config/ath.json («…perde valore e ha un massimo storico che non è quello del petrolio»), config dice «…perde valore; il suo massimo non è quello del petrolio». L'app mostra quella del file. Si allinea da sola alla prima corsa notturna (o rigenerando il file prima di pubblicare). | `node -e "…"`: confronto `note` di data/ath.json e config/ath.json; prova 0 di `prova_pipeline.sh` («diff meta WTI note»). | |
| 6 | minore | fetch_ath.js con ath.json precedente assente/corrotto e un mercato che non arriva | La riga ha `stats: null` (corretto, l'app mostra «—»), ma la serie dello storico precedente resta in ath_history.json e il log dice «tengo la riga pubblicata» anche se non ce n'è una. Innocuo (senza `stats` il grafico non si apre), solo incoerente. | `prova_pipeline.sh`, prove 3 e 4 → «WTI stats null … storico true». | |
| 7 | minore (informativo) | dati di Yahoo, ^NDX del 06/10/2026 | Il riferimento del Nasdaq-100 è 31.224,47 (Yahoo); la chiusura ufficiale di Nasdaq e FRED NASDAQ100 è 31.224,69 (scarto 0,0007%). La distanza resta −9,13% con entrambe. La fonte (Yahoo) è dichiarata; segnalo solo perché il numero esatto del massimo nel dettaglio differisce dalla chiusura ufficiale. | `verifica_ath.py --cache`, sezioni FRED e Nasdaq. | |
| 8 | minore (testo) | js/vix-view.js, colonna «Massimo dei 3 anni» | «287 giorni fa» conta i giorni fino all'**ultima chiusura** (11/11), non fino a oggi (12/11: 288). Il numero corrisponde a `days` del metodo, ma «fa» fa pensare a oggi. Proposta: «287 giorni prima dell'ultima chiusura» nel tooltip, o «da 287 giorni». Da girare a chi controlla i testi. | Pagina, vista VIX, colonna «Massimo dei 3 anni». | |

## Cosa ho verificato e passa

- **Tutti i valori di data/ath.json, 9 mercati × 21 campi** (start, from, last, lastDate, ref, refDate, distPct, days,
  cycleLow/Date/Pct, fromLowPct, belowZero, intradayRef/Date, ath, athDate, athDistPct): ricalcolati in Python con un download
  mio da Yahoo (query2, `period1=-2208988800`), date nel fuso della borsa con zoneinfo, seduta in corso scartata, regola della
  finestra e delle parità scritta da me. **0 differenze** (tolleranza: arrotondamento a 4 decimali per i prezzi, 0,01 per le
  percentuali; unico scarto 124752,5312 contro 124752,5313 del BTC, arrotondamento del mezzo).
- **data/ath_history.json**: decodificato due volte, con un decodificatore mio in Python e con `decodeDates`/`deltaDecode` di
  js/indexdata.js. 54.797 chiusure dal 2000 (o dall'inizio della serie): stesse date di Yahoo una per una, nessuna data in più
  o in meno, scarto massimo entro l'arrotondamento (0,005 con ps 100, 0,00005 con ps 10000); in tutti e 9 i mercati l'ultima
  chiusura, il massimo dei 3 anni (valore e data), il minimo dopo il massimo e l'ultima data coincidono con la tabella.
- **Pagina vera** (Chromium 1440 px, `#vix`): per i 9 mercati la riga (distanza, data del massimo, «N giorni fa», calo più
  profondo, ultima data) e il dettaglio aperto col clic (ultima chiusura, massimo, «dal …», massimo della seduta, minimo,
  risalita, massimo di sempre per il WTI, «serie dal …») corrispondono al ricalcolo indipendente formattato all'italiana;
  grafico caricato per tutti e 9, nessun errore in console.
- **Seconda fonte**:
  - FRED SP500: ultima 7.619,38 e massimo 7.818,93 del 06/10/2026, uguali; distanza −2,55% uguale.
  - FRED NASDAQ100 e Nasdaq.com NDX: ultima 28.374,25 uguale; massimo stesso giorno (06/10/2026), 31.224,69 contro 31.224,47
    (rilievo 7); distanza −9,13% uguale; minimo 26.629,81 del 05/11 uguale; massimo della seduta 31.361,37 uguale.
  - Nasdaq.com GLD, SLV, SOXX (752 sedute della finestra ciascuno): ultima chiusura, massimo dei 3 anni con data, distanza,
    minimo dopo il massimo con data, massimo della seduta con data **tutti uguali**. Su 3×752 chiusure, 2 giorni diversi
    (GLD e SLV 20/04/2026, prezzo d'asta contro ultimo scambio), lontani dai valori mostrati. SOXX: Nasdaq dà gli stessi prezzi
    divisi per 3 (frazionamento), quindi il 218,3367 del 22/06/2026 è giusto; rapporto SOXX/^SOX stabile intorno al massimo.
  - FRED DCOILWTICO (petrolio spot, non il future): massimo dei 3 anni lo stesso giorno (07/04/2026, 114,58 contro 112,95
    del future), distanze diverse di circa 2 punti per contango/backwardation; differenza attesa e già dichiarata nella nota.
    FRED si ferma al 03/11.
  - FRED CBBTCUSD (Coinbase): ultima −0,25%, massimo 124.720 del 05/10 contro 124.752 del 06/10 (convenzione della data
    diversa), distanza −40,85% contro −40,71%. Coerente.
  - KOSPI e rame: nessuna seconda fonte raggiungibile (Stooq rifiuta la connessione, Nasdaq non ha i future); controllati solo
    contro Yahoo e per anomalie.
- **Anomalie nella finestra dei 3 anni** (anomalie.py): nessuna chiusura ripetuta, nessun buco di calendario non spiegato
  (solo feste coreane di 6–8 giorni per il KOSPI, sotto il limite di 12 in config); i salti oltre il 10% sono movimenti veri
  (argento 30/01/2026 −28,5% confermato da Nasdaq, rame 31/07/2025 −22,3%, ecc.).
- **Casi limite di athStats** (casi_limite.mjs, 17 su 19 passano, i 2 no sono il rilievo 4): finestra dal 29/02 (2028 → 28/02/2025),
  28/02 di un anno bisestile, 01/03, 31/12, finestra di 12 anni sul 29/02; massimo esattamente al primo giorno della finestra
  (incluso) e il giorno prima (escluso); parità del massimo e del minimo (prima data); chiusura = 0 e < 0 dopo il massimo
  (calo e risalita null, belowZero con la data, distanza calcolata); chiusura negativa prima del massimo dentro la finestra
  (calo calcolato); nuovo massimo all'ultima seduta (0%, 0 giorni, nessun calo); ultima chiusura null; serie più corta di 3 anni;
  serie vuota e tutta null; athRows con stats null.
- **Pipeline** (prova_pipeline.sh con mock_yahoo.mjs, risposte di Yahoo salvate, senza rete), 10 prove:
  corsa normale = file pubblicato (a parte la nota del rilievo 5); mercato che non risponde → riga e storico pubblicati tenuti,
  `missing: ["WTI"]`; file precedente assente o troncato → `stats: null` (l'app mostra «—») e check_fresh lo segnala
  («senza data»); ath_history.json rotto → riga tenuta, grafico «non disponibile» per quel mercato; storia accorciata (dal 2015)
  → riga pubblicata tenuta con il motivo; accorciata di 4 giorni → accettata (soglia 30 giorni, come da commento); ultima seduta
  più vecchia (SLV −2 barre) → riga pubblicata tenuta; tutti i mercati giù → righe tenute (ma exit 0, rilievo 2).
- **check_fresh**: KOSPI fermo 7 giorni non segnalato con il limite 12 di config, segnalato col limite di default 4 se
  config/ath.json manca; `{}` segnalato; assente/illeggibile non segnalato (rilievo 3).
- **keep_unchanged**: con lo stesso ordine delle serie due corse senza sedute nuove non cambiano nessun file; con l'ordine
  diverso sì (rilievo 1).
- **Workflow**: il passo `ath` ha `continue-on-error: true` e `timeout-minutes: 5` (una corsa reale dura 1,8 s), è nella
  condizione e nel testo dell'«Esito» e nel messaggio di commit («massimi storici al …»); non blocca gli altri passi.
- `npm test`: 180 test, 180 passano.
- **I controlli possono fallire**: su una copia di data/ath.json con distPct dell'S&P 500 cambiato di 0,02, la data del
  minimo del WTI spostata di un giorno e un valore dell'oro nello storico cambiato di 1/ps, verifica_ath.py segnala 4 mercati
  non coerenti (prima: 0).

## Cosa non ho potuto verificare e perché

- Seconda fonte per KOSPI (^KS11) e rame (HG=F): Stooq rifiuta le connessioni da qui, Nasdaq.com non ha questi simboli, FRED
  ha il rame solo mensile.
- Il workflow vero su GitHub Actions (passo, Esito, commit): provato solo localmente, con gli script e un mock di fetch.
- Il KOSPI del 12/11/2026 (sessione chiusa alle 06:30 UTC): Yahoo ha la barra con chiusura null fino al giorno dopo, quindi
  la riga resta all'11/11 (data mostrata nella colonna «al»). Comportamento coerente con «solo barre chiuse», non un errore.
- Grafici, testi, telefono e temi: fuori dal tema di questo controllo.

## Script e file

Tutti in `ricerca/qa/1.10.0/numeri/`:
- `verifica_ath.py` — ricalcolo indipendente (Python, urllib, zoneinfo), storico decodificato, FRED, Nasdaq.
  `python3 -I ricerca/qa/1.10.0/numeri/verifica_ath.py` (scarica) oppure `--cache` (riusa `cache/`, ignorata da git);
  `--root DIR` per controllare un'altra copia. Uscita: `verifica_ath.out`; valori ricalcolati: `ricalcolo.json`.
  FRED e Nasdaq si scaricano con `curl --http1.1` (urllib e HTTP/2 vengono chiusi dal proxy):
  `curl --http1.1 -o cache/F_SP500.csv "https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500&cosd=2023-01-01"` (idem
  NASDAQ100, DCOILWTICO, CBBTCUSD) e
  `curl --http1.1 -A Mozilla/5.0 -o cache/N_GLD.json "https://api.nasdaq.com/api/quote/GLD/historical?assetclass=etf&fromdate=2023-11-01&todate=2026-11-12&limit=9999"`
  (idem SLV, SOXX; NDX con `assetclass=index`).
- `storico_js.mjs` — data/ath_history.json decodificato con decodeDates/deltaDecode dell'app, confronto con Yahoo e tabella.
- `casi_limite.mjs` — 19 casi limite di athStats/windowStart/athRows.
- `mock_yahoo.mjs` + `prova_pipeline.sh <clone>` — prove di fetch_ath/keep_unchanged senza rete (il clone viene modificato).
- `pagina.cjs` — numeri mostrati dalla pagina contro il ricalcolo (`python3 -m http.server 8791` sulla radice, poi
  `NODE_PATH=/opt/node-tools/node_modules node pagina.cjs`).
- `anomalie.py` — salti, chiusure ripetute e buchi nella finestra dei 3 anni.
