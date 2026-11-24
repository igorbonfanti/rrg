# Controllo numeri e dati · versione 1.11.0 · commit 56e6768

Verdetto: **GO**. Non ci sono bloccanti. I due punti «da correggere» riguardano casi che con i dati di oggi non succedono (i dati pubblicati sono giusti): si possono correggere subito o annotare in `docs/sviluppo.md`.

Lavoro fatto su copie in una cartella temporanea (`git archive 56e6768`, e `origin/main` per la 1.10.2). Il `data/` del repository non è stato toccato. Risposte grezze di Yahoo salvate con `ATH_RAW_DIR` il 13/11/2026 alle 20:40 UTC (due corse, raw1 e raw2). Seconda fonte: api.nasdaq.com (SPY, QQQ, SOXX). Stooq non è raggiungibile dal proxy.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | `scripts/lib/volprofile.js`, `scaledBars` / `buildProfile` | La regola «sedute senza chiusura comune, oltre il 5% → null» conta solo le sedute dello strumento dei volumi che il grafico non ha. Le sedute del grafico che lo strumento non ha non si contano: se mancano 30 sedute di SPY su 252 (12%), il profilo esce lo stesso con 222 sedute. Con le orarie, un buco di 2 mesi (marzo-aprile) dà un profilo con 209 sedute su 252 e nessun avviso: si controlla solo l'inizio delle orarie (7 giorni). Il profilo viene pubblicato «dal 12/11/2025 al 12/11/2026» anche se mancano mesi interi. Con i dati di oggi non succede: copertura completa, `copertura.py`. | `node errori.mjs <copia> <raw>` (righe INFO) | errori.mjs, copertura.py |
| 2 | da correggere | `volumeProfile`: `lo`/`hi` a 8 cifre significative; riquadro con 2 decimali | Il commento dice che 8 cifre «bastano ai due decimali del riquadro anche per il bitcoin». Non è così: per BTC 9 barre su 25 hanno un estremo con la seconda cifra decimale sbagliata di 0,01 (esempio: mostrato 78.921,20, il valore esatto è 78.921,2055 e va arrotondato a 78.921,21), perché `hi` passa da 105.297,2344 a 105.297,23. Gli altri 8 mercati sono esatti. L'errore pratico è nullo, ma è un numero mostrato non riproducibile. Rimedi: 10 cifre per `lo`/`hi`, oppure il bitcoin senza decimali. | `riquadro_browser.cjs` + `riquadro_confronto.py` | 540 riquadri letti nel browser (1440 e 390 px) |
| 3 | minore | riquadro, quota «x,x%» | La quota del riquadro si calcola dai bp arrotondati all'intero. In 17 riquadri su 540 è 0,1 punti diversa dalla quota esatta arrotondata (errore massimo 0,03 punti). È la conseguenza dell'arrotondamento dichiarato nel README («quote in centesimi di punto»), ma la guida non lo dice. In alternativa i bp con un decimale (pochi byte in più). | `riquadro.py`, `riquadro_confronto.py` | |
| 4 | minore | KOSPI | Oggi Yahoo dà ^KS11 del 13/11 con la chiusura nulla. La riga del mercato resta quella pubblicata (ultima seduta 13/11), mentre il profilo è calcolato al 12/11: dal 12/11/2025 al 12/11/2026, 245 sedute, uguale al ricalcolo. Grafico al 13/11 e profilo al 12/11, mentre la guida dice «il profilo finisce con l'ultima seduta del grafico». La legenda mostra le date giuste. Comportamento corretto di `pickProfile`, frase della guida un po' assoluta. | `run1.log` | |
| 5 | minore | log di `fetch_ath.js` | Con `fresh` null il motivo è sempre «non arrivato», anche quando lo strumento è arrivato ma il calcolo è fallito (per esempio «non arrivato (nessuna seduta nella finestra)»). Con `lastDate` null il messaggio dice «oltre 4 giorni», cosa non vera. Riguarda solo il log. | replay con `REPLAY_BAD=QQQ` | |
| 6 | minore | `config/ath.json`, `text` di SI=F e HG=F | Il testo «dalle barre orarie» è fisso. Se un giorno il volume giornaliero di Yahoo superasse la metà di quello orario, `source` diventerebbe «giornaliere» ma legenda e riquadro direbbero ancora «dalle barre orarie». Si può derivare il testo da `source`. | errori.mjs, caso «volume giornaliero = somma oraria» | |

## Cosa ho verificato e passa

- **Ricalcolo indipendente** (`ricalcolo.py`, Python, scritto solo dal metodo dichiarato; zoneinfo, orarie dei future dalle 18 di New York, fattore delle chiusure, volume ricopiato, 100 fasce logaritmiche): per tutti e 9 i mercati `from`, `to`, `sessions`, `source`, `lo`, `hi`, `n`, `scale` e i 100 `bp` sono **identici**, sia sul file della corsa di controllo sia sul `data/ath_history.json` del commit. Nessuna differenza di arrotondamento (|bp − esatto| ≤ 0,499). Il controllo può fallire: un bp spostato, `sessions` cambiato e una pipeline con la regola giornaliero/orario alterata vengono segnalati come DIVERSO.
- **Numeri dei testi**: rapporto giornaliero/orario SI=F 0,0024 e HG=F 0,0220 (testo: 0,24% e 2,2%); somme dei bp da 9.990 a 10.005 (README); 5 richieste in più per 1.360.842 byte (README: 1,36 MB; workflow: ~1,4 MB); 5 sedute senza chiusura comune per argento e rame (feste USA con Globex aperto: 27/11, 19/01, 16/02, 19/06, 03/07); volume ricopiato tolto su GC=F e CL=F il 12/11 (132.437 = 132.437 e 240.619 = 240.619).
- **Seconda fonte (Nasdaq)** per SPY, QQQ e SOXX: massimi e minimi entro lo 0,004%, chiusure uguali, volume con mediana 0,00% (l'unica grande differenza, SPY del 17/04/2026, è un valore segnaposto di Nasdaq: 9.999.999). Il profilo rifatto con le barre di Nasdaq sposta lo 0,13–0,64% del volume e ha le stesse 3 fasce più alte.
- **Nel browser**: 540 riquadri (tutte le barre di tutti i 9 mercati, 3A, 1440 e 390 px) con estremi e quota confrontati con il ricalcolo; legenda con date e strumento; console senza errori.
- **Regole d'errore** (`errori.mjs`, 38 casi sui dati reali modificati, 0 KO): volume 0 su 25/252 sedute tenuto, su 27/252 null; volume mancante come 0; volume ricopiato tolto (anche sulla prima seduta della finestra); prezzi 0 o negativi null; 12 sedute senza chiusura comune tenute, 13 null; orarie dal giorno +7 tenute, +8 o +30 null, vuote o non arrivate null; `pickProfile` (10 casi, maxAge 4 e 12); `prevProfileOf` (strumento o simbolo cambiato → null); `staleData` (4/5 giorni, KOSPI 12/13, null, file senza profili).
- **check_fresh.js** sulla copia: «Dati aggiornati» con il file del commit; esce con 1 con un profilo null o fermo da 6 giorni.
- **La corsa non fallisce per il profilo** (replay senza rete, `replay.mjs`): con SPY, QQQ, 069500.KS e le orarie di SI=F e HG=F che danno HTTP 404, la corsa esce con 0, i 5 profili pubblicati restano e ci sono 5 avvisi. Partendo dal file della 1.10.2 (senza `profiles`) con SPY e SI=F giù e QQQ vuoto: corsa con 0, tre profili null, check_fresh esce con 1. Con il grafico ^GSPC giù la corsa esce con 1 come prima (riga tenuta), e il profilo resta quello pubblicato.
- **Due corse di fila**: `data/ath.json` e `data/ath_history.json` cambiano solo per `generated`, e `keep_unchanged.js` li ripristina tutti e due.
- **Nessuna regressione di yahoo.js** (`parse_regressione.mjs`): su 596 risposte salvate (cache della ricerca e raw1), 31.082 confronti tra `parse` e `fetchDaily` vecchi (1.10.2) e nuovi, con 5 combinazioni di opzioni, 5 istanti (anche dentro l'ora dopo la chiusura) e fetch finto per URL ed errori: 0 differenze. Con `withVolume` l'uscita è quella di prima più low e volume. Il controllo può fallire: con SETTLE = 0 trova 130 differenze, con l'URL cambiato 224. `fetch_ath.js` vecchio e nuovo scrivono lo stesso `ath.json` e le stesse `series`. `fetch_vix.js` vecchio e nuovo scrivono lo stesso `vix.json`. `npm test`: 192 su 192 passano (10 in `volprofile.test.js`).

## Cosa non ho potuto verificare e perché

- Se il volume ricopiato di GC=F e CL=F «torna la notte dopo» (frase della guida): alle 20:41 UTC del 13/11 il 12/11 è ancora ricopiato. Si vede solo con la corsa di domani: confrontare `d_GC_F` di stanotte.
- `fetch_data.js`, `fetch_industries.js` e `fetch_breadth.js` non li ho lanciati per intero (molte richieste). Sono coperti dall'equivalenza di `parse` e `fetchDaily` con fetch finto, l'unico punto in comune che cambia.
- Il criterio di stabilità («6 mercati su 9») non l'ho ricalcolato: è materia della ricerca, non del codice nuovo.
- Nessuna seconda fonte per i future, BTC e 069500.KS. Stooq non è raggiungibile e non si fa scraping di TradingView o StockCharts.

## Script

Tutti in `ricerca/qa/1.11.0/numeri/`. Le risposte grezze sono rimaste fuori dal repository, nella cartella temporanea.

- `ricalcolo.py`: ricalcolo indipendente e confronto con uno o più `ath_history.json`.
- `copertura.py`: sedute del grafico e dello strumento.
- `seconda_fonte.py`: Nasdaq.
- `riquadro.py`: arrotondamento delle quote.
- `riquadro_browser.cjs` e `riquadro_confronto.py`: riquadri nel browser.
- `errori.mjs`: regole d'errore, pickProfile, check_fresh.
- `replay.mjs`: fetch finto per `fetch_ath.js`, con 404 e risposte vuote.
- `parse_regressione.mjs` e `yahoo_1.10.2.js`: yahoo.js vecchio contro nuovo.
