# Controllo Numeri e dati · versione 1.3.5 · commit 5017ad6

Verdetto: **NO-GO solo per il testo** (rilievo 1, da correggere nel README). Codice e dati: GO. Tutti i numeri
dichiarati si ricalcolano. Il nuovo `barDate` riporta i file ai valori pubblicati prima del cambio d'ora e non tocca
nient'altro.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | README 1.3.5, «640 sedute su 1.254 … (scarto mediano 0,01%, massimo 1,97%)» | 0,01% è la mediana su **tutte** le 1.254 sedute, comprese le 614 identiche. Sulle 640 sedute sbagliate lo scarto mediano è **0,27%** (95° percentile 0,89%). Scritta tra parentesi accanto a «640 sedute», la cifra si legge come lo scarto di quelle sedute e lo fa sembrare 27 volte più piccolo. Per un benchmark della rotazione conta anche il rendimento giornaliero: scarto mediano 0,13 punti, massimo 3,25. | `node ricostruisci.mjs <cache> <prices_macro di main> <prices_global di main>` | `ricostruzione_main.json`: `scartoLivelloSuDiverse.med` = 0,267; `scartoLivelloSuTutte.med` = 0,0101; `scartoRendimentiPunti` |
| 2 | minore | README 1.3.5 (e NOTES: «corretti il dollaro … e la storia di DBMFE.PA») | Il testo non dice da quando i file erano sbagliati. Sui 39 commit dei dati su `main` (dal 18/10): DBMFE.PA coincide con la ricostruzione **nuova** fino al 24/10 e con la **vecchia** dal 27/10. DXY_INV coincide con la nuova fino al 31/10 e con la vecchia dal 3/11. La correzione riporta quindi i valori di 10 giorni prima; letta così com'è, la nota fa pensare a una storia sbagliata da sempre. Lo stesso errore torna ogni inverno. Proposta: «file sbagliati dal 26/10 (cambi) e dal 2/11 (DXY), come ogni volta che lo script gira con l'ora solare». | loop sui commit (comando in fondo) | `storia_file_main.txt` |
| 3 | minore | README 1.3.5, «la storia di DBMFE.PA prima del 28/04/2025 … scende dello 0,58%» | −0,58% è la mediana. Il calo uniforme del fattore vale solo per le 517 sedute invernali su 876. Nelle 359 sedute estive cambia anche il cambio usato: da −2,25% (5/07/2022) a +2,20%, e 43 sedute salgono. Il calo vale anche per i rendimenti giornalieri: scarto mediano 0,02 punti, 95° percentile 1,10, massimo 2,96. La nota di ricerca (`date-barre/nota.md`) lo dice, il README no. | come 1 | `ricostruzione_main.json` → `DBMFE.scartoPrimaDelRaccordoPct`, `scartoRendimentiPunti` |
| 4 | minore (da sapere, non è un errore del codice) | README 1.3.5, «con le date giuste la chiusura Yahoo del cambio del giorno d è il prezzo della sera prima» | Confermato con due fonti indipendenti. Per EURUSD però la data nuova **non** fa coincidere il movimento del giorno d con quello della fonte esterna del giorno d. Barre estive contro FRED DEXUSEU (mezzogiorno di New York): correlazione dei rendimenti 0,41 con la data nuova, 0,91 con la vecchia, 0,88 con FRED del giorno prima. Contro la BCE: 0,72 con la nuova, 0,66 con la vecchia. Le barre orarie di Yahoo dicono la stessa cosa: la chiusura della barra d cade intorno alla mezzanotte di Londra all'inizio di d. Dopo la correzione, il DBMF del giorno d (16:00 a New York) si converte con il cambio di circa 21 ore prima. Il codice vecchio, d'estate, usava quello di circa 3 ore dopo. La scelta è coerente con l'inverno, con i file pubblicati fino al 24/10 e con la regola «nessun dato futuro». Il fattore del raccordo resta comunque incerto di circa mezzo punto: il 28/04/2025 vale 1,1343 con la data nuova, 1,1409 con la vecchia, 1,1387 su FRED e 1,1358 sulla BCE. «Corretta» va letto come «coerente», non come «più vicina al cambio vero». | `node seconda_fonte.mjs <cache>`, `node ora_chiusura_fx.mjs <cache> EURUSD=X …` | `seconda_fonte.json`, `ora_chiusura_eurusd.json` |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer),
da correggere, minore.

## Cosa ho verificato e passa

1. **Costruzione delle serie** (lettura di `scripts/fetch_data.js`):
   - DXY_INV = `round4(10000 / round4(DX-Y.NYB))`, ultima barra con data ≤ seduta NYSE;
   - DBMFE.PA prima del 28/04/2025: DBMF `adjclose` diviso per il cambio EURUSD=X dell'ultima barra con data ≤ data del DBMF (`toCurrency`), poi moltiplicato per k = DBMFE.PA[28/04/2025] / DBMF_eur[28/04/2025] (`spliceHistory`), allineato al calendario di Borsa Italiana.
   - `keepPublished` non conserva i valori vecchi: DX-Y.NYB non è tra i ticker pubblicati, e per il DBMF i giorni senza barra prendono il valore del giorno prima riscalato.
2. **Ricostruzione indipendente** (`ricostruisci.mjs`). Non usa il codice dell'app: le regole dell'ora legale USA e UE sono scritte a mano e, su 1.521 barre, coincidono con Intl (0 differenze).
   - **DXY_INV di `main`** (5/11, dati al 4/11): 1.253 sedute su 1.254 uguali alla ricostruzione vecchia. Fa eccezione solo il 4/11, barra ancora aperta all'ora della corsa. Con la nuova le sedute uguali sono 613.
   - **640 sedute su 1.254 diverse ✔.** In tutte e 640 il valore vecchio è la chiusura della seduta NYSE dopo ✔. Sono le sedute estive tranne il venerdì e le vigilie di festa, dove la data vecchia per caso è giusta.
   - **Massimo:** 9/04/2025, 99,1375 contro 97,1817, cioè −1,97% rispetto al vecchio ✔ (+2,01% rispetto al nuovo).
   - **DBMFE.PA di `main`:** 1.262 sedute su 1.262 uguali alla ricostruzione vecchia.
   - **Fattore del raccordo:** 4,5723 → 4,5459 ✔. **Mediana:** −0,578% ✔. Dopo il raccordo nessuna differenza ✔.
   - **Barre spostate:** EURUSD=X 760 su 1.305, DX-Y.NYB 997 su 1.521 ✔ (come `nota.md`).
3. **Il controllo può fallire.**
   - I file di `main` del 5/11 coincidono con la ricostruzione vecchia e non con la nuova (613 su 1.254). Il controllo distingue le due versioni.
   - `data/` del ramo (31/10: Londra già con l'ora solare, New York ancora con l'ora legale) dà DBMFE.PA vecchio (1.259 su 1.259) e DXY_INV nuovo (1.251 su 1.252), come previsto.
   - Sui 39 commit dei dati di `main`, ogni file è uguale alla ricostruzione nuova finché la pipeline girava con l'ora legale (rilievo 2). È una prova indipendente che il codice nuovo riproduce i dati pubblicati prima.
4. **Seconda fonte per le date** (`seconda_fonte.json`). Il DXY è ricostruito con la formula ICE dai sei cambi FRED H.10 (mezzogiorno di New York) e BCE (14:15 CET); DTWEXBGS serve solo per il segno.
   - Barre estive del DXY (817), rendimenti del giorno d:

     | Confronto | Data nuova | Data vecchia |
     |---|---|---|
     | Correlazione con il DXY da FRED | **0,92** | 0,44 |
     | Stesso segno del DXY da FRED | **86%** | 50% |
     | Correlazione con il DXY dalla BCE | **0,65** | 0,39 |
     | Stesso segno di DTWEXBGS | **81%** | 49% |

   - Nelle barre invernali, che non cambiano, la correlazione con il DXY da FRED è 0,96.
   - Le barre orarie di DX-Y.NYB confermano: la chiusura giornaliera è il prezzo delle 14–15 di New York dello stesso giorno (257 barre su 492 con lo scarto più frequente).
   - Campione: il 9/04/2025 il DXY da FRED vale 102,33; Yahoo con la data nuova 102,90, con la vecchia 100,87, che è la chiusura del 10/04.
   - EURUSD: vedi rilievo 4.
5. **Nulla cambia altrove** (`invariati.json`, `confronto_prices.json`). Ho confrontato `parse()` vecchio e nuovo sulle stesse risposte di Yahoo, con lo stesso `nowSec`: 255 serie e 238.325 barre, 0 differenze in date, `close` e `adjclose`.

   | Serie (risposta chart, 5 anni, salvo dove indicato) | Simboli |
   |---|---|
   | Ticker USA di `prices.json` (ETF settoriali compresi) | 22 |
   | ETF di `prices_global.json` | 46 |
   | Serie non sintetiche di `prices_macro.json` | 10 |
   | Prezzi degli indici | 22 |
   | Membri degli indici, chart | 78 |
   | Gli stessi membri via spark (1 anno, come `fetch_indices.js`) | 77 |

   - I 78 membri: 2 a metà lista per indice, 1 per ogni borsa della lista EEM (più di 40 fusi orari), 10 dell'S&P 500.
   - Controllo che può fallire: EURUSD=X e DX-Y.NYB risultano diversi (2 su 2).
   - Le chiusure di `prices.json` di `main` (22 ticker) rifatte con il codice nuovo: 27.588 su 27.588 uguali.
   - Il README dice «116.766 barre di 95 titoli»: coincide con `date-barre/membri.txt`, e il mio campione è diverso e più grande.
6. `npm test`: 115 su 115.

## Cosa non ho potuto verificare e perché

- **Il DXY ufficiale ICE.** Non conosco una fonte libera e lecita dei dati giornalieri, quindi ho usato la ricostruzione dalla formula con i cambi FRED e BCE.
- **Le sedute dopo il 4/11.** Il file corretto lo produrrà la prossima corsa. Se la data non cambia, `moreComplete` lascia i prezzi come sono: la correzione arriva alla prima corsa con un asOf nuovo.
- **Gli inverni precedenti.** Il repository ha i dati solo dal 18/10/2026, quindi non ho potuto vedere com'erano i file dell'inverno 2025–26.
- **Fuori ambito:** `scripts/backfill_indices.py` data ancora con `gmtoffset`. Per le barre delle borse è innocuo: aprono di giorno e non cambiano data.

## Script e dati

`ricerca/qa/1.3.5/dati/`:

| Script | Cosa fa | Output |
|---|---|---|
| `scarica.mjs` | scarica le risposte grezze di Yahoo nella cache | — |
| `ricostruisci.mjs` | ricostruisce DXY_INV e DBMFE.PA con la data vecchia e la nuova | `ricostruzione_main.json`, `ricostruzione_ramo.json`, `storia_file_main.txt` |
| `seconda_fonte.mjs` | confronta le date con BCE e FRED | `seconda_fonte.json` |
| `sanita_fonti.mjs` | confronta BCE e FRED tra loro | — |
| `ora_chiusura_fx.mjs` | trova l'ora della chiusura giornaliera nelle barre orarie | `ora_chiusura_eurusd.json`, `ora_chiusura_dxy.json` |
| `invariati.mjs` | confronta `parse()` vecchio e nuovo sulle altre serie | `invariati.json` |
| `confronto_prices.mjs` | rifà le chiusure di `prices.json` con il codice nuovo | `confronto_prices.json` |

- Cache dei prezzi (fuori dal repository): `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/cache135`. Contiene Yahoo a 5 anni e a 1 ora, e in `ext/` i CSV di BCE e FRED.
- Loop sui commit: per ogni commit di `origin/main` che tocca `data/prices_macro.json` o `data/prices_global.json`, `git show <c>:data/…` e poi `ricostruisci.mjs`.
