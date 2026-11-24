# Controllo numeri e dati · versione 1.6.0 · commit 06a5360

Verdetto: **GO** (nessun bloccante, nessun «da correggere»; 2 minori)

Fonti scaricate da me il 09/11/2026 alle 11:20 UTC in `src/`: FRED `VIXCLS`, `VXVCLS`, `BAMLH0A0HYM2` (fredgraph.csv), Cboe `VIX_History.csv` e `VIX3M_History.csv`, Yahoo chart API (dal 2007, con adjclose ed eventi) per HYG, IEF, ^GSPC, ^VIX, ^VIX3M. Nessuno script importa `js/` o `scripts/` dell'app (decodifica del file, percentili, distanza dal massimo e variazione scritti da zero in `lib.mjs`).

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | minore | `js/vix-view.js`, `renderKpis` (riga `vxMeta`, funzione `after`) | La riga sotto i riquadri dice sempre «(FRED al …, poi Cboe provvisorio)», per il VIX e per il VIX3M. Ma `fetch_vix.js` (`volSeries` → `mergeTail`) usa Yahoo quando Cboe non ha ancora la seduta (la Action parte alle 22:40 UTC), e il file non registra da quale fonte viene la coda. In quel caso la pagina nomina la fonte sbagliata. Oggi non succede: Cboe aveva il 06/11. La nota «Fonti» in fondo alla vista cita il ripiego su Yahoo. | Leggi il codice. Oppure fai girare `fetch_vix.js` con il file Cboe irraggiungibile: la riga dice comunque «Cboe». | `vix-1440.png` (riga meta) |
| 2 | minore | README, sezione 8 VIX, e commento in testa a `scripts/fetch_vix.js` | La frase «VIX: 0 differenze su 9.309 sedute» parla di sedute, ma tra le date confrontate ci sono 33 giorni di borsa chiusa (dal 30/05/2022 al 07/09/2026): FRED e Cboe pubblicano il VIX anche in quei giorni. Il conteggio giusto è «9.309 date» (oggi 9.310, con il 05/11). Le 0 differenze sono confermate. La frase c'era già nella 1.5.0 ed è stata riscritta nella 1.6.0. | `node testi.mjs` (righe «VIX FRED/Cboe») e lo snippet del rapporto sulle date fuori seduta | output di `testi.mjs` |

Osservazione, non un rilievo: «dal 2008 tutti gli episodi sopra 30 erano già in backwardation» è vero per gli episodi, cioè per il giorno del segnale (13 su 13). Però dal 2008 il 44% delle sedute con VIX ≥ 30 (197 su 446) era in contango. Chi legge in fretta può capire «VIX sopra 30 = backwardation».

## Cosa ho verificato e passa (90 controlli automatici più i ricalcoli dei testi)

**Riquadri nel browser** (`browser.cjs`, 31 controlli, 0 falliti). Pagina a 1440 px, ricalcolo da `ricalcolo.mjs`.
- VIX / VIX3M: 1,04 «backwardation» (R = 25,64 / 24,60 = 1,04228), «VIX 25,64 / VIX3M 24,60», al 06/11/2026, 95° percentile (95,42, storia fino a quel giorno con almeno 252 valori), «provvisorio». È giusto, perché il 06/11 viene da Cboe e FRED arriva al 05/11.
- Credito: −3,1% dal massimo di 252 osservazioni (−3,0932), −2,5% in un mese (−2,5099 su 21 osservazioni), 57° percentile della profondità (56,91), al 06/11/2026.
- Riquadro dei valori del grafico: 17 date distinte, con il puntatore sui periodi MAX, 10A e 3A, dal 1991 al 06/11/2026. VIX3M, R con stato e credito coincidono in tutte. Prima del 04/12/2007 c'è «—», e il credito ha «—» fino all'08/04/2008. All'ultima seduta compare «24,60 provv.».
- Console senza errori.

**I controlli possono fallire** (`muta.mjs`).
- Con l'ultimo VIX3M alzato di 0,40, `browser.cjs` dà 4 FAIL (rapporto, sottotitolo, percentile, riquadro dei valori).
- Con HYG/IEF del 18/06/2015 abbassato dell'1%, dà 1 FAIL in quella data (−6,1% contro −5,2%).

**Ultima seduta senza VIX3M** (`manca.cjs`, file `mut/v3_manca_ultima.json`). Il riquadro mostra «—» e «VIX3M del 06/11/2026 non ancora arrivato · al 05/11/2026 era 1,10 (backwardation)». Il valore è giusto: 28,18 / 25,55 = 1,103. La riga meta dice «VIX3M al 05/11/2026» e il riquadro dei valori «—».

**data/vix.json** (`ricalcolo.mjs`, `ripetuti.mjs`)
- VIX3M:
  - dal 04/12/2007 al 06/11/2026, 4.762 valori;
  - 0 differenze dalla fonte (FRED fino al 05/11, Cboe il 06/11) e 0 sedute dell'S&P 500 senza valore;
  - 0 valori in giorni senza seduta;
  - 40 coppie di valori uguali consecutivi, tutte identiche in FRED, mai 3 di fila.
- VIX: dal 2007, 0 differenze e 0 giorni fuori seduta. Le 33 date di FRED a borsa chiusa sono escluse.
- FRED VXVCLS contro Cboe: 4.310 date comuni, 4.310 uguali.
- Yahoo contro Cboe dal 2016: ^VIX3M ha 2 differenze su 2.728. Il 06/02/2026 Yahoo ^VIX dà 20,37, Cboe e FRED 17,76: confermato.
- asOf: `vix3m` 06/11 = ultima data della serie; `fred3m` 05/11 = ultima data di FRED; `credit` 06/11. Tutti coerenti.
- HYGIEF:
  - dal 11/04/2007 (prima seduta di HYG), 4.927 valori, tutti nelle sedute dell'S&P 500, nessuna mancante;
  - rapporto contro adjclose(HYG)/adjclose(IEF) di oggi: scarto relativo massimo 1,35e-5, entro la precisione salvata di 5 decimali. 78 valori superano di poco mezza unità del 5° decimale, per il rumore di Yahoo sulle chiusure rettificate;
  - effetto sulla distanza dal massimo: al massimo 0,002 punti, invisibile a 1 decimale;
  - 8 coppie uguali consecutive: sono vere. Le chiusure delle due sedute coincidono nella fonte, con OHLC e volumi diversi.

**Dividendi** (`dividendi.mjs`)
- In Yahoo il rapporto adjclose/close cambia solo nei giorni di stacco: 233 su 233 per HYG, 237 su 237 per IEF, nessuno split. Il salto è uguale a 1 − dividendo / chiusura del giorno prima, con scarto massimo 1,2e-6.
- Ho ricostruito, per 976 sedute dal 2008, la serie «come Yahoo l'avrebbe data quel giorno», con i soli dividendi già staccati. La distanza dal massimo differisce da quella con le chiusure rettificate di oggi al massimo di 0,0002 punti, la variazione a 21 sedute di 0,0002.
- Il livello invece cambia: il 04/01/2016 era 0,75538 «allora» e 0,54690 oggi.
- Quindi la frase del README è dimostrata: Yahoo riscrive il livello, non la distanza né la variazione, e quindi nemmeno il percentile.

**Nessun dato futuro**
- `passato.cjs`, 16 controlli, 0 falliti. Ho servito il file tagliato a 8 date (20/11/2008, 20/05/2010, 08/08/2011, 24/08/2015, 08/02/2018, 16/03/2020, 12/10/2022, 08/04/2025). R, stato, percentile, distanza, variazione e percentile del credito coincidono con il ricalcolo fatto con la sola storia fino a quel giorno. Nel 2008 non c'è percentile, perché la storia ha meno di 252 valori.
- Col file intero, la distanza dal massimo nel riquadro dei valori coincide con il ricalcolo «come allora» in 17 date.
- `futuro.mjs`: con tutta la storia, 12 percentili su 14 sarebbero diversi all'unità, quindi il controllo distingue un calcolo con dati futuri.

**Numeri dei testi** (`testi.mjs`, più gli script della ricerca rieseguiti)
- «Dal 2008 tutti gli episodi sopra 30 erano già in backwardation»: 13 episodi su 13 al segnale. Vale anche con «> 30» stretto. Alla soglia 40 sono 7 su 7, alla soglia 50 3 su 3.
- «2008: −41%, 2020: −29%»: minimi −41,39% (11/12/2008) e −29,15% (23/03/2020).
- «91% delle sedute»: ho rieseguito `ricerca/vix/struttura/dati/dati.mjs` e `ricontrollo.py`, che dà 4.336 su 4.761 (91,07%). Poi ho rimesso i file `risultati.json` e `ricontrollo.json` com'erano. Le copie rieseguite sono qui: `dati_rieseguito.txt`, `dati_risultati_rieseguito.json`, `ricontrollo_rieseguito.json`.
- «4.310 date su 4.310»: confermato.
- «HY OAS su FRED solo 3 anni»: la serie parte dal 07/11/2023.
- «VIX3M dal 04/12/2007» e «HYG/IEF dal 2007»: confermati.

## Cosa non ho potuto verificare e perché
- Seconda fonte per HYG e IEF: Stooq non è raggiungibile dal proxy (connessione chiusa). Ho controllato solo la coerenza interna di Yahoo: chiusure, dividendi e chiusure rettificate.
- Il caso con la coda del VIX o del VIX3M presa da Yahoo: oggi Cboe aveva la seduta, quindi il rilievo 1 viene solo dalla lettura del codice.
- I futures VX1/VX2 non li ho ricalcolati con codice mio. Ho rieseguito i due script della ricerca, uno dei quali (`ricontrollo.py`) è già indipendente.
- Telefono, tema chiaro e altri temi di controllo: fuori dal tema «numeri».

## Script e screenshot
Tutto in `ricerca/qa/1.6.0/numeri/`:
- Script:
  - `lib.mjs`, `ricalcolo.mjs` (scrive `ricalcolo.json`);
  - `browser.cjs`, `muta.mjs`, `manca.cjs`, `passato.cjs`, `futuro.mjs`;
  - `dividendi.mjs`, `ripetuti.mjs`, `testi.mjs`, `shot.cjs`.
- Fonti: `src/`. File alterati: `mut/`.
- Screenshot: `vix-1440.png`, `vix-riquadri.png`, `vix-grafico.png`, `vix-tip-ultima.png`, `vix-manca-v3.png`.

Per rilanciare: `node ricerca/qa/server/gzserve.mjs . 8792 &`, poi nella cartella `node ricalcolo.mjs && BASE=http://127.0.0.1:8792/ NODE_PATH=$(npm root -g) node browser.cjs && … node passato.cjs`. Per la prova di fallimento: `node muta.mjs && VIXJSON=mut/v3_ultimo.json … node browser.cjs`.
