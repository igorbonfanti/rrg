# Controllo codice e pipeline · versione 1.3.5 · commit 5017ad6

Revisore indipendente, 5/11/2026. Modifica controllata: `git diff origin/main 5017ad6 -- scripts js test version.json`
(`scripts/lib/yahoo.js`, funzione `barDate`, più `test/yahoo_dates.test.js`). HEAD del ramo (e1de18f) ha lo stesso codice.

Verdetto: **GO**

Nessun bloccante e nessun «da correggere». Il nuovo `barDate` dà la data giusta in tutti i casi provati e cambia le date
solo dove deve (cambi, DX-Y.NYB e, fuori dall'app, i futures). Restano lacune nei test e due cose minori da annotare.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | minore | `test/yahoo_dates.test.js` | I test nuovi non coprono 4 delle parti nuove: una cache unica per tutti i fusi (non per fuso), l'assenza del `try/catch` (un fuso sconosciuto fa uscire un RangeError e il simbolo si perde), il ramo «barra aperta» senza orario che torna al `gmtoffset` e `fillLast` con `regularMarketTime` datato con il `gmtoffset`. Con ognuna di queste mutazioni `npm test` resta verde (115 su 115). Oggi non è un errore: le prove 3 e 6 qui sotto mostrano che il codice si comporta bene. Ma una regressione futura su queste righe non verrebbe vista. Basterebbero un caso con `exchangeTimezoneName: 'Mars/Olympus'` (deve dare le date del `gmtoffset`) e un caso con due fusi e lo stesso timestamp vicino alla mezzanotte. | `bash mutazioni.sh <copia git archive> <yahoo.js>` | `mutazioni.txt`: mutazioni 1–4 → 0 test falliti; 5 (fuso ignorato, cioè il codice vecchio) e 7 (giorno e mese invertiti) → 2 falliti; 6 (ripiego in UTC) → 1 fallito |
| 2 | minore | commento in `test/yahoo_dates.test.js` (righe 6–7) e `ricerca/qa/date-barre/nota.md` | «DX-Y.NYB 997 barre (6 date doppie, una barra persa per ognuna)». I numeri 997 e 6 contano tutti i timestamp di Yahoo (1.521), compresi i 264 con chiusura nulla. Fra le barre con una chiusura le barre spostate sono 824 su 1.257, le date doppie sono 0 e il parse vecchio non perdeva barre: per DX-Y.NYB dà 1.256 date come il nuovo. Le 6 date doppie sono le domeniche del cambio d'ora di marzo e il 3/07/2025, tutte su barre nulle. Una barra persa c'è solo per i futures (GC=F, ES=F, CL=F: 1 ciascuno), che l'app non usa. Né il README né l'app riportano questi numeri: va corretto solo il commento o la nota. | conteggio inline nel rapporto (raw `5y_DX-Y.NYB.json`) | timestamp 1.521, spostati 997; con chiusura 1.257, spostati 824, date doppie fra le barre con chiusura: 0 |
| 3 | minore | `barDate`, ramo `catch` | Il formatter che fallisce (fuso sconosciuto) non si mette in cache, quindi ogni barra rilancia e intercetta un RangeError: 1.300 barre costano circa 200 ms invece di 4 ms. Se un giorno Yahoo mandasse un fuso che Intl non conosce per tutti i ~4.000 titoli della breadth, la corsa allungherebbe di circa 13 minuti (il timeout del job è 45). Le date restano giuste (si ripiega sul `gmtoffset`, come prima). Oggi tutti i fusi visti (43, sotto) sono noti a Intl. Si potrebbe salvare il fallimento, per esempio con `DAY_FMT[tz] = null`. | `node fuso_sconosciuto.mjs` | `fuso_sconosciuto.txt` |
| 4 | minore | `barDate`, cache `seen` | La cache non si svuota mai. Nel caso reale non pesa: su 1.287.503 timestamp (4.556 titoli con spark più 76 serie chart) quelli diversi per fuso sono 85.574, perché i titoli della stessa borsa hanno le barre alla stessa ora (New York: 13:30 o 14:30 UTC). Nel caso peggiore, timestamp tutti diversi (non osservato), 4.000 serie da 6.500 barre occupano circa 1 GB e 308 s, contro 23 s del codice vecchio. | `node --expose-gc prestazioni.mjs raw/p2001_SPY.json 4000` | `prestazioni.txt`, `cache_timestamp.txt` |
| 5 | minore | `scripts/backfill_indices.py` riga 201; vecchi script di controllo in `ricerca/qa/audit-0.9.*` | Usano ancora `ts + gmtoffset`. Per i titoli (barre all'apertura) non cambia nulla: con spark sono state verificate 1.118.612 barre e con chart la storia dal 2001. Ma chi li riusasse per controllare cambi o DX-Y.NYB d'inverno ritroverebbe l'errore di prima. Basta una nota nel file. | lettura del codice | — |

## Cosa ho verificato e passa

1. **Date nuove contro una seconda implementazione** (`confronto.mjs` → `verita.py`, con zoneinfo di Python e non Intl):
   - 4.556 membri di tutti gli indici scaricati con spark (come `fetch_indices.js`): 1.118.612 barre;
   - 63 serie chart a 5 anni: 79.374 barre. Comprende i cambi EURxxx=X e USDJPY=X, DX-Y.NYB, i futures, ^GSPC, ^NDX, ^RUT, ^DJI, ^VIX, ^TNX, ETF USA ed europei, DBMF, DBMFE.PA, bitcoin, Sydney (BHP.AX, CBA.AX, ^AXJO), San Paolo (PETR4.SA, VALE3.SA, ^BVSP), Tokyo, Mumbai, Hong Kong, Shanghai, Shenzhen, Seoul, Taipei, Toronto, Auckland, Città del Messico e Tel Aviv;
   - 13 serie giornaliere dal 2001 (83.663 barre): ci sono le regole dell'ora legale USA prima del 2007, quella del Brasile fino al 2019 e quella del Messico fino al 2022.

   Risultato: **0 serie** in cui il nuovo è diverso da zoneinfo e **0 serie** in cui il nuovo cambia se si cambia il `gmtoffset` (stagione del download). In tutto 43 fusi, compresi Cairo, Santiago e Auckland. Le barre nel fine settimana con il nuovo sono solo sedute vere: Golfo ed Egitto la domenica, Mumbai sabato 1/02/2025 (bilancio).
2. **Dove cambiano le date rispetto al codice di main**:
   - con il `gmtoffset` di oggi (inverno al Nord) cambiano solo i 9 cambi (758 barre su 1.299 ciascuno, 151 finite di domenica), DX-Y.NYB (824 su 1.257) e 3 futures;
   - con il `gmtoffset` dell'altra stagione non cambia nulla;
   - tutti gli indici, i titoli e gli ETF sono identici, Sydney e San Paolo compresi. Spark: 0 differenze su 4.556 simboli.
3. **Barra aperta e fillLast** (`barra_aperta.mjs`): 36.540 combinazioni (63 serie, con e senza `currentTradingPeriod`, `fillLast` sì e no, «adesso» ogni 30 minuti per 72 ore dopo l'ultima barra) più la stessa prova su risposte tagliate al 15/07/2026 con il `gmtoffset` estivo (18.270 combinazioni). Ultime due date e ultima chiusura identiche al codice di main in tutti i 54.810 casi.
4. **Fuso assente, vuoto, null, numerico o sconosciuto**: stesse date del codice vecchio. Gli alias che Yahoo può mandare (Asia/Calcutta, Europe/Kiev, US/Eastern, EST5EDT, GMT) sono accettati da Intl: 13 casi su 13.
5. **Prestazioni**, caso reale con 4.000 serie da 6.500 barre e gli stessi timestamp: nuovo 2,2 s, vecchio 25,3 s. La cache cresce di 0,5 MB.
6. **Prima corsa notturna simulata** (`prima_corsa.mjs`): `fetch_data.js` (us, global, macro) lanciato nello stesso momento con il codice di main e con il nuovo `yahoo.js`, partendo dai file pubblicati su `origin/main` (2a72c39). Si contano solo gli scarti oltre lo 0,01% (sotto c'è il rumore delle rettifiche di Yahoo tra due richieste).
   - `prices.json`: identico.
   - `prices_global.json`: cambia solo DBMFE.PA, in 874 sedute dal 5/11/2021 al 25/04/2025. Il fattore di raccordo passa da 4,5723 a 4,5459; scarto massimo 2,25% il 5/07/2022.
   - `prices_macro.json`: cambia solo DXY_INV, in 629 sedute; scarto massimo 1,97% il 9/04/2025.
   - Nessun «Tenuti … prezzi già pubblicati», nessun `copied` diverso, «prezzi corretti: 0», stessi asOf e stesse sedute attese. `check_fresh.js` dà «Dati aggiornati.» in entrambe le copie.
   - `keepPublished` non riporta indietro valori vecchi di DXY: DX-Y.NYB è solo una sorgente e non sta fra i `tickers` del file.
   - Breadth, settori, indici e cali forti non cambiano (punti 1 e 2), quindi `keep_unchanged.js` non c'entra. Nessun controllo di freschezza o di «dati sospetti» ferma la pubblicazione.
7. **Altri punti della pipeline**:
   - `need_update.js`, `check_fresh.js` e `js/calendar.js` lavorano su date ISO già calcolate o sull'ora di New York (Intl) e non datano barre di Yahoo;
   - `fetch_breadth.js`, `fetch_indices.js` (chart e spark) e `fetch_data.js` passano tutti da `parse`;
   - `js/` non data barre.
8. **Test**: `npm test` dà 115 su 115. Con la copia del codice vecchio i 2 test sui cambi e su DX-Y.NYB falliscono, mentre il test «senza exchangeTimezoneName» passa (è una regressione voluta e fallisce se il ripiego va in UTC).

## Cosa non ho potuto verificare e perché

- Non ho lanciato una corsa completa di `fetch_breadth.js` e `fetch_indices.js` (circa 4.000 e 4.600 simboli due volte). Al loro posto: tutti i membri degli indici con spark e un campione chart dal 2001. Lo stesso `parse` dà date identiche al codice di main.
- Una corsa vera d'estate non si può fare oggi: l'ho simulata con il `gmtoffset` dell'altra stagione e con risposte tagliate a luglio.
- ^IPSA (Santiago) non ha risposto. Il fuso America/Santiago è comunque coperto da un titolo dell'EEM con spark.
- Versione di ICU e dei fusi: qui Node 22.22, ICU 77.1, tzdata 2025b. Sull'Action gira Node 22 di setup-node, non verificato. Conta solo per le barre a mezzanotte locale se un paese cambia le regole dell'ora legale.

## Script e output

`ricerca/qa/1.3.5/codice/`:
- confronto e seconda implementazione: `confronto.mjs`, `verita.py`, `verita.txt`;
- barra aperta e fillLast: `barra_aperta.mjs`, `barra_aperta.txt`;
- fusi strani: `fuso_sconosciuto.mjs`, `fuso_sconosciuto.txt`;
- prestazioni e cache: `prestazioni.mjs`, `prestazioni.txt`, `cache_timestamp.txt`;
- mutazioni dei test: `mutazioni.sh`, `mutazioni.txt`;
- prima corsa simulata: `prima_corsa.mjs`, `prima_corsa.txt`.

Le risposte grezze di Yahoo e le copie del repository usate per le corse sono nella scratchpad della sessione, non nel repository.
